import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getModels, type Model } from "../../api/models";
import { resolveImageUrl } from "../../api/client";
import { downloadTextAsFile } from "../../utils/exportFormats";
import "../../style/LoraStack.css";

// Clean Unified Technical SVG Icons (100% Monochrome / Single-Color)
const Icons = {
    Layers: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
        </svg>
    ),
    Sliders: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="21" x2="4" y2="14" />
            <line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" />
            <line x1="20" y1="12" x2="20" y2="3" />
            <line x1="1" y1="14" x2="7" y2="14" />
            <line x1="9" y1="8" x2="15" y2="8" />
            <line x1="17" y1="16" x2="23" y2="16" />
        </svg>
    ),
    Copy: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
    ),
    Check: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
    Trash: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
    ),
    ArrowUp: () => (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
        </svg>
    ),
    ArrowDown: () => (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
        </svg>
    ),
    Plus: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    ),
    Alert: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    ),
    ExternalLink: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
    ),
    Download: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
    ),
};

export interface StackTriggerWord {
    text: string;
    enabled: boolean;
}

export interface StackItem {
    id: string;
    modelId?: number;
    name: string;
    fileName: string;
    baseModel: string;
    thumbnailUrl?: string;
    weight: number;
    teWeight?: number;
    isDualWeight: boolean;
    enabled: boolean;
    category: "style" | "character" | "outfit" | "detailer" | "lighting" | "concept";
    triggerWords: StackTriggerWord[];
    isCustom?: boolean;
}

interface SavedPreset {
    id: string;
    title: string;
    timestamp: string;
    items: StackItem[];
    basePrompt: string;
}

const DEFAULT_LORA_PRESETS: { label: string; desc: string; items: StackItem[] }[] = [
    {
        label: "Anime Sparkle & Eyes",
        desc: "Detailed iris highlights + soft bloom",
        items: [
            {
                id: "preset-1",
                name: "Detailed Anime Eyes LoRA",
                fileName: "detailed_eyes_ilus",
                baseModel: "Illustrious",
                thumbnailUrl: "/images/preview-1.png",
                weight: 0.85,
                isDualWeight: false,
                enabled: true,
                category: "detailer",
                triggerWords: [
                    { text: "detailed eyes", enabled: true },
                    { text: "sparkle eyes", enabled: true },
                    { text: "expressive pupils", enabled: true },
                ],
            },
            {
                id: "preset-2",
                name: "Soft Pastel Bloom LoRA",
                fileName: "soft_pastel_bloom",
                baseModel: "Illustrious",
                thumbnailUrl: "/images/preview-2.png",
                weight: 0.60,
                isDualWeight: false,
                enabled: true,
                category: "style",
                triggerWords: [
                    { text: "pastel glow", enabled: true },
                    { text: "soft bloom", enabled: true },
                ],
            },
        ],
    },
    {
        label: "Urban Streetwear Style",
        desc: "Techwear clothing accents + modern anime linework",
        items: [
            {
                id: "preset-3",
                name: "Streetwear Aesthetic LoRA",
                fileName: "streetwear_aesthetic",
                baseModel: "NoobAI",
                thumbnailUrl: "/images/preview-2.png",
                weight: 0.80,
                isDualWeight: false,
                enabled: true,
                category: "outfit",
                triggerWords: [
                    { text: "streetwear", enabled: true },
                    { text: "oversized jacket", enabled: true },
                    { text: "bucket hat", enabled: false },
                ],
            },
            {
                id: "preset-4",
                name: "Detailed Anime Eyes LoRA",
                fileName: "detailed_eyes_ilus",
                baseModel: "Illustrious",
                thumbnailUrl: "/images/preview-1.png",
                weight: 0.65,
                isDualWeight: false,
                enabled: true,
                category: "detailer",
                triggerWords: [
                    { text: "detailed eyes", enabled: true },
                    { text: "expressive pupils", enabled: true },
                ],
            },
        ],
    },
];

