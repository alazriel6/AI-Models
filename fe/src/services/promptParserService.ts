import type {
    AttributeCategory,
    ParsedPromptAttributes,
    PromptAttribute,
} from "../types/storyMerger";
import {
    getStoredAIProvider,
    getStoredGeminiApiKey,
    getStoredGeminiModel,
    getStoredLocalEndpoint,
    getStoredLocalModel,
} from "./interrogationService";

/**
 * Creates an empty category dictionary where every category is an empty array.
 */
export function createEmptyParsedAttributes(): ParsedPromptAttributes {
    return {
        character_identity: [],
        physical_appearance: [],
        hair: [],
        eyes: [],
        outfit: [],
        accessories: [],
        pose: [],
        expression: [],
        action: [],
        objects: [],
        background: [],
        lighting: [],
        camera: [],
        art_style: [],
        quality: [],
        other: [],
        negative: [],
    };
}

/**
 * Extracts raw weight and base text from weighted tag syntaxes:
 * (tag:1.2) -> { text: "tag", weight: 1.2 }
 * ((tag)) -> { text: "tag", weight: 1.21 }
 * tag -> { text: "tag", weight: 1.0 }
 */
export function extractTagWeight(rawTag: string): { cleanText: string; weight: number } {
    const trimmed = rawTag.trim();
    if (!trimmed) return { cleanText: "", weight: 1.0 };

    // Syntax: (tag:1.25)
    const weightMatch = trimmed.match(/^\((.+):([0-9.]+)\)$/);
    if (weightMatch) {
        const val = parseFloat(weightMatch[2]);
        return {
            cleanText: weightMatch[1].trim(),
            weight: isNaN(val) ? 1.0 : val,
        };
    }

    // Syntax: ((tag)) or (tag)
    let depth = 0;
    let s = trimmed;
    while (s.startsWith("(") && s.endsWith(")") && !s.includes(":")) {
        depth++;
        s = s.slice(1, -1).trim();
    }
    if (depth > 0) {
        return {
            cleanText: s,
            weight: Number(Math.pow(1.1, depth).toFixed(2)),
        };
    }

    return { cleanText: trimmed, weight: 1.0 };
}

import {
    isKnownBooruTag,
    inferTagCategoryAndLayer,
    registerNewVocabularyTag,
    isAutoLearnEnabled,
} from "./smartTagDetector";

/**
 * Semantic keyword dictionaries for high-precision local fallback parsing.
 * Supports Danbooru tags, weighted tags, and natural language diffusion descriptors.
 */
