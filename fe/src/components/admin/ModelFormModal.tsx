import React, { useState } from "react";
import type { Model, ModelVersion } from "../../api/models";
import type { CreateModelPayload } from "../../api/admin";

interface ModelFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (payload: CreateModelPayload, modelId?: number) => Promise<void>;
    initialData?: Model | null;
}

type TabType = "general" | "media" | "specs" | "triggers" | "versions";

export const ModelFormModal: React.FC<ModelFormModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
}) => {
    const isEdit = !!initialData;
    const [activeTab, setActiveTab] = useState<TabType>("general");
    const [isSaving, setIsSaving] = useState(false);

    // Form fields
    const [name, setName] = useState(initialData?.name || "");
    const [slug, setSlug] = useState(initialData?.slug || "");
    const [type, setType] = useState(initialData?.type || "checkpoint");
    const [baseModel, setBaseModel] = useState(initialData?.base_model || "Illustrious");
    const [author, setAuthor] = useState(initialData?.author || "");
    const [description, setDescription] = useState(initialData?.description || "");

    // Media & links (thumbnail is automatically managed via sample images)
    const thumbnailUrl = initialData?.thumbnail_url || "";
    const [sourceUrl, setSourceUrl] = useState(initialData?.source_url || "");
    const [civitaiUrl, setCivitaiUrl] = useState(initialData?.civitai_url || "");
    const [huggingfaceUrl, setHuggingfaceUrl] = useState(initialData?.huggingface_url || "");

    // Hardware specs
    const [tensorSize, setTensorSize] = useState(initialData?.tensor_size || "6.46 GB");
    const [vramMin, setVramMin] = useState(initialData?.vram_min || "8 GB");
    const [vramRecommended, setVramRecommended] = useState(initialData?.vram_recommended || "12 GB");
    const [conditioner, setConditioner] = useState(initialData?.conditioner?.toString() || "");
    const [firstStageModel, setFirstStageModel] = useState(initialData?.first_stage_model?.toString() || "");
    const [modelTensor, setModelTensor] = useState(initialData?.model_tensor?.toString() || "");

    // Trigger words
    const [triggerWords, setTriggerWords] = useState<string[]>(() => {
        if (!initialData?.trigger_words) return [];
        return initialData.trigger_words.map((tw) => (typeof tw === "string" ? tw : tw.trigger_word));
    });
    const [triggerWordInput, setTriggerWordInput] = useState("");

    // Tags
    const [tagsInput, setTagsInput] = useState<string>(() => {
        if (!initialData?.tags) return "";
        return initialData.tags.map((t) => (typeof t === "string" ? t : t.name)).join(", ");
    });

    // Versions
    const [versions, setVersions] = useState<Partial<ModelVersion>[]>(() => {
        if (initialData?.versions && initialData.versions.length > 0) {
            return initialData.versions;
        }
        return [
            {
                version_name: "v1.0",
                version_number: "1.0",
                format: "SafeTensors",
                download_url: "",
            },
        ];
    });

    if (!isOpen) return null;

    // Helper to auto-generate slug from name if not manually modified
    const handleNameChange = (val: string) => {
        setName(val);
        if (!isEdit && (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, "-"))) {
            setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
        }
    };

    const handleAddTriggerWord = () => {
        const trimmed = triggerWordInput.trim();
        if (trimmed && !triggerWords.includes(trimmed)) {
            setTriggerWords([...triggerWords, trimmed]);
            setTriggerWordInput("");
        }
    };

    const handleRemoveTriggerWord = (index: number) => {
        setTriggerWords(triggerWords.filter((_, i) => i !== index));
    };

    const handleAddVersion = () => {
        setVersions([
            ...versions,
            {
                version_name: `v${versions.length + 1}.0`,
                version_number: `${versions.length + 1}.0`,
                format: "SafeTensors",
                download_url: "",
            },
        ]);
    };

    const handleUpdateVersion = (index: number, field: string, value: string | number) => {
        const updated = [...versions];
        updated[index] = { ...updated[index], [field]: value };
        setVersions(updated);
    };

    const handleUpdateRecSetting = (index: number, field: string, value: string | number | undefined) => {
        const updated = [...versions];
        const prev = updated[index].recommended_settings || {};
        updated[index] = {
            ...updated[index],
            recommended_settings: { ...prev, [field]: value === "" ? undefined : value },
        };
        setVersions(updated);
    };

    const handleRemoveVersion = (index: number) => {
        setVersions(versions.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !type || !baseModel) {
            alert("Harap lengkapi Nama Model, Tipe, dan Base Model!");
            return;
        }

        const tagsList = tagsInput
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t.length > 0);

        const payload: CreateModelPayload = {
            name: name.trim(),
            slug: slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            type,
            base_model: baseModel,
            author: author.trim(),
            description: description.trim(),
            thumbnail_url: thumbnailUrl.trim(),
            source_url: sourceUrl.trim(),
            civitai_url: civitaiUrl.trim(),
            huggingface_url: huggingfaceUrl.trim(),
            tensor_size: tensorSize.trim(),
            vram_min: vramMin.trim(),
            vram_recommended: vramRecommended.trim(),
            conditioner: conditioner ? parseInt(conditioner, 10) : undefined,
            first_stage_model: firstStageModel ? parseInt(firstStageModel, 10) : undefined,
            model_tensor: modelTensor ? parseInt(modelTensor, 10) : undefined,
            trigger_words: triggerWords,
            tags: tagsList,
            versions: versions,
        };

        try {
            setIsSaving(true);
            await onSubmit(payload, initialData?.id);
            onClose();
        } catch (error) {
            console.error("Error submitting model form:", error);
            alert("Terjadi kesalahan saat menyimpan model.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="admin-modal-backdrop" onClick={onClose}>
            <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="admin-modal-header">
                    <h2 className="admin-modal-title">
                        {isEdit ? `✏️ Edit Model: ${initialData.name}` : "✨ Tambah Model Baru"}
                    </h2>
                    <button className="admin-modal-close" onClick={onClose}>
                        ✕
                    </button>
                </div>

                {/* Tabs */}
                <div className="admin-tabs">
                    <button
                        type="button"
                        className={`admin-tab-btn ${activeTab === "general" ? "active" : ""}`}
                        onClick={() => setActiveTab("general")}
                    >
                        Informasi Utama
                    </button>
                    <button
                        type="button"
                        className={`admin-tab-btn ${activeTab === "media" ? "active" : ""}`}
                        onClick={() => setActiveTab("media")}
                    >
                        Media & Link
                    </button>
                    <button
                        type="button"
                        className={`admin-tab-btn ${activeTab === "specs" ? "active" : ""}`}
                        onClick={() => setActiveTab("specs")}
                    >
                        Hardware & Tensor
                    </button>
                    <button
                        type="button"
                        className={`admin-tab-btn ${activeTab === "triggers" ? "active" : ""}`}
                        onClick={() => setActiveTab("triggers")}
                    >
                        Trigger Words & Tags
                    </button>
                    <button
                        type="button"
                        className={`admin-tab-btn ${activeTab === "versions" ? "active" : ""}`}
                        onClick={() => setActiveTab("versions")}
                    >
                        Versi ({versions.length})
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                    <div className="admin-modal-body">
                        {/* TAB 1: GENERAL INFO */}
                        {activeTab === "general" && (
                            <div>
                                <div className="form-grid-2">
                                    <div className="form-group">
                                        <label className="form-label">
                                            Nama Model <span className="required">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="contoh: Animagine XL 3.1"
                                            value={name}
                                            onChange={(e) => handleNameChange(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">
                                            Slug URL <span className="helper">(auto-generated)</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="animagine-xl-3-1"
                                            value={slug}
                                            onChange={(e) => setSlug(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="form-grid-3">
                                    <div className="form-group">
                                        <label className="form-label">
                                            Tipe Model <span className="required">*</span>
                                        </label>
                                        <select
                                            className="form-select"
                                            value={type}
                                            onChange={(e) => setType(e.target.value)}
                                        >
                                            <option value="checkpoint">Checkpoint</option>
                                            <option value="lora">LoRA</option>
                                            <option value="vae">VAE</option>
                                            <option value="embedding">Textual Inversion / Embedding</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">
                                            Base Model Architecture <span className="required">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Illustrious, NoobAI, SDXL, Pony, SD 1.5, Flux"
                                            value={baseModel}
                                            onChange={(e) => setBaseModel(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Creator / Author</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="contoh: Linaqruf"
                                            value={author}
                                            onChange={(e) => setAuthor(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Deskripsi Lengkap & Panduan Penggunaan</label>
                                    <textarea
                                        className="form-textarea"
                                        rows={5}
                                        placeholder="Tulis ringkasan model, kelebihan, gaya yang cocok, atau rekomendasi penggunaan..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* TAB 2: EXTERNAL LINKS */}
                        {activeTab === "media" && (
                            <div>
                                <div
                                    style={{
                                        background: "rgba(28, 126, 214, 0.08)",
                                        border: "1px solid rgba(28, 126, 214, 0.25)",
                                        borderRadius: "8px",
                                        padding: "14px 16px",
                                        marginBottom: "16px",
                                        display: "flex",
                                        gap: "12px",
                                        alignItems: "flex-start",
                                    }}
                                >
                                    <span style={{ fontSize: "20px" }}>🖼️</span>
                                    <div style={{ fontSize: "12px", color: "var(--text)", lineHeight: "1.6" }}>
                                        <strong style={{ color: "var(--heading)", display: "block", marginBottom: "2px" }}>
                                            Manajemen Gambar Sampel Terpisah
                                        </strong>
                                        Foto/gambar sampel generasi AI tidak diinput saat membuat model. Setelah model berhasil dibuat, Anda dapat menambahkan gambar lengkap dengan parameter <em>Generation Details</em> (Prompt, Seed, Sampler, Resolution, dll.) melalui tombol <strong>🖼️ Kelola Gambar</strong> di Dashboard. Foto pertama akan otomatis menjadi thumbnail model.
                                    </div>
                                </div>

                                <div className="form-grid-2">
                                    <div className="form-group">
                                        <label className="form-label">Civitai URL</label>
                                        <input
                                            type="url"
                                            className="form-input"
                                            placeholder="https://civitai.com/models/..."
                                            value={civitaiUrl}
                                            onChange={(e) => setCivitaiUrl(e.target.value)}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Hugging Face URL</label>
                                        <input
                                            type="url"
                                            className="form-input"
                                            placeholder="https://huggingface.co/..."
                                            value={huggingfaceUrl}
                                            onChange={(e) => setHuggingfaceUrl(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Source URL / Download Mirror Asli</label>
                                    <input
                                        type="url"
                                        className="form-input"
                                        placeholder="https://..."
                                        value={sourceUrl}
                                        onChange={(e) => setSourceUrl(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* TAB 3: SPECS & HARDWARE */}
                        {activeTab === "specs" && (
                            <div>
                                <div className="form-grid-3">
                                    <div className="form-group">
                                        <label className="form-label">Ukuran Model (Tensor Size)</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="contoh: 6.46 GB atau 220 MB"
                                            value={tensorSize}
                                            onChange={(e) => setTensorSize(e.target.value)}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">VRAM Minimum</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="contoh: 6 GB / 8 GB"
                                            value={vramMin}
                                            onChange={(e) => setVramMin(e.target.value)}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">VRAM Rekomendasi</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="contoh: 12 GB / 16 GB"
                                            value={vramRecommended}
                                            onChange={(e) => setVramRecommended(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="form-grid-3">
                                    <div className="form-group">
                                        <label className="form-label">Conditioner Blocks</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            placeholder="0"
                                            value={conditioner}
                                            onChange={(e) => setConditioner(e.target.value)}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">First Stage Model</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            placeholder="0"
                                            value={firstStageModel}
                                            onChange={(e) => setFirstStageModel(e.target.value)}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Model Tensor</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            placeholder="0"
                                            value={modelTensor}
                                            onChange={(e) => setModelTensor(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 4: TRIGGER WORDS & TAGS */}
                        {activeTab === "triggers" && (
                            <div>
                                <div className="form-group">
                                    <label className="form-label">
                                        Trigger Words <span className="helper">(Ketik lalu tekan Enter)</span>
                                    </label>
                                    <div className="chips-input-container">
                                        {triggerWords.map((tw, idx) => (
                                            <span key={idx} className="chip">
                                                <code>{tw}</code>
                                                <button
                                                    type="button"
                                                    className="chip-remove"
                                                    onClick={() => handleRemoveTriggerWord(idx)}
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                        <input
                                            type="text"
                                            className="chip-text-input"
                                            placeholder="Tambah trigger word..."
                                            value={triggerWordInput}
                                            onChange={(e) => setTriggerWordInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    handleAddTriggerWord();
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginTop: "20px" }}>
                                    <label className="form-label">
                                        Tags / Kategori <span className="helper">(Pisahkan dengan koma)</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="anime, style, character, realistic, landscape"
                                        value={tagsInput}
                                        onChange={(e) => setTagsInput(e.target.value)}
                                    />
                                    <div style={{ fontSize: "11px", color: "var(--subtle)", marginTop: "4px" }}>
                                        Tags ini mempermudah pencarian dan filter di halaman eksplorasi.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 5: MODEL VERSIONS */}
                        {activeTab === "versions" && (
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                    <span style={{ fontSize: "13px", color: "var(--muted)" }}>
                                        Daftar rilis atau versi model ini
                                    </span>
                                    <button
                                        type="button"
                                        className="btn-secondary-admin"
                                        onClick={handleAddVersion}
                                    >
                                        + Tambah Versi
                                    </button>
                                </div>

                                {versions.map((ver, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            background: "#141517",
                                            border: "1px solid var(--border)",
                                            borderRadius: "10px",
                                            padding: "16px",
                                            marginBottom: "12px",
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                                            <span style={{ fontWeight: 600, color: "var(--heading)", fontSize: "13px" }}>
                                                Versi #{idx + 1}
                                            </span>
                                            {versions.length > 1 && (
                                                <button
                                                    type="button"
                                                    style={{ background: "none", border: "none", color: "#ff6b6b", cursor: "pointer", fontSize: "12px" }}
                                                    onClick={() => handleRemoveVersion(idx)}
                                                >
                                                    Hapus Versi
                                                </button>
                                            )}
                                        </div>

                                        {/* Basic Version Info */}
                                        <div className="form-grid-3">
                                            <div className="form-group">
                                                <label className="form-label">Nama Versi</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={ver.version_name || ""}
                                                    onChange={(e) => handleUpdateVersion(idx, "version_name", e.target.value)}
                                                    placeholder="v1.0 / Final"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">Nomor Versi</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={ver.version_number || ""}
                                                    onChange={(e) => handleUpdateVersion(idx, "version_number", e.target.value)}
                                                    placeholder="1.0"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">Format File</label>
                                                <select
                                                    className="form-select"
                                                    value={ver.format || "SafeTensors"}
                                                    onChange={(e) => handleUpdateVersion(idx, "format", e.target.value)}
                                                >
                                                    <option value="SafeTensor">SafeTensor</option>
                                                    <option value="SafeTensors">SafeTensors</option>
                                                    <option value="PickleTensor">PickleTensor / CKPT</option>
                                                    <option value="GGUF">GGUF</option>
                                                    <option value="Diffusers">Diffusers</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* File Info */}
                                        <div className="form-grid-3">
                                            <div className="form-group">
                                                <label className="form-label">Nama File</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={ver.file_name || ""}
                                                    onChange={(e) => handleUpdateVersion(idx, "file_name", e.target.value)}
                                                    placeholder="model-v1.0.safetensors"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">Ukuran File (bytes)</label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    value={ver.file_size || ""}
                                                    onChange={(e) => handleUpdateVersion(idx, "file_size", e.target.value ? parseInt(e.target.value, 10) : 0)}
                                                    placeholder="6935715840"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">Civitai Version URL</label>
                                                <input
                                                    type="url"
                                                    className="form-input"
                                                    value={ver.civitai_version_url || ""}
                                                    onChange={(e) => handleUpdateVersion(idx, "civitai_version_url", e.target.value)}
                                                    placeholder="https://civitai.com/models/...?modelVersionId=..."
                                                />
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Direct Download URL</label>
                                            <input
                                                type="url"
                                                className="form-input"
                                                value={ver.download_url || ""}
                                                onChange={(e) => handleUpdateVersion(idx, "download_url", e.target.value)}
                                                placeholder="https://civitai.com/api/download/models/..."
                                            />
                                        </div>

                                        {/* ⚙️ Recommended Generation Settings */}
                                        <div
                                            style={{
                                                marginTop: "12px",
                                                padding: "14px 16px",
                                                background: "#1a1b1e",
                                                border: "1px solid var(--border)",
                                                borderRadius: "8px",
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                                                <span style={{ fontSize: "14px" }}>⚙️</span>
                                                <span style={{ fontWeight: 600, color: "var(--heading)", fontSize: "13px" }}>
                                                    Recommended Generation Settings
                                                </span>
                                                <span style={{ fontSize: "11px", color: "var(--subtle)", marginLeft: "auto" }}>
                                                    Tampil di halaman galeri publik
                                                </span>
                                            </div>

                                            <div className="form-grid-3">
                                                <div className="form-group">
                                                    <label className="form-label">Sampler</label>
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        value={ver.recommended_settings?.sampler || ""}
                                                        onChange={(e) => handleUpdateRecSetting(idx, "sampler", e.target.value)}
                                                        placeholder="Euler a / DPM++ 2M Karras"
                                                    />
                                                </div>

                                                <div className="form-group">
                                                    <label className="form-label">Steps</label>
                                                    <input
                                                        type="number"
                                                        className="form-input"
                                                        value={ver.recommended_settings?.steps ?? ""}
                                                        onChange={(e) => handleUpdateRecSetting(idx, "steps", e.target.value ? parseInt(e.target.value, 10) : undefined)}
                                                        placeholder="28"
                                                    />
                                                </div>

                                                <div className="form-group">
                                                    <label className="form-label">CFG Scale</label>
                                                    <input
                                                        type="number"
                                                        step="0.5"
                                                        className="form-input"
                                                        value={ver.recommended_settings?.cfg_scale ?? ""}
                                                        onChange={(e) => handleUpdateRecSetting(idx, "cfg_scale", e.target.value ? parseFloat(e.target.value) : undefined)}
                                                        placeholder="6.5"
                                                    />
                                                </div>
                                            </div>

                                            <div className="form-grid-2">
                                                <div className="form-group">
                                                    <label className="form-label">Resolution Width</label>
                                                    <input
                                                        type="number"
                                                        className="form-input"
                                                        value={ver.recommended_settings?.width ?? ""}
                                                        onChange={(e) => handleUpdateRecSetting(idx, "width", e.target.value ? parseInt(e.target.value, 10) : undefined)}
                                                        placeholder="832"
                                                    />
                                                </div>

                                                <div className="form-group">
                                                    <label className="form-label">Resolution Height</label>
                                                    <input
                                                        type="number"
                                                        className="form-input"
                                                        value={ver.recommended_settings?.height ?? ""}
                                                        onChange={(e) => handleUpdateRecSetting(idx, "height", e.target.value ? parseInt(e.target.value, 10) : undefined)}
                                                        placeholder="1216"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="admin-modal-footer">
                        <button type="button" className="btn-secondary-admin" onClick={onClose} disabled={isSaving}>
                            Batal
                        </button>
                        <button type="submit" className="btn-primary-admin" disabled={isSaving}>
                            {isSaving ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Buat Model"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
