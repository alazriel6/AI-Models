import React, { useState, useMemo, useEffect, useRef } from "react";
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
  const [copiedWorkflow, setCopiedWorkflow] = useState<boolean>(false);
  const [copiedPositive, setCopiedPositive] = useState<boolean>(false);
  const [copiedNegative, setCopiedNegative] = useState<boolean>(false);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const [showOverflow, setShowOverflow] = useState<boolean>(false);
  const [showRawJsonModal, setShowRawJsonModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const overflowRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Extract human-readable generation parameters from the JSON
  const extracted = useMemo(() => {
    return extractWorkflowData(workflow.workflow_json);
  }, [workflow.workflow_json]);

  // Close overflow menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setShowOverflow(false);
      }
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setShowTooltip(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Copy workflow JSON directly to clipboard with 2-second state feedback
  const handleCopyWorkflow = async () => {
    try {
      await navigator.clipboard.writeText(workflow.workflow_json);
      setCopiedWorkflow(true);
      showToast("Workflow tersalin! Tekan Ctrl+V di canvas ComfyUI.");
      setTimeout(() => {
        setCopiedWorkflow(false);
      }, 2000);
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
      showToast("File workflow .json berhasil diunduh.");
    } catch {
      showToast("Gagal mengunduh file JSON.");
    }
  };

  // Copy prompt helper
  const handleCopyPrompt = async (text: string, isPositive: boolean) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isPositive) {
        setCopiedPositive(true);
        setTimeout(() => setCopiedPositive(false), 1500);
      } else {
        setCopiedNegative(true);
        setTimeout(() => setCopiedNegative(false), 1500);
      }
      showToast(`${isPositive ? "Positive" : "Negative"} prompt disalin!`);
    } catch {
      showToast("Gagal menyalin prompt.");
    }
  };

  // Deduplicated dependencies list
  const combinedDependencies = useMemo(() => {
    const set = new Set<string>();

    if (workflow.required_custom_nodes && workflow.required_custom_nodes.toLowerCase() !== "built-in") {
      workflow.required_custom_nodes.split(",").forEach((item) => {
        const trimmed = item.trim();
        if (trimmed) set.add(trimmed);
      });
    }

    if (extracted.tools && extracted.tools.length > 0) {
      extracted.tools.forEach((tool) => {
        const trimmed = tool.trim();
        if (trimmed) set.add(trimmed);
      });
    }

    return Array.from(set);
  }, [workflow.required_custom_nodes, extracted.tools]);

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

  const totalNodesCount = extracted.totalNodes || workflow.total_nodes || 0;
  const resolutionText = extracted.latentSize
    ? `${extracted.latentSize.width} × ${extracted.latentSize.height} px`
    : "1024 × 1024 px";

  return (
    <div className="wf-detail-root">
      {/* =========================================================================
          A. HEADER DETAIL
          ========================================================================= */}
      <header className="wf-detail-header">
        <div className="wf-detail-header-left">
          <h2 className="wf-detail-title">{workflow.name}</h2>
          <div className="wf-detail-meta-row">
            <span className="wf-meta-pill accent">{workflow.base_model}</span>
            <span className="wf-meta-pill">{categoryName || workflow.category.toUpperCase()}</span>
            <span className="wf-meta-pill mono">{totalNodesCount} Nodes</span>
            {workflow.author && (
              <span className="wf-meta-text">
                Pembuat: <strong className="text-zinc-200">{workflow.author}</strong>
              </span>
            )}
            {workflow.model && onOpenModelDetail && (
              <button
                type="button"
                className="wf-meta-link-btn"
                onClick={() => onOpenModelDetail(workflow.model!.id)}
                title="Buka detail model referensi"
              >
                Model: {workflow.model.name} →
              </button>
            )}
          </div>
          {workflow.description && (
            <p className="wf-detail-desc">{workflow.description}</p>
          )}
        </div>

        {/* Action Bar */}
        <div className="wf-detail-actions">
          {/* Main Copy Action with 3-step Instructions Tooltip */}
          <div className="wf-copy-group" ref={tooltipRef}>
            <button
              type="button"
              className={`wf-btn-primary ${copiedWorkflow ? "copied" : ""}`}
              onClick={handleCopyWorkflow}
              title="Salin JSON untuk langsung ditempel (Ctrl+V) di ComfyUI"
            >
              {copiedWorkflow ? (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Tersalin! Tekan Ctrl+V di ComfyUI</span>
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span>Salin ke Clipboard</span>
                </>
              )}
            </button>

            {/* Micro Info Trigger */}
            <button
              type="button"
              className="wf-btn-info-trigger"
              onClick={() => setShowTooltip(!showTooltip)}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              aria-label="Panduan cepat penggunaan"
              title="3 Langkah Cepat Pakai"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </button>

            {/* Floating Tooltip */}
            {showTooltip && (
              <div
                className="wf-info-tooltip"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <div className="wf-tooltip-header">
                  <span className="wf-tooltip-dot" />
                  <span className="wf-tooltip-title">3 Langkah Cepat Pakai</span>
                </div>
                <ol className="wf-tooltip-steps">
                  <li>
                    Klik <strong>"Salin ke Clipboard"</strong> di atas.
                  </li>
                  <li>
                    Buka ComfyUI di browser (default: <code>http://127.0.0.1:8188</code>).
                  </li>
                  <li>
                    Tekan <strong>Ctrl + V</strong> pada canvas ComfyUI untuk memuat workflow secara otomatis.
                  </li>
                </ol>
              </div>
            )}
          </div>

          {/* Secondary Action: Download .json */}
          <button
            type="button"
            className="wf-btn-secondary"
            onClick={handleDownloadJson}
            title="Download file .json workflow"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Unduh .json</span>
          </button>

          {/* Secondary Action: Raw JSON */}
          <button
            type="button"
            className="wf-btn-secondary"
            onClick={() => setShowRawJsonModal(true)}
            title="Lihat teks mentah JSON"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            <span>Raw JSON</span>
          </button>

          {/* Overflow Menu (Edit & Delete) */}
          {(onEdit || onDelete) && (
            <div className="wf-overflow-wrapper" ref={overflowRef}>
              <button
                type="button"
                className="wf-btn-icon"
                onClick={() => setShowOverflow(!showOverflow)}
                title="Pilihan tindakan lainnya"
                aria-label="Pilihan tindakan lainnya"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="19" cy="12" r="1.5" />
                  <circle cx="5" cy="12" r="1.5" />
                </svg>
              </button>

              {showOverflow && (
                <div className="wf-overflow-dropdown">
                  {onEdit && (
                    <button
                      type="button"
                      className="wf-overflow-item"
                      onClick={() => {
                        setShowOverflow(false);
                        onEdit(workflow);
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      <span>Edit Preset</span>
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      className="wf-overflow-item danger"
                      onClick={() => {
                        setShowOverflow(false);
                        onDelete(workflow);
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      <span>Hapus Workflow</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* =========================================================================
          B. SEKSI ATAS: PREVIEW VISUAL + SPESIFIKASI TEKNIS (GRID 2 KOLOM)
          ========================================================================= */}
      <section className="wf-overview-grid">
        {/* Kolom Kiri: Visual Output Preview / Thumbnail */}
        <div className="wf-preview-pane">
          <div className="wf-preview-box">
            {workflow.thumbnail_url ? (
              <div className="wf-preview-img-wrap">
                <img
                  src={workflow.thumbnail_url}
                  alt={`Pratinjau hasil ${workflow.name}`}
                  className="wf-preview-img"
                  loading="lazy"
                />
                <div className="wf-preview-badge">Contoh Output Generasi</div>
              </div>
            ) : (
              <div className="wf-preview-placeholder">
                <div className="wf-placeholder-grid-pattern" />
                <div className="wf-placeholder-content">
                  <div className="wf-placeholder-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                  <span className="wf-placeholder-title">Pratinjau Hasil Belum Tersedia</span>
                  <span className="wf-placeholder-sub">
                    {workflow.base_model} &bull; {resolutionText}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Kolom Kanan: Spesifikasi Model & Sampling (Tabel Deskripsi Bersih) */}
        <div className="wf-specs-pane">
          <div className="wf-specs-header">
            <span className="wf-specs-title">Spesifikasi Model &amp; Parameter</span>
            <span className="wf-specs-sub">{workflow.base_model} Pipeline</span>
          </div>

          <div className="wf-specs-table">
            {/* Checkpoint */}
            <div className="wf-spec-row">
              <span className="wf-spec-label">Checkpoint</span>
              <span className="wf-spec-val font-mono highlight">
                {extracted.checkpointName || "Bawaan CheckpointLoader"}
              </span>
            </div>

            {/* LoRA */}
            <div className="wf-spec-row">
              <span className="wf-spec-label">LoRA</span>
              <div className="wf-spec-val">
                {extracted.loras && extracted.loras.length > 0 ? (
                  <div className="wf-lora-pills-wrap">
                    {extracted.loras.map((lora, idx) => (
                      <span key={idx} className="wf-lora-pill">
                        <span className="wf-lora-name">{lora.name}</span>
                        <span className="wf-lora-weight">w: {lora.strength ?? 1.0}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="wf-muted-text">Tanpa LoRA Tambahan</span>
                )}
              </div>
            </div>

            {/* Resolusi */}
            <div className="wf-spec-row">
              <span className="wf-spec-label">Resolusi</span>
              <span className="wf-spec-val font-mono">{resolutionText}</span>
            </div>

            {/* Sampler */}
            <div className="wf-spec-row">
              <span className="wf-spec-label">Sampler</span>
              <span className="wf-spec-val font-mono">
                {extracted.sampler?.samplerName || "euler_ancestral"}
              </span>
            </div>

            {/* Scheduler */}
            <div className="wf-spec-row">
              <span className="wf-spec-label">Scheduler</span>
              <span className="wf-spec-val font-mono">
                {extracted.sampler?.scheduler || "sgm_uniform"}
              </span>
            </div>

            {/* Sampling Stats (Steps, CFG, Denoise) */}
            <div className="wf-spec-row">
              <span className="wf-spec-label">Sampling</span>
              <div className="wf-spec-val font-mono wf-sampling-compact">
                <span className="wf-stat-chip">
                  <span className="chip-key">Steps:</span> {extracted.sampler?.steps ?? 30}
                </span>
                <span className="wf-stat-chip">
                  <span className="chip-key">CFG:</span> {extracted.sampler?.cfg ?? 4.0}
                </span>
                <span className="wf-stat-chip">
                  <span className="chip-key">Denoise:</span> {extracted.sampler?.denoise ?? 1.0}
                </span>
              </div>
            </div>

            {/* CLIP Skip */}
            {extracted.clipSkip !== undefined && (
              <div className="wf-spec-row">
                <span className="wf-spec-label">CLIP Skip</span>
                <span className="wf-spec-val font-mono">{extracted.clipSkip}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================================
          C. SEKSI TENGAH: PROMPT BAWAAN (CODE-EDITOR STYLE)
          ========================================================================= */}
      <section className="wf-prompts-section">
        <div className="wf-prompts-grid">
          {/* Positive Prompt Box */}
          <div className="wf-code-box">
            <div className="wf-code-header">
              <div className="wf-code-title">
                <span className="wf-dot-indicator positive" />
                <span>POSITIVE PROMPT</span>
              </div>
              {extracted.positivePrompt && (
                <button
                  type="button"
                  className="wf-micro-copy-btn"
                  onClick={() => handleCopyPrompt(extracted.positivePrompt!, true)}
                  title="Salin positive prompt"
                >
                  {copiedPositive ? (
                    <>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      <span>Salin</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="wf-code-content">
              {extracted.positivePrompt ? (
                <pre>{extracted.positivePrompt}</pre>
              ) : (
                <span className="wf-muted-placeholder">Prompt standar / input manual pengguna di ComfyUI.</span>
              )}
            </div>
          </div>

          {/* Negative Prompt Box */}
          <div className="wf-code-box">
            <div className="wf-code-header">
              <div className="wf-code-title">
                <span className="wf-dot-indicator negative" />
                <span>NEGATIVE PROMPT</span>
              </div>
              {extracted.negativePrompt && (
                <button
                  type="button"
                  className="wf-micro-copy-btn"
                  onClick={() => handleCopyPrompt(extracted.negativePrompt!, false)}
                  title="Salin negative prompt"
                >
                  {copiedNegative ? (
                    <>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      <span>Salin</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="wf-code-content">
              {extracted.negativePrompt ? (
                <pre>{extracted.negativePrompt}</pre>
              ) : (
                <span className="wf-muted-placeholder">low quality, worst quality, deformed, blurry</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          D. SEKSI BAWAH: DEPENDENSI & CUSTOM NODES (COMPACT FOOTER BAR)
          ========================================================================= */}
      <footer className="wf-footer-bar">
        <div className="wf-deps-inline">
          <span className="wf-deps-label">Custom Nodes &amp; Modul:</span>
          {combinedDependencies.length > 0 ? (
            <div className="wf-deps-tags-row">
              {combinedDependencies.map((dep, idx) => (
                <span key={idx} className="wf-dep-badge">
                  📦 {dep}
                </span>
              ))}
            </div>
          ) : (
            <span className="wf-builtin-tag">
              ✓ Bawaan ComfyUI (Tidak memerlukan custom node tambahan)
            </span>
          )}
        </div>
      </footer>

      {/* Optional: Workflow Notes */}
      {extracted.notes && extracted.notes.length > 0 && (
        <div className="wf-notes-panel">
          <div className="wf-notes-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <span>Catatan Panduan Bawaan Workflow</span>
          </div>
          <div className="wf-notes-body">
            {extracted.notes.map((note, idx) => (
              <div key={idx} className="wf-note-item">
                {note}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          RAW JSON MODAL
          ========================================================================= */}
      {showRawJsonModal && (
        <div className="wf-modal-overlay" onClick={() => setShowRawJsonModal(false)}>
          <div className="wf-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="wf-modal-header">
              <div className="wf-modal-header-info">
                <span className="wf-modal-json-tag">{`{ }`}</span>
                <span className="wf-modal-title">Raw JSON Workflow: {workflow.name}</span>
              </div>
              <div className="wf-modal-header-actions">
                <button
                  type="button"
                  className="wf-btn-primary"
                  onClick={handleCopyWorkflow}
                  style={{ fontSize: "12px", padding: "6px 12px" }}
                >
                  Salin Seluruh JSON
                </button>
                <button
                  type="button"
                  className="wf-modal-close"
                  onClick={() => setShowRawJsonModal(false)}
                  aria-label="Tutup modal"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="wf-modal-body">
              <pre className="wf-modal-pre">{formattedJson}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Toast Alert */}
      {toastMessage && (
        <div className="wf-toast-alert" role="status">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
