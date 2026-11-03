import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, resolveImageUrl } from '../../api/client';
import type { Model, ModelsResponse } from '../../api/models';

interface ChassisModel {
  id: string;
  unitCode: string;
  name: string;
  slug: string;
  vramBadge: string;
  vramColor: 'cyan' | 'green' | 'amber';
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
    id: 'hassaku-illustrious',
    unitCode: 'UNIT // 01-ILLUSTRIOUS',
    name: 'HASSAKU XL (ILLUSTRIOUS)',
    slug: 'wai-illustrious-sdxl',
    vramBadge: '6.8 GB FP16',
    vramColor: 'cyan',
    sha256: 'SHA256 // ETENSORS',
    loraTag: '<1girl>',
    tensorBadge: '3.1B TENSORS',
    prediction: 'EPSILON (V0.1)',
    nativeRes: '832 × 1216 PX',
    samplerOrGuidanceKey: 'SAMPLER LOCK',
    samplerOrGuidanceVal: 'EULER A (25S)',
    thumbnailUrl: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/ce58b29f-26ca-461b-a184-cf54fb869e26/width=600/ce58b29f-26ca-461b-a184-cf54fb869e26.jpeg',
    imagePosition: 'center 20%',
  },
  {
    id: 'noobai-vpred',
    unitCode: 'UNIT // 02-NOOBAI',
    name: 'NOOBAI-XL V-PRED',
    slug: 'wai-shuffle-noob',
    vramBadge: '7.2 GB FP16',
    vramColor: 'green',
    sha256: 'SHA256 // 6942C4B2',
    loraTag: '<v-pred:1.0>',
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
    vramColor: 'amber',
    sha256: 'SHA256 // E621BEF5',
    loraTag: '<clean_lineart:0.8>',
    tensorBadge: '2.5B TENSORS',
    prediction: 'EPSILON (V0.1)',
    nativeRes: '832 × 1216 PX',
    samplerOrGuidanceKey: 'SAMPLER LOCK',
    samplerOrGuidanceVal: 'EULER A (28S)',
    thumbnailUrl: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/e621bef5-8aa3-49b8-9abe-a61aca533159/width=600/e621bef5-8aa3-49b8-9abe-a61aca533159.jpeg',
    imagePosition: 'center 25%',
  },
];

function mapModelToChassis(m: Model, index: number): ChassisModel {
  const vramColors: ('cyan' | 'green' | 'amber')[] = ['cyan', 'green', 'amber'];
  const color = vramColors[index % vramColors.length];

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

  const version = m.versions && m.versions.length > 0 ? m.versions[0] : null;
  const rec = (version?.recommended_settings as Record<string, unknown>) || {};

  let hashStr = '';
  const uuidMatch = rawImg.match(/([a-f0-9]{8})-[a-f0-9]{4}/i);
  if (uuidMatch && uuidMatch[1]) {
    hashStr = uuidMatch[1].toUpperCase();
  } else {
    hashStr = 'ETENSORS';
  }

  const baseTag = (m.base_model || 'SDXL').toUpperCase();
  const unitCodes = ['01-ILLUSTRIOUS', '02-NOOBAI', '03-RAEHOSHI'];

  return {
    id: `dynamic-${m.id}`,
    unitCode: `UNIT // ${unitCodes[index % unitCodes.length]}`,
    name: m.name.toUpperCase(),
    slug: m.slug || `${m.id}`,
    vramBadge: m.vram_min ? `${m.vram_min} FP16` : '6.8 GB FP16',
    vramColor: color,
    sha256: `SHA256 // ${hashStr}`,
    loraTag: m.trigger_words && m.trigger_words[0] ? `<${m.trigger_words[0].trigger_word}>` : '<1girl>',
    tensorBadge: m.tensor_size ? `${m.tensor_size} TENSORS` : '3.1B TENSORS',
    prediction: baseTag.includes('NOOB') ? 'V-PREDICTION' : 'EPSILON (V0.1)',
    nativeRes: rec.width && rec.height ? `${rec.width} × ${rec.height} PX` : '832 × 1216 PX',
    samplerOrGuidanceKey: 'SAMPLER LOCK',
    samplerOrGuidanceVal: rec.sampler ? `${String(rec.sampler).toUpperCase()} (${rec.steps || 25}S)` : 'EULER A (25S)',
    thumbnailUrl: resolvedImg,
    imagePosition: 'center 20%',
  };
}

const STATEMENT_TABS = [
  { id: '01', label: '01 Model Chassis', path: '/models' },
  { id: '02', label: '02 SafeTensors Inspector', path: '/inspector' },
  { id: '03', label: '03 Hardware Sovereignty', path: '/vram-profiler' },
  { id: 'specs', label: 'Standards Spec', path: '/models' },
] as const;

type StatementTabId = (typeof STATEMENT_TABS)[number]['id'];

