package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"lead-finder/internal/database"
	"lead-finder/internal/models"
	"lead-finder/internal/services"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type LeadsRequest struct {
	Role string `json:"role"`
}

type SaveLeadsRequest struct {
	Leads []models.Lead `json:"leads"`
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

// DeleteLeadHandler handles the DELETE /leads endpoint
func DeleteLeadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := database.Get()
	leadService := services.NewLeadService(db)

	id := r.URL.Query().Get("id")

	if id == "" {
		// Delete all leads
		err := leadService.DeleteAllLeads(ctx)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{
				"success": "false",
				"message": "Failed to delete all leads",
			})
			return
		}
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "All leads deleted successfully",
		})
		return
	}

	// Delete specific lead by ID
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"success": "false",
			"message": "Invalid lead ID",
		})
		return
	}

	collection := db.Instance.Collection("leads")
	_, err = collection.DeleteOne(ctx, bson.M{"_id": objID})
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"success": "false",
			"message": "Failed to delete lead",
		})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Lead deleted successfully",
	})
}

// SaveLeadsHandler handles the POST /leads/save endpoint
func SaveLeadsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	var req SaveLeadsRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"success": "false",
			"message": "Invalid request body",
		})
		return
	}

	if len(req.Leads) == 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"success": "false",
			"message": "No leads to save",
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := database.Get()
	leadService := services.NewLeadService(db)

	// Save each lead
	savedCount := 0
	for _, lead := range req.Leads {
		err := leadService.SaveLead(ctx, &lead)
		if err == nil {
			savedCount++
		}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Saved %d leads", savedCount),
		"count":   savedCount,
	})
}
