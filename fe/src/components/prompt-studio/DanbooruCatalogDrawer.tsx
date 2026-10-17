import React, { useState, useEffect, useRef } from "react";
import {
    type BooruTag,
    type BooruTagStats,
    getBooruTagsPaginatedApi,
    getBooruTagStatsApi,
    createBooruTagApi,
} from "../../api/models";
import { CATEGORIES } from "./PromptCategoriesData";
import { isDanbooruAdultTag } from "../../data/booruTags";
import "../../style/BooruAutocomplete.css";

interface DanbooruCatalogDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onInsertTag: (tag: string, targetLayer?: string) => void;
    activeLayerId?: string;
    showToast?: (msg: string) => void;
    isNsfwEnabled?: boolean;
    onToggleNsfw?: (enabled: boolean) => void;
    initialCategory?: string;
}

export const DanbooruCatalogDrawer: React.FC<DanbooruCatalogDrawerProps> = ({
    isOpen,
    onClose,
    onInsertTag,
    activeLayerId,
    showToast,
    isNsfwEnabled: propIsNsfw,
    onToggleNsfw,
    initialCategory,
}) => {
    // Search, Filters & Sorting
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [selectedLayer, setSelectedLayer] = useState<string>(activeLayerId || "all");
    const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || "all");
    const [sortBy, setSortBy] = useState<string>("popularity");
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(30);

    // Data State
    const [tags, setTags] = useState<BooruTag[]>([]);
    const [totalTags, setTotalTags] = useState<number>(0);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(false);
    const [stats, setStats] = useState<BooruTagStats | null>(null);

    // Interactive States
    const [copiedTag, setCopiedTag] = useState<string | null>(null);
    const [isNsfwEnabled, setIsNsfwEnabled] = useState<boolean>(
        () => (propIsNsfw !== undefined ? propIsNsfw : localStorage.getItem("modular_studio_nsfw_enabled") === "true")
    );

    useEffect(() => {
        if (propIsNsfw !== undefined) {
            setIsNsfwEnabled(propIsNsfw);
        }
    }, [propIsNsfw]);

    // Add Tag Modal
    const [showAddTagModal, setShowAddTagModal] = useState<boolean>(false);
    const [newTagName, setNewTagName] = useState<string>("");
    const [newTagLayer, setNewTagLayer] = useState<string>("proportions");
    const [newTagCategory, setNewTagCategory] = useState<string>("general");
    const [newTagCount, setNewTagCount] = useState<string>("100k");
    const [newTagDesc, setNewTagDesc] = useState<string>("");
    const [isSavingNewTag, setIsSavingNewTag] = useState<boolean>(false);

    const drawerRef = useRef<HTMLDivElement | null>(null);
    const debounceTimerRef = useRef<number | null>(null);

    // Sync selectedLayer & selectedCategory when drawer opens
    useEffect(() => {
        if (isOpen) {
            if (activeLayerId) setSelectedLayer(activeLayerId);
            if (initialCategory) setSelectedCategory(initialCategory);
            setCurrentPage(1);
        }
    }, [isOpen, activeLayerId, initialCategory]);

    // Fetch Stats
    const fetchStats = async () => {
        try {
            const data = await getBooruTagStatsApi();
            setStats(data);
        } catch (err) {
            console.error("Gagal memuat statistik Danbooru:", err);
        }
    };

    // Fetch Paginated Tags from PostgreSQL
    const fetchPaginatedTags = async () => {
        try {
            setLoading(true);
            const res = await getBooruTagsPaginatedApi({
                q: searchQuery.trim(),
                category: selectedCategory,
                layer: selectedLayer,
                sort: sortBy,
                page: currentPage,
                limit: pageSize,
            });

            setTags(res.tags || []);
            setTotalTags(res.total || 0);
            setTotalPages(res.total_pages || 1);
        } catch (err) {
            console.error("Gagal mengambil katalog tag:", err);
            if (showToast) showToast("Gagal mengambil data dari database Danbooru.");
        } finally {
            setLoading(false);
        }
    };

    // Load stats once when drawer opens
    useEffect(() => {
        if (isOpen) {
            fetchStats();
        }
    }, [isOpen]);

    // Debounced query on search, tab, or sort changes
    useEffect(() => {
        if (!isOpen) return;

        if (debounceTimerRef.current) {
            window.clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = window.setTimeout(() => {
            fetchPaginatedTags();
        }, 120);

        return () => {
            if (debounceTimerRef.current) {
                window.clearTimeout(debounceTimerRef.current);
            }
        };
    }, [isOpen, searchQuery, selectedLayer, selectedCategory, sortBy, currentPage, pageSize]);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen && !showAddTagModal) {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose, showAddTagModal]);

    if (!isOpen) return null;

    const handleCopy = (tagName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(tagName);
        setCopiedTag(tagName);
        if (showToast) showToast(`Tag "${tagName}" disalin ke clipboard!`);
        setTimeout(() => setCopiedTag(null), 1500);
    };

    const handleSaveNewTag = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanName = newTagName.trim();
        if (!cleanName) return;

        try {
            setIsSavingNewTag(true);
            const created = await createBooruTagApi({
                name: cleanName,
                layer: newTagLayer,
                category: newTagCategory,
                post_count: newTagCount.trim() || "Custom",
                count_num: 50000,
                description: newTagDesc.trim() || "Tag kustom tersimpan di PostgreSQL",
            });

            if (showToast) showToast(`Tag "${created.name}" berhasil ditambahkan ke database!`);
            setShowAddTagModal(false);
            setNewTagName("");
            setNewTagDesc("");
            fetchStats();
            fetchPaginatedTags();
        } catch (err: any) {
            if (showToast) showToast(`Gagal menyimpan tag: ${err?.message || "Error"}`);
        } finally {
            setIsSavingNewTag(false);
        }
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
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.2">
                                <ellipse cx="12" cy="5" rx="9" ry="3" />
                                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                            </svg>
                        </div>
                        <div>
                            <div className="booru-catalog-title-row">
                                <h2 className="booru-catalog-title">Katalog Danbooru Database</h2>
                                <span className="booru-catalog-badge">
                                    {stats ? `${stats.total_tags.toLocaleString("id-ID")} Tag PostgreSQL` : "1.350+ Tag"}
                                </span>
                            </div>
                            <p className="booru-catalog-subtitle">
                                Database resmi Danbooru tersinkronisasi 10 layer modular (skalabilitas hingga 1.000.000 tag).
                            </p>
                        </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <button
                            type="button"
                            className="aps-add-chip-trigger"
                            style={{ borderColor: "#2563eb", color: "#60a5fa", padding: "6px 10px", fontSize: "11px", fontWeight: 600 }}
                            onClick={() => setShowAddTagModal(true)}
                            title="Tambah tag baru langsung ke database PostgreSQL"
                        >
                            <span>+ Tambah Tag ke DB</span>
                        </button>
                        <button
                            type="button"
                            className="booru-catalog-close-btn"
                            onClick={onClose}
                            title="Tutup Katalog (Esc)"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Search Bar & Controls */}
                <div className="booru-catalog-search-row">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <div className="booru-catalog-search-wrapper" style={{ flex: 1, minWidth: "220px" }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.2">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                type="text"
                                className="booru-catalog-search-input"
                                placeholder="Cari tag Danbooru (misal: 1girl, breasts, nude, cowgirl, frieren, missionary, cum)..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                                autoFocus
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    className="booru-catalog-search-clear"
                                    onClick={() => {
                                        setSearchQuery("");
                                        setCurrentPage(1);
                                    }}
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* NSFW Toggle Pill */}
                        <label
                            className={`aps-nsfw-toggle-pill ${isNsfwEnabled ? "active" : ""}`}
                            style={{ padding: "6px 10px", fontSize: "11px" }}
                            title="Tampilkan tag dewasa / 18+ pada katalog Danbooru"
                        >
                            <input
                                type="checkbox"
                                checked={isNsfwEnabled}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    setIsNsfwEnabled(checked);
                                    localStorage.setItem("modular_studio_nsfw_enabled", String(checked));
                                    if (onToggleNsfw) onToggleNsfw(checked);
                                    if (showToast) {
                                        showToast(
                                            checked
                                                ? "🔞 Mode NSFW aktif: Tag dewasa ditampilkan di katalog!"
                                                : "Mode SFW: Tag dewasa disembunyikan."
                                        );
                                    }
                                }}
                                className="aps-nsfw-toggle-checkbox"
                            />
                            <span>🔞 Mode NSFW (18+)</span>
                        </label>

                        {/* Sort Selector */}
                        <select
                            className="aps-catalog-select"
                            style={{ padding: "6px 10px", fontSize: "11px" }}
                            value={sortBy}
                            onChange={(e) => {
                                setSortBy(e.target.value);
                                setCurrentPage(1);
                            }}
                            title="Urutkan hasil"
                        >
                            <option value="popularity">Popularitas (Post Count ↓)</option>
                            <option value="name_asc">Nama (A — Z)</option>
                            <option value="name_desc">Nama (Z — A)</option>
                            <option value="count_asc">Popularitas Niche (Post Count ↑)</option>
                        </select>

                        {/* Page Size Selector */}
                        <select
                            className="aps-catalog-select"
                            style={{ padding: "6px 8px", fontSize: "11px" }}
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(parseInt(e.target.value, 10));
                                setCurrentPage(1);
                            }}
                            title="Jumlah tag per halaman"
                        >
                            <option value={30}>30 / hal</option>
                            <option value={60}>60 / hal</option>
                            <option value={90}>90 / hal</option>
                        </select>
                    </div>
                </div>

                {/* 10 Modular Layers Scoped Filter Tabs */}
                <div className="booru-catalog-tabs-container">
                    <button
                        type="button"
                        className={`booru-catalog-tab ${selectedLayer === "all" ? "active" : ""}`}
                        onClick={() => {
                            setSelectedLayer("all");
                            setCurrentPage(1);
                        }}
                    >
                        <span>Semua Layer</span>
                        {stats && <span className="booru-tab-num">{stats.total_tags}</span>}
                    </button>
                    {CATEGORIES.map((cat) => {
                        const countInLayer = stats?.layers?.[cat.id] || 0;
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                className={`booru-catalog-tab ${selectedLayer === cat.id ? "active" : ""}`}
                                onClick={() => {
                                    setSelectedLayer(cat.id);
                                    setCurrentPage(1);
                                }}
                                title={cat.title}
                            >
                                <span className="booru-tab-num">{cat.num}</span>
                                <span>{cat.title.split("(")[0].trim()}</span>
                                {countInLayer > 0 && (
                                    <span className="booru-tab-num">{countInLayer}</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Category Secondary Filter (General, Character, Artist, Quality, Meta) */}
                <div className="booru-catalog-subtabs">
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        {[
                            { id: "all", label: "Semua Tipe" },
                            { id: "general", label: "General" },
                            { id: "character", label: "Character" },
                            { id: "artist", label: "Artist" },
                            { id: "quality", label: "Quality" },
                            { id: "meta", label: "Meta" },
                        ].map((c) => (
                            <button
                                key={c.id}
                                type="button"
                                className={`booru-catalog-subtab ${selectedCategory === c.id ? "active" : ""}`}
                                onClick={() => {
                                    setSelectedCategory(c.id);
                                    setCurrentPage(1);
                                }}
                            >
                                <span>{c.label}</span>
                                {stats?.categories?.[c.id] && (
                                    <span style={{ fontSize: "9px", color: "#94a3b8", marginLeft: "4px" }}>
                                        {stats.categories[c.id]}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    <span className="booru-catalog-count-indicator">
                        {loading
                            ? "Memuat..."
                            : `Total ${totalTags.toLocaleString("id-ID")} tag (Hal ${currentPage}/${totalPages})`}
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
                    ) : (() => {
                        const displayedTags = isNsfwEnabled
                            ? tags
                            : tags.filter((t) => !isDanbooruAdultTag(t.name, t.category));

                        if (displayedTags.length === 0) {
                            return (
                                <div className="booru-catalog-empty">
                                    <span className="booru-empty-icon">🛡️</span>
                                    <p>Tidak ada tag yang cocok (Mode SFW aktif — tag dewasa disembunyikan).</p>
                                    <span className="booru-empty-hint">
                                        Aktifkan <strong>🔞 Mode NSFW (18+)</strong> untuk melihat tag dewasa di kategori ini.
                                    </span>
                                </div>
                            );
                        }

                        return (
                            <div className="booru-catalog-grid">
                                {displayedTags.map((tag) => {
                                    const isAdult = isDanbooruAdultTag(tag.name, tag.category);
                                    return (
                                        <div
                                            key={tag.id}
                                            className={`booru-catalog-card ${isAdult ? "is-nsfw-tag" : ""}`}
                                            onClick={() => onInsertTag(tag.name, tag.layer || (selectedLayer !== "all" ? selectedLayer : undefined))}
                                            title={`Klik untuk langsung memasukkan "${tag.name}" ke layer: ${tag.layer || "umum"}`}
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
                                                    {isAdult && (
                                                        <span className="booru-nsfw-pill">🔞 18+</span>
                                                    )}
                                                </div>
                                                <div className="booru-card-right">
                                                    <span className="booru-card-count" title="Post Count Danbooru">
                                                        {tag.post_count}
                                                    </span>
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
                                                <span
                                                    className="booru-card-name"
                                                    style={isAdult ? { color: "#fde68a" } : {}}
                                                >
                                                    {tag.name}
                                                </span>
                                            </div>

                                            {tag.description && (
                                                <p className="booru-card-desc">{tag.description}</p>
                                            )}

                                            <div className="booru-card-footer">
                                                <span className="booru-insert-action">
                                                    + Masukkan ke Modul [{tag.layer || "umum"}]
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}
                </div>

                {/* Pagination Footer Bar */}
                {!loading && totalPages > 1 && (
                    <div className="aps-catalog-pagination-bar" style={{ margin: "0", borderRadius: "0", borderLeft: "none", borderRight: "none", borderBottom: "none" }}>
                        <button
                            type="button"
                            className="aps-page-btn"
                            disabled={currentPage <= 1}
                            onClick={() => setCurrentPage(1)}
                            title="Halaman Pertama"
                        >
                            « Pertama
                        </button>
                        <button
                            type="button"
                            className="aps-page-btn"
                            disabled={currentPage <= 1}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            title="Halaman Sebelumnya"
                        >
                            ‹ Sebelumnya
                        </button>

                        <div className="aps-page-indicator">
                            <span>
                                Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>
                            </span>
                        </div>

                        <button
                            type="button"
                            className="aps-page-btn"
                            disabled={currentPage >= totalPages}
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            title="Halaman Berikutnya"
                        >
                            Berikutnya ›
                        </button>
                        <button
                            type="button"
                            className="aps-page-btn"
                            disabled={currentPage >= totalPages}
                            onClick={() => setCurrentPage(totalPages)}
                            title="Halaman Terakhir"
                        >
                            Terakhir »
                        </button>
                    </div>
                )}
            </div>

            {/* Modal: Tambah Tag Baru ke Database PostgreSQL */}
            {showAddTagModal && (
                <div
                    className="booru-catalog-backdrop"
                    style={{ zIndex: 10050 }}
                    onClick={() => setShowAddTagModal(false)}
                >
                    <div
                        className="aps-add-tag-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="aps-add-tag-modal-header">
                            <div>
                                <h3 className="aps-add-tag-modal-title">
                                    Tambah Tag Baru ke Database PostgreSQL
                                </h3>
                                <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0" }}>
                                    Tag otomatis tersimpan permanen di database Danbooru PostgreSQL.
                                </p>
                            </div>
                            <button
                                type="button"
                                className="booru-catalog-close-btn"
                                onClick={() => setShowAddTagModal(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveNewTag} className="aps-add-tag-form">
                            <div className="aps-form-group">
                                <label className="aps-form-label">Nama Tag Danbooru (wajib):</label>
                                <input
                                    type="text"
                                    className="aps-form-input"
                                    placeholder="misal: glowing_runes, cat_ears, missionary..."
                                    value={newTagName}
                                    onChange={(e) => setNewTagName(e.target.value)}
                                    required
                                    autoFocus
                                />
                                <span className="aps-form-hint">Gunakan huruf kecil dan garis bawah (underscore).</span>
                            </div>

                            <div className="aps-form-row-2">
                                <div className="aps-form-group">
                                    <label className="aps-form-label">Target Layer (10 Modul):</label>
                                    <select
                                        className="aps-form-select"
                                        value={newTagLayer}
                                        onChange={(e) => setNewTagLayer(e.target.value)}
                                    >
                                        {CATEGORIES.map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.num}. {cat.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="aps-form-group">
                                    <label className="aps-form-label">Kategori Tipe:</label>
                                    <select
                                        className="aps-form-select"
                                        value={newTagCategory}
                                        onChange={(e) => setNewTagCategory(e.target.value)}
                                    >
                                        <option value="general">General</option>
                                        <option value="character">Character</option>
                                        <option value="artist">Artist</option>
                                        <option value="quality">Quality</option>
                                        <option value="meta">Meta</option>
                                    </select>
                                </div>
                            </div>

                            <div className="aps-form-row-2">
                                <div className="aps-form-group">
                                    <label className="aps-form-label">Estimasi Post Count:</label>
                                    <input
                                        type="text"
                                        className="aps-form-input"
                                        placeholder="misal: 450k, 1.2M, 50k"
                                        value={newTagCount}
                                        onChange={(e) => setNewTagCount(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="aps-form-group">
                                <label className="aps-form-label">Deskripsi / Penjelasan (Bahasa Indonesia):</label>
                                <textarea
                                    className="aps-form-textarea"
                                    placeholder="Penjelasan fungsi atau visual tag ini..."
                                    value={newTagDesc}
                                    onChange={(e) => setNewTagDesc(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            <div className="aps-add-tag-modal-footer">
                                <button
                                    type="submit"
                                    className="aps-apply-btn primary"
                                    disabled={isSavingNewTag || !newTagName.trim()}
                                >
                                    {isSavingNewTag ? "Menyimpan ke DB..." : "Simpan ke Database PostgreSQL"}
                                </button>
                                <button
                                    type="button"
                                    className="aps-apply-btn"
                                    onClick={() => setShowAddTagModal(false)}
                                    disabled={isSavingNewTag}
                                >
                                    Batal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
