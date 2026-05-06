package services

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"lead-finder/internal/database"
	"lead-finder/internal/models"
	"lead-finder/internal/scraper"
	"lead-finder/internal/utils"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
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
}

// NewLeadService creates a new lead service
func NewLeadService(db *database.Database) *LeadService {
	return &LeadService{
		db:             db,
		webScraper:     scraper.NewWebScraper(),
		googleScraper:  scraper.NewGoogleScraper(),
		linkedinParser: scraper.NewLinkedInParser(),
		scoringService: NewScoringService(),
		emailService:   NewEmailService(),
	}
}

// SearchAndEnrichLeads performs a complete search and enrichment workflow using Apollo API
func (ls *LeadService) SearchAndEnrichLeads(query string, userID primitive.ObjectID) ([]models.Lead, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Validate query
	valid, errMsg := utils.ValidateQuery(query)
	if !valid {
		return nil, &ValidationError{Message: errMsg}
	}

	// Sanitize input
	query = utils.SanitizeInput(query)

	// Extract company name from query
	parts := strings.Fields(query)
	var companyName string
	if len(parts) > 0 {
		companyName = parts[0]
	}

	domain := utils.FormatDomain(companyName)

	log.Printf("🔎 Starting search for: %s (domain: %s)", companyName, domain)

	// Create search record
	search := &models.Search{
		UserID:    userID,
		Query:     query,
		Domain:    domain,
		CreatedAt: time.Now(),
	}

	searchID, err := ls.saveSearch(ctx, search)
	if err != nil {
		log.Printf("Error saving search: %v", err)
	}

	var leads []models.Lead

	// Dual search approach: Role-specific + Company-wide
	log.Println("🔍 Starting dual search approach...")
	log.Println("  Step 1: Searching for specific roles on LinkedIn...")

	// Use scraped URL if available, otherwise generate one
	companyURL := fmt.Sprintf("https://%s", utils.FormatDomain(domain))

	roles := []string{"CEO", "CTO", "HR"}
	leadsMap := make(map[string]*models.Lead)

	for _, role := range roles {
		log.Printf("  - Searching for %s profiles...", role)

		// Search LinkedIn profiles for this role with company validation
		profiles, err := ls.linkedinParser.SearchLinkedInByRoleWithValidation(companyName, role)
		if err != nil {
			log.Printf("    ⚠️ Error searching for %s: %v", role, err)
			continue
		}

		log.Printf("    ✓ Found %d validated %s profiles", len(profiles), role)

		// Create leads from profiles
		for _, profile := range profiles {
			name := profile["name"]
			linkedinURL := profile["url"]

			// Skip leads with unknown or invalid names
			if name == "" || strings.ToLower(name) == "unknown" || len(name) < 2 {
				log.Printf("    ⚠️ Skipping profile with invalid name: %s", name)
				continue
			}

			// Use name as key to avoid duplicates
			key := strings.ToLower(name)

			if _, exists := leadsMap[key]; !exists {
				lead := &models.Lead{
					Name:       name,
					Role:       role,
					LinkedIn:   linkedinURL,
					Company:    utils.FormatCompanyName(domain),
					CompanyURL: companyURL,
					SearchID:   searchID.(primitive.ObjectID),
					Score:      ls.scoreByRole(role),
					CreatedAt:  time.Now(),
					UpdatedAt:  time.Now(),
				}

				leadsMap[key] = lead
			}
		}
	}

	// Step 2: Company-wide search (no role filter)
	log.Println("  Step 2: Searching for all company employees (company-wide search)...")
	companyProfiles, err := ls.linkedinParser.SearchCompanyProfiles(companyName)
	if err != nil {
		log.Printf("    ⚠️ Error in company-wide search: %v", err)
	} else {
		log.Printf("    ✓ Found %d company profiles", len(companyProfiles))
		for _, profile := range companyProfiles {
			name := profile["name"]
			linkedinURL := profile["url"]
			role := profile["role"]

			if name == "" || strings.ToLower(name) == "unknown" || len(name) < 2 {
				continue
			}

			key := strings.ToLower(name)
			if _, exists := leadsMap[key]; !exists {
				lead := &models.Lead{
					Name:       name,
					Role:       role,
					LinkedIn:   linkedinURL,
					Company:    utils.FormatCompanyName(domain),
					CompanyURL: companyURL,
					SearchID:   searchID.(primitive.ObjectID),
					Score:      ls.scoreByRole(role),
					CreatedAt:  time.Now(),
					UpdatedAt:  time.Now(),
				}
				leadsMap[key] = lead
			}
		}
	}

	// Step 3: Fallback to basic website scraping if results are limited
	if len(leadsMap) < 5 {
		log.Println("  Step 3: Supplementing with website scraping...")

		websiteEmails, _, _ := ls.webScraper.ScrapeEmails(domain)
		contactPageEmails, _, _ := ls.webScraper.ScrapeContactPage(domain)

		allEmails := append(websiteEmails, contactPageEmails...)
		allEmails = deduplicateStrings(allEmails)

		for _, email := range allEmails {
			if email == "" {
				continue
			}

			name := ls.linkedinParser.ExtractNameFromEmail(email)
			if name == "" || strings.ToLower(name) == "unknown" {
				continue
			}

			key := strings.ToLower(email)
			if _, exists := leadsMap[key]; !exists {
				lead := &models.Lead{
					Name:       name,
					Email:      email,
					Role:       "Employee",
					Company:    utils.FormatCompanyName(domain),
					CompanyURL: companyURL,
					SearchID:   searchID.(primitive.ObjectID),
					Score:      50,
					CreatedAt:  time.Now(),
					UpdatedAt:  time.Now(),
				}
				leadsMap[key] = lead
			}
		}
	}

	// Convert map to slice and filter out invalid leads
	for _, lead := range leadsMap {
		// Final validation - skip unknown or invalid roles
		if strings.ToLower(lead.Name) == "unknown" || lead.Role == "Unknown" || lead.Role == "Executive" || lead.Role == "" {
			log.Printf("    ⚠️ Skipping invalid lead: %s (role: %s)", lead.Name, lead.Role)
			continue
		}
		leads = append(leads, *lead)
	}

	ls.updateSearchResults(ctx, searchID, len(leads))

	log.Printf("✅ Search completed via LinkedIn extraction. Found %d leads", len(leads))
	return leads, nil
}

