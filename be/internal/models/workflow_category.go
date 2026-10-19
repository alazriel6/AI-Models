package models

import "time"

type WorkflowCategory struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"not null"`
	Slug        string    `json:"slug" gorm:"unique;not null;index"`
	Description string    `json:"description" gorm:"type:text"`
	Icon        string    `json:"icon"`        // Optional icon emoji or SVG tag
	Color       string    `json:"color"`       // Optional badge color e.g. "#3b82f6"
	SortOrder   int       `json:"sort_order" gorm:"default:0"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
