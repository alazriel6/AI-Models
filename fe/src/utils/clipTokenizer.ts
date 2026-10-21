/**
 * CLIP & BPE Tokenizer Engine for Stable Diffusion (SD 1.5, SDXL, SD 3.5, Flux.1)
 * Simulates OpenAI CLIP ViT-L/14 & OpenCLIP ViT-bigG BPE tokenization,
 * tag weight extraction, LoRA directive isolation, and 77-token chunk boundary tracking.
 */

export interface TokenItem {
    id: number;
    text: string;
    rawText: string;
    subword: string;
    isWordStart: boolean;
    isWordEnd: boolean;
    weight: number;
    globalIndex: number; // 1-based index among text tokens (excluding BOS/EOS)
    chunkIndex: number; // 0-based chunk (0 = Chunk 1, 1 = Chunk 2, ...)
    indexInChunk: number; // 1-based index inside chunk (1..75)
    tagIndex: number; // index of the original comma-separated tag
    originalTag: string; // the comma-separated phrase this token belongs to
    isSpecial?: boolean;
    isBoundaryCut?: boolean;
}

export interface ChunkBoundaryHazard {
    tagIndex: number;
    tagText: string;
    cutBetweenChunk: number; // e.g. 1 (between chunk 1 & 2)
    startTokenIndex: number; // e.g. 74
    endTokenIndex: number; // e.g. 78
    tokensInFirstChunk: string[];
    tokensInSecondChunk: string[];
    explanation: string;
    recommendation: string;
}

export interface TokenizerChunk {
    chunkNumber: number; // 1, 2, 3...
    startGlobalIndex: number; // e.g. 1, 76, 151
    endGlobalIndex: number; // e.g. 75, 150, 225
    tokens: TokenItem[];
    usedCount: number; // tokens used out of 75
    capacity: number; // always 75
    isOverLimit: boolean;
}

export interface TokenizerResult {
    tokens: TokenItem[];
    chunks: TokenizerChunk[];
    totalTextTokens: number;
    totalChunks: number;
    hazards: ChunkBoundaryHazard[];
    loraTags: { raw: string; name: string; weight: number }[];
    strippedText: string;
}

// Common dictionary of common Stable Diffusion & Danbooru tokens
// that map to 1 or known exact BPE token splits
const COMMON_SINGLE_TOKENS = new Set([
    "masterpiece", "best", "quality", "aesthetic", "newest", "highres", "extremely",
    "detailed", "background", "looking", "viewer", "smile", "solo", "girl", "boy",
    "eyes", "hair", "long", "short", "black", "white", "blue", "red", "green", "yellow",
    "blonde", "dress", "jacket", "shirt", "skirt", "pants", "boots", "shoes", "gloves",
    "hat", "ribbon", "holding", "standing", "sitting", "indoors", "outdoors", "sky",
    "clouds", "night", "day", "sunlight", "cinematic", "lighting", "shadow", "focus",
    "depth", "field", "portrait", "upper", "body", "full", "cowboy", "shot", "arms",
    "behind", "back", "crossed", "hands", "pocket", "blush", "open", "mouth", "closed",
    "looking", "away", "profile", "side", "view", "from", "above", "below", "sharp",
    "smooth", "vibrant", "muted", "colors", "rendering", "illustration", "anime",
    "photorealistic", "realistic", "octane", "unreal", "engine", "artstation",
    "pixiv", "fantasy", "cyberpunk", "sci-fi", "vintage", "retro", "monochrome",
    "greyscale", "sepia", "simple", "complex", "intricate", "ornate", "feather",
    "wings", "halo", "horns", "tail", "ears", "animal", "cat", "dog", "fox", "wolf"
]);

