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
		catLower := strings.ToLower(category)
		if catLower == "female (wanita)" || catLower == "female" || catLower == "wanita" {
			query = query.Where("(LOWER(category) LIKE ? OR LOWER(tags) LIKE ? OR LOWER(recommended_prompt) LIKE ?) AND LOWER(category) NOT LIKE ? AND LOWER(category) NOT LIKE ? AND LOWER(recommended_prompt) NOT LIKE ? AND LOWER(tags) NOT LIKE ?", "%female%", "%female%", "%1girl%", "%duo%", "%couples%", "%1boy%", "%1boy%")
		} else if catLower == "male (pria)" || catLower == "male" || catLower == "pria" {
			query = query.Where("(LOWER(category) LIKE ? OR LOWER(tags) LIKE ? OR LOWER(recommended_prompt) LIKE ?) AND LOWER(category) NOT LIKE ? AND LOWER(category) NOT LIKE ? AND LOWER(recommended_prompt) NOT LIKE ? AND LOWER(tags) NOT LIKE ?", "%male%", "%male%", "%1boy%", "%duo%", "%couples%", "%1girl%", "%1girl%")
		} else {
			query = query.Where("LOWER(category) = ?", catLower)
		}
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

