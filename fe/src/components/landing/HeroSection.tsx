import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, resolveImageUrl } from '../../api/client';
import type { Model, ModelsResponse } from '../../api/models';
import { CyberDustCanvas } from './CyberDustCanvas';
import { CyberMenuGlitchOverlay } from './CyberMenuGlitchOverlay';

interface HeroSectionProps {
  onDiscoverClick: () => void;
}

interface ChassisModel {
  id: string;
  unitCode: string;
  name: string;
  slug: string;
  vramBadge: string;
  vramColor: 'amber' | 'cyan' | 'green' | 'yellow';
  sha256: string;
  loraTag: string;
  tensorBadge: string;
  prediction: string;
  nativeRes: string;
  samplerOrGuidanceKey: string;
  samplerOrGuidanceVal: string;
  thumbnailUrl: string;
  imagePosition?: string;
}

const CHASSIS_FALLBACK_UNITS: ChassisModel[] = [
  {
    id: 'wai-illustrious',
    unitCode: 'UNIT // 01-ILLUSTRIOUS',
    name: 'WAI-ILLUSTRIOUS-SDXL',
    slug: 'wai-illustrious-sdxl',
    vramBadge: '6.8 GB FP16',
    vramColor: 'cyan',
    sha256: 'SHA256 // CE58B29F',
    loraTag: '<lora:anime_core:0.85>',
    tensorBadge: '3.1B TENSORS',
    prediction: 'EPSILON (V0.1)',
    nativeRes: '832 × 1216 PX',
    samplerOrGuidanceKey: 'SAMPLER LOCK',
    samplerOrGuidanceVal: 'EULER A (28S)',
    thumbnailUrl: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/ce58b29f-26ca-461b-a184-cf54fb869e26/width=600/ce58b29f-26ca-461b-a184-cf54fb869e26.jpeg',
    imagePosition: 'center 25%',
  },
  {
    id: 'noobai-vpred',
    unitCode: 'UNIT // 02-NOOBAI',
    name: 'NOOBAI-XL V-PRED',
    slug: 'wai-shuffle-noob',
    vramBadge: '7.2 GB FP16',
    vramColor: 'green',
    sha256: 'SHA256 // 6942C4B2',
    loraTag: '<lora:vpred_balance:0.75>',
    tensorBadge: '3.5B TENSORS',
    prediction: 'V-PREDICTION',
    nativeRes: '1024 × 1360 PX',
    samplerOrGuidanceKey: 'SAMPLER LOCK',
    samplerOrGuidanceVal: 'EULER A (30S)',
    thumbnailUrl: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/6942c4b2-fcd4-4135-ab44-a617e26235d3/width=600/6942c4b2-fcd4-4135-ab44-a617e26235d3.jpeg',
    imagePosition: 'center 25%',
  },
  {
    id: 'raehoshi-illust',
    unitCode: 'UNIT // 03-RAEHOSHI',
    name: 'RAEHOSHI ILLUST XL V2',
    slug: 'raehoshi-illust-xl',
    vramBadge: '6.0 GB FP16',
    vramColor: 'yellow',
    sha256: 'SHA256 // E621BEF5',
    loraTag: '<lora:clean_lineart:0.80>',
    tensorBadge: '2.5B TENSORS',
    prediction: 'EPSILON (V0.1)',
    nativeRes: '832 × 1216 PX',
    samplerOrGuidanceKey: 'SAMPLER LOCK',
    samplerOrGuidanceVal: 'EULER A (28S)',
    thumbnailUrl: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/e621bef5-8aa3-49b8-9abe-a61aca533159/width=600/e621bef5-8aa3-49b8-9abe-a61aca533159.jpeg',
    imagePosition: 'center 25%',
  },
];

/**
 * Maps a real database model (whether imported from Civitai or user-created blob/storage)
 * into the high-octane mechanical Chassis deck format.
 */
