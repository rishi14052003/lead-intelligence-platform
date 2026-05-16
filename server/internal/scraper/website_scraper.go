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

// ScrapeCompanyWebsite scrapes the official website for contact info and leadership data.
// Pages scraped (in priority order): homepage, /contact, /about, /team, /people, /leadership,
// /executives, /careers. Emails are deduplicated and filtered against a blocklist.
func (ws *WebScraper) ScrapeCompanyWebsite(domain string) (*WebsiteScrapeResult, error) {
	baseURL := fmt.Sprintf("https://%s", utils.FormatDomain(domain))
	result := &WebsiteScrapeResult{
		Domain: utils.FormatDomain(domain),
		Pages:  make(map[string]string),
	}

	// Priority order: contact pages first so we get emails early
	pages := []string{
		"",           // homepage
		"/contact",
		"/contact-us",
		"/about",
		"/about-us",
		"/team",
		"/people",
		"/leadership",
		"/executives",
		"/careers",
	}

	emailSet := make(map[string]bool)
	nameSet := make(map[string]bool)
	socialSet := make(map[string]bool)

	for _, path := range pages {
		pageURL := baseURL + path
		finalURL, html, err := ws.fetchHTML(pageURL)
		if err != nil {
			continue
		}

		text := utils.CleanText(html)
		result.Pages[finalURL] = text

		// --- Email extraction (three strategies per page) ---

		// Strategy 1: mailto: links — most reliable
		for _, email := range extractMailtoEmails(html) {
			email = strings.ToLower(strings.TrimSpace(email))
			if !utils.IsBlockedEmail(email) && utils.ValidateEmail(email) && !emailSet[email] {
				emailSet[email] = true
				result.Emails = append(result.Emails, email)
			}
		}

		// Strategy 2: Emails in plain text / JSON-LD / meta tags
		for _, email := range extractAllEmails(html) {
			email = strings.ToLower(strings.TrimSpace(email))
			if !utils.IsBlockedEmail(email) && utils.ValidateEmail(email) && !emailSet[email] {
				// Prefer emails whose domain matches the site domain
				if emailBelongsToDomain(email, result.Domain) {
					emailSet[email] = true
					result.Emails = append(result.Emails, email)
				}
			}
		}

		// Strategy 3: Obfuscated emails — e.g. "hello [at] acme [dot] com"
		for _, email := range extractObfuscatedEmails(text) {
			email = strings.ToLower(strings.TrimSpace(email))
			if !utils.IsBlockedEmail(email) && utils.ValidateEmail(email) && !emailSet[email] {
				emailSet[email] = true
				result.Emails = append(result.Emails, email)
			}
		}

		// --- Name extraction ---
		for _, name := range utils.ExtractNames(text) {
			if !nameSet[name] {
				nameSet[name] = true
				result.Names = append(result.Names, name)
			}
		}

		// --- Social links ---
		for _, link := range ws.extractSocialLinks(html, baseURL) {
			if !socialSet[link] {
				socialSet[link] = true
				result.SocialLinks = append(result.SocialLinks, link)
			}
		}
	}

	return result, nil
}

// extractMailtoEmails finds all email addresses in mailto: href attributes.
func extractMailtoEmails(html string) []string {
	re := regexp.MustCompile(`(?i)href=["']mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})["']`)
	matches := re.FindAllStringSubmatch(html, -1)
	var out []string
	for _, m := range matches {
		if len(m) > 1 {
			out = append(out, m[1])
		}
	}
	return out
}

// extractAllEmails finds all email-shaped strings in raw HTML (regex scan).
func extractAllEmails(html string) []string {
	re := regexp.MustCompile(`[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}`)
	return re.FindAllString(html, -1)
}

// extractObfuscatedEmails handles common anti-scraping obfuscation patterns:
//   - "hello [at] acme [dot] com"
//   - "hello (at) acme (dot) com"
//   - "hello AT acme DOT com"
//   - "hello@acme dot com"
func extractObfuscatedEmails(text string) []string {
	// Normalise to lowercase for matching
	t := strings.ToLower(text)

	// Replace obfuscation tokens
	replacer := strings.NewReplacer(
		" [at] ", "@",
		" (at) ", "@",
		" at ", "@",
		"[at]", "@",
		"(at)", "@",
		" [dot] ", ".",
		" (dot) ", ".",
		" dot ", ".",
		"[dot]", ".",
		"(dot)", ".",
	)
	normalised := replacer.Replace(t)

	re := regexp.MustCompile(`[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}`)
	candidates := re.FindAllString(normalised, -1)

	var out []string
	for _, c := range candidates {
		// Obfuscated emails often have extra spaces collapsed — basic sanity check
		if len(c) > 5 && strings.Contains(c, "@") && strings.Contains(c, ".") {
			out = append(out, c)
		}
	}
	return out
}

// emailBelongsToDomain returns true if the email's domain matches or is a subdomain of siteDomain.
func emailBelongsToDomain(email, siteDomain string) bool {
	parts := strings.SplitN(email, "@", 2)
	if len(parts) != 2 {
		return false
	}
	emailDomain := strings.ToLower(strings.TrimSpace(parts[1]))
	siteDomain = strings.ToLower(strings.TrimSpace(siteDomain))
	// Strip www. prefix from site domain for comparison
	siteDomain = strings.TrimPrefix(siteDomain, "www.")
	return emailDomain == siteDomain || strings.HasSuffix(emailDomain, "."+siteDomain)
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

	// Also grab og:description as fallback
	if description == "" {
		ogDesc, _ := doc.Find("meta[property='og:description']").Attr("content")
		if ogDesc != "" {
			info["description"] = ogDesc
		}
	}

	return info, nil
}

func (ws *WebScraper) extractSocialLinks(html, _ string) []string {
	var links []string
	// Match LinkedIn company pages specifically (not just any linkedin.com link)
	re := regexp.MustCompile(`https?://(?:www\.)?(?:linkedin\.com/company|twitter\.com|x\.com|facebook\.com|instagram\.com)/[^\s"'<>]+`)
	matches := re.FindAllString(html, -1)
	seen := make(map[string]bool)
	for _, m := range matches {
		// Strip trailing punctuation / query params
		m = strings.Split(m, "?")[0]
		m = strings.TrimRight(m, ".,;)")
		if !seen[m] {
			seen[m] = true
			links = append(links, m)
		}
	}
	return links
}

// fetchHTML performs a GET request with browser-like headers and follows redirects.
// Returns (finalURL, htmlBody, error).
func (ws *WebScraper) fetchHTML(pageURL string) (string, string, error) {
	// Validate URL before requesting
	if _, err := url.Parse(pageURL); err != nil {
		return "", "", fmt.Errorf("invalid URL %s: %w", pageURL, err)
	}

	req, err := http.NewRequest("GET", pageURL, nil)
	if err != nil {
		return "", "", err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.5")

	resp, err := ws.client.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("fetch failed for %s: %w", pageURL, err)
	}
	defer resp.Body.Close()

	// Treat 404/410 as "page doesn't exist" — not an error worth retrying
	if resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusGone {
		return "", "", fmt.Errorf("page not found (%d): %s", resp.StatusCode, pageURL)
	}

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