package services

import (
	"context"
	"log"
	"strings"
	"time"

	"lead-finder/configs"
	"lead-finder/internal/database"
	"lead-finder/internal/models"
	"lead-finder/internal/scraper"
	"lead-finder/internal/utils"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// LeadService orchestrates lead finding and enrichment
type LeadService struct {
	db             *database.Database
	webScraper     *scraper.WebScraper
	googleScraper  *scraper.GoogleScraper
	linkedinParser *scraper.LinkedInParser
	scoringService *ScoringService
	emailService   *EmailService
	geminiService  *GeminiService
}

// NewLeadService creates a new lead service
func NewLeadService(db *database.Database) *LeadService {
	config := configs.GetConfig()
	var geminiService *GeminiService
	if config != nil && config.GeminiAPIKey != "" {
		geminiService = NewGeminiService(config.GeminiAPIKey)
	}

	return &LeadService{
		db:             db,
		webScraper:     scraper.NewWebScraper(),
		googleScraper:  scraper.NewGoogleScraper(),
		linkedinParser: scraper.NewLinkedInParser(),
		scoringService: NewScoringService(),
		emailService:   NewEmailService(),
		geminiService:  geminiService,
	}
}

// SearchAndEnrichLeads performs a complete AI-powered search and enrichment workflow
func (ls *LeadService) SearchAndEnrichLeads(query string, userID primitive.ObjectID) ([]models.Lead, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	valid, errMsg := utils.ValidateQuery(query)
	if !valid {
		return nil, &ValidationError{Message: errMsg}
	}

	query = utils.SanitizeInput(query)
	companyName := strings.TrimSpace(query)

	log.Printf("🔎 Starting AI lead search for: %s", companyName)

	// Create search record
	search := &models.Search{
		UserID:    userID,
		Query:     query,
		Status:    "in_progress",
		CreatedAt: time.Now(),
	}

	searchID, err := ls.saveSearch(ctx, search)
	if err != nil {
		log.Printf("⚠️ Error saving search record: %v", err)
		searchID = primitive.NewObjectID()
	}

	searchObjID, _ := searchID.(primitive.ObjectID)

	// Step 1: Find official website
	website, _ := ls.googleScraper.FindOfficialWebsite(companyName)
	if website != "" {
		log.Printf("✓ Found official website: %s", website)
	} else {
		log.Printf("⚠️ Could not find official website for: %s", companyName)
	}

	// Step 2: Concurrent scraping — LinkedIn + Website
	type linkedinResult struct {
		profiles []map[string]string
	}
	type websiteResult struct {
		result *scraper.WebsiteScrapeResult
	}

	linkedinChan := make(chan linkedinResult, 1)
	websiteChan := make(chan websiteResult, 1)

	// Goroutine 1: LinkedIn profile scraping via Google
	go func() {
		var allProfiles []map[string]string
		roles := []string{"CEO", "CTO", "Founder", "HR"}
		for _, role := range roles {
			profiles, err := ls.linkedinParser.SearchLinkedInByRoleWithValidation(companyName, role)
			log.Printf("DEBUG ROLE=%s PROFILES=%+v ERROR=%v", role, profiles, err)
			if err != nil {
				log.Printf("⚠️ LinkedIn search for %s %s: %v", companyName, role, err)
				continue
			}
			if len(profiles) > 0 {
				log.Printf("✓ Found %d LinkedIn profiles for role: %s", len(profiles), role)
				allProfiles = append(allProfiles, profiles...)
			}
		}
		linkedinChan <- linkedinResult{profiles: allProfiles}
	}()

	// Goroutine 2: Website scraping
	go func() {
		if website == "" {
			websiteChan <- websiteResult{result: &scraper.WebsiteScrapeResult{Pages: make(map[string]string)}}
			return
		}
		domain := utils.FormatDomain(website)
		result, err := ls.webScraper.ScrapeCompanyWebsite(domain)
		if err != nil {
			log.Printf("⚠️ Website scraping failed: %v", err)
			websiteChan <- websiteResult{result: &scraper.WebsiteScrapeResult{Pages: make(map[string]string)}}
			return
		}
		log.Printf("✓ Scraped %d website pages", len(result.Pages))
		websiteChan <- websiteResult{result: result}
	}()

	// Collect results
	liRes := <-linkedinChan
	webRes := <-websiteChan

	log.Printf("📊 Raw data: %d LinkedIn profiles, %d website pages", len(liRes.profiles), len(webRes.result.Pages))

	// Step 3: Build data for Gemini
	var websiteText string
	var websiteDataForGemini []map[string]string
	if webRes.result != nil {
		for pageURL, text := range webRes.result.Pages {
			websiteText += text + "\n"
			if len(webRes.result.Emails) > 0 || len(webRes.result.Names) > 0 {
				websiteDataForGemini = append(websiteDataForGemini, map[string]string{
					"page":         pageURL,
					"emails_found": strings.Join(webRes.result.Emails, ", "),
					"names_found":  strings.Join(webRes.result.Names[:minInt(len(webRes.result.Names), 10)], ", "),
				})
			}
		}
	}

	// Step 4: Gemini AI Enrichment
	// Gemini uses scraped data OR falls back to its own knowledge about the company
	var enriched *EnrichedCompany
	if ls.geminiService != nil {
		log.Println("🤖 Sending data to Gemini AI for enrichment...")
		var gemErr error
		enriched, gemErr = ls.geminiService.EnrichLeads(companyName, website, liRes.profiles, websiteDataForGemini, websiteText)
		if gemErr != nil {
			log.Printf("⚠️ Gemini enrichment failed: %v", gemErr)
		} else {
			log.Printf("✓ Gemini returned %d enriched leads", len(enriched.Leads))
		}
	} else {
		log.Println("⚠️ Gemini service not configured (GEMINI_API_KEY missing)")
	}

	// Step 5: Build final leads map (Gemini results take priority)
	leadsMap := make(map[string]*models.Lead)

	// Add Gemini-enriched leads first
	if enriched != nil {
		for _, l := range enriched.Leads {
			if l.Name == "" {
				continue
			}
			key := strings.ToLower(strings.ReplaceAll(l.Name, " ", "") + l.Role)
			leadsMap[key] = &models.Lead{
				Name:          l.Name,
				Role:          l.Role,
				Email:         l.Email,
				EmailStatus:   l.EmailStatus,
				LinkedIn:      l.LinkedIn,
				Company:       companyName,
				Website:       enriched.Website,
				CompanyURL:    enriched.Website,
				Confidence:    l.Confidence,
				Source:        l.Source,
				EmailVerified: false,
				SearchID:      searchObjID,
				Score:         ls.scoringService.CalculateScore(l.Role, l.LinkedIn != "", l.Email != ""),
				CreatedAt:     time.Now(),
				UpdatedAt:     time.Now(),
			}
		}
	}

	// Step 6: Fallback — add raw LinkedIn profiles not already covered by Gemini
	for _, p := range liRes.profiles {
		name := p["name"]
		role := p["role"]
		linkedinURL := p["url"]
		if name == "" {
			continue
		}
		key := strings.ToLower(strings.ReplaceAll(name, " ", "") + role)
		if _, exists := leadsMap[key]; !exists {
			leadsMap[key] = &models.Lead{
				Name:        name,
				Role:        role,
				LinkedIn:    linkedinURL,
				Company:     companyName,
				Website:     website,
				CompanyURL:  website,
				Confidence:  ls.scoringService.CalculateScore(role, true, false),
				Source:      "linkedin",
				EmailStatus: "not_found",
				SearchID:    searchObjID,
				Score:       ls.scoringService.CalculateScore(role, true, false),
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			}
		}
	}

	// Step 7: Assign REAL scraped emails to leads (only if email matches name — no guessing)
	if webRes.result != nil && len(webRes.result.Emails) > 0 {
		for _, email := range webRes.result.Emails {
			if utils.IsBlockedEmail(email) {
				continue
			}
			for _, lead := range leadsMap {
				if lead.Email == "" && matchEmailToName(email, lead.Name) {
					lead.Email = email
					lead.EmailStatus = "scraped_public"
					lead.EmailVerified = false
					lead.Source = "website"
					lead.Score = ls.scoringService.CalculateScore(lead.Role, lead.LinkedIn != "", true)
					break
				}
			}
		}
	}

	// Step 8: Finalise leads list
	var leads []models.Lead

	for _, lead := range leadsMap {

		log.Printf("📌 CHECKING LEAD: %+v", lead)

		// Clean LinkedIn junk
		lead.Name = strings.ReplaceAll(lead.Name, "| LinkedIn", "")
		lead.Name = strings.ReplaceAll(lead.Name, "- LinkedIn", "")
		lead.Name = strings.TrimSpace(lead.Name)

		// Validate name
		if !utils.ValidateName(lead.Name) {
			log.Printf("❌ INVALID LEAD NAME: %s", lead.Name)
			continue
		}

		lead.UserID = userID

		log.Printf("✅ FINAL LEAD ADDED: %s | %s", lead.Name, lead.Role)

		leads = append(leads, *lead)
	}

	log.Printf("🎯 FINAL LEADS COUNT: %d", len(leads))

	// Step 9: Store in MongoDB
	for i := range leads {
		if err := ls.SaveLead(ctx, &leads[i]); err != nil {
			log.Printf("⚠️ Error saving lead %s: %v", leads[i].Name, err)
		}
	}

	// Step 10: Update search record
	ls.finaliseSearch(ctx, searchID, len(leads), website)

	log.Printf("✅ Search complete. Returning %d leads for '%s'", len(leads), companyName)
	return leads, nil
}

// GetAllLeads returns all stored leads
func (ls *LeadService) GetAllLeads(ctx context.Context) ([]models.Lead, error) {
	collection := ls.db.Instance.Collection("leads")
	opts := options.Find().SetLimit(100).SetSort(bson.M{"createdAt": -1})
	cursor, err := collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	var leads []models.Lead
	if err = cursor.All(ctx, &leads); err != nil {
		return nil, err
	}
	return leads, nil
}

// GetLeadsByRole returns leads filtered by role
func (ls *LeadService) GetLeadsByRole(ctx context.Context, role string) ([]models.Lead, error) {
	collection := ls.db.Instance.Collection("leads")
	filter := bson.M{"role": bson.M{"$regex": role, "$options": "i"}}
	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	var leads []models.Lead
	if err = cursor.All(ctx, &leads); err != nil {
		return nil, err
	}
	return leads, nil
}

// GetSearchHistory returns search history for a specific user
func (ls *LeadService) GetSearchHistory(ctx context.Context, userID primitive.ObjectID) ([]models.Search, error) {
	collection := ls.db.Instance.Collection("searches")
	opts := options.Find().SetLimit(50).SetSort(bson.M{"createdAt": -1})
	filter := bson.M{"userId": userID}
	cursor, err := collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	var searches []models.Search
	if err = cursor.All(ctx, &searches); err != nil {
		return nil, err
	}
	return searches, nil
}

// SaveLead saves a lead to MongoDB — fixed deduplication (uses name+company, not email)
func (ls *LeadService) SaveLead(ctx context.Context, lead *models.Lead) error {
	collection := ls.db.Instance.Collection("leads")

	// Deduplicate by name + company (not email, since most leads have no email)
	filter := bson.M{
		"name":    bson.M{"$regex": "^" + lead.Name + "$", "$options": "i"},
		"company": bson.M{"$regex": "^" + lead.Company + "$", "$options": "i"},
	}

	var existing models.Lead
	err := collection.FindOne(ctx, filter).Decode(&existing)
	if err == nil {
		// Lead exists — update it
		lead.ID = existing.ID
		lead.CreatedAt = existing.CreatedAt
		lead.UpdatedAt = time.Now()
		_, updateErr := collection.ReplaceOne(ctx, bson.M{"_id": existing.ID}, lead)
		return updateErr
	}

	if err != mongo.ErrNoDocuments {
		// Unexpected error
		return err
	}

	// New lead — insert
	if lead.ID.IsZero() {
		lead.ID = primitive.NewObjectID()
	}
	lead.CreatedAt = time.Now()
	lead.UpdatedAt = time.Now()
	_, insertErr := collection.InsertOne(ctx, lead)
	return insertErr
}

// DeleteAllLeads deletes all leads from MongoDB
func (ls *LeadService) DeleteAllLeads(ctx context.Context) error {
	collection := ls.db.Instance.Collection("leads")
	_, err := collection.DeleteMany(ctx, bson.M{})
	return err
}

// --- Private helpers ---

func (ls *LeadService) saveSearch(ctx context.Context, search *models.Search) (interface{}, error) {
	collection := ls.db.Instance.Collection("searches")
	result, err := collection.InsertOne(ctx, search)
	if err != nil {
		return nil, err
	}
	return result.InsertedID, nil
}

func (ls *LeadService) finaliseSearch(ctx context.Context, searchID interface{}, count int, website string) {
	collection := ls.db.Instance.Collection("searches")
	update := bson.M{
		"$set": bson.M{
			"resultsCount": count,
			"status":       "completed",
			"website":      website,
			"completedAt":  time.Now(),
		},
	}
	collection.UpdateByID(ctx, searchID, update)
}

// matchEmailToName checks if an email likely belongs to a person based on name
func matchEmailToName(email, name string) bool {
	if email == "" || name == "" {
		return false
	}
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return false
	}
	local := strings.ToLower(parts[0])
	nameLower := strings.ToLower(name)
	nameParts := strings.Fields(nameLower)
	matchCount := 0
	for _, part := range nameParts {
		if len(part) > 2 && strings.Contains(local, part) {
			matchCount++
		}
	}
	// Require at least 2 name parts to match (first + last) to avoid false positives
	return matchCount >= 2
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// ValidationError is a custom error for validation failures
type ValidationError struct {
	Message string
}

func (ve *ValidationError) Error() string {
	return ve.Message
}
