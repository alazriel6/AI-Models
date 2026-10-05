package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/alazriel6/models-guide/backend/internal/parser"
	"github.com/alazriel6/models-guide/backend/internal/repositories"
	"github.com/alazriel6/models-guide/backend/internal/services"
	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type ImageHandler struct {
	service *services.ImageService
}

func NewImageHandler(service *services.ImageService) *ImageHandler {
	return &ImageHandler{service: service}
}

func (h *ImageHandler) GetAllImages(c *gin.Context) {
	var filter repositories.ImageFilter

	if modelIDStr := c.Query("model_id"); modelIDStr != "" {
		if id, err := strconv.ParseUint(modelIDStr, 10, 32); err == nil {
			filter.ModelID = uint(id)
		}
	}

	filter.Search = strings.TrimSpace(c.Query("search"))
	filter.BaseModel = strings.TrimSpace(c.Query("base_model"))
	filter.Tag = strings.TrimSpace(c.Query("tag"))
	filter.Sort = strings.TrimSpace(c.Query("sort"))

	page := 1
	limit := 100
	if p, err := strconv.Atoi(c.Query("page")); err == nil && p > 0 {
		page = p
	}
	if l, err := strconv.Atoi(c.Query("limit")); err == nil && l > 0 {
		if l > 200 {
			l = 200
		}
		limit = l
	}

	filter.Limit = limit
	filter.Offset = (page - 1) * limit

	images, total, err := h.service.ListAll(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	totalPages := 0
	if limit > 0 {
		totalPages = int((total + int64(limit) - 1) / int64(limit))
	}

	c.JSON(http.StatusOK, gin.H{
		"data": images,
		"pagination": gin.H{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": totalPages,
		},
	})
}

func (h *ImageHandler) GetImages(c *gin.Context) {
	modelID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid model ID"})
		return
	}

	images, err := h.service.ListByModelID(modelID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Model not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, images)
}

func (h *ImageHandler) GetImage(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid image ID"})
		return
	}

	image, err := h.service.GetByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Image not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, image)
}

func (h *ImageHandler) UploadImage(c *gin.Context) {
	modelID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid model ID"})
		return
	}

	var meta services.CreateImageMetadataInput

	// Check if JSON request
	if strings.Contains(c.ContentType(), "application/json") {
		if err := c.ShouldBindJSON(&meta); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		imageRecord, err := h.service.Upload(&modelID, nil, meta)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "Model not found"})
				return
			}
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, imageRecord)
		return
	}

	// Multipart / Form-Data
	file, _ := c.FormFile("image")
	if file == nil {
		file, _ = c.FormFile("file")
	}

	meta.ImageURL = c.PostForm("image_url")
	if file == nil && strings.TrimSpace(meta.ImageURL) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Image file ('image' or 'file') or 'image_url' is required"})
		return
	}

	meta.Caption = c.PostForm("caption")
	meta.PositivePrompt = c.PostForm("positive_prompt")
	meta.NegativePrompt = c.PostForm("negative_prompt")
	meta.Sampler = c.PostForm("sampler")
	meta.Scheduler = c.PostForm("scheduler")
	meta.HiresUpscaler = c.PostForm("hires_upscaler")

	if widthStr := c.PostForm("width"); widthStr != "" {
		meta.Width, _ = strconv.Atoi(widthStr)
	}
	if heightStr := c.PostForm("height"); heightStr != "" {
		meta.Height, _ = strconv.Atoi(heightStr)
	}
	if seedStr := c.PostForm("seed"); seedStr != "" {
		meta.Seed, _ = strconv.ParseInt(seedStr, 10, 64)
	}
	if stepsStr := c.PostForm("steps"); stepsStr != "" {
		meta.Steps, _ = strconv.Atoi(stepsStr)
	}
	if cfgStr := c.PostForm("cfg_scale"); cfgStr != "" {
		meta.CFGScale, _ = strconv.ParseFloat(cfgStr, 64)
	}
	if clipStr := c.PostForm("clip_skip"); clipStr != "" {
		meta.ClipSkip, _ = strconv.Atoi(clipStr)
	}
	if hiresUpStr := c.PostForm("hires_upscale"); hiresUpStr != "" {
		meta.HiresUpscale, _ = strconv.ParseFloat(hiresUpStr, 64)
	}
	if hiresStepsStr := c.PostForm("hires_steps"); hiresStepsStr != "" {
		meta.HiresSteps, _ = strconv.Atoi(hiresStepsStr)
	}
	if denoiseStr := c.PostForm("denoising_strength"); denoiseStr != "" {
		meta.DenoisingStr, _ = strconv.ParseFloat(denoiseStr, 64)
	}
	if rawMetaStr := c.PostForm("raw_metadata"); rawMetaStr != "" {
		if json.Valid([]byte(rawMetaStr)) {
			meta.RawMetadata = datatypes.JSON([]byte(rawMetaStr))
		}
	}
	if resourcesStr := c.PostForm("resources"); resourcesStr != "" {
		var resList []services.ImageResourceInput
		if err := json.Unmarshal([]byte(resourcesStr), &resList); err == nil {
			meta.Resources = resList
		}
	}
	meta.Tags = parseTagsFromForm(c)

	imageRecord, err := h.service.Upload(&modelID, file, meta)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Model not found"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, imageRecord)
}

