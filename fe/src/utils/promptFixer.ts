/**
 * General-Purpose Prompt Fixer & Semantic Aligner
 * 
 * Automatically diagnoses and fixes Stable Diffusion / Anime / Photorealistic prompts:
 * - Quality bloat compaction (reduces redundant tokens)
 * - Chunk 1 front-loading (locks subject & core action within 75 tokens for 100% full attention)
 * - Dynamic prop & limb pose disambiguation (works with any item: books, weapons, phones, cups, etc.)
 * - Surface decoupling (prevents 'beside desk/table' from hijacking hands holding props)
 * - Multi-tag weight group unbundling
 * - Danbooru syntax normalization
 * - Negative prompt integrity guarding
 */

import { tokenizeClipPrompt, type TokenizerResult } from "./clipTokenizer";

export interface PromptIssue {
    id: string;
    type:
        | "quality_bloat"
        | "chunk_overflow"
        | "pose_conflict"
        | "surface_trap"
        | "syntax_natural"
        | "weight_group"
        | "negative_missing";
    title: string;
    severity: "critical" | "warning" | "info";
    detail: string;
    affectedTags: string[];
    proposedFix: string;
}

export interface PromptHealthReport {
    overallScore: number; // 0 - 100
    tokenCount: number;
    chunkCount: number;
    issues: PromptIssue[];
    primaryActionChunk: number;
    hasPoseConflict: boolean;
    hasQualityBloat: boolean;
    hasWeightGroup: boolean;
    hasNaturalSyntax: boolean;
    detectedProps: string[];
}

export interface FixOptions {
    compactQuality: boolean;
    frontloadCoreAction: boolean;
    resolvePoseConflicts: boolean;
    unbundleWeightGroups: boolean;
    normalizeDanbooruSyntax: boolean;
    decoupleSurfaceInteractions: boolean;
    guardNegativePrompt: boolean;
    strictChunk1: boolean;
}

export interface FixResult {
    originalPositive: string;
    fixedPositive: string;
    originalNegative: string;
    fixedNegative: string;
    tokensBefore: number;
    tokensAfter: number;
    chunksBefore: number;
    chunksAfter: number;
    scoreBefore: number;
    scoreAfter: number;
    actionChunkBefore: number;
    actionChunkAfter: number;
    appliedFixes: string[];
    removedBloatCount: number;
    detectedProps: string[];
}

// Common quality tags across SD 1.5, SDXL, Pony, Illustrious
const REDUNDANT_QUALITY_TAGS = new Set([
    "masterpiece",
    "best quality",
    "very aesthetic",
    "ultra-detailed",
    "amazing quality",
    "absurdres",
    "highres",
    "newest",
    "extremely detailed",
    "high quality",
    "top quality",
    "flawless",
    "8k",
    "4k",
    "hdr",
    "unreal engine",
    "octane render",
    "trending on pixiv",
    "trending on artstation",
]);

// Prop holding regex patterns for any arbitrary object
const PROP_HOLDING_REGEX = /\b(?:holding|hugging|carrying|grasping|wielding|brandishing|clutching)\s+([a-zA-Z_-]+(?:\s+[a-zA-Z_-]+)?)/gi;

// Secondary hand / arm pose keywords
const HAND_ARM_POSES = [
    "hand on cheek",
    "hands on cheeks",
    "hand to mouth",
    "hands on hips",
    "arms behind back",
    "arms crossed",
    "waving",
    "peace sign",
    "pointing",
    "hand in pocket",
    "hands in pockets",
    "covering mouth",
    "shading eyes",
    "salute",
    "touching hair",
];

// Surface traps that pull hands away from holding props
const SURFACE_INTERACTION_PATTERNS = [
    /\b(?:standing beside|leaning on|sitting at|beside|at)\s+(desk|table|counter|podium|rail|bar)\b/gi,
];

