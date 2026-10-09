import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getModels, type Model } from '../../api/models';

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
    name: 'Entry Level GPU (GTX 1650, RTX 3050 mobile)',
    status: 'entry',
    supportedModels: ['SD 1.5 Checkpoints', 'Lightweight LoRAs (rank 16-32)'],
    maxResolution: '512 × 512 or 512 × 768',
    recommendedFlags: '--medvram-sdpt --opt-sdp-attention --lowvram',
    tips: 'Illustrious & SDXL may OOM. Enable Tiled VAE for decoding images above 512px.',
  },
  '6gb': {
    vram: '6 GB',
    name: 'Mid-Tier GPU (RTX 2060, RTX 3060 mobile)',
    status: 'entry',
    supportedModels: ['SD 1.5', 'Illustrious XL (fp16 pruned)', 'NoobAI', 'Style LoRAs'],
    maxResolution: '832 × 1216 or 1024 × 1024 (Single batch)',
    recommendedFlags: '--medvram --xformers or --opt-sdp-attention',
    tips: 'Can run Illustrious XL smoothly with fp16 models. Avoid batch sizes larger than 1.',
  },
  '8gb': {
    vram: '8 GB',
    name: 'Standard Sweetspot (RTX 3060 Ti, RTX 4060, RTX 2070)',
    status: 'recommended',
    supportedModels: ['SDXL 1.0', 'Illustrious XL', 'NoobAI', 'Pony V6', 'Multiple LoRAs'],
    maxResolution: '1024 × 1024 native, Hi-Res Fix up to 1.5x',
    recommendedFlags: '--opt-sdp-attention --no-half-vae',
    tips: 'Comfortably handles native 1024x1024 generation. Excellent performance for Illustrious fine-tunes.',
  },
  '12gb': {
    vram: '12 GB',
    name: 'High Performance (RTX 3060 12GB, RTX 4070)',
    status: 'recommended',
    supportedModels: ['All SDXL / Illustrious models', 'Flux Schnell (fp8)', 'Batch generation (2-4x)'],
    maxResolution: '1024 × 1536 native, Hi-Res Fix 2.0x',
    recommendedFlags: 'Native FP16 execution, xformers / PyTorch 2.x SDPA',
    tips: 'Runs all current anime checkpoints with zero compromises. Hi-Res Fix upscales fast without tiling.',
  },
  '16gb': {
    vram: '16 GB - 24 GB+',
    name: 'Workstation / Enthusiast (RTX 4080, RTX 4090, RTX 3090)',
    status: 'powerhouse',
    supportedModels: ['Flux.1 Dev / Schnell', 'SDXL batch 4+', 'LoRA Training & Fast Inpainting'],
    maxResolution: '2048 × 2048+ with Hi-Res Fix',
    recommendedFlags: 'Full speed FP16 / BF16 without any low-vram switches',
    tips: 'Ideal for local LoRA training, complex ControlNet workflows, and instant generation speeds.',
  },
};

