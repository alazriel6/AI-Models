import { apiFetch, API_BASE_URL } from "./client";
import { FALLBACK_MODELS, FALLBACK_GALLERY_IMAGES } from "../data/fallbackData";

let isDemoMode = false;

export function getIsDemoMode(): boolean {
    return isDemoMode;
}

export function setIsDemoMode(active: boolean): void {
    isDemoMode = active;
}

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

export interface ModelWorkflowSummary {
    id: number;
    name: string;
    slug: string;
    base_model: string;
    category: string;
    total_nodes?: number;
    model_id?: number;
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
    workflows?: ModelWorkflowSummary[];

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

function filterFallbackModels(params?: { type?: string; base_model?: string; search?: string; page?: number; limit?: number }): ModelsResponse {
    let result = [...FALLBACK_MODELS];
    if (params?.type && params.type !== 'all') {
        result = result.filter(m => m.type.toLowerCase() === params.type?.toLowerCase());
    }
    if (params?.base_model && params.base_model !== 'all') {
        result = result.filter(m => m.base_model.toLowerCase().includes(params.base_model!.toLowerCase()));
    }
    if (params?.search) {
        const q = params.search.toLowerCase();
        result = result.filter(m => 
            m.name.toLowerCase().includes(q) || 
            m.description.toLowerCase().includes(q) || 
            m.author.toLowerCase().includes(q) ||
            m.tags.some(t => t.name.toLowerCase().includes(q))
        );
    }
    const page = params?.page || 1;
    const limit = params?.limit || 100;
    const total = result.length;
    const start = (page - 1) * limit;
    const paged = result.slice(start, start + limit);

    return {
        data: paged,
        pagination: {
            page,
            limit,
            total,
            total_pages: Math.max(1, Math.ceil(total / limit)),
        },
    };
}

function filterFallbackImages(params?: {
    search?: string;
    base_model?: string;
    model_id?: number;
    sort?: string;
    page?: number;
    limit?: number;
}): ImagesResponse {
    let result = [...FALLBACK_GALLERY_IMAGES];
    if (params?.model_id) {
        result = result.filter(img => img.model_id === params.model_id);
    }
    if (params?.base_model && params.base_model !== 'all') {
        result = result.filter(img => img.model?.base_model.toLowerCase().includes(params.base_model!.toLowerCase()));
    }
    if (params?.search) {
        const q = params.search.toLowerCase();
        result = result.filter(img => 
            (img.caption && img.caption.toLowerCase().includes(q)) ||
            (img.positive_prompt && img.positive_prompt.toLowerCase().includes(q)) ||
            (img.model?.name && img.model.name.toLowerCase().includes(q)) ||
            img.tags?.some(t => t.name.toLowerCase().includes(q))
        );
    }
    const page = params?.page || 1;
    const limit = params?.limit || 100;
    const total = result.length;
    const start = (page - 1) * limit;
    const paged = result.slice(start, start + limit);

    return {
        data: paged,
        pagination: {
            page,
            limit,
            total,
            total_pages: Math.max(1, Math.ceil(total / limit)),
        },
    };
}

export async function getModels(params?: { type?: string; base_model?: string; search?: string; page?: number; limit?: number }): Promise<ModelsResponse> {
    try {
        const query = new URLSearchParams();
        if (params?.type) query.append("type", params.type);
        if (params?.base_model) query.append("base_model", params.base_model);
        if (params?.search) query.append("search", params.search);
        if (params?.page) query.append("page", String(params.page));
        if (params?.limit) query.append("limit", String(params.limit));
        const qs = query.toString();
        const res = await apiFetch<ModelsResponse>(`/models${qs ? `?${qs}` : ""}`);
        if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
            isDemoMode = false;
            return res;
        }
        isDemoMode = true;
        return filterFallbackModels(params);
    } catch {
        // Backend offline or unreachable (e.g. Vercel live demo) - gracefully fallback to verified models
        isDemoMode = true;
        return filterFallbackModels(params);
    }
}

