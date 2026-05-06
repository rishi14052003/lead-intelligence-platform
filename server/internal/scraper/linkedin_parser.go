package scraper

import (
	"fmt"
	"net/url"
	"regexp"
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

	// Get HTML from Google search
	searchURL := fmt.Sprintf("https://www.google.com/search?q=%s", url.QueryEscape(query))
	html, err := lp.googleScraper.FetchHTML(searchURL)
	if err != nil {
		return nil, err
	}

	// Extract LinkedIn URLs from the HTML
	profiles := ExtractLinkedInLinks(html)

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

// ParseNameFromLinkedInURL extracts name from LinkedIn URL
// Example: linkedin.com/in/john-doe-123 → "John Doe"
func (lp *LinkedInParser) ParseNameFromLinkedInURL(profileURL string) string {
	if profileURL == "" {
		return ""
	}

	// Extract username using existing function
	username := lp.ExtractUsernameFromURL(profileURL)
	if username == "" {
		return ""
	}

	// Convert: john-doe-123 → john doe
	// 1. Replace hyphens with spaces
	name := strings.ReplaceAll(username, "-", " ")

	// 2. Remove numbers and special characters
	reg := regexp.MustCompile(`[0-9]+`)
	name = reg.ReplaceAllString(name, "")

	// 3. Clean extra spaces
	name = strings.Join(strings.Fields(name), " ")

	// 4. Capitalize each word
	name = utils.FormatLeadName(name)

	return strings.TrimSpace(name)
}

// ValidateCompanyInContext checks if company name appears in search context
// Returns true if company name is found in the snippet/title
func (lp *LinkedInParser) ValidateCompanyInContext(company string, context string) bool {
	if company == "" || context == "" {
		return false
	}

	// Normalize both for comparison
	company = strings.ToLower(strings.TrimSpace(company))
	context = strings.ToLower(context)

	// Check if company name appears in context
	return strings.Contains(context, company)
}

// SearchLinkedInByRoleWithValidation searches for LinkedIn profiles and validates company
// Returns profiles with name and URL - NO LIMIT
func (lp *LinkedInParser) SearchLinkedInByRoleWithValidation(company string, role string) ([]map[string]string, error) {
	profiles, err := lp.googleScraper.SearchLinkedInByRole(company, role)
	if err != nil {
		return nil, err
	}

	var validatedProfiles []map[string]string

	for _, profile := range profiles {
		url := profile["url"]
		context := profile["context"]

		// Validate company presence
		if !lp.ValidateCompanyInContext(company, context) {
			continue
		}

		// Parse name from URL
		name := lp.ParseNameFromLinkedInURL(url)
		if name == "" {
			continue
		}

		validatedProfiles = append(validatedProfiles, map[string]string{
			"name": name,
			"url":  url,
			"role": role,
		})
	}

	return validatedProfiles, nil
}

// SearchCompanyProfiles searches for all employees of a company (no role filter)
// Uses site:linkedin.com/in + company site search for broader results
func (lp *LinkedInParser) SearchCompanyProfiles(company string) ([]map[string]string, error) {
	// Search for company site pages and employees
	query := fmt.Sprintf("site:linkedin.com/in \"%s\"", company)

	// Get HTML from Google search
	searchURL := fmt.Sprintf("https://www.google.com/search?q=%s", url.QueryEscape(query))
	html, err := lp.googleScraper.FetchHTML(searchURL)
	if err != nil {
		return nil, err
	}

	// Extract all LinkedIn URLs from results
	linkedinRegex := regexp.MustCompile(`https:\/\/www\.linkedin\.com\/in\/([a-zA-Z0-9\-]+)`)

	var profiles []map[string]string
	seen := make(map[string]bool)

	matches := linkedinRegex.FindAllStringSubmatch(html, -1)
	for _, match := range matches {
		if len(match) >= 2 {
			url := match[0]

			if !seen[url] {
				seen[url] = true

				// Parse name from URL
				name := lp.ParseNameFromLinkedInURL(url)
				if name == "" || len(name) < 2 || strings.ToLower(name) == "unknown" {
					continue
				}

				// Default role as Employee, can be overridden by snippet analysis if needed
				role := "Employee"

				profiles = append(profiles, map[string]string{
					"name": name,
					"url":  url,
					"role": role,
				})
			}
		}
	}

	return profiles, nil
}
