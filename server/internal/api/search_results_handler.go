package api

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"lead-finder/internal/database"
	"lead-finder/internal/models"

	"github.com/go-chi/chi/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// SaveSearchResultsHandler saves search results to database
func SaveSearchResultsHandler(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Context().Value("userID").(string)
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	var req struct {
		Query    string        `json:"query"`
		Leads    []models.Lead `json:"leads"`
		Location string        `json:"location,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Get MongoDB collection
	db := database.Get()
	collection := db.Instance.Collection("searches")

	// Create search document
	search := models.Search{
		ID:           primitive.NewObjectID(),
		UserID:       userID,
		Query:        req.Query,
		Location:     req.Location,
		Domain:       extractDomain(req.Query),
		ResultsCount: len(req.Leads),
		Leads:        req.Leads,
		Status:       "completed",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	// Insert search results
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err = collection.InsertOne(ctx, search)
	if err != nil {
		http.Error(w, "Failed to save search results", http.StatusInternalServerError)
		return
	}

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"message":  "Search results saved successfully",
		"searchId": search.ID,
	})
}

// GetSearchResultsHandler retrieves search results by query
func GetSearchResultsHandler(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Context().Value("userID").(string)
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}
	query := chi.URLParam(r, "query")

	// Get MongoDB collection
	db := database.Get()
	collection := db.Instance.Collection("searches")

	// Find search results for this user and query
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var search models.Search
	err = collection.FindOne(ctx, bson.M{
		"userId": userID,
		"query":  query,
	}).Decode(&search)

	if err == mongo.ErrNoDocuments {
		http.Error(w, "No search results found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "Failed to retrieve search results", http.StatusInternalServerError)
		return
	}

	// Return search results
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"search":  search,
	})
}

// GetCompanySearchResultsHandler retrieves all search results for a company
func GetCompanySearchResultsHandler(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Context().Value("userID").(string)
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}
	company := chi.URLParam(r, "company")

	// Get MongoDB collection
	db := database.Get()
	collection := db.Instance.Collection("searches")

	// Find all search results for this user and company
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var cursor *mongo.Cursor
	cursor, err = collection.Find(ctx, bson.M{
		"userId": userID,
		"domain": strings.ToLower(company),
	})

	if err != nil {
		http.Error(w, "Failed to retrieve search results", http.StatusInternalServerError)
		return
	}
	defer cursor.Close(ctx)

	var searches []models.Search
	if err = cursor.All(ctx, &searches); err != nil {
		http.Error(w, "Failed to decode search results", http.StatusInternalServerError)
		return
	}

	// Aggregate all leads from all searches for this company
	var allLeads []models.Lead
	for _, search := range searches {
		allLeads = append(allLeads, search.Leads...)
	}

	// Return aggregated results
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":     true,
		"company":     company,
		"totalLeads":  len(allLeads),
		"leads":       allLeads,
		"searchCount": len(searches),
	})
}

// extractDomain extracts domain from query (simple implementation)
func extractDomain(query string) string {
	// Remove common words and extract the main company name
	parts := strings.Fields(strings.ToLower(query))
	if len(parts) > 0 {
		// Take the first part as domain (simple approach)
		return strings.TrimSpace(parts[0])
	}
	return query
}
