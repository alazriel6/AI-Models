package services

import (
	"fmt"
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
		if category == "anime" {
			query = query.Where("category IN ('anime', 'character', 'style')")
		} else if category == "realistic" || category == "photorealistic" {
			query = query.Where("category IN ('realistic', 'photorealistic')")
		} else {
			query = query.Where("category = ?", category)
		}
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
		query = query.Where("LOWER(title) LIKE ? OR LOWER(character) LIKE ? OR LOWER(positive_prompt) LIKE ? OR LOWER(trigger_words) LIKE ? OR LOWER(subcategory) LIKE ?", sTerm, sTerm, sTerm, sTerm, sTerm)
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
	var modularCount int64
	s.db.Model(&models.PromptPreset{}).Where("preset_type = ?", "modular").Count(&modularCount)
	if modularCount == 0 {
		s.seedModularTags()
	}

	fullSetSeeds := []models.PromptPreset{
		{
			Title:            "2D Anime Park (Full Set)",
			Character:        "2D Anime Girl",
			Slug:             "2d-anime-park-fullset",
			Category:         "modular_preset",
			Subcategory:      "2D Screencap",
			BaseModelTarget:  "Illustrious",
			PresetType:       "fullset",
			PositivePrompt:   "masterpiece, best quality, amazing quality, newest, anime screencap, high quality anime illustration, modern japanese anime style, clean lineart, soft cel shading, vibrant natural colors, sharp character details, hand-drawn anime aesthetic, 1girl, solo, young adult woman, beautiful anime girl, long purple hair, high ponytail, purple eyes, soft bangs, five fingers, slender, cheerful expression, open mouth smile, looking at viewer, casual outfit, pink oversized hoodie, white inner shirt, black leggings, white sneakers, relaxed sitting pose, sitting on wooden park bench, one hand resting on bench, crossed legs, waving, raised hand, full body, eye level, three-quarter view, cinematic composition, detailed anime background, beautiful background, outdoors, peaceful park, lush green forest, tall trees, dense foliage, multiple wooden benches, sunlit pathway, detailed leaves, dappled sunlight, soft sunlight filtering through trees, atmospheric perspective, natural shadows, warm daylight, tranquil atmosphere",
			NegativePrompt:   "worst quality, low quality, bad anatomy, deformed limbs, blurry, watermark, signature",
			TriggerWords:     "anime screencap, peaceful park, sitting on wooden park bench, dappled sunlight",
			RecommendedModel: "Illustrious XL Base v0.1",
			LayerData:        `{"quality":"masterpiece, best quality, amazing quality, newest, anime screencap, high quality anime illustration, modern japanese anime style, clean lineart, soft cel shading, vibrant natural colors, sharp character details, hand-drawn anime aesthetic","identity":"1girl, solo, young adult woman, beautiful anime girl, long purple hair, high ponytail, purple eyes, soft bangs","proportions":"five fingers, slender","details":"","expression":"cheerful expression, open mouth smile, looking at viewer","outfit":"casual outfit, pink oversized hoodie, white inner shirt, black leggings, white sneakers","pose":"relaxed sitting pose, sitting on wooden park bench, one hand resting on bench, crossed legs, waving, raised hand","camera":"full body, eye level, three-quarter view, cinematic composition","background":"detailed anime background, beautiful background, outdoors, peaceful park, lush green forest, tall trees, dense foliage, multiple wooden benches, sunlit pathway, detailed leaves","effects":"dappled sunlight, soft sunlight filtering through trees, atmospheric perspective, natural shadows, warm daylight, tranquil atmosphere","lora":{"name":"","weight":0.85,"enabled":false}}`,
			Description:      "Full 10-Layer Composition of an anime girl sitting on a park bench in soft dappled forest sunlight.",
			IsSystem:         true,
		},
		{
			Title:            "Rio Tsukatsuki - Seminar President (Full Set)",
			Character:        "Rio Tsukatsuki",
			Slug:             "rio-tsukatsuki-fullset",
			Category:         "modular_preset",
			Subcategory:      "Blue Archive",
			BaseModelTarget:  "Illustrious",
			PresetType:       "fullset",
			PositivePrompt:   "(anime_coloring:1.15), masterpiece, newest, best quality, highres, illustration, 1girl, solo, tsukatsuki rio, red eyes, halo, black hair, long hair, intricate braided crown updo, long braided ponytail, loose framing side tendrils, tall female, mature, slender, hourglass figure, slender waist, toned stomach, long legs, slender fingers, sweat, glistening skin, sweatdrops on neck and collarbone, wet skin, shiny skin texture, heavy breathing, melancholic intense expression, focused fierce expression, slightly parted lips, intense gaze, looking at viewer, blazer, black jacket, collared shirt, black necktie, ornate Victorian gothic black dress, sheer lace sleeves, tight corset bodice, high-slit velvet skirt showing legs, sheer black thigh-high stockings, stiletto heels, theatrical standing pose, standing dramatically in front of a massive pipe organ, one arm raised conducting invisible music, holding a glowing crimson violin, environmental portrait, full body, full length view, low angle view, dynamic dutch angle, leading lines composition, seminar office, highly detailed background, indoor, abandoned gothic cathedral, giant shattered stained-glass window behind her, overgrown ruins, floating dust motes, scattered sheet music flying in the air, volumetric moonlight beams, volumetric fog, dramatic chiaroscuro lighting, cinematic lighting, tyndall effect, <lora:tsukatsuki_rio_illustrious:0.85>",
			NegativePrompt:   "worst quality, low quality, bad anatomy, bad hands, missing fingers, extra digits, blurry, watermark, signature, deformed halo",
			TriggerWords:     "tsukatsuki rio, halo, black hair, red eyes, blazer, seminar office",
			RecommendedModel: "Illustrious XL Base v0.1",
			RecommendedLoras: `[{"name": "tsukatsuki_rio_illustrious", "slug": "rio_lora", "weight": 0.85, "base_model": "Illustrious"}]`,
			LayerData:        `{"quality":"(anime_coloring:1.15), masterpiece, newest, best quality, highres, illustration","identity":"1girl, solo, tsukatsuki rio, red eyes, halo, black hair, long hair, intricate braided crown updo, long braided ponytail, loose framing side tendrils","proportions":"tall female, mature, slender, hourglass figure, slender waist, toned stomach, long legs, slender fingers","details":"sweat, glistening skin, sweatdrops on neck and collarbone, wet skin, shiny skin texture, heavy breathing","expression":"melancholic intense expression, focused fierce expression, slightly parted lips, intense gaze, looking at viewer","outfit":"blazer, black jacket, collared shirt, black necktie, ornate Victorian gothic black dress, sheer lace sleeves, tight corset bodice, high-slit velvet skirt showing legs, sheer black thigh-high stockings, stiletto heels","pose":"theatrical standing pose, standing dramatically in front of a massive pipe organ, one arm raised conducting invisible music, holding a glowing crimson violin","camera":"environmental portrait, full body, full length view, low angle view, dynamic dutch angle, leading lines composition","background":"seminar office, highly detailed background, indoor, abandoned gothic cathedral, giant shattered stained-glass window behind her, overgrown ruins","effects":"floating dust motes, scattered sheet music flying in the air, volumetric moonlight beams, volumetric fog, dramatic chiaroscuro lighting, cinematic lighting, tyndall effect","lora":{"name":"tsukatsuki_rio_illustrious","weight":0.85,"enabled":true}}`,
			Description:      "Rio Tsukatsuki from Blue Archive with signature black blazer, red eyes, and high-tech seminar office atmosphere.",
			IsSystem:         true,
		},
		{
			Title:            "Rin Tohsaka - Twin Braids (Full Set)",
			Character:        "Rin Tohsaka",
			Slug:             "rin-tohsaka-fullset",
			Category:         "modular_preset",
			Subcategory:      "Fate",
			BaseModelTarget:  "Illustrious",
			PresetType:       "fullset",
			PositivePrompt:   "(anime_coloring:1.20), masterpiece, newest, best quality, highres, illustration, 1girl, solo, tohsaka rin, aqua eyes, twin braids, black hair, hair ribbon, slender, thigh gap, delicate hands, glistening skin, slight blush, parted lips, tsundere expression, confident smirk, blushing slightly, looking at viewer, red turtleneck sweater, black pleated skirt, black thighhighs, pendant necklace, standing with hands on hips, cowboy shot, upper body, slight low angle, depth of field, fuyuki city rooftop at night, glowing city lights, moonlit sky, volumetric moonlight, gentle wind blowing hair, atmospheric lighting, <lora:tohsaka_rin_illustrious:0.85>",
			NegativePrompt:   "worst quality, low quality, bad anatomy, blurry, bad hands, deformed eyes",
			TriggerWords:     "tohsaka rin, aqua eyes, twin braids, red turtleneck sweater",
			RecommendedModel: "Illustrious XL Base v0.1",
			RecommendedLoras: `[{"name": "tohsaka_rin_illustrious", "slug": "rin_lora", "weight": 0.85, "base_model": "Illustrious"}]`,
			LayerData:        `{"quality":"(anime_coloring:1.20), masterpiece, newest, best quality, highres, illustration","identity":"1girl, solo, tohsaka rin, aqua eyes, twin braids, black hair, hair ribbon","proportions":"slender, thigh gap, delicate hands","details":"glistening skin, slight blush, parted lips","expression":"tsundere expression, confident smirk, blushing slightly, looking at viewer","outfit":"red turtleneck sweater, black pleated skirt, black thighhighs, pendant necklace","pose":"standing with hands on hips","camera":"cowboy shot, upper body, slight low angle, depth of field","background":"fuyuki city rooftop at night, glowing city lights, moonlit sky","effects":"volumetric moonlight, gentle wind blowing hair, atmospheric lighting","lora":{"name":"tohsaka_rin_illustrious","weight":0.85,"enabled":true}}`,
			Description:      "Rin Tohsaka on a Fuyuki City rooftop under moonlit sky with twin braids and classic red sweater.",
			IsSystem:         true,
		},
		{
			Title:            "Fantasy Elf Ranger (Full Set)",
			Character:        "Fantasy Elf Ranger",
			Slug:             "fantasy-elf-ranger-fullset",
			Category:         "modular_preset",
			Subcategory:      "Fantasy",
			BaseModelTarget:  "Illustrious",
			PresetType:       "fullset",
			PositivePrompt:   "masterpiece, best quality, amazing quality, highres, illustration, cel shading, 1girl, solo, emerald eyes, glowing eyes, elf ears, silver hair, elegant hairstyle, loose framing side tendrils, slender, athletic build, toned stomach, wide hips, thick thighs, delicate hands, manicured nails, glistening skin, sweat, pale skin, sun-kissed tan, slight blush, battle damage, focused fierce expression, intense gaze, gentle smile, white fantasy ranger tunic, leather corset, detached sleeves, fingerless gloves, thigh-high boots, capelet, dynamic combat stance, standing on a giant mossy tree root, drawing a glowing magic bow, holding crystal arrows, wide shot, low angle view, environmental portrait, cowboy shot, outdoor, ancient mystical forest, dense jungle, giant bioluminescent trees, mossy rocks, glowing mushrooms, waterfall, floating glowing spores, fireflies, shafts of sunlight breaking through canopy, volumetric fog, cinematic lighting, depth of field, <lora:fantasy_elf_ranger_xl:0.8>",
			NegativePrompt:   "worst quality, low quality, bad anatomy, deformed ears, extra fingers",
			TriggerWords:     "elf ears, silver hair, glowing eyes, magic bow, mystical forest",
			RecommendedModel: "Illustrious XL Base v0.1",
			RecommendedLoras: `[{"name": "fantasy_elf_ranger_xl", "slug": "elf_lora", "weight": 0.8, "base_model": "Illustrious"}]`,
			LayerData:        `{"quality":"masterpiece, best quality, amazing quality, highres, illustration, cel shading","identity":"1girl, solo, emerald eyes, glowing eyes, elf ears, silver hair, elegant hairstyle, loose framing side tendrils","proportions":"slender, athletic build, toned stomach, wide hips, thick thighs, delicate hands, manicured nails","details":"glistening skin, sweat, pale skin, sun-kissed tan, slight blush, battle damage","expression":"focused fierce expression, intense gaze, gentle smile","outfit":"white fantasy ranger tunic, leather corset, detached sleeves, fingerless gloves, thigh-high boots, capelet","pose":"dynamic combat stance, standing on a giant mossy tree root, drawing a glowing magic bow, holding crystal arrows","camera":"wide shot, low angle view, environmental portrait, cowboy shot","background":"outdoor, ancient mystical forest, dense jungle, giant bioluminescent trees, mossy rocks, glowing mushrooms, waterfall","effects":"floating glowing spores, fireflies, shafts of sunlight breaking through canopy, volumetric fog, cinematic lighting, depth of field","lora":{"name":"fantasy_elf_ranger_xl","weight":0.8,"enabled":true}}`,
			Description:      "Fantasy Elf Ranger in an ancient glowing forest wielding crystal magic arrows.",
			IsSystem:         true,
		},
	}

	for _, p := range fullSetSeeds {
		var existing models.PromptPreset
		if err := s.db.Where("slug = ?", p.Slug).First(&existing).Error; err != nil {
			s.db.Create(&p)
		} else if existing.IsSystem {
			s.db.Model(&existing).Updates(map[string]interface{}{
				"positive_prompt": p.PositivePrompt,
				"preset_type":     p.PresetType,
				"layer_data":      p.LayerData,
				"category":        p.Category,
				"subcategory":     p.Subcategory,
			})
		}
	}

	var fullCount int64
	s.db.Model(&models.PromptPreset{}).Where("preset_type = ? AND is_system = ?", "full", true).Count(&fullCount)
	if fullCount < 4 {
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
}

func (s *PromptPresetService) seedModularTags() {
	type tagItem struct {
		Subcat   string
		Subgroup string
		Tag      string
	}

	tags := []tagItem{
		// 1. Quality & Style
		{"quality", "", "(anime_coloring:1.15)"},
		{"quality", "", "masterpiece"},
		{"quality", "", "newest"},
		{"quality", "", "best quality"},
		{"quality", "", "highres"},
		{"quality", "", "absurdres"},
		{"quality", "", "amazing quality"},
		{"quality", "", "illustration"},
		{"quality", "", "cel shading"},

		// 2. LoRA & Character Identity
		{"identity", "", "1girl"},
		{"identity", "", "solo"},
		{"identity", "", "red eyes"},
		{"identity", "", "emerald eyes"},
		{"identity", "", "glowing eyes"},
		{"identity", "", "halo"},
		{"identity", "", "elf ears"},
		{"identity", "", "silver hair"},
		{"identity", "", "black hair"},
		{"identity", "", "intricate braided crown updo"},
		{"identity", "", "long braided ponytail"},
		{"identity", "", "loose framing side tendrils"},
		{"identity", "", "bangs"},
		{"identity", "", "elegant hairstyle"},

		// 3. Proportions
		{"proportions", "Tubuh", "tall female"},
		{"proportions", "Tubuh", "mature"},
		{"proportions", "Tubuh", "petite"},
		{"proportions", "Tubuh", "slender"},
		{"proportions", "Tubuh", "athletic build"},
		{"proportions", "Tubuh", "hourglass figure"},
		{"proportions", "Tubuh", "large breasts"},
		{"proportions", "Tubuh", "slender waist"},
		{"proportions", "Tubuh", "toned stomach"},
		{"proportions", "Tubuh", "wide hips"},
		{"proportions", "Tangan & Kaki", "thick thighs"},
		{"proportions", "Tangan & Kaki", "long legs"},
		{"proportions", "Tangan & Kaki", "thigh gap"},
		{"proportions", "Tangan & Kaki", "slender fingers"},
		{"proportions", "Tangan & Kaki", "delicate hands"},
		{"proportions", "Tangan & Kaki", "manicured nails"},
		{"proportions", "Tangan & Kaki", "sharp fingernails"},

		// 4. Details
		{"details", "", "sweat"},
		{"details", "", "glistening skin"},
		{"details", "", "sweatdrops on neck and collarbone"},
		{"details", "", "wet skin"},
		{"details", "", "shiny skin texture"},
		{"details", "", "pale skin"},
		{"details", "", "sun-kissed tan"},
		{"details", "", "slight blush"},
		{"details", "", "heavy breathing"},
		{"details", "", "tears"},
		{"details", "", "battle damage"},

		// 5. Expression
		{"expression", "", "melancholic intense expression"},
		{"expression", "", "focused fierce expression"},
		{"expression", "", "slightly parted lips"},
		{"expression", "", "intense gaze"},
		{"expression", "", "smirk"},
		{"expression", "", "gentle smile"},
		{"expression", "", "crying"},
		{"expression", "", "emotionless"},

		// 6. Outfit
		{"outfit", "", "ornate Victorian gothic black dress"},
		{"outfit", "", "sheer lace sleeves"},
		{"outfit", "", "tight corset bodice"},
		{"outfit", "", "high-slit velvet skirt showing legs"},
		{"outfit", "", "sheer black thigh-high stockings"},
		{"outfit", "", "stiletto heels"},
		{"outfit", "", "white fantasy ranger tunic"},
		{"outfit", "", "leather corset"},
		{"outfit", "", "detached sleeves"},
		{"outfit", "", "fingerless gloves"},
		{"outfit", "", "thigh-high boots"},
		{"outfit", "", "capelet"},

		// 7. Pose
		{"pose", "", "theatrical standing pose"},
		{"pose", "", "dynamic combat stance"},
		{"pose", "", "standing dramatically in front of a massive pipe organ"},
		{"pose", "", "standing on a giant mossy tree root"},
		{"pose", "", "one arm raised conducting invisible music"},
		{"pose", "", "holding a glowing crimson violin"},
		{"pose", "", "drawing a glowing magic bow"},
		{"pose", "", "holding crystal arrows"},
		{"pose", "", "sitting on throne"},

		// 8. Camera
		{"camera", "", "full body"},
		{"camera", "", "wide shot"},
		{"camera", "", "distant shot"},
		{"camera", "", "environmental portrait"},
		{"camera", "", "full length view"},
		{"camera", "", "low angle view"},
		{"camera", "", "high angle"},
		{"camera", "", "dynamic dutch angle"},
		{"camera", "", "tilted camera frame"},
		{"camera", "", "leading lines composition"},
		{"camera", "", "cowboy shot"},
		{"camera", "", "close-up"},

		// 9. Background
		{"background", "Indoor / Gothic", "indoor"},
		{"background", "Indoor / Gothic", "abandoned gothic cathedral"},
		{"background", "Indoor / Gothic", "giant shattered stained-glass window behind her"},
		{"background", "Indoor / Gothic", "overgrown ruins"},
		{"background", "Outdoor / Hutan", "outdoor"},
		{"background", "Outdoor / Hutan", "ancient mystical forest"},
		{"background", "Outdoor / Hutan", "dense jungle"},
		{"background", "Outdoor / Hutan", "giant bioluminescent trees"},
		{"background", "Outdoor / Hutan", "mossy rocks"},
		{"background", "Outdoor / Hutan", "glowing mushrooms"},
		{"background", "Outdoor / Hutan", "waterfall"},

		// 10. Effects
		{"effects", "", "floating dust motes"},
		{"effects", "", "scattered sheet music flying in the air"},
		{"effects", "", "floating glowing spores"},
		{"effects", "", "fireflies"},
		{"effects", "", "volumetric moonlight beams"},
		{"effects", "", "shafts of sunlight breaking through canopy"},
		{"effects", "", "volumetric fog"},
		{"effects", "", "dramatic chiaroscuro lighting"},
		{"effects", "", "cinematic lighting"},
		{"effects", "", "tyndall effect"},
		{"effects", "", "depth of field"},
	}

	for i, t := range tags {
		p := models.PromptPreset{
			Title:           t.Tag,
			Character:       t.Tag,
			Slug:            fmt.Sprintf("mod-%s-%d", t.Subcat, i+1),
			Category:        "modular",
			Subcategory:     t.Subcat,
			PresetType:      "modular",
			PositivePrompt:  t.Tag,
			TriggerWords:    t.Subgroup,
			BaseModelTarget: "All",
			IsSystem:        true,
		}
		s.db.Create(&p)
	}
}
