package repositories

import (
	"github.com/alazriel6/models-guide/backend/internal/models"
	"gorm.io/gorm"
)

type VersionRepository struct {
	DB *gorm.DB
}

func NewVersionRepository(db *gorm.DB) *VersionRepository {
	return &VersionRepository{DB: db}
}

func (r *VersionRepository) FindByModelID(modelID uint) ([]models.ModelVersion, error) {
	var versions []models.ModelVersion

	err := r.DB.
		Where("model_id = ?", modelID).
		Order("created_at DESC").
		Find(&versions).Error

	return versions, err
}

func (r *VersionRepository) FindByID(id uint) (*models.ModelVersion, error) {
	var version models.ModelVersion

	err := r.DB.First(&version, id).Error
	if err != nil {
		return nil, err
	}

	return &version, nil
}

func (r *VersionRepository) Create(version *models.ModelVersion) error {
	return r.DB.Create(version).Error
}

func (r *VersionRepository) Update(version *models.ModelVersion) error {
	return r.DB.Save(version).Error
}

func (r *VersionRepository) Delete(id uint) error {
	return r.DB.Delete(&models.ModelVersion{}, id).Error
}
