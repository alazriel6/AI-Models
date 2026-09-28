package repositories

import (
	"errors"
	"strings"

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

// AddTagToImage attaches a tag to an image via the image_tags join table.
func (r *TagRepository) AddTagToImage(imageID, tagID uint) error {
	img := models.ModelImage{ID: imageID}
	tag := models.Tag{ID: tagID}

	return r.DB.Model(&img).Association("Tags").Append(&tag)
}

// RemoveTagFromImage detaches a tag from an image.
func (r *TagRepository) RemoveTagFromImage(imageID, tagID uint) error {
	img := models.ModelImage{ID: imageID}
	tag := models.Tag{ID: tagID}

	return r.DB.Model(&img).Association("Tags").Delete(&tag)
}

// SetImageTags sets all tags for an image (replaces existing tags).
func (r *TagRepository) SetImageTags(imageID uint, tags []models.Tag) error {
	img := models.ModelImage{ID: imageID}
	return r.DB.Model(&img).Association("Tags").Replace(tags)
}

// FindOrCreateByNames finds or creates tags by a slice of tag names.
func (r *TagRepository) FindOrCreateByNames(names []string) ([]models.Tag, error) {
	var result []models.Tag
	seen := make(map[string]bool)

	for _, name := range names {
		cleanName := strings.TrimSpace(name)
		cleanName = strings.TrimPrefix(cleanName, "#")
		if cleanName == "" {
			continue
		}

		lower := strings.ToLower(cleanName)
		if seen[lower] {
			continue
		}
		seen[lower] = true

		slug := strings.ReplaceAll(lower, " ", "-")
		var sb strings.Builder
		for _, ch := range slug {
			if (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') || ch == '-' || ch == '_' {
				sb.WriteRune(ch)
			}
		}
		cleanSlug := sb.String()
		if cleanSlug == "" {
			cleanSlug = "tag"
		}

		var tag models.Tag
		if err := r.DB.Where("slug = ? OR LOWER(name) = ?", cleanSlug, lower).First(&tag).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				tag = models.Tag{
					Name: cleanName,
					Slug: cleanSlug,
				}
				if err := r.DB.Create(&tag).Error; err != nil {
					_ = r.DB.Where("slug = ?", cleanSlug).First(&tag)
				}
			}
		}

		if tag.ID > 0 {
			result = append(result, tag)
		}
	}

	return result, nil
}

