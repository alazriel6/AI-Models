import { Link } from 'react-router-dom';

export function LandingFooter() {
  return (
    <footer className="mg-footer">
      <div className="mg-container">
        <div className="mg-footer-top">
          {/* Brand & Manifest */}
          <div className="mg-footer-brand-col">
            <Link to="/" className="mg-footer-brand">
              <span className="mg-footer-icon">✦</span>
              <span className="mg-footer-name">Models Guide</span>
            </Link>
            <p className="mg-footer-tagline">
              Technical library and inference management interface for AI image-generation models.
              Engineered for local creative developers, animators, and model fine-tuners.
            </p>
            <div className="mg-footer-sys-badge">
              <span className="mg-status-pulse" />
              <span>RUNTIME: v2.4.0 &bull; LOCAL ENVIRONMENT</span>
            </div>
          </div>

          {/* Nav Column 1: Model Library */}
          <div className="mg-footer-links-col">
            <span className="mg-col-heading">MODEL LIBRARY</span>
            <ul>
              <li><Link to="/models">All Models</Link></li>
              <li><Link to="/models?tab=checkpoints">Checkpoints</Link></li>
              <li><Link to="/models?tab=lora">LoRA Adapters</Link></li>
              <li><Link to="/models?tab=illustrious">Illustrious XL</Link></li>
              <li><Link to="/models?tab=noobai">NoobAI Base</Link></li>
            </ul>
          </div>

          {/* Nav Column 2: Tooling & Utilities */}
          <div className="mg-footer-links-col">
            <span className="mg-col-heading">WORKFLOW UTILITIES</span>
            <ul>
              <li><Link to="/compare">Model Comparison</Link></li>
              <li><Link to="/gallery">Generation Gallery</Link></li>
              <li><Link to="/inspector">Metadata Inspector</Link></li>
              <li><Link to="/prompt-lab">Prompt Lab</Link></li>
              <li><Link to="/calculator">Resolution Calculator</Link></li>
            </ul>
          </div>

          {/* Nav Column 3: Reference & System */}
          <div className="mg-footer-links-col">
            <span className="mg-col-heading">REFERENCE &amp; ADMIN</span>
            <ul>
              <li><Link to="/about">Architecture Overview</Link></li>
              <li><Link to="/contact">Developer Contact</Link></li>
              <li><a href="#vram-advisor">VRAM Memory Advisor</a></li>
              <li><a href="#technical-reference">Sampling Cheat Sheet</a></li>
              <li><Link to="/admin">Admin Dashboard</Link></li>
            </ul>
          </div>
        </div>

        <div className="mg-footer-bottom">
          <p className="mg-footer-copy">
            &copy; {new Date().getFullYear()} Models Guide. Built for local Stable Diffusion, Illustrious XL, and generative AI research.
          </p>
          <div className="mg-footer-bottom-links">
            <Link to="/about">About System</Link>
            <span className="mg-sep">&bull;</span>
            <Link to="/contact">Report Model Bug</Link>
            <span className="mg-sep">&bull;</span>
            <a href="#hero">Back to Top &uarr;</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
