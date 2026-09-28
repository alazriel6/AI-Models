import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getAllImages, getModels, type ModelImage, type Model } from '../../api/models';
import '../../style/Gallery.css';

// ============================================================================
// Clean Technical SVG Icons (Monochrome, Stroke-based, Developer Tool Style)
// ============================================================================

const Icons = {
  Search: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Clear: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Grid: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  Masonry: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="11" />
      <rect x="14" y="3" width="7" height="6" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="17" width="7" height="4" />
    </svg>
  ),
  Copy: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  Check: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Download: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  ExternalLink: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  ChevronRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  Layers: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  RotateCcw: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  ),
  Inspect: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  Cpu: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="15" x2="23" y2="15" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="15" x2="4" y2="15" />
    </svg>
  ),
};

export default function Gallery() {
  const [images, setImages] = useState<ModelImage[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [filterBaseModel, setFilterBaseModel] = useState<string>('all');
  const [filterModelId, setFilterModelId] = useState<string>('all');
  const [filterResource, setFilterResource] = useState<string>('all'); // 'all' | 'has_lora' | 'no_lora' | 'has_prompt'
  const [filterOrientation, setFilterOrientation] = useState<string>('all'); // 'all' | 'portrait' | 'landscape' | 'square'
  
  // View mode & density
  const [layoutMode, setLayoutMode] = useState<'masonry' | 'grid'>('grid');
  const [density, setDensity] = useState<'sm' | 'md' | 'lg'>('md');

  // Modal / Lightbox state
  const [selectedImage, setSelectedImage] = useState<ModelImage | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Trigger toast
  const triggerToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 2200);
  }, []);

  // Fetch images and models
  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);

    Promise.allSettled([
      getAllImages({ limit: 150 }),
      getModels({ limit: 100 }),
    ]).then(([imagesRes, modelsRes]) => {
      if (ignore) return;

      let loadedModels: Model[] = [];
      if (modelsRes.status === 'fulfilled' && modelsRes.value?.data) {
        loadedModels = modelsRes.value.data;
        setModels(loadedModels);
      }

      // Check if images came from /api/images
      if (imagesRes.status === 'fulfilled' && imagesRes.value?.data && imagesRes.value.data.length > 0) {
        setImages(imagesRes.value.data);
      } else {
        // Fallback: extract images from models
        const extractedImages: ModelImage[] = [];
        loadedModels.forEach((m) => {
          if (m.images && Array.isArray(m.images)) {
            m.images.forEach((img) => {
              extractedImages.push({
                ...img,
                model_id: m.id,
                model: {
                  id: m.id,
                  name: m.name,
                  slug: m.slug,
                  type: m.type,
                  base_model: m.base_model,
                  author: m.author,
                  thumbnail_url: m.thumbnail_url,
                },
              });
            });
          }
        });
        setImages(extractedImages);
      }

      setLoading(false);
    }).catch((err) => {
      if (ignore) return;
      console.error('Failed to load gallery images:', err);
      setError('Failed to load gallery items from backend.');
      setLoading(false);
    });

    return () => {
      ignore = true;
    };
  }, []);

  // Extract unique base models
  const availableBaseModels = useMemo(() => {
    const set = new Set<string>();
    images.forEach((img) => {
      if (img.model?.base_model) set.add(img.model.base_model);
    });
    models.forEach((m) => {
      if (m.base_model) set.add(m.base_model);
    });
    return Array.from(set).sort();
  }, [images, models]);

  // Filtered & Sorted Images list
  const filteredImages = useMemo(() => {
    return images.filter((img) => {
      // 1. Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const captionMatch = (img.caption || '').toLowerCase().includes(q);
        const promptMatch = (img.positive_prompt || '').toLowerCase().includes(q);
        const modelNameMatch = (img.model?.name || '').toLowerCase().includes(q);
        const baseModelMatch = (img.model?.base_model || '').toLowerCase().includes(q);
        const samplerMatch = (img.sampler || '').toLowerCase().includes(q);
        const resourceMatch = img.resources?.some((r) => r.name.toLowerCase().includes(q)) ?? false;

        if (!captionMatch && !promptMatch && !modelNameMatch && !baseModelMatch && !samplerMatch && !resourceMatch) {
          return false;
        }
      }

      // 2. Base model filter
      if (filterBaseModel !== 'all') {
        const base = img.model?.base_model || '';
        if (base.toLowerCase() !== filterBaseModel.toLowerCase()) {
          return false;
        }
      }

      // 3. Model ID filter
      if (filterModelId !== 'all') {
        if (String(img.model_id) !== filterModelId && String(img.model?.id) !== filterModelId) {
          return false;
        }
      }

      // 4. Resource type filter
      if (filterResource === 'has_lora') {
        const hasLora = img.resources?.some((r) => r.type?.toLowerCase() === 'lora') ?? false;
        if (!hasLora) return false;
      } else if (filterResource === 'no_lora') {
        const hasLora = img.resources?.some((r) => r.type?.toLowerCase() === 'lora') ?? false;
        if (hasLora) return false;
      } else if (filterResource === 'has_prompt') {
        if (!img.positive_prompt || !img.positive_prompt.trim()) return false;
      }

      // 5. Orientation filter
      if (filterOrientation !== 'all') {
        const w = img.width || 0;
        const h = img.height || 0;
        if (w > 0 && h > 0) {
          if (filterOrientation === 'portrait' && w >= h) return false;
          if (filterOrientation === 'landscape' && h >= w) return false;
          if (filterOrientation === 'square' && w !== h) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return (a.id || 0) - (b.id || 0);
        case 'steps_desc':
          return (b.steps || 0) - (a.steps || 0);
        case 'steps_asc':
          return (a.steps || 0) - (b.steps || 0);
        case 'model_asc':
          return (a.model?.name || '').localeCompare(b.model?.name || '');
        case 'model_desc':
          return (b.model?.name || '').localeCompare(a.model?.name || '');
        case 'res_desc': {
          const resA = (a.width || 0) * (a.height || 0);
          const resB = (b.width || 0) * (b.height || 0);
          return resB - resA;
        }
        case 'newest':
        default:
          return (b.id || 0) - (a.id || 0);
      }
    });
  }, [images, searchQuery, sortBy, filterBaseModel, filterModelId, filterResource, filterOrientation]);

  // Overall Statistics (Compact Inline Metadata)
  const stats = useMemo(() => {
    const uniqueModels = new Set<string>();
    const uniqueLoras = new Set<string>();

    images.forEach((img) => {
      if (img.model?.name) uniqueModels.add(img.model.name);
      img.resources?.forEach((r) => {
        if (r.type?.toLowerCase() === 'lora') uniqueLoras.add(r.name);
      });
    });

    return {
      totalWorks: images.length,
      filteredCount: filteredImages.length,
      totalCheckpoints: uniqueModels.size,
      totalLoras: uniqueLoras.size,
    };
  }, [images, filteredImages]);

  // Copy helper
  const copyToClipboard = useCallback((text: string, key: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      triggerToast(`Copied ${label}`);
      setTimeout(() => setCopiedKey(null), 1800);
    }).catch(() => {
      triggerToast(`Failed to copy ${label}`);
    });
  }, [triggerToast]);

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setSortBy('newest');
    setFilterBaseModel('all');
    setFilterModelId('all');
    setFilterResource('all');
    setFilterOrientation('all');
  };

  const hasActiveFilters = searchQuery || filterBaseModel !== 'all' || filterModelId !== 'all' || filterResource !== 'all' || filterOrientation !== 'all';

  // Keyboard navigation for Lightbox Modal
  useEffect(() => {
    if (!selectedImage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedImage(null);
        setIsZoomed(false);
      } else if (e.key === 'ArrowLeft') {
        const curIdx = filteredImages.findIndex((img) => img.id === selectedImage.id);
        if (curIdx > 0) {
          setSelectedImage(filteredImages[curIdx - 1]);
          setIsZoomed(false);
        } else if (curIdx === 0 && filteredImages.length > 1) {
          setSelectedImage(filteredImages[filteredImages.length - 1]);
          setIsZoomed(false);
        }
      } else if (e.key === 'ArrowRight') {
        const curIdx = filteredImages.findIndex((img) => img.id === selectedImage.id);
        if (curIdx >= 0 && curIdx < filteredImages.length - 1) {
          setSelectedImage(filteredImages[curIdx + 1]);
          setIsZoomed(false);
        } else if (curIdx === filteredImages.length - 1 && filteredImages.length > 1) {
          setSelectedImage(filteredImages[0]);
          setIsZoomed(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage, filteredImages]);

  // Format full parameter text for WebUI / ComfyUI clipboard export
  const buildFullParametersText = (img: ModelImage) => {
    const parts: string[] = [];
    if (img.positive_prompt) {
      parts.push(img.positive_prompt);
    }
    if (img.negative_prompt) {
      parts.push(`Negative prompt: ${img.negative_prompt}`);
    }

    const settings: string[] = [];
    if (img.steps) settings.push(`Steps: ${img.steps}`);
    if (img.sampler) settings.push(`Sampler: ${img.sampler}`);
    if (img.scheduler && img.scheduler !== 'normal') settings.push(`Schedule type: ${img.scheduler}`);
    if (img.cfg_scale) settings.push(`CFG scale: ${img.cfg_scale}`);
    if (img.seed !== undefined && img.seed !== null) settings.push(`Seed: ${img.seed}`);
    if (img.width && img.height) settings.push(`Size: ${img.width}x${img.height}`);
    if (img.model?.name) settings.push(`Model: ${img.model.name}`);
    if (img.model?.base_model) settings.push(`Base Model: ${img.model.base_model}`);

    if (img.resources && img.resources.length > 0) {
      const loras = img.resources
        .filter((r) => r.type === 'lora')
        .map((r) => `${r.name}: ${r.weight ?? 1.0}`)
        .join(', ');
      if (loras) settings.push(`LoRA hashes: "${loras}"`);
    }

    parts.push(settings.join(', '));
    return parts.join('\n');
  };

  return (
    <div className="gallery-page">
      {/* ===================================================================
          Compact Header & Technical Metadata Row
          =================================================================== */}
      <section className="gallery-header-section">
        <div className="gallery-header-left">
          <h1 className="gallery-page-title">
            Gallery
            <span className="gallery-text-badge">Civitai Showcase</span>
          </h1>
          <p className="gallery-page-subtitle">
            Generation results and metadata from your AI image workflow.
          </p>
        </div>

        {/* Compact Metadata Row (as requested) */}
        <div className="gallery-meta-row">
          <span><span className="gallery-meta-val">{stats.totalWorks}</span> works</span>
          <span className="gallery-meta-dot">·</span>
          <span><span className="gallery-meta-val">{stats.totalCheckpoints}</span> checkpoints</span>
          <span className="gallery-meta-dot">·</span>
          <span><span className="gallery-meta-val">{stats.totalLoras}</span> LoRAs</span>
          {hasActiveFilters && (
            <>
              <span className="gallery-meta-dot">·</span>
              <span style={{ color: 'var(--g-accent)' }}>{stats.filteredCount} matching</span>
            </>
          )}
        </div>
      </section>

      {/* ===================================================================
          Unified Toolbar: Search, Selectors & Segmented Controls
          =================================================================== */}
      <section className="gallery-toolbar">
        {/* Primary Controls Row: Search + Main Selectors */}
        <div className="gallery-toolbar-top">
          <div className="gallery-search-wrap">
            <span className="gallery-search-icon">
              <Icons.Search />
            </span>
            <input
              type="text"
              className="gallery-search-input"
              placeholder="Search prompt, model checkpoint, LoRA, sampler..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="gallery-search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear query"
              >
                <Icons.Clear />
              </button>
            )}
          </div>

          <div className="gallery-select-cluster">
            {/* Sort Dropdown */}
            <select
              className="gallery-field-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              title="Sort orders"
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="steps_desc">Steps: High to Low</option>
              <option value="steps_asc">Steps: Low to High</option>
              <option value="model_asc">Model: A to Z</option>
              <option value="model_desc">Model: Z to A</option>
              <option value="res_desc">Resolution: Largest</option>
            </select>

            {/* Base Model Dropdown */}
            <select
              className="gallery-field-select"
              value={filterBaseModel}
              onChange={(e) => setFilterBaseModel(e.target.value)}
              title="Filter by Base Model architecture"
            >
              <option value="all">Base Model: All</option>
              {availableBaseModels.map((bm) => (
                <option key={bm} value={bm}>
                  Base: {bm}
                </option>
              ))}
            </select>

            {/* Model / Checkpoint Dropdown */}
            <select
              className="gallery-field-select"
              value={filterModelId}
              onChange={(e) => setFilterModelId(e.target.value)}
              title="Filter by Checkpoint Model"
            >
              <option value="all">Model: All Checkpoints</option>
              {models.map((m) => (
                <option key={m.id} value={String(m.id)}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Secondary Controls Row: Segmented Filters + View Utilities */}
        <div className="gallery-toolbar-bottom">
          <div className="gallery-filter-segments">
            <span className="gallery-filter-label">Filter:</span>

            <button
              className={`gallery-btn-segment ${filterResource === 'all' && filterOrientation === 'all' ? 'active' : ''}`}
              onClick={() => {
                setFilterResource('all');
                setFilterOrientation('all');
              }}
            >
              All
            </button>
            <button
              className={`gallery-btn-segment ${filterResource === 'has_lora' ? 'active' : ''}`}
              onClick={() => setFilterResource(filterResource === 'has_lora' ? 'all' : 'has_lora')}
            >
              With LoRA
            </button>
            <button
              className={`gallery-btn-segment ${filterResource === 'no_lora' ? 'active' : ''}`}
              onClick={() => setFilterResource(filterResource === 'no_lora' ? 'all' : 'no_lora')}
            >
              Checkpoint
            </button>
            <button
              className={`gallery-btn-segment ${filterResource === 'has_prompt' ? 'active' : ''}`}
              onClick={() => setFilterResource(filterResource === 'has_prompt' ? 'all' : 'has_prompt')}
            >
              Has Prompt
            </button>

            <span className="gallery-filter-divider"></span>

            <button
              className={`gallery-btn-segment ${filterOrientation === 'portrait' ? 'active' : ''}`}
              onClick={() => setFilterOrientation(filterOrientation === 'portrait' ? 'all' : 'portrait')}
            >
              Portrait
            </button>
            <button
              className={`gallery-btn-segment ${filterOrientation === 'landscape' ? 'active' : ''}`}
              onClick={() => setFilterOrientation(filterOrientation === 'landscape' ? 'all' : 'landscape')}
            >
              Landscape
            </button>
            <button
              className={`gallery-btn-segment ${filterOrientation === 'square' ? 'active' : ''}`}
              onClick={() => setFilterOrientation(filterOrientation === 'square' ? 'all' : 'square')}
            >
              Square
            </button>

            {hasActiveFilters && (
              <>
                <span className="gallery-filter-divider"></span>
                <button className="gallery-btn-reset" onClick={resetFilters}>
                  <Icons.RotateCcw />
                  Reset
                </button>
              </>
            )}
          </div>

          {/* Right Utility: View Mode & Grid Density */}
          <div className="gallery-utilities">
            <div className="gallery-segment-group">
              <button
                className={`gallery-icon-btn ${layoutMode === 'grid' ? 'active' : ''}`}
                onClick={() => setLayoutMode('grid')}
                title="Grid layout"
              >
                <Icons.Grid />
                Grid
              </button>
              <button
                className={`gallery-icon-btn ${layoutMode === 'masonry' ? 'active' : ''}`}
                onClick={() => setLayoutMode('masonry')}
                title="Masonry layout"
              >
                <Icons.Masonry />
                Masonry
              </button>
            </div>

            <div className="gallery-segment-group">
              <button
                className={`gallery-icon-btn ${density === 'sm' ? 'active' : ''}`}
                onClick={() => setDensity('sm')}
                title="Compact density"
              >
                S
              </button>
              <button
                className={`gallery-icon-btn ${density === 'md' ? 'active' : ''}`}
                onClick={() => setDensity('md')}
                title="Regular density"
              >
                M
              </button>
              <button
                className={`gallery-icon-btn ${density === 'lg' ? 'active' : ''}`}
                onClick={() => setDensity('lg')}
                title="Large density"
              >
                L
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          Loading State
          =================================================================== */}
      {loading && (
        <div className="gallery-loader-box">
          <div className="gallery-spin-indicator"></div>
          <span>Loading generations catalog...</span>
        </div>
      )}

      {/* ===================================================================
          Error State
          =================================================================== */}
      {!loading && error && (
        <div className="gallery-empty-panel">
          <div className="gallery-empty-icon-wrap">
            <Icons.Layers />
          </div>
          <h3 className="gallery-empty-title">Connection Error</h3>
          <p className="gallery-empty-desc">{error}</p>
          <button className="gallery-btn-primary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      )}

      {/* ===================================================================
          Compact Technical Empty State (as requested)
          =================================================================== */}
      {!loading && !error && filteredImages.length === 0 && (
        <div className="gallery-empty-panel">
          <div className="gallery-empty-icon-wrap">
            <Icons.Layers />
          </div>
          <h3 className="gallery-empty-title">
            {images.length === 0 ? 'No generations yet' : 'No matching generations'}
          </h3>
          <p className="gallery-empty-desc">
            {images.length === 0
              ? 'Your workspace does not have any generated image records attached yet. Import models or upload images through the Admin console.'
              : 'No generation items matched the specified filter criteria and search query.'}
          </p>
          <div className="gallery-empty-actions">
            {images.length === 0 ? (
              <>
                <Link to="/admin" className="gallery-btn-primary">
                  Add Generation
                </Link>
                <Link to="/models" className="gallery-btn-secondary">
                  Browse Models
                </Link>
              </>
            ) : (
              <button className="gallery-btn-secondary" onClick={resetFilters}>
                Clear Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================
          Gallery Items Grid / Masonry
          =================================================================== */}
      {!loading && !error && filteredImages.length > 0 && (
        <div className={`gallery-${layoutMode}-view density-${density}`}>
          {filteredImages.map((img) => {
            const loraCount = img.resources?.filter((r) => r.type?.toLowerCase() === 'lora').length || 0;
            const modelName = img.model?.name || 'Checkpoint Model';
            const baseModel = img.model?.base_model || 'SDXL';

            return (
              <article
                key={img.id}
                className="gallery-item-card"
                onClick={() => {
                  setSelectedImage(img);
                  setIsZoomed(false);
                }}
              >
                <div className="gallery-card-viewport">
                  <img
                    src={img.image_url}
                    alt={img.caption || modelName}
                    className="gallery-item-img"
                    loading="lazy"
                  />

                  {/* Minimal Technical Tags on image */}
                  <div className="gallery-card-tag-row">
                    <span className="gallery-card-tag base">
                      {baseModel.toUpperCase()}
                    </span>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      {loraCount > 0 && (
                        <span className="gallery-card-tag lora">
                          LoRA ({loraCount})
                        </span>
                      )}
                      {img.width && img.height && (
                        <span className="gallery-card-tag res">
                          {img.width}×{img.height}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hover Quick Action Overlay */}
                  <div className="gallery-hover-actions">
                    <button
                      className="gallery-action-link-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage(img);
                        setIsZoomed(false);
                      }}
                    >
                      <Icons.Inspect />
                      Inspect
                    </button>

                    {img.positive_prompt && (
                      <button
                        className="gallery-copy-icon-btn"
                        title="Copy positive prompt"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(img.positive_prompt || '', `card-${img.id}`, 'Prompt');
                        }}
                      >
                        {copiedKey === `card-${img.id}` ? <Icons.Check /> : <Icons.Copy />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Technical Metadata Footer */}
                <div className="gallery-card-footer">
                  <div className="gallery-card-model-row">
                    <span className="gallery-card-model-name" title={modelName}>
                      {modelName}
                    </span>
                  </div>

                  <div className="gallery-card-params-row">
                    {img.steps ? <span>Steps {img.steps}</span> : null}
                    {img.cfg_scale ? <span>CFG {img.cfg_scale}</span> : null}
                    {img.sampler ? <span>{img.sampler}</span> : null}
                  </div>

                  {img.positive_prompt && (
                    <div className="gallery-card-prompt-preview" title={img.positive_prompt}>
                      {img.positive_prompt}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ===================================================================
          Technical Inspector Lightbox Modal
          =================================================================== */}
      {selectedImage && (
        <div
          className="gallery-modal-overlay"
          onClick={() => {
            setSelectedImage(null);
            setIsZoomed(false);
          }}
        >
          <div className="gallery-modal-frame" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              className="gallery-modal-close-btn"
              onClick={() => {
                setSelectedImage(null);
                setIsZoomed(false);
              }}
              title="Close inspector (Esc)"
            >
              <Icons.Clear />
            </button>

            {/* Left: Image Canvas Viewport */}
            <div className="modal-canvas-side">
              {/* Prev Button */}
              {filteredImages.length > 1 && (
                <button
                  className="modal-step-btn prev"
                  onClick={() => {
                    const curIdx = filteredImages.findIndex((img) => img.id === selectedImage.id);
                    const prevIdx = (curIdx - 1 + filteredImages.length) % filteredImages.length;
                    setSelectedImage(filteredImages[prevIdx]);
                    setIsZoomed(false);
                  }}
                  title="Previous generation (←)"
                >
                  <Icons.ChevronLeft />
                </button>
              )}

              {/* Next Button */}
              {filteredImages.length > 1 && (
                <button
                  className="modal-step-btn next"
                  onClick={() => {
                    const curIdx = filteredImages.findIndex((img) => img.id === selectedImage.id);
                    const nextIdx = (curIdx + 1) % filteredImages.length;
                    setSelectedImage(filteredImages[nextIdx]);
                    setIsZoomed(false);
                  }}
                  title="Next generation (→)"
                >
                  <Icons.ChevronRight />
                </button>
              )}

              {/* Main Image */}
              <img
                src={selectedImage.image_url}
                alt={selectedImage.caption || selectedImage.model?.name || 'Inspect'}
                className={`modal-viewport-img ${isZoomed ? 'is-zoomed' : ''}`}
                onClick={() => setIsZoomed(!isZoomed)}
                title={isZoomed ? 'Click to fit view' : 'Click to zoom in'}
              />

              {/* Canvas Bottom Utility Strip */}
              <div className="modal-canvas-bar">
                <span className="modal-canvas-counter">
                  {filteredImages.findIndex((img) => img.id === selectedImage.id) + 1} / {filteredImages.length}
                </span>

                <button
                  className="modal-tool-link"
                  onClick={() => setIsZoomed(!isZoomed)}
                >
                  {isZoomed ? 'Fit' : 'Zoom'}
                </button>

                <a
                  href={selectedImage.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="modal-tool-link"
                  title="Open full resolution in new tab"
                >
                  <Icons.ExternalLink />
                  Raw
                </a>

                <a
                  href={selectedImage.image_url}
                  download={`generation-${selectedImage.id}.png`}
                  className="modal-tool-link"
                  title="Save image to disk"
                >
                  <Icons.Download />
                  Download
                </a>
              </div>
            </div>

            {/* Right: Technical Metadata Inspector */}
            <div className="modal-spec-side">
              <div className="modal-spec-header">
                <h2 className="modal-spec-title">Generation Parameters</h2>
                <p className="modal-spec-subtitle">
                  image_id: {selectedImage.id} · resolution: {selectedImage.width && selectedImage.height ? `${selectedImage.width}×${selectedImage.height}` : 'unknown'}
                </p>
              </div>

              <div className="modal-spec-body">
                {/* Checkpoint Model Specification Block */}
                <div className="spec-group">
                  <div className="spec-group-header">
                    <span className="spec-group-title">Base Checkpoint</span>
                  </div>

                  <div className="spec-model-block">
                    <div className="spec-model-text">
                      <span className="spec-model-name">
                        {selectedImage.model?.name || 'Checkpoint Model'}
                      </span>
                      <div className="spec-model-meta">
                        <span>{selectedImage.model?.base_model || 'SDXL'}</span>
                        <span>·</span>
                        <span>{selectedImage.model?.type?.toUpperCase() || 'CHECKPOINT'}</span>
                        {selectedImage.model?.author && (
                          <>
                            <span>·</span>
                            <span>by {selectedImage.model.author}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {selectedImage.model?.slug ? (
                      <Link
                        to={`/models?model=${selectedImage.model.slug}`}
                        className="spec-model-link"
                        onClick={() => setSelectedImage(null)}
                      >
                        Model Info
                        <Icons.ExternalLink />
                      </Link>
                    ) : (
                      <Link
                        to="/models"
                        className="spec-model-link"
                        onClick={() => setSelectedImage(null)}
                      >
                        All Models
                        <Icons.ExternalLink />
                      </Link>
                    )}
                  </div>
                </div>

                {/* LoRA & Auxiliary Resources */}
                <div className="spec-group">
                  <div className="spec-group-header">
                    <span className="spec-group-title">LoRA & Resources</span>
                    {selectedImage.resources && selectedImage.resources.length > 0 && (
                      <span style={{ fontSize: '11px', color: 'var(--g-text-muted)', fontFamily: 'ui-monospace, monospace' }}>
                        {selectedImage.resources.length} active
                      </span>
                    )}
                  </div>

                  {selectedImage.resources && selectedImage.resources.length > 0 ? (
                    <div className="spec-lora-list">
                      {selectedImage.resources.map((res, idx) => (
                        <div key={idx} className="spec-lora-row">
                          <div className="spec-lora-name-col">
                            <span className="spec-lora-tag">
                              {res.type?.toUpperCase() || 'LORA'}
                            </span>
                            <span className="spec-lora-name" title={res.name}>
                              {res.name}
                            </span>
                            {res.weight !== undefined && (
                              <span className="spec-lora-weight">
                                : {res.weight}
                              </span>
                            )}
                          </div>

                          <button
                            className="spec-lora-copy"
                            onClick={() => copyToClipboard(`<lora:${res.name}:${res.weight ?? 1.0}>`, `lora-${idx}`, `<lora:${res.name}>`)}
                            title="Copy prompt tag syntax"
                          >
                            {copiedKey === `lora-${idx}` ? 'Copied' : 'Copy Tag'}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ background: 'var(--g-surface-elevated)', border: '1px solid var(--g-border)', padding: '8px 10px', borderRadius: 'var(--g-radius)', fontSize: '12px', color: 'var(--g-text-muted)' }}>
                      No auxiliary LoRA weights applied (Native Checkpoint).
                    </div>
                  )}
                </div>

                {/* Positive Prompt */}
                <div className="spec-group">
                  <div className="spec-group-header">
                    <span className="spec-group-title">Positive Prompt</span>
                    {selectedImage.positive_prompt && (
                      <button
                        className="spec-copy-btn"
                        onClick={() => copyToClipboard(selectedImage.positive_prompt || '', 'pos-prompt', 'Prompt')}
                      >
                        {copiedKey === 'pos-prompt' ? <Icons.Check /> : <Icons.Copy />}
                        {copiedKey === 'pos-prompt' ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>

                  <div className="spec-code-box">
                    {selectedImage.positive_prompt || 'No prompt metadata recorded for this generation.'}
                  </div>
                </div>

                {/* Negative Prompt */}
                {selectedImage.negative_prompt && (
                  <div className="spec-group">
                    <div className="spec-group-header">
                      <span className="spec-group-title">Negative Prompt</span>
                      <button
                        className="spec-copy-btn"
                        onClick={() => copyToClipboard(selectedImage.negative_prompt || '', 'neg-prompt', 'Negative Prompt')}
                      >
                        {copiedKey === 'neg-prompt' ? <Icons.Check /> : <Icons.Copy />}
                        {copiedKey === 'neg-prompt' ? 'Copied' : 'Copy'}
                      </button>
                    </div>

                    <div className="spec-code-box negative">
                      {selectedImage.negative_prompt}
                    </div>
                  </div>
                )}

                {/* Generation Settings Grid */}
                <div className="spec-group">
                  <span className="spec-group-title">Pipeline Configuration</span>

                  <div className="spec-params-grid">
                    <div className="spec-param-cell">
                      <span className="spec-cell-label">Sampling Steps</span>
                      <span className="spec-cell-val">{selectedImage.steps || '28'}</span>
                    </div>

                    <div className="spec-param-cell">
                      <span className="spec-cell-label">CFG Scale</span>
                      <span className="spec-cell-val">{selectedImage.cfg_scale ? selectedImage.cfg_scale.toFixed(1) : '7.0'}</span>
                    </div>

                    <div className="spec-param-cell">
                      <span className="spec-cell-label">Sampler</span>
                      <span className="spec-cell-val">{selectedImage.sampler || 'Euler a'}</span>
                    </div>

                    <div className="spec-param-cell">
                      <span className="spec-cell-label">Scheduler</span>
                      <span className="spec-cell-val">{selectedImage.scheduler || 'Normal'}</span>
                    </div>

                    <div className="spec-param-cell">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="spec-cell-label">Seed</span>
                        {selectedImage.seed !== undefined && selectedImage.seed !== null && (
                          <button
                            className="spec-copy-btn"
                            style={{ padding: '0 4px', fontSize: '10px' }}
                            onClick={() => copyToClipboard(String(selectedImage.seed), 'seed', 'Seed')}
                          >
                            {copiedKey === 'seed' ? '✓' : 'Copy'}
                          </button>
                        )}
                      </div>
                      <span className="spec-cell-val">{selectedImage.seed ?? 'Random'}</span>
                    </div>

                    <div className="spec-param-cell">
                      <span className="spec-cell-label">Resolution</span>
                      <span className="spec-cell-val">
                        {selectedImage.width && selectedImage.height
                          ? `${selectedImage.width}×${selectedImage.height}`
                          : '1024×1024'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Export Parameters Action */}
                <div className="modal-spec-footer">
                  <button
                    className="modal-export-btn"
                    onClick={() => {
                      const fullText = buildFullParametersText(selectedImage);
                      copyToClipboard(fullText, 'full-params', 'All Parameters');
                    }}
                  >
                    <Icons.Copy />
                    {copiedKey === 'full-params' ? 'Parameters Copied to Clipboard' : 'Copy Full Generation Parameters (WebUI)'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          Compact Toast Notice
          =================================================================== */}
      {toastMessage && (
        <div className="gallery-toast-notice">
          <Icons.Check />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
