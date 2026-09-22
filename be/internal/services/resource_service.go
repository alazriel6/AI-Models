package services

import (
	"strings"

	"github.com/alazriel6/models-guide/backend/internal/models"
	"github.com/alazriel6/models-guide/backend/internal/repositories"
	"gorm.io/datatypes"
)

type CreateResourceInput struct {
	Name     string         `json:"name" binding:"required"`
	Type     string         `json:"type" binding:"required"` // checkpoint, lora, vae, embedding
	Version  string         `json:"version"`
	URL      string         `json:"url"`
	Metadata datatypes.JSON `json:"metadata"`
}

type UpdateResourceInput struct {
	Name     *string         `json:"name"`
	Type     *string         `json:"type"`
	Version  *string         `json:"version"`
	URL      *string         `json:"url"`
	Metadata *datatypes.JSON `json:"metadata"`
}

type ResourceService struct {
	repo *repositories.ResourceRepository
}

func NewResourceService(repo *repositories.ResourceRepository) *ResourceService {
	return &ResourceService{repo: repo}
}

func (s *ResourceService) List(resourceType string) ([]models.Resource, error) {
	return s.repo.FindAll(resourceType)
}

func (s *ResourceService) GetByID(id uint) (*models.Resource, error) {
	return s.repo.FindByID(id)
}

func (s *ResourceService) Create(input CreateResourceInput) (*models.Resource, error) {
	resource := &models.Resource{
		Name:     strings.TrimSpace(input.Name),
		Type:     strings.TrimSpace(input.Type),
		Version:  strings.TrimSpace(input.Version),
		URL:      strings.TrimSpace(input.URL),
		Metadata: input.Metadata,
	}

	if err := s.repo.Create(resource); err != nil {
		return nil, err
	}

	return resource, nil
}

func (s *ResourceService) Update(id uint, input UpdateResourceInput) (*models.Resource, error) {
	resource, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}

	if input.Name != nil {
		resource.Name = strings.TrimSpace(*input.Name)
	}
	if input.Type != nil {
		resource.Type = strings.TrimSpace(*input.Type)
	}
	if input.Version != nil {
		resource.Version = strings.TrimSpace(*input.Version)
	}
	if input.URL != nil {
		resource.URL = strings.TrimSpace(*input.URL)
	}
	if input.Metadata != nil {
		resource.Metadata = *input.Metadata
	}

	if err := s.repo.Update(resource); err != nil {
		return nil, err
	}

	return resource, nil
}

func (s *ResourceService) Delete(id uint) error {
	if _, err := s.repo.FindByID(id); err != nil {
		return err
	}
	return s.repo.Delete(id)
}
