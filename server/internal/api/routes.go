package api

import "github.com/go-chi/chi/v5"

func Routes() *chi.Mux {
	r := chi.NewRouter()

	r.Post("/search", SearchHandler)

	return r
}