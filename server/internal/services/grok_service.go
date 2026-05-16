package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"lead-finder/internal/utils"
)

type GrokService struct {
	apiKey string
	client *http.Client
}

type GrokMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type GrokRequest struct {
	Model       string        `json:"model"`
	Messages    []GrokMessage `json:"messages"`
	Temperature float64       `json:"temperature"`
	MaxTokens   int           `json:"max_tokens"`
}

type GrokResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

type EnrichedLead struct {
	Name        string `json:"name"`
	Role        string `json:"role"`
	LinkedIn    string `json:"linkedin"`
	Email       string `json:"email"`
	EmailStatus string `json:"email_status"`
	Confidence  int    `json:"confidence"`
	Source      string `json:"source"`
}

type EnrichedCompany struct {
	Company string         `json:"company"`
	Website string         `json:"website"`
	Leads   []EnrichedLead `json:"leads"`
}

func NewGrokService(apiKey string) *GrokService {
	return &GrokService{
		apiKey: apiKey,
		client: &http.Client{
			Timeout: 45 * time.Second,
		},
	}
}

func (gs *GrokService) EnrichLeads(companyName, website, location string, linkedinData, websiteData []map[string]string, websiteText string) (*EnrichedCompany, error) {
	if gs.apiKey == "" {
		return nil, fmt.Errorf("mistral api key not configured")
	}

	hasScrapedData := len(linkedinData) > 0 || len(websiteData) > 0 || len(websiteText) > 100
	prompt := buildGrokPrompt(companyName, website, location, linkedinData, websiteData, websiteText, hasScrapedData)

	reqBody := GrokRequest{
		Model: "mistral-small-latest",
		Messages: []GrokMessage{
			{Role: "user", Content: prompt},
		},
		Temperature: 0.1,
		MaxTokens:   2000,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", "https://api.mistral.ai/v1/chat/completions", bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+gs.apiKey)

	resp, err := gs.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("mistral api request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 5*1024*1024))
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("mistral api returned status %d: %s", resp.StatusCode, string(body))
	}

	var grokResp GrokResponse
	if err := json.Unmarshal(body, &grokResp); err != nil {
		return nil, fmt.Errorf("failed to parse mistral response: %w", err)
	}

	if len(grokResp.Choices) == 0 {
		return nil, fmt.Errorf("no choices returned from mistral")
	}

	text := grokResp.Choices[0].Message.Content
	text = cleanJSONResponse(text)

	var enriched EnrichedCompany
	if err := json.Unmarshal([]byte(text), &enriched); err != nil {
		log.Printf("⚠️ Mistral returned malformed response: %s", text[:min(200, len(text))])
		return nil, fmt.Errorf("failed to parse enriched json: %w", err)
	}

	enriched.Company = companyName
	enriched.Website = website

	for i := range enriched.Leads {
		lead := &enriched.Leads[i]
		if lead.Email != "" {
			if !utils.ValidateEmail(lead.Email) || utils.IsBlockedEmail(lead.Email) {
				lead.Email = ""
				lead.EmailStatus = "not_found"
			} else {
				lead.EmailStatus = "scraped_public"
			}
		} else {
			lead.Email = ""
			lead.EmailStatus = "not_found"
		}
		if lead.Confidence == 0 {
			lead.Confidence = scoreByRole(lead.Role)
		}
		if lead.Source == "" {
			lead.Source = "mistral_ai"
		}
		if lead.LinkedIn != "" && !isValidLinkedInURL(lead.LinkedIn) {
			lead.LinkedIn = ""
		}
	}

	realURLs := make(map[string]bool)
	for _, p := range linkedinData {
		if u := p["url"]; u != "" {
			realURLs[canonicalLinkedInProfileURL(u)] = true
			realURLs[strings.ToLower(strings.TrimSpace(u))] = true
		}
	}
	for i := range enriched.Leads {
		if enriched.Leads[i].LinkedIn != "" {
			li := enriched.Leads[i].LinkedIn
			if !realURLs[canonicalLinkedInProfileURL(li)] && !realURLs[strings.ToLower(strings.TrimSpace(li))] {
				enriched.Leads[i].LinkedIn = ""
			}
		}
	}

	var validLeads []EnrichedLead
	for _, l := range enriched.Leads {
		if l.Name != "" && len(l.Name) > 2 && !isPlaceholderLeadName(l.Name) {
			validLeads = append(validLeads, l)
		}
	}
	enriched.Leads = validLeads

	return &enriched, nil
}

func buildGrokPrompt(companyName, website, location string, linkedinData, websiteData []map[string]string, websiteText string, hasScrapedData bool) string {
	scrapedSection := ""
	if hasScrapedData {
		scrapedSection = fmt.Sprintf(`
Scraped LinkedIn data:
%s

Scraped website data:
%s

Website text:
%s
`, formatMaps(linkedinData), formatMaps(websiteData), truncateString(websiteText, 3000))
	} else {
		scrapedSection = "No scraped data available. Use your own knowledge about this company."
	}

	locationContext := ""
	if location != "" {
		locationContext = fmt.Sprintf("Company Location: %s.\nFilter and prioritize executives working in this location or for offices in this region.\n", location)
	}

	return fmt.Sprintf(`You are a B2B lead intelligence analyst.

Identify real executives at "%s" (website: %s).
%s
RULES:
1. Only real people with real full names. No placeholders.
2. Never guess emails. Set email to null if unknown.
3. Prioritize: CEO, CTO, Founder, HR Head, Head of Sales, Vice President.
4. Use your own knowledge if scraped data is missing.
5. For linkedin field: ONLY use a URL that appears EXACTLY in the scraped LinkedIn data provided below. If the person's URL is not in the scraped data, set linkedin to null. NEVER construct or guess a LinkedIn URL.
6. Confidence: CEO/Founder=95, CTO=90, VP=85, HR=80, Director=75, Manager=70.

%s

Return ONLY this JSON, no markdown, no extra text:

{
  "company": "%s",
  "website": "%s",
  "leads": [
    {
      "name": "Example Person",
      "role": "CEO",
      "linkedin": null,
      "email": null,
      "email_status": "not_found",
      "confidence": 95,
      "source": "mistral_ai"
    }
  ]
}`,
		companyName, website, locationContext, scrapedSection, companyName, website,
	)
}

func scoreByRole(role string) int {
	r := strings.ToLower(role)
	switch {
	case contains(r, "ceo", "founder", "president", "owner"):
		return 95
	case contains(r, "cto", "coo", "cfo", "chief"):
		return 90
	case contains(r, "vp", "vice president"):
		return 85
	case contains(r, "hr", "human resource", "talent", "people"):
		return 80
	case contains(r, "director"):
		return 75
	case contains(r, "manager"):
		return 70
	default:
		return 60
	}
}

func contains(s string, keywords ...string) bool {
	for _, k := range keywords {
		if strings.Contains(s, k) {
			return true
		}
	}
	return false
}

func isPlaceholderLeadName(name string) bool {
	n := strings.TrimSpace(strings.ToLower(name))
	if n == "" {
		return true
	}
	placeholders := []string{
		"full name", "first name", "last name", "name surname",
		"john doe", "jane doe", "john smith", "example person",
		"unknown", "n/a", "na", "not available", "example name",
	}
	for _, p := range placeholders {
		if n == p {
			return true
		}
	}
	return false
}

func isValidLinkedInURL(u string) bool {
	return strings.HasPrefix(u, "https://") && strings.Contains(u, "linkedin.com/in/")
}

func canonicalLinkedInProfileURL(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Path == "" {
		return strings.ToLower(strings.TrimSuffix(raw, "/"))
	}
	host := strings.ToLower(strings.TrimPrefix(parsed.Host, "www."))
	if !strings.HasSuffix(host, "linkedin.com") {
		return strings.ToLower(strings.TrimSuffix(raw, "/"))
	}
	path := strings.TrimSuffix(parsed.Path, "/")
	if path == "" {
		return ""
	}
	return "https://linkedin.com" + path
}

func cleanJSONResponse(text string) string {
	text = strings.TrimSpace(text)
	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(text, "```")
	return strings.TrimSpace(text)
}

func formatMaps(data []map[string]string) string {
	if len(data) == 0 {
		return "[]"
	}
	b, _ := json.Marshal(data)
	return string(b)
}

func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
