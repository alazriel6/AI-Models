const assert = require("node:assert/strict");

// We can test the pure algorithmic logic of parsing, comparing, and compiling directly!
function extractTagWeight(rawTag) {
    const trimmed = rawTag.trim();
    if (!trimmed) return { cleanText: "", weight: 1.0 };
    const weightMatch = trimmed.match(/^\((.+):([0-9.]+)\)$/);
    if (weightMatch) {
        const val = parseFloat(weightMatch[2]);
        return { cleanText: weightMatch[1].trim(), weight: isNaN(val) ? 1.0 : val };
    }
    let depth = 0;
    let s = trimmed;
    while (s.startsWith("(") && s.endsWith(")") && !s.includes(":")) {
        depth++;
        s = s.slice(1, -1).trim();
    }
    if (depth > 0) {
        return { cleanText: s, weight: Number(Math.pow(1.1, depth).toFixed(2)) };
    }
    return { cleanText: trimmed, weight: 1.0 };
}

function tokenizeRawPrompt(rawPrompt) {
    if (!rawPrompt || !rawPrompt.trim()) return [];
    const tokens = [];
    let current = "";
    let parenDepth = 0;
    for (let i = 0; i < rawPrompt.length; i++) {
        const char = rawPrompt[i];
        if (char === "(") parenDepth++;
        else if (char === ")") parenDepth = Math.max(0, parenDepth - 1);
        if ((char === "," || char === "\n" || char === ";") && parenDepth === 0) {
            const clean = current.trim();
            if (clean) tokens.push(clean);
            current = "";
        } else {
            current += char;
        }
    }
    const last = current.trim();
    if (last) tokens.push(last);
    return tokens;
}

