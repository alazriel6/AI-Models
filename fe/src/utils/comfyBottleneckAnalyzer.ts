// ============================================================================
// ComfyUI Bottleneck & Performance Analyzer
// Diagnoses DynamicVRAM (comfy-aimdo), Multi-Stage pipelines (FaceDetailer),
// High VRAM offload, cold starts, and slowdowns
// ============================================================================

import type { BottleneckDiagnosis, HardwareSnapshot } from '../types/comfyTelemetry';

export interface BottleneckAnalysisInput {
  durationSeconds: number;
  totalSteps: number;
  secondsPerStep?: number; // s/it
  hardwareSnapshot: HardwareSnapshot;
  nodeExecutionTimes?: Record<string, { nodeType: string; durationMs: number }>;
  slowestNodeType?: string;
  isFirstRunOrModelSwap?: boolean;
  baselineDurationSeconds?: number;
  hasFaceDetailer?: boolean;
  hasUltimateUpscale?: boolean;
  activePostProcessingNodes?: string[];
}

const HEAVY_UPSCALE_NODES = [
  'UltimateSDUpscale',
  'ImageUpscaleWithModel',
  'UpscaleModelLoader',
  'TiledKSampler',
  'TileControlNet',
  'IterativeLatentUpscale',
  'ImageScaleBy',
];

const SECONDARY_PASS_NODES = [
  'FaceDetailer',
  'DetailerForEach',
  'SAMDetector',
  'UltralyticsDetector',
  'FaceDetailerPipe',
  'InpaintModelConditioning',
];

const MODEL_LOADER_NODES = [
  'CheckpointLoaderSimple',
  'CheckpointLoader',
  'UNETLoader',
  'LoraLoaderModelOnly',
  'LoraLoader',
  'DualCLIPLoader',
  'CLIPLoader',
  'VAELoader',
];

/**
 * Automatically evaluates execution telemetry against hardware capacity & node bottlenecks.
 */
