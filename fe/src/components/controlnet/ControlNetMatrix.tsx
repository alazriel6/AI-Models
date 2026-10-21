import React, { useState, useMemo, useEffect } from "react";
import { getControlNetModelsApi, type ControlNetModelApiItem } from "../../api/controlnet";

export interface ControlNetModelItem {
  id: string;
  name: string;
  filename: string;
  baseModel: "SD 1.5" | "SDXL" | "Pony" | "Illustrious" | "Flux.1";
  controlType: "OpenPose" | "Canny" | "Depth" | "Lineart" | "SoftEdge" | "Tile" | "Inpaint" | "IP-Adapter" | "Union";
  author: string;
  filesize: string;
  vram: string;
  recommendedWeight: string;
  recommendedEndingStep: string;
  controlMode: "Balanced" | "My prompt is more important" | "ControlNet is more important";
  huggingFaceUrl: string;
  description: string;
  comfyNode: string;
  webuiParam: string;
  tags: string[];
}

function mapApiModelToItem(api: ControlNetModelApiItem): ControlNetModelItem {
  return {
    id: String(api.id),
    name: api.name,
    filename: api.filename,
    baseModel: api.base_model as any,
    controlType: api.control_type as any,
    author: api.author,
    filesize: api.filesize,
    vram: api.vram,
    recommendedWeight: api.recommended_weight,
    recommendedEndingStep: api.recommended_ending_step,
    controlMode: api.control_mode as any,
    huggingFaceUrl: api.huggingface_url,
    description: api.description,
    comfyNode: api.comfy_node,
    webuiParam: api.webui_param,
    tags: api.tags ? api.tags.split(",").map((s) => s.trim()) : [],
  };
}

