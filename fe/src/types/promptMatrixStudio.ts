/**
 * Types and Data Contracts for Prompt Matrix & Studio Lab
 * 16-Category Deterministic Prompt Architecture
 */

export type CategoryKey =
    | "quality_rendering"
    | "art_style_coloring"
    | "character_identity"
    | "character_count"
    | "anatomy_body"
    | "hair_hairstyle"
    | "face_expression"
    | "outfit_accessories"
    | "pose_gesture"
    | "camera_framing"
    | "objects_interaction"
    | "background_location"
    | "lighting_atmosphere"
    | "composition_spatial"
    | "effects_details"
    | "custom_unclassified";

export interface CategorySchemaItem {
    id: number;
    key: CategoryKey;
    label: string;
    shortLabel: string;
    description: string;
    examples: string[];
    defaultLocked: boolean;
    color: string;
    borderColor: string;
    bgSubtle: string;
}

export const CATEGORY_SCHEMA_16: CategorySchemaItem[] = [
    {
        id: 1,
        key: "quality_rendering",
        label: "Quality & Rendering",
        shortLabel: "Quality",
        description: "Masterpiece, resolution, aesthetic and fidelity directives",
        examples: ["masterpiece", "best quality", "newest", "highres", "absurdres"],
        defaultLocked: true,
        color: "#94a3b8",
        borderColor: "#334155",
        bgSubtle: "rgba(148, 163, 184, 0.08)",
    },
    {
        id: 2,
        key: "art_style_coloring",
        label: "Art Style & Coloring",
        shortLabel: "Style",
        description: "Anime coloring, cel shading, lineart, medium and rendering flavor",
        examples: ["anime coloring", "cel shading", "clean lineart", "rich cel shading"],
        defaultLocked: true,
        color: "#38bdf8",
        borderColor: "#0369a1",
        bgSubtle: "rgba(56, 189, 248, 0.08)",
    },
    {
        id: 3,
        key: "character_identity",
        label: "Character Identity",
        shortLabel: "Identity",
        description: "Canonical character name, series, copyright and unique character aliases",
        examples: ["tsukatsuki rio", "blue archive", "character aliases"],
        defaultLocked: true,
        color: "#60a5fa",
        borderColor: "#1d4ed8",
        bgSubtle: "rgba(96, 165, 250, 0.08)",
    },
    {
        id: 4,
        key: "character_count",
        label: "Character Count & Composition",
        shortLabel: "Subject Count",
        description: "Number of subjects in scene and focus count",
        examples: ["1girl", "solo", "2girls", "multiple girls"],
        defaultLocked: true,
        color: "#818cf8",
        borderColor: "#4338ca",
        bgSubtle: "rgba(129, 140, 248, 0.08)",
    },
    {
        id: 5,
        key: "anatomy_body",
        label: "Anatomy & Body Type",
        shortLabel: "Anatomy",
        description: "Physique, height, proportions, waist, bust size and skin tone",
        examples: ["tall female", "mature female", "slender waist", "wide hips", "thick thighs", "large breasts"],
        defaultLocked: true,
        color: "#2dd4bf",
        borderColor: "#0f766e",
        bgSubtle: "rgba(45, 212, 191, 0.08)",
    },
    {
        id: 6,
        key: "hair_hairstyle",
        label: "Hair & Hairstyle",
        shortLabel: "Hair",
        description: "Hair length, color, cut, updo, bangs, curls and styling",
        examples: ["black hair", "updo", "retro curls", "short hair", "blunt bangs"],
        defaultLocked: true,
        color: "#34d399",
        borderColor: "#047857",
        bgSubtle: "rgba(52, 211, 153, 0.08)",
    },
    {
        id: 7,
        key: "face_expression",
        label: "Face, Eyes & Expression",
        shortLabel: "Face & Eyes",
        description: "Eye color, pupil style, gaze direction and facial emotion",
        examples: ["red eyes", "calm expression", "looking at viewer", "blush", "shy expression"],
        defaultLocked: false,
        color: "#f59e0b",
        borderColor: "#b45309",
        bgSubtle: "rgba(245, 158, 11, 0.08)",
    },
    {
        id: 8,
        key: "outfit_accessories",
        label: "Outfit & Accessories",
        shortLabel: "Outfit",
        description: "Clothing, dress, belt, headwear, halo, ribbons, socks and footwear",
        examples: ["burgundy dress", "white belt", "red headband", "polka dot headband", "black sheer thighhighs", "halo"],
        defaultLocked: true,
        color: "#f43f5e",
        borderColor: "#be123c",
        bgSubtle: "rgba(244, 63, 94, 0.08)",
    },
    {
        id: 9,
        key: "pose_gesture",
        label: "Pose & Gesture",
        shortLabel: "Pose",
        description: "Body stance, arm posture, standing/sitting and action gestures",
        examples: ["standing", "sitting", "hand on door", "crossed arms", "standing at sliding door"],
        defaultLocked: false,
        color: "#fb923c",
        borderColor: "#c2410c",
        bgSubtle: "rgba(251, 146, 60, 0.08)",
    },
    {
        id: 10,
        key: "camera_framing",
        label: "Camera & Framing",
        shortLabel: "Camera",
        description: "Shot distance, angle, perspective, lens framing and focal view",
        examples: ["cowboy shot", "eye-level", "close-up", "full body", "medium shot"],
        defaultLocked: false,
        color: "#a78bfa",
        borderColor: "#6d28d9",
        bgSubtle: "rgba(167, 139, 250, 0.08)",
    },
    {
        id: 11,
        key: "objects_interaction",
        label: "Objects & Interaction",
        shortLabel: "Objects",
        description: "Props, held items, weapons, books, tools and interactive elements",
        examples: ["holding blue folder", "book", "sword", "door handle", "holding object"],
        defaultLocked: false,
        color: "#38bdf8",
        borderColor: "#0284c7",
        bgSubtle: "rgba(56, 189, 248, 0.08)",
    },
    {
        id: 12,
        key: "background_location",
        label: "Background & Location",
        shortLabel: "Location",
        description: "Environment, room, classroom, architecture, indoor/outdoor scenery",
        examples: ["classroom", "window", "wooden desks", "indoor", "sliding door"],
        defaultLocked: false,
        color: "#10b981",
        borderColor: "#059669",
        bgSubtle: "rgba(16, 185, 129, 0.08)",
    },
    {
        id: 13,
        key: "lighting_atmosphere",
        label: "Lighting & Atmosphere",
        shortLabel: "Lighting",
        description: "Sunlight, rim lighting, volumetric light, shadows and time of day",
        examples: ["soft sunlight", "soft rim lighting", "afternoon", "window light", "soft shadows"],
        defaultLocked: true,
        color: "#eab308",
        borderColor: "#a16207",
        bgSubtle: "rgba(234, 179, 8, 0.08)",
    },
    {
        id: 14,
        key: "composition_spatial",
        label: "Composition & Spatial Layout",
        shortLabel: "Composition",
        description: "Foreground, background balance, rule of thirds, centered subject",
        examples: ["centered subject", "foreground", "negative space", "classroom desk in background"],
        defaultLocked: false,
        color: "#64748b",
        borderColor: "#475569",
        bgSubtle: "rgba(100, 116, 139, 0.08)",
    },
    {
        id: 15,
        key: "effects_details",
        label: "Effects & Image Details",
        shortLabel: "Effects",
        description: "Depth of field, motion blur, bokeh, sparks, particles and atmospheric FX",
        examples: ["depth of field", "particles", "motion blur", "bokeh", "blurry background"],
        defaultLocked: false,
        color: "#06b6d4",
        borderColor: "#0891b2",
        bgSubtle: "rgba(6, 182, 212, 0.08)",
    },
    {
        id: 16,
        key: "custom_unclassified",
        label: "Custom & Unclassified",
        shortLabel: "Unclassified",
        description: "Unknown tags, user-defined attributes and unassigned tokens",
        examples: ["custom tag", "special wildcard"],
        defaultLocked: false,
        color: "#cbd5e1",
        borderColor: "#64748b",
        bgSubtle: "rgba(203, 213, 225, 0.08)",
    },
];

