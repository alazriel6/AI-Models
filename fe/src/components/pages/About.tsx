import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../../style/About.css';

interface ArchSpec {
  id: string;
  name: string;
  category: string;
  baseArch: string;
  conditioner: string;
  clipSkip: string;
  nativeRes: string;
  minVram: string;
  recVram: string;
  sampler: string;
  steps: string;
  cfg: string;
  promptSyntax: string;
  notes: string;
}

const ARCH_SPECS: ArchSpec[] = [
  {
    id: 'illustrious',
    name: 'Illustrious XL & NoobAI',
    category: 'Anime / Manga',
    baseArch: 'SDXL 1.0 (Latent Diffusion)',
    conditioner: 'OpenCLIP ViT-bigG + CLIP ViT-L',
    clipSkip: '2',
    nativeRes: '832 × 1216 / 1024 × 1024',
    minVram: '6 GB (fp16 pruned)',
    recVram: '12 GB+',
    sampler: 'Euler a / DPM++ 2M Karras',
    steps: '24 - 30',
    cfg: '5.0 - 7.0',
    promptSyntax: 'Danbooru tag-ordered tokens (1girl, character, artist, outfit, aesthetic)',
    notes: 'Requires Clip Skip 2. Using Clip Skip 1 bypasses penultimate layer embeddings, producing oversaturated, burned outputs with high contrast degradation.',
  },
  {
    id: 'sdxl',
    name: 'SDXL 1.0 Base & Fine-tunes',
    category: 'General / Photoreal',
    baseArch: 'SDXL 1.0 Native',
    conditioner: 'Dual CLIP (OpenCLIP bigG/14 + CLIP ViT-L/14)',
    clipSkip: '1',
    nativeRes: '1024 × 1024 / 896 × 1152',
    minVram: '8 GB (fp16) / 6 GB (fp8)',
    recVram: '16 GB',
    sampler: 'DPM++ 2M SDE Karras / Euler a',
    steps: '30 - 40',
    cfg: '6.0 - 8.0',
    promptSyntax: 'Natural language prose + descriptive comma phrases',
    notes: 'Requires dual text encoder micro-conditioning (target_size, original_size, crop_coords). Without proper aspect bucketing, multi-subject duplications occur.',
  },
  {
    id: 'pony',
    name: 'Pony Diffusion V6 XL',
    category: 'Stylized / Aesthetic',
    baseArch: 'SDXL 1.0 Fine-tune',
    conditioner: 'Dual CLIP (OpenCLIP + CLIP-L)',
    clipSkip: '2',
    nativeRes: '896 × 1152 / 1024 × 1024',
    minVram: '6 GB (pruned)',
    recVram: '12 GB+',
    sampler: 'Euler a / DPM++ 2M Karras',
    steps: '25 - 35',
    cfg: '5.5 - 7.0',
    promptSyntax: 'score_9, score_8_up, score_7_up, source_anime, rating:safe ...',
    notes: 'Rigidly conditioned on score trigger prefixes. Omitting score tags yields the average training quality distribution, causing degraded line clarity.',
  },
  {
    id: 'sd15',
    name: 'Stable Diffusion 1.5 Classics',
    category: 'Legacy / Ultra-Fast',
    baseArch: 'SD 1.5 (Classic LDM)',
    conditioner: 'CLIP ViT-L/14 (Single Text Encoder)',
    clipSkip: '1 or 2 (model-specific)',
    nativeRes: '512 × 512 / 512 × 768',
    minVram: '4 GB',
    recVram: '8 GB',
    sampler: 'DPM++ 2M Karras / DDIM',
    steps: '20 - 30',
    cfg: '7.0',
    promptSyntax: 'Weighted comma tags, e.g. (masterpiece:1.2), 1girl, highly detailed',
    notes: 'Native training resolution is 512px. Direct sampling at >768px results in duplicate bodies and multi-head artifacts. Always use Hires.fix or latent upscale.',
  },
  {
    id: 'flux',
    name: 'Flux.1 (Dev / Schnell)',
    category: 'Next-Gen DiT',
    baseArch: 'Rectified Flow Transformer (DiT)',
    conditioner: 'T5-XXL + CLIP ViT-L',
    clipSkip: 'N/A (Flow Matching)',
    nativeRes: '1024 × 1024 up to 1536 × 1536',
    minVram: '12 GB (fp8) / 8 GB (GGUF Q4)',
    recVram: '24 GB (bf16 native)',
    sampler: 'Euler Simple / FlowMatchDiscrete',
    steps: '20 (Dev) / 4 (Schnell)',
    cfg: '1.0 (Schnell) / 3.5 (Dev)',
    promptSyntax: 'Dense, descriptive natural language paragraphs',
    notes: 'T5-XXL text encoder requires ~9GB alone in float32. Consumer GPUs must utilize fp8 or quantized GGUF text encoders to avoid host RAM paging thrash.',
  },
];

