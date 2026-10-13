import { useState } from 'react';
import { Link } from 'react-router-dom';

interface MemoryBreakdown {
  model: number; // GB
  kv: number;    // GB
  vae: number;   // GB
  free: number;  // GB
}

interface VramPreset {
  vram: string;
  totalGb: number;
  name: string;
  status: 'entry' | 'recommended' | 'powerhouse';
  tierLabel: string;
  throughput: string;
  throughputScore: number;
  latency1024: string;
  batchCapacity: string;
  quantAdvised: string;
  memory: MemoryBreakdown;
  gpus: string[];
  supportedModels: string[];
  maxResolution: string;
  recommendedFlags: string;
  tips: string;
}

const VRAM_PRESETS: Record<string, VramPreset> = {
  '4gb': {
    vram: '4 GB',
    totalGb: 4,
    name: 'Entry Level GPU (GTX 1650, RTX 3050 Laptop, GTX 1060 3GB)',
    status: 'entry',
    tierLabel: 'Entry / Budget',
    throughput: '2.1 it/s',
    throughputScore: 20,
    latency1024: '~26s (Tile VAE)',
    batchCapacity: '1 (Single)',
    quantAdvised: 'FP16 Pruned / FP8',
    memory: {
      model: 2.2,
      kv: 0.6,
      vae: 0.7,
      free: 0.5,
    },
    gpus: ['GTX 1650 Super', 'RTX 3050 Laptop 4GB', 'GTX 1060 3GB', 'AMD RX 6500 XT'],
    supportedModels: ['SD 1.5 Checkpoints', 'Lightweight LoRAs (Rank 16-32)', 'SD 1.5 LCM / Hyper'],
    maxResolution: '512 × 512 or 512 × 768',
    recommendedFlags: '--medvram-sdpt --opt-sdp-attention --lowvram',
    tips: 'Illustrious & SDXL may encounter out-of-memory errors on unquantized weights. Enable Tiled VAE for decoding resolutions above 512px.',
  },
  '6gb': {
    vram: '6 GB',
    totalGb: 6,
    name: 'Mid-Tier GPU (RTX 2060, RTX 3060 Mobile, GTX 1660 Ti)',
    status: 'entry',
    tierLabel: 'Mid-Tier Baseline',
    throughput: '5.8 it/s',
    throughputScore: 38,
    latency1024: '13.2s',
    batchCapacity: '1 (Sequential)',
    quantAdvised: 'FP16 Pruned',
    memory: {
      model: 3.4,
      kv: 1.0,
      vae: 0.9,
      free: 0.7,
    },
    gpus: ['RTX 2060 6GB', 'RTX 3060 Laptop', 'GTX 1660 Ti', 'RTX 2060 Super (Eco)'],
    supportedModels: ['SD 1.5 (Fast)', 'Illustrious XL (FP16 pruned)', 'NoobAI V-Pred', 'Style LoRAs (Rank 32-64)'],
    maxResolution: '832 × 1216 or 1024 × 1024 (Single batch)',
    recommendedFlags: '--medvram --opt-sdp-attention',
    tips: 'Runs Illustrious XL smoothly with pruned FP16 models. Avoid simultaneous batch sizes larger than 1 to prevent driver paging.',
  },
  '8gb': {
    vram: '8 GB',
    totalGb: 8,
    name: 'Standard Sweetspot (RTX 3060 Ti, RTX 4060, RTX 2070)',
    status: 'recommended',
    tierLabel: 'Standard Sweetspot',
    throughput: '10.4 it/s',
    throughputScore: 56,
    latency1024: '5.8s',
    batchCapacity: '1 - 2x',
    quantAdvised: 'FP16 Native',
    memory: {
      model: 4.6,
      kv: 1.3,
      vae: 1.1,
      free: 1.0,
    },
    gpus: ['RTX 4060 8GB', 'RTX 3060 Ti', 'RTX 3070 8GB', 'RX 6600 XT', 'Apple M2 16GB'],
    supportedModels: ['SDXL 1.0 Base', 'Illustrious XL (Full)', 'NoobAI', 'Pony V6', 'Multiple Stacked LoRAs'],
    maxResolution: '1024 × 1024 native, Hi-Res Fix up to 1.5x',
    recommendedFlags: '--opt-sdp-attention --no-half-vae',
    tips: 'Comfortably handles native 1024x1024 generation. Excellent inference performance for Illustrious fine-tunes without medvram flags.',
  },
  '12gb': {
    vram: '12 GB',
    totalGb: 12,
    name: 'High Performance (RTX 3060 12GB, RTX 4070 / Super)',
    status: 'recommended',
    tierLabel: 'High Performance',
    throughput: '19.2 it/s',
    throughputScore: 76,
    latency1024: '3.1s',
    batchCapacity: '2 - 4x',
    quantAdvised: 'Native FP16 / BF16',
    memory: {
      model: 5.6,
      kv: 2.4,
      vae: 1.5,
      free: 2.5,
    },
    gpus: ['RTX 4070 12GB', 'RTX 4070 Super', 'RTX 3060 12GB', 'RX 6700 XT', 'RX 7700 XT'],
    supportedModels: ['All SDXL / Illustrious models', 'Flux.1 Schnell (FP8)', 'ControlNet OpenPose + Depth', 'Batch generation (2-4x)'],
    maxResolution: '1024 × 1536 native, Hi-Res Fix 2.0x',
    recommendedFlags: 'Native FP16 execution, xformers / PyTorch 2.x SDPA',
    tips: 'Runs all current anime checkpoints with zero compromises. Hi-Res Fix upscales quickly without tiling artifacts.',
  },
  '16gb': {
    vram: '16 GB',
    totalGb: 16,
    name: 'Enthusiast / Studio (RTX 4080, RTX 4070 Ti Super, RX 7900 GRE)',
    status: 'powerhouse',
    tierLabel: 'Enthusiast Tier',
    throughput: '28.5 it/s',
    throughputScore: 90,
    latency1024: '1.7s',
    batchCapacity: '4 - 8x',
    quantAdvised: 'Native BF16 + LoRA Stacking',
    memory: {
      model: 6.8,
      kv: 3.4,
      vae: 1.8,
      free: 4.0,
    },
    gpus: ['RTX 4080 16GB', 'RTX 4070 Ti Super', 'RX 7900 GRE', 'Apple M3 Pro 18GB+'],
    supportedModels: ['Flux.1 Dev / Schnell', 'SDXL batch 4+', 'Local LoRA Kohya Training', 'Fast Inpainting / Outpainting'],
    maxResolution: '2048 × 2048+ with Hi-Res Fix',
    recommendedFlags: 'Full-speed FP16 / BF16 execution without low-vram switches',
    tips: 'Ideal for local LoRA training, complex multi-ControlNet pipelines, and sub-2-second generation latencies.',
  },
  '24gb': {
    vram: '24 GB+',
    totalGb: 24,
    name: 'Workstation / Extreme (RTX 4090, RTX 3090, Apple M-Series 36GB+)',
    status: 'powerhouse',
    tierLabel: 'Workstation Extreme',
    throughput: '44.0+ it/s',
    throughputScore: 100,
    latency1024: '< 0.85s (Sub-second)',
    batchCapacity: '8x+ / Train Ready',
    quantAdvised: 'Uncompressed BF16 / Flux Full',
    memory: {
      model: 9.8,
      kv: 5.2,
      vae: 2.4,
      free: 6.6,
    },
    gpus: ['RTX 4090 24GB', 'RTX 3090 24GB', 'NVIDIA A100 / RTX 6000 Ada', 'Apple M3 Max 36GB+'],
    supportedModels: ['Flux.1 Dev FP16 Uncompressed', 'SDXL Batch 8x Parallel', 'Full Checkpoint Fine-tuning (Rank 128+)', 'Realtime Stream Diffusion'],
    maxResolution: '4096 × 4096 Multi-pass Upscale',
    recommendedFlags: '--precision full --no-half-vae --opt-sdp-attention',
    tips: 'Maximal throughput with zero paging overhead. Capable of instant generation and full model fine-tuning without CPU memory offloading.',
  },
};

