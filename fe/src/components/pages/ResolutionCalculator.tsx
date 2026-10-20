import { useState, useMemo } from "react";
import "../../style/ResolutionCalculator.css";

interface BucketPreset {
    label: string;
    category: string;
    width: number;
    height: number;
    exact: string;
    mp: string;
}

// 9 Presets for SDXL / Illustrious / NoobAI / Pony (~1.0 MP, multiples of 64)
const SDXL_PRESETS: BucketPreset[] = [
    { label: "1:1 Square", category: "Square", width: 1024, height: 1024, exact: "1:1", mp: "1.05 MP" },
    { label: "2:3 Portrait", category: "Portrait", width: 832, height: 1216, exact: "13:19", mp: "1.01 MP" },
    { label: "3:2 Landscape", category: "Landscape", width: 1216, height: 832, exact: "19:13", mp: "1.01 MP" },
    { label: "3:4 Portrait", category: "Portrait", width: 896, height: 1152, exact: "7:9", mp: "1.03 MP" },
    { label: "4:3 Landscape", category: "Landscape", width: 1152, height: 896, exact: "9:7", mp: "1.03 MP" },
    { label: "9:16 Vertical", category: "Vertical", width: 768, height: 1344, exact: "4:7", mp: "1.03 MP" },
    { label: "16:9 Widescreen", category: "Widescreen", width: 1344, height: 768, exact: "7:4", mp: "1.03 MP" },
    { label: "1:2 Tall", category: "Tall", width: 704, height: 1408, exact: "1:2", mp: "0.99 MP" },
    { label: "21:9 Ultrawide", category: "Ultrawide", width: 1536, height: 640, exact: "12:5", mp: "0.98 MP" },
];

// 9 Presets for SD 1.5 (~0.26 - 0.46 MP, multiples of 64)
const SD15_PRESETS: BucketPreset[] = [
    { label: "1:1 Square", category: "Square", width: 512, height: 512, exact: "1:1", mp: "0.26 MP" },
    { label: "2:3 Portrait", category: "Portrait", width: 512, height: 768, exact: "2:3", mp: "0.39 MP" },
    { label: "3:2 Landscape", category: "Landscape", width: 768, height: 512, exact: "3:2", mp: "0.39 MP" },
    { label: "3:4 Portrait", category: "Portrait", width: 576, height: 768, exact: "3:4", mp: "0.44 MP" },
    { label: "4:3 Landscape", category: "Landscape", width: 768, height: 576, exact: "4:3", mp: "0.44 MP" },
    { label: "9:16 Vertical", category: "Vertical", width: 512, height: 896, exact: "4:7", mp: "0.46 MP" },
    { label: "16:9 Widescreen", category: "Widescreen", width: 896, height: 512, exact: "7:4", mp: "0.46 MP" },
    { label: "1:2 Tall", category: "Tall", width: 384, height: 768, exact: "1:2", mp: "0.29 MP" },
    { label: "21:9 Ultrawide", category: "Ultrawide", width: 896, height: 384, exact: "7:3", mp: "0.34 MP" },
];

// 9 Presets for Flux.1 Native 1.5 MP mode
const FLUX_15MP_PRESETS: BucketPreset[] = [
    { label: "1:1 Square", category: "Square", width: 1280, height: 1280, exact: "1:1", mp: "1.64 MP" },
    { label: "2:3 Portrait", category: "Portrait", width: 1024, height: 1536, exact: "2:3", mp: "1.57 MP" },
    { label: "3:2 Landscape", category: "Landscape", width: 1536, height: 1024, exact: "3:2", mp: "1.57 MP" },
    { label: "3:4 Portrait", category: "Portrait", width: 1152, height: 1536, exact: "3:4", mp: "1.77 MP" },
    { label: "4:3 Landscape", category: "Landscape", width: 1536, height: 1152, exact: "4:3", mp: "1.77 MP" },
    { label: "9:16 Vertical", category: "Vertical", width: 960, height: 1664, exact: "15:26", mp: "1.60 MP" },
    { label: "16:9 Widescreen", category: "Widescreen", width: 1536, height: 864, exact: "16:9", mp: "1.33 MP" },
    { label: "1:2 Tall", category: "Tall", width: 832, height: 1664, exact: "1:2", mp: "1.38 MP" },
    { label: "21:9 Ultrawide", category: "Ultrawide", width: 1792, height: 768, exact: "7:3", mp: "1.38 MP" },
];

