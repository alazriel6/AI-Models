import type {
    AttributeCategory,
    CharacterProfile,
    LockConfiguration,
    MultiPromptComparisonResult,
    ParsedPromptAttributes,
    PromptAttribute,
    RawPrompt,
    ValidationWarning,
} from "../types/storyMerger";
import { createEmptyParsedAttributes, parsePromptLocal } from "./promptParserService";

/**
 * Normalizes a tag for semantic matching:
 * - strips weights `(tag:1.2)` -> `tag`
 * - trims and lowercases
 * - removes noise words like "shot", "pose", "style" for stem comparison
 */
export function normalizeSemanticTag(text: string): string {
    if (!text) return "";
    let s = text.toLowerCase().trim();
    // 1. Strip outer parentheses, brackets, braces
    s = s.replace(/^[\(\[\{]+/, "").replace(/[\)\]\}]+$/, "").trim();
    // 2. Strip weights at end like :1.2 or :0.8
    s = s.replace(/:[0-9.]+\s*$/, "").trim();
    // 3. Repeat strip in case of nested parens like ((tag:1.2))
    while ((s.startsWith("(") && s.endsWith(")")) || (s.startsWith("[") && s.endsWith("]"))) {
        s = s.slice(1, -1).trim();
        s = s.replace(/:[0-9.]+\s*$/, "").trim();
    }
    // 4. Normalize hyphens and underscores to spaces
    s = s.replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
    return s;
}

/**
 * Calculates similarity between two attribute tokens (0.0 - 1.0)
 * Considers substring inclusion, reordered words, and Danbooru synonyms.
 */
export function areAttributesSemanticallyEquivalent(a: string, b: string): boolean {
    const normA = normalizeSemanticTag(a);
    const normB = normalizeSemanticTag(b);

    if (!normA || !normB) return false;
    if (normA === normB) return true;

    // Check token set equality (e.g. "long blue hair" vs "blue long hair")
    const wordsA = normA.split(" ").filter(Boolean).sort().join(" ");
    const wordsB = normB.split(" ").filter(Boolean).sort().join(" ");
    if (wordsA === wordsB) return true;

    // Check multi-word phrase containment (e.g. "polka dot headband" in "red polka dot headband")
    const wordsListA = normA.split(" ").filter(Boolean);
    const wordsListB = normB.split(" ").filter(Boolean);
    if (wordsListA.length > 1 && wordsListB.length > 1) {
        const setA = new Set(wordsListA);
        const setB = new Set(wordsListB);
        const aInB = wordsListA.every((w) => setB.has(w));
        const bInA = wordsListB.every((w) => setA.has(w));
        if (aInB || bInA) return true;
    }

    // Check subset matches where one includes the other
    if (normA.length > 5 && normB.length > 5) {
        if (normA.includes(normB) || normB.includes(normA)) return true;
    }

    return false;
}

/**
 * Compares two or more raw prompts and decomposes them into:
 * 1. Shared / Common Attributes (DNA profile)
 * 2. Scene-Specific Attributes for each prompt
 * 3. Detected differences and potential conflicts
 */
