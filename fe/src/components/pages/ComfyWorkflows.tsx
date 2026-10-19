import { useEffect, useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { getWorkflowsApi, type ComfyWorkflow } from "../../api/workflows";
import { ComfyNodeViewer } from "../comfyui/ComfyNodeViewer";
import "../../style/comfy-workflows.css";

const BASE_MODEL_OPTIONS = ["All", "SDXL", "Illustrious", "Pony", "Flux"];
const CATEGORY_OPTIONS = ["All", "txt2img", "img2img", "upscale", "detailer", "lora_stack"];

export default function ComfyWorkflows() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [workflows, setWorkflows] = useState<ComfyWorkflow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<ComfyWorkflow | null>(null);

  // Filters
  const [baseModelFilter, setBaseModelFilter] = useState<string>(
    searchParams.get("base_model") || "All"
  );
  const [categoryFilter, setCategoryFilter] = useState<string>(
    searchParams.get("category") || "All"
  );
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Custom JSON modal state
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [customJsonInput, setCustomJsonInput] = useState<string>("");
  const [customWorkflowTitle, setCustomWorkflowTitle] = useState<string>("Custom Imported Workflow");
  const [customError, setCustomError] = useState<string | null>(null);

  // Fetch workflows
  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      const data = await getWorkflowsApi();
      if (isMounted) {
        setWorkflows(data);

        // Check if an ID or slug is in query params
        const targetId = searchParams.get("id");
        const targetSlug = searchParams.get("slug");

        if (targetId) {
          const found = data.find((w) => String(w.id) === targetId);
          if (found) setSelectedWorkflow(found);
          else if (data.length > 0) setSelectedWorkflow(data[0]);
        } else if (targetSlug) {
          const found = data.find((w) => w.slug === targetSlug);
          if (found) setSelectedWorkflow(found);
          else if (data.length > 0) setSelectedWorkflow(data[0]);
        } else if (data.length > 0) {
          setSelectedWorkflow(data[0]);
        }
        setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  // Filtered workflows list
  const filteredWorkflows = useMemo(() => {
    return workflows.filter((w) => {
      if (baseModelFilter !== "All" && w.base_model.toLowerCase() !== baseModelFilter.toLowerCase()) {
        return false;
      }
      if (categoryFilter !== "All" && w.category.toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = w.name.toLowerCase().includes(q);
        const matchDesc = w.description.toLowerCase().includes(q);
        const matchBase = w.base_model.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchBase) return false;
      }
      return true;
    });
  }, [workflows, baseModelFilter, categoryFilter, searchQuery]);

  // Handle preset select
  const handleSelectPreset = (wf: ComfyWorkflow) => {
    setSelectedWorkflow(wf);
    setSearchParams((prev) => {
      prev.set("id", String(wf.id));
      return prev;
    });
  };

  // Handle custom JSON load
  const handleLoadCustomJson = () => {
    setCustomError(null);
    if (!customJsonInput.trim()) {
      setCustomError("Silakan paste teks JSON ComfyUI terlebih dahulu.");
      return;
    }

    try {
      const parsed = JSON.parse(customJsonInput);
      let count = 0;
      if (parsed.nodes && Array.isArray(parsed.nodes)) {
        count = parsed.nodes.length;
      } else if (typeof parsed === "object") {
        count = Object.keys(parsed).length;
      }

      const customWf: ComfyWorkflow = {
        id: Date.now(),
        name: customWorkflowTitle.trim() || "Custom Local Workflow",
        slug: "custom-local-workflow",
        description: "Workflow yang diimpor dari file/clipboard lokal pengguna.",
        base_model: "Custom",
        category: "imported",
        workflow_json: customJsonInput,
        author: "Local Import",
        total_nodes: count
      };

      setWorkflows((prev) => [customWf, ...prev]);
      setSelectedWorkflow(customWf);
      setShowCustomModal(false);
      setCustomJsonInput("");
    } catch (err: unknown) {
      setCustomError("Format JSON tidak valid: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Handle file drop/upload for custom JSON
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        setCustomJsonInput(text);
        setCustomWorkflowTitle(file.name.replace(/\.json$/i, ""));
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="comfy-page-container">
      {/* Page Header */}
      <header className="comfy-page-header">
        <div className="comfy-page-title-row">
          <h1 className="comfy-page-title">
            <span>ComfyUI Workflows</span>
            <span className="comfy-title-badge">Node Presets &amp; Hub</span>
          </h1>
        </div>
        <p className="comfy-page-subtitle">
          Koleksi preset alur ComfyUI siap pakai dengan diagram node visual interaktif.
          Salin workflow langsung ke clipboard (Ctrl + V) atau unduh file JSON untuk di-drag &amp; drop ke ComfyUI Anda.
        </p>
      </header>

      {/* Filter and Search Bar */}
      <div className="comfy-filter-bar">
        {/* Base Model Pills */}
        <div className="comfy-filter-group">
          <span className="comfy-filter-label">Base Model:</span>
          {BASE_MODEL_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`comfy-filter-pill ${baseModelFilter.toLowerCase() === opt.toLowerCase() ? "active" : ""}`}
              onClick={() => setBaseModelFilter(opt)}
            >
              {opt}
            </button>
          ))}
        </div>

        {/* Category Pills */}
        <div className="comfy-filter-group">
          <span className="comfy-filter-label">Kategori:</span>
          {CATEGORY_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`comfy-filter-pill ${categoryFilter.toLowerCase() === opt.toLowerCase() ? "active" : ""}`}
              onClick={() => setCategoryFilter(opt)}
            >
              {opt === "All" ? "Semua" : opt.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="comfy-search-input-box">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="comfy-search-input"
            placeholder="Cari workflow (cth: FaceDetailer, SDXL, LoRA)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="comfy-split-layout">
        {/* Left Sidebar: Presets List */}
        <aside className="comfy-sidebar-card">
          <div className="comfy-sidebar-header">
            <span className="comfy-sidebar-title">Daftar Preset</span>
            <span className="comfy-sidebar-count">{filteredWorkflows.length} Preset</span>
          </div>

          <div className="comfy-presets-list">
            {loading ? (
              <div style={{ padding: "24px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                Memuat preset workflow...
              </div>
            ) : filteredWorkflows.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                Tidak ada workflow yang cocok dengan filter.
              </div>
            ) : (
              filteredWorkflows.map((wf) => {
                const isActive = selectedWorkflow?.id === wf.id;
                const baseClass = wf.base_model.toLowerCase();
                return (
                  <button
                    key={wf.id}
                    type="button"
                    className={`comfy-preset-item-btn ${isActive ? "active" : ""}`}
                    onClick={() => handleSelectPreset(wf)}
                  >
                    <div className="preset-title-row">
                      <span className="preset-title">{wf.name}</span>
                    </div>
                    <div className="preset-badge-row">
                      <span className={`preset-base-badge ${baseClass}`}>{wf.base_model}</span>
                      <span className="preset-base-badge">{wf.category.toUpperCase()}</span>
                      <span className="preset-base-badge">{wf.total_nodes || "?"} Nodes</span>
                    </div>
                    <p className="preset-desc-snippet">{wf.description}</p>
                  </button>
                );
              })
            )}
          </div>

          {/* Import / Custom JSON Button */}
          <div className="comfy-custom-upload-box">
            <button
              type="button"
              className="btn-custom-json"
              onClick={() => setShowCustomModal(true)}
            >
              <span>+ Visualisasikan JSON Kustom</span>
            </button>
          </div>
        </aside>

        {/* Right Stage: Interactive Node Viewer & Info */}
        <main className="comfy-main-stage">
          {selectedWorkflow ? (
            <>
              {/* Interactive Node Graph Viewer */}
              <ComfyNodeViewer
                key={selectedWorkflow.id}
                workflowJson={selectedWorkflow.workflow_json}
                workflowTitle={selectedWorkflow.name}
                baseModel={selectedWorkflow.base_model}
                category={selectedWorkflow.category}
                height={620}
              />

              {/* Specifications & Guide Grid */}
              <div className="comfy-info-cards-grid">
                {/* Description & Overview */}
                <div className="comfy-spec-card">
                  <span className="spec-card-title">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    Ringkasan Alur
                  </span>
                  <p className="spec-card-body">{selectedWorkflow.description}</p>
                  <div style={{ marginTop: "auto", fontSize: "12px", color: "#94a3b8" }}>
                    <span>Author: </span>
                    <strong style={{ color: "#f1f5f9" }}>{selectedWorkflow.author || "Community"}</strong>
                  </div>
                </div>

                {/* Required Model & Custom Nodes */}
                <div className="comfy-spec-card">
                  <span className="spec-card-title">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                    Kebutuhan Ekstensi &amp; Node
                  </span>
                  <div className="custom-nodes-list">
                    {selectedWorkflow.required_custom_nodes ? (
                      selectedWorkflow.required_custom_nodes.split(",").map((nodeName, idx) => {
                        const trimmed = nodeName.trim();
                        return (
                          <div key={idx} className="custom-node-chip">
                            <span>{trimmed}</span>
                            <button
                              type="button"
                              className="copy-mini-btn"
                              onClick={() => navigator.clipboard.writeText(trimmed)}
                              title="Salin nama untuk dicari di ComfyUI Manager"
                            >
                              Salin
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                        Node bawaan (Tidak memerlukan custom node tambahan).
                      </span>
                    )}
                  </div>

                  {selectedWorkflow.model && (
                    <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #282b33" }}>
                      <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                        Model Rekomendasi:
                      </span>
                      <div style={{ marginTop: "4px" }}>
                        <Link
                          to={`/models?model=${selectedWorkflow.model.slug || selectedWorkflow.model.id}`}
                          style={{
                            color: "#38bdf8",
                            fontSize: "13px",
                            fontWeight: 600,
                            textDecoration: "none"
                          }}
                        >
                          {selectedWorkflow.model.name} ➔
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* How to use in ComfyUI Guide */}
              <div className="comfy-steps-guide">
                <span className="spec-card-title">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Cara Pakai di ComfyUI (3 Langkah Cepat)
                </span>
                <div className="steps-list">
                  <div className="step-item">
                    <span className="step-num">Langkah 1</span>
                    <span className="step-title">Salin Workflow</span>
                    <span className="step-desc">
                      Klik tombol <strong>Copy Workflow (Ctrl+V)</strong> di toolbar atas.
                    </span>
                  </div>
                  <div className="step-item">
                    <span className="step-num">Langkah 2</span>
                    <span className="step-title">Paste di ComfyUI</span>
                    <span className="step-desc">
                      Buka jendela ComfyUI di browser Anda, lalu tekan <strong>Ctrl + V</strong> di canvas kosong.
                    </span>
                  </div>
                  <div className="step-item">
                    <span className="step-num">Langkah 3</span>
                    <span className="step-title">Pilih Checkpoint &amp; Render</span>
                    <span className="step-desc">
                      Pilih file model checkpoint lokal di node CheckpointLoader, ketik prompt, dan klik Queue Prompt.
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>
              Pilih salah satu preset workflow di samping untuk menampilkan node graph.
            </div>
          )}
        </main>
      </div>

      {/* Modal: Custom JSON Paste */}
      {showCustomModal && (
        <div className="comfy-modal-backdrop" onClick={() => setShowCustomModal(false)}>
          <div className="comfy-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="comfy-modal-header">
              <span>Visualisasikan File JSON ComfyUI Kustom</span>
              <button
                type="button"
                className="inspector-close-btn"
                onClick={() => setShowCustomModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="comfy-modal-body">
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                  Judul Workflow:
                </label>
                <input
                  type="text"
                  className="comfy-search-input"
                  style={{
                    backgroundColor: "#121418",
                    border: "1px solid #2e333d",
                    borderRadius: "6px",
                    padding: "8px 12px",
                    width: "100%",
                    fontSize: "13px"
                  }}
                  value={customWorkflowTitle}
                  onChange={(e) => setCustomWorkflowTitle(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                  Unggah file .json dari disk:
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  style={{ fontSize: "12px", color: "#94a3b8" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                  Atau Paste Raw JSON ComfyUI di sini:
                </label>
                <textarea
                  className="comfy-json-textarea"
                  placeholder='Paste data JSON ComfyUI (contoh: {"nodes": [...], "links": [...]})'
                  value={customJsonInput}
                  onChange={(e) => setCustomJsonInput(e.target.value)}
                />
              </div>

              {customError && (
                <div style={{ color: "#ef4444", fontSize: "12px", fontWeight: 600 }}>
                  {customError}
                </div>
              )}
            </div>

            <div className="comfy-modal-actions">
              <button
                type="button"
                className="comfy-tool-btn"
                onClick={() => setShowCustomModal(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="comfy-tool-btn primary"
                onClick={handleLoadCustomJson}
              >
                Muat &amp; Visualisasikan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
