/**
 * Local Storage and Preset Management Service for Prompt Matrix & Studio Lab
 * Handles versioned persistence, default master profiles, scene presets, deep cloning, and CSV/JSON export/import.
 */

import {
    CATEGORY_SCHEMA_16,
    DEFAULT_CATEGORY_ORDER,
    type CategoryKey,
    type CategoryStateMap,
    type MasterProfile,
    type PromptMatrixStudioState,
    type ScenePresetTemplate,
    type StoryboardScene,
} from "../types/promptMatrixStudio";
import {
    parsePromptToCategoryMap,
} from "./deterministicMatrixEngine";

const STORAGE_KEY = "MODELS_GUIDE_PROMPT_MATRIX_V1";

// --------------------------------------------------------------------------
// CANONICAL DEFAULT PROFILES & PRESETS
// --------------------------------------------------------------------------

export const RIO_CLASSROOM_MASTER_PROMPT =
    "masterpiece, best quality, (anime coloring:1.15), 1girl, solo, tsukatsuki rio, red halo, red polka dot headband, black hair, elegant updo bun, retro curls, blunt bangs, red eyes, blush, dark red halter dress, backless sleeveless mini dress, white buckle belt, black sheer thighhighs, bare shoulders, holding blue folder, standing in classroom, wooden desks, window sunlight, soft shadows, anime style, clean lineart, rich cel shading, depth of field";

export const RIO_CLASSROOM_MASTER_NEGATIVE =
    "worst quality, low quality, bad anatomy, bad hands, blurry, bad feet, missing fingers, extra digits, cropped, watermark";

export const SCENE_PRESET_TEMPLATES: ScenePresetTemplate[] = [
    {
        id: "preset-entrance",
        title: "Classroom Entrance",
        description: "Walking through doorway with hand on doorframe",
        promptSnippet: "1girl, walking through doorway, classroom door, hand on doorframe, looking at viewer, calm expression",
        categoryValues: {
            pose_gesture: ["walking through doorway", "hand on doorframe"],
            face_expression: ["calm expression", "looking at viewer"],
            background_location: ["classroom door", "doorway"],
        },
    },
    {
        id: "preset-sliding-door",
        title: "Standing at Sliding Door",
        description: "Doorway standing pose with slight head tilt",
        promptSnippet: "(standing at sliding door:1.25), (hand on door:1.25), looking at viewer, calm expression, head tilt, sliding door",
        categoryValues: {
            pose_gesture: ["(standing at sliding door:1.25)", "(hand on door:1.25)"],
            face_expression: ["calm expression", "head tilt", "looking at viewer"],
            background_location: ["sliding door", "classroom"],
        },
    },
    {
        id: "preset-holding-object",
        title: "Holding an Object",
        description: "Holding a book or document to chest with a gentle smile",
        promptSnippet: "((holding book to chest:1.25)), (book covering chest:1.20), gentle smile, blush, looking at viewer",
        categoryValues: {
            objects_interaction: ["((holding book to chest:1.25))", "(book covering chest:1.20)"],
            face_expression: ["gentle smile", "blush", "looking at viewer"],
        },
    },
    {
        id: "preset-portrait",
        title: "Close-up Portrait",
        description: "Close-up facial framing focusing on expressive gaze",
        promptSnippet: "close-up, upper body, blush, soft smile, looking at viewer, detailed eyes, shallow depth of field",
        categoryValues: {
            camera_framing: ["close-up", "upper body"],
            face_expression: ["soft smile", "blush", "looking at viewer"],
            effects_details: ["shallow depth of field", "detailed eyes"],
        },
    },
    {
        id: "preset-full-body",
        title: "Full Body Stance",
        description: "Full body perspective showing the complete outfit and stance",
        promptSnippet: "full body, standing pose, looking at viewer, elegant posture, wide shot",
        categoryValues: {
            camera_framing: ["full body", "wide shot"],
            pose_gesture: ["standing pose", "elegant posture"],
            face_expression: ["looking at viewer"],
        },
    },
    {
        id: "preset-sitting-desk",
        title: "Sitting at Desk",
        description: "Seated in a classroom desk, resting chin on hand",
        promptSnippet: "sitting, classroom desk, chair, resting chin on hand, looking at viewer, thoughtful expression",
        categoryValues: {
            pose_gesture: ["sitting", "resting chin on hand"],
            face_expression: ["thoughtful expression", "looking at viewer"],
            background_location: ["classroom desk", "chair"],
        },
    },
    {
        id: "preset-outdoor",
        title: "Outdoor Afternoon",
        description: "Outdoor courtyard with soft natural afternoon lighting",
        promptSnippet: "outdoors, school courtyard, sunlight, trees, gentle breeze, looking at viewer, afternoon light",
        categoryValues: {
            background_location: ["outdoors", "school courtyard", "trees"],
            lighting_atmosphere: ["afternoon light", "sunlight"],
            effects_details: ["gentle breeze"],
        },
    },
];

