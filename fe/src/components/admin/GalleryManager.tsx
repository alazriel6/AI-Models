import React, { useState, useEffect, useMemo, useRef } from "react";
import type { Model, ModelImage } from "../../api/models";
import { getAllGalleryImagesApi, deleteGalleryImageApi, updateGalleryImageApi } from "../../api/admin";
import { resolveImageUrl } from "../../api/client";
import { GalleryImageModal } from "./GalleryImageModal";
import { BulkUploadModal } from "./BulkUploadModal";

interface GalleryManagerProps {
    availableModels: Model[];
    onToast: (type: "success" | "error" | "info", message: string) => void;
}

type ViewMode = "cards" | "compact" | "table";
type AspectRatioCategory = "all" | "portrait" | "landscape" | "square";
type LoraFilterType = "all" | "has_lora" | "checkpoint_only";

const ViewIcons = {
    Cards: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
    ),
    Compact: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="4" height="4"></rect>
            <rect x="10" y="3" width="4" height="4"></rect>
            <rect x="17" y="3" width="4" height="4"></rect>
            <rect x="3" y="10" width="4" height="4"></rect>
            <rect x="10" y="10" width="4" height="4"></rect>
            <rect x="17" y="10" width="4" height="4"></rect>
            <rect x="3" y="17" width="4" height="4"></rect>
            <rect x="10" y="17" width="4" height="4"></rect>
            <rect x="17" y="17" width="4" height="4"></rect>
        </svg>
    ),
    Table: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
    ),
};

const ActionIcons = {
    Check: () => (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
    ),
    Layers: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
        </svg>
    ),
    Tag: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
            <line x1="7" y1="7" x2="7.01" y2="7"></line>
        </svg>
    ),
    Copy: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
    ),
    Download: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
    ),
    Trash: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
    ),
    X: () => (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    ),
    Edit: () => (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
    ),
    Inspect: () => (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
    ),
};

const getAspectRatioCategory = (w?: number, h?: number): "portrait" | "landscape" | "square" | "unknown" => {
    if (!w || !h || w <= 0 || h <= 0) return "unknown";
    const ratio = w / h;
    if (ratio >= 0.95 && ratio <= 1.05) return "square";
    if (ratio < 0.95) return "portrait";
    return "landscape";
};

