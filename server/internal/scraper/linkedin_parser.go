package scraper

import (
	"fmt"
	"net/url"
	"strings"

	"lead-finder/internal/utils"
)

// LinkedInParser handles LinkedIn profile extraction and matching
type LinkedInParser struct {
	googleScraper *GoogleScraper
}

// NewLinkedInParser creates a new LinkedIn parser instance
func NewLinkedInParser() *LinkedInParser {
	return &LinkedInParser{
		googleScraper: NewGoogleScraper(),
	}
}

// SearchProfiles searches for LinkedIn profiles for a company
func (lp *LinkedInParser) SearchProfiles(company string, role string) ([]string, error) {
	query := fmt.Sprintf("site:linkedin.com/in %s %s", company, role)

	profiles, err := lp.googleScraper.search(query)
	if err != nil {
		return nil, err
	}

	return profiles, nil
}

// SearchCEOProfiles searches for CEO profiles on LinkedIn
func (lp *LinkedInParser) SearchCEOProfiles(company string) ([]string, error) {
	urls, err := lp.SearchProfiles(company, "CEO")
	if err != nil {
		return nil, err
	}
	return urls, nil
}

// ExtractLinkedInProfileURL extracts LinkedIn profile URL from text
func (lp *LinkedInParser) ExtractLinkedInProfileURL(text string) []string {
	return utils.ExtractLinkedInURLs(text)
}

// ExtractUsernameFromURL extracts LinkedIn username from profile URL
func (lp *LinkedInParser) ExtractUsernameFromURL(profileURL string) string {
	// Remove protocol
	profileURL = strings.TrimPrefix(profileURL, "https://")
	profileURL = strings.TrimPrefix(profileURL, "http://")

	// Remove www.
	profileURL = strings.TrimPrefix(profileURL, "www.")

	// Extract the username part after /in/
	if strings.Contains(profileURL, "/in/") {
		parts := strings.Split(profileURL, "/in/")
		if len(parts) >= 2 {
			username := parts[1]
			// Remove trailing slash or query parameters
			username = strings.Split(username, "/")[0]
			username = strings.Split(username, "?")[0]
			return strings.ToLower(username)
		}
	}

	return ""
}

// MatchNameWithLinkedIn matches a name with a LinkedIn username
func (lp *LinkedInParser) MatchNameWithLinkedIn(name string, linkedinURL string) bool {
	if name == "" || linkedinURL == "" {
		return false
	}

	// Normalize the name
	normalizedName := utils.NormalizeName(name)

	// Extract username from LinkedIn URL
	username := lp.ExtractUsernameFromURL(linkedinURL)

	// Check if the username contains the name parts
	nameParts := strings.Split(normalizedName, "-")

	// Simple matching: check if the username contains the name parts
	matchCount := 0
	for _, part := range nameParts {
		if len(part) > 0 && strings.Contains(username, part) {
			matchCount++
		}
	}

	// If at least one part matches, consider it a match
	return matchCount > 0
}

// BuildLinkedInSearchURL builds a LinkedIn search URL
func (lp *LinkedInParser) BuildLinkedInSearchURL(firstName string, lastName string, company string) string {
	params := url.Values{}
	params.Add("firstName", firstName)
	params.Add("lastName", lastName)
	params.Add("company", company)

	return fmt.Sprintf("https://www.linkedin.com/search/results/people/?%s", params.Encode())
}

// ExtractNameFromEmail extracts a name from an email address
func (lp *LinkedInParser) ExtractNameFromEmail(email string) string {
	if email == "" {
		return ""
	}

	// Remove domain part
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return ""
	}

	localPart := parts[0]

	// Handle common patterns
	// john.doe or john_doe or johndoe
	if strings.Contains(localPart, ".") {
		parts := strings.Split(localPart, ".")
		name := strings.Join(parts, " ")
		return utils.FormatLeadName(name)
	}

	if strings.Contains(localPart, "_") {
		parts := strings.Split(localPart, "_")
		name := strings.Join(parts, " ")
		return utils.FormatLeadName(name)
	}

	// For names like "johndoe", we can't extract first and last name reliably
	return ""
}

// SanitizeLinkedInURL sanitizes a LinkedIn URL
func (lp *LinkedInParser) SanitizeLinkedInURL(url string) string {
	url = strings.TrimSpace(url)
	url = strings.TrimSuffix(url, "/")

	// Ensure it's a LinkedIn URL
	if !strings.Contains(url, "linkedin.com") {
		return ""
	}

	// Normalize the URL
	url = strings.ToLower(url)

	// Ensure https protocol
	if !strings.HasPrefix(url, "https://") && !strings.HasPrefix(url, "http://") {
		url = "https://" + url
	}

	return url
}
