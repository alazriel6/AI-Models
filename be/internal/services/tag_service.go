package services

import (
	"strings"

	"github.com/alazriel6/models-guide/backend/internal/models"
	"github.com/alazriel6/models-guide/backend/internal/repositories"
)

type CreateTagInput struct {
	Name string `json:"name" binding:"required"`
	Slug string `json:"slug"`
}

type TagService struct {
	tagRepo   *repositories.TagRepository
	modelRepo *repositories.ModelRepository
}

func NewTagService(tagRepo *repositories.TagRepository, modelRepo *repositories.ModelRepository) *TagService {
	return &TagService{
		tagRepo:   tagRepo,
		modelRepo: modelRepo,
	}
}

func (s *TagService) List() ([]models.Tag, error) {
	return s.tagRepo.FindAll()
}

func (s *TagService) GetByID(id uint) (*models.Tag, error) {
	return s.tagRepo.FindByID(id)
}

func (s *TagService) Create(input CreateTagInput) (*models.Tag, error) {
	slug := strings.TrimSpace(input.Slug)
	if slug == "" {
		slug = GenerateSlug(input.Name)
	}

	tag := &models.Tag{
		Name: strings.TrimSpace(input.Name),
		Slug: slug,
	}

	if err := s.tagRepo.Create(tag); err != nil {
		return nil, err
	}

	return tag, nil
}

func (s *TagService) AttachToModel(modelID, tagID uint) error {
	if _, err := s.modelRepo.FindByID(modelID); err != nil {
		return err
	}
	if _, err := s.tagRepo.FindByID(tagID); err != nil {
		return err
	}
	return s.tagRepo.AddTagToModel(modelID, tagID)
}

func (s *TagService) DetachFromModel(modelID, tagID uint) error {
	if _, err := s.modelRepo.FindByID(modelID); err != nil {
		return err
	}
	if _, err := s.tagRepo.FindByID(tagID); err != nil {
		return err
	}
	return s.tagRepo.RemoveTagFromModel(modelID, tagID)
}
