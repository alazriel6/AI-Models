import React, { useState, useMemo, useEffect, useRef } from "react";
import "../../style/StorytellerMerger.css";
import type {
    AttributeCategory,
    CharacterProfile,
    LockConfiguration,
    MainSceneMergeResult,
    MergeMode,
    PromptAttribute,
    StoryScene,
} from "../../types/storyMerger";
import { ATTRIBUTE_CATEGORIES } from "../../types/storyMerger";
import {
    analyzePromptWithAI,
    createEmptyParsedAttributes,
    extractTagWeight,
    parsePromptLocal,
} from "../../services/promptParserService";
import {
    createDefaultLocks,
} from "../../services/semanticComparator";
import {
    compileScenePrompt,
    mergeMainAndScenePrompt,
} from "../../services/smartPromptMerger";
import { DeterministicMergerView } from "./DeterministicMergerView";
import { PromptMatrixStudioLab } from "../prompt-matrix/PromptMatrixStudioLab";

interface StorytellerMergerViewProps {
    onApplyToCanvas: (positive: string, negative: string) => void;
    showToast: (msg: string) => void;
    activeCheckpointName?: string;
}

// Case study: Rio Tsukatsuki classroom scene
export const RIO_MAIN_PROMPT_DEFAULT =
    "masterpiece, best quality, (anime coloring:1.15), 1girl, solo, tsukatsuki rio, red halo, red polka dot headband, black hair, elegant updo bun, blunt bangs, red eyes, blush, dark red halter dress, backless sleeveless mini dress, white buckle belt, black sheer thighhighs, holding blue folder, standing in classroom, wooden desks, window sunlight, soft shadows, anime style, clean lineart, rich cel shading";

export const RIO_SCENE2_PROMPT_DEFAULT =
    "1girl, walking through doorway, classroom door, hand on doorframe, looking at viewer, calm expression";

const USER_EXAMPLE_PROMPT = RIO_MAIN_PROMPT_DEFAULT;

let globalIdCounter = 0;
function createUniqueId(prefix = "scene"): string {
    globalIdCounter++;
    return `${prefix}-${globalIdCounter}`;
}

