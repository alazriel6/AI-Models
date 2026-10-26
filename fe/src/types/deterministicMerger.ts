/**
 * Types and interfaces for the Deterministic Prompt Style & Character Lock Merger
 * and Storyboard Scene Preset Manager.
 */

export type DeterministicCategory =
    | "QUALITY_STYLE"
    | "CHARACTER_ANATOMY"
    | "FRAMING"
    | "POSE_EXPRESSION"
    | "HAIR_HEADWEAR"
    | "OUTFIT"
    | "ENVIRONMENT"
    | "LIGHTING_FX";

export interface CategoryDefinition {
    key: DeterministicCategory;
    label: string;
    description: string;
    color: string;
    borderColor: string;
    bgSubtle: string;
    textMuted: string;
}

export const DETERMINISTIC_CATEGORIES: Record<DeterministicCategory, CategoryDefinition> = {
    QUALITY_STYLE: {
        key: "QUALITY_STYLE",
        label: "Quality & Style",
        description: "Masterpiece, anime coloring, resolution & aesthetic tags (Base locked)",
        color: "#94a3b8", // Slate
        borderColor: "#334155",
        bgSubtle: "rgba(148, 163, 184, 0.12)",
        textMuted: "#cbd5e1",
    },
    CHARACTER_ANATOMY: {
        key: "CHARACTER_ANATOMY",
        label: "Character & Anatomy",
        description: "1girl, solo, character identity, eyes, body proportions (Base locked)",
        color: "#60a5fa", // Steel Blue
        borderColor: "#1e3a8a",
        bgSubtle: "rgba(96, 165, 250, 0.12)",
        textMuted: "#93c5fd",
    },
    FRAMING: {
        key: "FRAMING",
        label: "Framing",
        description: "Camera shot & frame type (cowboy shot, portrait, full body)",
        color: "#a78bfa", // Muted Violet/Slate
        borderColor: "#4c1d95",
        bgSubtle: "rgba(167, 139, 250, 0.12)",
        textMuted: "#c4b5fd",
    },
    POSE_EXPRESSION: {
        key: "POSE_EXPRESSION",
        label: "Pose & Expression",
        description: "Actions, held objects, gaze & facial expressions (Donor injected, Base purged)",
        color: "#fb923c", // Warm Amber
        borderColor: "#7c2d12",
        bgSubtle: "rgba(251, 146, 60, 0.12)",
        textMuted: "#fdba74",
    },
    HAIR_HEADWEAR: {
        key: "HAIR_HEADWEAR",
        label: "Hair & Headwear",
        description: "Hairstyles, updo, curls, headbands, ribbons (Base locked @ 1.10)",
        color: "#2dd4bf", // Teal
        borderColor: "#134e4a",
        bgSubtle: "rgba(45, 212, 191, 0.12)",
        textMuted: "#5eead4",
    },
    OUTFIT: {
        key: "OUTFIT",
        label: "Outfit & Clothes",
        description: "Dress, halter, sleeves, belt, thighhighs, bare shoulders (Base locked @ 1.10)",
        color: "#34d399", // Emerald
        borderColor: "#064e3b",
        bgSubtle: "rgba(52, 211, 153, 0.12)",
        textMuted: "#6ee7b7",
    },
    ENVIRONMENT: {
        key: "ENVIRONMENT",
        label: "Environment & Posture",
        description: "Location, doors, desks, classroom props, posture synchronization",
        color: "#38bdf8", // Cyan
        borderColor: "#0c4a6e",
        bgSubtle: "rgba(56, 189, 248, 0.12)",
        textMuted: "#7dd3fc",
    },
    LIGHTING_FX: {
        key: "LIGHTING_FX",
        label: "Lighting & FX",
        description: "Sunlight, rim lighting, window anchor, depth of field (Base locked)",
        color: "#fbbf24", // Gold/Amber
        borderColor: "#78350f",
        bgSubtle: "rgba(251, 191, 36, 0.12)",
        textMuted: "#fde68a",
    },
};

export type TokenStatus =
    // Base Tokens
    | "LOCKED_KEPT"
    | "PURGED_ACTION"
    | "REPLACED_POSTURE"
    | "REPLACED_DESK"
    // Donor Tokens
    | "INJECTED_ACTION"
    | "INJECTED_PROP"
    | "IGNORED_LOCKED"
    | "IGNORED_CONFLICT"
    | "IGNORED_DUPLICATE"
    | "RETAINED_FRAMING";

export interface ParsedToken {
    id: string;
    raw: string;
    cleanText: string;
    weight: number;
    weightStr: string;
    isGrouped: boolean;
    category: DeterministicCategory;
    status: TokenStatus;
    statusReason?: string;
}

export interface DeterministicMergeResult {
    slot1: string[];
    slot2: string[];
    slot3: string[];
    slot4: string[];
    slot5: string[];
    slot6: string[];
    finalMergedPrompt: string;
    baseTokens: ParsedToken[];
    donorTokens: ParsedToken[];
    targetPosture: "standing" | "sitting";
    hasBookInScene: boolean;
    suggestedNegativePrompt: string;
    isExactMatchWithRegression?: boolean;
    mismatchIndex?: number;
    expectedRegressionOutput?: string;
}

export interface ChildScenePreset {
    id: string;
    sceneNumber: number;
    title: string;
    donorPrompt: string;
    donorNegative?: string;
    notes?: string;
}

export interface MainStoryPreset {
    id: string;
    title: string;
    description: string;
    basePrompt: string;
    baseNegative: string;
    childScenes: ChildScenePreset[];
    isBuiltIn?: boolean;
    createdAt?: number;
    updatedAt?: number;
}
