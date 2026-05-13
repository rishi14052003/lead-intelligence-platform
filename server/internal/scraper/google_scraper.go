package scraper

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"time"
)

// SerperOrganicItem is one organic search result from Serper.
type SerperOrganicItem struct {
	Title   string `json:"title"`
	Link    string `json:"link"`
	Snippet string `json:"snippet"`
}

// SerperResponse represents Serper API response
type SerperResponse struct {
	Organic []SerperOrganicItem `json:"organic"`
}

// GoogleScraper handles search scraping
type GoogleScraper struct {
	client    *http.Client
	serperKey string
}

// NewGoogleScraper creates scraper instance
func NewGoogleScraper() *GoogleScraper {
	serperKey := os.Getenv("SERPER_API_KEY")
	return &GoogleScraper{
		client: &http.Client{
			Timeout: 20 * time.Second,
			Transport: &http.Transport{
				MaxIdleConns:        100,
				MaxIdleConnsPerHost: 100,
			},
		},
		serperKey: serperKey,
	}
}

// serperGoogleSearch executes a Google search through Serper (google.serper.dev).
func (gs *GoogleScraper) serperGoogleSearch(query string) (SerperResponse, error) {
	var empty SerperResponse
	if strings.TrimSpace(gs.serperKey) == "" {
		return empty, fmt.Errorf("SERPER_API_KEY not set")
	}
	payloadBytes, err := json.Marshal(map[string]string{"q": query})
	if err != nil {
		return empty, err
	}
	req, err := http.NewRequest("POST", "https://google.serper.dev/search", strings.NewReader(string(payloadBytes)))
	if err != nil {
		return empty, err
	}
	req.Header.Set("X-API-KEY", gs.serperKey)
	req.Header.Set("Content-Type", "application/json")
	resp, err := gs.client.Do(req)
	if err != nil {
		return empty, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return empty, err
	}
	if resp.StatusCode != http.StatusOK {
		return empty, fmt.Errorf("serper HTTP %d: %s", resp.StatusCode, string(body))
	}
	var result SerperResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return empty, err
	}
	return result, nil
}

func scoreOrganicWebsiteCandidate(company, location string, item SerperOrganicItem) int {
	if isJunkWebsiteURL(item.Link) {
		return -1
	}
	score := 0
	hay := strings.ToLower(item.Title + " " + item.Snippet)
	co := strings.TrimSpace(strings.ToLower(company))
	if co != "" && strings.Contains(hay, co) {
		score += 6
	}
	brand := normalizeCompanyBrand(company)
	if len(brand) >= 3 && strings.Contains(strings.ReplaceAll(hay, " ", ""), brand) {
		score += 4
	}
	if strings.Contains(hay, "official") || strings.Contains(hay, "homepage") || strings.Contains(hay, "home page") {
		score += 2
	}
	loc := strings.TrimSpace(location)
	if loc != "" && len(loc) >= 3 {
		tokens := locationTokens(loc)
		matches := 0
		for _, t := range tokens {
			if len(t) >= 3 && strings.Contains(hay, t) {
				matches++
			}
		}
		// Reward at least one token match; prefer multiple matches.
		if matches > 0 {
			score += 3 + minInt(matches, 3)
		} else {
			// If the user provided a location but the snippet/title doesn't mention it at all,
			// downrank to avoid picking an unrelated company with the same name.
			score -= 2
		}

		// Country hint: if India is in the location tokens, slightly prefer .in domains.
		if containsToken(tokens, "india") {
			if host := hostFromURL(item.Link); strings.HasSuffix(host, ".in") {
				score += 3
			}
		}
	}
	if u, err := url.Parse(item.Link); err == nil {
		path := strings.Trim(u.Path, "/")
		if path == "" {
			score += 1
		}
	}
	return score
}

func locationTokens(location string) []string {
	raw := strings.ToLower(location)
	raw = strings.ReplaceAll(raw, "|", " ")
	raw = strings.ReplaceAll(raw, "/", " ")
	raw = strings.ReplaceAll(raw, "-", " ")
	parts := strings.FieldsFunc(raw, func(r rune) bool {
		return r == ',' || r == ';' || r == ' ' || r == '\t' || r == '\n'
	})
	out := make([]string, 0, len(parts))
	seen := make(map[string]bool)
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		// ignore tiny tokens
		if len(p) < 2 {
			continue
		}
		if !seen[p] {
			seen[p] = true
			out = append(out, p)
		}
	}
	return out
}

