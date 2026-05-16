package scraper

import (
	"lead-finder/internal/utils"
	"log"
	"regexp"
	"strings"
)

// LinkedInParser handles LinkedIn profile extraction and matching
type LinkedInParser struct {
	googleScraper *GoogleScraper
}

// NewLinkedInParser creates a new LinkedIn parser instance
func NewLinkedInParser() *LinkedInParser {
	return &LinkedInParser{
		googleScraper: NewGoogleScraper(),
	}
}

// SearchProfiles searches for LinkedIn profiles for a company and role.
func (lp *LinkedInParser) SearchProfiles(company string, role string, location string, linkedinCompanySlug string) ([]map[string]string, error) {
	return lp.googleScraper.SearchLinkedInProfiles(company, role, location, linkedinCompanySlug)
}

// ExtractPublicEmailFromProfile attempts to find an email from a LinkedIn public profile page.
//
// LinkedIn renders most contact info via JavaScript and behind auth walls, so raw HTML
// fetches almost never expose personal emails. This function tries multiple strategies:
//  1. Scan raw HTML / meta tags / JSON-LD for embedded email patterns
//  2. Look for "mailto:" links in the page source
//  3. Parse any visible contact section rendered server-side
//
// If no email is found this returns "".
func (lp *LinkedInParser) ExtractPublicEmailFromProfile(profileURL string) string {
	profileURL = strings.TrimSpace(profileURL)
	if profileURL == "" || !strings.Contains(strings.ToLower(profileURL), "linkedin.com/in/") {
		return ""
	}

	html, err := lp.googleScraper.FetchHTML(profileURL)
	if err != nil || strings.TrimSpace(html) == "" {
		log.Printf("⚠️ Could not fetch LinkedIn profile %s: %v", profileURL, err)
		return ""
	}

	// Strategy 1: mailto: links (most reliable when present)
	if email := extractMailtoEmail(html); email != "" {
		if utils.ValidateEmail(email) && !utils.IsBlockedEmail(email) {
			log.Printf("📧 Found mailto email on profile %s: %s", profileURL, email)
			return email
		}
	}

	// Strategy 2: JSON-LD / structured data (some profiles expose contact via schema.org)
	if email := extractEmailFromJSONLD(html); email != "" {
		if utils.ValidateEmail(email) && !utils.IsBlockedEmail(email) {
			log.Printf("📧 Found JSON-LD email on profile %s: %s", profileURL, email)
			return email
		}
	}

	// Strategy 3: General email regex scan on the raw HTML
	// (works when a profile owner puts their email in the "About" or "Contact info" section
	//  and LinkedIn renders it server-side without JS — rare but happens)
	generalRe := regexp.MustCompile(`[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}`)
	allMatches := generalRe.FindAllString(html, -1)
	for _, candidate := range allMatches {
		candidate = strings.ToLower(strings.TrimSpace(candidate))
		if utils.ValidateEmail(candidate) && !utils.IsBlockedEmail(candidate) && !isLinkedInSystemEmail(candidate) {
			log.Printf("📧 Found raw email on profile %s: %s", profileURL, candidate)
			return candidate
		}
	}

	return ""
}

// extractMailtoEmail finds the first mailto: href value in HTML.
func extractMailtoEmail(html string) string {
	re := regexp.MustCompile(`(?i)mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})`)
	m := re.FindStringSubmatch(html)
	if len(m) > 1 {
		return strings.ToLower(strings.TrimSpace(m[1]))
	}
	return ""
}

// extractEmailFromJSONLD searches for email fields in JSON-LD blobs embedded in the page.
func extractEmailFromJSONLD(html string) string {
	// Match JSON-LD script blocks
	scriptRe := regexp.MustCompile(`(?is)<script[^>]+type=["']application/ld\+json["'][^>]*>(.*?)</script>`)
	blocks := scriptRe.FindAllStringSubmatch(html, -1)
	emailRe := regexp.MustCompile(`"email"\s*:\s*"([^"]+)"`)
	for _, block := range blocks {
		if len(block) > 1 {
			m := emailRe.FindStringSubmatch(block[1])
			if len(m) > 1 {
				return strings.ToLower(strings.TrimSpace(m[1]))
			}
		}
	}

	// Also check for email in any data- attributes or meta tags
	metaRe := regexp.MustCompile(`(?i)(?:content|value)=["']([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})["']`)
	m := metaRe.FindStringSubmatch(html)
	if len(m) > 1 {
		return strings.ToLower(strings.TrimSpace(m[1]))
	}

	return ""
}

