package models

import (
	"time"

	"gorm.io/datatypes"
)

type ModelVersion struct {
	ID uint `json:"id" gorm:"primaryKey"`

	ModelID uint `json:"model_id" gorm:"not null;index"`

	VersionName   string `json:"version_name" gorm:"not null"`
	VersionNumber string `json:"version_number"`

	FileName string `json:"file_name"`
	FileSize int64  `json:"file_size"`
	Format   string `json:"format"`

	DownloadURL       string `json:"download_url"`
	CivitaiVersionURL string `json:"civitai_version_url"`

	RecommendedSettings datatypes.JSON `json:"recommended_settings" gorm:"type:jsonb"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