func containsToken(tokens []string, want string) bool {
	want = strings.ToLower(strings.TrimSpace(want))
	if want == "" {
		return false
	}
	for _, t := range tokens {
		if t == want {
			return true
		}
	}
	return false
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func scoreLinkedInCompanyCandidate(companyName, domainLabel string, item SerperOrganicItem) int {
	normalized := normalizeLinkedInCompanyPageURL(item.Link)
	if normalized == "" {
		return -1
	}
	score := 0
	hay := strings.ToLower(item.Title + " " + item.Snippet + " " + item.Link)
	co := strings.TrimSpace(strings.ToLower(companyName))
	if co != "" && strings.Contains(hay, co) {
		score += 6
	}
	brand := normalizeCompanyBrand(companyName)
	if len(brand) >= 3 && strings.Contains(strings.ReplaceAll(hay, " ", ""), brand) {
		score += 3
	}
	dl := strings.TrimSpace(strings.ToLower(domainLabel))
	if dl != "" && (strings.Contains(hay, dl) || strings.Contains(strings.ToLower(item.Link), dl)) {
		score += 4
	}
	return score
}

// roleSearchVariants returns broader LinkedIn/Google query phrases for a canonical role label.
func roleSearchVariants(canonical string) []string {
	c := strings.TrimSpace(canonical)
	switch strings.ToLower(c) {
	case "ceo":
		return []string{"CEO", "Chief Executive Officer", "Chief Executive"}
	case "cto":
		return []string{"CTO", "Chief Technology Officer", "Chief Technical Officer"}
	case "founder":
		return []string{"Founder", "Co-Founder", "Co Founder", "Cofounder"}
	case "hr head":
		return []string{"HR Head", "Head of HR", "Head of Human Resources", "CHRO", "Chief Human Resources Officer", "VP HR", "VP Human Resources"}
	case "head of sales":
		return []string{"Head of Sales", "Sales Head", "VP Sales", "Vice President Sales", "Chief Revenue Officer", "CRO", "VP of Sales"}
	case "vice president":
		return []string{"Vice President", "VP", "V.P."}
	default:
		return []string{c}
	}
}

func companyAliases(companyName, website string) []string {
	aliases := []string{}
	add := func(s string) {
		s = strings.TrimSpace(s)
		if s == "" {
			return
		}
		for _, a := range aliases {
			if strings.EqualFold(a, s) {
				return
			}
		}
		aliases = append(aliases, s)
	}

	add(companyName)
	if dl := primaryDomainLabelFromWebsite(website); dl != "" {
		add(dl)
		add(strings.ReplaceAll(dl, "-", " "))
	}

	// Compact version: iGeekTech -> igeektech (helps when snippets omit spacing/casing).
	compact := normalizeCompanyBrand(companyName)
	if len(compact) >= 3 {
		add(compact)
	}

	return aliases
}

func quotedOrList(items []string) string {
	parts := make([]string, 0, len(items))
	for _, it := range items {
		it = strings.TrimSpace(it)
		if it == "" {
			continue
		}
		// If already looks like a token (no spaces), don't force quotes.
		if strings.ContainsAny(it, " \t") {
			parts = append(parts, fmt.Sprintf("\"%s\"", it))
		} else {
			parts = append(parts, fmt.Sprintf("\"%s\"", it))
		}
	}
	if len(parts) == 0 {
		return ""
	}
	if len(parts) == 1 {
		return parts[0]
	}
	return "(" + strings.Join(parts, " OR ") + ")"
}

func linkedInPeopleDiscoveryQueries(company, rolePhrase, slug string) []string {
	company = strings.TrimSpace(company)
	rolePhrase = strings.TrimSpace(rolePhrase)
	slug = strings.TrimSpace(slug)
	if rolePhrase == "" {
		return nil
	}
	if slug != "" {
		return []string{
			fmt.Sprintf(`site:linkedin.com/in/ "%s" "%s"`, company, rolePhrase),
			fmt.Sprintf(`site:linkedin.com/in/ "%s" linkedin.com/company/%s`, rolePhrase, slug),
			fmt.Sprintf(`"%s" "%s" site:linkedin.com/in/`, company, rolePhrase),
			fmt.Sprintf(`site:linkedin.com/in/ %s %s`, company, rolePhrase),
			fmt.Sprintf(`"%s" "%s" linkedin profile`, company, rolePhrase),
			fmt.Sprintf(`site:linkedin.com/in/ intitle:"%s" intitle:"%s"`, company, rolePhrase),
			fmt.Sprintf(`site:linkedin.com/in/ "at %s" "%s"`, company, rolePhrase),
			fmt.Sprintf(`site:linkedin.com/in/ "%s" %s`, rolePhrase, company),
		}
	}
	return []string{
		fmt.Sprintf(`site:linkedin.com/in/ "%s" "%s"`, company, rolePhrase),
		fmt.Sprintf(`site:linkedin.com/in/ %s %s`, company, rolePhrase),
		fmt.Sprintf(`"%s" "%s" linkedin profile`, company, rolePhrase),
		fmt.Sprintf(`site:linkedin.com/in/ intitle:"%s" intitle:"%s"`, company, rolePhrase),
		fmt.Sprintf(`site:linkedin.com/in/ "at %s" "%s"`, company, rolePhrase),
		fmt.Sprintf(`"%s" "%s" site:linkedin.com/in/`, company, rolePhrase),
	}
}

func linkedInPeopleDiscoveryQueriesV2(companyAliases []string, rolePhrase string, location string, slug string) []string {
	rolePhrase = strings.TrimSpace(rolePhrase)
	slug = strings.TrimSpace(slug)

	co := quotedOrList(companyAliases)
	role := quotedOrList([]string{rolePhrase})

	// Location token help: add up to 3 most specific tokens (city/state/country)
	locTokens := locationTokens(location)
	locQuery := ""
	if len(locTokens) > 0 {
		// take first 3 tokens as provided order isn't preserved; but that's okay as OR.
		n := minInt(3, len(locTokens))
		locQuery = quotedOrList(locTokens[:n])
	}

	// Keep query count low: 3–4 strong ones beat 12 noisy ones.
	queries := []string{
		fmt.Sprintf(`site:linkedin.com/in/ %s %s %s`, co, role, locQuery),
		fmt.Sprintf(`site:linkedin.com/in/ intitle:%s intitle:%s %s`, strings.Trim(co, "()"), strings.Trim(role, "()"), locQuery),
		fmt.Sprintf(`%s %s site:linkedin.com/in/ %s`, co, role, locQuery),
	}
	if slug != "" {
		queries = append(queries, fmt.Sprintf(`site:linkedin.com/in/ %s %s linkedin.com/company/%s %s`, co, role, slug, locQuery))
	}

	// Cleanup double spaces
	out := make([]string, 0, len(queries))
	for _, q := range queries {
		q = strings.Join(strings.Fields(q), " ")
		if q != "" {
			out = append(out, q)
		}
	}
	return out
}

// SearchLinkedInProfiles searches LinkedIn profiles (via Serper/Google). When linkedinCompanySlug is set
// (from FindLinkedInCompanyPage), queries are grounded to that org. We mimic “company people” discovery using
// indexed public profile pages (LinkedIn’s /company/.../people UI is not reliably scrapable without auth).
func (gs *GoogleScraper) SearchLinkedInProfiles(company, role, location, linkedinCompanySlug string) ([]map[string]string, error) {
	company = strings.TrimSpace(company)
	role = strings.TrimSpace(role)
	location = strings.TrimSpace(location)
	slug := strings.TrimSpace(linkedinCompanySlug)

	if role != "" {
		aliases := companyAliases(company, "")
		for _, rolePhrase := range roleSearchVariants(role) {
			queries := linkedInPeopleDiscoveryQueriesV2(aliases, rolePhrase, location, slug)
			for _, q := range queries {
				log.Printf("========================================")
				log.Printf("LINKEDIN PEOPLE SEARCH (Serper)")
				log.Printf("COMPANY => %s", company)
				log.Printf("ROLE (canonical) => %s | phrase => %s", role, rolePhrase)
				if location != "" {
					log.Printf("LOCATION => %s", location)
				}
				log.Printf("QUERY => %s", q)
				log.Printf("========================================")

				results, err := gs.searchViaSerper(q, role, company, location, slug)
				if err == nil && len(results) > 0 {
					return results, nil
				}
				time.Sleep(300 * time.Millisecond)
			}
		}
		return []map[string]string{}, nil
	}

	var queries []string
	if slug != "" {
		queries = append(queries,
			fmt.Sprintf(`site:linkedin.com/in/ "%s"`, company),
			fmt.Sprintf(`site:linkedin.com/in/ linkedin.com/company/%s`, slug),
			fmt.Sprintf(`site:linkedin.com/in/ %s`, company),
		)
	} else {
		queries = []string{
			fmt.Sprintf(`site:linkedin.com/in/ "%s"`, company),
			fmt.Sprintf(`site:linkedin.com/in/ %s`, company),
		}
	}

	for _, q := range queries {
		log.Printf("LINKEDIN SEARCH START (no role) QUERY => %s", q)
		results, err := gs.searchViaSerper(q, role, company, location, slug)
		if err == nil && len(results) > 0 {
			return results, nil
		}
		time.Sleep(300 * time.Millisecond)
	}
	return []map[string]string{}, nil
}

// searchViaSerper uses Serper API
func (gs *GoogleScraper) searchViaSerper(query, role, companyForSlugCheck, locationHint, linkedinCompanySlug string) ([]map[string]string, error) {
	linkedinCompanySlug = strings.TrimSpace(linkedinCompanySlug)
	result, err := gs.serperGoogleSearch(query)
	if err != nil {
		return nil, err
	}
	log.Printf("SERPER organic results: %d (query=%q)", len(result.Organic), query)

	var profiles []map[string]string
	seen := make(map[string]bool)

	for _, item := range result.Organic {
		link := item.Link

		if !strings.Contains(link, "linkedin.com/in/") {
			continue
		}

		link = strings.Split(link, "?")[0]

		if !isPlausibleLinkedInUsername(link, companyForSlugCheck) {
			continue
		}

		if !snippetMatchesCompanyGrounding(item.Title, item.Snippet, link, companyForSlugCheck, linkedinCompanySlug) {
			continue
		}

		if locationHint != "" && len(strings.TrimSpace(locationHint)) >= 3 &&
			!snippetReferencesLocation(item.Title, item.Snippet, locationHint) {
			continue
		}

		if seen[link] {
			continue
		}
		seen[link] = true

		name := parseNameFromLinkedInURL(link)
		if name == "" {
			name = extractNameFromSnippet(item.Snippet, item.Title)
		}

		text := item.Title + " " + item.Snippet

		aliases := companyAliases(companyForSlugCheck, "")
		jobTitle := ExtractJobTitleFromSerperTitle(item.Title, aliases)
		if jobTitle == "" {
			// fall back to what the snippet says
			jobTitle = strings.TrimSpace(matchRoleFromText(text, roleSearchVariants(role)))
		}
		if jobTitle == "" {
			jobTitle = extractRoleFromText(text)
		}

		category, ok := CategorizeTitle(jobTitle + " " + text)
		if !ok {
			continue
		}

		profiles = append(profiles, map[string]string{
			"url":      link,
			"name":     name,
			"title":    jobTitle,
			"category": category,
			"context":  item.Snippet,
		})
	}

	log.Printf("✅ SERPER PROFILES FOUND: %d", len(profiles))
	return profiles, nil
}

func normalizeRoleText(s string) string {
	s = strings.ToLower(s)
	// Replace common punctuation with spaces to make matching less brittle.
	repl := strings.NewReplacer(
		".", " ",
		",", " ",
		"|", " ",
		"·", " ",
		"•", " ",
		"—", " ",
		"–", " ",
		"(", " ",
		")", " ",
		"[", " ",
		"]", " ",
		"{", " ",
		"}", " ",
		":", " ",
		";", " ",
		"/", " ",
		"\\", " ",
	)
	s = repl.Replace(s)
	return strings.Join(strings.Fields(s), " ")
}

func matchRoleFromText(text string, variants []string) string {
	hay := " " + normalizeRoleText(text) + " "

	best := ""
	bestLen := -1

	for _, v := range variants {
		v = strings.TrimSpace(v)
		if v == "" {
			continue
		}
		needle := " " + normalizeRoleText(v) + " "
		if strings.Contains(hay, needle) {
			// Pick the most specific (longest) matching variant.
			if len(v) > bestLen {
				best = v
				bestLen = len(v)
			}
			continue
		}

		// Special-case common abbreviations.
		vl := strings.ToLower(v)
		if vl == "vp" || vl == "v p" || vl == "v.p." || vl == "v.p" {
			if strings.Contains(hay, " vp ") || strings.Contains(hay, " vice president ") {
				if len(v) > bestLen {
					best = "Vice President"
					bestLen = len(best)
				}
			}
		}
	}

	// Normalize some variants to the UI-friendly display we want.
	switch strings.ToLower(strings.TrimSpace(best)) {
	case "chief executive officer", "chief executive":
		return "CEO"
	case "chief technology officer", "chief technical officer":
		return "CTO"
	case "chief human resources officer", "chro":
		return "Head of HR"
	case "chief revenue officer", "cro":
		return "Head of Sales"
	}

	return best
}

func junkWebsiteHosts() []string {
	return []string{
		"linkedin.com", "facebook.com", "instagram.com", "twitter.com", "x.com",
		"glassdoor.com", "indeed.com", "crunchbase.com", "bloomberg.com", "reuters.com",
		"wikipedia.org", "youtube.com", "yelp.com", "zoominfo.com", "dnb.com", "owler.com",
		"indiamart.com", "tradeindia.com", "exportersindia.com", "justdial.com",
		"sulekha.com", "yellowpages.com", "yellowpages.ca", "mapquest.com",
		"freelancer.com", "upwork.com", "fiverr.com", "clutch.co", "g2.com",
		"apollo.io", "rocketreach.co",
		"google.com", "google.co.in", "maps.google.com",
		"goo.gl", "bit.ly", "tinyurl.com", "t.co", "lnkd.in", "rb.gy", "cutt.ly",
		"medium.com", "substack.com", "wordpress.com", "blogspot.com",
	}
}

func isJunkWebsiteURL(link string) bool {
	parsed, err := url.Parse(link)
	if err != nil {
		return true
	}
	host := strings.ToLower(parsed.Host)
	for _, j := range junkWebsiteHosts() {
		if strings.Contains(host, j) {
			return true
		}
	}
	return false
}

func isOfficialWebsiteCandidate(link string) bool {
	link = strings.TrimSpace(link)
	if link == "" {
		return false
	}
	parsed, err := url.Parse(link)
	if err != nil {
		return false
	}
	scheme := strings.ToLower(strings.TrimSpace(parsed.Scheme))
	if scheme != "http" && scheme != "https" {
		return false
	}
	host := strings.TrimSpace(parsed.Hostname())
	if host == "" || !strings.Contains(host, ".") {
		return false
	}
	if isJunkWebsiteURL(link) {
		return false
	}
	path := strings.ToLower(strings.Trim(parsed.EscapedPath(), "/"))
	if path == "" {
		return true
	}
	// Allow common homepage aliases and language roots.
	if path == "home" || path == "index" || path == "en" || path == "en-us" {
		return true
	}
	// Exclude directory/listing/news/social pages even if host is otherwise valid.
	blockedPathTokens := []string{
		"linkedin", "crunchbase", "about-us-directory", "directory", "listing",
		"news", "press", "article", "blog", "jobs", "careers", "events", "wiki",
	}
	for _, tok := range blockedPathTokens {
		if strings.Contains(path, tok) {
			return false
		}
	}
	return true
}

func stripURLTrackingParams(link string) string {
	parsed, err := url.Parse(link)
	if err != nil {
		return link
	}
	parsed.RawQuery = ""
	parsed.Fragment = ""
	return parsed.String()
}

// normalizeCompanyHomepageURL returns scheme + host + trailing slash.
// This ensures we store official company URL, not deep listing/profile pages.
func normalizeCompanyHomepageURL(link string) string {
	parsed, err := url.Parse(strings.TrimSpace(link))
	if err != nil || parsed.Hostname() == "" {
		return strings.TrimSpace(link)
	}
	scheme := parsed.Scheme
	if scheme == "" {
		scheme = "https"
	}
	host := strings.ToLower(parsed.Hostname())
	return scheme + "://" + host + "/"
}

// GuessWebsiteFromCompany returns https://{slug}.com from a company name (best-effort when Serper fails).
func (gs *GoogleScraper) GuessWebsiteFromCompany(company string) string {
	return gs.fallbackWebsite(company)
}

// FindOfficialWebsite uses Serper (Google) to resolve the corporate site from the company name.
// location is optional context (city/state/country) to disambiguate common names.
func (gs *GoogleScraper) FindOfficialWebsite(companyName, location string) (string, error) {
	companyName = strings.TrimSpace(companyName)
	location = strings.TrimSpace(location)
	if companyName == "" {
		return "", nil
	}

	if strings.TrimSpace(gs.serperKey) == "" {
		log.Printf("⚠️ SERPER_API_KEY missing; guessing website from company string")
		return gs.fallbackWebsite(companyName), nil
	}

	queries := []string{}
	if location != "" {
		queries = append(queries, fmt.Sprintf(`"%s" "%s" official site`, companyName, location))
	}
	queries = append(queries,
		fmt.Sprintf(`"%s" official website`, companyName),
		fmt.Sprintf(`%s official website`, companyName),
		fmt.Sprintf(`%s homepage`, companyName),
		fmt.Sprintf(`%s corporate website`, companyName),
	)
	if parts := strings.Fields(companyName); len(parts) >= 2 {
		queries = append(queries, fmt.Sprintf(`%s company website`, parts[0]))
	}

	guess := gs.fallbackWebsite(companyName)
	guessLabel := ""
	if u, err := url.Parse(guess); err == nil && u.Hostname() != "" {
		guessLabel = strings.TrimPrefix(strings.ToLower(u.Hostname()), "www.")
		if guessLabel != "" {
			queries = append(queries, fmt.Sprintf(`site:%s %s`, guessLabel, companyName))
		}
	}

	for _, query := range queries {
		result, err := gs.serperGoogleSearch(query)
		if err != nil {
			log.Printf("⚠️ Serper website search error: %v", err)
			time.Sleep(200 * time.Millisecond)
			continue
		}
		// Pick the first clean official-site candidate from the top search results.
		for _, item := range result.Organic {
			link := stripURLTrackingParams(item.Link)
			if !isOfficialWebsiteCandidate(link) {
				continue
			}
			s := scoreOrganicWebsiteCandidate(companyName, location, item)
			if s < 0 {
				continue
			}
			// Keep light relevance guard to avoid similarly named companies.
			if s < 1 {
				continue
			}
			if guessLabel != "" {
				if host := hostFromURL(link); host != "" &&
					(strings.EqualFold(host, guessLabel) || strings.HasSuffix(strings.ToLower(host), "."+guessLabel)) {
					s += 1
				}
			}
			finalURL := normalizeCompanyHomepageURL(link)
			log.Printf("✓ Selected corporate website from Serper top result (score=%d): %s", s, finalURL)
			return finalURL, nil
		}
		time.Sleep(200 * time.Millisecond)
	}

	log.Printf("⚠️ No strong Serper website match for %q; using fallback", companyName)
	if guess != "" {
		return normalizeCompanyHomepageURL(guess), nil
	}
	return "", nil
}

func hostFromURL(link string) string {
	parsed, err := url.Parse(link)
	if err != nil {
		return ""
	}
	return strings.TrimPrefix(strings.ToLower(parsed.Hostname()), "www.")
}

func (gs *GoogleScraper) confirmWebsiteWithSerper(companyName, location, website string) bool {
	host := hostFromURL(website)
	if host == "" {
		return false
	}
	q := fmt.Sprintf(`site:%s "%s"`, host, companyName)
	if location != "" {
		q = fmt.Sprintf(`site:%s "%s" %s`, host, companyName, location)
	}
	result, err := gs.serperGoogleSearch(q)
	if err != nil {
		return false
	}
	for _, item := range result.Organic {
		if strings.Contains(strings.ToLower(item.Link), host) &&
			scoreOrganicWebsiteCandidate(companyName, location, item) >= 0 {
			return true
		}
	}
	return len(result.Organic) > 0
}

// FindLinkedInCompanyPage discovers linkedin.com/company/{slug}/ via Serper, using company name plus the
// resolved corporate website (domain label) to pick the best-matching org page.
func (gs *GoogleScraper) FindLinkedInCompanyPage(companyName, website string) (string, error) {
	companyName = strings.TrimSpace(companyName)
	if companyName == "" {
		return "", nil
	}
	if strings.TrimSpace(gs.serperKey) == "" {
		log.Printf("⚠️ SERPER_API_KEY missing; skipping LinkedIn company page lookup")
		return "", nil
	}

	domainLabel := primaryDomainLabelFromWebsite(website)
	queries := []string{
		fmt.Sprintf(`site:linkedin.com/company "%s"`, companyName),
		fmt.Sprintf(`"%s" site:linkedin.com/company`, companyName),
		fmt.Sprintf(`"%s" linkedin company page`, companyName),
	}
	if domainLabel != "" {
		queries = append(queries,
			fmt.Sprintf(`site:linkedin.com/company %s`, domainLabel),
			fmt.Sprintf(`site:linkedin.com/company "%s" %s`, companyName, domainLabel),
			fmt.Sprintf(`linkedin.com/company %s %s`, domainLabel, companyName),
		)
	}

	bestURL := ""
	bestScore := -1

	for _, query := range queries {
		result, err := gs.serperGoogleSearch(query)
		if err != nil {
			log.Printf("⚠️ Serper LinkedIn company search error: %v", err)
			time.Sleep(200 * time.Millisecond)
			continue
		}
		for _, item := range result.Organic {
			s := scoreLinkedInCompanyCandidate(companyName, domainLabel, item)
			if s < 0 {
				continue
			}
			norm := normalizeLinkedInCompanyPageURL(item.Link)
			if norm == "" {
				continue
			}
			if s > bestScore || (s == bestScore && bestURL == "") {
				bestScore = s
				bestURL = norm
			}
		}
		time.Sleep(200 * time.Millisecond)
	}

	if bestURL != "" && bestScore >= 4 {
		log.Printf("✓ LinkedIn company page (score=%d): %s", bestScore, bestURL)
		return bestURL, nil
	}
	if bestURL != "" && bestScore >= 2 {
		log.Printf("✓ LinkedIn company page (lower confidence score=%d): %s", bestScore, bestURL)
		return bestURL, nil
	}
	log.Printf("⚠️ No LinkedIn company page found via Serper for %q", companyName)
	return "", nil
}

// LinkedInCompanySlugFromURL returns the slug from a linkedin.com/company/{slug} URL.
func LinkedInCompanySlugFromURL(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	parsed, err := url.Parse(raw)
	if err != nil {
		return ""
	}
	parts := strings.Split(strings.Trim(parsed.Path, "/"), "/")
	if len(parts) >= 2 && strings.EqualFold(parts[0], "company") && parts[1] != "" && !strings.EqualFold(parts[1], "about") {
		return parts[1]
	}
	return ""
}

func primaryDomainLabelFromWebsite(webURL string) string {
	parsed, err := url.Parse(webURL)
	if err != nil {
		return ""
	}
	host := strings.TrimPrefix(strings.ToLower(parsed.Hostname()), "www.")
	if idx := strings.Index(host, "."); idx > 0 {
		return host[:idx]
	}
	return host
}

func normalizeLinkedInCompanyPageURL(raw string) string {
	parsed, err := url.Parse(raw)
	if err != nil {
		return ""
	}
	host := strings.ToLower(strings.TrimPrefix(parsed.Hostname(), "www."))
	if host != "linkedin.com" && !strings.HasSuffix(host, ".linkedin.com") {
		return ""
	}
	parts := strings.Split(strings.Trim(parsed.Path, "/"), "/")
	if len(parts) >= 2 && strings.EqualFold(parts[0], "company") {
		slug := parts[1]
		if slug == "" || strings.EqualFold(slug, "about") {
			return ""
		}
		return "https://www.linkedin.com/company/" + slug + "/"
	}
	return ""
}

// SearchCompanyLeadership searches leadership profiles
func (gs *GoogleScraper) SearchCompanyLeadership(company, location, linkedinCompanySlug string) ([]map[string]string, error) {
	query := fmt.Sprintf(`site:linkedin.com/in/ "%s" (CEO OR CTO OR Founder OR "Head of Sales" OR "Vice President" OR "VP" OR CHRO OR "Head of HR")`, company)
	return gs.searchViaSerper(query, "", strings.TrimSpace(company), strings.TrimSpace(location), strings.TrimSpace(linkedinCompanySlug))
}

// fallbackWebsite creates basic domain fallback
func (gs *GoogleScraper) fallbackWebsite(company string) string {
	cleaned := strings.ToLower(company)
	cleaned = regexp.MustCompile(`[^a-z0-9]`).ReplaceAllString(cleaned, "")
	if cleaned == "" {
		return ""
	}
	return fmt.Sprintf("https://%s.com", cleaned)
}

// FetchHTML fetches HTML content
func (gs *GoogleScraper) FetchHTML(urlStr string) (string, error) {
	req, err := http.NewRequest("GET", urlStr, nil)
	if err != nil {
		return "", err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")

	resp, err := gs.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 5*1024*1024))
	if err != nil {
		return "", err
	}

	return string(body), nil
}

