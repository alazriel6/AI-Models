package models

import "time"

type EmbeddingResource struct {
	ID             uint      `json:"id" gorm:"primaryKey"`
	Name           string    `json:"name" gorm:"not null"`
	Filename       string    `json:"filename" gorm:"not null"`
	Architecture   string    `json:"architecture" gorm:"index;not null"` // SD 1.5, SDXL, Pony
	Filesize       string    `json:"filesize"`
	Description    string    `json:"description" gorm:"type:text"`
	A1111Trigger   string    `json:"a1111_trigger"`
	ComfyTrigger   string    `json:"comfy_trigger"`
	DownloadURL    string    `json:"download_url"`
	SuppressedTags string    `json:"suppressed_tags" gorm:"type:text"` // comma-separated tags
	IsSystem       bool      `json:"is_system" gorm:"default:false"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}