function computeGcd(a: number, b: number): number {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y) {
        const t = y;
        y = x % y;
        x = t;
    }
    return x || 1;
}

interface RatioDetails {
    nominal: string;
    exactRatio: string;
    decimal: string;
    isStandard: boolean;
}

const COMMON_RATIOS: { label: string; value: number }[] = [
    { label: "1:1", value: 1 },
    { label: "2:3", value: 2 / 3 },
    { label: "3:2", value: 3 / 2 },
    { label: "3:4", value: 3 / 4 },
    { label: "4:3", value: 4 / 3 },
    { label: "9:16", value: 9 / 16 },
    { label: "16:9", value: 16 / 9 },
    { label: "1:2", value: 1 / 2 },
    { label: "2:1", value: 2 },
    { label: "21:9", value: 21 / 9 },
    { label: "9:21", value: 9 / 21 },
    { label: "4:5", value: 4 / 5 },
    { label: "5:4", value: 5 / 4 },
];

function getRatioDetails(w: number, h: number): RatioDetails {
    if (!w || !h) {
        return { nominal: "1:1", exactRatio: "1:1", decimal: "1.000", isStandard: true };
    }
    const divisor = computeGcd(w, h);
    const redW = Math.round(w / divisor);
    const redH = Math.round(h / divisor);
    const exactRatio = `${redW}:${redH}`;
    const ratioVal = w / h;
    const decimal = ratioVal.toFixed(3);

    let nearest = COMMON_RATIOS[0];
    let minDiff = Math.abs(ratioVal - nearest.value);
    for (const item of COMMON_RATIOS) {
        const diff = Math.abs(ratioVal - item.value);
        if (diff < minDiff) {
            minDiff = diff;
            nearest = item;
        }
    }

    const isClose = minDiff < 0.045;
    const nominal = isClose ? nearest.label : exactRatio;

    return {
        nominal,
        exactRatio,
        decimal,
        isStandard: isClose,
    };
}