function mapModelToChassis(m: Model, index: number): ChassisModel {
  const vramColors: ('cyan' | 'green' | 'yellow')[] = ['cyan', 'green', 'yellow'];
  const color = vramColors[index % vramColors.length];

  // Pick thumbnail from thumbnail_url or images array (handles backend blob storage & Civitai)
  const rawImg =
    m.thumbnail_url ||
    (m.images && m.images.length > 0 ? m.images[0].image_path || m.images[0].image_url : '') ||
    '';

  let resolvedImg = resolveImageUrl(rawImg);
  if (resolvedImg && resolvedImg.includes('image.civitai.com')) {
    resolvedImg = resolvedImg.replace(/\/width=\d+\//, '/width=600/');
  }
  if (!resolvedImg) {
    resolvedImg = CHASSIS_FALLBACK_UNITS[index % CHASSIS_FALLBACK_UNITS.length].thumbnailUrl;
  }

  // Extract version recommended settings if present
  const version = m.versions && m.versions.length > 0 ? m.versions[0] : null;
  const rec = (version?.recommended_settings as Record<string, unknown>) || {};

  // Compute realistic hexadecimal hash: extract from image UUID if present, or deterministic 8-digit hex
  let hashStr = '';
  const uuidMatch = rawImg.match(/([a-f0-9]{8})-[a-f0-9]{4}/i);
  if (uuidMatch && uuidMatch[1]) {
    hashStr = uuidMatch[1].toUpperCase();
  } else {
    let h = 0x811c9dc5;
    const str = `${m.id}-${m.slug || m.name || index}`;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    hashStr = (h >>> 0).toString(16).padStart(8, '0').slice(0, 8).toUpperCase();
  }
  const sha256 = `SHA256 // ${hashStr}`;

  // Formulate LoRA or trigger tag (filtering out generic tags like 1girl, solo, masterpiece)
  let loraTag = `<lora:${m.slug.replace(/-(xl|sdxl).*/i, '')}_core:0.85>`;
  if (m.type === 'lora') {
    loraTag = `<lora:${m.slug}:0.85>`;
  } else if (m.trigger_words && m.trigger_words.length > 0) {
    const specificTw = m.trigger_words.find((tw) => {
      const w = tw.trigger_word?.trim().toLowerCase() || '';
      return w && !['1girl', 'solo', 'masterpiece', 'best quality', 'highres', 'anime'].includes(w);
    });
    if (specificTw?.trigger_word) {
      const tw = specificTw.trigger_word.trim();
      loraTag = tw.startsWith('<') ? tw : `<${tw}>`;
    }
  } else if (m.tags && m.tags.length > 0) {
    const t = m.tags.find((tag) => !['anime', 'checkpoint', 'illustration'].includes(tag.slug.toLowerCase()));
    if (t) {
      loraTag = `<lora:${t.slug}:0.80>`;
    }
  }

  // Prediction formulation
  const baseModelLower = (m.base_model || '').toLowerCase();
  const nameLower = m.name.toLowerCase();
  const isVpred = baseModelLower.includes('noob') || nameLower.includes('v-pred') || nameLower.includes('vpred');
  const isFlux = baseModelLower.includes('flux');
  const prediction = isFlux
    ? 'FLOW MATCHING'
    : isVpred
    ? 'V-PREDICTION'
    : baseModelLower.includes('sdxl')
    ? 'SDXL EPSILON'
    : 'EPSILON (V0.1)';

  // Native resolution
  const width = typeof rec.width === 'number' ? rec.width : isVpred ? 1024 : 832;
  const height = typeof rec.height === 'number' ? rec.height : isVpred ? 1360 : 1216;
  const nativeRes = `${width} × ${height} PX`;

  // Sampler settings
  const samplerName = rec.sampler ? String(rec.sampler).toUpperCase() : 'EULER A';
  const steps = rec.steps ? String(rec.steps) : isVpred ? '30S' : '28S';
  const samplerOrGuidanceKey = isFlux ? 'GUIDANCE DISTILL' : 'SAMPLER LOCK';
  const samplerOrGuidanceVal = isFlux ? 'CFG 1.0 / 3.5' : `${samplerName} (${steps.replace(/[^0-9]/g, '')}S)`;

  // VRAM badge
  const rawVram = m.vram_recommended || m.vram_min || (isVpred ? '7.2 GB' : '6.8 GB');
  const vramBadge = rawVram.toUpperCase().includes('FP')
    ? rawVram
    : `${rawVram.includes('GB') ? rawVram : `${rawVram} GB`} FP16`;

  // Tensor badge
  const tensorBadge = m.tensor_size ? `${m.tensor_size} TENSORS` : isFlux ? '12.0B MMDiT' : '3.1B TENSORS';

  // Unit Code
  const unitSuffix = (m.base_model || 'MODEL').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
  const unitCode = `UNIT // 0${index + 1}-${unitSuffix}`;

  return {
    id: `db-${m.id || m.slug}`,
    unitCode,
    name: m.name.toUpperCase(),
    slug: m.slug,
    vramBadge,
    vramColor: color,
    sha256,
    loraTag,
    tensorBadge,
    prediction,
    nativeRes,
    samplerOrGuidanceKey,
    samplerOrGuidanceVal,
    thumbnailUrl: resolvedImg,
    imagePosition: 'center 20%',
  };
}

const TYPEWRITER_PHRASES = [
  'SOVEREIGNTY.',
  'GENERATIVE AI.',
  'SAFE-TENSORS.',
  'ILLUSTRIOUS-XL.',
  'NOOBAI V-PRED.',
  'WORKSTATION.',
];

// Katakana runs & cyber corrupt glyphs matching the reference image (CYBEカASEネノオソC)
const KATAKANA_RUNS = [
  ['ネ', 'ノ', 'オ', 'ソ'],
  ['カ', 'セ', 'ク', 'ソ'],
  ['テ', 'ノ', 'ツ', 'ク'],
  ['シ', 'ス', 'テ', 'ﾑ'],
  ['ハ', 'ッ', 'シ', 'ュ'],
  ['ネ', 'ッ', 'ト', 'ﾜ'],
];

const KATAKANA_SINGLES = ['カ', 'Δ', '§', 'ネ', 'ノ', 'オ', 'ソ', 'ア', 'ク', 'ツ'];

function generateCyberCorruptText(text: string): string {
  if (text.length <= 4) return text;
  const chars = text.split('');

  // 1. Pick a Katakana run (3 to 4 characters long)
  const run = KATAKANA_RUNS[Math.floor(Math.random() * KATAKANA_RUNS.length)];

  // 2. Insert run in the middle or second half of the phrase
  const startIdx = Math.max(1, Math.floor(chars.length * 0.42));

  for (let i = 0; i < run.length; i++) {
    const target = startIdx + i;
    if (target < chars.length && chars[target] !== '.' && chars[target] !== ' ') {
      chars[target] = run[i];
    }
  }

  // 3. Place an isolated Katakana earlier (e.g. 'カ' in 'CYBEカASE')
  if (startIdx >= 3) {
    const earlyIdx = Math.floor(Math.random() * (startIdx - 1)) + 1;
    if (chars[earlyIdx] !== ' ' && chars[earlyIdx] !== '-') {
      chars[earlyIdx] = KATAKANA_SINGLES[Math.floor(Math.random() * KATAKANA_SINGLES.length)];
    }
  }

  return chars.join('');
}

function HeroTypewriter() {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [displayedText, setDisplayedText] = useState(TYPEWRITER_PHRASES[0]);
  const [corruptedDisplay, setCorruptedDisplay] = useState(TYPEWRITER_PHRASES[0]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fullText = TYPEWRITER_PHRASES[phraseIdx];
    let timer: ReturnType<typeof setTimeout>;

    if (!isDeleting) {
      if (displayedText.length < fullText.length) {
        timer = setTimeout(() => {
          const nextText = fullText.slice(0, displayedText.length + 1);
          setDisplayedText(nextText);
          setCorruptedDisplay(nextText);
        }, 85);
      } else {
        // Paused at full phrase: trigger Katakana corruption burst (~700ms)
        let glitchTimer: ReturnType<typeof setTimeout>;
        let scrambleInterval: ReturnType<typeof setInterval>;
        let restoreTimer: ReturnType<typeof setTimeout>;

        // At 550ms: start corruption with live Katakana scramble
        glitchTimer = setTimeout(() => {
          setCorruptedDisplay(generateCyberCorruptText(fullText));

          // Real-time Katakana glyph scramble every 80ms
          scrambleInterval = setInterval(() => {
            setCorruptedDisplay(generateCyberCorruptText(fullText));
          }, 80);

          // Restore after 680ms: clean snap-back to English
          restoreTimer = setTimeout(() => {
            clearInterval(scrambleInterval);
            setCorruptedDisplay(fullText);
          }, 680);
        }, 550);

        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 2800);

        return () => {
          clearTimeout(timer);
          clearTimeout(glitchTimer);
          clearInterval(scrambleInterval);
          clearTimeout(restoreTimer);
        };
      }
    } else {
      if (displayedText.length > 0) {
        timer = setTimeout(() => {
          const nextText = fullText.slice(0, displayedText.length - 1);
          setDisplayedText(nextText);
          setCorruptedDisplay(nextText);
        }, 45);
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
      <span
        className="mg-typewriter-text mg-cp-micro-glitch yellow"
        data-text={corruptedDisplay}
      >
        {corruptedDisplay}
      </span>
      <span className="mg-typewriter-cursor" aria-hidden="true" />
    </span>
  );
}

function CardCorruptedTitle({ text }: { text: string }) {
  const [displayText, setDisplayText] = useState(text);

  useEffect(() => {
    setDisplayText(text);

    let glitchInterval: ReturnType<typeof setInterval>;
    let restoreTimer: ReturnType<typeof setTimeout>;

    const cycleTimer = setInterval(() => {
      // 1. Initial corrupt glyph injection
      setDisplayText(generateCyberCorruptText(text));

      // 2. Rapid Katakana glyph scramble for 450ms
      glitchInterval = setInterval(() => {
        setDisplayText(generateCyberCorruptText(text));
      }, 75);

      // 3. Crisp snap-back to clean original
      restoreTimer = setTimeout(() => {
        clearInterval(glitchInterval);
        setDisplayText(text);
      }, 480);
    }, 4200);

    return () => {
      clearInterval(cycleTimer);
      clearInterval(glitchInterval);
      clearTimeout(restoreTimer);
    };
  }, [text]);

  return (
    <h3
      className="mg-mech-model-name-lg mg-card-title-corrupt"
      data-text={displayText}
    >
      {displayText}
    </h3>
  );
}

export function HeroSection({ onDiscoverClick }: HeroSectionProps) {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLElement | null>(null);

  // Dynamic Chassis Units: fetches real models from backend/blob/Civitai when active;
  // auto-falls back to hardcoded models when backend is offline.
  const [chassisUnits, setChassisUnits] = useState<ChassisModel[]>(CHASSIS_FALLBACK_UNITS);
  const [isLiveDatabase, setIsLiveDatabase] = useState<boolean>(false);

  // Default Unit: 00 (Unit 01)
  const [activeChassisIdx, setActiveChassisIdx] = useState<number>(0);
  const [isChassisPaused, setIsChassisPaused] = useState<boolean>(false);

  // Load models from backend API on mount
  useEffect(() => {
    let isMounted = true;
    apiFetch<ModelsResponse>('/models?limit=3')
      .then((res) => {
        if (!isMounted) return;
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const dynamicUnits = res.data.slice(0, 3).map((m, idx) => mapModelToChassis(m, idx));
          // If the user's database has fewer than 3 models, pad with fallback units
          if (dynamicUnits.length < 3) {
            const needed = 3 - dynamicUnits.length;
            const padded = [
              ...dynamicUnits,
              ...CHASSIS_FALLBACK_UNITS.slice(dynamicUnits.length, dynamicUnits.length + needed),
            ];
            setChassisUnits(padded);
          } else {
            setChassisUnits(dynamicUnits);
          }
          setIsLiveDatabase(true);
        } else {
          setChassisUnits(CHASSIS_FALLBACK_UNITS);
          setIsLiveDatabase(false);
        }
      })
      .catch(() => {
        // Backend offline / unreachable: auto fallback to hardcoded units
        if (isMounted) {
          setChassisUnits(CHASSIS_FALLBACK_UNITS);
          setIsLiveDatabase(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const [searchQuery, setSearchQuery] = useState('');

  // 120FPS Parallax & Mouse Tilt Engine refs
  const heroRigRef = useRef<HTMLDivElement | null>(null);
  const targetRotXRef = useRef<number>(0);
  const targetRotYRef = useRef<number>(0);
  const currRotXRef = useRef<number>(0);
  const currRotYRef = useRef<number>(0);
  const rawScrollPRef = useRef<number>(0);
  const scrollPRef = useRef<number>(0);

  // Auto-cycle chassis every 5 seconds (pausing on hover)
  useEffect(() => {
    if (isChassisPaused) return;
    const interval = setInterval(() => {
      setActiveChassisIdx((prev) => (prev + 1) % (chassisUnits.length || 1));
    }, 5000);
    return () => clearInterval(interval);
  }, [isChassisPaused, chassisUnits.length]);

  // 120FPS GPU Parallax & Tilt Lerp Loop (Zero React re-render during motion)
  useEffect(() => {
    let rafId: number;
    let isActive = true;

    const lerpLoop = () => {
      if (!isActive) return;

      // Pointer tilt spring interpolation
      currRotXRef.current += (targetRotXRef.current - currRotXRef.current) * 0.12;
      currRotYRef.current += (targetRotYRef.current - currRotYRef.current) * 0.12;

      // Scroll parallax interpolation
      scrollPRef.current += (rawScrollPRef.current - scrollPRef.current) * 0.14;

      const sp = scrollPRef.current;
      const rx = currRotXRef.current;
      const ry = currRotYRef.current;

      // Apply 3D Perspective Parallax to Hardware Deck Rig
      if (heroRigRef.current) {
        heroRigRef.current.style.transform = `perspective(1200px) translate3d(0px, ${(-sp * 45).toFixed(2)}px, ${(sp * 35).toFixed(2)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      }

      rafId = requestAnimationFrame(lerpLoop);
    };

    const handleScroll = () => {
      const hero = heroRef.current;
      if (!hero) return;
      const rect = hero.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -rect.top / Math.max(1, window.innerHeight)));
      rawScrollPRef.current = progress;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    rafId = requestAnimationFrame(lerpLoop);

    return () => {
      isActive = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Pointer Move Handler for Smooth 3D Tilt
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rig = heroRigRef.current;
    if (!rig) return;
    const rect = rig.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;

    targetRotXRef.current = (0.5 - ny) * 10;
    targetRotYRef.current = (nx - 0.5) * 12;
  };

  const handlePointerLeave = () => {
    setIsChassisPaused(false);
    targetRotXRef.current = 0;
    targetRotYRef.current = 0;
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/models?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/models');
    }
  };

  const activeChassis = chassisUnits[activeChassisIdx] || chassisUnits[0] || CHASSIS_FALLBACK_UNITS[0];

  return (
    <section className="mg-hero mg-hero-cyberpunk" id="hero" ref={heroRef}>
      {/* 1. Cyberpunk Workstation Backdrop Vector Artwork (Hero.svg) */}
      <div className="mg-hero-cyber-bg" aria-hidden="true" />

      {/* 2. Giant Hollow Watermark + Small Cyberpunk Japanese Glitch Telemetry (Safe Overhead Position) */}
      <div className="mg-hero-watermark-stage" aria-hidden="true">
        {/* Dual-Tier Cyberpunk Japanese Micro-Telemetry Cluster (Unobstructed by cards) */}
        <div className="mg-cp-telemetry-cluster">
          {/* Tier 1: Models Guide Platform & Neural Architecture */}
          <div className="mg-cp-micro-bar line-1">
            <span className="mg-cp-micro-badge-mg">MODELS GUIDE // モデルガイド</span>
            <span className="mg-cp-micro-divider" />
            <span
              className="mg-cp-micro-glitch cyan"
              data-text="人工知能画像生成 // NEURAL ARCHITECTURE DIRECTORY"
            >
              人工知能画像生成 // NEURAL ARCHITECTURE DIRECTORY
            </span>
            <span className="mg-cp-micro-status">[LOCAL.AI // ONLINE]</span>
          </div>

          {/* Tier 2: Checkpoint Archive & SafeTensors Telemetry */}
          <div className="mg-cp-micro-bar line-2">
            <span
              className="mg-cp-micro-glitch yellow"
              data-text="神経ネットワーク // CHECKPOINT ARCHIVE"
            >
              神経ネットワーク // CHECKPOINT ARCHIVE
            </span>
            <span className="mg-cp-micro-line" />
            <span
              className="mg-cp-micro-glitch"
              data-text="SAFETENSORS RUNTIME // 0.00 MS SOVEREIGNTY"
            >
              SAFETENSORS RUNTIME // 0.00 MS SOVEREIGNTY
            </span>
            <span className="mg-cp-micro-badge-cyan">自律実行</span>
          </div>
        </div>

        {/* Center: Giant Hollow-Outline Watermark (Matching Section 1 Aesthetic) */}
        <div className="mg-hero-watermark-wrap">
          <span className="mg-hero-watermark-text">
            AI GENERATIVE IMAGE //
          </span>
        </div>
      </div>

      {/* 3. Cyberpunk 2077 Main Menu & UI Glitch Overlay (CRT Scanlines & V-Sync Tears) */}
      <CyberMenuGlitchOverlay />

      {/* 4. Interactive Floating Cyber Spark / Particle Canvas */}
      <CyberDustCanvas />

      {/* Cyberpunk HUD Corner Brackets & Optical Crosshairs */}
      <div className="mg-cp-hud-corner top-left" aria-hidden="true">
        <span className="mg-cp-hud-bracket">&lceil;</span>
        <span className="mg-cp-hud-tag">TARGET // 01-SYS [NEURAL MATRIX]</span>
      </div>
      <div className="mg-cp-hud-corner top-right" aria-hidden="true">
        <span className="mg-cp-hud-tag">PORT 8080 // BUS 0.00ms</span>
        <span className="mg-cp-hud-bracket">&rceil;</span>
      </div>
      <div className="mg-cp-hud-corner bottom-left" aria-hidden="true">
        <span className="mg-cp-hud-bracket">&lfloor;</span>
        <span className="mg-cp-hud-tag">SAFETENSORS // 人工知能</span>
      </div>
      <div className="mg-cp-hud-corner bottom-right" aria-hidden="true">
        <span className="mg-cp-hud-tag">GPU_TELEMETRY: ONLINE</span>
        <span className="mg-cp-hud-bracket">&rfloor;</span>
      </div>

      {/* Hero Content: 2-Column Mechanical Workstation Layout */}
      <div className="mg-hero-container">
        <div className="mg-hero-split-grid" style={{ alignItems: 'center' }}>
          {/* =================================================================
              LEFT COLUMN: Telemetry Bar, Punchy Headline, Search & 3-Col Specs
              ================================================================= */}
          <div className="mg-hero-editorial-col">
            {/* Category HUD Telemetry Line (No box/card container) */}
            <div className="mg-hero-cyber-pill">
              <span className="mg-cyber-pill-glitch">
                [ ARCHITECTURE // DIRECTORY ]
              </span>
              <span className="mg-cp-pill-kana">
                モデルガイド // 人工知能
              </span>
              <span className="mg-cyber-pill-divider" />
              <span className="mg-cyber-pill-status">● LOCAL GPU SOVEREIGNTY</span>
            </div>

            {/* Top Telemetry Bar SYS.01 (Clean HUD telemetry line, no card box) */}
            <div className="mg-hero-telemetry-bar">
              <div className="mg-hero-telemetry-sys">
                <div className="mg-hero-signal-bars" aria-hidden="true">
                  <span className="sig-bar b1" />
                  <span className="sig-bar b2" />
                  <span className="sig-bar b3" />
                  <span className="sig-bar b4" />
                  <span className="sig-bar b5" />
                </div>
                <span className="mg-telemetry-pulse" />
                <span className="mg-telemetry-title">
                  SYS.01 // GENERATIVE AI WORKSTATION
                </span>
              </div>
              <div className="mg-hero-telemetry-pills" role="status" aria-label="Status Runtime Workstation">
                <span className="mg-hero-status-pill cyan">TENSOR CORE V4.2</span>
                <span className="mg-hero-status-pill slate">LOCAL RUNTIME</span>
                <span className="mg-hero-status-pill green">0.00 MS BUS</span>
                <span className="mg-hero-status-pill yellow">14 RIGS</span>
              </div>
            </div>

            {/* Giant Punchy Headline with Typewriter: LOCAL MODEL + Typewriter */}
            <div className="mg-hero-headline-wrap">
              <h1 className="mg-hero-title-mech">
                <span className="mg-hero-title-white">
                  LOCAL MODEL
                </span>
                <span className="mg-hero-title-yellow">
                  <HeroTypewriter />
                </span>
              </h1>
            </div>

            {/* Subtitle / Description Paragraph */}
            <p className="mg-hero-lead-mech">
              Direktori kurasi arsitektur <strong className="mg-lead-hl">Illustrious XL, NoobAI V-Pred, SDXL, dan Flux.1</strong> yang terintegrasi dengan <strong className="mg-lead-cyan">14 perkakas workstation lokal</strong>—mulai dari pembacaan biner SafeTensors, kalkulasi interferensi LoRA, hingga jembatan node ComfyUI.
            </p>

            {/* Fast Inline Search Bar with ACCESS Button */}
            <form className="mg-mech-search-bar" onSubmit={handleSearchSubmit}>
              <div className="mg-mech-search-wrap mg-chamfer-sm">
                <div className="mg-search-prefix-group" aria-hidden="true">
                  <svg className="mg-mech-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <span className="mg-search-prefix-tag">QUERY //</span>
                </div>
                <input
                  type="text"
                  className="mg-mech-search-input"
                  placeholder="QUERY CHECKPOINT // TRIGGER WORD // SAFETENSORS HASH..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Cari checkpoint dan model SafeTensors"
                />
                <span className="mg-search-kbd-tag" aria-hidden="true">[ ↵ EXEC ]</span>
                <button
                  type="submit"
                  className="mg-mech-access-btn mg-chamfer-sm"
                >
                  ACCESS
                </button>
              </div>
            </form>

            {/* 3-Column Specifications (Open telemetry grid without card box) */}
            <div className="mg-mech-specs-panel">
              <div className="mg-mech-spec-item">
                <div className="mg-mech-spec-header">
                  <div className="mg-spec-label-group">
                    <span className="mg-mech-spec-label">BASE CORES</span>
                    <span className="mg-mech-spec-jp">基底コア</span>
                  </div>
                  <span className="mg-mech-spec-subtag">5 ARCH</span>
                </div>
                <span className="mg-mech-spec-value white">05 CORES</span>
                <div className="mg-spec-segmented-bar" aria-hidden="true">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <span key={i} className={`pod-seg cyan ${i < 7 ? 'lit' : 'dim'}`} />
                  ))}
                </div>
              </div>
              <div className="mg-mech-spec-item">
                <div className="mg-mech-spec-header">
                  <div className="mg-spec-label-group">
                    <span className="mg-mech-spec-label">CREATOR TOOLS</span>
                    <span className="mg-mech-spec-jp">作成ツール</span>
                  </div>
                  <span className="mg-mech-spec-subtag">14 RIGS</span>
                </div>
                <span className="mg-mech-spec-value green">14 UNITS</span>
                <div className="mg-spec-segmented-bar" aria-hidden="true">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <span key={i} className={`pod-seg green ${i < 8 ? 'lit' : 'dim'}`} />
                  ))}
                </div>
              </div>
              <div className="mg-mech-spec-item">
                <div className="mg-mech-spec-header">
                  <div className="mg-spec-label-group">
                    <span className="mg-mech-spec-label">LOCAL LATENCY</span>
                    <span className="mg-mech-spec-jp">遅延測定</span>
                  </div>
                  <span className="mg-mech-spec-subtag">0.00 MS</span>
                </div>
                <div className="mg-spec-latency-row">
                  <span className="mg-mech-spec-value yellow">0.00 MS</span>
                  <span className="mg-latency-pulse-tag yellow">[REALTIME]</span>
                </div>
                <div className="mg-spec-segmented-bar" aria-hidden="true">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <span key={i} className={`pod-seg yellow ${i < 7 ? 'lit' : 'dim'}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* =================================================================
              RIGHT COLUMN: Active Chassis Topbar & 3D Mechanical Card Deck
              ================================================================= */}
          <div className="mg-mech-deck-column">
            {/* Topbar: Active Chassis Indicator + Numbered Selector Buttons */}
            <div className="mg-mech-chassis-topbar">
              <div className="mg-mech-chassis-label">
                <svg className="mg-chassis-spin-reticle" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" strokeDasharray="4 4" />
                  <circle cx="12" cy="12" r="3" fill="#38bdf8" />
                </svg>
                <span
                  className="mg-mech-active-label mg-cp-relaxed-glitch"
                  data-text={`ACTIVE CHASSIS // 0${activeChassisIdx + 1}`}
                >
                  ACTIVE CHASSIS // 0{activeChassisIdx + 1}
                </span>
                {isLiveDatabase && (
                  <span className="mg-mech-live-pill" title="Live dynamic data dari database backend / Civitai">
                    ● LIVE DB
                  </span>
                )}
              </div>
              <div className="mg-mech-chassis-buttons" role="tablist" aria-label="Pilih Unit Chassis">
                {chassisUnits.map((u, idx) => (
                  <button
                    key={u.id}
                    type="button"
                    role="tab"
                    aria-selected={activeChassisIdx === idx}
                    className={`mg-mech-chassis-num-btn mg-chamfer-sm ${activeChassisIdx === idx ? 'active' : ''}`}
                    onClick={() => setActiveChassisIdx(idx)}
                    title={`Pilih ${u.name}`}
                  >
                    <span className="mg-chassis-btn-idx">0{idx + 1}</span>
                    <span className="mg-chassis-btn-codename">{idx === 0 ? 'STRIX' : idx === 1 ? 'ZEPHYR' : 'MATRIX'}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3D Hardware Deck Rig with Parallax & Mouse Tilt */}
            <div
              ref={heroRigRef}
              className="mg-mech-card-deck-rig mg-gpu"
              onPointerMove={handlePointerMove}
              onPointerLeave={handlePointerLeave}
              onMouseEnter={() => setIsChassisPaused(true)}
            >
              <div
                className="mg-hero-mech-card-frame mg-chamfer-lg"
                onClick={() => navigate(`/models?model=${activeChassis.slug}`)}
                role="button"
                tabIndex={0}
                aria-label={`Inspect ${activeChassis.name}`}
                style={{ cursor: 'pointer' }}
              >
                {/* Mechanical Hardware Corner Bolts (ASUS ROG Hardware Rivets) */}
                <div className="mg-card-hardware-bolts" aria-hidden="true">
                  <span className="mg-bolt tl">⬢</span>
                  <span className="mg-bolt tr">⬢</span>
                  <span className="mg-bolt bl">⬢</span>
                  <span className="mg-bolt br">⬢</span>
                </div>

                {/* Decorative Cyberpunk Hazard Line & ROG Matrix Slash Accent */}
                <div className="mg-card-hazard-strip" aria-hidden="true">
                  <div className="mg-rog-slash-vent">
                    <span className="mg-rog-matrix-tag">ROG-MATRIX // V4.8</span>
                    <div className="mg-rog-slashes">
                      <span /><span /><span /><span /><span />
                    </div>
                  </div>
                </div>

                {/* Card Header Bar */}
                <div className="mg-mech-card-header-bar">
                  <div className="mg-mech-header-titles">
                    <div className="mg-mech-unit-code-row">
                      <span
                        className="mg-mech-unit-code mg-cp-micro-glitch cyan"
                        data-text={activeChassis.unitCode}
                      >
                        {activeChassis.unitCode}
                      </span>
                      <span className="mg-unit-jp-tag">機体 // ARCH-0{activeChassisIdx + 1}</span>
                    </div>
                    <CardCorruptedTitle text={activeChassis.name} />
                  </div>
                  <div className="mg-mech-header-right-badges">
                    <div className={`mg-mech-vram-pill mg-chamfer-sm ${activeChassis.vramColor}`}>
                      {activeChassis.vramBadge}
                    </div>
                    <span className="mg-mech-vram-subtag">FP16 DUAL-CH</span>
                  </div>
                </div>

                {/* Framed Landscape Media Area with Kiroshi Optic HUD */}
                <div className="mg-mech-media-frame mg-chamfer-sm">
                  {/* Optical HUD Crosshairs & Kiroshi HUD telemetry */}
                  <div className="mg-card-hud-crosshairs" aria-hidden="true">
                    <span className="reticle-ch tl">┌</span>
                    <span className="reticle-ch tr">┐</span>
                    <span className="reticle-ch bl">└</span>
                    <span className="reticle-ch br">┘</span>
                    <div className="mg-kiroshi-hud-top">
                      <span className="mg-kiroshi-live-dot" aria-hidden="true" />
                      <span className="mg-kiroshi-badge">NEURAL OPTIC // TGT.LOCK</span>
                      <span className="mg-kiroshi-freq">144Hz</span>
                    </div>
                  </div>

                  {/* Real-time CRT scanlines & Laser Sweep & Glitch Tear */}
                  <div className="mg-mech-hologram-scanline" aria-hidden="true" />
                  <div className="mg-kiroshi-laser-sweep" aria-hidden="true" />
                  <div className="mg-media-glitch-tear" aria-hidden="true" />

                  <img
                    src={activeChassis.thumbnailUrl}
                    alt={activeChassis.name}
                    className="mg-mech-frame-img"
                    style={activeChassis.imagePosition ? { objectPosition: activeChassis.imagePosition } : undefined}
                    loading="eager"
                    decoding="async"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/preview-1.jpg';
                    }}
                  />

                  {/* Metadata Overlay Pills */}
                  <div className="mg-mech-overlay-sha mg-chamfer-sm">
                    {activeChassis.sha256}
                  </div>

                  {/* Bottom Tags (LoRA Tag & Parameter Count) */}
                  <div className="mg-mech-overlay-bottom">
                    <span className="mg-mech-pill-lora mg-chamfer-sm">
                      {activeChassis.loraTag}
                    </span>
                    <span className="mg-mech-pill-tensor mg-chamfer-sm">
                      <span className="mg-jp-tensor-mini">テンソル</span> {activeChassis.tensorBadge}
                    </span>
                  </div>
                </div>

                {/* Cyberpunk x ROG Armoury Crate Segmented VRAM Footprint Meter */}
                <div className="mg-hero-card-vram-meter">
                  <div className="mg-hero-vram-meter-head">
                    <div className="mg-vram-title-group">
                      <span className="mg-vram-icon">⚡</span>
                      <span className="mg-vram-label">GPU VRAM FOOTPRINT</span>
                      <span className="mg-vram-subtag">// ARMOURY ALLOC</span>
                    </div>
                    <div className="mg-vram-val-group">
                      <span className={`val-${activeChassis.vramColor}`}>{activeChassis.vramBadge}</span>
                      <span className="mg-vram-status">[SYNC: OK]</span>
                    </div>
                  </div>
                  <div className="mg-hero-vram-segmented-bar" aria-hidden="true">
                    {Array.from({ length: 16 }).map((_, i) => {
                      const activeCount =
                        activeChassis.vramColor === 'green'
                          ? 13
                          : activeChassis.vramColor === 'amber' || activeChassis.vramColor === 'yellow'
                          ? 10
                          : 12;
                      const isLit = i < activeCount;
                      const isPeak = i >= 14;
                      const isWarn = i >= 11 && i < 14;
                      return (
                        <span
                          key={i}
                          style={{ '--seg-idx': i } as React.CSSProperties}
                          className={`mg-vram-seg ${isLit ? 'lit' : 'dim'} ${
                            isPeak ? 'peak' : isWarn ? 'warn' : 'norm'
                          }`}
                        />
                      );
                    })}
                  </div>
                  <div className="mg-vram-ticks" aria-hidden="true">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span className="tick-peak">PEAK 100%</span>
                  </div>
                </div>

                {/* Bottom 3-Column Specifications with Cyberpunk / ROG telemetry */}
                <div className="mg-mech-bottom-specs">
                  <div className="mg-mech-bottom-col">
                    <div className="mg-mech-b-head">
                      <span className="mg-mech-b-key">PREDICTION</span>
                      <span className="mg-mech-b-jp">予測</span>
                    </div>
                    <span className="mg-mech-b-val">{activeChassis.prediction}</span>
                  </div>
                  <div className="mg-mech-bottom-col">
                    <div className="mg-mech-b-head">
                      <span className="mg-mech-b-key">NATIVE RES</span>
                      <span className="mg-mech-b-jp">解像度</span>
                    </div>
                    <span className="mg-mech-b-val">{activeChassis.nativeRes}</span>
                  </div>
                  <div className="mg-mech-bottom-col">
                    <div className="mg-mech-b-head">
                      <span className="mg-mech-b-key">{activeChassis.samplerOrGuidanceKey}</span>
                      <span className="mg-mech-b-jp">サンプラー</span>
                    </div>
                    <span className="mg-mech-b-val">{activeChassis.samplerOrGuidanceVal}</span>
                  </div>
                </div>

                {/* Interactive Gaming Inspect Bar with ROG Chamfer & Chromatic Glitch */}
                <div className="mg-hero-card-inspect-bar">
                  <div className="mg-card-inspect-meta">
                    <span className="mg-card-inspect-text">TELEMETRY &amp; TENSORS</span>
                    <span className="mg-rog-sync-tag">
                      <span className="mg-rog-armed-dot" aria-hidden="true" />
                      ROG-MATRIX // ARMED
                    </span>
                  </div>
                  <span className="mg-card-inspect-btn mg-chamfer-sm">
                    [ INSPECT DATA &rarr; ]
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gaming HUD Scroll Indicator */}
      <div
        className="mg-hero-scroll-indicator mg-chamfer-sm"
        onClick={onDiscoverClick}
        role="button"
        tabIndex={0}
        aria-label="Scroll down to specification overview"
      >
        <div className="mg-hero-scroll-chevrons" aria-hidden="true">
          <span className="chev c1">&bull;</span>
          <span className="chev c2">&bull;</span>
          <span className="chev c3">&bull;</span>
        </div>
        <span className="mg-scroll-label">SCROLL // SYSTEM OVERVIEW</span>
      </div>
    </section>
  );
}

export default HeroSection;
