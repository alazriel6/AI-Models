import { BOORU_TAGS_DATABASE, type BooruTagCategory, type BooruTagItem } from "../data/booruTags";
import { createBooruTagApi } from "../api/models";
import type { AttributeCategory } from "../types/storyMerger";

export interface LearnedTag {
    name: string;
    normalizedName: string;
    category: BooruTagCategory;
    layer: string;
    attributeCategory: AttributeCategory;
    postCount: string;
    description: string;
    learnedAt: number;
    source: "auto" | "manual";
}

const LEARNED_TAGS_STORAGE_KEY = "models_guide_learned_tags";
const AUTO_LEARN_SETTING_KEY = "models_guide_auto_learn_tags_enabled";

// In-memory cache of learned tags initialized from localStorage
let learnedTagsCache: Map<string, LearnedTag> | null = null;

function normalizeKey(str: string): string {
    return (str || "")
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Loads learned tags from localStorage into memory cache.
 */
export function getLearnedTags(): LearnedTag[] {
    if (learnedTagsCache !== null) {
        return Array.from(learnedTagsCache.values());
    }

    learnedTagsCache = new Map();
    try {
        if (typeof window !== "undefined" && window.localStorage) {
            const stored = localStorage.getItem(LEARNED_TAGS_STORAGE_KEY);
            if (stored) {
                const parsed: LearnedTag[] = JSON.parse(stored);
                parsed.forEach((tag) => {
                    learnedTagsCache!.set(normalizeKey(tag.normalizedName || tag.name), tag);
                });
            }
        }
    } catch (e) {
        console.warn("[SmartTagDetector] Failed to load learned tags from storage:", e);
    }

    return Array.from(learnedTagsCache.values());
}

/**
 * Saves memory cache of learned tags back to localStorage.
 */
function saveLearnedTagsCache(): void {
    if (!learnedTagsCache) return;
    try {
        if (typeof window !== "undefined" && window.localStorage) {
            const list = Array.from(learnedTagsCache.values());
            localStorage.setItem(LEARNED_TAGS_STORAGE_KEY, JSON.stringify(list));
        }
    } catch (e) {
        console.warn("[SmartTagDetector] Failed to persist learned tags to storage:", e);
    }
}

/**
 * Checks if auto-learning new tags is currently enabled.
 */
export function isAutoLearnEnabled(): boolean {
    if (typeof window === "undefined" || !window.localStorage) return true;
    const val = localStorage.getItem(AUTO_LEARN_SETTING_KEY);
    return val === null ? true : val === "true";
}

/**
 * Sets the auto-learn toggle setting.
 */
export function setAutoLearnEnabled(enabled: boolean): void {
    if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(AUTO_LEARN_SETTING_KEY, enabled ? "true" : "false");
    }
}

/**
 * Intelligent Semantic Classifier:
 * Analyzes words, prefixes, suffixes, and diffusion terminology to predict the
 * precise category, layer, and Danbooru taxonomy for any new or unknown tag.
 */