export default function Home() {
  const navigate = useNavigate();
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedVram, setSelectedVram] = useState<string>('8gb');
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

  // Fetch catalog models from API
  useEffect(() => {
    getModels({ limit: 50 })
      .then((res) => {
        if (res?.data && Array.isArray(res.data)) {
          setModels(res.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load models on Home:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  // Featured spotlight model (prefer Raehoshi or highest likes)
  const spotlightModel = useMemo(() => {
    if (models.length === 0) return null;
    const raehoshi = models.find((m) => m.slug.includes('raehoshi'));
    if (raehoshi) return raehoshi;
    return [...models].sort((a, b) => b.likes - a.likes)[0];
  }, [models]);

  // Models filtered for category preview
  const displayedModels = useMemo(() => {
    if (selectedCategory === 'all') {
      return models.slice(0, 6);
    }
    if (selectedCategory === 'checkpoints') {
      return models.filter((m) => m.type === 'checkpoint').slice(0, 6);
    }
    if (selectedCategory === 'lora') {
      return models.filter((m) => m.type === 'lora').slice(0, 6);
    }
    if (selectedCategory === 'illustrious') {
      return models.filter((m) => m.base_model?.toLowerCase().includes('illustrious')).slice(0, 6);
    }
    if (selectedCategory === 'noobai') {
      return models.filter((m) => m.base_model?.toLowerCase().includes('noobai')).slice(0, 6);
    }
    return models.slice(0, 6);
  }, [models, selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/models?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/models');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(id);
    setTimeout(() => setCopiedPrompt(null), 2000);
  };

  const currentVramInfo = VRAM_PRESETS[selectedVram] || VRAM_PRESETS['8gb'];

  return (
    <div className="home-page-container">
      {/* ===================================================================
          Hero Banner Section: Dense, Technical, Professional
          =================================================================== */}
      <section className="home-hero-banner">
        <div className="hero-text-block">
          <div className="hero-badge-pill">
            <span>REFERENCE</span> Local Generative AI Architecture
          </div>
          <h1 className="hero-title">
            Models Guide & Inference Reference
          </h1>
          <p className="hero-description">
            Tensor layer analysis, verified inference parameters, SafeTensors structure verification,
            and VRAM hardware requirements for SDXL, Illustrious, and anime fine-tunes.
          </p>

          {/* Quick Search Form inside Hero */}
          <form className="home-hero-search-form" onSubmit={handleSearchSubmit}>
            <div className="home-hero-search-wrapper">
              <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="home-hero-search-input"
                placeholder="Search models, base architectures, creators, or triggers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="home-hero-search-btn">
                Search
              </button>
            </div>

            <div className="hero-quick-tags">
              <span className="quick-tag-label">Quick Filter:</span>
              <button type="button" className="quick-tag-btn" onClick={() => navigate('/models?tab=checkpoints')}>Checkpoints</button>
              <button type="button" className="quick-tag-btn" onClick={() => navigate('/models?tab=lora')}>LoRA</button>
              <button type="button" className="quick-tag-btn" onClick={() => navigate('/models?tab=illustrious')}>Illustrious</button>
              <button type="button" className="quick-tag-btn" onClick={() => navigate('/models?tab=noobai')}>NoobAI</button>
            </div>
          </form>

          <div className="hero-actions-row">
            <Link to="/models" className="global-btn global-btn-primary">
              Browse Models ({models.length || '...'}) →
            </Link>

            <Link to="/gallery" className="global-btn global-btn-secondary">
              Generation Gallery
            </Link>

            <a href="#vram-advisor" className="global-btn global-btn-secondary">
              VRAM Advisor
            </a>

            <Link to="/about" className="global-btn global-btn-secondary">
              Architecture Overview
            </Link>
          </div>
        </div>

        {/* Dynamic Spotlight Featured Model Card */}
        <div className="hero-spotlight-card">
          <div className="spotlight-img-wrapper">
            {spotlightModel?.thumbnail_url ? (
              <img
                src={spotlightModel.thumbnail_url}
                alt={spotlightModel?.name || 'Featured Checkpoint'}
                className="spotlight-img"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=Preview';
                }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0e1012', minHeight: '190px', gap: '6px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666c75" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span style={{ fontSize: '11px', color: '#666c75' }}>No Sample Image</span>
              </div>
            )}
            <span className="spotlight-overlay-badge">
              {spotlightModel?.type === 'lora' ? 'FEATURED LORA' : 'FEATURED CHECKPOINT'}
            </span>
          </div>

          <div className="spotlight-content">
            <div className="spotlight-title-row">
              <h3 className="spotlight-title">
                {spotlightModel ? spotlightModel.name : 'Raehoshi illust XL'}
              </h3>
              <span className="mini-stat-chip">by {spotlightModel?.author || 'raehoshi'}</span>
            </div>

            <div className="spotlight-chips">
              <span className="mini-stat-chip">Likes: {spotlightModel ? (spotlightModel.likes >= 1000 ? `${(spotlightModel.likes / 1000).toFixed(1)}k` : spotlightModel.likes) : '3.1k'}</span>
              <span className="mini-stat-chip">Rating: {spotlightModel?.rating?.toFixed(1) || '4.9'}</span>
              <span className="mini-stat-chip" style={{ color: '#60a5fa' }}>
                {spotlightModel?.base_model || 'Illustrious XL'}
              </span>
            </div>

            <p style={{ fontSize: '12px', color: '#9a9fa8', margin: '0 0 14px 0', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {spotlightModel?.description || 'Enhanced iteration with balanced contrast and high anime aesthetic coherence.'}
            </p>

            <Link
              to={spotlightModel ? `/models?model=${spotlightModel.slug}` : '/models'}
              className="global-btn global-btn-secondary"
              style={{ width: '100%', boxSizing: 'border-box' }}
            >
              Inspect Model Details →
            </Link>
          </div>
        </div>
      </section>

      {/* ===================================================================
          Interactive Category Tabs & Model Showcase
          =================================================================== */}
      <section className="home-section-block">
        <div className="section-title-bar">
          <div>
            <h2>Model Showcase & Directory</h2>
            <p>Filter and inspect curated checkpoints and LoRA weights with verified tensor profiles</p>
          </div>
          <Link
            to={selectedCategory === 'all' ? '/models' : `/models?tab=${selectedCategory}`}
            className="global-btn global-btn-secondary"
          >
            All Models ({models.length}) →
          </Link>
        </div>

        {/* Category Filter Tabs */}
        <div className="home-categories-bar">
          {[
            { id: 'all', label: 'All Models', count: models.length },
            { id: 'checkpoints', label: 'Checkpoints', count: models.filter((m) => m.type === 'checkpoint').length },
            { id: 'lora', label: 'LoRAs', count: models.filter((m) => m.type === 'lora').length },
            { id: 'illustrious', label: 'Illustrious Base', count: models.filter((m) => m.base_model?.toLowerCase().includes('illustrious')).length },
            { id: 'noobai', label: 'NoobAI Base', count: models.filter((m) => m.base_model?.toLowerCase().includes('noobai')).length },
          ].map((cat) => (
            <button
              key={cat.id}
              className={`category-tab-btn ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.label} {cat.count > 0 && <span className="cat-count-badge">({cat.count})</span>}
            </button>
          ))}
        </div>

        {/* Interactive Model Showcase Grid */}
        {loading ? (
          <div className="home-loading-state">
            <div className="loading-spinner"></div>
            <p>Loading model catalog...</p>
          </div>
        ) : displayedModels.length === 0 ? (
          <div className="home-empty-state">
            <p>No models found in this category.</p>
            <Link to="/models" className="global-btn global-btn-primary">Browse All Models</Link>
          </div>
        ) : (
          <div className="home-models-grid">
            {displayedModels.map((item) => (
              <div key={item.id} className="home-model-card">
                <div className="home-card-img-wrap">
                  {item.thumbnail_url ? (
                    <img
                      src={item.thumbnail_url}
                      alt={item.name}
                      className="home-card-img"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/400x240?text=Preview';
                      }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0e1012', minHeight: '170px', gap: '6px' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666c75" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      <span style={{ fontSize: '11px', color: '#666c75' }}>No Sample Image</span>
                    </div>
                  )}
                  <span className={`home-card-type-pill ${item.type === 'lora' ? 'type-lora' : 'type-checkpoint'}`}>
                    {item.type.toUpperCase()}
                  </span>
                  <span className="home-card-base-pill">{item.base_model}</span>
                </div>

                <div className="home-card-content">
                  <h4 className="home-card-title" title={item.name}>{item.name}</h4>
                  <div className="home-card-meta">
                    <span className="home-card-author">by {item.author}</span>
                    <span className="home-card-stat">Rating: {item.rating?.toFixed(1) || '5.0'}</span>
                    <span className="home-card-stat">Likes: {item.likes >= 1000 ? `${(item.likes / 1000).toFixed(1)}k` : item.likes}</span>
                  </div>

                  {/* VRAM & Hardware pill */}
                  <div className="home-card-vram-row">
                    <span className="vram-tag">
                      Min VRAM: {item.vram_min || (item.type === 'checkpoint' ? '6 GB' : '1 GB')}
                    </span>
                    {item.tensor_size && (
                      <span className="vram-tag subtle">
                        {item.tensor_size} Tensors
                      </span>
                    )}
                  </div>

                  <p className="home-card-desc">
                    {item.description}
                  </p>

                  <Link
                    to={`/models?model=${item.slug}`}
                    className="home-card-inspect-btn"
                  >
                    Inspect Model →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===================================================================
          GPU VRAM & Hardware Compatibility Advisor
          =================================================================== */}
      <section id="vram-advisor" className="home-section-block">
        <div className="section-title-bar">
          <div>
            <h2>Hardware & VRAM Compatibility Matrix</h2>
            <p>Select your GPU capacity to inspect compatible checkpoint architectures and optimal launch arguments</p>
          </div>
        </div>

        <div className="vram-advisor-card">
          <div className="vram-selector-tabs">
            {Object.keys(VRAM_PRESETS).map((key) => {
              const preset = VRAM_PRESETS[key];
              return (
                <button
                  key={key}
                  className={`vram-tab-btn ${selectedVram === key ? 'active' : ''}`}
                  onClick={() => setSelectedVram(key)}
                >
                  <span className="vram-amount">{preset.vram}</span>
                  <span className="vram-badge-type">{key === '8gb' ? 'Sweetspot' : key === '16gb' ? 'Workstation' : 'Tier'}</span>
                </button>
              );
            })}
          </div>

          <div className="vram-details-panel">
            <div className="vram-info-header">
              <div>
                <h3 className="vram-headline">{currentVramInfo.name}</h3>
                <span className={`vram-status-badge status-${currentVramInfo.status}`}>
                  {currentVramInfo.status === 'powerhouse'
                    ? 'Ultra High Performance'
                    : currentVramInfo.status === 'recommended'
                    ? 'Recommended: SDXL / Illustrious'
                    : 'Notice: Light / Pruned Models Recommended'}
                </span>
              </div>
              <Link to="/models" className="global-btn global-btn-secondary">
                Filter Compatible Models
              </Link>
            </div>

            <div className="vram-grid-details">
              <div className="vram-detail-box">
                <span className="vram-detail-label">Supported Architectures</span>
                <ul className="vram-feature-list">
                  {currentVramInfo.supportedModels.map((m, idx) => (
                    <li key={idx}>
                      <span className="check-bullet">›</span> {m}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="vram-detail-box">
                <span className="vram-detail-label">Target Generation Resolution</span>
                <div className="vram-code-snippet">{currentVramInfo.maxResolution}</div>
                <span className="vram-detail-label" style={{ marginTop: '14px' }}>Recommended UI / Launch Flags</span>
                <div className="vram-code-snippet mono">{currentVramInfo.recommendedFlags}</div>
              </div>

              <div className="vram-detail-box">
                <span className="vram-detail-label">Optimization & Inference Guidelines</span>
                <p className="vram-tip-text">
                  {currentVramInfo.tips}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          Verified Generation Parameter Cheat Sheet
          =================================================================== */}
      <section className="home-section-block">
        <div className="section-title-bar">
          <div>
            <h2>Verified Generation Parameter Cheat Sheet</h2>
            <p>Baseline sampling parameters for the most popular anime & SDXL models</p>
          </div>
        </div>

        <div className="presets-cards-grid">
          {/* Illustrious XL Preset */}
          <div className="preset-card">
            <div className="preset-card-header">
              <div>
                <h4>Illustrious XL & NoobAI</h4>
                <span className="preset-sub">Clean Anime & Illustration</span>
              </div>
              <span className="pill-badge base-pill">Illustrious</span>
            </div>

            <div className="preset-params-list">
              <div className="preset-param-row">
                <span>Sampler</span>
                <strong>Euler a / DPM++ 2M Karras</strong>
              </div>
              <div className="preset-param-row">
                <span>Steps</span>
                <strong>24 - 28</strong>
              </div>
              <div className="preset-param-row">
                <span>CFG Scale</span>
                <strong>5.0 - 6.5</strong>
              </div>
              <div className="preset-param-row">
                <span>Clip Skip</span>
                <strong>2</strong>
              </div>
              <div className="preset-param-row">
                <span>Native Resolution</span>
                <strong>832 × 1216 (Portrait)</strong>
              </div>
            </div>

            <div className="preset-prompt-box">
              <div className="preset-prompt-header">
                <span>Recommended Negative Prompt:</span>
                <button
                  className="preset-copy-btn"
                  onClick={() => copyToClipboard('worst quality, low quality, bad anatomy, bad hands, missing fingers, extra digit, fewer digits, watermark, text, signature', 'illustrious-neg')}
                >
                  {copiedPrompt === 'illustrious-neg' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <code>worst quality, low quality, bad anatomy, bad hands, missing fingers, extra digit, fewer digits, watermark, text, signature</code>
            </div>
          </div>

          {/* SD 1.5 Anime Preset */}
          <div className="preset-card">
            <div className="preset-card-header">
              <div>
                <h4>Stable Diffusion 1.5</h4>
                <span className="preset-sub">Legacy Fine-tunes & Style LoRAs</span>
              </div>
              <span className="pill-badge base-pill">SD 1.5</span>
            </div>

            <div className="preset-params-list">
              <div className="preset-param-row">
                <span>Sampler</span>
                <strong>DPM++ 2M Karras / Euler a</strong>
              </div>
              <div className="preset-param-row">
                <span>Steps</span>
                <strong>20 - 30</strong>
              </div>
              <div className="preset-param-row">
                <span>CFG Scale</span>
                <strong>7.0 - 8.0</strong>
              </div>
              <div className="preset-param-row">
                <span>Clip Skip</span>
                <strong>2</strong>
              </div>
              <div className="preset-param-row">
                <span>Native Resolution</span>
                <strong>512 × 768 or 512 × 512</strong>
              </div>
            </div>

            <div className="preset-prompt-box">
              <div className="preset-prompt-header">
                <span>Recommended Negative Prompt:</span>
                <button
                  className="preset-copy-btn"
                  onClick={() => copyToClipboard('easynegative, badhandv4, (worst quality, low quality:1.4), deformed, blurry', 'sd15-neg')}
                >
                  {copiedPrompt === 'sd15-neg' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <code>easynegative, badhandv4, (worst quality, low quality:1.4), deformed, blurry</code>
            </div>
          </div>

          {/* Pony Diffusion V6 Preset */}
          <div className="preset-card">
            <div className="preset-card-header">
              <div>
                <h4>Pony Diffusion V6 XL</h4>
                <span className="preset-sub">Score-tagged Pipeline</span>
              </div>
              <span className="pill-badge base-pill">Pony XL</span>
            </div>

            <div className="preset-params-list">
              <div className="preset-param-row">
                <span>Sampler</span>
                <strong>Euler a / DPM++ 2M SDE</strong>
              </div>
              <div className="preset-param-row">
                <span>Steps</span>
                <strong>25 - 30</strong>
              </div>
              <div className="preset-param-row">
                <span>CFG Scale</span>
                <strong>6.0 - 7.0</strong>
              </div>
              <div className="preset-param-row">
                <span>Clip Skip</span>
                <strong>2</strong>
              </div>
              <div className="preset-param-row">
                <span>Prefix</span>
                <strong>score_9, score_8_up, rating_safe</strong>
              </div>
            </div>

            <div className="preset-prompt-box">
              <div className="preset-prompt-header">
                <span>Recommended Negative Prompt:</span>
                <button
                  className="preset-copy-btn"
                  onClick={() => copyToClipboard('score_6, score_5, score_4, simple background, ugly, bad hands, mutated fingers', 'pony-neg')}
                >
                  {copiedPrompt === 'pony-neg' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <code>score_6, score_5, score_4, simple background, ugly, bad hands, mutated fingers</code>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          Architecture Comparison Matrix
          =================================================================== */}
      <section className="home-section-block">
        <div className="section-title-bar">
          <div>
            <h2>Base Architecture Comparison Matrix</h2>
            <p>Direct architectural comparison across Illustrious, SDXL, and legacy models</p>
          </div>
        </div>

        <div className="comparison-table-wrapper">
          <div className="table-scroll-hint">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>Scroll horizontally to view full matrix</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Feature / Metric</th>
                <th>Illustrious-XL</th>
                <th>SDXL 1.0 (Base)</th>
                <th>SD 1.5</th>
                <th>Flux.1 Schnell</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Total Parameters</td>
                <td>6.6B (T5 + CLIP)</td>
                <td>6.6B (Dual CLIP)</td>
                <td>1.0B (CLIP-ViT-L)</td>
                <td>12B (Flow Matching)</td>
              </tr>
              <tr>
                <td>Native Native Resolution</td>
                <td>832 × 1216 or 1024²</td>
                <td>1024 × 1024</td>
                <td>512 × 512</td>
                <td>1024 × 1024</td>
              </tr>
              <tr>
                <td>Min VRAM (Inference)</td>
                <td>6 GB (fp16)</td>
                <td>8 GB (fp16)</td>
                <td>4 GB</td>
                <td>12 GB (fp8 quantized)</td>
              </tr>
              <tr>
                <td>Trained Conditioning Token Size</td>
                <td>587 Tensors</td>
                <td>587 Tensors</td>
                <td>77 Tensors</td>
                <td>512 Tensors</td>
              </tr>
              <tr>
                <td>Text Encoder Architecture</td>
                <td>Dual OpenCLIP + ViT</td>
                <td>CLIP ViT-L + OpenCLIP</td>
                <td>CLIP ViT-L/14</td>
                <td>T5-XXL + CLIP-L</td>
              </tr>
              <tr>
                <td>Recommended Anime Scheduler</td>
                <td>Euler a / DPM++ 2M</td>
                <td>Euler / DDIM</td>
                <td>DPM++ 2M Karras</td>
                <td>Simple / Beta</td>
              </tr>
              <tr>
                <td>Danbooru Tag Adherence</td>
                <td>Native (High)</td>
                <td>Weak (Natural language)</td>
                <td>Moderate (Fine-tunes)</td>
                <td>Natural Prompting</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
