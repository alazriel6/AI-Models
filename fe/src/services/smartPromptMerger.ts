import type {
    AttributeCategory,
    CharacterProfile,
    LockConfiguration,
    MainSceneMergeOptions,
    MainSceneMergeResult,
    MergeMode,
    PromptAttribute,
    StoryScene,
    SuppressedTagDetail,
    ValidationWarning,
} from "../types/storyMerger";
import {
    areAttributesSemanticallyEquivalent,
    createDefaultLocks,
    normalizeSemanticTag,
} from "./semanticComparator";
import { extractTagWeight, parsePromptLocal } from "./promptParserService";

/**
 * Standard golden hierarchy ordering for Stable Diffusion / SDXL / Pony / Illustrious attention chunks:
 * Chunk 1 Front-loading: Quality -> Subject/Character -> Hair & Eyes -> Outfit -> Pose, Action & Props
 * Chunk 2 Follow-through: Expression -> Accessories -> Background/Location -> Lighting -> Camera -> Art Style
 */
const CATEGORY_CHUNK_ORDER: AttributeCategory[] = [
    "quality",
    "character_identity",
    "physical_appearance",
    "hair",
    "eyes",
    "outfit",
    "pose",
    "action",
    "objects",
    "expression",
    "accessories",
    "background",
    "lighting",
    "camera",
    "art_style",
    "other",
];

/**
 * High-precision semantic prompt tag deduplication engine:
 * - Strips weights and wrappers to match semantic keys
 * - Keeps the higher explicit weight if identical tags are supplied
 * - Eliminates redundant sub-phrases (e.g. "red polka dot headband" eliminates redundant "headband")
 * - Case-insensitive and punctuation-invariant
 */
