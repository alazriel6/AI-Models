import React, { useState, useMemo } from "react";
import {
    analyzePrompt,
    fixPrompt,
    PRESET_FIX_SCENARIOS,
    type FixOptions,
} from "../../utils/promptFixer";
import "../../style/PromptFixerModal.css";

interface PromptFixerModalProps {
    isOpen: boolean;
    onClose: () => void;
    positivePrompt: string;
    negativePrompt: string;
    onApplyFixed: (fixedPos: string, fixedNeg: string) => void;
    showToast: (msg: string) => void;
}

export const PromptFixerModal: React.FC<PromptFixerModalProps> = ({
    isOpen,
    onClose,
    positivePrompt,
    negativePrompt,
    onApplyFixed,
    showToast,
}) => {
    // Current working prompts in modal
    const [modalPositive, setModalPositive] = useState(positivePrompt);
    const [modalNegative, setModalNegative] = useState(negativePrompt);

    // Sync when opened
    React.useEffect(() => {
        if (isOpen) {
            setModalPositive(positivePrompt);
            setModalNegative(negativePrompt);
        }
    }, [isOpen, positivePrompt, negativePrompt]);

    // General Tuning Options
    const [options, setOptions] = useState<FixOptions>({
        compactQuality: true,
        frontloadCoreAction: true,
        resolvePoseConflicts: true,
        unbundleWeightGroups: true,
        normalizeDanbooruSyntax: true,
        decoupleSurfaceInteractions: true,
        guardNegativePrompt: true,
        strictChunk1: false,
    });

    const [activeTab, setActiveTab] = useState<"fixed" | "diff" | "original">("fixed");
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // Editable text state for fixed result if user wants to tweak manually
    const [editedPositive, setEditedPositive] = useState<string | null>(null);
    const [editedNegative, setEditedNegative] = useState<string | null>(null);

    // Compute diagnosis and fixes
    const healthReport = useMemo(() => {
        return analyzePrompt(modalPositive, modalNegative);
    }, [modalPositive, modalNegative]);

    const fixResult = useMemo(() => {
        return fixPrompt(modalPositive, modalNegative, options);
    }, [modalPositive, modalNegative, options]);

    // Reset edited text when options or input prompt change
    React.useEffect(() => {
        setEditedPositive(null);
        setEditedNegative(null);
    }, [fixResult]);

    if (!isOpen) return null;

    const currentFinalPositive = editedPositive !== null ? editedPositive : fixResult.fixedPositive;
    const currentFinalNegative = editedNegative !== null ? editedNegative : fixResult.fixedNegative;

    const isPromptOptimal = healthReport.issues.length === 0 || healthReport.overallScore >= 85;

    const handleApply = () => {
        onApplyFixed(currentFinalPositive, currentFinalNegative);
        showToast("⚡ Prompt berhasil diperbaiki & diterapkan ke Canvas Studio!");
        onClose();
    };

    const handleCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        showToast("✓ Berhasil disalin ke clipboard!");
        setTimeout(() => setCopiedKey(null), 1800);
    };

    const handleLoadScenario = (scenarioId: string) => {
        const scenario = PRESET_FIX_SCENARIOS.find((s) => s.id === scenarioId);
        if (scenario) {
            setModalPositive(scenario.originalPrompt);
            setModalNegative(scenario.originalNegative);
            setEditedPositive(null);
            setEditedNegative(null);
            showToast(`Skenario contoh dimuat: ${scenario.title}`);
        }
    };

    return (
        <div className="prompt-fixer-overlay" onClick={onClose}>
            <div className="prompt-fixer-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="prompt-fixer-header">
                    <div className="prompt-fixer-title-group">
                        <div className="prompt-fixer-icon">⚡</div>
                        <div className="prompt-fixer-header-text">
                            <div className="prompt-fixer-headline-row">
                                <h3>Prompt Fix &amp; Auto-Align</h3>
                                <span className="prompt-fixer-badge-general">Multi-Model Universal Engine</span>
                                <span className={`prompt-fixer-readiness-chip ${isPromptOptimal ? "optimal" : "needs-fix"}`}>
                                    {isPromptOptimal ? "✓ Status: Optimal" : "⚠️ Status: Perlu Optimasi"}
                                </span>
                            </div>
                            <p>
                                Optimasi urutan token, cegah konflik pose/objek, bersihkan bloat, dan kunci subjek &amp; aksi di Chunk 1 (100% Full Attention) tanpa ControlNet.
                            </p>
                        </div>
                    </div>
                    <button type="button" className="prompt-fixer-close-btn" onClick={onClose} title="Tutup">
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="prompt-fixer-body">
                    {/* PRIMARY HEALTH STATUS BANNER (CLEAR USER-FRIENDLY FEEDBACK) */}
                    {isPromptOptimal ? (
                        <div className="fixer-status-banner status-optimal">
                            <div className="status-banner-icon">✨</div>
                            <div className="status-banner-content">
                                <div className="status-banner-top">
                                    <span className="status-badge optimal">
                                        ✓ STATUS PROMPT: SANGAT BAGUS &amp; OPTIMAL (SKOR: {healthReport.overallScore}/100)
                                    </span>
                                    <span className="status-score-pill optimal">Siap Generate 100%</span>
                                </div>
                                <h4 className="status-banner-title">
                                    Prompt Anda Sudah Berada dalam Kondisi Prima!
                                </h4>
                                <p className="status-banner-desc">
                                    Aksi inti dan subjek berada dalam zona prioritas Chunk 1 (100% Full Attention), tidak ada konflik pose tangan, bebas dari jebakan meja, dan kuota token efisien tanpa kata sifat berlebih.
                                </p>
                                <div className="status-banner-checklist">
                                    <span className="check-item">✓ Aksi Inti di Chunk 1 (Perhatian Penuh)</span>
                                    <span className="check-item">✓ Pose Tangan Bebas Hambatan</span>
                                    <span className="check-item">✓ Kuota Token Efisien &amp; Rapi</span>
                                    <span className="check-item">✓ Sintaks Danbooru Terstandar</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="fixer-status-banner status-warning">
                            <div className="status-banner-icon">⚠️</div>
                            <div className="status-banner-content">
                                <div className="status-banner-top">
                                    <span className="status-badge warning">
                                        ⚠️ STATUS PROMPT: BELUM OPTIMAL (SKOR: {healthReport.overallScore}/100)
                                    </span>
                                    <span className="status-score-pill warning">Berisiko Meleset Saat Render</span>
                                </div>
                                <h4 className="status-banner-title">
                                    Terdeteksi {healthReport.issues.length} Hal yang Berpotensi Mengacaukan Pose / Objek
                                </h4>
                                <p className="status-banner-desc">
                                    Prompt ini rentan gagal menampilkan pose/objek secara presisi karena aksi utama berada di luar Chunk 1 atau berebut perhatian dengan tag lain. Periksa konfigurasi di bawah dan terapkan perbaikan otomatis.
                                </p>
                                <div className="status-banner-issue-chips">
                                    {healthReport.issues.map((issue) => (
                                        <span key={issue.id} className={`issue-chip sev-${issue.severity}`}>
                                            • {issue.title}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Telemetry Metrics Comparison Bar */}
                    <div className="fixer-metrics-bar">
                        <div className="fixer-metric-card">
                            <span className="metric-label">Skor Kesiapan &amp; Kesejajaran</span>
                            <div className="metric-value-row">
                                <span className="metric-val-before">{fixResult.scoreBefore}/100</span>
                                <span className="metric-arrow">➔</span>
                                <span className="metric-val-after">{fixResult.scoreAfter}/100</span>
                            </div>
                            <span className="metric-sub">
                                {fixResult.scoreAfter >= 85 ? "✓ Sangat Optimal untuk Render" : "Peningkatan Signifikan"}
                            </span>
                        </div>

                        <div className="fixer-metric-card">
                            <span className="metric-label">Kapasitas Token &amp; Chunk</span>
                            <div className="metric-value-row">
                                <span className="metric-val-before">
                                    {fixResult.tokensBefore} tok (C{fixResult.chunksBefore})
                                </span>
                                <span className="metric-arrow">➔</span>
                                <span className="metric-val-after">
                                    {fixResult.tokensAfter} tok (C{fixResult.chunksAfter})
                                </span>
                            </div>
                            <span className="metric-sub">
                                {fixResult.tokensBefore > fixResult.tokensAfter
                                    ? `Hemat ${fixResult.tokensBefore - fixResult.tokensAfter} token dari bloat`
                                    : "Alokasi token seimbang"}
                            </span>
                        </div>

                        <div className="fixer-metric-card">
                            <span className="metric-label">Alokasi Aksi &amp; Subjek Inti</span>
                            <div className="metric-value-row">
                                <span className="metric-val-before">
                                    Chunk {fixResult.actionChunkBefore}
                                </span>
                                <span className="metric-arrow">➔</span>
                                <span className="metric-val-after">
                                    Chunk {fixResult.actionChunkAfter}
                                </span>
                            </div>
                            <span className="metric-sub">
                                {fixResult.actionChunkAfter === 1
                                    ? "100% Full Attention (Chunk 1)"
                                    : "Prioritas Terangkat"}
                            </span>
                        </div>
                    </div>

                    {/* Diagnostics Issues Found (Expandable / Detailed) */}
                    {healthReport.issues.length > 0 && (
                        <div className="fixer-issues-section">
                            <div className="fixer-issues-title-row">
                                <span className="fixer-issues-title">
                                    🔍 Rincian Isu Diagnostik ({healthReport.issues.length} Ditemukan)
                                </span>
                                {healthReport.detectedProps.length > 0 && (
                                    <span className="detected-prop-badge">
                                        📦 Objek/Prop Terdeteksi: <strong>{healthReport.detectedProps.join(", ")}</strong>
                                    </span>
                                )}
                            </div>

                            <div className="fixer-issues-grid">
                                {healthReport.issues.map((issue) => (
                                    <div key={issue.id} className={`fixer-issue-item ${issue.severity}`}>
                                        <div className="fixer-issue-header">
                                            <span className={`fixer-issue-sev ${issue.severity}`}>
                                                {issue.severity === "critical" ? "KRITIS" : issue.severity === "warning" ? "PERINGATAN" : "INFO"}
                                            </span>
                                            <span className="fixer-issue-title-text">{issue.title}</span>
                                        </div>
                                        <p className="fixer-issue-detail">{issue.detail}</p>
                                        <div className="fixer-issue-solution">
                                            <span className="solution-prefix">💡 Rekomendasi Solusi:</span> {issue.proposedFix}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* User-Friendly Tuning Configuration (Toggle Switches) */}
                    <div className="fixer-options-card">
                        <div className="fixer-options-header">
                            <span className="fixer-options-title">⚙️ Konfigurasi Optimasi Prompt (Bisa Disesuaikan Sesuai Kebutuhan):</span>
                            <span className="fixer-options-help">Setiap sakelar di bawah bekerja otomatis tanpa merusak isi prompt Anda</span>
                        </div>

                        <div className="fixer-switches-grid">
                            <div className="fixer-switch-item">
                                <label className="fixer-switch-label">
                                    <input
                                        type="checkbox"
                                        checked={options.frontloadCoreAction}
                                        onChange={(e) => setOptions({ ...options, frontloadCoreAction: e.target.checked })}
                                    />
                                    <span className="switch-slider" />
                                    <span className="switch-text">
                                        <strong>Front-load Aksi &amp; Subjek ke Chunk 1</strong>
                                        <span className="switch-sub">Kunci pose &amp; objek di 75 token pertama agar perhatian cross-attention model 100% penuh.</span>
                                    </span>
                                </label>
                            </div>

                            <div className="fixer-switch-item">
                                <label className="fixer-switch-label">
                                    <input
                                        type="checkbox"
                                        checked={options.resolvePoseConflicts}
                                        onChange={(e) => setOptions({ ...options, resolvePoseConflicts: e.target.checked })}
                                    />
                                    <span className="switch-slider" />
                                    <span className="switch-text">
                                        <strong>Harmonisasikan Pose &amp; Prop Tangan</strong>
                                        <span className="switch-sub">Gunakan tag Danbooru baku dan perjelas koordinasi tangan agar objek tetap dipegang erat.</span>
                                    </span>
                                </label>
                            </div>

                            <div className="fixer-switch-item">
                                <label className="fixer-switch-label">
                                    <input
                                        type="checkbox"
                                        checked={options.decoupleSurfaceInteractions}
                                        onChange={(e) => setOptions({ ...options, decoupleSurfaceInteractions: e.target.checked })}
                                    />
                                    <span className="switch-slider" />
                                    <span className="switch-text">
                                        <strong>Bebaskan Tangan dari Permukaan Meja</strong>
                                        <span className="switch-sub">Ubah <code>standing beside desk</code> jadi latar belakang agar tangan tidak ditarik ke meja.</span>
                                    </span>
                                </label>
                            </div>

                            <div className="fixer-switch-item">
                                <label className="fixer-switch-label">
                                    <input
                                        type="checkbox"
                                        checked={options.compactQuality}
                                        onChange={(e) => setOptions({ ...options, compactQuality: e.target.checked })}
                                    />
                                    <span className="switch-slider" />
                                    <span className="switch-text">
                                        <strong>Ringkas Quality Bloat</strong>
                                        <span className="switch-sub">Pangkas tumpukan kata 'amazing quality, high quality' berulang yang menghabiskan token.</span>
                                    </span>
                                </label>
                            </div>

                            <div className="fixer-switch-item">
                                <label className="fixer-switch-label">
                                    <input
                                        type="checkbox"
                                        checked={options.normalizeDanbooruSyntax}
                                        onChange={(e) => setOptions({ ...options, normalizeDanbooruSyntax: e.target.checked })}
                                    />
                                    <span className="switch-slider" />
                                    <span className="switch-text">
                                        <strong>Normalisasi Sintaks Danbooru</strong>
                                        <span className="switch-sub">Konversi frasa kasual (misal 'hugging folder') ke tag baku model anime (<code>holding to chest</code>).</span>
                                    </span>
                                </label>
                            </div>

                            <div className="fixer-switch-item">
                                <label className="fixer-switch-label">
                                    <input
                                        type="checkbox"
                                        checked={options.unbundleWeightGroups}
                                        onChange={(e) => setOptions({ ...options, unbundleWeightGroups: e.target.checked })}
                                    />
                                    <span className="switch-slider" />
                                    <span className="switch-text">
                                        <strong>Pecah Kurung Bobot Ganda</strong>
                                        <span className="switch-sub">Ubah <code>(tag1, tag2:1.25)</code> menjadi tag mandiri agar bobot tidak saling menindih.</span>
                                    </span>
                                </label>
                            </div>

                            <div className="fixer-switch-item">
                                <label className="fixer-switch-label">
                                    <input
                                        type="checkbox"
                                        checked={options.guardNegativePrompt}
                                        onChange={(e) => setOptions({ ...options, guardNegativePrompt: e.target.checked })}
                                    />
                                    <span className="switch-slider" />
                                    <span className="switch-text">
                                        <strong>Lindungi Negative Prompt</strong>
                                        <span className="switch-sub">Tambahkan pelindung anti-cacat tangan dan anti-kehilangan objek di Negative Prompt.</span>
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Applied Fixes Pills */}
                    {fixResult.appliedFixes.length > 0 && (
                        <div className="fixer-applied-summary">
                            <span className="applied-summary-label">
                                ✓ Penyesuaian yang Berhasil Diterapkan ({fixResult.appliedFixes.length}):
                            </span>
                            <div className="fixer-applied-fixes">
                                {fixResult.appliedFixes.map((fix, idx) => (
                                    <span key={idx} className="fixer-fix-pill">
                                        ✓ {fix}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Before vs After Preview Card */}
                    <div className="fixer-preview-card">
                        <div className="fixer-preview-header">
                            <div className="fixer-preview-tabs">
                                <button
                                    type="button"
                                    className={`fixer-tab-btn ${activeTab === "fixed" ? "active" : ""}`}
                                    onClick={() => setActiveTab("fixed")}
                                >
                                    ⚡ Hasil Prompt Optimal
                                </button>
                                <button
                                    type="button"
                                    className={`fixer-tab-btn ${activeTab === "diff" ? "active" : ""}`}
                                    onClick={() => setActiveTab("diff")}
                                >
                                    📊 Perbandingan Bersisian (Diff)
                                </button>
                                <button
                                    type="button"
                                    className={`fixer-tab-btn ${activeTab === "original" ? "active" : ""}`}
                                    onClick={() => setActiveTab("original")}
                                >
                                    📄 Prompt Asli
                                </button>
                            </div>

                            <span className="fixer-preview-hint">
                                Teks di bawah dapat diedit langsung sebelum diterapkan ke canvas studio
                            </span>
                        </div>

                        {/* TAB 1: FIXED PROMPT (DEFAULT) */}
                        {activeTab === "fixed" && (
                            <div className="fixer-tab-content">
                                <div className="prompt-output-block positive">
                                    <div className="prompt-output-header">
                                        <span className="prompt-output-label green">
                                            🟢 POSITIVE PROMPT ({fixResult.tokensAfter} CLIP Tokens · Chunk {fixResult.chunksAfter})
                                        </span>
                                        <div className="prompt-output-actions">
                                            <button
                                                type="button"
                                                className="btn-copy-chip"
                                                onClick={() => handleCopy(currentFinalPositive, "fixed-pos")}
                                            >
                                                {copiedKey === "fixed-pos" ? "✓ Tersalin!" : "Salin Positive"}
                                            </button>
                                        </div>
                                    </div>
                                    <textarea
                                        className="fixer-textarea fixed positive"
                                        rows={4}
                                        value={currentFinalPositive}
                                        onChange={(e) => setEditedPositive(e.target.value)}
                                        placeholder="Positive prompt optimal..."
                                    />
                                    <div className="prompt-output-footer">
                                        <span>💡 <strong>Front-loaded:</strong> Aksi &amp; prop ditempatkan di awal Chunk 1 untuk retensi perhatian 100%.</span>
                                    </div>
                                </div>

                                <div className="prompt-output-block negative" style={{ marginTop: "12px" }}>
                                    <div className="prompt-output-header">
                                        <span className="prompt-output-label red">
                                            🔴 NEGATIVE PROMPT (Pelindung Anatomi Aktif)
                                        </span>
                                        <div className="prompt-output-actions">
                                            <button
                                                type="button"
                                                className="btn-copy-chip"
                                                onClick={() => handleCopy(currentFinalNegative, "fixed-neg")}
                                            >
                                                {copiedKey === "fixed-neg" ? "✓ Tersalin!" : "Salin Negative"}
                                            </button>
                                        </div>
                                    </div>
                                    <textarea
                                        className="fixer-textarea fixed negative"
                                        rows={2}
                                        value={currentFinalNegative}
                                        onChange={(e) => setEditedNegative(e.target.value)}
                                        placeholder="Negative prompt optimal..."
                                    />
                                </div>
                            </div>
                        )}

                        {/* TAB 2: SIDE-BY-SIDE DIFF */}
                        {activeTab === "diff" && (
                            <div className="fixer-diff-container">
                                <div className="diff-column before">
                                    <div className="diff-col-header">
                                        <span className="diff-badge before">Sebelum Perbaikan ({fixResult.tokensBefore} tok · C{fixResult.chunksBefore})</span>
                                        <button
                                            type="button"
                                            className="btn-copy-chip"
                                            onClick={() => handleCopy(modalPositive, "orig-pos")}
                                        >
                                            {copiedKey === "orig-pos" ? "✓ Tersalin!" : "Salin"}
                                        </button>
                                    </div>
                                    <div className="diff-box before">
                                        {modalPositive}
                                    </div>
                                </div>

                                <div className="diff-column after">
                                    <div className="diff-col-header">
                                        <span className="diff-badge after">Sesudah Dioptimasi ({fixResult.tokensAfter} tok · C{fixResult.chunksAfter})</span>
                                        <button
                                            type="button"
                                            className="btn-copy-chip"
                                            onClick={() => handleCopy(currentFinalPositive, "diff-pos")}
                                        >
                                            {copiedKey === "diff-pos" ? "✓ Tersalin!" : "Salin"}
                                        </button>
                                    </div>
                                    <div className="diff-box after">
                                        {currentFinalPositive}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: ORIGINAL ONLY */}
                        {activeTab === "original" && (
                            <div className="fixer-tab-content">
                                <div className="prompt-output-block neutral">
                                    <div className="prompt-output-header">
                                        <span className="prompt-output-label gray">
                                            📄 PROMPT ASLI ({fixResult.tokensBefore} CLIP Tokens · Chunk {fixResult.chunksBefore})
                                        </span>
                                        <button
                                            type="button"
                                            className="btn-copy-chip"
                                            onClick={() => handleCopy(modalPositive, "tab-orig")}
                                        >
                                            {copiedKey === "tab-orig" ? "✓ Tersalin!" : "Salin Asli"}
                                        </button>
                                    </div>
                                    <div className="fixer-preview-box original">
                                        {modalPositive}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="prompt-fixer-footer">
                    <div className="fixer-footer-left">
                        <span className="footer-preset-label">Uji Skenario Contoh:</span>
                        <div className="footer-preset-buttons">
                            {PRESET_FIX_SCENARIOS.map((sc) => (
                                <button
                                    key={sc.id}
                                    type="button"
                                    className="fixer-preset-btn"
                                    onClick={() => handleLoadScenario(sc.id)}
                                    title={sc.desc}
                                >
                                    {sc.title}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="fixer-footer-right">
                        <button type="button" className="fixer-cancel-btn" onClick={onClose}>
                            Batal
                        </button>
                        <button type="button" className="fixer-apply-btn" onClick={handleApply}>
                            <span>⚡ Terapkan ke Canvas Studio</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
