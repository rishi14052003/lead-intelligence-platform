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
		"—", " ", "–", " ", "|", " ", "·", " ", "•", " ",
		"/", " ", "\\", " ", "(", " ", ")", " ", "[", " ",
		"]", " ", "{", " ", "}", " ", ":", " ", ";", " ",
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
		if strings.Contains(hay, " "+strings.ReplaceAll(n, " ", "-")+" ") {
			return true
		}
	}
	return false
}

// CategorizeTitle classifies a job title/snippet into one of the allowed decision-maker buckets.
func CategorizeTitle(titleOrSnippet string) (string, bool) {
	h := normalizeTitleText(titleOrSnippet)
	if h == "  " {
		return "", false
	}

	// Exclusions: junior / support roles
	if containsAnyWord(h, "intern", "trainee", "student", "junior", "support",
		"customer support", "helpdesk", "assistant", "associate", "analyst") {
		return "", false
	}
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
		"executive director", "general manager",
		"entrepreneur", "founding member", "startup founder",
		"founding team", "leadership", "director",
		"co-owner", "co owner",
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
		"recruitment lead", "recruitment manager",
		"chro", "chief human resources officer",
		"talent manager", "talent director",
	) {
		return string(CategoryHRRecruitment), true
	}

	// SALES & BUSINESS DEVELOPMENT
	if containsAnyWord(h,
		"cro", "chief revenue officer",
		"sales director", "vp sales", "vice president sales",
		"head of sales", "sales head",
		"business development manager", "growth manager",
		"partnerships manager", "account executive",
		"enterprise sales", "revenue operations",
		"sales manager", "sales leader",
	) {
		return string(CategorySalesBD), true
	}

	// MARKETING & OPERATIONS
	if containsAnyWord(h,
		"cmo", "chief marketing officer",
		"marketing director", "head of marketing",
		"operations manager",
		"coo", "chief operating officer",
		"strategy lead", "studio head",
	) {
		return string(CategoryMarketingOps), true
	}

	return "", false
}

// ExtractJobTitleFromSerperTitle pulls the job title from a Serper organic title line.
//
// LinkedIn Serper titles come in several patterns:
//   - "Jane Doe - Founder & CEO - Acme Corp | LinkedIn"
//   - "Rahul Mehta | CTO at TechCo | LinkedIn"
//   - "Priya Shah - Head of HR · Startup Inc | LinkedIn"
//   - "John Smith - LinkedIn"   (no title visible)
//
// Strategy:
//  1. Strip trailing LinkedIn noise.
//  2. Split on common separators to get segments.
//  3. The first segment is almost always the person's name — skip it.
//  4. Walk remaining segments: pick the first one that contains a known title keyword.
//  5. If nothing matches, return "".
func ExtractJobTitleFromSerperTitle(serperTitle string, aliases []string) string {
	t := strings.TrimSpace(serperTitle)
	if t == "" {
		return ""
	}

	// Strip trailing LinkedIn / social noise
	t = trimLinkedInSuffix(t)

	// Split on all common LinkedIn title separators
	segments := splitOnSeparators(t, []string{" - ", " | ", " — ", " – ", " · ", " • "})

	if len(segments) < 2 {
		return ""
	}

	// Segment 0 is the person's name — skip it.
	// Walk segments 1..N looking for a job title.
	for i := 1; i < len(segments); i++ {
		seg := strings.TrimSpace(segments[i])
		if seg == "" {
			continue
		}
		// Skip segments that look like a company name (match an alias)
		if segMatchesAlias(seg, aliases) {
			continue
		}
		// Skip "LinkedIn", pure location strings, etc.
		if isNoiseSeg(seg) {
			continue
		}
		// If this segment contains a recognised title keyword, return it.
		if containsTitleKeyword(seg) {
			return cleanTitle(seg)
		}
	}

	// Fallback: return second segment if it is not a company name and not noise —
	// even if we can't confirm it's a title keyword. Callers will validate via CategorizeTitle.
	if len(segments) >= 2 {
		candidate := strings.TrimSpace(segments[1])
		if !segMatchesAlias(candidate, aliases) && !isNoiseSeg(candidate) && candidate != "" {
			return cleanTitle(candidate)
		}
	}

	return ""
}

