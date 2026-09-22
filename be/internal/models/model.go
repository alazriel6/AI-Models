package models

import "time"

type Model struct {
	ID uint `json:"id" gorm:"primaryKey"`

	Name string `json:"name" gorm:"not null"`
	Slug string `json:"slug" gorm:"uniqueIndex;not null"`

	Type      string `json:"type" gorm:"not null"` // checkpoint, lora, extensible
	BaseModel string `json:"base_model"`          // Illustrious, NoobAI, Flux, Pony, SD 1.5, etc.

	Description string `json:"description" gorm:"type:text"`
	Author      string `json:"author"`

	SourceURL      string `json:"source_url"` // external link (Civitai, Civitai.red)
	CivitaiURL     string `json:"civitai_url"`
	HuggingFaceURL string `json:"huggingface_url"`
	ThumbnailURL   string `json:"thumbnail_url"`

	PublishedAt *time.Time `json:"published_at"`

	// Engagement stats
	Likes  int     `json:"likes" gorm:"default:0"`
	Rating float64 `json:"rating" gorm:"default:0"`

	// Tensor & VRAM specs
	TensorSize      string `json:"tensor_size"`
	VRAMMin         string `json:"vram_min" gorm:"column:vram_min"`
	VRAMRecommended string `json:"vram_recommended" gorm:"column:vram_recommended"`
	Conditioner     int    `json:"conditioner"`
	FirstStageModel int    `json:"first_stage_model"`
	ModelTensor     int    `json:"model_tensor"`

	// Relationships
	TriggerWords []ModelTriggerWord `json:"trigger_words,omitempty" gorm:"foreignKey:ModelID;constraint:OnDelete:CASCADE"`
	Reviews      []Review           `json:"reviews,omitempty" gorm:"foreignKey:ModelID;constraint:OnDelete:CASCADE"`
	Versions     []ModelVersion     `json:"versions,omitempty" gorm:"foreignKey:ModelID;constraint:OnDelete:CASCADE"`
	Tags         []Tag              `json:"tags,omitempty" gorm:"many2many:model_tags;constraint:OnDelete:CASCADE"`
	Images       []ModelImage       `json:"images,omitempty" gorm:"foreignKey:ModelID;constraint:OnDelete:CASCADE"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