/**
 * Creates the initial default state with the Rio Tsukatsuki Master Profile and scenes.
 */
export function createInitialState(): PromptMatrixStudioState {
    const rioMasterCategories = parsePromptToCategoryMap(RIO_CLASSROOM_MASTER_PROMPT);

    // Profile 1: Tsukatsuki Rio
    const rioProfile: MasterProfile = {
        id: "profile-rio-classroom",
        name: "Tsukatsuki Rio (Classroom Master)",
        description: "Canonical reference for Tsukatsuki Rio in classroom setting with locked anime coloring, red halo, headband, and burgundy dress",
        categories: rioMasterCategories,
        negativePrompt: RIO_CLASSROOM_MASTER_NEGATIVE,
        categoryOrder: DEFAULT_CATEGORY_ORDER,
        createdAt: Date.now() - 3600000,
        updatedAt: Date.now(),
    };

    // Profile 2: Generic Illustrious Anime Heroine
    const genericAnimeMaster = parsePromptToCategoryMap(
        "masterpiece, best quality, (anime coloring:1.15), 1girl, solo, clean lineart, rich cel shading, soft sunlight, soft rim lighting"
    );
    const animeProfile: MasterProfile = {
        id: "profile-illustrious-heroine",
        name: "Illustrious Anime Heroine Base",
        description: "Clean general-purpose master style for anime characters with style and lighting locks",
        categories: genericAnimeMaster,
        negativePrompt: "lowres, bad anatomy, bad hands, blurry",
        categoryOrder: DEFAULT_CATEGORY_ORDER,
        createdAt: Date.now() - 7200000,
        updatedAt: Date.now(),
    };

    // Initial Scene 1: Classroom Anchor
    const scene1Categories = JSON.parse(JSON.stringify(rioMasterCategories)) as CategoryStateMap;
    const scene1: StoryboardScene = {
        id: "scene-1-anchor",
        title: "Scene 1: Di Ruang Kelas (Anchor)",
        description: "Main anchor scene showing Rio holding folder in classroom",
        masterProfileId: rioProfile.id,
        categories: scene1Categories,
        rawPositive: RIO_CLASSROOM_MASTER_PROMPT,
        rawNegative: RIO_CLASSROOM_MASTER_NEGATIVE,
        mergePolicy: "master_first",
        order: 0,
        createdAt: Date.now() - 3600000,
        updatedAt: Date.now(),
    };

    // Initial Scene 2: Entering Doorway (Foto 2 case study)
    const scene2Categories = JSON.parse(JSON.stringify(rioMasterCategories)) as CategoryStateMap;
    // Apply donor overrides to unlocked pose/gesture & expression
    scene2Categories.pose_gesture.tags = [
        {
            id: "tag-p-1",
            raw: "(standing at sliding door:1.25)",
            cleanText: "standing at sliding door",
            weight: 1.25,
            weightStr: "1.25",
        },
        {
            id: "tag-p-2",
            raw: "(hand on door:1.25)",
            cleanText: "hand on door",
            weight: 1.25,
            weightStr: "1.25",
        },
    ];
    scene2Categories.face_expression.tags = [
        {
            id: "tag-f-1",
            raw: "looking at viewer",
            cleanText: "looking at viewer",
            weight: 1.0,
        },
        {
            id: "tag-f-2",
            raw: "calm expression",
            cleanText: "calm expression",
            weight: 1.0,
        },
        {
            id: "tag-f-3",
            raw: "head tilt",
            cleanText: "head tilt",
            weight: 1.0,
        },
    ];
    scene2Categories.background_location.tags = [
        {
            id: "tag-b-1",
            raw: "indoor",
            cleanText: "indoor",
            weight: 1.0,
        },
        {
            id: "tag-b-2",
            raw: "classroom",
            cleanText: "classroom",
            weight: 1.0,
        },
        {
            id: "tag-b-3",
            raw: "sliding door",
            cleanText: "sliding door",
            weight: 1.0,
        },
        {
            id: "tag-b-4",
            raw: "wooden desks in background",
            cleanText: "wooden desks in background",
            weight: 1.0,
        },
        {
            id: "tag-b-5",
            raw: "window",
            cleanText: "window",
            weight: 1.0,
        },
    ];
    scene2Categories.objects_interaction.tags = []; // Purge folder

    const scene2: StoryboardScene = {
        id: "scene-2-doorway",
        title: "Scene 2: Masuk Pintu Kelas (Sliding Door)",
        description: "Rio standing at sliding door with hand on door, looking at viewer",
        masterProfileId: rioProfile.id,
        categories: scene2Categories,
        rawPositive:
            "1girl, (standing at sliding door, hand on door:1.25), looking at viewer, calm expression, head tilt, sliding door, classroom",
        rawNegative: RIO_CLASSROOM_MASTER_NEGATIVE,
        mergePolicy: "master_first",
        order: 1,
        createdAt: Date.now() - 1800000,
        updatedAt: Date.now(),
    };

    // Initial Scene 3: Sitting at Desk
    const scene3Categories = JSON.parse(JSON.stringify(rioMasterCategories)) as CategoryStateMap;
    scene3Categories.pose_gesture.tags = [
        {
            id: "tag-p-31",
            raw: "sitting",
            cleanText: "sitting",
            weight: 1.0,
        },
        {
            id: "tag-p-32",
            raw: "resting chin on hand",
            cleanText: "resting chin on hand",
            weight: 1.0,
        },
    ];
    scene3Categories.face_expression.tags = [
        {
            id: "tag-f-31",
            raw: "thoughtful expression",
            cleanText: "thoughtful expression",
            weight: 1.0,
        },
        {
            id: "tag-f-32",
            raw: "looking at viewer",
            cleanText: "looking at viewer",
            weight: 1.0,
        },
    ];
    scene3Categories.objects_interaction.tags = [
        {
            id: "tag-o-31",
            raw: "holding hardcover book",
            cleanText: "holding hardcover book",
            weight: 1.0,
        },
    ];

    const scene3: StoryboardScene = {
        id: "scene-3-desk",
        title: "Scene 3: Duduk di Meja Kelas",
        description: "Rio sitting at wooden desk resting chin with book",
        masterProfileId: rioProfile.id,
        categories: scene3Categories,
        rawPositive: "sitting, resting chin on hand, thoughtful expression, holding hardcover book, wooden desk",
        rawNegative: RIO_CLASSROOM_MASTER_NEGATIVE,
        mergePolicy: "master_first",
        order: 2,
        createdAt: Date.now() - 900000,
        updatedAt: Date.now(),
    };

    return {
        version: 1,
        activeProfileId: rioProfile.id,
        activeSceneId: scene1.id,
        profiles: [rioProfile, animeProfile],
        scenes: [scene1, scene2, scene3],
        userDictionary: {},
        uiPreferences: {
            activeSubTab: "studio",
            autoParseRaw: false,
            showOnlyDifferencesInMatrix: false,
            matrixSearchFilter: "",
            matrixCategoryFilter: "all",
        },
    };
}

