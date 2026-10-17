/**
 * Prompt Transformer & Cross-Model Converter Service
 * Converts prompts between major AI generation formats:
 * - Pony Diffusion V6 XL
 * - Illustrious-XL / NoobAI / Animagine XL 3.1
 * - Flux.1 (Dev/Schnell) & Midjourney
 * - NovelAI Diffusion V3
 * - SDXL Photorealistic / Cinematic
 * - Classic Stable Diffusion 1.5
 */

import { getStoredGeminiApiKey, getStoredGeminiModel } from "./interrogationService";

export type PromptFormatId =
    | "pony"
    | "illustrious"
    | "animagine"
    | "flux"
    | "midjourney"
    | "novelai"
    | "sdxl_realistic"
    | "sd15";

export interface PromptFormatMeta {
    id: PromptFormatId;
    name: string;
    badge: string;
    color: string;
    description: string;
    category: "Anime Booru" | "Natural Language" | "NovelAI" | "Photorealistic" | "Classic";
}

export const PROMPT_FORMATS: PromptFormatMeta[] = [
    {
        id: "pony",
        name: "Pony Diffusion V6 XL",
        badge: "Pony Score Standard",
        color: "#3b82f6",
        description: "Format Danbooru ber-underscore dengan quality score prefix (score_9, score_8_up, rating:explicit).",
        category: "Anime Booru",
    },
    {
        id: "illustrious",
        name: "Illustrious-XL / NoobAI",
        badge: "Booru (Spaces)",
        color: "#60a5fa",
        description: "Danbooru berspasi tanpa underscore & bebas score_9 (standar resmi training OnomaAI & NoobAI).",
        category: "Anime Booru",
    },
    {
        id: "animagine",
        name: "Animagine XL 3.1",
        badge: "Booru Underscore + Aesthetic",
        color: "#0284c7",
        description: "Danbooru ber-underscore murni dengan aesthetic quality prefix dan rating:general / explicit.",
        category: "Anime Booru",
    },
    {
        id: "flux",
        name: "Flux.1 (Dev / Schnell)",
        badge: "Cinematic Prose",
        color: "#10b981",
        description: "Bahasa Inggris naratif deskriptif yang kaya suasana, pencahayaan, dan detail anatomi tanpa koma tag kaku.",
        category: "Natural Language",
    },
    {
        id: "midjourney",
        name: "Midjourney V6.1",
        badge: "Natural + Parameters",
        color: "#f59e0b",
        description: "Prosa artistik sinematik lengkap dengan parameter aspect ratio dan stylize (--ar 16:9 --v 6.1 --stylize 250).",
        category: "Natural Language",
    },
    {
        id: "novelai",
        name: "NovelAI (NAI Diffusion V3)",
        badge: "NAI Brackets Syntax",
        color: "#6366f1",
        description: "Syntax kurung kurawal khas NovelAI ({tag} untuk bobot 1.05x), spasi kata tanpa garis bawah.",
        category: "NovelAI",
    },
    {
        id: "sdxl_realistic",
        name: "SDXL Photorealistic",
        badge: "DSLR / Realism",
        color: "#06b6d4",
        description: "Token kualitas fotografi (8k uhd, dslr, soft rim lighting, natural skin texture) dengan deskripsi adegan jelas.",
        category: "Photorealistic",
    },
    {
        id: "sd15",
        name: "Classic Stable Diffusion 1.5",
        badge: "WebUI Standard",
        color: "#64748b",
        description: "Tag koma klasik dengan syntax pembobotan WebUI (keyword:1.2), kompatibel untuk A1111 & ComfyUI.",
        category: "Classic",
    },
];

/**
 * Otomatis mendeteksi format asal dari prompt yang ditempel
 */