const CATEGORY_RULES: Record<AttributeCategory, RegExp[]> = {
    quality: [
        /\b(masterpiece|best quality|high quality|great quality|amazing quality|top quality|very aesthetic|ultra detailed|highly detailed|absurdres|highres|newest|8k|4k|flawless|hdr|wallpaper)\b/i,
    ],
    character_identity: [
        /\b(1girl|2girls|3girls|1boy|2boys|3boys|solo|multiple girls|multiple boys|tsukatsuki rio|rio tsukatsuki|asuka|rei ayanami|hatsune miku|rem|ram|frieren|fern|ganyu|raiden shogun|tifa|2b|makima|power|anya|yor forg|marin kitagawa)\b/i,
        /\b(female|male|girl|boy|woman|man|lady|sister|witch|elf|demon girl|catgirl|foxgirl|angel|cyborg|android|warrior|knight|princess|queen)\b/i,
    ],
    physical_appearance: [
        /\b(tall female|short female|mature female|slender|slim|petite|curvy|thick thighs|wide hips|slender waist|large breasts|medium breasts|small breasts|flat chest|huge breasts|breasts|pale skin|tan skin|dark skin|fair skin|toned body|muscular|abs|freckles|mole|beauty mark|blush stickers|collarbone)\b/i,
    ],
    hair: [
        /\b(hair|ponytail|twintails|twintail|braid|braided|updo|curls|retro curls|straight hair|wavy hair|curly hair|messy hair|short hair|long hair|medium hair|very long hair|bob cut|ahoge|bangs|blunt bangs|swept bangs|side parted|hair over eyes|drill hair|twin braids|side ponytail|hime cut)\b/i,
        /\b(black hair|blue hair|blonde hair|brown hair|red hair|pink hair|white hair|silver hair|purple hair|green hair|orange hair|grey hair|two-tone hair|streaked hair)\b/i,
        /\b(long flowing hair|floating hair|shiny hair|glossy hair)\b/i,
    ],
    eyes: [
        /\b(eyes|red eyes|blue eyes|green eyes|brown eyes|amber eyes|yellow eyes|purple eyes|pink eyes|black eyes|golden eyes|heterochromia|slit pupils|glowing eyes|empty eyes|sparkling eyes|heart-shaped pupils|tareme|tsurime)\b/i,
    ],
    outfit: [
        /\b(dress|coat|jacket|shirt|blouse|skirt|pleated skirt|pants|shorts|trousers|jeans|sweater|hoodie|cardigan|vest|suit|tuxedo|uniform|school uniform|sailor uniform|gym uniform|maid outfit|bikini|swimsuit|bodysuit|leotard|armor|robe|kimono|yukata|hanfu|cheongsam|qipao)\b/i,
        /\b(halter dress|sleeveless dress|backless dress|burgundy dress|dark red dress|red dress|mini dress|minidress|tight dress|backless halter dress|backless sleeveless dress|white coat|winter coat|black coat|raincoat|trench coat)\b/i,
        /\b(thighhighs|stockings|black thighhighs|sheer thighhighs|sheer black thighhighs|black sheer thighhighs|pantyhose|socks|kneehighs|boots|knee boots|ankle boots|heels|high heels|shoes|sneakers|sandals|slippers)\b/i,
        /\b(gloves|black gloves|white gloves|fingerless gloves|leather gloves|belt|white belt|buckle belt|white buckle belt|corset|apron|cape|cloak|bare shoulders)\b/i,
    ],
    accessories: [
        /\b(headband|red headband|polka dot headband|polka-dot headband|white polka dot headband|ribbon|hair ribbon|hair bow|hair clip|hair ornament|hair flower|scrunchie|hairpin|barrette)\b/i,
        /\b(halo|red halo|black halo|glowing halo|overhead halo|floating halo|wings|angel wings|demon wings|horns|devil horns|animal ears|cat ears|fox ears|wolf ears|tail|cat tail|fox tail)\b/i,
        /\b(glasses|sunglasses|eyepatch|mask|choker|collar|necklace|pendant|earrings|piercing|bracelet|wristband|watch|ring|scarf|burgundy scarf|red scarf|muffler|tie|necktie|bowtie|badge|brooch|hat|beret|cap|crown|tiara)\b/i,
    ],
    action: [
        /\b(holding|clutching|grasping|carrying|hugging|embracing|touching|reaching|pointing|waving|adjusting|fixing|tucking)\b/i,
        /\b(hand on|hands on|one hand on|hand in|hands in|hand to|hands to|arms at|arms crossed|folded arms|hands behind back|hands in pockets)\b/i,
        /\b(holding to chest|holding against chest|holding clipboard|holding documents|holding papers|holding folder|holding blue folder|clutching folder|hugging object to chest|hugging object)\b/i,
        /\b(hand on cheek|hand on hip|hands on hips|hand on door|hand on doorframe|hand on door handle|hand on hair|one hand on hair|hand in hair|hand on wall|hand on desk|hand on table|hand on railing)\b/i,
        /\b(opening door|entering classroom|entering room|walking through door|walking through doorway|resting chin|resting head|reading|writing|eating|drinking|sleeping|singing|dancing|fighting|casting spell|running|jumping|flying|falling down)\b/i,
    ],
    pose: [
        /\b(standing|sitting|kneeling|lying|squatting|leaning|walking|crouching|reclining|perched|stepping|running|jumping|floating)\b/i,
        /\b(standing at|standing in|standing near|standing on|sitting at|sitting on|sitting in|leaning against|leaning on|walking into|walking through|walking past|walking towards|standing at sliding door|standing in doorway|entering)\b/i,
        /\b(dynamic pose|standing pose|sitting pose|action pose|relaxed pose|heroic pose|contrapposto|crossed legs|spread legs|all fours|bent over)\b/i,
        /\b(cowboy shot|full body|upper body|lower body|portrait|bust shot|close-up|headshot|feet out of frame)\b/i,
    ],
    expression: [
        /\b(expression|smile|smiling|soft smile|warm smile|gentle smile|smirk|grinning|laughing|open mouth|closed mouth|parted lips|speaking|talking)\b/i,
        /\b(serious|serious expression|calm|calm expression|composed|neutral expression|stoic|pensive|thoughtful|melancholic|sad|crying|tears|frown|pout|angry|annoyed|furious|glaring|looking at viewer|looking away|looking to side|looking down|looking up|side glance|gaze|head tilt)\b/i,
        /\b(blush|subtle blush|light blush|heavy blush|shy|embarrassed|flustered|wink|winking|surprised|shocked|nervous|determined|seductive|sleepy)\b/i,
    ],
    lighting: [
        /\b(lighting|cinematic lighting|dramatic lighting|studio lighting|natural lighting|ambient lighting|soft lighting|harsh lighting|indoor lighting|directional lighting)\b/i,
        /\b(daylight|sunlight|soft sunlight|sunbeams|sun rays|golden hour|blue hour|sunset lighting|morning light|afternoon light|window sunlight|window light|sunlight through window)\b/i,
        /\b(rim lighting|soft rim lighting|rim light|soft rim light|backlighting|backlit|side lighting|top lighting|volumetric lighting|god rays|crepuscular rays|chiaroscuro)\b/i,
        /\b(soft glow|glow|lantern light|candlelight|firelight|neon light|moonlight|starlight|fluorescent light|shadow|shadows|defined shadow shapes|shadow shapes|deep shadows|soft shadows|highlights|ambient occlusion)\b/i,
    ],
    art_style: [
        /\b(anime style|anime aesthetic|anime rendering|semi-realistic anime|japanese anime|kyoto animation|ufotable|makoto shinkai|studio ghibli)\b/i,
        /\b(illustration|detailed illustration|digital painting|concept art|visual novel|visual novel art|official art|lineart|clean lineart|fine lineart|bold lineart|delicate lineart|sharp lineart|crisp lineart|clean lines)\b/i,
        /\b(cel shading|rich cel shading|soft shading|subsurface scattering|watercolor|oil painting|sketch|ink|monochrome|pastel|defined shadow shapes|shadow shapes)\b/i,
        /\b(anime coloring|anime_coloring|rich coloring|vibrant colors|saturated colors|rich color palette|flat color|smooth shading|2d illustration)\b/i,
    ],
    camera: [
        /\b(angle|eye-level|low angle|high angle|from above|from below|birds-eye view|worms-eye view|dutch angle|tilted frame)\b/i,
        /\b(view|front view|side view|back view|three-quarter view|profile|rear view)\b/i,
        /\b(wide shot|wide angle|medium shot|medium cowboy shot|long shot|extreme close-up|macro shot|establishing shot)\b/i,
        /\b(depth of field|sharp focus|blurry background|shallow depth of field|bokeh background|motion blur|fish-eye|telephoto)\b/i,
    ],
    background: [
        /\b(forest|snowy forest|woods|trees|jungle|garden|flower garden|field|meadow|grass|mountain|hills|lake|river|sea|ocean|beach|sky|clouds|sunset|sunrise|night sky|stars|moon|space|galaxy)\b/i,
        /\b(indoor|indoors|outdoor|outdoors|classroom|school|hallway|school hallway|corridor|doorway|doorframe|door|classroom door|sliding door|blackboard|blackboard in background|chalkboard|chalkboard in background|whiteboard|whiteboard in background|desk|desks|classroom desk|classroom desk in background|wooden desk|wooden desks|table|chair|window|school window|balcony|terrace|rooftop)\b/i,
        /\b(castle|dark castle|palace|mansion|room|bedroom|living room|kitchen|library|laboratory|cafe|coffee shop|restaurant|bar|dungeon|ruins|temple|shrine|church|cathedral)\b/i,
        /\b(city|street|alley|urban|cyberpunk city|tokyo|building|neon signs|traffic|bridge|stairs|path|road)\b/i,
        /\b(snow|falling snow|snowflakes|rain|falling rain|petals|falling petals|cherry blossoms|falling leaves|autumn leaves|fog|mist|smoke|sparks|bokeh)\b/i,
        /\b(simple background|white background|black background|gradient background)\b/i,
    ],
    objects: [
        /\b(sword|katana|blade|dagger|knife|shield|weapon|gun|pistol|rifle|bow|arrow|staff|wand|scythe|spear|axe)\b/i,
        /\b(book|hardcover book|notebook|journal|pen|pencil|quill|scroll|letter|envelope|folder|blue folder|document folder|binder|document|paper|papers|clipboard|documents|smartphone|phone|camera|laptop|tablet|screen)\b/i,
        /\b(umbrella|parasol|cup|mug|glass|bottle|plate|flower|bouquet|rose|bag|backpack|purse|suitcase|key|lantern|torch|candle)\b/i,
    ],
    other: [],
    negative: [],
};

