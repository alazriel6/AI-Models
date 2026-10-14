import { API_BASE_URL } from "../api/client";

export interface LoraSuggestion {
    name: string;
    weight: number;
}

export interface InterrogateResult {
    character?: string;
    danbooru_prompt: string;
    negative_prompt: string;
    natural_prompt: string;
    style_tags: string[];
    recommended_model: string;
    recommended_sampler: string;
    recommended_steps: number;
    recommended_cfg: number;
    suggested_loras: LoraSuggestion[];
    used_model?: string;
    fallback_occurred?: boolean;
}

export interface GeminiModelOption {
    id: string;
    label: string;
    badge: string;
    description: string;
    category: "Rekomendasi" | "Gemini 2.0 (Terbaru)" | "Gemini 1.5 (Stabil)" | "Khusus";
}

export const PRESET_GEMINI_MODELS: GeminiModelOption[] = [
    {
        id: "auto",
        label: "⚡ Otomatis (Auto-Failover Cerdas Anti-503)",
        badge: "Rekomendasi Utama",
        description: "Otomatis memilih model Vision tercepat & otomatis beralih ke model cadangan jika server Google sedang sibuk (503).",
        category: "Rekomendasi",
    },
    {
        id: "gemini-1.5-flash-latest",
        label: "🛡️ Gemini 1.5 Flash (Paling Stabil / Bebas 503)",
        badge: "Paling Stabil",
        description: "Kapasitas server paling stabil & bebas dari error 503 high demand. Sangat cepat (<1 detik) & teruji untuk Danbooru tags.",
        category: "Rekomendasi",
    },
    {
        id: "gemini-2.0-flash",
        label: "🚀 Gemini 2.0 Flash",
        badge: "Generasi Terbaru",
        description: "Model multimodal generasi terbaru Google. Cepat (<1s), namun di jam sibuk Google terkadang mengalami antrean beban (503).",
        category: "Gemini 2.0 (Terbaru)",
    },
    {
        id: "gemini-2.0-flash-lite",
        label: "⚡ Gemini 2.0 Flash-Lite",
        badge: "Super Ringan",
        description: "Versi ringan dari Gemini 2.0. Kuota sangat hemat, latensi super rendah, dan beban server jauh lebih longgar.",
        category: "Gemini 2.0 (Terbaru)",
    },
    {
        id: "gemini-1.5-flash-002",
        label: "📦 Gemini 1.5 Flash 002",
        badge: "Stabil",
        description: "Checkpoint stabil 002 dari lini Gemini 1.5.",
        category: "Gemini 1.5 (Stabil)",
    },
    {
        id: "gemini-1.5-flash-8b",
        label: "🪶 Gemini 1.5 Flash 8B",
        badge: "Hemat Kuota",
        description: "Model 8-Billion parameter yang efisien untuk kuota gratis terbatas.",
        category: "Gemini 1.5 (Stabil)",
    },
    {
        id: "gemini-1.5-pro-latest",
        label: "💎 Gemini 1.5 Pro (Latest)",
        badge: "Pro Detail",
        description: "Model Pro generasi 1.5 dengan pemahaman detail visual yang sangat kaya.",
        category: "Gemini 1.5 (Stabil)",
    },
    {
        id: "gemini-1.5-flash",
        label: "🏛️ Gemini 1.5 Flash (GA)",
        badge: "Lawas / Klasik",
        description: "Model standar generasi 1.5 via Google GA endpoint.",
        category: "Gemini 1.5 (Stabil)",
    },
    {
        id: "gemini-2.0-pro-exp-02-05",
        label: "🧠 Gemini 2.0 Pro Experimental",
        badge: "Penalaran Tertinggi",
        description: "Model flagship tercanggih dengan penalaran visual paling mendalam untuk gambar yang kompleks.",
        category: "Gemini 2.0 (Terbaru)",
    },
    {
        id: "gemini-2.0-flash-thinking-exp",
        label: "💡 Gemini 2.0 Flash Thinking Exp",
        badge: "Reasoning",
        description: "Model reasoning eksperimental Google dengan penalaran mendalam sebelum merespons.",
        category: "Khusus",
    },
    {
        id: "gemini-2.5-flash",
        label: "🔮 Gemini 2.5 Flash (Preview)",
        badge: "Next-Gen 2.5",
        description: "Model generasi 2.5 pratinjau jika aktif di akun Google AI Studio Anda.",
        category: "Khusus",
    },
    {
        id: "gemini-2.5-pro",
        label: "🔮 Gemini 2.5 Pro (Preview)",
        badge: "Next-Gen Pro",
        description: "Model penalaran tertinggi generasi 2.5 jika aktif di akun Google AI Studio Anda.",
        category: "Khusus",
    },
];