// Essential negative prompt guards for anatomy & object holding
const GENERAL_NEGATIVE_GUARDS = [
    "bad hands",
    "missing fingers",
    "extra hands",
    "extra arms",
    "empty hands",
    "poorly drawn hands",
    "deformed limbs",
    "floating limbs",
    "holding at side",
];

/**
 * Diagnostic analyzer: scans any prompt for token efficiency, chunk overflow, and pose logic
 */
export function analyzePrompt(
    positivePrompt: string,
    negativePrompt: string = ""
): PromptHealthReport {
    const tokenResult: TokenizerResult = tokenizeClipPrompt(positivePrompt);
    const issues: PromptIssue[] = [];
    const totalTokens = tokenResult.totalTextTokens;
    const chunkCount = tokenResult.chunks.length;
    const lowerPositive = positivePrompt.toLowerCase();
    const tags = positivePrompt.split(",").map((t) => t.trim()).filter(Boolean);

    // 1. Detect Quality Bloat
    const qualityTagsFound: string[] = [];
    tags.forEach((t) => {
        const clean = t.replace(/^\(+|\)+$/g, "").replace(/:[0-9.]+$/, "").trim().toLowerCase();
        if (REDUNDANT_QUALITY_TAGS.has(clean)) {
            qualityTagsFound.push(t);
        }
    });

    const hasQualityBloat = qualityTagsFound.length >= 4;
    if (hasQualityBloat) {
        issues.push({
            id: "quality_bloat",
            type: "quality_bloat",
            title: `Quality Bloat Berlebih (${qualityTagsFound.length} Tag)`,
            severity: "warning",
            detail: `Terdapat ${qualityTagsFound.length} tag kualitas bertumpuk di awal prompt yang menghabiskan kuota Chunk 1 tanpa menambah nilai visual yang unik.`,
            affectedTags: qualityTagsFound,
            proposedFix: "Ringkas menjadi 2–3 tag pemicu kualitas utama agar token Chunk 1 bisa dimanfaatkan untuk subjek & aksi.",
        });
    }

    // 2. Detect Props & Actions
    const detectedProps: string[] = [];
    let match: RegExpExecArray | null;
    const regex = new RegExp(PROP_HOLDING_REGEX);
    while ((match = regex.exec(lowerPositive)) !== null) {
        const prop = match[1].trim();
        if (!detectedProps.includes(prop) && prop !== "hands" && prop !== "arms") {
            detectedProps.push(prop);
        }
    }

    // Check where the primary action / prop holding lands
    let primaryActionChunk = 1;
    let propHoldingTag = "";
    for (const span of tokenResult.tagSpans) {
        const clean = span.cleanText.toLowerCase();
        if (
            clean.includes("holding") ||
            clean.includes("hugging") ||
            clean.includes("wielding") ||
            clean.includes("carrying") ||
            HAND_ARM_POSES.some((kw) => clean.includes(kw))
        ) {
            primaryActionChunk = span.primaryChunk;
            propHoldingTag = span.tagText;
            break;
        }
    }

    if (primaryActionChunk > 1 && propHoldingTag) {
        issues.push({
            id: "chunk_overflow",
            type: "chunk_overflow",
            title: `Aksi Inti Terlempar ke Chunk ${primaryActionChunk} (Bukan Chunk 1)`,
            severity: "critical",
            detail: `Aksi "${propHoldingTag}" berada di Chunk ${primaryActionChunk}. Perhatian cross-attention model pada chunk ini mengalami penurunan ~${primaryActionChunk === 2 ? "18-20%" : "45%+"}, menyebabkan pose sering meleset atau objek hilang.`,
            affectedTags: [propHoldingTag],
            proposedFix: "Lakukan 'Front-Loading' aksi utama ke Chunk 1 (urutan tepat setelah karakter).",
        });
    }

    // 3. Detect Hand Pose Conflicts
    const hasHandPose = HAND_ARM_POSES.some((kw) => lowerPositive.includes(kw));
    const hasPropHolding = detectedProps.length > 0;
    const hasPoseConflict = hasPropHolding && hasHandPose;

    if (hasPoseConflict) {
        issues.push({
            id: "pose_conflict",
            type: "pose_conflict",
            title: "Konflik Anatomi Tangan (Memegang Objek + Pose Tangan Lain)",
            severity: "critical",
            detail: `Prompt meminta memegang objek (${detectedProps.join(", ")}) sekaligus pose tangan lain (misal: hand on cheek / waving). Tanpa penegasan koordinasi tangan, AI sering menjatuhkan objek ke samping atau menggambar tangan ekstra.`,
            affectedTags: tags.filter((t) => {
                const low = t.toLowerCase();
                return (
                    HAND_ARM_POSES.some((kw) => low.includes(kw)) ||
                    detectedProps.some((p) => low.includes(p))
                );
            }),
            proposedFix: "Perjelas koordinasi tangan secara eksplisit dengan pembobotan tinggi.",
        });
    }

    // 4. Detect Surface Traps (e.g. beside desk/table pulling hand down)
    const hasSurfaceTrap = hasPropHolding && SURFACE_INTERACTION_PATTERNS.some((p) => p.test(lowerPositive));
    if (hasSurfaceTrap) {
        const surfaceTags = tags.filter((t) =>
            SURFACE_INTERACTION_PATTERNS.some((p) => p.test(t.toLowerCase()))
        );
        issues.push({
            id: "surface_trap",
            type: "surface_trap",
            title: "Interaksi Meja/Permukaan Menjebak Posisi Tangan",
            severity: "warning",
            detail: "Tag seperti 'standing beside desk' atau 'leaning on table' memicu AI untuk meletakkan tangan menumpu ke meja, sehingga objek yang dipegang malah ditaruh di pinggul/meja.",
            affectedTags: surfaceTags,
            proposedFix: "Ubah menjadi 'standing, desk in background' agar tangan bebas memegang objek di posisi yang diinginkan.",
        });
    }

    // 5. Detect Casual Natural Syntax (e.g. 'hugging X')
    const hasNaturalHugging = /\bhugging\s+[a-zA-Z]+/i.test(lowerPositive);
    if (hasNaturalHugging) {
        issues.push({
            id: "syntax_natural",
            type: "syntax_natural",
            title: "Sintaks Bahasa Natural Kasual ('hugging <objek>')",
            severity: "info",
            detail: "Dataset training anime (Danbooru) menggunakan tag 'holding <objek>, holding to chest' daripada kata 'hugging'. Tag kasual memiliki aktivasi visual yang lebih lemah.",
            affectedTags: tags.filter((t) => /hugging/i.test(t)),
            proposedFix: "Ganti dengan pasangan tag Danbooru: 'holding <objek>, holding to chest'.",
        });
    }

    // 6. Detect Giant Weight Groups
    const giantGroups: string[] = [];
    tags.forEach((t) => {
        const match = t.match(/^\((.+):([0-9.]+)\)$/);
        if (match && match[1].includes(",")) {
            const innerCount = match[1].split(",").length;
            if (innerCount >= 3) {
                giantGroups.push(t);
            }
        }
    });

    const hasWeightGroup = giantGroups.length > 0;
    if (hasWeightGroup) {
        issues.push({
            id: "weight_group",
            type: "weight_group",
            title: `Kurung Bobot Raksasa Terdeteksi (${giantGroups.length} Kelompok)`,
            severity: "warning",
            detail: "Mengelompokkan banyak atribut ke dalam 1 kurung berbobot tinggi menyedot kuota cross-attention chunk secara berlebihan dan mengaburkan objek di sekitarnya.",
            affectedTags: giantGroups,
            proposedFix: "Pecah kurung raksasa menjadi tag individual mandiri dengan bobot teratur.",
        });
    }

    // 7. Check Negative Prompt Guards
    const lowerNegative = negativePrompt.toLowerCase();
    const missingGuards = GENERAL_NEGATIVE_GUARDS.filter((g) => !lowerNegative.includes(g));
    if (missingGuards.length >= 3) {
        issues.push({
            id: "negative_missing",
            type: "negative_missing",
            title: "Negative Prompt Belum Memuat Pelindung Anatomi Standar",
            severity: "info",
            detail: `Negative prompt belum memuat tag pelindung anatomi penting seperti '${missingGuards.slice(0, 3).join(", ")}'.`,
            affectedTags: [],
            proposedFix: "Sisipkan tag anti-glitch tangan & anggota tubuh ke Negative Prompt.",
        });
    }

    // Calculate score
    let score = 100;
    issues.forEach((iss) => {
        if (iss.severity === "critical") score -= 25;
        else if (iss.severity === "warning") score -= 15;
        else if (iss.severity === "info") score -= 5;
    });
    score = Math.max(10, Math.min(100, score));

    return {
        overallScore: score,
        tokenCount: totalTokens,
        chunkCount,
        issues,
        primaryActionChunk,
        hasPoseConflict,
        hasQualityBloat,
        hasWeightGroup,
        hasNaturalSyntax: hasNaturalHugging,
        detectedProps,
    };
}

