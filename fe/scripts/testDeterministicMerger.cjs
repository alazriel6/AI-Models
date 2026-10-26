const assert = require("node:assert/strict");

// Strict 8 Categories
const CATEGORIES = [
    "QUALITY_STYLE",
    "CHARACTER_ANATOMY",
    "FRAMING",
    "POSE_EXPRESSION",
    "HAIR_HEADWEAR",
    "OUTFIT",
    "ENVIRONMENT",
    "LIGHTING_FX"
];

// Helper: Tokenize prompt respecting parentheses and brackets
function tokenizePrompt(rawPrompt) {
    if (!rawPrompt || !rawPrompt.trim()) return [];
    const tokens = [];
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
        } else if ((char === "," || char === "\n") && parenDepth === 0) {
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

// Format token with weight cleanly
function formatTokenWithWeight(cleanText, weight, originalRaw) {
    if (originalRaw && !originalRaw.includes(",")) {
        return originalRaw;
    }
    if (weight === 1.0) {
        return cleanText;
    }
    const weightStr = weight.toFixed(2);
    return `(${cleanText}:${weightStr})`;
}

// Unpack tokens (including grouped weights like (standing at sliding door, hand on door:1.3))
function unpackTokens(rawTokens) {
    const result = [];
    
    for (const rawToken of rawTokens) {
        const trimmed = rawToken.trim();
        if (!trimmed) continue;

        // Grouped weight: (tag1, tag2:1.3)
        const groupedWeightMatch = trimmed.match(/^\((.+):([0-9.]+)\)$/);
        if (groupedWeightMatch && groupedWeightMatch[1].includes(",")) {
            const weightVal = parseFloat(groupedWeightMatch[2]);
            const weight = isNaN(weightVal) ? 1.0 : weightVal;
            const weightStr = groupedWeightMatch[2];
            const tags = groupedWeightMatch[1].split(",").map(t => t.trim()).filter(Boolean);
            for (const tag of tags) {
                result.push({
                    raw: `(${tag}:${weightStr})`,
                    cleanText: tag,
                    weight: weight,
                    weightStr: weightStr,
                    isGrouped: true
                });
            }
            continue;
        }

        // Single explicit weight: (tag:1.15)
        if (groupedWeightMatch) {
            const weightVal = parseFloat(groupedWeightMatch[2]);
            result.push({
                raw: trimmed,
                cleanText: groupedWeightMatch[1].trim(),
                weight: isNaN(weightVal) ? 1.0 : weightVal,
                weightStr: groupedWeightMatch[2],
                isGrouped: false
            });
            continue;
        }

        // Nested parentheses: ((tag:1.35))
        const nestedMatch = trimmed.match(/^\(\((.+):([0-9.]+)\)\)$/);
        if (nestedMatch) {
            const weightVal = parseFloat(nestedMatch[2]);
            result.push({
                raw: trimmed,
                cleanText: nestedMatch[1].trim(),
                weight: isNaN(weightVal) ? 1.0 : weightVal,
                weightStr: nestedMatch[2],
                isGrouped: false
            });
            continue;
        }

        // Implicit weight by parentheses depth: ((tag)) or (tag) without colon
        let depth = 0;
        let s = trimmed;
        while (s.startsWith("(") && s.endsWith(")") && !s.includes(":")) {
            depth++;
            s = s.slice(1, -1).trim();
        }
        if (depth > 0) {
            const weight = Number(Math.pow(1.1, depth).toFixed(2));
            result.push({
                raw: trimmed,
                cleanText: s,
                weight: weight,
                weightStr: weight.toString(),
                isGrouped: false
            });
            continue;
        }

        // Plain token
        result.push({
            raw: trimmed,
            cleanText: trimmed,
            weight: 1.0,
            weightStr: "1.0",
            isGrouped: false
        });
    }

    return result;
}

// Classifier
function classifyToken(cleanText, userOverrides = {}) {
    const s = cleanText.toLowerCase().trim();

    if (userOverrides[s]) {
        return userOverrides[s];
    }

    // 1. QUALITY_STYLE
    if (/^(masterpiece|best quality|anime coloring|anime_coloring|newest|absurdres|highres|8k|4k|ultra detailed|top quality)$/i.test(s)) {
        return "QUALITY_STYLE";
    }

    // 3. FRAMING
    if (/^(cowboy shot|upper body|full body|portrait|close-up|dutch angle|from above|from below|wide shot)$/i.test(s)) {
        return "FRAMING";
    }

    // Camera angle anchor
    if (/^eye-level$/i.test(s)) {
        return "FRAMING";
    }

    // 8. LIGHTING_FX
    if (/^(soft sunlight|sunlight|sunbeams|soft rim lighting|rim lighting|\w+ lighting|lighting|depth of field|blurry background|soft shadows|bloom|god rays)$/i.test(s)) {
        return "LIGHTING_FX";
    }

    // 2. CHARACTER_ANATOMY
    if (/^(1girl|solo|tsukatsuki rio|rio tsukatsuki|red eyes|.* eyes|tall female|mature female|large breasts|slender waist|wide hips|thick thighs|halo|pale skin|tan skin)$/i.test(s)) {
        return "CHARACTER_ANATOMY";
    }

    // 5. HAIR_HEADWEAR
    if (/(updo|curls|retro curls|hair|headband|hair up|ponytail|twintails|braid|bangs)/i.test(s) &&
        !/tucking hair/i.test(s)) {
        return "HAIR_HEADWEAR";
    }

    // 6. OUTFIT
    if (/(dress|halter|halterneck|sleeveless|backless|belt|white belt|thighhighs|bare shoulders|minidress|stockings|skirt|boots|shoes|gloves|coat|jacket|bikini)/i.test(s)) {
        return "OUTFIT";
    }

    // 4. POSE_EXPRESSION (Held objects, Actions, Gaze & expressions)
    if (/(holding|book|carrying|grabbing|clipboard|folder|hand on|arms|sitting at|standing at|walking|stepping|leaning|turning|tucking|looking|expression|embarrassed|blush|shy|smile|head tilt|focused|serene|calm|gaze)/i.test(s)) {
        return "POSE_EXPRESSION";
    }

    // 7. ENVIRONMENT
    if (/(standing|sitting|indoor|outdoor|classroom|hallway|corridor|desk|chair|chalkboard|lockers|curtains|door|sliding door|window|afternoon|night)/i.test(s)) {
        return "ENVIRONMENT";
    }

    return "ENVIRONMENT";
}

// Check if token mentions books
function hasBookReference(cleanText) {
    const s = cleanText.toLowerCase();
    return /\b(book|books|novel|textbook|folder|clipboard)\b/i.test(s);
}

// Deterministic Merger
function mergePromptsDeterministic(basePrompt, donorPrompt, options = {}) {
    const {
        clampWeights = true,
        maxActionWeight = 1.25,
        overrides = {}
    } = options;

    const rawBaseTokens = tokenizePrompt(basePrompt);
    const rawDonorTokens = tokenizePrompt(donorPrompt);

    const baseUnpacked = unpackTokens(rawBaseTokens);
    const donorUnpacked = unpackTokens(rawDonorTokens);

    const baseCategorized = baseUnpacked.map(tok => ({
        ...tok,
        category: classifyToken(tok.cleanText, overrides)
    }));

    const donorCategorized = donorUnpacked.map(tok => ({
        ...tok,
        category: classifyToken(tok.cleanText, overrides)
    }));

    // Posture conflict handling:
    // If Donor contains sitting or sitting at *, target posture is sitting
    const donorHasSitting = donorCategorized.some(t =>
        t.cleanText.toLowerCase() === "sitting" || t.cleanText.toLowerCase().startsWith("sitting at")
    );
    const donorHasStanding = donorCategorized.some(t =>
        t.cleanText.toLowerCase() === "standing" || t.cleanText.toLowerCase().startsWith("standing at")
    );
    const targetPosture = donorHasSitting ? "sitting" : (donorHasStanding ? "standing" : "standing");

    // Smart prop extraction:
    const donorHasSlidingDoor = donorCategorized.some(t =>
        t.cleanText.toLowerCase().includes("sliding door")
    );

    // Desk upgrade:
    const donorHasWoodenDesks = donorCategorized.some(t =>
        t.cleanText.toLowerCase().includes("wooden desk")
    );

    // --- SLOT 1: Quality & Style (100% from Base) ---
    const slot1Tokens = baseCategorized.filter(t => t.category === "QUALITY_STYLE").map(t => t.raw);

    // --- SLOT 2: Character Identity & Anatomy (100% from Base, excluding halo) ---
    const slot2Tokens = baseCategorized
        .filter(t => t.category === "CHARACTER_ANATOMY" && t.cleanText.toLowerCase() !== "halo")
        .map(t => t.raw);

    // --- SLOT 3: Framing + Donor Pose/Expression ---
    const baseFraming = baseCategorized
        .filter(t => t.category === "FRAMING" && t.cleanText.toLowerCase() !== "eye-level")
        .map(t => t.raw);

    const donorPoseExpression = donorCategorized.filter(t => t.category === "POSE_EXPRESSION");
    const injectedDonorPose = donorPoseExpression.map(tok => {
        let finalWeight = tok.weight;
        if (clampWeights && finalWeight > maxActionWeight) {
            finalWeight = maxActionWeight;
            return formatTokenWithWeight(tok.cleanText, finalWeight);
        }
        return tok.raw;
    });

    const slot3Tokens = [...baseFraming, ...injectedDonorPose];

    // --- SLOT 4: Halo + Base Hair & Outfit Lock ---
    const baseHasHalo = baseCategorized.some(t => t.cleanText.toLowerCase() === "halo");
    const haloTokens = baseHasHalo ? ["halo"] : [];
    const baseHair = baseCategorized.filter(t => t.category === "HAIR_HEADWEAR").map(t => t.raw);
    const baseOutfit = baseCategorized.filter(t => t.category === "OUTFIT").map(t => t.raw);
    const slot4Tokens = [...haloTokens, ...baseHair, ...baseOutfit];

    // --- SLOT 5: Camera Angle, Posture & Environment Merge ---
    const slot5Tokens = [];
    
    // 1. Camera angle (eye-level)
    const hasEyeLevel = baseCategorized.some(t => t.cleanText.toLowerCase() === "eye-level") ||
                        donorCategorized.some(t => t.cleanText.toLowerCase() === "eye-level");
    if (hasEyeLevel) {
        slot5Tokens.push("eye-level");
    }

    // 2. Posture (standing / sitting)
    slot5Tokens.push(targetPosture);

    // 3. Location tags
    const baseEnvClean = baseCategorized.filter(t =>
        t.category === "ENVIRONMENT" &&
        t.cleanText.toLowerCase() !== "standing" &&
        t.cleanText.toLowerCase() !== "sitting"
    );

    const isBaseClassroomDesk = (text) => /classroom desk in background/i.test(text);

    // Base location tags (indoor, classroom, school hallway, etc.)
    const locationTags = [];
    for (const b of baseEnvClean) {
        const lower = b.cleanText.toLowerCase();
        if (lower === "indoor" || lower === "classroom" || lower === "school hallway" || lower === "outdoor") {
            if (!locationTags.includes(b.raw)) locationTags.push(b.raw);
        }
    }
    slot5Tokens.push(...locationTags);

    // Smart prop: sliding door placed right after classroom / school hallway
    if (donorHasSlidingDoor && !slot5Tokens.includes("sliding door")) {
        slot5Tokens.push("sliding door");
    }

    // Desk upgrade:
    let addedDesks = false;
    if (donorHasWoodenDesks && baseEnvClean.some(b => isBaseClassroomDesk(b.cleanText))) {
        slot5Tokens.push("wooden desks in background");
        addedDesks = true;
    }

    // Other environment tags from donor
    for (const d of donorCategorized) {
        if (d.category === "ENVIRONMENT") {
            const lower = d.cleanText.toLowerCase();
            if (lower === "standing" || lower === "sitting") continue;
            if (lower === "indoor" || lower === "classroom" || lower === "school hallway") continue;
            if (lower === "sliding door") continue;
            if (lower === "afternoon" || lower === "night") continue; // time tags stripped under base lighting lock
            if (lower.includes("wooden desk") && addedDesks) continue;
            if (!slot5Tokens.includes(d.raw) && !slot5Tokens.some(s => s.toLowerCase() === lower)) {
                slot5Tokens.push(d.raw);
            }
        }
    }

    // If desks not yet added and base has desk, keep base desk
    if (!addedDesks) {
        for (const b of baseEnvClean) {
            const lower = b.cleanText.toLowerCase();
            if (lower === "indoor" || lower === "classroom" || lower === "school hallway") continue;
            if (!slot5Tokens.includes(b.raw) && !slot5Tokens.some(s => s.toLowerCase() === lower)) {
                slot5Tokens.push(b.raw);
            }
        }
    }

    // --- SLOT 6: Lighting & Render Lock (100% from Base) ---
    const baseLighting = [];
    const baseWindow = baseCategorized.find(t => t.cleanText.toLowerCase() === "window");
    if (baseWindow) {
        baseLighting.push(baseWindow.raw);
    }
    const baseLightingRest = baseCategorized.filter(t =>
        t.category === "LIGHTING_FX" && t.cleanText.toLowerCase() !== "window"
    ).map(t => t.raw);
    baseLighting.push(...baseLightingRest);
    const slot6Tokens = baseLighting;

    // Join all slots
    const allSlots = [
        ...slot1Tokens,
        ...slot2Tokens,
        ...slot3Tokens,
        ...slot4Tokens,
        ...slot5Tokens,
        ...slot6Tokens
    ];

    const finalMergedPrompt = allSlots.join(", ");

    // Check if injected pose/actions contain books
    const hasBookInScene = donorPoseExpression.some(t => hasBookReference(t.cleanText));

    // Audit tracking for UI display
    const baseAudit = baseCategorized.map(t => {
        let status = "LOCKED_KEPT";
        if (t.category === "POSE_EXPRESSION") {
            status = "PURGED_ACTION";
        } else if ((t.cleanText.toLowerCase() === "standing" && targetPosture === "sitting") ||
                   (t.cleanText.toLowerCase() === "sitting" && targetPosture === "standing")) {
            status = "REPLACED_POSTURE";
        } else if (isBaseClassroomDesk(t.cleanText) && addedDesks) {
            status = "REPLACED_DESK";
        }
        return { ...t, status };
    });

    const donorAudit = donorCategorized.map(t => {
        let status = "IGNORED_LOCKED";
        if (t.category === "POSE_EXPRESSION") {
            status = "INJECTED_ACTION";
        } else if (t.category === "ENVIRONMENT") {
            const lower = t.cleanText.toLowerCase();
            if (lower === "sliding door" || lower.includes("wooden desk") || lower === "chalkboard in background" || lower === "curtains" || lower === "corridor windows" || lower === "school chair") {
                status = "INJECTED_PROP";
            } else if (lower === "afternoon" || lower === "night") {
                status = "IGNORED_CONFLICT";
            } else {
                status = "IGNORED_DUPLICATE";
            }
        } else if (t.category === "FRAMING") {
            status = "RETAINED_FRAMING";
        }
        return { ...t, status };
    });

    return {
        slot1: slot1Tokens,
        slot2: slot2Tokens,
        slot3: slot3Tokens,
        slot4: slot4Tokens,
        slot5: slot5Tokens,
        slot6: slot6Tokens,
        finalMergedPrompt,
        baseAudit,
        donorAudit,
        hasBookInScene,
        targetPosture,
        suggestedNegativePrompt: hasBookInScene ? "" : "book, holding book, open book, holding object"
    };
}

// -------------------------------------------------------------
// VERIFICATION TESTS FOR ALL SCENES
// -------------------------------------------------------------
console.log("=== RUNNING REGRESSION TESTS FOR ALL SCENES ===");

const BASE_INPUT = `masterpiece, best quality, (anime coloring:1.15), 1girl, tsukatsuki rio, solo, red eyes, tall female, mature female, large breasts, slender waist, wide hips, thick thighs, cowboy shot, ((holding book to chest:1.35)), (book covering chest:1.20), (book against chest:1.25), (hand on cheek:1.15), looking away, embarrassed, blush, shy expression, halo, (updo:1.10), (retro curls:1.10), (short hair:1.10), (red headband:1.10), (polka dot headband:1.10), (burgundy dress:1.10), (halter dress:1.10), (sleeveless dress:1.10), (backless dress:1.10), (white belt:1.10), (short dress:1.10), (sheer black thighhighs:1.10), (bare shoulders:1.10), eye-level, standing, classroom desk in background, indoor, classroom, window, soft sunlight, soft rim lighting, depth of field`;

// SCENE 1
const DONOR_SCENE_1 = `(anime_coloring:1.15), masterpiece, best quality, newest, absurdres, highres, 1girl, tsukatsuki rio, solo, halo, red eyes, mature female, large breasts, wide hips, thick thighs, (short hair, hair up, updo, curly hair:1.25), (red headband, polka dot headband:1.2), (burgundy dress, halterneck, sleeveless dress, backless dress, white belt, minidress, sheer black thighhighs, bare shoulders:1.3), cowboy shot, (standing at sliding door, hand on door:1.3), looking at viewer, calm expression, head tilt, indoor, classroom, afternoon, sunlight, wooden desks, depth of field`;

const EXPECTED_SCENE_1 = `masterpiece, best quality, (anime coloring:1.15), 1girl, tsukatsuki rio, solo, red eyes, tall female, mature female, large breasts, slender waist, wide hips, thick thighs, cowboy shot, (standing at sliding door:1.25), (hand on door:1.25), looking at viewer, calm expression, head tilt, halo, (updo:1.10), (retro curls:1.10), (short hair:1.10), (red headband:1.10), (polka dot headband:1.10), (burgundy dress:1.10), (halter dress:1.10), (sleeveless dress:1.10), (backless dress:1.10), (white belt:1.10), (short dress:1.10), (sheer black thighhighs:1.10), (bare shoulders:1.10), eye-level, standing, indoor, classroom, sliding door, wooden desks in background, window, soft sunlight, soft rim lighting, depth of field`;

const res1 = mergePromptsDeterministic(BASE_INPUT, DONOR_SCENE_1);
assert.equal(res1.finalMergedPrompt, EXPECTED_SCENE_1);
assert.equal(res1.hasBookInScene, false);
assert.ok(res1.suggestedNegativePrompt.includes("book"));
console.log("✓ Scene 1 test passed!");

// SCENE 4: Sitting posture test
const DONOR_SCENE_4 = `cowboy shot, (sitting at desk:1.25), (holding open book on desk:1.20), (tucking hair behind ear:1.15), looking down, focused expression, calm expression, sitting, indoor, classroom, wooden desk, school chair`;
const res4 = mergePromptsDeterministic(BASE_INPUT, DONOR_SCENE_4);
assert.equal(res4.targetPosture, "sitting");
assert.ok(res4.finalMergedPrompt.includes("eye-level, sitting"));
assert.equal(res4.hasBookInScene, true);
assert.equal(res4.suggestedNegativePrompt, "");
console.log("✓ Scene 4 (Sitting + Book retention) test passed!");

console.log("\n>>> ALL REGRESSION TEST SUITES PASSED PERFECTLY! <<<");
