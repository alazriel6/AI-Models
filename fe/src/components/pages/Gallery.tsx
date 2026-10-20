import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { getAllImages, getModels, type ModelImage, type Model } from '../../api/models';
import { resolveImageUrl } from '../../api/client';
import { WorkflowBridgeMenu } from '../common/WorkflowBridgeMenu';
import {
  type WorkflowBridgeData,
  bridgeToPromptLab,
  bridgeToCalculator,
  bridgeToLoraStack,
  bridgeToNegativeVault,
} from '../../utils/workflowBridge';
import { useFavorites } from '../../api/favorites';
import { OptimizedImage } from '../common/OptimizedImage';
import {
  buildA1111ParametersText,
  buildComfyUIWorkflowJSON,
  buildWebUIApiPayload,
  downloadTextAsFile,
} from '../../utils/exportFormats';
import { isNsfwImage } from '../../utils/nsfw';
import '../../style/Gallery.css';

// ============================================================================
// Clean Technical SVG Icons (Monochrome, Stroke-based, Developer Tool Style)
// ============================================================================

const Icons = {
  Sliders: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  ),
  ChevronDown: () => (
    <svg className="gf-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
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
  List: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
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
  Star: ({ filled }: { filled?: boolean }) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
};

export default function Gallery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const imageParam = searchParams.get('image');

  const { isImageFav, toggleImage, favoriteImages } = useFavorites();

  const [images, setImages] = useState<ModelImage[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('newest');
  const [filterFavorite, setFilterFavorite] = useState<'all' | 'fav_only' | 'non_fav'>('all');
  const [filterBaseModel, setFilterBaseModel] = useState<string>('all');
  const [filterModelId, setFilterModelId] = useState<string>('all');
  const [filterResource, setFilterResource] = useState<string>('all'); // 'all' | 'has_lora' | 'no_lora' | 'has_prompt' | 'has_params'
  const [filterOrientation, setFilterOrientation] = useState<string>('all'); // 'all' | 'portrait' | 'landscape' | 'square'
  const [filterResolution, setFilterResolution] = useState<string>('all'); // 'all' | 'sd' | 'hd' | 'uhd'
  const [filterSampler, setFilterSampler] = useState<string>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // View mode & density: Grid, Masonry waterfall, or List mode (optimized for mobile)
  const [layoutMode, setLayoutMode] = useState<'grid' | 'masonry' | 'list'>(() => {
    try {
      const saved = localStorage.getItem('models_gallery_layout');
      if (saved === 'grid' || saved === 'masonry' || saved === 'list') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'grid';
  });

  const handleSetLayoutMode = useCallback((mode: 'grid' | 'masonry' | 'list') => {
    setLayoutMode(mode);
    try {
      localStorage.setItem('models_gallery_layout', mode);
    } catch {
      // ignore
    }
  }, []);

  const navigate = useNavigate();
  const [density, setDensity] = useState<'sm' | 'md' | 'lg'>('md');

  // Modal / Lightbox state
  const [selectedImage, setSelectedImage] = useState<ModelImage | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal open/close helpers syncing URL query parameters for deep linking
  const handleSelectImage = useCallback((img: ModelImage) => {
    setSelectedImage(img);
    setIsZoomed(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('image', String(img.id));
      return next;
    });
  }, [setSearchParams]);

  const handleCloseModal = useCallback(() => {
    setSelectedImage(null);
    setIsZoomed(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('image');
      return next;
    });
  }, [setSearchParams]);

  // Trigger toast
  const triggerToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 2200);
  }, []);

  // NSFW Setting state: persisted in localStorage ('gallery_nsfw_rating' & 'gallery_show_nsfw')
  const [filterNsfwRating, setFilterNsfwRating] = useState<'sfw' | 'all' | 'nsfw'>(() => {
    try {
      const savedRating = localStorage.getItem('gallery_nsfw_rating');
      if (savedRating === 'sfw' || savedRating === 'all' || savedRating === 'nsfw') {
        return savedRating;
      }
      const legacyShowNsfw = localStorage.getItem('gallery_show_nsfw');
      if (legacyShowNsfw === 'true') return 'all';
    } catch {
      // ignore
    }
    return 'sfw';
  });

  const handleNsfwRatingChange = useCallback((val: 'sfw' | 'all' | 'nsfw') => {
    setFilterNsfwRating(val);
    try {
      localStorage.setItem('gallery_nsfw_rating', val);
      localStorage.setItem('gallery_show_nsfw', String(val !== 'sfw'));
    } catch {
      // ignore
    }
    if (val === 'sfw') triggerToast('Filter: SFW Saja (Konten 18+ disembunyikan)');
    else if (val === 'all') triggerToast('Filter: Menampilkan semua konten (SFW & 18+)');
    else if (val === 'nsfw') triggerToast('Filter: Khusus konten 🔞 18+ (NSFW)');
  }, [triggerToast]);

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

  // Deep link sync: if ?image=<id> is in URL, auto open lightbox
  useEffect(() => {
    if (imageParam && images.length > 0) {
      const match = images.find((img) => String(img.id) === imageParam);
      if (match) {
        setSelectedImage(match);
      }
    }
  }, [imageParam, images]);

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

  // Extract unique samplers
  const availableSamplers = useMemo(() => {
    const set = new Set<string>();
    images.forEach((img) => {
      if (img.sampler && img.sampler.trim()) {
        set.add(img.sampler.trim());
      }
    });
    return Array.from(set).sort();
  }, [images]);

  // Autocomplete / Search suggestion state
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  // Close search suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Aggregate all tags with counts for Pixiv-style Popular Tags Ribbon
  const allTags = useMemo(() => {
    const map = new Map<string, number>();
    images.forEach((img) => {
      img.tags?.forEach((t: any) => {
        const name = typeof t === 'string' ? t : t?.name;
        if (name && name.trim()) {
          const clean = name.trim();
          map.set(clean, (map.get(clean) || 0) + 1);
        }
      });
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [images]);

  // Compute tag suggestions based on active query (Pixiv Autocomplete)
  const tagSuggestions = useMemo(() => {
    if (!isSearchFocused) return [];
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) {
      return allTags.slice(0, 6);
    }
    const tokens = trimmed.split(/\s+/);
    const lastToken = tokens[tokens.length - 1];
    const cleanLast = lastToken.startsWith('#') ? lastToken.slice(1) : lastToken;

    if (!cleanLast) return allTags.slice(0, 6);

    return allTags
      .filter((t) => t.name.toLowerCase().includes(cleanLast))
      .slice(0, 8);
  }, [allTags, searchQuery, isSearchFocused]);

  // Handle clicking a tag suggestion
  const handleSelectTagSuggestion = (tagName: string) => {
    const tokens = searchQuery.trim().split(/\s+/).filter(Boolean);
    if (tokens.length > 1) {
      tokens[tokens.length - 1] = `#${tagName}`;
      setSearchQuery(tokens.join(' ') + ' ');
    } else {
      setSelectedTag(tagName);
      setSearchQuery('');
    }
    setIsSearchFocused(false);
  };

  // Filtered & Sorted Images list
  const filteredImages = useMemo(() => {
    return images.filter((img) => {
      // 0. NSFW Rating Filter
      const isNsfw = isNsfwImage(img);
      if (filterNsfwRating === 'sfw' && isNsfw) {
        const isExplicitSearch =
          (selectedTag && ['18+', 'nsfw', 'r18', 'r-18'].includes(selectedTag.toLowerCase().trim())) ||
          searchQuery.toLowerCase().includes('18+') ||
          searchQuery.toLowerCase().includes('nsfw');
        if (!isExplicitSearch) {
          return false;
        }
      } else if (filterNsfwRating === 'nsfw' && !isNsfw) {
        return false;
      }

      // 1. Favorites Filter
      if (filterFavorite === 'fav_only' && !isImageFav(img.id)) {
        return false;
      } else if (filterFavorite === 'non_fav' && isImageFav(img.id)) {
        return false;
      }

      // 2. Selected Tag filter (Pixiv style)
      if (selectedTag) {
        const normSelected = selectedTag.toLowerCase().trim();
        const hasTag = img.tags?.some((t: any) => {
          const name = (typeof t === 'string' ? t : t?.name || '').toLowerCase().trim();
          const slug = (typeof t === 'string' ? t : t?.slug || '').toLowerCase().trim();
          return name === normSelected || slug === normSelected;
        }) ?? false;
        if (!hasTag) return false;
      }

      // 3. Text & Tags search (Pixiv Multi-Token AND Search)
      if (searchQuery.trim()) {
        const tokens = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
        const matchesAllTokens = tokens.every((token) => {
          const isExplicitTag = token.startsWith('#');
          const cleanToken = isExplicitTag ? token.slice(1) : token;
          if (!cleanToken) return true;

          // Check Tag matches (both name and slug)
          const tagMatch = img.tags?.some((t: any) => {
            const name = (typeof t === 'string' ? t : t?.name || '').toLowerCase();
            const slug = (typeof t === 'string' ? t : t?.slug || '').toLowerCase();
            return name.includes(cleanToken) || slug.includes(cleanToken);
          }) ?? false;

          if (isExplicitTag) {
            return tagMatch;
          }

          const captionMatch = (img.caption || '').toLowerCase().includes(cleanToken);
          const promptMatch = (img.positive_prompt || '').toLowerCase().includes(cleanToken);
          const modelNameMatch = (img.model?.name || img.model_name || '').toLowerCase().includes(cleanToken);
          const baseModelMatch = (img.model?.base_model || '').toLowerCase().includes(cleanToken);
          const samplerMatch = (img.sampler || '').toLowerCase().includes(cleanToken);
          const resourceMatch = img.resources?.some((r) => r.name.toLowerCase().includes(cleanToken)) ?? false;

          return tagMatch || captionMatch || promptMatch || modelNameMatch || baseModelMatch || samplerMatch || resourceMatch;
        });

        if (!matchesAllTokens) return false;
      }

      // 4. Base model filter
      if (filterBaseModel !== 'all') {
        const base = img.model?.base_model || '';
        if (base.toLowerCase() !== filterBaseModel.toLowerCase()) {
          return false;
        }
      }

      // 5. Model ID filter
      if (filterModelId !== 'all') {
        if (filterModelId === 'standalone') {
          if (img.model_id && img.model_id > 0) return false;
        } else {
          if (String(img.model_id) !== filterModelId && String(img.model?.id) !== filterModelId) {
            return false;
          }
        }
      }

      // 6. Resource type filter
      if (filterResource === 'has_lora') {
        const hasLora = img.resources?.some((r) => r.type?.toLowerCase() === 'lora') ?? false;
        if (!hasLora) return false;
      } else if (filterResource === 'no_lora') {
        const hasLora = img.resources?.some((r) => r.type?.toLowerCase() === 'lora') ?? false;
        if (hasLora) return false;
      } else if (filterResource === 'has_prompt') {
        if (!img.positive_prompt || !img.positive_prompt.trim()) return false;
      } else if (filterResource === 'has_params') {
        if (!img.sampler || !img.steps || !img.cfg_scale) return false;
      }

      // 7. Orientation filter
      if (filterOrientation !== 'all') {
        const w = img.width || 0;
        const h = img.height || 0;
        if (w > 0 && h > 0) {
          if (filterOrientation === 'portrait' && w >= h) return false;
          if (filterOrientation === 'landscape' && h >= w) return false;
          if (filterOrientation === 'square' && w !== h) return false;
        }
      }

      // 8. Resolution filter
      if (filterResolution !== 'all') {
        const px = (img.width || 0) * (img.height || 0);
        if (filterResolution === 'sd' && px > 1024 * 1024) return false;
        if (filterResolution === 'hd' && (px <= 1024 * 1024 || px > 1920 * 1080)) return false;
        if (filterResolution === 'uhd' && px <= 1920 * 1080) return false;
      }

      // 9. Sampler filter
      if (filterSampler !== 'all') {
        if ((img.sampler || '').toLowerCase() !== filterSampler.toLowerCase()) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return (a.id || 0) - (b.id || 0);
        case 'fav_first': {
          const aFav = isImageFav(a.id) ? 1 : 0;
          const bFav = isImageFav(b.id) ? 1 : 0;
          if (aFav !== bFav) return bFav - aFav;
          return (b.id || 0) - (a.id || 0);
        }
        case 'steps_desc':
          return (b.steps || 0) - (a.steps || 0);
        case 'steps_asc':
          return (a.steps || 0) - (b.steps || 0);
        case 'model_asc':
          return (a.model?.name || a.model_name || '').localeCompare(b.model?.name || b.model_name || '');
        case 'model_desc':
          return (b.model?.name || b.model_name || '').localeCompare(a.model?.name || a.model_name || '');
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
  }, [
    images,
    searchQuery,
    selectedTag,
    sortBy,
    filterFavorite,
    filterNsfwRating,
    filterBaseModel,
    filterModelId,
    filterResource,
    filterOrientation,
    filterResolution,
    filterSampler,
    isImageFav,
  ]);

  // Overall Statistics (Compact Inline Metadata)
  const stats = useMemo(() => {
    const uniqueModels = new Set<string>();
    const uniqueLoras = new Set<string>();
    let nsfwCount = 0;

    images.forEach((img) => {
      if (img.model?.name) uniqueModels.add(img.model.name);
      img.resources?.forEach((r) => {
        if (r.type?.toLowerCase() === 'lora') uniqueLoras.add(r.name);
      });
      if (isNsfwImage(img)) {
        nsfwCount++;
      }
    });

    return {
      totalWorks: images.length,
      filteredCount: filteredImages.length,
      totalCheckpoints: uniqueModels.size,
      totalLoras: uniqueLoras.size,
      totalNsfw: nsfwCount,
    };
  }, [images, filteredImages]);

  // Responsive Virtualization Setup
  const galleryContainerRef = useRef<HTMLDivElement>(null);
  const [galleryContainerWidth, setGalleryContainerWidth] = useState(1200);

  useEffect(() => {
    if (!galleryContainerRef.current) return;
    const updateWidth = () => {
      if (galleryContainerRef.current) {
        setGalleryContainerWidth(galleryContainerRef.current.clientWidth);
      }
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(galleryContainerRef.current);
    return () => ro.disconnect();
  }, [density, layoutMode, loading]);

  // Responsive column calculation for Grid mode
  const galleryColumns = useMemo(() => {
    if (galleryContainerWidth <= 380) {
      return density === 'sm' ? 2 : 1;
    }
    if (galleryContainerWidth <= 640) {
      return density === 'lg' ? 1 : 2;
    }
    if (galleryContainerWidth <= 960) {
      return density === 'sm' ? 3 : density === 'lg' ? 2 : 3;
    }
    if (galleryContainerWidth <= 1280) {
      return density === 'sm' ? 5 : density === 'lg' ? 3 : 4;
    }
    const colMin = density === 'sm' ? 190 : density === 'lg' ? 320 : 250;
    return Math.max(2, Math.floor((galleryContainerWidth + 12) / (colMin + 12)));
  }, [galleryContainerWidth, density]);

  // Responsive column count for Masonry Waterfall
  const masonryColumnsCount = useMemo(() => {
    if (galleryContainerWidth <= 380) {
      return density === 'sm' ? 2 : 1;
    }
    if (galleryContainerWidth <= 640) {
      return density === 'lg' ? 1 : 2;
    }
    if (galleryContainerWidth <= 960) {
      return density === 'sm' ? 3 : density === 'lg' ? 2 : 3;
    }
    if (galleryContainerWidth <= 1280) {
      return density === 'sm' ? 4 : density === 'lg' ? 2 : 3;
    }
    const colMin = density === 'sm' ? 200 : density === 'lg' ? 340 : 260;
    return Math.max(2, Math.floor((galleryContainerWidth + 12) / (colMin + 12)));
  }, [galleryContainerWidth, density]);

  // Distribute items across columns using greedy shortest-height balancing
  const masonryColumns = useMemo(() => {
    const colCount = masonryColumnsCount;
    const cols: ModelImage[][] = Array.from({ length: colCount }, () => []);
    const colHeights = new Array(colCount).fill(0);

    filteredImages.forEach((img) => {
      let minCol = 0;
      let minH = colHeights[0];
      for (let i = 1; i < colCount; i++) {
        if (colHeights[i] < minH) {
          minH = colHeights[i];
          minCol = i;
        }
      }
      cols[minCol].push(img);
      const aspect = (img.height && img.width) ? (img.height / img.width) : 1.25;
      colHeights[minCol] += aspect * 260 + 80;
    });

    return cols;
  }, [filteredImages, masonryColumnsCount]);

  // Shared card renderer for Grid and Masonry modes
  const renderGalleryCard = (img: ModelImage, isMasonry: boolean = false) => {
    const loraCount = img.resources?.filter((r) => r.type?.toLowerCase() === 'lora').length || 0;
    const modelName = img.model?.name || img.model_name || 'Checkpoint Model';
    const baseModel = img.model?.base_model || (img.model_name ? 'CUSTOM' : 'SDXL');
    const isFav = isImageFav(img.id);
    const hasDimensions = Boolean(img.width && img.height);
    const aspectStyle = isMasonry && hasDimensions
      ? { aspectRatio: `${img.width} / ${img.height}` }
      : undefined;

    return (
      <article
        key={img.id}
        className={`gallery-item-card ${isMasonry ? 'masonry-card' : ''}`}
        onClick={() => handleSelectImage(img)}
      >
        <div className="gallery-card-viewport" style={aspectStyle}>
          <OptimizedImage
            src={resolveImageUrl(img.image_url)}
            alt={img.caption || modelName}
            className="gallery-item-img"
            thumbnail={true}
          />

          {/* Minimal Technical Tags on image */}
          <div className="gallery-card-tag-row">
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span className="gallery-card-tag base">
                {baseModel.toUpperCase()}
              </span>
              {isNsfwImage(img) && (
                <span className="gallery-card-tag nsfw" title="Konten 18+ / NSFW">
                  18+
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '4px' }}>
              {loraCount > 0 && (
                <span className="gallery-card-tag lora">
                  LoRA ({loraCount})
                </span>
              )}
              {hasDimensions && (
                <span className="gallery-card-tag res">
                  {img.width}×{img.height}
                </span>
              )}
            </div>
          </div>

          {/* Hover / Touch Quick Action Overlay */}
          <div className="gallery-hover-actions">
            <button
              type="button"
              className="gallery-action-link-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectImage(img);
              }}
            >
              <Icons.Inspect />
              Inspect
            </button>

            <button
              type="button"
              className={`gallery-copy-icon-btn ${isFav ? 'favorited' : ''}`}
              title={isFav ? 'Hapus dari favorit' : 'Simpan ke favorit'}
              onClick={(e) => {
                e.stopPropagation();
                const nextFav = toggleImage(img.id);
                triggerToast(nextFav ? 'Ditambahkan ke Favorit' : 'Dihapus dari Favorit');
              }}
              style={{ color: isFav ? '#f59e0b' : undefined }}
            >
              <Icons.Star filled={isFav} />
            </button>

            {img.positive_prompt && (
              <button
                type="button"
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
            <span className="gallery-card-model-name" title={img.caption || `Artwork #${img.id}`}>
              {img.caption || `Artwork #${img.id}`}
            </span>
          </div>

          <div className="gallery-card-params-row">
            {img.steps ? <span>Steps {img.steps}</span> : null}
            {img.cfg_scale ? <span>CFG {img.cfg_scale}</span> : null}
            {img.sampler ? <span>{img.sampler}</span> : null}
          </div>

          {/* Pixiv Tags */}
          {img.tags && img.tags.length > 0 && (
            <div className="gallery-card-tag-chips">
              {img.tags.slice(0, 4).map((t) => {
                const isActive = selectedTag?.toLowerCase() === t.name.toLowerCase();
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`gallery-card-tag-btn ${isActive ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTag(isActive ? null : t.name);
                    }}
                    title={`Filter by #${t.name}`}
                  >
                    <span className="tag-hash">#</span>
                    <span>{t.name}</span>
                  </button>
                );
              })}
              {img.tags.length > 4 && (
                <span style={{ fontSize: '10px', color: 'var(--g-text-muted)', alignSelf: 'center', fontFamily: 'ui-monospace, monospace' }}>
                  +{img.tags.length - 4}
                </span>
              )}
            </div>
          )}

          {img.positive_prompt && (
            <div className="gallery-card-prompt-preview" title={img.positive_prompt}>
              {img.positive_prompt}
            </div>
          )}
        </div>
      </article>
    );
  };

  // Dedicated List card renderer optimized for mobile & detailed specs
  const renderListCard = (img: ModelImage) => {
    const loraCount = img.resources?.filter((r) => r.type?.toLowerCase() === 'lora').length || 0;
    const modelName = img.model?.name || img.model_name || 'Checkpoint Model';
    const baseModel = img.model?.base_model || (img.model_name ? 'CUSTOM' : 'SDXL');
    const isFav = isImageFav(img.id);
    const hasDimensions = Boolean(img.width && img.height);

    return (
      <article
        key={img.id}
        className="gallery-list-card"
        onClick={() => handleSelectImage(img)}
      >
        <div className="gallery-list-thumb-col">
          <div className="gallery-list-thumb-viewport">
            <OptimizedImage
              src={resolveImageUrl(img.image_url)}
              alt={img.caption || modelName}
              className="gallery-list-thumb-img"
              thumbnail={true}
            />
            <span className="gallery-card-tag base">
              {baseModel.toUpperCase()}
            </span>
            {hasDimensions && (
              <span className="gallery-list-res-badge">
                {img.width}×{img.height}
              </span>
            )}
          </div>
        </div>

        <div className="gallery-list-info-col">
          <div className="gallery-list-header-row">
            <div className="gallery-list-title-wrap">
              <h3 className="gallery-list-item-title" title={img.caption || `Artwork #${img.id}`}>
                {img.caption || `Artwork #${img.id}`}
              </h3>
              <span className="gallery-list-model-pill" title={modelName}>
                {modelName}
              </span>
              {loraCount > 0 && (
                <span className="gallery-card-tag lora" style={{ fontSize: '10px', padding: '1px 5px' }}>
                  LoRA ({loraCount})
                </span>
              )}
              {isNsfwImage(img) && (
                <span className="gallery-card-tag nsfw" style={{ fontSize: '10px', padding: '1px 5px' }}>
                  18+ NSFW
                </span>
              )}
            </div>

            <div className="gallery-list-actions">
              <button
                type="button"
                className={`gallery-icon-btn-compact ${isFav ? 'favorited' : ''}`}
                title={isFav ? 'Hapus dari favorit' : 'Simpan ke favorit'}
                onClick={(e) => {
                  e.stopPropagation();
                  const nextFav = toggleImage(img.id);
                  triggerToast(nextFav ? 'Ditambahkan ke Favorit' : 'Dihapus dari Favorit');
                }}
              >
                <Icons.Star filled={isFav} />
              </button>

              {img.positive_prompt && (
                <button
                  type="button"
                  className="gallery-icon-btn-compact"
                  title="Copy positive prompt"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(img.positive_prompt || '', `list-${img.id}`, 'Prompt');
                  }}
                >
                  {copiedKey === `list-${img.id}` ? <Icons.Check /> : <Icons.Copy />}
                </button>
              )}

              <button
                type="button"
                className="gallery-icon-btn-compact inspect"
                title="Inspect generation specs"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectImage(img);
                }}
              >
                <Icons.Inspect />
              </button>
            </div>
          </div>

          {img.positive_prompt && (
            <p className="gallery-list-prompt" title={img.positive_prompt}>
              {img.positive_prompt}
            </p>
          )}

          <div className="gallery-list-meta-row">
            <div className="gallery-list-params-cluster">
              {img.steps ? <span className="gallery-list-param-tag">Steps {img.steps}</span> : null}
              {img.cfg_scale ? <span className="gallery-list-param-tag">CFG {img.cfg_scale}</span> : null}
              {img.sampler ? <span className="gallery-list-param-tag">{img.sampler}</span> : null}
              {img.seed ? <span className="gallery-list-param-tag">Seed {img.seed}</span> : null}
            </div>

            {img.tags && img.tags.length > 0 && (
              <div className="gallery-list-tags-cluster">
                {img.tags.slice(0, 3).map((t) => {
                  const isActive = selectedTag?.toLowerCase() === t.name.toLowerCase();
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`gallery-card-tag-btn ${isActive ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTag(isActive ? null : t.name);
                      }}
                      title={`Filter by #${t.name}`}
                    >
                      <span className="tag-hash">#</span>
                      <span>{t.name}</span>
                    </button>
                  );
                })}
                {img.tags.length > 3 && (
                  <span className="gallery-list-more-tags">
                    +{img.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </article>
    );
  };

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
    setSelectedTag(null);
    setSortBy('newest');
    setFilterFavorite('all');
    setFilterNsfwRating('sfw');
    setFilterBaseModel('all');
    setFilterModelId('all');
    setFilterResource('all');
    setFilterOrientation('all');
    setFilterResolution('all');
    setFilterSampler('all');
    try {
      localStorage.setItem('gallery_nsfw_rating', 'sfw');
      localStorage.setItem('gallery_show_nsfw', 'false');
    } catch {
      // ignore
    }
    triggerToast('Semua filter direset ke awal');
  };

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    Boolean(selectedTag) ||
    sortBy !== 'newest' ||
    filterFavorite !== 'all' ||
    filterNsfwRating !== 'sfw' ||
    filterBaseModel !== 'all' ||
    filterModelId !== 'all' ||
    filterResource !== 'all' ||
    filterOrientation !== 'all' ||
    filterResolution !== 'all' ||
    filterSampler !== 'all';

  // Active advanced-filter chips (shown below the filter bar, each removable)
  const RESOURCE_LABELS: Record<string, string> = {
    has_lora: 'Dengan LoRA',
    no_lora: 'Tanpa LoRA',
    has_prompt: 'Memiliki Prompt',
    has_params: 'Parameter Lengkap',
  };
  const ORIENTATION_LABELS: Record<string, string> = {
    portrait: 'Portrait',
    landscape: 'Landscape',
    square: 'Square 1:1',
  };
  const RESOLUTION_LABELS: Record<string, string> = {
    sd: 'SD ≤ 1 MP',
    hd: 'HD 1–2 MP',
    uhd: 'UHD > 2 MP',
  };

  const advancedChips: { key: string; label: string; value: string; onClear: () => void }[] = [];
  if (filterModelId !== 'all') {
    const name = filterModelId === 'standalone'
      ? 'Standalone'
      : models.find((m) => String(m.id) === filterModelId)?.name || filterModelId;
    advancedChips.push({ key: 'model', label: 'Checkpoint', value: name, onClear: () => setFilterModelId('all') });
  }
  if (filterBaseModel !== 'all') {
    advancedChips.push({ key: 'base', label: 'Base', value: filterBaseModel, onClear: () => setFilterBaseModel('all') });
  }
  if (filterResource !== 'all') {
    advancedChips.push({ key: 'resource', label: 'Resource', value: RESOURCE_LABELS[filterResource] || filterResource, onClear: () => setFilterResource('all') });
  }
  if (filterOrientation !== 'all') {
    advancedChips.push({ key: 'orientation', label: 'Rasio', value: ORIENTATION_LABELS[filterOrientation] || filterOrientation, onClear: () => setFilterOrientation('all') });
  }
  if (filterResolution !== 'all') {
    advancedChips.push({ key: 'resolution', label: 'Resolusi', value: RESOLUTION_LABELS[filterResolution] || filterResolution, onClear: () => setFilterResolution('all') });
  }
  if (filterSampler !== 'all') {
    advancedChips.push({ key: 'sampler', label: 'Sampler', value: filterSampler, onClear: () => setFilterSampler('all') });
  }
  const advancedActiveCount = advancedChips.length;

  // Keyboard navigation for Lightbox Modal
  useEffect(() => {
    if (!selectedImage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseModal();
      } else if (e.key === 'ArrowLeft') {
        const curIdx = filteredImages.findIndex((img) => img.id === selectedImage.id);
        if (curIdx > 0) {
          handleSelectImage(filteredImages[curIdx - 1]);
        } else if (curIdx === 0 && filteredImages.length > 1) {
          handleSelectImage(filteredImages[filteredImages.length - 1]);
        }
      } else if (e.key === 'ArrowRight') {
        const curIdx = filteredImages.findIndex((img) => img.id === selectedImage.id);
        if (curIdx >= 0 && curIdx < filteredImages.length - 1) {
          handleSelectImage(filteredImages[curIdx + 1]);
        } else if (curIdx === filteredImages.length - 1 && filteredImages.length > 1) {
          handleSelectImage(filteredImages[0]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage, filteredImages, handleSelectImage, handleCloseModal]);


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
          {stats.totalNsfw > 0 && (
            <>
              <span className="gallery-meta-dot">·</span>
              <span style={{ color: filterNsfwRating !== 'sfw' ? '#fca5a5' : '#71717a' }}>
                🔞 {stats.totalNsfw} 18+ ({filterNsfwRating === 'sfw' ? 'disembunyikan' : filterNsfwRating === 'all' ? 'ditampilkan' : 'hanya 18+'})
              </span>
            </>
          )}
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
          <div className="gallery-search-wrap" ref={searchWrapRef}>
            <span className="gallery-search-icon">
              <Icons.Search />
            </span>

            {selectedTag && (
              <span className="gallery-search-active-pill" style={{ marginLeft: "28px" }}>
                <span>#{selectedTag}</span>
                <button
                  type="button"
                  onClick={() => setSelectedTag(null)}
                  title="Remove tag filter"
                >
                  ✕
                </button>
              </span>
            )}

            <input
              type="text"
              className="gallery-search-input"
              style={selectedTag ? { paddingLeft: "8px" } : undefined}
              placeholder={selectedTag ? "Add more keywords (e.g. solo, blonde)..." : "Search tags (#kitsune), prompt, checkpoint, LoRA..."}
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchFocused(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsSearchFocused(false);
                }
              }}
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

            {/* Pixiv-style Tag Autocomplete Menu */}
            {isSearchFocused && tagSuggestions.length > 0 && (
              <div className="gallery-search-suggest-menu">
                <div className="gallery-search-suggest-header">
                  <span>Pixiv Tag Suggestions</span>
                  <span style={{ fontSize: '9px', opacity: 0.7 }}>Click tag to filter</span>
                </div>
                {tagSuggestions.map((tag) => (
                  <button
                    key={tag.name}
                    type="button"
                    className="gallery-search-suggest-item"
                    onClick={() => handleSelectTagSuggestion(tag.name)}
                  >
                    <span className="suggest-tag-name">
                      <span className="suggest-hash">#</span>
                      <span>{tag.name}</span>
                    </span>
                    <span className="suggest-count">{tag.count} works</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Utility: View Mode & Grid Density */}
          <div className="gallery-utilities">
            <div className="gallery-segment-group">
              <button
                type="button"
                className={`gallery-icon-btn ${layoutMode === 'grid' ? 'active' : ''}`}
                onClick={() => handleSetLayoutMode('grid')}
                title="Grid layout (Standard equal cards)"
              >
                <Icons.Grid />
                <span>Grid</span>
              </button>
              <button
                type="button"
                className={`gallery-icon-btn ${layoutMode === 'masonry' ? 'active' : ''}`}
                onClick={() => handleSetLayoutMode('masonry')}
                title="Masonry layout (Waterfall natural heights)"
              >
                <Icons.Masonry />
                <span>Masonry</span>
              </button>
              <button
                type="button"
                className={`gallery-icon-btn ${layoutMode === 'list' ? 'active' : ''}`}
                onClick={() => handleSetLayoutMode('list')}
                title="List layout (Detailed view for mobile & compact screens)"
              >
                <Icons.List />
                <span>List</span>
              </button>
            </div>

            {layoutMode !== 'list' && (
              <div className="gallery-segment-group">
                <button
                  type="button"
                  className={`gallery-icon-btn ${density === 'sm' ? 'active' : ''}`}
                  onClick={() => setDensity('sm')}
                  title="Compact density"
                >
                  S
                </button>
                <button
                  type="button"
                  className={`gallery-icon-btn ${density === 'md' ? 'active' : ''}`}
                  onClick={() => setDensity('md')}
                  title="Normal density"
                >
                  M
                </button>
                <button
                  type="button"
                  className={`gallery-icon-btn ${density === 'lg' ? 'active' : ''}`}
                  onClick={() => setDensity('lg')}
                  title="Spacious density"
                >
                  L
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ============ Filter Bar: Primary quick filters ============ */}
        <div className="gf-bar">
          <div className="gf-bar-group">
            <label className={`gf-field ${sortBy !== 'newest' ? 'is-active' : ''}`}>
              <span className="gf-field-label">Urutkan</span>
              <select
                id="gallery-sort-select"
                className="gf-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Upload Terbaru</option>
                <option value="oldest">Upload Terlama</option>
                <option value="fav_first">Favorit Teratas</option>
                <option value="steps_desc">Steps Tertinggi</option>
                <option value="steps_asc">Steps Terendah</option>
                <option value="res_desc">Resolusi Tertinggi</option>
                <option value="model_asc">Model A–Z</option>
                <option value="model_desc">Model Z–A</option>
              </select>
            </label>

            <label className={`gf-field ${filterNsfwRating === 'nsfw' ? 'is-nsfw' : filterNsfwRating === 'all' ? 'is-active' : ''}`}>
              <span className="gf-field-label">Rating</span>
              <select
                id="gallery-rating-select"
                className="gf-select"
                value={filterNsfwRating}
                onChange={(e) => handleNsfwRatingChange(e.target.value as 'sfw' | 'all' | 'nsfw')}
              >
                <option value="sfw">SFW Saja</option>
                <option value="all">Semua (SFW + 18+)</option>
                <option value="nsfw">18+ Saja</option>
              </select>
            </label>

            <label className={`gf-field ${filterFavorite !== 'all' ? 'is-fav' : ''}`}>
              <span className="gf-field-label">Favorit</span>
              <select
                id="gallery-favorite-select"
                className="gf-select"
                value={filterFavorite}
                onChange={(e) => setFilterFavorite(e.target.value as 'all' | 'fav_only' | 'non_fav')}
              >
                <option value="all">Semua Karya</option>
                <option value="fav_only">Favorit Saya ({favoriteImages.length})</option>
                <option value="non_fav">Belum Difavoritkan</option>
              </select>
            </label>
          </div>

          <div className="gf-bar-actions">
            <button
              id="gallery-advanced-toggle"
              type="button"
              className={`gf-toggle-btn ${showAdvancedFilters ? 'open' : ''} ${advancedActiveCount > 0 ? 'has-active' : ''}`}
              onClick={() => setShowAdvancedFilters((v) => !v)}
              aria-expanded={showAdvancedFilters}
              aria-controls="gallery-advanced-panel"
            >
              <Icons.Sliders />
              <span>Filter Lanjutan</span>
              {advancedActiveCount > 0 && <span className="gf-count">{advancedActiveCount}</span>}
              <Icons.ChevronDown />
            </button>

            {hasActiveFilters && (
              <button
                id="gallery-reset-filters"
                type="button"
                className="gf-reset-btn"
                onClick={resetFilters}
                title="Reset semua filter ke default"
              >
                <Icons.RotateCcw />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* ============ Advanced Filter Panel (collapsible grid) ============ */}
        {showAdvancedFilters && (
          <div id="gallery-advanced-panel" className="gf-panel">
            <label className={`gf-panel-field ${filterModelId !== 'all' ? 'is-active' : ''}`}>
              <span className="gf-panel-label">Checkpoint</span>
              <select
                id="gallery-checkpoint-select"
                className="gf-select"
                value={filterModelId}
                onChange={(e) => setFilterModelId(e.target.value)}
              >
                <option value="all">Semua</option>
                <option value="standalone">Standalone (Custom)</option>
                {models.map((m) => (
                  <option key={m.id} value={String(m.id)}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={`gf-panel-field ${filterBaseModel !== 'all' ? 'is-active' : ''}`}>
              <span className="gf-panel-label">Base Model</span>
              <select
                id="gallery-base-select"
                className="gf-select"
                value={filterBaseModel}
                onChange={(e) => setFilterBaseModel(e.target.value)}
              >
                <option value="all">Semua</option>
                {availableBaseModels.map((bm) => (
                  <option key={bm} value={bm}>
                    {bm}
                  </option>
                ))}
              </select>
            </label>

            <label className={`gf-panel-field ${filterResource !== 'all' ? 'is-active' : ''}`}>
              <span className="gf-panel-label">Resource</span>
              <select
                id="gallery-resource-select"
                className="gf-select"
                value={filterResource}
                onChange={(e) => setFilterResource(e.target.value)}
              >
                <option value="all">Semua</option>
                <option value="has_lora">Dengan LoRA</option>
                <option value="no_lora">Tanpa LoRA</option>
                <option value="has_prompt">Memiliki Prompt</option>
                <option value="has_params">Parameter Lengkap</option>
              </select>
            </label>

            <label className={`gf-panel-field ${filterOrientation !== 'all' ? 'is-active' : ''}`}>
              <span className="gf-panel-label">Rasio</span>
              <select
                id="gallery-orientation-select"
                className="gf-select"
                value={filterOrientation}
                onChange={(e) => setFilterOrientation(e.target.value)}
              >
                <option value="all">Semua</option>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
                <option value="square">Square 1:1</option>
              </select>
            </label>

            <label className={`gf-panel-field ${filterResolution !== 'all' ? 'is-active' : ''}`}>
              <span className="gf-panel-label">Resolusi</span>
              <select
                id="gallery-resolution-select"
                className="gf-select"
                value={filterResolution}
                onChange={(e) => setFilterResolution(e.target.value)}
              >
                <option value="all">Semua</option>
                <option value="sd">SD (≤ 1 MP)</option>
                <option value="hd">HD (1–2 MP)</option>
                <option value="uhd">UHD (&gt; 2 MP)</option>
              </select>
            </label>

            <label className={`gf-panel-field ${filterSampler !== 'all' ? 'is-active' : ''}`}>
              <span className="gf-panel-label">Sampler</span>
              <select
                id="gallery-sampler-select"
                className="gf-select"
                value={filterSampler}
                onChange={(e) => setFilterSampler(e.target.value)}
                disabled={availableSamplers.length === 0}
              >
                <option value="all">Semua</option>
                {availableSamplers.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {/* ============ Active advanced-filter chips ============ */}
        {advancedChips.length > 0 && (
          <div className="gf-chips">
            <span className="gf-chips-label">Aktif</span>
            {advancedChips.map((chip) => (
              <span key={chip.key} className="gf-chip">
                <span className="gf-chip-key">{chip.label}:</span>
                <span className="gf-chip-val">{chip.value}</span>
                <button
                  type="button"
                  onClick={chip.onClear}
                  title={`Hapus filter ${chip.label}`}
                  aria-label={`Hapus filter ${chip.label}`}
                >
                  <Icons.Clear />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Pixiv-style Popular Tags Ribbon */}
        {allTags.length > 0 && (
          <div className="gallery-tags-ribbon" style={{ borderTop: "1px solid var(--g-border-subtle)", paddingTop: "10px", marginTop: "4px" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--g-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "4px", paddingRight: "4px" }}>
              <span style={{ color: "#818CF8", fontWeight: 700 }}>#</span> Tags:
            </span>
            <button
              type="button"
              className={`gallery-tag-pill ${!selectedTag ? 'active' : ''}`}
              onClick={() => setSelectedTag(null)}
            >
              All
            </button>
            {allTags.slice(0, 20).map(({ name, count }) => {
              const isActive = selectedTag?.toLowerCase() === name.toLowerCase();
              return (
                <button
                  key={name}
                  type="button"
                  className={`gallery-tag-pill ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedTag(isActive ? null : name)}
                  title={`Filter by #${name} (${count} generations)`}
                >
                  <span className="tag-hash">#</span>
                  <span>{name}</span>
                  <span className="tag-count">({count})</span>
                </button>
              );
            })}
            {selectedTag && (
              <button
                type="button"
                onClick={() => setSelectedTag(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#EF4444",
                  fontSize: "11px",
                  cursor: "pointer",
                  padding: "2px 8px",
                  whiteSpace: "nowrap",
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                Clear Tag ✕
              </button>
            )}
          </div>
        )}
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
          Gallery Items: Grid, Masonry Waterfall, or List View
          =================================================================== */}
      {!loading && !error && filteredImages.length > 0 && (
        <div ref={galleryContainerRef} className="gallery-display-wrapper">
          {layoutMode === 'grid' && (
            <div
              className={`gallery-grid-view density-${density}`}
              style={{
                gridTemplateColumns: `repeat(${galleryColumns}, minmax(0, 1fr))`,
              }}
            >
              {filteredImages.map((img) => renderGalleryCard(img, false))}
            </div>
          )}

          {layoutMode === 'masonry' && (
            <div className={`gallery-masonry-view density-${density}`}>
              {masonryColumns.map((colImages, cIdx) => (
                <div key={cIdx} className="gallery-masonry-column">
                  {colImages.map((img) => renderGalleryCard(img, true))}
                </div>
              ))}
            </div>
          )}

          {layoutMode === 'list' && (
            <div className={`gallery-list-view density-${density}`}>
              {filteredImages.map((img) => renderListCard(img))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================
          Technical Inspector Lightbox Modal
          =================================================================== */}
      {selectedImage && (
        <div
          className="gallery-modal-overlay"
          onClick={handleCloseModal}
        >
          <div className="gallery-modal-frame" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              className="gallery-modal-close-btn"
              onClick={handleCloseModal}
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
                    handleSelectImage(filteredImages[prevIdx]);
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
                    handleSelectImage(filteredImages[nextIdx]);
                  }}
                  title="Next generation (→)"
                >
                  <Icons.ChevronRight />
                </button>
              )}

              {/* Main Image */}
              <img
                src={resolveImageUrl(selectedImage.image_url)}
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
                  type="button"
                  className="modal-tool-link"
                  onClick={() => setIsZoomed(!isZoomed)}
                >
                  <span>{isZoomed ? 'Fit' : 'Zoom'}</span>
                </button>

                {/* Share Deep Link */}
                <button
                  type="button"
                  className="modal-tool-link"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/gallery?image=${selectedImage.id}`;
                    navigator.clipboard.writeText(shareUrl).then(() => {
                      triggerToast('Link gambar disalin ke clipboard!');
                    });
                  }}
                  title="Salin link langsung ke gambar ini (Deep Link)"
                >
                  <Icons.ExternalLink />
                  <span>Share Link</span>
                </button>

                {/* Favorite Button */}
                <button
                  type="button"
                  className={`modal-tool-link ${isImageFav(selectedImage.id) ? 'favorited' : ''}`}
                  onClick={() => {
                    const isFav = toggleImage(selectedImage.id);
                    triggerToast(isFav ? 'Ditambahkan ke Favorit!' : 'Dihapus dari Favorit!');
                  }}
                  title={isImageFav(selectedImage.id) ? 'Hapus dari Favorit' : 'Simpan ke Favorit'}
                  style={{ color: isImageFav(selectedImage.id) ? '#f59e0b' : undefined }}
                >
                  <Icons.Star filled={isImageFav(selectedImage.id)} />
                  <span>{isImageFav(selectedImage.id) ? 'Favorit' : 'Simpan'}</span>
                </button>

                {/* Workflow Bridge: Send to Tools */}
                <WorkflowBridgeMenu
                  data={{
                    source: "gallery",
                    timestamp: Date.now(),
                    imageId: selectedImage.id,
                    imageUrl: resolveImageUrl(selectedImage.image_url),
                    title: selectedImage.caption || `Artwork #${selectedImage.id}`,
                    positivePrompt: selectedImage.positive_prompt || "",
                    negativePrompt: selectedImage.negative_prompt || "",
                    width: selectedImage.width || 1024,
                    height: selectedImage.height || 1024,
                    baseModel: selectedImage.model?.base_model || (selectedImage.model_name ? "CUSTOM" : "SDXL"),
                    modelName: selectedImage.model?.name || selectedImage.model_name || "",
                    sampler: selectedImage.sampler || "",
                    steps: selectedImage.steps,
                    cfgScale: selectedImage.cfg_scale,
                    seed: selectedImage.seed,
                    loras: (selectedImage.resources || [])
                      .filter((r) => r.type === "lora" || !r.type)
                      .map((r) => ({ name: r.name, weight: r.weight ?? 1.0 })),
                  }}
                  buttonLabel="Kirim ke Alat ▾"
                  variant="solid-blue"
                  direction="up"
                  align="center"
                  buttonStyle={{ height: '28px', padding: '0 10px', fontSize: '11.5px' }}
                  onActionComplete={() => setSelectedImage(null)}
                />

                {/* Inspect in Metadata Inspector */}
                <a
                  href={`/inspector?image_id=${selectedImage.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="modal-tool-link"
                  title="Buka seluruh node graph ComfyUI, chunks, dan parameter di Metadata Inspector"
                >
                  <Icons.Inspect />
                  <span>Inspect</span>
                </a>

                <a
                  href={resolveImageUrl(selectedImage.image_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="modal-tool-link"
                  title="Open full resolution in new tab"
                >
                  <Icons.ExternalLink />
                  <span>Raw</span>
                </a>

                <a
                  href={resolveImageUrl(selectedImage.image_url)}
                  download={`generation-${selectedImage.id}.png`}
                  className="modal-tool-link"
                  title="Save image to disk"
                >
                  <Icons.Download />
                  <span>Download</span>
                </a>
              </div>
            </div>

            {/* Right: Technical Metadata Inspector */}
            <div className="modal-spec-side">
              <div className="modal-spec-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h2 className="modal-spec-title" style={{ margin: 0 }}>{selectedImage.caption || `Artwork #${selectedImage.id}`}</h2>
                  {isNsfwImage(selectedImage) && (
                    <span style={{ background: '#451a1a', border: '1px solid #ef4444', color: '#fca5a5', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                      🔞 18+ NSFW
                    </span>
                  )}
                </div>
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
                        {selectedImage.model?.name || selectedImage.model_name || 'Checkpoint Model'}
                      </span>
                      <div className="spec-model-meta">
                        <span>{selectedImage.model?.base_model || (selectedImage.model_name ? 'CUSTOM' : 'SDXL')}</span>
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

                {/* Workflow Bridge Quick Actions Strip */}
                <div className="spec-group" style={{ background: '#18181b', border: '1px solid #27272a', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 3 21 3 21 9" />
                        <polyline points="9 21 3 21 3 15" />
                        <line x1="21" y1="3" x2="14" y2="10" />
                        <line x1="3" y1="21" x2="10" y2="14" />
                      </svg>
                      Workflow Bridge
                    </span>
                    <span style={{ fontSize: '11px', color: '#a1a1aa' }}>Bawa data ke alat lain</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const bridgeData: WorkflowBridgeData = {
                          source: 'gallery',
                          timestamp: Date.now(),
                          imageId: selectedImage.id,
                          imageUrl: resolveImageUrl(selectedImage.image_url),
                          title: selectedImage.caption || `Artwork #${selectedImage.id}`,
                          positivePrompt: selectedImage.positive_prompt || '',
                          negativePrompt: selectedImage.negative_prompt || '',
                          width: selectedImage.width || 1024,
                          height: selectedImage.height || 1024,
                          baseModel: selectedImage.model?.base_model || (selectedImage.model_name ? 'CUSTOM' : 'SDXL'),
                          modelName: selectedImage.model?.name || selectedImage.model_name || '',
                          sampler: selectedImage.sampler || '',
                          steps: selectedImage.steps,
                          cfgScale: selectedImage.cfg_scale,
                          seed: selectedImage.seed,
                          loras: (selectedImage.resources || [])
                            .filter((r) => r.type === 'lora' || !r.type)
                            .map((r) => ({ name: r.name, weight: r.weight ?? 1.0 })),
                        };
                        setSelectedImage(null);
                        bridgeToPromptLab(navigate, bridgeData);
                      }}
                      style={{
                        background: '#121215',
                        border: '1px solid #27272a',
                        color: '#f4f4f5',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                      title="Kirim prompt positif & negatif ke Prompt Lab"
                    >
                      <span>🚀 Prompt Lab</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const bridgeData: WorkflowBridgeData = {
                          source: 'gallery',
                          timestamp: Date.now(),
                          imageId: selectedImage.id,
                          width: selectedImage.width || 1024,
                          height: selectedImage.height || 1024,
                          baseModel: selectedImage.model?.base_model || (selectedImage.model_name ? 'CUSTOM' : 'SDXL'),
                        };
                        setSelectedImage(null);
                        bridgeToCalculator(navigate, bridgeData);
                      }}
                      style={{
                        background: '#121215',
                        border: '1px solid #27272a',
                        color: '#f4f4f5',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                      title="Bawa dimensi ke Resolution Calculator"
                    >
                      <span>📐 Calculator ({selectedImage.width || 1024}×{selectedImage.height || 1024})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const bridgeData: WorkflowBridgeData = {
                          source: 'gallery',
                          timestamp: Date.now(),
                          imageId: selectedImage.id,
                          title: selectedImage.caption || `Artwork #${selectedImage.id}`,
                          positivePrompt: selectedImage.positive_prompt || '',
                          baseModel: selectedImage.model?.base_model || (selectedImage.model_name ? 'CUSTOM' : 'SDXL'),
                          loras: (selectedImage.resources || [])
                            .filter((r) => r.type === 'lora' || !r.type)
                            .map((r) => ({ name: r.name, weight: r.weight ?? 1.0 })),
                        };
                        setSelectedImage(null);
                        bridgeToLoraStack(navigate, bridgeData);
                      }}
                      style={{
                        background: '#121215',
                        border: '1px solid #27272a',
                        color: '#f4f4f5',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                      title="Bawa LoRA yang digunakan ke LoRA Stack Studio"
                    >
                      <span>🧩 LoRA Stack</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const bridgeData: WorkflowBridgeData = {
                          source: 'gallery',
                          timestamp: Date.now(),
                          imageId: selectedImage.id,
                          negativePrompt: selectedImage.negative_prompt || '',
                          baseModel: selectedImage.model?.base_model || (selectedImage.model_name ? 'CUSTOM' : 'SDXL'),
                        };
                        setSelectedImage(null);
                        bridgeToNegativeVault(navigate, bridgeData);
                      }}
                      style={{
                        background: '#121215',
                        border: '1px solid #27272a',
                        color: '#f4f4f5',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                      title="Analisis prompt negatif di Negative Vault"
                    >
                      <span>🛡️ Negative Vault</span>
                    </button>
                  </div>
                </div>

                {/* Pixiv Tags */}
                {selectedImage.tags && selectedImage.tags.length > 0 && (
                  <div className="spec-group">
                    <div className="spec-group-header">
                      <span className="spec-group-title">Tags</span>
                      <span style={{ fontSize: '11px', color: 'var(--g-text-muted)', fontFamily: 'ui-monospace, monospace' }}>
                        {selectedImage.tags.length} tagged
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selectedImage.tags.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className="gallery-tag-pill"
                          onClick={() => {
                            setSelectedTag(t.name);
                            setSelectedImage(null);
                          }}
                          title={`Filter gallery by #${t.name}`}
                        >
                          <span className="tag-hash">#</span>
                          <span>{t.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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
                    {selectedImage.positive_prompt || (
                      <span style={{ color: 'var(--g-text-muted)' }}>Tidak ada prompt</span>
                    )}
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
                            {copiedKey === 'seed' ? <Icons.Check /> : 'Copy'}
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

                {/* Multi-Format Export Actions */}
                <div className="modal-spec-footer">
                  <button
                    className="modal-export-btn"
                    onClick={() => {
                      const fullText = buildA1111ParametersText({
                        positive_prompt: selectedImage.positive_prompt,
                        negative_prompt: selectedImage.negative_prompt,
                        steps: selectedImage.steps,
                        sampler: selectedImage.sampler,
                        scheduler: selectedImage.scheduler,
                        cfg_scale: selectedImage.cfg_scale,
                        seed: selectedImage.seed,
                        width: selectedImage.width,
                        height: selectedImage.height,
                        model_name: selectedImage.model?.name || selectedImage.model_name,
                      });
                      copyToClipboard(fullText, 'webui-params', 'A1111 / WebUI Parameters');
                    }}
                  >
                    <Icons.Copy />
                    {copiedKey === 'webui-params' ? 'A1111 Parameters Copied to Clipboard!' : 'Copy as A1111 / WebUI Parameters'}
                  </button>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                    <button
                      className="modal-export-btn"
                      onClick={() => {
                        const jsonStr = buildComfyUIWorkflowJSON({
                          positive_prompt: selectedImage.positive_prompt,
                          negative_prompt: selectedImage.negative_prompt,
                          steps: selectedImage.steps,
                          sampler: selectedImage.sampler,
                          scheduler: selectedImage.scheduler,
                          cfg_scale: selectedImage.cfg_scale,
                          seed: selectedImage.seed,
                          width: selectedImage.width,
                          height: selectedImage.height,
                          model_name: selectedImage.model?.name || selectedImage.model_name,
                        });
                        downloadTextAsFile(jsonStr, `comfyui_generation_${selectedImage.id}.json`);
                        triggerToast('Workflow ComfyUI (.json) berhasil diunduh!');
                      }}
                    >
                      <Icons.Download />
                      <span>ComfyUI (.json)</span>
                    </button>

                    <button
                      className="modal-export-btn"
                      onClick={() => {
                        const payload = buildWebUIApiPayload({
                          positive_prompt: selectedImage.positive_prompt,
                          negative_prompt: selectedImage.negative_prompt,
                          steps: selectedImage.steps,
                          sampler: selectedImage.sampler,
                          cfg_scale: selectedImage.cfg_scale,
                          seed: selectedImage.seed,
                          width: selectedImage.width,
                          height: selectedImage.height,
                        });
                        copyToClipboard(payload, 'api-payload', 'API Payload JSON');
                      }}
                    >
                      <Icons.Copy />
                      {copiedKey === 'api-payload' ? 'Copied JSON!' : 'Copy API Payload'}
                    </button>
                  </div>
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
