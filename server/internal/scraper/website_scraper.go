package scraper

import (
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"lead-finder/internal/utils"
)

// WebScraper handles website scraping
type WebScraper struct {
	client *http.Client
}

// NewWebScraper creates a new web scraper instance
func NewWebScraper() *WebScraper {
	return &WebScraper{
		client: &http.Client{
			Timeout: 10 * time.Second,
			Transport: &http.Transport{
				MaxIdleConns:        100,
				MaxIdleConnsPerHost: 100,
			},
		},
	}
}

// ScrapeEmails extracts emails from a website
func (ws *WebScraper) ScrapeEmails(domain string) ([]string, error) {
	url := fmt.Sprintf("https://%s", utils.FormatDomain(domain))

	// Get the HTML
	html, err := ws.fetchHTML(url)
	if err != nil {
		return nil, err
	}

	// Extract emails from HTML
	emails := utils.ExtractEmails(html)

	// Filter out generic emails
	var filteredEmails []string
	for _, email := range emails {
		if !utils.IsGenericEmail(email) && strings.HasSuffix(email, utils.ExtractDomain(domain)) {
			filteredEmails = append(filteredEmails, email)
		}
	}

	return filteredEmails, nil
}

// ScrapeContactPage looks for contact information on the website
func (ws *WebScraper) ScrapeContactPage(domain string) ([]string, error) {
	baseURL := fmt.Sprintf("https://%s", utils.FormatDomain(domain))

	// Try common contact page URLs
	contactURLs := []string{
		baseURL + "/contact",
		baseURL + "/contact-us",
		baseURL + "/contact us",
		baseURL + "/about",
		baseURL + "/team",
		baseURL + "/people",
	}

	var allEmails []string
	for _, url := range contactURLs {
		html, err := ws.fetchHTML(url)
		if err != nil {
			continue
		}

		emails := utils.ExtractEmails(html)
		names := utils.ExtractNames(html)

		// Add emails from contact pages (even generic ones might be relevant here)
		for _, email := range emails {
			if strings.HasSuffix(email, utils.ExtractDomain(domain)) && !contains(allEmails, email) {
				allEmails = append(allEmails, email)
			}
		}

		// If we found results, we can stop searching
		if len(emails) > 0 || len(names) > 0 {
			break
		}
	}

	return allEmails, nil
}

// ExtractNames extracts names from website content
func (ws *WebScraper) ExtractNames(domain string) ([]string, error) {
	url := fmt.Sprintf("https://%s", utils.FormatDomain(domain))

	html, err := ws.fetchHTML(url)
	if err != nil {
		return nil, err
	}

	names := utils.ExtractNames(html)
	return names, nil
}

// ScrapeCompanyInfo extracts company information
func (ws *WebScraper) ScrapeCompanyInfo(domain string) (map[string]string, error) {
	url := fmt.Sprintf("https://%s", utils.FormatDomain(domain))

	html, err := ws.fetchHTML(url)
	if err != nil {
		return nil, err
	}

	info := make(map[string]string)

	// Parse HTML
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return info, nil
	}

	// Try to extract company name from title
	title := strings.TrimSpace(doc.Find("title").First().Text())
	if title != "" {
		info["company"] = title
	}

	// Try to extract description from meta tags
	description, _ := doc.Find("meta[name='description']").Attr("content")
	if description != "" {
		info["description"] = description
	}

	return info, nil
}

// fetchHTML fetches HTML content from a URL
func (ws *WebScraper) fetchHTML(url string) (string, error) {
	resp, err := ws.client.Get(url)
	if err != nil {
		return "", fmt.Errorf("failed to fetch %s: %w", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("status code %d for %s", resp.StatusCode, url)
	}

	// Limit response body size
	limitedReader := io.LimitReader(resp.Body, 5*1024*1024) // 5MB limit

	body, err := io.ReadAll(limitedReader)
	if err != nil {
		return "", fmt.Errorf("failed to read response body: %w", err)
	}

	return string(body), nil
}

// Helper function to check if a string is in a slice
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

import (
	"io"
	"net/http"
	"regexp"
)

func ExtractEmails(domain string) []string {
	resp, err := http.Get("https://" + domain)
	if err != nil {
		return []string{}
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	re := regexp.MustCompile(`[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`)
	matches := re.FindAllString(string(body), -1)

	return matches
}