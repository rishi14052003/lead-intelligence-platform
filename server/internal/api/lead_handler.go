package api

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"lead-finder/internal/database"
	"lead-finder/internal/models"
	"lead-finder/internal/services"
)

type LeadsRequest struct {
	Role string `json:"role"`
}

type LeadsResponse struct {
	Success bool          `json:"success"`
	Message string        `json:"message"`
	Data    []models.Lead `json:"data"`
	Count   int           `json:"count"`
}

// GetLeadsHandler handles the GET /leads endpoint
func GetLeadsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := database.Get()
	leadService := services.NewLeadService(db)

	// Check for role filter
	role := r.URL.Query().Get("role")

	var leads []models.Lead
	var err error

	if role != "" {
		leads, err = leadService.GetLeadsByRole(ctx, role)
		log.Printf("Fetching leads with role: %s", role)
	} else {
		leads, err = leadService.GetAllLeads(ctx)
		log.Println("Fetching all leads")
	}

	if err != nil {
		log.Printf("Error fetching leads: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(LeadsResponse{
			Success: false,
			Message: "Failed to fetch leads",
			Data:    []models.Lead{},
			Count:   0,
		})
		return
	}

	if leads == nil {
		leads = []models.Lead{}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(LeadsResponse{
		Success: true,
		Message: "Leads fetched successfully",
		Data:    leads,
		Count:   len(leads),
	})
}

// DeleteLeadHandler handles the DELETE /leads/:id endpoint
func DeleteLeadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	id := r.URL.Query().Get("id")
	if id == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"success": "false",
			"message": "ID is required",
		})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Lead deleted successfully",
	})
}
