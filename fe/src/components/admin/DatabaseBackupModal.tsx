import React, { useState, useRef } from "react";
import { exportDatabaseBackupApi, importDatabaseBackupApi, type DatabaseBackupPayload } from "../../api/admin";

interface DatabaseBackupModalProps {
    isOpen: boolean;
    onClose: () => void;
    totalModels: number;
    onSuccess: () => void;
    onToast: (type: "success" | "error" | "info", message: string) => void;
}

const Icons = {
    Database: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
        </svg>
    ),
    Download: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
    ),
    Upload: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 16 12 12 8 16"></polyline>
            <line x1="12" y1="12" x2="12" y2="21"></line>
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path>
        </svg>
    ),
    FileJson: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
    ),
    Info: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}>
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
    ),
    Check: () => (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
    ),
};

export const DatabaseBackupModal: React.FC<DatabaseBackupModalProps> = ({
    isOpen,
    onClose,
    totalModels,
    onSuccess,
    onToast,
}) => {
    const [activeTab, setActiveTab] = useState<"export" | "import">("export");

    // Export state
    const [isExporting, setIsExporting] = useState(false);

    // Import state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreviewData, setFilePreviewData] = useState<DatabaseBackupPayload | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const [importMode, setImportMode] = useState<"merge" | "overwrite">("merge");
    const [isImporting, setIsImporting] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    if (!isOpen) return null;

    const handleDownloadBackup = async () => {
        try {
            setIsExporting(true);
            const data = await exportDatabaseBackupApi();
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
            const downloadAnchor = document.createElement("a");
            const dateStr = new Date().toISOString().slice(0, 10);
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `models_guide_backup_${dateStr}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();

            onToast("success", `Backup exported successfully (${data.total_models} models, ${data.total_images} images, ${data.total_tags} tags).`);
        } catch (err: any) {
            console.error("Backup export failed:", err);
            onToast("error", err?.message || "Failed to export database backup.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleFileSelected = (file: File) => {
        setSelectedFile(file);
        setFileError(null);
        setFilePreviewData(null);

        if (!file.name.endsWith(".json")) {
            setFileError("Invalid file type. File must be JSON (.json).");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const parsed = JSON.parse(text);
                if (!parsed.models && !parsed.images) {
                    setFileError("Unrecognized structure. JSON file is missing models or images payload.");
                    return;
                }
                setFilePreviewData(parsed);
            } catch (err) {
                setFileError("Malformed JSON. Unable to parse file contents.");
            }
        };
        reader.readAsText(file);
    };

    const handleConfirmImport = async () => {
        if (!selectedFile) return;

        try {
            setIsImporting(true);
            const res = await importDatabaseBackupApi(selectedFile, importMode);
            onToast("success", res.message || "Database restored successfully!");
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Backup import failed:", err);
            onToast("error", err?.message || "Failed to restore database from backup.");
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="admin-modal-backdrop" onClick={isImporting ? undefined : onClose}>
            <div
                className="admin-modal-content"
                style={{ maxWidth: "620px", padding: 0, overflow: "hidden" }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="admin-modal-header" style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                            style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "6px",
                                background: "rgba(99, 102, 241, 0.12)",
                                border: "1px solid rgba(129, 140, 248, 0.25)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#818CF8",
                            }}
                        >
                            <Icons.Database />
                        </div>
                        <div>
                            <h2 className="admin-modal-title" style={{ fontSize: "15px" }}>
                                Database Backup & Portability
                            </h2>
                            <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#8E95A2" }}>
                                Full JSON snapshot for catalog models, gallery artworks, tags, and parameters.
                            </p>
                        </div>
                    </div>
                    <button className="admin-modal-close" onClick={isImporting ? undefined : onClose}>✕</button>
                </div>

                {/* Tab Switcher */}
                <div className="backup-nav-tabs">
                    <button
                        type="button"
                        className={`backup-nav-tab ${activeTab === "export" ? "active" : ""}`}
                        onClick={() => setActiveTab("export")}
                    >
                        <Icons.Download />
                        <span>Export Backup (JSON)</span>
                    </button>
                    <button
                        type="button"
                        className={`backup-nav-tab ${activeTab === "import" ? "active" : ""}`}
                        onClick={() => setActiveTab("import")}
                    >
                        <Icons.Upload />
                        <span>Restore / Import Data</span>
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: "20px" }}>
                    {activeTab === "export" ? (
                        <div>
                            <div style={{ fontSize: "13px", color: "#E6E8EB", marginBottom: "14px", lineHeight: "1.5" }}>
                                Create an immutable snapshot containing all models, versions, trigger words, generation metadata, gallery images, and tag relationships.
                            </div>

                            {/* Summary Metrics */}
                            <div className="backup-stat-grid">
                                <div className="backup-stat-card">
                                    <div className="backup-stat-label">Model Records</div>
                                    <div className="backup-stat-value">{totalModels}</div>
                                    <div className="backup-stat-sub">Indexed Checkpoints & LoRAs</div>
                                </div>
                                <div className="backup-stat-card">
                                    <div className="backup-stat-label">Schema Format</div>
                                    <div className="backup-stat-value" style={{ fontSize: "14px", color: "#4ADE80" }}>
                                        v1.0 Standard
                                    </div>
                                    <div className="backup-stat-sub">Strict GORM DB Relational</div>
                                </div>
                                <div className="backup-stat-card">
                                    <div className="backup-stat-label">Auth Security</div>
                                    <div className="backup-stat-value" style={{ fontSize: "14px", color: "#C7D2FE" }}>
                                        Admin Signed
                                    </div>
                                    <div className="backup-stat-sub">Passcode Protected Export</div>
                                </div>
                            </div>

                            {/* Notice Callout */}
                            <div className="backup-info-callout">
                                <Icons.Info />
                                <div>
                                    Backup snapshots are self-contained and portable. Store safely offsite or use to migrate environments without data loss.
                                </div>
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                                <button
                                    type="button"
                                    className="btn-secondary-admin"
                                    onClick={onClose}
                                >
                                    Close
                                </button>
                                <button
                                    type="button"
                                    className="btn-primary-admin"
                                    onClick={handleDownloadBackup}
                                    disabled={isExporting}
                                >
                                    <Icons.Download />
                                    <span>{isExporting ? "Generating Snapshot..." : "Download JSON Backup"}</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div style={{ fontSize: "13px", color: "#E6E8EB", marginBottom: "14px", lineHeight: "1.5" }}>
                                Restore models and artwork collections from a previously exported <code>.json</code> database snapshot.
                            </div>

                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json,application/json"
                                style={{ display: "none" }}
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        handleFileSelected(e.target.files[0]);
                                    }
                                }}
                            />

                            {/* Dropzone */}
                            <div
                                className={`backup-dropzone ${isDragOver ? "dragging" : ""}`}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDragOver(true);
                                }}
                                onDragLeave={() => setIsDragOver(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDragOver(false);
                                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                        handleFileSelected(e.dataTransfer.files[0]);
                                    }
                                }}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="backup-dropzone-icon">
                                    <Icons.FileJson />
                                </div>
                                <div style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF", marginBottom: "4px" }}>
                                    {selectedFile ? selectedFile.name : "Select or drag backup JSON file"}
                                </div>
                                <div style={{ fontSize: "11px", color: "#71717A" }}>
                                    {selectedFile
                                        ? `${(selectedFile.size / 1024).toFixed(1)} KB • Click to choose another file`
                                        : "Accepts standard models_guide_backup_*.json"}
                                </div>
                            </div>

                            {/* Error Callout */}
                            {fileError && (
                                <div style={{ padding: "8px 12px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "5px", color: "#F87171", fontSize: "12px", marginBottom: "14px" }}>
                                    {fileError}
                                </div>
                            )}

                            {/* File Preview Inspection */}
                            {filePreviewData && (
                                <div className="backup-preview-box">
                                    <div className="backup-preview-header">
                                        <span>Validated Snapshot Schema</span>
                                        {filePreviewData.exported_at && (
                                            <span style={{ fontSize: "10px", color: "#71717A", textTransform: "none" }}>
                                                {new Date(filePreviewData.exported_at).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                    <div className="backup-preview-grid">
                                        <div>
                                            <span style={{ color: "#71717A" }}>Models: </span>
                                            <strong style={{ color: "#C7D2FE", fontFamily: "ui-monospace, monospace" }}>
                                                {filePreviewData.total_models || filePreviewData.models?.length || 0}
                                            </strong>
                                        </div>
                                        <div>
                                            <span style={{ color: "#71717A" }}>Artworks: </span>
                                            <strong style={{ color: "#C7D2FE", fontFamily: "ui-monospace, monospace" }}>
                                                {filePreviewData.total_images || filePreviewData.images?.length || 0}
                                            </strong>
                                        </div>
                                        <div>
                                            <span style={{ color: "#71717A" }}>Tags: </span>
                                            <strong style={{ color: "#C7D2FE", fontFamily: "ui-monospace, monospace" }}>
                                                {filePreviewData.total_tags || filePreviewData.tags?.length || 0}
                                            </strong>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Mode Selection Cards */}
                            <div style={{ marginBottom: "18px" }}>
                                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#71717A", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "8px" }}>
                                    Restore Strategy
                                </label>
                                <div className="backup-mode-selector">
                                    <div
                                        className={`backup-mode-card ${importMode === "merge" ? "active" : ""}`}
                                        onClick={() => setImportMode("merge")}
                                    >
                                        <div className="backup-mode-top">
                                            <span className="backup-mode-title">Non-Destructive Merge</span>
                                            <span className="backup-mode-badge safe">Safe</span>
                                        </div>
                                        <p className="backup-mode-desc">
                                            Upserts records safely without dropping unreferenced models or images.
                                        </p>
                                    </div>

                                    <div
                                        className={`backup-mode-card ${importMode === "overwrite" ? "active" : ""}`}
                                        onClick={() => setImportMode("overwrite")}
                                    >
                                        <div className="backup-mode-top">
                                            <span className="backup-mode-title">Clean Overwrite</span>
                                            <span className="backup-mode-badge destructive">Replace All</span>
                                        </div>
                                        <p className="backup-mode-desc">
                                            Truncates existing relations and restores the exact state from this snapshot.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                                <button
                                    type="button"
                                    className="btn-secondary-admin"
                                    onClick={onClose}
                                    disabled={isImporting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn-primary-admin"
                                    onClick={handleConfirmImport}
                                    disabled={isImporting || !filePreviewData}
                                >
                                    <Icons.Upload />
                                    <span>{isImporting ? "Restoring Database..." : "Execute Restore"}</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