export type AIProviderType = "gemini" | "ollama" | "lmstudio";

export interface LocalModelPreset {
    id: string;
    label: string;
    description: string;
}

export const POPULAR_LOCAL_VISION_MODELS: LocalModelPreset[] = [
    {
        id: "llama3.2-vision",
        label: "🦙 Llama 3.2 Vision (11B / 90B)",
        description: "Model multimodal flagship dari Meta. Sangat akurat mendeteksi karakter anime, Danbooru tags, dan detail pakaian.",
    },
    {
        id: "llava",
        label: "🌋 LLaVA 1.6 / LLaVA (7B / 13B)",
        description: "Model vision open-source klasik yang cepat dan sangat kompatibel untuk Ollama / LM Studio.",
    },
    {
        id: "minicpm-v",
        label: "📱 MiniCPM-V 2.6",
        description: "Model multimodal ringan dengan kemampuan OCR dan pemahaman visual high-resolution sangat tinggi.",
    },
    {
        id: "qwen2-vl",
        label: "🧭 Qwen2-VL (7B / 72B)",
        description: "Model multimodal Alibaba dengan pemahaman visual resolusi dinamis untuk gambar detail tinggi.",
    },
    {
        id: "bakllava",
        label: "🥐 BakLLaVA",
        description: "Arsitektur LLaVA dengan Mistral backbone, stabil untuk prompt reverse engineering.",
    },
    {
        id: "moondream",
        label: "🌙 Moondream 2 (1.8B)",
        description: "Model vision ultra-ringan. Sangat cepat bahkan di laptop tanpa GPU diskrit.",
    },
];

const LOCAL_STORAGE_KEY = "gemini_api_key";
const MODEL_STORAGE_KEY = "gemini_selected_model";
const PROVIDER_STORAGE_KEY = "ai_interrogate_provider";
const LOCAL_ENDPOINT_STORAGE_KEY = "ai_local_endpoint";
const LOCAL_MODEL_STORAGE_KEY = "ai_local_model";

export function getStoredAIProvider(): AIProviderType {
    const val = localStorage.getItem(PROVIDER_STORAGE_KEY);
    if (val === "ollama" || val === "lmstudio") return val;
    return "gemini";
}

export function setStoredAIProvider(provider: AIProviderType): void {
    localStorage.setItem(PROVIDER_STORAGE_KEY, provider);
}

export function getStoredLocalEndpoint(provider?: AIProviderType): string {
    const custom = localStorage.getItem(LOCAL_ENDPOINT_STORAGE_KEY);
    if (custom && custom.trim()) return custom.trim();
    const p = provider || getStoredAIProvider();
    if (p === "lmstudio") return "http://localhost:1234/v1";
    return "http://localhost:11434";
}

export function setStoredLocalEndpoint(endpoint: string): void {
    if (!endpoint || !endpoint.trim()) {
        localStorage.removeItem(LOCAL_ENDPOINT_STORAGE_KEY);
    } else {
        localStorage.setItem(LOCAL_ENDPOINT_STORAGE_KEY, endpoint.trim());
    }
}

export function getStoredLocalModel(): string {
    return localStorage.getItem(LOCAL_MODEL_STORAGE_KEY) || "llama3.2-vision";
}

