import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
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
  type WorkflowCategory,
  type CreateWorkflowPayload
} from "../../api/workflows";
import { WorkflowSimpleViewer } from "../comfyui/WorkflowSimpleViewer";
import "../../style/comfy-workflows.css";

export default function ComfyWorkflows() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [workflows, setWorkflows] = useState<ComfyWorkflow[]>([]);
  const [categories, setCategories] = useState<WorkflowCategory[]>([]);
  const [baseModelOptions, setBaseModelOptions] = useState<string[]>(["All", "SDXL", "Illustrious", "Pony", "Flux.1", "SD 1.5"]);
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

  // Workflow Add / Edit Modal state
  const [showWorkflowModal, setShowWorkflowModal] = useState<boolean>(false);
  const [editingWorkflow, setEditingWorkflow] = useState<ComfyWorkflow | null>(null);
  const [workflowToDelete, setWorkflowToDelete] = useState<ComfyWorkflow | null>(null);
  const [isDeletingWorkflow, setIsDeletingWorkflow] = useState<boolean>(false);
  const [workflowFormData, setWorkflowFormData] = useState<CreateWorkflowPayload>({
    name: "",
    base_model: "SDXL",
    category: "txt2img",
    description: "",
    author: "User",
    required_custom_nodes: "",
    workflow_json: ""
  });
  const [uploadFileInfo, setUploadFileInfo] = useState<{
    name: string;
    sizeKb: string;
    nodes: number;
  } | null>(null);
  const [isSavingWorkflow, setIsSavingWorkflow] = useState<boolean>(false);
  const [workflowModalError, setWorkflowModalError] = useState<string | null>(null);

  // Category Manager Modal state
  const [showCatModal, setShowCatModal] = useState<boolean>(false);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [catFormData, setCatFormData] = useState<{
    name: string;
    slug: string;
    description: string;
    sort_order: number;
  }>({
    name: "",
    slug: "",
    description: "",
    sort_order: 1
  });
  const [catToDelete, setCatToDelete] = useState<WorkflowCategory | null>(null);
  const [isSavingCategory, setIsSavingCategory] = useState<boolean>(false);

  // Global Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch workflows
  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const data = await getWorkflowsApi();
      setWorkflows(data);

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
        setSelectedWorkflow((prev) => prev ? (data.find(w => w.id === prev.id) || data[0]) : data[0]);
      }
    } catch {
      showToast("Gagal memuat workflow.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories & base models
  const fetchCategoriesAndBase = async () => {
    try {
      const [cats, bms] = await Promise.all([
        getWorkflowCategoriesApi(),
        getBaseModelsApi()
      ]);
      if (Array.isArray(cats) && cats.length > 0) {
        setCategories(cats);
      }
      if (Array.isArray(bms) && bms.length > 0) {
        setBaseModelOptions(["All", ...bms]);
      }
    } catch {
      // fallback handled in API client
    }
  };

  useEffect(() => {
    fetchWorkflows();
    fetchCategoriesAndBase();
  }, []);

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

  // Open Add Workflow Modal
  const handleOpenAddModal = () => {
    setEditingWorkflow(null);
    setWorkflowModalError(null);
    setUploadFileInfo(null);
    setWorkflowFormData({
      name: "",
      base_model: baseModelOptions.find((b) => b !== "All") || "SDXL",
      category: categories.length > 0 ? categories[0].slug : "txt2img",
      description: "",
      author: "User",
      required_custom_nodes: "",
      workflow_json: ""
    });
    setShowWorkflowModal(true);
  };

  // Open Edit Workflow Modal
  const handleOpenEditModal = (wf: ComfyWorkflow) => {
    setEditingWorkflow(wf);
    setWorkflowModalError(null);
    let nodeCount = wf.total_nodes || 0;
    try {
      const parsed = JSON.parse(wf.workflow_json);
      if (Array.isArray(parsed.nodes)) nodeCount = parsed.nodes.length;
      else if (parsed.prompt && typeof parsed.prompt === "object") nodeCount = Object.keys(parsed.prompt).length;
    } catch {
      // ignore
    }
    setUploadFileInfo({
      name: `${wf.slug || "workflow"}.json`,
      sizeKb: (new Blob([wf.workflow_json]).size / 1024).toFixed(1),
      nodes: nodeCount
    });
    setWorkflowFormData({
      name: wf.name,
      base_model: wf.base_model,
      category: wf.category,
      description: wf.description || "",
      author: wf.author || "User",
      required_custom_nodes: wf.required_custom_nodes || "",
      workflow_json: wf.workflow_json
    });
    setShowWorkflowModal(true);
  };

  // Handle file drop/upload for Workflow JSON
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        let nodeCount = 0;
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed.nodes)) nodeCount = parsed.nodes.length;
          else if (parsed.prompt && typeof parsed.prompt === "object") nodeCount = Object.keys(parsed.prompt).length;
          else if (typeof parsed === "object") nodeCount = Object.keys(parsed).length;
        } catch {
          // ignore
        }

        setUploadFileInfo({
          name: file.name,
          sizeKb: (file.size / 1024).toFixed(1),
          nodes: nodeCount
        });

        setWorkflowFormData((prev) => ({
          ...prev,
          workflow_json: text,
          name: prev.name.trim() ? prev.name : file.name.replace(/\.json$/i, "").replace(/[-_]+/g, " ")
        }));
        setWorkflowModalError(null);
      }
    };
    reader.readAsText(file);
  };

  // Save (Create or Update) Workflow directly to Backend Database (PostgreSQL)
  const handleSaveWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    setWorkflowModalError(null);

    if (!workflowFormData.name.trim()) {
      setWorkflowModalError("Nama workflow wajib diisi.");
      return;
    }

    if (!workflowFormData.workflow_json.trim()) {
      setWorkflowModalError("Teks JSON workflow ComfyUI wajib diisi atau diunggah.");
      return;
    }

    try {
      JSON.parse(workflowFormData.workflow_json);
    } catch {
      setWorkflowModalError("Format JSON tidak valid. Pastikan format teks JSON sesuai struktur ComfyUI.");
      return;
    }

    try {
      setIsSavingWorkflow(true);
      if (editingWorkflow) {
        const updated = await updateWorkflowApi(editingWorkflow.id, workflowFormData);
        showToast(`Workflow "${updated.name}" berhasil diperbarui!`);
        setShowWorkflowModal(false);
        await fetchWorkflows();
        setSelectedWorkflow(updated);
      } else {
        const created = await createWorkflowApi(workflowFormData);
        showToast(`Workflow "${created.name}" berhasil disimpan ke database!`);
        setShowWorkflowModal(false);
        await fetchWorkflows();
        setSelectedWorkflow(created);
      }
    } catch (err: any) {
      setWorkflowModalError(err?.message || "Gagal menyimpan workflow ke database server.");
    } finally {
      setIsSavingWorkflow(false);
    }
  };

  // Delete Workflow from Backend Database
  const handleDeleteWorkflow = async (wf: ComfyWorkflow) => {
    try {
      setIsDeletingWorkflow(true);
      await deleteWorkflowApi(wf.id);
      showToast(`Workflow "${wf.name}" berhasil dihapus.`);
      setWorkflowToDelete(null);

      const data = await getWorkflowsApi();
      setWorkflows(data);
      if (selectedWorkflow?.id === wf.id) {
        setSelectedWorkflow(data.length > 0 ? data[0] : null);
      }
    } catch {
      showToast("Gagal menghapus workflow dari database.");
    } finally {
      setIsDeletingWorkflow(false);
    }
  };

  // Category Manager Handlers (Add, Edit, Delete)
  const handleOpenCatCreate = () => {
    setEditingCatId(null);
    setCatFormData({
      name: "",
      slug: "",
      description: "",
      sort_order: categories.length + 1
    });
  };

  const handleOpenCatEdit = (cat: WorkflowCategory) => {
    setEditingCatId(cat.id);
    setCatFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      sort_order: cat.sort_order || 1
    });
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catFormData.name.trim()) {
      showToast("Nama kategori wajib diisi.");
      return;
    }

    try {
      setIsSavingCategory(true);
      if (editingCatId) {
        await updateWorkflowCategoryApi(editingCatId, catFormData);
        showToast(`Kategori "${catFormData.name}" berhasil diperbarui.`);
      } else {
        await createWorkflowCategoryApi(catFormData);
        showToast(`Kategori "${catFormData.name}" berhasil ditambahkan.`);
      }
      handleOpenCatCreate();
      fetchCategoriesAndBase();
    } catch {
      showToast("Gagal menyimpan kategori.");
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (cat: WorkflowCategory) => {
    try {
      await deleteWorkflowCategoryApi(cat.id);
      showToast(`Kategori "${cat.name}" berhasil dihapus.`);
      setCatToDelete(null);
      fetchCategoriesAndBase();
    } catch {
      showToast("Gagal menghapus kategori.");
    }
  };

  const selectedCategoryObj = categories.find(
    (c) => c.slug.toLowerCase() === selectedWorkflow?.category.toLowerCase()
  );

  return (
    <div className="comfy-page-container">
      {/* 1. Page Header */}
      <header className="comfy-page-header">
        <div className="comfy-page-title-row">
          <h1 className="comfy-page-title">
            <span>ComfyUI Workflows</span>
            <span className="comfy-title-badge">Katalog Preset &amp; Example</span>
          </h1>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              className="btn-custom-json"
              onClick={() => setShowCatModal(true)}
              style={{ fontSize: "12px", padding: "6px 14px" }}
            >
              Kelola Kategori
            </button>
            <button
              type="button"
              className="btn-custom-json"
              onClick={handleOpenAddModal}
              style={{ backgroundColor: "#2563eb", borderColor: "#3b82f6", color: "#ffffff", fontSize: "12px", padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Tambah Workflow Baru
            </button>
          </div>
        </div>
        <p className="comfy-page-subtitle">
          Koleksi preset alur ComfyUI siap pakai. Salin workflow langsung ke clipboard (Ctrl + V)
          atau unduh file JSON untuk di-drag &amp; drop ke canvas ComfyUI Anda.
        </p>
      </header>

      {/* 2. Filter and Search Bar */}
      <div className="comfy-filter-bar">
        {/* Base Model Pills */}
        <div className="comfy-filter-group">
          <span className="comfy-filter-label">Base Model:</span>
          {baseModelOptions.map((opt) => (
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

        {/* Category Pills (Clean Monochrome, No Rainbow) */}
        <div className="comfy-filter-group">
          <span className="comfy-filter-label">Kategori:</span>
          <button
            type="button"
            className={`comfy-filter-pill ${categoryFilter.toLowerCase() === "all" ? "active" : ""}`}
            onClick={() => setCategoryFilter("All")}
          >
            Semua
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`comfy-filter-pill ${categoryFilter.toLowerCase() === cat.slug.toLowerCase() ? "active" : ""}`}
              onClick={() => setCategoryFilter(cat.slug)}
              title={cat.description}
            >
              {cat.name}
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

      {/* 3. Main Split Layout */}
      <div className="comfy-split-layout">
        {/* Left Sidebar: Presets List */}
        <aside className="comfy-sidebar-card">
          <div className="comfy-sidebar-header">
            <span className="comfy-sidebar-title">Daftar Preset ({filteredWorkflows.length})</span>
          </div>

          <div className="comfy-presets-list">
            {loading ? (
              <div className="comfy-loading-state">
                <span>Memuat daftar workflow...</span>
              </div>
            ) : filteredWorkflows.length === 0 ? (
              <div className="comfy-empty-state">
                <p>Tidak ada workflow yang cocok dengan filter.</p>
              </div>
            ) : (
              filteredWorkflows.map((wf) => {
                const isActive = selectedWorkflow?.id === wf.id;
                const catObj = categories.find((c) => c.slug.toLowerCase() === wf.category.toLowerCase());
                return (
                  <div key={wf.id} className={`comfy-preset-item-wrapper ${isActive ? "active" : ""}`}>
                    <button
                      type="button"
                      className="comfy-preset-item-btn"
                      onClick={() => handleSelectPreset(wf)}
                    >
                      <div className="preset-title-row">
                        <span className="preset-title">{wf.name}</span>
                      </div>
                      <div className="preset-badge-row">
                        <span className="preset-base-badge">{wf.base_model}</span>
                        <span className="preset-base-badge">{catObj?.name || wf.category.toUpperCase()}</span>
                        <span className="preset-base-badge">{wf.total_nodes || "?"} Nodes</span>
                      </div>
                      {wf.description && (
                        <p className="preset-desc-snippet">{wf.description}</p>
                      )}
                    </button>
                    <div className="preset-quick-actions">
                      <button
                        type="button"
                        className="preset-quick-btn edit"
                        title="Edit preset workflow ini"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(wf);
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="preset-quick-btn delete"
                        title="Hapus preset workflow ini dari database"
                        onClick={(e) => {
                          e.stopPropagation();
                          setWorkflowToDelete(wf);
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Add Workflow Button at Bottom of Sidebar */}
          <div className="comfy-custom-upload-box">
            <button
              type="button"
              className="btn-custom-json"
              onClick={handleOpenAddModal}
            >
              <span>+ Tambah Workflow Baru</span>
            </button>
          </div>
        </aside>

        {/* Right Stage: Clean Simple Workflow Viewer */}
        <main className="comfy-main-stage">
          {selectedWorkflow ? (
            <WorkflowSimpleViewer
              key={selectedWorkflow.id}
              workflow={selectedWorkflow}
              categoryName={selectedCategoryObj?.name}
              onEdit={handleOpenEditModal}
              onDelete={(wf) => setWorkflowToDelete(wf)}
            />
          ) : (
            <div className="comfy-no-selection">
              <p>Pilih salah satu workflow di sebelah kiri untuk melihat detailnya.</p>
            </div>
          )}
        </main>
      </div>

      {/* 4. Add / Edit Workflow Modal (Direct Database Sync) */}
      {showWorkflowModal && (
        <div className="comfy-modal-backdrop" onClick={() => setShowWorkflowModal(false)}>
          <div
            className="comfy-modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "700px" }}
          >
            <div className="comfy-modal-header">
              <div className="comfy-modal-header-left">
                <div className={`comfy-modal-icon-badge ${editingWorkflow ? "edit" : ""}`}>
                  {editingWorkflow ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className="comfy-modal-title">
                    {editingWorkflow ? "Edit Workflow Preset" : "Tambah Workflow Baru ke Database"}
                  </h3>
                  <p className="comfy-modal-subtitle">
                    {editingWorkflow
                      ? `Menyunting data workflow #${editingWorkflow.id} di database PostgreSQL server`
                      : "Workflow disimpan langsung ke database server PostgreSQL"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="comfy-modal-close-btn"
                onClick={() => setShowWorkflowModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWorkflow}>
              <div className="comfy-modal-body">
                {/* Workflow Name */}
                <div className="comfy-form-group">
                  <label className="comfy-form-label">
                    <span>Nama Workflow <span className="comfy-form-label-required">*</span></span>
                  </label>
                  <input
                    type="text"
                    className="comfy-modal-input"
                    placeholder="Contoh: Illustrious XL FaceDetailer Starter"
                    value={workflowFormData.name}
                    onChange={(e) => setWorkflowFormData({ ...workflowFormData, name: e.target.value })}
                    required
                  />
                </div>

                {/* Base Model & Category */}
                <div className="comfy-modal-row">
                  <div className="comfy-form-group">
                    <label className="comfy-form-label">
                      <span>Base Model Target <span className="comfy-form-label-required">*</span></span>
                    </label>
                    <select
                      className="comfy-modal-select"
                      value={workflowFormData.base_model}
                      onChange={(e) => setWorkflowFormData({ ...workflowFormData, base_model: e.target.value })}
                    >
                      {baseModelOptions.filter((b) => b !== "All").map((bm) => (
                        <option key={bm} value={bm}>
                          {bm}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="comfy-form-group">
                    <label className="comfy-form-label">
                      <span>Kategori Workflow <span className="comfy-form-label-required">*</span></span>
                    </label>
                    <select
                      className="comfy-modal-select"
                      value={workflowFormData.category}
                      onChange={(e) => setWorkflowFormData({ ...workflowFormData, category: e.target.value })}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Author & Required Nodes */}
                <div className="comfy-modal-row">
                  <div className="comfy-form-group">
                    <label className="comfy-form-label">
                      <span>Author / Pembuat</span>
                    </label>
                    <input
                      type="text"
                      className="comfy-modal-input"
                      placeholder="Nama Anda atau pembuat workflow"
                      value={workflowFormData.author || ""}
                      onChange={(e) => setWorkflowFormData({ ...workflowFormData, author: e.target.value })}
                    />
                  </div>

                  <div className="comfy-form-group">
                    <label className="comfy-form-label">
                      <span>Custom Nodes yang Dibutuhkan</span>
                    </label>
                    <input
                      type="text"
                      className="comfy-modal-input"
                      placeholder="Contoh: ComfyUI-Impact-Pack"
                      value={workflowFormData.required_custom_nodes || ""}
                      onChange={(e) => setWorkflowFormData({ ...workflowFormData, required_custom_nodes: e.target.value })}
                    />
                  </div>
                </div>

                {/* Short Description */}
                <div className="comfy-form-group">
                  <label className="comfy-form-label">
                    <span>Deskripsi Ringkas</span>
                  </label>
                  <input
                    type="text"
                    className="comfy-modal-input"
                    placeholder="Penjelasan ringkas tentang alur dan tujuan workflow ini..."
                    value={workflowFormData.description || ""}
                    onChange={(e) => setWorkflowFormData({ ...workflowFormData, description: e.target.value })}
                  />
                </div>

                {/* JSON Input & File Upload */}
                <div className="comfy-form-group">
                  <div className="comfy-upload-row">
                    <label className="comfy-form-label" style={{ marginBottom: 0 }}>
                      <span>File / Isi JSON ComfyUI <span className="comfy-form-label-required">*</span></span>
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {uploadFileInfo && (
                        <span className="comfy-upload-success-chip">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          {uploadFileInfo.name} ({uploadFileInfo.sizeKb} KB, {uploadFileInfo.nodes} nodes)
                        </span>
                      )}
                      <label className="comfy-upload-btn">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span>Upload File .json</span>
                        <input type="file" accept=".json,application/json" onChange={handleFileUpload} style={{ display: "none" }} />
                      </label>
                    </div>
                  </div>
                  <textarea
                    className="comfy-modal-textarea"
                    rows={8}
                    placeholder="Paste teks JSON ComfyUI di sini atau gunakan tombol upload file di atas..."
                    value={workflowFormData.workflow_json}
                    onChange={(e) => {
                      setWorkflowFormData({ ...workflowFormData, workflow_json: e.target.value });
                      setWorkflowModalError(null);
                    }}
                    required
                  />
                </div>

                {workflowModalError && (
                  <div className="comfy-modal-error-alert">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{workflowModalError}</span>
                  </div>
                )}
              </div>

              <div className="comfy-modal-actions">
                <button
                  type="button"
                  className="comfy-modal-cancel-btn"
                  onClick={() => setShowWorkflowModal(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="comfy-modal-submit-btn"
                  disabled={isSavingWorkflow}
                >
                  {isSavingWorkflow ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
                        <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                      </svg>
                      Menyimpan ke Database...
                    </>
                  ) : editingWorkflow ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" />
                        <polyline points="7 3 7 8 15 8" />
                      </svg>
                      Simpan Perubahan
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" />
                        <polyline points="7 3 7 8 15 8" />
                      </svg>
                      Simpan ke Database
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Delete Workflow Confirmation Modal */}
      {workflowToDelete && (
        <div className="comfy-modal-backdrop" onClick={() => setWorkflowToDelete(null)}>
          <div className="comfy-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "440px" }}>
            <div className="comfy-modal-header">
              <div className="comfy-modal-header-left">
                <div className="comfy-modal-icon-badge danger">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </div>
                <div>
                  <h3 className="comfy-modal-title">Hapus Workflow?</h3>
                  <p className="comfy-modal-subtitle">Tindakan ini tidak dapat dibatalkan</p>
                </div>
              </div>
              <button type="button" className="comfy-modal-close-btn" onClick={() => setWorkflowToDelete(null)}>
                ✕
              </button>
            </div>
            <div className="comfy-modal-body" style={{ padding: "20px" }}>
              <p style={{ color: "#e2e8f0", fontSize: "13px", lineHeight: "1.6", margin: 0 }}>
                Apakah Anda yakin ingin menghapus preset <strong>"{workflowToDelete.name}"</strong>?
              </p>
              <p style={{ color: "#94a3b8", fontSize: "12px", marginTop: "8px", marginBottom: 0 }}>
                Workflow ini ({workflowToDelete.base_model} &bull; {workflowToDelete.category}) akan dihapus secara permanen dari database server.
              </p>
            </div>
            <div className="comfy-modal-actions">
              <button
                type="button"
                className="comfy-modal-cancel-btn"
                onClick={() => setWorkflowToDelete(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="comfy-modal-danger-btn"
                disabled={isDeletingWorkflow}
                onClick={() => handleDeleteWorkflow(workflowToDelete)}
              >
                {isDeletingWorkflow ? "Menghapus..." : "Ya, Hapus Workflow"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Category Manager Modal (Add, Edit, Delete - Monochrome) */}
      {showCatModal && (
        <div className="comfy-modal-backdrop" onClick={() => setShowCatModal(false)}>
          <div
            className="comfy-modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "780px", maxHeight: "90vh", overflowY: "auto" }}
          >
            <div className="comfy-modal-header">
              <h3 style={{ margin: 0, fontSize: "16px", color: "#f8fafc" }}>
                Kelola Kategori Workflow
              </h3>
              <button
                type="button"
                className="comfy-modal-close-btn"
                onClick={() => setShowCatModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="comfy-modal-body" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* Form Add / Edit Category */}
              <form
                onSubmit={handleSaveCategory}
                style={{
                  backgroundColor: "#111622",
                  padding: "16px",
                  borderRadius: "6px",
                  border: "1px solid #283245",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px"
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
                      style={{ fontSize: "11px", color: "#38bdf8", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                    >
                      Batal edit &amp; buat baru
                    </button>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>
                      Nama Kategori *
                    </label>
                    <input
                      type="text"
                      className="comfy-modal-input"
                      placeholder="Contoh: Style Transfer"
                      value={catFormData.name}
                      onChange={(e) => setCatFormData({ ...catFormData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>
                      Slug (Opsional)
                    </label>
                    <input
                      type="text"
                      className="comfy-modal-input"
                      placeholder="style_transfer"
                      value={catFormData.slug}
                      onChange={(e) => setCatFormData({ ...catFormData, slug: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>
                      Urutan
                    </label>
                    <input
                      type="number"
                      className="comfy-modal-input"
                      value={catFormData.sort_order}
                      onChange={(e) => setCatFormData({ ...catFormData, sort_order: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>
                    Deskripsi Ringkas
                  </label>
                  <input
                    type="text"
                    className="comfy-modal-input"
                    placeholder="Penjelasan ringkas tentang alur kategori ini..."
                    value={catFormData.description}
                    onChange={(e) => setCatFormData({ ...catFormData, description: e.target.value })}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
                  <button
                    type="submit"
                    className="comfy-modal-submit-btn"
                    disabled={isSavingCategory}
                    style={{ fontSize: "12px", padding: "6px 14px" }}
                  >
                    {editingCatId ? "Simpan Perubahan Kategori" : "+ Tambah Kategori"}
                  </button>
                </div>
              </form>

              {/* Existing Categories Table */}
              <div>
                <span style={{ fontWeight: 700, fontSize: "13px", color: "#f8fafc", marginBottom: "8px", display: "block" }}>
                  Daftar Kategori Terdaftar ({categories.length})
                </span>
                <div style={{ border: "1px solid #283245", borderRadius: "6px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#161b26", borderBottom: "1px solid #283245", color: "#94a3b8", textAlign: "left" }}>
                        <th style={{ padding: "8px 12px", width: "30%" }}>Nama</th>
                        <th style={{ padding: "8px 12px", width: "25%" }}>Slug</th>
                        <th style={{ padding: "8px 12px", width: "30%" }}>Deskripsi</th>
                        <th style={{ padding: "8px 12px", width: "15%", textAlign: "right" }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((c) => (
                        <tr key={c.id} style={{ borderBottom: "1px solid #1e293b", backgroundColor: "#0f172a" }}>
                          <td style={{ padding: "8px 12px", fontWeight: 600, color: "#f8fafc" }}>
                            {c.name}
                          </td>
                          <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#38bdf8" }}>
                            {c.slug}
                          </td>
                          <td style={{ padding: "8px 12px", color: "#94a3b8" }}>
                            {c.description || "-"}
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "right" }}>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                              <button
                                type="button"
                                onClick={() => handleOpenCatEdit(c)}
                                style={{ background: "#1e293b", border: "1px solid #334155", color: "#cbd5e1", borderRadius: "4px", padding: "3px 8px", cursor: "pointer", fontSize: "11px" }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setCatToDelete(c)}
                                style={{ background: "#7f1d1d", border: "1px solid #dc2626", color: "#fecaca", borderRadius: "4px", padding: "3px 8px", cursor: "pointer", fontSize: "11px" }}
                              >
                                Hapus
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
        </div>
      )}

      {/* 6. Delete Category Confirmation Modal */}
      {catToDelete && (
        <div className="comfy-modal-backdrop" onClick={() => setCatToDelete(null)}>
          <div className="comfy-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "420px" }}>
            <div className="comfy-modal-header">
              <h3 style={{ margin: 0, fontSize: "15px", color: "#f8fafc" }}>
                Hapus Kategori?
              </h3>
              <button type="button" className="comfy-modal-close-btn" onClick={() => setCatToDelete(null)}>
                ✕
              </button>
            </div>
            <div className="comfy-modal-body" style={{ padding: "16px" }}>
              <p style={{ color: "#cbd5e1", fontSize: "13px", lineHeight: "1.5", margin: 0 }}>
                Yakin ingin menghapus kategori <strong>"{catToDelete.name}"</strong>?
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "18px" }}>
                <button
                  type="button"
                  className="comfy-modal-cancel-btn"
                  onClick={() => setCatToDelete(null)}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="comfy-modal-submit-btn"
                  onClick={() => handleDeleteCategory(catToDelete)}
                  style={{ backgroundColor: "#dc2626" }}
                >
                  Hapus Kategori
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Alert */}
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
}
