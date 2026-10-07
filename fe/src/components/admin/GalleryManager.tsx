import React, { useState, useEffect, useMemo } from "react";
import type { Model, ModelImage } from "../../api/models";
import { getAllGalleryImagesApi, deleteGalleryImageApi } from "../../api/admin";
import { resolveImageUrl } from "../../api/client";
import { GalleryImageModal } from "./GalleryImageModal";
import { BulkUploadModal } from "./BulkUploadModal";

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
    const [selectedTag, setSelectedTag] = useState<string>("all");
    const [sortBy, setSortBy] = useState<string>("newest");
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const searchWrapRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
                setIsSearchFocused(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [imageToEdit, setImageToEdit] = useState<ModelImage | null>(null);
    const [droppedFile, setDroppedFile] = useState<File | null>(null);
    const [isDraggingFile, setIsDraggingFile] = useState(false);
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    // Bulk upload modal state
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkInitialFiles, setBulkInitialFiles] = useState<File[]>([]);
    const bulkFileInputRef = React.useRef<HTMLInputElement | null>(null);

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

    // Unique tags aggregated from all images
    const allTags = useMemo(() => {
        const counts = new Map<string, number>();
        for (const img of images) {
            if (img.tags) {
                for (const t of img.tags as any[]) {
                    const name = typeof t === "string" ? t : t?.name;
                    if (name && name.trim()) {
                        const clean = name.trim();
                        counts.set(clean, (counts.get(clean) || 0) + 1);
                    }
                }
            }
        }
        return Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count }));
    }, [images]);

    // Compute tag suggestions for autocomplete (Pixiv style)
    const tagSuggestions = useMemo(() => {
        if (!isSearchFocused) return [];
        const trimmed = searchQuery.trim().toLowerCase();
        if (!trimmed) return allTags.slice(0, 6);

        const tokens = trimmed.split(/\s+/);
        const last = tokens[tokens.length - 1];
        const cleanLast = last.startsWith("#") ? last.slice(1) : last;
        if (!cleanLast) return allTags.slice(0, 6);

        return allTags.filter((t) => t.name.toLowerCase().includes(cleanLast)).slice(0, 8);
    }, [allTags, searchQuery, isSearchFocused]);

    const handleSelectTagSuggestion = (tagName: string) => {
        const tokens = searchQuery.trim().split(/\s+/).filter(Boolean);
        if (tokens.length > 1) {
            tokens[tokens.length - 1] = `#${tagName}`;
            setSearchQuery(tokens.join(" ") + " ");
        } else {
            setSelectedTag(tagName);
            setSearchQuery("");
        }
        setIsSearchFocused(false);
    };

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

            // Tag Filter (Pixiv style)
            if (selectedTag !== "all" && selectedTag.trim() !== "") {
                const normSelected = selectedTag.toLowerCase().trim();
                const hasTag = img.tags?.some((t: any) => {
                    const name = (typeof t === "string" ? t : t?.name || "").toLowerCase().trim();
                    const slug = (typeof t === "string" ? t : t?.slug || "").toLowerCase().trim();
                    return name === normSelected || slug === normSelected;
                });
                if (!hasTag) return false;
            }

            // Search query (Pixiv-style multi-token AND search)
            if (searchQuery.trim()) {
                const tokens = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
                const matchesAllTokens = tokens.every((token) => {
                    const isExplicitTag = token.startsWith("#");
                    const cleanToken = isExplicitTag ? token.slice(1) : token;
                    if (!cleanToken) return true;

                    const tagMatch = img.tags?.some((t: any) => {
                        const name = (typeof t === "string" ? t : t?.name || "").toLowerCase();
                        const slug = (typeof t === "string" ? t : t?.slug || "").toLowerCase();
                        return name.includes(cleanToken) || slug.includes(cleanToken);
                    });

                    if (isExplicitTag) return tagMatch;

                    const captionMatch = img.caption?.toLowerCase().includes(cleanToken);
                    const promptMatch = img.positive_prompt?.toLowerCase().includes(cleanToken);
                    const modelMatch =
                        img.model_name?.toLowerCase().includes(cleanToken) ||
                        img.model?.name?.toLowerCase().includes(cleanToken);
                    const samplerMatch = img.sampler?.toLowerCase().includes(cleanToken);

                    return tagMatch || captionMatch || promptMatch || modelMatch || samplerMatch;
                });

                if (!matchesAllTokens) return false;
            }

            return true;
        });
    }, [images, modelFilter, selectedTag, searchQuery]);

    const handleDropFile = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingFile(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 1) {
            setBulkInitialFiles(Array.from(e.dataTransfer.files));
            setIsBulkModalOpen(true);
        } else if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            setImageToEdit(null);
            setDroppedFile(file);
            setIsModalOpen(true);
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 1) {
            setBulkInitialFiles(Array.from(e.target.files));
            setIsBulkModalOpen(true);
            e.target.value = "";
        } else if (e.target.files && e.target.files[0]) {
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
                <div className="admin-search-wrapper" ref={searchWrapRef} style={{ flex: 1, minWidth: "260px", position: "relative", display: "flex", alignItems: "center" }}>
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

                    {selectedTag !== "all" && (
                        <span className="gallery-search-active-pill" style={{ marginLeft: "28px" }}>
                            <span>#{selectedTag}</span>
                            <button
                                type="button"
                                onClick={() => setSelectedTag("all")}
                                title="Remove tag filter"
                            >
                                ✕
                            </button>
                        </span>
                    )}

                    <input
                        type="text"
                        className="admin-search-input"
                        style={selectedTag !== "all" ? { paddingLeft: "8px" } : undefined}
                        placeholder={selectedTag !== "all" ? "Add more keywords..." : "Filter by #tags, prompt, checkpoint, sampler..."}
                        value={searchQuery}
                        onFocus={() => setIsSearchFocused(true)}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setIsSearchFocused(true);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") {
                                setIsSearchFocused(false);
                            }
                        }}
                    />

                    {/* Autocomplete Menu (Pixiv Style) */}
                    {isSearchFocused && tagSuggestions.length > 0 && (
                        <div className="gallery-search-suggest-menu">
                            <div className="gallery-search-suggest-header">
                                <span>Tag Suggestions</span>
                                <span style={{ fontSize: "9px", opacity: 0.7 }}>Click tag to filter</span>
                            </div>
                            {tagSuggestions.map((tag) => (
                                <button
                                    key={tag.name}
                                    type="button"
                                    className="gallery-search-suggest-item"
                                    onClick={() => handleSelectTagSuggestion(tag.name)}
                                >
                                    <span className="suggest-tag-name">
                                        <span className="suggest-hash">#</span>
                                        <span>{tag.name}</span>
                                    </span>
                                    <span className="suggest-count">{tag.count} works</span>
                                </button>
                            ))}
                        </div>
                    )}
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

                    {/* Hidden Native File Input (Single) */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        style={{ display: "none" }}
                        onChange={handleFileInputChange}
                    />

                    {/* Hidden Native File Input (Bulk Multiple) */}
                    <input
                        ref={bulkFileInputRef}
                        type="file"
                        multiple
                        accept="image/png,image/jpeg,image/webp"
                        style={{ display: "none" }}
                        onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                                setBulkInitialFiles(Array.from(e.target.files));
                                setIsBulkModalOpen(true);
                                e.target.value = "";
                            }
                        }}
                    />

                    {/* Quick Ingest Image Button */}
                    <button
                        type="button"
                        className="btn-secondary-admin"
                        onClick={() => fileInputRef.current?.click()}
                        title="Upload PNG/WebP/JPEG from disk to auto-parse metadata"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        <span>Parse Image</span>
                    </button>

                    {/* Full Inspector Link */}
                    <a
                        href="/inspector"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary-admin"
                        title="Buka Metadata Inspector lengkap (cek EXIF, chunks, ComfyUI graph)"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                        <span>Inspector Tool</span>
                    </a>

                    {/* Bulk Ingest Batch Button */}
                    <button
                        type="button"
                        className="btn-secondary-admin"
                        onClick={() => bulkFileInputRef.current?.click()}
                        title="Unggah batch gambar generasi (ComfyUI / WebUI) sekaligus"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="16 16 12 12 8 16" />
                            <line x1="12" y1="12" x2="12" y2="21" />
                            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                        </svg>
                        <span>Bulk Ingest</span>
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

            {/* Pixiv-Style Tags Filter Ribbon */}
            {allTags.length > 0 && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        overflowX: "auto",
                        paddingBottom: "8px",
                        marginBottom: "14px",
                    }}
                >
                    <span style={{ fontSize: "11px", color: "#6C727D", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, marginRight: "4px", whiteSpace: "nowrap" }}>
                        Tags:
                    </span>
                    <button
                        type="button"
                        style={{
                            fontSize: "11px",
                            fontFamily: "ui-monospace, monospace",
                            padding: "3px 10px",
                            borderRadius: "12px",
                            background: selectedTag === "all" ? "rgba(99, 102, 241, 0.2)" : "#171A1F",
                            border: selectedTag === "all" ? "1px solid #818CF8" : "1px solid #282D36",
                            color: selectedTag === "all" ? "#C7D2FE" : "#9AA0AC",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                        }}
                        onClick={() => setSelectedTag("all")}
                    >
                        All ({images.length})
                    </button>
                    {allTags.map(({ name, count }) => {
                        const isActive = selectedTag.toLowerCase() === name.toLowerCase();
                        return (
                            <button
                                key={name}
                                type="button"
                                style={{
                                    fontSize: "11px",
                                    fontFamily: "ui-monospace, monospace",
                                    padding: "3px 10px",
                                    borderRadius: "12px",
                                    background: isActive ? "rgba(99, 102, 241, 0.2)" : "#171A1F",
                                    border: isActive ? "1px solid #818CF8" : "1px solid #282D36",
                                    color: isActive ? "#C7D2FE" : "#9AA0AC",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    whiteSpace: "nowrap",
                                }}
                                onClick={() => setSelectedTag(isActive ? "all" : name)}
                            >
                                <span>#{name}</span>
                                <span style={{ opacity: 0.6, fontSize: "10px" }}>{count}</span>
                            </button>
                        );
                    })}
                    {selectedTag !== "all" && (
                        <button
                            type="button"
                            onClick={() => setSelectedTag("all")}
                            style={{
                                background: "transparent",
                                border: "none",
                                color: "#EF4444",
                                fontSize: "11px",
                                cursor: "pointer",
                                padding: "2px 6px",
                                textDecoration: "underline",
                                whiteSpace: "nowrap",
                            }}
                        >
                            Clear Tag
                        </button>
                    )}
                </div>
            )}

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
                                        src={resolveImageUrl(img.image_url)}
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
                                    {/* Artwork Title / Caption as primary title */}
                                    <div style={{ marginBottom: "6px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                                        <div
                                            style={{
                                                fontSize: "13px",
                                                fontWeight: 600,
                                                color: "#FFFFFF",
                                                lineHeight: "1.3",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                                flex: 1,
                                            }}
                                            title={img.caption || `Artwork #${img.id}`}
                                        >
                                            {img.caption || `Artwork #${img.id}`}
                                        </div>

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
                                                    whiteSpace: "nowrap",
                                                    flexShrink: 0,
                                                }}
                                                title="Copy prompt to clipboard"
                                            >
                                                {isCopied ? "Copied!" : "Copy Prompt"}
                                            </button>
                                        )}
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

                                    {/* Pixiv Tags */}
                                    {img.tags && img.tags.length > 0 && (
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
                                            {img.tags.slice(0, 5).map((t) => {
                                                const isActive = selectedTag?.toLowerCase() === t.name.toLowerCase();
                                                return (
                                                    <button
                                                        key={t.id}
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedTag(isActive ? "all" : t.name);
                                                        }}
                                                        style={{
                                                            background: isActive ? "rgba(99, 102, 241, 0.25)" : "#16191E",
                                                            border: isActive ? "1px solid #818CF8" : "1px solid #282D37",
                                                            color: isActive ? "#C7D2FE" : "#8E95A2",
                                                            fontSize: "10px",
                                                            padding: "1px 6px",
                                                            borderRadius: "4px",
                                                            cursor: "pointer",
                                                            fontFamily: "ui-monospace, monospace",
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            gap: "2px",
                                                            transition: "all 0.15s ease",
                                                        }}
                                                        title={`Filter by #${t.name}`}
                                                    >
                                                        <span style={{ color: isActive ? "#818CF8" : "#6366F1", fontWeight: 700 }}>#</span>
                                                        <span>{t.name}</span>
                                                    </button>
                                                );
                                            })}
                                            {img.tags.length > 5 && (
                                                <span style={{ fontSize: "10px", color: "#64748B", alignSelf: "center", padding: "0 2px", fontFamily: "ui-monospace, monospace" }}>
                                                    +{img.tags.length - 5}
                                                </span>
                                            )}
                                        </div>
                                    )}

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

            {/* Bulk Batch Ingest Modal */}
            {isBulkModalOpen && (
                <BulkUploadModal
                    isOpen={isBulkModalOpen}
                    onClose={() => {
                        setIsBulkModalOpen(false);
                        setBulkInitialFiles([]);
                    }}
                    availableModels={availableModels}
                    initialFiles={bulkInitialFiles}
                    onSuccess={loadImages}
                    onToast={onToast}
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
                                src={resolveImageUrl(previewImage.image_url)}
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
                        <div style={{ padding: "16px 20px", background: "#16181B" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                                <div style={{ fontSize: "15px", fontWeight: 700, color: "#FFFFFF" }}>
                                    {previewImage.caption || `Artwork #${previewImage.id}`}
                                </div>
                                <span
                                    style={{
                                        fontSize: "11px",
                                        fontWeight: 600,
                                        color: previewImage.model_id ? "#818cf8" : "#94a3b8",
                                        background: previewImage.model_id ? "rgba(99, 102, 241, 0.15)" : "rgba(100, 116, 139, 0.15)",
                                        border: previewImage.model_id ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid rgba(100, 116, 139, 0.3)",
                                        padding: "3px 8px",
                                        borderRadius: "4px",
                                        fontFamily: "ui-monospace, monospace",
                                    }}
                                >
                                    Checkpoint: {previewImage.model?.name || previewImage.model_name || "Standalone Checkpoint"}
                                </span>
                            </div>
                            <div style={{ fontSize: "11px", color: "#8E95A2", fontFamily: "ui-monospace, monospace", lineHeight: "1.6" }}>
                                Resolution: {previewImage.width}×{previewImage.height} • Steps: {previewImage.steps} • Sampler: {previewImage.sampler || "Auto"} • CFG: {previewImage.cfg_scale} • Seed: {previewImage.seed ?? "Random"}
                            </div>
                            {previewImage.positive_prompt && (
                                <div style={{ marginTop: "10px", padding: "10px", background: "#0E1013", border: "1px solid #252A34", borderRadius: "6px", fontSize: "11px", color: "#B0B7C3", fontFamily: "ui-monospace, monospace", maxHeight: "100px", overflowY: "auto" }}>
                                    {previewImage.positive_prompt}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