// UploadGalleryImage handles standalone or model-linked image creation directly into the gallery.
func (h *ImageHandler) UploadGalleryImage(c *gin.Context) {
	var meta services.CreateImageMetadataInput

	// Check if JSON request
	if strings.Contains(c.ContentType(), "application/json") {
		if err := c.ShouldBindJSON(&meta); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		imageRecord, err := h.service.Upload(meta.ModelID, nil, meta)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, imageRecord)
		return
	}

	// Multipart / Form-Data
	file, _ := c.FormFile("image")
	if file == nil {
		file, _ = c.FormFile("file")
	}

	meta.ImageURL = c.PostForm("image_url")
	if file == nil && strings.TrimSpace(meta.ImageURL) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Image file ('image' or 'file') or 'image_url' is required"})
		return
	}

	if modelIDStr := c.PostForm("model_id"); modelIDStr != "" {
		if id, err := strconv.ParseUint(modelIDStr, 10, 32); err == nil && id > 0 {
			uid := uint(id)
			meta.ModelID = &uid
		}
	}

	meta.ModelName = c.PostForm("model_name")
	meta.Caption = c.PostForm("caption")
	meta.PositivePrompt = c.PostForm("positive_prompt")
	meta.NegativePrompt = c.PostForm("negative_prompt")
	meta.Sampler = c.PostForm("sampler")
	meta.Scheduler = c.PostForm("scheduler")
	meta.HiresUpscaler = c.PostForm("hires_upscaler")

	if widthStr := c.PostForm("width"); widthStr != "" {
		meta.Width, _ = strconv.Atoi(widthStr)
	}
	if heightStr := c.PostForm("height"); heightStr != "" {
		meta.Height, _ = strconv.Atoi(heightStr)
	}
	if seedStr := c.PostForm("seed"); seedStr != "" {
		meta.Seed, _ = strconv.ParseInt(seedStr, 10, 64)
	}
	if stepsStr := c.PostForm("steps"); stepsStr != "" {
		meta.Steps, _ = strconv.Atoi(stepsStr)
	}
	if cfgStr := c.PostForm("cfg_scale"); cfgStr != "" {
		meta.CFGScale, _ = strconv.ParseFloat(cfgStr, 64)
	}
	if clipStr := c.PostForm("clip_skip"); clipStr != "" {
		meta.ClipSkip, _ = strconv.Atoi(clipStr)
	}
	if hiresUpStr := c.PostForm("hires_upscale"); hiresUpStr != "" {
		meta.HiresUpscale, _ = strconv.ParseFloat(hiresUpStr, 64)
	}
	if hiresStepsStr := c.PostForm("hires_steps"); hiresStepsStr != "" {
		meta.HiresSteps, _ = strconv.Atoi(hiresStepsStr)
	}
	if denoiseStr := c.PostForm("denoising_strength"); denoiseStr != "" {
		meta.DenoisingStr, _ = strconv.ParseFloat(denoiseStr, 64)
	}
	if rawMetaStr := c.PostForm("raw_metadata"); rawMetaStr != "" {
		if json.Valid([]byte(rawMetaStr)) {
			meta.RawMetadata = datatypes.JSON([]byte(rawMetaStr))
		}
	}
	if resourcesStr := c.PostForm("resources"); resourcesStr != "" {
		var resList []services.ImageResourceInput
		if err := json.Unmarshal([]byte(resourcesStr), &resList); err == nil {
			meta.Resources = resList
		}
	}
	meta.Tags = parseTagsFromForm(c)

	imageRecord, err := h.service.Upload(meta.ModelID, file, meta)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, imageRecord)
}

