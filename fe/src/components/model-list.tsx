import { useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { getModels, getModel, type Model as ApiModel } from "../api/models";
import { resolveImageUrl } from "../api/client";
import { useFavorites } from "../api/favorites";
import { CivitaiRichDescription } from "./CivitaiRichDescription";
import "../style/ModelList.css";

export interface ResourceUsed {
    name: string;
    type: string; // 'checkpoint' | 'lora'
    weight?: number;
}

export interface ImageItem {
    id: number;
    url: string;
    alt: string;
    caption?: string;
    reactions: { laugh: number; heart: number; thumbsUp: number };
    tags?: string[];
    meta: {
        prompt: string;
        negativePrompt: string;
        seed: number;
        steps: number;
        sampler: string;
        scheduler?: string;
        cfg: number;
        size: string;
        baseModel: string;
        resources?: ResourceUsed[];
    };
}

export interface ReviewItem {
    id: number;
    reviewer: string;
    rating: number;
    comment: string;
    createdAt: string;
}

export interface VersionItem {
    id: number;
    name: string;
    versionNumber?: string;
    fileName: string;
    fileSize: string;
    format: string;
    downloadUrl?: string;
    civitaiUrl?: string;
    recommendedSettings?: {
        steps?: number | string;
        stepsRange?: string;
        width?: number;
        height?: number;
        sampler?: string;
        cfgScale?: number | string;
        cfgScaleRange?: string;
        clipSkip?: number;
        scheduler?: string;
        hiresUpscale?: number;
        hiresSteps?: number;
        hiresUpscaler?: string;
        denoise?: string | number;
        [key: string]: unknown;
    };
}

export interface CatalogModel {
    id: string | number;
    slug: string;
    name: string;
    type: "checkpoint" | "lora";
    baseModel: string; // Illustrious, NoobAI, Flux, Pony, SD 1.5, etc.
    author: string;
    thumbnailUrl: string;
    description: string;
    sourceUrl: string;
    publishedAt: string;
    likes: number;
    rating: number;
    reviewCount: number;

    // Tensor & VRAM
    tensorSize?: string;
    vramMin?: string;
    vramRecommended?: string;
    conditioner?: number;
    firstStageModel?: number;
    modelTensor?: number;

    triggerWords?: string[];
    tags: string[];
    reviews?: ReviewItem[];
    versions?: VersionItem[];
    images: ImageItem[];
}

function StarIcon({ filled, size = 14, style }: { filled?: boolean; size?: number; style?: React.CSSProperties }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={filled ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={style}
        >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
    );
}

function formatCount(val: number): string {
    if (val >= 1000) {
        return (val / 1000).toFixed(1) + "K";
    }
    return String(val);
}

function formatFileSize(bytes?: number): string {
    if (!bytes || bytes <= 0) return "";
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
}

function mapApiModelToCatalog(m: ApiModel): CatalogModel {
    const typeNorm = m.type?.toLowerCase() === "lora" ? "lora" : "checkpoint";
    const baseModelNorm = m.base_model || "Illustrious";
    const triggers = m.trigger_words?.map((t) => t.trigger_word) || [];

    const mappedVersions: VersionItem[] = m.versions && m.versions.length > 0
        ? m.versions.map((v) => ({
              id: v.id,
              name: v.version_name || "v1.0",
              versionNumber: v.version_number,
              fileName: v.file_name || `${m.slug || "model"}.safetensors`,
              fileSize: formatFileSize(v.file_size),
              format: v.format || "SafeTensor",
              downloadUrl: v.download_url,
              civitaiUrl: v.civitai_version_url || m.civitai_url || m.source_url,
              recommendedSettings: v.recommended_settings
                  ? {
                        steps: v.recommended_settings.steps,
                        stepsRange: (v.recommended_settings as any).steps_range || (v.recommended_settings as any).stepsRange,
                        width: v.recommended_settings.width,
                        height: v.recommended_settings.height,
                        sampler: v.recommended_settings.sampler,
                        cfgScale: v.recommended_settings.cfg_scale ?? (v.recommended_settings as any).cfgScale,
                        cfgScaleRange: (v.recommended_settings as any).cfg_scale_range || (v.recommended_settings as any).cfgScaleRange,
                        clipSkip: (v.recommended_settings as any).clip_skip ?? (v.recommended_settings as any).clipSkip,
                        scheduler: (v.recommended_settings as any).scheduler,
                        hiresUpscale: (v.recommended_settings as any).hires_upscale ?? (v.recommended_settings as any).hiresUpscale,
                        hiresSteps: (v.recommended_settings as any).hires_steps ?? (v.recommended_settings as any).hiresSteps,
                        hiresUpscaler: (v.recommended_settings as any).hires_upscaler ?? (v.recommended_settings as any).hiresUpscaler,
                        denoise: (v.recommended_settings as any).denoising_strength ?? (v.recommended_settings as any).denoise,
                    }
                  : undefined
          }))
        : [];

    return {
        id: m.id,
        slug: m.slug || `model-${m.id}`,
        name: m.name,
        type: typeNorm,
        baseModel: baseModelNorm,
        author: m.author || "unknown",
        thumbnailUrl: resolveImageUrl(m.thumbnail_url || (m.images && m.images.length > 0 ? m.images[0].image_url : "")),
        description: m.description || "",
        sourceUrl: m.source_url || m.civitai_url || "",
        publishedAt: m.published_at
            ? new Date(m.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : (m.created_at ? new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""),
        likes: m.likes ?? 0,
        rating: m.rating ?? 0,
        reviewCount: m.reviews?.length ?? 0,
        tensorSize: m.tensor_size || "",
        vramMin: m.vram_min || "",
        vramRecommended: m.vram_recommended || "",
        conditioner: m.conditioner ?? 0,
        firstStageModel: m.first_stage_model ?? 0,
        modelTensor: m.model_tensor ?? 0,
        triggerWords: triggers.length > 0 ? triggers : undefined,
        tags: m.tags?.map((t) => t.name) || [],
        reviews: m.reviews?.map((r) => ({
            id: r.id,
            reviewer: r.reviewer,
            rating: r.rating,
            comment: r.comment,
            createdAt: new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        })),
        versions: mappedVersions.length > 0 ? mappedVersions : undefined,
        images: m.images && m.images.length > 0
            ? m.images.map((img, idx) => ({
                  id: img.id || idx + 1,
                  url: resolveImageUrl(img.image_url) || "/images/preview-1.png",
                  alt: img.caption || m.name,
                  reactions: { laugh: 0, heart: 0, thumbsUp: 0 },
                  tags: img.tags?.map((t) => t.name) || [],
                  meta: {
                      prompt: img.positive_prompt || "",
                      negativePrompt: img.negative_prompt || "",
                      seed: img.seed || 0,
                      steps: img.steps || 0,
                      sampler: img.sampler || "",
                      scheduler: img.scheduler || "",
                      cfg: img.cfg_scale || 0,
                      size: img.width && img.height ? `${img.width} × ${img.height}` : "",
                      baseModel: baseModelNorm,
                      resources: img.resources?.map((r) => ({
                          name: r.name,
                          type: r.type,
                          weight: r.weight
                      }))
                  }
              }))
            : []
    };
}

export default function ModelList() {
    const [searchParams, setSearchParams] = useSearchParams();
    const modelParam = searchParams.get("model");
    const tabParam = searchParams.get("tab");
    const searchParam = searchParams.get("search");

    const [catalog, setCatalog] = useState<CatalogModel[]>([]);
    const [detailedModel, setDetailedModel] = useState<CatalogModel | null>(null);
    const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { isModelFav, toggleModel, favoriteModels } = useFavorites();

    // Derive active tab from URL search parameters, and update URL when tab changes
    const activeTab = tabParam || "all";
    const setActiveTab = (tab: string) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (tab === "all") {
                next.delete("tab");
            } else {
                next.set("tab", tab);
            }
            return next;
        });
    };

    // Keep search query in local state for responsive input, sync when URL searchParam changes during render
    const [searchQuery, setSearchQuery] = useState<string>(searchParam || "");
    const [prevSearchParam, setPrevSearchParam] = useState(searchParam);
    if (searchParam !== prevSearchParam) {
        setPrevSearchParam(searchParam);
        setSearchQuery(searchParam || "");
    }

    const [sortBy, setSortBy] = useState<string>("popular");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    // Detail view sub-states
    const [detailsOpen, setDetailsOpen] = useState(true);
    const [reviewsOpen, setReviewsOpen] = useState(true);
    const [activeInspectorImage, setActiveInspectorImage] = useState<ImageItem | null>(null);
    const [copiedText, setCopiedText] = useState<string | null>(null);
    const [resourceRating, setResourceRating] = useState<"like" | "dislike" | null>(null);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const thumbsTrackRef = useRef<HTMLDivElement>(null);

    // Fetch catalog from backend API on retry
    const fetchCatalog = () => {
        setLoading(true);
        setError(null);

        getModels({ limit: 100 })
            .then((res) => {
                if (res?.data && Array.isArray(res.data)) {
                    setCatalog(res.data.map(mapApiModelToCatalog));
                } else {
                    setCatalog([]);
                }
            })
            .catch((err) => {
                console.error("Failed to fetch models from backend:", err);
                setError("Tidak dapat terhubung ke server backend (http://localhost:8080/api/models). Pastikan server backend sedang berjalan.");
                setCatalog([]);
            })
            .finally(() => setLoading(false));
    };

    // Initial mount fetch — asynchronous only, avoids synchronous setState in effect
    useEffect(() => {
        let ignore = false;
        getModels({ limit: 100 })
            .then((res) => {
                if (ignore) return;
                if (res?.data && Array.isArray(res.data)) {
                    setCatalog(res.data.map(mapApiModelToCatalog));
                } else {
                    setCatalog([]);
                }
            })
            .catch((err) => {
                if (ignore) return;
                console.error("Failed to fetch models from backend:", err);
                setError("Tidak dapat terhubung ke server backend (http://localhost:8080/api/models). Pastikan server backend sedang berjalan.");
                setCatalog([]);
            })
            .finally(() => {
                if (!ignore) setLoading(false);
            });

        return () => {
            ignore = true;
        };
    }, []);

    // Derive selected model from URL param and catalog/detailedModel
    const selectedModel = useMemo(() => {
        if (!modelParam) return null;
        if (detailedModel && (detailedModel.slug === modelParam || String(detailedModel.id) === modelParam)) {
            return detailedModel;
        }
        return catalog.find((c) => c.slug === modelParam || String(c.id) === modelParam) || null;
    }, [modelParam, detailedModel, catalog]);

    // Async fetch full model details when modelParam is present
    useEffect(() => {
        if (!modelParam) return;

        let ignore = false;
        getModel(modelParam)
            .then((fullModel) => {
                if (ignore) return;
                if (fullModel) {
                    const mapped = mapApiModelToCatalog(fullModel);
                    setDetailedModel(mapped);
                    if (mapped.versions && mapped.versions.length > 0) {
                        setSelectedVersionId((prev) => {
                            if (prev && mapped.versions!.some((v) => v.id === prev)) {
                                return prev;
                            }
                            return mapped.versions![0].id;
                        });
                    }
                }
            })
            .catch((err) => {
                console.error("Failed to fetch full model detail:", err);
            });

        return () => {
            ignore = true;
        };
    }, [modelParam]);

    const handleSelectModel = (model: CatalogModel) => {
        setDetailedModel(model);
        setSelectedVersionId(model.versions?.[0]?.id || null);
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set("model", model.slug);
            return next;
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleBackToCatalog = () => {
        setDetailedModel(null);
        setSelectedVersionId(null);
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete("model");
            return next;
        });
    };

    const copyToClipboard = (text: string, label: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedText(label);
        setTimeout(() => setCopiedText(null), 2000);
    };

    // Extract dynamic unique base models from loaded catalog
    const availableBaseModels = useMemo(() => {
        const set = new Set<string>();
        catalog.forEach((m) => {
            if (m.baseModel) set.add(m.baseModel);
        });
        return Array.from(set);
    }, [catalog]);

    // Filter & Sort Logic
    const filteredCatalog = useMemo(() => {
        return catalog
            .filter((m) => {
                if (activeTab === "favorites") {
                    return isModelFav(m.id);
                }

                if (activeTab === "checkpoints" && m.type !== "checkpoint") return false;
                if (activeTab === "lora" && m.type !== "lora") return false;

                // Base model specific filters
                if (activeTab !== "all" && activeTab !== "checkpoints" && activeTab !== "lora") {
                    if (m.baseModel.toLowerCase() !== activeTab.toLowerCase()) {
                        return false;
                    }
                }

                if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    const nameMatch = m.name.toLowerCase().includes(q);
                    const authorMatch = m.author.toLowerCase().includes(q);
                    const baseMatch = m.baseModel.toLowerCase().includes(q);
                    const triggerMatch = m.triggerWords?.some((t) => t.toLowerCase().includes(q));
                    const tagMatch = m.tags.some((t) => t.toLowerCase().includes(q));
                    if (!nameMatch && !authorMatch && !baseMatch && !triggerMatch && !tagMatch) return false;
                }

                return true;
            })
            .sort((a, b) => {
                if (sortBy === "popular") {
                    return b.likes - a.likes;
                }
                if (sortBy === "rating") {
                    return b.rating - a.rating;
                }
                if (sortBy === "reviews") {
                    return (b.reviews?.length || b.reviewCount) - (a.reviews?.length || a.reviewCount);
                }
                if (sortBy === "name") {
                    return a.name.localeCompare(b.name);
                }
                if (sortBy === "newest") {
                    return Number(b.id) - Number(a.id);
                }
                return 0;
            });
    }, [catalog, activeTab, searchQuery, sortBy, isModelFav]);

    // Active version item in Detail View
    const currentVersion = useMemo(() => {
        if (!selectedModel?.versions || selectedModel.versions.length === 0) return null;
        if (selectedVersionId) {
            const found = selectedModel.versions.find((v) => v.id === selectedVersionId);
            if (found) return found;
        }
        return selectedModel.versions[0];
    }, [selectedModel, selectedVersionId]);

    // Safe images list with fallback image if model has no images
    const showcaseImages: ImageItem[] = useMemo(() => {
        if (selectedModel?.images && selectedModel.images.length > 0) {
            return selectedModel.images;
        }
        if (selectedModel?.thumbnailUrl) {
            return [
                {
                    id: 0,
                    url: selectedModel.thumbnailUrl,
                    alt: selectedModel.name,
                    reactions: { laugh: 0, heart: 0, thumbsUp: 0 },
                    meta: {
                        prompt: selectedModel.description || "Preview for " + selectedModel.name,
                        negativePrompt: "",
                        seed: 0,
                        steps: 0,
                        sampler: "N/A",
                        scheduler: "Normal",
                        cfg: 0,
                        size: "",
                        baseModel: selectedModel.baseModel,
                        resources: []
                    }
                }
            ];
        }
        return [];
    }, [selectedModel]);

    // Reset carousel index when active model changes
    useEffect(() => {
        setActiveImageIndex(0);
    }, [selectedModel?.id]);

    const safeActiveIndex = showcaseImages.length > 0
        ? Math.min(Math.max(0, activeImageIndex), showcaseImages.length - 1)
        : 0;
    const activeShowcaseImg = showcaseImages[safeActiveIndex];

    const handlePrevImage = () => {
        if (showcaseImages.length <= 1) return;
        setActiveImageIndex((prev) => (prev - 1 + showcaseImages.length) % showcaseImages.length);
    };

    const handleNextImage = () => {
        if (showcaseImages.length <= 1) return;
        setActiveImageIndex((prev) => (prev + 1) % showcaseImages.length);
    };

    const handleScrollThumbs = (direction: "left" | "right") => {
        if (!thumbsTrackRef.current) return;
        const scrollAmount = direction === "left" ? -240 : 240;
        thumbsTrackRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    };

    // Keyboard navigation: Left/Right arrows to cycle images when viewing model details
    useEffect(() => {
        if (!selectedModel || showcaseImages.length <= 1) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (activeInspectorImage) return; // avoid conflict with modal
            if (e.key === "ArrowLeft") {
                handlePrevImage();
            } else if (e.key === "ArrowRight") {
                handleNextImage();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedModel, showcaseImages.length, activeInspectorImage]);

    // =========================================================================
    // VIEW 1: DETAILED MODEL VIEW
    // =========================================================================
    if (selectedModel) {
        return (
            <div className="civitai-page">
                {/* Back to Catalog Top Bar */}
                <div className="detail-top-nav-bar">
                    <button className="back-to-catalog-btn" onClick={handleBackToCatalog}>
                        ← Back to Models Catalog
                    </button>
                    {catalog.length > 1 && (
                        <div className="model-quick-switcher">
                            <span className="quick-label">Switch:</span>
                            {catalog.map((m) => (
                                <button
                                    key={m.id}
                                    className={`quick-pill-btn ${selectedModel.id === m.id ? "active" : ""}`}
                                    onClick={() => handleSelectModel(m)}
                                >
                                    {m.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Model Header */}
                <header className="civitai-header">
                    <div className="header-top-row">
                        <div className="title-and-stats">
                            <h1 className="model-main-title">{selectedModel.name}</h1>

                            <div className="header-stats-chips">
                                <span className="stat-chip" title="Likes">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
                                    </svg>
                                    {formatCount(selectedModel.likes)}
                                </span>

                                <span className="stat-chip" title="Rating">
                                    ⭐ {selectedModel.rating.toFixed(2)}
                                </span>

                                <span className="stat-chip tip-chip" title="Reviews">
                                    💬 {selectedModel.reviews?.length || selectedModel.reviewCount} Reviews
                                </span>
                            </div>
                        </div>

                        <div className="header-action-icons">
                            {/* Share Link Button */}
                            <button
                                type="button"
                                className="icon-circle-btn"
                                onClick={() => {
                                    const shareUrl = `${window.location.origin}/models?model=${selectedModel.slug || selectedModel.id}`;
                                    copyToClipboard(shareUrl, "Link model");
                                }}
                                title="Salin link langsung ke model ini (Share link)"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                </svg>
                            </button>

                            {/* Compare Button */}
                            <Link
                                to={`/compare?m1=${selectedModel.slug || selectedModel.id}`}
                                className="icon-circle-btn"
                                title="Adu Model ini di Side-by-Side Comparison Tool"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M16 3h5v5" />
                                    <path d="M4 20L21 3" />
                                    <path d="M21 16v5h-5" />
                                    <path d="M15 15l6 6" />
                                    <path d="M4 4l5 5" />
                                </svg>
                            </Link>

                            {/* Favorite Button */}
                            <button
                                type="button"
                                className={`icon-circle-btn ${isModelFav(selectedModel.id) ? "favorited" : ""}`}
                                onClick={() => {
                                    const nextState = toggleModel(selectedModel.id);
                                    setCopiedText(nextState ? "Ditambahkan ke Favorit" : "Dihapus dari Favorit");
                                    setTimeout(() => setCopiedText(null), 2000);
                                }}
                                title={isModelFav(selectedModel.id) ? "Favorit (Klik untuk hapus)" : "Tambah ke Favorit"}
                            >
                                <StarIcon filled={isModelFav(selectedModel.id)} size={15} />
                            </button>

                            {selectedModel.sourceUrl && (
                                <a
                                    href={selectedModel.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="icon-circle-btn external-link-icon"
                                    title="Open on External Source (Civitai)"
                                >
                                    ↗
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Sub-row: Update date & Category Tags */}
                    <div className="header-meta-row">
                        {selectedModel.publishedAt && (
                            <span className="update-timestamp">Published {selectedModel.publishedAt}</span>
                        )}
                        <div className="header-tags-list">
                            <span className="tag-badge base-tag">{selectedModel.baseModel.toUpperCase()}</span>
                            <span className="tag-badge type-tag">{selectedModel.type.toUpperCase()}</span>
                            {selectedModel.tags.map((t, idx) => (
                                <span className="tag-badge" key={idx}>{t}</span>
                            ))}
                        </div>
                    </div>

                    {/* Version Pills Bar (if multiple versions available) */}
                    {selectedModel.versions && selectedModel.versions.length > 1 && (
                        <div className="version-tabs-bar">
                            {selectedModel.versions.map((v) => {
                                const isActive = currentVersion?.id === v.id;
                                return (
                                    <button
                                        key={v.id}
                                        className={`version-pill ${isActive ? "active" : ""}`}
                                        onClick={() => setSelectedVersionId(v.id)}
                                    >
                                        {v.name}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </header>

                {/* 2-Column Split Civitai Layout */}
                <div className="civitai-layout-grid">
                    {/* Left Column: Image Showcase + Description + Reviews */}
                    <section className="civitai-left-column">
                        {/* Image Showcase Grid or Empty State */}
                        {showcaseImages.length === 0 ? (
                            <div className="showcase-empty-state">
                                <div className="showcase-empty-icon">🖼️</div>
                                <h3 className="showcase-empty-title">Belum Ada Sampel Generasi</h3>
                                <p className="showcase-empty-desc">
                                    Model ini belum memiliki gambar sampel atau parameter generasi yang diunggah.
                                </p>
                            </div>
                        ) : (
                            <div className="civitai-showcase-carousel">
                                {/* Main Featured Stage */}
                                <div className="carousel-main-stage">
                                    <div className="carousel-image-wrapper">
                                        {activeShowcaseImg && (
                                            <img
                                                src={activeShowcaseImg.url}
                                                alt={activeShowcaseImg.alt || `Showcase image ${safeActiveIndex + 1}`}
                                                className="carousel-active-img clickable-image"
                                                onClick={() => setActiveInspectorImage(activeShowcaseImg)}
                                                title="Klik untuk membuka prompt & parameter lengkap"
                                            />
                                        )}

                                        {/* Camera Counter Badge */}
                                        <div className="carousel-counter-badge">
                                            <span className="badge-camera-icon">📷</span>
                                            <span>
                                                {safeActiveIndex + 1} / {showcaseImages.length}
                                            </span>
                                        </div>

                                        {/* Prev & Next Floating Navigation Buttons */}
                                        {showcaseImages.length > 1 && (
                                            <>
                                                <button
                                                    type="button"
                                                    className="carousel-arrow-btn prev-arrow"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handlePrevImage();
                                                    }}
                                                    title="Gambar sebelumnya (←)"
                                                >
                                                    ❮
                                                </button>
                                                <button
                                                    type="button"
                                                    className="carousel-arrow-btn next-arrow"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleNextImage();
                                                    }}
                                                    title="Gambar berikutnya (→)"
                                                >
                                                    ❯
                                                </button>
                                            </>
                                        )}

                                        {/* Top-Right Quick Tool: Fullsize / Prompt Inspect */}
                                        <div className="carousel-top-actions">
                                            <button
                                                type="button"
                                                className="card-tool-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (activeShowcaseImg) setActiveInspectorImage(activeShowcaseImg);
                                                }}
                                                title="Buka Prompt & Metadata Lengkap"
                                            >
                                                🔍
                                            </button>
                                        </div>

                                        {/* Bottom Action Overlay: Reactions & Prompt Inspector Button */}
                                        {activeShowcaseImg && (
                                            <div className="image-bottom-overlay">
                                                <div className="reactions-cluster">
                                                    <button className="reaction-pill add-btn" title="Tambah reaksi">+</button>
                                                    <button className="reaction-pill">
                                                        <span>😆</span> <span>{activeShowcaseImg.reactions.laugh}</span>
                                                    </button>
                                                    <button className="reaction-pill">
                                                        <span>❤️</span> <span>{activeShowcaseImg.reactions.heart}</span>
                                                    </button>
                                                    <button className="reaction-pill">
                                                        <span>👍</span> <span>{activeShowcaseImg.reactions.thumbsUp}</span>
                                                    </button>
                                                </div>

                                                <button
                                                    type="button"
                                                    className="info-badge-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveInspectorImage(activeShowcaseImg);
                                                    }}
                                                    title="Lihat Prompt & Parameter Generasi Gambar ini"
                                                >
                                                    <span className="info-icon">ⓘ</span>
                                                    <span>Prompt & Settings</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Bottom Horizontal Thumbnail Scrubbing Strip */}
                                {showcaseImages.length > 1 && (
                                    <div className="carousel-thumbnails-bar">
                                        <button
                                            type="button"
                                            className="thumbnail-scroll-arrow left"
                                            onClick={() => handleScrollThumbs("left")}
                                            title="Geser thumbnail ke kiri"
                                        >
                                            ‹
                                        </button>

                                        <div className="carousel-thumbnails-track" ref={thumbsTrackRef}>
                                            {showcaseImages.map((img, idx) => {
                                                const isActive = idx === safeActiveIndex;
                                                return (
                                                    <button
                                                        key={`${img.id}-${idx}`}
                                                        type="button"
                                                        className={`carousel-thumb-item ${isActive ? "active" : ""}`}
                                                        onClick={() => setActiveImageIndex(idx)}
                                                        title={`Lihat gambar ke-${idx + 1}`}
                                                    >
                                                        <img
                                                            src={img.url}
                                                            alt={`Thumb ${idx + 1}`}
                                                            className="thumb-img"
                                                        />
                                                        {isActive && <div className="thumb-active-glow" />}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <button
                                            type="button"
                                            className="thumbnail-scroll-arrow right"
                                            onClick={() => handleScrollThumbs("right")}
                                            title="Geser thumbnail ke kanan"
                                        >
                                            ›
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Trigger Words for LoRA */}
                        {selectedModel.type === "lora" && selectedModel.triggerWords && selectedModel.triggerWords.length > 0 && (
                            <div className="lora-triggers-box">
                                <div className="trigger-header">
                                    <span className="trigger-title">Trigger Words (Trained Tokens)</span>
                                </div>
                                <div className="trigger-pills-row">
                                    {selectedModel.triggerWords.map((word, i) => (
                                        <button
                                            key={i}
                                            className="trigger-pill"
                                            onClick={() => copyToClipboard(word, `Trigger "${word}"`)}
                                            title="Click to copy trigger word"
                                        >
                                            {word} <span className="copy-icon">❐</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recommended Settings Card (derived from Civitai / model version) */}
                        {(() => {
                            const rec = currentVersion?.recommendedSettings || selectedModel.versions?.[0]?.recommendedSettings;
                            if (!rec) return null;
                            const hasAnySetting = rec.sampler || rec.steps || rec.stepsRange || rec.cfgScale || rec.cfgScaleRange || (rec.width && rec.height) || rec.clipSkip || rec.hiresUpscale || rec.hiresUpscaler || rec.denoise;
                            if (!hasAnySetting) return null;

                            const displaySteps = rec.stepsRange || rec.steps;
                            const displayCFG = rec.cfgScaleRange || rec.cfgScale;

                            return (
                                <div className="civitai-card recommended-settings-card">
                                    <div className="download-card-header">
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <span className="card-title-strong">Recommended Generation Settings</span>
                                            <span style={{ fontSize: "11px", color: "#666c75" }}>from Civitai</span>
                                        </div>
                                        {currentVersion?.name && <span className="variant-label">{currentVersion.name}</span>}
                                    </div>
                                    <div className="settings-badge-grid">
                                        {rec.sampler && (
                                            <div className="setting-badge-item">
                                                <span className="setting-key">Sampler</span>
                                                <span className="setting-value">{rec.sampler}</span>
                                            </div>
                                        )}
                                        {displaySteps !== undefined && (
                                            <div className="setting-badge-item">
                                                <span className="setting-key">Steps</span>
                                                <span className="setting-value">{displaySteps}</span>
                                            </div>
                                        )}
                                        {displayCFG !== undefined && (
                                            <div className="setting-badge-item">
                                                <span className="setting-key">CFG Scale</span>
                                                <span className="setting-value">{displayCFG}</span>
                                            </div>
                                        )}
                                        {rec.width && rec.height && (
                                            <div className="setting-badge-item">
                                                <span className="setting-key">Resolution</span>
                                                <span className="setting-value">
                                                    {rec.width} × {rec.height}
                                                </span>
                                            </div>
                                        )}
                                        {rec.clipSkip !== undefined && rec.clipSkip > 0 && (
                                            <div className="setting-badge-item">
                                                <span className="setting-key">Clip Skip</span>
                                                <span className="setting-value">{rec.clipSkip}</span>
                                            </div>
                                        )}
                                        {rec.scheduler && (
                                            <div className="setting-badge-item">
                                                <span className="setting-key">Scheduler</span>
                                                <span className="setting-value">{rec.scheduler}</span>
                                            </div>
                                        )}
                                        {rec.hiresUpscale !== undefined && rec.hiresUpscale > 0 && (
                                            <div className="setting-badge-item">
                                                <span className="setting-key">Hires Upscale</span>
                                                <span className="setting-value">
                                                    {rec.hiresUpscale}x {rec.hiresSteps ? `(${rec.hiresSteps} st)` : ""}
                                                </span>
                                            </div>
                                        )}
                                        {rec.hiresUpscaler && (
                                            <div className="setting-badge-item">
                                                <span className="setting-key">Hires Upscaler</span>
                                                <span className="setting-value">{rec.hiresUpscaler}</span>
                                            </div>
                                        )}
                                        {rec.denoise && (
                                            <div className="setting-badge-item">
                                                <span className="setting-key">Denoise</span>
                                                <span className="setting-value">{rec.denoise}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Article & Rich Civitai Description */}
                        <CivitaiRichDescription
                            content={selectedModel.description}
                            modelName={selectedModel.name}
                        />

                        {/* Reviews Section */}
                        {selectedModel.reviews && selectedModel.reviews.length > 0 && (
                            <div className="civitai-card reviews-card">
                                <button className="accordion-header-btn" onClick={() => setReviewsOpen(!reviewsOpen)}>
                                    <span className="card-title-strong">
                                        Community Reviews ({selectedModel.reviews.length})
                                    </span>
                                    <span className="chevron-icon">{reviewsOpen ? "▲" : "▼"}</span>
                                </button>
                                {reviewsOpen && (
                                    <div className="reviews-list-body">
                                        {selectedModel.reviews.map((rev) => (
                                            <div className="review-item-box" key={rev.id}>
                                                <div className="review-header">
                                                    <span className="reviewer-name">👤 {rev.reviewer}</span>
                                                    <span className="review-stars">{"★".repeat(rev.rating)}</span>
                                                    <span className="review-date">{rev.createdAt}</span>
                                                </div>
                                                <p className="review-comment">{rev.comment}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                    {/* Right Column (Sidebar) */}
                    <aside className="civitai-right-sidebar">
                        {/* Social Toolbar */}
                        <div className="sidebar-action-toolbar">
                            <button className="action-pill-btn" onClick={() => copyToClipboard(window.location.href, "Share Link")}>
                                ↗ Share
                            </button>
                            <button
                                className={`action-pill-btn ${resourceRating === "like" ? "active-rate" : ""}`}
                                onClick={() => setResourceRating(resourceRating === "like" ? null : "like")}
                            >
                                👍
                            </button>
                            <button
                                className={`action-pill-btn ${resourceRating === "dislike" ? "active-rate" : ""}`}
                                onClick={() => setResourceRating(resourceRating === "dislike" ? null : "dislike")}
                            >
                                👎
                            </button>
                            <button
                                className={`action-pill-btn ${isBookmarked ? "active-bookmark" : ""}`}
                                onClick={() => setIsBookmarked(!isBookmarked)}
                            >
                                🔖
                            </button>
                            <button
                                className={`action-pill-btn ${isSubscribed ? "active-sub" : ""}`}
                                onClick={() => setIsSubscribed(!isSubscribed)}
                            >
                                🔔
                            </button>
                        </div>

                        {/* Download / Source Card */}
                        <div className="civitai-card download-card">
                            <div className="download-card-header">
                                <span className="card-title-strong">Model Source</span>
                                <span className="variant-label">
                                    {currentVersion ? currentVersion.name : "CivitAI / Official"}
                                </span>
                            </div>

                            <div className="file-info-box">
                                <div className="file-icon-wrapper">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#339af0" strokeWidth="2">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                        <polyline points="15 3 21 3 21 9" />
                                        <line x1="10" y1="14" x2="21" y2="3" />
                                    </svg>
                                </div>
                                <div className="file-text-meta">
                                    <span className="format-title">
                                        {currentVersion ? `${currentVersion.format}` : "External Repository"}
                                    </span>
                                    {currentVersion?.fileName && (
                                        <span className="file-name" style={{ fontSize: "12px", color: "#ced4da" }}>
                                            {currentVersion.fileName}
                                        </span>
                                    )}
                                    <span className="file-specs">
                                        {currentVersion?.fileSize ? `File Size: ${currentVersion.fileSize}` : "Verify weights & hashes at official source"}
                                    </span>
                                </div>
                            </div>

                            {(() => {
                                const targetUrl = currentVersion?.civitaiUrl || selectedModel.sourceUrl || currentVersion?.downloadUrl;
                                if (!targetUrl) return null;
                                return (
                                    <a
                                        href={targetUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="primary-download-btn"
                                        style={{ textDecoration: "none" }}
                                    >
                                        Download  {currentVersion?.fileSize ? `(${currentVersion.fileSize})` : ""} ↗
                                    </a>
                                );
                            })()}
                        </div>

                        {/* Details Accordion Panel */}
                        <div className="civitai-card details-card">
                            <button className="accordion-header-btn" onClick={() => setDetailsOpen(!detailsOpen)}>
                                <span className="card-title-strong">Details</span>
                                <span className="chevron-icon">{detailsOpen ? "▲" : "▼"}</span>
                            </button>

                            {detailsOpen && (
                                <div className="details-body">
                                    <div className="meta-pair-row">
                                        <span className="meta-key">Type</span>
                                        <span className="meta-val">
                                            <span className="type-badge">{selectedModel.type.toUpperCase()}</span>
                                        </span>
                                    </div>

                                    <div className="meta-pair-row">
                                        <span className="meta-key">Base Model</span>
                                        <span className="meta-val link-val">{selectedModel.baseModel}</span>
                                    </div>

                                    <div className="meta-pair-row">
                                        <span className="meta-key">Author</span>
                                        <span className="meta-val">{selectedModel.author}</span>
                                    </div>

                                    {selectedModel.publishedAt && (
                                        <div className="meta-pair-row">
                                            <span className="meta-key">Published</span>
                                            <span className="meta-val">{selectedModel.publishedAt}</span>
                                        </div>
                                    )}

                                    <div className="meta-pair-row">
                                        <span className="meta-key">Rating</span>
                                        <span className="meta-val review-val">
                                            ⭐ {selectedModel.rating.toFixed(2)} ({selectedModel.reviewCount} reviews)
                                        </span>
                                    </div>

                                    {/* Tensor & VRAM Information */}
                                    <div className="tensors-panel">
                                        <div className="tensors-header-row">
                                            <span className="tensors-title">Tensors: {selectedModel.tensorSize || "2,517"}</span>
                                            <span className="vram-spec">
                                                VRAM: {selectedModel.vramMin || "2.5 GB"} min / {selectedModel.vramRecommended || "7.7 GB"} rec
                                            </span>
                                        </div>
                                        <div className="tensors-list">
                                            <div className="tensor-item">
                                                <span className="tensor-name">› conditioner</span>
                                                <span className="tensor-shape">{selectedModel.conditioner || 587}</span>
                                            </div>
                                            <div className="tensor-item">
                                                <span className="tensor-name">› first_stage_model</span>
                                                <span className="tensor-shape">{selectedModel.firstStageModel || 230}</span>
                                            </div>
                                            {selectedModel.modelTensor ? (
                                                <div className="tensor-item">
                                                    <span className="tensor-name">› model</span>
                                                    <span className="tensor-shape">{selectedModel.modelTensor}</span>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Feedback Bar */}
                        <div className="civitai-feedback-bar">
                            <span className="feedback-label">
                                <span className="heart-icon">♡</span> What did you think of this resource?
                            </span>
                            <div className="feedback-buttons">
                                <button
                                    className={`feedback-icon-btn ${resourceRating === "like" ? "active" : ""}`}
                                    onClick={() => setResourceRating(resourceRating === "like" ? null : "like")}
                                >
                                    👍
                                </button>
                                <button
                                    className={`feedback-icon-btn ${resourceRating === "dislike" ? "active" : ""}`}
                                    onClick={() => setResourceRating(resourceRating === "dislike" ? null : "dislike")}
                                >
                                    👎
                                </button>
                            </div>
                        </div>
                    </aside>
                </div>

                {/* ===== Full-Screen Image Lightbox Modal ===== */}
                {activeInspectorImage && (
                    <div className="lightbox-backdrop" onClick={() => setActiveInspectorImage(null)}>
                        <div className="lightbox-container" onClick={(e) => e.stopPropagation()}>
                            {/* Close Button */}
                            <button className="lightbox-close-btn" onClick={() => setActiveInspectorImage(null)} title="Close">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>

                            {/* Left: Large Image Panel */}
                            <div className="lightbox-image-panel">
                                {/* Navigation Arrows */}
                                {showcaseImages.length > 1 && (
                                    <>
                                        <button
                                            className="lightbox-nav-btn lightbox-nav-prev"
                                            onClick={() => {
                                                const curIdx = showcaseImages.findIndex(img => img.id === activeInspectorImage.id);
                                                const prevIdx = (curIdx - 1 + showcaseImages.length) % showcaseImages.length;
                                                setActiveInspectorImage(showcaseImages[prevIdx]);
                                            }}
                                            title="Previous image"
                                        >
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                                        </button>
                                        <button
                                            className="lightbox-nav-btn lightbox-nav-next"
                                            onClick={() => {
                                                const curIdx = showcaseImages.findIndex(img => img.id === activeInspectorImage.id);
                                                const nextIdx = (curIdx + 1) % showcaseImages.length;
                                                setActiveInspectorImage(showcaseImages[nextIdx]);
                                            }}
                                            title="Next image"
                                        >
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                                        </button>
                                    </>
                                )}

                                {/* Image Counter */}
                                {showcaseImages.length > 1 && (
                                    <div className="lightbox-image-counter">
                                        {showcaseImages.findIndex(img => img.id === activeInspectorImage.id) + 1} / {showcaseImages.length}
                                    </div>
                                )}

                                <img
                                    src={activeInspectorImage.url}
                                    alt={activeInspectorImage.alt}
                                    className="lightbox-main-image"
                                />

                                {/* Size badge */}
                                {activeInspectorImage.meta.size && (
                                    <div className="lightbox-size-badge">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                                        {activeInspectorImage.meta.size}
                                    </div>
                                )}
                            </div>

                            {/* Right: Metadata Sidebar Panel */}
                            <div className="lightbox-meta-sidebar">
                                <div className="lightbox-meta-header">
                                    <h3>Generation Details</h3>
                                    <span className="lightbox-model-badge">{activeInspectorImage.meta.baseModel || selectedModel.baseModel}</span>
                                </div>

                                <div className="lightbox-meta-scroll">
                                    {/* Prompt */}
                                    <div className="lightbox-section">
                                        <div className="lightbox-section-header">
                                            <label>✦ Positive Prompt</label>
                                            {activeInspectorImage.meta.prompt && (
                                                <button
                                                    className="copy-param-btn"
                                                    onClick={() => copyToClipboard(activeInspectorImage.meta.prompt, "Prompt")}
                                                >
                                                    {copiedText === "Prompt" ? "✓ Copied!" : "❐ Copy"}
                                                </button>
                                            )}
                                        </div>
                                        <div className="lightbox-prompt-box">
                                            {activeInspectorImage.meta.prompt || "No prompt metadata attached."}
                                        </div>
                                    </div>

                                    {/* Negative Prompt */}
                                    {activeInspectorImage.meta.negativePrompt && (
                                        <div className="lightbox-section">
                                            <div className="lightbox-section-header">
                                                <label>✧ Negative Prompt</label>
                                                <button
                                                    className="copy-param-btn"
                                                    onClick={() => copyToClipboard(activeInspectorImage.meta.negativePrompt, "Negative Prompt")}
                                                >
                                                    {copiedText === "Negative Prompt" ? "✓ Copied!" : "❐ Copy"}
                                                </button>
                                            </div>
                                            <div className="lightbox-prompt-box negative">
                                                {activeInspectorImage.meta.negativePrompt}
                                            </div>
                                        </div>
                                    )}

                                    {/* Generation Settings Grid */}
                                    <div className="lightbox-section">
                                        <label className="lightbox-section-title">⚙ Generation Settings</label>
                                        <div className="lightbox-settings-grid">
                                            <div className="lightbox-setting-item">
                                                <span className="setting-label">Steps</span>
                                                <span className="setting-val">{activeInspectorImage.meta.steps || "—"}</span>
                                            </div>
                                            <div className="lightbox-setting-item">
                                                <span className="setting-label">Sampler</span>
                                                <span className="setting-val">{activeInspectorImage.meta.sampler || "—"}</span>
                                            </div>
                                            <div className="lightbox-setting-item">
                                                <span className="setting-label">Scheduler</span>
                                                <span className="setting-val">{activeInspectorImage.meta.scheduler || "Normal"}</span>
                                            </div>
                                            <div className="lightbox-setting-item">
                                                <span className="setting-label">CFG Scale</span>
                                                <span className="setting-val">{activeInspectorImage.meta.cfg || "—"}</span>
                                            </div>
                                            <div className="lightbox-setting-item">
                                                <span className="setting-label">Seed</span>
                                                <span className="setting-val mono">{activeInspectorImage.meta.seed || "—"}</span>
                                            </div>
                                            <div className="lightbox-setting-item">
                                                <span className="setting-label">Resolution</span>
                                                <span className="setting-val">{activeInspectorImage.meta.size || "—"}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Resources Used */}
                                    {activeInspectorImage.meta.resources && activeInspectorImage.meta.resources.length > 0 && (
                                        <div className="lightbox-section">
                                            <label className="lightbox-section-title">🔗 Resources Used</label>
                                            <div className="lightbox-resources-list">
                                                {activeInspectorImage.meta.resources.map((res, i) => (
                                                    <div className="lightbox-resource-item" key={i}>
                                                        <span className={`res-type-badge ${res.type === 'lora' ? 'lora' : 'checkpoint'}`}>
                                                            {res.type.toUpperCase()}
                                                        </span>
                                                        <span className="res-item-name">{res.name}</span>
                                                        {res.weight !== undefined && (
                                                            <span className="res-item-weight">{res.weight}</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Image Tags */}
                                    {activeInspectorImage.tags && activeInspectorImage.tags.length > 0 && (
                                        <div className="lightbox-section">
                                            <label className="lightbox-section-title">🏷 Tags</label>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                                                {activeInspectorImage.tags.map((tag, i) => (
                                                    <span key={i} className="tag-badge" style={{ fontSize: '11px', textTransform: 'none' }}>
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {copiedText && <div className="civitai-toast">{copiedText} copied to clipboard!</div>}
            </div>
        );
    }

    // =========================================================================
    // VIEW 2: CATALOG VIEW (Simple Cards / List with Urgent Details)
    // =========================================================================
    return (
        <div className="catalog-page-container">
            {/* Catalog Top Header */}
            <header className="catalog-header">
                <div className="catalog-header-title-row">
                    <div>
                        <h1 className="catalog-main-title">Model Catalog</h1>
                        <p className="catalog-subtitle">
                            Registered checkpoint models, LoRA weights, and pipeline configurations across <strong>Illustrious</strong>, <strong>NoobAI</strong>, and anime architectures.
                        </p>
                    </div>

                    <div className="catalog-view-toggles">
                        <button
                            className={`view-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
                            onClick={() => setViewMode("grid")}
                            title="Grid Card View"
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
                                <rect x="3" y="3" width="7" height="7" />
                                <rect x="14" y="3" width="7" height="7" />
                                <rect x="14" y="14" width="7" height="7" />
                                <rect x="3" y="14" width="7" height="7" />
                            </svg>
                            Grid
                        </button>
                        <button
                            className={`view-toggle-btn ${viewMode === "list" ? "active" : ""}`}
                            onClick={() => setViewMode("list")}
                            title="Compact List View"
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
                                <line x1="8" y1="6" x2="21" y2="6" />
                                <line x1="8" y1="12" x2="21" y2="12" />
                                <line x1="8" y1="18" x2="21" y2="18" />
                                <line x1="3" y1="6" x2="3.01" y2="6" />
                                <line x1="3" y1="12" x2="3.01" y2="12" />
                                <line x1="3" y1="18" x2="3.01" y2="18" />
                            </svg>
                            List
                        </button>
                        <Link
                            to="/compare"
                            className="view-toggle-btn"
                            title="Compare Models Side-by-Side (Fitur Adu Model)"
                            style={{ textDecoration: 'none' }}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
                                <path d="M16 3h5v5" />
                                <path d="M4 20L21 3" />
                                <path d="M21 16v5h-5" />
                                <path d="M15 15l6 6" />
                                <path d="M4 4l5 5" />
                            </svg>
                            Compare
                        </Link>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="catalog-filter-bar">
                    <div className="filter-pills-group">
                        <button
                            className={`filter-pill ${activeTab === "all" ? "active" : ""}`}
                            onClick={() => setActiveTab("all")}
                        >
                            All ({catalog.length})
                        </button>
                        <button
                            className={`filter-pill ${activeTab === "favorites" ? "active" : ""}`}
                            onClick={() => setActiveTab("favorites")}
                            style={{ color: favoriteModels.length > 0 ? "#fab005" : undefined }}
                        >
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                <StarIcon filled={favoriteModels.length > 0} size={13} />
                                Favorit ({favoriteModels.length})
                            </span>
                        </button>
                        <button
                            className={`filter-pill ${activeTab === "checkpoints" ? "active" : ""}`}
                            onClick={() => setActiveTab("checkpoints")}
                        >
                            Checkpoints
                        </button>
                        <button
                            className={`filter-pill ${activeTab === "lora" ? "active" : ""}`}
                            onClick={() => setActiveTab("lora")}
                        >
                            LoRAs
                        </button>

                        {/* Dynamically extract base models from database */}
                        {availableBaseModels.map((bm) => (
                            <button
                                key={bm}
                                className={`filter-pill ${activeTab === bm ? "active" : ""}`}
                                onClick={() => setActiveTab(bm)}
                            >
                                {bm}
                            </button>
                        ))}
                    </div>

                    {/* Search & Sort Controls */}
                    <div className="catalog-search-sort-row">
                        <div className="search-input-wrapper">
                            <span className="search-icon">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                            </span>
                            <input
                                type="text"
                                placeholder="Search model, author, tag, trigger..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button className="clear-search-btn" onClick={() => setSearchQuery("")}>
                                    ✕
                                </button>
                            )}
                        </div>

                        <select
                            className="catalog-sort-select"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="popular">Most Popular (Likes)</option>
                            <option value="rating">Highest Rated</option>
                            <option value="reviews">Most Reviews</option>
                            <option value="newest">Newest First</option>
                            <option value="name">Name (A-Z)</option>
                        </select>
                    </div>
                </div>
            </header>

            {/* Loading State */}
            {loading && (
                <div className="catalog-loading-state">
                    <div className="catalog-spinner"></div>
                    <p className="loading-text">Loading model data from backend...</p>
                </div>
            )}

            {/* Error State with Retry */}
            {!loading && error && (
                <div className="catalog-error-state">
                    <h3>Connection Error</h3>
                    <p>{error}</p>
                    <button className="retry-btn" onClick={fetchCatalog}>
                        Retry Connection
                    </button>
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && filteredCatalog.length === 0 && (
                <div className="empty-catalog-state">
                    <h3>No models found</h3>
                    <p>
                        {catalog.length === 0
                            ? "Database has no models registered yet. Add models via Admin console or backend migrations."
                            : "No models matched the specified filter parameters or search query."}
                    </p>
                </div>
            )}

            {/* Catalog Grid View */}
            {!loading && !error && viewMode === "grid" && filteredCatalog.length > 0 && (
                <div className="catalog-cards-grid">
                    {filteredCatalog.map((item) => (
                        <article
                            key={item.id}
                            className="simple-model-card"
                            onClick={() => handleSelectModel(item)}
                        >
                            {/* Card Media Preview */}
                            <div className="card-media-preview">
                                {item.thumbnailUrl ? (
                                    <img src={item.thumbnailUrl} alt={item.name} className="card-img" />
                                ) : (
                                    <div className="card-img-placeholder">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666c75" strokeWidth="1.5">
                                            <rect x="3" y="3" width="18" height="18" rx="2" />
                                            <circle cx="8.5" cy="8.5" r="1.5" />
                                            <polyline points="21 15 16 10 5 21" />
                                        </svg>
                                        <span className="placeholder-text">No sample preview</span>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    className={`card-fav-btn ${isModelFav(item.id) ? "favorited" : ""}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleModel(item.id);
                                    }}
                                    title={isModelFav(item.id) ? "Hapus dari Favorit" : "Simpan ke Favorit"}
                                >
                                    <StarIcon filled={isModelFav(item.id)} size={14} />
                                </button>

                                <div className="card-top-badges">
                                    <span className={`pill-badge ${item.type === "lora" ? "lora-pill" : "checkpoint-pill"}`}>
                                        {item.type.toUpperCase()}
                                    </span>
                                    <span className="pill-badge base-pill">
                                        {item.baseModel}
                                    </span>
                                </div>

                                <div className="card-bottom-stats-overlay">
                                    <span>Likes: {formatCount(item.likes)}</span>
                                    <span>·</span>
                                    <span>Rating: {item.rating.toFixed(1)}</span>
                                </div>
                            </div>

                            {/* Card Body - Urgent Details */}
                            <div className="card-info-body">
                                <h3 className="card-model-name" title={item.name}>
                                    {item.name}
                                </h3>

                                <div className="card-author-row">
                                    <span className="by-label">by</span>
                                    <span className="author-name">{item.author}</span>
                                    {item.publishedAt && (
                                        <span className="card-size-tag">{item.publishedAt}</span>
                                    )}
                                </div>

                                <p className="card-short-desc">
                                    {item.description || "Generative AI model weights and pipeline configuration."}
                                </p>

                                {/* Trigger words snippet for LoRAs */}
                                {item.type === "lora" && item.triggerWords && item.triggerWords.length > 0 && (
                                    <div className="card-triggers-snippet">
                                        <span className="triggers-label">Trigger:</span>
                                        <span className="trigger-token">{item.triggerWords[0]}</span>
                                        {item.triggerWords.length > 1 && (
                                            <span className="more-token">+{item.triggerWords.length - 1}</span>
                                        )}
                                    </div>
                                )}

                                <div className="card-footer-row">
                                    <span className="card-version-tag">
                                        {item.versions?.[0]?.name || item.baseModel}
                                    </span>
                                    <button className="card-inspect-btn">
                                        Inspect Model →
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {/* Compact List View */}
            {!loading && !error && viewMode === "list" && filteredCatalog.length > 0 && (
                <div className="catalog-list-view">
                    <div className="list-header-row">
                        <span className="col-model">Model</span>
                        <span className="col-type">Type</span>
                        <span className="col-base">Base Architecture</span>
                        <span className="col-stats">Metrics</span>
                        <span className="col-size">Published</span>
                        <span className="col-action">Action</span>
                    </div>

                    {filteredCatalog.map((item) => (
                        <div
                            key={item.id}
                            className="list-item-row"
                            onClick={() => handleSelectModel(item)}
                        >
                            <div className="col-model list-model-cell">
                                {item.thumbnailUrl ? (
                                    <img src={item.thumbnailUrl} alt={item.name} className="list-thumb" />
                                ) : (
                                    <div className="list-thumb-placeholder">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666c75" strokeWidth="1.5">
                                            <rect x="3" y="3" width="18" height="18" rx="2" />
                                        </svg>
                                    </div>
                                )}
                                <div>
                                    <h4 className="list-title">{item.name}</h4>
                                    <span className="list-author">by {item.author}</span>
                                </div>
                            </div>

                            <div className="col-type">
                                <span className={`pill-badge ${item.type === "lora" ? "lora-pill" : "checkpoint-pill"}`}>
                                    {item.type.toUpperCase()}
                                </span>
                            </div>

                            <div className="col-base">
                                <span className="pill-badge base-pill">{item.baseModel}</span>
                            </div>

                            <div className="col-stats list-stats-cell">
                                <span>Likes: {formatCount(item.likes)}</span>
                                <span>·</span>
                                <span>Rating: {item.rating.toFixed(1)}</span>
                            </div>

                            <div className="col-size list-size-cell">
                                <span>{item.publishedAt || "-"}</span>
                            </div>

                            <div className="col-action" style={{ display: "flex", alignItems: "center" }}>
                                <button
                                    type="button"
                                    className={`list-fav-btn ${isModelFav(item.id) ? "favorited" : ""}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleModel(item.id);
                                    }}
                                    title={isModelFav(item.id) ? "Hapus dari Favorit" : "Simpan ke Favorit"}
                                >
                                    <StarIcon filled={isModelFav(item.id)} size={13} />
                                </button>
                                <button className="list-view-btn">Inspect →</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}