// Known subword splits for compound danbooru tags
const KNOWN_COMPOUND_SPLITS: Record<string, string[]> = {
    "1girl": ["1", "girl"],
    "2girls": ["2", "girls"],
    "3girls": ["3", "girls"],
    "1boy": ["1", "boy"],
    "2boys": ["2", "boys"],
    "very aesthetic": ["very", "aesthetic"],
    "looking at viewer": ["looking", "at", "viewer"],
    "looking away": ["looking", "away"],
    "depth of field": ["depth", "of", "field"],
    "upper body": ["upper", "body"],
    "full body": ["full", "body"],
    "cowboy shot": ["cowboy", "shot"],
    "arms behind back": ["arms", "behind", "back"],
    "hands in pockets": ["hands", "in", "pockets"],
    "hands on hips": ["hands", "on", "hips"],
    "open mouth": ["open", "mouth"],
    "closed eyes": ["closed", "eyes"],
    "half-closed eyes": ["half", "-", "closed", "eyes"],
    "highly detailed": ["highly", "detailed"],
    "light smile": ["light", "smile"],
    "gentle smile": ["gentle", "smile"],
    "school uniform": ["school", "uniform"],
    "sailor uniform": ["sailor", "uniform"],
    "maid outfit": ["maid", "outfit"],
    "business suit": ["business", "suit"],
    "collared shirt": ["collared", "shirt"],
    "black necktie": ["black", "necktie"],
    "pleated skirt": ["pleated", "skirt"],
    "thighhighs": ["thigh", "highs"],
    "bare shoulders": ["bare", "shoulders"],
    "sleeveless dress": ["sleeveless", "dress"],
    "off-shoulder": ["off", "-", "shoulder"],
    "long hair": ["long", "hair"],
    "short hair": ["short", "hair"],
    "twin braids": ["twin", "braids"],
    "ponytail": ["pony", "tail"],
    "twintails": ["twin", "tails"],
    "side ponytail": ["side", "pony", "tail"],
    "messy hair": ["messy", "hair"],
    "wavy hair": ["wavy", "hair"],
    "curly hair": ["curly", "hair"],
    "straight hair": ["straight", "hair"],
    "ahoge": ["ah", "oge"],
    "red eyes": ["red", "eyes"],
    "blue eyes": ["blue", "eyes"],
    "green eyes": ["green", "eyes"],
    "golden eyes": ["golden", "eyes"],
    "purple eyes": ["purple", "eyes"],
    "heterochromia": ["hetero", "chromia"],
    "pointy ears": ["pointy", "ears"],
    "animal ears": ["animal", "ears"],
    "cat ears": ["cat", "ears"],
    "fox ears": ["fox", "ears"],
    "wolf ears": ["wolf", "ears"],
    "demon horns": ["demon", "horns"],
    "angel wings": ["angel", "wings"],
    "black wings": ["black", "wings"],
    "feathered wings": ["feathered", "wings"],
    "mechanical wings": ["mechanical", "wings"],
};

/**
 * Approximate BPE token split for a single word in CLIP vocab.
 * In CLIP, words not recognized directly are broken down into subword chunks of ~3-5 chars.
 */
function splitWordIntoBpe(word: string): string[] {
    const clean = word.toLowerCase().trim();
    if (!clean) return [];

    // Check single known
    if (COMMON_SINGLE_TOKENS.has(clean)) {
        return [clean];
    }

    // Check compound table
    if (KNOWN_COMPOUND_SPLITS[clean]) {
        return KNOWN_COMPOUND_SPLITS[clean];
    }

    // Number + letter combo like 1girl, 2boys, 4k
    const numLetterMatch = clean.match(/^(\d+)([a-z]+)$/);
    if (numLetterMatch) {
        return [numLetterMatch[1], ...splitWordIntoBpe(numLetterMatch[2])];
    }

    // If word is short (<= 4 chars)
    if (clean.length <= 4) {
        return [clean];
    }

    // Heuristic BPE: common prefixes and suffixes
    const commonPrefixes = ["photo", "hyper", "super", "multi", "ultra", "micro", "cyber", "retro", "mono", "inter", "trans", "over", "under", "auto"];
    for (const pre of commonPrefixes) {
        if (clean.startsWith(pre) && clean.length > pre.length + 2) {
            const remainder = clean.slice(pre.length);
            return [pre, ...splitWordIntoBpe(remainder)];
        }
    }

    const commonSuffixes = ["realistic", "detailed", "lighting", "colored", "less", "like", "able", "ment", "ness", "tion", "ting", "ling", "hood", "ward"];
    for (const suf of commonSuffixes) {
        if (clean.endsWith(suf) && clean.length > suf.length + 2) {
            const base = clean.slice(0, -suf.length);
            return [...splitWordIntoBpe(base), suf];
        }
    }

    // If length is between 5 and 8, likely 1-2 tokens
    if (clean.length <= 7) {
        return [clean];
    }

    // Break longer unknown word into ~4-5 character subwords
    const chunks: string[] = [];
    let rem = clean;
    while (rem.length > 5) {
        chunks.push(rem.slice(0, 4));
        rem = rem.slice(4);
    }
    if (rem.length > 0) {
        chunks.push(rem);
    }
    return chunks;
}