interface PresetCard {
  id: string;
  name: string;
  subtitle: string;
  pill: string;
  sampler: string;
  steps: string;
  cfg: string;
  clipSkip: string;
  nativeRes: string;
  vae: string;
  stepEfficiency: string;
  positivePrompt: string;
  negativePrompt: string;
}

const PRESET_CARDS: PresetCard[] = [
  {
    id: 'illustrious',
    name: 'Illustrious XL & NoobAI',
    subtitle: 'High-detail Danbooru Anime Architecture',
    pill: 'Illustrious XL',
    sampler: 'Euler a / DPM++ 2M Karras',
    steps: '24 – 28 steps',
    cfg: '5.0 – 6.5',
    clipSkip: '2 (CLIP-L + OpenCLIP)',
    nativeRes: '832 × 1216 (Portrait) / 1024 × 1024',
    vae: 'sdxl_vae.safetensors (Fixed FP16)',
    stepEfficiency: 'Fast convergence at 24 steps',
    positivePrompt: 'masterpiece, newest, absurdres, high quality, 1girl, solo, aesthetic composition',
    negativePrompt: 'worst quality, low quality, bad anatomy, bad hands, missing fingers, extra digit, fewer digits, watermark, text, signature',
  },
  {
    id: 'pony',
    name: 'Pony Diffusion V6 XL',
    subtitle: 'Score-tagged Stylized SDXL Pipeline',
    pill: 'Pony XL',
    sampler: 'Euler a / DPM++ 2M SDE Karras',
    steps: '25 – 30 steps',
    cfg: '6.0 – 7.0',
    clipSkip: '2',
    nativeRes: '1024 × 1024 (Native Square)',
    vae: 'sdxl_vae.safetensors',
    stepEfficiency: 'Optimal fidelity at 26 steps',
    positivePrompt: 'score_9, score_8_up, score_7_up, rating_safe, source_anime, 1girl, expressive eyes',
    negativePrompt: 'score_6, score_5, score_4, simple background, ugly, bad hands, mutated fingers',
  },
  {
    id: 'flux',
    name: 'Flux.1 Schnell & Dev',
    subtitle: 'Flow-Matching 12B Rectified MMDiT',
    pill: 'Flux.1 MMDiT',
    sampler: 'FlowMatchEulerDiscrete',
    steps: '4 – 8 (Schnell) / 20 – 24 (Dev)',
    cfg: '1.0 (Schnell) / 3.5 (Dev)',
    clipSkip: 'N/A (T5-XXL + CLIP-L Dual)',
    nativeRes: '1024 × 1024 or 896 × 1152',
    vae: 'ae.safetensors (16-channel)',
    stepEfficiency: 'Ultra-fast 4-step distilled convergence',
    positivePrompt: 'An anime aesthetic digital illustration with sharp linework and clean cell shading, cinematic atmosphere',
    negativePrompt: '(Flux operates with empty negative prompt or guidance distillation)',
  },
  {
    id: 'sd15',
    name: 'Stable Diffusion 1.5 Legacy',
    subtitle: 'Lightweight 1.0B Fine-tunes & LoRA Stacks',
    pill: 'SD 1.5 Classic',
    sampler: 'DPM++ 2M Karras / Euler a',
    steps: '20 – 30 steps',
    cfg: '7.0 – 8.0',
    clipSkip: '2 (CLIP ViT-L/14)',
    nativeRes: '512 × 768 or 512 × 512 (Hi-Res 1.5x)',
    vae: 'vae-ft-mse-840000-ema-pruned',
    stepEfficiency: 'Instant sub-second inference on 8GB+',
    positivePrompt: 'masterpiece, best quality, ultra-detailed, anime artwork, vibrant colors, cinematic light',
    negativePrompt: 'easynegative, badhandv4, (worst quality, low quality:1.4), deformed, blurry',
  },
];