export function inferTagCategoryAndLayer(rawTag: string): {
    attributeCategory: AttributeCategory;
    booruCategory: BooruTagCategory;
    booruLayer: string;
    confidence: number;
    reason: string;
} {
    const s = normalizeKey(rawTag);

    // 1. Quality & Technical Style
    if (/\b(masterpiece|best quality|top quality|amazing quality|high quality|highres|absurdres|newest|flawless|wallpaper|8k|4k|hdr)\b/i.test(s)) {
        return {
            attributeCategory: "quality",
            booruCategory: "quality",
            booruLayer: "quality",
            confidence: 0.98,
            reason: "Kosa kata kualitas & resolusi render",
        };
    }

    // 2. Lighting & Shading
    if (/\b(shadow|shadows|defined shadow shapes|shadow shapes|deep shadows|soft shadows|rim lighting|soft rim lighting|rim light|sunlight|soft sunlight|sunbeams|sun rays|lighting|backlit|highlights|ambient occlusion|god rays|crepuscular rays|cinematic lighting)\b/i.test(s)) {
        return {
            attributeCategory: "lighting",
            booruCategory: "general",
            booruLayer: "lighting",
            confidence: 0.96,
            reason: "Terminologi tata cahaya, bayangan & pencahayaan",
        };
    }

    // 3. Art Style & Rendering
    if (/\b(anime coloring|anime_coloring|clean lineart|lineart|cel shading|rich cel shading|soft shading|flat color|watercolor|illustration|visual novel|monochrome|shading|rendering|aesthetic)\b/i.test(s)) {
        return {
            attributeCategory: "art_style",
            booruCategory: "general",
            booruLayer: "style",
            confidence: 0.95,
            reason: "Gaya seni, pewarnaan anime, lineart & cel shading",
        };
    }

    // 4. Character Action & Interactions
    if (/\b(holding|clutching|carrying|hugging|grasping|reaching|pointing|hand on|hands on|one hand on|hand in|tucking hair|crossing arms|adjusting)\b/i.test(s)) {
        return {
            attributeCategory: "action",
            booruCategory: "general",
            booruLayer: "action",
            confidence: 0.94,
            reason: "Aksi aktif tubuh, tangan, atau memegang objek",
        };
    }

    // 5. Pose & Posture
    if (/\b(standing|sitting|kneeling|lying|squatting|leaning|walking|crouching|reclining|perched|stepping|running|jumping|floating|cowboy shot|full body|upper body|portrait|close-up)\b/i.test(s)) {
        return {
            attributeCategory: "pose",
            booruCategory: "general",
            booruLayer: "pose",
            confidence: 0.93,
            reason: "Pose tubuh, posisi berdiri/duduk/berjalan, atau framing",
        };
    }

    // 6. Facial Expression & Gaze
    if (/\b(smile|smiling|smirk|grinning|laughing|open mouth|closed mouth|parted lips|speaking|talking|blush|light blush|shy|embarrassed|calm|calm expression|serious|frown|pout|looking at viewer|looking away|gaze|head tilt)\b/i.test(s)) {
        return {
            attributeCategory: "expression",
            booruCategory: "general",
            booruLayer: "expression",
            confidence: 0.94,
            reason: "Raut wajah, ekspresi emosi, tatapan mata, atau berbicara",
        };
    }

    // 7. Background & Environment
    if (/\b(classroom|indoor|indoors|outdoor|outdoors|school|hallway|corridor|door|doorway|sliding door|window|desk|desks|wooden desks|chalkboard|chalkboard in background|blackboard|whiteboard|room|wall|sky|clouds|sunset|trees|forest|city)\b/i.test(s)) {
        return {
            attributeCategory: "background",
            booruCategory: "general",
            booruLayer: "background",
            confidence: 0.92,
            reason: "Lokasi ruangan, latar arsitektur, atau pemandangan",
        };
    }

    // 8. Hair & Headwear
    if (/\b(hair|updo|curls|retro curls|curly hair|ponytail|twintails|braid|bangs|short hair|long hair|bob cut|ahoge)\b/i.test(s)) {
        return {
            attributeCategory: "hair",
            booruCategory: "general",
            booruLayer: "hair",
            confidence: 0.95,
            reason: "Bentuk gaya rambut, tatanan sanggul, atau poni",
        };
    }

    // 9. Eyes
    if (/\b(eyes|red eyes|blue eyes|green eyes|pupils|heterochromia)\b/i.test(s)) {
        return {
            attributeCategory: "eyes",
            booruCategory: "general",
            booruLayer: "eyes",
            confidence: 0.96,
            reason: "Warna atau fitur mata",
        };
    }

    // 10. Outfit & Clothing
    if (/\b(dress|halter dress|halterneck|sleeveless dress|backless dress|burgundy dress|minidress|belt|white belt|skirt|thighhighs|sheer black thighhighs|stockings|boots|shoes|gloves|coat|jacket|bikini|uniform)\b/i.test(s)) {
        return {
            attributeCategory: "outfit",
            booruCategory: "general",
            booruLayer: "clothing",
            confidence: 0.95,
            reason: "Pakaian, gaun, sabuk, atau kaos kaki",
        };
    }

    // 11. Accessories
    if (/\b(headband|red headband|polka dot headband|halo|ribbon|glasses|necklace|earrings|hat|scarf|wings|horns|tail)\b/i.test(s)) {
        return {
            attributeCategory: "accessories",
            booruCategory: "general",
            booruLayer: "accessories",
            confidence: 0.95,
            reason: "Aksesoris kepala, bando, halo, atau perhiasan",
        };
    }

    // 12. Camera & Composition
    if (/\b(angle|view|front view|side view|back view|depth of field|blurry background|wide angle|bokeh)\b/i.test(s)) {
        return {
            attributeCategory: "camera",
            booruCategory: "general",
            booruLayer: "camera",
            confidence: 0.92,
            reason: "Sudut pandang kamera dan kedalaman fokus",
        };
    }

    // 13. Objects & Props
    if (/\b(clipboard|documents|folder|book|paper|papers|pen|phone|umbrella|sword|flower|bag)\b/i.test(s)) {
        return {
            attributeCategory: "objects",
            booruCategory: "general",
            booruLayer: "props",
            confidence: 0.92,
            reason: "Benda atau dokumen yang dibawa karakter",
        };
    }

    // 14. Character Identity & Anatomy
    if (/\b(1girl|solo|girl|female|mature female|tall female|breasts|large breasts|slender waist|wide hips|thick thighs|tsukatsuki rio|rio)\b/i.test(s)) {
        return {
            attributeCategory: "character_identity",
            booruCategory: "character",
            booruLayer: "character",
            confidence: 0.95,
            reason: "Identitas karakter atau proporsi anatomi",
        };
    }

    return {
        attributeCategory: "other",
        booruCategory: "general",
        booruLayer: "details",
        confidence: 0.5,
        reason: "Atribut spesifik / kosa kata kustom",
    };
}

