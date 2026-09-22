package repositories

import (
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
		Order("created_at DESC").
		Find(&images).Error

	return images, err
}

func (r *ImageRepository) FindByID(id uint) (*models.ModelImage, error) {
	var image models.ModelImage

	err := r.DB.
		Preload("Resources").
		First(&image, id).Error
	if err != nil {
		return nil, err
	}

	return &image, nil
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