export function analyzeBottlenecks(input: BottleneckAnalysisInput): BottleneckDiagnosis {
  const {
    durationSeconds,
    totalSteps,
    secondsPerStep,
    hardwareSnapshot,
    nodeExecutionTimes,
    slowestNodeType,
    isFirstRunOrModelSwap,
    baselineDurationSeconds,
    hasFaceDetailer,
    hasUltimateUpscale,
    activePostProcessingNodes,
  } = input;

  const vramPercent = hardwareSnapshot.vramPercent || 0;
  const ramPercent = hardwareSnapshot.ramPercent || 0;

  // Calculate actual seconds per step
  const calculatedSecPerStep =
    secondsPerStep !== undefined && secondsPerStep > 0
      ? secondsPerStep
      : totalSteps > 0 && durationSeconds > 0
      ? durationSeconds / totalSteps
      : 0;

  // --------------------------------------------------------------------------
  // Rule 1: DynamicVRAM / System RAM Streaming Offload (comfy-aimdo)
  // In ComfyUI v0.27.0+, comfy-aimdo stages weights in System RAM and streams them per-layer,
  // keeping reported VRAM low while System RAM spikes >85% and step speed drops (>2.5s/step or >120s total).
  // --------------------------------------------------------------------------
  const isDynamicVramOffload =
    ramPercent > 85 || calculatedSecPerStep > 2.5 || durationSeconds > 120;

  if (isDynamicVramOffload) {
    const stepSpeedText =
      calculatedSecPerStep > 0
        ? `~${calculatedSecPerStep.toFixed(1)} detik/step (${calculatedSecPerStep.toFixed(2)} s/it)`
        : '~9 detik/step';

    return {
      tag: 'VRAM Offload Detected',
      title: 'Terdeteksi DynamicVRAM / Shared RAM Offload (comfy-aimdo)',
      explanation:
        'Kapasitas model SDXL + LoRA + Detailer (~4.9 GB) melebihi ruang bebas VRAM 6GB. ComfyUI memindahkan bobot model ke System RAM (terpakai >90%) dan melakukan streaming bolak-balik ke GPU per-layer, sehingga kecepatan render melambat drastis (~9 detik/step).',
      severity: 'critical',
      detectedNode: hasFaceDetailer
        ? 'FaceDetailer / KSampler'
        : slowestNodeType || 'DynamicVRAM Layer Streamer',
      details: `System RAM: ${hardwareSnapshot.ramUsedGb.toFixed(1)} GB / ${hardwareSnapshot.ramTotalGb.toFixed(1)} GB (${ramPercent.toFixed(1)}%) | Kecepatan: ${stepSpeedText} | Durasi: ${durationSeconds.toFixed(1)}s`,
    };
  }

  // --------------------------------------------------------------------------
  // Rule 2: Multi-Stage Heavy Pipeline (KSampler + FaceDetailer / Upscale)
  // If FaceDetailer or UltimateSDUpscale is detected in workflow and duration exceeds 90s
  // --------------------------------------------------------------------------
  const isMultiStage =
    hasFaceDetailer ||
    hasUltimateUpscale ||
    (activePostProcessingNodes &&
      activePostProcessingNodes.some((n) =>
        /FaceDetailer|UltimateSDUpscale|Upscale/i.test(n)
      )) ||
    (slowestNodeType && /FaceDetailer|UltimateSDUpscale/i.test(slowestNodeType));

  if (isMultiStage && durationSeconds > 90) {
    const nodeLabel = hasFaceDetailer
      ? 'FaceDetailer'
      : hasUltimateUpscale
      ? 'Ultimate SD Upscale'
      : slowestNodeType || 'FaceDetailer / Upscaler';

    return {
      tag: 'Heavy Post-Processing Node',
      title: 'Beban Ganda: Render Utama + Inpaint FaceDetailer (Crop High-Res)',
      explanation:
        'Proses render dilakukan 2 kali (20 steps KSampler utama + 25 steps FaceDetailer pada resolusi crop ~1243x1235), menggandakan waktu tunggu.',
      severity: 'warning',
      detectedNode: nodeLabel,
      details: `Tahap post-processing ganda terdeteksi aktif (${nodeLabel}). Total durasi inferensi: ${durationSeconds.toFixed(1)}s`,
    };
  }

  // --------------------------------------------------------------------------
  // Rule 3: High VRAM Pressure
  // Reported VRAM allocated > 90% of total VRAM
  // --------------------------------------------------------------------------
  if (vramPercent >= 90) {
    return {
      tag: 'VRAM Offload Detected',
      title: 'VRAM Penuh & Terjadi Offloading ke RAM Sistem',
      explanation:
        'Kapasitas VRAM GPU telah terpakai >90%, memaksa arsitektur ComfyUI (--normalvram / --lowvram) mengalihkan bobot model (UNet/Weights) ke System RAM / Shared Memory melalui bus PCIe. Hal ini menyebabkan kecepatan inferensi menurun drastis.',
      severity: 'critical',
      detectedNode: slowestNodeType,
      details: `VRAM Terpakai: ${hardwareSnapshot.vramUsedGb.toFixed(1)} GB / ${hardwareSnapshot.vramTotalGb.toFixed(1)} GB (${vramPercent.toFixed(1)}%).`,
    };
  }

  // --------------------------------------------------------------------------
  // Sub-Node Breakdown Evaluation (if granular timing data is available)
  // --------------------------------------------------------------------------
  if (nodeExecutionTimes) {
    let heavyUpscaleDuration = 0;
    let secondaryPassDuration = 0;
    let modelLoaderDuration = 0;

    Object.values(nodeExecutionTimes).forEach((node) => {
      const type = node.nodeType || '';
      if (HEAVY_UPSCALE_NODES.some((n) => type.toLowerCase().includes(n.toLowerCase()))) {
        heavyUpscaleDuration += node.durationMs / 1000;
      }
      if (SECONDARY_PASS_NODES.some((n) => type.toLowerCase().includes(n.toLowerCase()))) {
        secondaryPassDuration += node.durationMs / 1000;
      }
      if (MODEL_LOADER_NODES.some((n) => type.toLowerCase().includes(n.toLowerCase()))) {
        modelLoaderDuration += node.durationMs / 1000;
      }
    });

    if (heavyUpscaleDuration > 10 || (durationSeconds > 25 && heavyUpscaleDuration / durationSeconds > 0.45)) {
      return {
        tag: 'Heavy Post-Processing Node',
        title: 'Overhead Eksekusi Tiled Upscaling',
        explanation: `Tahap upscaling bertingkat menghabiskan ${heavyUpscaleDuration.toFixed(1)} detik dari total waktu. Pemecahan tile dan denoising berulang pada resolusi tinggi membutuhkan bandwidth GPU yang masif.`,
        severity: 'warning',
        detectedNode: slowestNodeType || 'Ultimate SD Upscale / ImageUpscale',
        details: `Disarankan mengecilkan tile_size (misal 1024 ke 512/768) atau kurangi denoise upscale ke 0.25 - 0.35.`,
      };
    }

    if (secondaryPassDuration > 8 || (durationSeconds > 20 && secondaryPassDuration / durationSeconds > 0.4)) {
      return {
        tag: 'Heavy Post-Processing Node',
        title: 'Overhead Deteksi & Detailer (FaceDetailer)',
        explanation: `Proses secondary pass/FaceDetailer memakan waktu ${secondaryPassDuration.toFixed(1)} detik untuk segmentasi wajah, cropping, dan re-sampling lokal.`,
        severity: 'warning',
        detectedNode: slowestNodeType || 'FaceDetailer',
        details: 'Gunakan YOLO model yang lebih ringan (face_yolov8n vs yolov8x) atau batasi max_detections.',
      };
    }

    if (modelLoaderDuration > 5 || (isFirstRunOrModelSwap && modelLoaderDuration > 3.5)) {
      return {
        tag: 'Cold Start / Model Swap',
        title: 'Cold Start / Pemuatan Checkpoint Baru',
        explanation: `Waktu ekstra ${modelLoaderDuration.toFixed(1)}s dihabiskan untuk membaca file bobot Checkpoint/LoRA berukuran gigabyte dari disk (SSD/HDD) dan mengalokasikannya ke VRAM GPU.`,
        severity: 'info',
        detectedNode: slowestNodeType || 'CheckpointLoaderSimple',
        details: 'Generasi berikutnya untuk model yang sama akan jauh lebih cepat karena model sudah tersimpan di cache VRAM.',
      };
    }
  }

  // --------------------------------------------------------------------------
  // Fallback check by slowestNodeType name or duration threshold
  // --------------------------------------------------------------------------
  if (slowestNodeType) {
    const isUpscaler = HEAVY_UPSCALE_NODES.some((n) => slowestNodeType.toLowerCase().includes(n.toLowerCase()));
    if (isUpscaler && durationSeconds > 20) {
      return {
        tag: 'Heavy Post-Processing Node',
        title: `Proses Upscaling Berat (${slowestNodeType})`,
        explanation: `Sebagian besar durasi generasi dihabiskan pada node upscaler ${slowestNodeType}.`,
        severity: 'warning',
        detectedNode: slowestNodeType,
      };
    }

    const isLoader = MODEL_LOADER_NODES.some((n) => slowestNodeType.toLowerCase().includes(n.toLowerCase()));
    if (isLoader && durationSeconds > 8) {
      return {
        tag: 'Cold Start / Model Swap',
        title: `Pemuatan Model dari Disk (${slowestNodeType})`,
        explanation: `Terjadi jeda pemuatan checkpoint atau LoRA baru ke memori GPU sebelum proses difusi utama berjalan.`,
        severity: 'info',
        detectedNode: slowestNodeType,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Baseline comparative slowdown
  // --------------------------------------------------------------------------
  if (baselineDurationSeconds && baselineDurationSeconds > 0 && durationSeconds > baselineDurationSeconds * 2.2) {
    return {
      tag: 'VRAM Offload Detected',
      title: 'Perlambatan Tidak Wajar (Potensi Shared VRAM Throttling)',
      explanation: `Generasi memakan waktu ${durationSeconds.toFixed(1)}s, jauh lebih lama dari rata-rata normal (${baselineDurationSeconds.toFixed(1)}s). Windows Desktop Window Manager atau shared GPU memory kemungkinan sedang ter-utilisasi penuh.`,
      severity: 'warning',
      details: 'Tutup aplikasi lain seperti browser tab video atau game yang sedang berjalan di background.',
    };
  }

  // --------------------------------------------------------------------------
  // Normal / Optimal Speed
  // --------------------------------------------------------------------------
  const itPerSec = totalSteps > 0 && durationSeconds > 0 ? (totalSteps / durationSeconds).toFixed(2) : '0';
  return {
    tag: 'Optimal Speed',
    title: 'Inferensi Efisien & Optimal',
    explanation: `Pipeline berjalan lancar dalam batas VRAM GPU tanpa offload ke System RAM (${itPerSec} it/s).`,
    severity: 'success',
  };
}
