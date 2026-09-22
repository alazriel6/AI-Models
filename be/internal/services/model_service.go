package services

import (
	"errors"
	"regexp"
	"strings"

	"github.com/alazriel6/models-guide/backend/internal/models"
	"github.com/alazriel6/models-guide/backend/internal/repositories"
	"gorm.io/gorm"
)

type CreateModelInput struct {
	Name           string `json:"name" binding:"required"`
	Slug           string `json:"slug"`
	Type           string `json:"type" binding:"required"`
	BaseModel      string `json:"base_model" binding:"required"`
	Author         string `json:"author"`
	Description    string `json:"description"`
	CivitaiURL     string `json:"civitai_url"`
	HuggingFaceURL string `json:"huggingface_url"`
	ThumbnailURL   string `json:"thumbnail_url"`
}

type UpdateModelInput struct {
	Name           *string `json:"name"`
	Slug           *string `json:"slug"`
	Type           *string `json:"type"`
	BaseModel      *string `json:"base_model"`
	Author         *string `json:"author"`
	Description    *string `json:"description"`
	CivitaiURL     *string `json:"civitai_url"`
	HuggingFaceURL *string `json:"huggingface_url"`
	ThumbnailURL   *string `json:"thumbnail_url"`
}

type ModelService struct {
	repo *repositories.ModelRepository
}

func NewModelService(repo *repositories.ModelRepository) *ModelService {
	return &ModelService{repo: repo}
}

func (s *ModelService) List(page, limit int, search, filterType, filterBase string) (*repositories.ModelListResult, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	return s.repo.FindAll(page, limit, search, filterType, filterBase)
}

func (s *ModelService) GetByID(id uint) (*models.Model, error) {
	return s.repo.FindByID(id)
}

func (s *ModelService) Create(input CreateModelInput) (*models.Model, error) {
	slug := strings.TrimSpace(input.Slug)
	if slug == "" {
		slug = GenerateSlug(input.Name)
	}

	model := &models.Model{
		Name:           strings.TrimSpace(input.Name),
		Slug:           slug,
		Type:           strings.TrimSpace(input.Type),
		BaseModel:      strings.TrimSpace(input.BaseModel),
		Author:         strings.TrimSpace(input.Author),
		Description:    strings.TrimSpace(input.Description),
		CivitaiURL:     strings.TrimSpace(input.CivitaiURL),
		HuggingFaceURL: strings.TrimSpace(input.HuggingFaceURL),
		ThumbnailURL:   strings.TrimSpace(input.ThumbnailURL),
	}

	if err := s.repo.Create(model); err != nil {
		return nil, err
	}

	return model, nil
}

func (s *ModelService) Update(id uint, input UpdateModelInput) (*models.Model, error) {
	model, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}

	if input.Name != nil {
		model.Name = strings.TrimSpace(*input.Name)
	}
	if input.Slug != nil && strings.TrimSpace(*input.Slug) != "" {
		model.Slug = strings.TrimSpace(*input.Slug)
	} else if input.Name != nil && (input.Slug == nil || strings.TrimSpace(*input.Slug) == "") {
		model.Slug = GenerateSlug(model.Name)
	}
	if input.Type != nil {
		model.Type = strings.TrimSpace(*input.Type)
	}
	if input.BaseModel != nil {
		model.BaseModel = strings.TrimSpace(*input.BaseModel)
	}
	if input.Author != nil {
		model.Author = strings.TrimSpace(*input.Author)
	}
	if input.Description != nil {
		model.Description = strings.TrimSpace(*input.Description)
	}
	if input.CivitaiURL != nil {
		model.CivitaiURL = strings.TrimSpace(*input.CivitaiURL)
	}
	if input.HuggingFaceURL != nil {
		model.HuggingFaceURL = strings.TrimSpace(*input.HuggingFaceURL)
	}
	if input.ThumbnailURL != nil {
		model.ThumbnailURL = strings.TrimSpace(*input.ThumbnailURL)
	}

	if err := s.repo.Update(model); err != nil {
		return nil, err
	}

	return model, nil
}

func (s *ModelService) Delete(id uint) error {
	_, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		return err
	}

	return s.repo.Delete(id)
}

func GenerateSlug(input string) string {
	s := strings.ToLower(strings.TrimSpace(input))
	reg := regexp.MustCompile(`[^a-z0-9]+`)
	s = reg.ReplaceAllString(s, "-")
	return strings.Trim(s, "-")
}
