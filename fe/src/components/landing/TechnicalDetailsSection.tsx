import { useState } from 'react';
import { Link } from 'react-router-dom';

interface VramPreset {
  vram: string;
  name: string;
  status: 'entry' | 'recommended' | 'powerhouse';
  supportedModels: string[];
  maxResolution: string;
  recommendedFlags: string;
  tips: string;
}

const VRAM_PRESETS: Record<string, VramPreset> = {
  '4gb': {
    vram: '4 GB',
    name: 'Entry Level GPU (GTX 1650, RTX 3050 Mobile)',
    status: 'entry',
    supportedModels: ['SD 1.5 Checkpoints', 'Lightweight LoRAs (Rank 16-32)'],
    maxResolution: '512 × 512 or 512 × 768',
    recommendedFlags: '--medvram-sdpt --opt-sdp-attention --lowvram',
    tips: 'Illustrious & SDXL may encounter out-of-memory errors. Enable Tiled VAE for decoding resolutions above 512px.',
  },
  '6gb': {
    vram: '6 GB',
    name: 'Mid-Tier GPU (RTX 2060, RTX 3060 Mobile)',
    status: 'entry',
    supportedModels: ['SD 1.5', 'Illustrious XL (FP16 pruned)', 'NoobAI', 'Style LoRAs'],
    maxResolution: '832 × 1216 or 1024 × 1024 (Single batch)',
    recommendedFlags: '--medvram --xformers or --opt-sdp-attention',
    tips: 'Runs Illustrious XL smoothly with pruned FP16 models. Avoid simultaneous batch sizes larger than 1.',
  },
  '8gb': {
    vram: '8 GB',
    name: 'Standard Sweetspot (RTX 3060 Ti, RTX 4060, RTX 2070)',
    status: 'recommended',
    supportedModels: ['SDXL 1.0 Base', 'Illustrious XL', 'NoobAI', 'Pony V6', 'Multiple LoRAs'],
    maxResolution: '1024 × 1024 native, Hi-Res Fix up to 1.5x',
    recommendedFlags: '--opt-sdp-attention --no-half-vae',
    tips: 'Comfortably handles native 1024x1024 generation. Excellent inference performance for Illustrious fine-tunes.',
  },
  '12gb': {
    vram: '12 GB',
    name: 'High Performance (RTX 3060 12GB, RTX 4070)',
    status: 'recommended',
    supportedModels: ['All SDXL / Illustrious models', 'Flux Schnell (FP8)', 'Batch generation (2-4x)'],
    maxResolution: '1024 × 1536 native, Hi-Res Fix 2.0x',
    recommendedFlags: 'Native FP16 execution, xformers / PyTorch 2.x SDPA',
    tips: 'Runs all current anime checkpoints with zero compromises. Hi-Res Fix upscales quickly without tiling artifacts.',
  },
  '16gb': {
    vram: '16 GB - 24 GB+',
    name: 'Workstation / Enthusiast (RTX 4080, RTX 4090, RTX 3090)',
    status: 'powerhouse',
    supportedModels: ['Flux.1 Dev / Schnell', 'SDXL batch 4+', 'Local LoRA Training & Fast Inpainting'],
    maxResolution: '2048 × 2048+ with Hi-Res Fix',
    recommendedFlags: 'Full-speed FP16 / BF16 execution without low-vram switches',
    tips: 'Ideal for local LoRA training, complex ControlNet workflows, and sub-second generation latencies.',
  },
};

