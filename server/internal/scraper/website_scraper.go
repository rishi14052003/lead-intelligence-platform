package scraper

import (
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"

	"lead-finder/internal/utils"

	"github.com/PuerkitoBio/goquery"
)

// WebsiteScrapeResult holds data scraped from a company website
type WebsiteScrapeResult struct {
	Domain      string
	Emails      []string
	Names       []string
	SocialLinks []string
	Pages       map[string]string // url -> cleaned text content
}

// WebScraper handles website scraping
type WebScraper struct {
	client *http.Client
}

// NewWebScraper creates a new web scraper instance
func NewWebScraper() *WebScraper {
	return &WebScraper{
		client: &http.Client{
			Timeout: 15 * time.Second,
			Transport: &http.Transport{
				MaxIdleConns:        100,
				MaxIdleConnsPerHost: 100,
			},
		},
	}
}

// ScrapeCompanyWebsite scrapes the official website for contact info and leadership data
func (ws *WebScraper) ScrapeCompanyWebsite(domain string) (*WebsiteScrapeResult, error) {
	baseURL := fmt.Sprintf("https://%s", utils.FormatDomain(domain))
	result := &WebsiteScrapeResult{
		Domain: utils.FormatDomain(domain),
		Pages:  make(map[string]string),
	}

	pages := []string{"", "/about", "/team", "/contact", "/careers", "/people", "/leadership", "/executives"}
	for _, path := range pages {
		url := baseURL + path
		finalURL, html, err := ws.fetchHTML(url)
		if err != nil {
			continue
		}
		text := utils.CleanText(html)
		result.Pages[finalURL] = text

		emails := utils.ExtractEmails(html)
		for _, email := range emails {
			if utils.IsBlockedEmail(email) {
				continue
			}
			if strings.HasSuffix(strings.ToLower(email), result.Domain) || utils.ValidateEmail(email) {
				result.Emails = append(result.Emails, email)
			}
		}

		names := utils.ExtractNames(text)
		result.Names = append(result.Names, names...)

		social := ws.extractSocialLinks(html, baseURL)
		result.SocialLinks = append(result.SocialLinks, social...)
	}

	result.Emails = utils.RemoveDuplicates(result.Emails)
	result.Names = utils.RemoveDuplicates(result.Names)
	result.SocialLinks = utils.RemoveDuplicates(result.SocialLinks)

	return result, nil
}

// ScrapeEmails extracts emails from the homepage (legacy support)
func (ws *WebScraper) ScrapeEmails(domain string) ([]string, string, error) {
	result, err := ws.ScrapeCompanyWebsite(domain)
	if err != nil {
		return nil, "", err
	}
	return result.Emails, result.Domain, nil
}

// ScrapeContactPage scrapes contact pages for emails (legacy support)
func (ws *WebScraper) ScrapeContactPage(domain string) ([]string, string, error) {
	return ws.ScrapeEmails(domain)
}

// ExtractNames extracts names from website content (legacy support)
func (ws *WebScraper) ExtractNames(domain string) ([]string, string, error) {
	result, err := ws.ScrapeCompanyWebsite(domain)
	if err != nil {
		return nil, "", err
	}
	return result.Names, result.Domain, nil
}

// ScrapeCompanyInfo extracts company name and description from the homepage
func (ws *WebScraper) ScrapeCompanyInfo(domain string) (map[string]string, error) {
	baseURL := fmt.Sprintf("https://%s", utils.FormatDomain(domain))
	_, html, err := ws.fetchHTML(baseURL)
	if err != nil {
		return nil, err
	}

	info := make(map[string]string)
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return info, nil
	}

	title := strings.TrimSpace(doc.Find("title").First().Text())
	if title != "" {
		info["company"] = title
	}

	description, _ := doc.Find("meta[name='description']").Attr("content")
	if description != "" {
		info["description"] = description
	}

	return info, nil
}

func (ws *WebScraper) extractSocialLinks(html, baseURL string) []string {
	var links []string
	re := regexp.MustCompile(`https?://(?:www\.)?(?:linkedin|twitter|x|facebook|instagram)\.com/[^\s"]+`)
	matches := re.FindAllString(html, -1)
	for _, m := range matches {
		links = append(links, m)
	}
	return links
}

func (ws *WebScraper) fetchHTML(url string) (string, string, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", "", err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	resp, err := ws.client.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("fetch failed for %s: %w", url, err)
	}
	defer resp.Body.Close()

	finalURL := resp.Request.URL.String()
	limited := io.LimitReader(resp.Body, 5*1024*1024)
	body, err := io.ReadAll(limited)
	if err != nil {
		return finalURL, "", err
	}
	return finalURL, string(body), nil
}

// ExtractEmails is a legacy helper that scrapes a domain for emails
func ExtractEmails(domain string) []string {
	ws := NewWebScraper()
	result, err := ws.ScrapeCompanyWebsite(domain)
	if err != nil {
		return []string{}
	}
	return result.Emails
}
