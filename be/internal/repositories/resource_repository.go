package repositories

import (
	"github.com/alazriel6/models-guide/backend/internal/models"
	"gorm.io/gorm"
)

type ResourceRepository struct {
	DB *gorm.DB
}

func NewResourceRepository(db *gorm.DB) *ResourceRepository {
	return &ResourceRepository{DB: db}
}

func (r *ResourceRepository) FindAll(resourceType string) ([]models.Resource, error) {
	var resources []models.Resource

	query := r.DB.Model(&models.Resource{})
	if resourceType != "" {
		query = query.Where("type = ?", resourceType)
	}

	err := query.Order("name ASC").Find(&resources).Error
	return resources, err
}

func (r *ResourceRepository) FindByID(id uint) (*models.Resource, error) {
	var resource models.Resource

	err := r.DB.First(&resource, id).Error
	if err != nil {
		return nil, err
	}

	return &resource, nil
}

func (r *ResourceRepository) Create(resource *models.Resource) error {
	return r.DB.Create(resource).Error
}

func (r *ResourceRepository) Update(resource *models.Resource) error {
	return r.DB.Save(resource).Error
}

func (r *ResourceRepository) Delete(id uint) error {
	return r.DB.Delete(&models.Resource{}, id).Error
}
