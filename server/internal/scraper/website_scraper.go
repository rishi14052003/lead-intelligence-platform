package scraper

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