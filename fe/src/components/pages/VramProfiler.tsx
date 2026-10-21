import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { WorkflowBridgeBanner } from "../common/WorkflowBridgeBanner";
import "../../style/VramProfiler.css";

interface BaseModelDef {
    id: string;
    name: string;
    archLabel: string;
    paramCountB: number; // In Billions of parameters for DiT/UNet
    defaultResolution: { w: number; h: number };
    defaultTextEncoder: string;
    supportedQuantizations: string[];
    isTextToVideo?: boolean;
    defaultFrames?: number;
    vaeChannelCount: number;
}

const BASE_MODELS: Record<string, BaseModelDef> = {
    sd15: {
        id: "sd15",
        name: "SD 1.5",
        archLabel: "U-Net 860M",
        paramCountB: 0.86,
        defaultResolution: { w: 512, h: 512 },
        defaultTextEncoder: "clip_l",
        supportedQuantizations: ["fp32", "fp16", "fp8_e4m3"],
        vaeChannelCount: 4,
    },
    sdxl: {
        id: "sdxl",
        name: "SDXL Native",
        archLabel: "U-Net 2.6B",
        paramCountB: 2.6,
        defaultResolution: { w: 1024, h: 1024 },
        defaultTextEncoder: "dual_clip_fp16",
        supportedQuantizations: ["fp32", "fp16", "fp8_e4m3", "gguf_q8", "gguf_q4"],
        vaeChannelCount: 4,
    },
    pony: {
        id: "pony",
        name: "Pony Diffusion V6",
        archLabel: "SDXL V-Pred 2.6B",
        paramCountB: 2.6,
        defaultResolution: { w: 832, h: 1216 },
        defaultTextEncoder: "dual_clip_fp16",
        supportedQuantizations: ["fp32", "fp16", "fp8_e4m3", "gguf_q8", "gguf_q4"],
        vaeChannelCount: 4,
    },
    illustrious: {
        id: "illustrious",
        name: "Illustrious-XL",
        archLabel: "SDXL Anime 2.6B",
        paramCountB: 2.6,
        defaultResolution: { w: 832, h: 1216 },
        defaultTextEncoder: "dual_clip_fp16",
        supportedQuantizations: ["fp32", "fp16", "fp8_e4m3", "gguf_q8", "gguf_q4"],
        vaeChannelCount: 4,
    },
    flux: {
        id: "flux",
        name: "Flux.1 Dev / Schnell",
        archLabel: "MMDiT 12B",
        paramCountB: 12.0,
        defaultResolution: { w: 1024, h: 1024 },
        defaultTextEncoder: "t5_fp8",
        supportedQuantizations: ["fp32", "bf16", "fp8_e4m3", "gguf_q8", "gguf_q4", "nf4"],
        vaeChannelCount: 16,
    },
    sd35_med: {
        id: "sd35_med",
        name: "SD 3.5 Medium",
        archLabel: "MMDiT-X 2.5B",
        paramCountB: 2.5,
        defaultResolution: { w: 1024, h: 1024 },
        defaultTextEncoder: "t5_fp8",
        supportedQuantizations: ["fp32", "fp16", "fp8_e4m3", "gguf_q8", "gguf_q4"],
        vaeChannelCount: 16,
    },
    sd35_large: {
        id: "sd35_large",
        name: "SD 3.5 Large",
        archLabel: "MMDiT-X 8.1B",
        paramCountB: 8.1,
        defaultResolution: { w: 1024, h: 1024 },
        defaultTextEncoder: "t5_fp8",
        supportedQuantizations: ["fp32", "fp16", "fp8_e4m3", "gguf_q8", "gguf_q4"],
        vaeChannelCount: 16,
    },
    wan21_13b: {
        id: "wan21_13b",
        name: "Wan 2.1 Video 1.3B",
        archLabel: "DiT 3D Video 1.3B",
        paramCountB: 1.3,
        defaultResolution: { w: 832, h: 480 },
        defaultTextEncoder: "t5_fp8",
        supportedQuantizations: ["fp32", "bf16", "fp8_e4m3", "gguf_q4"],
        isTextToVideo: true,
        defaultFrames: 81,
        vaeChannelCount: 16,
    },
    wan21_14b: {
        id: "wan21_14b",
        name: "Wan 2.1 Video 14B",
        archLabel: "DiT 3D Video 14B",
        paramCountB: 14.2,
        defaultResolution: { w: 832, h: 480 },
        defaultTextEncoder: "t5_fp8",
        supportedQuantizations: ["fp32", "bf16", "fp8_e4m3", "gguf_q4"],
        isTextToVideo: true,
        defaultFrames: 81,
        vaeChannelCount: 16,
    },
};

