import React, { useState, useMemo } from "react";
import {
    CATEGORY_SCHEMA_16,
    CATEGORY_MAP,
    type CategoryKey,
    type MasterProfile,
    type StoryboardScene,
    type TagItem,
} from "../../types/promptMatrixStudio";
import {
    formatTagString,
    normalizeTagKey,
    parseTagItem,
} from "../../services/deterministicMatrixEngine";
import { exportMatrixAsCSV } from "../../services/matrixStorageService";

interface PromptMatrixViewProps {
    masterProfile: MasterProfile;
    scenes: StoryboardScene[];
    activeSceneId: string;
    onSelectScene: (sceneId: string) => void;
    onUpdateScene: (scene: StoryboardScene) => void;
    onAddScene: (title?: string) => void;
    onDeleteScene: (sceneId: string) => void;
    onUpdateMasterProfile: (profile: MasterProfile) => void;
    showToast: (msg: string) => void;
}

export const PromptMatrixView: React.FC<PromptMatrixViewProps> = ({
    masterProfile,
    scenes,
    activeSceneId,
    onSelectScene,
    onUpdateScene,
    onAddScene,
    onDeleteScene,
    onUpdateMasterProfile,
    showToast,
}) => {
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [categoryFilter, setCategoryFilter] = useState<"all" | "changed" | "overridden" | "locked" | "conflicts">("all");
    const [editingCell, setEditingCell] = useState<{
        sceneId: string; // "master" or scene.id
        categoryKey: CategoryKey;
        initialText: string;
    } | null>(null);
    const [cellInputText, setCellInputText] = useState<string>("");

    // Helper: export CSV download
    const handleExportCSV = () => {
        const csvContent = exportMatrixAsCSV(masterProfile, scenes);
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Prompt_Matrix_${masterProfile.name.replace(/\s+/g, "_")}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("✓ Prompt Matrix berhasil diekspor ke CSV!");
    };

    // Filter categories based on search or status
    const filteredCategories = useMemo(() => {
        return CATEGORY_SCHEMA_16.filter((item) => {
            const key = item.key;

            // Search filter
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim();
                const inLabel = item.label.toLowerCase().includes(query);
                const inMaster = (masterProfile.categories[key]?.tags || []).some((t) =>
                    t.cleanText.toLowerCase().includes(query)
                );
                const inScenes = scenes.some((s) =>
                    (s.categories[key]?.tags || []).some((t) => t.cleanText.toLowerCase().includes(query))
                );
                if (!inLabel && !inMaster && !inScenes) return false;
            }

            // Status filter
            if (categoryFilter === "locked") {
                return masterProfile.categories[key]?.isLocked;
            }

            if (categoryFilter === "changed" || categoryFilter === "overridden") {
                // Check if any scene differs from master in this category
                const masterNorms = new Set(
                    (masterProfile.categories[key]?.tags || []).map((t) => normalizeTagKey(t.cleanText))
                );
                return scenes.some((s) => {
                    const sNorms = (s.categories[key]?.tags || []).map((t) => normalizeTagKey(t.cleanText));
                    if (sNorms.length !== masterNorms.size) return true;
                    return sNorms.some((n) => !masterNorms.has(n));
                });
            }

            return true;
        });
    }, [searchQuery, categoryFilter, masterProfile, scenes]);

    // Open quick edit modal for a cell
    const handleStartEditCell = (sceneId: string, categoryKey: CategoryKey) => {
        let initial = "";
        if (sceneId === "master") {
            initial = (masterProfile.categories[categoryKey]?.tags || []).map((t) => formatTagString(t)).join(", ");
        } else {
            const sc = scenes.find((s) => s.id === sceneId);
            if (sc) {
                initial = (sc.categories[categoryKey]?.tags || []).map((t) => formatTagString(t)).join(", ");
            }
        }

        setEditingCell({ sceneId, categoryKey, initialText: initial });
        setCellInputText(initial);
    };

    // Save edited cell
    const handleSaveCell = () => {
        if (!editingCell) return;
        const { sceneId, categoryKey } = editingCell;
        const newTags: TagItem[] = cellInputText
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
            .map((t) => parseTagItem(t));

        if (sceneId === "master") {
            const updated = JSON.parse(JSON.stringify(masterProfile)) as MasterProfile;
            updated.categories[categoryKey].tags = newTags;
            onUpdateMasterProfile(updated);
            showToast(`Master [${CATEGORY_MAP[categoryKey].label}] diperbarui.`);
        } else {
            const sc = scenes.find((s) => s.id === sceneId);
            if (sc) {
                const updated = JSON.parse(JSON.stringify(sc)) as StoryboardScene;
                updated.categories[categoryKey].tags = newTags;
                onUpdateScene(updated);
                showToast(`Adegan "${sc.title}" [${CATEGORY_MAP[categoryKey].label}] diperbarui.`);
            }
        }

        setEditingCell(null);
    };

    // Toggle cell lock
    const handleToggleCellLock = (sceneId: string, categoryKey: CategoryKey) => {
        if (sceneId === "master") {
            const updated = JSON.parse(JSON.stringify(masterProfile)) as MasterProfile;
            updated.categories[categoryKey].isLocked = !updated.categories[categoryKey].isLocked;
            onUpdateMasterProfile(updated);
        } else {
            const sc = scenes.find((s) => s.id === sceneId);
            if (sc) {
                const updated = JSON.parse(JSON.stringify(sc)) as StoryboardScene;
                updated.categories[categoryKey].isLocked = !updated.categories[categoryKey].isLocked;
                onUpdateScene(updated);
            }
        }
    };

    // Copy category from one scene or master to target scene
    const handleCopyCategoryToScene = (sourceSceneId: string, targetSceneId: string, categoryKey: CategoryKey) => {
        let sourceTags: TagItem[] = [];
        if (sourceSceneId === "master") {
            sourceTags = masterProfile.categories[categoryKey]?.tags || [];
        } else {
            const src = scenes.find((s) => s.id === sourceSceneId);
            if (src) sourceTags = src.categories[categoryKey]?.tags || [];
        }

        const target = scenes.find((s) => s.id === targetSceneId);
        if (target) {
            const updated = JSON.parse(JSON.stringify(target)) as StoryboardScene;
            updated.categories[categoryKey].tags = JSON.parse(JSON.stringify(sourceTags));
            onUpdateScene(updated);
            showToast(`Nilai [${CATEGORY_MAP[categoryKey].label}] disalin ke "${target.title}"`);
        }
    };

    return (
        <div className="pms-matrix-view">
            {/* Top Matrix Toolbar */}
            <div className="pms-matrix-toolbar">
                <div className="pms-matrix-search">
                    <input
                        type="text"
                        className="pms-input-sm"
                        style={{ width: "100%" }}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="🔍 Cari tag di seluruh adegan..."
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            className="pms-link-btn"
                            onClick={() => setSearchQuery("")}
                        >
                            ✕
                        </button>
                    )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <div className="pms-field-compact">
                        <span className="pms-field-label">Filter:</span>
                        <select
                            className="pms-select"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value as "all" | "changed" | "overridden" | "locked" | "conflicts")}
                        >
                            <option value="all">Semua Kategori (16)</option>
                            <option value="changed">Hanya yang Berbeda</option>
                            <option value="locked">Hanya Terkunci (Locked)</option>
                            <option value="overridden">Hanya Overridden</option>
                        </select>
                    </div>

                    <button
                        type="button"
                        className="pms-btn primary"
                        onClick={() => onAddScene()}
                        title="Tambah kolom adegan baru ke matrix"
                    >
                        + Tambah Adegan
                    </button>

                    <button
                        type="button"
                        className="pms-btn"
                        onClick={handleExportCSV}
                        title="Unduh seluruh matrix dalam format CSV"
                    >
                        📥 Ekspor CSV
                    </button>
                </div>
            </div>

            {/* Matrix Table with sticky headers & horizontal scroll isolation */}
            <div className="pms-matrix-table-container">
                <table className="pms-matrix-table">
                    <thead>
                        <tr>
                            <th className="pms-matrix-col-cat">
                                <span>Kategori (16 Layer)</span>
                            </th>
                            <th className="pms-matrix-col-master">
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span>👑 Master Profile</span>
                                    <span style={{ fontSize: "10px", color: "#38bdf8" }}>Authority</span>
                                </div>
                            </th>
                            {scenes.map((scene, idx) => {
                                const isActive = scene.id === activeSceneId;
                                return (
                                    <th
                                        key={scene.id}
                                        className="pms-matrix-col-scene"
                                        style={{ borderTop: isActive ? "2px solid #38bdf8" : undefined }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <span
                                                style={{ cursor: "pointer", color: isActive ? "#38bdf8" : "#f8fafc" }}
                                                onClick={() => onSelectScene(scene.id)}
                                                title="Klik untuk memilih adegan aktif"
                                            >
                                                S{idx + 1}: {scene.title.length > 20 ? scene.title.substring(0, 20) + "..." : scene.title}
                                            </span>
                                            {scenes.length > 1 && (
                                                <button
                                                    type="button"
                                                    style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: "11px" }}
                                                    onClick={() => onDeleteScene(scene.id)}
                                                    title="Hapus adegan ini"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCategories.map((cat) => {
                            const catKey = cat.key;
                            const masterCat = masterProfile.categories[catKey] || { tags: [], isLocked: false, isEnabled: true };
                            const masterNorms = new Set(masterCat.tags.map((t) => normalizeTagKey(t.cleanText)));

                            return (
                                <tr key={catKey}>
                                    {/* Column 1: Category Info */}
                                    <td className="pms-matrix-col-cat">
                                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                <span className="pms-cat-id-badge">#{cat.id}</span>
                                                <strong style={{ color: cat.color, fontSize: "11.5px" }}>{cat.shortLabel}</strong>
                                            </div>
                                            <span style={{ fontSize: "10px", color: "#64748b" }}>{cat.label}</span>
                                        </div>
                                    </td>

                                    {/* Column 2: Master Profile Cell */}
                                    <td className="pms-matrix-col-master">
                                        <div className="pms-matrix-cell-content">
                                            <div className="pms-cell-status-bar">
                                                <span className={`pms-pill ${masterCat.isLocked ? "locked" : "inherited"}`}>
                                                    {masterCat.isLocked ? "🔒 Locked" : "🔓 Dynamic"}
                                                </span>
                                                <div style={{ display: "flex", gap: "4px" }}>
                                                    <button
                                                        type="button"
                                                        className="pms-link-btn"
                                                        onClick={() => handleToggleCellLock("master", catKey)}
                                                    >
                                                        {masterCat.isLocked ? "Buka" : "Kunci"}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="pms-link-btn"
                                                        onClick={() => handleStartEditCell("master", catKey)}
                                                    >
                                                        Edit
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="pms-tag-list">
                                                {masterCat.tags.length === 0 ? (
                                                    <span style={{ color: "#64748b", fontStyle: "italic", fontSize: "10.5px" }}>
                                                        (kosong)
                                                    </span>
                                                ) : (
                                                    masterCat.tags.map((tag) => (
                                                        <span key={tag.id} className="pms-tag-chip" style={{ fontSize: "10.5px", padding: "2px 6px" }}>
                                                            {formatTagString(tag)}
                                                        </span>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Columns 3..N: Scene Cells */}
                                    {scenes.map((scene) => {
                                        const sCat = scene.categories[catKey] || { tags: [], isLocked: false, isEnabled: true };
                                        const sNorms = sCat.tags.map((t) => normalizeTagKey(t.cleanText));

                                        // Determine difference vs master
                                        const isDifferent =
                                            sNorms.length !== masterNorms.size ||
                                            sNorms.some((n) => !masterNorms.has(n));

                                        let statusType: "locked" | "overridden" | "inherited" | "disabled" = "inherited";
                                        if (masterCat.isLocked) {
                                            statusType = "locked";
                                        } else if (isDifferent) {
                                            statusType = "overridden";
                                        }

                                        return (
                                            <td
                                                key={scene.id}
                                                className={`pms-matrix-col-scene ${isDifferent ? "pms-matrix-cell-diff" : ""}`}
                                            >
                                                <div className="pms-matrix-cell-content">
                                                    <div className="pms-cell-status-bar">
                                                        <span className={`pms-pill ${statusType}`}>
                                                            {statusType === "locked"
                                                                ? "🔒 Locked"
                                                                : statusType === "overridden"
                                                                ? "⚡ Overridden"
                                                                : "Inherited"}
                                                        </span>
                                                        <div style={{ display: "flex", gap: "6px" }}>
                                                            <button
                                                                type="button"
                                                                className="pms-link-btn"
                                                                onClick={() => handleCopyCategoryToScene("master", scene.id, catKey)}
                                                                title="Terapkan nilai master ke adegan ini"
                                                            >
                                                                ↺ Master
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="pms-link-btn"
                                                                onClick={() => handleStartEditCell(scene.id, catKey)}
                                                            >
                                                                Edit
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="pms-tag-list">
                                                        {sCat.tags.length === 0 ? (
                                                            <span style={{ color: "#64748b", fontStyle: "italic", fontSize: "10.5px" }}>
                                                                (kosong)
                                                            </span>
                                                        ) : (
                                                            sCat.tags.map((tag) => (
                                                                <span
                                                                    key={tag.id}
                                                                    className="pms-tag-chip"
                                                                    style={{ fontSize: "10.5px", padding: "2px 6px" }}
                                                                >
                                                                    {formatTagString(tag)}
                                                                </span>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Quick Edit Cell Modal */}
            {editingCell && (
                <div className="pms-modal-backdrop" onClick={() => setEditingCell(null)}>
                    <div className="pms-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="pms-modal-header">
                            <span className="pms-modal-title">
                                Edit Nilai Kategori: [{CATEGORY_MAP[editingCell.categoryKey].label}]
                            </span>
                            <button
                                type="button"
                                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "16px" }}
                                onClick={() => setEditingCell(null)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="pms-modal-body">
                            <label className="pms-field-label">Tag Koma-Terpisah (Preserves weights):</label>
                            <textarea
                                className="pms-textarea"
                                style={{ minHeight: "90px" }}
                                value={cellInputText}
                                onChange={(e) => setCellInputText(e.target.value)}
                                placeholder="e.g. burgundy dress, white belt, (halter dress:1.10)..."
                            />
                        </div>
                        <div className="pms-modal-footer">
                            <button type="button" className="pms-btn" onClick={() => setEditingCell(null)}>
                                Batal
                            </button>
                            <button type="button" className="pms-btn primary" onClick={handleSaveCell}>
                                Simpan Perubahan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
