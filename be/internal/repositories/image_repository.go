package repositories

import (
	"strings"

	"github.com/alazriel6/models-guide/backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ImageRepository struct {
	DB *gorm.DB
}

func NewImageRepository(db *gorm.DB) *ImageRepository {
	return &ImageRepository{DB: db}
}

func (r *ImageRepository) FindByModelID(modelID uint) ([]models.ModelImage, error) {
	var images []models.ModelImage

	err := r.DB.
		Where("model_id = ?", modelID).
		Preload("Resources").
		Preload("Model").
		Preload("Tags").
		Order("created_at DESC").
		Find(&images).Error

	return images, err
}

func (r *ImageRepository) FindByID(id uint) (*models.ModelImage, error) {
	var image models.ModelImage

	err := r.DB.
		Preload("Resources").
		Preload("Model").
		Preload("Tags").
		First(&image, id).Error
	if err != nil {
		return nil, err
	}

	return &image, nil
}

type ImageFilter struct {
	ModelID   uint
	Tag       string
	Search    string
	BaseModel string
	Sort      string
	Limit     int
	Offset    int
}

func (r *ImageRepository) FindAll(filter ImageFilter) ([]models.ModelImage, int64, error) {
	var images []models.ModelImage
	var total int64

	query := r.DB.Model(&models.ModelImage{}).
		Preload("Resources").
		Preload("Model").
		Preload("Tags")

	if filter.Tag != "" {
		cleanTag := strings.TrimPrefix(strings.TrimSpace(filter.Tag), "#")
		query = query.Joins("JOIN image_tags ON image_tags.image_id = model_images.id").
			Joins("JOIN tags ON tags.id = image_tags.tag_id").
			Where("tags.slug ILIKE ? OR LOWER(tags.name) = ?", strings.ToLower(cleanTag), strings.ToLower(cleanTag))
	}

	if filter.ModelID > 0 {
		query = query.Where("model_images.model_id = ?", filter.ModelID)
	}

	if filter.Search != "" {
		cleanSearch := strings.TrimSpace(filter.Search)
		tagSearch := strings.ToLower(strings.TrimPrefix(cleanSearch, "#"))
		s := "%" + cleanSearch + "%"
		ts := "%" + tagSearch + "%"

		query = query.Joins("LEFT JOIN models ON models.id = model_images.model_id").
			Where(
				"model_images.caption ILIKE ? OR "+
					"model_images.positive_prompt ILIKE ? OR "+
					"model_images.model_name ILIKE ? OR "+
					"models.name ILIKE ? OR "+
					"EXISTS (SELECT 1 FROM image_tags it JOIN tags t ON t.id = it.tag_id WHERE it.image_id = model_images.id AND (LOWER(t.name) LIKE ? OR t.slug LIKE ?))",
				s, s, s, s, ts, ts,
			)
	}

	if filter.BaseModel != "" {
		if filter.Search == "" {
			query = query.Joins("LEFT JOIN models ON models.id = model_images.model_id")
		}
		query = query.Where("models.base_model ILIKE ? OR model_images.model_name ILIKE ?", filter.BaseModel, "%"+filter.BaseModel+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	switch filter.Sort {
	case "oldest":
		query = query.Order("model_images.created_at ASC")
	case "steps_desc":
		query = query.Order("model_images.steps DESC, model_images.created_at DESC")
	case "steps_asc":
		query = query.Order("model_images.steps ASC, model_images.created_at DESC")
	case "newest":
		fallthrough
	default:
		query = query.Order("model_images.created_at DESC")
	}

	if filter.Limit > 0 {
		query = query.Limit(filter.Limit)
	}
	if filter.Offset > 0 {
		query = query.Offset(filter.Offset)
	}

	if err := query.Find(&images).Error; err != nil {
		return nil, 0, err
	}

	return images, total, nil
}

func (r *ImageRepository) Create(image *models.ModelImage) error {
	return r.DB.Create(image).Error
}

func (r *ImageRepository) Update(image *models.ModelImage) error {
	return r.DB.Save(image).Error
}

func (r *ImageRepository) Delete(id uint) error {
	return r.DB.Delete(&models.ModelImage{}, id).Error
}

// AddResource attaches a resource to an image with an optional weight.
func (r *ImageRepository) AddResource(imageID, resourceID uint, weight float64) error {
	ir := models.ImageResource{
		ImageID:    imageID,
		ResourceID: resourceID,
		Weight:     weight,
	}

	return r.DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "image_id"}, {Name: "resource_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"weight"}),
	}).Create(&ir).Error
}

// RemoveResource detaches a resource from an image.
func (r *ImageRepository) RemoveResource(imageID, resourceID uint) error {
	return r.DB.
		Where("image_id = ? AND resource_id = ?", imageID, resourceID).
		Delete(&models.ImageResource{}).Error
}
