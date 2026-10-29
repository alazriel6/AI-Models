import React, { useState, useMemo, useEffect } from "react";
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

interface PromptSegment {
    type: "prefix" | "core" | "suffix" | "lora";
    text: string;
}

/**
 * Parses converted output into prefix, core tags, suffix, and LoRA tokens
 * for instant visual diff/syntax highlighting.
 */
function parsePromptHighlight(text: string, formatId: PromptFormatId): PromptSegment[] {
    if (!text) return [];

    let prefix = "";
    let suffix = "";
    let core = text;

    switch (formatId) {
        case "pony": {
            const m = core.match(
                /^((?:score_\d(?:_up)?,?\s*|rating:(?:explicit|questionable|safe|general),?\s*|masterpiece,?\s*|best quality,?\s*|ultra-detailed,?\s*)+)(.*)$/i
            );
            if (m) {
                prefix = m[1];
                core = m[2];
            }
            break;
        }
        case "illustrious": {
            const m = core.match(
                /^((?:masterpiece,?\s*|best quality,?\s*|very aesthetic,?\s*|ultra-detailed,?\s*|nsfw,?\s*|explicit,?\s*)+)(.*)$/i
            );
            if (m) {
                prefix = m[1];
                core = m[2];
            }
            break;
        }
        case "animagine": {
            const m = core.match(
                /^((?:masterpiece,?\s*|best quality,?\s*|very aesthetic,?\s*|newest,?\s*|ultra-detailed,?\s*|nsfw,?\s*|explicit,?\s*)+)(.*)$/i
            );
            if (m) {
                prefix = m[1];
                core = m[2];
            }
            const sm = core.match(/^(.*?)((?:,\s*rating:(?:explicit|general))+)(.*)$/i);
            if (sm) {
                core = sm[1];
                suffix = sm[2] + sm[3];
            }
            break;
        }
        case "novelai": {
            const m = core.match(
                /^((?:\{masterpiece\},?\s*|\{best quality\},?\s*|nsfw,?\s*|explicit,?\s*)+)(.*)$/i
            );
            if (m) {
                prefix = m[1];
                core = m[2];
            }
            break;
        }
        case "flux": {
            const m = core.match(
                /^((?:An erotic 2D anime illustration featuring|A highly detailed vibrant anime illustration depicting)\s*)(.*)$/i
            );
            if (m) {
                prefix = m[1];
                core = m[2];
            }
            const sm = core.match(
                /^(.*?)(\.\s*Beautiful atmospheric lighting, highly detailed anime screencap, studio quality, sharp focus, 8k resolution\.?)(.*)$/i
            );
            if (sm) {
                core = sm[1];
                suffix = sm[2] + sm[3];
            }
            break;
        }
        case "midjourney": {
            const m = core.match(
                /^((?:An erotic anime artwork depicting|A stunning anime style illustration of)\s*)(.*)$/i
            );
            if (m) {
                prefix = m[1];
                core = m[2];
            }
            const sm = core.match(
                /^(.*?)((?:,\s*cinematic anime screencap, soft rim lighting, exquisite details)?\s*--ar\s+[\d:]+\s+--v\s+[\d.]+\s+--stylize\s+\d+)(.*)$/i
            );
            if (sm) {
                core = sm[1];
                suffix = sm[2] + sm[3];
            }
            break;
        }
        case "sdxl_realistic": {
            const m = core.match(
                /^((?:photorealistic,?\s*|hyperrealistic 8k uhd,?\s*|dslr,?\s*|high quality,?\s*|natural skin texture,?\s*|soft cinematic lighting,?\s*|soft ambient lighting,?\s*|award winning photography,?\s*|nsfw,?\s*|explicit,?\s*)+)(.*)$/i
            );
            if (m) {
                prefix = m[1];
                core = m[2];
            }
            const sm = core.match(/^(.*?)((?:,\s*subsurface scattering,?\s*film grain,?\s*Fujifilm XT4)+)(.*)$/i);
            if (sm) {
                core = sm[1];
                suffix = sm[2] + sm[3];
            }
            break;
        }
        case "sd15": {
            const m = core.match(
                /^((?:masterpiece,?\s*|best quality,?\s*|ultra-detailed,?\s*|highly detailed,?\s*|sharp focus,?\s*)+)(.*)$/i
            );
            if (m) {
                prefix = m[1];
                core = m[2];
            }
            break;
        }
    }

    const segments: PromptSegment[] = [];
    if (prefix) {
        segments.push({ type: "prefix", text: prefix });
    }

    if (core) {
        const loraRegex = /(<lora:[^>]+>)/g;
        let lastIdx = 0;
        let match: RegExpExecArray | null;
        while ((match = loraRegex.exec(core)) !== null) {
            if (match.index > lastIdx) {
                segments.push({ type: "core", text: core.slice(lastIdx, match.index) });
            }
            segments.push({ type: "lora", text: match[1] });
            lastIdx = match.index + match[1].length;
        }
        if (lastIdx < core.length) {
            segments.push({ type: "core", text: core.slice(lastIdx) });
        }
    }

    if (suffix) {
        segments.push({ type: "suffix", text: suffix });
    }

    return segments.length > 0 ? segments : [{ type: "core", text }];
}

