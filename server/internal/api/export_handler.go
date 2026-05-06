package api

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"lead-finder/internal/database"
	"lead-finder/internal/models"
	"lead-finder/internal/utils"
)

// ExportHandler handles the export endpoint
func ExportHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get userID from context
	userID, ok := r.Context().Value("userID").(string)
	if !ok {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"message":"Unauthorized"}`))
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	db := database.Get()
	collection := db.Instance.Collection("leads")

	// Convert userID to ObjectID
	userObjectID, err := utils.StringToObjectID(userID)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// Get all leads for this user
	leads := []models.Lead{}
	cursor, err := collection.Find(ctx, map[string]interface{}{"userId": userObjectID})
	if err != nil {
		log.Printf("Error fetching leads for export: %v", err)
		http.Error(w, "Failed to fetch leads", http.StatusInternalServerError)
		return
	}
	defer cursor.Close(ctx)

	if err = cursor.All(ctx, &leads); err != nil {
		log.Printf("Error decoding leads: %v", err)
		http.Error(w, "Failed to decode leads", http.StatusInternalServerError)
		return
	}

	// Generate CSV
	csv := generateCSV(leads)

	// Set response headers
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=leads-%s.csv", time.Now().Format("2006-01-02")))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(csv)))

	// Write CSV to response
	w.Write([]byte(csv))

	log.Printf("Export completed for user %s. Exported %d leads", userID, len(leads))
}

// generateCSV generates a CSV string from leads
func generateCSV(leads []models.Lead) string {
	var buf bytes.Buffer

	// Write header
	header := []string{"Name", "Role", "Email", "LinkedIn", "Score", "Company", "Created At"}
	buf.WriteString(utils.FormatCSVRow(header))
	buf.WriteString("\n")

	// Write data rows
	for _, lead := range leads {
		row := []string{
			lead.Name,
			lead.Role,
			lead.Email,
			lead.LinkedIn,
			fmt.Sprintf("%d", lead.Score),
			lead.Company,
			utils.FormatTimestamp(lead.CreatedAt),
		}
		buf.WriteString(utils.FormatCSVRow(row))
		buf.WriteString("\n")
	}

	return buf.String()
}