// --- HELPERS ---

func parseNameFromLinkedInURL(profileURL string) string {
	parts := strings.Split(profileURL, "/in/")
	if len(parts) < 2 {
		return ""
	}

	username := parts[1]
	username = strings.Split(username, "?")[0]
	username = strings.Split(username, "/")[0]
	username = strings.TrimSpace(username)

	name := strings.ReplaceAll(username, "-", " ")
	reg := regexp.MustCompile(`[0-9]+`)
	name = reg.ReplaceAllString(name, "")
	name = strings.Join(strings.Fields(name), " ")

	if name == "" {
		return ""
	}

	nameNoise := []string{"india", "official", "career", "jobs", "team", "company", "corp", "ltd", "inc", "llc", "pvt"}
	nameLower := strings.ToLower(name)
	for _, w := range nameNoise {
		if strings.Contains(nameLower, w) {
			return ""
		}
	}

	words := strings.Fields(name)
	for i, w := range words {
		if len(w) > 0 {
			words[i] = strings.ToUpper(string(w[0])) + strings.ToLower(w[1:])
		}
	}

	return strings.Join(words, " ")
}

var brandSlugNormalizer = regexp.MustCompile(`[^a-z0-9]+`)

func snippetReferencesCompany(title, snippet, company string) bool {
	company = strings.TrimSpace(company)
	if company == "" {
		return true
	}
	brand := normalizeCompanyBrand(company)
	if len(brand) < 3 {
		return true
	}
	hay := strings.ToLower(title + " " + snippet)
	if strings.Contains(hay, strings.ToLower(company)) {
		return true
	}
	return strings.Contains(strings.ReplaceAll(hay, " ", ""), brand)
}