// isLinkedInSystemEmail returns true for LinkedIn's own system/noreply addresses.
func isLinkedInSystemEmail(email string) bool {
	blockedDomains := []string{
		"linkedin.com", "licdn.com", "google.com", "example.com",
		"sentry.io", "cloudfront.net", "amazonaws.com",
	}
	blockedPrefixes := []string{
		"noreply", "no-reply", "reply-", "notifications", "support",
		"marketing", "info@linkedin", "jobs-noreply",
	}
	email = strings.ToLower(email)
	for _, d := range blockedDomains {
		if strings.Contains(email, "@"+d) || strings.HasSuffix(email, "."+d) {
			return true
		}
	}
	for _, p := range blockedPrefixes {
		if strings.HasPrefix(email, p) {
			return true
		}
	}
	return false
}

// SearchLinkedInByRoleWithValidation searches and validates profiles.
// Returns enriched maps with: name, url, title, category, email (if found in snippet/context).
func (lp *LinkedInParser) SearchLinkedInByRoleWithValidation(company string, role string, location string, linkedinCompanySlug string) ([]map[string]string, error) {
	profiles, err := lp.googleScraper.SearchLinkedInProfiles(company, role, location, linkedinCompanySlug)
	if err != nil {
		return nil, err
	}

	var validated []map[string]string
	seen := make(map[string]bool)

	for _, p := range profiles {
		log.Printf("🔍 RAW PROFILE: name=%q title=%q url=%s", p["name"], p["title"], p["url"])

		profileURL := strings.TrimSpace(p["url"])
		if profileURL == "" {
			log.Printf("❌ EMPTY URL — skipping")
			continue
		}
		if seen[profileURL] {
			log.Printf("❌ DUPLICATE URL: %s", profileURL)
			continue
		}
		seen[profileURL] = true

		context := strings.TrimSpace(p["context"])

		// Validate that context doesn't clearly reference a different company
		if company != "" && context != "" {
			if isClearlyDifferentCompany(context, company) {
				log.Printf("❌ CONTEXT MENTIONS DIFFERENT COMPANY (context=%q, target=%q)", context[:minInt(80, len(context))], company)
				continue
			}
		}

		// --- Name: use what scraper found, fall back to URL parse ---
		name := strings.TrimSpace(p["name"])
		if name == "" || strings.ToLower(name) == "unknown" {
			name = parseNameFromLinkedInURL(profileURL)
		}
		// Strip LinkedIn UI noise
		name = strings.ReplaceAll(name, "| LinkedIn", "")
		name = strings.ReplaceAll(name, "- LinkedIn", "")
		name = strings.TrimSpace(name)

		if !utils.ValidateName(name) {
			log.Printf("❌ INVALID NAME: %q — skipping", name)
			continue
		}

		// --- Title ---
		jobTitle := strings.TrimSpace(p["title"])
		if jobTitle == "" {
			jobTitle = role
		}

		// --- Category ---
		category := strings.TrimSpace(p["category"])
		if category == "" {
			if c, ok := CategorizeTitle(jobTitle + " " + context); ok {
				category = c
			}
		}

		// --- Email from snippet (opportunistic) ---
		email := strings.TrimSpace(p["email"])

		log.Printf("✅ VALID PROFILE: name=%q title=%q category=%s url=%s email=%q",
			name, jobTitle, category, profileURL, email)

		entry := map[string]string{
			"name":     name,
			"url":      profileURL,
			"title":    jobTitle,
			"category": category,
			"email":    email, // may be "" — lead_service will attempt deeper extraction
		}
		validated = append(validated, entry)
	}

	log.Printf("✅ TOTAL VALIDATED PROFILES: %d", len(validated))
	return validated, nil
}

