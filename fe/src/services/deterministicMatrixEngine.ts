/**
 * Pure TypeScript Deterministic Prompt Merger & 16-Category Engine
 * Zero external or React dependencies. Fully unit-testable.
 */

import {
    CATEGORY_SCHEMA_16,
    CATEGORY_MAP,
    DEFAULT_CATEGORY_ORDER,
    type CategoryKey,
    type CategoryStateMap,
    type ConflictReportItem,
    type MergeDiagnostics,
    type MergePolicy,
    type MergePromptResult,
    type TagItem,
    type WeightMismatchItem,
} from "../types/promptMatrixStudio";

let tokenCounter = 0;
export function generateTagId(prefix = "tag"): string {
    tokenCounter++;
    return `${prefix}-${Date.now().toString(36)}-${tokenCounter}-${Math.random().toString(36).substring(2, 6)}`;
}

/**
 * Normalizes a tag string for semantic key comparison.
 * e.g. "anime_coloring" -> "anime coloring"
 * " (anime coloring:1.15) " -> "anime coloring"
 */
export function normalizeTagKey(tag: string): string {
    if (!tag) return "";
    let s = tag.trim().toLowerCase();

    // Strip outer parentheses / weights
    const weightMatch = s.match(/^\((.+):([0-9.]+)\)$/);
    if (weightMatch) {
        s = weightMatch[1].trim();
    } else {
        // Strip nested wrapping parentheses
        while (s.startsWith("(") && s.endsWith(")") && !s.includes(":")) {
            s = s.slice(1, -1).trim();
        }
    }

    // Replace underscores and extra whitespace
    return s.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Parses raw weighted tag syntax and calculates cleanText and weight.
 * Syntax examples:
 * - "tag" -> { cleanText: "tag", weight: 1.0, raw: "tag" }
 * - "(tag:1.15)" -> { cleanText: "tag", weight: 1.15, raw: "(tag:1.15)" }
 * - "((tag))" -> { cleanText: "tag", weight: 1.21, raw: "((tag))" }
 * - "{tag}" -> { cleanText: "tag", weight: 1.05, raw: "{tag}" }
 * - "[tag]" -> { cleanText: "tag", weight: 0.91, raw: "[tag]" }
 */
export function parseTagItem(rawToken: string, isLocked = false): TagItem {
    const trimmed = rawToken.trim();
    const id = generateTagId();

    if (!trimmed) {
        return { id, raw: "", cleanText: "", weight: 1.0, isLocked };
    }

    // Syntax: (tag:1.25)
    const weightMatch = trimmed.match(/^\((.+):([0-9.]+)\)$/);
    if (weightMatch) {
        const val = parseFloat(weightMatch[2]);
        const clean = weightMatch[1].trim();
        return {
            id,
            raw: trimmed,
            cleanText: clean,
            weight: isNaN(val) ? 1.0 : val,
            weightStr: weightMatch[2],
            isLocked,
        };
    }

    // Syntax: ((tag)) or (tag)
    let depthParen = 0;
    let sParen = trimmed;
    while (sParen.startsWith("(") && sParen.endsWith(")") && !sParen.includes(":")) {
        depthParen++;
        sParen = sParen.slice(1, -1).trim();
    }
    if (depthParen > 0) {
        return {
            id,
            raw: trimmed,
            cleanText: sParen,
            weight: Number(Math.pow(1.1, depthParen).toFixed(2)),
            isLocked,
        };
    }

    // Syntax: {tag} (NAI style weight boost 1.05)
    let depthBrace = 0;
    let sBrace = trimmed;
    while (sBrace.startsWith("{") && sBrace.endsWith("}")) {
        depthBrace++;
        sBrace = sBrace.slice(1, -1).trim();
    }
    if (depthBrace > 0) {
        return {
            id,
            raw: trimmed,
            cleanText: sBrace,
            weight: Number(Math.pow(1.05, depthBrace).toFixed(2)),
            isLocked,
        };
    }

    // Syntax: [tag] (SD style weight reduction 0.909)
    let depthBracket = 0;
    let sBracket = trimmed;
    while (sBracket.startsWith("[") && sBracket.endsWith("]")) {
        depthBracket++;
        sBracket = sBracket.slice(1, -1).trim();
    }
    if (depthBracket > 0) {
        return {
            id,
            raw: trimmed,
            cleanText: sBracket,
            weight: Number(Math.pow(0.909, depthBracket).toFixed(2)),
            isLocked,
        };
    }

    return {
        id,
        raw: trimmed,
        cleanText: trimmed,
        weight: 1.0,
        isLocked,
    };
}

/**
 * Formats a tag back to its prompt string representation.
 */
export function formatTagString(tag: TagItem): string {
    if (tag.raw && tag.raw.trim()) {
        return tag.raw.trim();
    }
    if (tag.weight === 1.0) {
        return tag.cleanText.trim();
    }
    const wStr = tag.weightStr || tag.weight.toFixed(2);
    return `(${tag.cleanText.trim()}:${wStr})`;
}

/**
 * Tokenizes a raw prompt string by comma, newline, or semicolon while preserving
 * parenthetical weight structures, including grouped weights like (tag1, tag2:1.3).
 */
export function tokenizeRawPrompt(rawPrompt: string, unpackGrouped = true): TagItem[] {
    if (!rawPrompt || !rawPrompt.trim()) return [];

    const rawSegments: string[] = [];
    let current = "";
    let parenDepth = 0;

    for (let i = 0; i < rawPrompt.length; i++) {
        const char = rawPrompt[i];
        if (char === "(" || char === "{" || char === "[") {
            parenDepth++;
            current += char;
        } else if (char === ")" || char === "}" || char === "]") {
            parenDepth = Math.max(0, parenDepth - 1);
            current += char;
        } else if ((char === "," || char === "\n" || char === ";") && parenDepth === 0) {
            const clean = current.trim();
            if (clean) rawSegments.push(clean);
            current = "";
        } else {
            current += char;
        }
    }
    const last = current.trim();
    if (last) rawSegments.push(last);

    const items: TagItem[] = [];

    for (const seg of rawSegments) {
        const trimmed = seg.trim();
        if (!trimmed) continue;

        // Check for grouped weight: (tag1, tag2, tag3:1.3)
        const groupedMatch = trimmed.match(/^\((.+):([0-9.]+)\)$/);
        if (unpackGrouped && groupedMatch && groupedMatch[1].includes(",")) {
            const weightVal = parseFloat(groupedMatch[2]);
            const weight = isNaN(weightVal) ? 1.0 : weightVal;
            const weightStr = groupedMatch[2];
            const tags = groupedMatch[1].split(",").map((t) => t.trim()).filter(Boolean);

            for (const t of tags) {
                items.push({
                    id: generateTagId(),
                    raw: `(${t}:${weightStr})`,
                    cleanText: t,
                    weight,
                    weightStr,
                    isGrouped: true,
                });
            }
        } else {
            items.push(parseTagItem(trimmed));
        }
    }

    return items;
}

/**
 * Deterministic Rules & Heuristic Dictionary for the 16 Categories.
 */
const CATEGORY_RULES_16: Record<CategoryKey, RegExp[]> = {
    // 1. Quality & Rendering
    quality_rendering: [
        /\b(masterpiece|best quality|high quality|great quality|top quality|newest|absurdres|highres|ultra detailed|highly detailed|8k|4k|flawless|hdr|wallpaper|official art|sharp focus|intricate details)\b/i,
    ],

    // 2. Art Style & Coloring
    art_style_coloring: [
        /\b(anime coloring|rich coloring|cel shading|rich cel shading|soft shading|flat color|anime style|anime aesthetic|clean lineart|fine lineart|bold lineart|delicate lineart|sharp lineart|crisp lineart|clean lines|lineart|semi-realistic anime|japanese anime|digital painting|illustration|detailed illustration|visual novel|visual novel art|kyoto animation|ufotable|makoto shinkai|studio ghibli)\b/i,
    ],

    // 3. Character Identity
    character_identity: [
        /\b(tsukatsuki rio|rio tsukatsuki|asuka langley|rei ayanami|hatsune miku|rem|ram|frieren|fern|ganyu|raiden shogun|tifa lockhart|2b|makima|power|anya forger|yor forger|marin kitagawa|blue archive|genshin impact|honkai|evangelion|nier|re:zero)\b/i,
    ],

    // 4. Character Count & Composition
    character_count: [
        /\b(1girl|2girls|3girls|4girls|5girls|6\+girls|1boy|2boys|3boys|solo|solo focus|multiple girls|multiple boys|duo|group|crowd)\b/i,
    ],

    // 5. Anatomy & Body Type
    anatomy_body: [
        /\b(tall female|short female|mature female|slender|slender waist|slim|petite|curvy|hourglass|thick thighs|wide hips|large breasts|medium breasts|small breasts|flat chest|huge breasts|breasts|pale skin|tan skin|dark skin|fair skin|toned body|muscular|abs|collarbone|bare shoulders|cleavage)\b/i,
    ],

    // 6. Hair & Hairstyle
    hair_hairstyle: [
        /\b(black hair|blue hair|blonde hair|brown hair|red hair|pink hair|white hair|silver hair|purple hair|green hair|orange hair|grey hair|two-tone hair|streaked hair)\b/i,
        /\b(hair|ponytail|twintails|twintail|braid|braided|updo|hair up|elegant updo|curls|retro curls|curly hair|straight hair|wavy hair|messy hair|short hair|long hair|medium hair|very long hair|bob cut|ahoge|bangs|blunt bangs|swept bangs|side parted|hair over eyes|drill hair|twin braids|side ponytail|hime cut|long flowing hair|floating hair|shiny hair|glossy hair)\b/i,
    ],

    // 7. Face, Eyes & Expression
    face_expression: [
        /\b(red eyes|blue eyes|green eyes|brown eyes|amber eyes|yellow eyes|purple eyes|pink eyes|black eyes|golden eyes|heterochromia|slit pupils|glowing eyes|sparkling eyes|tareme|tsurime)\b/i,
        /\b(calm expression|calm|blush|shy expression|shy|embarrassed|looking at viewer|looking away|looking to side|looking down|looking up|side glance|head tilt|smile|smiling|soft smile|gentle smile|smirk|grinning|laughing|open mouth|closed mouth|parted lips|serious|serious expression|composed|neutral expression|stoic|pensive|thoughtful|melancholic|sad|crying|tears|frown|pout|angry|annoyed|furious|glaring|flustered|wink|winking|surprised|nervous|determined|seductive|sleepy)\b/i,
    ],

    // 8. Outfit & Accessories
    outfit_accessories: [
        /\b(burgundy dress|dark red dress|red dress|halter dress|halterneck|sleeveless dress|backless dress|mini dress|minidress|tight dress|backless halter dress|backless sleeveless dress|dress|coat|jacket|shirt|blouse|skirt|pleated skirt|pants|shorts|trousers|jeans|sweater|hoodie|cardigan|vest|suit|tuxedo|uniform|school uniform|sailor uniform|gym uniform|maid outfit|bikini|swimsuit|bodysuit|leotard|armor|robe|kimono|yukata)\b/i,
        /\b(white belt|buckle belt|white buckle belt|belt|corset|black sheer thighhighs|sheer black thighhighs|black thighhighs|thighhighs|stockings|pantyhose|socks|kneehighs|boots|knee boots|ankle boots|heels|high heels|shoes|sneakers|sandals|gloves|black gloves|white gloves|fingerless gloves)\b/i,
        /\b(red headband|polka dot headband|polka-dot headband|white polka dot headband|headband|halo|red halo|black halo|overhead halo|floating halo|ribbon|hair ribbon|hair bow|hair clip|hair ornament|scrunchie|hairpin|barrette|wings|horns|cat ears|fox ears|animal ears|tail|glasses|sunglasses|eyepatch|mask|choker|collar|necklace|pendant|earrings|piercing|bracelet|watch|ring|scarf|muffler|tie|necktie|bowtie|hat|beret|cap|crown|tiara|cape|cloak)\b/i,
    ],

    // 9. Pose & Gesture
    pose_gesture: [
        /\b(standing|sitting|kneeling|lying|squatting|leaning|walking|crouching|reclining|perched)\b/i,
        /\b(standing at sliding door|standing in doorway|walking through door|walking through doorway|entering doorway|entering classroom|entering room)\b/i,
        /\b(hand on door|hand on doorframe|hand on door handle|hand on wall|hand on cheek|hand on hip|hands on hips|arms at sides|crossed arms|folded arms|hands behind back|hands in pockets|resting chin|resting head|contrapposto|crossed legs|spread legs|dynamic pose|action pose|relaxed pose)\b/i,
    ],

    // 10. Camera & Framing
    camera_framing: [
        /\b(cowboy shot|medium cowboy shot|close-up|extreme close-up|portrait|bust shot|headshot|upper body|lower body|full body|wide shot|wide angle|long shot|establishing shot)\b/i,
        /\b(eye-level|low angle|high angle|from above|from below|birds-eye view|worms-eye view|dutch angle|tilted frame|front view|side view|back view|three-quarter view|profile|rear view|feet out of frame)\b/i,
    ],

    // 11. Objects & Interaction
    objects_interaction: [
        /\b(holding blue folder|blue folder|document folder|folder|binder|holding book|holding book to chest|book covering chest|book against chest|book|hardcover book|notebook|journal|pen|pencil|scroll|letter|document|papers)\b/i,
        /\b(door handle|sword|katana|blade|dagger|knife|shield|weapon|gun|pistol|rifle|bow|arrow|staff|wand|smartphone|phone|camera|laptop|tablet|umbrella|parasol|cup|mug|glass|bottle|plate|flower|rose|bag|backpack|suitcase|key|lantern)\b/i,
        /\b(holding|clutching|grasping|carrying|hugging|embracing|touching|reaching|pointing|holding object)\b/i,
    ],

    // 12. Background & Location
    background_location: [
        /\b(classroom|classroom desk|wooden desks|wooden desk|blackboard|whiteboard|school window|school hallway|hallway|corridor|sliding door|door|doorway|doorframe)\b/i,
        /\b(indoor|indoors|outdoors|school|library|laboratory|cafe|coffee shop|restaurant|room|bedroom|living room|balcony|terrace|rooftop|stairs)\b/i,
        /\b(forest|snowy forest|woods|trees|garden|flower garden|field|meadow|grass|mountain|lake|river|sea|ocean|beach|sky|clouds|sunset|sunrise|night sky|space)\b/i,
        /\b(city|street|alley|urban|cyberpunk city|tokyo|building|simple background|white background)\b/i,
    ],

    // 13. Lighting & Atmosphere
    lighting_atmosphere: [
        /\b(soft sunlight|window sunlight|window light|sunlight through window|sunlight|sunbeams|sun rays|golden hour|blue hour|morning light|afternoon|afternoon light)\b/i,
        /\b(soft rim lighting|rim lighting|rim light|backlighting|backlit|side lighting|top lighting|volumetric lighting|god rays|chiaroscuro)\b/i,
        /\b(soft shadows|deep shadows|shadows|cinematic lighting|dramatic lighting|studio lighting|natural lighting|ambient lighting|soft glow|glow|neon light|fluorescent light|highlights)\b/i,
    ],

    // 14. Composition & Spatial Layout
    composition_spatial: [
        /\b(centered subject|centered|subject in center|foreground|background|negative space|rule of thirds|classroom desk in background|wooden desks in background|in background|in foreground|depth)\b/i,
    ],

    // 15. Effects & Image Details
    effects_details: [
        /\b(depth of field|sharp focus|blurry background|shallow depth of field|bokeh|bokeh background|motion blur|particles|floating particles|sparks|fog|mist|smoke|falling petals|cherry blossoms|falling snow|snowflakes|falling leaves)\b/i,
    ],

    // 16. Custom & Unclassified (fallback)
    custom_unclassified: [],
};

/**
 * Classifies a tag into one of the 16 categories based on user dictionary or regex rules.
 */
export function classifyTag(
    tag: TagItem,
    userDictionary: Record<string, CategoryKey> = {}
): CategoryKey {
    const norm = normalizeTagKey(tag.cleanText);
    if (!norm) return "custom_unclassified";

    // 1. Check user dictionary overrides first
    if (userDictionary[norm]) {
        return userDictionary[norm];
    }
    if (userDictionary[tag.cleanText]) {
        return userDictionary[tag.cleanText];
    }

    // 2. Test rules in ordered priority
    const priorityKeys: CategoryKey[] = [
        "quality_rendering",
        "art_style_coloring",
        "character_identity",
        "character_count",
        "anatomy_body",
        "hair_hairstyle",
        "face_expression",
        "outfit_accessories",
        "pose_gesture",
        "camera_framing",
        "objects_interaction",
        "background_location",
        "lighting_atmosphere",
        "composition_spatial",
        "effects_details",
    ];

    for (const key of priorityKeys) {
        const patterns = CATEGORY_RULES_16[key] || [];
        for (const pattern of patterns) {
            if (pattern.test(norm)) {
                return key;
            }
        }
    }

    // Fallback: Custom & Unclassified
    return "custom_unclassified";
}

/**
 * Creates an empty CategoryStateMap with default locks from CATEGORY_SCHEMA_16.
 */
export function createEmptyCategoryMap(): CategoryStateMap {
    const map = {} as CategoryStateMap;
    for (const item of CATEGORY_SCHEMA_16) {
        map[item.key] = {
            tags: [],
            isLocked: item.defaultLocked,
            isEnabled: true,
        };
    }
    return map;
}

/**
 * Parses a raw prompt string into the 16 CategoryStateMap.
 */
export function parsePromptToCategoryMap(
    rawPrompt: string,
    existingLocks?: Partial<Record<CategoryKey, boolean>>,
    userDictionary: Record<string, CategoryKey> = {}
): CategoryStateMap {
    const tokens = tokenizeRawPrompt(rawPrompt, true);
    const categoryMap = createEmptyCategoryMap();

    // Preserve existing lock states if provided
    if (existingLocks) {
        for (const key of Object.keys(categoryMap) as CategoryKey[]) {
            if (typeof existingLocks[key] === "boolean") {
                categoryMap[key].isLocked = existingLocks[key]!;
            }
        }
    }

    // Classify each token
    for (const token of tokens) {
        const cat = classifyTag(token, userDictionary);
        categoryMap[cat].tags.push(token);
    }

    return categoryMap;
}

/**
 * Reconstructs a prompt string from a CategoryStateMap following the specified category order.
 */
export function reconstructPrompt(
    categoryMap: CategoryStateMap,
    categoryOrder: CategoryKey[] = DEFAULT_CATEGORY_ORDER
): string {
    const promptTokens: string[] = [];

    for (const catKey of categoryOrder) {
        const state = categoryMap[catKey];
        if (!state || !state.isEnabled) continue;

        for (const tag of state.tags) {
            const formatted = formatTagString(tag);
            if (formatted) {
                promptTokens.push(formatted);
            }
        }
    }

    return promptTokens.join(", ");
}

/**
 * Known mutually exclusive value clusters for conservative conflict detection.
 */
const CONFLICT_CLUSTERS: Record<string, string[][]> = {
    eyes_color: [
        ["red eyes", "blue eyes", "green eyes", "amber eyes", "yellow eyes", "purple eyes", "pink eyes", "black eyes", "brown eyes"],
    ],
    hair_length: [
        ["short hair", "very long hair", "long hair", "medium hair"],
    ],
    hair_color: [
        ["black hair", "blonde hair", "white hair", "silver hair", "blue hair", "red hair", "pink hair", "green hair", "purple hair", "brown hair"],
    ],
    posture_action: [
        ["standing", "sitting", "kneeling", "lying", "crouching"],
    ],
    outfit_primary: [
        ["burgundy dress", "school uniform", "sailor uniform", "maid outfit", "bikini", "swimsuit", "armor"],
    ],
    bust_size: [
        ["flat chest", "small breasts", "medium breasts", "large breasts", "huge breasts"],
    ],
};

/**
 * Evaluates whether two tags represent a semantic conflict.
 */
export function detectTagConflict(
    tagA: string,
    tagB: string
): { isConflict: boolean; cluster?: string } {
    const normA = normalizeTagKey(tagA);
    const normB = normalizeTagKey(tagB);

    if (normA === normB) {
        return { isConflict: false };
    }

    for (const [clusterName, clusterGroups] of Object.entries(CONFLICT_CLUSTERS)) {
        for (const group of clusterGroups) {
            const hasA = group.some((item) => normA.includes(item) || item.includes(normA));
            const hasB = group.some((item) => normB.includes(item) || item.includes(normB));
            if (hasA && hasB && normA !== normB) {
                return { isConflict: true, cluster: clusterName };
            }
        }
    }

    return { isConflict: false };
}

/**
 * Checks for style contradiction tags (e.g. photorealistic in anime flow).
 */
export function checkStyleContradictions(tags: TagItem[]): string[] {
    const warnings: string[] = [];
    const contradictionPatterns = [
        { pattern: /\b(photorealistic|photo|photograph|dslr|hyperrealistic|realistic skin)\b/i, name: "Photorealistic / Real Photo" },
        { pattern: /\b(3d render|octane render|unreal engine|blender render)\b/i, name: "3D Rendering / Octane" },
        { pattern: /\b(excessive skin gloss|greasy skin|oily skin)\b/i, name: "Excessive Skin Gloss" },
    ];

    for (const tag of tags) {
        for (const { pattern, name } of contradictionPatterns) {
            if (pattern.test(tag.cleanText)) {
                warnings.push(
                    `Peringatan Gaya: Tag "${tag.raw}" berpotensi merusak estetika anime 2D/cel-shading (${name}).`
                );
            }
        }
    }

    return warnings;
}

/**
 * Pure Deterministic Prompt Merger Engine.
 * Implements the 10-step pipeline specified in Section 7.
 */
export function mergePrompt({
    masterCategories,
    sceneCategories,
    categoryOrder = DEFAULT_CATEGORY_ORDER,
    mergePolicy = "master_first",
    defaultNegative = "",
    sceneNegative = "",
}: {
    masterCategories: CategoryStateMap;
    sceneCategories: CategoryStateMap;
    categoryOrder?: CategoryKey[];
    mergePolicy?: MergePolicy;
    defaultNegative?: string;
    sceneNegative?: string;
    userDictionary?: Record<string, CategoryKey>;
}): MergePromptResult {
    const conflicts: ConflictReportItem[] = [];
    const duplicates: Array<{ tag: string; reason: string }> = [];
    const weightMismatches: WeightMismatchItem[] = [];
    const warnings: string[] = [];
    const outputCategories = {} as Record<CategoryKey, TagItem[]>;
    const tagsByCategory = {} as Record<CategoryKey, string[]>;

    let totalMasterTags = 0;
    let totalSceneTags = 0;
    let mergedCount = 0;
    let lockedCount = 0;
    let overriddenCount = 0;
    let unclassifiedCount = 0;

    // Check style contradictions across both inputs
    const allTags = [
        ...Object.values(masterCategories).flatMap((c) => c.tags),
        ...Object.values(sceneCategories).flatMap((c) => c.tags),
    ];
    const styleWarnings = checkStyleContradictions(allTags);

    for (const catKey of categoryOrder) {
        const masterState = masterCategories[catKey] || { tags: [], isLocked: false, isEnabled: true };
        const sceneState = sceneCategories[catKey] || { tags: [], isLocked: false, isEnabled: true };
        const catSchema = CATEGORY_MAP[catKey] || { label: catKey };

        totalMasterTags += masterState.tags.length;
        totalSceneTags += sceneState.tags.length;

        // Check if category is disabled in master or scene
        const isCatEnabled = masterState.isEnabled !== false && sceneState.isEnabled !== false;
        if (!isCatEnabled) {
            outputCategories[catKey] = [];
            tagsByCategory[catKey] = [];
            continue;
        }

        const isLocked = masterState.isLocked;
        if (isLocked) {
            lockedCount++;
        }

        const resultTags: TagItem[] = [];
        const seenNorms = new Set<string>();

        // STEP: Evaluate locks & policy
        if (isLocked) {
            // Master is locked: master tags are AUTHORITATIVE.
            for (const mTag of masterState.tags) {
                const norm = normalizeTagKey(mTag.cleanText);
                seenNorms.add(norm);
                resultTags.push({ ...mTag, isLocked: true });
            }

            // Check if scene attempted an override or introduced duplicates
            for (const sTag of sceneState.tags) {
                const sNorm = normalizeTagKey(sTag.cleanText);

                if (seenNorms.has(sNorm)) {
                    // Exact or normalized duplicate
                    duplicates.push({
                        tag: sTag.raw,
                        reason: `Kategori [${catSchema.label}] terkunci. Tag duplikat adegan diabaikan.`,
                    });
                    // Check weight mismatch
                    const matchingMaster = masterState.tags.find(
                        (m) => normalizeTagKey(m.cleanText) === sNorm
                    );
                    if (matchingMaster && matchingMaster.weight !== sTag.weight) {
                        weightMismatches.push({
                            tag: sTag.cleanText,
                            masterWeight: matchingMaster.weight,
                            sceneWeight: sTag.weight,
                            resolution: `Mempertahankan bobot master (${matchingMaster.weight}) karena kategori terkunci.`,
                        });
                    }
                } else {
                    // Check if scene conflicts with any locked master tag
                    let hadConflict = false;
                    for (const mTag of masterState.tags) {
                        const conflictCheck = detectTagConflict(mTag.cleanText, sTag.cleanText);
                        if (conflictCheck.isConflict) {
                            hadConflict = true;
                            conflicts.push({
                                category: catKey,
                                categoryLabel: catSchema.label,
                                masterValue: mTag.raw,
                                sceneValue: sTag.raw,
                                resolution: `Mempertahankan "${mTag.raw}" (Master Terkunci)`,
                                reason: `Konflik nilai pada ${conflictCheck.cluster || "atribut"}. Kategori terkunci mencegah penimpaan.`,
                                lockPreventedOverride: true,
                            });
                            break;
                        }
                    }

                    if (!hadConflict) {
                        // Even if not a direct conflict, locked category rejects scene extensions by default
                        // unless user explicitly sets unlocked
                        duplicates.push({
                            tag: sTag.raw,
                            reason: `Kategori [${catSchema.label}] terkunci. Tag adegan "${sTag.raw}" tidak disisipkan.`,
                        });
                    }
                }
            }
        } else {
            // UNLOCKED CATEGORY: Resolve according to mergePolicy
            switch (mergePolicy) {
                case "scene_override": {
                    // Scene replaces unlocked category completely if scene has tags
                    if (sceneState.tags.length > 0) {
                        overriddenCount += masterState.tags.length;
                        for (const sTag of sceneState.tags) {
                            const sNorm = normalizeTagKey(sTag.cleanText);
                            seenNorms.add(sNorm);
                            resultTags.push(sTag);
                        }
                        if (masterState.tags.length > 0) {
                            conflicts.push({
                                category: catKey,
                                categoryLabel: catSchema.label,
                                masterValue: masterState.tags.map((t) => t.raw).join(", "),
                                sceneValue: sceneState.tags.map((t) => t.raw).join(", "),
                                resolution: `Ditranslasikan dengan nilai adegan (Scene Override)`,
                                reason: `Kebijakan Scene Override aktif untuk kategori tidak terkunci.`,
                                lockPreventedOverride: false,
                            });
                        }
                    } else {
                        // Fallback to master if scene has no tags
                        for (const mTag of masterState.tags) {
                            resultTags.push(mTag);
                        }
                    }
                    break;
                }

                case "scene_first": {
                    // Scene tags are prioritized, master tags fill in missing non-conflicting items
                    const sceneNorms = new Set<string>();
                    for (const sTag of sceneState.tags) {
                        const sNorm = normalizeTagKey(sTag.cleanText);
                        sceneNorms.add(sNorm);
                        resultTags.push(sTag);
                    }

                    for (const mTag of masterState.tags) {
                        const mNorm = normalizeTagKey(mTag.cleanText);
                        if (sceneNorms.has(mNorm)) {
                            duplicates.push({
                                tag: mTag.raw,
                                reason: `Tag duplikat master "${mTag.raw}" dilewati demi tag adegan.`,
                            });
                            continue;
                        }

                        // Check conflict
                        let hasConflict = false;
                        for (const sTag of sceneState.tags) {
                            const conflictCheck = detectTagConflict(mTag.cleanText, sTag.cleanText);
                            if (conflictCheck.isConflict) {
                                hasConflict = true;
                                conflicts.push({
                                    category: catKey,
                                    categoryLabel: catSchema.label,
                                    masterValue: mTag.raw,
                                    sceneValue: sTag.raw,
                                    resolution: `Memilih "${sTag.raw}" (Scene First)`,
                                    reason: `Konflik ${conflictCheck.cluster || "atribut"}. Nilai adegan didahulukan.`,
                                    lockPreventedOverride: false,
                                });
                                break;
                            }
                        }

                        if (!hasConflict) {
                            resultTags.push(mTag);
                        }
                    }
                    break;
                }

                case "master_plus_scene":
                case "master_first":
                default: {
                    // Master first: keep master tags, append unique non-conflicting scene tags
                    for (const mTag of masterState.tags) {
                        const mNorm = normalizeTagKey(mTag.cleanText);
                        seenNorms.add(mNorm);
                        resultTags.push(mTag);
                    }

                    for (const sTag of sceneState.tags) {
                        const sNorm = normalizeTagKey(sTag.cleanText);
                        if (seenNorms.has(sNorm)) {
                            duplicates.push({
                                tag: sTag.raw,
                                reason: `Tag duplikat adegan "${sTag.raw}" dihapus dari penggabungan.`,
                            });
                            const matchingMaster = masterState.tags.find(
                                (m) => normalizeTagKey(m.cleanText) === sNorm
                            );
                            if (matchingMaster && matchingMaster.weight !== sTag.weight) {
                                weightMismatches.push({
                                    tag: sTag.cleanText,
                                    masterWeight: matchingMaster.weight,
                                    sceneWeight: sTag.weight,
                                    resolution: `Mempertahankan bobot master (${matchingMaster.weight}) sesuai kebijakan Master First.`,
                                });
                            }
                            continue;
                        }

                        // Check conflict with master tags
                        let hasConflict = false;
                        for (const mTag of masterState.tags) {
                            const conflictCheck = detectTagConflict(mTag.cleanText, sTag.cleanText);
                            if (conflictCheck.isConflict) {
                                hasConflict = true;
                                conflicts.push({
                                    category: catKey,
                                    categoryLabel: catSchema.label,
                                    masterValue: mTag.raw,
                                    sceneValue: sTag.raw,
                                    resolution: `Mempertahankan "${mTag.raw}" (Master First)`,
                                    reason: `Konflik ${conflictCheck.cluster || "atribut"}. Master didahulukan.`,
                                    lockPreventedOverride: false,
                                });
                                break;
                            }
                        }

                        if (!hasConflict) {
                            seenNorms.add(sNorm);
                            resultTags.push(sTag);
                        }
                    }
                    break;
                }
            }
        }

        if (catKey === "custom_unclassified") {
            unclassifiedCount = resultTags.length;
        }

        mergedCount += resultTags.length;
        outputCategories[catKey] = resultTags;
        tagsByCategory[catKey] = resultTags.map((t) => formatTagString(t));
    }

    // Deterministic positive prompt reconstruction
    const positiveTokens: string[] = [];
    for (const catKey of categoryOrder) {
        const tags = outputCategories[catKey] || [];
        for (const tag of tags) {
            const formatted = formatTagString(tag);
            if (formatted) {
                positiveTokens.push(formatted);
            }
        }
    }
    const positivePrompt = positiveTokens.join(", ");

    // Deterministic negative prompt merge (deduplicate tags)
    const negTokens: string[] = [];
    const seenNeg = new Set<string>();

    const rawNegatives = [defaultNegative, sceneNegative].filter(Boolean).join(", ");
    const parsedNegTags = tokenizeRawPrompt(rawNegatives, false);

    for (const neg of parsedNegTags) {
        const norm = normalizeTagKey(neg.cleanText);
        if (!seenNeg.has(norm)) {
            seenNeg.add(norm);
            negTokens.push(formatTagString(neg));
        }
    }
    const negativePrompt = negTokens.join(", ");

    const diagnostics: MergeDiagnostics = {
        conflicts,
        duplicates,
        weightMismatches,
        warnings,
        styleWarnings,
        stats: {
            totalMasterTags,
            totalSceneTags,
            mergedCount,
            lockedCount,
            overriddenCount,
            unclassifiedCount,
        },
    };

    return {
        positivePrompt,
        negativePrompt,
        categoryOutput: outputCategories,
        diagnostics,
        tagsByCategory,
    };
}
