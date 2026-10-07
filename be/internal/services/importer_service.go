package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/alazriel6/models-guide/backend/internal/models"
	"github.com/alazriel6/models-guide/backend/internal/parser"
	"github.com/alazriel6/models-guide/backend/internal/repositories"
	"gorm.io/datatypes"
)

type InspectModelInput struct {
	URLOrID  string `json:"url_or_id" binding:"required"`
	APIToken string `json:"api_token,omitempty"`
}

type InspectedVersion struct {
	VersionName   string   `json:"version_name"`
	VersionNumber string   `json:"version_number"`
	FileName      string   `json:"file_name"`
	FileSize      int64    `json:"file_size"`
	Format        string   `json:"format"`
	DownloadURL   string   `json:"download_url"`
	SourceURL     string   `json:"source_url"`
	BaseModel           string                 `json:"base_model"`
	TriggerWords        []string               `json:"trigger_words"`
	RecommendedSettings map[string]interface{} `json:"recommended_settings,omitempty"`
}

type InspectedImage struct {
	URL            string  `json:"url"`
	Caption        string  `json:"caption"`
	Width          int     `json:"width"`
	Height         int     `json:"height"`
	PositivePrompt string  `json:"positive_prompt"`
	NegativePrompt string  `json:"negative_prompt"`
	Seed           int64   `json:"seed"`
	Steps          int     `json:"steps"`
	Sampler        string  `json:"sampler"`
	Scheduler      string  `json:"scheduler"`
	CFGScale       float64 `json:"cfg_scale"`
	NSFWLevel      int     `json:"nsfw_level"`
}

type InspectedModel struct {
	Platform     string             `json:"platform"` // "civitai" or "huggingface"
	OriginalID   string             `json:"original_id"`
	SourceURL    string             `json:"source_url"`
	Name         string             `json:"name"`
	Slug         string             `json:"slug"`
	Author       string             `json:"author"`
	Description  string             `json:"description"`
	Type         string             `json:"type"`       // "checkpoint" or "lora"
	BaseModel    string             `json:"base_model"` // "Illustrious", "Pony", "NoobAI", "SDXL", "Flux", etc.
	ThumbnailURL string             `json:"thumbnail_url"`
	Tags         []string           `json:"tags"`
	TriggerWords []string           `json:"trigger_words"`
	Versions     []InspectedVersion `json:"versions"`
	SampleImages []InspectedImage   `json:"sample_images"`
}

type ImportModelSaveInput struct {
	Name         string             `json:"name" binding:"required"`
	Slug         string             `json:"slug"`
	Type         string             `json:"type" binding:"required"`
	BaseModel    string             `json:"base_model" binding:"required"`
	Author       string             `json:"author"`
	Description  string             `json:"description"`
	SourceURL    string             `json:"source_url"`
	CivitaiURL   string             `json:"civitai_url,omitempty"`
	ThumbnailURL string             `json:"thumbnail_url"`
	TriggerWords []string           `json:"trigger_words"`
	Tags         []string           `json:"tags"`
	Versions     []InspectedVersion `json:"versions"`
	SampleImages []InspectedImage   `json:"sample_images"`
	ImportImages bool               `json:"import_images"`
}

type ImporterService struct {
	modelRepo   *repositories.ModelRepository
	versionRepo *repositories.VersionRepository
	tagRepo     *repositories.TagRepository
	imageRepo   *repositories.ImageRepository
	httpClient  *http.Client
}

func NewImporterService(
	modelRepo *repositories.ModelRepository,
	versionRepo *repositories.VersionRepository,
	tagRepo *repositories.TagRepository,
	imageRepo *repositories.ImageRepository,
) *ImporterService {
	return &ImporterService{
		modelRepo:   modelRepo,
		versionRepo: versionRepo,
		tagRepo:     tagRepo,
		imageRepo:   imageRepo,
		httpClient: &http.Client{
			Timeout: 20 * time.Second,
		},
	}
}

// InspectModel auto-detects Civitai or HuggingFace and fetches all metadata, versions, and sample images.
func (s *ImporterService) InspectModel(input InspectModelInput) (*InspectedModel, error) {
	rawInput := strings.TrimSpace(input.URLOrID)
	if rawInput == "" {
		return nil, errors.New("URL or Model ID is required")
	}

	// 1. Check if Hugging Face URL
	if strings.Contains(rawInput, "huggingface.co") || strings.Contains(rawInput, "hf.co") {
		return s.inspectHuggingFace(rawInput, input.APIToken)
	}

	// 2. Default to Civitai (matches civitai.com, civitai.red, civitai.pro, or pure numeric ID)
	return s.inspectCivitai(rawInput, input.APIToken)
}

