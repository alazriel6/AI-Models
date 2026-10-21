import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { WorkflowBridgeBanner } from "../common/WorkflowBridgeBanner";
import {
  type WorkflowBridgeData,
  bridgeToPromptLab,
  bridgeToCalculator,
} from "../../utils/workflowBridge";
import "../../style/SamplerGuide.css";

// ============================================================================
// Types & Interfaces
// ============================================================================

export type SamplerCategory = "deterministic" | "stochastic" | "flow_matching" | "accelerated";
export type Architecture = "SD 1.5" | "SDXL" | "Pony" | "Illustrious" | "Flux";

export interface SamplerItem {
  id: string;
  name: string;
  codeName: string;
  category: SamplerCategory;
  order: 1 | 2 | 3;
  nfePerStep: 1 | 2;
  speedRating: number; // 1-5
  detailRating: number; // 1-5
  minSteps: number;
  optimalSteps: string;
  optimalCfg: string;
  convergence: "Konvergen (Gambar Mengunci)" | "Non-Konvergen (Stokastik/Kreatif)" | "Direct Flow";
  architectures: Architecture[];
  summary: string;
  mechanism: string;
  pros: string[];
  cons: string[];
  bestUseCases: string[];
  recommendedSchedulers: string[];
  comfyName: string;
  webuiName: string;
}

export interface SchedulerItem {
  id: string;
  name: string;
  formula: string;
  category: string;
  color: string;
  description: string;
  focusPhase: "Noise Rendah (Detail Mikro)" | "Noise Tinggi (Struktur Global)" | "Linier / Seragam" | "Machine-Learned Optimal";
  bestFor: string;
  comfyName: string;
  webuiName: string;
}

export interface RecipeItem {
  id: string;
  title: string;
  badge: string;
  architecture: Architecture;
  samplerId: string;
  schedulerId: string;
  samplerName: string;
  schedulerName: string;
  steps: number;
  cfg: number;
  speed: string;
  useCase: string;
  whyItWorks: string;
}

// ============================================================================
// Technical Datasets (100% Comprehensive AI Knowledge Base)
// ============================================================================

