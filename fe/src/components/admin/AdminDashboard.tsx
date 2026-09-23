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
import "./admin.css";

interface ToastNotification {
    id: number;
    type: "success" | "error" | "info";
    message: string;
}

export const AdminDashboard: React.FC = () => {
    const { isAdmin, logout, updatePasscode } = useAdminAuth();

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
                    <div className="admin-badge-icon">🛡️</div>
                    <div>
                        <h1>
                            Database Admin Panel
                            <span className="admin-mode-pill">Admin Mode Active</span>
                        </h1>
                        <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                            Kelola model checkpoints, LoRA, tags, dan parameter generasi AI.
                        </div>
                    </div>
                </div>

                <div className="admin-header-actions">
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "12px",
                            color: backendOnline ? "var(--teal)" : "var(--orange)",
                            background: backendOnline ? "rgba(32, 201, 151, 0.1)" : "rgba(255, 146, 43, 0.1)",
                            padding: "6px 10px",
                            borderRadius: "6px",
                            border: `1px solid ${backendOnline ? "rgba(32, 201, 151, 0.25)" : "rgba(255, 146, 43, 0.25)"}`,
                        }}
                    >
                        <span style={{ fontSize: "8px" }}>●</span>
                        {backendOnline ? "Backend Connected (Port 8080)" : "Backend Disconnected"}
                    </div>

                    <button
                        className="btn-secondary-admin"
                        onClick={() => setIsChangePasscodeOpen(true)}
                        title="Ubah PIN Passcode"
                    >
                        🔑 Ganti PIN
                    </button>

                    <button className="btn-secondary-admin" onClick={logout} title="Kunci Admin Panel">
                        🔒 Logout
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="admin-stats-grid">
                <div className="admin-stat-card">
                    <div className="admin-stat-info">
                        <div className="stat-label">Total Model</div>
                        <div className="stat-value">{stats.total}</div>
                    </div>
                    <div className="admin-stat-icon blue">📦</div>
                </div>

                <div className="admin-stat-card">
                    <div className="admin-stat-info">
                        <div className="stat-label">Checkpoints</div>
                        <div className="stat-value">{stats.checkpoints}</div>
                    </div>
                    <div className="admin-stat-icon teal">⚡</div>
                </div>

                <div className="admin-stat-card">
                    <div className="admin-stat-info">
                        <div className="stat-label">LoRA Adapters</div>
                        <div className="stat-value">{stats.loras}</div>
                    </div>
                    <div className="admin-stat-icon orange">🎨</div>
                </div>

                <div className="admin-stat-card">
                    <div className="admin-stat-info">
                        <div className="stat-label">Lainnya / VAE</div>
                        <div className="stat-value">{stats.other}</div>
                    </div>
                    <div className="admin-stat-icon purple">🧩</div>
                </div>
            </div>

            {/* Backend Offline / Error Banner */}
            {!backendOnline && (
                <div style={{
                    background: "rgba(255, 107, 107, 0.12)",
                    border: "1px solid rgba(255, 107, 107, 0.35)",
                    borderRadius: "8px",
                    padding: "14px 18px",
                    marginBottom: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "20px" }}>⚠️</span>
                        <div>
                            <div style={{ fontWeight: 600, color: "#ff6b6b", fontSize: "14px" }}>
                                Backend Server Tidak Terhubung
                            </div>
                            <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                                {errorMessage || "Tidak dapat menghubungi API di http://localhost:8080. Pastikan server Go berjalan."}
                            </div>
                        </div>
                    </div>
                    <button
                        className="btn-secondary-admin"
                        onClick={fetchModelList}
                        disabled={loading}
                        style={{ whiteSpace: "nowrap" }}
                    >
                        🔄 Coba Lagi
                    </button>
                </div>
            )}

            {/* Toolbar: Search, Filters & Add Button */}
            <div className="admin-toolbar">
                <div className="admin-toolbar-left">
                    <div className="admin-search-wrapper">
                        <span className="admin-search-icon">🔍</span>
                        <input
                            type="text"
                            className="admin-search-input"
                            placeholder="Cari model, author, atau slug..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="admin-filter-group">
                        <button
                            className={`admin-filter-btn ${typeFilter === "all" ? "active" : ""}`}
                            onClick={() => setTypeFilter("all")}
                        >
                            Semua
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
                            <option value="all">Semua Base Arch</option>
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
                        <span>+</span> Tambah Model Baru
                    </button>
                </div>
            </div>

            {/* Models Table */}
            <div className="admin-table-container">
                {loading ? (
                    <div className="admin-empty-state">
                        <div className="admin-empty-icon">⏳</div>
                        <div>Memuat data database...</div>
                    </div>
                ) : filteredModels.length === 0 ? (
                    <div className="admin-empty-state">
                        <div className="admin-empty-icon">📂</div>
                        <div style={{ fontWeight: 600, color: "var(--heading)", marginBottom: "6px" }}>
                            Tidak ada model yang cocok
                        </div>
                        <p style={{ fontSize: "12px" }}>
                            Coba ubah kata kunci pencarian atau klik "+ Tambah Model Baru" untuk membuat entri database.
                        </p>
                    </div>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Model & Info</th>
                                <th>Tipe</th>
                                <th>Base Model</th>
                                <th>Author</th>
                                <th>Specs / VRAM</th>
                                <th style={{ textAlign: "right" }}>Aksi</th>
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
                                                    title="Belum ada gambar (Thumbnail kosong)"
                                                >
                                                    🖼️
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

                                    <td style={{ color: "var(--heading)" }}>
                                        {item.author || "—"}
                                    </td>

                                    <td>
                                        <div style={{ fontSize: "12px", color: "var(--text)" }}>
                                            {item.tensor_size || "—"}
                                        </div>
                                        <div style={{ fontSize: "11px", color: "var(--subtle)" }}>
                                            Min: {item.vram_min || "—"}
                                        </div>
                                    </td>

                                    <td>
                                        <div className="table-action-btns">
                                            <button
                                                className="btn-icon-admin image-action-btn"
                                                title="Kelola Sampel Gambar & Detail Generasi"
                                                onClick={() => {
                                                    setSelectedModelForImages(item);
                                                    setIsImagesModalOpen(true);
                                                }}
                                            >
                                                🖼️
                                            </button>
                                            <Link
                                                to={`/models?model=${item.slug}`}
                                                className="btn-icon-admin"
                                                title="Lihat di Galeri Publik"
                                            >
                                                👁️
                                            </Link>
                                            <button
                                                className="btn-icon-admin"
                                                title="Edit Model"
                                                onClick={() => {
                                                    setSelectedModel(item);
                                                    setIsFormOpen(true);
                                                }}
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className="btn-icon-admin danger"
                                                title="Hapus Model"
                                                onClick={() => setModelToDelete(item)}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

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
                        style={{ maxWidth: "480px" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="admin-modal-header">
                            <h2 className="admin-modal-title" style={{ color: "#ff6b6b" }}>
                                ⚠️ Konfirmasi Hapus Data
                            </h2>
                            <button className="admin-modal-close" onClick={() => setModelToDelete(null)}>
                                ✕
                            </button>
                        </div>
                        <div className="admin-modal-body" style={{ textAlign: "center", padding: "28px 24px" }}>
                            <div style={{ fontSize: "36px", marginBottom: "12px" }}>🗑️</div>
                            <p style={{ color: "var(--heading)", fontWeight: 600, fontSize: "15px", marginBottom: "8px" }}>
                                Hapus model "{modelToDelete.name}"?
                            </p>
                            <p style={{ color: "var(--muted)", fontSize: "12px", lineHeight: "1.5" }}>
                                Tindakan ini akan menghapus data model, rilis versi, dan parameter terkait dari database. Tindakan ini tidak dapat dibatalkan.
                            </p>
                        </div>
                        <div className="admin-modal-footer">
                            <button
                                type="button"
                                className="btn-secondary-admin"
                                onClick={() => setModelToDelete(null)}
                                disabled={isDeleting}
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                className="btn-danger-admin"
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? "Menghapus..." : "Ya, Hapus Data"}
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
                        style={{ maxWidth: "420px" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="admin-modal-header">
                            <h2 className="admin-modal-title">🔑 Ganti Passcode Admin</h2>
                            <button className="admin-modal-close" onClick={() => setIsChangePasscodeOpen(false)}>
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleChangePasscode}>
                            <div className="admin-modal-body">
                                <div className="form-group">
                                    <label className="form-label">Passcode Lama</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        placeholder="Masukkan passcode saat ini..."
                                        value={oldPass}
                                        onChange={(e) => setOldPass(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Passcode Baru (min 4 karakter)</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        placeholder="Masukkan passcode baru..."
                                        value={newPass}
                                        onChange={(e) => setNewPass(e.target.value)}
                                        required
                                    />
                                </div>
                                {passcodeError && (
                                    <div style={{ color: "#ff6b6b", fontSize: "12px", marginTop: "4px" }}>
                                        ⚠️ {passcodeError}
                                    </div>
                                )}
                            </div>
                            <div className="admin-modal-footer">
                                <button
                                    type="button"
                                    className="btn-secondary-admin"
                                    onClick={() => setIsChangePasscodeOpen(false)}
                                >
                                    Batal
                                </button>
                                <button type="submit" className="btn-primary-admin">
                                    Simpan Passcode
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