// inspectCivitai queries Civitai API v1. Supports full NSFW/uncensored content via optional API Token.
func (s *ImporterService) inspectCivitai(input string, apiToken string) (*InspectedModel, error) {
	modelID := extractCivitaiID(input)
	if modelID == "" {
		return nil, errors.New("could not extract Civitai model ID from input. Please provide a valid Civitai URL or Model ID")
	}

	apiURL := fmt.Sprintf("https://civitai.com/api/v1/models/%s", modelID)
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ModelsGuide/1.0")
	if strings.TrimSpace(apiToken) != "" {
		req.Header.Set("Authorization", "Bearer "+strings.TrimSpace(apiToken))
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Civitai API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, fmt.Errorf("model #%s not found on Civitai (may be deleted or restricted)", modelID)
	}
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("civitai API returned status %d: %s", resp.StatusCode, string(body))
	}

	var data civitaiModelResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, fmt.Errorf("failed to parse Civitai JSON response: %w", err)
	}

	// Map type
	typeNorm := "checkpoint"
	if strings.EqualFold(data.Type, "lora") || strings.EqualFold(data.Type, "locon") || strings.EqualFold(data.Type, "dora") {
		typeNorm = "lora"
	}

	// Determine primary base model from latest version
	baseModelNorm := "SDXL"
	if len(data.ModelVersions) > 0 {
		baseModelNorm = normalizeBaseModel(data.ModelVersions[0].BaseModel)
	}

	// Aggregate trigger words
	triggerWordMap := make(map[string]bool)

	// Aggregate sample images with full generation metadata (prompt, negative prompt, steps, sampler, cfg, seed)
	var sampleImages []InspectedImage
	seenImageURLs := make(map[string]bool)

	// Strategy A: Query Civitai images endpoint with withMeta=true for each model version
	for _, v := range data.ModelVersions {
		richImages := s.fetchCivitaiImagesWithMeta(v.ID, apiToken, data.Name, v.Name)
		for _, rImg := range richImages {
			if !seenImageURLs[rImg.URL] {
				seenImageURLs[rImg.URL] = true
				sampleImages = append(sampleImages, rImg)
			}
		}
	}

	// Strategy B: If model version images were empty, query by model ID
	if len(sampleImages) == 0 {
		modelImages := s.fetchCivitaiModelImagesWithMeta(data.ID, apiToken, data.Name)
		for _, mImg := range modelImages {
			if !seenImageURLs[mImg.URL] {
				seenImageURLs[mImg.URL] = true
				sampleImages = append(sampleImages, mImg)
			}
		}
	}

	// Strategy C: Include any images from modelVersions[].images that were not in gallery, and try embedded metadata
	for _, v := range data.ModelVersions {
		for _, img := range v.Images {
			if strings.TrimSpace(img.URL) == "" || seenImageURLs[img.URL] {
				continue
			}
			seenImageURLs[img.URL] = true

			var posPrompt, negPrompt, sampler, scheduler string
			var steps int
			var cfgScale float64
			var seed int64

			if img.Meta != nil {
				if p, ok := img.Meta["prompt"].(string); ok {
					posPrompt = p
				}
				if np, ok := img.Meta["negativePrompt"].(string); ok {
					negPrompt = np
				}
				if smp, ok := img.Meta["sampler"].(string); ok {
					sampler = smp
				}
				if sch, ok := img.Meta["scheduler"].(string); ok {
					scheduler = sch
				}
				if val, exists := img.Meta["steps"]; exists {
					steps = int(parseMetaInt64(val))
				}
				if val, exists := img.Meta["cfgScale"]; exists {
					cfgScale = parseMetaFloat(val)
				}
				if val, exists := img.Meta["seed"]; exists {
					seed = parseMetaInt64(val)
				}
			}

			// If prompt is empty, try extracting embedded metadata from image URL
			if posPrompt == "" {
				p, np, smp, stp, cfg, sd := s.tryExtractEmbeddedMetadata(img.URL)
				if p != "" {
					posPrompt = p
					negPrompt = np
					sampler = smp
					steps = stp
					cfgScale = cfg
					seed = sd
				}
			}

			w := int(img.Width)
			h := int(img.Height)
			if w <= 0 {
				w = 832
			}
			if h <= 0 {
				h = 1216
			}

			caption := fmt.Sprintf("%s - %s Showcase", data.Name, v.Name)
			sampleImages = append(sampleImages, InspectedImage{
				URL:            img.URL,
				Caption:        caption,
				Width:          w,
				Height:         h,
				PositivePrompt: posPrompt,
				NegativePrompt: negPrompt,
				Seed:           seed,
				Steps:          steps,
				Sampler:        sampler,
				Scheduler:      scheduler,
				CFGScale:       cfgScale,
				NSFWLevel:      int(img.NSFWLevel),
			})
		}
	}

	// Strategy D: Ensure any image without prompt attempts embedded extraction
	for i := range sampleImages {
		if sampleImages[i].PositivePrompt == "" {
			p, np, smp, stp, cfg, sd := s.tryExtractEmbeddedMetadata(sampleImages[i].URL)
			if p != "" {
				sampleImages[i].PositivePrompt = p
				sampleImages[i].NegativePrompt = np
				sampleImages[i].Sampler = smp
				sampleImages[i].Steps = stp
				sampleImages[i].CFGScale = cfg
				sampleImages[i].Seed = sd
			}
		}
	}

	// Now build versions with accurate Recommended Generation Settings derived from description & sample images
	var versions []InspectedVersion
	for _, v := range data.ModelVersions {
		var fileItem civitaiFile
		for _, f := range v.Files {
			if strings.EqualFold(f.Type, "Model") || strings.HasSuffix(strings.ToLower(f.Name), ".safetensors") {
				fileItem = f
				break
			}
		}
		if fileItem.Name == "" && len(v.Files) > 0 {
			fileItem = v.Files[0]
		}

		downloadURL := fileItem.DownloadURL
		if downloadURL == "" {
			downloadURL = fmt.Sprintf("https://civitai.com/api/download/models/%d", v.ID)
		}
		if strings.TrimSpace(apiToken) != "" && !strings.Contains(downloadURL, "token=") {
			sep := "?"
			if strings.Contains(downloadURL, "?") {
				sep = "&"
			}
			downloadURL = fmt.Sprintf("%s%stoken=%s", downloadURL, sep, strings.TrimSpace(apiToken))
		}

		vBaseModel := normalizeBaseModel(v.BaseModel)
		for _, tw := range v.TrainedWords {
			cleanTW := strings.TrimSpace(tw)
			if cleanTW != "" {
				triggerWordMap[cleanTW] = true
			}
		}

		var vImages []InspectedImage
		vURLMap := make(map[string]bool)
		for _, img := range v.Images {
			if img.URL != "" {
				vURLMap[img.URL] = true
			}
		}
		for _, img := range sampleImages {
			if vURLMap[img.URL] || strings.Contains(strings.ToLower(img.Caption), strings.ToLower(v.Name)) {
				vImages = append(vImages, img)
			}
		}
		if len(vImages) == 0 {
			vImages = sampleImages
		}

		recSettings := extractRecommendedSettings(
			vBaseModel,
			[]string{data.Description, v.Name, v.Description},
			vImages,
		)

		versions = append(versions, InspectedVersion{
			VersionName:         v.Name,
			VersionNumber:       v.Name,
			FileName:            fileItem.Name,
			FileSize:            int64(fileItem.SizeKB * 1024),
			Format:              fileItem.Format,
			DownloadURL:         downloadURL,
			SourceURL:           fmt.Sprintf("https://civitai.com/models/%d?modelVersionId=%d", data.ID, v.ID),
			BaseModel:           vBaseModel,
			TriggerWords:        v.TrainedWords,
			RecommendedSettings: recSettings,
		})
	}

	var triggerWords []string
	for tw := range triggerWordMap {
		triggerWords = append(triggerWords, tw)
	}

	thumbURL := ""
	if len(sampleImages) > 0 {
		thumbURL = sampleImages[0].URL
	}

	authorName := "Civitai Creator"
	if data.Creator.Username != "" {
		authorName = data.Creator.Username
	}

	slug := slugify(data.Name)
	if slug == "" {
		slug = fmt.Sprintf("civitai-%d", data.ID)
	}

	return &InspectedModel{
		Platform:     "civitai",
		OriginalID:   strconv.FormatInt(data.ID, 10),
		SourceURL:    fmt.Sprintf("https://civitai.com/models/%d", data.ID),
		Name:         data.Name,
		Slug:         slug,
		Author:       authorName,
		Description:  sanitizeDescriptionHTML(data.Description),
		Type:         typeNorm,
		BaseModel:    baseModelNorm,
		ThumbnailURL: thumbURL,
		Tags:         data.Tags,
		TriggerWords: triggerWords,
		Versions:     versions,
		SampleImages: sampleImages,
	}, nil
}

