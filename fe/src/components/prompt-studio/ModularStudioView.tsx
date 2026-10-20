import React, { useState, useEffect, useMemo } from "react";
import {
    CATEGORIES,
    parseTagList,
    compileCategoriesPrompt,
} from "./PromptCategoriesData";
import {
    PROMPT_FORMATS,
    type PromptFormatId,
    convertPromptOffline,
    normalizeTagForModel,
} from "../../services/promptTransformerService";
import {
    type PromptPreset,
    type BooruTagStats,
    getPromptPresets,
    getBooruTagStatsApi,
    createPromptPresetApi,
    deletePromptPresetApi,
} from "../../api/models";
import { BooruAutocompleteInput } from "../common/BooruAutocompleteInput";
import { DanbooruCatalogDrawer } from "./DanbooruCatalogDrawer";

// Technical Lucide SVG Icons (Strictly 14px, Zero Emojis, Developer Workstation Aesthetic)
const LucideIcons = {
    Check: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
    Copy: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
    ),
    Sliders: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
            <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
        </svg>
    ),
    Layers: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
        </svg>
    ),
    Dices: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <circle cx="15.5" cy="15.5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="8.5" cy="15.5" r="1.5" />
            <circle cx="15.5" cy="8.5" r="1.5" />
        </svg>
    ),
    RefreshCw: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
    ),
    ShieldAlert: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    ),
    Bookmark: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
    ),
    Trash: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
    ),
    ChevronDown: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
        </svg>
    ),
    ChevronUp: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
        </svg>
    ),
    X: () => (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    ),
    BookOpen: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
    ),
    Search: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    ),
    Grid: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
        </svg>
    ),
    ArrowRight: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
        </svg>
    ),
    Plus: () => (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    ),
    RotateCcw: () => (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
    ),
    User: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    ),
    Globe: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
    ),
    Sparkles: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l1.912 5.885a2 2 0 0 0 1.272 1.272L21 12l-5.816 1.843a2 2 0 0 0-1.272 1.272L12 21l-1.912-5.885a2 2 0 0 0-1.272-1.272L3 12l5.816-1.843a2 2 0 0 0 1.272-1.272L12 3z" />
        </svg>
    ),
};

