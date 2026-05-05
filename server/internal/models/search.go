package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Search struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Query        string             `bson:"query" json:"query"`
	Domain       string             `bson:"domain" json:"domain"`
	ResultsCount int                `bson:"resultsCount" json:"resultsCount"`
	CreatedAt    time.Time          `bson:"createdAt" json:"createdAt"`
}
