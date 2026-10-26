import type {
    ChildScenePreset,
    MainStoryPreset,
} from "../types/deterministicMerger";
import { RIO_BASE_PROMPT_TEST_CASE, RIO_DONOR_PROMPT_TEST_CASE } from "./deterministicPromptMerger";

export const DEFAULT_STORY_PRESETS: MainStoryPreset[] = [
    {
        id: "preset-rio-classroom",
        title: "Rio — Retro Burgundy Classroom Story",
        description:
            "Consistent character & style locking for Tsukatsuki Rio in a retro burgundy halter dress across 5 classroom story moments.",
        basePrompt: RIO_BASE_PROMPT_TEST_CASE,
        baseNegative:
            "worst quality, low quality, bad anatomy, bad hands, missing fingers, extra digits, cropped, signature, watermark, username, blurry, artist name",
        isBuiltIn: true,
        createdAt: 1711000000000,
        updatedAt: 1711000000000,
        childScenes: [
            {
                id: "scene-rio-1",
                sceneNumber: 1,
                title: "Scene 1: Membuka Pintu Kelas (Test Case Verification)",
                donorPrompt: RIO_DONOR_PROMPT_TEST_CASE,
                notes: "Rio slides open the classroom sliding door while keeping eye contact. Perfect test case scenario.",
            },
            {
                id: "scene-rio-2",
                sceneNumber: 2,
                title: "Scene 2: Melangkah Masuk & Menyapa",
                donorPrompt:
                    "cowboy shot, (walking into classroom:1.20), (one hand raised in greeting:1.15), looking at viewer, gentle smile, calm expression, standing, indoor, classroom, chalkboard in background, wooden desks",
                notes: "Rio steps into the classroom and gently greets Sensei with a warm smile.",
            },
            {
                id: "scene-rio-3",
                sceneNumber: 3,
                title: "Scene 3: Memeluk Buku di Dekat Meja (Original Pose)",
                donorPrompt:
                    "cowboy shot, ((holding book to chest:1.35)), (book covering chest:1.20), (book against chest:1.25), (hand on cheek:1.15), looking away, embarrassed, blush, shy expression, standing, indoor, classroom, classroom desk in background",
                notes: "Rio clutches her notebook to her chest with a flustered blush near the classroom desk.",
            },
            {
                id: "scene-rio-4",
                sceneNumber: 4,
                title: "Scene 4: Duduk Membaca di Meja Kelas",
                donorPrompt:
                    "cowboy shot, (sitting at desk:1.25), (holding open book on desk:1.20), (tucking hair behind ear:1.15), looking down, focused expression, calm expression, sitting, indoor, classroom, wooden desk, school chair",
                notes: "Rio is seated at her desk studying, automatically synchronizing posture from standing to sitting.",
            },
            {
                id: "scene-rio-5",
                sceneNumber: 5,
                title: "Scene 5: Bersandar di Jendela Sore Hari",
                donorPrompt:
                    "cowboy shot, (leaning against window frame:1.25), (arms crossed:1.15), looking back at viewer, serene expression, slight smile, standing, indoor, classroom, classroom window, curtains, wooden desks",
                notes: "Golden hour peaceful scene: Rio leans on the window frame overlooking the afternoon light.",
            },
        ],
    },
    {
        id: "preset-rio-corridor",
        title: "Rio — After-School Corridor Story",
        description:
            "After-school scenes in the hallway featuring Rio in her signature locked outfit with document and walking actions.",
        basePrompt: RIO_BASE_PROMPT_TEST_CASE,
        baseNegative:
            "worst quality, low quality, bad anatomy, bad hands, missing fingers, extra digits, cropped, signature, watermark, username, blurry, artist name",
        isBuiltIn: true,
        createdAt: 1711000100000,
        updatedAt: 1711000100000,
        childScenes: [
            {
                id: "scene-corridor-1",
                sceneNumber: 1,
                title: "Scene 1: Keluar dari Pintu Kelas ke Koridor",
                donorPrompt:
                    "(stepping out of sliding door:1.25), (hand on doorframe:1.20), looking at viewer, calm expression, indoor, school hallway, sliding door, corridor windows",
                notes: "Rio steps out from the classroom into the quiet school corridor.",
            },
            {
                id: "scene-corridor-2",
                sceneNumber: 2,
                title: "Scene 2: Berjalan di Koridor Membawa Map Dokumen",
                donorPrompt:
                    "(walking in hallway:1.25), (holding clipboard and folder:1.20), looking at viewer, serious expression, indoor, school hallway, corridor windows, lockers in background",
                notes: "Rio carrying documents through the hallway with a composed, professional demeanor.",
            },
            {
                id: "scene-corridor-3",
                sceneNumber: 3,
                title: "Scene 3: Berhenti & Menoleh di Ujung Koridor",
                donorPrompt:
                    "(turning around:1.20), (looking over shoulder:1.25), (hand on hip:1.15), looking at viewer, blush, gentle smile, indoor, school hallway, long corridor",
                notes: "Rio pauses at the corridor corner, turning around with a warm, subtle smile.",
            },
        ],
    },
];

const STORAGE_KEY = "models_guide_deterministic_story_presets";

/**
 * Loads story presets from localStorage with fallback to built-ins.
 */
export function loadStoryPresets(): MainStoryPreset[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        }
    } catch (e) {
        console.warn("[StoryPresetStorage] Failed to read from localStorage:", e);
    }
    return DEFAULT_STORY_PRESETS;
}

/**
 * Persists story presets to localStorage.
 */
