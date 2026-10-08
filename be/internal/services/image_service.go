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
	"github.com/alazriel6/models-guide/backend/internal/parser"
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

type ImageResourceInput struct {
	Name   string  `json:"name" form:"name"`
	Type   string  `json:"type" form:"type"`
	Weight float64 `json:"weight" form:"weight"`
}

type CreateImageMetadataInput struct {
	ModelID        *uint                `json:"model_id" form:"model_id"`
	ModelName      string               `json:"model_name" form:"model_name"`
	ImageURL       string               `json:"image_url" form:"image_url"`
	Caption        string               `json:"caption" form:"caption"`
	Width          int                  `json:"width" form:"width"`
	Height         int                  `json:"height" form:"height"`
	PositivePrompt string               `json:"positive_prompt" form:"positive_prompt"`
	NegativePrompt string               `json:"negative_prompt" form:"negative_prompt"`
	Seed           int64                `json:"seed" form:"seed"`
	Steps          int                  `json:"steps" form:"steps"`
	CFGScale       float64              `json:"cfg_scale" form:"cfg_scale"`
	Sampler        string               `json:"sampler" form:"sampler"`
	Scheduler      string               `json:"scheduler" form:"scheduler"`
	ClipSkip       int                  `json:"clip_skip" form:"clip_skip"`
	HiresUpscale   float64              `json:"hires_upscale" form:"hires_upscale"`
	HiresSteps     int                  `json:"hires_steps" form:"hires_steps"`
	HiresUpscaler  string               `json:"hires_upscaler" form:"hires_upscaler"`
	DenoisingStr   float64              `json:"denoising_strength" form:"denoising_strength"`
	RawMetadata    datatypes.JSON       `json:"raw_metadata" form:"raw_metadata"`
	Resources      []ImageResourceInput `json:"resources" form:"resources"`
	Tags           []string             `json:"tags" form:"tags"`
}

type UpdateImageInput struct {
	ModelID        *uint           `json:"model_id"`
	ModelName      *string         `json:"model_name"`
	Caption        *string         `json:"caption"`
	PositivePrompt *string         `json:"positive_prompt"`
	NegativePrompt *string         `json:"negative_prompt"`
	Seed           *int64          `json:"seed"`
	Steps          *int            `json:"steps"`
	CFGScale       *float64        `json:"cfg_scale"`
	Sampler        *string         `json:"sampler"`
	Scheduler      *string         `json:"scheduler"`
	ClipSkip       *int            `json:"clip_skip"`
	HiresUpscale   *float64        `json:"hires_upscale"`
	HiresSteps     *int            `json:"hires_steps"`
	HiresUpscaler  *string         `json:"hires_upscaler"`
	DenoisingStr   *float64        `json:"denoising_strength"`
	RawMetadata    *datatypes.JSON `json:"raw_metadata"`
	Tags           *[]string       `json:"tags"`
}

type ImageService struct {
	imageRepo    *repositories.ImageRepository
	modelRepo    *repositories.ModelRepository
	resourceRepo *repositories.ResourceRepository
	tagRepo      *repositories.TagRepository
	storagePath  string
}

func NewImageService(
	imageRepo *repositories.ImageRepository,
	modelRepo *repositories.ModelRepository,
	resourceRepo *repositories.ResourceRepository,
	tagRepo *repositories.TagRepository,
	storagePath string,
) *ImageService {
	return &ImageService{
		imageRepo:    imageRepo,
		modelRepo:    modelRepo,
		resourceRepo: resourceRepo,
		tagRepo:      tagRepo,
		storagePath:  storagePath,
	}
}

func (s *ImageService) ListByModelID(modelID uint) ([]models.ModelImage, error) {
	if _, err := s.modelRepo.FindByID(modelID); err != nil {
		return nil, err
	}
	return s.imageRepo.FindByModelID(modelID)
}

func (s *ImageService) ListAll(filter repositories.ImageFilter) ([]models.ModelImage, int64, error) {
	return s.imageRepo.FindAll(filter)
}

func (s *ImageService) GetByID(id uint) (*models.ModelImage, error) {
	return s.imageRepo.FindByID(id)
}