interface FaqItem {
  q: string;
  a: string;
  codeSnippet?: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    q: 'Why does Models Guide strictly enforce the SafeTensors standard?',
    a: 'Legacy checkpoint formats (.ckpt and .pt) serialize weights using Python pickle bytecode. Loading a pickle file executes arbitrary Python instructions on your machine, enabling dangerous remote code execution (RCE) vulnerabilities. SafeTensors, developed by Hugging Face, stores model weights in an immutable, contiguous binary layout preceded by a JSON header. It is mathematically incapable of code execution and enables instant zero-copy memory mapping (mmap).',
    codeSnippet: '8-byte Little Endian header_len -> JSON metadata -> Contiguous byte tensors (zero code execution)',
  },
  {
    q: 'What is Clip Skip and why does setting it to 1 on Illustrious or Pony ruin generation?',
    a: 'Clip Skip defines which layer of the CLIP text encoder is passed to the diffusion UNet. Clip Skip 1 passes the output of the final projection layer, whereas Clip Skip 2 halts at the penultimate layer. Checkpoints like Illustrious XL, NoobAI, and Pony V6 were fine-tuned specifically on penultimate layer hidden states, which contain richer semantic abstractions. When you generate with Clip Skip 1 on these models, the UNet receives mismatched, over-specialized embeddings, leading to burned, hyper-contrasted, and corrupted visuals.',
  },
  {
    q: 'Why must generation dimensions strictly adhere to multiples of 64 (Snap-64)?',
    a: 'Latent diffusion architectures use an 8x downsampling Variational Autoencoder (VAE) to compress RGB images into latent space (e.g. 1024x1024 pixels becomes 128x128 latents). Inside the UNet, downsampling convolutions further downsample feature maps by powers of 2 (up to 4 times, requiring 2^6 = 64). If your generation dimensions are not strictly divisible by 64, internal feature maps cannot align cleanly across residual skip connections, resulting in seam lines, blurred bands, and distorted limb anatomy.',
    codeSnippet: 'width % 64 === 0 && height % 64 === 0  // Mandatory for clean VAE latent reconstruction',
  },
  {
    q: 'What is LoRA burnout and how does Models Guide calculate cumulative weight safety?',
    a: 'LoRAs (Low-Rank Adaptations) decompose weight deltas as ΔW = (alpha / rank) * B * A. When multiple LoRAs are loaded simultaneously, their activation deltas accumulate additively in attention layers. If the sum of LoRA weights exceeds a safe threshold (typically ∑ w_i > 1.25), activations oversaturate the dynamic range of fp16 tensors. This produces "LoRA burnout"—manifesting as extreme neon chromatic aberration, plastic skin, and blown-out specular highlights. Models Guide provides a dynamic Burnout Guard in the LoRA Stack Builder to prevent this.',
  },
  {
    q: 'How does the Metadata Inspector audit models in milliseconds without downloading gigabytes?',
    a: 'SafeTensors files encode an 8-byte unsigned 64-bit integer at the very beginning of the file (offset 0..7), which indicates the exact byte length N of the JSON header. The Metadata Inspector performs an HTTP Range request (or local read) for bytes 0 through (8 + N). It parses only the JSON header—extracting tensor names, shapes, dtypes, and embedded training hyperparameters—without ever streaming the multi-gigabyte weight tensors following byte (8 + N).',
    codeSnippet: 'const headerLen = dataView.getBigUint64(0, true);  // Read first 8 bytes\nconst jsonHeader = decoder.decode(bytes.slice(8, 8 + headerLen));',
  },
  {
    q: 'Can Models Guide run completely offline on a local workstation?',
    a: 'Yes. Models Guide is engineered with a local-first philosophy. The backend is written in high-performance Go with an embedded SQLite database, and the frontend is an optimized Vite React 19 single-page application. All metadata parsing, Booru tag auto-completion, aspect ratio math, and LoRA stack calculations run 100% locally on your machine with zero external analytics, zero tracking cookies, and zero telemetry.',
  },
];

