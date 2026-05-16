package services

import (
	"context"
	"log"
	"net/url"
	"sort"
	"strings"
	"sync"
	"time"

	"lead-finder/configs"
	"lead-finder/internal/cache"
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
}

// NewLeadService creates a new lead service
func NewLeadService(db *database.Database) *LeadService {
	config := configs.GetConfig()
	googleScraper := scraper.NewGoogleScraper()

	if config != nil && config.RedisURL != "" {
		cacheManager, err := cache.NewCacheManager(config.RedisURL)
		if err != nil {
			log.Printf("⚠️ Redis cache initialization failed: %v", err)
		} else if cacheManager.IsAvailable() {
			googleScraper.SetCache(cacheManager)
		}
	}

	return &LeadService{
		db:             db,
		webScraper:     scraper.NewWebScraper(),
		googleScraper:  googleScraper,
		linkedinParser: scraper.NewLinkedInParser(),
		scoringService: NewScoringService(),
		emailService:   NewEmailService(),
	}
}

// SearchAndEnrichLeads finds leads via Serper/LinkedIn and website scraping.
func (ls *LeadService) SearchAndEnrichLeads(query string, location string, userID primitive.ObjectID) ([]models.Lead, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	valid, errMsg := utils.ValidateQuery(query)
	if !valid {
		return nil, &ValidationError{Message: errMsg}
	}

	query = utils.SanitizeInput(query)
	companyName := strings.TrimSpace(query)
	location = strings.TrimSpace(location)

	log.Printf("🔎 Starting lead search — company: %q  location: %q", companyName, location)

	// ── Save search record ───────────────────────────────────────────────────
	search := &models.Search{
		UserID:    userID,
		Query:     companyName,
		Location:  location,
		Status:    "in_progress",
		CreatedAt: time.Now(),
	}
	searchID, err := ls.saveSearch(ctx, search)
	if err != nil {
		log.Printf("⚠️ Error saving search record: %v", err)
		searchID = primitive.NewObjectID()
	}
	searchObjID, _ := searchID.(primitive.ObjectID)

	// ── Step 1: Resolve official website ────────────────────────────────────
	var website string
	if utils.ValidateDomain(companyName) {
		website = utils.FormatDomain(companyName)
		log.Printf("✓ Direct domain input: %s", website)
	} else {
		website, err = ls.googleScraper.FindOfficialWebsite(companyName, location)
		if err != nil {
			log.Printf("⚠️ FindOfficialWebsite error: %v", err)
		}
		if strings.TrimSpace(website) == "" {
			website = ls.googleScraper.GuessWebsiteFromCompany(companyName)
			log.Printf("⚠️ Using guessed website: %s", website)
		} else {
			log.Printf("✓ Found official website: %s", website)
		}
	}

	// ── Step 2: Resolve LinkedIn company page ────────────────────────────────
	linkedinCompanyURL, _ := ls.googleScraper.FindLinkedInCompanyPage(companyName, website)
	linkedinCompanySlug := scraper.LinkedInCompanySlugFromURL(linkedinCompanyURL)
	if linkedinCompanyURL != "" {
		log.Printf("🏢 LinkedIn company page: %s (slug=%s)", linkedinCompanyURL, linkedinCompanySlug)
	} else {
		log.Printf("⚠️ No LinkedIn company page found; using company name only for people search")
	}

	// ── Step 3: Concurrent LinkedIn + website scraping ───────────────────────
	type linkedinResult struct{ profiles []map[string]string }
	type websiteResult struct{ result *scraper.WebsiteScrapeResult }

	linkedinChan := make(chan linkedinResult, 1)
	websiteChan := make(chan websiteResult, 1)

	// Goroutine: LinkedIn people search across all roles
	go func() {
		var allProfiles []map[string]string
		var mu sync.Mutex
		var wg sync.WaitGroup

		roles := []string{"CEO", "CTO", "Founder", "HR Head", "Head of Sales", "Vice President"}
		semaphore := make(chan struct{}, 4)
		const successThreshold = 5
		done := false

		for _, role := range roles {
			mu.Lock()
			if done {
				mu.Unlock()
				break
			}
			mu.Unlock()

			wg.Add(1)
			go func(r string) {
				defer wg.Done()
				semaphore <- struct{}{}
				defer func() { <-semaphore }()

				profiles, err := ls.linkedinParser.SearchLinkedInByRoleWithValidation(companyName, r, location, linkedinCompanySlug)
				if err != nil {
					log.Printf("⚠️ LinkedIn search for %s / %s: %v", companyName, r, err)
					return
				}
				if len(profiles) > 0 {
					mu.Lock()
					log.Printf("✓ Found %d LinkedIn profiles for role: %s", len(profiles), r)
					allProfiles = append(allProfiles, profiles...)
					if len(allProfiles) >= successThreshold {
						log.Printf("✓ Reached threshold (%d profiles), stopping role searches", len(allProfiles))
						done = true
					}
					mu.Unlock()
				}
			}(role)
		}
		wg.Wait()

		// Fallback: broad leadership search
		if len(allProfiles) < 3 {
			leadership, err := ls.googleScraper.SearchCompanyLeadership(companyName, location, linkedinCompanySlug)
			if err != nil {
				log.Printf("⚠️ Leadership fallback: %v", err)
			} else if len(leadership) > 0 {
				log.Printf("✓ Leadership fallback: %d profiles", len(leadership))
				allProfiles = append(allProfiles, leadership...)
			}
		}
		// Fallback: no-role generic search
		if len(allProfiles) < 3 {
			generic, err := ls.googleScraper.SearchLinkedInProfiles(companyName, "", location, linkedinCompanySlug)
			if err != nil {
				log.Printf("⚠️ Generic LinkedIn fallback: %v", err)
			} else if len(generic) > 0 {
				log.Printf("✓ Generic fallback: %d profiles", len(generic))
				allProfiles = append(allProfiles, generic...)
			}
		}

		linkedinChan <- linkedinResult{profiles: allProfiles}
	}()

	// Goroutine: website scraping
	go func() {
		if website == "" {
			websiteChan <- websiteResult{result: &scraper.WebsiteScrapeResult{Pages: make(map[string]string)}}
			return
		}
		domain := utils.FormatDomain(website)

		cached, err := ls.getCachedWebsiteScrape(ctx, domain)
		if err == nil && cached != nil {
			log.Printf("✓ Using cached website scrape for %s", domain)
			websiteChan <- websiteResult{result: cached}
			return
		}

		result, err := ls.webScraper.ScrapeCompanyWebsite(domain)
		if err != nil {
			log.Printf("⚠️ Website scraping failed: %v", err)
			websiteChan <- websiteResult{result: &scraper.WebsiteScrapeResult{Pages: make(map[string]string)}}
			return
		}
		log.Printf("✓ Scraped %d website pages, found %d emails", len(result.Pages), len(result.Emails))

		if err := ls.cacheWebsiteScrape(ctx, domain, result); err != nil {
			log.Printf("⚠️ Failed to cache website scrape: %v", err)
		}
		websiteChan <- websiteResult{result: result}
	}()

	liRes := <-linkedinChan
	webRes := <-websiteChan

	log.Printf("📊 Raw data: %d LinkedIn profiles, %d website pages", len(liRes.profiles), len(webRes.result.Pages))

	// ── Step 4: Build leads map from LinkedIn profiles ───────────────────────
	leadsMap := make(map[string]*models.Lead)

	for _, p := range liRes.profiles {
		name := strings.TrimSpace(p["name"])
		jobTitle := strings.TrimSpace(p["title"])
		category := strings.TrimSpace(p["category"])
		linkedinProfileURL := strings.TrimSpace(p["url"])
		// Email may already be present if found in the Serper snippet
		snippetEmail := strings.TrimSpace(p["email"])

		if name == "" || linkedinProfileURL == "" || !utils.ValidateName(name) {
			continue
		}
		if category == "" {
			var ok bool
			category, ok = scraper.CategorizeTitle(jobTitle + " " + p["context"])
			if !ok {
				continue
			}
		}

		key := strings.ToLower(strings.ReplaceAll(name, " ", "") + jobTitle)
		if _, exists := leadsMap[key]; !exists {
			lead := &models.Lead{
				Name:               name,
				Role:               jobTitle,
				MatchedCategory:    category,
				LinkedIn:           linkedinProfileURL,
				LinkedInCompanyURL: linkedinCompanyURL, // CHANGE: company page on every lead
				Company:            companyName,
				Website:            website,
				CompanyURL:         website,
				Confidence:         ls.scoringService.CalculateScore(jobTitle, true, false),
				Source:             "linkedin",
				EmailStatus:        "not_found",
				SearchID:           searchObjID,
				Score:              ls.scoringService.CalculateScore(jobTitle, true, false),
				CreatedAt:          time.Now(),
				UpdatedAt:          time.Now(),
			}

			// CHANGE: Pass A — use email already found in Serper snippet (free, no extra request)
			if snippetEmail != "" && utils.ValidateEmail(snippetEmail) && !utils.IsBlockedEmail(snippetEmail) {
				lead.Email = snippetEmail
				lead.EmailStatus = "scraped_snippet"
				lead.EmailVerified = false
				lead.Score = ls.scoringService.CalculateScore(jobTitle, true, true)
			}

			leadsMap[key] = lead
		}
	}

	// ── Step 5: Assign website-scraped emails ────────────────────────────────
	if webRes.result != nil && len(webRes.result.Emails) > 0 {
		for _, email := range webRes.result.Emails {
			if utils.IsBlockedEmail(email) {
				continue
			}
			for _, lead := range leadsMap {
				if lead.Email == "" && matchEmailToName(email, lead.Name) {
					lead.Email = email
					lead.EmailStatus = "scraped_website" // CHANGE: was "scraped_public"
					lead.EmailVerified = false
					lead.Source = "website"
					lead.Score = ls.scoringService.CalculateScore(lead.Role, lead.LinkedIn != "", true)
					break
				}
			}
		}
	}

	// ── Step 6: Pass B — fetch LinkedIn profile page for leads missing email ─
	// CHANGE: replaces the old single-strategy extractor with the new three-strategy one
	{
		linkedinEmailCache := make(map[string]string)
		var emailLock sync.Mutex
		var emailWg sync.WaitGroup
		emailSemaphore := make(chan struct{}, 3)

		for _, lead := range leadsMap {
			if strings.TrimSpace(lead.Email) != "" {
				continue // already have email from snippet or website
			}
			profileURL := strings.TrimSpace(lead.LinkedIn)
			if profileURL == "" {
				continue
			}

			emailWg.Add(1)
			go func(pURL string, leadPtr *models.Lead) {
				defer emailWg.Done()
				emailSemaphore <- struct{}{}
				defer func() { <-emailSemaphore }()

				emailLock.Lock()
				if cached, ok := linkedinEmailCache[pURL]; ok {
					emailLock.Unlock()
					if cached != "" {
						leadPtr.Email = cached
						leadPtr.EmailStatus = "scraped_profile" // CHANGE: was "scraped_public"
						leadPtr.EmailVerified = false
						leadPtr.Source = "linkedin"
						leadPtr.Score = ls.scoringService.CalculateScore(leadPtr.Role, true, true)
					}
					return
				}
				emailLock.Unlock()

				// CHANGE: ExtractPublicEmailFromProfile now uses three strategies:
				// mailto: links → JSON-LD → raw HTML regex scan
				email := strings.TrimSpace(ls.linkedinParser.ExtractPublicEmailFromProfile(pURL))

				emailLock.Lock()
				linkedinEmailCache[pURL] = email
				if email != "" && utils.ValidateEmail(email) && !utils.IsBlockedEmail(email) {
					leadPtr.Email = email
					leadPtr.EmailStatus = "scraped_profile"
					leadPtr.EmailVerified = false
					leadPtr.Source = "linkedin"
					leadPtr.Score = ls.scoringService.CalculateScore(leadPtr.Role, true, true)
					log.Printf("📧 Profile email found for %s: %s", leadPtr.Name, email)
				}
				emailLock.Unlock()
			}(profileURL, lead)
		}
		emailWg.Wait()
	}

	dedupeLeadsMapByLinkedIn(leadsMap)

	// ── Step 7: Finalise leads list ──────────────────────────────────────────
	var leads []models.Lead
	for _, lead := range leadsMap {
		lead.Name = strings.TrimSpace(
			strings.ReplaceAll(strings.ReplaceAll(lead.Name, "| LinkedIn", ""), "- LinkedIn", ""),
		)
		if !utils.ValidateName(lead.Name) {
			log.Printf("❌ INVALID LEAD NAME: %s", lead.Name)
			continue
		}

		// CHANGE: never send internal placeholder to caller; keep email as ""
		if strings.TrimSpace(lead.Email) == "" {
			lead.Email = ""
			lead.EmailStatus = "not_found"
			lead.EmailVerified = false
		}

		lead.UserID = userID
		log.Printf("✅ LEAD: name=%q role=%q email=%q linkedin=%s company_page=%s",
			lead.Name, lead.Role, lead.Email, lead.LinkedIn, lead.LinkedInCompanyURL)
		leads = append(leads, *lead)
	}

	// CHANGE: sort by score descending so best leads come first
	sort.Slice(leads, func(i, j int) bool {
		return leads[i].Score > leads[j].Score
	})

	log.Printf("🎯 FINAL LEADS COUNT: %d", len(leads))
	if len(leads) == 0 {
		log.Printf("⚠️ No leads found for %q — company may not be publicly indexed.", companyName)
		log.Printf("📌 Website: %s | LinkedIn company: %s", website, linkedinCompanyURL)
	}

	ls.finaliseSearch(ctx, searchID, len(leads), website, linkedinCompanyURL)

	// Safety: delete any leads that got auto-saved
	collection := ls.db.Instance.Collection("leads")
	count, _ := collection.CountDocuments(ctx, bson.M{"searchId": searchObjID})
	if count > 0 {
		log.Printf("⚠️ Deleting %d auto-saved leads", count)
		collection.DeleteMany(ctx, bson.M{"searchId": searchObjID})
	}

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

// SaveLead saves a lead to MongoDB
func (ls *LeadService) SaveLead(ctx context.Context, lead *models.Lead) error {
	collection := ls.db.Instance.Collection("leads")

	filter := bson.M{
		"name":    bson.M{"$regex": "^" + lead.Name + "$", "$options": "i"},
		"company": bson.M{"$regex": "^" + lead.Company + "$", "$options": "i"},
	}

	var existing models.Lead
	err := collection.FindOne(ctx, filter).Decode(&existing)
	if err == nil {
		lead.ID = existing.ID
		lead.CreatedAt = existing.CreatedAt
		lead.UpdatedAt = time.Now()
		_, updateErr := collection.ReplaceOne(ctx, bson.M{"_id": existing.ID}, lead)
		return updateErr
	}
	if err != mongo.ErrNoDocuments {
		return err
	}

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

func (ls *LeadService) saveSearch(ctx context.Context, search *models.Search) (interface{}, error) {
	collection := ls.db.Instance.Collection("searches")
	result, err := collection.InsertOne(ctx, search)
	if err != nil {
		return nil, err
	}
	return result.InsertedID, nil
}

func (ls *LeadService) finaliseSearch(ctx context.Context, searchID interface{}, count int, website, linkedinCompanyURL string) {
	collection := ls.db.Instance.Collection("searches")
	domain := ""
	if website != "" {
		if u, err := url.Parse(website); err == nil && u.Hostname() != "" {
			domain = strings.ToLower(strings.TrimPrefix(u.Hostname(), "www."))
		}
	}
	update := bson.M{
		"$set": bson.M{
			"resultsCount":       count,
			"status":             "completed",
			"website":            website,
			"domain":             domain,
			"linkedinCompanyUrl": strings.TrimSpace(linkedinCompanyURL),
			"completedAt":        time.Now(),
		},
	}
	collection.UpdateByID(ctx, searchID, update)
}

func linkedInProfileSlug(raw string) string {
	if raw == "" {
		return ""
	}
	u := strings.ToLower(raw)
	idx := strings.Index(u, "/in/")
	if idx == -1 {
		return ""
	}
	rest := u[idx+len("/in/"):]
	rest = strings.Split(rest, "?")[0]
	rest = strings.Split(rest, "/")[0]
	return strings.TrimSpace(rest)
}

func findScrapedProfileTitleAndCategory(name, linkedinURL string, profiles []map[string]string) (string, string) {
	nameLower := strings.ToLower(strings.TrimSpace(name))
	wantSlug := linkedInProfileSlug(linkedinURL)

	if wantSlug != "" {
		for _, p := range profiles {
			if linkedInProfileSlug(p["url"]) == wantSlug {
				return strings.TrimSpace(p["title"]), strings.TrimSpace(p["category"])
			}
		}
	}
	if nameLower != "" {
		for _, p := range profiles {
			if strings.ToLower(strings.TrimSpace(p["name"])) == nameLower {
				return strings.TrimSpace(p["title"]), strings.TrimSpace(p["category"])
			}
		}
	}
	return "", ""
}

func rolePriority(role string) int {
	r := strings.ToLower(strings.TrimSpace(role))
	switch {
	case strings.Contains(r, "chief executive"), strings.Contains(r, "founder"), strings.Contains(r, "owner"):
		return 100
	case strings.Contains(r, "ceo") && !strings.Contains(r, "office"):
		return 98
	case strings.Contains(r, "cto"):
		return 92
	case strings.Contains(r, "cfo"), strings.Contains(r, "coo"):
		return 90
	case strings.Contains(r, "vp"), strings.Contains(r, "vice president"):
		return 82
	case strings.Contains(r, "head"):
		return 76
	case strings.Contains(r, "director"):
		return 74
	case strings.Contains(r, "hr"):
		return 72
	case strings.Contains(r, "manager"):
		return 65
	default:
		return 50
	}
}

// dedupeLeadsMapByLinkedIn collapses multiple entries for the same LinkedIn slug into one lead.
func dedupeLeadsMapByLinkedIn(m map[string]*models.Lead) {
	slugWinner := make(map[string]string)
	for key := range m {
		lead := m[key]
		slug := linkedInProfileSlug(lead.LinkedIn)
		if slug == "" {
			continue
		}
		winKey, ok := slugWinner[slug]
		if !ok {
			slugWinner[slug] = key
			continue
		}
		a, b := m[winKey], lead
		pa, pb := rolePriority(a.Role), rolePriority(b.Role)
		if pb > pa || (pb == pa && b.Score > a.Score) {
			delete(m, winKey)
			slugWinner[slug] = key
		} else {
			delete(m, key)
		}
	}
}

func findMatchingLinkedInURL(name, company string, profiles []map[string]string) string {
	if name == "" {
		return ""
	}
	nameLower := strings.ToLower(strings.ReplaceAll(name, " ", ""))
	nameParts := strings.Fields(strings.ToLower(name))

	for _, p := range profiles {
		profileName := strings.ToLower(strings.ReplaceAll(p["name"], " ", ""))
		u := p["url"]
		if u == "" {
			continue
		}
		if profileName == nameLower {
			if scraper.IsPlausibleLinkedInProfileURL(u, company) {
				return u
			}
			continue
		}
		if len(nameParts) >= 2 {
			urlLower := strings.ToLower(u)
			matchCount := 0
			for _, part := range nameParts {
				if len(part) > 2 && strings.Contains(urlLower, part) {
					matchCount++
				}
			}
			if matchCount >= 2 && scraper.IsPlausibleLinkedInProfileURL(u, company) {
				return u
			}
		}
	}
	return ""
}

func matchEmailToName(email, name string) bool {
	if email == "" || name == "" {
		return false
	}
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return false
	}
	local := strings.ToLower(parts[0])
	nameParts := strings.Fields(strings.ToLower(name))
	matchCount := 0
	for _, part := range nameParts {
		if len(part) > 2 && strings.Contains(local, part) {
			matchCount++
		}
	}
	return matchCount >= 2
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// ValidationError is returned for invalid user input (results in HTTP 400).
type ValidationError struct {
	Message string
}

func (ve *ValidationError) Error() string {
	return ve.Message
}

// getCachedWebsiteScrape retrieves a cached website scrape result from MongoDB (24 h TTL).
func (ls *LeadService) getCachedWebsiteScrape(ctx context.Context, domain string) (*scraper.WebsiteScrapeResult, error) {
	collection := ls.db.Instance.Collection("website_cache")
	filter := bson.M{
		"domain": strings.ToLower(domain),
		"createdAt": bson.M{
			"$gt": time.Now().Add(-24 * time.Hour),
		},
	}
	var cached struct {
		Domain string
		Result *scraper.WebsiteScrapeResult
	}
	err := collection.FindOne(ctx, filter).Decode(&cached)
	if err != nil {
		return nil, err
	}
	return cached.Result, nil
}

// cacheWebsiteScrape stores a website scrape result in MongoDB.
func (ls *LeadService) cacheWebsiteScrape(ctx context.Context, domain string, result *scraper.WebsiteScrapeResult) error {
	collection := ls.db.Instance.Collection("website_cache")
	filter := bson.M{"domain": strings.ToLower(domain)}
	update := bson.M{
		"$set": bson.M{
			"domain":    strings.ToLower(domain),
			"result":    result,
			"createdAt": time.Now(),
		},
	}
	_, err := collection.UpdateOne(ctx, filter, update, options.Update().SetUpsert(true))
	return err
}