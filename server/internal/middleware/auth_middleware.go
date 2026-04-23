package middleware

import (
	"log"
	"net/http"
)

// Auth is a middleware for authentication (optional)
func Auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// For now, this is a placeholder
		// In production, you would validate tokens here
		log.Printf("Auth middleware called for %s", r.RequestURI)
		next.ServeHTTP(w, r)
	})
}
