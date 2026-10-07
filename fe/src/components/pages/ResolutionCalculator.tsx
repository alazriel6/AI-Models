import { useState, useMemo } from "react";
import "../../style/ResolutionCalculator.css";

interface BucketPreset {
    label: string;
    ratio: string;
    width: number;
    height: number;
    popular?: boolean;
}

const SDXL_PRESETS: BucketPreset[] = [
    { label: "1:1 Square", ratio: "1:1", width: 1024, height: 1024 },
    { label: "2:3 Portrait", ratio: "2:3", width: 832, height: 1216, popular: true },
    { label: "3:2 Landscape", ratio: "3:2", width: 1216, height: 832 },
    { label: "3:4 Portrait", ratio: "3:4", width: 896, height: 1152 },
    { label: "4:3 Landscape", ratio: "4:3", width: 1152, height: 896 },
    { label: "9:16 Story / Reel", ratio: "9:16", width: 768, height: 1344, popular: true },
    { label: "16:9 Widescreen", ratio: "16:9", width: 1344, height: 768 },
    { label: "1:2 Tall Portrait", ratio: "1:2", width: 704, height: 1408 },
    { label: "21:9 Ultrawide", ratio: "21:9", width: 1536, height: 640 },
];

const SD15_PRESETS: BucketPreset[] = [
    { label: "1:1 Square", ratio: "1:1", width: 512, height: 512, popular: true },
    { label: "2:3 Portrait", ratio: "2:3", width: 512, height: 768, popular: true },
    { label: "3:2 Landscape", ratio: "3:2", width: 768, height: 512 },
    { label: "9:16 Wallpaper", ratio: "9:16", width: 512, height: 912 },
    { label: "16:9 Widescreen", ratio: "16:9", width: 912, height: 512 },
];

