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
    name: 'Entry Level / Budget GPU (GTX 1650, RTX 3050 mobile)',
    status: 'entry',
    supportedModels: ['SD 1.5 Checkpoints', 'Lightweight LoRAs (rank 16-32)'],
    maxResolution: '512 × 512 or 512 × 768',
    recommendedFlags: '--medvram-sdpt --opt-sdp-attention --lowvram',
    tips: 'Illustrious & SDXL may OOM. Enable Tiled VAE for decoding images above 512px.',
  },
  '6gb': {
    vram: '6 GB',
    name: 'Mid-Tier / Laptop GPU (RTX 2060, RTX 3060 mobile)',
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
      {/* Hero Banner Section */}
      <section className="home-hero-banner">
        <div className="hero-text-block">
          <div className="hero-badge-pill">
            <span>✦</span> AI Model Hub & Technical Guide
          </div>
          <h1 className="hero-title">
            Explore, Inspect & Compare Generative AI Models
          </h1>
          <p className="hero-description">
            Comprehensive tensor layer analysis, verified inference parameters, SafeTensors verification,
            and exact VRAM specifications for SDXL, Illustrious, and anime fine-tunes.
          </p>

          {/* Quick Search Form inside Hero */}
          <form className="home-hero-search-form" onSubmit={handleSearchSubmit}>
            <div className="home-hero-search-wrapper">
              <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              <span className="quick-tag-label">Popular:</span>
              <button type="button" className="quick-tag-btn" onClick={() => navigate('/models?tab=checkpoints')}>Checkpoints</button>
              <button type="button" className="quick-tag-btn" onClick={() => navigate('/models?tab=lora')}>LoRA</button>
              <button type="button" className="quick-tag-btn" onClick={() => navigate('/models?tab=illustrious')}>Illustrious</button>
              <button type="button" className="quick-tag-btn" onClick={() => navigate('/models?tab=noobai')}>NoobAI</button>
            </div>
          </form>

          <div className="hero-actions-row">
            <Link to="/models" className="global-btn global-btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
              </svg>
              Browse All Models ({models.length || '...'}) →
            </Link>

            <a href="#vram-advisor" className="global-btn global-btn-secondary">
              ⚡ Hardware & VRAM Guide
            </a>

            <Link to="/about" className="global-btn global-btn-secondary">
              Platform Overview
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
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#141517', minHeight: '260px', gap: '8px' }}>
                <span style={{ fontSize: '32px' }}>🖼️</span>
                <span style={{ fontSize: '12px', color: '#909296' }}>No Preview Image</span>
              </div>
            )}
            <span className="spotlight-overlay-badge">
              {spotlightModel?.type === 'lora' ? 'Featured LoRA' : 'Featured Checkpoint'}
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
              <span className="mini-stat-chip">👍 {spotlightModel ? (spotlightModel.likes >= 1000 ? `${(spotlightModel.likes / 1000).toFixed(1)}K` : spotlightModel.likes) : '3.1K'}</span>
              <span className="mini-stat-chip">⭐ {spotlightModel?.rating?.toFixed(1) || '4.9'}</span>
              <span className="mini-stat-chip" style={{ color: '#20c997', borderColor: 'rgba(32, 201, 151, 0.3)' }}>
                {spotlightModel?.base_model || 'Illustrious XL'}
              </span>
            </div>

            <p style={{ fontSize: '12px', color: '#909296', margin: '0 0 14px 0', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {spotlightModel?.description || 'Enhanced iteration with balanced contrast and high anime aesthetic coherence.'}
            </p>

            <Link
              to={spotlightModel ? `/models?model=${spotlightModel.slug}` : '/models'}
              className="global-btn global-btn-primary"
              style={{ width: '100%', boxSizing: 'border-box' }}
            >
              Inspect Model Details →
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive Category Tabs & Model Showcase */}
      <section className="home-section-block">
        <div className="section-title-bar">
          <div>
            <h2>Model Showcase & Quick Directory</h2>
            <p>Directly filter and preview curated checkpoints and LoRAs with tensor profiles</p>
          </div>
          <Link
            to={selectedCategory === 'all' ? '/models' : `/models?tab=${selectedCategory}`}
            className="global-btn global-btn-secondary"
          >
            Open in Full Catalog ({models.length}) →
          </Link>
        </div>

        {/* Category Filter Tabs */}
        <div className="home-categories-bar">
          {[
            { id: 'all', label: 'All Models', count: models.length },
            { id: 'checkpoints', label: 'Checkpoints', count: models.filter((m) => m.type === 'checkpoint').length },
            { id: 'lora', label: 'LoRAs & Style', count: models.filter((m) => m.type === 'lora').length },
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
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#141517', minHeight: '200px', gap: '6px' }}>
                      <span style={{ fontSize: '26px' }}>🖼️</span>
                      <span style={{ fontSize: '11px', color: '#909296' }}>Belum Ada Gambar</span>
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
                    <span className="home-card-stat">⭐ {item.rating?.toFixed(1) || '5.0'}</span>
                    <span className="home-card-stat">👍 {item.likes >= 1000 ? `${(item.likes / 1000).toFixed(1)}K` : item.likes}</span>
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

      {/* GPU VRAM & Hardware Compatibility Advisor */}
      <section id="vram-advisor" className="home-section-block">
        <div className="section-title-bar">
          <div>
            <h2>Hardware & VRAM Compatibility Advisor</h2>
            <p>Select your GPU capacity to instantly view compatible checkpoint architectures and optimal flags</p>
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
                  <span className="vram-badge-type">{key === '8gb' ? 'Popular' : key === '16gb' ? 'Ultra' : 'Tier'}</span>
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
                    ? '⚡ Ultra High Performance'
                    : currentVramInfo.status === 'recommended'
                    ? '✓ Recommended for SDXL / Illustrious'
                    : '⚠ Light / Pruned Models Recommended'}
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
                      <span className="check-bullet">✓</span> {m}
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
                <span className="vram-detail-label">Inference & Optimization Tip</span>
                <p className="vram-tip-text">
                  {currentVramInfo.tips}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Generation Preset Cheat Sheet */}
      <section className="home-section-block">
        <div className="section-title-bar">
          <div>
            <h2>Verified Generation Parameter Cheat Sheet</h2>
            <p>Optimal baseline settings for the most popular anime & SDXL models</p>
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
                  type="button"
                  className="copy-chip-btn"
                  onClick={() =>
                    copyToClipboard(
                      'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry',
                      'illustrious-neg'
                    )
                  }
                >
                  {copiedPrompt === 'illustrious-neg' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <code>lowres, bad anatomy, bad hands, text, worst quality, low quality, blurry</code>
            </div>
          </div>

          {/* SDXL 1.0 Preset */}
          <div className="preset-card">
            <div className="preset-card-header">
              <div>
                <h4>SDXL 1.0 Native</h4>
                <span className="preset-sub">High Detail 1024px Generation</span>
              </div>
              <span className="pill-badge base-pill">SDXL</span>
            </div>

            <div className="preset-params-list">
              <div className="preset-param-row">
                <span>Sampler</span>
                <strong>DPM++ 2M SDE Karras</strong>
              </div>
              <div className="preset-param-row">
                <span>Steps</span>
                <strong>30 - 35</strong>
              </div>
              <div className="preset-param-row">
                <span>CFG Scale</span>
                <strong>7.0</strong>
              </div>
              <div className="preset-param-row">
                <span>Clip Skip</span>
                <strong>1</strong>
              </div>
              <div className="preset-param-row">
                <span>Native Resolution</span>
                <strong>1024 × 1024 (Square)</strong>
              </div>
            </div>

            <div className="preset-prompt-box">
              <div className="preset-prompt-header">
                <span>Recommended Negative Prompt:</span>
                <button
                  type="button"
                  className="copy-chip-btn"
                  onClick={() =>
                    copyToClipboard(
                      'ugly, deformed, disfigured, poor details, bad anatomy, watermark, text',
                      'sdxl-neg'
                    )
                  }
                >
                  {copiedPrompt === 'sdxl-neg' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <code>ugly, deformed, disfigured, poor details, bad anatomy, watermark, text</code>
            </div>
          </div>

          {/* LoRA Integration Guide */}
          <div className="preset-card">
            <div className="preset-card-header">
              <div>
                <h4>LoRA Application Best Practices</h4>
                <span className="preset-sub">Weights & Stacking</span>
              </div>
              <span className="pill-badge lora-pill">LoRA</span>
            </div>

            <div className="preset-params-list">
              <div className="preset-param-row">
                <span>Character LoRA Weight</span>
                <strong>0.7 - 0.9</strong>
              </div>
              <div className="preset-param-row">
                <span>Style / Aesthetic LoRA</span>
                <strong>0.5 - 0.8</strong>
              </div>
              <div className="preset-param-row">
                <span>Stack Limit</span>
                <strong>Max 3-4 simultaneous</strong>
              </div>
              <div className="preset-param-row">
                <span>Trigger Words</span>
                <strong>Place at front of prompt</strong>
              </div>
            </div>

            <div className="preset-prompt-box">
              <div className="preset-prompt-header">
                <span>Example LoRA Syntax:</span>
                <button
                  type="button"
                  className="copy-chip-btn"
                  onClick={() =>
                    copyToClipboard('<lora:detailed_anime_eyes:0.8>, detailed eyes, sparkle eyes', 'lora-syntax')
                  }
                >
                  {copiedPrompt === 'lora-syntax' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <code>&lt;lora:model_name:0.8&gt;, trigger_word</code>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Column Features Grid */}
      <div className="home-features-grid">
        <div className="feature-box">
          <span className="feature-box-icon">🔬</span>
          <h3>Precision Tensor Inspection</h3>
          <p>
            Break down models layer by layer: conditioners, first-stage models, and UNet/DiT blocks with
            accurate VRAM thresholds for local inference.
          </p>
        </div>

        <div className="feature-box">
          <span className="feature-box-icon">⚙️</span>
          <h3>Verified Inference Settings</h3>
          <p>
            Eliminate trial and error with benchmarked samplers, optimal CFG scales, recommended step counts,
            and clip skip values per checkpoint.
          </p>
        </div>

        <div className="feature-box">
          <span className="feature-box-icon">🛡️</span>
          <h3>SafeTensors & AIR Compatible</h3>
          <p>
            Fully integrated with Civitai AIR identifiers, SHA256 hashes, and security scanning metadata
            to keep your generation pipeline clean and reproducible.
          </p>
        </div>
      </div>
    </div>
  );
}