export function deduplicatePromptTags(rawTagList: string[]): string[] {
    const seenNormalized = new Map<string, { tag: string; weight: number; index: number }>();
    const result: string[] = [];

    rawTagList.forEach((rawTag) => {
        const trimmed = rawTag.trim();
        if (!trimmed) return;

        const { cleanText, weight } = extractTagWeight(trimmed);
        const normKey = normalizeSemanticTag(cleanText);
        if (!normKey) return;

        // 1. Direct semantic key collision
        if (seenNormalized.has(normKey)) {
            const existing = seenNormalized.get(normKey)!;
            // Upgrade existing tag if incoming tag has a higher explicit weight
            if (weight > existing.weight) {
                seenNormalized.set(normKey, { tag: trimmed, weight, index: existing.index });
                result[existing.index] = trimmed;
            }
            return;
        }

        // 2. Multi-word phrase containment collision (e.g. "polka dot headband" vs "red polka dot headband")
        let isRedundant = false;
        for (const [existingKey, existingData] of seenNormalized.entries()) {
            if (areAttributesSemanticallyEquivalent(normKey, existingKey)) {
                // If incoming tag is more specific/longer, replace existing
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

/**
 * Merges Prompt 1 (Main Prompt / Anchor) and Prompt 2 (Tambahan Scene / Continuation):
 * - Prompt 1 provides the master DNA: Character, Appearance, Hair, Eyes, Outfit, Accessories, Art Style, Lighting & Coloring, Quality.
 * - Prompt 2 provides the scene evolution: Pose, Action, Expression, Objects, Camera, and optional Doorway/Background nuances.
 * - Eliminates all duplicate and clashing tags ("0 Tag Double").
 * - Locks Lighting & Coloring to Prompt 1 so lighting, cel shading, and color palette never miss!
 */
export function mergeMainAndScenePrompt(
    mainPromptText: string,
    scenePromptText: string,
    mainNegativeText = "",
    sceneNegativeText = "",
    options?: MainSceneMergeOptions
): MainSceneMergeResult {
    const locks = { ...createDefaultLocks(), ...(options?.locks || {}) };
    const keepSameBackground = options?.keepSameBackground ?? true;
    const mode = options?.mergeMode || "smart";

    const mainParsed = parsePromptLocal(mainPromptText, mainNegativeText);
    const sceneParsed = parsePromptLocal(scenePromptText, sceneNegativeText);

    const warnings: ValidationWarning[] = [];
    const inheritedFromMain: Record<AttributeCategory, PromptAttribute[]> = {
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
    const appliedFromScene: Record<AttributeCategory, PromptAttribute[]> = {
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
    const suppressedSceneTags: SuppressedTagDetail[] = [];
    const finalAttributesByCategory: Record<AttributeCategory, PromptAttribute[]> = {
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

    CATEGORY_CHUNK_ORDER.forEach((cat) => {
        const isLocked = locks[cat] ?? true;
        const mainAttrs = mainParsed[cat] || [];
        const sceneAttrs = sceneParsed[cat] || [];

        if (isLocked) {
            // Locked Category: Prompt 1 (Main Prompt) is the absolute DNA source of truth!
            if (mainAttrs.length > 0) {
                finalAttributesByCategory[cat] = [...mainAttrs];
                inheritedFromMain[cat] = [...mainAttrs];
            } else if (sceneAttrs.length > 0) {
                finalAttributesByCategory[cat] = [...sceneAttrs];
                appliedFromScene[cat] = [...sceneAttrs];
            }

            // Detect and suppress any tags in Scene 2 that clash or duplicate Main Prompt
            if (sceneAttrs.length > 0 && mainAttrs.length > 0) {
                sceneAttrs.forEach((sAttr) => {
                    const isIdentical = mainAttrs.some((mAttr) =>
                        areAttributesSemanticallyEquivalent(mAttr.normalizedValue, sAttr.normalizedValue)
                    );
                    if (isIdentical) {
                        suppressedSceneTags.push({
                            tag: sAttr.text,
                            reason: `Duplikat identik dengan Main Prompt (dibersihkan agar tidak double)`,
                            category: cat,
                        });
                    } else {
                        suppressedSceneTags.push({
                            tag: sAttr.text,
                            reason: `Kategori ${cat} terkunci dari Main Prompt (diabaikan agar konsisten)`,
                            category: cat,
                        });
                        warnings.push({
                            id: `warn-lock-${cat}-${Date.now().toString(36)}`,
                            type: "conflict",
                            category: cat,
                            message: `Kategori "${cat}" TERKUNCI pada Main Prompt. Atribut Scene 2 "${sAttr.text}" diabaikan agar karakter & visual tetap konsisten.`,
                            severity: mode === "strict_locks" ? "error" : "warning",
                            conflictingTags: [sAttr.text],
                        });
                    }
                });
            }
        } else {
            // Unlocked Category: Scene 2 takes precedence
            if (cat === "background" && keepSameBackground) {
                // Continuous Scene in Same Location (e.g. Classroom):
                inheritedFromMain.background = [...mainAttrs];
                appliedFromScene.background = [...sceneAttrs];

                const combinedBg = [...mainAttrs];
                sceneAttrs.forEach((sAttr) => {
                    const alreadyPresent = combinedBg.some((m) =>
                        areAttributesSemanticallyEquivalent(m.normalizedValue, sAttr.normalizedValue)
                    );
                    if (!alreadyPresent) {
                        combinedBg.push(sAttr);
                    } else {
                        suppressedSceneTags.push({
                            tag: sAttr.text,
                            reason: `Latar "${sAttr.text}" sudah ada di Main Prompt (dideduplikasi)`,
                            category: "background",
                        });
                    }
                });
                finalAttributesByCategory.background = combinedBg;
            } else {
                // Pose, Action, Expression, Objects, Camera:
                if (sceneAttrs.length > 0) {
                    finalAttributesByCategory[cat] = [...sceneAttrs];
                    appliedFromScene[cat] = [...sceneAttrs];
                    // If Main Prompt had an old action/pose/expression, record that it was overridden
                    if (mainAttrs.length > 0) {
                        suppressedSceneTags.push({
                            tag: mainAttrs.map((a) => a.text).join(", "),
                            reason: `Digantikan oleh aksi/pose baru dari Scene 2`,
                            category: cat,
                        });
                    }
                } else if (mainAttrs.length > 0) {
                    // Fall back to Main Prompt if Scene 2 didn't specify
                    finalAttributesByCategory[cat] = [...mainAttrs];
                    inheritedFromMain[cat] = [...mainAttrs];
                }
            }
        }
    });

    // Assemble raw positive tags in Golden Attention Order
    const rawTagList: string[] = [];
    CATEGORY_CHUNK_ORDER.forEach((cat) => {
        const list = finalAttributesByCategory[cat] || [];
        list.forEach((attr) => {
            const trimmed = attr.text.trim();
            if (trimmed) rawTagList.push(trimmed);
        });
    });

    // Run semantic deduplication
    const deduplicatedTags = deduplicatePromptTags(rawTagList);
    const positive = deduplicatedTags.join(", ");

    // Assemble Negative Prompt
    const rawNegList: string[] = [
        ...(mainParsed.negative || []).map((a) => a.text),
        ...(sceneParsed.negative || []).map((a) => a.text),
        "worst quality",
        "low quality",
        "bad anatomy",
        "bad hands",
        "missing fingers",
        "extra limbs",
        "deformed limbs",
        "blurry",
        "(3d, realistic, photorealistic:1.2)",
        "washed out colors",
        "overexposed",
        "underexposed",
        "inconsistent lighting",
        "deformed halo",
        "broken accessories",
    ];
    const deduplicatedNeg = deduplicatePromptTags(rawNegList);
    const negative = deduplicatedNeg.join(", ");

    // Calculate stats
    let inheritedCount = 0;
    let sceneAddedCount = 0;
    CATEGORY_CHUNK_ORDER.forEach((cat) => {
        inheritedCount += (inheritedFromMain[cat] || []).length;
        sceneAddedCount += (appliedFromScene[cat] || []).length;
    });

    return {
        positive,
        negative,
        warnings,
        inheritedFromMain,
        appliedFromScene,
        suppressedSceneTags,
        stats: {
            totalTags: deduplicatedTags.length,
            inheritedCount,
            sceneAddedCount,
            suppressedCount: suppressedSceneTags.length,
        },
    };
}

/**
 * Generates the compiled positive and negative prompts for a scene based on
 * character profile, scene-specific attributes, lock configurations, and merge mode.
 */
export function compileScenePrompt(
    profile: CharacterProfile,
    scene: StoryScene,
    mode: MergeMode = "smart",
    globalLocks?: LockConfiguration
): {
    positive: string;
    negative: string;
    warnings: ValidationWarning[];
} {
    const locks = globalLocks || scene.locks || profile.locks;
    const warnings: ValidationWarning[] = [];
    const finalAttributesByCategory: Record<AttributeCategory, PromptAttribute[]> = {
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

    // 1. Process each category according to Lock rules and Merge Mode
    CATEGORY_CHUNK_ORDER.forEach((cat) => {
        const isLocked = locks[cat] ?? true;
        const profileAttrs = profile.sharedAttributes[cat] || [];
        const sceneAttrs = scene.sceneSpecificAttributes[cat] || scene.parsedAttributes[cat] || [];

        if (isLocked) {
            // Locked Category: Character Profile is source of truth
            if (profileAttrs.length > 0) {
                finalAttributesByCategory[cat] = [...profileAttrs];
            } else if (sceneAttrs.length > 0) {
                // If profile doesn't have it, fall back to scene
                finalAttributesByCategory[cat] = [...sceneAttrs];
            }

            // Conflict Detection: If scene specifies different attributes for a locked category
            if (sceneAttrs.length > 0 && profileAttrs.length > 0) {
                const differing = sceneAttrs.filter(
                    (s) => !profileAttrs.some((p) => areAttributesSemanticallyEquivalent(p.normalizedValue, s.normalizedValue))
                );

                if (differing.length > 0) {
                    warnings.push({
                        id: `warn-lock-${cat}-${scene.id}`,
                        type: "conflict",
                        category: cat,
                        message: `Kategori "${cat}" sedang TERKUNCI (Locked). Atribut adegan "${differing.map((a) => a.text).join(", ")}" diabaikan dan digantikan oleh profil bersama ("${profileAttrs.map((a) => a.text).join(", ")}").`,
                        severity: mode === "strict_locks" ? "error" : "warning",
                        conflictingTags: differing.map((a) => a.text),
                    });
                }
            }
        } else {
            // Unlocked Category: Scene-specific takes precedence
            if (sceneAttrs.length > 0) {
                finalAttributesByCategory[cat] = [...sceneAttrs];
            } else if (profileAttrs.length > 0) {
                // Fall back to profile if scene didn't specify
                finalAttributesByCategory[cat] = [...profileAttrs];
            }
        }
    });

    // 2. Detect Contradictions (e.g. standing vs sitting simultaneously)
    const poseTexts = finalAttributesByCategory.pose.map((a) => a.normalizedValue.toLowerCase());
    const hasStanding = poseTexts.some((t) => t.includes("standing"));
    const hasSitting = poseTexts.some((t) => t.includes("sitting") || t.includes("seated"));
    const hasLying = poseTexts.some((t) => t.includes("lying") || t.includes("reclining"));

    if ((hasStanding && hasSitting) || (hasStanding && hasLying) || (hasSitting && hasLying)) {
        warnings.push({
            id: `warn-pose-contra-${scene.id}`,
            type: "contradiction",
            category: "pose",
            message: `Kontradiksi pose terdeteksi: Terdapat kombinasi yang bertentangan (misal berdiri dan duduk sekaligus) pada adegan ini.`,
            severity: "error",
            conflictingTags: finalAttributesByCategory.pose.map((a) => a.text),
        });
    }

    // 3. Assemble Positive Prompt in Golden Attention Order
    const rawTagList: string[] = [];
    CATEGORY_CHUNK_ORDER.forEach((cat) => {
        const list = finalAttributesByCategory[cat] || [];
        list.forEach((attr) => {
            const trimmed = attr.text.trim();
            if (trimmed) rawTagList.push(trimmed);
        });
    });

    // Deduplicate with semantic deduplication engine (guarantees zero double tags)
    const deduplicatedTags = deduplicatePromptTags(rawTagList);
    const positivePrompt = deduplicatedTags.join(", ");

    // 4. Assemble Negative Prompt
    const negAttrs = [
        ...(profile.sharedAttributes.negative || []),
        ...(scene.parsedAttributes.negative || []),
    ];
    const baseNegGuards = [
        "worst quality",
        "low quality",
        "bad anatomy",
        "bad hands",
        "missing fingers",
        "extra limbs",
        "deformed limbs",
        "blurry",
        "(3d, realistic, photorealistic:1.2)",
        "washed out colors",
        "overexposed",
    ];
    const allNegTags = [...negAttrs.map((a) => a.text), ...baseNegGuards];
    const deduplicatedNeg = deduplicatePromptTags(allNegTags);
    const negativePrompt = deduplicatedNeg.join(", ");

    return {
        positive: positivePrompt,
        negative: negativePrompt,
        warnings,
    };
}

/**
 * Re-merges all scenes in a storyboard sequence, applying locks and generating final outputs.
 */
export function mergeStoryboard(
    profile: CharacterProfile,
    scenes: StoryScene[],
    mode: MergeMode = "smart"
): StoryScene[] {
    return scenes.map((scene, idx) => {
        const { positive, negative, warnings } = compileScenePrompt(profile, scene, mode);
        return {
            ...scene,
            order: idx,
            generatedPositive: positive,
            generatedNegative: negative,
            warnings,
        };
    });
}
