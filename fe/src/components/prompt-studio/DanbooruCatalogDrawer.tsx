import React, { useState, useEffect, useRef } from "react";
import { getBooruTagsApi, type BooruTag } from "../../api/models";
import { CATEGORIES } from "./PromptCategoriesData";
import "../../style/BooruAutocomplete.css";

interface DanbooruCatalogDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onInsertTag: (tag: string, targetLayer?: string) => void;
    activeLayerId?: string;
}

export const DanbooruCatalogDrawer: React.FC<DanbooruCatalogDrawerProps> = ({
    isOpen,
    onClose,
    onInsertTag,
    activeLayerId,
}) => {
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [selectedLayer, setSelectedLayer] = useState<string>(activeLayerId || "all");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [tags, setTags] = useState<BooruTag[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [copiedTag, setCopiedTag] = useState<string | null>(null);

    const drawerRef = useRef<HTMLDivElement | null>(null);
    const debounceTimerRef = useRef<number | null>(null);

    // Sync selectedLayer if activeLayerId changes when drawer opens
    useEffect(() => {
        if (isOpen && activeLayerId) {
            setSelectedLayer(activeLayerId);
        }
    }, [isOpen, activeLayerId]);

    // Fetch tags from PostgreSQL
    const fetchTags = async (q: string, layer: string, cat: string) => {
        try {
            setLoading(true);
            const layerParam = layer === "all" ? undefined : layer;
            const catParam = cat === "all" ? undefined : cat;
            const res = await getBooruTagsApi(q, catParam, 50, layerParam);
            setTags(res);
        } catch (err) {
            console.error("Failed to fetch catalog tags:", err);
        } finally {
            setLoading(false);
        }
    };

    // Debounced query on search or tab change
    useEffect(() => {
        if (!isOpen) return;

        if (debounceTimerRef.current) {
            window.clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = window.setTimeout(() => {
            fetchTags(searchQuery, selectedLayer, selectedCategory);
        }, 120);

        return () => {
            if (debounceTimerRef.current) {
                window.clearTimeout(debounceTimerRef.current);
            }
        };
    }, [isOpen, searchQuery, selectedLayer, selectedCategory]);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleCopy = (tagName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(tagName);
        setCopiedTag(tagName);
        setTimeout(() => setCopiedTag(null), 1500);
    };

    return (
        <div className="booru-catalog-backdrop" onClick={onClose}>
            <div
                className="booru-catalog-drawer"
                ref={drawerRef}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="booru-catalog-header">
                    <div className="booru-catalog-header-left">
                        <div className="booru-catalog-icon-box">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.2">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        </div>
                        <div>
                            <div className="booru-catalog-title-row">
                                <h2 className="booru-catalog-title">Katalog Danbooru Database</h2>
                                <span className="booru-catalog-badge">1.250+ Tag PostgreSQL</span>
                            </div>
                            <p className="booru-catalog-subtitle">
                                Klik tag untuk langsung memasukkan ke layer prompt atau salin ke clipboard.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="booru-catalog-close-btn"
                        onClick={onClose}
                        title="Tutup Katalog (Esc)"
                    >
                        ✕
                    </button>
                </div>

                {/* Search Bar */}
                <div className="booru-catalog-search-row">
                    <div className="booru-catalog-search-wrapper">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.2">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            className="booru-catalog-search-input"
                            placeholder="Cari tag (misal: maid, frieren, breasts, dress, halo, cinematic)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                className="booru-catalog-search-clear"
                                onClick={() => setSearchQuery("")}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {/* 10 Layers Scoped Filter Tabs */}
                <div className="booru-catalog-tabs-container">
                    <button
                        type="button"
                        className={`booru-catalog-tab ${selectedLayer === "all" ? "active" : ""}`}
                        onClick={() => setSelectedLayer("all")}
                    >
                        Semua Layer
                    </button>
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            type="button"
                            className={`booru-catalog-tab ${selectedLayer === cat.id ? "active" : ""}`}
                            onClick={() => setSelectedLayer(cat.id)}
                            title={cat.title}
                        >
                            <span className="booru-tab-num">{cat.num}</span>
                            <span>{cat.id}</span>
                        </button>
                    ))}
                </div>

                {/* Category Secondary Filter (General, Character, Artist, Quality, Meta) */}
                <div className="booru-catalog-subtabs">
                    {["all", "general", "character", "artist", "quality", "meta"].map((c) => (
                        <button
                            key={c}
                            type="button"
                            className={`booru-catalog-subtab ${selectedCategory === c ? "active" : ""}`}
                            onClick={() => setSelectedCategory(c)}
                        >
                            {c === "all" ? "Semua Tipe" : c}
                        </button>
                    ))}
                    <span className="booru-catalog-count-indicator">
                        {loading ? "Memuat..." : `${tags.length} tag ditemukan`}
                    </span>
                </div>

                {/* Tag List Grid */}
                <div className="booru-catalog-body">
                    {loading ? (
                        <div className="booru-catalog-loading">
                            <div className="booru-spinner" />
                            <span>Mengambil data dari PostgreSQL database...</span>
                        </div>
                    ) : tags.length === 0 ? (
                        <div className="booru-catalog-empty">
                            <span className="booru-empty-icon">🔍</span>
                            <p>Tidak ada tag yang cocok dengan pencarian di layer ini.</p>
                            <span className="booru-empty-hint">
                                Coba ganti kata kunci atau pilih tab <strong>"Semua Layer"</strong>.
                            </span>
                        </div>
                    ) : (
                        <div className="booru-catalog-grid">
                            {tags.map((tag) => (
                                <div
                                    key={tag.id}
                                    className="booru-catalog-card"
                                    onClick={() => onInsertTag(tag.name, tag.layer || selectedLayer)}
                                    title={`Klik untuk masukkan ke prompt layer: ${tag.layer || "umum"}`}
                                >
                                    <div className="booru-card-top">
                                        <div className="booru-card-badges">
                                            <span className={`booru-cat-badge ${tag.category}`}>
                                                {tag.category}
                                            </span>
                                            {tag.layer && (
                                                <span className="booru-layer-badge">
                                                    {tag.layer}
                                                </span>
                                            )}
                                        </div>
                                        <div className="booru-card-right">
                                            <span className="booru-card-count">{tag.post_count}</span>
                                            <button
                                                type="button"
                                                className="booru-card-copy-btn"
                                                onClick={(e) => handleCopy(tag.name, e)}
                                                title="Salin tag"
                                            >
                                                {copiedTag === tag.name ? "✓" : "Copy"}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="booru-card-name-row">
                                        <span className="booru-card-name">{tag.name}</span>
                                    </div>

                                    {tag.description && (
                                        <p className="booru-card-desc">{tag.description}</p>
                                    )}

                                    <div className="booru-card-footer">
                                        <span className="booru-insert-action">
                                            + Masukkan ke Layer
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
