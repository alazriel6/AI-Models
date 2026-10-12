import { Link } from 'react-router-dom';

export function FinalCtaSection() {
  return (
    <section className="mg-final-cta" id="final-cta">
      <div className="mg-final-atmosphere" aria-hidden="true" />
      <div className="mg-container">
        <div className="mg-final-inner">
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

          <div className="mg-final-actions">
            <Link to="/models" className="mg-btn mg-btn-primary mg-btn-large">
              <span>Explore Models</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>

            <Link to="/about" className="mg-btn mg-btn-secondary mg-btn-large">
              <span>Learn About Models Guide</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </Link>
          </div>

          <div className="mg-final-metrics-strip">
            <div className="mg-final-metric">
              <span className="mg-fm-k">ARCHITECTURE MATRIX</span>
              <span className="mg-fm-v">VERIFIED LOCAL SAFETENSORS</span>
            </div>
            <div className="mg-final-metric">
              <span className="mg-fm-k">ENVIRONMENT STATUS</span>
              <span className="mg-fm-v mg-text-success">
                <span className="mg-status-pulse" />
                SYSTEM OPERATIONAL
              </span>
            </div>
            <div className="mg-final-metric">
              <span className="mg-fm-k">RUNTIME TELEMETRY</span>
              <span className="mg-fm-v">STANDALONE REACT 19 + GO ENGINE</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
