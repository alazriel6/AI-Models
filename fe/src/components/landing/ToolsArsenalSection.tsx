import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CyberSectionNavigator } from './CyberSectionNavigator';
import '../../style/tools-arsenal.css';

export type ToolCategory = 'all' | 'prompt' | 'hardware' | 'workflow' | 'inspection';

export interface ToolItem {
  id: string;
  wsCode: string;
  keyMetric: string;
  name: string;
  route: string;
  badge: string;
  category: 'prompt' | 'hardware' | 'workflow' | 'inspection';
  categoryLabel: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
  highlight?: boolean;
}

const TOOLS_CATALOG: ToolItem[] = [
  {
    id: 'controlnet',
    wsCode: 'WS-01',
    keyMetric: '18-JOINT RIG',
    name: 'ControlNet & OpenPose Rig',
    route: '/controlnet',
    badge: 'ANATOMY RIG',
    category: 'workflow',
    categoryLabel: 'Alur Kerja & Kontrol',
    description: 'Editor pose skeleton 18-joint interaktif berbasis HTML5 Canvas dengan preset anime, panduan preprocessor multi-model (Canny, Depth, OpenPose, Lineart), dan matriks kompatibilitas arsitektur.',
    features: ['18-Joint Interactive Canvas', 'Canny / Depth / Tile Preprocessors', 'JSON & PNG Skeleton Export'],
    highlight: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="2" />
        <line x1="12" y1="7" x2="12" y2="14" />
        <line x1="12" y1="9" x2="7" y2="12" />
        <line x1="12" y1="9" x2="17" y2="12" />
        <line x1="12" y1="14" x2="8" y2="21" />
        <line x1="12" y1="14" x2="16" y2="21" />
      </svg>
    ),
  },
  {
    id: 'vram',
    wsCode: 'WS-02',
    keyMetric: 'GPU TELEMETRY',
    name: 'VRAM & Hardware Profiler',
    route: '/vram',
    badge: 'GPU MEMORY',
    category: 'hardware',
    categoryLabel: 'Hardware & Performa',
    description: 'Kalkulator pemakaian memori GPU real-time untuk SD 1.5, SDXL, Pony, Flux, dan SD3. Prediksi risiko CUDA OOM, overhead PyTorch, dan simulasi offload layer dengan kuantisasi FP16, FP8, dan GGUF.',
    features: ['Real-time OOM Risk Predictor', 'SDXL / Flux FP8 & GGUF Math', 'KV Cache & VAE Tiling Overhead'],
    highlight: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="4" />
        <line x1="6" y1="18" x2="6" y2="15" />
        <line x1="10" y1="18" x2="10" y2="11" />
        <line x1="14" y1="18" x2="14" y2="8" />
        <line x1="18" y1="18" x2="18" y2="13" />
      </svg>
    ),
  },
  {
    id: 'workflows',
    wsCode: 'WS-03',
    keyMetric: 'NODE COMPOSER',
    name: 'ComfyUI Workflows',
    route: '/workflows',
    badge: 'NODE GRAPH',
    category: 'workflow',
    categoryLabel: 'Alur Kerja & Kontrol',
    description: 'Katalog workflow ComfyUI terkurasi untuk SDXL Turbo, ControlNet OpenPose, Face Detailer, dan High-Resolution Upscale. Ekspor file JSON 1-klik siap pakai langsung ke instalasi ComfyUI lokal.',
    features: ['1-Click JSON Workflow Export', 'Custom Node Dependency Audit', 'Visual Graph Flow Previews'],
    highlight: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="6" height="6" rx="1.5" />
        <rect x="16" y="3" width="6" height="6" rx="1.5" />
        <rect x="16" y="15" width="6" height="6" rx="1.5" />
        <rect x="2" y="15" width="6" height="6" rx="1.5" />
        <path d="M8 6h8" />
        <path d="M5 9v6" />
        <path d="M19 9v6" />
      </svg>
    ),
  },
  {
    id: 'telemetry',
    wsCode: 'WS-04',
    keyMetric: 'WS STREAM 0ms',
    name: 'ComfyUI Telemetry & Benchmark',
    route: '/telemetry',
    badge: 'LIVE WEBSOCKET',
    category: 'hardware',
    categoryLabel: 'Hardware & Performa',
    description: 'Monitor eksekusi sesi ComfyUI lokal secara real-time via WebSocket. Rekam kecepatan step iterasi (it/s), latensi sampling, VRAM offload spikes, serta riwayat benchmark hardware lokal ke IndexedDB.',
    features: ['Live WebSocket Execution Monitor', 'Hardware Latency & it/s Tracker', 'Local IndexedDB Zero-Telemetry'],
    highlight: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    id: 'negative-vault',
    wsCode: 'WS-05',
    keyMetric: 'PURITY FILTER',
    name: 'Negative Vault',
    route: '/negative-vault',
    badge: 'QUALITY GUARD',
    category: 'prompt',
    categoryLabel: 'Prompting & Karakter',
    description: 'Vault negative prompt modular dengan pembagian layer kualitas, anatomi, watermark, dan background. Dilengkapi kamus Textual Inversion / Embedding (easynegative, badhandv4) dan pembersih sintaks.',
    features: ['Modular Weight Sliders & Presets', 'Textual Inversion Embedding Vault', 'Auto Syntax Sanitizer (A1111/Comfy)'],
    highlight: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
    ),
  },
  {
    id: 'sampler-guide',
    wsCode: 'WS-06',
    keyMetric: 'SIGMA SCHEDULE',
    name: 'Sampler & Scheduler Guide',
    route: '/sampler-guide',
    badge: 'DIFFUSION MATH',
    category: 'workflow',
    categoryLabel: 'Alur Kerja & Kontrol',
    description: 'Panduan interaktif matematika difusi dengan visualisasi kurva sigma step schedules. Bandingkan karakteristik konvergensi deterministik (Euler a, DPM++ 2M) vs stokastik (SDE) vs Flow-Matching.',
    features: ['Interactive Sigma Schedule Plotter', 'Deterministic vs Stochastic SDE Math', 'Optimal Steps & CFG Guide per Model'],
    highlight: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
        <path d="M4 18c4-4 8-12 16-12" />
      </svg>
    ),
  },
  {
    id: 'story-merger',
    wsCode: 'WS-07',
    keyMetric: 'CHARACTER LOCK',
    name: 'Character Lock & Story Merger',
    route: '/story-merger',
    badge: 'STORYBOARD',
    category: 'prompt',
    categoryLabel: 'Prompting & Karakter',
    description: 'Matriks prompt deterministik 6-slot (Identitas Karakter, Pakaian, Pose, Lingkungan, Pencahayaan, dan Style) untuk menjaga konsistensi visual tokoh di berbagai scene storyboard dan panel komik.',
    features: ['6-Slot Deterministic Prompt Matrix', 'Character Seed & Identity Lock', 'Multi-Scene Storyboard Presets'],
    highlight: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    id: 'prompt-deconstructor',
    wsCode: 'WS-08',
    keyMetric: 'DANBOORU SPLIT',
    name: 'Anime Prompt Deconstructor',
    route: '/prompt-deconstructor',
    badge: 'TAG PARSER',
    category: 'prompt',
    categoryLabel: 'Prompting & Karakter',
    description: 'Dekonstruksi prompt mentah atau teks Danbooru ke dalam 10 layer hierarki visual. Hitung bobot penekanan (emphasis multiplier), eliminasi token redundan, dan impor langsung ke Prompt Studio.',
    features: ['Danbooru Deep Tag Parser', 'Emphasis Weight Multiplier Extractor', 'Direct Send-to-Studio Pipeline'],
    highlight: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    id: 'prompt-lab',
    wsCode: 'WS-09',
    keyMetric: '10-LAYER CANVAS',
    name: 'Prompt Studio & Lab',
    route: '/prompt-lab',
    badge: '10-LAYER STUDIO',
    category: 'prompt',
    categoryLabel: 'Prompting & Karakter',
    description: 'Studio prompt modular 10-layer dengan katalog 7.000+ tag Danbooru terindeks, kalkulator budget CLIP token 75/75, preset prompt genre anime, dan canvas matriks dinamis.',
    features: ['10-Layer Modular Architecture', '7,000+ Indexed Danbooru Tags', 'CLIP Token Limit & Budget Tracker'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
        <path d="M8.5 2h7" />
        <path d="M7 16h10" />
      </svg>
    ),
  },
  {
    id: 'lora-stack',
    wsCode: 'WS-10',
    keyMetric: 'BURNOUT GUARD',
    name: 'LoRA Stack Builder',
    route: '/lora-stack',
    badge: 'WEIGHT MIXER',
    category: 'workflow',
    categoryLabel: 'Alur Kerja & Kontrol',
    description: 'Penumpuk LoRA multi-layer interaktif dengan pendeteksi burnout (overbaking), visualisasi distribusi bobot, agregasi trigger words otomatis, dan ekspor sintaks A1111 / ComfyUI.',
    features: ['Multi-LoRA Weight Sliders', 'Burnout Overbake Safety Guard', 'Automated Trigger Word Aggregator'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    ),
  },
  {
    id: 'compare',
    wsCode: 'WS-11',
    keyMetric: 'OPTICAL SPLIT',
    name: 'Model Comparison',
    route: '/compare',
    badge: 'SPEC DIFF',
    category: 'inspection',
    categoryLabel: 'Inspeksi & Komparasi',
    description: 'Komparasi multi-slot berdampingan hingga 3 model sekaligus. Bandingkan resolusi natif, clip skip layer, Text Encoder, kebutuhan VRAM, dan rekomendasi sampler secara real-time.',
    features: ['Multi-Slot Comparison', 'Difference Highlighter for All Specs', 'Integrated Model Specs Diff'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <line x1="12" y1="3" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    id: 'inspector',
    wsCode: 'WS-12',
    keyMetric: 'LOCAL PARSER',
    name: 'Metadata Inspector',
    route: '/inspector',
    badge: 'SAFETENSORS',
    category: 'inspection',
    categoryLabel: 'Inspeksi & Komparasi',
    description: 'Inspeksi header file SafeTensors zero-copy tanpa beban RAM berlebih. Audit struktur layer U-Net, Text Encoders, resolusi training, dan checksum hash AutoV2 / SHA256 secara transparan.',
    features: ['Zero-Copy Header Deserialization', 'Layer & Tensor Shape Audit', 'Training Metadata & Checksum Verify'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <circle cx="11.5" cy="14.5" r="2.5" />
        <path d="m13.5 16.5 2 2" />
      </svg>
    ),
  },
  {
    id: 'calculator',
    wsCode: 'WS-13',
    keyMetric: 'SNAP-64 LATTICE',
    name: 'Resolution Calculator',
    route: '/calculator',
    badge: 'SNAP-64',
    category: 'hardware',
    categoryLabel: 'Hardware & Performa',
    description: 'Kalkulator resolusi matematis dengan aturan kelipatan 64-pixel VAE lattice. Hindari distorsi anatomi dan hitung target megapixel Hi-Res Fix 1.5x dan 2.0x untuk berbagai aspect ratio.',
    features: ['Snap-64 VAE Lattice Compatibility', 'Hi-Res Fix 1.5x / 2.0x Multipliers', 'Anime & Cinema Aspect Ratio Presets'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect width="16" height="20" x="4" y="2" rx="2" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="16" y1="14" x2="16" y2="18" />
        <path d="M16 10h.01" />
        <path d="M12 10h.01" />
        <path d="M8 10h.01" />
      </svg>
    ),
  },
  {
    id: 'gallery',
    wsCode: 'WS-14',
    keyMetric: 'REPRODUCIBLE SEED',
    name: 'Generation Gallery',
    route: '/gallery',
    badge: 'SHOWCASE',
    category: 'inspection',
    categoryLabel: 'Inspeksi & Komparasi',
    description: 'Galeri generasi visual terkurasi dengan inspektor parameter prompt lengkap: checkpoint, sampler, steps, seed, CFG scale, dan tag yang digunakan dalam karya.',
    features: ['Full Generation Parameter Inspector', '1-Click Copy Prompt & Negative', 'Filter by Base Model & Style'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </svg>
    ),
  },
];