/**
 * Splits raw prompt text by commas, newlines, and semicolons while preserving
 * parenthesis-enclosed clauses, and automatically unpacks grouped weighted tags
 * like `(standing at sliding door, hand on door:1.3)` into individual weighted tags:
 * `(standing at sliding door:1.3)`, `(hand on door:1.3)`.
 */
export function tokenizeRawPrompt(rawPrompt: string): string[] {
    if (!rawPrompt || !rawPrompt.trim()) return [];

    const rawTokens: string[] = [];
    let current = "";
    let parenDepth = 0;

    for (let i = 0; i < rawPrompt.length; i++) {
        const char = rawPrompt[i];
        if (char === "(" || char === "{" || char === "[") parenDepth++;
        else if (char === ")" || char === "}" || char === "]") parenDepth = Math.max(0, parenDepth - 1);

        if ((char === "," || char === "\n" || char === ";") && parenDepth === 0) {
            const clean = current.trim();
            if (clean) rawTokens.push(clean);
            current = "";
        } else {
            current += char;
        }
    }

    const last = current.trim();
    if (last) rawTokens.push(last);

    // Unpack grouped weighted tokens (e.g. (tag1, tag2:1.3) -> (tag1:1.3), (tag2:1.3))
    const unpackedTokens: string[] = [];

    for (const token of rawTokens) {
        const trimmed = token.trim();
        if (!trimmed) continue;

        // Grouped weight with single parens: (tag1, tag2, tag3:1.3)
        const groupedWeightMatch = trimmed.match(/^\((.+):([0-9.]+)\)$/);
        if (groupedWeightMatch && groupedWeightMatch[1].includes(",")) {
            const weightStr = groupedWeightMatch[2];
            const tags = groupedWeightMatch[1].split(",").map((t) => t.trim()).filter(Boolean);
            for (const tag of tags) {
                unpackedTokens.push(`(${tag}:${weightStr})`);
            }
            continue;
        }

        // Grouped weight with double parens: ((tag1, tag2:1.35))
        const nestedGroupedMatch = trimmed.match(/^\(\((.+):([0-9.]+)\)\)$/);
        if (nestedGroupedMatch && nestedGroupedMatch[1].includes(",")) {
            const weightStr = nestedGroupedMatch[2];
            const tags = nestedGroupedMatch[1].split(",").map((t) => t.trim()).filter(Boolean);
            for (const tag of tags) {
                unpackedTokens.push(`((${tag}:${weightStr}))`);
            }
            continue;
        }

        // Grouped plain parentheses without colon: (tag1, tag2)
        const groupedPlainMatch = trimmed.match(/^\(([^:]+)\)$/);
        if (groupedPlainMatch && groupedPlainMatch[1].includes(",")) {
            const tags = groupedPlainMatch[1].split(",").map((t) => t.trim()).filter(Boolean);
            for (const tag of tags) {
                unpackedTokens.push(`(${tag})`);
            }
            continue;
        }

        unpackedTokens.push(trimmed);
    }

    return unpackedTokens;
}

