import { apiGet, apiPost, apiPut, apiDelete } from "./client";

export interface ControlNetPose {
  id: number;
  title: string;
  category: string;
  tags: string;
  description: string;
  recommended_prompt: string;
  keypoints_data: string; // JSON array of [x, y, confidence]
  canvas_width: number;
  canvas_height: number;
  is_system: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePosePayload {
  title: string;
  category?: string;
  tags?: string;
  description?: string;
  recommended_prompt?: string;
  keypoints_data: string;
  canvas_width?: number;
  canvas_height?: number;
  is_system?: boolean;
}

export interface UpdatePosePayload {
  title?: string;
  category?: string;
  tags?: string;
  description?: string;
  recommended_prompt?: string;
  keypoints_data?: string;
  canvas_width?: number;
  canvas_height?: number;
}

// Built-in fallback poses if offline or backend unavailable
export const FALLBACK_POSES: ControlNetPose[] = [
  {
    id: 1,
    title: "Classic Model Standing Walk",
    category: "Standing & Model",
    tags: "fashion, standing, full body, runway, confident",
    description: "Pose berdiri elegan dengan satu kaki sedikit maju dan tangan santai di samping pinggul. Sangat ideal untuk showcase busana karakter anime maupun fotorealistik.",
    recommended_prompt: "1girl, solo, fashion model, high fashion runway dress, confident expression, full body shot, detailed fabric texture, soft studio lighting",
    canvas_width: 512,
    canvas_height: 768,
    is_system: true,
    keypoints_data: JSON.stringify([
      [256, 110, 1.0], [256, 160, 1.0], [215, 165, 1.0], [195, 260, 1.0], [185, 360, 1.0],
      [297, 165, 1.0], [315, 260, 1.0], [320, 355, 1.0], [230, 360, 1.0], [225, 510, 1.0],
      [220, 680, 1.0], [282, 360, 1.0], [295, 515, 1.0], [305, 685, 1.0], [248, 100, 1.0],
      [264, 100, 1.0], [235, 108, 1.0], [277, 108, 1.0]
    ])
  },
  {
    id: 2,
    title: "Confident Hands on Hips",
    category: "Standing & Model",
    tags: "confident, heroic, hands on hips, standing, attitude",
    description: "Pose percaya diri dengan kedua tangan bertolak pinggang. Cocok untuk karakter tsundere, pemimpin skuad, atau hero pose.",
    recommended_prompt: "1girl, solo, standing, hands on hips, smug grin, looking at viewer, school uniform, wind blowing hair, anime aesthetic",
    canvas_width: 512,
    canvas_height: 768,
    is_system: true,
    keypoints_data: JSON.stringify([
      [256, 120, 1.0], [256, 165, 1.0], [210, 175, 1.0], [160, 260, 1.0], [215, 345, 1.0],
      [302, 175, 1.0], [352, 260, 1.0], [297, 345, 1.0], [225, 355, 1.0], [215, 510, 1.0],
      [205, 680, 1.0], [287, 355, 1.0], [297, 510, 1.0], [307, 680, 1.0], [247, 110, 1.0],
      [265, 110, 1.0], [235, 118, 1.0], [277, 118, 1.0]
    ])
  },
  {
    id: 3,
    title: "Dynamic Anime High Kick",
    category: "Action & Combat",
    tags: "martial arts, action, high kick, combat, dynamic angle",
    description: "Pose tendangan tinggi akrobatik dengan sudut dinamis. Bagus untuk pertarungan seni bela diri, cyberpunk fighting, atau magical girl.",
    recommended_prompt: "1girl, solo, high kick, action pose, dynamic angle, motion blur, martial artist, torn battle attire, particle sparks, intense eyes",
    canvas_width: 512,
    canvas_height: 768,
    is_system: true,
    keypoints_data: JSON.stringify([
      [310, 230, 1.0], [290, 270, 1.0], [250, 280, 1.0], [205, 340, 1.0], [160, 395, 1.0],
      [330, 260, 1.0], [375, 310, 1.0], [390, 370, 1.0], [250, 420, 1.0], [230, 540, 1.0],
      [215, 680, 1.0], [270, 380, 1.0], [210, 240, 1.0], [130, 120, 1.0], [318, 220, 1.0],
      [326, 228, 1.0], [290, 225, 1.0], [325, 245, 1.0]
    ])
  },
  {
    id: 4,
    title: "Dual Sword Ready Stance",
    category: "Action & Combat",
    tags: "katana, sword, samurai, fighting stance, ready pose",
    description: "Pose kuda-kuda rendah dengan pedang ganda siap menyerang. Menampilkan tegangan tubuh dan kesiapan bertarung.",
    recommended_prompt: "1girl, solo, dual wielding katana, samurai warrior, low fighting stance, glowing blade edge, cherry blossom petals, dramatic night lighting",
    canvas_width: 512,
    canvas_height: 768,
    is_system: true,
    keypoints_data: JSON.stringify([
      [240, 170, 1.0], [248, 220, 1.0], [200, 230, 1.0], [145, 290, 1.0], [180, 210, 1.0],
      [295, 220, 1.0], [350, 280, 1.0], [315, 340, 1.0], [215, 380, 1.0], [160, 480, 1.0],
      [130, 620, 1.0], [285, 390, 1.0], [350, 490, 1.0], [410, 640, 1.0], [232, 162, 1.0],
      [248, 162, 1.0], [218, 172, 1.0], [262, 172, 1.0]
    ])
  },
  {
    id: 6,
    title: "Elegantly Seated Crossed Legs",
    category: "Sitting & Relaxed",
    tags: "sitting, chair, crossed legs, elegant, indoor",
    description: "Pose duduk di kursi dengan kaki menyilang elegan dan tangan santai di paha. Cocok untuk adegan kafe, kantor, atau pesta mewah.",
    recommended_prompt: "1girl, solo, sitting on vintage velvet chair, legs crossed at knee, hand on lap, sophisticated dress, coffee cup on side table, warm cafe interior",
    canvas_width: 512,
    canvas_height: 768,
    is_system: true,
    keypoints_data: JSON.stringify([
      [256, 150, 1.0], [256, 200, 1.0], [205, 210, 1.0], [175, 305, 1.0], [220, 385, 1.0],
      [307, 210, 1.0], [335, 305, 1.0], [290, 385, 1.0], [220, 400, 1.0], [230, 530, 1.0],
      [265, 680, 1.0], [292, 400, 1.0], [250, 510, 1.0], [285, 660, 1.0], [247, 140, 1.0],
      [265, 140, 1.0], [235, 148, 1.0], [277, 148, 1.0]
    ])
  },
  {
    id: 9,
    title: "High-Angle Smartphone Selfie",
    category: "Portrait & Selfie",
    tags: "selfie, high angle, phone, wink, peace sign, modern",
    description: "Pose potret selfie dari sudut atas dengan satu tangan memegang handphone dan satu tangan membuat pose damai atau menyentuh pipi.",
    recommended_prompt: "1girl, solo, selfie, high angle, holding smartphone, wink, peace sign, casual hoodie, bedroom mirror, vibrant colors",
    canvas_width: 512,
    canvas_height: 768,
    is_system: true,
    keypoints_data: JSON.stringify([
      [256, 175, 1.0], [256, 235, 1.0], [195, 260, 1.0], [130, 210, 1.0], [160, 110, 1.0],
      [317, 260, 1.0], [375, 330, 1.0], [330, 240, 1.0], [215, 480, 1.0], [210, 620, 1.0],
      [205, 740, 1.0], [297, 480, 1.0], [300, 620, 1.0], [305, 740, 1.0], [245, 165, 1.0],
      [267, 165, 1.0], [230, 172, 1.0], [282, 172, 1.0]
    ])
  }
];

export async function getControlNetPosesApi(
  category?: string,
  search?: string
): Promise<{ data: ControlNetPose[]; total: number }> {
  try {
    const params = new URLSearchParams();
    if (category && category !== "Semua" && category !== "all") {
      params.append("category", category);
    }
    if (search) {
      params.append("search", search);
    }

    const query = params.toString() ? `?${params.toString()}` : "";
    return await apiGet<{ data: ControlNetPose[]; total: number }>(`/controlnet/poses${query}`);
  } catch (error) {
    console.warn("Failed to fetch ControlNet poses from API, using fallback data:", error);
    let filtered = [...FALLBACK_POSES];
    if (category && category !== "Semua" && category !== "all") {
      filtered = filtered.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p => p.title.toLowerCase().includes(q) || p.tags.toLowerCase().includes(q));
    }
    return { data: filtered, total: filtered.length };
  }
}