export function EditorialStatement() {
  const navigate = useNavigate();

  const trackRef = useRef<HTMLDivElement | null>(null);
  const leftGateRef = useRef<HTMLDivElement | null>(null);
  const rightGateRef = useRef<HTMLDivElement | null>(null);
  const payloadRef = useRef<HTMLDivElement | null>(null);

  // Cyberpunk 2077 HUD Center Overlay Refs
  const centerHudRef = useRef<HTMLDivElement | null>(null);
  const ladderFillRef = useRef<HTMLDivElement | null>(null);
  const loadingTextRef = useRef<HTMLSpanElement | null>(null);

  // Parallax Layer Refs
  const bgGridRef = useRef<HTMLDivElement | null>(null);

  // Dynamic Chassis Units state (Dynamic when backend is connected, graceful fallback when offline)
  const [chassisUnits, setChassisUnits] = useState<ChassisModel[]>(CHASSIS_FALLBACK_UNITS);
  const [activeChassisIdx, setActiveChassisIdx] = useState<number>(0);
  const [isLiveDatabase, setIsLiveDatabase] = useState<boolean>(false);

  // Mobile tab switcher state
  const [mobileActiveTab, setMobileActiveTab] = useState<StatementTabId>('01');

  // Fetch real database models if backend is online
  useEffect(() => {
    let isMounted = true;
    apiFetch<ModelsResponse>('/models?limit=6')
      .then((res) => {
        if (!isMounted || !res || !res.data || res.data.length === 0) return;
        const dynamicUnits = res.data.slice(0, 3).map((m, idx) => mapModelToChassis(m, idx));
        if (dynamicUnits.length > 0) {
          setChassisUnits(dynamicUnits);
          setIsLiveDatabase(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsLiveDatabase(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Interactive Click-to-Unlock handler
  const handleUnlockClick = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const vh = window.innerHeight;
    const scrollable = Math.max(1, rect.height - vh);
    const targetScroll = window.scrollY + rect.top + Math.max(240, scrollable * 0.70);
    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
  }, []);

  // 120FPS Ultra-Smooth Hydraulic Parallax (360vh Track + Perlin Smootherstep + Frame-Rate Independent Exponential Smoothing)
  useEffect(() => {
    let rafId: number;
    let currentP = 0;
    let lastTime = performance.now();

    // Perlin Smootherstep (6t^5 - 15t^4 + 10t^3) for zero-jerk acceleration/deceleration
    const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      if (trackRef.current) {
        const rect = trackRef.current.getBoundingClientRect();
        const vh = window.innerHeight;
        const scrollable = Math.max(1, rect.height - vh);

        // Responsive scroll progress: Pre-engaging buffer (vh * 0.12)
        const scrolled = -rect.top + vh * 0.12;
        const targetP = Math.max(0, Math.min(1, scrolled / (scrollable + vh * 0.12)));

        // Frame-rate independent exponential damping (~5.8 factor)
        const smoothFactor = 1 - Math.exp(-5.8 * dt);
        currentP += (targetP - currentP) * smoothFactor;

        // Gate separation across 76% of track
        const rawOpen = Math.max(0, Math.min(1, (currentP - 0.10) / 0.78));
        const easeOpen = smootherstep(rawOpen);
        const isFullyOpen = easeOpen >= 0.995;

        // Blast Gate Assembly Separation:
        // Left Assembly slides to far left (-105%)
        // Right Assembly slides to far right (+105%)
        // Center is completely cleared!
        if (leftGateRef.current && rightGateRef.current) {
          const tx = (easeOpen * 105).toFixed(3);
          leftGateRef.current.style.transform = `translate3d(-${tx}%, 0, 0)`;
          rightGateRef.current.style.transform = `translate3d(${tx}%, 0, 0)`;
          leftGateRef.current.style.visibility = isFullyOpen ? 'hidden' : 'visible';
          rightGateRef.current.style.visibility = isFullyOpen ? 'hidden' : 'visible';
          leftGateRef.current.style.pointerEvents = isFullyOpen ? 'none' : 'auto';
          rightGateRef.current.style.pointerEvents = isFullyOpen ? 'none' : 'auto';
        }

        // Lock unsealing progress during first 20% of scroll (0.0 to 0.20)
        const lockEase = Math.max(0, Math.min(1, currentP / 0.20));
        const lockPct = Math.round(lockEase * 100);

        // Cyberpunk / ROG Center Glitch Core HUD (Completely stationary, zero shake, zero wobble)
        if (centerHudRef.current) {
          const hudOpacity = Math.max(0, 1 - easeOpen * 2.8);
          centerHudRef.current.style.opacity = hudOpacity.toFixed(3);
          centerHudRef.current.style.transform = 'translate(-50%, -50%)';
          centerHudRef.current.style.pointerEvents = hudOpacity <= 0.05 ? 'none' : 'auto';
        }

        if (ladderFillRef.current) {
          ladderFillRef.current.style.width = `${lockPct}%`;
          if (loadingTextRef.current) {
            if (lockPct >= 100) {
              loadingTextRef.current.textContent = isFullyOpen ? 'SYSTEM ONLINE 100%' : 'ACCESS GRANTED 100%';
            } else {
              loadingTextRef.current.textContent = `INITIALIZING ${lockPct}%`;
            }
          }
        }

        // Parallax Layer: 3D Perspective Cyber-Grid Floor
        if (bgGridRef.current) {
          const gridY = (easeOpen * 40).toFixed(2);
          const gridOpacity = (0.20 + easeOpen * 0.60).toFixed(3);
          bgGridRef.current.style.transform = `perspective(600px) rotateX(60deg) scale(2) translate3d(0, ${gridY}px, 0)`;
          bgGridRef.current.style.opacity = gridOpacity;
        }

        // Parallax Layer 3: Payload (EditorialStatement Content with Chamfered Cards)
        if (payloadRef.current) {
          const scale = (0.90 + easeOpen * 0.10).toFixed(4);
          const opacity = Math.min(1, 0.20 + easeOpen * 0.80).toFixed(3);
          payloadRef.current.style.transform = `scale3d(${scale}, ${scale}, 1)`;
          payloadRef.current.style.opacity = opacity;
          payloadRef.current.style.pointerEvents = isFullyOpen ? 'auto' : 'none';
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const activeChassis = chassisUnits[activeChassisIdx] || chassisUnits[0] || CHASSIS_FALLBACK_UNITS[0];

  return (
    <section className="mg-shutter-track" id="editorial-statement" ref={trackRef}>
      <div className="mg-shutter-sticky">
        {/* ===================================================================
            PARALLAX LAYER: 3D PERSPECTIVE CYBER-GRID FLOOR (bgGridRef)
            =================================================================== */}
        <div ref={bgGridRef} className="mg-shutter-bg-grid" aria-hidden="true" />

        {/* ===================================================================
            GIANT HORIZONTAL HOLLOW-OUTLINE WATERMARK TYPOGRAPHY
            Exact aesthetic matching reference: thin stroke outline, transparent fill
            =================================================================== */}
        <div className="mg-shutter-huge-watermark" aria-hidden="true">
          <span>MODELS GUIDE</span>
        </div>

        {/* ===================================================================
            PARALLAX LAYER 3: INNER PAYLOAD (payloadRef)
            Revealed Local Sovereignty & Architecture Telemetry Vault
            Cards use Chamfered Cyberpunk Corners
            =================================================================== */}
        <div ref={payloadRef} className="mg-shutter-inner-payload">
          {/* Seamless Transition Bridge Datum from Hero Section */}
          <div className="mg-statement-transition-bridge" aria-hidden="true">
            <div className="mg-statement-bridge-datum">
              <div className="mg-statement-bridge-line" />
              <div className="mg-statement-bridge-badge mg-chamfer-sm">
                <span className="mg-bridge-dot" />
                <span className="mg-bridge-text">SPECIFICATION SUITE 01</span>
              </div>
              <div className="mg-statement-bridge-line" />
            </div>
          </div>

          {/* Architectural Corner Reticles */}
          <div className="mg-corner-reticle top-left" aria-hidden="true"><span>+</span></div>
          <div className="mg-corner-reticle top-right" aria-hidden="true"><span>+</span></div>
          <div className="mg-corner-reticle bottom-left" aria-hidden="true"><span>+</span></div>
          <div className="mg-corner-reticle bottom-right" aria-hidden="true"><span>+</span></div>

          {/* Core Content: Telemetry Vault Command Console */}
          <div className="mg-statement-core mg-gpu">
            {/* Top Telemetry Header Bar */}
            <div className="mg-vault-header-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="mg-editorial-tag" style={{ margin: 0 }}>
                  <span className="mg-tag-num">01</span>
                  <span className="mg-tag-line" />
                  <span className="mg-tag-text">LOCAL SOVEREIGNTY &amp; ARCHITECTURE SUITE</span>
                </div>
                <div className="mg-vault-status-chip">
                  <span className="mg-vault-dot-pulse" />
                  <span>TELEMETRY ONLINE</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="mg-vault-btn-link"
                  onClick={() => navigate('/models')}
                  title="Buka direktori checkpoint &amp; LoRA"
                >
                  <span>Model Library (14+)</span>
                  <span>&rarr;</span>
                </button>
                <button
                  type="button"
                  className="mg-vault-btn-link"
                  onClick={() => navigate('/inspector')}
                  title="Buka SafeTensors Header Inspector"
                  style={{ borderColor: 'rgba(16, 185, 129, 0.35)', color: '#10b981', background: 'rgba(16, 185, 129, 0.08)' }}
                >
                  <span>SafeTensors Inspector</span>
                  <span>&rarr;</span>
                </button>
              </div>
            </div>

            {/* Title & Technical Proposition */}
            <div className="mg-statement-header" style={{ marginBottom: '10px' }}>
              <h2 className="mg-statement-title" style={{ fontSize: 'clamp(1.4rem, 2.2vw, 2.1rem)', margin: 0 }}>
                Precision standards, deterministic benchmarks, and zero-copy inspection.
              </h2>
            </div>

            {/* 3 Quantitative Audit Telemetry Panels */}
            <div className="mg-audit-panels-trio" style={{ marginBottom: '10px' }}>
              <div className="mg-audit-panel-item mg-chamfer-md">
                <div className="mg-hazard-strip" style={{ height: '3px', position: 'absolute', top: 0, left: 0, right: 0 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="mg-audit-metric-num">0.00 MS</span>
                  <span style={{ fontSize: '9px', color: '#38bdf8', fontFamily: 'var(--mg-font-mono)', letterSpacing: '0.1em' }}>LOCAL BUS</span>
                </div>
                <span className="mg-audit-metric-desc">Network Overhead</span>
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  SafeTensors header parsing 100% lokal di browser tanpa upload bobot file
                </span>
              </div>

              <div className="mg-audit-panel-item mg-chamfer-md">
                <div className="mg-hazard-strip" style={{ height: '3px', position: 'absolute', top: 0, left: 0, right: 0 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="mg-audit-metric-num" style={{ color: '#10b981' }}>100%</span>
                  <span style={{ fontSize: '9px', color: '#10b981', fontFamily: 'var(--mg-font-mono)', letterSpacing: '0.1em' }}>CVE-SAFE</span>
                </div>
                <span className="mg-audit-metric-desc">Zero-Copy Byte Deserialization</span>
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  Inspeksi metadata murni tanpa risiko arbitrary code execution pickle PyTorch
                </span>
              </div>

              <div className="mg-audit-panel-item mg-chamfer-md">
                <div className="mg-hazard-strip" style={{ height: '3px', position: 'absolute', top: 0, left: 0, right: 0 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="mg-audit-metric-num" style={{ color: '#fcee0a' }}>14 UNITS</span>
                  <span style={{ fontSize: '9px', color: '#fcee0a', fontFamily: 'var(--mg-font-mono)', letterSpacing: '0.1em' }}>ACTIVE RIG</span>
                </div>
                <span className="mg-audit-metric-desc">Creator Workstations Suite</span>
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  VRAM profiler, node ComfyUI, pose rig 3D &amp; Danbooru anime prompt studio
                </span>
              </div>
            </div>

            {/* 3 High-Octane Workstation Showcases */}
            <div className="mg-vault-pillars-grid">
              {/* CARD 01: ACTIVE CHASSIS MODEL */}
              <div className="mg-vault-card-chassis mg-chamfer-md">
                <div className="mg-vault-chassis-topbar">
                  <div className="mg-vault-chassis-label">
                    <svg className="mg-vault-chassis-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" strokeDasharray="4 4" />
                      <circle cx="12" cy="12" r="3" fill="#38bdf8" />
                    </svg>
                    <span>ACTIVE CHASSIS: {activeChassis.unitCode}</span>
                    {isLiveDatabase && (
                      <span className="mg-vault-live-pill" title="Live dynamic data dari database backend / Civitai">
                        &bull; LIVE DB
                      </span>
                    )}
                  </div>
                  <div className="mg-vault-chassis-btn-group" role="tablist" aria-label="Pilih Unit Chassis">
                    {chassisUnits.map((u, idx) => (
                      <button
                        key={u.id}
                        type="button"
                        role="tab"
                        aria-selected={activeChassisIdx === idx}
                        className={`mg-vault-chassis-num-btn ${activeChassisIdx === idx ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveChassisIdx(idx);
                        }}
                        title={`Pilih ${u.name}`}
                      >
                        0{idx + 1}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mg-vault-chassis-header">
                  <span className="mg-vault-unit-code">{activeChassis.unitCode}</span>
                  <span className={`mg-vault-vram-pill ${activeChassis.vramColor}`}>
                    {activeChassis.vramBadge}
                  </span>
                </div>

                <h3 className="mg-vault-model-title" title={activeChassis.name}>
                  {activeChassis.name}
                </h3>

                <div
                  className="mg-vault-media-box"
                  onClick={() => navigate(`/models?model=${activeChassis.slug}`)}
                  title="Klik untuk melihat detail model"
                >
                  <img
                    src={activeChassis.thumbnailUrl}
                    alt={activeChassis.name}
                    className="mg-vault-media-img"
                    style={activeChassis.imagePosition ? { objectPosition: activeChassis.imagePosition } : undefined}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/preview-1.jpg';
                    }}
                  />
                  <div className="mg-vault-media-sha">
                    {activeChassis.sha256}
                  </div>
                  <div className="mg-vault-media-bottom">
                    <span className="mg-vault-badge-lora">
                      {activeChassis.loraTag}
                    </span>
                    <span className="mg-vault-badge-tensor">
                      {activeChassis.tensorBadge}
                    </span>
                  </div>
                </div>

                <div className="mg-vault-specs-grid">
                  <div className="mg-vault-spec-col">
                    <span className="mg-vault-spec-label">PREDICTION</span>
                    <span className="mg-vault-spec-val">{activeChassis.prediction}</span>
                  </div>
                  <div className="mg-vault-spec-col">
                    <span className="mg-vault-spec-label">NATIVE RES</span>
                    <span className="mg-vault-spec-val">{activeChassis.nativeRes}</span>
                  </div>
                  <div className="mg-vault-spec-col">
                    <span className="mg-vault-spec-label">SAMPLER LOCK</span>
                    <span className="mg-vault-spec-val">{activeChassis.samplerOrGuidanceVal}</span>
                  </div>
                </div>
              </div>

              {/* CARD 02: SAFETENSORS HEADER INSPECTOR */}
              <div
                className="mg-vault-card-terminal mg-chamfer-md"
                onClick={() => navigate('/inspector')}
                role="button"
                tabIndex={0}
                title="Buka SafeTensors Header Inspector"
              >
                <div className="mg-vault-chassis-header">
                  <span className="mg-vault-unit-code" style={{ color: '#10b981' }}>UNIT // 02-INSPECTOR</span>
                  <span className="mg-vault-vram-pill green">0.00 MS / CVE-SAFE</span>
                </div>

                <h3 className="mg-vault-model-title">
                  SAFETENSORS HEADER PARSER
                </h3>

                <div className="mg-vault-terminal-stream">
                  <div style={{ color: '#38bdf8' }}>&gt; DESERIALIZE_HEADER(raehoshi_v20.safetensors)</div>
                  <div>&bull; ZERO-COPY LOCAL STREAM: 100% BROWSER BUS</div>
                  <div>&bull; SECURITY AUDIT: CVE-SAFE (NO PYTHON PICKLE)</div>
                  <div style={{ color: '#a7f3d0' }}>&bull; TAGS: score_9, rating_safe, masterpiece, clean</div>
                  <div style={{ color: '#64748b' }}>&bull; AUTOHASH: SHA256 // CE58B29F &bull; 832&times;1216</div>
                </div>

                <div className="mg-vault-chip-row">
                  <span className="mg-vault-code-chip" style={{ color: '#6ee7b7' }}>score_9</span>
                  <span className="mg-vault-code-chip" style={{ color: '#6ee7b7' }}>rating_safe</span>
                  <span className="mg-vault-code-chip">832&times;1216</span>
                  <span className="mg-vault-code-chip">AutoV2</span>
                </div>

                <div className="mg-vault-action-row">
                  <span className="mg-vault-action-text emerald">
                    <span>Launch Header Inspector</span>
                    <span>&rarr;</span>
                  </span>
                </div>
              </div>

              {/* CARD 03: HARDWARE SOVEREIGNTY & GPU VRAM PROFILER */}
              <div
                className="mg-vault-card-vram mg-chamfer-md"
                onClick={() => navigate('/vram-profiler')}
                role="button"
                tabIndex={0}
                title="Buka GPU VRAM Profiler"
              >
                <div className="mg-vault-chassis-header">
                  <span className="mg-vault-unit-code" style={{ color: '#fcee0a' }}>UNIT // 03-HARDWARE LAB</span>
                  <span className="mg-vault-vram-pill amber">VRAM MATRIX</span>
                </div>

                <h3 className="mg-vault-model-title">
                  HARDWARE SOVEREIGNTY &amp; VRAM
                </h3>

                <div className="mg-vault-vram-bars">
                  <div className="mg-vault-gpu-row">
                    <div className="mg-vault-gpu-meta">
                      <span>RTX 4090 (24 GB)</span>
                      <span style={{ color: '#38bdf8' }}>6.8 GB / FP16 (STABLE)</span>
                    </div>
                    <div className="mg-vault-gpu-bar-bg">
                      <div className="mg-vault-gpu-bar-fill" style={{ width: '28%', background: '#38bdf8' }} />
                    </div>
                  </div>

                  <div className="mg-vault-gpu-row">
                    <div className="mg-vault-gpu-meta">
                      <span>RTX 3060 (12 GB)</span>
                      <span style={{ color: '#10b981' }}>7.2 GB / V-PRED (OPTIMAL)</span>
                    </div>
                    <div className="mg-vault-gpu-bar-bg">
                      <div className="mg-vault-gpu-bar-fill" style={{ width: '60%', background: '#10b981' }} />
                    </div>
                  </div>

                  <div className="mg-vault-gpu-row">
                    <div className="mg-vault-gpu-meta">
                      <span>GTX 1660 (6 GB)</span>
                      <span style={{ color: '#fcee0a' }}>5.8 GB / FP8 (LOW-VRAM)</span>
                    </div>
                    <div className="mg-vault-gpu-bar-bg">
                      <div className="mg-vault-gpu-bar-fill" style={{ width: '96%', background: '#fcee0a' }} />
                    </div>
                  </div>
                </div>

                <div className="mg-vault-chip-row">
                  <span className="mg-vault-code-chip">Euler a (28s)</span>
                  <span className="mg-vault-code-chip">DPM++ 2M</span>
                  <span className="mg-vault-code-chip">CFG 5.5</span>
                  <span className="mg-vault-code-chip">FP16 / FP8</span>
                </div>

                <div className="mg-vault-action-row">
                  <span className="mg-vault-action-text" style={{ color: '#fcee0a' }}>
                    <span>Profile GPU VRAM Rig</span>
                    <span>&rarr;</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile Tab Switcher */}
            <div className="mg-statement-mobile-nav" role="tablist" aria-label="Pilih Pilar Arsitektur">
              {STATEMENT_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={mobileActiveTab === tab.id}
                  className={`mg-statement-mobile-chip ${mobileActiveTab === tab.id ? 'is-active' : ''}`}
                  onClick={() => {
                    setMobileActiveTab(tab.id);
                    navigate(tab.path);
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Standards Specification Footer Row */}
            <div className="mg-statement-audits mg-chamfer-sm" style={{ marginTop: '10px', padding: '8px 14px' }}>
              <div className="mg-audit-header-bar">
                <span className="mg-audit-status-badge">
                  <span className="mg-audit-pulse-dot" />
                  STANDARDS SPECIFICATION
                </span>
                <span className="mg-audit-mono-meta">OFFICIAL REFS</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '4px' }}>
                <div className="mg-audit-item">
                  <span className="mg-audit-code">SAFETENSORS PROTOCOL</span>
                  <span className="mg-audit-val">Zero-Copy &amp; Read-Only Deserialization</span>
                </div>
                <div className="mg-audit-item">
                  <span className="mg-audit-code">SUPPORTED BASES</span>
                  <span className="mg-audit-val">Illustrious-XL &bull; SDXL 1.0 &bull; NoobAI &bull; Flux.1</span>
                </div>
                <div className="mg-audit-item">
                  <span className="mg-audit-code">HASH INTEGRITY</span>
                  <span className="mg-audit-val">Deterministic AutoV2 &amp; SHA256 Checksums</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            LEFT CYBERPUNK CYBERDECK ASSEMBLY (.mg-mecha-gate-assembly--left)
            Slides to the far left edge (-105%) on scroll
            Carries Cyberdeck HUD, Cyan Seam & Anchored LATENT // CORE
            =================================================================== */}
        <div
          ref={leftGateRef}
          className="mg-mecha-gate-assembly--left"
          onClick={handleUnlockClick}
          role="button"
          tabIndex={0}
          aria-label="Unlock Latent Core Cyberdeck Gate"
        >
          <div className="mg-blast-gate--left mg-cp-cyberdeck-gate">
            {/* Dedicated Cyber.jpg Mecha Gate Background */}
            <div
              className="mg-gate-cyber-bg left"
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                backgroundImage: 'linear-gradient(180deg, rgba(7, 10, 15, 0.65) 0%, rgba(7, 10, 15, 0.18) 30%, rgba(7, 10, 15, 0.18) 70%, rgba(7, 10, 15, 0.70) 100%), radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.12), rgba(7, 10, 15, 0.30) 75%), url("/images/cyber.jpg")',
                backgroundSize: 'cover',
                backgroundPosition: 'center center',
                backgroundRepeat: 'no-repeat',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />
            {/* CRT Scanline & Dot Grid FX */}
            <div className="mg-cp-scanlines" aria-hidden="true" />
            <div className="mg-cp-grid-overlay" aria-hidden="true" />

            {/* Recessed Mechanical Armor Plates Overlay (opacity: 0.22) */}
            <svg className="mg-cp-armor-overlay left" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <pattern id="mgHazardLeft" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="10" stroke="#fcee0a" strokeWidth="2.5" opacity="0.45" />
                </pattern>
              </defs>
              {/* 45-degree angled structural panel seams */}
              <path
                d="M 280 80 L 460 80 L 490 110 L 490 320 L 440 370 L 280 370 Z"
                stroke="rgba(56, 189, 248, 0.22)"
                strokeWidth="1"
                fill="none"
              />
              <path
                d="M 310 110 L 445 110 L 470 135 L 470 300 L 425 345 L 310 345 Z"
                stroke="rgba(56, 189, 248, 0.12)"
                strokeWidth="1"
                fill="none"
              />
              <path
                d="M 280 630 L 440 630 L 490 680 L 490 890 L 460 920 L 280 920 Z"
                stroke="rgba(56, 189, 248, 0.22)"
                strokeWidth="1"
                fill="none"
              />
              <path
                d="M 310 655 L 425 655 L 470 700 L 470 865 L 445 890 L 310 890 Z"
                stroke="rgba(56, 189, 248, 0.12)"
                strokeWidth="1"
                fill="none"
              />
              {/* Diagonal connecting ribs across midsection */}
              <line x1="280" y1="225" x2="470" y2="225" stroke="rgba(56, 189, 248, 0.18)" strokeWidth="1" strokeDasharray="6 4" />
              <line x1="280" y1="775" x2="470" y2="775" stroke="rgba(56, 189, 248, 0.18)" strokeWidth="1" strokeDasharray="6 4" />
              <line x1="440" y1="370" x2="490" y2="420" stroke="rgba(56, 189, 248, 0.22)" strokeWidth="1" />
              <line x1="440" y1="630" x2="490" y2="580" stroke="rgba(56, 189, 248, 0.22)" strokeWidth="1" />

              {/* Diagonal hazard micro-stripes along angled center notch edge */}
              <path
                d="M 495 340 L 508 360 L 460 440 L 448 440 Z"
                fill="url(#mgHazardLeft)"
              />
              <path
                d="M 448 560 L 460 560 L 508 640 L 495 660 Z"
                fill="url(#mgHazardLeft)"
              />

              {/* Corner crosshair registration marks (+) */}
              <text x="320" y="145" fill="#38bdf8" fontSize="11" fontFamily="monospace" opacity="0.6">+</text>
              <text x="440" y="145" fill="#38bdf8" fontSize="11" fontFamily="monospace" opacity="0.6">+</text>
              <text x="320" y="325" fill="#38bdf8" fontSize="11" fontFamily="monospace" opacity="0.6">+</text>
              <text x="440" y="325" fill="#38bdf8" fontSize="11" fontFamily="monospace" opacity="0.6">+</text>
              <text x="320" y="685" fill="#38bdf8" fontSize="11" fontFamily="monospace" opacity="0.6">+</text>
              <text x="440" y="685" fill="#38bdf8" fontSize="11" fontFamily="monospace" opacity="0.6">+</text>
              <text x="320" y="865" fill="#38bdf8" fontSize="11" fontFamily="monospace" opacity="0.6">+</text>
              <text x="440" y="865" fill="#38bdf8" fontSize="11" fontFamily="monospace" opacity="0.6">+</text>

              {/* Micro hex codes along inner door ribs */}
              <text x="340" y="143" fill="#38bdf8" fontSize="8" fontFamily="monospace" letterSpacing="1.5" opacity="0.55">0x7F_UNET_BLK</text>
              <text x="340" y="863" fill="#38bdf8" fontSize="8" fontFamily="monospace" letterSpacing="1.5" opacity="0.55">0xA4_VAE_DEC</text>
              <text x="415" y="475" fill="#38bdf8" fontSize="7" fontFamily="monospace" letterSpacing="1" opacity="0.45">CHASSIS_RIB // A-01</text>
              <text x="415" y="525" fill="#38bdf8" fontSize="7" fontFamily="monospace" letterSpacing="1" opacity="0.45">HYDRAULIC_SEAL // OK</text>
            </svg>

            {/* Giant Horizontal Hollow Watermark Typography: MODELS GUIDE (Left Gate Half) */}
            <div className="mg-cp-watermark-text left" aria-hidden="true">
              <span>MODELS GUIDE</span>
            </div>

            {/* Top Telemetry Header Bar (Left Half): Brand & Serial */}
            <div className="mg-cp-topbar left">
              <div className="mg-cp-kanji-wrap">
                <span className="mg-cp-kanji mg-cp-glitch-text" data-text="MODELS">MODELS</span>
                <span className="mg-cp-bracket-code">[ &middot; &middot; G &middot; &middot; U &middot; &middot; I &middot; &middot; D &middot; &middot; E &middot; ]</span>
              </div>
              <div className="mg-cp-serial-text">
                LOCAL RUNTIME V2.4 // HARDWARE BUS VERIFIED
              </div>
            </div>

            {/* Sub-Header Angled Notch: MODELS GUIDE // SAFETENSORS WORKSTATION v2.4 */}
            <div className="mg-cp-sub-notch">
              <span className="mg-cp-notch-label">MODELS GUIDE // SAFETENSORS WORKSTATION v2.4</span>
              <span className="mg-cp-notch-sub">[LOCAL_GPU_RUNTIME // 14_CREATOR_TOOLS]</span>
              <svg width="120" height="12" viewBox="0 0 120 12" fill="#38bdf8" opacity="0.85" aria-hidden="true">
                <rect x="0" y="0" width="2" height="12" />
                <rect x="4" y="0" width="1" height="12" />
                <rect x="7" y="0" width="3" height="12" />
                <rect x="12" y="0" width="1" height="12" />
                <rect x="15" y="0" width="2" height="12" />
                <rect x="19" y="0" width="4" height="12" />
                <rect x="25" y="0" width="1" height="12" />
                <rect x="28" y="0" width="3" height="12" />
                <rect x="33" y="0" width="2" height="12" />
                <rect x="37" y="0" width="1" height="12" />
                <rect x="40" y="0" width="4" height="12" />
                <rect x="46" y="0" width="2" height="12" />
                <rect x="50" y="0" width="1" height="12" />
                <rect x="53" y="0" width="3" height="12" />
                <rect x="58" y="0" width="2" height="12" />
                <rect x="62" y="0" width="1" height="12" />
                <rect x="65" y="0" width="4" height="12" />
                <rect x="71" y="0" width="1" height="12" />
                <rect x="74" y="0" width="3" height="12" />
                <rect x="79" y="0" width="2" height="12" />
                <rect x="83" y="0" width="1" height="12" />
                <rect x="86" y="0" width="4" height="12" />
                <rect x="92" y="0" width="2" height="12" />
                <rect x="96" y="0" width="1" height="12" />
                <rect x="100" y="0" width="3" height="12" />
                <rect x="105" y="0" width="2" height="12" />
                <rect x="110" y="0" width="1" height="12" />
                <rect x="114" y="0" width="4" height="12" />
              </svg>
              <div className="mg-cp-scan-chip">
                <span className="mg-cp-scan-badge mg-cp-glitch-text" data-text="SCANNING 79%">SCANNING 79%</span>
                <span className="mg-cp-scan-files">663 / 1440 FILES</span>
              </div>
            </div>

            {/* Vertical Ruler Ticks on Left Border */}
            <div className="mg-cp-ruler left" aria-hidden="true">
              <div className="mg-cp-ruler-notch active"><span>&blacktriangleright;</span></div>
              <div className="mg-cp-ruler-notch" />
              <div className="mg-cp-ruler-notch" />
              <div className="mg-cp-ruler-notch active"><span>&blacktriangleright;</span></div>
              <div className="mg-cp-ruler-notch" />
              <div className="mg-cp-ruler-notch" />
              <div className="mg-cp-ruler-notch active"><span>&blacktriangleright;</span></div>
            </div>

            {/* Corner Reticle ┌ SCANNING */}
            <div className="mg-cp-corner-reticle top-left" aria-hidden="true">
              <span className="mg-cp-reticle-bracket">&lceil;</span>
              <span>SCANNING</span>
            </div>

            {/* Status / Notification Chip (Top Left) */}
            <div className="mg-cp-notice-card">
              <div className="mg-cp-notice-num">02</div>
              <div className="mg-cp-notice-body">
                <span className="mg-cp-notice-title">STAGE [02-A] // UNET INFERENCE</span>
                <span className="mg-cp-notice-sub">DETERMINISTIC LATENT CORE &bull; FP16</span>
              </div>
              <div className="mg-cp-notice-plus">+</div>
            </div>

            {/* Vertical Ribbon Tab: WEIGHT MATRIX PROTOCOL 01 */}
            <div className="mg-cp-vertical-tab" aria-hidden="true">
              <span className="mg-cp-tab-indicator" />
              <span>WEIGHT MATRIX PROTOCOL 01</span>
            </div>

            {/* Background Holographic Radar Arc */}
            <div className="mg-cp-hud-radar-arc left" aria-hidden="true" />

            {/* ==============================================================
                MANDATORY: LATENT // CORE ANCHORED AT FAR LEFT EDGE
                ============================================================== */}
            <div className="mg-cp-edge-statement left">
              <div className="mg-cp-statement-badge cyan">
                <span>UNET // ATTENTION</span>
                <span className="mg-cp-badge-divider" />
                <span>STAGE [02-A]</span>
              </div>

              <h2 className="mg-cp-main-title cyan mg-cp-glitch-text" data-text="LATENT // CORE">
                LATENT // CORE
              </h2>

              <div className="mg-cp-sub-telemetry cyan">
                [UNET_ATTENTION_BLOCKS // FP16]
              </div>

              <div className="mg-cp-hazard-stripe cyan" />

              {/* Chamfered ARCHITECTURE WEIGHT MATRIX panel */}
              <div className="mg-cp-matrix-panel">
                {/* Header */}
                <div className="mg-cp-matrix-header">
                  <span className="mg-cp-matrix-title mg-cp-glitch-text" data-text="BASE CHECKPOINT MATRIX // SAFETENSORS">
                    BASE CHECKPOINT MATRIX // SAFETENSORS
                  </span>
                  <span className="mg-cp-matrix-live-dot" aria-hidden="true" />
                </div>

                {/* Coordinate Readout (Amber/Cyan) */}
                <div className="mg-cp-matrix-coords">
                  <div className="mg-cp-coord-row">
                    <span className="mg-cp-coord-label">RES</span>
                    <span className="mg-cp-coord-val">&lt;&lt;&lt; 1024x1024_NATIVE &gt;&gt;&gt;</span>
                  </div>
                  <div className="mg-cp-coord-row">
                    <span className="mg-cp-coord-label">CFG</span>
                    <span className="mg-cp-coord-val">&lt;&lt;&lt; 5.5_SCALE // EULER_A &gt;&gt;&gt;</span>
                  </div>
                  <div className="mg-cp-coord-row">
                    <span className="mg-cp-coord-label">VRAM</span>
                    <span className="mg-cp-coord-val">&lt;&lt;&lt; 8.42_GB_ALLOCATED &gt;&gt;&gt;</span>
                  </div>
                </div>

                {/* Sub-Header: WEIGHT MATRICES */}
                <div className="mg-cp-matrix-sub-title">
                  TENSOR WEIGHT ALLOCATION // FP16
                </div>

                {/* Progress Bar Rows (keep segmented diagonal bar style) */}
                <div className="mg-cp-matrix-props">
                  <div className="mg-cp-matrix-row">
                    <div className="mg-cp-row-header">
                      <span className="mg-cp-row-name">ILLUSTRIOUS_XL</span>
                      <span className="mg-cp-row-tag">[98%] // DANBOORU_CORE</span>
                    </div>
                    <div className="mg-cp-matrix-bar-wrap">
                      <div className="mg-cp-matrix-bar-fill" style={{ width: '98%' }} />
                    </div>
                  </div>

                  <div className="mg-cp-matrix-row">
                    <div className="mg-cp-row-header">
                      <span className="mg-cp-row-name">NOOBAI_V_PRED</span>
                      <span className="mg-cp-row-tag">[95%] // ZERO_SNR_FP16</span>
                    </div>
                    <div className="mg-cp-matrix-bar-wrap">
                      <div className="mg-cp-matrix-bar-fill" style={{ width: '95%' }} />
                    </div>
                  </div>

                  <div className="mg-cp-matrix-row">
                    <div className="mg-cp-row-header">
                      <span className="mg-cp-row-name">FLUX.1_DEV_FP8</span>
                      <span className="mg-cp-row-tag">[92%] // 12B_FLOW_MATCH</span>
                    </div>
                    <div className="mg-cp-matrix-bar-wrap">
                      <div className="mg-cp-matrix-bar-fill" style={{ width: '92%' }} />
                    </div>
                  </div>

                  <div className="mg-cp-matrix-row">
                    <div className="mg-cp-row-header">
                      <span className="mg-cp-row-name">SDXL_1.0_BASE</span>
                      <span className="mg-cp-row-tag">[88%] // DUAL_CLIP_ENC</span>
                    </div>
                    <div className="mg-cp-matrix-bar-wrap">
                      <div className="mg-cp-matrix-bar-fill" style={{ width: '88%' }} />
                    </div>
                  </div>

                  <div className="mg-cp-matrix-row">
                    <div className="mg-cp-row-header">
                      <span className="mg-cp-row-name">LORA_STACK_WT</span>
                      <span className="mg-cp-row-tag">[96%] // MULTIPLIER_1.0</span>
                    </div>
                    <div className="mg-cp-matrix-bar-wrap">
                      <div className="mg-cp-matrix-bar-fill" style={{ width: '96%' }} />
                    </div>
                  </div>
                </div>

                {/* Bottom Footer */}
                <div className="mg-cp-matrix-footer">
                  <span className="mg-cp-matrix-hash">[0x00F8_TENSOR_HASH // ZERO_CLOUD_LOCK]</span>
                </div>

                {/* Telemetry Running Text Marquee */}
                <div className="mg-cp-holomap-ticker">
                  <div className="mg-cp-holomap-ticker-track">
                    <span>SAFETENSORS RUNTIME &bull; <em>RES: 1024x1024</em> &bull; <em>CFG: 5.5 // EULER_A</em> &bull; <em>VRAM: 8.42_GB</em> &bull; ILLUSTRIOUS_XL <em>[98%]</em> &bull; NOOBAI_V_PRED <em>[95%]</em> &bull; FLUX.1_DEV <em>[92%]</em> &bull; SDXL_BASE <em>[88%]</em> &bull; LORA_STACK <em>[96%]</em> &bull;</span>
                    <span aria-hidden="true">SAFETENSORS RUNTIME &bull; <em>RES: 1024x1024</em> &bull; <em>CFG: 5.5 // EULER_A</em> &bull; <em>VRAM: 8.42_GB</em> &bull; ILLUSTRIOUS_XL <em>[98%]</em> &bull; NOOBAI_V_PRED <em>[95%]</em> &bull; FLUX.1_DEV <em>[92%]</em> &bull; SDXL_BASE <em>[88%]</em> &bull; LORA_STACK <em>[96%]</em> &bull;</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Left Authorization & Barcode */}
            <div className="mg-cp-bottom-sec">
              {/* Secondary Running Feed Ribbon */}
              <div className="mg-cp-gate-ticker-ribbon" aria-hidden="true">
                <span className="mg-cp-ribbon-badge">AI RUNTIME</span>
                <div className="mg-cp-ribbon-track-wrap">
                  <div className="mg-cp-ribbon-track">
                    <span className="mg-cp-ribbon-item">SAFETENSORS WEIGHT MATRIX // <em>RES: 1024x1024</em> // <em>CFG: 5.5 EULER_A</em> // <em>VRAM: 8.42 GB</em> // ILLUSTRIOUS 98% // NOOBAI 95% // FLUX.1 92% // ZERO_CLOUD_LOCK</span>
                    <span className="mg-cp-ribbon-item" aria-hidden="true">SAFETENSORS WEIGHT MATRIX // <em>RES: 1024x1024</em> // <em>CFG: 5.5 EULER_A</em> // <em>VRAM: 8.42 GB</em> // ILLUSTRIOUS 98% // NOOBAI 95% // FLUX.1 92% // ZERO_CLOUD_LOCK</span>
                  </div>
                </div>
              </div>
              <div className="mg-cp-auth-notice">
                LOCAL HARDWARE SOVEREIGNTY ENFORCED &bull; DETERMINISTIC SAFETENSORS EXECUTION &bull; ZERO CLOUD TELEMETRY
              </div>
              <div className="mg-cp-bottom-barcode-row">
                <svg width="220" height="14" viewBox="0 0 220 14" fill="#38bdf8" opacity="0.8" aria-hidden="true">
                  <rect x="0" y="0" width="2" height="14" />
                  <rect x="4" y="0" width="1" height="14" />
                  <rect x="7" y="0" width="3" height="14" />
                  <rect x="12" y="0" width="2" height="14" />
                  <rect x="16" y="0" width="4" height="14" />
                  <rect x="22" y="0" width="1" height="14" />
                  <rect x="25" y="0" width="3" height="14" />
                  <rect x="30" y="0" width="2" height="14" />
                  <rect x="34" y="0" width="1" height="14" />
                  <rect x="38" y="0" width="4" height="14" />
                  <rect x="44" y="0" width="2" height="14" />
                  <rect x="48" y="0" width="1" height="14" />
                  <rect x="52" y="0" width="3" height="14" />
                  <rect x="57" y="0" width="2" height="14" />
                  <rect x="61" y="0" width="1" height="14" />
                  <rect x="65" y="0" width="4" height="14" />
                  <rect x="71" y="0" width="2" height="14" />
                  <rect x="75" y="0" width="1" height="14" />
                  <rect x="78" y="0" width="3" height="14" />
                  <rect x="83" y="0" width="2" height="14" />
                  <rect x="87" y="0" width="1" height="14" />
                  <rect x="91" y="0" width="4" height="14" />
                  <rect x="97" y="0" width="2" height="14" />
                  <rect x="101" y="0" width="1" height="14" />
                  <rect x="105" y="0" width="3" height="14" />
                  <rect x="110" y="0" width="2" height="14" />
                  <rect x="114" y="0" width="1" height="14" />
                  <rect x="118" y="0" width="4" height="14" />
                  <rect x="124" y="0" width="2" height="14" />
                  <rect x="128" y="0" width="1" height="14" />
                  <rect x="132" y="0" width="3" height="14" />
                  <rect x="137" y="0" width="2" height="14" />
                  <rect x="142" y="0" width="4" height="14" />
                  <rect x="148" y="0" width="1" height="14" />
                  <rect x="152" y="0" width="3" height="14" />
                  <rect x="157" y="0" width="2" height="14" />
                  <rect x="162" y="0" width="4" height="14" />
                  <rect x="168" y="0" width="1" height="14" />
                  <rect x="172" y="0" width="3" height="14" />
                  <rect x="177" y="0" width="2" height="14" />
                  <rect x="182" y="0" width="4" height="14" />
                  <rect x="188" y="0" width="2" height="14" />
                  <rect x="193" y="0" width="3" height="14" />
                  <rect x="198" y="0" width="1" height="14" />
                  <rect x="202" y="0" width="4" height="14" />
                  <rect x="208" y="0" width="2" height="14" />
                  <rect x="213" y="0" width="3" height="14" />
                  <rect x="218" y="0" width="2" height="14" />
                </svg>
                <span className="mg-cp-terminal-prompt">GPU0@RTX_4090 : ~ # SAFETENSORS_LOAD</span>
              </div>
              <div className="mg-cp-app-pill">
                <span>&#9776;</span>
                <span>APPLICATIONS</span>
              </div>
            </div>

            {/* Glowing Cyan Interlocking Mechanical Seam Polyline */}
            <svg className="mg-gate-seam-svg" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <filter id="mgSeamGlowCyan" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <polyline
                points="520,0 508,360 460,440 460,560 508,640 480,1000"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#mgSeamGlowCyan)"
                opacity="0.85"
              />
              <polyline
                points="520,0 508,360 460,440 460,560 508,640 480,1000"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.95"
              />
            </svg>
          </div>

          {/* Hydraulic Clamp Bar (Left): 140px piston arm bridging to center vault core */}
          <div className="mg-cp-hydraulic-clamp left" aria-hidden="true">
            <div className="mg-clamp-housing">
              <div className="mg-clamp-piston-body">
                <span className="mg-clamp-serial">ACT-L1 // 3.2kPSI</span>
              </div>
              <div className="mg-clamp-cylinder">
                <div className="mg-clamp-rod" />
                <div className="mg-clamp-fluid-line" />
              </div>
              <div className="mg-clamp-jaw">
                <div className="mg-clamp-teeth" />
                <div className="mg-clamp-status-led cyan" />
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            RIGHT CYBERPUNK CYBERDECK ASSEMBLY (.mg-mecha-gate-assembly--right)
            Slides to the far right edge (+105%) on scroll
            Carries Quickhack Menu, Emerald Seam & Anchored NEURAL // ENGINE
            =================================================================== */}
        <div
          ref={rightGateRef}
          className="mg-mecha-gate-assembly--right"
          onClick={handleUnlockClick}
          role="button"
          tabIndex={0}
          aria-label="Unlock Neural Engine Cyberdeck Gate"
        >
          <div className="mg-blast-gate--right mg-cp-cyberdeck-gate right">
            {/* Dedicated Cyber.jpg Mecha Gate Background */}
            <div
              className="mg-gate-cyber-bg right"
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                backgroundImage: 'linear-gradient(180deg, rgba(7, 10, 15, 0.65) 0%, rgba(7, 10, 15, 0.18) 30%, rgba(7, 10, 15, 0.18) 70%, rgba(7, 10, 15, 0.70) 100%), radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.12), rgba(7, 10, 15, 0.30) 75%), url("/images/cyber.jpg")',
                backgroundSize: 'cover',
                backgroundPosition: 'center center',
                backgroundRepeat: 'no-repeat',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />
            {/* CRT Scanline & Dot Grid FX */}
            <div className="mg-cp-scanlines" aria-hidden="true" />
            <div className="mg-cp-grid-overlay" aria-hidden="true" />

            {/* Recessed Mechanical Armor Plates Overlay (Right Gate, Emerald Accent, opacity: 0.22) */}
            <svg className="mg-cp-armor-overlay right" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <pattern id="mgHazardRight" width="10" height="10" patternTransform="rotate(-45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="10" stroke="#fcee0a" strokeWidth="2.5" opacity="0.45" />
                </pattern>
              </defs>
              {/* 45-degree angled structural panel seams */}
              <path
                d="M 720 80 L 540 80 L 510 110 L 510 320 L 560 370 L 720 370 Z"
                stroke="rgba(16, 185, 129, 0.22)"
                strokeWidth="1"
                fill="none"
              />
              <path
                d="M 690 110 L 555 110 L 530 135 L 530 300 L 575 345 L 690 345 Z"
                stroke="rgba(16, 185, 129, 0.12)"
                strokeWidth="1"
                fill="none"
              />
              <path
                d="M 720 630 L 560 630 L 510 680 L 510 890 L 540 920 L 720 920 Z"
                stroke="rgba(16, 185, 129, 0.22)"
                strokeWidth="1"
                fill="none"
              />
              <path
                d="M 690 655 L 575 655 L 530 700 L 530 865 L 555 890 L 690 890 Z"
                stroke="rgba(16, 185, 129, 0.12)"
                strokeWidth="1"
                fill="none"
              />
              {/* Connecting ribs */}
              <line x1="530" y1="225" x2="720" y2="225" stroke="rgba(16, 185, 129, 0.18)" strokeWidth="1" strokeDasharray="6 4" />
              <line x1="530" y1="775" x2="720" y2="775" stroke="rgba(16, 185, 129, 0.18)" strokeWidth="1" strokeDasharray="6 4" />
              <line x1="560" y1="370" x2="510" y2="420" stroke="rgba(16, 185, 129, 0.22)" strokeWidth="1" />
              <line x1="560" y1="630" x2="510" y2="580" stroke="rgba(16, 185, 129, 0.22)" strokeWidth="1" />

              {/* Diagonal hazard micro-stripes along angled center notch edge */}
              <path
                d="M 505 340 L 492 360 L 540 440 L 552 440 Z"
                fill="url(#mgHazardRight)"
              />
              <path
                d="M 552 560 L 540 560 L 492 640 L 505 660 Z"
                fill="url(#mgHazardRight)"
              />

              {/* Corner crosshair registration marks (+) */}
              <text x="560" y="145" fill="#10b981" fontSize="11" fontFamily="monospace" opacity="0.6">+</text>
              <text x="680" y="145" fill="#10b981" fontSize="11" fontFamily="monospace" opacity="0.6">+</text>
              <text x="560" y="325" fill="#10b981" fontSize="11" fontFamily="monospace" opacity="0.6">+</text>
              <text x="680" y="325" fill="#10b981" fontSize="11" fontFamily="monospace" opacity="0.6">+</text>
              <text x="560" y="685" fill="#10b981" fontSize="11" fontFamily="monospace" opacity="0.6">+</text>
              <text x="680" y="685" fill="#10b981" fontSize="11" fontFamily="monospace" opacity="0.6">+</text>
              <text x="560" y="865" fill="#10b981" fontSize="11" fontFamily="monospace" opacity="0.6">+</text>
              <text x="680" y="865" fill="#10b981" fontSize="11" fontFamily="monospace" opacity="0.6">+</text>

              {/* Micro hex codes along inner door ribs */}
              <text x="560" y="143" fill="#10b981" fontSize="8" fontFamily="monospace" letterSpacing="1.5" opacity="0.55">0xB8_CLIP_ENC</text>
              <text x="560" y="863" fill="#10b981" fontSize="8" fontFamily="monospace" letterSpacing="1.5" opacity="0.55">0x2C_ATTN_QKV</text>
              <text x="525" y="475" fill="#10b981" fontSize="7" fontFamily="monospace" letterSpacing="1" opacity="0.45">CHASSIS_RIB // B-02</text>
              <text x="525" y="525" fill="#10b981" fontSize="7" fontFamily="monospace" letterSpacing="1" opacity="0.45">CLAMP_PRESSURE // 3200PSI</text>
            </svg>

            {/* Giant Horizontal Hollow Watermark Typography: MODELS GUIDE (Right Gate Half) */}
            <div className="mg-cp-watermark-text right" aria-hidden="true">
              <span>MODELS GUIDE</span>
            </div>


            {/* Top Cyberdeck Header Bar (Right Half): Settings Gear, Status */}
            <div className="mg-cp-topbar right">
              <div className="mg-cp-topbar-right-meta">
                <span className="mg-cp-top-meta-badge">BUS // AIR-GAPPED &bull; CVE-SAFE</span>
                <span className="mg-cp-settings-icon" aria-hidden="true">&#9881;</span>
              </div>
            </div>

            {/* Corner Reticle with Binary Stream ┐ */}
            <div className="mg-cp-corner-reticle top-right" aria-hidden="true">
              <div className="mg-cp-reticle-binary">
                <div>01000001</div>
                <div>01001101</div>
                <div>01010010</div>
                <div>01010101</div>
                <div>01000001</div>
                <div>01001001</div>
              </div>
              <span className="mg-cp-reticle-bracket">&rceil;</span>
            </div>

            {/* Vertical Ruler Ticks on Right Border */}
            <div className="mg-cp-ruler right" aria-hidden="true">
              <div className="mg-cp-ruler-notch" />
              <div className="mg-cp-ruler-notch active"><span>&blacktriangleleft;</span></div>
              <div className="mg-cp-ruler-notch" />
              <div className="mg-cp-ruler-notch active"><span>&blacktriangleleft;</span></div>
              <div className="mg-cp-ruler-notch" />
              <div className="mg-cp-ruler-notch" />
              <div className="mg-cp-ruler-notch active"><span>&blacktriangleleft;</span></div>
            </div>

            {/* Background Holographic Radar Arc */}
            <div className="mg-cp-hud-radar-arc right" aria-hidden="true" />

            {/* ==============================================================
                MANDATORY: NEURAL // ENGINE ANCHORED AT FAR RIGHT EDGE
                ============================================================== */}
            <div className="mg-cp-edge-statement right">
              <div className="mg-cp-statement-badge emerald">
                <span>LOCAL RUNTIME</span>
                <span className="mg-cp-badge-divider" />
                <span>STAGE [02-B]</span>
              </div>

              <h2 className="mg-cp-main-title emerald mg-cp-glitch-text" data-text="NEURAL // ENGINE">
                NEURAL // ENGINE
              </h2>

              <div className="mg-cp-sub-telemetry emerald">
                [SAFETENSORS_LOCAL_RUNTIME]
              </div>

              <div className="mg-cp-hazard-stripe emerald" />

              {/* Cyberpunk Quickhack Container: Flyout Submenu + Action Stack */}
              <div className="mg-cp-quickhack-container">
                {/* Flyout Submenu */}
                <div className="mg-cp-sub-flyout">
                  <div className="mg-cp-flyout-item">ILLUSTRIOUS</div>
                  <div className="mg-cp-flyout-item">NOOBAI</div>
                  <div className="mg-cp-flyout-item">FLUX.1</div>
                  <div className="mg-cp-flyout-item">SDXL 1.0</div>
                  <div className="mg-cp-flyout-item">COMFYUI</div>
                  <div className="mg-cp-flyout-item">DANBOORU</div>
                  <div className="mg-cp-flyout-subtext">
                    LOCAL RUNTIME ENGINES<br />V 201 391 162 978
                  </div>
                </div>

                {/* 7 CORE CREATOR WORKSTATIONS Stack */}
                <div className="mg-cp-quickhack-stack">
                  <div className="mg-cp-hack-btn primary">
                    <span className="mg-cp-btn-arrow">&uarr;&darr;</span>
                    <div className="mg-cp-btn-info">
                      <span className="mg-cp-btn-label">SAFETENSORS INSPECTOR</span>
                      <span className="mg-cp-btn-sub">BINARY HEADER &amp; METADATA PARSER</span>
                    </div>
                  </div>

                  <div className="mg-cp-hack-btn">
                    <span className="mg-cp-btn-icon">&#10022;</span>
                    <div className="mg-cp-btn-info">
                      <span className="mg-cp-btn-label">ANIME PROMPT STUDIO</span>
                      <span className="mg-cp-btn-sub">DANBOORU TAG &amp; WEIGHT ENGINE</span>
                    </div>
                  </div>

                  <div className="mg-cp-hack-btn">
                    <span className="mg-cp-btn-icon">&#8865;</span>
                    <div className="mg-cp-btn-info">
                      <span className="mg-cp-btn-label">MODEL COMPARISON</span>
                      <span className="mg-cp-btn-sub">SIDE-BY-SIDE RENDER SPLIT LOUPE</span>
                    </div>
                  </div>

                  <div className="mg-cp-hack-btn">
                    <span className="mg-cp-btn-icon">&#9638;</span>
                    <div className="mg-cp-btn-info">
                      <span className="mg-cp-btn-label">VRAM PROFILER LAB</span>
                      <span className="mg-cp-btn-sub">4GB TO 24GB MULTI-GPU SIMULATOR</span>
                    </div>
                  </div>

                  <div className="mg-cp-hack-btn">
                    <span className="mg-cp-btn-icon">&#8801;</span>
                    <div className="mg-cp-btn-info">
                      <span className="mg-cp-btn-label">LORA STACK BUILDER</span>
                      <span className="mg-cp-btn-sub">INTERFERENCE &amp; WEIGHT CALCULATOR</span>
                    </div>
                  </div>

                  <div className="mg-cp-hack-btn">
                    <span className="mg-cp-btn-icon">&#9741;</span>
                    <div className="mg-cp-btn-info">
                      <span className="mg-cp-btn-label">COMFYUI JSON BRIDGE</span>
                      <span className="mg-cp-btn-sub">ONE-CLICK NODE GRAPH GENERATOR</span>
                    </div>
                  </div>

                  <div className="mg-cp-hack-btn">
                    <span className="mg-cp-btn-icon">&#8982;</span>
                    <div className="mg-cp-btn-info">
                      <span className="mg-cp-btn-label">PROMPT DECONSTRUCTOR</span>
                      <span className="mg-cp-btn-sub">REVERSE EXIF &amp; SEED EXTRACTOR</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Glowing Emerald Interlocking Mechanical Seam Polyline */}
            <svg className="mg-gate-seam-svg emerald" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <filter id="mgSeamGlowEmerald" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <polyline
                points="520,0 508,360 460,440 460,560 508,640 480,1000"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#mgSeamGlowEmerald)"
                opacity="0.85"
              />
              <polyline
                points="520,0 508,360 460,440 460,560 508,640 480,1000"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.95"
              />
            </svg>
          </div>

          {/* Hydraulic Clamp Bar (Right): 140px piston arm bridging to center vault core */}
          <div className="mg-cp-hydraulic-clamp right" aria-hidden="true">
            <div className="mg-clamp-housing">
              <div className="mg-clamp-jaw">
                <div className="mg-clamp-status-led emerald" />
                <div className="mg-clamp-teeth" />
              </div>
              <div className="mg-clamp-cylinder">
                <div className="mg-clamp-rod" />
                <div className="mg-clamp-fluid-line" />
              </div>
              <div className="mg-clamp-piston-body">
                <span className="mg-clamp-serial">ACT-R2 // 3.2kPSI</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            CENTER OVERLAY: SHARP 45-DEGREE CHAMFERED OCTAGONAL ROG GLITCH CORE
            =================================================================== */}
        <div
          ref={centerHudRef}
          className="mg-cp-center-hud"
          onClick={handleUnlockClick}
          role="button"
          tabIndex={0}
          aria-label="Unlock AI Creator Workstations Vault"
        >
          {/* Cyberpunk 2077 Outer Chamfered Housing SVG Frame with 45° Corner Brackets */}
          <svg className="mg-cp-housing-frame-svg" viewBox="0 0 490 260" preserveAspectRatio="none" aria-hidden="true">
            {/* Outer chamfered contour */}
            <polygon
              points="24,1 480,1 489,10 489,236 466,259 10,259 1,250 1,24"
              fill="none"
              stroke="rgba(56, 189, 248, 0.4)"
              strokeWidth="1.5"
            />
            {/* Inner chamfered accent line */}
            <polygon
              points="28,5 476,5 485,14 485,232 462,255 14,255 5,246 5,28"
              fill="none"
              stroke="rgba(56, 189, 248, 0.15)"
              strokeWidth="1"
              strokeDasharray="4 6"
            />
            {/* Corner Bracket: Top-Left (24px chamfer, Cyan #38bdf8) */}
            <path d="M 0 32 L 0 24 L 24 0 L 32 0" fill="none" stroke="#38bdf8" strokeWidth="3" />
            {/* Corner Bracket: Top-Right (10px chamfer, Cyberpunk Yellow #fcee0a) */}
            <path d="M 458 0 L 480 0 L 490 10 L 490 18" fill="none" stroke="#fcee0a" strokeWidth="3" />
            {/* Corner Bracket: Bottom-Right (24px chamfer, Cyan #38bdf8) */}
            <path d="M 490 228 L 490 236 L 466 260 L 458 260" fill="none" stroke="#38bdf8" strokeWidth="3" />
            {/* Corner Bracket: Bottom-Left (10px chamfer, Cyberpunk Yellow #fcee0a) */}
            <path d="M 32 260 L 10 260 L 0 250 L 0 242" fill="none" stroke="#fcee0a" strokeWidth="3" />
            
            {/* Left and Right Hydraulic Clamp Sockets */}
            <rect x="0" y="112" width="12" height="36" fill="rgba(56, 189, 248, 0.18)" stroke="#38bdf8" strokeWidth="1.5" />
            <circle cx="6" cy="120" r="1.5" fill="#38bdf8" />
            <circle cx="6" cy="140" r="1.5" fill="#38bdf8" />

            <rect x="478" y="112" width="12" height="36" fill="rgba(16, 185, 129, 0.18)" stroke="#10b981" strokeWidth="1.5" />
            <circle cx="484" cy="120" r="1.5" fill="#10b981" />
            <circle cx="484" cy="140" r="1.5" fill="#10b981" />
          </svg>

          {/* Top Telemetry Strip */}
          <div className="mg-cp-telemetry-strip">
            <span className="mg-cp-strip-icon">&#9889;</span>
            <span className="mg-cp-strip-text">LATENT DENOISING OVERRIDE // STEP 28/28</span>
          </div>

          {/* Main Glitch Title (with RGB split data-text attribute) */}
          <div className="mg-cp-vault-heading-group">
            <div className="mg-cp-warning-title mg-cp-glitch-text" data-text="LOCAL MODEL ARCHITECTURE SUITE">
              LOCAL MODEL ARCHITECTURE SUITE
            </div>
            <div className="mg-cp-warning-subtitle mg-cp-glitch-text" data-text="14 AI CREATOR WORKSTATIONS READY">
              14 AI CREATOR WORKSTATIONS READY
            </div>
          </div>

          {/* Segmented Cyan/Emerald Progress Bar (/// blocks) that fills dynamically from 0% to 100% */}
          <div className="mg-cp-ladder-progress-wrap mg-cp-rog-ladder">
            <div ref={ladderFillRef} className="mg-cp-ladder-progress-fill mg-cp-rog-ladder-fill" style={{ width: '0%' }} />
            <div className="mg-cp-ladder-stripes" />
          </div>

          {/* Progress Telemetry Readout */}
          <div className="mg-cp-progress-footer">
            <span className="mg-cp-proto-tag">LOCAL_SAFE_TENSORS</span>
            <span ref={loadingTextRef} className="mg-cp-loading-label">INITIALIZING 0%</span>
            <span className="mg-cp-proto-tag">FP16 // EULER_A</span>
          </div>

          {/* Sub-status Row */}
          <div className="mg-cp-substatus-row">
            <span className="mg-cp-substatus-tag">LOCAL_GPU_SOVEREIGNTY</span>
            <span className="mg-cp-substatus-sep">|</span>
            <span className="mg-cp-substatus-tag">0ms TELEMETRY</span>
            <span className="mg-cp-substatus-sep">|</span>
            <span className="mg-cp-substatus-tag pulse">SCROLL TO EXPLORE ARCHITECTURE</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default EditorialStatement;
