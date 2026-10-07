package models

import "time"

type PromptPreset struct {
	ID uint `json:"id" gorm:"primaryKey"`

	Title       string `json:"title" gorm:"not null"`
	Slug        string `json:"slug" gorm:"index"`
	Category    string `json:"category" gorm:"index;not null"` // character, anime, photorealistic, style, environment, modular
	Subcategory string `json:"subcategory"`                   // e.g. "Blue Archive", "Lighting", "Cyberpunk"

	BaseModelTarget string `json:"base_model_target"`                 // "Illustrious", "SDXL", "Pony", "Flux", "All"
	PresetType      string `json:"preset_type" gorm:"default:'full'"` // 'full' (complete composition) or 'modular' (building block)

	PositivePrompt string `json:"positive_prompt" gorm:"type:text;not null"`
	NegativePrompt string `json:"negative_prompt" gorm:"type:text"`

	TriggerWords     string `json:"trigger_words"`                  // comma separated or JSON string
	RecommendedModel string `json:"recommended_model"`              // recommended checkpoint name
	RecommendedLoras string `json:"recommended_loras"`              // JSON array or string of suggested LoRAs
	SampleImages     string `json:"sample_images" gorm:"type:text"` // JSON array string of up to 5 preview image URLs

	Description string `json:"description" gorm:"type:text"`
	IsSystem    bool   `json:"is_system" gorm:"default:false"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
