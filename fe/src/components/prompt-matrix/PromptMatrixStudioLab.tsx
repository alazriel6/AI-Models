import React, { useState, useMemo, useEffect, useRef } from "react";
import "../../style/PromptMatrixStudio.css";
import type {
    CategoryKey,
    MasterProfile,
    PromptMatrixStudioState,
    StoryboardScene,
    TagItem,
} from "../../types/promptMatrixStudio";
import {
    mergePrompt,
} from "../../services/deterministicMatrixEngine";
import {
    createInitialState,
    duplicateScene,
    exportStateAsJSON,
    importStateFromJSON,
    loadStudioState,
    saveStudioState,
} from "../../services/matrixStorageService";
import { StudioLabView } from "./StudioLabView";
import { PromptMatrixView } from "./PromptMatrixView";
import { MergerStoryboardView } from "./MergerStoryboardView";

interface PromptMatrixStudioLabProps {
    onApplyToCanvas?: (positive: string, negative: string) => void;
    showToast?: (msg: string) => void;
    activeCheckpointName?: string;
}

export const PromptMatrixStudioLab: React.FC<PromptMatrixStudioLabProps> = ({
    onApplyToCanvas,
    showToast = (msg) => alert(msg),
    activeCheckpointName,
}) => {
    // 1. Core Persistent State
    const [studioState, setStudioState] = useState<PromptMatrixStudioState>(() => loadStudioState());

    // Auto-save state to localStorage whenever modified
    useEffect(() => {
        saveStudioState(studioState);
    }, [studioState]);

    const activeProfile = useMemo(() => {
        return (
            studioState.profiles.find((p) => p.id === studioState.activeProfileId) ||
            studioState.profiles[0]
        );
    }, [studioState.profiles, studioState.activeProfileId]);

    const activeScene = useMemo(() => {
        return (
            studioState.scenes.find((s) => s.id === studioState.activeSceneId) ||
            studioState.scenes[0]
        );
    }, [studioState.scenes, studioState.activeSceneId]);

    // Active Internal View ("studio" | "matrix" | "merger")
    const activeSubTab = studioState.uiPreferences.activeSubTab || "studio";
    const setActiveSubTab = (tab: "studio" | "matrix" | "merger") => {
        setStudioState((prev) => ({
            ...prev,
            uiPreferences: { ...prev.uiPreferences, activeSubTab: tab },
        }));
    };

    // Container Ref to ensure smooth scrolling without clipping
    const containerRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, []);

    // Hidden file input for JSON import
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // 2. Compute Deterministic Merge Result for Active Scene
    const mergeResult = useMemo(() => {
        if (!activeProfile || !activeScene) {
            return {
                positivePrompt: "",
                negativePrompt: "",
                categoryOutput: {} as Record<CategoryKey, TagItem[]>,
                diagnostics: {
                    conflicts: [],
                    duplicates: [],
                    weightMismatches: [],
                    warnings: [],
                    styleWarnings: [],
                    stats: {
                        totalMasterTags: 0,
                        totalSceneTags: 0,
                        mergedCount: 0,
                        lockedCount: 0,
                        overriddenCount: 0,
                        unclassifiedCount: 0,
                    },
                },
                tagsByCategory: {} as Record<CategoryKey, string[]>,
            };
        }

        return mergePrompt({
            masterCategories: activeProfile.categories,
            sceneCategories: activeScene.categories,
            categoryOrder: activeScene.categoryOrder || activeProfile.categoryOrder,
            mergePolicy: activeScene.mergePolicy || "master_first",
            defaultNegative: activeProfile.negativePrompt,
            sceneNegative: activeScene.rawNegative,
            userDictionary: studioState.userDictionary,
        });
    }, [activeProfile, activeScene, studioState.userDictionary]);

    // --------------------------------------------------------------------------
    // STATE UPDATE HANDLERS
    // --------------------------------------------------------------------------

    const handleUpdateSceneCategories = (newCategories: StoryboardScene["categories"]) => {
        setStudioState((prev) => ({
            ...prev,
            scenes: prev.scenes.map((s) =>
                s.id === prev.activeSceneId
                    ? { ...s, categories: newCategories, updatedAt: Date.now() }
                    : s
            ),
        }));
    };

    const handleUpdateSceneRawPrompt = (positive: string, negative: string) => {
        setStudioState((prev) => ({
            ...prev,
            scenes: prev.scenes.map((s) =>
                s.id === prev.activeSceneId
                    ? { ...s, rawPositive: positive, rawNegative: negative, updatedAt: Date.now() }
                    : s
            ),
        }));
    };

    const handleUpdateActiveScene = (updatedScene: StoryboardScene) => {
        setStudioState((prev) => ({
            ...prev,
            scenes: prev.scenes.map((s) => (s.id === updatedScene.id ? updatedScene : s)),
        }));
    };

    const handleUpdateMasterProfile = (updatedProfile: MasterProfile) => {
        setStudioState((prev) => ({
            ...prev,
            profiles: prev.profiles.map((p) => (p.id === updatedProfile.id ? updatedProfile : p)),
        }));
    };

    const handleSelectScene = (sceneId: string) => {
        setStudioState((prev) => ({
            ...prev,
            activeSceneId: sceneId,
        }));
    };

    const handleAddScene = (title?: string) => {
        const newScene = duplicateScene(
            activeScene,
            title || `Scene ${studioState.scenes.length + 1}`
        );
        setStudioState((prev) => ({
            ...prev,
            scenes: [...prev.scenes, newScene],
            activeSceneId: newScene.id,
        }));
        showToast(`✓ Adegan baru "${newScene.title}" ditambahkan!`);
    };

    const handleDuplicateScene = (sceneId: string) => {
        const target = studioState.scenes.find((s) => s.id === sceneId);
        if (!target) return;
        const duplicated = duplicateScene(target);
        setStudioState((prev) => ({
            ...prev,
            scenes: [...prev.scenes, duplicated],
            activeSceneId: duplicated.id,
        }));
        showToast(`✓ Adegan "${target.title}" berhasil diduplikasi!`);
    };

    const handleDeleteScene = (sceneId: string) => {
        if (studioState.scenes.length <= 1) {
            showToast("Minimal harus ada satu adegan!");
            return;
        }
        const confirmed = window.confirm("Hapus adegan ini?");
        if (!confirmed) return;

        setStudioState((prev) => {
            const filtered = prev.scenes.filter((s) => s.id !== sceneId);
            return {
                ...prev,
                scenes: filtered,
                activeSceneId: filtered[0].id,
            };
        });
        showToast("Adegan dihapus.");
    };

    // 1-Click Load Rio Case Study
    const handleLoadRioCaseStudy = () => {
        const initial = createInitialState();
        setStudioState(initial);
        showToast("✓ Studi Kasus Rio Tsukatsuki (Foto 1 vs 2) berhasil dimuat!");
    };

    // Export Project Backup JSON
    const handleExportBackup = () => {
        const json = exportStateAsJSON(studioState);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Prompt_Matrix_Studio_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("✓ Cadangan proyek berhasil diunduh!");
    };

    // Import Project Backup JSON
    const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            const res = importStateFromJSON(content);
            if (res.success && res.state) {
                setStudioState(res.state);
                showToast("✓ Cadangan proyek berhasil diimpor!");
            } else {
                showToast(`Gagal impor: ${res.error || "Format tidak valid"}`);
            }
        };
        reader.readAsText(file);
        e.target.value = "";
    };

    return (
        <div className="pms-workspace" ref={containerRef}>
            {/* Hidden file input for JSON import */}
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept=".json"
                onChange={handleImportBackup}
            />

            {/* 1. TOP HEADER & WORKSPACE CONTROL BAR */}
            <header className="pms-header">
                <div className="pms-header-row">
                    <div className="pms-title-group">
                        <div className="pms-icon-badge">⚡</div>
                        <div className="pms-title-text">
                            <h2>
                                <span>Prompt Matrix &amp; Studio Lab</span>
                                <span className="pms-stat-pill info">16 Categories Engine</span>
                            </h2>
                            <p>
                                Deterministic Style &amp; Character Lock Merger · Danbooru/SDXL/Illustrious · Zero-Drift Multi-Scene
                            </p>
                        </div>
                    </div>

                    <div className="pms-header-stats">
                        <span className="pms-stat-pill success">
                            🔒 {mergeResult.diagnostics.stats.lockedCount} Terkunci
                        </span>
                        <span className="pms-stat-pill warning">
                            🎬 {studioState.scenes.length} Adegan
                        </span>
                        {activeCheckpointName && (
                            <span className="pms-stat-pill">
                                🎯 {activeCheckpointName}
                            </span>
                        )}
                        <button
                            type="button"
                            className="pms-btn amber"
                            onClick={handleLoadRioCaseStudy}
                            title="Muat contoh lengkap karakter Rio Tsukatsuki (Foto 1 vs 2)"
                        >
                            ⭐ Contoh Rio (Foto 1 vs 2)
                        </button>
                    </div>
                </div>

                {/* Controls Row: Profile / Scene Selector & 3 Internal Views Navigation */}
                <div className="pms-controls-row">
                    <div className="pms-selectors-group">
                        {/* Master Profile Selector */}
                        <div className="pms-field-compact">
                            <span className="pms-field-label">👑 Master Profile:</span>
                            <select
                                className="pms-select"
                                value={studioState.activeProfileId}
                                onChange={(e) =>
                                    setStudioState((prev) => ({
                                        ...prev,
                                        activeProfileId: e.target.value,
                                    }))
                                }
                            >
                                {studioState.profiles.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Scene Selector */}
                        <div className="pms-field-compact">
                            <span className="pms-field-label">🎬 Adegan:</span>
                            <select
                                className="pms-select"
                                value={studioState.activeSceneId}
                                onChange={(e) => handleSelectScene(e.target.value)}
                            >
                                {studioState.scenes.map((s, idx) => (
                                    <option key={s.id} value={s.id}>
                                        S{idx + 1}: {s.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Segmented Subtab Navigation (3 Views) */}
                    <nav className="pms-nav-segmented" role="tablist" aria-label="Internal Workspace Views">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeSubTab === "studio"}
                            className={`pms-nav-btn ${activeSubTab === "studio" ? "active" : ""}`}
                            onClick={() => setActiveSubTab("studio")}
                        >
                            <span>🔬 Studio Lab</span>
                            <span className="pms-nav-badge">16 Cat</span>
                        </button>

                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeSubTab === "matrix"}
                            className={`pms-nav-btn ${activeSubTab === "matrix" ? "active" : ""}`}
                            onClick={() => setActiveSubTab("matrix")}
                        >
                            <span>📊 Prompt Matrix</span>
                            <span className="pms-nav-badge">{studioState.scenes.length} Scenes</span>
                        </button>

                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeSubTab === "merger"}
                            className={`pms-nav-btn ${activeSubTab === "merger" ? "active" : ""}`}
                            onClick={() => setActiveSubTab("merger")}
                        >
                            <span>⚡ Merger &amp; Storyboard</span>
                            <span className="pms-nav-badge">Lock</span>
                        </button>
                    </nav>

                    {/* Secondary Actions (Backup, Canvas) */}
                    <div className="pms-actions-group">
                        <button
                            type="button"
                            className="pms-btn"
                            onClick={handleExportBackup}
                            title="Unduh cadangan seluruh proyek dalam format JSON"
                        >
                            💾 Ekspor
                        </button>
                        <button
                            type="button"
                            className="pms-btn"
                            onClick={() => fileInputRef.current?.click()}
                            title="Impor cadangan proyek JSON"
                        >
                            📂 Impor
                        </button>
                    </div>
                </div>
            </header>

            {/* 2. RENDER THE ACTIVE INTERNAL VIEW */}
            {activeSubTab === "studio" && (
                <StudioLabView
                    activeProfile={activeProfile}
                    activeScene={activeScene}
                    mergeResult={mergeResult}
                    onUpdateSceneCategories={handleUpdateSceneCategories}
                    onUpdateSceneRawPrompt={handleUpdateSceneRawPrompt}
                    onApplyToCanvas={onApplyToCanvas}
                    showToast={showToast}
                />
            )}

            {activeSubTab === "matrix" && (
                <PromptMatrixView
                    masterProfile={activeProfile}
                    scenes={studioState.scenes}
                    activeSceneId={studioState.activeSceneId}
                    onSelectScene={handleSelectScene}
                    onUpdateScene={handleUpdateActiveScene}
                    onAddScene={handleAddScene}
                    onDeleteScene={handleDeleteScene}
                    onUpdateMasterProfile={handleUpdateMasterProfile}
                    showToast={showToast}
                />
            )}

            {activeSubTab === "merger" && (
                <MergerStoryboardView
                    masterProfile={activeProfile}
                    activeScene={activeScene}
                    scenes={studioState.scenes}
                    mergeResult={mergeResult}
                    onUpdateScene={handleUpdateActiveScene}
                    onAddScene={handleAddScene}
                    onDuplicateScene={handleDuplicateScene}
                    onDeleteScene={handleDeleteScene}
                    onUpdateMasterProfile={handleUpdateMasterProfile}
                    onApplyToCanvas={onApplyToCanvas}
                    showToast={showToast}
                />
            )}
        </div>
    );
};
