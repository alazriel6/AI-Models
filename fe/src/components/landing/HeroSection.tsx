import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RainCanvas, type WeatherType } from './RainCanvas';
import { getModels } from '../../api/models';

interface HeroSectionProps {
  onDiscoverClick: () => void;
}

interface DeckModel {
  id: string;
  name: string;
  slug: string;
  baseModel: string;
  type: string;
  tensorCount: number;
  vramStr: string;
  nativeRes: string;
  sampler: string;
  steps: number;
  cfg: number;
  author: string;
  description?: string;
  tags?: string[];
  thumbnailUrl: string;
}

const DECK_FALLBACK_MODELS: DeckModel[] = [
  {
    id: 'wai-illustrious',
    name: 'WAI-illustrious-SDXL',
    slug: 'wai-illustrious-sdxl',
    baseModel: 'Illustrious XL',
    type: 'CHECKPOINT',
    tensorCount: 587,
    vramStr: '6 GB',
    nativeRes: '832 × 1216',
    sampler: 'Euler a',
    steps: 28,
    cfg: 5.5,
    author: 'WAI0731',
    description: 'High-performance Illustrious XL checkpoint tuned for crisp anime linework and vibrant contrast.',
    tags: ['Anime', 'Checkpoint', 'Illustrious'],
    thumbnailUrl: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/ce58b29f-26ca-461b-a184-cf54fb869e26/original=true/ce58b29f-26ca-461b-a184-cf54fb869e26.jpeg',
  },
  {
    id: 'wai-noob',
    name: 'WAI-SHUFFLE-NOOB',
    slug: 'wai-shuffle-noob',
    baseModel: 'NoobAI',
    type: 'CHECKPOINT',
    tensorCount: 587,
    vramStr: '6 GB',
    nativeRes: '1024 × 1360',
    sampler: 'Euler a',
    steps: 30,
    cfg: 6.0,
    author: 'WAI0731',
    description: 'Specialized NoobAI baseline fine-tune with score-conditioned weight distributions.',
    tags: ['Anime', 'NoobAI', 'Score-tagged'],
    thumbnailUrl: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/6942c4b2-fcd4-4135-ab44-a617e26235d3/original=true/6942c4b2-fcd4-4135-ab44-a617e26235d3.jpeg',
  },
  {
    id: 'raehoshi',
    name: 'Raehoshi Illust XL v2',
    slug: 'raehoshi-illust-xl',
    baseModel: 'Illustrious XL',
    type: 'CHECKPOINT',
    tensorCount: 587,
    vramStr: '8 GB',
    nativeRes: '832 × 1216',
    sampler: 'DPM++ 2M',
    steps: 26,
    cfg: 5.0,
    author: 'raehoshi',
    description: 'Artistic checkpoint focusing on painterly volumetric lighting and anatomical fidelity.',
    tags: ['Illustration', 'Painterly', 'Anime'],
    thumbnailUrl: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/e621bef5-8aa3-49b8-9abe-a61aca533159/original=true/e621bef5-8aa3-49b8-9abe-a61aca533159.jpeg',
  },
];

/**
 * Strips raw HTML tags from Civitai descriptions, decodes entities,
 * and filters out leading online generator / donation boilerplate.
 */
