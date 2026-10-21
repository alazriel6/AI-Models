package repositories

import (
	"strings"

	"github.com/alazriel6/models-guide/backend/internal/models"
	"gorm.io/gorm"
)

type ControlNetRepository struct {
	db *gorm.DB
}

func NewControlNetRepository(db *gorm.DB) *ControlNetRepository {
	return &ControlNetRepository{db: db}
}

func (r *ControlNetRepository) FindPoses(category, search string) ([]models.ControlNetPose, error) {
	var poses []models.ControlNetPose
	query := r.db.Model(&models.ControlNetPose{})

	if category != "" && strings.ToLower(category) != "all" && strings.ToLower(category) != "semua" {
		query = query.Where("LOWER(category) = ?", strings.ToLower(category))
	}

	if search != "" {
		searchTerm := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(tags) LIKE ? OR LOWER(recommended_prompt) LIKE ?", searchTerm, searchTerm, searchTerm, searchTerm)
	}

	err := query.Order("is_system DESC, id ASC").Find(&poses).Error
	return poses, err
}

func (r *ControlNetRepository) FindPoseByID(id uint) (*models.ControlNetPose, error) {
	var pose models.ControlNetPose
	if err := r.db.First(&pose, id).Error; err != nil {
		return nil, err
	}
	return &pose, nil
}

func (r *ControlNetRepository) CreatePose(pose *models.ControlNetPose) error {
	return r.db.Create(pose).Error
}

func (r *ControlNetRepository) UpdatePose(pose *models.ControlNetPose) error {
	return r.db.Save(pose).Error
}

func (r *ControlNetRepository) DeletePose(id uint) error {
	return r.db.Delete(&models.ControlNetPose{}, id).Error
}

// ----------------------------------------------------------------------------
// ControlNet Models
// ----------------------------------------------------------------------------

func (r *ControlNetRepository) FindModels(baseModel, controlType, search string) ([]models.ControlNetModel, error) {
	var modelsList []models.ControlNetModel
	query := r.db.Model(&models.ControlNetModel{})

	if baseModel != "" && strings.ToLower(baseModel) != "all" && strings.ToLower(baseModel) != "semua" {
		query = query.Where("LOWER(base_model) = ?", strings.ToLower(baseModel))
	}

	if controlType != "" && strings.ToLower(controlType) != "all" && strings.ToLower(controlType) != "semua" {
		query = query.Where("LOWER(control_type) = ?", strings.ToLower(controlType))
	}

	if search != "" {
		searchTerm := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(filename) LIKE ? OR LOWER(author) LIKE ? OR LOWER(tags) LIKE ? OR LOWER(description) LIKE ?", searchTerm, searchTerm, searchTerm, searchTerm, searchTerm)
	}

	err := query.Order("is_system DESC, id ASC").Find(&modelsList).Error
	return modelsList, err
}

func (r *ControlNetRepository) FindModelByID(id uint) (*models.ControlNetModel, error) {
	var m models.ControlNetModel
	if err := r.db.First(&m, id).Error; err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *ControlNetRepository) CreateModel(m *models.ControlNetModel) error {
	return r.db.Create(m).Error
}

func (r *ControlNetRepository) UpdateModel(m *models.ControlNetModel) error {
	return r.db.Save(m).Error
}

func (r *ControlNetRepository) DeleteModel(id uint) error {
	return r.db.Delete(&models.ControlNetModel{}, id).Error
}