interface QuantizationDef {
    id: string;
    name: string;
    bytesPerParam: number;
    desc: string;
}

const QUANTIZATIONS: Record<string, QuantizationDef> = {
    fp32: { id: "fp32", name: "FP32 (Full)", bytesPerParam: 4.0, desc: "Format 32-bit float penuh (--no-half), bobot 2x lipat lebih besar" },
    fp16: { id: "fp16", name: "FP16 (Half)", bytesPerParam: 2.0, desc: "Standar industri tanpa kehilangan kualitas (16-bit float)" },
    bf16: { id: "bf16", name: "BF16 (Bfloat16)", bytesPerParam: 2.0, desc: "Rentang dinamis lebar standar Flux/Wan 2.1" },
    fp8_e4m3: { id: "fp8_e4m3", name: "FP8_e4m3", bytesPerParam: 1.0, desc: "Kuantisasi native RTX 40xx, hemat 50% VRAM bobot" },
    gguf_q8: { id: "gguf_q8", name: "GGUF Q8_0", bytesPerParam: 1.05, desc: "GGUF quant 8-bit kualitas prima via llama.cpp/ComfyUI" },
    gguf_q4: { id: "gguf_q4", name: "GGUF Q4_K_M", bytesPerParam: 0.55, desc: "Kuantisasi agresif 4-bit, hemat VRAM ekstrem ~72%" },
    nf4: { id: "nf4", name: "NF4 (BitsAndBytes)", bytesPerParam: 0.55, desc: "NormalFloat 4-bit native checkpoint Flux.1 BnB" },
};

interface TextEncoderDef {
    id: string;
    name: string;
    vramGb: number;
    desc: string;
}

const TEXT_ENCODERS: Record<string, TextEncoderDef> = {
    clip_l: { id: "clip_l", name: "Single CLIP ViT-L", vramGb: 0.24, desc: "Standard SD 1.5 text encoder (~240 MB)" },
    dual_clip_fp16: { id: "dual_clip_fp16", name: "Dual CLIP FP16", vramGb: 1.64, desc: "CLIP-L (240MB) + OpenCLIP ViT-G (1.4GB)" },
    dual_clip_fp8: { id: "dual_clip_fp8", name: "Dual CLIP FP8", vramGb: 0.82, desc: "Dual CLIP terkuantisasi FP8 (~820 MB)" },
    t5_fp16: { id: "t5_fp16", name: "T5-XXL FP16 Full", vramGb: 9.8, desc: "Bobot penuh T5-XXL FP16 (~9.8 GB VRAM)" },
    t5_fp8: { id: "t5_fp8", name: "T5-XXL FP8 Scaled", vramGb: 4.9, desc: "Kuantisasi standar FP8 T5-XXL (~4.9 GB VRAM)" },
    none: { id: "none", name: "None / CPU Offloaded", vramGb: 0.0, desc: "Offload ke RAM sistem (0 GB VRAM terpakai)" },
};

interface GpuPreset {
    id: string;
    name: string;
    vramGb: number;
    tier: string;
}

const GPU_PRESETS: GpuPreset[] = [
    { id: "gtx1650", name: "GTX 1650 / RTX 3050 Laptop (4 GB)", vramGb: 4, tier: "Budget Entry" },
    { id: "rtx2060", name: "RTX 2060 / GTX 1660 Ti (6 GB)", vramGb: 6, tier: "Entry VRAM" },
    { id: "rtx4060", name: "RTX 3060 Ti / RTX 4060 / 4060 Ti (8 GB)", vramGb: 8, tier: "Mainstream Standard" },
    { id: "rtx3060_12", name: "RTX 3060 12GB / RTX 4070 (12 GB)", vramGb: 12, tier: "Sweet Spot 12GB" },
    { id: "rtx4070ti", name: "RTX 4070 Ti Super / RTX 4080 (16 GB)", vramGb: 16, tier: "Enthusiast 16GB" },
    { id: "rtx4090", name: "RTX 3090 / RTX 4090 (24 GB)", vramGb: 24, tier: "Flagship Creator" },
    { id: "a6000", name: "RTX 6000 Ada / A6000 (48 GB)", vramGb: 48, tier: "Workstation Pro" },
    { id: "custom", name: "Kustom / Slider Bebas", vramGb: 12, tier: "Manual" },
];

interface ResPreset {
    label: string;
    w: number;
    h: number;
    frames?: number;
}

