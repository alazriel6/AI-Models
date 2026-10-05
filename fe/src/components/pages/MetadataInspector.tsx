import { useState, useEffect, useRef, useCallback } from "react";
import { parseImageMetadataApi, type ParsedImageMetadata } from "../../api/admin";
import "../../style/MetadataInspector.css";

// Clean technical SVG icons
const Icons = {
    Inspector: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
    ),
    UploadCloud: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 16 12 12 8 16" />
            <line x1="12" y1="12" x2="12" y2="21" />
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
            <polyline points="16 16 12 12 8 16" />
        </svg>
    ),
    Copy: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
    ),
    Check: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
    Download: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
    ),
    Trash: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
    ),
    Layers: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
        </svg>
    ),
    Code: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
        </svg>
    ),
    Info: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    ),
};

export default function MetadataInspector() {
    const [mode, setMode] = useState<"upload" | "paste">("upload");
    const [pastedText, setPastedText] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Selected file & preview
    const [currentFile, setCurrentFile] = useState<{
        name: string;
        size: number;
        url?: string;
        format?: string;
    } | null>(null);

    // Parsed results
    const [metaResult, setMetaResult] = useState<ParsedImageMetadata | null>(null);
    const [activeTab, setActiveTab] = useState<"params" | "workflow" | "raw" | "chunks">("params");
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleCopy = (text: string, key: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const handleProcessFile = useCallback(async (file: File) => {
        setIsLoading(true);
        setErrorMsg(null);
        // CRITICAL: Immediately wipe previous file's metadata to prevent state leak
        setMetaResult(null);

        // Create local object URL for preview if image
        let previewUrl: string | undefined = undefined;
        if (file.type.startsWith("image/")) {
            previewUrl = URL.createObjectURL(file);
        }

        const fileExt = file.name.split(".").pop()?.toUpperCase() || "IMAGE";

        setCurrentFile({
            name: file.name,
            size: file.size,
            url: previewUrl,
            format: fileExt,
        });

        try {
            const res = await parseImageMetadataApi(file);
            setMetaResult(res.metadata);
            setActiveTab("params");
        } catch (err: any) {
            console.error("Metadata parsing failed:", err);
            // Construct a clean, empty metadata object for this file so previous metadata is NEVER retained!
            setMetaResult({
                source: "unknown",
                format: fileExt.toLowerCase(),
                positive_prompt: "",
                negative_prompt: "",
                raw_chunks: {},
                extra_params: {},
            });
            setErrorMsg(err?.message || "File ini tidak memiliki metadata generasi AI tertanam.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Global Paste Listener (Ctrl+V)
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
                const file = e.clipboardData.files[0];
                handleProcessFile(file);
            }
        };

        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, [handleProcessFile]);

    // Handle Drop
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleProcessFile(e.dataTransfer.files[0]);
        }
    };

    // Handle Text Paste Parsing
    const handleParseText = async () => {
        if (!pastedText.trim()) return;
        const blob = new Blob([pastedText], { type: "text/plain" });
        const textFile = new File([blob], "pasted_generation_parameters.txt", { type: "text/plain" });
        await handleProcessFile(textFile);
    };

    // Load Demo Generation Sample
    const handleLoadDemo = () => {
        const demoMeta: ParsedImageMetadata = {
            source: "comfyui",
            format: "png",
            positive_prompt:
                "masterpiece, best quality, 1girl, solo, anime aesthetic, luminous eyes, dynamic wind, fluttering ribbon, cherry blossoms, neon bokeh background, cinematic soft lighting <lora:illustrious_v2_booster:0.85>",
            negative_prompt:
                "worst quality, low quality, normal quality, blurry, deformed limbs, extra fingers, watermark, signature, username",
            steps: 28,
            sampler: "Euler a",
            scheduler: "Normal",
            cfg_scale: 7.0,
            seed: 38491204812,
            width: 832,
            height: 1216,
            model_name: "Illustrious-XL-v1.0.safetensors",
            model_hash: "d74d816a13",
            clip_skip: 2,
            denoising_strength: 0.7,
            hires_upscale: 1.5,
            hires_steps: 15,
            hires_upscaler: "4x-AnimeSharp",
            vae: "sdxl_vae.safetensors",
            loras: [{ name: "illustrious_v2_booster", weight: 0.85 }],
            workflow_json: JSON.stringify(
                {
                    nodes: [
                        { id: 3, type: "KSampler", title: "KSampler (Main Generation)" },
                        { id: 4, type: "CheckpointLoaderSimple", title: "Load Illustrious Checkpoint" },
                        { id: 5, type: "EmptyLatentImage", title: "Latent 832x1216" },
                        { id: 6, type: "CLIPTextEncode", title: "Positive Conditioning" },
                        { id: 7, type: "CLIPTextEncode", title: "Negative Conditioning" },
                        { id: 8, type: "LoraLoader", title: "Apply LoRA" },
                    ],
                },
                null,
                2
            ),
            raw_prompt:
                "masterpiece, best quality, 1girl, solo, anime aesthetic, luminous eyes...\nNegative prompt: worst quality, low quality...\nSteps: 28, Sampler: Euler a, Schedule type: Normal, CFG scale: 7, Seed: 38491204812, Size: 832x1216, Model: Illustrious-XL-v1.0, Model hash: d74d816a13",
            raw_chunks: {
                prompt: '{"3": {"class_type": "KSampler", "inputs": {"seed": 38491204812, "steps": 28, "cfg": 7.0}}}',
                parameters: "Steps: 28, Sampler: Euler a, CFG scale: 7, Seed: 38491204812",
                Software: "ComfyUI v0.2.4",
            },
            extra_params: {
                "Schedule type": "Normal",
                "Model hash": "d74d816a13",
                "Clip skip": "2",
                "Hires upscaler": "4x-AnimeSharp",
                VAE: "sdxl_vae.safetensors",
            },
        };

        setCurrentFile({
            name: "demo_illustrious_generation.png",
            size: 3412500,
            url: undefined,
            format: "PNG",
        });
        setMetaResult(demoMeta);
        setActiveTab("params");
        setErrorMsg(null);
    };

    const handleDownloadWorkflow = () => {
        if (!metaResult?.workflow_json && !metaResult?.prompt_json) return;
        const content = metaResult.workflow_json || metaResult.prompt_json || "{}";
        const blob = new Blob([content], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${currentFile?.name.replace(/\.[^/.]+$/, "") || "comfyui"}_workflow.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const formatBytes = (bytes: number) => {
        if (!bytes || bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    return (
        <div className="inspector-container">
            {/* Header */}
            <div className="inspector-header">
                <div className="inspector-title-row">
                    <h1 className="inspector-title">
                        <span className="inspector-title-icon">
                            <Icons.Inspector />
                        </span>
                        Metadata Inspector & Prompt Reader
                    </h1>

                    <button type="button" className="demo-sample-btn" onClick={handleLoadDemo} title="Load interactive demo generation parameters">
                        ✦ Load Demo Generation
                    </button>
                </div>
                <p className="inspector-subtitle">
                    Inspeksi dan ekstrak seluruh metadata hasil generasi AI secara instan. Mendukung format gambar multi-ekstensi (PNG, WebP, JPEG) dan workflow JSON.
                </p>

                <div className="inspector-format-badges">
                    <span className="format-pill highlight">PNG (tEXt / iTXt / zTXt)</span>
                    <span className="format-pill highlight">WEBP (EXIF / XMP)</span>
                    <span className="format-pill highlight">JPEG (APP1 / COM)</span>
                    <span className="format-pill highlight">ComfyUI (.json)</span>
                    <span className="format-pill">Automatic1111 / Forge</span>
                    <span className="format-pill">NovelAI</span>
                    <span className="format-pill">Fooocus</span>
                    <span className="format-pill">Client-Safe (In-Memory)</span>
                </div>
            </div>

            {/* Input Selection Bar */}
            <div className="inspector-mode-bar">
                <div className="inspector-tabs-toggle">
                    <button
                        type="button"
                        className={`mode-tab-btn ${mode === "upload" ? "active" : ""}`}
                        onClick={() => setMode("upload")}
                    >
                        <span>File Upload / Drag & Drop</span>
                    </button>
                    <button
                        type="button"
                        className={`mode-tab-btn ${mode === "paste" ? "active" : ""}`}
                        onClick={() => setMode("paste")}
                    >
                        <span>Paste Raw Text / JSON</span>
                    </button>
                </div>

                {currentFile && (
                    <button
                        type="button"
                        className="demo-sample-btn"
                        onClick={() => {
                            setCurrentFile(null);
                            setMetaResult(null);
                            setErrorMsg(null);
                            setPastedText("");
                        }}
                    >
                        <Icons.Trash />
                        <span>Reset / Clear</span>
                    </button>
                )}
            </div>

            {/* Dropzone Mode */}
            {mode === "upload" && (
                <div
                    className={`inspector-dropzone ${isDragging ? "dragging" : ""}`}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/webp,image/jpeg,image/jpg,application/json,text/plain"
                        style={{ display: "none" }}
                        onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                                handleProcessFile(e.target.files[0]);
                                e.target.value = "";
                            }
                        }}
                    />

                    <div className="dropzone-icon-box">
                        <Icons.UploadCloud />
                    </div>

                    <div className="dropzone-main-text">
                        {isLoading ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                                <span className="inspector-spinner"></span>
                                Membaca dan menganalisis metadata...
                            </span>
                        ) : (
                            "Tarik & Lepas gambar di sini, atau klik untuk memilih file"
                        )}
                    </div>
                    <div className="dropzone-sub-text">
                        Mendukung PNG (ComfyUI / WebUI), WebP, JPEG dengan embedded EXIF/XMP, serta file ComfyUI Workflow JSON.
                    </div>

                    <div className="dropzone-paste-hint">
                        <span>Tip: Tekan <strong>Ctrl + V</strong> untuk langsung mem-paste gambar dari clipboard</span>
                    </div>
                </div>
            )}

            {/* Text Paste Mode */}
            {mode === "paste" && (
                <div className="inspector-paste-box">
                    <textarea
                        className="paste-textarea"
                        placeholder="Paste parameter teks Automatic1111 / WebUI atau ComfyUI Prompt JSON di sini..."
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                    />
                    <div className="paste-actions-row">
                        <button
                            type="button"
                            className="mode-tab-btn active"
                            onClick={handleParseText}
                            disabled={!pastedText.trim() || isLoading}
                            style={{ padding: "8px 18px", fontSize: 13 }}
                        >
                            {isLoading ? "Menganalisis..." : "Parse Metadata Text"}
                        </button>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {errorMsg && (
                <div
                    style={{
                        marginTop: "18px",
                        padding: "12px 16px",
                        background: "rgba(239, 68, 68, 0.08)",
                        border: "1px solid rgba(239, 68, 68, 0.25)",
                        borderRadius: "8px",
                        color: "#f87171",
                        fontSize: "13px",
                    }}
                >
                    {errorMsg}
                </div>
            )}

            {/* Results Grid */}
            {metaResult && currentFile && (
                <div className="inspector-results-grid">
                    {/* Left Column: Image Preview & Details */}
                    <div className="inspector-left-panel">
                        <div className="preview-card">
                            <div className="preview-image-wrap">
                                {currentFile.url ? (
                                    <img src={currentFile.url} alt={currentFile.name} className="preview-img" />
                                ) : (
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            padding: "40px 20px",
                                            color: "#666c75",
                                            gap: "10px",
                                        }}
                                    >
                                        <Icons.Layers />
                                        <span style={{ fontSize: 13 }}>Workflow / Text Source</span>
                                    </div>
                                )}
                            </div>

                            <div className="preview-meta-body">
                                <h3 className="preview-file-name" title={currentFile.name}>
                                    {currentFile.name}
                                </h3>
                                <div style={{ fontSize: "11px", color: "#666c75", fontFamily: "ui-monospace, monospace" }}>
                                    Size: {formatBytes(currentFile.size)}
                                </div>

                                <div className="preview-tags-row">
                                    <span className="tag-badge tag-format">{metaResult.format?.toUpperCase() || currentFile.format}</span>
                                    <span
                                        className={`tag-badge ${
                                            metaResult.source === "comfyui"
                                                ? "tag-source-comfyui"
                                                : metaResult.source === "a1111"
                                                ? "tag-source-a1111"
                                                : metaResult.source === "novelai"
                                                ? "tag-source-novelai"
                                                : "tag-source-other"
                                        }`}
                                    >
                                        {metaResult.source === "comfyui"
                                            ? "ComfyUI"
                                            : metaResult.source === "a1111"
                                            ? "Automatic1111 / Forge"
                                            : metaResult.source === "novelai"
                                            ? "NovelAI"
                                            : "Custom Generator"}
                                    </span>
                                    {metaResult.width && metaResult.height ? (
                                        <span className="tag-badge tag-format">
                                            {metaResult.width} × {metaResult.height}
                                        </span>
                                    ) : null}
                                </div>

                                <div className="preview-actions-column">
                                    {metaResult.positive_prompt && (
                                        <button
                                            type="button"
                                            className="preview-btn preview-btn-primary"
                                            onClick={() => handleCopy(metaResult.positive_prompt || "", "left-pos")}
                                        >
                                            {copiedKey === "left-pos" ? <Icons.Check /> : <Icons.Copy />}
                                            <span>Copy Positive Prompt</span>
                                        </button>
                                    )}

                                    {(metaResult.workflow_json || metaResult.prompt_json) && (
                                        <button
                                            type="button"
                                            className="preview-btn preview-btn-primary"
                                            onClick={handleDownloadWorkflow}
                                        >
                                            <Icons.Download />
                                            <span>Download Workflow (.json)</span>
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        className="preview-btn preview-btn-secondary"
                                        onClick={() => {
                                            setCurrentFile(null);
                                            setMetaResult(null);
                                        }}
                                    >
                                        <Icons.Trash />
                                        <span>Inspect Another Image</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Inspector Tabs */}
                    <div className="inspector-right-panel">
                        <div className="inspector-tabs-header">
                            <button
                                type="button"
                                className={`inspector-tab-item ${activeTab === "params" ? "active" : ""}`}
                                onClick={() => setActiveTab("params")}
                            >
                                <Icons.Inspector />
                                <span>Parameters & Prompt</span>
                            </button>

                            {(metaResult.workflow_json || metaResult.prompt_json) && (
                                <button
                                    type="button"
                                    className={`inspector-tab-item ${activeTab === "workflow" ? "active" : ""}`}
                                    onClick={() => setActiveTab("workflow")}
                                >
                                    <Icons.Layers />
                                    <span>ComfyUI Node Graph</span>
                                </button>
                            )}

                            {metaResult.raw_prompt && (
                                <button
                                    type="button"
                                    className={`inspector-tab-item ${activeTab === "raw" ? "active" : ""}`}
                                    onClick={() => setActiveTab("raw")}
                                >
                                    <Icons.Code />
                                    <span>Raw Parameters Block</span>
                                </button>
                            )}

                            {metaResult.raw_chunks && Object.keys(metaResult.raw_chunks).length > 0 && (
                                <button
                                    type="button"
                                    className={`inspector-tab-item ${activeTab === "chunks" ? "active" : ""}`}
                                    onClick={() => setActiveTab("chunks")}
                                >
                                    <span>All Chunks & EXIF</span>
                                    <span className="inspector-tab-count">
                                        {Object.keys(metaResult.raw_chunks).length}
                                    </span>
                                </button>
                            )}
                        </div>

                        <div className="inspector-tab-body">
                            {/* Tab 1: Parameters & Prompt */}
                            {activeTab === "params" && (
                                <>
                                    {/* Diagnostic Alert if Image Metadata is Missing/Stripped */}
                                    {!metaResult.positive_prompt && !metaResult.workflow_json && !metaResult.raw_prompt && (!metaResult.steps || metaResult.steps === 0) && (
                                        <div className="inspector-stripped-alert">
                                            <div className="stripped-alert-header">
                                                <Icons.Info />
                                                <span>Metadata Generasi Tidak Ditemukan (File Polos / Stripped)</span>
                                            </div>
                                            <p className="stripped-alert-desc">
                                                Gambar ini valid dan berhasil dibaca ({metaResult.width} × {metaResult.height}), namun <strong>tidak memiliki chunk metadata generasi AI</strong> (tEXt/EXIF/ComfyUI).
                                            </p>
                                            <div className="stripped-reasons-list">
                                                <div className="stripped-reason-item">
                                                    <strong>1. Kompresi & Pembersihan oleh Platform (Pixiv, Twitter/X, Reddit, Discord):</strong>
                                                    <span>Hampir semua platform media sosial secara otomatis menghapus (scrubbing) seluruh metadata non-standar saat gambar diunggah demi privasi dan penghematan bandwidth CDN server mereka.</span>
                                                </div>
                                                <div className="stripped-reason-item">
                                                    <strong>2. Kreator Sengaja Menghapusnya:</strong>
                                                    <span>Banyak kreator AI mencentang opsi <em>"Strip Metadata"</em> di WebUI/ComfyUI atau mengeditnya di Photoshop/Canva sebelum upload agar prompt dan racikan LoRA mereka tidak dicontek orang lain.</span>
                                                </div>
                                                <div className="stripped-reason-item">
                                                    <strong>3. Mengunduh Versi Web Preview (Bukan File Master Asli):</strong>
                                                    <span>Menyimpan gambar dari klik kanan preview feed web atau screenshot Snipping Tool hanya mengunduh piksel tampilan tanpa menyertakan chunk data asli generator.</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Positive Prompt */}
                                    <div className="inspector-section">
                                        <div className="inspector-section-title">
                                            <span>Positive Prompt</span>
                                            {metaResult.positive_prompt && (
                                                <button
                                                    type="button"
                                                    className={`copy-mini-btn ${copiedKey === "tab-pos" ? "copied" : ""}`}
                                                    onClick={() => handleCopy(metaResult.positive_prompt || "", "tab-pos")}
                                                >
                                                    {copiedKey === "tab-pos" ? <Icons.Check /> : <Icons.Copy />}
                                                    <span>{copiedKey === "tab-pos" ? "Copied" : "Copy"}</span>
                                                </button>
                                            )}
                                        </div>
                                        <div className="inspector-prompt-block">
                                            {metaResult.positive_prompt || (
                                                <span style={{ color: "#666c75" }}>Tidak ada positive prompt ditemukan</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Negative Prompt */}
                                    {metaResult.negative_prompt && (
                                        <div className="inspector-section">
                                            <div className="inspector-section-title">
                                                <span>Negative Prompt</span>
                                                <button
                                                    type="button"
                                                    className={`copy-mini-btn ${copiedKey === "tab-neg" ? "copied" : ""}`}
                                                    onClick={() => handleCopy(metaResult.negative_prompt || "", "tab-neg")}
                                                >
                                                    {copiedKey === "tab-neg" ? <Icons.Check /> : <Icons.Copy />}
                                                    <span>{copiedKey === "tab-neg" ? "Copied" : "Copy"}</span>
                                                </button>
                                            </div>
                                            <div className="inspector-prompt-block negative">
                                                {metaResult.negative_prompt}
                                            </div>
                                        </div>
                                    )}

                                    {/* Generation Core Parameters Grid */}
                                    <div className="inspector-section">
                                        <div className="inspector-section-title">
                                            <span>Generation Settings</span>
                                        </div>
                                        <div className="params-meta-grid">
                                            {metaResult.steps !== undefined && metaResult.steps > 0 && (
                                                <div className="param-meta-cell">
                                                    <span className="param-cell-label">Steps</span>
                                                    <span className="param-cell-value">{metaResult.steps}</span>
                                                </div>
                                            )}
                                            {metaResult.sampler && (
                                                <div className="param-meta-cell">
                                                    <span className="param-cell-label">Sampler</span>
                                                    <span className="param-cell-value">{metaResult.sampler}</span>
                                                </div>
                                            )}
                                            {metaResult.scheduler && (
                                                <div className="param-meta-cell">
                                                    <span className="param-cell-label">Scheduler</span>
                                                    <span className="param-cell-value">{metaResult.scheduler}</span>
                                                </div>
                                            )}
                                            {metaResult.cfg_scale !== undefined && metaResult.cfg_scale > 0 && (
                                                <div className="param-meta-cell">
                                                    <span className="param-cell-label">CFG Scale</span>
                                                    <span className="param-cell-value">{metaResult.cfg_scale}</span>
                                                </div>
                                            )}
                                            {metaResult.seed !== undefined && metaResult.seed !== 0 && (
                                                <div className="param-meta-cell">
                                                    <span className="param-cell-label">Seed</span>
                                                    <span className="param-cell-value" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                        {metaResult.seed}
                                                        <button
                                                            type="button"
                                                            className="copy-mini-btn"
                                                            style={{ padding: "1px 5px", fontSize: 10 }}
                                                            onClick={() => handleCopy(String(metaResult.seed), "seed-copy")}
                                                        >
                                                            {copiedKey === "seed-copy" ? <Icons.Check /> : <Icons.Copy />}
                                                        </button>
                                                    </span>
                                                </div>
                                            )}
                                            {metaResult.width && metaResult.height ? (
                                                <div className="param-meta-cell">
                                                    <span className="param-cell-label">Resolution</span>
                                                    <span className="param-cell-value">{metaResult.width} × {metaResult.height}</span>
                                                </div>
                                            ) : null}
                                            {metaResult.model_name && (
                                                <div className="param-meta-cell" style={{ gridColumn: "span 2" }}>
                                                    <span className="param-cell-label">Checkpoint / Model</span>
                                                    <span className="param-cell-value" title={metaResult.model_name}>
                                                        {metaResult.model_name}
                                                    </span>
                                                </div>
                                            )}
                                            {metaResult.model_hash && (
                                                <div className="param-meta-cell">
                                                    <span className="param-cell-label">Model Hash</span>
                                                    <span className="param-cell-value">{metaResult.model_hash}</span>
                                                </div>
                                            )}
                                            {metaResult.clip_skip !== undefined && metaResult.clip_skip > 0 && (
                                                <div className="param-meta-cell">
                                                    <span className="param-cell-label">Clip Skip</span>
                                                    <span className="param-cell-value">{metaResult.clip_skip}</span>
                                                </div>
                                            )}
                                            {metaResult.denoising_strength !== undefined && metaResult.denoising_strength > 0 && (
                                                <div className="param-meta-cell">
                                                    <span className="param-cell-label">Denoise Strength</span>
                                                    <span className="param-cell-value">{metaResult.denoising_strength}</span>
                                                </div>
                                            )}
                                            {metaResult.vae && (
                                                <div className="param-meta-cell">
                                                    <span className="param-cell-label">VAE</span>
                                                    <span className="param-cell-value">{metaResult.vae}</span>
                                                </div>
                                            )}
                                            {metaResult.hires_upscaler && (
                                                <div className="param-meta-cell">
                                                    <span className="param-cell-label">Hires Upscaler</span>
                                                    <span className="param-cell-value">{metaResult.hires_upscaler}</span>
                                                </div>
                                            )}
                                            {metaResult.hires_upscale !== undefined && metaResult.hires_upscale > 0 && (
                                                <div className="param-meta-cell">
                                                    <span className="param-cell-label">Hires Scale</span>
                                                    <span className="param-cell-value">{metaResult.hires_upscale}x</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* LoRAs Detected */}
                                    {metaResult.loras && metaResult.loras.length > 0 && (
                                        <div className="inspector-section">
                                            <div className="inspector-section-title">
                                                <span>Detected LoRAs ({metaResult.loras.length})</span>
                                            </div>
                                            <div className="lora-chips-row">
                                                {metaResult.loras.map((lora, idx) => (
                                                    <div key={idx} className="lora-chip-item">
                                                        <span>{lora.name}</span>
                                                        <span className="lora-weight-badge">{lora.weight.toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Extra Parameters */}
                                    {metaResult.extra_params && Object.keys(metaResult.extra_params).length > 0 && (
                                        <div className="inspector-section">
                                            <div className="inspector-section-title">
                                                <span>Additional Parameters</span>
                                            </div>
                                            <div className="params-meta-grid">
                                                {Object.entries(metaResult.extra_params).map(([k, v]) => (
                                                    <div key={k} className="param-meta-cell">
                                                        <span className="param-cell-label">{k}</span>
                                                        <span className="param-cell-value" title={v}>{v}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Tab 2: ComfyUI Node Graph */}
                            {activeTab === "workflow" && (
                                <div className="inspector-section">
                                    <div className="inspector-section-title">
                                        <span>ComfyUI Node Graph / Workflow</span>
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <button
                                                type="button"
                                                className="copy-mini-btn"
                                                onClick={handleDownloadWorkflow}
                                            >
                                                <Icons.Download />
                                                <span>Save JSON</span>
                                            </button>
                                            <button
                                                type="button"
                                                className="copy-mini-btn"
                                                onClick={() =>
                                                    handleCopy(
                                                        metaResult.workflow_json || metaResult.prompt_json || "",
                                                        "workflow-copy"
                                                    )
                                                }
                                            >
                                                {copiedKey === "workflow-copy" ? <Icons.Check /> : <Icons.Copy />}
                                                <span>{copiedKey === "workflow-copy" ? "Copied" : "Copy JSON"}</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="inspector-prompt-block" style={{ maxHeight: "500px" }}>
                                        {(() => {
                                            try {
                                                const raw = metaResult.workflow_json || metaResult.prompt_json || "{}";
                                                return JSON.stringify(JSON.parse(raw), null, 2);
                                            } catch {
                                                return metaResult.workflow_json || metaResult.prompt_json || "{}";
                                            }
                                        })()}
                                    </div>
                                </div>
                            )}

                            {/* Tab 3: Raw Parameters Block */}
                            {activeTab === "raw" && (
                                <div className="inspector-section">
                                    <div className="inspector-section-title">
                                        <span>Complete Unparsed Parameter Block</span>
                                        <button
                                            type="button"
                                            className={`copy-mini-btn ${copiedKey === "raw-copy" ? "copied" : ""}`}
                                            onClick={() => handleCopy(metaResult.raw_prompt || "", "raw-copy")}
                                        >
                                            {copiedKey === "raw-copy" ? <Icons.Check /> : <Icons.Copy />}
                                            <span>{copiedKey === "raw-copy" ? "Copied" : "Copy Raw Block"}</span>
                                        </button>
                                    </div>
                                    <div className="inspector-prompt-block" style={{ maxHeight: "450px" }}>
                                        {metaResult.raw_prompt}
                                    </div>
                                </div>
                            )}

                            {/* Tab 4: All Discovered Chunks & EXIF Tags */}
                            {activeTab === "chunks" && metaResult.raw_chunks && (
                                <div className="raw-chunks-container">
                                    <div className="inspector-section-title">
                                        <span>All Discovered Embedded Chunks & Tags</span>
                                    </div>
                                    {Object.entries(metaResult.raw_chunks).map(([key, val]) => (
                                        <div key={key} className="raw-chunk-card">
                                            <div className="raw-chunk-header">
                                                <span className="raw-chunk-title">
                                                    <code>{key}</code>
                                                    <span className="raw-chunk-size">({val.length} chars)</span>
                                                </span>
                                                <button
                                                    type="button"
                                                    className="copy-mini-btn"
                                                    onClick={() => handleCopy(val, `chunk-${key}`)}
                                                >
                                                    {copiedKey === `chunk-${key}` ? <Icons.Check /> : <Icons.Copy />}
                                                    <span>{copiedKey === `chunk-${key}` ? "Copied" : "Copy"}</span>
                                                </button>
                                            </div>
                                            <div className="raw-chunk-content">{val}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
