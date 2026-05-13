package configs

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	MongoURI     string
	DBName       string
	ServerPort   string
	Environment  string
	ClientURL    string
	GrokAPIKey   string
	JWTSecret    string
	SMTPHost     string
	SMTPPort     string
	SMTPUser     string
	SMTPPassword string
	SMTPFrom     string
}

// SMTPConfig holds SMTP configuration
type SMTPConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	From     string
}

var appConfig *Config

func LoadConfig() *Config {
	// Load env vars from either:
	// - server/.env (when running from repo root)
	// - .env (when running from within server/)
	// If neither exists, rely on process environment (Docker/CI/hosting).
	_ = godotenv.Load("server/.env")
	_ = godotenv.Load(".env")

	appConfig = &Config{
		MongoURI:     getEnv("MONGO_URI", "mongodb://localhost:27017"),
		DBName:       getEnv("DB_NAME", "leadfinder"),
		ServerPort:   getEnv("SERVER_PORT", "8080"),
		Environment:  getEnv("ENVIRONMENT", "development"),
		ClientURL:    getEnv("CLIENT_URL", "http://localhost:5173"),
		GrokAPIKey:   getEnv("GROK_API_KEY", ""),
		JWTSecret:    getEnv("JWT_SECRET", "uigre7grdfg7f98dg798re_gdsg897g89"),
		SMTPHost:     getEnv("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:     getEnv("SMTP_PORT", "587"),
		SMTPUser:     getEnv("SMTP_USER", ""),
		SMTPPassword: getEnv("SMTP_PASS", ""),
		SMTPFrom:     getEnv("EMAIL_FROM", ""),
	}

	return appConfig
}

func GetConfig() *Config {
	if appConfig == nil {
		return LoadConfig()
	}
	return appConfig
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}