/**
 * Universal tag categorization for golden semantic hierarchy
 */
interface CategorizedTags {
    quality: string[];
    subject: string[];
    actionPose: string[];
    expression: string[];
    hairHead: string[];
    outfit: string[];
    camera: string[];
    environment: string[];
    lora: string[];
    other: string[];
}

function categorizeGeneralTag(tag: string): keyof CategorizedTags {
    const low = tag.toLowerCase().trim();
    if (low.startsWith("<lora:")) return "lora";

    // Quality
    const unweighted = low.replace(/^\(+|\)+$/g, "").replace(/:[0-9.]+$/, "").trim();
    if (REDUNDANT_QUALITY_TAGS.has(unweighted) || low.includes("coloring") || low.includes("aesthetic")) {
        return "quality";
    }

    // Action & Pose & Prop interactions
    if (
        low.includes("holding") ||
        low.includes("hugging") ||
        low.includes("carrying") ||
        low.includes("wielding") ||
        low.includes("clutched") ||
        low.includes("clutching") ||
        low.includes("touching") ||
        low.includes("against chest") ||
        low.includes("to chest") ||
        HAND_ARM_POSES.some((p) => low.includes(p)) ||
        low.includes("standing") ||
        low.includes("sitting") ||
        low.includes("kneeling") ||
        low.includes("lying") ||
        low.includes("walking") ||
        low.includes("running") ||
        low.includes("jumping")
    ) {
        return "actionPose";
    }

    // Expression & Emotion
    if (
        low.includes("blush") ||
        low.includes("embarrassed") ||
        low.includes("shy") ||
        low.includes("looking") ||
        low.includes("smile") ||
        low.includes("frown") ||
        low.includes("expression") ||
        low.includes("eyes closed") ||
        low.includes("mouth") ||
        low.includes("gaze") ||
        low.includes("tears") ||
        low.includes("pout")
    ) {
        return "expression";
    }

    // Hair & Headwear
    if (
        low.includes("hair") ||
        low.includes("curls") ||
        low.includes("updo") ||
        low.includes("braid") ||
        low.includes("ponytail") ||
        low.includes("twintails") ||
        low.includes("headband") ||
        low.includes("ribbon") ||
        low.includes("hat") ||
        low.includes("cap") ||
        low.includes("halo") ||
        low.includes("horns") ||
        low.includes("ears")
    ) {
        return "hairHead";
    }

    // Subject & Body identity
    if (
        low.includes("girl") ||
        low.includes("boy") ||
        low.includes("1girl") ||
        low.includes("2girls") ||
        low.includes("solo") ||
        low.includes("female") ||
        low.includes("male") ||
        low.includes("woman") ||
        low.includes("man") ||
        low.includes("breasts") ||
        low.includes("waist") ||
        low.includes("hips") ||
        low.includes("thighs") ||
        low.includes("eyes") ||
        low.includes("body") ||
        low.includes("character")
    ) {
        return "subject";
    }

    // Outfit & Clothing
    if (
        low.includes("dress") ||
        low.includes("shirt") ||
        low.includes("skirt") ||
        low.includes("pants") ||
        low.includes("jacket") ||
        low.includes("suit") ||
        low.includes("uniform") ||
        low.includes("belt") ||
        low.includes("shoes") ||
        low.includes("boots") ||
        low.includes("socks") ||
        low.includes("thighhighs") ||
        low.includes("gloves") ||
        low.includes("shoulders") ||
        low.includes("outfit") ||
        low.includes("costume") ||
        low.includes("armor")
    ) {
        return "outfit";
    }

    // Camera & Framing
    if (
        low.includes("shot") ||
        low.includes("view") ||
        low.includes("portrait") ||
        low.includes("angle") ||
        low.includes("eye-level") ||
        low.includes("from above") ||
        low.includes("from below") ||
        low.includes("close-up") ||
        low.includes("wide shot")
    ) {
        return "camera";
    }

    // Environment, Scenery & Lighting
    if (
        low.includes("indoor") ||
        low.includes("outdoors") ||
        low.includes("room") ||
        low.includes("classroom") ||
        low.includes("office") ||
        low.includes("street") ||
        low.includes("sky") ||
        low.includes("window") ||
        low.includes("lighting") ||
        low.includes("light") ||
        low.includes("sunlight") ||
        low.includes("sunset") ||
        low.includes("shadow") ||
        low.includes("background") ||
        low.includes("depth of field") ||
        low.includes("desk") ||
        low.includes("table") ||
        low.includes("night") ||
        low.includes("day")
    ) {
        return "environment";
    }

    return "other";
}

