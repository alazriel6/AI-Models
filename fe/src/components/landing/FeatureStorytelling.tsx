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

  // References to the 6 feature rows for direct DOM classList activation (zero React re-render overhead during scroll)
  const row1Ref = useRef<HTMLDivElement | null>(null);
  const row2Ref = useRef<HTMLDivElement | null>(null);
  const row3Ref = useRef<HTMLDivElement | null>(null);
  const row4Ref = useRef<HTMLDivElement | null>(null);
  const row5Ref = useRef<HTMLDivElement | null>(null);
  const row6Ref = useRef<HTMLDivElement | null>(null);

  const [pathD, setPathD] = useState<string>('');
  const [svgSize, setSvgSize] = useState<{ width: number; height: number }>({ width: 1200, height: 3200 });

  // Cached node points and arc lengths along SVG path for zero-offset scroll synchronization
  const nodePointsRef = useRef<{ x: number; y: number }[]>([]);
  const nodeLengthsRef = useRef<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const pinsRef = useRef<HTMLElement[]>([]);
  const pinDocTopsRef = useRef<number[]>([]);
  const activeStepRef = useRef<number>(0);
  const totalLengthRef = useRef<number>(0);
  const isSectionActiveRef = useRef<boolean>(false);
  const lastOffsetRef = useRef<number>(-1);

  // Feature 01: GPU Optical Comparator State
  const [loupeSplit, setLoupeSplit] = useState<number>(50);
  const [compareMetric, setCompareMetric] = useState<'resolution' | 'vram' | 'architecture'>('resolution');

  // Feature 02 & 05: Copied token / toast state
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Feature 03: Multi-GPU VRAM Profiler State
  const [selectedGpu, setSelectedGpu] = useState<'4060' | '4070' | '4090'>('4070');
  const [selectedQuant, setSelectedQuant] = useState<'fp16' | 'fp8' | 'gguf'>('fp16');

  // Feature 04: Interactive LoRA Oscilloscope State
  const [loraWeights, setLoraWeights] = useState<{ core: number; lighting: number; detail: number }>({
    core: 0.85,
    lighting: 0.65,
    detail: 0.45,
  });

  // Feature 06: Aspect ratio state
  const [selectedAspect, setSelectedAspect] = useState<'portrait' | 'square' | 'landscape'>('portrait');

  // Mobile simplified view state
  const [mobileActiveFeature, setMobileActiveFeature] = useState<number>(1);
  const [mobileShowAllFeatures, setMobileShowAllFeatures] = useState<boolean>(false);

  const totalLoraWeight = Math.round((loraWeights.core + loraWeights.lighting + loraWeights.detail) * 100) / 100;
  const isLoraOverbaked = totalLoraWeight > 2.1;

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

    // 1. Initial point directly under section header
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

    // 4. Smooth terminal curve below the last feature node
    const last = points[points.length - 1];
    d += ` C ${last.x} ${last.y + 35}, ${last.x} ${last.y + 65}, ${last.x} ${last.y + 90}`;

    setPathD(d);
  }, []);

  // Update geometry on mount, resize, and font settlement
  useEffect(() => {
    updatePathGeometry();

    const t0 = setTimeout(updatePathGeometry, 60);
    const t1 = setTimeout(updatePathGeometry, 240);
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

      // Fast monotonic vertical binary search on Y: 9 iterations per pin = 54 total calls instead of 700+ calls!
      for (let i = 1; i < pts.length; i++) {
        const targetY = pts[i].y;
        let low = lengths[i - 1];
        let high = total;
        for (let iter = 0; iter < 9; iter++) {
          const mid = (low + high) / 2;
          const pt = path.getPointAtLength(mid);
          if (pt.y < targetY) {
            low = mid;
          } else {
            high = mid;
          }
        }
        lengths.push((low + high) / 2);
      }

      nodeLengthsRef.current = lengths;

      // Initialize strokeDasharray and initial strokeDashoffset once
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

  // Synchronized scroll progress tracking (120FPS GPU composited)
  useEffect(() => {
    let rafId: number;

    const handleScroll = () => {
      if (!isSectionActiveRef.current) return;
      const path = pathRef.current;
      if (!path) return;

      const triggerY = window.innerHeight * 0.52;
      const docTops = pinDocTopsRef.current;
      if (docTops.length < 6) return;

      const scrollY = window.scrollY || window.pageYOffset;
      const nodeTops = docTops.map((dt) => dt - scrollY);

      // Determine active step
      let currentStep = 0;
      nodeTops.forEach((top, idx) => {
        if (top <= triggerY + 30) {
          currentStep = idx + 1;
        }
      });

      if (activeStepRef.current !== currentStep) {
        activeStepRef.current = currentStep;
        // Direct DOM class manipulation (Zero React re-render during scroll!)
        const rows = [row1Ref.current, row2Ref.current, row3Ref.current, row4Ref.current, row5Ref.current, row6Ref.current];
        const nodes = [node1Ref.current, node2Ref.current, node3Ref.current, node4Ref.current, node5Ref.current, node6Ref.current];
        for (let i = 0; i < 6; i++) {
          const row = rows[i];
          const node = nodes[i];
          if (row) {
            if (i + 1 <= currentStep) {
              row.classList.add('is-active');
            } else {
              row.classList.remove('is-active');
            }
          }
          if (node) {
            if (i + 1 <= currentStep) {
              node.classList.add('node-active');
            } else {
              node.classList.remove('node-active');
            }
          }
        }
      }

      // Synchronized path length interpolation between nodes
      const lengths = nodeLengthsRef.current;
      const totalLength = totalLengthRef.current || (path ? path.getTotalLength() : 0);
      if (totalLength <= 0) return;

      let currentLength = 0;

      if (nodeTops[0] > triggerY) {
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

      // Direct strokeDashoffset update
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
    setTimeout(() => setCopiedToken(null), 2000);
  };

  // Helper for dynamic SVG Waveform in LoRA Oscilloscope
  const renderOscilloscopePath = () => {
    const amp = 15 + totalLoraWeight * 14;
    const freq = 0.04 + loraWeights.core * 0.03;
    let d = 'M 0 45';
    for (let x = 0; x <= 400; x += 8) {
      const y = 45 + Math.sin(x * freq) * amp * Math.cos(x * 0.015);
      d += ` L ${x} ${y.toFixed(1)}`;
    }
    return d;
  };

  // GPU Memory calculation for Feature 03
  const gpuConfigs = {
    '4060': { name: 'RTX 4060', total: 8 },
    '4070': { name: 'RTX 4070 Ti', total: 16 },
    '4090': { name: 'RTX 4090', total: 24 },
  };
  const quantScales = {
    fp16: 6.8,
    fp8: 4.2,
    gguf: 3.1,
  };
  const currentGpu = gpuConfigs[selectedGpu];
  const currentVramUsed = quantScales[selectedQuant];
  const vramUsagePercent = Math.min(100, Math.round((currentVramUsed / currentGpu.total) * 100));

  return (
    <section className="mg-features" id="features-narrative">
      <div className="mg-features-atmosphere" aria-hidden="true" />

      <div className="mg-container" ref={containerRef}>
        {/* ===================================================================
            PRESERVED 3-LAYER NATIVE VECTOR STROKE LASER SPINE (NO DROP-SHADOW)
            =================================================================== */}
        <div className="mg-narrative-spine-wrap" aria-hidden="true">
          {pathD && svgSize.width > 0 && (
            <svg
              className="mg-narrative-svg"
              width={svgSize.width}
              height={svgSize.height}
              viewBox={`0 0 ${svgSize.width} ${svgSize.height}`}
            >
              <defs>
                <linearGradient id="beam-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.85" />
                  <stop offset="25%" stopColor="#3b82f6" stopOpacity="1" />
                  <stop offset="55%" stopColor="#38bdf8" stopOpacity="1" />
                  <stop offset="85%" stopColor="#60a5fa" stopOpacity="1" />
                  <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.95" />
                </linearGradient>
              </defs>

              {/* Inactive Dashed Guide Path */}
              <path
                d={pathD}
                fill="none"
                stroke="rgba(96, 165, 250, 0.12)"
                strokeWidth="2"
                strokeDasharray="4 6"
              />

              {/* Layer 1: Active Ambient Wide Glow Aura (10px cyan 35%) */}
              <path
                ref={glowPathRef}
                d={pathD}
                fill="none"
                stroke="rgba(56, 189, 248, 0.35)"
                strokeWidth="10"
                strokeLinecap="round"
                className="mg-spine-laser-glow"
              />

              {/* Layer 2: Active Traveling Main Gradient Path (3.5px) */}
              <path
                ref={pathRef}
                d={pathD}
                fill="none"
                stroke="url(#beam-gradient)"
                strokeWidth="3.5"
                strokeLinecap="round"
                className="mg-spine-laser-main"
              />

              {/* Layer 3: Active Fiber-Optic White Core Laser (1.2px) */}
              <path
                ref={coreLaserRef}
                d={pathD}
                fill="none"
                stroke="rgba(255, 255, 255, 0.88)"
                strokeWidth="1.2"
                strokeLinecap="round"
                className="mg-spine-laser-active"
              />

              {/* Continuous Flowing Pulse Stream */}
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
            <span className="mg-tag-text">INTEGRATED TOOLSET &amp; WORKSTATIONS</span>
          </div>
          <h2 className="mg-features-title">
            Suite Workstation Generatif Interaktif
          </h2>
          <p className="mg-features-subtitle">
            Ke-6 workstation mekanis berpotongan chamfer hardware: optical comparator berpemotong GPU clip-path, penumpuk LoRA dengan osiloskop harmonik real-time, profiler alokasi VRAM multi-GPU, dan kalkulator lattice snap-64.
          </p>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="mg-features-mobile-nav" role="tablist" aria-label="Pilih Fitur Generatif">
          {[
            { id: 1, label: '01 Comparator' },
            { id: 2, label: '02 Prompt Lab' },
            { id: 3, label: '03 VRAM Profiler' },
            { id: 4, label: '04 LoRA Wave' },
            { id: 5, label: '05 Inspector' },
            { id: 6, label: '06 Snap-64' },
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
            FEATURE 01: GPU Clip-Path Optical Comparator (/compare)
            =================================================================== */}
        <div
          ref={row1Ref}
          className={`mg-feature-row mg-feature-compare ${!mobileShowAllFeatures && mobileActiveFeature !== 1 ? 'mobile-hidden-feature' : ''}`}
          id="feat-compare"
        >
          <div className="mg-feature-info">
            <div className="mg-step-node-anchor" ref={node1Ref}>
              <div className="mg-node-pin">
                <span className="mg-node-ring" />
                <span className="mg-node-index">01</span>
              </div>
              <div className="mg-node-meta">
                <span className="mg-node-type">FEATURE 01</span>
                <span className="mg-node-title">OPTICAL COMPARATOR</span>
              </div>
            </div>

            <h3 className="mg-feature-heading">
              GPU Clip-Path Optical Comparator
            </h3>
            <p className="mg-feature-copy">
              Bandingkan rendering output Illustrious XL (Epsilon) vs NoobAI-XL (V-Prediction) secara real-time. Lapisan gambar atas dipotong secara murni menggunakan GPU <code className="mg-inline-code">clipPath: inset(...)</code> tanpa layout thrashing.
            </p>

            <div className="mg-feature-bullets">
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>Zero Latency Visual Scrubbing: geser slider pemisah untuk inspeksi detail lineart dan highlight warna</span>
              </div>
              <div className="mg-bullet-item">
                <span className="mg-bullet-dot" />
                <span>Analisis Perbedaan Model: periksa perbedaan resolusi native, clip skip, dan sampling budget</span>
              </div>
            </div>

            <Link to="/compare" className="mg-btn mg-btn-primary mg-chamfer-sm">
              <span>Buka Model Comparison</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>

          <div className="mg-feature-visual mg-visual-compare">
            {/* Diff Metric Selector Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {(['resolution', 'vram', 'architecture'] as const).map((mKey) => (
                <button
                  key={mKey}
                  type="button"
                  className={`mg-mini-tab mg-chamfer-sm ${compareMetric === mKey ? 'active' : ''}`}
                  onClick={() => setCompareMetric(mKey)}
                >
                  {mKey === 'resolution' ? 'Resolusi & Rasio' : mKey === 'vram' ? 'VRAM & Memori' : 'Text Encoders'}
                </button>
              ))}
            </div>

            <div className="mg-comparator-container mg-chamfer-lg mg-gpu">
              {/* Slot A: Base Background Image (Illustrious XL) */}
              <img
                src="https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/ce58b29f-26ca-461b-a184-cf54fb869e26/width=450/ce58b29f-26ca-461b-a184-cf54fb869e26.jpeg"
                alt="Illustrious XL Output"
                className="mg-comparator-base-img"
              />
              <span className="mg-comparator-badge-left mg-chamfer-sm">SLOT A // ILLUSTRIOUS XL</span>

              {/* Slot B: Clipped Foreground Image (NoobAI V-Pred) */}
              <img
                src="https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/6942c4b2-fcd4-4135-ab44-a617e26235d3/width=450/6942c4b2-fcd4-4135-ab44-a617e26235d3.jpeg"
                alt="NoobAI V-Pred Output"
                className="mg-comparator-clip-img mg-gpu"
                style={{
                  clipPath: `inset(0 ${(100 - loupeSplit).toFixed(1)}% 0 0)`,
                }}
              />
              <span className="mg-comparator-badge-right mg-chamfer-sm">SLOT B // NOOBAI V-PRED</span>

              {/* Cyan Laser Divider Line */}
              <div
                className="mg-comparator-laser-divider mg-gpu"
                style={{ left: `${loupeSplit}%` }}
              >
                <div className="mg-comparator-laser-handle mg-chamfer-sm">
                  <span>◀▶</span>
                </div>
              </div>

              {/* Invisible interactive scrub input */}
              <input
                type="range"
                min="0"
                max="100"
                value={loupeSplit}
                onChange={(e) => setLoupeSplit(parseFloat(e.target.value))}
                className="mg-comparator-slider-input"
                aria-label="Optical comparator divider slider"
              />
            </div>

            <div style={{ marginTop: '10px', fontSize: '11px', color: '#94a3b8', fontFamily: 'var(--mg-font-mono)' }}>
              <span style={{ color: '#38bdf8', fontWeight: 700 }}>ANALISIS METRIK: </span>
              {compareMetric === 'resolution' && 'Illustrious optimal pada rasio portrait 832×1216; NoobAI pada 1024×1360.'}
              {compareMetric === 'vram' && 'Illustrious lancar di VRAM 6GB dengan --medvram; NoobAI stabil di 8GB.'}
              {compareMetric === 'architecture' && 'Illustrious memakai Epsilon latent prediction; NoobAI memakai V-Prediction.'}
            </div>
          </div>
        </div>

        {/* ===================================================================
            FEATURE 02: SafeTensors Header Inspector & Danbooru Tag Lab
            =================================================================== */}
        <div
          ref={row2Ref}
          className={`mg-feature-row mg-feature-reverse mg-feature-promptlab ${!mobileShowAllFeatures && mobileActiveFeature !== 2 ? 'mobile-hidden-feature' : ''}`}
          id="feat-promptlab"
        >
          <div className="mg-feature-visual mg-visual-promptlab">
            <div className="mg-promptlab-preview mg-chamfer-lg">
              <div className="mg-promptlab-bar">
                <span className="mg-bar-label">DANBOORU TOKEN MATRIX // CLICK TO COPY</span>
                <span className="mg-bar-count">8 ACTIVE TAGS</span>
              </div>

              <div className="mg-token-cloud">
                {[
                  { tag: 'masterpiece', weight: '1.0', type: 'quality' },
                  { tag: 'best quality', weight: '1.0', type: 'quality' },
                  { tag: '1girl', weight: '1.0', type: 'subject' },
                  { tag: 'silver hair', weight: '1.1', type: 'character' },
                  { tag: 'sidelighting', weight: '1.1', type: 'lighting' },
                  { tag: 'dynamic shadows', weight: '1.0', type: 'lighting' },
                  { tag: 'warm illumination', weight: '1.0', type: 'palette' },
                  { tag: 'high-tech laboratory', weight: '0.9', type: 'environment' },
                ].map((t) => (
                  <button
                    key={t.tag}
                    type="button"
                    className={`mg-token-pill mg-token-${t.type} mg-chamfer-sm`}
                    onClick={() => copyToken(t.weight === '1.0' ? t.tag : `(${t.tag}:${t.weight})`)}
                    title="Klik untuk menyalin tag ke clipboard"
                  >
                    <span className="mg-token-name">{t.tag}</span>
                    <span className="mg-token-w">{t.weight}</span>
                  </button>
                ))}
              </div>

              <div className="mg-promptlab-controls mg-chamfer-sm" style={{ marginTop: '16px' }}>
                <div className="mg-control-row">
                  <span className="mg-control-label">Sintaks Pembobotan:</span>
                  <code className="mg-syntax-sample">(ho'olheyak:1.20), (sidelighting:1.10)</code>
                </div>
              </div>
            </div>
          </div>

          <div className="mg-feature-info">
            <div className="mg-step-node-anchor" ref={node2Ref}>
              <div className="mg-node-pin">
                <span className="mg-node-ring" />
                <span className="mg-node-index">02</span>
              </div>
              <div className="mg-node-meta">
                <span className="mg-node-type">FEATURE 02</span>
                <span className="mg-node-title">PROMPT LAB &amp; TAG MATRIX</span>
              </div>
            </div>

            <h3 className="mg-feature-heading">
              SafeTensors Prompt Studio &amp; Tag Lab
            </h3>
            <p className="mg-feature-copy">
              Susun prompt anime modular dengan arsitektur 10 layer visual. Dilengkapi autokomplit lebih dari 100.000 tag Danbooru, pembobotan kurung real-time, dan ekstraksi metadata biner .safetensors.
            </p>

            <Link to="/prompt-lab" className="mg-btn mg-btn-primary mg-chamfer-sm">
              <span>Buka Prompt Studio &amp; Lab</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>

        {/* ===================================================================
            FEATURE 03: Multi-GPU VRAM Profiler Workstation
            =================================================================== */}
        <div
          ref={row3Ref}
          className={`mg-feature-row mg-feature-gallery ${!mobileShowAllFeatures && mobileActiveFeature !== 3 ? 'mobile-hidden-feature' : ''}`}
          id="feat-vram-profiler"
        >
          <div className="mg-feature-info">
            <div className="mg-step-node-anchor" ref={node3Ref}>
              <div className="mg-node-pin">
                <span className="mg-node-ring" />
                <span className="mg-node-index">03</span>
              </div>
              <div className="mg-node-meta">
                <span className="mg-node-type">FEATURE 03</span>
                <span className="mg-node-title">VRAM HARDWARE PROFILER</span>
              </div>
            </div>

            <h3 className="mg-feature-heading">
              Multi-GPU VRAM Profiler &amp; Quantization
            </h3>
            <p className="mg-feature-copy">
              Uji ketahanan GPU Anda terhadap beban inferensi SDXL, Illustrious, dan Flux. Pilih kartu grafis dan format kuantisasi untuk melihat visualisasi alokasi memori real-time dan prediksi CUDA OOM.
            </p>

            <Link to="/vram" className="mg-btn mg-btn-primary mg-chamfer-sm">
              <span>Buka VRAM Profiler</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>

          <div className="mg-feature-visual mg-visual-gallery">
            <div className="mg-vram-profiler-box mg-chamfer-lg">
              {/* GPU Selector Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {(['4060', '4070', '4090'] as const).map((gpuKey) => (
                  <button
                    key={gpuKey}
                    type="button"
                    className={`mg-aspect-btn mg-chamfer-sm ${selectedGpu === gpuKey ? 'active' : ''}`}
                    onClick={() => setSelectedGpu(gpuKey)}
                  >
                    {gpuConfigs[gpuKey].name} ({gpuConfigs[gpuKey].total}GB)
                  </button>
                ))}
              </div>

              {/* Quantization Mode */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {(['fp16', 'fp8', 'gguf'] as const).map((qKey) => (
                  <button
                    key={qKey}
                    type="button"
                    className={`mg-mini-tab mg-chamfer-sm ${selectedQuant === qKey ? 'active' : ''}`}
                    onClick={() => setSelectedQuant(qKey)}
                  >
                    {qKey.toUpperCase()} ({quantScales[qKey]} GB)
                  </button>
                ))}
              </div>

              {/* Memory Allocation Gauge */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mg-font-mono)', fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
                  <span>ALOKASI VRAM GPU</span>
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>{currentVramUsed} GB / {currentGpu.total} GB ({vramUsagePercent}%)</span>
                </div>
                <div className="mg-footprint-track mg-chamfer-sm" style={{ height: '10px' }}>
                  <div
                    className="mg-footprint-fill mg-gpu"
                    style={{
                      transform: `scaleX(${vramUsagePercent / 100})`,
                      background: vramUsagePercent > 85 ? 'linear-gradient(90deg, #fcee0a, #ef4444)' : 'linear-gradient(90deg, #38bdf8, #10b981)',
                    }}
                  />
                </div>
              </div>

              <div style={{ fontFamily: 'var(--mg-font-mono)', fontSize: '11px', color: '#6ee7b7' }}>
                STATUS: {vramUsagePercent > 85 ? 'PERINGATAN: MENDEKATI LIMIT VRAM' : 'OPTIMAL // ZERO MEMORY PAGING'}
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            FEATURE 04: Multi-LoRA Harmonic Oscilloscope & ComfyUI Bridge
            =================================================================== */}
        <div
          ref={row4Ref}
          className={`mg-feature-row mg-feature-reverse mg-feature-lorastack ${!mobileShowAllFeatures && mobileActiveFeature !== 4 ? 'mobile-hidden-feature' : ''}`}
          id="feat-lorastack"
        >
          <div className="mg-feature-visual mg-visual-lorastack">
            <div className="mg-oscilloscope-box mg-chamfer-lg">
              {/* Top Bar with Burnout Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontFamily: 'var(--mg-font-mono)', fontSize: '11px', color: '#38bdf8', fontWeight: 700 }}>
                  HARMONIC OSCILLOSCOPE // COMFYUI BRIDGE
                </span>
                <span className={`mg-lorastack-guard-badge mg-chamfer-sm ${isLoraOverbaked ? 'warning' : ''}`}>
                  {isLoraOverbaked ? 'OVER-BAKED (> 2.1x)' : 'BURNOUT GUARD: SAFE'}
                </span>
              </div>

              {/* Dynamic SVG Waveform */}
              <svg className="mg-oscilloscope-svg mg-chamfer-sm" viewBox="0 0 400 90">
                <line x1="0" y1="45" x2="400" y2="45" stroke="rgba(255, 255, 255, 0.1)" strokeDasharray="4 4" />
                <path
                  d={renderOscilloscopePath()}
                  fill="none"
                  stroke={isLoraOverbaked ? '#ef4444' : '#38bdf8'}
                  strokeWidth="2.5"
                  className="mg-gpu"
                />
              </svg>

              {/* 3 Weight Sliders */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--mg-font-mono)', fontSize: '11px', color: '#cbd5e1' }}>01 STYLE CORE: {loraWeights.core.toFixed(2)}</span>
                  <input
                    type="range"
                    min="0.1"
                    max="1.5"
                    step="0.05"
                    value={loraWeights.core}
                    onChange={(e) => setLoraWeights((prev) => ({ ...prev, core: parseFloat(e.target.value) }))}
                    style={{ width: '150px' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--mg-font-mono)', fontSize: '11px', color: '#cbd5e1' }}>02 LIGHTING: {loraWeights.lighting.toFixed(2)}</span>
                  <input
                    type="range"
                    min="0.1"
                    max="1.5"
                    step="0.05"
                    value={loraWeights.lighting}
                    onChange={(e) => setLoraWeights((prev) => ({ ...prev, lighting: parseFloat(e.target.value) }))}
                    style={{ width: '150px' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--mg-font-mono)', fontSize: '11px', color: '#cbd5e1' }}>03 DETAILER: {loraWeights.detail.toFixed(2)}</span>
                  <input
                    type="range"
                    min="0.1"
                    max="1.5"
                    step="0.05"
                    value={loraWeights.detail}
                    onChange={(e) => setLoraWeights((prev) => ({ ...prev, detail: parseFloat(e.target.value) }))}
                    style={{ width: '150px' }}
                  />
                </div>
              </div>

              {/* 1-Click Export ComfyUI Workflow JSON */}
              <button
                type="button"
                className="mg-action-pill mg-chamfer-sm"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => copyToken(JSON.stringify({
                  lora_stack: [
                    { name: 'style_core', strength_model: loraWeights.core, strength_clip: loraWeights.core },
                    { name: 'lighting_accent', strength_model: loraWeights.lighting, strength_clip: loraWeights.lighting },
                    { name: 'detail_booster', strength_model: loraWeights.detail, strength_clip: loraWeights.detail },
                  ]
                }, null, 2))}
              >
                &rarr; EXPORT COMFYUI WORKFLOW JSON
              </button>
            </div>
          </div>

          <div className="mg-feature-info">
            <div className="mg-step-node-anchor" ref={node4Ref}>
              <div className="mg-node-pin">
                <span className="mg-node-ring" />
                <span className="mg-node-index">04</span>
              </div>
              <div className="mg-node-meta">
                <span className="mg-node-type">FEATURE 04</span>
                <span className="mg-node-title">LORA OSCILLOSCOPE</span>
              </div>
            </div>

            <h3 className="mg-feature-heading">
              LoRA Stack &amp; Harmonic Oscilloscope
            </h3>
            <p className="mg-feature-copy">
              Gabungkan beberapa LoRA karakter, pose, dan lighting. Visualisasi kurva harmonik gelombang SVG mendeteksi burnout dan interferensi bobot secara real-time.
            </p>

            <Link to="/lora-stack" className="mg-btn mg-btn-primary mg-chamfer-sm">
              <span>Buka LoRA Stack Builder</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>

        {/* ===================================================================
            FEATURE 05: SafeTensors Metadata Inspector Terminal
            =================================================================== */}
        <div
          ref={row5Ref}
          className={`mg-feature-row mg-feature-inspector ${!mobileShowAllFeatures && mobileActiveFeature !== 5 ? 'mobile-hidden-feature' : ''}`}
          id="feat-inspector"
        >
          <div className="mg-feature-info">
            <div className="mg-step-node-anchor" ref={node5Ref}>
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
              Bedah parameter inferensi yang tertanam di dalam chunk gambar PNG, JPEG, dan header SafeTensors. Tanpa upload ke cloud: 100% diproses di browser Anda.
            </p>

            <Link to="/inspector" className="mg-btn mg-btn-primary mg-chamfer-sm">
              <span>Inspeksi Metadata Gambar</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>

          <div className="mg-feature-visual mg-visual-inspector">
            <div className="mg-terminal-window mg-chamfer-lg">
              <div className="mg-terminal-titlebar">
                <div className="mg-terminal-dots">
                  <span className="dot dot-red" />
                  <span className="dot dot-yellow" />
                  <span className="dot dot-green" />
                </div>
                <span className="mg-terminal-title">safetensors_parser_v2 &bull; zero_upload_hex</span>
                <span className="mg-terminal-status">READY</span>
              </div>

              <div className="mg-terminal-body">
                <div className="mg-term-line mg-term-cmd">
                  <span className="mg-prompt-sym">$</span> mg-inspect header --format safetensors
                </div>
                <div className="mg-term-line mg-term-dim">
                  [OK] Header JSON 587 tensors terverifikasi &bull; 0.00ms server overhead
                </div>
                <div className="mg-term-divider" />

                <div className="mg-term-grid-params">
                  <div className="mg-param-badge mg-chamfer-sm">
                    <span>STEPS:</span> <strong>30</strong>
                  </div>
                  <div className="mg-param-badge mg-chamfer-sm">
                    <span>SAMPLER:</span> <strong>Euler a</strong>
                  </div>
                  <div className="mg-param-badge mg-chamfer-sm">
                    <span>CFG:</span> <strong>5.5</strong>
                  </div>
                  <div className="mg-param-badge mg-chamfer-sm">
                    <span>HASH:</span> <strong>0xE621BEF5</strong>
                  </div>
                </div>

                <div className="mg-term-line mg-term-action" style={{ marginTop: '12px' }}>
                  <button
                    type="button"
                    className="mg-action-pill mg-chamfer-sm"
                    onClick={() => copyToken('Steps: 30, Sampler: Euler a, CFG: 5.5, Seed: 2473992611, Size: 1024x1360, Model: WAI-illustrious-SDXL')}
                  >
                    &rarr; Salin Format A1111
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            FEATURE 06: Resolution Calculator & VAE Snap-64 Lattice
            =================================================================== */}
        <div
          ref={row6Ref}
          className={`mg-feature-row mg-feature-reverse mg-feature-calculator ${!mobileShowAllFeatures && mobileActiveFeature !== 6 ? 'mobile-hidden-feature' : ''}`}
          id="feat-calculator"
        >
          <div className="mg-feature-visual mg-visual-calculator">
            <div className="mg-calc-visualizer mg-chamfer-lg">
              <div className="mg-aspect-selector">
                <button
                  type="button"
                  className={`mg-aspect-btn mg-chamfer-sm ${selectedAspect === 'portrait' ? 'active' : ''}`}
                  onClick={() => setSelectedAspect('portrait')}
                >
                  2:3 Portrait (832 &times; 1216)
                </button>
                <button
                  type="button"
                  className={`mg-aspect-btn mg-chamfer-sm ${selectedAspect === 'square' ? 'active' : ''}`}
                  onClick={() => setSelectedAspect('square')}
                >
                  1:1 Square (1024 &times; 1024)
                </button>
                <button
                  type="button"
                  className={`mg-aspect-btn mg-chamfer-sm ${selectedAspect === 'landscape' ? 'active' : ''}`}
                  onClick={() => setSelectedAspect('landscape')}
                >
                  3:2 Cinema (1216 &times; 832)
                </button>
              </div>

              <div className="mg-dimension-box-wrapper">
                <div className={`mg-dimension-box aspect-${selectedAspect} mg-chamfer-sm`}>
                  <div className="mg-box-inner">
                    <span className="mg-box-dim-text">
                      {selectedAspect === 'portrait' && '832 × 1216'}
                      {selectedAspect === 'square' && '1024 × 1024'}
                      {selectedAspect === 'landscape' && '1216 × 832'}
                    </span>
                    <span className="mg-box-sub">
                      {selectedAspect === 'portrait' && 'Native Illustrious Portrait • 1.01 MP'}
                      {selectedAspect === 'square' && 'Native SDXL Square • 1.05 MP'}
                      {selectedAspect === 'landscape' && 'Native Cinema • 1.01 MP'}
                    </span>
                  </div>
                </div>
              </div>

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
            <div className="mg-step-node-anchor" ref={node6Ref}>
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
              Kalkulator Resolusi &amp; VAE Snap-64 Lattice
            </h3>
            <p className="mg-feature-copy">
              Hindari distorsi anatomi dan CUDA OOM dengan memastikan dimensi gambar selalu selaras pada kelipatan 64-pixel VAE lattice.
            </p>

            <Link to="/calculator" className="mg-btn mg-btn-primary mg-chamfer-sm">
              <span>Hitung Resolusi Optimal</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Mobile Expand / Collapse View Toggle */}
        <div className="mg-features-mobile-toggle-wrap">
          <button
            type="button"
            className="mg-btn mg-btn-secondary mg-btn-mobile-expand mg-chamfer-sm"
            onClick={() => setMobileShowAllFeatures((prev) => !prev)}
          >
            <span>
              {mobileShowAllFeatures
                ? 'Gunakan Mode Tab Ringkas (Satu Fitur) ↑'
                : 'Tampilkan Semua 6 Workstation Sekaligus ↓'}
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
