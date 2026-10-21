package models

import "time"

type ControlNetPose struct {
	ID                uint      `json:"id" gorm:"primaryKey"`
	Title             string    `json:"title" gorm:"not null"`
	Category          string    `json:"category" gorm:"index;not null"` // "Action & Combat", "Standing & Model", "Sitting & Relaxed", "Dynamic & Aerial", "Portrait & Selfie", "Duo & Interaction"
	Tags              string    `json:"tags"`                           // comma-separated tags
	Description       string    `json:"description" gorm:"type:text"`
	RecommendedPrompt string    `json:"recommended_prompt" gorm:"type:text"`
	KeypointsData     string    `json:"keypoints_data" gorm:"type:text;not null"` // JSON array of [x, y, confidence]
	CanvasWidth       int       `json:"canvas_width" gorm:"default:512"`
	CanvasHeight      int       `json:"canvas_height" gorm:"default:768"`
	IsSystem          bool      `json:"is_system" gorm:"default:false"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}
