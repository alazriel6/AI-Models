import React, { useState, useEffect, useMemo } from "react";
import type { Model, ModelImage } from "../../api/models";
import { getAllGalleryImagesApi, deleteGalleryImageApi } from "../../api/admin";
import { GalleryImageModal } from "./GalleryImageModal";

interface GalleryManagerProps {
    availableModels: Model[];
    onToast: (type: "success" | "error" | "info", message: string) => void;
}

export const GalleryManager: React.FC<GalleryManagerProps> = ({ availableModels, onToast }) => {
    const [images, setImages] = useState<ModelImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState("");
    const [modelFilter, setModelFilter] = useState<string>("all");
    const [sortBy, setSortBy] = useState<string>("newest");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [imageToEdit, setImageToEdit] = useState<ModelImage | null>(null);
    const [droppedFile, setDroppedFile] = useState<File | null>(null);
    const [isDraggingFile, setIsDraggingFile] = useState(false);
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    // Delete confirmation
    const [imageToDelete, setImageToDelete] = useState<ModelImage | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Preview image popup
    const [previewImage, setPreviewImage] = useState<ModelImage | null>(null);

    const loadImages = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await getAllGalleryImagesApi({ limit: 150, sort: sortBy });
            if (res && res.data && Array.isArray(res.data)) {
                setImages(res.data);
            } else {
                setImages([]);
            }
        } catch (err: any) {
            console.error("Failed to load gallery images:", err);
            setError(err?.message || "Failed to fetch gallery images");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadImages();
    }, [sortBy]);

    // Client-side filtering
    const filteredImages = useMemo(() => {
        return images.filter((img) => {
            // Model Filter
            if (modelFilter !== "all") {
                if (modelFilter === "standalone") {
                    if (img.model_id && img.model_id > 0) return false;
                } else {
                    if (String(img.model_id) !== modelFilter) return false;
                }
            }

            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const captionMatch = img.caption?.toLowerCase().includes(q);
                const promptMatch = img.positive_prompt?.toLowerCase().includes(q);
                const modelMatch =
                    img.model_name?.toLowerCase().includes(q) ||
                    img.model?.name?.toLowerCase().includes(q);
                const samplerMatch = img.sampler?.toLowerCase().includes(q);

                if (!captionMatch && !promptMatch && !modelMatch && !samplerMatch) {
                    return false;
                }
            }

            return true;
        });
    }, [images, modelFilter, searchQuery]);

    const handleDropFile = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingFile(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            setImageToEdit(null);
            setDroppedFile(file);
            setIsModalOpen(true);
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageToEdit(null);
            setDroppedFile(file);
            setIsModalOpen(true);
            e.target.value = "";
        }
    };

    const handleCopyPrompt = (id: number, text?: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleDelete = async () => {
        if (!imageToDelete) return;
        try {
            setIsDeleting(true);
            await deleteGalleryImageApi(imageToDelete.id);
            onToast("success", `Gallery image #${imageToDelete.id} deleted successfully.`);
            setImageToDelete(null);
            await loadImages();
        } catch (err: any) {
            console.error("Delete failed:", err);
            onToast("error", err?.message || "Failed to delete image.");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div style={{ marginTop: "16px" }}>
            {/* Toolbar */}
            <div className="admin-toolbar" style={{ marginBottom: "16px" }}>
                <div className="admin-search-wrapper" style={{ flex: 1, minWidth: "260px" }}>
                    <svg
                        className="admin-search-icon"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                        type="text"
                        className="admin-search-input"
                        placeholder="Filter by prompt, caption, checkpoint, sampler..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    {/* Model Filter */}
                    <select
                        className="admin-select"
                        value={modelFilter}
                        onChange={(e) => setModelFilter(e.target.value)}
                    >
                        <option value="all">All Checkpoints</option>
                        <option value="standalone">Standalone (Custom)</option>
                        {availableModels.map((m) => (
                            <option key={m.id} value={m.id}>
                                {m.name}
                            </option>
                        ))}
                    </select>

                    {/* Sort Filter */}
                    <select
                        className="admin-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="steps_desc">Highest Steps</option>
                        <option value="steps_asc">Lowest Steps</option>
                    </select>

                    {/* Hidden Native File Input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        style={{ display: "none" }}
                        onChange={handleFileInputChange}
                    />

                    {/* Quick Ingest PNG Button */}
                    <button
                        type="button"
                        className="btn-secondary-admin"
                        onClick={() => fileInputRef.current?.click()}
                        title="Upload PNG from disk to auto-parse metadata"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        <span>Parse PNG</span>
                    </button>

                    {/* Add Image Button */}
                    <button
                        type="button"
                        className="btn-primary-admin"
                        onClick={() => {
                            setDroppedFile(null);
                            setImageToEdit(null);
                            setIsModalOpen(true);
                        }}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        <span>Add to Gallery</span>
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div style={{
                    padding: "12px 16px",
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "4px",
                    color: "#EF4444",
                    fontSize: "12px",
                    marginBottom: "16px",
                }}>
                    {error}
                </div>
            )}

            {/* Images Grid */}
            {loading ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "#666C75", fontSize: "13px" }}>
                    Loading showcase images from database...
                </div>
            ) : filteredImages.length === 0 ? (
                <div
                    className={`gallery-dropzone ${isDraggingFile ? "drag-active" : ""}`}
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingFile(true);
                    }}
                    onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingFile(false);
                    }}
                    onDrop={handleDropFile}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div style={{
                        width: "52px",
                        height: "52px",
                        borderRadius: "10px",
                        background: isDraggingFile ? "rgba(99, 102, 241, 0.2)" : "#171A1F",
                        border: isDraggingFile ? "1px solid #818CF8" : "1px solid #282D36",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 16px auto",
                        color: isDraggingFile ? "#818CF8" : "#9AA0AC",
                        transition: "all 0.15s ease",
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                    </div>

                    <div style={{ fontSize: "15px", fontWeight: 600, color: "#FFFFFF", marginBottom: "6px" }}>
                        {isDraggingFile ? "Release PNG to Parse Metadata & Add" : "Drag & Drop Image or Click to Ingest"}
                    </div>

                    <div style={{ fontSize: "12px", color: "#8A909C", maxWidth: "480px", margin: "0 auto 18px auto", lineHeight: "1.6" }}>
                        {searchQuery || modelFilter !== "all"
                            ? "No items match your active filters. Clear search or adjust checkpoint selection."
                            : "Drop any ComfyUI, WebUI, SD-Forge, or NovelAI PNG output. Prompts, checkpoints, LoRAs, seed, steps, and samplers will be extracted automatically."}
                    </div>

                    <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
                        <button
                            type="button"
                            className="btn-primary-admin"
                            onClick={(e) => {
                                e.stopPropagation();
                                fileInputRef.current?.click();
                            }}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                            <span>Browse PNG File</span>
                        </button>
                        <button
                            type="button"
                            className="btn-secondary-admin"
                            onClick={(e) => {
                                e.stopPropagation();
                                setDroppedFile(null);
                                setImageToEdit(null);
                                setIsModalOpen(true);
                            }}
                        >
                            <span>Manual Entry / Image URL</span>
                        </button>
                    </div>

                    <div className="gallery-format-chips">
                        <div className="gallery-format-chip">
                            <span className="chip-dot" />
                            <span>ComfyUI Node Graph</span>
                        </div>
                        <div className="gallery-format-chip">
                            <span className="chip-dot" />
                            <span>A1111 / WebUI</span>
                        </div>
                        <div className="gallery-format-chip">
                            <span className="chip-dot" />
                            <span>SD Forge</span>
                        </div>
                        <div className="gallery-format-chip">
                            <span className="chip-dot" />
                            <span>NovelAI Metadata</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
                        gap: "16px",
                    }}
                >
                    {filteredImages.map((img) => {
                        const modelDisplay =
                            img.model?.name ||
                            img.model_name ||
                            "Standalone Checkpoint";

                        const isCopied = copiedId === img.id;

                        return (
                            <div key={img.id} className="gallery-card">
                                {/* Thumbnail Container */}
                                <div
                                    className="gallery-thumb-wrap"
                                    onClick={() => setPreviewImage(img)}
                                    title="Click to view full image"
                                >
                                    <img
                                        src={img.image_url}
                                        alt={img.caption || "Gallery item"}
                                        loading="lazy"
                                    />

                                    {/* Resolution badge */}
                                    {img.width && img.height && (
                                        <span
                                            style={{
                                                position: "absolute",
                                                bottom: "8px",
                                                right: "8px",
                                                background: "rgba(17, 19, 21, 0.88)",
                                                border: "1px solid #292D32",
                                                color: "#9A9FA8",
                                                fontSize: "10px",
                                                padding: "2px 6px",
                                                borderRadius: "3px",
                                                fontFamily: "ui-monospace, monospace",
                                            }}
                                        >
                                            {img.width} × {img.height}
                                        </span>
                                    )}

                                    {/* ID badge */}
                                    <span
                                        style={{
                                            position: "absolute",
                                            top: "8px",
                                            left: "8px",
                                            background: "rgba(17, 19, 21, 0.88)",
                                            border: "1px solid #292D32",
                                            color: "#E6E8EB",
                                            fontSize: "10px",
                                            padding: "2px 6px",
                                            borderRadius: "3px",
                                            fontFamily: "ui-monospace, monospace",
                                            fontWeight: 600,
                                        }}
                                    >
                                        #{img.id}
                                    </span>
                                </div>

                                {/* Content Details */}
                                <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column" }}>
                                    {/* Model Tag */}
                                    <div style={{ marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                                        <span
                                            style={{
                                                fontSize: "11px",
                                                fontWeight: 600,
                                                color: img.model_id ? "#818cf8" : "#94a3b8",
                                                background: img.model_id ? "rgba(99, 102, 241, 0.12)" : "rgba(100, 116, 139, 0.12)",
                                                border: img.model_id ? "1px solid rgba(99, 102, 241, 0.25)" : "1px solid rgba(100, 116, 139, 0.25)",
                                                padding: "2px 7px",
                                                borderRadius: "3px",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                                maxWidth: "180px",
                                                fontFamily: "ui-monospace, monospace",
                                            }}
                                            title={modelDisplay}
                                        >
                                            {modelDisplay}
                                        </span>

                                        {img.positive_prompt && (
                                            <button
                                                type="button"
                                                onClick={() => handleCopyPrompt(img.id, img.positive_prompt)}
                                                style={{
                                                    background: "transparent",
                                                    border: "none",
                                                    color: isCopied ? "#4ADE80" : "#6E7681",
                                                    fontSize: "11px",
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "4px",
                                                    padding: "2px 4px",
                                                }}
                                                title="Copy prompt to clipboard"
                                            >
                                                {isCopied ? "Copied!" : "Copy Prompt"}
                                            </button>
                                        )}
                                    </div>

                                    {/* Caption */}
                                    <div style={{ fontSize: "12px", fontWeight: 600, color: "#FFFFFF", marginBottom: "4px" }}>
                                        {img.caption || "Sample Generation"}
                                    </div>

                                    {/* Prompt preview */}
                                    <div
                                        style={{
                                            fontSize: "11px",
                                            color: "#7D8590",
                                            display: "-webkit-box",
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: "vertical",
                                            overflow: "hidden",
                                            marginBottom: "10px",
                                            flex: 1,
                                            fontFamily: "ui-monospace, monospace",
                                            lineHeight: "1.4",
                                        }}
                                        title={img.positive_prompt}
                                    >
                                        {img.positive_prompt || "(No prompt recorded)"}
                                    </div>

                                    {/* Parameters tags */}
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "12px" }}>
                                        {img.steps && (
                                            <span style={{ fontSize: "10px", background: "#181B20", border: "1px solid #262B34", color: "#9A9FA8", padding: "1px 5px", borderRadius: "3px", fontFamily: "ui-monospace, monospace" }}>
                                                {img.steps} steps
                                            </span>
                                        )}
                                        {img.sampler && (
                                            <span style={{ fontSize: "10px", background: "#181B20", border: "1px solid #262B34", color: "#9A9FA8", padding: "1px 5px", borderRadius: "3px", fontFamily: "ui-monospace, monospace" }}>
                                                {img.sampler}
                                            </span>
                                        )}
                                        {img.cfg_scale && (
                                            <span style={{ fontSize: "10px", background: "#181B20", border: "1px solid #262B34", color: "#9A9FA8", padding: "1px 5px", borderRadius: "3px", fontFamily: "ui-monospace, monospace" }}>
                                                CFG {img.cfg_scale}
                                            </span>
                                        )}
                                        {img.resources && img.resources.length > 0 && (
                                            <span style={{ fontSize: "10px", background: "rgba(234, 179, 8, 0.1)", border: "1px solid rgba(234, 179, 8, 0.25)", color: "#facc15", padding: "1px 5px", borderRadius: "3px", fontFamily: "ui-monospace, monospace" }}>
                                                +{img.resources.length} LoRA
                                            </span>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: "flex", gap: "6px", borderTop: "1px solid #20242B", paddingTop: "10px" }}>
                                        <button
                                            type="button"
                                            className="btn-secondary-admin"
                                            style={{ flex: 1, fontSize: "11px", padding: "4px 8px", justifyContent: "center" }}
                                            onClick={() => {
                                                setImageToEdit(img);
                                                setDroppedFile(null);
                                                setIsModalOpen(true);
                                            }}
                                        >
                                            Edit Details
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-danger-admin"
                                            style={{ fontSize: "11px", padding: "4px 10px" }}
                                            onClick={() => setImageToDelete(img)}
                                            title="Delete image"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal Add / Edit */}
            {isModalOpen && (
                <GalleryImageModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setDroppedFile(null);
                    }}
                    imageToEdit={imageToEdit}
                    initialFile={droppedFile}
                    availableModels={availableModels}
                    onSaved={() => {
                        onToast("success", imageToEdit ? "Image updated successfully!" : "Image published to gallery!");
                        loadImages();
                    }}
                />
            )}

            {/* Delete Confirmation Modal */}
            {imageToDelete && (
                <div className="admin-modal-backdrop" onClick={() => setImageToDelete(null)}>
                    <div
                        className="admin-modal-content"
                        style={{ maxWidth: "440px" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="admin-modal-header">
                            <h2 className="admin-modal-title" style={{ color: "#EF4444" }}>
                                Confirm Deletion
                            </h2>
                            <button className="admin-modal-close" onClick={() => setImageToDelete(null)}>✕</button>
                        </div>
                        <div className="admin-modal-body" style={{ padding: "16px 20px" }}>
                            <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#E6E8EB" }}>
                                Are you sure you want to delete gallery image <strong>#{imageToDelete.id}</strong> ({imageToDelete.caption || "Untitled"})?
                            </p>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                                <button
                                    type="button"
                                    className="btn-secondary-admin"
                                    onClick={() => setImageToDelete(null)}
                                    disabled={isDeleting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn-danger-admin"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? "Deleting..." : "Delete Permanently"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {previewImage && (
                <div className="admin-modal-backdrop" onClick={() => setPreviewImage(null)}>
                    <div
                        className="admin-modal-content"
                        style={{ maxWidth: "800px", padding: 0, overflow: "hidden" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ position: "relative", background: "#0a0a0b", textAlign: "center" }}>
                            <img
                                src={previewImage.image_url}
                                alt="Full preview"
                                style={{ maxHeight: "75vh", maxWidth: "100%", objectFit: "contain", display: "block", margin: "0 auto" }}
                            />
                            <button
                                type="button"
                                style={{
                                    position: "absolute",
                                    top: "10px",
                                    right: "10px",
                                    background: "rgba(17, 19, 21, 0.8)",
                                    border: "1px solid #292D32",
                                    color: "#fff",
                                    padding: "4px 8px",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                }}
                                onClick={() => setPreviewImage(null)}
                            >
                                ✕
                            </button>
                        </div>
                        <div style={{ padding: "16px", background: "#16181B" }}>
                            <div style={{ fontSize: "13px", fontWeight: 600, color: "#E6E8EB", marginBottom: "4px" }}>
                                {previewImage.caption || `Sample #${previewImage.id}`}
                            </div>
                            <div style={{ fontSize: "11px", color: "#9A9FA8", fontFamily: "monospace" }}>
                                Model: {previewImage.model?.name || previewImage.model_name || "Custom Checkpoint"} • {previewImage.width}×{previewImage.height} • Steps: {previewImage.steps} • CFG: {previewImage.cfg_scale} • Seed: {previewImage.seed || "-"}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
