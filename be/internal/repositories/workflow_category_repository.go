package repositories

import (
	"github.com/alazriel6/models-guide/backend/internal/models"
	"gorm.io/gorm"
)

type WorkflowCategoryRepository struct {
	DB *gorm.DB
}

func NewWorkflowCategoryRepository(db *gorm.DB) *WorkflowCategoryRepository {
	return &WorkflowCategoryRepository{DB: db}
}

func (r *WorkflowCategoryRepository) FindAll() ([]models.WorkflowCategory, error) {
	var categories []models.WorkflowCategory
	err := r.DB.Order("sort_order ASC, name ASC").Find(&categories).Error
	return categories, err
}

func (r *WorkflowCategoryRepository) FindByID(id uint) (*models.WorkflowCategory, error) {
	var category models.WorkflowCategory
	err := r.DB.First(&category, id).Error
	if err != nil {
		return nil, err
	}
	return &category, nil
}

func (r *WorkflowCategoryRepository) FindBySlug(slug string) (*models.WorkflowCategory, error) {
	var category models.WorkflowCategory
	err := r.DB.Where("slug = ?", slug).First(&category).Error
	if err != nil {
		return nil, err
	}
	return &category, nil
}

func (r *WorkflowCategoryRepository) Create(cat *models.WorkflowCategory) error {
	return r.DB.Create(cat).Error
}

func (r *WorkflowCategoryRepository) Update(cat *models.WorkflowCategory) error {
	return r.DB.Save(cat).Error
}

func (r *WorkflowCategoryRepository) Delete(id uint) error {
	return r.DB.Delete(&models.WorkflowCategory{}, id).Error
}
