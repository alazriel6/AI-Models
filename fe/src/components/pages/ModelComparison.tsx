import { useState, useEffect, useMemo, type SVGProps } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getModels, getAllImages, type Model, type ModelImage } from "../../api/models";
import { resolveImageUrl } from "../../api/client";
import "../../style/ModelComparison.css";

/* ==========================================================================
   Minimalist SVG Icons (Lucide Outline Style, 13px - 16px)
   Strictly zero emoji.
   ========================================================================== */
function IconCompare(props: SVGProps<SVGSVGElement>) {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
    );
}

function IconArrowLeft(props: SVGProps<SVGSVGElement>) {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
        </svg>
    );
}

function IconSwap(props: SVGProps<SVGSVGElement>) {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M8 3 4 7l4 4" />
            <path d="M4 7h16" />
            <path d="m16 21 4-4-4-4" />
            <path d="M20 17H4" />
        </svg>
    );
}

function IconCheck(props: SVGProps<SVGSVGElement>) {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

function IconCopy(props: SVGProps<SVGSVGElement>) {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
    );
}

function IconExternal(props: SVGProps<SVGSVGElement>) {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
    );
}

function IconDownload(props: SVGProps<SVGSVGElement>) {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
    );
}

function IconZoom(props: SVGProps<SVGSVGElement>) {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
    );
}

