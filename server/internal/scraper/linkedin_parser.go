package scraper

import (
	"log"
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

// SearchProfiles searches for LinkedIn profiles for a company and role
func (lp *LinkedInParser) SearchProfiles(company string, role string) ([]map[string]string, error) {
	return lp.googleScraper.SearchLinkedInProfiles(company, role)
}

// SearchLinkedInByRoleWithValidation searches and validates profiles — fixed to not over-filter
// SearchLinkedInByRoleWithValidation searches and validates profiles
func (lp *LinkedInParser) SearchLinkedInByRoleWithValidation(company string, role string) ([]map[string]string, error) {
	profiles, err := lp.googleScraper.SearchLinkedInProfiles(company, role)
	if err != nil {
		return nil, err
	}

	var validated []map[string]string
	seen := make(map[string]bool)

	for _, p := range profiles {

		log.Printf("🔍 RAW PROFILE: %+v", p)

		name := strings.TrimSpace(p["name"])
		url := strings.TrimSpace(p["url"])
		detectedRole := strings.TrimSpace(p["role"])

		if url == "" {
			log.Printf("❌ EMPTY URL")
			continue
		}

		if seen[url] {
			log.Printf("❌ DUPLICATE URL: %s", url)
			continue
		}

		seen[url] = true

		// Try extracting name from URL if missing
		if name == "" || strings.ToLower(name) == "unknown" {
			name = parseNameFromLinkedInURL(url)
		}

		// Clean LinkedIn junk
		name = strings.ReplaceAll(name, "| LinkedIn", "")
		name = strings.ReplaceAll(name, "- LinkedIn", "")
		name = strings.TrimSpace(name)

		// Validate name
		if !utils.ValidateName(name) {
			log.Printf("❌ INVALID NAME: %s", name)
			continue
		}

		if detectedRole == "" {
			detectedRole = role
		}

		log.Printf("✅ VALID PROFILE: NAME=%s ROLE=%s URL=%s", name, detectedRole, url)

		validated = append(validated, map[string]string{
			"name": name,
			"url":  url,
			"role": detectedRole,
		})
	}

	log.Printf("✅ TOTAL VALIDATED PROFILES: %d", len(validated))

	return validated, nil
}

// SearchCompanyProfiles searches for all employees of a company
func (lp *LinkedInParser) SearchCompanyProfiles(company string) ([]map[string]string, error) {
	profiles, err := lp.googleScraper.SearchLinkedInProfiles(company, "")
	if err != nil {
		return nil, err
	}

	var result []map[string]string
	seen := make(map[string]bool)

	for _, p := range profiles {
		url := p["url"]
		name := p["name"]
		if seen[url] || url == "" {
			continue
		}
		seen[url] = true
		if name == "" || len(name) < 2 {
			name = parseNameFromLinkedInURL(url)
			if name == "" {
				continue
			}
		}
		result = append(result, map[string]string{
			"name": name,
			"url":  url,
			"role": "Executive",
		})
	}
	return result, nil
}

// SearchCEOProfiles returns CEO LinkedIn URLs for a company
func (lp *LinkedInParser) SearchCEOProfiles(company string) ([]string, error) {
	profiles, err := lp.SearchProfiles(company, "CEO")
	if err != nil {
		return nil, err
	}
	var urls []string
	for _, p := range profiles {
		if u, ok := p["url"]; ok {
			urls = append(urls, u)
		}
	}
	return urls, nil
}

// ExtractLinkedInProfileURL extracts LinkedIn profile URLs from text
func (lp *LinkedInParser) ExtractLinkedInProfileURL(text string) []string {
	return utils.ExtractLinkedInURLs(text)
}

// ExtractUsernameFromURL extracts LinkedIn username from profile URL
func (lp *LinkedInParser) ExtractUsernameFromURL(profileURL string) string {
	profileURL = strings.TrimPrefix(profileURL, "https://")
	profileURL = strings.TrimPrefix(profileURL, "http://")
	profileURL = strings.TrimPrefix(profileURL, "www.")
	if strings.Contains(profileURL, "/in/") {
		parts := strings.Split(profileURL, "/in/")
		if len(parts) >= 2 {
			username := parts[1]
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
	normalizedName := utils.NormalizeName(name)
	username := lp.ExtractUsernameFromURL(linkedinURL)
	nameParts := strings.Split(normalizedName, "-")
	matchCount := 0
	for _, part := range nameParts {
		if len(part) > 0 && strings.Contains(username, part) {
			matchCount++
		}
	}
	return matchCount > 0
}

// SanitizeLinkedInURL sanitizes a LinkedIn URL
func (lp *LinkedInParser) SanitizeLinkedInURL(url string) string {
	url = strings.TrimSpace(url)
	url = strings.TrimSuffix(url, "/")
	if !strings.Contains(url, "linkedin.com") {
		return ""
	}
	if !strings.HasPrefix(url, "https://") && !strings.HasPrefix(url, "http://") {
		url = "https://" + url
	}
	return url
}

// ParseNameFromLinkedInURL extracts name from LinkedIn URL
func (lp *LinkedInParser) ParseNameFromLinkedInURL(profileURL string) string {
	return parseNameFromLinkedInURL(profileURL)
}

// ValidateCompanyInContext checks if company name appears in search context
func (lp *LinkedInParser) ValidateCompanyInContext(company string, context string) bool {
	if company == "" || context == "" {
		return false
	}
	return strings.Contains(strings.ToLower(context), strings.ToLower(company))
}