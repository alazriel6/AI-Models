package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/alazriel6/models-guide/backend/internal/models"
	"github.com/alazriel6/models-guide/backend/internal/repositories"
)

type WorkflowService struct {
	repo *repositories.WorkflowRepository
}

func NewWorkflowService(repo *repositories.WorkflowRepository) *WorkflowService {
	return &WorkflowService{repo: repo}
}

type CreateWorkflowRequest struct {
	Name                string `json:"name" binding:"required"`
	Slug                string `json:"slug"`
	Description         string `json:"description"`
	BaseModel           string `json:"base_model"`
	Category            string `json:"category"`
	WorkflowJSON        string `json:"workflow_json" binding:"required"`
	ModelID             *uint  `json:"model_id"`
	Author              string `json:"author"`
	RequiredCustomNodes string `json:"required_custom_nodes"`
	ThumbnailURL        string `json:"thumbnail_url"`
}

type UpdateWorkflowRequest struct {
	Name                string `json:"name"`
	Slug                string `json:"slug"`
	Description         string `json:"description"`
	BaseModel           string `json:"base_model"`
	Category            string `json:"category"`
	WorkflowJSON        string `json:"workflow_json"`
	ModelID             *uint  `json:"model_id"`
	Author              string `json:"author"`
	RequiredCustomNodes string `json:"required_custom_nodes"`
	ThumbnailURL        string `json:"thumbnail_url"`
}

func (s *WorkflowService) ListWorkflows(baseModel, category, search string, modelID *uint) ([]models.Workflow, error) {
	return s.repo.FindAll(baseModel, category, search, modelID)
}

func (s *WorkflowService) GetWorkflow(id uint) (*models.Workflow, error) {
	return s.repo.FindByID(id)
}

func (s *WorkflowService) GetWorkflowBySlug(slug string) (*models.Workflow, error) {
	return s.repo.FindBySlug(slug)
}

func (s *WorkflowService) GetWorkflowsByModel(modelID uint) ([]models.Workflow, error) {
	return s.repo.FindByModelID(modelID)
}

func (s *WorkflowService) CreateWorkflow(req CreateWorkflowRequest) (*models.Workflow, error) {
	if strings.TrimSpace(req.Name) == "" {
		return nil, errors.New("workflow name is required")
	}

	slug := req.Slug
	if slug == "" {
		slug = generateSlug(req.Name)
	}

	// Validate or inspect JSON to calculate total_nodes
	totalNodes := countNodesFromJSON(req.WorkflowJSON)

	baseModel := req.BaseModel
	if baseModel == "" {
		baseModel = "SDXL"
	}

	category := req.Category
	if category == "" {
		category = "txt2img"
	}

	workflow := &models.Workflow{
		Name:                req.Name,
		Slug:                slug,
		Description:         req.Description,
		BaseModel:           baseModel,
		Category:            category,
		WorkflowJSON:        req.WorkflowJSON,
		ModelID:             req.ModelID,
		Author:              req.Author,
		RequiredCustomNodes: req.RequiredCustomNodes,
		ThumbnailURL:        req.ThumbnailURL,
		TotalNodes:          totalNodes,
	}

	if err := s.repo.Create(workflow); err != nil {
		return nil, err
	}

	return workflow, nil
}

func (s *WorkflowService) UpdateWorkflow(id uint, req UpdateWorkflowRequest) (*models.Workflow, error) {
	workflow, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}

	if req.Name != "" {
		workflow.Name = req.Name
	}
	if req.Slug != "" {
		workflow.Slug = req.Slug
	}
	if req.Description != "" {
		workflow.Description = req.Description
	}
	if req.BaseModel != "" {
		workflow.BaseModel = req.BaseModel
	}
	if req.Category != "" {
		workflow.Category = req.Category
	}
	if req.WorkflowJSON != "" {
		workflow.WorkflowJSON = req.WorkflowJSON
		workflow.TotalNodes = countNodesFromJSON(req.WorkflowJSON)
	}
	if req.ModelID != nil {
		workflow.ModelID = req.ModelID
	}
	if req.Author != "" {
		workflow.Author = req.Author
	}
	if req.RequiredCustomNodes != "" {
		workflow.RequiredCustomNodes = req.RequiredCustomNodes
	}
	if req.ThumbnailURL != "" {
		workflow.ThumbnailURL = req.ThumbnailURL
	}

	if err := s.repo.Update(workflow); err != nil {
		return nil, err
	}

	return workflow, nil
}

func (s *WorkflowService) DeleteWorkflow(id uint) error {
	return s.repo.Delete(id)
}

func countNodesFromJSON(rawJSON string) int {
	if rawJSON == "" {
		return 0
	}

	// Try parsing standard ComfyUI web format: { "nodes": [ ... ] }
	var graph struct {
		Nodes []interface{} `json:"nodes"`
	}
	if err := json.Unmarshal([]byte(rawJSON), &graph); err == nil && len(graph.Nodes) > 0 {
		return len(graph.Nodes)
	}

	// Try parsing ComfyUI API format: { "1": { "class_type": ... }, "2": ... }
	var apiMap map[string]interface{}
	if err := json.Unmarshal([]byte(rawJSON), &apiMap); err == nil && len(apiMap) > 0 {
		return len(apiMap)
	}

	return 0
}

func generateSlug(title string) string {
	slug := strings.ToLower(title)
	reg := regexp.MustCompile("[^a-z0-9]+")
	slug = reg.ReplaceAllString(slug, "-")
	slug = strings.Trim(slug, "-")
	if slug == "" {
		slug = fmt.Sprintf("wf-%d", strings.Count(title, ""))
	}
	return slug
}
