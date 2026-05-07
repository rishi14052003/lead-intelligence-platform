package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Search struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID       primitive.ObjectID `bson:"userId,omitempty" json:"userId"`
	Query        string             `bson:"query" json:"query"`
	Domain       string             `bson:"domain" json:"domain"`
	Website      string             `bson:"website" json:"website"`
	ResultsCount int                `bson:"resultsCount" json:"resultsCount"`
	Status       string             `bson:"status" json:"status"`
	CreatedAt    time.Time          `bson:"createdAt" json:"createdAt"`
}
