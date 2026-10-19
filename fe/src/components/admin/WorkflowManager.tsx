import React, { useState, useEffect } from "react";
import {
  getWorkflowsApi,
  createWorkflowApi,
  updateWorkflowApi,
  deleteWorkflowApi,
  getWorkflowCategoriesApi,
  createWorkflowCategoryApi,
  updateWorkflowCategoryApi,
  deleteWorkflowCategoryApi,
  getBaseModelsApi,
  type ComfyWorkflow,
  type CreateWorkflowPayload,
  type WorkflowCategory
} from "../../api/workflows";
import type { Model } from "../../api/models";

interface WorkflowManagerProps {
  models: Model[];
  onToast: (type: "success" | "error" | "info", msg: string) => void;
}

export const WorkflowManager: React.FC<WorkflowManagerProps> = ({ models, onToast }) => {
  const [workflows, setWorkflows] = useState<ComfyWorkflow[]>([]);
  const [categories, setCategories] = useState<WorkflowCategory[]>([]);
  const [baseModels, setBaseModels] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");

  // Workflow Form Modal State
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

  // Workflow Delete Modal State
  const [workflowToDelete, setWorkflowToDelete] = useState<ComfyWorkflow | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Category Manager Modal State
  const [isCatModalOpen, setIsCatModalOpen] = useState<boolean>(false);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [catFormData, setCatFormData] = useState<{
    name: string;
    slug: string;
    description: string;
    icon: string;
    color: string;
    sort_order: number;
  }>({
    name: "",
    slug: "",
    description: "",
    icon: "🎨",
    color: "#2563eb",
    sort_order: 1
  });
  const [catToDelete, setCatToDelete] = useState<WorkflowCategory | null>(null);
  const [isCatSubmitting, setIsCatSubmitting] = useState<boolean>(false);

  // Fetch Workflows
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

  // Fetch Categories
  const fetchCategories = async () => {
    try {
      const data = await getWorkflowCategoriesApi();
      setCategories(data);
    } catch {
      // fallback handled in API client
    }
  };

  // Fetch Base Models from models table
  const fetchBaseModels = async () => {
    try {
      const data = await getBaseModelsApi();
      // Combine with any base_model present in models prop
      const fromModels = models.map((m) => m.base_model).filter(Boolean);
      const merged = Array.from(new Set([...data, ...fromModels, "SDXL", "Illustrious", "Pony", "Flux.1", "SD 1.5"]));
      setBaseModels(merged.sort());
    } catch {
      setBaseModels(["SDXL", "Illustrious", "Pony", "Flux.1", "SD 1.5", "All"]);
    }
  };

  useEffect(() => {
    fetchWorkflows();
    fetchCategories();
    fetchBaseModels();
  }, []);

  // Update baseModels when models prop changes
  useEffect(() => {
    if (models.length > 0) {
      const fromModels = models.map((m) => m.base_model).filter(Boolean);
      setBaseModels((prev) => Array.from(new Set([...prev, ...fromModels])).sort());
    }
  }, [models]);

  // Open Create Workflow Modal
  const handleOpenCreate = () => {
    setEditingId(null);
    setJsonError(null);
    const defaultCat = categories.length > 0 ? categories[0].slug : "txt2img";
    const defaultBase = baseModels.length > 0 ? baseModels[0] : "SDXL";
    setFormData({
      name: "",
      base_model: defaultBase,
      category: defaultCat,
      description: "",
      author: "Admin",
      required_custom_nodes: "",
      workflow_json: "",
      model_id: undefined
    });
    setIsModalOpen(true);
  };

  // Open Edit Workflow Modal
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

  // File Upload handler for workflow JSON
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

  // Save Workflow
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

  // Delete Workflow
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

  // Category Management Handlers
  const handleOpenCatCreate = () => {
    setEditingCatId(null);
    setCatFormData({
      name: "",
      slug: "",
      description: "",
      icon: "🎨",
      color: "#2563eb",
      sort_order: categories.length + 1
    });
  };

  const handleOpenCatEdit = (cat: WorkflowCategory) => {
    setEditingCatId(cat.id);
    setCatFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      icon: cat.icon || "🎨",
      color: cat.color || "#2563eb",
      sort_order: cat.sort_order || 1
    });
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catFormData.name.trim()) {
      onToast("error", "Nama kategori wajib diisi.");
      return;
    }

    try {
      setIsCatSubmitting(true);
      if (editingCatId) {
        await updateWorkflowCategoryApi(editingCatId, catFormData);
        onToast("success", `Kategori "${catFormData.name}" berhasil diperbarui.`);
      } else {
        await createWorkflowCategoryApi(catFormData);
        onToast("success", `Kategori "${catFormData.name}" berhasil ditambahkan.`);
      }
      handleOpenCatCreate();
      fetchCategories();
    } catch {
      onToast("error", "Gagal menyimpan kategori.");
    } finally {
      setIsCatSubmitting(false);
    }
  };

  const handleDeleteCategory = async (cat: WorkflowCategory) => {
    try {
      await deleteWorkflowCategoryApi(cat.id);
      onToast("success", `Kategori "${cat.name}" berhasil dihapus.`);
      setCatToDelete(null);
      fetchCategories();
    } catch {
      onToast("error", "Gagal menghapus kategori.");
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
          <span style={{ fontSize: "12px", color: "#64748b" }}>•</span>
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>{categories.length} Kategori</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Kelola Kategori Button */}
          <button
            type="button"
            className="btn-secondary-admin"
            onClick={() => setIsCatModalOpen(true)}
            title="Kelola Kategori Workflow (Add, Edit, Delete)"
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            Kelola Kategori
          </button>

          {/* Tambah Workflow Button */}
          <button type="button" className="btn-primary-admin" onClick={handleOpenCreate}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Tambah Workflow
          </button>
        </div>
      </div>

      {/* Workflows Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: "30%" }}>Nama Workflow</th>
              <th style={{ width: "15%" }}>Base Model</th>
              <th style={{ width: "15%" }}>Kategori</th>
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
                  Belum ada workflow ComfyUI. Klik tombol "Tambah Workflow" di atas.
                </td>
              </tr>
            ) : (
              filtered.map((wf) => {
                const linkedModel = models.find((m) => m.id === wf.model_id);
                const catObj = categories.find((c) => c.slug.toLowerCase() === wf.category.toLowerCase());
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
                      <span className="badge-type-pill">
                        {catObj?.name || wf.category.toUpperCase()}
                      </span>
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

      {/* Category Manager Modal (CRUD) */}
      {isCatModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsCatModalOpen(false)}>
          <div
            className="admin-modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "840px", maxHeight: "90vh", overflowY: "auto" }}
          >
            <div className="admin-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px" }}>🏷️</span>
                <h3>Kelola Kategori Workflow ComfyUI</h3>
              </div>
              <button type="button" className="admin-modal-close-btn" onClick={() => setIsCatModalOpen(false)}>
                ✕
              </button>
            </div>

            <div className="admin-modal-body" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Form Add / Edit Category */}
              <form
                onSubmit={handleSaveCategory}
                style={{
                  backgroundColor: "#181818",
                  padding: "16px",
                  borderRadius: "8px",
                  border: "1px solid #2d2d2d",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, fontSize: "13px", color: "#f8fafc" }}>
                    {editingCatId ? `Edit Kategori #${editingCatId}` : "Tambah Kategori Baru"}
                  </span>
                  {editingCatId && (
                    <button
                      type="button"
                      onClick={handleOpenCatCreate}
                      style={{ fontSize: "11px", color: "#94a3b8", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                    >
                      Batal edit & buat baru
                    </button>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr 1fr", gap: "10px" }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Nama Kategori *</label>
                    <input
                      type="text"
                      className="admin-form-input"
                      placeholder="Contoh: Text to Image"
                      value={catFormData.name}
                      onChange={(e) => setCatFormData({ ...catFormData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Slug (Opsional)</label>
                    <input
                      type="text"
                      className="admin-form-input"
                      placeholder="txt2img"
                      value={catFormData.slug}
                      onChange={(e) => setCatFormData({ ...catFormData, slug: e.target.value })}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Urutan</label>
                    <input
                      type="number"
                      className="admin-form-input"
                      value={catFormData.sort_order}
                      onChange={(e) => setCatFormData({ ...catFormData, sort_order: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Deskripsi Kategori</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    placeholder="Penjelasan ringkas tentang alur workflow ini..."
                    value={catFormData.description}
                    onChange={(e) => setCatFormData({ ...catFormData, description: e.target.value })}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
                  <button type="submit" className="btn-primary-admin" disabled={isCatSubmitting}>
                    {editingCatId ? "Simpan Perubahan Kategori" : "+ Tambah Kategori"}
                  </button>
                </div>
              </form>

              {/* Existing Categories Table */}
              <div>
                <span style={{ fontWeight: 700, fontSize: "13px", color: "#f8fafc", marginBottom: "8px", display: "block" }}>
                  Daftar Kategori Terdaftar ({categories.length})
                </span>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: "30%" }}>Nama Kategori</th>
                      <th style={{ width: "20%" }}>Slug</th>
                      <th style={{ width: "32%" }}>Deskripsi</th>
                      <th style={{ width: "8%" }}>Urutan</th>
                      <th style={{ width: "10%", textAlign: "right" }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <span style={{ fontWeight: 600, color: "#f8fafc" }}>{c.name}</span>
                        </td>
                        <td>
                          <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#60a5fa" }}>{c.slug}</span>
                        </td>
                        <td style={{ fontSize: "12px", color: "#94a3b8" }}>{c.description || "-"}</td>
                        <td style={{ fontSize: "12px" }}>{c.sort_order}</td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                            <button
                              type="button"
                              className="table-action-btn edit-btn"
                              title="Edit Kategori"
                              onClick={() => handleOpenCatEdit(c)}
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              className="table-action-btn delete-btn"
                              title="Hapus Kategori"
                              onClick={() => setCatToDelete(c)}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Dialog */}
      {catToDelete && (
        <div className="admin-modal-backdrop" onClick={() => setCatToDelete(null)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "440px" }}>
            <div className="admin-modal-header">
              <h3>Hapus Kategori?</h3>
              <button type="button" className="admin-modal-close-btn" onClick={() => setCatToDelete(null)}>
                ✕
              </button>
            </div>
            <div className="admin-modal-body" style={{ padding: "16px" }}>
              <p style={{ color: "#cbd5e1", fontSize: "13px", lineHeight: "1.5" }}>
                Yakin ingin menghapus kategori <strong>"{catToDelete.name}"</strong>? Workflow yang menggunakan kategori ini akan tetap ada.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "20px" }}>
                <button type="button" className="btn-secondary-admin" onClick={() => setCatToDelete(null)}>
                  Batal
                </button>
                <button
                  type="button"
                  className="table-action-btn delete-btn"
                  onClick={() => handleDeleteCategory(catToDelete)}
                  style={{ padding: "6px 14px", height: "auto" }}
                >
                  Hapus Kategori
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal (Create / Edit Workflow) */}
      {isModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div
            className="admin-modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "740px", maxHeight: "90vh", overflowY: "auto" }}
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

              {/* Tautkan ke Model Spesifik */}
              <div className="admin-form-group">
                <label className="admin-form-label">
                  Tautkan ke Model Spesifik (Opsional — Base Model akan otomatis mengikuti model yang dipilih)
                </label>
                <select
                  className="admin-form-input"
                  value={formData.model_id || ""}
                  onChange={(e) => {
                    const chosenId = e.target.value ? Number(e.target.value) : undefined;
                    const matchedModel = models.find((m) => m.id === chosenId);
                    setFormData((prev) => ({
                      ...prev,
                      model_id: chosenId,
                      // Otomatis ikuti base model dari model yang dipilih jika ada
                      base_model: matchedModel?.base_model || prev.base_model
                    }));
                  }}
                >
                  <option value="">-- Tidak Ditautkan (Workflow Universal) --</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} [{m.type}] ({m.base_model || "Tanpa Base Model"})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {/* Base Model (Dynamic from models table) */}
                <div className="admin-form-group">
                  <label className="admin-form-label">
                    Base Model Target (Mengikuti daftar Models)
                  </label>
                  <select
                    className="admin-form-input"
                    value={formData.base_model}
                    onChange={(e) => setFormData({ ...formData, base_model: e.target.value })}
                  >
                    {baseModels.map((bm) => (
                      <option key={bm} value={bm}>
                        {bm}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Kategori (Dynamic from Workflow Categories CRUD) */}
                <div className="admin-form-group">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <label className="admin-form-label">Kategori Workflow</label>
                    <button
                      type="button"
                      onClick={() => setIsCatModalOpen(true)}
                      style={{ fontSize: "11px", color: "#38bdf8", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                    >
                      + Kelola Kategori
                    </button>
                  </div>
                  <select
                    className="admin-form-input"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.icon ? `${c.icon} ` : ""}{c.name} ({c.slug})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="admin-form-group">
                  <label className="admin-form-label">Author / Pembuat</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    placeholder="Contoh: Models Guide Team"
                    value={formData.author || ""}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Custom Nodes yang Dibutuhkan</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    placeholder="Contoh: ComfyUI-Impact-Pack, ComfyUI-Custom-Scripts"
                    value={formData.required_custom_nodes || ""}
                    onChange={(e) => setFormData({ ...formData, required_custom_nodes: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Deskripsi Ringkas & Panduan Penggunaan</label>
                <textarea
                  className="admin-form-input"
                  rows={2}
                  placeholder="Jelaskan alur, tips sampling, dan kegunaan workflow ini..."
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* JSON Upload / Paste */}
              <div className="admin-form-group">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <label className="admin-form-label">
                    Workflow JSON ComfyUI * (LiteGraph nodes & links)
                  </label>
                  <label
                    className="btn-secondary-admin"
                    style={{ fontSize: "11px", padding: "4px 10px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <span>📁 Upload File .json</span>
                    <input type="file" accept=".json,application/json" onChange={handleFileUpload} style={{ display: "none" }} />
                  </label>
                </div>
                <textarea
                  className="admin-form-input"
                  rows={8}
                  placeholder='Paste format JSON ComfyUI di sini (misal: {"nodes": [...], "links": [...]})'
                  value={formData.workflow_json}
                  onChange={(e) => {
                    setFormData({ ...formData, workflow_json: e.target.value });
                    setJsonError(null);
                  }}
                  style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: "11px" }}
                  required
                />
                {jsonError && (
                  <span style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block" }}>
                    ⚠️ {jsonError}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button type="button" className="btn-secondary-admin" onClick={() => setIsModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn-primary-admin">
                  {editingId ? "Simpan Perubahan Workflow" : "Simpan Workflow"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Workflow Confirmation Modal */}
      {workflowToDelete && (
        <div className="admin-modal-backdrop" onClick={() => setWorkflowToDelete(null)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px" }}>
            <div className="admin-modal-header">
              <h3>Konfirmasi Hapus Workflow</h3>
              <button type="button" className="admin-modal-close-btn" onClick={() => setWorkflowToDelete(null)}>
                ✕
              </button>
            </div>
            <div className="admin-modal-body" style={{ padding: "16px" }}>
              <p style={{ color: "#cbd5e1", fontSize: "13px", lineHeight: "1.5" }}>
                Apakah Anda yakin ingin menghapus workflow <strong>"{workflowToDelete.name}"</strong>?
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
                <button type="button" className="btn-secondary-admin" onClick={() => setWorkflowToDelete(null)}>
                  Batal
                </button>
                <button
                  type="button"
                  className="table-action-btn delete-btn"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  style={{ padding: "8px 16px", height: "auto" }}
                >
                  {isDeleting ? "Menghapus..." : "Hapus Workflow"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