/**
 * Loads the application state from localStorage with migration support.
 */
export function loadStudioState(): PromptMatrixStudioState {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored) as PromptMatrixStudioState;
            if (parsed && parsed.version === 1 && Array.isArray(parsed.profiles) && Array.isArray(parsed.scenes)) {
                // Ensure all 16 categories exist in loaded profiles and scenes
                parsed.profiles.forEach((p) => ensure16Categories(p.categories));
                parsed.scenes.forEach((s) => ensure16Categories(s.categories));
                return parsed;
            }
        }
    } catch (e) {
        console.warn("[MatrixStorageService] Error loading stored state, creating initial fallback:", e);
    }

    const initial = createInitialState();
    saveStudioState(initial);
    return initial;
}

/**
 * Ensures that a CategoryStateMap contains all 16 categories.
 */
export function ensure16Categories(catMap: CategoryStateMap): void {
    if (!catMap) return;
    for (const item of CATEGORY_SCHEMA_16) {
        if (!catMap[item.key]) {
            catMap[item.key] = {
                tags: [],
                isLocked: item.defaultLocked,
                isEnabled: true,
            };
        }
    }
}

/**
 * Saves state to localStorage.
 */
export function saveStudioState(state: PromptMatrixStudioState): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error("[MatrixStorageService] Failed to save state to localStorage:", e);
    }
}

/**
 * Deep clones any object to prevent accidental shared mutable state.
 */
export function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Duplicates a StoryboardScene, creating a completely independent copy.
 */
export function duplicateScene(
    scene: StoryboardScene,
    newTitle?: string
): StoryboardScene {
    const cloned = deepClone(scene);
    cloned.id = `scene-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    cloned.title = newTitle || `${scene.title} (Copy)`;
    cloned.createdAt = Date.now();
    cloned.updatedAt = Date.now();
    return cloned;
}

/**
 * Duplicates a MasterProfile, creating an independent copy.
 */
export function duplicateMasterProfile(
    profile: MasterProfile,
    newName?: string
): MasterProfile {
    const cloned = deepClone(profile);
    cloned.id = `profile-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    cloned.name = newName || `${profile.name} (Copy)`;
    cloned.createdAt = Date.now();
    cloned.updatedAt = Date.now();
    return cloned;
}

