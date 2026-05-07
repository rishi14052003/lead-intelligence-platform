package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"lead-finder/internal/utils"
)

// GeminiService handles AI enrichment using Google Gemini API
type GeminiService struct {
	apiKey string
	client *http.Client
}

// GeminiRequest represents the request body for Gemini API
type GeminiRequest struct {
	Contents         []GeminiContent        `json:"contents"`
	GenerationConfig GeminiGenerationConfig `json:"generationConfig"`
}

// GeminiContent represents a content block
type GeminiContent struct {
	Parts []GeminiPart `json:"parts"`
}

// GeminiPart represents a text part
type GeminiPart struct {
	Text string `json:"text"`
}

// GeminiGenerationConfig controls response format
type GeminiGenerationConfig struct {
	ResponseMimeType string `json:"responseMimeType"`
	Temperature      float64 `json:"temperature"`
}

// GeminiResponse represents the Gemini API response
type GeminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
}

// EnrichedLead represents a lead after AI enrichment
type EnrichedLead struct {
	Name        string `json:"name"`
	Role        string `json:"role"`
	LinkedIn    string `json:"linkedin"`
	Email       string `json:"email"`
	EmailStatus string `json:"email_status"`
	Confidence  int    `json:"confidence"`
	Source      string `json:"source"`
}

// EnrichedCompany represents the enriched company data
type EnrichedCompany struct {
	Company string         `json:"company"`
	Website string         `json:"website"`
	Leads   []EnrichedLead `json:"leads"`
}

// NewGeminiService creates a new Gemini AI service instance
func NewGeminiService(apiKey string) *GeminiService {
	return &GeminiService{
		apiKey: apiKey,
		client: &http.Client{
			Timeout: 45 * time.Second,
		},
	}
}

// EnrichLeads sends scraped data to Gemini and returns structured lead intelligence
func (gs *GeminiService) EnrichLeads(companyName, website string, linkedinData, websiteData []map[string]string, websiteText string) (*EnrichedCompany, error) {
	if gs.apiKey == "" {
		log.Println("⚠️ Gemini API key not set, skipping AI enrichment")
		return nil, fmt.Errorf("gemini api key not configured")
	}

	hasScrapedData := len(linkedinData) > 0 || len(websiteData) > 0 || len(websiteText) > 100

	prompt := buildGeminiPrompt(companyName, website, linkedinData, websiteData, websiteText, hasScrapedData)

	reqBody := GeminiRequest{
		Contents: []GeminiContent{
			{
				Parts: []GeminiPart{{Text: prompt}},
			},
		},
		GenerationConfig: GeminiGenerationConfig{
			ResponseMimeType: "application/json",
			Temperature:      0.1,
		},
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	apiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=%s", gs.apiKey)
	req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := gs.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("gemini api request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 5*1024*1024))
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("gemini api returned status %d: %s", resp.StatusCode, string(body))
	}

	var geminiResp GeminiResponse
	if err := json.Unmarshal(body, &geminiResp); err != nil {
		return nil, fmt.Errorf("failed to parse gemini response: %w", err)
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("no candidates returned from gemini")
	}

	text := geminiResp.Candidates[0].Content.Parts[0].Text
	text = cleanJSONResponse(text)

	var enriched EnrichedCompany
	if err := json.Unmarshal([]byte(text), &enriched); err != nil {
		log.Printf("⚠️ Gemini returned non-JSON or malformed response: %s", text[:min(200, len(text))])
		return nil, fmt.Errorf("failed to parse enriched json: %w", err)
	}

	enriched.Company = companyName
	if enriched.Website == "" {
		enriched.Website = website
	}

	// Post-process: strip invalid emails, set correct statuses
	for i := range enriched.Leads {
		lead := &enriched.Leads[i]

		// Never allow guessed/fake emails
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
			lead.Source = "gemini_ai"
		}
		// Sanitize LinkedIn URL
		if lead.LinkedIn != "" && !isValidLinkedInURL(lead.LinkedIn) {
			lead.LinkedIn = ""
		}
	}

	// Remove leads with no name
	var validLeads []EnrichedLead
	for _, l := range enriched.Leads {
		if l.Name != "" && len(l.Name) > 2 {
			validLeads = append(validLeads, l)
		}
	}
	enriched.Leads = validLeads

	return &enriched, nil
}

// buildGeminiPrompt constructs the prompt — uses own knowledge when scraped data is sparse
func buildGeminiPrompt(companyName, website string, linkedinData, websiteData []map[string]string, websiteText string, hasScrapedData bool) string {
	scrapedSection := ""
	if hasScrapedData {
		scrapedSection = fmt.Sprintf(`
Scraped LinkedIn data (from public Google search results):
%s

Scraped website leadership/contact data:
%s

Website text snippets:
%s
`, formatMaps(linkedinData), formatMaps(websiteData), truncateString(websiteText, 3000))
	} else {
		scrapedSection = `
No scraped data was available. Use your own knowledge about this company to identify the real key decision-makers.
`
	}

	return fmt.Sprintf(`You are an AI lead intelligence analyst for a B2B sales platform.

Your task: Identify real, publicly known executives and decision-makers at the company "%s" (website: %s).

CRITICAL RULES:
1. Only include REAL people with real full names. No placeholders like "Jane Doe" or "John Smith".
2. NEVER guess or generate email addresses. If you don't know a real public email, set email to null.
3. Prioritize: CEO, CTO, Founder, Co-Founder, HR Head, VP Engineering.
4. Use your own knowledge about this company if scraped data is missing or sparse.
5. LinkedIn URLs must be real known URLs. If unsure, leave blank ("").
6. Confidence scoring: CEO/Founder=95, CTO/COO=90, VP=85, HR=80, Director=75, Manager=70, Employee=60.

%s

Return ONLY this exact JSON format with no extra text, no markdown, no code blocks:

{
  "company": "%s",
  "website": "%s",
  "leads": [
    {
      "name": "Full Real Name",
      "role": "CEO",
      "linkedin": "https://linkedin.com/in/username-or-empty",
      "email": null,
      "email_status": "not_found",
      "confidence": 95,
      "source": "gemini_ai"
    }
  ]
}`,
		companyName,
		website,
		scrapedSection,
		companyName,
		website,
	)
}

// scoreByRole returns a confidence score based on role title
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

func isValidLinkedInURL(u string) bool {
	return strings.HasPrefix(u, "https://") && strings.Contains(u, "linkedin.com/in/")
}

func cleanJSONResponse(text string) string {
	// Remove markdown code fences if Gemini wraps response
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