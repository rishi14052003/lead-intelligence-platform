package utils

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"lead-finder/configs"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

const (
	saltCost = 12
)

// HashPassword hashes a password using bcrypt
func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), saltCost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %w", err)
	}
	return string(hash), nil
}

// VerifyPassword compares a hashed password with a plain password
func VerifyPassword(hashedPassword, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	return err == nil
}

// GenerateJWT generates a JWT token for a user using HMAC
func GenerateJWT(userID, email, firstName string) (string, error) {
	config := configs.GetConfig()
	jwtSecret := config.JWTSecret
	
	// Fallback to env var if config is nil (shouldn't happen, but safety first)
	if jwtSecret == "" {
		jwtSecret = os.Getenv("JWT_SECRET")
	}
	
	if jwtSecret == "" {
		return "", fmt.Errorf("JWT_SECRET not configured")
	}

	header := map[string]interface{}{
		"alg": "HS256",
		"typ": "JWT",
	}

	payload := map[string]interface{}{
		"userId":    userID,
		"email":     email,
		"firstName": firstName,
		"iat":       time.Now().Unix(),
		"exp":       time.Now().Add(time.Hour * 24 * 7).Unix(), // 7 days expiry
	}

	// Encode header
	headerJSON, _ := json.Marshal(header)
	headerEncoded := base64.RawURLEncoding.EncodeToString(headerJSON)

	// Encode payload
	payloadJSON, _ := json.Marshal(payload)
	payloadEncoded := base64.RawURLEncoding.EncodeToString(payloadJSON)

	// Create signature
	message := headerEncoded + "." + payloadEncoded
	signature := hmac.New(sha256.New, []byte(jwtSecret))
	signature.Write([]byte(message))
	signatureEncoded := base64.RawURLEncoding.EncodeToString(signature.Sum(nil))

	token := message + "." + signatureEncoded
	return token, nil
}

// VerifyJWT verifies and parses a JWT token
func VerifyJWT(tokenString string) (map[string]interface{}, error) {
	config := configs.GetConfig()
	jwtSecret := config.JWTSecret
	
	// Fallback to env var if config is nil (shouldn't happen, but safety first)
	if jwtSecret == "" {
		jwtSecret = os.Getenv("JWT_SECRET")
	}
	
	if jwtSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET not configured")
	}

	parts := strings.Split(tokenString, ".")
	if len(parts) != 3 {
		return nil, fmt.Errorf("invalid token format")
	}

	// Verify signature
	message := parts[0] + "." + parts[1]
	signature := hmac.New(sha256.New, []byte(jwtSecret))
	signature.Write([]byte(message))
	expectedSignature := base64.RawURLEncoding.EncodeToString(signature.Sum(nil))

	if !hmac.Equal([]byte(parts[2]), []byte(expectedSignature)) {
		return nil, fmt.Errorf("invalid token signature")
	}

	// Decode payload
	payloadJSON, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, fmt.Errorf("failed to decode payload: %w", err)
	}

	var payload map[string]interface{}
	if err := json.Unmarshal(payloadJSON, &payload); err != nil {
		return nil, fmt.Errorf("failed to unmarshal payload: %w", err)
	}

	// Check expiry
	if exp, ok := payload["exp"].(float64); ok {
		if int64(exp) < time.Now().Unix() {
			return nil, fmt.Errorf("token expired")
		}
	}

	return payload, nil
}

var cachedSecret string

func generateRandomSecret() string {
	if cachedSecret != "" {
		return cachedSecret
	}
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		cachedSecret = "dev-secret-key"
		return cachedSecret
	}
	cachedSecret = base64.StdEncoding.EncodeToString(b)
	return cachedSecret
}

// StringToObjectID converts a string to MongoDB ObjectID
func StringToObjectID(id string) (primitive.ObjectID, error) {
	return primitive.ObjectIDFromHex(id)
}