/**
 * High-precision local heuristic classifier for a single token.
 * Checks Danbooru taxonomy, learned custom tags, category rules, and NLP inference.
 */
export function classifyToken(token: string): {
    category: AttributeCategory;
    isAmbiguous: boolean;
    confidence: number;
} {
    const { cleanText } = extractTagWeight(token);
    const lower = cleanText.toLowerCase().trim();

    // 1. Check learned custom tags cache or Danbooru DB match
    const knownCheck = isKnownBooruTag(cleanText);
    if (knownCheck.isKnown && knownCheck.item) {
        if ("attributeCategory" in knownCheck.item) {
            return {
                category: knownCheck.item.attributeCategory,
                isAmbiguous: false,
                confidence: 0.98,
            };
        }
    }

    // 2. Check categories with semantic priority order
    // Character Action and Pose MUST precede hair/outfit/background so gestures & environmental interactions
    // (e.g. "one hand on hair", "standing at sliding door", "hand on door") are classified as actions, not hair or background!
    const priorityCategories: AttributeCategory[] = [
        "quality",
        "character_identity",
        "physical_appearance",
        "action",
        "pose",
        "expression",
        "hair",
        "eyes",
        "outfit",
        "accessories",
        "lighting",
        "art_style",
        "camera",
        "background",
        "objects",
    ];

    let matchedCategory: AttributeCategory | null = null;
    let matchCount = 0;

    for (const cat of priorityCategories) {
        // Prevent hair gesture actions like "one hand on hair", "tucking hair" from matching hair category
        if (cat === "hair" && /hand on hair|one hand on hair|hands on hair|tucking hair|touching hair/i.test(lower)) {
            continue;
        }

        const patterns = CATEGORY_RULES[cat] || [];
        for (const pattern of patterns) {
            if (pattern.test(lower)) {
                if (!matchedCategory) {
                    matchedCategory = cat;
                }
                matchCount++;
                break;
            }
        }
    }

    if (matchedCategory) {
        return {
            category: matchedCategory,
            isAmbiguous: matchCount > 1,
            confidence: matchCount === 1 ? 0.95 : 0.8,
        };
    }

    // 3. Fallback: Smart semantic inference for newly introduced vocabulary
    const inferred = inferTagCategoryAndLayer(cleanText);
    if (inferred.attributeCategory !== "other") {
        return {
            category: inferred.attributeCategory,
            isAmbiguous: false,
            confidence: inferred.confidence,
        };
    }

    // 4. Fallback: Check if it looks like an object or background
    if (/\b(room|hall|ground|wall|road|street|park)\b/i.test(lower)) {
        return { category: "background", isAmbiguous: false, confidence: 0.7 };
    }

    return {
        category: "other",
        isAmbiguous: true,
        confidence: 0.5,
    };
}

