package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Search struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID       primitive.ObjectID `bson:"userId,omitempty" json:"userId"`
	Query        string             `bson:"query" json:"query"`
	Location     string             `bson:"location,omitempty" json:"location,omitempty"`
	Domain       string             `bson:"domain" json:"domain"`
	Website      string             `bson:"website" json:"website"`
	// LinkedInCompanyURL is the resolved linkedin.com/company/{slug}/ URL used to ground people search.
	LinkedInCompanyURL string `bson:"linkedinCompanyUrl,omitempty" json:"linkedinCompanyUrl,omitempty"`
	ResultsCount int                `bson:"resultsCount" json:"resultsCount"`
	Leads        []Lead             `bson:"leads" json:"leads"`
	Status       string             `bson:"status" json:"status"`
	CreatedAt    time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt    time.Time          `bson:"updatedAt,omitempty" json:"updatedAt,omitempty"`
}
