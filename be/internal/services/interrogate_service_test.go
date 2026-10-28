package services

import (
	"strings"
	"testing"
)

func TestRepairAndSanitizeJSON_UserErrorCase(t *testing.T) {
	// Exact raw output from user's error report
	rawInput := `{ "observed_facts": { "camera_and_pose": "front_view, looking_at_viewer, sitting_on_bed_with_knees_bent", "hair_and_face": "white_hair, long_hair, low_ponytail_with_tail_finishing_highly_upside_down_style_including_a_black_star_clip_or_attachment_point_near_the_top_of_head_but_not_visible_as_an_individual_item; hair_between_eyes, blue_eyes, blush_on_cheeks", "upper_and_lower_clothing": { "top": "dark_blue_bra-like_upper_body_with_white_trimmed_edges_at_shoulders_and_a_black_ringed_strap_across_the_front_center_line_of_chest_area;", "inner_shirt_or_underwear_layering": "", "belt_or_fastening_detail": "" }, "hands_and_limbs_visibility": { "hands_worn_gloves_visible_in_full_view_with_fingers_exposed_but_not_pocketed", "wrist_barely_covered_by_sleeve_cuff_that_is_partially_opening_up_to_show_inner_layer_or_skin_at_the_top_of_arm" }, "nsfw_and_anatomy_audit": "SFW / Fully clothed, but revealing top with exposed chest and lower body including thigh-high stockings", "environment": "indoors_with_large_window_in_background_showing_clear_blue_sky_outside; bed_covering_visible_under_character's_body;" }, "character": "", "danbooru_prompt": "masterpiece, best quality, very aesthetic, absurdres, 1girl, solo, white_hair_ponytail_style_with_star_clip_or_attachment_point_near_top_of_head_but_not_individual_item_separately_shown_in_frame; blue_eyes_blush_on_cheeks_sitting_on_bed_knees_bent_wearing_dark_blue_strapless_upper_body_outfit_with_white_trimmed_edges_and_black_ringed_front_center_line_chest_area_gloves_visible_fingers_exposed_partial_cuff_opening_up_to_show_inner_layer_or_skin_at_top_of_arm_thigh_high_stockings_vivid_color_palette_light_background_window_shows_clear_sky", "negative_prompt": "worst quality, low quality, normal quality, lowres, blurry, bad anatomy, bad hands, missing fingers, extra digit, fewer digits watermark signature artist_name_in_corner", "natural_prompt": "A white-haired girl with blue eyes and blush on her cheeks is sitting on a bed in front of an open window showing clear sky. She has long hair styled into two braids that end high up near the top of her head, one ending in a black star-shaped clip or attachment point not fully visible as separate item. Her outfit consists of a dark blue strapless upper body with white-trimmed edges and a central chest area featuring black rings; she wears gloves showing exposed fingers but partially open cuffs revealing inner layer or skin at top arm. She also has thigh-high stockings, and the background includes light-colored walls.", "style_tags": [ "anime", "digital media", "illustration" ], "recommended_model": "Illustrious-XL", "recommended_sampler": "Euler a`

	repaired := repairAndSanitizeJSON(rawInput)

	svc := &InterrogateService{}
	res, err := svc.parseAndPostProcessJSON(rawInput, "ollama", "qwen2.5-vl")
	if err != nil {
		t.Fatalf("Expected parsing to succeed on repaired JSON, got error: %v\nRepaired text was:\n%s", err, repaired)
	}

	if !strings.Contains(res.DanbooruPrompt, "masterpiece") {
		t.Errorf("Expected danbooru_prompt to contain 'masterpiece', got: %s", res.DanbooruPrompt)
	}

	if res.RecommendedSampler != "Euler a" {
		t.Errorf("Expected recommended_sampler to be 'Euler a', got: %s", res.RecommendedSampler)
	}

	t.Logf("ObservedFacts: %#v", res.ObservedFacts)
	t.Logf("Repaired JSON:\n%s", repaired)
	handsFact := extractObservedFact(res.ObservedFacts, "hands_and_limbs_visibility")
	if !strings.Contains(handsFact, "hands_worn_gloves") {
		t.Errorf("Expected hands_and_limbs_visibility to be extracted from array, got: %s", handsFact)
	}

	clothingFact := extractObservedFact(res.ObservedFacts, "upper_and_lower_clothing")
	if !strings.Contains(clothingFact, "dark_blue_bra") {
		t.Errorf("Expected upper_and_lower_clothing to be extracted from nested map, got: %s", clothingFact)
	}
}