export function detectPromptFormat(promptText: string): { format: PromptFormatId; confidence: string } {
    const text = promptText.trim();
    if (!text) return { format: "illustrious", confidence: "Low" };

    // 1. Cek Pony (score_9, score_8_up)
    if (/score_\d(_up)?/i.test(text) || /rating:(explicit|questionable|safe)/i.test(text)) {
        return { format: "pony", confidence: "High (Terdeteksi score_* atau rating:*)" };
    }

    // 2. Cek NovelAI ({curly brackets} dan [square brackets] tanpa JSON)
    const hasCurlies = /\{[^{}]+\}/.test(text) && !text.includes('":');
    if (hasCurlies) {
        return { format: "novelai", confidence: "High (Terdeteksi {curly bracket} NAI)" };
    }

    // 3. Cek Midjourney (--ar, --v, --s)
    if (/--(ar|v|stylize|chaos|weird|s)\s+\S+/i.test(text)) {
        return { format: "midjourney", confidence: "High (Terdeteksi parameter --v / --ar)" };
    }

    // 4. Cek Realistic Photography
    if (/photorealistic|hyperrealistic|dslr|fujifilm|8k uhd|raw photo/i.test(text)) {
        return { format: "sdxl_realistic", confidence: "Medium (Terdeteksi token fotografi realistis)" };
    }

    // 5. Cek Natural Prose (Flux / General Natural)
    // Ciri: Kalimat berangkai, ada kata sambung/preposisi (in, with, on, atop, during), sedikit underscore
    const words = text.split(/\s+/);
    const underscores = (text.match(/_/g) || []).length;
    const hasSentences = /\b(a|an|the|with|inside|wearing|straddling|sitting|standing)\b/i.test(text);

    if (words.length > 15 && underscores < 3 && hasSentences) {
        return { format: "flux", confidence: "High (Terdeteksi paragraf kalimat naratif)" };
    }

    // 6. Cek Danbooru / Illustrious (Banyak underscores)
    if (underscores >= 4) {
        return { format: "illustrious", confidence: "High (Terdeteksi Danbooru underscore tags)" };
    }

    return { format: "sd15", confidence: "Medium (Format tag koma standar)" };
}

/**
 * Membersihkan token dan bobot WebUI / NAI dari sebuah string tag
 */
export function cleanTagToken(raw: string): { tag: string; weight: number } {
    let s = raw.trim();
    if (!s) return { tag: "", weight: 1.0 };

    // Format WebUI: (tag:1.2) atau (tag)
    const webuiMatch = s.match(/^\((.+?)(?::([0-9.]+))?\)$/);
    if (webuiMatch) {
        const tag = webuiMatch[1].trim();
        const weight = webuiMatch[2] ? parseFloat(webuiMatch[2]) : 1.1;
        return { tag, weight };
    }

    // Format NAI: {{tag}} atau {tag}
    let naiWeight = 1.0;
    while (s.startsWith("{") && s.endsWith("}")) {
        naiWeight *= 1.05;
        s = s.substring(1, s.length - 1).trim();
    }
    while (s.startsWith("[") && s.endsWith("]")) {
        naiWeight *= 0.952;
        s = s.substring(1, s.length - 1).trim();
    }

    return { tag: s, weight: Math.round(naiWeight * 100) / 100 };
}

/**
 * Memecah prompt menjadi daftar unit tag yang bersih
 */
export function extractCleanTokens(input: string): Array<{ tag: string; weight: number }> {
    // 1. Ekstrak LoRA jika ada (<lora:name:weight>)
    const loras: string[] = [];
    let cleaned = input.replace(/<lora:[^>]+>/gi, (match) => {
        loras.push(match);
        return "";
    });

    // 2. Bersihkan filter score pony dan rating dari daftar tag umum
    cleaned = cleaned.replace(/score_\d(_up)?,?\s*/gi, "");
    cleaned = cleaned.replace(/rating:(explicit|questionable|safe|general),?\s*/gi, "");

    // 3. Split by comma
    const parts = cleaned.split(",").map((p) => p.trim()).filter(Boolean);
    const tokens: Array<{ tag: string; weight: number }> = [];

    for (const p of parts) {
        const { tag, weight } = cleanTagToken(p);
        if (tag && !tag.toLowerCase().startsWith("score_") && !tag.toLowerCase().startsWith("rating:")) {
            tokens.push({ tag, weight });
        }
    }

    return tokens;
}