export default function LoraStack() {
    const navigate = useNavigate();

    // Catalog LoRAs from Database
    const [allCatalogModels, setAllCatalogModels] = useState<Model[]>([]);
    const [catalogLoading, setCatalogLoading] = useState(true);

    // Target Base Model Architecture filter
    const [targetArch, setTargetArch] = useState<string>("Illustrious");

    // Active LoRA Stack
    const [stack, setStack] = useState<StackItem[]>(() => DEFAULT_LORA_PRESETS[0].items);

    // Base user prompt
    const [basePrompt, setBasePrompt] = useState<string>(
        "masterpiece, best quality, ultra-detailed illustration, 1girl, solo, looking at viewer, cinematic lighting"
    );

    // Add LoRA Tab state
    const [addTab, setAddTab] = useState<"catalog" | "custom">("catalog");
    const [catalogSearch, setCatalogSearch] = useState<string>("");

    // Custom LoRA Form state
    const [customName, setCustomName] = useState<string>("");
    const [customFileName, setCustomFileName] = useState<string>("");
    const [customBaseModel, setCustomBaseModel] = useState<string>("Illustrious");
    const [customCategory, setCustomCategory] = useState<StackItem["category"]>("style");
    const [customTriggers, setCustomTriggers] = useState<string>("");
    const [customWeight, setCustomWeight] = useState<number>(0.8);

    // Output Syntax Tab state
    const [outputTab, setOutputTab] = useState<"a1111" | "comfy" | "clean" | "json">("a1111");

    // Copy Feedback
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // LocalStorage Saved Stacks
    const [savedPresets, setSavedPresets] = useState<SavedPreset[]>(() => {
        try {
            const raw = localStorage.getItem("mg_lora_saved_presets");
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });
    const [saveTitleInput, setSaveTitleInput] = useState<string>("");
    const [isSavingDrawerOpen, setIsSavingDrawerOpen] = useState<boolean>(false);

    // Fetch models on mount
    useEffect(() => {
        let isMounted = true;
        getModels({ limit: 100 })
            .then((res) => {
                if (!isMounted) return;
                const models = res.data || [];
                setAllCatalogModels(models);
            })
            .catch(() => {
                // If backend is unreachable, continue with fallback
            })
            .finally(() => {
                if (isMounted) setCatalogLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    // Filtered Catalog LoRAs
    const catalogLoras = useMemo(() => {
        return allCatalogModels.filter((m) => {
            const isLora = (m.type || "").toLowerCase() === "lora";
            if (!isLora) return false;
            if (catalogSearch.trim()) {
                const q = catalogSearch.toLowerCase();
                const matchName = m.name.toLowerCase().includes(q);
                const matchBase = (m.base_model || "").toLowerCase().includes(q);
                const matchTrig = (m.trigger_words || []).some((tw) =>
                    tw.trigger_word.toLowerCase().includes(q)
                );
                return matchName || matchBase || matchTrig;
            }
            return true;
        });
    }, [allCatalogModels, catalogSearch]);

    // Active (Non-bypassed) LoRAs
    const activeLayers = useMemo(() => stack.filter((item) => item.enabled), [stack]);

    // Total Net Weight & Burnout Calculation
    const totalNetWeight = useMemo(() => {
        return activeLayers.reduce((sum, item) => sum + (item.weight > 0 ? item.weight : 0), 0);
    }, [activeLayers]);

    // Health Status
    const healthStatus = useMemo(() => {
        if (totalNetWeight <= 1.25) {
            return {
                level: "green" as const,
                title: "Optimal Balance",
                advice: "Sweet spot. Crisp features with minimal risk of artifacting or oversaturated edges.",
            };
        } else if (totalNetWeight <= 1.75) {
            return {
                level: "yellow" as const,
                title: "High Saturation",
                advice: "Heavy LoRA influence. Consider lowering your CFG Scale by 0.5–1.0 if colors appear overcooked.",
            };
        } else {
            return {
                level: "red" as const,
                title: "Over-baked Burnout Risk",
                advice: "High risk of deep-frying, double limbs, or noisy lineart. Click 'Auto-Normalize' to balance weights.",
            };
        }
    }, [totalNetWeight]);

    // Cross-Architecture Warnings
    const archMismatches = useMemo(() => {
        if (!targetArch || targetArch === "All") return [];
        return activeLayers.filter(
            (item) => item.baseModel && item.baseModel.toLowerCase() !== targetArch.toLowerCase()
        );
    }, [activeLayers, targetArch]);

    // Aggregated Trigger Words (Deduplicated)
    const aggregatedTriggers = useMemo(() => {
        const seen = new Set<string>();
        const list: string[] = [];
        activeLayers.forEach((layer) => {
            layer.triggerWords.forEach((tw) => {
                if (tw.enabled) {
                    const clean = tw.text.trim();
                    const lower = clean.toLowerCase();
                    if (clean && !seen.has(lower)) {
                        seen.add(lower);
                        list.push(clean);
                    }
                }
            });
        });
        return list;
    }, [activeLayers]);

    // Formatted Syntaxes
    const formattedSyntaxes = useMemo(() => {
        // 1. Automatic1111 / Forge Syntax
        const loraTags = activeLayers
            .map((item) => {
                const fname = item.fileName || item.name.toLowerCase().replace(/\s+/g, "_");
                if (item.isDualWeight && item.teWeight !== undefined) {
                    return `<lora:${fname}:${item.weight.toFixed(2)}:${item.teWeight.toFixed(2)}>`;
                }
                return `<lora:${fname}:${item.weight.toFixed(2)}>`;
            })
            .join(" ");

        const triggersString = aggregatedTriggers.join(", ");
        const fullA1111Prompt = [loraTags, triggersString, basePrompt.trim()]
            .filter(Boolean)
            .join(", ");

        // 2. ComfyUI LoRA Stack
        const comfyTuples = activeLayers.map((item) => {
            const fname = item.fileName || item.name.toLowerCase().replace(/\s+/g, "_");
            const wModel = item.weight;
            const wClip = item.isDualWeight && item.teWeight !== undefined ? item.teWeight : item.weight;
            return `  ("${fname}", ${wModel.toFixed(2)}, ${wClip.toFixed(2)})`;
        });
        const comfyCode = `# ComfyUI LoRA Stack Configuration\nlora_stack = [\n${comfyTuples.join(",\n")}\n]\n\n# Positive Conditioning:\npositive_prompt = """${[triggersString, basePrompt.trim()].filter(Boolean).join(", ")}"""`;

        // 3. Clean Prompt (No LoRA tags)
        const cleanPrompt = [triggersString, basePrompt.trim()].filter(Boolean).join(", ");

        // 4. JSON Blueprint
        const jsonBlueprint = JSON.stringify(
            {
                target_architecture: targetArch,
                total_weight: Number(totalNetWeight.toFixed(2)),
                active_loras: activeLayers.map((item) => ({
                    name: item.name,
                    file_name: item.fileName,
                    base_model: item.baseModel,
                    model_weight: item.weight,
                    clip_weight: item.isDualWeight && item.teWeight !== undefined ? item.teWeight : item.weight,
                    active_triggers: item.triggerWords.filter((tw) => tw.enabled).map((tw) => tw.text),
                })),
                compiled_prompt: fullA1111Prompt,
            },
            null,
            2
        );

        return {
            a1111: fullA1111Prompt,
            comfy: comfyCode,
            clean: cleanPrompt,
            json: jsonBlueprint,
        };
    }, [activeLayers, aggregatedTriggers, basePrompt, targetArch, totalNetWeight]);

    // Handlers for Layer Management
    const handleMoveLayer = (index: number, direction: "up" | "down") => {
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= stack.length) return;
        const next = [...stack];
        const [moved] = next.splice(index, 1);
        next.splice(targetIndex, 0, moved);
        setStack(next);
    };

    const handleToggleLayer = (id: string) => {
        setStack((prev) =>
            prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
        );
    };

    const handleDeleteLayer = (id: string) => {
        setStack((prev) => prev.filter((item) => item.id !== id));
    };

    const handleWeightChange = (id: string, weight: number) => {
        const clamped = Math.max(-2, Math.min(2, weight));
        setStack((prev) =>
            prev.map((item) => (item.id === id ? { ...item, weight: clamped } : item))
        );
    };

    const handleTeWeightChange = (id: string, teWeight: number) => {
        const clamped = Math.max(-2, Math.min(2, teWeight));
        setStack((prev) =>
            prev.map((item) => (item.id === id ? { ...item, teWeight: clamped } : item))
        );
    };

    const handleToggleDualWeight = (id: string) => {
        setStack((prev) =>
            prev.map((item) => {
                if (item.id !== id) return item;
                const nextDual = !item.isDualWeight;
                return {
                    ...item,
                    isDualWeight: nextDual,
                    teWeight: nextDual ? (item.teWeight ?? item.weight) : undefined,
                };
            })
        );
    };

    const handleToggleTriggerWord = (layerId: string, triggerText: string) => {
        setStack((prev) =>
            prev.map((item) => {
                if (item.id !== layerId) return item;
                const nextTriggers = item.triggerWords.map((tw) =>
                    tw.text === triggerText ? { ...tw, enabled: !tw.enabled } : tw
                );
                return { ...item, triggerWords: nextTriggers };
            })
        );
    };

    const handleSetAllTriggers = (layerId: string, enabled: boolean) => {
        setStack((prev) =>
            prev.map((item) => {
                if (item.id !== layerId) return item;
                const nextTriggers = item.triggerWords.map((tw) => ({ ...tw, enabled }));
                return { ...item, triggerWords: nextTriggers };
            })
        );
    };

    // Auto-normalize weights so total is 1.20
    const handleAutoNormalize = () => {
        if (totalNetWeight <= 0) return;
        const targetSum = 1.20;
        const factor = targetSum / totalNetWeight;
        setStack((prev) =>
            prev.map((item) => {
                if (!item.enabled || item.weight <= 0) return item;
                const newWeight = Math.round(item.weight * factor * 20) / 20; // round to 0.05
                return {
                    ...item,
                    weight: Math.max(0.05, newWeight),
                    teWeight: item.teWeight ? Math.max(0.05, Math.round(item.teWeight * factor * 20) / 20) : undefined,
                };
            })
        );
    };

    // Scale down by 25%
    const handleScaleDown = () => {
        setStack((prev) =>
            prev.map((item) => {
                if (!item.enabled || item.weight <= 0) return item;
                const newWeight = Math.round(item.weight * 0.75 * 20) / 20;
                return {
                    ...item,
                    weight: Math.max(0.1, newWeight),
                    teWeight: item.teWeight ? Math.max(0.1, Math.round(item.teWeight * 0.75 * 20) / 20) : undefined,
                };
            })
        );
    };

    // Add LoRA from Catalog
    const handleAddFromCatalog = (model: Model) => {
        const firstVersion = model.versions && model.versions[0];
        const fileName = (firstVersion?.file_name || model.slug || model.name)
            .replace(/\.safetensors$/i, "")
            .replace(/\s+/g, "_");

        const triggers: StackTriggerWord[] = (model.trigger_words || []).map((tw) => ({
            text: tw.trigger_word,
            enabled: true,
        }));

        const newItem: StackItem = {
            id: `cat-${model.id}-${Date.now()}`,
            modelId: model.id,
            name: model.name,
            fileName: fileName,
            baseModel: model.base_model || "Illustrious",
            thumbnailUrl: model.thumbnail_url,
            weight: 0.8,
            isDualWeight: false,
            enabled: true,
            category: "style",
            triggerWords: triggers.length > 0 ? triggers : [{ text: model.name.toLowerCase(), enabled: true }],
        };

        setStack((prev) => [...prev, newItem]);
    };

    // Add Custom LoRA
    const handleAddCustom = (e: React.FormEvent) => {
        e.preventDefault();
        if (!customName.trim()) return;

        const cleanFileName = (customFileName.trim() || customName.trim())
            .replace(/\.safetensors$/i, "")
            .replace(/\s+/g, "_");

        const triggersList: StackTriggerWord[] = customTriggers
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
            .map((t) => ({ text: t, enabled: true }));

        const newItem: StackItem = {
            id: `custom-${Date.now()}`,
            name: customName.trim(),
            fileName: cleanFileName,
            baseModel: customBaseModel,
            weight: customWeight,
            isDualWeight: false,
            enabled: true,
            category: customCategory,
            triggerWords: triggersList,
            isCustom: true,
        };

        setStack((prev) => [...prev, newItem]);
        setCustomName("");
        setCustomFileName("");
        setCustomTriggers("");
    };

    // Copy to Clipboard
    const handleCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    // Save Preset to LocalStorage
    const handleSavePreset = () => {
        if (!saveTitleInput.trim()) return;
        const newPreset: SavedPreset = {
            id: `saved-${Date.now()}`,
            title: saveTitleInput.trim(),
            timestamp: new Date().toLocaleDateString("id-ID", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            }),
            items: stack,
            basePrompt,
        };
        const updated = [newPreset, ...savedPresets];
        setSavedPresets(updated);
        try {
            localStorage.setItem("mg_lora_saved_presets", JSON.stringify(updated));
        } catch {
            // Storage full / error
        }
        setSaveTitleInput("");
        setIsSavingDrawerOpen(false);
    };

    const handleLoadPreset = (p: SavedPreset) => {
        setStack(p.items);
        if (p.basePrompt) setBasePrompt(p.basePrompt);
    };

    const handleDeleteSavedPreset = (id: string) => {
        const updated = savedPresets.filter((p) => p.id !== id);
        setSavedPresets(updated);
        try {
            localStorage.setItem("mg_lora_saved_presets", JSON.stringify(updated));
        } catch {
            // Ignore
        }
    };

    // Open in Prompt Lab
    const handleOpenInPromptLab = () => {
        const promptToTransfer = formattedSyntaxes.a1111;
        navigate(`/prompt-lab?prompt=${encodeURIComponent(promptToTransfer)}`);
    };

    return (
        <div className="lora-stack-container">
            {/* Header Section */}
            <header className="lora-header">
                <div className="lora-header-top">
                    <div className="lora-title-group">
                        <div className="lora-category-badge">
                            <Icons.Sliders />
                            <span>Generative Utility</span>
                        </div>
                        <h1 className="lora-title">
                            <span className="lora-title-icon">
                                <Icons.Layers />
                            </span>
                            LoRA Stack &amp; Weight Aggregator
                        </h1>
                        <p className="lora-subtitle">
                            Tumpuk beberapa LoRA, pantau ambang batas saturasi (over-baking guard), gabungkan trigger words secara otomatis, dan ekspor sintaks siap pakai untuk WebUI, Forge, serta ComfyUI.
                        </p>
                    </div>

                    {/* Architecture Selector */}
                    <div className="lora-arch-row">
                        <span className="lora-arch-row-label">
                            <Icons.Sliders />
                            Target Architecture:
                        </span>
                        <select
                            className="lora-arch-select"
                            value={targetArch}
                            onChange={(e) => setTargetArch(e.target.value)}
                        >
                            <option value="All">All Architectures</option>
                            <option value="Illustrious">Illustrious XL</option>
                            <option value="NoobAI">NoobAI</option>
                            <option value="SDXL">SDXL 1.0</option>
                            <option value="SD15">Stable Diffusion 1.5</option>
                            <option value="Flux">Flux.1</option>
                            <option value="Pony">Pony Diffusion V6</option>
                        </select>
                        <span className="lora-arch-hint">Mendeteksi potensi inkonsistensi layer</span>
                    </div>
                </div>

                {/* Preset Templates */}
                <div className="lora-presets-bar">
                    <span className="lora-presets-label">Preset Cepat:</span>
                    {DEFAULT_LORA_PRESETS.map((p, idx) => (
                        <button
                            key={idx}
                            type="button"
                            className="lora-preset-btn"
                            onClick={() => setStack(p.items)}
                            title={p.desc}
                        >
                            <span>{p.label}</span>
                        </button>
                    ))}
                    <button
                        type="button"
                        className="lora-reset-btn"
                        onClick={() => setStack([])}
                        title="Kosongkan semua layer LoRA"
                    >
                        <Icons.Trash />
                        <span>Clear All</span>
                    </button>
                </div>
            </header>

            {/* Main Studio Grid */}
            <div className="lora-main-grid">
                {/* Left Column: Stack Layers & Inputs */}
                <div className="lora-stack-col">
                    {/* Active Stack Layers Card */}
                    <div className="lora-section-card">
                        <div className="lora-section-header">
                            <h2 className="lora-section-title">
                                <Icons.Layers />
                                <span>Active LoRA Layers</span>
                                <span className="lora-badge-count">{stack.length}</span>
                            </h2>
                            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                                {activeLayers.length} Enabled &bull; Layer order top-to-bottom
                            </span>
                        </div>

                        {stack.length === 0 ? (
                            <div className="lora-empty-state">
                                <div className="lora-empty-icon">
                                    <Icons.Layers />
                                </div>
                                <h3 className="lora-empty-title">Stack Masih Kosong</h3>
                                <p className="lora-empty-desc">
                                    Pilih LoRA dari katalog database di bawah atau tambahkan LoRA kustom untuk mulai menumpuk bobot dan menggabungkan prompt.
                                </p>
                                <button
                                    type="button"
                                    className="lora-preset-btn active"
                                    onClick={() => setStack(DEFAULT_LORA_PRESETS[0].items)}
                                >
                                    <span>Muat Contoh Stack Anime</span>
                                </button>
                            </div>
                        ) : (
                            <div className="lora-layers-list">
                                {stack.map((layer, idx) => {
                                    const isArchMismatch =
                                        targetArch !== "All" &&
                                        layer.baseModel &&
                                        layer.baseModel.toLowerCase() !== targetArch.toLowerCase();

                                    return (
                                        <div
                                            key={layer.id}
                                            className={`lora-layer-card ${!layer.enabled ? "bypassed" : ""}`}
                                        >
                                            {/* Layer Header */}
                                            <div className="lora-layer-header">
                                                <div className="lora-layer-left">
                                                    {/* Reorder Buttons */}
                                                    <div className="lora-layer-order">
                                                        <button
                                                            type="button"
                                                            className="lora-order-btn"
                                                            disabled={idx === 0}
                                                            onClick={() => handleMoveLayer(idx, "up")}
                                                            title="Geser ke atas"
                                                        >
                                                            <Icons.ArrowUp />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="lora-order-btn"
                                                            disabled={idx === stack.length - 1}
                                                            onClick={() => handleMoveLayer(idx, "down")}
                                                            title="Geser ke bawah"
                                                        >
                                                            <Icons.ArrowDown />
                                                        </button>
                                                    </div>

                                                    {/* Thumbnail */}
                                                    {layer.thumbnailUrl ? (
                                                        <img
                                                            src={resolveImageUrl(layer.thumbnailUrl)}
                                                            alt={layer.name}
                                                            className="lora-thumb-avatar"
                                                        />
                                                    ) : (
                                                        <div className="lora-thumb-fallback">
                                                            <Icons.Layers />
                                                        </div>
                                                    )}

                                                    {/* Meta Info */}
                                                    <div className="lora-layer-meta">
                                                        <div className="lora-layer-title-row">
                                                            <span className="lora-layer-name" title={layer.name}>
                                                                {layer.name}
                                                            </span>
                                                            <span className="lora-tag-badge">
                                                                {layer.baseModel || "Custom"}
                                                            </span>
                                                            <span className="lora-tag-badge">{layer.category}</span>
                                                        </div>
                                                        <span className="lora-layer-filename">
                                                            &lt;lora:{layer.fileName}:{layer.weight.toFixed(2)}&gt;
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Header Right Actions */}
                                                <div className="lora-layer-actions">
                                                    <button
                                                        type="button"
                                                        className={`lora-toggle-btn ${layer.enabled ? "active" : ""}`}
                                                        onClick={() => handleToggleLayer(layer.id)}
                                                        title={layer.enabled ? "Nonaktifkan layer (Bypass)" : "Aktifkan layer"}
                                                    >
                                                        {layer.enabled ? "ACTIVE" : "BYPASSED"}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="lora-delete-btn"
                                                        onClick={() => handleDeleteLayer(layer.id)}
                                                        title="Hapus LoRA dari stack"
                                                    >
                                                        <Icons.Trash />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Weight Controls */}
                                            <div className="lora-weight-row">
                                                <div className="lora-weight-header">
                                                    <span className="lora-weight-label">
                                                        <Icons.Sliders />
                                                        <span>Model / UNet Weight:</span>
                                                    </span>
                                                    <div className="lora-weight-val-box">
                                                        <input
                                                            type="number"
                                                            step="0.05"
                                                            min="-2"
                                                            max="2"
                                                            className="lora-weight-input"
                                                            value={layer.weight}
                                                            onChange={(e) =>
                                                                handleWeightChange(layer.id, parseFloat(e.target.value) || 0)
                                                            }
                                                        />
                                                    </div>
                                                </div>

                                                <input
                                                    type="range"
                                                    min="-1.5"
                                                    max="1.5"
                                                    step="0.05"
                                                    value={layer.weight}
                                                    onChange={(e) =>
                                                        handleWeightChange(layer.id, parseFloat(e.target.value))
                                                    }
                                                    className="lora-slider-track"
                                                />

                                                {/* Quick Chips */}
                                                <div className="lora-quick-chips">
                                                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>Quick:</span>
                                                    {[0.5, 0.65, 0.8, 1.0, 1.2].map((v) => (
                                                        <button
                                                            key={v}
                                                            type="button"
                                                            className={`lora-quick-chip ${layer.weight === v ? "active" : ""}`}
                                                            onClick={() => handleWeightChange(layer.id, v)}
                                                        >
                                                            {v.toFixed(2)}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Dual Weight (UNet vs CLIP Text Encoder) */}
                                                <div className="lora-dual-switch">
                                                    <label className="lora-dual-toggle-label">
                                                        <input
                                                            type="checkbox"
                                                            checked={layer.isDualWeight}
                                                            onChange={() => handleToggleDualWeight(layer.id)}
                                                        />
                                                        <span>Separate CLIP / Text Encoder Weight</span>
                                                    </label>

                                                    {layer.isDualWeight && layer.teWeight !== undefined && (
                                                        <div className="lora-weight-val-box">
                                                            <span style={{ fontSize: "11px", color: "#cbd5e1" }}>CLIP:</span>
                                                            <input
                                                                type="number"
                                                                step="0.05"
                                                                min="-2"
                                                                max="2"
                                                                className="lora-weight-input"
                                                                value={layer.teWeight}
                                                                onChange={(e) =>
                                                                    handleTeWeightChange(
                                                                        layer.id,
                                                                        parseFloat(e.target.value) || 0
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                {layer.isDualWeight && layer.teWeight !== undefined && (
                                                    <div style={{ marginTop: "8px" }}>
                                                        <input
                                                            type="range"
                                                            min="-1.5"
                                                            max="1.5"
                                                            step="0.05"
                                                            value={layer.teWeight}
                                                            onChange={(e) =>
                                                                handleTeWeightChange(layer.id, parseFloat(e.target.value))
                                                            }
                                                            className="lora-slider-track"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Trigger Words Section */}
                                            {layer.triggerWords.length > 0 && (
                                                <div className="lora-triggers-box">
                                                    <div className="lora-triggers-header">
                                                        <span className="lora-triggers-title">Trigger Words:</span>
                                                        <div className="lora-triggers-bulk">
                                                            <button
                                                                type="button"
                                                                className="lora-triggers-bulk-btn"
                                                                onClick={() => handleSetAllTriggers(layer.id, true)}
                                                            >
                                                                All
                                                            </button>
                                                            <span style={{ color: "#94a3b8", fontSize: "11px" }}>&bull;</span>
                                                            <button
                                                                type="button"
                                                                className="lora-triggers-bulk-btn"
                                                                onClick={() => handleSetAllTriggers(layer.id, false)}
                                                            >
                                                                None
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="lora-trigger-chips">
                                                        {layer.triggerWords.map((tw, tIdx) => (
                                                            <div
                                                                key={tIdx}
                                                                className={`lora-trigger-chip ${tw.enabled ? "active" : ""}`}
                                                                onClick={() => handleToggleTriggerWord(layer.id, tw.text)}
                                                            >
                                                                <span>{tw.text}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Incompatible Architecture Alert */}
                                            {isArchMismatch && (
                                                <div className="lora-layer-warning">
                                                    <Icons.Alert />
                                                    <span>
                                                        <strong>Peringatan Arsitektur:</strong> LoRA ini dilatih untuk{" "}
                                                        <strong>{layer.baseModel}</strong>, sedangkan target checkpoint Anda adalah{" "}
                                                        <strong>{targetArch}</strong>.
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Add LoRA to Stack Module */}
                    <div className="lora-add-container">
                        <div className="lora-add-tabs">
                            <button
                                type="button"
                                className={`lora-add-tab-btn ${addTab === "catalog" ? "active" : ""}`}
                                onClick={() => setAddTab("catalog")}
                            >
                                <Icons.Layers />
                                <span>Pilih dari Katalog ({catalogLoras.length})</span>
                            </button>
                            <button
                                type="button"
                                className={`lora-add-tab-btn ${addTab === "custom" ? "active" : ""}`}
                                onClick={() => setAddTab("custom")}
                            >
                                <Icons.Plus />
                                <span>Tambah Custom LoRA</span>
                            </button>
                        </div>

                        {addTab === "catalog" ? (
                            <div>
                                <input
                                    type="text"
                                    placeholder="Cari LoRA berdasarkan nama, tag, atau trigger word..."
                                    className="lora-catalog-search"
                                    value={catalogSearch}
                                    onChange={(e) => setCatalogSearch(e.target.value)}
                                />

                                {catalogLoading ? (
                                    <div style={{ textAlign: "center", padding: "18px", color: "#cbd5e1" }}>
                                        Memuat LoRA katalog...
                                    </div>
                                ) : catalogLoras.length === 0 ? (
                                    <div style={{ textAlign: "center", padding: "18px", color: "#cbd5e1" }}>
                                        Tidak ada LoRA yang cocok dengan kata kunci.
                                    </div>
                                ) : (
                                    <div className="lora-catalog-scroll">
                                        {catalogLoras.map((m) => {
                                            const isAlreadyAdded = stack.some((s) => s.modelId === m.id);
                                            return (
                                                <div key={m.id} className="lora-catalog-item">
                                                    <div className="lora-catalog-item-info">
                                                        {m.thumbnail_url ? (
                                                            <img
                                                                src={resolveImageUrl(m.thumbnail_url)}
                                                                alt={m.name}
                                                                style={{
                                                                    width: "36px",
                                                                    height: "36px",
                                                                    borderRadius: "4px",
                                                                    objectFit: "cover",
                                                                }}
                                                            />
                                                        ) : (
                                                            <div
                                                                style={{
                                                                    width: "36px",
                                                                    height: "36px",
                                                                    borderRadius: "4px",
                                                                    background: "#181c22",
                                                                    border: "1px solid #282f3a",
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    color: "#94a3b8",
                                                                }}
                                                            >
                                                                <Icons.Layers />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div style={{ fontWeight: 600, color: "#f8fafc", fontSize: "13px" }}>
                                                                {m.name}
                                                            </div>
                                                            <div style={{ fontSize: "11px", color: "#cbd5e1", display: "flex", gap: "6px" }}>
                                                                <span>{m.base_model}</span>
                                                                <span>&bull;</span>
                                                                <span>{(m.trigger_words || []).length} triggers</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        className="lora-catalog-add-btn"
                                                        disabled={isAlreadyAdded}
                                                        onClick={() => handleAddFromCatalog(m)}
                                                    >
                                                        {isAlreadyAdded ? "✓ Added" : "+ Tambah"}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Custom LoRA Form */
                            <form className="lora-custom-form" onSubmit={handleAddCustom}>
                                <div className="lora-form-row">
                                    <label className="lora-form-label">Nama LoRA Display:</label>
                                    <input
                                        type="text"
                                        className="lora-form-input"
                                        placeholder="Contoh: Genshin Furina Concept LoRA"
                                        value={customName}
                                        onChange={(e) => setCustomName(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="lora-form-row">
                                    <label className="lora-form-label">File / Token Name (tanpa .safetensors):</label>
                                    <input
                                        type="text"
                                        className="lora-form-input"
                                        placeholder="Contoh: furina_v2"
                                        value={customFileName}
                                        onChange={(e) => setCustomFileName(e.target.value)}
                                    />
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                                    <div className="lora-form-row">
                                        <label className="lora-form-label">Base Arsitektur:</label>
                                        <select
                                            className="lora-form-select"
                                            value={customBaseModel}
                                            onChange={(e) => setCustomBaseModel(e.target.value)}
                                        >
                                            <option value="Illustrious">Illustrious XL</option>
                                            <option value="NoobAI">NoobAI</option>
                                            <option value="SDXL">SDXL</option>
                                            <option value="SD15">SD 1.5</option>
                                            <option value="Flux">Flux.1</option>
                                            <option value="Pony">Pony V6</option>
                                        </select>
                                    </div>

                                    <div className="lora-form-row">
                                        <label className="lora-form-label">Kategori:</label>
                                        <select
                                            className="lora-form-select"
                                            value={customCategory}
                                            onChange={(e) => setCustomCategory(e.target.value as StackItem["category"])}
                                        >
                                            <option value="style">Art Style</option>
                                            <option value="character">Karakter</option>
                                            <option value="outfit">Pakaian / Fashion</option>
                                            <option value="detailer">Detailer</option>
                                            <option value="lighting">Pencahayaan</option>
                                            <option value="concept">Konsep</option>
                                        </select>
                                    </div>

                                    <div className="lora-form-row">
                                        <label className="lora-form-label">Default Weight:</label>
                                        <input
                                            type="number"
                                            step="0.05"
                                            min="-2"
                                            max="2"
                                            className="lora-form-input"
                                            value={customWeight}
                                            onChange={(e) => setCustomWeight(parseFloat(e.target.value) || 0.8)}
                                        />
                                    </div>
                                </div>

                                <div className="lora-form-row">
                                    <label className="lora-form-label">
                                        Trigger Words (Pisahkan dengan koma):
                                    </label>
                                    <input
                                        type="text"
                                        className="lora-form-input"
                                        placeholder="furina, blue hair, ahoge, hydro vision, hat"
                                        value={customTriggers}
                                        onChange={(e) => setCustomTriggers(e.target.value)}
                                    />
                                </div>

                                <button type="submit" className="lora-custom-submit-btn">
                                    <Icons.Plus />
                                    <span>Tambahkan ke Stack</span>
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Base Positive Prompt Box */}
                    <div className="lora-section-card lora-base-prompt-box">
                        <div className="lora-section-header">
                            <h3 className="lora-section-title">
                                <Icons.Sliders />
                                <span>Base Prompt Tambahan</span>
                            </h3>
                            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                                {basePrompt.split(",").filter((s) => s.trim()).length} tag terdaftar
                            </span>
                        </div>
                        <textarea
                            className="lora-textarea"
                            value={basePrompt}
                            onChange={(e) => setBasePrompt(e.target.value)}
                            placeholder="Ketik deskripsi subjek gambar Anda di sini (misal: 1girl, solo, looking at viewer, cherry blossoms)..."
                        />
                    </div>
                </div>

                {/* Right Column: Health Meter & Compiler Output Hub */}
                <div className="lora-sidebar-col">
                    {/* Weight Health Gauge Card */}
                    <div className="lora-gauge-card">
                        <div className="lora-gauge-title-row">
                            <h3 className="lora-gauge-title">
                                <Icons.Sliders />
                                <span>LoRA Interference Guard</span>
                            </h3>
                            <span className={`lora-gauge-status-badge ${healthStatus.level}`}>
                                {healthStatus.title}
                            </span>
                        </div>

                        {/* Progress Meter Bar */}
                        <div className="lora-gauge-meter-wrapper">
                            <div className="lora-gauge-track">
                                <div
                                    className={`lora-gauge-bar ${healthStatus.level}`}
                                    style={{
                                        width: `${Math.min(100, (totalNetWeight / 2.2) * 100)}%`,
                                    }}
                                />
                            </div>

                            <div className="lora-gauge-stats">
                                <span className={`lora-gauge-num ${healthStatus.level}`}>
                                    {totalNetWeight.toFixed(2)}
                                    <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: 500 }}>
                                        {" "}
                                        / 1.20 target
                                    </span>
                                </span>
                                <span style={{ fontSize: "12px", color: "#cbd5e1" }}>
                                    {activeLayers.length} LoRA aktif
                                </span>
                            </div>
                        </div>

                        {/* Dynamic Health Advice */}
                        <div className={`lora-advice-box ${healthStatus.level}`}>
                            {healthStatus.advice}
                        </div>

                        {/* Quick Auto-Scale Actions */}
                        {totalNetWeight > 1.25 && (
                            <div className="lora-gauge-actions">
                                <button
                                    type="button"
                                    className="lora-gauge-action-btn"
                                    onClick={handleAutoNormalize}
                                    title="Sesuaikan semua bobot proporsional agar total = 1.20"
                                >
                                    <span>Auto-Normalize (1.20)</span>
                                </button>
                                <button
                                    type="button"
                                    className="lora-gauge-action-btn"
                                    onClick={handleScaleDown}
                                    title="Kalikan semua bobot dengan 0.75"
                                >
                                    <span>Scale -25%</span>
                                </button>
                            </div>
                        )}

                        {archMismatches.length > 0 && (
                            <div className="lora-layer-warning" style={{ marginTop: "12px" }}>
                                <Icons.Alert />
                                <span>
                                    Terdapat {archMismatches.length} LoRA dengan arsitektur berbeda dari target ({targetArch}).
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Compiler Output Hub */}
                    <div className="lora-output-card">
                        <div className="lora-section-header">
                            <h3 className="lora-section-title">
                                <Icons.Copy />
                                <span>Compiled Syntaxes</span>
                            </h3>
                        </div>

                        {/* Output Format Tabs */}
                        <div className="lora-output-tabs">
                            <button
                                type="button"
                                className={`lora-output-tab-btn ${outputTab === "a1111" ? "active" : ""}`}
                                onClick={() => setOutputTab("a1111")}
                            >
                                WebUI / Forge
                            </button>
                            <button
                                type="button"
                                className={`lora-output-tab-btn ${outputTab === "comfy" ? "active" : ""}`}
                                onClick={() => setOutputTab("comfy")}
                            >
                                ComfyUI Stack
                            </button>
                            <button
                                type="button"
                                className={`lora-output-tab-btn ${outputTab === "clean" ? "active" : ""}`}
                                onClick={() => setOutputTab("clean")}
                            >
                                Clean Prompt
                            </button>
                            <button
                                type="button"
                                className={`lora-output-tab-btn ${outputTab === "json" ? "active" : ""}`}
                                onClick={() => setOutputTab("json")}
                            >
                                JSON Blueprint
                            </button>
                        </div>

                        {/* Code Display Box */}
                        <div className="lora-code-box">
                            <button
                                type="button"
                                className="lora-copy-code-btn"
                                onClick={() => handleCopy(formattedSyntaxes[outputTab], "active-tab")}
                            >
                                {copiedKey === "active-tab" ? <Icons.Check /> : <Icons.Copy />}
                                <span>{copiedKey === "active-tab" ? "Tersalin" : "Copy"}</span>
                            </button>
                            {formattedSyntaxes[outputTab]}
                        </div>

                        {/* Action Hub CTAs */}
                        <div className="lora-hub-actions">
                            <button
                                type="button"
                                className="lora-main-cta-btn"
                                onClick={() => handleCopy(formattedSyntaxes.a1111, "main-cta")}
                            >
                                {copiedKey === "main-cta" ? <Icons.Check /> : <Icons.Copy />}
                                <span>{copiedKey === "main-cta" ? "Tersalin ke Clipboard" : "Salin Prompt & LoRA Tag"}</span>
                            </button>

                            <button
                                type="button"
                                className="lora-sec-cta-btn"
                                onClick={handleOpenInPromptLab}
                                title="Buka dan racik lebih lanjut di Prompt Lab"
                            >
                                <Icons.ExternalLink />
                                <span>Buka di Prompt Lab</span>
                            </button>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                <button
                                    type="button"
                                    className="lora-sec-cta-btn"
                                    onClick={() => setIsSavingDrawerOpen((prev) => !prev)}
                                >
                                    <Icons.Plus />
                                    <span>Simpan Preset</span>
                                </button>

                                <button
                                    type="button"
                                    className="lora-sec-cta-btn"
                                    onClick={() =>
                                        downloadTextAsFile(
                                            outputTab === "json" ? formattedSyntaxes.json : formattedSyntaxes.a1111,
                                            `lora-stack-${Date.now()}.${outputTab === "json" ? "json" : "txt"}`,
                                            outputTab === "json" ? "application/json" : "text/plain"
                                        )
                                    }
                                >
                                    <Icons.Download />
                                    <span>Download</span>
                                </button>
                            </div>
                        </div>

                        {/* Save Preset Drawer / Popover */}
                        {isSavingDrawerOpen && (
                            <div
                                style={{
                                    marginTop: "12px",
                                    padding: "12px",
                                    background: "#111419",
                                    border: "1px solid #282f3a",
                                    borderRadius: "6px",
                                }}
                            >
                                <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", marginBottom: "6px" }}>
                                    SIMPAN STACK PRESET
                                </div>
                                <div style={{ display: "flex", gap: "6px" }}>
                                    <input
                                        type="text"
                                        placeholder="Nama preset (misal: My Anime Eyes + Glow)"
                                        className="lora-form-input"
                                        style={{ fontSize: "12px", padding: "6px 10px" }}
                                        value={saveTitleInput}
                                        onChange={(e) => setSaveTitleInput(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="lora-custom-submit-btn"
                                        style={{ padding: "6px 12px", fontSize: "12px" }}
                                        onClick={handleSavePreset}
                                    >
                                        Simpan
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Saved Presets List */}
                        {savedPresets.length > 0 && (
                            <div className="lora-saved-stacks-box">
                                <div className="lora-saved-title">
                                    <span>PRESET TERSIMPAN ({savedPresets.length})</span>
                                </div>
                                {savedPresets.map((sp) => (
                                    <div key={sp.id} className="lora-saved-item">
                                        <div>
                                            <div className="lora-saved-item-name">{sp.title}</div>
                                            <div style={{ fontSize: "10px", color: "#94a3b8" }}>
                                                {sp.items.length} LoRAs &bull; {sp.timestamp}
                                            </div>
                                        </div>
                                        <div className="lora-saved-item-actions">
                                            <button
                                                type="button"
                                                className="lora-saved-load-btn"
                                                onClick={() => handleLoadPreset(sp)}
                                            >
                                                Muat
                                            </button>
                                            <button
                                                type="button"
                                                className="lora-saved-del-btn"
                                                onClick={() => handleDeleteSavedPreset(sp.id)}
                                                title="Hapus preset tersimpan"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