export function TechnicalDetailsSection() {
  const [selectedVram, setSelectedVram] = useState<string>('8gb');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const activeVram = VRAM_PRESETS[selectedVram] || VRAM_PRESETS['8gb'];

  const copyPrompt = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  return (
    <section className="mg-technical" id="technical-reference">
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
            Direct tensor benchmarks, verified sampling presets, and GPU hardware requirements for local generative workflows.
          </p>
        </div>

        {/* ===================================================================
            Part 1: GPU VRAM & Hardware Compatibility Matrix
            =================================================================== */}
        <div className="mg-vram-card">
          <div className="mg-vram-topbar">
            <div>
              <h3 className="mg-vram-title">Hardware Memory Allocation Matrix</h3>
              <p className="mg-vram-sub">Select your GPU capacity to inspect compatible checkpoint architectures and optimal launch arguments.</p>
            </div>
            <Link to="/models" className="mg-btn mg-btn-secondary">
              <span>Filter Models by VRAM</span>
            </Link>
          </div>

          {/* VRAM Tabs */}
          <div className="mg-vram-tabs" role="tablist">
            {Object.keys(VRAM_PRESETS).map((key) => {
              const preset = VRAM_PRESETS[key];
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={selectedVram === key}
                  className={`mg-vram-tab-btn ${selectedVram === key ? 'active' : ''}`}
                  onClick={() => setSelectedVram(key)}
                >
                  <span className="mg-tab-vram">{preset.vram}</span>
                  <span className="mg-tab-type">
                    {key === '8gb' ? 'Sweetspot' : key === '16gb' ? 'Workstation' : 'Tier'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* VRAM Details Panel */}
          <div className="mg-vram-panel">
            <div className="mg-vram-summary-bar">
              <div>
                <h4 className="mg-vram-gpu-name">{activeVram.name}</h4>
                <span className={`mg-vram-badge status-${activeVram.status}`}>
                  {activeVram.status === 'powerhouse'
                    ? 'Ultra High Performance — Zero Compromises'
                    : activeVram.status === 'recommended'
                    ? 'Recommended Sweetspot — SDXL / Illustrious Native'
                    : 'Notice: Lightweight / FP16 Pruned Checkpoints Advised'}
                </span>
              </div>
            </div>

            <div className="mg-vram-specs-grid">
              <div className="mg-vram-box">
                <span className="mg-box-title">Supported Architectures</span>
                <ul className="mg-vram-list">
                  {activeVram.supportedModels.map((m, idx) => (
                    <li key={idx}>
                      <span className="mg-list-chevron">&rsaquo;</span> {m}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mg-vram-box">
                <span className="mg-box-title">Target Generation Resolution</span>
                <div className="mg-box-snippet">{activeVram.maxResolution}</div>
                <span className="mg-box-title" style={{ marginTop: '14px' }}>Recommended Launch Flags</span>
                <div className="mg-box-snippet mono">{activeVram.recommendedFlags}</div>
              </div>

              <div className="mg-vram-box">
                <span className="mg-box-title">Optimization &amp; Inference Guidelines</span>
                <p className="mg-vram-tip-text">
                  {activeVram.tips}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            Part 2: Verified Sampling Parameter Cheat Sheet
            =================================================================== */}
        <div className="mg-presets-section">
          <div className="mg-presets-header">
            <h3>Verified Generation Parameter Cheat Sheet</h3>
            <p>Baseline sampling parameters for the most popular anime &amp; SDXL diffusion models.</p>
          </div>

          <div className="mg-presets-grid">
            {/* Illustrious XL & NoobAI */}
            <div className="mg-preset-card">
              <div className="mg-preset-head">
                <div>
                  <h4>Illustrious XL &amp; NoobAI</h4>
                  <span className="mg-preset-arch">Clean Anime &amp; Illustration</span>
                </div>
                <span className="mg-pill mg-pill-base">Illustrious</span>
              </div>

              <div className="mg-preset-params">
                <div className="mg-param-row">
                  <span>Sampler</span>
                  <strong>Euler a / DPM++ 2M Karras</strong>
                </div>
                <div className="mg-param-row">
                  <span>Steps</span>
                  <strong>24 &ndash; 28</strong>
                </div>
                <div className="mg-param-row">
                  <span>CFG Scale</span>
                  <strong>5.0 &ndash; 6.5</strong>
                </div>
                <div className="mg-param-row">
                  <span>Clip Skip</span>
                  <strong>2</strong>
                </div>
                <div className="mg-param-row">
                  <span>Native Resolution</span>
                  <strong>832 &times; 1216 (Portrait)</strong>
                </div>
              </div>

              <div className="mg-preset-code-box">
                <div className="mg-code-head">
                  <span>Recommended Negative Prompt:</span>
                  <button
                    type="button"
                    className="mg-mini-copy-btn"
                    onClick={() =>
                      copyPrompt(
                        'worst quality, low quality, bad anatomy, bad hands, missing fingers, extra digit, fewer digits, watermark, text, signature',
                        'neg-illustrious'
                      )
                    }
                  >
                    {copiedKey === 'neg-illustrious' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <code>worst quality, low quality, bad anatomy, bad hands, missing fingers, extra digit, fewer digits, watermark, text, signature</code>
              </div>
            </div>

            {/* Stable Diffusion 1.5 Legacy */}
            <div className="mg-preset-card">
              <div className="mg-preset-head">
                <div>
                  <h4>Stable Diffusion 1.5</h4>
                  <span className="mg-preset-arch">Legacy Fine-tunes &amp; Style LoRAs</span>
                </div>
                <span className="mg-pill mg-pill-base">SD 1.5</span>
              </div>

              <div className="mg-preset-params">
                <div className="mg-param-row">
                  <span>Sampler</span>
                  <strong>DPM++ 2M Karras / Euler a</strong>
                </div>
                <div className="mg-param-row">
                  <span>Steps</span>
                  <strong>20 &ndash; 30</strong>
                </div>
                <div className="mg-param-row">
                  <span>CFG Scale</span>
                  <strong>7.0 &ndash; 8.0</strong>
                </div>
                <div className="mg-param-row">
                  <span>Clip Skip</span>
                  <strong>2</strong>
                </div>
                <div className="mg-param-row">
                  <span>Native Resolution</span>
                  <strong>512 &times; 768 or 512 &times; 512</strong>
                </div>
              </div>

              <div className="mg-preset-code-box">
                <div className="mg-code-head">
                  <span>Recommended Negative Prompt:</span>
                  <button
                    type="button"
                    className="mg-mini-copy-btn"
                    onClick={() =>
                      copyPrompt(
                        'easynegative, badhandv4, (worst quality, low quality:1.4), deformed, blurry',
                        'neg-sd15'
                      )
                    }
                  >
                    {copiedKey === 'neg-sd15' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <code>easynegative, badhandv4, (worst quality, low quality:1.4), deformed, blurry</code>
              </div>
            </div>

            {/* Pony Diffusion V6 */}
            <div className="mg-preset-card">
              <div className="mg-preset-head">
                <div>
                  <h4>Pony Diffusion V6 XL</h4>
                  <span className="mg-preset-arch">Score-tagged Pipeline</span>
                </div>
                <span className="mg-pill mg-pill-base">Pony XL</span>
              </div>

              <div className="mg-preset-params">
                <div className="mg-param-row">
                  <span>Sampler</span>
                  <strong>Euler a / DPM++ 2M SDE</strong>
                </div>
                <div className="mg-param-row">
                  <span>Steps</span>
                  <strong>25 &ndash; 30</strong>
                </div>
                <div className="mg-param-row">
                  <span>CFG Scale</span>
                  <strong>6.0 &ndash; 7.0</strong>
                </div>
                <div className="mg-param-row">
                  <span>Prefix Required</span>
                  <strong>score_9, score_8_up, rating_safe</strong>
                </div>
                <div className="mg-param-row">
                  <span>Native Resolution</span>
                  <strong>1024 &times; 1024 (Square)</strong>
                </div>
              </div>

              <div className="mg-preset-code-box">
                <div className="mg-code-head">
                  <span>Recommended Negative Prompt:</span>
                  <button
                    type="button"
                    className="mg-mini-copy-btn"
                    onClick={() =>
                      copyPrompt(
                        'score_6, score_5, score_4, simple background, ugly, bad hands, mutated fingers',
                        'neg-pony'
                      )
                    }
                  >
                    {copiedKey === 'neg-pony' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <code>score_6, score_5, score_4, simple background, ugly, bad hands, mutated fingers</code>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            Part 3: Base Architecture Comparison Matrix Table
            =================================================================== */}
        <div className="mg-table-section">
          <div className="mg-table-title-row">
            <h3>Base Architecture Comparison Matrix</h3>
            <p>Direct architectural metrics across Illustrious, SDXL, and legacy generative baselines.</p>
          </div>

          <div className="mg-table-container">
            <table className="mg-arch-table">
              <thead>
                <tr>
                  <th>METRIC / PROPERTY</th>
                  <th>ILLUSTRIOUS-XL</th>
                  <th>SDXL 1.0 BASE</th>
                  <th>SD 1.5 LEGACY</th>
                  <th>FLUX.1 SCHNELL</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Total Parameters</td>
                  <td>6.6B (T5 + CLIP)</td>
                  <td>6.6B (Dual CLIP)</td>
                  <td>1.0B (CLIP-ViT-L)</td>
                  <td>12.0B (Flow Matching)</td>
                </tr>
                <tr>
                  <td>Native Resolution</td>
                  <td>832 &times; 1216 or 1024&sup2;</td>
                  <td>1024 &times; 1024</td>
                  <td>512 &times; 512</td>
                  <td>1024 &times; 1024</td>
                </tr>
                <tr>
                  <td>Min VRAM (Inference)</td>
                  <td>6 GB (FP16)</td>
                  <td>8 GB (FP16)</td>
                  <td>4 GB</td>
                  <td>12 GB (FP8 Quantized)</td>
                </tr>
                <tr>
                  <td>Conditioning Tensors</td>
                  <td>587 Tensors</td>
                  <td>587 Tensors</td>
                  <td>77 Tensors</td>
                  <td>512 Tensors</td>
                </tr>
                <tr>
                  <td>Text Encoders</td>
                  <td>Dual OpenCLIP + ViT</td>
                  <td>CLIP ViT-L + OpenCLIP</td>
                  <td>CLIP ViT-L/14</td>
                  <td>T5-XXL + CLIP-L</td>
                </tr>
                <tr>
                  <td>Danbooru Tag Adherence</td>
                  <td className="mg-text-success">Native (High)</td>
                  <td>Weak (Natural text)</td>
                  <td>Moderate</td>
                  <td>Natural Prompting</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