/**
 * Transformasi Instan Cepat (Offline Rule-Based Converter)
 */
export function convertPromptOffline(
    input: string,
    targetFormat: PromptFormatId,
    options?: { isNsfw?: boolean; loraList?: string[] }
): string {
    const text = input.trim();
    if (!text) return "";

    const tokens = extractCleanTokens(text);
    const isNsfw = options?.isNsfw ?? (
        /nsfw|explicit|sex|penetration|nude|breasts|pussy|penis|missionary|cowgirl/i.test(text)
    );

    // Ambil LoRA yang ada di input
    const loraMatches = text.match(/<lora:[^>]+>/gi) || [];

    switch (targetFormat) {
        // ==========================================
        // 1. PONY DIFFUSION V6 XL
        // ==========================================
        case "pony": {
            const ponyPrefix = isNsfw
                ? "score_9, score_8_up, score_7_up, score_6_up, score_5_up, score_4_up, rating:explicit, masterpiece, best quality, ultra-detailed"
                : "score_9, score_8_up, score_7_up, score_6_up, score_5_up, score_4_up, rating:safe, masterpiece, best quality, ultra-detailed";

            const formattedTags = tokens
                .map(({ tag, weight }) => {
                    // Pastikan format Danbooru underscore
                    const booruTag = tag.toLowerCase().replace(/[\s-]+/g, "_");
                    if (weight !== 1.0 && weight > 0) {
                        return `(${booruTag}:${weight})`;
                    }
                    return booruTag;
                })
                .filter(Boolean);

            // Filter tag duplikat dari prefix
            const finalTags = formattedTags.filter((t) => !ponyPrefix.includes(t.replace(/[()]/g, "").split(":")[0]));
            return [ponyPrefix, ...finalTags, ...loraMatches].filter(Boolean).join(", ");
        }

        // ==========================================
        // 2. ILLUSTRIOUS-XL / NOOBAI
        // ==========================================
        case "illustrious": {
            const illuPrefix = isNsfw
                ? "masterpiece, best quality, very aesthetic, ultra-detailed, nsfw, explicit"
                : "masterpiece, best quality, very aesthetic, ultra-detailed";

            const formattedTags = tokens
                .map(({ tag, weight }) => {
                    // Illustrious-XL & NoobAI dilatih dengan tag Danbooru berspasi (bukan underscore)
                    const cleanTag = tag.replace(/_/g, " ").trim();
                    if (weight !== 1.0 && weight > 0) {
                        return `(${cleanTag}:${weight})`;
                    }
                    return cleanTag;
                })
                .filter(Boolean);

            const finalTags = formattedTags.filter((t) => !illuPrefix.includes(t.replace(/[()]/g, "").split(":")[0]));
            return [illuPrefix, ...finalTags, ...loraMatches].filter(Boolean).join(", ");
        }

        // ==========================================
        // 3. ANIMAGINE XL 3.1
        // ==========================================
        case "animagine": {
            const animaPrefix = isNsfw
                ? "masterpiece, best quality, very aesthetic, newest, ultra-detailed, nsfw, explicit"
                : "masterpiece, best quality, very aesthetic, newest, ultra-detailed";

            const ratingSuffix = isNsfw ? "rating:explicit" : "rating:general";

            const formattedTags = tokens
                .map(({ tag, weight }) => {
                    // Animagine XL dilatih dengan tag Danbooru ber-underscore murni
                    const booruTag = tag.toLowerCase().replace(/[\s-]+/g, "_");
                    if (weight !== 1.0 && weight > 0) {
                        return `(${booruTag}:${weight})`;
                    }
                    return booruTag;
                })
                .filter(Boolean);

            const finalTags = formattedTags.filter(
                (t) => !animaPrefix.includes(t.replace(/[()]/g, "").split(":")[0])
            );
            return [animaPrefix, ...finalTags, ratingSuffix, ...loraMatches].filter(Boolean).join(", ");
        }

        // ==========================================
        // 4. NOVELAI (NAI V3)
        // ==========================================
        case "novelai": {
            const naiPrefix = isNsfw
                ? "{masterpiece}, {best quality}, nsfw, explicit"
                : "{masterpiece}, {best quality}";

            const formattedTags = tokens.map(({ tag, weight }) => {
                // NovelAI menggunakan spasi, bukan underscore
                const spaceTag = tag.replace(/_/g, " ").trim();
                if (weight >= 1.15) {
                    return `{{${spaceTag}}}`;
                } else if (weight >= 1.05) {
                    return `{${spaceTag}}`;
                } else if (weight <= 0.9) {
                    return `[${spaceTag}]`;
                }
                return spaceTag;
            });

            return [naiPrefix, ...formattedTags].filter(Boolean).join(", ");
        }

        // ==========================================
        // 4. FLUX.1 (DEV / SCHNELL)
        // ==========================================
        case "flux": {
            // Jika input aslinya sudah berupa kalimat prosa, bersihkan dan pertahankan
            if (tokens.length <= 4 && text.length > 50 && !text.includes("_")) {
                return text.replace(/<lora:[^>]+>/gi, "").trim();
            }

            // Ubah tag menjadi aliran deskriptif alami
            const readableWords = tokens
                .map((t) => t.tag.replace(/_/g, " "))
                .filter((w) => !/score_\d|masterpiece|best quality|ultra-detailed|rating:/i.test(w));

            const genreDesc = isNsfw
                ? "An erotic 2D anime illustration featuring"
                : "A highly detailed vibrant anime illustration depicting";

            return `${genreDesc} ${readableWords.join(", ")}. Beautiful atmospheric lighting, highly detailed anime screencap, studio quality, sharp focus, 8k resolution.`;
        }

        // ==========================================
        // 5. MIDJOURNEY V6.1
        // ==========================================
        case "midjourney": {
            const readableWords = tokens
                .map((t) => t.tag.replace(/_/g, " "))
                .filter((w) => !/score_\d|masterpiece|best quality|ultra-detailed|rating:/i.test(w));

            const promptCore = isNsfw
                ? `An erotic anime artwork depicting ${readableWords.join(", ")}, cinematic anime screencap, soft rim lighting, exquisite details`
                : `A stunning anime style illustration of ${readableWords.join(", ")}, volumetric lighting, cinematic composition, vivid colors`;

            return `${promptCore} --ar 16:9 --v 6.1 --stylize 250`;
        }

        // ==========================================
        // 6. SDXL PHOTOREALISTIC / CINEMATIC
        // ==========================================
        case "sdxl_realistic": {
            const photoPrefix = isNsfw
                ? "photorealistic, hyperrealistic 8k uhd, dslr, high quality, natural skin texture, soft cinematic lighting, nsfw, explicit"
                : "photorealistic, hyperrealistic 8k uhd, dslr, soft ambient lighting, high quality, award winning photography";

            const naturalTokens = tokens
                .map((t) => t.tag.replace(/_/g, " "))
                .filter((w) => !/score_\d|masterpiece|best quality|ultra-detailed|rating:|cel shading|anime/i.test(w));

            return [photoPrefix, ...naturalTokens, "subsurface scattering, film grain, Fujifilm XT4"].join(", ");
        }

        // ==========================================
        // 7. CLASSIC STABLE DIFFUSION 1.5
        // ==========================================
        case "sd15":
        default: {
            const classicPrefix = "masterpiece, best quality, ultra-detailed, highly detailed, sharp focus";
            const tags = tokens.map(({ tag, weight }) => {
                const clean = tag.replace(/_/g, " ");
                if (weight !== 1.0) {
                    return `(${clean}:${weight})`;
                }
                return clean;
            });

            return [classicPrefix, ...tags, ...loraMatches].filter(Boolean).join(", ");
        }
    }
}

