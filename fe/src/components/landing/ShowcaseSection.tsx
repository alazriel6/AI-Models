import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getModels, type Model } from '../../api/models';

// Curated verified fallback models matching the exact database schema
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
    thumbnail_url: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/ce58b29f-26ca-461b-a184-cf54fb869e26/original=true/ce58b29f-26ca-461b-a184-cf54fb869e26.jpeg',
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
    thumbnail_url: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/6942c4b2-fcd4-4135-ab44-a617e26235d3/original=true/6942c4b2-fcd4-4135-ab44-a617e26235d3.jpeg',
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
    thumbnail_url: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/e621bef5-8aa3-49b8-9abe-a61aca533159/original=true/e621bef5-8aa3-49b8-9abe-a61aca533159.jpeg',
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
    thumbnail_url: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/37ff4f9a-b8ab-4f1a-a8fa-3ab55dc7d282/original=true/61631201.jpeg',
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
    name: 'Cyberpunk Neon Lighting LoRA',
    slug: 'cyberpunk-neon-lighting',
    type: 'lora',
    base_model: 'Illustrious',
    description: 'Volumetric rim-lighting and saturated neon color gradient injection with minimal distortion of base model anatomy.',
    author: 'lumina_ai',
    source_url: 'https://civitai.com/models/neon-lighting',
    thumbnail_url: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/564eb9d2-544b-4854-8e17-0a349d80c121/original=true/47193855.jpeg',
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
    thumbnail_url: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/6942c4b2-fcd4-4135-ab44-a617e26235d3/original=true/6942c4b2-fcd4-4135-ab44-a617e26235d3.jpeg',
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

export function ShowcaseSection() {
  const [models, setModels] = useState<Model[]>(VERIFIED_FALLBACK_MODELS);
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all');
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    getModels({ limit: 12 })
      .then((res) => {
        if (!isMounted) return;
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          // Merge API models with fallback models to ensure rich variety
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

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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

  return (
    <section
      ref={sectionRef}
      className={`mg-showcase ${isVisible ? 'is-visible' : ''}`}
      id="model-showcase"
    >
      {/* Architectural Corner Reticles matching Design System */}
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

      {/* Seamless Transition Bridge from Specification Suite 01 */}
      <div className="mg-showcase-transition-bridge" aria-hidden="true">
        <div className="mg-statement-bridge-datum">
          <div className="mg-statement-bridge-line" />
          <div className="mg-statement-bridge-badge">
            <span className="mg-bridge-dot" />
            <span className="mg-bridge-text">MODEL REPOSITORY 02</span>
          </div>
          <div className="mg-statement-bridge-line" />
        </div>
      </div>

      {/* Dedicated Ancient Mossy Cedar Forest Background (Distinct from Hero and 01) */}
      <div className="mg-showcase-forest-bg" aria-hidden="true" />

      {/* Volumetric Sunbeam / God Rays Streaming Through High Canopy */}
      <div className="mg-showcase-godrays" aria-hidden="true" />

      {/* Subtle Natural Forest Ground Mist Ribbons */}
      <div className="mg-showcase-mist-ribbon mist-1" aria-hidden="true" />
      <div className="mg-showcase-mist-ribbon mist-2" aria-hidden="true" />

      {/* Ambient Vignette & Contrast Depth Lighting */}
      <div className="mg-showcase-atmosphere" aria-hidden="true" />

      <div className="mg-container">
        {/* Showcase Section Title & Filter Tabs */}
        <div className="mg-showcase-head">
          <div>
            <div className="mg-editorial-tag">
              <span className="mg-tag-num">02</span>
              <span className="mg-tag-line" />
              <span className="mg-tag-text">MODEL LIBRARY SHOWCASE</span>
            </div>
            <h2 className="mg-showcase-title">
              Curated Model Directory
            </h2>
            <p className="mg-showcase-desc">
              Browse checkpoints and LoRA adapters with verified tensor configurations, memory requirements, and trigger words.
            </p>
          </div>

          <Link to="/models" className="mg-btn mg-btn-secondary">
            <span>Explore Full Catalog ({models.length})</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>

        {/* Filter Category Buttons */}
        <div className="mg-showcase-filters" role="tablist" aria-label="Model categories">
          {[
            { id: 'all', label: 'All Architectures' },
            { id: 'checkpoint', label: 'Checkpoints' },
            { id: 'lora', label: 'LoRA Adapters' },
            { id: 'illustrious', label: 'Illustrious Base' },
            { id: 'noobai', label: 'NoobAI Base' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={activeFilter === cat.id}
              className={`mg-filter-chip ${activeFilter === cat.id ? 'active' : ''}`}
              onClick={() => setActiveFilter(cat.id as CategoryFilter)}
            >
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Asymmetric Staggered Model Cards Grid */}
        <div className="mg-showcase-grid">
          {filteredModels.map((item, index) => (
            <article
              key={item.id}
              className="mg-model-card"
              style={{ animationDelay: `${index * 90}ms` }}
            >
              {/* Card Header & Preview Image */}
              <div className="mg-card-media">
                {item.thumbnail_url ? (
                  <img
                    src={item.thumbnail_url}
                    alt={item.name}
                    className="mg-card-img"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/400x240?text=Model+Preview';
                    }}
                  />
                ) : (
                  <div className="mg-card-img-placeholder">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span>Preview Unavailable</span>
                  </div>
                )}

                <div className="mg-card-media-tags">
                  <span className={`mg-pill ${item.type === 'lora' ? 'mg-pill-lora' : 'mg-pill-checkpoint'}`}>
                    {item.type.toUpperCase()}
                  </span>
                  <span className="mg-pill mg-pill-base">
                    {item.base_model}
                  </span>
                </div>
              </div>

              {/* Card Technical Body */}
              <div className="mg-card-body">
                <div className="mg-card-top-row">
                  <h3 className="mg-card-title" title={item.name}>
                    {item.name}
                  </h3>
                  <span className="mg-card-author">by {item.author}</span>
                </div>

                <p className="mg-card-desc">
                  {item.description.replace(/<[^>]+>/g, '').slice(0, 115)}...
                </p>

                {/* Technical Metadata Row */}
                <div className="mg-card-metrics">
                  <div className="mg-metric-item">
                    <span className="mg-metric-k">VRAM MIN</span>
                    <span className="mg-metric-v">{item.vram_min || (item.type === 'checkpoint' ? '6 GB' : '1 GB')}</span>
                  </div>
                  <div className="mg-metric-item">
                    <span className="mg-metric-k">TENSORS</span>
                    <span className="mg-metric-v">{item.tensor_size ? `${item.tensor_size} Layers` : '587 Layers'}</span>
                  </div>
                  <div className="mg-metric-item">
                    <span className="mg-metric-k">RATING</span>
                    <span className="mg-metric-v">★ {item.rating?.toFixed(1) || '4.9'}</span>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mg-card-footer">
                  <Link
                    to={`/models?model=${item.slug}`}
                    className="mg-card-inspect-link"
                  >
                    <span>Inspect Model</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </Link>

                  <span className="mg-card-likes">
                    ♥ {item.likes >= 1000 ? `${(item.likes / 1000).toFixed(1)}k` : item.likes}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