export function setStoredLocalModel(model: string): void {
    if (!model || !model.trim()) {
        localStorage.removeItem(LOCAL_MODEL_STORAGE_KEY);
    } else {
        localStorage.setItem(LOCAL_MODEL_STORAGE_KEY, model.trim());
    }
}

export function getStoredGeminiApiKey(): string {
    return localStorage.getItem(LOCAL_STORAGE_KEY) || "";
}

export function setStoredGeminiApiKey(key: string): void {
    if (!key.trim()) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
    } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, key.trim());
    }
}

export function getStoredGeminiModel(): string {
    return localStorage.getItem(MODEL_STORAGE_KEY) || "auto";
}

export function setStoredGeminiModel(model: string): void {
    if (!model || model === "auto") {
        localStorage.removeItem(MODEL_STORAGE_KEY);
    } else {
        localStorage.setItem(MODEL_STORAGE_KEY, model.trim());
    }
}

/**
 * Fetch installed local models from Ollama (GET /api/tags)
 * Queries backend proxy first to avoid browser CORS restrictions.
 */
export async function fetchLocalOllamaModels(endpoint?: string): Promise<Array<{ id: string; name: string }>> {
    const rawEp = (endpoint || getStoredLocalEndpoint("ollama")).trim();
    const ep = rawEp.replace(/\/+$/, "");

    // 1. Try backend proxy first (Bypasses browser CORS completely)
    try {
        const res = await fetch(`${API_BASE_URL}/images/local-models?provider=ollama&endpoint=${encodeURIComponent(rawEp || "http://localhost:11434")}`);
        if (res.ok) {
            const data = await res.json();
            if (data?.success && Array.isArray(data.models) && data.models.length > 0) {
                return data.models;
            }
        }
    } catch {
        // Fallback to direct call below
    }

    // 2. Direct browser call fallback
    try {
        const res = await fetch(`${ep}/api/tags`);
        if (res.ok) {
            const data = await res.json();
            const models: Array<{ name: string }> = data?.models || [];
            if (models.length > 0) {
                return models.map((m) => ({ id: m.name, name: m.name }));
            }
        }
    } catch {
        // ignore
    }

    return [];
}

/**
 * Fetch loaded local models from LM Studio / OpenAI-compatible endpoint (GET /v1/models)
 * Queries backend proxy first to avoid browser CORS restrictions.
 */
export async function fetchLocalOpenAIModels(endpoint?: string): Promise<Array<{ id: string; name: string }>> {
    const rawEp = (endpoint || getStoredLocalEndpoint("lmstudio")).trim();
    let ep = rawEp.replace(/\/+$/, "");
    if (!ep.endsWith("/v1")) ep = `${ep}/v1`;

    // 1. Try backend proxy first (Bypasses browser CORS completely)
    try {
        const res = await fetch(`${API_BASE_URL}/images/local-models?provider=lmstudio&endpoint=${encodeURIComponent(rawEp || "http://127.0.0.1:1234")}`);
        if (res.ok) {
            const data = await res.json();
            if (data?.success && Array.isArray(data.models) && data.models.length > 0) {
                return data.models;
            }
        }
    } catch {
        // Fallback to direct call below
    }

    // 2. Direct browser call fallback
    try {
        const res = await fetch(`${ep}/models`);
        if (res.ok) {
            const data = await res.json();
            const models: Array<{ id: string }> = data?.data || [];
            if (models.length > 0) {
                return models.map((m) => ({ id: m.id, name: m.id }));
            }
        }
    } catch {
        // ignore
    }

    return [];
}

/**
 * Fetch available vision-supported models live from user's Google AI Studio account
 */
export async function fetchLiveAccountModels(apiKey: string): Promise<Array<{ id: string; name: string }>> {
    const key = apiKey.trim();
    if (!key) return [];
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        if (!res.ok) return [];
        const data = await res.json();
        const models: Array<{ name: string; supportedGenerationMethods?: string[] }> = data?.models || [];
        return models
            .filter((m) => {
                if (!m.supportedGenerationMethods?.includes("generateContent")) return false;
                const lower = m.name.toLowerCase();
                if (
                    lower.includes("-tts") ||
                    lower.includes("-audio") ||
                    lower.includes("embedding") ||
                    lower.includes("aqa") ||
                    lower.includes("imagen")
                ) {
                    return false;
                }
                return lower.includes("gemini");
            })
            .map((m) => {
                const clean = m.name.replace(/^models\//, "");
                return { id: clean, name: clean };
            });
    } catch {
        return [];
    }
}