// Syntax Highlighting Renderer for Code-Block Prompt Output
const PromptSyntaxHighlighter: React.FC<{ text: string }> = ({ text }) => {
    const tokens = useMemo(() => {
        if (!text.trim()) return [];
        return text.split(/(<lora:[^>]+>|###[^:\n]+:|\([^)]+:[0-9.]+\)|\{[^}]+\}|[,\n])/g).filter(Boolean);
    }, [text]);

    if (!text.trim()) {
        return (
            <div className="aps-syntax-output font-mono text-xs empty">
                <span className="syntax-placeholder">
                    Prompt yang Anda rancang dari layer modular akan diparse ke model pilihan secara real-time di sini...
                </span>
            </div>
        );
    }

    return (
        <div className="aps-syntax-output font-mono text-xs" tabIndex={0}>
            {tokens.map((token, i) => {
                const trimmed = token.trim();
                if (!trimmed) {
                    return <span key={i}>{token}</span>;
                }
                if (token.startsWith("###")) {
                    return <div key={i} className="syntax-category-header">{token}</div>;
                }
                if (token.startsWith("<lora:")) {
                    return <span key={i} className="syntax-lora" title="Injeksi LoRA">{token}</span>;
                }
                if (/^(\(|\[).+:[0-9.]+(\)|\])$/.test(token) || /^\{.+\}$/.test(token)) {
                    return <span key={i} className="syntax-weight" title="Tag dengan Bobot">{token}</span>;
                }
                if (/^(score_[0-9]|score_[0-9]_up|rating:|masterpiece|best quality|very aesthetic|newest|ultra-detailed|amazing quality)/i.test(trimmed)) {
                    return <span key={i} className="syntax-prefix" title="Auto-Injected Quality Prefix">{token}</span>;
                }
                if (token === "," || token === "\n") {
                    return <span key={i} className="syntax-delimiter">{token} </span>;
                }
                return <span key={i} className="syntax-tag">{token}</span>;
            })}
        </div>
    );
};

interface ModularStudioViewProps {
    inputs: Record<string, string>;
    onInputChange: (id: string, value: string) => void;
    onToggleChip: (categoryId: string, chipText: string) => void;
    onCycleChipWeight: (e: React.MouseEvent, categoryId: string, chipText: string) => void;
    isChipActive: (categoryId: string, chipText: string) => boolean;
    getChipWeightLabel: (categoryId: string, chipText: string) => string | null;
    onClearCategory: (id: string) => void;
    onClearAll: () => void;
    loraName: string;
    setLoraName: (val: string) => void;
    loraWeight: number;
    setLoraWeight: (val: number) => void;
    loraEnabled: boolean;
    setLoraEnabled: (val: boolean) => void;
    compiledOutput: string;
    onCopyOutput?: (text?: string) => void;
    copied: boolean;
    formatMode: "single" | "multiline";
    setFormatMode: (mode: "single" | "multiline") => void;
    onSwitchToCanvas?: (promptText?: string) => void;
    onSaveToPresetLibrary: () => void;
    showToast: (msg: string) => void;
    onLoadPresetData: (newInputs: Record<string, string>, lora?: { name: string; weight: number }) => void;
    modularPresets?: PromptPreset[];
    onAddModularTag?: (categoryId: string, tagText: string, subgroup?: string) => Promise<void>;
    onDeleteModularTag?: (presetId: number, tagTitle?: string) => Promise<void>;
}

export const ModularStudioView: React.FC<ModularStudioViewProps> = ({
    inputs,
    onInputChange,
    onToggleChip,
    onCycleChipWeight,
    isChipActive,
    getChipWeightLabel,
    onClearCategory,
    onClearAll,
    loraName,
    setLoraName,
    loraWeight,
    setLoraWeight,
    loraEnabled,
    setLoraEnabled,
    compiledOutput,
    onCopyOutput,
    copied,
    formatMode,
    setFormatMode,
    onSwitchToCanvas,
    onSaveToPresetLibrary,
    showToast,
    onLoadPresetData,
    modularPresets = [],
    onAddModularTag: _onAddModularTag,
    onDeleteModularTag: _onDeleteModularTag,
}) => {
    // Database Saved Studio Presets
    const [savedStudioPresets, setSavedStudioPresets] = useState<PromptPreset[]>([]);
    const [savedPresetsLoading, setSavedPresetsLoading] = useState<boolean>(false);
    const [newPresetName, setNewPresetName] = useState<string>("");
    const [showSaveDrawer, setShowSaveDrawer] = useState<boolean>(false);
    const [isSavingPreset, setIsSavingPreset] = useState<boolean>(false);

    // Danbooru Catalog Drawer & Layer Tag Modal States
    const [showDanbooruCatalog, setShowDanbooruCatalog] = useState<boolean>(false);
    const [catalogTargetLayer, setCatalogTargetLayer] = useState<string>("all");
    const [catalogTargetCategory, setCatalogTargetCategory] = useState<string>("all");
    const [identityMode, setIdentityMode] = useState<"general" | "character">("general");

    // Smart Collapsible Accordion State
    const [openLayers, setOpenLayers] = useState<Record<string, boolean>>(() => {
        // Default: buka layer quality & identity, dan layer lain yang sudah terisi
        return {
            quality: true,
            identity: true,
        };
    });

    // Expand quick tray tags per layer
    const [expandedQuickTray, setExpandedQuickTray] = useState<Record<string, boolean>>({});

    // Inline input typing per layer
    const [layerInputDrafts, setLayerInputDrafts] = useState<Record<string, string>>({});

    const [modalLayerDetail, setModalLayerDetail] = useState<{ id: string; title: string; chips: any[] } | null>(null);
    const [layerModalSearch, setLayerModalSearch] = useState<string>("");
    const [isNsfwEnabled, setIsNsfwEnabled] = useState<boolean>(
        () => localStorage.getItem("modular_studio_nsfw_enabled") === "true"
    );
    const [booruStats, setBooruStats] = useState<BooruTagStats | null>(null);

    // Target Model Parser State (persisted to localStorage)
    const [selectedTargetModel, setSelectedTargetModel] = useState<PromptFormatId | "raw" | "noobai">(() => {
        const saved = localStorage.getItem("modular_studio_target_model");
        if (saved) return saved as any;
        return "pony";
    });
    const [showMultiModelModal, setShowMultiModelModal] = useState<boolean>(false);
    const [copiedModelId, setCopiedModelId] = useState<string | null>(null);
    const [showNormalizeMenu, setShowNormalizeMenu] = useState<boolean>(false);
    const [isRawTextEditMode, setIsRawTextEditMode] = useState<boolean>(false);

    useEffect(() => {
        getBooruTagStatsApi()
            .then((data) => setBooruStats(data))
            .catch((err) => console.error("Gagal memuat stats katalog Danbooru:", err));
    }, []);

    // Toggle accordion layer
    const toggleLayerAccordion = (catId: string) => {
        setOpenLayers((prev) => ({
            ...prev,
            [catId]: !prev[catId],
        }));
    };

    // Check if layer should be visually open
    const isLayerExpanded = (catId: string, hasContent: boolean): boolean => {
        if (openLayers[catId] !== undefined) {
            return openLayers[catId];
        }
        return hasContent || catId === "quality";
    };

    // Add tag to a layer directly from input
    const handleAddTagToLayer = (catId: string, rawTagText: string) => {
        const text = rawTagText.trim();
        if (!text) return;
        const currentVal = inputs[catId] || "";
        const tags = parseTagList(currentVal);
        const norm = (s: string) => s.replace(/^\(+|\)+$/g, "").replace(/:[0-9.]+$/, "").trim().toLowerCase();
        if (tags.some((t) => norm(t) === norm(text))) {
            showToast(`Tag "${text}" sudah ada di layer ini!`);
            return;
        }
        const updated = [...tags, text];
        onInputChange(catId, updated.join(", "));
        setLayerInputDrafts((prev) => ({ ...prev, [catId]: "" }));
    };

    // Remove single tag pill from layer
    const handleRemoveTagPill = (e: React.MouseEvent, catId: string, indexToRemove: number) => {
        e.stopPropagation();
        const currentVal = inputs[catId] || "";
        const tags = parseTagList(currentVal);
        const updated = tags.filter((_, i) => i !== indexToRemove);
        onInputChange(catId, updated.join(", "));
    };

    // Adjust single tag weight on mouse wheel or click
    const handleAdjustTagWeight = (e: React.WheelEvent | React.MouseEvent, catId: string, index: number, delta: number) => {
        e.stopPropagation();
        const currentVal = inputs[catId] || "";
        const tags = parseTagList(currentVal);
        const tag = tags[index];
        if (!tag) return;

        const match = tag.match(/^\(?([^:)]+)(?::([0-9.]+))?\)?$/);
        if (match) {
            const base = match[1].trim();
            const currentWeight = match[2] ? parseFloat(match[2]) : 1.0;
            let nextWeight = Math.round((currentWeight + delta) * 100) / 100;
            nextWeight = Math.max(0.6, Math.min(1.6, nextWeight));
            if (nextWeight === 1.0) {
                tags[index] = base;
            } else {
                tags[index] = `(${base}:${nextWeight.toFixed(2)})`;
            }
            onInputChange(catId, tags.join(", "));
        }
    };

    const handleInsertTagFromCatalog = (tag: string, targetLayer?: string) => {
        const layerId = targetLayer && targetLayer !== "all" ? targetLayer : (catalogTargetLayer !== "all" ? catalogTargetLayer : "identity");
        const currentVal = inputs[layerId] || "";
        const effectiveModel = selectedTargetModel === "noobai" ? "illustrious" : selectedTargetModel;
        const cleanTag = normalizeTagForModel(tag.trim(), effectiveModel);
        if (!cleanTag) return;

        const parts = parseTagList(currentVal);
        if (!parts.includes(cleanTag)) {
            parts.push(cleanTag);
            onInputChange(layerId, parts.join(", "));
            // Pastikan layer terbuka saat dimasukkan tag
            setOpenLayers((prev) => ({ ...prev, [layerId]: true }));
        }
        showToast(`Tag "${cleanTag}" dimasukkan ke layer ${layerId}!`);
    };

    // Fetch saved studio presets from PostgreSQL DB
    const loadSavedStudioPresets = async () => {
        try {
            setSavedPresetsLoading(true);
            const data = await getPromptPresets({
                category: "modular",
                subcategory: "studio_preset",
                type: "full",
            });
            setSavedStudioPresets(data);
        } catch (err) {
            console.error("Gagal memuat preset studio tersimpan:", err);
        } finally {
            setSavedPresetsLoading(false);
        }
    };

    useEffect(() => {
        loadSavedStudioPresets();
    }, []);

    // Save custom preset directly to PostgreSQL DB
    const handleSaveCustomToDb = async () => {
        const title = newPresetName.trim();
        if (!title) return;

        try {
            setIsSavingPreset(true);
            const created = await createPromptPresetApi({
                title,
                positive_prompt: compiledOutput || "masterpiece",
                category: "modular",
                subcategory: "studio_preset",
                preset_type: "full",
                base_model_target: "All",
                description: JSON.stringify({
                    inputs,
                    loraName,
                    loraWeight,
                    savedAt: new Date().toISOString(),
                }),
                is_system: false,
            });

            setSavedStudioPresets((prev) => [created, ...prev]);
            setNewPresetName("");
            setShowSaveDrawer(false);
            showToast(`Preset "${created.title}" berhasil disimpan di database!`);
        } catch (err) {
            console.error("Gagal menyimpan preset ke database:", err);
            showToast("Gagal menyimpan preset ke database");
        } finally {
            setIsSavingPreset(false);
        }
    };

    const handleDeleteCustomFromDb = async (id: number, title: string) => {
        try {
            await deletePromptPresetApi(id);
            setSavedStudioPresets((prev) => prev.filter((p) => p.id !== id));
            showToast(`Preset "${title}" dihapus dari database`);
        } catch (err) {
            console.error("Gagal menghapus preset:", err);
            showToast("Gagal menghapus preset");
        }
    };

    const handleLoadSavedPreset = (preset: PromptPreset) => {
        try {
            if (preset.description) {
                const parsed = JSON.parse(preset.description);
                if (parsed.inputs) {
                    onLoadPresetData(
                        parsed.inputs,
                        parsed.loraName ? { name: parsed.loraName, weight: parsed.loraWeight || 0.8 } : undefined
                    );
                    showToast(`Preset "${preset.title}" dimuat dari database!`);
                    return;
                }
            }
        } catch {
            // fallback
        }
        showToast(`Preset "${preset.title}" dimuat!`);
    };

    // Quick presets
    const loadPresetRin = () => {
        onLoadPresetData(
            {
                quality: "(anime_coloring:1.20), masterpiece, newest, best quality, highres, illustration",
                identity: "1girl, solo, tohsaka rin, aqua eyes, twin braids, black hair, hair ribbon",
                proportions: "slender, thigh gap, delicate hands",
                details: "glistening skin, slight blush, parted lips",
                expression: "tsundere expression, confident smirk, blushing slightly",
                outfit: "red turtleneck sweater, black pleated skirt, black thighhighs, pendant necklace",
                pose: "standing with hands on hips, looking at viewer",
                camera: "cowboy shot, upper body, slight low angle, depth of field",
                background: "fuyuki city rooftop at night, glowing city lights, moonlit sky",
                effects: "volumetric moonlight, gentle wind blowing hair, atmospheric lighting",
            },
            { name: "tohsaka_rin_illustrious", weight: 0.85 }
        );
        showToast("Preset Rin Tohsaka (Fate) dimuat!");
    };

    const loadPresetRio = () => {
        onLoadPresetData(
            {
                quality: "(anime_coloring:1.15), masterpiece, newest, best quality, highres, illustration",
                identity: "1girl, solo, red eyes, halo, black hair, intricate braided crown updo, long braided ponytail, loose framing side tendrils",
                proportions: "tall female, mature, slender, hourglass figure, slender waist, toned stomach, long legs, slender fingers",
                details: "sweat, glistening skin, sweatdrops on neck and collarbone, wet skin, shiny skin texture, heavy breathing",
                expression: "melancholic intense expression, focused fierce expression, slightly parted lips, intense gaze",
                outfit: "ornate Victorian gothic black dress, sheer lace sleeves, tight corset bodice, high-slit velvet skirt showing legs, sheer black thigh-high stockings, stiletto heels",
                pose: "theatrical standing pose, standing dramatically in front of a massive pipe organ, one arm raised conducting invisible music, holding a glowing crimson violin",
                camera: "environmental portrait, full body, full length view, low angle view, dynamic dutch angle, leading lines composition",
                background: "indoor, abandoned gothic cathedral, giant shattered stained-glass window behind her, overgrown ruins",
                effects: "floating dust motes, scattered sheet music flying in the air, volumetric moonlight beams, volumetric fog, dramatic chiaroscuro lighting, cinematic lighting, tyndall effect",
            },
            { name: "tsukatsuki_rio_illustrious", weight: 0.85 }
        );
        showToast("Preset Rio Tsukatsuki (Gothic) dimuat!");
    };

    const loadPresetElf = () => {
        onLoadPresetData(
            {
                quality: "masterpiece, best quality, amazing quality, highres, illustration, cel shading",
                identity: "1girl, solo, emerald eyes, glowing eyes, elf ears, silver hair, elegant hairstyle, loose framing side tendrils",
                proportions: "slender, athletic build, toned stomach, wide hips, thick thighs, delicate hands, manicured nails",
                details: "glistening skin, sweat, pale skin, sun-kissed tan, slight blush, battle damage",
                expression: "focused fierce expression, intense gaze, gentle smile",
                outfit: "white fantasy ranger tunic, leather corset, detached sleeves, fingerless gloves, thigh-high boots, capelet",
                pose: "dynamic combat stance, standing on a giant mossy tree root, drawing a glowing magic bow, holding crystal arrows",
                camera: "wide shot, low angle view, environmental portrait, cowboy shot",
                background: "outdoor, ancient mystical forest, dense jungle, giant bioluminescent trees, mossy rocks, glowing mushrooms, waterfall",
                effects: "floating glowing spores, fireflies, shafts of sunlight breaking through canopy, volumetric fog, cinematic lighting, depth of field",
            },
            { name: "fantasy_elf_ranger_xl", weight: 0.8 }
        );
        showToast("Preset Fantasy Elf (Forest) dimuat!");
    };

    const handleRandomize = () => {
        const randomFrom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
        onLoadPresetData({
            quality: "(anime_coloring:1.15), masterpiece, best quality, illustration",
            identity: `${randomFrom(["1girl, solo, red eyes, black hair, bangs", "1girl, solo, emerald eyes, silver hair, elf ears", "1girl, solo, tohsaka rin, twin braids"])}`,
            proportions: `${randomFrom(["tall female, slender waist, long legs", "petite, slender, delicate hands, thigh gap"])}`,
            details: `${randomFrom(["sweat, glistening skin, slight blush", "pale skin, sweatdrops on neck and collarbone"])}`,
            expression: `${randomFrom(["melancholic intense expression", "focused fierce expression", "intense gaze, slightly parted lips"])}`,
            outfit: `${randomFrom(["ornate Victorian gothic black dress, sheer lace sleeves, corset bodice", "white fantasy ranger tunic, leather corset, detached sleeves", "red turtleneck sweater, black pleated skirt"])}`,
            pose: `${randomFrom(["theatrical standing pose, holding a glowing crimson violin", "dynamic combat stance, drawing a glowing magic bow"])}`,
            camera: `${randomFrom(["environmental portrait, full body, dramatic dutch angle", "wide shot, low angle view, cinematic composition"])}`,
            background: `${randomFrom(["abandoned gothic cathedral, giant shattered stained-glass window behind her", "ancient mystical forest, giant bioluminescent trees, waterfall"])}`,
            effects: `${randomFrom(["volumetric moonlight beams, floating dust motes, dramatic chiaroscuro lighting", "shafts of sunlight breaking through canopy, floating glowing spores, cinematic lighting"])}`,
        });
        showToast("Inspirasi karakter & scene diacak!");
    };

    // Realtime Model Parsed Output
    const activeParsedOutput = useMemo(() => {
        const modelToCompile = selectedTargetModel === "noobai" ? "illustrious" : selectedTargetModel;
        return compileCategoriesPrompt(
            inputs,
            loraEnabled ? { enabled: true, name: loraName, weight: loraWeight } : undefined,
            formatMode,
            modelToCompile,
            { isNsfw: isNsfwEnabled }
        );
    }, [inputs, loraEnabled, loraName, loraWeight, formatMode, selectedTargetModel, isNsfwEnabled]);

    // Multi-Model 8 Formats Comparison Matrix
    const allModelOutputs = useMemo<Record<PromptFormatId, string>>(() => {
        const rawJoined = compileCategoriesPrompt(
            inputs,
            loraEnabled ? { enabled: true, name: loraName, weight: loraWeight } : undefined,
            "single",
            "raw"
        );
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
        if (!rawJoined.trim()) return res;
        for (const fmt of PROMPT_FORMATS) {
            res[fmt.id] = convertPromptOffline(rawJoined, fmt.id, { isNsfw: isNsfwEnabled });
        }
        return res;
    }, [inputs, loraEnabled, loraName, loraWeight, isNsfwEnabled]);

    const displayOutput = activeParsedOutput;
    const textWithoutHeaders = displayOutput.replace(/###.*:/g, "");
    const wordCount = textWithoutHeaders.split(/\s+/).filter(Boolean).length;
    const tagCount = textWithoutHeaders.split(",").filter((s) => s.trim().length > 0).length;
    const approxTokens = Math.round(wordCount * 1.35);

    const handleCopyActive = () => {
        const text = displayOutput.trim();
        if (!text) return;
        if (onCopyOutput) {
            onCopyOutput(text);
        } else {
            navigator.clipboard.writeText(text);
        }
        const modelLabel = selectedTargetModel === "raw" ? "Raw Booru" : selectedTargetModel === "noobai" ? "NoobAI" : selectedTargetModel;
        showToast(`Prompt (${modelLabel}) berhasil disalin ke clipboard!`);
    };

    const handleSwitchCanvasActive = () => {
        if (onSwitchToCanvas) {
            onSwitchToCanvas(displayOutput.trim());
        }
    };

    const handleNormalizeAllLayers = (mode: "spaces" | "underscores" | "strip_weights") => {
        let updatedCount = 0;
        CATEGORIES.forEach((cat) => {
            const val = inputs[cat.id];
            if (!val || !val.trim()) return;
            let nextVal = val;
            if (mode === "spaces") {
                nextVal = val.replace(/_/g, " ");
            } else if (mode === "underscores") {
                nextVal = val
                    .split(",")
                    .map((p) => p.trim().replace(/[\s-]+/g, "_"))
                    .join(", ");
            } else if (mode === "strip_weights") {
                nextVal = val
                    .split(",")
                    .map((p) => p.replace(/^\(+|\)+$/g, "").replace(/:[0-9.]+$/, "").replace(/[{}[\]]/g, "").trim())
                    .join(", ");
            }
            if (nextVal !== val) {
                onInputChange(cat.id, nextVal);
                updatedCount++;
            }
        });
        setShowNormalizeMenu(false);
        showToast(`Berhasil menormalisasi ${updatedCount} layer input!`);
    };

    // Model name labels mapping
    const getModelHint = () => {
        if (selectedTargetModel === "pony") return "Auto-Inject: score_9, score_8_up... + Danbooru (_) + bobot (tag:1.1)";
        if (selectedTargetModel === "illustrious") return "Auto-Inject: masterpiece, very aesthetic + Danbooru spasi (tanpa score_9)";
        if (selectedTargetModel === "noobai") return "Auto-Inject: masterpiece, very aesthetic + Danbooru spasi (Standar NoobAI / OnomaAI)";
        if (selectedTargetModel === "animagine") return "Auto-Inject: masterpiece, newest, aesthetic + Danbooru (_) + rating:general";
        if (selectedTargetModel === "flux") return "Auto-Transform: Kalimat naratif deskriptif bahasa Inggris kontinu untuk Flux.1";
        if (selectedTargetModel === "midjourney") return "Auto-Transform: Prosa sinematik + parameter --ar 16:9 --v 6.1 --stylize 250";
        if (selectedTargetModel === "novelai") return "Auto-Convert: Syntax kurung kurawal {tag} (1.05x), spasi kata tanpa _";
        if (selectedTargetModel === "sdxl_realistic") return "Auto-Inject: Token fotografi tajam DSLR, 8k uhd, soft rim lighting";
        if (selectedTargetModel === "sd15") return "Format Klasik WebUI: Koma standar dengan pembobotan (keyword:1.2)";
        return "Format Asli Modular: Tag murni apa adanya tanpa transformasi tambahan";
    };

    return (
        <div className="aps-modular-view-wrapper">
            {/* Top Toolbar: Quick Presets & Config Bar (Satu Baris Bersih) */}
            <div className="aps-templates-strip">
                <div className="aps-templates-left">
                    <span className="aps-templates-label">Preset Cepat:</span>
                    <button
                        type="button"
                        className="aps-preset-pill-btn"
                        onClick={loadPresetRin}
                        title="Muat preset Rin Tohsaka (Fate)"
                    >
                        <span>Rin Tohsaka</span>
                    </button>
                    <button
                        type="button"
                        className="aps-preset-pill-btn"
                        onClick={loadPresetRio}
                        title="Muat preset Rio Tsukatsuki (Gothic Cathedral)"
                    >
                        <span>Rio Tsukatsuki</span>
                    </button>
                    <button
                        type="button"
                        className="aps-preset-pill-btn"
                        onClick={loadPresetElf}
                        title="Muat preset Fantasy Elf Ranger"
                    >
                        <span>Fantasy Elf</span>
                    </button>
                    <button
                        type="button"
                        className="aps-preset-pill-btn random"
                        onClick={handleRandomize}
                        title="Acak inspirasi karakter & latar"
                    >
                        <LucideIcons.Dices />
                        <span>Acak / Roll</span>
                    </button>
                </div>

                <div className="aps-templates-right">
                    {/* Toggle Mode NSFW (18+) Tanpa Emoji */}
                    <label
                        className={`aps-nsfw-toggle-pill ${isNsfwEnabled ? "active" : ""}`}
                        title="Tampilkan pilihan tag Danbooru NSFW / 18+ pada modul layer"
                    >
                        <input
                            type="checkbox"
                            checked={isNsfwEnabled}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                setIsNsfwEnabled(checked);
                                localStorage.setItem("modular_studio_nsfw_enabled", String(checked));
                                showToast(
                                    checked
                                        ? "Mode NSFW aktif: Tag dewasa Danbooru ditampilkan pada modul!"
                                        : "Mode SFW: Tag dewasa disembunyikan."
                                );
                            }}
                            className="aps-nsfw-toggle-checkbox"
                        />
                        <LucideIcons.ShieldAlert />
                        <span>Mode NSFW (18+)</span>
                    </label>

                    {/* Normalisasi Tag Dropdown */}
                    <div style={{ position: "relative" }}>
                        <button
                            type="button"
                            className="aps-normalize-tools-btn"
                            onClick={() => setShowNormalizeMenu(!showNormalizeMenu)}
                            title="Normalisasi ejaan seluruh kolom 10 layer (spasi vs underscore)"
                        >
                            <LucideIcons.RefreshCw />
                            <span>Normalisasi Tag</span>
                            <LucideIcons.ChevronDown />
                        </button>
                        {showNormalizeMenu && (
                            <div className="aps-normalize-menu-popover">
                                <button
                                    type="button"
                                    className="aps-normalize-menu-item"
                                    onClick={() => handleNormalizeAllLayers("spaces")}
                                    title="Ganti semua tanda _ menjadi spasi (Standar Illustrious-XL, NoobAI & NAI)"
                                >
                                    <span>Ganti _ ke Spasi (Illustrious / NoobAI)</span>
                                </button>
                                <button
                                    type="button"
                                    className="aps-normalize-menu-item"
                                    onClick={() => handleNormalizeAllLayers("underscores")}
                                    title="Ganti semua spasi menjadi _ (Standar Pony & Animagine)"
                                >
                                    <span>Ganti Spasi ke _ (Pony / Animagine)</span>
                                </button>
                                <button
                                    type="button"
                                    className="aps-normalize-menu-item"
                                    onClick={() => handleNormalizeAllLayers("strip_weights")}
                                    title="Hapus tanda kurung bobot () atau {} dan jadikan tag bersih"
                                >
                                    <span>Bersihkan Bobot Kurung () &amp; &#123;&#125;</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Preset Tersimpan di DB */}
                    <button
                        type="button"
                        className={`aps-action-btn-sm ${showSaveDrawer ? "active" : ""}`}
                        onClick={() => setShowSaveDrawer(!showSaveDrawer)}
                        title="Buka Preset Tersimpan di Database PostgreSQL"
                    >
                        <LucideIcons.Bookmark />
                        <span>Preset Tersimpan ({savedStudioPresets.length})</span>
                    </button>

                    {/* Bersihkan Semua */}
                    <button
                        type="button"
                        className="aps-action-btn-sm reset"
                        onClick={onClearAll}
                        title="Kosongkan seluruh kategori layer"
                    >
                        <LucideIcons.Trash />
                        <span>Bersihkan Semua</span>
                    </button>
                </div>
            </div>

            {/* Custom Presets Drawer (PostgreSQL DB) */}
            {showSaveDrawer && (
                <div className="aps-save-drawer">
                    <div className="aps-save-input-row">
                        <input
                            type="text"
                            className="aps-save-name-input"
                            placeholder="Nama racikan preset (misal: Cyberpunk Neon Street)..."
                            value={newPresetName}
                            onChange={(e) => setNewPresetName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveCustomToDb();
                            }}
                            disabled={isSavingPreset}
                        />
                        <button
                            type="button"
                            className="aps-save-btn"
                            onClick={handleSaveCustomToDb}
                            disabled={isSavingPreset || !newPresetName.trim()}
                        >
                            {isSavingPreset ? "Menyimpan..." : "Simpan ke Database"}
                        </button>
                        <button
                            type="button"
                            className="aps-save-btn cancel"
                            onClick={() => setShowSaveDrawer(false)}
                        >
                            Tutup
                        </button>
                    </div>

                    {savedPresetsLoading ? (
                        <div style={{ padding: "8px", color: "#94a3b8", fontSize: "12px" }}>
                            Memuat preset dari database...
                        </div>
                    ) : savedStudioPresets.length > 0 ? (
                        <div className="aps-saved-list">
                            {savedStudioPresets.map((p) => {
                                const dateFormatted = p.created_at
                                    ? new Date(p.created_at).toLocaleDateString("id-ID", {
                                          month: "short",
                                          day: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                      })
                                    : "DB";

                                return (
                                    <div key={p.id} className="aps-saved-item">
                                        <div className="aps-saved-info">
                                            <span className="aps-saved-title">{p.title}</span>
                                            <span className="aps-saved-date">{dateFormatted}</span>
                                        </div>
                                        <div className="aps-saved-actions">
                                            <button
                                                type="button"
                                                className="aps-saved-load-btn"
                                                onClick={() => handleLoadSavedPreset(p)}
                                                title="Muat racikan prompt ini"
                                            >
                                                Muat
                                            </button>
                                            <button
                                                type="button"
                                                className="aps-saved-del-btn"
                                                onClick={() => handleDeleteCustomFromDb(p.id, p.title)}
                                                title="Hapus preset dari database"
                                            >
                                                <LucideIcons.X />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ padding: "8px", color: "#64748b", fontSize: "12px" }}>
                            Belum ada preset modular yang tersimpan di database. Simpan racikan saat ini di atas!
                        </div>
                    )}
                </div>
            )}

            {/* Main Layout Grid: 10 Categories Smart Accordion (Left) vs Sticky Output (Right) */}
            <div className="aps-layout-grid">
                {/* 10 Modular Categories Column (Smart Accordion) */}
                <div className="aps-categories-col">
                    {CATEGORIES.map((cat) => {
                        const currentVal = inputs[cat.id] || "";
                        const parsedTags = parseTagList(currentVal);
                        const activeCount = parsedTags.length;
                        const hasContent = activeCount > 0;
                        const isExpanded = isLayerExpanded(cat.id, hasContent);

                        // Tags from database
                        const dbItems = modularPresets.filter(
                            (p) => p.subcategory?.toLowerCase() === cat.id.toLowerCase()
                        );
                        const categoryCustomDbTags = dbItems.map((p) => ({
                            name: p.positive_prompt || p.title,
                            category: p.category || "general",
                            layer: cat.id,
                        }));

                        // Extract predefined & DB chips
                        let flatChips: { text: string; isCustom: boolean; id?: number }[] = [];
                        let subgroupChips: { label: string; chips: { text: string; isCustom: boolean; id?: number }[] }[] = [];

                        if (dbItems.length > 0) {
                            flatChips = dbItems
                                .filter((p) => !p.trigger_words)
                                .map((p) => ({
                                    text: p.positive_prompt || p.title,
                                    isCustom: !p.is_system,
                                    id: p.id,
                                }));

                            const predefinedSubgroups = (cat.subgroups || []).map((s) => s.label);
                            const dbSubgroups = Array.from(
                                new Set(dbItems.map((p) => p.trigger_words).filter(Boolean) as string[])
                            );
                            const availableSubgroups = Array.from(new Set([...predefinedSubgroups, ...dbSubgroups]));

                            if (availableSubgroups.length > 0) {
                                subgroupChips = availableSubgroups
                                    .map((groupLabel) => ({
                                        label: groupLabel,
                                        chips: dbItems
                                            .filter((p) => p.trigger_words === groupLabel)
                                            .map((p) => ({
                                                text: p.positive_prompt || p.title,
                                                isCustom: !p.is_system,
                                                id: p.id,
                                            })),
                                    }))
                                    .filter((g) => g.chips.length > 0 || predefinedSubgroups.includes(g.label));
                            }
                        } else {
                            if (cat.chips) {
                                flatChips = cat.chips.map((c) => ({ text: c, isCustom: false }));
                            }
                            if (cat.subgroups) {
                                subgroupChips = cat.subgroups.map((g) => ({
                                    label: g.label,
                                    chips: g.chips.map((c) => ({ text: c, isCustom: false })),
                                }));
                            }
                        }

                        const nsfwChipsCount = isNsfwEnabled
                            ? (cat.nsfwChips?.length || 0) +
                              (cat.nsfwSubgroups?.reduce((sum, g) => sum + g.chips.length, 0) || 0)
                            : 0;

                        const totalChipsCount =
                            flatChips.length +
                            subgroupChips.reduce((sum, g) => sum + g.chips.length, 0) +
                            nsfwChipsCount;

                        // Single Unified Layer Card with Smooth Animated Accordion (CSS Grid 0fr -> 1fr)
                        return (
                            <div
                                key={cat.id}
                                className={`aps-category-card ${isExpanded ? "expanded" : "collapsed"} ${hasContent ? "has-content" : ""}`}
                            >
                                {/* Header Layer: Selalu terlihat (~44px), klik untuk buka/tutup */}
                                <div
                                    className="aps-cat-header"
                                    onClick={() => toggleLayerAccordion(cat.id)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            toggleLayerAccordion(cat.id);
                                        }
                                    }}
                                    title={isExpanded ? "Klik untuk menciutkan layer ini" : "Klik untuk membuka dan mengedit layer ini"}
                                >
                                    <div className="aps-cat-title-group">
                                        <span
                                            className={`aps-status-dot ${hasContent ? "active" : "empty"}`}
                                            aria-hidden="true"
                                        />
                                        <h3 className="aps-cat-title">{cat.title}</h3>
                                        {hasContent ? (
                                            <span className="aps-cat-tag-count">
                                                {activeCount} {isExpanded ? "tag" : "tag aktif"}
                                            </span>
                                        ) : !isExpanded ? (
                                            <span className="aps-layer-row-placeholder">
                                                Klik untuk menambah tag...
                                            </span>
                                        ) : null}
                                        {isNsfwEnabled && (cat.nsfwChips || cat.nsfwSubgroups) && (
                                            <span className="aps-cat-nsfw-badge" title="Tersedia pilihan tag dewasa NSFW">
                                                <LucideIcons.ShieldAlert />
                                                <span>18+</span>
                                            </span>
                                        )}
                                    </div>

                                    <div className="aps-cat-header-actions" onClick={(e) => e.stopPropagation()}>
                                        {!isExpanded && hasContent && (
                                            <span className="aps-layer-snippet-text">
                                                {parsedTags.slice(0, 3).join(", ")}{parsedTags.length > 3 ? "..." : ""}
                                            </span>
                                        )}
                                        {!isExpanded && (
                                            <span className="aps-layer-catalog-badge">
                                                {totalChipsCount}+ katalog
                                            </span>
                                        )}
                                        {isExpanded && hasContent && (
                                            <button
                                                type="button"
                                                className="aps-cat-clear-btn"
                                                onClick={() => onClearCategory(cat.id)}
                                                title="Kosongkan seluruh tag pada layer ini"
                                            >
                                                <LucideIcons.RotateCcw />
                                                <span>Reset</span>
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className="aps-layer-collapse-btn"
                                            onClick={() => toggleLayerAccordion(cat.id)}
                                            title={isExpanded ? "Ciutkan layer ini" : "Buka layer ini"}
                                            aria-expanded={isExpanded}
                                        >
                                            <span className={`aps-layer-chevron ${isExpanded ? "open" : ""}`}>
                                                <LucideIcons.ChevronDown />
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                {/* Smooth Animated Accordion Body */}
                                <div className={`aps-layer-accordion-content ${isExpanded ? "open" : ""}`}>
                                    <div className="aps-layer-accordion-inner">

                                {/* Khusus Layer 2: LoRA & Identitas Karakter Horizontal Bar */}
                                {cat.id === "identity" && (
                                    <div className="aps-id-horizontal-bar">
                                        {/* Toggle Gaya & Rambut vs Karakter Danbooru */}
                                        <div className="aps-identity-mode-switcher">
                                            <button
                                                type="button"
                                                className={`aps-id-mode-btn ${identityMode === "general" ? "active" : ""}`}
                                                onClick={() => setIdentityMode("general")}
                                                title="Tampilkan ciri fisik umum (rambut, mata, bentuk wajah)"
                                            >
                                                <LucideIcons.Globe />
                                                <span>Gaya &amp; Rambut</span>
                                            </button>
                                            <button
                                                type="button"
                                                className={`aps-id-mode-btn ${identityMode === "character" ? "active" : ""}`}
                                                onClick={() => setIdentityMode("character")}
                                                title="Hanya cari & tampilkan karakter Danbooru"
                                            >
                                                <LucideIcons.User />
                                                <span>Karakter Danbooru</span>
                                            </button>
                                        </div>

                                        {/* Compact LoRA Injector Bar */}
                                        <div className="aps-lora-compact-strip">
                                            <label className="aps-lora-active-check">
                                                <input
                                                    type="checkbox"
                                                    checked={loraEnabled}
                                                    onChange={(e) => setLoraEnabled(e.target.checked)}
                                                />
                                                <span>LoRA</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="aps-lora-name-input-compact"
                                                placeholder="Nama LoRA (misal: tsukatsuki_rio)..."
                                                value={loraName}
                                                onChange={(e) => setLoraName(e.target.value)}
                                            />
                                            <div className="aps-lora-slider-box-compact">
                                                <input
                                                    type="range"
                                                    min="0.1"
                                                    max="1.5"
                                                    step="0.05"
                                                    value={loraWeight}
                                                    onChange={(e) => setLoraWeight(parseFloat(e.target.value) || 0.85)}
                                                    className="aps-lora-slider"
                                                />
                                                <span className="aps-lora-val-badge">{loraWeight.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Unified Token Input Box (Pills + Inline Type/Autocomplete + Catalog Trigger) */}
                                <div className="aps-unified-token-box">
                                    {/* Active Token Pills */}
                                    {parsedTags.map((tagItem, idx) => {
                                        const weightMatch = tagItem.match(/:([0-9.]+)\)?$/);
                                        const cleanText = tagItem.replace(/^\(+|\)+$/g, "").replace(/:[0-9.]+$/, "").trim();

                                        return (
                                            <span
                                                key={`pill-${cat.id}-${idx}-${cleanText}`}
                                                className="aps-token-pill"
                                                onWheel={(e) => {
                                                    const delta = e.deltaY < 0 ? 0.05 : -0.05;
                                                    handleAdjustTagWeight(e, cat.id, idx, delta);
                                                }}
                                                title="Scroll mouse untuk mengatur bobot nilai tag"
                                            >
                                                <span className="aps-token-text">{cleanText}</span>
                                                {weightMatch && (
                                                    <span
                                                        className="aps-token-weight"
                                                        onClick={(e) => handleAdjustTagWeight(e, cat.id, idx, 0.05)}
                                                        title="Klik untuk menaikkan bobot"
                                                    >
                                                        :{weightMatch[1]}
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    className="aps-token-del-btn"
                                                    onClick={(e) => handleRemoveTagPill(e, cat.id, idx)}
                                                    title="Hapus tag ini"
                                                >
                                                    <LucideIcons.X />
                                                </button>
                                            </span>
                                        );
                                    })}

                                    {/* Inline Autocomplete Input */}
                                    <div className="aps-token-input-wrapper">
                                        <BooruAutocompleteInput
                                            as="input"
                                            className="aps-token-inline-input"
                                            placeholder={
                                                cat.id === "identity" && identityMode === "character"
                                                    ? "Ketik nama karakter Danbooru (frieren, raiden_shogun, mika)..."
                                                    : parsedTags.length === 0
                                                    ? cat.placeholder
                                                    : "+ Ketik tag baru..."
                                            }
                                            value={layerInputDrafts[cat.id] || ""}
                                            onChange={(val) => {
                                                // Jika input diisi dan diakhiri koma atau dipilih, tambahkan ke tags
                                                if (val.includes(",")) {
                                                    const parts = val.split(",").map((p) => p.trim()).filter(Boolean);
                                                    parts.forEach((p) => handleAddTagToLayer(cat.id, p));
                                                    setLayerInputDrafts((prev) => ({ ...prev, [cat.id]: "" }));
                                                } else {
                                                    setLayerInputDrafts((prev) => ({ ...prev, [cat.id]: val }));
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault();
                                                    const draft = (layerInputDrafts[cat.id] || "").trim();
                                                    if (draft) {
                                                        handleAddTagToLayer(cat.id, draft);
                                                    }
                                                }
                                            }}
                                            customDbTags={categoryCustomDbTags}
                                            layer={cat.id}
                                            category={cat.id === "identity" && identityMode === "character" ? "character" : undefined}
                                            isNsfwEnabled={isNsfwEnabled}
                                        />
                                    </div>

                                    {/* Inline Actions (Katalog Drawer Trigger) */}
                                    <div className="aps-token-box-actions">
                                        <button
                                            type="button"
                                            className="aps-token-catalog-btn"
                                            onClick={() => {
                                                setCatalogTargetLayer(cat.id);
                                                setCatalogTargetCategory(cat.id === "identity" && identityMode === "character" ? "character" : "all");
                                                setShowDanbooruCatalog(true);
                                            }}
                                            title={`Buka katalog Danbooru khusus ${cat.title}`}
                                        >
                                            <LucideIcons.BookOpen />
                                            <span>Katalog{booruStats?.layers?.[cat.id] ? ` (${booruStats.layers[cat.id]})` : ""}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Collapsible Quick-Tag Tray (Hanya ditampilkan pada layer yang sedang difokuskan, ringkas 1-2 baris) */}
                                {cat.id === "identity" && identityMode === "character" ? (
                                    <div className="aps-char-quick-banner">
                                        <span className="aps-char-quick-text">
                                            Mode Karakter Danbooru aktif. Ketik nama karakter di kotak atas untuk autokomplit instan, atau buka katalog karakter.
                                        </span>
                                        <button
                                            type="button"
                                            className="aps-char-quick-link"
                                            onClick={() => {
                                                setCatalogTargetLayer("identity");
                                                setCatalogTargetCategory("character");
                                                setShowDanbooruCatalog(true);
                                            }}
                                        >
                                            <LucideIcons.Search />
                                            <span>Buka Katalog Karakter ({booruStats?.categories?.character ? `${booruStats.categories.character}+` : "218+"})</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="aps-quick-tag-tray">
                                        <div className="aps-quick-tray-header">
                                            <span className="aps-quick-tray-label">Rekomendasi Cepat:</span>
                                            <span className="aps-quick-tray-hint">Klik untuk pasang | Klik kanan untuk bobot</span>
                                        </div>

                                        <div className={`aps-quick-tray-chips ${expandedQuickTray[cat.id] ? "expanded" : ""}`}>
                                            {flatChips.slice(0, expandedQuickTray[cat.id] ? undefined : 14).map((chipItem) => {
                                                const active = isChipActive(cat.id, chipItem.text);
                                                const weightLabel = getChipWeightLabel(cat.id, chipItem.text);

                                                return (
                                                    <div
                                                        key={`quick-${cat.id}-${chipItem.text}`}
                                                        className={`aps-chip-item ${active ? "active" : ""}`}
                                                        onClick={() => onToggleChip(cat.id, chipItem.text)}
                                                        onContextMenu={(e) => {
                                                            e.preventDefault();
                                                            onCycleChipWeight(e, cat.id, chipItem.text);
                                                        }}
                                                        title="Klik untuk pasang | Klik kanan untuk bobot"
                                                    >
                                                        <span className="aps-chip-text">{chipItem.text}</span>
                                                        {weightLabel && (
                                                            <span className="aps-chip-weight-pill">
                                                                :{weightLabel}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {/* NSFW Chips if enabled */}
                                            {isNsfwEnabled && cat.nsfwChips && cat.nsfwChips.length > 0 && (
                                                <>
                                                    {cat.nsfwChips.slice(0, expandedQuickTray[cat.id] ? undefined : 6).map((chipText) => {
                                                        const active = isChipActive(cat.id, chipText);
                                                        const weightLabel = getChipWeightLabel(cat.id, chipText);
                                                        return (
                                                            <div
                                                                key={`quick-nsfw-${cat.id}-${chipText}`}
                                                                className={`aps-chip-item aps-chip-nsfw ${active ? "active" : ""}`}
                                                                onClick={() => onToggleChip(cat.id, chipText)}
                                                                onContextMenu={(e) => {
                                                                    e.preventDefault();
                                                                    onCycleChipWeight(e, cat.id, chipText);
                                                                }}
                                                                title="Tag Dewasa (18+) - Klik untuk pasang | Klik kanan untuk bobot"
                                                            >
                                                                <span className="aps-chip-text">{chipText}</span>
                                                                {weightLabel && (
                                                                    <span className="aps-chip-weight-pill">
                                                                        :{weightLabel}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </>
                                            )}

                                            {totalChipsCount > 14 && (
                                                <button
                                                    type="button"
                                                    className="aps-quick-tray-expand-btn"
                                                    onClick={() => {
                                                        setExpandedQuickTray((prev) => ({
                                                            ...prev,
                                                            [cat.id]: !prev[cat.id],
                                                        }));
                                                    }}
                                                >
                                                    {expandedQuickTray[cat.id] ? "Tampilkan lebih sedikit" : `+${totalChipsCount - 14} lainnya...`}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
                    })}
                </div>

                {/* Right Column: Sticky Live Output & Target Model (sticky top-6) */}
                <div className="aps-output-col">
                    <div className="aps-output-card">
                        {/* Header Box Output */}
                        <div className="aps-output-header">
                            <div className="aps-output-title-group">
                                <h3 className="aps-output-title">Live Model Output</h3>
                                <div className="aps-output-metrics">
                                    <span className="aps-metric-pill">~{approxTokens} tok</span>
                                    <span className="aps-metric-pill">{tagCount} tag</span>
                                </div>
                            </div>

                            <div className="aps-output-mode-switch">
                                <button
                                    type="button"
                                    className={`aps-mode-btn ${formatMode === "single" ? "active" : ""}`}
                                    onClick={() => setFormatMode("single")}
                                >
                                    Satu Baris
                                </button>
                                <button
                                    type="button"
                                    className={`aps-mode-btn ${formatMode === "multiline" ? "active" : ""}`}
                                    onClick={() => setFormatMode("multiline")}
                                >
                                    Per Kategori
                                </button>
                            </div>
                        </div>

                        {/* Target AI Model Selector (Compact Segmented Grid) */}
                        <div className="aps-model-parser-bar">
                            <div className="aps-model-parser-label-row">
                                <span className="aps-model-parser-label">
                                    Target Arsitektur AI:
                                </span>
                                <button
                                    type="button"
                                    className="aps-compare-all-btn"
                                    onClick={() => setShowMultiModelModal(true)}
                                    title="Buka panel perbandingan 8 model sekaligus"
                                >
                                    <LucideIcons.Grid />
                                    <span>Bandingkan 8 Model</span>
                                </button>
                            </div>

                            {/* Compact Grid of Pills */}
                            <div className="aps-model-chips-grid">
                                <button
                                    type="button"
                                    className={`aps-model-btn ${selectedTargetModel === "pony" ? "active pony" : ""}`}
                                    onClick={() => { setSelectedTargetModel("pony"); localStorage.setItem("modular_studio_target_model", "pony"); }}
                                    title="Pony Diffusion V6 XL - Auto-inject score_9 dan Danbooru _"
                                >
                                    Pony V6
                                </button>
                                <button
                                    type="button"
                                    className={`aps-model-btn ${selectedTargetModel === "illustrious" ? "active illustrious" : ""}`}
                                    onClick={() => { setSelectedTargetModel("illustrious"); localStorage.setItem("modular_studio_target_model", "illustrious"); }}
                                    title="Illustrious-XL - Danbooru berspasi & masterpiece"
                                >
                                    Illustrious
                                </button>
                                <button
                                    type="button"
                                    className={`aps-model-btn ${selectedTargetModel === "animagine" ? "active animagine" : ""}`}
                                    onClick={() => { setSelectedTargetModel("animagine"); localStorage.setItem("modular_studio_target_model", "animagine"); }}
                                    title="Animagine XL 3.1 - Danbooru _ & newest aesthetic"
                                >
                                    Animagine XL
                                </button>
                                <button
                                    type="button"
                                    className={`aps-model-btn ${selectedTargetModel === "flux" ? "active flux" : ""}`}
                                    onClick={() => { setSelectedTargetModel("flux"); localStorage.setItem("modular_studio_target_model", "flux"); }}
                                    title="Flux.1 (Dev/Schnell) - Kalimat naratif bahasa Inggris alami"
                                >
                                    Flux.1
                                </button>
                                <button
                                    type="button"
                                    className={`aps-model-btn ${selectedTargetModel === "noobai" ? "active illustrious" : ""}`}
                                    onClick={() => { setSelectedTargetModel("noobai"); localStorage.setItem("modular_studio_target_model", "noobai"); }}
                                    title="NoobAI - Standar resmi OnomaAI tanpa score_9"
                                >
                                    NoobAI
                                </button>
                                <button
                                    type="button"
                                    className={`aps-model-btn ${selectedTargetModel === "sdxl_realistic" ? "active sdxl" : ""}`}
                                    onClick={() => { setSelectedTargetModel("sdxl_realistic"); localStorage.setItem("modular_studio_target_model", "sdxl_realistic"); }}
                                    title="SDXL Photorealistic - Token DSLR & fotografi tajam"
                                >
                                    SDXL
                                </button>
                                <button
                                    type="button"
                                    className={`aps-model-btn ${selectedTargetModel === "midjourney" ? "active midjourney" : ""}`}
                                    onClick={() => { setSelectedTargetModel("midjourney"); localStorage.setItem("modular_studio_target_model", "midjourney"); }}
                                    title="Midjourney V6.1 - Prosa sinematik & parameter render"
                                >
                                    Midjourney
                                </button>
                                <button
                                    type="button"
                                    className={`aps-model-btn ${selectedTargetModel === "raw" ? "active raw" : ""}`}
                                    onClick={() => { setSelectedTargetModel("raw"); localStorage.setItem("modular_studio_target_model", "raw"); }}
                                    title="Raw 10-Layer - Format asli tanpa transformasi"
                                >
                                    Raw
                                </button>
                            </div>

                            {/* Auto-Prefix / Quality Rule Hint */}
                            <div className="aps-model-rule-hint">
                                {getModelHint()}
                            </div>
                        </div>

                        {/* Live Prompt Output (Code Block Style with Color-Coded Syntax Highlighting) */}
                        <div className="aps-codeblock-wrapper">
                            <div className="aps-codeblock-header">
                                <span className="aps-codeblock-badge">FORMATTED PROMPT</span>
                                <button
                                    type="button"
                                    className="aps-codeblock-toggle-raw"
                                    onClick={() => setIsRawTextEditMode(!isRawTextEditMode)}
                                >
                                    {isRawTextEditMode ? "Tampilan Syntax" : "Edit Teks Mentah"}
                                </button>
                            </div>

                            {isRawTextEditMode ? (
                                <textarea
                                    className="aps-output-textarea"
                                    rows={8}
                                    value={displayOutput}
                                    readOnly
                                    placeholder="Prompt otomatis terkompilasi di sini..."
                                />
                            ) : (
                                <PromptSyntaxHighlighter text={displayOutput} />
                            )}
                        </div>

                        {/* Hierarchical Action Buttons */}
                        <div className="aps-output-actions">
                            {/* 1 Tombol Utama Penuh */}
                            <button
                                type="button"
                                className="aps-copy-btn-primary"
                                onClick={handleCopyActive}
                            >
                                {copied ? <LucideIcons.Check /> : <LucideIcons.Copy />}
                                <span>{copied ? "Prompt Berhasil Disalin!" : `Salin Prompt (${selectedTargetModel === "noobai" ? "NoobAI" : selectedTargetModel})`}</span>
                            </button>

                            {/* Baris ke-2: Grid 2 Kolom */}
                            <div className="aps-action-grid-2">
                                <button
                                    type="button"
                                    className="aps-action-sub-btn"
                                    onClick={handleSwitchCanvasActive}
                                    title="Uji prompt ini di Lab Canvas"
                                >
                                    <LucideIcons.ArrowRight />
                                    <span>Uji di Lab Canvas</span>
                                </button>
                                <button
                                    type="button"
                                    className="aps-action-sub-btn"
                                    onClick={onSaveToPresetLibrary}
                                    title="Simpan sebagai Preset ke Database"
                                >
                                    <LucideIcons.Bookmark />
                                    <span>Simpan Preset</span>
                                </button>
                            </div>

                            {/* Baris ke-3: Tombol Katalog Danbooru (Lebar Penuh) */}
                            <button
                                type="button"
                                className="aps-action-sub-btn secondary full-width"
                                onClick={() => {
                                    setCatalogTargetLayer("all");
                                    setCatalogTargetCategory("all");
                                    setShowDanbooruCatalog(true);
                                }}
                                title="Buka katalog Danbooru lengkap"
                            >
                                <LucideIcons.BookOpen />
                                <span>Katalog Danbooru ({booruStats ? `${booruStats.total_tags.toLocaleString("id-ID")}+ Tag` : "1.835+ Tag"})</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Danbooru Database Catalog Drawer */}
            <DanbooruCatalogDrawer
                isOpen={showDanbooruCatalog}
                onClose={() => {
                    setShowDanbooruCatalog(false);
                    getBooruTagStatsApi().then((d) => setBooruStats(d)).catch(() => {});
                }}
                onInsertTag={handleInsertTagFromCatalog}
                activeLayerId={catalogTargetLayer}
                initialCategory={catalogTargetCategory}
                showToast={showToast}
                isNsfwEnabled={isNsfwEnabled}
                onToggleNsfw={(checked) => setIsNsfwEnabled(checked)}
            />

            {/* Quick-Tag Layer Pop-up Modal */}
            {modalLayerDetail && (
                <div
                    className="aps-layer-modal-backdrop"
                    onClick={() => {
                        setModalLayerDetail(null);
                        setLayerModalSearch("");
                    }}
                >
                    <div
                        className="aps-layer-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="aps-layer-modal-header">
                            <div className="aps-layer-modal-title-group">
                                <h3 className="aps-layer-modal-title">
                                    Katalog Tag: {modalLayerDetail.title}
                                </h3>
                                <span className="aps-layer-modal-badge">
                                    {modalLayerDetail.chips.length} Tag Tersedia
                                </span>
                            </div>
                            <button
                                type="button"
                                className="aps-layer-modal-close-btn"
                                onClick={() => {
                                    setModalLayerDetail(null);
                                    setLayerModalSearch("");
                                }}
                            >
                                <LucideIcons.X />
                            </button>
                        </div>

                        <div className="aps-layer-modal-search-row">
                            <input
                                type="text"
                                className="aps-layer-modal-search-input"
                                placeholder={`Cari tag untuk ${modalLayerDetail.title}...`}
                                value={layerModalSearch}
                                onChange={(e) => setLayerModalSearch(e.target.value)}
                                autoFocus
                            />
                            {layerModalSearch && (
                                <button
                                    type="button"
                                    className="aps-layer-modal-search-clear"
                                    onClick={() => setLayerModalSearch("")}
                                >
                                    Bersihkan
                                </button>
                            )}
                        </div>

                        <div className="aps-layer-modal-body">
                            <div className="aps-chips-wrap">
                                {modalLayerDetail.chips
                                    .filter((c) =>
                                        c.text.toLowerCase().includes(layerModalSearch.toLowerCase().trim())
                                    )
                                    .map((chipItem) => {
                                        const active = isChipActive(modalLayerDetail.id, chipItem.text);
                                        const weightLabel = getChipWeightLabel(modalLayerDetail.id, chipItem.text);

                                        return (
                                            <div
                                                key={`modal-${chipItem.text}`}
                                                className={`aps-chip-item ${active ? "active" : ""}`}
                                                onClick={() => onToggleChip(modalLayerDetail.id, chipItem.text)}
                                                onContextMenu={(e) => {
                                                    e.preventDefault();
                                                    onCycleChipWeight(e, modalLayerDetail.id, chipItem.text);
                                                }}
                                                title="Klik untuk pasang | Klik kanan untuk bobot"
                                            >
                                                <span className="aps-chip-text">{chipItem.text}</span>
                                                {weightLabel && (
                                                    <span className="aps-chip-weight-pill">
                                                        :{weightLabel}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Multi-Model Comparison Modal (8 Model Grid) */}
            {showMultiModelModal && (
                <div
                    className="aps-multi-model-modal-backdrop"
                    onClick={() => setShowMultiModelModal(false)}
                >
                    <div
                        className="aps-multi-model-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="aps-multi-model-header">
                            <div className="aps-multi-model-title-group">
                                <h3 className="aps-multi-model-title">
                                    Perbandingan 8 Model Arsitektur AI
                                </h3>
                                <span className="aps-multi-model-sub">
                                    Format otomatis diparsing real-time dari 10 layer visual
                                </span>
                            </div>
                            <button
                                type="button"
                                className="aps-multi-model-close-btn"
                                onClick={() => setShowMultiModelModal(false)}
                            >
                                <LucideIcons.X />
                            </button>
                        </div>

                        <div className="aps-multi-model-grid">
                            {PROMPT_FORMATS.map((fmt) => {
                                const out = allModelOutputs[fmt.id] || "";
                                const isCopied = copiedModelId === fmt.id;

                                return (
                                    <div key={fmt.id} className="aps-multi-model-card">
                                        <div className="aps-multi-model-card-header">
                                            <div className="aps-multi-model-card-title-group">
                                                <span
                                                    className="aps-multi-model-dot"
                                                    style={{ background: fmt.color }}
                                                />
                                                <span className="aps-multi-model-name">{fmt.name}</span>
                                            </div>
                                            <button
                                                type="button"
                                                className={`aps-multi-model-copy-btn ${isCopied ? "copied" : ""}`}
                                                onClick={() => {
                                                    if (!out.trim()) return;
                                                    navigator.clipboard.writeText(out);
                                                    setCopiedModelId(fmt.id);
                                                    showToast(`Format ${fmt.name} berhasil disalin!`);
                                                    setTimeout(() => setCopiedModelId(null), 2000);
                                                }}
                                                disabled={!out.trim()}
                                            >
                                                {isCopied ? <LucideIcons.Check /> : <LucideIcons.Copy />}
                                                <span>{isCopied ? "Tersalin!" : "Salin"}</span>
                                            </button>
                                        </div>

                                        <p className="aps-multi-model-desc">{fmt.description}</p>

                                        <textarea
                                            className="aps-multi-model-textarea"
                                            value={out}
                                            readOnly
                                            placeholder="Belum ada tag yang dipilih..."
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
