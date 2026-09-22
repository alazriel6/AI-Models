package models

import (
	"time"

	"gorm.io/datatypes"
)

// Resource represents a checkpoint, LoRA, VAE, embedding, or other asset
// used during image generation.
type Resource struct {
	ID uint `json:"id" gorm:"primaryKey"`

	Name    string `json:"name" gorm:"not null"`
	Type    string `json:"type" gorm:"not null;index"` // checkpoint, lora, vae, embedding
	Version string `json:"version"`
	URL     string `json:"url"`

	Metadata datatypes.JSON `json:"metadata" gorm:"type:jsonb"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
