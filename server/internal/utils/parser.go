package utils

import (
	"regexp"
	"strings"
	"time"
)

// ExtractEmails extracts email addresses from text using regex
func ExtractEmails(text string) []string {
	emailRegex := regexp.MustCompile(`[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}`)
	matches := emailRegex.FindAllString(text, -1)

	emailMap := make(map[string]bool)
	for _, email := range matches {
		emailMap[strings.ToLower(email)] = true
	}

	var uniqueEmails []string
	for email := range emailMap {
		uniqueEmails = append(uniqueEmails, email)
	}

	return uniqueEmails
}

// ExtractNames extracts names from text using simple heuristics
func ExtractNames(text string) []string {
	// Remove extra whitespace and newlines
	text = strings.Join(strings.Fields(text), " ")

	// Simple name extraction - look for 2-3 word sequences
	words := strings.Fields(text)
	var names []string

	for i := 0; i < len(words)-1; i++ {
		word1 := words[i]
		word2 := words[i+1]

		// Check if both words start with uppercase (likely a name)
		if isCapitalized(word1) && isCapitalized(word2) {
			name := word1 + " " + word2
			// Remove common noise
			if !isNoise(name) {
				names = append(names, name)
			}
		}
	}

	return RemoveDuplicates(names)
}

// ExtractLinkedInURLs extracts LinkedIn profile URLs
func ExtractLinkedInURLs(text string) []string {
	linkedinRegex := regexp.MustCompile(`https?://(?:www\.)?linkedin\.com/in/[a-zA-Z0-9\-]+/?`)
	matches := linkedinRegex.FindAllString(text, -1)
	return RemoveDuplicates(matches)
}

// ExtractDomain extracts domain from URL or email
func ExtractDomain(input string) string {
	// Remove protocol if present
	input = strings.TrimPrefix(input, "http://")
	input = strings.TrimPrefix(input, "https://")
	input = strings.TrimPrefix(input, "www.")

	// Extract domain from email
	if strings.Contains(input, "@") {
		parts := strings.Split(input, "@")
		if len(parts) == 2 {
			return parts[1]
		}
	}

	// Extract domain from URL
	parts := strings.Split(input, "/")
	return parts[0]
}

// NormalizeName converts a name to a normalized format (lowercase, hyphenated)
func NormalizeName(name string) string {
	// Remove extra whitespace
	name = strings.TrimSpace(name)
	// Convert to lowercase
	name = strings.ToLower(name)
	// Replace spaces with hyphens
	name = strings.ReplaceAll(name, " ", "-")
	// Remove special characters except hyphens
	reg := regexp.MustCompile(`[^a-z0-9\-]`)
	name = reg.ReplaceAllString(name, "")

	return name
}

// IsGenericEmail checks if an email is generic (info, support, admin, etc.)
func IsGenericEmail(email string) bool {
	genericPrefixes := []string{
		"info@", "support@", "admin@", "hello@", "contact@",
		"noreply@", "no-reply@", "sales@", "help@", "billing@",
		"feedback@", "test@", "webmaster@", "postmaster@",
	}

	emailLower := strings.ToLower(email)
	for _, prefix := range genericPrefixes {
		if strings.HasPrefix(emailLower, prefix) {
			return true
		}
	}

	return false
}

// CleanText removes HTML tags and extra whitespace
func CleanText(text string) string {
	// Remove HTML tags
	htmlRegex := regexp.MustCompile(`<[^>]*>`)
	text = htmlRegex.ReplaceAllString(text, "")

	// Remove extra whitespace
	text = strings.Join(strings.Fields(text), " ")

	return strings.TrimSpace(text)
}

// IsCapitalized checks if a word is capitalized
func isCapitalized(word string) bool {
	if len(word) == 0 {
		return false
	}
	return word[0] >= 'A' && word[0] <= 'Z'
}

// IsNoise checks if text contains common noise/stop words
func isNoise(text string) bool {
	noiseWords := []string{
		"google", "terms", "privacy", "about", "contact",
		"home", "news", "site", "help", "social", "press",
		"powered", "copyright", "reserved", "all rights",
	}

	textLower := strings.ToLower(text)
	for _, word := range noiseWords {
		if strings.Contains(textLower, word) {
			return true
		}
	}

	return false
}

// RemoveDuplicates removes duplicate strings from a slice
func RemoveDuplicates(slice []string) []string {
	uniqueMap := make(map[string]bool)
	var result []string

	for _, item := range slice {
		if !uniqueMap[item] {
			uniqueMap[item] = true
			result = append(result, item)
		}
	}

	return result
}

// FormatTimestamp formats a timestamp for display
func FormatTimestamp(t time.Time) string {
	return t.Format("2006-01-02 15:04:05")
}

// StringToPtr converts a string to a string pointer
func StringToPtr(s string) *string {
	return &s
}

// IntToPtr converts an int to an int pointer
func IntToPtr(i int) *int {
	return &i
}

// GetInitials returns initials from a name
func GetInitials(name string) string {
	parts := strings.Fields(strings.TrimSpace(name))
	if len(parts) == 0 {
		return ""
	}

	initials := ""
	for _, part := range parts {
		if len(part) > 0 {
			initials += string(part[0])
		}
	}

	return strings.ToUpper(initials)
}

func ExtractCompanyName(domain string) string {
	parts := strings.Split(domain, ".")
	if len(parts) > 0 {
		name := parts[0]
		return strings.ToUpper(string(name[0])) + name[1:]
	}
	return domain
}

func ExtractNameFromEmail(email string) string {
	parts := strings.Split(email, "@")
	if len(parts) == 0 {
		return "Unknown"
	}

	namePart := parts[0]

	nameSplit := strings.FieldsFunc(namePart, func(r rune) bool {
		return r == '.' || r == '_' || r == '-'
	})

	if len(nameSplit) == 0 {
		return "Unknown"
	}

	name := strings.ToUpper(string(nameSplit[0][0])) + nameSplit[0][1:]

	return name
}

// CompanyNameToDomain converts a company name to a domain
// e.g., "Stripe" -> "stripe.com", "OpenAI" -> "openai.com"
func CompanyNameToDomain(companyName string) string {
	// Convert to lowercase
	companyName = strings.ToLower(companyName)

	// Remove spaces and special characters
	reg := regexp.MustCompile(`[^a-z0-9]`)
	companyName = reg.ReplaceAllString(companyName, "")

	// Add .com TLD
	return companyName + ".com"
}
