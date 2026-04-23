package main

import (
	"log"
	"net/http"

	"lead-finder/internal/api"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
)

func main() {
	r := chi.NewRouter()

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST"},
		AllowedHeaders: []string{"*"},
	}))

	r.Mount("/", api.Routes())

	log.Println("Server running on :8080")
	http.ListenAndServe(":8080", r)
}