/**
 * Checks if a tag is already recognized either in static Danbooru database,
 * or in learned custom tags.
 */
export function isKnownBooruTag(cleanTag: string): {
    isKnown: boolean;
    source: "danbooru" | "learned" | "none";
    item?: BooruTagItem | LearnedTag;
} {
    const key = normalizeKey(cleanTag);
    if (!key) return { isKnown: false, source: "none" };

    // 1. Check local learned tags cache
    const learned = getLearnedTags();
    const learnedMatch = learned.find((l) => normalizeKey(l.normalizedName || l.name) === key);
    if (learnedMatch) {
        return { isKnown: true, source: "learned", item: learnedMatch };
    }

    // 2. Check static Danbooru database
    const booruMatch = BOORU_TAGS_DATABASE.find(
        (b) => normalizeKey(b.name) === key || b.name.toLowerCase() === key.replace(/ /g, "_")
    );
    if (booruMatch) {
        return { isKnown: true, source: "danbooru", item: booruMatch };
    }

    return { isKnown: false, source: "none" };
}

/**
 * Registers a newly discovered tag into local cache and persists to backend PostgreSQL.
 */
export async function registerNewVocabularyTag(
    cleanTag: string,
    options: {
        overrideCategory?: AttributeCategory;
        overrideLayer?: string;
        source?: "auto" | "manual";
        description?: string;
    } = {}
): Promise<LearnedTag> {
    const normalized = normalizeKey(cleanTag);
    if (!normalized) {
        throw new Error("Tag name cannot be empty");
    }

    // Infer classification
    const inferred = inferTagCategoryAndLayer(normalized);
    const finalAttributeCat = options.overrideCategory || inferred.attributeCategory;
    const finalLayer = options.overrideLayer || inferred.booruLayer;
    const finalDesc = options.description || inferred.reason;
    const source = options.source || "auto";

    const learnedItem: LearnedTag = {
        name: cleanTag.trim(),
        normalizedName: normalized,
        category: inferred.booruCategory,
        layer: finalLayer,
        attributeCategory: finalAttributeCat,
        postCount: "Custom DB",
        description: finalDesc,
        learnedAt: Date.now(),
        source,
    };

    // Update in-memory cache and localStorage
    if (!learnedTagsCache) getLearnedTags();
    learnedTagsCache!.set(normalized, learnedItem);
    saveLearnedTagsCache();

    // Persist to Backend PostgreSQL asynchronously
    try {
        await createBooruTagApi({
            name: normalized.replace(/ /g, "_"),
            category: inferred.booruCategory,
            layer: finalLayer,
            description: `${finalDesc} [Learned: ${source}]`,
        });
        console.log(`[SmartTagDetector] Successfully saved tag "${normalized}" to PostgreSQL database!`);
    } catch (err) {
        // Safe graceful degradation if backend API is temporarily offline
        console.warn(`[SmartTagDetector] Backend sync warning for "${normalized}" (cached locally):`, err);
    }

    return learnedItem;
}

