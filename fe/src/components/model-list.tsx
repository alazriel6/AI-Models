import { useEffect, useState } from "react";
import { getModels, type Model } from "../api/models";
import "../style/ModelList.css";

interface ImageItem {
    id: number;
    url: string;
    alt: string;
    reactions: {
        laugh: number;
        heart: number;
        thumbsUp: number;
    };
    userReaction?: string | null;
    meta: {
        prompt: string;
        negativePrompt: string;
        seed: number;
        steps: number;
        sampler: string;
        cfg: number;
        size: string;
        baseModel: string;
    };
}

interface VersionItem {
    name: string;
    fileName: string;
    fileSize: string;
    releaseDate: string;
    isPinned?: boolean;
    hash: string;
    airId: string;
    description: string;
}

const DEFAULT_VERSIONS: VersionItem[] = [
    {
        name: "vpred v3.0",
        fileName: "raehoshiIllust-vpred-v3.0.safetensors",
        fileSize: "6.46 GB",
        releaseDate: "Sep 11, 2024",
        isPinned: true,
        hash: "74A981DE32",
        airId: "civitai: 840817 @ 1192012",
        description: "vpred v3.0 introduces tighter composition control and improved lighting balance."
    },
    {
        name: "v11.0",
        fileName: "raehoshiIllust-v11.safetensors",
        fileSize: "6.46 GB",
        releaseDate: "Aug 1, 2024",
        hash: "0155C9D0CB",
        airId: "civitai: 840817 @ 1141586",
        description: "v11.0 is an enhanced iteration built upon Illustrious XL, addressing oversaturation and artifact noise."
    },
    {
        name: "v10.0",
        fileName: "raehoshiIllust-v10.safetensors",
        fileSize: "6.46 GB",
        releaseDate: "Jul 15, 2024",
        hash: "82C7410DA1",
        airId: "civitai: 840817 @ 1098421",
        description: "v10.0 stable release with refined anime lineart."
    },
    {
        name: "v9.1",
        fileName: "raehoshiIllust-v9.1.safetensors",
        fileSize: "6.46 GB",
        releaseDate: "Jun 28, 2024",
        hash: "49B113EF90",
        airId: "civitai: 840817 @ 1045210",
        description: "v9.1 minor balance patch."
    },
    {
        name: "vpred v2.0",
        fileName: "raehoshiIllust-vpred-v2.0.safetensors",
        fileSize: "6.46 GB",
        releaseDate: "Jun 12, 2024",
        hash: "18E923AB45",
        airId: "civitai: 840817 @ 994821",
        description: "Experimental v-prediction training checkpoint."
    },
    {
        name: "v9.0",
        fileName: "raehoshiIllust-v9.0.safetensors",
        fileSize: "6.46 GB",
        releaseDate: "May 25, 2024",
        hash: "33A7C12F09",
        airId: "civitai: 840817 @ 941029",
        description: "v9.0 major feature overhaul."
    },
    {
        name: "v8.1 aesthetic",
        fileName: "raehoshiIllust-v8.1-aesthetic.safetensors",
        fileSize: "6.46 GB",
        releaseDate: "May 10, 2024",
        hash: "61D981BC43",
        airId: "civitai: 840817 @ 891402",
        description: "Aesthetic tuned checkpoint for softer portraits."
    },
    {
        name: "vpred_v1.0",
        fileName: "raehoshiIllust-vpred-v1.0.safetensors",
        fileSize: "6.46 GB",
        releaseDate: "Apr 22, 2024",
        hash: "55C812EF10",
        airId: "civitai: 840817 @ 842109",
        description: "Initial v-prediction test model."
    },
    { name: "v8.0", fileName: "raehoshiIllust-v8.0.safetensors", fileSize: "6.46 GB", releaseDate: "Apr 05, 2024", hash: "90A124BC56", airId: "civitai: 840817 @ 801234", description: "v8.0 line weight update." },
    { name: "v7.1", fileName: "raehoshiIllust-v7.1.safetensors", fileSize: "6.46 GB", releaseDate: "Mar 20, 2024", hash: "11E490CD78", airId: "civitai: 840817 @ 765432", description: "v7.1 bugfix." },
    { name: "v7.0", fileName: "raehoshiIllust-v7.0.safetensors", fileSize: "6.46 GB", releaseDate: "Mar 01, 2024", hash: "89F231AB01", airId: "civitai: 840817 @ 721908", description: "v7.0 model." },
    { name: "v6.0", fileName: "raehoshiIllust-v6.0.safetensors", fileSize: "6.46 GB", releaseDate: "Feb 14, 2024", hash: "44C129DE34", airId: "civitai: 840817 @ 681029", description: "v6.0 release." },
    { name: "v5.1", fileName: "raehoshiIllust-v5.1.safetensors", fileSize: "6.46 GB", releaseDate: "Jan 28, 2024", hash: "78A902BC12", airId: "civitai: 840817 @ 641092", description: "v5.1 release." },
    { name: "v5.0", fileName: "raehoshiIllust-v5.0.safetensors", fileSize: "6.46 GB", releaseDate: "Jan 10, 2024", hash: "32B891EF45", airId: "civitai: 840817 @ 602341", description: "v5.0 release." },
    { name: "v4.0", fileName: "raehoshiIllust-v4.0.safetensors", fileSize: "6.46 GB", releaseDate: "Dec 20, 2023", hash: "99D012AB67", airId: "civitai: 840817 @ 561920", description: "v4.0 release." },
    { name: "v3.0", fileName: "raehoshiIllust-v3.0.safetensors", fileSize: "6.46 GB", releaseDate: "Nov 15, 2023", hash: "21C345DE89", airId: "civitai: 840817 @ 521098", description: "v3.0 release." },
    { name: "v2.1", fileName: "raehoshiIllust-v2.1.safetensors", fileSize: "6.46 GB", releaseDate: "Oct 25, 2023", hash: "67E890BC23", airId: "civitai: 840817 @ 482109", description: "v2.1 release." },
    { name: "v2.0", fileName: "raehoshiIllust-v2.0.safetensors", fileSize: "6.46 GB", releaseDate: "Oct 01, 2023", hash: "12A345EF67", airId: "civitai: 840817 @ 441029", description: "v2.0 release." },
    { name: "v1.0-spo_edition", fileName: "raehoshiIllust-v1.0-spo.safetensors", fileSize: "6.46 GB", releaseDate: "Sep 10, 2023", hash: "88B901CD45", airId: "civitai: 840817 @ 401928", description: "Special SPO Edition." },
    { name: "v1.0", fileName: "raehoshiIllust-v1.0.safetensors", fileSize: "6.46 GB", releaseDate: "Aug 20, 2023", hash: "45C678AB90", airId: "civitai: 840817 @ 361029", description: "Initial release." }
];

