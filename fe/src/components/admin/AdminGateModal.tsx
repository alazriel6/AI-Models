import React, { useState } from "react";
import { useAdminAuth } from "./AdminAuth";

interface AdminGateModalProps {
    onSuccess?: () => void;
}

export const AdminGateModal: React.FC<AdminGateModalProps> = ({ onSuccess }) => {
    const { login } = useAdminAuth();
    const [passcode, setPasscode] = useState("");
    const [error, setError] = useState(false);
    const [showHint, setShowHint] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const success = login(passcode);
        if (success) {
            setError(false);
            if (onSuccess) onSuccess();
        } else {
            setError(true);
        }
    };

    return (
        <div className="admin-gate-card">
            <div className="admin-gate-icon">🔐</div>
            <h2 className="admin-gate-title">Admin Restricted Area</h2>
            <p className="admin-gate-desc">
                Halaman ini khusus untuk administrator untuk mengelola database model, checkpoint, LoRA, versi, dan tags.
            </p>

            <form onSubmit={handleSubmit} className="admin-gate-form">
                <input
                    type="password"
                    className="admin-passcode-input"
                    placeholder="Masukkan Passcode Admin..."
                    value={passcode}
                    onChange={(e) => {
                        setPasscode(e.target.value);
                        if (error) setError(false);
                    }}
                    autoFocus
                />

                {error && (
                    <div style={{ color: "#ff6b6b", fontSize: "12px", marginTop: "2px" }}>
                        ⚠️ Passcode salah. Silakan coba lagi.
                    </div>
                )}

                <button type="submit" className="btn-primary-admin" style={{ justifyContent: "center" }}>
                    Buka Akses Admin
                </button>

                <div style={{ marginTop: "12px" }}>
                    <button
                        type="button"
                        onClick={() => setShowHint(!showHint)}
                        style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "11px", cursor: "pointer", textDecoration: "underline" }}
                    >
                        {showHint ? "Sembunyikan Petunjuk" : "Petunjuk Akses Default"}
                    </button>
                    {showHint && (
                        <div style={{ fontSize: "11px", color: "var(--teal)", marginTop: "6px", background: "rgba(32, 201, 151, 0.1)", padding: "6px 10px", borderRadius: "6px" }}>
                            Default PIN: <code>admin123</code> (dapat diubah nanti di dashboard)
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
};
