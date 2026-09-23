import { Link } from 'react-router-dom';

export default function About() {
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
  );
}
