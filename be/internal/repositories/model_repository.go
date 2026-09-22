package repositories

import (
	"math"
	"strconv"

	"github.com/alazriel6/models-guide/backend/internal/models"
	"gorm.io/gorm"
)

type PaginationResult struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

type ModelListResult struct {
	Data       []models.Model   `json:"data"`
	Pagination PaginationResult `json:"pagination"`
}

type ModelRepository struct {
	DB *gorm.DB
}

func NewModelRepository(db *gorm.DB) *ModelRepository {
	return &ModelRepository{DB: db}
}

func (r *ModelRepository) FindAll(page, limit int, search, filterType, filterBase string) (*ModelListResult, error) {
	var modelList []models.Model
	var total int64

	query := r.DB.Model(&models.Model{})

	if search != "" {
		keyword := "%" + search + "%"
		query = query.Where(
			"name ILIKE ? OR slug ILIKE ? OR author ILIKE ? OR base_model ILIKE ?",
			keyword, keyword, keyword, keyword,
		)
	}

	if filterType != "" {
		query = query.Where("type = ?", filterType)
	}

	if filterBase != "" {
		query = query.Where("base_model = ?", filterBase)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	offset := (page - 1) * limit

	err := query.
		Preload("Tags").
		Preload("TriggerWords").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&modelList).Error

	if err != nil {
		return nil, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	return &ModelListResult{
		Data: modelList,
		Pagination: PaginationResult{
			Page:       page,
			Limit:      limit,
			Total:      int(total),
			TotalPages: totalPages,
		},
	}, nil
}

func (r *ModelRepository) FindByID(id uint) (*models.Model, error) {
	var model models.Model

	err := r.DB.
		Preload("Tags").
		Preload("TriggerWords").
		Preload("Reviews").
		Preload("Images").
		Preload("Images.Resources").
		Preload("Versions").
		First(&model, id).Error

	if err != nil {
		return nil, err
	}

	return &model, nil
}

func (r *ModelRepository) FindByIDOrSlug(identifier string) (*models.Model, error) {
	var model models.Model

	query := r.DB.
		Preload("Tags").
		Preload("TriggerWords").
		Preload("Reviews").
		Preload("Images").
		Preload("Images.Resources").
		Preload("Versions")

	if id, err := strconv.ParseUint(identifier, 10, 32); err == nil {
		if err := query.Where("id = ? OR slug = ?", id, identifier).First(&model).Error; err == nil {
			return &model, nil
		}
	}

	err := query.Where("slug = ?", identifier).First(&model).Error
	if err != nil {
		return nil, err
	}

	return &model, nil
}

func (r *ModelRepository) Create(model *models.Model) error {
	return r.DB.Create(model).Error
}

func (r *ModelRepository) Update(model *models.Model) error {
	return r.DB.Save(model).Error
}

func (r *ModelRepository) Delete(id uint) error {
	return r.DB.Delete(&models.Model{}, id).Error
}
