package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Lead struct {
	ID     primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID primitive.ObjectID `bson:"userId" json:"userId"`
	Name   string             `bson:"name" json:"name"`
	// Role is kept for backward compatibility with the existing UI.
	// It now stores the employee's displayed job title (e.g. "Founder & CEO").
	Role string `bson:"role" json:"role"`

	// MatchedCategory is the classification bucket used for filtering (e.g. "FOUNDERS & OWNERSHIP").
	MatchedCategory    string             `bson:"matchedCategory,omitempty" json:"matchedCategory,omitempty"`
	Email              string             `bson:"email,omitempty" json:"email,omitempty"`
	EmailStatus        string             `bson:"email_status,omitempty" json:"email_status,omitempty"`
	Phone              string             `bson:"phone" json:"phone"`
	LinkedIn           string             `bson:"linkedin" json:"linkedin"`
	LinkedInCompanyURL string             `bson:"linkedinCompanyUrl,omitempty" json:"linkedinCompanyUrl,omitempty"`
	Company            string             `bson:"company" json:"company"`
	Website            string             `bson:"website" json:"website"`
	CompanyURL         string             `bson:"companyUrl" json:"companyUrl"`
	Confidence         int                `bson:"confidence" json:"confidence"`
	Source             string             `bson:"source" json:"source"`
	EmailVerified      bool               `bson:"email_verified" json:"email_verified"`
	Score              int                `bson:"score" json:"score"`
	SearchID           primitive.ObjectID `bson:"searchId" json:"searchId"`
	CreatedAt          time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt          time.Time          `bson:"updatedAt" json:"updatedAt"`
}

type User struct {
	ID             primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Email          string             `bson:"email" json:"email"`
	Password       string             `bson:"password" json:"-"`
	FirstName      string             `bson:"firstName" json:"firstName"`
	LastName       string             `bson:"lastName" json:"lastName"`
	ResetOtp       string             `bson:"resetOtp,omitempty" json:"-"`
	ResetOtpExpiry time.Time          `bson:"resetOtpExpiry,omitempty" json:"-"`
	OtpVerified    bool               `bson:"otpVerified,omitempty" json:"-"`
	CreatedAt      time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt      time.Time          `bson:"updatedAt" json:"updatedAt"`
}