export const CATEGORY_MAP: Record<CategoryKey, CategorySchemaItem> = CATEGORY_SCHEMA_16.reduce(
    (acc, item) => {
        acc[item.key] = item;
        return acc;
    },
    {} as Record<CategoryKey, CategorySchemaItem>
);

export const DEFAULT_CATEGORY_ORDER: CategoryKey[] = CATEGORY_SCHEMA_16.map((c) => c.key);

export interface TagItem {
    id: string;
    raw: string;
    cleanText: string;
    weight: number;
    weightStr?: string;
    isLocked?: boolean; // per-tag lock
    isGrouped?: boolean;
}

export interface CategoryState {
    tags: TagItem[];
    isLocked: boolean;
    isEnabled: boolean; // if false, excluded from final output without deleting tags
}

export type CategoryStateMap = Record<CategoryKey, CategoryState>;

export type MergePolicy =
    | "master_first" // Master tags first, add unique scene tags, locked master overrides conflicting scene
    | "scene_first" // Scene values override unlocked master categories, never violate master locks
    | "master_plus_scene" // Preserve both when no conflict, resolve conflicts per lock rules
    | "scene_override"; // Replace unlocked category contents with scene's category contents, preserve locked master

export interface ConflictReportItem {
    category: CategoryKey;
    categoryLabel: string;
    masterValue: string;
    sceneValue: string;
    resolution: string;
    reason: string;
    lockPreventedOverride: boolean;
}

