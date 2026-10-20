package models

import "time"

type NegativePreset struct {
	ID             uint      `json:"id" gorm:"primaryKey"`
	Title          string    `json:"title" gorm:"not null"`
	Architecture   string    `json:"architecture" gorm:"index;not null"` // SDXL, Pony, Illustrious, SD 1.5, Flux, All
	Category       string    `json:"category" gorm:"index;not null"`     // General, Anatomy, Photorealism, Anime, Minimal
	Description    string    `json:"description" gorm:"type:text"`
	Prompt         string    `json:"prompt" gorm:"type:text;not null"`
	RecommendedCFG string    `json:"recommended_cfg"`
	Tags           string    `json:"tags"` // comma-separated tags
	IsSystem       bool      `json:"is_system" gorm:"default:false"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}
