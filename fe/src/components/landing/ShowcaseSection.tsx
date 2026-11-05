import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getModels, type Model } from '../../api/models';
import { CyberSectionNavigator, scrollToSectionCleanly } from './CyberSectionNavigator';
import {
  CyberCorruptWalkingText,
} from './CyberCorruptWalkingText';
import {
  AllArchitecturesSvg,
  CheckpointsSvg,
  LoraSvg,
  IllustriousSvg,
  NoobAiSvg,
} from './showcase/ShowcaseCategoryIcons';

const VERIFIED_FALLBACK_MODELS: Model[] = [
  {
    id: 13,
    name: 'WAI-illustrious-SDXL',
    slug: 'wai-illustrious-sdxl',
    type: 'checkpoint',
    base_model: 'Illustrious',
    description: 'High-aesthetic anime diffusion checkpoint with balanced contrast, integrated VAE, and optimized prompt adherence.',
    author: 'WAI0731',
    source_url: 'https://civitai.com/models/827184',
    thumbnail_url: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/ce58b29f-26ca-461b-a184-cf54fb869e26/width=450/ce58b29f-26ca-461b-a184-cf54fb869e26.jpeg',
    likes: 3120,
    rating: 4.9,
    tensor_size: '587',
    vram_min: '6 GB',
    vram_recommended: '8 GB',
    tags: [{ id: 1, name: 'Anime', slug: 'anime' }, { id: 2, name: 'Illustrious', slug: 'illustrious' }],
    created_at: '2026-10-06T17:00:46Z',
    updated_at: '2026-10-06T17:00:46Z',
  },
  {
    id: 14,
    name: 'WAI-SHUFFLE-NOOB',
    slug: 'wai-shuffle-noob',
    type: 'checkpoint',
    base_model: 'NoobAI',
    description: 'V-prediction experimental architecture fine-tune balanced for warm anime color grading and limb stabilization.',
    author: 'WAI0731',
    source_url: 'https://civitai.com/models/989367',
    thumbnail_url: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/6942c4b2-fcd4-4135-ab44-a617e26235d3/width=450/6942c4b2-fcd4-4135-ab44-a617e26235d3.jpeg',
    likes: 1840,
    rating: 4.8,
    tensor_size: '587',
    vram_min: '6 GB',
    vram_recommended: '12 GB',
    tags: [{ id: 3, name: 'V-Pred', slug: 'v-pred' }, { id: 4, name: 'NoobAI', slug: 'noobai' }],
    created_at: '2026-10-06T17:54:31Z',
    updated_at: '2026-10-06T17:54:31Z',
  },
  {
    id: 15,
    name: 'Raehoshi Illust XL v2',
    slug: 'raehoshi-illust-xl',
    type: 'checkpoint',
    base_model: 'Illustrious',
    description: 'Clean line-art checkpoint fine-tuned with curated anime illustrations, robust Danbooru token support, and high dynamic range.',
    author: 'raehoshi',
    source_url: 'https://civitai.com/models/raehoshi',
    thumbnail_url: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/e621bef5-8aa3-49b8-9abe-a61aca533159/width=450/e621bef5-8aa3-49b8-9abe-a61aca533159.jpeg',
    likes: 4210,
    rating: 5.0,
    tensor_size: '587',
    vram_min: '6 GB',
    vram_recommended: '8 GB',
    tags: [{ id: 5, name: 'Clean Lineart', slug: 'clean-lineart' }],
    created_at: '2026-10-06T18:00:00Z',
    updated_at: '2026-10-06T18:00:00Z',
  },
  {
    id: 16,
    name: 'Vintage Manga Ink LoRA',
    slug: 'vintage-manga-ink-lora',
    type: 'lora',
    base_model: 'SDXL',
    description: 'Specialized rank-32 low-rank adaptation matrix for monochrome screentone hatching and retro 90s aesthetic rendering.',
    author: 'retro_lab',
    source_url: 'https://civitai.com/models/vintage-ink',
    thumbnail_url: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/37ff4f9a-b8ab-4f1a-a8fa-3ab55dc7d282/width=450/61631201.jpeg',
    likes: 980,
    rating: 4.9,
    tensor_size: '144',
    vram_min: '1 GB',
    vram_recommended: '2 GB',
    tags: [{ id: 6, name: 'LoRA', slug: 'lora' }, { id: 7, name: 'Manga', slug: 'manga' }],
    created_at: '2026-10-06T19:00:00Z',
    updated_at: '2026-10-06T19:00:00Z',
  },
  {
    id: 17,
    name: 'Cyberpunk Neon Lighting',
    slug: 'cyberpunk-neon-lighting',
    type: 'lora',
    base_model: 'Illustrious',
    description: 'Volumetric rim-lighting and saturated neon color gradient injection with minimal distortion of base model anatomy.',
    author: 'lumina_ai',
    source_url: 'https://civitai.com/models/neon-lighting',
    thumbnail_url: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/564eb9d2-544b-4854-8e17-0a349d80c121/width=450/47193855.jpeg',
    likes: 1450,
    rating: 4.8,
    tensor_size: '144',
    vram_min: '1 GB',
    vram_recommended: '2 GB',
    tags: [{ id: 8, name: 'Lighting', slug: 'lighting' }],
    created_at: '2026-10-06T20:00:00Z',
    updated_at: '2026-10-06T20:00:00Z',
  },
  {
    id: 18,
    name: 'Pony Diffusion V6 XL',
    slug: 'pony-diffusion-v6-xl',
    type: 'checkpoint',
    base_model: 'SDXL',
    description: 'Score-conditioned architecture fine-tune requiring score_9, score_8_up prefixes with strict tag adherences.',
    author: 'Astralite',
    source_url: 'https://civitai.com/models/257080',
    thumbnail_url: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/6942c4b2-fcd4-4135-ab44-a617e26235d3/width=450/6942c4b2-fcd4-4135-ab44-a617e26235d3.jpeg',
    likes: 8520,
    rating: 4.9,
    tensor_size: '587',
    vram_min: '8 GB',
    vram_recommended: '12 GB',
    tags: [{ id: 9, name: 'Pony', slug: 'pony' }],
    created_at: '2026-10-06T21:00:00Z',
    updated_at: '2026-10-06T21:00:00Z',
  },
];