type ArchColumn = 'all' | 'illustrious' | 'sdxl' | 'sd15' | 'flux';
type TechTab = 'hardware' | 'sampling' | 'matrix';

export function TechnicalDetailsSection() {
  const [activeTab, setActiveTab] = useState<TechTab>('hardware');
  const [selectedVram, setSelectedVram] = useState<string>('8gb');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('illustrious');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [focusedArch, setFocusedArch] = useState<ArchColumn>('all');

  const activeVram = VRAM_PRESETS[selectedVram] || VRAM_PRESETS['8gb'];
  const activePreset = PRESET_CARDS.find((p) => p.id === selectedPresetId) || PRESET_CARDS[0];

  const copyPrompt = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Percentage calculations for VRAM gauge segments
  const total = activeVram.totalGb;
  const pWeights = Math.round((activeVram.memory.model / total) * 100);
  const pKv = Math.round((activeVram.memory.kv / total) * 100);
  const pVae = Math.round((activeVram.memory.vae / total) * 100);
  const pFree = Math.max(0, 100 - pWeights - pKv - pVae);

  return (
    <section className="mg-technical" id="technical-reference">
      {/* Dedicated Nocturnal Boreal Crags Forest Background */}
      <div className="mg-tech-forest-bg" aria-hidden="true" />

      {/* Subtle Natural Forest Ground Mist Ribbons */}
      <div className="mg-tech-mist-ribbon mist-1" aria-hidden="true" />
      <div className="mg-tech-mist-ribbon mist-2" aria-hidden="true" />

      {/* Ambient Vignette & Contrast Depth Lighting */}
      <div className="mg-tech-atmosphere" aria-hidden="true" />

      <div className="mg-container">
        {/* Header */}
        <div className="mg-tech-header">
          <div className="mg-editorial-tag">
            <span className="mg-tag-num">04</span>
            <span className="mg-tag-line" />
            <span className="mg-tag-text">INFERENCE BENCHMARKS &amp; ARCHITECTURE</span>
          </div>
          <h2 className="mg-tech-title">
            Hardware &amp; Execution Profiles
          </h2>
          <p className="mg-tech-desc">
            Pilih kategori di bawah untuk memeriksa kapasitas VRAM GPU, parameter sampling optimal, atau tabel perbandingan arsitektur model.
          </p>

          {/* Clean Segmented Tab Switcher */}
          <div className="mg-tech-nav-tabs" role="tablist" aria-label="Section 04 Tabs">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'hardware'}
              className={`mg-tech-nav-btn ${activeTab === 'hardware' ? 'active' : ''}`}
              onClick={() => setActiveTab('hardware')}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <rect x="9" y="9" width="6" height="6" />
                <line x1="9" y1="1" x2="9" y2="4" />
                <line x1="15" y1="1" x2="15" y2="4" />
                <line x1="9" y1="20" x2="9" y2="23" />
                <line x1="15" y1="20" x2="15" y2="23" />
                <line x1="20" y1="9" x2="23" y2="9" />
                <line x1="20" y1="14" x2="23" y2="14" />
                <line x1="1" y1="9" x2="4" y2="9" />
                <line x1="1" y1="14" x2="4" y2="14" />
              </svg>
              <div className="mg-nav-text-col">
                <span className="mg-nav-title">Hardware GPU &amp; VRAM</span>
                <span className="mg-nav-sub">Alokasi memori &amp; rekomendasi GPU</span>
              </div>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'sampling'}
              className={`mg-tech-nav-btn ${activeTab === 'sampling' ? 'active' : ''}`}
              onClick={() => setActiveTab('sampling')}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
              <div className="mg-nav-text-col">
                <span className="mg-nav-title">Parameter Sampling</span>
                <span className="mg-nav-sub">Preset steps, sampler &amp; prompt tags</span>
              </div>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'matrix'}
              className={`mg-tech-nav-btn ${activeTab === 'matrix' ? 'active' : ''}`}
              onClick={() => setActiveTab('matrix')}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="3" y1="15" x2="21" y2="15" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <line x1="15" y1="3" x2="15" y2="21" />
              </svg>
              <div className="mg-nav-text-col">
                <span className="mg-nav-title">Perbandingan Arsitektur</span>
                <span className="mg-nav-sub">Tabel spesifikasi komparatif</span>
              </div>
            </button>
          </div>
        </div>

        {/* ===================================================================
            TAB 1: GPU VRAM & Hardware Compatibility Matrix
            =================================================================== */}
        {activeTab === 'hardware' && (
          <div className="mg-tech-tab-pane mg-animate-fade-in">
            <div className="mg-vram-card">
              <div className="mg-vram-topbar">
                <div>
                  <div className="mg-vram-title-row">
                    <h3 className="mg-vram-title">Hardware Memory Allocation Matrix</h3>
                    <span className="mg-vram-tier-badge">{activeVram.tierLabel}</span>
                  </div>
                  <p className="mg-vram-sub">
                    Pilih kapasitas VRAM GPU Anda untuk melihat alokasi memori, throughput, dan rekomendasi model yang optimal.
                  </p>
                </div>
                <Link to="/models" className="mg-btn mg-btn-secondary">
                  <span>Filter Model per VRAM</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </Link>
              </div>

              {/* VRAM Selector Tabs */}
              <div className="mg-vram-tabs" role="tablist">
                {Object.keys(VRAM_PRESETS).map((key) => {
                  const preset = VRAM_PRESETS[key];
                  const isSelected = selectedVram === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      className={`mg-vram-tab-btn ${isSelected ? 'active' : ''}`}
                      onClick={() => setSelectedVram(key)}
                    >
                      <span className="mg-tab-vram">{preset.vram}</span>
                      <span className="mg-tab-type">{preset.tierLabel}</span>
                    </button>
                  );
                })}
              </div>

              {/* Interactive Memory Allocation Meter */}
              <div className="mg-vram-alloc-meter-card">
                <div className="mg-alloc-head">
                  <div className="mg-alloc-title-group">
                    <span className="mg-alloc-label">ALOKASI MEMORI ESTIMASI</span>
                    <span className="mg-alloc-total">{activeVram.vram} TOTAL KAPASITAS</span>
                  </div>
                  <div className="mg-alloc-legend">
                    <span className="mg-legend-item">
                      <span className="mg-legend-dot dot-weights" />
                      Model Weights ({activeVram.memory.model} GB &bull; {pWeights}%)
                    </span>
                    <span className="mg-legend-item">
                      <span className="mg-legend-dot dot-kv" />
                      Attention KV ({activeVram.memory.kv} GB &bull; {pKv}%)
                    </span>
                    <span className="mg-legend-item">
                      <span className="mg-legend-dot dot-vae" />
                      VAE Decode ({activeVram.memory.vae} GB &bull; {pVae}%)
                    </span>
                    <span className="mg-legend-item">
                      <span className="mg-legend-dot dot-free" />
                      Sisa Headroom ({activeVram.memory.free} GB &bull; {pFree}%)
                    </span>
                  </div>
                </div>

                {/* Segmented Memory Track */}
                <div className="mg-meter-track" role="progressbar" aria-label="VRAM Allocation Progress">
                  <div
                    className="mg-meter-segment seg-weights"
                    style={{ width: `${pWeights}%` }}
                    title={`Model Weights: ${activeVram.memory.model} GB (${pWeights}%)`}
                  >
                    <span className="mg-meter-seg-text">{pWeights}%</span>
                  </div>
                  <div
                    className="mg-meter-segment seg-kv"
                    style={{ width: `${pKv}%` }}
                    title={`Attention KV: ${activeVram.memory.kv} GB (${pKv}%)`}
                  >
                    <span className="mg-meter-seg-text">{pKv}%</span>
                  </div>
                  <div
                    className="mg-meter-segment seg-vae"
                    style={{ width: `${pVae}%` }}
                    title={`VAE Buffer: ${activeVram.memory.vae} GB (${pVae}%)`}
                  >
                    <span className="mg-meter-seg-text">{pVae}%</span>
                  </div>
                  <div
                    className="mg-meter-segment seg-free"
                    style={{ width: `${pFree}%` }}
                    title={`Headroom: ${activeVram.memory.free} GB (${pFree}%)`}
                  >
                    <span className="mg-meter-seg-text">{pFree}%</span>
                  </div>
                </div>
              </div>

              {/* Telemetry Metrics Row */}
              <div className="mg-vram-telemetry-grid">
                <div className="mg-telemetry-tile">
                  <div className="mg-tele-head">
                    <span className="mg-tele-label">THROUGHPUT ESTIMASI</span>
                    <span className="mg-tele-val">{activeVram.throughput}</span>
                  </div>
                  <div className="mg-tele-bar-track">
                    <div
                      className="mg-tele-bar-fill"
                      style={{ width: `${activeVram.throughputScore}%` }}
                    />
                  </div>
                  <span className="mg-tele-sub">PyTorch 2.4+ SDPA benchmark</span>
                </div>

                <div className="mg-telemetry-tile">
                  <div className="mg-tele-head">
                    <span className="mg-tele-label">1024×1024 LATENCY</span>
                    <span className="mg-tele-val accent">{activeVram.latency1024}</span>
                  </div>
                  <span className="mg-tele-sub">28 steps standard generation</span>
                </div>

                <div className="mg-telemetry-tile">
                  <div className="mg-tele-head">
                    <span className="mg-tele-label">SAFE BATCH SIZE</span>
                    <span className="mg-tele-val">{activeVram.batchCapacity}</span>
                  </div>
                  <span className="mg-tele-sub">Kapasitas batch simultan</span>
                </div>

                <div className="mg-telemetry-tile">
                  <div className="mg-tele-head">
                    <span className="mg-tele-label">PRESISI DISARANKAN</span>
                    <span className="mg-tele-val mono">{activeVram.quantAdvised}</span>
                  </div>
                  <span className="mg-tele-sub">Optimal tanpa penurunan kualitas</span>
                </div>
              </div>

              {/* VRAM Details Panel */}
              <div className="mg-vram-panel">
                <div className="mg-vram-summary-bar">
                  <div>
                    <h4 className="mg-vram-gpu-name">{activeVram.name}</h4>
                    <div className="mg-gpu-chips-wrap">
                      <span className="mg-gpu-tested-label">Contoh Hardware:</span>
                      {activeVram.gpus.map((gpu, idx) => (
                        <span key={idx} className="mg-gpu-chip">{gpu}</span>
                      ))}
                    </div>
                  </div>
                  <span className={`mg-vram-badge status-${activeVram.status}`}>
                    {activeVram.status === 'powerhouse'
                      ? 'Tingkat Tinggi — Tanpa Kompromi'
                      : activeVram.status === 'recommended'
                      ? 'Rekomendasi Utama — Native SDXL / Illustrious'
                      : 'Catatan: Gunakan Pruned FP16 / Tiled VAE'}
                  </span>
                </div>

                <div className="mg-vram-specs-grid">
                  <div className="mg-vram-box">
                    <span className="mg-box-title">Model yang Didukung</span>
                    <ul className="mg-vram-list">
                      {activeVram.supportedModels.map((m, idx) => (
                        <li key={idx}>
                          <span className="mg-list-chevron">&rsaquo;</span> {m}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mg-vram-box">
                    <span className="mg-box-title">Resolusi Rekomendasi</span>
                    <div className="mg-box-snippet">{activeVram.maxResolution}</div>

                    <div className="mg-launch-flags-head">
                      <span className="mg-box-title">Launch Flags</span>
                      <button
                        type="button"
                        className="mg-mini-copy-btn"
                        onClick={() => copyPrompt(activeVram.recommendedFlags, `flags-${selectedVram}`)}
                        title="Salin launch arguments"
                      >
                        {copiedKey === `flags-${selectedVram}` ? (
                          <span className="mg-copy-status copied">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                            Tersalin
                          </span>
                        ) : (
                          <span className="mg-copy-status">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                            Salin
                          </span>
                        )}
                      </button>
                    </div>
                    <div className="mg-box-snippet mono">{activeVram.recommendedFlags}</div>
                  </div>

                  <div className="mg-vram-box">
                    <span className="mg-box-title">Tips Eksekusi</span>
                    <p className="mg-vram-tip-text">
                      {activeVram.tips}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 2: Verified Sampling Parameter Cheat Sheet
            =================================================================== */}
        {activeTab === 'sampling' && (
          <div className="mg-tech-tab-pane mg-animate-fade-in">
            <div className="mg-presets-section">
              {/* Model Family Filter Tabs */}
              <div className="mg-presets-family-bar">
                <span className="mg-family-label">Pilih Model:</span>
                <div className="mg-family-pills">
                  {PRESET_CARDS.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      className={`mg-family-pill-btn ${selectedPresetId === card.id ? 'active' : ''}`}
                      onClick={() => setSelectedPresetId(card.id)}
                    >
                      {card.pill}
                    </button>
                  ))}
                </div>
              </div>

              {/* Focused Model Parameter Card */}
              <div className="mg-preset-focused-card">
                <div className="mg-preset-head">
                  <div>
                    <h4 className="mg-preset-headline">{activePreset.name}</h4>
                    <span className="mg-preset-arch">{activePreset.subtitle}</span>
                  </div>
                  <span className="mg-pill mg-pill-base">{activePreset.pill}</span>
                </div>

                <div className="mg-preset-params-grid">
                  <div className="mg-param-tile">
                    <span className="mg-param-label">Sampler</span>
                    <strong className="mg-param-val">{activePreset.sampler}</strong>
                  </div>
                  <div className="mg-param-tile">
                    <span className="mg-param-label">Steps</span>
                    <strong className="mg-param-val">{activePreset.steps}</strong>
                  </div>
                  <div className="mg-param-tile">
                    <span className="mg-param-label">CFG Scale</span>
                    <strong className="mg-param-val">{activePreset.cfg}</strong>
                  </div>
                  <div className="mg-param-tile">
                    <span className="mg-param-label">Clip Skip</span>
                    <strong className="mg-param-val">{activePreset.clipSkip}</strong>
                  </div>
                  <div className="mg-param-tile">
                    <span className="mg-param-label">Native Resolution</span>
                    <strong className="mg-param-val">{activePreset.nativeRes}</strong>
                  </div>
                  <div className="mg-param-tile">
                    <span className="mg-param-label">Target VAE</span>
                    <strong className="mg-param-val mono">{activePreset.vae}</strong>
                  </div>
                </div>

                <div className="mg-prompt-boxes-grid">
                  {/* Positive Prompt Boilerplate */}
                  <div className="mg-preset-code-box">
                    <div className="mg-code-head">
                      <span>Quality Tag Boilerplate:</span>
                      <button
                        type="button"
                        className="mg-mini-copy-btn"
                        onClick={() => copyPrompt(activePreset.positivePrompt, `pos-${activePreset.id}`)}
                      >
                        {copiedKey === `pos-${activePreset.id}` ? (
                          <span className="mg-copy-status copied">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                            Tersalin
                          </span>
                        ) : (
                          <span className="mg-copy-status">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                            Salin
                          </span>
                        )}
                      </button>
                    </div>
                    <code>{activePreset.positivePrompt}</code>
                  </div>

                  {/* Negative Prompt Boilerplate */}
                  <div className="mg-preset-code-box">
                    <div className="mg-code-head">
                      <span>Recommended Negative Prompt:</span>
                      <button
                        type="button"
                        className="mg-mini-copy-btn"
                        onClick={() => copyPrompt(activePreset.negativePrompt, `neg-${activePreset.id}`)}
                      >
                        {copiedKey === `neg-${activePreset.id}` ? (
                          <span className="mg-copy-status copied">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                            Tersalin
                          </span>
                        ) : (
                          <span className="mg-copy-status">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                            Salin
                          </span>
                        )}
                      </button>
                    </div>
                    <code>{activePreset.negativePrompt}</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 3: Base Architecture Comparison Matrix Table
            =================================================================== */}
        {activeTab === 'matrix' && (
          <div className="mg-tech-tab-pane mg-animate-fade-in">
            <div className="mg-table-section">
              <div className="mg-table-top-bar">
                <div className="mg-table-title-row">
                  <h3>Base Architecture Comparison Matrix</h3>
                  <p>Perbandingan parameter, resolusi dasar, kebutuhan minimum VRAM, dan karakteristik enkoder teks.</p>
                </div>

                {/* Architecture Focus Filter Selector */}
                <div className="mg-arch-filter-pills" role="tablist">
                  <span className="mg-arch-filter-label">Fokus Kolom:</span>
                  <button
                    type="button"
                    className={`mg-arch-pill-btn ${focusedArch === 'all' ? 'active' : ''}`}
                    onClick={() => setFocusedArch('all')}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    className={`mg-arch-pill-btn ${focusedArch === 'illustrious' ? 'active' : ''}`}
                    onClick={() => setFocusedArch('illustrious')}
                  >
                    Illustrious-XL
                  </button>
                  <button
                    type="button"
                    className={`mg-arch-pill-btn ${focusedArch === 'sdxl' ? 'active' : ''}`}
                    onClick={() => setFocusedArch('sdxl')}
                  >
                    SDXL 1.0
                  </button>
                  <button
                    type="button"
                    className={`mg-arch-pill-btn ${focusedArch === 'sd15' ? 'active' : ''}`}
                    onClick={() => setFocusedArch('sd15')}
                  >
                    SD 1.5
                  </button>
                  <button
                    type="button"
                    className={`mg-arch-pill-btn ${focusedArch === 'flux' ? 'active' : ''}`}
                    onClick={() => setFocusedArch('flux')}
                  >
                    Flux.1
                  </button>
                </div>
              </div>

              <div className="mg-table-container">
                <table className={`mg-arch-table focus-${focusedArch}`}>
                  <thead>
                    <tr>
                      <th className="col-metric">METRIC / PROPERTY</th>
                      <th
                        className={`col-illustrious ${focusedArch === 'illustrious' ? 'is-focused' : ''}`}
                        onClick={() => setFocusedArch(focusedArch === 'illustrious' ? 'all' : 'illustrious')}
                      >
                        ILLUSTRIOUS-XL
                      </th>
                      <th
                        className={`col-sdxl ${focusedArch === 'sdxl' ? 'is-focused' : ''}`}
                        onClick={() => setFocusedArch(focusedArch === 'sdxl' ? 'all' : 'sdxl')}
                      >
                        SDXL 1.0 BASE
                      </th>
                      <th
                        className={`col-sd15 ${focusedArch === 'sd15' ? 'is-focused' : ''}`}
                        onClick={() => setFocusedArch(focusedArch === 'sd15' ? 'all' : 'sd15')}
                      >
                        SD 1.5 LEGACY
                      </th>
                      <th
                        className={`col-flux ${focusedArch === 'flux' ? 'is-focused' : ''}`}
                        onClick={() => setFocusedArch(focusedArch === 'flux' ? 'all' : 'flux')}
                      >
                        FLUX.1 SCHNELL
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="col-metric">Core Architecture</td>
                      <td className={`col-illustrious ${focusedArch === 'illustrious' ? 'is-focused' : ''}`}>
                        Cross-Attention U-Net
                      </td>
                      <td className={`col-sdxl ${focusedArch === 'sdxl' ? 'is-focused' : ''}`}>
                        Cross-Attention U-Net
                      </td>
                      <td className={`col-sd15 ${focusedArch === 'sd15' ? 'is-focused' : ''}`}>
                        Classic Latent U-Net
                      </td>
                      <td className={`col-flux ${focusedArch === 'flux' ? 'is-focused' : ''}`}>
                        Dual-Stream MMDiT (Flow)
                      </td>
                    </tr>
                    <tr>
                      <td className="col-metric">Total Parameters</td>
                      <td className={`col-illustrious ${focusedArch === 'illustrious' ? 'is-focused' : ''}`}>
                        6.6B (T5 + CLIP)
                      </td>
                      <td className={`col-sdxl ${focusedArch === 'sdxl' ? 'is-focused' : ''}`}>
                        6.6B (Dual CLIP)
                      </td>
                      <td className={`col-sd15 ${focusedArch === 'sd15' ? 'is-focused' : ''}`}>
                        1.0B (CLIP-ViT-L)
                      </td>
                      <td className={`col-flux ${focusedArch === 'flux' ? 'is-focused' : ''}`}>
                        12.0B (Flow Matching)
                      </td>
                    </tr>
                    <tr>
                      <td className="col-metric">Native Resolution</td>
                      <td className={`col-illustrious ${focusedArch === 'illustrious' ? 'is-focused' : ''}`}>
                        832 &times; 1216 or 1024&sup2;
                      </td>
                      <td className={`col-sdxl ${focusedArch === 'sdxl' ? 'is-focused' : ''}`}>
                        1024 &times; 1024
                      </td>
                      <td className={`col-sd15 ${focusedArch === 'sd15' ? 'is-focused' : ''}`}>
                        512 &times; 512
                      </td>
                      <td className={`col-flux ${focusedArch === 'flux' ? 'is-focused' : ''}`}>
                        1024 &times; 1024
                      </td>
                    </tr>
                    <tr>
                      <td className="col-metric">Min VRAM (Inference)</td>
                      <td className={`col-illustrious ${focusedArch === 'illustrious' ? 'is-focused' : ''}`}>
                        6 GB (FP16 Pruned)
                      </td>
                      <td className={`col-sdxl ${focusedArch === 'sdxl' ? 'is-focused' : ''}`}>
                        8 GB (FP16)
                      </td>
                      <td className={`col-sd15 ${focusedArch === 'sd15' ? 'is-focused' : ''}`}>
                        4 GB
                      </td>
                      <td className={`col-flux ${focusedArch === 'flux' ? 'is-focused' : ''}`}>
                        12 GB (FP8 Quantized)
                      </td>
                    </tr>
                    <tr>
                      <td className="col-metric">Text Encoders</td>
                      <td className={`col-illustrious ${focusedArch === 'illustrious' ? 'is-focused' : ''}`}>
                        Dual OpenCLIP + ViT
                      </td>
                      <td className={`col-sdxl ${focusedArch === 'sdxl' ? 'is-focused' : ''}`}>
                        CLIP ViT-L + OpenCLIP
                      </td>
                      <td className={`col-sd15 ${focusedArch === 'sd15' ? 'is-focused' : ''}`}>
                        CLIP ViT-L/14
                      </td>
                      <td className={`col-flux ${focusedArch === 'flux' ? 'is-focused' : ''}`}>
                        T5-XXL + CLIP-L
                      </td>
                    </tr>
                    <tr>
                      <td className="col-metric">Danbooru Tag Adherence</td>
                      <td className={`col-illustrious ${focusedArch === 'illustrious' ? 'is-focused' : ''} mg-text-success`}>
                        Native High (99%)
                      </td>
                      <td className={`col-sdxl ${focusedArch === 'sdxl' ? 'is-focused' : ''}`}>
                        Moderate (Prose)
                      </td>
                      <td className={`col-sd15 ${focusedArch === 'sd15' ? 'is-focused' : ''}`}>
                        Moderate (80%)
                      </td>
                      <td className={`col-flux ${focusedArch === 'flux' ? 'is-focused' : ''}`}>
                        Natural Prose Only
                      </td>
                    </tr>
                    <tr>
                      <td className="col-metric">Hi-Res Fix Scale Limit</td>
                      <td className={`col-illustrious ${focusedArch === 'illustrious' ? 'is-focused' : ''}`}>
                        2.0x &ndash; 2.5x
                      </td>
                      <td className={`col-sdxl ${focusedArch === 'sdxl' ? 'is-focused' : ''}`}>
                        1.5x &ndash; 2.0x
                      </td>
                      <td className={`col-sd15 ${focusedArch === 'sd15' ? 'is-focused' : ''}`}>
                        1.5x (Requires Tiled VAE)
                      </td>
                      <td className={`col-flux ${focusedArch === 'flux' ? 'is-focused' : ''}`}>
                        2.0x Native
                      </td>
                    </tr>
                    <tr>
                      <td className="col-metric">Typical Speed Index</td>
                      <td className={`col-illustrious ${focusedArch === 'illustrious' ? 'is-focused' : ''}`}>
                        Fast (10&ndash;14 it/s)
                      </td>
                      <td className={`col-sdxl ${focusedArch === 'sdxl' ? 'is-focused' : ''}`}>
                        Balanced (8&ndash;11 it/s)
                      </td>
                      <td className={`col-sd15 ${focusedArch === 'sd15' ? 'is-focused' : ''} mg-text-success`}>
                        Ultra-Fast (25&ndash;35 it/s)
                      </td>
                      <td className={`col-flux ${focusedArch === 'flux' ? 'is-focused' : ''}`}>
                        4-step Distilled (~2.5s)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
