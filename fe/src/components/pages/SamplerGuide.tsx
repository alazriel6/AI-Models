import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { WorkflowBridgeBanner } from "../common/WorkflowBridgeBanner";
import {
  type WorkflowBridgeData,
  bridgeToPromptLab,
  bridgeToCalculator,
  bridgeToVramProfiler,
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
  minSteps: number;
  optimalSteps: string;
  optimalCfg: string;
  convergence: "Konvergen (Deterministik)" | "Non-Konvergen (Stokastik / SDE)" | "Continuous Rectified Flow";
  architectures: Architecture[];
  summary: string;
  mechanism: string;
  pros: string[];
  cons: string[];
  bestUseCases: string[];
  recommendedSchedulers: string[];
  comfyName: string;
  webuiName: string;
  paperTitle: string;
  paperUrl: string;
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
  sourceReference: string;
  sourceUrl: string;
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
  clipSkip: number | string;
  speed: string;
  useCase: string;
  sourceName: string;
  sourceUrl: string;
  officialNotes: string;
  whyItWorks: string;
}

// ============================================================================
// Technical Datasets (100% Verified AI Knowledge Base & Model Cards)
// ============================================================================

export const SAMPLER_DIRECTORY: SamplerItem[] = [
  {
    id: "dpmpp_2m",
    name: "DPM++ 2M",
    codeName: "dpmpp_2m",
    category: "deterministic",
    order: 2,
    nfePerStep: 1,
    minSteps: 18,
    optimalSteps: "20 - 28",
    optimalCfg: "5.0 - 7.0",
    convergence: "Konvergen (Deterministik)",
    architectures: ["SDXL", "Pony", "Illustrious", "SD 1.5"],
    summary: "DPM-Solver++ orde-2 multi-step. Solver cepat berbasis Runge-Kutta eksponensial yang memanfaatkan riwayat gradient step sebelumnya.",
    mechanism: "Mengintegrasikan fungsi ODE difusi menggunakan formulasi multi-step orde ke-2. Setelah langkah awal, hanya memerlukan 1 evaluasi fungsi (1 NFE) per langkah.",
    pros: [
      "Efisien dalam komputasi (1 NFE per step setelah inisialisasi)",
      "Deterministik murni: seed dan step yang sama menghasilkan gambar yang identik",
      "Umum dipadukan dengan Karras scheduler pada model SDXL dan fine-tune anime",
    ],
    cons: [
      "Dapat tampak over-smoothed pada detail mikro tertentu jika step terlalu sedikit (<15)",
      "Memerlukan buffer riwayat langkah; tidak dapat mengubah nilai step secara dinamis di tengah proses",
    ],
    bestUseCases: ["Pony Diffusion V6", "Illustrious-XL", "SDXL Base", "Batch rendering cepat"],
    recommendedSchedulers: ["Karras", "SGM Uniform", "Exponential"],
    comfyName: "dpmpp_2m",
    webuiName: "DPM++ 2M",
    paperTitle: "Lu et al. (NeurIPS 2022) - DPM-Solver++",
    paperUrl: "https://arxiv.org/abs/2211.01095",
  },
  {
    id: "dpmpp_2m_sde",
    name: "DPM++ 2M SDE",
    codeName: "dpmpp_2m_sde",
    category: "stochastic",
    order: 2,
    nfePerStep: 1,
    minSteps: 24,
    optimalSteps: "28 - 35",
    optimalCfg: "4.5 - 6.0",
    convergence: "Non-Konvergen (Stokastik / SDE)",
    architectures: ["SDXL", "Pony", "Illustrious", "SD 1.5"],
    summary: "Varian SDE (Stochastic Differential Equation) yang menyuntikkan noise Brownian acak terukur di setiap iterasi orde-2.",
    mechanism: "Menyelesaikan persamaan diferensial stokastik (Reverse SDE) dengan menyuntikkan noise acak terukur pada setiap langkah. Hal ini mempertahankan energi noise frekuensi tinggi hingga tahap akhir.",
    pros: [
      "Dapat mempertahankan variasi tekstur frekuensi tinggi pada fotografi dan potret",
      "Toleran terhadap saturasi kontras pada CFG moderat (4.5 - 6.0)",
      "Mereduksi kecenderungan over-smoothing pada checkpoint fotorealistik",
    ],
    cons: [
      "Non-konvergen: mengubah jumlah steps akan mengubah komposisi dan pose gambar meski seed tetap sama",
      "Memerlukan kalkulasi drift dan diffusion tambahan pada setiap langkah",
    ],
    bestUseCases: ["Fotografi Potret & Tekstur Kulit", "Pencahayaan Sinematik Kompleks", "Semi-realism"],
    recommendedSchedulers: ["Karras", "Exponential"],
    comfyName: "dpmpp_2m_sde",
    webuiName: "DPM++ 2M SDE",
    paperTitle: "Katherine Crowson / k-diffusion SDE formulation",
    paperUrl: "https://github.com/crowsonkb/k-diffusion",
  },
  {
    id: "euler",
    name: "Euler",
    codeName: "euler",
    category: "deterministic",
    order: 1,
    nfePerStep: 1,
    minSteps: 18,
    optimalSteps: "20 - 30",
    optimalCfg: "5.0 - 7.0",
    convergence: "Konvergen (Deterministik)",
    architectures: ["SDXL", "SD 1.5", "Flux"],
    summary: "Metode integrasi numerik linier Forward Euler orde-1. Merupakan baseline resmi pada banyak model dan wajib untuk NoobAI-XL V-Pred.",
    mechanism: "Menghitung turunan vektor gradien langsung pada titik latents saat ini ($x_{t-1} = x_t - \\sigma \\cdot \\nabla$). Sederhana, 1 NFE per langkah, tanpa memori riwayat.",
    pros: [
      "Beban kalkulasi per langkah paling ringan (1 NFE per step)",
      "Deterministik murni dan sangat mudah direproduksi",
      "Solver standar resmi untuk arsitektur Rectified Flow (FLUX.1) dan varian NoobAI-XL V-Prediction",
    ],
    cons: [
      "Akurasi integrasi numerik orde-1 lebih rendah dibanding orde-2 pada step rendah (<18)",
      "Pada model difusi standar (non-distilled), step rendah dapat menyisakan noise jika scheduler tidak sesuai",
    ],
    bestUseCases: ["FLUX.1 [dev] & [schnell]", "NoobAI-XL V-Pred (Wajib)", "Baseline testing model baru"],
    recommendedSchedulers: ["Simple", "Beta", "Normal", "SGM Uniform"],
    comfyName: "euler",
    webuiName: "Euler",
    paperTitle: "Karras et al. (NeurIPS 2022) - EDM Baseline",
    paperUrl: "https://arxiv.org/abs/2206.00364",
  },
  {
    id: "euler_a",
    name: "Euler A (Ancestral)",
    codeName: "euler_ancestral",
    category: "stochastic",
    order: 1,
    nfePerStep: 1,
    minSteps: 20,
    optimalSteps: "20 - 28",
    optimalCfg: "4.5 - 6.0",
    convergence: "Non-Konvergen (Stokastik / SDE)",
    architectures: ["Illustrious", "Pony", "SD 1.5", "SDXL"],
    summary: "Euler dengan komponen ancestral (stokastik). Direkomendasikan resmi oleh model card Illustrious-XL dan NoobAI-XL Standard.",
    mechanism: "Mengurangi noise lalu menyuntikkan kembali noise acak gaussian berskala sigma ancestral (\\sigma_{up}). Mengadaptasi sampling DDPM Ho et al. ke dalam langkah Euler.",
    pros: [
      "Rekomendasi resmi pada model card Illustrious-XL dan NoobAI-XL Standard",
      "Menghasilkan variasi pose, ekspresi wajah, dan goresan visual anime yang dinamis",
      "Eksekusi ringan (1 NFE per step)",
    ],
    cons: [
      "Tidak konvergen: hasil gambar tidak mengunci jika jumlah step diubah",
      "Kurang dapat diprediksi untuk inpainting yang memerlukan kesinambungan ketat",
    ],
    bestUseCases: ["Illustrious-XL (Rekomendasi Resmi)", "NoobAI-XL Standard", "Ilustrasi Anime & Fanart"],
    recommendedSchedulers: ["SGM Uniform", "Normal", "Karras"],
    comfyName: "euler_ancestral",
    webuiName: "Euler a",
    paperTitle: "Katherine Crowson (k-diffusion) - Ancestral Sampling",
    paperUrl: "https://github.com/crowsonkb/k-diffusion",
  },
  {
    id: "dpmpp_3m_sde",
    name: "DPM++ 3M SDE",
    codeName: "dpmpp_3m_sde",
    category: "stochastic",
    order: 3,
    nfePerStep: 1,
    minSteps: 26,
    optimalSteps: "30 - 45",
    optimalCfg: "4.0 - 6.0",
    convergence: "Non-Konvergen (Stokastik / SDE)",
    architectures: ["SDXL", "Pony", "Illustrious"],
    summary: "DPM-Solver++ multi-step orde-3 dengan Brownian motion untuk aproksimasi trayektori kurva berakurasi tinggi.",
    mechanism: "Mengevaluasi gradient riwayat hingga orde ke-3 ditambah penyeimbang Brownian noise stokastik. Membutuhkan buffer riwayat 3 langkah sebelumnya.",
    pros: [
      "Akurasi integrasi tinggi pada resolusi besar (1024x1024 ke atas)",
      "Membantu transisi gradasi halus pada latar belakang atau area kontras rendah",
      "Mereduksi diskontinuitas numerik",
    ],
    cons: [
      "Memerlukan step yang cukup (≥28) agar riwayat gradien orde-3 stabil",
      "Komputasi per langkah sedikit lebih lama dibanding varian orde-2",
    ],
    bestUseCases: ["Render Ilustrasi Detail Tinggi", "Lanskap Kompleks", "High-res Upscaling"],
    recommendedSchedulers: ["Karras", "Exponential"],
    comfyName: "dpmpp_3m_sde",
    webuiName: "DPM++ 3M SDE",
    paperTitle: "Lu et al. / k-diffusion 3rd-order Multi-step SDE",
    paperUrl: "https://arxiv.org/abs/2211.01095",
  },
  {
    id: "dpmpp_2s_a",
    name: "DPM++ 2S A",
    codeName: "dpmpp_2s_ancestral",
    category: "stochastic",
    order: 2,
    nfePerStep: 2,
    minSteps: 24,
    optimalSteps: "25 - 35",
    optimalCfg: "5.0 - 6.5",
    convergence: "Non-Konvergen (Stokastik / SDE)",
    architectures: ["SDXL", "SD 1.5"],
    summary: "DPM-Solver++ 2nd-order single-step ancestral. Melakukan dua evaluasi fungsi per langkah sampling.",
    mechanism: "Menjalankan evaluasi fungsi ganda (2 NFE) per langkah ditambah injeksi stochastic ancestral pada setiap interval waktu.",
    pros: [
      "Akurasi kurva lokal tinggi karena single-step (tidak bergantung riwayat langkah)",
      "Variasi siluet pakaian dan pose dinamis",
    ],
    cons: [
      "Memerlukan 2 NFE per step (waktu inferensi dua kali lipat dibanding Euler/DPM++ 2M pada step yang sama)",
      "Non-konvergen",
    ],
    bestUseCases: ["Eksplorasi Konsep Dinamis", "Surreal Art"],
    recommendedSchedulers: ["Karras", "Normal"],
    comfyName: "dpmpp_2s_ancestral",
    webuiName: "DPM++ 2S a",
    paperTitle: "Lu et al. (NeurIPS 2022) - Single-Step DPM-Solver",
    paperUrl: "https://arxiv.org/abs/2211.01095",
  },
  {
    id: "ddim",
    name: "DDIM",
    codeName: "ddim",
    category: "deterministic",
    order: 1,
    nfePerStep: 1,
    minSteps: 25,
    optimalSteps: "30 - 50",
    optimalCfg: "6.0 - 8.0",
    convergence: "Konvergen (Deterministik)",
    architectures: ["SD 1.5", "SDXL"],
    summary: "Denoising Diffusion Implicit Models. Formulasi proses difusi non-Markovian deterministik yang dapat dibalik (latent inversion).",
    mechanism: "Memformulasikan proses difusi tanpa penambahan noise acak forward Markov. Trayektori sepenuhnya deterministik dan dapat di-invert kembali ke noise awal.",
    pros: [
      "Deterministik murni dan stabil untuk rekonstruksi latents",
      "Mendukung teknik DDIM Inversion, interpolasi latents, dan inpainting presisi",
      "Konsistensi frame deterministik pada animasi terarah",
    ],
    cons: [
      "Memerlukan step relatif lebih banyak (umumnya ≥30) untuk mencapai konvergensi setara solver orde-2",
      "Dapat kurang terdefinisi jika step terlalu rendah (<20)",
    ],
    bestUseCases: ["ControlNet Inpainting", "DDIM Inversion & Image Editing", "Animasi Konsisten"],
    recommendedSchedulers: ["Normal", "DDIM Uniform"],
    comfyName: "ddim",
    webuiName: "DDIM",
    paperTitle: "Song et al. (ICLR 2021) - DDIM",
    paperUrl: "https://arxiv.org/abs/2010.02502",
  },
  {
    id: "uni_pc",
    name: "UniPC",
    codeName: "uni_pc",
    category: "deterministic",
    order: 2,
    nfePerStep: 1,
    minSteps: 12,
    optimalSteps: "14 - 20",
    optimalCfg: "5.0 - 7.0",
    convergence: "Konvergen (Deterministik)",
    architectures: ["SD 1.5", "SDXL"],
    summary: "Unified Predictor-Corrector framework untuk akselerasi sampling ODE difusi dalam 14–20 langkah.",
    mechanism: "Memadukan skema predictor korektor polinomial adaptif yang menyelesaikan kurva difusi dengan evaluasi fungsi yang efisien (1 NFE per step pada mode default).",
    pros: [
      "Mencapai struktur gambar utuh pada step relatif rendah (14-20 step pada SD 1.5/SDXL)",
      "Efisien (1 NFE per step pada mode dasar)",
      "Hemat waktu komputasi untuk pengujian prompt",
    ],
    cons: [
      "Penambahan step di atas 25 umumnya tidak memberikan perubahan signifikan",
      "Kurang fleksibel untuk fine-tuning mikro pada beberapa arsitektur baru",
    ],
    bestUseCases: ["Draft Cepat", "Iterasi Prompt Real-time", "Pengujian Komposisi Awal"],
    recommendedSchedulers: ["Normal", "Karras"],
    comfyName: "uni_pc",
    webuiName: "UniPC",
    paperTitle: "Zhao et al. (NeurIPS 2023) - UniPC",
    paperUrl: "https://arxiv.org/abs/2302.04867",
  },
  {
    id: "heun",
    name: "Heun / Heun++",
    codeName: "heun",
    category: "deterministic",
    order: 2,
    nfePerStep: 2,
    minSteps: 15,
    optimalSteps: "20 - 30",
    optimalCfg: "6.0 - 7.5",
    convergence: "Konvergen (Deterministik)",
    architectures: ["SD 1.5", "SDXL"],
    summary: "Metode Runge-Kutta orde-2 klasik (trapezoidal). Menghitung slope awal dan akhir per langkah untuk akurasi kurva tinggi.",
    mechanism: "Menghitung slope awal, mengambil tentative step, lalu menghitung slope akhir untuk merata-ratakan lintasan denoise (2 NFE per step).",
    pros: [
      "Presisi numerik tinggi per langkah",
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
    paperTitle: "Karras et al. (NeurIPS 2022) - Heun 2nd Order ODE",
    paperUrl: "https://arxiv.org/abs/2206.00364",
  },
  {
    id: "lcm",
    name: "LCM (Consistency)",
    codeName: "lcm",
    category: "accelerated",
    order: 1,
    nfePerStep: 1,
    minSteps: 4,
    optimalSteps: "4 - 8",
    optimalCfg: "1.2 - 2.0",
    convergence: "Konvergen (Deterministik)",
    architectures: ["SDXL", "SD 1.5"],
    summary: "Latent Consistency Models untuk inferensi cepat (4-8 langkah) pada checkpoint yang telah di-distill.",
    mechanism: "Memetakan sembarang titik noise langsung ke trayektori manifold solusi menggunakan properti self-consistency tanpa iterasi penuh.",
    pros: [
      "Inferensi sangat cepat (4-8 step) pada checkpoint atau LoRA yang dilatih khusus dengan LCM distillation",
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
    paperTitle: "Luo et al. (2023) - Latent Consistency Models",
    paperUrl: "https://arxiv.org/abs/2310.04378",
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
    sourceReference: "Karras et al. (NeurIPS 2022) / k-diffusion",
    sourceUrl: "https://arxiv.org/abs/2206.00364",
  },
  {
    id: "sgm_uniform",
    name: "SGM Uniform",
    formula: "t_i = 1000 * (1 - i / (N - 1)) mapped to discrete σ schedule",
    category: "uniform",
    color: "#10b981", // Solid Emerald
    description: "Jadwal resmi dari Stability AI untuk SDXL dan ComfyUI dengan pembagian langkah seragam di ruang diskrit 1000 timesteps.",
    focusPhase: "Linier / Seragam",
    bestFor: "SDXL baseline ComfyUI, Euler, Euler A, Turbo. Menjaga distribusi timesteps merata di setiap tahap.",
    comfyName: "sgm_uniform",
    webuiName: "SGM Uniform",
    sourceReference: "Stability AI SDXL / ComfyUI normal_scheduler(sgm=True)",
    sourceUrl: "https://github.com/comfyanonymous/ComfyUI/blob/master/comfy/samplers.py",
  },
  {
    id: "simple",
    name: "Simple",
    formula: "t_i = t_max * (1 - i / N)",
    category: "uniform",
    color: "#38bdf8", // Solid Sky Blue
    description: "Jadwal linier diskrit langsung menuju nol pada ruang timesteps model. Merupakan scheduler default dan baseline resmi FLUX.1 di ComfyUI.",
    focusPhase: "Linier / Seragam",
    bestFor: "FLUX.1 [dev] dan FLUX.1 [schnell], baseline ComfyUI.",
    comfyName: "simple",
    webuiName: "Simple",
    sourceReference: "ComfyUI comfy/samplers.py:simple_scheduler",
    sourceUrl: "https://github.com/comfyanonymous/ComfyUI/blob/master/comfy/samplers.py",
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
    sourceReference: "Katherine Crowson / k-diffusion get_sigmas_exponential",
    sourceUrl: "https://github.com/crowsonkb/k-diffusion",
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
    sourceReference: "Nvidia Research (arXiv:2404.14507, 2024)",
    sourceUrl: "https://arxiv.org/abs/2404.14507",
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
    sourceReference: "Standard Linear Diffusion Schedule / ComfyUI normal_scheduler",
    sourceUrl: "https://github.com/comfyanonymous/ComfyUI/blob/master/comfy/samplers.py",
  },
  {
    id: "beta",
    name: "Beta",
    formula: "Smooth sigmoid transition based on Beta distribution curve",
    category: "fine_detail",
    color: "#0ea5e9", // Tech Cyan
    description: "Kurva transisi lengkung halus berbasis distribusi Beta untuk transisi frekuensi spasial kontinu.",
    focusPhase: "Noise Rendah (Detail Mikro)",
    bestFor: "Model FLUX.1 Dev dan pengujian eksperimental variasi noise frekuensi menengah-rendah.",
    comfyName: "beta",
    webuiName: "Beta",
    sourceReference: "ComfyUI comfy/samplers.py:beta_scheduler",
    sourceUrl: "https://github.com/comfyanonymous/ComfyUI/blob/master/comfy/samplers.py",
  },
  {
    id: "ddim_uniform",
    name: "DDIM Uniform",
    formula: "t_i = round(i * (1000 / N))",
    category: "uniform",
    color: "#0ea5e9", // Solid Sky Blue
    description: "Pembagian interval waktu seragam untuk formulasi non-Markovian DDIM.",
    focusPhase: "Linier / Seragam",
    bestFor: "DDIM Inpainting, Latent Inversion, dan animasi deterministik.",
    comfyName: "ddim_uniform",
    webuiName: "DDIM Uniform",
    sourceReference: "Song et al. (ICLR 2021) / ComfyUI ddim_scheduler",
    sourceUrl: "https://arxiv.org/abs/2010.02502",
  },
];

export const CURATED_RECIPES: RecipeItem[] = [
  {
    id: "illustrious_xl",
    title: "Illustrious-XL Early Release v0",
    badge: "HuggingFace Official Card",
    architecture: "Illustrious",
    samplerId: "euler_a",
    schedulerId: "sgm_uniform",
    samplerName: "Euler a (atau DPM++ 2M)",
    schedulerName: "SGM Uniform / Karras",
    steps: 24,
    cfg: 5.0,
    clipSkip: 2,
    speed: "1 NFE/step",
    useCase: "OnomaAIResearch/Illustrious-xl-early-release-v0",
    sourceName: "OnomaAI / HuggingFace",
    sourceUrl: "https://huggingface.co/OnomaAIResearch/Illustrious-xl-early-release-v0",
    officialNotes: "Rujukan Model Card: Sampler Euler a, sampling steps 20–28 (dapat hingga 40 jika prompt sangat detail), CFG scale 3.0–7.5 (rekomendasi 4.5–6.0), CLIP Skip 2, native SDXL aspect ratios.",
    whyItWorks: "Illustrious-XL dilatih dengan token conditioning Danbooru yang dioptimasi untuk variasi ekspresi karakter anime pada noise ancestral Euler a tanpa artefak lineart kaku.",
  },
  {
    id: "noobai_xl_standard",
    title: "NoobAI-XL v1.0 / v1.1 Standard",
    badge: "HuggingFace Official Card",
    architecture: "Illustrious",
    samplerId: "euler_a",
    schedulerId: "normal",
    samplerName: "Euler a",
    schedulerName: "Normal / SGM Uniform",
    steps: 28,
    cfg: 5.5,
    clipSkip: 2,
    speed: "1 NFE/step",
    useCase: "Laxhar/noobai-XL-1.0 & 1.1",
    sourceName: "Laxhar / HuggingFace",
    sourceUrl: "https://huggingface.co/Laxhar/noobai-XL-1.0",
    officialNotes: "Rujukan Model Card: Sampling Method Euler a, Steps 25~30, CFG Scale 5~6, CLIP Skip 2. Resolusi optimal 1024x1024, 832x1216, 896x1152.",
    whyItWorks: "Fine-tune anime beresolusi tinggi dengan OpenCLIP ViT-bigG + ViT-L. Euler a memberikan rendering rambut dan pakaian yang luwes tanpa over-saturation.",
  },
  {
    id: "noobai_xl_vpred",
    title: "NoobAI-XL V-Pred (v1.0)",
    badge: "V-Prediction Wajib Euler",
    architecture: "Illustrious",
    samplerId: "euler",
    schedulerId: "normal",
    samplerName: "Euler",
    schedulerName: "Normal / Simple",
    steps: 30,
    cfg: 4.5,
    clipSkip: 2,
    speed: "1 NFE/step",
    useCase: "Laxhar/noobai-XL-Vpred-1.0",
    sourceName: "Laxhar / HuggingFace",
    sourceUrl: "https://huggingface.co/Laxhar/noobai-XL-Vpred-1.0",
    officialNotes: "Peringatan Khusus Model Card: 'Euler (Other samplers will not work properly)'. Varian v-prediction ini hanya teruji stabil dengan solver Euler deterministik.",
    whyItWorks: "Objektif v-prediction memetakan kecepatan vektor langsung, sehingga solver multi-step atau SDE yang mengasumsikan epsilon-prediction konvensional menghasilkan noise divergensi.",
  },
  {
    id: "pony_v6",
    title: "Pony Diffusion V6 XL",
    badge: "Civitai Official Card",
    architecture: "Pony",
    samplerId: "dpmpp_2m",
    schedulerId: "karras",
    samplerName: "DPM++ 2M (atau Euler a)",
    schedulerName: "Karras",
    steps: 26,
    cfg: 7.0,
    clipSkip: 2,
    speed: "1 NFE/step",
    useCase: "AstraliteHeart / PurpleSmartAI Pony V6 XL",
    sourceName: "AstraliteHeart / Civitai",
    sourceUrl: "https://civitai.com/models/257749",
    officialNotes: "Rujukan Model Card: Sampler DPM++ 2M Karras atau Euler a, steps 25–30, CFG 7, CLIP Skip 2. Wajib prompt prefix score_9, score_8_up, score_7_up... Kegagalan mengatur CLIP Skip 2 merusak anatomi.",
    whyItWorks: "Pony V6 dilatih dengan penalti CLIP layer akhir sehingga CLIP Skip 2 esensial. Kurva Karras menjaga kerapatan noise mikro pada detail mata dan pakaian karakter.",
  },
  {
    id: "flux_dev",
    title: "FLUX.1 [dev] Guidance-Distilled",
    badge: "Black Forest Labs Official",
    architecture: "Flux",
    samplerId: "euler",
    schedulerId: "simple",
    samplerName: "Euler",
    schedulerName: "Simple / Beta",
    steps: 28,
    cfg: 1.0,
    clipSkip: "N/A (T5-XXL + CLIP)",
    speed: "Flow Matching ODE",
    useCase: "black-forest-labs/FLUX.1-dev",
    sourceName: "Black Forest Labs / HuggingFace",
    sourceUrl: "https://huggingface.co/black-forest-labs/FLUX.1-dev",
    officialNotes: "Rujukan Model Card: 28–50 steps, guidance_scale 3.5, continuous flow matching ODE solver. Di ComfyUI menggunakan sampler euler dan scheduler simple/beta.",
    whyItWorks: "Continuous rectified flow matching dengan MMDiT. Solver Euler linier mengikuti medan kecepatan lurus tanpa diskontinuitas.",
  },
  {
    id: "flux_schnell",
    title: "FLUX.1 [schnell] 4-Step Distilled",
    badge: "Black Forest Labs Official",
    architecture: "Flux",
    samplerId: "euler",
    schedulerId: "simple",
    samplerName: "Euler",
    schedulerName: "Simple",
    steps: 4,
    cfg: 1.0,
    clipSkip: "N/A (T5-XXL + CLIP)",
    speed: "4 Langkah Distilled",
    useCase: "black-forest-labs/FLUX.1-schnell",
    sourceName: "Black Forest Labs / HuggingFace",
    sourceUrl: "https://huggingface.co/black-forest-labs/FLUX.1-schnell",
    officialNotes: "Rujukan Model Card: guidance_scale wajib 0 (tanpa guidance embeddings), 1–4 steps, max_sequence_length 256. Inferensi berkecepatan tinggi.",
    whyItWorks: "Model telah melalui proses timestep-distillation ekstrem, memampatkan trayektori rectified flow penuh menjadi 4 langkah ortogonal.",
  },
  {
    id: "sdxl_base",
    title: "SDXL 1.0 Base",
    badge: "Stability AI Official",
    architecture: "SDXL",
    samplerId: "dpmpp_2m",
    schedulerId: "sgm_uniform",
    samplerName: "DPM++ 2M / Euler",
    schedulerName: "SGM Uniform / Karras",
    steps: 25,
    cfg: 6.0,
    clipSkip: "1 atau 2",
    speed: "1 NFE/step",
    useCase: "stabilityai/stable-diffusion-xl-base-1.0",
    sourceName: "Stability AI / HuggingFace",
    sourceUrl: "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0",
    officialNotes: "Rujukan Model Card: Native 1024x1024, dual text encoder OpenCLIP ViT-bigG + CLIP ViT-L, micro-conditioning size/crop, 20-30 steps.",
    whyItWorks: "Jadwal SGM Uniform mendistribusikan langkah secara seragam di ruang diskrit 1000 timesteps Stability AI, menjaga kontras seimbang.",
  },
  {
    id: "sd_15_inpainting",
    title: "SD 1.5 Inpainting & Latent Inversion",
    badge: "Deterministik Non-Markovian",
    architecture: "SD 1.5",
    samplerId: "ddim",
    schedulerId: "normal",
    samplerName: "DDIM",
    schedulerName: "Normal / DDIM Uniform",
    steps: 35,
    cfg: 7.0,
    clipSkip: 1,
    speed: "1 NFE/step",
    useCase: "ControlNet Inpaint, Latent Reversal / Inversion",
    sourceName: "Song et al. / ICLR 2021",
    sourceUrl: "https://arxiv.org/abs/2010.02502",
    officialNotes: "Formulasi non-Markovian deterministik memungkinkan proses rekonstruksi deterministik dan inversi latents tanpa variasi acak forward Markov.",
    whyItWorks: "DDIM memastikan piksel di luar area mask inpainting tidak bergeser nilainya, menjaga perpaduan batas inpaint mulus.",
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
      case "simple":
      case "ddim_uniform": {
        val = sigmaMax * (1 - ramp);
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

  // Copy to clipboard state & collapsible drawer state
  const [copiedSamplerId, setCopiedSamplerId] = useState<string | null>(null);
  const [expandedDrawers, setExpandedDrawers] = useState<Record<string, boolean>>({});

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCopyComfyName = (samplerId: string, comfyName: string) => {
    navigator.clipboard.writeText(comfyName);
    setCopiedSamplerId(samplerId);
    triggerToast(`ComfyUI Node ID "${comfyName}" berhasil disalin!`);
    setTimeout(() => {
      setCopiedSamplerId((prev) => (prev === samplerId ? null : prev));
    }, 2000);
  };

  const toggleDrawer = (id: string) => {
    setExpandedDrawers((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
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
        sampler: "Euler",
        scheduler: "Simple / Beta",
        steps: "4 (Schnell) / 28 - 50 (Dev)",
        cfg: "1.0 (Dev Guidance: 3.5)",
        summary: "Berdasarkan model card resmi Black Forest Labs: FLUX.1 menggunakan continuous rectified flow matching dengan solver Euler dan scheduler Simple atau Beta.",
        tip: "Di ComfyUI, pilih sampler 'euler' dan scheduler 'simple'. Atur CFG konvensional ke 1.0 dan gunakan node FluxGuidance (3.5 pada Dev, 0 pada Schnell).",
      };
    }
    if (wizardArch === "Illustrious") {
      return {
        sampler: "Euler a (atau DPM++ 2M)",
        scheduler: "SGM Uniform / Karras",
        steps: "20 - 28",
        cfg: "4.5 - 6.0",
        summary: "Berdasarkan model card resmi OnomaAI (HuggingFace): Illustrious-XL dirancang optimal pada sampler Euler a, steps 20–28, CFG 3.0–7.5, dan wajib CLIP Skip 2.",
        tip: "Gunakan CLIP Skip 2 via node CLIP Set Last Layer (-2) dan jaga CFG pada 4.5–6.0 untuk detail warna dan lineart seimbang.",
      };
    }
    if (wizardArch === "Pony") {
      return {
        sampler: "DPM++ 2M (atau Euler a)",
        scheduler: "Karras",
        steps: "25 - 30",
        cfg: "7.0",
        summary: "Berdasarkan model card resmi AstraliteHeart (Civitai): Pony V6 XL merekomendasikan DPM++ 2M Karras, steps 25–30, CFG 7.0, dan wajib CLIP Skip 2.",
        tip: "Wajib menyertakan score prefix ('score_9, score_8_up, score_7_up...') di awal prompt dan pastikan CLIP Skip bernilai 2.",
      };
    }
    if (wizardPriority === "speed") {
      return {
        sampler: "UniPC atau DPM++ 2M",
        scheduler: "SGM Uniform / Normal",
        steps: "14 - 20",
        cfg: "5.0 - 6.0",
        summary: "Evaluasi gradien multi-step efisien (1 NFE per step) untuk iterasi prompt berkecepatan tinggi.",
        tip: "UniPC pada 14–16 step menghasilkan struktur utuh untuk draft sebelum final render.",
      };
    }
    if (wizardPriority === "creative") {
      return {
        sampler: "Euler A (Ancestral)",
        scheduler: "SGM Uniform / Normal",
        steps: "20 - 28",
        cfg: "5.0 - 6.0",
        summary: "Injeksi noise stokastik ancestral untuk variasi anatomi, pose, dan ekspresi karakter yang dinamis.",
        tip: "Setiap perubahan seed atau step akan menghasilkan komposisi baru yang unik.",
      };
    }
    if (wizardPriority === "inpainting") {
      return {
        sampler: "DDIM",
        scheduler: "Normal / DDIM Uniform",
        steps: "30 - 45",
        cfg: "6.5 - 8.0",
        summary: "Jalur deterministik non-Markovian dengan latent inversion capability untuk inpainting tanpa pergeseran batas mask.",
        tip: "DDIM menjaga piksel di luar area mask tetap konsisten secara deterministik.",
      };
    }
    return {
      sampler: "DPM++ 2M SDE",
      scheduler: "Karras",
      steps: "28 - 35",
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

      {/* Header Section (Ringkas & Solid) */}
      <header className="sg-header">
        <div className="sg-header-left">
          <div className="sg-title-row">
            <h1 className="sg-title">
              <svg className="sg-title-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              Panduan Visual Sampler &amp; Scheduler
            </h1>
          </div>
          <p className="sg-subtitle">
            Referensi teknis algoritma sampling dan kurva peluruhan noise matematis untuk ComfyUI, WebUI, dan Forge.
          </p>
        </div>

        <div className="sg-header-stats-bar">
          <strong>{SAMPLER_DIRECTORY.length} Sampler</strong>
          <span className="sg-stats-dot">·</span>
          <strong>{SCHEDULER_DIRECTORY.length} Scheduler</strong>
          <span className="sg-stats-dot">·</span>
          <span>Referensi Numerik</span>
        </div>
      </header>

      {/* Navigation Tabs (Satu Baris, Bebas Emoji, SVG Lucide Monokrom) */}
      <div className="sg-nav-tabs" role="tablist">
        <button
          type="button"
          className={`sg-tab-btn ${activeTab === "directory" ? "active" : ""}`}
          onClick={() => setActiveTab("directory")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
            <path d="M6 6h10"/>
            <path d="M6 10h10"/>
          </svg>
          <span>Direktori &amp; Arsitektur Sampler</span>
          <span className="sg-tab-count">{filteredSamplers.length}</span>
        </button>

        <button
          type="button"
          className={`sg-tab-btn ${activeTab === "plotter" ? "active" : ""}`}
          onClick={() => setActiveTab("plotter")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18"/>
            <path d="m19 9-5 5-4-4-3 3"/>
          </svg>
          <span>Plotter Kurva Sigma (Scheduler)</span>
          <span className="sg-tab-count">Interactive SVG</span>
        </button>

        <button
          type="button"
          className={`sg-tab-btn ${activeTab === "recipes" ? "active" : ""}`}
          onClick={() => setActiveTab("recipes")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" x2="4" y1="21" y2="14"/>
            <line x1="4" x2="4" y1="10" y2="3"/>
            <line x1="12" x2="12" y1="21" y2="12"/>
            <line x1="12" x2="12" y1="8" y2="3"/>
            <line x1="20" x2="20" y1="21" y2="16"/>
            <line x1="20" x2="20" y1="12" y2="3"/>
            <line x1="1" x2="7" y1="14" y2="14"/>
            <line x1="9" x2="15" y1="8" y2="8"/>
            <line x1="17" x2="23" y1="16" y2="16"/>
          </svg>
          <span>Resep &amp; Matriks Rekomendasi</span>
          <span className="sg-tab-count">{CURATED_RECIPES.length}</span>
        </button>

        <button
          type="button"
          className={`sg-tab-btn ${activeTab === "battle" ? "active" : ""}`}
          onClick={() => setActiveTab("battle")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="18" r="3"/>
            <circle cx="6" cy="6" r="3"/>
            <path d="M13 6h3a2 2 0 0 1 2 2v7"/>
            <path d="M11 18H8a2 2 0 0 1-2-2V9"/>
          </svg>
          <span>Head-to-Head Battle</span>
        </button>

        <button
          type="button"
          className={`sg-tab-btn ${activeTab === "wizard" ? "active" : ""}`}
          onClick={() => setActiveTab("wizard")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="16" height="16" x="4" y="4" rx="2"/>
            <rect width="6" height="6" x="9" y="9" rx="1"/>
            <path d="M15 2v2"/>
            <path d="M15 20v2"/>
            <path d="M2 15h2"/>
            <path d="M2 9h2"/>
            <path d="M20 15h2"/>
            <path d="M20 9h2"/>
            <path d="M9 2v2"/>
            <path d="M9 20v2"/>
          </svg>
          <span>Simulator Rekomendasi Pintar</span>
        </button>
      </div>

      {/* =====================================================================
          TAB 1: Direktori Sampler & Filter
         ===================================================================== */}
      {activeTab === "directory" && (
        <section>
          {/* Controls Bar (Search Input & Dropdowns in One Compact Row) */}
          <div className="sg-controls-bar">
            <div className="sg-search-wrap">
              <svg className="sg-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="Cari sampler: dpmpp_2m, euler, unipc..."
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
              <option value="all">Semua Sifat (Deterministik / Stokastik)</option>
              <option value="deterministic">Deterministik</option>
              <option value="stochastic">Stokastik</option>
              <option value="flow_matching">Flow Matching</option>
              <option value="accelerated">Accelerated</option>
            </select>

            <select
              value={archFilter}
              onChange={(e) => setArchFilter(e.target.value)}
              className="sg-filter-select"
            >
              <option value="all">Semua Arsitektur Model</option>
              <option value="SDXL">SDXL</option>
              <option value="Pony">Pony Diffusion</option>
              <option value="Illustrious">Illustrious XL</option>
              <option value="Flux">FLUX.1</option>
              <option value="SD 1.5">SD 1.5</option>
            </select>

            <div className="sg-controls-count">
              Menampilkan <strong>{filteredSamplers.length}</strong> sampler
            </div>
          </div>

          {/* Sampler Cards Grid (Zero Nested Boxes, Clear 3-Col Specs, Vertical Characteristics) */}
          <div className="sg-grid">
            {filteredSamplers.map((sampler) => (
              <div key={sampler.id} className="sg-card">
                {/* 1. Header Kartu & ID Teknis */}
                <div className="sg-card-top">
                  <div className="sg-card-header-row">
                    <h3 className="sg-card-title">{sampler.name}</h3>
                    <span className={`sg-nature-badge ${sampler.category}`}>
                      {sampler.category === "deterministic" && "DETERMINISTIK"}
                      {sampler.category === "stochastic" && "STOKASTIK"}
                      {sampler.category === "flow_matching" && "FLOW MATCHING"}
                      {sampler.category === "accelerated" && "ACCELERATED"}
                    </span>
                  </div>

                  <div className="sg-card-id-row">
                    <button
                      type="button"
                      className="sg-id-chip comfy"
                      onClick={() => handleCopyComfyName(sampler.id, sampler.comfyName)}
                      title="Klik untuk salin nama node ComfyUI"
                    >
                      <span className="sg-id-chip-label">ComfyUI:</span>
                      <code className="sg-id-code">{sampler.comfyName}</code>
                      {copiedSamplerId === sampler.id ? (
                        <svg className="sg-copy-icon copied" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg className="sg-copy-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                      )}
                    </button>
                    <span className="sg-id-divider">·</span>
                    <span className="sg-id-chip webui">
                      <span className="sg-id-chip-label">WebUI:</span>
                      <code className="sg-id-code">{sampler.webuiName}</code>
                    </span>
                  </div>
                </div>

                {/* 2. Bar Spesifikasi Utama (3 Kolom Saja - Tanpa Duplikasi Sifat Aliran) */}
                <div className="sg-specs-strip">
                  <div className="sg-specs-strip-col">
                    <span className="sg-specs-strip-label">ORDE / NFE</span>
                    <span className="sg-specs-strip-val">{sampler.order}nd / {sampler.nfePerStep} NFE</span>
                  </div>
                  <div className="sg-specs-strip-col">
                    <span className="sg-specs-strip-label">RENTANG STEPS</span>
                    <span className="sg-specs-strip-val steps">{sampler.optimalSteps}</span>
                  </div>
                  <div className="sg-specs-strip-col">
                    <span className="sg-specs-strip-label">RENTANG CFG</span>
                    <span className="sg-specs-strip-val">{sampler.optimalCfg}</span>
                  </div>
                </div>

                {/* 3. Ringkasan & Karakteristik Vertikal (Bebas Kotak Bertumpuk) */}
                <p className="sg-card-summary">{sampler.summary}</p>

                <div className="sg-vertical-characteristics">
                  <div className="sg-char-group">
                    <div className="sg-char-heading pros">
                      <span className="sg-char-sign">+</span>
                      <span>Karakteristik Utama (Kelebihan)</span>
                    </div>
                    <ul className="sg-char-list">
                      {sampler.pros.map((pro, idx) => (
                        <li key={idx} className="sg-char-item">
                          <span className="sg-bullet pros">✓</span>
                          <span className="sg-char-text pros">{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="sg-char-group">
                    <div className="sg-char-heading cons">
                      <span className="sg-char-sign">–</span>
                      <span>Batasan Teknis (Kelemahan)</span>
                    </div>
                    <ul className="sg-char-list">
                      {sampler.cons.map((con, idx) => (
                        <li key={idx} className="sg-char-item">
                          <span className="sg-bullet cons">–</span>
                          <span className="sg-char-text cons">{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 4. Collapsible Drawer / Baris Mikro: Prinsip Numerik & Rujukan Ilmiah */}
                <div className="sg-drawer-wrap">
                  <button
                    type="button"
                    className={`sg-drawer-trigger ${expandedDrawers[sampler.id] ? "expanded" : ""}`}
                    onClick={() => toggleDrawer(sampler.id)}
                  >
                    <span className="sg-drawer-trigger-text">
                      Lihat Prinsip Numerik &amp; Paper ({sampler.paperTitle.split(" - ")[0] || sampler.paperTitle})
                    </span>
                    <svg
                      className={`sg-drawer-arrow ${expandedDrawers[sampler.id] ? "rotated" : ""}`}
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>

                  {expandedDrawers[sampler.id] && (
                    <div className="sg-drawer-content">
                      <div className="sg-drawer-section">
                        <strong className="sg-drawer-label">Prinsip Numerik:</strong>
                        <p className="sg-drawer-body">{sampler.mechanism}</p>
                      </div>
                      <div className="sg-drawer-section">
                        <strong className="sg-drawer-label">Rujukan Ilmiah:</strong>
                        <div className="sg-drawer-paper-link-row">
                          <span className="sg-drawer-paper-title">{sampler.paperTitle}</span>
                          <a
                            href={sampler.paperUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sg-drawer-paper-link"
                          >
                            <span>Paper</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Footer Kartu */}
                <div className="sg-card-footer">
                  <div className="sg-arch-pills">
                    {sampler.architectures.map((arch) => (
                      <span key={arch} className="sg-arch-pill">
                        {arch}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="sg-studio-btn"
                      style={{ background: "#18181b", borderColor: "#3f3f46", color: "#38bdf8" }}
                      onClick={() => {
                        bridgeToVramProfiler(navigate, {
                          source: "sampler-guide",
                          timestamp: Date.now(),
                          sampler: sampler.name,
                          steps: parseInt(sampler.optimalSteps.split("-")[0].trim(), 10) || 24,
                          baseModel: sampler.architectures[0] || "SDXL",
                        });
                      }}
                      title="Uji beban VRAM untuk sampler &amp; steps ini di VRAM Profiler"
                    >
                      <span>Uji VRAM ➔</span>
                    </button>
                    <button
                      type="button"
                      className="sg-studio-btn"
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18" />
                  <path d="m19 9-5 5-4-4-3 3" />
                </svg>
                <span>Kurva Peluruhan Noise Matematis (Sigma Plotter)</span>
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
                  border: "1px solid #3f3f46",
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
                  <strong style={{ color: "#f4f4f5" }}>σ = {hoveredPoint.sigma}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Phase Guides */}
          <div className="sg-phase-guides">
            <div className="sg-phase-box">
              <span className="sg-phase-title high">
                <span className="sg-phase-dot high" />
                <span>Fase Awal: High Noise (σ &gt; 5.0)</span>
              </span>
              <p className="sg-phase-desc">
                Membentuk komposisi global, pose tubuh dasar, siluet figur, dan blocking latar belakang. Perubahan di fase ini mempengaruhi orientasi gambar.
              </p>
            </div>

            <div className="sg-phase-box">
              <span className="sg-phase-title mid">
                <span className="sg-phase-dot mid" />
                <span>Fase Tengah: Mid Noise (1.0 &lt; σ &lt; 5.0)</span>
              </span>
              <p className="sg-phase-desc">
                Mendefinisikan detail anatomi, lipatan pakaian, proporsi wajah, perspektif furnitur, dan kontur pencahayaan global.
              </p>
            </div>

            <div className="sg-phase-box">
              <span className="sg-phase-title low">
                <span className="sg-phase-dot low" />
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
              <div key={recipe.id} className="sg-card sg-recipe-card">
                <div className="sg-card-header">
                  <div className="sg-card-title-group">
                    <span className={`sg-recipe-badge ${recipe.badge.toLowerCase().includes("wajib") || recipe.badge.toLowerCase().includes("peringatan") ? "warning" : recipe.badge.toLowerCase().includes("flow") || recipe.badge.toLowerCase().includes("distilled") ? "flux" : "standard"}`}>
                      {recipe.badge}
                    </span>
                    <h3 className="sg-card-title" style={{ marginTop: "6px" }}>
                      {recipe.title}
                    </h3>
                  </div>
                  <span className="sg-arch-pill" style={{ fontSize: "11px", padding: "4px 8px" }}>
                    {recipe.architecture}
                  </span>
                </div>

                <div className="sg-specs-strip">
                  <div className="sg-specs-strip-col">
                    <span className="sg-specs-strip-label">Sampler</span>
                    <span className="sg-specs-strip-val">
                      {recipe.samplerName}
                    </span>
                  </div>
                  <div className="sg-specs-strip-col">
                    <span className="sg-specs-strip-label">Scheduler</span>
                    <span className="sg-specs-strip-val" style={{ color: "#34d399" }}>
                      {recipe.schedulerName}
                    </span>
                  </div>
                  <div className="sg-specs-strip-col">
                    <span className="sg-specs-strip-label">Steps / CFG</span>
                    <span className="sg-specs-strip-val steps">{recipe.steps} / {recipe.cfg.toFixed(1)}</span>
                  </div>
                </div>

                <div style={{ fontSize: "12px", color: "#a1a1aa", lineHeight: 1.5 }}>
                  <strong style={{ color: "#e4e4e7" }}>Target Model: </strong>
                  <span style={{ color: "#d4d4d8" }}>{recipe.useCase}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", background: "#09090b", padding: "6px 10px", borderRadius: "6px", border: "1px solid #27272a", marginTop: "2px" }}>
                  <span><strong style={{ color: "#a1a1aa" }}>CLIP Skip: </strong><code style={{ color: "#fbbf24", background: "#18181b", border: "1px solid #27272a", padding: "1px 6px", borderRadius: "3px" }}>{recipe.clipSkip}</code></span>
                  <span>
                    <strong style={{ color: "#a1a1aa" }}>Model Card: </strong>
                    <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#60a5fa", textDecoration: "underline", textUnderlineOffset: "3px", fontWeight: 600 }}>
                      {recipe.sourceName} ↗
                    </a>
                  </span>
                </div>

                <div style={{ fontSize: "11px", color: "#a1a1aa", background: "#09090b", padding: "8px 12px", borderRadius: "4px", border: "1px solid #27272a", borderLeft: "3px solid #52525b", marginTop: "2px", fontStyle: "italic", lineHeight: 1.45 }}>
                  "{recipe.officialNotes}"
                </div>

                <div className="sg-recipe-why">
                  <strong>Analisis Teknis: </strong>
                  {recipe.whyItWorks}
                </div>

                <div className="sg-card-footer">
                  <span style={{ fontSize: "11px", color: "#a1a1aa" }}>{recipe.speed}</span>

                  <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="sg-studio-btn"
                      style={{ background: "#18181b", borderColor: "#3f3f46", color: "#38bdf8" }}
                      onClick={() => {
                        bridgeToVramProfiler(navigate, {
                          source: "sampler-guide",
                          timestamp: Date.now(),
                          sampler: `${recipe.samplerName} ${recipe.schedulerName}`,
                          steps: recipe.steps,
                          cfgScale: recipe.cfg,
                          baseModel: recipe.architecture,
                        });
                      }}
                      title="Uji kebutuhan VRAM untuk resep ini di VRAM Profiler"
                    >
                      <span>Uji VRAM ➔</span>
                    </button>
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
                  <span className={`sg-nature-badge ${itemA.category}`}>{itemA.category}</span>
                </td>
                <td>
                  <span className={`sg-nature-badge ${itemB.category}`}>{itemB.category}</span>
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
                <td className="metric-col">Kebutuhan Komputasi (NFE)</td>
                <td>
                  <strong>{itemA.nfePerStep} Forward Pass / step</strong> ({itemA.nfePerStep === 1 ? "Efisien - 1 Evaluasi per step" : "Evaluasi Ganda - 2 NFE per step"})
                </td>
                <td>
                  <strong>{itemB.nfePerStep} Forward Pass / step</strong> ({itemB.nfePerStep === 1 ? "Efisien - 1 Evaluasi per step" : "Evaluasi Ganda - 2 NFE per step"})
                </td>
              </tr>
              <tr>
                <td className="metric-col">Rujukan Makalah Ilmiah</td>
                <td>
                  <a
                    href={itemA.paperUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#60a5fa", textDecoration: "underline", textUnderlineOffset: "3px", fontSize: "12px", fontWeight: 600 }}
                  >
                    {itemA.paperTitle} ↗
                  </a>
                </td>
                <td>
                  <a
                    href={itemB.paperUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#34d399", textDecoration: "underline", textUnderlineOffset: "3px", fontSize: "12px", fontWeight: 600 }}
                  >
                    {itemB.paperTitle} ↗
                  </a>
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
            <h2 className="sg-wizard-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="16" height="16" x="4" y="4" rx="2" />
                <rect width="6" height="6" x="9" y="9" rx="1" />
                <path d="M15 2v2" />
                <path d="M15 20v2" />
                <path d="M2 15h2" />
                <path d="M2 9h2" />
                <path d="M20 15h2" />
                <path d="M20 9h2" />
                <path d="M9 2v2" />
                <path d="M9 20v2" />
              </svg>
              <span>Simulator Rekomendasi Pintar</span>
            </h2>
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
                <strong>Tips:</strong> {wizardResult.tip}
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <span style={{ color: "#d4d4d8", fontWeight: 700 }}>Prinsip Akurasi Teknis:</span>
        </div>
        <p style={{ margin: 0 }}>
          Nilai steps dan CFG yang tercantum pada seluruh panduan ini adalah <strong>titik awal eksperimen praktis</strong>, bukan nilai universal atau spesifikasi mutlak. Hasil akhir difusi sangat dipengaruhi oleh arsitektur checkpoint (SD 1.5, SDXL, Illustrious, NoobAI, FLUX.1), VAE, LoRA stack, CLIP Skip, resolusi gambar, scheduler yang dipasangkan, dan seed. Pengujian perbandingan antar konfigurasi yang valid menuntut kontrol variabel ketat (checkpoint, prompt, negative prompt, seed, dan resolusi harus identik).
        </p>
      </footer>
    </div>
  );
}
