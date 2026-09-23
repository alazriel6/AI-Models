import { useState } from 'react';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    topic: 'feedback',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', email: '', topic: 'feedback', message: '' });
    }, 3500);
  };

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
            <div
              style={{
                padding: '24px',
                background: 'rgba(32, 201, 151, 0.1)',
                border: '1px solid #20c997',
                borderRadius: '8px',
                color: '#20c997',
              }}
            >
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
            <span
              style={{
                fontSize: '11px',
                color: '#909296',
                textTransform: 'uppercase',
                fontWeight: 700,
                letterSpacing: '0.5px',
              }}
            >
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
  );
}
