package services

import (
	"errors"
	"strings"

	"github.com/alazriel6/models-guide/backend/internal/models"
	"github.com/alazriel6/models-guide/backend/internal/repositories"
)

type WorkflowCategoryService struct {
	repo *repositories.WorkflowCategoryRepository
}

func NewWorkflowCategoryService(repo *repositories.WorkflowCategoryRepository) *WorkflowCategoryService {
	return &WorkflowCategoryService{repo: repo}
}

type CreateWorkflowCategoryInput struct {
	Name        string `json:"name" binding:"required"`
	Slug        string `json:"slug"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
	Color       string `json:"color"`
	SortOrder   int    `json:"sort_order"`
}

type UpdateWorkflowCategoryInput struct {
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
	Color       string `json:"color"`
	SortOrder   int    `json:"sort_order"`
}

func (s *WorkflowCategoryService) ListCategories() ([]models.WorkflowCategory, error) {
	return s.repo.FindAll()
}

func (s *WorkflowCategoryService) GetCategory(id uint) (*models.WorkflowCategory, error) {
	return s.repo.FindByID(id)
}

func (s *WorkflowCategoryService) CreateCategory(input CreateWorkflowCategoryInput) (*models.WorkflowCategory, error) {
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, errors.New("category name is required")
	}

	slug := strings.TrimSpace(input.Slug)
	if slug == "" {
		slug = GenerateSlug(name)
	}

	color := strings.TrimSpace(input.Color)
	if color == "" {
		color = "#2563eb"
	}

	cat := &models.WorkflowCategory{
		Name:        name,
		Slug:        slug,
		Description: strings.TrimSpace(input.Description),
		Icon:        strings.TrimSpace(input.Icon),
		Color:       color,
		SortOrder:   input.SortOrder,
	}

	if err := s.repo.Create(cat); err != nil {
		return nil, err
	}

	return cat, nil
}

func (s *WorkflowCategoryService) UpdateCategory(id uint, input UpdateWorkflowCategoryInput) (*models.WorkflowCategory, error) {
	cat, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}

	if input.Name != "" {
		cat.Name = strings.TrimSpace(input.Name)
	}
	if input.Slug != "" {
		cat.Slug = strings.TrimSpace(input.Slug)
	}
	if input.Description != "" {
		cat.Description = strings.TrimSpace(input.Description)
	}
	if input.Icon != "" {
		cat.Icon = strings.TrimSpace(input.Icon)
	}
	if input.Color != "" {
		cat.Color = strings.TrimSpace(input.Color)
	}
	if input.SortOrder != 0 {
		cat.SortOrder = input.SortOrder
	}

	if err := s.repo.Update(cat); err != nil {
		return nil, err
	}

	return cat, nil
}

func (s *WorkflowCategoryService) DeleteCategory(id uint) error {
	return s.repo.Delete(id)
}