export async function getAllImages(params?: {
    search?: string;
    base_model?: string;
    model_id?: number;
    sort?: string;
    page?: number;
    limit?: number;
}): Promise<ImagesResponse> {
    try {
        const query = new URLSearchParams();
        if (params?.search) query.append("search", params.search);
        if (params?.base_model) query.append("base_model", params.base_model);
        if (params?.model_id) query.append("model_id", String(params.model_id));
        if (params?.sort) query.append("sort", params.sort);
        if (params?.page) query.append("page", String(params.page));
        if (params?.limit) query.append("limit", String(params.limit));
        const qs = query.toString();
        const res = await apiFetch<ImagesResponse>(`/images${qs ? `?${qs}` : ""}`);
        if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
            isDemoMode = false;
            return res;
        }
        isDemoMode = true;
        return filterFallbackImages(params);
    } catch {
        isDemoMode = true;
        return filterFallbackImages(params);
    }
}

export async function getModel(idOrSlug: string | number): Promise<Model> {
    try {
        const res = await apiFetch<Model>(`/models/${idOrSlug}`);
        if (res && res.id) return res;
        throw new Error("Model not found");
    } catch {
        isDemoMode = true;
        const found = FALLBACK_MODELS.find(m => String(m.id) === String(idOrSlug) || m.slug === String(idOrSlug));
        if (found) return found;
        return FALLBACK_MODELS[0];
    }
}

export async function getImage(id: number | string): Promise<ModelImage> {
    try {
        const res = await apiFetch<ModelImage>(`/images/${id}`);
        if (res && res.id) return res;
        throw new Error("Image not found");
    } catch {
        const found = FALLBACK_GALLERY_IMAGES.find(img => String(img.id) === String(id));
        if (found) return found;
        return FALLBACK_GALLERY_IMAGES[0];
    }
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
    character?: string; // Character name tag (mandatory)
    slug?: string;
    category: string; // 'character' | 'anime' | 'photorealistic' | 'style' | 'environment' | 'modular'
    subcategory?: string;
    base_model_target: string; // 'Illustrious' | 'SDXL' | 'Pony' | 'Flux' | 'All'
    preset_type: "full" | "modular" | "fullset" | string;
    positive_prompt: string;
    negative_prompt?: string;
    trigger_words?: string;
    recommended_model?: string;
    recommended_loras?: string; // JSON string or array
    sample_images?: string; // JSON array of string URLs
    description?: string;
    is_system?: boolean;
    layer_data?: string; // Serialized JSON containing 10-layer inputs and LoRA settings
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

export interface BooruTag {
    id: number;
    name: string;
    category: "general" | "character" | "artist" | "quality" | "meta" | string;
    layer?: string;
    post_count: string;
    count_num: number;
    description: string;
}

export interface BooruTagsPaginatedResponse {
    tags: BooruTag[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

export interface BooruTagStats {
    total_tags: number;
    layers: Record<string, number>;
    categories: Record<string, number>;
}

export async function getBooruTagsApi(
    q?: string,
    category?: string,
    limit: number = 10,
    layer?: string
): Promise<BooruTag[]> {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category && category !== "all") params.set("category", category);
    if (layer && layer !== "all") params.set("layer", layer);
    params.set("limit", String(limit));

    return apiFetch<BooruTag[]>(`/booru-tags?${params.toString()}`);
}

export async function getBooruTagsPaginatedApi(params: {
    q?: string;
    category?: string;
    layer?: string;
    sort?: string;
    page?: number;
    limit?: number;
}): Promise<BooruTagsPaginatedResponse> {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.category && params.category !== "all") qs.set("category", params.category);
    if (params.layer && params.layer !== "all") qs.set("layer", params.layer);
    if (params.sort) qs.set("sort", params.sort);
    qs.set("page", String(params.page || 1));
    qs.set("limit", String(params.limit || 30));
    qs.set("paginate", "true");

    return apiFetch<BooruTagsPaginatedResponse>(`/booru-tags?${qs.toString()}`);
}

export async function getBooruTagStatsApi(): Promise<BooruTagStats> {
    return apiFetch<BooruTagStats>("/booru-tags/stats");
}

export async function createBooruTagApi(tag: Partial<BooruTag>): Promise<BooruTag> {
    return apiFetch<BooruTag>("/booru-tags", {
        method: "POST",
        body: JSON.stringify(tag),
    });
}