package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/alazriel6/models-guide/backend/internal/models"
	"github.com/alazriel6/models-guide/backend/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type PromptPresetHandler struct {
	service     *services.PromptPresetService
	storagePath string
}

func NewPromptPresetHandler(service *services.PromptPresetService, storagePath string) *PromptPresetHandler {
	return &PromptPresetHandler{service: service, storagePath: storagePath}
}

func (h *PromptPresetHandler) UploadSampleImage(c *gin.Context) {
	fileHeader, err := c.FormFile("image")
	if err != nil {
		fileHeader, err = c.FormFile("file")
	}
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No image file provided"})
		return
	}

	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if ext != ".png" && ext != ".jpg" && ext != ".jpeg" && ext != ".webp" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file format. Allowed: .png, .jpg, .jpeg, .webp"})
		return
	}

	if fileHeader.Size > 20*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File exceeds maximum size of 20MB"})
		return
	}

	if err := os.MkdirAll(h.storagePath, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create storage directory"})
		return
	}

	fileName := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	destPath := filepath.Join(h.storagePath, fileName)

	if err := c.SaveUploadedFile(fileHeader, destPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save uploaded file"})
		return
	}

	url := "/storage/images/" + fileName
	c.JSON(http.StatusOK, gin.H{
		"url":      url,
		"filename": fileName,
	})
}

func (h *PromptPresetHandler) GetPresets(c *gin.Context) {
	category := c.Query("category")
	subcategory := c.Query("subcategory")
	baseModel := c.Query("base_model")
	presetType := c.Query("type")
	search := c.Query("search")

	presets, err := h.service.List(category, subcategory, baseModel, presetType, search)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  presets,
		"total": len(presets),
	})
}

func (h *PromptPresetHandler) GetPreset(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid preset ID"})
		return
	}

	preset, err := h.service.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Preset not found"})
		return
	}

	c.JSON(http.StatusOK, preset)
}

func (h *PromptPresetHandler) CreatePreset(c *gin.Context) {
	var preset models.PromptPreset
	if err := c.ShouldBindJSON(&preset); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if preset.Title == "" || preset.PositivePrompt == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Title and PositivePrompt are required"})
		return
	}

	if err := h.service.Create(&preset); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, preset)
}

func (h *PromptPresetHandler) UpdatePreset(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid preset ID"})
		return
	}

	var preset models.PromptPreset
	if err := c.ShouldBindJSON(&preset); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.Update(uint(id), &preset); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Preset updated successfully"})
}

func (h *PromptPresetHandler) DeletePreset(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid preset ID"})
		return
	}

	if err := h.service.Delete(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Preset deleted successfully"})
}
