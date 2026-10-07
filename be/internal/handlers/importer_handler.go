package handlers

import (
	"net/http"

	"github.com/alazriel6/models-guide/backend/internal/services"
	"github.com/gin-gonic/gin"
)

type ImporterHandler struct {
	service *services.ImporterService
}

func NewImporterHandler(service *services.ImporterService) *ImporterHandler {
	return &ImporterHandler{service: service}
}

// InspectModel fetches model information from Civitai or Hugging Face without saving to DB yet.
func (h *ImporterHandler) InspectModel(c *gin.Context) {
	var input services.InspectModelInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	result, err := h.service.InspectModel(input)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// SaveImportedModel persists the inspected model, versions, tags, trigger words, and sample images into the database.
func (h *ImporterHandler) SaveImportedModel(c *gin.Context) {
	var input services.ImportModelSaveInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	createdModel, err := h.service.SaveImportedModel(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to import model: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Model imported successfully",
		"data":    createdModel,
	})
}
