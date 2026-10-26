import React, { useState, useMemo } from "react";
import {
    CATEGORY_SCHEMA_16,
    CATEGORY_MAP,
    type CategoryKey,
    type MasterProfile,
    type MergePromptResult,
    type StoryboardScene,
    type TagItem,
} from "../../types/promptMatrixStudio";
import {
    classifyTag,
    formatTagString,
    parseTagItem,
    tokenizeRawPrompt,
} from "../../services/deterministicMatrixEngine";

interface StudioLabViewProps {
    activeProfile: MasterProfile;
    activeScene: StoryboardScene;
    mergeResult: MergePromptResult;
    onUpdateSceneCategories: (newCategories: StoryboardScene["categories"]) => void;
    onUpdateSceneRawPrompt: (positive: string, negative: string) => void;
    onApplyToCanvas?: (positive: string, negative: string) => void;
    showToast: (msg: string) => void;
}

export const StudioLabView: React.FC<StudioLabViewProps> = ({
    activeProfile,
    activeScene,
    mergeResult,
    onUpdateSceneCategories,
    onUpdateSceneRawPrompt,
    onApplyToCanvas,
    showToast,
}) => {
    const [rawInput, setRawInput] = useState<string>(activeScene.rawPositive || "");
    const [rawNegativeInput, setRawNegativeInput] = useState<string>(activeScene.rawNegative || "");
    const [autoParse, setAutoParse] = useState<boolean>(false);
    const [newTagInputs, setNewTagInputs] = useState<Record<CategoryKey, string>>({} as Record<CategoryKey, string>);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // Selected unclassified tag for moving to another category
    const [movingTag, setMovingTag] = useState<{ tag: TagItem; sourceCategory: CategoryKey } | null>(null);
    const [targetCategory, setTargetCategory] = useState<CategoryKey>("character_identity");

    const categories = activeScene.categories;

    // Helper to trigger clipboard copy with visual feedback
    const handleCopy = (text: string, key: string, label = "Tersalin ke clipboard!") => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        showToast(label);
        setTimeout(() => setCopiedKey(null), 1800);
    };

    // Calculate tag statistics
    const stats = useMemo(() => {
        let totalTags = 0;
        let unclassifiedCount = 0;
        let lockedCount = 0;

        for (const item of CATEGORY_SCHEMA_16) {
            const state = categories[item.key];
            if (!state) continue;
            totalTags += state.tags.length;
            if (item.key === "custom_unclassified") {
                unclassifiedCount += state.tags.length;
            }
            if (state.isLocked) {
                lockedCount++;
            }
        }

        return {
            totalTags,
            unclassifiedCount,
            lockedCount,
            conflictsCount: mergeResult.diagnostics.conflicts.length,
            duplicatesCount: mergeResult.diagnostics.duplicates.length,
        };
    }, [categories, mergeResult]);

    // Manual Parse Action
    const handleParseRawPrompt = () => {
        if (!rawInput.trim()) {
            showToast("Masukkan prompt terlebih dahulu untuk di-parse!");
            return;
        }

        const tokens = tokenizeRawPrompt(rawInput, true);
        const updatedCategories = JSON.parse(JSON.stringify(categories)) as typeof categories;

        // Clear existing tags in unlocked categories, preserve locked ones
        for (const item of CATEGORY_SCHEMA_16) {
            if (!updatedCategories[item.key].isLocked) {
                updatedCategories[item.key].tags = [];
            }
        }

        let parsedCount = 0;
        for (const token of tokens) {
            const catKey = classifyTag(token);
            if (!updatedCategories[catKey].isLocked) {
                updatedCategories[catKey].tags.push(token);
                parsedCount++;
            }
        }

        onUpdateSceneCategories(updatedCategories);
        onUpdateSceneRawPrompt(rawInput, rawNegativeInput);
        showToast(`✓ Berhasil mem-parse ${parsedCount} tag ke dalam 16 kategori!`);
    };

    // Category Toggle Lock
    const handleToggleLock = (catKey: CategoryKey) => {
        const updated = JSON.parse(JSON.stringify(categories)) as typeof categories;
        updated[catKey].isLocked = !updated[catKey].isLocked;
        onUpdateSceneCategories(updated);
        showToast(`Kategori [${CATEGORY_MAP[catKey].label}] ${updated[catKey].isLocked ? "Terkunci 🔒" : "Dinamis 🔓"}`);
    };

    // Category Toggle Enabled/Disabled
    const handleToggleEnabled = (catKey: CategoryKey) => {
        const updated = JSON.parse(JSON.stringify(categories)) as typeof categories;
        updated[catKey].isEnabled = !updated[catKey].isEnabled;
        onUpdateSceneCategories(updated);
        showToast(`Kategori [${CATEGORY_MAP[catKey].label}] ${updated[catKey].isEnabled ? "Diaktifkan" : "Dinonaktifkan"}`);
    };

    // Add Tag to Category
    const handleAddTag = (catKey: CategoryKey) => {
        const text = (newTagInputs[catKey] || "").trim();
        if (!text) return;

        const updated = JSON.parse(JSON.stringify(categories)) as typeof categories;
        const newTags = text.split(",").map((t) => t.trim()).filter(Boolean);

        for (const t of newTags) {
            updated[catKey].tags.push(parseTagItem(t));
        }

        onUpdateSceneCategories(updated);
        setNewTagInputs((prev) => ({ ...prev, [catKey]: "" }));
    };

    // Remove Tag from Category
    const handleRemoveTag = (catKey: CategoryKey, tagId: string) => {
        const updated = JSON.parse(JSON.stringify(categories)) as typeof categories;
        updated[catKey].tags = updated[catKey].tags.filter((t) => t.id !== tagId);
        onUpdateSceneCategories(updated);
    };

    // Toggle per-tag lock
    const handleToggleTagLock = (catKey: CategoryKey, tagId: string) => {
        const updated = JSON.parse(JSON.stringify(categories)) as typeof categories;
        const target = updated[catKey].tags.find((t) => t.id === tagId);
        if (target) {
            target.isLocked = !target.isLocked;
            onUpdateSceneCategories(updated);
        }
    };

    // Clear Category
    const handleClearCategory = (catKey: CategoryKey) => {
        const updated = JSON.parse(JSON.stringify(categories)) as typeof categories;
        updated[catKey].tags = [];
        onUpdateSceneCategories(updated);
        showToast(`Kategori [${CATEGORY_MAP[catKey].label}] dikosongkan.`);
    };

    // Reset Category to Master
    const handleResetCategoryToMaster = (catKey: CategoryKey) => {
        const masterCat = activeProfile.categories[catKey];
        if (!masterCat) return;
        const updated = JSON.parse(JSON.stringify(categories)) as typeof categories;
        updated[catKey].tags = JSON.parse(JSON.stringify(masterCat.tags));
        onUpdateSceneCategories(updated);
        showToast(`Kategori [${CATEGORY_MAP[catKey].label}] dipulihkan dari Master.`);
    };

    // Move tag to another category
    const handleMoveTagSubmit = () => {
        if (!movingTag) return;
        const { tag, sourceCategory } = movingTag;
        if (sourceCategory === targetCategory) {
            setMovingTag(null);
            return;
        }

        const updated = JSON.parse(JSON.stringify(categories)) as typeof categories;
        updated[sourceCategory].tags = updated[sourceCategory].tags.filter((t) => t.id !== tag.id);
        updated[targetCategory].tags.push(tag);
        onUpdateSceneCategories(updated);
        showToast(`Tag "${tag.raw}" dipindahkan ke [${CATEGORY_MAP[targetCategory].label}]`);
        setMovingTag(null);
    };

    return (
        <div className="pms-studio-grid">
            {/* LEFT / CENTER: RAW PARSER + 16 CATEGORIES */}
            <div className="pms-categories-container">
                {/* 1. Raw Prompt Auto-Parser Card */}
                <div className="pms-card">
                    <div className="pms-card-header">
                        <span className="pms-card-title">
                            <span>📥 Raw Prompt Auto-Parser</span>
                        </span>
                        <div className="pms-tag-count-bar">
                            <span>Total: <strong className="pms-count-badge">{stats.totalTags}</strong></span>
                            <span>·</span>
                            <span>Terkunci: <strong className="pms-count-badge">{stats.lockedCount}</strong></span>
                            <span>·</span>
                            <span>Belum Klasifikasi: <strong className="pms-count-badge unclassified">{stats.unclassifiedCount}</strong></span>
                            <span>·</span>
                            <span>Konflik: <strong className="pms-count-badge conflicts">{stats.conflictsCount}</strong></span>
                        </div>
                    </div>

                    <div className="pms-raw-input-wrapper">
                        <textarea
                            className="pms-textarea"
                            value={rawInput}
                            onChange={(e) => {
                                setRawInput(e.target.value);
                                if (autoParse) {
                                    onUpdateSceneRawPrompt(e.target.value, rawNegativeInput);
                                }
                            }}
                            placeholder="Tempel prompt positive mentah (e.g. masterpiece, (anime coloring:1.15), 1girl, tsukatsuki rio, red eyes, burgundy dress, standing in classroom...)"
                        />
                        <div className="pms-raw-toolbar">
                            <label className="pms-toggle-label">
                                <input
                                    type="checkbox"
                                    checked={autoParse}
                                    onChange={(e) => setAutoParse(e.target.checked)}
                                />
                                <span>Auto-parse saat mengetik</span>
                            </label>

                            <div style={{ display: "flex", gap: "8px" }}>
                                <button
                                    type="button"
                                    className="pms-btn primary"
                                    onClick={handleParseRawPrompt}
                                    title="Analisis dan kelompokkan tag ke 16 kategori"
                                >
                                    ⚡ Parse ke 16 Kategori
                                </button>
                                <button
                                    type="button"
                                    className="pms-btn"
                                    onClick={() => {
                                        setRawInput("");
                                        setRawNegativeInput("");
                                    }}
                                    title="Bersihkan input mentah"
                                >
                                    Bersihkan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Unclassified Tags Section (if any) */}
                {categories.custom_unclassified?.tags.length > 0 && (
                    <div className="pms-card" style={{ borderColor: "#d97706", background: "#1a160c" }}>
                        <div className="pms-card-header">
                            <span className="pms-card-title" style={{ color: "#fde68a" }}>
                                ⚠️ Tag Belum Terklasifikasi ({categories.custom_unclassified.tags.length})
                            </span>
                            <span style={{ fontSize: "11px", color: "#fcd34d" }}>
                                Klik tag untuk memindahkan ke kategori yang tepat tanpa menghilangkannya
                            </span>
                        </div>

                        <div className="pms-tag-list">
                            {categories.custom_unclassified.tags.map((tag) => (
                                <span
                                    key={tag.id}
                                    className="pms-tag-chip unclassified"
                                    style={{ cursor: "pointer" }}
                                    onClick={() => setMovingTag({ tag, sourceCategory: "custom_unclassified" })}
                                    title="Klik untuk pindahkan kategori"
                                >
                                    {tag.raw} ↗
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. The 16 Categories Grid */}
                <div className="pms-categories-grid">
                    {CATEGORY_SCHEMA_16.map((item) => {
                        const catKey = item.key;
                        const catState = categories[catKey] || { tags: [], isLocked: false, isEnabled: true };
                        const isLocked = catState.isLocked;
                        const isEnabled = catState.isEnabled;

                        return (
                            <div
                                key={catKey}
                                className={`pms-category-card ${isLocked ? "is-locked" : ""} ${!isEnabled ? "is-disabled" : ""}`}
                            >
                                <div className="pms-category-header">
                                    <div className="pms-cat-name-group">
                                        <span className="pms-cat-id-badge">#{item.id}</span>
                                        <span className="pms-cat-name" style={{ color: item.color }}>
                                            {item.label}
                                        </span>
                                    </div>

                                    <div className="pms-cat-actions">
                                        <button
                                            type="button"
                                            className={`pms-icon-toggle ${isLocked ? "locked" : ""}`}
                                            onClick={() => handleToggleLock(catKey)}
                                            title={isLocked ? "Terkunci: Nilai master melindungi dari penimpaan" : "Dinamis: Adegan dapat menimpa kategori ini"}
                                        >
                                            {isLocked ? "🔒 Locked" : "🔓 Dynamic"}
                                        </button>
                                        <button
                                            type="button"
                                            className={`pms-icon-toggle ${!isEnabled ? "disabled" : ""}`}
                                            onClick={() => handleToggleEnabled(catKey)}
                                            title={isEnabled ? "Kategori Aktif" : "Kategori Dinonaktifkan (dilewati)"}
                                        >
                                            {isEnabled ? "👁️" : "🚫"}
                                        </button>
                                    </div>
                                </div>

                                {/* Tag Chips */}
                                <div className="pms-tag-list">
                                    {catState.tags.length === 0 ? (
                                        <span style={{ fontSize: "11px", color: "#64748b", fontStyle: "italic" }}>
                                            Tidak ada tag (kosong)
                                        </span>
                                    ) : (
                                        catState.tags.map((tag) => (
                                            <span
                                                key={tag.id}
                                                className={`pms-tag-chip ${tag.isLocked ? "locked" : ""}`}
                                            >
                                                <span
                                                    onClick={() => handleToggleTagLock(catKey, tag.id)}
                                                    style={{ cursor: "pointer" }}
                                                    title={tag.isLocked ? "Tag terkunci (klik untuk buka)" : "Tag bebas (klik untuk kunci)"}
                                                >
                                                    {tag.isLocked ? "🔒" : ""} {formatTagString(tag)}
                                                </span>
                                                <button
                                                    type="button"
                                                    className="pms-tag-remove-btn"
                                                    onClick={() => handleRemoveTag(catKey, tag.id)}
                                                    title="Hapus tag"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))
                                    )}
                                </div>

                                {/* Add Tag Row */}
                                <div className="pms-tag-input-row">
                                    <input
                                        type="text"
                                        className="pms-input-sm"
                                        value={newTagInputs[catKey] || ""}
                                        onChange={(e) => setNewTagInputs((prev) => ({ ...prev, [catKey]: e.target.value }))}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleAddTag(catKey);
                                            }
                                        }}
                                        placeholder={`+ Tambah tag (${item.shortLabel})`}
                                    />
                                    <button
                                        type="button"
                                        className="pms-btn"
                                        style={{ padding: "4px 8px", fontSize: "11px" }}
                                        onClick={() => handleAddTag(catKey)}
                                    >
                                        +
                                    </button>
                                </div>

                                {/* Bottom Quick Actions */}
                                <div className="pms-cat-quick-actions">
                                    <span>{catState.tags.length} tag</span>
                                    <div style={{ display: "flex", gap: "8px" }}>
                                        <button
                                            type="button"
                                            className="pms-link-btn"
                                            onClick={() => handleResetCategoryToMaster(catKey)}
                                            title="Pulihkan nilai dari Master Profile"
                                        >
                                            Reset ke Master
                                        </button>
                                        <button
                                            type="button"
                                            className="pms-link-btn danger"
                                            onClick={() => handleClearCategory(catKey)}
                                            title="Kosongkan kategori ini"
                                        >
                                            Kosongkan
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* RIGHT PANEL: LIVE PROMPT PREVIEW & DIAGNOSTICS */}
            <aside className="pms-preview-sticky">
                {/* Positive Prompt Reconstructed Preview */}
                <div className="pms-card">
                    <div className="pms-card-header">
                        <span className="pms-card-title">✨ Final Positive Prompt</span>
                        <button
                            type="button"
                            className="pms-btn primary"
                            style={{ padding: "3px 8px", fontSize: "11px" }}
                            onClick={() => handleCopy(mergeResult.positivePrompt, "copy-pos", "Prompt Positive Tersalin!")}
                        >
                            {copiedKey === "copy-pos" ? "✓ Tersalin" : "Salin"}
                        </button>
                    </div>

                    <div className="pms-preview-box">
                        {mergeResult.positivePrompt || "(Prompt masih kosong)"}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "#94a3b8" }}>
                        <span>Estimasi Token: ~{Math.ceil(mergeResult.positivePrompt.split(",").length * 1.35)}</span>
                        {onApplyToCanvas && (
                            <button
                                type="button"
                                className="pms-btn success"
                                style={{ padding: "4px 10px" }}
                                onClick={() => {
                                    onApplyToCanvas(mergeResult.positivePrompt, mergeResult.negativePrompt);
                                    showToast("✓ Prompt dikirim ke Prompt Lab Canvas!");
                                }}
                            >
                                🚀 Apply to Canvas
                            </button>
                        )}
                    </div>
                </div>

                {/* Negative Prompt Reconstructed Preview */}
                <div className="pms-card">
                    <div className="pms-card-header">
                        <span className="pms-card-title">🛡️ Final Negative Prompt</span>
                        <button
                            type="button"
                            className="pms-btn"
                            style={{ padding: "3px 8px", fontSize: "11px" }}
                            onClick={() => handleCopy(mergeResult.negativePrompt, "copy-neg", "Prompt Negative Tersalin!")}
                        >
                            {copiedKey === "copy-neg" ? "✓ Tersalin" : "Salin"}
                        </button>
                    </div>

                    <div className="pms-preview-box negative">
                        {mergeResult.negativePrompt || "(Negative prompt kosong)"}
                    </div>
                </div>

                {/* Conflicts & Diagnostics Drawer */}
                {mergeResult.diagnostics.conflicts.length > 0 && (
                    <div className="pms-card" style={{ borderColor: "#dc2626", background: "#1f0f12" }}>
                        <div className="pms-card-header">
                            <span className="pms-card-title" style={{ color: "#fca5a5" }}>
                                ⚠️ Laporan Konflik ({mergeResult.diagnostics.conflicts.length})
                            </span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
                            {mergeResult.diagnostics.conflicts.map((c, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        fontSize: "11px",
                                        padding: "6px 8px",
                                        background: "#2a1519",
                                        border: "1px solid #7f1d1d",
                                        borderRadius: "4px",
                                        color: "#fecaca",
                                    }}
                                >
                                    <strong>[{c.categoryLabel}]</strong>: Master "<em>{c.masterValue}</em>" vs Adegan "<em>{c.sceneValue}</em>"
                                    <div style={{ color: "#94a3b8", fontSize: "10.5px", marginTop: "2px" }}>
                                        Resolusi: {c.resolution} ({c.reason})
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </aside>

            {/* Modal: Move Tag to Another Category */}
            {movingTag && (
                <div className="pms-modal-backdrop" onClick={() => setMovingTag(null)}>
                    <div className="pms-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="pms-modal-header">
                            <span className="pms-modal-title">Pindahkan Tag ke Kategori</span>
                            <button
                                type="button"
                                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "16px" }}
                                onClick={() => setMovingTag(null)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="pms-modal-body">
                            <p style={{ margin: 0, fontSize: "12px", color: "#cbd5e1" }}>
                                Tag yang dipilih: <strong>{movingTag.tag.raw}</strong>
                            </p>
                            <label className="pms-field-label">Pilih Kategori Tujuan:</label>
                            <select
                                className="pms-select"
                                value={targetCategory}
                                onChange={(e) => setTargetCategory(e.target.value as CategoryKey)}
                            >
                                {CATEGORY_SCHEMA_16.map((cat) => (
                                    <option key={cat.key} value={cat.key}>
                                        #{cat.id} - {cat.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="pms-modal-footer">
                            <button type="button" className="pms-btn" onClick={() => setMovingTag(null)}>
                                Batal
                            </button>
                            <button type="button" className="pms-btn primary" onClick={handleMoveTagSubmit}>
                                Pindahkan Tag
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
