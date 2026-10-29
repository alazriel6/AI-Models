import { useEffect, useRef, useState } from 'react';

const STATEMENT_TABS = [
  { id: '01', label: '01.01 Checkpoints' },
  { id: '02', label: '01.02 Prompt Tags' },
  { id: '03', label: '01.03 VRAM Budgets' },
  { id: 'specs', label: 'Standards Spec' },
] as const;

type StatementTabId = (typeof STATEMENT_TABS)[number]['id'];

export function EditorialStatement() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Mobile simplified view state: active tab and showAll toggle to prevent extreme scrolling
  const [mobileActiveTab, setMobileActiveTab] = useState<StatementTabId>('01');
  const [mobileShowAll, setMobileShowAll] = useState(false);

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
      { threshold: 0.12 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`mg-statement ${isVisible ? 'is-visible' : ''}`}
      id="editorial-statement"
    >
      {/* Architectural Corner Reticles matching Hero */}
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

      {/* Seamless Transition Bridge from Hero Section */}
      <div className="mg-statement-transition-bridge" aria-hidden="true">
        <div className="mg-statement-bridge-datum">
          <div className="mg-statement-bridge-line" />
          <div className="mg-statement-bridge-badge">
            <span className="mg-bridge-dot" />
            <span className="mg-bridge-text">SPECIFICATION SUITE 01</span>
          </div>
          <div className="mg-statement-bridge-line" />
        </div>
      </div>

      {/* Dedicated Atmospheric Dark Forest Background (Distinct from Hero, 50% Opacity) */}
      <div className="mg-statement-forest-bg" aria-hidden="true" />

      {/* Subtle Natural Forest Fog & Depth (Neutral, No Blue Tint) */}
      <div className="mg-statement-forest-mist" aria-hidden="true" />
      <div className="mg-statement-fog-ribbon ribbon-1" aria-hidden="true" />
      <div className="mg-statement-fog-ribbon ribbon-2" aria-hidden="true" />

      {/* Vignette Depth & Ambient Contrast Lighting */}
      <div className="mg-statement-atmosphere" aria-hidden="true" />

      <div className="mg-container">
        {/* Editorial Statement Top Header */}
        <div className="mg-statement-header">
          <div className="mg-editorial-tag">
            <span className="mg-tag-num">01</span>
            <span className="mg-tag-line" />
            <span className="mg-tag-text">PLATFORM PURPOSE &amp; ARCHITECTURE</span>
          </div>

          <h2 className="mg-statement-title">
            A technical catalog, benchmark reference, and inspection toolkit.
          </h2>
        </div>

        {/* Mobile Interactive Tab Switcher (Visible on <= 768px only) */}
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
                setMobileShowAll(false);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Asymmetric 2-Column Editorial Grid */}
        <div className="mg-statement-grid">
          {/* Left Column: Thesis & Deep Explanation */}
          <div className="mg-statement-left">
            <p className="mg-statement-lead">
              Generative AI checkpoint directories can be overwhelming with hundreds of fine-tunes,
              mixed serialization formats, and varying inference requirements. Models Guide simplifies
              model discovery by providing uniform technical specifications, exact tensor breakdowns,
              and author-verified generation parameters.
            </p>

            <p className={`mg-statement-body ${!mobileShowAll ? 'mg-body-mobile-collapsed' : ''}`}>
              Built on the open SafeTensors standard developed by Hugging Face for secure, zero-copy
              model storage. Instead of executing arbitrary Python pickle bytecode, Models Guide parses
              header metadata directly without loading multi-gigabyte weight tensors into system RAM.
            </p>

            {/* Model Architecture Quick Audit Pill Matrix with Scanner Beam */}
            <div
              className={`mg-statement-audits ${!mobileShowAll && mobileActiveTab !== 'specs' ? 'mobile-hidden-statement' : ''}`}
            >
              <div className="mg-audit-scanner" aria-hidden="true" />
              <div className="mg-audit-header-bar">
                <span className="mg-audit-status-badge">
                  <span className="mg-audit-pulse-dot" />
                  STANDARDS SPECIFICATION
                </span>
                <span className="mg-audit-mono-meta">OFFICIAL REFS</span>
              </div>

              <div className="mg-audit-item">
                <span className="mg-audit-code">SAFETENSORS SPEC</span>
                <span className="mg-audit-val">Zero-Copy &amp; Read-Only Header Deserialization</span>
              </div>
              <div className="mg-audit-item">
                <span className="mg-audit-code">SUPPORTED BASES</span>
                <span className="mg-audit-val">Illustrious-XL &bull; SDXL 1.0 &bull; NoobAI &bull; Pony V6</span>
              </div>
              <div className="mg-audit-item">
                <span className="mg-audit-code">HASH INTEGRITY</span>
                <span className="mg-audit-val">Deterministic AutoV2 &amp; SHA256 Checksums</span>
              </div>
            </div>
          </div>

          {/* Right Column: Architectural Pillar Cards */}
          <div className="mg-statement-right">
            <div
              className={`mg-pillar-card ${!mobileShowAll && mobileActiveTab !== '01' ? 'mobile-hidden-statement' : ''}`}
              style={{ '--card-idx': '0' } as React.CSSProperties}
            >
              <div className="mg-pillar-reticle tl" />
              <div className="mg-pillar-reticle tr" />
              <div className="mg-pillar-reticle bl" />
              <div className="mg-pillar-reticle br" />
              <div className="mg-pillar-header">
                <span className="mg-pillar-num">
                  <span className="mg-pillar-dot" />
                  01.01
                </span>
                <h4>Base Architecture &amp; Checkpoints</h4>
              </div>
              <p>
                A checkpoint is the primary foundation model for generation. Because fine-tunes and LoRAs
                must strictly match their parent base architecture (SDXL, Illustrious, SD 1.5), Models Guide
                validates base compatibility tags before downloading or generating.
              </p>
            </div>

            <div
              className={`mg-pillar-card ${!mobileShowAll && mobileActiveTab !== '02' ? 'mobile-hidden-statement' : ''}`}
              style={{ '--card-idx': '1' } as React.CSSProperties}
            >
              <div className="mg-pillar-reticle tl" />
              <div className="mg-pillar-reticle tr" />
              <div className="mg-pillar-reticle bl" />
              <div className="mg-pillar-reticle br" />
              <div className="mg-pillar-header">
                <span className="mg-pillar-num">
                  <span className="mg-pillar-dot" />
                  01.02
                </span>
                <h4>Trigger Words &amp; Prompt Adherence</h4>
              </div>
              <p>
                Extract exact trained activation tokens and Danbooru tags (e.g., <code className="mg-inline-code">score_9, rating_safe</code>)
                embedded in model cards on Civitai to guarantee proper style reproduction and avoid prompt bleeding.
              </p>
            </div>

            <div
              className={`mg-pillar-card ${!mobileShowAll && mobileActiveTab !== '03' ? 'mobile-hidden-statement' : ''}`}
              style={{ '--card-idx': '2' } as React.CSSProperties}
            >
              <div className="mg-pillar-reticle tl" />
              <div className="mg-pillar-reticle tr" />
              <div className="mg-pillar-reticle bl" />
              <div className="mg-pillar-reticle br" />
              <div className="mg-pillar-header">
                <span className="mg-pillar-num">
                  <span className="mg-pillar-dot" />
                  01.03
                </span>
                <h4>Hardware VRAM &amp; Sampling Budgets</h4>
              </div>
              <p>
                Empirical hardware requirements across 4GB, 6GB, 8GB, 12GB, and 16GB+ GPUs with verified
                samplers (Euler a, DPM++ 2M Karras, CFG 5.0&ndash;6.5) tested for high-coherence inference.
              </p>
            </div>
          </div>
        </div>

        {/* Mobile Expand / Collapse View Toggle */}
        <div className="mg-statement-mobile-toggle-wrap">
          <button
            type="button"
            className="mg-btn mg-btn-secondary mg-btn-mobile-expand"
            onClick={() => setMobileShowAll((prev) => !prev)}
          >
            <span>
              {mobileShowAll
                ? 'Sembunyikan Sebagian Pilar ↑'
                : 'Tampilkan Semua 3 Pilar & Spesifikasi ↓'}
            </span>
          </button>
        </div>

        {/* Animated Connecting SVG Path Anchor to Model Showcase */}
        <div className="mg-statement-connector" aria-hidden="true">
          <svg className="mg-connector-svg" width="100%" height="90" viewBox="0 0 1200 90" fill="none" preserveAspectRatio="none">
            <defs>
              <linearGradient id="statementGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(96, 165, 250, 0.2)" />
                <stop offset="50%" stopColor="#60A5FA" />
                <stop offset="100%" stopColor="#3B82F6" />
              </linearGradient>
            </defs>
            <path
              className="mg-connector-path mg-connector-animated"
              d="M 600,0 C 600,45 600,45 600,90"
              stroke="url(#statementGradient)"
              strokeWidth="2"
              strokeDasharray="6 6"
            />
            <circle className="mg-connector-node" cx="600" cy="90" r="4" fill="#60A5FA" />
            <circle className="mg-connector-node-ping" cx="600" cy="90" r="8" stroke="#60A5FA" strokeWidth="1.5" />
          </svg>
        </div>
      </div>
    </section>
  );
}
