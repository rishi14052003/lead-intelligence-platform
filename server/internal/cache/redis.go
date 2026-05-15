package cache

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

// CacheManager handles Redis caching for expensive API calls
type CacheManager struct {
	client *redis.Client
}

// NewCacheManager creates a new Redis cache manager
func NewCacheManager(addr string) (*CacheManager, error) {
	client := redis.NewClient(&redis.Options{
		Addr:         addr,
		DB:           0,
		MaxRetries:   3,
		PoolSize:     10,
		MinIdleConns: 5,
	})

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	_, err := client.Ping(ctx).Result()
	if err != nil {
		log.Printf("⚠️ Redis connection failed: %v (caching will be disabled)", err)
		return &CacheManager{client: nil}, nil
	}

	log.Println("✅ Redis connected successfully")
	return &CacheManager{client: client}, nil
}

// IsAvailable checks if Redis is configured and available
func (cm *CacheManager) IsAvailable() bool {
	return cm.client != nil
}

// GenerateCacheKey creates a consistent cache key from search parameters
func (cm *CacheManager) GenerateCacheKey(query, role, company, location string) string {
	// Create a hash of the search parameters
	hash := md5.Sum([]byte(fmt.Sprintf("%s|%s|%s|%s", query, role, company, location)))
	return fmt.Sprintf("serper:search:%x", hash)
}

// GetCachedResults retrieves cached Serper results
func (cm *CacheManager) GetCachedResults(ctx context.Context, query, role, company, location string) ([]map[string]string, bool, error) {
	if !cm.IsAvailable() {
		return nil, false, nil
	}

	cacheKey := cm.GenerateCacheKey(query, role, company, location)

	val, err := cm.client.Get(ctx, cacheKey).Result()
	if err == redis.Nil {
		// Cache miss
		return nil, false, nil
	}
	if err != nil {
		log.Printf("⚠️ Redis GET error: %v", err)
		return nil, false, nil
	}

	var results []map[string]string
	if err := json.Unmarshal([]byte(val), &results); err != nil {
		log.Printf("⚠️ Redis unmarshal error: %v", err)
		return nil, false, nil
	}

	log.Printf("✅ Cache HIT for: %s (found %d profiles)", cacheKey, len(results))
	return results, true, nil
}

// CacheResults stores Serper results in Redis with 7-day TTL
func (cm *CacheManager) CacheResults(ctx context.Context, query, role, company, location string, results []map[string]string) error {
	if !cm.IsAvailable() {
		return nil
	}

	cacheKey := cm.GenerateCacheKey(query, role, company, location)

	data, err := json.Marshal(results)
	if err != nil {
		return err
	}

	ttl := 7 * 24 * time.Hour // 7 days
	if err := cm.client.Set(ctx, cacheKey, data, ttl).Err(); err != nil {
		log.Printf("⚠️ Redis SET error: %v", err)
		return nil // Don't fail if caching fails
	}

	log.Printf("✅ Cached %d profiles for 7 days: %s", len(results), cacheKey)
	return nil
}

// Close closes the Redis connection
func (cm *CacheManager) Close() error {
	if cm.client != nil {
		return cm.client.Close()
	}
	return nil
}