export const StorytellerMergerView: React.FC<StorytellerMergerViewProps> = ({
    onApplyToCanvas,
    showToast,
    activeCheckpointName,
}) => {
    // 1. Navigation Mode (Defaults to Prompt Matrix & Studio Lab 16 Categories)
    const [viewMode, setViewMode] = useState<"matrix_studio" | "deterministic" | "workflow_b" | "workflow_a" | "comfy_guide">("matrix_studio");

    // 2. Workflow A (Single Source Prompt / Storyboard) State
    const [rawInputPrompt, setRawInputPrompt] = useState<string>("");
    const [rawInputNegative, setRawInputNegative] = useState<string>("");
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [providerNotice, setProviderNotice] = useState<string | null>(null);

    // Master Character Profile & Lock State
    const [activeLocks, setActiveLocks] = useState<LockConfiguration>(createDefaultLocks());
    const [characterProfile, setCharacterProfile] = useState<CharacterProfile>({
        id: "profile-master",
        name: "Tsukatsuki Rio Profile",
        sourcePrompt: RIO_MAIN_PROMPT_DEFAULT,
        sharedAttributes: parsePromptLocal(RIO_MAIN_PROMPT_DEFAULT),
        locks: createDefaultLocks(),
        updatedAt: 0,
    });

    // Storyboard Scenes List
    const [scenes, setScenes] = useState<StoryScene[]>([
        {
            id: "scene-1",
            title: "Scene 1: Di Ruang Kelas (Main Anchor)",
            rawPrompt: RIO_MAIN_PROMPT_DEFAULT,
            parsedAttributes: parsePromptLocal(RIO_MAIN_PROMPT_DEFAULT),
            sceneSpecificAttributes: parsePromptLocal(RIO_MAIN_PROMPT_DEFAULT),
            locks: createDefaultLocks(),
            generatedPositive: RIO_MAIN_PROMPT_DEFAULT,
            generatedNegative: "worst quality, low quality, bad anatomy, bad hands, blurry",
            warnings: [],
            order: 0,
        },
    ]);
    const [activeSceneId, setActiveSceneId] = useState<string>("scene-1");
    const [mergeMode, setMergeMode] = useState<MergeMode>("smart");

    // Quick tag addition state per category: record of input text
    const [quickTagInputs, setQuickTagInputs] = useState<Record<string, string>>({});

    // 3. Workflow B (Prompt 1 Main + Prompt 2 Tambahan Scene Merger) State
    const [comparePrompt1, setComparePrompt1] = useState<string>(RIO_MAIN_PROMPT_DEFAULT);
    const [comparePrompt2, setComparePrompt2] = useState<string>(RIO_SCENE2_PROMPT_DEFAULT);
    const [compareNegative1, setCompareNegative1] = useState<string>("");
    const [compareNegative2, setCompareNegative2] = useState<string>("");

    // Merger Toggles
    const [lockLightingColoring, setLockLightingColoring] = useState<boolean>(true);
    const [keepSameLocation, setKeepSameLocation] = useState<boolean>(true);
    const [strictDedup, setStrictDedup] = useState<boolean>(true);

    // Compiled Merged Result (Lazy initialized with Rio classroom case study)
    const [mergedResult, setMergedResult] = useState<MainSceneMergeResult | null>(() => {
        try {
            return mergeMainAndScenePrompt(
                RIO_MAIN_PROMPT_DEFAULT,
                RIO_SCENE2_PROMPT_DEFAULT,
                "",
                "",
                {
                    locks: { ...createDefaultLocks(), lighting: true },
                    keepSameBackground: true,
                    mergeMode: "smart",
                }
            );
        } catch {
            return null;
        }
    });

    // 4. Copied feedback key
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // Ref to container for scroll management
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Auto-scroll on mount to ensure top content is never cut off
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, []);

    // Active Scene selector
    const activeScene = useMemo(() => {
        return scenes.find((s) => s.id === activeSceneId) || scenes[0];
    }, [scenes, activeSceneId]);

    // Count of locked vs unlocked categories
    const lockStats = useMemo(() => {
        let lockedCount = 0;
        let unlockedCount = 0;
        ATTRIBUTE_CATEGORIES.forEach((cat) => {
            if (activeLocks[cat.key]) lockedCount++;
            else unlockedCount++;
        });
        return { lockedCount, unlockedCount };
    }, [activeLocks]);

    // Handle Copy Helper
    const handleCopy = (text: string, key: string, msg = "✓ Berhasil disalin ke clipboard!") => {
        if (!text.trim()) return;
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        showToast(msg);
        setTimeout(() => setCopiedKey(null), 1800);
    };

    // --------------------------------------------------------------------------
    // WORKFLOW A: INTELLIGENT RAW PROMPT PARSER
    // --------------------------------------------------------------------------
    const handleAnalyzeRawPrompt = async (targetText?: string) => {
        const textToAnalyze = targetText !== undefined ? targetText : rawInputPrompt;
        if (!textToAnalyze.trim()) {
            showToast("Masukkan prompt terlebih dahulu untuk dianalisis!");
            return;
        }

        setIsAnalyzing(true);
        setProviderNotice(null);

        try {
            const { parsed, providerUsed, error } = await analyzePromptWithAI(
                textToAnalyze,
                rawInputNegative
            );

            // Update character profile with parsed shared attributes
            setCharacterProfile((prev) => ({
                ...prev,
                sourcePrompt: textToAnalyze,
                sharedAttributes: parsed,
                updatedAt: Date.now(),
            }));

            // Compile active scene using parsed attributes
            const baseScene: StoryScene = {
                ...activeScene,
                rawPrompt: textToAnalyze,
                parsedAttributes: parsed,
                sceneSpecificAttributes: parsed,
            };

            const compiled = compileScenePrompt(
                { ...characterProfile, sharedAttributes: parsed },
                baseScene,
                mergeMode,
                activeLocks
            );

            const finalizedScene: StoryScene = {
                ...baseScene,
                generatedPositive: compiled.positive,
                generatedNegative: compiled.negative,
                warnings: compiled.warnings,
            };

            setScenes((prev) =>
                prev.map((s) => (s.id === activeSceneId ? finalizedScene : s))
            );

            if (providerUsed === "local_fallback") {
                setProviderNotice(
                    error || "Dianalisis menggunakan Parser Semantik Lokal berkecerdasan tinggi (0 dependensi & instan)."
                );
            } else {
                setProviderNotice(`Dianalisis kontekstual menggunakan AI Provider (${providerUsed.toUpperCase()}).`);
            }

            showToast("✓ Prompt berhasil dianalisis & dikelompokkan ke 16 kategori!");
        } catch (err) {
            console.error("[StorytellerMerger] Parse error:", err);
            showToast("Gagal menganalisis prompt. Silakan periksa koneksi.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Reset fields to empty
    const handleResetFields = () => {
        setRawInputPrompt("");
        setRawInputNegative("");
        const empty = createEmptyParsedAttributes();
        setCharacterProfile((prev) => ({
            ...prev,
            sourcePrompt: "",
            sharedAttributes: empty,
        }));
        setScenes((prev) =>
            prev.map((s) =>
                s.id === activeSceneId
                    ? {
                          ...s,
                          rawPrompt: "",
                          parsedAttributes: empty,
                          sceneSpecificAttributes: empty,
                          generatedPositive: "",
                          generatedNegative: "",
                          warnings: [],
                      }
                    : s
            )
        );
        setProviderNotice(null);
        showToast("Semua field dikembalikan ke keadaan kosong.");
    };

    // Load canonical example prompt
    const handleLoadExample = () => {
        setRawInputPrompt(USER_EXAMPLE_PROMPT);
        handleAnalyzeRawPrompt(USER_EXAMPLE_PROMPT);
    };

    // --------------------------------------------------------------------------
    // LOCK CONTROLS
    // --------------------------------------------------------------------------
    const handleToggleCategoryLock = (cat: AttributeCategory) => {
        const next = !activeLocks[cat];
        const newLocks = { ...activeLocks, [cat]: next };
        setActiveLocks(newLocks);

        // Recompile storyboard scenes with new lock rules
        setScenes((prev) =>
            prev.map((s) => {
                const res = compileScenePrompt(characterProfile, s, mergeMode, newLocks);
                return {
                    ...s,
                    locks: newLocks,
                    generatedPositive: res.positive,
                    generatedNegative: res.negative,
                    warnings: res.warnings,
                };
            })
        );
    };

    const handleLockAll = () => {
        const newLocks = {} as LockConfiguration;
        ATTRIBUTE_CATEGORIES.forEach((cat) => {
            newLocks[cat.key] = true;
        });
        newLocks.negative = true;
        setActiveLocks(newLocks);
        recompileAllScenes(characterProfile, newLocks, mergeMode);
        showToast("🔒 Seluruh kategori dikunci (Locked).");
    };

    const handleUnlockAll = () => {
        const newLocks = {} as LockConfiguration;
        ATTRIBUTE_CATEGORIES.forEach((cat) => {
            newLocks[cat.key] = false;
        });
        newLocks.negative = false;
        setActiveLocks(newLocks);
        recompileAllScenes(characterProfile, newLocks, mergeMode);
        showToast("🔓 Seluruh kategori dibuka (Unlocked).");
    };

    const handleResetLocks = () => {
        const def = createDefaultLocks();
        setActiveLocks(def);
        recompileAllScenes(characterProfile, def, mergeMode);
        showToast("↺ Konfigurasi lock dikembalikan ke default rekomendasi.");
    };

    // --------------------------------------------------------------------------
    // ATTRIBUTE CHIPS: ADD, REMOVE, MOVE
    // --------------------------------------------------------------------------
    const handleRemoveTag = (category: AttributeCategory, attributeId: string) => {
        // Remove from profile
        const updatedProfileAttrs = {
            ...characterProfile.sharedAttributes,
            [category]: characterProfile.sharedAttributes[category].filter(
                (a) => a.id !== attributeId
            ),
        };
        const updatedProfile = {
            ...characterProfile,
            sharedAttributes: updatedProfileAttrs,
        };
        setCharacterProfile(updatedProfile);

        // Remove from active scene
        const updatedSceneAttrs = {
            ...activeScene.sceneSpecificAttributes,
            [category]: activeScene.sceneSpecificAttributes[category].filter(
                (a) => a.id !== attributeId
            ),
        };
        const updatedScene: StoryScene = {
            ...activeScene,
            sceneSpecificAttributes: updatedSceneAttrs,
        };

        const res = compileScenePrompt(updatedProfile, updatedScene, mergeMode, activeLocks);
        updatedScene.generatedPositive = res.positive;
        updatedScene.generatedNegative = res.negative;
        updatedScene.warnings = res.warnings;

        setScenes((prev) =>
            prev.map((s) => (s.id === activeSceneId ? updatedScene : s))
        );
    };

    const handleAddQuickTag = (category: AttributeCategory) => {
        const text = (quickTagInputs[category] || "").trim();
        if (!text) return;

        const { cleanText, weight } = extractTagWeight(text);
        const newAttr: PromptAttribute = {
            id: `attr-user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
            category,
            text,
            normalizedValue: cleanText,
            weight,
            source: "user",
        };

        // Add to active scene
        const updatedSceneAttrs = {
            ...activeScene.sceneSpecificAttributes,
            [category]: [...(activeScene.sceneSpecificAttributes[category] || []), newAttr],
        };
        const updatedScene: StoryScene = {
            ...activeScene,
            sceneSpecificAttributes: updatedSceneAttrs,
        };

        // Also add to profile if category is locked
        let updatedProfile = characterProfile;
        if (activeLocks[category]) {
            updatedProfile = {
                ...characterProfile,
                sharedAttributes: {
                    ...characterProfile.sharedAttributes,
                    [category]: [...(characterProfile.sharedAttributes[category] || []), newAttr],
                },
            };
            setCharacterProfile(updatedProfile);
        }

        const res = compileScenePrompt(updatedProfile, updatedScene, mergeMode, activeLocks);
        const finalizedScene: StoryScene = {
            ...updatedScene,
            generatedPositive: res.positive,
            generatedNegative: res.negative,
            warnings: res.warnings,
        };

        setScenes((prev) =>
            prev.map((s) => (s.id === activeSceneId ? finalizedScene : s))
        );

        // Clear input
        setQuickTagInputs((prev) => ({ ...prev, [category]: "" }));
    };

    // --------------------------------------------------------------------------
    // SCENE TIMELINE MANAGEMENT
    // --------------------------------------------------------------------------
    const handleAddScene = () => {
        const newId = createUniqueId("scene");
        const newOrder = scenes.length;
        const newSceneBase: StoryScene = {
            id: newId,
            title: `Scene ${newOrder + 1}: Adegan Baru`,
            rawPrompt: "",
            parsedAttributes: createEmptyParsedAttributes(),
            sceneSpecificAttributes: createEmptyParsedAttributes(),
            locks: activeLocks,
            generatedPositive: "",
            generatedNegative: "",
            warnings: [],
            order: newOrder,
        };

        const compiled = compileScenePrompt(characterProfile, newSceneBase, mergeMode, activeLocks);
        const finalizedNewScene: StoryScene = {
            ...newSceneBase,
            generatedPositive: compiled.positive,
            generatedNegative: compiled.negative,
            warnings: compiled.warnings,
        };

        setScenes((prev) => [...prev, finalizedNewScene]);
        setActiveSceneId(newId);
        showToast(`Adegan baru (Scene ${newOrder + 1}) berhasil ditambahkan!`);
    };

    const handleDuplicateScene = (sceneToDupe: StoryScene) => {
        const newId = createUniqueId("scene");
        const newScene: StoryScene = {
            ...sceneToDupe,
            id: newId,
            title: `${sceneToDupe.title} (Salinan)`,
            order: scenes.length,
        };
        setScenes((prev) => [...prev, newScene]);
        setActiveSceneId(newId);
        showToast("Adegan berhasil diduplikasi!");
    };

    const handleDeleteScene = (idToDelete: string) => {
        if (scenes.length <= 1) {
            showToast("Minimal harus ada 1 adegan dalam cerita!");
            return;
        }
        const remaining = scenes.filter((s) => s.id !== idToDelete);
        setScenes(remaining);
        if (activeSceneId === idToDelete) {
            setActiveSceneId(remaining[0].id);
        }
        showToast("Adegan dihapus.");
    };

    const handleMoveScene = (index: number, direction: "up" | "down") => {
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= scenes.length) return;

        const next = [...scenes];
        const temp = next[index];
        next[index] = next[targetIndex];
        next[targetIndex] = temp;
        setScenes(next);
    };

    const recompileAllScenes = (
        profile: CharacterProfile,
        locks: LockConfiguration,
        mode: MergeMode
    ) => {
        setScenes((prev) =>
            prev.map((s) => {
                const res = compileScenePrompt(profile, s, mode, locks);
                return {
                    ...s,
                    locks,
                    generatedPositive: res.positive,
                    generatedNegative: res.negative,
                    warnings: res.warnings,
                };
            })
        );
    };

    // --------------------------------------------------------------------------
    // WORKFLOW B: PROMPT 1 (MAIN ANCHOR) + PROMPT 2 (TAMBAHAN SCENE) MERGER
    // --------------------------------------------------------------------------
    const handleExecuteMerge = () => {
        if (!comparePrompt1.trim()) {
            showToast("Masukkan Prompt 1 (Main Prompt / Anchor) terlebih dahulu!");
            return;
        }
        if (!comparePrompt2.trim()) {
            showToast("Masukkan Prompt 2 (Tambahan Scene) terlebih dahulu!");
            return;
        }

        const res = mergeMainAndScenePrompt(
            comparePrompt1,
            comparePrompt2,
            compareNegative1,
            compareNegative2,
            {
                locks: {
                    ...activeLocks,
                    lighting: lockLightingColoring,
                },
                keepSameBackground: keepSameLocation,
                mergeMode,
            }
        );

        setMergedResult(res);
        showToast("✓ Scene berhasil digabungkan! 0 tag double, lighting & style konsisten.");
    };

    const handleLoadRioCaseStudy = () => {
        setComparePrompt1(RIO_MAIN_PROMPT_DEFAULT);
        setComparePrompt2(RIO_SCENE2_PROMPT_DEFAULT);
        const res = mergeMainAndScenePrompt(
            RIO_MAIN_PROMPT_DEFAULT,
            RIO_SCENE2_PROMPT_DEFAULT,
            "",
            "",
            {
                locks: { ...activeLocks, lighting: true },
                keepSameBackground: true,
                mergeMode: "smart",
            }
        );
        setMergedResult(res);
        showToast("✓ Contoh kasus Rio Tsukatsuki (Foto 1 & 2) dimuat & digabungkan!");
    };

    const handleResetMergerInputs = () => {
        setComparePrompt1("");
        setComparePrompt2("");
        setCompareNegative1("");
        setCompareNegative2("");
        setMergedResult(null);
        showToast("Field Prompt 1 & 2 dikosongkan.");
    };

    const handleSendMergedToStoryboard = () => {
        if (!mergedResult) return;

        const parsed1 = parsePromptLocal(comparePrompt1, compareNegative1);
        const newProfile: CharacterProfile = {
            id: createUniqueId("profile"),
            name: "Tsukatsuki Rio (Master Profile)",
            sourcePrompt: comparePrompt1,
            sharedAttributes: parsed1,
            locks: activeLocks,
            updatedAt: Date.now(),
        };
        setCharacterProfile(newProfile);

        const scene1: StoryScene = {
            id: createUniqueId("scene"),
            title: "Scene 1: Di Ruang Kelas (Main Anchor)",
            rawPrompt: comparePrompt1,
            parsedAttributes: parsed1,
            sceneSpecificAttributes: parsed1,
            locks: activeLocks,
            generatedPositive: comparePrompt1,
            generatedNegative: compareNegative1 || "worst quality, low quality, bad anatomy, bad hands, blurry",
            warnings: [],
            order: 0,
        };

        const scene2: StoryScene = {
            id: createUniqueId("scene"),
            title: "Scene 2: Masuk Pintu Kelas (Cerita Lanjutan)",
            rawPrompt: comparePrompt2,
            parsedAttributes: parsed1,
            sceneSpecificAttributes: mergedResult.appliedFromScene,
            locks: activeLocks,
            generatedPositive: mergedResult.positive,
            generatedNegative: mergedResult.negative,
            warnings: mergedResult.warnings,
            order: 1,
        };

        setScenes([scene1, scene2]);
        setActiveSceneId(scene2.id);
        setViewMode("workflow_a");
        showToast("✓ Scene 1 & Scene 2 berhasil ditambahkan ke Storyboard Timeline!");
    };

    // --------------------------------------------------------------------------
    // GLOBAL EXPORT TOOLS
    // --------------------------------------------------------------------------
    const handleExportScenesJSON = () => {
        const data = {
            characterProfile,
            mergeMode,
            locks: activeLocks,
            scenes: scenes.map((s) => ({
                id: s.id,
                title: s.title,
                rawPrompt: s.rawPrompt,
                positivePrompt: s.generatedPositive,
                negativePrompt: s.generatedNegative,
                sceneSpecificAttributes: s.sceneSpecificAttributes,
                warningsCount: s.warnings.length,
            })),
            exportedAt: new Date().toISOString(),
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `story-scenes-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("✓ File JSON adegan berhasil diunduh!");
    };

    const handleExportScenesText = () => {
        let content = `# STORYBOARD SCENE PROMPTS\nTarget Checkpoint: ${activeCheckpointName || "Anime SDXL / Pony"}\nExported: ${new Date().toLocaleString()}\n\n`;
        scenes.forEach((s, idx) => {
            content += `==================================================\n`;
            content += `[SCENE ${idx + 1}] ${s.title}\n`;
            content += `--------------------------------------------------\n`;
            content += `POSITIVE PROMPT:\n${s.generatedPositive}\n\n`;
            content += `NEGATIVE PROMPT:\n${s.generatedNegative}\n\n`;
        });
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `story-prompts-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("✓ File teks seluruh prompt berhasil diunduh!");
    };

    return (
        <div className="storyteller-container" ref={containerRef}>
            {/* 1. TOP CONTROL BAR */}
            <header className="sm-top-bar">
                <div className="sm-top-brand">
                    <div className="sm-brand-icon-box">🎬</div>
                    <div className="sm-brand-meta">
                        <div className="sm-brand-title-row">
                            <h2 className="sm-brand-title">Story &amp; Style Prompt Merger</h2>
                            <span className="sm-badge-neutral">
                                Checkpoint: {activeCheckpointName || "Anime Model"}
                            </span>
                        </div>
                        <p className="sm-brand-desc">
                            Intelligent Character, Outfit, Art Style &amp; Lighting Lock System untuk visual novel / komik multi-scene berkelanjutan.
                        </p>
                    </div>
                </div>

                <nav className="sm-top-nav-tabs" aria-label="Mode Merger">
                    <button
                        type="button"
                        className={`sm-nav-tab-btn ${viewMode === "matrix_studio" ? "active" : ""}`}
                        onClick={() => setViewMode("matrix_studio")}
                    >
                        <span>⚡ Prompt Matrix &amp; Studio Lab (16 Kategori)</span>
                    </button>
                    <button
                        type="button"
                        className={`sm-nav-tab-btn ${viewMode === "deterministic" ? "active" : ""}`}
                        onClick={() => setViewMode("deterministic")}
                    >
                        <span>🔒 8-Category Lock Merger</span>
                    </button>
                    <button
                        type="button"
                        className={`sm-nav-tab-btn ${viewMode === "workflow_b" ? "active" : ""}`}
                        onClick={() => setViewMode("workflow_b")}
                    >
                        <span>⚡ Prompt 1 + 2 Merger (Main &amp; Tambahan)</span>
                    </button>
                    <button
                        type="button"
                        className={`sm-nav-tab-btn ${viewMode === "workflow_a" ? "active" : ""}`}
                        onClick={() => setViewMode("workflow_a")}
                    >
                        <span>🎬 Storyboard &amp; AI Analisis</span>
                    </button>
                    <button
                        type="button"
                        className={`sm-nav-tab-btn ${viewMode === "comfy_guide" ? "active" : ""}`}
                        onClick={() => setViewMode("comfy_guide")}
                    >
                        <span>📋 Panduan ComfyUI</span>
                    </button>
                </nav>
            </header>

            {/* 0. MODE MATRIX STUDIO: PROMPT MATRIX & STUDIO LAB (16 CATEGORIES ENGINE) */}
            {viewMode === "matrix_studio" && (
                <PromptMatrixStudioLab
                    onApplyToCanvas={onApplyToCanvas}
                    showToast={showToast}
                    activeCheckpointName={activeCheckpointName}
                />
            )}

            {/* 1. MODE DETERMINISTIC: LEGACY 8-CATEGORY LOCK MERGER */}
            {viewMode === "deterministic" && (
                <DeterministicMergerView
                    onApplyToCanvas={onApplyToCanvas}
                    showToast={showToast}
                    activeCheckpointName={activeCheckpointName}
                />
            )}

            {/* 2. MODE B: PROMPT 1 (MAIN ANCHOR) + PROMPT 2 (TAMBAHAN SCENE) MERGER WORKFLOW */}
            {viewMode === "workflow_b" && (
                <div className="sm-merger-workflow-b">
                    {/* Top Guide Card */}
                    <div className="sm-merger-guide-card">
                        <div className="sm-merger-guide-header">
                            <div className="sm-merger-badge-row">
                                <span className="sm-badge-pill primary">⚡ Story &amp; Style Merger</span>
                                <span className="sm-badge-pill success">🛡️ Anti-Double Tags (0 Double)</span>
                                <span className="sm-badge-pill warning">🔒 Lighting, Coloring &amp; Style Locked</span>
                            </div>
                            <div className="sm-merger-quick-buttons">
                                <button
                                    type="button"
                                    className="sm-card-action-btn highlight"
                                    onClick={handleLoadRioCaseStudy}
                                    title="Muat contoh kasus Rio Tsukatsuki (Foto 1: Di Kelas bawa folder -> Foto 2: Masuk pintu)"
                                >
                                    Muat Contoh Rio (Foto 1 &amp; 2)
                                </button>
                                <button
                                    type="button"
                                    className="sm-card-action-btn"
                                    onClick={handleResetMergerInputs}
                                    title="Kosongkan prompt"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>

                        <p className="sm-merger-desc">
                            <strong>Prinsip Merger Cerita Berkelanjutan:</strong> Prompt 1 bertindak sebagai <em>Main Prompt / Anchor</em> (Karakter, Pakaian/Baju, Rambut, Mata, Aksesoris, Art Style Anime, serta Lighting &amp; Coloring dikunci tidak berubah). Prompt 2 bertindak sebagai <em>Tambahan Scene</em> (Pose, Aksi Tangan, Cerita Lanjutan, Ekspresi). Seluruh tag ganda/bentrok otomatis dideduplikasi (0 Tag Double).
                        </p>
                    </div>

                    {/* Dual Inputs Grid */}
                    <div className="sm-dual-inputs-grid">
                        {/* Prompt 1 Column (Main Anchor) */}
                        <div className="sm-prompt-input-col main-prompt-col">
                            <div className="sm-prompt-col-header">
                                <div className="sm-col-header-meta">
                                    <span className="sm-col-role-badge main">PROMPT 1 (MAIN PROMPT / ANCHOR)</span>
                                    <span className="sm-col-desc">
                                        🔒 Scene Utama: Karakter, Gaun, Rambut, Halo, Art Style, Lighting &amp; Coloring
                                    </span>
                                </div>
                                <span className="sm-tag-counter">
                                    ~{comparePrompt1.split(",").filter((t) => t.trim()).length} tags
                                </span>
                            </div>

                            <textarea
                                className="sm-textarea-raw main-box"
                                rows={5}
                                value={comparePrompt1}
                                onChange={(e) => setComparePrompt1(e.target.value)}
                                placeholder="Masukkan Prompt 1 (Main Prompt: 1girl, tsukatsuki rio, red halo, red polka dot headband, black hair, updo, red eyes, dark red halter dress, white belt, black sheer thighhighs, classroom, sunlight, anime style...)"
                            />

                            <div className="sm-prompt-notes">
                                <span className="sm-note-dot lock-dot" />
                                <span>Atribut fisik, gaun, aksesoris, lineart cel shading &amp; tata cahaya sunlight DIKUNCI dari sini.</span>
                            </div>
                        </div>

                        {/* Prompt 2 Column (Tambahan Scene) */}
                        <div className="sm-prompt-input-col scene-prompt-col">
                            <div className="sm-prompt-col-header">
                                <div className="sm-col-header-meta">
                                    <span className="sm-col-role-badge addition">PROMPT 2 (TAMBAHAN SCENE)</span>
                                    <span className="sm-col-desc">
                                        🔄 Cerita Lanjutan: Perubahan Pose, Aksi Tangan, Ekspresi Wajah, Objek/Pintu
                                    </span>
                                </div>
                                <span className="sm-tag-counter">
                                    ~{comparePrompt2.split(",").filter((t) => t.trim()).length} tags
                                </span>
                            </div>

                            <textarea
                                className="sm-textarea-raw scene-box"
                                rows={5}
                                value={comparePrompt2}
                                onChange={(e) => setComparePrompt2(e.target.value)}
                                placeholder="Masukkan Prompt 2 (Tambahan: walking through doorway, classroom door, hand on doorframe, looking at viewer, calm expression...)"
                            />

                            <div className="sm-prompt-notes">
                                <span className="sm-note-dot adapt-dot" />
                                <span>Tag duplikat (misal 1girl, outfit lama) otomatis disaring agar tidak double.</span>
                            </div>
                        </div>
                    </div>

                    {/* Toggles & Execution Bar */}
                    <div className="sm-merger-controls-bar">
                        <div className="sm-merger-toggles-wrap">
                            <label className="sm-merger-toggle-label" title="Mengunci tata cahaya (sunlight, window lighting, soft shadows) dan pewarnaan anime dari Prompt 1 agar foto 2 tidak miss atau pucat">
                                <input
                                    type="checkbox"
                                    checked={lockLightingColoring}
                                    onChange={(e) => setLockLightingColoring(e.target.checked)}
                                />
                                <span>🔒 Kunci Lighting &amp; Coloring dari Prompt 1</span>
                            </label>

                            <label className="sm-merger-toggle-label" title="Mempertahankan latar ruang kelas dari Prompt 1 dan menambahkan elemen pintu dari Prompt 2 tanpa dobel">
                                <input
                                    type="checkbox"
                                    checked={keepSameLocation}
                                    onChange={(e) => setKeepSameLocation(e.target.checked)}
                                />
                                <span>🏫 Latar Tempat Sama (Continuous Scene)</span>
                            </label>

                            <label className="sm-merger-toggle-label" title="Membersihkan variasi bobot atau sinonim ganda (1girl, solo, anime style, dress)">
                                <input
                                    type="checkbox"
                                    checked={strictDedup}
                                    onChange={(e) => setStrictDedup(e.target.checked)}
                                />
                                <span>🛡️ Anti-Double Filter (Deduplikasi Ketat)</span>
                            </label>
                        </div>

                        <button
                            type="button"
                            className="sm-card-action-btn primary sm-btn-run-merge"
                            onClick={handleExecuteMerge}
                        >
                            ⚡ Gabungkan Scene (Prompt 1 + 2)
                        </button>
                    </div>

                    {/* Merged Output Section */}
                    {mergedResult && (
                        <div className="sm-merged-output-card">
                            <div className="sm-merged-output-header">
                                <div className="sm-merged-output-title">
                                    <span>✨ Hasil Prompt Adegan Lanjutan (Merged Scene)</span>
                                </div>
                                <div className="sm-merger-badge-row">
                                    <span className="sm-tag-counter">
                                        {mergedResult.stats.totalTags} tags (~{Math.ceil(mergedResult.stats.totalTags * 1.3)} tok)
                                    </span>
                                    <span className="sm-badge-pill success">
                                        ✓ 0 Tag Double (Clean)
                                    </span>
                                    <span className="sm-badge-pill warning">
                                        🔒 Lighting &amp; Art Style Terkunci
                                    </span>
                                </div>
                            </div>

                            <div className="sm-merged-prompt-box">
                                {mergedResult.positive}
                            </div>

                            <div className="sm-merged-actions-row">
                                <button
                                    type="button"
                                    className="sm-btn-copy-output"
                                    onClick={() =>
                                        handleCopy(
                                            mergedResult.positive,
                                            "merged-pos-copy",
                                            "Positive prompt hasil merger berhasil disalin!"
                                        )
                                    }
                                >
                                    📋 {copiedKey === "merged-pos-copy" ? "Tersalin!" : "Salin Prompt"}
                                </button>
                                <button
                                    type="button"
                                    className="sm-btn-apply-canvas"
                                    onClick={() => {
                                        onApplyToCanvas(mergedResult.positive, mergedResult.negative);
                                        showToast("Scene hasil merger diterapkan ke Canvas Studio Lab!");
                                    }}
                                >
                                    ⚡ Terapkan ke Canvas Studio
                                </button>
                                <button
                                    type="button"
                                    className="sm-card-action-btn highlight"
                                    style={{ padding: "6px 14px", fontSize: "11.5px" }}
                                    onClick={handleSendMergedToStoryboard}
                                >
                                    🎬 Jadikan Scene di Storyboard
                                </button>
                            </div>

                            {/* Negative Prompt */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--sm-text-muted)" }}>
                                        Guarded Negative Prompt (Anti-Burn &amp; 2D Anime Protection):
                                    </span>
                                    <button
                                        type="button"
                                        className="sm-card-action-btn"
                                        style={{ fontSize: "10.5px", padding: "2px 8px" }}
                                        onClick={() =>
                                            handleCopy(
                                                mergedResult.negative,
                                                "merged-neg-copy",
                                                "Negative prompt berhasil disalin!"
                                            )
                                        }
                                    >
                                        📋 {copiedKey === "merged-neg-copy" ? "Tersalin!" : "Salin Negatif"}
                                    </button>
                                </div>
                                <div className="sm-merged-prompt-box negative">
                                    {mergedResult.negative}
                                </div>
                            </div>

                            {/* Visual Breakdown Audit Grid */}
                            <div className="sm-audit-section">
                                <span className="sm-audit-title">
                                    🔍 Audit Penggabungan Semantik (Verifikasi Konsistensi)
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
                                            <span>🔄 Diadaptasi dari Prompt 2 (Adegan Lanjutan)</span>
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

                                    {/* Column 3: Suppressed Duplicates & Overrides */}
                                    <div className="sm-audit-col">
                                        <div className="sm-audit-header suppressed">
                                            <span>🛡️ Tag Duplikat/Bentrok yang Dieliminasi</span>
                                            <span>{mergedResult.stats.suppressedCount} tags</span>
                                        </div>
                                        {mergedResult.suppressedSceneTags.length === 0 ? (
                                            <span style={{ fontSize: "11px", color: "var(--sm-text-muted)", fontStyle: "italic" }}>
                                                Tidak ada tag ganda atau bentrok yang terdeteksi.
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
                </div>
            )}

            {/* 3. COMFYUI KSTABILITY GUIDE TAB */}
            {viewMode === "comfy_guide" && (
                <div className="sm-card" style={{ gap: "16px", padding: "20px" }}>
                    <div className="sm-card-header">
                        <span className="sm-card-title">📋 4 Kunci Kestabilan Karakter &amp; Render Multi-Scene di ComfyUI</span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
                        <div className="sm-profile-box" style={{ gap: "8px" }}>
                            <strong style={{ color: "#60a5fa", fontSize: "12.5px" }}>1. Turunkan CFG Scale ke 5.0 – 6.0</strong>
                            <p style={{ margin: 0, fontSize: "11.5px", color: "var(--sm-text-secondary)", lineHeight: 1.5 }}>
                                CFG 7.5 – 8.5 di ComfyUI membuat prompt terbobot mengalami <em>latent blowout</em> (jari dan wajah meleleh di beberapa seed acak). Gunakan CFG 5.0 – 6.0 untuk kestabilan anatomi.
                            </p>
                        </div>

                        <div className="sm-profile-box" style={{ gap: "8px" }}>
                            <strong style={{ color: "#4ade80", fontSize: "12.5px" }}>2. Kunci Seed Saat Menemukan Karakter Bagus</strong>
                            <p style={{ margin: 0, fontSize: "11.5px", color: "var(--sm-text-secondary)", lineHeight: 1.5 }}>
                                Ubah KSampler dari <code>randomize</code> ke <code>fixed</code>. Gunakan node <em>Extra Seed / Variation Seed</em> sebesar <code>0.10 – 0.15</code> untuk variasi pose tanpa merusak wajah karakter.
                            </p>
                        </div>

                        <div className="sm-profile-box" style={{ gap: "8px" }}>
                            <strong style={{ color: "#facc15", fontSize: "12.5px" }}>3. Sampler &amp; Scheduler Rekomendasi</strong>
                            <p style={{ margin: 0, fontSize: "11.5px", color: "var(--sm-text-secondary)", lineHeight: 1.5 }}>
                                Gunakan sampler <code>dpmpp_2m</code> dengan scheduler <code>karras</code> (28–32 steps) atau <code>euler_ancestral</code> untuk garis anime yang bersih.
                            </p>
                        </div>

                        <div className="sm-profile-box" style={{ gap: "8px" }}>
                            <strong style={{ color: "#c084fc", fontSize: "12.5px" }}>4. Tambahkan IP-Adapter FaceID (Opsional)</strong>
                            <p style={{ margin: 0, fontSize: "11.5px", color: "var(--sm-text-secondary)", lineHeight: 1.5 }}>
                                Pasang node IP-Adapter di ComfyUI dengan bobot <code>0.55 – 0.65</code> menggunakan Foto 1 sebagai gambar referensi wajah untuk konsistensi 100% sempurna.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. WORKFLOW A: STORYBOARD & AI ANALISIS (LEGACY) */}
            {viewMode === "workflow_a" && (
                <div className="sm-workspace-grid">
                {/* --------------------------------------------------------------
                    LEFT PANEL: SCENES & PROFILE TIMELINE
                   -------------------------------------------------------------- */}
                <aside className="sm-col-timeline">
                    {/* Character Profile DNA Card */}
                    <div className="sm-card">
                        <div className="sm-card-header">
                            <span className="sm-card-title">👤 Character DNA Profile</span>
                            <span className="sm-locks-badge locked">
                                🔒 {lockStats.lockedCount} Locked
                            </span>
                        </div>

                        <div className="sm-profile-box">
                            <span className="sm-profile-name">
                                {characterProfile.sharedAttributes.character_identity
                                    .map((a) => a.text)
                                    .join(", ") || "Belum ada karakter yang dianalisis"}
                            </span>
                            <div className="sm-profile-stats">
                                <span>{lockStats.lockedCount} Atribut Terkunci</span>
                                <span>·</span>
                                <span>{lockStats.unlockedCount} Dinamis</span>
                            </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--sm-text-secondary)" }}>
                                Mode Penggabungan (Merge Mode):
                            </label>
                            <select
                                style={{
                                    background: "var(--sm-bg-input)",
                                    border: "1px solid var(--sm-border)",
                                    color: "var(--sm-text-primary)",
                                    padding: "6px 8px",
                                    borderRadius: "4px",
                                    fontSize: "11.5px",
                                    outline: "none",
                                }}
                                value={mergeMode}
                                onChange={(e) => {
                                    const m = e.target.value as MergeMode;
                                    setMergeMode(m);
                                    recompileAllScenes(characterProfile, activeLocks, m);
                                }}
                            >
                                <option value="smart">Smart Merge (Rekomendasi - Dedup &amp; Harmonize)</option>
                                <option value="preserve_original">Preserve Original (Pertahankan Kata Asli)</option>
                                <option value="strict_locks">Strict Locks (Kunci Ketat &amp; Tolak Modifikasi)</option>
                                <option value="custom">Custom (Aturan Mandiri)</option>
                            </select>
                        </div>
                    </div>

                    {/* Storyboard Scenes List Card */}
                    <div className="sm-card">
                        <div className="sm-card-header">
                            <span className="sm-card-title">🎬 Daftar Adegan ({scenes.length})</span>
                            <button
                                type="button"
                                className="sm-card-action-btn primary"
                                onClick={handleAddScene}
                                title="Tambah adegan baru"
                            >
                                + Tambah
                            </button>
                        </div>

                        <div className="sm-scene-list">
                            {scenes.map((scene, idx) => {
                                const isActive = scene.id === activeSceneId;
                                return (
                                    <div
                                        key={scene.id}
                                        className={`sm-scene-item ${isActive ? "active" : ""}`}
                                        onClick={() => setActiveSceneId(scene.id)}
                                    >
                                        <div className="sm-scene-meta">
                                            <div className="sm-scene-index-row">
                                                <span className="sm-scene-idx-badge">S{idx + 1}</span>
                                                <span className="sm-scene-title">{scene.title}</span>
                                            </div>
                                            <span className="sm-scene-preview-sub">
                                                {scene.generatedPositive || "Belum ada prompt digenerate"}
                                            </span>
                                        </div>

                                        <div className="sm-scene-actions">
                                            {idx > 0 && (
                                                <button
                                                    type="button"
                                                    className="sm-icon-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleMoveScene(idx, "up");
                                                    }}
                                                    title="Pindah ke atas"
                                                >
                                                    ▲
                                                </button>
                                            )}
                                            {idx < scenes.length - 1 && (
                                                <button
                                                    type="button"
                                                    className="sm-icon-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleMoveScene(idx, "down");
                                                    }}
                                                    title="Pindah ke bawah"
                                                >
                                                    ▼
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className="sm-icon-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDuplicateScene(scene);
                                                }}
                                                title="Duplikasi adegan"
                                            >
                                                ⎘
                                            </button>
                                            {scenes.length > 1 && (
                                                <button
                                                    type="button"
                                                    className="sm-icon-btn danger"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteScene(scene.id);
                                                    }}
                                                    title="Hapus adegan"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </aside>

                {/* --------------------------------------------------------------
                    MIDDLE PANEL: RAW PROMPT PARSER & 16-CATEGORY ATTRIBUTE EDITOR
                   -------------------------------------------------------------- */}
                <main className="sm-col-editor">
                    {/* Raw Prompt Input & Analyzer */}
                    <div className="sm-raw-input-card">
                        <div className="sm-raw-header">
                            <span className="sm-raw-title">
                                📥 Raw Prompt Source (Input Prompt Mentah)
                            </span>
                            <div className="sm-raw-tools">
                                <button
                                    type="button"
                                    className="sm-card-action-btn"
                                    onClick={handleLoadExample}
                                    title="Muat contoh prompt Rio Tsukatsuki"
                                >
                                    Muat Contoh Rio
                                </button>
                                <button
                                    type="button"
                                    className="sm-card-action-btn"
                                    onClick={handleResetFields}
                                    title="Kosongkan seluruh field"
                                >
                                    Reset Kosong
                                </button>
                            </div>
                        </div>

                        <textarea
                            className="sm-textarea-raw"
                            rows={3}
                            value={rawInputPrompt}
                            onChange={(e) => setRawInputPrompt(e.target.value)}
                            placeholder="Ketik atau tempel prompt mentah di sini (semua field di bawah dimulai kosong lalu otomatis terisi setelah dianalisis)..."
                        />

                        <div className="sm-analyze-bar">
                            <div className="sm-provider-indicator">
                                <span
                                    className={`sm-indicator-dot ${providerNotice?.includes("Lokal") ? "fallback" : ""}`}
                                />
                                <span>{providerNotice || "AI Provider siap menganalisis konteks semantik"}</span>
                            </div>

                            <button
                                type="button"
                                className="sm-card-action-btn primary"
                                style={{ padding: "8px 18px", fontSize: "12.5px" }}
                                onClick={() => handleAnalyzeRawPrompt()}
                                disabled={isAnalyzing}
                            >
                                {isAnalyzing ? "Sedang Menganalisis..." : "⚡ Analyze Prompt (Urai 16 Kategori)"}
                            </button>
                        </div>
                    </div>

                    {/* Master Lock Controls Strip */}
                    <div className="sm-locks-strip">
                        <div className="sm-locks-summary">
                            <span>Status Kunci Atribut:</span>
                            <span className="sm-locks-badge locked">
                                🔒 {lockStats.lockedCount} Terkunci (Locked)
                            </span>
                            <span className="sm-locks-badge unlocked">
                                🔓 {lockStats.unlockedCount} Bebas Berubah (Unlocked)
                            </span>
                        </div>

                        <div className="sm-locks-actions">
                            <button
                                type="button"
                                className="sm-card-action-btn"
                                onClick={handleLockAll}
                                title="Kunci seluruh atribut agar sama di semua adegan"
                            >
                                🔒 Lock All
                            </button>
                            <button
                                type="button"
                                className="sm-card-action-btn"
                                onClick={handleUnlockAll}
                                title="Buka seluruh atribut agar bebas berubah"
                            >
                                🔓 Unlock All
                            </button>
                            <button
                                type="button"
                                className="sm-card-action-btn"
                                onClick={handleResetLocks}
                                title="Kembalikan konfigurasi lock ke standar rekomendasi"
                            >
                                ↺ Reset
                            </button>
                        </div>
                    </div>

                    {/* 16-Category Breakdown Grid */}
                    <div className="sm-categories-grid">
                        {ATTRIBUTE_CATEGORIES.map((cat) => {
                            const isLocked = activeLocks[cat.key];
                            // Attributes come from active scene or profile
                            const currentAttrs =
                                activeScene.sceneSpecificAttributes[cat.key]?.length > 0
                                    ? activeScene.sceneSpecificAttributes[cat.key]
                                    : characterProfile.sharedAttributes[cat.key] || [];

                            return (
                                <div
                                    key={cat.key}
                                    className={`sm-category-card ${isLocked ? "locked" : "unlocked"}`}
                                >
                                    <div className="sm-cat-header">
                                        <div className="sm-cat-title-row">
                                            <span className="sm-cat-title">{cat.label}</span>
                                            <span className="sm-cat-count">
                                                ({currentAttrs.length})
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            className={`sm-lock-toggle-btn ${isLocked ? "locked" : "unlocked"}`}
                                            onClick={() => handleToggleCategoryLock(cat.key)}
                                            title={
                                                isLocked
                                                    ? "Klik untuk membuka (Unlocked: boleh berubah per adegan)"
                                                    : "Klik untuk mengunci (Locked: konsisten di seluruh adegan)"
                                            }
                                        >
                                            {isLocked ? "🔒 Locked" : "🔓 Unlocked"}
                                        </button>
                                    </div>

                                    {/* Chips List */}
                                    <div className="sm-chips-wrap">
                                        {currentAttrs.length === 0 ? (
                                            <span className="sm-empty-hint">Field kosong</span>
                                        ) : (
                                            currentAttrs.map((attr) => (
                                                <div key={attr.id} className="sm-token-chip">
                                                    <span>{attr.text}</span>
                                                    {attr.weight && attr.weight !== 1.0 && (
                                                        <span className="sm-chip-weight">
                                                            {attr.weight}x
                                                        </span>
                                                    )}
                                                    {attr.isAmbiguous && (
                                                        <span
                                                            style={{ color: "#facc15", fontSize: "10px" }}
                                                            title="Tag ambigu - bisa dipindahkan jika perlu"
                                                        >
                                                            (?)
                                                        </span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        className="sm-chip-del-btn"
                                                        onClick={() => handleRemoveTag(cat.key, attr.id)}
                                                        title="Hapus tag ini"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Quick Add Tag Input */}
                                    <div className="sm-quick-add-row">
                                        <input
                                            type="text"
                                            className="sm-input-tag-quick"
                                            placeholder={`+ Tambah ke ${cat.label}...`}
                                            value={quickTagInputs[cat.key] || ""}
                                            onChange={(e) =>
                                                setQuickTagInputs({
                                                    ...quickTagInputs,
                                                    [cat.key]: e.target.value,
                                                })
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    handleAddQuickTag(cat.key);
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            className="sm-card-action-btn"
                                            onClick={() => handleAddQuickTag(cat.key)}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </main>

                {/* --------------------------------------------------------------
                    RIGHT PANEL: GENERATED PROMPT OUTPUT & VALIDATION
                   -------------------------------------------------------------- */}
                <aside className="sm-col-output">
                    {/* Validation Warnings Card */}
                    {activeScene.warnings.length > 0 && (
                        <div className="sm-warnings-card">
                            <span className="sm-warning-title">
                                ⚠️ Deteksi Konflik &amp; Peringatan ({activeScene.warnings.length})
                            </span>
                            {activeScene.warnings.map((w) => (
                                <div key={w.id} className="sm-warning-item">
                                    {w.message}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Final Positive Prompt Card */}
                    <div className="sm-output-card">
                        <div className="sm-output-header">
                            <div className="sm-output-badge-row">
                                <span className="sm-output-label">Final Positive Prompt</span>
                                <span className="sm-output-tokens">
                                    ~{activeScene.generatedPositive.split(",").filter(Boolean).length} tags
                                </span>
                            </div>
                        </div>

                        <div className="sm-output-box">
                            {activeScene.generatedPositive || "Belum ada prompt dihasilkan. Klik 'Analyze Prompt' terlebih dahulu."}
                        </div>

                        <div className="sm-output-actions">
                            <button
                                type="button"
                                className="sm-btn-copy-output"
                                onClick={() =>
                                    handleCopy(
                                        activeScene.generatedPositive,
                                        "pos-copy",
                                        "Positive prompt berhasil disalin untuk ComfyUI!"
                                    )
                                }
                            >
                                📋 {copiedKey === "pos-copy" ? "Tersalin!" : "Salin Prompt"}
                            </button>
                            <button
                                type="button"
                                className="sm-btn-apply-canvas"
                                onClick={() => {
                                    onApplyToCanvas(
                                        activeScene.generatedPositive,
                                        activeScene.generatedNegative
                                    );
                                    showToast(`Adegan "${activeScene.title}" diterapkan ke Canvas Studio!`);
                                }}
                            >
                                ⚡ Terapkan
                            </button>
                        </div>
                    </div>

                    {/* Final Negative Prompt Card */}
                    <div className="sm-output-card">
                        <div className="sm-output-header">
                            <div className="sm-output-badge-row">
                                <span className="sm-output-label">Final Negative Prompt</span>
                                <span className="sm-output-tokens">Anti-Burn Protected</span>
                            </div>
                        </div>

                        <div className="sm-output-box negative">
                            {activeScene.generatedNegative || "worst quality, low quality, bad anatomy, bad hands, blurry"}
                        </div>

                        <div className="sm-output-actions">
                            <button
                                type="button"
                                className="sm-btn-copy-output"
                                onClick={() =>
                                    handleCopy(
                                        activeScene.generatedNegative,
                                        "neg-copy",
                                        "Negative prompt berhasil disalin untuk ComfyUI!"
                                    )
                                }
                            >
                                📋 {copiedKey === "neg-copy" ? "Tersalin!" : "Salin Negatif"}
                            </button>
                        </div>
                    </div>

                    {/* Global Export Options */}
                    <div className="sm-global-export-card">
                        <span className="sm-card-title">📦 Ekspor &amp; Manajemen Storyboard</span>
                        <div className="sm-export-grid">
                            <button
                                type="button"
                                className="sm-btn-export-tile"
                                onClick={handleExportScenesJSON}
                            >
                                📥 Ekspor JSON
                            </button>
                            <button
                                type="button"
                                className="sm-btn-export-tile"
                                onClick={handleExportScenesText}
                            >
                                📄 Ekspor Text (.txt)
                            </button>
                            <button
                                type="button"
                                className="sm-btn-export-tile"
                                onClick={() => {
                                    recompileAllScenes(characterProfile, activeLocks, mergeMode);
                                    showToast("✓ Semua adegan berhasil di-regenerate!");
                                }}
                            >
                                🔄 Regenerate Semua
                            </button>
                            <button
                                type="button"
                                className="sm-btn-export-tile"
                                onClick={() => {
                                    handleCopy(
                                        JSON.stringify(characterProfile, null, 2),
                                        "profile-json",
                                        "Profil karakter disalin ke clipboard!"
                                    );
                                }}
                            >
                                👤 Salin Profil
                            </button>
                        </div>
                    </div>
                </aside>
            </div>
            )}
        </div>
    );
};
