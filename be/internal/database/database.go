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

	// Ensure critical columns and constraints exist for gallery & standalone images
	if err := db.Exec(`
		ALTER TABLE model_images ADD COLUMN IF NOT EXISTS model_name VARCHAR(255);
		ALTER TABLE model_images ALTER COLUMN model_id DROP NOT NULL;
		ALTER TABLE model_images ADD COLUMN IF NOT EXISTS scheduler VARCHAR(100);
	`).Error; err != nil {
		log.Printf("Warning: Failed to execute manual DDL on model_images: %v\n", err)
	}

	// AutoMigrate ensures all tables/columns exist
	tables := []interface{}{
		&models.Model{},
		&models.ModelVersion{},
		&models.Tag{},
		&models.ModelImage{},
		&models.Resource{},
		&models.ImageResource{},
		&models.ModelTriggerWord{},
		&models.Review{},
	}
	for _, t := range tables {
		if err := db.AutoMigrate(t); err != nil {
			log.Printf("Warning: AutoMigrate failed for %T: %v\n", t, err)
		}
	}

	return db
}
