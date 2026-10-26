/**
 * Data models for the Intelligent Story & Style Prompt Merger.
 * Covers 16 structured attribute categories, locking configurations,
 * multi-scene management, and validation results.
 */

export type AttributeCategory =
    | "character_identity"
    | "physical_appearance"
    | "hair"
    | "eyes"
    | "outfit"
    | "accessories"
    | "pose"
    | "expression"
    | "action"
    | "objects"
    | "background"
    | "lighting"
    | "camera"
    | "art_style"
    | "quality"
    | "other"
    | "negative";

export interface CategoryMetadata {
    key: AttributeCategory;
    label: string;
    description: string;
    icon: string;
    defaultLocked: boolean; // default recommendation for multi-scene storytelling
}

export const ATTRIBUTE_CATEGORIES: CategoryMetadata[] = [
    {
        key: "character_identity",
        label: "Character Identity",
        description: "Nama karakter, franchise, jumlah subjek (1girl, solo), identitas dasar",
        icon: "User",
        defaultLocked: true,
    },
    {
        key: "physical_appearance",
        label: "Physical Appearance",
        description: "Postur tubuh, tipe badan, warna kulit, usia/tinggi visual",
        icon: "Activity",
        defaultLocked: true,
    },
    {
        key: "hair",
        label: "Hair",
        description: "Panjang rambut, warna, gaya (updo, curls, ponytail, bangs)",
        icon: "Sparkles",
        defaultLocked: true,
    },
    {
        key: "eyes",
        label: "Eyes",
        description: "Warna mata, bentuk pupil, kilau mata, heterochromia",
        icon: "Eye",
        defaultLocked: true,
    },
    {
        key: "outfit",
        label: "Outfit / Clothing",
        description: "Baju, gaun, mantel, celana, rok, kaus kaki, sepatu",
        icon: "Layers",
        defaultLocked: true,
    },
    {
        key: "accessories",
        label: "Accessories",
        description: "Bando, halo, syal, kacamata, kalung, anting, pita, topi",
        icon: "Tag",
        defaultLocked: true,
    },
    {
        key: "pose",
        label: "Pose / Body Position",
        description: "Posisi tubuh (standing, sitting, kneeling, leaning, cowboy shot)",
        icon: "Move",
        defaultLocked: false,
    },
    {
        key: "expression",
        label: "Facial Expression",
        description: "Ekspresi wajah (smiling, blush, angry, serious, looking away)",
        icon: "Smile",
        defaultLocked: false,
    },
    {
        key: "action",
        label: "Action / Gesture",
        description: "Aktivitas aktif tangan/tubuh (holding, grasping, reading, running)",
        icon: "Zap",
        defaultLocked: false,
    },
    {
        key: "objects",
        label: "Objects / Props",
        description: "Benda/alat yang dipegang atau berinteraksi (sword, book, cup)",
        icon: "Box",
        defaultLocked: false,
    },
    {
        key: "background",
        label: "Background / Environment",
        description: "Latar tempat, cuaca, lokasi (indoor, snowy forest, classroom)",
        icon: "Image",
        defaultLocked: false,
    },
    {
        key: "lighting",
        label: "Lighting & Coloring",
        description: "Tata pencahayaan & palet pewarnaan (soft sunlight, window lighting, soft shadows, anime coloring)",
        icon: "Sun",
        defaultLocked: true, // Dikunci secara default agar pencahayaan & pewarnaan konsisten di seluruh adegan cerita
    },
    {
        key: "camera",
        label: "Camera / Composition",
        description: "Sudut pandang, framing lensa, depth of field, wide angle",
        icon: "Camera",
        defaultLocked: false,
    },
    {
        key: "art_style",
        label: "Art Style & Lineart",
        description: "Gaya visual rendering, lineart & tekstur (anime style, cel shading, clean lineart, fine lines)",
        icon: "Feather",
        defaultLocked: true,
    },
    {
        key: "quality",
        label: "Quality Tags",
        description: "Pengarah estetika (masterpiece, best quality, highly detailed)",
        icon: "Award",
        defaultLocked: true,
    },
    {
        key: "other",
        label: "Other Attributes",
        description: "Tag tambahan atau atribut yang belum terklasifikasi",
        icon: "MoreHorizontal",
        defaultLocked: false,
    },
];

export interface PromptAttribute {
    id: string;
    category: AttributeCategory;
    text: string; // Exact tag text as in prompt, e.g. "(holding sword:1.2)"
    normalizedValue: string; // Semantic clean text, e.g. "holding sword"
    weight?: number; // e.g. 1.2
    isAmbiguous?: boolean;
    confidence?: number; // 0.0 - 1.0 from AI or heuristic
    source?: "user" | "parsed_ai" | "parsed_local" | "inherited";
}

export type LockConfiguration = Record<AttributeCategory, boolean>;

export interface RawPrompt {
    id: string;
    label: string;
    text: string;
    negativeText?: string;
    source?: "input" | "scene" | "reference";
}

export type ParsedPromptAttributes = Record<AttributeCategory, PromptAttribute[]>;

export interface CharacterProfile {
    id: string;
    name: string;
    sourcePrompt: string;
    sharedAttributes: ParsedPromptAttributes;
    locks: LockConfiguration;
    updatedAt: number;
}

export interface ValidationWarning {
    id: string;
    type: "conflict" | "contradiction" | "duplicate" | "missing_locked" | "weight_burn";
    category: AttributeCategory;
    message: string;
    severity: "warning" | "error" | "info";
    conflictingTags?: string[];
}

export interface StoryScene {
    id: string;
    title: string;
    rawPrompt: string;
    parsedAttributes: ParsedPromptAttributes;
    sceneSpecificAttributes: ParsedPromptAttributes;
    locks: LockConfiguration;
    generatedPositive: string;
    generatedNegative: string;
    warnings: ValidationWarning[];
    isReference?: boolean;
    order: number;
}

export type MergeMode = "smart" | "preserve_original" | "strict_locks" | "custom";

export interface MultiPromptComparisonResult {
    shared: ParsedPromptAttributes;
    differencesByPrompt: Array<{
        promptId: string;
        label: string;
        specific: ParsedPromptAttributes;
    }>;
    conflicts: ValidationWarning[];
    suggestedProfile: CharacterProfile;
}

export interface MergeResult {
    scenes: StoryScene[];
    characterProfile: CharacterProfile;
    summary: {
        totalScenes: number;
        lockedCategories: number;
        conflictsDetected: number;
    };
}

export interface MainSceneMergeOptions {
    locks?: LockConfiguration;
    keepSameBackground?: boolean;
    mergeMode?: MergeMode;
}

export interface SuppressedTagDetail {
    tag: string;
    reason: string;
    category: AttributeCategory;
}

export interface MainSceneMergeResult {
    positive: string;
    negative: string;
    warnings: ValidationWarning[];
    inheritedFromMain: Record<AttributeCategory, PromptAttribute[]>;
    appliedFromScene: Record<AttributeCategory, PromptAttribute[]>;
    suppressedSceneTags: SuppressedTagDetail[];
    stats: {
        totalTags: number;
        inheritedCount: number;
        sceneAddedCount: number;
        suppressedCount: number;
    };
}

