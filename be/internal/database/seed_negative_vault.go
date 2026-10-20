package database

import (
	"log"

	"github.com/alazriel6/models-guide/backend/internal/models"
	"gorm.io/gorm"
)

func SeedNegativeVault(db *gorm.DB) error {
	// 1. Seed Negative Presets if table is empty
	var presetCount int64
	db.Model(&models.NegativePreset{}).Count(&presetCount)
	if presetCount == 0 {
		presets := []models.NegativePreset{
			{
				Title:          "SDXL Standard Minimalist",
				Architecture:   "SDXL",
				Category:       "Minimal",
				Description:    "Preset ringkas untuk SDXL. Mencegah contrast blowout & overcooked saturation dengan negative seminimal mungkin.",
				Prompt:         "worst quality, low quality, normal quality, lowres, blurry, jpeg artifacts, bad anatomy, deformed limbs",
				RecommendedCFG: "4.5 - 6.5",
				Tags:           "sdxl,minimal,clean,contrast",
				IsSystem:       true,
			},
			{
				Title:          "Pony V6 Strict Anime 2D",
				Architecture:   "Pony",
				Category:       "Anime",
				Description:    "Filter keras untuk menghilangkan render 3D, CGI slop, dan photorealism tanpa membatasi variasi pose karakter.",
				Prompt:         "source_furry, source_pony, 3d, realistic, photorealistic, bad quality, worst quality, lowres, ugly, extra limbs, bad eyes",
				RecommendedCFG: "5.0 - 7.0",
				Tags:           "pony,anime,2d,anti-3d",
				IsSystem:       true,
			},
			{
				Title:          "Illustrious-XL Pure Anime Danbooru",
				Architecture:   "Illustrious",
				Category:       "Anime",
				Description:    "Menjaga estetika ilustrasi anime 2D yang bersih dengan format Danbooru tags, mencegah render 3D kasar.",
				Prompt:         "worst quality, low quality, lowres, bad anatomy, bad hands, missing fingers, extra digits, 3d, realistic, photo, watermark, signature",
				RecommendedCFG: "5.0 - 6.5",
				Tags:           "illustrious,danbooru,anime",
				IsSystem:       true,
			},
			{
				Title:          "SD 1.5 Quality Booster Classic",
				Architecture:   "SD 1.5",
				Category:       "General",
				Description:    "Kombinasi klasik untuk arsitektur SD 1.5 lama yang membutuhkan penekanan artefak dan anggota tubuh ganda.",
				Prompt:         "worst quality, low quality, normal quality, lowres, bad anatomy, bad hands, missing fingers, extra fingers, fewer digits, mutated hands, poorly drawn hands, poorly drawn face, mutation, deformed, extra limbs, jpeg artifacts, blurry, watermark",
				RecommendedCFG: "7.0 - 8.0",
				Tags:           "sd15,classic,anatomy",
				IsSystem:       true,
			},
			{
				Title:          "Flux.1 Guidance Distilled Guide",
				Architecture:   "Flux",
				Category:       "Minimal",
				Description:    "Arsitektur Flow-Matching (Flux) dilatih tanpa negative conditioning. Disarankan string kosong atau CFG 1.0.",
				Prompt:         "",
				RecommendedCFG: "1.0 - 3.5 (Distilled)",
				Tags:           "flux,flow-matching,distilled",
				IsSystem:       true,
			},
			{
				Title:          "Photorealism Anatomy Guard",
				Architecture:   "SDXL",
				Category:       "Photorealism",
				Description:    "Menekan render plastik dan lilin (doll skin) untuk foto realistis manusia dengan detail kulit alami.",
				Prompt:         "canvas frame, cartoon, 3d render, anime, illustration, doll, wax, airbrush, oversaturated, bad anatomy, bad hands, plastic skin, fake lighting",
				RecommendedCFG: "5.0 - 6.5",
				Tags:           "realism,skin,photo,portrait",
				IsSystem:       true,
			},
			{
				Title:          "Anatomy & Hand Precision Fix",
				Architecture:   "All",
				Category:       "Anatomy",
				Description:    "Koleksi tag anatomi spesifik untuk menekan mutasi jari lebur, tangan ganda, dan sambungan sendi tidak wajar.",
				Prompt:         "bad anatomy, bad hands, missing fingers, extra digits, fewer digits, mutated hands, poorly drawn hands, poorly drawn face, fused fingers, extra limbs, malformed limbs",
				RecommendedCFG: "4.5 - 7.0",
				Tags:           "hands,fingers,anatomy",
				IsSystem:       true,
			},
		}

		for _, p := range presets {
			if err := db.Create(&p).Error; err != nil {
				log.Printf("Failed to seed negative preset %s: %v\n", p.Title, err)
			}
		}
		log.Printf("Successfully seeded %d negative presets\n", len(presets))
	}

	// 2. Seed Embeddings if table is empty
	var embCount int64
	db.Model(&models.EmbeddingResource{}).Count(&embCount)
	if embCount == 0 {
		embeddings := []models.EmbeddingResource{
			{
				Name:           "EasyNegative",
				Filename:       "EasyNegative.safetensors",
				Architecture:   "SD 1.5",
				Filesize:       "24 KB",
				Description:    "Embedding universal paling populer untuk model anime SD 1.5, menekan artefak dan anatomi buruk secara efisien.",
				A1111Trigger:   "EasyNegative",
				ComfyTrigger:   "embedding:EasyNegative",
				DownloadURL:    "https://civitai.com/models/7808/easynegative",
				SuppressedTags: "bad anatomy, bad hands, lowres, error, missing fingers, extra digit, fewer digits",
				IsSystem:       true,
			},
			{
				Name:           "BadHandV4",
				Filename:       "badhandv4.pt",
				Architecture:   "SD 1.5",
				Filesize:       "15 KB",
				Description:    "Fokus khusus menekan anomali jari, tangan meleleh, dan sendi patah tanpa mengubah gaya gambar.",
				A1111Trigger:   "badhandv4",
				ComfyTrigger:   "embedding:badhandv4",
				DownloadURL:    "https://civitai.com/models/27312/badhandv4-anime-screencap",
				SuppressedTags: "mutated hands, poorly drawn hands, fused fingers, missing fingers, extra digits",
				IsSystem:       true,
			},
			{
				Name:           "FastNegativeV2",
				Filename:       "FastNegativeV2.pt",
				Architecture:   "SD 1.5",
				Filesize:       "18 KB",
				Description:    "Embedding ringan dan cepat untuk anime dan semi-realistis yang mencegah kontras berlebih.",
				A1111Trigger:   "FastNegativeV2",
				ComfyTrigger:   "embedding:FastNegativeV2",
				DownloadURL:    "https://civitai.com/models/71961/fastnegativev2",
				SuppressedTags: "worst quality, low quality, monochrome, grayscale, blurry, bad anatomy",
				IsSystem:       true,
			},
			{
				Name:           "bad-picture-chill-75v",
				Filename:       "bad-picture-chill-75v.pt",
				Architecture:   "SD 1.5",
				Filesize:       "20 KB",
				Description:    "Sangat cocok untuk style ilustrasi lembut, lukisan digital, dan menghindari filter yang terlalu agresif.",
				A1111Trigger:   "bad-picture-chill-75v",
				ComfyTrigger:   "embedding:bad-picture-chill-75v",
				DownloadURL:    "https://civitai.com/models/17083/bad-picture-chill-75v",
				SuppressedTags: "jpeg artifacts, signature, watermark, username, bad art, blur",
				IsSystem:       true,
			},
			{
				Name:           "DeepNegative V1.x",
				Filename:       "ng_deepnegative_v1_75t.pt",
				Architecture:   "SD 1.5",
				Filesize:       "32 KB",
				Description:    "Embedding 75-token mendalam untuk menstabilkan anggota tubuh manusia dan mencegah anggota tubuh ganda.",
				A1111Trigger:   "ng_deepnegative_v1_75t",
				ComfyTrigger:   "embedding:ng_deepnegative_v1_75t",
				DownloadURL:    "https://civitai.com/models/4629/deep-negative-v1x",
				SuppressedTags: "deformed, extra limbs, bad proportions, disfigured, malformed limbs",
				IsSystem:       true,
			},
		}

		for _, e := range embeddings {
			if err := db.Create(&e).Error; err != nil {
				log.Printf("Failed to seed embedding %s: %v\n", e.Name, err)
			}
		}
		log.Printf("Successfully seeded %d embeddings\n", len(embeddings))
	}

	return nil
}
