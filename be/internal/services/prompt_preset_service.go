package services

import (
	"strings"

	"github.com/alazriel6/models-guide/backend/internal/models"
	"gorm.io/gorm"
)

type PromptPresetService struct {
	db *gorm.DB
}

func NewPromptPresetService(db *gorm.DB) *PromptPresetService {
	s := &PromptPresetService{db: db}
	s.SeedInitialPresets()
	return s
}

func (s *PromptPresetService) List(category, subcategory, baseModel, presetType, search string) ([]models.PromptPreset, error) {
	var presets []models.PromptPreset
	query := s.db.Model(&models.PromptPreset{})

	if category != "" && category != "all" {
		query = query.Where("category = ?", category)
	}
	if subcategory != "" && subcategory != "all" {
		query = query.Where("subcategory = ?", subcategory)
	}
	if baseModel != "" && baseModel != "all" {
		query = query.Where("base_model_target = ? OR base_model_target = 'All' OR base_model_target = ''", baseModel)
	}
	if presetType != "" && presetType != "all" {
		query = query.Where("preset_type = ?", presetType)
	}
	if search != "" {
		sTerm := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(title) LIKE ? OR LOWER(positive_prompt) LIKE ? OR LOWER(trigger_words) LIKE ? OR LOWER(subcategory) LIKE ?", sTerm, sTerm, sTerm, sTerm)
	}

	err := query.Order("is_system DESC, id ASC").Find(&presets).Error
	return presets, err
}

func (s *PromptPresetService) GetByID(id uint) (*models.PromptPreset, error) {
	var preset models.PromptPreset
	err := s.db.First(&preset, id).Error
	if err != nil {
		return nil, err
	}
	return &preset, nil
}

func (s *PromptPresetService) Create(preset *models.PromptPreset) error {
	return s.db.Create(preset).Error
}

func (s *PromptPresetService) Update(id uint, updated *models.PromptPreset) error {
	var existing models.PromptPreset
	if err := s.db.First(&existing, id).Error; err != nil {
		return err
	}
	return s.db.Model(&existing).Updates(updated).Error
}

func (s *PromptPresetService) Delete(id uint) error {
	return s.db.Delete(&models.PromptPreset{}, id).Error
}

