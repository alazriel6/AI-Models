package services

import (
	"errors"
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"github.com/alazriel6/models-guide/backend/internal/models"
	"github.com/alazriel6/models-guide/backend/internal/repositories"
	"github.com/google/uuid"
	"gorm.io/datatypes"
)

var allowedExtensions = map[string]bool{
	".png":  true,
	".jpg":  true,
	".jpeg": true,
	".webp": true,
}

const maxFileSize = 20 * 1024 * 1024 // 20 MB

type CreateImageMetadataInput struct {
	Caption        string         `form:"caption"`
	Width          int            `form:"width"`
	Height         int            `form:"height"`
	PositivePrompt string         `form:"positive_prompt"`
	NegativePrompt string         `form:"negative_prompt"`
	Seed           int64          `form:"seed"`
	Steps          int            `form:"steps"`
	CFGScale       float64        `form:"cfg_scale"`
	Sampler        string         `form:"sampler"`
	ClipSkip       int            `form:"clip_skip"`
	HiresUpscale   float64        `form:"hires_upscale"`
	HiresSteps     int            `form:"hires_steps"`
	HiresUpscaler  string         `form:"hires_upscaler"`
	DenoisingStr   float64        `form:"denoising_strength"`
	RawMetadata    datatypes.JSON `form:"raw_metadata"`
}

type UpdateImageInput struct {
	Caption        *string         `json:"caption"`
	PositivePrompt *string         `json:"positive_prompt"`
	NegativePrompt *string         `json:"negative_prompt"`
	Seed           *int64          `json:"seed"`
	Steps          *int            `json:"steps"`
	CFGScale       *float64        `json:"cfg_scale"`
	Sampler        *string         `json:"sampler"`
	ClipSkip       *int            `json:"clip_skip"`
	HiresUpscale   *float64        `json:"hires_upscale"`
	HiresSteps     *int            `json:"hires_steps"`
	HiresUpscaler  *string         `json:"hires_upscaler"`
	DenoisingStr   *float64        `json:"denoising_strength"`
	RawMetadata    *datatypes.JSON `json:"raw_metadata"`
}

type ImageService struct {
	imageRepo    *repositories.ImageRepository
	modelRepo    *repositories.ModelRepository
	resourceRepo *repositories.ResourceRepository
	storagePath  string
}

func NewImageService(
	imageRepo *repositories.ImageRepository,
	modelRepo *repositories.ModelRepository,
	resourceRepo *repositories.ResourceRepository,
	storagePath string,
) *ImageService {
	return &ImageService{
		imageRepo:    imageRepo,
		modelRepo:    modelRepo,
		resourceRepo: resourceRepo,
		storagePath:  storagePath,
	}
}

func (s *ImageService) ListByModelID(modelID uint) ([]models.ModelImage, error) {
	if _, err := s.modelRepo.FindByID(modelID); err != nil {
		return nil, err
	}
	return s.imageRepo.FindByModelID(modelID)
}

func (s *ImageService) GetByID(id uint) (*models.ModelImage, error) {
	return s.imageRepo.FindByID(id)
}

