package api

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