import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { getModels, getModel, type Model as ApiModel } from "../api/models";
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
        steps?: number;
        width?: number;
        height?: number;
        sampler?: string;
        cfgScale?: number;
        clipSkip?: number;
        hiresSteps?: number;
        hiresUpscale?: number;
        hiresUpscaler?: string;
        denoisingStrength?: number;
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
                        width: v.recommended_settings.width,
                        height: v.recommended_settings.height,
                        sampler: v.recommended_settings.sampler,
                        cfgScale: v.recommended_settings.cfg_scale,
                        clipSkip: v.recommended_settings.clip_skip,
                        hiresSteps: v.recommended_settings.hires_steps,
                        hiresUpscale: v.recommended_settings.hires_upscale,
                        hiresUpscaler: v.recommended_settings.hires_upscaler,
                        denoisingStrength: v.recommended_settings.denoising_strength
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
        thumbnailUrl: m.thumbnail_url || (typeNorm === "lora" ? "/images/preview-2.png" : "/images/preview-1.png"),
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
        tags: m.tags?.length ? m.tags.map((t) => t.name.toUpperCase()) : [typeNorm.toUpperCase(), baseModelNorm.toUpperCase()],
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
                  url: img.image_url || "/images/preview-1.png",
                  alt: img.caption || m.name,
                  reactions: { laugh: 0, heart: 0, thumbsUp: 0 },
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

    const [catalog, setCatalog] = useState<CatalogModel[]>([]);
    const [selectedModel, setSelectedModel] = useState<CatalogModel | null>(null);
    const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters and View Mode
    const [activeTab, setActiveTab] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");
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
    const [carouselOffset, setCarouselOffset] = useState(0);

    // Fetch catalog from backend API
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

    useEffect(() => {
        fetchCatalog();
    }, []);

    // Sync selected model from URL query parameter — fetch full detail from API
    useEffect(() => {
        if (modelParam) {
            getModel(modelParam)
                .then((fullModel) => {
                    if (fullModel) {
                        const mapped = mapApiModelToCatalog(fullModel);
                        setSelectedModel(mapped);
                        if (mapped.versions && mapped.versions.length > 0) {
                            setSelectedVersionId(mapped.versions[0].id);
                        }
                    } else {
                        const found = catalog.find((c) => c.slug === modelParam || String(c.id) === modelParam);
                        setSelectedModel(found || null);
                        if (found?.versions && found.versions.length > 0) {
                            setSelectedVersionId(found.versions[0].id);
                        }
                    }
                })
                .catch(() => {
                    const found = catalog.find((c) => c.slug === modelParam || String(c.id) === modelParam);
                    setSelectedModel(found || null);
                    if (found?.versions && found.versions.length > 0) {
                        setSelectedVersionId(found.versions[0].id);
                    }
                });
        } else {
            setSelectedModel(null);
            setSelectedVersionId(null);
        }
    }, [modelParam, catalog]);

    const handleSelectModel = (model: CatalogModel) => {
        setSelectedModel(model);
        setSelectedVersionId(model.versions?.[0]?.id || null);
        setSearchParams({ model: model.slug });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleBackToCatalog = () => {
        setSelectedModel(null);
        setSelectedVersionId(null);
        setSearchParams({});
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
    }, [catalog, activeTab, searchQuery, sortBy]);

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
        if (selectedModel) {
            return [
                {
                    id: 0,
                    url: selectedModel.thumbnailUrl || "/images/preview-1.png",
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
                        {/* Image Showcase Grid */}
                        <div className="image-showcase-grid">
                            {showcaseImages
                                .map((_, i) => showcaseImages[(i + carouselOffset) % showcaseImages.length])
                                .map((img, idx) => (
                                    <div className="showcase-card" key={`${img.id}-${idx}`}>
                                        <div className="card-image-wrapper">
                                            <img
                                                src={img.url}
                                                alt={img.alt}
                                                className="showcase-img clickable-image"
                                                onClick={() => setActiveInspectorImage(img)}
                                                title="Click to view full size"
                                            />

                                            {idx === 1 && showcaseImages.length > 1 && (
                                                <>
                                                    <button
                                                        className="carousel-nav-btn prev"
                                                        onClick={() =>
                                                            setCarouselOffset(
                                                                (p) => (p - 1 + showcaseImages.length) % showcaseImages.length
                                                            )
                                                        }
                                                    >
                                                        ‹
                                                    </button>
                                                    <button
                                                        className="carousel-nav-btn next"
                                                        onClick={() =>
                                                            setCarouselOffset((p) => (p + 1) % showcaseImages.length)
                                                        }
                                                    >
                                                        ›
                                                    </button>
                                                </>
                                            )}

                                            <div className="image-bottom-overlay">
                                                <div className="reactions-cluster">
                                                    <button className="reaction-pill add-btn">+</button>
                                                    <button className="reaction-pill">
                                                        <span>😆</span> <span>{img.reactions.laugh}</span>
                                                    </button>
                                                    <button className="reaction-pill">
                                                        <span>❤️</span> <span>{img.reactions.heart}</span>
                                                    </button>
                                                    <button className="reaction-pill">
                                                        <span>👍</span> <span>{img.reactions.thumbsUp}</span>
                                                    </button>
                                                </div>

                                                <button
                                                    className="info-badge-btn"
                                                    onClick={() => setActiveInspectorImage(img)}
                                                    title="View Generation Parameters & Resources"
                                                >
                                                    <span className="info-icon">ⓘ</span>
                                                    <span>Prompt & Settings</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>

                        {/* Trigger Words for LoRA */}
                        {selectedModel.type === "lora" && selectedModel.triggerWords && selectedModel.triggerWords.length > 0 && (
                            <div className="lora-triggers-box">
                                <div className="trigger-header">
                                    <span className="trigger-title">⚡ Trigger Words (Trained Tokens)</span>
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

                        {/* Recommended Settings Card (if present on active version) */}
                        {currentVersion?.recommendedSettings && (
                            <div className="civitai-card recommended-settings-card">
                                <div className="download-card-header">
                                    <span className="card-title-strong">⚙️ Recommended Generation Settings</span>
                                    <span className="variant-label">{currentVersion.name}</span>
                                </div>
                                <div className="settings-badge-grid">
                                    {currentVersion.recommendedSettings.sampler && (
                                        <div className="setting-badge-item">
                                            <span className="setting-key">Sampler</span>
                                            <span className="setting-value">{currentVersion.recommendedSettings.sampler}</span>
                                        </div>
                                    )}
                                    {currentVersion.recommendedSettings.steps && (
                                        <div className="setting-badge-item">
                                            <span className="setting-key">Steps</span>
                                            <span className="setting-value">{currentVersion.recommendedSettings.steps}</span>
                                        </div>
                                    )}
                                    {currentVersion.recommendedSettings.cfgScale && (
                                        <div className="setting-badge-item">
                                            <span className="setting-key">CFG Scale</span>
                                            <span className="setting-value">{currentVersion.recommendedSettings.cfgScale}</span>
                                        </div>
                                    )}
                                    {currentVersion.recommendedSettings.width && currentVersion.recommendedSettings.height && (
                                        <div className="setting-badge-item">
                                            <span className="setting-key">Resolution</span>
                                            <span className="setting-value">
                                                {currentVersion.recommendedSettings.width} × {currentVersion.recommendedSettings.height}
                                            </span>
                                        </div>
                                    )}
                                    {currentVersion.recommendedSettings.clipSkip && (
                                        <div className="setting-badge-item">
                                            <span className="setting-key">Clip Skip</span>
                                            <span className="setting-value">{currentVersion.recommendedSettings.clipSkip}</span>
                                        </div>
                                    )}
                                    {currentVersion.recommendedSettings.hiresUpscaler && (
                                        <div className="setting-badge-item">
                                            <span className="setting-key">Hires Upscaler</span>
                                            <span className="setting-value">{currentVersion.recommendedSettings.hiresUpscaler}</span>
                                        </div>
                                    )}
                                    {currentVersion.recommendedSettings.denoisingStrength && (
                                        <div className="setting-badge-item">
                                            <span className="setting-key">Denoising</span>
                                            <span className="setting-value">{currentVersion.recommendedSettings.denoisingStrength}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Article & Description */}
                        <article className="model-article">
                            <h2 className="article-main-title">{selectedModel.name}</h2>
                            <p className="article-paragraph">
                                {selectedModel.description || "Tidak ada deskripsi rinci untuk model ini."}
                            </p>
                        </article>

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

                            {currentVersion?.downloadUrl ? (
                                <a
                                    href={currentVersion.downloadUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="primary-download-btn"
                                    style={{ textDecoration: "none" }}
                                >
                                    Download {currentVersion.fileSize ? `(${currentVersion.fileSize})` : ""}
                                </a>
                            ) : selectedModel.sourceUrl ? (
                                <a
                                    href={selectedModel.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="primary-download-btn"
                                    style={{ textDecoration: "none" }}
                                >
                                    Open on CivitAI ↗
                                </a>
                            ) : null}
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
                        <h1 className="catalog-main-title">AI Models & LoRAs</h1>
                        <p className="catalog-subtitle">
                            Explore models and LoRAs across <strong>Illustrious</strong>, <strong>NoobAI</strong>, and leading anime architectures
                        </p>
                    </div>

                    <div className="catalog-view-toggles">
                        <button
                            className={`view-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
                            onClick={() => setViewMode("grid")}
                            title="Grid Card View"
                        >
                            ☷ Grid
                        </button>
                        <button
                            className={`view-toggle-btn ${viewMode === "list" ? "active" : ""}`}
                            onClick={() => setViewMode("list")}
                            title="Compact List View"
                        >
                            ☰ List
                        </button>
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
                            className={`filter-pill ${activeTab === "checkpoints" ? "active" : ""}`}
                            onClick={() => setActiveTab("checkpoints")}
                        >
                            Checkpoints
                        </button>
                        <button
                            className={`filter-pill ${activeTab === "lora" ? "active" : ""}`}
                            onClick={() => setActiveTab("lora")}
                        >
                            ⚡ LoRAs
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
                            <span className="search-icon">⌕</span>
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
                    <p className="loading-text">Mengambil data model live dari database...</p>
                </div>
            )}

            {/* Error State with Retry */}
            {!loading && error && (
                <div className="catalog-error-state">
                    <span className="error-icon">⚠️</span>
                    <h3>Koneksi Server Gagal</h3>
                    <p>{error}</p>
                    <button className="retry-btn" onClick={fetchCatalog}>
                        🔄 Coba Lagi
                    </button>
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && filteredCatalog.length === 0 && (
                <div className="empty-catalog-state">
                    <span className="empty-icon">◈</span>
                    <h3>Tidak ada model ditemukan</h3>
                    <p>
                        {catalog.length === 0
                            ? "Database belum memiliki model. Tambahkan model melalui API backend atau migration."
                            : "Tidak ada model yang cocok dengan pencarian atau filter yang dipilih."}
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
                                <img src={item.thumbnailUrl} alt={item.name} className="card-img" />

                                <div className="card-top-badges">
                                    <span className={`pill-badge ${item.type === "lora" ? "lora-pill" : "checkpoint-pill"}`}>
                                        {item.type.toUpperCase()}
                                    </span>
                                    <span className="pill-badge base-pill">
                                        {item.baseModel}
                                    </span>
                                </div>

                                <div className="card-bottom-stats-overlay">
                                    <span>👍 {formatCount(item.likes)}</span>
                                    <span>⭐ {item.rating.toFixed(1)}</span>
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
                                        <span className="triggers-label">Triggers:</span>
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
                                        Inspect Details →
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
                        <span className="col-base">Base Model</span>
                        <span className="col-stats">Stats</span>
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
                                <img src={item.thumbnailUrl} alt={item.name} className="list-thumb" />
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
                                <span>👍 {formatCount(item.likes)}</span>
                                <span>⭐ {item.rating.toFixed(1)}</span>
                            </div>

                            <div className="col-size list-size-cell">
                                <span>{item.publishedAt || "-"}</span>
                            </div>

                            <div className="col-action">
                                <button className="list-view-btn">Inspect →</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}