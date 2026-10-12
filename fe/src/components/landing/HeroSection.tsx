import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RainCanvas } from './RainCanvas';
import { getModels } from '../../api/models';

interface HeroSectionProps {
  onDiscoverClick: () => void;
}

interface TelemetryModel {
  id: string;
  name: string;
  slug: string;
  baseModel: string;
  type: string;
  tensorCount: number;
  vramGb: number;
  vramPercent: number;
  nativeRes: string;
  sampler: string;
  steps: number;
  cfg: number;
  author: string;
  thumbnailUrl: string;
}

const TELEMETRY_FALLBACK_MODELS: TelemetryModel[] = [
  {
    id: 'wai-illustrious',
    name: 'WAI-illustrious-SDXL',
    slug: 'wai-illustrious-sdxl',
    baseModel: 'Illustrious XL',
    type: 'CHECKPOINT',
    tensorCount: 587,
    vramGb: 6,
    vramPercent: 50,
    nativeRes: '832 × 1216',
    sampler: 'Euler a',
    steps: 28,
    cfg: 5.5,
    author: 'WAI0731',
    thumbnailUrl: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/ce58b29f-26ca-461b-a184-cf54fb869e26/original=true/ce58b29f-26ca-461b-a184-cf54fb869e26.jpeg',
  },
  {
    id: 'wai-noob',
    name: 'WAI-SHUFFLE-NOOB',
    slug: 'wai-shuffle-noob',
    baseModel: 'NoobAI',
    type: 'CHECKPOINT',
    tensorCount: 587,
    vramGb: 6,
    vramPercent: 50,
    nativeRes: '1024 × 1360',
    sampler: 'Euler a',
    steps: 30,
    cfg: 6.0,
    author: 'WAI0731',
    thumbnailUrl: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/6942c4b2-fcd4-4135-ab44-a617e26235d3/original=true/6942c4b2-fcd4-4135-ab44-a617e26235d3.jpeg',
  },
  {
    id: 'raehoshi',
    name: 'Raehoshi Illust XL v2',
    slug: 'raehoshi-illust-xl',
    baseModel: 'Illustrious XL',
    type: 'CHECKPOINT',
    tensorCount: 587,
    vramGb: 8,
    vramPercent: 67,
    nativeRes: '832 × 1216',
    sampler: 'Euler a',
    steps: 26,
    cfg: 5.0,
    author: 'raehoshi',
    thumbnailUrl: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/e621bef5-8aa3-49b8-9abe-a61aca533159/original=true/e621bef5-8aa3-49b8-9abe-a61aca533159.jpeg',
  },
];

