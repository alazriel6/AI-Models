import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { getModels } from "../../api/models";
import type { Model } from "../../api/models";
import {
    createModelApi,
    updateModelApi,
    deleteModelApi,
} from "../../api/admin";
import type { CreateModelPayload } from "../../api/admin";
import { useAdminAuth } from "./AdminAuth";
import { AdminGateModal } from "./AdminGateModal";
import { ModelFormModal } from "./ModelFormModal";
import { ModelImagesModal } from "./ModelImagesModal";
import { GalleryManager } from "./GalleryManager";
import "./admin.css";

interface ToastNotification {
    id: number;
    type: "success" | "error" | "info";
    message: string;
}

export const AdminDashboard: React.FC = () => {
    const { isAdmin, logout, updatePasscode } = useAdminAuth();

    // Active Admin Section Tab
    const [adminTab, setAdminTab] = useState<"models" | "gallery">("models");

    // Data state
    const [models, setModels] = useState<Model[]>([]);
    const [loading, setLoading] = useState(true);
    const [backendOnline, setBackendOnline] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Filters and search
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [baseModelFilter, setBaseModelFilter] = useState<string>("all");

    // Modal state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedModel, setSelectedModel] = useState<Model | null>(null);

    // Image Management modal state
    const [isImagesModalOpen, setIsImagesModalOpen] = useState(false);
    const [selectedModelForImages, setSelectedModelForImages] = useState<Model | null>(null);

    // Delete confirmation state
    const [modelToDelete, setModelToDelete] = useState<Model | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Passcode change modal state
    const [isChangePasscodeOpen, setIsChangePasscodeOpen] = useState(false);
    const [oldPass, setOldPass] = useState("");
    const [newPass, setNewPass] = useState("");
    const [passcodeError, setPasscodeError] = useState("");

    // Toasts
    const [toasts, setToasts] = useState<ToastNotification[]>([]);

    const addToast = (type: "success" | "error" | "info", message: string) => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    };

    // Load models directly from backend database
    const fetchModelList = async () => {
        try {
            setLoading(true);
            setErrorMessage(null);
            const res = await getModels({ limit: 100 });
            if (res && res.data && Array.isArray(res.data)) {
                setModels(res.data);
                setBackendOnline(true);
            } else {
                setModels([]);
                setBackendOnline(true);
            }
        } catch (error: any) {
            console.error("Backend API not reachable:", error);
            setBackendOnline(false);
            setModels([]);
            setErrorMessage(error?.message || "Tidak dapat terhubung ke server backend (http://localhost:8080/api/models). Pastikan server backend sedang berjalan.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            fetchModelList();
        }
    }, [isAdmin]);

    // Handle Create or Update Model directly in backend DB
    const handleFormSubmit = async (payload: CreateModelPayload, modelId?: number) => {
        if (modelId) {
            // EDIT / UPDATE
            try {
                await updateModelApi(modelId, payload);
                addToast("success", `Model "${payload.name}" berhasil diperbarui di database!`);
                await fetchModelList();
            } catch (err: any) {
                console.error("Update failed:", err);
                addToast("error", `Gagal memperbarui model: ${err?.message || "Kesalahan server"}`);
                throw err;
            }
        } else {
            // CREATE
            try {
                await createModelApi(payload);
                addToast("success", `Model "${payload.name}" berhasil ditambahkan ke database!`);
                await fetchModelList();
            } catch (err: any) {
                console.error("Create failed:", err);
                addToast("error", `Gagal menyimpan model baru: ${err?.message || "Kesalahan server"}`);
                throw err;
            }
        }
    };

    // Handle Delete directly in backend DB
    const handleConfirmDelete = async () => {
        if (!modelToDelete) return;
        try {
            setIsDeleting(true);
            await deleteModelApi(modelToDelete.id);
            addToast("success", `Model "${modelToDelete.name}" berhasil dihapus dari database.`);
            setModelToDelete(null);
            await fetchModelList();
        } catch (err: any) {
            console.error("Delete failed:", err);
            addToast("error", `Gagal menghapus data: ${err?.message || "Kesalahan server"}`);
        } finally {
            setIsDeleting(false);
        }
    };

    // Handle Passcode Change
    const handleChangePasscode = (e: React.FormEvent) => {
        e.preventDefault();
        const ok = updatePasscode(oldPass, newPass);
        if (ok) {
            addToast("success", "Passcode admin berhasil diperbarui!");
            setIsChangePasscodeOpen(false);
            setOldPass("");
            setNewPass("");
            setPasscodeError("");
        } else {
            setPasscodeError("Passcode lama salah atau passcode baru kurang dari 4 karakter.");
        }
    };

    // Filtered models
    const filteredModels = useMemo(() => {
        return models.filter((m) => {
            const matchesSearch =
                m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (m.author && m.author.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (m.slug && m.slug.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesType = typeFilter === "all" || m.type.toLowerCase() === typeFilter.toLowerCase();
            const matchesBase = baseModelFilter === "all" || m.base_model.toLowerCase() === baseModelFilter.toLowerCase();

            return matchesSearch && matchesType && matchesBase;
        });
    }, [models, searchQuery, typeFilter, baseModelFilter]);

    // Unique base models for select dropdown
    const baseModelOptions = useMemo(() => {
        const set = new Set<string>();
        models.forEach((m) => {
            if (m.base_model) set.add(m.base_model);
        });
        return Array.from(set);
    }, [models]);

    // Summary statistics
    const stats = useMemo(() => {
        const checkpoints = models.filter((m) => m.type.toLowerCase() === "checkpoint").length;
        const loras = models.filter((m) => m.type.toLowerCase() === "lora").length;
        return {
            total: models.length,
            checkpoints,
            loras,
            other: models.length - (checkpoints + loras),
        };
    }, [models]);

    // If not logged in as Admin, show access gate
    if (!isAdmin) {
        return (
            <div className="admin-container">
                <AdminGateModal onSuccess={() => addToast("info", "Selamat datang di Panel Admin!")} />
            </div>
        );
    }

    return (
        <div className="admin-container">
            {/* Header */}
            <div className="admin-header">
                <div className="admin-title-area">
                    <div className="admin-badge-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                            <line x1="6" y1="6" x2="6.01" y2="6"></line>
                            <line x1="6" y1="18" x2="6.01" y2="18"></line>
                        </svg>
                    </div>
                    <div>
                        <h1>
                            Model Management Console
                            <span className="admin-mode-pill">Admin</span>
                        </h1>
                        <div style={{ fontSize: "11px", color: "#666C75", marginTop: "2px" }}>
                            Manage checkpoint definitions, LoRA adapters, hardware specs, and generation presets.
                        </div>
                    </div>
                </div>

                <div className="admin-header-actions">
                    <div className={`backend-status-badge ${backendOnline ? "online" : "offline"}`}>
                        <span className="status-dot"></span>
                        {backendOnline ? "API :8080 ONLINE" : "API OFFLINE"}
                    </div>

                    <button
                        className="btn-secondary-admin"
                        onClick={() => setIsChangePasscodeOpen(true)}
                        title="Change Passcode PIN"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 2l-2 2m-1.5 1.5L16 7l-4 4-2-2-4 4 2 2-4 4 2 2 4-4 2 2 4-4-1.5-1.5z"></path>
                            <circle cx="16.5" cy="7.5" r="2.5"></circle>
                        </svg>
                        Change PIN
                    </button>

                    <button className="btn-secondary-admin" onClick={logout} title="Lock Admin Panel">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        Logout
                    </button>
                </div>
            </div>

            {/* Developer Metric Ribbon */}
            <div className="admin-metric-ribbon">
                <div className="admin-metric-item">
                    <span className="metric-label">Total Models</span>
                    <span className="metric-value">{stats.total}</span>
                </div>
                <div className="admin-metric-divider" />
                <div className="admin-metric-item">
                    <span className="metric-label">Checkpoints</span>
                    <span className="metric-value">{stats.checkpoints}</span>
                </div>
                <div className="admin-metric-divider" />
                <div className="admin-metric-item">
                    <span className="metric-label">LoRA Adapters</span>
                    <span className="metric-value">{stats.loras}</span>
                </div>
                <div className="admin-metric-divider" />
                <div className="admin-metric-item">
                    <span className="metric-label">VAE & Components</span>
                    <span className="metric-value">{stats.other}</span>
                </div>
                <div className="admin-metric-divider" />
                <div className="admin-metric-item">
                    <span className="metric-label">Database</span>
                    <span className="metric-value" style={{ color: backendOnline ? "#4ADE80" : "#EF4444", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: backendOnline ? "#4ADE80" : "#EF4444" }} />
                        {backendOnline ? "PostgreSQL Connected" : "Service Offline"}
                    </span>
                </div>
            </div>

            {/* Backend Offline Banner */}
            {!backendOnline && (
                <div className="admin-alert-banner">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        <div>
                            <div className="alert-title">Backend Service Unavailable</div>
                            <div className="alert-desc">
                                {errorMessage || "Cannot reach API at http://localhost:8080. Ensure the Go backend service is running."}
                            </div>
                        </div>
                    </div>
                    <button
                        className="btn-secondary-admin"
                        onClick={fetchModelList}
                        disabled={loading}
                        style={{ whiteSpace: "nowrap" }}
                    >
                        Retry Connection
                    </button>
                </div>
            )}

            {/* Section Navigation Tabs */}
            <div className="admin-nav-tabs">
                <button
                    type="button"
                    className={`admin-nav-tab ${adminTab === "models" ? "active" : ""}`}
                    onClick={() => setAdminTab("models")}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                        <polyline points="2 17 12 22 22 17"></polyline>
                        <polyline points="2 12 12 17 22 12"></polyline>
                    </svg>
                    <span>Models Catalog</span>
                    <span className="tab-badge">{models.length}</span>
                </button>

                <button
                    type="button"
                    className={`admin-nav-tab ${adminTab === "gallery" ? "active" : ""}`}
                    onClick={() => setAdminTab("gallery")}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    <span>Showcase Gallery</span>
                    <span className="tab-badge">Images CRUD</span>
                </button>
            </div>

            {adminTab === "models" ? (
                <>
                    {/* Toolbar: Search, Filters & Add Button */}
                    <div className="admin-toolbar">
                        <div className="admin-toolbar-left">
                            <div className="admin-search-wrapper">
                        <span className="admin-search-icon">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        </span>
                        <input
                            type="text"
                            className="admin-search-input"
                            placeholder="Filter by name, author, or slug..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="admin-filter-group">
                        <button
                            className={`admin-filter-btn ${typeFilter === "all" ? "active" : ""}`}
                            onClick={() => setTypeFilter("all")}
                        >
                            All
                        </button>
                        <button
                            className={`admin-filter-btn ${typeFilter === "checkpoint" ? "active" : ""}`}
                            onClick={() => setTypeFilter("checkpoint")}
                        >
                            Checkpoint
                        </button>
                        <button
                            className={`admin-filter-btn ${typeFilter === "lora" ? "active" : ""}`}
                            onClick={() => setTypeFilter("lora")}
                        >
                            LoRA
                        </button>
                    </div>

                    {baseModelOptions.length > 0 && (
                        <select
                            className="admin-select"
                            value={baseModelFilter}
                            onChange={(e) => setBaseModelFilter(e.target.value)}
                        >
                            <option value="all">All Architectures</option>
                            {baseModelOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="admin-toolbar-right">
                    <button
                        className="btn-primary-admin"
                        onClick={() => {
                            setSelectedModel(null);
                            setIsFormOpen(true);
                        }}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        New Model
                    </button>
                </div>
            </div>

            {/* Models Table */}
            <div className="admin-table-container">
                {loading ? (
                    <div className="admin-empty-state">
                        <div className="admin-empty-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                        </div>
                        <div>Loading database records...</div>
                    </div>
                ) : filteredModels.length === 0 ? (
                    <div className="admin-empty-state">
                        <div className="admin-empty-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                            </svg>
                        </div>
                        <div style={{ fontWeight: 600, color: "#E6E8EB", marginBottom: "4px", fontSize: "14px" }}>
                            No models found
                        </div>
                        <p style={{ fontSize: "12px", color: "#666C75", margin: 0 }}>
                            Try adjusting your filters or click "+ New Model" to create an entry.
                        </p>
                    </div>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Model & Identification</th>
                                <th>Type</th>
                                <th>Architecture</th>
                                <th>Author</th>
                                <th>Hardware / VRAM</th>
                                <th style={{ textAlign: "right" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredModels.map((item) => (
                                <tr key={item.id}>
                                    <td>
                                        <div className="admin-model-cell">
                                            {item.thumbnail_url ? (
                                                <img
                                                    src={item.thumbnail_url}
                                                    alt={item.name}
                                                    className="admin-thumb"
                                                    onError={(e) => {
                                                        (e.currentTarget as HTMLImageElement).src =
                                                            "https://placehold.co/48x48?text=AI";
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    className="admin-thumb-empty"
                                                    title="No thumbnail assigned"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                        <polyline points="21 15 16 10 5 21"></polyline>
                                                    </svg>
                                                </div>
                                            )}
                                            <div>
                                                <span className="admin-model-title">{item.name}</span>
                                                <span className="admin-model-slug">/{item.slug}</span>
                                            </div>
                                        </div>
                                    </td>

                                    <td>
                                        <span className={`pill-type ${item.type.toLowerCase()}`}>
                                            {item.type}
                                        </span>
                                    </td>

                                    <td>
                                        <span className="pill-base">{item.base_model}</span>
                                    </td>

                                    <td style={{ color: "#E6E8EB" }}>
                                        {item.author || "—"}
                                    </td>

                                    <td>
                                        <div style={{ fontSize: "12px", color: "#E6E8EB", fontFamily: "monospace" }}>
                                            {item.tensor_size || "—"}
                                        </div>
                                        <div style={{ fontSize: "11px", color: "#666C75", fontFamily: "monospace" }}>
                                            Min: {item.vram_min || "—"}
                                        </div>
                                    </td>

                                    <td>
                                        <div className="table-action-btns">
                                            <button
                                                className="btn-icon-admin"
                                                title="Manage Sample Images & Generation Metadata"
                                                onClick={() => {
                                                    setSelectedModelForImages(item);
                                                    setIsImagesModalOpen(true);
                                                }}
                                            >
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                    <polyline points="21 15 16 10 5 21"></polyline>
                                                </svg>
                                            </button>
                                            <Link
                                                to={`/models?model=${item.slug}`}
                                                className="btn-icon-admin"
                                                title="View in Public Catalog"
                                            >
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                                    <polyline points="15 3 21 3 21 9"></polyline>
                                                    <line x1="10" y1="14" x2="21" y2="3"></line>
                                                </svg>
                                            </Link>
                                            <button
                                                className="btn-icon-admin"
                                                title="Edit Model Definition"
                                                onClick={() => {
                                                    setSelectedModel(item);
                                                    setIsFormOpen(true);
                                                }}
                                            >
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                                </svg>
                                            </button>
                                            <button
                                                className="btn-icon-admin danger"
                                                title="Delete Model"
                                                onClick={() => setModelToDelete(item)}
                                            >
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6"></polyline>
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            </>
            ) : (
                <GalleryManager availableModels={models} onToast={addToast} />
            )}

            {/* Create / Edit Modal */}
            {isFormOpen && (
                <ModelFormModal
                    key={selectedModel ? selectedModel.id : "new-model"}
                    isOpen={isFormOpen}
                    onClose={() => {
                        setIsFormOpen(false);
                        setSelectedModel(null);
                    }}
                    onSubmit={handleFormSubmit}
                    initialData={selectedModel}
                />
            )}

            {/* Manage Model Images Modal */}
            {isImagesModalOpen && selectedModelForImages && (
                <ModelImagesModal
                    isOpen={isImagesModalOpen}
                    onClose={() => {
                        setIsImagesModalOpen(false);
                        setSelectedModelForImages(null);
                    }}
                    model={selectedModelForImages}
                    onImagesUpdated={fetchModelList}
                />
            )}

            {/* Delete Confirmation Modal */}
            {modelToDelete && (
                <div className="admin-modal-backdrop" onClick={() => setModelToDelete(null)}>
                    <div
                        className="admin-modal-content"
                        style={{ maxWidth: "440px" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="admin-modal-header">
                            <h2 className="admin-modal-title" style={{ color: "#EF4444" }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                Confirm Model Deletion
                            </h2>
                            <button className="admin-modal-close" onClick={() => setModelToDelete(null)}>
                                ✕
                            </button>
                        </div>
                        <div className="admin-modal-body" style={{ padding: "20px" }}>
                            <p style={{ color: "#E6E8EB", fontWeight: 600, fontSize: "14px", margin: "0 0 8px 0" }}>
                                Delete model "{modelToDelete.name}"?
                            </p>
                            <p style={{ color: "#9A9FA8", fontSize: "12px", lineHeight: "1.5", margin: 0 }}>
                                This will permanently remove the model record, versions, triggers, and associated generation sample images from the database. This action cannot be undone.
                            </p>
                        </div>
                        <div className="admin-modal-footer">
                            <button
                                type="button"
                                className="btn-secondary-admin"
                                onClick={() => setModelToDelete(null)}
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-danger-admin"
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? "Deleting..." : "Delete Model"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Passcode Modal */}
            {isChangePasscodeOpen && (
                <div className="admin-modal-backdrop" onClick={() => setIsChangePasscodeOpen(false)}>
                    <div
                        className="admin-modal-content"
                        style={{ maxWidth: "380px" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="admin-modal-header">
                            <h2 className="admin-modal-title">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 2l-2 2m-1.5 1.5L16 7l-4 4-2-2-4 4 2 2-4 4 2 2 4-4 2 2 4-4-1.5-1.5z"></path>
                                    <circle cx="16.5" cy="7.5" r="2.5"></circle>
                                </svg>
                                Change Admin Passcode
                            </h2>
                            <button className="admin-modal-close" onClick={() => setIsChangePasscodeOpen(false)}>
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleChangePasscode}>
                            <div className="admin-modal-body">
                                <div className="form-group">
                                    <label className="form-label">Current Passcode</label>
                                    <input
                                        type="password"
                                        className="form-input mono"
                                        placeholder="Enter current passcode..."
                                        value={oldPass}
                                        onChange={(e) => setOldPass(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">New Passcode (min 4 chars)</label>
                                    <input
                                        type="password"
                                        className="form-input mono"
                                        placeholder="Enter new passcode..."
                                        value={newPass}
                                        onChange={(e) => setNewPass(e.target.value)}
                                        required
                                    />
                                </div>
                                {passcodeError && (
                                    <div style={{ color: "#EF4444", fontSize: "11px", marginTop: "8px" }}>
                                        {passcodeError}
                                    </div>
                                )}
                            </div>
                            <div className="admin-modal-footer">
                                <button
                                    type="button"
                                    className="btn-secondary-admin"
                                    onClick={() => setIsChangePasscodeOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary-admin">
                                    Update Passcode
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast Notifications */}
            <div className="admin-toast-container">
                {toasts.map((t) => (
                    <div key={t.id} className={`admin-toast ${t.type}`}>
                        <span>{t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"}</span>
                        <span>{t.message}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminDashboard;