export const SAMPLER_DIRECTORY: SamplerItem[] = [
  {
    id: "dpmpp_2m",
    name: "DPM++ 2M",
    codeName: "dpmpp_2m",
    category: "deterministic",
    order: 2,
    nfePerStep: 1,
    speedRating: 5,
    detailRating: 5,
    minSteps: 18,
    optimalSteps: "20 - 28",
    optimalCfg: "5.0 - 7.0",
    convergence: "Konvergen (Gambar Mengunci)",
    architectures: ["SDXL", "Pony", "Illustrious", "SD 1.5"],
    summary: "Solver Runge-Kutta orde-2 multi-step yang efisien; umum dijadikan titik awal untuk model SDXL, anime, dan ilustrasi.",
    mechanism: "Menggunakan metode integrasi numerik 2nd Order Multi-step yang memanfaatkan riwayat gradient dari step sebelumnya sehingga tidak memerlukan evaluasi fungsi ganda (1 NFE per step).",
    pros: [
      "Efisien dalam komputasi (1 NFE per step)",
      "Deterministik (menghasilkan gambar identik pada seed dan step yang sama)",
      "Banyak digunakan bersama scheduler Karras pada model difusi",
    ],
    cons: [
      "Dapat tampak over-smoothed pada detail mikro tertentu jika step terlalu rendah atau model kurang variasi noise",
      "Memerlukan riwayat step sebelumnya; kurang optimal jika total step terlalu sedikit (<15)",
    ],
    bestUseCases: ["Model finetune anime (Illustrious, Pony)", "SDXL umum", "Workflow batch rendering"],
    recommendedSchedulers: ["Karras", "SGM Uniform", "Exponential"],
    comfyName: "dpmpp_2m",
    webuiName: "DPM++ 2M",
  },
  {
    id: "dpmpp_2m_sde",
    name: "DPM++ 2M SDE",
    codeName: "dpmpp_2m_sde",
    category: "stochastic",
    order: 2,
    nfePerStep: 1,
    speedRating: 4,
    detailRating: 5,
    minSteps: 24,
    optimalSteps: "28 - 35",
    optimalCfg: "4.5 - 6.5",
    convergence: "Non-Konvergen (Stokastik/Kreatif)",
    architectures: ["SDXL", "Pony", "Illustrious", "SD 1.5"],
    summary: "Varian SDE (Stochastic Differential Equation) dengan penambahan noise Brownian terkontrol di setiap iterasi.",
    mechanism: "Menyuntikkan noise stokastik terukur di setiap iterasi orde-2. Karakteristik ini mempertahankan variasi noise frekuensi tinggi hingga step akhir, memengaruhi tekstur permukaan tergantung model.",
    pros: [
      "Membantu mempertahankan variasi tekstur frekuensi tinggi pada model fotorealistik atau potret",
      "Toleran terhadap variasi pencahayaan pada CFG moderat",
      "Transisi gradasi bayangan yang halus pada konfigurasi step mencukupi",
    ],
    cons: [
      "Non-konvergen: mengubah jumlah step dapat mengubah komposisi gambar meski seed tetap",
      "Komputasi per step membutuhkan kalkulasi drift dan diffusion tambahan",
    ],
    bestUseCases: ["Eksperimen tekstur fotorealistik", "Potret dengan pencahayaan terarah", "Gaya seni semi-realistis"],
    recommendedSchedulers: ["Karras", "Exponential"],
    comfyName: "dpmpp_2m_sde",
    webuiName: "DPM++ 2M SDE",
  },
  {
    id: "euler",
    name: "Euler",
    codeName: "euler",
    category: "deterministic",
    order: 1,
    nfePerStep: 1,
    speedRating: 5,
    detailRating: 4,
    minSteps: 18,
    optimalSteps: "20 - 30",
    optimalCfg: "5.0 - 7.5",
    convergence: "Konvergen (Gambar Mengunci)",
    architectures: ["SDXL", "SD 1.5", "Flux"],
    summary: "Solver linear ODE orde-1 paling mendasar, deterministik, dan menjadi baseline evaluasi stabilitas model.",
    mechanism: "Menghitung gradien vektor langsung pada titik latents saat ini ($x_{t-1} = x_t - \\sigma \\cdot \\nabla$). Sederhana, 1 NFE per step, dan tidak memerlukan memori riwayat langkah.",
    pros: [
      "Beban komputasi per step ringan (1 NFE per step)",
      "Sifat deterministik tinggi dan mudah direproduksi",
      "Baseline standar pada evaluasi model dan arsitektur Flow Matching (FLUX)",
    ],
    cons: [
      "Akurasi integrasi numerik orde-1 lebih rendah dibanding solver orde-2 pada step rendah",
      "Pada model difusi standar (non-distilled), step rendah dapat menyisakan artefak noise jika scheduler tidak sesuai",
    ],
    bestUseCases: ["Pengujian model baru", "Desain karakter bersih", "FLUX.1 inference baseline"],
    recommendedSchedulers: ["Normal", "SGM Uniform", "Simple"],
    comfyName: "euler",
    webuiName: "Euler",
  },
  {
    id: "euler_a",
    name: "Euler A (Ancestral)",
    codeName: "euler_ancestral",
    category: "stochastic",
    order: 1,
    nfePerStep: 1,
    speedRating: 5,
    detailRating: 4,
    minSteps: 20,
    optimalSteps: "24 - 35",
    optimalCfg: "5.5 - 7.0",
    convergence: "Non-Konvergen (Stokastik/Kreatif)",
    architectures: ["SD 1.5", "SDXL", "Pony"],
    summary: "Solver Euler dengan komponen ancestral (stokastik) yang menyuntikkan noise acak di setiap iterasi.",
    mechanism: "Mengurangi noise sebagian lalu menyuntikkan kembali noise acak gaussian berskala sigma ancestral (\\sigma_{up}). Mencegah lintasan terperangkap pada titik lokal tertentu.",
    pros: [
      "Menghasilkan variasi komposisi dan ekspresi yang dinamis antar konfigurasi step",
      "Banyak dieksplorasi komunitas anime untuk visual bergaya ilustrasi atau lukisan",
      "Eksekusi cepat (1 NFE per step)",
    ],
    cons: [
      "Tidak konvergen (step 20 dan step 50 menghasilkan komposisi berbeda)",
      "Kurang dapat diprediksi untuk inpainting yang memerlukan kesinambungan ketat",
    ],
    bestUseCases: ["Ilustrasi Anime Tradisional/Digital", "Konsep Seni Fantasi", "Eksplorasi Pose Dinamis"],
    recommendedSchedulers: ["Normal", "SGM Uniform"],
    comfyName: "euler_ancestral",
    webuiName: "Euler a",
  },
  {
    id: "dpmpp_3m_sde",
    name: "DPM++ 3M SDE",
    codeName: "dpmpp_3m_sde",
    category: "stochastic",
    order: 3,
    nfePerStep: 2,
    speedRating: 3,
    detailRating: 5,
    minSteps: 26,
    optimalSteps: "30 - 45",
    optimalCfg: "4.0 - 6.0",
    convergence: "Non-Konvergen (Stokastik/Kreatif)",
    architectures: ["SDXL", "Pony", "Illustrious"],
    summary: "Solver SDE multi-step orde-3 untuk estimasi trayektori numerik dengan presisi orde lebih tinggi.",
    mechanism: "Mengevaluasi tiga titik sampel gradien secara berurutan dengan penyeimbang Brownian noise. Memerlukan buffer riwayat langkah yang lebih panjang.",
    pros: [
      "Akurasi integrasi tinggi pada resolusi besar",
      "Membantu transisi gradasi halus pada latar belakang atau area kontras rendah",
      "Mereduksi artefak diskontinuitas numerik",
    ],
    cons: [
      "Memerlukan step yang cukup agar riwayat gradien stabil",
      "Waktu komputasi lebih lama dibanding varian orde-2",
    ],
    bestUseCases: ["Render Resolusi Tinggi", "Lanskap Kompleks", "Detailed Anime Scenery"],
    recommendedSchedulers: ["Karras", "Exponential"],
    comfyName: "dpmpp_3m_sde",
    webuiName: "DPM++ 3M SDE",
  },
  {
    id: "dpmpp_2s_a",
    name: "DPM++ 2S A",
    codeName: "dpmpp_2s_ancestral",
    category: "stochastic",
    order: 2,
    nfePerStep: 2,
    speedRating: 3,
    detailRating: 4,
    minSteps: 24,
    optimalSteps: "28 - 40",
    optimalCfg: "5.0 - 6.5",
    convergence: "Non-Konvergen (Stokastik/Kreatif)",
    architectures: ["SDXL", "SD 1.5"],
    summary: "Solver 2nd-order single-step ancestral dengan 2 evaluasi fungsi per langkah sampling.",
    mechanism: "Melakukan dua evaluasi fungsi per langkah sampling (2 NFE) ditambah injeksi stochastic ancestral.",
    pros: [
      "Variasi komposisi dinamis untuk eksplorasi konsep",
      "Menghasilkan variasi siluet dan pencahayaan alternatif",
    ],
    cons: [
      "Memerlukan 2 NFE per step (waktu kalkulasi mendekati dua kali lipat dibanding solver 1 NFE)",
      "Non-konvergen",
    ],
    bestUseCases: ["Eksplorasi Konsep Seni", "Surreal Art"],
    recommendedSchedulers: ["Karras", "Normal"],
    comfyName: "dpmpp_2s_ancestral",
    webuiName: "DPM++ 2S a",
  },
  {
    id: "ddim",
    name: "DDIM",
    codeName: "ddim",
    category: "deterministic",
    order: 1,
    nfePerStep: 1,
    speedRating: 4,
    detailRating: 4,
    minSteps: 25,
    optimalSteps: "30 - 50",
    optimalCfg: "6.0 - 8.0",
    convergence: "Konvergen (Gambar Mengunci)",
    architectures: ["SD 1.5", "SDXL"],
    summary: "Denoising Diffusion Implicit Models, formulasi deterministik non-Markovian awal dalam literatur difusi.",
    mechanism: "Memformulasikan proses difusi tanpa penambahan noise acak forward Markov, memungkinkan pemetaan latents yang deterministik dan matematis dapat dibalik (DDIM inversion).",
    pros: [
      "Deterministik murni dan stabil untuk rekonstruksi latents",
      "Mendukung teknik DDIM Inversion, interpolasi latents, dan inpainting tertentu",
      "Konsistensi frame deterministik pada animasi terarah",
    ],
    cons: [
      "Memerlukan step relatif lebih banyak (umumnya ≥30) untuk mencapai konvergensi setara solver orde-2",
      "Dapat kurang terdefinisi jika step terlalu rendah (<20)",
    ],
    bestUseCases: ["ControlNet Presisi", "Inpainting Deterministic", "Video Animation Frame Consistency"],
    recommendedSchedulers: ["Normal", "Uniform"],
    comfyName: "ddim",
    webuiName: "DDIM",
  },
  {
    id: "uni_pc",
    name: "UniPC",
    codeName: "uni_pc",
    category: "deterministic",
    order: 2,
    nfePerStep: 1,
    speedRating: 5,
    detailRating: 4,
    minSteps: 12,
    optimalSteps: "14 - 20",
    optimalCfg: "5.5 - 7.0",
    convergence: "Konvergen (Gambar Mengunci)",
    architectures: ["SD 1.5", "SDXL"],
    summary: "Unified Predictor-Corrector framework untuk akselerasi penyelesaian ODE pada difusi.",
    mechanism: "Memadukan predictor korektor polinomial adaptif untuk menyelesaikan kurva difusi dengan evaluasi fungsi yang efisien.",
    pros: [
      "Mencapai struktur gambar utuh pada step relatif rendah (14-20 step pada SD 1.5/SDXL)",
      "Efisien (1 NFE per step pada mode dasar)",
      "Hemat waktu untuk iterasi prompt",
    ],
    cons: [
      "Karakteristik detail mikro bergantung pada checkpoint; penambahan step di atas 25 umumnya tidak memberikan perubahan signifikan",
      "Kurang fleksibel untuk fine-tuning mikro pada beberapa arsitektur",
    ],
    bestUseCases: ["Draft Cepat", "Iterasi Prompt Real-time", "Pengujian Komposisi Awal"],
    recommendedSchedulers: ["Normal", "Karras"],
    comfyName: "uni_pc",
    webuiName: "UniPC",
  },
  {
    id: "heun",
    name: "Heun / Heun++",
    codeName: "heun",
    category: "deterministic",
    order: 2,
    nfePerStep: 2,
    speedRating: 2,
    detailRating: 4,
    minSteps: 15,
    optimalSteps: "20 - 30",
    optimalCfg: "6.0 - 7.5",
    convergence: "Konvergen (Gambar Mengunci)",
    architectures: ["SD 1.5", "SDXL"],
    summary: "Metode Runge-Kutta 2nd Order klasik dengan dua evaluasi fungsi per langkah sampling.",
    mechanism: "Menghitung slope awal, mengambil tentative step, lalu menghitung slope akhir untuk merata-ratakan lintasan denoise (2 NFE per step).",
    pros: [
      "Presisi numerik tinggi per step",
      "Deterministik murni dan stabil",
    ],
    cons: [
      "Membutuhkan 2 NFE per step (waktu inferensi dua kali lipat dibanding Euler/DPM++ 2M pada step yang sama)",
      "Umumnya kalah efisien dibanding solver multi-step (DPM++ 2M)",
    ],
    bestUseCases: ["Validasi Matematis Model", "Pengujian Numerik Presisi"],
    recommendedSchedulers: ["Normal", "Karras"],
    comfyName: "heun",
    webuiName: "Heun",
  },
  {
    id: "flow_match_euler",
    name: "FlowMatchEuler (FLUX)",
    codeName: "flow_match_euler",
    category: "flow_matching",
    order: 1,
    nfePerStep: 1,
    speedRating: 5,
    detailRating: 5,
    minSteps: 4,
    optimalSteps: "4 (Schnell) / 24 (Dev)",
    optimalCfg: "1.0 - 3.5",
    convergence: "Direct Flow",
    architectures: ["Flux"],
    summary: "Solver Euler pada continuous rectified flow matching untuk arsitektur seperti FLUX.1 dan SD3.",
    mechanism: "Mengikuti medan kecepatan lurus (straight velocity field vector) antara distribusi Gaussian murni ke data manifold gambar. Berbeda dari score-based diffusion konvensional.",
    pros: [
      "Sesuai dengan formulasi matematis model Rectified Flow (FLUX.1)",
      "Pada varian distilled (FLUX.1 [schnell]), dapat bekerja pada 4 step",
      "Kesesuaian prompt dan struktur visual didukung oleh arsitektur model",
    ],
    cons: [
      "Hanya bekerja pada model arsitektur Flow Matching (FLUX.1 / SD3)",
      "Pengaturan guidance menggunakan node guidance khusus, bukan CFG konvensional",
    ],
    bestUseCases: ["FLUX.1 Schnell / Dev Inference", "Rendering Teks Akurat", "Fotografi & Desain Karakter"],
    recommendedSchedulers: ["Normal", "Simple", "Beta"],
    comfyName: "euler",
    webuiName: "Euler (FLUX)",
  },
  {
    id: "lcm",
    name: "LCM (Consistency)",
    codeName: "lcm",
    category: "accelerated",
    order: 1,
    nfePerStep: 1,
    speedRating: 5,
    detailRating: 3,
    minSteps: 4,
    optimalSteps: "4 - 8",
    optimalCfg: "1.2 - 2.0",
    convergence: "Konvergen (Gambar Mengunci)",
    architectures: ["SDXL", "SD 1.5"],
    summary: "Latent Consistency Models untuk inferensi cepat pada checkpoint yang telah di-distill.",
    mechanism: "Memetakan sembarang titik noise langsung ke trayektori manifold solusi menggunakan properti konsistensi.",
    pros: [
      "Inferensi sangat cepat (4-8 step) pada model atau LoRA yang dilatih khusus dengan LCM distillation",
      "Bermanfaat untuk aplikasi interaktif atau real-time",
    ],
    cons: [
      "CFG harus dijaga sangat rendah (1.2 - 2.0) untuk menghindari artefak numerik",
      "Kerapatan detail mikro lebih terbatas dibanding full diffusion",
    ],
    bestUseCases: ["Aplikasi Real-time / Live Canvas", "Rapid Mockup"],
    recommendedSchedulers: ["SGM Uniform", "Simple"],
    comfyName: "lcm",
    webuiName: "LCM",
  },
];

