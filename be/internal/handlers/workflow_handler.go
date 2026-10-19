package handlers

import (
	"net/http"
	"strconv"

	"github.com/alazriel6/models-guide/backend/internal/services"
	"github.com/gin-gonic/gin"
)

type WorkflowHandler struct {
	service *services.WorkflowService
}

func NewWorkflowHandler(service *services.WorkflowService) *WorkflowHandler {
	return &WorkflowHandler{service: service}
}

func (h *WorkflowHandler) GetWorkflows(c *gin.Context) {
	baseModel := c.Query("base_model")
	category := c.Query("category")
	search := c.Query("search")

	var modelID *uint
	if mIDStr := c.Query("model_id"); mIDStr != "" {
		if id, err := strconv.ParseUint(mIDStr, 10, 32); err == nil {
			uid := uint(id)
			modelID = &uid
		}
	}

	workflows, err := h.service.ListWorkflows(baseModel, category, search, modelID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch workflows", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  workflows,
		"total": len(workflows),
	})
}

func (h *WorkflowHandler) GetWorkflow(c *gin.Context) {
	idParam := c.Param("id")

	// Check if integer ID
	if id, err := strconv.ParseUint(idParam, 10, 32); err == nil {
		workflow, err := h.service.GetWorkflow(uint(id))
		if err == nil {
			c.JSON(http.StatusOK, gin.H{"data": workflow})
			return
		}
	}

	// Try slug
	workflow, err := h.service.GetWorkflowBySlug(idParam)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Workflow not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": workflow})
}

func (h *WorkflowHandler) CreateWorkflow(c *gin.Context) {
	var req services.CreateWorkflowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload", "details": err.Error()})
		return
	}

	workflow, err := h.service.CreateWorkflow(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create workflow", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Workflow created successfully",
		"data":    workflow,
	})
}

func (h *WorkflowHandler) UpdateWorkflow(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workflow ID"})
		return
	}

	var req services.UpdateWorkflowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload", "details": err.Error()})
		return
	}

	workflow, err := h.service.UpdateWorkflow(uint(id), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update workflow", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Workflow updated successfully",
		"data":    workflow,
	})
}

func (h *WorkflowHandler) DeleteWorkflow(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workflow ID"})
		return
	}

	if err := h.service.DeleteWorkflow(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete workflow", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Workflow deleted successfully"})
}
