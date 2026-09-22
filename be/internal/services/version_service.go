package services

import (
	"strings"

	"github.com/alazriel6/models-guide/backend/internal/models"
	"github.com/alazriel6/models-guide/backend/internal/repositories"
	"gorm.io/datatypes"
)

type CreateVersionInput struct {
	VersionName         string         `json:"version_name" binding:"required"`
	VersionNumber       string         `json:"version_number"`
	FileName            string         `json:"file_name"`
	FileSize            int64          `json:"file_size"`
	Format              string         `json:"format"`
	DownloadURL         string         `json:"download_url"`
	CivitaiVersionURL   string         `json:"civitai_version_url"`
	RecommendedSettings datatypes.JSON `json:"recommended_settings"`
}

type UpdateVersionInput struct {
	VersionName         *string         `json:"version_name"`
	VersionNumber       *string         `json:"version_number"`
	FileName            *string         `json:"file_name"`
	FileSize            *int64          `json:"file_size"`
	Format              *string         `json:"format"`
	DownloadURL         *string         `json:"download_url"`
	CivitaiVersionURL   *string         `json:"civitai_version_url"`
	RecommendedSettings *datatypes.JSON `json:"recommended_settings"`
}

type VersionService struct {
	versionRepo *repositories.VersionRepository
	modelRepo   *repositories.ModelRepository
}

func NewVersionService(versionRepo *repositories.VersionRepository, modelRepo *repositories.ModelRepository) *VersionService {
	return &VersionService{
		versionRepo: versionRepo,
		modelRepo:   modelRepo,
	}
}

func (s *VersionService) ListByModelID(modelID uint) ([]models.ModelVersion, error) {
	if _, err := s.modelRepo.FindByID(modelID); err != nil {
		return nil, err
	}
	return s.versionRepo.FindByModelID(modelID)
}

func (s *VersionService) GetByID(id uint) (*models.ModelVersion, error) {
	return s.versionRepo.FindByID(id)
}

func (s *VersionService) Create(modelID uint, input CreateVersionInput) (*models.ModelVersion, error) {
	if _, err := s.modelRepo.FindByID(modelID); err != nil {
		return nil, err
	}

	version := &models.ModelVersion{
		ModelID:             modelID,
		VersionName:         strings.TrimSpace(input.VersionName),
		VersionNumber:       strings.TrimSpace(input.VersionNumber),
		FileName:            strings.TrimSpace(input.FileName),
		FileSize:            input.FileSize,
		Format:              strings.TrimSpace(input.Format),
		DownloadURL:         strings.TrimSpace(input.DownloadURL),
		CivitaiVersionURL:   strings.TrimSpace(input.CivitaiVersionURL),
		RecommendedSettings: input.RecommendedSettings,
	}

	if err := s.versionRepo.Create(version); err != nil {
		return nil, err
	}

	return version, nil
}

func (s *VersionService) Update(id uint, input UpdateVersionInput) (*models.ModelVersion, error) {
	version, err := s.versionRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	if input.VersionName != nil {
		version.VersionName = strings.TrimSpace(*input.VersionName)
	}
	if input.VersionNumber != nil {
		version.VersionNumber = strings.TrimSpace(*input.VersionNumber)
	}
	if input.FileName != nil {
		version.FileName = strings.TrimSpace(*input.FileName)
	}
	if input.FileSize != nil {
		version.FileSize = *input.FileSize
	}
	if input.Format != nil {
		version.Format = strings.TrimSpace(*input.Format)
	}
	if input.DownloadURL != nil {
		version.DownloadURL = strings.TrimSpace(*input.DownloadURL)
	}
	if input.CivitaiVersionURL != nil {
		version.CivitaiVersionURL = strings.TrimSpace(*input.CivitaiVersionURL)
	}
	if input.RecommendedSettings != nil {
		version.RecommendedSettings = *input.RecommendedSettings
	}

	if err := s.versionRepo.Update(version); err != nil {
		return nil, err
	}

	return version, nil
}

func (s *VersionService) Delete(id uint) error {
	if _, err := s.versionRepo.FindByID(id); err != nil {
		return err
	}
	return s.versionRepo.Delete(id)
}