export const SCHEDULER_DIRECTORY: SchedulerItem[] = [
  {
    id: "karras",
    name: "Karras",
    formula: "σ_i = (σ_max^(1/7) + (i / (N-1)) * (σ_min^(1/7) - σ_max^(1/7)))^7",
    category: "fine_detail",
    color: "#3b82f6", // Solid Blue
    description: "Scheduler non-linear yang memadatkan langkah iterasi pada zona noise rendah (σ < 1.0).",
    focusPhase: "Noise Rendah (Detail Mikro)",
    bestFor: "DPM++ 2M, DPM++ 2M SDE, DPM++ 3M SDE. Alokasi step yang lebih rapat pada noise rendah berpengaruh pada pembentukan detail halus.",
    comfyName: "karras",
    webuiName: "Karras",
  },
  {
    id: "sgm_uniform",
    name: "SGM Uniform",
    formula: "t_i = 1000 * (1 - i / (N - 1)) mapped to discrete σ schedule",
    category: "uniform",
    color: "#10b981", // Solid Emerald
    description: "Jadwal resmi dari Stability AI untuk SDXL dan ComfyUI dengan pembagian langkah seragam di ruang diskrit.",
    focusPhase: "Linier / Seragam",
    bestFor: "SDXL baseline ComfyUI, Euler, Euler A, Turbo. Menjaga distribusi timesteps merata di setiap tahap.",
    comfyName: "sgm_uniform",
    webuiName: "SGM Uniform",
  },
  {
    id: "exponential",
    name: "Exponential",
    formula: "σ_i = σ_max * (σ_min / σ_max)^(i / (N - 1))",
    category: "fast_structural",
    color: "#f59e0b", // Solid Amber
    description: "Peluruhan eksponensial di awal langkah, menggeser transisi ke nilai noise lebih rendah lebih cepat.",
    focusPhase: "Noise Tinggi (Struktur Global)",
    bestFor: "Eksperimen kontras dan transisi cepat dari noise tinggi ke sedang.",
    comfyName: "exponential",
    webuiName: "Exponential",
  },
  {
    id: "align_your_steps",
    name: "AlignYourSteps (AYS)",
    color: "#06b6d4", // Solid Cyan
    formula: "Learned machine-optimized noise allocation (Nvidia Research 2024)",
    category: "machine_learned",
    description: "Jadwal alokasi langkah berbasis optimasi empiris (Nvidia Research, 2024) untuk mengurangi langkah evaluasi pada mid-noise.",
    focusPhase: "Machine-Learned Optimal",
    bestFor: "SDXL dan SVD (Stable Video Diffusion) berdasarkan pengujian efisiensi langkah dalam paper Nvidia.",
    comfyName: "ays",
    webuiName: "AYS SDXL",
  },
  {
    id: "normal",
    name: "Normal / Uniform",
    formula: "σ_i = σ_max - (i / (N - 1)) * (σ_max - σ_min)",
    category: "uniform",
    color: "#a1a1aa", // Solid Slate
    description: "Interpolasi linier langsung dari noise maksimum ke minimum tanpa pembobotan non-linear.",
    focusPhase: "Linier / Seragam",
    bestFor: "SD 1.5 baseline, DDIM Inpainting, model lama, dan pengujian deterministik linier.",
    comfyName: "normal",
    webuiName: "Automatic / Normal",
  },
  {
    id: "beta",
    name: "Beta",
    formula: "Smooth sigmoid transition based on Beta distribution curve",
    category: "fine_detail",
    color: "#e11d48", // Solid Rose/Red
    description: "Kurva transisi lengkung halus berbasis distribusi Beta untuk transisi frekuensi spasial kontinu.",
    focusPhase: "Noise Rendah (Detail Mikro)",
    bestFor: "Model FLUX.1 Dev dan pengujian eksperimental variasi noise frekuensi menengah-rendah.",
    comfyName: "beta",
    webuiName: "Beta",
  },
];

