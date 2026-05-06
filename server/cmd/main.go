package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"

	"lead-finder/configs"	
	"lead-finder/internal/api"
	"lead-finder/internal/database"
)

// Global Apollo API key - set from config
var globalApolloAPIKey string

// GetGlobalApolloAPIKey returns the configured Apollo API key
func GetGlobalApolloAPIKey() string {
	return globalApolloAPIKey
}

func main() {
	// Load configuration
	cfg := configs.LoadConfig()
	log.Printf("Starting server in %s mode", cfg.Environment)
	log.Printf("Client URL: %s", cfg.ClientURL)

	// Set global Apollo API key
	globalApolloAPIKey = cfg.ApolloAPIKey
	api.SetApolloAPIKey(cfg.ApolloAPIKey)

	if globalApolloAPIKey != "" {
		log.Println("✓ Apollo.io API key configured")
	} else {
		log.Println("⚠️ Apollo API key not set - set APOLLO_API_KEY environment variable to enable")
	}

	// Initialize database
	db, err := database.Init(cfg.MongoURI, cfg.DBName)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Setup router
	r := chi.NewRouter()

	// CORS middleware
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{cfg.ClientURL, "http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Mount API routes
	r.Mount("/", api.Routes())

	// Server configuration
	server := &http.Server{
		Addr:         ":" + cfg.ServerPort,
		Handler:      r,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 120 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("✓ Server running on http://localhost:%s", cfg.ServerPort)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt)
	<-sigChan

	log.Println("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server shutdown error: %v", err)
	}

	log.Println("✓ Server stopped")
}