func (s *ImageService) Upload(modelID *uint, fileHeader *multipart.FileHeader, meta CreateImageMetadataInput) (*models.ModelImage, error) {
	var model *models.Model
	if modelID != nil && *modelID > 0 {
		m, err := s.modelRepo.FindByID(*modelID)
		if err == nil {
			model = m
		}
	} else if meta.ModelID != nil && *meta.ModelID > 0 {
		modelID = meta.ModelID
		m, err := s.modelRepo.FindByID(*modelID)
		if err == nil {
			model = m
		}
	}

	modelName := strings.TrimSpace(meta.ModelName)
	if modelName == "" && model != nil {
		modelName = model.Name
	}

	var relImagePath string
	var imageURL string
	var destPath string
	width := meta.Width
	height := meta.Height

	if fileHeader != nil {
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

		// Auto-extract generation metadata if uploading an image file (PNG, WebP, JPEG)
		if ext == ".png" || ext == ".webp" || ext == ".jpg" || ext == ".jpeg" {
			if parsed, err := parser.ParseImageMetadata(file, fileHeader.Filename); err == nil && parsed != nil {
				if strings.TrimSpace(meta.PositivePrompt) == "" && parsed.PositivePrompt != "" {
					meta.PositivePrompt = parsed.PositivePrompt
				}
				if strings.TrimSpace(meta.NegativePrompt) == "" && parsed.NegativePrompt != "" {
					meta.NegativePrompt = parsed.NegativePrompt
				}
				if meta.Steps == 0 && parsed.Steps > 0 {
					meta.Steps = parsed.Steps
				}
				if strings.TrimSpace(meta.Sampler) == "" && parsed.Sampler != "" {
					meta.Sampler = parsed.Sampler
				}
				if strings.TrimSpace(meta.Scheduler) == "" && parsed.Scheduler != "" {
					meta.Scheduler = parsed.Scheduler
				}
				if meta.CFGScale == 0 && parsed.CFGScale > 0 {
					meta.CFGScale = parsed.CFGScale
				}
				if meta.Seed == 0 && parsed.Seed != 0 {
					meta.Seed = parsed.Seed
				}
				if width <= 0 && parsed.Width > 0 {
					width = parsed.Width
				}
				if height <= 0 && parsed.Height > 0 {
					height = parsed.Height
				}
				if meta.ClipSkip == 0 && parsed.ClipSkip > 0 {
					meta.ClipSkip = parsed.ClipSkip
				}
				if meta.DenoisingStr == 0 && parsed.DenoisingStr > 0 {
					meta.DenoisingStr = parsed.DenoisingStr
				}
				if meta.HiresUpscale == 0 && parsed.HiresUpscale > 0 {
					meta.HiresUpscale = parsed.HiresUpscale
				}
				if meta.HiresSteps == 0 && parsed.HiresSteps > 0 {
					meta.HiresSteps = parsed.HiresSteps
				}
				if strings.TrimSpace(meta.HiresUpscaler) == "" && parsed.HiresUpscaler != "" {
					meta.HiresUpscaler = parsed.HiresUpscaler
				}
				if modelName == "" && parsed.ModelName != "" {
					modelName = parsed.ModelName
				}
				if len(meta.Resources) == 0 && len(parsed.Loras) > 0 {
					for _, lora := range parsed.Loras {
						meta.Resources = append(meta.Resources, ImageResourceInput{
							Name:   lora.Name,
							Type:   "lora",
							Weight: lora.Weight,
						})
					}
				}
			}
			// Reset seeker offset back to beginning after parsing
			if seeker, ok := file.(io.ReadSeeker); ok {
				_, _ = seeker.Seek(0, io.SeekStart)
			}
		}

		// Try reading image dimensions if not provided
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
		destPath = filepath.Join(s.storagePath, fileName)

		dst, err := os.Create(destPath)
		if err != nil {
			return nil, fmt.Errorf("failed to save file: %w", err)
		}
		defer dst.Close()

		if _, err := io.Copy(dst, file); err != nil {
			return nil, fmt.Errorf("failed to write file: %w", err)
		}

		relImagePath = filepath.ToSlash(filepath.Join("storage", "images", fileName))
		imageURL = "/storage/images/" + fileName

		// Pre-generate compressed thumbnail in background
		go func(fname string) {
			thumbSvc := NewThumbnailService(s.storagePath)
			_, _ = thumbSvc.GetOrCreateThumbnail(fname, 480)
		}(fileName)
	} else if strings.TrimSpace(meta.ImageURL) != "" {
		imageURL = strings.TrimSpace(meta.ImageURL)
	} else {
		return nil, errors.New("image file or image_url is required")
	}

	modelImage := &models.ModelImage{
		ModelID:        modelID,
		ModelName:      modelName,
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
		Scheduler:      strings.TrimSpace(meta.Scheduler),
		RawMetadata:    meta.RawMetadata,
	}

	if err := s.imageRepo.Create(modelImage); err != nil {
		if destPath != "" {
			_ = os.Remove(destPath)
		}
		return nil, err
	}

	// Attach resources if provided
	for _, resInput := range meta.Resources {
		rName := strings.TrimSpace(resInput.Name)
		if rName != "" {
			var res models.Resource
			rType := strings.TrimSpace(resInput.Type)
			if rType == "" {
				rType = "lora"
			}
			if err := s.imageRepo.DB.Where("name = ? AND type = ?", rName, rType).FirstOrCreate(&res, models.Resource{
				Name: rName,
				Type: rType,
			}).Error; err == nil {
				_ = s.imageRepo.AddResource(modelImage.ID, res.ID, resInput.Weight)
			}
		}
	}

	// Attach tags if provided
	if len(meta.Tags) > 0 {
		if tags, err := s.tagRepo.FindOrCreateByNames(meta.Tags); err == nil && len(tags) > 0 {
			_ = s.tagRepo.SetImageTags(modelImage.ID, tags)
		}
	}

	// Auto-set model's thumbnail if model exists and its thumbnail is currently empty
	if model != nil && strings.TrimSpace(model.ThumbnailURL) == "" {
		model.ThumbnailURL = modelImage.ImageURL
		_ = s.modelRepo.Update(model)
	}

	return s.imageRepo.FindByID(modelImage.ID)
}

