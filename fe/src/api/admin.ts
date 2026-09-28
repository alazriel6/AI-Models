import { apiFetch, API_BASE_URL } from "./client";
import type { Model, Tag, ModelVersion, ModelImage } from "./models";

export interface CreateModelPayload {
    name: string;
    slug?: string;
    type: string;
    base_model: string;
    author?: string;
    description?: string;
    source_url?: string;
    civitai_url?: string;
    huggingface_url?: string;
    thumbnail_url?: string;
    published_at?: string;
    likes?: number;
    rating?: number;
    tensor_size?: string;
    vram_min?: string;
    vram_recommended?: string;
    conditioner?: number;
    first_stage_model?: number;
    model_tensor?: number;
    trigger_words?: string[];
    tags?: string[];
    versions?: Partial<ModelVersion>[];
}

export type UpdateModelPayload = Partial<CreateModelPayload>;

export async function createModelApi(payload: CreateModelPayload): Promise<Model> {
    return apiFetch<Model>("/models", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function updateModelApi(id: number, payload: UpdateModelPayload): Promise<Model> {
    return apiFetch<Model>(`/models/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
}

export async function deleteModelApi(id: number): Promise<{ message?: string; success?: boolean }> {
    return apiFetch<{ message?: string; success?: boolean }>(`/models/${id}`, {
        method: "DELETE",
    });
}

export async function getTagsApi(): Promise<Tag[]> {
    return apiFetch<Tag[]>("/tags");
}

export async function createTagApi(name: string, slug?: string): Promise<Tag> {
    return apiFetch<Tag>("/tags", {
        method: "POST",
        body: JSON.stringify({ name, slug: slug || name.toLowerCase().replace(/\s+/g, "-") }),
    });
}

export async function attachTagToModelApi(modelId: number, tagId: number): Promise<void> {
    return apiFetch<void>(`/models/${modelId}/tags/${tagId}`, {
        method: "POST",
    });
}

export async function detachTagFromModelApi(modelId: number, tagId: number): Promise<void> {
    return apiFetch<void>(`/models/${modelId}/tags/${tagId}`, {
        method: "DELETE",
    });
}

export async function createModelVersionApi(modelId: number, version: Partial<ModelVersion>): Promise<ModelVersion> {
    return apiFetch<ModelVersion>(`/models/${modelId}/versions`, {
        method: "POST",
        body: JSON.stringify(version),
    });
}

export async function deleteModelVersionApi(versionId: number): Promise<void> {
    return apiFetch<void>(`/versions/${versionId}`, {
        method: "DELETE",
    });
}

export interface CreateImagePayload {
    image_url?: string;
    caption?: string;
    positive_prompt?: string;
    negative_prompt?: string;
    seed?: number;
    steps?: number;
    cfg_scale?: number;
    sampler?: string;
    scheduler?: string;
    width?: number;
    height?: number;
    resources?: Array<{
        name: string;
        type: string;
        weight?: number;
    }>;
}

export async function getModelImagesApi(modelId: number): Promise<ModelImage[]> {
    return apiFetch<ModelImage[]>(`/models/${modelId}/images`);
}

export async function createModelImageApi(modelId: number, data: CreateImagePayload): Promise<ModelImage> {
    return apiFetch<ModelImage>(`/models/${modelId}/images`, {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function uploadModelImageFileApi(modelId: number, formData: FormData): Promise<ModelImage> {
    const res = await fetch(`${API_BASE_URL}/models/${modelId}/images`, {
        method: "POST",
        body: formData,
    });
    if (!res.ok) {
        let errMsg = `Upload failed: ${res.status}`;
        try {
            const json = await res.json();
            if (json?.error) errMsg = json.error;
        } catch {
            // ignore
        }
        throw new Error(errMsg);
    }
    return res.json();
}

export async function deleteModelImageApi(imageId: number): Promise<{ message?: string }> {
    return apiFetch<{ message?: string }>(`/images/${imageId}`, {
        method: "DELETE",
    });
}

export const deleteGalleryImageApi = deleteModelImageApi;

export async function setModelThumbnailApi(modelId: number, imageId: number): Promise<{ message?: string }> {
    return apiFetch<{ message?: string }>(`/models/${modelId}/thumbnail/${imageId}`, {
        method: "PUT",
    });
}

export interface CreateGalleryImagePayload extends CreateImagePayload {
    model_id?: number;
    model_name?: string;
}

export async function createGalleryImageApi(data: CreateGalleryImagePayload): Promise<ModelImage> {
    return apiFetch<ModelImage>("/images", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function uploadGalleryImageFileApi(formData: FormData): Promise<ModelImage> {
    const res = await fetch(`${API_BASE_URL}/images`, {
        method: "POST",
        body: formData,
    });
    if (!res.ok) {
        let errMsg = `Upload failed: ${res.status}`;
        try {
            const json = await res.json();
            if (json?.error) errMsg = json.error;
        } catch {
            // ignore
        }
        throw new Error(errMsg);
    }
    return res.json();
}

export async function updateGalleryImageApi(
    imageId: number,
    data: Partial<CreateGalleryImagePayload>
): Promise<ModelImage> {
    return apiFetch<ModelImage>(`/images/${imageId}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
}

export async function getAllGalleryImagesApi(params?: {
    search?: string;
    base_model?: string;
    model_id?: number;
    sort?: string;
    page?: number;
    limit?: number;
}): Promise<{ data: ModelImage[]; pagination: { total: number; page: number; limit: number; total_pages: number } }> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.base_model) searchParams.set("base_model", params.base_model);
    if (params?.model_id) searchParams.set("model_id", String(params.model_id));
    if (params?.sort) searchParams.set("sort", params.sort);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));

    const qs = searchParams.toString();
    const endpoint = `/images${qs ? `?${qs}` : ""}`;
    return apiFetch<{ data: ModelImage[]; pagination: { total: number; page: number; limit: number; total_pages: number } }>(endpoint);
}

export interface ParsedLora {
    name: string;
    weight: number;
}

export interface ParsedImageMetadata {
    source: "comfyui" | "a1111" | "novelai" | "unknown";
    positive_prompt?: string;
    negative_prompt?: string;
    steps?: number;
    sampler?: string;
    scheduler?: string;
    cfg_scale?: number;
    seed?: number;
    width?: number;
    height?: number;
    model_name?: string;
    clip_skip?: number;
    denoising_strength?: number;
    hires_upscale?: number;
    hires_steps?: number;
    hires_upscaler?: string;
    loras?: ParsedLora[];
    raw_prompt?: string;
}

export interface ParseMetadataResponse {
    success: boolean;
    source: string;
    metadata: ParsedImageMetadata;
}

export async function parseImageMetadataApi(file: File): Promise<ParseMetadataResponse> {
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch(`${API_BASE_URL}/images/parse-metadata`, {
        method: "POST",
        body: formData,
    });
    if (!res.ok) {
        let errMsg = `Parsing failed: ${res.status}`;
        try {
            const json = await res.json();
            if (json?.message) errMsg = json.message;
            else if (json?.error) errMsg = json.error;
        } catch {
            // ignore
        }
        throw new Error(errMsg);
    }
    return res.json();
}
