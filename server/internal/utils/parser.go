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