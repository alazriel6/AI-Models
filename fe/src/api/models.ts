import { apiFetch } from "./client";

export interface RecommendedSettings {
    steps: number;
    width: number;
    height: number;
    sampler: string;
    cfg_scale: number;
    clip_skip: number;
    hires_steps: number;
    hires_upscale: number;
    hires_upscaler: string;
    denoising_strength: number;
}

export interface ModelVersion {
    id: number;
    model_id: number;
    version_name: string;
    version_number: string;
    file_name: string;
    file_size: number;
    format: string;
    download_url: string;
    civitai_version_url: string;
    recommended_settings: RecommendedSettings;
    created_at: string;
    updated_at: string;
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
    type: string;
    base_model: string;
    description: string;
    author: string;

    civitai_url: string;
    huggingface_url: string;
    thumbnail_url: string;

    versions: ModelVersion[];
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

export function getModels() {
    return apiFetch<ModelsResponse>("/models");
}

export function getModel(id: number) {
    return apiFetch<Model>(`/models/${id}`);
}