func (s *ImageService) Upload(modelID uint, fileHeader *multipart.FileHeader, meta CreateImageMetadataInput) (*models.ModelImage, error) {
	if _, err := s.modelRepo.FindByID(modelID); err != nil {
		return nil, err
	}

	if fileHeader.Size > maxFileSize {
		return nil, errors.New("file size exceeds maximum limit of 20MB")
	}

	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if !allowedExtensions[ext] {
		return nil, fmt.Errorf("unsupported file extension: %s. Allowed: .png, .jpg, .jpeg, .webp", ext)
	}

	file, err := fileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer file.Close()

	// Try reading image dimensions if not provided
	width := meta.Width
	height := meta.Height
	if width <= 0 || height <= 0 {
		if cfg, _, err := image.DecodeConfig(file); err == nil {
			width = cfg.Width
			height = cfg.Height
		}
		// Reset read offset after DecodeConfig
		if seeker, ok := file.(io.ReadSeeker); ok {
			_, _ = seeker.Seek(0, io.SeekStart)
		}
	}

	// Ensure destination directory exists
	if err := os.MkdirAll(s.storagePath, 0755); err != nil {
		return nil, fmt.Errorf("failed to create storage directory: %w", err)
	}

	fileName := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	destPath := filepath.Join(s.storagePath, fileName)

	dst, err := os.Create(destPath)
	if err != nil {
		return nil, fmt.Errorf("failed to save file: %w", err)
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		return nil, fmt.Errorf("failed to write file: %w", err)
	}

	relImagePath := filepath.ToSlash(filepath.Join("storage", "images", fileName))
	imageURL := "/storage/images/" + fileName

	modelImage := &models.ModelImage{
		ModelID:        modelID,
		ImagePath:      relImagePath,
		ImageURL:       imageURL,
		Caption:        strings.TrimSpace(meta.Caption),
		Width:          width,
		Height:         height,
		PositivePrompt: strings.TrimSpace(meta.PositivePrompt),
		NegativePrompt: strings.TrimSpace(meta.NegativePrompt),
		Seed:           meta.Seed,
		Steps:          meta.Steps,
		CFGScale:       meta.CFGScale,
		Sampler:        strings.TrimSpace(meta.Sampler),
		ClipSkip:       meta.ClipSkip,
		HiresUpscale:   meta.HiresUpscale,
		HiresSteps:     meta.HiresSteps,
		HiresUpscaler:  strings.TrimSpace(meta.HiresUpscaler),
		DenoisingStr:   meta.DenoisingStr,
		RawMetadata:    meta.RawMetadata,
	}

	if err := s.imageRepo.Create(modelImage); err != nil {
		// Clean up file if DB insert fails
		_ = os.Remove(destPath)
		return nil, err
	}

	return modelImage, nil
}

func (s *ImageService) Update(id uint, input UpdateImageInput) (*models.ModelImage, error) {
	img, err := s.imageRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	if input.Caption != nil {
		img.Caption = strings.TrimSpace(*input.Caption)
	}
	if input.PositivePrompt != nil {
		img.PositivePrompt = strings.TrimSpace(*input.PositivePrompt)
	}
	if input.NegativePrompt != nil {
		img.NegativePrompt = strings.TrimSpace(*input.NegativePrompt)
	}
	if input.Seed != nil {
		img.Seed = *input.Seed
	}
	if input.Steps != nil {
		img.Steps = *input.Steps
	}
	if input.CFGScale != nil {
		img.CFGScale = *input.CFGScale
	}
	if input.Sampler != nil {
		img.Sampler = strings.TrimSpace(*input.Sampler)
	}
	if input.ClipSkip != nil {
		img.ClipSkip = *input.ClipSkip
	}
	if input.HiresUpscale != nil {
		img.HiresUpscale = *input.HiresUpscale
	}
	if input.HiresSteps != nil {
		img.HiresSteps = *input.HiresSteps
	}
	if input.HiresUpscaler != nil {
		img.HiresUpscaler = strings.TrimSpace(*input.HiresUpscaler)
	}
	if input.DenoisingStr != nil {
		img.DenoisingStr = *input.DenoisingStr
	}
	if input.RawMetadata != nil {
		img.RawMetadata = *input.RawMetadata
	}

	if err := s.imageRepo.Update(img); err != nil {
		return nil, err
	}

	return img, nil
}

func (s *ImageService) Delete(id uint) error {
	img, err := s.imageRepo.FindByID(id)
	if err != nil {
		return err
	}

	// Delete from DB
	if err := s.imageRepo.Delete(id); err != nil {
		return err
	}

	// Attempt to delete file from disk
	if img.ImagePath != "" {
		_ = os.Remove(filepath.Clean(img.ImagePath))
	}

	return nil
}

func (s *ImageService) AttachResource(imageID, resourceID uint, weight float64) error {
	if _, err := s.imageRepo.FindByID(imageID); err != nil {
		return err
	}
	if _, err := s.resourceRepo.FindByID(resourceID); err != nil {
		return err
	}
	return s.imageRepo.AddResource(imageID, resourceID, weight)
}

func (s *ImageService) DetachResource(imageID, resourceID uint) error {
	if _, err := s.imageRepo.FindByID(imageID); err != nil {
		return err
	}
	if _, err := s.resourceRepo.FindByID(resourceID); err != nil {
		return err
	}
	return s.imageRepo.RemoveResource(imageID, resourceID)
}