// trimLinkedInSuffix strips common trailing fragments from Serper titles.
func trimLinkedInSuffix(s string) string {
	s = strings.TrimRight(s, " |·-–—")
	for _, noise := range []string{"| LinkedIn", "- LinkedIn", "· LinkedIn", "LinkedIn"} {
		if idx := strings.LastIndex(s, noise); idx > 0 {
			s = strings.TrimSpace(s[:idx])
		}
	}
	return s
}

// splitOnSeparators splits s on any of the given multi-char separators (tried in order).
// Returns all resulting non-empty trimmed segments.
func splitOnSeparators(s string, seps []string) []string {
	// We want to honour all separators, so replace them with a sentinel and split once.
	sentinel := "\x00"
	for _, sep := range seps {
		s = strings.ReplaceAll(s, sep, sentinel)
	}
	parts := strings.Split(s, sentinel)
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

// segMatchesAlias returns true if seg clearly matches one of the company aliases.
func segMatchesAlias(seg string, aliases []string) bool {
	segL := strings.ToLower(strings.TrimSpace(seg))
	segBrand := normalizeCompanyBrand(segL)
	for _, a := range aliases {
		aL := strings.ToLower(strings.TrimSpace(a))
		if aL == "" {
			continue
		}
		aBrand := normalizeCompanyBrand(aL)
		if segL == aL || segBrand == aBrand {
			return true
		}
		// If the segment *contains* the alias (e.g. "Acme Pvt Ltd" contains "Acme")
		if len(aBrand) >= 4 && strings.Contains(segBrand, aBrand) {
			return true
		}
	}
	return false
}

// isNoiseSeg returns true for segments that are clearly not a job title.
func isNoiseSeg(seg string) bool {
	l := strings.ToLower(strings.TrimSpace(seg))
	if l == "" || l == "linkedin" {
		return true
	}
	// Short all-caps abbreviations that are actually roles (CEO, CTO) should NOT be noise —
	// handled by containsTitleKeyword; here we only drop things like "India", "Mumbai", "View profile".
	noiseTokens := []string{
		"view profile", "connect", "follow", "message", "500+ connections",
		"india", "usa", "uk", "canada", "australia", "singapore",
	}
	for _, n := range noiseTokens {
		if l == n {
			return true
		}
	}
	return false
}

// containsTitleKeyword returns true if the segment contains at least one recognised leadership keyword.
func containsTitleKeyword(seg string) bool {
	keywords := []string{
		"ceo", "chief executive",
		"cto", "chief technology", "chief technical",
		"cfo", "chief financial",
		"coo", "chief operating",
		"cmo", "chief marketing",
		"cro", "chief revenue",
		"chro", "chief human resources",
		"cpo", "chief product",
		"vp", "vice president",
		"founder", "co-founder", "cofounder",
		"owner", "managing director", "general manager",
		"president", "chairman", "chairperson",
		"director", "head of", "head,",
		"partner", "principal",
		"manager", "lead",
		"hr", "human resources", "recruiter", "talent",
		"sales", "business development", "revenue",
		"marketing", "growth", "operations", "strategy",
		"engineer", "developer", "product",
	}
	l := strings.ToLower(seg)
	for _, kw := range keywords {
		if strings.Contains(l, kw) {
			return true
		}
	}
	return false
}

// cleanTitle strips noise from an extracted title segment.
// PRESERVES the original title format from LinkedIn instead of normalizing to abbreviations.
func cleanTitle(s string) string {
	// Remove trailing "at <CompanyName>" fragments that sometimes bleed in
	atRe := regexp.MustCompile(`(?i)\s+at\s+.+$`)
	s = atRe.ReplaceAllString(s, "")

	// Remove "in <Location>" fragments
	inRe := regexp.MustCompile(`(?i)\s+in\s+[A-Z][a-z]+.*$`)
	s = inRe.ReplaceAllString(s, "")

	s = strings.TrimSpace(s)

	// PRESERVE original title format - don't convert to abbreviations
	// Just return the cleaned title as-is
	return s
}

// isValidJobTitle checks if a string looks like a job title (not a person's name)
// Kept for backward compatibility.
func isValidJobTitle(s string) bool {
	s = strings.TrimSpace(strings.ToLower(s))
	if s == "" {
		return false
	}
	return containsTitleKeyword(s)
}
