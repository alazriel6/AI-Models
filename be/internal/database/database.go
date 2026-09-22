package database

import (
	"log"

	"github.com/alazriel6/models-guide/backend/internal/config"
	"github.com/alazriel6/models-guide/backend/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Connect(cfg config.Config) *gorm.DB {
	logLevel := logger.Warn
	if cfg.AppEnv == "development" {
		logLevel = logger.Info
	}

	db, err := gorm.Open(postgres.Open(cfg.DSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})

	if err != nil {
		log.Fatal("Failed to connect to PostgreSQL:", err)
	}

	log.Println("PostgreSQL connected")

	// AutoMigrate ensures all tables/columns exist
	if err := db.AutoMigrate(
		&models.Model{},
		&models.ModelVersion{},
		&models.Tag{},
		&models.ModelImage{},
		&models.Resource{},
		&models.ImageResource{},
		&models.ModelTriggerWord{},
		&models.Review{},
	); err != nil {
		log.Printf("Warning: AutoMigrate failed: %v\n", err)
	}

	return db
}
