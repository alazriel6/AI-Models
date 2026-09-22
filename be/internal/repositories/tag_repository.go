package repositories

import (
	"github.com/alazriel6/models-guide/backend/internal/models"
	"gorm.io/gorm"
)

type TagRepository struct {
	DB *gorm.DB
}

func NewTagRepository(db *gorm.DB) *TagRepository {
	return &TagRepository{DB: db}
}

func (r *TagRepository) FindAll() ([]models.Tag, error) {
	var tags []models.Tag

	err := r.DB.Order("name ASC").Find(&tags).Error

	return tags, err
}

func (r *TagRepository) FindByID(id uint) (*models.Tag, error) {
	var tag models.Tag

	err := r.DB.First(&tag, id).Error
	if err != nil {
		return nil, err
	}

	return &tag, nil
}

func (r *TagRepository) FindBySlug(slug string) (*models.Tag, error) {
	var tag models.Tag

	err := r.DB.Where("slug = ?", slug).First(&tag).Error
	if err != nil {
		return nil, err
	}

	return &tag, nil
}

func (r *TagRepository) Create(tag *models.Tag) error {
	return r.DB.Create(tag).Error
}

// AddTagToModel attaches a tag to a model via the model_tags join table.
func (r *TagRepository) AddTagToModel(modelID, tagID uint) error {
	model := models.Model{ID: modelID}
	tag := models.Tag{ID: tagID}

	return r.DB.Model(&model).Association("Tags").Append(&tag)
}

// RemoveTagFromModel detaches a tag from a model.
func (r *TagRepository) RemoveTagFromModel(modelID, tagID uint) error {
	model := models.Model{ID: modelID}
	tag := models.Tag{ID: tagID}

	return r.DB.Model(&model).Association("Tags").Delete(&tag)
}