const DEFAULT_IMAGES: ImageItem[] = [
    {
        id: 1,
        url: "/images/preview-1.png",
        alt: "Raehoshi Illust XL - Fox Girl illustration with flowers",
        reactions: { laugh: 27, heart: 22, thumbsUp: 6 },
        meta: {
            prompt: "masterpiece, best quality, ultra-detailed, 1girl, solo, kitsune, fox ears, fox girl, dark hair, red eyes, white floral hair accessory, traditional white and black layered yukata, golden ornaments, upper body, cherry blossom petals, looking at viewer",
            negativePrompt: "(worst quality, low quality:1.4), deformed, bad hands, mutated fingers, blurry, watermark, signature",
            seed: 849201948,
            steps: 28,
            sampler: "Euler a",
            cfg: 6.5,
            size: "832 × 1216",
            baseModel: "Illustrious XL"
        }
    },
    {
        id: 2,
        url: "/images/preview-2.png",
        alt: "Raehoshi Illust XL - Anime girl with bucket hat",
        reactions: { laugh: 10, heart: 9, thumbsUp: 4 },
        meta: {
            prompt: "masterpiece, highly detailed illustration, 1girl, blonde hair, purple eyes, bucket hat with letter A, blue oversized jacket, smirk, street anime style, rim lighting, vibrant colors, cinematic composition",
            negativePrompt: "(worst quality, low quality:1.4), bad anatomy, extra limbs, poorly drawn face, disfigured",
            seed: 471902482,
            steps: 30,
            sampler: "DPM++ 2M Karras",
            cfg: 7.0,
            size: "832 × 1216",
            baseModel: "Illustrious XL"
        }
    }
];

