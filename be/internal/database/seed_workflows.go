package database

import (
	"log"

	"github.com/alazriel6/models-guide/backend/internal/models"
	"gorm.io/gorm"
)

func SeedWorkflows(db *gorm.DB) error {
	var count int64
	db.Model(&models.Workflow{}).Count(&count)
	if count > 0 {
		return nil
	}

	log.Println("Seeding initial ComfyUI workflow presets...")

	// Find models to associate if present
	var illustModel, sdxlModel, ponyModel models.Model
	db.Where("LOWER(base_model) = ?", "illustrious").First(&illustModel)
	db.Where("LOWER(base_model) = ?", "sdxl").First(&sdxlModel)
	db.Where("LOWER(base_model) = ?", "pony").First(&ponyModel)

	var illustModelID *uint
	if illustModel.ID > 0 {
		illustModelID = &illustModel.ID
	}
	var sdxlModelID *uint
	if sdxlModel.ID > 0 {
		sdxlModelID = &sdxlModel.ID
	}
	var ponyModelID *uint
	if ponyModel.ID > 0 {
		ponyModelID = &ponyModel.ID
	}

	workflows := []models.Workflow{
		{
			Name:                "SDXL Standard Txt2Img Baseline",
			Slug:                "sdxl-standard-txt2img-baseline",
			Description:         "Workflow dasar optimal untuk model SDXL dengan resolusi 1024x1024, KSampler DPM++ 2M Karras, dan VAE Decode langsung.",
			BaseModel:           "SDXL",
			Category:            "txt2img",
			Author:              "Models Guide Team",
			ModelID:             sdxlModelID,
			RequiredCustomNodes: "Built-in (No Custom Nodes Required)",
			TotalNodes:          7,
			WorkflowJSON: `{
  "last_node_id": 9,
  "last_link_id": 9,
  "nodes": [
    {
      "id": 4,
      "type": "CheckpointLoaderSimple",
      "pos": [40, 100],
      "size": [315, 98],
      "inputs": [],
      "outputs": [
        {"name": "MODEL", "type": "MODEL", "links": [1], "slot_index": 0},
        {"name": "CLIP", "type": "CLIP", "links": [3, 5], "slot_index": 1},
        {"name": "VAE", "type": "VAE", "links": [8], "slot_index": 2}
      ],
      "widgets_values": ["sd_xl_base_1.0.safetensors"]
    },
    {
      "id": 6,
      "type": "CLIPTextEncode",
      "pos": [420, 40],
      "size": [425, 180],
      "inputs": [{"name": "clip", "type": "CLIP", "link": 3}],
      "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [4], "slot_index": 0}],
      "title": "Positive Prompt (SDXL)",
      "widgets_values": ["cinematic photo, detailed portrait of cyberpunk girl with neon visor, masterpiece, dramatic ambient lighting, high sharpness 8k"]
    },
    {
      "id": 7,
      "type": "CLIPTextEncode",
      "pos": [420, 260],
      "size": [425, 180],
      "inputs": [{"name": "clip", "type": "CLIP", "link": 5}],
      "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [6], "slot_index": 0}],
      "title": "Negative Prompt",
      "widgets_values": ["low quality, bad quality, worst quality, blurry, deformed, extra fingers, cartoon, 3d"]
    },
    {
      "id": 5,
      "type": "EmptyLatentImage",
      "pos": [500, 480],
      "size": [315, 106],
      "inputs": [],
      "outputs": [{"name": "LATENT", "type": "LATENT", "links": [2], "slot_index": 0}],
      "widgets_values": [1024, 1024, 1]
    },
    {
      "id": 3,
      "type": "KSampler",
      "pos": [920, 100],
      "size": [315, 262],
      "inputs": [
        {"name": "model", "type": "MODEL", "link": 1},
        {"name": "positive", "type": "CONDITIONING", "link": 4},
        {"name": "negative", "type": "CONDITIONING", "link": 6},
        {"name": "latent_image", "type": "LATENT", "link": 2}
      ],
      "outputs": [{"name": "LATENT", "type": "LATENT", "links": [7], "slot_index": 0}],
      "widgets_values": [1844674407370955, "randomize", 28, 6.0, "dpmpp_2m", "karras", 1.0]
    },
    {
      "id": 8,
      "type": "VAEDecode",
      "pos": [1280, 100],
      "size": [210, 46],
      "inputs": [
        {"name": "samples", "type": "LATENT", "link": 7},
        {"name": "vae", "type": "VAE", "link": 8}
      ],
      "outputs": [{"name": "IMAGE", "type": "IMAGE", "links": [9], "slot_index": 0}]
    },
    {
      "id": 9,
      "type": "SaveImage",
      "pos": [1540, 100],
      "size": [320, 360],
      "inputs": [{"name": "images", "type": "IMAGE", "link": 9}],
      "outputs": [],
      "widgets_values": ["SDXL_Output"]
    }
  ],
  "links": [
    [1, 4, 0, 3, 0, "MODEL"],
    [2, 5, 0, 3, 3, "LATENT"],
    [3, 4, 1, 6, 0, "CLIP"],
    [4, 6, 0, 3, 1, "CONDITIONING"],
    [5, 4, 1, 7, 0, "CLIP"],
    [6, 7, 0, 3, 2, "CONDITIONING"],
    [7, 3, 0, 8, 0, "LATENT"],
    [8, 4, 2, 8, 1, "VAE"],
    [9, 8, 0, 9, 0, "IMAGE"]
  ]
}`,
		},
		{
			Name:                "Illustrious XL Anime Txt2Img + ADetailer",
			Slug:                "illustrious-xl-anime-txt2img-adetailer",
			Description:         "Workflow anime modern khusus arsitektur Illustrious XL, dilengkapi Face Detailer (Impact Pack) untuk memastikan mata dan ekspresi wajah tetap tajam tanpa artefak.",
			BaseModel:           "Illustrious",
			Category:            "detailer",
			Author:              "Models Guide Team",
			ModelID:             illustModelID,
			RequiredCustomNodes: "ComfyUI-Impact-Pack",
			TotalNodes:          9,
			WorkflowJSON: `{
  "last_node_id": 12,
  "last_link_id": 12,
  "nodes": [
    {
      "id": 1,
      "type": "CheckpointLoaderSimple",
      "pos": [40, 80],
      "size": [315, 98],
      "inputs": [],
      "outputs": [
        {"name": "MODEL", "type": "MODEL", "links": [1, 10], "slot_index": 0},
        {"name": "CLIP", "type": "CLIP", "links": [2, 3], "slot_index": 1},
        {"name": "VAE", "type": "VAE", "links": [7, 11], "slot_index": 2}
      ],
      "widgets_values": ["animagineXLV31_v31.safetensors"]
    },
    {
      "id": 2,
      "type": "CLIPTextEncode",
      "pos": [400, 40],
      "size": [420, 160],
      "inputs": [{"name": "clip", "type": "CLIP", "link": 2}],
      "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [4], "slot_index": 0}],
      "title": "Positive Anime Prompt",
      "widgets_values": ["masterpiece, best quality, 1girl, solo, silver hair, blue eyes, high school uniform, sakura petals, dynamic angle, beautiful detailed eyes"]
    },
    {
      "id": 3,
      "type": "CLIPTextEncode",
      "pos": [400, 240],
      "size": [420, 160],
      "inputs": [{"name": "clip", "type": "CLIP", "link": 3}],
      "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [5], "slot_index": 0}],
      "title": "Negative Prompt",
      "widgets_values": ["worst quality, low quality, bad anatomy, deformed hands, extra fingers, text, watermark"]
    },
    {
      "id": 4,
      "type": "EmptyLatentImage",
      "pos": [400, 440],
      "size": [315, 106],
      "inputs": [],
      "outputs": [{"name": "LATENT", "type": "LATENT", "links": [6], "slot_index": 0}],
      "widgets_values": [896, 1152, 1]
    },
    {
      "id": 5,
      "type": "KSampler",
      "pos": [880, 80],
      "size": [315, 262],
      "inputs": [
        {"name": "model", "type": "MODEL", "link": 1},
        {"name": "positive", "type": "CONDITIONING", "link": 4},
        {"name": "negative", "type": "CONDITIONING", "link": 5},
        {"name": "latent_image", "type": "LATENT", "link": 6}
      ],
      "outputs": [{"name": "LATENT", "type": "LATENT", "links": [8], "slot_index": 0}],
      "widgets_values": [123456789, "randomize", 28, 5.5, "euler_ancestral", "karras", 1.0]
    },
    {
      "id": 6,
      "type": "VAEDecode",
      "pos": [1240, 80],
      "size": [210, 46],
      "inputs": [
        {"name": "samples", "type": "LATENT", "link": 8},
        {"name": "vae", "type": "VAE", "link": 7}
      ],
      "outputs": [{"name": "IMAGE", "type": "IMAGE", "links": [9], "slot_index": 0}]
    },
    {
      "id": 10,
      "type": "UltralyticsDetectorProvider",
      "pos": [1160, 360],
      "size": [280, 80],
      "inputs": [],
      "outputs": [{"name": "BBOX_DETECTOR", "type": "BBOX_DETECTOR", "links": [12], "slot_index": 0}],
      "widgets_values": ["bbox/face_yolov8m.pt"]
    },
    {
      "id": 11,
      "type": "FaceDetailer",
      "pos": [1520, 80],
      "size": [320, 380],
      "inputs": [
        {"name": "image", "type": "IMAGE", "link": 9},
        {"name": "model", "type": "MODEL", "link": 10},
        {"name": "clip", "type": "CLIP", "link": 2},
        {"name": "vae", "type": "VAE", "link": 11},
        {"name": "bbox_detector", "type": "BBOX_DETECTOR", "link": 12}
      ],
      "outputs": [{"name": "image", "type": "IMAGE", "links": [13], "slot_index": 0}],
      "widgets_values": [384, 0.5, 20, 5.0, "euler_a", "normal", 0.35]
    },
    {
      "id": 12,
      "type": "SaveImage",
      "pos": [1900, 80],
      "size": [340, 380],
      "inputs": [{"name": "images", "type": "IMAGE", "link": 13}],
      "outputs": [],
      "widgets_values": ["Illustrious_ADetailer"]
    }
  ],
  "links": [
    [1, 1, 0, 5, 0, "MODEL"],
    [2, 1, 1, 2, 0, "CLIP"],
    [3, 1, 1, 3, 0, "CLIP"],
    [4, 2, 0, 5, 1, "CONDITIONING"],
    [5, 3, 0, 5, 2, "CONDITIONING"],
    [6, 4, 0, 5, 3, "LATENT"],
    [7, 1, 2, 6, 1, "VAE"],
    [8, 5, 0, 6, 0, "LATENT"],
    [9, 6, 0, 11, 0, "IMAGE"],
    [10, 1, 0, 11, 1, "MODEL"],
    [11, 1, 2, 11, 3, "VAE"],
    [12, 10, 0, 11, 4, "BBOX_DETECTOR"],
    [13, 11, 0, 12, 0, "IMAGE"]
  ]
}`,
		},
		{
			Name:                "Pony V6 Multi-LoRA Stacking Pipeline",
			Slug:                "pony-v6-multi-lora-stacking-pipeline",
			Description:         "Workflow spesialis Pony Diffusion dengan 2-slot LoRA loader (Character LoRA + Style LoRA) serta CLIP Skip -2 dan negative embedding optimal.",
			BaseModel:           "Pony",
			Category:            "lora_stack",
			Author:              "Models Guide Team",
			ModelID:             ponyModelID,
			RequiredCustomNodes: "Built-in (No Custom Nodes Required)",
			TotalNodes:          8,
			WorkflowJSON: `{
  "last_node_id": 10,
  "last_link_id": 11,
  "nodes": [
    {
      "id": 1,
      "type": "CheckpointLoaderSimple",
      "pos": [40, 100],
      "size": [315, 98],
      "inputs": [],
      "outputs": [
        {"name": "MODEL", "type": "MODEL", "links": [1], "slot_index": 0},
        {"name": "CLIP", "type": "CLIP", "links": [2], "slot_index": 1},
        {"name": "VAE", "type": "VAE", "links": [9], "slot_index": 2}
      ],
      "widgets_values": ["ponyDiffusionV6XL_v6StartWithThisOne.safetensors"]
    },
    {
      "id": 2,
      "type": "LoraLoader",
      "pos": [400, 100],
      "size": [315, 126],
      "inputs": [
        {"name": "model", "type": "MODEL", "link": 1},
        {"name": "clip", "type": "CLIP", "link": 2}
      ],
      "outputs": [
        {"name": "MODEL", "type": "MODEL", "links": [3], "slot_index": 0},
        {"name": "CLIP", "type": "CLIP", "links": [4], "slot_index": 1}
      ],
      "title": "LoRA 1 (Character)",
      "widgets_values": ["character_lora.safetensors", 0.85, 0.85]
    },
    {
      "id": 3,
      "type": "LoraLoader",
      "pos": [760, 100],
      "size": [315, 126],
      "inputs": [
        {"name": "model", "type": "MODEL", "link": 3},
        {"name": "clip", "type": "CLIP", "link": 4}
      ],
      "outputs": [
        {"name": "MODEL", "type": "MODEL", "links": [5], "slot_index": 0},
        {"name": "CLIP", "type": "CLIP", "links": [6, 7], "slot_index": 1}
      ],
      "title": "LoRA 2 (Aesthetic Style)",
      "widgets_values": ["aesthetic_style.safetensors", 0.60, 0.60]
    },
    {
      "id": 4,
      "type": "CLIPTextEncode",
      "pos": [1120, 40],
      "size": [400, 160],
      "inputs": [{"name": "clip", "type": "CLIP", "link": 6}],
      "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [8], "slot_index": 0}],
      "title": "Positive Prompt (score_9, score_8_up)",
      "widgets_values": ["score_9, score_8_up, score_7_up, source_anime, 1girl, vibrant sunset sky, dramatic wind, beautiful scenery"]
    },
    {
      "id": 5,
      "type": "CLIPTextEncode",
      "pos": [1120, 240],
      "size": [400, 160],
      "inputs": [{"name": "clip", "type": "CLIP", "link": 7}],
      "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [10], "slot_index": 0}],
      "title": "Negative Prompt (score_4, score_5)",
      "widgets_values": ["score_4, score_5, score_6, ugly, deformed, blurry, bad anatomy, text, watermark"]
    },
    {
      "id": 6,
      "type": "KSampler",
      "pos": [1560, 100],
      "size": [315, 262],
      "inputs": [
        {"name": "model", "type": "MODEL", "link": 5},
        {"name": "positive", "type": "CONDITIONING", "link": 8},
        {"name": "negative", "type": "CONDITIONING", "link": 10},
        {"name": "latent_image", "type": "LATENT", "link": 11}
      ],
      "outputs": [{"name": "LATENT", "type": "LATENT", "links": [12], "slot_index": 0}],
      "widgets_values": [87462831, "randomize", 26, 6.0, "euler_ancestral", "karras", 1.0]
    },
    {
      "id": 7,
      "type": "EmptyLatentImage",
      "pos": [1120, 440],
      "size": [315, 106],
      "inputs": [],
      "outputs": [{"name": "LATENT", "type": "LATENT", "links": [11], "slot_index": 0}],
      "widgets_values": [832, 1216, 1]
    },
    {
      "id": 8,
      "type": "VAEDecode",
      "pos": [1920, 100],
      "size": [210, 46],
      "inputs": [
        {"name": "samples", "type": "LATENT", "link": 12},
        {"name": "vae", "type": "VAE", "link": 9}
      ],
      "outputs": [{"name": "IMAGE", "type": "IMAGE", "links": [13], "slot_index": 0}]
    }
  ],
  "links": [
    [1, 1, 0, 2, 0, "MODEL"],
    [2, 1, 1, 2, 1, "CLIP"],
    [3, 2, 0, 3, 0, "MODEL"],
    [4, 2, 1, 3, 1, "CLIP"],
    [5, 3, 0, 6, 0, "MODEL"],
    [6, 3, 1, 4, 0, "CLIP"],
    [7, 3, 1, 5, 0, "CLIP"],
    [8, 4, 0, 6, 1, "CONDITIONING"],
    [9, 1, 2, 8, 1, "VAE"],
    [10, 5, 0, 6, 2, "CONDITIONING"],
    [11, 7, 0, 6, 3, "LATENT"],
    [12, 6, 0, 8, 0, "LATENT"]
  ]
}`,
		},
		{
			Name:                "Ultimate SD Upscale + 4x UltraSharp (2-Stage)",
			Slug:                "ultimate-sd-upscale-4x-ultrasharp-2stage",
			Description:         "Pipeline 2-tahap hires upscale untuk resolusi poster/4K. Menggunakan model AI ESRGAN 4x-UltraSharp dilanjutkan Ultimate SD Upscale tile rendering tanpa OOM VRAM.",
			BaseModel:           "SDXL",
			Category:            "upscale",
			Author:              "Models Guide Team",
			ModelID:             sdxlModelID,
			RequiredCustomNodes: "ComfyUI_UltimateSDUpscale",
			TotalNodes:          8,
			WorkflowJSON: `{
  "last_node_id": 8,
  "last_link_id": 8,
  "nodes": [
    {
      "id": 1,
      "type": "LoadImage",
      "pos": [40, 100],
      "size": [315, 314],
      "inputs": [],
      "outputs": [{"name": "IMAGE", "type": "IMAGE", "links": [1], "slot_index": 0}],
      "widgets_values": ["input_sample.png", "image"]
    },
    {
      "id": 2,
      "type": "UpscaleModelLoader",
      "pos": [40, 460],
      "size": [315, 58],
      "inputs": [],
      "outputs": [{"name": "UPSCALE_MODEL", "type": "UPSCALE_MODEL", "links": [2], "slot_index": 0}],
      "widgets_values": ["4x-UltraSharp.pth"]
    },
    {
      "id": 3,
      "type": "CheckpointLoaderSimple",
      "pos": [400, 100],
      "size": [315, 98],
      "inputs": [],
      "outputs": [
        {"name": "MODEL", "type": "MODEL", "links": [3], "slot_index": 0},
        {"name": "CLIP", "type": "CLIP", "links": [4, 5], "slot_index": 1},
        {"name": "VAE", "type": "VAE", "links": [6], "slot_index": 2}
      ],
      "widgets_values": ["sd_xl_base_1.0.safetensors"]
    },
    {
      "id": 4,
      "type": "CLIPTextEncode",
      "pos": [760, 40],
      "size": [380, 140],
      "inputs": [{"name": "clip", "type": "CLIP", "link": 4}],
      "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [7], "slot_index": 0}],
      "title": "Positive Reinforcement",
      "widgets_values": ["masterpiece, highly detailed, sharp focus, 8k resolution, raw photo quality"]
    },
    {
      "id": 5,
      "type": "CLIPTextEncode",
      "pos": [760, 220],
      "size": [380, 140],
      "inputs": [{"name": "clip", "type": "CLIP", "link": 5}],
      "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [8], "slot_index": 0}],
      "title": "Negative Denoise Guard",
      "widgets_values": ["blurry, noisy, artifacts, cartoonish, low resolution, oversharpened"]
    },
    {
      "id": 6,
      "type": "UltimateSDUpscale",
      "pos": [1200, 100],
      "size": [360, 420],
      "inputs": [
        {"name": "image", "type": "IMAGE", "link": 1},
        {"name": "model", "type": "MODEL", "link": 3},
        {"name": "positive", "type": "CONDITIONING", "link": 7},
        {"name": "negative", "type": "CONDITIONING", "link": 8},
        {"name": "vae", "type": "VAE", "link": 6},
        {"name": "upscale_model", "type": "UPSCALE_MODEL", "link": 2}
      ],
      "outputs": [{"name": "IMAGE", "type": "IMAGE", "links": [9], "slot_index": 0}],
      "widgets_values": [2.0, 1024, 1024, 64, 8, "Linear", "Chess", 0.35, "dpmpp_2m_sde", "karras", 18]
    },
    {
      "id": 7,
      "type": "SaveImage",
      "pos": [1620, 100],
      "size": [340, 380],
      "inputs": [{"name": "images", "type": "IMAGE", "link": 9}],
      "outputs": [],
      "widgets_values": ["Upscale_Result_4K"]
    }
  ],
  "links": [
    [1, 1, 0, 6, 0, "IMAGE"],
    [2, 2, 0, 6, 5, "UPSCALE_MODEL"],
    [3, 3, 0, 6, 1, "MODEL"],
    [4, 3, 1, 4, 0, "CLIP"],
    [5, 3, 1, 5, 0, "CLIP"],
    [6, 3, 2, 6, 4, "VAE"],
    [7, 4, 0, 6, 2, "CONDITIONING"],
    [8, 5, 0, 6, 3, "CONDITIONING"],
    [9, 6, 0, 7, 0, "IMAGE"]
  ]
}`,
		},
		{
			Name:                "Flux.1 Schnell / Dev Direct Inference",
			Slug:                "flux-1-schnell-dev-direct-inference",
			Description:         "Workflow generasi cepat untuk arsitektur Flux.1 (Schnell / Dev) menggunakan DualCLIPLoader (CLIP L + T5XXL) dan FluxGuidance.",
			BaseModel:           "Flux",
			Category:            "txt2img",
			Author:              "Models Guide Team",
			RequiredCustomNodes: "Built-in (ComfyUI native Flux support)",
			TotalNodes:          8,
			WorkflowJSON: `{
  "last_node_id": 9,
  "last_link_id": 10,
  "nodes": [
    {
      "id": 1,
      "type": "UNETLoader",
      "pos": [40, 80],
      "size": [315, 82],
      "inputs": [],
      "outputs": [{"name": "MODEL", "type": "MODEL", "links": [1], "slot_index": 0}],
      "widgets_values": ["flux1-schnell.safetensors", "default"]
    },
    {
      "id": 2,
      "type": "DualCLIPLoader",
      "pos": [40, 200],
      "size": [315, 106],
      "inputs": [],
      "outputs": [{"name": "CLIP", "type": "CLIP", "links": [2], "slot_index": 0}],
      "widgets_values": ["t5xxl_fp16.safetensors", "clip_l.safetensors", "flux"]
    },
    {
      "id": 3,
      "type": "VAELoader",
      "pos": [40, 350],
      "size": [315, 58],
      "inputs": [],
      "outputs": [{"name": "VAE", "type": "VAE", "links": [7], "slot_index": 0}],
      "widgets_values": ["ae.safetensors"]
    },
    {
      "id": 4,
      "type": "CLIPTextEncode",
      "pos": [400, 100],
      "size": [420, 180],
      "inputs": [{"name": "clip", "type": "CLIP", "link": 2}],
      "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [3], "slot_index": 0}],
      "title": "Flux Prompt",
      "widgets_values": ["A serene Japanese mountain shrine at dusk, lanterns softly glowing, misty pines, hyperdetailed photography, 35mm lens"]
    },
    {
      "id": 5,
      "type": "FluxGuidance",
      "pos": [860, 100],
      "size": [220, 58],
      "inputs": [{"name": "conditioning", "type": "CONDITIONING", "link": 3}],
      "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [4], "slot_index": 0}],
      "widgets_values": [3.5]
    },
    {
      "id": 6,
      "type": "EmptySD3LatentImage",
      "pos": [860, 200],
      "size": [315, 106],
      "inputs": [],
      "outputs": [{"name": "LATENT", "type": "LATENT", "links": [5], "slot_index": 0}],
      "widgets_values": [1024, 1024, 1]
    },
    {
      "id": 7,
      "type": "KSamplerSelect",
      "pos": [860, 350],
      "size": [260, 58],
      "inputs": [],
      "outputs": [{"name": "SAMPLER", "type": "SAMPLER", "links": [6], "slot_index": 0}],
      "widgets_values": ["euler"]
    },
    {
      "id": 8,
      "type": "SamplerCustomAdvanced",
      "pos": [1220, 100],
      "size": [330, 290],
      "inputs": [
        {"name": "noise", "type": "NOISE", "link": 0},
        {"name": "guider", "type": "GUIDER", "link": 0},
        {"name": "sampler", "type": "SAMPLER", "link": 6},
        {"name": "sigmas", "type": "SIGMAS", "link": 0},
        {"name": "latent_image", "type": "LATENT", "link": 5}
      ],
      "outputs": [{"name": "output", "type": "LATENT", "links": [8], "slot_index": 0}]
    },
    {
      "id": 9,
      "type": "VAEDecode",
      "pos": [1600, 100],
      "size": [210, 46],
      "inputs": [
        {"name": "samples", "type": "LATENT", "link": 8},
        {"name": "vae", "type": "VAE", "link": 7}
      ],
      "outputs": [{"name": "IMAGE", "type": "IMAGE", "links": [9], "slot_index": 0}]
    }
  ],
  "links": [
    [1, 1, 0, 8, 0, "MODEL"],
    [2, 2, 0, 4, 0, "CLIP"],
    [3, 4, 0, 5, 0, "CONDITIONING"],
    [4, 5, 0, 8, 1, "CONDITIONING"],
    [5, 6, 0, 8, 4, "LATENT"],
    [6, 7, 0, 8, 2, "SAMPLER"],
    [7, 3, 0, 9, 1, "VAE"],
    [8, 8, 0, 9, 0, "LATENT"]
  ]
}`,
		},
	}

	for _, w := range workflows {
		if err := db.Create(&w).Error; err != nil {
			log.Printf("Failed to seed workflow %s: %v\n", w.Name, err)
		}
	}

	log.Printf("Successfully seeded %d ComfyUI workflows\n", len(workflows))
	return nil
}