// inspectHuggingFace queries Hugging Face API
func (s *ImporterService) inspectHuggingFace(input string, apiToken string) (*InspectedModel, error) {
	repoID := extractHFRepoID(input)
	if repoID == "" {
		return nil, errors.New("could not extract Hugging Face repo ID (expected format: author/model-name)")
	}

	apiURL := fmt.Sprintf("https://huggingface.co/api/models/%s", repoID)
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("User-Agent", "ModelsGuide/1.0")
	if strings.TrimSpace(apiToken) != "" {
		req.Header.Set("Authorization", "Bearer "+strings.TrimSpace(apiToken))
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Hugging Face API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, fmt.Errorf("repository '%s' not found on Hugging Face", repoID)
	}
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("hugging Face API returned status %d: %s", resp.StatusCode, string(body))
	}

	var data hfModelResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, fmt.Errorf("failed to parse Hugging Face response: %w", err)
	}

	name := repoID
	parts := strings.Split(repoID, "/")
	author := "HuggingFace"
	if len(parts) == 2 {
		author = parts[0]
		name = strings.ReplaceAll(parts[1], "-", " ")
		name = strings.Title(name)
	}

	baseModel := "SDXL"
	typeNorm := "checkpoint"
	for _, t := range data.Tags {
		tl := strings.ToLower(t)
		if strings.Contains(tl, "lora") {
			typeNorm = "lora"
		}
		if strings.Contains(tl, "illustrious") {
			baseModel = "Illustrious"
		} else if strings.Contains(tl, "pony") {
			baseModel = "Pony"
		} else if strings.Contains(tl, "flux") {
			baseModel = "Flux"
		} else if strings.Contains(tl, "noobai") {
			baseModel = "NoobAI"
		} else if strings.Contains(tl, "sd15") || strings.Contains(tl, "sd-1-5") {
			baseModel = "SD 1.5"
		}
	}

	var versions []InspectedVersion
	for _, sib := range data.Siblings {
		if strings.HasSuffix(strings.ToLower(sib.RFilename), ".safetensors") {
			dlURL := fmt.Sprintf("https://huggingface.co/%s/resolve/main/%s", repoID, sib.RFilename)
			versions = append(versions, InspectedVersion{
				VersionName:   "Main",
				VersionNumber: "1.0",
				FileName:      sib.RFilename,
				FileSize:      0,
				Format:        "SafeTensor",
				DownloadURL:   dlURL,
				SourceURL:     fmt.Sprintf("https://huggingface.co/%s", repoID),
				BaseModel:     baseModel,
			})
		}
	}

	if len(versions) == 0 {
		versions = append(versions, InspectedVersion{
			VersionName:   "Main",
			VersionNumber: "1.0",
			FileName:      parts[len(parts)-1] + ".safetensors",
			Format:        "SafeTensor",
			DownloadURL:   fmt.Sprintf("https://huggingface.co/%s", repoID),
			SourceURL:     fmt.Sprintf("https://huggingface.co/%s", repoID),
			BaseModel:     baseModel,
		})
	}

	return &InspectedModel{
		Platform:     "huggingface",
		OriginalID:   repoID,
		SourceURL:    fmt.Sprintf("https://huggingface.co/%s", repoID),
		Name:         name,
		Slug:         slugify(name),
		Author:       author,
		Description:  fmt.Sprintf("Hugging Face model repository: %s. Pipeline: %s", repoID, data.PipelineTag),
		Type:         typeNorm,
		BaseModel:    baseModel,
		ThumbnailURL: "",
		Tags:         data.Tags,
		TriggerWords: []string{},
		Versions:     versions,
		SampleImages: []InspectedImage{},
	}, nil
}