func snippetReferencesLinkedInCompanySlug(title, snippet, profileLink, slug string) bool {
	slug = strings.ToLower(strings.TrimSpace(slug))
	if slug == "" {
		return false
	}
	hay := strings.ToLower(title + " " + snippet + " " + profileLink)
	if strings.Contains(hay, slug) {
		return true
	}
	compactHay := strings.ReplaceAll(strings.ReplaceAll(hay, "-", ""), " ", "")
	compactSlug := strings.ReplaceAll(slug, "-", "")
	return strings.Contains(compactHay, compactSlug)
}

func snippetMatchesCompanyGrounding(title, snippet, profileLink, company, linkedinCompanySlug string) bool {
	slug := strings.TrimSpace(linkedinCompanySlug)
	co := strings.TrimSpace(company)

	if slug != "" && co != "" {
		return snippetReferencesCompany(title, snippet, co) || snippetReferencesLinkedInCompanySlug(title, snippet, profileLink, slug)
	}
	if slug != "" {
		return snippetReferencesLinkedInCompanySlug(title, snippet, profileLink, slug)
	}
	if co != "" {
		return snippetReferencesCompany(title, snippet, co)
	}
	return true
}

func snippetReferencesLocation(title, snippet, location string) bool {
	location = strings.TrimSpace(location)
	if location == "" {
		return true
	}
	hay := strings.ToLower(title + " " + snippet)
	locLower := strings.ToLower(location)
	if strings.Contains(hay, locLower) {
		return true
	}
	if idx := strings.Index(locLower, ","); idx > 0 {
		city := strings.TrimSpace(locLower[:idx])
		if len(city) >= 3 && strings.Contains(hay, city) {
			return true
		}
	}
	return false
}

