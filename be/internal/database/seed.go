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
	// Always ensure PromptPresets are seeded if empty
	if err := SeedPromptPresets(db); err != nil {
		log.Printf("Warning: failed to seed prompt presets: %v\n", err)
	}

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

func SeedPromptPresets(db *gorm.DB) error {
	var presetCount int64
	db.Model(&models.PromptPreset{}).Count(&presetCount)
	if presetCount > 0 {
		return nil
	}

	log.Println("Seeding initial high-quality Prompt Presets...")

	presets := []models.PromptPreset{
		{
			Title:            "Rio Tsukatsuki - Seminar President",
			Character:        "Rio Tsukatsuki",
			Slug:             "rio-tsukatsuki",
			Category:         "character",
			Subcategory:      "Blue Archive",
			BaseModelTarget:  "Illustrious",
			PresetType:       "full",
			PositivePrompt:   "masterpiece, best quality, very aesthetic, newest, 1girl, rio tsukatsuki, halo, black hair, long hair, red eyes, ponytail, blazer, black jacket, collared shirt, black necktie, looking at viewer, highly detailed background, seminar office, sharp lineart",
			NegativePrompt:   "worst quality, low quality, bad anatomy, bad hands, missing fingers, extra digits, blurry, watermark, signature, deformed halo",
			TriggerWords:     "rio tsukatsuki, halo, black hair, red eyes",
			RecommendedModel: "rinFlanime",
			RecommendedLoras: `["detailed-anime-eyes"]`,
			SampleImages:     `["/images/preview-2.png","/images/preview-1.png"]`,
			Description:      "Rio Tsukatsuki from Blue Archive with signature black blazer, red eyes, and high-tech seminar office atmosphere.",
			IsSystem:         true,
		},
		{
			Title:            "Kitsune Shrine Maiden - Fox Spirit",
			Character:        "Kitsune Shrine Maiden",
			Slug:             "kitsune-shrine-maiden",
			Category:         "character",
			Subcategory:      "Fantasy Anime",
			BaseModelTarget:  "Illustrious",
			PresetType:       "full",
			PositivePrompt:   "masterpiece, best quality, ultra-detailed, 1girl, solo, kitsune, fox ears, fox girl, dark hair, red eyes, white floral hair accessory, traditional white and black layered yukata, golden ornaments, cherry blossom petals, looking at viewer, soft rim light",
			NegativePrompt:   "(worst quality, low quality:1.4), deformed, bad hands, mutated fingers, blurry, watermark, bad lineart",
			TriggerWords:     "kitsune, fox ears, fox girl, red eyes, yukata",
			RecommendedModel: "Raehoshi Illust XL",
			RecommendedLoras: `["soft-pastel-bloom"]`,
			SampleImages:     `["/images/preview-1.png"]`,
			Description:      "Mystical kitsune shrine maiden with golden ornaments and falling sakura petals.",
			IsSystem:         true,
		},
		{
			Title:            "Cyberpunk Streetwear Rebel",
			Character:        "Streetwear Rebel",
			Slug:             "cyberpunk-streetwear-rebel",
			Category:         "character",
			Subcategory:      "Cyberpunk",
			BaseModelTarget:  "NoobAI",
			PresetType:       "full",
			PositivePrompt:   "masterpiece, highly detailed illustration, 1girl, blonde hair, purple eyes, bucket hat with letter A, oversized techwear jacket, smirk, street anime style, rim lighting, vibrant neon colors, rainy asphalt reflections, neon signs background",
			NegativePrompt:   "(worst quality, low quality:1.4), bad anatomy, extra limbs, poorly drawn face, blurry, washed out",
			TriggerWords:     "streetwear, oversized jacket, bucket hat, neon rim lighting",
			RecommendedModel: "rinFlanime",
			RecommendedLoras: `["streetwear-aesthetic"]`,
			SampleImages:     `["/images/preview-2.png"]`,
			Description:      "Edgy anime streetwear aesthetic featuring bucket hat, techwear jacket, and vibrant rainy street lights.",
			IsSystem:         true,
		},
		{
			Title:            "2B - YoRHa Combat Android",
			Character:        "2B",
			Slug:             "2b-yorha-android",
			Category:         "character",
			Subcategory:      "NieR:Automata",
			BaseModelTarget:  "Illustrious",
			PresetType:       "full",
			PositivePrompt:   "masterpiece, best quality, ultra-detailed, 1girl, 2b, short white hair, blindfold over eyes, black headband, black gothic dress, puffy sleeves, black thigh-high boots, katana on back, dramatic ruined cathedral city background, floating dust motes, cinematic volumetric lighting",
			NegativePrompt:   "worst quality, low quality, bad anatomy, deformed eyes, extra limbs, watermark, cartoonish, lowres",
			TriggerWords:     "2b, blindfold, gothic dress, katana on back",
			RecommendedModel: "Raehoshi Illust XL",
			RecommendedLoras: `["detailed-anime-eyes"]`,
			SampleImages:     `["/images/preview-1.png","/images/preview-2.png"]`,
			Description:      "Iconic 2B from NieR:Automata with ruined overgrown city backdrop and volumetric lighting.",
			IsSystem:         true,
		},
		{
			Title:            "Frieren - Ancient Elf Mage",
			Character:        "Frieren",
			Slug:             "frieren-elf-mage",
			Category:         "character",
			Subcategory:      "Frieren",
			BaseModelTarget:  "Illustrious",
			PresetType:       "full",
			PositivePrompt:   "masterpiece, best quality, 1girl, frieren, elf ears, long white hair, twintails, green eyes, striped black and white scarf, white coat, holding wooden staff with red jewel, peaceful grimoire library background, floating glowing magic runes, warm morning sunlight",
			NegativePrompt:   "worst quality, low quality, bad anatomy, blurry, bad hands, missing fingers, extra digits",
			TriggerWords:     "frieren, elf, white hair, twintails, wooden staff",
			RecommendedModel: "Raehoshi Illust XL",
			RecommendedLoras: `["soft-pastel-bloom"]`,
			SampleImages:     `["/images/preview-1.png"]`,
			Description:      "Frieren holding her mage staff amidst ancient glowing grimoires in soft morning sun.",
			IsSystem:         true,
		},
		{
			Title:            "Cinematic 85mm Golden Hour Portrait",
			Character:        "Portrait Photography",
			Slug:             "cinematic-85mm-portrait",
			Category:         "photorealistic",
			Subcategory:      "Portrait Photography",
			BaseModelTarget:  "SDXL",
			PresetType:       "full",
			PositivePrompt:   "RAW photo, 8k uhd, cinematic portrait of a 22yo woman, elegant natural makeup, subtle freckles, wavy chestnut hair, sun flare backlight, soft rim lighting, shallow depth of field, 85mm f1.4 lens, Sony A7R IV, realistic skin pores, lifelike expressive eyes",
			NegativePrompt:   "cartoon, anime, 3d render, plastic skin, oversaturated, deformed eyes, bad hands, blurry, watermark, airbrushed, digital art, flat lighting",
			TriggerWords:     "RAW photo, 85mm portrait, realistic skin texture, shallow depth of field",
			RecommendedModel: "SDXL Base",
			SampleImages:     `["/images/preview-2.png"]`,
			Description:      "Flawless photorealistic portrait with natural skin texture, golden hour lens flare, and creamy bokeh.",
			IsSystem:         true,
		},
		{
			Title:            "Tokyo Neon Rain Noir",
			Character:        "Neon Rain Noir",
			Slug:             "tokyo-neon-rain-noir",
			Category:         "photorealistic",
			Subcategory:      "Cinematic Street",
			BaseModelTarget:  "SDXL",
			PresetType:       "full",
			PositivePrompt:   "cinematic film still, photorealistic, woman in translucent holographic techwear raincoat, damp hair, illuminated by vivid neon signs in dark rain-slicked Tokyo alley, anamorphic lens flare, Kodak Vision3 500T, high dynamic range, intricate puddle reflections, moody atmospheric fog",
			NegativePrompt:   "illustration, 3d CGI, drawing, sketch, bad anatomy, extra fingers, cartoonish, low resolution, flat colors",
			TriggerWords:     "cinematic film still, anamorphic lens, neon reflections, wet asphalt",
			RecommendedModel: "SDXL Base",
			SampleImages:     `["/images/preview-2.png"]`,
			Description:      "Atmospheric cinematic photo of rainy Tokyo cyberpunk alley with anamorphic lens artifacts.",
			IsSystem:         true,
		},
		{
			Title:            "Retro 90s Cel Shaded Anime",
			Character:        "Retro 90s Anime",
			Slug:             "retro-90s-cel-anime",
			Category:         "style",
			Subcategory:      "Retro Anime",
			BaseModelTarget:  "Illustrious",
			PresetType:       "full",
			PositivePrompt:   "masterpiece, 1990s anime screenshot, cel shaded, subtle VHS scanlines, retro anime aesthetic, nostalgic warm color palette, sharp ink lineart, vintage anime lighting, aesthetic evening city skyline backdrop",
			NegativePrompt:   "modern digital 3d, glossy, plastic, airbrush, blurry, modern CGI, oversaturated neon",
			TriggerWords:     "1990s anime, retro anime aesthetic, cel shading, VHS grain",
			RecommendedModel: "Raehoshi Illust XL",
			SampleImages:     `["/images/preview-1.png"]`,
			Description:      "Golden era 90s anime aesthetic with authentic cel-shading, vintage ink lines, and nostalgic colors.",
			IsSystem:         true,
		},
		{
			Title:            "Dreamy Pastel Bloom Fantasy",
			Character:        "Pastel Fantasy",
			Slug:             "dreamy-pastel-bloom",
			Category:         "style",
			Subcategory:      "Pastel Art",
			BaseModelTarget:  "Illustrious",
			PresetType:       "full",
			PositivePrompt:   "<lora:soft_pastel_bloom_ilus:0.75>, pastel glow, soft bloom, luminous lighting, masterpiece, delicate pastel watercolor aesthetic, dreamy soft lighting, glowing particles, ethereal atmosphere, luminous eyes, gentle breeze, floating flower petals, high-key pastel palette",
			NegativePrompt:   "high contrast, harsh black shadows, gritty, oversaturated, deformed, dark gothic",
			TriggerWords:     "pastel glow, soft bloom, luminous lighting, ethereal",
			RecommendedModel: "Raehoshi Illust XL",
			RecommendedLoras: `["soft-pastel-bloom"]`,
			SampleImages:     `["/images/preview-1.png"]`,
			Description:      "Luminous, dreamy pastel illustration with high-key watercolor gradients and ethereal glow.",
			IsSystem:         true,
		},
		{
			Title:            "Dark Fantasy Baroque Oil Painting",
			Character:        "Dark Fantasy Baroque",
			Slug:             "dark-fantasy-baroque",
			Category:         "style",
			Subcategory:      "Fine Art",
			BaseModelTarget:  "SDXL",
			PresetType:       "full",
			PositivePrompt:   "masterpiece, dark fantasy oil painting on textured canvas, chiaroscuro lighting, heavy expressive brushstrokes, moody gothic atmosphere, dramatic tenebrism, intricate baroque armor details, Caravaggio and Rembrandt style, warm candlelight in shadow",
			NegativePrompt:   "smooth digital vector, flat colors, cartoon, blurry, low quality, 3d render, modern clean aesthetic",
			TriggerWords:     "oil on canvas, chiaroscuro, dark fantasy, baroque",
			RecommendedModel: "SDXL Base",
			SampleImages:     `["/images/preview-1.png"]`,
			Description:      "Museum-quality dark fantasy oil painting with Rembrandt tenebrism and heavy textured canvas strokes.",
			IsSystem:         true,
		},
	}

	for _, p := range presets {
		if err := db.Create(&p).Error; err != nil {
			log.Printf("Failed to seed preset %s: %v\n", p.Title, err)
		}
	}

	log.Printf("Successfully seeded %d prompt presets\n", len(presets))
	return nil
}