// SaveImportedModel persists the inspected model and optionally its sample generations to DB
func (s *ImporterService) SaveImportedModel(input ImportModelSaveInput) (*models.Model, error) {
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, errors.New("model name is required")
	}

	slug := strings.TrimSpace(input.Slug)
	if slug == "" {
		slug = slugify(name)
	}

	modelType := strings.ToLower(strings.TrimSpace(input.Type))
	if modelType != "lora" {
		modelType = "checkpoint"
	}

	baseModel := strings.TrimSpace(input.BaseModel)
	if baseModel == "" {
		baseModel = "SDXL"
	}

	thumbURL := strings.TrimSpace(input.ThumbnailURL)
	if thumbURL == "" && len(input.SampleImages) > 0 {
		thumbURL = input.SampleImages[0].URL
	}
	now := time.Now()

	// Check if model already exists (by slug, Civitai URL, or exact name)
	var targetModel *models.Model
	existing, _ := s.modelRepo.FindByIDOrSlug(slug)
	if existing == nil && input.CivitaiURL != "" {
		// Look up by Civitai URL or name
		var byCivitai models.Model
		if err := s.modelRepo.DB.Where("civitai_url = ? OR LOWER(name) = LOWER(?)", input.CivitaiURL, name).First(&byCivitai).Error; err == nil {
			existing = &byCivitai
		}
	}

	if existing != nil {
		targetModel = existing
		targetModel.Name = name
		targetModel.Description = sanitizeDescriptionHTML(input.Description)
		targetModel.BaseModel = baseModel
		targetModel.Type = modelType
		targetModel.Author = strings.TrimSpace(input.Author)
		if thumbURL != "" {
			targetModel.ThumbnailURL = thumbURL
		}
		if input.SourceURL != "" {
			targetModel.SourceURL = strings.TrimSpace(input.SourceURL)
		}
		if input.CivitaiURL != "" {
			targetModel.CivitaiURL = strings.TrimSpace(input.CivitaiURL)
		}
		_ = s.modelRepo.Update(targetModel)
		// Clean up old versions & triggers to refresh with new ones
		_ = s.modelRepo.DB.Where("model_id = ?", targetModel.ID).Delete(&models.ModelVersion{}).Error
		_ = s.modelRepo.DB.Where("model_id = ?", targetModel.ID).Delete(&models.ModelTriggerWord{}).Error
	} else {
		newModel := &models.Model{
			Name:         name,
			Slug:         slug,
			Type:         modelType,
			BaseModel:    baseModel,
			Description:  sanitizeDescriptionHTML(input.Description),
			Author:       strings.TrimSpace(input.Author),
			SourceURL:    strings.TrimSpace(input.SourceURL),
			CivitaiURL:   strings.TrimSpace(input.CivitaiURL),
			ThumbnailURL: thumbURL,
			PublishedAt:  &now,
			Rating:       5.0,
			Likes:        1,
		}
		if err := s.modelRepo.Create(newModel); err != nil {
			return nil, fmt.Errorf("failed to create model: %w", err)
		}
		targetModel = newModel
	}

	// 1. Save Trigger Words
	for _, tw := range input.TriggerWords {
		cleanTW := strings.TrimSpace(tw)
		if cleanTW != "" {
			_ = s.modelRepo.DB.Create(&models.ModelTriggerWord{
				ModelID:     targetModel.ID,
				TriggerWord: cleanTW,
			}).Error
		}
	}

	// 2. Save Tags
	if len(input.Tags) > 0 {
		if tags, err := s.tagRepo.FindOrCreateByNames(input.Tags); err == nil && len(tags) > 0 {
			_ = s.modelRepo.DB.Model(targetModel).Association("Tags").Replace(tags)
		}
	}

	// 3. Save Versions with realistic Recommended Generation Settings
	for _, v := range input.Versions {
		vName := strings.TrimSpace(v.VersionName)
		if vName == "" {
			vName = "v1.0"
		}

		recSettingsMap := v.RecommendedSettings
		if len(recSettingsMap) == 0 {
			recSettingsMap = extractRecommendedSettings(
				v.BaseModel,
				[]string{input.Description, vName},
				input.SampleImages,
			)
		}
		recBytes, _ := json.Marshal(recSettingsMap)

		newVer := &models.ModelVersion{
			ModelID:             targetModel.ID,
			VersionName:         vName,
			VersionNumber:       v.VersionNumber,
			FileName:            v.FileName,
			FileSize:            v.FileSize,
			Format:              v.Format,
			DownloadURL:         v.DownloadURL,
			CivitaiVersionURL:   v.SourceURL,
			RecommendedSettings: datatypes.JSON(recBytes),
		}
		_ = s.versionRepo.Create(newVer)
	}

	// 4. Optionally import sample images directly into gallery
	if input.ImportImages && len(input.SampleImages) > 0 {
		for idx, img := range input.SampleImages {
			if strings.TrimSpace(img.URL) == "" {
				continue
			}

			w := img.Width
			if w <= 0 {
				w = 832
			}
			if h := img.Height; h <= 0 {
				img.Height = 1216
			}

			modelImg := &models.ModelImage{
				ModelID:        &targetModel.ID,
				ModelName:      targetModel.Name,
				ImageURL:       img.URL,
				Caption:        img.Caption,
				Width:          w,
				Height:         img.Height,
				PositivePrompt: img.PositivePrompt,
				NegativePrompt: img.NegativePrompt,
				Seed:           img.Seed,
				Steps:          img.Steps,
				Sampler:        img.Sampler,
				Scheduler:      img.Scheduler,
				CFGScale:       img.CFGScale,
			}

			if err := s.imageRepo.Create(modelImg); err == nil {
				if len(input.Tags) > 0 {
					if tags, err := s.tagRepo.FindOrCreateByNames(input.Tags); err == nil {
						_ = s.tagRepo.SetImageTags(modelImg.ID, tags)
					}
				}
				if idx == 0 && targetModel.ThumbnailURL == "" {
					targetModel.ThumbnailURL = modelImg.ImageURL
					_ = s.modelRepo.Update(targetModel)
				}
			}
		}
	}

	return s.modelRepo.FindByID(targetModel.ID)
}

// Helper: extracts model ID from various Civitai URL formats or raw ID
func extractCivitaiID(input string) string {
	clean := strings.TrimSpace(input)
	if clean == "" {
		return ""
	}

	// Pure digits
	if regexp.MustCompile(`^\d+$`).MatchString(clean) {
		return clean
	}

	// /models/{id} or /models/{id}/slug
	re := regexp.MustCompile(`/models/(\d+)`)
	matches := re.FindStringSubmatch(clean)
	if len(matches) > 1 {
		return matches[1]
	}

	return ""
}

// Helper: extracts repo ID (author/repo) from Hugging Face URLs
func extractHFRepoID(input string) string {
	clean := strings.TrimSpace(input)
	clean = strings.TrimPrefix(clean, "https://")
	clean = strings.TrimPrefix(clean, "http://")
	clean = strings.TrimPrefix(clean, "huggingface.co/")
	clean = strings.TrimPrefix(clean, "hf.co/")

	// Strip query params or trailing slashes
	if idx := strings.Index(clean, "?"); idx != -1 {
		clean = clean[:idx]
	}
	clean = strings.Trim(clean, "/")

	parts := strings.Split(clean, "/")
	if len(parts) >= 2 {
		return parts[0] + "/" + parts[1]
	}
	return ""
}

func normalizeBaseModel(bm string) string {
	b := strings.ToLower(bm)
	if strings.Contains(b, "illustrious") {
		return "Illustrious"
	}
	if strings.Contains(b, "pony") {
		return "Pony"
	}
	if strings.Contains(b, "noobai") || strings.Contains(b, "noob") {
		return "NoobAI"
	}
	if strings.Contains(b, "flux") {
		return "Flux"
	}
	if strings.Contains(b, "sd 1.5") || strings.Contains(b, "sd1.5") || strings.Contains(b, "sd 1") {
		return "SD 1.5"
	}
	if strings.Contains(b, "sdxl") {
		return "SDXL"
	}
	if bm == "" {
		return "SDXL"
	}
	return bm
}