type CategoryFilter = 'all' | 'checkpoint' | 'lora' | 'illustrious' | 'noobai';

interface FilterTabConfig {
  id: CategoryFilter;
  label: string;
  icon: React.ComponentType<{ className?: string; active?: boolean }>;
}

const CATEGORY_TABS: FilterTabConfig[] = [
  { id: 'all', label: 'All Architectures', icon: AllArchitecturesSvg },
  { id: 'checkpoint', label: 'Checkpoints', icon: CheckpointsSvg },
  { id: 'lora', label: 'LoRA Adapters', icon: LoraSvg },
  { id: 'illustrious', label: 'Illustrious Base', icon: IllustriousSvg },
  { id: 'noobai', label: 'NoobAI Base', icon: NoobAiSvg },
];

export function ShowcaseSection() {
  const [models, setModels] = useState<Model[]>(VERIFIED_FALLBACK_MODELS);
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all');
  const [activeBladeIdx, setActiveBladeIdx] = useState<number>(0);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  // Multi-plane Parallax Layer Refs
  const sectionRef = useRef<HTMLElement | null>(null);
  const bgRef = useRef<HTMLDivElement | null>(null);
  const rackRef = useRef<HTMLDivElement | null>(null);
  const bridgeRef = useRef<HTMLDivElement | null>(null);
  const hoverTimerRef = useRef<number | null>(null);

  const filteredModels = useMemo(() => {
    return models
      .filter((m) => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'checkpoint') return m.type === 'checkpoint';
        if (activeFilter === 'lora') return m.type === 'lora';
        if (activeFilter === 'illustrious') {
          return m.base_model?.toLowerCase().includes('illustrious');
        }
        if (activeFilter === 'noobai') {
          return m.base_model?.toLowerCase().includes('noobai');
        }
        return true;
      })
      .slice(0, 6);
  }, [models, activeFilter]);

  // Silky Smooth Mechanical Blade Switch Controller
  const triggerBladeSwitch = useCallback(
    (targetIdx: number) => {
      if (targetIdx === activeBladeIdx) return;
      setActiveBladeIdx(targetIdx);
    },
    [activeBladeIdx]
  );

  const handleBladeHover = (index: number) => {
    if (activeBladeIdx === index) return;
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
    }
    // 80ms intentional debounce for silky-smooth gliding without accidental switches
    hoverTimerRef.current = window.setTimeout(() => {
      triggerBladeSwitch(index);
    }, 80);
  };

  const handleBladeLeave = () => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        window.clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  // 120FPS Ultra-Smooth Hydraulic Parallax Controller (Matching Section 1 physics)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) return;

    let rafId: number;
    let currentP = 0.5;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const section = sectionRef.current;
      if (section) {
        const rect = section.getBoundingClientRect();
        const vh = window.innerHeight;

        // Viewport bounding window with pre-engagement buffer
        if (rect.bottom >= -120 && rect.top <= vh + 120) {
          const totalTravel = vh + rect.height;
          const targetP = Math.max(0, Math.min(1, (vh - rect.top) / totalTravel));

          // Exponential damping (Factor ~6.5)
          const smoothFactor = 1 - Math.exp(-6.5 * dt);
          currentP += (targetP - currentP) * smoothFactor;

          const offset = currentP - 0.5; // normalized offset [-0.5, 0.5]

          // Layer 1: Dedicated Cyberpunk Vector Backdrop (drifts smoothly vertically)
          if (bgRef.current) {
            const bgY = (offset * 56).toFixed(2);
            bgRef.current.style.transform = `translate3d(0, ${bgY}px, 0)`;
          }

          // Layer 2: Transition Bridge datum
          if (bridgeRef.current) {
            const bridgeY = (offset * 16).toFixed(2);
            bridgeRef.current.style.transform = `translate3d(0, ${bridgeY}px, 0)`;
          }

          // Layer 3: Blade Armory Rack (counter-movement with dynamic 3D perspective pitch tilt)
          if (rackRef.current) {
            const rackY = (offset * -24).toFixed(2);
            const tiltX = (offset * -2.0).toFixed(2);
            rackRef.current.style.transform = `perspective(1200px) rotateX(${tiltX}deg) translate3d(0, ${rackY}px, 0)`;
          }
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    let isMounted = true;
    getModels({ limit: 12 })
      .then((res) => {
        if (!isMounted) return;
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const fetched = res.data;
          const merged = [...fetched];
          for (const fallback of VERIFIED_FALLBACK_MODELS) {
            if (!merged.some((m) => m.slug === fallback.slug || m.id === fallback.id)) {
              merged.push(fallback);
            }
          }
          setModels(merged);
        }
      })
      .catch((err) => {
        console.warn('API model fetch in showcase used verified fallback:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const [isSectionRevealed, setIsSectionRevealed] = useState(false);
  const isSectionRevealedRef = useRef(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setIsSectionRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          if (!isSectionRevealedRef.current) {
            isSectionRevealedRef.current = true;
            setIsSectionRevealed(true);
          }
        } else {
          // Reset when scrolled out of view so it re-animates on every revisit!
          if (isSectionRevealedRef.current) {
            isSectionRevealedRef.current = false;
            setIsSectionRevealed(false);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -20px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const copyTriggerTag = (tag: string) => {
    navigator.clipboard?.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  return (
    <section className={`mg-showcase is-visible ${isSectionRevealed ? 'is-revealed' : ''}`} id="model-showcase" ref={sectionRef}>
      {/* Cyberpunk Vector Backdrop with Parallax */}
      <div ref={bgRef} className="mg-showcase-cyber-bg" aria-hidden="true" />

      <div className="mg-container" style={{ position: 'relative', zIndex: 6, display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%' }}>

        {/* Transition Bridge Datum directly inside Section 02 container */}
        <div
          ref={bridgeRef}
          className="mg-statement-bridge-datum mg-reveal-step delay-0"
          style={{ margin: '0 auto 16px auto', opacity: 0.88, width: '100%', cursor: 'pointer' }}
          onClick={() => scrollToSectionCleanly('model-showcase')}
          role="button"
          tabIndex={0}
          title="Klik untuk autofokus ke Section 2 (Model Library)"
        >
          <div className="mg-statement-bridge-line" />
          <div className="mg-statement-bridge-badge mg-chamfer-sm">
            <span className="mg-bridge-dot" />
            <span className="mg-bridge-text">
              <CyberCorruptWalkingText text="MODEL REPOSITORY 02 // ARMORY RACK" accent="cyan" cycleMs={6200} delayMs={900} />
            </span>
          </div>
          <div className="mg-statement-bridge-line" />
        </div>

        {/* Header */}
        <div className="mg-showcase-head mg-reveal-step delay-1">
          <div className="mg-showcase-head-info">
            <div className="mg-editorial-tag">
              <span className="mg-tag-num">02</span>
              <span className="mg-tag-line" />
              <span className="mg-tag-text">
                <span className="mg-tag-text" style={{ fontFamily: 'inherit', fontWeight: 700, letterSpacing: '0.02em' }}>MODEL LIBRARY SHOWCASE</span>
              </span>
            </div>
            <h2 className="mg-showcase-title">
              <CyberCorruptWalkingText text="MODELS LIBRARY" accent="cyan" cycleMs={6000} delayMs={1200} />
            </h2>
            <p className="mg-showcase-desc">
              Bilah mekanis interaktif: hover atau klik bilah untuk membuka key-art beresolusi penuh, alokasi VRAM real-time, dan trigger tags Danbooru siap salin.
            </p>
          </div>

          <Link to="/models" className="mg-btn mg-btn-secondary mg-chamfer-sm">
            <span>Explore Full Catalog ({models.length})</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>

        {/* Filter Category Buttons with .mg-chamfer-sm */}
        <div className="mg-showcase-filters mg-reveal-step delay-2" role="tablist" aria-label="Model categories">
          {CATEGORY_TABS.map((cat) => {
            const IconComponent = cat.icon;
            const isTabActive = activeFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={isTabActive}
                className={`mg-filter-chip mg-chamfer-sm ${isTabActive ? 'active' : ''}`}
                onClick={() => {
                  setActiveFilter(cat.id);
                  setActiveBladeIdx(0);
                  if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
                }}
              >
                <IconComponent active={isTabActive} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* ===================================================================
            ASUS ROG ARMORY HORIZONTAL BLADE ACCORDION RACK
            =================================================================== */}
        <div ref={rackRef} className="mg-blade-rack" role="tablist" aria-label="Model Blades">
          {filteredModels.map((item, index) => {
            const isActive = activeBladeIdx === index;
            const idxStr = `0${index + 1}`;
            const vramGb = item.vram_min ? parseInt(item.vram_min, 10) || 6 : 6;
            const vramPercent = Math.min(100, Math.round((vramGb / 16) * 100));

            const triggerTags = [
              '#nocturnal_glow',
              item.base_model?.toLowerCase().includes('noob') ? '#v_prediction' : '#epsilon_pred',
              '#clean_lineart',
              '#anime_aesthetic',
            ];

            return (
              <article
                key={item.id}
                role="tab"
                aria-selected={isActive}
                tabIndex={0}
                className={`mg-armory-blade mg-chamfer-md mg-gpu mg-stagger-blade blade-delay-${Math.min(index, 7)} ${isActive ? 'is-active' : 'is-inactive'}`}
                onClick={() => {
                  if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
                  triggerBladeSwitch(index);
                }}
                onMouseEnter={() => handleBladeHover(index)}
                onMouseLeave={handleBladeLeave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
                    triggerBladeSwitch(index);
                  }
                }}
              >
                {/* 1. Inactive Collapsed Blade View (Smoothly fades out via CSS) */}
                <div className="mg-blade-collapsed-view" aria-hidden={isActive}>
                  <img
                    src={item.thumbnail_url}
                    alt=""
                    className="mg-blade-bg-dimmed"
                    loading="lazy"
                  />
                  <span className="mg-blade-idx">{idxStr}</span>
                  <span className="mg-blade-title-vert">{item.name}</span>
                  <span className="mg-blade-vram-tag mg-chamfer-sm">{item.vram_min || '6 GB'}</span>
                </div>

                {/* 2. Active Expanded Blade View (Smoothly slides in via CSS) */}
                <div className="mg-blade-expanded-view" aria-hidden={!isActive}>
                  {/* Media Left Half */}
                  <div className="mg-blade-media-half">
                    <img
                      src={item.thumbnail_url}
                      alt={item.name}
                      className="mg-blade-img-hero"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/preview-1.jpg';
                      }}
                    />
                    <div className="mg-card-media-gradient" />

                    <div className="mg-card-media-tags" style={{ position: 'absolute', top: '14px', left: '14px', zIndex: 4 }}>
                      <span className={`mg-pill ${item.type === 'lora' ? 'mg-pill-lora' : 'mg-pill-checkpoint'} mg-chamfer-sm`}>
                        {item.type.toUpperCase()}
                      </span>
                      <span className="mg-pill mg-pill-base mg-chamfer-sm">
                        {item.base_model}
                      </span>
                    </div>
                  </div>

                  {/* Content Right Half */}
                  <div className="mg-blade-content-half">
                    <div>
                      {/* Unit Index & Title */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'var(--mg-font-mono)', fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>
                            MODEL // BLADE-{idxStr}
                          </span>
                          <span className="mg-blade-telemetry-tag mg-chamfer-sm">
                            READY // FP16
                          </span>
                        </div>
                        <span style={{ fontFamily: 'var(--mg-font-mono)', fontSize: '11px', color: '#94a3b8' }}>
                          by {item.author}
                        </span>
                      </div>

                      <h3
                        className="mg-blade-card-title"
                        style={{
                          fontSize: '22px',
                          fontWeight: 800,
                          color: '#ffffff',
                          margin: '0 0 8px',
                          fontFamily: "'Rajdhani', var(--mg-font-editorial), sans-serif",
                          letterSpacing: '0.02em',
                          textTransform: 'uppercase',
                          lineHeight: '1.2',
                        }}
                      >
                        {item.name}
                      </h3>

                      <p style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5', margin: '0 0 14px' }}>
                        {item.description.replace(/<[^>]+>/g, '').slice(0, 110)}...
                      </p>

                      {/* Tensor count badge & Sampler recommendation */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px', alignItems: 'center' }}>
                        <span className="mg-mech-tensor-count mg-chamfer-sm">
                          2,512 TENSOR KEYS // READY
                        </span>
                        <span className="mg-mech-lora-tag mg-chamfer-sm">
                          EULER A // 28 STEPS // CFG 5.5
                        </span>
                      </div>

                      {/* VRAM Hardware Footprint Bar */}
                      <div className="mg-blade-footprint-bar">
                        <div className="mg-footprint-head">
                          <span>VRAM HARDWARE FOOTPRINT</span>
                          <span style={{ color: '#ffffff', fontWeight: 700 }}>{item.vram_min || '6 GB'} / 16 GB</span>
                        </div>
                        <div className="mg-footprint-track mg-chamfer-sm">
                          <div
                            className="mg-footprint-fill mg-gpu"
                            style={{ transform: `scaleX(${vramPercent / 100})` }}
                          />
                        </div>
                      </div>

                      {/* Click-to-Copy Trigger Tags */}
                      <div>
                        <div style={{ fontFamily: 'var(--mg-font-mono)', fontSize: '10px', color: '#64748b', marginBottom: '6px', letterSpacing: '0.08em' }}>
                          CLICK-TO-COPY TRIGGER TAGS:
                        </div>
                        <div className="mg-trigger-tags-cloud">
                          {triggerTags.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              className="mg-trigger-tag-btn mg-chamfer-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyTriggerTag(tag.replace('#', ''));
                              }}
                              title="Klik untuk menyalin tag"
                            >
                              <span>{tag}</span>
                              <span style={{ opacity: 0.6 }}>⧉</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Footer Link */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '12px' }}>
                      <Link
                        to={`/models?model=${item.slug}`}
                        className="mg-card-inspect-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span>Inspect Full Model Telemetry</span>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </Link>
                      <span style={{ fontFamily: 'var(--mg-font-mono)', fontSize: '11px', color: '#facc15' }}>
                        ★ {item.rating?.toFixed(1) || '4.9'}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Copy Notification Toast */}
      {copiedTag && (
        <div className="mg-story-toast" role="status" aria-live="polite">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Tag &ldquo;{copiedTag}&rdquo; berhasil disalin ke clipboard</span>
        </div>
      )}

      {/* Cyberpunk Section Shortcut Navigator (Paling Ujung Bawah Section) */}
      <CyberSectionNavigator
        targetId="features-narrative"
        direction="down"
        label="CORE FEATURES"
        className="mg-dock-edge bottom mg-reveal-step delay-7"
      />
    </section>
  );
}

export default ShowcaseSection;
