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
    id: 5,
    title: "Superhero 3-Point Ground Landing",
    category: "Action & Combat",
    tags: "superhero, landing, ground slam, dynamic, impact",
    description: "Pose pendaratan dramatis satu tangan menghantam lantai, satu lutut bertumpu di tanah. Efek retakan tanah dan kepulan debu sangat dramatis.",
    recommended_prompt: "1girl, solo, 3-point superhero landing, fist to ground, crater impact, dust explosion, cyberpunk armor, glowing accents, cinematic shot",
    canvas_width: 512,
    canvas_height: 768,
    is_system: true,
    keypoints_data: JSON.stringify([
      [260, 310, 1.0], [265, 370, 1.0], [205, 390, 1.0], [160, 460, 1.0], [180, 560, 1.0],
      [325, 375, 1.0], [380, 380, 1.0], [430, 430, 1.0], [240, 500, 1.0], [180, 580, 1.0],
      [210, 670, 1.0], [310, 490, 1.0], [370, 570, 1.0], [430, 680, 1.0], [250, 300, 1.0],
      [268, 300, 1.0], [238, 312, 1.0], [282, 312, 1.0]
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
    id: 7,
    title: "Floor Seated Lotus Pose",
    category: "Sitting & Relaxed",
    tags: "sitting, floor, lotus, meditation, calm, shrine",
    description: "Pose duduk bersila di lantai atau tatami dengan postur tegak menenangkan. Bagus untuk tema miko, biksu, yoga, atau santai di kamar.",
    recommended_prompt: "1girl, solo, lotus position, sitting on tatami floor, shrine maiden miko, peaceful expression, incense smoke, traditional japanese room",
    canvas_width: 512,
    canvas_height: 768,
    is_system: true,
    keypoints_data: JSON.stringify([
      [256, 180, 1.0], [256, 235, 1.0], [200, 245, 1.0], [170, 350, 1.0], [205, 450, 1.0],
      [312, 245, 1.0], [342, 350, 1.0], [307, 450, 1.0], [220, 460, 1.0], [140, 550, 1.0],
      [240, 600, 1.0], [292, 460, 1.0], [372, 550, 1.0], [272, 600, 1.0], [247, 170, 1.0],
      [265, 170, 1.0], [235, 178, 1.0], [277, 178, 1.0]
    ])
  },
  {
    id: 8,
    title: "Walking Away Looking Back",
    category: "Standing & Model",
    tags: "back view, looking back, over shoulder, mysterious, turn",
    description: "Pose berjalan membelakangi kamera namun menolehkan kepala ke arah penonton. Memberikan kesan misterius dan elegan.",
    recommended_prompt: "1girl, solo, from behind, looking back over shoulder, gentle smile, long floating hair, street lamps at dusk, bokeh background",
    canvas_width: 512,
    canvas_height: 768,
    is_system: true,
    keypoints_data: JSON.stringify([
      [215, 125, 1.0], [250, 160, 1.0], [205, 175, 1.0], [190, 270, 1.0], [185, 370, 1.0],
      [295, 175, 1.0], [315, 270, 1.0], [320, 370, 1.0], [225, 375, 1.0], [210, 520, 1.0],
      [200, 680, 1.0], [280, 375, 1.0], [295, 515, 1.0], [310, 675, 1.0], [210, 115, 1.0],
      [225, 118, 1.0], [235, 125, 1.0], [250, 130, 1.0]
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
  },
  {
    id: 10,
    title: "Playful Finger Gun & Wink",
    category: "Portrait & Selfie",
    tags: "finger gun, playful, wink, upper body, cheerful",
    description: "Pose setengah badan yang ceria mengarahkan 'finger gun' ke kamera dengan mata berkedip. Sangat populer untuk karakter anime idol.",
    recommended_prompt: "1girl, solo, upper body, finger gun, wink, cheerful idol outfit, stage confetti, sparkling stage lights, master piece",
    canvas_width: 512,
    canvas_height: 768,
    is_system: true,
    keypoints_data: JSON.stringify([
      [256, 160, 1.0], [256, 215, 1.0], [195, 230, 1.0], [155, 310, 1.0], [180, 400, 1.0],
      [317, 230, 1.0], [370, 260, 1.0], [350, 190, 1.0], [220, 440, 1.0], [215, 590, 1.0],
      [210, 740, 1.0], [292, 440, 1.0], [295, 590, 1.0], [300, 740, 1.0], [245, 150, 1.0],
      [267, 150, 1.0], [230, 158, 1.0], [282, 158, 1.0]
    ])
  },
  {
    id: 11,
    title: "Foreshortened Hand Reach Out",
    category: "Dynamic & Aerial",
    tags: "foreshortening, dynamic, hand reach, camera perspective, dramatic",
    description: "Pose perspektif dramatis dengan satu tangan mengulur ke arah kamera dengan efek 'fisheye' atau 'foreshortening'. Memberikan kesan imersif yang kuat.",
    recommended_prompt: "1girl, solo, reach out hand towards viewer, foreshortening, fisheye perspective, emotional expression, floating ribbons, celestial starry night sky",
    canvas_width: 512,
    canvas_height: 768,
    is_system: true,
    keypoints_data: JSON.stringify([
      [256, 190, 1.0], [256, 250, 1.0], [200, 260, 1.0], [150, 330, 1.0], [130, 420, 1.0],
      [312, 260, 1.0], [310, 360, 1.0], [260, 430, 1.0], [220, 470, 1.0], [200, 590, 1.0],
      [190, 720, 1.0], [292, 470, 1.0], [310, 590, 1.0], [320, 720, 1.0], [245, 180, 1.0],
      [267, 180, 1.0], [230, 188, 1.0], [282, 188, 1.0]
    ])
  },
  {
    id: 12,
    title: "Mid-Air Floating / Weightless Drop",
    category: "Dynamic & Aerial",
    tags: "floating, zero gravity, falling, aerial, weightless, fantasy",
    description: "Pose melayang anggun di udara seolah berada dalam gravitasi nol atau jatuh dari langit. Sempurna untuk tema fantasi, sci-fi, atau underwater.",
    recommended_prompt: "1girl, solo, floating in mid-air, weightless, falling from sky, outstretched arms, dreamy expression, glowing magic circles, clouds below, majestic wind",
    canvas_width: 512,
    canvas_height: 768,
    is_system: true,
    keypoints_data: JSON.stringify([
      [256, 210, 1.0], [256, 270, 1.0], [180, 240, 1.0], [110, 200, 1.0], [60, 160, 1.0],
      [332, 240, 1.0], [400, 200, 1.0], [450, 160, 1.0], [225, 410, 1.0], [170, 520, 1.0],
      [150, 660, 1.0], [287, 410, 1.0], [340, 510, 1.0], [380, 640, 1.0], [247, 200, 1.0],
      [265, 200, 1.0], [235, 208, 1.0], [277, 208, 1.0]
    ])
  },
  {
    id: 13,
    title: "Casual Lean Against Wall",
    category: "Standing & Model",
    tags: "leaning, wall, casual, street style, relaxed stance",
    description: "Pose bersandar santai pada dinding atau tiang dengan satu kaki tertekuk ke belakang. Sangat cocok untuk tema streetwear atau urban fotografi.",
    recommended_prompt: "1girl, solo, leaning against brick wall, one foot propped up, hands in pockets, oversized jacket, street photography, neon city lights, rainy sidewalk",
    canvas_width: 512,
    canvas_height: 768,
    is_system: true,
    keypoints_data: JSON.stringify([
      [235, 140, 1.0], [245, 190, 1.0], [200, 205, 1.0], [185, 290, 1.0], [210, 360, 1.0],
      [290, 200, 1.0], [315, 285, 1.0], [285, 360, 1.0], [230, 380, 1.0], [225, 520, 1.0],
      [220, 680, 1.0], [280, 380, 1.0], [310, 480, 1.0], [275, 560, 1.0], [228, 130, 1.0],
      [244, 130, 1.0], [215, 138, 1.0], [255, 138, 1.0]
    ])
  },
  {
    id: 14,
    title: "Archery Bow Draw & Aim",
    category: "Action & Combat",
    tags: "archery, bow and arrow, aim, focus, kyudo, fantasy",
    description: "Pose memanah tradisional (Kyudo / Elven Archer) dengan tangan kiri menahan busur lurus dan tangan kanan menarik tali busur di samping dagu.",
    recommended_prompt: "1girl, solo, elven archer, drawing greatbow, aiming at target, focused gaze, arrow ready to loose, mythical forest grove, sun rays piercing canopy",
    canvas_width: 512,
    canvas_height: 768,
    is_system: true,
    keypoints_data: JSON.stringify([
      [195, 175, 1.0], [230, 210, 1.0], [255, 220, 1.0], [280, 205, 1.0], [225, 195, 1.0],
      [175, 215, 1.0], [110, 215, 1.0], [55, 215, 1.0], [240, 380, 1.0], [280, 500, 1.0],
      [320, 660, 1.0], [185, 380, 1.0], [150, 500, 1.0], [130, 660, 1.0], [190, 165, 1.0],
      [200, 165, 1.0], [215, 170, 1.0], [225, 170, 1.0]
    ])
  },
  {
    id: 15,
    title: "Floor Recline Overhead View",
    category: "Sitting & Relaxed",
    tags: "lying down, floor, overhead view, recline, relaxed, top down",
    description: "Pose berbaring santai di lantai dilihat dari sudut pandang atas (top-down / bird's-eye view). Rambut tergerai bebas di lantai.",
    recommended_prompt: "1girl, solo, lying on back on wooden floor, view from above, long hair spread out on ground, dreamy look, white sundress, warm afternoon window sunlight",
    canvas_width: 512,
    canvas_height: 768,
    is_system: true,
    keypoints_data: JSON.stringify([
      [256, 180, 1.0], [256, 240, 1.0], [195, 255, 1.0], [150, 310, 1.0], [140, 390, 1.0],
      [317, 255, 1.0], [360, 310, 1.0], [370, 390, 1.0], [220, 420, 1.0], [190, 530, 1.0],
      [180, 650, 1.0], [292, 420, 1.0], [320, 530, 1.0], [330, 650, 1.0], [245, 170, 1.0],
      [267, 170, 1.0], [230, 180, 1.0], [282, 180, 1.0]
    ])
  },
  {
    id: 16,
    title: "Duo Side-by-Side Friendship",
    category: "Duo & Interaction",
    tags: "2girls, multiple girls, duo, friends, shoulder to shoulder",
    description: "Pose dua karakter berdiri berdampingan saling merangkul bahu. Solusi terbaik untuk mengatasi masalah model AI yang sering menggabungkan anatomi 2 orang.",
    recommended_prompt: "2girls, duo, friends, standing side by side, arm around shoulder, smiling warmly, matching casual outfits, outdoor park festival",
    canvas_width: 512,
    canvas_height: 768,
    is_system: true,
    keypoints_data: JSON.stringify([
      [190, 170, 1.0], [190, 220, 1.0], [150, 230, 1.0], [125, 310, 1.0], [120, 400, 1.0],
      [230, 230, 1.0], [260, 240, 1.0], [290, 235, 1.0], [165, 390, 1.0], [160, 520, 1.0],
      [155, 660, 1.0], [215, 390, 1.0], [210, 520, 1.0], [205, 660, 1.0], [182, 160, 1.0],
      [198, 160, 1.0], [172, 168, 1.0], [208, 168, 1.0]
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