/**
 * Convert a File or Blob to base64 string (without the data URL prefix)
 */
export async function fileToBase64(file: File | Blob): Promise<{ base64: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            const commaIdx = dataUrl.indexOf(",");
            const base64 = commaIdx !== -1 ? dataUrl.substring(commaIdx + 1) : dataUrl;
            const mimeType = file.type || "image/png";
            resolve({ base64, mimeType });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Dynamically discover supported models for the user's API key
 * or return a comprehensive fallback list across v1beta and v1 endpoints.
 */
async function getAvailableModelEndpoints(apiKey: string, selectedModel?: string): Promise<string[]> {
    const key = apiKey.trim();
    const endpoints: string[] = [];

    // Helper to push endpoint if not present
    const addEndpoint = (modelId: string, apiVer = "v1beta") => {
        const clean = modelId.replace(/^models\//, "").trim();
        const ep = `https://generativelanguage.googleapis.com/${apiVer}/models/${clean}:generateContent?key=${key}`;
        if (!endpoints.includes(ep)) {
            endpoints.push(ep);
        }
    };

    // 1. If user explicitly selected a model (e.g. gemini-1.5-flash-latest, gemini-2.0-flash, etc.)
    if (selectedModel && selectedModel !== "auto") {
        addEndpoint(selectedModel, "v1beta");
        addEndpoint(selectedModel, "v1");
    }

    // 2. Try querying ModelService.ListModels dynamically for discovery
    try {
        const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        if (listRes.ok) {
            const data = await listRes.json();
            const models: Array<{ name: string; supportedGenerationMethods?: string[] }> = data?.models || [];

            // Filter for vision/multimodal models: must support generateContent and NOT be TTS/audio/embedding
            const supported = models.filter((m) => {
                if (!m.supportedGenerationMethods?.includes("generateContent")) return false;
                const lower = m.name.toLowerCase();
                if (
                    lower.includes("-tts") ||
                    lower.includes("-audio") ||
                    lower.includes("embedding") ||
                    lower.includes("aqa") ||
                    lower.includes("imagen")
                ) {
                    return false;
                }
                return lower.includes("gemini");
            });

            if (supported.length > 0) {
                const getScore = (name: string) => {
                    const n = name.toLowerCase();
                    // Prioritize models that have the highest stability & least 503 frequency
                    if (n.includes("1.5-flash-latest")) return 100;
                    if (n.includes("2.0-flash-lite")) return 98;
                    if (n.includes("2.0-flash") && !n.includes("exp")) return 95;
                    if (n.includes("1.5-flash-002")) return 92;
                    if (n.includes("1.5-flash-001") || n.includes("1.5-flash")) return 90;
                    if (n.includes("1.5-flash-8b")) return 85;
                    if (n.includes("2.0-flash-exp")) return 80;
                    if (n.includes("1.5-pro-latest") || n.includes("1.5-pro-002")) return 75;
                    if (n.includes("1.5-pro")) return 70;
                    if (n.includes("flash")) return 60;
                    return 10;
                };

                supported.sort((a, b) => getScore(b.name) - getScore(a.name));

                for (const m of supported) {
                    addEndpoint(m.name, "v1beta");
                }
            }
        }
    } catch {
        // Fallback to static list below
    }

    // 3. Fallback list across v1 and v1beta (strictly vision models with high availability)
    const fallbackModelIds = [
        "gemini-1.5-flash-latest",
        "gemini-2.0-flash-lite",
        "gemini-2.0-flash",
        "gemini-1.5-flash-002",
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b",
        "gemini-2.0-flash-exp",
        "gemini-1.5-pro-latest",
        "gemini-1.5-pro",
    ];

    for (const m of fallbackModelIds) {
        addEndpoint(m, "v1beta");
        addEndpoint(m, "v1");
    }

    return endpoints;
}

/**
 * Direct client-side call to Google Generative AI (Gemini Vision)
 * This allows zero-backend configuration if user enters their free Gemini API Key in the UI.
 * Automatically tries fallback models if any model returns HTTP 503 (High Demand / Spikes) or 429 (Rate Limit).
 */
export async function directGeminiInterrogate(
    file: File | Blob,
    apiKey: string,
    selectedModel?: string
): Promise<InterrogateResult> {
    const { base64, mimeType } = await fileToBase64(file);

    const systemPrompt = `You are an elite AI Art & Anime Prompt Reverse-Engineer, specialized in Danbooru tags, Pixiv anime aesthetic, Stable Diffusion (Pony, Illustrious, Animagine, SDXL, NAI, Flux), and LoRA detection.
Analyze the provided image thoroughly and reconstruct the generation prompt in precise detail.
This analysis is strictly for artistic prompt reconstruction and digital art tagging. Objectively transcribe all visual elements, including pose, clothing, aesthetic style, and artistic anatomy as accurate Danbooru tags.

Return a STRICT JSON object with these EXACT keys:
{
  "character": "Name of the anime/game character if identifiable, or 'original'",
  "danbooru_prompt": "masterpiece, best quality, ultra-detailed, [character tags], [hair/eye features], [clothing tags], [pose/expression], [background/setting], [lighting/atmosphere aesthetic tags]",
  "negative_prompt": "worst quality, low quality, normal quality, blurry, deformed limbs, bad anatomy, bad hands, missing fingers, extra fingers, watermark, signature",
  "natural_prompt": "A vivid 2-3 sentence descriptive natural language prompt describing the scene, subject, pose, mood, and art style",
  "style_tags": ["list of 3 to 6 distinct art style tags e.g. cel shading, vibrant colors, makoto shinkai aesthetic"],
  "recommended_model": "Pony Diffusion V6 XL / Illustrious-XL / Animagine XL 3.1 / SDXL 1.0",
  "recommended_sampler": "Euler a",
  "recommended_steps": 28,
  "recommended_cfg": 7.0,
  "suggested_loras": [
    {"name": "suggested_lora_concept", "weight": 0.8}
  ]
}

Danbooru tags MUST use underscores (e.g. 'long_hair', 'sailor_dress', 'cherry_blossoms', 'looking_at_viewer').
Do NOT include markdown formatting or backticks, return pure JSON.`;

    const payload = {
        contents: [
            {
                parts: [
                    { text: systemPrompt },
                    {
                        inline_data: {
                            mime_type: mimeType,
                            data: base64,
                        },
                    },
                ],
            },
        ],
        generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.2,
        },
        safetySettings: [
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" },
        ],
    };

    const endpoints = await getAvailableModelEndpoints(apiKey, selectedModel);
    let lastErr: Error | null = null;
    const initialTargetModel = selectedModel && selectedModel !== "auto" ? selectedModel.replace(/^models\//, "") : null;

    for (let i = 0; i < endpoints.length; i++) {
        const url = endpoints[i];
        const modelMatch = url.match(/\/models\/([^:]+)/);
        const currentModel = modelMatch ? modelMatch[1] : "gemini";

        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errText = await res.text();

                // If invalid API key (401/403/API_KEY_INVALID), fail immediately because no model will work
                if (res.status === 401 || res.status === 403 || errText.includes("API_KEY_INVALID")) {
                    throw new Error(`API Key Google Gemini tidak valid atau tidak memiliki izin akses (HTTP ${res.status}). Silakan periksa kembali API Key Anda.`);
                }

                // If 503 (High Demand / Spikes), 429 (Rate Limit / Quota), 404 (Not Found), 400 (Modality), or 5xx:
                // Log and gracefully continue to the next fallback model!
                console.warn(`[Gemini Interrogate] Model '${currentModel}' mengembalikan HTTP ${res.status}. Beralih ke model alternatif berikutnya...`);
                lastErr = new Error(`Gemini API HTTP ${res.status}: ${errText}`);
                continue;
            }

            const json = await res.json();
            const rawPart = json?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawPart) throw new Error("Jawaban kosong dari Gemini Vision.");

            let clean = rawPart.trim();
            if (clean.startsWith("```json")) clean = clean.substring(7);
            if (clean.startsWith("```")) clean = clean.substring(3);
            if (clean.endsWith("```")) clean = clean.substring(0, clean.length - 3);

            const parsed: InterrogateResult = JSON.parse(clean.trim());
            return {
                character: parsed.character || "original",
                danbooru_prompt: parsed.danbooru_prompt || "",
                negative_prompt:
                    parsed.negative_prompt ||
                    "worst quality, low quality, normal quality, blurry, deformed limbs, watermark",
                natural_prompt: parsed.natural_prompt || "",
                style_tags: parsed.style_tags || [],
                recommended_model: parsed.recommended_model || "Illustrious-XL / Pony V6",
                recommended_sampler: parsed.recommended_sampler || "Euler a",
                recommended_steps: parsed.recommended_steps || 28,
                recommended_cfg: parsed.recommended_cfg || 7.0,
                suggested_loras: parsed.suggested_loras || [],
                used_model: currentModel,
                fallback_occurred: initialTargetModel ? currentModel !== initialTargetModel : false,
            };
        } catch (err: any) {
            lastErr = err;
            const msg = err?.message || "";
            // If it's an API Key auth error, terminate immediately
            if (msg.includes("API Key") || msg.includes("401") || msg.includes("403")) {
                throw err;
            }
            // Otherwise continue to next fallback model
            continue;
        }
    }

    throw lastErr || new Error("Gagal menganalisis gambar dengan Gemini API. Semua model sedang sibuk atau kuota harian habis.");
}

