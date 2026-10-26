import React, { useState } from "react";
import {
    type MasterProfile,
    type MergePolicy,
    type MergePromptResult,
    type StoryboardScene,
} from "../../types/promptMatrixStudio";
import {
    parsePromptToCategoryMap,
    reconstructPrompt,
} from "../../services/deterministicMatrixEngine";
import {
    SCENE_PRESET_TEMPLATES,
    applyPresetToScene,
    resetAllSceneToMaster,
} from "../../services/matrixStorageService";

interface MergerStoryboardViewProps {
    masterProfile: MasterProfile;
    activeScene: StoryboardScene;
    scenes: StoryboardScene[];
    mergeResult: MergePromptResult;
    onUpdateScene: (scene: StoryboardScene) => void;
    onAddScene: (title?: string) => void;
    onDuplicateScene: (sceneId: string) => void;
    onDeleteScene: (sceneId: string) => void;
    onUpdateMasterProfile: (profile: MasterProfile) => void;
    onApplyToCanvas?: (positive: string, negative: string) => void;
    showToast: (msg: string) => void;
}

export const MergerStoryboardView: React.FC<MergerStoryboardViewProps> = ({
    masterProfile,
    activeScene,
    scenes,
    mergeResult,
    onUpdateScene,
    onAddScene,
    onDuplicateScene,
    onDeleteScene,
    onUpdateMasterProfile,
    onApplyToCanvas,
    showToast,
}) => {
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [sceneTitleEdit, setSceneTitleEdit] = useState<string>(activeScene.title);
    const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);

    // Dual-prompt inputs for Master (Prompt 1) vs Scene (Prompt 2)
    const [prompt1Input, setPrompt1Input] = useState<string>(() =>
        reconstructPrompt(masterProfile.categories, masterProfile.categoryOrder)
    );
    const [prompt2Input, setPrompt2Input] = useState<string>(
        activeScene.rawPositive || reconstructPrompt(activeScene.categories, activeScene.categoryOrder)
    );

    const [prevProfileId, setPrevProfileId] = useState(masterProfile.id);
    const [prevSceneId, setPrevSceneId] = useState(activeScene.id);

    if (masterProfile.id !== prevProfileId) {
        setPrevProfileId(masterProfile.id);
        setPrompt1Input(reconstructPrompt(masterProfile.categories, masterProfile.categoryOrder));
    }

    if (activeScene.id !== prevSceneId) {
        setPrevSceneId(activeScene.id);
        setPrompt2Input(
            activeScene.rawPositive || reconstructPrompt(activeScene.categories, activeScene.categoryOrder)
        );
        setSceneTitleEdit(activeScene.title);
    }

    const handleApplyPrompt1 = () => {
        if (!prompt1Input.trim()) return;
        const newCatMap = parsePromptToCategoryMap(prompt1Input);
        onUpdateMasterProfile({
            ...masterProfile,
            categories: newCatMap,
            updatedAt: Date.now(),
        });
        showToast("✓ Prompt 1 (Master) diperbarui & di-parse ke 16 Kategori!");
    };

    const handleApplyPrompt2 = () => {
        if (!prompt2Input.trim()) return;
        const newCatMap = parsePromptToCategoryMap(prompt2Input);
        onUpdateScene({
            ...activeScene,
            rawPositive: prompt2Input,
            categories: newCatMap,
            updatedAt: Date.now(),
        });
        showToast("✓ Prompt 2 (Adegan) diperbarui & digabungkan dengan Master!");
    };

    // Helper for clipboard copy
    const handleCopy = (text: string, key: string, label = "Tersalin ke clipboard!") => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        showToast(label);
        setTimeout(() => setCopiedKey(null), 1800);
    };

    // Copy both positive and negative prompts
    const handleCopyBoth = () => {
        const text = `Positive Prompt:\n${mergeResult.positivePrompt}\n\nNegative Prompt:\n${mergeResult.negativePrompt}`;
        handleCopy(text, "copy-both", "Kedua prompt (Positive & Negative) berhasil disalin!");
    };

    // Download scene JSON
    const handleDownloadSceneJSON = () => {
        const sceneData = {
            scene: activeScene,
            masterReference: {
                id: masterProfile.id,
                name: masterProfile.name,
            },
            compiledResult: {
                positivePrompt: mergeResult.positivePrompt,
                negativePrompt: mergeResult.negativePrompt,
                diagnostics: mergeResult.diagnostics,
            },
        };
        const blob = new Blob([JSON.stringify(sceneData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Scene_${activeScene.id}_${activeScene.title.replace(/\s+/g, "_")}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("✓ Scene JSON berhasil diunduh!");
    };

    // Change merge policy
    const handleSelectPolicy = (policy: MergePolicy) => {
        const updated: StoryboardScene = { ...activeScene, mergePolicy: policy, updatedAt: Date.now() };
        onUpdateScene(updated);
        showToast(`Kebijakan penggabungan diubah ke: ${policy.toUpperCase()}`);
    };

    // Apply a scene preset
    const handleApplyPreset = (presetId: string) => {
        const preset = SCENE_PRESET_TEMPLATES.find((p) => p.id === presetId);
        if (!preset) return;
        const updated = applyPresetToScene(activeScene, preset);
        onUpdateScene(updated);
        showToast(`✓ Template preset "${preset.title}" diterapkan ke adegan!`);
    };

    // Reset scene to master
    const handleResetToMaster = () => {
        const confirmed = window.confirm(
            `Apakah Anda yakin ingin mengatur ulang adegan "${activeScene.title}" ke nilai Master? Semua modifikasi tak terkunci akan diatur ulang.`
        );
        if (!confirmed) return;
        const updated = resetAllSceneToMaster(activeScene, masterProfile);
        onUpdateScene(updated);
        showToast("✓ Nilai adegan diatur ulang mengikuti Master Profile!");
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Top Toolbar: Active Scene Selector & Scene CRUD */}
            <div className="pms-card">
                <div className="pms-card-header">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span className="pms-card-title">🎬 Pengaturan Adegan Aktif</span>
                        {isEditingTitle ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <input
                                    type="text"
                                    className="pms-input-sm"
                                    value={sceneTitleEdit}
                                    onChange={(e) => setSceneTitleEdit(e.target.value)}
                                    onBlur={() => {
                                        onUpdateScene({ ...activeScene, title: sceneTitleEdit });
                                        setIsEditingTitle(false);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            onUpdateScene({ ...activeScene, title: sceneTitleEdit });
                                            setIsEditingTitle(false);
                                        }
                                    }}
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    className="pms-btn primary"
                                    style={{ padding: "3px 8px" }}
                                    onClick={() => {
                                        onUpdateScene({ ...activeScene, title: sceneTitleEdit });
                                        setIsEditingTitle(false);
                                    }}
                                >
                                    Simpan
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <strong style={{ color: "#38bdf8", fontSize: "13px" }}>{activeScene.title}</strong>
                                <button
                                    type="button"
                                    className="pms-link-btn"
                                    onClick={() => {
                                        setSceneTitleEdit(activeScene.title);
                                        setIsEditingTitle(true);
                                    }}
                                    title="Ubah judul adegan"
                                >
                                    ✏️ Ganti Nama
                                </button>
                            </div>
                        )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <button
                            type="button"
                            className="pms-btn primary"
                            onClick={() => onAddScene()}
                            title="Tambah adegan baru"
                        >
                            + Tambah Adegan ({scenes.length})
                        </button>
                        <button
                            type="button"
                            className="pms-btn"
                            onClick={() => onDuplicateScene(activeScene.id)}
                            title="Duplikat adegan ini menjadi adegan baru (independen)"
                        >
                            📋 Duplikat
                        </button>
                        {scenes.length > 1 && (
                            <button
                                type="button"
                                className="pms-btn"
                                onClick={() => onDeleteScene(activeScene.id)}
                                title="Hapus adegan ini"
                            >
                                🗑️ Hapus
                            </button>
                        )}
                        <button
                            type="button"
                            className="pms-btn"
                            onClick={handleResetToMaster}
                            title="Reset semua atribut tak terkunci ke Master"
                        >
                            ↺ Reset ke Master
                        </button>
                        <button
                            type="button"
                            className="pms-btn"
                            onClick={handleDownloadSceneJSON}
                            title="Unduh konfigurasi adegan ini sebagai JSON"
                        >
                            📥 Unduh JSON
                        </button>
                    </div>
                </div>

                {/* Quick Presets Picker */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingTop: "8px", borderTop: "1px solid #23242c" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8" }}>
                        PILIH TEMPLATE PRESET ADEGAN CEPAT (STORYBOARD TEMPLATES):
                    </span>
                    <div className="pms-preset-grid">
                        {SCENE_PRESET_TEMPLATES.map((preset) => (
                            <div
                                key={preset.id}
                                className="pms-preset-card"
                                onClick={() => handleApplyPreset(preset.id)}
                                title={`Terapkan template "${preset.title}" ke adegan aktif`}
                            >
                                <span className="pms-preset-title">{preset.title}</span>
                                <span className="pms-preset-desc">{preset.description}</span>
                                <span className="pms-preset-snippet">{preset.promptSnippet}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* DUAL PROMPT MERGER INTERFACE (PROMPT 1 MASTER vs PROMPT 2 ADEGAN) */}
            <div className="pms-card" style={{ border: "1px solid #0284c7" }}>
                <div className="pms-card-header">
                    <span className="pms-card-title" style={{ color: "#38bdf8" }}>
                        ⚡ Komparasi &amp; Penggabungan Dua Prompt (Prompt 1 Master vs Prompt 2 Adegan)
                    </span>
                    <span className="pms-stat-pill info">
                        Foto 1 (Master Lock) + Foto 2 (Donor Aksi Baru)
                    </span>
                </div>

                <div className="pms-merger-grid">
                    {/* Kotak Prompt 1: Master Profile (Foto 1) */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span className="pms-field-label" style={{ color: "#4ade80" }}>
                                👑 PROMPT 1: MASTER / KARAKTER &amp; GAYA (FOTO 1)
                            </span>
                            <span style={{ fontSize: "10.5px", color: "#4ade80" }}>🔒 Karakter &amp; Baju Terkunci</span>
                        </div>
                        <textarea
                            className="pms-textarea"
                            style={{ minHeight: "110px", borderColor: "#166534" }}
                            value={prompt1Input}
                            onChange={(e) => setPrompt1Input(e.target.value)}
                            placeholder="Prompt 1 (Karakter, gaya anime, baju, pencahayaan dari Foto 1)..."
                        />
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "10.5px", color: "#94a3b8" }}>
                                Profil: <strong>{masterProfile.name}</strong>
                            </span>
                            <button
                                type="button"
                                className="pms-btn success"
                                style={{ padding: "4px 10px" }}
                                onClick={handleApplyPrompt1}
                                title="Perbarui Master Profile dengan prompt ini dan ekstrak ke 16 kategori"
                            >
                                ⚡ Terapkan ke Master
                            </button>
                        </div>
                    </div>

                    {/* Kotak Prompt 2: Scene / Adegan Baru (Foto 2) */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span className="pms-field-label" style={{ color: "#38bdf8" }}>
                                🎬 PROMPT 2: ADEGAN BARU / AKSI DONOR (FOTO 2)
                            </span>
                            <span style={{ fontSize: "10.5px", color: "#38bdf8" }}>⚡ Pose, Ekspresi &amp; Pintu Baru</span>
                        </div>
                        <textarea
                            className="pms-textarea"
                            style={{ minHeight: "110px", borderColor: "#0369a1" }}
                            value={prompt2Input}
                            onChange={(e) => setPrompt2Input(e.target.value)}
                            placeholder="Prompt 2 (Aksi baru, pose masuk pintu, pegang pintu dari Foto 2)..."
                        />
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "10.5px", color: "#94a3b8" }}>
                                Adegan: <strong>{activeScene.title}</strong>
                            </span>
                            <button
                                type="button"
                                className="pms-btn primary"
                                style={{ padding: "4px 10px" }}
                                onClick={handleApplyPrompt2}
                                title="Perbarui Adegan aktif dengan prompt ini dan gabungkan dengan Master"
                            >
                                ⚡ Terapkan ke Adegan
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Merge Policy Selector Card */}
            <div className="pms-policy-selector-card">
                <div className="pms-card-header">
                    <span className="pms-card-title">⚖️ Kebijakan Penggabungan (Deterministic Merge Policy)</span>
                    <span style={{ fontSize: "11.5px", color: "#38bdf8" }}>
                        Kategori Terkunci Master (🔒) Selalu Terlindungi di Semua Kebijakan
                    </span>
                </div>

                <div className="pms-policy-options">
                    <div
                        className={`pms-policy-btn ${activeScene.mergePolicy === "master_first" ? "active" : ""}`}
                        onClick={() => handleSelectPolicy("master_first")}
                    >
                        <span className="pms-policy-title">👑 Master First (Default Rekomendasi)</span>
                        <span className="pms-policy-desc">
                            Pertahankan seluruh tag master. Tambahkan tag unik adegan. Nilai master terkunci menolak penimpaan konflik.
                        </span>
                    </div>

                    <div
                        className={`pms-policy-btn ${activeScene.mergePolicy === "scene_first" ? "active" : ""}`}
                        onClick={() => handleSelectPolicy("scene_first")}
                    >
                        <span className="pms-policy-title">🎬 Scene First (Prioritas Adegan)</span>
                        <span className="pms-policy-desc">
                            Nilai adegan diutamakan untuk kategori tak terkunci. Master lock tetap melindungi identitas karakter.
                        </span>
                    </div>

                    <div
                        className={`pms-policy-btn ${activeScene.mergePolicy === "master_plus_scene" ? "active" : ""}`}
                        onClick={() => handleSelectPolicy("master_plus_scene")}
                    >
                        <span className="pms-policy-title">🔗 Master + Scene (Koeksistensi)</span>
                        <span className="pms-policy-desc">
                            Pertahankan kedua tag bila tidak ada pertentangan. Selesaikan konflik berdasarkan aturan kunci.
                        </span>
                    </div>

                    <div
                        className={`pms-policy-btn ${activeScene.mergePolicy === "scene_override" ? "active" : ""}`}
                        onClick={() => handleSelectPolicy("scene_override")}
                    >
                        <span className="pms-policy-title">⚡ Scene Override (Ganti Total)</span>
                        <span className="pms-policy-desc">
                            Ganti total isi kategori tak terkunci dengan nilai adegan. Master lock tetap utuh.
                        </span>
                    </div>
                </div>
            </div>

            {/* Style Consistency Warnings (if any) */}
            {mergeResult.diagnostics.styleWarnings.length > 0 && (
                <div className="pms-card" style={{ borderColor: "#f59e0b", background: "#1c160c" }}>
                    <div className="pms-card-header">
                        <span className="pms-card-title" style={{ color: "#fde68a" }}>
                            🎨 Peringatan Konsistensi Gaya Visual Anime ({mergeResult.diagnostics.styleWarnings.length})
                        </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {mergeResult.diagnostics.styleWarnings.map((warn, i) => (
                            <div key={i} style={{ fontSize: "11.5px", color: "#fef3c7" }}>
                                • {warn}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Side-by-Side Result & Conflict Report */}
            <div className="pms-merger-grid">
                {/* Final Reconstructed Prompts */}
                <div className="pms-card">
                    <div className="pms-card-header">
                        <span className="pms-card-title">📝 Hasil Rekonstruksi Prompt Deterministik</span>
                        <div style={{ display: "flex", gap: "6px" }}>
                            <button
                                type="button"
                                className="pms-btn primary"
                                onClick={() => handleCopy(mergeResult.positivePrompt, "pos", "Positive Prompt Tersalin!")}
                            >
                                {copiedKey === "pos" ? "✓ Tersalin" : "Salin Positif"}
                            </button>
                            <button
                                type="button"
                                className="pms-btn"
                                onClick={handleCopyBoth}
                            >
                                {copiedKey === "copy-both" ? "✓ Keduanya Tersalin" : "Salin Keduanya"}
                            </button>
                        </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <span className="pms-field-label">Positive Prompt (Tersusun 16 Kategori):</span>
                        <div className="pms-preview-box">
                            {mergeResult.positivePrompt}
                        </div>

                        <span className="pms-field-label">Negative Prompt:</span>
                        <div className="pms-preview-box negative">
                            {mergeResult.negativePrompt}
                        </div>

                        {onApplyToCanvas && (
                            <button
                                type="button"
                                className="pms-btn success"
                                style={{ alignSelf: "flex-start", marginTop: "4px" }}
                                onClick={() => {
                                    onApplyToCanvas(mergeResult.positivePrompt, mergeResult.negativePrompt);
                                    showToast("✓ Prompt dikirim ke Prompt Lab Canvas!");
                                }}
                            >
                                🚀 Terapkan ke Canvas Studio
                            </button>
                        )}
                    </div>
                </div>

                {/* Conflict & Resolution Report */}
                <div className="pms-card">
                    <div className="pms-card-header">
                        <span className="pms-card-title">🔍 Laporan Deteksi &amp; Resolusi Konflik</span>
                        <span className="pms-stat-pill info">
                            {mergeResult.diagnostics.conflicts.length} Konflik
                        </span>
                    </div>

                    {mergeResult.diagnostics.conflicts.length === 0 ? (
                        <div style={{ padding: "20px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
                            ✓ Tidak ada konflik nilai yang terdeteksi. Seluruh atribut adegan harmonis dengan master.
                        </div>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table className="pms-conflict-table">
                                <thead>
                                    <tr>
                                        <th>Kategori</th>
                                        <th>Master</th>
                                        <th>Adegan</th>
                                        <th>Status / Resolusi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mergeResult.diagnostics.conflicts.map((c, i) => (
                                        <tr key={i}>
                                            <td style={{ color: "#38bdf8", fontWeight: 600 }}>{c.categoryLabel}</td>
                                            <td style={{ color: "#a7f3d0" }}>{c.masterValue}</td>
                                            <td style={{ color: "#fde68a" }}>{c.sceneValue}</td>
                                            <td>
                                                <span className={`pms-pill ${c.lockPreventedOverride ? "locked" : "overridden"}`}>
                                                    {c.lockPreventedOverride ? "🔒 Locked Shield" : "⚡ Overridden"}
                                                </span>
                                                <div style={{ fontSize: "10.5px", color: "#94a3b8", marginTop: "2px" }}>
                                                    {c.resolution}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
