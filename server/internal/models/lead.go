package models

type Lead struct {
	Name     string `json:"name"`
	Role     string `json:"role"`
	Email    string `json:"email"`
	LinkedIn string `json:"linkedin,omitempty"`
	Score    int    `json:"score"`
}