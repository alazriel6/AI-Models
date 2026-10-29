import React, { useState, useMemo } from "react";
import {
    tokenizeClipPrompt,
    getChunkZoneInfo,
    type TokenItem,
    type TagChunkSpan,
} from "../../utils/clipTokenizer";
import { analyzePrompt } from "../../utils/promptFixer";
import "../../style/ClipChunkVisualizer.css";

interface ClipChunkVisualizerProps {
    prompt: string;
    onChangePrompt?: (newPrompt: string) => void;
    onCopy?: (text: string) => void;
    defaultArch?: "sd15" | "sdxl" | "flux";
    activeCheckpointName?: string;
    onOpenPromptFixer?: () => void;
    onOpenPromptHealer?: () => void;
}

const PRESET_DEMOS = [
    {
        id: "rio-holding-hazard",
        label: "Rio Tsukatsuki (Prop Hazard ~151 tok)",
        desc: "Skenario konflik pose 2 tangan & aksi buku terlempar ke Chunk 2",
        text: "masterpiece, best quality, very aesthetic, ultra-detailed, nsfw, explicit, (anime coloring:1.15), newest, highres, absurdres, amazing quality, 1girl, tsukatsuki rio, solo, halo, red eyes, tall female, mature female, large breasts, slender waist, wide hips, thick thighs, (updo, retro curls, short hair:1.2), (red headband, polka dot headband:1.2), (burgundy dress, halter dress, sleeveless dress, backless dress, white belt, short dress, sheer black thighhighs, bare shoulders:1.25), cowboy shot, eye-level, standing beside desk, hugging folder to chest, hand on cheek, looking away, embarrassed, blush, shy expression, indoor, classroom, orange sunset light through windows, warm lighting, depth of field",
    },
    {
        id: "chunk1-safe",
        label: "Chunk 1 Aman (~24 tok)",
        desc: "Zona Prioritas Utama 100%",
        text: "masterpiece, best quality, 1girl, smiling, solo, blue eyes, long hair, school uniform, cherry blossoms, bokeh, sunlight",
    },
    {
        id: "hazard-split",
        label: "Batas 77 Hazard (~76 tok)",
        desc: "Tag terbelah di token #75 & #76",
        text: "masterpiece, highly detailed, 1girl, solo, cute smile, intricate silver armor, ornate metal gauntlets, feathered angel wings, glowing halo, fantasy cathedral, dramatic rim lighting, depth of field, vibrant colors, unreal engine 5 render, highres, photorealistic, cowboy shot, standing proud, holding sacred sword, sacred magical runes, floating crystal shards, stained glass window, celestial light beams, masterpiece illustration",
    },
    {
        id: "multi-chunk",
        label: "Multi-Chunk Extreme (~165+ tok)",
        desc: "Chunk 1, Chunk 2, & Chunk 3+",
        text: "masterpiece, best quality, ultra-detailed, 1girl, beautiful anime illustration, detailed sparkling eyes, soft smile, flowing twin braids, silver hair, off-shoulder black dress, silk ribbon, gold filigree embroidery, holding ancient magic grimoire, glowing arcane runes, floating spell books, mystic library interior, towering bookshelves, dusty sunbeams, ethereal atmosphere, particles, volumetric lighting, celestial nebula through window, dramatic composition, cinematic shadows, high dynamic range, 8k resolution, trending on pixiv, artstation concept art, sharp focus, delicate features, intricate background architecture, gothic arched pillars, marble floor reflection, mysterious aura, soft depth of field, ornate chandelier, enchanted fantasy realm",
    },
];

