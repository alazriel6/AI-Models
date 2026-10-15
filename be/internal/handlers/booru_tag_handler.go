package handlers

import (
	"net/http"
	"strconv"

	"github.com/alazriel6/models-guide/backend/internal/models"
	"github.com/alazriel6/models-guide/backend/internal/services"
	"github.com/gin-gonic/gin"
)

type BooruTagHandler struct {
	service *services.BooruTagService
}

func NewBooruTagHandler(service *services.BooruTagService) *BooruTagHandler {
	return &BooruTagHandler{service: service}
}

// GetTags handles GET /api/booru-tags?q=...&category=...&limit=...&page=...&sort=...
func (h *BooruTagHandler) GetTags(c *gin.Context) {
	query := c.Query("q")
	category := c.Query("category")
	layer := c.Query("layer")
	sort := c.Query("sort")
	paginate := c.Query("paginate")
	pageStr := c.Query("page")

	limitStr := c.DefaultQuery("limit", "15")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 15
	}

	// If pagination is requested (e.g. for full catalog explorer)
	if paginate == "true" || pageStr != "" {
		if limit > 100 {
			limit = 100
		}
		page, _ := strconv.Atoi(pageStr)
		if page <= 0 {
			page = 1
		}

		tags, total, err := h.service.SearchPaginated(query, category, layer, sort, page, limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to search booru tags: " + err.Error(),
			})
			return
		}

		totalPages := int((total + int64(limit) - 1) / int64(limit))
		c.JSON(http.StatusOK, gin.H{
			"tags":        tags,
			"total":       total,
			"page":        page,
			"limit":       limit,
			"total_pages": totalPages,
		})
		return
	}

	// Default unpaginated query (for fast inline autocomplete)
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

// GetStats handles GET /api/booru-tags/stats
func (h *BooruTagHandler) GetStats(c *gin.Context) {
	stats, err := h.service.GetStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get booru tag stats: " + err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, stats)
}

// CreateTag handles POST /api/booru-tags
func (h *BooruTagHandler) CreateTag(c *gin.Context) {
	var newTag struct {
		Name        string `json:"name" binding:"required"`
		Category    string `json:"category"`
		Layer       string `json:"layer"`
		PostCount   string `json:"post_count"`
		CountNum    int64  `json:"count_num"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&newTag); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tag data: " + err.Error()})
		return
	}

	if newTag.Category == "" {
		newTag.Category = "general"
	}
	if newTag.PostCount == "" {
		newTag.PostCount = "Custom"
	}

	modelTag := models.BooruTag{
		Name:        newTag.Name,
		Category:    newTag.Category,
		Layer:       newTag.Layer,
		PostCount:   newTag.PostCount,
		CountNum:    newTag.CountNum,
		Description: newTag.Description,
	}
	if err := h.service.CreateTag(&modelTag); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create booru tag: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, modelTag)
}