func sanitizeDescriptionHTML(rawHTML string) string {
	if strings.TrimSpace(rawHTML) == "" {
		return ""
	}

	out := rawHTML

	// 1. Strip dangerous tags with their inner content
	out = regexp.MustCompile(`(?is)<script\b[^>]*>.*?</script>`).ReplaceAllString(out, "")
	out = regexp.MustCompile(`(?is)<style\b[^>]*>.*?</style>`).ReplaceAllString(out, "")
	out = regexp.MustCompile(`(?is)<iframe\b[^>]*>.*?</iframe>`).ReplaceAllString(out, "")
	out = regexp.MustCompile(`(?is)<object\b[^>]*>.*?</object>`).ReplaceAllString(out, "")
	out = regexp.MustCompile(`(?is)<embed\b[^>]*>`).ReplaceAllString(out, "")

	// 2. Strip event handlers (onload, onclick, onerror, etc.)
	out = regexp.MustCompile(`(?i)\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)`).ReplaceAllString(out, "")

	// 3. Strip javascript: URLs
	out = regexp.MustCompile(`(?i)href\s*=\s*["']?javascript:[^"'>\s]*["']?`).ReplaceAllString(out, `href="#"`)

	// 4. Ensure all external links have target="_blank" and rel="noopener noreferrer ugc"
	out = regexp.MustCompile(`(?i)<a\s+([^>]*?)>`).ReplaceAllStringFunc(out, func(match string) string {
		if !strings.Contains(strings.ToLower(match), "target=") {
			match = strings.Replace(match, "<a ", `<a target="_blank" `, 1)
		}
		if !strings.Contains(strings.ToLower(match), "rel=") {
			match = strings.Replace(match, "<a ", `<a rel="noopener noreferrer ugc" `, 1)
		}
		return match
	})

	return strings.TrimSpace(out)
}

func cleanHTMLToText(s string) string {
	if s == "" {
		return ""
	}
	// Replace line breaking HTML tags with newlines
	reBreaks := regexp.MustCompile(`(?i)<(?:br\s*/?|/p|/div|/li|/tr|/h[1-6]|hr\s*/?)[^>]*>`)
	text := reBreaks.ReplaceAllString(s, "\n")

	// Strip all remaining HTML tags
	reTags := regexp.MustCompile(`<[^>]+>`)
	text = reTags.ReplaceAllString(text, " ")

	// Decode common HTML entities
	text = strings.ReplaceAll(text, "&nbsp;", " ")
	text = strings.ReplaceAll(text, "&amp;", "&")
	text = strings.ReplaceAll(text, "&lt;", "<")
	text = strings.ReplaceAll(text, "&gt;", ">")
	text = strings.ReplaceAll(text, "&quot;", "\"")
	text = strings.ReplaceAll(text, "&#39;", "'")
	text = strings.ReplaceAll(text, "&#x27;", "'")
	text = strings.ReplaceAll(text, "&times;", "x")

	// Normalize spaces while preserving newlines
	lines := strings.Split(text, "\n")
	var cleanLines []string
	reMultiSpace := regexp.MustCompile(`[ \t\f\r]+`)
	for _, l := range lines {
		trimmed := strings.TrimSpace(reMultiSpace.ReplaceAllString(l, " "))
		if trimmed != "" {
			cleanLines = append(cleanLines, trimmed)
		}
	}
	return strings.Join(cleanLines, "\n")
}

func extractVersionSection(cleanFull string, versionName string) string {
	vName := strings.TrimSpace(versionName)
	if vName == "" || len(cleanFull) == 0 {
		return ""
	}

	escaped := regexp.QuoteMeta(vName)
	// Match version heading e.g. "V-pred-04", "## V-pred-04", "Version v-pred-04"
	reHeader := regexp.MustCompile(`(?i)(?:^|\n)\s*(?:#{1,4}\s+|version\s+|v\s*)?` + escaped + `(?:\s*[:\-—–])?\s*(?:\n|$)`)
	loc := reHeader.FindStringIndex(cleanFull)
	if loc == nil {
		// Fallback: look for simple occurrence at line start
		reLoose := regexp.MustCompile(`(?i)(?:^|\n)\s*` + escaped + `\b`)
		loc = reLoose.FindStringIndex(cleanFull)
		if loc == nil {
			return ""
		}
	}

	start := loc[1]
	// Look for next section header or horizontal line
	reNextHeader := regexp.MustCompile(`(?i)\n\s*(?:#{1,4}\s+|---|\*\*\*|={3,}|v\d|version\s+\d)`)
	nextLoc := reNextHeader.FindStringIndex(cleanFull[start:])
	if nextLoc != nil {
		return cleanFull[start : start+nextLoc[0]]
	}
	return cleanFull[start:]
}

func extractRecommendedSettings(baseModel string, textSources []string, sampleImages []InspectedImage) map[string]interface{} {
	return ExtractRecommendedSettings(baseModel, textSources, sampleImages)
}

