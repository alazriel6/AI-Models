package models

import "time"

type ModelTriggerWord struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	ModelID   uint      `json:"model_id" gorm:"not null;index"`
	TriggerWord string  `json:"trigger_word" gorm:"not null;index"`
	CreatedAt time.Time `json:"created_at"`
}
