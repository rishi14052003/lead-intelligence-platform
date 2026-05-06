package api

import (
	"net/http"

	"lead-finder/internal/middleware"

	"github.com/go-chi/chi/v5"
)

// Routes returns the router with all API routes
func Routes() *chi.Mux {
	r := chi.NewRouter()

	// Apply middleware
	r.Use(middleware.Logger)

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(200)
		w.Write([]byte(`{"status": "ok"}`))
	})

	// Auth endpoints (public)
	r.Post("/auth/signup", SignupHandler)
	r.Post("/auth/login", LoginHandler)
	r.Post("/auth/logout", LogoutHandler)

	// Protected routes
	r.Group(func(r chi.Router) {
		r.Use(middleware.AuthMiddleware)

		// User endpoint
		r.Get("/auth/user", GetUserHandler)

		// Search endpoint
		r.Post("/search", SearchHandler)

		// Leads endpoints
		r.Get("/leads", GetLeadsHandler)
		r.Delete("/leads", DeleteLeadHandler)
		r.Post("/leads/save", SaveLeadsHandler)

		// Export endpoint
		r.Get("/export", ExportHandler)
	})

	return r
}