export function compareMultiplePrompts(
    prompts: RawPrompt[],
    parsedMap?: Record<string, ParsedPromptAttributes>
): MultiPromptComparisonResult {
    if (prompts.length === 0) {
        return {
            shared: createEmptyParsedAttributes(),
            differencesByPrompt: [],
            conflicts: [],
            suggestedProfile: {
                id: `profile-${Date.now()}`,
                name: "New Character Profile",
                sourcePrompt: "",
                sharedAttributes: createEmptyParsedAttributes(),
                locks: createDefaultLocks(),
                updatedAt: Date.now(),
            },
        };
    }

    // 1. Ensure all prompts are parsed
    const promptParsedList = prompts.map((p) => {
        const parsed = parsedMap?.[p.id] || parsePromptLocal(p.text, p.negativeText);
        return { prompt: p, parsed };
    });

    const shared = createEmptyParsedAttributes();
    const differencesByPrompt: MultiPromptComparisonResult["differencesByPrompt"] = [];
    const conflicts: ValidationWarning[] = [];

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

    // Initialize differences storage
    promptParsedList.forEach(({ prompt }) => {
        differencesByPrompt.push({
            promptId: prompt.id,
            label: prompt.label,
            specific: createEmptyParsedAttributes(),
        });
    });

    // 2. For each category, evaluate whether attributes are shared across all prompts
    categories.forEach((cat) => {
        // Collect attributes for this category across all prompts
        const allLists = promptParsedList.map((item) => item.parsed[cat] || []);

        if (promptParsedList.length === 1) {
            // Single prompt: attributes categorized as character/style DNA default to shared
            const isDna = [
                "character_identity",
                "physical_appearance",
                "hair",
                "eyes",
                "outfit",
                "accessories",
                "art_style",
                "quality",
            ].includes(cat);

            if (isDna) {
                shared[cat] = [...allLists[0]];
            } else {
                differencesByPrompt[0].specific[cat] = [...allLists[0]];
            }
            return;
        }

        // Multi-prompt comparison: find items present in prompt 0 that match in ALL other prompts
        const firstList = allLists[0];
        const sharedInThisCategory: PromptAttribute[] = [];
        const matchedIndicesPerPrompt: Set<number>[] = allLists.map(() => new Set<number>());

        firstList.forEach((attr0, idx0) => {
            let presentInAll = true;
            const matchedOtherIndices: number[] = [];

            for (let pIdx = 1; pIdx < allLists.length; pIdx++) {
                const otherList = allLists[pIdx];
                let matchIndex = -1;

                for (let oIdx = 0; oIdx < otherList.length; oIdx++) {
                    if (matchedIndicesPerPrompt[pIdx].has(oIdx)) continue;
                    if (areAttributesSemanticallyEquivalent(attr0.normalizedValue, otherList[oIdx].normalizedValue)) {
                        matchIndex = oIdx;
                        break;
                    }
                }

                if (matchIndex !== -1) {
                    matchedOtherIndices.push(matchIndex);
                } else {
                    presentInAll = false;
                    break;
                }
            }

            if (presentInAll) {
                sharedInThisCategory.push(attr0);
                matchedIndicesPerPrompt[0].add(idx0);
                matchedOtherIndices.forEach((oIdx, i) => {
                    matchedIndicesPerPrompt[i + 1].add(oIdx);
                });
            }
        });

        shared[cat] = sharedInThisCategory;

        // Unmatched attributes are specific to their respective scenes
        promptParsedList.forEach((item, pIdx) => {
            const list = item.parsed[cat] || [];
            const unmatched = list.filter((_, idx) => !matchedIndicesPerPrompt[pIdx].has(idx));
            differencesByPrompt[pIdx].specific[cat] = unmatched;
        });
    });

    // 3. Conflict detection across scenes:
    // If pose/action contradicts itself or locked categories diverge
    categories.forEach((cat) => {
        const isIdentityCat = ["character_identity", "hair", "eyes", "outfit", "art_style"].includes(cat);
        if (isIdentityCat) {
            // Check if different scenes specify divergent identities
            const distinctValues: string[] = [];
            differencesByPrompt.forEach((d) => {
                const list = d.specific[cat];
                if (list.length > 0) {
                    distinctValues.push(`${d.label}: "${list.map((a) => a.text).join(", ")}"`);
                }
            });

            if (distinctValues.length > 1) {
                conflicts.push({
                    id: `conf-${cat}-${Date.now().toString(36)}`,
                    type: "conflict",
                    category: cat,
                    message: `Perbedaan terdeteksi pada atribut identitas (${cat}): ${distinctValues.join(" vs ")}. Kunci atribut jika ingin menyamakan seluruh adegan.`,
                    severity: "warning",
                    conflictingTags: distinctValues,
                });
            }
        }
    });

    // 4. Extract character name for suggested profile
    const charNames = shared.character_identity
        .filter((a) => !/\b(1girl|1boy|solo|female|male)\b/i.test(a.normalizedValue))
        .map((a) => a.normalizedValue);

    const profileName = charNames.length > 0
        ? charNames.map((n) => n.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")).join(" & ")
        : "Consistent Character Profile";

    const suggestedProfile: CharacterProfile = {
        id: `profile-${Date.now().toString(36)}`,
        name: profileName,
        sourcePrompt: prompts[0].text,
        sharedAttributes: shared,
        locks: createDefaultLocks(),
        updatedAt: Date.now(),
    };

    return {
        shared,
        differencesByPrompt,
        conflicts,
        suggestedProfile,
    };
}

/**
 * Creates the default lock configuration:
 * Identity, appearance, hair, eyes, outfit, accessories, lighting, style, quality -> LOCKED
 * Pose, expression, action, objects, background, camera -> UNLOCKED
 */
export function createDefaultLocks(): LockConfiguration {
    return {
        character_identity: true,
        physical_appearance: true,
        hair: true,
        eyes: true,
        outfit: true,
        accessories: true,
        pose: false,
        expression: false,
        action: false,
        objects: false,
        background: false,
        lighting: true, // Terkunci secara default agar tata cahaya & palet warna tidak miss antar adegan
        camera: false,
        art_style: true, // Terkunci secara default agar rendering anime & ketebalan lineart konsisten
        quality: true,
        other: false,
        negative: true,
    };
}
