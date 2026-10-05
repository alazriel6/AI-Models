import React, { useState, useEffect } from "react";
import type { Model, ModelImage } from "../../api/models";
import {
    getModelImagesApi,
    createModelImageApi,
    uploadModelImageFileApi,
    deleteModelImageApi,
    setModelThumbnailApi,
    parseImageMetadataApi,
} from "../../api/admin";
import type { CreateImagePayload } from "../../api/admin";
import { resolveImageUrl } from "../../api/client";

interface ModelImagesModalProps {
    isOpen: boolean;
    onClose: () => void;
    model: Model;
    onImagesUpdated: () => void;
}

interface ResourceItemInput {
    name: string;
    type: "checkpoint" | "lora";
    weight?: number;
}

export const ModelImagesModal: React.FC<ModelImagesModalProps> = ({
    isOpen,
    onClose,
    model,
    onImagesUpdated,
}) => {
    const [images, setImages] = useState<ModelImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Form mode: "url" or "upload"
    const [uploadMode, setUploadMode] = useState<"url" | "upload">("url");
    const [imageUrl, setImageUrl] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);

    // Metadata form fields matching Generation Details popup
    const [caption, setCaption] = useState("");
    const [positivePrompt, setPositivePrompt] = useState("");
    const [negativePrompt, setNegativePrompt] = useState("");
    const [steps, setSteps] = useState<number>(28);
    const [sampler, setSampler] = useState("DPM++ 2M Karras");
    const [scheduler, setScheduler] = useState("Karras");
    const [cfgScale, setCfgScale] = useState<number>(7.0);
    const [seed, setSeed] = useState<string>("");
    const [width, setWidth] = useState<number>(832);
    const [height, setHeight] = useState<number>(1216);

    // Metadata extraction states
    const [isParsingMeta, setIsParsingMeta] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [metaParseStatus, setMetaParseStatus] = useState<{
        source?: string;
        message: string;
        isSuccess: boolean;
        detectedCount?: number;
    } | null>(null);

    // Resources used
    const [resources, setResources] = useState<ResourceItemInput[]>([
        {
            name: model.name,
            type: model.type?.toLowerCase() === "lora" ? "lora" : "checkpoint",
            weight: 1.0,
        },
    ]);

    // Load images for current model
    const loadImages = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getModelImagesApi(model.id);
            setImages(Array.isArray(data) ? data : []);
        } catch (err: any) {
            console.error("Failed to load model images:", err);
            setError(err?.message || "Gagal memuat daftar gambar");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && model?.id) {
            loadImages();
        }
    }, [isOpen, model?.id]);

    if (!isOpen) return null;

    // Process file and extract metadata automatically
    const processFileMetadata = async (file: File) => {
        setSelectedFile(file);
        const previewUrl = URL.createObjectURL(file);
        setFilePreview(previewUrl);
        setMetaParseStatus(null);

        // CRITICAL: Always reset previous metadata when a new file is loaded!
        setPositivePrompt("");
        setNegativePrompt("");
        setSeed("");
        setResources([]);
        setSteps(28);
        setSampler("Euler a");
        setScheduler("Automatic");
        setCfgScale(7.0);
        setWidth(832);
        setHeight(1216);

        // Auto-extract metadata for supported formats (PNG, WebP, JPEG)
        const lowerName = file.name.toLowerCase();
        const isSupportedImage =
            lowerName.endsWith(".png") ||
            lowerName.endsWith(".webp") ||
            lowerName.endsWith(".jpg") ||
            lowerName.endsWith(".jpeg") ||
            file.type.startsWith("image/");

        if (isSupportedImage) {
            try {
                setIsParsingMeta(true);
                const res = await parseImageMetadataApi(file);
                if (res.success && res.metadata) {
                    const m = res.metadata;
                    let detected = 0;

                    if (m.positive_prompt) {
                        setPositivePrompt(m.positive_prompt);
                        detected++;
                    }
                    if (m.negative_prompt) {
                        setNegativePrompt(m.negative_prompt);
                        detected++;
                    }
                    if (m.steps && m.steps > 0) {
                        setSteps(m.steps);
                        detected++;
                    }
                    if (m.sampler) {
                        setSampler(m.sampler);
                        detected++;
                    }
                    if (m.scheduler) {
                        setScheduler(m.scheduler);
                        detected++;
                    }
                    if (m.cfg_scale && m.cfg_scale > 0) {
                        setCfgScale(m.cfg_scale);
                        detected++;
                    }
                    if (m.seed !== undefined && m.seed !== null && m.seed !== 0) {
                        setSeed(String(m.seed));
                        detected++;
                    }
                    if (m.width && m.width > 0) {
                        setWidth(m.width);
                        detected++;
                    }
                    if (m.height && m.height > 0) {
                        setHeight(m.height);
                        detected++;
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
                        detected += m.loras.length;
                    }

                    const sourceLabel =
                        m.source === "comfyui"
                            ? "ComfyUI Node Graph"
                            : m.source === "a1111"
                            ? "Automatic1111 / WebUI Parameters"
                            : m.source === "novelai"
                            ? "NovelAI Meta"
                            : "Image Metadata";

                    setMetaParseStatus({
                        source: m.source,
                        message: `Metadata detected from ${sourceLabel}! Prompts, seed, steps, and resolution auto-filled.`,
                        isSuccess: true,
                        detectedCount: detected,
                    });
                }
            } catch (err: any) {
                console.log("No metadata extracted:", err?.message);
                setMetaParseStatus({
                    message: "File ini tidak memiliki metadata generasi tertanam (mungkin di-strip oleh Pixiv/CDN). Form telah direset.",
                    isSuccess: false,
                });
            } finally {
                setIsParsingMeta(false);
            }
        }
    };

    // Handle file selection
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFileMetadata(e.target.files[0]);
        }
    };

    // Add resource row
    const handleAddResource = () => {
        setResources((prev) => [
            ...prev,
            { name: "", type: "lora", weight: 0.8 },
        ]);
    };

    // Remove resource row
    const handleRemoveResource = (index: number) => {
        setResources((prev) => prev.filter((_, idx) => idx !== index));
    };

    // Update resource row
    const handleUpdateResource = (
        index: number,
        field: keyof ResourceItemInput,
        val: any
    ) => {
        setResources((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: val };
            return updated;
        });
    };

    // Set as Thumbnail
    const handleSetThumbnail = async (imageId: number) => {
        try {
            setError(null);
            await setModelThumbnailApi(model.id, imageId);
            setSuccessMsg("Thumbnail model berhasil diperbarui!");
            setTimeout(() => setSuccessMsg(null), 3000);
            await loadImages();
            onImagesUpdated();
        } catch (err: any) {
            console.error("Failed to set thumbnail:", err);
            setError(err?.message || "Gagal menjadikan thumbnail");
        }
    };

    // Delete image
    const handleDeleteImage = async (imageId: number) => {
        if (!window.confirm("Hapus gambar sampel ini?")) return;
        try {
            setError(null);
            await deleteModelImageApi(imageId);
            setSuccessMsg("Gambar berhasil dihapus.");
            setTimeout(() => setSuccessMsg(null), 3000);
            await loadImages();
            onImagesUpdated();
        } catch (err: any) {
            console.error("Failed to delete image:", err);
            setError(err?.message || "Gagal menghapus gambar");
        }
    };

    // Submit new image
    const handleSubmitNewImage = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (uploadMode === "url" && !imageUrl.trim()) {
            setError("Masukkan URL gambar yang valid.");
            return;
        }

        if (uploadMode === "upload" && !selectedFile) {
            setError("Pilih file gambar untuk diupload.");
            return;
        }

        setSubmitting(true);
        try {
            const seedNum = seed ? parseInt(seed, 10) : Math.floor(Math.random() * 90000000) + 1000000;
            const validResources = resources.filter((r) => r.name.trim() !== "");

            if (uploadMode === "upload" && selectedFile) {
                const formData = new FormData();
                formData.append("image", selectedFile);
                formData.append("caption", caption.trim());
                formData.append("positive_prompt", positivePrompt.trim());
                formData.append("negative_prompt", negativePrompt.trim());
                formData.append("steps", String(steps));
                formData.append("sampler", sampler);
                formData.append("scheduler", scheduler);
                formData.append("cfg_scale", String(cfgScale));
                formData.append("seed", String(seedNum));
                formData.append("width", String(width));
                formData.append("height", String(height));
                if (validResources.length > 0) {
                    formData.append("resources", JSON.stringify(validResources));
                }

                await uploadModelImageFileApi(model.id, formData);
            } else {
                const payload: CreateImagePayload = {
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

                await createModelImageApi(model.id, payload);
            }

            setSuccessMsg("Gambar sampel & detail generasi berhasil ditambahkan!");
            setTimeout(() => setSuccessMsg(null), 3000);

            // Reset form
            setImageUrl("");
            setSelectedFile(null);
            setFilePreview(null);
            setCaption("");
            setPositivePrompt("");
            setNegativePrompt("");
            setSeed("");

            await loadImages();
            onImagesUpdated();
        } catch (err: any) {
            console.error("Failed to add image:", err);
            setError(err?.message || "Gagal menyimpan gambar baru");
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
                {/* Modal Header */}
                <div className="admin-modal-header">
                    <div>
                        <h2 className="admin-modal-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                            <span>Model Sample Images & Metadata</span>
                        </h2>
                        <span style={{ fontSize: "11px", color: "#666C75" }}>
                            Model: <strong style={{ color: "#E6E8EB" }}>{model.name}</strong> ({model.type} • {model.base_model})
                        </span>
                    </div>
                    <button className="admin-modal-close" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className="admin-modal-body" style={{ overflowY: "auto", flex: 1, padding: "20px" }}>
                    {/* Status Alerts */}
                    {error && (
                        <div style={{
                            padding: "10px 14px",
                            backgroundColor: "rgba(239, 68, 68, 0.1)",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            borderRadius: "4px",
                            color: "#EF4444",
                            fontSize: "12px",
                            marginBottom: "16px",
                        }}>
                            {error}
                        </div>
                    )}
                    {successMsg && (
                        <div style={{
                            padding: "10px 14px",
                            backgroundColor: "rgba(34, 197, 94, 0.1)",
                            border: "1px solid rgba(34, 197, 94, 0.3)",
                            borderRadius: "4px",
                            color: "#22C55E",
                            fontSize: "12px",
                            marginBottom: "16px",
                        }}>
                            {successMsg}
                        </div>
                    )}

                    {/* Section 1: Existing Images */}
                    <div style={{ marginBottom: "24px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                            <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#E6E8EB", margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                Sample Gallery ({images.length})
                            </h3>
                            <span style={{ fontSize: "11px", color: "#666C75" }}>
                                Primary thumbnail is displayed on the public models catalog.
                            </span>
                        </div>

                        {loading ? (
                            <div style={{ textAlign: "center", padding: "20px", color: "#666C75", fontSize: "12px" }}>
                                Loading images...
                            </div>
                        ) : images.length === 0 ? (
                            <div style={{
                                padding: "24px",
                                border: "1px dashed #292D32",
                                borderRadius: "4px",
                                textAlign: "center",
                                color: "#666C75",
                                background: "#111315",
                            }}>
                                <div style={{ fontWeight: 600, color: "#E6E8EB", fontSize: "13px" }}>No sample images uploaded</div>
                                <div style={{ fontSize: "11px", marginTop: "4px", color: "#666C75" }}>
                                    The catalog thumbnail is currently empty. Attach your first sample image using the form below.
                                </div>
                            </div>
                        ) : (
                            <div style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                                gap: "12px",
                            }}>
                                {images.map((img, idx) => {
                                    const isThumbnail = model.thumbnail_url === img.image_url || (!model.thumbnail_url && idx === 0);
                                    return (
                                        <div
                                            key={img.id}
                                            style={{
                                                background: "#1C1F23",
                                                border: isThumbnail ? "1px solid #3B82F6" : "1px solid #292D32",
                                                borderRadius: "4px",
                                                overflow: "hidden",
                                                display: "flex",
                                                flexDirection: "column",
                                                position: "relative",
                                            }}
                                        >
                                            <div style={{ position: "relative", height: "150px", background: "#111315" }}>
                                                <img
                                                    src={resolveImageUrl(img.image_url)}
                                                    alt={img.caption || `Sample ${img.id}`}
                                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                                    onError={(e) => {
                                                        (e.currentTarget as HTMLImageElement).src = "https://placehold.co/240x160?text=Preview+Error";
                                                    }}
                                                />
                                                {isThumbnail && (
                                                    <span style={{
                                                        position: "absolute",
                                                        top: "6px",
                                                        left: "6px",
                                                        background: "#3B82F6",
                                                        color: "#ffffff",
                                                        fontWeight: 600,
                                                        fontSize: "9px",
                                                        padding: "2px 6px",
                                                        borderRadius: "3px",
                                                        textTransform: "uppercase",
                                                        letterSpacing: "0.04em",
                                                        fontFamily: "monospace",
                                                    }}>
                                                        PRIMARY THUMBNAIL
                                                    </span>
                                                )}
                                                {img.width && img.height && (
                                                    <span style={{
                                                        position: "absolute",
                                                        bottom: "6px",
                                                        right: "6px",
                                                        background: "rgba(17, 19, 21, 0.85)",
                                                        color: "#9A9FA8",
                                                        fontSize: "10px",
                                                        padding: "2px 6px",
                                                        borderRadius: "3px",
                                                        fontFamily: "monospace",
                                                    }}>
                                                        {img.width} × {img.height}
                                                    </span>
                                                )}
                                            </div>

                                            <div style={{ padding: "10px", flex: 1, display: "flex", flexDirection: "column" }}>
                                                <div style={{ fontSize: "12px", fontWeight: 600, color: "#E6E8EB", marginBottom: "4px" }}>
                                                    {img.caption || `Sample #${img.id}`}
                                                </div>
                                                <div style={{
                                                    fontSize: "11px",
                                                    color: "#666C75",
                                                    display: "-webkit-box",
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: "vertical",
                                                    overflow: "hidden",
                                                    marginBottom: "10px",
                                                    flex: 1,
                                                    fontFamily: "monospace",
                                                }}>
                                                    {img.positive_prompt || "(No prompt recorded)"}
                                                </div>

                                                <div style={{ display: "flex", gap: "6px", borderTop: "1px solid #292D32", paddingTop: "8px" }}>
                                                    {!isThumbnail && (
                                                        <button
                                                            type="button"
                                                            className="btn-secondary-admin"
                                                            style={{ fontSize: "11px", padding: "3px 8px", flex: 1 }}
                                                            onClick={() => handleSetThumbnail(img.id)}
                                                        >
                                                            Set as Thumbnail
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        className="btn-danger-admin"
                                                        style={{ fontSize: "11px", padding: "3px 8px" }}
                                                        onClick={() => handleDeleteImage(img.id)}
                                                        title="Delete Sample"
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="3 6 5 6 21 6"></polyline>
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Section 2: Add New Image Form with Generation Settings */}
                    <div style={{
                        background: "#1C1F23",
                        border: "1px solid #292D32",
                        borderRadius: "4px",
                        padding: "16px",
                    }}>
                        <div style={{ marginBottom: "14px" }}>
                            <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#E6E8EB", margin: "0 0 3px 0", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                Attach Sample Generation & Hyperparameters
                            </h3>
                            <p style={{ fontSize: "11px", color: "#666C75", margin: 0 }}>
                                These parameters populate the technical inspector modal in the public Gallery and Catalog.
                            </p>
                        </div>

                        <form onSubmit={handleSubmitNewImage}>
                            {/* Mode Switcher */}
                            <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
                                <button
                                    type="button"
                                    className={`admin-filter-btn ${uploadMode === "url" ? "active" : ""}`}
                                    onClick={() => setUploadMode("url")}
                                    style={{ flex: 1, padding: "6px" }}
                                >
                                    External Image URL
                                </button>
                                <button
                                    type="button"
                                    className={`admin-filter-btn ${uploadMode === "upload" ? "active" : ""}`}
                                    onClick={() => setUploadMode("upload")}
                                    style={{ flex: 1, padding: "6px" }}
                                >
                                    Local File Upload
                                </button>
                            </div>

                            {/* Image Source Input */}
                            {uploadMode === "url" ? (
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
                            ) : (
                                <div className="form-group">
                                    <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span>
                                            Image File (PNG, JPG, WebP) <span className="required">*</span>
                                        </span>
                                        <span style={{ fontSize: "11px", color: "#6366f1", fontWeight: 500 }}>
                                            ⚡ Auto-extracts ComfyUI / A1111 prompts
                                        </span>
                                    </label>

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
                                            const fileInput = document.getElementById("model-image-file-input");
                                            if (fileInput) fileInput.click();
                                        }}
                                    >
                                        <input
                                            id="model-image-file-input"
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
                                                        const fileInput = document.getElementById("model-image-file-input");
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
                            )}

                            {/* Caption */}
                            <div className="form-group">
                                <label className="form-label">Caption / Sample Title (Optional)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. Masterpiece portrait, outfit sample, action scene..."
                                    value={caption}
                                    onChange={(e) => setCaption(e.target.value)}
                                />
                            </div>

                            {/* Positive Prompt */}
                            <div className="form-group">
                                <label className="form-label">Positive Prompt</label>
                                <textarea
                                    className="form-textarea mono"
                                    rows={3}
                                    placeholder="streetwear, oversized jacket, 1girl, urban background, night city neon lighting..."
                                    value={positivePrompt}
                                    onChange={(e) => setPositivePrompt(e.target.value)}
                                />
                            </div>

                            {/* Negative Prompt */}
                            <div className="form-group">
                                <label className="form-label">Negative Prompt</label>
                                <textarea
                                    className="form-textarea mono"
                                    rows={2}
                                    placeholder="(worst quality:1.4), formal wear, bad anatomy, blur..."
                                    value={negativePrompt}
                                    onChange={(e) => setNegativePrompt(e.target.value)}
                                />
                            </div>

                            {/* Generation Settings Grid */}
                            <div style={{
                                background: "#17191C",
                                border: "1px solid #292D32",
                                borderRadius: "4px",
                                padding: "12px",
                                marginBottom: "14px",
                            }}>
                                <label className="form-label" style={{ marginBottom: "10px", display: "block" }}>
                                    Generation Hyperparameters
                                </label>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: "10px" }}>Steps</label>
                                        <input
                                            type="number"
                                            className="form-input mono"
                                            min={1}
                                            max={150}
                                            value={steps}
                                            onChange={(e) => setSteps(Number(e.target.value))}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: "10px" }}>Sampler</label>
                                        <input
                                            type="text"
                                            className="form-input mono"
                                            placeholder="DPM++ 2M Karras"
                                            value={sampler}
                                            onChange={(e) => setSampler(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: "10px" }}>Scheduler</label>
                                        <input
                                            type="text"
                                            className="form-input mono"
                                            placeholder="Karras"
                                            value={scheduler}
                                            onChange={(e) => setScheduler(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: "10px" }}>CFG Scale</label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            min={1}
                                            max={30}
                                            className="form-input mono"
                                            value={cfgScale}
                                            onChange={(e) => setCfgScale(Number(e.target.value))}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: "10px" }}>Seed</label>
                                        <input
                                            type="text"
                                            className="form-input mono"
                                            placeholder="Random or e.g. 9410291"
                                            value={seed}
                                            onChange={(e) => setSeed(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: "10px" }}>Resolution (W × H)</label>
                                        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                                            <input
                                                type="number"
                                                className="form-input mono"
                                                placeholder="832"
                                                value={width}
                                                onChange={(e) => setWidth(Number(e.target.value))}
                                                style={{ textAlign: "center" }}
                                            />
                                            <span style={{ color: "#666C75" }}>×</span>
                                            <input
                                                type="number"
                                                className="form-input mono"
                                                placeholder="1216"
                                                value={height}
                                                onChange={(e) => setHeight(Number(e.target.value))}
                                                style={{ textAlign: "center" }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Resources Used */}
                            <div style={{
                                background: "#17191C",
                                border: "1px solid #292D32",
                                borderRadius: "4px",
                                padding: "12px",
                                marginBottom: "16px",
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                    <label className="form-label" style={{ margin: 0 }}>
                                        Resources Used (Checkpoint & LoRA)
                                    </label>
                                    <button
                                        type="button"
                                        className="btn-secondary-admin"
                                        style={{ fontSize: "11px", padding: "3px 8px" }}
                                        onClick={handleAddResource}
                                    >
                                        + Add Resource
                                    </button>
                                </div>

                                {resources.map((res, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            display: "flex",
                                            gap: "6px",
                                            alignItems: "center",
                                            marginBottom: "6px",
                                        }}
                                    >
                                        <select
                                            className="admin-select mono"
                                            value={res.type}
                                            onChange={(e) => handleUpdateResource(idx, "type", e.target.value)}
                                            style={{ width: "120px", fontSize: "11px" }}
                                        >
                                            <option value="checkpoint">CHECKPOINT</option>
                                            <option value="lora">LORA</option>
                                        </select>
                                        <input
                                            type="text"
                                            className="form-input mono"
                                            placeholder="Resource name (e.g. Illustrious XL Base)"
                                            value={res.name}
                                            onChange={(e) => handleUpdateResource(idx, "name", e.target.value)}
                                            style={{ flex: 1, fontSize: "11px" }}
                                        />
                                        {res.type === "lora" && (
                                            <input
                                                type="number"
                                                step="0.05"
                                                min="0.1"
                                                max="2.0"
                                                className="form-input mono"
                                                placeholder="Weight"
                                                value={res.weight ?? 0.8}
                                                onChange={(e) => handleUpdateResource(idx, "weight", Number(e.target.value))}
                                                style={{ width: "70px", textAlign: "center", fontSize: "11px" }}
                                                title="LoRA Weight / Strength"
                                            />
                                        )}
                                        <button
                                            type="button"
                                            className="btn-danger-admin"
                                            onClick={() => handleRemoveResource(idx)}
                                            style={{ padding: "6px 8px", fontSize: "11px" }}
                                            title="Remove resource"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                                <button
                                    type="button"
                                    className="btn-secondary-admin"
                                    onClick={onClose}
                                >
                                    Close
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary-admin"
                                    disabled={submitting}
                                >
                                    {submitting ? "Saving Sample..." : "Save Image & Metadata"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
