package services

import (
	"strings"

	"github.com/alazriel6/models-guide/backend/internal/models"
	"github.com/alazriel6/models-guide/backend/internal/repositories"
)

type CreateNegativePresetInput struct {
	Title          string `json:"title" binding:"required"`
	Architecture   string `json:"architecture" binding:"required"`
	Category       string `json:"category"`
	Description    string `json:"description"`
	Prompt         string `json:"prompt" binding:"required"`
	RecommendedCFG string `json:"recommended_cfg"`
	Tags           string `json:"tags"`
	IsSystem       bool   `json:"is_system"`
}

type UpdateNegativePresetInput struct {
	Title          *string `json:"title"`
	Architecture   *string `json:"architecture"`
	Category       *string `json:"category"`
	Description    *string `json:"description"`
	Prompt         *string `json:"prompt"`
	RecommendedCFG *string `json:"recommended_cfg"`
	Tags           *string `json:"tags"`
	IsSystem       *bool   `json:"is_system"`
}

type CreateEmbeddingInput struct {
	Name           string `json:"name" binding:"required"`
	Filename       string `json:"filename" binding:"required"`
	Architecture   string `json:"architecture" binding:"required"`
	Filesize       string `json:"filesize"`
	Description    string `json:"description"`
	A1111Trigger   string `json:"a1111_trigger"`
	ComfyTrigger   string `json:"comfy_trigger"`
	DownloadURL    string `json:"download_url"`
	SuppressedTags string `json:"suppressed_tags"`
	IsSystem       bool   `json:"is_system"`
}

type UpdateEmbeddingInput struct {
	Name           *string `json:"name"`
	Filename       *string `json:"filename"`
	Architecture   *string `json:"architecture"`
	Filesize       *string `json:"filesize"`
	Description    *string `json:"description"`
	A1111Trigger   *string `json:"a1111_trigger"`
	ComfyTrigger   *string `json:"comfy_trigger"`
	DownloadURL    *string `json:"download_url"`
	SuppressedTags *string `json:"suppressed_tags"`
	IsSystem       *bool   `json:"is_system"`
}

type NegativeVaultService struct {
	repo *repositories.NegativeVaultRepository
}

func NewNegativeVaultService(repo *repositories.NegativeVaultRepository) *NegativeVaultService {
	return &NegativeVaultService{repo: repo}
}

// ----------------------------------------------------------------------------
// Negative Presets
// ----------------------------------------------------------------------------

func (s *NegativeVaultService) ListPresets(arch, category, search string) ([]models.NegativePreset, error) {
	return s.repo.FindPresets(arch, category, search)
}

func (s *NegativeVaultService) GetPresetByID(id uint) (*models.NegativePreset, error) {
	return s.repo.FindPresetByID(id)
}

func (s *NegativeVaultService) CreatePreset(input CreateNegativePresetInput) (*models.NegativePreset, error) {
	cat := strings.TrimSpace(input.Category)
	if cat == "" {
		cat = "General"
	}
	cfg := strings.TrimSpace(input.RecommendedCFG)
	if cfg == "" {
		cfg = "4.5 - 7.0"
	}

	preset := &models.NegativePreset{
		Title:          strings.TrimSpace(input.Title),
		Architecture:   strings.TrimSpace(input.Architecture),
		Category:       cat,
		Description:    strings.TrimSpace(input.Description),
		Prompt:         strings.TrimSpace(input.Prompt),
		RecommendedCFG: cfg,
		Tags:           strings.TrimSpace(input.Tags),
		IsSystem:       input.IsSystem,
	}

	if err := s.repo.CreatePreset(preset); err != nil {
		return nil, err
	}
	return preset, nil
}

