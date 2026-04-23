package scraper

import (
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

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