function cleanModelDescription(
  rawDesc?: string,
  baseModel?: string,
  _modelName?: string
): string {
  if (!rawDesc) {
    return `Specialized fine-tuned checkpoint for high-fidelity generative rendering on ${baseModel || 'SDXL'}.`;
  }

  // 1. Normalize HTML line breaks and structural tags to newlines before stripping
  let text = rawDesc
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  // 2. Decode common HTML entities
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\r/g, '');

  // 3. Filter out generic online generator promotions / Patreon plugs
  const promoPattern = /^(if you want to use more|please visit|visit here|support me|buy me a coffee|patreon|ko-fi|discord|online generation|seaart|tensorart|shakker|liblib|https?:)/i;

  const paragraphs = text
    .split('\n')
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 0);

  // Look for the first genuine descriptive paragraph
  let meaningful = paragraphs.find((p) => p.length >= 25 && !promoPattern.test(p));

  if (!meaningful) {
    meaningful = paragraphs.find((p) => p.length >= 15 && !promoPattern.test(p));
  }

  if (!meaningful || promoPattern.test(meaningful)) {
    return `Generative checkpoint tuned on ${baseModel || 'Illustrious XL'} with calibrated latent distributions.`;
  }

  if (meaningful.length > 120) {
    return meaningful.slice(0, 117).trim() + '...';
  }

  return meaningful;
}

/**
 * Formats tag slugs into clean Title Case labels and filters redundant meta tags.
 */
function cleanModelTags(rawTags?: (string | { name?: string })[]): string[] {
  if (!rawTags || !Array.isArray(rawTags) || rawTags.length === 0) {
    return ['Fine-tuned', 'SafeTensors', 'High-Res'];
  }

  const ignored = new Set([
    'base_model', 'base model', 'checkpoint', 'checkpoints', 'model', 'models',
    'safetensors', 'sdxl', 'sd 1.5', 'sd xl', 'flux', 'flux.1', 'illustrious', 'illustrious-xl',
    'noobai', 'noob-ai'
  ]);

  const cleaned = rawTags
    .map((t) => {
      const rawStr = typeof t === 'string' ? t : (t?.name || '');
      return rawStr
        .replace(/[_-]+/g, ' ')
        .trim()
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    })
    .filter((t) => t.length > 1 && !ignored.has(t.toLowerCase()));

  if (cleaned.length === 0) {
    return ['Fine-tuned', 'SafeTensors', 'High-Res'];
  }

  return cleaned.slice(0, 3);
}

const HERO_QUICK_TAGS = [
  { label: 'Illustrious XL', target: '/models?search=Illustrious' },
  { label: 'Checkpoints', target: '/models?tab=checkpoints' },
  { label: 'LoRA', target: '/models?tab=lora' },
  { label: 'NoobAI', target: '/models?search=NoobAI' },
  { label: 'Anime', target: '/models?search=Anime' },
  { label: 'SDXL', target: '/models?search=SDXL' },
];

const TYPEWRITER_PHRASES = [
  'Local Model Guide.',
  'Generation Gallery.',
  'Prompt & Settings Lab.',
  'SafeTensors Catalog.',
];

function HeroTypewriter() {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [displayedText, setDisplayedText] = useState(TYPEWRITER_PHRASES[0]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fullText = TYPEWRITER_PHRASES[phraseIdx];
    let timer: ReturnType<typeof setTimeout>;

    if (!isDeleting) {
      if (displayedText.length < fullText.length) {
        timer = setTimeout(() => {
          setDisplayedText(fullText.slice(0, displayedText.length + 1));
        }, 80);
      } else {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 2200);
      }
    } else {
      if (displayedText.length > 0) {
        timer = setTimeout(() => {
          setDisplayedText(fullText.slice(0, displayedText.length - 1));
        }, 40);
      } else {
        setIsDeleting(false);
        setPhraseIdx((prev) => (prev + 1) % TYPEWRITER_PHRASES.length);
        timer = setTimeout(() => {}, 280);
      }
    }

    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, phraseIdx]);

  return (
    <span className="mg-typewriter-container" aria-live="polite">
      <span className="mg-hero-title-accent mg-typewriter-text">{displayedText}</span>
      <span className="mg-typewriter-cursor" aria-hidden="true" />
    </span>
  );
}

