import React, { useState } from "react";
import { PreprocessorVisualGraphic } from "./preprocessorVisuals";

interface PreprocessorSpec {
  id: string;
  name: string;
  type: "line" | "depth" | "pose" | "surface" | "tile_ip";
  category: string;
  brief: string;
  mechanism: string;
  bestFor: string[];
  recommendedResolution: string;
  defaultThresholds: string;
  vramImpact: string;
  recommendedWeight: string;
  recommendedEndingStep: string;
  baseModelCompatibility: string[];
  pitfalls: string;
  sourcePreview: string; // SVG or color schematic description
  extractedPreview: string;
  resultPreview: string;
}

export const PREPROCESSOR_LIST: PreprocessorSpec[] = [
  {
    id: "canny",
    name: "Canny (Hard Edge Detector)",
    type: "line",
    category: "Line & Edge Extraction",
    brief: "Deteksi tepi berbasis gradien intensitas piksel dengan dua batas ambang (low & high threshold). Menghasilkan garis hitam-putih biner yang sangat tajam dan presisi geometris.",
    mechanism: "Gaussian blur -> Sobel filter gradien horizontal & vertikal -> Non-maximum suppression -> Hysteresis thresholding biner.",
    bestFor: ["Gedung & Arsitektur", "Kendaraan, Mecha & Hard-Surface", "Objek simetris presisi", "Logo & Tipografi"],
    recommendedResolution: "512 – 1024 px",
    defaultThresholds: "Low: 100, High: 200",
    vramImpact: "Rendah (~100MB)",
    recommendedWeight: "0.75 – 0.90",
    recommendedEndingStep: "0.70 – 0.85",
    baseModelCompatibility: ["SD 1.5", "SDXL", "Pony", "Flux.1"],
    pitfalls: "Jika Low Threshold terlalu rendah, tekstur kasar (kerutan baju, noise background) akan ikut terdeteksi dan membuat render berantakan.",
    sourcePreview: "Gambar nyata mobil sport di jalan raya kota dengan garis refleksi tajam.",
    extractedPreview: "Garis putih biner 1-piksel di atas latar belakang hitam pekat menampilkan rangka mobil & gedung.",
    resultPreview: "Mobil sport masa depan dengan desain baru namun posisi, sudut kamera, dan bentuk velg tetap persis sama.",
  },
  {
    id: "lineart_anime",
    name: "Lineart Anime (Invert / Realistic)",
    type: "line",
    category: "Line & Edge Extraction",
    brief: "Ekstraktor garis menggunakan neural network yang dilatih untuk mengubah gambar anime/ilustrasi menjadi 'line art' bersih khas tinta komik Jepang tanpa noise arsiran bayangan.",
    mechanism: "Deep convolutional line detector yang mengekstraksi kontur esensial karakter dan menyaring gradasi warna atau bayangan lembut.",
    bestFor: ["Manga & Webtoon Coloring", "2D Anime Illustrations", "Fanart Remake", "Line art sketsa manual"],
    recommendedResolution: "512 – 1024 px",
    defaultThresholds: "Auto-Tuned Neural Threshold",
    vramImpact: "Sedang (~400MB)",
    recommendedWeight: "0.80 – 1.00",
    recommendedEndingStep: "0.80 – 0.90",
    baseModelCompatibility: ["SD 1.5", "SDXL", "Illustrious", "Pony"],
    pitfalls: "Jangan gunakan pada foto manusia nyata dengan resolusi rendah karena dapat menghasilkan kontur wajah yang terlalu kartun atau kaku.",
    sourcePreview: "Sketsa pensil manual karakter anime dengan arsiran kasar di kertas fisik.",
    extractedPreview: "Line art tinta hitam bersih dengan ketebalan garis dinamis (thick & thin) tanpa noda kertas.",
    resultPreview: "Ilustrasi anime berwarna penuh kualitas Kyoto Animation dengan warna cerah dan shading bersih.",
  },
  {
    id: "softedge_hed",
    name: "SoftEdge (HED / PIDI)",
    type: "line",
    category: "Line & Edge Extraction",
    brief: "Holistically-Nested Edge Detection yang mempertahankan garis tepi organik dengan tingkat kelembutan bertingkat (grayscale). Memberikan fleksibilitas lebih tinggi dibanding Canny.",
    mechanism: "Multi-scale feature learning yang menggabungkan fitur level rendah (detail mikro) dan level tinggi (bentuk garis besar).",
    bestFor: ["Anatomi manusia & rambut melayang", "Lipatan kain & busana organik", "Hewan & makhluk berbulu", "Lanskap alam & dedaunan"],
    recommendedResolution: "512 – 1024 px",
    defaultThresholds: "Safe step detection: 0.5",
    vramImpact: "Sedang (~400MB)",
    recommendedWeight: "0.60 – 0.85",
    recommendedEndingStep: "0.65 – 0.80",
    baseModelCompatibility: ["SD 1.5", "SDXL", "Pony"],
    pitfalls: "Jika weight terlalu tinggi (> 1.0), gambar akan kehilangan ketajaman dan terlihat seperti lukisan cat air berlapis.",
    sourcePreview: "Model wanita dengan rambut ikal panjang tertiup angin mengenakan gaun berenda.",
    extractedPreview: "Kontur tepi halus bernuansa abu-abu lembut merekam alur rambut tanpa menjadikannya kawat kaku.",
    resultPreview: "Potret artistik baru dengan rambut bergerak dinamis sesuai alur asli tetapi tekstur lebih kaya.",
  },
  {
    id: "depth_anything_v2",
    name: "DepthAnything V2 (State-of-the-Art)",
    type: "depth",
    category: "Depth Estimation",
    brief: "Model estimasi kedalaman relatif tercanggih saat ini. Menghasilkan peta kedalaman dengan separasi latar depan dan belakang yang sangat tajam, termasuk celah jari dan helaian rambut.",
    mechanism: "Vision Transformer (ViT) yang dilatih dengan 62 juta gambar sintetis + data berlabel skala besar dengan zero-shot cross-domain generalization.",
    bestFor: ["Komposisi 3D berlapis (Foreground - Midground - Background)", "Adegan sinematik kompleks", "Bokeh & kedalaman ruang (DoF)", "Pose dengan oklusi tumpang tindih"],
    recommendedResolution: "768 – 1280 px",
    defaultThresholds: "Standard Depth Invert Normalization",
    vramImpact: "Sedang (~400MB)",
    recommendedWeight: "0.75 – 0.90",
    recommendedEndingStep: "0.70 – 0.80",
    baseModelCompatibility: ["SD 1.5", "SDXL", "Pony", "Flux.1 (X-Labs / InstantX)"],
    pitfalls: "Hindari mengatur Ending Step di angka 1.0. Biarkan model berhenti di 0.75 agar tekstur mikro tidak dipaksa rata oleh depth map.",
    sourcePreview: "Karakter berdiri di bawah jembatan kota malam hari dengan lampu jalan di kejauhan.",
    extractedPreview: "Peta kedalaman hitam-putih presisi tinggi: karakter sangat putih (dekat), jembatan abu-abu, langit hitam (jauh).",
    resultPreview: "Render fotorealistik baru dengan pencahayaan volumetrik dan efek blur lensa yang akurat.",
  },
  {
    id: "zoe_depth",
    name: "ZoeDepth (Metric Depth)",
    type: "depth",
    category: "Depth Estimation",
    brief: "Kombinasi antara estimasi kedalaman relatif dan metrik (jarak nyata dalam meter). Sangat menjaga proporsi ruang fisik dan arsitektural.",
    mechanism: "Arsitektur multi-head dengan bin prediktor metrik metrik adaptif untuk interior maupun eksterior.",
    bestFor: ["Desain Interior Ruangan", "Perspektif Arsitektural", "Furnitur & tata letak kamar", "3D scene reconstruction"],
    recommendedResolution: "512 – 1024 px",
    defaultThresholds: "Metric Range Auto-clamp",
    vramImpact: "Tinggi (~1.2GB)",
    recommendedWeight: "0.70 – 0.85",
    recommendedEndingStep: "0.65 – 0.75",
    baseModelCompatibility: ["SD 1.5", "SDXL"],
    pitfalls: "Membutuhkan VRAM lebih besar dibanding DepthAnything V2 karena arsitektur ViT-Large metrik.",
    sourcePreview: "Kamar tidur minimalis dengan meja kerja, jendela kaca besar, dan tempat tidur.",
    extractedPreview: "Peta gradien kedalaman ruang yang mempertahankan lantai datar dan sudut dinding siku 90 derajat.",
    resultPreview: "Kamar tidur tema Cyberpunk Neo-Tokyo dengan perabotan futuristik tepat di posisi asli.",
  },
  {
    id: "dwpose",
    name: "DWPose (Whole-Body Pose Detector)",
    type: "pose",
    category: "Pose & Anatomy Estimation",
    brief: "Detektor pose seluruh tubuh mutakhir (penerus OpenPose). Mampu mendeteksi 18 sendi tubuh, 21 sendi tangan kiri, 21 sendi tangan kanan, dan 70 titik ekspresi wajah secara simultan tanpa tertukar.",
    mechanism: "Two-stage distillation approach (RTMPose backbone) dengan ketahanan tinggi terhadap tangan yang saling menggenggam atau terhalang benda.",
    bestFor: ["Anatomi tangan & jari yang sempurna", "Pose aksi sulit dengan oklusi tubuh", "Ekspresi wajah presisi", "Multi-person interaction"],
    recommendedResolution: "512 – 1024 px",
    defaultThresholds: "Score Threshold: 0.3, Bbox: 0.5",
    vramImpact: "Sedang (~500MB)",
    recommendedWeight: "0.85 – 1.00",
    recommendedEndingStep: "0.80 – 0.90",
    baseModelCompatibility: ["SD 1.5", "SDXL", "Pony", "Flux.1 Union"],
    pitfalls: "Jika gambar input terlalu buram pada bagian jari, gunakan opsi 'OpenPose Face + Body only' untuk menghindari artefak tangan bercabang.",
    sourcePreview: "Gadis memainkan biola dengan posisi jari rumit pada senar dan postur tubuh dinamis.",
    extractedPreview: "Skeleton multi-warna lengkap dengan titik sendi jari tangan hijau-kuning-merah dan kontur wajah.",
    resultPreview: "Ilustrasi anime dengan struktur jari 5 tangan proporsional sedang memegang instrumen fantasi.",
  },
  {
    id: "normal_bae",
    name: "NormalBae (Surface Normal Estimation)",
    type: "surface",
    category: "Surface & Lighting Estimation",
    brief: "Mengekstraksi peta normal permukaan 3D dalam format RGB (Red = Sumbu X, Green = Sumbu Y, Blue = Sumbu Z menghadap kamera). Mengunci arah datang cahaya dan relief permukaan.",
    mechanism: "Uncertainty-guided boundary-aware normal estimation network yang tajam pada sudut dan lipatan.",
    bestFor: ["Konsistensi pencahayaan dramatis", "Relief patung & pahatan batu", "Tekstur kain berlekuk", "Wajah dengan bayangan dramatis"],
    recommendedResolution: "512 – 1024 px",
    defaultThresholds: "Vector Normalization Clamp",
    vramImpact: "Sedang (~400MB)",
    recommendedWeight: "0.60 – 0.80",
    recommendedEndingStep: "0.60 – 0.75",
    baseModelCompatibility: ["SD 1.5", "SDXL"],
    pitfalls: "Jika ControlNet weight terlalu besar, permukaan wajah manusia bisa tampak seperti lilin atau keramik plastik mengkilap.",
    sourcePreview: "Patung marmer Yunani dengan lekukan otot dada dan kain selendang rumit.",
    extractedPreview: "Peta normal warna-warni (merah-cyan-ungu) memetakan arah kemiringan setiap mili piksel patung.",
    resultPreview: "Prajurit mecha emas berkilau dengan pencahayaan rim-light persis mengikuti relief patung marmer.",
  },
  {
    id: "tile_blur",
    name: "Tile / Blur (Upscaling & Detail Synthesizer)",
    type: "tile_ip",
    category: "Super-Resolution & Upscaling",
    brief: "Preprocessor cerdas yang sengaja mengaburkan (downscale + blur) gambar input, lalu memaksa model AI untuk mengisi kembali detail mikro yang hilang tanpa mengubah komposisi utama.",
    mechanism: "Bicubic downsample -> Gaussian blur -> ControlNet feeding untuk menuntun denoiser pada resolusi tinggi.",
    bestFor: ["Ultimate SD Upscale ke 4K/8K", "Menambahkan pori-pori kulit & helai rambut", "Memperbaiki gambar beresolusi rendah / buram", "Restorasi foto lama"],
    recommendedResolution: "1024 – 2048 px (Tiled)",
    defaultThresholds: "Blur Factor: 1.0 (Downsample: 2x)",
    vramImpact: "Rendah (~200MB)",
    recommendedWeight: "0.40 – 0.65",
    recommendedEndingStep: "0.80 – 1.00",
    baseModelCompatibility: ["SD 1.5", "SDXL", "Pony", "Flux.1"],
    pitfalls: "Jika Weight > 0.85, AI tidak akan berani menambahkan detail baru dan hanya meniru kekaburan gambar lama.",
    sourcePreview: "Gambar 512×512 buram dengan wajah agak pecah karena resolusi kecil.",
    extractedPreview: "Peta warna beresolusi rendah yang mempertahankan warna global dan bentuk siluet dasar.",
    resultPreview: "Karya 4K ultra-tajam dengan bulu mata halus, iris mata detail, dan serat kain mikro yang hidup.",
  },
  {
    id: "ip_adapter",
    name: "IP-Adapter / FaceID (Visual Conditioning)",
    type: "tile_ip",
    category: "Style & Character Identity",
    brief: "Bukan preprocessor garis tradisional, melainkan injektor embedding gambar langsung ke lapisan Cross-Attention Unet/DiT. Mengunci wajah karakter atau gaya seni tanpa kata-kata.",
    mechanism: "Decoupled cross-attention mechanism yang memisahkan teks prompt dan representasi fitur visual CLIP/InsightFace.",
    bestFor: ["Konsistensi wajah karakter antar gambar (FaceID)", "Transfer gaya seni lukisan (Style Transfer)", "Membuat pakaian yang persis sama di berbagai pose", "Karakter OC (Original Character) tanpa LoRA"],
    recommendedResolution: "512 – 1024 px",
    defaultThresholds: "Weight: 0.65 (FaceID) / 0.80 (Plus)",
    vramImpact: "Sedang (~600MB)",
    recommendedWeight: "0.50 – 0.75",
    recommendedEndingStep: "0.75 – 0.90",
    baseModelCompatibility: ["SD 1.5", "SDXL", "Pony"],
    pitfalls: "Jika digabung dengan prompt teks yang bertentangan dengan gambar referensi (misal referensi rambut hitam tapi prompt rambut pirang), akan terjadi konflik warna aneh.",
    sourcePreview: "Foto selfie satu karakter wanita muda berambut pendek dan senyum khas.",
    extractedPreview: "Feature embedding vektor 512-dimensi InsightFace & CLIP Image Vision Encoder.",
    resultPreview: "Wanita yang persis sama kini mengenakan pakaian astronot di permukaan planet Mars.",
  },
];

