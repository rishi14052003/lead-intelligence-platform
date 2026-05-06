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

	// Get userID from context
	userID, ok := r.Context().Value("userID").(string)
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"message": "Unauthorized"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := database.Get()
	collection := db.Instance.Collection("leads")

	// Convert userID to ObjectID
	userObjectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"message": "Invalid user ID"})
		return
	}

	// Check for role filter
	role := r.URL.Query().Get("role")

	var filter bson.M
	if role != "" {
		filter = bson.M{"userId": userObjectID, "role": role}
		log.Printf("Fetching leads for user %s with role: %s", userID, role)
	} else {
		filter = bson.M{"userId": userObjectID}
		log.Printf("Fetching all leads for user %s", userID)
	}

	leads := []models.Lead{}
	cursor, err := collection.Find(ctx, filter)
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
	defer cursor.Close(ctx)

	if err = cursor.All(ctx, &leads); err != nil {
		log.Printf("Error decoding leads: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(LeadsResponse{
			Success: false,
			Message: "Failed to decode leads",
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

	// Get userID from context
	userID, ok := r.Context().Value("userID").(string)
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"message": "Unauthorized"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := database.Get()
	collection := db.Instance.Collection("leads")

	// Convert userID to ObjectID
	userObjectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"message": "Invalid user ID"})
		return
	}

	id := r.URL.Query().Get("id")

	if id == "" {
		// Delete all leads for this user
		_, err := collection.DeleteMany(ctx, bson.M{"userId": userObjectID})
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

	// Ensure the lead belongs to the user
	_, err = collection.DeleteOne(ctx, bson.M{"_id": objID, "userId": userObjectID})
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

	// Get userID from context
	userID, ok := r.Context().Value("userID").(string)
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"message": "Unauthorized"})
		return
	}

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
	collection := db.Instance.Collection("leads")

	// Convert userID to ObjectID
	userObjectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"message": "Invalid user ID"})
		return
	}

	// Save each lead
	savedCount := 0
	for _, lead := range req.Leads {
		lead.UserID = userObjectID
		lead.CreatedAt = time.Now()
		lead.UpdatedAt = time.Now()

		_, err := collection.InsertOne(ctx, lead)
		if err == nil {
			savedCount++
		} else {
			log.Printf("Error saving lead: %v", err)
		}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Saved %d leads", savedCount),
		"count":   savedCount,
	})
}
