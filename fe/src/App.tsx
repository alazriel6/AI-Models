import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Link } from 'react-router-dom';
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

function App() {
  return (
    <AdminAuthProvider>
      <BrowserRouter>
        <div className="main-app">  
          <nav>
            <div className="nav-container">
              <Link to="/" className="nav-brand">
                <div className="brand-icon">✦</div>
                <h1>Models Guide</h1>
              </Link>

              <ul>
                <li>
                  <NavLink to="/" end>
                    Home
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/models">
                    All Models
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/compare">
                    Compare
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/gallery">
                    Gallery
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/inspector">
                    Inspector
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/prompt-lab">
                    Prompt Lab
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/calculator">
                    Calculator
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/about">
                    About
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/contact">
                    Contact
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin" className="nav-admin-badge-link">
                    Admin
                  </NavLink>
                </li>
              </ul>
            </div>
          </nav>

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
      </BrowserRouter>
    </AdminAuthProvider>
  );
}

export default App;