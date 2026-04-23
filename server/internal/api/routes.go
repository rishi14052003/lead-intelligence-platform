package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"lead-finder/internal/middleware"
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

	// Search endpoint
	r.Post("/search", SearchHandler)

	// Leads endpoints
	r.Get("/leads", GetLeadsHandler)
	r.Delete("/leads", DeleteLeadHandler)

	// Export endpoint
	r.Get("/export", ExportHandler)

	return r
}

import "github.com/go-chi/chi/v5"

func Routes() *chi.Mux {
	r := chi.NewRouter()

	r.Post("/search", SearchHandler)

	return r
}