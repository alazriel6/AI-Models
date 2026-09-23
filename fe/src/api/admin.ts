import { apiFetch } from "./client";
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
    const API_BASE_URL = "http://localhost:8080/api";
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

export async function setModelThumbnailApi(modelId: number, imageId: number): Promise<{ message?: string }> {
    return apiFetch<{ message?: string }>(`/models/${modelId}/thumbnail/${imageId}`, {
        method: "PUT",
    });
}
