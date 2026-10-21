import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Link, useLocation } from 'react-router-dom';
import './App.css';
import { AdminAuthProvider } from './components/admin/AdminAuth';

// Eager load Home for instant initial render
import Home from './components/pages/Home';

// Route-based lazy loading for code-splitting (reducing initial bundle from ~691 kB down to ~150 kB)
const ModelList = lazy(() => import('./components/model-list'));
const ModelComparison = lazy(() => import('./components/pages/ModelComparison'));
const Gallery = lazy(() => import('./components/pages/Gallery'));
const MetadataInspector = lazy(() => import('./components/pages/MetadataInspector'));
const PromptLab = lazy(() => import('./components/pages/PromptLab'));
const ResolutionCalculator = lazy(() => import('./components/pages/ResolutionCalculator'));
const LoraStack = lazy(() => import('./components/pages/LoraStack'));
const AnimePromptStudio = lazy(() => import('./components/pages/AnimePromptStudio'));
const About = lazy(() => import('./components/pages/About'));
const Contact = lazy(() => import('./components/pages/Contact'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const ComfyWorkflows = lazy(() => import('./components/pages/ComfyWorkflows'));
const NegativeVault = lazy(() => import('./components/pages/NegativeVault'));
const SamplerGuide = lazy(() => import('./components/pages/SamplerGuide'));
const ControlNetStudio = lazy(() => import('./components/pages/ControlNetStudio'));

function PageLoadingFallback() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        gap: '14px',
        color: '#94a3b8',
        fontSize: '0.9rem',
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          border: '3px solid rgba(255, 255, 255, 0.08)',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'routeSpin 0.75s linear infinite',
        }}
      />
      <span>Memuat halaman...</span>
      <style>{`
        @keyframes routeSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const toolsDropdownRef = useRef<HTMLLIElement | null>(null);

  // Detect scroll for dynamic frosted navbar transition
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrolled = window.scrollY > 25;
          setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));
          ticking = false;
        });
        ticking = true;
      }
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-close menus on route change during render
  const [prevPathname, setPrevPathname] = useState(location.pathname);
  if (prevPathname !== location.pathname) {
    setPrevPathname(location.pathname);
    setMobileMenuOpen(false);
    setToolsDropdownOpen(false);
  }

  // Close menus on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setToolsDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close tools dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolsDropdownRef.current && !toolsDropdownRef.current.contains(e.target as Node)) {
        setToolsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Prevent background scroll when mobile menu is active
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const closeMobileMenu = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setMobileMenuOpen(false);
    setToolsDropdownOpen(false);
  };

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setToolsDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      setToolsDropdownOpen(false);
    }, 220);
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setToolsDropdownOpen((prev) => !prev);
  };

  const isHomePage = location.pathname === '/';
  const isToolsActive = ['/compare', '/inspector', '/prompt-lab', '/calculator', '/lora-stack', '/lora', '/lora-builder', '/anime-prompt-studio', '/prompt-deconstructor', '/deconstructor', '/workflows', '/comfyui', '/negative-vault', '/negative-prompt', '/embeddings', '/sampler-guide', '/samplers', '/schedulers', '/controlnet', '/openpose', '/preprocessor'].includes(location.pathname);

  return (
    <div className="main-app">  
      <nav className={`nav-editorial ${isScrolled ? 'nav-scrolled' : 'nav-top'}`}>
        <div className="nav-container">
          <Link to="/" className="nav-brand" onClick={closeMobileMenu}>
            <h1>Models Guide</h1>
          </Link>

          {/* Hamburger / Burger Button for Mobile & Small Devices */}
          <button
            type="button"
            className={`nav-burger-btn ${mobileMenuOpen ? 'open' : ''}`}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            <span className="burger-line" />
            <span className="burger-line" />
            <span className="burger-line" />
          </button>

          {/* Nav items list: Clean editorial structure with Tools dropdown */}
          <ul className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <li>
              <NavLink to="/" end onClick={closeMobileMenu}>
                Home
              </NavLink>
            </li>
            <li>
              <NavLink to="/models" onClick={closeMobileMenu}>
                Models
              </NavLink>
            </li>
            <li>
              <NavLink to="/gallery" onClick={closeMobileMenu}>
                Gallery
              </NavLink>
            </li>

            {/* Generative Utilities & Tools Dropdown */}
            <li
              className={`nav-dropdown-item ${toolsDropdownOpen ? 'open' : ''}`}
              ref={toolsDropdownRef}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                className={`nav-dropdown-trigger ${isToolsActive ? 'active' : ''}`}
                onClick={handleTriggerClick}
                aria-expanded={toolsDropdownOpen}
                aria-haspopup="true"
              >
                <span>Tools</span>
                <svg
                  className={`nav-caret ${toolsDropdownOpen ? 'open' : ''}`}
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              <div className={`nav-dropdown-menu ${toolsDropdownOpen ? 'show' : ''}`}>
                <div className="nav-dropdown-header">GENERATIVE UTILITIES</div>
                
                <NavLink
                  to="/compare"
                  className={({ isActive }) => `nav-dropdown-link ${isActive ? 'active' : ''}`}
                  onClick={closeMobileMenu}
                >
                  <span className="nav-tool-icon-box" aria-hidden="true">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="18" x="3" y="3" rx="2" />
                      <line x1="12" y1="3" x2="12" y2="21" />
                    </svg>
                  </span>
                  <span className="nav-tool-info">
                    <span className="nav-tool-name">Compare Models</span>
                    <span className="nav-tool-desc">Side-by-side spec & tensor diff</span>
                  </span>
                </NavLink>

                <NavLink
                  to="/inspector"
                  className={({ isActive }) => `nav-dropdown-link ${isActive ? 'active' : ''}`}
                  onClick={closeMobileMenu}
                >
                  <span className="nav-tool-icon-box" aria-hidden="true">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <circle cx="11.5" cy="14.5" r="2.5" />
                      <path d="m13.5 16.5 2 2" />
                    </svg>
                  </span>
                  <span className="nav-tool-info">
                    <span className="nav-tool-name">Metadata Inspector</span>
                    <span className="nav-tool-desc">SafeTensors header & layer audit</span>
                  </span>
                </NavLink>

                <NavLink
                  to="/prompt-lab"
                  className={({ isActive }) => `nav-dropdown-link ${isActive ? 'active' : ''}`}
                  onClick={closeMobileMenu}
                >
                  <span className="nav-tool-icon-box" aria-hidden="true">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
                      <path d="M8.5 2h7" />
                      <path d="M7 16h10" />
                    </svg>
                  </span>
                  <span className="nav-tool-info">
                    <span className="nav-tool-name">Prompt Studio &amp; Lab</span>
                    <span className="nav-tool-desc">10-layer builder, deconstructor &amp; matrix</span>
                  </span>
                </NavLink>

                <NavLink
                  to="/calculator"
                  className={({ isActive }) => `nav-dropdown-link ${isActive ? 'active' : ''}`}
                  onClick={closeMobileMenu}
                >
                  <span className="nav-tool-icon-box" aria-hidden="true">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="16" height="20" x="4" y="2" rx="2" />
                      <line x1="8" y1="6" x2="16" y2="6" />
                      <line x1="16" y1="14" x2="16" y2="18" />
                      <path d="M16 10h.01" />
                      <path d="M12 10h.01" />
                      <path d="M8 10h.01" />
                      <path d="M12 14h.01" />
                      <path d="M8 14h.01" />
                      <path d="M12 18h.01" />
                      <path d="M8 18h.01" />
                    </svg>
                  </span>
                  <span className="nav-tool-info">
                    <span className="nav-tool-name">Resolution Calculator</span>
                    <span className="nav-tool-desc">Aspect ratio & snap-64 math</span>
                  </span>
                </NavLink>

                <NavLink
                  to="/lora-stack"
                  className={({ isActive }) => `nav-dropdown-link ${isActive ? 'active' : ''}`}
                  onClick={closeMobileMenu}
                >
                  <span className="nav-tool-icon-box" aria-hidden="true">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 2 7 12 12 22 7 12 2" />
                      <polyline points="2 17 12 22 22 17" />
                      <polyline points="2 12 12 17 22 12" />
                    </svg>
                  </span>
                  <span className="nav-tool-info">
                    <span className="nav-tool-name">LoRA Stack Builder</span>
                    <span className="nav-tool-desc">Multi-layer weight & burnout guard</span>
                  </span>
                </NavLink>

                <NavLink
                  to="/workflows"
                  className={({ isActive }) => `nav-dropdown-link ${isActive ? 'active' : ''}`}
                  onClick={closeMobileMenu}
                >
                  <span className="nav-tool-icon-box" aria-hidden="true">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="6" height="6" rx="1.5" />
                      <rect x="16" y="3" width="6" height="6" rx="1.5" />
                      <rect x="16" y="15" width="6" height="6" rx="1.5" />
                      <rect x="2" y="15" width="6" height="6" rx="1.5" />
                      <path d="M8 6h8" />
                      <path d="M5 9v6" />
                      <path d="M19 9v6" />
                    </svg>
                  </span>
                  <span className="nav-tool-info">
                    <span className="nav-tool-name">ComfyUI Workflows</span>
                    <span className="nav-tool-desc">Node graph presets &amp; 1-click export</span>
                  </span>
                </NavLink>

                <NavLink
                  to="/negative-vault"
                  className={({ isActive }) => `nav-dropdown-link ${isActive ? 'active' : ''}`}
                  onClick={closeMobileMenu}
                >
                  <span className="nav-tool-icon-box" aria-hidden="true">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                  </span>
                  <span className="nav-tool-info">
                    <span className="nav-tool-name">Negative Vault</span>
                    <span className="nav-tool-desc">Quality guard, modular mixer &amp; TI dictionary</span>
                  </span>
                </NavLink>

                <NavLink
                  to="/sampler-guide"
                  className={({ isActive }) => `nav-dropdown-link ${isActive ? 'active' : ''}`}
                  onClick={closeMobileMenu}
                >
                  <span className="nav-tool-icon-box" aria-hidden="true">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                  </span>
                  <span className="nav-tool-info">
                    <span className="nav-tool-name">Sampler &amp; Scheduler Guide</span>
                    <span className="nav-tool-desc">Sigma curve plotter &amp; diffusion math</span>
                  </span>
                </NavLink>

                <NavLink
                  to="/controlnet"
                  className={({ isActive }) => `nav-dropdown-link ${isActive ? 'active' : ''}`}
                  onClick={closeMobileMenu}
                >
                  <span className="nav-tool-icon-box" aria-hidden="true">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="5" r="2" />
                      <line x1="12" y1="7" x2="12" y2="14" />
                      <line x1="12" y1="9" x2="7" y2="12" />
                      <line x1="12" y1="9" x2="17" y2="12" />
                      <line x1="12" y1="14" x2="8" y2="21" />
                      <line x1="12" y1="14" x2="16" y2="21" />
                    </svg>
                  </span>
                  <span className="nav-tool-info">
                    <span className="nav-tool-name">ControlNet &amp; OpenPose Rig</span>
                    <span className="nav-tool-desc">18-Joint skeleton editor &amp; preprocessor labs</span>
                  </span>
                </NavLink>
              </div>
            </li>

            <li>
              <NavLink to="/about" onClick={closeMobileMenu}>
                About
              </NavLink>
            </li>
          </ul>
        </div>
      </nav>

      {/* Dimmed backdrop overlay when mobile menu is open */}
      {mobileMenuOpen && (
        <div
          className="nav-mobile-overlay"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Global Content Container - Full-bleed on landing page, standard container on tool pages */}
      <main className={`content ${isHomePage ? 'content-landing' : ''}`}>
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/models" element={<ModelList />} />
            <Route path="/compare" element={<ModelComparison />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/inspector" element={<MetadataInspector />} />
            <Route path="/metadata" element={<MetadataInspector />} />
            <Route path="/prompt-lab" element={<PromptLab />} />
            <Route path="/studio" element={<PromptLab />} />
            <Route path="/calculator" element={<ResolutionCalculator />} />
            <Route path="/lora-stack" element={<LoraStack />} />
            <Route path="/lora" element={<LoraStack />} />
            <Route path="/lora-builder" element={<LoraStack />} />
            <Route path="/anime-prompt-studio" element={<AnimePromptStudio />} />
            <Route path="/prompt-deconstructor" element={<AnimePromptStudio />} />
            <Route path="/deconstructor" element={<AnimePromptStudio />} />
            <Route path="/workflows" element={<ComfyWorkflows />} />
            <Route path="/comfyui" element={<ComfyWorkflows />} />
            <Route path="/negative-vault" element={<NegativeVault />} />
            <Route path="/negative-prompt" element={<NegativeVault />} />
            <Route path="/embeddings" element={<NegativeVault />} />
            <Route path="/sampler-guide" element={<SamplerGuide />} />
            <Route path="/samplers" element={<SamplerGuide />} />
            <Route path="/schedulers" element={<SamplerGuide />} />
            <Route path="/controlnet" element={<ControlNetStudio />} />
            <Route path="/openpose" element={<ControlNetStudio />} />
            <Route path="/preprocessor" element={<ControlNetStudio />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

function App() {
  return (
    <AdminAuthProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </AdminAuthProvider>
  );
}

export default App;