export const CURATED_RECIPES: RecipeItem[] = [
  {
    id: "anime_masterpiece",
    title: "Anime Finetune (Illustrious / Pony)",
    badge: "Titik Awal Anime",
    architecture: "Pony",
    samplerId: "dpmpp_2m",
    schedulerId: "karras",
    samplerName: "DPM++ 2M",
    schedulerName: "Karras",
    steps: 26,
    cfg: 6.0,
    speed: "Efisien (1 NFE/step)",
    useCase: "Illustrious-XL, NoobAI, Pony Diffusion V6",
    whyItWorks: "DPM++ 2M (orde-2 multi-step) konvergen dan stabil pada kontur garis lineart. Kurva Karras memusatkan evaluasi pada fase noise rendah (sigma < 1.0) untuk detail mata dan rambut.",
  },
  {
    id: "ultra_realism",
    title: "SDXL Fotorealistik & Potret",
    badge: "Variasi Tekstur",
    architecture: "SDXL",
    samplerId: "dpmpp_2m_sde",
    schedulerId: "karras",
    samplerName: "DPM++ 2M SDE",
    schedulerName: "Karras",
    steps: 32,
    cfg: 5.0,
    speed: "Stokastik SDE",
    useCase: "RealVisXL, Juggernaut XL, ZavyChroma",
    whyItWorks: "Komponen stokastik Brownian noise pada varian SDE mempertahankan variasi noise frekuensi tinggi hingga langkah akhir, yang dapat membantu variasi tekstur mikro pada checkpoint fotorealistik.",
  },
  {
    id: "flux_clean",
    title: "FLUX.1 Schnell Baseline",
    badge: "Distilled Flow",
    architecture: "Flux",
    samplerId: "flow_match_euler",
    schedulerId: "normal",
    samplerName: "FlowMatchEuler",
    schedulerName: "Simple / Normal",
    steps: 4,
    cfg: 1.0,
    speed: "4 Langkah Distilled",
    useCase: "FLUX.1 [schnell] 4-step model card",
    whyItWorks: "Arsitektur continuous rectified flow matching bergerak dalam garis medan kecepatan linier. Varian Schnell telah di-distill untuk inferensi 4 langkah dengan guidance scale rendah (1.0).",
  },
  {
    id: "artistic_watercolor",
    title: "Eksplorasi Variasi (Euler A)",
    badge: "Stokastik / Variasi",
    architecture: "SDXL",
    samplerId: "euler_a",
    schedulerId: "sgm_uniform",
    samplerName: "Euler A",
    schedulerName: "SGM Uniform",
    steps: 28,
    cfg: 5.5,
    speed: "Efisien (1 NFE/step)",
    useCase: "ComfyUI Anime, Fantasy Concept Art, Scenic Painting",
    whyItWorks: "Euler Ancestral menyuntikkan noise di setiap langkah sehingga menghasilkan variasi pose dan siluet yang dinamis antar eksperimen. SGM Uniform menjaga pembagian timesteps merata di ComfyUI.",
  },
  {
    id: "inpainting_perfection",
    title: "Inpainting & Rekonstruksi Latents",
    badge: "Deterministik Murni",
    architecture: "SD 1.5",
    samplerId: "ddim",
    schedulerId: "normal",
    samplerName: "DDIM",
    schedulerName: "Normal",
    steps: 35,
    cfg: 7.0,
    speed: "Standar (1 NFE/step)",
    useCase: "ControlNet Inpaint, Latent Reversal / Inversion",
    whyItWorks: "DDIM sepenuhnya deterministik dan dapat dibalik secara matematis (DDIM Inversion), menjaga stabilitas nilai latents di luar area mask inpainting.",
  },
  {
    id: "speed_demon_turbo",
    title: "SDXL Lightning / Turbo",
    badge: "Distilled Model",
    architecture: "SDXL",
    samplerId: "dpmpp_2m",
    schedulerId: "sgm_uniform",
    samplerName: "DPM++ 2M",
    schedulerName: "SGM Uniform",
    steps: 6,
    cfg: 1.8,
    speed: "Langkah Rendah (Distilled)",
    useCase: "SDXL Lightning / Turbo checkpoints & LoRA",
    whyItWorks: "Checkpoint atau LoRA distilled (Lightning / Turbo) dirancang untuk beroperasi pada 4-8 langkah dengan CFG rendah (1.0 - 2.0) guna menghindari distorsi latents.",
  },
];

// ============================================================================
// Mathematical Sigma Curve Generator
// ============================================================================

export function computeSigmas(schedulerId: string, steps: number): { step: number; sigma: number }[] {
  const N = Math.max(2, steps);
  const sigmaMax = 14.6146;
  const sigmaMin = 0.0292;
  const points: { step: number; sigma: number }[] = [];

  for (let i = 0; i < N; i++) {
    const ramp = i / (N - 1);
    let val = 0;

    switch (schedulerId) {
      case "karras": {
        const rho = 7;
        const invRho = 1 / rho;
        const sMax = Math.pow(sigmaMax, invRho);
        const sMin = Math.pow(sigmaMin, invRho);
        val = Math.pow(sMax + ramp * (sMin - sMax), rho);
        break;
      }
      case "exponential": {
        val = sigmaMax * Math.pow(sigmaMin / sigmaMax, ramp);
        break;
      }
      case "normal": {
        val = sigmaMax - ramp * (sigmaMax - sigmaMin);
        break;
      }
      case "beta": {
        // Smoothstep interpolation simulating beta distribution transition
        const smooth = ramp * ramp * (3 - 2 * ramp);
        val = sigmaMax * (1 - smooth) + sigmaMin * smooth;
        break;
      }
      case "sgm_uniform": {
        // Discrete-like quadratic progression mimicking Stability AI timesteps
        const quadRamp = 1 - Math.sqrt(1 - ramp);
        val = sigmaMax * (1 - quadRamp) + sigmaMin * quadRamp;
        break;
      }
      case "align_your_steps": {
        // Nvidia learned optimal curve: steep drop initially, very long fine-tuning tail
        const powerRamp = Math.pow(ramp, 0.45);
        val = sigmaMax * Math.pow(sigmaMin / sigmaMax, powerRamp);
        break;
      }
      default: {
        val = sigmaMax - ramp * (sigmaMax - sigmaMin);
        break;
      }
    }

    points.push({
      step: i,
      sigma: Math.max(0, parseFloat(val.toFixed(4))),
    });
  }

  return points;
}

// ============================================================================
// Main Component: SamplerGuide
// ============================================================================

