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
	Page     int    `json:"page,omitempty"` // CHANGE #10: Added for pagination
}

type SearchResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
	// CHANGE #10: Added pagination fields
	Total   int  `json:"total,omitempty"`
	Page    int  `json:"page,omitempty"`
	HasMore bool `json:"hasMore,omitempty"`
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

	// CHANGE #10: Implement pagination - default page 1 with 20 leads per page
	pageSize := 20
	page := req.Page
	if page < 1 {
		page = 1
	}

	totalLeads := len(leads)
	startIdx := (page - 1) * pageSize
	endIdx := startIdx + pageSize

	var paginatedLeads interface{} = leads

	// Only paginate if there are leads to paginate
	if totalLeads > 0 {
		if startIdx >= totalLeads {
			// Return empty array if page is out of range
			paginatedLeads = []interface{}{}
		} else {
			if endIdx > totalLeads {
				endIdx = totalLeads
			}
			paginatedLeads = leads[startIdx:endIdx]
		}
	}

	hasMore := endIdx < totalLeads

	log.Printf("✅ Pagination: total=%d, page=%d, pageSize=%d, hasMore=%v", totalLeads, page, pageSize, hasMore)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(SearchResponse{
		Success: true,
		Message: "Search completed successfully",
		Data:    paginatedLeads,
		Total:   totalLeads,
		Page:    page,
		HasMore: hasMore,
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
