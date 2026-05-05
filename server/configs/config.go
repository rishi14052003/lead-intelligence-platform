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
	ApolloAPIKey string
}

var appConfig *Config

func LoadConfig() *Config {
	// Load .env file if it exists
	_ = godotenv.Load()

	appConfig = &Config{
		MongoURI:     getEnv("MONGO_URI", "mongodb://localhost:27017"),
		DBName:       getEnv("DB_NAME", "leadfinder"),
		ServerPort:   getEnv("SERVER_PORT", "8080"),
		Environment:  getEnv("ENVIRONMENT", "development"),
		ClientURL:    getEnv("CLIENT_URL", "http://localhost:5173"),
		ApolloAPIKey: getEnv("APOLLO_API_KEY", ""),
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