export const CONTROLNET_MODELS_CATALOG: ControlNetModelItem[] = [
  // =================== FLUX.1 MODELS ===================
  {
    id: "flux-union-instantx",
    name: "FLUX.1-dev ControlNet Union (All-in-One)",
    filename: "diffusion_pytorch_model.safetensors",
    baseModel: "Flux.1",
    controlType: "Union",
    author: "InstantX",
    filesize: "4.74 GB",
    vram: "~16 GB+ (FP8 offload ~10GB)",
    recommendedWeight: "0.60 – 0.80",
    recommendedEndingStep: "0.75 – 0.85",
    controlMode: "Balanced",
    huggingFaceUrl: "https://huggingface.co/InstantX/FLUX.1-dev-Controlnet-Union",
    description: "Model ControlNet Union resmi untuk Flux.1 Dev. Mendukung 7 mode sekaligus dalam satu file: OpenPose, Canny, Depth, Tile, Blur, Low-Res, dan Gray.",
    comfyNode: "ApplyControlNet (InstantX Flux Union)",
    webuiParam: "Control Type: Union / All-in-One (Mode 0: Canny, Mode 4: OpenPose)",
    tags: ["flux", "union", "openpose", "canny", "depth", "tile", "all-in-one"],
  },
  {
    id: "flux-union-shakker",
    name: "FLUX.1-dev ControlNet Union Pro",
    filename: "flux-controlnet-union-pro.safetensors",
    baseModel: "Flux.1",
    controlType: "Union",
    author: "Shakker-Labs",
    filesize: "4.92 GB",
    vram: "~16 GB+ (FP8 ~10GB)",
    recommendedWeight: "0.65 – 0.85",
    recommendedEndingStep: "0.70 – 0.80",
    controlMode: "Balanced",
    huggingFaceUrl: "https://huggingface.co/Shakker-Labs/FLUX.1-dev-ControlNet-Union-Pro",
    description: "Versi penyempurnaan dari Shakker Labs dengan bobot attention khusus untuk preservasi anatomi tangan dan wajah pada generasi natural language Flux.",
    comfyNode: "ApplyControlNet (Shakker Flux Union Pro)",
    webuiParam: "Weight: 0.70, Ending: 0.75",
    tags: ["flux", "shakker", "pro", "union", "hand-preservation"],
  },
  {
    id: "flux-canny-xlabs",
    name: "FLUX.1 Canny ControlNet (X-Labs)",
    filename: "flux-canny-controlnet.safetensors",
    baseModel: "Flux.1",
    controlType: "Canny",
    author: "X-Labs AI",
    filesize: "1.45 GB",
    vram: "~12 GB+ (Comfy LowVRAM)",
    recommendedWeight: "0.70 – 0.85",
    recommendedEndingStep: "0.75 – 0.85",
    controlMode: "Balanced",
    huggingFaceUrl: "https://huggingface.co/XLabs-AI/flux-controlnet-canny-v3",
    description: "Model Canny edge mandiri yang sangat ringan untuk Flux.1. Mampu mengunci arsitektur bangunan dan garis kendaraan dengan detail tajam.",
    comfyNode: "LoadControlNet (XLabs Flux Canny)",
    webuiParam: "Weight: 0.75, Step Ending: 0.80",
    tags: ["flux", "x-labs", "canny", "architecture", "mecha"],
  },
  {
    id: "flux-depth-xlabs",
    name: "FLUX.1 Depth ControlNet (X-Labs)",
    filename: "flux-depth-controlnet.safetensors",
    baseModel: "Flux.1",
    controlType: "Depth",
    author: "X-Labs AI",
    filesize: "1.45 GB",
    vram: "~12 GB+ (Comfy LowVRAM)",
    recommendedWeight: "0.65 – 0.80",
    recommendedEndingStep: "0.70 – 0.80",
    controlMode: "Balanced",
    huggingFaceUrl: "https://huggingface.co/XLabs-AI/flux-controlnet-depth-v3",
    description: "Model Depth mandiri untuk Flux.1 yang bekerja sangat optimal saat dipasangkan dengan preprocessor DepthAnything V2.",
    comfyNode: "LoadControlNet (XLabs Flux Depth)",
    webuiParam: "Weight: 0.70, Step Ending: 0.75",
    tags: ["flux", "x-labs", "depth", "3d", "spatial"],
  },

  // =================== SDXL / PONY / ILLUSTRIOUS MODELS ===================
  {
    id: "sdxl-openpose-xinsir",
    name: "ControlNet OpenPose SDXL (Xinsir)",
    filename: "controlnet-openpose-sdxl-1.0.safetensors",
    baseModel: "SDXL",
    controlType: "OpenPose",
    author: "Xinsir",
    filesize: "2.50 GB",
    vram: "~8 GB+",
    recommendedWeight: "0.85 – 0.95",
    recommendedEndingStep: "0.80 – 0.90",
    controlMode: "ControlNet is more important",
    huggingFaceUrl: "https://huggingface.co/xinsir/controlnet-openpose-sdxl-1.0",
    description: "Standar emas model OpenPose untuk SDXL & Pony. Presisi anatomi tangan dan kaki jauh melampaui model SDXL generasi pertama.",
    comfyNode: "ApplyControlNet (Xinsir OpenPose SDXL)",
    webuiParam: "Preprocessor: none / dw_openpose_full, Weight: 0.90",
    tags: ["sdxl", "pony", "illustrious", "openpose", "xinsir", "benchmark"],
  },
  {
    id: "sdxl-tile-xinsir",
    name: "ControlNet Tile SDXL (Xinsir)",
    filename: "controlnet-tile-sdxl-1.0.safetensors",
    baseModel: "SDXL",
    controlType: "Tile",
    author: "Xinsir",
    filesize: "2.50 GB",
    vram: "~8 GB+",
    recommendedWeight: "0.45 – 0.65",
    recommendedEndingStep: "0.80 – 1.00",
    controlMode: "Balanced",
    huggingFaceUrl: "https://huggingface.co/xinsir/controlnet-tile-sdxl-1.0",
    description: "Model Tile terbaik untuk Ultimate SD Upscale SDXL. Memungkinkan pembesaran hingga 4K tanpa mengubah wajah atau detail komposisi asli.",
    comfyNode: "ApplyControlNet (Xinsir Tile SDXL)",
    webuiParam: "Tile / Blur, Weight: 0.50, Denoising: 0.35",
    tags: ["sdxl", "tile", "upscale", "4k", "super-resolution"],
  },
  {
    id: "sdxl-anime-lineart",
    name: "ControlNet Anime Lineart SDXL",
    filename: "controlnet-anime-lineart-sdxl.safetensors",
    baseModel: "Illustrious",
    controlType: "Lineart",
    author: "Thibaud / SAI",
    filesize: "2.50 GB",
    vram: "~8 GB+",
    recommendedWeight: "0.75 – 0.95",
    recommendedEndingStep: "0.80 – 0.85",
    controlMode: "Balanced",
    huggingFaceUrl: "https://huggingface.co/thibaud/controlnet-sdxl-lineart-anime",
    description: "Khusus di-fine-tune untuk model anime SDXL seperti Illustrious-XL dan NoobAI. Mengeksekusi pewarnaan manga dan sketsa dengan sangat rapi.",
    comfyNode: "ApplyControlNet (Anime Lineart SDXL)",
    webuiParam: "Preprocessor: lineart_anime, Weight: 0.85",
    tags: ["sdxl", "illustrious", "anime", "lineart", "manga"],
  },
  {
    id: "sdxl-depth-sai",
    name: "ControlNet Depth SDXL 1.0",
    filename: "controlnet-depth-sdxl-1.0.safetensors",
    baseModel: "SDXL",
    controlType: "Depth",
    author: "Stability AI / Diffusers",
    filesize: "2.50 GB",
    vram: "~8 GB+",
    recommendedWeight: "0.70 – 0.85",
    recommendedEndingStep: "0.70 – 0.80",
    controlMode: "Balanced",
    huggingFaceUrl: "https://huggingface.co/diffusers/controlnet-depth-sdxl-1.0",
    description: "Model resmi kedalaman 3D untuk SDXL. Sangat stabil dalam mempertahankan skala ruang dan sudut kamera ekstrem.",
    comfyNode: "ApplyControlNet (Depth SDXL)",
    webuiParam: "Preprocessor: depth_anything_v2, Weight: 0.80",
    tags: ["sdxl", "depth", "official", "stability"],
  },
  {
    id: "sdxl-canny-sai",
    name: "ControlNet Canny SDXL 1.0",
    filename: "controlnet-canny-sdxl-1.0.safetensors",
    baseModel: "SDXL",
    controlType: "Canny",
    author: "Stability AI / Diffusers",
    filesize: "2.50 GB",
    vram: "~8 GB+",
    recommendedWeight: "0.75 – 0.90",
    recommendedEndingStep: "0.75 – 0.85",
    controlMode: "Balanced",
    huggingFaceUrl: "https://huggingface.co/diffusers/controlnet-canny-sdxl-1.0",
    description: "Model Canny resmi untuk SDXL. Mengunci garis tepi keras pada desain produk, mecha, dan arsitektur.",
    comfyNode: "ApplyControlNet (Canny SDXL)",
    webuiParam: "Preprocessor: canny, Weight: 0.85",
    tags: ["sdxl", "canny", "hard-edge", "official"],
  },

  // =================== SD 1.5 MODELS ===================
  {
    id: "sd15-openpose-v11p",
    name: "ControlNet OpenPose v11p (SD 1.5)",
    filename: "control_v11p_sd15_openpose.safetensors",
    baseModel: "SD 1.5",
    controlType: "OpenPose",
    author: "lllyasviel",
    filesize: "1.45 GB",
    vram: "~4 GB+",
    recommendedWeight: "0.85 – 1.00",
    recommendedEndingStep: "0.80 – 0.90",
    controlMode: "ControlNet is more important",
    huggingFaceUrl: "https://huggingface.co/lllyasviel/ControlNet-v1-1/blob/main/control_v11p_sd15_openpose.safetensors",
    description: "Model OpenPose legendaris paling stabil dan hemat VRAM. Berfungsi sempurna pada GPU 4GB - 6GB dengan inferensi secepat kilat.",
    comfyNode: "ApplyControlNet (v11p OpenPose)",
    webuiParam: "Preprocessor: none / openpose_full, Weight: 0.90",
    tags: ["sd15", "openpose", "v11p", "lllyasviel", "low-vram"],
  },
  {
    id: "sd15-lineart-anime-v11p",
    name: "ControlNet Lineart Anime v11p (SD 1.5)",
    filename: "control_v11p_sd15s2_lineart_anime.safetensors",
    baseModel: "SD 1.5",
    controlType: "Lineart",
    author: "lllyasviel",
    filesize: "1.45 GB",
    vram: "~4 GB+",
    recommendedWeight: "0.80 – 0.95",
    recommendedEndingStep: "0.80 – 0.85",
    controlMode: "Balanced",
    huggingFaceUrl: "https://huggingface.co/lllyasviel/ControlNet-v1-1/blob/main/control_v11p_sd15s2_lineart_anime.safetensors",
    description: "Model pewarnaan anime paling populer untuk SD 1.5 (Anything V5, MeinaMix). Mengubah sketsa pensil menjadi gambar anime utuh dalam hitungan detik.",
    comfyNode: "ApplyControlNet (v11p Lineart Anime)",
    webuiParam: "Preprocessor: lineart_anime, Weight: 0.85",
    tags: ["sd15", "lineart", "anime", "manga", "v11p"],
  },
  {
    id: "sd15-depth-v11f1p",
    name: "ControlNet Depth v11f1p (SD 1.5)",
    filename: "control_v11f1p_sd15_depth.safetensors",
    baseModel: "SD 1.5",
    controlType: "Depth",
    author: "lllyasviel",
    filesize: "1.45 GB",
    vram: "~4 GB+",
    recommendedWeight: "0.75 – 0.90",
    recommendedEndingStep: "0.75 – 0.85",
    controlMode: "Balanced",
    huggingFaceUrl: "https://huggingface.co/lllyasviel/ControlNet-v1-1/blob/main/control_v11f1p_sd15_depth.safetensors",
    description: "Model Depth SD 1.5 standar industri. Menjaga kedalaman adegan kompleks dan siluet latar belakang secara konsisten.",
    comfyNode: "ApplyControlNet (v11p Depth)",
    webuiParam: "Preprocessor: depth_anything_v2, Weight: 0.80",
    tags: ["sd15", "depth", "v11p", "lllyasviel"],
  },
  {
    id: "sd15-tile-v11f1e",
    name: "ControlNet Tile v11f1e (SD 1.5)",
    filename: "control_v11f1e_sd15_tile.safetensors",
    baseModel: "SD 1.5",
    controlType: "Tile",
    author: "lllyasviel",
    filesize: "1.45 GB",
    vram: "~4 GB+",
    recommendedWeight: "0.40 – 0.60",
    recommendedEndingStep: "0.85 – 1.00",
    controlMode: "Balanced",
    huggingFaceUrl: "https://huggingface.co/lllyasviel/ControlNet-v1-1/blob/main/control_v11f1e_sd15_tile.safetensors",
    description: "Pondasi utama workflow Ultimate SD Upscale di SD 1.5. Mencegah halusinasi dan duplikasi objek saat render tile per tile.",
    comfyNode: "ApplyControlNet (v11p Tile)",
    webuiParam: "Tile / Blur, Weight: 0.50, Denoising: 0.30",
    tags: ["sd15", "tile", "upscale", "hires-fix"],
  },
  {
    id: "sd15-inpaint-v11p",
    name: "ControlNet Inpaint v11p (SD 1.5)",
    filename: "control_v11p_sd15_inpaint.safetensors",
    baseModel: "SD 1.5",
    controlType: "Inpaint",
    author: "lllyasviel",
    filesize: "1.45 GB",
    vram: "~4 GB+",
    recommendedWeight: "0.85 – 1.00",
    recommendedEndingStep: "1.00",
    controlMode: "ControlNet is more important",
    huggingFaceUrl: "https://huggingface.co/lllyasviel/ControlNet-v1-1/blob/main/control_v11p_sd15_inpaint.safetensors",
    description: "Mengubah checkpoint biasa (non-inpaint) menjadi model inpainting handal tanpa perlu mengunduh file checkpoint inpaint 4GB baru.",
    comfyNode: "ApplyControlNet (v11p Inpaint)",
    webuiParam: "Inpaint Only + Lama / Blend",
    tags: ["sd15", "inpaint", "masking", "v11p"],
  },
];

