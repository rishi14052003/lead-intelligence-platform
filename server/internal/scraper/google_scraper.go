package scraper

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"time"
)

// SerperResponse represents Serper API response
type SerperResponse struct {
	Organic []struct {
		Title   string `json:"title"`
		Link    string `json:"link"`
		Snippet string `json:"snippet"`
	} `json:"organic"`
}

// GoogleScraper handles search scraping
type GoogleScraper struct {
	client    *http.Client
	serperKey string
}

// NewGoogleScraper creates scraper instance
func NewGoogleScraper() *GoogleScraper {
	serperKey := os.Getenv("SERPER_API_KEY")
	return &GoogleScraper{
		client: &http.Client{
			Timeout: 20 * time.Second,
			Transport: &http.Transport{
				MaxIdleConns:        100,
				MaxIdleConnsPerHost: 100,
			},
		},
		serperKey: serperKey,
	}
}

// SearchLinkedInProfiles searches LinkedIn profiles. When location is non-empty (e.g. city), organic
// snippets must mention it to reduce unrelated profiles from other regions.
func (gs *GoogleScraper) SearchLinkedInProfiles(company, role, location string) ([]map[string]string, error) {
	company = strings.TrimSpace(company)
	role = strings.TrimSpace(role)
	location = strings.TrimSpace(location)

	var queries []string
	if role != "" {
		queries = []string{
			fmt.Sprintf(`site:linkedin.com/in/ "%s" "%s"`, company, role),
			fmt.Sprintf(`site:linkedin.com/in/ %s %s`, company, role),
			fmt.Sprintf(`"%s" "%s" linkedin profile`, company, role),
		}
	} else {
		queries = []string{
			fmt.Sprintf(`site:linkedin.com/in/ "%s"`, company),
			fmt.Sprintf(`site:linkedin.com/in/ %s`, company),
		}
	}

	for _, q := range queries {
		log.Printf("========================================")
		log.Printf("LINKEDIN SEARCH START")
		log.Printf("COMPANY => %s", company)
		log.Printf("ROLE => %s", role)
		log.Printf("QUERY => %s", q)
		log.Printf("========================================")

		results, err := gs.searchViaSerper(q, role, company, location)
		if err == nil && len(results) > 0 {
			return results, nil
		}
		time.Sleep(300 * time.Millisecond)
	}
	return []map[string]string{}, nil
}

