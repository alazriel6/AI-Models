package handlers

import (
	"errors"
	"net/http"

	"github.com/alazriel6/models-guide/backend/internal/services"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ControlNetHandler struct {
	service *services.ControlNetService
}

func NewControlNetHandler(service *services.ControlNetService) *ControlNetHandler {
	return &ControlNetHandler{service: service}
}

func (h *ControlNetHandler) GetPoses(c *gin.Context) {
	category := c.Query("category")
	search := c.Query("search")

	poses, err := h.service.ListPoses(category, search)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  poses,
		"total": len(poses),
	})
}

func (h *ControlNetHandler) GetPose(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid pose ID"})
		return
	}

	pose, err := h.service.GetPoseByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Pose not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, pose)
}

func (h *ControlNetHandler) CreatePose(c *gin.Context) {
	var input services.CreateControlNetPoseInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	pose, err := h.service.CreatePose(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, pose)
}

func (h *ControlNetHandler) UpdatePose(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid pose ID"})
		return
	}

	var input services.UpdateControlNetPoseInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	pose, err := h.service.UpdatePose(id, input)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Pose not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, pose)
}

func (h *ControlNetHandler) DeletePose(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid pose ID"})
		return
	}

	if err := h.service.DeletePose(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Pose deleted successfully"})
}

// ----------------------------------------------------------------------------
// ControlNet Models Handlers
// ----------------------------------------------------------------------------

func (h *ControlNetHandler) GetModels(c *gin.Context) {
	baseModel := c.Query("base_model")
	controlType := c.Query("control_type")
	search := c.Query("search")

	modelsList, err := h.service.ListModels(baseModel, controlType, search)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  modelsList,
		"total": len(modelsList),
	})
}

func (h *ControlNetHandler) GetModel(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid model ID"})
		return
	}

	m, err := h.service.GetModelByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Model not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, m)
}

func (h *ControlNetHandler) CreateModel(c *gin.Context) {
	var input services.CreateControlNetModelInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	m, err := h.service.CreateModel(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, m)
}

func (h *ControlNetHandler) UpdateModel(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid model ID"})
		return
	}

	var input services.UpdateControlNetModelInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	m, err := h.service.UpdateModel(id, input)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Model not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, m)
}

func (h *ControlNetHandler) DeleteModel(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid model ID"})
		return
	}

	if err := h.service.DeleteModel(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Model deleted successfully"})
}

