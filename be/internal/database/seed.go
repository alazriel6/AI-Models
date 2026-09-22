package database

import (
	"log"
	"time"

	"github.com/alazriel6/models-guide/backend/internal/models"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

func Seed(db *gorm.DB) error {
	return SeedData(db, false)
}

func SeedData(db *gorm.DB, force bool) error {
	var count int64
	db.Model(&models.Model{}).Count(&count)
	if count > 0 && !force {
		log.Println("Database already contains data, skipping seed (use force=true to re-seed)")
		return nil
	}

	log.Println("Seeding initial models, LoRAs, images, generation settings, reviews, and trigger words...")

	// If forcing, remove existing models to avoid duplicates and re-seed cleanly
	if force {
		var existingModels []models.Model
		db.Find(&existingModels)
		for _, m := range existingModels {
			db.Select("Images", "Versions", "Tags", "Reviews", "TriggerWords").Delete(&m)
		}
	}

	// 1. Tags
	tags := []models.Tag{
		{Name: "Anime", Slug: "anime"},
		{Name: "Illustration", Slug: "illustration"},
		{Name: "Style LoRA", Slug: "style-lora"},
		{Name: "Character", Slug: "character"},
		{Name: "Fashion", Slug: "fashion"},
		{Name: "Concept", Slug: "concept"},
	}
	for i := range tags {
		if err := db.FirstOrCreate(&tags[i], models.Tag{Slug: tags[i].Slug}).Error; err != nil {
			return err
		}
	}

	// 2. Resources for Generation (Checkpoints & LoRAs)
	resources := []models.Resource{
		{
			Name:    "Illustrious XL Base v0.1",
			Type:    "checkpoint",
			Version: "0.1",
			URL:     "https://civitai.com/models/illustrious-xl",
			Metadata: datatypes.JSON([]byte(`{
				"base_model": "Illustrious"
			}`)),
		},
		{
			Name:    "Detailed Anime Eyes LoRA",
			Type:    "lora",
			Version: "1.0",
			URL:     "https://civitai.com/models/detailed-anime-eyes",
			Metadata: datatypes.JSON([]byte(`{
				"trigger_words": ["detailed eyes", "sparkle eyes", "expressive pupils"],
				"base_model": "Illustrious"
			}`)),
		},
		{
			Name:    "Streetwear Aesthetic LoRA",
			Type:    "lora",
			Version: "1.2",
			URL:     "https://civitai.com/models/streetwear-aesthetic",
			Metadata: datatypes.JSON([]byte(`{
				"trigger_words": ["streetwear", "oversized jacket", "bucket hat"],
				"base_model": "NoobAI"
			}`)),
		},
		{
			Name:    "Soft Pastel Bloom LoRA",
			Type:    "lora",
			Version: "1.0",
			URL:     "https://civitai.com/models/soft-pastel-bloom",
			Metadata: datatypes.JSON([]byte(`{
				"trigger_words": ["pastel glow", "soft bloom"],
				"base_model": "Illustrious"
			}`)),
		},
	}
	for i := range resources {
		if err := db.FirstOrCreate(&resources[i], models.Resource{Name: resources[i].Name}).Error; err != nil {
			return err
		}
	}

	pubRaehoshi := time.Date(2024, time.August, 1, 0, 0, 0, 0, time.UTC)
	pubRinflanime := time.Date(2024, time.August, 20, 0, 0, 0, 0, time.UTC)
	pubEyes := time.Date(2024, time.September, 5, 0, 0, 0, 0, time.UTC)
	pubStreet := time.Date(2024, time.August, 29, 0, 0, 0, 0, time.UTC)
	pubPastel := time.Date(2024, time.August, 15, 0, 0, 0, 0, time.UTC)

	// 3. Model: Raehoshi Illust XL (Checkpoint, Base: Illustrious)
	raehoshi := models.Model{
		Name:            "Raehoshi Illust XL",
		Slug:            "raehoshi-illust-xl",
		Type:            "checkpoint",
		BaseModel:       "Illustrious",
		Author:          "raehoshi",
		Description:     "An enhanced iteration built upon the Illustrious XL model. It aims to elevate the visual style by addressing limitations such as oversaturation and artifact noise while delivering a balanced output.",
		SourceURL:       "https://civitai.com/models/840817",
		CivitaiURL:      "https://civitai.com/models/840817",
		ThumbnailURL:    "/images/preview-1.png",
		PublishedAt:     &pubRaehoshi,
		Likes:           3100,
		Rating:          4.95,
		TensorSize:      "2,517",
		VRAMMin:         "2.5 GB",
		VRAMRecommended: "7.7 GB",
		Conditioner:     587,
		FirstStageModel: 230,
		ModelTensor:     1600,
		Tags:            []models.Tag{tags[0], tags[1], tags[3]},
		Versions: []models.ModelVersion{
			{
				VersionName:   "v11.0",
				VersionNumber: "11.0.0",
				FileName:      "raehoshiIllust-v11.safetensors",
				FileSize:      6935715840,
				Format:        "SafeTensor",
				DownloadURL:   "https://civitai.com/api/download/models/1141586",
				CivitaiVersionURL: "https://civitai.com/models/840817?modelVersionId=1141586",
				RecommendedSettings: datatypes.JSON([]byte(`{
					"steps": 28,
					"sampler": "Euler a",
					"cfg_scale": 6.5,
					"width": 832,
					"height": 1216,
					"clip_skip": 2
				}`)),
			},
			{
				VersionName:   "vpred v3.0",
				VersionNumber: "3.0.0",
				FileName:      "raehoshiIllust-vpred-v3.0.safetensors",
				FileSize:      6935715840,
				Format:        "SafeTensor",
				DownloadURL:   "https://civitai.com/api/download/models/1192012",
				CivitaiVersionURL: "https://civitai.com/models/840817?modelVersionId=1192012",
				RecommendedSettings: datatypes.JSON([]byte(`{
					"steps": 30,
					"sampler": "DPM++ 2M Karras",
					"cfg_scale": 7.0,
					"width": 832,
					"height": 1216,
					"clip_skip": 2
				}`)),
			},
		},
		Reviews: []models.Review{
			{
				Reviewer:  "kuro_art",
				Rating:    5,
				Comment:   "Phenomenal anime line quality and very clean hands. One of the best Illustrious fine-tunes.",
				CreatedAt: pubRaehoshi.Add(24 * time.Hour),
			},
			{
				Reviewer:  "illust_fan",
				Rating:    5,
				Comment:   "Vibrant colors without the harsh neon oversaturation. Highly recommended.",
				CreatedAt: pubRaehoshi.Add(48 * time.Hour),
			},
		},
		Images: []models.ModelImage{
			{
				ImageURL:       "/images/preview-1.png",
				Caption:        "Kitsune anime girl illustration",
				Width:          832,
				Height:         1216,
				PositivePrompt: "masterpiece, best quality, ultra-detailed, 1girl, solo, kitsune, fox ears, fox girl, dark hair, red eyes, white floral hair accessory, traditional white and black layered yukata, golden ornaments, cherry blossom petals, looking at viewer",
				NegativePrompt: "(worst quality, low quality:1.4), deformed, bad hands, mutated fingers, blurry, watermark",
				Seed:           849201948,
				Steps:          28,
				CFGScale:       6.5,
				Sampler:        "Euler a",
				Scheduler:      "Normal",
				Resources:      []models.Resource{resources[0], resources[1]},
			},
			{
				ImageURL:       "/images/preview-2.png",
				Caption:        "Street anime girl with bucket hat",
				Width:          832,
				Height:         1216,
				PositivePrompt: "masterpiece, highly detailed illustration, 1girl, blonde hair, purple eyes, bucket hat with letter A, blue oversized jacket, smirk, street anime style, rim lighting, vibrant colors",
				NegativePrompt: "(worst quality, low quality:1.4), bad anatomy, extra limbs, poorly drawn face",
				Seed:           471902482,
				Steps:          30,
				CFGScale:       7.0,
				Sampler:        "DPM++ 2M Karras",
				Scheduler:      "Karras",
				Resources:      []models.Resource{resources[0], resources[2]},
			},
		},
	}
	if err := db.Create(&raehoshi).Error; err != nil {
		return err
	}

	// 4. Model: rinFlanime (Checkpoint, Base: NoobAI)
	rinflanime := models.Model{
		Name:            "rinFlanime",
		Slug:            "rinflanime",
		Type:            "checkpoint",
		BaseModel:       "NoobAI",
		Author:          "rin",
		Description:     "A fine-tuned anime checkpoint based on NoobAI focused on clean lineart, vibrant anime rendering, and sharp expressive eyes.",
		SourceURL:       "https://civitai.com/models/rinflanime",
		CivitaiURL:      "https://civitai.com/models/rinflanime",
		ThumbnailURL:    "/images/preview-2.png",
		PublishedAt:     &pubRinflanime,
		Likes:           2400,
		Rating:          4.91,
		TensorSize:      "2,517",
		VRAMMin:         "2.5 GB",
		VRAMRecommended: "7.7 GB",
		Conditioner:     587,
		FirstStageModel: 230,
		ModelTensor:     1600,
		Tags:            []models.Tag{tags[0], tags[1]},
		Versions: []models.ModelVersion{
			{
				VersionName:   "v1.0 Initial",
				VersionNumber: "1.0.0",
				FileName:      "rinflanime_v1.safetensors",
				FileSize:      2147483648,
				Format:        "SafeTensor",
				DownloadURL:   "https://civitai.com/models/rinflanime",
				CivitaiVersionURL: "https://civitai.com/models/rinflanime?modelVersionId=1001",
				RecommendedSettings: datatypes.JSON([]byte(`{
					"steps": 28,
					"sampler": "DPM++ 2M Karras",
					"cfg_scale": 7.0,
					"width": 832,
					"height": 1216,
					"clip_skip": 2,
					"hires_upscale": 1.5,
					"hires_upscaler": "R-ESRGAN 4x+ Anime6B",
					"denoising_strength": 0.55
				}`)),
			},
		},
		Reviews: []models.Review{
			{
				Reviewer:  "animenerd",
				Rating:    5,
				Comment:   "Clean, expressive linework. Works exceptionally well with NoobAI LoRAs.",
				CreatedAt: pubRinflanime.Add(12 * time.Hour),
			},
		},
		Images: []models.ModelImage{
			{
				ImageURL:       "/images/preview-2.png",
				Caption:        "rinFlanime anime portrait",
				Width:          832,
				Height:         1216,
				PositivePrompt: "masterpiece, best quality, 1girl, blonde hair, anime street style, sharp lineart, purple eyes, cinematic lighting, detailed background",
				NegativePrompt: "(worst quality, low quality:1.4), bad anatomy, extra limbs",
				Seed:           39102941,
				Steps:          28,
				CFGScale:       7.0,
				Sampler:        "DPM++ 2M Karras",
				Scheduler:      "Karras",
				Resources:      []models.Resource{resources[0]},
			},
		},
	}
	if err := db.Create(&rinflanime).Error; err != nil {
		return err
	}

	// 5. Model: Detailed Anime Eyes LoRA (LoRA, Base: Illustrious)
	eyesLora := models.Model{
		Name:            "Detailed Anime Eyes LoRA",
		Slug:            "detailed-anime-eyes-lora",
		Type:            "lora",
		BaseModel:       "Illustrious",
		Author:          "civit_artist",
		Description:     "Enhances eye reflections, intricate iris highlights, emotive pupils, and delicate eyelash detail for Illustrious checkpoints.",
		SourceURL:       "https://civitai.com/models/detailed-anime-eyes",
		CivitaiURL:      "https://civitai.com/models/detailed-anime-eyes",
		ThumbnailURL:    "/images/preview-1.png",
		PublishedAt:     &pubEyes,
		Likes:           4800,
		Rating:          4.98,
		TensorSize:      "348",
		VRAMMin:         "0.5 GB",
		VRAMRecommended: "1.0 GB",
		Tags:            []models.Tag{tags[0], tags[2], tags[3]},
		TriggerWords: []models.ModelTriggerWord{
			{TriggerWord: "detailed eyes"},
			{TriggerWord: "sparkle eyes"},
			{TriggerWord: "expressive pupils"},
		},
		Versions: []models.ModelVersion{
			{
				VersionName:   "v1.0",
				VersionNumber: "1.0.0",
				FileName:      "detailed_eyes_ilus.safetensors",
				FileSize:      125829120,
				Format:        "SafeTensor",
				DownloadURL:   "https://civitai.com/models/detailed-anime-eyes",
				RecommendedSettings: datatypes.JSON([]byte(`{
					"steps": 28,
					"sampler": "Euler a",
					"cfg_scale": 6.5,
					"weight": 0.8
				}`)),
			},
		},
		Reviews: []models.Review{
			{
				Reviewer:  "portrait_pro",
				Rating:    5,
				Comment:   "The sparkle and iris depth it adds to eyes is incredible.",
				CreatedAt: pubEyes.Add(24 * time.Hour),
			},
		},
		Images: []models.ModelImage{
			{
				ImageURL:       "/images/preview-1.png",
				Caption:        "Eyes LoRA demonstration",
				Width:          832,
				Height:         1216,
				PositivePrompt: "<lora:detailed_eyes_ilus:0.8>, detailed eyes, sparkle eyes, expressive pupils, 1girl, close up, intricate amber eyes, soft rim light",
				NegativePrompt: "dull eyes, bad pupils, blurry eyes, cataract, poorly drawn iris",
				Seed:           55910291,
				Steps:          28,
				CFGScale:       6.5,
				Sampler:        "Euler a",
				Scheduler:      "Normal",
				Resources:      []models.Resource{resources[0], resources[1]},
			},
		},
	}
	if err := db.Create(&eyesLora).Error; err != nil {
		return err
	}

	// 6. Model: Streetwear Aesthetic LoRA (LoRA, Base: NoobAI)
	streetLora := models.Model{
		Name:            "Streetwear Aesthetic LoRA",
		Slug:            "streetwear-aesthetic-lora",
		Type:            "lora",
		BaseModel:       "NoobAI",
		Author:          "urban_craft",
		Description:     "Modern Japanese streetwear fashion: oversized hoodies, bucket hats, baggy cargo pants, and urban aesthetic.",
		SourceURL:       "https://civitai.com/models/streetwear-aesthetic",
		CivitaiURL:      "https://civitai.com/models/streetwear-aesthetic",
		ThumbnailURL:    "/images/preview-2.png",
		PublishedAt:     &pubStreet,
		Likes:           3900,
		Rating:          4.93,
		TensorSize:      "412",
		VRAMMin:         "0.5 GB",
		VRAMRecommended: "1.2 GB",
		Tags:            []models.Tag{tags[0], tags[2], tags[4]},
		TriggerWords: []models.ModelTriggerWord{
			{TriggerWord: "streetwear"},
			{TriggerWord: "oversized jacket"},
			{TriggerWord: "bucket hat"},
			{TriggerWord: "urban techwear"},
		},
		Versions: []models.ModelVersion{
			{
				VersionName:   "v1.2",
				VersionNumber: "1.2.0",
				FileName:      "streetwear_noobai_v12.safetensors",
				FileSize:      220200960,
				Format:        "SafeTensor",
				DownloadURL:   "https://civitai.com/models/streetwear-aesthetic",
				RecommendedSettings: datatypes.JSON([]byte(`{
					"steps": 30,
					"sampler": "DPM++ 2M Karras",
					"cfg_scale": 7.0,
					"weight": 0.85
				}`)),
			},
		},
		Reviews: []models.Review{
			{
				Reviewer:  "tokyo_drip",
				Rating:    5,
				Comment:   "Generates the best oversized jackets and bucket hats on NoobAI.",
				CreatedAt: pubStreet.Add(36 * time.Hour),
			},
		},
		Images: []models.ModelImage{
			{
				ImageURL:       "/images/preview-2.png",
				Caption:        "Streetwear LoRA sample",
				Width:          832,
				Height:         1216,
				PositivePrompt: "<lora:streetwear_noobai_v12:0.85>, streetwear, oversized jacket, bucket hat, 1girl, urban background, night city neon lighting",
				NegativePrompt: "(worst quality:1.4), formal wear, wedding dress, business suit",
				Seed:           9410291,
				Steps:          30,
				CFGScale:       7.0,
				Sampler:        "DPM++ 2M Karras",
				Scheduler:      "Karras",
				Resources:      []models.Resource{resources[0], resources[2]},
			},
		},
	}
	if err := db.Create(&streetLora).Error; err != nil {
		return err
	}

	// 7. Model: Soft Pastel Bloom LoRA (LoRA, Base: Illustrious)
	pastelLora := models.Model{
		Name:            "Soft Pastel Bloom LoRA",
		Slug:            "soft-pastel-bloom-lora",
		Type:            "lora",
		BaseModel:       "Illustrious",
		Author:          "lumina",
		Description:     "Produces gentle pastel palettes, dreamlike rim lighting, and luminous gradients suitable for high-key illustrations.",
		SourceURL:       "https://civitai.com/models/soft-pastel-bloom",
		CivitaiURL:      "https://civitai.com/models/soft-pastel-bloom",
		ThumbnailURL:    "/images/preview-1.png",
		PublishedAt:     &pubPastel,
		Likes:           1900,
		Rating:          4.89,
		TensorSize:      "280",
		VRAMMin:         "0.5 GB",
		VRAMRecommended: "1.0 GB",
		Tags:            []models.Tag{tags[0], tags[1], tags[2]},
		TriggerWords: []models.ModelTriggerWord{
			{TriggerWord: "pastel glow"},
			{TriggerWord: "soft bloom"},
			{TriggerWord: "luminous lighting"},
		},
		Versions: []models.ModelVersion{
			{
				VersionName:   "v1.0",
				VersionNumber: "1.0.0",
				FileName:      "soft_pastel_bloom_ilus.safetensors",
				FileSize:      146800640,
				Format:        "SafeTensor",
				DownloadURL:   "https://civitai.com/models/soft-pastel-bloom",
				RecommendedSettings: datatypes.JSON([]byte(`{
					"steps": 28,
					"sampler": "Euler a",
					"cfg_scale": 6.0,
					"weight": 0.75
				}`)),
			},
		},
		Reviews: []models.Review{
			{
				Reviewer:  "bloom_artist",
				Rating:    5,
				Comment:   "Dreamy colors and luminous rim lighting!",
				CreatedAt: pubPastel.Add(12 * time.Hour),
			},
		},
		Images: []models.ModelImage{
			{
				ImageURL:       "/images/preview-1.png",
				Caption:        "Pastel Bloom sample",
				Width:          832,
				Height:         1216,
				PositivePrompt: "<lora:soft_pastel_bloom_ilus:0.75>, pastel glow, soft bloom, luminous lighting, 1girl, delicate pastel colors, sunlight dust particles",
				NegativePrompt: "high contrast, harsh shadows, dark gritty colors, black border",
				Seed:           7102931,
				Steps:          28,
				CFGScale:       6.0,
				Sampler:        "Euler a",
				Scheduler:      "Normal",
				Resources:      []models.Resource{resources[0], resources[3]},
			},
		},
	}
	if err := db.Create(&pastelLora).Error; err != nil {
		return err
	}

	log.Println("Seeding complete with models, LoRAs, images, generation settings, reviews, and trigger words")
	return nil
}