func normalizeCompanyBrand(s string) string {
	s = strings.TrimSpace(strings.ToLower(s))
	return brandSlugNormalizer.ReplaceAllString(s, "")
}

// linkedInSlugAppendsCompanyBrand detects SEO-style slugs like first-last-companyname (often fake).
func linkedInSlugAppendsCompanyBrand(username, company string) bool {
	brand := normalizeCompanyBrand(company)
	if len(brand) < 4 {
		return false
	}
	segs := strings.Split(strings.ToLower(username), "-")
	if len(segs) < 3 {
		return false
	}
	last := segs[len(segs)-1]
	if len(last) < 4 {
		return false
	}
	if last == brand {
		return true
	}
	if strings.HasSuffix(brand, last) {
		return true
	}
	if strings.HasSuffix(last, brand) {
		return true
	}
	return false
}

// IsPlausibleLinkedInProfileURL reports whether a /in/ slug looks like a real profile (not vanity SEO spam).
func IsPlausibleLinkedInProfileURL(profileURL, company string) bool {
	return isPlausibleLinkedInUsername(profileURL, company)
}

func isPlausibleLinkedInUsername(profileURL, company string) bool {
	parts := strings.Split(profileURL, "/in/")
	if len(parts) < 2 {
		return false
	}
	username := strings.Split(strings.Split(parts[1], "?")[0], "/")[0]
	if len(username) < 3 || len(username) > 50 {
		return false
	}
	if company != "" && linkedInSlugAppendsCompanyBrand(username, company) {
		return false
	}
	noiseWords := []string{"ceo", "cto", "founder", "director", "manager", "company",
		"official", "india", "head", "corp", "ltd", "careers", "jobs", "team", "hr", "sales"}
	lower := strings.ToLower(username)
	for _, w := range noiseWords {
		if strings.Contains(lower, w) {
			return false
		}
	}
	return true
}

