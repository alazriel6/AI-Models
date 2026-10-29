import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';

export function FeatureStorytelling() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const glowPathRef = useRef<SVGPathElement | null>(null);
  const coreLaserRef = useRef<SVGPathElement | null>(null);
  const streamRef = useRef<SVGPathElement | null>(null);

  // References to the 6 step nodes to calculate exact path coordinates
  const node1Ref = useRef<HTMLDivElement | null>(null);
  const node2Ref = useRef<HTMLDivElement | null>(null);
  const node3Ref = useRef<HTMLDivElement | null>(null);
  const node4Ref = useRef<HTMLDivElement | null>(null);
  const node5Ref = useRef<HTMLDivElement | null>(null);
  const node6Ref = useRef<HTMLDivElement | null>(null);

  const [pathD, setPathD] = useState<string>('');
  const [svgSize, setSvgSize] = useState<{ width: number; height: number }>({ width: 1200, height: 3200 });
  const [activeStep, setActiveStep] = useState<number>(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return 6;
    }
    return 0;
  });

  // Cached node points and arc lengths along SVG path for zero-offset scroll synchronization
  const nodePointsRef = useRef<{ x: number; y: number }[]>([]);
  const nodeLengthsRef = useRef<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const pinsRef = useRef<HTMLElement[]>([]);
  const pinDocTopsRef = useRef<number[]>([]);
  const activeStepRef = useRef<number>(0);
  const totalLengthRef = useRef<number>(0);
  const isSectionActiveRef = useRef<boolean>(false);
  const lastOffsetRef = useRef<number>(-1);

  // Active interactive states for feature previews
  const [compareMetric, setCompareMetric] = useState<'resolution' | 'vram' | 'architecture'>('resolution');
  const [selectedAspect, setSelectedAspect] = useState<'portrait' | 'square' | 'landscape'>('portrait');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Mobile simplified view state: active tab (1-6) and showAll toggle to prevent extreme scrolling
  const [mobileActiveFeature, setMobileActiveFeature] = useState<number>(1);
  const [mobileShowAllFeatures, setMobileShowAllFeatures] = useState<boolean>(false);

  // Interactive LoRA Stack weights state
  const [loraWeights, setLoraWeights] = useState<{ [key: string]: number }>({
    lineart: 0.80,
    lighting: 0.65,
    cyber: 0.45,
  });

  const totalLoraWeight = Math.round((loraWeights.lineart + loraWeights.lighting + loraWeights.cyber) * 100) / 100;
  const isLoraOverbaked = totalLoraWeight > 2.2;

  const adjustLoraWeight = (key: string, delta: number) => {
    setLoraWeights((prev) => {
      const current = prev[key] ?? 0.5;
      const next = Math.max(0.1, Math.min(1.5, Math.round((current + delta) * 10) / 10));
      return { ...prev, [key]: next };
    });
  };

  // Build dynamic SVG path threading through all feature pins
  const updatePathGeometry = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const w = Math.round(containerRect.width);
    const h = Math.round(containerRect.height || container.scrollHeight);

    if (w <= 0 || h <= 0) return;

    setSvgSize({ width: w, height: h });

    const nodes = [node1Ref, node2Ref, node3Ref, node4Ref, node5Ref, node6Ref];

    // Compute exact subpixel center coordinates for each node's circular pin
    const pinCoords: { x: number; y: number }[] = [];
    const pinTargets: HTMLElement[] = [];
    const docTops: number[] = [];
    const scrollY = window.scrollY || window.pageYOffset;

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
        docTops.push(Math.round(rect.top + scrollY));
      }
    });

    pinsRef.current = pinTargets;
    pinDocTopsRef.current = docTops;

    if (pinCoords.length < 6) return;

    const points: { x: number; y: number }[] = [];

    // 1. Initial point: directly under the section header, aligned on pin 1's vertical axis
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

    const t0 = setTimeout(updatePathGeometry, 60);
    const t1 = setTimeout(updatePathGeometry, 220);
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

      // Initialize strokeDasharray and initial strokeDashoffset once on geometry update
      const pathsToInit = [pathRef.current, glowPathRef.current, coreLaserRef.current];
      pathsToInit.forEach((p) => {
        if (p) {
          p.style.strokeDasharray = `${total}`;
          p.style.strokeDashoffset = `${total}`;
        }
      });
      lastOffsetRef.current = total;
    } catch {
      // SVG geometry calculating
    }
  }, [pathD]);

  // Synchronized scroll progress tracking
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let rafId: number;

    const handleScroll = () => {
      if (!isSectionActiveRef.current) return;
      const path = pathRef.current;
      if (!path) return;

      const triggerY = window.innerHeight * 0.52; // Eye-level reading activation line
      const docTops = pinDocTopsRef.current;
      if (docTops.length < 6) return;

      const scrollY = window.scrollY || window.pageYOffset;
      const nodeTops = docTops.map((dt) => dt - scrollY);

      // 1. Determine active step based on eye-level trigger line
      let currentStep = 0;
      nodeTops.forEach((top, idx) => {
        if (top <= triggerY + 30) {
          currentStep = idx + 1;
        }
      });

      if (activeStepRef.current !== currentStep) {
        activeStepRef.current = currentStep;
        setActiveStep(currentStep);
      }

      // 2. Synchronized path length interpolation between nodes
      const lengths = nodeLengthsRef.current;
      const totalLength = totalLengthRef.current || (path ? path.getTotalLength() : 0);
      if (totalLength <= 0) return;

      let currentLength = 0;

      if (nodeTops[0] > triggerY) {
        // Approaching Node 1 from header
        const enterY = window.innerHeight * 0.85;
        const progress = Math.min(Math.max((enterY - nodeTops[0]) / (enterY - triggerY), 0), 1);
        const L1 = lengths[1] || (totalLength / 6);
        currentLength = progress * L1;
      } else {
        let found = false;
        for (let i = 0; i < nodeTops.length - 1; i++) {
          const tCur = nodeTops[i];
          const tNext = nodeTops[i + 1];
          if (tNext > triggerY) {
            const progress = Math.min(Math.max((triggerY - tCur) / (tNext - tCur), 0), 1);
            const lCur = lengths[i + 1] || (totalLength * ((i + 1) / (nodeTops.length + 1)));
            const lNext = lengths[i + 2] || (totalLength * ((i + 2) / (nodeTops.length + 1)));
            currentLength = lCur + progress * (lNext - lCur);
            found = true;
            break;
          }
        }
        if (!found) {
          const lastTop = nodeTops[nodeTops.length - 1];
          const lastL = lengths[nodeTops.length] || (totalLength * 0.95);
          const progress = Math.min(Math.max((triggerY - lastTop) / 250, 0), 1);
          currentLength = lastL + progress * (totalLength - lastL);
        }
      }

      // Apply stroke dashoffset across layered laser paths
      const offset = Math.max(0, totalLength - currentLength);
      if (Math.abs(offset - lastOffsetRef.current) > 0.5) {
        lastOffsetRef.current = offset;
        const pathsToUpdate = [pathRef.current, glowPathRef.current, coreLaserRef.current];
        pathsToUpdate.forEach((p) => {
          if (p) {
            p.style.strokeDashoffset = `${offset}`;
          }
        });
      }
    };

    const onScrollThrottled = () => {
      if (!isSectionActiveRef.current) return;
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
    setTimeout(() => setCopiedToken(null), 2200);
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

              {/* 2. Active Ambient Wide Glow Aura - GPU hardware composited */}
              <path
                ref={glowPathRef}
                d={pathD}
                fill="none"
                stroke="rgba(56, 189, 248, 0.35)"
                strokeWidth="10"
                strokeLinecap="round"
                className="mg-spine-laser-glow"
              />

              {/* 3. Active Traveling Glowing Main Path - GPU hardware composited */}
              <path
                ref={pathRef}
                d={pathD}
                fill="none"
                stroke="url(#beam-gradient)"
                strokeWidth="3.5"
                strokeLinecap="round"
                className="mg-spine-laser-main"
              />

              {/* 4. Active Fiber-Optic Core Laser */}
              <path
                ref={coreLaserRef}
                d={pathD}
                fill="none"
                stroke="rgba(255, 255, 255, 0.85)"
                strokeWidth="1.2"
                strokeLinecap="round"
                className="mg-spine-laser-active"
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
            <span className="mg-tag-text">INTEGRATED TOOLSET &amp; WORKFLOW</span>
          </div>
          <h2 className="mg-features-title">
            Suite Utilitas Generatif untuk Kreator AI &amp; Anime
          </h2>
          <p className="mg-features-subtitle">
            Rangkaian perkakas lengkap yang dirancang khusus untuk mengoptimalkan workflow generasi visual: mulai dari komparasi arsitektur model, studio prompt 10 layer Danbooru, penumpukan LoRA anti-burnout, inspeksi metadata SafeTensors, hingga kalkulasi resolusi VAE lattice.
          </p>
        </div>

        {/* Mobile Interactive Feature Tab Switcher (Visible on <= 768px only) */}
        <div className="mg-features-mobile-nav" role="tablist" aria-label="Pilih Fitur Generatif">
          {[
            { id: 1, label: '01 Komparasi' },
            { id: 2, label: '02 Prompt Lab' },
            { id: 3, label: '03 Visualizer' },
            { id: 4, label: '04 LoRA Stack' },
            { id: 5, label: '05 Inspector' },
            { id: 6, label: '06 VAE Calc' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={mobileActiveFeature === tab.id}
              className={`mg-feature-mobile-chip ${mobileActiveFeature === tab.id ? 'is-active' : ''}`}
              onClick={() => {
                setMobileActiveFeature(tab.id);
                setMobileShowAllFeatures(false);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ===================================================================
            FEATURE 01: Model Comparison (/compare)
            Layout: Info Left | Visual Right
            =================================================================== */}
        <div
          className={`mg-feature-row mg-feature-compare ${activeStep >= 1 ? 'is-active' : ''} ${!mobileShowAllFeatures && mobileActiveFeature !== 1 ? 'mobile-hidden-feature' : ''}`}
          id="feat-compare"
        >
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
              Komparasi Model Multi-Slot
            </h3>
            <p className="mg-feature-copy">
              Bandingkan karakteristik teknis model, bobot conditioning, arsitektur Text Encoder, dan footprint VRAM secara berdampingan. Temukan perbedaan presisi antara base checkpoint dan varian fine-tune sebelum memulai sesi generate gambar.
            </p>

            <div className="mg-feature-bullets">
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>Multi-slot simultan: sandingkan 2 hingga 3 model sekaligus dalam satu layar komparasi</span>
              </div>
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>Highlighter perbedaan parameter: periksa perbedaan resolusi native, clip skip, VRAM requirement, dan recommended sampler secara real-time</span>
              </div>
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>Pintasan terintegrasi ke prompt terverifikasi dan galeri visual sampel dari masing-masing checkpoint</span>
              </div>
            </div>

            <Link to="/compare" className="mg-btn mg-btn-primary">
              <span>Buka Model Comparison</span>
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
                  Resolusi &amp; Rasio
                </button>
                <button
                  type="button"
                  className={`mg-mini-tab ${compareMetric === 'vram' ? 'active' : ''}`}
                  onClick={() => setCompareMetric('vram')}
                >
                  VRAM &amp; Memori
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

              {/* Bottom live diff status in Indonesian */}
              <div className="mg-compare-status-bar">
                <span className="mg-status-indicator" />
                <span>
                  {compareMetric === 'resolution' && 'Analisis: Illustrious optimal pada rasio portrait 832×1216; Pony membutuhkan 1024×1024 square native.'}
                  {compareMetric === 'vram' && 'Analisis: Illustrious lancar di VRAM 6GB dengan --medvram; Pony membutuhkan minimal 8GB untuk full batch.'}
                  {compareMetric === 'architecture' && 'Analisis: Keduanya memakai Dual OpenCLIP ViT-L dengan bobot conditioning tag Danbooru.'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            FEATURE 02: Prompt Studio & Lab (/prompt-lab)
            Layout: Visual Left | Info Right
            =================================================================== */}
        <div
          className={`mg-feature-row mg-feature-reverse mg-feature-promptlab ${activeStep >= 2 ? 'is-active' : ''} ${!mobileShowAllFeatures && mobileActiveFeature !== 2 ? 'mobile-hidden-feature' : ''}`}
          id="feat-promptlab"
        >
          <div className="mg-feature-visual mg-visual-promptlab">
            <div className="mg-promptlab-preview">
              <div className="mg-promptlab-bar">
                <span className="mg-bar-label">DANBOORU TOKEN MATRIX</span>
                <span className="mg-bar-count">8 TAG AKTIF</span>
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
                    title="Klik untuk menyalin tag ke clipboard"
                  >
                    <span className="mg-token-name">{t.tag}</span>
                    <span className="mg-token-w">{t.weight}</span>
                  </button>
                ))}
              </div>

              {copiedToken && (
                <div className="mg-token-copied-toast">
                  Tag &ldquo;{copiedToken}&rdquo; berhasil disalin!
                </div>
              )}

              {/* Weight Adjustment Simulation */}
              <div className="mg-promptlab-controls">
                <div className="mg-control-row">
                  <span className="mg-control-label">Sintaks Pembobotan:</span>
                  <code className="mg-syntax-sample">(ho'olheyak:1.20), (sidelighting:1.10)</code>
                </div>
                <div className="mg-control-row">
                  <span className="mg-control-label">Preset Negative:</span>
                  <span className="mg-preset-chip">Illustrious Standard Clean Anime v2</span>
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
                <span className="mg-node-title">PROMPT STUDIO &amp; LAB</span>
              </div>
            </div>

            <h3 className="mg-feature-heading">
              Prompt Studio &amp; Lab Canvas
            </h3>
            <p className="mg-feature-copy">
              Susun prompt anime modular dengan arsitektur 10 layer visual (Karakter, Kostum, Pose, Rambut, Lighting, Komposisi, dsb.). Dilengkapi autokomplit lebih dari 100.000 tag Danbooru, pembobotan kurung real-time, dan fitur deconstruction prompt instan.
            </p>

            <div className="mg-feature-bullets">
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>Autokomplit 100.000+ tag Danbooru: pencarian cepat karakter, outfit, pose, dan artis langsung dari database lokal</span>
              </div>
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>Prompt Deconstructor &amp; AI Transformer: tempelkan prompt acak dari Civitai atau Twitter untuk otomatis dipetakan ke dalam 10 kategori visual</span>
              </div>
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>Visual Token Weighting: atur penekanan kurung (tag:weight) dengan visual slider, tag cleaner otomatis, dan library preset teruji</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px' }}>
              <Link to="/prompt-lab" className="mg-btn mg-btn-primary">
                <span>Buka Prompt Studio &amp; Lab</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
              <Link to="/negative-vault" className="mg-btn mg-btn-secondary" title="Kelola Negative Vault &amp; Embeddings">
                <span>Negative Vault</span>
              </Link>
              <Link to="/story-merger" className="mg-btn mg-btn-secondary" title="Preset Storyboard &amp; Character Lock">
                <span>Story Merger</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ===================================================================
            FEATURE 03: Generation Gallery (/gallery)
            Layout: Info Left | Visual Right
            =================================================================== */}
        <div
          className={`mg-feature-row mg-feature-gallery ${activeStep >= 3 ? 'is-active' : ''} ${!mobileShowAllFeatures && mobileActiveFeature !== 3 ? 'mobile-hidden-feature' : ''}`}
          id="feat-gallery"
        >
          <div className="mg-feature-info">
            {/* Step Node 03 */}
            <div className={`mg-step-node-anchor ${activeStep >= 3 ? 'node-active' : ''}`} ref={node3Ref}>
              <div className="mg-node-pin">
                <span className="mg-node-ring" />
                <span className="mg-node-index">03</span>
              </div>
              <div className="mg-node-meta">
                <span className="mg-node-type">FEATURE 03</span>
                <span className="mg-node-title">GENERATION GALLERY</span>
              </div>
            </div>

            <h3 className="mg-feature-heading">
              Galeri Generasi Terverifikasi
            </h3>
            <p className="mg-feature-copy">
              Jelajahi visual showcase dan gambar kurasi yang dihasilkan langsung oleh tiap checkpoint model di Models Guide. Setiap karya dilengkapi telemetri prompt lengkap yang 100% reproducible: siap disalin dan dijalankan langsung di mesin Anda.
            </p>

            <div className="mg-feature-bullets">
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>One-Click Prompt Telemetry: salin positive prompt, negative prompt, seed, sampler, dan upscaling setting dengan satu klik</span>
              </div>
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>Tampilan Lightbox Resolusi Penuh: zoom detail tinggi untuk memeriksa kualitas lineart, rendering mata, dan tekstur gambar</span>
              </div>
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>Filter katalog terpadu: telusuri output berdasarkan base model (Illustrious, NoobAI, SDXL, Pony) dan kategori tag visual</span>
              </div>
            </div>

            <Link to="/gallery" className="mg-btn mg-btn-primary">
              <span>Jelajahi Generation Gallery</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>

          <div className="mg-feature-visual mg-visual-gallery">
            <div className="mg-gallery-composition">
              <div className="mg-gallery-card primary-card">
                <img
                  src="https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/e621bef5-8aa3-49b8-9abe-a61aca533159/original=true/e621bef5-8aa3-49b8-9abe-a61aca533159.jpeg"
                  alt="Generation Gallery Output"
                  className="mg-gallery-img"
                  loading="lazy"
                  decoding="async"
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
                  decoding="async"
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
        </div>

        {/* ===================================================================
            FEATURE 04: LoRA Stack Builder (/lora-stack)
            Layout: Visual Left | Info Right
            =================================================================== */}
        <div
          className={`mg-feature-row mg-feature-reverse mg-feature-lorastack ${activeStep >= 4 ? 'is-active' : ''} ${!mobileShowAllFeatures && mobileActiveFeature !== 4 ? 'mobile-hidden-feature' : ''}`}
          id="feat-lorastack"
        >
          <div className="mg-feature-visual mg-visual-lorastack">
            <div className="mg-lorastack-preview">
              <div className="mg-lorastack-topbar">
                <span className="mg-lorastack-label">MULTI-LAYER LORA COMPOSER</span>
                <span className={`mg-lorastack-guard-badge ${isLoraOverbaked ? 'warning' : ''}`}>
                  <span className="mg-guard-pulse" />
                  {isLoraOverbaked ? 'PERINGATAN: OVER-BAKED' : 'BURNOUT GUARD: AMAN'}
                </span>
              </div>

              {/* Layer stack items with live controls */}
              <div className="mg-lorastack-layers">
                <div className="mg-lora-layer-item">
                  <div className="mg-lora-layer-header">
                    <div className="mg-lora-layer-meta">
                      <span className="mg-lora-layer-num">01</span>
                      <span className="mg-lora-layer-title">Detailed Anime Lineart v2</span>
                      <span className="mg-lora-layer-tag">Illustrious</span>
                    </div>
                    <div className="mg-lora-weight-control">
                      <button type="button" className="mg-weight-btn" onClick={() => adjustLoraWeight('lineart', -0.1)} title="Kurangi bobot">-</button>
                      <span className="mg-lora-weight-val">{loraWeights.lineart.toFixed(2)}</span>
                      <button type="button" className="mg-weight-btn" onClick={() => adjustLoraWeight('lineart', 0.1)} title="Tambah bobot">+</button>
                    </div>
                  </div>
                  <div className="mg-lora-trigger-row">
                    <span className="mg-lora-trigger-label">TRIGGERS:</span>
                    <span className="mg-lora-trigger-tag">clean lineart</span>
                    <span className="mg-lora-trigger-tag">anime aesthetic</span>
                  </div>
                </div>

                <div className="mg-lora-layer-item">
                  <div className="mg-lora-layer-header">
                    <div className="mg-lora-layer-meta">
                      <span className="mg-lora-layer-num">02</span>
                      <span className="mg-lora-layer-title">Warm Sunset Golden Hour</span>
                      <span className="mg-lora-layer-tag">SDXL / Pony</span>
                    </div>
                    <div className="mg-lora-weight-control">
                      <button type="button" className="mg-weight-btn" onClick={() => adjustLoraWeight('lighting', -0.1)} title="Kurangi bobot">-</button>
                      <span className="mg-lora-weight-val">{loraWeights.lighting.toFixed(2)}</span>
                      <button type="button" className="mg-weight-btn" onClick={() => adjustLoraWeight('lighting', 0.1)} title="Tambah bobot">+</button>
                    </div>
                  </div>
                  <div className="mg-lora-trigger-row">
                    <span className="mg-lora-trigger-label">TRIGGERS:</span>
                    <span className="mg-lora-trigger-tag">warm lighting</span>
                    <span className="mg-lora-trigger-tag">golden hour rim light</span>
                  </div>
                </div>

                <div className="mg-lora-layer-item">
                  <div className="mg-lora-layer-header">
                    <div className="mg-lora-layer-meta">
                      <span className="mg-lora-layer-num">03</span>
                      <span className="mg-lora-layer-title">Mecha Cybernetic Accents</span>
                      <span className="mg-lora-layer-tag">Universal</span>
                    </div>
                    <div className="mg-lora-weight-control">
                      <button type="button" className="mg-weight-btn" onClick={() => adjustLoraWeight('cyber', -0.1)} title="Kurangi bobot">-</button>
                      <span className="mg-lora-weight-val">{loraWeights.cyber.toFixed(2)}</span>
                      <button type="button" className="mg-weight-btn" onClick={() => adjustLoraWeight('cyber', 0.1)} title="Tambah bobot">+</button>
                    </div>
                  </div>
                  <div className="mg-lora-trigger-row">
                    <span className="mg-lora-trigger-label">TRIGGERS:</span>
                    <span className="mg-lora-trigger-tag">cybernetic parts</span>
                    <span className="mg-lora-trigger-tag">glowing circuits</span>
                  </div>
                </div>
              </div>

              {/* Burnout Guard Meter */}
              <div className="mg-lora-burnout-meter">
                <div className="mg-meter-header">
                  <span>TOTAL STACK WEIGHT: <strong>{totalLoraWeight.toFixed(2)} / 2.50</strong></span>
                  <span className={isLoraOverbaked ? 'mg-text-warning' : 'mg-text-success'}>
                    {isLoraOverbaked ? 'Risiko Kontras Tinggi' : 'Batas Saturasi Optimal'}
                  </span>
                </div>
                <div className="mg-meter-track">
                  <div
                    className={`mg-meter-fill ${isLoraOverbaked ? 'warning' : ''}`}
                    style={{ width: `${Math.min(100, (totalLoraWeight / 2.5) * 100)}%` }}
                  />
                </div>
                <div className="mg-meter-sub">
                  <span>Target Aman: 0.8 &ndash; 2.0</span>
                  <span>Ambang Batas: 2.20+</span>
                </div>
              </div>

              {/* Generated Syntax Output */}
              <div className="mg-lorastack-output">
                <div className="mg-lorastack-syntax">
                  {`<lora:anime_lineart_v2:${loraWeights.lineart.toFixed(2)}>, <lora:warm_sunset:${loraWeights.lighting.toFixed(2)}>, <lora:cyber_accents:${loraWeights.cyber.toFixed(2)}>`}
                </div>
                <div className="mg-lorastack-actions">
                  <button
                    type="button"
                    className="mg-action-pill"
                    onClick={() => copyToken(`<lora:anime_lineart_v2:${loraWeights.lineart.toFixed(2)}>, <lora:warm_sunset:${loraWeights.lighting.toFixed(2)}>, <lora:cyber_accents:${loraWeights.cyber.toFixed(2)}>`)}
                  >
                    &rarr; Salin Sintaks WebUI (A1111 / Forge)
                  </button>
                  <button
                    type="button"
                    className="mg-action-pill"
                    onClick={() => copyToken(JSON.stringify({
                      loras: [
                        { name: "anime_lineart_v2", strength_model: loraWeights.lineart, strength_clip: loraWeights.lineart },
                        { name: "warm_sunset", strength_model: loraWeights.lighting, strength_clip: loraWeights.lighting },
                        { name: "cyber_accents", strength_model: loraWeights.cyber, strength_clip: loraWeights.cyber },
                      ]
                    }, null, 2))}
                  >
                    &rarr; Salin Schema ComfyUI
                  </button>
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
                <span className="mg-node-title">LORA STACK BUILDER</span>
              </div>
            </div>

            <h3 className="mg-feature-heading">
              LoRA Stack &amp; Burnout Guard
            </h3>
            <p className="mg-feature-copy">
              Gabungkan beberapa LoRA karakter, pose, dan style secara bersamaan tanpa merusak dynamic range gambar. Sistem otomatis menghitung batas saturasi (over-baking guard) dan menyusun trigger words yang siap diekspor ke berbagai tool.
            </p>

            <div className="mg-feature-bullets">
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>Burnout &amp; Over-Baking Guard: pemantauan total akumulasi bobot tensor secara real-time untuk mencegah visual terdistorsi atau warna terbakar</span>
              </div>
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>Auto-Trigger Word Injector: otomatis mengekstrak kata pemicu dari masing-masing LoRA dan menggabungkannya ke prompt utama</span>
              </div>
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>Ekspor multi-format: salin sintaks siap pakai untuk WebUI Automatic1111/Forge (&lt;lora:name:weight&gt;) maupun format node loader ComfyUI</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px' }}>
              <Link to="/lora-stack" className="mg-btn mg-btn-primary">
                <span>Buka LoRA Stack Builder</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
              <Link to="/workflows" className="mg-btn mg-btn-secondary" title="Buka ComfyUI Workflows">
                <span>ComfyUI Workflows</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ===================================================================
            FEATURE 05: Metadata Inspector (/inspector)
            Layout: Info Left | Visual Right
            =================================================================== */}
        <div
          className={`mg-feature-row mg-feature-inspector ${activeStep >= 5 ? 'is-active' : ''} ${!mobileShowAllFeatures && mobileActiveFeature !== 5 ? 'mobile-hidden-feature' : ''}`}
          id="feat-inspector"
        >
          <div className="mg-feature-info">
            {/* Step Node 05 */}
            <div className={`mg-step-node-anchor ${activeStep >= 5 ? 'node-active' : ''}`} ref={node5Ref}>
              <div className="mg-node-pin">
                <span className="mg-node-ring" />
                <span className="mg-node-index">05</span>
              </div>
              <div className="mg-node-meta">
                <span className="mg-node-type">FEATURE 05</span>
                <span className="mg-node-title">METADATA INSPECTOR</span>
              </div>
            </div>

            <h3 className="mg-feature-heading">
              Inspektor Metadata &amp; SafeTensors
            </h3>
            <p className="mg-feature-copy">
              Bedah parameter inferensi yang tertanam langsung di dalam chunk gambar PNG, JPEG, dan WebP, serta header file SafeTensors. Tanpa upload ke server: semua proses ekstraksi berjalan 100% di browser Anda dengan latensi nol dan privasi penuh.
            </p>

            <div className="mg-feature-bullets">
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>Zero-Upload Client-Side Parsing: ekstraksi header byte-level di browser tanpa membebani kuota data atau mengunggah gambar ke cloud</span>
              </div>
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>Deteksi parameter lengkap: baca prompt positif/negatif, seed, sampler K-Diffusion, steps, CFG scale, LoRA hash, hingga Clip Skip</span>
              </div>
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>Konversi instan workflow ComfyUI: salin struktur node graph JSON atau format teks baku A1111 / WebUI dalam satu klik</span>
              </div>
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>Didukung AI Vision Interrogator: integrasi opsional Google Gemini Vision dan Local Ollama untuk mengidentifikasi style dan tag gambar</span>
              </div>
            </div>

            <Link to="/inspector" className="mg-btn mg-btn-primary">
              <span>Inspeksi Metadata Gambar</span>
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
                <span className="mg-terminal-title">metadata_inspector_v2.4 &bull; in-browser_png_chunk_parser</span>
                <span className="mg-terminal-status">READY (ZERO-UPLOAD)</span>
              </div>

              <div className="mg-terminal-body">
                <div className="mg-term-line mg-term-cmd">
                  <span className="mg-prompt-sym">$</span> mg-inspect analyze --source sample_diffusion.png
                </div>
                <div className="mg-term-line mg-term-dim">
                  [OK] Header chunk tEXt/parameters terdeteksi (1.482 byte) &bull; 0ms latensi server
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
                    &rarr; Ekspor ke ComfyUI JSON
                  </button>
                  <button
                    type="button"
                    className="mg-action-pill"
                    onClick={() => copyToken('masterpiece, best quality, 1girl, asakura toru, lying on back, white dress, collarbone, parted lips\nNegative prompt: worst quality, low quality, bad anatomy, bad hands, text, watermark\nSteps: 30, Sampler: Euler a, CFG: 5.5, Seed: 2473992611, Size: 1024x1360, Model hash: e621bef5')}
                  >
                    &rarr; Salin Format A1111
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            FEATURE 06: Resolution Calculator (/calculator)
            Layout: Visual Left | Info Right
            =================================================================== */}
        <div
          className={`mg-feature-row mg-feature-reverse mg-feature-calculator ${activeStep >= 6 ? 'is-active' : ''} ${!mobileShowAllFeatures && mobileActiveFeature !== 6 ? 'mobile-hidden-feature' : ''}`}
          id="feat-calculator"
        >
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
                  <span className="mg-math-v mg-text-success">KELIPATAN SEMPURNA</span>
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

          <div className="mg-feature-info">
            {/* Step Node 06 */}
            <div className={`mg-step-node-anchor ${activeStep >= 6 ? 'node-active' : ''}`} ref={node6Ref}>
              <div className="mg-node-pin">
                <span className="mg-node-ring" />
                <span className="mg-node-index">06</span>
              </div>
              <div className="mg-node-meta">
                <span className="mg-node-type">FEATURE 06</span>
                <span className="mg-node-title">RESOLUTION CALCULATOR</span>
              </div>
            </div>

            <h3 className="mg-feature-heading">
              Kalkulator Resolusi &amp; VAE Lattice
            </h3>
            <p className="mg-feature-copy">
              Tentukan resolusi generasi yang presisi dan kompatibel dengan arsitektur model Anda. Hindari distorsi anatomi, kepala ganda, dan error VRAM Out-of-Memory (OOM) dengan memastikan dimensi gambar selalu selaras pada kelipatan 64-pixel VAE lattice.
            </p>

            <div className="mg-feature-bullets">
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>VAE Snap-64 Pixel Lattice: perhitungan dimensi matematis berbasis kelipatan 64 pixel untuk SDXL, Illustrious, NoobAI, dan SD 1.5</span>
              </div>
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>Kalkulasi Hi-Res Fix Multiplier: simulasi resolusi upscale 1.5x dan 2.0x dengan estimasi target megapixel (MP) dan beban VRAM</span>
              </div>
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>Preset rasio aspek populer: 1:1 Square, 2:3 Portrait anime standar, 16:9 Cinema, hingga 21:9 Ultrawide</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px' }}>
              <Link to="/calculator" className="mg-btn mg-btn-primary">
                <span>Hitung Resolusi Optimal</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
              <Link to="/vram" className="mg-btn mg-btn-secondary" title="Buka VRAM &amp; Hardware Profiler">
                <span>VRAM Profiler</span>
              </Link>
              <Link to="/controlnet" className="mg-btn mg-btn-secondary" title="Buka ControlNet &amp; OpenPose Rig">
                <span>ControlNet Studio</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile Expand / Collapse All 6 Features Toggle */}
        <div className="mg-features-mobile-toggle-wrap">
          <button
            type="button"
            className="mg-btn mg-btn-secondary mg-btn-mobile-expand"
            onClick={() => setMobileShowAllFeatures((prev) => !prev)}
          >
            <span>
              {mobileShowAllFeatures
                ? 'Gunakan Mode Tab Ringkas (Satu Fitur) ↑'
                : 'Tampilkan Semua 6 Fitur Sekaligus ↓'}
            </span>
          </button>
        </div>
      </div>

      {copiedToken && (
        <div className="mg-story-toast" role="status" aria-live="polite">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Berhasil menyalin &ldquo;{copiedToken.length > 36 ? copiedToken.slice(0, 36) + '...' : copiedToken}&rdquo; ke clipboard</span>
        </div>
      )}
    </section>
  );
}

export default FeatureStorytelling;