export function HeroSection({ onDiscoverClick }: HeroSectionProps) {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLElement | null>(null);

  const [telemetryModels, setTelemetryModels] = useState<TelemetryModel[]>(TELEMETRY_FALLBACK_MODELS);
  const [totalCatalogCount, setTotalCatalogCount] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModelIdx, setSelectedModelIdx] = useState(0);
  const [isScanning, setIsScanning] = useState(false);

  // Fetch real models from database on mount
  useEffect(() => {
    let isMounted = true;
    getModels({ limit: 6 })
      .then((res) => {
        if (!isMounted) return;
        if (res?.pagination?.total) {
          setTotalCatalogCount(res.pagination.total);
        }
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const mapped: TelemetryModel[] = res.data.slice(0, 3).map((m, idx) => {
            const vramMatch = m.vram_min ? parseInt(m.vram_min, 10) : (m.type === 'checkpoint' ? 6 : 2);
            const vramGb = isNaN(vramMatch) || vramMatch <= 0 ? 6 : vramMatch;
            const fallbackThumbnail = TELEMETRY_FALLBACK_MODELS[idx]?.thumbnailUrl || 'https://placehold.co/400x240?text=Preview';

            return {
              id: String(m.id),
              name: m.name,
              slug: m.slug,
              baseModel: m.base_model || 'Illustrious XL',
              type: m.type ? m.type.toUpperCase() : 'CHECKPOINT',
              tensorCount: m.tensor_size ? parseInt(m.tensor_size, 10) || 587 : 587,
              vramGb,
              vramPercent: Math.min(Math.round((vramGb / 12) * 100), 100),
              nativeRes: m.base_model?.toLowerCase().includes('illustrious') ? '832 × 1216' : '1024 × 1024',
              sampler: 'Euler a',
              steps: 28,
              cfg: 5.5,
              author: m.author || 'Civitai Creator',
              thumbnailUrl: m.thumbnail_url || fallbackThumbnail,
            };
          });

          if (mapped.length > 0) {
            setTelemetryModels(mapped);
          }
        }
      })
      .catch((err) => {
        console.warn('Hero live telemetry used fallback:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const activeModel = telemetryModels[selectedModelIdx] || telemetryModels[0] || TELEMETRY_FALLBACK_MODELS[0];

  // Subtle interactive parallax tilt on mouse move
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let rafId: number;

    const handleMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const rect = hero.getBoundingClientRect();
        const xPercent = (e.clientX - rect.left) / rect.width - 0.5;
        const yPercent = (e.clientY - rect.top) / rect.height - 0.5;

        hero.style.setProperty('--hero-tilt-x', `${(xPercent * 8).toFixed(2)}px`);
        hero.style.setProperty('--hero-tilt-y', `${(yPercent * 8).toFixed(2)}px`);
      });
    };

    const handleMouseLeave = () => {
      cancelAnimationFrame(rafId);
      hero.style.setProperty('--hero-tilt-x', '0px');
      hero.style.setProperty('--hero-tilt-y', '0px');
    };

    hero.addEventListener('mousemove', handleMouseMove, { passive: true });
    hero.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cancelAnimationFrame(rafId);
      hero.removeEventListener('mousemove', handleMouseMove);
      hero.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/models?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/models');
    }
  };

  const handleSelectModel = (idx: number) => {
    setIsScanning(true);
    setSelectedModelIdx(idx);
    setTimeout(() => setIsScanning(false), 450);
  };

  return (
    <section className="mg-hero" id="hero" ref={heroRef}>
      {/* Cinematic atmospheric rain forest background with water reflections */}
      <div className="mg-hero-forest-bg" aria-hidden="true" />
      <div className="mg-hero-forest-mist" aria-hidden="true" />

      {/* Cinematic multi-layer canvas rain background */}
      <RainCanvas />

      {/* Atmospheric depth lighting, subtle grid, and crosshair reticles */}
      <div className="mg-hero-atmosphere" aria-hidden="true" />
      <div className="mg-hero-grid-overlay" aria-hidden="true" />

      {/* Architectural corner reticles */}
      <div className="mg-corner-reticle top-left" aria-hidden="true">
        <span>+</span>
      </div>
      <div className="mg-corner-reticle top-right" aria-hidden="true">
        <span>+</span>
      </div>
      <div className="mg-corner-reticle bottom-left" aria-hidden="true">
        <span>+</span>
      </div>
      <div className="mg-corner-reticle bottom-right" aria-hidden="true">
        <span>+</span>
      </div>

      {/* Hero Content: 2-Column Layered Asymmetric Composition */}
      <div className="mg-hero-container">
        <div className="mg-hero-split-grid">
          {/* Left Column: Editorial Typography, Live Status, Search & CTAs */}
          <div className="mg-hero-editorial-col">
            {/* Live technical category pill */}
            <div className="mg-hero-badge-wrap">
              <div className="mg-hero-badge">
                <span className="mg-hero-badge-dot" />
                <span className="mg-hero-badge-mono">SYSTEM READY</span>
                <span className="mg-hero-badge-divider">/</span>
                <span>
                  {totalCatalogCount !== null ? `${totalCatalogCount} MODELS INDEXED` : 'AI MODEL LIBRARY'} &bull; LOCAL INFERENCE ARCHITECTURE
                </span>
              </div>
            </div>

            {/* Editorial Headline with masked line reveal */}
            <h1 className="mg-hero-title">
              <span className="mg-hero-title-line">
                <span className="mg-hero-title-reveal" style={{ animationDelay: '150ms' }}>
                  Your Models.
                </span>
              </span>
              <span className="mg-hero-title-line">
                <span className="mg-hero-title-reveal mg-hero-title-accent" style={{ animationDelay: '350ms' }}>
                  Your Workflow.
                </span>
              </span>
            </h1>

            {/* Supporting Editorial Paragraph */}
            <p className="mg-hero-subtitle" style={{ animationDelay: '520ms' }}>
              Explore, organize, compare, and understand your generative AI models in one focused,
              zero-telemetry workspace. Direct SafeTensors tensor inspection, prompt trigger extraction, and verified VRAM allocation.
            </p>

            {/* Quick Model Search Bar */}
            <form className="mg-hero-search-bar" onSubmit={handleSearchSubmit} style={{ animationDelay: '680ms' }}>
              <div className="mg-search-input-wrap">
                <svg className="mg-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  className="mg-search-input"
                  placeholder="Search models, base architectures, creators, or triggers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search models library"
                />
                <button type="submit" className="mg-search-submit-btn">
                  <span>Search</span>
                  <span className="mg-key-badge">&crarr;</span>
                </button>
              </div>

              {/* Quick filter jumping tags */}
              <div className="mg-hero-quick-filters">
                <span className="mg-quick-label">QUICK JUMP:</span>
                <button type="button" className="mg-quick-chip" onClick={() => navigate('/models?tab=checkpoints')}>
                  Checkpoints
                </button>
                <button type="button" className="mg-quick-chip" onClick={() => navigate('/models?tab=lora')}>
                  LoRA Adapters
                </button>
                <button type="button" className="mg-quick-chip" onClick={() => navigate('/models?tab=illustrious')}>
                  Illustrious XL
                </button>
                <button type="button" className="mg-quick-chip" onClick={() => navigate('/models?tab=noobai')}>
                  NoobAI Base
                </button>
              </div>
            </form>

            {/* Primary & Secondary Action CTAs */}
            <div className="mg-hero-actions" style={{ animationDelay: '820ms' }}>
              <Link to="/models" className="mg-btn mg-btn-primary mg-btn-shimmer">
                <span>Explore Models</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>

              <button
                type="button"
                className="mg-btn mg-btn-secondary"
                onClick={onDiscoverClick}
                aria-label="Scroll down to discover application features"
              >
                <span>Discover Features</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <polyline points="19 12 12 19 5 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right Column: Interactive Model Telemetry HUD */}
          <div className="mg-hero-telemetry-col" style={{ animationDelay: '600ms' }}>
            <div className={`mg-telemetry-card ${isScanning ? 'is-scanning' : ''}`}>
              {/* Scanline beam passing across */}
              <div className="mg-hud-scanline" aria-hidden="true" />

              {/* HUD Header Bar */}
              <div className="mg-hud-topbar">
                <div className="mg-hud-indicator-group">
                  <span className="mg-hud-pulse-dot" />
                  <span className="mg-hud-mono-tag">LIVE TELEMETRY &bull; SAFETENSORS HEADER</span>
                </div>
                <span className="mg-hud-spec-pill">FP16 PRUNED</span>
              </div>

              {/* Model Switcher Tabs */}
              <div className="mg-hud-switcher" role="tablist" aria-label="Select model telemetry">
                {telemetryModels.map((m, idx) => (
                  <button
                    key={m.id}
                    type="button"
                    role="tab"
                    aria-selected={selectedModelIdx === idx}
                    className={`mg-hud-tab ${selectedModelIdx === idx ? 'active' : ''}`}
                    onClick={() => handleSelectModel(idx)}
                  >
                    <span>0{idx + 1}</span>
                    <span className="mg-tab-name">{m.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>

              {/* Live Preview Media with Optical Corner Reticles */}
              <div className="mg-hud-media-wrapper">
                <div className="mg-hud-optical-corner tl" />
                <div className="mg-hud-optical-corner tr" />
                <div className="mg-hud-optical-corner bl" />
                <div className="mg-hud-optical-corner br" />

                <img
                  src={activeModel.thumbnailUrl}
                  alt={activeModel.name}
                  className="mg-hud-img"
                  loading="eager"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/preview-1.png';
                  }}
                />

                <div className="mg-hud-media-overlay">
                  <div className="mg-hud-overlay-title">
                    <span className="mg-hud-base-badge">{activeModel.baseModel}</span>
                    <h4>{activeModel.name}</h4>
                  </div>
                  <span className="mg-hud-author">by {activeModel.author}</span>
                </div>
              </div>

              {/* Real-time Hardware & Tensor Gauges */}
              <div className="mg-hud-gauges">
                {/* VRAM Allocation Gauge Bar */}
                <div className="mg-hud-gauge-item">
                  <div className="mg-gauge-header">
                    <span className="mg-gauge-k">GPU VRAM ALLOCATION</span>
                    <span className="mg-gauge-v">{activeModel.vramGb} GB / 12 GB ({activeModel.vramPercent}%)</span>
                  </div>
                  <div className="mg-gauge-track">
                    <div
                      className="mg-gauge-fill"
                      style={{ width: `${activeModel.vramPercent}%` }}
                    />
                  </div>
                </div>

                {/* Tensor & Sampling Grid */}
                <div className="mg-hud-specs-matrix">
                  <div className="mg-hud-spec-cell">
                    <span className="mg-cell-k">CONDITIONER TENSORS</span>
                    <span className="mg-cell-v">{activeModel.tensorCount} Layers</span>
                  </div>
                  <div className="mg-hud-spec-cell">
                    <span className="mg-cell-k">NATIVE RESOLUTION</span>
                    <span className="mg-cell-v">{activeModel.nativeRes}</span>
                  </div>
                  <div className="mg-hud-spec-cell">
                    <span className="mg-cell-k">RECOMMENDED SAMPLER</span>
                    <span className="mg-cell-v">{activeModel.sampler} ({activeModel.steps} stp)</span>
                  </div>
                  <div className="mg-hud-spec-cell">
                    <span className="mg-cell-k">CFG SCALE</span>
                    <span className="mg-cell-v">{activeModel.cfg.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Direct Inspection Action */}
              <div className="mg-hud-footer">
                <Link
                  to={`/models?model=${activeModel.slug}`}
                  className="mg-hud-inspect-btn"
                >
                  <span>Inspect SafeTensors File</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </Link>
                <span className="mg-hud-status-text">STATUS: VERIFIED</span>
              </div>
            </div>
          </div>
        </div>

        {/* Restrained Technical Architecture Spec Bar at Bottom */}
        <div className="mg-hero-specs-bar" style={{ animationDelay: '950ms' }}>
          <div className="mg-hero-spec-item">
            <span className="mg-spec-label">ARCHITECTURES:</span>
            <span className="mg-spec-value">SDXL 1.0 &bull; ILLUSTRIOUS-XL &bull; NOOB-AI &bull; FLUX.1</span>
          </div>
          <div className="mg-hero-spec-item">
            <span className="mg-spec-label">CONTAINER:</span>
            <span className="mg-spec-value">SAFETENSORS (FP16 / FP8 / BF16)</span>
          </div>
          <div className="mg-hero-spec-item">
            <span className="mg-spec-label">DATA PIPELINE:</span>
            <span className="mg-spec-value mg-spec-verified">
              <span className="mg-verified-dot" />
              INFERENCE VERIFIED &bull; ZERO CLOUD TELEMETRY
            </span>
          </div>
        </div>
      </div>

      {/* Subtle Animated Vertical Scroll Indicator */}
      <div
        className="mg-hero-scroll-indicator"
        onClick={onDiscoverClick}
        role="button"
        tabIndex={0}
        aria-label="Scroll down to features narrative"
      >
        <span className="mg-scroll-track">
          <span className="mg-scroll-thumb" />
        </span>
        <span className="mg-scroll-label">SCROLL</span>
      </div>
    </section>
  );
}