func ExtractRecommendedSettings(baseModel string, textSources []string, sampleImages []InspectedImage) map[string]interface{} {
	// 1. Clean HTML and extract version-specific text if version name is given
	var cleanParts []string
	var versionName string
	for idx, src := range textSources {
		clean := cleanHTMLToText(src)
		if clean != "" {
			cleanParts = append(cleanParts, clean)
		}
		// Typically textSources is [data.Description, v.Name, v.Description]
		if idx == 1 && len(src) < 100 {
			versionName = strings.TrimSpace(src)
		}
	}

	cleanFull := strings.Join(cleanParts, "\n")

	// Check if there is a version-specific section in the text
	versionSection := ""
	if versionName != "" {
		versionSection = extractVersionSection(cleanFull, versionName)
	}

	// Helper to search version section first, then fall back to full text
	searchRegex := func(re *regexp.Regexp) []string {
		if versionSection != "" {
			if m := re.FindStringSubmatch(versionSection); len(m) > 0 {
				return m
			}
		}
		return re.FindStringSubmatch(cleanFull)
	}

	// 2. Parse Steps & Steps Range
	steps := 0
	stepsRange := ""
	reSteps := regexp.MustCompile(`(?i)(?:^|\n|[\s:;,\.\(\[\|])(?:generation\s+|sampling\s+)?steps?\s*[:：]\s*(\d+)(?:\s*[-–—~to]\s*(\d+))?`)
	if m := searchRegex(reSteps); len(m) > 1 {
		minS, _ := strconv.Atoi(m[1])
		if len(m) > 2 && m[2] != "" {
			maxS, _ := strconv.Atoi(m[2])
			stepsRange = fmt.Sprintf("%d-%d", minS, maxS)
			steps = (minS + maxS) / 2
		} else if minS > 0 {
			steps = minS
			stepsRange = strconv.Itoa(minS)
		}
	}

	// 3. Parse CFG Scale
	cfgScale := 0.0
	cfgScaleRange := ""
	reCFG := regexp.MustCompile(`(?i)(?:CFG(?:\s*scale)?|\bCFG\b|Guidance(?:\s*scale)?)\s*[:：]\s*(\d+(?:\.\d+)?)(?:\s*[-–—~to]\s*(\d+(?:\.\d+)?))?`)
	if m := searchRegex(reCFG); len(m) > 1 {
		minC, _ := strconv.ParseFloat(m[1], 64)
		if len(m) > 2 && m[2] != "" {
			maxC, _ := strconv.ParseFloat(m[2], 64)
			cfgScaleRange = fmt.Sprintf("%s-%s", m[1], m[2])
			cfgScale = (minC + maxC) / 2.0
		} else if minC > 0 {
			cfgScale = minC
			cfgScaleRange = m[1]
		}
	}

	// 4. Parse Sampler
	sampler := ""
	reSampler := regexp.MustCompile(`(?i)Sampler\s*[:：]\s*([A-Za-z0-9_\+\-\s]+?)(?:[\n\r<\.,]|The|use|CFG|Steps|Clip|$)`)
	if m := searchRegex(reSampler); len(m) > 1 {
		smp := strings.TrimSpace(m[1])
		if len(smp) >= 3 && !strings.EqualFold(smp, "the") {
			sampler = smp
		}
	}

	// 5. Parse Resolution (Prioritize explicit example/recommended image resolution first)
	width := 0
	height := 0
	reExampleRes := regexp.MustCompile(`(?i)(?:(?:example\s+)?images?\s+(?:use|are\s+generated\s+at)|recommended\s+(?:size|resolution))[^\d\n]*(\d{3,4})\s*[×xX*]\s*(\d{3,4})`)
	if m := searchRegex(reExampleRes); len(m) > 2 {
		w, _ := strconv.Atoi(m[1])
		h, _ := strconv.Atoi(m[2])
		if w >= 512 && h >= 512 {
			width = w
			height = h
		}
	} else {
		reRes := regexp.MustCompile(`(?i)(?:(?:example\s+)?images?\s+(?:are\s+)?generated\s+at|recommended\s+(?:size|resolution)|use\s+(?:size\s+)?|resolution|dimensions?)[^\d\n]*(\d{3,4})\s*[×xX*]\s*(\d{3,4})`)
		if m := searchRegex(reRes); len(m) > 2 {
			w, _ := strconv.Atoi(m[1])
			h, _ := strconv.Atoi(m[2])
			if w >= 512 && h >= 512 {
				width = w
				height = h
			}
		}
	}

	// 6. Parse Clip Skip
	clipSkip := 0
	reClip := regexp.MustCompile(`(?i)clip\s*skip\s*(?:of\s*|[:：]\s*)?(\d+)`)
	if m := searchRegex(reClip); len(m) > 1 {
		cs, _ := strconv.Atoi(m[1])
		if cs > 0 {
			clipSkip = cs
		}
	}

	// 7. Parse Hires upscale parameters (only set if actually detected in text)
	hiresUpscale := 0.0
	reHiresUp := regexp.MustCompile(`(?i)Hires\s+upscale\s*[:：]\s*(\d+(?:\.\d+)?)`)
	if m := searchRegex(reHiresUp); len(m) > 1 {
		hiresUpscale, _ = strconv.ParseFloat(m[1], 64)
	}

	hiresSteps := 0
	reHiresSteps := regexp.MustCompile(`(?i)Hires\s+steps?\s*[:：]\s*(\d+)`)
	if m := searchRegex(reHiresSteps); len(m) > 1 {
		hiresSteps, _ = strconv.Atoi(m[1])
	}

	hiresUpscaler := ""
	reHiresUpscaler := regexp.MustCompile(`(?i)Hires\s+upscaler\s*[:：]\s*([A-Za-z0-9_\+\-\.\s]+?)(?:[\n\r<\.,]|Denoising|Denoise|$)`)
	if m := searchRegex(reHiresUpscaler); len(m) > 1 {
		hiresUpscaler = strings.TrimSpace(m[1])
	}

	denoiseRange := ""
	reDenoise := regexp.MustCompile(`(?i)(?:Denoising\s+strength|Denoise)\s*[:：]\s*([0-9\.\s~–—\-]+)`)
	if m := searchRegex(reDenoise); len(m) > 1 {
		denoiseRange = strings.Trim(m[1], " \t\r\n.,;:")
	}

	// 8. If parameters are still missing, check sample images metadata
	if len(sampleImages) > 0 {
		if sampler == "" {
			samplerCount := make(map[string]int)
			for _, img := range sampleImages {
				if img.Sampler != "" {
					samplerCount[img.Sampler]++
				}
			}
			bestCount := 0
			for s, c := range samplerCount {
				if c > bestCount {
					sampler = s
					bestCount = c
				}
			}
		}

		if steps == 0 {
			var totalSteps int
			var countSteps int
			for _, img := range sampleImages {
				if img.Steps > 0 {
					totalSteps += img.Steps
					countSteps++
				}
			}
			if countSteps > 0 {
				steps = totalSteps / countSteps
				stepsRange = strconv.Itoa(steps)
			}
		}

		if cfgScale == 0 {
			var totalCFG float64
			var countCFG int
			for _, img := range sampleImages {
				if img.CFGScale > 0 {
					totalCFG += img.CFGScale
					countCFG++
				}
			}
			if countCFG > 0 {
				cfgScale = totalCFG / float64(countCFG)
				cfgScale = math.Round(cfgScale*10) / 10
				cfgScaleRange = fmt.Sprintf("%.1f", cfgScale)
			}
		}

		if width == 0 || height == 0 {
			sizeCount := make(map[string]int)
			for _, img := range sampleImages {
				if img.Width >= 512 && img.Height >= 512 {
					key := fmt.Sprintf("%dx%d", img.Width, img.Height)
					sizeCount[key]++
				}
			}
			bestSize := ""
			bestCount := 0
			for k, c := range sizeCount {
				if c > bestCount {
					bestSize = k
					bestCount = c
				}
			}
			if bestSize != "" {
				var sw, sh int
				if n, _ := fmt.Sscanf(bestSize, "%dx%d", &sw, &sh); n == 2 && sw > 0 && sh > 0 {
					width = sw
					height = sh
				}
			}
		}
	}

	// 9. Baseline architecture fallbacks for anything still completely empty
	normBM := strings.ToLower(baseModel)
	if sampler == "" {
		if strings.Contains(normBM, "flux") {
			sampler = "Euler"
		} else if strings.Contains(normBM, "1.5") || strings.Contains(normBM, "sdxl") {
			sampler = "DPM++ 2M Karras"
		} else {
			sampler = "Euler a"
		}
	}

	if steps == 0 {
		if strings.Contains(normBM, "flux") {
			steps = 20
		} else if strings.Contains(normBM, "1.5") {
			steps = 20
		} else {
			steps = 25
		}
	}

	if cfgScale == 0 {
		if strings.Contains(normBM, "flux") {
			cfgScale = 3.5
		} else if strings.Contains(normBM, "illustrious") || strings.Contains(normBM, "noob") {
			cfgScale = 6.0
		} else {
			cfgScale = 7.0
		}
	}

	if width == 0 || height == 0 {
		if strings.Contains(normBM, "1.5") {
			width = 512
			height = 768
		} else if strings.Contains(normBM, "illustrious") || strings.Contains(normBM, "noob") {
			width = 832
			height = 1216
		} else {
			width = 1024
			height = 1024
		}
	}

	if clipSkip == 0 && strings.Contains(normBM, "pony") {
		clipSkip = 2
	}

	result := map[string]interface{}{
		"sampler":   sampler,
		"steps":     steps,
		"cfgScale":  cfgScale,
		"cfg_scale": cfgScale,
		"width":     width,
		"height":    height,
	}
	if stepsRange != "" {
		result["steps_range"] = stepsRange
		result["stepsRange"] = stepsRange
	}
	if cfgScaleRange != "" {
		result["cfg_scale_range"] = cfgScaleRange
		result["cfgScaleRange"] = cfgScaleRange
	}
	if clipSkip > 0 {
		result["clip_skip"] = clipSkip
		result["clipSkip"] = clipSkip
	}
	if hiresUpscale > 0 {
		result["hires_upscale"] = hiresUpscale
		result["hiresUpscale"] = hiresUpscale
	}
	if hiresSteps > 0 {
		result["hires_steps"] = hiresSteps
		result["hiresSteps"] = hiresSteps
	}
	if hiresUpscaler != "" {
		result["hires_upscaler"] = hiresUpscaler
		result["hiresUpscaler"] = hiresUpscaler
	}
	if denoiseRange != "" {
		result["denoising_strength"] = denoiseRange
		result["denoise"] = denoiseRange
	}

	return result
}

