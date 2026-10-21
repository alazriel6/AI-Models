package services

import (
	"strings"

	"github.com/alazriel6/models-guide/backend/internal/models"
	"github.com/alazriel6/models-guide/backend/internal/repositories"
)

type CreateControlNetPoseInput struct {
	Title             string `json:"title" binding:"required"`
	Category          string `json:"category"`
	Tags              string `json:"tags"`
	Description       string `json:"description"`
	RecommendedPrompt string `json:"recommended_prompt"`
	KeypointsData     string `json:"keypoints_data" binding:"required"`
	CanvasWidth       int    `json:"canvas_width"`
	CanvasHeight      int    `json:"canvas_height"`
	IsSystem          bool   `json:"is_system"`
}

type UpdateControlNetPoseInput struct {
	Title             *string `json:"title"`
	Category          *string `json:"category"`
	Tags              *string `json:"tags"`
	Description       *string `json:"description"`
	RecommendedPrompt *string `json:"recommended_prompt"`
	KeypointsData     *string `json:"keypoints_data"`
	CanvasWidth       *int    `json:"canvas_width"`
	CanvasHeight      *int    `json:"canvas_height"`
	IsSystem          *bool   `json:"is_system"`
}

type ControlNetService struct {
	repo *repositories.ControlNetRepository
}

func NewControlNetService(repo *repositories.ControlNetRepository) *ControlNetService {
	return &ControlNetService{repo: repo}
}

func (s *ControlNetService) ListPoses(category, search string) ([]models.ControlNetPose, error) {
	return s.repo.FindPoses(category, search)
}

func (s *ControlNetService) GetPoseByID(id uint) (*models.ControlNetPose, error) {
	return s.repo.FindPoseByID(id)
}

func (s *ControlNetService) CreatePose(input CreateControlNetPoseInput) (*models.ControlNetPose, error) {
	category := strings.TrimSpace(input.Category)
	if category == "" {
		category = "Standing & Model"
	}

	w := input.CanvasWidth
	if w <= 0 {
		w = 512
	}
	h := input.CanvasHeight
	if h <= 0 {
		h = 768
	}

	pose := &models.ControlNetPose{
		Title:             strings.TrimSpace(input.Title),
		Category:          category,
		Tags:              strings.TrimSpace(input.Tags),
		Description:       strings.TrimSpace(input.Description),
		RecommendedPrompt: strings.TrimSpace(input.RecommendedPrompt),
		KeypointsData:     input.KeypointsData,
		CanvasWidth:       w,
		CanvasHeight:      h,
		IsSystem:          input.IsSystem,
	}

	if err := s.repo.CreatePose(pose); err != nil {
		return nil, err
	}
	return pose, nil
}

func (s *ControlNetService) UpdatePose(id uint, input UpdateControlNetPoseInput) (*models.ControlNetPose, error) {
	pose, err := s.repo.FindPoseByID(id)
	if err != nil {
		return nil, err
	}

	if input.Title != nil {
		pose.Title = strings.TrimSpace(*input.Title)
	}
	if input.Category != nil {
		pose.Category = strings.TrimSpace(*input.Category)
	}
	if input.Tags != nil {
		pose.Tags = strings.TrimSpace(*input.Tags)
	}
	if input.Description != nil {
		pose.Description = strings.TrimSpace(*input.Description)
	}
	if input.RecommendedPrompt != nil {
		pose.RecommendedPrompt = strings.TrimSpace(*input.RecommendedPrompt)
	}
	if input.KeypointsData != nil {
		pose.KeypointsData = *input.KeypointsData
	}
	if input.CanvasWidth != nil && *input.CanvasWidth > 0 {
		pose.CanvasWidth = *input.CanvasWidth
	}
	if input.CanvasHeight != nil && *input.CanvasHeight > 0 {
		pose.CanvasHeight = *input.CanvasHeight
	}
	if input.IsSystem != nil {
		pose.IsSystem = *input.IsSystem
	}

	if err := s.repo.UpdatePose(pose); err != nil {
		return nil, err
	}
	return pose, nil
}

func (s *ControlNetService) DeletePose(id uint) error {
	return s.repo.DeletePose(id)
}

// ----------------------------------------------------------------------------
// ControlNet Models
// ----------------------------------------------------------------------------

type CreateControlNetModelInput struct {
	Name                  string `json:"name" binding:"required"`
	Filename              string `json:"filename" binding:"required"`
	BaseModel             string `json:"base_model" binding:"required"`
	ControlType           string `json:"control_type" binding:"required"`
	Author                string `json:"author"`
	Filesize              string `json:"filesize"`
	Vram                  string `json:"vram"`
	RecommendedWeight     string `json:"recommended_weight"`
	RecommendedEndingStep string `json:"recommended_ending_step"`
	ControlMode           string `json:"control_mode"`
	HuggingFaceURL         string `json:"huggingface_url"`
	Description           string `json:"description"`
	ComfyNode             string `json:"comfy_node"`
	WebuiParam            string `json:"webui_param"`
	Tags                  string `json:"tags"`
	IsSystem              bool   `json:"is_system"`
}