/**
 * Scans a list of prompt tokens, detects unknown vocabulary tags,
 * and automatically learns / registers them if auto-learning is enabled.
 */
export async function scanAndAutoLearnPromptTokens(
    tokens: string[],
    autoLearn = true
): Promise<{
    knownCount: number;
    newlyLearned: LearnedTag[];
    allDetected: Array<{
        raw: string;
        clean: string;
        isKnown: boolean;
        category: AttributeCategory;
        source: "danbooru" | "learned" | "newly_added";
    }>;
}> {
    const newlyLearned: LearnedTag[] = [];
    const allDetected: Array<{
        raw: string;
        clean: string;
        isKnown: boolean;
        category: AttributeCategory;
        source: "danbooru" | "learned" | "newly_added";
    }> = [];

    let knownCount = 0;

    for (const rawToken of tokens) {
        // Strip weights: (tag:1.2) -> tag
        const clean = rawToken.replace(/^\(+/, "").replace(/\)+$/, "").replace(/:[0-9.]+$/, "").trim();
        if (!clean) continue;

        const check = isKnownBooruTag(clean);
        if (check.isKnown) {
            knownCount++;
            const cat =
                check.source === "learned"
                    ? (check.item as LearnedTag).attributeCategory
                    : inferTagCategoryAndLayer(clean).attributeCategory;

            allDetected.push({
                raw: rawToken,
                clean,
                isKnown: true,
                category: cat,
                source: check.source as "danbooru" | "learned",
            });
        } else {
            // New Vocabulary Tag detected!
            const inferred = inferTagCategoryAndLayer(clean);
            if (autoLearn && isAutoLearnEnabled()) {
                try {
                    const learned = await registerNewVocabularyTag(clean, {
                        overrideCategory: inferred.attributeCategory,
                        source: "auto",
                    });
                    newlyLearned.push(learned);
                    allDetected.push({
                        raw: rawToken,
                        clean,
                        isKnown: true,
                        category: learned.attributeCategory,
                        source: "newly_added",
                    });
                    knownCount++;
                } catch {
                    allDetected.push({
                        raw: rawToken,
                        clean,
                        isKnown: false,
                        category: inferred.attributeCategory,
                        source: "danbooru",
                    });
                }
            } else {
                allDetected.push({
                    raw: rawToken,
                    clean,
                    isKnown: false,
                    category: inferred.attributeCategory,
                    source: "danbooru",
                });
            }
        }
    }

    return { knownCount, newlyLearned, allDetected };
}
