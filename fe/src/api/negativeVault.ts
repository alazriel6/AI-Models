import { apiFetch } from "./client";

export interface NegativePresetItem {
  id: number;
  title: string;
  architecture: "SDXL" | "Pony" | "Illustrious" | "SD 1.5" | "Flux" | "All";
  category: "General" | "Anatomy" | "Photorealism" | "Anime" | "Minimal";
  description: string;
  prompt: string;
  recommended_cfg: string;
  tags: string;
  is_system: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EmbeddingResourceItem {
  id: number;
  name: string;
  filename: string;
  architecture: "SD 1.5" | "SDXL" | "Pony";
  filesize: string;
  description: string;
  a1111_trigger: string;
  comfy_trigger: string;
  download_url: string;
  suppressed_tags: string;
  is_system: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PresetListResponse {
  data: NegativePresetItem[];
  total: number;
}

export interface EmbeddingListResponse {
  data: EmbeddingResourceItem[];
  total: number;
}

export async function getNegativePresetsApi(params?: {
  architecture?: string;
  category?: string;
  search?: string;
}): Promise<NegativePresetItem[]> {
  const query = new URLSearchParams();
  if (params?.architecture && params.architecture !== "all") {
    query.set("architecture", params.architecture);
  }
  if (params?.category && params.category !== "all") {
    query.set("category", params.category);
  }
  if (params?.search) {
    query.set("search", params.search);
  }

  const qs = query.toString();
  const endpoint = `/negative-presets${qs ? `?${qs}` : ""}`;
  const res = await apiFetch<PresetListResponse>(endpoint);
  return res.data || [];
}

export async function createNegativePresetApi(
  preset: Omit<NegativePresetItem, "id" | "created_at" | "updated_at">
): Promise<NegativePresetItem> {
  return await apiFetch<NegativePresetItem>("/negative-presets", {
    method: "POST",
    body: JSON.stringify(preset),
  });
}

export async function updateNegativePresetApi(
  id: number,
  preset: Partial<NegativePresetItem>
): Promise<NegativePresetItem> {
  return await apiFetch<NegativePresetItem>(`/negative-presets/${id}`, {
    method: "PUT",
    body: JSON.stringify(preset),
  });
}

export async function deleteNegativePresetApi(id: number): Promise<{ message: string }> {
  return await apiFetch<{ message: string }>(`/negative-presets/${id}`, {
    method: "DELETE",
  });
}

export async function getEmbeddingsApi(params?: {
  architecture?: string;
  search?: string;
}): Promise<EmbeddingResourceItem[]> {
  const query = new URLSearchParams();
  if (params?.architecture && params.architecture !== "all") {
    query.set("architecture", params.architecture);
  }
  if (params?.search) {
    query.set("search", params.search);
  }

  const qs = query.toString();
  const endpoint = `/embeddings${qs ? `?${qs}` : ""}`;
  const res = await apiFetch<EmbeddingListResponse>(endpoint);
  return res.data || [];
}

export async function createEmbeddingApi(
  embedding: Omit<EmbeddingResourceItem, "id" | "created_at" | "updated_at">
): Promise<EmbeddingResourceItem> {
  return await apiFetch<EmbeddingResourceItem>("/embeddings", {
    method: "POST",
    body: JSON.stringify(embedding),
  });
}

export async function updateEmbeddingApi(
  id: number,
  embedding: Partial<EmbeddingResourceItem>
): Promise<EmbeddingResourceItem> {
  return await apiFetch<EmbeddingResourceItem>(`/embeddings/${id}`, {
    method: "PUT",
    body: JSON.stringify(embedding),
  });
}

export async function deleteEmbeddingApi(id: number): Promise<{ message: string }> {
  return await apiFetch<{ message: string }>(`/embeddings/${id}`, {
    method: "DELETE",
  });
}
