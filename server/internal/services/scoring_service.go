package services

import (
	"strings"
)

// ScoringService handles lead scoring
type ScoringService struct{}

// NewScoringService creates a new scoring service
func NewScoringService() *ScoringService {
	return &ScoringService{}
}

// CalculateScore calculates a lead score based on role and other factors
func (ss *ScoringService) CalculateScore(role string, hasLinkedIn bool, hasEmail bool) int {
	score := ss.scoreByRole(role)

	// Adjust score based on additional factors
	if hasLinkedIn {
		score += 5
	}

	if hasEmail {
		score += 5
	}

	// Cap score at 100
	if score > 100 {
		score = 100
	}

	return score
}

// scoreByRole returns base score for a role
func (ss *ScoringService) scoreByRole(role string) int {
	roleLower := strings.ToLower(role)

	// Executive roles - highest score
	if ss.isExecutiveRole(roleLower) {
		return 95
	}

	// C-level executive roles
	if ss.isCLevelRole(roleLower) {
		return 90
	}

	// VP and director roles
	if ss.isVPRole(roleLower) || ss.isDirectorRole(roleLower) {
		return 85
	}

	// Manager roles
	if ss.isManagerRole(roleLower) {
		return 75
	}

	// HR, recruitment roles
	if ss.isHRRole(roleLower) {
		return 80
	}

	// Sales and business development
	if ss.isSalesRole(roleLower) {
		return 75
	}

	// Technical roles
	if ss.isTechnicalRole(roleLower) {
		return 70
	}

	// Marketing roles
	if ss.isMarketingRole(roleLower) {
		return 70
	}

	// Operations
	if ss.isOperationsRole(roleLower) {
		return 65
	}

	// Finance
	if ss.isFinanceRole(roleLower) {
		return 75
	}

	// Default score for other roles
	return 60
}

// isExecutiveRole checks if role is an executive role
func (ss *ScoringService) isExecutiveRole(role string) bool {
	keywords := []string{"ceo", "founder", "president", "owner"}
	for _, keyword := range keywords {
		if strings.Contains(role, keyword) {
			return true
		}
	}
	return false
}

// isCLevelRole checks if role is a C-level role
func (ss *ScoringService) isCLevelRole(role string) bool {
	keywords := []string{"cto", "cfo", "coo", "cio", "cro", "chief"}
	for _, keyword := range keywords {
		if strings.Contains(role, keyword) {
			return true
		}
	}
	return false
}

// isVPRole checks if role is a VP role
func (ss *ScoringService) isVPRole(role string) bool {
	keywords := []string{"vp ", "vice president", "vice-president"}
	for _, keyword := range keywords {
		if strings.Contains(role, keyword) {
			return true
		}
	}
	return false
}

// isDirectorRole checks if role is a director role
func (ss *ScoringService) isDirectorRole(role string) bool {
	return strings.Contains(role, "director")
}

// isManagerRole checks if role is a manager role
func (ss *ScoringService) isManagerRole(role string) bool {
	return strings.Contains(role, "manager") && !strings.Contains(role, "product manager")
}

// isHRRole checks if role is an HR role
func (ss *ScoringService) isHRRole(role string) bool {
	keywords := []string{"hr ", "human resource", "recruitment", "talent", "people"}
	for _, keyword := range keywords {
		if strings.Contains(role, keyword) {
			return true
		}
	}
	return false
}

// isSalesRole checks if role is a sales role
func (ss *ScoringService) isSalesRole(role string) bool {
	keywords := []string{"sales", "business development", "account executive", "sales director"}
	for _, keyword := range keywords {
		if strings.Contains(role, keyword) {
			return true
		}
	}
	return false
}

// isTechnicalRole checks if role is a technical role
func (ss *ScoringService) isTechnicalRole(role string) bool {
	keywords := []string{"engineer", "developer", "architect", "technical", "devops", "qa"}
	for _, keyword := range keywords {
		if strings.Contains(role, keyword) {
			return true
		}
	}
	return false
}

// isMarketingRole checks if role is a marketing role
func (ss *ScoringService) isMarketingRole(role string) bool {
	keywords := []string{"marketing", "growth", "product manager"}
	for _, keyword := range keywords {
		if strings.Contains(role, keyword) {
			return true
		}
	}
	return false
}

// isOperationsRole checks if role is an operations role
func (ss *ScoringService) isOperationsRole(role string) bool {
	keywords := []string{"operations", "ops", "administrator", "admin"}
	for _, keyword := range keywords {
		if strings.Contains(role, keyword) {
			return true
		}
	}
	return false
}

// isFinanceRole checks if role is a finance role
func (ss *ScoringService) isFinanceRole(role string) bool {
	keywords := []string{"finance", "accountant", "bookkeeper", "controller"}
	for _, keyword := range keywords {
		if strings.Contains(role, keyword) {
			return true
		}
	}
	return false
}