export async function getControlNetPoseApi(id: number): Promise<ControlNetPose> {
  return await apiGet<ControlNetPose>(`/controlnet/poses/${id}`);
}

export async function createControlNetPoseApi(payload: CreatePosePayload): Promise<ControlNetPose> {
  return await apiPost<ControlNetPose>("/controlnet/poses", payload);
}

export async function updateControlNetPoseApi(id: number, payload: UpdatePosePayload): Promise<ControlNetPose> {
  return await apiPut<ControlNetPose>(`/controlnet/poses/${id}`, payload);
}

export async function deleteControlNetPoseApi(id: number): Promise<{ message: string }> {
  return await apiDelete<{ message: string }>(`/controlnet/poses/${id}`);
}

// ----------------------------------------------------------------------------
// ControlNet Models API
// ----------------------------------------------------------------------------

export interface ControlNetModelApiItem {
  id: number;
  name: string;
  filename: string;
  base_model: string;
  control_type: string;
  author: string;
  filesize: string;
  vram: string;
  recommended_weight: string;
  recommended_ending_step: string;
  control_mode: string;
  huggingface_url: string;
  description: string;
  comfy_node: string;
  webui_param: string;
  tags: string;
  is_system: boolean;
}

export async function getControlNetModelsApi(
  baseModel?: string,
  controlType?: string,
  search?: string
): Promise<{ data: ControlNetModelApiItem[]; total: number }> {
  const params = new URLSearchParams();
  if (baseModel && baseModel !== "All" && baseModel !== "Semua") {
    params.append("base_model", baseModel);
  }
  if (controlType && controlType !== "All" && controlType !== "Semua") {
    params.append("control_type", controlType);
  }
  if (search) {
    params.append("search", search);
  }

  const query = params.toString() ? `?${params.toString()}` : "";
  return await apiGet<{ data: ControlNetModelApiItem[]; total: number }>(`/controlnet/models${query}`);
}

