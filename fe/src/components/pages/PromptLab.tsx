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
};

const STANDARD_NEGATIVE_TAGS = [
    "worst quality",
    "low quality",
    "bad anatomy",
    "blurry",
    "watermark",
    "bad hands",
    "extra limbs",
    "missing fingers",
    "deformed",
    "jpeg artifacts",
    "signature",
    "ugly",
];

const ARCHITECTURE_NEGATIVES: Record<string, string> = {
    Illustrious: "worst quality, low quality, bad anatomy, bad hands, missing fingers, extra digits, blurry, watermark, signature, artist name, deformed",
    SDXL: "illustration, 3d, 2d, painting, cartoons, sketch, bad anatomy, bad hands, plastic skin, oversaturated, deformed, bad teeth, watermark, text",
    Pony: "score_4, score_5, score_6, source_furry, source_pony, ugly, bad anatomy, bad hands, blurry, missing digits, extra arms",
    Flux: "worst quality, low quality, blurry, distorted, grainy, text, watermark, bad hands",
};

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

    // Active mode in positive prompt: text editor vs interactive tokenizer
    const [viewMode, setViewMode] = useState<"editor" | "tokenizer">("editor");

    // Interactive Tokenizer State
    const [selectedTokenIndex, setSelectedTokenIndex] = useState<number | null>(null);

    // Feedback
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // Sidebar Tab: "presets" | "catalog" | "modular"
    const [sidebarTab, setSidebarTab] = useState<"presets" | "catalog" | "modular">("presets");

    // Presets Filtering
    const [presetCategoryFilter, setPresetCategoryFilter] = useState<string>("all");
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
        fetchCatalog();
        fetchModularPresets();
    }, []);

    useEffect(() => {
        fetchPresets();
    }, [presetCategoryFilter, presetBaseModelFilter, presetSearch]);

    // Active Checkpoint Object
    const activeCheckpoint = useMemo(() => {
        return models.find((m) => String(m.id) === selectedCheckpointId) || null;
    }, [models, selectedCheckpointId]);

    // Compatible LoRAs matched to active checkpoint base_model
    const compatibleLoras = useMemo(() => {
        const loras = models.filter((m) => m.type === "lora");
        if (!activeCheckpoint) return loras;

        const targetBase = (activeCheckpoint.base_model || "").toLowerCase();
        if (!targetBase) return loras;

        return loras.filter((lora) => {
            const loraBase = (lora.base_model || "").toLowerCase();
            return loraBase.includes(targetBase) || targetBase.includes(loraBase) || loraBase === "" || loraBase === "all";
        });
    }, [models, activeCheckpoint]);

    // Helper: Trigger temporary copied state
    const triggerCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
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
        let formatted = clean;

        const rounded = Math.round(newWeight * 100) / 100;
        if (rounded === 1.0) {
            formatted = clean;
        } else {
            formatted = `(${clean}:${rounded.toFixed(2)})`;
        }

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

    // Apply architecture negative
    const handleApplyArchitectureNegative = (arch: string) => {
        const neg = ARCHITECTURE_NEGATIVES[arch] || ARCHITECTURE_NEGATIVES.Illustrious;
        setNegativePrompt(neg);
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

    // Apply preset fully (Positive & Negative together)
    const handleApplyPreset = (p: PromptPreset) => {
        setPositivePrompt(p.positive_prompt);
        if (p.negative_prompt) {
            setNegativePrompt(p.negative_prompt);
        }
    };

    // Append preset positive
    const handleAppendPositive = (text: string) => {
        const updated = positivePrompt.trim()
            ? `${positivePrompt.trim()}, ${text}`
            : text;
        setPositivePrompt(cleanPromptText(updated));
    };

    // Insert LoRA with compatibility weight
    const handleInsertLoRA = (m: Model) => {
        const slug = m.slug || m.name.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
        const loraSyntax = `<lora:${slug}:${loraInsertWeight.toFixed(2)}>`;

        const triggers = (m.trigger_words || []).map((tw) => tw.trigger_word.trim()).filter(Boolean);
        const addition = triggers.length > 0 ? `${loraSyntax}, ${triggers.join(", ")}` : loraSyntax;

        handleAppendPositive(addition);
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
        } catch (err: any) {
            console.error("Failed to upload sample image:", err);
            alert("Upload failed: " + (err?.message || "Unknown error"));
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
        setNewPresetStyle("character");
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
        setNewPresetStyle(preset.category || "character");
        setNewPresetSubcategory(preset.subcategory || "");
        setNewPresetTriggerWords(preset.trigger_words || "");
        setNewPresetBaseModelTarget(preset.base_model_target || "Illustrious");
        setNewPresetPositive(preset.positive_prompt || "");
        setNewPresetNegative(preset.negative_prompt || "");
        setNewPresetSampleList(parseSampleImages(preset.sample_images));
        setNewPresetDescription(preset.description || "");
        setIsSavePresetModalOpen(true);
    };

    // Save Preset to Database (Create or Update Full Preset)
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

    // Save Modular Building Block / Outfit Token to Database
    const handleSaveModularPreset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modularToken.trim()) return;

        const effectiveSubcategory = modularCategory === "Custom" 
            ? (modularCustomSubcategory.trim() || "Custom") 
            : modularCategory;
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
        } catch (err) {
            console.error("Failed to save modular preset:", err);
            alert("Gagal menyimpan modular token: " + err);
        }
    };

    // Delete custom or system preset
    const handleDeletePreset = async (id: number, title?: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const name = title || "preset ini";
        if (!window.confirm(`Hapus preset "${name}" dari database?`)) return;
        try {
            await deletePromptPresetApi(id);
            setPresets((prev) => prev.filter((p) => p.id !== id));
            setModularPresets((prev) => prev.filter((p) => p.id !== id));
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
        } catch (err) {
            console.error("Failed to delete modular preset:", err);
            alert("Gagal menghapus token: " + err);
        }
    };

    // Parse sample image URLs safely from JSON string
    const parseSampleImages = (sampleStr?: string): string[] => {
        if (!sampleStr) return [];
        try {
            const parsed = JSON.parse(sampleStr);
            if (Array.isArray(parsed)) return parsed;
        } catch {
            if (sampleStr.startsWith("http") || sampleStr.startsWith("/")) {
                return [sampleStr];
            }
        }
        return [];
    };

    return (
        <div className="prompt-lab-container">
            {/* Header */}
            <div className="prompt-lab-header">
                <div className="prompt-lab-title-row">
                    <h1 className="prompt-lab-title">
                        <div className="prompt-lab-title-icon">
                            <Icons.Sliders />
                        </div>
                        Prompt Matrix & Studio Lab
                    </h1>

                    <div className="prompt-lab-header-actions">
                        <button
                            type="button"
                            className="prompt-btn-sm"
                            onClick={handleOpenCreatePreset}
                            title="Save current prompt concoction as preset"
                        >
                            <Icons.Bookmark />
                            <span>Save Preset</span>
                        </button>

                        <Link
                            to={`/gallery?q=${encodeURIComponent(positivePrompt.split(",")[0]?.trim() || "")}`}
                            className="prompt-btn-sm"
                            title="Find matching artworks in local gallery"
                        >
                            <Icons.Search />
                            <span>Search in Gallery</span>
                        </Link>
                    </div>
                </div>

                <p className="prompt-lab-subtitle">
                    Full prompt preset library, anime character building blocks, wildcard combinatorial matrix, and LoRA recommendations matched to your checkpoint.
                </p>
            </div>

            {/* Studio Workspace */}
            <div className="prompt-lab-workspace">
                {/* Left Column: Unified Positive & Negative Prompt Canvas */}
                <div className="prompt-canvas-col">
                    {/* Active Checkpoint Banner & Architecture Bar */}
                    <div style={{ background: "#16181D", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <Icons.Layers />
                            <span style={{ fontSize: "12px", color: "#9CA3AF" }}>Target Checkpoint:</span>
                            <select
                                style={{ background: "#0E1013", border: "1px solid rgba(255,255,255,0.12)", color: "#FFFFFF", fontSize: "12px", padding: "4px 8px", borderRadius: "5px", outline: "none" }}
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
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontSize: "11px", color: "#6C727D" }}>Architecture:</span>
                                <span className={`preset-base-badge ${(activeCheckpoint.base_model || "sdxl").toLowerCase()}`}>
                                    {activeCheckpoint.base_model || "SDXL"}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Positive Prompt Card */}
                    <div className="prompt-canvas-card">
                        <div className="prompt-canvas-header">
                            <div className="prompt-canvas-title-wrap">
                                <span className="prompt-badge positive">Positive Prompt</span>
                                <span className="prompt-token-pill">~{posTokenCount} tokens</span>
                            </div>

                            <div className="prompt-canvas-actions">
                                <div style={{ display: "inline-flex", background: "#101215", padding: "2px", borderRadius: "5px", border: "1px solid rgba(255,255,255,0.08)", marginRight: "6px" }}>
                                    <button
                                        type="button"
                                        style={{
                                            background: viewMode === "editor" ? "#22262E" : "transparent",
                                            color: viewMode === "editor" ? "#FFF" : "#71717A",
                                            border: "none",
                                            padding: "3px 8px",
                                            borderRadius: "3px",
                                            fontSize: "11px",
                                            cursor: "pointer",
                                        }}
                                        onClick={() => setViewMode("editor")}
                                    >
                                        Text Editor
                                    </button>
                                    <button
                                        type="button"
                                        style={{
                                            background: viewMode === "tokenizer" ? "#22262E" : "transparent",
                                            color: viewMode === "tokenizer" ? "#FFF" : "#71717A",
                                            border: "none",
                                            padding: "3px 8px",
                                            borderRadius: "3px",
                                            fontSize: "11px",
                                            cursor: "pointer",
                                        }}
                                        onClick={() => setViewMode("tokenizer")}
                                    >
                                        Token Adjuster
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    className="prompt-btn-sm"
                                    onClick={() => setPositivePrompt(cleanPromptText(positivePrompt))}
                                    title="Format commas and extra spaces"
                                >
                                    <Icons.Clean />
                                    <span>Clean</span>
                                </button>

                                <button
                                    type="button"
                                    className="prompt-btn-sm"
                                    onClick={() => triggerCopy(positivePrompt, "copy-positive")}
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

                        <div className="prompt-canvas-body">
                            {viewMode === "editor" ? (
                                <>
                                    <textarea
                                        ref={textareaRef}
                                        className="prompt-textarea"
                                        rows={5}
                                        value={positivePrompt}
                                        onChange={(e) => setPositivePrompt(e.target.value)}
                                        onKeyDown={handleTextareaKeyDown}
                                        placeholder="e.g. masterpiece, best quality, 1girl, {cyberpunk | gothic} outfit..."
                                    />
                                    <div className="prompt-keyboard-hint">
                                        <span>Tip: Select any word and press <kbd>Ctrl + ↑</kbd> or <kbd>Ctrl + ↓</kbd> to adjust weight.</span>
                                        <span>Syntax: <code>(word:1.2)</code> or <code>{"{option A | option B}"}</code></span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="prompt-tokenizer-container">
                                        {tokens.length === 0 ? (
                                            <span style={{ color: "#71717A", fontSize: "12px", fontStyle: "italic" }}>
                                                Prompt is empty. Type tokens or switch to Text Editor.
                                            </span>
                                        ) : (
                                            tokens.map((tokenStr, idx) => {
                                                const { clean, weight, isWeighted } = parseTokenWeight(tokenStr);
                                                const isSelected = selectedTokenIndex === idx;

                                                return (
                                                    <span
                                                        key={`${idx}-${clean}`}
                                                        className={`prompt-token-chip ${isSelected ? "active" : ""} ${isWeighted ? "weighted" : ""}`}
                                                        onClick={() => setSelectedTokenIndex(isSelected ? null : idx)}
                                                    >
                                                        <span>{clean}</span>
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

                                    {/* Inline Weight Adjuster Bar */}
                                    {selectedTokenIndex !== null && tokens[selectedTokenIndex] && (
                                        <div className="token-weight-popover">
                                            {(() => {
                                                const activeToken = tokens[selectedTokenIndex];
                                                const { clean, weight } = parseTokenWeight(activeToken);

                                                return (
                                                    <>
                                                        <div className="token-popover-header">
                                                            <span>Token: <code>{clean}</code></span>
                                                            <span style={{ color: "#818CF8", fontFamily: "ui-monospace, monospace" }}>
                                                                Current Weight: {weight.toFixed(2)}x
                                                            </span>
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
                                                            <span style={{ fontSize: "12px", fontFamily: "ui-monospace, monospace", color: "#C7D2FE", minWidth: "40px" }}>
                                                                {weight.toFixed(2)}
                                                            </span>
                                                        </div>

                                                        <div className="token-popover-steppers">
                                                            <button
                                                                type="button"
                                                                className="token-stepper-btn"
                                                                onClick={() => updateTokenWeight(selectedTokenIndex, weight - 0.1)}
                                                            >
                                                                -0.10
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="token-stepper-btn"
                                                                onClick={() => updateTokenWeight(selectedTokenIndex, weight + 0.1)}
                                                            >
                                                                +0.10
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="token-stepper-btn"
                                                                onClick={() => updateTokenWeight(selectedTokenIndex, 1.1)}
                                                            >
                                                                ( + ) 1.1x
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="token-stepper-btn"
                                                                onClick={() => updateTokenWeight(selectedTokenIndex, 0.9)}
                                                            >
                                                                [ - ] 0.9x
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
                                                                className="token-stepper-btn"
                                                                style={{ color: "#F87171", borderColor: "rgba(239, 68, 68, 0.3)" }}
                                                                onClick={() => removeToken(selectedTokenIndex)}
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Negative Prompt Card (Unified directly below positive) */}
                    <div className="prompt-canvas-card">
                        <div className="prompt-canvas-header">
                            <div className="prompt-canvas-title-wrap">
                                <span className="prompt-badge negative">Negative Prompt</span>
                                <span className="prompt-token-pill">~{negTokenCount} tokens</span>
                            </div>

                            <div className="prompt-canvas-actions">
                                <div style={{ display: "flex", gap: "4px" }}>
                                    <button
                                        type="button"
                                        className="prompt-btn-sm"
                                        onClick={() => handleApplyArchitectureNegative("Illustrious")}
                                        title="Load recommended Illustrious anime negative"
                                    >
                                        Anime Neg
                                    </button>
                                    <button
                                        type="button"
                                        className="prompt-btn-sm"
                                        onClick={() => handleApplyArchitectureNegative("SDXL")}
                                        title="Load recommended SDXL photorealistic negative"
                                    >
                                        Real Neg
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    className="prompt-btn-sm"
                                    onClick={() => setNegativePrompt(cleanPromptText(negativePrompt))}
                                    title="Clean commas and spaces"
                                >
                                    <Icons.Clean />
                                    <span>Clean</span>
                                </button>

                                <button
                                    type="button"
                                    className="prompt-btn-sm"
                                    onClick={() => triggerCopy(negativePrompt, "copy-negative")}
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
                                rows={3}
                                value={negativePrompt}
                                onChange={(e) => setNegativePrompt(e.target.value)}
                                placeholder="e.g. worst quality, low quality, bad anatomy, blurry..."
                            />

                            {/* Quick Negative Tag Chips */}
                            <div className="quick-neg-tags">
                                {STANDARD_NEGATIVE_TAGS.map((tag) => {
                                    const isActive = negativePrompt.toLowerCase().includes(tag.toLowerCase());
                                    return (
                                        <button
                                            key={tag}
                                            type="button"
                                            className={`quick-neg-tag-chip ${isActive ? "active" : ""}`}
                                            onClick={() => toggleNegativeTag(tag)}
                                        >
                                            {isActive ? "✕ " : "+ "}
                                            {tag}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Combinatorial Matrix Card */}
                    {matrixVariations.length > 0 && (
                        <div className="prompt-matrix-card">
                            <div className="prompt-matrix-header">
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <Icons.Matrix />
                                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#FFFFFF" }}>
                                        Wildcard Matrix Combinator
                                    </span>
                                    <span className="matrix-count-badge">
                                        {matrixVariations.length} Combinations
                                    </span>
                                </div>

                                <div style={{ display: "flex", gap: "6px" }}>
                                    <button
                                        type="button"
                                        className="prompt-btn-sm"
                                        onClick={() => {
                                            if (matrixVariations.length === 0) return;
                                            const randomIndex = Math.floor(Math.random() * matrixVariations.length);
                                            triggerCopy(matrixVariations[randomIndex], "random-rolled");
                                        }}
                                        title="Pick and copy 1 random permutation"
                                    >
                                        <Icons.Dice />
                                        <span>{copiedKey === "random-rolled" ? "Rolled & Copied!" : "Roll Random"}</span>
                                    </button>

                                    <button
                                        type="button"
                                        className="prompt-btn-sm"
                                        onClick={() => triggerCopy(matrixVariations.join("\n"), "copy-all-variations")}
                                        title="Copy all combinations separated by newlines"
                                    >
                                        <Icons.Copy />
                                        <span>{copiedKey === "copy-all-variations" ? "All Copied!" : "Copy All Permutations"}</span>
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
                                                style={{ fontSize: "10px", padding: "2px 7px" }}
                                                onClick={() => triggerCopy(variant, `matrix-copy-${idx}`)}
                                                title="Copy prompt"
                                            >
                                                {copiedKey === `matrix-copy-${idx}` ? <Icons.Check /> : <Icons.Copy />}
                                                <span>{copiedKey === `matrix-copy-${idx}` ? "Copied" : "Copy"}</span>
                                            </button>
                                            <button
                                                type="button"
                                                className="prompt-btn-sm"
                                                style={{ fontSize: "10px", padding: "2px 7px" }}
                                                onClick={() => setPositivePrompt(variant)}
                                                title="Load this variation into positive prompt"
                                            >
                                                Use
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Presets Library, Compatible LoRAs & Building Blocks */}
                <div className="prompt-sidebar-col">
                    {/* Navigation Tabs */}
                    <div className="prompt-sidebar-nav">
                        <button
                            type="button"
                            className={`sidebar-tab-btn ${sidebarTab === "presets" ? "active" : ""}`}
                            onClick={() => setSidebarTab("presets")}
                        >
                            <Icons.Bookmark />
                            <span>Presets ({presets.length})</span>
                        </button>
                        <button
                            type="button"
                            className={`sidebar-tab-btn ${sidebarTab === "catalog" ? "active" : ""}`}
                            onClick={() => setSidebarTab("catalog")}
                        >
                            <Icons.Layers />
                            <span>Compatible LoRAs</span>
                        </button>
                        <button
                            type="button"
                            className={`sidebar-tab-btn ${sidebarTab === "modular" ? "active" : ""}`}
                            onClick={() => setSidebarTab("modular")}
                        >
                            <Icons.Tag />
                            <span>Building Blocks</span>
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="prompt-sidebar-content">
                        {/* TAB 1: PRESET BROWSER */}
                        {sidebarTab === "presets" && (
                            <>
                                {/* Category Filter Pills */}
                                <div className="prompt-category-nav">
                                    {[
                                        { id: "all", label: "All" },
                                        { id: "character", label: "Characters" },
                                        { id: "photorealistic", label: "Realism" },
                                        { id: "style", label: "Styles" },
                                        { id: "modular", label: "Snippets" },
                                    ].map((cat) => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            className={`prompt-cat-chip ${presetCategoryFilter === cat.id ? "active" : ""}`}
                                            onClick={() => setPresetCategoryFilter(cat.id)}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Architecture Filter & Search */}
                                <div className="catalog-search-row">
                                    <input
                                        type="text"
                                        className="catalog-search-input"
                                        placeholder="Cari judul, karakter, trigger..."
                                        value={presetSearch}
                                        onChange={(e) => setPresetSearch(e.target.value)}
                                    />
                                    <select
                                        style={{ background: "#0E1013", border: "1px solid rgba(255,255,255,0.08)", color: "#C7D2FE", fontSize: "11px", borderRadius: "6px", padding: "0 6px" }}
                                        value={presetBaseModelFilter}
                                        onChange={(e) => setPresetBaseModelFilter(e.target.value)}
                                    >
                                        <option value="all">All Models</option>
                                        <option value="Illustrious">Illustrious</option>
                                        <option value="SDXL">SDXL</option>
                                        <option value="Pony">Pony</option>
                                    </select>
                                    <button
                                        type="button"
                                        className="prompt-btn-primary"
                                        style={{ fontSize: "11px", padding: "4px 8px", whiteSpace: "nowrap" }}
                                        onClick={handleOpenCreatePreset}
                                        title="Buat preset baru dari canvas saat ini"
                                    >
                                        <Icons.Plus />
                                        <span>New</span>
                                    </button>
                                </div>

                                {presetsLoading ? (
                                    <div style={{ textAlign: "center", color: "#71717A", fontSize: "12px", padding: "20px" }}>
                                        Loading preset catalog...
                                    </div>
                                ) : presets.length === 0 ? (
                                    <div style={{ textAlign: "center", color: "#71717A", fontSize: "12px", padding: "20px" }}>
                                        No presets found. Try clearing filters or saving a new one.
                                    </div>
                                ) : (
                                    presets.map((preset) => {
                                        const sampleImgs = parseSampleImages(preset.sample_images);

                                        return (
                                            <div key={preset.id} className="preset-item-card">
                                                <div className="preset-item-title">
                                                    <div className="preset-title-left">
                                                        <span className="preset-title-text" title={preset.title}>
                                                            {preset.title}
                                                        </span>
                                                        {preset.subcategory && (
                                                            <span className="preset-sub-badge">
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

                                                {/* Up to 5 small sample thumbnails */}
                                                {sampleImgs.length > 0 && (
                                                    <div className="preset-sample-strip">
                                                        {sampleImgs.slice(0, 5).map((imgUrl, sIdx) => (
                                                            <div
                                                                key={sIdx}
                                                                className="preset-sample-thumb"
                                                                onClick={() => setLightboxImage({ url: resolveImageUrl(imgUrl), title: preset.title })}
                                                                title="Klik untuk zoom preview"
                                                            >
                                                                <img src={resolveImageUrl(imgUrl)} alt={`Sample ${sIdx + 1}`} loading="lazy" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Trigger words if present */}
                                                {preset.trigger_words && (
                                                    <div style={{ fontSize: "11px", color: "#818CF8", fontFamily: "monospace", display: "flex", gap: "4px", alignItems: "baseline" }}>
                                                        <span style={{ color: "#64748B", fontSize: "10px" }}>Triggers:</span>
                                                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                                                        className="prompt-btn-primary"
                                                        style={{ fontSize: "11px", padding: "4px 10px" }}
                                                        onClick={() => handleApplyPreset(preset)}
                                                        title="Terapkan positive & negative prompt ke canvas"
                                                    >
                                                        <Icons.Sparkle />
                                                        <span>Apply Full Preset</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="prompt-btn-sm"
                                                        style={{ fontSize: "11px", padding: "4px 10px" }}
                                                        onClick={() => handleAppendPositive(preset.positive_prompt)}
                                                        title="Sisipkan prompt ke positive canvas"
                                                    >
                                                        <Icons.Plus />
                                                        <span>Append</span>
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
                                        <span>Active Checkpoint Architecture</span>
                                        <span className="lora-compat-badge match">
                                            {activeCheckpoint?.base_model || "SDXL"} Compatible
                                        </span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: "11px", color: "#8E95A2", lineHeight: "1.4" }}>
                                        Filtering catalog LoRAs matching <strong>{activeCheckpoint?.name || "your active model"}</strong> to prevent cross-architecture baking bugs.
                                    </p>
                                </div>

                                {/* Default Weight Stepper */}
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#16181D", padding: "6px 10px", borderRadius: "6px", fontSize: "11px" }}>
                                    <span style={{ color: "#9CA3AF" }}>LoRA Insert Weight:</span>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        <input
                                            type="range"
                                            min="0.3"
                                            max="1.5"
                                            step="0.05"
                                            value={loraInsertWeight}
                                            onChange={(e) => setLoraInsertWeight(parseFloat(e.target.value))}
                                            style={{ width: "80px", accentColor: "#818CF8" }}
                                        />
                                        <strong style={{ color: "#C7D2FE", fontFamily: "ui-monospace, monospace" }}>
                                            {loraInsertWeight.toFixed(2)}
                                        </strong>
                                    </div>
                                </div>

                                {catalogLoading ? (
                                    <div style={{ textAlign: "center", color: "#71717A", fontSize: "12px", padding: "20px" }}>
                                        Loading catalog LoRAs...
                                    </div>
                                ) : compatibleLoras.length === 0 ? (
                                    <div style={{ textAlign: "center", color: "#71717A", fontSize: "12px", padding: "20px" }}>
                                        No compatible LoRAs found for architecture {activeCheckpoint?.base_model || "SDXL"}.
                                    </div>
                                ) : (
                                    compatibleLoras.map((lora) => {
                                        const triggers = lora.trigger_words || [];

                                        return (
                                            <div key={lora.id} className="catalog-item-card">
                                                <div className="catalog-item-top">
                                                    <span className="catalog-item-name" title={lora.name}>
                                                        {lora.name}
                                                    </span>
                                                    <span className="catalog-item-badge lora">
                                                        {lora.base_model || "LoRA"}
                                                    </span>
                                                </div>

                                                <div style={{ display: "flex", gap: "6px", marginTop: "2px" }}>
                                                    <button
                                                        type="button"
                                                        className="prompt-btn-sm"
                                                        style={{ fontSize: "11px", padding: "2px 8px", color: "#FACC15", borderColor: "rgba(234, 179, 8, 0.3)" }}
                                                        onClick={() => handleInsertLoRA(lora)}
                                                        title={`Insert <lora:${lora.slug}:${loraInsertWeight.toFixed(2)}>`}
                                                    >
                                                        <Icons.Plus />
                                                        <span>Insert &lt;lora:{loraInsertWeight.toFixed(2)}&gt;</span>
                                                    </button>
                                                </div>

                                                {triggers.length > 0 && (
                                                    <div className="catalog-triggers-box">
                                                        {triggers.map((tw) => (
                                                            <span
                                                                key={tw.id}
                                                                className="catalog-trigger-pill"
                                                                onClick={() => handleAppendPositive(tw.trigger_word)}
                                                                title="Click to insert trigger"
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
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", background: "#14171C", padding: "8px 12px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.06)" }}>
                                    <div style={{ fontSize: "11px", color: "#9CA3AF", lineHeight: "1.3" }}>
                                        Click any token to append. Custom outfit/tokens saved to database appear here.
                                    </div>
                                    <button
                                        type="button"
                                        className="modular-add-btn"
                                        onClick={() => {
                                            setModularCategory("Outfit");
                                            setIsAddModularModalOpen(true);
                                        }}
                                        title="Add new outfit or custom building block to database"
                                    >
                                        <Icons.Plus />
                                        <span>Add Token</span>
                                    </button>
                                </div>

                                {/* Fashion & Clothing */}
                                <div style={{ background: "#16181D", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
                                    <div className="modular-section-header">
                                        <span>Outfits & Clothing</span>
                                        <button
                                            type="button"
                                            className="modular-add-btn"
                                            style={{ fontSize: "10px", padding: "2px 6px" }}
                                            onClick={() => {
                                                setModularCategory("Outfit");
                                                setIsAddModularModalOpen(true);
                                            }}
                                        >
                                            <Icons.Plus />
                                            <span>Add Outfit</span>
                                        </button>
                                    </div>
                                    <div className="modular-pill-group">
                                        {/* Built-in defaults */}
                                        {["school uniform", "black blazer", "gothic lolita dress", "cyberpunk techwear jacket", "oversized hoodie", "flowing kimono", "plugsuit", "maid outfit", "plate armor", "off-shoulder sweater", "sundress", "bodysuit"].map((tag) => (
                                            <span
                                                key={tag}
                                                className="modular-token-pill"
                                                onClick={() => handleAppendPositive(tag)}
                                                title={`Insert: ${tag}`}
                                            >
                                                +{tag}
                                            </span>
                                        ))}

                                        {/* Dynamic DB Custom Outfits */}
                                        {modularPresets
                                            .filter((p) => ["outfit", "clothing", "fashion", "wear"].includes((p.subcategory || "").toLowerCase()) || p.category === "outfit")
                                            .map((p) => {
                                                const samples = parseSampleImages(p.sample_images);
                                                return (
                                                    <span
                                                        key={p.id}
                                                        className="modular-token-pill custom-token"
                                                        onClick={() => handleAppendPositive(p.positive_prompt)}
                                                        title={`Custom DB Token: ${p.positive_prompt}`}
                                                    >
                                                        +{p.title || p.positive_prompt}
                                                        {samples.length > 0 && (
                                                            <span
                                                                className="modular-pill-preview-btn"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setLightboxImage({ url: resolveImageUrl(samples[0]), title: p.title });
                                                                }}
                                                                title="View Sample Preview"
                                                            >
                                                                📷
                                                            </span>
                                                        )}
                                                        <span
                                                            className="modular-pill-del"
                                                            onClick={(e) => handleDeleteModularPreset(p.id, e)}
                                                            title="Delete from database"
                                                        >
                                                            ✕
                                                        </span>
                                                    </span>
                                                );
                                            })}
                                    </div>
                                </div>

                                {/* Subjects & Characters */}
                                <div style={{ background: "#16181D", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
                                    <div className="modular-section-header">
                                        <span>Characters & Subjects</span>
                                        <button
                                            type="button"
                                            className="modular-add-btn"
                                            style={{ fontSize: "10px", padding: "2px 6px" }}
                                            onClick={() => {
                                                setModularCategory("Character");
                                                setIsAddModularModalOpen(true);
                                            }}
                                        >
                                            <Icons.Plus />
                                            <span>Add Subject</span>
                                        </button>
                                    </div>
                                    <div className="modular-pill-group">
                                        {["1girl", "1boy", "solo", "2girls", "bishoujo", "chibi", "mecha girl", "cyborg", "samurai warrior", "knight in armor"].map((tag) => (
                                            <span
                                                key={tag}
                                                className="modular-token-pill"
                                                onClick={() => handleAppendPositive(tag)}
                                            >
                                                +{tag}
                                            </span>
                                        ))}
                                        {modularPresets
                                            .filter((p) => ["character", "subject"].includes((p.subcategory || "").toLowerCase()) || p.category === "character")
                                            .map((p) => {
                                                const samples = parseSampleImages(p.sample_images);
                                                return (
                                                    <span
                                                        key={p.id}
                                                        className="modular-token-pill custom-token"
                                                        onClick={() => handleAppendPositive(p.positive_prompt)}
                                                        title={`Custom Character: ${p.positive_prompt}`}
                                                    >
                                                        +{p.title || p.positive_prompt}
                                                        {samples.length > 0 && (
                                                            <span
                                                                className="modular-pill-preview-btn"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setLightboxImage({ url: resolveImageUrl(samples[0]), title: p.title });
                                                                }}
                                                            >
                                                                📷
                                                            </span>
                                                        )}
                                                        <span
                                                            className="modular-pill-del"
                                                            onClick={(e) => handleDeleteModularPreset(p.id, e)}
                                                            title="Delete from database"
                                                        >
                                                            ✕
                                                        </span>
                                                    </span>
                                                );
                                            })}
                                    </div>
                                </div>

                                {/* Scenery & Backgrounds */}
                                <div style={{ background: "#16181D", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
                                    <div className="modular-section-header">
                                        <span>Scenery & Backgrounds</span>
                                        <button
                                            type="button"
                                            className="modular-add-btn"
                                            style={{ fontSize: "10px", padding: "2px 6px" }}
                                            onClick={() => {
                                                setModularCategory("Background");
                                                setIsAddModularModalOpen(true);
                                            }}
                                        >
                                            <Icons.Plus />
                                            <span>Add Background</span>
                                        </button>
                                    </div>
                                    <div className="modular-pill-group">
                                        {["neon shibuya street at night", "ancient overgrown shrine", "cyberpunk city skyline", "cozy coffee shop interior", "blossoming sakura park", "ruined gothic cathedral", "floating sky island"].map((tag) => (
                                            <span
                                                key={tag}
                                                className="modular-token-pill"
                                                onClick={() => handleAppendPositive(tag)}
                                            >
                                                +{tag}
                                            </span>
                                        ))}
                                        {modularPresets
                                            .filter((p) => ["background", "scenery", "environment"].includes((p.subcategory || "").toLowerCase()) || p.category === "background")
                                            .map((p) => (
                                                <span
                                                    key={p.id}
                                                    className="modular-token-pill custom-token"
                                                    onClick={() => handleAppendPositive(p.positive_prompt)}
                                                    title={`Custom Scenery: ${p.positive_prompt}`}
                                                >
                                                    +{p.title || p.positive_prompt}
                                                    <span
                                                        className="modular-pill-del"
                                                        onClick={(e) => handleDeleteModularPreset(p.id, e)}
                                                        title="Delete from database"
                                                    >
                                                        ✕
                                                    </span>
                                                </span>
                                            ))}
                                    </div>
                                </div>

                                {/* Lighting & Atmosphere */}
                                <div style={{ background: "#16181D", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
                                    <div className="modular-section-header">
                                        <span>Lighting & Atmosphere</span>
                                        <button
                                            type="button"
                                            className="modular-add-btn"
                                            style={{ fontSize: "10px", padding: "2px 6px" }}
                                            onClick={() => {
                                                setModularCategory("Lighting");
                                                setIsAddModularModalOpen(true);
                                            }}
                                        >
                                            <Icons.Plus />
                                            <span>Add Lighting</span>
                                        </button>
                                    </div>
                                    <div className="modular-pill-group">
                                        {["volumetric god rays", "neon rim lighting", "golden hour backlight", "soft diffused window light", "dynamic low angle", "cowboy shot", "close-up portrait", "depth of field"].map((tag) => (
                                            <span
                                                key={tag}
                                                className="modular-token-pill"
                                                onClick={() => handleAppendPositive(tag)}
                                            >
                                                +{tag}
                                            </span>
                                        ))}
                                        {modularPresets
                                            .filter((p) => ["lighting", "light", "atmosphere", "camera", "angle", "composition"].includes((p.subcategory || "").toLowerCase()))
                                            .map((p) => (
                                                <span
                                                    key={p.id}
                                                    className="modular-token-pill custom-token"
                                                    onClick={() => handleAppendPositive(p.positive_prompt)}
                                                    title={`Custom: ${p.positive_prompt}`}
                                                >
                                                    +{p.title || p.positive_prompt}
                                                    <span
                                                        className="modular-pill-del"
                                                        onClick={(e) => handleDeleteModularPreset(p.id, e)}
                                                        title="Delete from database"
                                                    >
                                                        ✕
                                                    </span>
                                                </span>
                                            ))}
                                    </div>
                                </div>

                                {/* Custom User Categories */}
                                {modularPresets.filter((p) => {
                                    const sub = (p.subcategory || "").toLowerCase();
                                    return !["outfit", "clothing", "fashion", "wear", "character", "subject", "background", "scenery", "environment", "lighting", "light", "atmosphere", "camera", "angle", "composition", "quality"].includes(sub);
                                }).length > 0 && (
                                    <div style={{ background: "#16181D", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
                                        <div className="modular-section-header">
                                            <span>Custom Tokens</span>
                                        </div>
                                        <div className="modular-pill-group">
                                            {modularPresets
                                                .filter((p) => {
                                                    const sub = (p.subcategory || "").toLowerCase();
                                                    return !["outfit", "clothing", "fashion", "wear", "character", "subject", "background", "scenery", "environment", "lighting", "light", "atmosphere", "camera", "angle", "composition", "quality"].includes(sub);
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
                                                            title="Delete from database"
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
            </div>

            {/* Save Preset Modal */}
            {isSavePresetModalOpen && (
                <div className="prompt-modal-backdrop" onClick={() => { setIsSavePresetModalOpen(false); setEditingPreset(null); }}>
                    <div className="prompt-modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="prompt-modal-header">
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <h3 className="prompt-modal-title">
                                    {editingPreset ? "Edit Preset" : "Save Preset"}
                                </h3>
                                {editingPreset && (
                                    <span style={{ fontSize: "10px", background: "rgba(129, 140, 248, 0.2)", color: "#A5B4FC", padding: "1px 6px", borderRadius: "4px", border: "1px solid rgba(129, 140, 248, 0.4)" }}>
                                        ID #{editingPreset.id}
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                style={{ background: "transparent", border: "none", color: "#71717A", cursor: "pointer", fontSize: "14px" }}
                                onClick={() => {
                                    setIsSavePresetModalOpen(false);
                                    setEditingPreset(null);
                                }}
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleSavePreset}>
                            <div className="prompt-modal-body">
                                {/* Style Selection */}
                                <div>
                                    <label style={{ display: "block", fontSize: "11px", color: "#9CA3AF", marginBottom: "6px" }}>
                                        Image Style / Category *
                                    </label>
                                    <div className="prompt-style-toggle-group">
                                        <button
                                            type="button"
                                            className={`prompt-style-toggle-btn ${newPresetStyle === "character" ? "active" : ""}`}
                                            onClick={() => setNewPresetStyle("character")}
                                        >
                                            <span style={{ fontSize: "16px" }}>🎨</span>
                                            <span>Anime / Manga</span>
                                        </button>
                                        <button
                                            type="button"
                                            className={`prompt-style-toggle-btn ${newPresetStyle === "photorealistic" ? "active" : ""}`}
                                            onClick={() => setNewPresetStyle("photorealistic")}
                                        >
                                            <span style={{ fontSize: "16px" }}>📷</span>
                                            <span>Photorealistic</span>
                                        </button>
                                        <button
                                            type="button"
                                            className={`prompt-style-toggle-btn ${newPresetStyle === "style" ? "active" : ""}`}
                                            onClick={() => setNewPresetStyle("style")}
                                        >
                                            <span style={{ fontSize: "16px" }}>🖌️</span>
                                            <span>Art Style</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Title & Character Name */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: "11px", color: "#9CA3AF", marginBottom: "4px" }}>
                                            Character Name (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            className="catalog-search-input"
                                            placeholder="e.g. Rio Tsukatsuki, Frieren"
                                            value={newPresetCharacterName}
                                            onChange={(e) => setNewPresetCharacterName(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: "block", fontSize: "11px", color: "#9CA3AF", marginBottom: "4px" }}>
                                            Preset / Scene Title *
                                        </label>
                                        <input
                                            type="text"
                                            className="catalog-search-input"
                                            placeholder="e.g. Tactical Office Meeting"
                                            value={newPresetTitle}
                                            onChange={(e) => setNewPresetTitle(e.target.value)}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                {/* Trigger Words & Subcategory */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: "11px", color: "#9CA3AF", marginBottom: "4px" }}>
                                            Trigger Words (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            className="catalog-search-input"
                                            placeholder="e.g. rio tsukatsuki, halo, red eyes"
                                            value={newPresetTriggerWords}
                                            onChange={(e) => setNewPresetTriggerWords(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: "block", fontSize: "11px", color: "#9CA3AF", marginBottom: "4px" }}>
                                            Subcategory / Franchise (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            className="catalog-search-input"
                                            placeholder="e.g. Blue Archive, Cyberpunk"
                                            value={newPresetSubcategory}
                                            onChange={(e) => setNewPresetSubcategory(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Target Checkpoint Architecture */}
                                <div>
                                    <label style={{ display: "block", fontSize: "11px", color: "#9CA3AF", marginBottom: "4px" }}>
                                        Target Checkpoint Architecture
                                    </label>
                                    <select
                                        style={{ width: "100%", background: "#0E1013", border: "1px solid rgba(255,255,255,0.08)", color: "#FFFFFF", fontSize: "12px", padding: "6px", borderRadius: "5px" }}
                                        value={newPresetBaseModelTarget}
                                        onChange={(e) => setNewPresetBaseModelTarget(e.target.value)}
                                    >
                                        <option value="Illustrious">Illustrious XL</option>
                                        <option value="SDXL">SDXL 1.0</option>
                                        <option value="Pony">Pony Diffusion V6</option>
                                        <option value="SD 1.5">SD 1.5</option>
                                        <option value="All">All / Universal</option>
                                    </select>
                                </div>

                                {/* Positive Prompt */}
                                <div>
                                    <label style={{ display: "block", fontSize: "11px", color: "#9CA3AF", marginBottom: "4px" }}>
                                        Positive Prompt *
                                    </label>
                                    <textarea
                                        className="prompt-textarea"
                                        style={{ minHeight: "75px", maxHeight: "140px", fontSize: "12px", resize: "vertical" }}
                                        placeholder="Masukkan prompt racikan positif..."
                                        value={newPresetPositive}
                                        onChange={(e) => setNewPresetPositive(e.target.value)}
                                        required
                                    />
                                </div>

                                {/* Negative Prompt */}
                                <div>
                                    <label style={{ display: "block", fontSize: "11px", color: "#9CA3AF", marginBottom: "4px" }}>
                                        Negative Prompt (Optional)
                                    </label>
                                    <textarea
                                        className="prompt-textarea"
                                        style={{ minHeight: "55px", maxHeight: "110px", fontSize: "12px", resize: "vertical" }}
                                        placeholder="Masukkan negative prompt..."
                                        value={newPresetNegative}
                                        onChange={(e) => setNewPresetNegative(e.target.value)}
                                    />
                                </div>

                                {/* Sample Images Manager (Upload Local / Pick from Gallery) */}
                                <div className="preset-sample-manager">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                        accept="image/png,image/jpeg,image/webp"
                                        style={{ display: "none" }}
                                    />
                                    <div className="preset-sample-actions-bar">
                                        <div style={{ fontSize: "11px", fontWeight: 600, color: "#C7D2FE" }}>
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
                                                <span>📁 {isUploadingSample ? "Mengunggah..." : "Upload dari Lokal"}</span>
                                            </button>
                                            <button
                                                type="button"
                                                className="preset-sample-gallery-btn"
                                                onClick={handleOpenGalleryPicker}
                                                disabled={newPresetSampleList.length >= 5}
                                                title="Pilih gambar yang sudah ada di database galeri"
                                            >
                                                <span>🖼️ Pilih dari Galeri</span>
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
                                                            style={{ cursor: "zoom-in" }}
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
                                                    style={{ cursor: "pointer" }}
                                                    title="Klik untuk memilih foto dari galeri"
                                                >
                                                    <span style={{ fontSize: "16px", color: "#64748B" }}>+</span>
                                                    <span>Slot #{slotIdx + 1}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div style={{ fontSize: "10px", color: "#64748B" }}>
                                        Maks 5 foto. Klik foto untuk preview zoom atau klik ✕ untuk menghapus.
                                    </div>
                                </div>

                                {/* Notes / Description */}
                                <div>
                                    <label style={{ display: "block", fontSize: "11px", color: "#9CA3AF", marginBottom: "4px" }}>
                                        Description & Sampling Notes (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        className="catalog-search-input"
                                        placeholder="e.g. Best at CFG 6.0, Steps 28, DPM++ 2M Karras, with Seminar LoRA 0.8"
                                        value={newPresetDescription}
                                        onChange={(e) => setNewPresetDescription(e.target.value)}
                                    />
                                </div>

                                {/* Summary preview */}
                                <div style={{ background: "#0E1013", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "6px", padding: "8px 12px", fontSize: "11px", color: "#9CA3AF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span>
                                        Target: <strong style={{ color: "#E2E8F0" }}>{newPresetBaseModelTarget || "Illustrious"}</strong>
                                    </span>
                                    <span>
                                        Kategori: <strong style={{ color: "#818CF8" }}>{newPresetStyle}</strong>
                                    </span>
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

            {/* Add Modular Building Block / Outfit Token Modal */}
            {isAddModularModalOpen && (
                <div className="prompt-modal-backdrop" onClick={() => setIsAddModularModalOpen(false)}>
                    <div className="prompt-modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="prompt-modal-header">
                            <h3 className="prompt-modal-title">Add Modular Building Block / Outfit Token</h3>
                            <button
                                type="button"
                                style={{ background: "transparent", border: "none", color: "#71717A", cursor: "pointer", fontSize: "14px" }}
                                onClick={() => setIsAddModularModalOpen(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleSaveModularPreset}>
                            <div className="prompt-modal-body">
                                <div>
                                    <label style={{ display: "block", fontSize: "11px", color: "#9CA3AF", marginBottom: "4px" }}>
                                        Category / Type
                                    </label>
                                    <select
                                        style={{ width: "100%", background: "#0E1013", border: "1px solid rgba(255,255,255,0.08)", color: "#FFFFFF", fontSize: "12px", padding: "6px", borderRadius: "5px" }}
                                        value={modularCategory}
                                        onChange={(e) => setModularCategory(e.target.value)}
                                    >
                                        <option value="Outfit">Outfit & Clothing</option>
                                        <option value="Character">Character & Subject</option>
                                        <option value="Background">Scenery & Background</option>
                                        <option value="Lighting">Lighting & Atmosphere</option>
                                        <option value="Camera">Camera Angles & Framing</option>
                                        <option value="Custom">Custom Category...</option>
                                    </select>
                                </div>

                                {modularCategory === "Custom" && (
                                    <div>
                                        <label style={{ display: "block", fontSize: "11px", color: "#9CA3AF", marginBottom: "4px" }}>
                                            Custom Category Name
                                        </label>
                                        <input
                                            type="text"
                                            className="catalog-search-input"
                                            placeholder="e.g. Hairstyle, Accessories, Weapon"
                                            value={modularCustomSubcategory}
                                            onChange={(e) => setModularCustomSubcategory(e.target.value)}
                                            required
                                        />
                                    </div>
                                )}

                                <div>
                                    <label style={{ display: "block", fontSize: "11px", color: "#9CA3AF", marginBottom: "4px" }}>
                                        Token / Prompt Text (What gets inserted) *
                                    </label>
                                    <input
                                        type="text"
                                        className="catalog-search-input"
                                        placeholder="e.g. oversized off-shoulder knit sweater, white wool, ribbon"
                                        value={modularToken}
                                        onChange={(e) => setModularToken(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: "11px", color: "#9CA3AF", marginBottom: "4px" }}>
                                        Display Title / Label (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        className="catalog-search-input"
                                        placeholder="e.g. White Knit Sweater"
                                        value={modularTitle}
                                        onChange={(e) => setModularTitle(e.target.value)}
                                    />
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: "11px", color: "#9CA3AF", marginBottom: "4px" }}>
                                            Base Model Architecture
                                        </label>
                                        <select
                                            style={{ width: "100%", background: "#0E1013", border: "1px solid rgba(255,255,255,0.08)", color: "#FFFFFF", fontSize: "12px", padding: "6px", borderRadius: "5px" }}
                                            value={modularBaseModel}
                                            onChange={(e) => setModularBaseModel(e.target.value)}
                                        >
                                            <option value="All">All Architectures (Universal)</option>
                                            <option value="Illustrious">Illustrious XL</option>
                                            <option value="SDXL">SDXL</option>
                                            <option value="Pony">Pony V6</option>
                                            <option value="SD 1.5">SD 1.5</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: "block", fontSize: "11px", color: "#9CA3AF", marginBottom: "4px" }}>
                                            Sample Image Preview URL (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            className="catalog-search-input"
                                            placeholder="https://... or /images/..."
                                            value={modularSampleImages}
                                            onChange={(e) => setModularSampleImages(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div style={{ fontSize: "11px", color: "#71717A" }}>
                                    Token will be saved permanently to your local PostgreSQL database and instantly appears under the selected modular tab.
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
                                    Save Token to Database
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Gallery Image Picker Modal */}
            {isGalleryPickerOpen && (
                <div className="prompt-modal-backdrop" onClick={() => setIsGalleryPickerOpen(false)}>
                    <div className="preset-gallery-picker-box" onClick={(e) => e.stopPropagation()}>
                        <div className="prompt-modal-header">
                            <div>
                                <h3 className="prompt-modal-title">Pilih Foto dari Galeri Web / Database</h3>
                                <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "2px" }}>
                                    Klik foto untuk memilih / membatalkan (Terpilih: {newPresetSampleList.length}/5 foto)
                                </div>
                            </div>
                            <button
                                type="button"
                                style={{ background: "transparent", border: "none", color: "#71717A", cursor: "pointer", fontSize: "14px" }}
                                onClick={() => setIsGalleryPickerOpen(false)}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Search in Gallery */}
                        <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#111316" }}>
                            <input
                                type="text"
                                className="catalog-search-input"
                                placeholder="Cari foto di galeri (prompt, model, atau caption)..."
                                value={gallerySearch}
                                onChange={(e) => setGallerySearch(e.target.value)}
                            />
                        </div>

                        {/* Gallery Image Grid */}
                        <div className="preset-gallery-grid">
                            {galleryLoading ? (
                                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "30px", color: "#9CA3AF", fontSize: "12px" }}>
                                    Memuat foto dari galeri database...
                                </div>
                            ) : galleryImages.length === 0 ? (
                                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "30px", color: "#9CA3AF", fontSize: "12px" }}>
                                    Belum ada gambar di galeri database. Silakan gunakan tombol "Upload dari Lokal".
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
                                Gunakan Foto Terpilih ({newPresetSampleList.length}/5)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sample Image Lightbox Modal */}
            {lightboxImage && (
                <div className="prompt-lightbox-backdrop" onClick={() => setLightboxImage(null)}>
                    <div className="prompt-lightbox-content" onClick={(e) => e.stopPropagation()}>
                        <div className="prompt-lightbox-img-wrap">
                            <img src={lightboxImage.url} alt={lightboxImage.title} />
                        </div>
                        <div className="prompt-lightbox-info">
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <strong style={{ color: "#FFFFFF", fontSize: "14px" }}>{lightboxImage.title}</strong>
                                <button
                                    type="button"
                                    className="prompt-btn-sm"
                                    onClick={() => setLightboxImage(null)}
                                >
                                    Close Preview
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PromptLab;
