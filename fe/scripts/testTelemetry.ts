// ============================================================================
// Automated Verification Script for ComfyUI Telemetry Logic
// Tests:
// 1. Error Translator (CUDA OOM, Shape Mismatch, Missing File, NaN Precision)
// 2. Bottleneck Diagnostics:
//    - DynamicVRAM comfy-aimdo (>85% RAM, >2.5s/step, >120s total)
//    - Multi-Stage Heavy Pipeline (FaceDetailer / UltimateSDUpscale >90s)
//    - High VRAM Pressure (>90% VRAM)
//    - Cold Start / Model Swap
//    - Optimal Baseline Speed
// ============================================================================

import { translateComfyError } from '../src/utils/comfyErrorTranslator';
import { analyzeBottlenecks } from '../src/utils/comfyBottleneckAnalyzer';
import type { HardwareSnapshot } from '../src/types/comfyTelemetry';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${testName}`);
    failCount++;
  }
}

console.log('--- 1. Testing Rule-Based Error Translator ---');

// 1.1 CUDA OOM
const oomResult = translateComfyError(
  'torch.cuda.OutOfMemoryError: CUDA out of memory. Tried to allocate 2.40 GiB',
  'OutOfMemoryError',
  'KSampler'
);
assert(oomResult.category === 'oom', 'OOM category detected correctly');
assert(oomResult.title.includes('Kehabisan VRAM'), 'OOM title translated to Indonesian');
assert(oomResult.explanation.includes('Resolusi gambar'), 'OOM explanation matches specification');

// 1.2 Shape Mismatch
const shapeResult = translateComfyError(
  'RuntimeError: mat1 and mat2 shapes cannot be multiplied (2x768 and 1024x1024)',
  'RuntimeError',
  'LoraLoader'
);
assert(shapeResult.category === 'shape_mismatch', 'Shape mismatch category detected correctly');
assert(shapeResult.title.includes('Arsitektur Model & LoRA Tidak Cocok'), 'Shape mismatch title translated correctly');
assert(shapeResult.explanation.includes('berbeda basis arsitektur'), 'Shape mismatch explanation matches specification');

// 1.3 Missing Model / Validation
const missingResult = translateComfyError(
  "Prompt outputs failed validation: Value not in list: checkpoint_name: 'flux1-dev-fp8.safetensors'",
  'ValueError',
  'CheckpointLoaderSimple'
);
assert(missingResult.category === 'missing_file', 'Missing file category detected correctly');
assert(missingResult.title.includes('File Model / LoRA Tidak Ditemukan'), 'Missing file title translated correctly');

// 1.4 NaN Calculation Precision
const nanResult = translateComfyError(
  'RuntimeError: Tensor contains NaN values during VAE decode step',
  'RuntimeError',
  'VAEDecode'
);
assert(nanResult.category === 'nan_precision', 'NaN precision category detected correctly');
assert(nanResult.title.includes('Kerusakan Kalkulasi Precision'), 'NaN precision title translated correctly');
assert(nanResult.solution.includes('--fp16-vae'), 'NaN precision solution includes flag guidance');

console.log('\n--- 2. Testing Smarter Bottleneck Analyzer (DynamicVRAM & Multi-Stage) ---');

const baseHw: HardwareSnapshot = {
  gpuName: 'NVIDIA GeForce RTX 4050 Laptop GPU',
  vramTotalGb: 6.0,
  vramUsedGb: 1.1, // Artificially low reported VRAM due to DynamicVRAM layer streaming!
  vramFreeGb: 4.9,
  vramPercent: 18.3,
  ramTotalGb: 16.0,
  ramUsedGb: 14.6,
  ramFreeGb: 1.4,
  ramPercent: 91.2, // System RAM > 85%!
  os: 'Windows 11',
  envInfo: 'PyTorch 2.12.1+cu130',
};

// 2.1 DynamicVRAM Offload (The exact 468.38s run with comfy-aimdo)
const dynamicVramDiag = analyzeBottlenecks({
  durationSeconds: 468.38,
  totalSteps: 45,
  secondsPerStep: 10.41,
  hardwareSnapshot: baseHw,
  hasFaceDetailer: true,
});
assert(dynamicVramDiag.tag === 'VRAM Offload Detected', 'DynamicVRAM tagged as VRAM Offload Detected');
assert(dynamicVramDiag.title.includes('DynamicVRAM') && dynamicVramDiag.title.includes('comfy-aimdo'), 'DynamicVRAM comfy-aimdo title triggered');
assert(dynamicVramDiag.explanation.includes('SDXL + LoRA + Detailer'), 'DynamicVRAM explanation correctly mentions SDXL + LoRA + Detailer offload');

// 2.2 Step Speed > 2.5s/step trigger for DynamicVRAM
const slowStepDiag = analyzeBottlenecks({
  durationSeconds: 58.0,
  totalSteps: 20,
  secondsPerStep: 2.9, // > 2.5 s/it
  hardwareSnapshot: { ...baseHw, ramPercent: 70 },
});
assert(slowStepDiag.title.includes('DynamicVRAM'), 'Step speed > 2.5s triggers DynamicVRAM diagnosis');

// 2.3 Multi-Stage Heavy Pipeline (FaceDetailer > 90s, when RAM is under 85% and step speed <= 2.5s)
const normalRamHw: HardwareSnapshot = {
  ...baseHw,
  ramPercent: 75.0,
};
const multiStageDiag = analyzeBottlenecks({
  durationSeconds: 98.0,
  totalSteps: 50,
  secondsPerStep: 1.96, // <= 2.5 s/it
  hardwareSnapshot: normalRamHw,
  hasFaceDetailer: true,
});
assert(multiStageDiag.tag === 'Heavy Post-Processing Node', 'Multi-stage tagged as Heavy Post-Processing Node');
assert(multiStageDiag.title.includes('Beban Ganda: Render Utama + Inpaint FaceDetailer'), 'Multi-stage Beban Ganda title verified');
assert(multiStageDiag.explanation.includes('FaceDetailer pada resolusi crop'), 'Multi-stage FaceDetailer crop explanation verified');

// 2.4 High VRAM Pressure (>90% VRAM saturation)
const highVramHw: HardwareSnapshot = {
  ...normalRamHw,
  vramUsedGb: 5.6,
  vramPercent: 93.3,
};
const highVramDiag = analyzeBottlenecks({
  durationSeconds: 30.0,
  totalSteps: 20,
  secondsPerStep: 1.5,
  hardwareSnapshot: highVramHw,
});
assert(highVramDiag.tag === 'VRAM Offload Detected', 'High VRAM Pressure detected when VRAM > 90%');
assert(highVramDiag.title.includes('VRAM Penuh & Terjadi Offloading'), 'High VRAM Pressure title matches');

// 2.5 Optimal Baseline Speed
const optimalDiag = analyzeBottlenecks({
  durationSeconds: 6.2,
  totalSteps: 25,
  secondsPerStep: 0.25,
  hardwareSnapshot: normalRamHw,
});
assert(optimalDiag.tag === 'Optimal Speed', 'Optimal speed tagged for fast baseline run');

console.log(`\n========================================`);
console.log(`Results: ${passCount} Passed, ${failCount} Failed`);
console.log(`========================================`);

if (failCount > 0) {
  process.exit(1);
}
