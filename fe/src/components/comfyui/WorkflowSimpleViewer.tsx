import React, { useState, useMemo } from "react";
import { extractWorkflowData } from "./workflowExtractor";
import type { ComfyWorkflow } from "../../api/workflows";
import "./workflow-simple-viewer.css";

interface WorkflowSimpleViewerProps {
  workflow: ComfyWorkflow;
  categoryName?: string;
  onOpenModelDetail?: (modelId: number) => void;
  onEdit?: (workflow: ComfyWorkflow) => void;
  onDelete?: (workflow: ComfyWorkflow) => void;
}

export const WorkflowSimpleViewer: React.FC<WorkflowSimpleViewerProps> = ({
  workflow,
  categoryName,
  onOpenModelDetail,
  onEdit,
  onDelete
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showRawJsonModal, setShowRawJsonModal] = useState<boolean>(false);

  // Extract human-readable generation parameters from the JSON
  const extracted = useMemo(() => {
    return extractWorkflowData(workflow.workflow_json);
  }, [workflow.workflow_json]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Copy workflow JSON directly to clipboard for Ctrl+V in ComfyUI
  const handleCopyWorkflow = () => {
    try {
      navigator.clipboard.writeText(workflow.workflow_json);
      showToast("Workflow disalin! Tekan Ctrl + V di canvas ComfyUI Anda.");
    } catch {
      showToast("Gagal menyalin workflow ke clipboard.");
    }
  };

  // Download .json file
  const handleDownloadJson = () => {
    try {
      const blob = new Blob([workflow.workflow_json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${workflow.slug || "workflow"}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("File workflow.json berhasil diunduh.");
    } catch {
      showToast("Gagal mengunduh file JSON.");
    }
  };

  // Copy specific prompt text
  const handleCopyPrompt = (text: string, label: string) => {
    try {
      navigator.clipboard.writeText(text);
      showToast(`${label} disalin ke clipboard!`);
    } catch {
      showToast("Gagal menyalin teks.");
    }
  };

  const formattedJson = useMemo(() => {
    try {
      const parsed = typeof workflow.workflow_json === "string"
        ? JSON.parse(workflow.workflow_json)
        : workflow.workflow_json;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return workflow.workflow_json;
    }
  }, [workflow.workflow_json]);

  return (
    <div className="wf-simple-container">
      {/* 1. Header Banner & Actions */}
      <div className="wf-header-card">
        <div className="wf-header-top">
          <div className="wf-title-group">
            <h2 className="wf-main-title">{workflow.name}</h2>
            <div className="wf-meta-badges">
              <span className="wf-badge primary">{workflow.base_model}</span>
              <span className="wf-badge neutral">{categoryName || workflow.category.toUpperCase()}</span>
              <span className="wf-badge neutral">{extracted.totalNodes || workflow.total_nodes || 0} Komponen (Nodes)</span>
              {workflow.author && (
                <span className="wf-badge subtle">Pembuat: {workflow.author}</span>
              )}
            </div>
          </div>

          <div className="wf-action-buttons">
            <button
              type="button"
              className="wf-btn primary"
              onClick={handleCopyWorkflow}
              title="Salin JSON untuk langsung ditempel (Ctrl+V) di ComfyUI"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Salin Workflow (Ctrl+V)
            </button>

            <button
              type="button"
              className="wf-btn secondary"
              onClick={handleDownloadJson}
              title="Download file .json workflow"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Unduh .json
            </button>

            {onEdit && (
              <button
                type="button"
                className="wf-btn secondary wf-btn-edit"
                onClick={() => onEdit(workflow)}
                title="Edit preset workflow ini di database"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit Preset
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                className="wf-btn danger"
                onClick={() => onDelete(workflow)}
                title="Hapus preset workflow ini dari database"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Hapus
              </button>
            )}

            <button
              type="button"
              className="wf-btn secondary"
              onClick={() => setShowRawJsonModal(true)}
              title="Lihat isi raw JSON"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              Raw JSON
            </button>
          </div>
        </div>

        {workflow.description && (
          <p className="wf-description-text">{workflow.description}</p>
        )}

        {/* Linked Model Callout */}
        {workflow.model && (
          <div className="wf-linked-model-bar">
            <span className="linked-label">Model Terkait:</span>
            <span className="linked-model-name">{workflow.model.name}</span>
            <span className="linked-model-type">[{workflow.model.type}]</span>
            {onOpenModelDetail && (
              <button
                type="button"
                className="linked-model-link"
                onClick={() => onOpenModelDetail(workflow.model!.id)}
              >
                Lihat Detail Model →
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. Structured Pipeline Overview Cards */}
      <div className="wf-pipeline-grid">
        {/* Card A: Model & Checkpoint */}
        <div className="wf-section-card">
          <div className="wf-card-header">
            <div className="wf-card-header-left">
              <span className="wf-card-num">1</span>
              <h3 className="wf-card-title">Checkpoint &amp; LoRA Model</h3>
            </div>
          </div>
          <div className="wf-card-body">
            <div className="wf-param-row">
              <span className="param-label">Checkpoint:</span>
              <span className="param-val highlight">
                {extracted.checkpointName || "CheckpointLoader default"}
              </span>
            </div>

            {extracted.loras.length > 0 ? (
              <div style={{ marginTop: "10px" }}>
                <span className="param-label" style={{ display: "block", marginBottom: "6px" }}>
                  LoRA yang Digunakan ({extracted.loras.length}):
                </span>
                <div className="wf-lora-list">
                  {extracted.loras.map((lora, idx) => (
                    <div key={idx} className="wf-lora-item">
                      <span className="lora-name">{lora.name}</span>
                      <span className="lora-weight">Weight: {lora.strength ?? 1.0}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="wf-param-row">
                <span className="param-label">LoRA:</span>
                <span className="param-val muted">Tanpa LoRA Tambahan</span>
              </div>
            )}

            {extracted.clipSkip !== undefined && (
              <div className="wf-param-row" style={{ marginTop: "8px" }}>
                <span className="param-label">CLIP Skip / Last Layer:</span>
                <span className="param-val">{extracted.clipSkip}</span>
              </div>
            )}
          </div>
        </div>

        {/* Card B: Sampling & Latent */}
        <div className="wf-section-card">
          <div className="wf-card-header">
            <div className="wf-card-header-left">
              <span className="wf-card-num">2</span>
              <h3 className="wf-card-title">Pengaturan Sampling &amp; Latent</h3>
            </div>
          </div>
          <div className="wf-card-body">
            <div className="wf-params-table">
              <div className="wf-table-cell">
                <span className="param-label">Resolusi Latent</span>
                <span className="param-val bold">
                  {extracted.latentSize
                    ? `${extracted.latentSize.width} × ${extracted.latentSize.height} px`
                    : "1024 × 1024 px"}
                </span>
              </div>
              <div className="wf-table-cell">
                <span className="param-label">Sampler</span>
                <span className="param-val bold">
                  {extracted.sampler?.samplerName || "euler_ancestral"}
                </span>
              </div>
              <div className="wf-table-cell">
                <span className="param-label">Scheduler</span>
                <span className="param-val bold">
                  {extracted.sampler?.scheduler || "karras"}
                </span>
              </div>
              <div className="wf-table-cell">
                <span className="param-label">Steps</span>
                <span className="param-val bold">
                  {extracted.sampler?.steps ?? 20}
                </span>
              </div>
              <div className="wf-table-cell">
                <span className="param-label">CFG Scale</span>
                <span className="param-val bold">
                  {extracted.sampler?.cfg ?? 6.0}
                </span>
              </div>
              <div className="wf-table-cell">
                <span className="param-label">Denoise</span>
                <span className="param-val bold">
                  {extracted.sampler?.denoise ?? 1.0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card C: Prompts */}
        <div className="wf-section-card full-width">
          <div className="wf-card-header">
            <div className="wf-card-header-left">
              <span className="wf-card-num">3</span>
              <h3 className="wf-card-title">Contoh Prompt Bawaan Workflow</h3>
            </div>
          </div>
          <div className="wf-card-body" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Positive Prompt */}
            <div>
              <div className="wf-prompt-header">
                <span className="prompt-type-tag positive">Positive Prompt</span>
                {extracted.positivePrompt && (
                  <button
                    type="button"
                    className="wf-copy-small-btn"
                    onClick={() => handleCopyPrompt(extracted.positivePrompt!, "Positive Prompt")}
                  >
                    Salin Prompt
                  </button>
                )}
              </div>
              <div className="wf-prompt-box">
                {extracted.positivePrompt || (
                  <span className="muted-text">Prompt standar / input manual pengguna di ComfyUI.</span>
                )}
              </div>
            </div>

            {/* Negative Prompt */}
            <div>
              <div className="wf-prompt-header">
                <span className="prompt-type-tag negative">Negative Prompt</span>
                {extracted.negativePrompt && (
                  <button
                    type="button"
                    className="wf-copy-small-btn"
                    onClick={() => handleCopyPrompt(extracted.negativePrompt!, "Negative Prompt")}
                  >
                    Salin Negative Prompt
                  </button>
                )}
              </div>
              <div className="wf-prompt-box negative">
                {extracted.negativePrompt || (
                  <span className="muted-text">low quality, worst quality, deformed, blurry</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Card D: Requirements & How-To */}
        <div className="wf-section-card full-width">
          <div className="wf-card-header">
            <div className="wf-card-header-left">
              <span className="wf-card-num">4</span>
              <h3 className="wf-card-title">Dependensi &amp; Cara Menggunakan</h3>
            </div>
          </div>
          <div className="wf-card-body wf-guide-body">
            <div className="wf-deps-column">
              <span className="param-label bold" style={{ marginBottom: "8px", display: "block" }}>
                Custom Nodes yang Dibutuhkan:
              </span>
              {workflow.required_custom_nodes && workflow.required_custom_nodes.toLowerCase() !== "built-in" ? (
                <div className="wf-deps-tags">
                  {workflow.required_custom_nodes.split(",").map((nodeItem, i) => (
                    <span key={i} className="wf-dep-badge">
                      📦 {nodeItem.trim()}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="param-val" style={{ color: "#22c55e", fontWeight: 600 }}>
                  ✓ Bawaan ComfyUI (Tidak memerlukan custom node tambahan)
                </span>
              )}

              {extracted.tools.length > 0 && (
                <div style={{ marginTop: "12px" }}>
                  <span className="param-label bold" style={{ marginBottom: "6px", display: "block" }}>
                    Fitur / Modul Tambahan:
                  </span>
                  <ul className="wf-feature-list">
                    {extracted.tools.map((t, idx) => (
                      <li key={idx}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="wf-steps-column">
              <span className="param-label bold" style={{ marginBottom: "8px", display: "block" }}>
                3 Langkah Cepat Pakai:
              </span>
              <ol className="wf-steps-list">
                <li>
                  Klik tombol <strong>"Salin Workflow (Ctrl+V)"</strong> di bagian atas.
                </li>
                <li>
                  Buka ComfyUI di browser Anda (biasanya di <code>http://127.0.0.1:8188</code>).
                </li>
                <li>
                  Tekan <strong>Ctrl + V</strong> di canvas ComfyUI. Seluruh susunan node akan langsung terpasang otomatis.
                </li>
              </ol>
            </div>
          </div>
        </div>

        {/* Card E: Markdown Notes from Workflow (if any) */}
        {extracted.notes.length > 0 && (
          <div className="wf-section-card full-width">
            <div className="wf-card-header">
              <div className="wf-card-header-left">
                <span className="wf-card-num">📝</span>
                <h3 className="wf-card-title">Catatan Panduan Bawaan Workflow</h3>
              </div>
            </div>
            <div className="wf-card-body">
              <div className="wf-notes-container">
                {extracted.notes.map((note, nIdx) => (
                  <div key={nIdx} className="wf-note-entry">
                    {note}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Raw JSON Modal */}
      {showRawJsonModal && (
        <div className="wf-modal-backdrop" onClick={() => setShowRawJsonModal(false)}>
          <div className="wf-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="wf-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "16px" }}>{`{ }`}</span>
                <h3 style={{ margin: 0, fontSize: "15px", color: "#f8fafc" }}>
                  Raw JSON Workflow: {workflow.name}
                </h3>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  className="wf-btn primary"
                  onClick={handleCopyWorkflow}
                  style={{ fontSize: "12px", padding: "6px 12px" }}
                >
                  Salin Seluruh JSON
                </button>
                <button
                  type="button"
                  className="wf-modal-close-btn"
                  onClick={() => setShowRawJsonModal(false)}
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="wf-modal-body">
              <pre className="wf-code-view">{formattedJson}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="wf-toast-alert">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {toastMessage}
        </div>
      )}
    </div>
  );
};
