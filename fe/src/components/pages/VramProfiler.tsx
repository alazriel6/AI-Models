import { useState, useMemo, useEffect } from "react";
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
    fp16Tflops: number;
    memBandwidthGbps: number;
    category: string;
    tdpWatts: number;
    isLaptop?: boolean;
    tgpMinWatts?: number;
    tgpMaxWatts?: number;
}

const GPU_PRESETS: GpuPreset[] = [
    // -------------------------------------------------------------
    // RTX 50 SERIES (BLACKWELL ARCHITECTURE - GDDR7)
    // -------------------------------------------------------------
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

    // -------------------------------------------------------------
    // RTX 40 SERIES (ADA LOVELACE ARCHITECTURE)
    // -------------------------------------------------------------
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

    // -------------------------------------------------------------
    // RTX 30 SERIES (AMPERE ARCHITECTURE)
    // -------------------------------------------------------------
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

    // -------------------------------------------------------------
    // RTX 20 SERIES & GTX (TURING ARCHITECTURE)
    // -------------------------------------------------------------
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

    // -------------------------------------------------------------
    // AMD RADEON MOBILE (ASUS TUF A16 ADVANTAGE & ROCm)
    // -------------------------------------------------------------
    { id: "rx7700s_laptop", name: "AMD Radeon RX 7700S Laptop (8 GB - TUF A16)", vramGb: 8, tier: "TUF A16 Advantage", fp16Tflops: 64, memBandwidthGbps: 288, category: "AMD Radeon Mobile (TUF A16 / ROCm)", tdpWatts: 120, isLaptop: true, tgpMinWatts: 75, tgpMaxWatts: 120 },
    { id: "rx7600s_laptop", name: "AMD Radeon RX 7600S Laptop (8 GB - TUF A16)", vramGb: 8, tier: "TUF A16 Advantage", fp16Tflops: 56, memBandwidthGbps: 256, category: "AMD Radeon Mobile (TUF A16 / ROCm)", tdpWatts: 95, isLaptop: true, tgpMinWatts: 50, tgpMaxWatts: 95 },
    { id: "rx7600m_xt", name: "AMD Radeon RX 7600M XT Laptop (8 GB)", vramGb: 8, tier: "RDNA3 Mobile", fp16Tflops: 60, memBandwidthGbps: 288, category: "AMD Radeon Mobile (TUF A16 / ROCm)", tdpWatts: 130, isLaptop: true, tgpMinWatts: 75, tgpMaxWatts: 130 },

    // -------------------------------------------------------------
    // WORKSTATION & DATACENTER (ADA, AMPERE, HOPPER)
    // -------------------------------------------------------------
    { id: "h100", name: "NVIDIA H100 SXM5 / PCIe (80 GB)", vramGb: 80, tier: "Enterprise Hopper", fp16Tflops: 990, memBandwidthGbps: 3350, category: "Workstation & Datacenter", tdpWatts: 700 },
    { id: "a100_80gb", name: "NVIDIA A100 PCIe (80 GB)", vramGb: 80, tier: "Enterprise Ampere", fp16Tflops: 312, memBandwidthGbps: 1935, category: "Workstation & Datacenter", tdpWatts: 250 },
    { id: "a6000", name: "RTX 6000 Ada Generation (48 GB)", vramGb: 48, tier: "Workstation Pro", fp16Tflops: 365, memBandwidthGbps: 960, category: "Workstation & Datacenter", tdpWatts: 300 },
    { id: "rtxa6000", name: "RTX A6000 Ampere (48 GB)", vramGb: 48, tier: "Pro Workstation Ampere", fp16Tflops: 150, memBandwidthGbps: 768, category: "Workstation & Datacenter", tdpWatts: 300 },
    { id: "rtx5000_ada", name: "RTX 5000 Ada Generation (32 GB)", vramGb: 32, tier: "Pro Workstation Ada", fp16Tflops: 260, memBandwidthGbps: 576, category: "Workstation & Datacenter", tdpWatts: 250 },
    { id: "rtx4000_ada", name: "RTX 4000 Ada Generation (20 GB)", vramGb: 20, tier: "Pro Workstation Ada", fp16Tflops: 150, memBandwidthGbps: 360, category: "Workstation & Datacenter", tdpWatts: 130 },
    { id: "rtxa5000", name: "RTX A5000 Ampere (24 GB)", vramGb: 24, tier: "Pro Workstation", fp16Tflops: 110, memBandwidthGbps: 768, category: "Workstation & Datacenter", tdpWatts: 230 },
    { id: "rtxa4000", name: "RTX A4000 Ampere (16 GB)", vramGb: 16, tier: "Pro Workstation", fp16Tflops: 75, memBandwidthGbps: 448, category: "Workstation & Datacenter", tdpWatts: 140 },
    { id: "rtxa2000_12gb", name: "RTX A2000 (12 GB)", vramGb: 12, tier: "Compact Workstation", fp16Tflops: 32, memBandwidthGbps: 288, category: "Workstation & Datacenter", tdpWatts: 70 },

    // -------------------------------------------------------------
    // KUSTOM / MANUAL
    // -------------------------------------------------------------
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
    const [copiedComfy, setCopiedComfy] = useState<boolean>(false);

    // 8. Windows Desktop & Multi-Monitor VRAM Deduction
    const [displayDeductionMode, setDisplayDeductionMode] = useState<"primary_single" | "primary_multi" | "headless">("primary_single");

    // 9. System RAM Target (DDR4/DDR5) for Host CPU Offloading
    const [systemRamGb, setSystemRamGb] = useState<number>(32);

    // 10. Hi-Res Fix & Workflow Post-Processing Simulator
    const [enableHiresFix, setEnableHiresFix] = useState<boolean>(false);
    const [hiresScale, setHiresScale] = useState<number>(1.5);
    const [upscaleMethod, setUpscaleMethod] = useState<"latent" | "ultimate_sd" | "model_upscale">("latent");
    const [enableFaceDetailer, setEnableFaceDetailer] = useState<boolean>(false);
    const [enableRefiner, setEnableRefiner] = useState<boolean>(false);

    // 11. Throughput & Generation Speed Estimator
    const [samplingSteps, setSamplingSteps] = useState<number>(() => (modelKey === "flux" ? 20 : 25));

    // 12. 1-Click Launch Config & Generator Tab
    const [genPreviewTab, setGenPreviewTab] = useState<"bat" | "comfy" | "webui">("bat");

    // 13. Power & Electricity Cost Estimator (Full System & Token PLN)
    const [plnTarifPerKwh, setPlnTarifPerKwh] = useState<number>(1444);
    const [batchImageCount, setBatchImageCount] = useState<number>(100);
    const [laptopTgpWatts, setLaptopTgpWatts] = useState<number>(100);
    const [tufProfile, setTufProfile] = useState<"turbo" | "perf" | "silent" | "overnight" | "custom">("perf");
    const [cpuWatts, setCpuWatts] = useState<number>(35); // AMD Ryzen HS / Intel Core
    const [screenMode, setScreenMode] = useState<"off" | "med" | "high">("med"); // Layar Laptop 16" IPS (0W, 9W, 15W)
    const [externalMonitorMode, setExternalMonitorMode] = useState<"none" | "fhd" | "4k">("none"); // Monitor Eksternal (0W, 25W, 42W)
    const [coolingFanMode, setCoolingFanMode] = useState<"silent" | "balanced" | "turbo">("balanced"); // Dual Arc-Flow Fans (8W, 14W, 20W)
    const [includeChargerLoss, setIncludeChargerLoss] = useState<boolean>(true); // Efisiensi Adaptor AC/DC Charger 240W (~89% Wall Draw)

    // Token Listrik Prabayar (Pulsa Listrik) vs Pascabayar
    const [billingType, setBillingType] = useState<"token" | "pascabayar">("token");
    const [tokenNominal, setTokenNominal] = useState<number>(50000); // Rp 20.000, 50.000, 100.000, 200.000, 500.000

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

    // Active GPU Metadata & Compute Specifications
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

    // Sync laptop TGP when GPU preset changes
    useEffect(() => {
        if (activeGpu.isLaptop && activeGpu.tdpWatts) {
            setLaptopTgpWatts(activeGpu.tdpWatts);
        }
    }, [activeGpu]);

    // Active GPU VRAM
    const targetGpuVram = useMemo(() => {
        return activeGpu.vramGb;
    }, [activeGpu]);

    // Windows Desktop / Multi-Monitor Overhead Deduction
    const desktopDeductionGb = useMemo(() => {
        if (displayDeductionMode === "primary_single") return 0.8; // ~800 MB standard single display + browser
        if (displayDeductionMode === "primary_multi") return 1.4; // ~1400 MB dual display / 4K
        return 0.0; // Headless / pure compute secondary GPU
    }, [displayDeductionMode]);

    const effectiveAiVram = useMemo(() => {
        return Math.max(1.0, targetGpuVram - desktopDeductionGb);
    }, [targetGpuVram, desktopDeductionGb]);

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

        // Ratio vs Effective AI VRAM (Deducing Windows DWM & Desktop)
        const ratio = totalVramGb / effectiveAiVram;
        const headroomGb = effectiveAiVram - totalVramGb;

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
        effectiveAiVram,
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

        const isPass2Risk = pass2Vram > effectiveAiVram;
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

    // THROUGHPUT & SPEED (IT/S) TELEMETRY ENGINE
    const throughputTelemetry = useMemo(() => {
        const paramCountB = activeModel.paramCountB;
        const resPixels = width * height;
        const basePixels = 512 * 512;
        const resFactor = Math.pow(resPixels / basePixels, 0.85);
        const batchFactor = batchSize;
        const videoFactor = activeModel.isTextToVideo ? Math.pow(Math.max(1, videoFrames) / 16, 0.9) : 1;

        // Base computation load per step in effective TFLOPs
        const baseTflopsPerStep = (paramCountB * 0.08) * resFactor * batchFactor * videoFactor;

        // Raw compute seconds per step based on GPU compute
        const rawSecs = baseTflopsPerStep / (activeGpu.fp16Tflops * 0.007);

        // Precision factor
        let quantMod = 1.0;
        if (quantKey.includes("fp8")) quantMod = 0.85;
        else if (quantKey.includes("q4") || quantKey === "nf4") quantMod = 0.9;
        else if (quantKey === "fp32") quantMod = 2.0;

        // Attention factor
        const sdpMod = useSdpAttention ? 1.0 : 0.55; // 1.8x slower without SDP

        // Memory transfer & offloading penalty
        let offloadPenalty = 1.0;
        if (ramTelemetry.ramStatus === "ram-danger") {
            offloadPenalty = 25.0; // Disk thrashing to SSD pagefile
        } else if (telemetry.status === "danger") {
            offloadPenalty = 4.5;
        } else if (telemetry.status === "offload") {
            offloadPenalty = 2.8; // PCIe weight swapping to system RAM
        } else if (telemetry.status === "warn") {
            offloadPenalty = 1.15;
        }

        const secondsPerStep = Math.max(0.015, (rawSecs * quantMod * offloadPenalty) / sdpMod);
        const itPerSec = 1 / secondsPerStep;

        // Pre/Post durations
        let textEncodeSec = 0.3;
        if (teKey === "none") textEncodeSec = 2.8; // Offloaded to host CPU
        else if (teKey === "t5_fp16") textEncodeSec = 1.5;
        else if (teKey === "t5_fp8") textEncodeSec = 1.0;
        else if (teKey.startsWith("dual_clip")) textEncodeSec = 0.5;

        let vaeDecodeSec = useTiledVae ? 1.4 : 0.8;
        if (activeModel.id === "sd15") vaeDecodeSec = 0.35;
        else if (activeModel.id === "flux") vaeDecodeSec = 2.2;
        else if (activeModel.isTextToVideo) vaeDecodeSec = 5.5;

        const denoiseSec = samplingSteps * secondsPerStep;

        // Hi-Res Fix additional time
        let hiresSec = 0;
        if (enableHiresFix) {
            const hiresPixels = (width * hiresScale) * (height * hiresScale);
            const hiresResFactor = Math.pow(hiresPixels / basePixels, 0.85);
            const hiresBaseTflops = (paramCountB * 0.08) * hiresResFactor * batchFactor;
            const hiresRawSecs = hiresBaseTflops / (activeGpu.fp16Tflops * 0.007);
            const hiresSecPerStep = Math.max(0.02, (hiresRawSecs * quantMod * offloadPenalty) / sdpMod);
            hiresSec = 15 * hiresSecPerStep + 0.8; // 15 steps denoising + VAE decode
        }

        let detailerSec = 0;
        if (enableFaceDetailer) {
            detailerSec = 1.8; // YOLO face detection + inpaint
        }

        const totalDurationSec = textEncodeSec + denoiseSec + hiresSec + detailerSec + vaeDecodeSec;

        let speedBadge = "Sangat Cepat";
        let speedClass: "speed-fast" | "speed-normal" | "speed-slow" | "speed-critical" = "speed-fast";
        let speedNote = "Throughput maksimal! Generasi instan berkat eksekusi native di VRAM Tensor Core.";

        if (ramTelemetry.ramStatus === "ram-danger") {
            speedBadge = "Kritis (Disk-Thrashing)";
            speedClass = "speed-critical";
            speedNote = "Generasi melambat hingga 25×–50× lipat karena Windows menukar tensor ke SSD/Pagefile.";
        } else if (telemetry.status === "offload" || telemetry.status === "danger") {
            speedBadge = "Lambat (PCIe Offload)";
            speedClass = "speed-slow";
            speedNote = "Model di-swap bolak-balik antara RAM dan GPU via bus PCIe, menambah latency per step.";
        } else if (itPerSec < 1.5) {
            speedBadge = "Sedang / Normal";
            speedClass = "speed-normal";
            speedNote = "Throughput normal untuk resolusi atau arsitektur model besar ini.";
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

    // 1-Click ComfyUI Command generator
    const comfyUiCommand = useMemo(() => {
        const args: string[] = ["python", "main.py"];

        if (effectiveAiVram >= 16) {
            args.push("--highvram");
            args.push("--gpu-only");
        } else if (effectiveAiVram >= 10) {
            args.push("--normalvram");
        } else if (effectiveAiVram >= 6) {
            args.push("--lowvram");
            args.push("--pin-shared-memory");
        } else {
            args.push("--novram");
            args.push("--cpu-vae");
        }

        if (useTiledVae) {
            args.push("--fast");
        }

        args.push("--preview-method", "auto");

        if (quantKey.includes("fp8")) {
            args.push("--fp8_e4m3fn-text-enc");
        }

        return args.join(" ");
    }, [effectiveAiVram, useTiledVae, quantKey]);

    // 1-Click webui-user.bat file generator
    const webuiBatContent = useMemo(() => {
        return `@echo off
REM ========================================================
REM Antigravity AI - webui-user.bat Auto-Generated Config
REM Target GPU: ${activeGpu.name}
REM Usable AI VRAM: ${effectiveAiVram.toFixed(1)} GB (Physical: ${targetGpuVram} GB)
REM Target Model: ${activeModel.name} (${QUANTIZATIONS[quantKey]?.name || quantKey})
REM Throughput Estimasi: ~${throughputTelemetry.itPerSec >= 1 ? `${throughputTelemetry.itPerSec.toFixed(2)} it/s` : `${throughputTelemetry.secondsPerStep.toFixed(2)} s/it`}
REM ========================================================

set PYTHON=
set GIT=
set VENV_DIR=
set COMMANDLINE_ARGS=${recommendedCliFlags}

call webui.bat
`;
    }, [activeGpu.name, effectiveAiVram, targetGpuVram, activeModel.name, quantKey, throughputTelemetry, recommendedCliFlags]);

    const handleDownloadBat = () => {
        const blob = new Blob([webuiBatContent], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "webui-user.bat";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleCopyComfy = () => {
        navigator.clipboard.writeText(comfyUiCommand);
        setCopiedComfy(true);
        setTimeout(() => setCopiedComfy(false), 2000);
    };

    const handleApplyTufProfile = (profile: "turbo" | "perf" | "silent" | "overnight") => {
        setTufProfile(profile);
        if (profile === "turbo") {
            const maxW = activeGpu.isLaptop ? (activeGpu.tgpMaxWatts || 140) : activeGpu.tdpWatts;
            setLaptopTgpWatts(maxW);
            setCpuWatts(50);
            setScreenMode("high");
            setCoolingFanMode("turbo");
        } else if (profile === "perf") {
            const perfW = activeGpu.isLaptop ? Math.round((activeGpu.tgpMaxWatts || 140) * 0.75) : Math.round(activeGpu.tdpWatts * 0.85);
            setLaptopTgpWatts(perfW);
            setCpuWatts(35);
            setScreenMode("med");
            setCoolingFanMode("balanced");
        } else if (profile === "silent") {
            const minW = activeGpu.isLaptop ? (activeGpu.tgpMinWatts || 55) : Math.round(activeGpu.tdpWatts * 0.55);
            setLaptopTgpWatts(minW);
            setCpuWatts(22);
            setScreenMode("med");
            setCoolingFanMode("silent");
        } else if (profile === "overnight") {
            const nightW = activeGpu.isLaptop ? Math.round((activeGpu.tgpMaxWatts || 140) * 0.7) : Math.round(activeGpu.tdpWatts * 0.8);
            setLaptopTgpWatts(nightW);
            setCpuWatts(30);
            setScreenMode("off"); // Layar Laptop Mati 0W!
            setCoolingFanMode("balanced");
        }
    };

    // POWER & ELECTRICITY COST (TDP / KWH & TOKEN PLN) TELEMETRY ENGINE
    const powerTelemetry = useMemo(() => {
        const isLaptop = !!activeGpu.isLaptop;
        const gpuWatts = isLaptop
            ? Math.max(activeGpu.tgpMinWatts || 35, Math.min(activeGpu.tgpMaxWatts || 175, laptopTgpWatts))
            : activeGpu.tdpWatts;

        // 1. CPU Power (AMD Ryzen / Intel)
        let activeCpuWatts = cpuWatts;
        if (teKey === "none") {
            activeCpuWatts = Math.min(65, activeCpuWatts + 15); // Host CPU text encode load
        }
        if (ramTelemetry.ramStatus === "ram-danger") {
            activeCpuWatts = Math.min(65, activeCpuWatts + 12); // Paging thrashing CPU overhead
        }

        // 2. Layar Laptop ASUS TUF (16" IPS 165Hz)
        const screenWatts = screenMode === "off" ? 0 : screenMode === "high" ? 15 : 9;

        // 3. Monitor Eksternal Tambahan (HDMI / DisplayPort)
        const extMonitorWatts = externalMonitorMode === "none" ? 0 : externalMonitorMode === "4k" ? 42 : 25;

        // 4. Kipas Pendingin Dual Arc-Flow + Motherboard VRM + RAM DDR5 + SSD NVMe
        const systemInternalWatts = coolingFanMode === "turbo" ? 20 : coolingFanMode === "silent" ? 8 : 14;

        // Total DC Component Power Draw
        const totalDcWatts = gpuWatts + activeCpuWatts + screenWatts + extMonitorWatts + systemInternalWatts;

        // Wall Draw from AC Power Outlet (Stopkontak PLN / Meteran Token)
        // Adaptor Charger ASUS TUF 240W/280W has ~89% AC-to-DC conversion efficiency
        const chargerEfficiency = includeChargerLoss ? 0.89 : 1.0;
        const totalPcWatts = Math.round(totalDcWatts / chargerEfficiency);
        const chargerLossWatts = totalPcWatts - totalDcWatts;

        // Energy per single image in Watt-hours and kiloWatt-hours
        const durationHoursPerImage = throughputTelemetry.totalDurationSec / 3600;
        const wattHoursPerImage = totalPcWatts * durationHoursPerImage;
        const kwhPerImage = wattHoursPerImage / 1000;

        // Cost per single image in IDR
        const costPerImageIdr = kwhPerImage * plnTarifPerKwh;

        // Total Batch calculation
        const batchTotalKwh = kwhPerImage * batchImageCount;
        const batchTotalCostIdr = batchTotalKwh * plnTarifPerKwh;
        const batchTotalHours = (throughputTelemetry.totalDurationSec * batchImageCount) / 3600;

        // Token Listrik Prabayar (Pulsa Listrik) Specific Metrics
        const totalTokenKwh = tokenNominal / plnTarifPerKwh; // misal Rp 50.000 / 1444 = 34.62 kWh
        const imagesPerFullToken = kwhPerImage > 0 ? Math.floor(totalTokenKwh / kwhPerImage) : 0;
        const tokenPercentUsed = totalTokenKwh > 0 ? (batchTotalKwh / totalTokenKwh) * 100 : 0;
        const tokenRemainingRp = Math.max(0, tokenNominal - batchTotalCostIdr);
        const tokenRemainingKwh = Math.max(0, totalTokenKwh - batchTotalKwh);

        // Laptop TGP throttling evaluation
        let isTgpThrottled = false;
        let tgpThrottlePercent = 0;
        if (isLaptop && activeGpu.tgpMaxWatts && activeGpu.tgpMaxWatts > 75) {
            if (gpuWatts < activeGpu.tgpMaxWatts * 0.65) {
                isTgpThrottled = true;
                tgpThrottlePercent = Math.round((1 - gpuWatts / activeGpu.tgpMaxWatts) * 45); // up to ~30-40% clock penalty
            }
        }

        // Efficiency tier badge
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
            gpuWatts,
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
            isTgpThrottled,
            tgpThrottlePercent,
            effBadge,
            effClass,
        };
    }, [
        activeGpu,
        laptopTgpWatts,
        cpuWatts,
        teKey,
        ramTelemetry.ramStatus,
        screenMode,
        externalMonitorMode,
        coolingFanMode,
        includeChargerLoss,
        throughputTelemetry.totalDurationSec,
        plnTarifPerKwh,
        batchImageCount,
        tokenNominal,
    ]);

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
        setDisplayDeductionMode("primary_single");
        setSystemRamGb(32);
        setEnableHiresFix(false);
        setHiresScale(1.5);
        setUpscaleMethod("latent");
        setEnableFaceDetailer(false);
        setEnableRefiner(false);
        setSamplingSteps(20);
        setGenPreviewTab("bat");
        setPlnTarifPerKwh(1444);
        setBatchImageCount(100);
        setLaptopTgpWatts(100);
        setTufProfile("perf");
        setCpuWatts(35);
        setScreenMode("med");
        setExternalMonitorMode("none");
        setCoolingFanMode("balanced");
        setIncludeChargerLoss(true);
        setBillingType("token");
        setTokenNominal(50000);
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
                                dari <strong>{effectiveAiVram.toFixed(1)} GB VRAM Efektif</strong> ({targetGpuVram} GB Fisik{desktopDeductionGb > 0 ? ` - ${desktopDeductionGb} GB Desktop` : ""}) &bull; {Math.round(telemetry.ratio * 100)}% Kapasitas
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

                    {/* ESTIMATOR THROUGHPUT: SPEED (IT/S) & WAKTU GENERATE */}
                    <div className="vram-throughput-card">
                        <div className="vram-throughput-header">
                            <div className="vram-throughput-title-wrap">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#3b82f6" }}>
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

                        {/* Big Speed Hero Metrics */}
                        <div className="vram-throughput-hero">
                            <div className="vram-hero-time-box">
                                <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
                                    <span className="vram-hero-time-val">
                                        ~{throughputTelemetry.totalDurationSec.toFixed(1)}s
                                    </span>
                                    {throughputTelemetry.totalDurationSec >= 60 && (
                                        <span style={{ fontSize: "14px", fontWeight: 700, color: "#38bdf8" }}>
                                            (~{Math.floor(throughputTelemetry.totalDurationSec / 60)}m {(throughputTelemetry.totalDurationSec % 60).toFixed(0)}s)
                                        </span>
                                    )}
                                </div>
                                <span className="vram-hero-time-label">
                                    Total Durasi per Gambar ({samplingSteps} steps &bull; {throughputTelemetry.secondsPerStep.toFixed(2)}s/step)
                                </span>
                            </div>
                            <div className="vram-hero-speed-box">
                                <span className="vram-hero-speed-val">
                                    {throughputTelemetry.itPerSec >= 1.0
                                        ? `${throughputTelemetry.itPerSec.toFixed(2)} it/s`
                                        : `${throughputTelemetry.secondsPerStep.toFixed(2)} s/it`}
                                </span>
                                <span className="vram-hero-speed-label">
                                    {throughputTelemetry.itPerSec >= 1.0
                                        ? `~${throughputTelemetry.secondsPerStep.toFixed(2)}s per step`
                                        : `~${throughputTelemetry.itPerSec.toFixed(2)} it/s`} ({activeGpu.name.split("/")[0].trim()})
                                </span>
                            </div>
                        </div>

                        {/* Timeline Latency Breakdown Stack */}
                        <div className="vram-timeline-wrap">
                            <div className="vram-timeline-track">
                                <div
                                    className="vram-timeline-segment te"
                                    style={{ width: `${(throughputTelemetry.textEncodeSec / throughputTelemetry.totalDurationSec) * 100}%` }}
                                    title={`Text Encoding: ${throughputTelemetry.textEncodeSec.toFixed(1)}s`}
                                />
                                <div
                                    className="vram-timeline-segment denoise"
                                    style={{ width: `${(throughputTelemetry.denoiseSec / throughputTelemetry.totalDurationSec) * 100}%` }}
                                    title={`Denoising: ${throughputTelemetry.denoiseSec.toFixed(1)}s`}
                                />
                                {enableHiresFix && (
                                    <div
                                        className="vram-timeline-segment hires"
                                        style={{ width: `${(throughputTelemetry.hiresSec / throughputTelemetry.totalDurationSec) * 100}%` }}
                                        title={`Hi-Res Pass 2: ${throughputTelemetry.hiresSec.toFixed(1)}s`}
                                    />
                                )}
                                {enableFaceDetailer && (
                                    <div
                                        className="vram-timeline-segment post"
                                        style={{ width: `${(throughputTelemetry.detailerSec / throughputTelemetry.totalDurationSec) * 100}%` }}
                                        title={`ADetailer Inpainting: ${throughputTelemetry.detailerSec.toFixed(1)}s`}
                                    />
                                )}
                                <div
                                    className="vram-timeline-segment vae"
                                    style={{ width: `${(throughputTelemetry.vaeDecodeSec / throughputTelemetry.totalDurationSec) * 100}%` }}
                                    title={`VAE Decode: ${throughputTelemetry.vaeDecodeSec.toFixed(1)}s`}
                                />
                            </div>

                            <div className="vram-timeline-legend">
                                <div className="vram-timeline-legend-item">
                                    <div className="vram-timeline-dot te" />
                                    <span>CLIP/T5: <strong>{throughputTelemetry.textEncodeSec.toFixed(1)}s</strong></span>
                                </div>
                                <div className="vram-timeline-legend-item">
                                    <div className="vram-timeline-dot denoise" />
                                    <span>Sampling: <strong>{throughputTelemetry.denoiseSec.toFixed(1)}s</strong></span>
                                </div>
                                {enableHiresFix && (
                                    <div className="vram-timeline-legend-item">
                                        <div className="vram-timeline-dot hires" />
                                        <span>Hi-Res: <strong>{throughputTelemetry.hiresSec.toFixed(1)}s</strong></span>
                                    </div>
                                )}
                                {enableFaceDetailer && (
                                    <div className="vram-timeline-legend-item">
                                        <div className="vram-timeline-dot post" />
                                        <span>Face: <strong>{throughputTelemetry.detailerSec.toFixed(1)}s</strong></span>
                                    </div>
                                )}
                                <div className="vram-timeline-legend-item">
                                    <div className="vram-timeline-dot vae" />
                                    <span>VAE: <strong>{throughputTelemetry.vaeDecodeSec.toFixed(1)}s</strong></span>
                                </div>
                            </div>
                        </div>

                        {/* Note & Alert */}
                        <div className={`vram-throughput-alert-box ${throughputTelemetry.speedClass}`}>
                            {throughputTelemetry.speedClass === "speed-critical" ? (
                                <>
                                    🛑 <strong>Peringatan Paging Disk-Thrashing:</strong> {throughputTelemetry.speedNote}
                                </>
                            ) : throughputTelemetry.speedClass === "speed-slow" ? (
                                <>
                                    🐢 <strong>Overhead CPU Offload:</strong> {throughputTelemetry.speedNote}
                                </>
                            ) : (
                                <>
                                    🚀 <strong>Efisiensi Tinggi:</strong> {throughputTelemetry.speedNote}
                                </>
                            )}
                        </div>
                    </div>

                    {/* ESTIMATOR KONSUMSI DAYA LISTRIK (TDP, KWH & BIAYA TOKEN PLN) */}
                    <div className="vram-power-card">
                        <div className="vram-power-header">
                            <div className="vram-power-title-wrap">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#10b981" }}>
                                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                                </svg>
                                <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span>Konsumsi Daya Sistem &amp; Biaya Listrik Token PLN</span>
                                        <span className={`vram-power-badge ${powerTelemetry.effClass}`}>
                                            {powerTelemetry.effBadge}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: "11px", color: "#a1a1aa", fontWeight: 400 }}>
                                        Kalkulasi menyeluruh: GPU, CPU Ryzen, Layar 16", Monitor Eksternal, Kipas Turbo &amp; Rugi Daya Adaptor Stopkontak
                                    </span>
                                </div>
                            </div>

                            {/* Billing Switcher (Token vs Pascabayar) */}
                            <div className="vram-power-tab-bar">
                                <button
                                    type="button"
                                    className={`vram-power-tab-btn ${billingType === "token" ? "active" : ""}`}
                                    onClick={() => setBillingType("token")}
                                >
                                    🪙 Token Listrik (Prabayar)
                                </button>
                                <button
                                    type="button"
                                    className={`vram-power-tab-btn ${billingType === "pascabayar" ? "active" : ""}`}
                                    onClick={() => setBillingType("pascabayar")}
                                >
                                    📋 Pascabayar Bulanan
                                </button>
                            </div>
                        </div>

                        {/* Quick Profiles for ASUS TUF A16 & Gaming Laptops */}
                        <div className="vram-tuf-profile-box">
                            <div className="vram-tuf-profile-label">
                                <span>⚡ Profil Cepat ASUS TUF Gaming A16 / Gaming Laptop:</span>
                                <span className="vram-tuf-badge">Armoury Crate / G-Helper Presets</span>
                            </div>
                            <div className="vram-tuf-btn-group">
                                <button
                                    type="button"
                                    className={`vram-tuf-btn ${tufProfile === "turbo" ? "active" : ""}`}
                                    onClick={() => handleApplyTufProfile("turbo")}
                                    title="TUF Turbo: GPU Boost 140W Max, CPU 50W, Kipas 100% 5000+ RPM, Layar 100%"
                                >
                                    🚀 Mode Turbo (Max 140W)
                                </button>
                                <button
                                    type="button"
                                    className={`vram-tuf-btn ${tufProfile === "perf" ? "active" : ""}`}
                                    onClick={() => handleApplyTufProfile("perf")}
                                    title="TUF Performance: GPU ~105W, CPU 35W, Kipas Balanced, Layar 50%"
                                >
                                    ⚖️ Mode Performance (Std)
                                </button>
                                <button
                                    type="button"
                                    className={`vram-tuf-btn ${tufProfile === "silent" ? "active" : ""}`}
                                    onClick={() => handleApplyTufProfile("silent")}
                                    title="TUF Silent/Eco: GPU ~65W, CPU 22W, Kipas Silent, Layar 50%"
                                >
                                    🍃 Mode Silent / Eco
                                </button>
                                <button
                                    type="button"
                                    className={`vram-tuf-btn ${tufProfile === "overnight" ? "active" : ""}`}
                                    onClick={() => handleApplyTufProfile("overnight")}
                                    title="Batch Render Semalaman: GPU Optimal, CPU 30W, Layar Laptop MATI (0W)"
                                >
                                    🌙 Render Semalaman (Layar Mati)
                                </button>
                            </div>
                        </div>

                        {/* Hero Stats */}
                        <div className="vram-power-hero">
                            {billingType === "token" ? (
                                <>
                                    <div className="vram-power-cost-box">
                                        <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                                            <span className="vram-power-cost-val">
                                                Rp {Math.round(powerTelemetry.batchTotalCostIdr).toLocaleString("id-ID")}
                                            </span>
                                            <span style={{ fontSize: "12px", color: "#6ee7b7", fontWeight: 700 }}>
                                                ({powerTelemetry.tokenPercentUsed.toFixed(2)}% dari Token Rp {tokenNominal.toLocaleString("id-ID")})
                                            </span>
                                        </div>
                                        <span className="vram-power-cost-label">
                                            Pemotongan Token untuk {batchImageCount} Gambar (@ Rp {powerTelemetry.costPerImageIdr >= 10 ? powerTelemetry.costPerImageIdr.toFixed(1) : powerTelemetry.costPerImageIdr.toFixed(2)}/img)
                                        </span>
                                    </div>

                                    <div className="vram-token-capacity-box">
                                        <span className="vram-token-capacity-title">Kapasitas 1 Token Rp {tokenNominal.toLocaleString("id-ID")}:</span>
                                        <span className="vram-token-capacity-val">
                                            ~{powerTelemetry.imagesPerFullToken.toLocaleString("id-ID")} Gambar
                                        </span>
                                        <span className="vram-token-capacity-sub">
                                            Total {powerTelemetry.totalTokenKwh.toFixed(1)} kWh kuota token PLN
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="vram-power-cost-box">
                                        <span className="vram-power-cost-val">
                                            Rp {Math.round(powerTelemetry.batchTotalCostIdr).toLocaleString("id-ID")}
                                        </span>
                                        <span className="vram-power-cost-label">
                                            Estimasi Biaya untuk {batchImageCount} Gambar (@ Rp {powerTelemetry.costPerImageIdr >= 10 ? powerTelemetry.costPerImageIdr.toFixed(1) : powerTelemetry.costPerImageIdr.toFixed(2)}/img)
                                        </span>
                                    </div>
                                    <div className="vram-power-metric-box">
                                        <span className="vram-power-metric-val">
                                            {powerTelemetry.batchTotalKwh < 0.01 ? (powerTelemetry.batchTotalKwh * 1000).toFixed(1) + " Wh" : powerTelemetry.batchTotalKwh.toFixed(3) + " kWh"}
                                        </span>
                                        <span className="vram-power-metric-label">
                                            Total Energi PC (~{powerTelemetry.totalPcWatts}W Wall Draw &bull; ~{(powerTelemetry.batchTotalHours * 60).toFixed(0)} menit)
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Token Consumption Meter Bar (when Token mode active) */}
                        {billingType === "token" && (
                            <div className="vram-token-progress-wrap">
                                <div className="vram-token-progress-top">
                                    <span>Porsi Pemakaian Token Listrik:</span>
                                    <span style={{ color: "#10b981", fontWeight: 700 }}>
                                        Sisa Token: Rp {Math.round(powerTelemetry.tokenRemainingRp).toLocaleString("id-ID")} (~{powerTelemetry.tokenRemainingKwh.toFixed(2)} kWh)
                                    </span>
                                </div>
                                <div className="vram-token-bar-track">
                                    <div
                                        className="vram-token-bar-fill"
                                        style={{ width: `${Math.min(100, Math.max(0.5, powerTelemetry.tokenPercentUsed))}%` }}
                                        title={`Terpakai: Rp ${Math.round(powerTelemetry.batchTotalCostIdr).toLocaleString("id-ID")} (${powerTelemetry.tokenPercentUsed.toFixed(2)}%)`}
                                    />
                                </div>
                            </div>
                        )}

                        {/* FULL SYSTEM HARDWARE BREAKDOWN CONTROLS (GPU, CPU, Screen, Ext Monitor, Fans, Charger) */}
                        <div className="vram-hardware-power-grid">
                            {/* 1. GPU dGPU Power */}
                            <div className="vram-power-ctrl-box">
                                <div className="vram-power-ctrl-label">
                                    <span>💻 GPU (TGP / dGPU):</span>
                                    <span style={{ color: powerTelemetry.isTgpThrottled ? "#f59e0b" : "#38bdf8", fontWeight: 700, fontFamily: "monospace" }}>
                                        {powerTelemetry.gpuWatts}W
                                    </span>
                                </div>
                                <div className="vram-power-chips">
                                    {[55, 80, 105, 120, 140].map((w) => (
                                        <button
                                            key={w}
                                            type="button"
                                            className={`vram-power-chip ${laptopTgpWatts === w ? "active" : ""}`}
                                            onClick={() => {
                                                setLaptopTgpWatts(w);
                                                setTufProfile("custom");
                                            }}
                                        >
                                            {w === 140 ? "140W (Max TUF)" : w === 105 ? "105W (Std)" : `${w}W`}
                                        </button>
                                    ))}
                                </div>
                                {activeGpu.isLaptop && (
                                    <input
                                        type="range"
                                        min={activeGpu.tgpMinWatts || 35}
                                        max={activeGpu.tgpMaxWatts || 140}
                                        step={5}
                                        className="vram-range-input"
                                        value={laptopTgpWatts}
                                        onChange={(e) => {
                                            setLaptopTgpWatts(parseInt(e.target.value) || 75);
                                            setTufProfile("custom");
                                        }}
                                        style={{ marginTop: "4px" }}
                                    />
                                )}
                            </div>

                            {/* 2. CPU AMD Ryzen / Intel */}
                            <div className="vram-power-ctrl-box">
                                <div className="vram-power-ctrl-label">
                                    <span>🧠 CPU (AMD Ryzen / Intel):</span>
                                    <span style={{ color: "#a78bfa", fontWeight: 700, fontFamily: "monospace" }}>
                                        {powerTelemetry.activeCpuWatts}W
                                    </span>
                                </div>
                                <div className="vram-power-chips">
                                    {[
                                        { label: "Eco (20W)", val: 20 },
                                        { label: "Standard (35W)", val: 35 },
                                        { label: "Turbo (50W)", val: 50 },
                                    ].map((c) => (
                                        <button
                                            key={c.val}
                                            type="button"
                                            className={`vram-power-chip ${cpuWatts === c.val ? "active" : ""}`}
                                            onClick={() => {
                                                setCpuWatts(c.val);
                                                setTufProfile("custom");
                                            }}
                                        >
                                            {c.label}
                                        </button>
                                    ))}
                                </div>
                                {teKey === "none" && (
                                    <span style={{ fontSize: "10px", color: "#f59e0b" }}>
                                        ⚠️ +15W beban CPU offloading Text Encoder
                                    </span>
                                )}
                            </div>

                            {/* 3. Layar Laptop (16" IPS TUF A16) */}
                            <div className="vram-power-ctrl-box">
                                <div className="vram-power-ctrl-label">
                                    <span>🖥️ Layar Laptop (16" IPS 165Hz):</span>
                                    <span style={{ color: screenMode === "off" ? "#10b981" : "#38bdf8", fontWeight: 700, fontFamily: "monospace" }}>
                                        {powerTelemetry.screenWatts}W
                                    </span>
                                </div>
                                <div className="vram-power-chips">
                                    {[
                                        { label: "Layar Mati (0W)", val: "off" as const },
                                        { label: "50% Brightness (9W)", val: "med" as const },
                                        { label: "100% Brightness (15W)", val: "high" as const },
                                    ].map((s) => (
                                        <button
                                            key={s.val}
                                            type="button"
                                            className={`vram-power-chip ${screenMode === s.val ? "active" : ""}`}
                                            onClick={() => {
                                                setScreenMode(s.val);
                                                setTufProfile("custom");
                                            }}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 4. Monitor Eksternal Tambahan */}
                            <div className="vram-power-ctrl-box">
                                <div className="vram-power-ctrl-label">
                                    <span>🔌 Monitor Eksternal Tambahan:</span>
                                    <span style={{ color: externalMonitorMode === "none" ? "#a1a1aa" : "#38bdf8", fontWeight: 700, fontFamily: "monospace" }}>
                                        {powerTelemetry.extMonitorWatts}W
                                    </span>
                                </div>
                                <div className="vram-power-chips">
                                    {[
                                        { label: "Tidak Ada (0W)", val: "none" as const },
                                        { label: "24-27\" FHD/2K (25W)", val: "fhd" as const },
                                        { label: "27-32\" 4K (42W)", val: "4k" as const },
                                    ].map((m) => (
                                        <button
                                            key={m.val}
                                            type="button"
                                            className={`vram-power-chip ${externalMonitorMode === m.val ? "active" : ""}`}
                                            onClick={() => setExternalMonitorMode(m.val)}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 5. Kipas Dual Arc-Flow & Komponen Sistem */}
                            <div className="vram-power-ctrl-box">
                                <div className="vram-power-ctrl-label">
                                    <span>🌪️ Kipas Turbo, DDR5 &amp; SSD NVMe:</span>
                                    <span style={{ color: "#38bdf8", fontWeight: 700, fontFamily: "monospace" }}>
                                        {powerTelemetry.systemInternalWatts}W
                                    </span>
                                </div>
                                <div className="vram-power-chips">
                                    {[
                                        { label: "Silent (8W)", val: "silent" as const },
                                        { label: "Balanced (14W)", val: "balanced" as const },
                                        { label: "Turbo Fan (20W)", val: "turbo" as const },
                                    ].map((f) => (
                                        <button
                                            key={f.val}
                                            type="button"
                                            className={`vram-power-chip ${coolingFanMode === f.val ? "active" : ""}`}
                                            onClick={() => {
                                                setCoolingFanMode(f.val);
                                                setTufProfile("custom");
                                            }}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 6. Efisiensi Adaptor Charger AC/DC Stopkontak PLN */}
                            <div className="vram-power-ctrl-box">
                                <div className="vram-power-ctrl-label">
                                    <span>🔌 Rugi Daya Adaptor 240W:</span>
                                    <span style={{ color: "#f59e0b", fontWeight: 700, fontFamily: "monospace" }}>
                                        +{powerTelemetry.chargerLossWatts}W AC Loss
                                    </span>
                                </div>
                                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#d4d4d8", cursor: "pointer", marginTop: "2px" }}>
                                    <input
                                        type="checkbox"
                                        checked={includeChargerLoss}
                                        onChange={(e) => setIncludeChargerLoss(e.target.checked)}
                                        style={{ accentColor: "#10b981", width: "14px", height: "14px" }}
                                    />
                                    <span>Hitung Efisiensi Charger AC/DC (~89% Wall Draw Stopkontak PLN)</span>
                                </label>
                            </div>
                        </div>

                        {/* Interactive Token & Batch Controls Grid */}
                        <div className="vram-power-controls-grid">
                            {/* Pilihan Nominal Token PLN (Saat mode token aktif) */}
                            {billingType === "token" && (
                                <div className="vram-power-ctrl-box">
                                    <div className="vram-power-ctrl-label">
                                        <span>Beli Nominal Token PLN:</span>
                                        <span style={{ color: "#10b981", fontWeight: 700, fontFamily: "monospace" }}>Rp {tokenNominal.toLocaleString("id-ID")}</span>
                                    </div>
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
                            )}

                            {/* Tarif Listrik PLN */}
                            <div className="vram-power-ctrl-box">
                                <div className="vram-power-ctrl-label">
                                    <span>Tarif Listrik PLN (per kWh):</span>
                                    <span style={{ color: "#10b981", fontWeight: 700, fontFamily: "monospace" }}>Rp {plnTarifPerKwh}</span>
                                </div>
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

                            {/* Target Batch Count */}
                            <div className="vram-power-ctrl-box">
                                <div className="vram-power-ctrl-label">
                                    <span>Target Jumlah Generate:</span>
                                    <span style={{ color: "#3b82f6", fontWeight: 700, fontFamily: "monospace" }}>{batchImageCount} Gambar</span>
                                </div>
                                <div className="vram-power-chips">
                                    {[1, 10, 50, 100, 500, 1000].map((count) => (
                                        <button
                                            key={count}
                                            type="button"
                                            className={`vram-power-chip ${batchImageCount === count ? "active" : ""}`}
                                            onClick={() => setBatchImageCount(count)}
                                        >
                                            {count === 1 ? "1 Img" : count === 100 ? "100 (Std)" : count === 500 ? "500 (Batch)" : `${count}`}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Laptop TGP Throttling Alert */}
                        {powerTelemetry.isTgpThrottled && (
                            <div className="vram-tgp-alert">
                                ⚠️ <strong>Peringatan Limit TGP Laptop:</strong> Daya GPU di-set pada {powerTelemetry.gpuWatts}W (jauh di bawah batas full-power {activeGpu.tgpMaxWatts}W). Clock speed Tensor Core terpotong hingga ~{powerTelemetry.tgpThrottlePercent}%, waktu generate melambat. Disarankan pilih mode <strong>Performance / Turbo</strong> di Armoury Crate atau G-Helper.
                            </div>
                        )}

                        {/* Power Breakdown Flow Table */}
                        <div className="vram-power-breakdown-row">
                            <span>GPU: <strong>{powerTelemetry.gpuWatts}W</strong></span>
                            <span>CPU: <strong>{powerTelemetry.activeCpuWatts}W</strong></span>
                            <span>Layar 16": <strong>{powerTelemetry.screenWatts}W</strong></span>
                            {powerTelemetry.extMonitorWatts > 0 && <span>Monitor Ext: <strong>{powerTelemetry.extMonitorWatts}W</strong></span>}
                            <span>Kipas/Sistem: <strong>{powerTelemetry.systemInternalWatts}W</strong></span>
                            <span>Total DC: <strong>{powerTelemetry.totalDcWatts}W</strong></span>
                            <span style={{ color: "#10b981", fontWeight: 700 }}>
                                Stopkontak PLN: <strong>~{powerTelemetry.totalPcWatts}W Wall Draw</strong>
                            </span>
                        </div>

                        {/* Key Insight Box tailored for Token & ASUS TUF A16 */}
                        <div className="vram-power-insight-box">
                            💡 <strong>Insight Token Listrik &amp; ASUS TUF A16:</strong> Total daya riil yang disedot laptop dari stopkontak Token PLN adalah <strong>~{powerTelemetry.totalPcWatts}W</strong> (Komponen DC {powerTelemetry.totalDcWatts}W + Rugi Konversi Adaptor {powerTelemetry.chargerLossWatts}W).
                            {billingType === "token" ? (
                                <>
                                    {" "}Untuk generate <strong>{batchImageCount} gambar</strong>, token PLN Anda hanya berkurang <strong>{powerTelemetry.batchTotalKwh.toFixed(3)} kWh</strong> atau setara <strong>Rp {Math.round(powerTelemetry.batchTotalCostIdr).toLocaleString("id-ID")}</strong> (hanya <strong>{powerTelemetry.tokenPercentUsed.toFixed(2)}%</strong> dari token Rp {tokenNominal.toLocaleString("id-ID")}).
                                    {" "}Dengan membeli 1 Token Rp {tokenNominal.toLocaleString("id-ID")}, laptop Anda dapat menghasilkan hingga <strong>~{powerTelemetry.imagesPerFullToken.toLocaleString("id-ID")} gambar</strong>!
                                </>
                            ) : (
                                <>
                                    {" "}Generate {batchImageCount} gambar {activeModel.name} memakan total {powerTelemetry.batchTotalKwh.toFixed(3)} kWh dengan perkiraan biaya listrik Rp {Math.round(powerTelemetry.batchTotalCostIdr).toLocaleString("id-ID")} (~Rp {powerTelemetry.costPerImageIdr.toFixed(2)}/gambar).
                                </>
                            )}
                            {screenMode === "off" && " Mematikan layar laptop saat render semalaman berhasil menghemat daya ~15W terus-menerus!"}
                        </div>
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
                                ⚠️ <strong>Peringatan Lonjakan Pass 2:</strong> Pass 1 muat di GPU, namun Pass 2 (Hi-Res Fix) melebihi VRAM {effectiveAiVram.toFixed(1)} GB Efektif GPU Anda{desktopDeductionGb > 0 ? ` (${targetGpuVram} GB fisik - ${desktopDeductionGb} GB desktop)` : ""}! Ganti metode upscaling ke <strong>Ultimate SD Upscale</strong> atau aktifkan <strong>Tiled VAE</strong> untuk mencegah crash OOM.
                            </div>
                        )}
                    </div>

                    {/* TARGET GPU SELECTOR */}
                    <div className="vram-gpu-box">
                        <div className="vram-gpu-title-row">
                            <span>Komparasi GPU Anda:</span>
                            <span style={{ color: "#3b82f6" }}>
                                {targetGpuVram} GB Fisik {desktopDeductionGb > 0 ? `(~${effectiveAiVram.toFixed(1)} GB Efektif AI)` : ""}
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
                                <span style={{ fontWeight: 700, fontFamily: "monospace", width: "50px" }}>
                                    {customGpuVram} GB
                                </span>
                            </div>
                        )}

                        {/* Windows Desktop & Multi-Monitor VRAM Deduction */}
                        <div className="vram-display-deduct-box">
                            <div className="vram-display-deduct-top">
                                <span>🖥️ Alokasi Display & OS Desktop:</span>
                                <span style={{ color: desktopDeductionGb > 0 ? "#f59e0b" : "#10b981", fontFamily: "monospace", fontWeight: 700 }}>
                                    {desktopDeductionGb > 0 ? `-${desktopDeductionGb} GB Desktop` : "0 GB (100% AI)"}
                                </span>
                            </div>

                            <div className="vram-display-chips-row">
                                <button
                                    type="button"
                                    className={`vram-display-mode-chip ${displayDeductionMode === "primary_single" ? "active" : ""}`}
                                    onClick={() => setDisplayDeductionMode("primary_single")}
                                >
                                    <span className="vram-display-mode-title">🖥️ GPU Utama (1 Layar)</span>
                                    <span className="vram-display-mode-sub">Potong ~0.8 GB (DWM & Browser)</span>
                                </button>
                                <button
                                    type="button"
                                    className={`vram-display-mode-chip ${displayDeductionMode === "primary_multi" ? "active" : ""}`}
                                    onClick={() => setDisplayDeductionMode("primary_multi")}
                                >
                                    <span className="vram-display-mode-title">🖥️🖥️ Multi-Display / 4K</span>
                                    <span className="vram-display-mode-sub">Potong ~1.4 GB (Dual Mon/4K)</span>
                                </button>
                                <button
                                    type="button"
                                    className={`vram-display-mode-chip ${displayDeductionMode === "headless" ? "active" : ""}`}
                                    onClick={() => setDisplayDeductionMode("headless")}
                                >
                                    <span className="vram-display-mode-title">⚡ Headless / Secondary</span>
                                    <span className="vram-display-mode-sub">Bebas Display (100% AI VRAM)</span>
                                </button>
                            </div>

                            <div className="vram-display-deduct-alert">
                                {displayDeductionMode === "primary_single" ? (
                                    <>
                                        ℹ️ <strong>GPU Utama (1 Layar):</strong> Windows DWM (Desktop Window Manager), Browser Chrome/Edge Hardware Acceleration, dan Discord memakan ~800 MB VRAM. VRAM Bersih untuk AI: <strong>{effectiveAiVram.toFixed(1)} GB</strong> (dari {targetGpuVram} GB fisik).
                                    </>
                                ) : displayDeductionMode === "primary_multi" ? (
                                    <>
                                        ℹ️ <strong>Multi-Monitor / 4K:</strong> Framebuffer ganda resolusi tinggi & streaming browser memotong ~1.4 GB VRAM. VRAM Bersih untuk AI: <strong>{effectiveAiVram.toFixed(1)} GB</strong> (dari {targetGpuVram} GB fisik).
                                    </>
                                ) : (
                                    <>
                                        ✨ <strong>Headless / Secondary GPU:</strong> GPU komputasi murni tanpa monitor terpasang. <strong>100% ({targetGpuVram} GB)</strong> VRAM fisik dialokasikan penuh untuk PyTorch / ComfyUI / WebUI.
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 1-CLICK WEBUI-USER.BAT & COMFYUI COMMAND GENERATOR */}
                    <div className="vram-flags-card">
                        <div className="vram-flags-header">
                            <div className="vram-throughput-title-wrap">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#10b981" }}>
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                <span className="vram-flags-title">1-Click Launch Config &amp; Generator</span>
                            </div>

                            <div className="vram-gen-header-actions">
                                <button
                                    type="button"
                                    className="vram-btn-download-bat"
                                    onClick={handleDownloadBat}
                                    title="Unduh file batch siap pakai untuk folder WebUI"
                                >
                                    💾 Unduh webui-user.bat
                                </button>
                                <button
                                    type="button"
                                    className="vram-btn-copy-comfy"
                                    onClick={handleCopyComfy}
                                    title="Salin argument start ComfyUI (python main.py ...)"
                                >
                                    {copiedComfy ? "Tersalin!" : "📋 Salin ComfyUI"}
                                </button>
                                <button
                                    type="button"
                                    className="vram-flags-copy-btn"
                                    onClick={handleCopyFlags}
                                    title="Salin string COMMANDLINE_ARGS saja"
                                >
                                    {copiedFlags ? "Tersalin!" : "📋 Salin Args"}
                                </button>
                            </div>
                        </div>

                        {/* Preview Tabs */}
                        <div className="vram-gen-tab-bar">
                            <button
                                type="button"
                                className={`vram-gen-tab-btn ${genPreviewTab === "bat" ? "active" : ""}`}
                                onClick={() => setGenPreviewTab("bat")}
                            >
                                webui-user.bat (A1111/Forge)
                            </button>
                            <button
                                type="button"
                                className={`vram-gen-tab-btn ${genPreviewTab === "comfy" ? "active" : ""}`}
                                onClick={() => setGenPreviewTab("comfy")}
                            >
                                ComfyUI Command
                            </button>
                            <button
                                type="button"
                                className={`vram-gen-tab-btn ${genPreviewTab === "webui" ? "active" : ""}`}
                                onClick={() => setGenPreviewTab("webui")}
                            >
                                COMMANDLINE_ARGS
                            </button>
                        </div>

                        {/* Dynamic Code Preview Block */}
                        <div className="vram-flags-code">
                            {genPreviewTab === "bat" ? (
                                webuiBatContent
                            ) : genPreviewTab === "comfy" ? (
                                comfyUiCommand
                            ) : (
                                `COMMANDLINE_ARGS=${recommendedCliFlags}`
                            )}
                        </div>

                        <ul className="vram-tips-list">
                            <li>
                                <strong>WebUI (.bat) Panduan:</strong> Tempatkan file <code>webui-user.bat</code> hasil unduhan langsung ke dalam direktori instalasi Automatic1111 atau SD.Next Anda untuk menggantikan file lama.
                            </li>
                            <li>
                                <strong>ComfyUI Argument:</strong> Jalankan command terminal <code>{comfyUiCommand}</code> di direktori ComfyUI Anda. Flag memori otomatis disesuaikan dengan VRAM bersih GPU ({effectiveAiVram.toFixed(1)} GB).
                            </li>
                            <li>
                                <strong>Shared Memory Throttling:</strong> Flag <code>--pin-shared-memory</code> mencegah driver NVIDIA Windows memindahkan tensor secara lambat ke RAM sistem saat mendekati ambang batas VRAM.
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
