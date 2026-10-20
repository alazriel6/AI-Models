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
  const [baseModelOptions, setBaseModelOptions] = useState<string[]>([
    "Semua",
    "Illustrious",
    "NoobAI",
    "Flux",
    "SDXL",
    "Pony",
    "SD 1.5"
  ]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<ComfyWorkflow | null>(null);

  // Filters (Default: "Semua")
  const [baseModelFilter, setBaseModelFilter] = useState<string>(
    searchParams.get("base_model") || "Semua"
  );
  const [categoryFilter, setCategoryFilter] = useState<string>(
    searchParams.get("category") || "Semua"
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
    thumbnail_url: "",
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
        setSelectedWorkflow((prev) => (prev ? data.find((w) => w.id === prev.id) || data[0] : data[0]));
      }
    } catch {
      showToast("Gagal memuat daftar workflow.");
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
        const cleanBms = bms.filter((b) => b.toLowerCase() !== "all");
        // Ensure standard priority: Illustrious, NoobAI, Flux, SDXL, Pony
        const defaultOrder = ["Illustrious", "NoobAI", "Flux", "SDXL", "Pony", "SD 1.5"];
        const combined = Array.from(new Set([...defaultOrder, ...cleanBms]));
        setBaseModelOptions(["Semua", ...combined]);
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
      // Base Model filter
      if (
        baseModelFilter !== "Semua" &&
        baseModelFilter !== "All" &&
        w.base_model.toLowerCase() !== baseModelFilter.toLowerCase()
      ) {
        return false;
      }
      // Category filter
      if (
        categoryFilter !== "Semua" &&
        categoryFilter !== "All" &&
        w.category.toLowerCase() !== categoryFilter.toLowerCase()
      ) {
        return false;
      }
      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = w.name.toLowerCase().includes(q);
        const matchDesc = w.description ? w.description.toLowerCase().includes(q) : false;
        const matchBase = w.base_model.toLowerCase().includes(q);
        const matchCategory = w.category.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchBase && !matchCategory) return false;
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

  // Open Add Workflow Modal (Only single primary trigger on header)
  const handleOpenAddModal = () => {
    setEditingWorkflow(null);
    setWorkflowModalError(null);
    setUploadFileInfo(null);
    setWorkflowFormData({
      name: "",
      base_model: baseModelOptions.find((b) => b !== "Semua" && b !== "All") || "SDXL",
      category: categories.length > 0 ? categories[0].slug : "txt2img",
      description: "",
      author: "User",
      required_custom_nodes: "",
      thumbnail_url: "",
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
      else if (parsed.prompt && typeof parsed.prompt === "object") {
        nodeCount = Object.keys(parsed.prompt).length;
      }
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
      thumbnail_url: wf.thumbnail_url || "",
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
          else if (parsed.prompt && typeof parsed.prompt === "object") {
            nodeCount = Object.keys(parsed.prompt).length;
          } else if (typeof parsed === "object") {
            nodeCount = Object.keys(parsed).length;
          }
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

  // Save (Create or Update) Workflow
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
        showToast(`Workflow "${created.name}" berhasil ditambahkan!`);
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

  // Delete Workflow
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

  // Category Manager Handlers
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
    <div className="comfy-page-workspace">
      {/* =========================================================================
          A. TOP HEADER (Ringkas & Fungsional)
          ========================================================================= */}
      <header className="comfy-top-header">
        <div className="comfy-header-title-box">
          <h1 className="comfy-header-title">ComfyUI Workflows</h1>
          <span className="comfy-header-badge">Katalog Preset</span>
        </div>

        <div className="comfy-header-actions">
          <button
            type="button"
            className="comfy-btn-secondary"
            onClick={() => setShowCatModal(true)}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <span>Kelola Kategori</span>
          </button>

          {/* Satu-satunya tombol utama di seluruh layar */}
          <button
            type="button"
            className="comfy-btn-primary"
            onClick={handleOpenAddModal}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>+ Workflow Baru</span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          MASTER-DETAIL WORKSPACE (Sidebar Kiri + Panel Utama Kanan)
          ========================================================================= */}
      <div className="comfy-workspace-body">
        {/* =====================================================================
            B. SIDEBAR KIRI (Daftar & Filter Terpusat - Lebar tetap 320px-360px)
            ===================================================================== */}
        <aside className="comfy-sidebar-pane">
          {/* 1. Search Bar langsung di bagian paling atas Sidebar */}
          <div className="comfy-sidebar-search-box">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="comfy-sidebar-search-input"
              placeholder="Cari workflow..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="comfy-search-clear-btn"
                onClick={() => setSearchQuery("")}
                aria-label="Bersihkan pencarian"
              >
                ✕
              </button>
            )}
          </div>

          {/* 2. Filter Kompak Base Model & Kategori */}
          <div className="comfy-sidebar-filters">
            {/* Base Model Pills */}
            <div className="comfy-filter-section">
              <div className="comfy-filter-section-title">
                <span>Base Model</span>
              </div>
              <div className="comfy-filter-pills-row">
                {baseModelOptions.map((opt) => {
                  const isActive =
                    baseModelFilter.toLowerCase() === opt.toLowerCase() ||
                    (opt === "Semua" && baseModelFilter.toLowerCase() === "all");
                  return (
                    <button
                      key={opt}
                      type="button"
                      className={`comfy-filter-pill ${isActive ? "active" : ""}`}
                      onClick={() => setBaseModelFilter(opt)}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Kategori Horizontal Scroll / Pills */}
            <div className="comfy-filter-section">
              <div className="comfy-filter-section-title">
                <span>Kategori</span>
              </div>
              <div className="comfy-filter-pills-row">
                <button
                  type="button"
                  className={`comfy-filter-pill ${
                    categoryFilter.toLowerCase() === "semua" || categoryFilter.toLowerCase() === "all"
                      ? "active"
                      : ""
                  }`}
                  onClick={() => setCategoryFilter("Semua")}
                >
                  Semua
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`comfy-filter-pill ${
                      categoryFilter.toLowerCase() === cat.slug.toLowerCase() ? "active" : ""
                    }`}
                    onClick={() => setCategoryFilter(cat.slug)}
                    title={cat.description}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Header Counter */}
          <div className="comfy-sidebar-list-meta">
            <span>Daftar Preset</span>
            <span className="comfy-count-tag">{filteredWorkflows.length}</span>
          </div>

          {/* 4. Daftar Preset (Bersih & Elegan) */}
          <div className="comfy-presets-scroll">
            {loading ? (
              <div className="comfy-sidebar-empty">
                <span>Memuat workflow...</span>
              </div>
            ) : filteredWorkflows.length === 0 ? (
              <div className="comfy-sidebar-empty">
                <span>Tidak ada preset yang cocok.</span>
              </div>
            ) : (
              filteredWorkflows.map((wf) => {
                const isActive = selectedWorkflow?.id === wf.id;
                const catObj = categories.find((c) => c.slug.toLowerCase() === wf.category.toLowerCase());
                return (
                  <div
                    key={wf.id}
                    className={`comfy-preset-card ${isActive ? "active" : ""}`}
                    onClick={() => handleSelectPreset(wf)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleSelectPreset(wf);
                      }
                    }}
                  >
                    <div className="comfy-preset-card-top">
                      <span className="comfy-preset-name">{wf.name}</span>
                    </div>

                    <div className="comfy-preset-badges">
                      <span className="comfy-micro-badge base">{wf.base_model}</span>
                      <span className="comfy-micro-badge cat">{catObj?.name || wf.category.toUpperCase()}</span>
                      <span className="comfy-micro-badge mono">{wf.total_nodes || 0} Nodes</span>
                    </div>

                    {wf.description && (
                      <p className="comfy-preset-desc-line">{wf.description}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* =====================================================================
            C. PANEL UTAMA KANAN (Detail Workflow yang Bersih & Visual)
            ===================================================================== */}
        <main className="comfy-detail-pane">
          {selectedWorkflow ? (
            <WorkflowSimpleViewer
              key={selectedWorkflow.id}
              workflow={selectedWorkflow}
              categoryName={selectedCategoryObj?.name}
              onEdit={handleOpenEditModal}
              onDelete={(wf) => setWorkflowToDelete(wf)}
            />
          ) : (
            <div className="comfy-detail-empty">
              <div className="comfy-detail-empty-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 3v18" />
                </svg>
              </div>
              <h3>Pilih Workflow Preset</h3>
              <p>Pilih salah satu alur kerja di panel sebelah kiri untuk melihat rincian konfigurasi &amp; generator.</p>
            </div>
          )}
        </main>
      </div>

      {/* =========================================================================
          MODAL: TAMBAH / EDIT WORKFLOW
          ========================================================================= */}
      {showWorkflowModal && (
        <div className="comfy-modal-backdrop" onClick={() => setShowWorkflowModal(false)}>
          <div className="comfy-modal-surface" onClick={(e) => e.stopPropagation()}>
            <div className="comfy-modal-head">
              <div className="comfy-modal-head-title">
                <h3>{editingWorkflow ? "Edit Preset Workflow" : "Tambah Workflow Baru"}</h3>
                <p>
                  {editingWorkflow
                    ? `Menyunting data #${editingWorkflow.id} (${editingWorkflow.slug})`
                    : "Simpan alur node ComfyUI siap pakai ke database"}
                </p>
              </div>
              <button
                type="button"
                className="comfy-modal-x"
                onClick={() => setShowWorkflowModal(false)}
                aria-label="Tutup modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWorkflow}>
              <div className="comfy-modal-content">
                {/* Workflow Name */}
                <div className="comfy-field">
                  <label className="comfy-label">
                    Nama Workflow <span className="text-blue-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="comfy-input"
                    placeholder="Contoh: Illustrious FaceDetailer Ultimate"
                    value={workflowFormData.name}
                    onChange={(e) => setWorkflowFormData({ ...workflowFormData, name: e.target.value })}
                    required
                  />
                </div>

                {/* Base Model & Category */}
                <div className="comfy-grid-2">
                  <div className="comfy-field">
                    <label className="comfy-label">
                      Base Model <span className="text-blue-500">*</span>
                    </label>
                    <select
                      className="comfy-select"
                      value={workflowFormData.base_model}
                      onChange={(e) => setWorkflowFormData({ ...workflowFormData, base_model: e.target.value })}
                    >
                      {baseModelOptions
                        .filter((b) => b !== "Semua" && b !== "All")
                        .map((bm) => (
                          <option key={bm} value={bm}>
                            {bm}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="comfy-field">
                    <label className="comfy-label">
                      Kategori <span className="text-blue-500">*</span>
                    </label>
                    <select
                      className="comfy-select"
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

                {/* Author & Required Custom Nodes */}
                <div className="comfy-grid-2">
                  <div className="comfy-field">
                    <label className="comfy-label">Author / Pembuat</label>
                    <input
                      type="text"
                      className="comfy-input"
                      placeholder="Nama Anda atau creator"
                      value={workflowFormData.author || ""}
                      onChange={(e) => setWorkflowFormData({ ...workflowFormData, author: e.target.value })}
                    />
                  </div>

                  <div className="comfy-field">
                    <label className="comfy-label">Custom Nodes yang Dibutuhkan</label>
                    <input
                      type="text"
                      className="comfy-input"
                      placeholder="Contoh: ComfyUI-Impact-Pack, ComfyUI-Manager"
                      value={workflowFormData.required_custom_nodes || ""}
                      onChange={(e) =>
                        setWorkflowFormData({ ...workflowFormData, required_custom_nodes: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* Thumbnail URL (Pratinjau Visual Output) */}
                <div className="comfy-field">
                  <label className="comfy-label">
                    URL Gambar Pratinjau (Thumbnail Output)
                  </label>
                  <input
                    type="text"
                    className="comfy-input"
                    placeholder="https://... atau /images/workflows/sample.webp"
                    value={workflowFormData.thumbnail_url || ""}
                    onChange={(e) => setWorkflowFormData({ ...workflowFormData, thumbnail_url: e.target.value })}
                  />
                </div>

                {/* Description */}
                <div className="comfy-field">
                  <label className="comfy-label">Deskripsi Ringkas</label>
                  <input
                    type="text"
                    className="comfy-input"
                    placeholder="Penjelasan ringkas tentang alur dan kegunaan workflow..."
                    value={workflowFormData.description || ""}
                    onChange={(e) => setWorkflowFormData({ ...workflowFormData, description: e.target.value })}
                  />
                </div>

                {/* Workflow JSON & File Upload */}
                <div className="comfy-field">
                  <div className="comfy-json-label-bar">
                    <label className="comfy-label" style={{ marginBottom: 0 }}>
                      File JSON ComfyUI <span className="text-blue-500">*</span>
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {uploadFileInfo && (
                        <span className="comfy-file-chip">
                          ✓ {uploadFileInfo.name} ({uploadFileInfo.sizeKb} KB, {uploadFileInfo.nodes} nodes)
                        </span>
                      )}
                      <label className="comfy-upload-tag">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span>Unggah File .json</span>
                        <input
                          type="file"
                          accept=".json,application/json"
                          onChange={handleFileUpload}
                          style={{ display: "none" }}
                        />
                      </label>
                    </div>
                  </div>
                  <textarea
                    className="comfy-textarea font-mono"
                    rows={7}
                    placeholder="Paste teks JSON ComfyUI di sini atau unggah file .json di atas..."
                    value={workflowFormData.workflow_json}
                    onChange={(e) => {
                      setWorkflowFormData({ ...workflowFormData, workflow_json: e.target.value });
                      setWorkflowModalError(null);
                    }}
                    required
                  />
                </div>

                {workflowModalError && (
                  <div className="comfy-alert-error">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{workflowModalError}</span>
                  </div>
                )}
              </div>

              <div className="comfy-modal-foot">
                <button
                  type="button"
                  className="comfy-modal-cancel"
                  onClick={() => setShowWorkflowModal(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="comfy-modal-submit"
                  disabled={isSavingWorkflow}
                >
                  {isSavingWorkflow
                    ? "Menyimpan..."
                    : editingWorkflow
                    ? "Simpan Perubahan"
                    : "Simpan Workflow"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: HAPUS WORKFLOW CONFIRMATION
          ========================================================================= */}
      {workflowToDelete && (
        <div className="comfy-modal-backdrop" onClick={() => setWorkflowToDelete(null)}>
          <div className="comfy-modal-surface compact" onClick={(e) => e.stopPropagation()}>
            <div className="comfy-modal-head">
              <div className="comfy-modal-head-title">
                <h3 className="text-red-400">Hapus Preset Workflow?</h3>
                <p>Tindakan ini tidak dapat dibatalkan</p>
              </div>
              <button
                type="button"
                className="comfy-modal-x"
                onClick={() => setWorkflowToDelete(null)}
              >
                ✕
              </button>
            </div>
            <div className="comfy-modal-content">
              <p style={{ margin: 0, fontSize: "13px", color: "#e4e4e7", lineHeight: 1.6 }}>
                Apakah Anda yakin ingin menghapus preset <strong>"{workflowToDelete.name}"</strong>?
              </p>
              <p style={{ marginTop: "6px", marginBottom: 0, fontSize: "12px", color: "#71717a" }}>
                Workflow ini ({workflowToDelete.base_model} &bull; {workflowToDelete.category}) akan dihapus secara permanen.
              </p>
            </div>
            <div className="comfy-modal-foot">
              <button
                type="button"
                className="comfy-modal-cancel"
                onClick={() => setWorkflowToDelete(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="comfy-modal-danger"
                disabled={isDeletingWorkflow}
                onClick={() => handleDeleteWorkflow(workflowToDelete)}
              >
                {isDeletingWorkflow ? "Menghapus..." : "Ya, Hapus Workflow"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: KELOLA KATEGORI WORKFLOW
          ========================================================================= */}
      {showCatModal && (
        <div className="comfy-modal-backdrop" onClick={() => setShowCatModal(false)}>
          <div className="comfy-modal-surface large" onClick={(e) => e.stopPropagation()}>
            <div className="comfy-modal-head">
              <div className="comfy-modal-head-title">
                <h3>Kelola Kategori Workflow</h3>
                <p>Tambah, sunting, atau hapus taksonomi alur ComfyUI</p>
              </div>
              <button
                type="button"
                className="comfy-modal-x"
                onClick={() => setShowCatModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="comfy-modal-content">
              {/* Form Add / Edit Category */}
              <form onSubmit={handleSaveCategory} className="comfy-cat-form-box">
                <div className="comfy-cat-form-header">
                  <span className="comfy-cat-form-title">
                    {editingCatId ? `Edit Kategori #${editingCatId}` : "Tambah Kategori Baru"}
                  </span>
                  {editingCatId && (
                    <button
                      type="button"
                      onClick={handleOpenCatCreate}
                      className="comfy-cat-reset-btn"
                    >
                      Batal edit &amp; buat baru
                    </button>
                  )}
                </div>

                <div className="comfy-grid-3">
                  <div>
                    <label className="comfy-label">Nama Kategori *</label>
                    <input
                      type="text"
                      className="comfy-input"
                      placeholder="Contoh: Style Transfer"
                      value={catFormData.name}
                      onChange={(e) => setCatFormData({ ...catFormData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="comfy-label">Slug</label>
                    <input
                      type="text"
                      className="comfy-input font-mono"
                      placeholder="style_transfer"
                      value={catFormData.slug}
                      onChange={(e) => setCatFormData({ ...catFormData, slug: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="comfy-label">Urutan</label>
                    <input
                      type="number"
                      className="comfy-input"
                      value={catFormData.sort_order}
                      onChange={(e) => setCatFormData({ ...catFormData, sort_order: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <label className="comfy-label">Deskripsi Ringkas</label>
                  <input
                    type="text"
                    className="comfy-input"
                    placeholder="Penjelasan singkat alur kategori ini..."
                    value={catFormData.description}
                    onChange={(e) => setCatFormData({ ...catFormData, description: e.target.value })}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="submit"
                    className="comfy-modal-submit"
                    disabled={isSavingCategory}
                  >
                    {editingCatId ? "Simpan Perubahan Kategori" : "+ Tambah Kategori"}
                  </button>
                </div>
              </form>

              {/* Categories Table */}
              <div className="comfy-cat-table-wrap">
                <div className="comfy-cat-table-head">
                  <span>Daftar Kategori Terdaftar ({categories.length})</span>
                </div>
                <div className="comfy-cat-table-scroll">
                  <table className="comfy-cat-table">
                    <thead>
                      <tr>
                        <th style={{ width: "30%" }}>Nama</th>
                        <th style={{ width: "25%" }}>Slug</th>
                        <th style={{ width: "30%" }}>Deskripsi</th>
                        <th style={{ width: "15%", textAlign: "right" }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((c) => (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 600, color: "#f4f4f5" }}>{c.name}</td>
                          <td className="font-mono text-blue-400">{c.slug}</td>
                          <td style={{ color: "#a1a1aa" }}>{c.description || "-"}</td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                              <button
                                type="button"
                                onClick={() => handleOpenCatEdit(c)}
                                className="comfy-table-btn"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setCatToDelete(c)}
                                className="comfy-table-btn danger"
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

      {/* Delete Category Confirmation Modal */}
      {catToDelete && (
        <div className="comfy-modal-backdrop" onClick={() => setCatToDelete(null)}>
          <div className="comfy-modal-surface compact" onClick={(e) => e.stopPropagation()}>
            <div className="comfy-modal-head">
              <div className="comfy-modal-head-title">
                <h3 className="text-red-400">Hapus Kategori?</h3>
              </div>
              <button
                type="button"
                className="comfy-modal-x"
                onClick={() => setCatToDelete(null)}
              >
                ✕
              </button>
            </div>
            <div className="comfy-modal-content">
              <p style={{ margin: 0, fontSize: "13px", color: "#e4e4e7" }}>
                Yakin ingin menghapus kategori <strong>"{catToDelete.name}"</strong>?
              </p>
            </div>
            <div className="comfy-modal-foot">
              <button
                type="button"
                className="comfy-modal-cancel"
                onClick={() => setCatToDelete(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="comfy-modal-danger"
                onClick={() => handleDeleteCategory(catToDelete)}
              >
                Hapus Kategori
              </button>
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
}