func slugify(s string) string {
	re := regexp.MustCompile(`[^a-z0-9]+`)
	slug := strings.ToLower(s)
	slug = re.ReplaceAllString(slug, "-")
	slug = strings.Trim(slug, "-")
	return slug
}

func parseMetaFloat(val interface{}) float64 {
	switch v := val.(type) {
	case float64:
		return v
	case float32:
		return float64(v)
	case int:
		return float64(v)
	case int64:
		return float64(v)
	case string:
		var f float64
		fmt.Sscanf(v, "%f", &f)
		return f
	default:
		return 0
	}
}

func parseMetaInt64(val interface{}) int64 {
	switch v := val.(type) {
	case float64:
		return int64(v)
	case int:
		return int64(v)
	case int64:
		return v
	case string:
		var i int64
		fmt.Sscanf(v, "%d", &i)
		return i
	default:
		return 0
	}
}

// Civitai API structs
type civitaiModelResponse struct {
	ID            int64             `json:"id"`
	Name          string            `json:"name"`
	Description   string            `json:"description"`
	Type          string            `json:"type"`
	NSFW          bool              `json:"nsfw"`
	Tags          []string          `json:"tags"`
	Creator       civitaiCreator    `json:"creator"`
	ModelVersions []civitaiModelVer `json:"modelVersions"`
}

type civitaiCreator struct {
	Username string `json:"username"`
	Image    string `json:"image"`
}

type civitaiModelVer struct {
	ID           int64         `json:"id"`
	Name         string        `json:"name"`
	Description  string        `json:"description"`
	BaseModel    string        `json:"baseModel"`
	CreatedAt    string        `json:"createdAt"`
	TrainedWords []string      `json:"trainedWords"`
	Files        []civitaiFile `json:"files"`
	Images       []civitaiImg  `json:"images"`
}

type civitaiFile struct {
	ID          int64   `json:"id"`
	Name        string  `json:"name"`
	SizeKB      float64 `json:"sizeKB"`
	Type        string  `json:"type"`
	Format      string  `json:"format"`
	DownloadURL string  `json:"downloadUrl"`
}

type civitaiImg struct {
	ID        int64                  `json:"id"`
	URL       string                 `json:"url"`
	NSFWLevel float64                `json:"nsfwLevel"`
	Width     float64                `json:"width"`
	Height    float64                `json:"height"`
	Meta      map[string]interface{} `json:"meta"`
}

type civitaiImagesResponse struct {
	Items []civitaiGalleryImage `json:"items"`
}

type civitaiGalleryImage struct {
	ID        int64                  `json:"id"`
	URL       string                 `json:"url"`
	NSFWLevel interface{}            `json:"nsfwLevel"`
	Width     float64                `json:"width"`
	Height    float64                `json:"height"`
	Meta      map[string]interface{} `json:"meta"`
}

func parseNSFWLevel(val interface{}) int {
	switch v := val.(type) {
	case float64:
		return int(v)
	case int:
		return v
	case int64:
		return int(v)
	case string:
		switch strings.ToLower(strings.TrimSpace(v)) {
		case "none", "pg":
			return 1
		case "soft", "pg13":
			return 2
		case "mature", "r":
			return 4
		case "x", "xxx", "blocked":
			return 8
		default:
			var n int
			fmt.Sscanf(v, "%d", &n)
			if n > 0 {
				return n
			}
			return 1
		}
	default:
		return 1
	}
}

