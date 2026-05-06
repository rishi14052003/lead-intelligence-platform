package api

import (
	"encoding/json"
	"log"
	"net/http"

	"lead-finder/internal/database"
	"lead-finder/internal/services"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type SearchRequest struct {
	Query string `json:"query"`
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

	log.Printf("Search request from user %s: %s", userID, req.Query)

	// Get database and create lead service
	db := database.Get()
	leadService := services.NewLeadService(db)

	// Initialize Apollo service with API key if available
	apolloAPIKey := GetApolloAPIKey()
	if apolloAPIKey != "" {
		apolloService := services.NewApolloService(apolloAPIKey)
		leadService.SetApolloService(apolloService)
	}

	// Perform search and enrichment
	leads, err := leadService.SearchAndEnrichLeads(req.Query, userObjectID)
	if err != nil {
		log.Printf("Search error: %v", err)
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
