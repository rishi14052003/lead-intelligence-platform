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
	apolloService  *ApolloService
	webScraper     *scraper.WebScraper
	googleScraper  *scraper.GoogleScraper
	linkedinParser *scraper.LinkedInParser
	scoringService *ScoringService
	emailService   *EmailService
	maxLeads       int
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
		apolloService:  nil, // Will be initialized with API key in main
		maxLeads:       0,   // No limit - scrape all available leads
	}
}

// SetApolloService sets the Apollo service
func (ls *LeadService) SetApolloService(apollo *ApolloService) {
	ls.apolloService = apollo
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

	// Use Apollo API if available
	if ls.apolloService != nil {
		log.Println("📡 Searching Apollo.io API...")
		apolloLeads, err := ls.apolloService.SearchLeads(companyName)
		if err != nil {
			log.Printf("⚠️ Apollo API error: %v - falling back to legacy scraping", err)
			// Continue with legacy scraping as fallback
		} else if len(apolloLeads) > 0 {
			log.Printf("✓ Apollo API returned %d leads", len(apolloLeads))

			// Add SearchID to leads
			for i := range apolloLeads {
				apolloLeads[i].SearchID = searchID.(primitive.ObjectID)
			}

			leads = apolloLeads

			// Update search with results
			ls.updateSearchResults(ctx, searchID, len(leads))
			log.Printf("✅ Search completed via Apollo. Found %d leads", len(leads))
			return leads, nil
		}
	}

	// Legacy scraping fallback if Apollo not available or returned no results
	log.Println("📋 Using legacy scraper methods...")
	leadsMap := make(map[string]*models.Lead)

	// Step 1: Scrape website
	log.Println("  Step 1: Scraping website...")
	websiteEmails, scrapedURL, _ := ls.webScraper.ScrapeEmails(domain)
	websiteNames, _, _ := ls.webScraper.ExtractNames(domain)
	contactPageEmails, _, _ := ls.webScraper.ScrapeContactPage(domain)

	// Use scraped URL if available, otherwise generate one
	companyURL := scrapedURL
	if companyURL == "" {
		companyURL = fmt.Sprintf("https://%s", utils.FormatDomain(domain))
	}

	allEmails := append(websiteEmails, contactPageEmails...)
	allEmails = deduplicateStrings(allEmails)

	// Step 2: Search for executives
	log.Println("  Step 2: Searching for executives...")
	ceoNames, _ := ls.googleScraper.SearchCEO(domain)
	ctoNames, _ := ls.googleScraper.SearchCTO(domain)
	hrNames, _ := ls.googleScraper.SearchHR(domain)
	leadershipNames, _ := ls.googleScraper.SearchLeadership(domain)

	// Track names with their roles
	nameRoles := make(map[string]string)
	for _, name := range ceoNames {
		nameRoles[name] = "CEO"
	}
	for _, name := range ctoNames {
		nameRoles[name] = "CTO"
	}
	for _, name := range hrNames {
		nameRoles[name] = "HR"
	}
	for _, name := range leadershipNames {
		if _, exists := nameRoles[name]; !exists {
			nameRoles[name] = "Leadership"
		}
	}

	allNames := append(websiteNames, ceoNames...)
	allNames = append(allNames, ctoNames...)
	allNames = append(allNames, hrNames...)
	allNames = append(allNames, leadershipNames...)
	allNames = deduplicateStrings(allNames)

	// Step 3: Create leads from emails
	for _, email := range allEmails {
		if email == "" || len(leadsMap) >= ls.maxLeads {
			break
		}

		if _, exists := leadsMap[email]; exists {
			continue
		}

		// Try to extract name from email
		name := ls.linkedinParser.ExtractNameFromEmail(email)

		lead := &models.Lead{
			Email:      email,
			Name:       name,
			Role:       nameRoles[name], // Assign role if name matches
			Company:    utils.FormatCompanyName(domain),
			CompanyURL: companyURL,
			SearchID:   searchID.(primitive.ObjectID),
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		}

		leadsMap[email] = lead
	}

	// Step 4: Create leads from names
	for _, name := range allNames {
		if name == "" || len(leadsMap) >= ls.maxLeads {
			break
		}

		email := ls.findEmailForName(name, allEmails)

		lead := &models.Lead{
			Name:       name,
			Email:      email,
			Role:       nameRoles[name], // Assign role from search
			Company:    utils.FormatCompanyName(domain),
			CompanyURL: companyURL,
			SearchID:   searchID.(primitive.ObjectID),
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		}

		key := email
		if key == "" {
			key = name
		}

		if _, exists := leadsMap[key]; !exists {
			leadsMap[key] = lead
		}
	}

	// Step 5: Enrich with LinkedIn
	log.Println("  Step 3: Enriching with LinkedIn profiles...")
	for _, lead := range leadsMap {
		linkedinProfiles, _ := ls.linkedinParser.SearchProfiles(domain, lead.Role)
		if len(linkedinProfiles) > 0 {
			for _, profile := range linkedinProfiles {
				if ls.linkedinParser.MatchNameWithLinkedIn(lead.Name, profile) {
					lead.LinkedIn = profile
					break
				}
			}
		}

		lead.Role = ls.inferRole(lead)
		lead.Score = ls.scoringService.CalculateScore(lead.Role, lead.LinkedIn != "", lead.Email != "")
		leads = append(leads, *lead)
	}

	if len(leads) > ls.maxLeads {
		leads = leads[:ls.maxLeads]
	}

	ls.updateSearchResults(ctx, searchID, len(leads))

	log.Printf("✅ Search completed via legacy scraper. Found %d leads", len(leads))
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
