package services

import (
	"encoding/json"
	"testing"
)

func TestCivitaiResponseUnmarshal(t *testing.T) {
	// Raw sample including floating point sizeKB that Civitai returns
	rawJSON := `{
		"id": 257749,
		"name": "Pony Diffusion V6 XL",
		"description": "<p>A versatile SDXL finetune</p>",
		"type": "Checkpoint",
		"nsfw": false,
		"tags": ["anime", "character"],
		"creator": {
			"username": "PurpleSmartAI",
			"image": "https://example.com/avatar.jpg"
		},
		"modelVersions": [
			{
				"id": 290640,
				"name": "V6",
				"baseModel": "Pony",
				"trainedWords": ["score_9", "score_8_up"],
				"files": [
					{
						"id": 228616,
						"sizeKB": 6775430.353515625,
						"name": "ponyDiffusionV6XL.safetensors",
						"type": "Model",
						"format": "SafeTensor",
						"downloadUrl": "https://civitai.com/api/download/models/290640"
					}
				],
				"images": [
					{
						"id": 5706937,
						"url": "https://image.civitai.com/sample.jpeg",
						"nsfwLevel": 1,
						"width": 1200,
						"height": 1600,
						"meta": {
							"prompt": "1girl, solo",
							"negativePrompt": "bad quality",
							"steps": 25,
							"cfgScale": 7.5,
							"seed": 1234567890,
							"sampler": "Euler a"
						}
					}
				]
			}
		]
	}`

	var resp civitaiModelResponse
	if err := json.Unmarshal([]byte(rawJSON), &resp); err != nil {
		t.Fatalf("failed to unmarshal civitai JSON with float sizeKB: %v", err)
	}

	if resp.ID != 257749 {
		t.Errorf("expected ID 257749, got %d", resp.ID)
	}
	if len(resp.ModelVersions) != 1 {
		t.Fatalf("expected 1 model version, got %d", len(resp.ModelVersions))
	}
	ver := resp.ModelVersions[0]
	if len(ver.Files) != 1 {
		t.Fatalf("expected 1 file, got %d", len(ver.Files))
	}
	file := ver.Files[0]
	if file.SizeKB < 6775430 || file.SizeKB > 6775431 {
		t.Errorf("expected sizeKB ~6775430.35, got %f", file.SizeKB)
	}
}

func TestExtractCivitaiID(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"https://civitai.com/models/257749", "257749"},
		{"https://civitai.pro/models/257749/pony-diffusion-v6-xl", "257749"},
		{"https://civitai.red/models/12345?modelVersionId=67890", "12345"},
		{"257749", "257749"},
		{"   999888   ", "999888"},
	}

	for _, tc := range tests {
		actual := extractCivitaiID(tc.input)
		if actual != tc.expected {
			t.Errorf("extractCivitaiID(%q) = %q; want %q", tc.input, actual, tc.expected)
		}
	}
}

func TestExtractHFRepoID(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"https://huggingface.co/black-forest-labs/FLUX.1-schnell", "black-forest-labs/FLUX.1-schnell"},
		{"https://hf.co/runwayml/stable-diffusion-v1-5", "runwayml/stable-diffusion-v1-5"},
		{"black-forest-labs/FLUX.1-dev", "black-forest-labs/FLUX.1-dev"},
	}

	for _, tc := range tests {
		actual := extractHFRepoID(tc.input)
		if actual != tc.expected {
			t.Errorf("extractHFRepoID(%q) = %q; want %q", tc.input, actual, tc.expected)
		}
	}
}

func TestNormalizeBaseModel(t *testing.T) {
	if normalizeBaseModel("Pony Diffusion V6") != "Pony" {
		t.Errorf("expected Pony, got %s", normalizeBaseModel("Pony Diffusion V6"))
	}
	if normalizeBaseModel("Illustrious-XL") != "Illustrious" {
		t.Errorf("expected Illustrious, got %s", normalizeBaseModel("Illustrious-XL"))
	}
	if normalizeBaseModel("NoobAI-XL") != "NoobAI" {
		t.Errorf("expected NoobAI, got %s", normalizeBaseModel("NoobAI-XL"))
	}
	if normalizeBaseModel("SD 1.5") != "SD 1.5" {
		t.Errorf("expected SD 1.5, got %s", normalizeBaseModel("SD 1.5"))
	}
}

