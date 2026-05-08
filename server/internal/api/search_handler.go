package api

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"lead-finder/internal/database"
	"lead-finder/internal/services"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type SearchRequest struct {
	Query    string `json:"query"`
	Location string `json:"location,omitempty"`
}

type SearchResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
}

// SearchHandler handles the search endpoint
func SearchHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	// Get userID from context
	userID, ok := r.Context().Value("userID").(string)
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"message": "Unauthorized"})
		return
	}

	userObjectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"message": "Invalid user ID"})
		return
	}

	var req SearchRequest
	err = json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(SearchResponse{
			Success: false,
			Message: "Invalid request body",
		})
		return
	}

	if req.Query == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(SearchResponse{
			Success: false,
			Message: "Query is required",
		})
		return
	}

	log.Printf("Search request from user %s: %s (Location: %s)", userID, req.Query, req.Location)

	// Get database and create lead service
	db := database.Get()
	leadService := services.NewLeadService(db)

	// Perform search and enrichment with location
	leads, err := leadService.SearchAndEnrichLeads(req.Query, req.Location, userObjectID)
	if err != nil {
		log.Printf("Search error: %v", err)

		// Check if it's a validation error (should return 400 instead of 500)
		if _, ok := err.(*services.ValidationError); ok {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(SearchResponse{
				Success: false,
				Message: err.Error(),
			})
			return
		}

		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(SearchResponse{
			Success: false,
			Message: "Search failed: " + err.Error(),
		})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(SearchResponse{
		Success: true,
		Message: "Search completed successfully",
		Data:    leads,
	})
}

// GetHistoryHandler returns the search history for the authenticated user
func GetHistoryHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	userID, ok := r.Context().Value("userID").(string)
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"message": "Unauthorized"})
		return
	}

	userObjectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"message": "Invalid user ID"})
		return
	}

	db := database.Get()
	leadService := services.NewLeadService(db)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	history, err := leadService.GetSearchHistory(ctx, userObjectID)
	if err != nil {
		log.Printf("History fetch error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(SearchResponse{
			Success: false,
			Message: "Failed to fetch history",
		})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(SearchResponse{
		Success: true,
		Message: "History fetched successfully",
		Data:    history,
	})
}
