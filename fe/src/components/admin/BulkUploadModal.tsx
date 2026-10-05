import React, { useState, useEffect, useRef, useCallback } from "react";
import type { Model } from "../../api/models";
import { parseImageMetadataApi, uploadGalleryImageFileApi, type ParsedImageMetadata } from "../../api/admin";

interface BulkUploadItem {
    id: string;
    file: File;
    previewUrl: string;
    parsing: boolean;
    parseSource?: string;
    metadata?: ParsedImageMetadata;
    caption: string;
    status: "queued" | "uploading" | "success" | "error";
    errorMessage?: string;
}

interface BulkUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    availableModels: Model[];
    initialFiles?: File[];
    onSuccess: () => void;
    onToast: (type: "success" | "error" | "info", message: string) => void;
}

const Icons = {
    UploadCloud: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 16 12 12 8 16" />
            <line x1="12" y1="12" x2="12" y2="21" />
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
        </svg>
    ),
    Target: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
        </svg>
    ),
    Tag: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
    ),
    Type: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 7 4 4 20 4 20 7" />
            <line x1="9" y1="20" x2="15" y2="20" />
            <line x1="12" y1="4" x2="12" y2="20" />
        </svg>
    ),
    Check: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
    X: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    ),
    Spinner: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
        </svg>
    ),
};

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
    isOpen,
    onClose,
    availableModels,
    initialFiles = [],
    onSuccess,
    onToast,
}) => {
    const [items, setItems] = useState<BulkUploadItem[]>([]);
    const [selectedModelId, setSelectedModelId] = useState<string>("all");
    const [batchTagInput, setBatchTagInput] = useState<string>("");
    const [batchTags, setBatchTags] = useState<string[]>(["showcase"]);
    const [captionPrefix, setCaptionPrefix] = useState<string>("");
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const parseItemMetadata = async (item: BulkUploadItem) => {
        try {
            const res = await parseImageMetadataApi(item.file);
            if (res && res.metadata) {
                setItems((prev) =>
                    prev.map((it) => {
                        if (it.id === item.id) {
                            return {
                                ...it,
                                parsing: false,
                                parseSource: res.source || res.metadata.source,
                                metadata: res.metadata,
                                caption: it.caption || res.metadata.model_name || item.file.name.replace(/\.[^/.]+$/, ""),
                            };
                        }
                        return it;
                    })
                );
            } else {
                setItems((prev) =>
                    prev.map((it) => (it.id === item.id ? { ...it, parsing: false, parseSource: "none" } : it))
                );
            }
        } catch {
            setItems((prev) =>
                prev.map((it) => (it.id === item.id ? { ...it, parsing: false, parseSource: "none" } : it))
            );
        }
    };

    const addFilesToQueue = useCallback((files: FileList | File[]) => {
        const fileArr = Array.from(files).filter((f) => f.type.startsWith("image/"));
        if (fileArr.length === 0) return;

        const newItems: BulkUploadItem[] = fileArr.map((f, idx) => ({
            id: `${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            file: f,
            previewUrl: URL.createObjectURL(f),
            parsing: true,
            caption: f.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "),
            status: "queued",
        }));

        setItems((prev) => [...prev, ...newItems]);
        newItems.forEach((it) => parseItemMetadata(it));
    }, []);

    useEffect(() => {
        if (isOpen && initialFiles.length > 0) {
            addFilesToQueue(initialFiles);
        }
    }, [isOpen, initialFiles, addFilesToQueue]);

    useEffect(() => {
        return () => {
            items.forEach((it) => URL.revokeObjectURL(it.previewUrl));
        };
    }, [items]);

    if (!isOpen) return null;

    const handleAddBatchTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && batchTagInput.trim()) {
            e.preventDefault();
            const val = batchTagInput.trim().toLowerCase().replace(/^#/, "");
            if (!batchTags.includes(val)) {
                setBatchTags([...batchTags, val]);
            }
            setBatchTagInput("");
        }
    };

    const handleRemoveBatchTag = (tag: string) => {
        setBatchTags(batchTags.filter((t) => t !== tag));
    };

    const handleRemoveItem = (id: string) => {
        setItems((prev) => {
            const item = prev.find((it) => it.id === id);
            if (item) URL.revokeObjectURL(item.previewUrl);
            return prev.filter((it) => it.id !== id);
        });
    };

    const handleClearAll = () => {
        items.forEach((it) => URL.revokeObjectURL(it.previewUrl));
        setItems([]);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            addFilesToQueue(e.dataTransfer.files);
        }
    };

    const handleStartUpload = async () => {
        const queuedItems = items.filter((it) => it.status === "queued" || it.status === "error");
        if (queuedItems.length === 0) return;

        setIsUploading(true);
        setUploadProgress({ current: 0, total: queuedItems.length });

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < queuedItems.length; i++) {
            const it = queuedItems[i];
            setUploadProgress({ current: i + 1, total: queuedItems.length });

            setItems((prev) =>
                prev.map((item) => (item.id === it.id ? { ...item, status: "uploading", errorMessage: undefined } : item))
            );

            try {
                const formData = new FormData();
                formData.append("image", it.file);

                const finalCaption = captionPrefix.trim()
                    ? `${captionPrefix.trim()} - ${it.caption}`
                    : it.caption;
                formData.append("caption", finalCaption);

                if (selectedModelId !== "all" && selectedModelId !== "standalone") {
                    formData.append("model_id", selectedModelId);
                } else if (it.metadata?.model_name) {
                    formData.append("model_name", it.metadata.model_name);
                }

                if (it.metadata?.positive_prompt) {
                    formData.append("positive_prompt", it.metadata.positive_prompt);
                }
                if (it.metadata?.negative_prompt) {
                    formData.append("negative_prompt", it.metadata.negative_prompt);
                }
                if (it.metadata?.steps) {
                    formData.append("steps", String(it.metadata.steps));
                }
                if (it.metadata?.sampler) {
                    formData.append("sampler", it.metadata.sampler);
                }
                if (it.metadata?.scheduler) {
                    formData.append("scheduler", it.metadata.scheduler);
                }
                if (it.metadata?.cfg_scale) {
                    formData.append("cfg_scale", String(it.metadata.cfg_scale));
                }
                if (it.metadata?.seed !== undefined) {
                    formData.append("seed", String(it.metadata.seed));
                }
                if (it.metadata?.width) {
                    formData.append("width", String(it.metadata.width));
                }
                if (it.metadata?.height) {
                    formData.append("height", String(it.metadata.height));
                }

                if (it.metadata?.loras && it.metadata.loras.length > 0) {
                    const validResources = it.metadata.loras.map((lora) => ({
                        name: lora.name,
                        type: "lora",
                        weight: lora.weight || 0.8,
                    }));
                    formData.append("resources", JSON.stringify(validResources));
                }

                if (batchTags.length > 0) {
                    formData.append("tags", JSON.stringify(batchTags));
                }

                await uploadGalleryImageFileApi(formData);
                successCount++;

                setItems((prev) =>
                    prev.map((item) => (item.id === it.id ? { ...item, status: "success" } : item))
                );
            } catch (err: any) {
                failCount++;
                console.error("Bulk upload item error:", err);
                setItems((prev) =>
                    prev.map((item) =>
                        item.id === it.id
                            ? { ...item, status: "error", errorMessage: err?.message || "Failed to upload" }
                            : item
                    )
                );
            }
        }

        setIsUploading(false);

        if (successCount > 0) {
            onToast("success", `Berhasil mengunggah ${successCount} gambar ke galeri!`);
            onSuccess();
        }
        if (failCount > 0) {
            onToast("error", `${failCount} gambar gagal diunggah. Silakan periksa detail.`);
        }
    };

    const queuedCount = items.filter((it) => it.status === "queued" || it.status === "error").length;
    const successCount = items.filter((it) => it.status === "success").length;

    return (
        <div className="admin-modal-backdrop" onClick={isUploading ? undefined : onClose}>
            <div className="bulk-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="admin-modal-header">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div className="bulk-header-icon">
                            <Icons.UploadCloud />
                        </div>
                        <div>
                            <h2 className="admin-modal-title" style={{ fontSize: "16px" }}>
                                Batch Generation Ingester
                            </h2>
                            <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#6C7077", fontFamily: "ui-monospace, monospace" }}>
                                Ingest multiple ComfyUI / WebUI generation renders with automatic chunk parsing
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="admin-modal-close"
                        onClick={onClose}
                        disabled={isUploading}
                        title="Close (Esc)"
                    >
                        ✕
                    </button>
                </div>

                {/* Body Content */}
                <div style={{ overflowY: "auto", padding: "16px 24px", flex: 1 }}>
                    {/* Batch Global Defaults Configuration */}
                    <div className="bulk-settings-grid">
                        {/* Target Model Selection */}
                        <div className="bulk-field-group">
                            <label>
                                <Icons.Target /> Target Model
                            </label>
                            <select
                                className="admin-select"
                                style={{ width: "100%", padding: "7px 10px", fontSize: "12px" }}
                                value={selectedModelId}
                                onChange={(e) => setSelectedModelId(e.target.value)}
                                disabled={isUploading}
                            >
                                <option value="all">Auto-detect from metadata / Standalone</option>
                                <option value="standalone">Standalone (Unlinked)</option>
                                {availableModels.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name} ({m.base_model})
                                    </option>
                                ))}
                            </select>
                            <span className="bulk-field-desc">
                                Associate entire batch to this catalog model if selected.
                            </span>
                        </div>

                        {/* Batch Tags */}
                        <div className="bulk-field-group">
                            <label>
                                <Icons.Tag /> Common Batch Tags
                            </label>
                            <div className="bulk-tags-container">
                                {batchTags.map((tag) => (
                                    <span key={tag} className="bulk-tag-chip">
                                        #{tag}
                                        {!isUploading && (
                                            <button type="button" onClick={() => handleRemoveBatchTag(tag)}>
                                                ✕
                                            </button>
                                        )}
                                    </span>
                                ))}
                            </div>
                            <input
                                type="text"
                                className="admin-input"
                                placeholder="Type tag and press Enter..."
                                value={batchTagInput}
                                onChange={(e) => setBatchTagInput(e.target.value)}
                                onKeyDown={handleAddBatchTag}
                                disabled={isUploading}
                                style={{ width: "100%", padding: "6px 10px", fontSize: "12px" }}
                            />
                        </div>

                        {/* Caption Prefix */}
                        <div className="bulk-field-group">
                            <label>
                                <Icons.Type /> Caption Prefix
                            </label>
                            <input
                                type="text"
                                className="admin-input"
                                placeholder="e.g. Illustrious Benchmark"
                                value={captionPrefix}
                                onChange={(e) => setCaptionPrefix(e.target.value)}
                                disabled={isUploading}
                                style={{ width: "100%", padding: "7px 10px", fontSize: "12px" }}
                            />
                            <span className="bulk-field-desc">
                                Prefix prepended to individual titles in this batch.
                            </span>
                        </div>
                    </div>

                    {/* Drag and Drop Zone */}
                    <div
                        className={`bulk-dropzone ${isDragging ? "dragging" : ""}`}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => !isUploading && fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/png,image/jpeg,image/webp"
                            style={{ display: "none" }}
                            onChange={(e) => {
                                if (e.target.files) addFilesToQueue(e.target.files);
                                e.target.value = "";
                            }}
                            disabled={isUploading}
                        />
                        <div className="bulk-dropzone-icon">
                            <Icons.UploadCloud />
                        </div>
                        <h4 className="bulk-dropzone-title">
                            Drop multiple renders here or click to browse
                        </h4>
                        <p className="bulk-dropzone-sub">
                            Supported: PNG with embedded generation chunks, WebP, and JPEG
                        </p>
                    </div>

                    {/* Queue Status Bar */}
                    <div className="bulk-queue-bar">
                        <div className="bulk-queue-title">
                            Batch Queue ({items.length} files)
                            {successCount > 0 && (
                                <span style={{ marginLeft: "8px", color: "#4ADE80" }}>
                                    ✓ {successCount} uploaded
                                </span>
                            )}
                        </div>
                        {items.length > 0 && !isUploading && (
                            <button
                                type="button"
                                onClick={handleClearAll}
                                style={{
                                    background: "transparent",
                                    border: "none",
                                    color: "#EF4444",
                                    fontSize: "11px",
                                    cursor: "pointer",
                                    fontFamily: "ui-monospace, monospace",
                                }}
                            >
                                Clear Queue
                            </button>
                        )}
                    </div>

                    {/* Progress Bar during upload */}
                    {isUploading && (
                        <div className="bulk-progress-wrap">
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#9CA3AF", fontFamily: "ui-monospace, monospace" }}>
                                <span>Uploading images ({uploadProgress.current}/{uploadProgress.total})...</span>
                                <span>{Math.round((uploadProgress.current / (uploadProgress.total || 1)) * 100)}%</span>
                            </div>
                            <div className="bulk-progress-bar-bg">
                                <div
                                    className="bulk-progress-bar-fill"
                                    style={{ width: `${(uploadProgress.current / (uploadProgress.total || 1)) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Items List */}
                    {items.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "28px 16px", color: "#6C7077", fontSize: "12px", fontFamily: "ui-monospace, monospace" }}>
                            Queue empty. Drop generation files above to begin parsing.
                        </div>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "8px" }}>
                            {items.map((it, idx) => {
                                const sourceClass = (it.parseSource || "none").toLowerCase();
                                return (
                                    <div
                                        key={it.id}
                                        className={`bulk-item-row ${it.status}`}
                                    >
                                        {/* Thumbnail Preview */}
                                        <div className="bulk-item-thumb">
                                            <img src={it.previewUrl} alt={it.caption} />
                                            <span className="bulk-item-idx">#{idx + 1}</span>
                                        </div>

                                        {/* Metadata & Title */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                                                <input
                                                    type="text"
                                                    value={it.caption}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setItems((prev) =>
                                                            prev.map((item) => (item.id === it.id ? { ...item, caption: val } : item))
                                                        );
                                                    }}
                                                    disabled={isUploading}
                                                    className="bulk-item-title-input"
                                                    title="Click to edit artwork title"
                                                />

                                                {/* Parser Badge */}
                                                {it.parsing ? (
                                                    <span style={{ fontSize: "10px", color: "#FBBF24", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                                        <Icons.Spinner /> Parsing
                                                    </span>
                                                ) : it.parseSource && it.parseSource !== "none" ? (
                                                    <span className={`bulk-source-badge ${sourceClass}`}>
                                                        {it.parseSource}
                                                    </span>
                                                ) : (
                                                    <span className="bulk-source-badge none">Raw</span>
                                                )}
                                            </div>

                                            {/* Technical specs pill strip */}
                                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", fontSize: "11px" }}>
                                                {it.metadata?.width && it.metadata?.height && (
                                                    <span className="bulk-spec-tag">
                                                        {it.metadata.width}×{it.metadata.height}
                                                    </span>
                                                )}
                                                {it.metadata?.sampler && (
                                                    <span className="bulk-spec-tag">
                                                        {it.metadata.sampler}
                                                    </span>
                                                )}
                                                {it.metadata?.steps && (
                                                    <span className="bulk-spec-tag">
                                                        Steps: {it.metadata.steps}
                                                    </span>
                                                )}
                                                {it.metadata?.model_name && (
                                                    <span className="bulk-spec-tag" style={{ color: "#818CF8", borderColor: "rgba(129, 140, 248, 0.3)" }}>
                                                        {it.metadata.model_name}
                                                    </span>
                                                )}
                                                {it.metadata?.loras && it.metadata.loras.length > 0 && (
                                                    <span className="bulk-spec-tag" style={{ color: "#FBBF24", borderColor: "rgba(251, 191, 36, 0.3)" }}>
                                                        {it.metadata.loras.length} LoRAs
                                                    </span>
                                                )}
                                            </div>

                                            {/* Prompt Preview snippet */}
                                            {it.metadata?.positive_prompt && (
                                                <p className="bulk-prompt-snippet" title={it.metadata.positive_prompt}>
                                                    {it.metadata.positive_prompt}
                                                </p>
                                            )}

                                            {it.errorMessage && (
                                                <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#EF4444" }}>
                                                    {it.errorMessage}
                                                </p>
                                            )}
                                        </div>

                                        {/* Status / Remove Action */}
                                        <div style={{ flexShrink: 0, paddingLeft: "8px" }}>
                                            {it.status === "uploading" && (
                                                <span style={{ color: "#818CF8" }} title="Uploading...">
                                                    <Icons.Spinner />
                                                </span>
                                            )}
                                            {it.status === "success" && (
                                                <span style={{ color: "#4ADE80" }} title="Uploaded">
                                                    <Icons.Check />
                                                </span>
                                            )}
                                            {it.status === "error" && (
                                                <span style={{ color: "#EF4444" }} title="Error">
                                                    <Icons.X />
                                                </span>
                                            )}
                                            {it.status === "queued" && !isUploading && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveItem(it.id)}
                                                    style={{
                                                        background: "transparent",
                                                        border: "none",
                                                        color: "#6C7077",
                                                        cursor: "pointer",
                                                        padding: "4px",
                                                        display: "flex",
                                                        alignItems: "center",
                                                    }}
                                                    title="Remove from batch"
                                                >
                                                    <Icons.X />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="admin-modal-footer">
                    <span style={{ fontSize: "11px", color: "#6C7077", fontFamily: "ui-monospace, monospace" }}>
                        {queuedCount > 0 ? `${queuedCount} ready to upload` : "All items processed"}
                    </span>
                    <div style={{ display: "flex", gap: "8px" }}>
                        <button
                            type="button"
                            className="btn-secondary-admin"
                            onClick={onClose}
                            disabled={isUploading}
                        >
                            {items.some((it) => it.status === "success") ? "Done" : "Cancel"}
                        </button>
                        <button
                            type="button"
                            className="btn-primary-admin"
                            onClick={handleStartUpload}
                            disabled={isUploading || queuedCount === 0}
                            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                        >
                            {isUploading ? (
                                <>
                                    <Icons.Spinner />
                                    <span>Uploading ({uploadProgress.current}/{uploadProgress.total})...</span>
                                </>
                            ) : (
                                <>
                                    <Icons.UploadCloud />
                                    <span>Upload Batch ({queuedCount})</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