export interface WeightMismatchItem {
    tag: string;
    masterWeight: number;
    sceneWeight: number;
    resolution: string;
}

export interface MergeDiagnostics {
    conflicts: ConflictReportItem[];
    duplicates: Array<{ tag: string; reason: string }>;
    weightMismatches: WeightMismatchItem[];
    warnings: string[];
    styleWarnings: string[];
    stats: {
        totalMasterTags: number;
        totalSceneTags: number;
        mergedCount: number;
        lockedCount: number;
        overriddenCount: number;
        unclassifiedCount: number;
    };
}

export interface MergePromptResult {
    positivePrompt: string;
    negativePrompt: string;
    categoryOutput: Record<CategoryKey, TagItem[]>;
    diagnostics: MergeDiagnostics;
    tagsByCategory: Record<CategoryKey, string[]>;
}

export interface MasterProfile {
    id: string;
    name: string;
    description?: string;
    categories: CategoryStateMap;
    negativePrompt: string;
    categoryOrder: CategoryKey[];
    createdAt: number;
    updatedAt: number;
}

export interface StoryboardScene {
    id: string;
    title: string;
    description?: string;
    masterProfileId: string;
    categories: CategoryStateMap;
    rawPositive: string;
    rawNegative: string;
    mergePolicy: MergePolicy;
    categoryOrder?: CategoryKey[];
    order: number;
    createdAt: number;
    updatedAt: number;
}

export interface ScenePresetTemplate {
    id: string;
    title: string;
    description: string;
    promptSnippet: string;
    categoryValues: Partial<Record<CategoryKey, string[]>>;
}

export interface PromptMatrixStudioState {
    version: number;
    activeProfileId: string;
    activeSceneId: string;
    profiles: MasterProfile[];
    scenes: StoryboardScene[];
    userDictionary: Record<string, CategoryKey>;
    uiPreferences: {
        activeSubTab: "studio" | "matrix" | "merger";
        autoParseRaw: boolean;
        showOnlyDifferencesInMatrix: boolean;
        matrixSearchFilter: string;
        matrixCategoryFilter: "all" | "changed" | "overridden" | "locked" | "conflicts";
    };
}
