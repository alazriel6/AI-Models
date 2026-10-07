package services

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/alazriel6/models-guide/backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type DatabaseBackupData struct {
	Version     string              `json:"version"`
	ExportedAt  time.Time           `json:"exported_at"`
	TotalModels int                 `json:"total_models"`
	TotalImages int                 `json:"total_images"`
	TotalTags   int                 `json:"total_tags"`
	Models      []models.Model      `json:"models"`
	Images      []models.ModelImage `json:"images"`
	Tags        []models.Tag        `json:"tags"`
}

type ImportBackupResult struct {
	ModelsImported int      `json:"models_imported"`
	ImagesImported int      `json:"images_imported"`
	TagsImported   int      `json:"tags_imported"`
	Warnings       []string `json:"warnings,omitempty"`
}

type BackupService struct {
	db *gorm.DB
}

func NewBackupService(db *gorm.DB) *BackupService {
	return &BackupService{db: db}
}

// Export dumps all models, versions, images, tags, and resources
func (s *BackupService) Export() (*DatabaseBackupData, error) {
	var allModels []models.Model
	err := s.db.
		Preload("Versions").
		Preload("TriggerWords").
		Preload("Tags").
		Preload("Images").
		Find(&allModels).Error
	if err != nil {
		return nil, fmt.Errorf("failed to fetch models for backup: %w", err)
	}

	var allImages []models.ModelImage
	err = s.db.
		Preload("Tags").
		Preload("Resources").
		Find(&allImages).Error
	if err != nil {
		return nil, fmt.Errorf("failed to fetch images for backup: %w", err)
	}

	var allTags []models.Tag
	err = s.db.Find(&allTags).Error
	if err != nil {
		return nil, fmt.Errorf("failed to fetch tags for backup: %w", err)
	}

	backup := &DatabaseBackupData{
		Version:     "1.0",
		ExportedAt:  time.Now().UTC(),
		TotalModels: len(allModels),
		TotalImages: len(allImages),
		TotalTags:   len(allTags),
		Models:      allModels,
		Images:      allImages,
		Tags:        allTags,
	}

	return backup, nil
}