// GetAllLeads returns all stored leads
func (ls *LeadService) GetAllLeads(ctx context.Context) ([]models.Lead, error) {
	collection := ls.db.Instance.Collection("leads")

	opts := options.Find()
	opts.SetLimit(100)

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

	opts := options.Find()
	opts.SetLimit(50)
	opts.SetSort(bson.M{"createdAt": -1})

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

// Helper functions

func (ls *LeadService) SaveLead(ctx context.Context, lead *models.Lead) error {
	collection := ls.db.Instance.Collection("leads")

	// Check if lead already exists
	existing := collection.FindOne(ctx, bson.M{"email": lead.Email})

	if existing.Err() == nil {
		// Update existing lead
		_, err := collection.UpdateOne(ctx, bson.M{"email": lead.Email}, bson.M{
			"$set": lead,
		})
		return err
	}

	// Insert new lead
	_, err := collection.InsertOne(ctx, lead)
	return err
}

func (ls *LeadService) DeleteAllLeads(ctx context.Context) error {
	collection := ls.db.Instance.Collection("leads")
	_, err := collection.DeleteMany(ctx, bson.M{})
	return err
}

func (ls *LeadService) saveSearch(ctx context.Context, search *models.Search) (interface{}, error) {
	collection := ls.db.Instance.Collection("searches")

	result, err := collection.InsertOne(ctx, search)
	if err != nil {
		return nil, err
	}

	return result.InsertedID, nil
}

func (ls *LeadService) updateSearchResults(ctx context.Context, searchID interface{}, count int) error {
	collection := ls.db.Instance.Collection("searches")

	_, err := collection.UpdateOne(ctx, bson.M{"_id": searchID}, bson.M{
		"$set": bson.M{"resultsCount": count},
	})

	return err
}

func (ls *LeadService) findEmailForName(name string, emails []string) string {
	normalizedName := utils.NormalizeName(name)

	for _, email := range emails {
		localPart := strings.Split(email, "@")[0]
		normalizedEmail := utils.NormalizeName(localPart)

		if strings.Contains(normalizedEmail, normalizedName) || strings.Contains(normalizedName, normalizedEmail) {
			return email
		}
	}

	return ""
}

func (ls *LeadService) inferRole(lead *models.Lead) string {
	// Check email for role clues
	if lead.Email != "" {
		localPart := strings.Split(lead.Email, "@")[0]
		localLower := strings.ToLower(localPart)

		if strings.Contains(localLower, "ceo") || strings.Contains(localLower, "founder") {
			return "CEO"
		}
		if strings.Contains(localLower, "cto") {
			return "CTO"
		}
		if strings.Contains(localLower, "hr") {
			return "HR Manager"
		}
		if strings.Contains(localLower, "sales") {
			return "Sales"
		}
	}

	// Check name for role clues (e.g., "John Doe, CEO")
	if lead.Name != "" {
		nameLower := strings.ToLower(lead.Name)

		roleKeywords := []string{"ceo", "cto", "cfo", "founder", "president", "manager", "director", "engineer", "developer"}
		for _, keyword := range roleKeywords {
			if strings.Contains(nameLower, keyword) {
				return strings.ToUpper(keyword)
			}
		}
	}

	// Default role
	return "Executive"
}

// scoreByRole returns the score for a role
func (ls *LeadService) scoreByRole(role string) int {
	switch strings.ToUpper(role) {
	case "CEO":
		return 95
	case "CTO":
		return 90
	case "HR":
		return 80
	case "FOUNDER":
		return 95
	case "PRESIDENT":
		return 90
	case "VP":
		return 85
	case "DIRECTOR":
		return 80
	default:
		return 70
	}
}

func deduplicateStrings(slice []string) []string {
	uniqueMap := make(map[string]bool)
	var result []string

	for _, item := range slice {
		if !uniqueMap[item] && item != "" {
			uniqueMap[item] = true
			result = append(result, item)
		}
	}

	return result
}

// ValidationError is a custom error for validation failures
type ValidationError struct {
	Message string
}

func (ve *ValidationError) Error() string {
	return ve.Message
}

func isValidEmail(email string) bool {
	blocked := []string{"noreply", "support", "info", "admin"}

	for _, b := range blocked {
		if strings.Contains(strings.ToLower(email), b) {
			return false
		}
	}
	return true
}

func guessRole(email string) string {
	email = strings.ToLower(email)

	if strings.Contains(email, "ceo") || strings.Contains(email, "founder") {
		return "CEO"
	}
	if strings.Contains(email, "cto") || strings.Contains(email, "tech") {
		return "CTO"
	}
	if strings.Contains(email, "hr") || strings.Contains(email, "people") {
		return "HR"
	}
	if strings.Contains(email, "sales") {
		return "Sales"
	}

	return "Employee"
}

func calculateScore(role string) int {
	switch role {
	case "CEO":
		return 95
	case "CTO":
		return 90
	case "HR":
		return 80
	case "Sales":
		return 75
	default:
		return 60
	}
}

func matchLinkedIn(name string, links []string) string {
	normalized := utils.NormalizeName(name)
	firstName := strings.Split(normalized, "-")[0]

	for _, link := range links {
		l := strings.ToLower(link)

		if strings.Contains(l, normalized) || strings.Contains(l, firstName) {
			return link
		}
	}
	return ""
}

func GetLeads(domain string) []models.Lead {
	linkedinHTML := scraper.SearchGoogle("site:linkedin.com/in " + domain + " CEO")
	linkedinLinks := scraper.ExtractLinkedInLinks(linkedinHTML)

	emails := scraper.ExtractEmails(domain)

	html := scraper.SearchGoogle(domain + " company CEO")
	names := scraper.ExtractNamesFromGoogle(html)

	var leads []models.Lead
	seen := make(map[string]bool)

	// better name selection
	bestName := ""
	for _, n := range names {
		if len(n) > 5 {
			bestName = n
			break
		}
	}

	for _, email := range emails {
		if !isValidEmail(email) {
			continue
		}

		if seen[email] {
			continue
		}
		seen[email] = true

		var name string
		if bestName != "" {
			name = bestName
		} else {
			name = utils.ExtractNameFromEmail(email)
		}

		linkedin := matchLinkedIn(name, linkedinLinks)

		role := guessRole(email)
		score := calculateScore(role)

		leads = append(leads, models.Lead{
			Name:     name,
			Role:     role,
			Email:    email,
			LinkedIn: linkedin,
			Score:    score,
		})

		if len(leads) >= 10 {
			break
		}
	}

	return leads
}
