package handlers

import (
	"net/http"
	"strconv"

	"github.com/alazriel6/models-guide/backend/internal/services"
	"github.com/gin-gonic/gin"
)

type BooruTagHandler struct {
	service *services.BooruTagService
}

func NewBooruTagHandler(service *services.BooruTagService) *BooruTagHandler {
	return &BooruTagHandler{service: service}
}

// GetTags handles GET /api/booru-tags?q=...&category=...&limit=...
func (h *BooruTagHandler) GetTags(c *gin.Context) {
	query := c.Query("q")
	category := c.Query("category")
	layer := c.Query("layer")
	limitStr := c.DefaultQuery("limit", "15")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 15
	}
	if limit > 50 {
		limit = 50
	}

	tags, err := h.service.Search(query, category, layer, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to search booru tags: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, tags)
}
