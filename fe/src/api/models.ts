import { apiFetch, API_BASE_URL } from "./client";

export interface Resource {
    id: number;
    name: string;
    type: string; // 'checkpoint' | 'lora' | etc.
    version?: string;
    url?: string;
    weight?: number;
}

export interface ModelImage {
    id: number;
    model_id?: number;
    model_name?: string;
    model?: {
        id: number;
        name: string;
        slug: string;
        type: string;
        base_model: string;
        author?: string;
        thumbnail_url?: string;
    };
    image_path?: string;
    image_url: string;
    caption?: string;
    width?: number;
    height?: number;
    positive_prompt?: string;
    negative_prompt?: string;
    seed?: number;
    steps?: number;
    cfg_scale?: number;
    sampler?: string;
    scheduler?: string;
    raw_metadata?: unknown;
    resources?: Resource[];
    tags?: Tag[];
    created_at?: string;
    updated_at?: string;
}

export interface Review {
    id: number;
    model_id?: number;
    reviewer: string;
    rating: number;
    comment: string;
    created_at: string;
    updated_at?: string;
}

export interface ModelTriggerWord {
    id: number;
    model_id?: number;
    trigger_word: string;
}

export interface ModelVersion {
    id: number;
    model_id: number;
    version_name: string;
    version_number?: string;
    file_name?: string;
    file_size?: number;
    format?: string;
    download_url?: string;
    civitai_version_url?: string;
    recommended_settings?: {
        steps?: number;
        width?: number;
        height?: number;
        sampler?: string;
        cfg_scale?: number;
        [key: string]: unknown;
    };
    created_at?: string;
    updated_at?: string;
}

export interface Tag {
    id: number;
    name: string;
    slug: string;
}

export interface Model {
    id: number;
    name: string;
    slug: string;
    type: string; // 'checkpoint' | 'lora'
    base_model: string; // 'Illustrious' | 'NoobAI' | open string
    description: string;
    author: string;

    source_url: string;
    civitai_url?: string;
    huggingface_url?: string;
    thumbnail_url: string;

    published_at?: string;

    likes: number;
    rating: number;

    tensor_size?: string;
    vram_min?: string;
    vram_recommended?: string;
    conditioner?: number;
    first_stage_model?: number;
    model_tensor?: number;

    trigger_words?: ModelTriggerWord[];
    reviews?: Review[];
    versions?: ModelVersion[];
    images?: ModelImage[];
    tags: Tag[];

    created_at: string;
    updated_at: string;
}

export interface ModelsResponse {
    data: Model[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
    };
}

export interface ImagesResponse {
    data: ModelImage[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
    };
}

export function getModels(params?: { type?: string; base_model?: string; search?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.type) query.append("type", params.type);
    if (params?.base_model) query.append("base_model", params.base_model);
    if (params?.search) query.append("search", params.search);
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));
    const qs = query.toString();
    return apiFetch<ModelsResponse>(`/models${qs ? `?${qs}` : ""}`);
}

export function getAllImages(params?: {
    search?: string;
    base_model?: string;
    model_id?: number;
    sort?: string;
    page?: number;
    limit?: number;
}) {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.base_model) query.append("base_model", params.base_model);
    if (params?.model_id) query.append("model_id", String(params.model_id));
    if (params?.sort) query.append("sort", params.sort);
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));
    const qs = query.toString();
    return apiFetch<ImagesResponse>(`/images${qs ? `?${qs}` : ""}`);
}

export function getModel(idOrSlug: string | number) {
    return apiFetch<Model>(`/models/${idOrSlug}`);
}

export function getImage(id: number | string) {
    return apiFetch<ModelImage>(`/images/${id}`);
}

export interface RecommendedLoraItem {
    name: string;
    slug: string;
    weight: number;
    base_model?: string;
}

export interface PromptPreset {
    id: number;
    title: string;
    slug?: string;
    category: string; // 'character' | 'anime' | 'photorealistic' | 'style' | 'environment' | 'modular'
    subcategory?: string;
    base_model_target: string; // 'Illustrious' | 'SDXL' | 'Pony' | 'Flux' | 'All'
    preset_type: "full" | "modular";
    positive_prompt: string;
    negative_prompt?: string;
    trigger_words?: string;
    recommended_model?: string;
    recommended_loras?: string; // JSON string or array
    sample_images?: string; // JSON array of string URLs
    description?: string;
    is_system?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface GetPromptPresetsParams {
    category?: string;
    subcategory?: string;
    base_model?: string;
    type?: string;
    search?: string;
}

export async function getPromptPresets(params?: GetPromptPresetsParams): Promise<PromptPreset[]> {
    const q = new URLSearchParams();
    if (params?.category) q.append("category", params.category);
    if (params?.subcategory) q.append("subcategory", params.subcategory);
    if (params?.base_model) q.append("base_model", params.base_model);
    if (params?.type) q.append("type", params.type);
    if (params?.search) q.append("search", params.search);

    const qs = q.toString();
    const res = await apiFetch<{ data: PromptPreset[]; total: number }>(`/prompt-presets${qs ? `?${qs}` : ""}`);
    return res.data || [];
}

export async function createPromptPresetApi(preset: Partial<PromptPreset>): Promise<PromptPreset> {
    return apiFetch<PromptPreset>("/prompt-presets", {
        method: "POST",
        body: JSON.stringify(preset),
    });
}

export async function updatePromptPresetApi(id: number, preset: Partial<PromptPreset>): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/prompt-presets/${id}`, {
        method: "PUT",
        body: JSON.stringify(preset),
    });
}

export async function deletePromptPresetApi(id: number): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/prompt-presets/${id}`, {
        method: "DELETE",
    });
}

export async function uploadPresetSampleImageApi(file: File): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch(`${API_BASE_URL}/prompt-presets/upload-sample`, {
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