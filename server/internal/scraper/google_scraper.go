package scraper

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"time"
)

// GoogleScraper handles Google search scraping
type GoogleScraper struct {
	client    *http.Client
	apiKey    string
	searchCX  string
	useAPIMode bool
}

// GoogleSearchItem represents a single result from Google Custom Search API
type GoogleSearchItem struct {
	Title   string `json:"title"`
	Link    string `json:"link"`
	Snippet string `json:"snippet"`
}

// GoogleSearchResponse is the response from Google Custom Search API
type GoogleSearchResponse struct {
	Items []GoogleSearchItem `json:"items"`
}

// NewGoogleScraper creates a new Google scraper instance
func NewGoogleScraper() *GoogleScraper {
	apiKey := os.Getenv("GOOGLE_API_KEY")
	searchCX := os.Getenv("GOOGLE_SEARCH_CX")

	return &GoogleScraper{
		client: &http.Client{
			Timeout: 15 * time.Second,
			Transport: &http.Transport{
				MaxIdleConns:        100,
				MaxIdleConnsPerHost: 100,
			},
		},
		apiKey:     apiKey,
		searchCX:   searchCX,
		useAPIMode: apiKey != "" && searchCX != "",
	}
}

// SearchLinkedInProfiles searches Google for LinkedIn profiles at a company for a given role
func (gs *GoogleScraper) SearchLinkedInProfiles(company, role string) ([]map[string]string, error) {
	var query string
	if role != "" {
		query = fmt.Sprintf(`site:linkedin.com/in "%s" "%s"`, company, role)
	} else {
		query = fmt.Sprintf(`site:linkedin.com/in "%s"`, company)
	}

	if gs.useAPIMode {
		return gs.searchViaAPI(query, company, role)
	}
	return gs.searchViaHTTP(query, company, role)
}

// FindOfficialWebsite searches for the company's official website
func (gs *GoogleScraper) FindOfficialWebsite(company string) (string, error) {
	query := fmt.Sprintf(`"%s" official website`, company)

	if gs.useAPIMode {
		items, err := gs.customSearchAPI(query, 5)
		if err != nil {
			return gs.fallbackWebsite(company), nil
		}
		for _, item := range items {
			link := item.Link
			if isValidCompanyDomain(link, company) {
				return link, nil
			}
		}
	}

	// Fallback: construct domain from company name
	return gs.fallbackWebsite(company), nil
}

// SearchCompanyLeadership searches for company leadership via Google
func (gs *GoogleScraper) SearchCompanyLeadership(company string) ([]map[string]string, error) {
	query := fmt.Sprintf(`"%s" CEO OR CTO OR founder OR "head of HR"`, company)
	if gs.useAPIMode {
		return gs.searchViaAPI(query, company, "")
	}
	return gs.searchViaHTTP(query, company, "")
}

// searchViaAPI uses Google Custom Search JSON API (reliable, no blocking)
func (gs *GoogleScraper) searchViaAPI(query, company, role string) ([]map[string]string, error) {
	items, err := gs.customSearchAPI(query, 10)
	if err != nil {
		return nil, err
	}

	var profiles []map[string]string
	seen := make(map[string]bool)

	for _, item := range items {
		link := item.Link
		if !strings.Contains(link, "linkedin.com/in/") {
			continue
		}
		link = strings.Split(link, "?")[0]
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
			detectedRole = extractRoleFromText(item.Snippet + " " + item.Title)
		}

		profiles = append(profiles, map[string]string{
			"url":     link,
			"name":    name,
			"role":    detectedRole,
			"context": item.Snippet,
		})
	}

	return profiles, nil
}

// customSearchAPI calls the Google Custom Search JSON API
func (gs *GoogleScraper) customSearchAPI(query string, num int) ([]GoogleSearchItem, error) {
	if num > 10 {
		num = 10
	}
	encoded := url.QueryEscape(query)
	apiURL := fmt.Sprintf(
		"https://www.googleapis.com/customsearch/v1?key=%s&cx=%s&q=%s&num=%d",
		gs.apiKey, gs.searchCX, encoded, num,
	)

	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := gs.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("google api request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("google api returned status %d: %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 2*1024*1024))
	if err != nil {
		return nil, err
	}

	var result GoogleSearchResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse google api response: %w", err)
	}

	return result.Items, nil
}

// searchViaHTTP fallback: scrape Google HTML (may be blocked by Google)
func (gs *GoogleScraper) searchViaHTTP(query, company, role string) ([]map[string]string, error) {
	encoded := url.QueryEscape(query)
	searchURL := fmt.Sprintf("https://www.google.com/search?q=%s&num=10", encoded)

	req, err := http.NewRequest("GET", searchURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.5")

	resp, err := gs.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("google search failed: %w", err)
	}
	defer resp.Body.Close()

	limited := io.LimitReader(resp.Body, 5*1024*1024)
	body, err := io.ReadAll(limited)
	if err != nil {
		return nil, err
	}

	html := string(body)

	// If Google returned a CAPTCHA or error page, bail out
	if strings.Contains(html, "unusual traffic") || strings.Contains(html, "recaptcha") || resp.StatusCode == 429 {
		return nil, fmt.Errorf("google blocked the request (CAPTCHA). Set GOOGLE_API_KEY and GOOGLE_SEARCH_CX env vars to use the API instead")
	}

	return gs.extractLinkedInProfilesFromHTML(html, company, role), nil
}