export const ClipChunkVisualizer: React.FC<ClipChunkVisualizerProps> = ({
    prompt,
    onChangePrompt,
    onCopy,
    defaultArch = "sdxl",
    activeCheckpointName,
    onOpenPromptFixer,
    onOpenPromptHealer,
}) => {
    const [selectedArch, setSelectedArch] = useState<"sd15" | "sdxl" | "flux">(defaultArch);
    const [selectedToken, setSelectedToken] = useState<TokenItem | null>(null);
    const [selectedTag, setSelectedTag] = useState<TagChunkSpan | null>(null);
    const [copiedChunk, setCopiedChunk] = useState<number | null>(null);
    const [showTechnicalExplainer, setShowTechnicalExplainer] = useState(false);

    // Compute tokenization & chunks
    const tokenResult = useMemo(() => {
        return tokenizeClipPrompt(prompt);
    }, [prompt]);

    const { chunks, tagSpans, hazards, loraTags, totalTextTokens } = tokenResult;

    // Handle Copy Chunk Content
    const handleCopyChunk = (chunkNum: number) => {
        const targetChunk = chunks.find((c) => c.chunkNumber === chunkNum);
        if (!targetChunk) return;

        // Extract raw tags from this chunk
        const chunkTags = Array.from(new Set(targetChunk.tokens.filter(t => !t.isSpecial).map((t) => t.originalTag)));
        const chunkText = chunkTags.join(", ");

        if (onCopy) {
            onCopy(chunkText);
        } else {
            navigator.clipboard.writeText(chunkText);
        }

        setCopiedChunk(chunkNum);
        setTimeout(() => setCopiedChunk(null), 1800);
    };

    // Auto-fix hazard: shifts the cut tag to start cleanly at next chunk
    const handleAutoFixHazard = () => {
        if (!onChangePrompt || hazards.length === 0) return;
        const firstHazard = hazards[0];

        // Split current prompt by comma
        const tags = prompt.split(",").map((t) => t.trim()).filter(Boolean);
        const targetIdx = tags.findIndex((t) => t.toLowerCase() === firstHazard.tagText.toLowerCase());

        if (targetIdx !== -1) {
            const tagToMove = tags[targetIdx];
            tags.splice(targetIdx, 1);
            tags.push(tagToMove);
            onChangePrompt(tags.join(", "));
        }
    };

    const isFlux = selectedArch === "flux";
    const capacityLimit = isFlux ? 512 : 75;
    const progressPercent = Math.min(100, Math.round((totalTextTokens / capacityLimit) * 100));

    // Distribution stats per chunk
    const chunkStats = useMemo(() => {
        const c1Count = chunks[0]?.usedCount || 0;
        const c2Count = chunks[1]?.usedCount || 0;
        const c3PlusCount = chunks.slice(2).reduce((acc, c) => acc + c.usedCount, 0);
        return { c1Count, c2Count, c3PlusCount, total: totalTextTokens };
    }, [chunks, totalTextTokens]);

    // Live Prompt Health & Alignment Diagnosis
    const liveHealthReport = useMemo(() => {
        return analyzePrompt(prompt);
    }, [prompt]);

    const hasText = prompt.trim().length > 0;
    const isPromptLiveOptimal =
        hasText &&
        (liveHealthReport.issues.length === 0 || liveHealthReport.overallScore >= 85) &&
        hazards.length === 0 &&
        (isFlux || liveHealthReport.primaryActionChunk === 1);

    return (
        <div className="clip-visualizer-container">
            {/* Header Telemetry Card */}
            <div className="clip-telemetry-card">
                <div className="clip-telemetry-top">
                    <div className="clip-telemetry-left">
                        <div className="clip-telemetry-icon">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <line x1="3" y1="9" x2="21" y2="9" />
                                <line x1="9" y1="21" x2="9" y2="9" />
                            </svg>
                        </div>
                        <div className="clip-telemetry-title-group">
                            <div className="clip-telemetry-badge-row">
                                <h3>CLIP Tokenizer &amp; 77-Token Chunk Boundary Profiler</h3>
                                <span className="clip-badge-version">SD 1.5 · SDXL · Flux</span>
                            </div>
                            <p>
                                {isFlux
                                    ? "T5-XXL Native Stream (512 tokens max, single continuous stream tanpa pembagian 77-token)"
                                    : "OpenAI CLIP ViT-L/14 & OpenCLIP ViT-bigG (Kelipatan 77 token: 1 BOS + 75 Text Tokens + 1 EOS)"}
                                {activeCheckpointName ? ` • Target Model: ${activeCheckpointName}` : ""}
                            </p>
                        </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        {(onOpenPromptFixer || onOpenPromptHealer) && (
                            <button
                                type="button"
                                className="clip-healer-telemetry-btn"
                                onClick={onOpenPromptFixer || onOpenPromptHealer}
                                title="Buka Prompt Fix (Optimasi urutan token & cegah konflik pose)"
                            >
                                <span>Prompt Fix</span>
                            </button>
                        )}
                        <div className="clip-arch-selector">
                            <button
                                type="button"
                                className={`clip-arch-btn ${selectedArch === "sd15" ? "active" : ""}`}
                                onClick={() => setSelectedArch("sd15")}
                            >
                                SD 1.5 (CLIP-L)
                            </button>
                            <button
                                type="button"
                                className={`clip-arch-btn ${selectedArch === "sdxl" ? "active" : ""}`}
                                onClick={() => setSelectedArch("sdxl")}
                            >
                                SDXL (Dual CLIP)
                            </button>
                            <button
                                type="button"
                                className={`clip-arch-btn ${selectedArch === "flux" ? "active" : ""}`}
                                onClick={() => setSelectedArch("flux")}
                            >
                                Flux / SD 3.5 (T5-XXL)
                            </button>
                        </div>
                    </div>
                </div>

                {/* Progress / Chunk Capacity Gauge */}
                <div className="clip-gauge-bar">
                    <div className="clip-gauge-info">
                        <div className="clip-gauge-left-stats">
                            <span>
                                Total Text Tokens: <strong className="clip-gauge-count">{totalTextTokens}</strong> / {capacityLimit} {isFlux ? "T5 Tokens" : "Tokens (Chunk 1)"}
                            </span>
                            {!isFlux && (
                                <span className="clip-gauge-chunk-indicators">
                                    <span className="gauge-pill zone-cyan">C1: {chunkStats.c1Count}/75</span>
                                    <span className={`gauge-pill ${chunkStats.c2Count > 0 ? "zone-amber" : "zone-idle"}`}>
                                        C2: {chunkStats.c2Count}/75
                                    </span>
                                    {chunkStats.c3PlusCount > 0 && (
                                        <span className="gauge-pill zone-red">
                                            C3+: {chunkStats.c3PlusCount} tok
                                        </span>
                                    )}
                                </span>
                            )}
                        </div>

                        <div className="clip-gauge-right-status">
                            {isFlux ? (
                                <span>{progressPercent}% Kapasitas T5-XXL</span>
                            ) : (
                                <span className={`status-chunk-text chunk-count-${chunks.length}`}>
                                    {chunks.length === 1
                                        ? "1 Chunk Aktif • 100% Full Attention"
                                        : `${chunks.length} Chunk Aktif • Perhatian Terpecah Multi-Window`}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="clip-gauge-track">
                        <div
                            className={`clip-gauge-fill chunk-${Math.min(4, chunks.length)}`}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>

                {/* Technical Attention Retention Bar */}
                {!isFlux && (
                    <div className="clip-attention-curve-section">
                        <div className="clip-attention-header">
                            <span className="clip-curve-title">
                                Cross-Attention Retention by Chunk Window
                            </span>
                            <button
                                type="button"
                                className="clip-explainer-toggle"
                                onClick={() => setShowTechnicalExplainer(!showTechnicalExplainer)}
                            >
                                {showTechnicalExplainer ? "Tutup Teori CLIP ▲" : "Mengapa Chunk Terpecah? Pelajari Teori CLIP ▼"}
                            </button>
                        </div>

                        <div className="clip-attention-segmented-bar">
                            <div className="attention-bar-segment seg-c1" style={{ flex: 1 }}>
                                <div className="seg-meta">
                                    <span className="seg-name">Chunk 1 (1–75)</span>
                                    <span className="seg-rate">100% Retained</span>
                                </div>
                                <span className="seg-tag-label">Zona Prioritas Utama</span>
                            </div>

                            <div className={`attention-bar-segment seg-c2 ${chunks.length >= 2 ? "active" : "inactive"}`} style={{ flex: 1 }}>
                                <div className="seg-meta">
                                    <span className="seg-name">Chunk 2 (76–150)</span>
                                    <span className="seg-rate">~82% Retained (-18%)</span>
                                </div>
                                <span className="seg-tag-label">Zona Sekunder</span>
                            </div>

                            <div className={`attention-bar-segment seg-c3 ${chunks.length >= 3 ? "active" : "inactive"}`} style={{ flex: 1 }}>
                                <div className="seg-meta">
                                    <span className="seg-name">Chunk 3 (151–225)</span>
                                    <span className="seg-rate">~55% Retained (-45%)</span>
                                </div>
                                <span className="seg-tag-label">Resiko Bleeding</span>
                            </div>

                            <div className={`attention-bar-segment seg-c4 ${chunks.length >= 4 ? "active" : "inactive"}`} style={{ flex: 1 }}>
                                <div className="seg-meta">
                                    <span className="seg-name">Chunk 4+ (226+)</span>
                                    <span className="seg-rate">&lt;25% Retained</span>
                                </div>
                                <span className="seg-tag-label">Zona Kritis / Terabaikan</span>
                            </div>
                        </div>

                        {showTechnicalExplainer && (
                            <div className="clip-explainer-card">
                                <h4>Arsitektur OpenAI CLIP ViT-L/14 &amp; OpenCLIP ViT-bigG</h4>
                                <ul>
                                    <li>
                                        <strong>Panjang Konteks Keras (Hard Limit 77 Token):</strong> Transformer text encoder CLIP dirancang dengan positional embedding tepat 77 token (1 token <code>&lt;|startoftext|&gt;</code>, 75 token teks, dan 1 token <code>&lt;|endoftext|&gt;</code>).
                                    </li>
                                    <li>
                                        <strong>Chunking Multi-Window:</strong> WebUI (Automatic1111) dan ComfyUI memecah prompt panjang menjadi blok kelipatan 77 token. Masing-masing blok dihitung self-attention-nya secara independen, lalu digabungkan (concatenated) sebelum dialirkan ke UNet/DiT cross-attention layers.
                                    </li>
                                    <li>
                                        <strong>Attention Barrier:</strong> Token di Chunk 2 tidak dapat melihat atau berinteraksi langsung (no self-attention) dengan token di Chunk 1. Hal ini menyebabkan kata yang terpotong di batas 75 token (misal: <code>cyber</code> di Chunk 1 dan <code>punk</code> di Chunk 2) kehilangan makna semantik utuhnya.
                                    </li>
                                    <li>
                                        <strong>Penurunan Perhatian (~15-20% di Chunk 2):</strong> Saat UNet menghitung cross-attention ke token embeddings yang berlipat ganda, gradient magnitude terdistribusi lebih tipis ke chunk sekunder. Chunk 1 mendominasi komposisi dan style global.
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* LIVE PROMPT EDITOR & PRESET EXPERIMENTS */}
            <div className="clip-editor-section">
                <div className="clip-editor-header">
                    <div className="clip-editor-title-wrap">
                        <span className="clip-editor-badge">Interactive Prompt Playground</span>
                        <span className="clip-editor-sub">Edit prompt di bawah atau pilih preset untuk melihat perubahan live chunk highlighter</span>
                    </div>

                    <div className="clip-preset-pills">
                        <span className="preset-label">Uji Skenario:</span>
                        {PRESET_DEMOS.map((demo) => (
                            <button
                                key={demo.id}
                                type="button"
                                className="clip-preset-btn"
                                onClick={() => onChangePrompt && onChangePrompt(demo.text)}
                                title={demo.desc}
                            >
                                {demo.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="clip-input-wrap">
                    <textarea
                        className="clip-textarea-input"
                        rows={3}
                        value={prompt}
                        onChange={(e) => onChangePrompt && onChangePrompt(e.target.value)}
                        placeholder="Ketik atau tempel prompt Stable Diffusion di sini untuk menganalisis batas 77-token CLIP..."
                    />
                </div>

                {/* LIVE PROMPT READINESS STATUS BANNER */}
                {hasText ? (
                    <div className={`clip-live-status-card ${isPromptLiveOptimal ? "optimal" : "needs-fix"}`}>
                        <div className="live-status-icon">
                            {isPromptLiveOptimal ? "✓" : "!"}
                        </div>
                        <div className="live-status-content">
                            <div className="live-status-top">
                                <span className={`live-status-badge ${isPromptLiveOptimal ? "optimal" : "needs-fix"}`}>
                                    {isPromptLiveOptimal
                                        ? `STATUS: PROMPT OPTIMAL (${liveHealthReport.overallScore}/100)`
                                        : `STATUS: PROMPT PERLU PENYESUAIAN (${liveHealthReport.overallScore}/100)`}
                                </span>
                                <span className="live-status-meta">
                                    {totalTextTokens} Tokens · {chunks.length} Chunk · Aksi di Chunk {liveHealthReport.primaryActionChunk}
                                </span>
                            </div>

                            <p className="live-status-desc">
                                {isPromptLiveOptimal
                                    ? "Prompt Anda berada dalam kondisi prima. Seluruh aksi penting berada di Chunk 1 dengan 100% full cross-attention, tanpa konflik pose atau pemborosan token."
                                    : `Perhatian prompt: ${
                                        liveHealthReport.issues.length > 0
                                            ? liveHealthReport.issues[0].title
                                            : hazards.length > 0
                                            ? `${hazards.length} kata terbelah di batas 75 token`
                                            : "Aksi atau pose berada di luar zona prioritas Chunk 1"
                                    }. Klik tombol Prompt Fix untuk merapikannya otomatis.`}
                            </p>

                            {isPromptLiveOptimal ? (
                                <div className="live-status-chips">
                                    <span className="live-chip optimal">Chunk 1 Aman (100% Retensi)</span>
                                    <span className="live-chip optimal">Bebas Konflik Pose</span>
                                    <span className="live-chip optimal">Sintaks Baku Siap Render</span>
                                </div>
                            ) : (
                                <div className="live-status-action-row">
                                    <div className="live-status-chips">
                                        {liveHealthReport.issues.slice(0, 3).map((iss) => (
                                            <span key={iss.id} className="live-chip warning">
                                                • {iss.title}
                                            </span>
                                        ))}
                                    </div>
                                    {(onOpenPromptFixer || onOpenPromptHealer) && (
                                        <button
                                            type="button"
                                            className="btn-live-prompt-fix"
                                            onClick={onOpenPromptFixer || onOpenPromptHealer}
                                        >
                                            Prompt Fix (Perbaiki Otomatis)
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="clip-live-status-card idle">
                        <div className="live-status-icon">i</div>
                        <div className="live-status-content">
                            <span className="live-status-badge idle">STATUS: MENUNGGU INPUT PROMPT</span>
                            <p className="live-status-desc">
                                Ketik prompt Stable Diffusion di atas atau klik salah satu skenario contoh untuk memeriksa kesehatan prompt dan memetakan batas 77-token CLIP secara live.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* LIVE CHUNK HIGHLIGHTER: THE CORE VISUALIZER */}
            <div className="clip-live-highlighter-card">
                <div className="clip-highlighter-header">
                    <div className="clip-highlighter-title-group">
                        <div className="highlighter-pulse-dot" />
                        <h4>Live Chunk Highlighter</h4>
                        <span className="highlighter-desc">
                            Visualisasi real-time pemetaan kata kunci ke zona Chunk CLIP
                        </span>
                    </div>

                    <div className="clip-zone-legend">
                        <span className="zone-legend-item legend-cyan">
                            <span className="zone-color-dot" />
                            <span>Chunk 1 (1–75): Prioritas Utama</span>
                        </span>
                        <span className="zone-legend-item legend-amber">
                            <span className="zone-color-dot" />
                            <span>Chunk 2 (76–150): Zona Sekunder (-15-20%)</span>
                        </span>
                        <span className="zone-legend-item legend-orange">
                            <span className="zone-color-dot" />
                            <span>Chunk 3+ (151+): Resiko Bleeding</span>
                        </span>
                    </div>
                </div>

                {tagSpans.length === 0 ? (
                    <div className="clip-highlighter-empty">
                        Prompt masih kosong. Ketik teks di atas atau klik salah satu preset skenario untuk melihat live chunk highlighting.
                    </div>
                ) : (
                    <div className="clip-live-tag-stream">
                        {tagSpans.map((span) => {
                            const zone = getChunkZoneInfo(span.primaryChunk);
                            const isSplit = span.isSplitAcrossChunks;
                            const isSelected = selectedTag?.tagIndex === span.tagIndex;
                            const zoneClass = isSplit
                                ? "zone-split-hazard"
                                : span.primaryChunk === 1
                                ? "zone-cyan"
                                : span.primaryChunk === 2
                                ? "zone-amber"
                                : span.primaryChunk === 3
                                ? "zone-orange"
                                : "zone-red";

                            return (
                                <span
                                    key={span.tagIndex}
                                    className={`clip-live-tag-pill ${zoneClass} ${isSelected ? "selected" : ""}`}
                                    onClick={() => setSelectedTag(isSelected ? null : span)}
                                    title={`Frasa: "${span.tagText}" • Global Tok: #${span.startGlobalIndex}-#${span.endGlobalIndex} • ${zone.zoneName} (${zone.attentionRetainedPercent}% Retained)${isSplit ? ` ➜ Batas 75 TERBELAH ke Chunk ${span.endChunk}!` : ""}`}
                                >
                                    <span className="tag-chunk-badge">
                                        {isSplit ? `C${span.startChunk}➜C${span.endChunk}` : `C${span.primaryChunk}`}
                                    </span>
                                    <span className="tag-text">{span.cleanText}</span>
                                    {span.weight !== 1.0 && (
                                        <span className="tag-weight-bubble">
                                            {span.weight.toFixed(2)}x
                                        </span>
                                    )}
                                    {isSplit && (
                                        <span className="tag-cut-alert-icon" title="Peringatan: Tag terbelah di batas 75 token!">
                                            [Split]
                                        </span>
                                    )}
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Boundary Cut Hazard Alert (if any tag is sliced across 75 boundary) */}
            {hazards.length > 0 && !isFlux && (
                <div className="clip-hazard-card">
                    <div className="clip-hazard-header">
                        <div className="clip-hazard-title">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            <span>Terdeteksi Pemotongan Frasa di Batas 77-Token ({hazards.length} Hazard)</span>
                        </div>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            {(onOpenPromptFixer || onOpenPromptHealer) && (
                                <button
                                    type="button"
                                    className="clip-hazard-btn"
                                    style={{ background: "#2563eb", border: "1px solid #1d4ed8", color: "#ffffff" }}
                                    onClick={onOpenPromptFixer || onOpenPromptHealer}
                                >
                                    Prompt Fix
                                </button>
                            )}
                            {onChangePrompt && (
                                <button
                                    type="button"
                                    className="clip-hazard-btn"
                                    onClick={handleAutoFixHazard}
                                >
                                    Auto-Align ke Chunk 2
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="clip-hazard-body">
                        {hazards.map((h, i) => (
                            <div key={i} className="clip-hazard-item">
                                <p className="clip-hazard-exp">{h.explanation}</p>
                                <div className="clip-hazard-pills">
                                    <span className="clip-hazard-stage-label">Chunk {h.cutBetweenChunk} (Awal):</span>
                                    {h.tokensInFirstChunk.map((tok, ti) => (
                                        <span key={ti} className="clip-hazard-split-pill p1">{tok}</span>
                                    ))}
                                    <span className="clip-hazard-separator">┋ BATAS 75 TOKEN ┋</span>
                                    <span className="clip-hazard-stage-label">Chunk {h.cutBetweenChunk + 1} (Terpisah):</span>
                                    {h.tokensInSecondChunk.map((tok, ti) => (
                                        <span key={ti} className="clip-hazard-split-pill p2">{tok}</span>
                                    ))}
                                </div>
                                <p className="clip-hazard-saran">
                                    <em>Rekomendasi Teknis: {h.recommendation}</em>
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* LoRA Directives Callout */}
            {loraTags.length > 0 && (
                <div className="clip-lora-info-bar">
                    <span className="clip-lora-badge">{loraTags.length} LoRA Terdeteksi</span>
                    <span>
                        LoRA directive (<code>&lt;lora:...&gt;</code>) diekstrak langsung oleh WebUI/ComfyUI loader dan <strong>tidak memakan kuota 75 token CLIP</strong>.
                    </span>
                </div>
            )}

            {/* CHUNKS STACK: FULL DETAILED BREAKDOWN PER CHUNK */}
            <div className="clip-chunks-stack">
                <div className="clip-stack-title-row">
                    <h4>Detailed 77-Token Chunk Sequences</h4>
                    <span className="clip-stack-count">{chunks.length} Sequence Windows</span>
                </div>

                {chunks.map((chunk, chunkIdx) => {
                    const chunkZone = getChunkZoneInfo(chunk.chunkNumber);
                    const chunkClass = `c${Math.min(4, chunk.chunkNumber)}`;

                    return (
                        <React.Fragment key={chunk.chunkNumber}>
                            {/* Attention Wall Divider between Chunks */}
                            {chunkIdx > 0 && !isFlux && (
                                <div className="clip-barrier-wall">
                                    <div className="clip-barrier-title">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                                        </svg>
                                        <span>77-Token Attention Barrier Wall (Chunk #{chunk.chunkNumber - 1} ➔ #{chunk.chunkNumber})</span>
                                    </div>
                                    <div className="clip-barrier-desc">
                                        Perhatian CLIP mandiri per-chunk. Token di Chunk {chunk.chunkNumber} tidak dapat meng-attend token di Chunk {chunk.chunkNumber - 1}.
                                        Perhatian model cross-attention menurun menjadi <strong>{chunkZone.attentionRetainedPercent}%</strong>.
                                    </div>
                                </div>
                            )}

                            {/* Chunk Box */}
                            <div className={`clip-chunk-box ${chunkClass}`}>
                                <div className="clip-chunk-header">
                                    <div className="clip-chunk-badge-title">
                                        <span className="clip-chunk-num-badge">
                                            Chunk {chunk.chunkNumber}
                                        </span>
                                        <span className="clip-chunk-zone-pill">
                                            {chunkZone.zoneName}
                                        </span>
                                        <span className="clip-chunk-desc">
                                            ({chunkZone.tokenRange} · {chunkZone.attentionRetainedPercent}% Retained Attention)
                                        </span>
                                    </div>

                                    <div className="clip-chunk-stats">
                                        <span className="clip-chunk-cap">
                                            <strong>{chunk.usedCount}</strong> / 75 Tokens Terpakai
                                        </span>
                                        <button
                                            type="button"
                                            className="clip-chunk-copy-btn"
                                            onClick={() => handleCopyChunk(chunk.chunkNumber)}
                                        >
                                            {copiedChunk === chunk.chunkNumber ? "Tersalin!" : `Salin Chunk ${chunk.chunkNumber}`}
                                        </button>
                                    </div>
                                </div>

                                <div className="clip-token-stream">
                                    {/* Start of text token */}
                                    <span className="clip-token-pill special-token" title="Token ID: 49406 (Start of Text / BOS)">
                                        <span className="clip-token-idx">#0</span>
                                        <span>&lt;|startoftext|&gt;</span>
                                    </span>

                                    {/* Content tokens */}
                                    {chunk.tokens.map((tok) => {
                                        const isSelected = selectedToken?.globalIndex === tok.globalIndex;
                                        const isComma = tok.text === ",";
                                        return (
                                            <span
                                                key={tok.globalIndex}
                                                className={`clip-token-pill ${isComma ? "comma-token" : ""} ${isSelected ? "active" : ""} ${tok.isBoundaryCut ? "cut-hazard" : ""}`}
                                                onClick={() => {
                                                    setSelectedToken(isSelected ? null : tok);
                                                    setSelectedTag(null);
                                                }}
                                                title={`Token: "${tok.text}" • Global: #${tok.globalIndex} • Chunk #${chunk.chunkNumber}: #${tok.indexInChunk}/75 • Weight: ${tok.weight.toFixed(2)}x`}
                                            >
                                                <span className="clip-token-idx">#{tok.indexInChunk}</span>
                                                <span className="clip-token-text">{tok.text}</span>
                                                {tok.weight !== 1.0 && (
                                                    <span className="clip-token-weight">
                                                        {tok.weight.toFixed(2)}x
                                                    </span>
                                                )}
                                            </span>
                                        );
                                    })}

                                    {/* End of text token */}
                                    <span className="clip-token-pill special-token" title="Token ID: 49407 (End of Text / EOS)">
                                        <span className="clip-token-idx">#{chunk.usedCount + 1}</span>
                                        <span>&lt;|endoftext|&gt;</span>
                                    </span>
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Token / Tag Inspector Detail Bar */}
            {(selectedToken || selectedTag) && (
                <div className="clip-token-inspector">
                    <div className="clip-inspector-info">
                        {selectedToken && (
                            <>
                                <div className="clip-inspector-item">
                                    <span className="clip-inspector-label">Token Subword</span>
                                    <span className="clip-inspector-val">"{selectedToken.text}"</span>
                                </div>
                                <div className="clip-inspector-item">
                                    <span className="clip-inspector-label">Frasa Asal</span>
                                    <span className="clip-inspector-val">{selectedToken.originalTag}</span>
                                </div>
                                <div className="clip-inspector-item">
                                    <span className="clip-inspector-label">Global Index</span>
                                    <span className="clip-inspector-val">#{selectedToken.globalIndex}</span>
                                </div>
                                <div className="clip-inspector-item">
                                    <span className="clip-inspector-label">Chunk Index</span>
                                    <span className="clip-inspector-val">
                                        Chunk {selectedToken.chunkIndex + 1} (#{selectedToken.indexInChunk}/75)
                                    </span>
                                </div>
                                <div className="clip-inspector-item">
                                    <span className="clip-inspector-label">Zona Cross-Attention</span>
                                    <span className="clip-inspector-val">
                                        {getChunkZoneInfo(selectedToken.chunkIndex + 1).zoneName} ({getChunkZoneInfo(selectedToken.chunkIndex + 1).attentionRetainedPercent}% Retained)
                                    </span>
                                </div>
                                <div className="clip-inspector-item">
                                    <span className="clip-inspector-label">Bobot / Weight</span>
                                    <span className="clip-inspector-val">{selectedToken.weight.toFixed(2)}x</span>
                                </div>
                                <div className="clip-inspector-item">
                                    <span className="clip-inspector-label">Simulated CLIP ID</span>
                                    <span className="clip-inspector-val">{selectedToken.id}</span>
                                </div>
                            </>
                        )}

                        {selectedTag && !selectedToken && (
                            <>
                                <div className="clip-inspector-item">
                                    <span className="clip-inspector-label">Frasa Tag</span>
                                    <span className="clip-inspector-val">"{selectedTag.tagText}"</span>
                                </div>
                                <div className="clip-inspector-item">
                                    <span className="clip-inspector-label">Rentang Token Global</span>
                                    <span className="clip-inspector-val">#{selectedTag.startGlobalIndex} - #{selectedTag.endGlobalIndex} ({selectedTag.tokens.length} subwords)</span>
                                </div>
                                <div className="clip-inspector-item">
                                    <span className="clip-inspector-label">Alokasi Chunk</span>
                                    <span className="clip-inspector-val">
                                        {selectedTag.isSplitAcrossChunks
                                            ? `TERBELAH: Chunk ${selectedTag.startChunk} ➜ Chunk ${selectedTag.endChunk}`
                                            : `Chunk ${selectedTag.primaryChunk} (${getChunkZoneInfo(selectedTag.primaryChunk).zoneName})`}
                                    </span>
                                </div>
                                <div className="clip-inspector-item">
                                    <span className="clip-inspector-label">Estimasi Retensi Perhatian</span>
                                    <span className="clip-inspector-val">
                                        {getChunkZoneInfo(selectedTag.primaryChunk).attentionRetainedPercent}%
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    <button
                        type="button"
                        className="clip-chunk-copy-btn"
                        onClick={() => {
                            setSelectedToken(null);
                            setSelectedTag(null);
                        }}
                    >
                        Tutup Inspektor ✕
                    </button>
                </div>
            )}
        </div>
    );
};
