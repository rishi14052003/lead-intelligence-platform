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

// SearchRequest is the body expected on POST /search
type SearchRequest struct {
	Query    string `json:"query"`
	Location string `json:"location,omitempty"`
	Page     int    `json:"page,omitempty"`
}

// LeadResponse is the per-lead shape returned to the frontend.
// Field names must match the frontend's Lead interface to ensure consistency
// with the /leads endpoint which returns models.Lead directly.
type LeadResponse struct {
	ID              string `json:"id"`
	Name            string `json:"name"`
	Role            string `json:"role"`                // job title / displayed title
	MatchedCategory string `json:"matchedCategory"`     // FOUNDERS & OWNERSHIP, etc.
	LinkedIn        string `json:"linkedin"`            // individual profile URL
	Email           string `json:"email"`               // "" when not found
	EmailStatus     string `json:"emailStatus"`         // not_found | scraped_snippet | scraped_website | scraped_profile
	Company         string `json:"company"`             // company name as queried
	CompanyUrl      string `json:"companyUrl"`          // official company website URL
	Score           int    `json:"score"`               // relevance score
	Source          string `json:"source,omitempty"`    // source of the lead data
	CreatedAt       string `json:"createdAt,omitempty"` // creation timestamp
}

// SearchResponse is the envelope returned for every search call.
type SearchResponse struct {
	Success bool           `json:"success"`
	Message string         `json:"message"`
	Data    []LeadResponse `json:"data"`
	Total   int            `json:"total"`
	Page    int            `json:"page"`
	HasMore bool           `json:"hasMore"`
}

// errorResponse writes a JSON error envelope with the given HTTP status code.
func errorResponse(w http.ResponseWriter, status int, message string) {
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(SearchResponse{
		Success: false,
		Message: message,
		Data:    []LeadResponse{},
	})
}

// SearchHandler handles POST /search
func SearchHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "application/json")

	// Auth
	userID, ok := r.Context().Value("userID").(string)
	if !ok {
		errorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	userObjectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	// Parse body
	var req SearchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.Query == "" {
		errorResponse(w, http.StatusBadRequest, "Query is required")
		return
	}

	log.Printf("🔍 Search — user: %s  query: %q  location: %q  page: %d",
		userID, req.Query, req.Location, req.Page)

	// Run search
	db := database.Get()
	leadService := services.NewLeadService(db)

	leads, err := leadService.SearchAndEnrichLeads(req.Query, req.Location, userObjectID)
	if err != nil {
		log.Printf("❌ Search error: %v", err)
		if _, ok := err.(*services.ValidationError); ok {
			errorResponse(w, http.StatusBadRequest, err.Error())
			return
		}
		errorResponse(w, http.StatusInternalServerError, "Search failed: "+err.Error())
		return
	}

	// Map models.Lead → LeadResponse (explicit field mapping so the frontend
	// always gets a consistent shape regardless of internal struct changes)
	allLeads := make([]LeadResponse, 0, len(leads))
	for _, l := range leads {
		email := l.Email
		// Never send the internal placeholder string to the client
		if email == "Email Not Scraped" {
			email = ""
		}

		allLeads = append(allLeads, LeadResponse{
			ID:              l.ID.Hex(),
			Name:            l.Name,
			Role:            l.Role,
			MatchedCategory: l.MatchedCategory,
			LinkedIn:        l.LinkedIn,
			Email:           email,
			EmailStatus:     l.EmailStatus,
			Company:         l.Company,
			CompanyUrl:      l.CompanyURL,
			Score:           l.Score,
			Source:          l.Source,
			CreatedAt:       l.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}

	// Pagination
	const pageSize = 20
	page := req.Page
	if page < 1 {
		page = 1
	}
	total := len(allLeads)
	start := (page - 1) * pageSize
	end := start + pageSize

	var pageLeads []LeadResponse
	if start >= total {
		pageLeads = []LeadResponse{}
	} else {
		if end > total {
			end = total
		}
		pageLeads = allLeads[start:end]
	}

	log.Printf("✅ Returning %d/%d leads (page %d)", len(pageLeads), total, page)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(SearchResponse{
		Success: true,
		Message: "Search completed successfully",
		Data:    pageLeads,
		Total:   total,
		Page:    page,
		HasMore: end < total,
	})
}

// GetHistoryHandler handles GET /history
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
		log.Printf("❌ History fetch error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Failed to fetch history"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "History fetched successfully",
		"data":    history,
	})
}
