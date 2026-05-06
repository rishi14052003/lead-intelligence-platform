package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Database struct {
	Client   *mongo.Client
	Instance *mongo.Database
}

var db *Database

func Init(mongoURI, dbName string) (*Database, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		return nil, fmt.Errorf("failed to connect to MongoDB: %w", err)
	}

	// Test the connection
	ctx, cancel = context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err = client.Ping(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to ping MongoDB: %w", err)
	}

	log.Println("✓ Connected to MongoDB successfully")

	database := client.Database(dbName)

	db = &Database{
		Client:   client,
		Instance: database,
	}

	// Create indexes
	createIndexes(database)

	return db, nil
}

func Get() *Database {
	return db
}

func (d *Database) Close() error {
	if d.Client != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		return d.Client.Disconnect(ctx)
	}
	return nil
}

func createIndexes(database *mongo.Database) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Users collection indexes
	usersCollection := database.Collection("users")
	usersIndexModel := mongo.IndexModel{
		Keys:    map[string]int{"email": 1},
		Options: options.Index().SetUnique(true),
	}
	_, err := usersCollection.Indexes().CreateOne(ctx, usersIndexModel)
	if err != nil {
		log.Printf("Warning: Could not create email index on users: %v", err)
	}

	// Leads collection indexes
	leadsCollection := database.Collection("leads")
	leadsEmailIndexModel := mongo.IndexModel{
		Keys:    map[string]int{"email": 1},
		Options: options.Index().SetUnique(false),
	}
	_, err = leadsCollection.Indexes().CreateOne(ctx, leadsEmailIndexModel)
	if err != nil {
		log.Printf("Warning: Could not create email index on leads: %v", err)
	}

	leadsUserIndexModel := mongo.IndexModel{
		Keys: map[string]int{"userId": 1},
	}
	_, err = leadsCollection.Indexes().CreateOne(ctx, leadsUserIndexModel)
	if err != nil {
		log.Printf("Warning: Could not create userId index on leads: %v", err)
	}

	// Searches collection indexes
	searchesCollection := database.Collection("searches")
	searchIndexModel := mongo.IndexModel{
		Keys: map[string]int{"query": 1},
	}
	_, err = searchesCollection.Indexes().CreateOne(ctx, searchIndexModel)
	if err != nil {
		log.Printf("Warning: Could not create query index: %v", err)
	}

	log.Println("✓ Database indexes created")
}
