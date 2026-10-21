import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    getModels,
    getPromptPresets,
    createPromptPresetApi,
    updatePromptPresetApi,
    deletePromptPresetApi,
    uploadPresetSampleImageApi,
    getAllImages,
    type Model,
    type PromptPreset,
    type ModelImage,
} from "../../api/models";
import { resolveImageUrl } from "../../api/client";
import { OptimizedImage } from "../common/OptimizedImage";
import "../../style/PromptLab.css";
import "../../style/AnimePromptStudio.css";
import "../../style/PromptStudioTabs.css";
import {
    PromptStudioTabs,
    type StudioTabKey,
} from "../prompt-studio/PromptStudioTabs";
import { WorkflowBridgeBanner } from "../common/WorkflowBridgeBanner";
import {
    type WorkflowBridgeData,
    bridgeToVramProfiler,
    bridgeToCalculator,
    bridgeToSamplerGuide,
} from "../../utils/workflowBridge";
import {
    INITIAL_CATEGORY_INPUTS,
    compileCategoriesPrompt,
    deconstructPromptText,
    parseTagList,
} from "../prompt-studio/PromptCategoriesData";
import { ModularStudioView } from "../prompt-studio/ModularStudioView";
import { DeconstructorView } from "../prompt-studio/DeconstructorView";
import { BooruAutocompleteInput } from "../common/BooruAutocompleteInput";
import { ClipChunkVisualizer } from "../prompt-studio/ClipChunkVisualizer";
import { tokenizeClipPrompt } from "../../utils/clipTokenizer";

// SVG Technical Icons (No AI Slop)
const Icons = {
    Sliders: () => (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="21" x2="4" y2="14"></line>
            <line x1="4" y1="10" x2="4" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12" y2="3"></line>
            <line x1="20" y1="21" x2="20" y2="16"></line>
            <line x1="20" y1="12" x2="20" y2="3"></line>
            <line x1="1" y1="14" x2="7" y2="14"></line>
            <line x1="9" y1="8" x2="15" y2="8"></line>
            <line x1="17" y1="16" x2="23" y2="16"></line>
        </svg>
    ),
    Matrix: () => (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
    ),
    Copy: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
    ),
    Eye: () => (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        </svg>
    ),
    Check: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
    ),
    Clean: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l1.912 5.885a2 2 0 0 0 1.272 1.272L21 12l-5.816 1.843a2 2 0 0 0-1.272 1.272L12 21l-1.912-5.885a2 2 0 0 0-1.272-1.272L3 12l5.816-1.843a2 2 0 0 0 1.272-1.272L12 3z"></path>
        </svg>
    ),
    Edit: () => (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
    ),
    Trash: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
    ),
    Dice: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <circle cx="15.5" cy="15.5" r="1.5"></circle>
            <circle cx="12" cy="12" r="1.5"></circle>
        </svg>
    ),
    Bookmark: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
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
    Plus: () => (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
    ),
    Layers: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
        </svg>
    ),
    Search: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
    ),
    Tag: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
            <line x1="7" y1="7" x2="7.01" y2="7"></line>
        </svg>
    ),
    Sparkle: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
    ),
    ArrowLeft: () => (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
    ),
    ArrowRight: () => (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
    ),
    Star: ({ filled }: { filled?: boolean }) => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
    ),
    History: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
            <path d="M3 3v5h5"></path>
            <polyline points="12 7 12 12 15 15"></polyline>
        </svg>
    ),
    Image: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
    ),
    Layout: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="3" x2="9" y2="21"></line>
        </svg>
    ),
    Clipboard: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
        </svg>
    ),
    Undo: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7v6h6"></path>
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
        </svg>
    ),
    Wand: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 4V2"></path>
            <path d="M15 16v-2"></path>
            <path d="M8 9h2"></path>
            <path d="M20 9h2"></path>
            <path d="M17.8 11.8L19 13"></path>
            <path d="M15 9h0"></path>
            <path d="M17.8 6.2L19 5"></path>
            <path d="M3 21l9-9"></path>
            <path d="M12.2 6.2L11 5"></path>
        </svg>
    ),
    X: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    ),
    CornerDownLeft: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 10 4 15 9 20"></polyline>
            <path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
        </svg>
    ),
};

const classifyTag = (tokenStr: string): "quality" | "subject" | "outfit" | "scene" | "lighting" | "lora" | "general" => {
    const lower = tokenStr.toLowerCase().trim();
    if (lower.startsWith("<lora:")) return "lora";
    if (
        lower.includes("masterpiece") ||
        lower.includes("best quality") ||
        lower.includes("aesthetic") ||
        lower.includes("newest") ||
        lower.includes("high quality") ||
        lower.includes("detailed")
    ) {
        return "quality";
    }
    if (
        lower.includes("girl") ||
        lower.includes("boy") ||
        lower.includes("hair") ||
        lower.includes("eyes") ||
        lower.includes("face") ||
        lower.includes("smile") ||
        lower.includes("looking at") ||
        lower.includes("solo") ||
        lower.includes("twintails") ||
        lower.includes("ponytail")
    ) {
        return "subject";
    }
    if (
        lower.includes("uniform") ||
        lower.includes("dress") ||
        lower.includes("shirt") ||
        lower.includes("jacket") ||
        lower.includes("skirt") ||
        lower.includes("collar") ||
        lower.includes("necktie") ||
        lower.includes("suit") ||
        lower.includes("outfit") ||
        lower.includes("hoodie") ||
        lower.includes("blazer")
    ) {
        return "outfit";
    }
    if (
        lower.includes("light") ||
        lower.includes("shadow") ||
        lower.includes("sun") ||
        lower.includes("neon") ||
        lower.includes("glow") ||
        lower.includes("bloom")
    ) {
        return "lighting";
    }
    if (
        lower.includes("background") ||
        lower.includes("indoors") ||
        lower.includes("outdoors") ||
        lower.includes("room") ||
        lower.includes("office") ||
        lower.includes("street") ||
        lower.includes("sky") ||
        lower.includes("cafe")
    ) {
        return "scene";
    }
    return "general";
};

const ARCHITECTURE_NEGATIVES: Record<string, string> = {
    Illustrious: "worst quality, low quality, bad anatomy, bad hands, missing fingers, extra digits, blurry, watermark, signature, artist name, deformed",
    SDXL: "illustration, 3d, 2d, painting, cartoons, sketch, bad anatomy, bad hands, plastic skin, oversaturated, deformed, bad teeth, watermark, text",
    Pony: "score_4, score_5, score_6, source_furry, source_pony, ugly, bad anatomy, bad hands, blurry, missing digits, extra arms",
    Flux: "worst quality, low quality, blurry, distorted, grainy, text, watermark, bad hands",
};

const NEGATIVE_PRESET_LABELS: Record<string, string> = {
    Illustrious: "Illustrious Standard",
    SDXL: "SDXL Crisp",
    Pony: "Pony Clean",
    Flux: "Flux Natural",
};

const CATEGORIZED_NEGATIVE_TAGS: { category: string; tags: string[] }[] = [
    {
        category: "Quality",
        tags: ["worst quality", "low quality", "blurry", "jpeg artifacts", "grainy", "deformed"],
    },
    {
        category: "Anatomy",
        tags: ["bad anatomy", "bad hands", "missing fingers", "extra digits", "extra limbs", "bad feet"],
    },
    {
        category: "Artifacts",
        tags: ["watermark", "signature", "text", "username", "logo", "artist name"],
    },
    {
        category: "Style/Aesthetic",
        tags: ["ugly", "sketch", "monochrome", "mutated", "oversaturated", "3d render"],
    },
];

const PRESET_CATEGORIES = [
    { id: "anime", label: "Anime" },
    { id: "realistic", label: "Realistic" },
];

const PRESET_STYLE_OPTIONS = [
    { value: "anime", label: "Anime", hint: "Gaya gambar 2D / Manga / Illustrious" },
    { value: "realistic", label: "Realistic", hint: "Fotografi / Cinematic / SDXL Realism" },
];

const WILDCARD_TEMPLATES = [
    { title: "Lighting Mood", wildcard: "{golden hour | cinematic lighting | volumetric lighting | neon rim lighting | moody moonlight}" },
    { title: "Camera Angle", wildcard: "{cowboy shot | dynamic angle | dutch angle | close up | from below | from above}" },
    { title: "Outfit Variations", wildcard: "{school uniform | elegant gothic dress | casual streetwear | cyberpunk combat gear | formal suit}" },
    { title: "Weather / Background", wildcard: "{cherry blossoms falling | rain soaked street | sunset sky | futuristic city rooftop | cozy sunlit cafe}" },
    { title: "Facial Expression", wildcard: "{gentle smile | shy blush | confident grin | serious intense expression | mischievous smirk}" },
    { title: "Artistic Medium", wildcard: "{anime official art | detailed digital illustration | key visual anime poster | oil painting aesthetic}" },
];

interface BlockGroup {
    key: string;
    label: string;
    match: string[];
    matchCategory?: string;
    modalCategory: string;
    defaults: string[];
}

const BLOCK_GROUPS: BlockGroup[] = [
    {
        key: "char",
        label: "Wajah & Rambut",
        match: ["hair", "eyes", "face", "character", "appearance", "hair/face"],
        modalCategory: "Hair/Face",
        defaults: ["1girl", "black hair", "long hair", "red eyes", "ponytail", "twintails", "looking at viewer", "blush", "smile"],
    },
    {
        key: "outfit",
        label: "Pakaian & Aksesoris",
        match: ["outfit", "clothing", "dress", "uniform"],
        modalCategory: "Outfit",
        defaults: ["school uniform", "serafuku", "blazer", "white shirt", "pleated skirt", "sweater", "maid", "kimono", "hoodie"],
    },
    {
        key: "pose",
        label: "Pose & Aksi",
        match: ["pose", "action", "gesture"],
        modalCategory: "Pose",
        defaults: ["standing", "sitting", "lying", "crossed arms", "hand on hip", "peace sign", "holding cup", "walking"],
    },
    {
        key: "bg",
        label: "Latar & Lingkungan",
        match: ["background", "environment", "setting"],
        modalCategory: "Background",
        defaults: ["indoors", "outdoors", "bedroom", "classroom", "cafe", "city street", "night sky", "sunset", "simple background"],
    },
    {
        key: "lighting",
        label: "Pencahayaan & Suasana",
        match: ["lighting", "atmosphere"],
        modalCategory: "Lighting",
        defaults: ["cinematic lighting", "soft lighting", "rim lighting", "volumetric lighting", "sunlight", "god rays", "neon lights", "dramatic shadows"],
    },
    {
        key: "camera",
        label: "Kamera & Komposisi",
        match: ["camera", "angle", "composition"],
        modalCategory: "Camera",
        defaults: ["cowboy shot", "close-up", "upper body", "full body", "wide shot", "dutch angle", "from above", "from below"],
    },
];

const KNOWN_BLOCK_SUBCATS = BLOCK_GROUPS.flatMap((g) => g.match);

interface PromptSnapshot {
    id: string;
    label: string;
    positive: string;
    negative: string;
    timestamp: number;
}

interface CharacterGroup {
    character: string;
    presets: PromptPreset[];
    count: number;
    hasFavorite: boolean;
    sampleImages: string[];
    subcategories: string[];
    baseModels: string[];
}