func (h *ImageHandler) SetAsThumbnail(c *gin.Context) {
	modelID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid model ID"})
		return
	}
	imageID, err := parseUintParam(c, "imageId")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid image ID"})
		return
	}

	if err := h.service.SetAsThumbnail(modelID, imageID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Thumbnail updated successfully"})
}

func (h *ImageHandler) UpdateImage(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid image ID"})
		return
	}

	var input services.UpdateImageInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	image, err := h.service.Update(id, input)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Image not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, image)
}

func (h *ImageHandler) DeleteImage(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid image ID"})
		return
	}

	if err := h.service.Delete(id); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Image not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Image deleted successfully"})
}

type attachResourceRequest struct {
	Weight float64 `json:"weight" form:"weight"`
}

func (h *ImageHandler) AttachResource(c *gin.Context) {
	imageID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid image ID"})
		return
	}

	resourceID, err := parseUintParam(c, "resourceID")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid resource ID"})
		return
	}

	var req attachResourceRequest
	_ = c.ShouldBind(&req)

	if err := h.service.AttachResource(imageID, resourceID, req.Weight); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Image or resource not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Resource attached to image successfully"})
}

func (h *ImageHandler) DetachResource(c *gin.Context) {
	imageID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid image ID"})
		return
	}

	resourceID, err := parseUintParam(c, "resourceID")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid resource ID"})
		return
	}

	if err := h.service.DetachResource(imageID, resourceID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Image or resource not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Resource detached from image successfully"})
}

// ParseMetadata inspects an uploaded file (PNG, WebP, JPEG, JSON) and extracts full generation parameters.
func (h *ImageHandler) ParseMetadata(c *gin.Context) {
	file, err := c.FormFile("image")
	if file == nil {
		file, err = c.FormFile("file")
	}
	if file == nil || err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Image file ('image' or 'file') is required"})
		return
	}

	f, err := file.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read file: " + err.Error()})
		return
	}
	defer f.Close()

	meta, err := parser.ParseImageMetadata(f, file.Filename)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error":   err.Error(),
			"message": "No embedded ComfyUI, Automatic1111, or generation parameters found in this file.",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"source":   meta.Source,
		"format":   meta.Format,
		"metadata": meta,
	})
}

func parseTagsFromForm(c *gin.Context) []string {
	var tags []string
	if tagsStr := c.PostForm("tags"); tagsStr != "" {
		if strings.HasPrefix(tagsStr, "[") {
			var tagList []string
			if err := json.Unmarshal([]byte(tagsStr), &tagList); err == nil {
				tags = tagList
			}
		} else {
			parts := strings.Split(tagsStr, ",")
			for _, p := range parts {
				p = strings.TrimSpace(p)
				if p != "" {
					tags = append(tags, p)
				}
			}
		}
	}
	if len(tags) == 0 {
		if formTags := c.PostFormArray("tags"); len(formTags) > 0 {
			tags = formTags
		}
	}
	return tags
}