export default function SamplerGuide() {
  const navigate = useNavigate();

  // Active Tab
  const [activeTab, setActiveTab] = useState<"directory" | "plotter" | "recipes" | "battle" | "wizard">("directory");

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [archFilter, setArchFilter] = useState<string>("all");

  // Plotter State
  const [plotterSteps, setPlotterSteps] = useState<number>(24);
  const [activeSchedulers, setActiveSchedulers] = useState<string[]>([
    "karras",
    "sgm_uniform",
    "exponential",
    "align_your_steps",
  ]);
  const [hoveredPoint, setHoveredPoint] = useState<{ sched: string; step: number; sigma: number } | null>(null);

  // Battle Arena State
  const [battleSamplerA, setBattleSamplerA] = useState<string>("euler_a");
  const [battleSamplerB, setBattleSamplerB] = useState<string>("dpmpp_2m");

  // Wizard Interactive State
  const [wizardArch, setWizardArch] = useState<Architecture>("Pony");
  const [wizardPriority, setWizardPriority] = useState<"quality" | "speed" | "creative" | "inpainting">("quality");
  const [wizardVram, setWizardVram] = useState<"low" | "medium" | "high">("medium");

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Workflow Bridge Apply Handler
  const handleApplyBridge = useCallback((data: WorkflowBridgeData) => {
    if (data.sampler) {
      const lower = data.sampler.toLowerCase();
      const matched = SAMPLER_DIRECTORY.find((s) =>
        lower.includes(s.codeName) || lower.includes(s.id) || s.name.toLowerCase().includes(lower)
      );
      if (matched) {
        setSearchQuery(matched.name);
        triggerToast(`Parameter Sampler "${matched.name}" terdeteksi dari data Bridge!`);
      }
    }
  }, []);

  // Filtered Samplers
  const filteredSamplers = useMemo(() => {
    return SAMPLER_DIRECTORY.filter((s) => {
      if (categoryFilter !== "all" && s.category !== categoryFilter) return false;
      if (archFilter !== "all" && !s.architectures.includes(archFilter as Architecture)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.summary.toLowerCase().includes(q) ||
          s.mechanism.toLowerCase().includes(q) ||
          s.bestUseCases.some((u) => u.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [categoryFilter, archFilter, searchQuery]);

  // Compute Battle Items
  const itemA = useMemo(() => SAMPLER_DIRECTORY.find((s) => s.id === battleSamplerA) || SAMPLER_DIRECTORY[0], [battleSamplerA]);
  const itemB = useMemo(() => SAMPLER_DIRECTORY.find((s) => s.id === battleSamplerB) || SAMPLER_DIRECTORY[1], [battleSamplerB]);

  // Wizard Result Computation
  const wizardResult = useMemo(() => {
    if (wizardArch === "Flux") {
      return {
        sampler: "FlowMatchEuler",
        scheduler: "Normal / Simple",
        steps: "4 (Schnell) / 24 (Dev)",
        cfg: "1.0 - 2.5",
        summary: "Arsitektur Flow Matching membutuhkan solver Euler continuous rectified.",
        tip: "FLUX Schnell sangat efisien pada 4 step. Jangan gunakan CFG di atas 3.5.",
      };
    }
    if (wizardPriority === "speed") {
      return {
        sampler: "UniPC atau DPM++ 2M",
        scheduler: "Karras / SGM Uniform",
        steps: "16 - 20",
        cfg: "5.0 - 6.0",
        summary: "Konvergensi ultra-cepat dengan evaluasi gradien multi-step efisien.",
        tip: "UniPC pada 16 step menghasilkan detail setara Euler 30 step.",
      };
    }
    if (wizardPriority === "creative") {
      return {
        sampler: "Euler A (Ancestral)",
        scheduler: "SGM Uniform / Normal",
        steps: "26 - 32",
        cfg: "5.5 - 7.0",
        summary: "Injeksi noise stokastik untuk variasi anatomi, pose, dan ekspresi yang dinamis.",
        tip: "Setiap perubahan seed atau step akan menghasilkan komposisi baru yang unik.",
      };
    }
    if (wizardPriority === "inpainting") {
      return {
        sampler: "DDIM",
        scheduler: "Normal",
        steps: "30 - 40",
        cfg: "6.5 - 8.0",
        summary: "Jalur deterministik dengan latents continuity tertinggi untuk inpainting halus.",
        tip: "DDIM memastikan piksel di pinggir mask tidak mengalami garis batas tajam.",
      };
    }
    // Default High Quality
    if (wizardArch === "Pony" || wizardArch === "Illustrious") {
      return {
        sampler: "DPM++ 2M",
        scheduler: "Karras",
        steps: "26 - 28",
        cfg: "5.5 - 6.5",
        summary: "Rekomendasi awal yang umum digunakan untuk model finetune anime SDXL (Illustrious, Pony).",
        tip: "Scheduler Karras memusatkan evaluasi pada fase noise rendah (sigma < 1.0) untuk detail garis mata dan rambut.",
      };
    }
    return {
      sampler: "DPM++ 2M SDE",
      scheduler: "Karras",
      steps: "30 - 35",
      cfg: "4.5 - 6.0",
      summary: "Solver SDE dengan Karras scheduler membantu mempertahankan variasi tekstur frekuensi tinggi pada checkpoint fotorealistik.",
      tip: "Perhatikan tingkat CFG; nilai di atas 7.0 berpotensi menyebabkan saturasi berlebih pada model SDXL fotorealistik.",
    };
  }, [wizardArch, wizardPriority, wizardVram]);

  // SVG Graph Coordinate Calculations
  const graphWidth = 900;
  const graphHeight = 240;
  const padding = { top: 20, right: 30, bottom: 35, left: 50 };
  const plotW = graphWidth - padding.left - padding.right;
  const plotH = graphHeight - padding.top - padding.bottom;
  const maxSigmaY = 15.0;

  const getX = (step: number) => padding.left + (step / (plotterSteps - 1)) * plotW;
  const getY = (sigma: number) => padding.top + plotH - (Math.min(sigma, maxSigmaY) / maxSigmaY) * plotH;

  return (
    <div className="sg-page">
      {/* Workflow Bridge Banner */}
      <WorkflowBridgeBanner currentTool="sampler-guide" onApply={handleApplyBridge} />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="sg-toast">
          <span style={{ color: "#10b981" }}>●</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Section */}
      <header className="sg-header">
        <div className="sg-header-left">
          <div className="sg-title-row">
            <h1 className="sg-title">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              Visual Sampler &amp; Scheduler Guide
            </h1>
            <span className="sg-badge">Diffusion Mathematics</span>
          </div>
          <p className="sg-subtitle">
            Kamus komprehensif algoritma sampling (Euler, DPM++, DDIM, UniPC, FLUX) dan visualisasi kurva peluruhan noise (Karras, SGM Uniform, Exponential, AYS) untuk ComfyUI, Auto1111, dan Forge.
          </p>
        </div>

        <div className="sg-header-stats">
          <div className="sg-stat-chip">
            <span>Algoritma:</span>
            <strong>{SAMPLER_DIRECTORY.length} Sampler</strong>
          </div>
          <div className="sg-stat-chip">
            <span>Kurva Sigma:</span>
            <strong>{SCHEDULER_DIRECTORY.length} Scheduler</strong>
          </div>
          <div className="sg-stat-chip">
            <span>Dasar:</span>
            <strong style={{ color: "#10b981" }}>Dokumentasi &amp; Source Code</strong>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="sg-nav-tabs" role="tablist">
        <button
          type="button"
          className={`sg-tab-btn ${activeTab === "directory" ? "active" : ""}`}
          onClick={() => setActiveTab("directory")}
        >
          <span>📚 Direktori &amp; Arsitektur Sampler</span>
          <span className="sg-tab-count">{filteredSamplers.length}</span>
        </button>

        <button
          type="button"
          className={`sg-tab-btn ${activeTab === "plotter" ? "active" : ""}`}
          onClick={() => setActiveTab("plotter")}
        >
          <span>📈 Plotter Kurva Sigma (Scheduler)</span>
          <span className="sg-tab-count">Interactive SVG</span>
        </button>

        <button
          type="button"
          className={`sg-tab-btn ${activeTab === "recipes" ? "active" : ""}`}
          onClick={() => setActiveTab("recipes")}
        >
          <span>🎯 Resep &amp; Matriks Rekomendasi</span>
          <span className="sg-tab-count">{CURATED_RECIPES.length}</span>
        </button>

        <button
          type="button"
          className={`sg-tab-btn ${activeTab === "battle" ? "active" : ""}`}
          onClick={() => setActiveTab("battle")}
        >
          <span>⚔️ Head-to-Head Battle</span>
        </button>

        <button
          type="button"
          className={`sg-tab-btn ${activeTab === "wizard" ? "active" : ""}`}
          onClick={() => setActiveTab("wizard")}
        >
          <span>🧙 Simulator Rekomendasi Pintar</span>
        </button>
      </div>

      {/* =====================================================================
          TAB 1: Direktori Sampler & Filter
         ===================================================================== */}
      {activeTab === "directory" && (
        <section>
          {/* Controls Bar */}
          <div className="sg-controls-bar">
            <div className="sg-controls-left">
              <div className="sg-search-wrap">
                <span className="sg-search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Cari sampler (e.g. DPM++, Euler, FLUX)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="sg-search-input"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="sg-filter-select"
              >
                <option value="all">Semua Tipe Algoritma</option>
                <option value="deterministic">Deterministik (Konvergen)</option>
                <option value="stochastic">Stokastik (Ancestral / SDE)</option>
                <option value="flow_matching">Flow Matching (FLUX)</option>
                <option value="accelerated">Accelerated (LCM / Turbo)</option>
              </select>

              <select
                value={archFilter}
                onChange={(e) => setArchFilter(e.target.value)}
                className="sg-filter-select"
              >
                <option value="all">Semua Model</option>
                <option value="SDXL">SDXL</option>
                <option value="Pony">Pony Diffusion</option>
                <option value="Illustrious">Illustrious XL</option>
                <option value="Flux">FLUX.1</option>
                <option value="SD 1.5">SD 1.5</option>
              </select>
            </div>

            <div style={{ fontSize: "12px", color: "#a1a1aa" }}>
              Menampilkan <strong>{filteredSamplers.length}</strong> algoritma
            </div>
          </div>

          {/* Sampler Cards Grid */}
          <div className="sg-grid">
            {filteredSamplers.map((sampler) => (
              <div key={sampler.id} className="sg-card">
                <div className="sg-card-header">
                  <div className="sg-card-title-group">
                    <h3 className="sg-card-title">{sampler.name}</h3>
                    <span className="sg-card-subtitle">
                      ComfyUI: <code>{sampler.comfyName}</code> • WebUI: <code>{sampler.webuiName}</code>
                    </span>
                  </div>
                  <span className={`sg-type-pill ${sampler.category}`}>
                    {sampler.category === "deterministic" && "Deterministik"}
                    {sampler.category === "stochastic" && "Stokastik"}
                    {sampler.category === "flow_matching" && "Flow Matching"}
                    {sampler.category === "accelerated" && "Accelerated"}
                  </span>
                </div>

                <div className="sg-specs-row">
                  <div className="sg-spec-col">
                    <span className="sg-spec-label">Orde &amp; NFE</span>
                    <span className="sg-spec-val">
                      {sampler.order}nd / {sampler.nfePerStep} NFE
                    </span>
                  </div>
                  <div className="sg-spec-col" title="Titik awal eksperimen; bukan nilai universal">
                    <span className="sg-spec-label">Titik Awal Steps</span>
                    <span className="sg-spec-val">{sampler.optimalSteps}</span>
                  </div>
                  <div className="sg-spec-col" title="Titik awal eksperimen; bukan nilai mutlak">
                    <span className="sg-spec-label">Titik Awal CFG</span>
                    <span className="sg-spec-val">{sampler.optimalCfg}</span>
                  </div>
                  <div className="sg-spec-col">
                    <span className="sg-spec-label">Kecepatan</span>
                    <span className="sg-spec-val" style={{ color: sampler.speedRating >= 4 ? "#10b981" : "#f59e0b" }}>
                      {"★".repeat(sampler.speedRating)}{"☆".repeat(5 - sampler.speedRating)}
                    </span>
                  </div>
                </div>

                <p className="sg-card-desc">{sampler.summary}</p>

                <div style={{ fontSize: "11px", color: "#a1a1aa", background: "#18181b", padding: "8px 10px", borderRadius: "6px", border: "1px solid #27272a" }}>
                  <strong style={{ color: "#d4d4d8" }}>Prinsip Kerja: </strong>
                  {sampler.mechanism}
                </div>

                <div className="sg-pros-cons">
                  <div className="sg-pros-list">
                    <span className="sg-list-label pros">Kelebihan</span>
                    {sampler.pros.map((pro, idx) => (
                      <div key={idx} className="sg-list-item">
                        <span style={{ color: "#10b981" }}>✓</span>
                        <span>{pro}</span>
                      </div>
                    ))}
                  </div>
                  <div className="sg-cons-list">
                    <span className="sg-list-label cons">Kelemahan</span>
                    {sampler.cons.map((con, idx) => (
                      <div key={idx} className="sg-list-item">
                        <span style={{ color: "#f59e0b" }}>✕</span>
                        <span>{con}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="sg-card-footer">
                  <div className="sg-model-support">
                    {sampler.architectures.map((arch) => (
                      <span key={arch} className="sg-model-chip">
                        {arch}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="sg-card-action-btn"
                    onClick={() => {
                      bridgeToPromptLab(navigate, {
                        source: "sampler-guide",
                        timestamp: Date.now(),
                        sampler: sampler.name,
                        steps: parseInt(sampler.optimalSteps.split("-")[0].trim(), 10) || 24,
                        baseModel: sampler.architectures[0] || "SDXL",
                      });
                    }}
                    title="Bawa parameter sampler ini ke Prompt Studio"
                  >
                    <span>Gunakan di Studio →</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =====================================================================
          TAB 2: Interactive SVG Sigma Curve Plotter (Scheduler Explorer)
         ===================================================================== */}
      {activeTab === "plotter" && (
        <section className="sg-plotter-panel">
          <div className="sg-plotter-header">
            <div className="sg-plotter-title-wrap">
              <h2 className="sg-plotter-title">
                <span>📈 Kurva Peluruhan Noise Matematis (Sigma Plotter)</span>
              </h2>
              <p className="sg-plotter-desc">
                Grafik peluruhan nilai sigma (σ) dari noise acak murni (σ ≈ 14.6) hingga latents gambar jernih (σ ≈ 0.02) per langkah iterasi.
              </p>
            </div>

            <div className="sg-step-slider-control">
              <span className="sg-step-slider-label">Total Step:</span>
              <input
                type="range"
                min="10"
                max="50"
                step="2"
                value={plotterSteps}
                onChange={(e) => setPlotterSteps(parseInt(e.target.value, 10))}
                className="sg-step-slider"
              />
              <span className="sg-step-slider-val">{plotterSteps} Steps</span>
            </div>
          </div>

          {/* Scheduler Selection Toggle Chips */}
          <div className="sg-sched-toggles">
            {SCHEDULER_DIRECTORY.map((sched) => {
              const isSelected = activeSchedulers.includes(sched.id);
              return (
                <button
                  key={sched.id}
                  type="button"
                  className={`sg-sched-toggle-chip ${isSelected ? "active" : ""}`}
                  style={{
                    borderColor: isSelected ? sched.color : "#27272a",
                    borderLeftWidth: "3px",
                    borderLeftColor: sched.color,
                  }}
                  onClick={() => {
                    if (isSelected) {
                      if (activeSchedulers.length > 1) {
                        setActiveSchedulers((prev) => prev.filter((id) => id !== sched.id));
                      }
                    } else {
                      setActiveSchedulers((prev) => [...prev, sched.id]);
                    }
                  }}
                >
                  <span className="sg-sched-dot" style={{ background: sched.color }} />
                  <span>{sched.name}</span>
                </button>
              );
            })}
          </div>

          {/* SVG Canvas Plotter */}
          <div className="sg-graph-wrapper">
            <svg viewBox={`0 0 ${graphWidth} ${graphHeight}`} className="sg-graph-svg">
              {/* Grid Lines (Horizontal) */}
              {[15, 10, 5, 1, 0].map((level) => {
                const y = getY(level);
                return (
                  <g key={level}>
                    <line x1={padding.left} y1={y} x2={graphWidth - padding.right} y2={y} stroke="#27272a" strokeWidth="1" strokeDasharray="4 4" />
                    <text x={padding.left - 8} y={y + 4} fill="#71717a" fontSize="10" textAnchor="end" fontFamily="monospace">
                      {level}σ
                    </text>
                  </g>
                );
              })}

              {/* Grid Lines (Vertical Steps) */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                const stepNum = Math.round(pct * (plotterSteps - 1));
                const x = getX(stepNum);
                return (
                  <g key={pct}>
                    <line x1={x} y1={padding.top} x2={x} y2={graphHeight - padding.bottom} stroke="#27272a" strokeWidth="1" strokeDasharray="2 2" />
                    <text x={x} y={graphHeight - padding.bottom + 16} fill="#a1a1aa" fontSize="10" textAnchor="middle" fontFamily="monospace">
                      Step {stepNum}
                    </text>
                  </g>
                );
              })}

              {/* Axis Labels */}
              <text x={padding.left - 10} y={padding.top - 6} fill="#a1a1aa" fontSize="11" fontWeight="700">
                Nilai Noise (σ)
              </text>
              <text x={graphWidth - padding.right} y={graphHeight - padding.bottom + 16} fill="#a1a1aa" fontSize="11" textAnchor="end" fontWeight="700">
                Langkah Iterasi →
              </text>

              {/* Draw Lines for each active scheduler */}
              {activeSchedulers.map((schedId) => {
                const schedMeta = SCHEDULER_DIRECTORY.find((s) => s.id === schedId);
                if (!schedMeta) return null;
                const points = computeSigmas(schedId, plotterSteps);
                const polylineStr = points.map((p) => `${getX(p.step)},${getY(p.sigma)}`).join(" ");

                return (
                  <g key={schedId}>
                    <polyline
                      fill="none"
                      stroke={schedMeta.color}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={polylineStr}
                    />

                    {/* Data Points */}
                    {points.map((p) => (
                      <circle
                        key={p.step}
                        cx={getX(p.step)}
                        cy={getY(p.sigma)}
                        r={hoveredPoint?.sched === schedId && hoveredPoint?.step === p.step ? "6" : "3"}
                        fill={schedMeta.color}
                        stroke="#09090b"
                        strokeWidth="1.5"
                        style={{ cursor: "pointer", transition: "r 0.1s" }}
                        onMouseEnter={() => setHoveredPoint({ sched: schedMeta.name, step: p.step, sigma: p.sigma })}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    ))}
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredPoint && (
              <div
                style={{
                  position: "absolute",
                  top: "20px",
                  right: "24px",
                  background: "#18181b",
                  border: "1px solid #2563eb",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  fontSize: "12px",
                  color: "#f4f4f5",
                  fontFamily: "monospace",
                  pointerEvents: "none",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.8)",
                }}
              >
                <div>
                  <strong>{hoveredPoint.sched}</strong>
                </div>
                <div style={{ color: "#a1a1aa" }}>
                  Step {hoveredPoint.step} / {plotterSteps - 1} →{" "}
                  <strong style={{ color: "#60a5fa" }}>σ = {hoveredPoint.sigma}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Phase Guides */}
          <div className="sg-phase-guides">
            <div className="sg-phase-box">
              <span className="sg-phase-title high">
                <span>🔴</span>
                <span>Fase Awal: High Noise (σ &gt; 5.0)</span>
              </span>
              <p className="sg-phase-desc">
                Membentuk komposisi global, pose tubuh dasar, siluet figur, dan blocking latar belakang. Perubahan di fase ini mempengaruhi orientasi gambar.
              </p>
            </div>

            <div className="sg-phase-box">
              <span className="sg-phase-title mid">
                <span>🟡</span>
                <span>Fase Tengah: Mid Noise (1.0 &lt; σ &lt; 5.0)</span>
              </span>
              <p className="sg-phase-desc">
                Mendefinisikan detail anatomi, lipatan pakaian, proporsi wajah, perspektif furnitur, dan kontur pencahayaan global.
              </p>
            </div>

            <div className="sg-phase-box">
              <span className="sg-phase-title low">
                <span>🟢</span>
                <span>Fase Akhir: Low Noise (σ &lt; 1.0)</span>
              </span>
              <p className="sg-phase-desc">
                Di sinilah kurva <strong>Karras</strong> unggul! Menghaluskan tekstur mikro, pori-pori kulit, kilau mata, dan ketajaman helaian rambut tanpa mengubah komposisi.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          TAB 3: Resep Terbaik (Curated Recipes)
         ===================================================================== */}
      {activeTab === "recipes" && (
        <section>
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 4px 0", color: "#f4f4f5" }}>
              Kombinasi Sampler &amp; Scheduler Paling Teruji
            </h2>
            <p style={{ fontSize: "12.5px", color: "#a1a1aa", margin: 0 }}>
              Konfigurasi parameter yang telah dioptimasi oleh komunitas untuk menghindari burning, ghosting, atau under-baked renders.
            </p>
          </div>

          <div className="sg-grid">
            {CURATED_RECIPES.map((recipe) => (
              <div key={recipe.id} className="sg-card highlighted">
                <div className="sg-card-header">
                  <div className="sg-card-title-group">
                    <span className="sg-result-badge">{recipe.badge}</span>
                    <h3 className="sg-card-title" style={{ marginTop: "6px" }}>
                      {recipe.title}
                    </h3>
                  </div>
                  <span className="sg-model-chip" style={{ fontSize: "11px", padding: "4px 8px" }}>
                    {recipe.architecture}
                  </span>
                </div>

                <div className="sg-specs-row">
                  <div className="sg-spec-col">
                    <span className="sg-spec-label">Sampler</span>
                    <span className="sg-spec-val" style={{ color: "#60a5fa" }}>
                      {recipe.samplerName}
                    </span>
                  </div>
                  <div className="sg-spec-col">
                    <span className="sg-spec-label">Scheduler</span>
                    <span className="sg-spec-val" style={{ color: "#34d399" }}>
                      {recipe.schedulerName}
                    </span>
                  </div>
                  <div className="sg-spec-col">
                    <span className="sg-spec-label">Steps</span>
                    <span className="sg-spec-val">{recipe.steps}</span>
                  </div>
                  <div className="sg-spec-col">
                    <span className="sg-spec-label">CFG Scale</span>
                    <span className="sg-spec-val">{recipe.cfg.toFixed(1)}</span>
                  </div>
                </div>

                <div style={{ fontSize: "12px", color: "#d4d4d8", lineHeight: 1.5 }}>
                  <strong style={{ color: "#f4f4f5" }}>Target Model: </strong>
                  {recipe.useCase}
                </div>

                <div className="sg-recipe-why">
                  <strong>Mengapa Efektif? </strong>
                  {recipe.whyItWorks}
                </div>

                <div className="sg-card-footer">
                  <span style={{ fontSize: "11px", color: "#a1a1aa" }}>{recipe.speed}</span>

                  <button
                    type="button"
                    className="sg-btn-primary"
                    onClick={() => {
                      bridgeToPromptLab(navigate, {
                        source: "sampler-guide",
                        timestamp: Date.now(),
                        sampler: `${recipe.samplerName} ${recipe.schedulerName}`,
                        steps: recipe.steps,
                        cfgScale: recipe.cfg,
                        baseModel: recipe.architecture,
                      });
                    }}
                  >
                    <span>Terapkan ke Studio →</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =====================================================================
          TAB 4: Head-to-Head Battle Arena
         ===================================================================== */}
      {activeTab === "battle" && (
        <section className="sg-battle-container">
          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 4px 0", color: "#f4f4f5" }}>
              Komparasi Langsung Antara 2 Sampler (Head-to-Head)
            </h2>
            <p style={{ fontSize: "12.5px", color: "#a1a1aa", margin: 0 }}>
              Bandingkan sifat matematis, kecepatan komputasi, dan perilaku konvergensi dua algoritma secara berdampingan.
            </p>
          </div>

          <div className="sg-battle-selector-row">
            <div className="sg-battle-col">
              <span className="sg-battle-label">PILIH SAMPLER A</span>
              <select
                value={battleSamplerA}
                onChange={(e) => setBattleSamplerA(e.target.value)}
                className="sg-filter-select"
                style={{ width: "100%", padding: "10px" }}
              >
                {SAMPLER_DIRECTORY.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="sg-battle-vs">VS</div>

            <div className="sg-battle-col">
              <span className="sg-battle-label">PILIH SAMPLER B</span>
              <select
                value={battleSamplerB}
                onChange={(e) => setBattleSamplerB(e.target.value)}
                className="sg-filter-select"
                style={{ width: "100%", padding: "10px" }}
              >
                {SAMPLER_DIRECTORY.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Comparative Table */}
          <table className="sg-battle-table">
            <thead>
              <tr>
                <th className="metric-col">Kriteria Evaluasi</th>
                <th style={{ color: "#60a5fa" }}>{itemA.name}</th>
                <th style={{ color: "#34d399" }}>{itemB.name}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="metric-col">Tipe Matematika</td>
                <td>
                  <span className={`sg-type-pill ${itemA.category}`}>{itemA.category}</span>
                </td>
                <td>
                  <span className={`sg-type-pill ${itemB.category}`}>{itemB.category}</span>
                </td>
              </tr>
              <tr>
                <td className="metric-col">Perilaku Konvergensi</td>
                <td>{itemA.convergence}</td>
                <td>{itemB.convergence}</td>
              </tr>
              <tr>
                <td className="metric-col">Orde Numerik &amp; NFE</td>
                <td>
                  {itemA.order}nd Order / {itemA.nfePerStep} NFE per step
                </td>
                <td>
                  {itemB.order}nd Order / {itemB.nfePerStep} NFE per step
                </td>
              </tr>
              <tr>
                <td className="metric-col">Titik Awal Steps (Eksperimen)</td>
                <td>
                  <strong>{itemA.optimalSteps} Steps</strong> (Min: {itemA.minSteps})
                </td>
                <td>
                  <strong>{itemB.optimalSteps} Steps</strong> (Min: {itemB.minSteps})
                </td>
              </tr>
              <tr>
                <td className="metric-col">Titik Awal CFG (Eksperimen)</td>
                <td>{itemA.optimalCfg}</td>
                <td>{itemB.optimalCfg}</td>
              </tr>
              <tr>
                <td className="metric-col">Rating Kecepatan</td>
                <td style={{ color: itemA.speedRating >= 4 ? "#10b981" : "#f59e0b" }}>
                  {"★".repeat(itemA.speedRating)}{"☆".repeat(5 - itemA.speedRating)}
                </td>
                <td style={{ color: itemB.speedRating >= 4 ? "#10b981" : "#f59e0b" }}>
                  {"★".repeat(itemB.speedRating)}{"☆".repeat(5 - itemB.speedRating)}
                </td>
              </tr>
              <tr>
                <td className="metric-col">Scheduler Pendamping Terbaik</td>
                <td>{itemA.recommendedSchedulers.join(", ")}</td>
                <td>{itemB.recommendedSchedulers.join(", ")}</td>
              </tr>
              <tr>
                <td className="metric-col">Cocok Untuk Kebutuhan</td>
                <td>{itemA.bestUseCases.join(" • ")}</td>
                <td>{itemB.bestUseCases.join(" • ")}</td>
              </tr>
            </tbody>
          </table>
        </section>
      )}

      {/* =====================================================================
          TAB 5: Simulator Rekomendasi Pintar (Wizard)
         ===================================================================== */}
      {activeTab === "wizard" && (
        <section className="sg-wizard-panel">
          <div className="sg-wizard-header">
            <h2 className="sg-wizard-title">🧙 Simulator Rekomendasi Pintar</h2>
            <p className="sg-wizard-desc">
              Pilih kriteria teknis berikut untuk mendapatkan rekomendasi titik awal racikan Sampler, Scheduler, Steps, dan CFG.
            </p>
          </div>

          <div className="sg-wizard-form">
            {/* Step 1: Arsitektur Model */}
            <div className="sg-wizard-group">
              <label className="sg-wizard-label">1. Arsitektur Model Utama Anda</label>
              <div className="sg-wizard-cards-row">
                {(["Pony", "SDXL", "Illustrious", "Flux", "SD 1.5"] as Architecture[]).map((arch) => (
                  <button
                    key={arch}
                    type="button"
                    className={`sg-choice-btn ${wizardArch === arch ? "selected" : ""}`}
                    onClick={() => setWizardArch(arch)}
                  >
                    <span>{arch}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Prioritas Output */}
            <div className="sg-wizard-group">
              <label className="sg-wizard-label">2. Prioritas Utama Output Anda</label>
              <div className="sg-wizard-cards-row">
                <button
                  type="button"
                  className={`sg-choice-btn ${wizardPriority === "quality" ? "selected" : ""}`}
                  onClick={() => setWizardPriority("quality")}
                >
                  <span>Kualitas &amp; Tekstur Mikro Maksimal</span>
                </button>
                <button
                  type="button"
                  className={`sg-choice-btn ${wizardPriority === "speed" ? "selected" : ""}`}
                  onClick={() => setWizardPriority("speed")}
                >
                  <span>Kecepatan Render &amp; Efisiensi Waktu</span>
                </button>
                <button
                  type="button"
                  className={`sg-choice-btn ${wizardPriority === "creative" ? "selected" : ""}`}
                  onClick={() => setWizardPriority("creative")}
                >
                  <span>Eksplorasi Pose &amp; Gaya Gambar Ekspresif</span>
                </button>
                <button
                  type="button"
                  className={`sg-choice-btn ${wizardPriority === "inpainting" ? "selected" : ""}`}
                  onClick={() => setWizardPriority("inpainting")}
                >
                  <span>Inpainting &amp; Konsistensi Masking</span>
                </button>
              </div>
            </div>

            {/* Step 3: Kapasitas GPU / VRAM */}
            <div className="sg-wizard-group">
              <label className="sg-wizard-label">3. Target Waktu &amp; VRAM GPU</label>
              <div className="sg-wizard-cards-row">
                <button
                  type="button"
                  className={`sg-choice-btn ${wizardVram === "low" ? "selected" : ""}`}
                  onClick={() => setWizardVram("low")}
                >
                  <span>GPU Sedang / Render Santai (≤ 8 GB VRAM)</span>
                </button>
                <button
                  type="button"
                  className={`sg-choice-btn ${wizardVram === "medium" ? "selected" : ""}`}
                  onClick={() => setWizardVram("medium")}
                >
                  <span>GPU Standar (12 GB VRAM)</span>
                </button>
                <button
                  type="button"
                  className={`sg-choice-btn ${wizardVram === "high" ? "selected" : ""}`}
                  onClick={() => setWizardVram("high")}
                >
                  <span>GPU Flagship (16 GB - 24 GB VRAM)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Wizard Output Card */}
          <div className="sg-result-card">
            <div className="sg-result-header">
              <span className="sg-result-badge">Titik Awal Rekomendasi</span>
              <span style={{ fontSize: "12px", color: "#a1a1aa" }}>
                Target: <strong>{wizardArch}</strong> • Prioritas: <strong>{wizardPriority}</strong>
              </span>
            </div>

            <div className="sg-recipe-big-row">
              <div className="sg-recipe-spec">
                <span className="sg-recipe-spec-title">Rekomendasi Sampler</span>
                <span className="sg-recipe-spec-value">{wizardResult.sampler}</span>
              </div>
              <div className="sg-recipe-spec">
                <span className="sg-recipe-spec-title">Rekomendasi Scheduler</span>
                <span className="sg-recipe-spec-value" style={{ color: "#34d399" }}>
                  {wizardResult.scheduler}
                </span>
              </div>
              <div className="sg-recipe-spec" title="Titik awal eksperimen, bukan nilai mutlak">
                <span className="sg-recipe-spec-title">Titik Awal Steps</span>
                <span className="sg-recipe-spec-value" style={{ color: "#fbbf24" }}>
                  {wizardResult.steps}
                </span>
              </div>
              <div className="sg-recipe-spec" title="Titik awal eksperimen, bukan nilai mutlak">
                <span className="sg-recipe-spec-title">Titik Awal CFG</span>
                <span className="sg-recipe-spec-value">{wizardResult.cfg}</span>
              </div>
            </div>

            <div className="sg-recipe-why">
              <strong>Analisis Teknis: </strong>
              {wizardResult.summary}
              <div style={{ marginTop: "6px", color: "#a1a1aa" }}>
                💡 <em>Tips:</em> {wizardResult.tip}
              </div>
            </div>

            <div className="sg-recipe-actions">
              <button
                type="button"
                className="sg-btn-primary"
                onClick={() => {
                  bridgeToPromptLab(navigate, {
                    source: "sampler-guide",
                    timestamp: Date.now(),
                    sampler: `${wizardResult.sampler} ${wizardResult.scheduler}`,
                    steps: parseInt(wizardResult.steps.split("-")[0].trim(), 10) || 26,
                    baseModel: wizardArch,
                  });
                }}
              >
                <span>Bawa Racikan Ini ke Prompt Studio →</span>
              </button>

              <button
                type="button"
                className="sg-btn-secondary"
                onClick={() => {
                  bridgeToCalculator(navigate, {
                    source: "sampler-guide",
                    timestamp: Date.now(),
                    baseModel: wizardArch,
                  });
                }}
              >
                <span>Cek Resolusi Aman di Calculator</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Footnote Disclaimers: Technical Accuracy Principles */}
      <footer style={{ marginTop: "32px", padding: "16px 20px", background: "#121215", border: "1px solid #27272a", borderRadius: "8px", fontSize: "12px", color: "#a1a1aa", lineHeight: 1.6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <span style={{ color: "#2563eb", fontWeight: 700 }}>ℹ️ Prinsip Akurasi Teknis:</span>
        </div>
        <p style={{ margin: 0 }}>
          Nilai steps dan CFG yang tercantum pada seluruh panduan ini adalah <strong>titik awal eksperimen praktis</strong>, bukan nilai universal atau spesifikasi mutlak. Hasil akhir difusi sangat dipengaruhi oleh arsitektur checkpoint (SD 1.5, SDXL, Illustrious, NoobAI, FLUX.1), VAE, LoRA stack, CLIP Skip, resolusi gambar, scheduler yang dipasangkan, dan seed. Pengujian perbandingan antar konfigurasi yang valid menuntut kontrol variabel ketat (checkpoint, prompt, negative prompt, seed, dan resolusi harus identik).
        </p>
      </footer>
    </div>
  );
}