const getPresetCharacter = (p: PromptPreset): string => {
    if (p.character && p.character.trim()) return p.character.trim();
    const parenMatch = (p.title || "").match(/^([^(]+)\s*\((.+)\)$/);
    if (parenMatch && parenMatch[1].trim()) return parenMatch[1].trim();
    const dashMatch = (p.title || "").match(/^([^-]+)\s*-\s*(.+)$/);
    if (dashMatch && dashMatch[1].trim()) return dashMatch[1].trim();
    if (p.subcategory && p.subcategory.trim()) return p.subcategory.trim();
    return (p.title || "").trim() || "Unknown Character";
};

const getPresetVariantTitle = (p: PromptPreset, characterName?: string): string => {
    const char = characterName || getPresetCharacter(p);
    let title = (p.title || "").trim();
    if (title.toLowerCase().startsWith(char.toLowerCase())) {
        const rest = title.slice(char.length).trim();
        const cleaned = rest.replace(/^[-–—:]\s*/, "").replace(/^\((.*)\)$/, "$1").trim();
        if (cleaned) return cleaned;
    }
    return title;
};

export interface PromptLabProps {
    defaultTab?: StudioTabKey;
}

interface ActiveGenerationRecipe {
    sampler?: string;
    scheduler?: string;
    steps?: number;
    cfgScale?: number;
    width?: number;
    height?: number;
    baseModel?: string;
    seed?: number;
}

export const PromptLab: React.FC<PromptLabProps> = ({ defaultTab = "studio" }) => {
    const navigate = useNavigate();
    const [activeRecipe, setActiveRecipe] = useState<ActiveGenerationRecipe | null>(null);

    // Studio Workstation Mode Tab ("studio" | "canvas" | "deconstructor" | "library")
    const [studioTab, setStudioTab] = useState<StudioTabKey>(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const tabParam = params.get("tab") as StudioTabKey;
            if (tabParam && ["studio", "canvas", "tokenizer", "deconstructor", "library"].includes(tabParam)) {
                return tabParam;
            }
        } catch {
            // fallback
        }
        return defaultTab || "studio";
    });

    const handleSelectTab = (tab: StudioTabKey) => {
        setStudioTab(tab);
        try {
            const url = new URL(window.location.href);
            url.searchParams.set("tab", tab);
            window.history.replaceState({}, "", url.toString());
        } catch {
            // ignore
        }
    };

    // 10-Layer Modular Studio State
    const [categoryInputs, setCategoryInputs] = useState<Record<string, string>>(() => {
        const initialText = "masterpiece, best quality, very aesthetic, newest, 1girl, rio tsukatsuki, halo, black hair, long hair, red eyes, ponytail, blazer, black jacket, collared shirt, black necktie, looking at viewer, highly detailed background, seminar office";
        return deconstructPromptText(initialText).buckets;
    });
    const [loraName, setLoraName] = useState<string>("tsukatsuki_rio_illustrious");
    const [loraWeight, setLoraWeight] = useState<number>(0.85);
    const [loraEnabled, setLoraEnabled] = useState<boolean>(true);
    const [modularFormatMode, setModularFormatMode] = useState<"single" | "multiline">("single");

    const activeCategoryCount = useMemo(() => {
        return Object.values(categoryInputs).filter((v) => (v || "").trim().length > 0).length;
    }, [categoryInputs]);

    // Canvas Prompts (Strictly kept together on unified canvas)
    const [positivePrompt, setPositivePrompt] = useState<string>(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const promptParam = params.get("prompt");
            if (promptParam && promptParam.trim()) {
                return promptParam;
            }
        } catch {
            // fallback
        }
        return "masterpiece, best quality, very aesthetic, newest, 1girl, rio tsukatsuki, halo, black hair, long hair, red eyes, ponytail, blazer, black jacket, collared shirt, black necktie, looking at viewer, highly detailed background, seminar office";
    });
    const [negativePrompt, setNegativePrompt] = useState<string>(
        "worst quality, low quality, bad anatomy, bad hands, missing fingers, extra digits, blurry, watermark, signature, deformed halo"
    );

    // Sync prompt if URL query param changes
    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const promptParam = params.get("prompt");
            if (promptParam && promptParam.trim()) {
                setPositivePrompt(promptParam);
                const { buckets, lora } = deconstructPromptText(promptParam);
                setCategoryInputs(buckets);
                if (lora) {
                    setLoraName(lora.name);
                    setLoraWeight(lora.weight);
                    setLoraEnabled(true);
                }
            }
        } catch {
            // fallback
        }
    }, []);

    // Active Checkpoint Selection for LoRA Compatibility
    const [selectedCheckpointId, setSelectedCheckpointId] = useState<string>("");

    // Active mode in positive prompt: text editor vs interactive tokenizer vs 77-token chunks vs matrix
    const [viewMode, setViewMode] = useState<"editor" | "tokenizer" | "chunks" | "matrix">("editor");
    const [showLiveChunkInline, setShowLiveChunkInline] = useState(false);

    // Negative prompt insertion mode: replace or append
    const [negativeInsertMode, setNegativeInsertMode] = useState<"replace" | "append">("replace");

    // Collapsible sidebar for focus mode
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Preset sorting: favorites first, newest, alphabetical
    const [presetSort, setPresetSort] = useState<"favorites" | "newest" | "alpha">("favorites");

    // Preset favorites persisted in localStorage
    const [favoritePresetIds, setFavoritePresetIds] = useState<number[]>(() => {
        try {
            const saved = localStorage.getItem("promptlab_favorites");
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // LoRA search filter
    const [loraSearch, setLoraSearch] = useState("");

    // Modular block search filter
    const [blockSearch, setBlockSearch] = useState("");

    // Snapshots / History Drawer state
    const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
    const [promptSnapshots, setPromptSnapshots] = useState<PromptSnapshot[]>(() => {
        try {
            const saved = localStorage.getItem("promptlab_snapshots");
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // Wildcard Quick Insert Popover
    const [isWildcardPickerOpen, setIsWildcardPickerOpen] = useState(false);

    // Floating Studio Toast
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showToast = (msg: string) => {
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        setToastMessage(msg);
        toastTimeoutRef.current = setTimeout(() => {
            setToastMessage(null);
        }, 2600);
    };

    // Interactive Tokenizer State
    const [selectedTokenIndex, setSelectedTokenIndex] = useState<number | null>(null);
    const [newTokenInput, setNewTokenInput] = useState<string>("");

    // Feedback
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // Sidebar Tab: "presets" | "catalog" | "modular"
    const [sidebarTab, setSidebarTab] = useState<"presets" | "catalog" | "modular">("presets");

    // Presets Filtering
    const [presetCategoryFilter, setPresetCategoryFilter] = useState<string>("anime");
    const [presetBaseModelFilter, setPresetBaseModelFilter] = useState<string>("all");
    const [presetSearch, setPresetSearch] = useState<string>("");

    // Database dynamic presets
    const [presets, setPresets] = useState<PromptPreset[]>([]);
    const [presetsLoading, setPresetsLoading] = useState(false);

    // Catalog state
    const [models, setModels] = useState<Model[]>([]);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [loraInsertWeight, setLoraInsertWeight] = useState<number>(0.8);

    // Save / Edit Preset Modal (Full Preset)
    const [isSavePresetModalOpen, setIsSavePresetModalOpen] = useState(false);
    const [editingPreset, setEditingPreset] = useState<PromptPreset | null>(null);
    const [newPresetTitle, setNewPresetTitle] = useState("");
    const [newPresetCharacterName, setNewPresetCharacterName] = useState("");
    const [newPresetStyle, setNewPresetStyle] = useState<string>("character");
    const [newPresetSubcategory, setNewPresetSubcategory] = useState("");
    const [newPresetTriggerWords, setNewPresetTriggerWords] = useState("");
    const [newPresetBaseModelTarget, setNewPresetBaseModelTarget] = useState("Illustrious");
    const [newPresetPositive, setNewPresetPositive] = useState("");
    const [newPresetNegative, setNewPresetNegative] = useState("");
    const [newPresetSampleList, setNewPresetSampleList] = useState<string[]>([]);
    const [isUploadingSample, setIsUploadingSample] = useState(false);
    const [isGalleryPickerOpen, setIsGalleryPickerOpen] = useState(false);
    const [galleryImages, setGalleryImages] = useState<ModelImage[]>([]);
    const [galleryLoading, setGalleryLoading] = useState(false);
    const [gallerySearch, setGallerySearch] = useState("");
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [newPresetDescription, setNewPresetDescription] = useState("");

    // Character Tag Presets Modal & Hover Tooltip
    const [selectedCharacterForModal, setSelectedCharacterForModal] = useState<string | null>(null);
    const [expandedPromptCards, setExpandedPromptCards] = useState<Record<number, boolean>>({});
    const [cardImageIndex, setCardImageIndex] = useState<Record<number, number>>({});
    const toggleExpandPrompt = (id: number) => {
        setExpandedPromptCards((prev) => ({ ...prev, [id]: !prev[id] }));
    };
    // Modular Building Block / Token Modal
    const [isAddModularModalOpen, setIsAddModularModalOpen] = useState(false);
    const [modularCategory, setModularCategory] = useState<string>("Outfit");
    const [modularCustomSubcategory, setModularCustomSubcategory] = useState<string>("");
    const [modularTitle, setModularTitle] = useState<string>("");
    const [modularToken, setModularToken] = useState<string>("");
    const [modularBaseModel, setModularBaseModel] = useState<string>("All");
    const [modularSampleImages, setModularSampleImages] = useState<string>("");

    // Modular Presets from Database & Controls
    const [modularPresets, setModularPresets] = useState<PromptPreset[]>([]);
    const [modularCategoryFilter, setModularCategoryFilter] = useState<string>("all");
    const [collapsedModularGroups, setCollapsedModularGroups] = useState<Record<string, boolean>>({});
    const [inlineAddGroupKey, setInlineAddGroupKey] = useState<string | null>(null);
    const [inlineAddTagInput, setInlineAddTagInput] = useState<string>("");

    const toggleCollapseModularGroup = (key: string) => {
        setCollapsedModularGroups((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    // Booru custom database tags for autocomplete
    const booruCustomDbTags = useMemo(() => {
        return modularPresets.map((p) => ({
            name: p.positive_prompt || p.title,
            category: p.category || "general",
        }));
    }, [modularPresets]);

    // Lightbox modal for sample previews
    const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

    // Textarea ref for selection weight shortcut
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    // Fetch dynamic presets from backend
    const fetchPresets = async () => {
        try {
            setPresetsLoading(true);
            const data = await getPromptPresets({
                category: presetCategoryFilter !== "all" ? presetCategoryFilter : undefined,
                base_model: presetBaseModelFilter !== "all" ? presetBaseModelFilter : undefined,
                search: presetSearch.trim() || undefined,
            });
            setPresets(data);
        } catch (err) {
            console.error("Failed to load prompt presets:", err);
        } finally {
            setPresetsLoading(false);
        }
    };

    // Fetch modular building blocks specifically
    const fetchModularPresets = async () => {
        try {
            const data = await getPromptPresets({
                type: "modular",
            });
            setModularPresets(data);
        } catch (err) {
            console.error("Failed to load modular presets:", err);
        }
    };

    // Load catalog models
    const fetchCatalog = async () => {
        try {
            setCatalogLoading(true);
            const res = await getModels({ limit: 100 });
            setModels(res.data || []);
            // Default selected checkpoint if available
            const firstCheckpoint = (res.data || []).find((m) => m.type === "checkpoint");
            if (firstCheckpoint && !selectedCheckpointId) {
                setSelectedCheckpointId(String(firstCheckpoint.id));
            }
        } catch (err) {
            console.error("Failed to fetch catalog models:", err);
        } finally {
            setCatalogLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCatalog();
            fetchModularPresets();
        }, 0);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPresets();
        }, 0);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [presetCategoryFilter, presetBaseModelFilter, presetSearch]);

    // Active Checkpoint Object
    const activeCheckpoint = useMemo(() => {
        return models.find((m) => String(m.id) === selectedCheckpointId) || null;
    }, [models, selectedCheckpointId]);

    // Compatible LoRAs matched to active checkpoint base_model
    const compatibleLoras = useMemo(() => {
        let loras = models.filter((m) => m.type === "lora");
        if (activeCheckpoint) {
            const targetBase = (activeCheckpoint.base_model || "").toLowerCase();
            if (targetBase) {
                loras = loras.filter((lora) => {
                    const loraBase = (lora.base_model || "").toLowerCase();
                    return loraBase.includes(targetBase) || targetBase.includes(loraBase) || loraBase === "" || loraBase === "all";
                });
            }
        }
        if (loraSearch.trim()) {
            const q = loraSearch.toLowerCase();
            loras = loras.filter((m) => m.name.toLowerCase().includes(q) || (m.slug && m.slug.toLowerCase().includes(q)));
        }
        return loras;
    }, [models, activeCheckpoint, loraSearch]);

    // Helper: Trigger temporary copied state
    const triggerCopy = (text: string, key: string, toast?: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        if (toast) showToast(toast);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    // Real CLIP & BPE Token count estimation and chunk profiling
    const posTokenResult = useMemo(() => {
        return tokenizeClipPrompt(positivePrompt);
    }, [positivePrompt]);

    const posTokenCount = posTokenResult.totalTextTokens;

    const negTokenCount = useMemo(() => {
        return tokenizeClipPrompt(negativePrompt).totalTextTokens;
    }, [negativePrompt]);

    // Tokenize Positive Prompt into individual tokens
    const tokens = useMemo(() => {
        return positivePrompt
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
    }, [positivePrompt]);

    // Parse token weight
    const parseTokenWeight = (tokenStr: string) => {
        const weightedMatch = tokenStr.match(/^\((.+):([0-9.]+)\)$/);
        if (weightedMatch) {
            return {
                clean: weightedMatch[1].trim(),
                weight: parseFloat(weightedMatch[2]),
                isWeighted: true,
            };
        }
        const bracketMatch = tokenStr.match(/^\[(.+)\]$/);
        if (bracketMatch) {
            return {
                clean: bracketMatch[1].trim(),
                weight: 0.9,
                isWeighted: true,
            };
        }
        const parenMatch = tokenStr.match(/^\((.+)\)$/);
        if (parenMatch) {
            return {
                clean: parenMatch[1].trim(),
                weight: 1.1,
                isWeighted: true,
            };
        }
        return {
            clean: tokenStr,
            weight: 1.0,
            isWeighted: false,
        };
    };

    // Update single token weight
    const updateTokenWeight = (index: number, newWeight: number) => {
        const currentToken = tokens[index];
        if (!currentToken) return;

        const { clean } = parseTokenWeight(currentToken);
        const rounded = Math.round(newWeight * 100) / 100;
        const formatted = rounded === 1.0 ? clean : `(${clean}:${rounded.toFixed(2)})`;

        const newTokens = [...tokens];
        newTokens[index] = formatted;
        setPositivePrompt(newTokens.join(", "));
    };

    // Remove token
    const removeToken = (index: number) => {
        const newTokens = tokens.filter((_, i) => i !== index);
        setPositivePrompt(newTokens.join(", "));
        setSelectedTokenIndex(null);
    };

    // Move token left or right
    const moveToken = (index: number | null, direction: "left" | "right") => {
        if (index === null) return;
        const targetIndex = direction === "left" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= tokens.length) return;

        const newTokens = [...tokens];
        const [moved] = newTokens.splice(index, 1);
        newTokens.splice(targetIndex, 0, moved);
        setPositivePrompt(newTokens.join(", "));
        setSelectedTokenIndex(targetIndex);
    };

    // Deduplicate tokens
    const handleDeduplicateTokens = () => {
        handleTakeSnapshot("Before Deduplicate");
        const seen = new Set<string>();
        const uniqueTokens: string[] = [];
        tokens.forEach((t) => {
            const normalized = t.toLowerCase().trim();
            if (!seen.has(normalized)) {
                seen.add(normalized);
                uniqueTokens.push(t.trim());
            }
        });
        const removedCount = tokens.length - uniqueTokens.length;
        setPositivePrompt(uniqueTokens.join(", "));
        showToast(removedCount > 0 ? `${removedCount} token duplikat dihapus!` : "Tidak ada token duplikat.");
    };

    // Sort tokens by semantic category order
    const handleSortTokensByCategory = () => {
        handleTakeSnapshot("Before Organize Order");
        const priority: Record<string, number> = {
            quality: 1,
            subject: 2,
            outfit: 3,
            scene: 4,
            lighting: 5,
            general: 6,
            lora: 7,
        };
        const sorted = [...tokens].sort((a, b) => {
            const catA = classifyTag(a);
            const catB = classifyTag(b);
            return (priority[catA] || 99) - (priority[catB] || 99);
        });
        setPositivePrompt(sorted.join(", "));
        showToast("Urutan tag ditata berdasarkan kategori!");
    };

    // Add token in tokenizer mode
    const handleAddTokenInTokenizer = (e: React.FormEvent) => {
        e.preventDefault();
        const tag = newTokenInput.trim();
        if (!tag) return;
        handleAppendPositive(tag);
        setNewTokenInput("");
        showToast(`Tag "${tag}" ditambahkan!`);
    };

    // Clean formatting
    const cleanPromptText = (text: string) => {
        return text
            .replace(/\s+/g, " ")
            .replace(/,\s*,+/g, ",")
            .replace(/,\s*$/g, "")
            .replace(/^\s*,\s*/g, "")
            .trim();
    };

    // Toggle standard negative tag
    const toggleNegativeTag = (tag: string) => {
        const currentTags = negativePrompt
            .split(",")
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean);

        if (currentTags.includes(tag.toLowerCase())) {
            const filtered = negativePrompt
                .split(",")
                .map((t) => t.trim())
                .filter((t) => t.toLowerCase() !== tag.toLowerCase());
            setNegativePrompt(filtered.join(", "));
        } else {
            const updated = negativePrompt.trim()
                ? `${negativePrompt.trim()}, ${tag}`
                : tag;
            setNegativePrompt(updated);
        }
    };

    // Snapshot Management
    const handleTakeSnapshot = (customLabel?: string) => {
        // eslint-disable-next-line react-hooks/purity
        const now = Date.now();
        const newSnap: PromptSnapshot = {
            id: now.toString(),
            label: customLabel || `Manual Snapshot #${promptSnapshots.length + 1}`,
            positive: positivePrompt,
            negative: negativePrompt,
            timestamp: now,
        };
        const updated = [newSnap, ...promptSnapshots].slice(0, 15);
        setPromptSnapshots(updated);
        try {
            localStorage.setItem("promptlab_snapshots", JSON.stringify(updated));
        } catch (e) {
            console.error("Failed to save snapshot to localStorage:", e);
        }
        showToast(customLabel ? `Snapshot tersimpan: ${customLabel}` : "Snapshot canvas berhasil diambil!");
    };

    const handleRestoreSnapshot = (snap: PromptSnapshot) => {
        handleTakeSnapshot("Before Restore");
        setPositivePrompt(snap.positive);
        setNegativePrompt(snap.negative);
        setIsHistoryDrawerOpen(false);
        showToast(`Canvas dipulihkan ke: ${snap.label}`);
    };

    const handleDeleteSnapshot = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const updated = promptSnapshots.filter((s) => s.id !== id);
        setPromptSnapshots(updated);
        try {
            localStorage.setItem("promptlab_snapshots", JSON.stringify(updated));
        } catch (e) {
            console.error("Failed to delete snapshot from localStorage:", e);
        }
        showToast("Snapshot dihapus");
    };

    // Toggle favorite preset
    const toggleFavoritePreset = (id: number, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setFavoritePresetIds((prev) => {
            const exists = prev.includes(id);
            const next = exists ? prev.filter((favId) => favId !== id) : [...prev, id];
            try {
                localStorage.setItem("promptlab_favorites", JSON.stringify(next));
            } catch (err) {
                console.error("Failed to save favorites:", err);
            }
            showToast(exists ? "Dihapus dari favorit" : "Ditambahkan ke favorit ⭐");
            return next;
        });
    };

    // LoRA helper checks
    const isLoraInPrompt = (m: Model) => {
        const slug = (m.slug || m.name.toLowerCase().replace(/[^a-z0-9_-]/g, "_")).toLowerCase();
        return positivePrompt.toLowerCase().includes(`<lora:${slug}:`);
    };

    const handleRemoveLoRA = (m: Model) => {
        const slug = (m.slug || m.name.toLowerCase().replace(/[^a-z0-9_-]/g, "_")).toLowerCase();
        const regex = new RegExp(`<lora:${slug}:[0-9.]+>,?\\s*`, "gi");
        const updated = positivePrompt.replace(regex, "");
        setPositivePrompt(cleanPromptText(updated));
        showToast(`LoRA ${m.name} dihapus dari prompt`);
    };

    // Apply architecture negative
    const handleApplyArchitectureNegative = (arch: string) => {
        const neg = ARCHITECTURE_NEGATIVES[arch] || ARCHITECTURE_NEGATIVES.Illustrious;
        if (negativeInsertMode === "append" && negativePrompt.trim()) {
            setNegativePrompt(cleanPromptText(`${negativePrompt.trim()}, ${neg}`));
        } else {
            setNegativePrompt(neg);
        }
        showToast(`Negative preset untuk ${arch} dimuat!`);
    };

    // Keyboard shortcut for weight adjusting (Ctrl+Up / Ctrl+Down)
    const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
            e.preventDefault();
            const textarea = textareaRef.current;
            if (!textarea) return;

            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            if (start === end) return;

            const selectedText = positivePrompt.substring(start, end).trim();
            if (!selectedText) return;

            const isUp = e.key === "ArrowUp";
            const delta = isUp ? 0.05 : -0.05;

            const { clean, weight } = parseTokenWeight(selectedText);
            const newWeight = Math.max(0.1, Math.min(2.5, Math.round((weight + delta) * 100) / 100));

            let replacement = clean;
            if (newWeight === 1.0) {
                replacement = clean;
            } else {
                replacement = `(${clean}:${newWeight.toFixed(2)})`;
            }

            const before = positivePrompt.substring(0, start);
            const after = positivePrompt.substring(end);
            const newPrompt = before + replacement + after;
            setPositivePrompt(newPrompt);

            setTimeout(() => {
                if (textarea) {
                    textarea.selectionStart = start;
                    textarea.selectionEnd = start + replacement.length;
                }
            }, 0);
        }
    };

    // Combinatorial Matrix Engine
    const matrixVariations = useMemo(() => {
        const regex = /\{([^{}]+)\}/g;
        const matches = [...positivePrompt.matchAll(regex)];
        if (matches.length === 0) return [];

        const optionsGroups = matches.map((m) =>
            m[1]
                .split("|")
                .map((opt) => opt.trim())
                .filter(Boolean)
        );

        const cartesian = (arrays: string[][]): string[][] => {
            return arrays.reduce<string[][]>(
                (acc, curr) => acc.flatMap((d) => curr.map((e) => [...d, e])),
                [[]]
            );
        };

        const combinations = cartesian(optionsGroups);

        return combinations.map((combination) => {
            let result = positivePrompt;
            let groupIdx = 0;
            result = result.replace(regex, () => {
                const choice = combination[groupIdx] || "";
                groupIdx++;
                return choice;
            });
            return cleanPromptText(result);
        });
    }, [positivePrompt]);


    // Apply preset fully
    const handleApplyPreset = (p: PromptPreset) => {
        handleTakeSnapshot(`Before "${p.title}"`);
        setPositivePrompt(p.positive_prompt);
        if (p.negative_prompt) {
            setNegativePrompt(p.negative_prompt);
        }
        const { buckets, lora } = deconstructPromptText(p.positive_prompt);
        setCategoryInputs(buckets);
        if (lora) {
            setLoraName(lora.name);
            setLoraWeight(lora.weight);
            setLoraEnabled(true);
        }
        showToast(`Preset "${p.title}" diterapkan ke Studio & Canvas!`);
    };

    // Category input change with live compilation to positivePrompt
    const handleCategoryInputChange = (id: string, val: string) => {
        setCategoryInputs((prev) => {
            const next = { ...prev, [id]: val };
            const compiled = compileCategoriesPrompt(next, { enabled: loraEnabled, name: loraName, weight: loraWeight }, "single");
            setPositivePrompt(compiled);
            return next;
        });
    };

    const handleToggleCategoryChip = (categoryId: string, chipText: string) => {
        const currentText = categoryInputs[categoryId] || "";
        const tags = parseTagList(currentText);
        const normalize = (s: string) => s.replace(/^\(+|\)+$/g, "").replace(/:[0-9.]+$/, "").trim().toLowerCase();
        const chipNorm = normalize(chipText);
        const existingIdx = tags.findIndex((t) => normalize(t) === chipNorm);

        let newTags: string[];
        if (existingIdx >= 0) {
            newTags = tags.filter((_, i) => i !== existingIdx);
        } else {
            newTags = [...tags, chipText];
        }

        handleCategoryInputChange(categoryId, newTags.join(", "));
    };

    const handleCycleCategoryChipWeight = (e: React.MouseEvent, categoryId: string, chipText: string) => {
        e.stopPropagation();
        const currentText = categoryInputs[categoryId] || "";
        const tags = parseTagList(currentText);

        const normalize = (s: string) => s.replace(/^\(+|\)+$/g, "").replace(/:[0-9.]+$/, "").trim();
        const baseName = normalize(chipText);

        const idx = tags.findIndex((t) => normalize(t).toLowerCase() === baseName.toLowerCase());
        if (idx < 0) {
            handleCategoryInputChange(categoryId, [...tags, `(${baseName}:1.2)`].join(", "));
            return;
        }

        const currentTag = tags[idx];
        let nextTag = baseName;
        if (!currentTag.includes(":")) {
            nextTag = `(${baseName}:1.15)`;
        } else if (currentTag.includes(":1.15")) {
            nextTag = `(${baseName}:1.25)`;
        } else if (currentTag.includes(":1.25")) {
            nextTag = `(${baseName}:1.35)`;
        } else {
            nextTag = baseName;
        }

        tags[idx] = nextTag;
        handleCategoryInputChange(categoryId, tags.join(", "));
    };

    const isCategoryChipActive = (categoryId: string, chipText: string): boolean => {
        const currentText = categoryInputs[categoryId] || "";
        const tags = parseTagList(currentText);
        const normalize = (s: string) => s.replace(/^\(+|\)+$/g, "").replace(/:[0-9.]+$/, "").trim().toLowerCase();
        const chipNorm = normalize(chipText);
        return tags.some((t) => normalize(t) === chipNorm);
    };

    const getCategoryChipWeightLabel = (categoryId: string, chipText: string): string | null => {
        const currentText = categoryInputs[categoryId] || "";
        const tags = parseTagList(currentText);
        const normalize = (s: string) => s.replace(/^\(+|\)+$/g, "").replace(/:[0-9.]+$/, "").trim().toLowerCase();
        const chipNorm = normalize(chipText);
        const match = tags.find((t) => normalize(t) === chipNorm);
        if (!match) return null;
        const weightMatch = match.match(/:([0-9.]+)\)?$/);
        return weightMatch ? weightMatch[1] : null;
    };

    const handleClearCategory = (id: string) => {
        handleCategoryInputChange(id, "");
    };

    const handleClearAllCategories = () => {
        setCategoryInputs({ ...INITIAL_CATEGORY_INPUTS });
        setPositivePrompt("");
        showToast("Semua kategori berhasil dikosongkan");
    };

    const syncPromptToCategories = (promptText?: string) => {
        const textToSync = promptText !== undefined ? promptText : positivePrompt;
        const { buckets, lora } = deconstructPromptText(textToSync);
        setCategoryInputs(buckets);
        if (lora) {
            setLoraName(lora.name);
            setLoraWeight(lora.weight);
            setLoraEnabled(true);
        }
        showToast("Prompt disinkronkan ke 10 kategori visual!");
    };

    const handleApplyDeconstructedToStudio = (parsedBuckets: Record<string, string>, lora?: { name: string; weight: number }) => {
        setCategoryInputs(parsedBuckets);
        if (lora) {
            setLoraName(lora.name);
            setLoraWeight(lora.weight);
            setLoraEnabled(true);
        }
        const compiled = compileCategoriesPrompt(parsedBuckets, lora ? { enabled: true, ...lora } : undefined, "single");
        setPositivePrompt(compiled);
        handleSelectTab("studio");
    };

    const handleApplyDeconstructedToCanvas = (positiveText: string) => {
        setPositivePrompt(positiveText);
        const { buckets, lora } = deconstructPromptText(positiveText);
        setCategoryInputs(buckets);
        if (lora) {
            setLoraName(lora.name);
            setLoraWeight(lora.weight);
            setLoraEnabled(true);
        }
        handleSelectTab("canvas");
    };


    // Append preset positive
    const handleAppendPositive = (text: string) => {
        const updated = positivePrompt.trim() ? `${positivePrompt.trim()}, ${text}` : text;
        setPositivePrompt(cleanPromptText(updated));
        showToast(`Disisipkan: ${text.slice(0, 30)}...`);
    };

    // Helper: Cek apakah token aktif di positive prompt
    const isTokenActiveInPrompt = (text: string): boolean => {
        if (!positivePrompt || !text) return false;
        const cleanTarget = text.trim().toLowerCase();
        const promptTokens = positivePrompt.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
        return promptTokens.some((pt) => {
            const unweighted = pt.replace(/^\(+|\)+$/g, "").replace(/:[0-9.]+$/, "").trim();
            return unweighted === cleanTarget;
        });
    };

    // Toggle sisipkan / cabut token di positive prompt
    const handleToggleModularTokenInPrompt = (text: string) => {
        const cleanTarget = text.trim();
        if (isTokenActiveInPrompt(cleanTarget)) {
            const promptTokens = positivePrompt.split(",").map((t) => t.trim()).filter(Boolean);
            const filtered = promptTokens.filter((pt) => {
                const unweighted = pt.replace(/^\(+|\)+$/g, "").replace(/:[0-9.]+$/, "").trim().toLowerCase();
                return unweighted !== cleanTarget.toLowerCase();
            });
            setPositivePrompt(cleanPromptText(filtered.join(", ")));
            showToast(`Dicabut: ${cleanTarget}`);
        } else {
            handleAppendPositive(cleanTarget);
        }
    };

    // Cek apakah token adalah frasa deskriptif panjang
    const isLongPhrase = (text: string): boolean => {
        const words = text.trim().split(/\s+/);
        return words.length > 2 || text.length > 25 || text.includes(",");
    };

    // Hitung total token tersedia untuk placeholder
    const totalModularTokenCount = useMemo(() => {
        return BLOCK_GROUPS.reduce((acc, g) => acc + g.defaults.length, 0) + modularPresets.length;
    }, [modularPresets]);

    // Insert LoRA with compatibility weight
    const handleInsertLoRA = (m: Model) => {
        const slug = m.slug || m.name.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
        const loraSyntax = `<lora:${slug}:${loraInsertWeight.toFixed(2)}>`;

        const triggers = (m.trigger_words || []).map((tw) => tw.trigger_word.trim()).filter(Boolean);
        const addition = triggers.length > 0 ? `${loraSyntax}, ${triggers.join(", ")}` : loraSyntax;

        handleAppendPositive(addition);
        showToast(`LoRA ${m.name} (${loraInsertWeight.toFixed(2)}) disisipkan!`);
    };

    // Helper: parse sample images from JSON string
    const parseSampleImages = (jsonStr?: string): string[] => {
        if (!jsonStr) return [];
        try {
            const parsed = JSON.parse(jsonStr);
            if (Array.isArray(parsed)) return parsed;
        } catch {
            if (jsonStr.startsWith("http") || jsonStr.startsWith("/")) {
                return [jsonStr];
            }
        }
        return [];
    };

    // Upload sample image from local PC
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (newPresetSampleList.length >= 5) {
            alert("Maximum 5 sample images reached.");
            return;
        }

        try {
            setIsUploadingSample(true);
            const res = await uploadPresetSampleImageApi(file);
            setNewPresetSampleList((prev) => [...prev, res.url].slice(0, 5));
            showToast("Foto sample berhasil diunggah!");
        } catch (err) {
            console.error("Failed to upload sample image:", err);
            const msg = err instanceof Error ? err.message : "Unknown error";
            alert("Upload failed: " + msg);
        } finally {
            setIsUploadingSample(false);
            if (e.target) e.target.value = "";
        }
    };

    // Open Gallery Image Picker
    const handleOpenGalleryPicker = async () => {
        setIsGalleryPickerOpen(true);
        if (galleryImages.length === 0) {
            try {
                setGalleryLoading(true);
                const res = await getAllImages({ limit: 100 });
                setGalleryImages(res.data || []);
            } catch (err) {
                console.error("Failed to fetch gallery images:", err);
            } finally {
                setGalleryLoading(false);
            }
        }
    };

    // Toggle gallery image selection
    const handleToggleGalleryImage = (imageUrl: string) => {
        setNewPresetSampleList((prev) => {
            if (prev.includes(imageUrl)) {
                return prev.filter((u) => u !== imageUrl);
            }
            if (prev.length >= 5) {
                alert("Maximum 5 sample images reached.");
                return prev;
            }
            return [...prev, imageUrl];
        });
    };

    // Remove single sample image
    const handleRemoveSample = (index: number) => {
        setNewPresetSampleList((prev) => prev.filter((_, i) => i !== index));
    };

    // Open modal to create brand new preset from current canvas
    const handleOpenCreatePreset = (prefill?: string | React.MouseEvent) => {
        const prefillCharacter = typeof prefill === "string" ? prefill : (selectedCharacterForModal || "");
        setSelectedCharacterForModal(null);
        setEditingPreset(null);
        setNewPresetTitle("");
        setNewPresetCharacterName(prefillCharacter);
        setNewPresetStyle("anime");
        setNewPresetSubcategory("");
        setNewPresetTriggerWords("");
        setNewPresetBaseModelTarget(activeCheckpoint?.base_model || "Illustrious");
        setNewPresetPositive(positivePrompt);
        setNewPresetNegative(negativePrompt);
        setNewPresetSampleList([]);
        setNewPresetDescription("");
        setIsSavePresetModalOpen(true);
    };

    // Open modal to edit existing preset
    const handleOpenEditPreset = (preset: PromptPreset, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setSelectedCharacterForModal(null);
        setEditingPreset(preset);
        const char = getPresetCharacter(preset);
        setNewPresetCharacterName(char);
        setNewPresetTitle(getPresetVariantTitle(preset, char));
        setNewPresetStyle(["realistic", "photorealistic"].includes((preset.category || "").toLowerCase()) ? "realistic" : "anime");
        setNewPresetSubcategory(preset.subcategory || "");
        setNewPresetTriggerWords(preset.trigger_words || "");
        setNewPresetBaseModelTarget(preset.base_model_target || "Illustrious");
        setNewPresetPositive(preset.positive_prompt || "");
        setNewPresetNegative(preset.negative_prompt || "");
        setNewPresetSampleList(parseSampleImages(preset.sample_images));
        setNewPresetDescription(preset.description || "");
        setIsSavePresetModalOpen(true);
    };

    // Save Preset to Database (Character Name is Mandatory)
    const handleSavePreset = async (e: React.FormEvent) => {
        e.preventDefault();
        const char = newPresetCharacterName.trim();
        const title = newPresetTitle.trim();

        if (!char) {
            showToast("Nama karakter wajib diisi!");
            return;
        }
        if (!title) {
            showToast("Judul preset / scene wajib diisi!");
            return;
        }

        const effectiveTitle = title;
        const effectivePos = newPresetPositive.trim() || positivePrompt;
        const effectiveNeg = newPresetNegative.trim() || undefined;

        try {
            if (editingPreset) {
                await updatePromptPresetApi(editingPreset.id, {
                    title: effectiveTitle,
                    character: char,
                    category: newPresetStyle,
                    subcategory: newPresetSubcategory.trim() || undefined,
                    base_model_target: newPresetBaseModelTarget || activeCheckpoint?.base_model || "All",
                    preset_type: editingPreset.preset_type || "full",
                    positive_prompt: effectivePos,
                    negative_prompt: effectiveNeg,
                    trigger_words: newPresetTriggerWords.trim() || undefined,
                    sample_images: newPresetSampleList.length > 0 ? JSON.stringify(newPresetSampleList) : "",
                    description: newPresetDescription.trim() || undefined,
                });
                showToast(`Preset "${char} - ${effectiveTitle}" diperbarui!`);
            } else {
                await createPromptPresetApi({
                    title: effectiveTitle,
                    character: char,
                    category: newPresetStyle,
                    subcategory: newPresetSubcategory.trim() || undefined,
                    base_model_target: newPresetBaseModelTarget || activeCheckpoint?.base_model || "All",
                    preset_type: "full",
                    positive_prompt: effectivePos,
                    negative_prompt: effectiveNeg || (negativePrompt ? negativePrompt : undefined),
                    trigger_words: newPresetTriggerWords.trim() || undefined,
                    recommended_model: activeCheckpoint?.name,
                    sample_images: newPresetSampleList.length > 0 ? JSON.stringify(newPresetSampleList) : undefined,
                    description: newPresetDescription.trim() || undefined,
                });
                showToast(`Preset "${char} - ${effectiveTitle}" berhasil disimpan!`);
            }
            setIsSavePresetModalOpen(false);
            setEditingPreset(null);
            fetchPresets();
            fetchModularPresets();
        } catch (err) {
            console.error("Failed to save/update preset to DB:", err);
            alert("Gagal menyimpan preset: " + err);
        }
    };

    // Save Modular Building Block / Outfit Token
    const handleSaveModularPreset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modularToken.trim()) return;

        const effectiveSubcategory = modularCategory === "Custom" ? modularCustomSubcategory.trim() || "Custom" : modularCategory;
        const effectiveTitle = modularTitle.trim() || modularToken.trim().slice(0, 30);

        try {
            await createPromptPresetApi({
                title: effectiveTitle,
                category: "modular",
                subcategory: effectiveSubcategory,
                base_model_target: modularBaseModel || "All",
                preset_type: "modular",
                positive_prompt: modularToken.trim(),
                trigger_words: modularToken.trim(),
                sample_images: modularSampleImages.trim() ? JSON.stringify([modularSampleImages.trim()]) : undefined,
            });
            setIsAddModularModalOpen(false);
            setModularTitle("");
            setModularToken("");
            setModularCustomSubcategory("");
            setModularSampleImages("");
            fetchModularPresets();
            fetchPresets();
            showToast(`Token "${effectiveTitle}" berhasil disimpan!`);
        } catch (err) {
            console.error("Failed to save modular preset:", err);
            alert("Gagal menyimpan modular token: " + err);
        }
    };

    // Add modular tag directly to database for 10-layer studio
    const handleAddModularTag = async (categoryId: string, tagText: string, subgroup?: string) => {
        const text = tagText.trim();
        if (!text) return;

        try {
            const created = await createPromptPresetApi({
                title: text,
                positive_prompt: text,
                category: "modular",
                subcategory: categoryId,
                trigger_words: subgroup || "",
                preset_type: "modular",
                base_model_target: "All",
                is_system: false,
            });

            setModularPresets((prev) => [created, ...prev]);
            showToast(`Tag "${text}" berhasil disimpan ke database!`);
        } catch (err) {
            console.error("Failed to add modular tag to DB:", err);
            showToast("Gagal menyimpan tag ke database");
            throw err;
        }
    };

    // Delete modular tag directly from database
    const handleDeleteModularTag = async (id: number, tagTitle?: string) => {
        try {
            await deletePromptPresetApi(id);
            setModularPresets((prev) => prev.filter((p) => p.id !== id));
            showToast(`Tag "${tagTitle || ""}" dihapus dari database`);
        } catch (err) {
            console.error("Failed to delete modular tag from DB:", err);
            showToast("Gagal menghapus tag dari database");
            throw err;
        }
    };

    // Delete preset
    const handleDeletePreset = async (id: number, title?: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const name = title || "preset ini";
        if (!window.confirm(`Hapus preset "${name}" dari database?`)) return;
        try {
            await deletePromptPresetApi(id);
            setPresets((prev) => prev.filter((p) => p.id !== id));
            setModularPresets((prev) => prev.filter((p) => p.id !== id));
            showToast(`Preset "${name}" dihapus`);
            if (activeCharPresets.length <= 1) {
                setSelectedCharacterForModal(null);
            }
        } catch (err) {
            console.error("Failed to delete preset:", err);
            alert("Gagal menghapus preset: " + err);
        }
    };

    // Delete modular preset
    const handleDeleteModularPreset = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm("Hapus token / building block ini dari database?")) return;
        try {
            await deletePromptPresetApi(id);
            setModularPresets((prev) => prev.filter((p) => p.id !== id));
            setPresets((prev) => prev.filter((p) => p.id !== id));
            showToast("Token dihapus dari database");
        } catch (err) {
            console.error("Failed to delete modular preset:", err);
            alert("Gagal menghapus token: " + err);
        }
    };

    // Copy full prompt
    const handleCopyFullPrompt = () => {
        const full = `${positivePrompt}\nNegative prompt: ${negativePrompt}`;
        triggerCopy(full, "copy-full", "Positive & Negative prompt disalin (WebUI/ComfyUI format)");
    };

    // Reset canvas
    const handleResetCanvas = () => {
        if (!positivePrompt && !negativePrompt) return;
        if (window.confirm("Kosongkan prompt canvas (positif & negatif)?")) {
            handleTakeSnapshot("Before Reset Canvas");
            setPositivePrompt("");
            setNegativePrompt("");
            showToast("Canvas dikosongkan");
        }
    };

    // Sorted Presets list based on favorites & sort state
    const displayPresets = useMemo(() => {
        let list = [...presets];

        if (presetCategoryFilter === "anime") {
            list = list.filter((p) =>
                ["anime", "character", "style"].includes((p.category || "").toLowerCase()) ||
                (!["photorealistic", "realistic"].includes((p.category || "").toLowerCase()))
            );
        } else if (presetCategoryFilter === "realistic") {
            list = list.filter((p) =>
                ["realistic", "photorealistic"].includes((p.category || "").toLowerCase())
            );
        }

        if (presetSort === "favorites") {
            list.sort((a, b) => {
                const aFav = favoritePresetIds.includes(a.id);
                const bFav = favoritePresetIds.includes(b.id);
                if (aFav && !bFav) return -1;
                if (!aFav && bFav) return 1;
                return b.id - a.id;
            });
        } else if (presetSort === "newest") {
            list.sort((a, b) => b.id - a.id);
        } else if (presetSort === "alpha") {
            list.sort((a, b) => a.title.localeCompare(b.title));
        }

        return list;
    }, [presets, presetCategoryFilter, favoritePresetIds, presetSort]);

    // Unique existing character names for autocomplete datalist
    const existingCharacterNames = useMemo(() => {
        const set = new Set<string>();
        for (const p of presets) {
            set.add(getPresetCharacter(p));
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [presets]);

    // Group filtered presets by Character Name for compact sidebar tag buttons
    const characterGroups = useMemo<CharacterGroup[]>(() => {
        const map = new Map<string, PromptPreset[]>();
        for (const p of displayPresets) {
            const char = getPresetCharacter(p);
            if (!map.has(char)) {
                map.set(char, []);
            }
            map.get(char)!.push(p);
        }

        const groups: CharacterGroup[] = [];
        map.forEach((presetList, char) => {
            const hasFav = presetList.some((p) => favoritePresetIds.includes(p.id));
            const samples: string[] = [];
            const subcats = new Set<string>();
            const archs = new Set<string>();

            for (const p of presetList) {
                const parsed = parseSampleImages(p.sample_images);
                for (const s of parsed) {
                    if (samples.length < 4 && !samples.includes(s)) samples.push(s);
                }
                if (p.subcategory) subcats.add(p.subcategory);
                if (p.base_model_target) archs.add(p.base_model_target);
            }

            groups.push({
                character: char,
                presets: presetList,
                count: presetList.length,
                hasFavorite: hasFav,
                sampleImages: samples,
                subcategories: Array.from(subcats),
                baseModels: Array.from(archs),
            });
        });

        if (presetSort === "favorites") {
            groups.sort((a, b) => {
                if (a.hasFavorite && !b.hasFavorite) return -1;
                if (!a.hasFavorite && b.hasFavorite) return 1;
                return a.character.localeCompare(b.character);
            });
        } else if (presetSort === "alpha") {
            groups.sort((a, b) => a.character.localeCompare(b.character));
        } else {
            groups.sort((a, b) => {
                const maxA = Math.max(...a.presets.map((p) => p.id));
                const maxB = Math.max(...b.presets.map((p) => p.id));
                return maxB - maxA;
            });
        }

        return groups;
    }, [displayPresets, favoritePresetIds, presetSort]);

    // Active character presets for the popup modal
    const activeCharPresets = useMemo(() => {
        if (!selectedCharacterForModal) return [];
        return presets.filter((p) => getPresetCharacter(p).toLowerCase() === selectedCharacterForModal.toLowerCase());
    }, [presets, selectedCharacterForModal]);

    // Character avatar image (first available sample image across presets)
    const charAvatarImage = useMemo(() => {
        for (const p of activeCharPresets) {
            const imgs = parseSampleImages(p.sample_images);
            if (imgs && imgs.length > 0) return imgs[0];
        }
        return null;
    }, [activeCharPresets]);

    // Character initials fallback (e.g., "Rio Tsukatsuki" -> "RT")
    const charInitials = useMemo(() => {
        if (!selectedCharacterForModal) return "CH";
        const parts = selectedCharacterForModal.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return selectedCharacterForModal.substring(0, 2).toUpperCase();
    }, [selectedCharacterForModal]);

    // Series/franchise name from character presets subcategory (e.g., "Blue Archive")
    const charSeriesName = useMemo(() => {
        for (const p of activeCharPresets) {
            if (p.subcategory && p.subcategory.trim()) return p.subcategory.trim();
        }
        return null;
    }, [activeCharPresets]);

    return (
        <div className="prompt-lab-container">
            {/* Workflow Bridge Incoming Banner */}
            <WorkflowBridgeBanner
                currentTool="prompt-lab"
                onApply={(data: WorkflowBridgeData) => {
                    let updatedCount = 0;
                    if (data.positivePrompt && data.positivePrompt.trim()) {
                        setPositivePrompt(data.positivePrompt.trim());
                        const { buckets, lora } = deconstructPromptText(data.positivePrompt.trim());
                        setCategoryInputs(buckets);
                        if (lora) {
                            setLoraName(lora.name);
                            setLoraWeight(lora.weight);
                            setLoraEnabled(true);
                        }
                        updatedCount++;
                    }
                    if (data.negativePrompt && data.negativePrompt.trim()) {
                        setNegativePrompt(data.negativePrompt.trim());
                        updatedCount++;
                    }
                    if (data.loras && data.loras.length > 0) {
                        setLoraName(data.loras[0].name);
                        setLoraWeight(data.loras[0].weight);
                        setLoraEnabled(true);
                    }
                    if (data.sampler || data.steps !== undefined || data.cfgScale !== undefined || data.width || data.baseModel) {
                        setActiveRecipe({
                            sampler: data.sampler,
                            scheduler: data.scheduler,
                            steps: data.steps,
                            cfgScale: data.cfgScale,
                            width: data.width,
                            height: data.height,
                            baseModel: data.baseModel,
                            seed: data.seed,
                        });
                        updatedCount++;
                    }
                    showToast(
                        updatedCount > 0
                            ? "Metadata & Parameter dari Workflow Bridge berhasil dimuat ke Studio!"
                            : "Data Workflow Bridge siap digunakan di Studio!"
                    );
                }}
            />

            {/* Active Generation Recipe from Workflow Bridge */}
            {activeRecipe && (
                <div
                    style={{
                        background: "#121215",
                        border: "1px solid #27272a",
                        borderLeft: "3px solid #2563eb",
                        borderRadius: "6px",
                        padding: "10px 14px",
                        marginBottom: "14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "10px",
                        boxSizing: "border-box",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            Resep Generasi:
                        </span>
                        {activeRecipe.baseModel && (
                            <span style={{ fontSize: "11px", fontFamily: "ui-monospace, monospace", background: "#18181b", border: "1px solid #27272a", color: "#60a5fa", padding: "1px 6px", borderRadius: "3px" }}>
                                {activeRecipe.baseModel}
                            </span>
                        )}
                        {activeRecipe.width && activeRecipe.height && (
                            <span style={{ fontSize: "11px", fontFamily: "ui-monospace, monospace", background: "#18181b", border: "1px solid #27272a", color: "#34d399", padding: "1px 6px", borderRadius: "3px" }}>
                                {activeRecipe.width}×{activeRecipe.height}
                            </span>
                        )}
                        {activeRecipe.sampler && (
                            <span style={{ fontSize: "11px", fontFamily: "ui-monospace, monospace", background: "#18181b", border: "1px solid #27272a", color: "#60a5fa", padding: "1px 6px", borderRadius: "3px" }}>
                                {activeRecipe.sampler}{activeRecipe.scheduler ? ` · ${activeRecipe.scheduler}` : ""}
                            </span>
                        )}
                        {activeRecipe.steps !== undefined && (
                            <span style={{ fontSize: "11px", fontFamily: "ui-monospace, monospace", background: "#18181b", border: "1px solid #27272a", color: "#38bdf8", padding: "1px 6px", borderRadius: "3px" }}>
                                {activeRecipe.steps} Steps
                            </span>
                        )}
                        {activeRecipe.cfgScale !== undefined && (
                            <span style={{ fontSize: "11px", fontFamily: "ui-monospace, monospace", background: "#18181b", border: "1px solid #27272a", color: "#fb923c", padding: "1px 6px", borderRadius: "3px" }}>
                                CFG {activeRecipe.cfgScale}
                            </span>
                        )}
                        {activeRecipe.seed !== undefined && (
                            <span style={{ fontSize: "11px", fontFamily: "ui-monospace, monospace", background: "#18181b", border: "1px solid #27272a", color: "#a1a1aa", padding: "1px 6px", borderRadius: "3px" }}>
                                Seed {activeRecipe.seed}
                            </span>
                        )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        <button
                            type="button"
                            onClick={() => {
                                const params: string[] = [];
                                if (activeRecipe.steps) params.push(`Steps: ${activeRecipe.steps}`);
                                if (activeRecipe.sampler) params.push(`Sampler: ${activeRecipe.sampler}${activeRecipe.scheduler ? ` ${activeRecipe.scheduler}` : ""}`);
                                if (activeRecipe.cfgScale) params.push(`CFG scale: ${activeRecipe.cfgScale}`);
                                if (activeRecipe.seed !== undefined) params.push(`Seed: ${activeRecipe.seed}`);
                                if (activeRecipe.width && activeRecipe.height) params.push(`Size: ${activeRecipe.width}x${activeRecipe.height}`);
                                if (activeRecipe.baseModel) params.push(`Model: ${activeRecipe.baseModel}`);
                                const fullText = `${positivePrompt}\nNegative prompt: ${negativePrompt}\n${params.join(", ")}`;
                                navigator.clipboard.writeText(fullText);
                                showToast("Prompt + Parameter A1111 berhasil disalin ke clipboard!");
                            }}
                            style={{
                                background: "#18181b",
                                border: "1px solid #27272a",
                                color: "#f4f4f5",
                                fontSize: "11px",
                                fontWeight: 500,
                                padding: "4px 8px",
                                borderRadius: "4px",
                                cursor: "pointer",
                            }}
                            title="Salin Prompt dan parameter lengkap dalam format Automatic1111 / WebUI"
                        >
                            Salin Format A1111
                        </button>
                        <button
                            type="button"
                            onClick={() => bridgeToVramProfiler(navigate, {
                                source: "prompt-lab",
                                baseModel: activeRecipe.baseModel,
                                width: activeRecipe.width,
                                height: activeRecipe.height,
                                steps: activeRecipe.steps,
                                timestamp: Date.now(),
                            })}
                            style={{
                                background: "#18181b",
                                border: "1px solid #27272a",
                                color: "#38bdf8",
                                fontSize: "11px",
                                fontWeight: 500,
                                padding: "4px 8px",
                                borderRadius: "4px",
                                cursor: "pointer",
                            }}
                            title="Uji beban VRAM &amp; hardware di VRAM Profiler"
                        >
                            Uji VRAM ➔
                        </button>
                        {activeRecipe.width && activeRecipe.height && (
                            <button
                                type="button"
                                onClick={() => bridgeToCalculator(navigate, {
                                    source: "prompt-lab",
                                    baseModel: activeRecipe.baseModel,
                                    width: activeRecipe.width,
                                    height: activeRecipe.height,
                                    timestamp: Date.now(),
                                })}
                                style={{
                                    background: "#18181b",
                                    border: "1px solid #27272a",
                                    color: "#34d399",
                                    fontSize: "11px",
                                    fontWeight: 500,
                                    padding: "4px 8px",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                }}
                                title="Kalkulasi rasio aspek di Resolution Calculator"
                            >
                                Kalkulator ➔
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => bridgeToSamplerGuide(navigate, {
                                source: "prompt-lab",
                                sampler: activeRecipe.sampler,
                                scheduler: activeRecipe.scheduler,
                                steps: activeRecipe.steps,
                                cfgScale: activeRecipe.cfgScale,
                                baseModel: activeRecipe.baseModel,
                                timestamp: Date.now(),
                            })}
                            style={{
                                background: "#18181b",
                                border: "1px solid #27272a",
                                color: "#60a5fa",
                                fontSize: "11px",
                                fontWeight: 500,
                                padding: "4px 8px",
                                borderRadius: "4px",
                                cursor: "pointer",
                            }}
                            title="Buka panduan sampler untuk mengatur ulang metode konvergensi"
                        >
                            Panduan Sampler ➔
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveRecipe(null)}
                            style={{
                                background: "transparent",
                                border: "none",
                                color: "#71717a",
                                fontSize: "13px",
                                cursor: "pointer",
                                padding: "2px 6px",
                            }}
                            title="Hapus resep ini"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Studio Header Bar */}
            <header className="prompt-lab-header">
                <div className="prompt-lab-title-row">
                    <div className="prompt-lab-heading">
                        <div className="prompt-lab-title-icon">
                            <Icons.Sliders />
                        </div>
                        <div className="prompt-lab-heading-text">
                            <div className="prompt-lab-eyebrow-row">
                                <span className="prompt-lab-eyebrow">WORKSTATION STUDIO</span>
                                <span className="studio-status-pill">
                                    <span className="studio-status-dot" />
                                    Studio Aktif
                                </span>
                            </div>
                            <h1 className="prompt-lab-title">Prompt Matrix &amp; Studio Lab</h1>
                        </div>
                    </div>

                    {studioTab === "canvas" && (
                        <div className="prompt-lab-header-actions">
                            <button
                                type="button"
                                className="prompt-btn-sm"
                                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                                title={isSidebarCollapsed ? "Tampilkan Pustaka & Penjelajah" : "Sembunyikan Sidebar untuk Mode Fokus"}
                            >
                                <Icons.Layout />
                                <span>{isSidebarCollapsed ? "Tampilkan Pustaka" : "Mode Fokus"}</span>
                            </button>

                            <button
                                type="button"
                                className="prompt-btn-sm"
                                onClick={() => setIsHistoryDrawerOpen(true)}
                                title="Buka riwayat iterasi & snapshot canvas"
                            >
                                <Icons.History />
                                <span>Snapshot ({promptSnapshots.length})</span>
                            </button>

                            <button
                                type="button"
                                className="prompt-btn-sm"
                                onClick={handleCopyFullPrompt}
                                title="Salin Positive & Negative prompt terformat untuk WebUI / ComfyUI"
                            >
                                {copiedKey === "copy-full" ? <Icons.Check /> : <Icons.Clipboard />}
                                <span>{copiedKey === "copy-full" ? "Tersalin!" : "Salin Semua"}</span>
                            </button>

                            <button
                                type="button"
                                className="prompt-btn-primary"
                                onClick={handleOpenCreatePreset}
                                title="Simpan racikan prompt saat ini sebagai preset baru"
                            >
                                <Icons.Bookmark />
                                <span>Simpan Preset</span>
                            </button>

                            <button
                                type="button"
                                className="prompt-btn-sm text-muted-hover"
                                onClick={handleResetCanvas}
                                title="Bersihkan prompt positif dan negatif"
                            >
                                <Icons.Undo />
                                <span>Reset</span>
                            </button>

                            <Link
                                to={`/gallery?q=${encodeURIComponent(positivePrompt.split(",")[0]?.trim() || "")}`}
                                className="prompt-btn-sm"
                                title="Cari gambar serupa di galeri lokal"
                            >
                                <Icons.Search />
                                <span>Galeri</span>
                            </Link>
                        </div>
                    )}
                </div>

                {/* Subtitle & Telemetry Metrics Strip */}
                <div className="prompt-lab-sub-row">
                    <p className="prompt-lab-subtitle">
                        Orkestrator prompt terpadu dengan tokenisasi semantik, permutasi wildcard, injeksi kualitas arsitektur, dan pencocokan kompatibilitas LoRA.
                    </p>

                    <div className="studio-telemetry-strip">
                        <div className="telemetry-pill pos" title="Jumlah Token Positif">
                            <span className="telemetry-dot" />
                            <span>Pos: <strong>{posTokenCount}</strong> tok ({Math.ceil(posTokenCount / 75) || 1} chk)</span>
                        </div>
                        <div className="telemetry-pill neg" title="Jumlah Token Negatif">
                            <span className="telemetry-dot" />
                            <span>Neg: <strong>{negTokenCount}</strong> tok</span>
                        </div>
                        {matrixVariations.length > 0 && (
                            <div className="telemetry-pill matrix" title="Variasi Wildcard Aktif">
                                <span className="telemetry-dot" />
                                <span>Matrix: <strong>{matrixVariations.length}</strong> variasi</span>
                            </div>
                        )}
                        <div className="telemetry-pill arch" title="Arsitektur Checkpoint Aktif">
                            <span>Arsitektur: <strong>{activeCheckpoint?.base_model || "NoobAI"}</strong></span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Master Studio Mode Tabs Switcher */}
            <PromptStudioTabs
                activeTab={studioTab}
                onSelectTab={handleSelectTab}
                tokenCount={posTokenCount}
                activeCategoryCount={activeCategoryCount}
                presetCount={presets.length}
            />

            {/* TAB 1: 10-LAYER MODULAR STUDIO */}
            {studioTab === "studio" && (
                <ModularStudioView
                    inputs={categoryInputs}
                    onInputChange={handleCategoryInputChange}
                    onToggleChip={handleToggleCategoryChip}
                    onCycleChipWeight={handleCycleCategoryChipWeight}
                    isChipActive={isCategoryChipActive}
                    getChipWeightLabel={getCategoryChipWeightLabel}
                    onClearCategory={handleClearCategory}
                    onClearAll={handleClearAllCategories}
                    loraName={loraName}
                    setLoraName={setLoraName}
                    loraWeight={loraWeight}
                    setLoraWeight={setLoraWeight}
                    loraEnabled={loraEnabled}
                    setLoraEnabled={setLoraEnabled}
                    compiledOutput={positivePrompt}
                    onCopyOutput={(text?: string) => {
                        const textToCopy = text || positivePrompt;
                        if (!textToCopy.trim()) return;
                        navigator.clipboard.writeText(textToCopy);
                        setCopiedKey("copy-positive");
                        showToast("Prompt berhasil disalin ke clipboard!");
                        setTimeout(() => setCopiedKey(null), 2000);
                    }}
                    copied={copiedKey === "copy-positive"}
                    formatMode={modularFormatMode}
                    setFormatMode={setModularFormatMode}
                    onSwitchToCanvas={(parsedText?: string) => {
                        if (parsedText && parsedText.trim()) {
                            setPositivePrompt(parsedText.trim());
                        }
                        handleSelectTab("canvas");
                    }}
                    onSaveToPresetLibrary={handleOpenCreatePreset}
                    showToast={showToast}
                    onLoadPresetData={(newInputs, lora) => {
                        setCategoryInputs(newInputs);
                        if (lora) {
                            setLoraName(lora.name);
                            setLoraWeight(lora.weight);
                            setLoraEnabled(true);
                        }
                        const compiled = compileCategoriesPrompt(newInputs, lora ? { enabled: true, ...lora } : undefined, "single");
                        setPositivePrompt(compiled);
                    }}
                    modularPresets={modularPresets}
                    onAddModularTag={handleAddModularTag}
                    onDeleteModularTag={handleDeleteModularTag}
                />
            )}

            {/* TAB 2: PROMPT LAB CANVAS & TOKENIZER */}
            {studioTab === "canvas" && (
                <>
                    {/* Studio Workspace Layout */}
                    <div className={`prompt-lab-workspace ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
                {/* Left Column: Canvas Editors */}
                <div className="prompt-canvas-col">
                    {/* Unified Workspace Toolbar: Target Checkpoint & Modular Studio Sync */}
                    <div className="prompt-unified-workspace-toolbar">
                        <div className="workspace-toolbar-left">
                            <div className="checkpoint-bar-icon">
                                <Icons.Layers />
                            </div>
                            <div className="checkpoint-bar-select-wrap">
                                <span className="checkpoint-bar-label">Target Checkpoint:</span>
                                <select
                                    className="checkpoint-bar-select"
                                    value={selectedCheckpointId}
                                    onChange={(e) => setSelectedCheckpointId(e.target.value)}
                                >
                                    <option value="">Standalone / Unspecified</option>
                                    {models
                                        .filter((m) => m.type === "checkpoint")
                                        .map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.name} ({m.base_model || "SDXL"})
                                            </option>
                                        ))}
                                </select>
                            </div>
                            {activeCheckpoint && (
                                <span className={`preset-base-badge ${(activeCheckpoint.base_model || "sdxl").toLowerCase()}`}>
                                    <span className="badge-dot" />
                                    {activeCheckpoint.base_model || "SDXL"}
                                </span>
                            )}
                        </div>

                        <div className="workspace-toolbar-right">
                            <div className="studio-sync-inline-status" title="Status sinkronisasi dengan 10-Layer Modular Studio">
                                <span className="studio-sync-dot" />
                                <span>Terhubung ke 10-Layer Modular Studio ({activeCategoryCount}/10 aktif)</span>
                            </div>
                            <button
                                type="button"
                                className="studio-sync-btn-inline"
                                onClick={() => syncPromptToCategories()}
                                title="Uraikan teks prompt saat ini ke 10 layer kategori Studio"
                            >
                                <Icons.Clean />
                                <span>Sinkronkan dari Studio</span>
                            </button>
                        </div>
                    </div>

                    {/* POSITIVE PROMPT STUDIO CARD */}
                    <div className="prompt-canvas-card positive-card">
                        <div className="prompt-canvas-header">
                            <div className="prompt-canvas-title-wrap">
                                <span className="prompt-badge positive">Positive Prompt</span>
                                <button
                                    type="button"
                                    className={`prompt-token-pill ${posTokenCount > 75 ? "over-chunk" : ""}`}
                                    onClick={() => setViewMode(viewMode === "chunks" ? "editor" : "chunks")}
                                    style={{ cursor: "pointer", border: "1px solid rgba(6, 182, 212, 0.4)", background: "rgba(6, 182, 212, 0.12)" }}
                                    title="Klik untuk membuka Live CLIP 77-Token Chunk Boundary Profiler"
                                >
                                    ⚡ {posTokenCount} CLIP tok · {Math.ceil(posTokenCount / 75) || 1} Chunk
                                </button>
                                <div className="canvas-header-chunk-zones">
                                    <span className="canvas-chunk-tag zone-cyan" title="Chunk 1: Zona Prioritas Utama (Tokens 1–75, 100% Retained Attention)">
                                        C1: {Math.min(75, posTokenCount)}/75
                                    </span>
                                    {posTokenCount > 75 && (
                                        <span className="canvas-chunk-tag zone-amber" title="Chunk 2: Zona Sekunder (Tokens 76–150, perhatian model menurun ~15-20%)">
                                            C2: {Math.min(75, posTokenCount - 75)}/75
                                        </span>
                                    )}
                                    {posTokenCount > 150 && (
                                        <span className="canvas-chunk-tag zone-red" title="Chunk 3+: Zona Resiko Token Bleeding atau Kata Kunci Terabaikan (Tokens 151+)">
                                            C3+: {posTokenCount - 150} tok
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="prompt-canvas-actions">
                                {/* Mode Switcher (Editor / Tokenizer / Chunks / Matrix) */}
                                <div className="prompt-view-switcher">
                                    <button
                                        type="button"
                                        className={`prompt-view-btn ${viewMode === "editor" ? "active" : ""}`}
                                        onClick={() => setViewMode("editor")}
                                        title="Standard Text Prompt Editor"
                                    >
                                        <Icons.Sliders />
                                        <span>Editor</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`prompt-view-btn ${viewMode === "tokenizer" ? "active" : ""}`}
                                        onClick={() => setViewMode("tokenizer")}
                                        title="Interactive Tag Weight Adjuster & Semantic Viewer"
                                    >
                                        <Icons.Tag />
                                        <span>Tags ({tokens.length})</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`prompt-view-btn ${viewMode === "chunks" ? "active" : ""}`}
                                        onClick={() => setViewMode("chunks")}
                                        title="Buka Live CLIP 77-Token Chunk Boundary Profiler"
                                    >
                                        <Icons.Eye />
                                        <span>Chunks ({Math.ceil(posTokenCount / 75) || 1})</span>
                                    </button>
                                    {matrixVariations.length > 0 && (
                                        <button
                                            type="button"
                                            className={`prompt-view-btn matrix-active ${viewMode === "matrix" ? "active" : ""}`}
                                            onClick={() => setViewMode("matrix")}
                                            title="View combinatorial matrix permutations"
                                        >
                                            <Icons.Matrix />
                                            <span>Matrix ({matrixVariations.length})</span>
                                        </button>
                                    )}
                                </div>

                                <span className="prompt-toolbar-divider" aria-hidden="true" />

                                {/* Quick Tools Toolbar */}
                                <button
                                    type="button"
                                    className="prompt-btn-sm"
                                    onClick={() => setPositivePrompt(cleanPromptText(positivePrompt))}
                                    title="Rapikan tanda koma, spasi berlebih, dan tanda baca tak terpakai"
                                >
                                    <Icons.Clean />
                                    <span>Rapikan</span>
                                </button>

                                <button
                                    type="button"
                                    className="prompt-btn-sm"
                                    onClick={handleDeduplicateTokens}
                                    title="Hapus token duplikat"
                                >
                                    <span>Hapus Duplikat</span>
                                </button>

                                <button
                                    type="button"
                                    className="prompt-btn-sm"
                                    onClick={() => setIsWildcardPickerOpen(!isWildcardPickerOpen)}
                                    title="Sisipkan koleksi wildcard {a|b|c}"
                                >
                                    <Icons.Dice />
                                    <span>Wildcard</span>
                                </button>

                                <button
                                    type="button"
                                    className="prompt-btn-sm"
                                    onClick={() => triggerCopy(positivePrompt, "copy-positive", "Prompt positif disalin!")}
                                    title="Salin prompt positif ke clipboard"
                                >
                                    {copiedKey === "copy-positive" ? <Icons.Check /> : <Icons.Copy />}
                                    <span>{copiedKey === "copy-positive" ? "Tersalin!" : "Salin"}</span>
                                </button>

                                <button
                                    type="button"
                                    className="prompt-btn-sm danger-hover"
                                    onClick={() => {
                                        if (window.confirm("Kosongkan prompt positif?")) {
                                            setPositivePrompt("");
                                            showToast("Prompt positif dikosongkan");
                                        }
                                    }}
                                    title="Bersihkan prompt positif"
                                >
                                    <Icons.Trash />
                                </button>
                            </div>
                        </div>

                        {/* Wildcard Quick Insert Dropdown Popover */}
                        {isWildcardPickerOpen && (
                            <div className="wildcard-popover-banner">
                                <div className="wildcard-popover-header">
                                    <span>Pilih Templat Wildcard Combinatorial:</span>
                                    <button
                                        type="button"
                                        className="wildcard-popover-close"
                                        onClick={() => setIsWildcardPickerOpen(false)}
                                    >
                                        ✕
                                    </button>
                                </div>
                                <div className="wildcard-popover-grid">
                                    {WILDCARD_TEMPLATES.map((tmpl) => (
                                        <div
                                            key={tmpl.title}
                                            className="wildcard-template-card"
                                            onClick={() => {
                                                handleAppendPositive(tmpl.wildcard);
                                                setIsWildcardPickerOpen(false);
                                            }}
                                            title="Klik untuk menyisipkan ke prompt"
                                        >
                                            <span className="wildcard-card-title">{tmpl.title}</span>
                                            <code className="wildcard-card-code">{tmpl.wildcard}</code>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="prompt-canvas-body">
                            {/* VIEW 1: TEXT EDITOR */}
                            {viewMode === "editor" && (
                                <>
                                    <BooruAutocompleteInput
                                        as="textarea"
                                        className="prompt-textarea"
                                        rows={6}
                                        value={positivePrompt}
                                        onChange={(val) => setPositivePrompt(val)}
                                        onKeyDown={handleTextareaKeyDown}
                                        placeholder="e.g. masterpiece, best quality, 1girl, {cyberpunk | gothic} outfit, neon street..."
                                        customDbTags={booruCustomDbTags}
                                    />

                                    {/* Keyboard Hint & Wildcard Quick Banner */}
                                    <div className="prompt-keyboard-hint">
                                        <div className="hint-left">
                                            <span>Bobot kata: Sorot kata lalu tekan <kbd>Ctrl</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd></span>
                                            <span className="hint-separator">·</span>
                                            <span>Wildcard: <code>{"{pilihan A | pilihan B}"}</code></span>
                                        </div>
                                        {matrixVariations.length > 0 && (
                                            <div className="hint-matrix-quick">
                                                <button
                                                    type="button"
                                                    className="hint-quick-roll-btn"
                                                    onClick={() => {
                                                        const randomIdx = Math.floor(Math.random() * matrixVariations.length);
                                                        triggerCopy(matrixVariations[randomIdx], "quick-roll", "Variasi acak berhasil disalin!");
                                                    }}
                                                    title="Roll 1 random variation and copy"
                                                >
                                                    <Icons.Dice />
                                                    <span>{copiedKey === "quick-roll" ? "Rolled & Copied!" : `Roll 1 of ${matrixVariations.length}`}</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="hint-quick-switch-btn"
                                                    onClick={() => setViewMode("matrix")}
                                                >
                                                    Open Matrix →
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Live Chunk Boundary Ribbon & Quick Highlighter */}
                                    <div className="canvas-chunk-ribbon">
                                        <div className="chunk-ribbon-left">
                                            <span className="chunk-ribbon-title">CLIP 77-Token Boundaries:</span>
                                            <span className="chunk-ribbon-pill c1">
                                                C1: {Math.min(75, posTokenCount)}/75 tok (Prioritas Utama)
                                            </span>
                                            {posTokenCount > 75 && (
                                                <span className="chunk-ribbon-pill c2">
                                                    C2: {Math.min(75, posTokenCount - 75)}/75 tok (Zona Sekunder -18%)
                                                </span>
                                            )}
                                            {posTokenCount > 150 && (
                                                <span className="chunk-ribbon-pill c3">
                                                    C3+: {posTokenCount - 150} tok (Resiko Bleeding)
                                                </span>
                                            )}
                                            {posTokenResult.hazards.length > 0 && (
                                                <button
                                                    type="button"
                                                    className="chunk-ribbon-hazard-btn"
                                                    onClick={() => setViewMode("chunks")}
                                                    title="Terdeteksi frasa yang terpotong di batas 75-token. Klik untuk melihat dan merapikan."
                                                >
                                                    ⚠️ {posTokenResult.hazards.length} Boundary Hazard!
                                                </button>
                                            )}
                                        </div>

                                        <div className="chunk-ribbon-right">
                                            <button
                                                type="button"
                                                className={`chunk-toggle-btn ${showLiveChunkInline ? "active" : ""}`}
                                                onClick={() => setShowLiveChunkInline(!showLiveChunkInline)}
                                            >
                                                {showLiveChunkInline ? "Tutup Highlight ▲" : "Live Chunk Highlight ▼"}
                                            </button>
                                            <button
                                                type="button"
                                                className="chunk-profiler-btn"
                                                onClick={() => setViewMode("chunks")}
                                                title="Buka Live CLIP 77-Token Chunk Boundary Profiler"
                                            >
                                                Profiler Chunks →
                                            </button>
                                        </div>
                                    </div>

                                    {/* Collapsible Live Highlight Stream */}
                                    {showLiveChunkInline && (
                                        <div className="canvas-inline-highlight-box">
                                            <div className="inline-highlight-legend">
                                                <span className="dot dot-c1" /> <span>Chunk 1 (1–75): Cyan (Prioritas Utama)</span>
                                                <span className="dot dot-c2" /> <span>Chunk 2 (76–150): Amber (Zona Sekunder)</span>
                                                <span className="dot dot-c3" /> <span>Chunk 3+ (151+): Red/Orange (Resiko Bleeding)</span>
                                            </div>
                                            <div className="inline-highlight-tags">
                                                {posTokenResult.tagSpans.map((span) => {
                                                    const isSplit = span.isSplitAcrossChunks;
                                                    const cls = isSplit
                                                        ? "split-hazard"
                                                        : span.primaryChunk === 1
                                                        ? "c1"
                                                        : span.primaryChunk === 2
                                                        ? "c2"
                                                        : "c3";
                                                    return (
                                                        <span
                                                            key={span.tagIndex}
                                                            className={`inline-tag-pill ${cls}`}
                                                            title={`"${span.tagText}" • Tok #${span.startGlobalIndex}-#${span.endGlobalIndex} • Chunk ${span.startChunk}${isSplit ? ` ➜ C${span.endChunk}` : ""}`}
                                                        >
                                                            <span className="idx">C{isSplit ? `${span.startChunk}➜${span.endChunk}` : span.primaryChunk}</span>
                                                            <span>{span.cleanText}</span>
                                                            {span.weight !== 1.0 && <span className="wt">{span.weight.toFixed(2)}x</span>}
                                                            {isSplit && <span className="cut" title="Tag terpotong di batas 75 token!">✂️</span>}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* VIEW: INLINE CLIP 77-TOKEN CHUNKS & LIVE HIGHLIGHTER */}
                            {viewMode === "chunks" && (
                                <div className="canvas-inline-chunks">
                                    <ClipChunkVisualizer
                                        prompt={positivePrompt}
                                        onChangePrompt={(newPrompt) => {
                                            setPositivePrompt(newPrompt);
                                            const { buckets, lora } = deconstructPromptText(newPrompt);
                                            setCategoryInputs(buckets);
                                            if (lora) {
                                                setLoraName(lora.name);
                                                setLoraWeight(lora.weight);
                                                setLoraEnabled(true);
                                            }
                                        }}
                                        onCopy={(text) => triggerCopy(text, "chunk-copy", "Chunk prompt disalin!")}
                                        defaultArch={activeCheckpoint?.base_model?.toLowerCase().includes("sd 1.5") ? "sd15" : activeCheckpoint?.base_model?.toLowerCase().includes("flux") ? "flux" : "sdxl"}
                                        activeCheckpointName={activeCheckpoint?.name}
                                    />
                                </div>
                            )}

                            {/* VIEW 2: INTERACTIVE TOKENIZER CHIPS */}
                            {viewMode === "tokenizer" && (
                                <>
                                    <div className="tokenizer-toolbar-note">
                                        <div className="tokenizer-note-left">
                                            <span>Semantik:</span>
                                            <span className="legend-chip quality">Quality</span>
                                            <span className="legend-chip character">Subject</span>
                                            <span className="legend-chip outfit">Outfit</span>
                                            <span className="legend-chip scene">Scene</span>
                                            <span className="legend-chip lighting">Lighting</span>
                                            <span className="legend-chip lora">LoRA</span>
                                        </div>

                                        <div className="tokenizer-note-right">
                                            <button
                                                type="button"
                                                className="tokenizer-action-btn"
                                                onClick={handleSortTokensByCategory}
                                                title="Urutkan tags secara teratur (Quality -> Subject -> Outfit -> Scenery)"
                                            >
                                                <Icons.Wand />
                                                <span>Organize Order</span>
                                            </button>
                                            <span>Total: <strong>{tokens.length}</strong> tags</span>
                                        </div>
                                    </div>

                                    <div className="prompt-tokenizer-container">
                                        {tokens.length === 0 ? (
                                            <div className="tokenizer-empty-note">
                                                Prompt kosong. Tulis prompt di tab Editor atau pilih preset dari sidebar.
                                            </div>
                                        ) : (
                                            tokens.map((tokenStr, idx) => {
                                                const { clean, weight, isWeighted } = parseTokenWeight(tokenStr);
                                                const isSelected = selectedTokenIndex === idx;
                                                const category = classifyTag(tokenStr);

                                                return (
                                                    <span
                                                        key={`${idx}-${clean}`}
                                                        className={`prompt-token-chip cat-${category} ${isSelected ? "active" : ""} ${isWeighted ? "weighted" : ""}`}
                                                        onClick={() => setSelectedTokenIndex(isSelected ? null : idx)}
                                                    >
                                                        <span className="token-text">{clean}</span>
                                                        {isWeighted && (
                                                            <span className="prompt-token-weight-badge">
                                                                {weight.toFixed(2)}x
                                                            </span>
                                                        )}
                                                    </span>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Inline Add Token Input in Tokenizer */}
                                    <form onSubmit={handleAddTokenInTokenizer} className="tokenizer-add-row">
                                        <Icons.Plus />
                                        <input
                                            type="text"
                                            className="tokenizer-add-input"
                                            placeholder="Tambahkan tag baru lalu tekan Enter (misal: 1girl, smiling, cyberpunk jacket)..."
                                            value={newTokenInput}
                                            onChange={(e) => setNewTokenInput(e.target.value)}
                                        />
                                        <button type="submit" className="tokenizer-add-btn" disabled={!newTokenInput.trim()}>
                                            Add Tag
                                        </button>
                                    </form>

                                    {/* Inline Token Inspector Popover */}
                                    {selectedTokenIndex !== null && tokens[selectedTokenIndex] && (
                                        <div className="token-weight-popover">
                                            {(() => {
                                                const activeToken = tokens[selectedTokenIndex];
                                                const { clean, weight } = parseTokenWeight(activeToken);

                                                return (
                                                    <>
                                                        <div className="token-popover-header">
                                                            <div className="token-popover-meta">
                                                                <span>Token: <code>{clean}</code></span>
                                                                <span className="token-popover-pos">Posisi: #{selectedTokenIndex + 1}/{tokens.length}</span>
                                                            </div>

                                                            <div className="token-popover-move-buttons">
                                                                <button
                                                                    type="button"
                                                                    className="token-move-btn"
                                                                    onClick={() => moveToken(selectedTokenIndex, "left")}
                                                                    disabled={selectedTokenIndex === 0}
                                                                    title="Pindahkan token ke kiri"
                                                                >
                                                                    <Icons.ArrowLeft />
                                                                    <span>Geser Kiri</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="token-move-btn"
                                                                    onClick={() => moveToken(selectedTokenIndex, "right")}
                                                                    disabled={selectedTokenIndex === tokens.length - 1}
                                                                    title="Pindahkan token ke kanan"
                                                                >
                                                                    <span>Geser Kanan</span>
                                                                    <Icons.ArrowRight />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="token-popover-slider-row">
                                                            <input
                                                                type="range"
                                                                min="0.5"
                                                                max="2.0"
                                                                step="0.05"
                                                                value={weight}
                                                                className="token-popover-slider"
                                                                onChange={(e) => updateTokenWeight(selectedTokenIndex, parseFloat(e.target.value))}
                                                            />
                                                            <span className="token-popover-number">
                                                                {weight.toFixed(2)}x
                                                            </span>
                                                        </div>

                                                        <div className="token-popover-steppers">
                                                            <button
                                                                type="button"
                                                                className="token-stepper-btn"
                                                                onClick={() => updateTokenWeight(selectedTokenIndex, weight - 0.05)}
                                                            >
                                                                -0.05
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="token-stepper-btn"
                                                                onClick={() => updateTokenWeight(selectedTokenIndex, weight + 0.05)}
                                                            >
                                                                +0.05
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="token-stepper-btn highlight"
                                                                onClick={() => updateTokenWeight(selectedTokenIndex, 1.1)}
                                                            >
                                                                (+) 1.1x
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="token-stepper-btn highlight"
                                                                onClick={() => updateTokenWeight(selectedTokenIndex, 1.2)}
                                                            >
                                                                (++) 1.2x
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="token-stepper-btn highlight"
                                                                onClick={() => updateTokenWeight(selectedTokenIndex, 0.9)}
                                                            >
                                                                [-] 0.9x
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="token-stepper-btn"
                                                                onClick={() => updateTokenWeight(selectedTokenIndex, 1.0)}
                                                            >
                                                                Reset 1.0
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="token-stepper-btn danger"
                                                                onClick={() => removeToken(selectedTokenIndex)}
                                                            >
                                                                Hapus Token
                                                            </button>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* VIEW 3: INLINE WILDCARD MATRIX COMBINATOR */}
                            {viewMode === "matrix" && (
                                <div className="prompt-matrix-tab-view">
                                    <div className="matrix-tab-header">
                                        <div className="matrix-tab-title">
                                            <Icons.Matrix />
                                            <span>Combinatorial Variations</span>
                                            <span className="matrix-count-badge">
                                                {matrixVariations.length} Combinations
                                            </span>
                                        </div>

                                        <div className="matrix-tab-actions">
                                            <button
                                                type="button"
                                                className="prompt-btn-sm"
                                                onClick={() => {
                                                    if (matrixVariations.length === 0) return;
                                                    const randomIndex = Math.floor(Math.random() * matrixVariations.length);
                                                    triggerCopy(matrixVariations[randomIndex], "random-rolled-matrix", "Variasi acak berhasil disalin!");
                                                }}
                                                title="Pick and copy 1 random permutation"
                                            >
                                                <Icons.Dice />
                                                <span>{copiedKey === "random-rolled-matrix" ? "Rolled & Copied!" : "Roll Random"}</span>
                                            </button>

                                            <button
                                                type="button"
                                                className="prompt-btn-sm"
                                                onClick={() => triggerCopy(matrixVariations.join("\n"), "copy-all-vars", "Seluruh variasi berhasil disalin!")}
                                                title="Copy all combinations separated by newlines"
                                            >
                                                <Icons.Copy />
                                                <span>{copiedKey === "copy-all-vars" ? "All Copied!" : "Copy All"}</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="matrix-permutations-list">
                                        {matrixVariations.slice(0, 50).map((variant, idx) => (
                                            <div key={idx} className="matrix-row-item">
                                                <span className="matrix-row-index">#{idx + 1}</span>
                                                <span className="matrix-row-text" title={variant}>
                                                    {variant}
                                                </span>
                                                <div className="matrix-row-actions">
                                                    <button
                                                        type="button"
                                                        className="prompt-btn-sm"
                                                        onClick={() => triggerCopy(variant, `matrix-item-${idx}`)}
                                                        title="Copy this variation"
                                                    >
                                                        {copiedKey === `matrix-item-${idx}` ? <Icons.Check /> : <Icons.Copy />}
                                                        <span>{copiedKey === `matrix-item-${idx}` ? "Copied" : "Copy"}</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="prompt-btn-sm highlight"
                                                        onClick={() => {
                                                            setPositivePrompt(variant);
                                                            setViewMode("editor");
                                                            showToast(`Variasi #${idx + 1} dimuat ke Editor`);
                                                        }}
                                                        title="Load into positive editor"
                                                    >
                                                        Apply
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* NEGATIVE PROMPT STUDIO CARD */}
                    <div className="prompt-canvas-card negative-card">
                        <div className="prompt-canvas-header">
                            <div className="prompt-canvas-title-wrap">
                                <span className="prompt-badge negative">Negative Prompt</span>
                                <span className="prompt-token-pill">~{negTokenCount} tokens</span>
                            </div>

                            <div className="prompt-canvas-actions">
                                <button
                                    type="button"
                                    className="prompt-btn-sm"
                                    onClick={() => setNegativePrompt(cleanPromptText(negativePrompt))}
                                    title="Rapikan tanda koma dan spasi ekstra"
                                >
                                    <Icons.Clean />
                                    <span>Rapikan</span>
                                </button>

                                <button
                                    type="button"
                                    className="prompt-btn-sm"
                                    onClick={() => triggerCopy(negativePrompt, "copy-negative", "Prompt negatif disalin!")}
                                    title="Salin prompt negatif ke clipboard"
                                >
                                    {copiedKey === "copy-negative" ? <Icons.Check /> : <Icons.Copy />}
                                    <span>{copiedKey === "copy-negative" ? "Tersalin!" : "Salin"}</span>
                                </button>

                                <button
                                    type="button"
                                    className="prompt-btn-sm danger-hover"
                                    onClick={() => {
                                        if (window.confirm("Kosongkan prompt negatif?")) {
                                            setNegativePrompt("");
                                            showToast("Prompt negatif dikosongkan");
                                        }
                                    }}
                                    title="Bersihkan prompt negatif"
                                >
                                    <Icons.Trash />
                                </button>
                            </div>
                        </div>

                        <div className="prompt-canvas-body">
                            <BooruAutocompleteInput
                                as="textarea"
                                className="prompt-textarea"
                                rows={4}
                                value={negativePrompt}
                                onChange={(val) => setNegativePrompt(val)}
                                placeholder="e.g. worst quality, low quality, bad anatomy, bad hands, blurry..."
                                customDbTags={booruCustomDbTags}
                            />

                            {/* Sub-bar Preset Arsitektur & Mode */}
                            <div className="neg-presets-sub-bar">
                                <div className="neg-presets-sub-left">
                                    <span className="neg-sub-label">Preset Arsitektur:</span>
                                    <div className="negative-presets-group">
                                        {(["Illustrious", "SDXL", "Pony", "Flux"] as const).map((arch) => (
                                            <button
                                                key={arch}
                                                type="button"
                                                className={`neg-quick-btn ${(activeCheckpoint?.base_model || "SDXL").toLowerCase() === arch.toLowerCase() ? "recommended" : ""}`}
                                                onClick={() => handleApplyArchitectureNegative(arch)}
                                                title={`Muat recommended ${arch} negative prompt (${negativeInsertMode === "replace" ? "Ganti Total" : "Sisipkan"})`}
                                            >
                                                {NEGATIVE_PRESET_LABELS[arch]}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="neg-mode-selector">
                                    <span className="neg-mode-label">Mode:</span>
                                    <button
                                        type="button"
                                        className={`neg-mode-toggle ${negativeInsertMode === "replace" ? "active" : ""}`}
                                        onClick={() => setNegativeInsertMode("replace")}
                                        title="Ganti total negative prompt saat memilih preset"
                                    >
                                        Ganti
                                    </button>
                                    <button
                                        type="button"
                                        className={`neg-mode-toggle ${negativeInsertMode === "append" ? "active" : ""}`}
                                        onClick={() => setNegativeInsertMode("append")}
                                        title="Gabungkan / sisipkan ke negative prompt yang ada"
                                    >
                                        Sisipkan
                                    </button>
                                </div>
                            </div>

                            {/* Categorized Quick Negative Exclusion Pills Cloud (Active tags sorted to the left) */}
                            <div className="quick-neg-groups-wrap">
                                {CATEGORIZED_NEGATIVE_TAGS.map((grp) => {
                                    const categoryLabelsIndo: Record<string, string> = {
                                        Quality: "Kualitas",
                                        Anatomy: "Anatomi",
                                        Artifacts: "Artefak",
                                        "Style/Aesthetic": "Gaya",
                                    };

                                    const sortedTags = [...grp.tags].sort((a, b) => {
                                        const aActive = negativePrompt.toLowerCase().includes(a.toLowerCase());
                                        const bActive = negativePrompt.toLowerCase().includes(b.toLowerCase());
                                        if (aActive && !bActive) return -1;
                                        if (!aActive && bActive) return 1;
                                        return 0;
                                    });

                                    return (
                                        <div key={grp.category} className="quick-neg-group">
                                            <span className="quick-neg-label">{categoryLabelsIndo[grp.category] || grp.category}:</span>
                                            <div className="quick-neg-chips">
                                                {sortedTags.map((tag) => {
                                                    const isActive = negativePrompt.toLowerCase().includes(tag.toLowerCase());
                                                    return (
                                                        <button
                                                            key={tag}
                                                            type="button"
                                                            className={`quick-neg-tag-chip ${isActive ? "active" : ""}`}
                                                            onClick={() => toggleNegativeTag(tag)}
                                                            title={isActive ? `Hapus "${tag}" dari negative prompt` : `Tambahkan "${tag}" ke negative prompt`}
                                                        >
                                                            <span className="chip-symbol">{isActive ? "✕" : "+"}</span>
                                                            <span>{tag}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Dockable Library & Resource Explorer */}
                {/* Right Column: Dockable Library & Resource Explorer */}
                {!isSidebarCollapsed && (
                    <div className="prompt-sidebar-col">
                        {/* Navigation Tabs */}
                        <div className="prompt-sidebar-nav">
                            <button
                                type="button"
                                className={`sidebar-tab-btn ${sidebarTab === "presets" ? "active" : ""}`}
                                onClick={() => setSidebarTab("presets")}
                            >
                                <Icons.Bookmark />
                                <span>Preset Karakter</span>
                                <span className="sidebar-tab-count">{presets.length}</span>
                            </button>
                            <button
                                type="button"
                                className={`sidebar-tab-btn ${sidebarTab === "catalog" ? "active" : ""}`}
                                onClick={() => setSidebarTab("catalog")}
                            >
                                <Icons.Layers />
                                <span>Pencocok LoRA</span>
                                <span className="sidebar-tab-count">{compatibleLoras.length}</span>
                            </button>
                            <button
                                type="button"
                                className={`sidebar-tab-btn ${sidebarTab === "modular" ? "active" : ""}`}
                                onClick={() => setSidebarTab("modular")}
                            >
                                <Icons.Tag />
                                <span>Blok Modular</span>
                                <span className="sidebar-tab-count">{modularPresets.length}</span>
                            </button>
                        </div>

                        {/* Tab Content Area */}
                        <div className="prompt-sidebar-content">
                            {/* TAB 1: PRESET BROWSER */}
                            {sidebarTab === "presets" && (
                                <>
                                    {/* Category Filter Pills (Anime vs Realistic) */}
                                    <div className="prompt-category-nav">
                                        {PRESET_CATEGORIES.map((cat) => (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                className={`prompt-cat-chip ${presetCategoryFilter === cat.id ? "active" : ""}`}
                                                onClick={() => setPresetCategoryFilter(cat.id)}
                                            >
                                                <span>{cat.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Architecture Filter, Sort & Search Bar */}
                                    <div className="preset-search-filter-bar">
                                        <div className="preset-search-input-wrap">
                                            <Icons.Search />
                                            <input
                                                type="text"
                                                className="preset-search-input"
                                                placeholder="Cari judul, karakter, trigger..."
                                                value={presetSearch}
                                                onChange={(e) => setPresetSearch(e.target.value)}
                                            />
                                            {presetSearch && (
                                                <button
                                                    type="button"
                                                    className="preset-search-clear"
                                                    onClick={() => setPresetSearch("")}
                                                    title="Bersihkan pencarian"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>

                                        <select
                                            className="preset-arch-select"
                                            value={presetBaseModelFilter}
                                            onChange={(e) => setPresetBaseModelFilter(e.target.value)}
                                            title="Filter Arsitektur"
                                        >
                                            <option value="all">Semua Arsitektur</option>
                                            <option value="Illustrious">Illustrious</option>
                                            <option value="SDXL">SDXL</option>
                                            <option value="Pony">Pony</option>
                                        </select>

                                        <select
                                            className="preset-arch-select"
                                            value={presetSort}
                                            onChange={(e) => setPresetSort(e.target.value as "favorites" | "newest" | "alpha")}
                                            title="Urutkan preset"
                                        >
                                            <option value="favorites">⭐ Favorit Teratas</option>
                                            <option value="newest">Terbaru</option>
                                            <option value="alpha">Nama A-Z</option>
                                        </select>

                                        <button
                                            type="button"
                                            className="preset-new-btn"
                                            onClick={handleOpenCreatePreset}
                                            title="Buat preset baru dari canvas saat ini"
                                        >
                                            <Icons.Plus />
                                            <span>+ Baru</span>
                                        </button>
                                    </div>

                                    {presetsLoading ? (
                                        <div className="preset-empty-state">
                                            <div className="preset-empty-icon">
                                                <Icons.Bookmark />
                                            </div>
                                            <div className="preset-empty-title">Memuat Karakter Preset...</div>
                                        </div>
                                    ) : characterGroups.length === 0 ? (
                                        <div className="preset-empty-state">
                                            <div className="preset-empty-icon">
                                                <Icons.Bookmark />
                                            </div>
                                            <div className="preset-empty-title">Tidak ada karakter ditemukan</div>
                                            <div className="preset-empty-desc">
                                                {presetCategoryFilter === "favorites"
                                                    ? "Belum ada preset karakter yang difavoritkan. Klik karakter untuk melihat dan menyematkan ⭐."
                                                    : presetSearch || presetBaseModelFilter !== "all" || presetCategoryFilter !== "all"
                                                    ? "Coba reset filter arsitektur atau kata kunci pencarian Anda."
                                                    : "Belum ada preset tersimpan di database."}
                                            </div>
                                            {(presetSearch || presetBaseModelFilter !== "all" || presetCategoryFilter !== "anime") && (
                                                <button
                                                    type="button"
                                                    className="preset-empty-reset-btn"
                                                    onClick={() => {
                                                        setPresetSearch("");
                                                        setPresetBaseModelFilter("all");
                                                        setPresetCategoryFilter("anime");
                                                    }}
                                                >
                                                    Reset Filter
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="sidebar-char-card-wrap">
                                            <div className="sidebar-char-card-header">
                                                <span className="sidebar-char-card-title">Karakter &amp; Preset Tersimpan</span>
                                                <span className="sidebar-char-card-badge">
                                                    {characterGroups.length} Karakter ({displayPresets.length} Preset)
                                                </span>
                                            </div>

                                            <div className="sidebar-char-card-list">
                                                {characterGroups.map((group) => {
                                                    const firstPreset = group.presets[0];
                                                    const firstThumb = group.sampleImages && group.sampleImages.length > 0 ? group.sampleImages[0] : null;
                                                    const parts = group.character.trim().split(/\s+/);
                                                    const charInitials = parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : group.character.substring(0, 2).toUpperCase();
                                                    const seriesName = group.subcategories && group.subcategories.length > 0 ? group.subcategories[0] : null;
                                                    const previewTriggers = firstPreset?.trigger_words || (firstPreset?.positive_prompt ? firstPreset.positive_prompt.slice(0, 65) + "..." : "");

                                                    return (
                                                        <div key={group.character} className={`sidebar-char-card ${group.hasFavorite ? "has-favorite" : ""}`}>
                                                            <div
                                                                className="sidebar-char-thumb-wrap"
                                                                onClick={() => setSelectedCharacterForModal(group.character)}
                                                                title={`Buka preset ${group.character}`}
                                                            >
                                                                {firstThumb ? (
                                                                    <img
                                                                        src={resolveImageUrl(firstThumb)}
                                                                        alt={group.character}
                                                                        className="sidebar-char-thumb-img"
                                                                    />
                                                                ) : (
                                                                    <div className="sidebar-char-thumb-fallback">
                                                                        {charInitials}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="sidebar-char-info">
                                                                <div className="sidebar-char-top-row">
                                                                    <span
                                                                        className="sidebar-char-name"
                                                                        onClick={() => setSelectedCharacterForModal(group.character)}
                                                                        title={group.character}
                                                                    >
                                                                        {group.hasFavorite && <span className="sidebar-fav-star" title="Memiliki preset favorit">★</span>}
                                                                        {group.character}
                                                                    </span>
                                                                    <span className="sidebar-char-count-badge">
                                                                        {group.count} Preset
                                                                    </span>
                                                                </div>

                                                                <div className="sidebar-char-meta-row">
                                                                    {seriesName && (
                                                                        <span className="sidebar-char-series-badge">
                                                                            {seriesName}
                                                                        </span>
                                                                    )}
                                                                    <span className="sidebar-char-snippet" title={previewTriggers}>
                                                                        {previewTriggers}
                                                                    </span>
                                                                </div>

                                                                <div className="sidebar-char-actions">
                                                                    {firstPreset && (
                                                                        <button
                                                                            type="button"
                                                                            className="sidebar-char-btn-apply"
                                                                            onClick={() => handleApplyPreset(firstPreset)}
                                                                            title={`Terapkan preset utama: ${firstPreset.title}`}
                                                                        >
                                                                            <Icons.CornerDownLeft />
                                                                            <span>Terapkan</span>
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        type="button"
                                                                        className="sidebar-char-btn-view"
                                                                        onClick={() => setSelectedCharacterForModal(group.character)}
                                                                        title={`Lihat detail ${group.count} preset untuk ${group.character}`}
                                                                    >
                                                                        <span>Lihat ({group.count})</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* TAB 2: COMPATIBLE LORAS */}
                            {sidebarTab === "catalog" && (
                                <>
                                    {/* LoRA Compatibility Banner */}
                                    <div className="lora-compat-banner">
                                        <div className="lora-compat-header">
                                            <span>Target Checkpoint Architecture</span>
                                            <span className="lora-compat-badge match">
                                                {activeCheckpoint?.base_model || "SDXL"} Compatible
                                            </span>
                                        </div>
                                        <p className="lora-compat-desc">
                                            Menyaring koleksi LoRA yang kompatibel dengan <strong>{activeCheckpoint?.name || "checkpoint aktif"}</strong> untuk mencegah mismatch arsitektur.
                                        </p>
                                    </div>

                                    {/* Search LoRA */}
                                    <div className="lora-search-bar">
                                        <Icons.Search />
                                        <input
                                            type="text"
                                            className="lora-search-input"
                                            placeholder="Cari LoRA (nama atau slug)..."
                                            value={loraSearch}
                                            onChange={(e) => setLoraSearch(e.target.value)}
                                        />
                                        {loraSearch && (
                                            <button type="button" className="preset-search-clear" onClick={() => setLoraSearch("")}>
                                                ✕
                                            </button>
                                        )}
                                    </div>

                                    {/* Insert Weight Stepper */}
                                    <div className="lora-weight-row">
                                        <span className="lora-weight-label">LoRA Insert Weight:</span>
                                        <div className="lora-weight-controls">
                                            <input
                                                type="range"
                                                min="0.3"
                                                max="1.5"
                                                step="0.05"
                                                value={loraInsertWeight}
                                                onChange={(e) => setLoraInsertWeight(parseFloat(e.target.value))}
                                                className="lora-weight-slider"
                                            />
                                            <strong className="lora-weight-val">
                                                {loraInsertWeight.toFixed(2)}
                                            </strong>
                                        </div>
                                        <div className="lora-quick-weights">
                                            {[0.6, 0.8, 1.0, 1.2].map((w) => (
                                                <button
                                                    key={w}
                                                    type="button"
                                                    className={`lora-quick-w-btn ${loraInsertWeight === w ? "active" : ""}`}
                                                    onClick={() => setLoraInsertWeight(w)}
                                                >
                                                    {w.toFixed(1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {catalogLoading ? (
                                        <div className="catalog-loading-state">
                                            Memuat katalog LoRA...
                                        </div>
                                    ) : compatibleLoras.length === 0 ? (
                                        <div className="catalog-empty-state">
                                            Tidak ditemukan LoRA untuk arsitektur {activeCheckpoint?.base_model || "SDXL"}.
                                        </div>
                                    ) : (
                                        compatibleLoras.map((lora) => {
                                            const triggers = lora.trigger_words || [];
                                            const activeInPrompt = isLoraInPrompt(lora);

                                            return (
                                                <div key={lora.id} className={`catalog-item-card ${activeInPrompt ? "in-prompt" : ""}`}>
                                                    <div className="catalog-item-top">
                                                        <div className="catalog-item-title-wrap">
                                                            <span className="catalog-item-name" title={lora.name}>
                                                                {lora.name}
                                                            </span>
                                                            {activeInPrompt && (
                                                                <span className="lora-in-prompt-badge">
                                                                    <span className="badge-dot" />
                                                                    Active In Prompt
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="catalog-item-badge lora">
                                                            {lora.base_model || "LoRA"}
                                                        </span>
                                                    </div>

                                                    <div className="catalog-item-btn-row">
                                                        <button
                                                            type="button"
                                                            className="catalog-insert-btn"
                                                            onClick={() => handleInsertLoRA(lora)}
                                                            title={`Insert <lora:${lora.slug}:${loraInsertWeight.toFixed(2)}>`}
                                                        >
                                                            <Icons.Plus />
                                                            <span>Sisipkan &lt;lora:{loraInsertWeight.toFixed(2)}&gt;</span>
                                                        </button>

                                                        {activeInPrompt && (
                                                            <button
                                                                type="button"
                                                                className="catalog-remove-btn"
                                                                onClick={() => handleRemoveLoRA(lora)}
                                                                title="Hapus LoRA ini dari positive prompt"
                                                            >
                                                                <Icons.Trash />
                                                                <span>Hapus</span>
                                                            </button>
                                                        )}
                                                    </div>

                                                    {triggers.length > 0 && (
                                                        <div className="catalog-triggers-box">
                                                            {triggers.map((tw) => (
                                                                <span
                                                                    key={tw.id}
                                                                    className="catalog-trigger-pill"
                                                                    onClick={() => handleAppendPositive(tw.trigger_word)}
                                                                    title="Klik untuk menyisipkan trigger word"
                                                                >
                                                                    +{tw.trigger_word}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </>
                            )}

                            {/* TAB 3: MODULAR BUILDING BLOCKS */}
                            {sidebarTab === "modular" && (
                                <>
                                    {/* 1. Unified Search Bar & Quick Add Token Button */}
                                    <div className="modular-toolbar-row">
                                        <div className="modular-search-bar">
                                            <Icons.Search />
                                            <input
                                                type="text"
                                                className="modular-search-input"
                                                placeholder={`Cari dari ${totalModularTokenCount} blok token...`}
                                                value={blockSearch}
                                                onChange={(e) => setBlockSearch(e.target.value)}
                                            />
                                            {blockSearch && (
                                                <button
                                                    type="button"
                                                    className="preset-search-clear"
                                                    onClick={() => setBlockSearch("")}
                                                    title="Bersihkan pencarian"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            className="modular-new-token-btn"
                                            onClick={() => {
                                                setModularCategory("Outfit");
                                                setIsAddModularModalOpen(true);
                                            }}
                                            title="Tambah token / building block kustom baru ke database"
                                        >
                                            <Icons.Plus />
                                            <span>+ Token Baru</span>
                                        </button>
                                    </div>

                                    {/* 2. Horizontal Category Filter Pills Bar */}
                                    <div className="modular-category-pills-bar">
                                        <button
                                            type="button"
                                            className={`modular-cat-filter-pill ${modularCategoryFilter === "all" ? "active" : ""}`}
                                            onClick={() => setModularCategoryFilter("all")}
                                        >
                                            Semua
                                        </button>
                                        {BLOCK_GROUPS.map((g) => {
                                            const shortLabel = g.label.split(" & ")[0].split(" / ")[0];
                                            return (
                                                <button
                                                    key={g.key}
                                                    type="button"
                                                    className={`modular-cat-filter-pill ${modularCategoryFilter === g.key ? "active" : ""}`}
                                                    onClick={() => setModularCategoryFilter(g.key)}
                                                >
                                                    {shortLabel}
                                                </button>
                                            );
                                        })}
                                        {modularPresets.some((p) => !KNOWN_BLOCK_SUBCATS.includes((p.subcategory || "").toLowerCase())) && (
                                            <button
                                                type="button"
                                                className={`modular-cat-filter-pill ${modularCategoryFilter === "other" ? "active" : ""}`}
                                                onClick={() => setModularCategoryFilter("other")}
                                            >
                                                Lainnya
                                            </button>
                                        )}
                                    </div>

                                    {/* 3. Data-Driven Modular Categories */}
                                    {BLOCK_GROUPS.filter((g) => modularCategoryFilter === "all" || modularCategoryFilter === g.key).map((group) => {
                                        const customTokens = modularPresets.filter((p) => {
                                            const sub = (p.subcategory || "").toLowerCase();
                                            return group.match.includes(sub) || (group.matchCategory && p.category === group.matchCategory);
                                        });

                                        const filterTerm = blockSearch.toLowerCase().trim();
                                        const filteredDefaults = filterTerm
                                            ? group.defaults.filter((t) => t.toLowerCase().includes(filterTerm))
                                            : group.defaults;
                                        const filteredCustom = filterTerm
                                            ? customTokens.filter((p) => (p.title || "").toLowerCase().includes(filterTerm) || p.positive_prompt.toLowerCase().includes(filterTerm))
                                            : customTokens;

                                        if (filterTerm && filteredDefaults.length === 0 && filteredCustom.length === 0) {
                                            return null;
                                        }

                                        const totalCount = filteredDefaults.length + filteredCustom.length;
                                        const isCollapsed = !!collapsedModularGroups[group.key];
                                        const isInlineAddOpen = inlineAddGroupKey === group.key;

                                        // Separate standard 1-2 word tags vs descriptive phrases
                                        const standardDefaults = filteredDefaults.filter((t) => !isLongPhrase(t));
                                        const phraseDefaults = filteredDefaults.filter((t) => isLongPhrase(t));

                                        const standardCustom = filteredCustom.filter((p) => !isLongPhrase(p.positive_prompt));
                                        const phraseCustom = filteredCustom.filter((p) => isLongPhrase(p.positive_prompt));

                                        const hasPhrases = phraseDefaults.length > 0 || phraseCustom.length > 0;

                                        return (
                                            <div key={group.key} className={`modular-group-card ${isCollapsed ? "collapsed" : ""}`}>
                                                {/* Category Header with Accordion toggle */}
                                                <div
                                                    className="modular-section-header"
                                                    onClick={() => toggleCollapseModularGroup(group.key)}
                                                    title="Klik untuk ciutkan / buka kategori ini"
                                                >
                                                    <div className="modular-header-left">
                                                        <span className={`modular-chevron-icon ${isCollapsed ? "collapsed" : ""}`}>
                                                            ▾
                                                        </span>
                                                        <span className="modular-category-name">{group.label}</span>
                                                        <span className="modular-category-count">({totalCount})</span>
                                                    </div>

                                                    <div className="modular-header-actions" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            type="button"
                                                            className={`modular-add-btn ${isInlineAddOpen ? "active" : ""}`}
                                                            onClick={() => {
                                                                if (isInlineAddOpen) {
                                                                    setInlineAddGroupKey(null);
                                                                    setInlineAddTagInput("");
                                                                } else {
                                                                    setInlineAddGroupKey(group.key);
                                                                    setInlineAddTagInput("");
                                                                }
                                                            }}
                                                            title={`Tambah tag baru ke ${group.label}`}
                                                        >
                                                            <Icons.Plus />
                                                            <span>{isInlineAddOpen ? "Tutup" : "Tambah"}</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Inline Quick Add Input */}
                                                {isInlineAddOpen && (
                                                    <form
                                                        className="modular-inline-add-form"
                                                        onSubmit={async (e) => {
                                                            e.preventDefault();
                                                            const text = inlineAddTagInput.trim();
                                                            if (!text) return;
                                                            try {
                                                                await handleAddModularTag(group.modalCategory, text);
                                                                setInlineAddTagInput("");
                                                                setInlineAddGroupKey(null);
                                                            } catch {
                                                                // error handled inside handleAddModularTag
                                                            }
                                                        }}
                                                    >
                                                        <input
                                                            type="text"
                                                            className="modular-inline-input"
                                                            placeholder={`Ketik tag untuk ${group.label} lalu Enter...`}
                                                            value={inlineAddTagInput}
                                                            onChange={(e) => setInlineAddTagInput(e.target.value)}
                                                            autoFocus
                                                        />
                                                        <button
                                                            type="submit"
                                                            className="modular-inline-submit-btn"
                                                            disabled={!inlineAddTagInput.trim()}
                                                        >
                                                            Simpan
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="modular-inline-cancel-btn"
                                                            onClick={() => {
                                                                setInlineAddGroupKey(null);
                                                                setInlineAddTagInput("");
                                                            }}
                                                        >
                                                            Batal
                                                        </button>
                                                    </form>
                                                )}

                                                {/* Category Body: Standard Tags & Phrases */}
                                                {!isCollapsed && (
                                                    <div className="modular-group-body">
                                                        {/* Standard 1-2 Word Tags */}
                                                        <div className="modular-pill-group">
                                                            {standardDefaults.map((tag) => {
                                                                const active = isTokenActiveInPrompt(tag);
                                                                return (
                                                                    <span
                                                                        key={tag}
                                                                        className={`modular-token-chip ${active ? "active" : ""}`}
                                                                        onClick={() => handleToggleModularTokenInPrompt(tag)}
                                                                        title={active ? `✓ Aktif di prompt (Klik untuk mencabut: "${tag}")` : `Klik untuk menyisipkan: "${tag}"`}
                                                                    >
                                                                        {active && <span className="modular-chip-check">✓</span>}
                                                                        <span className="modular-chip-text">{tag}</span>
                                                                    </span>
                                                                );
                                                            })}

                                                            {standardCustom.map((p) => {
                                                                const active = isTokenActiveInPrompt(p.positive_prompt);
                                                                const samples = parseSampleImages(p.sample_images);
                                                                const label = p.title || p.positive_prompt;

                                                                return (
                                                                    <span
                                                                        key={p.id}
                                                                        className={`modular-token-chip custom-token ${active ? "active" : ""}`}
                                                                        onClick={() => handleToggleModularTokenInPrompt(p.positive_prompt)}
                                                                        title={active ? `✓ Aktif di prompt (Klik untuk mencabut: "${p.positive_prompt}")` : `Custom Token: "${p.positive_prompt}" (Klik untuk menyisipkan)`}
                                                                    >
                                                                        {active && <span className="modular-chip-check">✓</span>}
                                                                        <span className="modular-chip-text">{label}</span>
                                                                        {samples.length > 0 && (
                                                                            <span
                                                                                className="modular-pill-preview-btn"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setLightboxImage({ url: resolveImageUrl(samples[0]), title: p.title });
                                                                                }}
                                                                                title="Lihat foto preview"
                                                                            >
                                                                                <Icons.Eye />
                                                                            </span>
                                                                        )}
                                                                        <span
                                                                            className="modular-pill-del"
                                                                            onClick={(e) => handleDeleteModularPreset(p.id, e)}
                                                                            title="Hapus token ini dari database"
                                                                        >
                                                                            ✕
                                                                        </span>
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Separator for Descriptive / Longer Custom Phrases */}
                                                        {hasPhrases && (
                                                            <div className="modular-phrases-section">
                                                                <div className="modular-phrases-divider">
                                                                    <span className="modular-phrases-label">Frasa Deskriptif / Kustom</span>
                                                                </div>

                                                                <div className="modular-pill-group">
                                                                    {phraseDefaults.map((tag) => {
                                                                        const active = isTokenActiveInPrompt(tag);
                                                                        return (
                                                                            <span
                                                                                key={tag}
                                                                                className={`modular-token-chip phrase-chip ${active ? "active" : ""}`}
                                                                                onClick={() => handleToggleModularTokenInPrompt(tag)}
                                                                                title={active ? `✓ Aktif di prompt (Klik untuk mencabut)` : `Klik untuk menyisipkan frasa`}
                                                                            >
                                                                                {active && <span className="modular-chip-check">✓</span>}
                                                                                <span className="modular-chip-text">{tag}</span>
                                                                            </span>
                                                                        );
                                                                    })}

                                                                    {phraseCustom.map((p) => {
                                                                        const active = isTokenActiveInPrompt(p.positive_prompt);
                                                                        const samples = parseSampleImages(p.sample_images);
                                                                        const label = p.title || p.positive_prompt;

                                                                        return (
                                                                            <span
                                                                                key={p.id}
                                                                                className={`modular-token-chip custom-token phrase-chip ${active ? "active" : ""}`}
                                                                                onClick={() => handleToggleModularTokenInPrompt(p.positive_prompt)}
                                                                                title={active ? `✓ Aktif di prompt (Klik untuk mencabut)` : `Custom Phrase: "${p.positive_prompt}"`}
                                                                            >
                                                                                {active && <span className="modular-chip-check">✓</span>}
                                                                                <span className="modular-chip-text">{label}</span>
                                                                                {samples.length > 0 && (
                                                                                    <span
                                                                                        className="modular-pill-preview-btn"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setLightboxImage({ url: resolveImageUrl(samples[0]), title: p.title });
                                                                                        }}
                                                                                        title="Lihat foto preview"
                                                                                    >
                                                                                        <Icons.Eye />
                                                                                    </span>
                                                                                )}
                                                                                <span
                                                                                    className="modular-pill-del"
                                                                                    onClick={(e) => handleDeleteModularPreset(p.id, e)}
                                                                                    title="Hapus frasa ini dari database"
                                                                                >
                                                                                    ✕
                                                                                </span>
                                                                            </span>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* 4. Other Custom User Categories */}
                                    {(modularCategoryFilter === "all" || modularCategoryFilter === "other") && (() => {
                                        const otherPresets = modularPresets.filter((p) => {
                                            const sub = (p.subcategory || "").toLowerCase();
                                            return !KNOWN_BLOCK_SUBCATS.includes(sub);
                                        });

                                        const filterTerm = blockSearch.toLowerCase().trim();
                                        const filteredOthers = filterTerm
                                            ? otherPresets.filter((p) => (p.title || "").toLowerCase().includes(filterTerm) || p.positive_prompt.toLowerCase().includes(filterTerm))
                                            : otherPresets;

                                        if (filteredOthers.length === 0) return null;

                                        const isCollapsed = !!collapsedModularGroups["other"];
                                        const standardOthers = filteredOthers.filter((p) => !isLongPhrase(p.positive_prompt));
                                        const phraseOthers = filteredOthers.filter((p) => isLongPhrase(p.positive_prompt));

                                        return (
                                            <div className={`modular-group-card ${isCollapsed ? "collapsed" : ""}`}>
                                                <div
                                                    className="modular-section-header"
                                                    onClick={() => toggleCollapseModularGroup("other")}
                                                    title="Klik untuk ciutkan / buka"
                                                >
                                                    <div className="modular-header-left">
                                                        <span className={`modular-chevron-icon ${isCollapsed ? "collapsed" : ""}`}>
                                                            ▾
                                                        </span>
                                                        <span className="modular-category-name">Token Kustom Lainnya</span>
                                                        <span className="modular-category-count">({filteredOthers.length})</span>
                                                    </div>
                                                </div>

                                                {!isCollapsed && (
                                                    <div className="modular-group-body">
                                                        <div className="modular-pill-group">
                                                            {standardOthers.map((p) => {
                                                                const active = isTokenActiveInPrompt(p.positive_prompt);
                                                                const label = p.title || p.positive_prompt;

                                                                return (
                                                                    <span
                                                                        key={p.id}
                                                                        className={`modular-token-chip custom-token ${active ? "active" : ""}`}
                                                                        onClick={() => handleToggleModularTokenInPrompt(p.positive_prompt)}
                                                                        title={active ? `✓ Aktif di prompt (Klik untuk mencabut)` : `Custom: "${p.positive_prompt}"`}
                                                                    >
                                                                        {active && <span className="modular-chip-check">✓</span>}
                                                                        <span className="modular-chip-text">{label}</span>
                                                                        <span
                                                                            className="modular-pill-del"
                                                                            onClick={(e) => handleDeleteModularPreset(p.id, e)}
                                                                            title="Hapus dari database"
                                                                        >
                                                                            ✕
                                                                        </span>
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>

                                                        {phraseOthers.length > 0 && (
                                                            <div className="modular-phrases-section">
                                                                <div className="modular-phrases-divider">
                                                                    <span className="modular-phrases-label">Frasa Deskriptif Kustom</span>
                                                                </div>
                                                                <div className="modular-pill-group">
                                                                    {phraseOthers.map((p) => {
                                                                        const active = isTokenActiveInPrompt(p.positive_prompt);
                                                                        const label = p.title || p.positive_prompt;

                                                                        return (
                                                                            <span
                                                                                key={p.id}
                                                                                className={`modular-token-chip custom-token phrase-chip ${active ? "active" : ""}`}
                                                                                onClick={() => handleToggleModularTokenInPrompt(p.positive_prompt)}
                                                                                title={active ? `✓ Aktif di prompt (Klik untuk mencabut)` : `Custom Phrase: "${p.positive_prompt}"`}
                                                                            >
                                                                                {active && <span className="modular-chip-check">✓</span>}
                                                                                <span className="modular-chip-text">{label}</span>
                                                                                <span
                                                                                    className="modular-pill-del"
                                                                                    onClick={(e) => handleDeleteModularPreset(p.id, e)}
                                                                                    title="Hapus dari database"
                                                                                >
                                                                                    ✕
                                                                                </span>
                                                                            </span>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
            </>
            )}

            {/* TAB: CLIP TOKENIZER & 77-TOKEN CHUNK BOUNDARY VISUALIZER */}
            {studioTab === "tokenizer" && (
                <div style={{ marginTop: "20px" }}>
                    <ClipChunkVisualizer
                        prompt={positivePrompt}
                        onChangePrompt={(newPrompt) => {
                            setPositivePrompt(newPrompt);
                            const { buckets, lora } = deconstructPromptText(newPrompt);
                            setCategoryInputs(buckets);
                            if (lora) {
                                setLoraName(lora.name);
                                setLoraWeight(lora.weight);
                                setLoraEnabled(true);
                            }
                        }}
                        onCopy={(text) => {
                            navigator.clipboard.writeText(text);
                            showToast("Chunk prompt disalin ke clipboard!");
                        }}
                        defaultArch={activeCheckpoint?.base_model?.toLowerCase().includes("sd 1.5") ? "sd15" : activeCheckpoint?.base_model?.toLowerCase().includes("flux") ? "flux" : "sdxl"}
                        activeCheckpointName={activeCheckpoint?.name}
                    />
                </div>
            )}

            {/* TAB 3: SMART DECONSTRUCTOR */}
            {studioTab === "deconstructor" && (
                <DeconstructorView
                    onApplyToStudio={handleApplyDeconstructedToStudio}
                    onApplyToCanvas={handleApplyDeconstructedToCanvas}
                    showToast={showToast}
                />
            )}

            {/* TAB 4: PRESET & CHARACTER LIBRARY (FULL-WIDTH EXPLORER) */}
            {studioTab === "library" && (
                <div className="studio-library-view-container">
                    <div className="studio-library-view-header">
                        <div className="studio-library-title-group">
                            <h2>Preset &amp; Character Library Explorer</h2>
                            <p>Database koleksi racikan prompt karakter anime &amp; gaya realistis lengkap dengan sample preview.</p>
                        </div>
                        <button
                            type="button"
                            className="prompt-btn-primary"
                            onClick={handleOpenCreatePreset}
                        >
                            <Icons.Plus />
                            <span>Buat Preset Baru</span>
                        </button>
                    </div>

                    {/* Category Filter Pills (Anime vs Realistic) */}
                    <div className="prompt-category-nav" style={{ marginBottom: "16px" }}>
                        {PRESET_CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                type="button"
                                className={`prompt-cat-chip ${presetCategoryFilter === cat.id ? "active" : ""}`}
                                onClick={() => setPresetCategoryFilter(cat.id)}
                            >
                                <span>{cat.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Architecture Filter, Sort & Search Bar */}
                    <div className="preset-search-filter-bar" style={{ marginBottom: "20px" }}>
                        <div className="preset-search-input-wrap">
                            <Icons.Search />
                            <input
                                type="text"
                                className="preset-search-input"
                                placeholder="Cari karakter, trigger words, atau judul preset..."
                                value={presetSearch}
                                onChange={(e) => setPresetSearch(e.target.value)}
                            />
                            {presetSearch && (
                                <button
                                    type="button"
                                    className="preset-search-clear"
                                    onClick={() => setPresetSearch("")}
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        <select
                            className="preset-arch-select"
                            value={presetBaseModelFilter}
                            onChange={(e) => setPresetBaseModelFilter(e.target.value)}
                        >
                            <option value="all">All Architectures</option>
                            <option value="Illustrious">Illustrious</option>
                            <option value="SDXL">SDXL</option>
                            <option value="Pony">Pony</option>
                            <option value="Flux">Flux</option>
                        </select>

                        <select
                            className="preset-arch-select"
                            value={presetSort}
                            onChange={(e) => setPresetSort(e.target.value as "favorites" | "newest" | "alpha")}
                        >
                            <option value="favorites">⭐ Favorites First</option>
                            <option value="newest">Newest</option>
                            <option value="alpha">A-Z Title</option>
                        </select>
                    </div>

                    {/* Character Groups Grid */}
                    {presetsLoading ? (
                        <div className="preset-empty-state">
                            <div className="preset-empty-icon"><Icons.Bookmark /></div>
                            <div className="preset-empty-title">Memuat Karakter Preset...</div>
                        </div>
                    ) : characterGroups.length === 0 ? (
                        <div className="preset-empty-state">
                            <div className="preset-empty-icon"><Icons.Bookmark /></div>
                            <div className="preset-empty-title">Tidak ada karakter ditemukan</div>
                            <div className="preset-empty-desc">Coba sesuaikan kata kunci atau filter kategori.</div>
                        </div>
                    ) : (
                        <div className="studio-library-char-grid">
                            {characterGroups.map((group) => (
                                <div
                                    key={group.character}
                                    className="studio-library-char-card"
                                    onClick={() => setSelectedCharacterForModal(group.character)}
                                >
                                    <div className="studio-library-char-thumb">
                                        {group.sampleImages[0] ? (
                                            <OptimizedImage
                                                src={group.sampleImages[0]}
                                                alt={group.character}
                                                thumbnail={true}
                                                className="studio-char-cover-img"
                                            />
                                        ) : (
                                            <div className="studio-char-placeholder-icon">
                                                <Icons.Bookmark />
                                            </div>
                                        )}
                                        {group.hasFavorite && (
                                            <span className="studio-char-fav-star">⭐</span>
                                        )}
                                    </div>

                                    <div className="studio-library-char-content">
                                        <h4 className="studio-library-char-name">{group.character}</h4>
                                        <div className="studio-library-char-meta">
                                            <span className="meta-tag">{group.count} preset</span>
                                            {group.baseModels.slice(0, 2).map((b) => (
                                                <span key={b} className="meta-arch">{b}</span>
                                            ))}
                                        </div>
                                        <div className="studio-library-char-actions">
                                            <button
                                                type="button"
                                                className="studio-char-load-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (group.presets[0]) {
                                                        handleApplyPreset(group.presets[0]);
                                                    }
                                                }}
                                            >
                                                Muat Preset Utama
                                            </button>
                                            <button
                                                type="button"
                                                className="studio-char-detail-btn"
                                                onClick={() => setSelectedCharacterForModal(group.character)}
                                            >
                                                Lihat Variasi ({group.count}) →
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* SNAPSHOTS & HISTORY DRAWER */}
            {isHistoryDrawerOpen && (
                <div className="prompt-modal-backdrop" onClick={() => setIsHistoryDrawerOpen(false)}>
                    <div className="prompt-history-drawer-box" onClick={(e) => e.stopPropagation()}>
                        <div className="prompt-modal-header">
                            <div className="modal-header-title-wrap">
                                <Icons.History />
                                <h3 className="prompt-modal-title">Riwayat Iterasi &amp; Snapshots</h3>
                            </div>
                            <button
                                type="button"
                                className="modal-close-btn"
                                onClick={() => setIsHistoryDrawerOpen(false)}
                            >
                                <Icons.X />
                            </button>
                        </div>

                        <div className="history-drawer-body">
                            <div className="history-take-bar">
                                <button
                                    type="button"
                                    className="prompt-btn-primary"
                                    onClick={() => handleTakeSnapshot()}
                                    title="Simpan keadaan canvas saat ini ke riwayat"
                                >
                                    <Icons.Plus />
                                    <span>Ambil Snapshot Sekarang</span>
                                </button>
                                <span className="history-take-hint">
                                    Maksimum 15 snapshot tersimpan lokal di browser Anda.
                                </span>
                            </div>

                            {promptSnapshots.length === 0 ? (
                                <div className="history-empty-note">
                                    Belum ada snapshot tersimpan. Klik "Ambil Snapshot Sekarang" atau ubah prompt untuk menyimpan versi.
                                </div>
                            ) : (
                                <div className="history-list">
                                    {promptSnapshots.map((snap) => (
                                        <div key={snap.id} className="history-item-card">
                                            <div className="history-item-header">
                                                <div className="history-item-meta">
                                                    <strong className="history-item-label">{snap.label}</strong>
                                                    <span className="history-item-time">
                                                        {new Date(snap.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                                    </span>
                                                </div>
                                                <div className="history-item-actions">
                                                    <button
                                                        type="button"
                                                        className="prompt-btn-sm highlight"
                                                        onClick={() => handleRestoreSnapshot(snap)}
                                                        title="Pulihkan canvas ke versi ini"
                                                    >
                                                        Restore
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="prompt-btn-sm text-muted-hover"
                                                        onClick={(e) => handleDeleteSnapshot(snap.id, e)}
                                                        title="Hapus snapshot ini"
                                                    >
                                                        <Icons.Trash />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="history-item-snippet" title={snap.positive}>
                                                <span className="snippet-tag">POS</span>
                                                {snap.positive || "(Kosong)"}
                                            </div>
                                            {snap.negative && (
                                                <div className="history-item-snippet negative" title={snap.negative}>
                                                    <span className="snippet-tag neg">NEG</span>
                                                    {snap.negative}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* SAVE PRESET MODAL */}
            {isSavePresetModalOpen && (
                <div className="prompt-modal-backdrop" onClick={() => { setIsSavePresetModalOpen(false); setEditingPreset(null); }}>
                    <div className="prompt-modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="prompt-modal-header">
                            <div className="modal-header-title-wrap">
                                <h3 className="prompt-modal-title">
                                    {editingPreset ? "Edit Preset" : "Save Concoction as Preset"}
                                </h3>
                                {editingPreset && (
                                    <span className="preset-id-badge">
                                        ID #{editingPreset.id}
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                className="modal-close-btn"
                                onClick={() => {
                                    setIsSavePresetModalOpen(false);
                                    setEditingPreset(null);
                                }}
                            >
                                <Icons.X />
                            </button>
                        </div>
                        <form onSubmit={handleSavePreset}>
                            <div className="prompt-modal-body">
                                {/* Style Selection */}
                                <div>
                                    <label className="modal-field-label">
                                        Image Style / Category *
                                    </label>
                                    <div className="prompt-style-toggle-group">
                                        {PRESET_STYLE_OPTIONS.map((opt) => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                className={`prompt-style-toggle-btn ${newPresetStyle === opt.value ? "active" : ""}`}
                                                onClick={() => setNewPresetStyle(opt.value)}
                                            >
                                                <span className="style-btn-title">{opt.label}</span>
                                                <span className="style-btn-hint">{opt.hint}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Title & Character Name */}
                                <div className="modal-two-col-grid">
                                    <div>
                                        <label className="modal-field-label">
                                            Character Name *
                                        </label>
                                        <input
                                            type="text"
                                            list="character-names-datalist"
                                            className="modal-input"
                                            placeholder="e.g. Rio Tsukatsuki, Frieren, 2B"
                                            value={newPresetCharacterName}
                                            onChange={(e) => setNewPresetCharacterName(e.target.value)}
                                            required
                                            autoFocus
                                        />
                                        <datalist id="character-names-datalist">
                                            {existingCharacterNames.map((name) => (
                                                <option key={name} value={name} />
                                            ))}
                                        </datalist>
                                    </div>

                                    <div>
                                        <label className="modal-field-label">
                                            Preset / Scene Title *
                                        </label>
                                        <input
                                            type="text"
                                            className="modal-input"
                                            placeholder="e.g. Tactical Seminar Office, Gothic Dress"
                                            value={newPresetTitle}
                                            onChange={(e) => setNewPresetTitle(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Trigger Words & Subcategory */}
                                <div className="modal-two-col-grid">
                                    <div>
                                        <label className="modal-field-label">
                                            Trigger Words (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            className="modal-input"
                                            placeholder="e.g. rio tsukatsuki, halo, red eyes"
                                            value={newPresetTriggerWords}
                                            onChange={(e) => setNewPresetTriggerWords(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="modal-field-label">
                                            Subcategory / Franchise (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            className="modal-input"
                                            placeholder="e.g. Blue Archive, Cyberpunk"
                                            value={newPresetSubcategory}
                                            onChange={(e) => setNewPresetSubcategory(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Target Checkpoint Architecture */}
                                <div>
                                    <label className="modal-field-label">
                                        Target Architecture
                                    </label>
                                    <select
                                        className="modal-select"
                                        value={newPresetBaseModelTarget}
                                        onChange={(e) => setNewPresetBaseModelTarget(e.target.value)}
                                    >
                                        <option value="Illustrious">Illustrious XL</option>
                                        <option value="SDXL">SDXL 1.0</option>
                                        <option value="Pony">Pony Diffusion V6</option>
                                        <option value="SD 1.5">SD 1.5</option>
                                        <option value="All">Universal / All Archs</option>
                                    </select>
                                </div>

                                {/* Positive Prompt */}
                                <div>
                                    <label className="modal-field-label">
                                        Positive Prompt *
                                    </label>
                                    <textarea
                                        className="modal-textarea"
                                        rows={3}
                                        placeholder="Masukkan racikan prompt positif..."
                                        value={newPresetPositive}
                                        onChange={(e) => setNewPresetPositive(e.target.value)}
                                        required
                                    />
                                </div>

                                {/* Negative Prompt */}
                                <div>
                                    <label className="modal-field-label">
                                        Negative Prompt (Optional)
                                    </label>
                                    <textarea
                                        className="modal-textarea"
                                        rows={2}
                                        placeholder="Masukkan negative prompt..."
                                        value={newPresetNegative}
                                        onChange={(e) => setNewPresetNegative(e.target.value)}
                                    />
                                </div>

                                {/* Sample Images Manager */}
                                <div className="preset-sample-manager">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                        accept="image/png,image/jpeg,image/webp"
                                        style={{ display: "none" }}
                                    />
                                    <div className="preset-sample-actions-bar">
                                        <div className="sample-manager-title">
                                            Sample Images ({newPresetSampleList.length}/5)
                                        </div>
                                        <div className="preset-sample-btn-group">
                                            <button
                                                type="button"
                                                className="preset-sample-upload-btn"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isUploadingSample || newPresetSampleList.length >= 5}
                                                title="Upload gambar dari komputer lokal"
                                            >
                                                <Icons.Upload />
                                                <span>{isUploadingSample ? "Mengunggah..." : "Upload Lokal"}</span>
                                            </button>
                                            <button
                                                type="button"
                                                className="preset-sample-gallery-btn"
                                                onClick={handleOpenGalleryPicker}
                                                disabled={newPresetSampleList.length >= 5}
                                                title="Pilih gambar dari galeri database"
                                            >
                                                <Icons.Image />
                                                <span>Pilih Galeri</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* 5-Slot Grid Preview */}
                                    <div className="preset-slots-grid">
                                        {[0, 1, 2, 3, 4].map((slotIdx) => {
                                            const imgUrl = newPresetSampleList[slotIdx];
                                            if (imgUrl) {
                                                return (
                                                    <div key={slotIdx} className="preset-slot-card">
                                                        <img
                                                            src={resolveImageUrl(imgUrl)}
                                                            alt={`Sample ${slotIdx + 1}`}
                                                            onClick={() => setLightboxImage({ url: resolveImageUrl(imgUrl), title: `Sample #${slotIdx + 1}` })}
                                                        />
                                                        <span className="preset-slot-badge">#{slotIdx + 1}</span>
                                                        <button
                                                            type="button"
                                                            className="preset-slot-remove"
                                                            onClick={() => handleRemoveSample(slotIdx)}
                                                            title="Hapus foto ini"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div
                                                    key={slotIdx}
                                                    className="preset-slot-card preset-slot-empty"
                                                    onClick={handleOpenGalleryPicker}
                                                    title="Pilih foto dari galeri"
                                                >
                                                    <Icons.Plus />
                                                    <span>Slot {slotIdx + 1}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="sample-manager-footnote">
                                        Maksimum 5 foto representatif. Klik foto untuk zoom atau ✕ untuk menghapus.
                                    </div>
                                </div>

                                {/* Description / Sampling Notes */}
                                <div>
                                    <label className="modal-field-label">
                                        Sampling &amp; Generation Notes (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        className="modal-input"
                                        placeholder="e.g. Best with DPM++ 2M Karras, CFG 6.0, Steps 28"
                                        value={newPresetDescription}
                                        onChange={(e) => setNewPresetDescription(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="prompt-modal-footer">
                                <button
                                    type="button"
                                    className="prompt-btn-sm"
                                    onClick={() => {
                                        setIsSavePresetModalOpen(false);
                                        setEditingPreset(null);
                                    }}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="prompt-btn-primary">
                                    <Icons.Check />
                                    <span>{editingPreset ? "Update Preset" : "Save Preset"}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ADD BUILDING BLOCK / OUTFIT TOKEN MODAL */}
            {isAddModularModalOpen && (
                <div className="prompt-modal-backdrop" onClick={() => setIsAddModularModalOpen(false)}>
                    <div className="prompt-modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="prompt-modal-header">
                            <h3 className="prompt-modal-title">Tambah Token Building Block</h3>
                            <button
                                type="button"
                                className="modal-close-btn"
                                onClick={() => setIsAddModularModalOpen(false)}
                            >
                                <Icons.X />
                            </button>
                        </div>
                        <form onSubmit={handleSaveModularPreset}>
                            <div className="prompt-modal-body">
                                <div>
                                    <label className="modal-field-label">
                                        Kategori / Jenis
                                    </label>
                                    <select
                                        className="modal-select"
                                        value={modularCategory}
                                        onChange={(e) => setModularCategory(e.target.value)}
                                    >
                                        <option value="Quality">Quality &amp; Rendering</option>
                                        <option value="Character">Character &amp; Subject</option>
                                        <option value="Outfit">Outfit &amp; Clothing</option>
                                        <option value="Background">Scenery &amp; Background</option>
                                        <option value="Lighting">Lighting &amp; Camera</option>
                                        <option value="Custom">Kategori Kustom...</option>
                                    </select>
                                </div>

                                {modularCategory === "Custom" && (
                                    <div>
                                        <label className="modal-field-label">
                                            Nama Kategori Kustom
                                        </label>
                                        <input
                                            type="text"
                                            className="modal-input"
                                            placeholder="e.g. Hairstyle, Weapon, Expression"
                                            value={modularCustomSubcategory}
                                            onChange={(e) => setModularCustomSubcategory(e.target.value)}
                                            required
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="modal-field-label">
                                        Token Prompt (Teks yang disisipkan) *
                                    </label>
                                    <input
                                        type="text"
                                        className="modal-input"
                                        placeholder="e.g. oversized off-shoulder knit sweater, white wool"
                                        value={modularToken}
                                        onChange={(e) => setModularToken(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="modal-field-label">
                                        Judul Tampilan / Label (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        className="modal-input"
                                        placeholder="e.g. White Knit Sweater"
                                        value={modularTitle}
                                        onChange={(e) => setModularTitle(e.target.value)}
                                    />
                                </div>

                                <div className="modal-two-col-grid">
                                    <div>
                                        <label className="modal-field-label">
                                            Arsitektur Target
                                        </label>
                                        <select
                                            className="modal-select"
                                            value={modularBaseModel}
                                            onChange={(e) => setModularBaseModel(e.target.value)}
                                        >
                                            <option value="All">All Architectures (Universal)</option>
                                            <option value="Illustrious">Illustrious XL</option>
                                            <option value="SDXL">SDXL</option>
                                            <option value="Pony">Pony V6</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="modal-field-label">
                                            Sample Image URL (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            className="modal-input"
                                            placeholder="https://... atau /uploads/..."
                                            value={modularSampleImages}
                                            onChange={(e) => setModularSampleImages(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="modal-tip-note">
                                    Token ini disimpan permanen ke database lokal Anda dan langsung muncul di tab Blocks.
                                </div>
                            </div>
                            <div className="prompt-modal-footer">
                                <button
                                    type="button"
                                    className="prompt-btn-sm"
                                    onClick={() => setIsAddModularModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="prompt-btn-primary">
                                    <Icons.Check />
                                    <span>Simpan ke Database</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* GALLERY IMAGE PICKER MODAL */}
            {isGalleryPickerOpen && (
                <div className="prompt-modal-backdrop" onClick={() => setIsGalleryPickerOpen(false)}>
                    <div className="preset-gallery-picker-box" onClick={(e) => e.stopPropagation()}>
                        <div className="prompt-modal-header">
                            <div>
                                <h3 className="prompt-modal-title">Pilih Foto dari Galeri Database</h3>
                                <div className="modal-header-sub">
                                    Terpilih: {newPresetSampleList.length}/5 foto
                                </div>
                            </div>
                            <button
                                type="button"
                                className="modal-close-btn"
                                onClick={() => setIsGalleryPickerOpen(false)}
                            >
                                <Icons.X />
                            </button>
                        </div>

                        {/* Search in Gallery */}
                        <div className="gallery-picker-search-bar">
                            <Icons.Search />
                            <input
                                type="text"
                                className="gallery-picker-search-input"
                                placeholder="Cari foto di galeri (prompt, model, atau caption)..."
                                value={gallerySearch}
                                onChange={(e) => setGallerySearch(e.target.value)}
                            />
                        </div>

                        {/* Gallery Image Grid */}
                        <div className="preset-gallery-grid">
                            {galleryLoading ? (
                                <div className="gallery-picker-empty">
                                    Memuat foto galeri...
                                </div>
                            ) : galleryImages.length === 0 ? (
                                <div className="gallery-picker-empty">
                                    Belum ada gambar di database galeri. Gunakan tombol "Upload Lokal".
                                </div>
                            ) : (
                                galleryImages
                                    .filter((img) => {
                                        if (!gallerySearch.trim()) return true;
                                        const term = gallerySearch.toLowerCase();
                                        return (
                                            (img.caption || "").toLowerCase().includes(term) ||
                                            (img.positive_prompt || "").toLowerCase().includes(term) ||
                                            (img.model_name || "").toLowerCase().includes(term)
                                        );
                                    })
                                    .map((img) => {
                                        const isSelected = newPresetSampleList.includes(img.image_url);
                                        const selectIndex = newPresetSampleList.indexOf(img.image_url);
                                        return (
                                            <div
                                                key={img.id}
                                                className={`preset-gallery-item ${isSelected ? "selected" : ""}`}
                                                onClick={() => handleToggleGalleryImage(img.image_url)}
                                                title={img.caption || img.model_name || "Gallery Image"}
                                            >
                                                <img src={resolveImageUrl(img.image_url)} alt={img.caption || "Gallery"} loading="lazy" />
                                                {isSelected && (
                                                    <span className="preset-gallery-select-badge">
                                                        ✓{selectIndex + 1}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })
                            )}
                        </div>

                        <div className="prompt-modal-footer">
                            <button
                                type="button"
                                className="prompt-btn-primary"
                                onClick={() => setIsGalleryPickerOpen(false)}
                            >
                                <Icons.Check />
                                <span>Gunakan Foto ({newPresetSampleList.length}/5)</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* LIGHTBOX PREVIEW MODAL */}
            {lightboxImage && (
                <div className="prompt-lightbox-backdrop" onClick={() => setLightboxImage(null)}>
                    <div className="prompt-lightbox-content" onClick={(e) => e.stopPropagation()}>
                        <div className="prompt-lightbox-img-wrap">
                            <img src={lightboxImage.url} alt={lightboxImage.title} />
                        </div>
                        <div className="prompt-lightbox-info">
                            <strong className="lightbox-title">{lightboxImage.title}</strong>
                            <button
                                type="button"
                                className="prompt-btn-sm"
                                onClick={() => setLightboxImage(null)}
                            >
                                <Icons.X />
                                <span>Tutup</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CHARACTER PRESETS MODAL POPUP ("modal pop up dengan full list char yang terkait") */}
            {selectedCharacterForModal && (
                <div
                    className="prompt-modal-backdrop"
                    onClick={() => setSelectedCharacterForModal(null)}
                >
                    <div
                        className="prompt-modal-box char-presets-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="prompt-modal-header char-presets-modal-header">
                            <div className="modal-header-title-wrap">
                                <div className="char-modal-title-row">
                                    {charAvatarImage ? (
                                        <img
                                            src={resolveImageUrl(charAvatarImage)}
                                            alt={selectedCharacterForModal}
                                            className="char-modal-avatar-img"
                                        />
                                    ) : (
                                        <div className="char-modal-avatar-fallback">
                                            {charInitials}
                                        </div>
                                    )}
                                    <div className="char-modal-title-col">
                                        <h3 className="prompt-modal-title">
                                            {selectedCharacterForModal}
                                        </h3>
                                        <div className="char-modal-subtitle">
                                            {charSeriesName ? (
                                                <>
                                                    <span className="char-modal-series">{charSeriesName}</span>
                                                    <span className="char-modal-dot">•</span>
                                                </>
                                            ) : null}
                                            <span className="char-modal-count-text">
                                                {activeCharPresets.length} Preset Tersimpan
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="char-modal-header-actions">
                                <button
                                    type="button"
                                    className="char-modal-add-btn-clean"
                                    onClick={() => handleOpenCreatePreset(selectedCharacterForModal)}
                                    title={`Tambah preset baru untuk ${selectedCharacterForModal}`}
                                >
                                    <Icons.Plus />
                                    <span>Tambah Preset</span>
                                </button>
                                <button
                                    type="button"
                                    className="modal-close-btn"
                                    onClick={() => setSelectedCharacterForModal(null)}
                                    title="Tutup modal"
                                >
                                    <Icons.X />
                                </button>
                            </div>
                        </div>

                        <div className="prompt-modal-body char-presets-modal-body">
                            {activeCharPresets.length === 0 ? (
                                <div className="preset-empty-state">
                                    <div className="preset-empty-icon">
                                        <Icons.Bookmark />
                                    </div>
                                    <div className="preset-empty-title">
                                        Tidak ada preset tersisa untuk {selectedCharacterForModal}
                                    </div>
                                </div>
                            ) : (
                                <div className="char-modal-card-list">
                                    {activeCharPresets.map((preset) => {
                                        const sampleImgs = parseSampleImages(preset.sample_images);
                                        const isFav = favoritePresetIds.includes(preset.id);
                                        const variantTitle = getPresetVariantTitle(preset, selectedCharacterForModal);
                                        const isExpanded = !!expandedPromptCards[preset.id];
                                        const currentImgIdx = cardImageIndex[preset.id] || 0;
                                        const activeImg = sampleImgs[currentImgIdx] || sampleImgs[0];

                                        return (
                                            <div
                                                key={preset.id}
                                                className={`char-preset-card-item ${isFav ? "favorited" : ""}`}
                                            >
                                                {/* Left Column: Interactive Thumbnail Stack (if sample images exist) */}
                                                {sampleImgs.length > 0 && (
                                                    <div className="char-preset-thumb-col">
                                                        <div
                                                            className="char-preset-thumb-stack"
                                                            onClick={() => setLightboxImage({
                                                                url: resolveImageUrl(activeImg),
                                                                title: `${selectedCharacterForModal} - ${variantTitle}`
                                                            })}
                                                            title="Klik untuk zoom preview foto"
                                                        >
                                                            <img
                                                                src={resolveImageUrl(activeImg)}
                                                                alt={`${variantTitle} preview`}
                                                                className="char-preset-thumb-img"
                                                            />
                                                            {sampleImgs.length > 1 ? (
                                                                <button
                                                                    type="button"
                                                                    className="char-preset-stack-badge"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setCardImageIndex((prev) => ({
                                                                            ...prev,
                                                                            [preset.id]: ((prev[preset.id] || 0) + 1) % sampleImgs.length,
                                                                        }));
                                                                    }}
                                                                    title="Klik untuk ganti foto sampel"
                                                                >
                                                                    <Icons.Image />
                                                                    <span>{sampleImgs.length} Foto</span>
                                                                </button>
                                                            ) : (
                                                                <span className="char-preset-stack-badge static">
                                                                    <Icons.Image />
                                                                    <span>1 Foto</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Right Column: Details, Unified Code Block & Action Buttons */}
                                                <div className="char-preset-content-col">
                                                    {/* Header Tiap Preset */}
                                                    <div className="char-preset-card-header">
                                                        <div className="char-preset-title-group">
                                                            <button
                                                                type="button"
                                                                className={`char-preset-fav-btn ${isFav ? "active" : ""}`}
                                                                onClick={(e) => toggleFavoritePreset(preset.id, e)}
                                                                title={isFav ? "Hapus dari favorit" : "Sematkan ke favorit ⭐"}
                                                            >
                                                                <Icons.Star filled={isFav} />
                                                            </button>
                                                            <h4 className="char-preset-title-text" title={preset.title}>
                                                                {variantTitle}
                                                            </h4>
                                                        </div>

                                                        <div className="char-preset-header-meta">
                                                            <span className="char-preset-arch-badge">
                                                                {(preset.base_model_target || "ILLUSTRIOUS").toUpperCase()}
                                                            </span>
                                                            <div className="char-preset-micro-actions">
                                                                <button
                                                                    type="button"
                                                                    className="char-preset-micro-btn"
                                                                    onClick={(e) => handleOpenEditPreset(preset, e)}
                                                                    title="Edit preset"
                                                                >
                                                                    <Icons.Edit />
                                                                    <span>Edit</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="char-preset-micro-btn delete"
                                                                    onClick={(e) => handleDeletePreset(preset.id, preset.title, e)}
                                                                    title="Hapus preset dari database"
                                                                >
                                                                    <Icons.Trash />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Blok Prompt Terpadu (Single Unified Container) */}
                                                    <div
                                                        className={`char-preset-unified-prompt-box ${isExpanded ? "expanded" : ""}`}
                                                        onClick={() => toggleExpandPrompt(preset.id)}
                                                        title="Klik baris untuk membuka / merapatkan seluruh isi prompt"
                                                    >
                                                        {/* Baris 1: Trigger Words (opsional jika ada) */}
                                                        {preset.trigger_words && (
                                                            <div className="char-prompt-row triggers">
                                                                <span className="char-prompt-label triggers">TRIGGER</span>
                                                                <span
                                                                    className={`char-prompt-text triggers ${isExpanded ? "expanded" : ""}`}
                                                                    title={preset.trigger_words}
                                                                >
                                                                    {preset.trigger_words}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* Baris 2: Positive Prompt */}
                                                        <div className="char-prompt-row pos">
                                                            <span className="char-prompt-label pos">POS</span>
                                                            <span
                                                                className={`char-prompt-text pos ${isExpanded ? "expanded" : ""}`}
                                                                title={preset.positive_prompt}
                                                            >
                                                                {preset.positive_prompt}
                                                            </span>
                                                        </div>

                                                        {/* Baris 3: Negative Prompt (opsional jika ada) */}
                                                        {preset.negative_prompt && (
                                                            <div className="char-prompt-row neg">
                                                                <span className="char-prompt-label neg">NEG</span>
                                                                <span
                                                                    className={`char-prompt-text neg ${isExpanded ? "expanded" : ""}`}
                                                                    title={preset.negative_prompt}
                                                                >
                                                                    {preset.negative_prompt}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Hierarki Tombol Aksi */}
                                                    <div className="char-preset-actions-row">
                                                        <button
                                                            type="button"
                                                            className="char-preset-btn-apply"
                                                            onClick={() => handleApplyPreset(preset)}
                                                            title="Terapkan positive & negative prompt ke canvas dan studio"
                                                        >
                                                            <Icons.CornerDownLeft />
                                                            <span>Terapkan Preset</span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="char-preset-btn-secondary"
                                                            onClick={() => handleAppendPositive(preset.positive_prompt)}
                                                            title="Sisipkan tag ke prompt yang sedang aktif tanpa menghapus yang sudah ada"
                                                        >
                                                            <Icons.Plus />
                                                            <span>Sisipkan (Append)</span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="char-preset-btn-secondary"
                                                            onClick={() => triggerCopy(preset.positive_prompt, `preset-copy-${preset.id}`, "Prompt preset disalin!")}
                                                            title="Salin positive prompt ke clipboard tanpa menimpa canvas"
                                                        >
                                                            {copiedKey === `preset-copy-${preset.id}` ? <Icons.Check /> : <Icons.Copy />}
                                                            <span>{copiedKey === `preset-copy-${preset.id}` ? "Tersalin!" : "Salin"}</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}


            {/* FLOATING STUDIO TOAST */}
            {toastMessage && (
                <div className="prompt-studio-toast">
                    <Icons.Sparkle />
                    <span>{toastMessage}</span>
                </div>
            )}
        </div>
    );
};

export default PromptLab;