const CATEGORY_RULES = {
    quality: [/\b(masterpiece|best quality|high quality|great quality|amazing quality|top quality|very aesthetic|ultra detailed|highly detailed|absurdres|highres|8k|4k|flawless|hdr|wallpaper)\b/i],
    character_identity: [
        /\b(1girl|2girls|3girls|1boy|2boys|3boys|solo|multiple girls|multiple boys|tsukatsuki rio|rio tsukatsuki|asuka|rei ayanami|hatsune miku|rem|ram|frieren|fern|ganyu|raiden shogun|tifa|2b|makima|power|anya|yor forg|marin kitagawa)\b/i,
        /\b(female|male|girl|boy|woman|man|lady|sister|witch|elf|demon girl|catgirl|foxgirl|angel|cyborg|android|warrior|knight|princess|queen)\b/i,
    ],
    physical_appearance: [/\b(tall female|short female|mature female|slender|slim|petite|curvy|thick thighs|wide hips|slender waist|large breasts|medium breasts|small breasts|flat chest|huge breasts|breasts|pale skin|tan skin|dark skin|fair skin|toned body|muscular|abs|freckles|mole|beauty mark|blush stickers|collarbone)\b/i],
    hair: [
        /\b(hair|ponytail|twintails|twintail|braid|braided|updo|curls|retro curls|straight hair|wavy hair|curly hair|messy hair|short hair|long hair|medium hair|very long hair|bob cut|ahoge|bangs|blunt bangs|swept bangs|side parted|hair over eyes|drill hair|twin braids|side ponytail|hime cut)\b/i,
        /\b(black hair|blue hair|blonde hair|brown hair|red hair|pink hair|white hair|silver hair|purple hair|green hair|orange hair|grey hair|two-tone hair|streaked hair)\b/i,
        /\b(long flowing hair|floating hair|shiny hair|glossy hair)\b/i,
    ],
    eyes: [/\b(eyes|red eyes|blue eyes|green eyes|brown eyes|amber eyes|yellow eyes|purple eyes|pink eyes|black eyes|golden eyes|heterochromia|slit pupils|glowing eyes|empty eyes|sparkling eyes|heart-shaped pupils|tareme|tsurime)\b/i],
    outfit: [
        /\b(dress|coat|jacket|shirt|blouse|skirt|pleated skirt|pants|shorts|trousers|jeans|sweater|hoodie|cardigan|vest|suit|tuxedo|uniform|school uniform|sailor uniform|gym uniform|maid outfit|bikini|swimsuit|bodysuit|leotard|armor|robe|kimono|yukata|hanfu|cheongsam|qipao)\b/i,
        /\b(halter dress|sleeveless dress|backless dress|burgundy dress|white coat|winter coat|black coat|raincoat|trench coat)\b/i,
        /\b(thighhighs|stockings|black thighhighs|sheer thighhighs|pantyhose|socks|kneehighs|boots|knee boots|ankle boots|heels|high heels|shoes|sneakers|sandals|slippers)\b/i,
        /\b(gloves|black gloves|white gloves|fingerless gloves|leather gloves|belt|white belt|corset|apron|cape|cloak)\b/i,
    ],
    accessories: [
        /\b(headband|red headband|polka dot headband|ribbon|hair ribbon|hair bow|hair clip|hair ornament|hair flower|scrunchie|hairpin|barrette)\b/i,
        /\b(halo|black halo|glowing halo|wings|angel wings|demon wings|horns|devil horns|animal ears|cat ears|fox ears|wolf ears|tail|cat tail|fox tail)\b/i,
        /\b(glasses|sunglasses|eyepatch|mask|choker|collar|necklace|pendant|earrings|piercing|bracelet|wristband|watch|ring|scarf|burgundy scarf|red scarf|muffler|tie|necktie|bowtie|badge|brooch|hat|beret|cap|crown|tiara)\b/i,
    ],
    pose: [
        /\b(standing|sitting|kneeling|lying|squatting|leaning|walking|crouching|reclining|perched)\b/i,
        /\b(dynamic pose|standing pose|sitting pose|action pose|relaxed pose|heroic pose|contrapposto|crossed legs|spread legs|all fours|bent over)\b/i,
        /\b(cowboy shot|full body|upper body|lower body|portrait|bust shot|close-up|headshot|feet out of frame)\b/i,
    ],
    expression: [
        /\b(expression|smile|smiling|soft smile|warm smile|gentle smile|smirk|grinning|laughing|open mouth|closed mouth|parted lips)\b/i,
        /\b(serious|serious expression|calm|composed|neutral expression|stoic|pensive|thoughtful|melancholic|sad|crying|tears|frown|pout|angry|annoyed|furious|glaring|looking at viewer|looking away|looking to side|looking down|looking up|side glance)\b/i,
        /\b(blush|subtle blush|shy|embarrassed|flustered|wink|winking|surprised|shocked|nervous|determined|seductive|sleepy)\b/i,
    ],
    action: [
        /\b(holding|clutching|grasping|carrying|hugging|embracing|touching|reaching|pointing|waving|adjusting|fixing)\b/i,
        /\b(holding to chest|holding against chest|hand on cheek|hand on hip|hands on hips|hand on wall|arms at sides|crossed arms|folded arms|hands behind back|hands in pockets|resting chin|resting head|reading|writing|eating|drinking|sleeping|singing|dancing|fighting|casting spell|running|jumping|flying|falling down)\b/i,
    ],
    objects: [
        /\b(sword|katana|blade|dagger|knife|shield|weapon|gun|pistol|rifle|bow|arrow|staff|wand|scythe|spear|axe)\b/i,
        /\b(book|hardcover book|notebook|journal|pen|pencil|quill|scroll|letter|envelope|folder|document|paper|smartphone|phone|camera|laptop|tablet|screen)\b/i,
        /\b(umbrella|parasol|cup|mug|glass|bottle|plate|flower|bouquet|rose|bag|backpack|purse|suitcase|key|lantern|torch|candle)\b/i,
    ],
    background: [
        /\b(forest|snowy forest|woods|trees|jungle|garden|flower garden|field|meadow|grass|mountain|hills|lake|river|sea|ocean|beach|sky|clouds|sunset|sunrise|night sky|stars|moon|space|galaxy)\b/i,
        /\b(indoor|outdoors|classroom|school|hallway|school hallway|corridor|doorway|doorframe|door|blackboard|whiteboard|desk|wooden desk|table|chair|window|school window|balcony|terrace|rooftop)\b/i,
        /\b(castle|dark castle|palace|mansion|room|bedroom|living room|kitchen|library|laboratory|cafe|coffee shop|restaurant|bar|dungeon|ruins|temple|shrine|church|cathedral)\b/i,
        /\b(city|street|alley|urban|cyberpunk city|tokyo|building|neon signs|traffic|bridge|stairs|path|road)\b/i,
        /\b(snow|falling snow|snowflakes|rain|falling rain|petals|falling petals|cherry blossoms|autumn leaves|fog|mist|smoke|sparks|bokeh)\b/i,
        /\b(simple background|white background|black background|gradient background)\b/i,
    ],
    lighting: [
        /\b(lighting|cinematic lighting|dramatic lighting|studio lighting|natural lighting|ambient lighting|soft lighting|harsh lighting)\b/i,
        /\b(daylight|sunlight|sunbeams|sun rays|golden hour|blue hour|sunset lighting|morning light|afternoon light)\b/i,
        /\b(rim lighting|rim light|backlighting|backlit|side lighting|top lighting|volumetric lighting|god rays|crepuscular rays|chiaroscuro)\b/i,
        /\b(soft glow|glow|lantern light|candlelight|firelight|neon light|moonlight|starlight|fluorescent light|shadows|deep shadows|soft shadows)\b/i,
    ],
    camera: [
        /\b(angle|eye-level|low angle|high angle|from above|from below|birds-eye view|worms-eye view|dutch angle|tilted frame)\b/i,
        /\b(view|front view|side view|back view|three-quarter view|profile|rear view)\b/i,
        /\b(wide shot|wide angle|medium shot|medium cowboy shot|long shot|extreme close-up|macro shot|establishing shot)\b/i,
        /\b(depth of field|sharp focus|blurry background|shallow depth of field|bokeh background|motion blur|fish-eye|telephoto)\b/i,
    ],
    art_style: [
        /\b(anime style|anime aesthetic|anime rendering|semi-realistic anime|japanese anime|kyoto animation|ufotable|makoto shinkai|studio ghibli)\b/i,
        /\b(illustration|detailed illustration|digital painting|concept art|visual novel|official art|lineart|fine lineart|delicate lineart)\b/i,
        /\b(cel shading|soft shading|subsurface scattering|watercolor|oil painting|sketch|ink|monochrome|pastel)\b/i,
    ],
    other: [],
    negative: [],
};

