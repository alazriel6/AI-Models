import { apiFetch } from "./client";
import { USER_COMFY_WORKFLOW_JSON } from "./presets/userComfyWorkflow";

export interface ComfyWorkflow {
  id: number;
  name: string;
  slug: string;
  description: string;
  base_model: string;
  category: string;
  workflow_json: string;
  model_id?: number;
  model?: {
    id: number;
    name: string;
    slug: string;
    type: string;
    base_model: string;
    thumbnail_url?: string;
  };
  author?: string;
  required_custom_nodes?: string;
  thumbnail_url?: string;
  total_nodes: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateWorkflowPayload {
  name: string;
  slug?: string;
  description?: string;
  base_model?: string;
  category?: string;
  workflow_json: string;
  model_id?: number;
  author?: string;
  required_custom_nodes?: string;
  thumbnail_url?: string;
}

export interface WorkflowCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export const FALLBACK_CATEGORIES: WorkflowCategory[] = [
  { id: 1, name: "Text to Image", slug: "txt2img", description: "Generasi dari prompt", icon: "", color: "#2563eb", sort_order: 1 },
  { id: 2, name: "Image to Image", slug: "img2img", description: "Transformasi gambar", icon: "", color: "#2563eb", sort_order: 2 },
  { id: 3, name: "Face & Detailer", slug: "detailer", description: "Impact Pack FaceDetailer", icon: "", color: "#2563eb", sort_order: 3 },
  { id: 4, name: "Upscaling & Hi-Res", slug: "upscale", description: "Perbesar resolusi", icon: "", color: "#2563eb", sort_order: 4 },
  { id: 5, name: "LoRA Stacking", slug: "lora_stack", description: "Kombinasi LoRA", icon: "", color: "#2563eb", sort_order: 5 },
  { id: 6, name: "Inpainting", slug: "inpaint", description: "Edit area mask", icon: "", color: "#2563eb", sort_order: 6 },
  { id: 7, name: "ControlNet", slug: "controlnet", description: "Kontrol pose & lineart", icon: "", color: "#2563eb", sort_order: 7 },
  { id: 8, name: "Animation", slug: "animation", description: "AnimateDiff & Video", icon: "", color: "#2563eb", sort_order: 8 }
];

// Fallback curated workflows in case backend is offline
export const FALLBACK_WORKFLOWS: ComfyWorkflow[] = [
  {
    id: 100,
    name: "Rio Tsukatsuki Illustrious XL + FaceDetailer (ComfyUI Local Active)",
    slug: "rio-tsukatsuki-illustrious-xl-facedetailer",
    description: "Workflow otentik langsung dari instalasi ComfyUI lokal (127.0.0.1:8188) dengan 5 Grup terorganisir (Load Model, Prompt, Sampling, Image Size, Decode & Save), LoRA Rio Tsukatsuki, CLIP Set Last Layer -2, dan Impact Pack FaceDetailer.",
    base_model: "Illustrious",
    category: "detailer",
    author: "Local ComfyUI User",
    required_custom_nodes: "ComfyUI-Impact-Pack, ComfyUI-Custom-Scripts",
    total_nodes: 19,
    workflow_json: USER_COMFY_WORKFLOW_JSON
  },
  {
    id: 1,
    name: "SDXL Standard Txt2Img Baseline",
    slug: "sdxl-standard-txt2img-baseline",
    description: "Workflow dasar optimal untuk model SDXL dengan resolusi 1024x1024, KSampler DPM++ 2M Karras, dan VAE Decode langsung.",
    base_model: "SDXL",
    category: "txt2img",
    author: "Models Guide Team",
    required_custom_nodes: "Built-in (No Custom Nodes Required)",
    total_nodes: 7,
    workflow_json: JSON.stringify({
      last_node_id: 9,
      last_link_id: 9,
      nodes: [
        {
          id: 4,
          type: "CheckpointLoaderSimple",
          pos: [40, 100],
          size: [315, 98],
          inputs: [],
          outputs: [
            { name: "MODEL", type: "MODEL", links: [1], slot_index: 0 },
            { name: "CLIP", type: "CLIP", links: [3, 5], slot_index: 1 },
            { name: "VAE", type: "VAE", links: [8], slot_index: 2 }
          ],
          widgets_values: ["sd_xl_base_1.0.safetensors"]
        },
        {
          id: 6,
          type: "CLIPTextEncode",
          pos: [420, 40],
          size: [425, 180],
          inputs: [{ name: "clip", type: "CLIP", link: 3 }],
          outputs: [{ name: "CONDITIONING", type: "CONDITIONING", links: [4], slot_index: 0 }],
          title: "Positive Prompt (SDXL)",
          widgets_values: ["cinematic photo, detailed portrait of cyberpunk girl with neon visor, masterpiece, dramatic ambient lighting, high sharpness 8k"]
        },
        {
          id: 7,
          type: "CLIPTextEncode",
          pos: [420, 260],
          size: [425, 180],
          inputs: [{ name: "clip", type: "CLIP", link: 5 }],
          outputs: [{ name: "CONDITIONING", type: "CONDITIONING", links: [6], slot_index: 0 }],
          title: "Negative Prompt",
          widgets_values: ["low quality, bad quality, worst quality, blurry, deformed, extra fingers, cartoon, 3d"]
        },
        {
          id: 5,
          type: "EmptyLatentImage",
          pos: [500, 480],
          size: [315, 106],
          inputs: [],
          outputs: [{ name: "LATENT", type: "LATENT", links: [2], slot_index: 0 }],
          widgets_values: [1024, 1024, 1]
        },
        {
          id: 3,
          type: "KSampler",
          pos: [920, 100],
          size: [315, 262],
          inputs: [
            { name: "model", type: "MODEL", link: 1 },
            { name: "positive", type: "CONDITIONING", link: 4 },
            { name: "negative", type: "CONDITIONING", link: 6 },
            { name: "latent_image", type: "LATENT", link: 2 }
          ],
          outputs: [{ name: "LATENT", type: "LATENT", links: [7], slot_index: 0 }],
          widgets_values: [1844674407370955, "randomize", 28, 6.0, "dpmpp_2m", "karras", 1.0]
        },
        {
          id: 8,
          type: "VAEDecode",
          pos: [1280, 100],
          size: [210, 46],
          inputs: [
            { name: "samples", type: "LATENT", link: 7 },
            { name: "vae", type: "VAE", link: 8 }
          ],
          outputs: [{ name: "IMAGE", type: "IMAGE", links: [9], slot_index: 0 }]
        },
        {
          id: 9,
          type: "SaveImage",
          pos: [1540, 100],
          size: [320, 360],
          inputs: [{ name: "images", type: "IMAGE", link: 9 }],
          outputs: [],
          widgets_values: ["SDXL_Output"]
        }
      ],
      links: [
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
    })
  },
  {
    id: 2,
    name: "Illustrious XL Anime Txt2Img + ADetailer",
    slug: "illustrious-xl-anime-txt2img-adetailer",
    description: "Workflow anime modern khusus arsitektur Illustrious XL, dilengkapi Face Detailer (Impact Pack) untuk memastikan mata dan ekspresi wajah tajam.",
    base_model: "Illustrious",
    category: "detailer",
    author: "Models Guide Team",
    required_custom_nodes: "ComfyUI-Impact-Pack",
    total_nodes: 9,
    workflow_json: JSON.stringify({
      last_node_id: 12,
      last_link_id: 13,
      nodes: [
        {
          id: 1,
          type: "CheckpointLoaderSimple",
          pos: [40, 80],
          size: [315, 98],
          inputs: [],
          outputs: [
            { name: "MODEL", type: "MODEL", links: [1, 10], slot_index: 0 },
            { name: "CLIP", type: "CLIP", links: [2, 3], slot_index: 1 },
            { name: "VAE", type: "VAE", links: [7, 11], slot_index: 2 }
          ],
          widgets_values: ["animagineXLV31_v31.safetensors"]
        },
        {
          id: 2,
          type: "CLIPTextEncode",
          pos: [400, 40],
          size: [420, 160],
          inputs: [{ name: "clip", type: "CLIP", link: 2 }],
          outputs: [{ name: "CONDITIONING", type: "CONDITIONING", links: [4], slot_index: 0 }],
          title: "Positive Anime Prompt",
          widgets_values: ["masterpiece, best quality, 1girl, solo, silver hair, blue eyes, high school uniform, sakura petals, dynamic angle, beautiful detailed eyes"]
        },
        {
          id: 3,
          type: "CLIPTextEncode",
          pos: [400, 240],
          size: [420, 160],
          inputs: [{ name: "clip", type: "CLIP", link: 3 }],
          outputs: [{ name: "CONDITIONING", type: "CONDITIONING", links: [5], slot_index: 0 }],
          title: "Negative Prompt",
          widgets_values: ["worst quality, low quality, bad anatomy, deformed hands, extra fingers, text, watermark"]
        },
        {
          id: 4,
          type: "EmptyLatentImage",
          pos: [400, 440],
          size: [315, 106],
          inputs: [],
          outputs: [{ name: "LATENT", type: "LATENT", links: [6], slot_index: 0 }],
          widgets_values: [896, 1152, 1]
        },
        {
          id: 5,
          type: "KSampler",
          pos: [880, 80],
          size: [315, 262],
          inputs: [
            { name: "model", type: "MODEL", link: 1 },
            { name: "positive", type: "CONDITIONING", link: 4 },
            { name: "negative", type: "CONDITIONING", link: 5 },
            { name: "latent_image", type: "LATENT", link: 6 }
          ],
          outputs: [{ name: "LATENT", type: "LATENT", links: [8], slot_index: 0 }],
          widgets_values: [123456789, "randomize", 28, 5.5, "euler_ancestral", "karras", 1.0]
        },
        {
          id: 6,
          type: "VAEDecode",
          pos: [1240, 80],
          size: [210, 46],
          inputs: [
            { name: "samples", type: "LATENT", link: 8 },
            { name: "vae", type: "VAE", link: 7 }
          ],
          outputs: [{ name: "IMAGE", type: "IMAGE", links: [9], slot_index: 0 }]
        },
        {
          id: 10,
          type: "UltralyticsDetectorProvider",
          pos: [1160, 360],
          size: [280, 80],
          inputs: [],
          outputs: [{ name: "BBOX_DETECTOR", type: "BBOX_DETECTOR", links: [12], slot_index: 0 }],
          widgets_values: ["bbox/face_yolov8m.pt"]
        },
        {
          id: 11,
          type: "FaceDetailer",
          pos: [1520, 80],
          size: [320, 380],
          inputs: [
            { name: "image", type: "IMAGE", link: 9 },
            { name: "model", type: "MODEL", link: 10 },
            { name: "clip", type: "CLIP", link: 2 },
            { name: "vae", type: "VAE", link: 11 },
            { name: "bbox_detector", type: "BBOX_DETECTOR", link: 12 }
          ],
          outputs: [{ name: "image", type: "IMAGE", links: [13], slot_index: 0 }],
          widgets_values: [384, 0.5, 20, 5.0, "euler_a", "normal", 0.35]
        },
        {
          id: 12,
          type: "SaveImage",
          pos: [1900, 80],
          size: [340, 380],
          inputs: [{ name: "images", type: "IMAGE", link: 13 }],
          outputs: [],
          widgets_values: ["Illustrious_ADetailer"]
        }
      ],
      links: [
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
    })
  },
  {
    id: 3,
    name: "Pony V6 Multi-LoRA Stacking Pipeline",
    slug: "pony-v6-multi-lora-stacking-pipeline",
    description: "Workflow spesialis Pony Diffusion dengan 2-slot LoRA loader (Character + Style LoRA) serta CLIP negative embedding optimal.",
    base_model: "Pony",
    category: "lora_stack",
    author: "Models Guide Team",
    required_custom_nodes: "Built-in (No Custom Nodes Required)",
    total_nodes: 8,
    workflow_json: JSON.stringify({
      last_node_id: 10,
      last_link_id: 12,
      nodes: [
        {
          id: 1,
          type: "CheckpointLoaderSimple",
          pos: [40, 100],
          size: [315, 98],
          inputs: [],
          outputs: [
            { name: "MODEL", type: "MODEL", links: [1], slot_index: 0 },
            { name: "CLIP", type: "CLIP", links: [2], slot_index: 1 },
            { name: "VAE", type: "VAE", links: [9], slot_index: 2 }
          ],
          widgets_values: ["ponyDiffusionV6XL_v6StartWithThisOne.safetensors"]
        },
        {
          id: 2,
          type: "LoraLoader",
          pos: [400, 100],
          size: [315, 126],
          inputs: [
            { name: "model", type: "MODEL", link: 1 },
            { name: "clip", type: "CLIP", link: 2 }
          ],
          outputs: [
            { name: "MODEL", type: "MODEL", links: [3], slot_index: 0 },
            { name: "CLIP", type: "CLIP", links: [4], slot_index: 1 }
          ],
          title: "LoRA 1 (Character)",
          widgets_values: ["character_lora.safetensors", 0.85, 0.85]
        },
        {
          id: 3,
          type: "LoraLoader",
          pos: [760, 100],
          size: [315, 126],
          inputs: [
            { name: "model", type: "MODEL", link: 3 },
            { name: "clip", type: "CLIP", link: 4 }
          ],
          outputs: [
            { name: "MODEL", type: "MODEL", links: [5], slot_index: 0 },
            { name: "CLIP", type: "CLIP", links: [6, 7], slot_index: 1 }
          ],
          title: "LoRA 2 (Aesthetic Style)",
          widgets_values: ["aesthetic_style.safetensors", 0.60, 0.60]
        },
        {
          id: 4,
          type: "CLIPTextEncode",
          pos: [1120, 40],
          size: [400, 160],
          inputs: [{ name: "clip", type: "CLIP", link: 6 }],
          outputs: [{ name: "CONDITIONING", type: "CONDITIONING", links: [8], slot_index: 0 }],
          title: "Positive Prompt (score_9, score_8_up)",
          widgets_values: ["score_9, score_8_up, score_7_up, source_anime, 1girl, vibrant sunset sky, dramatic wind, beautiful scenery"]
        },
        {
          id: 5,
          type: "CLIPTextEncode",
          pos: [1120, 240],
          size: [400, 160],
          inputs: [{ name: "clip", type: "CLIP", link: 7 }],
          outputs: [{ name: "CONDITIONING", type: "CONDITIONING", links: [10], slot_index: 0 }],
          title: "Negative Prompt (score_4, score_5)",
          widgets_values: ["score_4, score_5, score_6, ugly, deformed, blurry, bad anatomy, text, watermark"]
        },
        {
          id: 6,
          type: "KSampler",
          pos: [1560, 100],
          size: [315, 262],
          inputs: [
            { name: "model", type: "MODEL", link: 5 },
            { name: "positive", type: "CONDITIONING", link: 8 },
            { name: "negative", type: "CONDITIONING", link: 10 },
            { name: "latent_image", type: "LATENT", link: 11 }
          ],
          outputs: [{ name: "LATENT", type: "LATENT", links: [12], slot_index: 0 }],
          widgets_values: [87462831, "randomize", 26, 6.0, "euler_ancestral", "karras", 1.0]
        },
        {
          id: 7,
          type: "EmptyLatentImage",
          pos: [1120, 440],
          size: [315, 106],
          inputs: [],
          outputs: [{ name: "LATENT", type: "LATENT", links: [11], slot_index: 0 }],
          widgets_values: [832, 1216, 1]
        },
        {
          id: 8,
          type: "VAEDecode",
          pos: [1920, 100],
          size: [210, 46],
          inputs: [
            { name: "samples", type: "LATENT", link: 12 },
            { name: "vae", type: "VAE", link: 9 }
          ],
          outputs: [{ name: "IMAGE", type: "IMAGE", links: [13], slot_index: 0 }]
        }
      ],
      links: [
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
    })
  },
  {
    id: 4,
    name: "Ultimate SD Upscale + 4x UltraSharp (2-Stage)",
    slug: "ultimate-sd-upscale-4x-ultrasharp-2stage",
    description: "Pipeline 2-tahap hires upscale untuk resolusi 4K. Menggunakan model AI ESRGAN 4x-UltraSharp dilanjutkan Ultimate SD Upscale tile rendering tanpa OOM.",
    base_model: "SDXL",
    category: "upscale",
    author: "Models Guide Team",
    required_custom_nodes: "ComfyUI_UltimateSDUpscale",
    total_nodes: 7,
    workflow_json: JSON.stringify({
      last_node_id: 8,
      last_link_id: 9,
      nodes: [
        {
          id: 1,
          type: "LoadImage",
          pos: [40, 100],
          size: [315, 314],
          inputs: [],
          outputs: [{ name: "IMAGE", type: "IMAGE", links: [1], slot_index: 0 }],
          widgets_values: ["input_sample.png", "image"]
        },
        {
          id: 2,
          type: "UpscaleModelLoader",
          pos: [40, 460],
          size: [315, 58],
          inputs: [],
          outputs: [{ name: "UPSCALE_MODEL", type: "UPSCALE_MODEL", links: [2], slot_index: 0 }],
          widgets_values: ["4x-UltraSharp.pth"]
        },
        {
          id: 3,
          type: "CheckpointLoaderSimple",
          pos: [400, 100],
          size: [315, 98],
          inputs: [],
          outputs: [
            { name: "MODEL", type: "MODEL", links: [3], slot_index: 0 },
            { name: "CLIP", type: "CLIP", links: [4, 5], slot_index: 1 },
            { name: "VAE", type: "VAE", links: [6], slot_index: 2 }
          ],
          widgets_values: ["sd_xl_base_1.0.safetensors"]
        },
        {
          id: 4,
          type: "CLIPTextEncode",
          pos: [760, 40],
          size: [380, 140],
          inputs: [{ name: "clip", type: "CLIP", link: 4 }],
          outputs: [{ name: "CONDITIONING", type: "CONDITIONING", links: [7], slot_index: 0 }],
          title: "Positive Reinforcement",
          widgets_values: ["masterpiece, highly detailed, sharp focus, 8k resolution, raw photo quality"]
        },
        {
          id: 5,
          type: "CLIPTextEncode",
          pos: [760, 220],
          size: [380, 140],
          inputs: [{ name: "clip", type: "CLIP", link: 5 }],
          outputs: [{ name: "CONDITIONING", type: "CONDITIONING", links: [8], slot_index: 0 }],
          title: "Negative Denoise Guard",
          widgets_values: ["blurry, noisy, artifacts, cartoonish, low resolution, oversharpened"]
        },
        {
          id: 6,
          type: "UltimateSDUpscale",
          pos: [1200, 100],
          size: [360, 420],
          inputs: [
            { name: "image", type: "IMAGE", link: 1 },
            { name: "model", type: "MODEL", link: 3 },
            { name: "positive", type: "CONDITIONING", link: 7 },
            { name: "negative", type: "CONDITIONING", link: 8 },
            { name: "vae", type: "VAE", link: 6 },
            { name: "upscale_model", type: "UPSCALE_MODEL", link: 2 }
          ],
          outputs: [{ name: "IMAGE", type: "IMAGE", links: [9], slot_index: 0 }],
          widgets_values: [2.0, 1024, 1024, 64, 8, "Linear", "Chess", 0.35, "dpmpp_2m_sde", "karras", 18]
        },
        {
          id: 7,
          type: "SaveImage",
          pos: [1620, 100],
          size: [340, 380],
          inputs: [{ name: "images", type: "IMAGE", link: 9 }],
          outputs: [],
          widgets_values: ["Upscale_Result_4K"]
        }
      ],
      links: [
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
    })
  }
];

export async function getWorkflowsApi(params?: {
  base_model?: string;
  category?: string;
  search?: string;
  model_id?: number;
}): Promise<ComfyWorkflow[]> {
  try {
    const query = new URLSearchParams();
    if (params?.base_model && params.base_model !== "all") query.set("base_model", params.base_model);
    if (params?.category && params.category !== "all") query.set("category", params.category);
    if (params?.search) query.set("search", params.search);
    if (params?.model_id) query.set("model_id", String(params.model_id));

    const qs = query.toString();
    const res = await apiFetch<{ data: ComfyWorkflow[] }>(`/workflows${qs ? `?${qs}` : ""}`);
    if (res.data !== undefined && Array.isArray(res.data)) {
      if (res.data.length > 0) {
        return res.data;
      }
      return [];
    }
    return filterFallback(FALLBACK_WORKFLOWS, params);
  } catch {
    return filterFallback(FALLBACK_WORKFLOWS, params);
  }
}

export async function getWorkflowApi(idOrSlug: string | number): Promise<ComfyWorkflow | null> {
  try {
    const res = await apiFetch<{ data: ComfyWorkflow }>(`/workflows/${idOrSlug}`);
    return res.data || null;
  } catch {
    const found = FALLBACK_WORKFLOWS.find(
      (w) => String(w.id) === String(idOrSlug) || w.slug === String(idOrSlug)
    );
    return found || null;
  }
}

export async function createWorkflowApi(payload: CreateWorkflowPayload): Promise<ComfyWorkflow> {
  const res = await apiFetch<{ data: ComfyWorkflow }>("/workflows", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return res.data;
}

export async function updateWorkflowApi(id: number, payload: Partial<CreateWorkflowPayload>): Promise<ComfyWorkflow> {
  const res = await apiFetch<{ data: ComfyWorkflow }>(`/workflows/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  return res.data;
}

export async function deleteWorkflowApi(id: number): Promise<void> {
  await apiFetch(`/workflows/${id}`, { method: "DELETE" });
}

// Workflow Category CRUD APIs
export async function getWorkflowCategoriesApi(): Promise<WorkflowCategory[]> {
  try {
    const res = await apiFetch<WorkflowCategory[]>("/workflow-categories");
    return Array.isArray(res) ? res : FALLBACK_CATEGORIES;
  } catch {
    return FALLBACK_CATEGORIES;
  }
}

export async function createWorkflowCategoryApi(payload: Partial<WorkflowCategory>): Promise<WorkflowCategory> {
  const res = await apiFetch<WorkflowCategory>("/workflow-categories", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return res;
}

export async function updateWorkflowCategoryApi(id: number, payload: Partial<WorkflowCategory>): Promise<WorkflowCategory> {
  const res = await apiFetch<WorkflowCategory>(`/workflow-categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  return res;
}

export async function deleteWorkflowCategoryApi(id: number): Promise<void> {
  await apiFetch(`/workflow-categories/${id}`, { method: "DELETE" });
}

// Fetch distinct Base Models from the models table
export async function getBaseModelsApi(): Promise<string[]> {
  try {
    const res = await apiFetch<string[]>("/models/base-models");
    if (Array.isArray(res) && res.length > 0) {
      return res;
    }
  } catch {
    // fallback if endpoint offline
  }
  return ["SD 1.5", "SDXL", "Illustrious", "Pony", "Flux.1", "Hunyuan Video", "Wan2.1"];
}

function filterFallback(
  items: ComfyWorkflow[],
  params?: { base_model?: string; category?: string; search?: string; model_id?: number }
): ComfyWorkflow[] {
  return items.filter((item) => {
    if (params?.base_model && params.base_model.toLowerCase() !== "all") {
      if (item.base_model.toLowerCase() !== params.base_model.toLowerCase()) return false;
    }
    if (params?.category && params.category.toLowerCase() !== "all") {
      if (item.category.toLowerCase() !== params.category.toLowerCase()) return false;
    }
    if (params?.model_id && item.model_id !== params.model_id) {
      return false;
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchBase = item.base_model.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchBase) return false;
    }
    return true;
  });
}
