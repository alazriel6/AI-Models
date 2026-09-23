import { apiFetch } from "./client";

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
    resources?: Resource[];
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
        clip_skip?: number;
        hires_steps?: number;
        hires_upscale?: number;
        hires_upscaler?: string;
        denoising_strength?: number;
        trigger_words?: string[];
        weight?: number;
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

export function getModel(idOrSlug: string | number) {
    return apiFetch<Model>(`/models/${idOrSlug}`);
}