func (s *NegativeVaultService) UpdatePreset(id uint, input UpdateNegativePresetInput) (*models.NegativePreset, error) {
	preset, err := s.repo.FindPresetByID(id)
	if err != nil {
		return nil, err
	}

	if input.Title != nil {
		preset.Title = strings.TrimSpace(*input.Title)
	}
	if input.Architecture != nil {
		preset.Architecture = strings.TrimSpace(*input.Architecture)
	}
	if input.Category != nil {
		preset.Category = strings.TrimSpace(*input.Category)
	}
	if input.Description != nil {
		preset.Description = strings.TrimSpace(*input.Description)
	}
	if input.Prompt != nil {
		preset.Prompt = strings.TrimSpace(*input.Prompt)
	}
	if input.RecommendedCFG != nil {
		preset.RecommendedCFG = strings.TrimSpace(*input.RecommendedCFG)
	}
	if input.Tags != nil {
		preset.Tags = strings.TrimSpace(*input.Tags)
	}
	if input.IsSystem != nil {
		preset.IsSystem = *input.IsSystem
	}

	if err := s.repo.UpdatePreset(preset); err != nil {
		return nil, err
	}
	return preset, nil
}

func (s *NegativeVaultService) DeletePreset(id uint) error {
	return s.repo.DeletePreset(id)
}

// ----------------------------------------------------------------------------
// Embeddings
// ----------------------------------------------------------------------------

func (s *NegativeVaultService) ListEmbeddings(arch, search string) ([]models.EmbeddingResource, error) {
	return s.repo.FindEmbeddings(arch, search)
}

func (s *NegativeVaultService) GetEmbeddingByID(id uint) (*models.EmbeddingResource, error) {
	return s.repo.FindEmbeddingByID(id)
}

func (s *NegativeVaultService) CreateEmbedding(input CreateEmbeddingInput) (*models.EmbeddingResource, error) {
	emb := &models.EmbeddingResource{
		Name:           strings.TrimSpace(input.Name),
		Filename:       strings.TrimSpace(input.Filename),
		Architecture:   strings.TrimSpace(input.Architecture),
		Filesize:       strings.TrimSpace(input.Filesize),
		Description:    strings.TrimSpace(input.Description),
		A1111Trigger:   strings.TrimSpace(input.A1111Trigger),
		ComfyTrigger:   strings.TrimSpace(input.ComfyTrigger),
		DownloadURL:    strings.TrimSpace(input.DownloadURL),
		SuppressedTags: strings.TrimSpace(input.SuppressedTags),
		IsSystem:       input.IsSystem,
	}

	if err := s.repo.CreateEmbedding(emb); err != nil {
		return nil, err
	}
	return emb, nil
}

func (s *NegativeVaultService) UpdateEmbedding(id uint, input UpdateEmbeddingInput) (*models.EmbeddingResource, error) {
	emb, err := s.repo.FindEmbeddingByID(id)
	if err != nil {
		return nil, err
	}

	if input.Name != nil {
		emb.Name = strings.TrimSpace(*input.Name)
	}
	if input.Filename != nil {
		emb.Filename = strings.TrimSpace(*input.Filename)
	}
	if input.Architecture != nil {
		emb.Architecture = strings.TrimSpace(*input.Architecture)
	}
	if input.Filesize != nil {
		emb.Filesize = strings.TrimSpace(*input.Filesize)
	}
	if input.Description != nil {
		emb.Description = strings.TrimSpace(*input.Description)
	}
	if input.A1111Trigger != nil {
		emb.A1111Trigger = strings.TrimSpace(*input.A1111Trigger)
	}
	if input.ComfyTrigger != nil {
		emb.ComfyTrigger = strings.TrimSpace(*input.ComfyTrigger)
	}
	if input.DownloadURL != nil {
		emb.DownloadURL = strings.TrimSpace(*input.DownloadURL)
	}
	if input.SuppressedTags != nil {
		emb.SuppressedTags = strings.TrimSpace(*input.SuppressedTags)
	}
	if input.IsSystem != nil {
		emb.IsSystem = *input.IsSystem
	}

	if err := s.repo.UpdateEmbedding(emb); err != nil {
		return nil, err
	}
	return emb, nil
}

func (s *NegativeVaultService) DeleteEmbedding(id uint) error {
	return s.repo.DeleteEmbedding(id)
}
