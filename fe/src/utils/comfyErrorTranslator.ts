// ============================================================================
// ComfyUI Human-Friendly Error Translator
// Translates raw Python tracebacks & exceptions into clear, actionable Indonesian / English
// ============================================================================

import type { ErrorTranslation } from '../types/comfyTelemetry';

interface ErrorPatternRule {
  category: ErrorTranslation['category'];
  patterns: (string | RegExp)[];
  title: string;
  explanation: string;
  solution: string;
}

const ERROR_RULES: ErrorPatternRule[] = [
  {
    category: 'oom',
    patterns: [
      'CUDA out of memory',
      'OutOfMemoryError',
      'torch.cuda.OutOfMemoryError',
      'Tried to allocate',
      'GPU memory full',
      'allocator_cuda.cpp',
    ],
    title: 'Kehabisan VRAM (Out of Memory)',
    explanation:
      'Resolusi gambar, batch size, atau proses upscale terlalu berat untuk kapasitas VRAM GPU saat ini.',
    solution:
      'Turunkan resolusi awal (misal 1024x1024 ke 832x1216), kurangi tile size pada Upscaler (1024 ke 512), kurangi batch count menjadi 1, atau jalankan ComfyUI dengan argumen `--lowvram` atau `--normalvram`.',
  },
  {
    category: 'shape_mismatch',
    patterns: [
      'mat1 and mat2 shapes cannot be multiplied',
      'size mismatch for',
      'RuntimeError: shape',
      'shapes cannot be multiplied',
      'dimension specified as',
    ],
    title: 'Arsitektur Model & LoRA Tidak Cocok',
    explanation:
      'Kamu mencoba menggabungkan LoRA, VAE, atau ControlNet yang berbeda basis arsitektur dengan Checkpoint utama (misal: LoRA SD 1.5 dipakai di model SDXL/Illustrious/Flux).',
    solution:
      'Periksa kembali kompatibilitas model. Pastikan Checkpoint dan semua LoRA yang terpasang memiliki basis arsitektur yang seragam (misal: SDXL hanya dengan LoRA SDXL, Flux dengan LoRA Flux).',
  },
  {
    category: 'missing_file',
    patterns: [
      'Prompt outputs failed validation',
      'Value not in list',
      'FileNotFoundError',
      'No such file or directory',
      'checkpoint not found',
      'vae not found',
      'lora not found',
    ],
    title: 'File Model / LoRA Tidak Ditemukan',
    explanation:
      'Ada nama Checkpoint, VAE, atau LoRA di dalam prompt/workflow yang belum ter-install atau namanya berubah di folder ComfyUI.',
    solution:
      'Periksa node Loaders pada workflow. Pastikan file model safetensors sudah berada di folder ComfyUI/models/checkpoints (atau loras/vae), lalu lakukan Refresh pada ComfyUI.',
  },
  {
    category: 'nan_precision',
    patterns: [
      ' NaN ',
      'Tensor contains NaN',
      'nan',
      'OverflowError: math range error',
      'division by zero',
      'FloatingPointError',
    ],
    title: 'Kerusakan Kalkulasi Precision (FP16/VAE)',
    explanation:
      'Terjadi error angka tak terhingga (NaN/Not-a-Number) saat kalkulasi denoise atau decoding VAE.',
    solution:
      'Gunakan file VAE yang stabil (seperti sdxl_vae.safetensors) dan pastikan jalankan ComfyUI dengan flag `--fp16-vae` atau `--bf16-vae`. Jangan gunakan CFG scale terlalu ekstrem (>12).',
  },
  {
    category: 'custom_node',
    patterns: [
      'ModuleNotFoundError',
      'No module named',
      'ImportError',
      'Cannot import name',
      'node class not found',
    ],
    title: 'Custom Node / Dependensi Belum Terpasang',
    explanation:
      'Node kustom yang dibutuhkan workflow belum terpasang atau dependensi library Python (requirements.txt) belum di-install.',
    solution:
      'Buka ComfyUI Manager > Install Missing Custom Nodes, atau jalankan `pip install -r requirements.txt` di dalam folder custom node yang bersangkutan.',
  },
  {
    category: 'connection',
    patterns: [
      'Failed to fetch',
      'NetworkError',
      'Connection refused',
      'ECONNREFUSED',
      'WebSocket connection failed',
      'cors',
    ],
    title: 'Koneksi ComfyUI Terputus / CORS Diblokir',
    explanation:
      'Browser tidak dapat terhubung ke server ComfyUI lokal atau diblokir oleh kebijakan Cross-Origin Resource Sharing (CORS).',
    solution:
      'Pastikan ComfyUI sedang berjalan di port yang benar (default 8188) dan jalankan ComfyUI dengan parameter `--enable-cors-header` (contoh: `run_nvidia_gpu.bat --enable-cors-header`).',
  },
];

/**
 * Translates a raw ComfyUI Python error/traceback into a structured, human-readable diagnosis.
 */
export function translateComfyError(
  rawMessage: string | null | undefined,
  exceptionType?: string,
  nodeType?: string,
  nodeId?: string
): ErrorTranslation {
  const safeRaw = (rawMessage || '').trim() || (exceptionType || 'Unknown ComfyUI Error');
  const lowerText = `${safeRaw} ${exceptionType || ''} ${nodeType || ''}`.toLowerCase();

  for (const rule of ERROR_RULES) {
    const matched = rule.patterns.some((pattern) => {
      if (typeof pattern === 'string') {
        return lowerText.includes(pattern.toLowerCase());
      }
      return pattern.test(safeRaw);
    });

    if (matched) {
      return {
        category: rule.category,
        title: rule.title,
        explanation: rule.explanation,
        solution: rule.solution,
        rawError: safeRaw,
        nodeType: nodeType || undefined,
        nodeId: nodeId || undefined,
      };
    }
  }

  // Fallback for uncategorized errors
  let extractedSnippet = safeRaw.split('\n').filter((l) => l.trim().length > 0).pop() || safeRaw;
  if (extractedSnippet.length > 180) {
    extractedSnippet = extractedSnippet.slice(0, 180) + '...';
  }

  return {
    category: 'unknown',
    title: `Error Node (${nodeType || 'ComfyUI Pipeline'})`,
    explanation: `Terjadi kendala eksekusi pada pipeline ComfyUI: "${extractedSnippet}"`,
    solution:
      'Periksa koneksi kabel antar node di ComfyUI, periksa log terminal Python konsol ComfyUI untuk melihat detail baris yang error, atau muat ulang browser.',
    rawError: safeRaw,
    nodeType: nodeType || undefined,
    nodeId: nodeId || undefined,
  };
}