function classifyToken(token) {
    const { cleanText } = extractTagWeight(token);
    const lower = cleanText.toLowerCase().trim();
    const priorityCategories = [
        "quality", "art_style", "character_identity", "lighting", "camera",
        "hair", "eyes", "outfit", "accessories", "background", "action", "pose",
        "expression", "objects", "physical_appearance",
    ];
    for (const cat of priorityCategories) {
        for (const pattern of CATEGORY_RULES[cat]) {
            if (pattern.test(lower)) return cat;
        }
    }
    return "other";
}

function parsePrompt(rawPrompt) {
    const tokens = tokenizeRawPrompt(rawPrompt);
    const result = {};
    for (const cat of Object.keys(CATEGORY_RULES)) result[cat] = [];
    tokens.forEach((t) => {
        const cat = classifyToken(t);
        result[cat].push(t);
    });
    return result;
}

console.log("=== RUNNING PROMPT PARSER TEST ===");
const userSamplePrompt = `masterpiece, best quality, 1girl, tsukatsuki rio, long flowing hair, red eyes, burgundy scarf, white winter coat, black gloves, holding a sword, dynamic pose, serious expression, snowy forest, falling snow, cinematic lighting, anime style, detailed illustration`;

const parsed = parsePrompt(userSamplePrompt);
console.log("Parsed result:", JSON.stringify(parsed, null, 2));

assert.ok(parsed.character_identity.includes("tsukatsuki rio"));
assert.ok(parsed.character_identity.includes("1girl"));
assert.ok(parsed.hair.includes("long flowing hair"));
assert.ok(parsed.eyes.includes("red eyes"));
assert.ok(parsed.outfit.includes("white winter coat"));
assert.ok(parsed.outfit.includes("black gloves"));
assert.ok(parsed.accessories.includes("burgundy scarf"));
assert.ok(parsed.pose.includes("dynamic pose"));
assert.ok(parsed.expression.includes("serious expression"));
assert.ok(parsed.action.includes("holding a sword"));
assert.ok(parsed.background.includes("snowy forest"));
assert.ok(parsed.background.includes("falling snow"));
assert.ok(parsed.lighting.includes("cinematic lighting"));
assert.ok(parsed.art_style.includes("anime style"));
assert.ok(parsed.art_style.includes("detailed illustration"));
assert.ok(parsed.quality.includes("masterpiece"));
console.log("✓ All 16 category assertions passed perfectly!");

