package services

import (
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/alazriel6/models-guide/backend/internal/models"
	"github.com/alazriel6/models-guide/backend/internal/repositories"
	"gorm.io/gorm"
)

type CreateModelInput struct {
	Name            string               `json:"name" binding:"required"`
	Slug            string               `json:"slug"`
	Type            string               `json:"type" binding:"required"`
	BaseModel       string               `json:"base_model" binding:"required"`
	Author          string               `json:"author"`
	Description     string               `json:"description"`
	SourceURL       string               `json:"source_url"`
	CivitaiURL      string               `json:"civitai_url"`
	HuggingFaceURL  string               `json:"huggingface_url"`
	ThumbnailURL    string               `json:"thumbnail_url"`
	PublishedAt     *time.Time           `json:"published_at"`
	Likes           int                  `json:"likes"`
	Rating          float64              `json:"rating"`
	TensorSize      string               `json:"tensor_size"`
	VRAMMin         string               `json:"vram_min"`
	VRAMRecommended string               `json:"vram_recommended"`
	Conditioner     int                  `json:"conditioner"`
	FirstStageModel int                  `json:"first_stage_model"`
	ModelTensor     int                  `json:"model_tensor"`
	TriggerWords    []string             `json:"trigger_words"`
	Tags            []string             `json:"tags"`
	Versions        []CreateVersionInput `json:"versions"`
}