export const DeconstructorView: React.FC<DeconstructorViewProps> = ({
    onApplyToStudio,
    onApplyToCanvas,
    showToast,
}) => {
    const [subTab, setSubTab] = useState<"transformer" | "deconstructor">(() => {
        try {
            const s = localStorage.getItem("deconstructor_last_subtab");
            if (s === "transformer" || s === "deconstructor") return s;
        } catch {}
        return "transformer";
    });
    const [rawInput, setRawInput] = useState<string>(() => {
        try {
            return localStorage.getItem("deconstructor_last_raw_input") || "";
        } catch {
            return "";
        }
    });
    const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
    const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
    const [filterMode, setFilterMode] = useState<"all" | "booru" | "prose">(() => {
        try {
            const s = localStorage.getItem("deconstructor_last_filter_mode");
            if (s === "all" || s === "booru" || s === "prose") return s;
        } catch {}
        return "all";
    });
    const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

    // AI Overrides state for individual formats (if user ran AI Deep Transform)
    const [aiOverrides, setAiOverrides] = useState<Record<string, string>>({});

    // 10-Layer deconstruction state (restores parsedResult if rawInput was cached)
    const [parsedResult, setParsedResult] = useState<{
        buckets: Record<string, string>;
        lora?: { name: string; weight: number };
        totalTags: number;
        classifiedCount: number;
    } | null>(() => {
        try {
            const saved = localStorage.getItem("deconstructor_last_raw_input");
            if (saved && saved.trim()) {
                return deconstructPromptText(saved);
            }
        } catch {}
        return null;
    });

    useEffect(() => {
        try {
            localStorage.setItem("deconstructor_last_subtab", subTab);
        } catch {}
    }, [subTab]);

    useEffect(() => {
        try {
            localStorage.setItem("deconstructor_last_raw_input", rawInput);
        } catch {}
    }, [rawInput]);

    useEffect(() => {
        try {
            localStorage.setItem("deconstructor_last_filter_mode", filterMode);
        } catch {}
    }, [filterMode]);

    // Auto-detection of input format
    const detected = useMemo(() => {
        return detectPromptFormat(rawInput);
    }, [rawInput]);

    // Human-friendly detection badge label
    const detectedLabel = useMemo(() => {
        if (!rawInput.trim()) return "Belum Ada Input";
        const meta = PROMPT_FORMATS.find((f) => f.id === detected.format);
        const modelName = detected.format === "sd15" ? "Classic SD 1.5" : (meta?.name || detected.format);
        const syntaxName = detected.format === "sd15" ? "Tag Koma" : (meta?.badge || "Auto");
        return `${modelName} (${syntaxName})`;
    }, [rawInput, detected]);

    // Computed conversions for all 8 target formats
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

    // Formats filtered by category (All 8, Booru/Tag 5, Natural Prose 3)
    const displayedFormats = useMemo(() => {
        if (filterMode === "booru") {
            return PROMPT_FORMATS.filter((f) =>
                ["pony", "illustrious", "animagine", "novelai", "sd15"].includes(f.id)
            );
        }
        if (filterMode === "prose") {
            return PROMPT_FORMATS.filter((f) =>
                ["flux", "midjourney", "sdxl_realistic"].includes(f.id)
            );
        }
        return PROMPT_FORMATS;
    }, [filterMode]);

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

    const handleClear = () => {
        setRawInput("");
        setParsedResult(null);
        setAiOverrides({});
        setExpandedCardId(null);
        showToast("Input berhasil dibersihkan");
    };

    // Quick Sample Prompts (Pure text, no emojis)
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
            {/* Top Sub-Tab Navigation (Clean Segmented Tab) */}
            <div className="aps-subtab-bar" role="tablist">
                <button
                    type="button"
                    role="tab"
                    aria-selected={subTab === "transformer"}
                    className={`aps-subtab-btn ${subTab === "transformer" ? "active" : ""}`}
                    onClick={() => setSubTab("transformer")}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="16 3 21 3 21 9" />
                        <line x1="4" y1="20" x2="21" y2="3" />
                        <polyline points="21 16 21 21 16 21" />
                        <line x1="15" y1="15" x2="21" y2="21" />
                        <line x1="4" y1="4" x2="9" y2="9" />
                    </svg>
                    <span>Cross-Model Transformer (8 Format)</span>
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 17 12 22 22 17" />
                        <polyline points="2 12 12 17 22 12" />
                    </svg>
                    <span>10-Layer Visual Deconstructor</span>
                </button>
            </div>

            {/* Input Hero Section (Clean Developer Bar) */}
            <div className="aps-deconstructor-hero">
                <div className="aps-deconstructor-top-bar">
                    <div className="aps-deconstructor-source-label-group">
                        <span className="aps-source-label">PROMPT SUMBER (INPUT)</span>
                        <div className="aps-detected-badge-solid">
                            <span className="aps-detected-dot" />
                            <span>
                                {rawInput.trim() ? `Terdeteksi: ${detectedLabel}` : "Menunggu Input..."}
                            </span>
                        </div>
                    </div>

                    <div className="aps-deconstructor-sample-strip">
                        <span className="aps-sample-label">Contoh Cepat:</span>
                        <button
                            type="button"
                            className="aps-sample-btn"
                            onClick={loadSampleJapanese}
                        >
                            Pony / Booru
                        </button>
                        <button
                            type="button"
                            className="aps-sample-btn"
                            onClick={loadSampleFluxNatural}
                        >
                            Prosa Natural Flux/MJ
                        </button>
                        <button
                            type="button"
                            className="aps-sample-btn"
                            onClick={loadSampleRio}
                        >
                            Illustrious XL
                        </button>
                        {rawInput.trim() && (
                            <button
                                type="button"
                                className="aps-clear-btn"
                                onClick={handleClear}
                                title="Hapus teks input dan reset"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                                <span>Bersihkan</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Input Textarea (spellcheck=false, solid zinc palette) */}
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
                        spellCheck={false}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        onChange={(e) => {
                            setRawInput(e.target.value);
                            setAiOverrides({});
                        }}
                    />

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
            {subTab === "transformer" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {/* Section Header with Quick View Filter */}
                    <div className="aps-transformer-section-header">
                        <h3 className="aps-transformer-section-title">
                            Hasil Konversi Multi-Arsitektur (8 Format)
                        </h3>

                        <div className="aps-transformer-filter-group">
                            <span className="aps-filter-label">Filter Tampilan:</span>
                            <div className="aps-filter-buttons">
                                <button
                                    type="button"
                                    className={`aps-filter-btn ${filterMode === "all" ? "active" : ""}`}
                                    onClick={() => setFilterMode("all")}
                                >
                                    Semua (8)
                                </button>
                                <button
                                    type="button"
                                    className={`aps-filter-btn ${filterMode === "booru" ? "active" : ""}`}
                                    onClick={() => setFilterMode("booru")}
                                >
                                    Booru/Tag (5)
                                </button>
                                <button
                                    type="button"
                                    className={`aps-filter-btn ${filterMode === "prose" ? "active" : ""}`}
                                    onClick={() => setFilterMode("prose")}
                                >
                                    Natural Prose (3)
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 4 Columns x 2 Rows Production Grid */}
                    <div className="aps-transformer-grid">
                        {displayedFormats.map((fmt) => {
                            const outputText = convertedOutputs[fmt.id] || "";
                            const isSource = Boolean(rawInput.trim()) && detected.format === fmt.id;
                            const isCopied = copiedFormat === fmt.id;
                            const isExpanded = expandedCardId === fmt.id;
                            const segments = parsePromptHighlight(outputText, fmt.id);

                            return (
                                <div
                                    key={fmt.id}
                                    className={`aps-transformer-card ${isSource ? "is-source" : ""}`}
                                >
                                    {/* 1-Line Dense Header */}
                                    <div className="aps-transformer-card-header">
                                        <div className="aps-transformer-card-title-group">
                                            <span
                                                className="aps-transformer-dot"
                                                style={{ background: isSource ? "#10b981" : "#3b82f6" }}
                                            />
                                            <span className="aps-transformer-card-name">{fmt.name}</span>
                                            {isSource && (
                                                <span className="aps-source-badge">
                                                    Format Asal
                                                </span>
                                            )}
                                        </div>
                                        <span className="aps-transformer-syntax-badge">{fmt.badge}</span>
                                    </div>

                                    {/* Output Prompt Box (Hidden scrollbars, Diff syntax highlight) */}
                                    <div
                                        className={`aps-transformer-output-box scrollbar-none ${
                                            isExpanded ? "is-expanded" : ""
                                        }`}
                                        title="Klik ganda untuk memilih seluruh teks"
                                    >
                                        {outputText ? (
                                            segments.map((seg, idx) => {
                                                if (seg.type === "prefix" || seg.type === "suffix") {
                                                    return (
                                                        <span key={idx} className="syntax-prefix">
                                                            {seg.text}
                                                        </span>
                                                    );
                                                }
                                                if (seg.type === "lora") {
                                                    return (
                                                        <span key={idx} className="syntax-lora">
                                                            {seg.text}
                                                        </span>
                                                    );
                                                }
                                                return (
                                                    <span key={idx} className="syntax-core">
                                                        {seg.text}
                                                    </span>
                                                );
                                            })
                                        ) : (
                                            <span className="aps-placeholder-text">
                                                // Tempelkan prompt sumber di atas untuk melihat konversi langsung
                                            </span>
                                        )}

                                        {/* Expand Toggle Button */}
                                        {outputText && outputText.length > 90 && (
                                            <button
                                                type="button"
                                                className="aps-expand-toggle-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setExpandedCardId(isExpanded ? null : fmt.id);
                                                }}
                                                title={isExpanded ? "Perkecil Tampilan" : "Perbesar Tampilan"}
                                            >
                                                {isExpanded ? (
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="4 14 10 14 10 20" />
                                                        <polyline points="20 10 14 10 14 4" />
                                                        <line x1="14" y1="10" x2="21" y2="3" />
                                                        <line x1="3" y1="21" x2="10" y2="14" />
                                                    </svg>
                                                ) : (
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="15 3 21 3 21 9" />
                                                        <polyline points="9 21 3 21 3 15" />
                                                        <line x1="21" y1="3" x2="14" y2="10" />
                                                        <line x1="3" y1="21" x2="10" y2="14" />
                                                    </svg>
                                                )}
                                            </button>
                                        )}
                                    </div>

                                    {/* Action Buttons Footer (Solid & Tight) */}
                                    <div className="aps-transformer-card-actions">
                                        <button
                                            type="button"
                                            className={`aps-transformer-action-btn primary ${isCopied ? "copied" : ""}`}
                                            onClick={() => handleCopy(outputText, fmt.id)}
                                            disabled={!outputText}
                                        >
                                            {isCopied ? (
                                                <>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                    <span>Tersalin!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                    </svg>
                                                    <span>Salin Prompt</span>
                                                </>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            className="aps-transformer-action-btn secondary"
                                            onClick={() => handleApplyCanvas(outputText)}
                                            title="Kirim ke Canvas Editor Lab"
                                            disabled={!outputText}
                                        >
                                            <span>Ke Canvas</span>
                                        </button>
                                        {(fmt.id === "flux" || fmt.id === "midjourney") && (
                                            <button
                                                type="button"
                                                className="aps-transformer-action-btn ai-polish"
                                                disabled={isAiLoading || !rawInput.trim()}
                                                onClick={() => handleRunAiDeepTransform(fmt.id)}
                                                title="Transformasi menggunakan AI agar prosa lebih alami dan mengalir"
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                                                </svg>
                                                <span>Perhalus Prosa (AI)</span>
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
