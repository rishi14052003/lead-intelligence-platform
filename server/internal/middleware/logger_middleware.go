package middleware

import (
	"log"
	"net/http"
	"time"
)

// Logger is a middleware that logs all requests
func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		log.Printf("[%s] %s %s", r.Method, r.RequestURI, r.RemoteAddr)

		// Call next handler
		next.ServeHTTP(w, r)

		duration := time.Since(start)
		log.Printf("Completed in %v", duration)
	})
}
