import React, { useState, useEffect } from "react";
import {
  getWorkflowsApi,
  createWorkflowApi,
  updateWorkflowApi,
  deleteWorkflowApi,
  type ComfyWorkflow,
  type CreateWorkflowPayload
} from "../../api/workflows";
import type { Model } from "../../api/models";

interface WorkflowManagerProps {
  models: Model[];
  onToast: (type: "success" | "error" | "info", msg: string) => void;
}

export const WorkflowManager: React.FC<WorkflowManagerProps> = ({ models, onToast }) => {
  const [workflows, setWorkflows] = useState<ComfyWorkflow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CreateWorkflowPayload>({
    name: "",
    base_model: "SDXL",
    category: "txt2img",
    description: "",
    author: "Admin",
    required_custom_nodes: "",
    workflow_json: "",
    model_id: undefined
  });
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Delete modal state
  const [workflowToDelete, setWorkflowToDelete] = useState<ComfyWorkflow | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const data = await getWorkflowsApi();
      setWorkflows(data);
    } catch {
      onToast("error", "Gagal memuat daftar workflow dari backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setJsonError(null);
    setFormData({
      name: "",
      base_model: "SDXL",
      category: "txt2img",
      description: "",
      author: "Admin",
      required_custom_nodes: "",
      workflow_json: "",
      model_id: undefined
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (wf: ComfyWorkflow) => {
    setEditingId(wf.id);
    setJsonError(null);
    setFormData({
      name: wf.name,
      base_model: wf.base_model,
      category: wf.category,
      description: wf.description || "",
      author: wf.author || "Admin",
      required_custom_nodes: wf.required_custom_nodes || "",
      workflow_json: typeof wf.workflow_json === "string" ? wf.workflow_json : JSON.stringify(wf.workflow_json, null, 2),
      model_id: wf.model_id
    });
    setIsModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        setFormData((prev) => ({
          ...prev,
          workflow_json: text,
          name: prev.name || file.name.replace(/\.json$/i, "")
        }));
      }
    };
    reader.readAsText(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setJsonError(null);

    if (!formData.name.trim()) {
      onToast("error", "Nama workflow wajib diisi.");
      return;
    }

    if (!formData.workflow_json.trim()) {
      setJsonError("Data workflow JSON ComfyUI wajib diisi.");
      return;
    }

    try {
      JSON.parse(formData.workflow_json);
    } catch {
      setJsonError("Format JSON tidak valid. Pastikan format teks JSON sesuai struktur ComfyUI.");
      return;
    }

    try {
      if (editingId) {
        await updateWorkflowApi(editingId, formData);
        onToast("success", `Workflow "${formData.name}" berhasil diperbarui.`);
      } else {
        await createWorkflowApi(formData);
        onToast("success", `Workflow "${formData.name}" berhasil dibuat.`);
      }
      setIsModalOpen(false);
      fetchWorkflows();
    } catch {
      onToast("error", "Gagal menyimpan workflow ke database.");
    }
  };

  const handleDelete = async () => {
    if (!workflowToDelete) return;
    try {
      setIsDeleting(true);
      await deleteWorkflowApi(workflowToDelete.id);
      onToast("success", `Workflow "${workflowToDelete.name}" berhasil dihapus.`);
      setWorkflowToDelete(null);
      fetchWorkflows();
    } catch {
      onToast("error", "Gagal menghapus workflow.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = workflows.filter((w) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      w.name.toLowerCase().includes(q) ||
      w.base_model.toLowerCase().includes(q) ||
      w.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="admin-models-section" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Top Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <input
            type="text"
            className="admin-search-input"
            placeholder="Cari workflow..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ minWidth: "260px" }}
          />
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>{filtered.length} Workflows</span>
        </div>

        <button type="button" className="btn-primary-admin" onClick={handleOpenCreate}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Tambah Workflow ComfyUI
        </button>
      </div>

      {/* Workflows Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: "32%" }}>Nama Workflow</th>
              <th style={{ width: "14%" }}>Base Model</th>
              <th style={{ width: "14%" }}>Kategori</th>
              <th style={{ width: "20%" }}>Model Terkait</th>
              <th style={{ width: "10%" }}>Nodes</th>
              <th style={{ width: "10%", textAlign: "right" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "#94a3b8" }}>
                  Memuat data workflow...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "#94a3b8" }}>
                  Belum ada workflow ComfyUI. Klik tombol "Tambah Workflow ComfyUI" di atas.
                </td>
              </tr>
            ) : (
              filtered.map((wf) => {
                const linkedModel = models.find((m) => m.id === wf.model_id);
                return (
                  <tr key={wf.id}>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ fontWeight: 600, color: "#f8fafc" }}>{wf.name}</span>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>{wf.slug}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge-base-model">{wf.base_model}</span>
                    </td>
                    <td>
                      <span className="badge-type-pill">{wf.category.toUpperCase()}</span>
                    </td>
                    <td>
                      {linkedModel ? (
                        <span style={{ color: "#38bdf8", fontSize: "12px", fontWeight: 600 }}>
                          {linkedModel.name}
                        </span>
                      ) : (
                        <span style={{ color: "#64748b", fontSize: "12px" }}>- Universal -</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: "12px", color: "#94a3b8" }}>{wf.total_nodes || "?"} Nodes</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                        <button
                          type="button"
                          className="table-action-btn edit-btn"
                          title="Edit Workflow"
                          onClick={() => handleOpenEdit(wf)}
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="table-action-btn delete-btn"
                          title="Hapus Workflow"
                          onClick={() => setWorkflowToDelete(wf)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Form Modal (Create / Edit) */}
      {isModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div
            className="admin-modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "720px", maxHeight: "90vh", overflowY: "auto" }}
          >
            <div className="admin-modal-header">
              <h3>{editingId ? "Edit Workflow ComfyUI" : "Tambah Workflow ComfyUI Baru"}</h3>
              <button type="button" className="admin-modal-close-btn" onClick={() => setIsModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="admin-modal-body" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="admin-form-group">
                <label className="admin-form-label">Nama Workflow *</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="Contoh: SDXL Standard Txt2Img Baseline"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="admin-form-group">
                  <label className="admin-form-label">Base Model Target</label>
                  <select
                    className="admin-form-input"
                    value={formData.base_model}
                    onChange={(e) => setFormData({ ...formData, base_model: e.target.value })}
                  >
                    <option value="SDXL">SDXL</option>
                    <option value="Illustrious">Illustrious</option>
                    <option value="Pony">Pony</option>
                    <option value="Flux">Flux</option>
                    <option value="SD 1.5">SD 1.5</option>
                    <option value="All">All / Universal</option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Kategori</label>
                  <select
                    className="admin-form-input"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="txt2img">Txt2Img</option>
                    <option value="img2img">Img2Img</option>
                    <option value="upscale">Upscale / Hi-Res</option>
                    <option value="detailer">Detailer / Inpainting</option>
                    <option value="lora_stack">LoRA Stacking</option>
                  </select>
                </div>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Tautkan ke Model Spesifik (Opsional, 1 model bisa 2-3 workflow)</label>
                <select
                  className="admin-form-input"
                  value={formData.model_id || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      model_id: e.target.value ? Number(e.target.value) : undefined
                    })
                  }
                >
                  <option value="">-- Tidak Ditautkan (Workflow Universal) --</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.base_model})
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Deskripsi & Catatan Penggunaan</label>
                <textarea
                  className="admin-form-input"
                  rows={2}
                  placeholder="Keterangan alur workflow, sampler, dan kegunaannya..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Required Custom Nodes (Pisahkan dengan koma)</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="Contoh: ComfyUI-Impact-Pack, ComfyUI_UltimateSDUpscale"
                  value={formData.required_custom_nodes}
                  onChange={(e) => setFormData({ ...formData, required_custom_nodes: e.target.value })}
                />
              </div>

              <div className="admin-form-group">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <label className="admin-form-label" style={{ margin: 0 }}>
                    Workflow JSON (LiteGraph ComfyUI) *
                  </label>
                  <input
                    type="file"
                    accept=".json"
                    id="workflow-file-input"
                    style={{ display: "none" }}
                    onChange={handleFileUpload}
                  />
                  <label
                    htmlFor="workflow-file-input"
                    className="btn-secondary-admin"
                    style={{ fontSize: "11px", padding: "3px 8px", cursor: "pointer" }}
                  >
                    📂 Upload .json file
                  </label>
                </div>
                <textarea
                  className="admin-form-input"
                  rows={8}
                  style={{ fontFamily: "ui-monospace, monospace", fontSize: "11px" }}
                  placeholder='Paste JSON export dari ComfyUI di sini (format {"nodes": [...], "links": [...]})'
                  value={formData.workflow_json}
                  onChange={(e) => setFormData({ ...formData, workflow_json: e.target.value })}
                  required
                />
                {jsonError && (
                  <span style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block" }}>
                    {jsonError}
                  </span>
                )}
              </div>

              <div className="admin-modal-footer" style={{ padding: 0, marginTop: "8px" }}>
                <button type="button" className="btn-secondary-admin" onClick={() => setIsModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn-primary-admin">
                  {editingId ? "Simpan Perubahan" : "Buat Workflow"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {workflowToDelete && (
        <div className="admin-modal-backdrop" onClick={() => setWorkflowToDelete(null)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px" }}>
            <div className="admin-modal-header">
              <h3 style={{ color: "#ef4444" }}>Konfirmasi Hapus Workflow</h3>
              <button type="button" className="admin-modal-close-btn" onClick={() => setWorkflowToDelete(null)}>
                ✕
              </button>
            </div>
            <div className="admin-modal-body">
              <p style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: 1.5 }}>
                Apakah Anda yakin ingin menghapus workflow <strong>{workflowToDelete.name}</strong>? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="admin-modal-footer">
              <button type="button" className="btn-secondary-admin" onClick={() => setWorkflowToDelete(null)}>
                Batal
              </button>
              <button
                type="button"
                className="btn-primary-admin"
                style={{ backgroundColor: "#dc2626", borderColor: "#b91c1c" }}
                disabled={isDeleting}
                onClick={handleDelete}
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
