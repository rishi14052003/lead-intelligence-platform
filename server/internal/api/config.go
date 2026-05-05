package api

// Global configuration for API handlers
var ApolloAPIKey string

// SetApolloAPIKey sets the Apollo API key for handlers
func SetApolloAPIKey(key string) {
	ApolloAPIKey = key
}

// GetApolloAPIKey returns the configured Apollo API key
func GetApolloAPIKey() string {
	return ApolloAPIKey
}
