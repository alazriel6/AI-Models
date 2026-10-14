package models

type BooruTag struct {
	ID          uint   `json:"id" gorm:"primaryKey"`
	Name        string `json:"name" gorm:"uniqueIndex;not null"`
	Category    string `json:"category" gorm:"index;default:'general'"` // general, character, artist, quality, meta
	PostCount   string `json:"post_count"`                              // formatted string e.g. "4.8M"
	CountNum    int64  `json:"count_num" gorm:"index;default:0"`        // numerical count for popularity ranking
	Layer       string `json:"layer" gorm:"index;default:''"`           // quality, identity, proportions, details, expression, outfit, pose, camera, background, effects
	Description string `json:"description"`
}
