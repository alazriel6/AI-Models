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

    // 8. System RAM Target (DDR4/DDR5) for Host CPU Offloading
    const [systemRamGb, setSystemRamGb] = useState<number>(32);

    // 9. Hi-Res Fix & Workflow Post-Processing Simulator
    const [enableHiresFix, setEnableHiresFix] = useState<boolean>(false);
    const [hiresScale, setHiresScale] = useState<number>(1.5);
    const [upscaleMethod, setUpscaleMethod] = useState<"latent" | "ultimate_sd" | "model_upscale">("latent");
    const [enableFaceDetailer, setEnableFaceDetailer] = useState<boolean>(false);
    const [enableRefiner, setEnableRefiner] = useState<boolean>(false);

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

    // SYSTEM RAM (DDR4/DDR5) ALLOCATION ENGINE FOR CPU OFFLOADING
    const ramTelemetry = useMemo(() => {
        const osBaselineGb = 4.5;
        const pythonHostGb = 2.5;

        let offloadedWeightsGb = 0;
        // Text Encoder offloaded
        if (teKey === "none") {
            if (activeModel.id === "flux" || activeModel.id.startsWith("sd35")) {
                offloadedWeightsGb += 4.9; // T5-XXL FP8
            } else if (activeModel.isTextToVideo) {
                offloadedWeightsGb += 4.8; // UMT5 FP8
            } else if (activeModel.id === "sdxl" || activeModel.id === "pony" || activeModel.id === "illustrious") {
                offloadedWeightsGb += 1.64; // Dual CLIP
            } else {
                offloadedWeightsGb += 0.24; // CLIP-L
            }
        }

        // When VRAM is insufficient and ComfyUI / lowvram caches weights in RAM
        if (telemetry.status === "offload" || telemetry.status === "danger") {
            offloadedWeightsGb += telemetry.weightsGb;
        }

        // 2-Pass Refiner model cached in RAM
        if (enableRefiner) {
            offloadedWeightsGb += 4.6;
        }

        const totalRamNeededGb = osBaselineGb + pythonHostGb + offloadedWeightsGb;
        const ramRatio = totalRamNeededGb / systemRamGb;
        const ramHeadroomGb = systemRamGb - totalRamNeededGb;

        let ramStatus: "ram-safe" | "ram-warn" | "ram-danger" = "ram-safe";
        let ramBadge = "RAM Aman (Tanpa Paging)";
        let ramMessage = `Kapasitas RAM PC ${systemRamGb} GB mencukupi untuk offload tanpa swap ke SSD.`;

        if (ramRatio > 0.95) {
            ramStatus = "ram-danger";
            ramBadge = "Bahaya Disk-Thrashing";
            ramMessage = `RAM PC (${systemRamGb} GB) kurang! Windows akan mem-paging tensor ke SSD/Pagefile, membuat generasi melambat 50x–100x lipat. Disarankan upgrade ke ${systemRamGb < 32 ? "32 GB" : "64 GB"} RAM.`;
        } else if (ramRatio > 0.8) {
            ramStatus = "ram-warn";
            ramBadge = "RAM Ketat (>80%)";
            ramMessage = `Penggunaan RAM sistem mencapai ${(ramRatio * 100).toFixed(0)}%. Tutup aplikasi background berat agar terhindar dari paging memori.`;
        }

        return {
            osBaselineGb,
            pythonHostGb,
            offloadedWeightsGb,
            totalRamNeededGb,
            ramRatio,
            ramHeadroomGb,
            ramStatus,
            ramBadge,
            ramMessage,
        };
    }, [teKey, activeModel, telemetry.status, telemetry.weightsGb, enableRefiner, systemRamGb]);

    // MULTI-PASS & HI-RES WORKFLOW TELEMETRY
    const multiPassTelemetry = useMemo(() => {
        const pass1Vram = telemetry.totalVramGb;
        const pass1W = width;
        const pass1H = height;

        const pass2W = Math.round(width * hiresScale);
        const pass2H = Math.round(height * hiresScale);
        const pass2ScaleFactor = hiresScale * hiresScale;

        let pass2Vram = pass1Vram;
        let pass2Note = "Hi-Res Fix tidak aktif.";

        if (enableHiresFix) {
            if (upscaleMethod === "latent") {
                const scaledLatentKv = (telemetry.kvGb + telemetry.latentGb) * (useSdpAttention ? hiresScale : pass2ScaleFactor);
                const pass2Vae = useTiledVae ? telemetry.vaeGb : telemetry.vaeGb * pass2ScaleFactor;
                pass2Vram = telemetry.weightsGb + telemetry.teGb + scaledLatentKv + pass2Vae + telemetry.lorasGb + telemetry.controlnetsGb + telemetry.cudaOverheadGb;
                pass2Note = `Full Latent Denoising @ ${pass2W}×${pass2H}. Perhatian memori melonjak tajam!`;
            } else if (upscaleMethod === "ultimate_sd") {
                pass2Vram = pass1Vram + 0.65;
                pass2Note = `Ultimate SD Upscale: Memproses ubin bersekat (tiled). Memori dibatasi dan aman dari OOM!`;
            } else {
                pass2Vram = pass1Vram + 0.85;
                pass2Note = `Model Upscale (ESRGAN): Upscale spasial via neural filter CNN ringan (~850 MB VRAM).`;
            }
        }

        let postProcessVram = enableHiresFix ? pass2Vram : pass1Vram;
        if (enableFaceDetailer) {
            postProcessVram += 0.95;
        }
        if (enableRefiner && !enableHiresFix) {
            postProcessVram += 2.2;
        }

        const isPass2Risk = pass2Vram > targetGpuVram;
        const isPostProcessRisk = postProcessVram > targetGpuVram;

        return {
            pass1Vram,
            pass1W,
            pass1H,
            pass2W,
            pass2H,
            pass2Vram,
            pass2Note,
            postProcessVram,
            isPass2Risk,
            isPostProcessRisk,
        };
    }, [
        telemetry,
        width,
        height,
        hiresScale,
        enableHiresFix,
        upscaleMethod,
        useSdpAttention,
        useTiledVae,
        enableFaceDetailer,
        enableRefiner,
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
        setSystemRamGb(32);
        setEnableHiresFix(false);
        setHiresScale(1.5);
        setUpscaleMethod("latent");
        setEnableFaceDetailer(false);
        setEnableRefiner(false);
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

                    {/* SECTION 6: WORKFLOW & MULTI-PASS UPSCALER SIMULATOR */}
                    <div className="vram-section-card">
                        <div className="vram-section-header">
                            <div className="vram-section-title-wrap">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="15 3 21 3 21 9" />
                                    <polyline points="9 21 3 21 3 15" />
                                    <line x1="21" y1="3" x2="14" y2="10" />
                                    <line x1="3" y1="21" x2="10" y2="14" />
                                </svg>
                                <span>6. Workflow Post-Processing &amp; Hi-Res Fix Simulator</span>
                            </div>
                            <span className="vram-section-badge">
                                {enableHiresFix ? `${hiresScale}x Upscale` : "Single Pass"}
                            </span>
                        </div>

                        {/* Hi-Res Fix Toggle */}
                        <div
                            className="vram-toggle-row"
                            onClick={() => setEnableHiresFix(!enableHiresFix)}
                        >
                            <div className="vram-toggle-info">
                                <span className="vram-toggle-title">Simulasi Hi-Res Fix (2-Pass Denoising)</span>
                                <span className="vram-toggle-desc">Penyebab utama OOM di WebUI. Menguji lonjakan VRAM saat Pass 2 latent upscaling.</span>
                            </div>
                            <div className={`vram-switch ${enableHiresFix ? "active" : ""}`}>
                                <div className="vram-switch-handle" />
                            </div>
                        </div>

                        {enableHiresFix && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "4px" }}>
                                {/* Scale Selector */}
                                <div className="vram-slider-row">
                                    <div className="vram-slider-top">
                                        <span>Skala Pembesaran (Hi-Res Scale):</span>
                                        <span className="vram-slider-val">{hiresScale}x ({multiPassTelemetry.pass2W}×{multiPassTelemetry.pass2H} px)</span>
                                    </div>
                                    <div className="vram-upscaler-chips">
                                        {[1.25, 1.5, 1.75, 2.0].map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                className={`vram-res-preset-chip ${hiresScale === s ? "active" : ""}`}
                                                onClick={() => setHiresScale(s)}
                                            >
                                                {s}x {s === 2.0 ? "(4K Mode)" : ""}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Upscaling Algorithm */}
                                <div className="vram-input-field">
                                    <label className="vram-input-label">Metode Upscaling di Workflow:</label>
                                    <div className="vram-quant-grid">
                                        <button
                                            type="button"
                                            className={`vram-quant-btn ${upscaleMethod === "latent" ? "active" : ""}`}
                                            onClick={() => setUpscaleMethod("latent")}
                                            title="Latent upscale: memproses seluruh tensor resolusi tinggi (resiko OOM tinggi)"
                                        >
                                            <span className="vram-quant-name">Latent (Full Denoise)</span>
                                            <span className="vram-quant-desc">Memori O(N²) lonjak drastis</span>
                                        </button>
                                        <button
                                            type="button"
                                            className={`vram-quant-btn ${upscaleMethod === "ultimate_sd" ? "active" : ""}`}
                                            onClick={() => setUpscaleMethod("ultimate_sd")}
                                            title="Ultimate SD Upscale: memotong canvas jadi ubin berurutan (hemat memori)"
                                        >
                                            <span className="vram-quant-name">Ultimate SD Upscale</span>
                                            <span className="vram-quant-desc">Tiled 2K/4K hemat VRAM</span>
                                        </button>
                                        <button
                                            type="button"
                                            className={`vram-quant-btn ${upscaleMethod === "model_upscale" ? "active" : ""}`}
                                            onClick={() => setUpscaleMethod("model_upscale")}
                                            title="Neural model upscale: 4x-UltraSharp / ESRGAN"
                                        >
                                            <span className="vram-quant-name">ESRGAN / UltraSharp</span>
                                            <span className="vram-quant-desc">Filter CNN ringan ~850MB</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Workflow Modules: FaceDetailer & Refiner */}
                        <div className="vram-workflow-toggle-grid">
                            <div
                                className="vram-toggle-row"
                                onClick={() => setEnableFaceDetailer(!enableFaceDetailer)}
                            >
                                <div className="vram-toggle-info">
                                    <span className="vram-toggle-title">FaceDetailer / ADetailer Pass</span>
                                    <span className="vram-toggle-desc">YOLOv8 face detection + localized inpaint KSampler (~+0.95 GB VRAM)</span>
                                </div>
                                <div className={`vram-switch ${enableFaceDetailer ? "active" : ""}`}>
                                    <div className="vram-switch-handle" />
                                </div>
                            </div>

                            <div
                                className="vram-toggle-row"
                                onClick={() => setEnableRefiner(!enableRefiner)}
                            >
                                <div className="vram-toggle-info">
                                    <span className="vram-toggle-title">2-Pass Refiner (SDXL 2nd KSampler)</span>
                                    <span className="vram-toggle-desc">Peralihan base model ke refiner model di tahap akhir sampling</span>
                                </div>
                                <div className={`vram-switch ${enableRefiner ? "active" : ""}`}>
                                    <div className="vram-switch-handle" />
                                </div>
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

                    {/* DUAL METER 2: SYSTEM RAM & CPU OFFLOAD METER */}
                    <div className="vram-ram-card">
                        <div className="vram-ram-header">
                            <div className="vram-ram-title-wrap">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                                    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                                    <line x1="6" y1="6" x2="6.01" y2="6" />
                                    <line x1="6" y1="18" x2="6.01" y2="18" />
                                </svg>
                                <span>Kebutuhan RAM Sistem (DDR4/DDR5)</span>
                            </div>
                            <span className={`vram-ram-badge ${ramTelemetry.ramStatus}`}>
                                {ramTelemetry.ramBadge}
                            </span>
                        </div>

                        {/* Progress Bar RAM */}
                        <div className="vram-ram-track">
                            <div
                                className={`vram-ram-fill ${ramTelemetry.ramStatus}`}
                                style={{ width: `${Math.min(100, Math.round(ramTelemetry.ramRatio * 100))}%` }}
                            />
                        </div>

                        <div className="vram-ram-stats-row">
                            <span>
                                Terpakai: <strong>~{ramTelemetry.totalRamNeededGb.toFixed(1)} GB</strong> ({Math.round(ramTelemetry.ramRatio * 100)}%)
                            </span>
                            <span>
                                Kapasitas: <strong>{systemRamGb} GB RAM</strong>
                            </span>
                        </div>

                        {/* RAM Selector Chips */}
                        <div className="vram-ram-selector-row">
                            <span style={{ fontSize: "11px", color: "#71717a" }}>Pilih RAM PC Anda:</span>
                            {[16, 32, 64, 128].map((gb) => (
                                <button
                                    key={gb}
                                    type="button"
                                    className={`vram-ram-chip ${systemRamGb === gb ? "active" : ""}`}
                                    onClick={() => setSystemRamGb(gb)}
                                >
                                    {gb} GB
                                </button>
                            ))}
                        </div>

                        <div className={`vram-ram-alert-msg ${ramTelemetry.ramStatus}`}>
                            {ramTelemetry.ramMessage}
                        </div>
                    </div>

                    {/* MULTI-PASS WORKFLOW COMPARISON TELEMETRY */}
                    <div className="vram-section-card" style={{ padding: "16px 18px" }}>
                        <div className="vram-section-header" style={{ paddingBottom: "10px" }}>
                            <div className="vram-section-title-wrap">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <path d="M3 9h18" />
                                    <path d="M9 21V9" />
                                </svg>
                                <span>Multi-Pass Workflow Telemetry</span>
                            </div>
                            <span className="vram-section-badge">
                                {multiPassTelemetry.isPass2Risk ? "⚠️ Resiko OOM Pass 2" : "3-Pass Aman"}
                            </span>
                        </div>

                        <div className="vram-multipass-grid">
                            {/* Pass 1 Box */}
                            <div className="vram-pass-box pass-safe">
                                <div className="vram-pass-top">
                                    <span className="vram-pass-badge p1">Pass 1: Base</span>
                                    <span className="vram-pass-res">{multiPassTelemetry.pass1W}×{multiPassTelemetry.pass1H}</span>
                                </div>
                                <div className="vram-pass-vram-num">
                                    ~{multiPassTelemetry.pass1Vram.toFixed(1)} GB
                                </div>
                                <span className="vram-pass-note">
                                    Generasi awal native model.
                                </span>
                            </div>

                            {/* Pass 2 Box */}
                            <div className={`vram-pass-box ${multiPassTelemetry.isPass2Risk ? "active-risk" : "pass-safe"}`}>
                                <div className="vram-pass-top">
                                    <span className="vram-pass-badge p2">Pass 2: Hi-Res</span>
                                    <span className="vram-pass-res">
                                        {enableHiresFix ? `${multiPassTelemetry.pass2W}×${multiPassTelemetry.pass2H}` : "Nonaktif"}
                                    </span>
                                </div>
                                <div className="vram-pass-vram-num" style={{ color: multiPassTelemetry.isPass2Risk ? "#f87171" : "#f4f4f5" }}>
                                    ~{multiPassTelemetry.pass2Vram.toFixed(1)} GB
                                </div>
                                <span className="vram-pass-note">
                                    {multiPassTelemetry.pass2Note}
                                </span>
                            </div>

                            {/* Post-Process Box */}
                            <div className={`vram-pass-box ${multiPassTelemetry.isPostProcessRisk ? "active-risk" : "pass-safe"}`}>
                                <div className="vram-pass-top">
                                    <span className="vram-pass-badge p3">Post-Process</span>
                                    <span className="vram-pass-res">
                                        {enableFaceDetailer ? "ADetailer" : enableRefiner ? "Refiner" : "Clean"}
                                    </span>
                                </div>
                                <div className="vram-pass-vram-num" style={{ color: multiPassTelemetry.isPostProcessRisk ? "#f87171" : "#f4f4f5" }}>
                                    ~{multiPassTelemetry.postProcessVram.toFixed(1)} GB
                                </div>
                                <span className="vram-pass-note">
                                    {enableFaceDetailer ? "YOLOv8 Face Inpainting aktif." : "Final output render."}
                                </span>
                            </div>
                        </div>

                        {multiPassTelemetry.isPass2Risk && (
                            <div style={{ marginTop: "10px", padding: "8px 12px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", borderRadius: "6px", fontSize: "12px", color: "#fca5a5", lineHeight: "1.4" }}>
                                ⚠️ <strong>Peringatan Lonjakan Pass 2:</strong> Pass 1 muat di GPU, namun Pass 2 (Hi-Res Fix) melebihi VRAM {targetGpuVram} GB GPU Anda! Ganti metode upscaling ke <strong>Ultimate SD Upscale</strong> atau aktifkan <strong>Tiled VAE</strong> untuk mencegah crash OOM.
                            </div>
                        )}
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
