import { Link } from 'react-router-dom';

export function LandingFooter() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="mg-footer">
      <div className="mg-container">
        <div className="mg-footer-top">
          {/* Brand Column */}
          <div className="mg-footer-brand-col">
            <Link to="/" className="mg-footer-brand">
              <span className="mg-footer-icon">✦</span>
              <span className="mg-footer-name">Models Guide</span>
            </Link>

            <p className="mg-footer-tagline">
              Curated model directory, visual generation references, and workflow tools for digital artists and creators.
            </p>
          </div>

          {/* Nav Column 1: Model Directory */}
          <div className="mg-footer-links-col">
            <span className="mg-col-heading">MODEL DIRECTORY</span>
            <ul>
              <li>
                <Link to="/models" className="mg-footer-link">
                  All Checkpoints &amp; LoRAs
                </Link>
              </li>
              <li>
                <Link to="/models?tab=checkpoints" className="mg-footer-link">
                  Base Checkpoints
                </Link>
              </li>
              <li>
                <Link to="/models?tab=lora" className="mg-footer-link">
                  LoRA Style Adapters
                </Link>
              </li>
              <li>
                <Link to="/models?tab=illustrious" className="mg-footer-link">
                  Illustrious XL
                </Link>
              </li>
              <li>
                <Link to="/models?tab=noobai" className="mg-footer-link">
                  NoobAI Models
                </Link>
              </li>
            </ul>
          </div>

          {/* Nav Column 2: Prompting & Creative Tools */}
          <div className="mg-footer-links-col">
            <span className="mg-col-heading">PROMPTING &amp; CREATIVE TOOLS</span>
            <ul>
              <li>
                <Link to="/prompt-lab" className="mg-footer-link">
                  Prompt Studio &amp; Lab
                </Link>
              </li>
              <li>
                <Link to="/anime-prompt-studio" className="mg-footer-link">
                  Anime Prompt Studio
                </Link>
              </li>
              <li>
                <Link to="/prompt-deconstructor" className="mg-footer-link">
                  Prompt Deconstructor
                </Link>
              </li>
              <li>
                <Link to="/story-merger" className="mg-footer-link">
                  Character Lock &amp; Story Merger
                </Link>
              </li>
              <li>
                <Link to="/negative-vault" className="mg-footer-link">
                  Negative Vault
                </Link>
              </li>
              <li>
                <Link to="/lora-stack" className="mg-footer-link">
                  LoRA Stack Builder
                </Link>
              </li>
              <li>
                <Link to="/gallery" className="mg-footer-link">
                  Generation Gallery
                </Link>
              </li>
            </ul>
          </div>

          {/* Nav Column 3: Workflows & Hardware Labs */}
          <div className="mg-footer-links-col">
            <span className="mg-col-heading">WORKFLOWS &amp; HARDWARE</span>
            <ul>
              <li>
                <Link to="/controlnet" className="mg-footer-link">
                  ControlNet &amp; OpenPose Rig
                </Link>
              </li>
              <li>
                <Link to="/vram" className="mg-footer-link">
                  VRAM &amp; Hardware Profiler
                </Link>
              </li>
              <li>
                <Link to="/workflows" className="mg-footer-link">
                  ComfyUI Workflows
                </Link>
              </li>
              <li>
                <Link to="/telemetry" className="mg-footer-link">
                  ComfyUI Telemetry &amp; Benchmark
                </Link>
              </li>
              <li>
                <Link to="/sampler-guide" className="mg-footer-link">
                  Sampler &amp; Scheduler Guide
                </Link>
              </li>
              <li>
                <Link to="/calculator" className="mg-footer-link">
                  Resolution Calculator
                </Link>
              </li>
              <li>
                <Link to="/compare" className="mg-footer-link">
                  Model Comparison
                </Link>
              </li>
              <li>
                <Link to="/inspector" className="mg-footer-link">
                  Metadata Inspector
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Clean Copyright & Back to Top */}
        <div className="mg-footer-bottom">
          <p className="mg-footer-copy">
            &copy; {new Date().getFullYear()} Models Guide. Built for digital artists and visual creators.
          </p>

          <div className="mg-footer-bottom-actions">
            <div className="mg-footer-bottom-links">
              <Link to="/about">About</Link>
              <span className="mg-sep">&bull;</span>
              <Link to="/contact">Contact</Link>
              <span className="mg-sep">&bull;</span>
              <Link to="/models">Browse Library</Link>
            </div>

            <button
              type="button"
              onClick={scrollToTop}
              className="mg-footer-back-to-top"
              aria-label="Scroll back to top"
            >
              <span>Back to Top</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
