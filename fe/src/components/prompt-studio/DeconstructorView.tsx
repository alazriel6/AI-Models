import React, { useState, useMemo } from "react";
import {
    CATEGORIES,
    deconstructPromptText,
} from "./PromptCategoriesData";
import {
    PROMPT_FORMATS,
    detectPromptFormat,
    convertPromptOffline,
    convertPromptWithAI,
    type PromptFormatId,
} from "../../services/promptTransformerService";

interface DeconstructorViewProps {
    onApplyToStudio: (parsedBuckets: Record<string, string>, lora?: { name: string; weight: number }) => void;
    onApplyToCanvas: (positiveText: string) => void;
    showToast: (msg: string) => void;
}

export const DeconstructorView: React.FC<DeconstructorViewProps> = ({
    onApplyToStudio,
    onApplyToCanvas,
    showToast,
}) => {
    const [subTab, setSubTab] = useState<"transformer" | "deconstructor">("transformer");
    const [rawInput, setRawInput] = useState<string>("");
    const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
    const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

    // AI Overrides state for individual formats (if user ran AI Deep Transform)
    const [aiOverrides, setAiOverrides] = useState<Record<string, string>>({});

    // 10-Layer deconstruction state
    const [parsedResult, setParsedResult] = useState<{
        buckets: Record<string, string>;
        lora?: { name: string; weight: number };
        totalTags: number;
        classifiedCount: number;
    } | null>(null);

    // Auto-detection of input format
    const detected = useMemo(() => {
        return detectPromptFormat(rawInput);
    }, [rawInput]);

    // Computed conversions for all target formats
    const convertedOutputs = useMemo<Record<PromptFormatId, string>>(() => {
        const res: Record<PromptFormatId, string> = {
            pony: "",
            illustrious: "",
            animagine: "",
            flux: "",
            midjourney: "",
            novelai: "",
            sdxl_realistic: "",
            sd15: "",
        };
        if (!rawInput.trim()) return res;
        for (const fmt of PROMPT_FORMATS) {
            res[fmt.id] = aiOverrides[fmt.id] || convertPromptOffline(rawInput, fmt.id);
        }
        return res;
    }, [rawInput, aiOverrides]);

    const handleParseDeconstructor = () => {
        if (!rawInput.trim()) {
            showToast("Silakan tempelkan teks prompt terlebih dahulu");
            return;
        }

        const result = deconstructPromptText(rawInput);
        setParsedResult(result);
        showToast(`Berhasil membedah ${result.classifiedCount} tag ke dalam 10 kategori!`);
    };

    const handleApplyStudio = (bucketsToUse?: Record<string, string>, loraToUse?: { name: string; weight: number }) => {
        if (bucketsToUse) {
            onApplyToStudio(bucketsToUse, loraToUse);
            showToast("Hasil diterapkan ke 10-Layer Studio!");
            return;
        }
        if (!parsedResult) {
            const res = deconstructPromptText(rawInput);
            onApplyToStudio(res.buckets, res.lora);
            showToast("Prompt dibedah & diterapkan ke 10-Layer Studio!");
            return;
        }
        onApplyToStudio(parsedResult.buckets, parsedResult.lora);
        showToast("Hasil dekonstruksi diterapkan ke 10-Layer Studio!");
    };

    const handleApplyCanvas = (textToApply?: string) => {
        const text = textToApply || rawInput;
        if (!text.trim()) return;
        onApplyToCanvas(text.trim());
        showToast("Prompt diterapkan ke Lab Canvas!");
    };

    const handleCopy = (text: string, formatId: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedFormat(formatId);
        showToast("Prompt berhasil disalin ke clipboard!");
        setTimeout(() => setCopiedFormat(null), 2000);
    };

    const handleRunAiDeepTransform = async (targetFmt: PromptFormatId) => {
        if (!rawInput.trim()) {
            showToast("Masukkan prompt terlebih dahulu untuk di-transform dengan AI");
            return;
        }
        setIsAiLoading(true);
        try {
            const aiText = await convertPromptWithAI(rawInput, targetFmt);
            setAiOverrides((prev) => ({ ...prev, [targetFmt]: aiText }));
            showToast(`Berhasil mentransformasi ke format ${targetFmt.toUpperCase()} dengan AI!`);
        } catch {
            showToast("Gagal melakukan AI deep transform, fallback ke rule-based.");
        } finally {
            setIsAiLoading(false);
        }
    };

    // Sample Prompts
    const loadSampleJapanese = () => {
        setRawInput(
            "score_9, score_8_up, masterpiece, best quality, ultra-detailed, nsfw, explicit, 1girl, 1boy, heterosexual, sex, cowgirl_position, straddling, sitting_on_lap, on_top, riding, vaginal_penetration, kissing, french_kiss, saliva, closed_eyes, blush, deep_blush, black_hair, long_hair, low_ponytail, bare_breasts, large_breasts, sideboob, big_ass, buttocks, ass_grab, yellow_kimono, yukata, off_shoulder, disrobed, white_socks, tabi, bald, muscular_male, shirtless_male, sweat, sweat_drops, motion_lines, japanese_room, shoji, sliding_door, futon, indoor, cel_shading"
        );
        setAiOverrides({});
    };

    const loadSampleRio = () => {
        setRawInput(
            "masterpiece, best quality, very aesthetic, newest, 1girl, solo, red eyes, halo, black hair, intricate braided crown updo, long braided ponytail, loose framing side tendrils, tall female, mature, slender, hourglass figure, slender waist, toned stomach, long legs, sweat, glistening skin, sweatdrops on neck and collarbone, wet skin, shiny skin texture, heavy breathing, melancholic intense expression, ornate Victorian gothic black dress, sheer lace sleeves, tight corset bodice, high-slit velvet skirt, sheer black thigh-high stockings, stiletto heels, theatrical standing pose, standing dramatically in front of a massive pipe organ, abandoned gothic cathedral, giant shattered stained-glass window, floating dust motes, volumetric moonlight beams, cinematic lighting, <lora:tsukatsuki_rio_illustrious:0.85>"
        );
        setAiOverrides({});
    };

    const loadSampleFluxNatural = () => {
        setRawInput(
            "An erotic 2D anime illustration. A woman with long dark hair in a disrobed ochre-yellow yukata straddles a muscular bald man on a white futon, passionately French kissing. Her bare breasts and curvaceous hips are highlighted by soft rim lighting filtering through traditional shoji screens. Subtle sweat glazes their skin, intimate atmosphere, warm shadows, cel shading, highly detailed anime screencap."
        );
        setAiOverrides({});
    };

    return (
        <div className="aps-deconstructor-view-wrapper">
            {/* Top Sub-Tab Navigation */}
            <div className="aps-subtab-bar" role="tablist">
                <button
                    type="button"
                    role="tab"
                    aria-selected={subTab === "transformer"}
                    className={`aps-subtab-btn ${subTab === "transformer" ? "active" : ""}`}
                    onClick={() => setSubTab("transformer")}
                >
                    <span>🔄 Universal Cross-Model Transformer</span>
                    <span className="aps-subtab-badge">7 Format</span>
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={subTab === "deconstructor"}
                    className={`aps-subtab-btn ${subTab === "deconstructor" ? "active" : ""}`}
                    onClick={() => {
                        setSubTab("deconstructor");
                        if (rawInput && !parsedResult) {
                            setParsedResult(deconstructPromptText(rawInput));
                        }
                    }}
                >
                    <span>🧩 10-Layer Visual Deconstructor</span>
                    <span className="aps-subtab-badge">Layer Parser</span>
                </button>
            </div>

            {/* Input Hero Section */}
            <div className="aps-deconstructor-hero">
                <div className="aps-deconstructor-hero-header">
                    <span className="aps-deconstructor-title">
                        {subTab === "transformer"
                            ? "Universal Cross-Model Prompt Transformer & Converter"
                            : "Smart Prompt Deconstructor (10-Layer Visual Breakdown)"}
                    </span>
                    <span className="aps-deconstructor-hint">
                        {subTab === "transformer"
                            ? "Tukar format prompt bebas secara instan antar Pony, Illustrious/NoobAI, Flux.1, Midjourney, NovelAI, SDXL Realistic, dan SD 1.5. Cukup tempel satu prompt di bawah."
                            : "Tempelkan prompt panjang/berantakan dari Civitai, Twitter, atau WebUI untuk membedahnya ke dalam 10 kategori visual."}
                    </span>
                </div>

                {/* Sample Strip */}
                <div className="aps-deconstructor-sample-strip">
                    <span className="aps-sample-label">Contoh Cepat:</span>
                    <button
                        type="button"
                        className="aps-sample-btn"
                        onClick={loadSampleJapanese}
                    >
                        👘 Japanese Kimono Intimate (Pony / Booru)
                    </button>
                    <button
                        type="button"
                        className="aps-sample-btn"
                        onClick={loadSampleFluxNatural}
                    >
                        📖 Natural Language Prose (Flux / MJ)
                    </button>
                    <button
                        type="button"
                        className="aps-sample-btn"
                        onClick={loadSampleRio}
                    >
                        🏛️ Rio Tsukatsuki Gothic (Illustrious XL)
                    </button>
                </div>

                {/* Input Textarea */}
                <div className="aps-deconstructor-input-box">
                    <textarea
                        className="aps-deconstructor-textarea"
                        rows={subTab === "transformer" ? 5 : 6}
                        placeholder={
                            subTab === "transformer"
                                ? "Tempelkan prompt dari format apa saja di sini (Danbooru tags, prosa Flux, NovelAI {brackets}, atau WebUI weights)..."
                                : "Tempelkan paragraf prompt panjang di sini (misal: masterpiece, 1girl, red eyes, gothic dress, cathedral, volumetric moonlight, <lora:rio:0.8>)..."
                        }
                        value={rawInput}
                        onChange={(e) => {
                            setRawInput(e.target.value);
                            setAiOverrides({});
                        }}
                    />

                    {/* Detected Source Banner */}
                    {rawInput.trim() && (
                        <div className="aps-detected-source-banner">
                            <div className="aps-detected-left">
                                <span>Deteksi Format Asal:</span>
                                <span className="aps-detected-badge">
                                    🔍 {PROMPT_FORMATS.find((f) => f.id === detected.format)?.name || detected.format}
                                </span>
                                <span style={{ color: "#64748b", fontSize: 11 }}>({detected.confidence})</span>
                            </div>
                            <button
                                type="button"
                                className="aps-clear-btn"
                                style={{ padding: "3px 8px", fontSize: 11 }}
                                onClick={() => {
                                    setRawInput("");
                                    setParsedResult(null);
                                    setAiOverrides({});
                                }}
                            >
                                Reset Input
                            </button>
                        </div>
                    )}

                    {subTab === "deconstructor" && (
                        <div className="aps-deconstructor-input-actions">
                            <button
                                type="button"
                                className="aps-deconstruct-btn"
                                onClick={handleParseDeconstructor}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="6" cy="6" r="3" />
                                    <circle cx="6" cy="18" r="3" />
                                    <line x1="20" y1="4" x2="8.12" y2="15.88" />
                                    <line x1="14.47" y1="14.48" x2="20" y2="20" />
                                    <line x1="8.12" y1="8.12" x2="12" y2="12" />
                                </svg>
                                <span>Bedah &amp; Pisahkan Tag</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ========================================================================= */}
            {/* VIEW 1: UNIVERSAL MULTI-MODEL PROMPT TRANSFORMER GRID                     */}
            {/* ========================================================================= */}
            {subTab === "transformer" && rawInput.trim() && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#f8fafc", margin: 0 }}>
                                ⚡ Hasil Konversi 7 Model AI (Instant Multi-Format)
                            </h3>
                            <span style={{ fontSize: 11, background: "rgba(37,99,235,0.15)", color: "#60a5fa", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                                Zero Latency
                            </span>
                        </div>
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>
                            Klik <strong>Salin</strong> atau <strong>Buka di Canvas</strong> pada format tujuan yang diinginkan:
                        </span>
                    </div>

                    <div className="aps-transformer-grid">
                        {PROMPT_FORMATS.map((fmt) => {
                            const outputText = convertedOutputs[fmt.id] || "";
                            const isSource = detected.format === fmt.id;
                            const isCopied = copiedFormat === fmt.id;

                            return (
                                <div
                                    key={fmt.id}
                                    className="aps-transformer-card"
                                    style={{
                                        borderColor: isSource ? fmt.color : undefined,
                                        boxShadow: isSource ? `0 0 0 1px ${fmt.color}33` : undefined,
                                    }}
                                >
                                    <div className="aps-transformer-card-header">
                                        <div className="aps-transformer-card-title-group">
                                            <span
                                                className="aps-transformer-format-indicator"
                                                style={{ background: fmt.color }}
                                            />
                                            <span className="aps-transformer-card-name">{fmt.name}</span>
                                            {isSource && (
                                                <span style={{ fontSize: 10, background: fmt.color, color: "#fff", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                                                    SOURCE
                                                </span>
                                            )}
                                        </div>
                                        <span className="aps-transformer-badge">{fmt.badge}</span>
                                    </div>

                                    <span className="aps-transformer-card-desc">{fmt.description}</span>

                                    {/* Output Prompt Box */}
                                    <div className="aps-transformer-output-box" title="Klik ganda untuk memilih seluruh teks">
                                        {outputText}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="aps-transformer-card-actions">
                                        <button
                                            type="button"
                                            className={`aps-transformer-btn ${isCopied ? "primary" : "secondary"}`}
                                            onClick={() => handleCopy(outputText, fmt.id)}
                                        >
                                            <span>{isCopied ? "✓ Tersalin!" : "📋 Salin Prompt"}</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="aps-transformer-btn secondary"
                                            onClick={() => handleApplyCanvas(outputText)}
                                            title="Kirim ke Canvas Editor Lab"
                                        >
                                            <span>🚀 Ke Canvas</span>
                                        </button>
                                        {(fmt.id === "flux" || fmt.id === "midjourney") && (
                                            <button
                                                type="button"
                                                className="aps-transformer-btn secondary"
                                                disabled={isAiLoading}
                                                onClick={() => handleRunAiDeepTransform(fmt.id)}
                                                title="Transformasi menggunakan AI Vision/LLM agar lebih puitis dan mengalir alami"
                                            >
                                                <span>✨ AI Polish</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW 2: 10-LAYER VISUAL DECONSTRUCTOR                                     */}
            {/* ========================================================================= */}
            {subTab === "deconstructor" && parsedResult && (
                <div className="aps-parsed-results-section">
                    <div className="aps-parsed-header">
                        <div className="aps-parsed-title-group">
                            <h3 className="aps-parsed-title">Hasil Pemisahan 10 Kategori</h3>
                            <span className="aps-parsed-badge">
                                {parsedResult.classifiedCount} tag teridentifikasi
                            </span>
                            {parsedResult.lora && (
                                <span className="aps-parsed-lora-badge">
                                    LoRA: &lt;lora:{parsedResult.lora.name}:{parsedResult.lora.weight.toFixed(2)}&gt;
                                </span>
                            )}
                        </div>

                        <div className="aps-parsed-actions">
                            <button
                                type="button"
                                className="aps-apply-btn primary"
                                onClick={() => handleApplyStudio()}
                            >
                                Terapkan ke 10-Layer Studio →
                            </button>
                            <button
                                type="button"
                                className="aps-apply-btn"
                                onClick={() => handleApplyCanvas()}
                            >
                                Buka di Lab Canvas →
                            </button>
                        </div>
                    </div>

                    <div className="aps-parsed-grid">
                        {CATEGORIES.map((cat) => {
                            const tags = parsedResult.buckets[cat.id] || "";
                            const tagList = tags.split(",").map((s) => s.trim()).filter(Boolean);

                            return (
                                <div
                                    key={cat.id}
                                    className={`aps-parsed-card ${tagList.length > 0 ? "has-tags" : "empty"}`}
                                >
                                    <div className="aps-parsed-card-header">
                                        <span className="aps-parsed-card-num">{cat.num}</span>
                                        <span className="aps-parsed-card-title">{cat.title}</span>
                                        <span className="aps-parsed-card-count">{tagList.length} tag</span>
                                    </div>

                                    {tagList.length > 0 ? (
                                        <div className="aps-parsed-tags-wrap">
                                            {tagList.map((tag) => (
                                                <span key={tag} className="aps-parsed-tag-item">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="aps-parsed-empty-text">Tidak ada tag terdeteksi</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
