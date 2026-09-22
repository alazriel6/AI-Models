package models

// ImageResource is the join table between model_images and resources.
// It carries an optional weight (e.g. LoRA weight).
type ImageResource struct {
	ImageID    uint    `json:"image_id" gorm:"primaryKey"`
	ResourceID uint    `json:"resource_id" gorm:"primaryKey"`
	Weight     float64 `json:"weight"`
}
