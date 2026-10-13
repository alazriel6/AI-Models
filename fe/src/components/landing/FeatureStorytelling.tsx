import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';

export function FeatureStorytelling() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const glowPathRef = useRef<SVGPathElement | null>(null);
  const coreLaserRef = useRef<SVGPathElement | null>(null);
  const streamRef = useRef<SVGPathElement | null>(null);

  // References to the 5 step nodes to calculate exact path coordinates
  const node1Ref = useRef<HTMLDivElement | null>(null);
  const node2Ref = useRef<HTMLDivElement | null>(null);
  const node3Ref = useRef<HTMLDivElement | null>(null);
  const node4Ref = useRef<HTMLDivElement | null>(null);
  const node5Ref = useRef<HTMLDivElement | null>(null);

  const [pathD, setPathD] = useState<string>('');
  const [svgSize, setSvgSize] = useState<{ width: number; height: number }>({ width: 1200, height: 2600 });
  const [activeStep, setActiveStep] = useState<number>(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return 5;
    }
    return 0;
  });

  // Cached node points and arc lengths along SVG path for zero-offset scroll synchronization
  const nodePointsRef = useRef<{ x: number; y: number }[]>([]);
  const nodeLengthsRef = useRef<number[]>([0, 0, 0, 0, 0, 0]);
  const pinsRef = useRef<HTMLElement[]>([]);
  const totalLengthRef = useRef<number>(0);
  const isSectionActiveRef = useRef<boolean>(false);
  const lastOffsetRef = useRef<number>(-1);

  // Active interactive states for feature previews
  const [compareMetric, setCompareMetric] = useState<'resolution' | 'vram' | 'architecture'>('resolution');
  const [selectedAspect, setSelectedAspect] = useState<'portrait' | 'square' | 'landscape'>('portrait');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Build the dynamic SVG path passing with pixel-perfection through each feature pin
  const updatePathGeometry = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const w = Math.round(containerRect.width);
    const h = Math.round(containerRect.height || container.scrollHeight);

    if (w <= 0 || h <= 0) return;

    setSvgSize({ width: w, height: h });

    const nodes = [node1Ref, node2Ref, node3Ref, node4Ref, node5Ref];

    // Compute exact subpixel center coordinates for each node's circular pin
    const pinCoords: { x: number; y: number }[] = [];
    const pinTargets: HTMLElement[] = [];

    nodes.forEach((ref) => {
      if (ref.current) {
        const pin = ref.current.querySelector('.mg-node-pin');
        const target = (pin || ref.current) as HTMLElement;
        pinTargets.push(target);
        const rect = target.getBoundingClientRect();
        pinCoords.push({
          x: Math.round(rect.left - containerRect.left + rect.width / 2),
          y: Math.round(rect.top - containerRect.top + rect.height / 2),
        });
      }
    });

    pinsRef.current = pinTargets;

    if (pinCoords.length < 5) return;

    const points: { x: number; y: number }[] = [];

    // 1. Initial point: directly under the section header, perfectly aligned on pin 1's vertical axis
    const header = container.querySelector('.mg-features-header');
    if (header) {
      const hRect = header.getBoundingClientRect();
      points.push({
        x: pinCoords[0].x,
        y: Math.max(10, Math.round(hRect.bottom - containerRect.top + 18)),
      });
    } else {
      points.push({ x: pinCoords[0].x, y: 30 });
    }

    // 2. Add each node's exact center pin coordinate
    pinCoords.forEach((pt) => points.push(pt));

    nodePointsRef.current = points;

    // 3. Build smooth continuous cubic bezier curve threading directly through every pin
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midY = Math.round((prev.y + curr.y) / 2);
      // S-curve entering each pin vertically for maximum visual balance
      d += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
    }

    // 4. Smooth graceful terminal curve below the last feature node
    const last = points[points.length - 1];
    d += ` C ${last.x} ${last.y + 35}, ${last.x} ${last.y + 65}, ${last.x} ${last.y + 90}`;

    setPathD(d);
  }, []);

  // Update geometry on mount, resize, font settlement, and layout shifts
  useEffect(() => {
    updatePathGeometry();

    const t0 = setTimeout(updatePathGeometry, 50);
    const t1 = setTimeout(updatePathGeometry, 200);
    const t2 = setTimeout(updatePathGeometry, 800);

    if (document.fonts) {
      document.fonts.ready.then(updatePathGeometry).catch(() => {});
    }

    let resizeTimer: number;
    const handleResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(updatePathGeometry, 80);
    };

    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [updatePathGeometry]);

  // Pre-calculate exact arc lengths to each pin along the SVG path for synchronized scroll tracking
  useEffect(() => {
    const path = pathRef.current;
    const pts = nodePointsRef.current;
    if (!path || pts.length < 2) return;

    try {
      const total = path.getTotalLength();
      if (total <= 0) return;
      totalLengthRef.current = total;

      const lengths: number[] = [0];

      for (let i = 1; i < pts.length; i++) {
        const target = pts[i];
        let bestL = lengths[i - 1];
        let bestDist = Infinity;

        const startL = lengths[i - 1];
        const range = total - startL;
        const samples = 100;
        const step = range / samples;

        for (let s = 0; s <= samples; s++) {
          const curL = startL + s * step;
          const pt = path.getPointAtLength(curL);
          const dist = (pt.x - target.x) ** 2 + (pt.y - target.y) ** 2;
          if (dist < bestDist) {
            bestDist = dist;
            bestL = curL;
          }
        }

        // Binary search refinement
        let low = Math.max(startL, bestL - step);
        let high = Math.min(total, bestL + step);
        for (let iter = 0; iter < 14; iter++) {
          const mid1 = low + (high - low) / 3;
          const mid2 = high - (high - low) / 3;
          const pt1 = path.getPointAtLength(mid1);
          const pt2 = path.getPointAtLength(mid2);
          const d1 = (pt1.x - target.x) ** 2 + (pt1.y - target.y) ** 2;
          const d2 = (pt2.x - target.x) ** 2 + (pt2.y - target.y) ** 2;
          if (d1 < d2) {
            high = mid2;
          } else {
            low = mid1;
          }
        }
        lengths.push((low + high) / 2);
      }

      nodeLengthsRef.current = lengths;
    } catch {
      // SVG geometry calculating
    }
  }, [pathD]);

  // Synchronized scroll progress tracking to advance glowing line smoothly with node activation
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let rafId: number;

    const handleScroll = () => {
      if (!isSectionActiveRef.current) return;
      const container = containerRef.current;
      const path = pathRef.current;
      if (!container || !path) return;

      const triggerY = window.innerHeight * 0.52; // Eye-level reading activation line
      const pinEls = pinsRef.current;
      if (pinEls.length < 5) return;

      const nodeTops = pinEls.map((target) => (target ? target.getBoundingClientRect().top : null));

      // 1. Determine active step based on eye-level trigger line
      let currentStep = 0;
      nodeTops.forEach((top, idx) => {
        if (top !== null && top <= triggerY + 30) {
          currentStep = idx + 1;
        }
      });
      setActiveStep((prev) => (prev !== currentStep ? currentStep : prev));

      // 2. Synchronized path length interpolation between nodes
      const lengths = nodeLengthsRef.current;
      const totalLength = totalLengthRef.current || (path ? path.getTotalLength() : 0);
      if (totalLength <= 0) return;

      const L1 = lengths[1] || (totalLength * 0.2);
      const L2 = lengths[2] || (totalLength * 0.4);
      const L3 = lengths[3] || (totalLength * 0.6);
      const L4 = lengths[4] || (totalLength * 0.8);
      const L5 = lengths[5] || (totalLength * 0.95);

      const t1 = nodeTops[0];
      const t2 = nodeTops[1];
      const t3 = nodeTops[2];
      const t4 = nodeTops[3];
      const t5 = nodeTops[4];

      let currentLength = 0;

      if (t1 !== null && t1 > triggerY) {
        // Approaching Node 1 from header
        const enterY = window.innerHeight * 0.85;
        const progress = Math.min(Math.max((enterY - t1) / (enterY - triggerY), 0), 1);
        currentLength = progress * L1;
      } else if (t1 !== null && t2 !== null && t2 > triggerY) {
        // Between Node 1 and Node 2
        const progress = Math.min(Math.max((triggerY - t1) / (t2 - t1), 0), 1);
        currentLength = L1 + progress * (L2 - L1);
      } else if (t2 !== null && t3 !== null && t3 > triggerY) {
        // Between Node 2 and Node 3
        const progress = Math.min(Math.max((triggerY - t2) / (t3 - t2), 0), 1);
        currentLength = L2 + progress * (L3 - L2);
      } else if (t3 !== null && t4 !== null && t4 > triggerY) {
        // Between Node 3 and Node 4
        const progress = Math.min(Math.max((triggerY - t3) / (t4 - t3), 0), 1);
        currentLength = L3 + progress * (L4 - L3);
      } else if (t4 !== null && t5 !== null && t5 > triggerY) {
        // Between Node 4 and Node 5
        const progress = Math.min(Math.max((triggerY - t4) / (t5 - t4), 0), 1);
        currentLength = L4 + progress * (L5 - L4);
      } else if (t5 !== null) {
        // Past Node 5 towards end of spine
        const progress = Math.min(Math.max((triggerY - t5) / 250, 0), 1);
        currentLength = L5 + progress * (totalLength - L5);
      }

      // Apply stroke dashoffset across all layered paths only when offset changes
      const offset = Math.max(0, totalLength - currentLength);
      if (Math.abs(offset - lastOffsetRef.current) > 0.4) {
        lastOffsetRef.current = offset;
        const pathsToUpdate = [pathRef.current, glowPathRef.current, coreLaserRef.current, streamRef.current];
        pathsToUpdate.forEach((p) => {
          if (p) {
            p.style.strokeDasharray = `${totalLength}`;
            p.style.strokeDashoffset = `${offset}`;
          }
        });
      }
    };

    const onScrollThrottled = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(handleScroll);
    };

    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isSectionActiveRef.current = Boolean(entry && entry.isIntersecting);
        if (isSectionActiveRef.current) {
          handleScroll();
        }
      },
      { rootMargin: '350px 0px' }
    );

    if (containerRef.current) {
      visibilityObserver.observe(containerRef.current);
    }

    window.addEventListener('scroll', onScrollThrottled, { passive: true });
    handleScroll();

    return () => {
      cancelAnimationFrame(rafId);
      visibilityObserver.disconnect();
      window.removeEventListener('scroll', onScrollThrottled);
    };
  }, [pathD]);

  const copyToken = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedToken(text);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <section className="mg-features" id="features-narrative">
      {/* Dedicated Atmospheric Dark Forest Background */}
      <div className="mg-features-forest-bg" aria-hidden="true" />

      {/* Subtle Natural Forest Ground Mist Ribbons */}
      <div className="mg-features-mist-ribbon mist-1" aria-hidden="true" />
      <div className="mg-features-mist-ribbon mist-2" aria-hidden="true" />

      {/* Ambient Vignette & Contrast Depth Lighting */}
      <div className="mg-features-atmosphere" aria-hidden="true" />

      <div className="mg-container" ref={containerRef}>
        {/* Dynamic Multi-Anchor SVG Path connecting through each feature node */}
        <div className="mg-narrative-spine-wrap" aria-hidden="true">
          {pathD && svgSize.width > 0 && (
            <svg
              className="mg-narrative-svg"
              width={svgSize.width}
              height={svgSize.height}
              viewBox={`0 0 ${svgSize.width} ${svgSize.height}`}
            >
              <defs>
                {/* Wide ambient atmospheric aura */}
                <filter id="beam-wide-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="8" result="wideBlur" />
                  <feMerge>
                    <feMergeNode in="wideBlur" />
                  </feMerge>
                </filter>

                {/* Intense neon core bloom */}
                <filter id="beam-core-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3.5" result="sharpBlur" />
                  <feMerge>
                    <feMergeNode in="sharpBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Cyberpunk Blue-to-Cyan Electric Gradient */}
                <linearGradient id="beam-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.85" />
                  <stop offset="25%" stopColor="#3b82f6" stopOpacity="1" />
                  <stop offset="55%" stopColor="#38bdf8" stopOpacity="1" />
                  <stop offset="85%" stopColor="#60a5fa" stopOpacity="1" />
                  <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.95" />
                </linearGradient>
              </defs>

              {/* 1. Inactive Dashed Guide Path */}
              <path
                d={pathD}
                fill="none"
                stroke="rgba(96, 165, 250, 0.12)"
                strokeWidth="2"
                strokeDasharray="4 6"
              />

              {/* 2. Active Ambient Wide Glow Aura */}
              <path
                ref={glowPathRef}
                d={pathD}
                fill="none"
                stroke="rgba(56, 189, 248, 0.32)"
                strokeWidth="10"
                strokeLinecap="round"
                filter="url(#beam-wide-glow)"
              />

              {/* 3. Active Traveling Glowing Main Path */}
              <path
                ref={pathRef}
                d={pathD}
                fill="none"
                stroke="url(#beam-gradient)"
                strokeWidth="3.5"
                strokeLinecap="round"
                filter="url(#beam-core-glow)"
              />

              {/* 4. Active Fiber-Optic Core Laser */}
              <path
                ref={coreLaserRef}
                d={pathD}
                fill="none"
                stroke="rgba(255, 255, 255, 0.85)"
                strokeWidth="1.2"
                strokeLinecap="round"
              />

              {/* 5. Continuous Flowing Electric Pulse Stream */}
              <path
                ref={streamRef}
                d={pathD}
                fill="none"
                stroke="rgba(224, 242, 254, 0.75)"
                strokeWidth="2"
                strokeDasharray="14 26"
                strokeLinecap="round"
                className="mg-spine-energy-stream"
              />
            </svg>
          )}
        </div>

        {/* Section Header */}
        <div className="mg-features-header">
          <div className="mg-editorial-tag">
            <span className="mg-tag-num">03</span>
            <span className="mg-tag-line" />
            <span className="mg-tag-text">INTEGRATED TOOLSET STORYTELLING</span>
          </div>
          <h2 className="mg-features-title">
            Purpose-built utilities for the generative artist.
          </h2>
          <p className="mg-features-subtitle">
            Every feature in Models Guide was designed to eliminate friction between selecting a model and producing flawless output.
          </p>
        </div>

        {/* ===================================================================
            FEATURE 01: Model Comparison (/compare)
            Distinct composition: Dual-panel sliding confrontation + diff matrix
            =================================================================== */}
        <div className={`mg-feature-row mg-feature-compare ${activeStep >= 1 ? 'is-active' : ''}`} id="feat-compare">
          <div className="mg-feature-info">
            {/* Step Node 01 */}
            <div className={`mg-step-node-anchor ${activeStep >= 1 ? 'node-active' : ''}`} ref={node1Ref}>
              <div className="mg-node-pin">
                <span className="mg-node-ring" />
                <span className="mg-node-index">01</span>
              </div>
              <div className="mg-node-meta">
                <span className="mg-node-type">FEATURE 01</span>
                <span className="mg-node-title">MODEL COMPARISON</span>
              </div>
            </div>

            <h3 className="mg-feature-heading">
              Model Comparison
            </h3>
            <p className="mg-feature-copy">
              Compare model characteristics, conditioning weights, and VRAM footprints side by side.
              Detect subtle nuances between base checkpoints and experimental fine-tunes before scheduling generation runs.
            </p>

            <div className="mg-feature-bullets">
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>Multi-slot confrontation: 2 or 3 models simultaneously</span>
              </div>
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>Real-time difference highlighting across all tensor parameters</span>
              </div>
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>Direct links to verified generation prompts and output galleries</span>
              </div>
            </div>

            <Link to="/compare" className="mg-btn mg-btn-primary">
              <span>Launch Model Comparison</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>

          <div className="mg-feature-visual mg-visual-compare">
            <div className="mg-compare-container">
              {/* Diff selector pill */}
              <div className="mg-compare-pill-nav">
                <button
                  type="button"
                  className={`mg-mini-tab ${compareMetric === 'resolution' ? 'active' : ''}`}
                  onClick={() => setCompareMetric('resolution')}
                >
                  Resolution &amp; Aspect
                </button>
                <button
                  type="button"
                  className={`mg-mini-tab ${compareMetric === 'vram' ? 'active' : ''}`}
                  onClick={() => setCompareMetric('vram')}
                >
                  VRAM &amp; Attention
                </button>
                <button
                  type="button"
                  className={`mg-mini-tab ${compareMetric === 'architecture' ? 'active' : ''}`}
                  onClick={() => setCompareMetric('architecture')}
                >
                  Text Encoders
                </button>
              </div>

              {/* Side-by-Side Dual Comparison Cards */}
              <div className="mg-compare-cards-grid">
                <div className="mg-compare-card slot-a">
                  <div className="mg-compare-card-header">
                    <span className="mg-slot-tag">SLOT A</span>
                    <h4>Illustrious XL v0.1</h4>
                    <span className="mg-slot-sub">Checkpoint &bull; Anime Base</span>
                  </div>
                  <div className="mg-compare-spec-list">
                    <div className="mg-spec-row">
                      <span>Parameters:</span>
                      <strong>6.6 Billion</strong>
                    </div>
                    <div className="mg-spec-row">
                      <span>Native Res:</span>
                      <strong>832 &times; 1216</strong>
                    </div>
                    <div className="mg-spec-row">
                      <span>Min VRAM:</span>
                      <strong className="mg-text-success">6 GB (FP16)</strong>
                    </div>
                    <div className="mg-spec-row">
                      <span>Scheduler:</span>
                      <strong>Euler a (28 stp)</strong>
                    </div>
                  </div>
                </div>

                <div className="mg-compare-diff-divider">
                  <span className="mg-vs-badge">VS</span>
                </div>

                <div className="mg-compare-card slot-b">
                  <div className="mg-compare-card-header">
                    <span className="mg-slot-tag">SLOT B</span>
                    <h4>Pony Diffusion V6</h4>
                    <span className="mg-slot-sub">Checkpoint &bull; Score-tagged</span>
                  </div>
                  <div className="mg-compare-spec-list">
                    <div className="mg-spec-row">
                      <span>Parameters:</span>
                      <strong>6.6 Billion</strong>
                    </div>
                    <div className="mg-spec-row">
                      <span>Native Res:</span>
                      <strong>1024 &times; 1024</strong>
                    </div>
                    <div className="mg-spec-row">
                      <span>Min VRAM:</span>
                      <strong className="mg-text-warning">8 GB (FP16)</strong>
                    </div>
                    <div className="mg-spec-row">
                      <span>Scheduler:</span>
                      <strong>Euler a (30 stp)</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom live diff status */}
              <div className="mg-compare-status-bar">
                <span className="mg-status-indicator" />
                <span>
                  {compareMetric === 'resolution' && 'Difference: Illustrious defaults to 832x1216 portrait; Pony requires 1024x1024 native.'}
                  {compareMetric === 'vram' && 'Difference: Illustrious runs in 6GB with --medvram; Pony requires 8GB for native batch.'}
                  {compareMetric === 'architecture' && 'Difference: Both use Dual OpenCLIP ViT-L with Danbooru tag conditioning weights.'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            FEATURE 02: Visual Generation Gallery (/gallery)
            Distinct composition: Clipping-mask image showcase + generation overlay
            =================================================================== */}
        <div className={`mg-feature-row mg-feature-reverse mg-feature-gallery ${activeStep >= 2 ? 'is-active' : ''}`} id="feat-gallery">
          <div className="mg-feature-visual mg-visual-gallery">
            <div className="mg-gallery-composition">
              <div className="mg-gallery-card primary-card">
                <img
                  src="https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/e621bef5-8aa3-49b8-9abe-a61aca533159/original=true/e621bef5-8aa3-49b8-9abe-a61aca533159.jpeg"
                  alt="Generation Gallery Output"
                  className="mg-gallery-img"
                  loading="lazy"
                  onLoad={() => updatePathGeometry()}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/preview-1.png';
                  }}
                />
                <div className="mg-gallery-overlay">
                  <div className="mg-overlay-badge">ILLUSTRIOUS XL &bull; SEED: 1574517680</div>
                  <p className="mg-overlay-prompt">
                    &ldquo;1girl, ho'olheyak, sidelighting, dynamic shadows, laboratory-like, warm illumination...&rdquo;
                  </p>
                  <div className="mg-overlay-meta">
                    <span>Sampler: Euler a</span>
                    <span>Steps: 28</span>
                    <span>CFG: 5.5</span>
                    <span>Res: 1024 &times; 1360</span>
                  </div>
                </div>
              </div>

              <div className="mg-gallery-card secondary-card">
                <img
                  src="https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/37ff4f9a-b8ab-4f1a-a8fa-3ab55dc7d282/original=true/61631201.jpeg"
                  alt="Secondary Generation Output"
                  className="mg-gallery-img"
                  loading="lazy"
                  onLoad={() => updatePathGeometry()}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/preview-2.png';
                  }}
                />
                <div className="mg-gallery-mini-badge">
                  <span>HI-RES 1.5x</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mg-feature-info">
            {/* Step Node 02 */}
            <div className={`mg-step-node-anchor ${activeStep >= 2 ? 'node-active' : ''}`} ref={node2Ref}>
              <div className="mg-node-pin">
                <span className="mg-node-ring" />
                <span className="mg-node-index">02</span>
              </div>
              <div className="mg-node-meta">
                <span className="mg-node-type">FEATURE 02</span>
                <span className="mg-node-title">GENERATION GALLERY</span>
              </div>
            </div>

            <h3 className="mg-feature-heading">
              Generation Gallery
            </h3>
            <p className="mg-feature-copy">
              Browse visual references and explore curated sample images generated by each model.
              Every gallery entry is attached to complete, reproducible generation telemetry: prompts, seeds, samplers, and upscaling configurations.
            </p>

            <div className="mg-feature-bullets">
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>One-click prompt and negative prompt copying</span>
              </div>
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>Full-resolution lightbox view with high-res zoom</span>
              </div>
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>Filter by base model, tags, and creator collections</span>
              </div>
            </div>

            <Link to="/gallery" className="mg-btn mg-btn-primary">
              <span>Explore Generation Gallery</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>

        {/* ===================================================================
            FEATURE 03: Metadata Inspector (/inspector)
            Distinct composition: Terminal telemetry + parameter extraction stream
            =================================================================== */}
        <div className={`mg-feature-row mg-feature-inspector ${activeStep >= 3 ? 'is-active' : ''}`} id="feat-inspector">
          <div className="mg-feature-info">
            {/* Step Node 03 */}
            <div className={`mg-step-node-anchor ${activeStep >= 3 ? 'node-active' : ''}`} ref={node3Ref}>
              <div className="mg-node-pin">
                <span className="mg-node-ring" />
                <span className="mg-node-index">03</span>
              </div>
              <div className="mg-node-meta">
                <span className="mg-node-type">FEATURE 03</span>
                <span className="mg-node-title">METADATA INSPECTOR</span>
              </div>
            </div>

            <h3 className="mg-feature-heading">
              Metadata Inspector
            </h3>
            <p className="mg-feature-copy">
              Inspect technical details and inference parameters embedded directly into PNG and JPEG image chunks.
              Extract prompt trees, LoRA weights, clip skip values, and export directly into A1111, Forge, or ComfyUI workflows.
            </p>

            <div className="mg-feature-bullets">
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>Zero backend upload: in-browser byte-level chunk extraction without cloud latency</span>
              </div>
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>SafeTensors architecture: zero-copy memory mapping with zero executable code risk</span>
              </div>
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>Automatic ComfyUI graph and A1111 raw parameter translation</span>
              </div>
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>Identify LoRA rank, alpha values, and model checkpoint hashes</span>
              </div>
            </div>

            <Link to="/inspector" className="mg-btn mg-btn-primary">
              <span>Inspect Image Metadata</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>

          <div className="mg-feature-visual mg-visual-inspector">
            <div className="mg-terminal-window">
              <div className="mg-terminal-titlebar">
                <div className="mg-terminal-dots">
                  <span className="dot dot-red" />
                  <span className="dot dot-yellow" />
                  <span className="dot dot-green" />
                </div>
                <span className="mg-terminal-title">metadata_inspector_v2.4 &bull; png_chunk_parser</span>
                <span className="mg-terminal-status">READY</span>
              </div>

              <div className="mg-terminal-body">
                <div className="mg-term-line mg-term-cmd">
                  <span className="mg-prompt-sym">$</span> mg-inspect analyze --source sample_diffusion.png
                </div>
                <div className="mg-term-line mg-term-dim">
                  [OK] Chunk header: tEXt / parameters detected (1,482 bytes)
                </div>
                <div className="mg-term-divider" />

                <div className="mg-term-entry">
                  <span className="mg-entry-key">POSITIVE PROMPT:</span>
                  <span className="mg-entry-val">
                    masterpiece, best quality, 1girl, asakura toru, lying on back, white dress, collarbone, parted lips
                  </span>
                </div>

                <div className="mg-term-entry">
                  <span className="mg-entry-key">NEGATIVE PROMPT:</span>
                  <span className="mg-entry-val">
                    worst quality, low quality, bad anatomy, bad hands, text, watermark
                  </span>
                </div>

                <div className="mg-term-grid-params">
                  <div className="mg-param-badge">
                    <span>STEPS:</span> <strong>30</strong>
                  </div>
                  <div className="mg-param-badge">
                    <span>SAMPLER:</span> <strong>Euler a</strong>
                  </div>
                  <div className="mg-param-badge">
                    <span>CFG:</span> <strong>5.5</strong>
                  </div>
                  <div className="mg-param-badge">
                    <span>SEED:</span> <strong>2473992611</strong>
                  </div>
                  <div className="mg-param-badge">
                    <span>SIZE:</span> <strong>1024 &times; 1360</strong>
                  </div>
                  <div className="mg-param-badge">
                    <span>MODEL HASH:</span> <strong>e621bef5</strong>
                  </div>
                </div>

                <div className="mg-term-line mg-term-action">
                  <button
                    type="button"
                    className="mg-action-pill"
                    onClick={() => copyToken(JSON.stringify({
                      "3": {
                        "inputs": {
                          "seed": 2473992611,
                          "steps": 30,
                          "cfg": 5.5,
                          "sampler_name": "euler_ancestral",
                          "scheduler": "normal",
                          "denoise": 1
                        },
                        "class_type": "KSampler"
                      }
                    }, null, 2))}
                  >
                    &rarr; Export to ComfyUI JSON
                  </button>
                  <button
                    type="button"
                    className="mg-action-pill"
                    onClick={() => copyToken('masterpiece, best quality, 1girl, asakura toru, lying on back, white dress, collarbone, parted lips\nNegative prompt: worst quality, low quality, bad anatomy, bad hands, text, watermark\nSteps: 30, Sampler: Euler a, CFG: 5.5, Seed: 2473992611, Size: 1024x1360, Model hash: e621bef5')}
                  >
                    &rarr; Copy A1111 Prompt Text
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            FEATURE 04: Prompt Lab (/prompt-lab)
            Distinct composition: Token weighting studio + interactive tags
            =================================================================== */}
        <div className={`mg-feature-row mg-feature-reverse mg-feature-promptlab ${activeStep >= 4 ? 'is-active' : ''}`} id="feat-promptlab">
          <div className="mg-feature-visual mg-visual-promptlab">
            <div className="mg-promptlab-preview">
              <div className="mg-promptlab-bar">
                <span className="mg-bar-label">PROMPT WEIGHT MATRIX</span>
                <span className="mg-bar-count">8 TOKENS ACTIVE</span>
              </div>

              {/* Interactive Token Tag Cloud */}
              <div className="mg-token-cloud">
                {[
                  { tag: 'masterpiece', weight: '1.0', type: 'quality' },
                  { tag: 'best quality', weight: '1.0', type: 'quality' },
                  { tag: '1girl', weight: '1.0', type: 'subject' },
                  { tag: 'ho\'olheyak', weight: '1.2', type: 'character' },
                  { tag: 'sidelighting', weight: '1.1', type: 'lighting' },
                  { tag: 'dynamic shadows', weight: '1.0', type: 'lighting' },
                  { tag: 'warm illumination', weight: '1.0', type: 'palette' },
                  { tag: 'laboratory', weight: '0.9', type: 'environment' },
                ].map((t) => (
                  <button
                    key={t.tag}
                    type="button"
                    className={`mg-token-pill mg-token-${t.type}`}
                    onClick={() => copyToken(t.weight === '1.0' ? t.tag : `(${t.tag}:${t.weight})`)}
                    title="Click to copy token syntax"
                  >
                    <span className="mg-token-name">{t.tag}</span>
                    <span className="mg-token-w">{t.weight}</span>
                  </button>
                ))}
              </div>

              {copiedToken && (
                <div className="mg-token-copied-toast">
                  Copied &ldquo;{copiedToken}&rdquo; to clipboard
                </div>
              )}

              {/* Weight Adjustment Simulation */}
              <div className="mg-promptlab-controls">
                <div className="mg-control-row">
                  <span className="mg-control-label">Emphasis Syntax:</span>
                  <code className="mg-syntax-sample">(ho'olheyak:1.20), (sidelighting:1.10)</code>
                </div>
                <div className="mg-control-row">
                  <span className="mg-control-label">Negative Preset:</span>
                  <span className="mg-preset-chip">Illustrious Standard v2 (Clean Anime)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mg-feature-info">
            {/* Step Node 04 */}
            <div className={`mg-step-node-anchor ${activeStep >= 4 ? 'node-active' : ''}`} ref={node4Ref}>
              <div className="mg-node-pin">
                <span className="mg-node-ring" />
                <span className="mg-node-index">04</span>
              </div>
              <div className="mg-node-meta">
                <span className="mg-node-type">FEATURE 04</span>
                <span className="mg-node-title">PROMPT LAB</span>
              </div>
            </div>

            <h3 className="mg-feature-heading">
              Prompt Lab
            </h3>
            <p className="mg-feature-copy">
              Organize, build, and experiment with prompts in a focused workspace.
              Clean duplicate tags, balance attention weights, manage character presets, and save reusable parameter templates.
            </p>

            <div className="mg-feature-bullets">
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>Visual token weighting with real-time bracket syntax formatting</span>
              </div>
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>One-click tag cleaner: eliminates redundant Danbooru commas and brackets</span>
              </div>
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>Preset library with 50+ tested anime lighting, style, and artist configurations</span>
              </div>
            </div>

            <Link to="/prompt-lab" className="mg-btn mg-btn-primary">
              <span>Open Prompt Lab</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>

        {/* ===================================================================
            FEATURE 05: Resolution Calculator (/calculator)
            Distinct composition: Aspect ratio dimension bounding box & snap-64 math
            =================================================================== */}
        <div className={`mg-feature-row mg-feature-calculator ${activeStep >= 5 ? 'is-active' : ''}`} id="feat-calculator">
          <div className="mg-feature-info">
            {/* Step Node 05 */}
            <div className={`mg-step-node-anchor ${activeStep >= 5 ? 'node-active' : ''}`} ref={node5Ref}>
              <div className="mg-node-pin">
                <span className="mg-node-ring" />
                <span className="mg-node-index">05</span>
              </div>
              <div className="mg-node-meta">
                <span className="mg-node-type">FEATURE 05</span>
                <span className="mg-node-title">RESOLUTION CALCULATOR</span>
              </div>
            </div>

            <h3 className="mg-feature-heading">
              Resolution Calculator
            </h3>
            <p className="mg-feature-copy">
              Explore image dimensions and resolution bucket calculations for your workflow.
              Avoid distortion, duplicate heads, and out-of-memory errors by aligning with trained base aspect ratios and 64-pixel VAE boundaries.
            </p>

            <div className="mg-feature-bullets">
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>Exact 64-pixel VAE lattice snapping for SDXL, Illustrious, and SD 1.5</span>
              </div>
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>Hi-Res Fix upscale multiplier calculations (1.5x, 2.0x) with target megapixel tracking</span>
              </div>
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>Aspect ratio presets: 1:1 Square, 2:3 Portrait, 16:9 Cinema, 21:9 Ultrawide</span>
              </div>
            </div>

            <Link to="/calculator" className="mg-btn mg-btn-primary">
              <span>Calculate Optimal Resolutions</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>

          <div className="mg-feature-visual mg-visual-calculator">
            <div className="mg-calc-visualizer">
              {/* Aspect Ratio Switcher */}
              <div className="mg-aspect-selector">
                <button
                  type="button"
                  className={`mg-aspect-btn ${selectedAspect === 'portrait' ? 'active' : ''}`}
                  onClick={() => setSelectedAspect('portrait')}
                >
                  2:3 Portrait (832 &times; 1216)
                </button>
                <button
                  type="button"
                  className={`mg-aspect-btn ${selectedAspect === 'square' ? 'active' : ''}`}
                  onClick={() => setSelectedAspect('square')}
                >
                  1:1 Square (1024 &times; 1024)
                </button>
                <button
                  type="button"
                  className={`mg-aspect-btn ${selectedAspect === 'landscape' ? 'active' : ''}`}
                  onClick={() => setSelectedAspect('landscape')}
                >
                  3:2 Cinema (1216 &times; 832)
                </button>
              </div>

              {/* Dynamic Bounding Box Visualizer */}
              <div className="mg-dimension-box-wrapper">
                <div className={`mg-dimension-box aspect-${selectedAspect}`}>
                  <div className="mg-box-inner">
                    <span className="mg-box-dim-text">
                      {selectedAspect === 'portrait' && '832 × 1216'}
                      {selectedAspect === 'square' && '1024 × 1024'}
                      {selectedAspect === 'landscape' && '1216 × 832'}
                    </span>
                    <span className="mg-box-sub">
                      {selectedAspect === 'portrait' && 'Native Illustrious Portrait • 1.01 MP'}
                      {selectedAspect === 'square' && 'Native SDXL Square • 1.05 MP'}
                      {selectedAspect === 'landscape' && 'Native Landscape • 1.01 MP'}
                    </span>
                  </div>
                  {/* Visual grid ticks */}
                  <div className="mg-box-grid-markings" aria-hidden="true" />
                </div>
              </div>

              {/* Math & VAE Verification Strip */}
              <div className="mg-calc-math-strip">
                <div className="mg-math-item">
                  <span className="mg-math-k">VAE SNAP 64:</span>
                  <span className="mg-math-v mg-text-success">PERFECT MULTIPLE</span>
                </div>
                <div className="mg-math-item">
                  <span className="mg-math-k">HI-RES FIX (1.5x):</span>
                  <span className="mg-math-v">
                    {selectedAspect === 'portrait' && '1248 × 1824'}
                    {selectedAspect === 'square' && '1536 × 1536'}
                    {selectedAspect === 'landscape' && '1824 × 1248'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {copiedToken && (
        <div className="mg-story-toast" role="status" aria-live="polite">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Copied &ldquo;{copiedToken.length > 36 ? copiedToken.slice(0, 36) + '...' : copiedToken}&rdquo; to clipboard</span>
        </div>
      )}
    </section>
  );
}