// SeedInitialPresets pre-populates the database with rich anime, realistic, modular, and character presets
func (s *PromptPresetService) SeedInitialPresets() {
	var count int64
	s.db.Model(&models.PromptPreset{}).Count(&count)
	if count > 0 {
		return
	}

	seeds := []models.PromptPreset{
		// Anime Character: Rio Tsukatsuki
		{
			Title:            "Rio Tsukatsuki (Millennium President)",
			Slug:             "rio-tsukatsuki",
			Category:         "character",
			Subcategory:      "Blue Archive",
			BaseModelTarget:  "Illustrious",
			PresetType:       "full",
			PositivePrompt:   "masterpiece, best quality, very aesthetic, newest, 1girl, rio tsukatsuki, halo, black hair, long hair, red eyes, ponytail, blazer, black jacket, collared shirt, black necktie, looking at viewer, highly detailed background, seminar office, soft volumetric lighting",
			NegativePrompt:   "worst quality, low quality, bad anatomy, bad hands, missing fingers, extra digits, blurry, watermark, signature, deformed halo",
			TriggerWords:     "rio tsukatsuki, halo, black hair, ponytail, red eyes, blazer, black jacket, necktie",
			RecommendedModel: "Illustrious XL Base v0.1",
			RecommendedLoras: `[{"name": "Rio Tsukatsuki Official Outfit", "slug": "rio_outfit", "weight": 0.85, "base_model": "Illustrious"}]`,
			SampleImages:     `["/images/rio_sample_1.webp", "/images/rio_sample_2.webp"]`,
			Description:      "Millennium Science School student council president. Characteristic red eyes, sleek black blazer, and futuristic geometric halo.",
			IsSystem:         true,
		},
		// Anime Character: Frieren
		{
			Title:            "Frieren (The Mage of the Journey)",
			Slug:             "frieren",
			Category:         "character",
			Subcategory:      "Sousou no Frieren",
			BaseModelTarget:  "Illustrious",
			PresetType:       "full",
			PositivePrompt:   "masterpiece, best quality, very aesthetic, 1girl, frieren, elven ears, long white hair, twintails, green eyes, calm expression, striped shirt, black capelet, gold earrings, carrying wooden magic staff, ancient flower field, windy meadow, floating blue flower petals",
			NegativePrompt:   "worst quality, low quality, bad anatomy, human ears, extra ears, bad hands, blurry, signature",
			TriggerWords:     "frieren, elven ears, white hair, twintails, green eyes, striped shirt, black capelet, staff",
			RecommendedModel: "Illustrious XL Base v0.1",
			RecommendedLoras: `[{"name": "Frieren Character LoRA", "slug": "frieren_lora", "weight": 0.8, "base_model": "Illustrious"}]`,
			SampleImages:     `["/images/frieren_sample_1.webp"]`,
			Description:      "Elven mage Frieren. Long twin-tail white hair with signature pointy elf ears and traveling capelet.",
			IsSystem:         true,
		},
		// Anime Character: Asuka Langley
		{
			Title:            "Asuka Langley Soryu (Plugsuit & Nerve Clips)",
			Slug:             "asuka-langley",
			Category:         "character",
			Subcategory:      "Evangelion",
			BaseModelTarget:  "Illustrious",
			PresetType:       "full",
			PositivePrompt:   "masterpiece, best quality, 1girl, asuka langley soryu, reddish-brown hair, long twintails, plugged in nerve clips, blue eyes, confident smirk, red plugsuit, eva unit cockpit background, neon holographic HUD, dramatic rim lighting",
			NegativePrompt:   "worst quality, low quality, bad anatomy, blurry, watermark, deformed hands, extra arms",
			TriggerWords:     "asuka langley soryu, plugged in clips, red plugsuit, blue eyes, twintails",
			RecommendedModel: "Illustrious XL Base v0.1",
			RecommendedLoras: `[{"name": "Evangelion Plugsuit LoRA", "slug": "eva_plugsuit", "weight": 0.85, "base_model": "Illustrious"}]`,
			SampleImages:     `["/images/asuka_sample_1.webp"]`,
			Description:      "Pilot of Evangelion Unit-02 with iconic red plugsuit and nerve clips.",
			IsSystem:         true,
		},
		// Anime Character: Raiden Shogun
		{
			Title:            "Raiden Shogun (Electro Archon)",
			Slug:             "raiden-shogun",
			Category:         "character",
			Subcategory:      "Genshin Impact",
			BaseModelTarget:  "Illustrious",
			PresetType:       "full",
			PositivePrompt:   "masterpiece, best quality, very aesthetic, 1girl, raiden shogun, purple hair, braided ponytail, purple eyes, ornate hairpin, traditional kimono, shoulder armor, purple glowing lightning aura, holding katana, tenshukaku palace background, storm clouds, cherry blossom petals",
			NegativePrompt:   "worst quality, low quality, bad hands, missing fingers, extra limbs, bad eyes, blurry",
			TriggerWords:     "raiden shogun, purple hair, braided ponytail, purple eyes, kimono, shoulder armor, lightning",
			RecommendedModel: "Illustrious XL Base v0.1",
			RecommendedLoras: `[{"name": "Genshin Raiden LoRA", "slug": "raiden_genshin", "weight": 0.8, "base_model": "Illustrious"}]`,
			SampleImages:     `["/images/raiden_sample_1.webp"]`,
			Description:      "The ruler of Inazuma with flowing braided purple hair, electro lightning effects, and ornate kimono.",
			IsSystem:         true,
		},
		// Photorealistic: Tokyo Rain Portrait
		{
			Title:            "Tokyo Rainy Night (Cinematic 35mm)",
			Slug:             "tokyo-rainy-night",
			Category:         "photorealistic",
			Subcategory:      "Cinematic",
			BaseModelTarget:  "SDXL",
			PresetType:       "full",
			PositivePrompt:   "raw photo, 8k uhd, dslr, high quality, film grain, Fujifilm XT4, 1girl, drenched by light rain, holding clear transparent umbrella, neon reflections on wet asphalt, Tokyo Shibuya street at midnight, shallow depth of field, natural skin texture, moisture droplets on skin, bokeh",
			NegativePrompt:   "illustration, 3d, 2d, painting, cartoons, sketch, plastic skin, oversaturated, deformed, bad anatomy, bad teeth, watermark, text",
			TriggerWords:     "raw photo, film grain, rain reflections, shallow depth of field, neon bokeh",
			RecommendedModel: "SDXL 1.0 Realism Pro",
			RecommendedLoras: `[{"name": "Film Grain & Cinematic Lighting", "slug": "film_grain_sdxl", "weight": 0.65, "base_model": "SDXL"}]`,
			SampleImages:     `["/images/tokyo_rain_sample_1.webp"]`,
			Description:      "Atmospheric cinematic rain portrait with natural skin textures and realistic Tokyo neon reflections.",
			IsSystem:         true,
		},
		// Photorealistic: High Fashion Editorial
		{
			Title:            "Haute Couture Fashion Editorial",
			Slug:             "haute-couture-editorial",
			Category:         "photorealistic",
			Subcategory:      "Editorial",
			BaseModelTarget:  "SDXL",
			PresetType:       "full",
			PositivePrompt:   "vogue magazine editorial photography, 8k, cinematic studio lighting, dramatic key light, elegant woman, avant-garde haute couture black structured gown, sharp gaze, clean dark backdrop, professional fashion shoot, Hasselblad medium format camera, 85mm f/1.4",
			NegativePrompt:   "blurry, deformed, cartoon, anime, amateur, bad hands, plastic, text, watermark, bad lighting",
			TriggerWords:     "editorial photography, studio lighting, avant-garde, hasselblad, 85mm",
			RecommendedModel: "SDXL 1.0 Realism Pro",
			RecommendedLoras: `[{"name": "Studio Master Lighting", "slug": "studio_light_sdxl", "weight": 0.7, "base_model": "SDXL"}]`,
			SampleImages:     `["/images/fashion_sample_1.webp"]`,
			Description:      "High fashion studio portrait inspired by Vogue and Harper's Bazaar editorial spreads.",
			IsSystem:         true,
		},
		// Art Style: Makoto Shinkai
		{
			Title:            "Makoto Shinkai Luminous Atmosphere",
			Slug:             "makoto-shinkai-style",
			Category:         "style",
			Subcategory:      "Anime Art Style",
			BaseModelTarget:  "Illustrious",
			PresetType:       "full",
			PositivePrompt:   "masterpiece, best quality, Makoto Shinkai anime style, breathtaking vast sky, dramatic cumulus clouds, radiant golden hour sun rays, lens flare, school rooftop railing, school uniform, gentle wind blowing hair, hyper-detailed distant city panorama, nostalgic emotional mood",
			NegativePrompt:   "worst quality, low quality, dark, gloomy, blurry, flat colors, monochrome",
			TriggerWords:     "makoto shinkai style, radiant sky, cumulus clouds, lens flare, golden hour",
			RecommendedModel: "Illustrious XL Base v0.1",
			RecommendedLoras: `[{"name": "Shinkai Cloud & Light LoRA", "slug": "shinkai_clouds", "weight": 0.8, "base_model": "Illustrious"}]`,
			SampleImages:     `["/images/shinkai_sample_1.webp"]`,
			Description:      "Vibrant cinematic anime sky with dramatic towering clouds and luminous golden hour lighting.",
			IsSystem:         true,
		},
		// Art Style: Dark Fantasy Cathedral
		{
			Title:            "Dark Gothic Soulsborne Knight",
			Slug:             "dark-gothic-soulsborne",
			Category:         "style",
			Subcategory:      "Dark Fantasy",
			BaseModelTarget:  "SDXL",
			PresetType:       "full",
			PositivePrompt:   "masterpiece, dark fantasy, epic concept art, ornate obsidian plate armor, silver filigree, glowing ethereal cyan runes, standing in ruined gothic cathedral, cracked stained glass window, volumetric fog, floating dust motes, moody moonlight, trending on artstation",
			NegativePrompt:   "worst quality, modern, colorful, cartoon, anime, bright daylight, saturated, chibi",
			TriggerWords:     "dark fantasy, gothic armor, stained glass, volumetric fog, ethereal runes",
			RecommendedModel: "SDXL 1.0 Realism Pro",
			RecommendedLoras: `[{"name": "Gothic Armor & Ruin LoRA", "slug": "gothic_armor_sdxl", "weight": 0.8, "base_model": "SDXL"}]`,
			SampleImages:     `["/images/gothic_sample_1.webp"]`,
			Description:      "Eldritch dark fantasy aesthetic with intricate obsidian knight armor and ruined cathedral atmosphere.",
			IsSystem:         true,
		},
		// Modular Building Block: Illustrious Master Quality
		{
			Title:           "Illustrious Master Quality Tag Block",
			Slug:            "illustrious-quality-block",
			Category:        "modular",
			Subcategory:     "Quality",
			BaseModelTarget: "Illustrious",
			PresetType:      "modular",
			PositivePrompt:  "masterpiece, best quality, very aesthetic, newest, absurdres",
			NegativePrompt:  "worst quality, low quality, bad anatomy, bad hands, blurry",
			TriggerWords:    "masterpiece, best quality, very aesthetic, newest, absurdres",
			Description:     "Standard recommended quality prefixes for Illustrious-XL and NoobAI models.",
			IsSystem:        true,
		},
		// Modular Building Block: Pony Diffusion Quality
		{
			Title:           "Pony Diffusion V6 Master Quality Block",
			Slug:            "pony-quality-block",
			Category:        "modular",
			Subcategory:     "Quality",
			BaseModelTarget: "Pony",
			PresetType:      "modular",
			PositivePrompt:  "score_9, score_8_up, score_7_up, source_anime, rating_safe",
			NegativePrompt:  "score_4, score_5, score_6, ugly, bad anatomy, bad hands, blurry",
			TriggerWords:    "score_9, score_8_up, score_7_up, source_anime",
			Description:     "Required scoring tokens for Pony V6 checkpoints.",
			IsSystem:        true,
		},
		// Modular Building Block: SDXL Realistic Quality
		{
			Title:           "SDXL Photorealism Master Quality Block",
			Slug:            "sdxl-realistic-quality-block",
			Category:        "modular",
			Subcategory:     "Quality",
			BaseModelTarget: "SDXL",
			PresetType:      "modular",
			PositivePrompt:  "photorealistic, raw photo, 8k uhd, cinematic lighting, film grain, highly detailed skin",
			NegativePrompt:  "illustration, 3d, painting, cartoons, plastic skin, bad anatomy, watermark",
			TriggerWords:    "photorealistic, raw photo, 8k uhd, film grain",
			Description:     "High fidelity photographic anchor tags for realistic SDXL workflows.",
			IsSystem:        true,
		},
		// Modular Building Block: Cyberpunk Lighting
		{
			Title:           "Volumetric Cyberpunk Neon Lighting",
			Slug:            "cyberpunk-neon-lighting",
			Category:        "modular",
			Subcategory:     "Lighting",
			BaseModelTarget: "All",
			PresetType:      "modular",
			PositivePrompt:  "volumetric lighting, neon rim lighting, cyan and magenta reflections, atmospheric fog, glowing holograms",
			NegativePrompt:  "",
			TriggerWords:    "volumetric lighting, neon rim light, magenta reflections",
			Description:     "Modular lighting snippet for sci-fi and cyberpunk compositions.",
			IsSystem:        true,
		},
		// Modular Building Block: Camera Composition
		{
			Title:           "Dynamic Cowboy Shot Composition",
			Slug:            "dynamic-cowboy-composition",
			Category:        "modular",
			Subcategory:     "Composition",
			BaseModelTarget: "All",
			PresetType:      "modular",
			PositivePrompt:  "dynamic angle, cowboy shot, from below, looking at viewer, depth of field",
			NegativePrompt:  "",
			TriggerWords:    "dynamic angle, cowboy shot, from below",
			Description:     "Thigh-up cinematic framing with dynamic camera perspective.",
			IsSystem:        true,
		},
	}

	for _, p := range seeds {
		s.db.Create(&p)
	}
}
