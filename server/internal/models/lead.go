package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Lead struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name      string             `bson:"name" json:"name"`
	Role      string             `bson:"role" json:"role"`
	Email     string             `bson:"email" json:"email"`
	LinkedIn  string             `bson:"linkedin" json:"linkedin"`
	Score     int                `bson:"score" json:"score"`
	Company   string             `bson:"company" json:"company"`
	SearchID  primitive.ObjectID `bson:"searchId" json:"searchId"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time          `bson:"updatedAt" json:"updatedAt"`
}

type Search struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Query        string             `bson:"query" json:"query"`
	Domain       string             `bson:"domain" json:"domain"`
	ResultsCount int                `bson:"resultsCount" json:"resultsCount"`
	CreatedAt    time.Time          `bson:"createdAt" json:"createdAt"`
}

type User struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Email     string             `bson:"email" json:"email"`
	Password  string             `bson:"password" json:"-"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
}

type Lead struct {
	Name     string `json:"name"`
	Role     string `json:"role"`
	Email    string `json:"email"`
	LinkedIn string `json:"linkedin,omitempty"`
	Score    int    `json:"score"`
}
