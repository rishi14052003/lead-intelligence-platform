package utils

import (
	"fmt"
	"regexp"
	"strings"
)

// ValidateEmail validates an email address
func ValidateEmail(email string) bool {
	email = strings.TrimSpace(email)
	if email == "" {
		return false
	}

	// Simple email validation
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	return emailRegex.MatchString(email)
}

// ValidateDomain validates a domain
func ValidateDomain(domain string) bool {
	domain = strings.TrimSpace(domain)
	if domain == "" {
		return false
	}

	// Remove protocol if present
	domain = strings.TrimPrefix(domain, "http://")
	domain = strings.TrimPrefix(domain, "https://")
	domain = strings.TrimPrefix(domain, "www.")

	// Remove path, query, and fragment (keep only the domain part)
	if idx := strings.IndexAny(domain, "/?#"); idx != -1 {
		domain = domain[:idx]
	}

	// Remove trailing slashes
	domain = strings.TrimSuffix(domain, "/")

	// Check if it contains at least one dot
	if !strings.Contains(domain, ".") {
		return false
	}

	// Check for valid characters
	validDomainRegex := regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9](\.[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])*\.[a-zA-Z]{2,}$`)
	return validDomainRegex.MatchString(domain)
}

// ValidateName validates a person's name
func ValidateName(name string) bool {
	name = strings.TrimSpace(name)

	if name == "" {
		return false
	}

	// Remove common LinkedIn junk
	name = strings.ReplaceAll(name, "| LinkedIn", "")
	name = strings.ReplaceAll(name, "- LinkedIn", "")
	name = strings.ReplaceAll(name, "LinkedIn", "")
	name = strings.TrimSpace(name)

	// Minimum length
	if len(name) < 2 {
		return false
	}

	// Maximum length
	if len(name) > 120 {
		return false
	}

	// Reject obvious garbage
	lower := strings.ToLower(name)

	invalidWords := []string{
		"linkedin",
		"profile",
		"sign in",
		"login",
		"directory",
		"people",
		"members",
	}

	for _, word := range invalidWords {
		if strings.Contains(lower, word) {
			return false
		}
	}

	// Allow:
	// letters
	// spaces
	// dots
	// hyphens
	// apostrophes
	// unicode chars
	validNameRegex := regexp.MustCompile(`^[\p{L}\s\.\-']+$`)

	return validNameRegex.MatchString(name)
}

// ValidateRole validates a role
func ValidateRole(role string) bool {
	role = strings.TrimSpace(role)
	if role == "" {
		return false
	}

	// Role should have at least 2 characters
	if len(role) < 2 {
		return false
	}

	// Role should not exceed 50 characters
	if len(role) > 50 {
		return false
	}

	return true
}

// ValidateURL validates a URL
func ValidateURL(url string) bool {
	url = strings.TrimSpace(url)
	if url == "" {
		return false
	}

	// Check if it starts with http:// or https://
	if !strings.HasPrefix(url, "http://") && !strings.HasPrefix(url, "https://") {
		return false
	}

	// Check for valid URL characters
	validURLRegex := regexp.MustCompile(`^https?://[^\s]+$`)
	return validURLRegex.MatchString(url)
}

// ValidateScore validates a score
func ValidateScore(score int) bool {
	return score >= 0 && score <= 100
}

// ValidateQuery validates a search query (company name or domain)
func ValidateQuery(query string) (bool, string) {
	query = strings.TrimSpace(query)

	if query == "" {
		return false, "Query cannot be empty"
	}

	if len(query) < 2 {
		return false, "Query must be at least 2 characters long"
	}

	if len(query) > 255 {
		return false, "Query must not exceed 255 characters"
	}

	// If it looks like a domain, validate it
	if strings.Contains(query, ".") {
		if !ValidateDomain(query) {
			return false, fmt.Sprintf("Invalid domain: %s", query)
		}
	} else {
		// If it's a company name, validate it
		if !ValidateName(query) {
			return false, fmt.Sprintf("Invalid company name: %s", query)
		}
	}

	return true, ""
}

// IsBlockedEmail checks if an email is a generic/blocked email
func IsBlockedEmail(email string) bool {
	if email == "" {
		return true
	}
	blocked := []string{
		"support@", "info@", "admin@", "noreply@", "no-reply@",
		"help@", "sales@", "marketing@", "contact@", "hello@",
		"team@", "office@", "webmaster@", "postmaster@",
		"feedback@", "billing@", "careers@", "jobs@", "press@",
	}
	lower := strings.ToLower(email)
	for _, b := range blocked {
		if strings.HasPrefix(lower, b) {
			return true
		}
	}
	return false
}

// SanitizeInput removes potentially harmful characters
func SanitizeInput(input string) string {
	// Remove leading/trailing whitespace
	input = strings.TrimSpace(input)

	// Remove null bytes
	input = strings.ReplaceAll(input, "\x00", "")

	// Remove control characters
	validInputRegex := regexp.MustCompile(`[\x00-\x1f\x7f-\x9f]`)
	input = validInputRegex.ReplaceAllString(input, "")

	return input
}
