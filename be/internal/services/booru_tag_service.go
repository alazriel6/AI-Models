package services

import (
	"fmt"
	"strings"

	"github.com/alazriel6/models-guide/backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type BooruTagService struct {
	db *gorm.DB
}

func NewBooruTagService(db *gorm.DB) *BooruTagService {
	s := &BooruTagService{db: db}
	s.SeedInitialTags()
	return s
}

// Search queries booru tags matching the search term, optional category, and layer
func (s *BooruTagService) Search(query, category, layer string, limit int) ([]models.BooruTag, error) {
	if limit <= 0 || limit > 50 {
		limit = 10
	}

	rawQ := strings.TrimSpace(strings.ToLower(query))
	if rawQ == "" {
		var topTags []models.BooruTag
		q := s.db.Model(&models.BooruTag{})
		if category != "" && category != "all" {
			q = q.Where("category = ?", category)
		}
		if layer != "" && layer != "all" {
			q = q.Where("(layer = ? OR layer LIKE ? OR layer LIKE ? OR layer LIKE ?)",
				layer, layer+",%", "%,"+layer+",%", "%,"+layer)
		}
		err := q.Order("count_num DESC").Limit(limit).Find(&topTags).Error
		return topTags, err
	}

	normQ := strings.ReplaceAll(rawQ, " ", "_")
	likeQ := "%" + normQ + "%"
	likeRaw := "%" + rawQ + "%"

	var tags []models.BooruTag
	dbQuery := s.db.Model(&models.BooruTag{}).
		Where("LOWER(name) LIKE ? OR LOWER(name) LIKE ? OR LOWER(description) LIKE ?", likeQ, likeRaw, likeRaw)

	if category != "" && category != "all" {
		dbQuery = dbQuery.Where("category = ?", category)
	}
	if layer != "" && layer != "all" {
		dbQuery = dbQuery.Where("(layer = ? OR layer LIKE ? OR layer LIKE ? OR layer LIKE ?)",
			layer, layer+",%", "%,"+layer+",%", "%,"+layer)
	}

	safeNormQ := strings.ReplaceAll(normQ, "'", "''")
	safeRawQ := strings.ReplaceAll(rawQ, "'", "''")

	// Order priority:
	// 1. Exact match
	// 2. Starts with query
	// 3. Highest popularity count_num
	orderClause := fmt.Sprintf(`
		CASE 
			WHEN LOWER(name) = '%s' OR LOWER(name) = '%s' THEN 1
			WHEN LOWER(name) LIKE '%s%%' OR LOWER(name) LIKE '%s%%' THEN 2
			ELSE 3
		END, count_num DESC
	`, safeNormQ, safeRawQ, safeNormQ, safeRawQ)

	err := dbQuery.Order(orderClause).Limit(limit).Find(&tags).Error
	return tags, err
}

// SeedInitialTags seeds over 1000 authentic Danbooru tags with layer taxonomy into PostgreSQL
func (s *BooruTagService) SeedInitialTags() {
	seeds := getComprehensiveBooruTagSeeds()

	// Batch upsert to PostgreSQL with ON CONFLICT (name) DO UPDATE
	if err := s.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "name"}},
		DoUpdates: clause.AssignmentColumns([]string{"layer", "category", "post_count", "count_num", "description"}),
	}).CreateInBatches(seeds, 100).Error; err != nil {
		fmt.Printf("Warning: failed to sync booru tags: %v\n", err)
	} else {
		var newCount int64
		s.db.Model(&models.BooruTag{}).Count(&newCount)
		fmt.Printf("Successfully synced %d Booru tags with layer taxonomy into PostgreSQL database!\n", newCount)
	}
}