/**
 * Konversi Tingkat Lanjut Menggunakan AI (Google Gemini Vision/Text atau Local LLM)
 * Sangat kuat untuk mengubah Tag Danbooru -> Prosa Sastra Sinematik Flux/Midjourney dan sebaliknya!
 */
export async function convertPromptWithAI(
    input: string,
    targetFormat: PromptFormatId,
    apiKeyOverride?: string
): Promise<string> {
    const key = apiKeyOverride || getStoredGeminiApiKey();
    if (!key) {
        // Fallback langsung ke konversi offline jika API Key belum tersedia
        return convertPromptOffline(input, targetFormat);
    }

    const targetMeta = PROMPT_FORMATS.find((f) => f.id === targetFormat) || PROMPT_FORMATS[0];

    const systemPrompt = `You are an elite AI Art Prompt Engineer and Cross-Model Transformer specialized in Stable Diffusion (Pony, Illustrious, Animagine, SDXL, SD 1.5), Flux.1, Midjourney, and NovelAI.
Your mission is to transform the provided source prompt into the exact native syntax and optimal structure of target format: "${targetMeta.name}" (${targetMeta.badge}).

TARGET SPECIFICATIONS:
- "Pony Diffusion V6 XL": Must start with 'score_9, score_8_up, score_7_up, rating:explicit' (if adult) or 'rating:safe', followed by Danbooru tags strictly using underscores (e.g. cowgirl_position, bare_breasts).
- "Illustrious-XL / NoobAI": Pure Danbooru tags with underscores, starting with 'masterpiece, best quality, very aesthetic'. NEVER include score_9.
- "Flux.1 / Midjourney": Convert tags into flowing, natural narrative descriptive sentences capturing character, erotic/artistic pose, atmosphere, and cinematic lighting. No underscores.
- "NovelAI": Comma-separated tags using spaces (no underscores). Convert emphasis to curly brackets like {tag} or {{tag}} and [tag].
- "SDXL Photorealistic": Photographic natural tokens (dslr, 8k uhd, soft rim lighting, natural skin texture).

CRITICAL: Return ONLY the raw converted prompt text. Do NOT wrap in JSON, do NOT use markdown code blocks or quotes.`;

    const modelName = getStoredGeminiModel() || "gemini-1.5-flash-latest";
    const cleanModel = modelName === "auto" ? "gemini-1.5-flash-latest" : modelName.replace(/^models\//, "");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${key}`;

    const payload = {
        contents: [
            {
                parts: [
                    { text: systemPrompt },
                    { text: `SOURCE PROMPT TO TRANSFORM:\n${input}\n\nTARGET FORMAT:\n${targetMeta.name}` },
                ],
            },
        ],
        generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 800,
        },
    };

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("Empty text returned");

        return text.trim().replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/i, "").trim();
    } catch {
        // Fallback gracefully to offline rule-based converter
        return convertPromptOffline(input, targetFormat);
    }
}

