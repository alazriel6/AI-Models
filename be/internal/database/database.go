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

		CREATE TABLE IF NOT EXISTS image_tags (
			image_id INTEGER NOT NULL REFERENCES model_images(id) ON DELETE CASCADE,
			tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
			PRIMARY KEY (image_id, tag_id)
		);
		CREATE INDEX IF NOT EXISTS idx_image_tags_image_id ON image_tags(image_id);
		CREATE INDEX IF NOT EXISTS idx_image_tags_tag_id ON image_tags(tag_id);
	`).Error; err != nil {
		log.Printf("Warning: Failed to execute manual DDL on model_images/image_tags: %v\n", err)
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
		&models.PromptPreset{},
	}
	for _, t := range tables {
		if err := db.AutoMigrate(t); err != nil {
			log.Printf("Warning: AutoMigrate failed for %T: %v\n", t, err)
		}
	}

	return db
}
