package repositories

import (
	"strings"

	"github.com/alazriel6/models-guide/backend/internal/models"
	"gorm.io/gorm"
)

type NegativeVaultRepository struct {
	db *gorm.DB
}

func NewNegativeVaultRepository(db *gorm.DB) *NegativeVaultRepository {
	return &NegativeVaultRepository{db: db}
}

// ----------------------------------------------------------------------------
// Negative Presets
// ----------------------------------------------------------------------------

func (r *NegativeVaultRepository) FindPresets(arch, category, search string) ([]models.NegativePreset, error) {
	var presets []models.NegativePreset
	query := r.db.Model(&models.NegativePreset{})

	if arch != "" && strings.ToLower(arch) != "all" {
		query = query.Where("LOWER(architecture) = ? OR LOWER(architecture) = 'all'", strings.ToLower(arch))
	}

	if category != "" && strings.ToLower(category) != "all" {
		query = query.Where("LOWER(category) = ?", strings.ToLower(category))
	}

	if search != "" {
		searchTerm := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(prompt) LIKE ? OR LOWER(tags) LIKE ?", searchTerm, searchTerm, searchTerm, searchTerm)
	}

	err := query.Order("is_system DESC, id ASC").Find(&presets).Error
	return presets, err
}

func (r *NegativeVaultRepository) FindPresetByID(id uint) (*models.NegativePreset, error) {
	var preset models.NegativePreset
	if err := r.db.First(&preset, id).Error; err != nil {
		return nil, err
	}
	return &preset, nil
}

func (r *NegativeVaultRepository) CreatePreset(preset *models.NegativePreset) error {
	return r.db.Create(preset).Error
}

func (r *NegativeVaultRepository) UpdatePreset(preset *models.NegativePreset) error {
	return r.db.Save(preset).Error
}

func (r *NegativeVaultRepository) DeletePreset(id uint) error {
	return r.db.Delete(&models.NegativePreset{}, id).Error
}

// ----------------------------------------------------------------------------
// Embeddings
// ----------------------------------------------------------------------------

func (r *NegativeVaultRepository) FindEmbeddings(arch, search string) ([]models.EmbeddingResource, error) {
	var embeddings []models.EmbeddingResource
	query := r.db.Model(&models.EmbeddingResource{})

	if arch != "" && strings.ToLower(arch) != "all" {
		query = query.Where("LOWER(architecture) = ?", strings.ToLower(arch))
	}

	if search != "" {
		searchTerm := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(filename) LIKE ? OR LOWER(description) LIKE ? OR LOWER(suppressed_tags) LIKE ?", searchTerm, searchTerm, searchTerm, searchTerm)
	}

	err := query.Order("is_system DESC, id ASC").Find(&embeddings).Error
	return embeddings, err
}

func (r *NegativeVaultRepository) FindEmbeddingByID(id uint) (*models.EmbeddingResource, error) {
	var emb models.EmbeddingResource
	if err := r.db.First(&emb, id).Error; err != nil {
		return nil, err
	}
	return &emb, nil
}

func (r *NegativeVaultRepository) CreateEmbedding(emb *models.EmbeddingResource) error {
	return r.db.Create(emb).Error
}

func (r *NegativeVaultRepository) UpdateEmbedding(emb *models.EmbeddingResource) error {
	return r.db.Save(emb).Error
}

func (r *NegativeVaultRepository) DeleteEmbedding(id uint) error {
	return r.db.Delete(&models.EmbeddingResource{}, id).Error
}
