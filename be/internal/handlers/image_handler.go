package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

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
		imageRecord, err := h.service.Upload(modelID, nil, meta)
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

	imageRecord, err := h.service.Upload(modelID, file, meta)
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
