import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getModels, getAllImages, type Model, type ModelImage } from "../../api/models";
import { resolveImageUrl } from "../../api/client";
import "../../style/ModelComparison.css";

export default function ModelComparison() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [allModels, setAllModels] = useState<Model[]>([]);
    const [allImages, setAllImages] = useState<ModelImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [slotCount, setSlotCount] = useState<2 | 3>(2);

    // Selected model IDs for each slot
    const [slotAId, setSlotAId] = useState<number | null>(null);
    const [slotBId, setSlotBId] = useState<number | null>(null);
    const [slotCId, setSlotCId] = useState<number | null>(null);

    // Interactive feedback states
    const [copiedTrigger, setCopiedTrigger] = useState<string | null>(null);
    const [copiedPromptText, setCopiedPromptText] = useState<string | null>(null);

    // Sample Image Lightbox Modal state
    const [activeLightboxImage, setActiveLightboxImage] = useState<ModelImage | null>(null);

    // Load models and images from backend
    useEffect(() => {
        let isMounted = true;
        const loadData = async () => {
            try {
                setLoading(true);
                const [modelsRes, imagesRes] = await Promise.all([
                    getModels({ limit: 100 }),
                    getAllImages({ limit: 150 }),
                ]);

                if (!isMounted) return;

                const models = modelsRes.data || [];
                const images = imagesRes.data || [];
                setAllModels(models);
                setAllImages(images);

                // Initialize slots from query params (?m1= or ?models=)
                const m1Param = searchParams.get("m1");
                const queryIds = searchParams.get("models")?.split(",").map(Number).filter(Boolean);

                let initialSlotA: number | null = null;
                if (m1Param) {
                    const match = models.find((m) => m.slug === m1Param || String(m.id) === m1Param);
                    if (match) initialSlotA = match.id;
                } else if (queryIds && queryIds[0]) {
                    initialSlotA = queryIds[0];
                }

                if (initialSlotA) {
                    setSlotAId(initialSlotA);
                    const remaining = models.filter((m) => m.id !== initialSlotA);
                    if (queryIds && queryIds[1]) {
                        setSlotBId(queryIds[1]);
                    } else if (remaining[0]) {
                        setSlotBId(remaining[0].id);
                    }
                    if (queryIds && queryIds[2]) {
                        setSlotCId(queryIds[2]);
                        setSlotCount(3);
                    } else if (remaining[1]) {
                        setSlotCId(remaining[1].id);
                    }
                } else if (models.length >= 2) {
                    setSlotAId(models[0].id);
                    setSlotBId(models[1].id);
                    if (models.length >= 3) {
                        setSlotCId(models[2].id);
                    }
                }
            } catch (err) {
                console.error("Failed to load models for comparison:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadData();
        return () => {
            isMounted = false;
        };
    }, [searchParams]);

    // Keyboard listener to close lightbox on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && activeLightboxImage) {
                setActiveLightboxImage(null);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [activeLightboxImage]);

    const handleCopyTrigger = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedTrigger(text);
        setTimeout(() => setCopiedTrigger(null), 1800);
    };

    const handleCopyPrompt = (text: string, label: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedPromptText(label);
        setTimeout(() => setCopiedPromptText(null), 1800);
    };

    // Update query params when slots change
    const updateSlots = (a: number | null, b: number | null, c: number | null, count: 2 | 3) => {
        const ids = [a, b, count === 3 ? c : null].filter(Boolean);
        setSearchParams({ models: ids.join(",") }, { replace: true });
    };

    // Quick Slot Swap (A <-> B)
    const handleSwapSlots = () => {
        const temp = slotAId;
        setSlotAId(slotBId);
        setSlotBId(temp);
        updateSlots(slotBId, temp, slotCId, slotCount);
    };

    // Quick Comparison Presets
    const handleApplyPreset = (idA?: number, idB?: number, idC?: number) => {
        if (idA) setSlotAId(idA);
        if (idB) setSlotBId(idB);
        if (idC) {
            setSlotCId(idC);
            setSlotCount(3);
            updateSlots(idA || null, idB || null, idC, 3);
        } else {
            setSlotCount(2);
            updateSlots(idA || null, idB || null, null, 2);
        }
    };

    const modelA = useMemo(() => allModels.find((m) => m.id === slotAId), [allModels, slotAId]);
    const modelB = useMemo(() => allModels.find((m) => m.id === slotBId), [allModels, slotBId]);
    const modelC = useMemo(() => allModels.find((m) => m.id === slotCId), [allModels, slotCId]);

    const activeSlots = slotCount === 3 ? [
        { label: "Slot A (Primary)", model: modelA, setId: (id: number) => { setSlotAId(id); updateSlots(id, slotBId, slotCId, 3); } },
        { label: "Slot B (Challenger)", model: modelB, setId: (id: number) => { setSlotBId(id); updateSlots(slotAId, id, slotCId, 3); } },
        { label: "Slot C (Comparison)", model: modelC, setId: (id: number) => { setSlotCId(id); updateSlots(slotAId, slotBId, id, 3); } },
    ] : [
        { label: "Slot A (Primary)", model: modelA, setId: (id: number) => { setSlotAId(id); updateSlots(id, slotBId, slotCId, 2); } },
        { label: "Slot B (Challenger)", model: modelB, setId: (id: number) => { setSlotBId(id); updateSlots(slotAId, id, slotCId, 2); } },
    ];

    // Helper to calculate VRAM guide
    const getVRAMSpec = (m: Model) => {
        const base = (m.base_model || "").toLowerCase();
        let min = m.vram_min;
        let rec = m.vram_recommended;

        if (!min) {
            if (m.type === "lora") min = "4 GB (Shared)";
            else if (base.includes("flux")) min = "12 GB";
            else if (base.includes("1.5")) min = "4 GB";
            else min = "6 GB";
        }

        if (!rec) {
            if (m.type === "lora") rec = "6 - 8 GB";
            else if (base.includes("flux")) rec = "16 - 24 GB";
            else if (base.includes("1.5")) rec = "6 - 8 GB";
            else rec = "8 - 12 GB";
        }

        let badgeType: "budget" | "midrange" | "heavy" = "midrange";
        if (min.includes("4 GB")) badgeType = "budget";
        else if (min.includes("12 GB") || min.includes("16 GB")) badgeType = "heavy";

        return { min, rec, badgeType };
    };

    return (
        <div className="compare-container">
            {/* Header Banner */}
            <div className="compare-header">
                <div className="compare-header-top">
                    <div>
                        <h1 className="compare-title">
                            <span className="compare-title-icon">⚔️</span>
                            Model Comparison Tool
                        </h1>
                        <p className="compare-subtitle">
                            Adu spesifikasi teknis, kebutuhan VRAM, konfigurasi parameter optimal, dan sampel hasil render antar model AI secara berdampingan (<em>side-by-side</em>).
                        </p>
                    </div>

                    <Link to="/models" className="compare-back-btn">
                        ← Kembali ke Katalog Model
                    </Link>
                </div>

                {/* Slot Selector & Preset Bar */}
                <div className="compare-control-bar">
                    <div className="compare-slots-switch">
                        <span className="control-label">Jumlah Slot Adu:</span>
                        <div className="slot-toggle-group">
                            <button
                                type="button"
                                className={`slot-toggle-btn ${slotCount === 2 ? "active" : ""}`}
                                onClick={() => {
                                    setSlotCount(2);
                                    updateSlots(slotAId, slotBId, slotCId, 2);
                                }}
                            >
                                2 Model (Head-to-Head)
                            </button>
                            <button
                                type="button"
                                className={`slot-toggle-btn ${slotCount === 3 ? "active" : ""}`}
                                onClick={() => {
                                    setSlotCount(3);
                                    updateSlots(slotAId, slotBId, slotCId, 3);
                                }}
                            >
                                3 Model (Trio Showdown)
                            </button>
                        </div>
                    </div>

                    {/* Quick Swap Slots */}
                    <button
                        type="button"
                        className="compare-swap-btn"
                        onClick={handleSwapSlots}
                        title="Tukar posisi Model A dan Model B"
                    >
                        ⇄ Tukar Posisi (A ↔ B)
                    </button>

                    {/* Quick Matchup Presets */}
                    {allModels.length >= 2 && (
                        <div className="compare-presets-group">
                            <span className="control-label">Preset Adu:</span>
                            {allModels.slice(0, 3).map((m, idx, arr) => {
                                if (idx >= arr.length - 1) return null;
                                const next = arr[idx + 1];
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        className="compare-preset-chip"
                                        onClick={() => handleApplyPreset(m.id, next.id)}
                                        title={`Adu ${m.name} vs ${next.name}`}
                                    >
                                        ⚔️ {m.name.slice(0, 14)} vs {next.name.slice(0, 14)}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="compare-loading-state">
                    <div className="compare-spinner"></div>
                    <p>Memuat matriks perbandingan model...</p>
                </div>
            ) : (
                <div className={`compare-matrix-grid cols-${slotCount}`}>
                    {activeSlots.map((slot, sIdx) => {
                        const m = slot.model;
                        const vram = m ? getVRAMSpec(m) : null;

                        // Gather sample images from model object or fallback from allImages
                        const sampleImages = m
                            ? (m.images && m.images.length > 0
                                ? m.images.slice(0, 4)
                                : allImages.filter((img) => img.model_id === m.id).slice(0, 4))
                            : [];

                        const triggerWords = m?.trigger_words || [];
                        const versionItem = m?.versions?.[0];
                        const rec = versionItem?.recommended_settings as Record<string, any> | undefined;

                        const samplerVal = rec?.sampler || (m?.type === "lora" ? "Euler a / DPM++ 2M" : "Euler a");
                        const stepsVal = rec?.steps_range || (rec?.steps ? `${rec.steps}` : (m?.base_model === "Flux" ? "20 - 25" : "24 - 30"));
                        const cfgVal = rec?.cfg_scale_range || (rec?.cfg_scale !== undefined ? String(rec.cfg_scale) : (m?.base_model === "Pony" ? "5.0 - 6.5" : m?.base_model === "Flux" ? "3.5" : "6.0 - 7.0"));
                        const resVal = rec?.width && rec?.height ? `${rec.width} × ${rec.height}` : (m?.base_model === "SD 1.5" ? "512 × 768" : "832 × 1216");
                        const schedulerVal = rec?.scheduler || (m?.base_model === "Flux" ? "Simple / Normal" : "Normal / Karras");
                        const clipSkipVal = rec?.clip_skip !== undefined ? String(rec.clip_skip) : (m?.base_model === "SD 1.5" ? "1" : "2");

                        const hasHires = rec && (rec.hires_upscale || rec.hiresUpscale || rec.hires_upscaler || rec.hiresUpscaler);
                        const hiresUpscale = rec?.hires_upscale || rec?.hiresUpscale;
                        const hiresSteps = rec?.hires_steps || rec?.hiresSteps;
                        const hiresUpscaler = rec?.hires_upscaler || rec?.hiresUpscaler;
                        const denoise = rec?.denoising_strength || rec?.denoise;

                        return (
                            <div key={sIdx} className="compare-model-col">
                                {/* Model Selector Dropdown */}
                                <div className="col-selector-wrap">
                                    <div className="col-slot-header">
                                        <span className="col-slot-label">{slot.label}</span>
                                        {m && (
                                            <span className="col-model-badge">
                                                {m.type.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <select
                                        className="col-model-select"
                                        value={m?.id || ""}
                                        onChange={(e) => slot.setId(Number(e.target.value))}
                                    >
                                        <option value="" disabled>-- Pilih Model untuk Diadu --</option>
                                        {allModels.map((opt) => (
                                            <option key={opt.id} value={opt.id}>
                                                {opt.name} [{opt.base_model || opt.type}]
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {m ? (
                                    <div className="compare-card-content">
                                        {/* Hero Showcase */}
                                        <div className="compare-hero-card">
                                            <div className="compare-thumb-wrap">
                                                <img
                                                    src={resolveImageUrl(m.thumbnail_url)}
                                                    alt={m.name}
                                                    className="compare-thumb-img"
                                                />
                                                <div className="compare-thumb-badges">
                                                    <span className={`compare-pill ${m.type === "lora" ? "lora" : "ckpt"}`}>
                                                        {m.type.toUpperCase()}
                                                    </span>
                                                    <span className="compare-pill arch">
                                                        {m.base_model || "SDXL"}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="compare-hero-meta">
                                                <h2 className="compare-model-name" title={m.name}>
                                                    {m.name}
                                                </h2>
                                                <div className="compare-author-row">
                                                    <span>by <strong>{m.author}</strong></span>
                                                    <span>★ {m.rating ? m.rating.toFixed(1) : "5.0"}</span>
                                                    <span>❤️ {m.likes || 0}</span>
                                                </div>
                                                <p className="compare-short-desc">
                                                    {m.description
                                                        ? m.description.replace(/<[^>]+>/g, "").slice(0, 110) + "..."
                                                        : "Model checkpoint & weights konfigurasi pipeline generasi gambar AI."}
                                                </p>
                                            </div>
                                        </div>

                                        {/* SECTION 1: Hardware & VRAM Matrix */}
                                        <div className="compare-matrix-section">
                                            <div className="section-title-wrap">
                                                <span className="section-icon">🖥️</span>
                                                <h3 className="section-title">Hardware & Kebutuhan VRAM</h3>
                                            </div>

                                            <div className="compare-spec-table">
                                                <div className="spec-row">
                                                    <span className="spec-key">Estimasi VRAM Min</span>
                                                    <span className={`spec-val vram-badge ${vram?.badgeType}`}>
                                                        {vram?.min}
                                                    </span>
                                                </div>
                                                <div className="spec-row">
                                                    <span className="spec-key">VRAM Rekomendasi</span>
                                                    <span className="spec-val vram-rec">
                                                        {vram?.rec}
                                                    </span>
                                                </div>
                                                <div className="spec-row">
                                                    <span className="spec-key">Format Bobot</span>
                                                    <span className="spec-val mono">
                                                        {versionItem?.format || "SafeTensors"}
                                                    </span>
                                                </div>
                                                <div className="spec-row">
                                                    <span className="spec-key">Ukuran File Tensor</span>
                                                    <span className="spec-val">
                                                        {m.tensor_size || (versionItem?.file_size ? `${(versionItem.file_size / (1024 * 1024 * 1024)).toFixed(2)} GB` : (m.type === "lora" ? "~220 MB" : "~6.46 GB"))}
                                                    </span>
                                                </div>

                                                {/* Breakdown Tensor Structure */}
                                                {(m.conditioner || m.first_stage_model || m.model_tensor) ? (
                                                    <div className="tensor-breakdown-box">
                                                        <span className="breakdown-label">Breakdown Komponen Tensor:</span>
                                                        <div className="breakdown-chips">
                                                            {m.conditioner ? (
                                                                <span className="tensor-sub-chip">
                                                                    conditioner: <strong>{m.conditioner}</strong>
                                                                </span>
                                                            ) : null}
                                                            {m.first_stage_model ? (
                                                                <span className="tensor-sub-chip">
                                                                    1st_stage: <strong>{m.first_stage_model}</strong>
                                                                </span>
                                                            ) : null}
                                                            {m.model_tensor ? (
                                                                <span className="tensor-sub-chip">
                                                                    model: <strong>{m.model_tensor}</strong>
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>

                                        {/* SECTION 2: Generation Settings Matrix */}
                                        <div className="compare-matrix-section">
                                            <div className="section-title-wrap">
                                                <span className="section-icon">⚙️</span>
                                                <h3 className="section-title">Rekomendasi Parameter Generasi</h3>
                                            </div>

                                            <div className="compare-spec-table">
                                                <div className="spec-row">
                                                    <span className="spec-key">Resolusi Native</span>
                                                    <span className="spec-val highlight-res">{resVal}</span>
                                                </div>
                                                <div className="spec-row">
                                                    <span className="spec-key">Sampling Steps</span>
                                                    <span className="spec-val">{stepsVal}</span>
                                                </div>
                                                <div className="spec-row">
                                                    <span className="spec-key">Sampler Bawaan</span>
                                                    <span className="spec-val">{samplerVal}</span>
                                                </div>
                                                <div className="spec-row">
                                                    <span className="spec-key">Scheduler</span>
                                                    <span className="spec-val">{schedulerVal}</span>
                                                </div>
                                                <div className="spec-row">
                                                    <span className="spec-key">CFG Scale Optimal</span>
                                                    <span className="spec-val">{cfgVal}</span>
                                                </div>
                                                <div className="spec-row">
                                                    <span className="spec-key">Clip Skip</span>
                                                    <span className="spec-val">{clipSkipVal}</span>
                                                </div>

                                                {/* Optional Hires Fix Recommendation */}
                                                {hasHires ? (
                                                    <div className="hires-rec-box">
                                                        <span className="breakdown-label">Rekomendasi Hires Fix:</span>
                                                        <div className="hires-tags-row">
                                                            {hiresUpscale && <span className="hires-pill">Upscale: {hiresUpscale}x</span>}
                                                            {hiresSteps && <span className="hires-pill">Steps: {hiresSteps}</span>}
                                                            {hiresUpscaler && <span className="hires-pill">{hiresUpscaler}</span>}
                                                            {denoise && <span className="hires-pill">Denoise: {denoise}</span>}
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>

                                        {/* SECTION 3: Trigger Words */}
                                        <div className="compare-matrix-section">
                                            <div className="section-title-wrap">
                                                <span className="section-icon">🎯</span>
                                                <h3 className="section-title">Trigger Words ({triggerWords.length})</h3>
                                            </div>

                                            {triggerWords.length > 0 ? (
                                                <div className="compare-triggers-wrap">
                                                    <div className="compare-triggers-list">
                                                        {triggerWords.map((tw, tIdx) => {
                                                            const isCopied = copiedTrigger === tw.trigger_word;
                                                            return (
                                                                <button
                                                                    key={tIdx}
                                                                    type="button"
                                                                    className={`compare-trigger-btn ${isCopied ? "copied" : ""}`}
                                                                    onClick={() => handleCopyTrigger(tw.trigger_word)}
                                                                    title="Klik untuk salin kata pemicu ini"
                                                                >
                                                                    <span>{tw.trigger_word}</span>
                                                                    <span className="copy-icon-indicator">
                                                                        {isCopied ? "✓" : "📋"}
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    <span className="trigger-hint">Klik tag untuk menyalin langsung ke clipboard.</span>
                                                </div>
                                            ) : (
                                                <div className="empty-triggers-notice">
                                                    Model Base Checkpoint standar (tidak membutuhkan trigger words khusus).
                                                </div>
                                            )}
                                        </div>

                                        {/* SECTION 4: Comparative Sample Gallery */}
                                        <div className="compare-matrix-section">
                                            <div className="section-title-wrap">
                                                <span className="section-icon">🖼️</span>
                                                <h3 className="section-title">Galeri Sampel Generasi ({sampleImages.length})</h3>
                                            </div>

                                            {sampleImages.length > 0 ? (
                                                <div className="compare-samples-grid">
                                                    {sampleImages.map((img) => (
                                                        <div
                                                            key={img.id}
                                                            className="compare-sample-card"
                                                            onClick={() => setActiveLightboxImage(img)}
                                                            title="Klik untuk membuka prompt & parameter lengkap"
                                                        >
                                                            <div className="sample-img-container">
                                                                <img
                                                                    src={resolveImageUrl(img.image_url)}
                                                                    alt={img.caption || `${m.name} sample`}
                                                                    className="sample-thumb-item"
                                                                />
                                                                <div className="sample-hover-badge">
                                                                    <span>🔍 Inspect</span>
                                                                </div>
                                                            </div>

                                                            {/* Quick Parameter Snippet */}
                                                            <div className="sample-quick-info">
                                                                <span className="quick-info-text">
                                                                    {img.sampler || "Euler a"} · {img.steps || 28} st · CFG {img.cfg_scale || 6}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="empty-samples-notice">
                                                    Belum ada sampel gambar terunggah untuk model ini.
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Buttons Footer */}
                                        <div className="compare-footer-actions">
                                            <Link
                                                to={`/models?model=${m.slug || m.id}`}
                                                className="btn-inspect-full"
                                                title={`Buka halaman detail lengkap untuk ${m.name}`}
                                            >
                                                Lihat Halaman Model Lengkap ➔
                                            </Link>
                                            {versionItem?.download_url && (
                                                <a
                                                    href={versionItem.download_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn-download-direct"
                                                    title="Unduh bobot model langsung"
                                                >
                                                    Unduh Model 📥
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="empty-slot-placeholder">
                                        <div className="placeholder-icon">⚔️</div>
                                        <h4>Slot Kosong</h4>
                                        <p>Silakan pilih model dari menu dropdown di atas untuk memulai perbandingan.</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ===== In-Page Sample Lightbox Modal ===== */}
            {activeLightboxImage && (
                <div className="compare-lightbox-overlay" onClick={() => setActiveLightboxImage(null)}>
                    <div className="compare-lightbox-content" onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            className="compare-lightbox-close"
                            onClick={() => setActiveLightboxImage(null)}
                            title="Tutup (Esc)"
                        >
                            ✕
                        </button>

                        <div className="lightbox-body-grid">
                            {/* Left: Full Media Preview */}
                            <div className="lightbox-preview-col">
                                <img
                                    src={resolveImageUrl(activeLightboxImage.image_url)}
                                    alt={activeLightboxImage.caption || "Comparison Sample"}
                                    className="lightbox-full-img"
                                />
                                {activeLightboxImage.caption && (
                                    <div className="lightbox-caption-bar">
                                        {activeLightboxImage.caption}
                                    </div>
                                )}
                            </div>

                            {/* Right: Prompt & Metadata Parameters */}
                            <div className="lightbox-meta-col">
                                <h3 className="lightbox-heading">Detail Generasi Sampel</h3>

                                {/* Positive Prompt */}
                                <div className="lightbox-section-item">
                                    <div className="prompt-header-row">
                                        <span className="prompt-label">✦ Positive Prompt</span>
                                        {activeLightboxImage.positive_prompt && (
                                            <button
                                                type="button"
                                                className="lightbox-copy-btn"
                                                onClick={() => handleCopyPrompt(activeLightboxImage.positive_prompt || "", "Prompt")}
                                            >
                                                {copiedPromptText === "Prompt" ? "✓ Copied!" : "📋 Copy"}
                                            </button>
                                        )}
                                    </div>
                                    <div className="lightbox-prompt-box">
                                        {activeLightboxImage.positive_prompt || "Tidak ada metadata prompt positif."}
                                    </div>
                                </div>

                                {/* Negative Prompt */}
                                {activeLightboxImage.negative_prompt && (
                                    <div className="lightbox-section-item">
                                        <div className="prompt-header-row">
                                            <span className="prompt-label neg">✧ Negative Prompt</span>
                                            <button
                                                type="button"
                                                className="lightbox-copy-btn"
                                                onClick={() => handleCopyPrompt(activeLightboxImage.negative_prompt || "", "Negative")}
                                            >
                                                {copiedPromptText === "Negative" ? "✓ Copied!" : "📋 Copy"}
                                            </button>
                                        </div>
                                        <div className="lightbox-prompt-box negative">
                                            {activeLightboxImage.negative_prompt}
                                        </div>
                                    </div>
                                )}

                                {/* Generation Settings Grid */}
                                <div className="lightbox-section-item">
                                    <span className="prompt-label">⚙️ Parameter Pengaturan</span>
                                    <div className="lightbox-params-grid">
                                        <div className="param-item">
                                            <span className="param-label">Sampler</span>
                                            <span className="param-value">{activeLightboxImage.sampler || "Euler a"}</span>
                                        </div>
                                        <div className="param-item">
                                            <span className="param-label">Steps</span>
                                            <span className="param-value">{activeLightboxImage.steps || 28}</span>
                                        </div>
                                        <div className="param-item">
                                            <span className="param-label">CFG Scale</span>
                                            <span className="param-value">{activeLightboxImage.cfg_scale || 6}</span>
                                        </div>
                                        <div className="param-item">
                                            <span className="param-label">Scheduler</span>
                                            <span className="param-value">{activeLightboxImage.scheduler || "Normal"}</span>
                                        </div>
                                        <div className="param-item">
                                            <span className="param-label">Seed</span>
                                            <span className="param-value mono">{activeLightboxImage.seed || "—"}</span>
                                        </div>
                                        <div className="param-item">
                                            <span className="param-label">Resolusi</span>
                                            <span className="param-value">
                                                {activeLightboxImage.width && activeLightboxImage.height
                                                    ? `${activeLightboxImage.width} × ${activeLightboxImage.height}`
                                                    : "—"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Attached Resources (LoRA, etc.) */}
                                {activeLightboxImage.resources && activeLightboxImage.resources.length > 0 && (
                                    <div className="lightbox-section-item">
                                        <span className="prompt-label">🔗 Resources Terkait</span>
                                        <div className="lightbox-res-list">
                                            {activeLightboxImage.resources.map((r, i) => (
                                                <div key={i} className="lightbox-res-pill">
                                                    <span className="res-type">{r.type.toUpperCase()}</span>
                                                    <span className="res-name">{r.name}</span>
                                                    {r.weight !== undefined && (
                                                        <span className="res-wt">({r.weight})</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Link to Gallery page */}
                                <div className="lightbox-footer-link">
                                    <Link
                                        to={`/gallery?image=${activeLightboxImage.id}`}
                                        className="btn-open-gallery"
                                    >
                                        Buka di Galeri Publik ↗
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