/**
 * Helper to safely parse Danbooru JSON output from LLMs
 */
function parseInterrogateJson(rawText: string, modelName: string): InterrogateResult {
    let clean = rawText.trim();
    clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

    // Extract JSON between first { and last }
    const firstBrace = clean.indexOf("{");
    const lastBrace = clean.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        clean = clean.substring(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(clean);
    return {
        character: parsed.character || "original",
        danbooru_prompt: parsed.danbooru_prompt || "",
        negative_prompt:
            parsed.negative_prompt ||
            "worst quality, low quality, normal quality, blurry, deformed limbs, watermark",
        natural_prompt: parsed.natural_prompt || "",
        style_tags: parsed.style_tags || [],
        recommended_model: parsed.recommended_model || "Illustrious-XL / Pony V6",
        recommended_sampler: parsed.recommended_sampler || "Euler a",
        recommended_steps: parsed.recommended_steps || 28,
        recommended_cfg: parsed.recommended_cfg || 7.0,
        suggested_loras: parsed.suggested_loras || [],
        used_model: modelName,
        fallback_occurred: false,
    };
}

/**
 * Direct client-side call to a Local Vision LLM (Ollama or LM Studio / OpenAI-compatible endpoint)
 */
export async function directLocalInterrogate(
    file: File | Blob,
    provider: "ollama" | "lmstudio",
    endpoint: string,
    model: string
): Promise<InterrogateResult> {
    const { base64, mimeType } = await fileToBase64(file);

    const systemPrompt = `You are an expert anime & digital art prompt reverse-engineering AI, specialized in Pixiv, Danbooru, Gelbooru, and Stable Diffusion prompting (Pony Diffusion, Illustrious-XL, Animagine XL, SDXL, Flux).
Inspect this image with extreme thoroughness and deconstruct it into exhaustive, accurate Danbooru tags and a rich artistic prompt.

STRICT INSTRUCTIONS FOR DANBOORU TAGS ('danbooru_prompt'):
- You MUST generate at least 30 to 50 highly specific, granular Danbooru tags separated by commas.
- Tags MUST use underscores instead of spaces (e.g., blue_eyes, sailor_collar, pleated_skirt, thighhighs).
- Tag categories you MUST include:
  1. Quality: masterpiece, best quality, ultra-detailed
  2. Character: character count (e.g. 1girl, solo), character name if known (or original)
  3. Hair & Face: exact hair color, hair length, specific hairstyle (e.g. twintails, side_ponytail, bangs, blunt_bangs), eye color, facial expression (e.g. blush, open_mouth, smile, gentle_eyes)
  4. Body & Anatomy: body features, skin tone, chest size (e.g. medium_breasts, large_breasts) if applicable
  5. Detailed Clothing: breakdown of every single piece of attire (e.g. white_shirt, black_vest, necktie, pleated_skirt, frilled_skirt, black_thighhighs, leather_boots, fingerless_gloves, ribbon, hair_ornament)
  6. Pose & View: shot type (e.g. full_body, cowboy_shot, upper_body), pose (e.g. sitting, standing, leaning_forward), arm/hand position, viewing angle (e.g. looking_at_viewer, from_side, dynamic_angle)
  7. Background & Setting: indoor/outdoor, room elements, natural elements (e.g. cherry_blossoms, floating_petals, clouds, starry_sky, neon_lights, bedroom, sunset)
  8. Lighting & Aesthetic: lighting style (e.g. cinematic_lighting, volumetric_lighting, soft_lighting, rim_light, depth_of_field, bloom, glowing)

STRICT INSTRUCTIONS FOR NATURAL PROMPT ('natural_prompt'):
- Write a vivid, descriptive 3-4 sentence paragraph capturing the character, atmosphere, lighting, and artistic style.

Return ONLY a pure JSON object matching this schema (no markdown, no backticks):
{
  "character": "Name of the character or 'original'",
  "danbooru_prompt": "masterpiece, best quality, ultra-detailed, 1girl, solo, ... (exhaustive list of 30-50+ Danbooru tags)",
  "negative_prompt": "worst quality, low quality, normal quality, blurry, deformed limbs, bad anatomy, bad hands, missing fingers, extra fingers, watermark, signature",
  "natural_prompt": "Rich 3-4 sentence descriptive prompt...",
  "style_tags": ["style1", "style2", "style3", "style4", "style5"],
  "recommended_model": "Illustrious-XL / Pony Diffusion V6 XL",
  "recommended_sampler": "Euler a",
  "recommended_steps": 28,
  "recommended_cfg": 7.0,
  "suggested_loras": [
    {"name": "suggested_lora_concept", "weight": 0.8}
  ]
}`;

    const cleanEp = endpoint.trim().replace(/\/+$/, "");

    if (provider === "lmstudio") {
        const url = cleanEp.endsWith("/v1") ? `${cleanEp}/chat/completions` : `${cleanEp}/v1/chat/completions`;
        const payload = {
            model: model || "local-model",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: systemPrompt },
                        {
                            type: "image_url",
                            image_url: { url: `data:${mimeType};base64,${base64}` },
                        },
                    ],
                },
            ],
            temperature: 0.45,
            max_tokens: 2048,
            top_p: 0.9,
        };

        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`LM Studio / OpenAI Local Error (HTTP ${res.status}): ${errText}`);
        }

        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (!content) throw new Error("LM Studio tidak mengembalikan teks jawaban.");

        return parseInterrogateJson(content, `Local LM Studio (${model || "default"})`);
    } else {
        // Ollama default
        const url = `${cleanEp}/api/generate`;
        const payload = {
            model: model || "llama3.2-vision",
            prompt: systemPrompt,
            images: [base64],
            stream: false,
            format: "json",
            options: {
                temperature: 0.45,
                num_predict: 2048,
                top_p: 0.9,
            },
        };

        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Ollama Error (HTTP ${res.status}): ${errText}`);
        }

        const data = await res.json();
        const responseText = data?.response;
        if (!responseText) throw new Error("Ollama tidak mengembalikan respons analisis gambar.");

        return parseInterrogateJson(responseText, `Local Ollama (${model || "llama3.2-vision"})`);
    }
}

export interface InterrogateOptions {
    provider?: AIProviderType;
    apiKey?: string;
    model?: string;
    localEndpoint?: string;
    localModel?: string;
}

/**
 * High-level Interrogate function:
 * Supports Google Gemini (Cloud) and Local AI LLMs (Ollama, LM Studio).
 * First attempts backend proxy to avoid CORS; falls back to direct client-side fetch.
 */
export async function interrogateImage(
    file: File | Blob,
    customKeyOrOptions?: string | InterrogateOptions,
    customModel?: string
): Promise<InterrogateResult> {
    let provider: AIProviderType = getStoredAIProvider();
    let key = getStoredGeminiApiKey();
    let model = getStoredGeminiModel();
    let localEndpoint = getStoredLocalEndpoint(provider);
    let localModel = getStoredLocalModel();

    if (typeof customKeyOrOptions === "object" && customKeyOrOptions !== null) {
        if (customKeyOrOptions.provider) provider = customKeyOrOptions.provider;
        if (customKeyOrOptions.apiKey !== undefined) key = customKeyOrOptions.apiKey;
        if (customKeyOrOptions.model !== undefined) model = customKeyOrOptions.model;
        if (customKeyOrOptions.localEndpoint !== undefined) localEndpoint = customKeyOrOptions.localEndpoint;
        if (customKeyOrOptions.localModel !== undefined) localModel = customKeyOrOptions.localModel;
    } else if (typeof customKeyOrOptions === "string") {
        key = customKeyOrOptions;
        if (customModel) model = customModel;
    }

    // 1. LOCAL AI PROVIDER (Ollama / LM Studio)
    if (provider === "ollama" || provider === "lmstudio") {
        // Route through backend proxy to completely avoid browser CORS restrictions
        try {
            const formData = new FormData();
            formData.append("image", file);
            formData.append("provider", provider);
            formData.append("endpoint", localEndpoint);
            formData.append("local_model", localModel);
            formData.append("model", localModel);

            const queryParams = new URLSearchParams({
                provider,
                endpoint: localEndpoint,
                local_model: localModel,
                model: localModel,
            });

            const res = await fetch(`${API_BASE_URL}/images/interrogate?${queryParams.toString()}`, {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success && data.data) {
                    return data.data as InterrogateResult;
                }
            } else {
                const errData = await res.json().catch(() => null);
                const rawError = errData?.error || `Server HTTP ${res.status}`;
                if (rawError.includes("does not support image inputs")) {
                    throw new Error(`Model '${localModel || "qwen2-vl-7b-instruct"}' di LM Studio belum memiliki Vision Projector (file mmproj). Di LM Studio, pastikan file 'mmproj-*.gguf' ikut di-download dan dipasang pada slot Vision model ini.`);
                }
                throw new Error(rawError);
            }
        } catch (backendErr: any) {
            // Rethrow backend errors immediately so the user sees the real cause instead of CORS
            throw backendErr;
        }
    }

    // 2. CLOUD AI PROVIDER (Google Gemini Vision)
    try {
        const formData = new FormData();
        formData.append("image", file);
        if (model) formData.append("model", model);
        if (key) formData.append("api_key", key);
        formData.append("provider", "gemini");

        const queryParams = new URLSearchParams({
            provider: "gemini",
            ...(model ? { model } : {}),
            ...(key ? { api_key: key } : {}),
        });

        const res = await fetch(`${API_BASE_URL}/images/interrogate?${queryParams.toString()}`, {
            method: "POST",
            body: formData,
        });

        if (res.ok) {
            const data = await res.json();
            if (data.success && data.data) {
                return data.data as InterrogateResult;
            }
        }
    } catch {
        // Backend request failed, will attempt direct client-side if key available
    }

    if (key) {
        return await directGeminiInterrogate(file, key, model);
    }

    throw new Error(
        "Gemini API Key belum disetel. Silakan masukkan Google Gemini API Key Anda atau beralih ke Local AI (Ollama / LM Studio) di pengaturan model."
    );
}
