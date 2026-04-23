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

	if strings.Contains(email, "ceo") {
		return "CEO"
	}
	if strings.Contains(email, "cto") {
		return "CTO"
	}
	if strings.Contains(email, "hr") {
		return "HR"
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
	default:
		return 60
	}
}

func GetLeads(domain string) []models.Lead {
	emails := scraper.ExtractEmails(domain)
	company := utils.ExtractCompanyName(domain)

	var leads []models.Lead

	for _, email := range emails {
		if !isValidEmail(email) {
			continue
		}

		role := guessRole(email)
		score := calculateScore(role)

		leads = append(leads, models.Lead{
			Name:  company,
			Role:  role,
			Email: email,
			Score: score,
		})
	}

	return leads
}