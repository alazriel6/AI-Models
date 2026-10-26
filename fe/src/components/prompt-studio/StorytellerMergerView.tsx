import React, { useState, useMemo, useEffect, useRef } from "react";
import "../../style/StorytellerMerger.css";
import type {
    LockConfiguration,
    MainSceneMergeResult,
} from "../../types/storyMerger";
import { ATTRIBUTE_CATEGORIES } from "../../types/storyMerger";
import {
    parsePromptLocal,
    tokenizeRawPrompt,
} from "../../services/promptParserService";
import {
    createDefaultLocks,
} from "../../services/semanticComparator";
import {
    mergeMainAndScenePrompt,
} from "../../services/smartPromptMerger";
import {
    getLearnedTags,
    isAutoLearnEnabled,
    setAutoLearnEnabled,
    registerNewVocabularyTag,
    isKnownBooruTag,
    inferTagCategoryAndLayer,
    type LearnedTag,
} from "../../services/smartTagDetector";
import type { BooruTagCategory } from "../../data/booruTags";
import type { AttributeCategory } from "../../types/storyMerger";

export interface StorySceneItem {
    id: string;
    title: string;
    prompt2: string;
    keepSameLocation: boolean;
    notes?: string;
}

export interface StoryPreset {
    id: string;
    name: string;
    characterProfileName: string;
    mainPrompt: string;
    mainNegative: string;
    scenes: StorySceneItem[];
}

// -----------------------------------------------------------------------------
// CANONICAL PRESETS FOR MULTI-SCENE CONTINUOUS STORYTELLING
// -----------------------------------------------------------------------------

export const RIO_MAIN_PROMPT_DEFAULT =
    "masterpiece, best quality, (anime coloring:1.15), 1girl, solo, tsukatsuki rio, red halo, red polka dot headband, black hair, elegant updo bun, blunt bangs, red eyes, blush, dark red halter dress, backless sleeveless mini dress, white buckle belt, black sheer thighhighs, holding blue folder, standing in classroom, wooden desks, window sunlight, soft shadows, anime style, clean lineart, rich cel shading";

export const RIO_SCENE2_PROMPT_DEFAULT =
    "walking through doorway, classroom door, hand on doorframe, looking at viewer, calm expression, medium shot";

const STORY_PRESETS: StoryPreset[] = [
    {
        id: "preset-rio",
        name: "🏫 Rio Tsukatsuki — Kehidupan Sekolah (Ruang Kelas -> Pintu -> Halaman Sakura -> Rooftop)",
        characterProfileName: "Tsukatsuki Rio (Master Profile)",
        mainPrompt: RIO_MAIN_PROMPT_DEFAULT,
        mainNegative:
            "worst quality, low quality, bad anatomy, bad hands, missing fingers, extra limbs, deformed limbs, blurry, (3d, realistic, photorealistic:1.2), washed out colors, overexposed, underexposed, inconsistent lighting, deformed halo, broken accessories",
        scenes: [
            {
                id: "rio-scene-1",
                title: "Scene 1: Di Ruang Kelas (Anchor Awal)",
                prompt2: "standing in classroom, wooden desks, holding blue folder against chest, looking at viewer, gentle smile, window sunlight",
                keepSameLocation: true,
                notes: "Pengenalan karakter di dalam ruang kelas dengan map biru.",
            },
            {
                id: "rio-scene-2",
                title: "Scene 2: Berjalan Melewati Pintu Kelas",
                prompt2: "walking through doorway, classroom door, hand on doorframe, looking back, calm expression, medium shot",
                keepSameLocation: true,
                notes: "Rio melangkah keluar pintu kelas sambil menoleh ke belakang.",
            },
            {
                id: "rio-scene-3",
                title: "Scene 3: Halaman Sekolah di Bawah Pohon Sakura",
                prompt2: "walking outdoors, school courtyard, large cherry blossom tree, falling petals, soft smile, wind blowing hair, wide angle",
                keepSameLocation: false,
                notes: "Pindah ke luar ruangan: Latar berganti pohon sakura dan kelopak berjatuhan.",
            },
            {
                id: "rio-scene-4",
                title: "Scene 4: Balkon Rooftop Menatap Senja",
                prompt2: "leaning against railing, school rooftop, looking at sunset sky, twilight golden hour lighting, peaceful thoughtful gaze, cowboy shot",
                keepSameLocation: false,
                notes: "Adegan penutup sore hari di atap sekolah dengan pencahayaan golden hour.",
            },
        ],
    },
    {
        id: "preset-cyberpunk",
        name: "🌃 Cyberpunk Operative — Misi Malam (Rooftop Neon -> Gang Gelap -> Terminal Data)",
        characterProfileName: "Valerie — Cyber Agent (Master Profile)",
        mainPrompt:
            "masterpiece, best quality, 1girl, solo, short neon cyan hair, asymmetric bob cut, glowing amber eyes, serious expression, cyberpunk tactical jacket, black high-collar bodysuit, luminous tech visor on forehead, fingerless gloves, cybernetic arm, neon rim lighting, cinematic shadows, futuristic anime aesthetic, sharp lineart",
        mainNegative:
            "worst quality, low quality, bad anatomy, bad hands, blurry, washed out, (3d, realistic:1.2), broken cybernetics, oversaturated face",
        scenes: [
            {
                id: "cyber-scene-1",
                title: "Scene 1: Mengawasi dari Atas Rooftop Gedung",
                prompt2: "standing on edge of high skyscraper rooftop, observing neon cyberpunk city below, hand pressing wireless earpiece, cold wind blowing hair, wide shot, distant flying cars",
                keepSameLocation: false,
                notes: "Pengintaian target dari ketinggian gedung kota masa depan.",
            },
            {
                id: "cyber-scene-2",
                title: "Scene 2: Menyusup ke Gang Gelap Berhujan",
                prompt2: "walking cautiously, dark wet alleyway, puddles on asphalt reflecting neon signs, steam rising from sewer grates, hand on holster, low angle shot",
                keepSameLocation: false,
                notes: "Bergerak senyap di gang basah berkabut.",
            },
            {
                id: "cyber-scene-3",
                title: "Scene 3: Membobol Terminal Server Hologram",
                prompt2: "kneeling by glowing blue holographic server terminal, typing on virtual keyboard, data stream reflections in amber eyes, focused expression, close-up shot",
                keepSameLocation: false,
                notes: "Interaksi dengan terminal hologram untuk mencuri data misi.",
            },
        ],
    },
    {
        id: "preset-fantasy",
        name: "🏰 Fantasy Elf Mage — Petualangan Sihir (Perpustakaan -> Hutan Mistis -> Balkon Kastil)",
        characterProfileName: "Sylvia Elf Sorceress (Master Profile)",
        mainPrompt:
            "masterpiece, best quality, 1girl, solo, elven mage, long silver hair, braided twintails, pointed elf ears, emerald green eyes, ornate emerald sorceress robe, gold embroidered corset, white ruffled skirt, magic crystal pendant, anime illustration, clean lineart, rich cel shading, glowing arcane particles",
        mainNegative:
            "worst quality, low quality, bad anatomy, bad hands, extra ears, broken staff, blurry, (3d, photorealistic:1.2)",
        scenes: [
            {
                id: "mage-scene-1",
                title: "Scene 1: Membaca Kitab Kuno di Perpustakaan",
                prompt2: "sitting at antique wooden desk, reading ancient spellbook, quill and parchment, warm candlelight, quiet cathedral library shelves, serene gentle smile",
                keepSameLocation: false,
                notes: "Mempelajari mantra kuno di perpustakaan kastil.",
            },
            {
                id: "mage-scene-2",
                title: "Scene 2: Merapalkan Sihir di Hutan Mistis",
                prompt2: "casting nature magic spell, floating green light orbs, hand reaching forward, dynamic wind blowing robe, magical enchanted forest, giant glowing ancient trees, determined gaze",
                keepSameLocation: false,
                notes: "Menembakkan mantra di tengah hutan bercahaya.",
            },
            {
                id: "mage-scene-3",
                title: "Scene 3: Berdiri di Balkon Kastil Memandang Lembah",
                prompt2: "standing on stone castle balcony, overlooking vast misty mountain valley, gentle morning sunlight, soft breeze, looking towards horizon, cowboy shot",
                keepSameLocation: false,
                notes: "Pemandangan megah dari atas balkon istana di pagi hari.",
            },
        ],
    },
];