function IconX(props: SVGProps<SVGSVGElement>) {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

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

    // Toggle for highlighting differences (default: true)
    const [highlightDiff, setHighlightDiff] = useState<boolean>(true);

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
                console.error("Gagal memuat data model untuk komparasi:", err);
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

    const activeSlots = useMemo(() => {
        return slotCount === 3
            ? [
                  { slotKey: "A", label: "Slot A (Utama)", model: modelA, setId: (id: number) => { setSlotAId(id); updateSlots(id, slotBId, slotCId, 3); } },
                  { slotKey: "B", label: "Slot B (Pembanding)", model: modelB, setId: (id: number) => { setSlotBId(id); updateSlots(slotAId, id, slotCId, 3); } },
                  { slotKey: "C", label: "Slot C (Alternatif)", model: modelC, setId: (id: number) => { setSlotCId(id); updateSlots(slotAId, slotBId, id, 3); } },
              ]
            : [
                  { slotKey: "A", label: "Slot A (Utama)", model: modelA, setId: (id: number) => { setSlotAId(id); updateSlots(id, slotBId, slotCId, 2); } },
                  { slotKey: "B", label: "Slot B (Pembanding)", model: modelB, setId: (id: number) => { setSlotBId(id); updateSlots(slotAId, id, slotCId, 2); } },
              ];
    }, [slotCount, modelA, modelB, modelC, slotAId, slotBId, slotCId]);

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

    // Extract structured specs for a given model
    const extractModelSpecs = (m?: Model) => {
        if (!m) return null;
        const vram = getVRAMSpec(m);
        const versionItem = m.versions?.[0];
        const rec = versionItem?.recommended_settings as Record<string, any> | undefined;

        const format = versionItem?.format || "SafeTensors";
        const size = m.tensor_size || (versionItem?.file_size ? `${(versionItem.file_size / (1024 * 1024 * 1024)).toFixed(2)} GB` : (m.type === "lora" ? "~220 MB" : "~6.46 GB"));
        const formatAndSize = `${format} • ${size}`;

        const resVal = rec?.width && rec?.height ? `${rec.width} × ${rec.height}` : (m.base_model === "SD 1.5" ? "512 × 768" : "832 × 1216");
        const stepsVal = rec?.steps_range || (rec?.steps ? `${rec.steps}` : (m.base_model === "Flux" ? "20 - 25" : "24 - 30"));
        const samplerVal = rec?.sampler || (m.type === "lora" ? "Euler a / DPM++ 2M" : "Euler a");
        const schedulerVal = rec?.scheduler || (m.base_model === "Flux" ? "Simple / Normal" : "Normal / Karras");
        const cfgVal = rec?.cfg_scale_range || (rec?.cfg_scale !== undefined ? String(rec.cfg_scale) : (m.base_model === "Pony" ? "5.0 - 6.5" : m.base_model === "Flux" ? "3.5" : "6.0 - 7.0"));
        const clipSkipVal = rec?.clip_skip !== undefined ? String(rec.clip_skip) : (m.base_model === "SD 1.5" ? "1" : "2");

        const hasHires = Boolean(rec && (rec.hires_upscale || rec.hiresUpscale || rec.hires_upscaler || rec.hiresUpscaler));
        const hiresUpscaler = rec?.hires_upscaler || rec?.hiresUpscaler || (hasHires ? "R-ESRGAN 4x+ Anime6B" : "—");
        const hiresScale = rec?.hires_upscale || rec?.hiresUpscale ? `${rec?.hires_upscale || rec?.hiresUpscale}x` : (hasHires ? "1.5x" : "—");
        const hiresSteps = rec?.hires_steps || rec?.hiresSteps ? `${rec?.hires_steps || rec?.hiresSteps}` : (hasHires ? "15 - 20" : "—");
        const denoise = rec?.denoising_strength || rec?.denoise ? `${rec?.denoising_strength || rec?.denoise}` : (hasHires ? "0.35 - 0.5" : "—");

        const triggerWords = m.trigger_words || [];

        // Sample images
        const sampleImages = m.images && m.images.length > 0
            ? m.images.slice(0, 4)
            : allImages.filter((img) => img.model_id === m.id).slice(0, 4);

        return {
            arch: m.base_model || "SDXL",
            vramMin: vram.min,
            vramRec: vram.rec,
            vramBadge: vram.badgeType,
            formatAndSize,
            resVal,
            stepsVal,
            samplerVal,
            schedulerVal,
            cfgVal,
            clipSkipVal,
            hasHires,
            hiresUpscaler,
            hiresScale,
            hiresSteps,
            denoise,
            triggerWords,
            sampleImages,
            conditioner: m.conditioner,
            firstStage: m.first_stage_model,
            modelTensor: m.model_tensor,
            downloadUrl: versionItem?.download_url,
        };
    };

    const specsA = useMemo(() => extractModelSpecs(modelA), [modelA, allImages]);
    const specsB = useMemo(() => extractModelSpecs(modelB), [modelB, allImages]);
    const specsC = useMemo(() => extractModelSpecs(modelC), [modelC, allImages]);

    const activeSpecs = useMemo(() => {
        return slotCount === 3 ? [specsA, specsB, specsC] : [specsA, specsB];
    }, [slotCount, specsA, specsB, specsC]);

    // Difference checker for a given row of values
    const checkDifference = (values: (string | number | undefined | null)[]) => {
        const validValues = values.filter((v) => v !== undefined && v !== null);
        if (validValues.length < 2) return false;
        const first = String(validValues[0]).trim().toLowerCase();
        return validValues.some((v) => String(v).trim().toLowerCase() !== first);
    };

    // Auto-collapse checks
    const hasAnyTriggerWords = useMemo(() => {
        return activeSpecs.some((s) => s && s.triggerWords.length > 0);
    }, [activeSpecs]);

    const hasAnyHiresConfig = useMemo(() => {
        return activeSpecs.some((s) => s && s.hasHires);
    }, [activeSpecs]);

    const hasAnyTensorBreakdown = useMemo(() => {
        return activeSpecs.some((s) => s && (s.conditioner || s.firstStage || s.modelTensor));
    }, [activeSpecs]);

    // Row difference flags
    const diffArch = checkDifference(activeSpecs.map((s) => s?.arch));
    const diffVramMin = checkDifference(activeSpecs.map((s) => s?.vramMin));
    const diffVramRec = checkDifference(activeSpecs.map((s) => s?.vramRec));
    const diffFormatSize = checkDifference(activeSpecs.map((s) => s?.formatAndSize));
    const diffRes = checkDifference(activeSpecs.map((s) => s?.resVal));
    const diffSteps = checkDifference(activeSpecs.map((s) => s?.stepsVal));
    const diffSampler = checkDifference(activeSpecs.map((s) => s?.samplerVal));
    const diffScheduler = checkDifference(activeSpecs.map((s) => s?.schedulerVal));
    const diffCfg = checkDifference(activeSpecs.map((s) => s?.cfgVal));
    const diffClipSkip = checkDifference(activeSpecs.map((s) => s?.clipSkipVal));
    const diffHiresUpscaler = checkDifference(activeSpecs.map((s) => s?.hiresUpscaler));
    const diffHiresScale = checkDifference(activeSpecs.map((s) => s?.hiresScale));
    const diffHiresSteps = checkDifference(activeSpecs.map((s) => s?.hiresSteps));
    const diffDenoise = checkDifference(activeSpecs.map((s) => s?.denoise));

    const getRowClass = (isDiff: boolean) => {
        if (!highlightDiff) return "";
        return isDiff ? "is-diff" : "is-same";
    };

    return (
        <div className="compare-page-wrapper">
            {/* Top Bar Header */}
            <div className="compare-header-row">
                <div className="compare-title-wrap">
                    <span className="compare-title-icon-box">
                        <IconCompare />
                    </span>
                    <h1 className="compare-main-title">Komparasi Model</h1>
                </div>

                <Link to="/models" className="compare-back-link">
                    <IconArrowLeft />
                    <span>Kembali ke Katalog</span>
                </Link>
            </div>

            {/* Control Toolbar */}
            <div className="compare-toolbar">
                {/* Left: 2/3 Model Switch & Highlight Toggle */}
                <div className="toolbar-group-left">
                    <div className="segmented-control">
                        <button
                            type="button"
                            className={`segmented-btn ${slotCount === 2 ? "active" : ""}`}
                            onClick={() => {
                                setSlotCount(2);
                                updateSlots(slotAId, slotBId, slotCId, 2);
                            }}
                        >
                            2 Model
                        </button>
                        <button
                            type="button"
                            className={`segmented-btn ${slotCount === 3 ? "active" : ""}`}
                            onClick={() => {
                                setSlotCount(3);
                                updateSlots(slotAId, slotBId, slotCId, 3);
                            }}
                        >
                            3 Model
                        </button>
                    </div>

                    {/* Toggle Highlight Differences */}
                    <label className="diff-toggle-label" onClick={() => setHighlightDiff(!highlightDiff)}>
                        <div className={`diff-switch-track ${highlightDiff ? "active" : ""}`}>
                            <div className="diff-switch-thumb" />
                        </div>
                        <span>Sorot Perbedaan</span>
                    </label>
                </div>

                {/* Center: Quick Swap */}
                <div className="toolbar-group-center">
                    <button
                        type="button"
                        className="btn-swap-slots"
                        onClick={handleSwapSlots}
                        title="Tukar posisi Model A dan Model B"
                    >
                        <IconSwap />
                        <span>Tukar Posisi (A ⇄ B)</span>
                    </button>
                </div>

                {/* Right: Presets Dropdown */}
                {allModels.length >= 2 && (
                    <div className="toolbar-group-right">
                        <span className="toolbar-label-hint">Preset Komparasi:</span>
                        <select
                            className="preset-select-dropdown"
                            defaultValue=""
                            onChange={(e) => {
                                const val = e.target.value;
                                if (!val) return;
                                const [a, b, c] = val.split(",").map(Number);
                                handleApplyPreset(a, b, c);
                                e.target.value = "";
                            }}
                        >
                            <option value="" disabled>
                                Pilih Preset Komparasi...
                            </option>
                            {allModels.slice(0, 5).map((m, idx, arr) => {
                                if (idx >= arr.length - 1) return null;
                                const next = arr[idx + 1];
                                return (
                                    <option key={m.id} value={`${m.id},${next.id}`}>
                                        {m.name} vs {next.name}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="compare-loading-wrapper">
                    <div className="compare-loading-spinner" />
                    <span>Memuat matriks perbandingan model...</span>
                </div>
            ) : (
                <div className="matrix-scroll-container">
                    <div className="unified-matrix-table">
                        {/* ==========================================================================
                            Sticky Model Selector & Compact Identity Header
                           ========================================================================== */}
                        <div className={`matrix-grid-row matrix-sticky-header cols-${slotCount}`}>
                            <div className="header-label-cell">
                                <span className="header-category-caption">Matriks Parameter</span>
                                <span className="header-active-count">{slotCount} Model Terpilih</span>
                            </div>

                            {activeSlots.map((slot, sIdx) => {
                                const m = slot.model;
                                const versionItem = m?.versions?.[0];
                                return (
                                    <div key={sIdx} className="header-model-cell">
                                        {/* Dropdown Selector */}
                                        <div className="slot-select-row">
                                            <span className="slot-tag">{slot.label.split(" ")[0]} {slot.slotKey}</span>
                                            <select
                                                className="header-model-dropdown"
                                                value={m?.id || ""}
                                                onChange={(e) => slot.setId(Number(e.target.value))}
                                            >
                                                <option value="" disabled>
                                                    Pilih Model...
                                                </option>
                                                {allModels.map((opt) => (
                                                    <option key={opt.id} value={opt.id}>
                                                        {opt.name} ({opt.base_model || opt.type})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Compact Model Identity */}
                                        {m ? (
                                            <div className="compact-model-card">
                                                <img
                                                    src={resolveImageUrl(m.thumbnail_url)}
                                                    alt={m.name}
                                                    className="model-thumb-portrait"
                                                />
                                                <div className="compact-model-info">
                                                    <h3 className="compact-model-title" title={m.name}>
                                                        {m.name}
                                                    </h3>
                                                    <div className="compact-badge-row">
                                                        <span className="badge-base-model">
                                                            {m.base_model || "SDXL"}
                                                        </span>
                                                        <span className={`badge-model-type ${m.type === "lora" ? "lora" : "ckpt"}`}>
                                                            {m.type.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="compact-author-meta">
                                                        <span>oleh <strong>{m.author}</strong></span>
                                                        <span className="compact-rating">★ {m.rating ? m.rating.toFixed(1) : "5.0"}</span>
                                                    </div>
                                                    <div className="compact-actions-row">
                                                        <Link
                                                            to={`/models?model=${m.slug || m.id}`}
                                                            className="micro-btn-action detail"
                                                            title={`Buka detail ${m.name}`}
                                                        >
                                                            <IconExternal />
                                                            <span>Detail</span>
                                                        </Link>
                                                        {versionItem?.download_url && (
                                                            <a
                                                                href={versionItem.download_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="micro-btn-action download"
                                                                title="Unduh bobot model"
                                                            >
                                                                <IconDownload />
                                                                <span>Unduh</span>
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="compact-empty-placeholder">
                                                <span>Pilih model untuk memulai</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* ==========================================================================
                            SECTION 1: SPESIFIKASI & HARDWARE
                           ========================================================================== */}
                        <div className="matrix-section-divider">
                            <h2 className="section-divider-title">1. Spesifikasi & Kebutuhan Hardware</h2>
                        </div>

                        {/* Base Architecture */}
                        <div className={`matrix-grid-row matrix-data-row cols-${slotCount} ${getRowClass(diffArch)}`}>
                            <div className="cell-label">
                                {highlightDiff && diffArch && <span className="diff-dot-indicator" />}
                                Base Architecture
                            </div>
                            {activeSpecs.map((s, idx) => (
                                <div key={idx} className="cell-value">
                                    {s ? s.arch : "—"}
                                </div>
                            ))}
                        </div>

                        {/* Estimasi VRAM Min */}
                        <div className={`matrix-grid-row matrix-data-row cols-${slotCount} ${getRowClass(diffVramMin)}`}>
                            <div className="cell-label">
                                {highlightDiff && diffVramMin && <span className="diff-dot-indicator" />}
                                Estimasi VRAM Min
                            </div>
                            {activeSpecs.map((s, idx) => (
                                <div key={idx} className="cell-value">
                                    {s ? (
                                        <span className={`vram-tag ${s.vramBadge}`}>
                                            {s.vramMin}
                                        </span>
                                    ) : (
                                        "—"
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* VRAM Rekomendasi */}
                        <div className={`matrix-grid-row matrix-data-row cols-${slotCount} ${getRowClass(diffVramRec)}`}>
                            <div className="cell-label">
                                {highlightDiff && diffVramRec && <span className="diff-dot-indicator" />}
                                VRAM Rekomendasi
                            </div>
                            {activeSpecs.map((s, idx) => (
                                <div key={idx} className="cell-value mono">
                                    {s ? s.vramRec : "—"}
                                </div>
                            ))}
                        </div>

                        {/* Format & Ukuran File */}
                        <div className={`matrix-grid-row matrix-data-row cols-${slotCount} ${getRowClass(diffFormatSize)}`}>
                            <div className="cell-label">
                                {highlightDiff && diffFormatSize && <span className="diff-dot-indicator" />}
                                Format & Ukuran File
                            </div>
                            {activeSpecs.map((s, idx) => (
                                <div key={idx} className="cell-value mono">
                                    {s ? s.formatAndSize : "—"}
                                </div>
                            ))}
                        </div>

                        {/* Optional: Tensor Components */}
                        {hasAnyTensorBreakdown && (
                            <div className="matrix-grid-row matrix-data-row cols-2">
                                <div className="cell-label">Komponen Tensor</div>
                                {activeSpecs.map((s, idx) => (
                                    <div key={idx} className="cell-value mono">
                                        {s && (s.conditioner || s.firstStage || s.modelTensor)
                                            ? `cond: ${s.conditioner || "—"} • 1st: ${s.firstStage || "—"} • model: ${s.modelTensor || "—"}`
                                            : "—"}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ==========================================================================
                            SECTION 2: PARAMETER GENERASI OPTIMAL
                           ========================================================================== */}
                        <div className="matrix-section-divider">
                            <h2 className="section-divider-title">2. Parameter Generasi Optimal</h2>
                        </div>

                        {/* Resolusi Native */}
                        <div className={`matrix-grid-row matrix-data-row cols-${slotCount} ${getRowClass(diffRes)}`}>
                            <div className="cell-label">
                                {highlightDiff && diffRes && <span className="diff-dot-indicator" />}
                                Resolusi Native
                            </div>
                            {activeSpecs.map((s, idx) => (
                                <div key={idx} className="cell-value mono param-res-val">
                                    {s ? s.resVal : "—"}
                                </div>
                            ))}
                        </div>

                        {/* Sampling Steps */}
                        <div className={`matrix-grid-row matrix-data-row cols-${slotCount} ${getRowClass(diffSteps)}`}>
                            <div className="cell-label">
                                {highlightDiff && diffSteps && <span className="diff-dot-indicator" />}
                                Sampling Steps
                            </div>
                            {activeSpecs.map((s, idx) => (
                                <div key={idx} className="cell-value mono">
                                    {s ? s.stepsVal : "—"}
                                </div>
                            ))}
                        </div>

                        {/* Sampler Bawaan */}
                        <div className={`matrix-grid-row matrix-data-row cols-${slotCount} ${getRowClass(diffSampler)}`}>
                            <div className="cell-label">
                                {highlightDiff && diffSampler && <span className="diff-dot-indicator" />}
                                Sampler Bawaan
                            </div>
                            {activeSpecs.map((s, idx) => (
                                <div key={idx} className="cell-value">
                                    {s ? s.samplerVal : "—"}
                                </div>
                            ))}
                        </div>

                        {/* Scheduler */}
                        <div className={`matrix-grid-row matrix-data-row cols-${slotCount} ${getRowClass(diffScheduler)}`}>
                            <div className="cell-label">
                                {highlightDiff && diffScheduler && <span className="diff-dot-indicator" />}
                                Scheduler
                            </div>
                            {activeSpecs.map((s, idx) => (
                                <div key={idx} className="cell-value">
                                    {s ? s.schedulerVal : "—"}
                                </div>
                            ))}
                        </div>

                        {/* CFG Scale */}
                        <div className={`matrix-grid-row matrix-data-row cols-${slotCount} ${getRowClass(diffCfg)}`}>
                            <div className="cell-label">
                                {highlightDiff && diffCfg && <span className="diff-dot-indicator" />}
                                CFG Scale Optimal
                            </div>
                            {activeSpecs.map((s, idx) => (
                                <div key={idx} className="cell-value mono">
                                    {s ? s.cfgVal : "—"}
                                </div>
                            ))}
                        </div>

                        {/* Clip Skip */}
                        <div className={`matrix-grid-row matrix-data-row cols-${slotCount} ${getRowClass(diffClipSkip)}`}>
                            <div className="cell-label">
                                {highlightDiff && diffClipSkip && <span className="diff-dot-indicator" />}
                                Clip Skip
                            </div>
                            {activeSpecs.map((s, idx) => (
                                <div key={idx} className="cell-value mono">
                                    {s ? s.clipSkipVal : "—"}
                                </div>
                            ))}
                        </div>

                        {/* ==========================================================================
                            SECTION 3: KONFIGURASI HIRES FIX (Auto-collapse if empty)
                           ========================================================================== */}
                        <div className="matrix-section-divider">
                            <h2 className="section-divider-title">3. Konfigurasi Hires Fix</h2>
                        </div>

                        {!hasAnyHiresConfig ? (
                            <div className={`matrix-grid-row matrix-data-row cols-${slotCount}`}>
                                <div className="cell-label">Rekomendasi Hires Fix</div>
                                {activeSpecs.map((_, idx) => (
                                    <div key={idx} className="cell-value empty-muted-text">
                                        — (Tidak ada rekomendasi khusus)
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <>
                                <div className={`matrix-grid-row matrix-data-row cols-${slotCount} ${getRowClass(diffHiresUpscaler)}`}>
                                    <div className="cell-label">
                                        {highlightDiff && diffHiresUpscaler && <span className="diff-dot-indicator" />}
                                        Upscaler
                                    </div>
                                    {activeSpecs.map((s, idx) => (
                                        <div key={idx} className="cell-value">
                                            {s?.hasHires ? s.hiresUpscaler : "—"}
                                        </div>
                                    ))}
                                </div>

                                <div className={`matrix-grid-row matrix-data-row cols-${slotCount} ${getRowClass(diffHiresScale)}`}>
                                    <div className="cell-label">
                                        {highlightDiff && diffHiresScale && <span className="diff-dot-indicator" />}
                                        Hires Scale
                                    </div>
                                    {activeSpecs.map((s, idx) => (
                                        <div key={idx} className="cell-value mono">
                                            {s?.hasHires ? s.hiresScale : "—"}
                                        </div>
                                    ))}
                                </div>

                                <div className={`matrix-grid-row matrix-data-row cols-${slotCount} ${getRowClass(diffHiresSteps)}`}>
                                    <div className="cell-label">
                                        {highlightDiff && diffHiresSteps && <span className="diff-dot-indicator" />}
                                        Hires Steps
                                    </div>
                                    {activeSpecs.map((s, idx) => (
                                        <div key={idx} className="cell-value mono">
                                            {s?.hasHires ? s.hiresSteps : "—"}
                                        </div>
                                    ))}
                                </div>

                                <div className={`matrix-grid-row matrix-data-row cols-${slotCount} ${getRowClass(diffDenoise)}`}>
                                    <div className="cell-label">
                                        {highlightDiff && diffDenoise && <span className="diff-dot-indicator" />}
                                        Denoise Strength
                                    </div>
                                    {activeSpecs.map((s, idx) => (
                                        <div key={idx} className="cell-value mono">
                                            {s?.hasHires ? s.denoise : "—"}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* ==========================================================================
                            SECTION 4: TRIGGER WORDS (Auto-collapse if empty)
                           ========================================================================== */}
                        <div className="matrix-section-divider">
                            <h2 className="section-divider-title">4. Kata Kunci Pemicu (Trigger Words)</h2>
                        </div>

                        <div className={`matrix-grid-row matrix-data-row cols-${slotCount}`}>
                            <div className="cell-label">Trigger Words</div>
                            {!hasAnyTriggerWords ? (
                                activeSpecs.map((_, idx) => (
                                    <div key={idx} className="cell-value empty-muted-text">
                                        — (Tidak diperlukan)
                                    </div>
                                ))
                            ) : (
                                activeSpecs.map((s, idx) => (
                                    <div key={idx} className="cell-value">
                                        {s && s.triggerWords.length > 0 ? (
                                            <div className="trigger-words-container">
                                                {s.triggerWords.map((tw, tIdx) => {
                                                    const isCopied = copiedTrigger === tw.trigger_word;
                                                    return (
                                                        <button
                                                            key={tIdx}
                                                            type="button"
                                                            className={`trigger-chip-btn ${isCopied ? "copied" : ""}`}
                                                            onClick={() => handleCopyTrigger(tw.trigger_word)}
                                                            title="Klik untuk menyalin kata kunci ini"
                                                        >
                                                            <span>{tw.trigger_word}</span>
                                                            {isCopied ? <IconCheck /> : <IconCopy />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <span className="empty-muted-text">— (Tidak ada kata kunci khusus)</span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* ==========================================================================
                            SECTION 5: PERBANDINGAN HASIL RENDER (Sample Gallery)
                           ========================================================================== */}
                        <div className="gallery-section-container">
                            <div className="gallery-section-header">
                                <div className="gallery-section-title-wrap">
                                    <h2 className="gallery-section-title">Perbandingan Hasil Render</h2>
                                </div>
                                <p className="gallery-section-desc">
                                    Klik gambar untuk membuka perbesaran visual, prompt lengkap, dan parameter generasi.
                                </p>
                            </div>

                            <div className={`gallery-columns-grid cols-${slotCount}`}>
                                {activeSlots.map((slot, sIdx) => {
                                    const m = slot.model;
                                    const specs = activeSpecs[sIdx];
                                    const images = specs?.sampleImages || [];

                                    return (
                                        <div key={sIdx} className="gallery-model-column">
                                            <div className="gallery-column-header">
                                                <span className="gallery-column-model-name">
                                                    {m ? m.name : `Slot ${slot.slotKey} (Kosong)`}
                                                </span>
                                                <span className="slot-tag">Slot {slot.slotKey}</span>
                                            </div>

                                            {images.length > 0 ? (
                                                <div className="gallery-images-subgrid">
                                                    {images.map((img) => (
                                                        <div
                                                            key={img.id}
                                                            className="sample-visual-card"
                                                            onClick={() => setActiveLightboxImage(img)}
                                                        >
                                                            <img
                                                                src={resolveImageUrl(img.image_url)}
                                                                alt={img.caption || `${m?.name || "Model"} sample`}
                                                                className="sample-visual-img"
                                                            />
                                                            {/* Floating Glassmorphism Badge */}
                                                            <div className="sample-floating-glass-badge">
                                                                <span className="glass-badge-params">
                                                                    {img.sampler || "Euler a"} • {img.steps || 28} st • CFG {img.cfg_scale || 6}
                                                                </span>
                                                                <div className="glass-badge-actions">
                                                                    <span>{img.width && img.height ? `${img.width}×${img.height}` : "HD"}</span>
                                                                    <span className="glass-action-hint">
                                                                        <IconZoom />
                                                                        <span>Zoom</span>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="empty-gallery-box">
                                                    <span>Belum ada sampel gambar terunggah untuk model ini.</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ==========================================================================
                Sample Lightbox Modal (Zoom & Generation Details)
               ========================================================================== */}
            {activeLightboxImage && (
                <div className="compare-lightbox-overlay" onClick={() => setActiveLightboxImage(null)}>
                    <div className="compare-lightbox-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="lightbox-modal-topbar">
                            <h3 className="lightbox-modal-title">
                                <IconZoom />
                                <span>Detail Generasi Sampel</span>
                            </h3>
                            <button
                                type="button"
                                className="lightbox-modal-close-btn"
                                onClick={() => setActiveLightboxImage(null)}
                                title="Tutup (Esc)"
                            >
                                <IconX />
                            </button>
                        </div>

                        <div className="lightbox-modal-body">
                            {/* Visual Preview */}
                            <div className="lightbox-visual-preview">
                                <img
                                    src={resolveImageUrl(activeLightboxImage.image_url)}
                                    alt={activeLightboxImage.caption || "Sampel Komparasi"}
                                    className="lightbox-main-img"
                                />
                                {activeLightboxImage.caption && (
                                    <div className="lightbox-caption-text">
                                        {activeLightboxImage.caption}
                                    </div>
                                )}
                            </div>

                            {/* Metadata & Prompts */}
                            <div className="lightbox-metadata-panel">
                                {/* Positive Prompt */}
                                <div className="lightbox-block-group">
                                    <div className="lightbox-block-head">
                                        <span className="lightbox-block-label">Positive Prompt</span>
                                        {activeLightboxImage.positive_prompt && (
                                            <button
                                                type="button"
                                                className="lightbox-copy-btn"
                                                onClick={() => handleCopyPrompt(activeLightboxImage.positive_prompt || "", "Prompt")}
                                            >
                                                {copiedPromptText === "Prompt" ? <IconCheck /> : <IconCopy />}
                                                <span>{copiedPromptText === "Prompt" ? "Tersalin" : "Salin"}</span>
                                            </button>
                                        )}
                                    </div>
                                    <div className="lightbox-text-box">
                                        {activeLightboxImage.positive_prompt || "Tidak ada metadata prompt positif."}
                                    </div>
                                </div>

                                {/* Negative Prompt */}
                                {activeLightboxImage.negative_prompt && (
                                    <div className="lightbox-block-group">
                                        <div className="lightbox-block-head">
                                            <span className="lightbox-block-label negative">Negative Prompt</span>
                                            <button
                                                type="button"
                                                className="lightbox-copy-btn"
                                                onClick={() => handleCopyPrompt(activeLightboxImage.negative_prompt || "", "Negative")}
                                            >
                                                {copiedPromptText === "Negative" ? <IconCheck /> : <IconCopy />}
                                                <span>{copiedPromptText === "Negative" ? "Tersalin" : "Salin"}</span>
                                            </button>
                                        </div>
                                        <div className="lightbox-text-box">
                                            {activeLightboxImage.negative_prompt}
                                        </div>
                                    </div>
                                )}

                                {/* Parameters Grid */}
                                <div className="lightbox-block-group">
                                    <span className="lightbox-block-label">Parameter Generasi</span>
                                    <div className="lightbox-params-grid">
                                        <div className="lightbox-param-item">
                                            <span className="lightbox-param-name">Sampler</span>
                                            <span className="lightbox-param-value">{activeLightboxImage.sampler || "Euler a"}</span>
                                        </div>
                                        <div className="lightbox-param-item">
                                            <span className="lightbox-param-name">Steps</span>
                                            <span className="lightbox-param-value">{activeLightboxImage.steps || 28}</span>
                                        </div>
                                        <div className="lightbox-param-item">
                                            <span className="lightbox-param-name">CFG Scale</span>
                                            <span className="lightbox-param-value">{activeLightboxImage.cfg_scale || 6}</span>
                                        </div>
                                        <div className="lightbox-param-item">
                                            <span className="lightbox-param-name">Scheduler</span>
                                            <span className="lightbox-param-value">{activeLightboxImage.scheduler || "Normal"}</span>
                                        </div>
                                        <div className="lightbox-param-item">
                                            <span className="lightbox-param-name">Seed</span>
                                            <span className="lightbox-param-value">{activeLightboxImage.seed || "—"}</span>
                                        </div>
                                        <div className="lightbox-param-item">
                                            <span className="lightbox-param-name">Resolusi</span>
                                            <span className="lightbox-param-value">
                                                {activeLightboxImage.width && activeLightboxImage.height
                                                    ? `${activeLightboxImage.width} × ${activeLightboxImage.height}`
                                                    : "—"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Link to Gallery */}
                                <div className="lightbox-footer-row">
                                    <Link
                                        to={`/gallery?image=${activeLightboxImage.id}`}
                                        className="lightbox-open-gallery-btn"
                                    >
                                        <span>Buka di Galeri Publik</span>
                                        <IconExternal />
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
