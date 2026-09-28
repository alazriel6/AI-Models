import React, { useState, useEffect } from "react";
import type { Model, ModelImage } from "../../api/models";
import {
    createGalleryImageApi,
    uploadGalleryImageFileApi,
    updateGalleryImageApi,
    parseImageMetadataApi,
} from "../../api/admin";
import type { CreateGalleryImagePayload } from "../../api/admin";

interface GalleryImageModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageToEdit?: ModelImage | null;
    initialFile?: File | null;
    availableModels: Model[];
    onSaved: () => void;
}

interface ResourceRow {
    name: string;
    type: "checkpoint" | "lora";
    weight: number;
}

export const GalleryImageModal: React.FC<GalleryImageModalProps> = ({
    isOpen,
    onClose,
    imageToEdit,
    initialFile,
    availableModels,
    onSaved,
}) => {
    const isEditMode = Boolean(imageToEdit);

    // Form mode for new images: URL vs Upload
    const [uploadMode, setUploadMode] = useState<"url" | "upload">("upload");
    const [imageUrl, setImageUrl] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);

    // Associated model
    const [selectedModelId, setSelectedModelId] = useState<string>("");
    const [customModelName, setCustomModelName] = useState<string>("");

    // Generation metadata
    const [caption, setCaption] = useState("");
    const [positivePrompt, setPositivePrompt] = useState("");
    const [negativePrompt, setNegativePrompt] = useState("");
    const [steps, setSteps] = useState<number>(28);
    const [sampler, setSampler] = useState("Euler a");
    const [scheduler, setScheduler] = useState("Automatic");
    const [cfgScale, setCfgScale] = useState<number>(7.0);
    const [seed, setSeed] = useState<string>("");
    const [width, setWidth] = useState<number>(832);
    const [height, setHeight] = useState<number>(1216);

    // LoRA resources
    const [resources, setResources] = useState<ResourceRow[]>([]);

    // States
    const [isParsingMeta, setIsParsingMeta] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [metaParseStatus, setMetaParseStatus] = useState<{
        source?: string;
        message: string;
        isSuccess: boolean;
    } | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Process file and extract metadata automatically
    const processFileMetadata = async (file: File) => {
        setSelectedFile(file);
        const previewUrl = URL.createObjectURL(file);
        setFilePreview(previewUrl);
        setMetaParseStatus(null);

        // Auto-extract metadata if it's a PNG file
        if (file.name.toLowerCase().endsWith(".png") || file.type === "image/png") {
            try {
                setIsParsingMeta(true);
                const res = await parseImageMetadataApi(file);
                if (res.success && res.metadata) {
                    const m = res.metadata;

                    if (m.positive_prompt) setPositivePrompt(m.positive_prompt);
                    if (m.negative_prompt) setNegativePrompt(m.negative_prompt);
                    if (m.steps && m.steps > 0) setSteps(m.steps);
                    if (m.sampler) setSampler(m.sampler);
                    if (m.scheduler) setScheduler(m.scheduler);
                    if (m.cfg_scale && m.cfg_scale > 0) setCfgScale(m.cfg_scale);
                    if (m.seed !== undefined && m.seed !== null && m.seed !== 0) setSeed(String(m.seed));
                    if (m.width && m.width > 0) setWidth(m.width);
                    if (m.height && m.height > 0) setHeight(m.height);

                    // Check if model name detected
                    if (m.model_name) {
                        setCustomModelName(m.model_name);
                        // Try matching with existing catalog models
                        const matched = availableModels.find(
                            (mod) =>
                                mod.name.toLowerCase() === m.model_name!.toLowerCase() ||
                                m.model_name!.toLowerCase().includes(mod.name.toLowerCase())
                        );
                        if (matched) {
                            setSelectedModelId(String(matched.id));
                        }
                    }

                    // Add detected LoRAs if any
                    if (m.loras && m.loras.length > 0) {
                        setResources((prev) => {
                            const currentNames = new Set(prev.map((r) => r.name.toLowerCase()));
                            const newResources = [...prev];
                            for (const lora of m.loras!) {
                                if (!currentNames.has(lora.name.toLowerCase())) {
                                    newResources.push({
                                        name: lora.name,
                                        type: "lora",
                                        weight: lora.weight || 0.8,
                                    });
                                }
                            }
                            return newResources;
                        });
                    }

                    const srcEngine = m.source || "PNG Info";
                    setMetaParseStatus({
                        source: srcEngine,
                        message: `Successfully extracted metadata from ${srcEngine}!`,
                        isSuccess: true,
                    });
                } else {
                    setMetaParseStatus({
                        message: "No generation metadata found in this PNG chunk.",
                        isSuccess: false,
                    });
                }
            } catch (err: any) {
                console.warn("Failed to parse PNG metadata:", err);
                setMetaParseStatus({
                    message: "Could not auto-read metadata. You can fill parameters manually.",
                    isSuccess: false,
                });
            } finally {
                setIsParsingMeta(false);
            }
        }
    };

    // Initialize or reset form
    useEffect(() => {
        if (!isOpen) return;

        if (imageToEdit) {
            // Populate for edit
            setUploadMode("url");
            setImageUrl(imageToEdit.image_url || "");
            setFilePreview(imageToEdit.image_url || "");
            setSelectedModelId(imageToEdit.model_id ? String(imageToEdit.model_id) : "");
            setCustomModelName(imageToEdit.model_name || imageToEdit.model?.name || "");
            setCaption(imageToEdit.caption || "");
            setPositivePrompt(imageToEdit.positive_prompt || "");
            setNegativePrompt(imageToEdit.negative_prompt || "");
            setSteps(imageToEdit.steps || 28);
            setSampler(imageToEdit.sampler || "Euler a");
            setScheduler(imageToEdit.scheduler || "Automatic");
            setCfgScale(imageToEdit.cfg_scale || 7.0);
            setSeed(imageToEdit.seed ? String(imageToEdit.seed) : "");
            setWidth(imageToEdit.width || 832);
            setHeight(imageToEdit.height || 1216);

            if (imageToEdit.resources && imageToEdit.resources.length > 0) {
                setResources(
                    imageToEdit.resources.map((r: any) => ({
                        name: r.name,
                        type: (r.type?.toLowerCase() === "checkpoint" ? "checkpoint" : "lora") as "checkpoint" | "lora",
                        weight: r.weight || 0.8,
                    }))
                );
            } else {
                setResources([]);
            }
            setMetaParseStatus(null);
            setError(null);
        } else {
            // Reset for create
            setUploadMode("upload");
            setImageUrl("");
            setSelectedFile(null);
            setFilePreview(null);
            setSelectedModelId("");
            setCustomModelName("");
            setCaption("");
            setPositivePrompt("");
            setNegativePrompt("");
            setSteps(28);
            setSampler("Euler a");
            setScheduler("Automatic");
            setCfgScale(7.0);
            setSeed("");
            setWidth(832);
            setHeight(1216);
            setResources([]);
            setMetaParseStatus(null);
            setError(null);

            if (initialFile) {
                processFileMetadata(initialFile);
            }
        }
    }, [isOpen, imageToEdit, initialFile]);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFileMetadata(e.target.files[0]);
        }
    };

    const handleAddResource = () => {
        setResources((prev) => [...prev, { name: "", type: "lora", weight: 0.8 }]);
    };

    const handleRemoveResource = (index: number) => {
        setResources((prev) => prev.filter((_, i) => i !== index));
    };

    const handleUpdateResource = (index: number, field: keyof ResourceRow, val: any) => {
        setResources((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: val };
            return updated;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!isEditMode && uploadMode === "url" && !imageUrl.trim()) {
            setError("Image URL is required");
            return;
        }
        if (!isEditMode && uploadMode === "upload" && !selectedFile) {
            setError("Please select an image file to upload");
            return;
        }

        try {
            setSubmitting(true);

            const modelIdNum = selectedModelId ? Number(selectedModelId) : undefined;
            const seedNum = seed.trim() !== "" ? Number(seed.trim()) : undefined;

            const validResources = resources
                .filter((r) => r.name.trim() !== "")
                .map((r) => ({
                    name: r.name.trim(),
                    type: r.type,
                    weight: Number(r.weight) || 0.8,
                }));

            if (isEditMode && imageToEdit) {
                // UPDATE
                await updateGalleryImageApi(imageToEdit.id, {
                    model_id: modelIdNum || 0,
                    model_name: customModelName.trim() || undefined,
                    caption: caption.trim() || undefined,
                    positive_prompt: positivePrompt.trim() || undefined,
                    negative_prompt: negativePrompt.trim() || undefined,
                    steps,
                    sampler,
                    scheduler,
                    cfg_scale: cfgScale,
                    seed: seedNum,
                    width,
                    height,
                });
            } else {
                // CREATE
                if (uploadMode === "upload" && selectedFile) {
                    const formData = new FormData();
                    formData.append("image", selectedFile);
                    if (modelIdNum) formData.append("model_id", String(modelIdNum));
                    if (customModelName.trim()) formData.append("model_name", customModelName.trim());
                    if (caption.trim()) formData.append("caption", caption.trim());
                    if (positivePrompt.trim()) formData.append("positive_prompt", positivePrompt.trim());
                    if (negativePrompt.trim()) formData.append("negative_prompt", negativePrompt.trim());
                    formData.append("steps", String(steps));
                    formData.append("sampler", sampler);
                    formData.append("scheduler", scheduler);
                    formData.append("cfg_scale", String(cfgScale));
                    if (seedNum !== undefined) formData.append("seed", String(seedNum));
                    formData.append("width", String(width));
                    formData.append("height", String(height));
                    if (validResources.length > 0) {
                        formData.append("resources", JSON.stringify(validResources));
                    }

                    await uploadGalleryImageFileApi(formData);
                } else {
                    const payload: CreateGalleryImagePayload = {
                        model_id: modelIdNum,
                        model_name: customModelName.trim() || undefined,
                        image_url: imageUrl.trim(),
                        caption: caption.trim() || undefined,
                        positive_prompt: positivePrompt.trim() || undefined,
                        negative_prompt: negativePrompt.trim() || undefined,
                        steps,
                        sampler,
                        scheduler,
                        cfg_scale: cfgScale,
                        seed: seedNum,
                        width,
                        height,
                        resources: validResources.length > 0 ? validResources : undefined,
                    };

                    await createGalleryImageApi(payload);
                }
            }

            onSaved();
            onClose();
        } catch (err: any) {
            console.error("Failed to save gallery image:", err);
            setError(err?.message || "Failed to save image");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="admin-modal-backdrop" onClick={onClose}>
            <div
                className="admin-modal-content"
                style={{ maxWidth: "860px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="admin-modal-header">
                    <div>
                        <h2 className="admin-modal-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                            <span>{isEditMode ? "Edit Gallery Image & Parameters" : "Add Image to Showcase Gallery"}</span>
                        </h2>
                        <span style={{ fontSize: "11px", color: "#666C75" }}>
                            {isEditMode
                                ? `Editing Sample #${imageToEdit?.id}`
                                : "Upload any ComfyUI or WebUI generation output with auto-extracted parameters"}
                        </span>
                    </div>
                    <button className="admin-modal-close" onClick={onClose}>
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="admin-modal-body" style={{ overflowY: "auto", flex: 1, padding: "20px" }}>
                    {error && (
                        <div
                            style={{
                                padding: "10px 14px",
                                backgroundColor: "rgba(239, 68, 68, 0.1)",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                borderRadius: "4px",
                                color: "#EF4444",
                                fontSize: "12px",
                                marginBottom: "16px",
                            }}
                        >
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* Section 1: Model Link / Checkpoint */}
                        <div style={{ background: "#16181B", border: "1px solid #292D32", borderRadius: "4px", padding: "14px", marginBottom: "16px" }}>
                            <div style={{ fontSize: "12px", fontWeight: 600, color: "#E6E8EB", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                Model Association (Optional)
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Link to Catalog Model</label>
                                    <select
                                        className="form-input"
                                        value={selectedModelId}
                                        onChange={(e) => {
                                            setSelectedModelId(e.target.value);
                                            const mod = availableModels.find((m) => String(m.id) === e.target.value);
                                            if (mod && !customModelName) {
                                                setCustomModelName(mod.name);
                                            }
                                        }}
                                    >
                                        <option value="">None (Standalone / Custom Checkpoint)</option>
                                        {availableModels.map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.name} ({m.base_model} • {m.type})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Checkpoint / Model Label</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g. Illustrious XL, SDXL Base, or ckpt file name"
                                        value={customModelName}
                                        onChange={(e) => setCustomModelName(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Image Source */}
                        {!isEditMode && (
                            <div style={{ marginBottom: "16px" }}>
                                <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                                    <button
                                        type="button"
                                        className={`admin-filter-btn ${uploadMode === "upload" ? "active" : ""}`}
                                        onClick={() => setUploadMode("upload")}
                                        style={{ flex: 1, padding: "6px" }}
                                    >
                                        Local File (PNG Auto-Extract)
                                    </button>
                                    <button
                                        type="button"
                                        className={`admin-filter-btn ${uploadMode === "url" ? "active" : ""}`}
                                        onClick={() => setUploadMode("url")}
                                        style={{ flex: 1, padding: "6px" }}
                                    >
                                        External Image URL
                                    </button>
                                </div>

                                {uploadMode === "upload" ? (
                                    <div className="form-group">
                                        {/* Drag & Drop Upload Box */}
                                        <div
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                setIsDragOver(true);
                                            }}
                                            onDragLeave={(e) => {
                                                e.preventDefault();
                                                setIsDragOver(false);
                                            }}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                setIsDragOver(false);
                                                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                                    processFileMetadata(e.dataTransfer.files[0]);
                                                }
                                            }}
                                            style={{
                                                border: isDragOver ? "2px dashed #6366f1" : "1px dashed #34383E",
                                                borderRadius: "4px",
                                                padding: "20px",
                                                background: isDragOver ? "rgba(99, 102, 241, 0.05)" : "#16181B",
                                                textAlign: "center",
                                                cursor: "pointer",
                                                transition: "all 0.15s ease",
                                            }}
                                            onClick={() => {
                                                const fileInput = document.getElementById("gallery-image-file-input");
                                                if (fileInput) fileInput.click();
                                            }}
                                        >
                                            <input
                                                id="gallery-image-file-input"
                                                type="file"
                                                style={{ display: "none" }}
                                                accept="image/png,image/jpeg,image/webp"
                                                onChange={handleFileChange}
                                            />

                                            {filePreview ? (
                                                <div>
                                                    <img
                                                        src={filePreview}
                                                        alt="File preview"
                                                        style={{
                                                            maxHeight: "160px",
                                                            maxWidth: "100%",
                                                            borderRadius: "4px",
                                                            border: "1px solid #292D32",
                                                            objectFit: "contain",
                                                        }}
                                                    />
                                                    <div style={{ marginTop: "8px", fontSize: "12px", color: "#E6E8EB", fontFamily: "monospace" }}>
                                                        {selectedFile?.name} ({(selectedFile ? selectedFile.size / 1024 : 0).toFixed(1)} KB)
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="btn-secondary-admin"
                                                        style={{ marginTop: "8px", fontSize: "11px", padding: "4px 10px" }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const fileInput = document.getElementById("gallery-image-file-input");
                                                            if (fileInput) fileInput.click();
                                                        }}
                                                    >
                                                        Choose Different File
                                                    </button>
                                                </div>
                                            ) : (
                                                <div>
                                                    <svg
                                                        width="28"
                                                        height="28"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="#666C75"
                                                        strokeWidth="1.75"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        style={{ margin: "0 auto 8px auto", display: "block" }}
                                                    >
                                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                        <polyline points="17 8 12 3 7 8"></polyline>
                                                        <line x1="12" y1="3" x2="12" y2="15"></line>
                                                    </svg>
                                                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#E6E8EB", marginBottom: "4px" }}>
                                                        Click to browse or drag & drop PNG file
                                                    </div>
                                                    <div style={{ fontSize: "11px", color: "#666C75" }}>
                                                        Directly upload ComfyUI or Automatic1111 outputs to auto-fill prompt & settings
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Parsing State & Result Banner */}
                                        {isParsingMeta && (
                                            <div
                                                style={{
                                                    marginTop: "10px",
                                                    padding: "8px 12px",
                                                    background: "rgba(99, 102, 241, 0.08)",
                                                    border: "1px solid rgba(99, 102, 241, 0.25)",
                                                    borderRadius: "4px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "8px",
                                                    fontSize: "12px",
                                                    color: "#818cf8",
                                                }}
                                            >
                                                <svg
                                                    width="14"
                                                    height="14"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    style={{ animation: "spin 1s linear infinite" }}
                                                >
                                                    <line x1="12" y1="2" x2="12" y2="6"></line>
                                                    <line x1="12" y1="18" x2="12" y2="22"></line>
                                                    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                                                    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                                                    <line x1="2" y1="12" x2="6" y2="12"></line>
                                                    <line x1="18" y1="12" x2="22" y2="12"></line>
                                                    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                                                    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                                                </svg>
                                                <span>Extracting ComfyUI / Automatic1111 generation metadata...</span>
                                            </div>
                                        )}

                                        {metaParseStatus && !isParsingMeta && (
                                            <div
                                                style={{
                                                    marginTop: "10px",
                                                    padding: "10px 12px",
                                                    background: metaParseStatus.isSuccess
                                                        ? "rgba(34, 197, 94, 0.08)"
                                                        : "rgba(100, 116, 139, 0.08)",
                                                    border: metaParseStatus.isSuccess
                                                        ? "1px solid rgba(34, 197, 94, 0.25)"
                                                        : "1px solid rgba(100, 116, 139, 0.25)",
                                                    borderRadius: "4px",
                                                    fontSize: "12px",
                                                    color: metaParseStatus.isSuccess ? "#4ade80" : "#94a3b8",
                                                }}
                                            >
                                                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                                                    {metaParseStatus.isSuccess ? (
                                                        <>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                                            </svg>
                                                            <strong style={{ textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.05em" }}>
                                                                {metaParseStatus.source ? `${metaParseStatus.source} Metadata Extracted` : "Metadata Extracted"}
                                                            </strong>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <circle cx="12" cy="12" r="10"></circle>
                                                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                                            </svg>
                                                            <strong style={{ fontSize: "11px" }}>Metadata Status</strong>
                                                        </>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: "11px", opacity: 0.9 }}>
                                                    {metaParseStatus.message}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="form-group">
                                        <label className="form-label">
                                            Image URL <span className="required">*</span>
                                        </label>
                                        <input
                                            type="url"
                                            className="form-input mono"
                                            placeholder="https://image.civitai.com/... or https://example.com/sample.png"
                                            value={imageUrl}
                                            onChange={(e) => setImageUrl(e.target.value)}
                                            required
                                        />
                                        {imageUrl && (
                                            <div style={{ marginTop: "10px", textAlign: "center" }}>
                                                <img
                                                    src={imageUrl}
                                                    alt="Preview"
                                                    style={{ maxHeight: "160px", maxWidth: "100%", borderRadius: "4px", border: "1px solid #292D32" }}
                                                    onError={(e) => {
                                                        (e.currentTarget as HTMLImageElement).style.display = "none";
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Section 3: Caption & Prompts */}
                        <div className="form-group">
                            <label className="form-label">Caption / Artwork Title (Optional)</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="e.g. Cyberpunk Alleyway, Portrait Study..."
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Positive Prompt</label>
                            <textarea
                                className="form-input mono"
                                rows={4}
                                placeholder="e.g. masterpiece, best quality, 1girl, solo, in futuristic city..."
                                value={positivePrompt}
                                onChange={(e) => setPositivePrompt(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Negative Prompt</label>
                            <textarea
                                className="form-input mono"
                                rows={2}
                                placeholder="e.g. worst quality, low quality, bad anatomy, blurry..."
                                value={negativePrompt}
                                onChange={(e) => setNegativePrompt(e.target.value)}
                            />
                        </div>

                        {/* Section 4: Technical Parameters Grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">Sampler</label>
                                <input
                                    type="text"
                                    className="form-input mono"
                                    value={sampler}
                                    onChange={(e) => setSampler(e.target.value)}
                                    placeholder="Euler a, DPM++ 2M Karras..."
                                />
                            </div>

                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">Scheduler</label>
                                <input
                                    type="text"
                                    className="form-input mono"
                                    value={scheduler}
                                    onChange={(e) => setScheduler(e.target.value)}
                                    placeholder="Karras, Automatic, Normal..."
                                />
                            </div>

                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">Sampling Steps</label>
                                <input
                                    type="number"
                                    className="form-input mono"
                                    min={1}
                                    max={150}
                                    value={steps}
                                    onChange={(e) => setSteps(Number(e.target.value))}
                                />
                            </div>

                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">CFG Scale</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min={1}
                                    max={30}
                                    className="form-input mono"
                                    value={cfgScale}
                                    onChange={(e) => setCfgScale(Number(e.target.value))}
                                />
                            </div>

                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">Seed</label>
                                <input
                                    type="text"
                                    className="form-input mono"
                                    placeholder="e.g. 384912048"
                                    value={seed}
                                    onChange={(e) => setSeed(e.target.value)}
                                />
                            </div>

                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">Dimensions (W × H)</label>
                                <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                                    <input
                                        type="number"
                                        className="form-input mono"
                                        style={{ padding: "6px" }}
                                        value={width}
                                        onChange={(e) => setWidth(Number(e.target.value))}
                                    />
                                    <span style={{ color: "#666C75" }}>×</span>
                                    <input
                                        type="number"
                                        className="form-input mono"
                                        style={{ padding: "6px" }}
                                        value={height}
                                        onChange={(e) => setHeight(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 5: LoRA / Resource Stack */}
                        <div style={{ background: "#16181B", border: "1px solid #292D32", borderRadius: "4px", padding: "12px", marginBottom: "16px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                <span style={{ fontSize: "11px", fontWeight: 600, color: "#9A9FA8", textTransform: "uppercase" }}>
                                    LoRA Resources ({resources.length})
                                </span>
                                <button
                                    type="button"
                                    className="btn-secondary-admin"
                                    style={{ fontSize: "11px", padding: "2px 8px" }}
                                    onClick={handleAddResource}
                                >
                                    + Add LoRA
                                </button>
                            </div>

                            {resources.length === 0 ? (
                                <div style={{ fontSize: "11px", color: "#666C75", fontStyle: "italic" }}>
                                    No additional LoRA resources attached.
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                    {resources.map((res, idx) => (
                                        <div key={idx} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                            <input
                                                type="text"
                                                className="form-input mono"
                                                style={{ flex: 2, padding: "5px 8px", fontSize: "12px" }}
                                                placeholder="LoRA name (e.g. detail_tweaker)"
                                                value={res.name}
                                                onChange={(e) => handleUpdateResource(idx, "name", e.target.value)}
                                            />
                                            <input
                                                type="number"
                                                step="0.05"
                                                className="form-input mono"
                                                style={{ width: "70px", padding: "5px 6px", fontSize: "12px" }}
                                                placeholder="Weight"
                                                value={res.weight}
                                                onChange={(e) => handleUpdateResource(idx, "weight", Number(e.target.value))}
                                            />
                                            <button
                                                type="button"
                                                className="btn-danger-admin"
                                                style={{ padding: "4px 8px", fontSize: "11px" }}
                                                onClick={() => handleRemoveResource(idx)}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer Actions */}
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", borderTop: "1px solid #292D32", paddingTop: "14px" }}>
                            <button
                                type="button"
                                className="btn-secondary-admin"
                                onClick={onClose}
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn-primary-admin"
                                disabled={submitting}
                            >
                                {submitting ? "Saving..." : isEditMode ? "Save Changes" : "Publish to Gallery"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