type UpdateModelInput struct {
	Name            *string               `json:"name"`
	Slug            *string               `json:"slug"`
	Type            *string               `json:"type"`
	BaseModel       *string               `json:"base_model"`
	Author          *string               `json:"author"`
	Description     *string               `json:"description"`
	SourceURL       *string               `json:"source_url"`
	CivitaiURL      *string               `json:"civitai_url"`
	HuggingFaceURL  *string               `json:"huggingface_url"`
	ThumbnailURL    *string               `json:"thumbnail_url"`
	PublishedAt     *time.Time            `json:"published_at"`
	Likes           *int                  `json:"likes"`
	Rating          *float64              `json:"rating"`
	TensorSize      *string               `json:"tensor_size"`
	VRAMMin         *string               `json:"vram_min"`
	VRAMRecommended *string               `json:"vram_recommended"`
	Conditioner     *int                  `json:"conditioner"`
	FirstStageModel *int                  `json:"first_stage_model"`
	ModelTensor     *int                  `json:"model_tensor"`
	TriggerWords    *[]string             `json:"trigger_words"`
	Tags            *[]string             `json:"tags"`
	Versions        *[]CreateVersionInput `json:"versions"`
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

func (s *ModelService) GetByIDOrSlug(identifier string) (*models.Model, error) {
	return s.repo.FindByIDOrSlug(identifier)
}

func (s *ModelService) Create(input CreateModelInput) (*models.Model, error) {
	slug := strings.TrimSpace(input.Slug)
	if slug == "" {
		slug = GenerateSlug(input.Name)
	}

	sourceURL := strings.TrimSpace(input.SourceURL)
	if sourceURL == "" && input.CivitaiURL != "" {
		sourceURL = strings.TrimSpace(input.CivitaiURL)
	}

	publishedAt := input.PublishedAt
	if publishedAt == nil {
		now := time.Now()
		publishedAt = &now
	}

	model := &models.Model{
		Name:            strings.TrimSpace(input.Name),
		Slug:            slug,
		Type:            strings.TrimSpace(input.Type),
		BaseModel:       strings.TrimSpace(input.BaseModel),
		Author:          strings.TrimSpace(input.Author),
		Description:     strings.TrimSpace(input.Description),
		SourceURL:       sourceURL,
		CivitaiURL:      strings.TrimSpace(input.CivitaiURL),
		HuggingFaceURL:  strings.TrimSpace(input.HuggingFaceURL),
		ThumbnailURL:    strings.TrimSpace(input.ThumbnailURL),
		PublishedAt:     publishedAt,
		Likes:           input.Likes,
		Rating:          input.Rating,
		TensorSize:      strings.TrimSpace(input.TensorSize),
		VRAMMin:         strings.TrimSpace(input.VRAMMin),
		VRAMRecommended: strings.TrimSpace(input.VRAMRecommended),
		Conditioner:     input.Conditioner,
		FirstStageModel: input.FirstStageModel,
		ModelTensor:     input.ModelTensor,
	}

	if len(input.TriggerWords) > 0 {
		for _, tw := range input.TriggerWords {
			trimmed := strings.TrimSpace(tw)
			if trimmed != "" {
				model.TriggerWords = append(model.TriggerWords, models.ModelTriggerWord{
					TriggerWord: trimmed,
				})
			}
		}
	}

	if len(input.Versions) > 0 {
		for _, v := range input.Versions {
			vName := strings.TrimSpace(v.VersionName)
			if vName != "" {
				model.Versions = append(model.Versions, models.ModelVersion{
					VersionName:         vName,
					VersionNumber:       strings.TrimSpace(v.VersionNumber),
					FileName:            strings.TrimSpace(v.FileName),
					FileSize:            v.FileSize,
					Format:              strings.TrimSpace(v.Format),
					DownloadURL:         strings.TrimSpace(v.DownloadURL),
					CivitaiVersionURL:   strings.TrimSpace(v.CivitaiVersionURL),
					RecommendedSettings: v.RecommendedSettings,
				})
			}
		}
	}

	if len(input.Tags) > 0 {
		for _, t := range input.Tags {
			tName := strings.TrimSpace(t)
			if tName != "" {
				var tag models.Tag
				slug := GenerateSlug(tName)
				if err := s.repo.DB.Where("slug = ?", slug).FirstOrCreate(&tag, models.Tag{Name: tName, Slug: slug}).Error; err == nil {
					model.Tags = append(model.Tags, tag)
				}
			}
		}
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
	if input.SourceURL != nil {
		model.SourceURL = strings.TrimSpace(*input.SourceURL)
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
	if input.PublishedAt != nil {
		model.PublishedAt = input.PublishedAt
	}
	if input.Likes != nil {
		model.Likes = *input.Likes
	}
	if input.Rating != nil {
		model.Rating = *input.Rating
	}
	if input.TensorSize != nil {
		model.TensorSize = strings.TrimSpace(*input.TensorSize)
	}
	if input.VRAMMin != nil {
		model.VRAMMin = strings.TrimSpace(*input.VRAMMin)
	}
	if input.VRAMRecommended != nil {
		model.VRAMRecommended = strings.TrimSpace(*input.VRAMRecommended)
	}
	if input.Conditioner != nil {
		model.Conditioner = *input.Conditioner
	}
	if input.FirstStageModel != nil {
		model.FirstStageModel = *input.FirstStageModel
	}
	if input.ModelTensor != nil {
		model.ModelTensor = *input.ModelTensor
	}

	if input.TriggerWords != nil {
		s.repo.DB.Where("model_id = ?", model.ID).Delete(&models.ModelTriggerWord{})
		for _, tw := range *input.TriggerWords {
			trimmed := strings.TrimSpace(tw)
			if trimmed != "" {
				s.repo.DB.Create(&models.ModelTriggerWord{
					ModelID:     model.ID,
					TriggerWord: trimmed,
				})
			}
		}
	}

	if input.Versions != nil {
		s.repo.DB.Where("model_id = ?", model.ID).Delete(&models.ModelVersion{})
		for _, v := range *input.Versions {
			vName := strings.TrimSpace(v.VersionName)
			if vName != "" {
				s.repo.DB.Create(&models.ModelVersion{
					ModelID:             model.ID,
					VersionName:         vName,
					VersionNumber:       strings.TrimSpace(v.VersionNumber),
					FileName:            strings.TrimSpace(v.FileName),
					FileSize:            v.FileSize,
					Format:              strings.TrimSpace(v.Format),
					DownloadURL:         strings.TrimSpace(v.DownloadURL),
					CivitaiVersionURL:   strings.TrimSpace(v.CivitaiVersionURL),
					RecommendedSettings: v.RecommendedSettings,
				})
			}
		}
	}

	if input.Tags != nil {
		var newTags []models.Tag
		for _, t := range *input.Tags {
			tName := strings.TrimSpace(t)
			if tName != "" {
				var tag models.Tag
				slug := GenerateSlug(tName)
				if err := s.repo.DB.Where("slug = ?", slug).FirstOrCreate(&tag, models.Tag{Name: tName, Slug: slug}).Error; err == nil {
					newTags = append(newTags, tag)
				}
			}
		}
		s.repo.DB.Model(model).Association("Tags").Replace(newTags)
	}

	if err := s.repo.Update(model); err != nil {
		return nil, err
	}

	return s.repo.FindByID(id)
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