/**
 * Tokenize a raw prompt into CLIP tokens, respecting 77-token boundaries and
 * tracking tag weighting and LoRA tags.
 */
export function tokenizeClipPrompt(rawPrompt: string): TokenizerResult {
    if (!rawPrompt || !rawPrompt.trim()) {
        return {
            tokens: [],
            chunks: [
                {
                    chunkNumber: 1,
                    startGlobalIndex: 1,
                    endGlobalIndex: 75,
                    tokens: [],
                    usedCount: 0,
                    capacity: 75,
                    isOverLimit: false,
                },
            ],
            totalTextTokens: 0,
            totalChunks: 1,
            hazards: [],
            loraTags: [],
            strippedText: "",
        };
    }

    // Step 1: Extract LoRA tags (<lora:name:weight>) which are stripped before CLIP encoding in A1111 & ComfyUI
    const loraTags: { raw: string; name: string; weight: number }[] = [];
    let workingText = rawPrompt.replace(/<lora:([^:>]+)(?::([0-9.]+))?>/gi, (match, name, weightStr) => {
        const weight = weightStr ? parseFloat(weightStr) : 1.0;
        loraTags.push({ raw: match, name: name.trim(), weight: isNaN(weight) ? 1.0 : weight });
        return ""; // stripped from CLIP tokenization
    });

    // Also strip <hypernet:...> or <embedding:...>
    workingText = workingText.replace(/<(?:hypernet|embedding):[^>]+>/gi, "");

    // Split text into comma-separated tags while respecting parentheses/brackets
    const rawTags: string[] = [];
    let currentTag = "";
    let parenDepth = 0;
    let bracketDepth = 0;

    for (let i = 0; i < workingText.length; i++) {
        const ch = workingText[i];
        if (ch === "(") parenDepth++;
        else if (ch === ")") parenDepth = Math.max(0, parenDepth - 1);
        else if (ch === "[") bracketDepth++;
        else if (ch === "]") bracketDepth = Math.max(0, bracketDepth - 1);

        if (ch === "," && parenDepth === 0 && bracketDepth === 0) {
            if (currentTag.trim()) {
                rawTags.push(currentTag.trim());
            }
            currentTag = "";
        } else {
            currentTag += ch;
        }
    }
    if (currentTag.trim()) {
        rawTags.push(currentTag.trim());
    }

    const tokens: TokenItem[] = [];
    const hazards: ChunkBoundaryHazard[] = [];
    let globalTokenCount = 0;

    // Process each tag
    rawTags.forEach((tagStr, tagIndex) => {
        // Parse weight from tag: e.g. (tag:1.2) or ((tag)) or [tag]
        let weight = 1.0;
        let cleanTag = tagStr.trim();

        // Check (tag:weight)
        const weightedMatch = cleanTag.match(/^\((.+):([0-9.]+)\)$/);
        if (weightedMatch) {
            cleanTag = weightedMatch[1].trim();
            weight = parseFloat(weightedMatch[2]) || 1.0;
        } else {
            // Count outer parentheses for nested weighting: ((word)) = 1.1 * 1.1 = 1.21
            let openParens = 0;
            while (cleanTag.startsWith("(") && cleanTag.endsWith(")")) {
                openParens++;
                cleanTag = cleanTag.slice(1, -1).trim();
            }
            if (openParens > 0) {
                weight = Math.pow(1.1, openParens);
            } else {
                // Count brackets for de-emphasis: [[word]] = 0.9 * 0.9 = 0.81
                let openBrackets = 0;
                while (cleanTag.startsWith("[") && cleanTag.endsWith("]")) {
                    openBrackets++;
                    cleanTag = cleanTag.slice(1, -1).trim();
                }
                if (openBrackets > 0) {
                    weight = Math.pow(0.9, openBrackets);
                }
            }
        }

        // Split tag into words / punctuation
        // Note: underscores '_' in danbooru tags like 'long_hair' are usually treated as spaces in A1111/Forge/ComfyUI
        const normalizedWords = cleanTag.replace(/_/g, " ").split(/\s+/).filter(Boolean);

        const tagTokensStartGlobal = globalTokenCount + 1;
        const tagTokensList: TokenItem[] = [];

        normalizedWords.forEach((word) => {
            const subwords = splitWordIntoBpe(word);
            subwords.forEach((sub, subIdx) => {
                globalTokenCount++;
                const chunkIndex = Math.floor((globalTokenCount - 1) / 75);
                const indexInChunk = ((globalTokenCount - 1) % 75) + 1;

                const tokenItem: TokenItem = {
                    id: Math.abs(hashString(sub)) % 49400 + 100, // deterministic simulated token ID
                    text: sub,
                    rawText: word,
                    subword: sub,
                    isWordStart: subIdx === 0,
                    isWordEnd: subIdx === subwords.length - 1,
                    weight,
                    globalIndex: globalTokenCount,
                    chunkIndex,
                    indexInChunk,
                    tagIndex,
                    originalTag: tagStr,
                };

                tagTokensList.push(tokenItem);
                tokens.push(tokenItem);
            });
        });

        // Add comma token if this is not the last tag
        if (tagIndex < rawTags.length - 1) {
            globalTokenCount++;
            const chunkIndex = Math.floor((globalTokenCount - 1) / 75);
            const indexInChunk = ((globalTokenCount - 1) % 75) + 1;

            tokens.push({
                id: 267, // comma ID in CLIP
                text: ",",
                rawText: ",",
                subword: ",",
                isWordStart: true,
                isWordEnd: true,
                weight: 1.0,
                globalIndex: globalTokenCount,
                chunkIndex,
                indexInChunk,
                tagIndex,
                originalTag: tagStr,
                isSpecial: true,
            });
        }

        // Check if this tag crossed a 75-token boundary!
        if (tagTokensList.length > 1) {
            const firstChunk = tagTokensList[0].chunkIndex;
            const lastChunk = tagTokensList[tagTokensList.length - 1].chunkIndex;

            if (firstChunk !== lastChunk) {
                // Boundary Cut Hazard Detected!
                const firstChunkTokens = tagTokensList.filter((t) => t.chunkIndex === firstChunk).map((t) => t.text);
                const secondChunkTokens = tagTokensList.filter((t) => t.chunkIndex === lastChunk).map((t) => t.text);

                // Mark these tokens with hazard flag
                tagTokensList.forEach((t) => {
                    t.isBoundaryCut = true;
                });

                hazards.push({
                    tagIndex,
                    tagText: tagStr,
                    cutBetweenChunk: firstChunk + 1,
                    startTokenIndex: tagTokensStartGlobal,
                    endTokenIndex: tagTokensStartGlobal + tagTokensList.length - 1,
                    tokensInFirstChunk: firstChunkTokens,
                    tokensInSecondChunk: secondChunkTokens,
                    explanation: `Tag "${tagStr}" terbelah tepat pada batas 75-token antara Chunk ${firstChunk + 1} dan Chunk ${lastChunk + 1}.`,
                    recommendation: `CLIP menghitung self-attention secara independen per-chunk 77 token. Token di Chunk ${lastChunk + 1} tidak dapat meng-attend token di Chunk ${firstChunk + 1}. Pindahkan tag ini ke awal Chunk ${lastChunk + 1} atau perpendek tag sebelumnya agar frasa tetap utuh.`,
                });
            }
        }
    });

    // Group tokens into Chunks of 75 tokens
    const totalChunks = Math.max(1, Math.ceil(tokens.length / 75));
    const chunks: TokenizerChunk[] = [];

    for (let c = 0; c < totalChunks; c++) {
        const chunkTokens = tokens.filter((t) => t.chunkIndex === c);
        chunks.push({
            chunkNumber: c + 1,
            startGlobalIndex: c * 75 + 1,
            endGlobalIndex: (c + 1) * 75,
            tokens: chunkTokens,
            usedCount: chunkTokens.length,
            capacity: 75,
            isOverLimit: chunkTokens.length > 75,
        });
    }

    return {
        tokens,
        chunks,
        totalTextTokens: tokens.length,
        totalChunks,
        hazards,
        loraTags,
        strippedText: workingText,
    };
}

/**
 * Deterministic string hash to generate realistic reproducible token IDs
 */
function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
    }
    return hash;
}