// searchViaSerper uses Serper API
func (gs *GoogleScraper) searchViaSerper(query, role, companyForSlugCheck, locationHint string) ([]map[string]string, error) {
	payloadBytes, err := json.Marshal(map[string]string{"q": query})
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", "https://google.serper.dev/search", strings.NewReader(string(payloadBytes)))
	if err != nil {
		return nil, err
	}

	req.Header.Set("X-API-KEY", gs.serperKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := gs.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	log.Printf("SERPER RESPONSE: %s", string(body))

	var result SerperResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	var profiles []map[string]string
	seen := make(map[string]bool)

	for _, item := range result.Organic {
		link := item.Link

		if !strings.Contains(link, "linkedin.com/in/") {
			continue
		}

		link = strings.Split(link, "?")[0]

		if !isPlausibleLinkedInUsername(link, companyForSlugCheck) {
			continue
		}

		if companyForSlugCheck != "" && !snippetReferencesCompany(item.Title, item.Snippet, companyForSlugCheck) {
			continue
		}

		if locationHint != "" && len(strings.TrimSpace(locationHint)) >= 3 &&
			!snippetReferencesLocation(item.Title, item.Snippet, locationHint) {
			continue
		}

		if seen[link] {
			continue
		}
		seen[link] = true

		name := parseNameFromLinkedInURL(link)
		if name == "" {
			name = extractNameFromSnippet(item.Snippet, item.Title)
		}

		detectedRole := role
		if detectedRole == "" {
			detectedRole = extractRoleFromText(item.Title + " " + item.Snippet)
		}

		profiles = append(profiles, map[string]string{
			"url":     link,
			"name":    name,
			"role":    detectedRole,
			"context": item.Snippet,
		})
	}

	log.Printf("✅ SERPER PROFILES FOUND: %d", len(profiles))
	return profiles, nil
}

func junkWebsiteHosts() []string {
	return []string{
		"linkedin.com", "facebook.com", "instagram.com", "twitter.com", "x.com",
		"glassdoor.com", "indeed.com", "crunchbase.com", "bloomberg.com", "reuters.com",
		"wikipedia.org", "youtube.com", "yelp.com", "zoominfo.com", "dnb.com", "owler.com",
		"indiamart.com", "tradeindia.com", "exportersindia.com", "justdial.com",
		"sulekha.com", "yellowpages.com", "yellowpages.ca", "mapquest.com",
	}
}

func isJunkWebsiteURL(link string) bool {
	parsed, err := url.Parse(link)
	if err != nil {
		return true
	}
	host := strings.ToLower(parsed.Host)
	for _, j := range junkWebsiteHosts() {
		if strings.Contains(host, j) {
			return true
		}
	}
	return false
}

func stripURLTrackingParams(link string) string {
	parsed, err := url.Parse(link)
	if err != nil {
		return link
	}
	parsed.RawQuery = ""
	parsed.Fragment = ""
	return parsed.String()
}

// GuessWebsiteFromCompany returns https://{slug}.com from a company name (best-effort when Serper fails).
func (gs *GoogleScraper) GuessWebsiteFromCompany(company string) string {
	return gs.fallbackWebsite(company)
}

// FindOfficialWebsite searches official company website
func (gs *GoogleScraper) FindOfficialWebsite(company string) (string, error) {
	company = strings.TrimSpace(company)
	if company == "" {
		return "", nil
	}

	if strings.TrimSpace(gs.serperKey) == "" {
		log.Printf("⚠️ SERPER_API_KEY missing; guessing website from company string")
		return gs.fallbackWebsite(company), nil
	}

	queries := []string{
		fmt.Sprintf(`"%s" official website`, company),
		fmt.Sprintf(`%s official website`, company),
	}
	if parts := strings.Fields(company); len(parts) >= 1 && parts[0] != company {
		queries = append(queries, fmt.Sprintf(`%s company website`, parts[0]))
	}

	var lastStatus int

	for _, query := range queries {
		payloadBytes, err := json.Marshal(map[string]string{"q": query})
		if err != nil {
			continue
		}

		req, err := http.NewRequest("POST", "https://google.serper.dev/search", strings.NewReader(string(payloadBytes)))
		if err != nil {
			continue
		}

		req.Header.Set("X-API-KEY", gs.serperKey)
		req.Header.Set("Content-Type", "application/json")

		resp, err := gs.client.Do(req)
		if err != nil {
			log.Printf("⚠️ Serper website search request error: %v", err)
			continue
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		lastStatus = resp.StatusCode

		if resp.StatusCode != http.StatusOK {
			log.Printf("⚠️ Serper website search HTTP %d", resp.StatusCode)
			continue
		}

		var result SerperResponse
		if err := json.Unmarshal(body, &result); err != nil {
			log.Printf("⚠️ Serper website JSON parse error: %v", err)
			continue
		}

		for _, item := range result.Organic {
			link := item.Link
			if isJunkWebsiteURL(link) {
				continue
			}
			return stripURLTrackingParams(link), nil
		}

		time.Sleep(200 * time.Millisecond)
	}

	if lastStatus != 0 && lastStatus != http.StatusOK {
		log.Printf("⚠️ Using guessed website after Serper HTTP %d", lastStatus)
	}

	return gs.fallbackWebsite(company), nil
}

// SearchCompanyLeadership searches leadership profiles
func (gs *GoogleScraper) SearchCompanyLeadership(company, location string) ([]map[string]string, error) {
	query := fmt.Sprintf(`site:linkedin.com/in/ "%s" CEO OR CTO OR Founder OR HR`, company)
	return gs.searchViaSerper(query, "", strings.TrimSpace(company), strings.TrimSpace(location))
}

// fallbackWebsite creates basic domain fallback
func (gs *GoogleScraper) fallbackWebsite(company string) string {
	cleaned := strings.ToLower(company)
	cleaned = regexp.MustCompile(`[^a-z0-9]`).ReplaceAllString(cleaned, "")
	if cleaned == "" {
		return ""
	}
	return fmt.Sprintf("https://%s.com", cleaned)
}

// FetchHTML fetches HTML content
func (gs *GoogleScraper) FetchHTML(urlStr string) (string, error) {
	req, err := http.NewRequest("GET", urlStr, nil)
	if err != nil {
		return "", err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")

	resp, err := gs.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 5*1024*1024))
	if err != nil {
		return "", err
	}

	return string(body), nil
}

// --- HELPERS ---

func parseNameFromLinkedInURL(profileURL string) string {
	parts := strings.Split(profileURL, "/in/")
	if len(parts) < 2 {
		return ""
	}

	username := parts[1]
	username = strings.Split(username, "?")[0]
	username = strings.Split(username, "/")[0]
	username = strings.TrimSpace(username)

	name := strings.ReplaceAll(username, "-", " ")
	reg := regexp.MustCompile(`[0-9]+`)
	name = reg.ReplaceAllString(name, "")
	name = strings.Join(strings.Fields(name), " ")

	if name == "" {
		return ""
	}

	nameNoise := []string{"india", "official", "career", "jobs", "team", "company", "corp", "ltd", "inc", "llc", "pvt"}
	nameLower := strings.ToLower(name)
	for _, w := range nameNoise {
		if strings.Contains(nameLower, w) {
			return ""
		}
	}

	words := strings.Fields(name)
	for i, w := range words {
		if len(w) > 0 {
			words[i] = strings.ToUpper(string(w[0])) + strings.ToLower(w[1:])
		}
	}

	return strings.Join(words, " ")
}

var brandSlugNormalizer = regexp.MustCompile(`[^a-z0-9]+`)

func snippetReferencesCompany(title, snippet, company string) bool {
	company = strings.TrimSpace(company)
	if company == "" {
		return true
	}
	brand := normalizeCompanyBrand(company)
	if len(brand) < 3 {
		return true
	}
	hay := strings.ToLower(title + " " + snippet)
	if strings.Contains(hay, strings.ToLower(company)) {
		return true
	}
	return strings.Contains(strings.ReplaceAll(hay, " ", ""), brand)
}

func snippetReferencesLocation(title, snippet, location string) bool {
	location = strings.TrimSpace(location)
	if location == "" {
		return true
	}
	hay := strings.ToLower(title + " " + snippet)
	return strings.Contains(hay, strings.ToLower(location))
}

func normalizeCompanyBrand(s string) string {
	s = strings.TrimSpace(strings.ToLower(s))
	return brandSlugNormalizer.ReplaceAllString(s, "")
}

// linkedInSlugAppendsCompanyBrand detects SEO-style slugs like first-last-companyname (often fake).
func linkedInSlugAppendsCompanyBrand(username, company string) bool {
	brand := normalizeCompanyBrand(company)
	if len(brand) < 4 {
		return false
	}
	segs := strings.Split(strings.ToLower(username), "-")
	if len(segs) < 3 {
		return false
	}
	last := segs[len(segs)-1]
	if len(last) < 4 {
		return false
	}
	if last == brand {
		return true
	}
	if strings.HasSuffix(brand, last) {
		return true
	}
	if strings.HasSuffix(last, brand) {
		return true
	}
	return false
}

// IsPlausibleLinkedInProfileURL reports whether a /in/ slug looks like a real profile (not vanity SEO spam).
func IsPlausibleLinkedInProfileURL(profileURL, company string) bool {
	return isPlausibleLinkedInUsername(profileURL, company)
}

func isPlausibleLinkedInUsername(profileURL, company string) bool {
	parts := strings.Split(profileURL, "/in/")
	if len(parts) < 2 {
		return false
	}
	username := strings.Split(strings.Split(parts[1], "?")[0], "/")[0]
	if len(username) < 3 || len(username) > 50 {
		return false
	}
	if company != "" && linkedInSlugAppendsCompanyBrand(username, company) {
		return false
	}
	noiseWords := []string{"ceo", "cto", "founder", "director", "manager", "company",
		"official", "india", "head", "corp", "ltd", "careers", "jobs", "team", "hr", "sales"}
	lower := strings.ToLower(username)
	for _, w := range noiseWords {
		if strings.Contains(lower, w) {
			return false
		}
	}
	return true
}

func extractNameFromSnippet(snippet, title string) string {
	text := snippet + " " + title
	re := regexp.MustCompile(`([A-Z][a-z]+ [A-Z][a-z]+)`)
	matches := re.FindAllString(text, -1)

	noiseWords := []string{"LinkedIn", "Google", "Search", "Profile", "View", "Connect"}

	for _, m := range matches {
		noise := false
		for _, n := range noiseWords {
			if strings.Contains(m, n) {
				noise = true
				break
			}
		}
		if !noise && len(m) > 4 {
			return m
		}
	}

	return ""
}

func extractRoleFromText(text string) string {
	roles := []string{
		"CEO", "CTO", "CFO", "COO", "Founder", "HR",
		"Head of HR", "VP Engineering", "Engineering Manager",
		"Managing Director", "MD", "Director", "Partner", "Principal", "Co-Founder",
		"Head of Engineering", "Head of Product", "Head of Marketing",
	}

	lower := strings.ToLower(text)
	for _, role := range roles {
		if strings.Contains(lower, strings.ToLower(role)) {
			return role
		}
	}

	return "Executive"
}

func extractContextAroundText(html, target string) string {
	index := strings.Index(html, target)
	if index == -1 {
		return ""
	}

	start := index - 200
	if start < 0 {
		start = 0
	}

	end := index + 200
	if end > len(html) {
		end = len(html)
	}

	return html[start:end]
}

func isValidCompanyDomain(link string) bool {
	if link == "" {
		return false
	}

	parsed, err := url.Parse(link)
	if err != nil {
		return false
	}

	host := strings.ToLower(parsed.Host)

	if strings.Contains(host, "linkedin.com") ||
		strings.Contains(host, "facebook.com") ||
		strings.Contains(host, "instagram.com") ||
		strings.Contains(host, "twitter.com") ||
		strings.Contains(host, "x.com") {
		return false
	}

	return true
}
