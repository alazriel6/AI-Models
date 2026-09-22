package main

import (
	"log"

	"github.com/alazriel6/models-guide/backend/internal/config"
	"github.com/alazriel6/models-guide/backend/internal/database"
)

func main() {
	log.Println("Starting database seeder...")
	cfg := config.Load()
	db := database.Connect(cfg)

	if err := database.SeedData(db, true); err != nil {
		log.Fatalf("Seeding failed: %v", err)
	}

	log.Println("Database successfully seeded with realistic sample models, images, prompts, versions, and reviews!")
}