export default function About() {
  const [activeTab, setActiveTab] = useState<'overview' | 'tools' | 'matrix' | 'safetensors' | 'faq'>('overview');
  const [selectedArchId, setSelectedArchId] = useState<string>('illustrious');
  const [archFilter, setArchFilter] = useState<string>('all');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const selectedArch = ARCH_SPECS.find((a) => a.id === selectedArchId) || ARCH_SPECS[0];

  const filteredArchs = archFilter === 'all'
    ? ARCH_SPECS
    : ARCH_SPECS.filter((a) => a.id === archFilter);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="about-page">
      {/* ====================================================================
          HERO / MASTHEAD SECTION
          ==================================================================== */}
      <section className="about-hero">
        <div className="about-hero-top">
          <div className="about-system-badge">
            <span className="about-badge-dot" />
            <span>MODELS GUIDE // TECHNICAL SYSTEM REFERENCE</span>
          </div>
          <span className="about-version-stamp">REV 2026.4 • SAFETENSORS v2 PROTOCOL</span>
        </div>

        <div className="about-hero-title-group">
          <h1>Generative AI Model Reference &amp; Inspection Toolkit</h1>
          <p className="about-hero-lead">
            An independent, zero-copy SafeTensors analyzer, multi-architecture benchmark catalog,
            and prompt engineering workstation built for machine learning practitioners, checkpoint fine-tuners,
            and digital artists who demand technical precision over marketing hype.
          </p>
        </div>

        <div className="about-hero-badges">
          <span className="about-pill-tag">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Zero Arbitrary Code Execution (Pickle-Free)
          </span>
          <span className="about-pill-tag">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            SafeTensors JSON Header Streaming
          </span>
          <span className="about-pill-tag">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            AutoV2 &amp; Blake3 Cryptographic Hashes
          </span>
          <span className="about-pill-tag">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            Local-First &amp; Zero Tracking
          </span>
        </div>

        <div className="about-hero-actions">
          <Link to="/models" className="about-btn about-btn-primary">
            Browse Model Directory →
          </Link>
          <Link to="/inspector" className="about-btn about-btn-secondary">
            Metadata Inspector
          </Link>
          <Link to="/compare" className="about-btn about-btn-secondary">
            Model Comparison
          </Link>
          <Link to="/prompt-lab" className="about-btn about-btn-secondary">
            Prompt Studio &amp; Lab
          </Link>
          <Link to="/lora-stack" className="about-btn about-btn-secondary">
            LoRA Stack Builder
          </Link>
          <Link to="/calculator" className="about-btn about-btn-secondary">
            Resolution Calculator
          </Link>
        </div>
      </section>

      {/* ====================================================================
          METRIC STRIP (4 SOLID STAT CARDS)
          ==================================================================== */}
      <div className="about-metric-strip">
        <div className="about-metric-card">
          <span className="about-metric-val metric-blue">0 MB</span>
          <span className="about-metric-label">Memory Overhead for Headers</span>
          <p className="about-metric-desc">Reads 8-byte uint64 JSON header without allocating weight tensors into RAM.</p>
        </div>

        <div className="about-metric-card">
          <span className="about-metric-val metric-green">10-Char</span>
          <span className="about-metric-label">Deterministic AutoV2 Hashes</span>
          <p className="about-metric-desc">Matches Automatic1111, SD-Forge, and ComfyUI model cache digests.</p>
        </div>

        <div className="about-metric-card">
          <span className="about-metric-val metric-amber">5+ Archs</span>
          <span className="about-metric-label">Benchmarked Architectures</span>
          <p className="about-metric-desc">Detailed hardware profiles for SD 1.5, SDXL, Illustrious XL, Pony V6, and Flux.</p>
        </div>

        <div className="about-metric-card">
          <span className="about-metric-val">Snap-64</span>
          <span className="about-metric-label">VAE Latent Alignment</span>
          <p className="about-metric-desc">Strict 8x VAE divisible resolution buckets to eliminate seam line artifacts.</p>
        </div>
      </div>

      {/* ====================================================================
          INTERACTIVE NAVIGATION TABS
          ==================================================================== */}
      <nav className="about-tabs-bar" aria-label="About section navigation">
        <button
          type="button"
          className={`about-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <span>Platform Overview</span>
          <span className="about-tab-badge">01</span>
        </button>

        <button
          type="button"
          className={`about-tab-btn ${activeTab === 'tools' ? 'active' : ''}`}
          onClick={() => setActiveTab('tools')}
        >
          <span>Engineering Toolkit</span>
          <span className="about-tab-badge">02</span>
        </button>

        <button
          type="button"
          className={`about-tab-btn ${activeTab === 'matrix' ? 'active' : ''}`}
          onClick={() => setActiveTab('matrix')}
        >
          <span>Hardware &amp; Architecture Matrix</span>
          <span className="about-tab-badge">03</span>
        </button>

        <button
          type="button"
          className={`about-tab-btn ${activeTab === 'safetensors' ? 'active' : ''}`}
          onClick={() => setActiveTab('safetensors')}
        >
          <span>SafeTensors &amp; Hash Engine</span>
          <span className="about-tab-badge">04</span>
        </button>

        <button
          type="button"
          className={`about-tab-btn ${activeTab === 'faq' ? 'active' : ''}`}
          onClick={() => setActiveTab('faq')}
        >
          <span>Technical FAQ</span>
          <span className="about-tab-badge">05</span>
        </button>
      </nav>

      {/* ====================================================================
          TAB 1: PLATFORM OVERVIEW & CORE MISSION
          ==================================================================== */}
      {activeTab === 'overview' && (
        <div className="about-tab-panel">
          <div className="about-panel-header">
            <h2>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              The Problem with Generative Model Discovery
            </h2>
            <p>
              Generative AI checkpoint directories are often cluttered with hundreds of unverified merges,
              missing trigger word documentation, unstated Clip Skip requirements, and obscure VRAM bottlenecks.
            </p>
          </div>

          <div className="about-problem-solution-grid">
            <div className="about-comp-card is-problem">
              <h3 className="about-comp-title">The Fragmented Ecosystem</h3>
              <ul className="about-comp-list">
                <li className="about-comp-item">
                  <span className="about-comp-icon-neg">✕</span>
                  <span><strong>Pickle Vulnerabilities:</strong> Legacy .ckpt and .pt files execute arbitrary Python bytecode upon deserialization.</span>
                </li>
                <li className="about-comp-item">
                  <span className="about-comp-icon-neg">✕</span>
                  <span><strong>Undocumented Clip Skip:</strong> Using Clip Skip 1 on Illustrious or Pony yields heavily burned, degraded images without warning.</span>
                </li>
                <li className="about-comp-item">
                  <span className="about-comp-icon-neg">✕</span>
                  <span><strong>VRAM Guesswork:</strong> Users attempt to run unquantized 16-bit checkpoints on 6GB GPUs, crashing ComfyUI with OOM errors.</span>
                </li>
                <li className="about-comp-item">
                  <span className="about-comp-icon-neg">✕</span>
                  <span><strong>Non-Divisible Dimensions:</strong> Generating at arbitrary resolutions causes VAE downsampling seams and duplicated limbs.</span>
                </li>
              </ul>
            </div>

            <div className="about-comp-card is-solution">
              <h3 className="about-comp-title">The Models Guide Standard</h3>
              <ul className="about-comp-list">
                <li className="about-comp-item">
                  <span className="about-comp-icon-pos">✓</span>
                  <span><strong>100% SafeTensors Only:</strong> Zero arbitrary code execution risk; instant zero-copy header inspection.</span>
                </li>
                <li className="about-comp-item">
                  <span className="about-comp-icon-pos">✓</span>
                  <span><strong>Verified Inference Parameters:</strong> Explicit Clip Skip, CFG bounds, optimal step ranges, and trigger token documentation.</span>
                </li>
                <li className="about-comp-item">
                  <span className="about-comp-icon-pos">✓</span>
                  <span><strong>Precision Hardware Profiling:</strong> Strict min vs recommended VRAM thresholds across fp16, fp8, and GGUF quantizations.</span>
                </li>
                <li className="about-comp-item">
                  <span className="about-comp-icon-pos">✓</span>
                  <span><strong>Snap-64 Mathematical Precision:</strong> Pre-calculated resolution tables strictly divisible by 64 to ensure clean latent alignment.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* 4 Engineering Pillars */}
          <div className="about-panel-header">
            <h2>Core Engineering Pillars</h2>
            <p>Built from the ground up for technical reliability, deterministic behavior, and local autonomy.</p>
          </div>

          <div className="about-pillars-grid">
            <div className="about-pillar-card">
              <div className="about-pillar-header">
                <div className="about-pillar-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="9" y1="21" x2="9" y2="9" />
                  </svg>
                </div>
                <h3>Zero-Copy Header Parser</h3>
              </div>
              <p>
                Reads the 8-byte uint64 header offset and parses JSON metadata directly in Go and TypeScript.
                Audits tensor counts, layer distribution (Conditioner, UNet, VAE, DiT), and training hyperparameters
                in under 5 milliseconds without streaming gigabytes of weight tensors into system RAM.
              </p>
              <span className="about-pillar-meta">LATENCY: &lt; 5ms // MEMORY: ~12 KB</span>
            </div>

            <div className="about-pillar-card">
              <div className="about-pillar-header">
                <div className="about-pillar-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <h3>Cryptographic AutoV2 Verification</h3>
              </div>
              <p>
                Computes deterministic 10-character AutoV2 hashes and Blake3 checksums matching the internal
                cache formats of Automatic1111, SD-Forge, and ComfyUI. Eliminates model ambiguity and guarantees
                that you are referencing the exact version used in benchmark prompts.
              </p>
              <span className="about-pillar-meta">ALGORITHM: CRC32 / AutoV2 / Blake3</span>
            </div>

            <div className="about-pillar-card">
              <div className="about-pillar-header">
                <div className="about-pillar-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="16" height="16" x="4" y="4" rx="2" />
                    <rect width="6" height="6" x="9" y="9" rx="1" />
                    <line x1="9" y1="2" x2="9" y2="4" />
                    <line x1="15" y1="2" x2="15" y2="4" />
                    <line x1="9" y1="20" x2="9" y2="22" />
                    <line x1="15" y1="20" x2="15" y2="22" />
                    <line x1="20" y1="9" x2="22" y2="9" />
                    <line x1="20" y1="14" x2="22" y2="14" />
                    <line x1="2" y1="9" x2="4" y2="9" />
                    <line x1="2" y1="14" x2="4" y2="14" />
                  </svg>
                </div>
                <h3>Hardware &amp; Quantization Profiling</h3>
              </div>
              <p>
                Calculates memory budgets for full-precision (fp32), half-precision (fp16/bf16), 8-bit quantized (fp8),
                and GGUF formats. Provides verified recommendations for batch sizes, context window length, and VRAM overhead
                for offloaded text encoders (such as T5-XXL on Flux).
              </p>
              <span className="about-pillar-meta">PRECISION: FP32 / FP16 / BF16 / FP8 / GGUF</span>
            </div>

            <div className="about-pillar-card">
              <div className="about-pillar-header">
                <div className="about-pillar-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 17 10 11 4 5" />
                    <line x1="12" y1="19" x2="20" y2="19" />
                  </svg>
                </div>
                <h3>10-Layer Prompt &amp; LoRA Synthesis</h3>
              </div>
              <p>
                Deconstructs prompts into semantic taxonomy layers: Subject, Outfit, Pose, Environment, Lighting,
                Style, Composition, and Quality tokens. Integrates mathematical LoRA stack burnout prevention to
                prevent activation clipping when stacking multiple fine-tune networks.
              </p>
              <span className="about-pillar-meta">RULE: ∑ w_i ≤ 1.25 BURNOUT GUARD</span>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 2: BUILT-IN TOOLING SUITE
          ==================================================================== */}
      {activeTab === 'tools' && (
        <div className="about-tab-panel">
          <div className="about-panel-header">
            <h2>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
              The Models Guide Engineering Toolset
            </h2>
            <p>
              A suite of 5 dedicated generative AI utilities integrated into a unified workstation.
              Zero external dependencies, zero cloud API keys required.
            </p>
          </div>

          <div className="about-tools-grid">
            {/* Tool 1: Metadata Inspector */}
            <div className="about-tool-card">
              <div className="about-tool-top">
                <div className="about-tool-title-row">
                  <h3 className="about-tool-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <circle cx="11.5" cy="14.5" r="2.5" />
                      <path d="m13.5 16.5 2 2" />
                    </svg>
                    Metadata Inspector
                  </h3>
                  <span className="about-tool-badge">HEADER AUDIT</span>
                </div>
                <p>
                  Zero-copy SafeTensors analyzer. Parses header metadata, inspects tensor names, data types,
                  and training parameters (learning rate, epochs, network rank) directly in your browser.
                </p>
                <ul className="about-tool-features">
                  <li>Direct 8-byte uint64 parsing without loading full weights</li>
                  <li>Layer decomposition: Conditioner, UNet/DiT, and VAE</li>
                  <li>LoRA network rank (r) and alpha (α) extraction</li>
                  <li>AutoV2 10-char hash and Blake3 verification</li>
                </ul>
              </div>
              <div className="about-tool-footer">
                <span className="about-tool-route">ROUTE: /inspector</span>
                <Link to="/inspector" className="about-tool-link">
                  Open Inspector →
                </Link>
              </div>
            </div>

            {/* Tool 2: Model Comparison */}
            <div className="about-tool-card">
              <div className="about-tool-top">
                <div className="about-tool-title-row">
                  <h3 className="about-tool-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="18" x="3" y="3" rx="2" />
                      <line x1="12" y1="3" x2="12" y2="21" />
                    </svg>
                    Model Comparison
                  </h3>
                  <span className="about-tool-badge">DIFF MATRIX</span>
                </div>
                <p>
                  Side-by-side technical differential for 2 or 3 models simultaneously. Compares resolution buckets,
                  clip skip settings, optimal samplers, and tensor footprints to resolve checkpoint conflicts.
                </p>
                <ul className="about-tool-features">
                  <li>2-way and 3-way side-by-side spec differential</li>
                  <li>VRAM requirement and resolution bucket comparison</li>
                  <li>Trigger token and author parameter validation</li>
                  <li>Sample image lightbox with embedded prompt inspection</li>
                </ul>
              </div>
              <div className="about-tool-footer">
                <span className="about-tool-route">ROUTE: /compare</span>
                <Link to="/compare" className="about-tool-link">
                  Compare Models →
                </Link>
              </div>
            </div>

            {/* Tool 3: Prompt Studio & Lab */}
            <div className="about-tool-card">
              <div className="about-tool-top">
                <div className="about-tool-title-row">
                  <h3 className="about-tool-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
                      <path d="M8.5 2h7" />
                      <path d="M7 16h10" />
                    </svg>
                    Prompt Studio &amp; Lab
                  </h3>
                  <span className="about-tool-badge">PROMPT MATRIX</span>
                </div>
                <p>
                  10-layer semantic prompt deconstructor and synthesizer. Deconstructs raw generation prompts into
                  structured categories: Subject, Outfit, Pose, Environment, Lighting, Style, and Quality.
                </p>
                <ul className="about-tool-features">
                  <li>10-layer semantic taxonomy deconstruction</li>
                  <li>Booru tag auto-completion with category indicators</li>
                  <li>Danbooru rating and safety tag sanitization</li>
                  <li>Cross-architecture syntax conversion (SDXL to Pony to IL-XL)</li>
                </ul>
              </div>
              <div className="about-tool-footer">
                <span className="about-tool-route">ROUTE: /prompt-lab</span>
                <Link to="/prompt-lab" className="about-tool-link">
                  Open Prompt Lab →
                </Link>
              </div>
            </div>

            {/* Tool 4: LoRA Stack Builder */}
            <div className="about-tool-card">
              <div className="about-tool-top">
                <div className="about-tool-title-row">
                  <h3 className="about-tool-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 2 7 12 12 22 7 12 2" />
                      <polyline points="2 17 12 22 22 17" />
                      <polyline points="2 12 12 17 22 12" />
                    </svg>
                    LoRA Stack Builder
                  </h3>
                  <span className="about-tool-badge">WEIGHT GUARD</span>
                </div>
                <p>
                  Multi-network LoRA weight calculator. Simulates cumulative weight interaction across attention
                  layers and prevents contrast blowout using mathematical burnout protection.
                </p>
                <ul className="about-tool-features">
                  <li>Multi-adapter stack builder with interactive sliders</li>
                  <li>Burnout Guard alert when cumulative weight ∑ w_i &gt; 1.25</li>
                  <li>Automatic trigger word extraction and prompt injection</li>
                  <li>Exportable ComfyUI and Automatic1111 LoRA prompt syntax</li>
                </ul>
              </div>
              <div className="about-tool-footer">
                <span className="about-tool-route">ROUTE: /lora-stack</span>
                <Link to="/lora-stack" className="about-tool-link">
                  Open LoRA Stack →
                </Link>
              </div>
            </div>

            {/* Tool 5: Resolution Calculator */}
            <div className="about-tool-card">
              <div className="about-tool-top">
                <div className="about-tool-title-row">
                  <h3 className="about-tool-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="16" height="20" x="4" y="2" rx="2" />
                      <line x1="8" y1="6" x2="16" y2="6" />
                      <line x1="16" y1="14" x2="16" y2="18" />
                      <path d="M16 10h.01" />
                      <path d="M12 10h.01" />
                      <path d="M8 10h.01" />
                      <path d="M12 14h.01" />
                      <path d="M8 14h.01" />
                      <path d="M12 18h.01" />
                      <path d="M8 18h.01" />
                    </svg>
                    Resolution Calculator
                  </h3>
                  <span className="about-tool-badge">SNAP-64 MATH</span>
                </div>
                <p>
                  Aspect ratio calculator engineered for latent diffusion. Snaps any arbitrary target dimension
                  to exact multiples of 64 to guarantee seamless 8x VAE compression without artifacts.
                </p>
                <ul className="about-tool-features">
                  <li>Snap-64 mathematical dimension calculation</li>
                  <li>Aspect ratio presets: 1:1, 3:4, 2:3, 9:16, 16:9, 21:9</li>
                  <li>Megapixel count, aspect ratio error, and VRAM memory profiling</li>
                  <li>Copy-ready width and height parameters for WebUI/ComfyUI</li>
                </ul>
              </div>
              <div className="about-tool-footer">
                <span className="about-tool-route">ROUTE: /calculator</span>
                <Link to="/calculator" className="about-tool-link">
                  Open Calculator →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 3: HARDWARE & ARCHITECTURE MATRIX
          ==================================================================== */}
      {activeTab === 'matrix' && (
        <div className="about-tab-panel">
          <div className="about-panel-header">
            <h2>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
              Hardware &amp; Architecture Benchmark Matrix
            </h2>
            <p>
              Authoritative technical parameters across mainstream generative image synthesis checkpoints.
              Select any row to view granular inference bounds and critical gotchas.
            </p>
          </div>

          <div className="about-arch-filters">
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>
              Filter Architecture:
            </span>
            <button
              type="button"
              className={`about-filter-btn ${archFilter === 'all' ? 'active' : ''}`}
              onClick={() => setArchFilter('all')}
            >
              All Architectures ({ARCH_SPECS.length})
            </button>
            {ARCH_SPECS.map((arch) => (
              <button
                key={arch.id}
                type="button"
                className={`about-filter-btn ${archFilter === arch.id ? 'active' : ''}`}
                onClick={() => setArchFilter(arch.id)}
              >
                {arch.name.split(' ')[0]}
              </button>
            ))}
          </div>

          <div className="about-matrix-container">
            <div className="about-matrix-table-wrap">
              <table className="about-matrix-table">
                <thead>
                  <tr>
                    <th>Architecture</th>
                    <th>Base LDM / DiT</th>
                    <th>Clip Skip</th>
                    <th>Native Res (Snap-64)</th>
                    <th>Min VRAM</th>
                    <th>Recommended VRAM</th>
                    <th>Optimal Sampler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredArchs.map((arch) => {
                    const isSelected = selectedArchId === arch.id;
                    return (
                      <tr
                        key={arch.id}
                        className={`interactive-row ${isSelected ? 'selected-row' : ''}`}
                        onClick={() => setSelectedArchId(arch.id)}
                      >
                        <td>
                          <span className="arch-badge">{arch.name}</span>
                          <span className="arch-subtext">{arch.category}</span>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#FFFFFF' }}>
                            {arch.baseArch}
                          </span>
                        </td>
                        <td>
                          <span className="clip-badge">Skip {arch.clipSkip}</span>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#E2E8F0' }}>
                            {arch.nativeRes}
                          </span>
                        </td>
                        <td>
                          <span className="vram-tag vram-min">{arch.minVram}</span>
                        </td>
                        <td>
                          <span className="vram-tag vram-rec">{arch.recVram}</span>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', color: '#CBD5E1' }}>{arch.sampler}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Architecture Detailed Inspection Drawer */}
          <div className="about-arch-detail-card">
            <div className="about-arch-detail-header">
              <div>
                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#38BDF8', fontWeight: 700, textTransform: 'uppercase' }}>
                  SPECIFICATION PROFILE // {selectedArch.category.toUpperCase()}
                </span>
                <h3>{selectedArch.name}</h3>
              </div>
              <span className="clip-badge">CLIP SKIP: {selectedArch.clipSkip}</span>
            </div>

            <div className="about-arch-detail-grid">
              <div className="about-arch-detail-item">
                <span className="about-arch-detail-label">Text Conditioner / Encoders</span>
                <span className="about-arch-detail-val">{selectedArch.conditioner}</span>
              </div>
              <div className="about-arch-detail-item">
                <span className="about-arch-detail-label">Recommended Steps</span>
                <span className="about-arch-detail-val">{selectedArch.steps} steps</span>
              </div>
              <div className="about-arch-detail-item">
                <span className="about-arch-detail-label">Optimal CFG Scale</span>
                <span className="about-arch-detail-val">{selectedArch.cfg}</span>
              </div>
              <div className="about-arch-detail-item" style={{ gridColumn: 'span 3' }}>
                <span className="about-arch-detail-label">Prompt Syntax Style</span>
                <span className="about-arch-detail-val" style={{ fontFamily: 'monospace', fontSize: '12px', color: '#38BDF8' }}>
                  {selectedArch.promptSyntax}
                </span>
              </div>
            </div>

            <p className="about-arch-detail-note">
              <strong>Technical Gotcha:</strong> {selectedArch.notes}
            </p>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 4: SAFETENSORS & SECURITY DEEP DIVE
          ==================================================================== */}
      {activeTab === 'safetensors' && (
        <div className="about-tab-panel">
          <div className="about-panel-header">
            <h2>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M12 8v8" />
                <path d="M8 12h8" />
              </svg>
              The SafeTensors Binary Specification &amp; Hash Protocol
            </h2>
            <p>
              Why the SafeTensors standard completely replaces Python pickle serialization, and how Models Guide
              audits model tensors in under 5 milliseconds.
            </p>
          </div>

          <div className="about-safetensors-breakdown">
            {/* Visual Binary Layout Breakdown */}
            <div className="about-binary-visual-card">
              <h3>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                Physical Byte Stream Anatomy (.safetensors)
              </h3>
              <p style={{ fontSize: '13px', color: '#CBD5E1', margin: 0 }}>
                Every SafeTensors file begins with a strictly defined 8-byte little-endian header length, followed by
                UTF-8 JSON metadata, followed immediately by contiguous, zero-padding aligned binary tensor buffers.
              </p>

              <div className="about-binary-stream">
                <div className="about-binary-block">
                  <span className="about-block-range">0x00 .. 0x07</span>
                  <div className="about-block-info">
                    <span className="about-block-title">Header Length N (8-byte unsigned uint64, Little Endian)</span>
                    <span className="about-block-desc">
                      Tells the parser the exact length in bytes of the following JSON header. Read with dataView.getBigUint64(0, true).
                    </span>
                  </div>
                </div>

                <div className="about-binary-block">
                  <span className="about-block-range">0x08 .. (8 + N)</span>
                  <div className="about-block-info">
                    <span className="about-block-title">UTF-8 JSON Header Manifest</span>
                    <span className="about-block-desc">
                      Contains __metadata__ (training hyperparameters, author info) and tensor descriptors (dtype, shape, data_offsets).
                    </span>
                  </div>
                </div>

                <div className="about-binary-block">
                  <span className="about-block-range">(8 + N) .. EOF</span>
                  <div className="about-block-info">
                    <span className="about-block-title">Raw Contiguous Tensor Weight Buffers</span>
                    <span className="about-block-desc">
                      Binary FP16, BF16, or FP8 weights mapped directly to memory via mmap. Zero Python code execution overhead.
                    </span>
                  </div>
                </div>
              </div>

              <div className="about-hash-engine-box">
                <h4>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 17 10 11 4 5" />
                    <line x1="12" y1="19" x2="20" y2="19" />
                  </svg>
                  Client-Side Header Extraction Implementation
                </h4>
                <p>
                  Models Guide extracts layer shapes in the browser without downloading the full multi-gigabyte file:
                </p>
                <pre className="about-code-snippet">
{`// 1. Fetch only the first 8 bytes to get the header length N
const lenBuffer = await fetch(url, { headers: { Range: "bytes=0-7" } });
const headerLength = new DataView(await lenBuffer.arrayBuffer()).getBigUint64(0, true);

// 2. Fetch precisely bytes 8 through (8 + headerLength)
const headerBuffer = await fetch(url, { 
  headers: { Range: \`bytes=8-\${7 + Number(headerLength)}\` } 
});
const manifest = JSON.parse(new TextDecoder().decode(await headerBuffer.arrayBuffer()));`}
                </pre>
              </div>
            </div>

            {/* Security & Format Comparison */}
            <div className="about-security-card">
              <h3>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Security: SafeTensors vs Pickle (.ckpt)
              </h3>
              <p style={{ fontSize: '13px', color: '#CBD5E1', margin: 0 }}>
                Comparison of safety and memory efficiency across machine learning checkpoint formats:
              </p>

              <table className="about-security-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>SafeTensors</th>
                    <th>Pickle (.ckpt / .pt)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Arbitrary Code Risk</strong></td>
                    <td><span className="about-sec-safe">Zero (Safe)</span></td>
                    <td><span className="about-sec-danger">High (RCE Exploit)</span></td>
                  </tr>
                  <tr>
                    <td><strong>Zero-Copy mmap</strong></td>
                    <td><span className="about-sec-safe">Supported</span></td>
                    <td><span className="about-sec-danger">Unsupported</span></td>
                  </tr>
                  <tr>
                    <td><strong>Header-Only Audit</strong></td>
                    <td><span className="about-sec-safe">&lt; 5ms</span></td>
                    <td><span className="about-sec-danger">Full read required</span></td>
                  </tr>
                  <tr>
                    <td><strong>DOS / Memory Bomb</strong></td>
                    <td><span className="about-sec-safe">Immune</span></td>
                    <td><span className="about-sec-danger">Vulnerable</span></td>
                  </tr>
                  <tr>
                    <td><strong>AutoV2 Verification</strong></td>
                    <td><span className="about-sec-safe">Deterministic</span></td>
                    <td><span className="about-sec-danger">Non-deterministic</span></td>
                  </tr>
                </tbody>
              </table>

              <div className="about-hash-engine-box">
                <h4>Deterministic AutoV2 Hashing</h4>
                <p>
                  Automatic1111 and SD-Forge compute a 10-character AutoV2 model hash to identify models across prompts.
                  Models Guide calculates the exact AutoV2 hash during indexing so that prompts loaded from gallery
                  cards automatically resolve to the matching local model cache entry.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 5: TECHNICAL FAQ
          ==================================================================== */}
      {activeTab === 'faq' && (
        <div className="about-tab-panel">
          <div className="about-panel-header">
            <h2>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Frequently Asked Technical Questions
            </h2>
            <p>
              Grounded, practical explanations of diffusion mechanics, tensor quantization, and generation parameters.
            </p>
          </div>

          <div className="about-faq-list">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div key={index} className={`about-faq-item ${isOpen ? 'is-open' : ''}`}>
                  <button
                    type="button"
                    className="about-faq-question"
                    onClick={() => toggleFaq(index)}
                    aria-expanded={isOpen}
                  >
                    <span className="about-faq-question-text">
                      <span className="about-faq-q-badge">Q0{index + 1}</span>
                      <span>{item.q}</span>
                    </span>
                    <svg
                      className="about-faq-chevron"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {isOpen && (
                    <div className="about-faq-answer">
                      <p>{item.a}</p>
                      {item.codeSnippet && (
                        <pre className="about-code-snippet" style={{ marginTop: '10px' }}>
                          {item.codeSnippet}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ====================================================================
          SYSTEM ARCHITECTURE & FOOTER SPECIFICATIONS
          ==================================================================== */}
      <div className="about-system-specs-card">
        <div className="about-system-specs-left">
          <span className="about-system-specs-title">Platform Runtime Architecture</span>
          <p className="about-system-specs-desc">
            Engineered with modern web standards and high-performance systems programming.
          </p>
        </div>

        <div className="about-tech-stack-pills">
          <span className="about-tech-pill">React 19 &amp; TypeScript</span>
          <span className="about-tech-pill">Vite 8.3 &amp; Rolldown</span>
          <span className="about-tech-pill">TanStack Virtual</span>
          <span className="about-tech-pill">Go 1.24+ REST API</span>
          <span className="about-tech-pill">SQLite &amp; GORM</span>
          <span className="about-tech-pill">Zero CSS-in-JS Overhead</span>
        </div>
      </div>
    </div>
  );
}
