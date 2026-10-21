import { useState, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { WorkflowBridgeBanner } from "../common/WorkflowBridgeBanner";
import {
    type WorkflowBridgeData,
    normalizeVramModel,
    bridgeToPromptLab,
    bridgeToCalculator,
} from "../../utils/workflowBridge";
import {
    type HardwareProfile,
    getActiveHardwareProfile,
} from "../../utils/hardwareProfile";
import { HardwareProfileModal } from "../common/HardwareProfileModal";
import "../../style/VramProfiler.css";

// ============================================================================
// Model & Pipeline Definitions
// ============================================================================

interface BaseModelDef {
    id: string;
    name: string;
    archLabel: string;
    paramCountB: number;
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
    bf16: { id: "bf16", name: "BF16 (Bfloat16)", bytesPerParam: 2.0, desc: "Rentang dinamis lebar standar Flux dan Wan 2.1 Video" },
    fp8_e4m3: { id: "fp8_e4m3", name: "FP8 (e4m3)", bytesPerParam: 1.0, desc: "Kuantisasi native RTX 40xx/Ada & RDNA 3+, hemat 50% VRAM bobot" },
    gguf_q8: { id: "gguf_q8", name: "GGUF Q8", bytesPerParam: 1.05, desc: "GGUF quant 8-bit kualitas prima via llama.cpp dan ComfyUI" },
    gguf_q4: { id: "gguf_q4", name: "GGUF Q4", bytesPerParam: 0.55, desc: "Kuantisasi agresif 4-bit, hemat alokasi VRAM ekstrem ~72%" },
    nf4: { id: "nf4", name: "NF4 (BnB)", bytesPerParam: 0.55, desc: "NormalFloat 4-bit native checkpoint Flux.1 BitsAndBytes" },
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

// ============================================================================
// Hardware Presets (NVIDIA, AMD Radeon & Apple Silicon Mac)
// ============================================================================

export interface GpuPreset {
    id: string;
    name: string;
    vramGb: number;
    tier: string;
    fp16Tflops: number;
    memBandwidthGbps: number;
    category: string;
    tdpWatts: number;
    isLaptop?: boolean;
    tgpMinWatts?: number;
    tgpMaxWatts?: number;
}

const GPU_PRESETS: GpuPreset[] = [
    // RTX 50 SERIES (BLACKWELL)
    { id: "rtx5090_desktop", name: "RTX 5090 Desktop (32 GB GDDR7)", vramGb: 32, tier: "Ultra Flagship", fp16Tflops: 700, memBandwidthGbps: 1792, category: "RTX 50 Series (Blackwell)", tdpWatts: 600 },
    { id: "rtx5090_laptop", name: "RTX 5090 Laptop (24 GB GDDR7)", vramGb: 24, tier: "Flagship Mobile", fp16Tflops: 450, memBandwidthGbps: 1152, category: "RTX 50 Series (Blackwell)", tdpWatts: 175, isLaptop: true, tgpMinWatts: 95, tgpMaxWatts: 175 },
    { id: "rtx5080_desktop", name: "RTX 5080 Desktop (16 GB GDDR7)", vramGb: 16, tier: "High-End Enthusiast", fp16Tflops: 380, memBandwidthGbps: 1008, category: "RTX 50 Series (Blackwell)", tdpWatts: 400 },
    { id: "rtx5080_laptop", name: "RTX 5080 Laptop (16 GB GDDR7)", vramGb: 16, tier: "Enthusiast Mobile", fp16Tflops: 260, memBandwidthGbps: 768, category: "RTX 50 Series (Blackwell)", tdpWatts: 175, isLaptop: true, tgpMinWatts: 95, tgpMaxWatts: 175 },
    { id: "rtx5070ti_desktop", name: "RTX 5070 Ti Desktop (16 GB GDDR7)", vramGb: 16, tier: "Upper Mid-Range", fp16Tflops: 250, memBandwidthGbps: 896, category: "RTX 50 Series (Blackwell)", tdpWatts: 300 },
    { id: "rtx5070_desktop", name: "RTX 5070 Desktop (12 GB GDDR7)", vramGb: 12, tier: "Mid-Range Sweetspot", fp16Tflops: 180, memBandwidthGbps: 672, category: "RTX 50 Series (Blackwell)", tdpWatts: 250 },
    { id: "rtx5070_laptop", name: "RTX 5070 Laptop (12 GB GDDR7)", vramGb: 12, tier: "Performance Mobile", fp16Tflops: 140, memBandwidthGbps: 512, category: "RTX 50 Series (Blackwell)", tdpWatts: 140, isLaptop: true, tgpMinWatts: 60, tgpMaxWatts: 140 },
    { id: "rtx5060ti_desktop", name: "RTX 5060 Ti Desktop (16 GB GDDR7)", vramGb: 16, tier: "Mainstream 16GB", fp16Tflops: 120, memBandwidthGbps: 448, category: "RTX 50 Series (Blackwell)", tdpWatts: 200 },
    { id: "rtx5060_desktop", name: "RTX 5060 Desktop (12 GB GDDR7)", vramGb: 12, tier: "Mainstream 12GB", fp16Tflops: 90, memBandwidthGbps: 384, category: "RTX 50 Series (Blackwell)", tdpWatts: 170 },
    { id: "rtx5060_laptop", name: "RTX 5060 Laptop (8 GB GDDR7)", vramGb: 8, tier: "Mainstream Mobile", fp16Tflops: 75, memBandwidthGbps: 320, category: "RTX 50 Series (Blackwell)", tdpWatts: 115, isLaptop: true, tgpMinWatts: 45, tgpMaxWatts: 115 },
    { id: "rtx5050_desktop", name: "RTX 5050 Desktop (8 GB GDDR7)", vramGb: 8, tier: "Budget Entry", fp16Tflops: 60, memBandwidthGbps: 288, category: "RTX 50 Series (Blackwell)", tdpWatts: 130 },
    { id: "rtx5050_laptop", name: "RTX 5050 Laptop (8 GB GDDR7)", vramGb: 8, tier: "Entry Mobile", fp16Tflops: 55, memBandwidthGbps: 256, category: "RTX 50 Series (Blackwell)", tdpWatts: 85, isLaptop: true, tgpMinWatts: 35, tgpMaxWatts: 85 },

    // RTX 40 SERIES (ADA LOVELACE)
    { id: "rtx4090", name: "RTX 4090 Desktop (24 GB)", vramGb: 24, tier: "Flagship Creator", fp16Tflops: 330, memBandwidthGbps: 1008, category: "RTX 40 Series (Ada Lovelace)", tdpWatts: 450 },
    { id: "rtx4090_laptop", name: "RTX 4090 Laptop (16 GB)", vramGb: 16, tier: "Flagship Mobile", fp16Tflops: 190, memBandwidthGbps: 576, category: "RTX 40 Series (Ada Lovelace)", tdpWatts: 175, isLaptop: true, tgpMinWatts: 80, tgpMaxWatts: 175 },
    { id: "rtx4080super_desktop", name: "RTX 4080 Super Desktop (16 GB)", vramGb: 16, tier: "High-End Enthusiast", fp16Tflops: 210, memBandwidthGbps: 736, category: "RTX 40 Series (Ada Lovelace)", tdpWatts: 320 },
    { id: "rtx4080_desktop", name: "RTX 4080 Desktop (16 GB)", vramGb: 16, tier: "High-End Enthusiast", fp16Tflops: 195, memBandwidthGbps: 716, category: "RTX 40 Series (Ada Lovelace)", tdpWatts: 320 },
    { id: "rtx4080_laptop", name: "RTX 4080 Laptop (12 GB)", vramGb: 12, tier: "Enthusiast Mobile", fp16Tflops: 140, memBandwidthGbps: 432, category: "RTX 40 Series (Ada Lovelace)", tdpWatts: 175, isLaptop: true, tgpMinWatts: 60, tgpMaxWatts: 175 },
    { id: "rtx4070ti", name: "RTX 4070 Ti Super Desktop (16 GB)", vramGb: 16, tier: "Enthusiast 16GB", fp16Tflops: 176, memBandwidthGbps: 672, category: "RTX 40 Series (Ada Lovelace)", tdpWatts: 285 },
    { id: "rtx4070ti_12gb", name: "RTX 4070 Ti Desktop (12 GB)", vramGb: 12, tier: "Upper Mid-Range", fp16Tflops: 160, memBandwidthGbps: 504, category: "RTX 40 Series (Ada Lovelace)", tdpWatts: 285 },
    { id: "rtx4070super_desktop", name: "RTX 4070 Super Desktop (12 GB)", vramGb: 12, tier: "Mid-Range Sweetspot", fp16Tflops: 140, memBandwidthGbps: 504, category: "RTX 40 Series (Ada Lovelace)", tdpWatts: 220 },
    { id: "rtx4070_desktop", name: "RTX 4070 Desktop (12 GB)", vramGb: 12, tier: "Mid-Range Sweetspot", fp16Tflops: 118, memBandwidthGbps: 504, category: "RTX 40 Series (Ada Lovelace)", tdpWatts: 200 },
    { id: "rtx4070_laptop", name: "RTX 4070 Laptop (8 GB - TUF A16 / Legion)", vramGb: 8, tier: "Performance Mobile 140W", fp16Tflops: 85, memBandwidthGbps: 256, category: "RTX 40 Series (Ada Lovelace)", tdpWatts: 140, isLaptop: true, tgpMinWatts: 35, tgpMaxWatts: 140 },
    { id: "rtx4060ti_16gb", name: "RTX 4060 Ti Desktop (16 GB)", vramGb: 16, tier: "AI Sweetspot 16GB", fp16Tflops: 88, memBandwidthGbps: 288, category: "RTX 40 Series (Ada Lovelace)", tdpWatts: 165 },
    { id: "rtx4060ti_8gb", name: "RTX 4060 Ti Desktop (8 GB)", vramGb: 8, tier: "Mainstream 8GB", fp16Tflops: 88, memBandwidthGbps: 288, category: "RTX 40 Series (Ada Lovelace)", tdpWatts: 160 },
    { id: "rtx4060", name: "RTX 4060 Desktop (8 GB)", vramGb: 8, tier: "Mainstream Standard", fp16Tflops: 60, memBandwidthGbps: 272, category: "RTX 40 Series (Ada Lovelace)", tdpWatts: 115 },
    { id: "rtx4060_laptop", name: "RTX 4060 Laptop (8 GB - TUF A16 / Nitro)", vramGb: 8, tier: "Mainstream Mobile 140W", fp16Tflops: 50, memBandwidthGbps: 256, category: "RTX 40 Series (Ada Lovelace)", tdpWatts: 140, isLaptop: true, tgpMinWatts: 45, tgpMaxWatts: 140 },
    { id: "rtx4050_laptop", name: "RTX 4050 Laptop (6 GB)", vramGb: 6, tier: "Budget Entry Mobile", fp16Tflops: 38, memBandwidthGbps: 192, category: "RTX 40 Series (Ada Lovelace)", tdpWatts: 115, isLaptop: true, tgpMinWatts: 35, tgpMaxWatts: 115 },

    // RTX 30 SERIES (AMPERE)
    { id: "rtx3090ti_desktop", name: "RTX 3090 Ti Desktop (24 GB)", vramGb: 24, tier: "Titan Class", fp16Tflops: 160, memBandwidthGbps: 1008, category: "RTX 30 Series (Ampere)", tdpWatts: 450 },
    { id: "rtx3090_desktop", name: "RTX 3090 Desktop (24 GB)", vramGb: 24, tier: "AI Creator 24GB", fp16Tflops: 142, memBandwidthGbps: 936, category: "RTX 30 Series (Ampere)", tdpWatts: 350 },
    { id: "rtx3080ti_desktop", name: "RTX 3080 Ti Desktop (12 GB)", vramGb: 12, tier: "High-End", fp16Tflops: 136, memBandwidthGbps: 912, category: "RTX 30 Series (Ampere)", tdpWatts: 350 },
    { id: "rtx3080ti_laptop", name: "RTX 3080 Ti Laptop (16 GB)", vramGb: 16, tier: "Flagship Mobile", fp16Tflops: 95, memBandwidthGbps: 512, category: "RTX 30 Series (Ampere)", tdpWatts: 175, isLaptop: true, tgpMinWatts: 80, tgpMaxWatts: 175 },
    { id: "rtx3080_12gb", name: "RTX 3080 Desktop (12 GB)", vramGb: 12, tier: "High-End", fp16Tflops: 122, memBandwidthGbps: 912, category: "RTX 30 Series (Ampere)", tdpWatts: 350 },
    { id: "rtx3080_10gb", name: "RTX 3080 Desktop (10 GB)", vramGb: 10, tier: "High-End", fp16Tflops: 119, memBandwidthGbps: 760, category: "RTX 30 Series (Ampere)", tdpWatts: 320 },
    { id: "rtx3080_laptop_16gb", name: "RTX 3080 Laptop (16 GB)", vramGb: 16, tier: "Enthusiast Mobile 16GB", fp16Tflops: 80, memBandwidthGbps: 448, category: "RTX 30 Series (Ampere)", tdpWatts: 150, isLaptop: true, tgpMinWatts: 80, tgpMaxWatts: 150 },
    { id: "rtx3080_laptop_8gb", name: "RTX 3080 Laptop (8 GB)", vramGb: 8, tier: "Enthusiast Mobile 8GB", fp16Tflops: 75, memBandwidthGbps: 448, category: "RTX 30 Series (Ampere)", tdpWatts: 150, isLaptop: true, tgpMinWatts: 80, tgpMaxWatts: 150 },
    { id: "rtx3070ti_desktop", name: "RTX 3070 Ti Desktop (8 GB)", vramGb: 8, tier: "Upper Mid-Range", fp16Tflops: 87, memBandwidthGbps: 608, category: "RTX 30 Series (Ampere)", tdpWatts: 290 },
    { id: "rtx3070ti_laptop", name: "RTX 3070 Ti Laptop (8 GB)", vramGb: 8, tier: "Performance Mobile", fp16Tflops: 70, memBandwidthGbps: 448, category: "RTX 30 Series (Ampere)", tdpWatts: 150, isLaptop: true, tgpMinWatts: 80, tgpMaxWatts: 150 },
    { id: "rtx3070_desktop", name: "RTX 3070 Desktop (8 GB)", vramGb: 8, tier: "Mid-Range", fp16Tflops: 81, memBandwidthGbps: 448, category: "RTX 30 Series (Ampere)", tdpWatts: 220 },
    { id: "rtx3070_laptop", name: "RTX 3070 Laptop (8 GB)", vramGb: 8, tier: "Performance Mobile", fp16Tflops: 62, memBandwidthGbps: 448, category: "RTX 30 Series (Ampere)", tdpWatts: 140, isLaptop: true, tgpMinWatts: 80, tgpMaxWatts: 140 },
    { id: "rtx3060ti_desktop", name: "RTX 3060 Ti Desktop (8 GB)", vramGb: 8, tier: "Mainstream Performance", fp16Tflops: 65, memBandwidthGbps: 448, category: "RTX 30 Series (Ampere)", tdpWatts: 200 },
    { id: "rtx3060_12", name: "RTX 3060 Desktop (12 GB)", vramGb: 12, tier: "Sweet Spot 12GB", fp16Tflops: 51, memBandwidthGbps: 360, category: "RTX 30 Series (Ampere)", tdpWatts: 170 },
    { id: "rtx3060_8gb_desktop", name: "RTX 3060 Desktop (8 GB)", vramGb: 8, tier: "Mainstream", fp16Tflops: 45, memBandwidthGbps: 240, category: "RTX 30 Series (Ampere)", tdpWatts: 170 },
    { id: "rtx3060_laptop", name: "RTX 3060 Laptop (6 GB)", vramGb: 6, tier: "Mainstream Mobile", fp16Tflops: 40, memBandwidthGbps: 336, category: "RTX 30 Series (Ampere)", tdpWatts: 130, isLaptop: true, tgpMinWatts: 60, tgpMaxWatts: 130 },
    { id: "rtx3050_8gb_desktop", name: "RTX 3050 Desktop (8 GB)", vramGb: 8, tier: "Budget Entry", fp16Tflops: 36, memBandwidthGbps: 224, category: "RTX 30 Series (Ampere)", tdpWatts: 130 },
    { id: "rtx3050_6gb_desktop", name: "RTX 3050 Desktop (6 GB)", vramGb: 6, tier: "Budget Entry 6GB", fp16Tflops: 28, memBandwidthGbps: 168, category: "RTX 30 Series (Ampere)", tdpWatts: 70 },
    { id: "rtx3050_laptop_6gb", name: "RTX 3050 Laptop (6 GB)", vramGb: 6, tier: "Entry Mobile 6GB", fp16Tflops: 28, memBandwidthGbps: 168, category: "RTX 30 Series (Ampere)", tdpWatts: 80, isLaptop: true, tgpMinWatts: 35, tgpMaxWatts: 80 },
    { id: "rtx3050_laptop_4gb", name: "RTX 3050 Laptop (4 GB)", vramGb: 4, tier: "Entry Mobile 4GB", fp16Tflops: 24, memBandwidthGbps: 192, category: "RTX 30 Series (Ampere)", tdpWatts: 80, isLaptop: true, tgpMinWatts: 35, tgpMaxWatts: 80 },

    // RTX 20 SERIES & GTX
    { id: "titan_rtx", name: "TITAN RTX Desktop (24 GB)", vramGb: 24, tier: "Turing Flagship", fp16Tflops: 65, memBandwidthGbps: 672, category: "RTX 20 Series & GTX (Turing)", tdpWatts: 280 },
    { id: "rtx2080ti_desktop", name: "RTX 2080 Ti Desktop (11 GB)", vramGb: 11, tier: "Enthusiast Turing", fp16Tflops: 54, memBandwidthGbps: 616, category: "RTX 20 Series & GTX (Turing)", tdpWatts: 250 },
    { id: "rtx2080super_desktop", name: "RTX 2080 Super Desktop (8 GB)", vramGb: 8, tier: "High-End Turing", fp16Tflops: 45, memBandwidthGbps: 496, category: "RTX 20 Series & GTX (Turing)", tdpWatts: 250 },
    { id: "rtx2080super_laptop", name: "RTX 2080 Super Laptop (8 GB)", vramGb: 8, tier: "Flagship Mobile Turing", fp16Tflops: 38, memBandwidthGbps: 448, category: "RTX 20 Series & GTX (Turing)", tdpWatts: 150, isLaptop: true, tgpMinWatts: 80, tgpMaxWatts: 150 },
    { id: "rtx2080_desktop", name: "RTX 2080 Desktop (8 GB)", vramGb: 8, tier: "High-End Turing", fp16Tflops: 40, memBandwidthGbps: 448, category: "RTX 20 Series & GTX (Turing)", tdpWatts: 215 },
    { id: "rtx2080_laptop", name: "RTX 2080 Laptop (8 GB)", vramGb: 8, tier: "High-End Mobile Turing", fp16Tflops: 34, memBandwidthGbps: 448, category: "RTX 20 Series & GTX (Turing)", tdpWatts: 150, isLaptop: true, tgpMinWatts: 80, tgpMaxWatts: 150 },
    { id: "rtx2070super_desktop", name: "RTX 2070 Super Desktop (8 GB)", vramGb: 8, tier: "Upper Mid Turing", fp16Tflops: 36, memBandwidthGbps: 448, category: "RTX 20 Series & GTX (Turing)", tdpWatts: 215 },
    { id: "rtx2070super_laptop", name: "RTX 2070 Super Laptop (8 GB)", vramGb: 8, tier: "Upper Mid Mobile Turing", fp16Tflops: 30, memBandwidthGbps: 448, category: "RTX 20 Series & GTX (Turing)", tdpWatts: 115, isLaptop: true, tgpMinWatts: 60, tgpMaxWatts: 115 },
    { id: "rtx2070_desktop", name: "RTX 2070 Desktop (8 GB)", vramGb: 8, tier: "Mid-Range Turing", fp16Tflops: 30, memBandwidthGbps: 448, category: "RTX 20 Series & GTX (Turing)", tdpWatts: 175 },
    { id: "rtx2070_laptop", name: "RTX 2070 Laptop (8 GB)", vramGb: 8, tier: "Mid-Range Mobile Turing", fp16Tflops: 26, memBandwidthGbps: 448, category: "RTX 20 Series & GTX (Turing)", tdpWatts: 115, isLaptop: true, tgpMinWatts: 60, tgpMaxWatts: 115 },
    { id: "rtx2060super_desktop", name: "RTX 2060 Super Desktop (8 GB)", vramGb: 8, tier: "Sweetspot Turing 8GB", fp16Tflops: 29, memBandwidthGbps: 448, category: "RTX 20 Series & GTX (Turing)", tdpWatts: 175 },
    { id: "rtx2060_12gb_desktop", name: "RTX 2060 Desktop (12 GB)", vramGb: 12, tier: "Turing 12GB", fp16Tflops: 26, memBandwidthGbps: 336, category: "RTX 20 Series & GTX (Turing)", tdpWatts: 160 },
    { id: "rtx2060", name: "RTX 2060 Desktop (6 GB)", vramGb: 6, tier: "Entry VRAM", fp16Tflops: 26, memBandwidthGbps: 336, category: "RTX 20 Series & GTX (Turing)", tdpWatts: 160 },
    { id: "rtx2060_laptop", name: "RTX 2060 Laptop (6 GB)", vramGb: 6, tier: "Entry Mobile Turing", fp16Tflops: 22, memBandwidthGbps: 336, category: "RTX 20 Series & GTX (Turing)", tdpWatts: 115, isLaptop: true, tgpMinWatts: 60, tgpMaxWatts: 115 },
    { id: "rtx2050_laptop", name: "RTX 2050 Laptop (4 GB)", vramGb: 4, tier: "Budget Laptop Ampere/Turing", fp16Tflops: 18, memBandwidthGbps: 112, category: "RTX 20 Series & GTX (Turing)", tdpWatts: 45, isLaptop: true, tgpMinWatts: 30, tgpMaxWatts: 45 },
    { id: "gtx1660ti", name: "GTX 1660 Ti / Super Desktop (6 GB)", vramGb: 6, tier: "Legacy GTX", fp16Tflops: 10, memBandwidthGbps: 288, category: "RTX 20 Series & GTX (Turing)", tdpWatts: 125 },
    { id: "gtx1650", name: "GTX 1650 Desktop / Laptop (4 GB)", vramGb: 4, tier: "Budget Entry", fp16Tflops: 6.5, memBandwidthGbps: 128, category: "RTX 20 Series & GTX (Turing)", tdpWatts: 75 },

    // WORKSTATION & DATACENTER
    { id: "h100", name: "NVIDIA H100 SXM5 / PCIe (80 GB)", vramGb: 80, tier: "Enterprise Hopper", fp16Tflops: 990, memBandwidthGbps: 3350, category: "Workstation & Datacenter", tdpWatts: 700 },
    { id: "a100_80gb", name: "NVIDIA A100 PCIe (80 GB)", vramGb: 80, tier: "Enterprise Ampere", fp16Tflops: 312, memBandwidthGbps: 1935, category: "Workstation & Datacenter", tdpWatts: 250 },
    { id: "a6000", name: "RTX 6000 Ada Generation (48 GB)", vramGb: 48, tier: "Workstation Pro", fp16Tflops: 365, memBandwidthGbps: 960, category: "Workstation & Datacenter", tdpWatts: 300 },
    { id: "rtxa6000", name: "RTX A6000 Ampere (48 GB)", vramGb: 48, tier: "Pro Workstation Ampere", fp16Tflops: 150, memBandwidthGbps: 768, category: "Workstation & Datacenter", tdpWatts: 300 },
    { id: "rtx5000_ada", name: "RTX 5000 Ada Generation (32 GB)", vramGb: 32, tier: "Pro Workstation Ada", fp16Tflops: 260, memBandwidthGbps: 576, category: "Workstation & Datacenter", tdpWatts: 250 },
    { id: "rtx4000_ada", name: "RTX 4000 Ada Generation (20 GB)", vramGb: 20, tier: "Pro Workstation Ada", fp16Tflops: 150, memBandwidthGbps: 360, category: "Workstation & Datacenter", tdpWatts: 130 },
    { id: "rtxa5000", name: "RTX A5000 Ampere (24 GB)", vramGb: 24, tier: "Pro Workstation", fp16Tflops: 110, memBandwidthGbps: 768, category: "Workstation & Datacenter", tdpWatts: 230 },
    { id: "rtxa4000", name: "RTX A4000 Ampere (16 GB)", vramGb: 16, tier: "Pro Workstation", fp16Tflops: 75, memBandwidthGbps: 448, category: "Workstation & Datacenter", tdpWatts: 140 },
    { id: "rtxa2000_12gb", name: "RTX A2000 (12 GB)", vramGb: 12, tier: "Compact Workstation", fp16Tflops: 32, memBandwidthGbps: 288, category: "Workstation & Datacenter", tdpWatts: 70 },

    // KUSTOM / MANUAL
    { id: "custom", name: "Kustom / Slider Bebas Manual", vramGb: 12, tier: "Manual", fp16Tflops: 70, memBandwidthGbps: 400, category: "Kustom / Manual", tdpWatts: 200 },
];

const GROUPED_GPU_PRESETS: Record<string, GpuPreset[]> = GPU_PRESETS.reduce((acc, gpu) => {
    const cat = gpu.category || "Lainnya";
    if (!acc[cat]) {
        acc[cat] = [];
    }
    acc[cat].push(gpu);
    return acc;
}, {} as Record<string, GpuPreset[]>);

// AMD Radeon Presets (DirectML / ROCm)
export interface AmdGpuPreset {
    id: string;
    name: string;
    vramGb: number;
    series: "RX 6000" | "RX 7000" | "RX 8000";
    fp16Tflops: number;
    memBandwidthGbps: number;
    tbpWatts: number;
    gfxVersion: string;
}

const AMD_GPU_PRESETS: AmdGpuPreset[] = [
    // RX 8000 (RDNA 4)
    { id: "rx8800xt", name: "AMD Radeon RX 8800 XT (16 GB RDNA 4)", vramGb: 16, series: "RX 8000", fp16Tflops: 120, memBandwidthGbps: 640, tbpWatts: 250, gfxVersion: "12.0.0" },
    { id: "rx8600", name: "AMD Radeon RX 8600 (12 GB RDNA 4)", vramGb: 12, series: "RX 8000", fp16Tflops: 75, memBandwidthGbps: 432, tbpWatts: 175, gfxVersion: "12.0.0" },

    // RX 7000 (RDNA 3)
    { id: "rx7900xtx", name: "AMD Radeon RX 7900 XTX (24 GB)", vramGb: 24, series: "RX 7000", fp16Tflops: 123, memBandwidthGbps: 960, tbpWatts: 355, gfxVersion: "11.0.0" },
    { id: "rx7900xt", name: "AMD Radeon RX 7900 XT (20 GB)", vramGb: 20, series: "RX 7000", fp16Tflops: 103, memBandwidthGbps: 800, tbpWatts: 315, gfxVersion: "11.0.0" },
    { id: "rx7900gre", name: "AMD Radeon RX 7900 GRE (16 GB)", vramGb: 16, series: "RX 7000", fp16Tflops: 92, memBandwidthGbps: 576, tbpWatts: 260, gfxVersion: "11.0.0" },
    { id: "rx7800xt", name: "AMD Radeon RX 7800 XT (16 GB)", vramGb: 16, series: "RX 7000", fp16Tflops: 74, memBandwidthGbps: 624, tbpWatts: 263, gfxVersion: "11.0.0" },
    { id: "rx7700xt", name: "AMD Radeon RX 7700 XT (12 GB)", vramGb: 12, series: "RX 7000", fp16Tflops: 70, memBandwidthGbps: 432, tbpWatts: 245, gfxVersion: "11.0.0" },
    { id: "rx7600xt", name: "AMD Radeon RX 7600 XT (16 GB)", vramGb: 16, series: "RX 7000", fp16Tflops: 43, memBandwidthGbps: 288, tbpWatts: 190, gfxVersion: "11.0.2" },
    { id: "rx7600", name: "AMD Radeon RX 7600 (8 GB)", vramGb: 8, series: "RX 7000", fp16Tflops: 43, memBandwidthGbps: 288, tbpWatts: 165, gfxVersion: "11.0.2" },
    { id: "rx7700s_laptop", name: "AMD Radeon RX 7700S Laptop (8 GB - TUF A16)", vramGb: 8, series: "RX 7000", fp16Tflops: 64, memBandwidthGbps: 288, tbpWatts: 120, gfxVersion: "11.0.2" },
    { id: "rx7600s_laptop", name: "AMD Radeon RX 7600S Laptop (8 GB - TUF A16)", vramGb: 8, series: "RX 7000", fp16Tflops: 56, memBandwidthGbps: 256, tbpWatts: 95, gfxVersion: "11.0.2" },

    // RX 6000 (RDNA 2)
    { id: "rx6950xt", name: "AMD Radeon RX 6950 XT (16 GB)", vramGb: 16, series: "RX 6000", fp16Tflops: 47, memBandwidthGbps: 576, tbpWatts: 335, gfxVersion: "10.3.0" },
    { id: "rx6900xt", name: "AMD Radeon RX 6900 XT (16 GB)", vramGb: 16, series: "RX 6000", fp16Tflops: 46, memBandwidthGbps: 512, tbpWatts: 300, gfxVersion: "10.3.0" },
    { id: "rx6800xt", name: "AMD Radeon RX 6800 XT (16 GB)", vramGb: 16, series: "RX 6000", fp16Tflops: 41, memBandwidthGbps: 512, tbpWatts: 300, gfxVersion: "10.3.0" },
    { id: "rx6800", name: "AMD Radeon RX 6800 (16 GB)", vramGb: 16, series: "RX 6000", fp16Tflops: 32, memBandwidthGbps: 512, tbpWatts: 250, gfxVersion: "10.3.0" },
    { id: "rx6750xt", name: "AMD Radeon RX 6750 XT (12 GB)", vramGb: 12, series: "RX 6000", fp16Tflops: 26, memBandwidthGbps: 432, tbpWatts: 250, gfxVersion: "10.3.1" },
    { id: "rx6700xt", name: "AMD Radeon RX 6700 XT (12 GB)", vramGb: 12, series: "RX 6000", fp16Tflops: 26, memBandwidthGbps: 384, tbpWatts: 230, gfxVersion: "10.3.1" },
    { id: "rx6650xt", name: "AMD Radeon RX 6650 XT (8 GB)", vramGb: 8, series: "RX 6000", fp16Tflops: 21, memBandwidthGbps: 280, tbpWatts: 180, gfxVersion: "10.3.2" },
    { id: "rx6600xt", name: "AMD Radeon RX 6600 XT (8 GB)", vramGb: 8, series: "RX 6000", fp16Tflops: 21, memBandwidthGbps: 256, tbpWatts: 160, gfxVersion: "10.3.2" },
    { id: "rx6600", name: "AMD Radeon RX 6600 (8 GB)", vramGb: 8, series: "RX 6000", fp16Tflops: 18, memBandwidthGbps: 224, tbpWatts: 132, gfxVersion: "10.3.2" },
];

// Apple Silicon Mac Presets (Metal MPS / MLX)
export interface AppleMacPreset {
    id: string;
    name: string;
    chipSeries: "M1 / M2" | "M3" | "M4";
    unifiedRamGb: number;
    gpuCores: number;
    fp16Tflops: number;
    socTdpWatts: number;
}

const APPLE_MAC_PRESETS: AppleMacPreset[] = [
    // M4 Series
    { id: "m4_max_128", name: "Apple M4 Max (128 GB Unified Memory, 40-core GPU)", chipSeries: "M4", unifiedRamGb: 128, gpuCores: 40, fp16Tflops: 36, socTdpWatts: 65 },
    { id: "m4_max_64", name: "Apple M4 Max (64 GB Unified Memory, 32-core GPU)", chipSeries: "M4", unifiedRamGb: 64, gpuCores: 32, fp16Tflops: 29, socTdpWatts: 55 },
    { id: "m4_pro_48", name: "Apple M4 Pro (48 GB Unified Memory, 20-core GPU)", chipSeries: "M4", unifiedRamGb: 48, gpuCores: 20, fp16Tflops: 18, socTdpWatts: 42 },
    { id: "m4_pro_24", name: "Apple M4 Pro (24 GB Unified Memory, 16-core GPU)", chipSeries: "M4", unifiedRamGb: 24, gpuCores: 16, fp16Tflops: 15, socTdpWatts: 35 },
    { id: "m4_base_32", name: "Apple M4 (32 GB Unified Memory, 10-core GPU)", chipSeries: "M4", unifiedRamGb: 32, gpuCores: 10, fp16Tflops: 9.5, socTdpWatts: 22 },
    { id: "m4_base_24", name: "Apple M4 (24 GB Unified Memory, 10-core GPU)", chipSeries: "M4", unifiedRamGb: 24, gpuCores: 10, fp16Tflops: 9.5, socTdpWatts: 22 },
    { id: "m4_base_16", name: "Apple M4 (16 GB Unified Memory, 10-core GPU)", chipSeries: "M4", unifiedRamGb: 16, gpuCores: 10, fp16Tflops: 9.5, socTdpWatts: 20 },

    // M3 Series
    { id: "m3_max_128", name: "Apple M3 Max (128 GB Unified Memory, 40-core GPU)", chipSeries: "M3", unifiedRamGb: 128, gpuCores: 40, fp16Tflops: 32, socTdpWatts: 65 },
    { id: "m3_max_64", name: "Apple M3 Max (64 GB Unified Memory, 30-core GPU)", chipSeries: "M3", unifiedRamGb: 64, gpuCores: 30, fp16Tflops: 25, socTdpWatts: 55 },
    { id: "m3_pro_36", name: "Apple M3 Pro (36 GB Unified Memory, 18-core GPU)", chipSeries: "M3", unifiedRamGb: 36, gpuCores: 18, fp16Tflops: 15, socTdpWatts: 38 },
    { id: "m3_pro_18", name: "Apple M3 Pro (18 GB Unified Memory, 14-core GPU)", chipSeries: "M3", unifiedRamGb: 18, gpuCores: 14, fp16Tflops: 12, socTdpWatts: 32 },
    { id: "m3_base_24", name: "Apple M3 (24 GB Unified Memory, 10-core GPU)", chipSeries: "M3", unifiedRamGb: 24, gpuCores: 10, fp16Tflops: 8.5, socTdpWatts: 22 },
    { id: "m3_base_16", name: "Apple M3 (16 GB Unified Memory, 10-core GPU)", chipSeries: "M3", unifiedRamGb: 16, gpuCores: 10, fp16Tflops: 8.5, socTdpWatts: 20 },
    { id: "m3_base_8", name: "Apple M3 (8 GB Unified Memory, 8-core GPU)", chipSeries: "M3", unifiedRamGb: 8, gpuCores: 8, fp16Tflops: 7.0, socTdpWatts: 18 },

    // M1 / M2 Series
    { id: "m2_ultra_192", name: "Apple M2 Ultra (192 GB Unified Memory, 76-core GPU)", chipSeries: "M1 / M2", unifiedRamGb: 192, gpuCores: 76, fp16Tflops: 55, socTdpWatts: 100 },
    { id: "m2_ultra_64", name: "Apple M2 Ultra (64 GB Unified Memory, 60-core GPU)", chipSeries: "M1 / M2", unifiedRamGb: 64, gpuCores: 60, fp16Tflops: 45, socTdpWatts: 90 },
    { id: "m2_max_96", name: "Apple M2 Max (96 GB Unified Memory, 38-core GPU)", chipSeries: "M1 / M2", unifiedRamGb: 96, gpuCores: 38, fp16Tflops: 27, socTdpWatts: 55 },
    { id: "m2_max_32", name: "Apple M2 Max (32 GB Unified Memory, 30-core GPU)", chipSeries: "M1 / M2", unifiedRamGb: 32, gpuCores: 30, fp16Tflops: 22, socTdpWatts: 50 },
    { id: "m2_pro_32", name: "Apple M2 Pro (32 GB Unified Memory, 19-core GPU)", chipSeries: "M1 / M2", unifiedRamGb: 32, gpuCores: 19, fp16Tflops: 14, socTdpWatts: 35 },
    { id: "m2_pro_16", name: "Apple M2 Pro (16 GB Unified Memory, 16-core GPU)", chipSeries: "M1 / M2", unifiedRamGb: 16, gpuCores: 16, fp16Tflops: 12, socTdpWatts: 30 },
    { id: "m2_base_16", name: "Apple M2 (16 GB Unified Memory, 10-core GPU)", chipSeries: "M1 / M2", unifiedRamGb: 16, gpuCores: 10, fp16Tflops: 7.2, socTdpWatts: 20 },
    { id: "m2_base_8", name: "Apple M2 (8 GB Unified Memory, 8-core GPU)", chipSeries: "M1 / M2", unifiedRamGb: 8, gpuCores: 8, fp16Tflops: 6.0, socTdpWatts: 18 },
    { id: "m1_max_64", name: "Apple M1 Max (64 GB Unified Memory, 32-core GPU)", chipSeries: "M1 / M2", unifiedRamGb: 64, gpuCores: 32, fp16Tflops: 21, socTdpWatts: 50 },
    { id: "m1_pro_16", name: "Apple M1 Pro (16 GB Unified Memory, 16-core GPU)", chipSeries: "M1 / M2", unifiedRamGb: 16, gpuCores: 16, fp16Tflops: 10, socTdpWatts: 30 },
    { id: "m1_base_8", name: "Apple M1 (8 GB Unified Memory, 8-core GPU)", chipSeries: "M1 / M2", unifiedRamGb: 8, gpuCores: 8, fp16Tflops: 5.2, socTdpWatts: 15 },
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
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // 0. Primary Platform Navigation Tab (NVIDIA vs AMD Radeon vs Apple Silicon Mac)
    const [platformTab, setPlatformTab] = useState<"nvidia" | "amd" | "apple">("nvidia");

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
    const [width, setWidth] = useState<number>(() => {
        const w = searchParams.get("width");
        if (w && !isNaN(Number(w)) && Number(w) > 0) return Number(w);
        return activeModel.defaultResolution.w;
    });
    const [height, setHeight] = useState<number>(() => {
        const h = searchParams.get("height");
        if (h && !isNaN(Number(h)) && Number(h) > 0) return Number(h);
        return activeModel.defaultResolution.h;
    });
    const [batchSize, setBatchSize] = useState<number>(1);
    const [videoFrames, setVideoFrames] = useState<number>(activeModel.defaultFrames || 81);

    // 5. LoRA & ControlNet
    const [loraCount, setLoraCount] = useState<number>(1);
    const [controlnetCount, setControlnetCount] = useState<number>(0);

    // 6. Optimizations
    const [useSdpAttention, setUseSdpAttention] = useState<boolean>(true);
    const [useTiledVae, setUseTiledVae] = useState<boolean>(true);
    const [useMedvramChunking, setUseMedvramChunking] = useState<boolean>(false);

    // Active Hardware Profile from LocalStorage
    const [activeProfile, setActiveProfile] = useState<HardwareProfile>(() => getActiveHardwareProfile());
    const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = useCallback((msg: string) => {
        setToastMessage(msg);
        setTimeout(() => {
            setToastMessage((prev) => (prev === msg ? null : prev));
        }, 3000);
    }, []);

    // 7. NVIDIA Target GPU
    const [gpuPresetId, setGpuPresetId] = useState<string>(() => activeProfile.gpuPresetId || "rtx4060_laptop");
    const [customGpuVram, setCustomGpuVram] = useState<number>(() => activeProfile.customGpuVram || 8);
    const [copiedComfy, setCopiedComfy] = useState<boolean>(false);

    // 8. AMD Radeon Target GPU & Backend
    const [amdGpuId, setAmdGpuId] = useState<string>("rx7800xt");
    const [amdBackend, setAmdBackend] = useState<"directml" | "rocm">("directml");

    // 9. Apple Silicon Mac Target Unified Memory & Backend
    const [macPresetId, setMacPresetId] = useState<string>("m3_pro_36");
    const [macBackend, setMacBackend] = useState<"mps" | "mlx">("mps");

    // 10. Windows Desktop & Multi-Monitor VRAM Deduction
    const [displayDeductionMode, setDisplayDeductionMode] = useState<"primary_single" | "primary_multi" | "headless">(
        () => activeProfile.displayDeductionMode || "primary_single"
    );

    // 11. System RAM Target (DDR4/DDR5) for Host CPU Offloading
    const [systemRamGb, setSystemRamGb] = useState<number>(() => activeProfile.systemRamGb || 32);

    // 12. Hi-Res Fix & Workflow Post-Processing Simulator
    const [enableHiresFix, setEnableHiresFix] = useState<boolean>(false);
    const [hiresScale, setHiresScale] = useState<number>(1.5);
    const [upscaleMethod, setUpscaleMethod] = useState<"latent" | "ultimate_sd" | "model_upscale">("latent");
    const [enableFaceDetailer, setEnableFaceDetailer] = useState<boolean>(false);
    const [enableRefiner, setEnableRefiner] = useState<boolean>(false);

    // 13. Throughput & Generation Speed Estimator
    const [samplingSteps, setSamplingSteps] = useState<number>(() => {
        const s = searchParams.get("steps");
        if (s && !isNaN(Number(s)) && Number(s) > 0) return Number(s);
        return modelKey === "flux" ? 20 : 25;
    });

    // 14. Power & Electricity Cost Estimator
    const [plnTarifPerKwh, setPlnTarifPerKwh] = useState<number>(() => activeProfile.plnTarifPerKwh || 1444);
    const [batchImageCount, setBatchImageCount] = useState<number>(100);
    const [laptopTgpWatts, setLaptopTgpWatts] = useState<number>(() => activeProfile.laptopTgpWatts || 140);
    const [tufProfile, setTufProfile] = useState<"turbo" | "perf" | "silent" | "overnight" | "custom">(() => activeProfile.tufProfile || "perf");
    const [cpuWatts, setCpuWatts] = useState<number>(() => activeProfile.cpuWatts || 35);

    const [billingType, setBillingType] = useState<"token" | "pascabayar">("token");
    const [tokenNominal, setTokenNominal] = useState<number>(50000);

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
        if (key === "flux") {
            setSamplingSteps(20);
        }
    };

    // Active GPU Metadata (NVIDIA)
    const activeGpu = useMemo(() => {
        if (gpuPresetId === "custom") {
            return {
                id: "custom",
                name: "Kustom / Slider Bebas Manual",
                vramGb: customGpuVram,
                tier: "Manual",
                fp16Tflops: Math.min(350, Math.max(10, customGpuVram * 8.5)),
                memBandwidthGbps: Math.min(1000, Math.max(128, customGpuVram * 45)),
                category: "Kustom / Manual",
                tdpWatts: Math.min(600, Math.max(75, customGpuVram * 22)),
            };
        }
        return GPU_PRESETS.find((g) => g.id === gpuPresetId) || GPU_PRESETS.find((g) => g.id === "rtx4060") || GPU_PRESETS[0];
    }, [gpuPresetId, customGpuVram]);

    // Active AMD Radeon GPU
    const activeAmdGpu = useMemo(() => {
        return AMD_GPU_PRESETS.find((g) => g.id === amdGpuId) || AMD_GPU_PRESETS[0];
    }, [amdGpuId]);

    // Active Apple Silicon Mac
    const activeMac = useMemo(() => {
        return APPLE_MAC_PRESETS.find((m) => m.id === macPresetId) || APPLE_MAC_PRESETS[0];
    }, [macPresetId]);

    // Windows Desktop / Multi-Monitor Overhead Deduction
    const desktopDeductionGb = useMemo(() => {
        if (displayDeductionMode === "primary_single") return 0.8;
        if (displayDeductionMode === "primary_multi") return 1.4;
        return 0.0;
    }, [displayDeductionMode]);

    // Platform-Aware Target VRAM & Effective VRAM Calculation
    const targetGpuVram = useMemo(() => {
        if (platformTab === "nvidia") return activeGpu.vramGb;
        if (platformTab === "amd") return activeAmdGpu.vramGb;
        return activeMac.unifiedRamGb;
    }, [platformTab, activeGpu, activeAmdGpu, activeMac]);

    // DirectML swap/buffer overhead (~+600 MB) on Windows DirectML
    const directMlOverheadGb = useMemo(() => {
        if (platformTab === "amd" && amdBackend === "directml") return 0.60;
        return 0.0;
    }, [platformTab, amdBackend]);

    // macOS 75% Safe MPS Unified Memory Limit Rule
    const macSafeMpsLimitGb = useMemo(() => {
        return activeMac.unifiedRamGb * 0.75;
    }, [activeMac]);

    const effectiveAiVram = useMemo(() => {
        if (platformTab === "apple") {
            return macSafeMpsLimitGb;
        }
        const baseVram = platformTab === "nvidia" ? activeGpu.vramGb : activeAmdGpu.vramGb;
        return Math.max(1.0, baseVram - desktopDeductionGb - directMlOverheadGb);
    }, [platformTab, activeGpu, activeAmdGpu, desktopDeductionGb, directMlOverheadGb, macSafeMpsLimitGb]);

    // MATHEMATICAL VRAM ALLOCATION ENGINE
    const telemetry = useMemo(() => {
        const qDef = QUANTIZATIONS[quantKey] || QUANTIZATIONS.fp16;
        const teDef = TEXT_ENCODERS[teKey] || TEXT_ENCODERS.dual_clip_fp16;

        // 1. Model Weights
        const weightsGb = activeModel.paramCountB * qDef.bytesPerParam;

        // 2. Text Encoder VRAM
        const teGb = teDef.vramGb;

        // 3. Latent Memory
        const isVideo = !!activeModel.isTextToVideo;
        const frames = isVideo ? Math.max(1, videoFrames) : 1;
        const latentChannels = activeModel.vaeChannelCount;
        const latentW = width / 8;
        const latentH = height / 8;
        const latentElements = batchSize * latentChannels * latentW * latentH * (isVideo ? Math.ceil(frames / 4) : 1);
        const latentGb = (latentElements * 2 * 4) / (1024 * 1024 * 1024);

        // 4. Attention & KV Cache
        const sequenceLength = (latentW * latentH) / (activeModel.id === "flux" ? 4 : 1);
        let kvGb = (sequenceLength * 32 * 64 * 2 * 2 * batchSize) / (1024 * 1024 * 1024);
        if (isVideo) {
            kvGb += (sequenceLength * frames * 0.0003);
        }
        if (!useSdpAttention) {
            kvGb *= 2.8;
        }
        if (useMedvramChunking) {
            kvGb *= 0.55;
        }
        kvGb = Math.max(0.25, Math.min(18.0, kvGb));

        // 5. VAE Peak Memory
        let vaeGb = 0.5;
        if (activeModel.id === "sd15") {
            vaeGb = useTiledVae ? 0.35 : Math.max(0.6, (width * height * 4 * 4) / (1024 * 1024 * 1024) * 0.8);
        } else if (activeModel.id === "flux" || activeModel.id.startsWith("sd35")) {
            vaeGb = useTiledVae ? 0.65 : Math.max(1.2, (width * height * 16 * 4) / (1024 * 1024 * 1024) * 1.4);
        } else if (isVideo) {
            vaeGb = useTiledVae ? 1.8 : 4.5;
        } else {
            vaeGb = useTiledVae ? 0.45 : Math.max(0.9, (width * height * 4 * 4) / (1024 * 1024 * 1024) * 1.1);
        }

        // 6. LoRAs & ControlNet
        const loraPerUnit = activeModel.id === "flux" ? 0.42 : activeModel.id === "sd15" ? 0.12 : 0.25;
        const lorasGb = loraCount * loraPerUnit;

        const cnPerUnit = activeModel.id === "flux" ? 3.2 : activeModel.id === "sd15" ? 1.15 : 2.35;
        const controlnetsGb = controlnetCount * cnPerUnit;

        // 7. Backend runtime overhead (CUDA, DirectML swap, or Metal Context)
        const runtimeOverheadGb = platformTab === "amd" && amdBackend === "directml" ? 0.85 + directMlOverheadGb : 0.65;

        // Total Memory Required
        const totalVramGb = weightsGb + teGb + latentGb + kvGb + vaeGb + lorasGb + controlnetsGb + runtimeOverheadGb;
        const ratio = totalVramGb / effectiveAiVram;
        const headroomGb = effectiveAiVram - totalVramGb;

        let status: "safe" | "warn" | "offload" | "danger" = "safe";
        let statusBadge = "Lancar Tanpa Offload";
        let statusMessage = "Throughput optimal. Model dan tensor muat 100% di memori hardware target.";

        if (platformTab === "apple") {
            if (totalVramGb <= effectiveAiVram * 0.85) {
                status = "safe";
                statusBadge = "Safe MPS Unified Allocation";
                statusMessage = `Model muat dalam batas aman 75% MPS macOS (${effectiveAiVram.toFixed(1)} GB dari ${activeMac.unifiedRamGb} GB Unified). Sistem macOS berjalan mulus tanpa paging.`;
            } else if (totalVramGb <= effectiveAiVram) {
                status = "warn";
                statusBadge = "Mendekati Limit MPS (75%)";
                statusMessage = `Memori mendekati ambang batas aman MPS. Disarankan tutup aplikasi berat lain di macOS.`;
            } else {
                status = "danger";
                statusBadge = "Overhead MPS (SSD Swap Risk)";
                statusMessage = `Alokasi (${totalVramGb.toFixed(2)} GB) melebihi batas safe MPS macOS (${effectiveAiVram.toFixed(1)} GB). Mac akan menukar tensor ke swap SSD (beachballing / lag) atau crash 'MPS backend out of memory'. Gunakan model GGUF Q4 atau MLX.`;
            }
        } else if (platformTab === "amd") {
            if (ratio <= 0.85) {
                status = "safe";
                statusBadge = amdBackend === "rocm" ? "ROCm Native Lancar" : "DirectML Aman";
                statusMessage = amdBackend === "rocm"
                    ? "Throughput native ROCm optimal via PyTorch HIP tanpa DirectML translation overhead."
                    : "DirectML berjalan stabil dengan buffer memori cukup.";
            } else if (ratio <= 1.0) {
                status = "warn";
                statusBadge = "Mendekati VRAM Fisik";
                statusMessage = "Mendekati kapasitas fisik VRAM Radeon. Aktifkan --medvram atau Text Encoder FP8.";
            } else if (ratio <= 1.45) {
                status = "offload";
                statusBadge = "Wajib CPU Offload";
                statusMessage = "Melebihi VRAM Radeon fisik. Wajib gunakan ComfyUI lowvram atau kuantisasi GGUF Q4.";
            } else {
                status = "danger";
                statusBadge = "Resiko Fatal OOM (DirectML Crash)";
                statusMessage = "Defisit VRAM kritis. DirectML pada Windows akan melempar error E_OUTOFMEMORY. Turunkan resolusi atau gunakan Tiled VAE.";
            }
        } else {
            // NVIDIA
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
                statusBadge = "Wajib ComfyUI Offload / Q4";
                statusMessage = "Total memori melebihi VRAM fisik. Wajib gunakan ComfyUI CPU offload atau model kuantisasi Q4/NF4.";
            } else {
                status = "danger";
                statusBadge = "Resiko Fatal CUDA OOM";
                statusMessage = "Defisit VRAM kritis (>50%). WebUI standar akan langsung crash OOM. Turunkan resolusi atau gunakan Tiled VAE + ComfyUI lowvram.";
            }
        }

        return {
            weightsGb,
            teGb,
            latentGb,
            kvGb,
            vaeGb,
            lorasGb,
            controlnetsGb,
            runtimeOverheadGb,
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
        effectiveAiVram,
        platformTab,
        amdBackend,
        directMlOverheadGb,
        activeMac,
    ]);

    // SYSTEM RAM ALLOCATION ENGINE FOR CPU OFFLOADING
    const ramTelemetry = useMemo(() => {
        const osBaselineGb = platformTab === "apple" ? activeMac.unifiedRamGb * 0.25 : 4.5;
        const pythonHostGb = 2.5;

        let offloadedWeightsGb = 0;
        if (teKey === "none") {
            if (activeModel.id === "flux" || activeModel.id.startsWith("sd35")) {
                offloadedWeightsGb += 4.9;
            } else if (activeModel.isTextToVideo) {
                offloadedWeightsGb += 4.8;
            } else if (activeModel.id === "sdxl" || activeModel.id === "pony" || activeModel.id === "illustrious") {
                offloadedWeightsGb += 1.64;
            } else {
                offloadedWeightsGb += 0.24;
            }
        }

        if (telemetry.status === "offload" || telemetry.status === "danger") {
            offloadedWeightsGb += telemetry.weightsGb;
        }

        if (enableRefiner) {
            offloadedWeightsGb += 4.6;
        }

        const effectiveSysRam = platformTab === "apple" ? activeMac.unifiedRamGb : systemRamGb;
        const totalRamNeededGb = osBaselineGb + pythonHostGb + offloadedWeightsGb;
        const ramRatio = totalRamNeededGb / effectiveSysRam;
        const ramHeadroomGb = effectiveSysRam - totalRamNeededGb;

        let ramStatus: "ram-safe" | "ram-warn" | "ram-danger" = "ram-safe";
        let ramBadge = "RAM Aman";
        let ramMessage = `Kapasitas RAM ${effectiveSysRam} GB mencukupi untuk operasional tanpa swap ke disk.`;

        if (ramRatio > 0.95) {
            ramStatus = "ram-danger";
            ramBadge = "Bahaya Disk-Thrashing";
            ramMessage = `RAM sistem (${effectiveSysRam} GB) kurang! Sistem akan mem-paging tensor ke swap SSD.`;
        } else if (ramRatio > 0.8) {
            ramStatus = "ram-warn";
            ramBadge = "RAM Ketat (>80%)";
            ramMessage = `Penggunaan RAM sistem mencapai ${(ramRatio * 100).toFixed(0)}%. Tutup aplikasi background berat.`;
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
    }, [teKey, activeModel, telemetry.status, telemetry.weightsGb, enableRefiner, systemRamGb, platformTab, activeMac]);

    // MULTI-PASS & HI-RES WORKFLOW TELEMETRY
    const multiPassTelemetry = useMemo(() => {
        const pass1Vram = telemetry.totalVramGb;
        const pass1W = width;
        const pass1H = height;

        const pass2W = Math.round(width * hiresScale);
        const pass2H = Math.round(height * hiresScale);
        const pass2ScaleFactor = hiresScale * hiresScale;

        let pass2Vram = 0;
        let pass2Note = "Hi-Res Fix tidak aktif.";

        if (enableHiresFix) {
            if (upscaleMethod === "latent") {
                const scaledLatentKv = (telemetry.kvGb + telemetry.latentGb) * (useSdpAttention ? hiresScale : pass2ScaleFactor);
                const pass2Vae = useTiledVae ? telemetry.vaeGb : telemetry.vaeGb * pass2ScaleFactor;
                pass2Vram = telemetry.weightsGb + telemetry.teGb + scaledLatentKv + pass2Vae + telemetry.lorasGb + telemetry.controlnetsGb + telemetry.runtimeOverheadGb;
                pass2Note = `Full Latent Denoising @ ${pass2W}×${pass2H}. Lonjakan memori tajam!`;
            } else if (upscaleMethod === "ultimate_sd") {
                pass2Vram = pass1Vram + 0.65;
                pass2Note = `Ultimate SD Upscale: Memproses ubin bersekat (tiled), alokasi aman terkendali.`;
            } else {
                pass2Vram = pass1Vram + 0.85;
                pass2Note = `Model Upscale (ESRGAN): Filter spasial CNN ringan (~850 MB).`;
            }
        }

        let postProcessVram = enableHiresFix ? pass2Vram : pass1Vram;
        if (enableFaceDetailer) {
            postProcessVram += 0.95;
        }
        if (enableRefiner && !enableHiresFix) {
            postProcessVram += 2.2;
        }

        const isPass1Risk = pass1Vram > effectiveAiVram;
        const isPass2Risk = enableHiresFix && pass2Vram > effectiveAiVram;
        const isPostProcessRisk = postProcessVram > effectiveAiVram;

        return {
            pass1Vram,
            pass1W,
            pass1H,
            pass2W,
            pass2H,
            pass2Vram,
            pass2Note,
            postProcessVram,
            isPass1Risk,
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
        effectiveAiVram,
    ]);

    // THROUGHPUT & SPEED TELEMETRY ENGINE
    const throughputTelemetry = useMemo(() => {
        const paramCountB = activeModel.paramCountB;
        const resPixels = width * height;
        const basePixels = 512 * 512;
        const resFactor = Math.pow(resPixels / basePixels, 0.85);
        const batchFactor = batchSize;
        const videoFactor = activeModel.isTextToVideo ? Math.pow(Math.max(1, videoFrames) / 16, 0.9) : 1;

        const baseTflopsPerStep = (paramCountB * 0.08) * resFactor * batchFactor * videoFactor;

        // Platform-specific compute capabilities
        let computeTflops = activeGpu.fp16Tflops;
        let backendSpeedMod = 1.0;

        if (platformTab === "amd") {
            computeTflops = activeAmdGpu.fp16Tflops;
            if (amdBackend === "directml") {
                backendSpeedMod = 1.45; // ~45% slower on Windows DirectML translation
            }
        } else if (platformTab === "apple") {
            computeTflops = activeMac.fp16Tflops;
            if (macBackend === "mlx") {
                backendSpeedMod = 0.85; // MLX native optimization
            } else {
                backendSpeedMod = 1.25; // PyTorch MPS overhead
            }
        }

        const rawSecs = baseTflopsPerStep / (computeTflops * 0.007);

        let quantMod = 1.0;
        if (quantKey.includes("fp8")) quantMod = 0.85;
        else if (quantKey.includes("q4") || quantKey === "nf4") quantMod = 0.9;
        else if (quantKey === "fp32") quantMod = 2.0;

        const sdpMod = useSdpAttention ? 1.0 : 0.55;

        let offloadPenalty = 1.0;
        if (ramTelemetry.ramStatus === "ram-danger") {
            offloadPenalty = 25.0;
        } else if (telemetry.status === "danger") {
            offloadPenalty = 4.5;
        } else if (telemetry.status === "offload") {
            offloadPenalty = 2.8;
        } else if (telemetry.status === "warn") {
            offloadPenalty = 1.15;
        }

        const secondsPerStep = Math.max(0.015, ((rawSecs * quantMod * offloadPenalty) / sdpMod) * backendSpeedMod);
        const itPerSec = 1 / secondsPerStep;

        let textEncodeSec = 0.3;
        if (teKey === "none") textEncodeSec = 2.8;
        else if (teKey === "t5_fp16") textEncodeSec = 1.5;
        else if (teKey === "t5_fp8") textEncodeSec = 1.0;
        else if (teKey.startsWith("dual_clip")) textEncodeSec = 0.5;

        let vaeDecodeSec = useTiledVae ? 1.4 : 0.8;
        if (activeModel.id === "sd15") vaeDecodeSec = 0.35;
        else if (activeModel.id === "flux") vaeDecodeSec = 2.2;
        else if (activeModel.isTextToVideo) vaeDecodeSec = 5.5;

        const denoiseSec = samplingSteps * secondsPerStep;

        let hiresSec = 0;
        if (enableHiresFix) {
            const hiresPixels = (width * hiresScale) * (height * hiresScale);
            const hiresResFactor = Math.pow(hiresPixels / basePixels, 0.85);
            const hiresBaseTflops = (paramCountB * 0.08) * hiresResFactor * batchFactor;
            const hiresRawSecs = hiresBaseTflops / (computeTflops * 0.007);
            const hiresSecPerStep = Math.max(0.02, ((hiresRawSecs * quantMod * offloadPenalty) / sdpMod) * backendSpeedMod);
            hiresSec = 15 * hiresSecPerStep + 0.8;
        }

        let detailerSec = 0;
        if (enableFaceDetailer) {
            detailerSec = 1.8;
        }

        const totalDurationSec = textEncodeSec + denoiseSec + hiresSec + detailerSec + vaeDecodeSec;

        let speedBadge = "Sangat Cepat";
        let speedClass: "speed-fast" | "speed-normal" | "speed-slow" | "speed-critical" = "speed-fast";
        let speedNote = "Throughput optimal. Eksekusi native di hardware target.";

        if (ramTelemetry.ramStatus === "ram-danger") {
            speedBadge = "Kritis (Disk-Thrashing)";
            speedClass = "speed-critical";
            speedNote = "Generasi melambat drastis karena sistem menukar tensor ke swap disk/SSD.";
        } else if (telemetry.status === "offload" || telemetry.status === "danger") {
            speedBadge = "Lambat (Memory Swapping)";
            speedClass = "speed-slow";
            speedNote = "Model di-swap bolak-balik antara RAM dan akselerator.";
        } else if (itPerSec < 1.5) {
            speedBadge = "Sedang / Normal";
            speedClass = "speed-normal";
            speedNote = "Throughput wajar untuk resolusi atau arsitektur model ini.";
        }

        return {
            secondsPerStep,
            itPerSec,
            textEncodeSec,
            denoiseSec,
            hiresSec,
            detailerSec,
            vaeDecodeSec,
            totalDurationSec,
            speedBadge,
            speedClass,
            speedNote,
        };
    }, [
        activeModel,
        width,
        height,
        batchSize,
        videoFrames,
        activeGpu,
        activeAmdGpu,
        activeMac,
        platformTab,
        amdBackend,
        macBackend,
        quantKey,
        useSdpAttention,
        ramTelemetry.ramStatus,
        telemetry.status,
        teKey,
        useTiledVae,
        samplingSteps,
        enableHiresFix,
        hiresScale,
        enableFaceDetailer,
    ]);

    // Command-line / Launch Config Generator
    const platformLaunchScript = useMemo(() => {
        if (platformTab === "amd") {
            if (amdBackend === "rocm") {
                return `#!/bin/bash
# ========================================================
# Antigravity AI - AMD ROCm 6.x PyTorch HIP Launch Script
# Target GPU: ${activeAmdGpu.name} (${activeAmdGpu.vramGb} GB VRAM)
# Target Model: ${activeModel.name}
# ========================================================

export HSA_OVERRIDE_GFX_VERSION=${activeAmdGpu.gfxVersion}
export PYTORCH_CUDA_ALLOC_CONF=garbage_collection_threshold:0.8,max_split_size_mb:512
export HIP_VISIBLE_DEVICES=0

# Jalankan ComfyUI / SD-WebUI
python main.py --opt-sdp-attention --preview-method auto
`;
            } else {
                return `@echo off
REM ========================================================
REM Antigravity AI - AMD DirectML Windows Config
REM Target GPU: ${activeAmdGpu.name} (DirectML Backend)
REM DirectML Swap Overhead: ~0.60 GB
REM ========================================================

set PYTHON=
set GIT=
set VENV_DIR=
set COMMANDLINE_ARGS=--use-directml --opt-sub-quad-attention --disable-nan-check --pin-shared-memory

call webui.bat
`;
            }
        }

        if (platformTab === "apple") {
            if (macBackend === "mlx") {
                return `#!/bin/bash
# ========================================================
# Antigravity AI - Apple Silicon Native MLX Script
# Target: ${activeMac.name}
# Safe MPS Limit: ${macSafeMpsLimitGb.toFixed(1)} GB
# ========================================================

# Install MLX-Flux jika belum ada: pip install mlx-flux
python -m mlx_flux --model flux-schnell-4bit --prompt "a beautiful cinematic landscape" --width ${width} --height ${height} --steps ${samplingSteps}
`;
            } else {
                return `#!/bin/bash
# ========================================================
# Antigravity AI - Apple Silicon PyTorch MPS Script
# Target: ${activeMac.name} (${activeMac.unifiedRamGb} GB Unified Memory)
# Safe MPS Limit (75%): ${macSafeMpsLimitGb.toFixed(1)} GB
# ========================================================

export PYTORCH_ENABLE_MPS_FALLBACK=1
export MPS_HIGH_WATERMARK_RATIO=0.0

python main.py --force-fp16 --use-split-cross-attention --preview-method auto
`;
            }
        }

        // NVIDIA Default (webui-user.bat)
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

        return `@echo off
REM ========================================================
REM Antigravity AI - webui-user.bat Auto-Generated Config
REM Target GPU: ${activeGpu.name}
REM Usable AI VRAM: ${effectiveAiVram.toFixed(1)} GB (Physical: ${targetGpuVram} GB)
REM Target Model: ${activeModel.name} (${QUANTIZATIONS[quantKey]?.name || quantKey})
REM ========================================================

set PYTHON=
set GIT=
set VENV_DIR=
set COMMANDLINE_ARGS=${flags.join(" ")}

call webui.bat
`;
    }, [
        platformTab,
        amdBackend,
        macBackend,
        activeAmdGpu,
        activeMac,
        activeGpu,
        activeModel.name,
        activeModel.id,
        effectiveAiVram,
        targetGpuVram,
        quantKey,
        telemetry.status,
        useTiledVae,
        width,
        height,
        samplingSteps,
        macSafeMpsLimitGb,
    ]);

    const handleDownloadScript = () => {
        const isBat = platformTab === "nvidia" || (platformTab === "amd" && amdBackend === "directml");
        const filename = isBat ? "webui-user.bat" : platformTab === "amd" ? "start_rocm.sh" : "run_mac.sh";
        const blob = new Blob([platformLaunchScript], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleCopyScript = () => {
        navigator.clipboard.writeText(platformLaunchScript);
        setCopiedComfy(true);
        setTimeout(() => setCopiedComfy(false), 2000);
    };

    // POWER & ELECTRICITY COST TELEMETRY ENGINE
    const powerTelemetry = useMemo(() => {
        let hardwareWatts = activeGpu.tdpWatts;
        if (platformTab === "amd") {
            hardwareWatts = activeAmdGpu.tbpWatts;
        } else if (platformTab === "apple") {
            hardwareWatts = activeMac.socTdpWatts; // Apple Silicon M-series low SoC power!
        } else if (activeGpu.isLaptop) {
            hardwareWatts = Math.max(activeGpu.tgpMinWatts || 35, Math.min(activeGpu.tgpMaxWatts || 175, laptopTgpWatts));
        }

        let activeCpuWatts = cpuWatts;
        if (platformTab === "apple") {
            activeCpuWatts = 0; // SoC unified chip
        }

        const screenWatts = 9;
        const extMonitorWatts = 0;
        const systemInternalWatts = platformTab === "apple" ? 5 : 14;

        const totalDcWatts = hardwareWatts + activeCpuWatts + screenWatts + extMonitorWatts + systemInternalWatts;
        const totalPcWatts = Math.round(totalDcWatts / 0.89);
        const chargerLossWatts = totalPcWatts - totalDcWatts;

        const durationHoursPerImage = throughputTelemetry.totalDurationSec / 3600;
        const wattHoursPerImage = totalPcWatts * durationHoursPerImage;
        const kwhPerImage = wattHoursPerImage / 1000;
        const costPerImageIdr = kwhPerImage * plnTarifPerKwh;

        const batchTotalKwh = kwhPerImage * batchImageCount;
        const batchTotalCostIdr = batchTotalKwh * plnTarifPerKwh;
        const batchTotalHours = (throughputTelemetry.totalDurationSec * batchImageCount) / 3600;

        const totalTokenKwh = tokenNominal / plnTarifPerKwh;
        const imagesPerFullToken = kwhPerImage > 0 ? Math.floor(totalTokenKwh / kwhPerImage) : 0;
        const tokenPercentUsed = totalTokenKwh > 0 ? (batchTotalKwh / totalTokenKwh) * 100 : 0;
        const tokenRemainingRp = Math.max(0, tokenNominal - batchTotalCostIdr);
        const tokenRemainingKwh = Math.max(0, totalTokenKwh - batchTotalKwh);

        let effBadge = "Efisiensi Tinggi";
        let effClass: "eff-high" | "eff-normal" | "eff-heavy" = "eff-high";
        if (totalPcWatts >= 350 || costPerImageIdr > 8) {
            effBadge = "Konsumsi Tinggi";
            effClass = "eff-heavy";
        } else if (totalPcWatts >= 180 || costPerImageIdr > 2) {
            effBadge = "Efisiensi Standar";
            effClass = "eff-normal";
        }

        return {
            hardwareWatts,
            activeCpuWatts,
            screenWatts,
            extMonitorWatts,
            systemInternalWatts,
            totalDcWatts,
            totalPcWatts,
            chargerLossWatts,
            wattHoursPerImage,
            kwhPerImage,
            costPerImageIdr,
            batchTotalKwh,
            batchTotalCostIdr,
            batchTotalHours,
            totalTokenKwh,
            imagesPerFullToken,
            tokenPercentUsed,
            tokenRemainingRp,
            tokenRemainingKwh,
            effBadge,
            effClass,
        };
    }, [
        platformTab,
        activeGpu,
        activeAmdGpu,
        activeMac,
        laptopTgpWatts,
        cpuWatts,
        throughputTelemetry.totalDurationSec,
        plnTarifPerKwh,
        batchImageCount,
        tokenNominal,
    ]);

    const handleApplyProfile = useCallback((prof: HardwareProfile) => {
        setActiveProfile(prof);
        setGpuPresetId(prof.gpuPresetId);
        if (prof.customGpuVram) setCustomGpuVram(prof.customGpuVram);
        setSystemRamGb(prof.systemRamGb);
        setDisplayDeductionMode(prof.displayDeductionMode);
        if (prof.laptopTgpWatts) setLaptopTgpWatts(prof.laptopTgpWatts);
        if (prof.tufProfile) setTufProfile(prof.tufProfile);
        if (prof.cpuWatts) setCpuWatts(prof.cpuWatts);
        if (prof.plnTarifPerKwh) setPlnTarifPerKwh(prof.plnTarifPerKwh);
    }, []);

    const handleReset = () => {
        const prof = getActiveHardwareProfile();
        setActiveProfile(prof);
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
        setEnableHiresFix(false);
        setHiresScale(1.5);
        setUpscaleMethod("latent");
        setEnableFaceDetailer(false);
        setEnableRefiner(false);
        setSamplingSteps(25);
        setGpuPresetId(prof.gpuPresetId || "rtx4060_laptop");
        setAmdGpuId("rx7800xt");
        setMacPresetId("m3_pro_36");
        showToast("Parameter direset kembali ke profil default!");
    };

    // Workflow Bridge Handler
    const handleApplyBridge = useCallback((data: WorkflowBridgeData) => {
        if (data.baseModel) {
            const mKey = normalizeVramModel(data.baseModel);
            if (BASE_MODELS[mKey]) {
                setModelKey(mKey);
                if (mKey === "flux" || mKey.includes("wan21")) {
                    setQuantKey("fp8_e4m3");
                }
                setTeKey(BASE_MODELS[mKey].defaultTextEncoder);
            }
        }
        if (data.width && data.width > 0) setWidth(data.width);
        if (data.height && data.height > 0) setHeight(data.height);
        if (data.steps && data.steps > 0) setSamplingSteps(data.steps);
        if (data.loras && data.loras.length > 0) setLoraCount(data.loras.length);
    }, []);

    return (
        <div className="vram-profiler-container">
            {/* Global Workflow Bridge Banner */}
            <WorkflowBridgeBanner currentTool="vram" onApply={handleApplyBridge} />

            {/* Header */}
            <header className="vram-header">
                <div className="vram-header-top">
                    <div className="vram-title-group">
                        <div className="vram-header-icon" aria-hidden="true">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="2" width="20" height="20" rx="4" />
                                <path d="M6 18h12" />
                                <path d="M6 14h12" />
                                <path d="M6 10h12" />
                                <path d="M6 6h12" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="vram-title">Interactive VRAM &amp; Hardware Profiler</h2>
                            <p className="vram-subtitle">
                                Profiler alokasi memori real-time untuk NVIDIA RTX (CUDA), AMD Radeon (DirectML/ROCm) &amp; Apple Silicon Mac (Metal MPS/MLX).
                            </p>
                        </div>
                    </div>

                    <div className="vram-header-actions">
                        <button
                            type="button"
                            className="vram-profile-header-btn"
                            onClick={() => setIsProfileModalOpen(true)}
                            title="Kelola profil hardware perangkat"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                                <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                                <line x1="6" y1="6" x2="6.01" y2="6" />
                                <line x1="6" y1="18" x2="6.01" y2="18" />
                            </svg>
                            <span>Profil: <strong style={{ color: "#60a5fa" }}>{activeProfile.name.split("(")[0].trim()}</strong></span>
                            <span className="vram-profile-badge">Tersimpan</span>
                        </button>
                        <button
                            type="button"
                            className="vram-reset-btn"
                            onClick={() => bridgeToPromptLab(navigate, {
                                source: "vram",
                                baseModel: activeModel.name,
                                width,
                                height,
                                steps: samplingSteps,
                                timestamp: Date.now()
                            })}
                            title="Bawa parameter ke Prompt Lab"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                            <span>Bawa ke Studio</span>
                        </button>
                        <button
                            type="button"
                            className="vram-reset-btn"
                            onClick={() => bridgeToCalculator(navigate, {
                                source: "vram",
                                baseModel: activeModel.name,
                                width,
                                height,
                                timestamp: Date.now()
                            })}
                            title="Buka dimensi ini di Resolution Calculator"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <path d="M3 9h18" />
                                <path d="M9 21V9" />
                            </svg>
                            <span>Kalkulator</span>
                        </button>
                        <button type="button" className="vram-reset-btn" onClick={handleReset} title="Reset parameter ke default">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                <path d="M3 3v5h5" />
                            </svg>
                            <span>Reset</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* PLATFORM NAVIGATION TABS (DEDICATED TABS - SEPARATED FROM NVIDIA!) */}
            <div className="vram-platform-tabs">
                <button
                    type="button"
                    className={`vram-platform-tab ${platformTab === "nvidia" ? "active" : ""}`}
                    onClick={() => setPlatformTab("nvidia")}
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="4" />
                        <path d="M6 18h12" />
                        <path d="M6 14h12" />
                        <path d="M6 10h12" />
                        <path d="M6 6h12" />
                    </svg>
                    <span>NVIDIA GeForce &amp; RTX (CUDA)</span>
                </button>

                <button
                    type="button"
                    className={`vram-platform-tab ${platformTab === "amd" ? "active" : ""}`}
                    onClick={() => setPlatformTab("amd")}
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    <span>AMD Radeon (DirectML / ROCm)</span>
                </button>

                <button
                    type="button"
                    className={`vram-platform-tab ${platformTab === "apple" ? "active" : ""}`}
                    onClick={() => setPlatformTab("apple")}
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z" />
                        <path d="M10 2c1 .5 2 2 2 5" />
                    </svg>
                    <span>Apple Silicon Mac (Metal MPS / MLX)</span>
                </button>
            </div>

            {/* Main Interactive Grid */}
            <div className="vram-main-grid">
                {/* Left Column: Interactive Inputs & Platform Hardware */}
                <div className="vram-inputs-col">
                    {/* SECTION: PLATFORM TARGET HARDWARE CONFIGURATION */}
                    <div className="vram-section-card">
                        <div className="vram-section-header">
                            <div className="vram-section-title-wrap">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                                    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                                    <line x1="6" y1="6" x2="6.01" y2="6" />
                                    <line x1="6" y1="18" x2="6.01" y2="18" />
                                </svg>
                                <span>
                                    {platformTab === "nvidia" && "Konfigurasi Target NVIDIA (CUDA)"}
                                    {platformTab === "amd" && "Konfigurasi Target AMD Radeon"}
                                    {platformTab === "apple" && "Konfigurasi Target Apple Silicon Mac"}
                                </span>
                            </div>
                            <span className="vram-section-badge">
                                {platformTab === "nvidia" && "NVIDIA Architecture"}
                                {platformTab === "amd" && `AMD ${activeAmdGpu.series}`}
                                {platformTab === "apple" && `Apple ${activeMac.chipSeries}`}
                            </span>
                        </div>

                        {/* NVIDIA SPECIFIC HARDWARE SELECTOR */}
                        {platformTab === "nvidia" && (
                            <>
                                <div className="vram-hardware-field">
                                    <div className="vram-hardware-field-header">
                                        <span className="vram-hardware-field-label">Target GPU &amp; Kapasitas VRAM:</span>
                                        <span className="vram-hardware-field-val">
                                            {targetGpuVram} GB Fisik &bull; <strong style={{ color: "#60a5fa" }}>{effectiveAiVram.toFixed(1)} GB VRAM Efektif AI</strong>
                                        </span>
                                    </div>
                                    <select
                                        className="vram-gpu-select"
                                        value={gpuPresetId}
                                        onChange={(e) => setGpuPresetId(e.target.value)}
                                    >
                                        {Object.entries(GROUPED_GPU_PRESETS).map(([groupName, gpus]) => (
                                            <optgroup key={groupName} label={groupName}>
                                                {gpus.map((g) => (
                                                    <option key={g.id} value={g.id}>
                                                        {g.name}
                                                    </option>
                                                ))}
                                            </optgroup>
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
                                            <span style={{ fontWeight: 700, fontFamily: "monospace", width: "45px", textAlign: "right" }}>
                                                {customGpuVram} GB
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="vram-hardware-field">
                                    <div className="vram-hardware-field-header">
                                        <span className="vram-hardware-field-label">Alokasi Display OS &amp; Desktop:</span>
                                        <span className="vram-hardware-field-val" style={{ color: desktopDeductionGb > 0 ? "#fbbf24" : "#34d399", fontFamily: "monospace" }}>
                                            {desktopDeductionGb > 0 ? `-${desktopDeductionGb} GB Desktop` : "0 GB (100% Dedicated AI)"}
                                        </span>
                                    </div>
                                    <div className="vram-display-chips-row">
                                        <button
                                            type="button"
                                            className={`vram-display-mode-chip ${displayDeductionMode === "primary_single" ? "active" : ""}`}
                                            onClick={() => setDisplayDeductionMode("primary_single")}
                                        >
                                            <span className="vram-display-mode-title">1 Layar (GPU Utama)</span>
                                            <span className="vram-display-mode-sub">-0.8 GB (DWM &amp; Browser)</span>
                                        </button>
                                        <button
                                            type="button"
                                            className={`vram-display-mode-chip ${displayDeductionMode === "primary_multi" ? "active" : ""}`}
                                            onClick={() => setDisplayDeductionMode("primary_multi")}
                                        >
                                            <span className="vram-display-mode-title">Multi-Display / 4K</span>
                                            <span className="vram-display-mode-sub">-1.4 GB (Dual Mon / 4K)</span>
                                        </button>
                                        <button
                                            type="button"
                                            className={`vram-display-mode-chip ${displayDeductionMode === "headless" ? "active" : ""}`}
                                            onClick={() => setDisplayDeductionMode("headless")}
                                        >
                                            <span className="vram-display-mode-title">Headless / Sekunder</span>
                                            <span className="vram-display-mode-sub">0 GB (100% Dedicated AI)</span>
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* AMD RADEON SPECIFIC HARDWARE SELECTOR */}
                        {platformTab === "amd" && (
                            <>
                                <div className="vram-hardware-field">
                                    <div className="vram-hardware-field-header">
                                        <span className="vram-hardware-field-label">Pilih Kartu Grafis AMD Radeon:</span>
                                        <span className="vram-hardware-field-val">
                                            {activeAmdGpu.vramGb} GB VRAM &bull; <strong style={{ color: "#60a5fa" }}>{effectiveAiVram.toFixed(1)} GB Bersih AI</strong>
                                        </span>
                                    </div>
                                    <select
                                        className="vram-gpu-select"
                                        value={amdGpuId}
                                        onChange={(e) => setAmdGpuId(e.target.value)}
                                    >
                                        {["RX 8000", "RX 7000", "RX 6000"].map((series) => (
                                            <optgroup key={series} label={`AMD Radeon ${series} Series`}>
                                                {AMD_GPU_PRESETS.filter((g) => g.series === series).map((g) => (
                                                    <option key={g.id} value={g.id}>
                                                        {g.name}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                </div>

                                {/* Backend Switcher: Windows DirectML vs Linux ROCm */}
                                <div className="vram-backend-toggle-group">
                                    <div className="vram-hardware-field-header">
                                        <span className="vram-hardware-field-label">Backend Eksekusi AI AMD:</span>
                                        <span className="vram-hardware-field-val" style={{ color: amdBackend === "directml" ? "#fbbf24" : "#34d399", fontFamily: "monospace" }}>
                                            {amdBackend === "directml" ? "+600 MB Swap Buffer Overhead" : "ROCm Native HIP"}
                                        </span>
                                    </div>
                                    <div className="vram-backend-tabs">
                                        <button
                                            type="button"
                                            className={`vram-backend-tab-btn ${amdBackend === "directml" ? "active" : ""}`}
                                            onClick={() => setAmdBackend("directml")}
                                        >
                                            <span>Windows DirectML</span>
                                            <span className="vram-backend-badge">DirectX 12 API (+600MB swap)</span>
                                        </button>
                                        <button
                                            type="button"
                                            className={`vram-backend-tab-btn ${amdBackend === "rocm" ? "active" : ""}`}
                                            onClick={() => setAmdBackend("rocm")}
                                        >
                                            <span>Linux ROCm 6.x</span>
                                            <span className="vram-backend-badge">Native PyTorch HIP (Full Speed)</span>
                                        </button>
                                    </div>
                                </div>

                                {/* ROCm Environment Variable Guidance Box */}
                                {amdBackend === "rocm" ? (
                                    <div className="vram-callout-box">
                                        <div className="vram-callout-header">
                                            <span>Flag Lingkungan ROCm (Wajib Di-export):</span>
                                            <span style={{ color: "#34d399", fontSize: "10.5px" }}>GFX: {activeAmdGpu.gfxVersion}</span>
                                        </div>
                                        <div className="vram-env-code">
                                            export HSA_OVERRIDE_GFX_VERSION={activeAmdGpu.gfxVersion}{"\n"}
                                            export PYTORCH_CUDA_ALLOC_CONF=garbage_collection_threshold:0.8,max_split_size_mb:512{"\n"}
                                            export HIP_VISIBLE_DEVICES=0
                                        </div>
                                    </div>
                                ) : (
                                    <div className="vram-callout-box" style={{ borderColor: "#f59e0b" }}>
                                        <div className="vram-callout-header" style={{ color: "#fbbf24" }}>
                                            <span>DirectML Memory Overhead:</span>
                                            <span>+600 MB swap overhead</span>
                                        </div>
                                        <span style={{ color: "#d4d4d8", fontSize: "11px" }}>
                                            Backend Windows DirectML memerlukan alokasi swap buffer tambahan ~+600 MB dibandingkan CUDA native. Throughput per step sekitar 1.3×–1.5× lebih lambat dari Linux ROCm.
                                        </span>
                                    </div>
                                )}
                            </>
                        )}

                        {/* APPLE SILICON MAC SPECIFIC HARDWARE SELECTOR */}
                        {platformTab === "apple" && (
                            <>
                                <div className="vram-hardware-field">
                                    <div className="vram-hardware-field-header">
                                        <span className="vram-hardware-field-label">Pilih Model MacBook / Mac:</span>
                                        <span className="vram-hardware-field-val">
                                            {activeMac.unifiedRamGb} GB Unified &bull; <strong style={{ color: "#34d399" }}>Safe MPS: {macSafeMpsLimitGb.toFixed(1)} GB</strong>
                                        </span>
                                    </div>
                                    <select
                                        className="vram-gpu-select"
                                        value={macPresetId}
                                        onChange={(e) => setMacPresetId(e.target.value)}
                                    >
                                        {["M4", "M3", "M1 / M2"].map((series) => (
                                            <optgroup key={series} label={`Apple Silicon ${series} Series`}>
                                                {APPLE_MAC_PRESETS.filter((m) => m.chipSeries === series).map((m) => (
                                                    <option key={m.id} value={m.id}>
                                                        {m.name}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                </div>

                                {/* Framework Switcher: PyTorch MPS vs Apple Native MLX */}
                                <div className="vram-backend-toggle-group">
                                    <div className="vram-hardware-field-header">
                                        <span className="vram-hardware-field-label">Framework Eksekusi macOS:</span>
                                        <span className="vram-hardware-field-val" style={{ color: macBackend === "mlx" ? "#34d399" : "#60a5fa", fontFamily: "monospace" }}>
                                            {macBackend === "mlx" ? "Apple MLX (Native Apple Silicon)" : "PyTorch MPS (Metal Shaders)"}
                                        </span>
                                    </div>
                                    <div className="vram-backend-tabs">
                                        <button
                                            type="button"
                                            className={`vram-backend-tab-btn ${macBackend === "mps" ? "active" : ""}`}
                                            onClick={() => setMacBackend("mps")}
                                        >
                                            <span>PyTorch MPS</span>
                                            <span className="vram-backend-badge">Metal Performance Shaders</span>
                                        </button>
                                        <button
                                            type="button"
                                            className={`vram-backend-tab-btn ${macBackend === "mlx" ? "active" : ""}`}
                                            onClick={() => setMacBackend("mlx")}
                                        >
                                            <span>Apple MLX Native</span>
                                            <span className="vram-backend-badge">Optimasi Khusus M-Series</span>
                                        </button>
                                    </div>
                                </div>

                                {/* macOS Unified Memory 75% Safe MPS Limit Callout Box */}
                                <div className="vram-callout-box" style={{ borderColor: "#2563eb" }}>
                                    <div className="vram-callout-header">
                                        <span style={{ color: "#60a5fa" }}>Aturan Limit Memori macOS (75% Safe MPS Rule):</span>
                                        <span style={{ fontFamily: "monospace", color: "#34d399" }}>
                                            {macSafeMpsLimitGb.toFixed(1)} GB Max Safe
                                        </span>
                                    </div>
                                    <span style={{ color: "#d4d4d8", fontSize: "11px" }}>
                                        macOS membatasi alokasi single-process PyTorch MPS ke $\approx 75\%$ dari total Unified Memory ({activeMac.unifiedRamGb} GB). Sisa $25\%$ ({((activeMac.unifiedRamGb) * 0.25).toFixed(1)} GB) diproteksi untuk WindowServer, Safari, dan aplikasi macOS.
                                    </span>
                                    <div className="vram-env-code">
                                        export PYTORCH_ENABLE_MPS_FALLBACK=1{"\n"}
                                        export MPS_HIGH_WATERMARK_RATIO=0.0
                                    </div>
                                </div>
                            </>
                        )}

                        {/* System RAM Row (For Non-Mac) */}
                        {platformTab !== "apple" && (
                            <div className="vram-hardware-field">
                                <div className="vram-hardware-field-header">
                                    <span className="vram-hardware-field-label">Kapasitas RAM Sistem PC (DDR4/DDR5):</span>
                                    <span className="vram-hardware-field-val" style={{ fontFamily: "monospace", color: "#e4e4e7" }}>
                                        {systemRamGb} GB RAM
                                    </span>
                                </div>
                                <div className="vram-ram-chips-row">
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
                            </div>
                        )}
                    </div>

                    {/* SECTION B: BASE MODEL ARCHITECTURE */}
                    <div className="vram-section-card">
                        <div className="vram-section-header">
                            <div className="vram-section-title-wrap">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                                    <polyline points="2 17 12 22 22 17" />
                                    <polyline points="2 12 12 17 22 12" />
                                </svg>
                                <span>Base Model Architecture</span>
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

                    {/* SECTION C: PRECISION / KUANTISASI MODEL */}
                    <div className="vram-section-card">
                        <div className="vram-section-header">
                            <div className="vram-section-title-wrap">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <span>Precision / Kuantisasi Model</span>
                            </div>
                            <span className="vram-section-badge">
                                {QUANTIZATIONS[quantKey]?.bytesPerParam} Bytes/Param
                            </span>
                        </div>

                        <div className="vram-quant-grid-7">
                            {Object.values(QUANTIZATIONS).map((q) => {
                                const isSupported = activeModel.supportedQuantizations.includes(q.id);
                                const isActive = quantKey === q.id;
                                const shortName = q.id === "fp8_e4m3" ? "FP8" : q.id === "gguf_q8" ? "GGUF Q8" : q.id === "gguf_q4" ? "GGUF Q4" : q.name.split(" ")[0];
                                return (
                                    <button
                                        key={q.id}
                                        type="button"
                                        className={`vram-quant-pill-btn ${isActive ? "active" : ""}`}
                                        onClick={() => setQuantKey(q.id)}
                                        style={{ opacity: isSupported ? 1 : 0.45 }}
                                        title={q.desc}
                                    >
                                        <span className="vram-quant-pill-name">{shortName}</span>
                                        <span className="vram-quant-pill-ratio">{q.bytesPerParam} B/P</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="vram-quant-info-bar">
                            <span className="vram-quant-info-badge">{QUANTIZATIONS[quantKey]?.name || quantKey}:</span>
                            <span className="vram-quant-info-text">{QUANTIZATIONS[quantKey]?.desc}</span>
                        </div>
                    </div>

                    {/* SECTION D: TEXT ENCODER (T5 / CLIP) */}
                    <div className="vram-section-card">
                        <div className="vram-section-header">
                            <div className="vram-section-title-wrap">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 7V4h16v3" />
                                    <line x1="12" y1="4" x2="12" y2="20" />
                                </svg>
                                <span>Text Encoder (T5 / CLIP)</span>
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

                    {/* SECTION E: TARGET RESOLUSI & BATCH SIZE */}
                    <div className="vram-section-card">
                        <div className="vram-section-header">
                            <div className="vram-section-title-wrap">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect width="18" height="18" x="3" y="3" rx="2" />
                                    <line x1="3" y1="9" x2="21" y2="9" />
                                    <line x1="9" y1="21" x2="9" y2="9" />
                                </svg>
                                <span>Target Resolusi &amp; Batch Size</span>
                            </div>
                            <span className="vram-section-badge">
                                {((width * height) / 1000000).toFixed(2)} MP
                            </span>
                        </div>

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

                    {/* SECTION F: LORA, CONTROLNET, OPTIMASI VAE & WORKFLOW PIPELINE */}
                    <div className="vram-section-card">
                        <div className="vram-section-header">
                            <div className="vram-section-title-wrap">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                </svg>
                                <span>LoRA, ControlNet, Optimasi VAE &amp; Workflow</span>
                            </div>
                            <span className="vram-section-badge">
                                {enableHiresFix ? `${hiresScale}x Hi-Res` : "Pipeline Standar"}
                            </span>
                        </div>

                        <div className="vram-merged-group">
                            {/* Part 1: LoRA & ControlNet Sliders */}
                            <div className="vram-merged-row">
                                <div className="vram-slider-row">
                                    <div className="vram-slider-top">
                                        <span style={{ color: "#d4d4d8" }}>Jumlah LoRA Aktif:</span>
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
                                <div className="vram-slider-row">
                                    <div className="vram-slider-top">
                                        <span style={{ color: "#d4d4d8" }}>Jumlah ControlNet:</span>
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
                            </div>

                            {/* Part 2: Attention & VAE Toggles */}
                            <div className="vram-merged-divider" />
                            <div className="vram-merged-toggles">
                                <div
                                    className="vram-toggle-row"
                                    onClick={() => setUseTiledVae(!useTiledVae)}
                                >
                                    <div className="vram-toggle-info">
                                        <span className="vram-toggle-title">Tiled VAE Decode (--tiled-vae)</span>
                                        <span className="vram-toggle-desc">Mencegah lonjakan VAE decode resolusi tinggi (hemat ~1.5 - 3.0 GB VRAM)</span>
                                    </div>
                                    <div className={`vram-switch ${useTiledVae ? "active" : ""}`}>
                                        <div className="vram-switch-handle" />
                                    </div>
                                </div>

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

                            {/* Part 3: Hi-Res Fix Simulator */}
                            <div className="vram-merged-divider" />
                            <div className="vram-hires-group">
                                <div
                                    className="vram-toggle-row"
                                    onClick={() => setEnableHiresFix(!enableHiresFix)}
                                >
                                    <div className="vram-toggle-info">
                                        <span className="vram-toggle-title">Simulasi Hi-Res Fix (2-Pass Denoising)</span>
                                        <span className="vram-toggle-desc">Uji lonjakan alokasi VRAM saat upscaling latent di pass kedua</span>
                                    </div>
                                    <div className={`vram-switch ${enableHiresFix ? "active" : ""}`}>
                                        <div className="vram-switch-handle" />
                                    </div>
                                </div>

                                {enableHiresFix && (
                                    <div className="vram-hires-subcontrols">
                                        <div className="vram-slider-row">
                                            <div className="vram-slider-top">
                                                <span style={{ color: "#d4d4d8" }}>Skala Pembesaran (Hi-Res Scale):</span>
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

                                        <div className="vram-input-field">
                                            <label className="vram-input-label">Metode Upscaling:</label>
                                            <div className="vram-upscale-method-grid">
                                                <button
                                                    type="button"
                                                    className={`vram-method-btn ${upscaleMethod === "latent" ? "active" : ""}`}
                                                    onClick={() => setUpscaleMethod("latent")}
                                                >
                                                    <span className="vram-method-name">Latent (Full Denoise)</span>
                                                    <span className="vram-method-desc">Full tensor O(N²)</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`vram-method-btn ${upscaleMethod === "ultimate_sd" ? "active" : ""}`}
                                                    onClick={() => setUpscaleMethod("ultimate_sd")}
                                                >
                                                    <span className="vram-method-name">Ultimate SD Upscale</span>
                                                    <span className="vram-method-desc">Tiled 2K/4K hemat VRAM</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`vram-method-btn ${upscaleMethod === "model_upscale" ? "active" : ""}`}
                                                    onClick={() => setUpscaleMethod("model_upscale")}
                                                >
                                                    <span className="vram-method-name">ESRGAN / UltraSharp</span>
                                                    <span className="vram-method-desc">Filter CNN ~850MB</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Part 4: Post-Processing Modules */}
                            <div className="vram-merged-divider" />
                            <div className="vram-workflow-toggle-grid">
                                <div
                                    className="vram-toggle-row"
                                    onClick={() => setEnableFaceDetailer(!enableFaceDetailer)}
                                >
                                    <div className="vram-toggle-info">
                                        <span className="vram-toggle-title">FaceDetailer / ADetailer Pass</span>
                                        <span className="vram-toggle-desc">YOLOv8 face detection + localized inpaint (~+0.95 GB VRAM)</span>
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
                                        <span className="vram-toggle-desc">Peralihan base model ke refiner model di tahap sampling akhir</span>
                                    </div>
                                    <div className={`vram-switch ${enableRefiner ? "active" : ""}`}>
                                        <div className="vram-switch-handle" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION G: 1-CLICK LAUNCH CONFIG & GENERATOR */}
                    <div className="vram-section-card">
                        <div className="vram-section-header">
                            <div className="vram-section-title-wrap">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                <span>
                                    {platformTab === "nvidia" && "1-Click Launch Config & Generator"}
                                    {platformTab === "amd" && (amdBackend === "rocm" ? "1-Click ROCm Linux Script" : "1-Click DirectML Batch Script")}
                                    {platformTab === "apple" && (macBackend === "mlx" ? "1-Click Apple MLX Command" : "1-Click Apple Silicon MPS Script")}
                                </span>
                            </div>

                            <div className="vram-gen-header-actions">
                                <button
                                    type="button"
                                    className="vram-btn-download-bat"
                                    onClick={handleDownloadScript}
                                    title="Unduh script peluncuran siap pakai"
                                >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="7 10 12 15 17 10" />
                                        <line x1="12" y1="15" x2="12" y2="3" />
                                    </svg>
                                    <span>
                                        {platformTab === "nvidia" || (platformTab === "amd" && amdBackend === "directml")
                                            ? "Unduh webui-user.bat"
                                            : platformTab === "amd"
                                            ? "Unduh start_rocm.sh"
                                            : "Unduh run_mac.sh"}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    className="vram-btn-copy-mono"
                                    onClick={handleCopyScript}
                                    title="Salin seluruh isi konfigurasi"
                                >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                    </svg>
                                    <span>{copiedComfy ? "Tersalin!" : "Salin Script"}</span>
                                </button>
                            </div>
                        </div>

                        {/* Dynamic Code Preview Block */}
                        <div className="vram-flags-code">
                            {platformLaunchScript}
                        </div>

                        <ul className="vram-tips-list">
                            {platformTab === "amd" ? (
                                <>
                                    <li>
                                        <strong>ROCm vs DirectML:</strong> Gunakan Linux ROCm untuk throughput maksimal (hampir menyamai CUDA native). Pada Windows DirectML, driver mengalokasikan buffer swap tambahan ~+600 MB.
                                    </li>
                                    <li>
                                        <strong>HSA_OVERRIDE_GFX_VERSION:</strong> Flag lingkungan ini wajib di-export pada kartu RDNA 2/3 (seperti RX 6700 XT atau RX 7800 XT) agar PyTorch mengenali arsitektur GPU AMD Anda.
                                    </li>
                                </>
                            ) : platformTab === "apple" ? (
                                <>
                                    <li>
                                        <strong>Batas Safe MPS 75%:</strong> macOS memproteksi 25% Unified Memory untuk sistem. Jika generasi melebihi batas safe, macOS akan menggunakan swap SSD atau menampilkan error 'MPS backend out of memory'.
                                    </li>
                                    <li>
                                        <strong>MLX Framework:</strong> Apple MLX mengeksekusi model 4-bit secara native pada chip M-series dengan latensi memori terpadu yang sangat rendah.
                                    </li>
                                </>
                            ) : (
                                <>
                                    <li>
                                        <strong>WebUI (.bat):</strong> Tempatkan file <code>webui-user.bat</code> hasil unduhan langsung ke dalam direktori instalasi Automatic1111 atau SD.Next Anda.
                                    </li>
                                    <li>
                                        <strong>Shared Memory Throttling:</strong> Flag <code>--pin-shared-memory</code> mencegah driver Windows NVIDIA memindahkan tensor secara lambat ke RAM sistem saat mendekati ambang batas VRAM fisik.
                                    </li>
                                </>
                            )}
                        </ul>
                    </div>
                </div>

                {/* Right Column: Unified Memory Telemetry, Throughput & Power */}
                <div className="vram-output-col">
                    {/* PANEL TELEMETRI MEMORI TERPADU */}
                    <div className={`vram-verdict-card status-${telemetry.status}`}>
                        <div className="vram-verdict-header">
                            <span className="vram-verdict-badge">{telemetry.statusBadge}</span>
                            <span className="vram-headroom-badge" style={{ color: telemetry.ratio <= 1.0 ? "#34d399" : "#fb7185" }}>
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
                                {platformTab === "apple" ? (
                                    <>
                                        dari <strong>{effectiveAiVram.toFixed(1)} GB Safe MPS Limit</strong> ({activeMac.unifiedRamGb} GB Unified Memory &bull; 75% macOS Max)
                                    </>
                                ) : (
                                    <>
                                        dari <strong>{effectiveAiVram.toFixed(1)} GB VRAM Efektif</strong> ({targetGpuVram} GB Fisik{desktopDeductionGb > 0 ? ` - ${desktopDeductionGb} GB Desktop` : ""}{directMlOverheadGb > 0 ? ` - ${directMlOverheadGb} GB DirectML Swap` : ""}) &bull; {Math.round(telemetry.ratio * 100)}% Kapasitas
                                    </>
                                )}
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
                                    style={{ width: `${(telemetry.runtimeOverheadGb / telemetry.totalVramGb) * 100}%` }}
                                    title={`Runtime Overhead: ${telemetry.runtimeOverheadGb.toFixed(2)} GB`}
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
                                        <span>KV &amp; Latents:</span>
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
                                        <span>Runtime Overhead:</span>
                                    </div>
                                    <span className="vram-legend-val">{telemetry.runtimeOverheadGb.toFixed(2)} GB</span>
                                </div>
                            </div>
                        </div>

                        {/* Multi-Pass Workflow Telemetry (Pass 1, Pass 2 Hi-Res, Post-Process) */}
                        <div className="vram-multipass-grid">
                            <div className={`vram-pass-box ${multiPassTelemetry.isPass1Risk ? "active-risk" : "pass-safe"}`}>
                                <div className="vram-pass-top">
                                    <span className="vram-pass-badge p1">Pass 1: Base</span>
                                    <span className="vram-pass-res">{multiPassTelemetry.pass1W}×{multiPassTelemetry.pass1H}</span>
                                </div>
                                <div className="vram-pass-vram-num" style={{ color: multiPassTelemetry.isPass1Risk ? "#fb7185" : "#f4f4f5" }}>
                                    ~{multiPassTelemetry.pass1Vram.toFixed(1)} GB
                                </div>
                                <span className="vram-pass-note">
                                    Generasi awal native model.
                                </span>
                            </div>

                            <div className={`vram-pass-box ${!enableHiresFix ? "pass-off" : multiPassTelemetry.isPass2Risk ? "active-risk" : "pass-safe"}`}>
                                <div className="vram-pass-top">
                                    <span className={`vram-pass-badge p2 ${enableHiresFix ? "active" : ""}`}>Pass 2: Hi-Res</span>
                                    <span className="vram-pass-res">
                                        {enableHiresFix ? `${multiPassTelemetry.pass2W}×${multiPassTelemetry.pass2H}` : "Off"}
                                    </span>
                                </div>
                                <div
                                    className="vram-pass-vram-num"
                                    style={{
                                        color: !enableHiresFix ? "#71717a" : multiPassTelemetry.isPass2Risk ? "#fb7185" : "#f4f4f5"
                                    }}
                                >
                                    {enableHiresFix ? `~${multiPassTelemetry.pass2Vram.toFixed(1)} GB` : "— (Off)"}
                                </div>
                                <span className="vram-pass-note">
                                    {enableHiresFix ? multiPassTelemetry.pass2Note : "Hi-Res Fix tidak aktif."}
                                </span>
                            </div>

                            <div className={`vram-pass-box ${multiPassTelemetry.isPostProcessRisk ? "active-risk" : "pass-safe"}`}>
                                <div className="vram-pass-top">
                                    <span className="vram-pass-badge p3">Post-Process</span>
                                    <span className="vram-pass-res">
                                        {enableFaceDetailer ? "ADetailer" : enableRefiner ? "Refiner" : "Clean"}
                                    </span>
                                </div>
                                <div className="vram-pass-vram-num" style={{ color: multiPassTelemetry.isPostProcessRisk ? "#fb7185" : "#f4f4f5" }}>
                                    ~{multiPassTelemetry.postProcessVram.toFixed(1)} GB
                                </div>
                                <span className="vram-pass-note">
                                    {enableFaceDetailer ? "ADetailer inpainting aktif." : "Final output render."}
                                </span>
                            </div>
                        </div>

                        {/* Dynamic Alert Message */}
                        {multiPassTelemetry.isPass1Risk ? (
                            <div className="vram-telemetry-alert alert-danger">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <span>
                                    <strong>Defisit Fatal Memori (Pass 1 Base Generation):</strong> Beban dasar model (~{multiPassTelemetry.pass1Vram.toFixed(2)} GB) melebihi batas {effectiveAiVram.toFixed(1)} GB hardware target. {platformTab === "apple" ? "macOS akan mengalami beachballing keras atau crash MPS." : "Sistem akan langsung melempar error Out Of Memory."} Turunkan resolusi dasar atau gunakan kuantisasi FP8 / GGUF Q4.
                                </span>
                            </div>
                        ) : multiPassTelemetry.isPass2Risk ? (
                            <div className="vram-telemetry-alert alert-danger">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <span>
                                    <strong>Peringatan Lonjakan Pass 2:</strong> Pass 1 muat, namun Pass 2 (Hi-Res Fix @ {multiPassTelemetry.pass2W}×{multiPassTelemetry.pass2H}) melonjak ke ~{multiPassTelemetry.pass2Vram.toFixed(1)} GB dan melebihi batas aman {effectiveAiVram.toFixed(1)} GB! Ganti metode upscaling ke <strong>Ultimate SD Upscale</strong> atau aktifkan <strong>Tiled VAE</strong>.
                                </span>
                            </div>
                        ) : multiPassTelemetry.isPostProcessRisk ? (
                            <div className="vram-telemetry-alert alert-warn">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <span>
                                    <strong>Peringatan Tahap Post-Processing:</strong> Beban tahap akhir (~{multiPassTelemetry.postProcessVram.toFixed(1)} GB) melebihi batas aman {effectiveAiVram.toFixed(1)} GB.
                                </span>
                            </div>
                        ) : (
                            <div className="vram-telemetry-alert alert-safe">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>{telemetry.statusMessage}</span>
                            </div>
                        )}

                        {/* System RAM or Apple Unified Memory Track */}
                        <div className="vram-ram-section">
                            <div className="vram-ram-header">
                                <span className="vram-ram-title">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                                        <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                                        <line x1="6" y1="6" x2="6.01" y2="6" />
                                        <line x1="6" y1="18" x2="6.01" y2="18" />
                                    </svg>
                                    <span>
                                        {platformTab === "apple"
                                            ? `Apple Unified Memory (${activeMac.unifiedRamGb} GB Pool)`
                                            : "Kebutuhan RAM Sistem (DDR4/DDR5)"}
                                    </span>
                                </span>
                                <span className={`vram-ram-badge ${ramTelemetry.ramStatus}`}>
                                    {ramTelemetry.ramBadge}
                                </span>
                            </div>

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
                                    Kapasitas: <strong>{platformTab === "apple" ? activeMac.unifiedRamGb : systemRamGb} GB</strong>
                                </span>
                            </div>

                            <div className={`vram-ram-alert-msg ${ramTelemetry.ramStatus}`}>
                                {ramTelemetry.ramMessage}
                            </div>
                        </div>
                    </div>

                    {/* ESTIMATOR THROUGHPUT & WAKTU GENERATE */}
                    <div className="vram-throughput-card">
                        <div className="vram-throughput-header">
                            <div className="vram-throughput-title-wrap">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                                </svg>
                                <span>Estimasi Throughput &amp; Waktu Generate</span>
                            </div>
                            <span className={`vram-throughput-badge ${throughputTelemetry.speedClass}`}>
                                {throughputTelemetry.speedBadge}
                            </span>
                        </div>

                        {/* Steps Setting with Quick Chips */}
                        <div className="vram-steps-box">
                            <div className="vram-steps-top">
                                <span className="vram-steps-label">Denoising Steps Target:</span>
                                <span className="vram-steps-val-badge">{samplingSteps} Steps</span>
                            </div>
                            <input
                                type="range"
                                min={4}
                                max={100}
                                step={1}
                                className="vram-range-input"
                                value={samplingSteps}
                                onChange={(e) => setSamplingSteps(parseInt(e.target.value) || 20)}
                            />
                            <div className="vram-steps-chips-row">
                                {[4, 15, 20, 25, 30, 50].map((step) => (
                                    <button
                                        key={step}
                                        type="button"
                                        className={`vram-step-chip ${samplingSteps === step ? "active" : ""}`}
                                        onClick={() => setSamplingSteps(step)}
                                    >
                                        {step === 4 ? "4 (Schnell)" : step === 20 ? "20 (Flux/SDXL)" : step === 25 ? "25 (Euler)" : `${step} Steps`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Single Sharp Monochrome Metric Strip (font-mono) */}
                        <div className="vram-throughput-strip font-mono">
                            <div className="vram-strip-item">
                                <span className="vram-strip-label">Total Durasi per Gambar</span>
                                <div className="vram-strip-val-wrap">
                                    <span className="vram-strip-num">~{throughputTelemetry.totalDurationSec.toFixed(1)}s</span>
                                    {throughputTelemetry.totalDurationSec >= 60 && (
                                        <span className="vram-strip-sub" style={{ color: "#60a5fa" }}>
                                            (~{Math.floor(throughputTelemetry.totalDurationSec / 60)}m {(throughputTelemetry.totalDurationSec % 60).toFixed(0)}s)
                                        </span>
                                    )}
                                </div>
                                <span className="vram-strip-caption">
                                    {samplingSteps} steps &bull; {throughputTelemetry.secondsPerStep.toFixed(2)}s/step
                                </span>
                            </div>

                            <div className="vram-strip-divider" />

                            <div className="vram-strip-item">
                                <span className="vram-strip-label">Kecepatan Denoising</span>
                                <div className="vram-strip-val-wrap">
                                    <span className="vram-strip-num" style={{ color: "#60a5fa" }}>
                                        {throughputTelemetry.itPerSec >= 1.0
                                            ? `${throughputTelemetry.itPerSec.toFixed(2)} it/s`
                                            : `${throughputTelemetry.secondsPerStep.toFixed(2)} s/it`}
                                    </span>
                                    <span className="vram-strip-sub" style={{ color: "#a1a1aa" }}>
                                        ({throughputTelemetry.itPerSec >= 1.0
                                            ? `~${throughputTelemetry.secondsPerStep.toFixed(2)} s/it`
                                            : `~${throughputTelemetry.itPerSec.toFixed(2)} it/s`})
                                    </span>
                                </div>
                                <span className="vram-strip-caption">
                                    {platformTab === "nvidia" && activeGpu.name.split("/")[0].trim()}
                                    {platformTab === "amd" && activeAmdGpu.name.split("(")[0].trim()}
                                    {platformTab === "apple" && activeMac.name.split("(")[0].trim()}
                                </span>
                            </div>
                        </div>

                        {/* Status Note */}
                        <div className={`vram-throughput-alert-box ${throughputTelemetry.speedClass}`}>
                            <strong>Status Kecepatan ({throughputTelemetry.speedBadge}):</strong> {throughputTelemetry.speedNote}
                        </div>
                    </div>

                    {/* KALKULATOR DAYA SISTEM & TOKEN PLN */}
                    <div className="vram-power-card">
                        <div className="vram-power-header">
                            <div className="vram-power-title-wrap">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                                </svg>
                                <span>Kalkulator Daya Sistem &amp; Token Listrik PLN</span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span className={`vram-power-badge ${powerTelemetry.effClass}`}>
                                    {powerTelemetry.effBadge}
                                </span>
                                <div className="vram-power-tab-bar">
                                    <button
                                        type="button"
                                        className={`vram-power-tab-btn ${billingType === "token" ? "active" : ""}`}
                                        onClick={() => setBillingType("token")}
                                    >
                                        Token Listrik
                                    </button>
                                    <button
                                        type="button"
                                        className={`vram-power-tab-btn ${billingType === "pascabayar" ? "active" : ""}`}
                                        onClick={() => setBillingType("pascabayar")}
                                    >
                                        Pascabayar
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 3-Column Solid Stat Cards */}
                        <div className="vram-power-metrics-grid">
                            <div className="vram-metric-solid-box">
                                <span className="vram-metric-solid-label">Biaya {batchImageCount} Gambar</span>
                                <span className="vram-metric-solid-val" style={{ color: "#34d399" }}>
                                    Rp {Math.round(powerTelemetry.batchTotalCostIdr).toLocaleString("id-ID")}
                                </span>
                                <span className="vram-metric-solid-sub">
                                    @ Rp {powerTelemetry.costPerImageIdr >= 10 ? powerTelemetry.costPerImageIdr.toFixed(1) : powerTelemetry.costPerImageIdr.toFixed(2)} / img
                                </span>
                            </div>

                            {billingType === "token" ? (
                                <>
                                    <div className="vram-metric-solid-box">
                                        <span className="vram-metric-solid-label">Kapasitas Token Rp {tokenNominal.toLocaleString("id-ID")}</span>
                                        <span className="vram-metric-solid-val" style={{ color: "#60a5fa" }}>
                                            ~{powerTelemetry.imagesPerFullToken.toLocaleString("id-ID")} Gambar
                                        </span>
                                        <span className="vram-metric-solid-sub">
                                            Kuota {powerTelemetry.totalTokenKwh.toFixed(1)} kWh PLN
                                        </span>
                                    </div>

                                    <div className="vram-metric-solid-box">
                                        <span className="vram-metric-solid-label">Sisa Kuota Token</span>
                                        <span className="vram-metric-solid-val" style={{ color: "#f4f4f5" }}>
                                            Rp {Math.round(powerTelemetry.tokenRemainingRp).toLocaleString("id-ID")}
                                        </span>
                                        <span className="vram-metric-solid-sub">
                                            Sisa ~{powerTelemetry.tokenRemainingKwh.toFixed(2)} kWh ({powerTelemetry.tokenPercentUsed.toFixed(1)}% terpakai)
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="vram-metric-solid-box">
                                        <span className="vram-metric-solid-label">Total Energi PC</span>
                                        <span className="vram-metric-solid-val" style={{ color: "#fbbf24" }}>
                                            {powerTelemetry.batchTotalKwh < 0.01 ? (powerTelemetry.batchTotalKwh * 1000).toFixed(1) + " Wh" : powerTelemetry.batchTotalKwh.toFixed(3) + " kWh"}
                                        </span>
                                        <span className="vram-metric-solid-sub">
                                            Durasi ~{(powerTelemetry.batchTotalHours * 60).toFixed(0)} menit total
                                        </span>
                                    </div>

                                    <div className="vram-metric-solid-box">
                                        <span className="vram-metric-solid-label">Stopkontak Wall Draw</span>
                                        <span className="vram-metric-solid-val" style={{ color: "#f4f4f5" }}>
                                            ~{powerTelemetry.totalPcWatts}W
                                        </span>
                                        <span className="vram-metric-solid-sub">
                                            DC {powerTelemetry.totalDcWatts}W + Adaptor {powerTelemetry.chargerLossWatts}W
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Hardware Power Configuration Table */}
                        <div className="vram-power-compact-table">
                            <div className="vram-table-row">
                                <div className="vram-table-label-col">
                                    <span className="vram-table-row-title">
                                        {platformTab === "apple" ? "Apple Silicon SoC" : "Konsumsi Daya Akselerator"}
                                    </span>
                                    <span className="vram-table-val" style={{ color: "#60a5fa" }}>
                                        {powerTelemetry.hardwareWatts}W
                                    </span>
                                </div>
                                <div className="vram-table-ctrl-col">
                                    <span style={{ fontSize: "11px", color: "#a1a1aa" }}>
                                        {platformTab === "apple"
                                            ? `Daya efisiensi tinggi chip ${activeMac.name.split("(")[0].trim()}`
                                            : platformTab === "amd"
                                            ? `TBP default ${activeAmdGpu.name.split("(")[0].trim()}`
                                            : `TDP aktif ${activeGpu.name.split("(")[0].trim()}`}
                                    </span>
                                </div>
                            </div>

                            {billingType === "token" && (
                                <div className="vram-table-row">
                                    <div className="vram-table-label-col">
                                        <span className="vram-table-row-title">Nominal Token PLN</span>
                                        <span className="vram-table-val" style={{ color: "#34d399" }}>
                                            Rp {tokenNominal.toLocaleString("id-ID")}
                                        </span>
                                    </div>
                                    <div className="vram-table-ctrl-col">
                                        <div className="vram-power-chips">
                                            {[20000, 50000, 100000, 200000, 500000].map((t) => (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    className={`vram-power-chip ${tokenNominal === t ? "active" : ""}`}
                                                    onClick={() => setTokenNominal(t)}
                                                >
                                                    Rp {(t / 1000).toFixed(0)}k
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="vram-table-row">
                                <div className="vram-table-label-col">
                                    <span className="vram-table-row-title">Tarif Listrik PLN</span>
                                    <span className="vram-table-val" style={{ color: "#34d399" }}>
                                        Rp {plnTarifPerKwh}/kWh
                                    </span>
                                </div>
                                <div className="vram-table-ctrl-col">
                                    <div className="vram-power-chips">
                                        {[
                                            { label: "1.300–2.200 VA (Rp 1.444)", val: 1444 },
                                            { label: "3.500+ VA (Rp 1.700)", val: 1700 },
                                            { label: "900 VA (Rp 1.352)", val: 1352 },
                                        ].map((t) => (
                                            <button
                                                key={t.val}
                                                type="button"
                                                className={`vram-power-chip ${plnTarifPerKwh === t.val ? "active" : ""}`}
                                                onClick={() => setPlnTarifPerKwh(t.val)}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="vram-table-row">
                                <div className="vram-table-label-col">
                                    <span className="vram-table-row-title">Target Jumlah Batch</span>
                                    <span className="vram-table-val" style={{ color: "#60a5fa" }}>
                                        {batchImageCount} Gambar
                                    </span>
                                </div>
                                <div className="vram-table-ctrl-col">
                                    <div className="vram-power-chips">
                                        {[1, 10, 50, 100, 500, 1000].map((count) => (
                                            <button
                                                key={count}
                                                type="button"
                                                className={`vram-power-chip ${batchImageCount === count ? "active" : ""}`}
                                                onClick={() => setBatchImageCount(count)}
                                            >
                                                {count === 1 ? "1 Img" : count === 100 ? "100 Std" : count === 500 ? "500 Batch" : `${count}`}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Summary Insight Box */}
                        <div className="vram-power-insight-box">
                            <strong>Ringkasan Daya Stopkontak:</strong> Total penarikan daya riil sistem adalah <strong>~{powerTelemetry.totalPcWatts}W</strong>.
                            {billingType === "token" ? (
                                <>
                                    {" "}Untuk generate <strong>{batchImageCount} gambar</strong>, token PLN berkurang <strong>{powerTelemetry.batchTotalKwh.toFixed(3)} kWh</strong> (Rp {Math.round(powerTelemetry.batchTotalCostIdr).toLocaleString("id-ID")}), setara <strong>{powerTelemetry.tokenPercentUsed.toFixed(2)}%</strong> dari token Rp {tokenNominal.toLocaleString("id-ID")}. Satu token Rp {tokenNominal.toLocaleString("id-ID")} memadai untuk <strong>~{powerTelemetry.imagesPerFullToken.toLocaleString("id-ID")} gambar</strong>.
                                </>
                            ) : (
                                <>
                                    {" "}Generate {batchImageCount} gambar {activeModel.name} memerlukan {powerTelemetry.batchTotalKwh.toFixed(3)} kWh dengan perkiraan biaya listrik Rp {Math.round(powerTelemetry.batchTotalCostIdr).toLocaleString("id-ID")} (~Rp {powerTelemetry.costPerImageIdr.toFixed(2)}/gambar).
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Hardware Profile Modal */}
            <HardwareProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                gpuPresets={GPU_PRESETS}
                currentSpecs={{
                    gpuPresetId,
                    customGpuVram,
                    systemRamGb,
                    displayDeductionMode,
                    laptopTgpWatts,
                    tufProfile,
                    cpuWatts,
                    plnTarifPerKwh,
                }}
                onApplyProfile={handleApplyProfile}
                onToast={showToast}
            />

            {/* Quick Toast Notification */}
            {toastMessage && (
                <div
                    style={{
                        position: "fixed",
                        bottom: "24px",
                        right: "24px",
                        background: "#121215",
                        border: "1px solid #27272a",
                        borderLeft: "3px solid #2563eb",
                        color: "#f4f4f5",
                        padding: "10px 16px",
                        borderRadius: "6px",
                        fontSize: "12.5px",
                        fontWeight: 600,
                        zIndex: 10000,
                        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{toastMessage}</span>
                </div>
            )}
        </div>
    );
}
