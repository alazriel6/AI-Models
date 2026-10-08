package handlers

import (
	"net/http"
	"strconv"

	"github.com/alazriel6/models-guide/backend/internal/services"
	"github.com/gin-gonic/gin"
)

type ThumbnailHandler struct {
	service *services.ThumbnailService
}

func NewThumbnailHandler(service *services.ThumbnailService) *ThumbnailHandler {
	return &ThumbnailHandler{service: service}
}

// ServeThumbnail serves a fast, compressed thumbnail for images in storage
func (h *ThumbnailHandler) ServeThumbnail(c *gin.Context) {
	filename := c.Param("filename")
	if filename == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Filename required"})
		return
	}

	maxDim := 480
	if w := c.Query("w"); w != "" {
		if parsed, err := strconv.Atoi(w); err == nil && parsed > 50 && parsed <= 1200 {
			maxDim = parsed
		}
	}

	thumbPath, err := h.service.GetOrCreateThumbnail(filename, maxDim)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// Long-lived cache header for immutable thumbnails
	c.Header("Cache-Control", "public, max-age=31536000, immutable")
	c.Header("Content-Type", "image/jpeg")
	c.File(thumbPath)
}