export const ControlNetMatrix: React.FC = () => {
  const [models, setModels] = useState<ControlNetModelItem[]>(CONTROLNET_MODELS_CATALOG);
  const [isDbConnected, setIsDbConnected] = useState<boolean>(false);
  const [loadingModels, setLoadingModels] = useState<boolean>(true);

  const [selectedArch, setSelectedArch] = useState<string>("All");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch models from PostgreSQL backend API
  useEffect(() => {
    async function fetchModels() {
      setLoadingModels(true);
      try {
        const res = await getControlNetModelsApi();
        if (res && res.data && res.data.length > 0) {
          setModels(res.data.map(mapApiModelToItem));
          setIsDbConnected(true);
        }
      } catch (err) {
        console.warn("Using offline catalog fallback for ControlNet models:", err);
        setIsDbConnected(false);
      } finally {
        setLoadingModels(false);
      }
    }
    fetchModels();
  }, []);

  const architectures = ["All", "Flux.1", "SDXL", "Illustrious", "SD 1.5"];
  const controlTypes = ["All", "OpenPose", "Canny", "Depth", "Lineart", "Tile", "Inpaint", "Union"];

  const filteredModels = useMemo(() => {
    return models.filter((item) => {
      const matchArch = selectedArch === "All" || item.baseModel === selectedArch || (selectedArch === "SDXL" && (item.baseModel === "Pony" || item.baseModel === "Illustrious"));
      const matchType = selectedType === "All" || item.controlType === selectedType;
      const matchSearch =
        searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchArch && matchType && matchSearch;
    });
  }, [models, selectedArch, selectedType, searchQuery]);

  const handleCopyFilename = (filename: string, id: string) => {
    navigator.clipboard.writeText(filename);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="controlnet-matrix-root">
      {/* Header */}
      <div className="matrix-hero-header">
        <div className="header-meta">
          <span className="meta-badge">AUTHENTIC MODEL REPOSITORY</span>
          <span className={`meta-version ${isDbConnected ? "db-live-tag" : ""}`}>
            {isDbConnected ? "🟢 PostgreSQL Database (Live)" : "📦 Local Catalog"} • {models.length} Model Terverifikasi
          </span>
        </div>
        <h2 className="matrix-main-title">ControlNet Architecture Matrix &amp; Directory</h2>
        <p className="matrix-subtitle">
          Katalog model ControlNet resmi terverifikasi untuk <strong>Flux.1</strong>, <strong>SDXL / Pony / Illustrious</strong>, dan <strong>SD 1.5</strong>. Dapatkan rekomendasi control weight, step ending, dan setup node ComfyUI/WebUI yang teruji.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="matrix-filter-bar">
        {/* Architecture Tabs */}
        <div className="filter-group">
          <span className="filter-group-label">Base Model:</span>
          <div className="filter-pills">
            {architectures.map((arch) => (
              <button
                key={arch}
                type="button"
                className={`matrix-filter-pill ${selectedArch === arch ? "active" : ""}`}
                onClick={() => setSelectedArch(arch)}
              >
                {arch}
              </button>
            ))}
          </div>
        </div>

        {/* Control Type Tabs */}
        <div className="filter-group">
          <span className="filter-group-label">Control Type:</span>
          <div className="filter-pills">
            {controlTypes.map((type) => (
              <button
                key={type}
                type="button"
                className={`matrix-filter-pill ${selectedType === type ? "active" : ""}`}
                onClick={() => setSelectedType(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="matrix-search-box">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama model, author, atau filename..."
            className="matrix-search-input"
          />
        </div>
      </div>

      {/* Model Cards Grid */}
      <div className="matrix-cards-grid">
        {loadingModels && models.length === 0 ? (
          <div className="no-models-found">
            <p>Memuat katalog model dari database PostgreSQL...</p>
          </div>
        ) : filteredModels.length > 0 ? (
          filteredModels.map((model) => (
            <div key={model.id} className="controlnet-model-card">
              {/* Card Header */}
              <div className="card-top-row">
                <div className="card-badges-wrap">
                  <span className={`arch-badge arch-${model.baseModel.toLowerCase().replace(/[^a-z0-9]/g, "")}`}>
                    {model.baseModel}
                  </span>
                  <span className={`type-badge type-${model.controlType.toLowerCase()}`}>
                    {model.controlType}
                  </span>
                </div>
                <span className="model-author-badge">by {model.author}</span>
              </div>

              {/* Title & Description */}
              <h3 className="model-card-title">{model.name}</h3>
              <p className="model-card-desc">{model.description}</p>

              {/* Technical Parameter Grid */}
              <div className="card-params-table">
                <div className="param-item">
                  <span className="p-label">Optimal Weight:</span>
                  <strong className="p-value accent-cyan">{model.recommendedWeight}</strong>
                </div>
                <div className="param-item">
                  <span className="p-label">Ending Step:</span>
                  <strong className="p-value accent-green">{model.recommendedEndingStep}</strong>
                </div>
                <div className="param-item">
                  <span className="p-label">File Size:</span>
                  <strong className="p-value">{model.filesize}</strong>
                </div>
                <div className="param-item">
                  <span className="p-label">VRAM Req:</span>
                  <strong className="p-value">{model.vram}</strong>
                </div>
              </div>

              {/* Mode Recommendation */}
              <div className="card-mode-row">
                <span className="mode-label">Control Mode:</span>
                <span className="mode-badge">{model.controlMode}</span>
              </div>

              {/* Filename with 1-Click Copy */}
              <div className="model-filename-dock">
                <span className="filename-text" title={model.filename}>
                  {model.filename}
                </span>
                <button
                  type="button"
                  className="copy-filename-btn"
                  onClick={() => handleCopyFilename(model.filename, model.id)}
                  title="Copy Filename"
                >
                  {copiedId === model.id ? (
                    <span className="copied-text">Copied!</span>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="card-actions-row">
                <a
                  href={model.huggingFaceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hf-download-btn"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Hugging Face Weights</span>
                </a>
              </div>
            </div>
          ))
        ) : (
          <div className="no-models-found">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p>Tidak ada model ControlNet yang sesuai dengan kriteria filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};
