package database

import (
	"log"

	"github.com/alazriel6/models-guide/backend/internal/models"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

func Seed(db *gorm.DB) error {
	var count int64
	db.Model(&models.Model{}).Count(&count)
	if count > 0 {
		log.Println("Database already contains data, skipping seed")
		return nil
	}

	log.Println("Seeding initial data...")

	// Tags
	tags := []models.Tag{
		{Name: "Anime", Slug: "anime"},
		{Name: "Illustration", Slug: "illustration"},
		{Name: "Semi-Realistic", Slug: "semi-realistic"},
		{Name: "Photorealistic", Slug: "photorealistic"},
		{Name: "Style LoRA", Slug: "style-lora"},
	}
	for i := range tags {
		if err := db.FirstOrCreate(&tags[i], models.Tag{Slug: tags[i].Slug}).Error; err != nil {
			return err
		}
	}

	// Model: rinFlanime
	model := models.Model{
		Name:        "rinFlanime",
		Slug:        "rinflanime",
		Type:        "checkpoint",
		BaseModel:   "SD 1.5",
		Author:      "rin",
		Description: "A fine-tuned SD 1.5 anime checkpoint focused on clean lineart and vibrant colors.",
		CivitaiURL:  "https://civitai.com/models/rinflanime",
		Tags:        []models.Tag{tags[0], tags[1]},
		Versions: []models.ModelVersion{
			{
				VersionName:       "v1.0 Initial",
				VersionNumber:     "1.0.0",
				FileName:          "rinflanime_v1.safetensors",
				FileSize:          2147483648, // 2 GB
				Format:            "safetensors",
				DownloadURL:       "https://example.com/download/rinflanime_v1.safetensors",
				CivitaiVersionURL: "https://civitai.com/models/rinflanime?modelVersionId=1001",
				RecommendedSettings: datatypes.JSON([]byte(`{
					"sampler": "DPM++ 2M Karras",
					"steps": 28,
					"cfg_scale": 7.0,
					"clip_skip": 2,
					"width": 512,
					"height": 768,
					"hires_upscaler": "R-ESRGAN 4x+ Anime6B",
					"hires_steps": 15,
					"hires_upscale": 1.5,
					"denoising_strength": 0.55
				}`)),
			},
		},
	}

	if err := db.Create(&model).Error; err != nil {
		return err
	}

	// Resources
	loraResource := models.Resource{
		Name:    "Detailed Eyes LoRA",
		Type:    "lora",
		Version: "1.0",
		URL:     "https://example.com/loras/detailed-eyes",
		Metadata: datatypes.JSON([]byte(`{
			"trigger_words": ["detailed eyes", "sparkle eyes"],
			"base_model": "SD 1.5"
		}`)),
	}
	if err := db.Create(&loraResource).Error; err != nil {
		return err
	}

	log.Println("Seeding complete")
	return nil
}
