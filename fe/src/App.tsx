import { lazy, Suspense, useState, useEffect } from 'react';
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
const About = lazy(() => import('./components/pages/About'));
const Contact = lazy(() => import('./components/pages/Contact'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));

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
  const location = useLocation();

  // Auto-close menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="main-app">  
      <nav>
        <div className="nav-container">
          <Link to="/" className="nav-brand" onClick={closeMobileMenu}>
            <div className="brand-icon">✦</div>
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

          {/* Nav items list: horizontal on desktop, slide-down drawer on mobile */}
          <ul className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <li>
              <NavLink to="/" end onClick={closeMobileMenu}>
                Home
              </NavLink>
            </li>
            <li>
              <NavLink to="/models" onClick={closeMobileMenu}>
                All Models
              </NavLink>
            </li>
            <li>
              <NavLink to="/compare" onClick={closeMobileMenu}>
                Compare
              </NavLink>
            </li>
            <li>
              <NavLink to="/gallery" onClick={closeMobileMenu}>
                Gallery
              </NavLink>
            </li>
            <li>
              <NavLink to="/inspector" onClick={closeMobileMenu}>
                Inspector
              </NavLink>
            </li>
            <li>
              <NavLink to="/prompt-lab" onClick={closeMobileMenu}>
                Prompt Lab
              </NavLink>
            </li>
            <li>
              <NavLink to="/calculator" onClick={closeMobileMenu}>
                Calculator
              </NavLink>
            </li>
            <li>
              <NavLink to="/about" onClick={closeMobileMenu}>
                About
              </NavLink>
            </li>
            <li>
              <NavLink to="/contact" onClick={closeMobileMenu}>
                Contact
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin" className="nav-admin-badge-link" onClick={closeMobileMenu}>
                Admin
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

      {/* Global Content Container - Same 1560px max width across all pages */}
      <main className="content">
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