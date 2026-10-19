package repositories

import (
	"strings"

	"github.com/alazriel6/models-guide/backend/internal/models"
	"gorm.io/gorm"
)

type WorkflowRepository struct {
	db *gorm.DB
}

func NewWorkflowRepository(db *gorm.DB) *WorkflowRepository {
	return &WorkflowRepository{db: db}
}

func (r *WorkflowRepository) FindAll(baseModel, category, search string, modelID *uint) ([]models.Workflow, error) {
	var workflows []models.Workflow
	query := r.db.Model(&models.Workflow{})

	if baseModel != "" && strings.ToLower(baseModel) != "all" {
		query = query.Where("LOWER(base_model) = ?", strings.ToLower(baseModel))
	}

	if category != "" && strings.ToLower(category) != "all" {
		query = query.Where("LOWER(category) = ?", strings.ToLower(category))
	}

	if modelID != nil && *modelID > 0 {
		query = query.Where("model_id = ?", *modelID)
	}

	if search != "" {
		searchTerm := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(base_model) LIKE ?", searchTerm, searchTerm, searchTerm)
	}

	err := query.Preload("Model", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, name, slug, type, base_model, thumbnail_url")
	}).Order("created_at DESC").Find(&workflows).Error

	return workflows, err
}

func (r *WorkflowRepository) FindByID(id uint) (*models.Workflow, error) {
	var workflow models.Workflow
	err := r.db.Preload("Model", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, name, slug, type, base_model, thumbnail_url")
	}).First(&workflow, id).Error
	if err != nil {
		return nil, err
	}
	return &workflow, nil
}

func (r *WorkflowRepository) FindBySlug(slug string) (*models.Workflow, error) {
	var workflow models.Workflow
	err := r.db.Preload("Model", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, name, slug, type, base_model, thumbnail_url")
	}).Where("slug = ?", slug).First(&workflow).Error
	if err != nil {
		return nil, err
	}
	return &workflow, nil
}

func (r *WorkflowRepository) FindByModelID(modelID uint) ([]models.Workflow, error) {
	var workflows []models.Workflow
	err := r.db.Where("model_id = ?", modelID).Order("created_at ASC").Find(&workflows).Error
	return workflows, err
}

func (r *WorkflowRepository) Create(w *models.Workflow) error {
	return r.db.Create(w).Error
}

func (r *WorkflowRepository) Update(w *models.Workflow) error {
	return r.db.Save(w).Error
}

func (r *WorkflowRepository) Delete(id uint) error {
	return r.db.Delete(&models.Workflow{}, id).Error
}

func (r *WorkflowRepository) Count() (int64, error) {
	var count int64
	err := r.db.Model(&models.Workflow{}).Count(&count).Error
	return count, err
}
