package middleware

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"lead-finder/internal/utils"
)

// AuthMiddleware is a middleware for JWT authentication
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"message": "Missing authorization header"})
			return
		}

		// Extract token from "Bearer <token>"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"message": "Invalid authorization header format"})
			return
		}

		token := parts[1]

		// Verify JWT token
		claims, err := utils.VerifyJWT(token)
		if err != nil {
			log.Printf("JWT verification failed: %v", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"message": "Invalid token"})
			return
		}

		// Extract user information from claims
		userID, ok := claims["userId"].(string)
		if !ok {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"message": "Invalid token claims"})
			return
		}

		// Add user information to context
		ctx := context.WithValue(r.Context(), "userID", userID)
		if email, ok := claims["email"].(string); ok {
			ctx = context.WithValue(ctx, "email", email)
		}
		if firstName, ok := claims["firstName"].(string); ok {
			ctx = context.WithValue(ctx, "firstName", firstName)
		}

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// Auth is a middleware for authentication (optional)
func Auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// For now, this is a placeholder
		// In production, you would validate tokens here
		log.Printf("Auth middleware called for %s", r.RequestURI)
		next.ServeHTTP(w, r)
	})
}
