import { BrowserRouter, Routes, Route, NavLink, Link } from 'react-router-dom';
import './App.css';
import Home from './components/pages/Home';
import About from './components/pages/About';
import Contact from './components/pages/Contact';
import ModelList from './components/model-list';

function App() {
  return (
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
                <NavLink to="/about">
                  About
                </NavLink>
              </li>
              <li>
                <NavLink to="/contact">
                  Contact
                </NavLink>
              </li>
            </ul>
          </div>
        </nav>

        {/* Global Content Container - Same 1560px max width across all pages */}
        <main className="content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/models" element={<ModelList />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;