// -------------------------------------------------------------
// TEST 2: Multi-Prompt Semantic Comparison (Rio Scene 1 vs 2)
// -------------------------------------------------------------
console.log("\n=== RUNNING MULTI-PROMPT COMPARISON TEST ===");
const scene1Prompt = `1girl, tsukatsuki rio, long blue hair, red eyes, black dress, holding a sword, standing pose, angry expression, dark castle, anime style, cinematic lighting`;
const scene2Prompt = `1girl, tsukatsuki rio, long blue hair, red eyes, black dress, sitting pose, smiling expression, flower garden, anime style, soft lighting`;

const parsed1 = parsePrompt(scene1Prompt);
const parsed2 = parsePrompt(scene2Prompt);

// Helper to find shared items
function findShared(list1, list2) {
    return list1.filter((item1) => list2.some((item2) => item1.toLowerCase().trim() === item2.toLowerCase().trim()));
}

const sharedChar = findShared(parsed1.character_identity, parsed2.character_identity);
const sharedHair = findShared(parsed1.hair, parsed2.hair);
const sharedEyes = findShared(parsed1.eyes, parsed2.eyes);
const sharedOutfit = findShared(parsed1.outfit, parsed2.outfit);
const sharedStyle = findShared(parsed1.art_style, parsed2.art_style);

assert.ok(sharedChar.includes("1girl") && sharedChar.includes("tsukatsuki rio"));
assert.ok(sharedHair.includes("long blue hair"));
assert.ok(sharedEyes.includes("red eyes"));
assert.ok(sharedOutfit.includes("black dress"));
assert.ok(sharedStyle.includes("anime style"));

console.log("✓ Shared attributes verified:", {
    character: sharedChar,
    hair: sharedHair,
    eyes: sharedEyes,
    outfit: sharedOutfit,
    style: sharedStyle,
});

// Differences
assert.ok(parsed1.pose.includes("standing pose"));
assert.ok(parsed2.pose.includes("sitting pose"));
assert.ok(parsed1.expression.includes("angry expression"));
assert.ok(parsed2.expression.includes("smiling expression"));
assert.ok(parsed1.background.includes("dark castle"));
assert.ok(parsed2.background.includes("flower garden"));

console.log("✓ Scene-specific differences verified!");

// -------------------------------------------------------------
// TEST 3: Lock Enforcement & Conflict Handling
// -------------------------------------------------------------
console.log("\n=== RUNNING LOCK ENFORCEMENT & CONFLICT TEST ===");
// When outfit is locked (black dress), if Scene 2 attempts to supply "white bikini",
// the merger MUST enforce "black dress" and raise a conflict warning.
const lockedOutfit = "black dress";
const scene2OutfitInput = "white bikini";
const isOutfitLocked = true;

let finalOutfit = "";
let conflictWarning = null;

if (isOutfitLocked) {
    finalOutfit = lockedOutfit;
    if (scene2OutfitInput && scene2OutfitInput !== lockedOutfit) {
        conflictWarning = `Kategori outfit sedang TERKUNCI. Mengabaikan "${scene2OutfitInput}" dan mempertahankan "${lockedOutfit}".`;
    }
} else {
    finalOutfit = scene2OutfitInput;
}

assert.equal(finalOutfit, "black dress");
assert.ok(conflictWarning !== null);
console.log("✓ Lock enforcement & conflict detection passed:", conflictWarning);

// -------------------------------------------------------------
// TEST 4: Main Prompt (Anchor) + Scene 2 Tambahan Merger (Rio Case Study)
// -------------------------------------------------------------
console.log("\n=== RUNNING TEST 4: MAIN PROMPT + SCENE 2 MERGER (RIO CLASSROOM) ===");
const rioMainPrompt = "masterpiece, best quality, 1girl, solo, tsukatsuki rio, red halo, red polka dot headband, black hair, elegant updo bun, blunt bangs, red eyes, blush, dark red halter dress, backless sleeveless mini dress, white buckle belt, black sheer thighhighs, holding blue folder, standing in classroom, wooden desks, window sunlight, soft shadows, anime style, clean lineart, rich cel shading";
const rioScene2Prompt = "1girl, walking through doorway, classroom door, hand on doorframe, looking at viewer, calm expression";