const RESOLUTION_PRESETS: ResPreset[] = [
    { label: "512×512 (SD 1.5)", w: 512, h: 512 },
    { label: "832×1216 (SDXL Portrait)", w: 832, h: 1216 },
    { label: "1024×1024 (SDXL Square)", w: 1024, h: 1024 },
    { label: "1280×1280 (Flux Native)", w: 1280, h: 1280 },
    { label: "1536×1024 (Flux Landscape)", w: 1536, h: 1024 },
    { label: "832×480 @ 81f (Wan 2.1 480p)", w: 832, h: 480, frames: 81 },
    { label: "1280×720 @ 81f (Wan 2.1 720p)", w: 1280, h: 720, frames: 81 },
];

export default function VramProfiler() {
    const [searchParams] = useSearchParams();

    // 1. Model Configuration State
    const [modelKey, setModelKey] = useState<string>(() => {
        const m = searchParams.get("model");
        if (m && BASE_MODELS[m]) return m;
        return "sdxl";
    });

    const activeModel = BASE_MODELS[modelKey] || BASE_MODELS.sdxl;

    // 2. Precision / Quantization
    const [quantKey, setQuantKey] = useState<string>(() => {
        if (modelKey === "flux" || modelKey.includes("wan21")) return "fp8_e4m3";
        return "fp16";
    });

    // 3. Text Encoder
    const [teKey, setTeKey] = useState<string>(() => {
        return activeModel.defaultTextEncoder;
    });

    // 4. Resolution & Batching
    const [width, setWidth] = useState<number>(activeModel.defaultResolution.w);
    const [height, setHeight] = useState<number>(activeModel.defaultResolution.h);
    const [batchSize, setBatchSize] = useState<number>(1);
    const [videoFrames, setVideoFrames] = useState<number>(activeModel.defaultFrames || 81);

    // 5. LoRA & ControlNet
    const [loraCount, setLoraCount] = useState<number>(1);
    const [controlnetCount, setControlnetCount] = useState<number>(0);

    // 6. Optimizations
    const [useSdpAttention, setUseSdpAttention] = useState<boolean>(true);
    const [useTiledVae, setUseTiledVae] = useState<boolean>(true);
    const [useMedvramChunking, setUseMedvramChunking] = useState<boolean>(false);

    // 7. GPU Target
    const [gpuPresetId, setGpuPresetId] = useState<string>("rtx4060");
    const [customGpuVram, setCustomGpuVram] = useState<number>(8);
    const [copiedFlags, setCopiedFlags] = useState<boolean>(false);

    // Update defaults if model changes
    const handleSelectModel = (key: string) => {
        setModelKey(key);
        const m = BASE_MODELS[key];
        if (!m) return;
        setWidth(m.defaultResolution.w);
        setHeight(m.defaultResolution.h);
        if (m.isTextToVideo) {
            setVideoFrames(m.defaultFrames || 81);
        }
        setTeKey(m.defaultTextEncoder);
        if (!m.supportedQuantizations.includes(quantKey)) {
            setQuantKey(m.supportedQuantizations[0]);
        }
    };

    // Active GPU VRAM
    const targetGpuVram = useMemo(() => {
        if (gpuPresetId === "custom") return customGpuVram;
        const p = GPU_PRESETS.find((g) => g.id === gpuPresetId);
        return p ? p.vramGb : 8;
    }, [gpuPresetId, customGpuVram]);

    // MATHEMATICAL VRAM ALLOCATION ENGINE
    const telemetry = useMemo(() => {
        const qDef = QUANTIZATIONS[quantKey] || QUANTIZATIONS.fp16;
        const teDef = TEXT_ENCODERS[teKey] || TEXT_ENCODERS.dual_clip_fp16;

        // 1. Model Weights (Base DiT / U-Net)
        const weightsGb = activeModel.paramCountB * qDef.bytesPerParam;

        // 2. Text Encoder VRAM
        const teGb = teDef.vramGb;

        // 3. Latent Memory & Sequence Buffers
        const isVideo = !!activeModel.isTextToVideo;
        const frames = isVideo ? Math.max(1, videoFrames) : 1;
        const latentChannels = activeModel.vaeChannelCount;
        const latentW = width / 8;
        const latentH = height / 8;
        const latentElements = batchSize * latentChannels * latentW * latentH * (isVideo ? Math.ceil(frames / 4) : 1);
        // FP16/BF16 latent elements (2 bytes) + activation buffers (x4 for gradient/sampling tensors)
        const latentGb = (latentElements * 2 * 4) / (1024 * 1024 * 1024);

        // 4. Context KV Cache & Attention Matrix
        // SDP (Scaled Dot Product Attention) scales with sequence length O(N)
        // Vanilla attention explodes with O(N^2)
        const sequenceLength = (latentW * latentH) / (activeModel.id === "flux" ? 4 : 1);
        let kvGb = (sequenceLength * 32 * 64 * 2 * 2 * batchSize) / (1024 * 1024 * 1024);
        if (isVideo) {
            kvGb += (sequenceLength * frames * 0.0003); // 3D spatiotemporal self-attention
        }
        if (!useSdpAttention) {
            kvGb *= 2.8; // Quadratic attention overhead without SDP/FlashAttention
        }
        if (useMedvramChunking) {
            kvGb *= 0.55; // --medvram splits attention into chunks
        }
        kvGb = Math.max(0.25, Math.min(18.0, kvGb));

        // 5. VAE Peak Decode Memory
        let vaeGb = 0.5;
        if (activeModel.id === "sd15") {
            vaeGb = useTiledVae ? 0.35 : Math.max(0.6, (width * height * 4 * 4) / (1024 * 1024 * 1024) * 0.8);
        } else if (activeModel.id === "flux" || activeModel.id.startsWith("sd35")) {
            vaeGb = useTiledVae ? 0.65 : Math.max(1.2, (width * height * 16 * 4) / (1024 * 1024 * 1024) * 1.4);
        } else if (isVideo) {
            vaeGb = useTiledVae ? 1.8 : 4.5;
        } else {
            // SDXL standard
            vaeGb = useTiledVae ? 0.45 : Math.max(0.9, (width * height * 4 * 4) / (1024 * 1024 * 1024) * 1.1);
        }

        // 6. LoRAs & ControlNet
        const loraPerUnit = activeModel.id === "flux" ? 0.42 : activeModel.id === "sd15" ? 0.12 : 0.25;
        const lorasGb = loraCount * loraPerUnit;

        const cnPerUnit = activeModel.id === "flux" ? 3.2 : activeModel.id === "sd15" ? 1.15 : 2.35;
        const controlnetsGb = controlnetCount * cnPerUnit;

        // 7. PyTorch CUDA context / Driver runtime overhead
        const cudaOverheadGb = 0.65;

        // Total VRAM Required
        const totalVramGb = weightsGb + teGb + latentGb + kvGb + vaeGb + lorasGb + controlnetsGb + cudaOverheadGb;

        // Ratio vs GPU VRAM
        const ratio = totalVramGb / targetGpuVram;
        const headroomGb = targetGpuVram - totalVramGb;

        // Status Determination
        let status: "safe" | "warn" | "offload" | "danger" = "safe";
        let statusBadge = "Lancar Tanpa Offload";
        let statusMessage = "Throughput maksimal tanpa overhead paging. Model dan tensor muat 100% di VRAM.";

        if (ratio <= 0.85) {
            status = "safe";
            statusBadge = "Lancar Tanpa Offload";
            statusMessage = "Kecepatan maksimal. VRAM cukup dengan headroom sisa untuk display OS.";
        } else if (ratio <= 1.05) {
            status = "warn";
            statusBadge = "Butuh --medvram / FP8";
            statusMessage = "Mendekati kapasitas fisik VRAM. Rekomendasikan aktifkan flag --medvram atau Text Encoder FP8.";
        } else if (ratio <= 1.55) {
            status = "offload";
            statusBadge = "Wajib ComfyUI Offloading / GGUF Q4";
            statusMessage = "Total memori melebihi VRAM fisik. Wajib gunakan ComfyUI CPU offload atau model kuantisasi Q4/NF4.";
        } else {
            status = "danger";
            statusBadge = "Resiko Fatal OOM (CUDA Out Of Memory)";
            statusMessage = "Defisit VRAM kritis (>50%). WebUI standar akan langsung crash OOM. Turunkan resolusi atau gunakan Tiled VAE + ComfyUI lowvram.";
        }

        return {
            weightsGb,
            teGb,
            latentGb,
            kvGb,
            vaeGb,
            lorasGb,
            controlnetsGb,
            cudaOverheadGb,
            totalVramGb,
            headroomGb,
            ratio,
            status,
            statusBadge,
            statusMessage,
        };
    }, [
        activeModel,
        quantKey,
        teKey,
        width,
        height,
        batchSize,
        videoFrames,
        loraCount,
        controlnetCount,
        useSdpAttention,
        useTiledVae,
        useMedvramChunking,
        targetGpuVram,
    ]);

    // Command-line flag generator
    const recommendedCliFlags = useMemo(() => {
        const flags: string[] = ["--opt-sdp-attention", "--pin-shared-memory"];

        if (telemetry.status === "warn") {
            if (activeModel.id === "sdxl" || activeModel.id === "pony" || activeModel.id === "illustrious") {
                flags.push("--medvram-sdxl");
            } else {
                flags.push("--medvram");
            }
        } else if (telemetry.status === "offload" || telemetry.status === "danger") {
            flags.push("--lowvram");
            flags.push("--novram");
            if (useTiledVae) {
                flags.push("--tiled-vae");
            }
        }

        if (quantKey.includes("fp8")) {
            flags.push("--fp8-storage");
        }

        return flags.join(" ");
    }, [telemetry.status, activeModel.id, quantKey, useTiledVae]);

    const handleCopyFlags = () => {
        navigator.clipboard.writeText(recommendedCliFlags);
        setCopiedFlags(true);
        setTimeout(() => setCopiedFlags(false), 2000);
    };

    const handleReset = () => {
        setModelKey("sdxl");
        setQuantKey("fp16");
        setTeKey("dual_clip_fp16");
        setWidth(1024);
        setHeight(1024);
        setBatchSize(1);
        setLoraCount(1);
        setControlnetCount(0);
        setUseSdpAttention(true);
        setUseTiledVae(true);
        setUseMedvramChunking(false);
        setGpuPresetId("rtx4060");
    };

    return (
        <div className="vram-profiler-container">
            {/* Global Workflow Bridge Banner */}
            <WorkflowBridgeBanner currentTool="calculator" />

            {/* Header */}
            <header className="vram-header">
                <div className="vram-header-top">
                    <div className="vram-title-group">
                        <div className="vram-header-icon" aria-hidden="true">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="vram-title">Interactive VRAM &amp; Hardware Profiler</h2>
                            <p className="vram-subtitle">
                                Kalkulator alokasi memori real-time untuk Stable Diffusion, Flux, SD 3.5 &amp; Wan 2.1 Video. Cegah CUDA OOM sebelum generate.
                            </p>
                        </div>
                    </div>

                    <div className="vram-header-actions">
                        <button type="button" className="vram-reset-btn" onClick={handleReset}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                <path d="M3 3v5h5" />
                            </svg>
                            <span>Reset Default</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Interactive Grid */}
            <div className="vram-main-grid">
                {/* Left Column: Interactive Inputs */}
                <div className="vram-inputs-col">
                    {/* SECTION 1: BASE MODEL SELECTOR */}
                    <div className="vram-section-card">
                        <div className="vram-section-header">
                            <div className="vram-section-title-wrap">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                                    <polyline points="2 17 12 22 22 17" />
                                    <polyline points="2 12 12 17 22 12" />
                                </svg>
                                <span>1. Base Model Architecture</span>
                            </div>
                            <span className="vram-section-badge">{activeModel.archLabel}</span>
                        </div>

                        <div className="vram-model-grid">
                            {Object.values(BASE_MODELS).map((m) => {
                                const isActive = modelKey === m.id;
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        className={`vram-model-btn ${isActive ? "active" : ""}`}
                                        onClick={() => handleSelectModel(m.id)}
                                    >
                                        <span className="vram-model-name">{m.name}</span>
                                        <span className="vram-model-arch">{m.paramCountB}B Params</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* SECTION 2: PRECISION & QUANTIZATION */}
                    <div className="vram-section-card">
                        <div className="vram-section-header">
                            <div className="vram-section-title-wrap">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <span>2. Precision / Kuantisasi Model</span>
                            </div>
                            <span className="vram-section-badge">
                                {QUANTIZATIONS[quantKey]?.bytesPerParam} Bytes/Param
                            </span>
                        </div>

                        <div className="vram-quant-grid">
                            {Object.values(QUANTIZATIONS).map((q) => {
                                const isSupported = activeModel.supportedQuantizations.includes(q.id);
                                const isActive = quantKey === q.id;
                                return (
                                    <button
                                        key={q.id}
                                        type="button"
                                        className={`vram-quant-btn ${isActive ? "active" : ""}`}
                                        onClick={() => setQuantKey(q.id)}
                                        style={{ opacity: isSupported ? 1 : 0.45 }}
                                        title={q.desc}
                                    >
                                        <span className="vram-quant-name">{q.name}</span>
                                        <span className="vram-quant-desc">{q.desc.slice(0, 28)}...</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* SECTION 3: TEXT ENCODER */}
                    <div className="vram-section-card">
                        <div className="vram-section-header">
                            <div className="vram-section-title-wrap">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 7V4h16v3" />
                                    <line x1="12" y1="4" x2="12" y2="20" />
                                </svg>
                                <span>3. Text Encoder (T5 / CLIP)</span>
                            </div>
                            <span className="vram-section-badge">
                                {TEXT_ENCODERS[teKey]?.vramGb || 0} GB VRAM
                            </span>
                        </div>

                        <div className="vram-te-grid">
                            {Object.values(TEXT_ENCODERS).map((te) => {
                                const isActive = teKey === te.id;
                                return (
                                    <button
                                        key={te.id}
                                        type="button"
                                        className={`vram-te-btn ${isActive ? "active" : ""}`}
                                        onClick={() => setTeKey(te.id)}
                                        title={te.desc}
                                    >
                                        <span className="vram-te-title">{te.name}</span>
                                        <span className="vram-te-vram">
                                            {te.vramGb === 0 ? "0 GB (CPU Offloaded)" : `~${te.vramGb} GB VRAM`}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* SECTION 4: RESOLUTION, BATCH SIZE & VIDEO FRAMES */}
                    <div className="vram-section-card">
                        <div className="vram-section-header">
                            <div className="vram-section-title-wrap">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect width="18" height="18" x="3" y="3" rx="2" />
                                    <line x1="3" y1="9" x2="21" y2="9" />
                                    <line x1="9" y1="21" x2="9" y2="9" />
                                </svg>
                                <span>4. Target Resolusi &amp; Batch Size</span>
                            </div>
                            <span className="vram-section-badge">
                                {((width * height) / 1000000).toFixed(2)} MP
                            </span>
                        </div>

                        {/* Presets Row */}
                        <div className="vram-res-presets-row">
                            {RESOLUTION_PRESETS.map((rp) => {
                                const isActive = width === rp.w && height === rp.h;
                                return (
                                    <button
                                        key={rp.label}
                                        type="button"
                                        className={`vram-res-preset-chip ${isActive ? "active" : ""}`}
                                        onClick={() => {
                                            setWidth(rp.w);
                                            setHeight(rp.h);
                                            if (rp.frames) setVideoFrames(rp.frames);
                                        }}
                                    >
                                        {rp.label}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="vram-controls-row">
                            <div className="vram-input-field">
                                <label className="vram-input-label">Width (px)</label>
                                <input
                                    type="number"
                                    step={64}
                                    min={256}
                                    max={4096}
                                    className="vram-number-input"
                                    value={width}
                                    onChange={(e) => setWidth(parseInt(e.target.value) || 512)}
                                />
                            </div>

                            <div className="vram-input-field">
                                <label className="vram-input-label">Height (px)</label>
                                <input
                                    type="number"
                                    step={64}
                                    min={256}
                                    max={4096}
                                    className="vram-number-input"
                                    value={height}
                                    onChange={(e) => setHeight(parseInt(e.target.value) || 512)}
                                />
                            </div>

                            <div className="vram-input-field">
                                <label className="vram-input-label">Batch Size</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={8}
                                    className="vram-number-input"
                                    value={batchSize}
                                    onChange={(e) => setBatchSize(parseInt(e.target.value) || 1)}
                                />
                            </div>

                            {activeModel.isTextToVideo && (
                                <div className="vram-input-field">
                                    <label className="vram-input-label">Video Frames</label>
                                    <input
                                        type="number"
                                        min={16}
                                        max={240}
                                        step={4}
                                        className="vram-number-input"
                                        value={videoFrames}
                                        onChange={(e) => setVideoFrames(parseInt(e.target.value) || 81)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SECTION 5: LORAS, CONTROLNET & ATTENTION SETTINGS */}
                    <div className="vram-section-card">
                        <div className="vram-section-header">
                            <div className="vram-section-title-wrap">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                </svg>
                                <span>5. LoRA, ControlNet &amp; Optimasi VAE</span>
                            </div>
                        </div>

                        {/* LoRA Slider */}
                        <div className="vram-slider-row">
                            <div className="vram-slider-top">
                                <span>Jumlah LoRA Aktif:</span>
                                <span className="vram-slider-val">{loraCount} Unit (~{telemetry.lorasGb.toFixed(2)} GB)</span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={8}
                                step={1}
                                className="vram-range-input"
                                value={loraCount}
                                onChange={(e) => setLoraCount(parseInt(e.target.value) || 0)}
                            />
                        </div>

                        {/* ControlNet Slider */}
                        <div className="vram-slider-row">
                            <div className="vram-slider-top">
                                <span>Jumlah ControlNet / Preprocessor:</span>
                                <span className="vram-slider-val">{controlnetCount} Unit (~{telemetry.controlnetsGb.toFixed(2)} GB)</span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={4}
                                step={1}
                                className="vram-range-input"
                                value={controlnetCount}
                                onChange={(e) => setControlnetCount(parseInt(e.target.value) || 0)}
                            />
                        </div>

                        {/* Tiled VAE Toggle */}
                        <div
                            className="vram-toggle-row"
                            onClick={() => setUseTiledVae(!useTiledVae)}
                        >
                            <div className="vram-toggle-info">
                                <span className="vram-toggle-title">Tiled VAE Decode (--tiled-vae)</span>
                                <span className="vram-toggle-desc">Mencegah lonjakan VAE decode di resolusi tinggi (menghemat ~1.5 - 3.0 GB VRAM)</span>
                            </div>
                            <div className={`vram-switch ${useTiledVae ? "active" : ""}`}>
                                <div className="vram-switch-handle" />
                            </div>
                        </div>

                        {/* SDP Attention Toggle */}
                        <div
                            className="vram-toggle-row"
                            onClick={() => setUseSdpAttention(!useSdpAttention)}
                        >
                            <div className="vram-toggle-info">
                                <span className="vram-toggle-title">Scaled Dot Product Attention (PyTorch 2.x SDP)</span>
                                <span className="vram-toggle-desc">FlashAttention memory-efficient attention (wajib aktif untuk GPU modern)</span>
                            </div>
                            <div className={`vram-switch ${useSdpAttention ? "active" : ""}`}>
                                <div className="vram-switch-handle" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Real-Time Output & Telemetry */}
                <div className="vram-output-col">
                    {/* MASTER VERDICT CARD */}
                    <div className={`vram-verdict-card status-${telemetry.status}`}>
                        <div className="vram-verdict-header">
                            <span className="vram-verdict-badge">{telemetry.statusBadge}</span>
                            <span style={{ fontSize: "12px", color: "#a1a1aa" }}>
                                {telemetry.ratio <= 1.0
                                    ? `Headroom: +${telemetry.headroomGb.toFixed(2)} GB`
                                    : `Defisit: ${Math.abs(telemetry.headroomGb).toFixed(2)} GB`}
                            </span>
                        </div>

                        <div className="vram-verdict-total">
                            <span className="vram-total-number">
                                ~{telemetry.totalVramGb.toFixed(2)} GB
                            </span>
                            <span className="vram-total-vs">
                                dari <strong>{targetGpuVram} GB VRAM</strong> ({Math.round(telemetry.ratio * 100)}% Kapasitas)
                            </span>
                        </div>

                        {/* Visual Allocation Stack Bar */}
                        <div className="vram-comp-bar-wrap">
                            <div className="vram-comp-track">
                                <div
                                    className="vram-comp-segment weights"
                                    style={{ width: `${(telemetry.weightsGb / telemetry.totalVramGb) * 100}%` }}
                                    title={`Model Weights: ${telemetry.weightsGb.toFixed(2)} GB`}
                                />
                                <div
                                    className="vram-comp-segment te"
                                    style={{ width: `${(telemetry.teGb / telemetry.totalVramGb) * 100}%` }}
                                    title={`Text Encoder: ${telemetry.teGb.toFixed(2)} GB`}
                                />
                                <div
                                    className="vram-comp-segment kv"
                                    style={{ width: `${((telemetry.kvGb + telemetry.latentGb) / telemetry.totalVramGb) * 100}%` }}
                                    title={`Latents & Attention KV: ${(telemetry.kvGb + telemetry.latentGb).toFixed(2)} GB`}
                                />
                                <div
                                    className="vram-comp-segment vae"
                                    style={{ width: `${(telemetry.vaeGb / telemetry.totalVramGb) * 100}%` }}
                                    title={`VAE Decode: ${telemetry.vaeGb.toFixed(2)} GB`}
                                />
                                <div
                                    className="vram-comp-segment lora"
                                    style={{ width: `${((telemetry.lorasGb + telemetry.controlnetsGb) / telemetry.totalVramGb) * 100}%` }}
                                    title={`LoRAs & ControlNet: ${(telemetry.lorasGb + telemetry.controlnetsGb).toFixed(2)} GB`}
                                />
                                <div
                                    className="vram-comp-segment cuda"
                                    style={{ width: `${(telemetry.cudaOverheadGb / telemetry.totalVramGb) * 100}%` }}
                                    title={`CUDA Context: ${telemetry.cudaOverheadGb.toFixed(2)} GB`}
                                />
                            </div>

                            {/* Legend Breakdown */}
                            <div className="vram-legend-grid">
                                <div className="vram-legend-item">
                                    <div className="vram-legend-left">
                                        <div className="vram-legend-dot weights" />
                                        <span>Model Weights:</span>
                                    </div>
                                    <span className="vram-legend-val">{telemetry.weightsGb.toFixed(2)} GB</span>
                                </div>

                                <div className="vram-legend-item">
                                    <div className="vram-legend-left">
                                        <div className="vram-legend-dot te" />
                                        <span>Text Encoder:</span>
                                    </div>
                                    <span className="vram-legend-val">{telemetry.teGb.toFixed(2)} GB</span>
                                </div>

                                <div className="vram-legend-item">
                                    <div className="vram-legend-left">
                                        <div className="vram-legend-dot kv" />
                                        <span>KV Cache &amp; Latents:</span>
                                    </div>
                                    <span className="vram-legend-val">{(telemetry.kvGb + telemetry.latentGb).toFixed(2)} GB</span>
                                </div>

                                <div className="vram-legend-item">
                                    <div className="vram-legend-left">
                                        <div className="vram-legend-dot vae" />
                                        <span>VAE Decode Peak:</span>
                                    </div>
                                    <span className="vram-legend-val">{telemetry.vaeGb.toFixed(2)} GB</span>
                                </div>

                                <div className="vram-legend-item">
                                    <div className="vram-legend-left">
                                        <div className="vram-legend-dot lora" />
                                        <span>LoRAs &amp; ControlNet:</span>
                                    </div>
                                    <span className="vram-legend-val">{(telemetry.lorasGb + telemetry.controlnetsGb).toFixed(2)} GB</span>
                                </div>

                                <div className="vram-legend-item">
                                    <div className="vram-legend-left">
                                        <div className="vram-legend-dot cuda" />
                                        <span>CUDA Overhead:</span>
                                    </div>
                                    <span className="vram-legend-val">{telemetry.cudaOverheadGb.toFixed(2)} GB</span>
                                </div>
                            </div>
                        </div>

                        <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#d4d4d8", lineHeight: 1.5 }}>
                            {telemetry.statusMessage}
                        </p>
                    </div>

                    {/* TARGET GPU SELECTOR */}
                    <div className="vram-gpu-box">
                        <div className="vram-gpu-title-row">
                            <span>Komparasi GPU Anda:</span>
                            <span style={{ color: "#3b82f6" }}>{targetGpuVram} GB VRAM</span>
                        </div>

                        <select
                            className="vram-gpu-select"
                            value={gpuPresetId}
                            onChange={(e) => setGpuPresetId(e.target.value)}
                        >
                            {GPU_PRESETS.map((g) => (
                                <option key={g.id} value={g.id}>
                                    {g.name}
                                </option>
                            ))}
                        </select>

                        {gpuPresetId === "custom" && (
                            <div className="vram-gpu-custom-slider">
                                <input
                                    type="range"
                                    min={2}
                                    max={96}
                                    step={1}
                                    className="vram-range-input"
                                    value={customGpuVram}
                                    onChange={(e) => setCustomGpuVram(parseInt(e.target.value) || 8)}
                                />
                                <span style={{ fontWeight: 700, fontFamily: "monospace", width: "50px" }}>
                                    {customGpuVram} GB
                                </span>
                            </div>
                        )}
                    </div>

                    {/* RECOMMENDED CLI FLAGS & OPTIMIZATION TIPS */}
                    <div className="vram-flags-card">
                        <div className="vram-flags-header">
                            <span className="vram-flags-title">Rekomendasi Command-Line Flags</span>
                            <button
                                type="button"
                                className="vram-flags-copy-btn"
                                onClick={handleCopyFlags}
                            >
                                {copiedFlags ? "Tersalin!" : "Salin Flags"}
                            </button>
                        </div>

                        <div className="vram-flags-code">
                            COMMANDLINE_ARGS={recommendedCliFlags}
                        </div>

                        <ul className="vram-tips-list">
                            <li>
                                <strong>ComfyUI Node Tip:</strong> Gunakan node <code>DualCLIPLoader (device: cpu)</code> untuk membebaskan VRAM Text Encoder langsung ke RAM sistem.
                            </li>
                            <li>
                                <strong>Tiled VAE:</strong> Mengaktifkan Tiled VAE mencegah lonjakan memori tak terduga saat proses akhir upscaling latents ke piksel RGB.
                            </li>
                            <li>
                                <strong>Shared Memory Throttling:</strong> Flag <code>--pin-shared-memory</code> mencegah driver NVIDIA Windows WDDM memindahkan tensor secara lambat ke RAM DDR4/DDR5 saat VRAM hampir penuh.
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