export function saveStoryPresets(presets: MainStoryPreset[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    } catch (e) {
        console.error("[StoryPresetStorage] Failed to write to localStorage:", e);
    }
}

/**
 * Resets presets back to factory defaults.
 */
export function resetToDefaultPresets(): MainStoryPreset[] {
    saveStoryPresets(DEFAULT_STORY_PRESETS);
    return DEFAULT_STORY_PRESETS;
}

/**
 * Creates and appends a new Main Story preset.
 */
export function createStoryPreset(
    title: string,
    description: string,
    basePrompt: string,
    baseNegative: string = ""
): MainStoryPreset {
    const newPreset: MainStoryPreset = {
        id: `preset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: title.trim() || "Untitled Story Preset",
        description: description.trim(),
        basePrompt: basePrompt.trim(),
        baseNegative: baseNegative.trim(),
        childScenes: [],
        isBuiltIn: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    const presets = loadStoryPresets();
    presets.push(newPreset);
    saveStoryPresets(presets);
    return newPreset;
}

/**
 * Updates an existing main story preset.
 */
export function updateStoryPreset(
    presetId: string,
    updates: Partial<Omit<MainStoryPreset, "id">>
): MainStoryPreset[] {
    const presets = loadStoryPresets();
    const idx = presets.findIndex((p) => p.id === presetId);
    if (idx !== -1) {
        presets[idx] = {
            ...presets[idx],
            ...updates,
            updatedAt: Date.now(),
        };
        saveStoryPresets(presets);
    }
    return presets;
}

/**
 * Duplicates a story preset.
 */
export function duplicateStoryPreset(presetId: string): MainStoryPreset[] {
    const presets = loadStoryPresets();
    const target = presets.find((p) => p.id === presetId);
    if (!target) return presets;

    const duplicated: MainStoryPreset = {
        ...target,
        id: `preset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: `${target.title} (Copy)`,
        isBuiltIn: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        childScenes: target.childScenes.map((s) => ({
            ...s,
            id: `scene-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        })),
    };

    presets.push(duplicated);
    saveStoryPresets(presets);
    return presets;
}

/**
 * Deletes a story preset.
 */
export function deleteStoryPreset(presetId: string): MainStoryPreset[] {
    let presets = loadStoryPresets();
    presets = presets.filter((p) => p.id !== presetId);
    if (presets.length === 0) {
        presets = DEFAULT_STORY_PRESETS;
    }
    saveStoryPresets(presets);
    return presets;
}

/**
 * Adds a new child scene to a story preset.
 */
export function addChildScene(
    presetId: string,
    title: string,
    donorPrompt: string,
    notes: string = ""
): MainStoryPreset[] {
    const presets = loadStoryPresets();
    const target = presets.find((p) => p.id === presetId);
    if (!target) return presets;

    const newScene: ChildScenePreset = {
        id: `scene-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        sceneNumber: target.childScenes.length + 1,
        title: title.trim() || `Scene ${target.childScenes.length + 1}`,
        donorPrompt: donorPrompt.trim(),
        notes: notes.trim(),
    };

    target.childScenes.push(newScene);
    target.updatedAt = Date.now();
    saveStoryPresets(presets);
    return presets;
}

/**
 * Updates a child scene.
 */
export function updateChildScene(
    presetId: string,
    sceneId: string,
    updates: Partial<Omit<ChildScenePreset, "id">>
): MainStoryPreset[] {
    const presets = loadStoryPresets();
    const target = presets.find((p) => p.id === presetId);
    if (!target) return presets;

    const sceneIdx = target.childScenes.findIndex((s) => s.id === sceneId);
    if (sceneIdx !== -1) {
        target.childScenes[sceneIdx] = {
            ...target.childScenes[sceneIdx],
            ...updates,
        };
        target.updatedAt = Date.now();
        saveStoryPresets(presets);
    }
    return presets;
}

/**
 * Deletes a child scene from a story preset.
 */
export function deleteChildScene(presetId: string, sceneId: string): MainStoryPreset[] {
    const presets = loadStoryPresets();
    const target = presets.find((p) => p.id === presetId);
    if (!target) return presets;

    target.childScenes = target.childScenes.filter((s) => s.id !== sceneId);
    // Renumber scenes
    target.childScenes.forEach((s, idx) => {
        s.sceneNumber = idx + 1;
    });
    target.updatedAt = Date.now();
    saveStoryPresets(presets);
    return presets;
}

/**
 * Exports presets as a pretty-printed JSON string.
 */
export function exportPresetsJson(): string {
    const presets = loadStoryPresets();
    return JSON.stringify(presets, null, 2);
}

/**
 * Imports presets from a JSON string.
 */
export function importPresetsJson(jsonString: string): { success: boolean; message: string; count?: number } {
    try {
        const parsed = JSON.parse(jsonString);
        if (!Array.isArray(parsed)) {
            return { success: false, message: "File JSON harus berupa array Story Presets." };
        }
        if (parsed.length === 0) {
            return { success: false, message: "Array JSON kosong." };
        }
        for (const item of parsed) {
            if (!item.title || !item.basePrompt || !Array.isArray(item.childScenes)) {
                return { success: false, message: "Struktur objek Story Preset tidak valid (wajib ada title, basePrompt, childScenes)." };
            }
        }
        saveStoryPresets(parsed);
        return { success: true, message: `Berhasil mengimpor ${parsed.length} Story Presets!`, count: parsed.length };
    } catch (e: unknown) {
        return { success: false, message: `Gagal membaca file JSON: ${e instanceof Error ? e.message : String(e)}` };
    }
}