// extractLinkedInProfilesFromHTML extracts LinkedIn URLs from raw Google HTML
func (gs *GoogleScraper) extractLinkedInProfilesFromHTML(html, company, role string) []map[string]string {
	linkedinRegex := regexp.MustCompile(`https?://(?:www\.)?linkedin\.com/in/[a-zA-Z0-9\-_]+`)
	matches := linkedinRegex.FindAllString(html, -1)

	var profiles []map[string]string
	seen := make(map[string]bool)

	for _, u := range matches {
		u = strings.Split(u, "?")[0]
		if seen[u] {
			continue
		}
		seen[u] = true

		context := extractContextAroundText(html, u)
		name := parseNameFromLinkedInURL(u)
		if name == "" {
			name = extractNameFromSnippet(context, "")
		}

		detectedRole := role
		if detectedRole == "" {
			detectedRole = extractRoleFromText(context)
		}

		profiles = append(profiles, map[string]string{
			"url":     u,
			"name":    name,
			"role":    detectedRole,
			"context": context,
		})
	}

	return profiles
}

// fallbackWebsite constructs a likely domain from the company name
func (gs *GoogleScraper) fallbackWebsite(company string) string {
	cleaned := strings.ToLower(company)
	cleaned = regexp.MustCompile(`[^a-z0-9]`).ReplaceAllString(cleaned, "")
	if cleaned == "" {
		return ""
	}
	return fmt.Sprintf("https://%s.com", cleaned)
}

// FetchHTML fetches HTML content with a user agent
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

// --- Helpers ---

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
	words := strings.Fields(name)
	for i, w := range words {
		if len(w) > 0 {
			words[i] = strings.ToUpper(string(w[0])) + strings.ToLower(w[1:])
		}
	}
	return strings.Join(words, " ")
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
	roles := []string{"CEO", "CTO", "CFO", "COO", "Founder", "Co-Founder", "President", "HR", "VP", "Director", "Manager", "Engineer"}
	textLower := strings.ToLower(text)
	for _, role := range roles {
		if strings.Contains(textLower, strings.ToLower(role)) {
			return role
		}
	}
	return "Executive"
}

func extractContextAroundText(html, target string) string {
	idx := strings.Index(html, target)
	if idx == -1 {
		return ""
	}
	start := idx - 300
	if start < 0 {
		start = 0
	}
	end := idx + len(target) + 300
	if end > len(html) {
		end = len(html)
	}
	ctx := html[start:end]
	ctx = regexp.MustCompile(`<[^>]*>`).ReplaceAllString(ctx, " ")
	ctx = regexp.MustCompile(`\s+`).ReplaceAllString(ctx, " ")
	return strings.TrimSpace(ctx)
}

func isValidCompanyDomain(link, company string) bool {
	skip := []string{"google.", "linkedin.", "wikipedia.", "facebook.", "twitter.", "youtube.", "instagram.", "glassdoor.", "crunchbase.", "bloomberg.", "forbes."}
	for _, s := range skip {
		if strings.Contains(link, s) {
			return false
		}
	}
	companyLower := strings.ToLower(regexp.MustCompile(`[^a-z0-9]`).ReplaceAllString(strings.ToLower(company), ""))
	linkLower := strings.ToLower(link)
	return strings.Contains(linkLower, companyLower)
}

// ExtractLinkedInLinks extracts LinkedIn URLs from HTML
func ExtractLinkedInLinks(html string) []string {
	re := regexp.MustCompile(`https?://(?:www\.)?linkedin\.com/in/[a-zA-Z0-9\-_]+`)
	matches := re.FindAllString(html, -1)
	seen := make(map[string]bool)
	var links []string
	for _, m := range matches {
		m = strings.Split(m, "?")[0]
		if !seen[m] {
			seen[m] = true
			links = append(links, m)
		}
	}
	return links
}

// SearchGoogle performs a raw Google search and returns HTML (legacy support)
func SearchGoogle(query string) string {
	gs := NewGoogleScraper()
	html, _ := gs.FetchHTML("https://www.google.com/search?q=" + url.QueryEscape(query))
	return html
}

// ExtractNamesFromGoogle extracts capitalized names from Google HTML
func ExtractNamesFromGoogle(html string) []string {
	re := regexp.MustCompile(`([A-Z][a-z]+ [A-Z][a-z]+)`)
	matches := re.FindAllString(html, -1)
	var cleaned []string
	seen := make(map[string]bool)
	for _, m := range matches {
		if len(m) < 5 {
			continue
		}
		if strings.Contains(m, "Google") || strings.Contains(m, "Privacy") || strings.Contains(m, "Terms") {
			continue
		}
		if !seen[m] {
			seen[m] = true
			cleaned = append(cleaned, m)
		}
	}
	return cleaned
}