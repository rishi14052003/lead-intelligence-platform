package utils

import (
	"fmt"
	"strings"
)

// FormatLeadName formats a name for display
func FormatLeadName(name string) string {
	if name == "" {
		return "Unknown"
	}

	// Title case each word
	parts := strings.Fields(name)
	for i, part := range parts {
		if len(part) > 0 {
			parts[i] = strings.ToUpper(string(part[0])) + strings.ToLower(part[1:])
		}
	}

	return strings.Join(parts, " ")
}

// FormatRole formats a role for display
func FormatRole(role string) string {
	if role == "" {
		return "Unknown"
	}

	// Title case
	return strings.ToUpper(string(role[0])) + strings.ToLower(role[1:])
}

// FormatEmail formats an email for display (lowercase)
func FormatEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

// FormatLinkedInURL formats a LinkedIn URL
func FormatLinkedInURL(url string) string {
	url = strings.TrimSpace(url)
	if !strings.HasPrefix(url, "http") {
		url = "https://" + url
	}
	return url
}

// FormatDomain formats a domain
func FormatDomain(domain string) string {
	domain = strings.TrimSpace(domain)
	domain = strings.TrimPrefix(domain, "http://")
	domain = strings.TrimPrefix(domain, "https://")
	domain = strings.TrimPrefix(domain, "www.")
	domain = strings.ToLower(domain)
	return strings.TrimRight(domain, "/")
}

// FormatScore formats a score for display
func FormatScore(score int) string {
	if score < 0 {
		score = 0
	}
	if score > 100 {
		score = 100
	}
	return fmt.Sprintf("%d%%", score)
}

// FormatCompanyName formats a company name
func FormatCompanyName(domain string) string {
	// Extract company name from domain
	// Remove TLD and format nicely
	domain = FormatDomain(domain)
	parts := strings.Split(domain, ".")
	if len(parts) > 0 {
		name := parts[0]
		// Title case
		if len(name) > 0 {
			name = strings.ToUpper(string(name[0])) + strings.ToLower(name[1:])
		}
		return name
	}
	return domain
}

// FormatCSVField escapes a field for CSV export
func FormatCSVField(field string) string {
	// If field contains comma, quote, or newline, wrap in quotes and escape quotes
	if strings.ContainsAny(field, ",\"\n") {
		field = strings.ReplaceAll(field, "\"", "\"\"")
		return fmt.Sprintf(`"%s"`, field)
	}
	return field
}

// FormatCSVRow formats a slice of fields as a CSV row
func FormatCSVRow(fields []string) string {
	formattedFields := make([]string, len(fields))
	for i, field := range fields {
		formattedFields[i] = FormatCSVField(field)
	}
	return strings.Join(formattedFields, ",")
}
