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
            <div className="admin-gate-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
            </div>
            <h2 className="admin-gate-title">Admin Restricted Access</h2>
            <p className="admin-gate-desc">
                Authorized management console for model checkpoints, LoRA configurations, and generation hyperparameters.
            </p>

            <form onSubmit={handleSubmit} className="admin-gate-form">
                <input
                    type="password"
                    className="admin-passcode-input mono"
                    placeholder="Enter admin passcode..."
                    value={passcode}
                    onChange={(e) => {
                        setPasscode(e.target.value);
                        if (error) setError(false);
                    }}
                    autoFocus
                />

                {error && (
                    <div style={{ color: "#EF4444", fontSize: "11px", marginTop: "2px" }}>
                        Invalid passcode. Access denied.
                    </div>
                )}

                <button type="submit" className="btn-primary-admin" style={{ justifyContent: "center" }}>
                    Authenticate Access
                </button>

                <div style={{ marginTop: "12px" }}>
                    <button
                        type="button"
                        onClick={() => setShowHint(!showHint)}
                        style={{ background: "none", border: "none", color: "#666C75", fontSize: "11px", cursor: "pointer", textDecoration: "underline" }}
                    >
                        {showHint ? "Hide default PIN hint" : "Show default PIN hint"}
                    </button>
                    {showHint && (
                        <div style={{ fontSize: "11px", color: "#22C55E", marginTop: "6px", background: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.2)", padding: "6px 10px", borderRadius: "4px" }}>
                            Default PIN: <code style={{ fontFamily: "monospace", fontWeight: "bold" }}>admin123</code> (configurable in dashboard)
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
};
