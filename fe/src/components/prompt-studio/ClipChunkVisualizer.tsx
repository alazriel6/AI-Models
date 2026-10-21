import React, { useState, useMemo } from "react";
import {
    tokenizeClipPrompt,
    type TokenItem,
} from "../../utils/clipTokenizer";
import "../../style/ClipChunkVisualizer.css";

interface ClipChunkVisualizerProps {
    prompt: string;
    onChangePrompt?: (newPrompt: string) => void;
    onCopy?: (text: string) => void;
    defaultArch?: "sd15" | "sdxl" | "flux";
    activeCheckpointName?: string;
}

export const ClipChunkVisualizer: React.FC<ClipChunkVisualizerProps> = ({
    prompt,
    onChangePrompt,
    onCopy,
    defaultArch = "sdxl",
    activeCheckpointName,
}) => {
    const [selectedArch, setSelectedArch] = useState<"sd15" | "sdxl" | "flux">(defaultArch);
    const [selectedToken, setSelectedToken] = useState<TokenItem | null>(null);
    const [copiedChunk, setCopiedChunk] = useState<number | null>(null);

    // Compute tokenization & chunks
    const tokenResult = useMemo(() => {
        return tokenizeClipPrompt(prompt);
    }, [prompt]);

    const { chunks, hazards, loraTags, totalTextTokens } = tokenResult;

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
            // Insert safe padding or pad token before the hazardous tag
            // Standard WebUI padding trick: inserting a neutral break or moving tag
            const tagToMove = tags[targetIdx];
            tags.splice(targetIdx, 1);
            // Push to end or safe position
            tags.push(tagToMove);
            onChangePrompt(tags.join(", "));
        }
    };

    const isFlux = selectedArch === "flux";
    const capacityLimit = isFlux ? 512 : 75;
    const progressPercent = Math.min(100, Math.round((totalTextTokens / capacityLimit) * 100));

    return (
        <div className="clip-visualizer-container">
            {/* Header Telemetry Card */}
            <div className="clip-telemetry-card">
                <div className="clip-telemetry-top">
                    <div className="clip-telemetry-left">
                        <div className="clip-telemetry-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <line x1="3" y1="9" x2="21" y2="9" />
                                <line x1="9" y1="21" x2="9" y2="9" />
                            </svg>
                        </div>
                        <div className="clip-telemetry-title-group">
                            <h3>CLIP Tokenizer &amp; 77-Token Chunk Boundary Profiler</h3>
                            <p>
                                {isFlux
                                    ? "T5-XXL Native Stream (512 tokens max, single stream attention tanpa chunking 77-token)"
                                    : "OpenAI CLIP ViT-L/14 & OpenCLIP ViT-bigG (Kelipatan 77 token: 1 BOS + 75 Text + 1 EOS)"}
                                {activeCheckpointName ? ` • Target: ${activeCheckpointName}` : ""}
                            </p>
                        </div>
                    </div>

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

                {/* Progress / Gauge */}
                <div className="clip-gauge-bar">
                    <div className="clip-gauge-info">
                        <span>
                            Total Text Tokens: <strong className="clip-gauge-count">{totalTextTokens}</strong> / {capacityLimit} {isFlux ? "T5 Tokens" : "Tokens (Chunk 1)"}
                        </span>
                        <span>
                            {isFlux
                                ? `${progressPercent}% Kapasitas T5`
                                : `${chunks.length} Chunk Aktif (${totalTextTokens > 75 ? "Perhatian Terpecah ke Multi-Chunk" : "100% Full Attention"})`}
                        </span>
                    </div>
                    <div className="clip-gauge-track">
                        <div
                            className={`clip-gauge-fill chunk-${Math.min(4, chunks.length)}`}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Boundary Cut Hazard Alert (if any tag is sliced across 75 boundary) */}
            {hazards.length > 0 && !isFlux && (
                <div className="clip-hazard-card">
                    <div className="clip-hazard-header">
                        <div className="clip-hazard-title">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            <span>Terdeteksi Pemotongan Frasa di Batas 77-Token ({hazards.length} Hazard)</span>
                        </div>
                        {onChangePrompt && (
                            <button
                                type="button"
                                className="clip-hazard-btn"
                                onClick={handleAutoFixHazard}
                            >
                                ⚡ Auto-Align ke Chunk 2
                            </button>
                        )}
                    </div>
                    <div className="clip-hazard-body">
                        {hazards.map((h, i) => (
                            <div key={i}>
                                <p>{h.explanation}</p>
                                <div className="clip-hazard-pills">
                                    <span>Chunk {h.cutBetweenChunk} (Awal):</span>
                                    {h.tokensInFirstChunk.map((tok, ti) => (
                                        <span key={ti} className="clip-hazard-split-pill p1">{tok}</span>
                                    ))}
                                    <span>➜ Batas 75 Token ➜ Chunk {h.cutBetweenChunk + 1} (Terpisah):</span>
                                    {h.tokensInSecondChunk.map((tok, ti) => (
                                        <span key={ti} className="clip-hazard-split-pill p2">{tok}</span>
                                    ))}
                                </div>
                                <p style={{ fontSize: "12px", color: "#a1a1aa", marginTop: "6px" }}>
                                    <em>Saran: {h.recommendation}</em>
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

            {/* Chunks Stack */}
            <div className="clip-chunks-stack">
                {chunks.map((chunk, chunkIdx) => {
                    const chunkClass = `c${Math.min(4, chunk.chunkNumber)}`;
                    return (
                        <React.Fragment key={chunk.chunkNumber}>
                            {/* Attention Wall Divider between Chunks */}
                            {chunkIdx > 0 && !isFlux && (
                                <div className="clip-barrier-wall">
                                    <div className="clip-barrier-title">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                                        </svg>
                                        <span>77-Token Attention Barrier (Chunk Break)</span>
                                    </div>
                                    <div className="clip-barrier-desc">
                                        Perhatian CLIP mandiri per-chunk. Token di Chunk {chunk.chunkNumber} tidak dapat meng-attend token di Chunk {chunk.chunkNumber - 1}.
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
                                        <span className="clip-chunk-desc">
                                            {chunk.chunkNumber === 1
                                                ? "Primary Attention Window (Prioritas Tertinggi)"
                                                : `Secondary Window (Token #${chunk.startGlobalIndex} - #${chunk.endGlobalIndex})`}
                                        </span>
                                    </div>

                                    <div className="clip-chunk-stats">
                                        <span className="clip-chunk-cap">
                                            {chunk.usedCount} / 75 Tokens
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
                                    <span className="clip-token-pill special-token" title="Token ID: 49406 (Start of Text)">
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
                                                onClick={() => setSelectedToken(isSelected ? null : tok)}
                                                title={`Token: "${tok.text}" • Global: #${tok.globalIndex} • Chunk: #${tok.indexInChunk} • Weight: ${tok.weight.toFixed(2)}x`}
                                            >
                                                <span className="clip-token-idx">#{tok.indexInChunk}</span>
                                                <span>{tok.text}</span>
                                                {tok.weight !== 1.0 && (
                                                    <span className="clip-token-weight">
                                                        {tok.weight.toFixed(2)}x
                                                    </span>
                                                )}
                                            </span>
                                        );
                                    })}

                                    {/* End of text token */}
                                    <span className="clip-token-pill special-token" title="Token ID: 49407 (End of Text)">
                                        <span className="clip-token-idx">#{chunk.usedCount + 1}</span>
                                        <span>&lt;|endoftext|&gt;</span>
                                    </span>
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Token Inspector Detail Bar */}
            {selectedToken && (
                <div className="clip-token-inspector">
                    <div className="clip-inspector-info">
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
                            <span className="clip-inspector-val">Chunk {selectedToken.chunkIndex + 1} (#{selectedToken.indexInChunk}/75)</span>
                        </div>
                        <div className="clip-inspector-item">
                            <span className="clip-inspector-label">Bobot / Weight</span>
                            <span className="clip-inspector-val">{selectedToken.weight.toFixed(2)}x</span>
                        </div>
                        <div className="clip-inspector-item">
                            <span className="clip-inspector-label">Simulated CLIP ID</span>
                            <span className="clip-inspector-val">{selectedToken.id}</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="clip-chunk-copy-btn"
                        onClick={() => setSelectedToken(null)}
                    >
                        Tutup Inspektor ✕
                    </button>
                </div>
            )}
        </div>
    );
};