// Quick Tag Inspiration Dictionary
const INSPIRATION_TAGS: Record<"pose" | "background" | "expression" | "camera", string[]> = {
    pose: [
        "standing in doorway",
        "walking through doorway",
        "walking forward",
        "sitting at wooden desk",
        "leaning against wall",
        "leaning against railing",
        "looking over shoulder",
        "reaching hand out",
        "running forward",
        "crossed arms",
        "hands behind back",
        "holding against chest",
        "hand on doorframe",
        "hand on hip",
        "relaxed sitting pose",
        "crouching low",
    ],
    background: [
        "classroom door",
        "school hallway",
        "wooden desks and chairs",
        "school window",
        "school courtyard",
        "cherry blossom tree",
        "falling petals",
        "sunset rooftop",
        "rainy city street",
        "cozy cafe interior",
        "library bookshelves",
        "bedroom window",
        "stone castle balcony",
        "magical forest",
        "night neon city",
    ],
    expression: [
        "calm expression",
        "gentle smile",
        "serious expression",
        "blushing cheeks",
        "surprised eyes",
        "looking at viewer",
        "looking away",
        "side glance",
        "closed eyes smile",
        "subtle smirk",
        "determined gaze",
        "pensive thoughtful gaze",
        "shy expression",
    ],
    camera: [
        "medium shot",
        "cowboy shot",
        "close up face",
        "upper body",
        "full body shot",
        "from below",
        "from above",
        "wide establishing shot",
        "three-quarter view",
        "dutch angle",
        "depth of field",
        "cinematic framing",
    ],
};

interface StorytellerMergerViewProps {
    onApplyToCanvas: (positive: string, negative: string) => void;
    showToast: (msg: string) => void;
    activeCheckpointName?: string;
}

let sceneCounter = 100;
function generateSceneId(): string {
    sceneCounter++;
    return `scene-${Date.now().toString(36)}-${sceneCounter}`;
}

