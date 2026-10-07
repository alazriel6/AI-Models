import { useState, useEffect } from "react";
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

    const [copiedTrigger, setCopiedTrigger] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [modelsRes, imagesRes] = await Promise.all([
                    getModels({ limit: 100 }),
                    getAllImages({ limit: 150 }),
                ]);
                const models = modelsRes.data || [];
                const images = imagesRes.data || [];
                setAllModels(models);
                setAllImages(images);

                // Initialize slots from query params (?m1= or ?models=) or default first models
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
                setLoading(false);
            }
        };

        loadData();
    }, [searchParams]);

    const handleCopyTrigger = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedTrigger(text);
        setTimeout(() => setCopiedTrigger(null), 1800);
    };

    // Update query params when slots change
    const updateSlots = (a: number | null, b: number | null, c: number | null, count: 2 | 3) => {
        const ids = [a, b, count === 3 ? c : null].filter(Boolean);
        setSearchParams({ models: ids.join(",") });
    };

    const modelA = allModels.find((m) => m.id === slotAId);
    const modelB = allModels.find((m) => m.id === slotBId);
    const modelC = allModels.find((m) => m.id === slotCId);

    const activeSlots = slotCount === 3 ? [
        { label: "Model A", model: modelA, setId: (id: number) => { setSlotAId(id); updateSlots(id, slotBId, slotCId, 3); } },
        { label: "Model B", model: modelB, setId: (id: number) => { setSlotBId(id); updateSlots(slotAId, id, slotCId, 3); } },
        { label: "Model C", model: modelC, setId: (id: number) => { setSlotCId(id); updateSlots(slotAId, slotBId, id, 3); } },
    ] : [
        { label: "Model A", model: modelA, setId: (id: number) => { setSlotAId(id); updateSlots(id, slotBId, slotCId, 2); } },
        { label: "Model B", model: modelB, setId: (id: number) => { setSlotBId(id); updateSlots(slotAId, id, slotCId, 2); } },
    ];

    return (
        <div className="compare-container">
            {/* Header */}
            <div className="compare-header">
                <h1 className="compare-title">
                    <span className="compare-title-icon">⚔️</span>
                    Model Comparison Tool
                </h1>
                <p className="compare-subtitle">
                    Adu spesifikasi teknis, kebutuhan VRAM, konfigurasi inference, dan hasil generate antar model secara berdampingan (*side-by-side*).
                </p>
            </div>

            {/* Slots Control Bar */}
            <div className="compare-slots-bar">
                <div className="compare-slots-count">
                    <span style={{ fontSize: "12px", color: "#909296" }}>Jumlah Kolom Komparasi:</span>
                    <button
                        type="button"
                        className={`slot-toggle-btn ${slotCount === 2 ? "active" : ""}`}
                        onClick={() => {
                            setSlotCount(2);
                            updateSlots(slotAId, slotBId, slotCId, 2);
                        }}
                    >
                        2 Models (Side-by-Side)
                    </button>
                    <button
                        type="button"
                        className={`slot-toggle-btn ${slotCount === 3 ? "active" : ""}`}
                        onClick={() => {
                            setSlotCount(3);
                            updateSlots(slotAId, slotBId, slotCId, 3);
                        }}
                    >
                        3 Models (Trio Showdown)
                    </button>
                </div>

                <Link to="/models" style={{ fontSize: "12px", color: "#818cf8" }}>
                    ← Lihat Semua Katalog Model
                </Link>
            </div>

            {loading ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "#909296" }}>
                    Memuat data model...
                </div>
            ) : (
                <div className={`compare-matrix-grid cols-${slotCount}`}>
                    {activeSlots.map((slot, idx) => {
                        const m = slot.model;
                        const sampleImages = m ? allImages.filter((img) => img.model_id === m.id).slice(0, 3) : [];
                        const triggerWords = m?.trigger_words || [];

                        return (
                            <div key={idx} className="compare-model-col">
                                {/* Model Picker Dropdown */}
                                <div className="col-selector-wrap">
                                    <span className="col-slot-label">{slot.label}</span>
                                    <select
                                        className="col-model-select"
                                        value={m?.id || ""}
                                        onChange={(e) => slot.setId(Number(e.target.value))}
                                    >
                                        {allModels.map((opt) => (
                                            <option key={opt.id} value={opt.id}>
                                                {opt.name} ({opt.base_model || opt.type})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {m ? (
                                    <>
                                        {/* Showcase Hero */}
                                        <div className="compare-thumb-wrap">
                                            <img
                                                src={resolveImageUrl(m.thumbnail_url)}
                                                alt={m.name}
                                                className="compare-thumb-img"
                                            />
                                        </div>

                                        <div className="compare-hero-info">
                                            <h2 className="compare-model-name">{m.name}</h2>
                                            <span className="compare-model-author">by {m.author}</span>

                                            <div className="compare-pills-row">
                                                <span className={`compare-pill ${m.type === "lora" ? "lora" : "ckpt"}`}>
                                                    {m.type.toUpperCase()}
                                                </span>
                                                <span className="compare-pill arch">
                                                    {m.base_model || "SDXL"}
                                                </span>
                                                <span className="compare-pill arch">
                                                    ★ {m.rating ? m.rating.toFixed(1) : "5.0"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Hardware & VRAM Specs */}
                                        <div className="compare-section">
                                            <h3 className="compare-section-title">Hardware & VRAM Requirements</h3>
                                            <div className="compare-param-row">
                                                <span className="compare-param-key">Min VRAM</span>
                                                <span className="compare-param-val" style={{ color: "#4ade80" }}>
                                                    {m.vram_min || (m.type === "lora" ? "4 GB (Shared)" : m.base_model === "SD 1.5" ? "4 GB" : m.base_model === "Flux" ? "12 GB" : "6 GB")}
                                                </span>
                                            </div>
                                            <div className="compare-param-row">
                                                <span className="compare-param-key">Recommended VRAM</span>
                                                <span className="compare-param-val" style={{ color: "#818cf8" }}>
                                                    {m.vram_recommended || (m.type === "lora" ? "6 GB" : m.base_model === "SD 1.5" ? "8 GB" : m.base_model === "Flux" ? "16 - 24 GB" : "8 - 12 GB")}
                                                </span>
                                            </div>
                                            <div className="compare-param-row">
                                                <span className="compare-param-key">Model File Size</span>
                                                <span className="compare-param-val">
                                                    {m.tensor_size || (m.versions?.[0]?.file_size ? `${(m.versions[0].file_size / (1024 * 1024 * 1024)).toFixed(2)} GB` : (m.type === "lora" ? "~220 MB" : "~6.46 GB"))}
                                                </span>
                                            </div>
                                            <div className="compare-param-row">
                                                <span className="compare-param-key">Weights Format</span>
                                                <span className="compare-param-val">{m.versions?.[0]?.format || "SafeTensors"}</span>
                                            </div>
                                        </div>

                                        {/* Recommended Inference Settings */}
                                        {(() => {
                                            const rec = m.versions?.[0]?.recommended_settings as Record<string, any> | undefined;
                                            const samplerVal = rec?.sampler || (m.type === "lora" ? "Euler a / DPM++ 2M" : "Euler a");
                                            const stepsVal = rec?.steps ? `${rec.steps}` : (m.base_model === "Flux" ? "20 - 25" : "24 - 30");
                                            const cfgVal = rec?.cfg_scale !== undefined ? String(rec.cfg_scale) : (m.base_model === "Pony" ? "5.0 - 6.5" : m.base_model === "Flux" ? "3.5" : "6.5 - 7.5");
                                            const resVal = rec?.width && rec?.height ? `${rec.width} × ${rec.height}` : (m.base_model === "SD 1.5" ? "512 × 768" : "832 × 1216");
                                            const clipSkipVal = rec?.clip_skip !== undefined ? String(rec.clip_skip) : (m.base_model === "SD 1.5" ? "1" : "2");

                                            return (
                                                <div className="compare-section">
                                                    <h3 className="compare-section-title">Recommended Inference Setup</h3>
                                                    <div className="compare-param-row">
                                                        <span className="compare-param-key">Sampler</span>
                                                        <span className="compare-param-val">{samplerVal}</span>
                                                    </div>
                                                    <div className="compare-param-row">
                                                        <span className="compare-param-key">Steps</span>
                                                        <span className="compare-param-val">{stepsVal}</span>
                                                    </div>
                                                    <div className="compare-param-row">
                                                        <span className="compare-param-key">CFG Scale</span>
                                                        <span className="compare-param-val">{cfgVal}</span>
                                                    </div>
                                                    <div className="compare-param-row">
                                                        <span className="compare-param-key">Native Resolution</span>
                                                        <span className="compare-param-val">{resVal}</span>
                                                    </div>
                                                    <div className="compare-param-row">
                                                        <span className="compare-param-key">Clip Skip</span>
                                                        <span className="compare-param-val">{clipSkipVal}</span>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Trigger Words */}
                                        <div className="compare-section">
                                            <h3 className="compare-section-title">Trigger Words</h3>
                                            {triggerWords.length > 0 ? (
                                                <div className="compare-triggers-box">
                                                    {triggerWords.map((t, tidx) => (
                                                        <span
                                                            key={tidx}
                                                            className="compare-trigger-chip"
                                                            onClick={() => handleCopyTrigger(t.trigger_word)}
                                                            title="Klik untuk salin kata pemicu"
                                                        >
                                                            <span>{t.trigger_word}</span>
                                                            <span style={{ fontSize: "10px", color: "#818cf8" }}>
                                                                {copiedTrigger === t.trigger_word ? "✓" : "📋"}
                                                            </span>
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: "12px", color: "#666c75" }}>
                                                    Model Checkpoint umum (tidak memerlukan trigger word khusus).
                                                </span>
                                            )}
                                        </div>

                                        {/* Sample Generations Showcase */}
                                        <div className="compare-section">
                                            <h3 className="compare-section-title">Sample Generations</h3>
                                            {sampleImages.length > 0 ? (
                                                <div className="compare-samples-row">
                                                    {sampleImages.map((img) => (
                                                        <Link key={img.id} to={`/gallery?image=${img.id}`}>
                                                            <img
                                                                src={resolveImageUrl(img.image_url)}
                                                                alt={img.caption || "Sample"}
                                                                className="compare-sample-thumb"
                                                                title="Buka detail inspeksi di Galeri"
                                                            />
                                                        </Link>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: "12px", color: "#666c75" }}>
                                                    Belum ada sampel foto di galeri untuk model ini.
                                                </span>
                                            )}
                                        </div>

                                        {/* Link to Detail */}
                                        <Link
                                            to={`/models?model=${m.slug}`}
                                            style={{
                                                display: "block",
                                                textAlign: "center",
                                                padding: "10px",
                                                background: "#23262D",
                                                borderRadius: "6px",
                                                color: "#ffffff",
                                                fontSize: "12px",
                                                fontWeight: 600,
                                            }}
                                        >
                                            Inspect Full Model Page →
                                        </Link>
                                    </>
                                ) : (
                                    <div style={{ padding: "40px 0", textAlign: "center", color: "#666c75" }}>
                                        Pilih model untuk slot ini.
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