type UpdateControlNetModelInput struct {
	Name                  *string `json:"name"`
	Filename              *string `json:"filename"`
	BaseModel             *string `json:"base_model"`
	ControlType           *string `json:"control_type"`
	Author                *string `json:"author"`
	Filesize              *string `json:"filesize"`
	Vram                  *string `json:"vram"`
	RecommendedWeight     *string `json:"recommended_weight"`
	RecommendedEndingStep *string `json:"recommended_ending_step"`
	ControlMode           *string `json:"control_mode"`
	HuggingFaceURL         *string `json:"huggingface_url"`
	Description           *string `json:"description"`
	ComfyNode             *string `json:"comfy_node"`
	WebuiParam            *string `json:"webui_param"`
	Tags                  *string `json:"tags"`
	IsSystem              *bool   `json:"is_system"`
}

func (s *ControlNetService) ListModels(baseModel, controlType, search string) ([]models.ControlNetModel, error) {
	return s.repo.FindModels(baseModel, controlType, search)
}

func (s *ControlNetService) GetModelByID(id uint) (*models.ControlNetModel, error) {
	return s.repo.FindModelByID(id)
}

func (s *ControlNetService) CreateModel(input CreateControlNetModelInput) (*models.ControlNetModel, error) {
	m := &models.ControlNetModel{
		Name:                  strings.TrimSpace(input.Name),
		Filename:              strings.TrimSpace(input.Filename),
		BaseModel:             strings.TrimSpace(input.BaseModel),
		ControlType:           strings.TrimSpace(input.ControlType),
		Author:                strings.TrimSpace(input.Author),
		Filesize:              strings.TrimSpace(input.Filesize),
		Vram:                  strings.TrimSpace(input.Vram),
		RecommendedWeight:     strings.TrimSpace(input.RecommendedWeight),
		RecommendedEndingStep: strings.TrimSpace(input.RecommendedEndingStep),
		ControlMode:           strings.TrimSpace(input.ControlMode),
		HuggingFaceURL:         strings.TrimSpace(input.HuggingFaceURL),
		Description:           strings.TrimSpace(input.Description),
		ComfyNode:             strings.TrimSpace(input.ComfyNode),
		WebuiParam:            strings.TrimSpace(input.WebuiParam),
		Tags:                  strings.TrimSpace(input.Tags),
		IsSystem:              input.IsSystem,
	}

	if err := s.repo.CreateModel(m); err != nil {
		return nil, err
	}
	return m, nil
}

func (s *ControlNetService) UpdateModel(id uint, input UpdateControlNetModelInput) (*models.ControlNetModel, error) {
	m, err := s.repo.FindModelByID(id)
	if err != nil {
		return nil, err
	}

	if input.Name != nil {
		m.Name = strings.TrimSpace(*input.Name)
	}
	if input.Filename != nil {
		m.Filename = strings.TrimSpace(*input.Filename)
	}
	if input.BaseModel != nil {
		m.BaseModel = strings.TrimSpace(*input.BaseModel)
	}
	if input.ControlType != nil {
		m.ControlType = strings.TrimSpace(*input.ControlType)
	}
	if input.Author != nil {
		m.Author = strings.TrimSpace(*input.Author)
	}
	if input.Filesize != nil {
		m.Filesize = strings.TrimSpace(*input.Filesize)
	}
	if input.Vram != nil {
		m.Vram = strings.TrimSpace(*input.Vram)
	}
	if input.RecommendedWeight != nil {
		m.RecommendedWeight = strings.TrimSpace(*input.RecommendedWeight)
	}
	if input.RecommendedEndingStep != nil {
		m.RecommendedEndingStep = strings.TrimSpace(*input.RecommendedEndingStep)
	}
	if input.ControlMode != nil {
		m.ControlMode = strings.TrimSpace(*input.ControlMode)
	}
	if input.HuggingFaceURL != nil {
		m.HuggingFaceURL = strings.TrimSpace(*input.HuggingFaceURL)
	}
	if input.Description != nil {
		m.Description = strings.TrimSpace(*input.Description)
	}
	if input.ComfyNode != nil {
		m.ComfyNode = strings.TrimSpace(*input.ComfyNode)
	}
	if input.WebuiParam != nil {
		m.WebuiParam = strings.TrimSpace(*input.WebuiParam)
	}
	if input.Tags != nil {
		m.Tags = strings.TrimSpace(*input.Tags)
	}
	if input.IsSystem != nil {
		m.IsSystem = *input.IsSystem
	}

	if err := s.repo.UpdateModel(m); err != nil {
		return nil, err
	}
	return m, nil
}

func (s *ControlNetService) DeleteModel(id uint) error {
	return s.repo.DeleteModel(id)
}

