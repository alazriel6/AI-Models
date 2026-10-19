package models

import "time"

type Workflow struct {
	ID uint `json:"id" gorm:"primaryKey"`

	Name string `json:"name" gorm:"not null"`
	Slug string `json:"slug" gorm:"unique;not null"`

	Description string `json:"description" gorm:"type:text"`
	BaseModel   string `json:"base_model" gorm:"index"` // "SDXL", "Illustrious", "Pony", "Flux", "SD 1.5", "All"
	Category    string `json:"category" gorm:"index"`   // "txt2img", "img2img", "upscale", "lora_stack", "inpainting", "detailer"

	// Raw ComfyUI workflow JSON graph (LiteGraph format: nodes, links, groups, etc.)
	WorkflowJSON string `json:"workflow_json" gorm:"type:text;not null"`

	// Relational link to a specific Model (1 model can have multiple workflows)
	ModelID *uint  `json:"model_id" gorm:"index"`
	Model   *Model `json:"model,omitempty" gorm:"foreignKey:ModelID;constraint:OnDelete:SET NULL"`

	Author              string `json:"author"`
	RequiredCustomNodes string `json:"required_custom_nodes" gorm:"type:text"` // Comma-separated or JSON list of required custom nodes
	ThumbnailURL        string `json:"thumbnail_url"`

	TotalNodes int `json:"total_nodes" gorm:"default:0"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