func TestExtractRecommendedSettingsWAI(t *testing.T) {
	waiText := `**Recommended settings: Steps: 15-30 CFG scale: 5-7 Sampler: Euler a The VAE is already integrated, please do not ask such questions anymore. use size larger than1024x1024 for the original dimensions. Example images use 1024×1344. Hires upscale: 1.5, Hires steps: 20. Hires upscaler: R-ESRGAN 4x+ Anime6B. Denoising strength: 0.35~0.5 There are four safety rating tags: **general, sensitive, nsfw, explicit**.`
	settings := extractRecommendedSettings("Illustrious", []string{waiText}, nil)

	if smp, ok := settings["sampler"].(string); !ok || smp != "Euler a" {
		t.Errorf("expected sampler 'Euler a', got '%v'", settings["sampler"])
	}
	if w, ok := settings["width"].(int); !ok || w != 1024 {
		t.Errorf("expected width 1024, got %v", settings["width"])
	}
	if h, ok := settings["height"].(int); !ok || h != 1344 {
		t.Errorf("expected height 1344, got %v", settings["height"])
	}
	if sr, ok := settings["steps_range"].(string); !ok || sr != "15-30" {
		t.Errorf("expected steps_range '15-30', got '%v'", settings["steps_range"])
	}
	if cr, ok := settings["cfg_scale_range"].(string); !ok || cr != "5-7" {
		t.Errorf("expected cfg_scale_range '5-7', got '%v'", settings["cfg_scale_range"])
	}
	if hu, ok := settings["hires_upscale"].(float64); !ok || hu != 1.5 {
		t.Errorf("expected hires_upscale 1.5, got %v", settings["hires_upscale"])
	}
	if hs, ok := settings["hires_steps"].(int); !ok || hs != 20 {
		t.Errorf("expected hires_steps 20, got %v", settings["hires_steps"])
	}
	if hup, ok := settings["hires_upscaler"].(string); !ok || hup != "R-ESRGAN 4x+ Anime6B" {
		t.Errorf("expected hires_upscaler 'R-ESRGAN 4x+ Anime6B', got '%v'", settings["hires_upscaler"])
	}
	if dn, ok := settings["denoising_strength"].(string); !ok || dn != "0.35~0.5" {
		t.Errorf("expected denoising_strength '0.35~0.5', got '%v'", settings["denoising_strength"])
	}
}

func TestSanitizeDescriptionHTML(t *testing.T) {
	raw := `<p>Hello <script>alert('xss')</script><strong>world</strong> <a href="https://example.com" onclick="steal()">link</a></p>`
	clean := sanitizeDescriptionHTML(raw)
	if clean != `<p>Hello <strong>world</strong> <a rel="noopener noreferrer ugc" target="_blank" href="https://example.com">link</a></p>` {
		t.Errorf("unexpected sanitized html: %s", clean)
	}
}

func TestExtractRecommendedSettingsHTMLMultiVersion(t *testing.T) {
	htmlDesc := `<h2 id="v-pred-04"><span style="color:rgb(64, 192, 87)"><strong>V-pred-04</strong></span></h2>
<p>Data balancing and adjustment</p>
<h3 id="recommended-settings:"><span style="color:rgb(230, 73, 128)">Recommended settings:</span></h3>
<p><span style="color:rgb(250, 82, 82)">Steps: </span><span style="color:rgb(250, 176, 5)">30</span></p>
<p><span style="color:rgb(250, 82, 82)">CFG scale: </span><span style="color:rgb(250, 176, 5)">5-7</span></p>
<p><span style="color:rgb(250, 82, 82)">Sampler: </span><span style="color:rgb(250, 176, 5)">Euler a</span></p>
<hr />
<p><span style="color:rgb(190, 75, 219)"><strong>All example images are generated at 1024x1360,and Hires upscale: 1.5, Hires steps: 20, Hires upscaler: R-ESRGAN 4x+ Anime6B,Denoising strength: 0.5.</strong></span></p>
<h2 id="v2"><strong>V2</strong></h2>
<h3 id="recommended-settings:"><span style="color:rgb(230, 73, 128)">Recommended settings:</span></h3>
<p><span style="color:rgb(250, 82, 82)">Steps: </span><span style="color:rgb(250, 176, 5)">30</span></p>
<p><span style="color:rgb(250, 82, 82)">CFG scale: </span><span style="color:rgb(250, 176, 5)">5.5</span></p>
<p><span style="color:rgb(250, 82, 82)">Sampler: </span><span style="color:rgb(250, 176, 5)">Euler a</span></p>`

	// Test V-pred-04
	s04 := extractRecommendedSettings("NoobAI", []string{htmlDesc, "v-pred-04"}, nil)
	if s04["steps"] != 30 {
		t.Errorf("expected steps 30 for v-pred-04, got %v", s04["steps"])
	}
	if s04["cfg_scale_range"] != "5-7" {
		t.Errorf("expected cfg_scale_range '5-7' for v-pred-04, got %v", s04["cfg_scale_range"])
	}
	if s04["width"] != 1024 || s04["height"] != 1360 {
		t.Errorf("expected 1024x1360 for v-pred-04, got %vx%v", s04["width"], s04["height"])
	}
	if s04["hires_upscale"] != 1.5 {
		t.Errorf("expected hires_upscale 1.5, got %v", s04["hires_upscale"])
	}
	if s04["denoise"] != "0.5" {
		t.Errorf("expected denoise '0.5', got '%v'", s04["denoise"])
	}

	// Test V2
	sV2 := extractRecommendedSettings("NoobAI", []string{htmlDesc, "v2"}, nil)
	if sV2["cfg_scale_range"] != "5.5" {
		t.Errorf("expected cfg_scale_range '5.5' for v2, got %v", sV2["cfg_scale_range"])
	}
}

