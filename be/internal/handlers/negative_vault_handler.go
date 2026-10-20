package handlers

import (
	"errors"
	"net/http"

	"github.com/alazriel6/models-guide/backend/internal/services"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type NegativeVaultHandler struct {
	service *services.NegativeVaultService
}

func NewNegativeVaultHandler(service *services.NegativeVaultService) *NegativeVaultHandler {
	return &NegativeVaultHandler{service: service}
}

// ----------------------------------------------------------------------------
// Negative Presets Handlers
// ----------------------------------------------------------------------------

func (h *NegativeVaultHandler) GetPresets(c *gin.Context) {
	arch := c.Query("architecture")
	category := c.Query("category")
	search := c.Query("search")

	presets, err := h.service.ListPresets(arch, category, search)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  presets,
		"total": len(presets),
	})
}

func (h *NegativeVaultHandler) GetPreset(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid preset ID"})
		return
	}

	preset, err := h.service.GetPresetByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Preset not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, preset)
}

func (h *NegativeVaultHandler) CreatePreset(c *gin.Context) {
	var input services.CreateNegativePresetInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	preset, err := h.service.CreatePreset(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, preset)
}

func (h *NegativeVaultHandler) UpdatePreset(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid preset ID"})
		return
	}

	var input services.UpdateNegativePresetInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	preset, err := h.service.UpdatePreset(id, input)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Preset not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, preset)
}

func (h *NegativeVaultHandler) DeletePreset(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid preset ID"})
		return
	}

	if err := h.service.DeletePreset(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Preset deleted successfully"})
}

// ----------------------------------------------------------------------------
// Embeddings Handlers
// ----------------------------------------------------------------------------

func (h *NegativeVaultHandler) GetEmbeddings(c *gin.Context) {
	arch := c.Query("architecture")
	search := c.Query("search")

	embeddings, err := h.service.ListEmbeddings(arch, search)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  embeddings,
		"total": len(embeddings),
	})
}

func (h *NegativeVaultHandler) GetEmbedding(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid embedding ID"})
		return
	}

	emb, err := h.service.GetEmbeddingByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Embedding not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, emb)
}

func (h *NegativeVaultHandler) CreateEmbedding(c *gin.Context) {
	var input services.CreateEmbeddingInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	emb, err := h.service.CreateEmbedding(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, emb)
}

func (h *NegativeVaultHandler) UpdateEmbedding(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid embedding ID"})
		return
	}

	var input services.UpdateEmbeddingInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	emb, err := h.service.UpdateEmbedding(id, input)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Embedding not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, emb)
}

func (h *NegativeVaultHandler) DeleteEmbedding(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid embedding ID"})
		return
	}

	if err := h.service.DeleteEmbedding(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Embedding deleted successfully"})
}
