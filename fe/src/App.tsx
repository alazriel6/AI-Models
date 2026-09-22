import { useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Link } from 'react-router-dom'
import './App.css'
import ModelList from './components/model-list.tsx'

function Home() {
  const [selectedCategory, setSelectedCategory] = useState("all")

  return (
    <div className="home-page-container">
      {/* Hero Banner Section */}
      <section className="home-hero-banner">
        <div className="hero-text-block">
          <div className="hero-badge-pill">
            <span>✦</span> AI Model Hub & Technical Guide
          </div>
          <h1 className="hero-title">
            Explore, Inspect & Compare Generative AI Models
          </h1>
          <p className="hero-description">
            Comprehensive tensor analysis, recommended inference parameters, SafeTensors verification,
            and exact VRAM specifications for SDXL, Illustrious, and anime checkpoints.
          </p>

          <div className="hero-actions-row">
            <Link to="/models" className="global-btn global-btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
              </svg>
              Explore All Models →
            </Link>

            <Link to="/about" className="global-btn global-btn-secondary">
              Platform Overview
            </Link>
          </div>
        </div>

        {/* Spotlight Featured Model Card */}
        <div className="hero-spotlight-card">
          <div className="spotlight-img-wrapper">
            <img
              src="/images/preview-1.png"
              alt="Raehoshi Illust XL Featured Checkpoint"
              className="spotlight-img"
            />
            <span className="spotlight-overlay-badge">Featured Checkpoint</span>
          </div>

          <div className="spotlight-content">
            <div className="spotlight-title-row">
              <h3 className="spotlight-title">Raehoshi illust XL</h3>
              <span className="mini-stat-chip">v11.0</span>
            </div>

            <div className="spotlight-chips">
              <span className="mini-stat-chip">👍 3.1K</span>
              <span className="mini-stat-chip">⬇ 39.2K</span>
              <span className="mini-stat-chip">Illustrious XL</span>
            </div>

            <Link to="/models" className="global-btn global-btn-primary" style={{ width: '100%' }}>
              Inspect Model Details →
            </Link>
          </div>
        </div>
      </section>

      {/* Category Tabs Bar */}
      <div className="home-categories-bar">
        {[
          { id: "all", label: "All Categories" },
          { id: "checkpoints", label: "Checkpoints (SDXL / Illustrious)" },
          { id: "lora", label: "LoRA & Style LyCORIS" },
          { id: "controlnet", label: "ControlNet & Adapters" },
          { id: "vae", label: "VAE Modules" },
          { id: "upscalers", label: "Upscalers & Restoration" },
        ].map((cat) => (
          <button
            key={cat.id}
            className={`category-tab-btn ${selectedCategory === cat.id ? "active" : ""}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 3-Column Features Grid */}
      <div className="home-features-grid">
        <div className="feature-box">
          <span className="feature-box-icon">🔬</span>
          <h3>Precision Tensor Inspection</h3>
          <p>
            Break down models layer by layer: conditioners, first-stage models, and UNet/DiT blocks with
            accurate VRAM thresholds for local inference.
          </p>
        </div>

        <div className="feature-box">
          <span className="feature-box-icon">⚙️</span>
          <h3>Verified Inference Settings</h3>
          <p>
            Eliminate trial and error with benchmarked samplers, optimal CFG scales, recommended step counts,
            and clip skip values per checkpoint.
          </p>
        </div>

        <div className="feature-box">
          <span className="feature-box-icon">🛡️</span>
          <h3>SafeTensors & AIR Compatible</h3>
          <p>
            Fully integrated with Civitai AIR identifiers, SHA256 hashes, and security scanning metadata
            to keep your generation pipeline clean and reproducible.
          </p>
        </div>
      </div>
    </div>
  )
}

function About() {
  return (
    <div className="about-page-container">
      <div className="section-title-bar">
        <div>
          <h2>About Models Guide</h2>
          <p>A modern catalog, benchmark reference, and inspection toolkit for generative AI checkpoints.</p>
        </div>
        <Link to="/models" className="global-btn global-btn-primary">
          Browse Models →
        </Link>
      </div>

      <div className="about-grid">
        <div className="about-box-card">
          <h3>
            <span>🎯</span> Platform Purpose
          </h3>
          <p>
            Generative AI checkpoint directories can be overwhelming with hundreds of fine-tunes, mixed formats,
            and varying inference requirements. <strong>Models Guide</strong> simplifies model discovery by providing
            uniform technical specs, exact tensor breakdowns, and author-verified prompts.
          </p>
          <ul className="feature-bullet-list">
            <li>
              <span className="check-bullet">✓</span> Deep tensor layer analysis (Conditioner, First-stage, UNet/DiT)
            </li>
            <li>
              <span className="check-bullet">✓</span> Accurate minimum and recommended VRAM requirements
            </li>
            <li>
              <span className="check-bullet">✓</span> Direct SafeTensors verification and Auto V2 hashes
            </li>
            <li>
              <span className="check-bullet">✓</span> Interactive generation parameter inspection
            </li>
          </ul>
        </div>

        <div className="about-box-card">
          <h3>
            <span>⚡</span> Supported Architectures
          </h3>
          <p>
            We curate and benchmark leading image synthesis checkpoints and architectures:
          </p>
          <ul className="feature-bullet-list">
            <li>
              <span className="check-bullet">✦</span> <strong>Illustrious XL & NoobAI:</strong> High-coherence modern anime architectures
            </li>
            <li>
              <span className="check-bullet">✦</span> <strong>SDXL 1.0 (Stable Diffusion XL):</strong> High resolution 1024x1024 native checkpoints
            </li>
            <li>
              <span className="check-bullet">✦</span> <strong>Pony Diffusion V6:</strong> Specialized aesthetic tuning
            </li>
            <li>
              <span className="check-bullet">✦</span> <strong>SD 1.5 Classics:</strong> Ultra-fast, low VRAM fine-tunes
            </li>
          </ul>
        </div>
      </div>

      {/* Hardware & Inference Specifications Table */}
      <div className="global-card">
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>
          Recommended Hardware Specifications by Base Model
        </h3>
        <div className="specs-table-wrapper">
          <table className="specs-table">
            <thead>
              <tr>
                <th>Base Architecture</th>
                <th>Min VRAM</th>
                <th>Recommended VRAM</th>
                <th>Standard Resolution</th>
                <th>Optimal Sampler</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Illustrious XL</strong></td>
                <td>6 GB (fp16 pruned)</td>
                <td>12 GB+</td>
                <td>832 × 1216 / 1024 × 1024</td>
                <td>Euler a / DPM++ 2M Karras</td>
              </tr>
              <tr>
                <td><strong>SDXL 1.0</strong></td>
                <td>8 GB (fp16)</td>
                <td>16 GB</td>
                <td>1024 × 1024</td>
                <td>DPM++ 2M SDE Karras</td>
              </tr>
              <tr>
                <td><strong>Pony Diffusion XL</strong></td>
                <td>6 GB</td>
                <td>12 GB</td>
                <td>896 × 1152</td>
                <td>Euler a</td>
              </tr>
              <tr>
                <td><strong>SD 1.5</strong></td>
                <td>4 GB</td>
                <td>8 GB</td>
                <td>512 × 768</td>
                <td>DPM++ 2M Karras</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    topic: 'feedback',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setFormData({ name: '', email: '', topic: 'feedback', message: '' })
    }, 3500)
  }

  return (
    <div className="contact-page-container">
      <div className="section-title-bar">
        <div>
          <h2>Get in Touch</h2>
          <p>Have suggestions, checkpoint recommendations, or feedback? Let us know!</p>
        </div>
      </div>

      <div className="contact-layout-grid">
        {/* Contact Form */}
        <div className="contact-form-card">
          <h3>Send us a Message</h3>
          <p>Fill out the form below and we will get back to you.</p>

          {submitted ? (
            <div style={{ padding: '24px', background: 'rgba(32, 201, 151, 0.1)', border: '1px solid #20c997', borderRadius: '8px', color: '#20c997' }}>
              <h4 style={{ margin: '0 0 6px' }}>✓ Message Received</h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#dee2e6' }}>
                Thank you for your feedback! We have received your submission.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-row-2col">
                <div className="form-field-group">
                  <label htmlFor="name">Your Name</label>
                  <input
                    id="name"
                    type="text"
                    required
                    placeholder="e.g. Alex"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-field-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-field-group">
                <label htmlFor="topic">Topic</label>
                <select
                  id="topic"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                >
                  <option value="feedback">General Feedback</option>
                  <option value="model-submission">Model / Checkpoint Submission</option>
                  <option value="bug-report">Bug Report / Data Issue</option>
                  <option value="collaboration">Partnership & API</option>
                </select>
              </div>

              <div className="form-field-group">
                <label htmlFor="message">Message</label>
                <textarea
                  id="message"
                  rows={5}
                  required
                  placeholder="Tell us what you think or provide checkpoint links..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>

              <button type="submit" className="global-btn global-btn-primary" style={{ width: '100%' }}>
                Send Message
              </button>
            </form>
          )}
        </div>

        {/* Community Channels Sidebar */}
        <div className="community-channels-column">
          <a
            href="https://civitai.com"
            target="_blank"
            rel="noopener noreferrer"
            className="channel-link-card"
          >
            <div className="channel-icon">🌐</div>
            <div className="channel-meta">
              <span className="channel-title">Civitai Ecosystem</span>
              <span className="channel-desc">Explore models, articles, and active creator community</span>
            </div>
          </a>

          <a
            href="https://huggingface.co"
            target="_blank"
            rel="noopener noreferrer"
            className="channel-link-card"
          >
            <div className="channel-icon">🤗</div>
            <div className="channel-meta">
              <span className="channel-title">Hugging Face Hub</span>
              <span className="channel-desc">Browse checkpoint repositories and open weights</span>
            </div>
          </a>

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="channel-link-card"
          >
            <div className="channel-icon">💻</div>
            <div className="channel-meta">
              <span className="channel-title">GitHub Repository</span>
              <span className="channel-desc">Contribute to the Models Guide source code</span>
            </div>
          </a>

          <div className="global-card" style={{ padding: '16px' }}>
            <span style={{ fontSize: '11px', color: '#909296', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
              API Status
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#51cf66' }}></span>
              <span style={{ fontSize: '13px', color: '#ffffff', fontWeight: 600 }}>API Client Online (v1.0)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div className="main-app">  
        <nav>
          <div className="nav-container">
            <Link to="/" className="nav-brand">
              <div className="brand-icon">✦</div>
              <h1>Models Guide</h1>
              {/* <span className="brand-badge">Civitai Hub</span> */}
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
  )
}

export default App