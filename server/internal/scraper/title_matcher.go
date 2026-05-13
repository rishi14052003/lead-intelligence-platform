package scraper

import (
	"regexp"
	"strings"
)

type TitleCategory string

const (
	CategoryFoundersOwnership TitleCategory = "FOUNDERS & OWNERSHIP"
	CategoryTechProduct       TitleCategory = "TECH & PRODUCT LEADERSHIP"
	CategoryHRRecruitment     TitleCategory = "HR & RECRUITMENT"
	CategorySalesBD           TitleCategory = "SALES & BUSINESS DEVELOPMENT"
	CategoryMarketingOps      TitleCategory = "MARKETING & OPERATIONS"
)

var emojiAndSymbols = regexp.MustCompile(`[^\p{L}\p{N}\s&/\-\.,]+`)

func normalizeTitleText(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return ""
	}
	s = emojiAndSymbols.ReplaceAllString(s, " ")
	s = strings.ToLower(s)
	repl := strings.NewReplacer(
		"—", " ",
		"–", " ",
		"|", " ",
		"·", " ",
		"•", " ",
		"/", " ",
		"\\", " ",
		"(", " ",
		")", " ",
		"[", " ",
		"]", " ",
		"{", " ",
		"}", " ",
		":", " ",
		";", " ",
	)
	s = repl.Replace(s)
	return " " + strings.Join(strings.Fields(s), " ") + " "
}

func containsAnyWord(hay string, needles ...string) bool {
	for _, n := range needles {
		n = strings.TrimSpace(strings.ToLower(n))
		if n == "" {
			continue
		}
		needle := " " + n + " "
		if strings.Contains(hay, needle) {
			return true
		}
		// hyphenated variations (vice-president)
		if strings.Contains(hay, " "+strings.ReplaceAll(n, " ", "-")+" ") {
			return true
		}
	}
	return false
}

// CategorizeTitle classifies a job title/snippet into one of the allowed decision-maker buckets.
// Returns (category, true) only when the title strongly matches one of the include rules and is not excluded.
func CategorizeTitle(titleOrSnippet string) (string, bool) {
	h := normalizeTitleText(titleOrSnippet)
	if h == "  " {
		return "", false
	}

	// Exclusions
	if containsAnyWord(h,
		"intern", "trainee", "student", "junior",
		"support", "customer support", "helpdesk",
		"assistant", "associate", "analyst",
	) {
		return "", false
	}
	// Exclude freelancers/consultants unless leadership keywords also present.
	if containsAnyWord(h, "freelancer", "consultant", "contractor") &&
		!containsAnyWord(h, "head", "director", "vp", "vice president", "chief", "founder", "owner", "ceo", "president") {
		return "", false
	}

	// FOUNDERS & OWNERSHIP
	if containsAnyWord(h,
		"founder", "co-founder", "co founder", "cofounder",
		"owner", "business owner", "managing director",
		"partner", "principal",
		"chairman", "chairperson",
		"ceo", "chief executive officer",
		"president", "vice president", "vp",
		"executive director",
		"general manager", "entrepreneur", "founding member", "startup founder",
		"founding team", "leadership", "director",
	) {
		return string(CategoryFoundersOwnership), true
	}

	// TECH & PRODUCT LEADERSHIP
	if containsAnyWord(h,
		"cto", "chief technology officer",
		"cio", "chief information officer",
		"cpo", "chief product officer",
		"vp engineering", "head of engineering", "engineering manager",
		"technical director", "director of technology",
		"product manager", "head of product",
		"founding engineer",
	) {
		return string(CategoryTechProduct), true
	}

	// HR & RECRUITMENT
	if containsAnyWord(h,
		"hr", "human resources",
		"recruiter", "talent acquisition", "talent partner",
		"hiring manager", "people operations",
		"head of hr", "hr manager", "hr director",
		"recruitment lead",
		"chro", "chief human resources officer",
	) {
		return string(CategoryHRRecruitment), true
	}

	// SALES & BUSINESS DEVELOPMENT
	if containsAnyWord(h,
		"cro", "chief revenue officer",
		"sales director",
		"vp sales", "vice president sales",
		"head of sales", "sales head",
		"business development manager",
		"growth manager",
		"partnerships manager",
		"account executive",
		"enterprise sales",
		"revenue operations",
	) {
		return string(CategorySalesBD), true
	}

	// MARKETING & OPERATIONS
	if containsAnyWord(h,
		"cmo", "chief marketing officer",
		"marketing director", "head of marketing",
		"operations manager",
		"coo", "chief operating officer",
		"strategy lead",
		"studio head",
	) {
		return string(CategoryMarketingOps), true
	}

	return "", false
}

// ExtractJobTitleFromSerperTitle tries to extract the displayed job title from a Serper organic title line.
// Typical Serper titles look like: "Jane Doe - Founder & CEO - Acme | LinkedIn".
func ExtractJobTitleFromSerperTitle(serperTitle string, companyAliases []string) string {
	t := strings.TrimSpace(serperTitle)
	if t == "" {
		return ""
	}
	// Remove trailing "LinkedIn"
	t = strings.ReplaceAll(t, "| LinkedIn", "")
	t = strings.TrimSpace(t)

	// Split on common separators.
	seps := []string{" - ", " | ", " — ", " – ", " · "}
	parts := []string{t}
	for _, sep := range seps {
		var next []string
		for _, p := range parts {
			next = append(next, strings.Split(p, sep)...)
		}
		parts = next
	}
	for i := range parts {
		parts[i] = strings.TrimSpace(parts[i])
	}

	// Find the company segment; assume title is the segment before it.
	companySeg := -1
	for i, p := range parts {
		pl := strings.ToLower(p)
		for _, a := range companyAliases {
			al := strings.ToLower(strings.TrimSpace(a))
			if al != "" && strings.Contains(pl, al) {
				companySeg = i
				break
			}
		}
		if companySeg != -1 {
			break
		}
	}
	if companySeg > 0 {
		return strings.TrimSpace(parts[companySeg-1])
	}

	// Fallback: if it looks like "Name - Title", return second segment.
	if len(parts) >= 2 {
		return strings.TrimSpace(parts[1])
	}
	return ""
}