// isClearlyDifferentCompany does a quick heuristic check on a snippet to see if it is
// clearly about a person at a *different* company than targetCompany.
func isClearlyDifferentCompany(context, targetCompany string) bool {
	ctx := strings.ToLower(context)
	target := strings.ToLower(strings.TrimSpace(targetCompany))
	targetBrand := normalizeCompanyBrand(target)

	// Simple "at X" extraction: grab words after "at " and compare brand
	atIdx := strings.Index(ctx, " at ")
	if atIdx == -1 {
		return false
	}
	after := strings.TrimSpace(ctx[atIdx+4:])
	// Take the first 4 words
	words := strings.Fields(after)
	if len(words) == 0 {
		return false
	}
	n := minInt(4, len(words))
	mentionedRaw := strings.Join(words[:n], " ")
	// Strip common suffixes
	for _, sfx := range []string{" pvt ltd", " pvt. ltd.", " private limited", " ltd.", " ltd", " inc.", " inc", " llc", " corp"} {
		mentionedRaw = strings.TrimSuffix(mentionedRaw, sfx)
	}
	mentionedBrand := normalizeCompanyBrand(strings.TrimSpace(mentionedRaw))

	if mentionedBrand == "" || len(mentionedBrand) < 3 {
		return false
	}
	// If the mentioned brand contains or is contained by the target brand, it's the same company
	if strings.Contains(mentionedBrand, targetBrand) || strings.Contains(targetBrand, mentionedBrand) {
		return false
	}
	return true
}

// SearchCompanyProfiles searches for all employees of a company
func (lp *LinkedInParser) SearchCompanyProfiles(company string) ([]map[string]string, error) {
	profiles, err := lp.googleScraper.SearchLinkedInProfiles(company, "", "", "")
	if err != nil {
		return nil, err
	}

	var result []map[string]string
	seen := make(map[string]bool)

	for _, p := range profiles {
		url := p["url"]
		name := p["name"]
		if seen[url] || url == "" {
			continue
		}
		seen[url] = true
		if name == "" || len(name) < 2 {
			name = parseNameFromLinkedInURL(url)
			if name == "" {
				continue
			}
		}
		result = append(result, map[string]string{
			"name": name,
			"url":  url,
			"role": "Executive",
		})
	}
	return result, nil
}

// SearchCEOProfiles returns CEO LinkedIn URLs for a company
func (lp *LinkedInParser) SearchCEOProfiles(company string) ([]string, error) {
	profiles, err := lp.SearchProfiles(company, "CEO", "", "")
	if err != nil {
		return nil, err
	}
	var urls []string
	for _, p := range profiles {
		if u, ok := p["url"]; ok {
			urls = append(urls, u)
		}
	}
	return urls, nil
}

// ExtractLinkedInProfileURL extracts LinkedIn profile URLs from text
func (lp *LinkedInParser) ExtractLinkedInProfileURL(text string) []string {
	return utils.ExtractLinkedInURLs(text)
}

// ExtractUsernameFromURL extracts LinkedIn username from profile URL
func (lp *LinkedInParser) ExtractUsernameFromURL(profileURL string) string {
	profileURL = strings.TrimPrefix(profileURL, "https://")
	profileURL = strings.TrimPrefix(profileURL, "http://")
	profileURL = strings.TrimPrefix(profileURL, "www.")
	if strings.Contains(profileURL, "/in/") {
		parts := strings.Split(profileURL, "/in/")
		if len(parts) >= 2 {
			username := parts[1]
			username = strings.Split(username, "/")[0]
			username = strings.Split(username, "?")[0]
			return strings.ToLower(username)
		}
	}
	return ""
}

// MatchNameWithLinkedIn matches a name with a LinkedIn username
func (lp *LinkedInParser) MatchNameWithLinkedIn(name string, linkedinURL string) bool {
	if name == "" || linkedinURL == "" {
		return false
	}
	normalizedName := utils.NormalizeName(name)
	username := lp.ExtractUsernameFromURL(linkedinURL)
	nameParts := strings.Split(normalizedName, "-")
	matchCount := 0
	for _, part := range nameParts {
		if len(part) > 0 && strings.Contains(username, part) {
			matchCount++
		}
	}
	return matchCount > 0
}

// SanitizeLinkedInURL sanitizes a LinkedIn URL
func (lp *LinkedInParser) SanitizeLinkedInURL(url string) string {
	url = strings.TrimSpace(url)
	url = strings.TrimSuffix(url, "/")
	if !strings.Contains(url, "linkedin.com") {
		return ""
	}
	if !strings.HasPrefix(url, "https://") && !strings.HasPrefix(url, "http://") {
		url = "https://" + url
	}
	return url
}

// ParseNameFromLinkedInURL extracts name from LinkedIn URL
func (lp *LinkedInParser) ParseNameFromLinkedInURL(profileURL string) string {
	return parseNameFromLinkedInURL(profileURL)
}

// ValidateCompanyInContext checks if company name appears in search context
func (lp *LinkedInParser) ValidateCompanyInContext(company string, context string) bool {
	if company == "" || context == "" {
		return false
	}
	return strings.Contains(strings.ToLower(context), strings.ToLower(company))
}