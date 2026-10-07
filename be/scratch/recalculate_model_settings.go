package main

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"github.com/alazriel6/models-guide/backend/internal/config"
	"github.com/alazriel6/models-guide/backend/internal/database"
	"github.com/alazriel6/models-guide/backend/internal/models"
	"github.com/alazriel6/models-guide/backend/internal/services"
	"gorm.io/datatypes"
)

func main() {
	cfg := config.Load()
	db := database.Connect(cfg)

	var allModels []models.Model
	if err := db.Preload("Versions").Preload("Images").Find(&allModels).Error; err != nil {
		log.Fatalf("Failed to fetch models: %v", err)
	}

	for _, m := range allModels {
		fmt.Printf("\n=== Processing Model #%d: %s (Base: %s, Versions: %d) ===\n", m.ID, m.Name, m.BaseModel, len(m.Versions))

		// Convert model images to InspectedImage
		var allImages []services.InspectedImage
		for _, img := range m.Images {
			allImages = append(allImages, services.InspectedImage{
				URL:            img.ImageURL,
				Caption:        img.Caption,
				Width:          img.Width,
				Height:         img.Height,
				Sampler:        img.Sampler,
				Scheduler:      img.Scheduler,
				Steps:          img.Steps,
				CFGScale:       img.CFGScale,
				PositivePrompt: img.PositivePrompt,
			})
		}

		for _, v := range m.Versions {
			// Find images for this version
			var vImages []services.InspectedImage
			for _, img := range allImages {
				if strings.Contains(strings.ToLower(img.Caption), strings.ToLower(v.VersionName)) {
					vImages = append(vImages, img)
				}
			}
			if len(vImages) == 0 {
				vImages = allImages
			}

			// Extract settings
			rec := services.ExtractRecommendedSettings(
				m.BaseModel,
				[]string{m.Description, v.VersionName},
				vImages,
			)

			recBytes, err := json.Marshal(rec)
			if err != nil {
				log.Printf("JSON error for version %s: %v", v.VersionName, err)
				continue
			}

			v.RecommendedSettings = datatypes.JSON(recBytes)
			if err := db.Save(&v).Error; err != nil {
				log.Printf("Error updating version %s: %v", v.VersionName, err)
			} else {
				fmt.Printf("  -> Version '%s' (ID %d): %s\n", v.VersionName, v.ID, string(recBytes))
			}
		}
	}

	fmt.Println("\nAll model version settings successfully recalculated!")
}