func extractNameFromSnippet(snippet, title string) string {
	text := snippet + " " + title
	re := regexp.MustCompile(`([A-Z][a-z]+ [A-Z][a-z]+)`)
	matches := re.FindAllString(text, -1)

	noiseWords := []string{"LinkedIn", "Google", "Search", "Profile", "View", "Connect"}

	for _, m := range matches {
		noise := false
		for _, n := range noiseWords {
			if strings.Contains(m, n) {
				noise = true
				break
			}
		}
		if !noise && len(m) > 4 {
			return m
		}
	}

	return ""
}

func extractRoleFromText(text string) string {
	roles := []string{
		"Chief Executive Officer", "Chief Technology Officer", "Chief Human Resources Officer",
		"Chief Revenue Officer", "Vice President", "Co-Founder",
		"CEO", "CTO", "CFO", "COO", "Founder", "CHRO", "CRO",
		"Head of Sales", "Head of HR", "Head of Human Resources",
		"VP Sales", "VP Human Resources", "VP HR", "VP",
		"HR", "Head of Engineering", "VP Engineering", "Engineering Manager",
		"Managing Director", "MD", "Director", "Partner", "Principal",
		"Head of Product", "Head of Marketing",
	}

	lower := strings.ToLower(text)
	for _, role := range roles {
		if strings.Contains(lower, strings.ToLower(role)) {
			return role
		}
	}

	return "Executive"
}

func extractContextAroundText(html, target string) string {
	index := strings.Index(html, target)
	if index == -1 {
		return ""
	}

	start := index - 200
	if start < 0 {
		start = 0
	}

	end := index + 200
	if end > len(html) {
		end = len(html)
	}

	return html[start:end]
}

func isValidCompanyDomain(link string) bool {
	if link == "" {
		return false
	}

	parsed, err := url.Parse(link)
	if err != nil {
		return false
	}

	host := strings.ToLower(parsed.Host)

	if strings.Contains(host, "linkedin.com") ||
		strings.Contains(host, "facebook.com") ||
		strings.Contains(host, "instagram.com") ||
		strings.Contains(host, "twitter.com") ||
		strings.Contains(host, "x.com") {
		return false
	}

	return true
}
