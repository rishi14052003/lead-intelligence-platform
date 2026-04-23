package utils

import "strings"

func ExtractCompanyName(domain string) string {
	parts := strings.Split(domain, ".")
	if len(parts) > 0 {
		name := parts[0]
		return strings.ToUpper(string(name[0])) + name[1:]
	}
	return domain
}

func NormalizeName(name string) string {
	name = strings.ToLower(name)
	name = strings.ReplaceAll(name, " ", "-")
	return name
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