package models

type Tag struct {
	ID uint `json:"id" gorm:"primaryKey"`

	Name string `json:"name" gorm:"not null"`
	Slug string `json:"slug" gorm:"uniqueIndex;not null"`
}