// Import restores models, tags, and images from backup
func (s *BackupService) Import(data *DatabaseBackupData, mode string) (*ImportBackupResult, error) {
	if data == nil {
		return nil, fmt.Errorf("empty backup data provided")
	}

	result := &ImportBackupResult{}

	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Restore Tags
		tagMap := make(map[string]uint) // name -> tag id
		for _, tag := range data.Tags {
			if tag.Name == "" {
				continue
			}
			var existing models.Tag
			err := tx.Where("slug = ? OR LOWER(name) = LOWER(?)", tag.Slug, tag.Name).First(&existing).Error
			if err != nil {
				if err == gorm.ErrRecordNotFound {
					newTag := models.Tag{
						Name: tag.Name,
						Slug: tag.Slug,
					}
					if err := tx.Create(&newTag).Error; err == nil {
						tagMap[tag.Name] = newTag.ID
						result.TagsImported++
					}
				}
			} else {
				tagMap[tag.Name] = existing.ID
			}
		}

		// 2. Restore Models
		for _, m := range data.Models {
			if m.Name == "" || m.Slug == "" {
				continue
			}

			var existing models.Model
			err := tx.Where("slug = ?", m.Slug).First(&existing).Error

			if err == gorm.ErrRecordNotFound {
				// Create new model
				newModel := m
				newModel.ID = 0 // Auto-increment

				// Detach relations to avoid conflict before model is created
				newModel.Versions = nil
				newModel.TriggerWords = nil
				newModel.Tags = nil
				newModel.Images = nil

				if err := tx.Create(&newModel).Error; err != nil {
					result.Warnings = append(result.Warnings, fmt.Sprintf("Failed to create model '%s': %v", m.Name, err))
					continue
				}

				// Restore Tags association
				if len(m.Tags) > 0 {
					var modelTags []models.Tag
					for _, t := range m.Tags {
						var tagRec models.Tag
						if tx.Where("slug = ? OR LOWER(name) = LOWER(?)", t.Slug, t.Name).First(&tagRec).Error == nil {
							modelTags = append(modelTags, tagRec)
						}
					}
					if len(modelTags) > 0 {
						_ = tx.Model(&newModel).Association("Tags").Replace(modelTags)
					}
				}

				// Restore Versions
				for _, v := range m.Versions {
					v.ID = 0
					v.ModelID = newModel.ID
					_ = tx.Create(&v).Error
				}

				// Restore TriggerWords
				for _, tw := range m.TriggerWords {
					tw.ID = 0
					tw.ModelID = newModel.ID
					_ = tx.Create(&tw).Error
				}

				result.ModelsImported++
			} else if err == nil {
				// Model exists: update fields if mode is merge or overwrite
				existing.Name = m.Name
				existing.Type = m.Type
				existing.BaseModel = m.BaseModel
				existing.Description = m.Description
				existing.Author = m.Author
				existing.SourceURL = m.SourceURL
				existing.CivitaiURL = m.CivitaiURL
				existing.HuggingFaceURL = m.HuggingFaceURL
				if m.ThumbnailURL != "" {
					existing.ThumbnailURL = m.ThumbnailURL
				}
				existing.TensorSize = m.TensorSize
				existing.VRAMMin = m.VRAMMin
				existing.VRAMRecommended = m.VRAMRecommended

				_ = tx.Save(&existing).Error

				// Update versions if any new
				for _, v := range m.Versions {
					var existingVersion models.ModelVersion
					vErr := tx.Where("model_id = ? AND version_name = ?", existing.ID, v.VersionName).First(&existingVersion).Error
					if vErr == gorm.ErrRecordNotFound {
						v.ID = 0
						v.ModelID = existing.ID
						_ = tx.Create(&v).Error
					}
				}

				// Update trigger words
				for _, tw := range m.TriggerWords {
					var existingTW models.ModelTriggerWord
					twErr := tx.Where("model_id = ? AND trigger_word = ?", existing.ID, tw.TriggerWord).First(&existingTW).Error
					if twErr == gorm.ErrRecordNotFound {
						tw.ID = 0
						tw.ModelID = existing.ID
						_ = tx.Create(&tw).Error
					}
				}

				result.ModelsImported++
			}
		}

		// 3. Restore Gallery Images
		for _, img := range data.Images {
			if img.ImageURL == "" {
				continue
			}

			// Map model_id to new model if model was imported
			var targetModelID *uint
			if img.Model != nil && img.Model.Slug != "" {
				var linked models.Model
				if tx.Where("slug = ?", img.Model.Slug).First(&linked).Error == nil {
					targetModelID = &linked.ID
				}
			}

			var existingImg models.ModelImage
			err := tx.Where("image_url = ?", img.ImageURL).First(&existingImg).Error
			if err == gorm.ErrRecordNotFound {
				newImg := img
				newImg.ID = 0
				if targetModelID != nil {
					newImg.ModelID = targetModelID
				}
				newImg.Tags = nil
				newImg.Resources = nil

				if err := tx.Create(&newImg).Error; err != nil {
					result.Warnings = append(result.Warnings, fmt.Sprintf("Failed to import image '%s': %v", img.Caption, err))
					continue
				}

				// Restore image tags
				if len(img.Tags) > 0 {
					var imgTags []models.Tag
					for _, t := range img.Tags {
						var tagRec models.Tag
						if tx.Where("slug = ? OR LOWER(name) = LOWER(?)", t.Slug, t.Name).First(&tagRec).Error == nil {
							imgTags = append(imgTags, tagRec)
						}
					}
					if len(imgTags) > 0 {
						_ = tx.Model(&newImg).Association("Tags").Replace(imgTags)
					}
				}

				// Restore image resources
				for _, res := range img.Resources {
					var resRec models.Resource
					if tx.Where("name = ? AND type = ?", res.Name, res.Type).First(&resRec).Error != nil {
						resRec = models.Resource{
							Name: res.Name,
							Type: res.Type,
						}
						_ = tx.Create(&resRec).Error
					}
					if resRec.ID > 0 {
						_ = tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&models.ImageResource{
							ImageID:    newImg.ID,
							ResourceID: resRec.ID,
							Weight:     1.0,
						}).Error
					}
				}

				result.ImagesImported++
			} else if err == nil {
				// Update metadata if empty in existing
				if existingImg.Caption == "" && img.Caption != "" {
					existingImg.Caption = img.Caption
				}
				if existingImg.PositivePrompt == "" && img.PositivePrompt != "" {
					existingImg.PositivePrompt = img.PositivePrompt
				}
				_ = tx.Save(&existingImg).Error
				result.ImagesImported++
			}
		}

		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("transaction failed during backup import: %w", err)
	}

	return result, nil
}

// ParseBackupJSON validates and parses JSON bytes
func ParseBackupJSON(content []byte) (*DatabaseBackupData, error) {
	var data DatabaseBackupData
	if err := json.Unmarshal(content, &data); err != nil {
		return nil, fmt.Errorf("invalid backup JSON format: %w", err)
	}
	if data.TotalModels == 0 && len(data.Models) == 0 && data.TotalImages == 0 && len(data.Images) == 0 {
		return nil, fmt.Errorf("backup file contains no models or images")
	}
	return &data, nil
}
