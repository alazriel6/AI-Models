package models

import "time"

type Review struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	ModelID   uint      `json:"model_id" gorm:"not null;index"`
	Reviewer  string    `json:"reviewer" gorm:"not null"`
	Rating    int       `json:"rating" gorm:"not null"`
	Comment   string    `json:"comment" gorm:"type:text"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