/**
 * Universal Prompt Fixer: Applies modular fixes for any prompt
 */
export function fixPrompt(
    positivePrompt: string,
    negativePrompt: string = "",
    options: Partial<FixOptions> = {}
): FixResult {
    const opts: FixOptions = {
        compactQuality: true,
        frontloadCoreAction: true,
        resolvePoseConflicts: true,
        unbundleWeightGroups: true,
        normalizeDanbooruSyntax: true,
        decoupleSurfaceInteractions: true,
        guardNegativePrompt: true,
        strictChunk1: false,
        ...options,
    };

    const beforeReport = analyzePrompt(positivePrompt, negativePrompt);
    const appliedFixes: string[] = [];
    let removedBloatCount = 0;

    // Step 1: Unbundle grouped weighted parentheses
    let workingPrompt = positivePrompt;
    if (opts.unbundleWeightGroups) {
        let unbundledCount = 0;
        workingPrompt = workingPrompt.replace(/\(([^()]+):([0-9.]+)\)/g, (fullMatch, content, weightStr) => {
            if (content.includes(",")) {
                unbundledCount++;
                const innerTags = content.split(",").map((t: string) => t.trim()).filter(Boolean);
                const targetWeight = parseFloat(weightStr);
                const safeWeight = targetWeight > 1.15 ? 1.1 : targetWeight;
                return innerTags
                    .map((t: string) => (safeWeight !== 1.0 ? `(${t}:${safeWeight.toFixed(2)})` : t))
                    .join(", ");
            }
            return fullMatch;
        });

        if (unbundledCount > 0) {
            appliedFixes.push(`Memecah ${unbundledCount} kurung bobot ganda menjadi tag individual.`);
        }
    }

    // Step 2: Split prompt into tags
    const rawTags: string[] = [];
    let currentTag = "";
    let parenDepth = 0;

    for (let i = 0; i < workingPrompt.length; i++) {
        const ch = workingPrompt[i];
        if (ch === "(") parenDepth++;
        else if (ch === ")") parenDepth = Math.max(0, parenDepth - 1);

        if (ch === "," && parenDepth === 0) {
            if (currentTag.trim()) rawTags.push(currentTag.trim());
            currentTag = "";
        } else {
            currentTag += ch;
        }
    }
    if (currentTag.trim()) rawTags.push(currentTag.trim());

    // Step 3: Categorize tags into semantic hierarchy
    const buckets: CategorizedTags = {
        quality: [],
        subject: [],
        actionPose: [],
        expression: [],
        hairHead: [],
        outfit: [],
        camera: [],
        environment: [],
        lora: [],
        other: [],
    };

    rawTags.forEach((tag) => {
        const cat = categorizeGeneralTag(tag);
        buckets[cat].push(tag);
    });

    // Step 4: Quality Bloat Normalization
    if (opts.compactQuality && buckets.quality.length >= 4) {
        const preserved: string[] = [];
        const originalCount = buckets.quality.length;

        // Keep standard core triggers
        preserved.push("masterpiece");
        preserved.push("best quality");

        // Preserve anime coloring or aesthetic styling if explicitly present
        const hasAnimeColoring = buckets.quality.some((q) => q.toLowerCase().includes("anime coloring"));
        if (hasAnimeColoring) {
            preserved.push("(anime coloring:1.15)");
        }

        // Preserve rating tags (nsfw, explicit, rating:general, etc.)
        rawTags.forEach((t) => {
            if (/^(?:nsfw|explicit|rating:\w+)$/i.test(t.trim())) {
                if (!preserved.includes(t.trim())) preserved.push(t.trim());
            }
        });

        removedBloatCount = originalCount - preserved.length;
        buckets.quality = preserved;
        appliedFixes.push(`Memadatkan ${removedBloatCount} tag kualitas berulang menjadi 2–3 trigger inti.`);
    }

    // Step 5: Dynamic Prop & Pose Disambiguation (Any Object)
    const detectedProps = beforeReport.detectedProps;
    if (opts.resolvePoseConflicts && detectedProps.length > 0) {
        const primaryProp = detectedProps[0];
        const lowerRaw = rawTags.map((t) => t.toLowerCase());

        // Check if there is an arm/hand pose conflict
        const matchingHandPose = HAND_ARM_POSES.find((p) => lowerRaw.some((t) => t.includes(p)));

        if (opts.normalizeDanbooruSyntax) {
            const hasHugging = lowerRaw.some((t) => t.includes("hugging") || t.includes("against chest"));

            if (hasHugging && matchingHandPose) {
                // Dual action: 1 hand holding prop to chest + 1 hand performing pose
                buckets.actionPose = buckets.actionPose.filter(
                    (t) =>
                        !t.toLowerCase().includes("hugging") &&
                        !t.toLowerCase().includes("against chest") &&
                        !t.toLowerCase().includes(matchingHandPose)
                );
                buckets.actionPose.unshift(
                    `((holding ${primaryProp} to chest:1.35))`,
                    `(${primaryProp} covering chest:1.20)`,
                    `(${primaryProp} against chest:1.25)`,
                    `(${matchingHandPose}:1.15)`
                );
                appliedFixes.push(
                    `Mengharmonisasikan pose: '((holding ${primaryProp} to chest:1.35))' + '(${matchingHandPose}:1.15)' agar objek tetap di dada.`
                );
            } else if (hasHugging) {
                // Holding prop to chest
                buckets.actionPose = buckets.actionPose.filter(
                    (t) => !t.toLowerCase().includes("hugging")
                );
                buckets.actionPose.unshift(
                    `((holding ${primaryProp} to chest:1.35))`,
                    `(${primaryProp} covering chest:1.20)`
                );
                appliedFixes.push(`Mengonversi ke tag Danbooru baku: '((holding ${primaryProp} to chest:1.35))'.`);
            } else if (matchingHandPose) {
                // Normal holding + hand pose
                buckets.actionPose = buckets.actionPose.filter(
                    (t) => !t.toLowerCase().includes(matchingHandPose)
                );
                buckets.actionPose.unshift(
                    `((holding ${primaryProp}:1.25))`,
                    `(${matchingHandPose}:1.15)`
                );
                appliedFixes.push(`Menyeimbangkan prop dan pose tangan: '((holding ${primaryProp}:1.25))' + '(${matchingHandPose}:1.15)'.`);
            }
        }
    }

    // Step 6: Decouple Surface Interactions (e.g. standing beside desk -> desk in background)
    if (opts.decoupleSurfaceInteractions && detectedProps.length > 0) {
        let decoupled = false;
        buckets.environment = buckets.environment.map((envTag) => {
            if (/standing beside desk|beside desk|at desk/i.test(envTag)) {
                decoupled = true;
                return "standing, classroom desk in background";
            }
            if (/beside table|at table|leaning on table/i.test(envTag)) {
                decoupled = true;
                return "standing, table in background";
            }
            return envTag;
        });
        if (decoupled) {
            appliedFixes.push("Membebaskan tangan dari permukaan meja ('desk/table in background') agar tangan fokus memegang objek.");
        }
    }

    // Step 7: Assemble Fixed Prompt in Golden Semantic Hierarchy
    const orderedSegments: string[] = [];

    // 1. Quality Triggers
    if (buckets.quality.length > 0) orderedSegments.push(...buckets.quality);

    // 2. Subject & Identity
    if (buckets.subject.length > 0) orderedSegments.push(...buckets.subject);

    // 3. Core Action & Props (Front-loaded to Chunk 1!)
    if (opts.frontloadCoreAction && buckets.actionPose.length > 0) {
        orderedSegments.push(...buckets.actionPose);
        appliedFixes.push("Front-loading aksi & prop ke Chunk 1 (100% Full Attention).");
    }

    // 4. Expression
    if (buckets.expression.length > 0) orderedSegments.push(...buckets.expression);

    // 5. Hair & Headwear
    if (buckets.hairHead.length > 0) orderedSegments.push(...buckets.hairHead);

    // If not front-loaded, put action here
    if (!opts.frontloadCoreAction && buckets.actionPose.length > 0) {
        orderedSegments.push(...buckets.actionPose);
    }

    // 6. Outfit & Attire
    if (buckets.outfit.length > 0) orderedSegments.push(...buckets.outfit);

    // 7. Camera & Framing
    if (buckets.camera.length > 0) orderedSegments.push(...buckets.camera);

    // 8. Environment, Scenery & Lighting
    if (buckets.environment.length > 0) orderedSegments.push(...buckets.environment);

    // 9. Other & LoRA
    if (buckets.other.length > 0) orderedSegments.push(...buckets.other);
    if (buckets.lora.length > 0) orderedSegments.push(...buckets.lora);

    // Deduplicate while preserving order
    const seen = new Set<string>();
    const finalTags: string[] = [];
    orderedSegments.forEach((tag) => {
        const norm = tag.toLowerCase().trim();
        if (!seen.has(norm)) {
            seen.add(norm);
            finalTags.push(tag.trim());
        }
    });

    const fixedPositive = finalTags.join(", ");

    // Step 8: Negative Prompt Guarding
    let fixedNegative = negativePrompt;
    if (opts.guardNegativePrompt) {
        const lowerNeg = negativePrompt.toLowerCase();
        const guardsToAdd = GENERAL_NEGATIVE_GUARDS.filter((g) => !lowerNeg.includes(g));

        // If props are detected, also guard against holding at side/behind back or dropping prop
        if (detectedProps.length > 0) {
            detectedProps.forEach((p) => {
                const missingPropGuard = `missing ${p}`;
                if (!lowerNeg.includes(missingPropGuard) && !guardsToAdd.includes(missingPropGuard)) {
                    guardsToAdd.push(missingPropGuard);
                }
            });
            if (!lowerNeg.includes("holding behind back") && !guardsToAdd.includes("holding behind back")) {
                guardsToAdd.push("holding behind back");
            }
        }

        if (guardsToAdd.length > 0) {
            fixedNegative = negativePrompt.trim()
                ? `${negativePrompt.trim()}, ${guardsToAdd.join(", ")}`
                : guardsToAdd.join(", ");
            appliedFixes.push(`Menyuntikkan ${guardsToAdd.length} tag pelindung anatomi & prop ke Negative Prompt.`);
        }
    }

    const afterReport = analyzePrompt(fixedPositive, fixedNegative);

    return {
        originalPositive: positivePrompt,
        fixedPositive,
        originalNegative: negativePrompt,
        fixedNegative,
        tokensBefore: beforeReport.tokenCount,
        tokensAfter: afterReport.tokenCount,
        chunksBefore: beforeReport.chunkCount,
        chunksAfter: afterReport.chunkCount,
        scoreBefore: beforeReport.overallScore,
        scoreAfter: afterReport.overallScore,
        actionChunkBefore: beforeReport.primaryActionChunk,
        actionChunkAfter: afterReport.primaryActionChunk,
        appliedFixes,
        removedBloatCount,
        detectedProps,
    };
}