/**
 * Normalisasi satu unit tag atau daftar tag sesuai konvensi model AI tertentu
 */
export function normalizeTagForModel(rawTag: string, model: PromptFormatId | "raw"): string {
    const s = rawTag.trim();
    if (!s) return "";

    if (model === "raw") return s;

    // Bersihkan bobot
    const { tag, weight } = cleanTagToken(s);

    if (model === "illustrious" || model === "novelai") {
        // Ganti underscore ke spasi
        const spaceTag = tag.replace(/_/g, " ").trim();
        if (model === "novelai") {
            if (weight >= 1.15) return `{{${spaceTag}}}`;
            if (weight >= 1.05) return `{${spaceTag}}`;
            if (weight <= 0.9) return `[${spaceTag}]`;
            return spaceTag;
        }
        if (weight !== 1.0 && weight > 0) return `(${spaceTag}:${weight})`;
        return spaceTag;
    }

    if (model === "pony" || model === "animagine") {
        // Wajib underscore
        const underTag = tag.toLowerCase().replace(/[\s-]+/g, "_");
        if (weight !== 1.0 && weight > 0) return `(${underTag}:${weight})`;
        return underTag;
    }

    if (model === "flux" || model === "midjourney") {
        // Prosa natural tanpa underscore
        return tag.replace(/_/g, " ").trim();
    }

    // Default WebUI (sd15 / sdxl)
    if (weight !== 1.0 && weight > 0) return `(${tag}:${weight})`;
    return tag;
}
