package models

import "time"

type Model struct {
	ID uint `json:"id" gorm:"primaryKey"`

	Name string `json:"name" gorm:"not null"`
	Slug string `json:"slug" gorm:"uniqueIndex;not null"`

	Type      string `json:"type" gorm:"not null"`
	BaseModel string `json:"base_model"`

	Description string `json:"description" gorm:"type:text"`
	Author      string `json:"author"`

	CivitaiURL     string `json:"civitai_url"`
	HuggingFaceURL string `json:"huggingface_url"`
	ThumbnailURL   string `json:"thumbnail_url"`

	Versions []ModelVersion `json:"versions,omitempty" gorm:"foreignKey:ModelID;constraint:OnDelete:CASCADE"`
	Tags     []Tag          `json:"tags,omitempty" gorm:"many2many:model_tags;constraint:OnDelete:CASCADE"`
	Images   []ModelImage   `json:"images,omitempty" gorm:"foreignKey:ModelID;constraint:OnDelete:CASCADE"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
