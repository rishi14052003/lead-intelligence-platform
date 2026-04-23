package api

import (
	"encoding/json"
	"log"
	"net/http"

	"lead-finder/internal/database"
	"lead-finder/internal/services"
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

	var req SearchRequest
	err := json.NewDecoder(r.Body).Decode(&req)
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

	log.Printf("Search request: %s", req.Query)

	// Get database and create lead service
	db := database.Get()
	leadService := services.NewLeadService(db)

	// Perform search and enrichment
	leads, err := leadService.SearchAndEnrichLeads(req.Query)
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

import (
	"encoding/json"
	"net/http"

	"lead-finder/internal/models"
	"lead-finder/internal/services"
)

func SearchHandler(w http.ResponseWriter, r *http.Request) {
	var req models.Search

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	leads := services.GetLeads(req.Query)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(leads)
}