export const StorytellerMergerView: React.FC<StorytellerMergerViewProps> = ({
    onApplyToCanvas,
    showToast,
    activeCheckpointName,
}) => {
    // -------------------------------------------------------------------------
    // 1. MASTER STATE (PRESET, PROMPT 1 & SCENES)
    // -------------------------------------------------------------------------
    const [selectedPresetId, setSelectedPresetId] = useState<string>("preset-rio");
    const [characterProfileName, setCharacterProfileName] = useState<string>("Tsukatsuki Rio (Master Profile)");
    const [mainPrompt, setMainPrompt] = useState<string>(RIO_MAIN_PROMPT_DEFAULT);
    const [mainNegative, setMainNegative] = useState<string>(
        "worst quality, low quality, bad anatomy, bad hands, missing fingers, extra limbs, deformed limbs, blurry, (3d, realistic, photorealistic:1.2), washed out colors, overexposed, underexposed, inconsistent lighting, deformed halo, broken accessories"
    );

    // Lock toggles (User-friendly granularity)
    const [lockCharacter, setLockCharacter] = useState<boolean>(true);
    const [lockOutfit, setLockOutfit] = useState<boolean>(true);
    const [lockLighting, setLockLighting] = useState<boolean>(true);
    const [lockArtStyle, setLockArtStyle] = useState<boolean>(true);

    // Scenes list
    const [scenes, setScenes] = useState<StorySceneItem[]>(() => STORY_PRESETS[0].scenes);
    const [activeSceneId, setActiveSceneId] = useState<string>(() => STORY_PRESETS[0].scenes[1]?.id || STORY_PRESETS[0].scenes[0].id);

    // Quick tag inspiration category tab
    const [activeInspCategory, setActiveInspCategory] = useState<"pose" | "background" | "expression" | "camera">("pose");

    // Collapsible ComfyUI Guide card
    const [showComfyGuide, setShowComfyGuide] = useState<boolean>(false);

    // Copied feedback indicator
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // Smart Tag & Danbooru Database Auto-Learn State
    const [autoLearn, setAutoLearn] = useState<boolean>(() => isAutoLearnEnabled());
    const [learnedTagsList, setLearnedTagsList] = useState<LearnedTag[]>(() => getLearnedTags());
    const [showAddTagModal, setShowAddTagModal] = useState<boolean>(false);
    const [showManageDrawer, setShowManageDrawer] = useState<boolean>(false);

    // Form states for manual tag creation
    const [formTagName, setFormTagName] = useState<string>("");
    const [formCategory, setFormCategory] = useState<BooruTagCategory>("general");
    const [formLayer, setFormLayer] = useState<string>("lighting");
    const [formAttrCat, setFormAttrCat] = useState<AttributeCategory>("lighting");
    const [formDesc, setFormDesc] = useState<string>("");
    const [isSavingCustomTag, setIsSavingCustomTag] = useState<boolean>(false);

    const handleToggleAutoLearn = () => {
        const next = !autoLearn;
        setAutoLearn(next);
        setAutoLearnEnabled(next);
        showToast(
            next
                ? "✓ Auto-Simpan Kosa Kata Baru ke Database (PostgreSQL) DIAKTIFKAN"
                : "Auto-Simpan dinonaktifkan (Mode Manual)"
        );
    };

    const handleSaveTagManual = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formTagName.trim()) {
            showToast("Nama tag tidak boleh kosong.");
            return;
        }

        try {
            setIsSavingCustomTag(true);
            const saved = await registerNewVocabularyTag(formTagName.trim(), {
                overrideCategory: formAttrCat,
                overrideLayer: formLayer,
                description: formDesc.trim() || undefined,
                source: "manual",
            });
            setLearnedTagsList(getLearnedTags());
            showToast(`✓ Tag "${saved.name}" berhasil disimpan ke database!`);
            setShowAddTagModal(false);
            setFormTagName("");
            setFormDesc("");
        } catch (err: any) {
            showToast(`Gagal menyimpan tag: ${err?.message || err}`);
        } finally {
            setIsSavingCustomTag(false);
        }
    };

    // Container Ref for smooth scroll
    const containerRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, []);

    // Active Scene object
    const activeScene = useMemo(() => {
        return scenes.find((s) => s.id === activeSceneId) || scenes[0];
    }, [scenes, activeSceneId]);

    const activeSceneIndex = useMemo(() => {
        const idx = scenes.findIndex((s) => s.id === activeSceneId);
        return idx >= 0 ? idx : 0;
    }, [scenes, activeSceneId]);

    // Active Lock Configuration derived from toggles
    const activeLocks: LockConfiguration = useMemo(() => {
        const def = createDefaultLocks();
        return {
            ...def,
            character_identity: lockCharacter,
            physical_appearance: lockCharacter,
            hair: lockCharacter,
            eyes: lockCharacter,
            outfit: lockOutfit,
            accessories: lockOutfit,
            lighting: lockLighting,
            art_style: lockArtStyle,
            quality: true,
            negative: true,
            pose: false,
            action: false,
            expression: false,
            objects: false,
            background: false,
            camera: false,
        };
    }, [lockCharacter, lockOutfit, lockLighting, lockArtStyle]);

    // Auto-parsed DNA attributes from Prompt 1 (Master Anchor)
    const parsedMainAttributes = useMemo(() => {
        return parsePromptLocal(mainPrompt, mainNegative);
    }, [mainPrompt, mainNegative]);

    // Live Real-Time Merged Scene Compilation
    const mergedResult: MainSceneMergeResult | null = useMemo(() => {
        if (!mainPrompt.trim()) return null;
        try {
            return mergeMainAndScenePrompt(
                mainPrompt,
                activeScene ? activeScene.prompt2 : "",
                mainNegative,
                "",
                {
                    locks: activeLocks,
                    keepSameBackground: activeScene ? activeScene.keepSameLocation : true,
                    mergeMode: "smart",
                }
            );
        } catch (err) {
            console.error("[StorytellerMergerView] Merge calculation error:", err);
            return null;
        }
    }, [mainPrompt, activeScene, mainNegative, activeLocks]);

    // Live Semantic & Danbooru Tag Intelligence
    const detectedVocabulary = useMemo(() => {
        const allTokens = [
            ...tokenizeRawPrompt(mainPrompt),
            ...(activeScene ? tokenizeRawPrompt(activeScene.prompt2) : []),
        ];

        const seenClean = new Set<string>();
        const knownTags: string[] = [];
        const newLearnedTags: Array<{ clean: string; category: AttributeCategory; source: string; isDb: boolean }> = [];

        allTokens.forEach((tok) => {
            const clean = tok.replace(/^\(+/, "").replace(/\)+$/, "").replace(/:[0-9.]+$/, "").trim().toLowerCase();
            if (!clean || seenClean.has(clean)) return;
            seenClean.add(clean);

            const check = isKnownBooruTag(clean);
            if (check.isKnown) {
                if (check.source === "learned") {
                    const l = check.item as LearnedTag;
                    newLearnedTags.push({
                        clean,
                        category: l.attributeCategory,
                        source: "Tersimpan di DB",
                        isDb: true,
                    });
                } else {
                    knownTags.push(clean);
                }
            } else {
                const inferred = inferTagCategoryAndLayer(clean);
                newLearnedTags.push({
                    clean,
                    category: inferred.attributeCategory,
                    source: "Terdeteksi Baru (Auto-Add)",
                    isDb: autoLearn,
                });
            }
        });

        return {
            totalAnalyzed: seenClean.size,
            knownCount: knownTags.length,
            newCount: newLearnedTags.length,
            newLearnedTags,
        };
    }, [mainPrompt, activeScene, autoLearn, learnedTagsList]);

    // Copy helper with animated feedback
    const handleCopy = (text: string, key: string, msg: string) => {
        if (!text.trim()) return;
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        showToast(msg);
        setTimeout(() => setCopiedKey(null), 1800);
    };

    // -------------------------------------------------------------------------
    // PRESET & RESET HANDLERS
    // -------------------------------------------------------------------------
    const handleSelectPreset = (presetId: string) => {
        setSelectedPresetId(presetId);
        if (presetId === "custom") {
            setCharacterProfileName("Karakter Kustom");
            setMainPrompt("");
            setScenes([
                {
                    id: generateSceneId(),
                    title: "Scene 1: Adegan Awal",
                    prompt2: "",
                    keepSameLocation: true,
                    notes: "Tulis pose dan latar untuk scene pertama.",
                },
            ]);
            setActiveSceneId(scenes[0]?.id || "scene-1");
            showToast("Memulai template cerita kustom kosong.");
            return;
        }

        const preset = STORY_PRESETS.find((p) => p.id === presetId);
        if (preset) {
            setCharacterProfileName(preset.characterProfileName);
            setMainPrompt(preset.mainPrompt);
            setMainNegative(preset.mainNegative);
            setScenes(preset.scenes);
            setActiveSceneId(preset.scenes[1]?.id || preset.scenes[0].id);
            showToast(`✓ Preset "${preset.name.split("—")[0].trim()}" berhasil dimuat!`);
        }
    };

    const handleResetStory = () => {
        handleSelectPreset("preset-rio");
        showToast("↺ Cerita dikembalikan ke contoh utama Rio Tsukatsuki.");
    };

    // -------------------------------------------------------------------------
    // SCENE MANAGEMENT (ADD, DELETE, UPDATE)
    // -------------------------------------------------------------------------
    const handleAddScene = () => {
        const newIndex = scenes.length + 1;
        const newScene: StorySceneItem = {
            id: generateSceneId(),
            title: `Scene ${newIndex}: Adegan Lanjutan Baru`,
            prompt2: "",
            keepSameLocation: false,
            notes: "Tentukan pose, aksi, latar baru, atau ekspresi.",
        };
        setScenes((prev) => [...prev, newScene]);
        setActiveSceneId(newScene.id);
        showToast(`✓ Scene ${newIndex} ditambahkan ke storyboard!`);
    };

    const handleDeleteScene = (e: React.MouseEvent, sceneIdToDelete: string) => {
        e.stopPropagation();
        if (scenes.length <= 1) {
            showToast("Minimal harus ada 1 scene dalam cerita.");
            return;
        }
        const filtered = scenes.filter((s) => s.id !== sceneIdToDelete);
        setScenes(filtered);
        if (activeSceneId === sceneIdToDelete) {
            setActiveSceneId(filtered[0].id);
        }
        showToast("Scene berhasil dihapus.");
    };

    const handleUpdateActiveSceneTitle = (title: string) => {
        setScenes((prev) =>
            prev.map((s) => (s.id === activeSceneId ? { ...s, title } : s))
        );
    };

    const handleUpdateActiveScenePrompt2 = (prompt2: string) => {
        setScenes((prev) =>
            prev.map((s) => (s.id === activeSceneId ? { ...s, prompt2 } : s))
        );
    };

    const handleToggleActiveSceneLocationMode = (keepSame: boolean) => {
        setScenes((prev) =>
            prev.map((s) => (s.id === activeSceneId ? { ...s, keepSameLocation: keepSame } : s))
        );
    };

    // -------------------------------------------------------------------------
    // QUICK TAG INSERTION
    // -------------------------------------------------------------------------
    const handleInsertQuickTag = (tagToAdd: string) => {
        if (!activeScene) return;
        const currentPrompt = activeScene.prompt2.trim();

        // Check if tag is already in prompt (case insensitive)
        const tags = currentPrompt.split(",").map((t) => t.trim().toLowerCase());
        if (tags.includes(tagToAdd.toLowerCase())) {
            showToast(`Tag "${tagToAdd}" sudah ada di prompt scene ini.`);
            return;
        }

        const newPrompt = currentPrompt ? `${currentPrompt}, ${tagToAdd}` : tagToAdd;
        handleUpdateActiveScenePrompt2(newPrompt);
        showToast(`+ "${tagToAdd}" ditambahkan ke Scene ${activeSceneIndex + 1}!`);
    };

    // -------------------------------------------------------------------------
    // BATCH EXPORT ALL SCENES
    // -------------------------------------------------------------------------
    const handleCopyAllScenesBatch = () => {
        let compiledBatch = `======================================================\n`;
        compiledBatch += `STORY & STYLE PROMPT MERGER — BATCH STORY PROMPTS\n`;
        compiledBatch += `Karakter Profile: ${characterProfileName}\n`;
        compiledBatch += `Target Model: ${activeCheckpointName || "Anime Model"}\n`;
        compiledBatch += `Total Adegan: ${scenes.length} Scenes\n`;
        compiledBatch += `======================================================\n\n`;

        scenes.forEach((sc, idx) => {
            const res = mergeMainAndScenePrompt(
                mainPrompt,
                sc.prompt2,
                mainNegative,
                "",
                {
                    locks: activeLocks,
                    keepSameBackground: sc.keepSameLocation,
                    mergeMode: "smart",
                }
            );

            compiledBatch += `[SCENE ${idx + 1}] ${sc.title}\n`;
            compiledBatch += `Mode Latar: ${sc.keepSameLocation ? "Satu Lokasi Berkelanjutan" : "Ganti Latar Baru"}\n`;
            compiledBatch += `POSITIVE PROMPT:\n${res.positive}\n\n`;
            compiledBatch += `NEGATIVE PROMPT:\n${res.negative}\n\n`;
            compiledBatch += `------------------------------------------------------\n\n`;
        });

        navigator.clipboard.writeText(compiledBatch);
        handleCopy(compiledBatch, "batch-all", `✓ Seluruh ${scenes.length} prompt scene berhasil disalin ke clipboard!`);
    };

    const handleDownloadStoryTxt = () => {
        let content = `STORY & STYLE PROMPT MERGER EXPORT\nKarakter: ${characterProfileName}\nModel: ${activeCheckpointName || "Anime Model"}\nTanggal: ${new Date().toLocaleString()}\n\n`;
        scenes.forEach((sc, idx) => {
            const res = mergeMainAndScenePrompt(
                mainPrompt,
                sc.prompt2,
                mainNegative,
                "",
                {
                    locks: activeLocks,
                    keepSameBackground: sc.keepSameLocation,
                    mergeMode: "smart",
                }
            );
            content += `==================================================\n`;
            content += `SCENE ${idx + 1}: ${sc.title}\n`;
            content += `--------------------------------------------------\n`;
            content += `POSITIVE:\n${res.positive}\n\n`;
            content += `NEGATIVE:\n${res.negative}\n\n`;
        });

        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `story-prompts-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("✓ File naskah cerita (.txt) berhasil diunduh!");
    };

    return (
        <div className="storyteller-container sm-unified-container" ref={containerRef}>
            {/* ------------------------------------------------------------------
                1. HEADER BRANDING & SYSTEM META
               ------------------------------------------------------------------ */}
            <header className="sm-top-bar">
                <div className="sm-top-brand">
                    <div className="sm-brand-icon-box">🎬</div>
                    <div className="sm-brand-meta">
                        <div className="sm-brand-title-row">
                            <h2 className="sm-brand-title">Story &amp; Style Prompt Merger</h2>
                            <span className="sm-badge-neutral">
                                Checkpoint: {activeCheckpointName || "Anime SDXL / Pony"}
                            </span>
                            <span className="sm-badge-pill success">
                                🛡️ Anti-Clash 0 Double
                            </span>
                            <span className="sm-badge-pill warning">
                                🔒 Karakter &amp; Lighting Terkunci
                            </span>
                        </div>
                        <p className="sm-brand-desc">
                            Sistem Penggabung Prompt Cerita Multi-Scene: Mengunci Karakter, Baju, Rambut, Lighting &amp; Art Style tetap konsisten, dengan Pose, Aksi &amp; Background yang dinamis tiap adegan.
                        </p>
                    </div>
                </div>

                <div className="sm-preset-quick-actions">
                    <button
                        type="button"
                        className={`sm-card-action-btn ${showComfyGuide ? "highlight" : ""}`}
                        onClick={() => setShowComfyGuide(!showComfyGuide)}
                        title="Tampilkan panduan pengaturan CFG & Seed di ComfyUI agar wajah tidak berubah"
                    >
                        📋 {showComfyGuide ? "Tutup Panduan ComfyUI" : "Tips Kestabilan ComfyUI"}
                    </button>
                    <button
                        type="button"
                        className="sm-card-action-btn highlight"
                        onClick={handleCopyAllScenesBatch}
                        title="Salin prompt seluruh adegan sekaligus untuk render batch di ComfyUI atau WebUI"
                    >
                        📑 {copiedKey === "batch-all" ? "✓ Tersalin Semua!" : "Salin Semua Scene (Batch)"}
                    </button>
                </div>
            </header>

            {/* ------------------------------------------------------------------
                2. COMFORCE & COMFYUI STABILITY TIPS CARD (COLLAPSIBLE)
               ------------------------------------------------------------------ */}
            {showComfyGuide && (
                <div className="sm-comfy-tips-card">
                    <div className="sm-comfy-tips-header">
                        <span className="sm-comfy-tips-title">
                            💡 4 Kunci Menjaga Karakter 100% Konsisten di Antar Scene (ComfyUI / SD)
                        </span>
                        <button
                            type="button"
                            className="sm-scene-tab-del-btn"
                            onClick={() => setShowComfyGuide(false)}
                            title="Tutup panduan"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="sm-comfy-tips-grid">
                        <div className="sm-comfy-item">
                            <span className="sm-comfy-item-title blue">1. Turunkan CFG Scale ke 5.0 – 6.0</span>
                            <p className="sm-comfy-item-desc">
                                CFG 7.5 – 8.5 sering membuat prompt terbobot mengalami <em>latent blowout</em> (wajah meleleh di beberapa scene). Gunakan CFG 5.0 – 6.0 untuk kestabilan anatomi maksimal.
                            </p>
                        </div>

                        <div className="sm-comfy-item">
                            <span className="sm-comfy-item-title green">2. Kunci Seed &amp; Pakai Variation Seed (0.12)</span>
                            <p className="sm-comfy-item-desc">
                                Kunci seed KSampler ke <code>fixed</code>. Gunakan node <em>Variation Seed / Extra Seed</em> sebesar <code>0.10 – 0.15</code> untuk variasi pose dan latar tanpa mengubah fitur wajah karakter.
                            </p>
                        </div>

                        <div className="sm-comfy-item">
                            <span className="sm-comfy-item-title yellow">3. Sampler DPMPP 2M Karras (28–32 Steps)</span>
                            <p className="sm-comfy-item-desc">
                                Kombinasi sampler <code>dpmpp_2m</code> dengan scheduler <code>karras</code> memberikan garis cel shading anime paling stabil antar perubahan latar.
                            </p>
                        </div>

                        <div className="sm-comfy-item">
                            <span className="sm-comfy-item-title purple">4. IP-Adapter FaceID (Bobot 0.55 – 0.65)</span>
                            <p className="sm-comfy-item-desc">
                                Pasang node IP-Adapter FaceID dengan gambar referensi Scene 1 untuk memastikan struktur mata, hidung, dan proporsi wajah terkunci 100% sempurna di semua scene.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ------------------------------------------------------------------
                3. PRESET SELECTOR & GLOBAL ACTIONS BAR
               ------------------------------------------------------------------ */}
            <div className="sm-preset-action-bar">
                <div className="sm-preset-selector-group">
                    <span className="sm-preset-select-label">Pilih Cerita / Preset:</span>
                    <select
                        className="sm-preset-dropdown"
                        value={selectedPresetId}
                        onChange={(e) => handleSelectPreset(e.target.value)}
                    >
                        {STORY_PRESETS.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                        <option value="custom">✏️ Cerita Kustom Baru (Kosongkan Field)</option>
                    </select>
                </div>

                <div className="sm-preset-quick-actions">
                    <button
                        type="button"
                        className="sm-card-action-btn"
                        onClick={handleResetStory}
                        title="Kembalikan prompt dan scene ke default Rio Tsukatsuki"
                    >
                        ↺ Muat Ulang Contoh Rio
                    </button>
                    <button
                        type="button"
                        className="sm-card-action-btn"
                        onClick={handleDownloadStoryTxt}
                        title="Unduh seluruh prompt scene dalam format naskah TXT"
                    >
                        💾 Unduh File Teks (.txt)
                    </button>
                </div>
            </div>

            {/* ------------------------------------------------------------------
                4. MULTI-SCENE STORYBOARD TIMELINE BAR
               ------------------------------------------------------------------ */}
            <div className="sm-timeline-card">
                <div className="sm-timeline-header">
                    <span className="sm-timeline-title">
                        🎞️ Alur Cerita Adegan (Storyboard Timeline) — {scenes.length} Scene
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--sm-text-muted)" }}>
                        Klik adegan di bawah untuk mengatur pose &amp; latarnya:
                    </span>
                </div>

                <div className="sm-timeline-scroll">
                    {scenes.map((sc, idx) => {
                        const isActive = sc.id === activeSceneId;
                        return (
                            <div
                                key={sc.id}
                                className={`sm-scene-tab-pill ${isActive ? "active" : ""}`}
                                onClick={() => setActiveSceneId(sc.id)}
                            >
                                <span className="sm-scene-tab-idx">#{idx + 1}</span>
                                <span className="sm-scene-tab-name">
                                    {sc.title.length > 28 ? `${sc.title.slice(0, 28)}...` : sc.title}
                                </span>
                                {scenes.length > 1 && (
                                    <button
                                        type="button"
                                        className="sm-scene-tab-del-btn"
                                        onClick={(e) => handleDeleteScene(e, sc.id)}
                                        title={`Hapus Scene ${idx + 1}`}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        );
                    })}

                    <button
                        type="button"
                        className="sm-scene-tab-add-btn"
                        onClick={handleAddScene}
                        title="Tambahkan scene baru ke storyboard cerita"
                    >
                        <span>+ Tambah Scene Baru</span>
                    </button>
                </div>
            </div>

            {/* ------------------------------------------------------------------
                5. DUAL WORKSTATION: PROMPT 1 (MASTER ANCHOR) + PROMPT 2 (SCENE VARIATION)
               ------------------------------------------------------------------ */}
            <div className="sm-dual-inputs-grid">
                {/* --------------------------------------------------------------
                    LEFT COLUMN: PROMPT 1 (MASTER CHARACTER & VISUAL ANCHOR)
                   -------------------------------------------------------------- */}
                <div className="sm-prompt-input-col main-prompt-col">
                    <div className="sm-prompt-col-header">
                        <div className="sm-col-header-meta">
                            <span className="sm-col-role-badge main">
                                🔒 PROMPT 1: MASTER CHARACTER &amp; STYLE ANCHOR
                            </span>
                            <span className="sm-col-desc">
                                DNA Cerita: Wajah, Rambut, Gaun/Baju, Lighting &amp; Art Style DIKUNCI tidak berubah.
                            </span>
                        </div>
                        <span className="sm-tag-counter">
                            ~{mainPrompt.split(",").filter((t) => t.trim()).length} tags
                        </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--sm-text-muted)" }}>
                            Nama Profil:
                        </span>
                        <input
                            type="text"
                            className="dm-form-input"
                            style={{ padding: "4px 8px", fontSize: "11.5px", flex: 1 }}
                            value={characterProfileName}
                            onChange={(e) => setCharacterProfileName(e.target.value)}
                            placeholder="cth. Rio Tsukatsuki (Master Profile)"
                        />
                    </div>

                    <textarea
                        className="sm-textarea-raw main-box"
                        rows={6}
                        value={mainPrompt}
                        onChange={(e) => setMainPrompt(e.target.value)}
                        placeholder="Masukkan Prompt 1 (Main Prompt / Karakter Utama lengkap dengan outfit, rambut, art style, dan pencahayaan)..."
                    />

                    {/* Live DNA Chips from Prompt 1 */}
                    <div className="sm-dna-preview-box">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--sm-text-muted)" }}>
                                🧬 DNA Karakter &amp; Visual yang Terdeteksi:
                            </span>
                            <span style={{ fontSize: "10.5px", color: "var(--sm-text-faint)" }}>
                                Auto-classified
                            </span>
                        </div>

                        {/* Character Identity */}
                        {parsedMainAttributes.character_identity.length > 0 && (
                            <div className="sm-dna-row">
                                <span className="sm-dna-label">👤 Karakter:</span>
                                <div className="sm-dna-tag-chips">
                                    {parsedMainAttributes.character_identity.map((attr) => (
                                        <span key={attr.id} className="sm-dna-tag-chip" title="Identitas Karakter Terkunci">
                                            {attr.text}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Hair & Eyes */}
                        {(parsedMainAttributes.hair.length > 0 || parsedMainAttributes.eyes.length > 0) && (
                            <div className="sm-dna-row">
                                <span className="sm-dna-label">💇 Rambut &amp; Mata:</span>
                                <div className="sm-dna-tag-chips">
                                    {[...parsedMainAttributes.hair, ...parsedMainAttributes.eyes].map((attr) => (
                                        <span key={attr.id} className="sm-dna-tag-chip" title="Fitur Wajah & Rambut Terkunci">
                                            {attr.text}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Outfit & Accessories */}
                        {(parsedMainAttributes.outfit.length > 0 || parsedMainAttributes.accessories.length > 0) && (
                            <div className="sm-dna-row">
                                <span className="sm-dna-label">👗 Outfit &amp; Aksesori:</span>
                                <div className="sm-dna-tag-chips">
                                    {[...parsedMainAttributes.outfit, ...parsedMainAttributes.accessories].map((attr) => (
                                        <span key={attr.id} className="sm-dna-tag-chip" title="Pakaian & Aksesori Terkunci">
                                            {attr.text}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Lighting & Coloring */}
                        {parsedMainAttributes.lighting.length > 0 && (
                            <div className="sm-dna-row">
                                <span className="sm-dna-label">💡 Tata Cahaya:</span>
                                <div className="sm-dna-tag-chips">
                                    {parsedMainAttributes.lighting.map((attr) => (
                                        <span key={attr.id} className="sm-dna-tag-chip lighting" title="Lighting Terkunci">
                                            {attr.text}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Art Style */}
                        {parsedMainAttributes.art_style.length > 0 && (
                            <div className="sm-dna-row">
                                <span className="sm-dna-label">🎨 Art Style:</span>
                                <div className="sm-dna-tag-chips">
                                    {parsedMainAttributes.art_style.map((attr) => (
                                        <span key={attr.id} className="sm-dna-tag-chip style" title="Gaya Gambar Anime Terkunci">
                                            {attr.text}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Granular Consistency Locks Toggles */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--sm-text-muted)" }}>
                            Kunci Konsistensi Atribut dari Prompt 1:
                        </span>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                            <label className="sm-merger-toggle-label" title="Kunci wajah, mata, rambut, dan identitas karakter">
                                <input
                                    type="checkbox"
                                    checked={lockCharacter}
                                    onChange={(e) => setLockCharacter(e.target.checked)}
                                />
                                <span>🔒 Karakter &amp; Wajah</span>
                            </label>

                            <label className="sm-merger-toggle-label" title="Kunci gaun, baju, sepatu, dan perhiasan agar tidak berganti outfit">
                                <input
                                    type="checkbox"
                                    checked={lockOutfit}
                                    onChange={(e) => setLockOutfit(e.target.checked)}
                                />
                                <span>🔒 Outfit &amp; Pakaian</span>
                            </label>

                            <label className="sm-merger-toggle-label" title="Kunci tata cahaya (sunlight, shadows) agar nuansa scene tidak miss">
                                <input
                                    type="checkbox"
                                    checked={lockLighting}
                                    onChange={(e) => setLockLighting(e.target.checked)}
                                />
                                <span>🔒 Lighting &amp; Warna</span>
                            </label>

                            <label className="sm-merger-toggle-label" title="Kunci cel shading, ketebalan garis lineart, dan aesthetic anime">
                                <input
                                    type="checkbox"
                                    checked={lockArtStyle}
                                    onChange={(e) => setLockArtStyle(e.target.checked)}
                                />
                                <span>🔒 Art Style &amp; Cel Shading</span>
                            </label>
                        </div>
                    </div>

                    {/* Anchor Negative Prompt */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginTop: "4px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--sm-text-muted)" }}>
                                Negative Prompt Anchor (Guarded):
                            </span>
                            <span style={{ fontSize: "10.5px", color: "var(--sm-text-faint)" }}>
                                Proteksi 2D Anime &amp; Anti-Burn
                            </span>
                        </div>
                        <textarea
                            className="sm-textarea-raw"
                            rows={3}
                            style={{ fontSize: "11.5px", borderColor: "rgba(239, 68, 68, 0.25)" }}
                            value={mainNegative}
                            onChange={(e) => setMainNegative(e.target.value)}
                            placeholder="Negative prompt master..."
                        />
                    </div>
                </div>

                {/* --------------------------------------------------------------
                    RIGHT COLUMN: PROMPT 2 (TAMBAHAN SCENE AKTIF)
                   -------------------------------------------------------------- */}
                <div className="sm-prompt-input-col scene-prompt-col">
                    <div className="sm-prompt-col-header">
                        <div className="sm-col-header-meta">
                            <span className="sm-col-role-badge addition">
                                🔄 PROMPT 2: TAMBAHAN SCENE #{activeSceneIndex + 1}
                            </span>
                            <span className="sm-col-desc">
                                Elemen Berubah: Pose, Aksi Tangan, Background Tempat, Ekspresi &amp; Kamera.
                            </span>
                        </div>
                        <span className="sm-tag-counter">
                            ~{activeScene.prompt2.split(",").filter((t) => t.trim()).length} tags
                        </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--sm-text-muted)" }}>
                            Judul Scene:
                        </span>
                        <input
                            type="text"
                            className="dm-form-input"
                            style={{ padding: "4px 8px", fontSize: "11.5px", flex: 1 }}
                            value={activeScene.title}
                            onChange={(e) => handleUpdateActiveSceneTitle(e.target.value)}
                            placeholder="cth. Scene 2: Berjalan Melewati Pintu Kelas"
                        />
                    </div>

                    <textarea
                        className="sm-textarea-raw scene-box"
                        rows={6}
                        value={activeScene.prompt2}
                        onChange={(e) => handleUpdateActiveScenePrompt2(e.target.value)}
                        placeholder="Masukkan variasi adegan untuk scene ini (cth: walking through doorway, classroom door, hand on doorframe, looking back, calm expression, medium shot)..."
                    />

                    {/* Background Continuity Mode Selector */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--sm-text-muted)" }}>
                            Mode Kontinuitas Latar / Tempat:
                        </span>
                        <div className="sm-continuity-switch">
                            <button
                                type="button"
                                className={`sm-continuity-btn ${activeScene.keepSameLocation ? "active" : ""}`}
                                onClick={() => handleToggleActiveSceneLocationMode(true)}
                                title="Mempertahankan latar utama (ruang kelas) dan menambahkan elemen baru (pintu kelas) tanpa duplikat"
                            >
                                <span>🏫 Satu Lokasi Berkelanjutan</span>
                            </button>
                            <button
                                type="button"
                                className={`sm-continuity-btn ${!activeScene.keepSameLocation ? "active" : ""}`}
                                onClick={() => handleToggleActiveSceneLocationMode(false)}
                                title="Menghapus background lama dari Prompt 1 dan menggantinya total dengan background baru dari Scene 2 (misal pindah ke luar ruangan / rooftop)"
                            >
                                <span>🔄 Ganti Latar Baru Total</span>
                            </button>
                        </div>
                        <span style={{ fontSize: "11px", color: "var(--sm-text-faint)", fontStyle: "italic" }}>
                            {activeScene.keepSameLocation
                                ? "Latar Prompt 1 (ruang kelas) dipertahankan, objek pintu/jendela ditambahkan secara mulus."
                                : "Latar Prompt 1 diganti 100% oleh latar baru dari Scene ini (misal pindah ke halaman sakura atau atap rooftop)."}
                        </span>
                    </div>

                    {/* Quick-Tag Inspiration Bar (1-Click Insertion) */}
                    <div className="sm-inspiration-box">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "11.5px", fontWeight: 800, color: "var(--sm-text-secondary)" }}>
                                ⚡ Inspirasi Tag Cepat (Klik untuk Tambah ke Prompt 2):
                            </span>
                        </div>

                        <div className="sm-inspiration-nav">
                            <button
                                type="button"
                                className={`sm-insp-nav-btn ${activeInspCategory === "pose" ? "active" : ""}`}
                                onClick={() => setActiveInspCategory("pose")}
                            >
                                🏃 Pose &amp; Aksi
                            </button>
                            <button
                                type="button"
                                className={`sm-insp-nav-btn ${activeInspCategory === "background" ? "active" : ""}`}
                                onClick={() => setActiveInspCategory("background")}
                            >
                                📍 Background / Latar
                            </button>
                            <button
                                type="button"
                                className={`sm-insp-nav-btn ${activeInspCategory === "expression" ? "active" : ""}`}
                                onClick={() => setActiveInspCategory("expression")}
                            >
                                😊 Ekspresi Wajah
                            </button>
                            <button
                                type="button"
                                className={`sm-insp-nav-btn ${activeInspCategory === "camera" ? "active" : ""}`}
                                onClick={() => setActiveInspCategory("camera")}
                            >
                                🎥 Kamera &amp; Angle
                            </button>
                        </div>

                        <div className="sm-insp-chips-wrap">
                            {INSPIRATION_TAGS[activeInspCategory].map((tag) => {
                                const isAdded = activeScene.prompt2
                                    .toLowerCase()
                                    .includes(tag.toLowerCase());
                                return (
                                    <button
                                        key={tag}
                                        type="button"
                                        className={`sm-insp-chip-btn ${isAdded ? "added" : ""}`}
                                        onClick={() => handleInsertQuickTag(tag)}
                                        title={isAdded ? "Sudah ada di prompt" : "Klik untuk menambahkan"}
                                    >
                                        <span>{isAdded ? "✓" : "+"}</span>
                                        <span>{tag}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ------------------------------------------------------------------
                5B. SMART TAG & DANBOORU DETECTOR INTELLIGENCE CARD
               ------------------------------------------------------------------ */}
            <div className="sm-smart-tag-card">
                <div className="sm-smart-tag-header">
                    <div className="sm-smart-tag-title-group">
                        <span className="sm-smart-tag-title">
                            🏷️ Smart Tag &amp; Danbooru Detector
                        </span>
                        <span className="sm-badge-pill success">
                            PostgreSQL Sync Aktif
                        </span>
                    </div>

                    <div className="sm-smart-tag-controls">
                        <button
                            type="button"
                            className="sm-smart-tag-auto-toggle"
                            onClick={handleToggleAutoLearn}
                            title="Aktifkan atau nonaktifkan auto-learning tag baru ke database PostgreSQL"
                        >
                            <span>{autoLearn ? "✓ Auto-Simpan DB: AKTIF" : "✕ Auto-Simpan: MANUAL"}</span>
                        </button>

                        <button
                            type="button"
                            className="sm-smart-tag-btn-add"
                            onClick={() => setShowAddTagModal(true)}
                            title="Tambah tag kustom secara manual ke database Danbooru"
                        >
                            <span>+ Tambah Tag Manual</span>
                        </button>

                        <button
                            type="button"
                            className="sm-smart-tag-btn-manage"
                            onClick={() => setShowManageDrawer(!showManageDrawer)}
                            title="Lihat daftar kosa kata kustom yang tersimpan di database"
                        >
                            <span>📚 Pustaka Tag ({learnedTagsList.length})</span>
                        </button>
                    </div>
                </div>

                <p className="sm-smart-tag-desc">
                    Sistem mendeteksi danbooru tags &amp; kosa kata baru secara otomatis. Kosa kata baru (seperti <code>defined shadow shapes</code>) diklasifikasikan ke kategori yang sesuai dan disimpan ke database agar tidak hilang saat merger.
                </p>

                {/* Detected Tags Breakdown */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--sm-text-secondary)" }}>
                            Status Analisis Prompt ({detectedVocabulary.totalAnalyzed} tag dianalisis):
                        </span>
                        <div style={{ display: "flex", gap: "10px", fontSize: "11px" }}>
                            <span style={{ color: "#93c5fd" }}>✓ {detectedVocabulary.knownCount} Danbooru Standar</span>
                            <span style={{ color: "#4ade80", fontWeight: 700 }}>
                                🆕 {detectedVocabulary.newCount} Kosa Kata Baru / DB Custom
                            </span>
                        </div>
                    </div>

                    <div className="sm-smart-tag-chips-wrap">
                        {detectedVocabulary.newLearnedTags.length === 0 ? (
                            <span style={{ fontSize: "11px", color: "var(--sm-text-faint)", fontStyle: "italic" }}>
                                Semua tag di prompt adalah tag standar Danbooru.
                            </span>
                        ) : (
                            detectedVocabulary.newLearnedTags.map((item, idx) => (
                                <div
                                    key={idx}
                                    className={`sm-smart-tag-chip ${item.isDb ? "learned" : "custom"}`}
                                    title={`Kategori: ${item.category} | ${item.source}`}
                                >
                                    <span>{item.isDb ? "✓" : "✨"}</span>
                                    <span>{item.clean}</span>
                                    <span className="sm-smart-tag-subbadge">{item.category}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Manage Drawer (Collapsible) */}
                {showManageDrawer && (
                    <div style={{
                        marginTop: "10px",
                        padding: "12px",
                        background: "#121318",
                        border: "1px solid #282a36",
                        borderRadius: "6px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: "#f4f4f6" }}>
                                📚 Daftar Tag Kustom Tersimpan di Database ({learnedTagsList.length} tag):
                            </span>
                            <button
                                type="button"
                                className="sm-scene-tab-del-btn"
                                onClick={() => setShowManageDrawer(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", maxHeight: "160px", overflowY: "auto" }}>
                            {learnedTagsList.length === 0 ? (
                                <span style={{ fontSize: "11px", color: "var(--sm-text-faint)" }}>
                                    Belum ada tag kustom yang tersimpan di database. Tag baru akan otomatis tersimpan saat prompt dimasukkan.
                                </span>
                            ) : (
                                learnedTagsList.map((tag, idx) => (
                                    <div
                                        key={idx}
                                        className="sm-smart-tag-chip learned"
                                        title={`${tag.description} | Ditambahkan: ${new Date(tag.learnedAt).toLocaleDateString()}`}
                                    >
                                        <span>✓</span>
                                        <span>{tag.name}</span>
                                        <span className="sm-smart-tag-subbadge">{tag.attributeCategory}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ------------------------------------------------------------------
                6. LIVE COMPILED MERGED OUTPUT SECTION
               ------------------------------------------------------------------ */}
            {mergedResult && (
                <div className="sm-merged-output-card">
                    <div className="sm-merged-output-header">
                        <div className="sm-merged-output-title">
                            <span>✨ Hasil Prompt Adegan Lanjutan: [{activeScene.title}]</span>
                        </div>
                        <div className="sm-merger-badge-row">
                            <span className="sm-tag-counter">
                                {mergedResult.stats.totalTags} tags (~{Math.ceil(mergedResult.stats.totalTags * 1.3)} tok)
                            </span>
                            <span className="sm-badge-pill success">
                                ✓ 0 Tag Double (Clean Deduplicated)
                            </span>
                            <span className="sm-badge-pill primary">
                                🔒 Karakter &amp; Baju Konsisten
                            </span>
                        </div>
                    </div>

                    {/* Positive Prompt Box */}
                    <div className="sm-merged-prompt-box">
                        {mergedResult.positive}
                    </div>

                    {/* Actions Row */}
                    <div className="sm-merged-actions-row">
                        <button
                            type="button"
                            className="sm-btn-copy-output"
                            onClick={() =>
                                handleCopy(
                                    mergedResult.positive,
                                    "merged-pos",
                                    `✓ Prompt Scene ${activeSceneIndex + 1} berhasil disalin ke clipboard!`
                                )
                            }
                        >
                            📋 {copiedKey === "merged-pos" ? "✓ Tersalin!" : "Salin Prompt Scene Ini"}
                        </button>

                        <button
                            type="button"
                            className="sm-btn-apply-canvas"
                            onClick={() => {
                                onApplyToCanvas(mergedResult.positive, mergedResult.negative);
                                showToast(`✓ Scene ${activeSceneIndex + 1} diterapkan ke Canvas Studio Lab!`);
                            }}
                        >
                            ⚡ Terapkan ke Canvas Studio
                        </button>

                        <button
                            type="button"
                            className="sm-card-action-btn"
                            onClick={() =>
                                handleCopy(
                                    mergedResult.negative,
                                    "merged-neg",
                                    "✓ Negative prompt berhasil disalin!"
                                )
                            }
                        >
                            📋 {copiedKey === "merged-neg" ? "✓ Tersalin!" : "Salin Negatif"}
                        </button>
                    </div>

                    {/* Guarded Negative Box */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--sm-text-muted)" }}>
                            Negative Prompt Hasil Merger (Anti-Burn &amp; 2D Anime Protection):
                        </span>
                        <div className="sm-merged-prompt-box negative">
                            {mergedResult.negative}
                        </div>
                    </div>

                    {/* ----------------------------------------------------------
                        7. SEMANTIC CONSISTENCY AUDIT BREAKDOWN
                       ---------------------------------------------------------- */}
                    <div className="sm-audit-section">
                        <span className="sm-audit-title">
                            🔍 Audit Konsistensi Semantik: Mengapa Hasil Prompt Ini Konsisten?
                        </span>
                        <div className="sm-audit-grid">
                            {/* Column 1: Locked from Prompt 1 */}
                            <div className="sm-audit-col">
                                <div className="sm-audit-header locked">
                                    <span>🔒 Dipertahankan dari Prompt 1 (Anchor)</span>
                                    <span>{mergedResult.stats.inheritedCount} tags</span>
                                </div>
                                <div className="sm-audit-chips">
                                    {ATTRIBUTE_CATEGORIES.filter((c) =>
                                        [
                                            "character_identity",
                                            "physical_appearance",
                                            "hair",
                                            "eyes",
                                            "outfit",
                                            "accessories",
                                            "art_style",
                                            "lighting",
                                            "quality",
                                        ].includes(c.key)
                                    ).map((cat) => {
                                        const list = mergedResult.inheritedFromMain[cat.key] || [];
                                        if (list.length === 0) return null;
                                        return list.map((a) => (
                                            <span
                                                key={a.id}
                                                className="sm-audit-chip inherited"
                                                title={`Kategori: ${cat.label}`}
                                            >
                                                {a.text}
                                            </span>
                                        ));
                                    })}
                                </div>
                            </div>

                            {/* Column 2: Adapted from Prompt 2 */}
                            <div className="sm-audit-col">
                                <div className="sm-audit-header adapted">
                                    <span>🔄 Diadaptasi dari Prompt 2 (Adegan Ini)</span>
                                    <span>{mergedResult.stats.sceneAddedCount} tags</span>
                                </div>
                                <div className="sm-audit-chips">
                                    {ATTRIBUTE_CATEGORIES.filter((c) =>
                                        ["pose", "action", "expression", "objects", "camera", "background"].includes(c.key)
                                    ).map((cat) => {
                                        const list = mergedResult.appliedFromScene[cat.key] || [];
                                        if (list.length === 0) return null;
                                        return list.map((a) => (
                                            <span
                                                key={a.id}
                                                className="sm-audit-chip added"
                                                title={`Kategori: ${cat.label}`}
                                            >
                                                {a.text}
                                            </span>
                                        ));
                                    })}
                                </div>
                            </div>

                            {/* Column 3: Suppressed Duplicates & Replaced Tags */}
                            <div className="sm-audit-col">
                                <div className="sm-audit-header suppressed">
                                    <span>🛡️ Digantikan / Dieliminasi (Anti-Bentrok)</span>
                                    <span>{mergedResult.stats.suppressedCount} tags</span>
                                </div>
                                {mergedResult.suppressedSceneTags.length === 0 ? (
                                    <span style={{ fontSize: "11px", color: "var(--sm-text-muted)", fontStyle: "italic" }}>
                                        Tidak ada bentrok atau tag duplikat terdeteksi.
                                    </span>
                                ) : (
                                    <div className="sm-suppressed-list">
                                        {mergedResult.suppressedSceneTags.map((s, idx) => (
                                            <div key={idx} className="sm-suppressed-item">
                                                <span className="sm-suppressed-tag">{s.tag}</span>
                                                <span className="sm-suppressed-reason">{s.reason}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Tambah Tag Manual */}
            {showAddTagModal && (
                <div className="sm-modal-backdrop" onClick={() => setShowAddTagModal(false)}>
                    <div className="sm-modal-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="sm-modal-header">
                            <h3 className="sm-modal-title">
                                <span>➕ Tambah Kosa Kata / Tag Baru ke Database</span>
                            </h3>
                            <button
                                type="button"
                                className="sm-modal-close-btn"
                                onClick={() => setShowAddTagModal(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveTagManual}>
                            <div className="sm-modal-body">
                                <div className="sm-form-group">
                                    <label className="sm-form-label">Nama Tag (Danbooru format / Spasi):</label>
                                    <input
                                        type="text"
                                        className="sm-form-input"
                                        value={formTagName}
                                        onChange={(e) => setFormTagName(e.target.value)}
                                        placeholder="cth. defined shadow shapes, retro curl bun, etc."
                                        autoFocus
                                        required
                                    />
                                    <span style={{ fontSize: "10.5px", color: "var(--sm-text-muted)" }}>
                                        Bisa menggunakan spasi atau underscore (otomatis dinormalisasi).
                                    </span>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                    <div className="sm-form-group">
                                        <label className="sm-form-label">Kategori Prompt:</label>
                                        <select
                                            className="sm-form-select"
                                            value={formAttrCat}
                                            onChange={(e) => {
                                                const val = e.target.value as AttributeCategory;
                                                setFormAttrCat(val);
                                                setFormLayer(val);
                                            }}
                                        >
                                            {ATTRIBUTE_CATEGORIES.map((c) => (
                                                <option key={c.key} value={c.key}>
                                                    {c.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="sm-form-group">
                                        <label className="sm-form-label">Kategori Danbooru:</label>
                                        <select
                                            className="sm-form-select"
                                            value={formCategory}
                                            onChange={(e) => setFormCategory(e.target.value as BooruTagCategory)}
                                        >
                                            <option value="general">general (Umum / Efek / Objek)</option>
                                            <option value="character">character (Karakter)</option>
                                            <option value="quality">quality (Kualitas / Resolusi)</option>
                                            <option value="artist">artist (Gaya Artist)</option>
                                            <option value="meta">meta (Teknis)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="sm-form-group">
                                    <label className="sm-form-label">Deskripsi / Catatan Tag (Opsional):</label>
                                    <input
                                        type="text"
                                        className="sm-form-input"
                                        value={formDesc}
                                        onChange={(e) => setFormDesc(e.target.value)}
                                        placeholder="cth. Efek bayangan tegas anime cel shading"
                                    />
                                </div>
                            </div>

                            <div className="sm-modal-footer">
                                <button
                                    type="button"
                                    className="sm-btn-secondary"
                                    onClick={() => setShowAddTagModal(false)}
                                    disabled={isSavingCustomTag}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="sm-btn-primary"
                                    disabled={isSavingCustomTag}
                                >
                                    {isSavingCustomTag ? "Menyimpan ke PostgreSQL..." : "💾 Simpan ke Database"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
