import React, { useState, useMemo, useRef } from "react";
import type {
    DeterministicCategory,
    DeterministicMergeResult,
    MainStoryPreset,
} from "../../types/deterministicMerger";
import { DETERMINISTIC_CATEGORIES } from "../../types/deterministicMerger";
import {
    RIO_BASE_PROMPT_TEST_CASE,
    RIO_DONOR_PROMPT_TEST_CASE,
    mergePromptsDeterministic,
} from "../../services/deterministicPromptMerger";
import {
    addChildScene,
    createStoryPreset,
    deleteChildScene,
    deleteStoryPreset,
    duplicateStoryPreset,
    exportPresetsJson,
    importPresetsJson,
    loadStoryPresets,
    resetToDefaultPresets,
    updateStoryPreset,
} from "../../services/storyPresetStorage";

interface DeterministicMergerViewProps {
    onApplyToCanvas?: (positive: string, negative: string) => void;
    showToast?: (msg: string) => void;
    activeCheckpointName?: string;
}

export const DeterministicMergerView: React.FC<DeterministicMergerViewProps> = ({
    onApplyToCanvas,
    showToast = (msg) => alert(msg),
    activeCheckpointName,
}) => {
    // 1. Stories and presets state
    const [presets, setPresets] = useState<MainStoryPreset[]>(() => loadStoryPresets());
    const [activePresetId, setActivePresetId] = useState<string>(() => {
        const initial = loadStoryPresets();
        return initial[0]?.id || "preset-rio-classroom";
    });

    const activePreset = useMemo(() => {
        return presets.find((p) => p.id === activePresetId) || presets[0];
    }, [presets, activePresetId]);

    // Active Child Scene selector
    const [activeSceneId, setActiveSceneId] = useState<string>(() => {
        const initial = loadStoryPresets();
        return initial[0]?.childScenes[0]?.id || "scene-rio-1";
    });

    const activeScene = useMemo(() => {
        if (!activePreset) return null;
        return activePreset.childScenes.find((s) => s.id === activeSceneId) || activePreset.childScenes[0] || null;
    }, [activePreset, activeSceneId]);

    // 2. Base & Donor Prompts State
    const [basePrompt, setBasePrompt] = useState<string>(() => {
        const initial = loadStoryPresets();
        return initial[0]?.basePrompt || RIO_BASE_PROMPT_TEST_CASE;
    });

    const [donorPrompt, setDonorPrompt] = useState<string>(() => {
        const initial = loadStoryPresets();
        return initial[0]?.childScenes[0]?.donorPrompt || RIO_DONOR_PROMPT_TEST_CASE;
    });

    // 3. Configuration toggles
    const [clampWeights, setClampWeights] = useState<boolean>(true);
    const [maxActionWeight, setMaxActionWeight] = useState<number>(1.25);
    const [overrides, setOverrides] = useState<Record<string, DeterministicCategory>>({});

    // Active Tab in the Workstation: "merger" | "storyboard" | "presets"
    const [activeViewTab, setActiveViewTab] = useState<"merger" | "storyboard" | "presets">("merger");

    // Modal state for adding/editing presets
    const [isStoryModalOpen, setIsStoryModalOpen] = useState<boolean>(false);
    const [storyModalMode, setStoryModalMode] = useState<"create" | "edit">("create");
    const [modalStoryTitle, setModalStoryTitle] = useState<string>("");
    const [modalStoryDesc, setModalStoryDesc] = useState<string>("");
    const [modalStoryBasePrompt, setModalStoryBasePrompt] = useState<string>("");
    const [modalStoryBaseNegative, setModalStoryBaseNegative] = useState<string>("");

    // Modal state for adding child scenes
    const [isSceneModalOpen, setIsSceneModalOpen] = useState<boolean>(false);
    const [modalSceneTitle, setModalSceneTitle] = useState<string>("");
    const [modalSceneDonorPrompt, setModalSceneDonorPrompt] = useState<string>("");
    const [modalSceneNotes, setModalSceneNotes] = useState<string>("");

    // Category reassignment popover target
    const [editingToken, setEditingToken] = useState<{ id: string; cleanText: string; currentCat: DeterministicCategory } | null>(null);

    // Feedback copy state
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // Hidden file input ref for JSON import
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // 4. Run Deterministic Merge
    const mergeResult: DeterministicMergeResult = useMemo(() => {
        return mergePromptsDeterministic(basePrompt, donorPrompt, {
            clampWeights,
            maxActionWeight,
            overrides,
        });
    }, [basePrompt, donorPrompt, clampWeights, maxActionWeight, overrides]);

    // Handle Copy Helper
    const copyToClipboard = (text: string, key: string, label: string = "Tersalin ke clipboard!") => {
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        showToast(label);
        setTimeout(() => {
            setCopiedKey((prev) => (prev === key ? null : prev));
        }, 2200);
    };

    // 1-Click Load Rio Test Case
    const handleLoadRioTestCase = () => {
        setBasePrompt(RIO_BASE_PROMPT_TEST_CASE);
        setDonorPrompt(RIO_DONOR_PROMPT_TEST_CASE);
        setClampWeights(true);
        setMaxActionWeight(1.25);
        setOverrides({});
        showToast("Rio Classroom Test Case dimuat!");
    };

    // When active preset changes, update basePrompt
    const handleSelectPreset = (presetId: string) => {
        setActivePresetId(presetId);
        const p = presets.find((item) => item.id === presetId);
        if (p) {
            setBasePrompt(p.basePrompt);
            if (p.childScenes.length > 0) {
                setActiveSceneId(p.childScenes[0].id);
                setDonorPrompt(p.childScenes[0].donorPrompt);
            }
        }
    };

    // When active child scene changes, update donorPrompt
    const handleSelectScene = (sceneId: string) => {
        setActiveSceneId(sceneId);
        if (!activePreset) return;
        const s = activePreset.childScenes.find((item) => item.id === sceneId);
        if (s) {
            setDonorPrompt(s.donorPrompt);
        }
    };

    // Handle token category override
    const handleOverrideCategory = (cleanText: string, newCategory: DeterministicCategory) => {
        setOverrides((prev) => ({
            ...prev,
            [cleanText.toLowerCase().trim()]: newCategory,
        }));
        setEditingToken(null);
        showToast(`Kategori "${cleanText}" diubah menjadi ${DETERMINISTIC_CATEGORIES[newCategory].label}`);
    };

    // Reset token overrides
    const handleResetOverrides = () => {
        setOverrides({});
        showToast("Semua manual tag overrides di-reset!");
    };

    // Copy All Storyboard Prompts
    const handleCopyAllStoryboard = () => {
        if (!activePreset || activePreset.childScenes.length === 0) {
            showToast("Tidak ada scene untuk disalin!");
            return;
        }

        const lines: string[] = [];
        activePreset.childScenes.forEach((scene) => {
            const res = mergePromptsDeterministic(activePreset.basePrompt, scene.donorPrompt, {
                clampWeights,
                maxActionWeight,
            });
            lines.push(`### Scene ${scene.sceneNumber}: ${scene.title}`);
            if (scene.notes) lines.push(`// Notes: ${scene.notes}`);
            lines.push(`Positive: ${res.finalMergedPrompt}`);
            const neg = res.suggestedNegativePrompt
                ? `${activePreset.baseNegative}, ${res.suggestedNegativePrompt}`
                : activePreset.baseNegative;
            lines.push(`Negative: ${neg}\n`);
        });

        copyToClipboard(lines.join("\n"), "all-storyboard", "Semua prompt storyboard berhasil disalin!");
    };

    // Export Storyboard JSON
    const handleExportJson = () => {
        const jsonStr = exportPresetsJson();
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `models-guide-story-presets-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("File presets JSON berhasil diekspor!");
    };

    // Import Storyboard JSON
    const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            const res = importPresetsJson(content);
            if (res.success) {
                const updated = loadStoryPresets();
                setPresets(updated);
                if (updated.length > 0) {
                    setActivePresetId(updated[0].id);
                    setBasePrompt(updated[0].basePrompt);
                }
                showToast(res.message);
            } else {
                alert(res.message);
            }
        };
        reader.readAsText(file);
        e.target.value = "";
    };

    // Reset to defaults
    const handleResetDefaults = () => {
        if (confirm("Reset semua preset ke bawaan pabrik (Rio Classroom & Rio Corridor)? Preset buatan pengguna akan dihapus.")) {
            const defs = resetToDefaultPresets();
            setPresets(defs);
            setActivePresetId(defs[0].id);
            setBasePrompt(defs[0].basePrompt);
            setActiveSceneId(defs[0].childScenes[0].id);
            setDonorPrompt(defs[0].childScenes[0].donorPrompt);
            showToast("Presets berhasil di-reset ke default pabrik!");
        }
    };

    // Open create story modal
    const handleOpenCreateStory = () => {
        setStoryModalMode("create");
        setModalStoryTitle("");
        setModalStoryDesc("");
        setModalStoryBasePrompt(basePrompt);
        setModalStoryBaseNegative("worst quality, low quality, bad anatomy, bad hands, blurry");
        setIsStoryModalOpen(true);
    };

    // Open edit story modal
    const handleOpenEditStory = () => {
        if (!activePreset) return;
        setStoryModalMode("edit");
        setModalStoryTitle(activePreset.title);
        setModalStoryDesc(activePreset.description);
        setModalStoryBasePrompt(activePreset.basePrompt);
        setModalStoryBaseNegative(activePreset.baseNegative);
        setIsStoryModalOpen(true);
    };

    // Save story modal
    const handleSaveStoryModal = () => {
        if (!modalStoryTitle.trim()) {
            alert("Judul story preset tidak boleh kosong!");
            return;
        }
        if (!modalStoryBasePrompt.trim()) {
            alert("Base prompt tidak boleh kosong!");
            return;
        }

        if (storyModalMode === "create") {
            const created = createStoryPreset(
                modalStoryTitle,
                modalStoryDesc,
                modalStoryBasePrompt,
                modalStoryBaseNegative
            );
            const updated = loadStoryPresets();
            setPresets(updated);
            setActivePresetId(created.id);
            setBasePrompt(created.basePrompt);
            showToast(`Preset "${created.title}" berhasil dibuat!`);
        } else {
            const updated = updateStoryPreset(activePresetId, {
                title: modalStoryTitle,
                description: modalStoryDesc,
                basePrompt: modalStoryBasePrompt,
                baseNegative: modalStoryBaseNegative,
            });
            setPresets(updated);
            setBasePrompt(modalStoryBasePrompt);
            showToast(`Preset "${modalStoryTitle}" berhasil diperbarui!`);
        }
        setIsStoryModalOpen(false);
    };

    // Save Child Scene Modal
    const handleSaveSceneModal = () => {
        if (!modalSceneTitle.trim() || !modalSceneDonorPrompt.trim()) {
            alert("Judul scene dan donor prompt wajib diisi!");
            return;
        }

        const updated = addChildScene(activePresetId, modalSceneTitle, modalSceneDonorPrompt, modalSceneNotes);
        setPresets(updated);
        const p = updated.find((item) => item.id === activePresetId);
        if (p && p.childScenes.length > 0) {
            const last = p.childScenes[p.childScenes.length - 1];
            setActiveSceneId(last.id);
            setDonorPrompt(last.donorPrompt);
        }
        setIsSceneModalOpen(false);
        showToast(`Scene "${modalSceneTitle}" berhasil ditambahkan!`);
    };

    // Delete Scene
    const handleDeleteScene = (sceneId: string, title: string) => {
        if (confirm(`Hapus ${title}?`)) {
            const updated = deleteChildScene(activePresetId, sceneId);
            setPresets(updated);
            const p = updated.find((item) => item.id === activePresetId);
            if (p && p.childScenes.length > 0) {
                setActiveSceneId(p.childScenes[0].id);
                setDonorPrompt(p.childScenes[0].donorPrompt);
            }
            showToast("Scene berhasil dihapus!");
        }
    };

    return (
        <div className="deterministic-merger-root" role="region" aria-label="Prompt Style & Character Lock Merger">
            {/* WORKSTATION HEADER */}
            <div className="dm-header">
                <div className="dm-header-left">
                    <div className="dm-icon-badge">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                    </div>
                    <div>
                        <div className="dm-header-title-row">
                            <h2 className="dm-title">Prompt Style &amp; Character Lock Merger</h2>
                            <span className="dm-badge-deterministic">
                                DETERMINISTIC &bull; {activeCheckpointName || "NO AI HALLUCINATION"}
                            </span>
                        </div>
                        <p className="dm-subtitle">
                            Kunci Style, Karakter, Anatomi, Rambut &amp; Outfit Base secara presisi; suntikkan Pose, Objek &amp; Latar dari Donor tanpa kebocoran tag usang.
                        </p>
                    </div>
                </div>

                <div className="dm-header-actions">
                    <button
                        type="button"
                        className="dm-btn dm-btn-secondary"
                        onClick={handleLoadRioTestCase}
                        title="Muat contoh uji regresi standar: Rio Tsukatsuki di Ruang Kelas"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        <span>Load Rio Test Case</span>
                    </button>

                    <button
                        type="button"
                        className="dm-btn dm-btn-secondary"
                        onClick={handleExportJson}
                        title="Ekspor seluruh preset storyboard ke format JSON"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        <span>Export JSON</span>
                    </button>

                    <button
                        type="button"
                        className="dm-btn dm-btn-secondary"
                        onClick={() => fileInputRef.current?.click()}
                        title="Impor preset dari file JSON"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span>Import JSON</span>
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        accept=".json,application/json"
                        onChange={handleImportJson}
                    />
                </div>
            </div>

            {/* LIVE VERIFICATION STATUS BANNER */}
            <div className={`dm-verification-banner ${mergeResult.isExactMatchWithRegression ? "pass" : "info"}`}>
                <div className="dm-verification-status">
                    {mergeResult.isExactMatchWithRegression ? (
                        <>
                            <span className="dm-status-icon pass">&#10003;</span>
                            <span className="dm-status-text">
                                <strong>PASS: Exact 100% Match with Expected Output</strong> &bull; Karakter, Anatomi, Rambut &amp; Outfit terkunci tanpa ada tag buku atau parens leaking.
                            </span>
                        </>
                    ) : (
                        <>
                            <span className="dm-status-icon info">&#9432;</span>
                            <span className="dm-status-text">
                                <strong>Deterministic Merger Aktif:</strong> Reconstructed into 6 ordered CLIP slots with zero obsolete action bleed.
                                {mergeResult.mismatchIndex !== undefined && (
                                    <span className="dm-mismatch-note">
                                        (Custom input aktif &bull; Berbeda dari baseline regresi pada index {mergeResult.mismatchIndex})
                                    </span>
                                )}
                            </span>
                        </>
                    )}
                </div>

                <div className="dm-verification-quick-actions">
                    <button
                        type="button"
                        className="dm-btn dm-btn-xs"
                        onClick={() => copyToClipboard(mergeResult.finalMergedPrompt, "merged-quick", "Hasil merge tersalin!")}
                    >
                        {copiedKey === "merged-quick" ? "Tersalin!" : "Salin Merged Prompt"}
                    </button>

                    {onApplyToCanvas && (
                        <button
                            type="button"
                            className="dm-btn dm-btn-xs dm-btn-accent"
                            onClick={() => {
                                onApplyToCanvas(mergeResult.finalMergedPrompt, activePreset?.baseNegative || "");
                                showToast("Prompt berhasil dipasang ke Canvas Studio!");
                            }}
                        >
                            Terapkan ke Canvas
                        </button>
                    )}
                </div>
            </div>

            {/* WORKSTATION VIEW TABS */}
            <div className="dm-view-nav" role="tablist">
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeViewTab === "merger"}
                    className={`dm-view-tab-btn ${activeViewTab === "merger" ? "active" : ""}`}
                    onClick={() => setActiveViewTab("merger")}
                >
                    <span className="dm-tab-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="16 3 21 3 21 8" />
                            <line x1="4" y1="20" x2="21" y2="3" />
                            <polyline points="21 16 21 21 16 21" />
                            <line x1="15" y1="15" x2="21" y2="21" />
                            <line x1="4" y1="4" x2="9" y2="9" />
                        </svg>
                    </span>
                    <span>Deterministic Lock Merger</span>
                </button>

                <button
                    type="button"
                    role="tab"
                    aria-selected={activeViewTab === "storyboard"}
                    className={`dm-view-tab-btn ${activeViewTab === "storyboard" ? "active" : ""}`}
                    onClick={() => setActiveViewTab("storyboard")}
                >
                    <span className="dm-tab-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                            <line x1="7" y1="2" x2="7" y2="22" />
                            <line x1="17" y1="2" x2="17" y2="22" />
                            <line x1="2" y1="12" x2="22" y2="12" />
                            <line x1="2" y1="7" x2="7" y2="7" />
                            <line x1="2" y1="17" x2="7" y2="17" />
                            <line x1="17" y1="17" x2="22" y2="17" />
                            <line x1="17" y1="7" x2="22" y2="7" />
                        </svg>
                    </span>
                    <span>Storyboard Scene Manager ({activePreset?.childScenes.length || 0} Scenes)</span>
                </button>

                <button
                    type="button"
                    role="tab"
                    aria-selected={activeViewTab === "presets"}
                    className={`dm-view-tab-btn ${activeViewTab === "presets" ? "active" : ""}`}
                    onClick={() => setActiveViewTab("presets")}
                >
                    <span className="dm-tab-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                        </svg>
                    </span>
                    <span>Main &amp; Child Presets ({presets.length} Stories)</span>
                </button>
            </div>

            {/* PRESET & SCENE SELECTOR BAR */}
            <div className="dm-preset-selector-bar">
                <div className="dm-selector-group">
                    <label htmlFor="story-preset-select" className="dm-selector-label">Main Story Preset:</label>
                    <select
                        id="story-preset-select"
                        className="dm-select"
                        value={activePresetId}
                        onChange={(e) => handleSelectPreset(e.target.value)}
                    >
                        {presets.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.title} {p.isBuiltIn ? "(Built-in)" : "(Custom)"}
                            </option>
                        ))}
                    </select>

                    <button
                        type="button"
                        className="dm-btn dm-btn-xs"
                        onClick={handleOpenEditStory}
                        title="Edit detail Main Story Preset aktif"
                    >
                        Edit Story
                    </button>
                    <button
                        type="button"
                        className="dm-btn dm-btn-xs"
                        onClick={handleOpenCreateStory}
                        title="Buat Main Story Preset baru"
                    >
                        + New Story
                    </button>
                </div>

                {activePreset && activePreset.childScenes.length > 0 && (
                    <div className="dm-scenes-pills-row">
                        <span className="dm-selector-label">Scene:</span>
                        <div className="dm-pills-list">
                            {activePreset.childScenes.map((scene) => (
                                <button
                                    key={scene.id}
                                    type="button"
                                    className={`dm-scene-pill ${scene.id === activeSceneId ? "active" : ""}`}
                                    onClick={() => handleSelectScene(scene.id)}
                                >
                                    <span>#{scene.sceneNumber}</span>
                                    <span className="dm-scene-pill-title">{scene.title.replace(/^Scene \d+:\s*/i, "")}</span>
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            className="dm-btn dm-btn-xs dm-btn-secondary"
                            onClick={() => {
                                setModalSceneTitle(`Scene ${activePreset.childScenes.length + 1}: `);
                                setModalSceneDonorPrompt("");
                                setModalSceneNotes("");
                                setIsSceneModalOpen(true);
                            }}
                            title="Tambah child scene baru ke story ini"
                        >
                            + Add Scene
                        </button>
                    </div>
                )}
            </div>

            {/* TAB 1: DETERMINISTIC MERGER WORKBENCH */}
            {activeViewTab === "merger" && (
                <div className="dm-merger-layout">
                    {/* TOP PROMPTS DUAL INPUT ROW */}
                    <div className="dm-dual-input-grid">
                        {/* BASE PROMPT CARD */}
                        <div className="dm-panel dm-base-panel">
                            <div className="dm-panel-header">
                                <div className="dm-panel-title-wrap">
                                    <span className="dm-panel-tag lock">BASE PROMPT</span>
                                    <h3 className="dm-panel-title">Master Character &amp; Style Lock</h3>
                                </div>
                                <div className="dm-panel-stats">
                                    <span>{mergeResult.baseTokens.length} tags</span>
                                    <button
                                        type="button"
                                        className="dm-btn-text"
                                        onClick={() => setBasePrompt(RIO_BASE_PROMPT_TEST_CASE)}
                                        title="Kembalikan ke baseline Rio"
                                    >
                                        Reset Rio Base
                                    </button>
                                </div>
                            </div>
                            <textarea
                                className="dm-prompt-textarea"
                                value={basePrompt}
                                onChange={(e) => setBasePrompt(e.target.value)}
                                rows={6}
                                placeholder="Masukkan Master Base Prompt (Quality, Character, Hair, Outfit, Camera, Lighting)..."
                                spellCheck={false}
                            />
                            <div className="dm-panel-footer">
                                <span className="dm-hint">
                                    Locks: Quality, 1girl, tsukatsuki rio, red eyes, Hair &amp; Outfit @1.10, Camera &amp; Lighting.
                                </span>
                            </div>
                        </div>

                        {/* DONOR PROMPT CARD */}
                        <div className="dm-panel dm-donor-panel">
                            <div className="dm-panel-header">
                                <div className="dm-panel-title-wrap">
                                    <span className="dm-panel-tag inject">DONOR PROMPT</span>
                                    <h3 className="dm-panel-title">
                                        Scene Action &amp; Prop Injector {activeScene ? `(${activeScene.title})` : ""}
                                    </h3>
                                </div>
                                <div className="dm-panel-stats">
                                    <span>{mergeResult.donorTokens.length} tags</span>
                                    <button
                                        type="button"
                                        className="dm-btn-text"
                                        onClick={() => setDonorPrompt(RIO_DONOR_PROMPT_TEST_CASE)}
                                        title="Muat Scene 1 Donor"
                                    >
                                        Load Scene 1 Donor
                                    </button>
                                </div>
                            </div>
                            <textarea
                                className="dm-prompt-textarea"
                                value={donorPrompt}
                                onChange={(e) => setDonorPrompt(e.target.value)}
                                rows={6}
                                placeholder="Masukkan Donor Prompt (Action, Held Objects, Expression, Environment props)..."
                                spellCheck={false}
                            />
                            <div className="dm-panel-footer">
                                <span className="dm-hint">
                                    Injects: Pose &amp; held items, gaze, facial expression, and props (sliding door, desks).
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* MERGER ENGINE CONTROLS & HARMONY TOGGLE */}
                    <div className="dm-engine-bar">
                        <div className="dm-engine-options">
                            <label className="dm-checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={clampWeights}
                                    onChange={(e) => setClampWeights(e.target.checked)}
                                />
                                <span>Weight Clamping / Harmony (Clamp Donor Actions &gt; 1.25 &rarr; 1.25)</span>
                            </label>

                            {Object.keys(overrides).length > 0 && (
                                <button
                                    type="button"
                                    className="dm-btn dm-btn-xs dm-btn-warn"
                                    onClick={handleResetOverrides}
                                >
                                    Reset {Object.keys(overrides).length} Category Overrides
                                </button>
                            )}
                        </div>

                        <div className="dm-legend">
                            <span className="dm-legend-item">
                                <span className="dm-legend-dot locked" /> Base Kept
                            </span>
                            <span className="dm-legend-item">
                                <span className="dm-legend-dot purged" /> Base Purged (Old Pose/Book)
                            </span>
                            <span className="dm-legend-item">
                                <span className="dm-legend-dot injected" /> Donor Injected
                            </span>
                            <span className="dm-legend-item">
                                <span className="dm-legend-dot ignored" /> Donor Ignored
                            </span>
                        </div>
                    </div>

                    {/* INTERACTIVE TOKEN CLASSIFICATION BREAKDOWN */}
                    <div className="dm-token-breakdown-grid">
                        {/* BASE TOKENS AUDIT */}
                        <div className="dm-panel">
                            <div className="dm-panel-header">
                                <h4 className="dm-panel-title">Base Prompt Token Classification</h4>
                                <span className="dm-token-count">{mergeResult.baseTokens.length} tokens</span>
                            </div>
                            <p className="dm-breakdown-desc">
                                Klik token untuk mengubah kategori secara interaktif. Tag aksi usang otomatis berstatus PURGED.
                            </p>
                            <div className="dm-token-chips-wrap">
                                {mergeResult.baseTokens.map((tok) => {
                                    const catDef = DETERMINISTIC_CATEGORIES[tok.category];
                                    const isPurged = tok.status === "PURGED_ACTION";
                                    const isReplaced = tok.status === "REPLACED_POSTURE" || tok.status === "REPLACED_DESK";

                                    return (
                                        <button
                                            key={tok.id}
                                            type="button"
                                            className={`dm-token-chip base ${isPurged ? "purged" : ""} ${isReplaced ? "replaced" : ""}`}
                                            style={{
                                                borderColor: isPurged ? "#7f1d1d" : catDef.borderColor,
                                                backgroundColor: isPurged ? "#2a1215" : catDef.bgSubtle,
                                            }}
                                            onClick={() =>
                                                setEditingToken({
                                                    id: tok.id,
                                                    cleanText: tok.cleanText,
                                                    currentCat: tok.category,
                                                })
                                            }
                                            title={`[${catDef.label}] ${tok.statusReason || ""}. Klik untuk ubah kategori.`}
                                        >
                                            <span className="dm-token-text">{tok.raw}</span>
                                            <span
                                                className="dm-token-cat-pill"
                                                style={{ color: isPurged ? "#f87171" : catDef.color }}
                                            >
                                                {isPurged ? "PURGED" : catDef.label.split(" ")[0]}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* DONOR TOKENS AUDIT */}
                        <div className="dm-panel">
                            <div className="dm-panel-header">
                                <h4 className="dm-panel-title">Donor Prompt Token Classification</h4>
                                <span className="dm-token-count">{mergeResult.donorTokens.length} tokens</span>
                            </div>
                            <p className="dm-breakdown-desc">
                                Grouped weights dipecah mandiri. Tag action diinjeksi, tag style/karakter diabaikan untuk menjaga lock.
                            </p>
                            <div className="dm-token-chips-wrap">
                                {mergeResult.donorTokens.map((tok) => {
                                    const catDef = DETERMINISTIC_CATEGORIES[tok.category];
                                    const isInjected = tok.status === "INJECTED_ACTION" || tok.status === "INJECTED_PROP";
                                    const isIgnored = tok.status.startsWith("IGNORED_");

                                    return (
                                        <button
                                            key={tok.id}
                                            type="button"
                                            className={`dm-token-chip donor ${isInjected ? "injected" : ""} ${isIgnored ? "ignored" : ""}`}
                                            style={{
                                                borderColor: isInjected ? "#7c2d12" : catDef.borderColor,
                                                backgroundColor: isInjected ? "#27170c" : "transparent",
                                                opacity: isIgnored ? 0.45 : 1,
                                            }}
                                            onClick={() =>
                                                setEditingToken({
                                                    id: tok.id,
                                                    cleanText: tok.cleanText,
                                                    currentCat: tok.category,
                                                })
                                            }
                                            title={`[${catDef.label}] ${tok.statusReason || ""}. Klik untuk ubah kategori.`}
                                        >
                                            <span className="dm-token-text">{tok.raw}</span>
                                            <span
                                                className="dm-token-cat-pill"
                                                style={{ color: isInjected ? "#fb923c" : catDef.color }}
                                            >
                                                {isInjected ? "INJECT" : "IGNORE"}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* 6-SLOT ARCHITECTURE RECONSTRUCTION BREAKDOWN */}
                    <div className="dm-panel dm-slots-panel">
                        <div className="dm-panel-header">
                            <h4 className="dm-panel-title">6-Slot CLIP Token Architecture Breakdown</h4>
                            <span className="dm-hint">Urutan token baku untuk retensi CLIP attention maksimal</span>
                        </div>

                        <div className="dm-slots-list">
                            <div className="dm-slot-item">
                                <div className="dm-slot-meta">
                                    <span className="dm-slot-num">Slot 1</span>
                                    <span className="dm-slot-name">Quality &amp; Style Lock</span>
                                    <span className="dm-slot-src base">Base 100%</span>
                                </div>
                                <div className="dm-slot-content">
                                    {mergeResult.slot1.join(", ") || <span className="dm-empty">-</span>}
                                </div>
                            </div>

                            <div className="dm-slot-item">
                                <div className="dm-slot-meta">
                                    <span className="dm-slot-num">Slot 2</span>
                                    <span className="dm-slot-name">Character Identity &amp; Anatomy Lock</span>
                                    <span className="dm-slot-src base">Base 100%</span>
                                </div>
                                <div className="dm-slot-content">
                                    {mergeResult.slot2.join(", ") || <span className="dm-empty">-</span>}
                                </div>
                            </div>

                            <div className="dm-slot-item">
                                <div className="dm-slot-meta">
                                    <span className="dm-slot-num">Slot 3</span>
                                    <span className="dm-slot-name">Framing + Injected Pose/Action/Expression</span>
                                    <span className="dm-slot-src donor">Donor &amp; Base Framing</span>
                                </div>
                                <div className="dm-slot-content">
                                    {mergeResult.slot3.join(", ") || <span className="dm-empty">-</span>}
                                </div>
                            </div>

                            <div className="dm-slot-item">
                                <div className="dm-slot-meta">
                                    <span className="dm-slot-num">Slot 4</span>
                                    <span className="dm-slot-name">Halo, Hair &amp; Outfit Lock (@1.10)</span>
                                    <span className="dm-slot-src base">Base 100%</span>
                                </div>
                                <div className="dm-slot-content">
                                    {mergeResult.slot4.join(", ") || <span className="dm-empty">-</span>}
                                </div>
                            </div>

                            <div className="dm-slot-item">
                                <div className="dm-slot-meta">
                                    <span className="dm-slot-num">Slot 5</span>
                                    <span className="dm-slot-name">Posture &amp; Environment Merge</span>
                                    <span className="dm-slot-src merged">Smart Merge</span>
                                </div>
                                <div className="dm-slot-content">
                                    {mergeResult.slot5.join(", ") || <span className="dm-empty">-</span>}
                                </div>
                            </div>

                            <div className="dm-slot-item">
                                <div className="dm-slot-meta">
                                    <span className="dm-slot-num">Slot 6</span>
                                    <span className="dm-slot-name">Lighting &amp; Rendering Lock</span>
                                    <span className="dm-slot-src base">Base 100%</span>
                                </div>
                                <div className="dm-slot-content">
                                    {mergeResult.slot6.join(", ") || <span className="dm-empty">-</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* FINAL MERGED OUTPUT CARD */}
                    <div className="dm-panel dm-output-panel">
                        <div className="dm-panel-header">
                            <div className="dm-panel-title-wrap">
                                <span className="dm-panel-tag output">FINAL MERGED PROMPT</span>
                                <h3 className="dm-panel-title">Production Deterministic Output</h3>
                            </div>
                            <div className="dm-panel-actions">
                                <button
                                    type="button"
                                    className="dm-btn dm-btn-primary"
                                    onClick={() => copyToClipboard(mergeResult.finalMergedPrompt, "final-output", "Prompt final berhasil disalin!")}
                                >
                                    {copiedKey === "final-output" ? "Tersalin!" : "Salin Prompt"}
                                </button>
                                {onApplyToCanvas && (
                                    <button
                                        type="button"
                                        className="dm-btn dm-btn-accent"
                                        onClick={() => {
                                            const neg = mergeResult.suggestedNegativePrompt
                                                ? `${activePreset?.baseNegative || ""}, ${mergeResult.suggestedNegativePrompt}`
                                                : activePreset?.baseNegative || "";
                                            onApplyToCanvas(mergeResult.finalMergedPrompt, neg);
                                            showToast("Berhasil diterapkan ke Prompt Canvas Studio!");
                                        }}
                                    >
                                        Terapkan ke Canvas
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="dm-output-box">
                            <pre className="dm-prompt-display">{mergeResult.finalMergedPrompt}</pre>
                        </div>

                        <div className="dm-output-footer">
                            <div className="dm-output-stats">
                                <span>Panjang Karakter: {mergeResult.finalMergedPrompt.length}</span>
                                <span>Total Tag: {mergeResult.finalMergedPrompt.split(",").length}</span>
                                <span>Posture: <strong>{mergeResult.targetPosture}</strong></span>
                            </div>

                            {mergeResult.suggestedNegativePrompt && (
                                <div className="dm-suggested-negative">
                                    <span className="dm-neg-label">Auto-Suggested Negative Exclusion:</span>
                                    <code className="dm-neg-code">{mergeResult.suggestedNegativePrompt}</code>
                                    <button
                                        type="button"
                                        className="dm-btn dm-btn-xs"
                                        onClick={() => copyToClipboard(mergeResult.suggestedNegativePrompt, "neg-copy", "Negative exclusion tersalin!")}
                                    >
                                        {copiedKey === "neg-copy" ? "Tersalin!" : "Salin Negative"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: STORYBOARD SCENE MANAGER */}
            {activeViewTab === "storyboard" && (
                <div className="dm-storyboard-layout">
                    <div className="dm-storyboard-top-controls">
                        <div>
                            <h3 className="dm-storyboard-title">{activePreset?.title}</h3>
                            <p className="dm-storyboard-desc">{activePreset?.description}</p>
                        </div>

                        <div className="dm-storyboard-top-buttons">
                            <button
                                type="button"
                                className="dm-btn dm-btn-primary"
                                onClick={handleCopyAllStoryboard}
                            >
                                {copiedKey === "all-storyboard" ? "Tersalin!" : "Salin Seluruh Storyboard (Batch)"}
                            </button>

                            <button
                                type="button"
                                className="dm-btn dm-btn-secondary"
                                onClick={() => {
                                    setModalSceneTitle(`Scene ${(activePreset?.childScenes.length || 0) + 1}: `);
                                    setModalSceneDonorPrompt("");
                                    setModalSceneNotes("");
                                    setIsSceneModalOpen(true);
                                }}
                            >
                                + Tambah Scene
                            </button>
                        </div>
                    </div>

                    <div className="dm-storyboard-cards-grid">
                        {activePreset?.childScenes.map((scene) => {
                            const sceneMerge = mergePromptsDeterministic(activePreset.basePrompt, scene.donorPrompt, {
                                clampWeights,
                                maxActionWeight,
                            });

                            const isCurrentSelected = scene.id === activeSceneId;

                            return (
                                <div key={scene.id} className={`dm-scene-card ${isCurrentSelected ? "active" : ""}`}>
                                    <div className="dm-scene-card-header">
                                        <div className="dm-scene-card-title-row">
                                            <span className="dm-scene-badge">SCENE {scene.sceneNumber}</span>
                                            <h4 className="dm-scene-title">{scene.title}</h4>
                                        </div>
                                        <div className="dm-scene-card-actions">
                                            <button
                                                type="button"
                                                className="dm-btn dm-btn-xs dm-btn-secondary"
                                                onClick={() => {
                                                    setActiveSceneId(scene.id);
                                                    setDonorPrompt(scene.donorPrompt);
                                                    setActiveViewTab("merger");
                                                    showToast(`Scene ${scene.sceneNumber} dimuat ke Deterministic Merger!`);
                                                }}
                                                title="Muat scene ini ke Deterministic Lock Merger"
                                            >
                                                Load ke Merger
                                            </button>
                                            <button
                                                type="button"
                                                className="dm-btn dm-btn-xs dm-btn-primary"
                                                onClick={() => copyToClipboard(sceneMerge.finalMergedPrompt, `scene-${scene.id}`, "Prompt scene tersalin!")}
                                                title="Salin hasil prompt scene ini"
                                            >
                                                {copiedKey === `scene-${scene.id}` ? "Tersalin!" : "Salin Prompt"}
                                            </button>
                                            {!activePreset.isBuiltIn && (
                                                <button
                                                    type="button"
                                                    className="dm-btn dm-btn-xs dm-btn-danger"
                                                    onClick={() => handleDeleteScene(scene.id, scene.title)}
                                                    title="Hapus scene ini"
                                                >
                                                    Hapus
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {scene.notes && <p className="dm-scene-notes">{scene.notes}</p>}

                                    <div className="dm-scene-extracted-row">
                                        <div className="dm-extracted-block">
                                            <span className="dm-extracted-label">Extracted Pose/Action:</span>
                                            <div className="dm-chips-mini">
                                                {sceneMerge.slot3.map((tok, idx) => (
                                                    <span key={idx} className="dm-mini-chip action">{tok}</span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="dm-extracted-block">
                                            <span className="dm-extracted-label">Props &amp; Environment:</span>
                                            <div className="dm-chips-mini">
                                                {sceneMerge.slot5.map((tok, idx) => (
                                                    <span key={idx} className="dm-mini-chip prop">{tok}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="dm-scene-prompt-preview">
                                        <div className="dm-scene-prompt-label">Merged Prompt:</div>
                                        <div className="dm-scene-prompt-text">{sceneMerge.finalMergedPrompt}</div>
                                    </div>

                                    {sceneMerge.suggestedNegativePrompt && (
                                        <div className="dm-scene-negative-suggestion">
                                            <span className="dm-neg-tag">AUTO NEGATIVE:</span>
                                            <span>{sceneMerge.suggestedNegativePrompt}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* TAB 3: PRESETS & STORIES HIERARCHY MANAGER */}
            {activeViewTab === "presets" && (
                <div className="dm-presets-layout">
                    <div className="dm-presets-header-row">
                        <div>
                            <h3 className="dm-panel-title">Story Presets &amp; Hierarchy Management</h3>
                            <p className="dm-subtitle">Kelola Master Story Presets dan Child Scenes. Mendukung duplikasi, ekspor/impor JSON, dan reset bawaan.</p>
                        </div>
                        <div className="dm-presets-actions">
                            <button type="button" className="dm-btn dm-btn-primary" onClick={handleOpenCreateStory}>
                                + New Story Preset
                            </button>
                            <button type="button" className="dm-btn dm-btn-secondary" onClick={handleResetDefaults}>
                                Reset ke Default Pabrik
                            </button>
                        </div>
                    </div>

                    <div className="dm-presets-list-grid">
                        {presets.map((preset) => (
                            <div key={preset.id} className={`dm-preset-manage-card ${preset.id === activePresetId ? "active" : ""}`}>
                                <div className="dm-manage-card-top">
                                    <div className="dm-manage-card-title-row">
                                        <h4 className="dm-manage-card-title">{preset.title}</h4>
                                        <span className={`dm-manage-badge ${preset.isBuiltIn ? "builtin" : "custom"}`}>
                                            {preset.isBuiltIn ? "Built-In" : "User Custom"}
                                        </span>
                                    </div>
                                    <p className="dm-manage-desc">{preset.description || "Tidak ada deskripsi."}</p>
                                </div>

                                <div className="dm-manage-meta">
                                    <span>Jumlah Scene: <strong>{preset.childScenes.length} Scenes</strong></span>
                                </div>

                                <div className="dm-manage-preview-base">
                                    <span className="dm-extracted-label">Master Base Prompt:</span>
                                    <div className="dm-scene-prompt-text clamp">{preset.basePrompt}</div>
                                </div>

                                <div className="dm-manage-actions-row">
                                    <button
                                        type="button"
                                        className="dm-btn dm-btn-sm dm-btn-primary"
                                        onClick={() => {
                                            handleSelectPreset(preset.id);
                                            setActiveViewTab("merger");
                                            showToast(`Preset "${preset.title}" aktif!`);
                                        }}
                                    >
                                        Gunakan Preset Ini
                                    </button>

                                    <button
                                        type="button"
                                        className="dm-btn dm-btn-sm dm-btn-secondary"
                                        onClick={() => {
                                            const updated = duplicateStoryPreset(preset.id);
                                            setPresets(updated);
                                            showToast(`Preset "${preset.title}" berhasil diduplikasi!`);
                                        }}
                                    >
                                        Duplikat
                                    </button>

                                    {!preset.isBuiltIn && (
                                        <button
                                            type="button"
                                            className="dm-btn dm-btn-sm dm-btn-danger"
                                            onClick={() => {
                                                if (confirm(`Hapus preset "${preset.title}"?`)) {
                                                    const updated = deleteStoryPreset(preset.id);
                                                    setPresets(updated);
                                                    if (activePresetId === preset.id) {
                                                        setActivePresetId(updated[0].id);
                                                        setBasePrompt(updated[0].basePrompt);
                                                    }
                                                    showToast("Preset berhasil dihapus!");
                                                }
                                            }}
                                        >
                                            Hapus
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MODAL: CATEGORY OVERRIDE POPOVER */}
            {editingToken && (
                <div className="dm-modal-backdrop" onClick={() => setEditingToken(null)}>
                    <div className="dm-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="dm-modal-header">
                            <h4 className="dm-modal-title">Ubah Kategori Tag</h4>
                            <button type="button" className="dm-modal-close" onClick={() => setEditingToken(null)}>
                                &times;
                            </button>
                        </div>
                        <p className="dm-modal-subtitle">
                            Tag: <code>{editingToken.cleanText}</code>
                        </p>

                        <div className="dm-category-options-list">
                            {(Object.keys(DETERMINISTIC_CATEGORIES) as DeterministicCategory[]).map((catKey) => {
                                const catDef = DETERMINISTIC_CATEGORIES[catKey];
                                const isSelected = editingToken.currentCat === catKey;

                                return (
                                    <button
                                        key={catKey}
                                        type="button"
                                        className={`dm-category-opt-btn ${isSelected ? "selected" : ""}`}
                                        style={{
                                            borderLeftColor: catDef.color,
                                            borderLeftWidth: "4px",
                                        }}
                                        onClick={() => handleOverrideCategory(editingToken.cleanText, catKey)}
                                    >
                                        <span className="dm-cat-opt-label" style={{ color: catDef.color }}>
                                            {catDef.label}
                                        </span>
                                        <span className="dm-cat-opt-desc">{catDef.description}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: CREATE / EDIT STORY PRESET */}
            {isStoryModalOpen && (
                <div className="dm-modal-backdrop" onClick={() => setIsStoryModalOpen(false)}>
                    <div className="dm-modal-content dm-modal-large" onClick={(e) => e.stopPropagation()}>
                        <div className="dm-modal-header">
                            <h4 className="dm-modal-title">
                                {storyModalMode === "create" ? "Buat Main Story Preset Baru" : "Edit Main Story Preset"}
                            </h4>
                            <button type="button" className="dm-modal-close" onClick={() => setIsStoryModalOpen(false)}>
                                &times;
                            </button>
                        </div>

                        <div className="dm-modal-body">
                            <div className="dm-form-group">
                                <label className="dm-form-label">Judul Story Preset:</label>
                                <input
                                    type="text"
                                    className="dm-form-input"
                                    value={modalStoryTitle}
                                    onChange={(e) => setModalStoryTitle(e.target.value)}
                                    placeholder="Contoh: Rio — Retro Burgundy Classroom Story"
                                />
                            </div>

                            <div className="dm-form-group">
                                <label className="dm-form-label">Deskripsi Cerita / Karakter:</label>
                                <input
                                    type="text"
                                    className="dm-form-input"
                                    value={modalStoryDesc}
                                    onChange={(e) => setModalStoryDesc(e.target.value)}
                                    placeholder="Ringkasan cerita, karakter, atau pakaian yang dikunci..."
                                />
                            </div>

                            <div className="dm-form-group">
                                <label className="dm-form-label">Master Base Prompt (Kunci Style, Karakter &amp; Outfit):</label>
                                <textarea
                                    className="dm-form-textarea"
                                    rows={5}
                                    value={modalStoryBasePrompt}
                                    onChange={(e) => setModalStoryBasePrompt(e.target.value)}
                                    placeholder="Masukkan prompt dasar yang akan dikunci..."
                                />
                            </div>

                            <div className="dm-form-group">
                                <label className="dm-form-label">Base Negative Prompt:</label>
                                <textarea
                                    className="dm-form-textarea"
                                    rows={2}
                                    value={modalStoryBaseNegative}
                                    onChange={(e) => setModalStoryBaseNegative(e.target.value)}
                                    placeholder="Negative prompt bawaan untuk story ini..."
                                />
                            </div>
                        </div>

                        <div className="dm-modal-footer">
                            <button type="button" className="dm-btn dm-btn-secondary" onClick={() => setIsStoryModalOpen(false)}>
                                Batal
                            </button>
                            <button type="button" className="dm-btn dm-btn-primary" onClick={handleSaveStoryModal}>
                                Simpan Story Preset
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: ADD CHILD SCENE */}
            {isSceneModalOpen && (
                <div className="dm-modal-backdrop" onClick={() => setIsSceneModalOpen(false)}>
                    <div className="dm-modal-content dm-modal-large" onClick={(e) => e.stopPropagation()}>
                        <div className="dm-modal-header">
                            <h4 className="dm-modal-title">Tambah Child Scene ke Story</h4>
                            <button type="button" className="dm-modal-close" onClick={() => setIsSceneModalOpen(false)}>
                                &times;
                            </button>
                        </div>

                        <div className="dm-modal-body">
                            <div className="dm-form-group">
                                <label className="dm-form-label">Judul Scene:</label>
                                <input
                                    type="text"
                                    className="dm-form-input"
                                    value={modalSceneTitle}
                                    onChange={(e) => setModalSceneTitle(e.target.value)}
                                    placeholder="Contoh: Scene 6: Berjalan ke Papan Tulis"
                                />
                            </div>

                            <div className="dm-form-group">
                                <label className="dm-form-label">Donor Prompt (Aksi, Pose, Gaze, Objek, Latar Baru):</label>
                                <textarea
                                    className="dm-form-textarea"
                                    rows={4}
                                    value={modalSceneDonorPrompt}
                                    onChange={(e) => setModalSceneDonorPrompt(e.target.value)}
                                    placeholder="cowboy shot, (walking to chalkboard:1.20), looking at viewer, gentle smile, chalkboard, classroom..."
                                />
                            </div>

                            <div className="dm-form-group">
                                <label className="dm-form-label">Catatan Sutradara / Scene Notes (Opsional):</label>
                                <input
                                    type="text"
                                    className="dm-form-input"
                                    value={modalSceneNotes}
                                    onChange={(e) => setModalSceneNotes(e.target.value)}
                                    placeholder="Deskripsi konteks aksi karakter dalam adegan..."
                                />
                            </div>
                        </div>

                        <div className="dm-modal-footer">
                            <button type="button" className="dm-btn dm-btn-secondary" onClick={() => setIsSceneModalOpen(false)}>
                                Batal
                            </button>
                            <button type="button" className="dm-btn dm-btn-primary" onClick={handleSaveSceneModal}>
                                Tambahkan Scene
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