export default function ModelList() {
    const [apiModels, setApiModels] = useState<Model[]>([]);
    const [selectedModelId, setSelectedModelId] = useState<string>("raehoshi-illust-xl");

    // Versions & current selection
    const [selectedVersionName, setSelectedVersionName] = useState<string>("v11.0");

    // Collapsible states
    const [detailsOpen, setDetailsOpen] = useState(true);
    const [aboutVersionOpen, setAboutVersionOpen] = useState(false);
    const [tensorsOpen, setTensorsOpen] = useState(true);

    // Image Reactions & Inspector
    const [images, setImages] = useState<ImageItem[]>(DEFAULT_IMAGES);
    const [activeInspectorImage, setActiveInspectorImage] = useState<ImageItem | null>(null);

    // Copy notification feedback
    const [copiedText, setCopiedText] = useState<string | null>(null);

    // User Resource Rating
    const [resourceRating, setResourceRating] = useState<"like" | "dislike" | null>(null);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);

    // Carousel index for smaller viewports or cycling
    const [carouselOffset, setCarouselOffset] = useState(0);

    useEffect(() => {
        getModels()
            .then((res) => {
                if (res && res.data && res.data.length > 0) {
                    setApiModels(res.data);
                }
            })
            .catch((err) => {
                console.log("Could not load backend models (using sample Civitai data):", err);
            });
    }, []);

    // Current active version item
    const currentVersion =
        DEFAULT_VERSIONS.find((v) => v.name === selectedVersionName) || DEFAULT_VERSIONS[1];

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopiedText(label);
        setTimeout(() => setCopiedText(null), 2000);
    };

    const handleReaction = (imageId: number, type: "laugh" | "heart" | "thumbsUp") => {
        setImages((prev) =>
            prev.map((img) => {
                if (img.id !== imageId) return img;
                const isCurrent = img.userReaction === type;
                return {
                    ...img,
                    userReaction: isCurrent ? null : type,
                    reactions: {
                        ...img.reactions,
                        [type]: isCurrent ? img.reactions[type] - 1 : img.reactions[type] + 1
                    }
                };
            })
        );
    };

    const nextImage = () => {
        setCarouselOffset((prev) => (prev + 1) % images.length);
    };

    const prevImage = () => {
        setCarouselOffset((prev) => (prev - 1 + images.length) % images.length);
    };

    return (
        <div className="civitai-page">
            {/* Top Bar / Model Selector if backend models exist */}
            {apiModels.length > 0 && (
                <div className="civitai-model-selector-bar">
                    <span className="selector-label">Database Models:</span>
                    <button
                        className={`model-pill-btn ${selectedModelId === "raehoshi-illust-xl" ? "active" : ""}`}
                        onClick={() => setSelectedModelId("raehoshi-illust-xl")}
                    >
                        ✦ Raehoshi Illust XL (Featured)
                    </button>
                    {apiModels.map((m) => (
                        <button
                            key={m.id}
                            className={`model-pill-btn ${selectedModelId === String(m.id) ? "active" : ""}`}
                            onClick={() => setSelectedModelId(String(m.id))}
                        >
                            {m.name} ({m.type})
                        </button>
                    ))}
                </div>
            )}

            {/* Model Main Header */}
            <header className="civitai-header">
                <div className="header-top-row">
                    <div className="title-and-stats">
                        <h1 className="model-main-title">
                            {selectedModelId === "raehoshi-illust-xl"
                                ? "Raehoshi illust XL"
                                : apiModels.find((m) => String(m.id) === selectedModelId)?.name || "Raehoshi illust XL"}
                        </h1>

                        <div className="header-stats-chips">
                            <span className="stat-chip" title="Thumbs Up">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
                                </svg>
                                3.1K
                            </span>

                            <span className="stat-chip" title="Downloads">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                39.2K
                            </span>

                            <span className="stat-chip" title="Collections">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" />
                                </svg>
                                42.3K
                            </span>

                            <span className="stat-chip tip-chip" title="Buzz / Tips">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                                </svg>
                                1.6K
                            </span>

                            <span className="stat-chip" title="Views">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                                236.6K
                            </span>
                        </div>
                    </div>

                    <div className="header-action-icons">
                        <button className="icon-circle-btn" title="Model Information">
                            ⓘ
                        </button>
                        <button className="icon-circle-btn" title="Help & Guide">
                            ?
                        </button>
                        <button className="icon-circle-btn" title="More options">
                            ⋮
                        </button>
                    </div>
                </div>

                {/* Sub-row: Update date & Category Tags */}
                <div className="header-meta-row">
                    <span className="update-timestamp">Updated Sep 11, 2024</span>
                    <div className="header-tags-list">
                        <span className="tag-badge base-tag">BASE MODEL</span>
                        <span className="tag-badge">STYLES</span>
                        <span className="tag-badge">ANIME</span>
                        <span className="tag-badge">ANIME CHARACTER</span>
                        <span className="tag-badge">GAME CHARACTER</span>
                        <span className="tag-badge">GIRLS</span>
                    </div>
                </div>

                {/* Version Pills Horizontal Scroll Bar */}
                <div className="version-tabs-bar">
                    {DEFAULT_VERSIONS.map((v) => {
                        const isActive = selectedVersionName === v.name;
                        return (
                            <button
                                key={v.name}
                                className={`version-pill ${isActive ? "active" : ""}`}
                                onClick={() => setSelectedVersionName(v.name)}
                            >
                                {v.isPinned && <span className="pin-icon">📌</span>}
                                {v.name}
                            </button>
                        );
                    })}
                </div>
            </header>

            {/* Main 2-Column Split Layout */}
            <div className="civitai-layout-grid">
                {/* Left Column (Images + Article Description) */}
                <section className="civitai-left-column">
                    {/* Side-by-side Image Showcase */}
                    {(() => {
                        const displayedImages = images.map((_, i) => images[(i + carouselOffset) % images.length]);
                        return (
                            <div className="image-showcase-grid">
                                {displayedImages.map((img, idx) => (
                                    <div className="showcase-card" key={img.id}>
                                <div className="card-image-wrapper">
                                    <img
                                        src={img.url}
                                        alt={img.alt}
                                        className="showcase-img"
                                        onError={(e) => {
                                            // Fallback styled gradient if image path fails
                                            (e.target as HTMLElement).style.display = "none";
                                        }}
                                    />

                                    {/* Top floating actions */}
                                    <div className="image-top-actions">
                                        <button className="card-tool-btn" title="More actions">
                                            ⋮
                                        </button>
                                        <button className="card-tool-btn" title="Remix / Generate with this">
                                            🖌
                                        </button>
                                    </div>

                                    {/* Navigation Carousel arrows on 2nd image */}
                                    {idx === 1 && (
                                        <>
                                            <button className="carousel-nav-btn prev" onClick={prevImage} title="Previous">
                                                ‹
                                            </button>
                                            <button className="carousel-nav-btn next" onClick={nextImage} title="Next">
                                                ›
                                            </button>
                                        </>
                                    )}

                                    {/* Bottom overlay with Reactions and Info button */}
                                    <div className="image-bottom-overlay">
                                        <div className="reactions-cluster">
                                            <button
                                                className="reaction-pill add-btn"
                                                onClick={() => handleReaction(img.id, "laugh")}
                                                title="Add reaction"
                                            >
                                                +
                                            </button>

                                            <button
                                                className={`reaction-pill ${img.userReaction === "laugh" ? "reacted" : ""}`}
                                                onClick={() => handleReaction(img.id, "laugh")}
                                            >
                                                <span>😆</span>
                                                <span className="reaction-count">{img.reactions.laugh}</span>
                                            </button>

                                            <button
                                                className={`reaction-pill ${img.userReaction === "heart" ? "reacted" : ""}`}
                                                onClick={() => handleReaction(img.id, "heart")}
                                            >
                                                <span>❤️</span>
                                                <span className="reaction-count">{img.reactions.heart}</span>
                                            </button>

                                            <button
                                                className={`reaction-pill ${img.userReaction === "thumbsUp" ? "reacted" : ""}`}
                                                onClick={() => handleReaction(img.id, "thumbsUp")}
                                            >
                                                <span>👍</span>
                                                <span className="reaction-count">{img.reactions.thumbsUp}</span>
                                            </button>
                                        </div>

                                        <button
                                            className="info-badge-btn"
                                            onClick={() => setActiveInspectorImage(img)}
                                            title="View Generation Parameters"
                                        >
                                            ⓘ
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                        );
                    })()}

                    {/* Article / Description Section */}
                    <article className="model-article">
                        <h2 className="article-main-title">Raehoshi Illust XL</h2>

                        <p className="article-paragraph">
                            an enhanced iteration built upon the Illustrious XL model. It aims to elevate the visual style by
                            addressing some of the limitations in the original, such as oversaturation and artifact noise.
                            While these issues are not entirely eliminated, noticeable improvements have been made. The goal is to
                            deliver a more polished, balanced output while staying true to the strengths of the base model.
                        </p>

                        <h3 className="article-section-heading early-access-title">Why Early Access?</h3>

                        <p className="article-paragraph">
                            Early access helps keep the project going. I don't have my own GPU, so all training is done through
                            rented cloud GPUs and that gets pretty expensive. By getting early access, you're directly supporting the
                            development of my models and helping me keep improving them. If you'd like to support me further, you can
                            also{" "}
                            <a
                                href="https://ko-fi.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-action-link"
                            >
                                buy me a coffee on Ko-fi!
                            </a>{" "}
                            Every bit of help means a lot and keeps the future updates coming.
                        </p>
                    </article>
                </section>

                {/* Right Column (Sidebar) */}
                <aside className="civitai-right-sidebar">
                    {/* Social Toolbar */}
                    <div className="sidebar-action-toolbar">
                        <button className="action-pill-btn" title="Share" onClick={() => copyToClipboard(window.location.href, "Share Link")}>
                            ↗
                        </button>
                        <button
                            className={`action-pill-btn ${resourceRating === "like" ? "active-rate" : ""}`}
                            title="Thumbs Up"
                            onClick={() => setResourceRating(resourceRating === "like" ? null : "like")}
                        >
                            👍
                        </button>
                        <button
                            className={`action-pill-btn ${resourceRating === "dislike" ? "active-rate" : ""}`}
                            title="Thumbs Down"
                            onClick={() => setResourceRating(resourceRating === "dislike" ? null : "dislike")}
                        >
                            👎
                        </button>
                        <button className="action-pill-btn" title="Send Tip / Buzz">
                            ⚡
                        </button>
                        <button
                            className={`action-pill-btn ${isBookmarked ? "active-bookmark" : ""}`}
                            title="Add to Collection / Bookmark"
                            onClick={() => setIsBookmarked(!isBookmarked)}
                        >
                            🔖
                        </button>
                        <button
                            className={`action-pill-btn ${isSubscribed ? "active-sub" : ""}`}
                            title="Notify on Updates"
                            onClick={() => setIsSubscribed(!isSubscribed)}
                        >
                            🔔
                        </button>
                        <button className="action-pill-btn" title="Report / Flag">
                            ⚑
                        </button>
                    </div>

                    {/* Download Box Card */}
                    <div className="civitai-card download-card">
                        <div className="download-card-header">
                            <span className="card-title-strong">Download</span>
                            <span className="variant-label">1 variant available</span>
                        </div>

                        <div className="file-info-box">
                            <div className="file-icon-wrapper">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#339af0" strokeWidth="2">
                                    <rect x="3" y="3" width="7" height="7" rx="1" />
                                    <rect x="14" y="3" width="7" height="7" rx="1" />
                                    <rect x="14" y="14" width="7" height="7" rx="1" />
                                    <rect x="3" y="14" width="7" height="7" rx="1" />
                                </svg>
                            </div>
                            <div className="file-text-meta">
                                <span className="format-title">fp16 SafeTensor</span>
                                <span className="file-name">{currentVersion.fileName}</span>
                                <span className="file-specs">
                                    full precision, best balance (pruned) • {currentVersion.fileSize}
                                </span>
                                <span className="verified-status">
                                    <span className="verified-icon">🛡</span> verified 2 months ago
                                </span>
                            </div>
                        </div>

                        <a
                            href={`#download-${currentVersion.name}`}
                            className="primary-download-btn"
                            onClick={(e) => {
                                e.preventDefault();
                                alert(`Downloading ${currentVersion.fileName} (${currentVersion.fileSize})`);
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download ({currentVersion.fileSize})
                        </a>
                    </div>

                    {/* Details Accordion Panel */}
                    <div className="civitai-card details-card">
                        <button
                            className="accordion-header-btn"
                            onClick={() => setDetailsOpen(!detailsOpen)}
                        >
                            <span className="card-title-strong">Details</span>
                            <span className="chevron-icon">{detailsOpen ? "▲" : "▼"}</span>
                        </button>

                        {detailsOpen && (
                            <div className="details-body">
                                <div className="meta-pair-row">
                                    <span className="meta-key">Type</span>
                                    <span className="meta-val">
                                        <span className="type-badge">CHECKPOINT TRAINED</span>
                                        <span className="mini-info">ⓘ</span>
                                    </span>
                                </div>

                                <div className="meta-pair-row">
                                    <span className="meta-key">Stats</span>
                                    <span className="meta-val stats-val">
                                        <span>👍 3.09K</span>
                                        <span>👎 9</span>
                                    </span>
                                </div>

                                <div className="meta-pair-row">
                                    <span className="meta-key">Reviews</span>
                                    <span className="meta-val review-val">Very Positive (748)</span>
                                </div>

                                <div className="meta-pair-row">
                                    <span className="meta-key">Published</span>
                                    <span className="meta-val">{currentVersion.releaseDate}</span>
                                </div>

                                <div className="meta-pair-row">
                                    <span className="meta-key">Base Model</span>
                                    <span className="meta-val link-val">Illustrious</span>
                                </div>

                                <div className="meta-pair-row">
                                    <span className="meta-key">Training</span>
                                    <span className="meta-val">
                                        <span className="training-badge">SDXL 1.0</span>
                                    </span>
                                </div>

                                <div className="meta-pair-row">
                                    <span className="meta-key">Hash</span>
                                    <div className="meta-val copyable-row">
                                        <span className="hash-algo">AUTO V2</span>
                                        <code className="hash-code">{currentVersion.hash}</code>
                                        <button
                                            className="copy-mini-btn"
                                            title="Copy Hash"
                                            onClick={() => copyToClipboard(currentVersion.hash, "Hash")}
                                        >
                                            ❐
                                        </button>
                                    </div>
                                </div>

                                <div className="meta-pair-row">
                                    <span className="meta-key">AIR ⓘ</span>
                                    <div className="meta-val copyable-row">
                                        <span className="air-code">{currentVersion.airId}</span>
                                        <button
                                            className="copy-mini-btn"
                                            title="Copy AIR"
                                            onClick={() => copyToClipboard(currentVersion.airId, "AIR")}
                                        >
                                            ❐
                                        </button>
                                    </div>
                                </div>

                                {/* Tensors Breakdown Panel */}
                                <div className="tensors-panel">
                                    <div className="tensors-header-row">
                                        <span className="tensors-title">Tensors 2,517</span>
                                        <span className="vram-spec">VRAM min 2.5 GB / 7.7 GB</span>
                                    </div>

                                    <div className="tensors-table-header">
                                        <span>Tensors</span>
                                        <span>Shape</span>
                                    </div>

                                    <div className="tensors-list">
                                        <div className="tensor-item" onClick={() => setTensorsOpen(!tensorsOpen)}>
                                            <span className="tensor-name">› conditioner</span>
                                            <span className="tensor-shape">587</span>
                                        </div>
                                        <div className="tensor-item">
                                            <span className="tensor-name">› first_stage_model</span>
                                            <span className="tensor-shape">230</span>
                                        </div>
                                        <div className="tensor-item">
                                            <span className="tensor-name">› model</span>
                                            <span className="tensor-shape">1,600</span>
                                        </div>
                                    </div>

                                    {/* Usage bar slider visual */}
                                    <div className="vram-slider-track">
                                        <div className="vram-slider-fill" style={{ width: "35%" }}></div>
                                        <div className="vram-slider-thumb" style={{ left: "35%" }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* About this version Accordion */}
                    <div className="civitai-card version-accordion-card">
                        <button
                            className="accordion-header-btn"
                            onClick={() => setAboutVersionOpen(!aboutVersionOpen)}
                        >
                            <span className="card-title-strong">About this version</span>
                            <span className="chevron-icon">{aboutVersionOpen ? "▲" : "▼"}</span>
                        </button>

                        {aboutVersionOpen && (
                            <div className="version-notes-body">
                                <p>{currentVersion.description}</p>
                                <div className="recommended-params-box">
                                    <strong>Recommended Settings:</strong>
                                    <ul>
                                        <li>Sampler: Euler a or DPM++ 2M Karras</li>
                                        <li>Steps: 28 - 32</li>
                                        <li>CFG Scale: 5.5 - 7.0</li>
                                        <li>Clip Skip: 2</li>
                                        <li>Resolution: 832 × 1216 or 1024 × 1024</li>
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Rating Widget Footer */}
                    <div className="civitai-feedback-bar">
                        <span className="feedback-label">
                            <span className="heart-icon">♡</span> What did you think of this resource?
                        </span>
                        <div className="feedback-buttons">
                            <button
                                className={`feedback-icon-btn ${resourceRating === "like" ? "active" : ""}`}
                                onClick={() => setResourceRating(resourceRating === "like" ? null : "like")}
                                title="Good resource"
                            >
                                👍
                            </button>
                            <button
                                className={`feedback-icon-btn ${resourceRating === "dislike" ? "active" : ""}`}
                                onClick={() => setResourceRating(resourceRating === "dislike" ? null : "dislike")}
                                title="Needs improvement"
                            >
                                👎
                            </button>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Generation Metadata Modal (Inspector) */}
            {activeInspectorImage && (
                <div className="inspector-modal-backdrop" onClick={() => setActiveInspectorImage(null)}>
                    <div className="inspector-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Generation Metadata</h3>
                            <button className="close-btn" onClick={() => setActiveInspectorImage(null)}>
                                ✕
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="param-group">
                                <label>Prompt</label>
                                <div className="param-text">{activeInspectorImage.meta.prompt}</div>
                                <button
                                    className="copy-inline-btn"
                                    onClick={() => copyToClipboard(activeInspectorImage.meta.prompt, "Prompt")}
                                >
                                    Copy Prompt
                                </button>
                            </div>

                            <div className="param-group">
                                <label>Negative Prompt</label>
                                <div className="param-text">{activeInspectorImage.meta.negativePrompt}</div>
                            </div>

                            <div className="param-grid">
                                <div>
                                    <label>Steps</label>
                                    <span>{activeInspectorImage.meta.steps}</span>
                                </div>
                                <div>
                                    <label>Sampler</label>
                                    <span>{activeInspectorImage.meta.sampler}</span>
                                </div>
                                <div>
                                    <label>CFG Scale</label>
                                    <span>{activeInspectorImage.meta.cfg}</span>
                                </div>
                                <div>
                                    <label>Seed</label>
                                    <span>{activeInspectorImage.meta.seed}</span>
                                </div>
                                <div>
                                    <label>Size</label>
                                    <span>{activeInspectorImage.meta.size}</span>
                                </div>
                                <div>
                                    <label>Base Model</label>
                                    <span>{activeInspectorImage.meta.baseModel}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast notification */}
            {copiedText && <div className="civitai-toast">{copiedText} copied to clipboard!</div>}
        </div>
    );
}