export default function ResolutionCalculator() {
    const [arch, setArch] = useState<"sdxl" | "sd15" | "flux">("sdxl");
    const [width, setWidth] = useState<number>(832);
    const [height, setHeight] = useState<number>(1216);
    const [hiresScale, setHiresScale] = useState<number>(1.5);
    const [snap64, setSnap64] = useState<boolean>(true);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const presets = arch === "sd15" ? SD15_PRESETS : SDXL_PRESETS;

    // Nearest 64 rounder
    const round64 = (val: number) => Math.max(64, Math.round(val / 64) * 64);

    const handleSelectPreset = (p: BucketPreset) => {
        setWidth(p.width);
        setHeight(p.height);
    };

    const handleWidthChange = (val: number) => {
        const finalVal = snap64 ? round64(val) : Math.max(64, val);
        setWidth(finalVal);
    };

    const handleHeightChange = (val: number) => {
        const finalVal = snap64 ? round64(val) : Math.max(64, val);
        setHeight(finalVal);
    };

    // Calculations
    const totalPixels = width * height;
    const megapixels = (totalPixels / 1000000).toFixed(2);
    const latentWidth = Math.floor(width / 8);
    const latentHeight = Math.floor(height / 8);

    // Highres fix target
    const hiresW = round64(Math.round(width * hiresScale));
    const hiresH = round64(Math.round(height * hiresScale));
    const hiresMegapixels = ((hiresW * hiresH) / 1000000).toFixed(2);

    // Aspect ratio calculation
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(width, height);
    const aspectRatioStr = `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;

    // VRAM and Safety Assessment
    const vramStatus = useMemo(() => {
        const targetBudget = arch === "sd15" ? 262144 : 1048576;
        const ratio = totalPixels / targetBudget;

        if (arch === "sd15") {
            if (ratio <= 1.2) {
                return {
                    level: "safe",
                    badge: "4 - 6 GB VRAM",
                    desc: "Optimal untuk SD 1.5. Bebas dari distorsi dan mutasi anatomi ganda.",
                };
            }
            return {
                level: "medium",
                badge: "6 - 8 GB VRAM",
                desc: "Di atas budget standar SD 1.5. Sebaiknya gunakan Hi-Res Fix daripada menaikkan resolusi dasar.",
            };
        }

        // SDXL / Illustrious / Pony
        if (ratio >= 0.85 && ratio <= 1.15) {
            return {
                level: "safe",
                badge: "8 - 10 GB VRAM",
                desc: "Sweet spot optimal SDXL & Illustrious. Komposisi seimbang, anatomi stabil, tanpa double heads.",
            };
        } else if (ratio < 0.85) {
            return {
                level: "safe",
                badge: "6 - 8 GB VRAM",
                desc: "Di bawah budget 1 MP. Sangat cepat, namun detail kecil mungkin kurang tajam.",
            };
        } else {
            return {
                level: "heavy",
                badge: "12 - 16+ GB VRAM",
                desc: "Melebihi budget 1 MP dasar. Risiko tinggi muncul kepala ganda (double heads) atau badan terduplikasi! Disarankan pakai Hi-Res Fix.",
            };
        }
    }, [arch, totalPixels]);

    // Copy action
    const triggerCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 1800);
    };

    // Calculate wireframe preview dimensions (constrained to max 200x200)
    const previewScale = Math.min(180 / width, 180 / height);
    const wireframeWidth = Math.max(50, Math.round(width * previewScale));
    const wireframeHeight = Math.max(50, Math.round(height * previewScale));

    return (
        <div className="calc-container">
            {/* Header */}
            <div className="calc-header">
                <h1 className="calc-title">
                    <span className="calc-title-icon">📐</span>
                    Aspect Ratio & Resolution Calculator
                </h1>
                <p className="calc-subtitle">
                    Kalkulator ukuran optimal (bucket resolution) untuk pipeline <strong>SDXL, Illustrious-XL, Pony, NoobAI</strong>, dan <strong>SD 1.5</strong>.
                    Mencegah duplikasi kepala (double heads) dan menjaga rasio latent VAE tepat kelipatan 64/8.
                </p>

                {/* Architecture Selector */}
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
                        Illustrious-XL / SDXL / Pony (~1.0 MP)
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
                        Flux.1 (~1.0 MP)
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
                        Stable Diffusion 1.5 (~0.26 MP)
                    </button>
                </div>
            </div>

            {/* Main Interactive Grid */}
            <div className="calc-main-grid">
                {/* Left Column: Bucket Presets & Custom Sliders */}
                <div className="calc-left-col">
                    {/* Standard Bucket Cards */}
                    <div className="calc-section-card">
                        <div className="calc-section-title">
                            <span>Standard Aspect Ratio Buckets</span>
                            <span style={{ fontSize: "11px", color: "#4ade80" }}>100% Native SDXL Trained</span>
                        </div>

                        <div className="bucket-cards-grid">
                            {presets.map((p, idx) => {
                                const isCurrent = width === p.width && height === p.height;
                                return (
                                    <div
                                        key={idx}
                                        className={`bucket-preset-card ${isCurrent ? "active" : ""}`}
                                        onClick={() => handleSelectPreset(p)}
                                    >
                                        <div className="bucket-aspect-icon-wrap">
                                            <div
                                                style={{
                                                    width: Math.min(26, Math.max(12, Math.round(24 * (p.width / p.height)))),
                                                    height: Math.min(26, Math.max(12, Math.round(24 * (p.height / p.width)))),
                                                    border: `1.5px solid ${isCurrent ? "#22c55e" : "#818cf8"}`,
                                                    borderRadius: "2px",
                                                    background: isCurrent ? "rgba(34, 197, 94, 0.2)" : "transparent",
                                                }}
                                            />
                                        </div>
                                        <span className="bucket-ratio-label">{p.label}</span>
                                        <span className="bucket-dim-label">
                                            {p.width} × {p.height}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Fine-Tuning Sliders */}
                    <div className="calc-section-card">
                        <div className="calc-section-title">
                            <span>Manual Resolution Adjuster</span>
                            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: "11px", color: "#909296" }}>
                                <input
                                    type="checkbox"
                                    checked={snap64}
                                    onChange={(e) => setSnap64(e.target.checked)}
                                    style={{ accentColor: "#22c55e" }}
                                />
                                <span>Snap to 64px Multiples (Recommended)</span>
                            </label>
                        </div>

                        {/* Width Slider */}
                        <div className="slider-control-group">
                            <div className="slider-label-row">
                                <span>Width</span>
                                <span className="slider-val-badge">{width} px</span>
                            </div>
                            <input
                                type="range"
                                min={arch === "sd15" ? 256 : 512}
                                max={arch === "sd15" ? 1024 : 1792}
                                step={snap64 ? 64 : 8}
                                value={width}
                                onChange={(e) => handleWidthChange(Number(e.target.value))}
                                className="calc-range-input"
                            />
                        </div>

                        {/* Height Slider */}
                        <div className="slider-control-group">
                            <div className="slider-label-row">
                                <span>Height</span>
                                <span className="slider-val-badge">{height} px</span>
                            </div>
                            <input
                                type="range"
                                min={arch === "sd15" ? 256 : 512}
                                max={arch === "sd15" ? 1024 : 1792}
                                step={snap64 ? 64 : 8}
                                value={height}
                                onChange={(e) => handleHeightChange(Number(e.target.value))}
                                className="calc-range-input"
                            />
                        </div>
                    </div>

                    {/* Hi-Res Fix Upscale Calculator */}
                    <div className="calc-section-card">
                        <div className="calc-section-title">
                            <span>Hi-Res Fix / Upscale Scale Factor</span>
                            <span style={{ fontSize: "11px", color: "#909296" }}>Denoise: 0.35 - 0.45</span>
                        </div>

                        <div style={{ display: "flex", gap: "8px" }}>
                            {[1.5, 1.75, 2.0].map((scale) => (
                                <button
                                    key={scale}
                                    type="button"
                                    className={`calc-arch-btn ${hiresScale === scale ? "active" : ""}`}
                                    onClick={() => setHiresScale(scale)}
                                    style={{ flex: 1, padding: "8px 12px", textAlign: "center" }}
                                >
                                    <strong>{scale}x Scale</strong>
                                </button>
                            ))}
                        </div>

                        <div style={{ background: "#131518", border: "1px solid #282C34", borderRadius: "8px", padding: "14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                            <div>
                                <span style={{ fontSize: "10px", color: "#666c75", textTransform: "uppercase" }}>Target Hi-Res Output</span>
                                <div style={{ fontSize: "14px", fontWeight: "700", color: "#4ade80", fontFamily: "ui-monospace, monospace" }}>
                                    {hiresW} × {hiresH}
                                </div>
                                <span style={{ fontSize: "11px", color: "#909296" }}>({hiresMegapixels} MP)</span>
                            </div>

                            <div>
                                <span style={{ fontSize: "10px", color: "#666c75", textTransform: "uppercase" }}>Recommended Upscaler</span>
                                <div style={{ fontSize: "13px", fontWeight: "600", color: "#ffffff" }}>
                                    4x-AnimeSharp
                                </div>
                                <span style={{ fontSize: "11px", color: "#909296" }}>Hires Steps: 10 - 15</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Visual Wireframe & Specs */}
                <div className="calc-right-col">
                    <div className="calc-preview-card">
                        {/* Dynamic Wireframe Box */}
                        <div className="canvas-wireframe-stage">
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
                                    {aspectRatioStr}
                                </span>
                            </div>
                        </div>

                        {/* Specs Matrix */}
                        <div className="calc-spec-matrix">
                            <div className="calc-matrix-cell">
                                <span className="matrix-label">Total Pixels</span>
                                <span className="matrix-val">{megapixels} MP</span>
                            </div>
                            <div className="calc-matrix-cell">
                                <span className="matrix-label">Aspect Ratio</span>
                                <span className="matrix-val">{aspectRatioStr}</span>
                            </div>
                            <div className="calc-matrix-cell">
                                <span className="matrix-label">Latent VAE Size</span>
                                <span className="matrix-val">{latentWidth} × {latentHeight}</span>
                            </div>
                            <div className="calc-matrix-cell">
                                <span className="matrix-label">Target Architecture</span>
                                <span className="matrix-val">{arch.toUpperCase()}</span>
                            </div>
                        </div>

                        {/* VRAM Estimator Box */}
                        <div className="vram-box">
                            <div className="vram-header">
                                <span>Estimated GPU VRAM</span>
                                <span className={`vram-badge ${vramStatus.level}`}>
                                    {vramStatus.badge}
                                </span>
                            </div>
                            <p className="vram-desc">{vramStatus.desc}</p>
                        </div>

                        {/* 1-Click Clipboard Actions */}
                        <div className="calc-actions-row">
                            <button
                                type="button"
                                className="calc-action-btn primary"
                                onClick={() => triggerCopy(`${width}x${height}`, "res")}
                            >
                                {copiedKey === "res" ? "✓ Resolution Copied!" : `Copy Resolution: ${width}x${height}`}
                            </button>

                            <button
                                type="button"
                                className="calc-action-btn secondary"
                                onClick={() => triggerCopy(`Width: ${width}, Height: ${height}`, "webui")}
                            >
                                {copiedKey === "webui" ? "✓ WebUI Format Copied!" : "Copy WebUI Setting Format"}
                            </button>

                            <button
                                type="button"
                                className="calc-action-btn secondary"
                                onClick={() =>
                                    triggerCopy(
                                        JSON.stringify({ class_type: "EmptyLatentImage", inputs: { width, height, batch_size: 1 } }, null, 2),
                                        "comfy"
                                    )
                                }
                            >
                                {copiedKey === "comfy" ? "✓ ComfyUI Node Snippet Copied!" : "Copy ComfyUI Latent Node JSON"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