export default function ResolutionCalculator() {
    const [arch, setArch] = useState<"sdxl" | "flux" | "sd15">("sdxl");
    const [fluxMode, setFluxMode] = useState<"standard" | "native15">("standard");
    const [width, setWidth] = useState<number>(832);
    const [height, setHeight] = useState<number>(1216);
    const [hiresScale, setHiresScale] = useState<number>(1.5);
    const [customScale, setCustomScale] = useState<string>("1.5");
    const [snap64, setSnap64] = useState<boolean>(true);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // Active presets selection
    const activePresets = useMemo(() => {
        if (arch === "sd15") return SD15_PRESETS;
        if (arch === "flux" && fluxMode === "native15") return FLUX_15MP_PRESETS;
        return SDXL_PRESETS;
    }, [arch, fluxMode]);

    // Handle Preset Click
    const handleSelectPreset = (p: BucketPreset) => {
        setWidth(p.width);
        setHeight(p.height);
    };

    // Swap Width and Height
    const handleSwapDimensions = () => {
        const temp = width;
        setWidth(height);
        setHeight(temp);
    };

    // Stepper adjustments
    const adjustWidth = (delta: number) => {
        const minW = arch === "sd15" ? 256 : 512;
        const maxW = arch === "flux" ? 3072 : 2560;
        const next = Math.max(minW, Math.min(maxW, width + delta));
        setWidth(next);
    };

    const adjustHeight = (delta: number) => {
        const minH = arch === "sd15" ? 256 : 512;
        const maxH = arch === "flux" ? 3072 : 2560;
        const next = Math.max(minH, Math.min(maxH, height + delta));
        setHeight(next);
    };

    // Slider range adjustments
    const handleWidthSlider = (val: number) => {
        if (snap64) {
            const snapped = Math.max(64, Math.round(val / 64) * 64);
            setWidth(snapped);
        } else {
            const snapped8 = Math.max(64, Math.round(val / 8) * 8);
            setWidth(snapped8);
        }
    };

    const handleHeightSlider = (val: number) => {
        if (snap64) {
            const snapped = Math.max(64, Math.round(val / 64) * 64);
            setHeight(snapped);
        } else {
            const snapped8 = Math.max(64, Math.round(val / 8) * 8);
            setHeight(snapped8);
        }
    };

    // Direct numeric input
    const handleDirectWidthInput = (val: string) => {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed)) {
            setWidth(Math.max(64, Math.min(4096, parsed)));
        }
    };

    const handleDirectHeightInput = (val: string) => {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed)) {
            setHeight(Math.max(64, Math.min(4096, parsed)));
        }
    };

    // Mathematical Calculations
    const totalPixels = width * height;
    const megapixels = (totalPixels / 1_000_000).toFixed(2) + " MP";
    const latentWidth = Math.floor(width / 8);
    const latentHeight = Math.floor(height / 8);

    // Aspect ratio details
    const ratioInfo = useMemo(() => getRatioDetails(width, height), [width, height]);

    // Hi-Res Fix calculation - Multiple of 8
    const rawHiresW = width * hiresScale;
    const rawHiresH = height * hiresScale;
    const hiresW = Math.round(rawHiresW / 8) * 8;
    const hiresH = Math.round(rawHiresH / 8) * 8;
    const hiresPixels = hiresW * hiresH;
    const hiresMegapixels = (hiresPixels / 1_000_000).toFixed(2) + " MP";
    const latentHiresW = Math.floor(hiresW / 8);
    const latentHiresH = Math.floor(hiresH / 8);

    // Recommended denoise based on scale
    const denoiseRange = useMemo(() => {
        if (hiresScale <= 1.25) return "0.30 – 0.38";
        if (hiresScale <= 1.5) return "0.35 – 0.45";
        if (hiresScale <= 1.75) return "0.38 – 0.48";
        return "0.40 – 0.50";
    }, [hiresScale]);

    // Divisibility checks
    const isDiv64 = width % 64 === 0 && height % 64 === 0;
    const isDiv8 = width % 8 === 0 && height % 8 === 0;

    // Technical VRAM & Bucket Status
    const statusAssessment = useMemo(() => {
        if (arch === "sdxl") {
            const isOptimal = totalPixels >= 950_000 && totalPixels <= 1_150_000 && isDiv64;
            const isOver = totalPixels > 1_300_000;
            const isUnder = totalPixels < 950_000;

            if (isOptimal) {
                return {
                    pillClass: "optimal",
                    badge: "Optimal Bucket (Bebas Double Head)",
                    vram: "8 – 10 GB VRAM",
                    desc: "Sesuai resolusi native bucket training SDXL / Illustrious. Komposisi stabil tanpa risiko mutasi anatomi atau duplikasi kepala.",
                };
            }
            if (isOver) {
                return {
                    pillClass: "warning",
                    badge: "Di Atas Native Bucket (Risiko anatomi ganda tanpa Hi-Res Fix)",
                    vram: "12 – 16+ GB VRAM",
                    desc: "Resolusi dasar melebihi target 1.0 MP. Sangat rentan memunculkan kepala/badan ganda. Turunkan resolusi dasar dan gunakan Hi-Res Fix.",
                };
            }
            if (isUnder) {
                return {
                    pillClass: "neutral",
                    badge: "Di Bawah Target 1.0 MP (Generasi Cepat)",
                    vram: "6 – 8 GB VRAM",
                    desc: "Sangat cepat dan hemat memori, cocok untuk eksplorasi prompt kilat, namun ketajaman detail mikro berkurang.",
                };
            }
            return {
                pillClass: "neutral",
                badge: "Toleransi Menengah (1.15 – 1.30 MP)",
                vram: "10 – 12 GB VRAM",
                desc: "Dapat digunakan namun perhatikan komposisi anatomi saat sampling berulang kali.",
            };
        }

        if (arch === "sd15") {
            const isOptimal = totalPixels <= 400_000;
            const isOver = totalPixels > 450_000;

            if (isOptimal) {
                return {
                    pillClass: "optimal",
                    badge: "Optimal Native SD 1.5",
                    vram: "4 – 6 GB VRAM",
                    desc: "Sesuai standar native 512x512 / 512x768. Komposisi stabil dan hemat VRAM.",
                };
            }
            if (isOver) {
                return {
                    pillClass: "warning",
                    badge: "Di Atas Native Bucket SD 1.5 (Gunakan Hi-Res Fix)",
                    vram: "6 – 8+ GB VRAM",
                    desc: "SD 1.5 sangat rentan mutasi anatomi ganda jika base generation di atas 512x768. Wajib gunakan Hi-Res Fix.",
                };
            }
            return {
                pillClass: "neutral",
                badge: "Batas Toleransi SD 1.5",
                vram: "6 GB VRAM",
                desc: "Sedikit di atas standar dasar, masih dalam batas aman.",
            };
        }

        // Flux.1
        if (totalPixels <= 1_650_000) {
            return {
                pillClass: "optimal",
                badge: "Optimal Native Flux.1",
                vram: "12 – 16 GB VRAM",
                desc: "Arsitektur DiT Flux.1 mendukung resolusi tinggi multi-aspek tanpa distorsi repetisi.",
            };
        }
        if (totalPixels <= 2_100_000) {
            return {
                pillClass: "neutral",
                badge: "High-Res Native Flux.1",
                vram: "16 – 24 GB VRAM",
                desc: "Resolusi sangat tinggi. Membutuhkan kapasitas VRAM besar atau model offloading.",
            };
        }
        return {
            pillClass: "warning",
            badge: "Resolusi Ekstrem (> 2.0 MP)",
            vram: "24+ GB VRAM",
            desc: "Beban komputasi berat. Waktu generasi meningkat drastis dengan risiko tinggi OOM.",
        };
    }, [arch, totalPixels, isDiv64]);

    // Copy action
    const triggerCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 1800);
    };

    // Calculate wireframe preview dimensions (constrained to max 190x190)
    const maxBox = 190;
    const previewScale = Math.min(maxBox / width, maxBox / height);
    const wireframeWidth = Math.max(50, Math.round(width * previewScale));
    const wireframeHeight = Math.max(50, Math.round(height * previewScale));

    return (
        <div className="calc-container">
            {/* Header */}
            <div className="calc-header">
                <h1 className="calc-title">
                    Kalkulator Resolusi & Rasio Aspek (Bucket Latent)
                </h1>
                <p className="calc-subtitle">
                    Perhitungan presisi dimensi gambar dan ukuran latent VAE untuk pipeline <strong>SDXL, Illustrious-XL, NoobAI, Pony, Flux.1</strong>, dan <strong>SD 1.5</strong>. Memastikan pembagian kelipatan 64/8 akurat untuk mencegah mutasi kepala ganda.
                </p>

                {/* Architecture Segmented Pills */}
                <div className="calc-arch-bar">
                    <button
                        type="button"
                        className={`calc-arch-btn ${arch === "sdxl" ? "active" : ""}`}
                        onClick={() => {
                            setArch("sdxl");
                            setWidth(832);
                            setHeight(1216);
                        }}
                    >
                        SDXL / Illustrious / NoobAI / Pony (~1.0 MP)
                    </button>

                    <button
                        type="button"
                        className={`calc-arch-btn ${arch === "flux" ? "active" : ""}`}
                        onClick={() => {
                            setArch("flux");
                            setWidth(1024);
                            setHeight(1024);
                        }}
                    >
                        Flux.1 (0.5 – 2.0 MP)
                    </button>

                    <button
                        type="button"
                        className={`calc-arch-btn ${arch === "sd15" ? "active" : ""}`}
                        onClick={() => {
                            setArch("sd15");
                            setWidth(512);
                            setHeight(768);
                        }}
                    >
                        SD 1.5 (~0.26 – 0.39 MP)
                    </button>
                </div>
            </div>

            {/* Main Interactive Grid */}
            <div className="calc-main-grid">
                {/* Left Column: Preset Buckets & Controls */}
                <div className="calc-left-col">
                    {/* Preset Buckets Section (Strict 3x3 Grid) */}
                    <div className="calc-card">
                        <div className="calc-card-header">
                            <h2 className="calc-card-title">Preset Standard Aspect Ratio Buckets</h2>
                            {arch === "flux" ? (
                                <div className="calc-sub-bar">
                                    <button
                                        type="button"
                                        className={`calc-sub-btn ${fluxMode === "standard" ? "active" : ""}`}
                                        onClick={() => {
                                            setFluxMode("standard");
                                            setWidth(1024);
                                            setHeight(1024);
                                        }}
                                    >
                                        1.0 MP Standar
                                    </button>
                                    <button
                                        type="button"
                                        className={`calc-sub-btn ${fluxMode === "native15" ? "active" : ""}`}
                                        onClick={() => {
                                            setFluxMode("native15");
                                            setWidth(1024);
                                            setHeight(1536);
                                        }}
                                    >
                                        1.5 MP Native
                                    </button>
                                </div>
                            ) : (
                                <span className="calc-card-badge">
                                    {arch === "sd15" ? "Kelipatan 64px (SD 1.5)" : "Resmi 100% Native Bucket SDXL"}
                                </span>
                            )}
                        </div>

                        {/* 3x3 Grid: Exactly 9 cards, no empty spaces */}
                        <div className="bucket-grid-3x3">
                            {activePresets.map((preset, idx) => {
                                const isCurrent = width === preset.width && height === preset.height;
                                const iconW = Math.min(22, Math.max(10, Math.round(20 * (preset.width / preset.height))));
                                const iconH = Math.min(22, Math.max(10, Math.round(20 * (preset.height / preset.width))));

                                return (
                                    <div
                                        key={idx}
                                        className={`bucket-card ${isCurrent ? "active" : ""}`}
                                        onClick={() => handleSelectPreset(preset)}
                                    >
                                        <div className="bucket-icon-frame">
                                            <div
                                                style={{
                                                    width: iconW,
                                                    height: iconH,
                                                    border: `1.5px solid ${isCurrent ? "#60a5fa" : "#52525b"}`,
                                                    borderRadius: "2px",
                                                    background: isCurrent ? "#2563eb" : "#18181b",
                                                }}
                                            />
                                        </div>
                                        <span className="bucket-card-label">{preset.label}</span>
                                        <span className="bucket-card-dim">
                                            {preset.width} × {preset.height}
                                        </span>
                                        <span className="bucket-card-meta">
                                            {preset.mp} • {preset.exact}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Manual Resolution Adjuster */}
                    <div className="calc-card">
                        <div className="calc-card-header">
                            <h2 className="calc-card-title">Penyesuaian Dimensi Manual</h2>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                                <button
                                    type="button"
                                    className="swap-btn"
                                    onClick={handleSwapDimensions}
                                    title="Tukar Lebar dan Tinggi"
                                >
                                    ⇄ Tukar Lebar/Tinggi (Portrait ↔ Landscape)
                                </button>

                                <label className="snap-label">
                                    <input
                                        type="checkbox"
                                        checked={snap64}
                                        onChange={(e) => setSnap64(e.target.checked)}
                                        style={{ accentColor: "#2563eb", cursor: "pointer" }}
                                    />
                                    <span>Kunci Kelipatan 64px</span>
                                </label>
                            </div>
                        </div>

                        {/* Width Stepper & Slider */}
                        <div className="manual-control-group">
                            <div className="manual-label-row">
                                <span className="manual-axis-label">Lebar (Width)</span>
                                <span style={{ fontSize: "11px", color: "#a1a1aa", fontFamily: "ui-monospace, monospace" }}>
                                    Latent X: {latentWidth} blok
                                </span>
                            </div>
                            <div className="manual-inputs-row">
                                <input
                                    type="range"
                                    min={arch === "sd15" ? 256 : 512}
                                    max={arch === "flux" ? 3072 : 2048}
                                    step={snap64 ? 64 : 8}
                                    value={width}
                                    onChange={(e) => handleWidthSlider(Number(e.target.value))}
                                    className="calc-range-input"
                                />
                                <div className="stepper-group">
                                    <button type="button" className="stepper-btn" onClick={() => adjustWidth(-64)} title="Kurang 64px">-64</button>
                                    <button type="button" className="stepper-btn" onClick={() => adjustWidth(-8)} title="Kurang 8px">-8</button>
                                    <div className="stepper-input-wrap">
                                        <input
                                            type="number"
                                            className="stepper-num-input"
                                            value={width}
                                            onChange={(e) => handleDirectWidthInput(e.target.value)}
                                            step={snap64 ? 64 : 8}
                                        />
                                        <span className="stepper-unit">px</span>
                                    </div>
                                    <button type="button" className="stepper-btn" onClick={() => adjustWidth(8)} title="Tambah 8px">+8</button>
                                    <button type="button" className="stepper-btn" onClick={() => adjustWidth(64)} title="Tambah 64px">+64</button>
                                </div>
                            </div>
                        </div>

                        {/* Height Stepper & Slider */}
                        <div className="manual-control-group">
                            <div className="manual-label-row">
                                <span className="manual-axis-label">Tinggi (Height)</span>
                                <span style={{ fontSize: "11px", color: "#a1a1aa", fontFamily: "ui-monospace, monospace" }}>
                                    Latent Y: {latentHeight} blok
                                </span>
                            </div>
                            <div className="manual-inputs-row">
                                <input
                                    type="range"
                                    min={arch === "sd15" ? 256 : 512}
                                    max={arch === "flux" ? 3072 : 2048}
                                    step={snap64 ? 64 : 8}
                                    value={height}
                                    onChange={(e) => handleHeightSlider(Number(e.target.value))}
                                    className="calc-range-input"
                                />
                                <div className="stepper-group">
                                    <button type="button" className="stepper-btn" onClick={() => adjustHeight(-64)} title="Kurang 64px">-64</button>
                                    <button type="button" className="stepper-btn" onClick={() => adjustHeight(-8)} title="Kurang 8px">-8</button>
                                    <div className="stepper-input-wrap">
                                        <input
                                            type="number"
                                            className="stepper-num-input"
                                            value={height}
                                            onChange={(e) => handleDirectHeightInput(e.target.value)}
                                            step={snap64 ? 64 : 8}
                                        />
                                        <span className="stepper-unit">px</span>
                                    </div>
                                    <button type="button" className="stepper-btn" onClick={() => adjustHeight(8)} title="Tambah 8px">+8</button>
                                    <button type="button" className="stepper-btn" onClick={() => adjustHeight(64)} title="Tambah 64px">+64</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Hi-Res Fix / Upscale Calculator */}
                    <div className="calc-card">
                        <div className="calc-card-header">
                            <h2 className="calc-card-title">Kalkulator Hi-Res Fix & Upscale (Kelipatan 8)</h2>
                            <span className="calc-card-badge">Faktor Downsampling VAE ÷8</span>
                        </div>

                        {/* Scale Selector */}
                        <div className="hires-scale-row">
                            {[1.25, 1.5, 1.75, 2.0].map((scale) => (
                                <button
                                    key={scale}
                                    type="button"
                                    className={`hires-scale-btn ${hiresScale === scale ? "active" : ""}`}
                                    onClick={() => {
                                        setHiresScale(scale);
                                        setCustomScale(scale.toString());
                                    }}
                                >
                                    {scale}x
                                </button>
                            ))}
                            <div className="hires-custom-wrap">
                                <span style={{ fontSize: "12px", color: "#a1a1aa" }}>Kustom:</span>
                                <input
                                    type="number"
                                    step="0.05"
                                    min="1.0"
                                    max="4.0"
                                    className="hires-custom-input"
                                    value={customScale}
                                    onChange={(e) => {
                                        setCustomScale(e.target.value);
                                        const parsed = parseFloat(e.target.value);
                                        if (!isNaN(parsed) && parsed >= 1.0) {
                                            setHiresScale(parsed);
                                        }
                                    }}
                                />
                                <span style={{ fontSize: "11px", color: "#71717a" }}>x</span>
                            </div>
                        </div>

                        {/* Clean Single Specification Strip */}
                        <div className="hires-spec-table">
                            <div className="hires-spec-cell">
                                <span className="hires-spec-label">Resolusi Akhir Target</span>
                                <span className="hires-spec-val">
                                    {hiresW} × {hiresH} px
                                </span>
                                <span className="hires-spec-sub">{hiresMegapixels} • Rasio Konsisten</span>
                            </div>

                            <div className="hires-spec-cell">
                                <span className="hires-spec-label">Ukuran Latent Upscale</span>
                                <span className="hires-spec-val" style={{ color: "#f4f4f5" }}>
                                    {latentHiresW} × {latentHiresH}
                                </span>
                                <span className="hires-spec-sub">Habis dibagi 8 VAE</span>
                            </div>

                            <div className="hires-spec-cell">
                                <span className="hires-spec-label">Rekomendasi Denoise</span>
                                <span className="hires-spec-val" style={{ color: "#34d399" }}>
                                    {denoiseRange}
                                </span>
                                <span className="hires-spec-sub">Upscaler: 4x-AnimeSharp</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Visual Frame & Consolidated Latent Specs */}
                <div className="calc-right-col">
                    <div className="calc-card">
                        <div className="calc-card-header">
                            <h2 className="calc-card-title">Visualisasi Frame Rasio</h2>
                            <span style={{ fontSize: "11px", color: "#a1a1aa", fontFamily: "ui-monospace, monospace" }}>
                                {ratioInfo.nominal}
                            </span>
                        </div>

                        {/* Visual Stage */}
                        <div className="canvas-wireframe-stage">
                            <div className="canvas-grid-bg" />
                            <div
                                className="wireframe-box"
                                style={{
                                    width: `${wireframeWidth}px`,
                                    height: `${wireframeHeight}px`,
                                }}
                            >
                                <span className="wireframe-res-text">
                                    {width} × {height}
                                </span>
                                <span className="wireframe-ratio-text">
                                    ~{ratioInfo.nominal} ({ratioInfo.exactRatio})
                                </span>
                            </div>
                        </div>

                        {/* Consolidated Latent Specification Table */}
                        <div className="calc-spec-table">
                            <div className="spec-table-row">
                                <span className="spec-row-label">Total Piksel</span>
                                <span className="spec-row-val">
                                    {totalPixels.toLocaleString("id-ID")} px ({megapixels})
                                </span>
                            </div>

                            <div className="spec-table-row">
                                <span className="spec-row-label">Rasio Aspek</span>
                                <span className="spec-row-val">
                                    ~{ratioInfo.nominal} (Eksak {ratioInfo.exactRatio} | {ratioInfo.decimal})
                                </span>
                            </div>

                            <div className="spec-table-row">
                                <span className="spec-row-label">Dimensi Latent VAE (÷8)</span>
                                <span className="spec-row-val">
                                    {latentWidth} × {latentHeight} blok latent
                                </span>
                            </div>

                            <div className="spec-table-row">
                                <span className="spec-row-label">Validasi Kelipatan</span>
                                <span className={`status-pill ${isDiv64 ? "optimal" : isDiv8 ? "neutral" : "warning"}`}>
                                    {isDiv64
                                        ? "✓ Kelipatan 64px & 8px (Ideal UNet/DiT)"
                                        : isDiv8
                                        ? "✓ Kelipatan 8px (Kompatibel VAE)"
                                        : "⚠ Bukan Kelipatan 8px (Risiko Artefak Padding)"}
                                </span>
                            </div>

                            <div className="spec-table-row multiline">
                                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                                    <span className="spec-row-label">Estimasi VRAM</span>
                                    <span className="spec-row-val" style={{ color: "#60a5fa" }}>
                                        {statusAssessment.vram}
                                    </span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                                    <span className={`status-pill ${statusAssessment.pillClass}`}>
                                        {statusAssessment.badge}
                                    </span>
                                </div>
                                <p className="spec-desc-text" style={{ marginTop: "4px" }}>
                                    {statusAssessment.desc}
                                </p>
                            </div>
                        </div>

                        {/* Quick Action Copy Buttons */}
                        <div className="calc-copy-section">
                            {/* Primary Button */}
                            <button
                                type="button"
                                className={`btn-copy-primary ${copiedKey === "res" ? "copied" : ""}`}
                                onClick={() => triggerCopy(`${width}x${height}`, "res")}
                            >
                                {copiedKey === "res"
                                    ? "✓ Resolusi Berhasil Disalin!"
                                    : `Salin Resolusi (${width}x${height})`}
                            </button>

                            {/* Secondary Row 1: Width & Height */}
                            <div className="btn-copy-grid-2">
                                <button
                                    type="button"
                                    className={`btn-copy-secondary ${copiedKey === "w" ? "copied" : ""}`}
                                    onClick={() => triggerCopy(width.toString(), "w")}
                                >
                                    {copiedKey === "w" ? "✓ Tersalin!" : `Salin Lebar (${width})`}
                                </button>
                                <button
                                    type="button"
                                    className={`btn-copy-secondary ${copiedKey === "h" ? "copied" : ""}`}
                                    onClick={() => triggerCopy(height.toString(), "h")}
                                >
                                    {copiedKey === "h" ? "✓ Tersalin!" : `Salin Tinggi (${height})`}
                                </button>
                            </div>

                            {/* Secondary Row 2: A1111/Forge & ComfyUI Latent Node */}
                            <div className="btn-copy-grid-2">
                                <button
                                    type="button"
                                    className={`btn-copy-secondary ${copiedKey === "a1111" ? "copied" : ""}`}
                                    onClick={() =>
                                        triggerCopy(`--width ${width} --height ${height}`, "a1111")
                                    }
                                >
                                    {copiedKey === "a1111" ? "✓ Format CLI Tersalin!" : "Format A1111 / Forge"}
                                </button>
                                <button
                                    type="button"
                                    className={`btn-copy-secondary ${copiedKey === "comfy" ? "copied" : ""}`}
                                    onClick={() =>
                                        triggerCopy(
                                            JSON.stringify(
                                                {
                                                    class_type: "EmptyLatentImage",
                                                    inputs: { width, height, batch_size: 1 },
                                                },
                                                null,
                                                2
                                            ),
                                            "comfy"
                                        )
                                    }
                                >
                                    {copiedKey === "comfy" ? "✓ JSON ComfyUI Tersalin!" : "Node Latent ComfyUI (JSON)"}
                                </button>
                            </div>

                            {/* Hi-Res Output Copy */}
                            <button
                                type="button"
                                className={`btn-copy-secondary ${copiedKey === "hires" ? "copied" : ""}`}
                                onClick={() => triggerCopy(`${hiresW}x${hiresH}`, "hires")}
                            >
                                {copiedKey === "hires"
                                    ? "✓ Resolusi Hi-Res Tersalin!"
                                    : `Salin Resolusi Hi-Res (${hiresW}x${hiresH})`}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
