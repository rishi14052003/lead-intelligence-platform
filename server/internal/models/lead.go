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

type User struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Email     string             `bson:"email" json:"email"`
	Password  string             `bson:"password" json:"-"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
}