func TestRepairAndSanitizeJSON_LMStudioRawOutput(t *testing.T) {
	// Raw text from LM Studio without response_format, with fences, commentary, and array danbooru_prompt
	rawLMStudio := `Here is the analysis of the image in JSON format:
` + "```json" + `
{
  "observed_facts": {
    "camera_and_pose": "front view standing",
    "hair_and_face": "blonde hair, blue eyes",
    "upper_and_lower_clothing": "school uniform",
    "hands_and_limbs_visibility": "bare hands",
    "exposure_and_rating_audit": "[TIER: general] - fully clothed",
    "environment": "classroom"
  },
  "character": "original",
  "danbooru_prompt": ["masterpiece", "best quality", "1girl", "school_uniform", "classroom"],
  "negative_prompt": "low quality, blurry",
  "natural_prompt": "A girl in school uniform in a classroom.",
  "style_tags": ["anime", "illustration"],
  "recommended_model": "Illustrious-XL",
  "recommended_sampler": "Euler a",
  "recommended_steps": 28,
  "recommended_cfg": 6.0,
  "suggested_loras": []
}
` + "```" + `
I hope this detailed breakdown helps your workflow!`

	svc := &InterrogateService{}
	res, err := svc.parseAndPostProcessJSON(rawLMStudio, "lmstudio", "local-model")
	if err != nil {
		t.Fatalf("Expected successful parsing of LM Studio raw output, got: %v", err)
	}

	if !strings.Contains(res.DanbooruPrompt, "masterpiece") || !strings.Contains(res.DanbooruPrompt, "school_uniform") {
		t.Errorf("Expected danbooru_prompt to unmarshal flexible array, got: %s", res.DanbooruPrompt)
	}

	if res.Character != "original" {
		t.Errorf("Expected character 'original', got: %s", res.Character)
	}
}

func TestHarvestCanonicalTagsFromText_ScreenshotCase(t *testing.T) {
	// The exact case from user report: model returned only 6 tags
	initialTags := []string{"masterpiece", "best quality", "very aesthetic", "absurdres", "1girl", "solo"}
	facts := ObservedFacts{
		CameraAndPose:           "sitting on a bed near window, knees bent",
		HairAndFace:             "white hair, pointy ears, blue eyes, blush on cheeks",
		UpperAndLowerClothing:   "detached sleeves, long gloves covering arms to elbow, see-through cleavage, navel cutout in midsection revealing stomach",
		HandsAndLimbsVisibility: "hands and elbow gloves clearly visible",
		ExposureAndRatingAudit:  "[TIER: sensitive] - nipples and genitalia 100% covered by fabric",
		Environment:             "indoors with large window, bed",
	}
	naturalPrompt := "A white-haired elf girl with pointy ears and blue eyes sits on a bed near a window. She wears an outfit that includes detached sleeves ending at elbows and long gloves covering her arms to the elbow. Her top has see-through cleavage exposing large breasts, but nipples are covered by fabric. There is also a navel cutout in her midsection revealing stomach skin below the garment's lower edge."

	harvested := harvestCanonicalTagsFromText(facts, naturalPrompt, initialTags)

	// Verify existing tags kept at front
	if len(harvested) < 15 {
		t.Fatalf("Expected at least 15 harvested tags, got %d: %v", len(harvested), harvested)
	}
	if harvested[0] != "masterpiece" || harvested[5] != "solo" {
		t.Errorf("Initial tags were not preserved at start: %v", harvested[:6])
	}

	joined := strings.Join(harvested, ", ")
	requiredTags := []string{
		"white_hair", "pointy_ears", "blue_eyes", "detached_sleeves", "elbow_gloves",
		"see-through_cleavage", "cleavage", "large_breasts", "navel_cutout", "navel",
		"sitting", "on_bed", "bed_sheet", "window",
	}

	for _, rt := range requiredTags {
		if !strings.Contains(joined, rt) {
			t.Errorf("Expected tag %q to be auto-harvested from observed facts/natural prompt, got: %s", rt, joined)
		}
	}
}

func TestSanitizeNegativePrompt_MissingCommas(t *testing.T) {
	raw := "worst quality, low quality, normal quality, lowres blurry bad anatomy bad hands missing fingers extra digit fewer digits watermark signature"
	cleaned := sanitizeNegativePrompt(raw)

	expectedTokens := []string{
		"worst quality", "low quality", "normal quality", "lowres", "blurry",
		"bad anatomy", "bad hands", "missing fingers", "extra digit", "fewer digits",
		"watermark", "signature",
	}

	for _, token := range expectedTokens {
		if !strings.Contains(cleaned, token) {
			t.Errorf("Expected token %q in cleaned negative prompt, got: %s", token, cleaned)
		}
	}

	// Make sure no space-fused substring remains
	if strings.Contains(cleaned, "lowres blurry") || strings.Contains(cleaned, "bad anatomy bad hands") {
		t.Errorf("Negative prompt still contains unseparated tokens: %s", cleaned)
	}
}