func (s *ImageService) Update(id uint, input UpdateImageInput) (*models.ModelImage, error) {
	img, err := s.imageRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	if input.ModelID != nil {
		if *input.ModelID == 0 {
			img.ModelID = nil
		} else {
			img.ModelID = input.ModelID
		}
	}
	if input.ModelName != nil {
		img.ModelName = strings.TrimSpace(*input.ModelName)
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
	if input.Scheduler != nil {
		img.Scheduler = strings.TrimSpace(*input.Scheduler)
	}
	if input.RawMetadata != nil {
		img.RawMetadata = *input.RawMetadata
	}

	if err := s.imageRepo.Update(img); err != nil {
		return nil, err
	}

	// Update tags if provided
	if input.Tags != nil {
		tags, err := s.tagRepo.FindOrCreateByNames(*input.Tags)
		if err == nil {
			_ = s.tagRepo.SetImageTags(img.ID, tags)
		}
	}

	return s.imageRepo.FindByID(img.ID)
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

	// Check if this was the model's thumbnail
	if img.ModelID != nil && *img.ModelID > 0 {
		modelID := *img.ModelID
		if model, err := s.modelRepo.FindByID(modelID); err == nil && model != nil {
			if model.ThumbnailURL == img.ImageURL {
				remaining, _ := s.imageRepo.FindByModelID(modelID)
				if len(remaining) > 0 {
					model.ThumbnailURL = remaining[0].ImageURL
				} else {
					model.ThumbnailURL = ""
				}
				_ = s.modelRepo.Update(model)
			}
		}
	}

	return nil
}

func (s *ImageService) SetAsThumbnail(modelID, imageID uint) error {
	img, err := s.imageRepo.FindByID(imageID)
	if err != nil {
		return err
	}
	model, err := s.modelRepo.FindByID(modelID)
	if err != nil {
		return err
	}
	model.ThumbnailURL = img.ImageURL
	return s.modelRepo.Update(model)
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
