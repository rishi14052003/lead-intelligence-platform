package scraper

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"lead-finder/internal/utils"
)

// GoogleScraper handles Google search scraping
type GoogleScraper struct {
	client *http.Client
}

// NewGoogleScraper creates a new Google scraper instance
func NewGoogleScraper() *GoogleScraper {
	return &GoogleScraper{
		client: &http.Client{
			Timeout: 10 * time.Second,
			Transport: &http.Transport{
				MaxIdleConns:        100,
				MaxIdleConnsPerHost: 100,
			},
		},
	}
}

// SearchCEO searches for CEO information on Google
func (gs *GoogleScraper) SearchCEO(domain string) ([]string, error) {
	return gs.search(fmt.Sprintf("%s CEO", domain))
}

// SearchCTO searches for CTO information on Google
func (gs *GoogleScraper) SearchCTO(domain string) ([]string, error) {
	return gs.search(fmt.Sprintf("%s CTO", domain))
}

// SearchLeadership searches for leadership team information
func (gs *GoogleScraper) SearchLeadership(domain string) ([]string, error) {
	return gs.search(fmt.Sprintf("site:%s leadership team OR executive team OR management team", domain))
}

// SearchHR searches for HR information on Google
func (gs *GoogleScraper) SearchHR(domain string) ([]string, error) {
	return gs.search(fmt.Sprintf("%s HR OR Human Resources OR Head of HR OR HR Director", domain))
}

// SearchPeople searches for people at a company on Google
func (gs *GoogleScraper) SearchPeople(domain string) ([]string, error) {
	return gs.search(fmt.Sprintf("site:%s people OR team OR staff", domain))
}

// search performs a Google search and extracts names
func (gs *GoogleScraper) search(query string) ([]string, error) {
	// URL encode the query
	encodedQuery := url.QueryEscape(query)
	searchURL := fmt.Sprintf("https://www.google.com/search?q=%s", encodedQuery)

	html, err := gs.FetchHTML(searchURL)
	if err != nil {
		return nil, err
	}

	// Extract names from search results
	names := utils.ExtractNames(html)

	// Clean and filter names
	var cleanedNames []string
	for _, name := range names {
		if len(name) > 0 {
			cleanedNames = append(cleanedNames, name)
		}
	}

	return cleanedNames, nil
}

// FetchHTML fetches HTML content with a user agent
func (gs *GoogleScraper) FetchHTML(urlStr string) (string, error) {
	req, err := http.NewRequest("GET", urlStr, nil)
	if err != nil {
		return "", err
	}

	// Set a user agent to avoid being blocked
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

	resp, err := gs.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to fetch %s: %w", urlStr, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("status code %d for %s", resp.StatusCode, urlStr)
	}

	// Limit response body size
	limitedReader := io.LimitReader(resp.Body, 10*1024*1024) // 10MB limit

	body, err := io.ReadAll(limitedReader)
	if err != nil {
		return "", fmt.Errorf("failed to read response body: %w", err)
	}

	return string(body), nil
}

func SearchGoogle(query string) string {
	searchURL := "https://www.google.com/search?q=" + url.QueryEscape(query)

	client := &http.Client{Timeout: 10 * time.Second}

	req, _ := http.NewRequest("GET", searchURL, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0")

	resp, err := client.Do(req)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	return string(body)
}

func ExtractLinkedInLinks(html string) []string {
	re := regexp.MustCompile(`https:\/\/www\.linkedin\.com\/in\/[a-zA-Z0-9\-_%]+`)
	matches := re.FindAllString(html, -1)

	seen := make(map[string]bool)
	var links []string

	for _, m := range matches {
		if !seen[m] {
			seen[m] = true
			links = append(links, m)
		}
	}

	return links
}

func ExtractNamesFromGoogle(html string) []string {
	re := regexp.MustCompile(`([A-Z][a-z]+ [A-Z][a-z]+)`)
	matches := re.FindAllString(html, -1)

	var cleaned []string
	seen := make(map[string]bool)

	for _, m := range matches {
		if len(m) < 5 {
			continue
		}

		if strings.Contains(m, "Google") ||
			strings.Contains(m, "Privacy") ||
			strings.Contains(m, "Terms") {
			continue
		}

		if !seen[m] {
			seen[m] = true
			cleaned = append(cleaned, m)
		}
	}

	return cleaned
}
