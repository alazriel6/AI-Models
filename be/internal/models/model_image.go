package models

import (
	"time"

	"gorm.io/datatypes"
)

type ModelImage struct {
	ID uint `json:"id" gorm:"primaryKey"`

	ModelID uint `json:"model_id" gorm:"not null;index"`

	ImagePath string `json:"image_path"`
	ImageURL  string `json:"image_url"`
	Caption   string `json:"caption"`

	Width  int `json:"width"`
	Height int `json:"height"`

	// Generation metadata (structured)
	PositivePrompt string  `json:"positive_prompt" gorm:"type:text"`
	NegativePrompt string  `json:"negative_prompt" gorm:"type:text"`
	Seed           int64   `json:"seed"`
	Steps          int     `json:"steps"`
	CFGScale       float64 `json:"cfg_scale"`
	Sampler        string  `json:"sampler"`
	Scheduler      string  `json:"scheduler"`

	// Flexible metadata from different tools
	RawMetadata datatypes.JSON `json:"raw_metadata" gorm:"type:jsonb"`

	// Relationships
	Resources []Resource `json:"resources,omitempty" gorm:"many2many:image_resources;joinForeignKey:ImageID;joinReferences:ResourceID;constraint:OnDelete:CASCADE"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
