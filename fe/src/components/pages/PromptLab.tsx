import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
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
import "../../style/PromptLab.css";

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
        label: "Face & Hair / Karakter",
        match: ["hair", "eyes", "face", "character", "appearance", "hair/face"],
        modalCategory: "Hair/Face",
        defaults: ["1girl", "black hair", "long hair", "red eyes", "ponytail", "twintails", "looking at viewer", "blush", "smile"],
    },
    {
        key: "outfit",
        label: "Outfits & Pakaian",
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
        label: "Latar Belakang & Setting",
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

export const PromptLab: React.FC = () => {
    // Canvas Prompts (Strictly kept together on unified canvas)
    const [positivePrompt, setPositivePrompt] = useState<string>(
        "masterpiece, best quality, very aesthetic, newest, 1girl, rio tsukatsuki, halo, black hair, long hair, red eyes, ponytail, blazer, black jacket, collared shirt, black necktie, looking at viewer, highly detailed background, seminar office"
    );
    const [negativePrompt, setNegativePrompt] = useState<string>(
        "worst quality, low quality, bad anatomy, bad hands, missing fingers, extra digits, blurry, watermark, signature, deformed halo"
    );

    // Active Checkpoint Selection for LoRA Compatibility
    const [selectedCheckpointId, setSelectedCheckpointId] = useState<string>("");

    // Active mode in positive prompt: text editor vs interactive tokenizer vs matrix
    const [viewMode, setViewMode] = useState<"editor" | "tokenizer" | "matrix">("editor");

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

    // Modular Building Block / Token Modal
    const [isAddModularModalOpen, setIsAddModularModalOpen] = useState(false);
    const [modularCategory, setModularCategory] = useState<string>("Outfit");
    const [modularCustomSubcategory, setModularCustomSubcategory] = useState<string>("");
    const [modularTitle, setModularTitle] = useState<string>("");
    const [modularToken, setModularToken] = useState<string>("");
    const [modularBaseModel, setModularBaseModel] = useState<string>("All");
    const [modularSampleImages, setModularSampleImages] = useState<string>("");

    // Modular Presets from Database
    const [modularPresets, setModularPresets] = useState<PromptPreset[]>([]);

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

    // Token count estimation
    const countTokens = (text: string) => {
        if (!text.trim()) return 0;
        return text.trim().split(/[\s,]+/).filter(Boolean).length;
    };

    const posTokenCount = countTokens(positivePrompt);
    const negTokenCount = countTokens(negativePrompt);

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
        showToast(`Preset "${p.title}" diterapkan!`);
    };

    // Append preset positive
    const handleAppendPositive = (text: string) => {
        const updated = positivePrompt.trim() ? `${positivePrompt.trim()}, ${text}` : text;
        setPositivePrompt(cleanPromptText(updated));
        showToast(`Disisipkan: ${text.slice(0, 30)}...`);
    };

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
    const handleOpenCreatePreset = () => {
        setEditingPreset(null);
        setNewPresetTitle("");
        setNewPresetCharacterName("");
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
        setEditingPreset(preset);
        setNewPresetTitle(preset.title);
        setNewPresetCharacterName("");
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

    // Save Preset to Database
    const handleSavePreset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPresetTitle.trim()) return;

        const effectiveTitle = newPresetCharacterName.trim()
            ? `${newPresetCharacterName.trim()} (${newPresetTitle.trim()})`
            : newPresetTitle.trim();

        const effectivePos = newPresetPositive.trim() || positivePrompt;
        const effectiveNeg = newPresetNegative.trim() || undefined;

        try {
            if (editingPreset) {
                await updatePromptPresetApi(editingPreset.id, {
                    title: effectiveTitle,
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
                showToast(`Preset "${effectiveTitle}" diperbarui!`);
            } else {
                await createPromptPresetApi({
                    title: effectiveTitle,
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
                showToast(`Preset "${effectiveTitle}" berhasil disimpan!`);
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

    return (
        <div className="prompt-lab-container">
            {/* Studio Header Bar */}
            <header className="prompt-lab-header">
                <div className="prompt-lab-title-row">
                    <div className="prompt-lab-heading">
                        <div className="prompt-lab-title-icon">
                            <Icons.Sliders />
                        </div>
                        <div className="prompt-lab-heading-text">
                            <div className="prompt-lab-eyebrow-row">
                                <span className="prompt-lab-eyebrow">STUDIO WORKSTATION</span>
                                <span className="studio-status-pill">
                                    <span className="studio-status-dot" />
                                    Active Studio
                                </span>
                            </div>
                            <h1 className="prompt-lab-title">Prompt Matrix &amp; Studio Lab</h1>
                        </div>
                    </div>

                    <div className="prompt-lab-header-actions">
                        <button
                            type="button"
                            className="prompt-btn-sm"
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            title={isSidebarCollapsed ? "Tampilkan Library & Explorer" : "Sembunyikan Sidebar untuk Focus Mode"}
                        >
                            <Icons.Layout />
                            <span>{isSidebarCollapsed ? "Show Library" : "Focus Mode"}</span>
                        </button>

                        <button
                            type="button"
                            className="prompt-btn-sm"
                            onClick={() => setIsHistoryDrawerOpen(true)}
                            title="Buka riwayat iterasi & snapshot canvas"
                        >
                            <Icons.History />
                            <span>Snapshots ({promptSnapshots.length})</span>
                        </button>

                        <button
                            type="button"
                            className="prompt-btn-sm"
                            onClick={handleCopyFullPrompt}
                            title="Copy Positive & Negative prompt formatted for WebUI / ComfyUI"
                        >
                            {copiedKey === "copy-full" ? <Icons.Check /> : <Icons.Clipboard />}
                            <span>{copiedKey === "copy-full" ? "Copied All!" : "Copy Full"}</span>
                        </button>

                        <button
                            type="button"
                            className="prompt-btn-primary"
                            onClick={handleOpenCreatePreset}
                            title="Simpan racikan prompt saat ini sebagai preset baru"
                        >
                            <Icons.Bookmark />
                            <span>Save Preset</span>
                        </button>

                        <button
                            type="button"
                            className="prompt-btn-sm text-muted-hover"
                            onClick={handleResetCanvas}
                            title="Clear both positive and negative prompt"
                        >
                            <Icons.Undo />
                            <span>Reset</span>
                        </button>

                        <Link
                            to={`/gallery?q=${encodeURIComponent(positivePrompt.split(",")[0]?.trim() || "")}`}
                            className="prompt-btn-sm"
                            title="Find matching artworks in local gallery"
                        >
                            <Icons.Search />
                            <span>Gallery</span>
                        </Link>
                    </div>
                </div>

                {/* Subtitle & Telemetry Metrics Strip */}
                <div className="prompt-lab-sub-row">
                    <p className="prompt-lab-subtitle">
                        Interactive prompt orchestrator with semantic tag tokenizing, wildcard permutations, architecture negative injection, and LoRA compatibility matcher.
                    </p>

                    <div className="studio-telemetry-strip">
                        <div className="telemetry-pill pos" title="Positive Tokens count">
                            <span className="telemetry-dot" />
                            <span>Pos: <strong>{posTokenCount}</strong> tok ({Math.ceil(posTokenCount / 75) || 1} chk)</span>
                        </div>
                        <div className="telemetry-pill neg" title="Negative Tokens count">
                            <span className="telemetry-dot" />
                            <span>Neg: <strong>{negTokenCount}</strong> tok</span>
                        </div>
                        {matrixVariations.length > 0 && (
                            <div className="telemetry-pill matrix" title="Active Wildcard Variations">
                                <span className="telemetry-dot" />
                                <span>Matrix: <strong>{matrixVariations.length}</strong> vars</span>
                            </div>
                        )}
                        <div className="telemetry-pill arch" title="Active Checkpoint Architecture">
                            <span>Arch: <strong>{activeCheckpoint?.base_model || "SDXL"}</strong></span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Studio Workspace Layout */}
            <div className={`prompt-lab-workspace ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
                {/* Left Column: Canvas Editors */}
                <div className="prompt-canvas-col">
                    {/* Active Checkpoint Architecture Bar */}
                    <div className="prompt-target-checkpoint-bar">
                        <div className="checkpoint-bar-left">
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
                        </div>

                        {activeCheckpoint && (
                            <div className="checkpoint-bar-right">
                                <span className="arch-label">Architecture</span>
                                <span className={`preset-base-badge ${(activeCheckpoint.base_model || "sdxl").toLowerCase()}`}>
                                    <span className="badge-dot" />
                                    {activeCheckpoint.base_model || "SDXL"}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* POSITIVE PROMPT STUDIO CARD */}
                    <div className="prompt-canvas-card positive-card">
                        <div className="prompt-canvas-header">
                            <div className="prompt-canvas-title-wrap">
                                <span className="prompt-badge positive">Positive Prompt</span>
                                <span className={`prompt-token-pill ${posTokenCount > 75 ? "over-chunk" : ""}`}>
                                    ~{posTokenCount} tokens · Chunk {Math.ceil(posTokenCount / 75) || 1}/3
                                </span>
                            </div>

                            <div className="prompt-canvas-actions">
                                {/* Mode Switcher (Editor / Tokenizer / Matrix) */}
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
                                        <span>Tokens ({tokens.length})</span>
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
                                    title="Format commas, clean spaces, and strip stray punctuation"
                                >
                                    <Icons.Clean />
                                    <span>Clean</span>
                                </button>

                                <button
                                    type="button"
                                    className="prompt-btn-sm"
                                    onClick={handleDeduplicateTokens}
                                    title="Hapus token duplikat"
                                >
                                    <span>Deduplicate</span>
                                </button>

                                <button
                                    type="button"
                                    className="prompt-btn-sm"
                                    onClick={() => setIsWildcardPickerOpen(!isWildcardPickerOpen)}
                                    title="Sisipkan koleksi wildcard {a|b|c}"
                                >
                                    <Icons.Dice />
                                    <span>Wildcards</span>
                                </button>

                                <button
                                    type="button"
                                    className="prompt-btn-sm"
                                    onClick={() => triggerCopy(positivePrompt, "copy-positive", "Positive prompt disalin!")}
                                    title="Copy positive prompt"
                                >
                                    {copiedKey === "copy-positive" ? <Icons.Check /> : <Icons.Copy />}
                                    <span>{copiedKey === "copy-positive" ? "Copied" : "Copy"}</span>
                                </button>

                                <button
                                    type="button"
                                    className="prompt-btn-sm"
                                    onClick={() => setPositivePrompt("")}
                                    title="Clear positive prompt"
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
                                    <textarea
                                        ref={textareaRef}
                                        className="prompt-textarea"
                                        rows={6}
                                        value={positivePrompt}
                                        onChange={(e) => setPositivePrompt(e.target.value)}
                                        onKeyDown={handleTextareaKeyDown}
                                        placeholder="e.g. masterpiece, best quality, 1girl, {cyberpunk | gothic} outfit, neon street..."
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
                                </>
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
                                {/* Mode Selector: Replace vs Append */}
                                <div className="neg-mode-selector">
                                    <span className="neg-mode-label">Mode:</span>
                                    <button
                                        type="button"
                                        className={`neg-mode-toggle ${negativeInsertMode === "replace" ? "active" : ""}`}
                                        onClick={() => setNegativeInsertMode("replace")}
                                        title="Ganti total negative prompt saat memilih preset"
                                    >
                                        Replace
                                    </button>
                                    <button
                                        type="button"
                                        className={`neg-mode-toggle ${negativeInsertMode === "append" ? "active" : ""}`}
                                        onClick={() => setNegativeInsertMode("append")}
                                        title="Gabungkan / sisipkan ke negative prompt yang ada"
                                    >
                                        Append
                                    </button>
                                </div>

                                <span className="prompt-toolbar-divider" aria-hidden="true" />

                                {/* Architecture Negative Quick Selectors */}
                                <div className="negative-presets-group">
                                    {(["Illustrious", "SDXL", "Pony", "Flux"] as const).map((arch) => (
                                        <button
                                            key={arch}
                                            type="button"
                                            className={`neg-quick-btn ${(activeCheckpoint?.base_model || "SDXL").toLowerCase() === arch.toLowerCase() ? "recommended" : ""}`}
                                            onClick={() => handleApplyArchitectureNegative(arch)}
                                            title={`Muat recommended ${arch} negative prompt (${negativeInsertMode})`}
                                        >
                                            {NEGATIVE_PRESET_LABELS[arch]}
                                        </button>
                                    ))}
                                </div>

                                <span className="prompt-toolbar-divider" aria-hidden="true" />

                                <button
                                    type="button"
                                    className="prompt-btn-sm"
                                    onClick={() => setNegativePrompt(cleanPromptText(negativePrompt))}
                                    title="Format commas and extra spaces"
                                >
                                    <Icons.Clean />
                                    <span>Clean</span>
                                </button>

                                <button
                                    type="button"
                                    className="prompt-btn-sm"
                                    onClick={() => triggerCopy(negativePrompt, "copy-negative", "Negative prompt disalin!")}
                                    title="Copy negative prompt"
                                >
                                    {copiedKey === "copy-negative" ? <Icons.Check /> : <Icons.Copy />}
                                    <span>{copiedKey === "copy-negative" ? "Copied" : "Copy"}</span>
                                </button>

                                <button
                                    type="button"
                                    className="prompt-btn-sm"
                                    onClick={() => setNegativePrompt("")}
                                    title="Clear negative prompt"
                                >
                                    <Icons.Trash />
                                </button>
                            </div>
                        </div>

                        <div className="prompt-canvas-body">
                            <textarea
                                className="prompt-textarea"
                                rows={4}
                                value={negativePrompt}
                                onChange={(e) => setNegativePrompt(e.target.value)}
                                placeholder="e.g. worst quality, low quality, bad anatomy, bad hands, blurry..."
                            />

                            {/* Categorized Quick Negative Exclusion Pills Cloud */}
                            <div className="quick-neg-groups-wrap">
                                {CATEGORIZED_NEGATIVE_TAGS.map((grp) => (
                                    <div key={grp.category} className="quick-neg-group">
                                        <span className="quick-neg-label">{grp.category}:</span>
                                        <div className="quick-neg-chips">
                                            {grp.tags.map((tag) => {
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
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

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
                                <span>Presets</span>
                                <span className="sidebar-tab-count">{presets.length}</span>
                            </button>
                            <button
                                type="button"
                                className={`sidebar-tab-btn ${sidebarTab === "catalog" ? "active" : ""}`}
                                onClick={() => setSidebarTab("catalog")}
                            >
                                <Icons.Layers />
                                <span>LoRA Matcher</span>
                                <span className="sidebar-tab-count">{compatibleLoras.length}</span>
                            </button>
                            <button
                                type="button"
                                className={`sidebar-tab-btn ${sidebarTab === "modular" ? "active" : ""}`}
                                onClick={() => setSidebarTab("modular")}
                            >
                                <Icons.Tag />
                                <span>Blocks</span>
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
                                                <span>{cat.id === "anime" ? "🌸" : "📷"}</span>
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
                                                    title="Clear search"
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
                                            <option value="all">All Archs</option>
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
                                            <option value="favorites">⭐ Favorites First</option>
                                            <option value="newest">Newest</option>
                                            <option value="alpha">A-Z Title</option>
                                        </select>

                                        <button
                                            type="button"
                                            className="preset-new-btn"
                                            onClick={handleOpenCreatePreset}
                                            title="Buat preset baru dari canvas saat ini"
                                        >
                                            <Icons.Plus />
                                            <span>New</span>
                                        </button>
                                    </div>

                                    {presetsLoading ? (
                                        <div className="preset-empty-state">
                                            <div className="preset-empty-icon">
                                                <Icons.Bookmark />
                                            </div>
                                            <div className="preset-empty-title">Memuat Katalog Preset...</div>
                                        </div>
                                    ) : displayPresets.length === 0 ? (
                                        <div className="preset-empty-state">
                                            <div className="preset-empty-icon">
                                                <Icons.Bookmark />
                                            </div>
                                            <div className="preset-empty-title">Tidak ada preset ditemukan</div>
                                            <div className="preset-empty-desc">
                                                {presetCategoryFilter === "favorites"
                                                    ? "Belum ada preset yang difavoritkan. Klik ikon bintang ⭐ pada kartu preset untuk menyematkannya."
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
                                        displayPresets.map((preset) => {
                                            const sampleImgs = parseSampleImages(preset.sample_images);
                                            const isFav = favoritePresetIds.includes(preset.id);

                                            return (
                                                <div key={preset.id} className={`preset-item-card ${isFav ? "favorited" : ""}`}>
                                                    <div className="preset-item-title">
                                                        <div className="preset-title-left">
                                                            <button
                                                                type="button"
                                                                className={`preset-fav-btn ${isFav ? "active" : ""}`}
                                                                onClick={(e) => toggleFavoritePreset(preset.id, e)}
                                                                title={isFav ? "Hapus dari favorit" : "Sematkan ke favorit ⭐"}
                                                            >
                                                                <Icons.Star filled={isFav} />
                                                            </button>

                                                            <span className="preset-title-text" title={preset.title}>
                                                                {preset.title}
                                                            </span>
                                                            {preset.subcategory && (
                                                                <span className="preset-sub-badge" title={preset.subcategory}>
                                                                    {preset.subcategory}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="preset-header-actions">
                                                            <span className={`preset-base-badge ${(preset.base_model_target || "sdxl").toLowerCase()}`}>
                                                                {preset.base_model_target || "All"}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                className="preset-card-tool-btn edit"
                                                                onClick={(e) => handleOpenEditPreset(preset, e)}
                                                                title="Edit preset (Judul, Prompt, Foto Sample)"
                                                            >
                                                                <Icons.Edit />
                                                                <span>Edit</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="preset-card-tool-btn delete"
                                                                onClick={(e) => handleDeletePreset(preset.id, preset.title, e)}
                                                                title="Hapus preset dari database"
                                                            >
                                                                <Icons.Trash />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Sample Thumbnails Carousel */}
                                                    {sampleImgs.length > 0 && (
                                                        <div className={`preset-sample-strip count-${Math.min(sampleImgs.length, 5)}`}>
                                                            {sampleImgs.slice(0, 5).map((imgUrl, sIdx) => (
                                                                <div
                                                                    key={sIdx}
                                                                    className="preset-sample-thumb"
                                                                    onClick={() => setLightboxImage({ url: resolveImageUrl(imgUrl), title: preset.title })}
                                                                    title="Klik untuk zoom preview"
                                                                >
                                                                    <img src={resolveImageUrl(imgUrl)} alt={`Sample ${sIdx + 1}`} loading="lazy" />
                                                                    <span className="sample-thumb-badge">#{sIdx + 1}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Trigger words if present */}
                                                    {preset.trigger_words && (
                                                        <div
                                                            className="preset-triggers-pill-row"
                                                            onClick={() => handleAppendPositive(preset.trigger_words || "")}
                                                            title="Klik untuk sisipkan trigger words ke positive prompt"
                                                        >
                                                            <span className="preset-triggers-label">TRIGGERS:</span>
                                                            <span className="preset-triggers-content">
                                                                {preset.trigger_words}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className="preset-item-snippet" title={preset.positive_prompt}>
                                                        <span className="preset-snippet-label positive">POS</span>
                                                        {preset.positive_prompt}
                                                    </div>

                                                    {preset.negative_prompt && (
                                                        <div className="preset-item-snippet negative" title={preset.negative_prompt}>
                                                            <span className="preset-snippet-label negative">NEG</span>
                                                            {preset.negative_prompt}
                                                        </div>
                                                    )}

                                                    {/* Action Buttons */}
                                                    <div className="preset-item-actions">
                                                        <button
                                                            type="button"
                                                            className="preset-apply-btn"
                                                            onClick={() => handleApplyPreset(preset)}
                                                            title="Terapkan positive & negative prompt ke canvas"
                                                        >
                                                            <Icons.Sparkle />
                                                            <span>Apply Full Preset</span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="preset-append-btn"
                                                            onClick={() => handleAppendPositive(preset.positive_prompt)}
                                                            title="Sisipkan prompt ke positive canvas"
                                                        >
                                                            <Icons.Plus />
                                                            <span>Append</span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="preset-copy-btn"
                                                            onClick={() => triggerCopy(preset.positive_prompt, `preset-copy-${preset.id}`, "Prompt preset disalin!")}
                                                            title="Salin positive prompt ke clipboard tanpa menimpa canvas"
                                                        >
                                                            {copiedKey === `preset-copy-${preset.id}` ? <Icons.Check /> : <Icons.Copy />}
                                                            <span>{copiedKey === `preset-copy-${preset.id}` ? "Copied" : "Copy"}</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
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
                                    <div className="modular-top-banner">
                                        <div className="modular-banner-text">
                                            Klik tag untuk menyisipkan ke prompt. Token kustom disimpan permanen di database.
                                        </div>
                                        <button
                                            type="button"
                                            className="modular-banner-add-btn"
                                            onClick={() => {
                                                setModularCategory("Outfit");
                                                setIsAddModularModalOpen(true);
                                            }}
                                            title="Tambah building block atau outfit kustom"
                                        >
                                            <Icons.Plus />
                                            <span>Tambah Token</span>
                                        </button>
                                    </div>

                                    {/* Search Blocks */}
                                    <div className="modular-search-bar">
                                        <Icons.Search />
                                        <input
                                            type="text"
                                            className="modular-search-input"
                                            placeholder="Cari token building blocks..."
                                            value={blockSearch}
                                            onChange={(e) => setBlockSearch(e.target.value)}
                                        />
                                        {blockSearch && (
                                            <button type="button" className="preset-search-clear" onClick={() => setBlockSearch("")}>
                                                ✕
                                            </button>
                                        )}
                                    </div>

                                    {/* Data-Driven Modular Categories */}
                                    {BLOCK_GROUPS.map((group) => {
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

                                        return (
                                            <div key={group.key} className="modular-group-card">
                                                <div className="modular-section-header">
                                                    <span>{group.label}</span>
                                                    <button
                                                        type="button"
                                                        className="modular-add-btn"
                                                        onClick={() => {
                                                            setModularCategory(group.modalCategory);
                                                            setIsAddModularModalOpen(true);
                                                        }}
                                                    >
                                                        <Icons.Plus />
                                                        <span>Tambah</span>
                                                    </button>
                                                </div>

                                                <div className="modular-pill-group">
                                                    {/* Built-in default tags */}
                                                    {filteredDefaults.map((tag) => (
                                                        <span
                                                            key={tag}
                                                            className="modular-token-pill"
                                                            onClick={() => handleAppendPositive(tag)}
                                                            title={`Sisipkan: ${tag}`}
                                                        >
                                                            +{tag}
                                                        </span>
                                                    ))}

                                                    {/* Custom Database Tokens */}
                                                    {filteredCustom.map((p) => {
                                                        const samples = parseSampleImages(p.sample_images);
                                                        return (
                                                            <span
                                                                key={p.id}
                                                                className="modular-token-pill custom-token"
                                                                onClick={() => handleAppendPositive(p.positive_prompt)}
                                                                title={`Custom Token: ${p.positive_prompt}`}
                                                            >
                                                                +{p.title || p.positive_prompt}
                                                                {samples.length > 0 && (
                                                                    <span
                                                                        className="modular-pill-preview-btn"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setLightboxImage({ url: resolveImageUrl(samples[0]), title: p.title });
                                                                        }}
                                                                        title="Lihat foto preview"
                                                                    >
                                                                        📷
                                                                    </span>
                                                                )}
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
                                        );
                                    })}

                                    {/* Other Custom User Categories */}
                                    {modularPresets.filter((p) => {
                                        const sub = (p.subcategory || "").toLowerCase();
                                        return !KNOWN_BLOCK_SUBCATS.includes(sub);
                                    }).length > 0 && (
                                        <div className="modular-group-card">
                                            <div className="modular-section-header">
                                                <span>Token Kustom Lainnya</span>
                                            </div>
                                            <div className="modular-pill-group">
                                                {modularPresets
                                                    .filter((p) => {
                                                        const sub = (p.subcategory || "").toLowerCase();
                                                        return !KNOWN_BLOCK_SUBCATS.includes(sub);
                                                    })
                                                    .map((p) => (
                                                        <span
                                                            key={p.id}
                                                            className="modular-token-pill custom-token"
                                                            onClick={() => handleAppendPositive(p.positive_prompt)}
                                                            title={`Custom: ${p.positive_prompt} (${p.subcategory})`}
                                                        >
                                                            +{p.title || p.positive_prompt}
                                                            <span
                                                                className="modular-pill-del"
                                                                onClick={(e) => handleDeleteModularPreset(p.id, e)}
                                                                title="Hapus dari database"
                                                            >
                                                                ✕
                                                            </span>
                                                        </span>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

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
                                            Character Name (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            className="modal-input"
                                            placeholder="e.g. Rio Tsukatsuki, Frieren"
                                            value={newPresetCharacterName}
                                            onChange={(e) => setNewPresetCharacterName(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="modal-field-label">
                                            Preset / Scene Title *
                                        </label>
                                        <input
                                            type="text"
                                            className="modal-input"
                                            placeholder="e.g. Tactical Seminar Office"
                                            value={newPresetTitle}
                                            onChange={(e) => setNewPresetTitle(e.target.value)}
                                            required
                                            autoFocus
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