/**
 * Applies a ScenePresetTemplate to a scene.
 */
export function applyPresetToScene(
    scene: StoryboardScene,
    preset: ScenePresetTemplate
): StoryboardScene {
    const updated = deepClone(scene);
    updated.title = `${scene.title.split(" - ")[0]} - ${preset.title}`;

    for (const [catKey, tags] of Object.entries(preset.categoryValues)) {
        const key = catKey as CategoryKey;
        if (!updated.categories[key]) {
            updated.categories[key] = { tags: [], isLocked: false, isEnabled: true };
        }
        // Only override if category is not locked
        if (!updated.categories[key].isLocked) {
            updated.categories[key].tags = (tags || []).map((t) => ({
                id: `tag-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
                raw: t,
                cleanText: t.replace(/^\((.+):[0-9.]+\)$/, "$1").trim(),
                weight: 1.0,
            }));
        }
    }

    updated.updatedAt = Date.now();
    return updated;
}

/**
 * Resets an unlocked category in a scene to inherit from the master profile.
 */
export function resetSceneCategoryToMaster(
    scene: StoryboardScene,
    master: MasterProfile,
    categoryKey: CategoryKey
): StoryboardScene {
    const updated = deepClone(scene);
    const masterCat = master.categories[categoryKey];
    if (masterCat) {
        updated.categories[categoryKey] = deepClone(masterCat);
    }
    updated.updatedAt = Date.now();
    return updated;
}

/**
 * Resets all unlocked categories in a scene back to the master values.
 */
export function resetAllSceneToMaster(
    scene: StoryboardScene,
    master: MasterProfile
): StoryboardScene {
    const updated = deepClone(scene);
    for (const item of CATEGORY_SCHEMA_16) {
        const key = item.key;
        const masterCat = master.categories[key];
        // Only reset unlocked categories
        if (masterCat && !updated.categories[key]?.isLocked) {
            updated.categories[key] = deepClone(masterCat);
        }
    }
    updated.updatedAt = Date.now();
    return updated;
}

/**
 * Exports scenes and matrix as a CSV formatted string.
 */
export function exportMatrixAsCSV(
    master: MasterProfile,
    scenes: StoryboardScene[]
): string {
    const headers = [
        "Category ID",
        "Category Name",
        "Default Locked",
        `Master (${master.name})`,
        ...scenes.map((s) => `"${s.title.replace(/"/g, '""')}"`),
    ];

    const rows: string[] = [headers.join(",")];

    for (const item of CATEGORY_SCHEMA_16) {
        const key = item.key;
        const masterTags = (master.categories[key]?.tags || []).map((t) => t.raw).join(", ");
        const row = [
            item.id.toString(),
            `"${item.label}"`,
            master.categories[key]?.isLocked ? "YES" : "NO",
            `"${masterTags.replace(/"/g, '""')}"`,
            ...scenes.map((s) => {
                const sTags = (s.categories[key]?.tags || []).map((t) => t.raw).join(", ");
                return `"${sTags.replace(/"/g, '""')}"`;
            }),
        ];
        rows.push(row.join(","));
    }

    return rows.join("\n");
}

/**
 * Exports the full project state as formatted JSON string.
 */
export function exportStateAsJSON(state: PromptMatrixStudioState): string {
    return JSON.stringify(state, null, 2);
}

/**
 * Validates and imports a JSON backup into PromptMatrixStudioState.
 */
export function importStateFromJSON(jsonString: string): {
    success: boolean;
    state?: PromptMatrixStudioState;
    error?: string;
} {
    try {
        const parsed = JSON.parse(jsonString) as PromptMatrixStudioState;
        if (!parsed || !Array.isArray(parsed.profiles) || !Array.isArray(parsed.scenes)) {
            return { success: false, error: "Struktur berkas JSON tidak valid: Profil atau Adegan tidak ditemukan." };
        }

        // Validate and ensure 16 categories
        parsed.profiles.forEach((p) => ensure16Categories(p.categories));
        parsed.scenes.forEach((s) => ensure16Categories(s.categories));

        if (!parsed.activeProfileId && parsed.profiles[0]) {
            parsed.activeProfileId = parsed.profiles[0].id;
        }
        if (!parsed.activeSceneId && parsed.scenes[0]) {
            parsed.activeSceneId = parsed.scenes[0].id;
        }

        return { success: true, state: parsed };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: `Gagal membaca format JSON: ${message}` };
    }
}
