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

	"lead-finder/internal/models"
)

// ApolloService handles Apollo.io API integration
type ApolloService struct {
	apiKey  string
	client  *http.Client
	baseURL string
}

// ApolloSearchRequest represents the request to Apollo API
type ApolloSearchRequest struct {
	Query        string   `json:"q"`
	PersonTitles []string `json:"person_titles,omitempty"`
	Limit        int      `json:"limit"`
	PageSize     int      `json:"page_size"`
}

// ApolloSearchResponse represents the response from Apollo API
type ApolloSearchResponse struct {
	Pagination struct {
		Page         int `json:"page"`
		PageSize     int `json:"page_size"`
		TotalEntries int `json:"total_entries"`
	} `json:"pagination"`
	Contacts []ApolloContact `json:"contacts"`
}

// ApolloContact represents a contact from Apollo API
type ApolloContact struct {
	ID          string `json:"id"`
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	Email       string `json:"email"`
	PhoneNumber string `json:"phone_number"`
	Title       string `json:"title"`
	Company     struct {
		Name    string `json:"name"`
		Website string `json:"website"`
	} `json:"company"`
	LinkedinURL string `json:"linkedin_url"`
}

// NewApolloService creates a new Apollo service instance
func NewApolloService(apiKey string) *ApolloService {
	return &ApolloService{
		apiKey:  apiKey,
		baseURL: "https://api.apollo.io/v1",
		client: &http.Client{
			Timeout: 15 * time.Second,
			Transport: &http.Transport{
				MaxIdleConns:        100,
				MaxIdleConnsPerHost: 100,
			},
		},
	}
}

// SearchLeads searches for leads by company name
func (as *ApolloService) SearchLeads(companyName string) ([]models.Lead, error) {
	if as.apiKey == "" {
		log.Println("⚠️ Apollo API key not configured - returning empty results. Add APOLLO_API_KEY to .env")
		return []models.Lead{}, nil
	}

	// Search for decision makers (CEO, CTO, HR)
	titles := []string{"CEO", "Chief Executive Officer", "CTO", "Chief Technology Officer", "Head of HR", "HR Manager", "HR Director", "VP", "Founder", "President"}

	req := ApolloSearchRequest{
		Query:        companyName,
		PersonTitles: titles,
		Limit:        50,
		PageSize:     50,
	}

	log.Printf("🔍 Searching Apollo for: %s with titles: %v", companyName, titles)

	resp, err := as.searchAPI(req)
	if err != nil {
		log.Printf("❌ Apollo API error: %v", err)
		return []models.Lead{}, fmt.Errorf("apollo search failed: %w", err)
	}

	// Convert Apollo contacts to models.Lead
	leads := as.convertToLeads(resp.Contacts)
	log.Printf("✓ Found %d leads from Apollo", len(leads))

	return leads, nil
}

// searchAPI makes the actual API call to Apollo
func (as *ApolloService) searchAPI(req ApolloSearchRequest) (*ApolloSearchResponse, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequest("POST", as.baseURL+"/people/search", bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("User-Agent", "Go-Lead-CEO-Finder/1.0")
	httpReq.Header.Set("X-Api-Key", as.apiKey)

	resp, err := as.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to call Apollo API: %w", err)
	}
	defer resp.Body.Close()

	// Read response body with size limit
	limitedReader := io.LimitReader(resp.Body, 10*1024*1024) // 10MB limit
	respBody, err := io.ReadAll(limitedReader)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		log.Printf("⚠️ Apollo API returned status %d: %s", resp.StatusCode, string(respBody))

		// Handle common error cases
		if resp.StatusCode == 401 {
			return nil, fmt.Errorf("invalid Apollo API key")
		}
		if resp.StatusCode == 429 {
			return nil, fmt.Errorf("rate limited by Apollo API")
		}
		if resp.StatusCode == 400 {
			return nil, fmt.Errorf("invalid request to Apollo API")
		}

		return nil, fmt.Errorf("apollo api error: status %d", resp.StatusCode)
	}

	var apolloResp ApolloSearchResponse
	err = json.Unmarshal(respBody, &apolloResp)
	if err != nil {
		log.Printf("❌ Failed to parse Apollo response: %v", err)
		return nil, fmt.Errorf("failed to parse apollo response: %w", err)
	}

	return &apolloResp, nil
}

// convertToLeads converts Apollo contacts to our Lead model
func (as *ApolloService) convertToLeads(contacts []ApolloContact) []models.Lead {
	var leads []models.Lead
	seenEmails := make(map[string]bool)

	for _, contact := range contacts {
		// Skip if no email
		if contact.Email == "" {
			continue
		}

		// Skip duplicates
		if seenEmails[contact.Email] {
			continue
		}
		seenEmails[contact.Email] = true

		fullName := contact.FirstName + " " + contact.LastName
		if fullName == " " {
			fullName = "Unknown"
		}

		// Skip leads with unknown or invalid names
		if fullName == "Unknown" || strings.TrimSpace(fullName) == "" || len(fullName) < 2 {
			continue
		}

		// Normalize role to our standardized roles (CEO, CTO, HR)
		normalizedRole := as.normalizeRole(contact.Title)

		// Only include leads with our target roles
		if normalizedRole == "" {
			continue
		}

		lead := models.Lead{
			Name:       fullName,
			Email:      contact.Email,
			Phone:      contact.PhoneNumber,
			Role:       normalizedRole,
			Company:    contact.Company.Name,
			CompanyURL: contact.Company.Website,
			LinkedIn:   contact.LinkedinURL,
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		}

		// Calculate score based on role and data completeness
		score := 50 // Base score
		if contact.Email != "" {
			score += 20
		}
		if contact.PhoneNumber != "" {
			score += 15
		}
		if contact.LinkedinURL != "" {
			score += 15
		}

		// Add role-based bonus
		switch normalizedRole {
		case "CEO":
			score += 10
		case "CTO":
			score += 8
		case "HR":
			score += 5
		}

		lead.Score = score

		leads = append(leads, lead)
	}

	return leads
}

// normalizeRole maps various title formats to our standardized roles (CEO, CTO, HR)
// Returns empty string if role doesn't match our target roles
func (as *ApolloService) normalizeRole(title string) string {
	titleLower := strings.ToLower(title)

	// CEO variants
	if strings.Contains(titleLower, "ceo") || strings.Contains(titleLower, "chief executive") || strings.Contains(titleLower, "founder") || strings.Contains(titleLower, "president") {
		return "CEO"
	}

	// CTO variants
	if strings.Contains(titleLower, "cto") || strings.Contains(titleLower, "chief technology") {
		return "CTO"
	}

	// HR variants
	if strings.Contains(titleLower, "hr") || strings.Contains(titleLower, "human resources") || strings.Contains(titleLower, "head of hr") || strings.Contains(titleLower, "hr director") || strings.Contains(titleLower, "hr manager") {
		return "HR"
	}

	// Not a target role
	return ""
}

// GetLeadsCount returns the estimated count for a search query
func (as *ApolloService) GetLeadsCount(companyName string) (int, error) {
	if as.apiKey == "" {
		return 0, nil
	}

	req := ApolloSearchRequest{
		Query:    companyName,
		Limit:    1,
		PageSize: 1,
	}

	resp, err := as.searchAPI(req)
	if err != nil {
		return 0, err
	}

	return resp.Pagination.TotalEntries, nil
}
