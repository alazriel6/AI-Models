import React, { useState, useEffect } from "react";
import {
    inspectModelImportApi,
    saveModelImportApi,
    type InspectedModel,
    type InspectedImage,
} from "../../api/admin";

interface AutoImportModelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (message: string) => void;
    onError: (message: string) => void;
}

export const AutoImportModelModal: React.FC<AutoImportModelModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    onError,
}) => {
    const [urlInput, setUrlInput] = useState("");
    const [apiToken, setApiToken] = useState("");
    const [isInspecting, setIsInspecting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [inspectError, setInspectError] = useState<string | null>(null);

    // Inspected preview model
    const [inspected, setInspected] = useState<InspectedModel | null>(null);

    // Editable overrides before saving
    const [editName, setEditName] = useState("");
    const [editType, setEditType] = useState<"checkpoint" | "lora">("checkpoint");
    const [editBaseModel, setEditBaseModel] = useState("SDXL");
    const [editAuthor, setEditAuthor] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editTriggerWords, setEditTriggerWords] = useState<string[]>([]);
    const [newTriggerInput, setNewTriggerInput] = useState("");

    // Selected sample images to import
    const [selectedImages, setSelectedImages] = useState<Record<string, boolean>>({});
    const [importImages, setImportImages] = useState(true);
    const [inspectedPreviewImg, setInspectedPreviewImg] = useState<InspectedImage | null>(null);
    const [copiedPrompt, setCopiedPrompt] = useState(false);

    // Load saved API token from localStorage
    useEffect(() => {
        const savedToken = localStorage.getItem("civitai_api_token");
        if (savedToken) {
            setApiToken(savedToken);
        }
    }, []);

    if (!isOpen) return null;

    const handleInspect = async (inputVal?: string) => {
        const target = (inputVal || urlInput).trim();
        if (!target) {
            setInspectError("Masukkan URL model Civitai / Hugging Face atau ID model Civitai.");
            return;
        }

        setIsInspecting(true);
        setInspectError(null);
        setInspected(null);

        // Save token to localStorage for convenience
        if (apiToken.trim()) {
            localStorage.setItem("civitai_api_token", apiToken.trim());
        }

        try {
            const res = await inspectModelImportApi({
                url_or_id: target,
                api_token: apiToken.trim() || undefined,
            });

            setInspected(res);
            setEditName(res.name);
            setEditType(res.type);
            setEditBaseModel(res.base_model);
            setEditAuthor(res.author);
            setEditDescription(res.description);
            setEditTriggerWords(res.trigger_words || []);

            // Default select top 10 sample images
            const imgSelection: Record<string, boolean> = {};
            (res.sample_images || []).slice(0, 10).forEach((img) => {
                imgSelection[img.url] = true;
            });
            setSelectedImages(imgSelection);

            const firstWithMeta = (res.sample_images || []).find((img) => img.positive_prompt);
            setInspectedPreviewImg(firstWithMeta || (res.sample_images && res.sample_images[0]) || null);
        } catch (err: any) {
            console.error("Inspect error:", err);
            setInspectError(err?.message || "Gagal menginspeksi model. Periksa koneksi atau URL input.");
        } finally {
            setIsInspecting(false);
        }
    };

    const handleAddTriggerWord = () => {
        const tw = newTriggerInput.trim();
        if (tw && !editTriggerWords.includes(tw)) {
            setEditTriggerWords([...editTriggerWords, tw]);
            setNewTriggerInput("");
        }
    };

    const handleRemoveTriggerWord = (word: string) => {
        setEditTriggerWords(editTriggerWords.filter((w) => w !== word));
    };

    const handleToggleImage = (url: string) => {
        setSelectedImages((prev) => ({
            ...prev,
            [url]: !prev[url],
        }));
    };

    const handleSelectAllImages = () => {
        if (!inspected) return;
        const allSelected: Record<string, boolean> = {};
        inspected.sample_images.forEach((img) => {
            allSelected[img.url] = true;
        });
        setSelectedImages(allSelected);
    };

    const handleDeselectAllImages = () => {
        setSelectedImages({});
    };

    const handleSave = async () => {
        if (!inspected) return;

        setIsSaving(true);
        try {
            // Filter chosen sample images
            const imagesToSave: InspectedImage[] = importImages
                ? (inspected.sample_images || []).filter((img) => selectedImages[img.url])
                : [];

            await saveModelImportApi({
                name: editName.trim() || inspected.name,
                slug: inspected.slug,
                type: editType,
                base_model: editBaseModel,
                author: editAuthor.trim() || inspected.author,
                description: editDescription,
                source_url: inspected.source_url,
                civitai_url: inspected.platform === "civitai" ? inspected.source_url : undefined,
                thumbnail_url: inspected.thumbnail_url,
                trigger_words: editTriggerWords,
                tags: inspected.tags || [],
                versions: inspected.versions,
                sample_images: imagesToSave,
                import_images: importImages && imagesToSave.length > 0,
            });

            onSuccess(`Model "${editName || inspected.name}" berhasil di-import ke katalog!`);
            onClose();
        } catch (err: any) {
            console.error("Save import error:", err);
            onError(err?.message || "Gagal menyimpan model ke database.");
        } finally {
            setIsSaving(false);
        }
    };

    const quickFill = (url: string) => {
        setUrlInput(url);
        handleInspect(url);
    };

    return (
        <div className="admin-modal-backdrop" onClick={onClose}>
            <div
                className="admin-modal-box auto-import-modal-box"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: "860px", width: "95%" }}
            >
                {/* Header */}
                <div className="admin-modal-header">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "18px" }}>✦</span>
                        <div>
                            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#e6e8eb" }}>
                                Auto-Import Model (Civitai & Hugging Face)
                            </h2>
                            <p style={{ margin: 0, fontSize: "12px", color: "#666c75" }}>
                                Ekstrak otomatis spesifikasi, versi .safetensors, trigger words, dan sampel generasi AI dalam 1-klik.
                            </p>
                        </div>
                    </div>
                    <button type="button" className="admin-modal-close" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className="admin-modal-body" style={{ maxHeight: "78vh", overflowY: "auto", padding: "16px 20px" }}>
                    {/* URL Input & Inspection Controls */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <input
                                type="text"
                                className="admin-input"
                                placeholder="Paste link Civitai (https://civitai.com/models/...), link Hugging Face, atau ID Civitai..."
                                value={urlInput}
                                onChange={(e) => setUrlInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleInspect();
                                }}
                                style={{ flex: 1, padding: "10px 14px", fontSize: "13px" }}
                            />
                            <button
                                type="button"
                                className="btn-primary-admin"
                                onClick={() => handleInspect()}
                                disabled={isInspecting || !urlInput.trim()}
                                style={{ padding: "0 20px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                            >
                                {isInspecting ? (
                                    <>
                                        <span className="spinner-mini"></span>
                                        <span>Fetching...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Fetch & Inspect</span>
                                        <span>→</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Civitai API Key (Optional for Mature/Uncensored/Restricted models) */}
                        <div style={{ background: "#17191C", border: "1px solid #282C34", borderRadius: "6px", padding: "10px 12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                <label style={{ fontSize: "11px", fontWeight: 600, color: "#9a9fa8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                    Civitai API Key (Opsional - Full NSFW & Uncensored)
                                </label>
                                <span style={{ fontSize: "11px", color: "#818cf8" }}>
                                    Membuka 100% konten 18+/Mature tanpa sensor
                                </span>
                            </div>
                            <input
                                type="password"
                                className="admin-input"
                                placeholder="Masukkan API Key Civitai jika model berlabel mature / restricted (disimpan di browser lokal Anda)..."
                                value={apiToken}
                                onChange={(e) => setApiToken(e.target.value)}
                                style={{ fontSize: "12px", padding: "6px 10px" }}
                            />
                        </div>

                        {/* Quick Presets */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "11px", color: "#666c75" }}>Coba sampel cepat:</span>
                            <button
                                type="button"
                                className="filter-pill"
                                style={{ fontSize: "11px", padding: "3px 8px" }}
                                onClick={() => quickFill("https://civitai.com/models/828198")}
                            >
                                🍊 Illustrious-XL v0.1 (Civitai)
                            </button>
                            <button
                                type="button"
                                className="filter-pill"
                                style={{ fontSize: "11px", padding: "3px 8px" }}
                                onClick={() => quickFill("https://huggingface.co/animagine-ai/animagine-xl-3.1")}
                            >
                                🤗 Animagine-XL 3.1 (Hugging Face)
                            </button>
                        </div>
                    </div>

                    {/* Error Notice */}
                    {inspectError && (
                        <div style={{ background: "#3b171c", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "10px 14px", borderRadius: "6px", fontSize: "12px", marginBottom: "16px" }}>
                            ⚠️ {inspectError}
                        </div>
                    )}

                    {/* Inspected Result Preview */}
                    {inspected && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px", background: "#17191C", border: "1px solid #282C34", borderRadius: "8px", padding: "16px" }}>
                            {/* Top info badge row */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                                <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                                        <span
                                            style={{
                                                fontSize: "10px",
                                                fontWeight: 700,
                                                padding: "2px 6px",
                                                borderRadius: "4px",
                                                background: inspected.platform === "civitai" ? "rgba(249, 115, 22, 0.2)" : "rgba(34, 197, 94, 0.2)",
                                                color: inspected.platform === "civitai" ? "#f97316" : "#22c55e",
                                                border: `1px solid ${inspected.platform === "civitai" ? "rgba(249, 115, 22, 0.4)" : "rgba(34, 197, 94, 0.4)"}`,
                                            }}
                                        >
                                            {inspected.platform === "civitai" ? "CIVITAI" : "HUGGING FACE"}
                                        </span>
                                        <span style={{ fontSize: "11px", color: "#666c75" }}>ID: {inspected.original_id}</span>
                                    </div>
                                    <h3 style={{ margin: 0, fontSize: "16px", color: "#e6e8eb" }}>{inspected.name}</h3>
                                    <span style={{ fontSize: "12px", color: "#9a9fa8" }}>by {inspected.author}</span>
                                </div>

                                {inspected.thumbnail_url && (
                                    <img
                                        src={inspected.thumbnail_url}
                                        alt={inspected.name}
                                        style={{ width: "64px", height: "64px", borderRadius: "6px", objectFit: "cover", border: "1px solid #282C34" }}
                                    />
                                )}
                            </div>

                            {/* Editable Fields Grid */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "11px", color: "#9a9fa8", marginBottom: "4px" }}>
                                        Nama Model di Katalog
                                    </label>
                                    <input
                                        type="text"
                                        className="admin-input"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        style={{ width: "100%", padding: "7px 10px", fontSize: "12px" }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: "11px", color: "#9a9fa8", marginBottom: "4px" }}>
                                        Author / Kreator
                                    </label>
                                    <input
                                        type="text"
                                        className="admin-input"
                                        value={editAuthor}
                                        onChange={(e) => setEditAuthor(e.target.value)}
                                        style={{ width: "100%", padding: "7px 10px", fontSize: "12px" }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: "11px", color: "#9a9fa8", marginBottom: "4px" }}>
                                        Tipe Model
                                    </label>
                                    <select
                                        className="admin-select"
                                        value={editType}
                                        onChange={(e) => setEditType(e.target.value as any)}
                                        style={{ width: "100%", padding: "7px 10px", fontSize: "12px" }}
                                    >
                                        <option value="checkpoint">Checkpoint</option>
                                        <option value="lora">LoRA</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: "11px", color: "#9a9fa8", marginBottom: "4px" }}>
                                        Base Architecture
                                    </label>
                                    <select
                                        className="admin-select"
                                        value={editBaseModel}
                                        onChange={(e) => setEditBaseModel(e.target.value)}
                                        style={{ width: "100%", padding: "7px 10px", fontSize: "12px" }}
                                    >
                                        <option value="Illustrious">Illustrious</option>
                                        <option value="Pony">Pony</option>
                                        <option value="NoobAI">NoobAI</option>
                                        <option value="SDXL">SDXL 1.0</option>
                                        <option value="Flux">Flux.1</option>
                                        <option value="SD 1.5">SD 1.5</option>
                                    </select>
                                </div>
                            </div>

                            {/* Trigger Words Section */}
                            <div>
                                <label style={{ display: "block", fontSize: "11px", color: "#9a9fa8", marginBottom: "6px" }}>
                                    Trigger Words ({editTriggerWords.length})
                                </label>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                                    {editTriggerWords.map((tw) => (
                                        <span
                                            key={tw}
                                            style={{
                                                fontSize: "11px",
                                                padding: "3px 8px",
                                                background: "#1c1f23",
                                                border: "1px solid #282C34",
                                                borderRadius: "4px",
                                                color: "#818cf8",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "6px",
                                            }}
                                        >
                                            {tw}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveTriggerWord(tw)}
                                                style={{ background: "transparent", border: "none", color: "#666c75", cursor: "pointer", padding: 0 }}
                                            >
                                                ✕
                                            </button>
                                        </span>
                                    ))}
                                    {editTriggerWords.length === 0 && (
                                        <span style={{ fontSize: "12px", color: "#666c75" }}>
                                            Tidak ada trigger words bawaan (Checkpoint standar).
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: "flex", gap: "6px", maxWidth: "340px" }}>
                                    <input
                                        type="text"
                                        className="admin-input"
                                        placeholder="Tambah trigger word..."
                                        value={newTriggerInput}
                                        onChange={(e) => setNewTriggerInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleAddTriggerWord();
                                        }}
                                        style={{ fontSize: "11px", padding: "4px 8px" }}
                                    />
                                    <button
                                        type="button"
                                        className="filter-pill"
                                        onClick={handleAddTriggerWord}
                                        style={{ fontSize: "11px", padding: "4px 10px" }}
                                    >
                                        + Add
                                    </button>
                                </div>
                            </div>

                            {/* Model Versions List */}
                            <div>
                                <label style={{ display: "block", fontSize: "11px", color: "#9a9fa8", marginBottom: "6px" }}>
                                    Detected Versions ({inspected.versions?.length || 0})
                                </label>
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                    {inspected.versions?.map((v, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                padding: "8px 12px",
                                                background: "#111315",
                                                border: "1px solid #282C34",
                                                borderRadius: "4px",
                                                fontSize: "12px",
                                            }}
                                        >
                                            <div>
                                                <div>
                                                    <strong style={{ color: "#e6e8eb" }}>{v.version_name}</strong>
                                                    <span style={{ color: "#666c75", marginLeft: "8px" }}>
                                                        {v.file_name} ({v.file_size ? `${(v.file_size / (1024 * 1024 * 1024)).toFixed(2)} GB` : "Safetensors"})
                                                    </span>
                                                </div>
                                                {v.recommended_settings && (
                                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px", fontSize: "11px" }}>
                                                        {v.recommended_settings.sampler && (
                                                            <span style={{ color: "#4dabf7", background: "#181a1d", padding: "1px 6px", borderRadius: "3px", border: "1px solid #282C34" }}>
                                                                Sampler: {v.recommended_settings.sampler}
                                                            </span>
                                                        )}
                                                        {(v.recommended_settings.steps_range || v.recommended_settings.steps) && (
                                                            <span style={{ color: "#51cf66", background: "#181a1d", padding: "1px 6px", borderRadius: "3px", border: "1px solid #282C34" }}>
                                                                Steps: {v.recommended_settings.steps_range || v.recommended_settings.steps}
                                                            </span>
                                                        )}
                                                        {(v.recommended_settings.cfg_scale_range || v.recommended_settings.cfg_scale) && (
                                                            <span style={{ color: "#ff922b", background: "#181a1d", padding: "1px 6px", borderRadius: "3px", border: "1px solid #282C34" }}>
                                                                CFG: {v.recommended_settings.cfg_scale_range || v.recommended_settings.cfg_scale}
                                                            </span>
                                                        )}
                                                        {v.recommended_settings.width && v.recommended_settings.height && (
                                                            <span style={{ color: "#cc5de8", background: "#181a1d", padding: "1px 6px", borderRadius: "3px", border: "1px solid #282C34" }}>
                                                                {v.recommended_settings.width} × {v.recommended_settings.height}
                                                            </span>
                                                        )}
                                                        {v.recommended_settings.hires_upscale && (
                                                            <span style={{ color: "#20c997", background: "#181a1d", padding: "1px 6px", borderRadius: "3px", border: "1px solid #282C34" }}>
                                                                Hires: {v.recommended_settings.hires_upscale}x
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <a
                                                href={v.download_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: "#818cf8", fontSize: "11px", textDecoration: "none" }}
                                            >
                                                Download Link ↗
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Sample Generations Showcase */}
                            {inspected.sample_images && inspected.sample_images.length > 0 && (
                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                        <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 600, color: "#e6e8eb" }}>
                                            <input
                                                type="checkbox"
                                                checked={importImages}
                                                onChange={(e) => setImportImages(e.target.checked)}
                                            />
                                            Auto-Import Sample Generations ke Galeri ({inspected.sample_images.length} gambar)
                                        </label>

                                        {importImages && (
                                            <div style={{ display: "flex", gap: "8px", fontSize: "11px" }}>
                                                <button
                                                    type="button"
                                                    onClick={handleSelectAllImages}
                                                    style={{ background: "transparent", border: "none", color: "#818cf8", cursor: "pointer" }}
                                                >
                                                    Select All
                                                </button>
                                                <span style={{ color: "#666c75" }}>·</span>
                                                <button
                                                    type="button"
                                                    onClick={handleDeselectAllImages}
                                                    style={{ background: "transparent", border: "none", color: "#9a9fa8", cursor: "pointer" }}
                                                >
                                                    Deselect All
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {importImages && (
                                        <div
                                            style={{
                                                display: "grid",
                                                gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
                                                gap: "8px",
                                                maxHeight: "180px",
                                                overflowY: "auto",
                                                padding: "6px",
                                                background: "#111315",
                                                borderRadius: "6px",
                                                border: "1px solid #282C34",
                                            }}
                                        >
                                            {inspected.sample_images.map((img, i) => {
                                                const isSelected = Boolean(selectedImages[img.url]);
                                                const isCurrentPreview = inspectedPreviewImg?.url === img.url;
                                                return (
                                                    <div
                                                        key={i}
                                                        onClick={() => {
                                                            handleToggleImage(img.url);
                                                            setInspectedPreviewImg(img);
                                                        }}
                                                        style={{
                                                            position: "relative",
                                                            aspectRatio: "1/1",
                                                            borderRadius: "4px",
                                                            overflow: "hidden",
                                                            cursor: "pointer",
                                                            border: isCurrentPreview
                                                                ? "2px solid #818cf8"
                                                                : isSelected
                                                                ? "2px solid #3b82f6"
                                                                : "1px solid #282C34",
                                                            opacity: isSelected ? 1 : 0.4,
                                                            transition: "all 0.15s ease",
                                                        }}
                                                        title={img.positive_prompt ? `Metadata Tersedia: ${img.positive_prompt.slice(0, 100)}...` : "Sample Generation"}
                                                    >
                                                        <img
                                                            src={img.url}
                                                            alt="Sample"
                                                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                                            loading="lazy"
                                                        />
                                                        {img.positive_prompt && (
                                                            <div
                                                                style={{
                                                                    position: "absolute",
                                                                    top: "3px",
                                                                    left: "3px",
                                                                    background: "rgba(16, 185, 129, 0.95)",
                                                                    color: "#ffffff",
                                                                    fontSize: "7.5px",
                                                                    fontWeight: 800,
                                                                    padding: "1px 3px",
                                                                    borderRadius: "3px",
                                                                    lineHeight: 1.1,
                                                                    boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
                                                                }}
                                                            >
                                                                META
                                                            </div>
                                                        )}
                                                        {isSelected && (
                                                            <div
                                                                style={{
                                                                    position: "absolute",
                                                                    top: "3px",
                                                                    right: "3px",
                                                                    background: "#3b82f6",
                                                                    color: "#ffffff",
                                                                    fontSize: "9px",
                                                                    fontWeight: 700,
                                                                    width: "14px",
                                                                    height: "14px",
                                                                    borderRadius: "50%",
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
                                                                }}
                                                            >
                                                                ✓
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Inspected Image Metadata Preview Drawer */}
                                    {importImages && inspectedPreviewImg && (
                                        <div
                                            style={{
                                                marginTop: "8px",
                                                background: "#121417",
                                                border: "1px solid #262930",
                                                borderRadius: "6px",
                                                padding: "8px 10px",
                                                fontSize: "11px",
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                    <span style={{ fontWeight: 600, color: "#e6e8eb" }}>Detail AI Metadata Gambar:</span>
                                                    {inspectedPreviewImg.positive_prompt ? (
                                                        <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", fontSize: "10px", fontWeight: 600, padding: "1px 6px", borderRadius: "3px", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                                                            ✓ Parameters Terbaca
                                                        </span>
                                                    ) : (
                                                        <span style={{ background: "rgba(148, 163, 184, 0.1)", color: "#94a3b8", fontSize: "10px", padding: "1px 6px", borderRadius: "3px" }}>
                                                            Standard Image
                                                        </span>
                                                    )}
                                                </div>
                                                {inspectedPreviewImg.positive_prompt && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(inspectedPreviewImg.positive_prompt || "");
                                                            setCopiedPrompt(true);
                                                            setTimeout(() => setCopiedPrompt(false), 1800);
                                                        }}
                                                        style={{
                                                            background: copiedPrompt ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.06)",
                                                            color: copiedPrompt ? "#10b981" : "#9a9fa8",
                                                            border: "1px solid #282C34",
                                                            padding: "2px 7px",
                                                            borderRadius: "4px",
                                                            fontSize: "10px",
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        {copiedPrompt ? "Copied! ✓" : "Copy Prompt"}
                                                    </button>
                                                )}
                                            </div>

                                            {inspectedPreviewImg.positive_prompt ? (
                                                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                                                    <div style={{ color: "#d1d5db", fontSize: "11px", lineHeight: "1.35", maxHeight: "55px", overflowY: "auto", background: "#0B0C0E", padding: "5px 7px", borderRadius: "4px", fontFamily: "monospace" }}>
                                                        <span style={{ color: "#10b981", fontWeight: 600 }}>Prompt: </span>
                                                        {inspectedPreviewImg.positive_prompt}
                                                    </div>
                                                    {inspectedPreviewImg.negative_prompt && (
                                                        <div style={{ color: "#9ca3af", fontSize: "10.5px", lineHeight: "1.35", maxHeight: "35px", overflowY: "auto", background: "#0B0C0E", padding: "4px 7px", borderRadius: "4px", fontFamily: "monospace" }}>
                                                            <span style={{ color: "#ef4444", fontWeight: 600 }}>Negative: </span>
                                                            {inspectedPreviewImg.negative_prompt}
                                                        </div>
                                                    )}
                                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", fontSize: "10px", color: "#8C929C", marginTop: "2px" }}>
                                                        {inspectedPreviewImg.steps ? (
                                                             <span style={{ background: "#1C1F23", padding: "1px 5px", borderRadius: "3px" }}>
                                                                 Steps: <strong style={{ color: "#e6e8eb" }}>{inspectedPreviewImg.steps}</strong>
                                                             </span>
                                                        ) : null}
                                                        {inspectedPreviewImg.sampler ? (
                                                             <span style={{ background: "#1C1F23", padding: "1px 5px", borderRadius: "3px" }}>
                                                                 Sampler: <strong style={{ color: "#e6e8eb" }}>{inspectedPreviewImg.sampler}</strong>
                                                             </span>
                                                        ) : null}
                                                        {inspectedPreviewImg.cfg_scale ? (
                                                             <span style={{ background: "#1C1F23", padding: "1px 5px", borderRadius: "3px" }}>
                                                                 CFG: <strong style={{ color: "#e6e8eb" }}>{inspectedPreviewImg.cfg_scale}</strong>
                                                             </span>
                                                        ) : null}
                                                        {inspectedPreviewImg.seed ? (
                                                             <span style={{ background: "#1C1F23", padding: "1px 5px", borderRadius: "3px" }}>
                                                                 Seed: <strong style={{ color: "#e6e8eb" }}>{inspectedPreviewImg.seed}</strong>
                                                             </span>
                                                        ) : null}
                                                        {inspectedPreviewImg.width && inspectedPreviewImg.height ? (
                                                             <span style={{ background: "#1C1F23", padding: "1px 5px", borderRadius: "3px" }}>
                                                                 Size: <strong style={{ color: "#e6e8eb" }}>{inspectedPreviewImg.width}x{inspectedPreviewImg.height}</strong>
                                                             </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ color: "#6b7280", fontSize: "11px", fontStyle: "italic" }}>
                                                    Gambar showcase ini tidak memiliki prompt metadata di sumber Civitai/HF.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="admin-modal-footer">
                    <button type="button" className="btn-secondary-admin" onClick={onClose} disabled={isSaving}>
                        Batal
                    </button>
                    {inspected && (
                        <button
                            type="button"
                            className="btn-primary-admin"
                            onClick={handleSave}
                            disabled={isSaving}
                            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                        >
                            {isSaving ? (
                                <>
                                    <span className="spinner-mini"></span>
                                    <span>Menyimpan ke Database...</span>
                                </>
                            ) : (
                                <>
                                    <span>✓ Simpan & Import Model ke Katalog</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
