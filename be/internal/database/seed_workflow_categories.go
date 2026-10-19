package database

import (
	"log"

	"github.com/alazriel6/models-guide/backend/internal/models"
	"gorm.io/gorm"
)

func SeedWorkflowCategories(db *gorm.DB) {
	var count int64
	db.Model(&models.WorkflowCategory{}).Count(&count)
	if count > 0 {
		return
	}

	categories := []models.WorkflowCategory{
		{
			Name:        "Text to Image",
			Slug:        "txt2img",
			Description: "Workflow standar generasi gambar dari teks / prompt.",
			Icon:        "",
			Color:       "#2563eb",
			SortOrder:   1,
		},
		{
			Name:        "Image to Image",
			Slug:        "img2img",
			Description: "Workflow transformasi atau restyling gambar referensi.",
			Icon:        "",
			Color:       "#2563eb",
			SortOrder:   2,
		},
		{
			Name:        "Face & Detailer",
			Slug:        "detailer",
			Description: "Workflow dengan ADetailer / FaceDetailer (Impact Pack) untuk mata dan wajah tajam.",
			Icon:        "",
			Color:       "#2563eb",
			SortOrder:   3,
		},
		{
			Name:        "Upscaling & Hi-Res",
			Slug:        "upscale",
			Description: "Workflow upscaling resolusi tinggi.",
			Icon:        "",
			Color:       "#2563eb",
			SortOrder:   4,
		},
		{
			Name:        "LoRA Stacking",
			Slug:        "lora_stack",
			Description: "Workflow penggabungan multiple LoRA karakter, pakaian, dan style.",
			Icon:        "",
			Color:       "#2563eb",
			SortOrder:   5,
		},
		{
			Name:        "Inpainting & Editing",
			Slug:        "inpaint",
			Description: "Workflow perbaikan area tertentu dengan mask dan inpaint model.",
			Icon:        "",
			Color:       "#2563eb",
			SortOrder:   6,
		},
		{
			Name:        "ControlNet Pose & Lineart",
			Slug:        "controlnet",
			Description: "Workflow kontrol pose, depth, canny, dan lineart presisi.",
			Icon:        "",
			Color:       "#2563eb",
			SortOrder:   7,
		},
		{
			Name:        "Animation & Video",
			Slug:        "animation",
			Description: "Workflow animasi gerak (AnimateDiff, Wan2.1, LTX-Video).",
			Icon:        "",
			Color:       "#2563eb",
			SortOrder:   8,
		},
	}

	for _, c := range categories {
		if err := db.Create(&c).Error; err != nil {
			log.Printf("Failed to seed workflow category %s: %v\n", c.Name, err)
		}
	}

	log.Printf("Seeded %d default workflow categories\n", len(categories))
}