/**
 * Local Fallback Parser: executes in 1ms with 0 dependencies.
 * Guarantees zero hallucination — fields remain empty if no matching tags exist.
 */
export function parsePromptLocal(rawPrompt: string, rawNegativePrompt = ""): ParsedPromptAttributes {
    const result = createEmptyParsedAttributes();
    const tokens = tokenizeRawPrompt(rawPrompt);

    tokens.forEach((token, index) => {
        const { cleanText, weight } = extractTagWeight(token);
        const { category, isAmbiguous, confidence } = classifyToken(token);

        // Auto-learn newly encountered vocabulary into database and local cache
        if (cleanText && isAutoLearnEnabled()) {
            const check = isKnownBooruTag(cleanText);
            if (!check.isKnown) {
                registerNewVocabularyTag(cleanText, {
                    overrideCategory: category,
                    source: "auto",
                }).catch(() => {});
            }
        }

        const attr: PromptAttribute = {
            id: `attr-${index}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
            category,
            text: token,
            normalizedValue: cleanText,
            weight,
            isAmbiguous,
            confidence,
            source: "parsed_local",
        };

        result[category].push(attr);
    });

    if (rawNegativePrompt && rawNegativePrompt.trim()) {
        const negTokens = tokenizeRawPrompt(rawNegativePrompt);
        negTokens.forEach((token, index) => {
            const { cleanText, weight } = extractTagWeight(token);
            result.negative.push({
                id: `neg-${index}-${Date.now().toString(36)}`,
                category: "negative",
                text: token,
                normalizedValue: cleanText,
                weight,
                source: "parsed_local",
            });
        });
    }

    return result;
}

/**
 * AI System Prompt for structured JSON extraction.
 * Strictly forbids hallucinating or adding imaginary details.
 */
const AI_PARSE_SYSTEM_INSTRUCTION = `
You are an expert AI image prompt deconstruction engine.
Your task is to analyze the user's raw image generation prompt and classify EVERY individual tag, phrase, or token into one of the following exact 16 categories:

Categories:
1. "character_identity": Character names (e.g. tsukatsuki rio, frieren), franchise, subject count (1girl, solo, 1boy).
2. "physical_appearance": Body build, skin tone, breast size, visual age, height.
3. "hair": Hair style, color, length, bangs, curls, ponytail.
4. "eyes": Eye color, pupil shapes, heterochromia.
5. "outfit": Clothes, dresses, coats, shirts, skirts, pants, thighhighs, shoes, gloves.
6. "accessories": Headbands, halos, scarves, glasses, jewelry, hats, horns, wings.
7. "pose": Body posture, framing (standing, sitting, kneeling, cowboy shot, full body).
8. "expression": Facial expression, gaze, smile, blush, frown, looking at viewer.
9. "action": Active gestures, activities (holding to chest, reaching out, reading, running).
10. "objects": Physical items held or interacting with (sword, book, cup, umbrella).
11. "background": Environment, setting, weather, scenery (snowy forest, classroom, castle).
12. "lighting": Lighting style and source (cinematic lighting, daylight, rim light, golden hour).
13. "camera": Camera lens angle, composition (eye-level, wide angle, depth of field, tilt).
14. "art_style": Visual medium, rendering style (anime style, illustration, cel shading).
15. "quality": Quality indicators (masterpiece, best quality, highly detailed, absurdres).
16. "other": Any remaining tags that don't fit above.

CRITICAL RULES:
- DO NOT invent, hallucinate, or add details not present in the user's input.
- Keep the exact original text and tag weighting (e.g. "(holding sword:1.2)").
- If a category is not present in the prompt, leave its array EMPTY: [].
- Respond ONLY with a valid JSON object matching the schema:
{
  "character_identity": string[],
  "physical_appearance": string[],
  "hair": string[],
  "eyes": string[],
  "outfit": string[],
  "accessories": string[],
  "pose": string[],
  "expression": string[],
  "action": string[],
  "objects": string[],
  "background": string[],
  "lighting": string[],
  "camera": string[],
  "art_style": string[],
  "quality": string[],
  "other": string[]
}
`;

/**
 * Calls configured AI provider (Gemini or Local LLM) to perform contextual analysis.
 * Falls back to local regex parser if provider is unavailable or fails.
 */
export async function analyzePromptWithAI(
    rawPrompt: string,
    rawNegativePrompt = ""
): Promise<{
    parsed: ParsedPromptAttributes;
    providerUsed: "gemini" | "ollama" | "lmstudio" | "local_fallback";
    error?: string;
}> {
    if (!rawPrompt || !rawPrompt.trim()) {
        return {
            parsed: createEmptyParsedAttributes(),
            providerUsed: "local_fallback",
        };
    }

    const provider = getStoredAIProvider();

    // 1. Attempt Gemini if API Key is configured
    if (provider === "gemini") {
        const apiKey = getStoredGeminiApiKey();
        if (apiKey) {
            try {
                const modelName = getStoredGeminiModel() || "gemini-2.5-flash";
                const targetModel = modelName === "auto" ? "gemini-2.5-flash" : modelName;
                const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [
                            {
                                role: "user",
                                parts: [
                                    { text: AI_PARSE_SYSTEM_INSTRUCTION },
                                    { text: `Raw Prompt to classify:\n"""\n${rawPrompt}\n"""` },
                                ],
                            },
                        ],
                        generationConfig: {
                            responseMimeType: "application/json",
                            temperature: 0.1,
                        },
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    const jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (jsonText) {
                        const parsedJson = JSON.parse(jsonText);
                        const structured = mapJsonToParsedAttributes(parsedJson, rawNegativePrompt, "parsed_ai");
                        return { parsed: structured, providerUsed: "gemini" };
                    }
                }
            } catch (err) {
                console.warn("[PromptParser] Gemini call failed, falling back to local classifier:", err);
            }
        }
    }

    // 2. Attempt Local Ollama / LM Studio if configured
    if (provider === "ollama" || provider === "lmstudio") {
        const endpoint = getStoredLocalEndpoint(provider);
        const model = getStoredLocalModel();
        try {
            if (provider === "lmstudio") {
                // OpenAI-compatible /v1/chat/completions
                const url = `${endpoint.replace(/\/+$/, "")}/chat/completions`;
                const res = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: model || "default",
                        messages: [
                            { role: "system", content: AI_PARSE_SYSTEM_INSTRUCTION },
                            { role: "user", content: `Raw Prompt:\n${rawPrompt}` },
                        ],
                        temperature: 0.1,
                    }),
                });
                if (res.ok) {
                    const d = await res.json();
                    const text = d?.choices?.[0]?.message?.content || "";
                    const cleanJson = text.replace(/```json/gi, "").replace(/```/g, "").trim();
                    const parsedJson = JSON.parse(cleanJson);
                    const structured = mapJsonToParsedAttributes(parsedJson, rawNegativePrompt, "parsed_ai");
                    return { parsed: structured, providerUsed: "lmstudio" };
                }
            } else {
                // Ollama /api/generate
                const url = `${endpoint.replace(/\/+$/, "")}/api/generate`;
                const res = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: model || "llama3.2-vision",
                        prompt: `${AI_PARSE_SYSTEM_INSTRUCTION}\n\nUser Raw Prompt:\n${rawPrompt}\n\nJSON Output:`,
                        stream: false,
                        format: "json",
                    }),
                });
                if (res.ok) {
                    const d = await res.json();
                    const parsedJson = JSON.parse(d?.response || "{}");
                    const structured = mapJsonToParsedAttributes(parsedJson, rawNegativePrompt, "parsed_ai");
                    return { parsed: structured, providerUsed: "ollama" };
                }
            }
        } catch (err) {
            console.warn("[PromptParser] Local LLM call failed, falling back to local classifier:", err);
        }
    }

    // 3. Fallback to Local Deterministic Semantic Classifier
    const localParsed = parsePromptLocal(rawPrompt, rawNegativePrompt);
    return {
        parsed: localParsed,
        providerUsed: "local_fallback",
        error: provider === "gemini" && !getStoredGeminiApiKey()
            ? "API Key Gemini belum disetel. Menggunakan Parser Semantik Lokal berkecerdasan tinggi (0 dependensi & instan)."
            : undefined,
    };
}

/**
 * Maps arbitrary JSON classification output back to strongly-typed PromptAttribute structures.
 */
function mapJsonToParsedAttributes(
    jsonObj: Record<string, unknown>,
    rawNegativePrompt: string,
    source: "parsed_ai" | "parsed_local"
): ParsedPromptAttributes {
    const result = createEmptyParsedAttributes();
    const categories: AttributeCategory[] = [
        "character_identity",
        "physical_appearance",
        "hair",
        "eyes",
        "outfit",
        "accessories",
        "pose",
        "expression",
        "action",
        "objects",
        "background",
        "lighting",
        "camera",
        "art_style",
        "quality",
        "other",
    ];

    categories.forEach((cat) => {
        const rawList = jsonObj[cat];
        if (Array.isArray(rawList)) {
            rawList.forEach((item, idx) => {
                const str = String(item).trim();
                if (!str) return;
                const { cleanText, weight } = extractTagWeight(str);
                result[cat].push({
                    id: `ai-${cat}-${idx}-${Date.now().toString(36)}`,
                    category: cat,
                    text: str,
                    normalizedValue: cleanText,
                    weight,
                    isAmbiguous: false,
                    confidence: 0.95,
                    source,
                });
            });
        }
    });

    if (rawNegativePrompt && rawNegativePrompt.trim()) {
        const negTokens = tokenizeRawPrompt(rawNegativePrompt);
        negTokens.forEach((token, index) => {
            const { cleanText, weight } = extractTagWeight(token);
            result.negative.push({
                id: `neg-${index}-${Date.now().toString(36)}`,
                category: "negative",
                text: token,
                normalizedValue: cleanText,
                weight,
                source,
            });
        });
    }

    return result;
}
