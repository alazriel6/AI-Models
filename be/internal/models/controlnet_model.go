package models

import "time"

type ControlNetModel struct {
	ID                     uint      `json:"id" gorm:"primaryKey"`
	Name                   string    `json:"name" gorm:"not null"`
	Filename               string    `json:"filename" gorm:"not null"`
	BaseModel              string    `json:"base_model" gorm:"index;not null"` // Flux.1, SDXL, Pony, Illustrious, SD 1.5
	ControlType            string    `json:"control_type" gorm:"index;not null"` // OpenPose, Canny, Depth, Lineart, SoftEdge, Tile, Inpaint, Union
	Author                 string    `json:"author"`
	Filesize               string    `json:"filesize"`
	Vram                   string    `json:"vram"`
	RecommendedWeight      string    `json:"recommended_weight"`
	RecommendedEndingStep  string    `json:"recommended_ending_step"`
	ControlMode            string    `json:"control_mode"`
	HuggingFaceURL          string    `json:"huggingface_url"`
	Description            string    `json:"description" gorm:"type:text"`
	ComfyNode              string    `json:"comfy_node"`
	WebuiParam             string    `json:"webui_param"`
	Tags                   string    `json:"tags"` // comma-separated
	IsSystem               bool      `json:"is_system" gorm:"default:false"`
	CreatedAt              time.Time `json:"created_at"`
	UpdatedAt              time.Time `json:"updated_at"`
}