export const PreprocessorGuide: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activePreprocId, setActivePreprocId] = useState<string>("canny");
  const [viewMode, setViewMode] = useState<"side_by_side" | "focused">("side_by_side");
  const [comparisonStage, setComparisonStage] = useState<"source" | "extracted" | "result">("extracted");

  const filteredList = React.useMemo(() => {
    if (selectedCategory === "All") return PREPROCESSOR_LIST;
    return PREPROCESSOR_LIST.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

  const activePreproc = React.useMemo(() => {
    return PREPROCESSOR_LIST.find((p) => p.id === activePreprocId) || PREPROCESSOR_LIST[0];
  }, [activePreprocId]);

  const categories = [
    "All",
    "Line & Edge Extraction",
    "Depth Estimation",
    "Pose & Anatomy Estimation",
    "Surface & Lighting Estimation",
    "Super-Resolution & Upscaling",
    "Style & Character Identity",
  ];

  return (
    <div className="preprocessor-guide-root">
      {/* Editorial Header */}
      <div className="preproc-hero-header">
        <div className="header-meta">
          <span className="meta-badge">FEATURE EXTRACTION DEEP DIVE</span>
          <span className="meta-version">Verified on SD 1.5 • SDXL • Pony • Flux.1</span>
        </div>
        <h2 className="guide-main-title">ControlNet Preprocessor Cheat-Sheet &amp; Laboratory</h2>
        <p className="guide-subtitle">
          Panduan teknis algoritma ekstraksi fitur visual. Pahami perbedaan mendasar antara model deteksi garis (Canny vs Lineart vs SoftEdge), estimasi kedalaman (DepthAnything V2 vs ZoeDepth), hingga anatomi multi-sendi (DWPose).
        </p>
      </div>

      {/* Category Filter Pills */}
      <div className="preproc-category-bar">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`preproc-cat-pill ${selectedCategory === cat ? "active" : ""}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat === "All" ? "Semua Preprocessor (9)" : cat}
          </button>
        ))}
      </div>

      {/* Main Two-Column Layout */}
      <div className="preproc-main-layout">
        {/* Left Column: Preprocessor Navigation Cards */}
        <div className="preproc-list-sidebar">
          {filteredList.map((item) => (
            <div
              key={item.id}
              className={`preproc-nav-card ${activePreprocId === item.id ? "active" : ""}`}
              onClick={() => setActivePreprocId(item.id)}
            >
              <div className="nav-card-top">
                <span className="card-type-tag">{item.category}</span>
                <span className={`vram-badge ${item.vramImpact.includes("Rendah") ? "low" : item.vramImpact.includes("Sedang") ? "mid" : "high"}`}>
                  {item.vramImpact.split(" ")[0]}
                </span>
              </div>
              <h4 className="card-name">{item.name}</h4>
              <p className="card-brief">{item.brief.slice(0, 110)}...</p>
              <div className="card-footer-archs">
                {item.baseModelCompatibility.map((m) => (
                  <span key={m} className="arch-mini-badge">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Deep-Dive Technical Detail & Interactive Comparison */}
        <div className="preproc-detail-content">
          {activePreproc && (
            <div className="preproc-dossier-card">
              {/* Dossier Header */}
              <div className="dossier-header">
                <div className="dossier-title-wrap">
                  <span className="dossier-category">{activePreproc.category}</span>
                  <h3 className="dossier-title">{activePreproc.name}</h3>
                </div>
                <div className="dossier-quick-stats">
                  <div className="stat-box">
                    <span className="stat-label">VRAM Impact</span>
                    <strong className="stat-value">{activePreproc.vramImpact}</strong>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Optimal Weight</span>
                    <strong className="stat-value">{activePreproc.recommendedWeight}</strong>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Ending Step</span>
                    <strong className="stat-value">{activePreproc.recommendedEndingStep}</strong>
                  </div>
                </div>
              </div>

              {/* Interactive 3-Stage Visual Simulator */}
              <div className="preproc-simulator-box">
                <div className="simulator-header">
                  <div className="sim-title-group">
                    <span className="sim-title">3-Stage Visual Pipeline Comparison:</span>
                    <span className="sim-subtitle">Simulasi ekstraksi tensor dan hasil render AI yang sesungguhnya</span>
                  </div>

                  {/* View Mode Toggle: Side-by-Side vs Focused */}
                  <div className="sim-view-toggle">
                    <button
                      type="button"
                      className={`mode-btn ${viewMode === "side_by_side" ? "active" : ""}`}
                      onClick={() => setViewMode("side_by_side")}
                      title="Lihat ketiga tahap (Input -> Map -> Hasil) berjajar"
                    >
                      🔀 3-Tahap Berjajar (Side-by-Side)
                    </button>
                    <button
                      type="button"
                      className={`mode-btn ${viewMode === "focused" ? "active" : ""}`}
                      onClick={() => setViewMode("focused")}
                      title="Fokus ke satu tahap dalam kanvas besar"
                    >
                      🔍 Kanvas Terfokus
                    </button>
                  </div>
                </div>

                {/* 1. SIDE-BY-SIDE MODE (3 Stages simultaneously) */}
                {viewMode === "side_by_side" ? (
                  <div className="pipeline-side-by-side-grid">
                    {/* Stage 1: Input Source */}
                    <div className="pipeline-card stage-source-card">
                      <div className="pipeline-card-header">
                        <span className="stage-num-badge">1</span>
                        <span className="stage-name-text">📷 Input Source Image</span>
                      </div>
                      <div className="pipeline-svg-frame">
                        <PreprocessorVisualGraphic preprocessorId={activePreproc.id} stage="source" />
                      </div>
                      <div className="pipeline-card-info">
                        <p className="pipeline-desc-text">{activePreproc.sourcePreview}</p>
                        <span className="pipeline-spec-badge">
                          Resolusi: {activePreproc.recommendedResolution}
                        </span>
                      </div>
                    </div>

                    {/* Arrow Connector 1 */}
                    <div className="pipeline-connector-col">
                      <div className="connector-pill">
                        <span>➔</span>
                        <small>Ekstraksi</small>
                      </div>
                    </div>

                    {/* Stage 2: Extracted Preprocessor Map */}
                    <div className="pipeline-card stage-extracted-card active-highlight">
                      <div className="pipeline-card-header">
                        <span className="stage-num-badge accent">2</span>
                        <span className="stage-name-text">🧬 Extracted Tensor Map</span>
                      </div>
                      <div className="pipeline-svg-frame">
                        <PreprocessorVisualGraphic preprocessorId={activePreproc.id} stage="extracted" />
                      </div>
                      <div className="pipeline-card-info">
                        <p className="pipeline-desc-text">{activePreproc.extractedPreview}</p>
                        <span className="pipeline-spec-badge highlight">
                          {activePreproc.defaultThresholds}
                        </span>
                      </div>
                    </div>

                    {/* Arrow Connector 2 */}
                    <div className="pipeline-connector-col">
                      <div className="connector-pill">
                        <span>➔</span>
                        <small>ControlNet</small>
                      </div>
                    </div>

                    {/* Stage 3: AI Render Result */}
                    <div className="pipeline-card stage-result-card">
                      <div className="pipeline-card-header">
                        <span className="stage-num-badge success">3</span>
                        <span className="stage-name-text">✨ AI Final Render Output</span>
                      </div>
                      <div className="pipeline-svg-frame">
                        <PreprocessorVisualGraphic preprocessorId={activePreproc.id} stage="result" />
                      </div>
                      <div className="pipeline-card-info">
                        <p className="pipeline-desc-text">{activePreproc.resultPreview}</p>
                        <span className="pipeline-spec-badge success">
                          Weight: {activePreproc.recommendedWeight} • Ending: {activePreproc.recommendedEndingStep}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 2. FOCUSED STAGE MODE (Large View with Stage Tabs) */
                  <div className="pipeline-focused-view">
                    <div className="focused-stage-selector">
                      <button
                        type="button"
                        className={`stage-btn ${comparisonStage === "source" ? "active" : ""}`}
                        onClick={() => setComparisonStage("source")}
                      >
                        1. Input Source Image
                      </button>
                      <button
                        type="button"
                        className={`stage-btn ${comparisonStage === "extracted" ? "active" : ""}`}
                        onClick={() => setComparisonStage("extracted")}
                      >
                        2. Extracted Feature Map (Control Conditioning)
                      </button>
                      <button
                        type="button"
                        className={`stage-btn ${comparisonStage === "result" ? "active" : ""}`}
                        onClick={() => setComparisonStage("result")}
                      >
                        3. AI Final Render
                      </button>
                    </div>

                    <div className="focused-canvas-card">
                      <div className="focused-svg-wrapper">
                        <PreprocessorVisualGraphic preprocessorId={activePreproc.id} stage={comparisonStage} />
                      </div>
                      <div className="focused-card-footer">
                        <div className="focused-indicator">
                          {comparisonStage === "source" && "📷 1. Source Photo / Ilustrasi Awal"}
                          {comparisonStage === "extracted" && "🧬 2. Peta Fitur Ekstraksi (Panduan Kondisioning)"}
                          {comparisonStage === "result" && "✨ 3. Hasil Sintesis Model Generatif AI"}
                        </div>
                        <p className="focused-desc">
                          {comparisonStage === "source" && activePreproc.sourcePreview}
                          {comparisonStage === "extracted" && activePreproc.extractedPreview}
                          {comparisonStage === "result" && activePreproc.resultPreview}
                        </p>
                        <div className="focused-meta-tags">
                          <span className="meta-pill">Resolusi: {activePreproc.recommendedResolution}</span>
                          <span className="meta-pill">Threshold: {activePreproc.defaultThresholds}</span>
                          <span className="meta-pill">Weight: {activePreproc.recommendedWeight}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Technical Dossier Content Sections */}
              <div className="dossier-grid-info">
                {/* 1. Algorithmic Mechanism */}
                <div className="info-block">
                  <h4 className="info-heading">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 2 7 12 12 22 7 12 2" />
                      <polyline points="2 17 12 22 22 17" />
                      <polyline points="2 12 12 17 22 12" />
                    </svg>
                    Mekanisme Algoritma &amp; Matematika
                  </h4>
                  <p className="info-body">{activePreproc.mechanism}</p>
                </div>

                {/* 2. Best Use Cases */}
                <div className="info-block">
                  <h4 className="info-heading">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    Penggunaan Terbaik (Best Use Cases)
                  </h4>
                  <ul className="use-case-list">
                    {activePreproc.bestFor.map((useCase, idx) => (
                      <li key={idx}>{useCase}</li>
                    ))}
                  </ul>
                </div>

                {/* 3. Pitfalls & Common Mistakes */}
                <div className="info-block warning-block">
                  <h4 className="info-heading warning-title">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    Jebakan Umum &amp; Solusi (Pitfalls)
                  </h4>
                  <p className="info-body warning-text">{activePreproc.pitfalls}</p>
                </div>

                {/* 4. Supported Base Models */}
                <div className="info-block">
                  <h4 className="info-heading">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                    Kompatibilitas Base Model
                  </h4>
                  <div className="compat-tags-container">
                    {activePreproc.baseModelCompatibility.map((m) => (
                      <span key={m} className="compat-full-badge">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
