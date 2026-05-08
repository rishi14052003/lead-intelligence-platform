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

// SearchLinkedInProfiles searches LinkedIn profiles
func (gs *GoogleScraper) SearchLinkedInProfiles(company, role string) ([]map[string]string, error) {
	company = strings.TrimSpace(company)
	role = strings.TrimSpace(role)

	var query string
	if role != "" {
		query = fmt.Sprintf(`site:linkedin.com/in/ "%s" "%s"`, company, role)
	} else {
		query = fmt.Sprintf(`site:linkedin.com/in/ "%s"`, company)
	}

	log.Printf("========================================")
	log.Printf("LINKEDIN SEARCH START")
	log.Printf("COMPANY => %s", company)
	log.Printf("ROLE => %s", role)
	log.Printf("QUERY => %s", query)
	log.Printf("========================================")

	return gs.searchViaSerper(query, role)
}

// searchViaSerper uses Serper API
func (gs *GoogleScraper) searchViaSerper(query, role string) ([]map[string]string, error) {
	payload := fmt.Sprintf(`{"q":"%s"}`, query)

	req, err := http.NewRequest("POST", "https://google.serper.dev/search", strings.NewReader(payload))
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

// FindOfficialWebsite searches official company website
func (gs *GoogleScraper) FindOfficialWebsite(company string) (string, error) {
	query := fmt.Sprintf(`"%s" official website`, company)
	payload := fmt.Sprintf(`{"q":"%s"}`, query)

	req, err := http.NewRequest("POST", "https://google.serper.dev/search", strings.NewReader(payload))
	if err != nil {
		return "", err
	}

	req.Header.Set("X-API-KEY", gs.serperKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := gs.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var result SerperResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}

	for _, item := range result.Organic {
		link := item.Link
		if strings.Contains(link, "linkedin.com") ||
			strings.Contains(link, "facebook.com") ||
			strings.Contains(link, "instagram.com") ||
			strings.Contains(link, "twitter.com") ||
			strings.Contains(link, "x.com") {
			continue
		}
		return link, nil
	}

	return gs.fallbackWebsite(company), nil
}

// SearchCompanyLeadership searches leadership profiles
func (gs *GoogleScraper) SearchCompanyLeadership(company string) ([]map[string]string, error) {
	query := fmt.Sprintf(`site:linkedin.com/in/ "%s" CEO OR CTO OR Founder OR HR`, company)
	return gs.searchViaSerper(query, "")
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
	roles := []string{
		"CEO", "CTO", "CFO", "COO", "Founder", "HR",
		"Head of HR", "VP Engineering", "Engineering Manager",
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