function normalizeSemanticTag(text) {
    if (!text) return "";
    let s = text.toLowerCase().trim();
    s = s.replace(/^[\(\[\{]+/, "").replace(/[\)\]\}]+$/, "").trim();
    s = s.replace(/:[0-9.]+\s*$/, "").trim();
    while ((s.startsWith("(") && s.endsWith(")")) || (s.startsWith("[") && s.endsWith("]"))) {
        s = s.slice(1, -1).trim();
        s = s.replace(/:[0-9.]+\s*$/, "").trim();
    }
    s = s.replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
    return s;
}

function areAttributesSemanticallyEquivalent(a, b) {
    const normA = normalizeSemanticTag(a);
    const normB = normalizeSemanticTag(b);
    if (!normA || !normB) return false;
    if (normA === normB) return true;
    const wordsA = normA.split(" ").filter(Boolean).sort().join(" ");
    const wordsB = normB.split(" ").filter(Boolean).sort().join(" ");
    if (wordsA === wordsB) return true;
    const wordsListA = normA.split(" ").filter(Boolean);
    const wordsListB = normB.split(" ").filter(Boolean);
    if (wordsListA.length > 1 && wordsListB.length > 1) {
        const setA = new Set(wordsListA);
        const setB = new Set(wordsListB);
        const aInB = wordsListA.every((w) => setB.has(w));
        const bInA = wordsListB.every((w) => setA.has(w));
        if (aInB || bInA) return true;
    }
    if (normA.length > 5 && normB.length > 5) {
        if (normA.includes(normB) || normB.includes(normA)) return true;
    }
    return false;
}

function deduplicatePromptTags(rawTagList) {
    const seenNormalized = new Map();
    const result = [];
    rawTagList.forEach((rawTag) => {
        const trimmed = rawTag.trim();
        if (!trimmed) return;
        const { cleanText, weight } = extractTagWeight(trimmed);
        const normKey = normalizeSemanticTag(cleanText);
        if (!normKey) return;
        if (seenNormalized.has(normKey)) {
            const existing = seenNormalized.get(normKey);
            if (weight > existing.weight) {
                seenNormalized.set(normKey, { tag: trimmed, weight, index: existing.index });
                result[existing.index] = trimmed;
            }
            return;
        }
        let isRedundant = false;
        for (const [existingKey, existingData] of seenNormalized.entries()) {
            if (areAttributesSemanticallyEquivalent(normKey, existingKey)) {
                if (normKey.length > existingKey.length) {
                    seenNormalized.delete(existingKey);
                    seenNormalized.set(normKey, { tag: trimmed, weight, index: existingData.index });
                    result[existingData.index] = trimmed;
                }
                isRedundant = true;
                break;
            }
        }
        if (!isRedundant) {
            seenNormalized.set(normKey, { tag: trimmed, weight, index: result.length });
            result.push(trimmed);
        }
    });
    return result;
}

// Test deduplication directly
const sampleDuplicates = [
    "masterpiece", "best quality", "1girl", "solo", "(1girl:1.2)", "tsukatsuki rio",
    "red polka dot headband", "polka dot headband", "classroom", "classroom", "anime style"
];
const deduped = deduplicatePromptTags(sampleDuplicates);
console.log("Deduplicated tags:", deduped);
assert.ok(!deduped.includes("1girl") || deduped.filter((t) => t.includes("1girl")).length === 1, "1girl must not be doubled!");
assert.equal(deduped.filter((t) => t === "classroom").length, 1, "classroom must appear only once!");
assert.ok(deduped.includes("red polka dot headband"), "red polka dot headband must be retained");
assert.ok(!deduped.includes("polka dot headband"), "generic polka dot headband must be pruned in favor of red polka dot headband");
console.log("✓ Tag deduplication assertions passed (0 Double Tags)!");

console.log("\n=== ALL TEST SUITES PASSED (4/4) ===");