export function HeroSection({ onDiscoverClick }: HeroSectionProps) {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLElement | null>(null);

  const [deckModels, setDeckModels] = useState<DeckModel[]>(DECK_FALLBACK_MODELS);
  const [weather, setWeather] = useState<WeatherType>(() => {
    try {
      const saved = localStorage.getItem('mg_hero_weather');
      if (saved === 'clear' || saved === 'rain' || saved === 'storm') {
        return saved;
      }
    } catch {
      // Ignore localStorage access errors
    }
    return 'storm';
  });
  const [isWeatherHidden, setIsWeatherHidden] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('mg_hero_weather_hidden');
      if (saved !== null) {
        return saved === 'true';
      }
    } catch {
      // Ignore localStorage access errors
    }
    return false;
  });

  useEffect(() => {
    try {
      localStorage.setItem('mg_hero_weather', weather);
    } catch {
      // Ignore
    }
  }, [weather]);

  useEffect(() => {
    try {
      localStorage.setItem('mg_hero_weather_hidden', String(isWeatherHidden));
    } catch {
      // Ignore
    }
  }, [isWeatherHidden]);

  const [totalCatalogCount, setTotalCatalogCount] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCardIdx, setActiveCardIdx] = useState(0);
  const [isDeckPaused, setIsDeckPaused] = useState(false);
  const [shufflingCardIdx, setShufflingCardIdx] = useState<number | null>(null);
  const shuffleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goToCard = (nextIdx: number) => {
    if (nextIdx === activeCardIdx) return;
    if (shuffleTimerRef.current) {
      clearTimeout(shuffleTimerRef.current);
    }
    setShufflingCardIdx(activeCardIdx);
    setActiveCardIdx(nextIdx);

    shuffleTimerRef.current = setTimeout(() => {
      setShufflingCardIdx(null);
    }, 580);
  };

  useEffect(() => {
    return () => {
      if (shuffleTimerRef.current) {
        clearTimeout(shuffleTimerRef.current);
      }
    };
  }, []);

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
          const mapped: DeckModel[] = res.data.slice(0, 3).map((m, idx) => {
            const fallbackItem = DECK_FALLBACK_MODELS[idx] || DECK_FALLBACK_MODELS[0];
            const fallbackThumbnail = fallbackItem.thumbnailUrl;

            // 1. Dynamic VRAM parsing
            let vramStr = m.vram_min ? m.vram_min.trim() : (m.type === 'checkpoint' ? '6 GB' : '0.5 GB');
            if (vramStr && !vramStr.toLowerCase().includes('gb')) {
              vramStr = `${vramStr} GB`;
            }

            // 2. Dynamic Resolution from image metadata or version settings
            let nativeRes = fallbackItem.nativeRes;
            const primaryImg = m.images && m.images.length > 0 ? m.images[0] : null;
            const recSettings = m.versions && m.versions.length > 0 ? m.versions[0].recommended_settings : null;

            if (primaryImg && primaryImg.width && primaryImg.height) {
              nativeRes = `${primaryImg.width} × ${primaryImg.height}`;
            } else if (recSettings && recSettings.width && recSettings.height) {
              nativeRes = `${recSettings.width} × ${recSettings.height}`;
            } else if (m.base_model?.toLowerCase().includes('illustrious')) {
              nativeRes = '832 × 1216';
            } else if (m.base_model?.toLowerCase().includes('noob')) {
              nativeRes = '1024 × 1360';
            } else {
              nativeRes = '1024 × 1024';
            }

            // 3. Dynamic Sampler
            const sampler = primaryImg?.sampler || recSettings?.sampler || fallbackItem.sampler;

            // 4. Dynamic Steps
            const steps = primaryImg?.steps || recSettings?.steps || fallbackItem.steps;

            // 5. Dynamic CFG Scale
            const cfg = primaryImg?.cfg_scale || recSettings?.cfg_scale || fallbackItem.cfg;

            // 6. Dynamic Cleaned Tags (Exclude raw tags like base_model, capitalize nicely)
            const rawTags = m.tags && Array.isArray(m.tags) ? m.tags.map((t) => t.name) : (fallbackItem.tags || []);
            const tags = cleanModelTags(rawTags);

            // 7. Dynamic Sanitized Description (Strips HTML tags & filters online generator promo)
            const description = cleanModelDescription(m.description || fallbackItem.description, m.base_model, m.name);

            return {
              id: String(m.id),
              name: m.name,
              slug: m.slug,
              baseModel: m.base_model || 'Illustrious XL',
              type: m.type ? m.type.toUpperCase() : 'CHECKPOINT',
              tensorCount: m.tensor_size ? parseInt(m.tensor_size, 10) || 587 : 587,
              vramStr,
              nativeRes,
              sampler,
              steps,
              cfg,
              author: m.author || 'Civitai Creator',
              description,
              tags,
              thumbnailUrl: m.thumbnail_url || primaryImg?.image_url || fallbackThumbnail,
            };
          });

          if (mapped.length > 0) {
            setDeckModels(mapped);
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

  const handleNextCard = () => {
    goToCard((activeCardIdx + 1) % deckModels.length);
  };

  const handlePrevCard = () => {
    goToCard((activeCardIdx - 1 + deckModels.length) % deckModels.length);
  };

  // Auto-cycle through card deck every 4.5 seconds (pauses when hovering deck)
  useEffect(() => {
    if (isDeckPaused || deckModels.length <= 1) return;

    const timer = setInterval(() => {
      goToCard((activeCardIdx + 1) % deckModels.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [isDeckPaused, deckModels.length, activeCardIdx]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/models?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/models');
    }
  };

  return (
    <section className={`mg-hero mg-weather-${weather}`} id="hero" ref={heroRef}>
      {/* Cinematic atmospheric rain forest background with water reflections */}
      <div className="mg-hero-forest-bg" aria-hidden="true" />
      <div className="mg-hero-forest-mist" aria-hidden="true" />

      {/* Cinematic multi-layer canvas rain background */}
      <RainCanvas weather={weather} />

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
            {/* Live catalog category pill */}
            <div className="mg-hero-badge-wrap">
              <div className="mg-hero-badge">
                <span className="mg-hero-badge-dot" />
                <span className="mg-hero-badge-mono">LOCAL LIBRARY</span>
                <span className="mg-hero-badge-divider">/</span>
                <span>
                  {totalCatalogCount !== null ? `${totalCatalogCount} MODELS INDEXED` : 'CURATED MODEL REPOSITORY'}
                </span>
              </div>
            </div>

            {/* Editorial Headline with typewriter accent text */}
            <h1 className="mg-hero-title">
              <span className="mg-hero-title-line">
                <span className="mg-hero-title-reveal" style={{ animationDelay: '150ms' }}>
                  Your Models.
                </span>
              </span>
              <span className="mg-hero-title-line">
                <span className="mg-hero-title-reveal" style={{ animationDelay: '350ms' }}>
                  <HeroTypewriter />
                </span>
              </span>
            </h1>

            {/* Supporting Editorial Paragraph */}
            <p className="mg-hero-subtitle" style={{ animationDelay: '520ms' }}>
              Jelajahi, bandingkan, dan pahami model generative AI kamu di satu workspace zero-telemetry.
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
            </form>

            {/* Quick Tag Chips / Popular Filters */}
            <div className="mg-hero-quick-filters" style={{ animationDelay: '780ms' }}>
              <span className="mg-quick-label">POPULAR:</span>
              <div className="mg-quick-chips-list">
                {HERO_QUICK_TAGS.map((tag) => (
                  <button
                    key={tag.label}
                    type="button"
                    className="mg-quick-chip"
                    onClick={() => navigate(tag.target)}
                    title={`Browse ${tag.label} in models catalog`}
                  >
                    <span>{tag.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Primary & Secondary Action CTAs */}
            <div className="mg-hero-actions" style={{ animationDelay: '880ms' }}>
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
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <polyline points="19 12 12 19 5 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right Column: 3D Floating Model Card Deck */}
          <div
            className="mg-hero-deck-col"
            style={{ animationDelay: '600ms' }}
            onMouseEnter={() => setIsDeckPaused(true)}
            onMouseLeave={() => setIsDeckPaused(false)}
          >
            {/* Ambient Background Glow behind Card Deck */}
            <div className="mg-deck-ambient-glow" aria-hidden="true" />

            {/* 3D Stack of Cards */}
            <div className="mg-deck-stack">
              {deckModels.map((model, idx) => {
                const total = deckModels.length;
                const offset = (idx - activeCardIdx + total) % total;
                const isFront = offset === 0;
                const isShufflingOut = shufflingCardIdx === idx;

                return (
                  <div
                    key={model.id}
                    className={`mg-deck-card offset-${offset} ${isFront ? 'is-front' : 'is-stacked'} ${isShufflingOut ? 'is-shuffling-out' : ''}`}
                    onClick={() => {
                      if (!isFront) {
                        goToCard(idx);
                      }
                    }}
                    role={isFront ? undefined : 'button'}
                    tabIndex={isFront ? undefined : 0}
                    aria-label={isFront ? undefined : `Bring ${model.name} to front`}
                  >
                    {/* Optical Corner Reticles */}
                    <div className="mg-card-reticle tl" aria-hidden="true" />
                    <div className="mg-card-reticle tr" aria-hidden="true" />
                    <div className="mg-card-reticle bl" aria-hidden="true" />
                    <div className="mg-card-reticle br" aria-hidden="true" />

                    {/* Scanline beam sweep on active card */}
                    {isFront && <div className="mg-card-scanline" aria-hidden="true" />}

                    {/* Card Media Wrapper (Portrait Aspect Ratio) */}
                    <div className="mg-card-media-wrap">
                      <img
                        src={model.thumbnailUrl}
                        alt={model.name}
                        className="mg-card-img"
                        loading={isFront ? 'eager' : 'lazy'}
                        decoding="async"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/preview-1.png';
                        }}
                      />

                      {/* Top Badges overlaying image */}
                      <div className="mg-card-top-badges">
                        <div className="mg-card-base-pill">
                          <span className="mg-badge-accent-dot" />
                          <span>{model.baseModel}</span>
                        </div>
                        <span className={`mg-card-type-pill ${model.type?.toLowerCase() === 'lora' ? 'lora' : 'checkpoint'}`}>
                          {model.type}
                        </span>
                      </div>

                      <div className="mg-card-media-gradient" />
                    </div>

                    {/* Card Bottom Meta & Spec Panel */}
                    <div className="mg-card-body">
                      <div className="mg-card-identity">
                        <h3 className="mg-card-name" title={model.name}>
                          {model.name}
                        </h3>
                        <span className="mg-card-author">
                          by {model.author}
                          <svg className="mg-verified-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                          </svg>
                        </span>
                      </div>

                      {/* Model Description & Style Badges (Pre-sanitized data) */}
                      <div className="mg-card-desc-wrap">
                        {model.description && (
                          <p className="mg-card-desc-snippet" title={model.description}>
                            {model.description}
                          </p>
                        )}
                        {model.tags && model.tags.length > 0 && (
                          <div className="mg-card-tags-cloud">
                            {model.tags.map((t) => (
                              <span key={t} className="mg-card-tag-badge">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Technical Specs Metric Bar */}
                      <div className="mg-card-specs-grid">
                        <div className="mg-card-spec-item">
                          <span className="mg-card-spec-k">VRAM MIN</span>
                          <span className="mg-card-spec-v">{model.vramStr}</span>
                        </div>
                        <div className="mg-card-spec-item">
                          <span className="mg-card-spec-k">NATIVE RES</span>
                          <span className="mg-card-spec-v">{model.nativeRes}</span>
                        </div>
                        <div className="mg-card-spec-item">
                          <span className="mg-card-spec-k">SAMPLER</span>
                          <span className="mg-card-spec-v">{model.sampler}</span>
                        </div>
                        <div className="mg-card-spec-item">
                          <span className="mg-card-spec-k">CFG / STEPS</span>
                          <span className="mg-card-spec-v">{model.cfg} / {model.steps}</span>
                        </div>
                      </div>

                      {/* Card Action Link */}
                      <div className="mg-card-footer">
                        <Link
                          to={`/models?model=${model.slug}`}
                          className="mg-card-inspect-btn"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>Inspect SafeTensors File</span>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                          </svg>
                        </Link>
                        <span className="mg-card-status">{model.tensorCount} LAYERS</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Deck Navigation Controls */}
            <div className="mg-deck-controls">
              <button
                type="button"
                className="mg-deck-arrow-btn"
                onClick={handlePrevCard}
                aria-label="Previous model card"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              <div className="mg-deck-pills" role="tablist" aria-label="Model card selection">
                {deckModels.map((m, idx) => (
                  <button
                    key={m.id}
                    type="button"
                    role="tab"
                    aria-selected={activeCardIdx === idx}
                    className={`mg-deck-pill ${activeCardIdx === idx ? 'active' : ''}`}
                    onClick={() => goToCard(idx)}
                  >
                    <span className="mg-pill-num">0{idx + 1}</span>
                    <span className="mg-pill-name">{m.name.split('-')[0] || m.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="mg-deck-arrow-btn"
                onClick={handleNextCard}
                aria-label="Next model card"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
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

      {/* Interactive Weather Controller Widget in Bottom Right */}
      {isWeatherHidden ? (
        <button
          type="button"
          className="mg-weather-trigger-btn"
          onClick={() => setIsWeatherHidden(false)}
          title={`Cuaca: ${weather === 'clear' ? 'Cerah' : weather === 'rain' ? 'Hujan' : 'Badai'} (Klik untuk atur)`}
          aria-label="Buka Pengaturan Cuaca"
        >
          {weather === 'clear' && (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          )}
          {weather === 'rain' && (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
              <path d="M16 14v6M8 14v6M12 16v6" />
            </svg>
          )}
          {weather === 'storm' && (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
              <path d="m13 15-3 5h4l-1 5" />
            </svg>
          )}
        </button>
      ) : (
        <div className="mg-weather-widget" role="group" aria-label="Pengaturan Cuaca">
          <span className="mg-weather-label">WEATHER</span>
          <div className="mg-weather-pill">
            <button
              type="button"
              className={`mg-weather-btn ${weather === 'clear' ? 'active' : ''}`}
              data-weather="clear"
              onClick={() => setWeather('clear')}
              title="Cerah (Sunny / Clear Sky)"
              aria-pressed={weather === 'clear'}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
              <span>Cerah</span>
            </button>

            <button
              type="button"
              className={`mg-weather-btn ${weather === 'rain' ? 'active' : ''}`}
              data-weather="rain"
              onClick={() => setWeather('rain')}
              title="Hujan Biasa (Normal Rain)"
              aria-pressed={weather === 'rain'}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                <path d="M16 14v6M8 14v6M12 16v6" />
              </svg>
              <span>Hujan</span>
            </button>

            <button
              type="button"
              className={`mg-weather-btn ${weather === 'storm' ? 'active' : ''}`}
              data-weather="storm"
              onClick={() => setWeather('storm')}
              title="Hujan Badai (Storm & Lightning)"
              aria-pressed={weather === 'storm'}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                <path d="m13 15-3 5h4l-1 5" />
              </svg>
              <span>Badai</span>
            </button>

            <button
              type="button"
              className="mg-weather-hide-btn"
              onClick={() => setIsWeatherHidden(true)}
              title="Sembunyikan / Hide"
              aria-label="Sembunyikan Pengaturan Cuaca"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
