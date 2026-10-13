import { Link } from 'react-router-dom';

export function FinalCtaSection() {
  return (
    <section className="mg-final-cta" id="final-cta">
      {/* Dedicated Nocturnal Forest Lake & Reflection Background (Distinct from 01, 02, 03, 04) */}
      <div className="mg-final-forest-bg" aria-hidden="true" />

      {/* Subtle Natural Forest Ground Mist Ribbons */}
      <div className="mg-final-mist-ribbon mist-1" aria-hidden="true" />
      <div className="mg-final-mist-ribbon mist-2" aria-hidden="true" />

      {/* Ambient Vignette & Contrast Depth Lighting */}
      <div className="mg-final-atmosphere" aria-hidden="true" />

      <div className="mg-container">
        <div className="mg-final-inner">
          {/* Editorial Tag */}
          <div className="mg-editorial-tag">
            <span className="mg-tag-num">05</span>
            <span className="mg-tag-line" />
            <span className="mg-tag-text">GET STARTED</span>
          </div>

          <h2 className="mg-final-title">
            Find your next starting point.
          </h2>

          <p className="mg-final-desc">
            Explore the library and make your model workflow easier to navigate.
            Zero cloud lock-in. Full tensor transparency.
          </p>

          {/* Primary CTA Action Buttons */}
          <div className="mg-final-actions">
            <Link to="/models" className="mg-btn mg-btn-primary mg-btn-large">
              <span>Explore Full Model Directory</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>

            <Link to="/compare" className="mg-btn mg-btn-secondary mg-btn-large">
              <span>Compare Model Architectures</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M16 3h5v5" />
                <path d="M4 20L21 3" />
                <path d="M21 16v5h-5" />
                <path d="M15 15l6 6" />
                <path d="M4 4l5 5" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
