package services

import (
	"strings"

	"lead-finder/internal/models"
	"lead-finder/internal/scraper"
	"lead-finder/internal/utils"
)

func isValidEmail(email string) bool {
	blocked := []string{"noreply", "support", "info", "admin"}

	for _, b := range blocked {
		if strings.Contains(strings.ToLower(email), b) {
			return false
		}
	}
	return true
}

func guessRole(email string) string {
	email = strings.ToLower(email)

	if strings.Contains(email, "ceo") || strings.Contains(email, "founder") {
		return "CEO"
	}
	if strings.Contains(email, "cto") || strings.Contains(email, "tech") {
		return "CTO"
	}
	if strings.Contains(email, "hr") || strings.Contains(email, "people") {
		return "HR"
	}
	if strings.Contains(email, "sales") {
		return "Sales"
	}

	return "Employee"
}

func calculateScore(role string) int {
	switch role {
	case "CEO":
		return 95
	case "CTO":
		return 90
	case "HR":
		return 80
	case "Sales":
		return 75
	default:
		return 60
	}
}

func matchLinkedIn(name string, links []string) string {
	normalized := utils.NormalizeName(name)
	firstName := strings.Split(normalized, "-")[0]

	for _, link := range links {
		l := strings.ToLower(link)

		if strings.Contains(l, normalized) || strings.Contains(l, firstName) {
			return link
		}
	}
	return ""
}

func GetLeads(domain string) []models.Lead {
	linkedinHTML := scraper.SearchGoogle("site:linkedin.com/in " + domain + " CEO")
	linkedinLinks := scraper.ExtractLinkedInLinks(linkedinHTML)

	emails := scraper.ExtractEmails(domain)

	html := scraper.SearchGoogle(domain + " company CEO")
	names := scraper.ExtractNamesFromGoogle(html)

	var leads []models.Lead
	seen := make(map[string]bool)

	// better name selection
	bestName := ""
	for _, n := range names {
		if len(n) > 5 {
			bestName = n
			break
		}
	}

	for _, email := range emails {
		if !isValidEmail(email) {
			continue
		}

		if seen[email] {
			continue
		}
		seen[email] = true

		var name string
		if bestName != "" {
			name = bestName
		} else {
			name = utils.ExtractNameFromEmail(email)
		}

		linkedin := matchLinkedIn(name, linkedinLinks)

		role := guessRole(email)
		score := calculateScore(role)

		leads = append(leads, models.Lead{
			Name:     name,
			Role:     role,
			Email:    email,
			LinkedIn: linkedin,
			Score:    score,
		})

		if len(leads) >= 10 {
			break
		}
	}

	return leads
}