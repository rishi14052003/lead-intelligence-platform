package scraper

import (
	"strings"
	"testing"
)

func TestSnippetReferencesLocation_TokenMatch(t *testing.T) {
	title := "Rishabh Patel - CEO - iGeek Technologies"
	snippet := "Chief Executive Officer at iGeek · Surat Area, India"
	location := "Surat Gujarat India"

	if !snippetReferencesLocation(title, snippet, location) {
		t.Fatal("expected location match via token surat or india")
	}
}

func TestSnippetReferencesLocation_FullStringNotRequired(t *testing.T) {
	title := "Jane Doe - Founder"
	snippet := "Building products in Gujarat, India"
	location := "Surat Gujarat India"

	if !snippetReferencesLocation(title, snippet, location) {
		t.Fatal("expected match on gujarat or india token")
	}
}

func TestIsPlausibleLinkedInUsername_AllowsNamesWithHRSubstring(t *testing.T) {
	url := "https://www.linkedin.com/in/shreyas-patel"
	if !isPlausibleLinkedInUsername(url, "iGeek") {
		t.Fatal("shreyas should not be rejected because slug contains hr substring")
	}
}

func TestIsPlausibleLinkedInUsername_RejectsNoiseSegment(t *testing.T) {
	url := "https://www.linkedin.com/in/acme-ceo-official"
	if isPlausibleLinkedInUsername(url, "Acme") {
		t.Fatal("expected rejection when slug segment is ceo")
	}
}

func TestIsJunkWebsiteURL_DoesNotFalsePositiveOnCompanyDomain(t *testing.T) {
	if isJunkWebsiteURL("https://dignizant.com/about") {
		t.Fatal("dignizant.com must not be treated as junk (t.co substring bug)")
	}
	if !isJunkWebsiteURL("https://techbehemoths.com/companies/surat") {
		t.Fatal("directory hosts should still be junk")
	}
}

func TestOrganicResultMatchesCompany_Domain(t *testing.T) {
	item := SerperOrganicItem{
		Title:   "Dignizant - Software Development",
		Link:    "https://www.dignizant.com/",
		Snippet: "IT services in Surat",
	}
	if !organicResultMatchesCompany("Dignizant", item) {
		t.Fatal("expected domain match for dignizant.com")
	}
}

func TestBestOrganicCompanyWebsite_RejectsDirectoryListing(t *testing.T) {
	result := SerperResponse{
		Organic: []SerperOrganicItem{
			{
				Title:   "Top IT companies in Surat",
				Link:    "https://techbehemoths.com/companies/surat",
				Snippet: "Directory of software firms in Gujarat",
			},
			{
				Title:   "Dignizant Technologies LLP",
				Link:    "https://dignizant.com/about",
				Snippet: "Dignizant software company Surat Gujarat India",
			},
		},
	}
	picked, score := bestOrganicCompanyWebsite("Dignizant", "Surat Gujarat India", result, 4)
	if picked == "" || !strings.Contains(picked, "dignizant.com") {
		t.Fatalf("expected dignizant.com, got %q (score=%d)", picked, score)
	}
}

func TestSerperQueryAlreadyScopedToCompany(t *testing.T) {
	q := `site:linkedin.com/in/ "iGeek" "CEO" ("surat" OR "gujarat" OR "india")`
	if !serperQueryAlreadyScopedToCompany(q, "iGeek", "infoigeek") {
		t.Fatal("expected company-scoped query to be recognized")
	}
}