export const GalleryManager: React.FC<GalleryManagerProps> = ({ availableModels, onToast }) => {
    const [images, setImages] = useState<ModelImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // View mode: cards (comfortable), compact (grid), table (data view)
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        const saved = localStorage.getItem("admin_gallery_view_mode");
        return (saved === "cards" || saved === "compact" || saved === "table") ? saved : "cards";
    });

    useEffect(() => {
        localStorage.setItem("admin_gallery_view_mode", viewMode);
    }, [viewMode]);

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState("");
    const [modelFilter, setModelFilter] = useState<string>("all");
    const [selectedTag, setSelectedTag] = useState<string>("all");
    const [aspectRatioFilter, setAspectRatioFilter] = useState<AspectRatioCategory>("all");
    const [loraFilter, setLoraFilter] = useState<LoraFilterType>("all");
    const [sortBy, setSortBy] = useState<string>("newest");
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const searchWrapRef = useRef<HTMLDivElement | null>(null);

    // Multi-selection state
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // Batch actions modal state
    const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);
    const [isBatchAssignModelOpen, setIsBatchAssignModelOpen] = useState(false);
    const [batchTargetModelId, setBatchTargetModelId] = useState<number | null>(null);
    const [isBatchAddTagsOpen, setIsBatchAddTagsOpen] = useState(false);
    const [batchTagsInput, setBatchTagsInput] = useState("");
    const [isProcessingBatch, setIsProcessingBatch] = useState(false);
    const [batchProgress, setBatchProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
                setIsSearchFocused(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Single item edit & modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [imageToEdit, setImageToEdit] = useState<ModelImage | null>(null);
    const [droppedFile, setDroppedFile] = useState<File | null>(null);
    const [isDraggingFile, setIsDraggingFile] = useState(false);
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Bulk upload modal state
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkInitialFiles, setBulkInitialFiles] = useState<File[]>([]);
    const bulkFileInputRef = useRef<HTMLInputElement | null>(null);

    // Single delete confirmation
    const [imageToDelete, setImageToDelete] = useState<ModelImage | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Preview image popup
    const [previewImage, setPreviewImage] = useState<ModelImage | null>(null);

    const loadImages = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await getAllGalleryImagesApi({ limit: 200, sort: sortBy });
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

    // Tag suggestions for autocomplete (Pixiv style)
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

            // Tag Filter
            if (selectedTag !== "all" && selectedTag.trim() !== "") {
                const normSelected = selectedTag.toLowerCase().trim();
                const hasTag = img.tags?.some((t: any) => {
                    const name = (typeof t === "string" ? t : t?.name || "").toLowerCase().trim();
                    const slug = (typeof t === "string" ? t : t?.slug || "").toLowerCase().trim();
                    return name === normSelected || slug === normSelected;
                });
                if (!hasTag) return false;
            }

            // Aspect Ratio Filter
            if (aspectRatioFilter !== "all") {
                const cat = getAspectRatioCategory(img.width, img.height);
                if (cat !== aspectRatioFilter) return false;
            }

            // LoRA Filter
            if (loraFilter === "has_lora") {
                if (!img.resources || img.resources.length === 0) return false;
            } else if (loraFilter === "checkpoint_only") {
                if (img.resources && img.resources.length > 0) return false;
            }

            // Search query (multi-token AND search)
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
    }, [images, modelFilter, selectedTag, aspectRatioFilter, loraFilter, searchQuery]);

    // Active filters summary
    const hasActiveFilters =
        searchQuery.trim() !== "" ||
        modelFilter !== "all" ||
        selectedTag !== "all" ||
        aspectRatioFilter !== "all" ||
        loraFilter !== "all";

    const handleClearAllFilters = () => {
        setSearchQuery("");
        setModelFilter("all");
        setSelectedTag("all");
        setAspectRatioFilter("all");
        setLoraFilter("all");
    };

    // Selection handlers
    const handleToggleSelect = (id: number, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAllVisible = () => {
        const allIds = filteredImages.map((img) => img.id);
        setSelectedIds(new Set(allIds));
    };

    const handleDeselectAll = () => {
        setSelectedIds(new Set());
    };

    const isAllVisibleSelected =
        filteredImages.length > 0 && filteredImages.every((img) => selectedIds.has(img.id));

    // File Drag & Drop
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

    // Single delete
    const handleDelete = async () => {
        if (!imageToDelete) return;
        try {
            setIsDeleting(true);
            await deleteGalleryImageApi(imageToDelete.id);
            onToast("success", `Gallery image #${imageToDelete.id} deleted successfully.`);
            setImageToDelete(null);
            setSelectedIds((prev) => {
                const next = new Set(prev);
                next.delete(imageToDelete.id);
                return next;
            });
            await loadImages();
        } catch (err: any) {
            console.error("Delete failed:", err);
            onToast("error", err?.message || "Failed to delete image.");
        } finally {
            setIsDeleting(false);
        }
    };

    // Batch Delete
    const handleConfirmBatchDelete = async () => {
        if (selectedIds.size === 0) return;
        try {
            setIsProcessingBatch(true);
            const ids = Array.from(selectedIds);
            let successCount = 0;
            for (let i = 0; i < ids.length; i++) {
                setBatchProgress({ current: i + 1, total: ids.length });
                try {
                    await deleteGalleryImageApi(ids[i]);
                    successCount++;
                } catch (e) {
                    console.error("Failed to delete image:", ids[i], e);
                }
            }
            onToast("success", `${successCount} images deleted successfully.`);
            setSelectedIds(new Set());
            setIsBatchDeleteOpen(false);
            await loadImages();
        } catch (err: any) {
            onToast("error", err?.message || "Batch delete failed.");
        } finally {
            setIsProcessingBatch(false);
            setBatchProgress({ current: 0, total: 0 });
        }
    };

    // Batch Assign Model
    const handleConfirmBatchAssignModel = async () => {
        if (selectedIds.size === 0) return;
        try {
            setIsProcessingBatch(true);
            const ids = Array.from(selectedIds);
            const targetModel = availableModels.find((m) => m.id === batchTargetModelId);
            let successCount = 0;
            for (let i = 0; i < ids.length; i++) {
                setBatchProgress({ current: i + 1, total: ids.length });
                try {
                    await updateGalleryImageApi(ids[i], {
                        model_id: batchTargetModelId ?? 0,
                        model_name: targetModel?.name || (batchTargetModelId === null ? "" : undefined),
                    });
                    successCount++;
                } catch (e) {
                    console.error("Failed to reassign image:", ids[i], e);
                }
            }
            onToast("success", `Checkpoint updated for ${successCount} images.`);
            setSelectedIds(new Set());
            setIsBatchAssignModelOpen(false);
            await loadImages();
        } catch (err: any) {
            onToast("error", err?.message || "Batch assign failed.");
        } finally {
            setIsProcessingBatch(false);
            setBatchProgress({ current: 0, total: 0 });
        }
    };

    // Batch Add Tags
    const handleConfirmBatchAddTags = async () => {
        const tagsToAdd = batchTagsInput
            .split(/[,\n]+/)
            .map((t) => t.trim().replace(/^#/, ""))
            .filter(Boolean);
        if (tagsToAdd.length === 0) {
            onToast("info", "Please enter at least one tag.");
            return;
        }
        try {
            setIsProcessingBatch(true);
            const ids = Array.from(selectedIds);
            let successCount = 0;
            for (let i = 0; i < ids.length; i++) {
                setBatchProgress({ current: i + 1, total: ids.length });
                const currentImg = images.find((img) => img.id === ids[i]);
                const existingTags = (currentImg?.tags || []).map((t) =>
                    typeof t === "string" ? t : t.name
                );
                const merged = Array.from(new Set([...existingTags, ...tagsToAdd]));
                try {
                    await updateGalleryImageApi(ids[i], {
                        tags: merged,
                    });
                    successCount++;
                } catch (e) {
                    console.error("Failed to add tags to image:", ids[i], e);
                }
            }
            onToast("success", `Tags added to ${successCount} images.`);
            setSelectedIds(new Set());
            setBatchTagsInput("");
            setIsBatchAddTagsOpen(false);
            await loadImages();
        } catch (err: any) {
            onToast("error", err?.message || "Batch add tags failed.");
        } finally {
            setIsProcessingBatch(false);
            setBatchProgress({ current: 0, total: 0 });
        }
    };

    // Batch Copy Prompts
    const handleCopySelectedPrompts = () => {
        const selectedImgs = images.filter((img) => selectedIds.has(img.id));
        const prompts = selectedImgs
            .map(
                (img) =>
                    `# Image #${img.id}${img.model_name ? ` (${img.model_name})` : ""}:\n${img.positive_prompt || "(No prompt)"}`
            )
            .join("\n\n");
        navigator.clipboard.writeText(prompts);
        onToast("success", `Copied positive prompts for ${selectedImgs.length} images to clipboard.`);
    };

    // Batch Export JSON
    const handleDownloadSelectedJSON = () => {
        const selectedImgs = images.filter((img) => selectedIds.has(img.id));
        const dataStr =
            "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedImgs, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute(
            "download",
            `gallery_selection_${new Date().toISOString().slice(0, 10)}.json`
        );
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        onToast("success", `Exported metadata for ${selectedImgs.length} images.`);
    };

    return (
        <div style={{ marginTop: "16px" }}>
            {/* Toolbar */}
            <div className="admin-toolbar" style={{ marginBottom: "16px" }}>
                <div
                    className="admin-search-wrapper"
                    ref={searchWrapRef}
                    style={{ flex: 1, minWidth: "260px", position: "relative", display: "flex", alignItems: "center" }}
                >
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
                        placeholder={
                            selectedTag !== "all"
                                ? "Add more keywords..."
                                : "Filter by #tags, prompt, checkpoint, sampler..."
                        }
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
                    {/* View Mode Switcher */}
                    <div className="view-mode-btn-group" title="Tampilan Galeri">
                        <button
                            type="button"
                            className={`view-mode-btn ${viewMode === "cards" ? "active" : ""}`}
                            onClick={() => setViewMode("cards")}
                            title="Cards View (Detail)"
                        >
                            <ViewIcons.Cards />
                        </button>
                        <button
                            type="button"
                            className={`view-mode-btn ${viewMode === "compact" ? "active" : ""}`}
                            onClick={() => setViewMode("compact")}
                            title="Compact Grid (Padat)"
                        >
                            <ViewIcons.Compact />
                        </button>
                        <button
                            type="button"
                            className={`view-mode-btn ${viewMode === "table" ? "active" : ""}`}
                            onClick={() => setViewMode("table")}
                            title="Data Table View"
                        >
                            <ViewIcons.Table />
                        </button>
                    </div>

                    {/* Model Filter */}
                    <select
                        className="admin-select"
                        value={modelFilter}
                        onChange={(e) => setModelFilter(e.target.value)}
                        title="Filter by Checkpoint"
                    >
                        <option value="all">All Checkpoints</option>
                        <option value="standalone">Standalone (Custom)</option>
                        {availableModels.map((m) => (
                            <option key={m.id} value={m.id}>
                                {m.name}
                            </option>
                        ))}
                    </select>

                    {/* Aspect Ratio Filter */}
                    <select
                        className="admin-select"
                        value={aspectRatioFilter}
                        onChange={(e) => setAspectRatioFilter(e.target.value as AspectRatioCategory)}
                        title="Filter by Aspect Ratio"
                    >
                        <option value="all">All Ratios</option>
                        <option value="portrait">Portrait (Tall)</option>
                        <option value="landscape">Landscape (Wide)</option>
                        <option value="square">Square (1:1)</option>
                    </select>

                    {/* LoRA Filter */}
                    <select
                        className="admin-select"
                        value={loraFilter}
                        onChange={(e) => setLoraFilter(e.target.value as LoraFilterType)}
                        title="Filter by LoRA usage"
                    >
                        <option value="all">All Resources</option>
                        <option value="has_lora">With LoRA (+N)</option>
                        <option value="checkpoint_only">Pure Checkpoint</option>
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
                        marginBottom: "12px",
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
                </div>
            )}

            {/* Active Filters Ribbon (Clear All Bar) */}
            {hasActiveFilters && (
                <div className="gallery-active-filters-bar">
                    <span className="gallery-active-filter-label">Active Filters:</span>

                    {searchQuery.trim() !== "" && (
                        <span className="gallery-filter-chip">
                            <span>Search: "{searchQuery}"</span>
                            <button type="button" onClick={() => setSearchQuery("")}>✕</button>
                        </span>
                    )}

                    {selectedTag !== "all" && (
                        <span className="gallery-filter-chip">
                            <span>#{selectedTag}</span>
                            <button type="button" onClick={() => setSelectedTag("all")}>✕</button>
                        </span>
                    )}

                    {modelFilter !== "all" && (
                        <span className="gallery-filter-chip">
                            <span>
                                Model: {modelFilter === "standalone" ? "Standalone" : availableModels.find((m) => String(m.id) === modelFilter)?.name || modelFilter}
                            </span>
                            <button type="button" onClick={() => setModelFilter("all")}>✕</button>
                        </span>
                    )}

                    {aspectRatioFilter !== "all" && (
                        <span className="gallery-filter-chip">
                            <span>Ratio: {aspectRatioFilter}</span>
                            <button type="button" onClick={() => setAspectRatioFilter("all")}>✕</button>
                        </span>
                    )}

                    {loraFilter !== "all" && (
                        <span className="gallery-filter-chip">
                            <span>LoRA: {loraFilter === "has_lora" ? "With LoRA" : "Checkpoint Only"}</span>
                            <button type="button" onClick={() => setLoraFilter("all")}>✕</button>
                        </span>
                    )}

                    <span style={{ fontSize: "11px", color: "#6C727D", marginLeft: "6px" }}>
                        ({filteredImages.length} of {images.length} works)
                    </span>

                    <button
                        type="button"
                        className="gallery-filter-clear-all"
                        onClick={handleClearAllFilters}
                    >
                        Reset All Filters
                    </button>
                </div>
            )}

            {/* Error Banner */}
            {error && (
                <div
                    style={{
                        padding: "12px 16px",
                        background: "rgba(239, 68, 68, 0.1)",
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

            {/* Images Grid / Table */}
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
                    <div
                        style={{
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
                        }}
                    >
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
                        {hasActiveFilters
                            ? "No items match your active filters. Try clearing filters or adjusting checkpoint/ratio selection."
                            : "Drop any ComfyUI, WebUI, SD-Forge, or NovelAI PNG output. Prompts, checkpoints, LoRAs, seed, steps, and samplers will be extracted automatically."}
                    </div>

                    <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
                        {hasActiveFilters ? (
                            <button
                                type="button"
                                className="btn-secondary-admin"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleClearAllFilters();
                                }}
                            >
                                <span>Reset Active Filters</span>
                            </button>
                        ) : (
                            <>
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
                            </>
                        )}
                    </div>
                </div>
            ) : viewMode === "compact" ? (
                /* Compact Grid View */
                <div className="gallery-compact-grid">
                    {filteredImages.map((img) => {
                        const isSelected = selectedIds.has(img.id);

                        return (
                            <div
                                key={img.id}
                                className={`gallery-compact-card ${isSelected ? "selected" : ""}`}
                                onClick={() => setPreviewImage(img)}
                            >
                                <img
                                    src={resolveImageUrl(img.image_url)}
                                    alt={img.caption || `Artwork #${img.id}`}
                                    loading="lazy"
                                />

                                {/* Checkbox overlay */}
                                <div
                                    className="gallery-card-checkbox-wrap"
                                    onClick={(e) => handleToggleSelect(img.id, e)}
                                >
                                    <div className={`gallery-checkbox ${isSelected ? "checked" : ""}`}>
                                        {isSelected && (
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                        )}
                                    </div>
                                </div>

                                {/* Hover overlay */}
                                <div className="gallery-compact-overlay">
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                        <span
                                            style={{
                                                fontSize: "10px",
                                                fontFamily: "ui-monospace, monospace",
                                                background: "rgba(0,0,0,0.75)",
                                                padding: "1px 5px",
                                                borderRadius: "3px",
                                            }}
                                        >
                                            #{img.id}
                                        </span>
                                    </div>

                                    <div>
                                        <div className="gallery-compact-caption" title={img.caption || `Artwork #${img.id}`}>
                                            {img.caption || `Artwork #${img.id}`}
                                        </div>
                                        <div className="gallery-compact-meta" style={{ marginTop: "4px" }}>
                                            <span>{img.width ? `${img.width}×${img.height}` : "Auto"}</span>
                                            <div style={{ display: "flex", gap: "4px" }}>
                                                <button
                                                    type="button"
                                                    style={{
                                                        background: "rgba(18,20,24,0.85)",
                                                        border: "1px solid rgba(255,255,255,0.15)",
                                                        color: "#E6E8EB",
                                                        fontSize: "10px",
                                                        padding: "2px 6px",
                                                        borderRadius: "3px",
                                                        cursor: "pointer",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: "3px",
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setImageToEdit(img);
                                                        setIsModalOpen(true);
                                                    }}
                                                    title="Edit Artwork"
                                                >
                                                    <ActionIcons.Edit />
                                                    <span>Edit</span>
                                                </button>
                                                <a
                                                    href={`/inspector?image_id=${img.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        background: "rgba(18,20,24,0.85)",
                                                        border: "1px solid rgba(255,255,255,0.15)",
                                                        color: "#818CF8",
                                                        fontSize: "10px",
                                                        padding: "2px 6px",
                                                        borderRadius: "3px",
                                                        textDecoration: "none",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    title="Inspect in Metadata Inspector"
                                                >
                                                    <ActionIcons.Inspect />
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : viewMode === "table" ? (
                /* Pro Data Table View */
                <div className="gallery-table-container">
                    <table className="gallery-table">
                        <thead>
                            <tr>
                                <th style={{ width: "36px", textAlign: "center" }}>
                                    <div
                                        className={`gallery-checkbox ${isAllVisibleSelected ? "checked" : ""}`}
                                        onClick={isAllVisibleSelected ? handleDeselectAll : handleSelectAllVisible}
                                        title={isAllVisibleSelected ? "Deselect all" : "Select all visible"}
                                    >
                                        {isAllVisibleSelected && (
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                        )}
                                    </div>
                                </th>
                                <th style={{ width: "60px" }}>Preview</th>
                                <th style={{ width: "60px" }}>ID</th>
                                <th>Artwork / Prompt</th>
                                <th>Checkpoint</th>
                                <th>Resolution</th>
                                <th>Settings</th>
                                <th>LoRA</th>
                                <th>Tags</th>
                                <th style={{ width: "120px", textAlign: "right" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredImages.map((img) => {
                                const isSelected = selectedIds.has(img.id);
                                const isCopied = copiedId === img.id;
                                const ratioCat = getAspectRatioCategory(img.width, img.height);

                                return (
                                    <tr key={img.id} className={isSelected ? "selected" : ""}>
                                        <td style={{ textAlign: "center" }}>
                                            <div
                                                className={`gallery-checkbox ${isSelected ? "checked" : ""}`}
                                                onClick={() => handleToggleSelect(img.id)}
                                            >
                                                {isSelected && (
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12"></polyline>
                                                    </svg>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div
                                                className="gallery-table-thumb"
                                                onClick={() => setPreviewImage(img)}
                                                title="Click to view full preview"
                                            >
                                                <img
                                                    src={resolveImageUrl(img.image_url)}
                                                    alt={img.caption || `Image #${img.id}`}
                                                    loading="lazy"
                                                />
                                            </div>
                                        </td>
                                        <td style={{ fontFamily: "ui-monospace, monospace", fontWeight: 600, color: "#818CF8" }}>
                                            #{img.id}
                                        </td>
                                        <td style={{ maxWidth: "280px" }}>
                                            <div style={{ fontWeight: 600, color: "#FFFFFF", marginBottom: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {img.caption || `Artwork #${img.id}`}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: "11px",
                                                    color: "#7D8590",
                                                    fontFamily: "ui-monospace, monospace",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}
                                                title={img.positive_prompt}
                                            >
                                                {img.positive_prompt || "(No prompt)"}
                                            </div>
                                        </td>
                                        <td>
                                            <span
                                                style={{
                                                    fontSize: "11px",
                                                    color: img.model_id ? "#818cf8" : "#94a3b8",
                                                    background: img.model_id ? "rgba(99, 102, 241, 0.12)" : "rgba(100, 116, 139, 0.12)",
                                                    border: img.model_id ? "1px solid rgba(99, 102, 241, 0.25)" : "1px solid rgba(100, 116, 139, 0.25)",
                                                    padding: "2px 7px",
                                                    borderRadius: "4px",
                                                    fontFamily: "ui-monospace, monospace",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {img.model?.name || img.model_name || "Standalone"}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ fontFamily: "ui-monospace, monospace", fontSize: "11px", color: "#E6E8EB" }}>
                                                {img.width ? `${img.width}×${img.height}` : "Auto"}
                                            </div>
                                            {ratioCat !== "unknown" && (
                                                <div style={{ fontSize: "10px", color: "#6C727D", textTransform: "capitalize" }}>
                                                    {ratioCat}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ fontFamily: "ui-monospace, monospace", fontSize: "11px", color: "#9CA3AF" }}>
                                                {img.sampler || "Auto"} • {img.steps ? `${img.steps} steps` : ""}
                                            </div>
                                            {img.cfg_scale && (
                                                <div style={{ fontFamily: "ui-monospace, monospace", fontSize: "10px", color: "#6C727D" }}>
                                                    CFG {img.cfg_scale}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            {img.resources && img.resources.length > 0 ? (
                                                <span style={{ fontSize: "10px", background: "rgba(234, 179, 8, 0.1)", border: "1px solid rgba(234, 179, 8, 0.25)", color: "#facc15", padding: "1px 6px", borderRadius: "3px", fontFamily: "ui-monospace, monospace" }}>
                                                    +{img.resources.length} LoRA
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: "11px", color: "#4B5563" }}>—</span>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: "3px", maxWidth: "160px" }}>
                                                {(img.tags || []).slice(0, 3).map((t: any) => {
                                                    const tName = typeof t === "string" ? t : t.name;
                                                    return (
                                                        <span
                                                            key={tName}
                                                            style={{
                                                                fontSize: "10px",
                                                                background: "#16191E",
                                                                border: "1px solid #282D37",
                                                                color: "#8E95A2",
                                                                padding: "1px 5px",
                                                                borderRadius: "3px",
                                                                fontFamily: "ui-monospace, monospace",
                                                            }}
                                                        >
                                                            #{tName}
                                                        </span>
                                                    );
                                                })}
                                                {(img.tags || []).length > 3 && (
                                                    <span style={{ fontSize: "10px", color: "#64748B" }}>
                                                        +{img.tags!.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: "right" }}>
                                            <div style={{ display: "inline-flex", gap: "4px" }}>
                                                {img.positive_prompt && (
                                                    <button
                                                        type="button"
                                                        className="btn-secondary-admin"
                                                        style={{ fontSize: "10px", padding: "3px 6px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                                                        onClick={() => handleCopyPrompt(img.id, img.positive_prompt)}
                                                        title="Copy Prompt"
                                                    >
                                                        {isCopied ? <ActionIcons.Check /> : <ActionIcons.Copy />}
                                                        <span>{isCopied ? "Copied" : "Copy"}</span>
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    className="btn-secondary-admin"
                                                    style={{ fontSize: "10px", padding: "3px 6px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                                                    onClick={() => {
                                                        setImageToEdit(img);
                                                        setDroppedFile(null);
                                                        setIsModalOpen(true);
                                                    }}
                                                    title="Edit Details"
                                                >
                                                    <ActionIcons.Edit />
                                                    <span>Edit</span>
                                                </button>
                                                <a
                                                    href={`/inspector?image_id=${img.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn-secondary-admin"
                                                    style={{ fontSize: "10px", padding: "3px 6px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                                                    title="Inspect in Metadata Inspector"
                                                >
                                                    <ActionIcons.Inspect />
                                                    <span>Inspect</span>
                                                </a>
                                                <button
                                                    type="button"
                                                    className="btn-danger-admin"
                                                    style={{ fontSize: "10px", padding: "3px 6px", display: "inline-flex", alignItems: "center" }}
                                                    onClick={() => setImageToDelete(img)}
                                                    title="Delete Artwork"
                                                >
                                                    <ActionIcons.Trash />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* Comfortable Cards View (Default) */
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
                        gap: "16px",
                    }}
                >
                    {filteredImages.map((img) => {
                        const isCopied = copiedId === img.id;
                        const isSelected = selectedIds.has(img.id);

                        return (
                            <div key={img.id} className={`gallery-card ${isSelected ? "selected" : ""}`}>
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

                                    {/* Multi-Select Checkbox */}
                                    <div
                                        className="gallery-card-checkbox-wrap"
                                        onClick={(e) => handleToggleSelect(img.id, e)}
                                    >
                                        <div className={`gallery-checkbox ${isSelected ? "checked" : ""}`}>
                                            {isSelected && (
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                </svg>
                                            )}
                                        </div>
                                    </div>

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
                                            {img.tags.slice(0, 5).map((t: any) => {
                                                const tName = typeof t === "string" ? t : t.name;
                                                const isActive = selectedTag?.toLowerCase() === tName?.toLowerCase();
                                                return (
                                                    <button
                                                        key={t.id || tName}
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedTag(isActive ? "all" : tName);
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
                                                        title={`Filter by #${tName}`}
                                                    >
                                                        <span style={{ color: isActive ? "#818CF8" : "#6366F1", fontWeight: 700 }}>#</span>
                                                        <span>{tName}</span>
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
                                        <a
                                            href={`/inspector?image_id=${img.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn-secondary-admin"
                                            style={{ fontSize: "11px", padding: "4px 8px" }}
                                            title="Open in Metadata Inspector"
                                        >
                                            Inspect
                                        </a>
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

            {/* Floating Bulk Actions Bar */}
            {selectedIds.size > 0 && (
                <div className="gallery-floating-bulk-bar">
                    <div className="gallery-bulk-count-pill">
                        <ActionIcons.Check />
                        <span>{selectedIds.size} Selected</span>
                    </div>

                    <button
                        type="button"
                        className="gallery-bulk-btn"
                        onClick={isAllVisibleSelected ? handleDeselectAll : handleSelectAllVisible}
                    >
                        {isAllVisibleSelected ? "Deselect All" : "Select All Visible"}
                    </button>

                    <div className="gallery-bulk-divider" />

                    <button
                        type="button"
                        className="gallery-bulk-btn"
                        onClick={() => setIsBatchAssignModelOpen(true)}
                        title="Assign selected artworks to a specific checkpoint"
                    >
                        <ActionIcons.Layers />
                        <span>Assign Model</span>
                    </button>

                    <button
                        type="button"
                        className="gallery-bulk-btn"
                        onClick={() => setIsBatchAddTagsOpen(true)}
                        title="Add tags to all selected artworks"
                    >
                        <ActionIcons.Tag />
                        <span>Add Tags</span>
                    </button>

                    <button
                        type="button"
                        className="gallery-bulk-btn"
                        onClick={handleCopySelectedPrompts}
                        title="Copy all positive prompts to clipboard"
                    >
                        <ActionIcons.Copy />
                        <span>Copy Prompts</span>
                    </button>

                    <button
                        type="button"
                        className="gallery-bulk-btn"
                        onClick={handleDownloadSelectedJSON}
                        title="Export JSON metadata of selected artworks"
                    >
                        <ActionIcons.Download />
                        <span>Export JSON</span>
                    </button>

                    <button
                        type="button"
                        className="gallery-bulk-btn danger"
                        onClick={() => setIsBatchDeleteOpen(true)}
                        title="Delete selected artworks"
                    >
                        <ActionIcons.Trash />
                        <span>Delete ({selectedIds.size})</span>
                    </button>

                    <button
                        type="button"
                        className="gallery-bulk-close"
                        onClick={handleDeselectAll}
                        title="Clear Selection"
                    >
                        <ActionIcons.X />
                    </button>
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

            {/* Single Delete Confirmation Modal */}
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

            {/* Batch Delete Confirmation Modal */}
            {isBatchDeleteOpen && (
                <div className="admin-modal-backdrop" onClick={() => !isProcessingBatch && setIsBatchDeleteOpen(false)}>
                    <div
                        className="admin-modal-content"
                        style={{ maxWidth: "440px" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="admin-modal-header">
                            <h2 className="admin-modal-title" style={{ color: "#EF4444" }}>
                                Batch Delete Confirmation
                            </h2>
                            <button
                                className="admin-modal-close"
                                onClick={() => !isProcessingBatch && setIsBatchDeleteOpen(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="admin-modal-body" style={{ padding: "16px 20px" }}>
                            <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#E6E8EB" }}>
                                Are you sure you want to permanently delete <strong>{selectedIds.size}</strong> selected gallery artworks?
                            </p>
                            <p style={{ margin: "0 0 16px 0", fontSize: "11px", color: "#EF4444" }}>
                                This action will delete their records and stored images. This cannot be undone.
                            </p>

                            {isProcessingBatch && (
                                <div style={{ marginBottom: "14px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#9CA3AF", marginBottom: "4px" }}>
                                        <span>Deleting images...</span>
                                        <span>{batchProgress.current} / {batchProgress.total}</span>
                                    </div>
                                    <div style={{ width: "100%", height: "4px", background: "#23262D", borderRadius: "2px", overflow: "hidden" }}>
                                        <div
                                            style={{
                                                height: "100%",
                                                background: "#EF4444",
                                                width: `${(batchProgress.current / (batchProgress.total || 1)) * 100}%`,
                                                transition: "width 0.2s ease",
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                                <button
                                    type="button"
                                    className="btn-secondary-admin"
                                    onClick={() => setIsBatchDeleteOpen(false)}
                                    disabled={isProcessingBatch}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn-danger-admin"
                                    onClick={handleConfirmBatchDelete}
                                    disabled={isProcessingBatch}
                                >
                                    {isProcessingBatch ? "Deleting..." : `Delete ${selectedIds.size} Images`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Batch Assign Model Modal */}
            {isBatchAssignModelOpen && (
                <div className="admin-modal-backdrop" onClick={() => !isProcessingBatch && setIsBatchAssignModelOpen(false)}>
                    <div
                        className="admin-modal-content"
                        style={{ maxWidth: "460px" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="admin-modal-header">
                            <h2 className="admin-modal-title">
                                Assign Checkpoint ({selectedIds.size} Works)
                            </h2>
                            <button
                                className="admin-modal-close"
                                onClick={() => !isProcessingBatch && setIsBatchAssignModelOpen(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="admin-modal-body" style={{ padding: "16px 20px" }}>
                            <p style={{ margin: "0 0 14px 0", fontSize: "12px", color: "#9CA3AF" }}>
                                Select the target base model or checkpoint for all {selectedIds.size} selected artworks.
                            </p>

                            <div className="form-group" style={{ marginBottom: "16px" }}>
                                <label className="form-label">Target Checkpoint</label>
                                <select
                                    className="form-input"
                                    value={batchTargetModelId ?? "standalone"}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setBatchTargetModelId(val === "standalone" ? null : Number(val));
                                    }}
                                >
                                    <option value="standalone">Standalone / Custom (No Linked Model)</option>
                                    {availableModels.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.name} ({m.base_model || m.type})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {isProcessingBatch && (
                                <div style={{ marginBottom: "14px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#9CA3AF", marginBottom: "4px" }}>
                                        <span>Updating checkpoint...</span>
                                        <span>{batchProgress.current} / {batchProgress.total}</span>
                                    </div>
                                    <div style={{ width: "100%", height: "4px", background: "#23262D", borderRadius: "2px", overflow: "hidden" }}>
                                        <div
                                            style={{
                                                height: "100%",
                                                background: "#818CF8",
                                                width: `${(batchProgress.current / (batchProgress.total || 1)) * 100}%`,
                                                transition: "width 0.2s ease",
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                                <button
                                    type="button"
                                    className="btn-secondary-admin"
                                    onClick={() => setIsBatchAssignModelOpen(false)}
                                    disabled={isProcessingBatch}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn-primary-admin"
                                    onClick={handleConfirmBatchAssignModel}
                                    disabled={isProcessingBatch}
                                >
                                    {isProcessingBatch ? "Updating..." : "Apply to Selected"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Batch Add Tags Modal */}
            {isBatchAddTagsOpen && (
                <div className="admin-modal-backdrop" onClick={() => !isProcessingBatch && setIsBatchAddTagsOpen(false)}>
                    <div
                        className="admin-modal-content"
                        style={{ maxWidth: "460px" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="admin-modal-header">
                            <h2 className="admin-modal-title">
                                Add Tags to {selectedIds.size} Works
                            </h2>
                            <button
                                className="admin-modal-close"
                                onClick={() => !isProcessingBatch && setIsBatchAddTagsOpen(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="admin-modal-body" style={{ padding: "16px 20px" }}>
                            <p style={{ margin: "0 0 14px 0", fontSize: "12px", color: "#9CA3AF" }}>
                                Enter comma or newline-separated tags to append to the existing tags of all {selectedIds.size} selected artworks.
                            </p>

                            <div className="form-group" style={{ marginBottom: "16px" }}>
                                <label className="form-label">New Tags</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. anime, cyberpunk, wallpaper, masterpiece"
                                    value={batchTagsInput}
                                    onChange={(e) => setBatchTagsInput(e.target.value)}
                                    autoFocus
                                />
                                <span style={{ fontSize: "11px", color: "#6C727D", marginTop: "4px", display: "block" }}>
                                    Tags will be merged with existing tags (duplicates are ignored).
                                </span>
                            </div>

                            {/* Suggestions from popular tags */}
                            {allTags.length > 0 && (
                                <div style={{ marginBottom: "16px" }}>
                                    <span style={{ fontSize: "10px", color: "#6C727D", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                                        Quick Add from Existing Tags:
                                    </span>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                        {allTags.slice(0, 10).map((t) => (
                                            <button
                                                key={t.name}
                                                type="button"
                                                style={{
                                                    background: "#16191E",
                                                    border: "1px solid #282D37",
                                                    color: "#C7D2FE",
                                                    fontSize: "10px",
                                                    fontFamily: "ui-monospace, monospace",
                                                    padding: "2px 6px",
                                                    borderRadius: "4px",
                                                    cursor: "pointer",
                                                }}
                                                onClick={() => {
                                                    const current = batchTagsInput.trim();
                                                    if (!current) setBatchTagsInput(t.name);
                                                    else setBatchTagsInput(`${current}, ${t.name}`);
                                                }}
                                            >
                                                +{t.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {isProcessingBatch && (
                                <div style={{ marginBottom: "14px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#9CA3AF", marginBottom: "4px" }}>
                                        <span>Adding tags...</span>
                                        <span>{batchProgress.current} / {batchProgress.total}</span>
                                    </div>
                                    <div style={{ width: "100%", height: "4px", background: "#23262D", borderRadius: "2px", overflow: "hidden" }}>
                                        <div
                                            style={{
                                                height: "100%",
                                                background: "#818CF8",
                                                width: `${(batchProgress.current / (batchProgress.total || 1)) * 100}%`,
                                                transition: "width 0.2s ease",
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                                <button
                                    type="button"
                                    className="btn-secondary-admin"
                                    onClick={() => setIsBatchAddTagsOpen(false)}
                                    disabled={isProcessingBatch}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn-primary-admin"
                                    onClick={handleConfirmBatchAddTags}
                                    disabled={isProcessingBatch || !batchTagsInput.trim()}
                                >
                                    {isProcessingBatch ? "Adding..." : "Add Tags"}
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
                                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                    <a
                                        href={`/inspector?image_id=${previewImage.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-secondary-admin"
                                        style={{ fontSize: "11px", padding: "3px 8px" }}
                                        title="Open Metadata Inspector"
                                    >
                                        Inspect Graph
                                    </a>
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
