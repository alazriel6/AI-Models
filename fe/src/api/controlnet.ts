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

import { BUILTIN_CONTROLNET_POSES } from "../data/controlnetPosesData";

// Built-in fallback poses (120+ poses supporting solo & duo / couples)
export const FALLBACK_POSES: ControlNetPose[] = BUILTIN_CONTROLNET_POSES;

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