export const PRESET_FIX_SCENARIOS = [
    {
        id: "prop_holding",
        title: "Karakter Memegang Prop (Buku / Map)",
        desc: "Skenario umum karakter mendekap benda di dada dengan ekspresi tersipu.",
        originalPrompt:
            "masterpiece, best quality, very aesthetic, ultra-detailed, nsfw, explicit, (anime coloring:1.15), newest, highres, absurdres, amazing quality, 1girl, solo, red eyes, tall female, mature female, large breasts, slender waist, wide hips, thick thighs, (updo, retro curls:1.2), (red headband, polka dot headband:1.2), (burgundy dress, halter dress, sleeveless dress, backless dress, white belt, short dress, sheer black thighhighs, bare shoulders:1.25), cowboy shot, eye-level, standing beside desk, hugging folder to chest, hand on cheek, looking away, embarrassed, blush, shy expression, indoor, classroom, window, soft sunlight, subtle sunset glow, soft rim lighting, depth of field",
        originalNegative:
            "worst quality, low quality, bad anatomy, bad hands, blurry",
    },
    {
        id: "weapon_battle_stance",
        title: "Battle Stance / Senjata Suci",
        desc: "Karakter memegang senjata (pedang) dengan deskripsi armor panjang yang berisiko mendorong aksi ke Chunk 2.",
        originalPrompt:
            "masterpiece, best quality, ultra-detailed, 8k resolution, photorealistic, amazing quality, newest, 1girl, knight, solo, silver hair, ponytail, intricate gothic plate armor, engraved gold gauntlets, glowing shoulder pauldrons, flowing white cape, metal greaves, chainmail skirt, holding holy excalibur sword with both hands, battle stance, fierce expression, looking at viewer, dynamic angle, dramatic rim lighting, sparks, ruined cathedral background, dust particles",
        originalNegative:
            "worst quality, low quality, bad anatomy, bad hands",
    },
    {
        id: "casual_cafe_props",
        title: "Casual Cafe (Kopi & Smartphone)",
        desc: "Interaksi dua benda di cafe (cangkir kopi dan handphone) agar tangan tidak cacat.",
        originalPrompt:
            "masterpiece, best quality, aesthetic, 1girl, solo, brown hair, bob cut, smiling, cozy knit sweater, plaid skirt, sitting at table, holding coffee cup, checking smartphone, sunny afternoon, cafe interior, wooden furniture, plants, window light, soft focus",
        originalNegative:
            "worst quality, low quality, bad hands",
    },
];