export function ToolsArsenalSection() {
  const navigate = useNavigate();
  const [selectedToolId, setSelectedToolId] = useState<string>('controlnet');
  const [activeCategory, setActiveCategory] = useState<ToolCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mobileExpanded, setMobileExpanded] = useState<boolean>(false);

  // Active Tool for Command Dock
  const activeTool = useMemo(() => {
    return TOOLS_CATALOG.find((t) => t.id === selectedToolId) || TOOLS_CATALOG[0];
  }, [selectedToolId]);

  // Filtered tools
  const filteredTools = useMemo(() => {
    return TOOLS_CATALOG.filter((tool) => {
      const matchesCategory = activeCategory === 'all' || tool.category === activeCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.badge.toLowerCase().includes(q) ||
        tool.wsCode.toLowerCase().includes(q) ||
        tool.keyMetric.toLowerCase().includes(q) ||
        tool.categoryLabel.toLowerCase().includes(q) ||
        tool.features.some((f) => f.toLowerCase().includes(q))
      );
    });
  }, [activeCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts: Record<ToolCategory, number> = {
      all: TOOLS_CATALOG.length,
      prompt: 0,
      hardware: 0,
      workflow: 0,
      inspection: 0,
    };
    TOOLS_CATALOG.forEach((t) => {
      counts[t.category]++;
    });
    return counts;
  }, []);

  return (
    <section className="mg-tools-arsenal" id="tools-arsenal">
      <div className="mg-tools-atmosphere" aria-hidden="true" />

      <div className="mg-container" style={{ position: 'relative', zIndex: 6 }}>

        {/* Section Header */}
        <div className="mg-tools-header">
          <div className="mg-editorial-tag">
            <span className="mg-tag-num">04</span>
            <span className="mg-tag-line" />
            <span className="mg-tag-text">FULL SUITE ARSENAL &amp; WORKSTATIONS</span>
          </div>
          <h2 className="mg-tools-title">
            Seluruh Perkakas &amp;{' '}
            <span className="mg-tools-title-gradient">14 Workstation Terintegrasi</span>
          </h2>
          <p className="mg-tools-subtitle">
            Pilih workstation untuk memuat kontrol di Active Command Dock, atau klik langsung pada kartu untuk membuka perkakas terkait.
          </p>
        </div>

        {/* ===================================================================
            ACTIVE WORKSTATION COMMAND DOCK
            =================================================================== */}
        <div className="mg-command-dock mg-chamfer-md">
          <div className="mg-command-dock-header">
            <div className="mg-dock-code-badge">
              <span className="mg-dock-pulse" />
              <span>COMMAND DOCK // [{activeTool.wsCode}] {activeTool.keyMetric}</span>
            </div>
            <span style={{ fontFamily: 'var(--mg-font-mono)', fontSize: '11px', color: '#6ee7b7' }}>
              ONLINE // ZERO-CLOUD
            </span>
          </div>

          <div className="mg-command-dock-grid">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span className="mg-tool-badge-pill mg-chamfer-sm">{activeTool.badge}</span>
                <span className="mg-tool-cat-pill mg-chamfer-sm">{activeTool.categoryLabel}</span>
              </div>
              <h3 className="mg-dock-title">{activeTool.name}</h3>
              <p className="mg-dock-desc">{activeTool.description}</p>

              <div className="mg-dock-features-list">
                {activeTool.features.map((feat) => (
                  <span key={feat} className="mg-dock-feature-pill mg-chamfer-sm">
                    <span>✓</span>
                    <span>{feat}</span>
                  </span>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="mg-btn mg-btn-primary mg-chamfer-sm mg-btn-large"
              onClick={() => navigate(activeTool.route)}
              style={{ whiteSpace: 'nowrap', padding: '16px 28px', fontSize: '14px' }}
            >
              <span>LAUNCH {activeTool.wsCode} ({activeTool.route})</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="mg-tools-controls">
          <div className="mg-tools-search-box mg-chamfer-sm">
            <svg
              className="mg-tools-search-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="mg-tools-search-input"
              placeholder="Cari perkakas (misal: OpenPose, VRAM, ComfyUI, Negative, Sampler)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Cari perkakas generatif"
            />
            {searchQuery && (
              <button
                type="button"
                className="mg-tools-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Hapus pencarian"
              >
                &times;
              </button>
            )}
          </div>

          <div className="mg-tools-tabs" role="tablist" aria-label="Kategori Perkakas">
            <button
              type="button"
              role="tab"
              aria-selected={activeCategory === 'all'}
              className={`mg-tools-tab-btn mg-chamfer-sm ${activeCategory === 'all' ? 'active' : ''}`}
              onClick={() => setActiveCategory('all')}
            >
              <span>Semua ({categoryCounts.all})</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeCategory === 'prompt'}
              className={`mg-tools-tab-btn mg-chamfer-sm ${activeCategory === 'prompt' ? 'active' : ''}`}
              onClick={() => setActiveCategory('prompt')}
            >
              <span>Prompt ({categoryCounts.prompt})</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeCategory === 'hardware'}
              className={`mg-tools-tab-btn mg-chamfer-sm ${activeCategory === 'hardware' ? 'active' : ''}`}
              onClick={() => setActiveCategory('hardware')}
            >
              <span>Hardware ({categoryCounts.hardware})</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeCategory === 'workflow'}
              className={`mg-tools-tab-btn mg-chamfer-sm ${activeCategory === 'workflow' ? 'active' : ''}`}
              onClick={() => setActiveCategory('workflow')}
            >
              <span>Workflow ({categoryCounts.workflow})</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeCategory === 'inspection'}
              className={`mg-tools-tab-btn mg-chamfer-sm ${activeCategory === 'inspection' ? 'active' : ''}`}
              onClick={() => setActiveCategory('inspection')}
            >
              <span>Inspeksi ({categoryCounts.inspection})</span>
            </button>
          </div>
        </div>

        {/* 14 Tool Cards Grid */}
        <div className="mg-tools-grid">
          {filteredTools.map((tool, idx) => {
            const isSelected = selectedToolId === tool.id;

            return (
              <div
                key={tool.id}
                className={`mg-tool-card mg-chamfer-sm ${isSelected ? 'mg-card-active' : ''} ${!mobileExpanded && idx >= 6 ? 'mg-tool-card-mobile-collapsed' : ''}`}
                onClick={() => setSelectedToolId(tool.id)}
                style={{
                  border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: isSelected ? 'rgba(14, 24, 38, 0.92)' : 'rgba(10, 14, 22, 0.84)',
                  cursor: 'pointer',
                }}
              >
                {/* Header with wsCode & keyMetric */}
                <div className="mg-tool-card-head">
                  <div className="mg-tool-icon-wrapper" aria-hidden="true">
                    {tool.icon}
                  </div>
                  <div className="mg-tool-badges">
                    <span style={{ fontFamily: 'var(--mg-font-mono)', fontSize: '10px', color: '#38bdf8', fontWeight: 800 }}>
                      {tool.wsCode}
                    </span>
                    <span className="mg-tool-badge-pill mg-chamfer-sm">{tool.keyMetric}</span>
                  </div>
                </div>

                {/* Body */}
                <div className="mg-tool-body">
                  <h3 className="mg-tool-name">{tool.name}</h3>
                  <p className="mg-tool-desc">{tool.description}</p>

                  <div className="mg-tool-features">
                    {tool.features.map((feat) => (
                      <span key={feat} className="mg-tool-feature-tag mg-chamfer-sm">
                        <span className="mg-tool-feature-dot" />
                        <span>{feat}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer with SPA Link */}
                <div className="mg-tool-footer">
                  <span className="mg-tool-route-path">{tool.route}</span>
                  <Link
                    to={tool.route}
                    className="mg-tool-action-btn mg-chamfer-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>Launch</span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {filteredTools.length > 6 && (
          <div className="mg-tools-mobile-toggle-wrap">
            <button
              type="button"
              className="mg-btn mg-btn-secondary mg-btn-mobile-expand mg-chamfer-sm"
              onClick={() => setMobileExpanded((prev) => !prev)}
            >
              <span>
                {mobileExpanded
                  ? 'Sembunyikan Sebagian Tool ↑'
                  : `Tampilkan Semua ${filteredTools.length} Workstation ↓`}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Cyberpunk Section Shortcut Navigator (Paling Ujung Bawah Section) */}
      <CyberSectionNavigator
        targetId="technical-reference"
        direction="down"
        label="TECHNICAL MATRIX"
        className="mg-dock-edge bottom"
      />
    </section>
  );
}

export default ToolsArsenalSection;