func (s *ImporterService) fetchCivitaiImagesWithMeta(modelVersionID int64, apiToken string, modelName, versionName string) []InspectedImage {
	apiURL := fmt.Sprintf("https://civitai.com/api/v1/images?modelVersionId=%d&limit=20&withMeta=true&sort=Most+Reactions", modelVersionID)
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ModelsGuide/1.0")
	if strings.TrimSpace(apiToken) != "" {
		req.Header.Set("Authorization", "Bearer "+strings.TrimSpace(apiToken))
	}

	resp, err := s.httpClient.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		return nil
	}
	defer resp.Body.Close()

	var imgResp civitaiImagesResponse
	if err := json.NewDecoder(resp.Body).Decode(&imgResp); err != nil {
		return nil
	}

	var results []InspectedImage
	for _, item := range imgResp.Items {
		if strings.TrimSpace(item.URL) == "" {
			continue
		}

		var posPrompt, negPrompt, sampler, scheduler string
		var steps int
		var cfgScale float64
		var seed int64

		if item.Meta != nil {
			if p, ok := item.Meta["prompt"].(string); ok {
				posPrompt = p
			}
			if np, ok := item.Meta["negativePrompt"].(string); ok {
				negPrompt = np
			}
			if smp, ok := item.Meta["sampler"].(string); ok {
				sampler = smp
			}
			if sch, ok := item.Meta["scheduler"].(string); ok {
				scheduler = sch
			}
			if val, exists := item.Meta["steps"]; exists {
				steps = int(parseMetaInt64(val))
			}
			if val, exists := item.Meta["cfgScale"]; exists {
				cfgScale = parseMetaFloat(val)
			}
			if val, exists := item.Meta["seed"]; exists {
				seed = parseMetaInt64(val)
			}
		}

		w := int(item.Width)
		h := int(item.Height)
		if (w <= 0 || h <= 0) && item.Meta != nil {
			if sizeStr, ok := item.Meta["Size"].(string); ok && strings.Contains(sizeStr, "x") {
				parts := strings.Split(sizeStr, "x")
				if len(parts) == 2 {
					w, _ = strconv.Atoi(strings.TrimSpace(parts[0]))
					h, _ = strconv.Atoi(strings.TrimSpace(parts[1]))
				}
			}
		}
		if w <= 0 {
			w = 832
		}
		if h <= 0 {
			h = 1216
		}

		caption := fmt.Sprintf("%s - %s Showcase", modelName, versionName)
		results = append(results, InspectedImage{
			URL:            item.URL,
			Caption:        caption,
			Width:          w,
			Height:         h,
			PositivePrompt: posPrompt,
			NegativePrompt: negPrompt,
			Seed:           seed,
			Steps:          steps,
			Sampler:        sampler,
			Scheduler:      scheduler,
			CFGScale:       cfgScale,
			NSFWLevel:      parseNSFWLevel(item.NSFWLevel),
		})
	}
	return results
}

func (s *ImporterService) fetchCivitaiModelImagesWithMeta(modelID int64, apiToken string, modelName string) []InspectedImage {
	apiURL := fmt.Sprintf("https://civitai.com/api/v1/images?modelId=%d&limit=25&withMeta=true&sort=Most+Reactions", modelID)
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ModelsGuide/1.0")
	if strings.TrimSpace(apiToken) != "" {
		req.Header.Set("Authorization", "Bearer "+strings.TrimSpace(apiToken))
	}

	resp, err := s.httpClient.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		return nil
	}
	defer resp.Body.Close()

	var imgResp civitaiImagesResponse
	if err := json.NewDecoder(resp.Body).Decode(&imgResp); err != nil {
		return nil
	}

	var results []InspectedImage
	for _, item := range imgResp.Items {
		if strings.TrimSpace(item.URL) == "" {
			continue
		}

		var posPrompt, negPrompt, sampler, scheduler string
		var steps int
		var cfgScale float64
		var seed int64

		if item.Meta != nil {
			if p, ok := item.Meta["prompt"].(string); ok {
				posPrompt = p
			}
			if np, ok := item.Meta["negativePrompt"].(string); ok {
				negPrompt = np
			}
			if smp, ok := item.Meta["sampler"].(string); ok {
				sampler = smp
			}
			if sch, ok := item.Meta["scheduler"].(string); ok {
				scheduler = sch
			}
			if val, exists := item.Meta["steps"]; exists {
				steps = int(parseMetaInt64(val))
			}
			if val, exists := item.Meta["cfgScale"]; exists {
				cfgScale = parseMetaFloat(val)
			}
			if val, exists := item.Meta["seed"]; exists {
				seed = parseMetaInt64(val)
			}
		}

		w := int(item.Width)
		h := int(item.Height)
		if (w <= 0 || h <= 0) && item.Meta != nil {
			if sizeStr, ok := item.Meta["Size"].(string); ok && strings.Contains(sizeStr, "x") {
				parts := strings.Split(sizeStr, "x")
				if len(parts) == 2 {
					w, _ = strconv.Atoi(strings.TrimSpace(parts[0]))
					h, _ = strconv.Atoi(strings.TrimSpace(parts[1]))
				}
			}
		}
		if w <= 0 {
			w = 832
		}
		if h <= 0 {
			h = 1216
		}

		caption := fmt.Sprintf("%s Showcase", modelName)
		results = append(results, InspectedImage{
			URL:            item.URL,
			Caption:        caption,
			Width:          w,
			Height:         h,
			PositivePrompt: posPrompt,
			NegativePrompt: negPrompt,
			Seed:           seed,
			Steps:          steps,
			Sampler:        sampler,
			Scheduler:      scheduler,
			CFGScale:       cfgScale,
			NSFWLevel:      parseNSFWLevel(item.NSFWLevel),
		})
	}
	return results
}

func (s *ImporterService) tryExtractEmbeddedMetadata(imgURL string) (prompt, negPrompt, sampler string, steps int, cfg float64, seed int64) {
	if !strings.HasPrefix(imgURL, "http://") && !strings.HasPrefix(imgURL, "https://") {
		return
	}
	req, err := http.NewRequest("GET", imgURL, nil)
	if err != nil {
		return
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ModelsGuide/1.0")
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		return
	}
	defer resp.Body.Close()

	parsed, err := parser.ParseImageMetadata(resp.Body, imgURL)
	if err != nil || parsed == nil {
		return
	}

	prompt = parsed.PositivePrompt
	negPrompt = parsed.NegativePrompt
	sampler = parsed.Sampler
	steps = parsed.Steps
	cfg = parsed.CFGScale
	seed = parsed.Seed
	return
}

// Hugging Face API structs
type hfModelResponse struct {
	ID          string      `json:"id"`
	Author      string      `json:"author"`
	Tags        []string    `json:"tags"`
	PipelineTag string      `json:"pipeline_tag"`
	Siblings    []hfSibling `json:"siblings"`
}

type hfSibling struct {
	RFilename string `json:"rfilename"`
}
