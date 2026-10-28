import React, { useState, useEffect, useMemo } from "react";
import {
    CATEGORIES,
    parseTagList,
    compileCategoriesPrompt,
    deconstructPromptTo10Layers,
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
    getBooruTagStatsApi,
    getPromptPresets,
    createPromptPresetApi,
    updatePromptPresetApi,
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
    Lock: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    ),
    Unlock: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 9.9-1" />
        </svg>
    ),
    Pin: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="17" x2="12" y2="22" />
            <path d="M5 17h14v-2l-2-3V5a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7l-2 3v2z" />
        </svg>
    ),
    Zap: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
    ),
    Edit: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
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

export interface ModularFullSetPreset {
    id: string;
    name: string;
    categoryTag?: string;
    createdAt: string;
    targetModel?: string;
    isPinned?: boolean;
    inputs: Record<string, string>;
    lora?: {
        name: string;
        weight: number;
        enabled: boolean;
    };
}

// Built-in Dynamic Fallback System Presets
export const DEFAULT_SYSTEM_PRESETS: PromptPreset[] = [
    {
        id: -1,
        title: "2D Anime Park (Full Set)",
        character: "2D Anime Girl",
        slug: "2d-anime-park-fullset",
        category: "modular_preset",
        subcategory: "2D Screencap",
        base_model_target: "Illustrious",
        preset_type: "fullset",
        positive_prompt: "masterpiece, best quality, amazing quality, newest, anime screencap, high quality anime illustration, modern japanese anime style, clean lineart, soft cel shading, vibrant natural colors, sharp character details, hand-drawn anime aesthetic, 1girl, solo, young adult woman, beautiful anime girl, long purple hair, high ponytail, purple eyes, soft bangs, five fingers, slender, cheerful expression, open mouth smile, looking at viewer, casual outfit, pink oversized hoodie, white inner shirt, black leggings, white sneakers, relaxed sitting pose, sitting on wooden park bench, one hand resting on bench, crossed legs, waving, raised hand, full body, eye level, three-quarter view, cinematic composition, detailed anime background, beautiful background, outdoors, peaceful park, lush green forest, tall trees, dense foliage, multiple wooden benches, sunlit pathway, detailed leaves, dappled sunlight, soft sunlight filtering through trees, atmospheric perspective, natural shadows, warm daylight, tranquil atmosphere",
        layer_data: JSON.stringify({
            quality: "masterpiece, best quality, amazing quality, newest, anime screencap, high quality anime illustration, modern japanese anime style, clean lineart, soft cel shading, vibrant natural colors, sharp character details, hand-drawn anime aesthetic",
            identity: "1girl, solo, young adult woman, beautiful anime girl, long purple hair, high ponytail, purple eyes, soft bangs",
            proportions: "five fingers, slender",
            details: "",
            expression: "cheerful expression, open mouth smile, looking at viewer",
            outfit: "casual outfit, pink oversized hoodie, white inner shirt, black leggings, white sneakers",
            pose: "relaxed sitting pose, sitting on wooden park bench, one hand resting on bench, crossed legs, waving, raised hand",
            camera: "full body, eye level, three-quarter view, cinematic composition",
            background: "detailed anime background, beautiful background, outdoors, peaceful park, lush green forest, tall trees, dense foliage, multiple wooden benches, sunlit pathway, detailed leaves",
            effects: "dappled sunlight, soft sunlight filtering through trees, atmospheric perspective, natural shadows, warm daylight, tranquil atmosphere",
            lora: { name: "", weight: 0.85, enabled: false },
        }),
        is_system: true,
    },
    {
        id: -2,
        title: "Rio Tsukatsuki - Seminar President (Full Set)",
        character: "Rio Tsukatsuki",
        slug: "rio-tsukatsuki-fullset",
        category: "modular_preset",
        subcategory: "Blue Archive",
        base_model_target: "Illustrious",
        preset_type: "fullset",
        positive_prompt: "(anime_coloring:1.15), masterpiece, newest, best quality, highres, illustration, 1girl, solo, tsukatsuki rio, red eyes, halo, black hair, long hair, intricate braided crown updo, long braided ponytail, loose framing side tendrils, tall female, mature, slender, hourglass figure, slender waist, toned stomach, long legs, slender fingers, sweat, glistening skin, sweatdrops on neck and collarbone, wet skin, shiny skin texture, heavy breathing, melancholic intense expression, focused fierce expression, slightly parted lips, intense gaze, looking at viewer, blazer, black jacket, collared shirt, black necktie, ornate Victorian gothic black dress, sheer lace sleeves, tight corset bodice, high-slit velvet skirt showing legs, sheer black thigh-high stockings, stiletto heels, theatrical standing pose, standing dramatically in front of a massive pipe organ, one arm raised conducting invisible music, holding a glowing crimson violin, environmental portrait, full body, full length view, low angle view, dynamic dutch angle, leading lines composition, seminar office, highly detailed background, indoor, abandoned gothic cathedral, giant shattered stained-glass window behind her, overgrown ruins, floating dust motes, scattered sheet music flying in the air, volumetric moonlight beams, volumetric fog, dramatic chiaroscuro lighting, cinematic lighting, tyndall effect, <lora:tsukatsuki_rio_illustrious:0.85>",
        layer_data: JSON.stringify({
            quality: "(anime_coloring:1.15), masterpiece, newest, best quality, highres, illustration",
            identity: "1girl, solo, tsukatsuki rio, red eyes, halo, black hair, long hair, intricate braided crown updo, long braided ponytail, loose framing side tendrils",
            proportions: "tall female, mature, slender, hourglass figure, slender waist, toned stomach, long legs, slender fingers",
            details: "sweat, glistening skin, sweatdrops on neck and collarbone, wet skin, shiny skin texture, heavy breathing",
            expression: "melancholic intense expression, focused fierce expression, slightly parted lips, intense gaze, looking at viewer",
            outfit: "blazer, black jacket, collared shirt, black necktie, ornate Victorian gothic black dress, sheer lace sleeves, tight corset bodice, high-slit velvet skirt showing legs, sheer black thigh-high stockings, stiletto heels",
            pose: "theatrical standing pose, standing dramatically in front of a massive pipe organ, one arm raised conducting invisible music, holding a glowing crimson violin",
            camera: "environmental portrait, full body, full length view, low angle view, dynamic dutch angle, leading lines composition",
            background: "seminar office, highly detailed background, indoor, abandoned gothic cathedral, giant shattered stained-glass window behind her, overgrown ruins",
            effects: "floating dust motes, scattered sheet music flying in the air, volumetric moonlight beams, volumetric fog, dramatic chiaroscuro lighting, cinematic lighting, tyndall effect",
            lora: { name: "tsukatsuki_rio_illustrious", weight: 0.85, enabled: true },
        }),
        is_system: true,
    },
    {
        id: -3,
        title: "Rin Tohsaka - Twin Braids (Full Set)",
        character: "Rin Tohsaka",
        slug: "rin-tohsaka-fullset",
        category: "modular_preset",
        subcategory: "Fate",
        base_model_target: "Illustrious",
        preset_type: "fullset",
        positive_prompt: "(anime_coloring:1.20), masterpiece, newest, best quality, highres, illustration, 1girl, solo, tohsaka rin, aqua eyes, twin braids, black hair, hair ribbon, slender, thigh gap, delicate hands, glistening skin, slight blush, parted lips, tsundere expression, confident smirk, blushing slightly, looking at viewer, red turtleneck sweater, black pleated skirt, black thighhighs, pendant necklace, standing with hands on hips, cowboy shot, upper body, slight low angle, depth of field, fuyuki city rooftop at night, glowing city lights, moonlit sky, volumetric moonlight, gentle wind blowing hair, atmospheric lighting, <lora:tohsaka_rin_illustrious:0.85>",
        layer_data: JSON.stringify({
            quality: "(anime_coloring:1.20), masterpiece, newest, best quality, highres, illustration",
            identity: "1girl, solo, tohsaka rin, aqua eyes, twin braids, black hair, hair ribbon",
            proportions: "slender, thigh gap, delicate hands",
            details: "glistening skin, slight blush, parted lips",
            expression: "tsundere expression, confident smirk, blushing slightly, looking at viewer",
            outfit: "red turtleneck sweater, black pleated skirt, black thighhighs, pendant necklace",
            pose: "standing with hands on hips",
            camera: "cowboy shot, upper body, slight low angle, depth of field",
            background: "fuyuki city rooftop at night, glowing city lights, moonlit sky",
            effects: "volumetric moonlight, gentle wind blowing hair, atmospheric lighting",
            lora: { name: "tohsaka_rin_illustrious", weight: 0.85, enabled: true },
        }),
        is_system: true,
    },
    {
        id: -4,
        title: "Fantasy Elf Ranger (Full Set)",
        character: "Fantasy Elf Ranger",
        slug: "fantasy-elf-ranger-fullset",
        category: "modular_preset",
        subcategory: "Fantasy",
        base_model_target: "Illustrious",
        preset_type: "fullset",
        positive_prompt: "masterpiece, best quality, amazing quality, highres, illustration, cel shading, 1girl, solo, emerald eyes, glowing eyes, elf ears, silver hair, elegant hairstyle, loose framing side tendrils, slender, athletic build, toned stomach, wide hips, thick thighs, delicate hands, manicured nails, glistening skin, sweat, pale skin, sun-kissed tan, slight blush, battle damage, focused fierce expression, intense gaze, gentle smile, white fantasy ranger tunic, leather corset, detached sleeves, fingerless gloves, thigh-high boots, capelet, dynamic combat stance, standing on a giant mossy tree root, drawing a glowing magic bow, holding crystal arrows, wide shot, low angle view, environmental portrait, cowboy shot, outdoor, ancient mystical forest, dense jungle, giant bioluminescent trees, mossy rocks, glowing mushrooms, waterfall, floating glowing spores, fireflies, shafts of sunlight breaking through canopy, volumetric fog, cinematic lighting, depth of field, <lora:fantasy_elf_ranger_xl:0.8>",
        layer_data: JSON.stringify({
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
            lora: { name: "fantasy_elf_ranger_xl", weight: 0.8, enabled: true },
        }),
        is_system: true,
    },
];

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
    compiledOutput: _compiledOutput,
    onCopyOutput,
    copied,
    formatMode,
    setFormatMode,
    onSwitchToCanvas,
    onSaveToPresetLibrary: _onSaveToPresetLibrary,
    showToast,
    onLoadPresetData,
    modularPresets = [],
    onAddModularTag,
    onDeleteModularTag,
}) => {
    // Collapsible Smart Raw Prompt Deconstructor State
    const [isDeconstructorOpen, setIsDeconstructorOpen] = useState<boolean>(false);
    const [rawPromptInput, setRawPromptInput] = useState<string>("");

    // LocalStorage Key for offline / persistent Full-Set Presets
    const LOCAL_STORAGE_SAVED_PRESETS_KEY = "modular_studio_saved_presets";

    // Database Presets (Full-Set & Modular)
    const [dbPresets, setDbPresets] = useState<PromptPreset[]>([]);
    const [isLoadingPresets, setIsLoadingPresets] = useState<boolean>(false);
    const [isSavingPreset, setIsSavingPreset] = useState<boolean>(false);
    const [pinnedPresetIds, setPinnedPresetIds] = useState<number[]>(() => {
        try {
            const saved = localStorage.getItem("modular_studio_pinned_presets");
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // Fetch Presets from PostgreSQL Database and merge with LocalStorage cache
    const fetchDbPresets = async () => {
        try {
            setIsLoadingPresets(true);
            const presets = await getPromptPresets();

            // Read locally saved modular presets from localStorage
            let localPresets: PromptPreset[] = [];
            try {
                const raw = localStorage.getItem(LOCAL_STORAGE_SAVED_PRESETS_KEY);
                if (raw) localPresets = JSON.parse(raw);
            } catch (e) {
                console.error("Gagal baca saved presets dari localStorage:", e);
            }

            // Combine backend presets with local presets
            const combined = [...(presets || [])];
            for (const lp of localPresets) {
                if (!combined.some((p) => p.id === lp.id || (p.slug && lp.slug && p.slug === lp.slug))) {
                    combined.push(lp);
                }
            }
            setDbPresets(combined);
        } catch (err) {
            console.error("Gagal memuat preset dari database, fallback ke localStorage:", err);
            try {
                const raw = localStorage.getItem(LOCAL_STORAGE_SAVED_PRESETS_KEY);
                if (raw) {
                    setDbPresets(JSON.parse(raw));
                }
            } catch {}
        } finally {
            setIsLoadingPresets(false);
        }
    };

    useEffect(() => {
        fetchDbPresets();
    }, []);

    // Merge DB presets with default system presets (DB presets take precedence if matched by slug/title)
    const allPresets = useMemo(() => {
        const result = [...dbPresets];
        for (const def of DEFAULT_SYSTEM_PRESETS) {
            if (!result.some((p) => p.slug === def.slug || p.title.toLowerCase() === def.title.toLowerCase())) {
                result.push(def);
            }
        }
        return result;
    }, [dbPresets]);

    // Predicate: Exclusively match Full-Set Modular Presets (PURGE all individual Danbooru tags & single chips)
    const isFullSetPreset = (p: PromptPreset): boolean => {
        if (!p) return false;
        // Strictly disqualify individual modular chips/tags
        if (p.preset_type === "modular") return false;
        if (p.category === "modular" && p.preset_type !== "fullset") return false;

        // Match explicit fullset preset type or modular_preset category
        if (p.preset_type === "fullset" || p.category === "modular_preset") return true;

        // Inspect layer_data JSON if present
        if (p.layer_data) {
            try {
                const parsed = typeof p.layer_data === "string" ? JSON.parse(p.layer_data) : p.layer_data;
                if (parsed && typeof parsed === "object") {
                    return Boolean(
                        parsed.quality ||
                        parsed.identity ||
                        parsed.proportions ||
                        parsed.details ||
                        parsed.expression ||
                        parsed.outfit ||
                        parsed.pose ||
                        parsed.camera ||
                        parsed.background ||
                        parsed.effects
                    );
                }
            } catch {
                return false;
            }
        }
        return false;
    };

    // Filtered full-set presets collection (Clean of any Danbooru tag chips)
    const fullSetPresetsList = useMemo(() => {
        return allPresets.filter(isFullSetPreset);
    }, [allPresets]);

    // Layer Lock State (Locked layers will not be overwritten by presets or replace action)
    const [lockedLayers, setLockedLayers] = useState<Record<string, boolean>>(() => {
        try {
            const saved = localStorage.getItem("modular_studio_locked_layers");
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    const toggleLayerLock = (layerId: string) => {
        setLockedLayers((prev) => {
            const next = { ...prev, [layerId]: !prev[layerId] };
            try {
                localStorage.setItem("modular_studio_locked_layers", JSON.stringify(next));
            } catch (e) {
                console.error("Gagal menyimpan locked layers:", e);
            }
            const isNowLocked = next[layerId];
            const cat = CATEGORIES.find((c) => c.id === layerId);
            showToast(
                isNowLocked
                    ? `Layer ${cat?.num || ""}: ${cat?.title || layerId} dikunci 🔒 (tidak tertimpa preset)`
                    : `Layer ${cat?.num || ""}: ${cat?.title || layerId} dibuka 🔓`
            );
            return next;
        });
    };

    // Full-Set Presets drawer state
    const [showFullSetDrawer, setShowFullSetDrawer] = useState<boolean>(false);

    // Save Full-Set Preset Modal State
    const [showSaveFullSetModal, setShowSaveFullSetModal] = useState<boolean>(false);
    const [modalPresetName, setModalPresetName] = useState<string>("");
    const [modalPresetCategory, setModalPresetCategory] = useState<string>("Anime Style");
    const [modalPinToQuick, setModalPinToQuick] = useState<boolean>(false);
    const [pendingSaveInputs, setPendingSaveInputs] = useState<Record<string, string>>({});
    const [pendingSaveLora, setPendingSaveLora] = useState<{ name: string; weight: number; enabled: boolean }>({
        name: "",
        weight: 0.85,
        enabled: false,
    });

    // Edit Full-Set Preset Modal State
    const [editingPreset, setEditingPreset] = useState<PromptPreset | null>(null);
    const [editPresetTitle, setEditPresetTitle] = useState<string>("");
    const [editPresetCategory, setEditPresetCategory] = useState<string>("Anime Style");
    const [editPendingInputs, setEditPendingInputs] = useState<Record<string, string> | null>(null);
    const [editPendingLora, setEditPendingLora] = useState<{ name: string; weight: number; enabled?: boolean } | null>(null);
    const [isUpdatingPreset, setIsUpdatingPreset] = useState<boolean>(false);

    // Drawer Search & Filter States
    const [presetSearchQuery, setPresetSearchQuery] = useState<string>("");
    const [activeDrawerCategory, setActiveDrawerCategory] = useState<string>("Semua");

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

    // Apply inputs with layer lock protection
    const applyInputsWithLocks = (
        targetInputs: Record<string, string>,
        targetLora?: { name: string; weight: number; enabled?: boolean }
    ) => {
        const nextInputs: Record<string, string> = {};
        CATEGORIES.forEach((cat) => {
            if (lockedLayers[cat.id]) {
                nextInputs[cat.id] = inputs[cat.id] || "";
            } else {
                nextInputs[cat.id] = targetInputs[cat.id] || "";
            }
        });

        let loraToPass: { name: string; weight: number } | undefined;
        if (!lockedLayers["identity"]) {
            if (targetLora && targetLora.enabled !== false && targetLora.name) {
                setLoraName(targetLora.name);
                setLoraWeight(targetLora.weight);
                setLoraEnabled(true);
                loraToPass = { name: targetLora.name, weight: targetLora.weight };
            } else {
                setLoraEnabled(false);
                setLoraName("");
            }
        } else {
            if (loraEnabled && loraName) {
                loraToPass = { name: loraName, weight: loraWeight };
            }
        }

        onLoadPresetData(nextInputs, loraToPass);
    };

    // Unpack any database preset or fallback preset into the 10 visual modular layers
    const unpackPresetToLayers = (preset: PromptPreset): {
        inputs: Record<string, string>;
        lora?: { name: string; weight: number; enabled?: boolean };
    } => {
        if (preset.layer_data) {
            try {
                const parsed = JSON.parse(preset.layer_data);
                const { lora, ...layerInputs } = parsed;
                return { inputs: layerInputs, lora };
            } catch (err) {
                console.warn("Gagal parse layer_data JSON, fallback ke deconstructor:", err);
            }
        }
        // Fallback: Dynamically deconstruct positive_prompt into 10 layers!
        const res = deconstructPromptTo10Layers(preset.positive_prompt || "");
        return {
            inputs: res.buckets,
            lora: res.lora ? { ...res.lora, enabled: true } : undefined,
        };
    };

    // Apply entire 10 layers from Database Preset
    const handleApplyDbPreset = (preset: PromptPreset) => {
        const { inputs: targetInputs, lora: targetLora } = unpackPresetToLayers(preset);
        applyInputsWithLocks(targetInputs, targetLora);
        showToast(`Preset "${preset.title}" berhasil dimuat dari Database!`);
    };

    // Apply ONLY Style & Lighting (Layer 1, 8, 9, 10) from Database Preset
    const handleApplyStyleAndLightingOnly = (preset: PromptPreset) => {
        const { inputs: targetInputs } = unpackPresetToLayers(preset);
        const nextInputs: Record<string, string> = { ...inputs };
        if (!lockedLayers["quality"] && targetInputs["quality"] !== undefined) {
            nextInputs["quality"] = targetInputs["quality"];
        }
        if (!lockedLayers["camera"] && targetInputs["camera"] !== undefined) {
            nextInputs["camera"] = targetInputs["camera"];
        }
        if (!lockedLayers["background"] && targetInputs["background"] !== undefined) {
            nextInputs["background"] = targetInputs["background"];
        }
        if (!lockedLayers["effects"] && targetInputs["effects"] !== undefined) {
            nextInputs["effects"] = targetInputs["effects"];
        }

        const loraToPass = loraEnabled && loraName ? { name: loraName, weight: loraWeight } : undefined;
        onLoadPresetData(nextInputs, loraToPass);
        showToast(`Style & Lighting dari "${preset.title}" diterapkan (Karakter & Outfit tetap aman)!`);
    };

    // Save Full-Set preset directly to PostgreSQL Database + LocalStorage cache
    const handleConfirmSavePreset = async () => {
        const title = modalPresetName.trim();
        if (!title) {
            showToast("Harap masukkan nama preset set!");
            return;
        }

        try {
            setIsSavingPreset(true);
            const compiled = compileCategoriesPrompt(
                pendingSaveInputs,
                pendingSaveLora.enabled && pendingSaveLora.name.trim()
                    ? { enabled: true, name: pendingSaveLora.name.trim(), weight: pendingSaveLora.weight }
                    : undefined,
                "single"
            );

            const layerPayload = {
                ...pendingSaveInputs,
                lora: pendingSaveLora,
            };

            const newPresetPayload: Partial<PromptPreset> = {
                title: title,
                character: title,
                category: "modular_preset",
                subcategory: modalPresetCategory || "Anime Style",
                preset_type: "fullset",
                base_model_target: selectedTargetModel === "pony" ? "Pony" : selectedTargetModel === "illustrious" ? "Illustrious" : "All",
                positive_prompt: compiled,
                layer_data: JSON.stringify(layerPayload),
                is_system: false,
            };

            let savedPreset: PromptPreset;
            try {
                savedPreset = await createPromptPresetApi(newPresetPayload);
            } catch (apiErr) {
                console.warn("Gagal simpan ke DB via API, fallback ke penyimpanan lokal:", apiErr);
                savedPreset = {
                    ...(newPresetPayload as PromptPreset),
                    id: Date.now(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
            }

            // Update in-memory DB presets
            setDbPresets((prev) => [savedPreset, ...prev.filter((p) => p.id !== savedPreset.id)]);

            // Save to LocalStorage cache so it persists even without backend connection
            try {
                const raw = localStorage.getItem(LOCAL_STORAGE_SAVED_PRESETS_KEY);
                const localList: PromptPreset[] = raw ? JSON.parse(raw) : [];
                const updatedLocal = [savedPreset, ...localList.filter((p) => p.id !== savedPreset.id)];
                localStorage.setItem(LOCAL_STORAGE_SAVED_PRESETS_KEY, JSON.stringify(updatedLocal));
            } catch (e) {
                console.error("Gagal simpan preset ke localStorage:", e);
            }

            if (modalPinToQuick) {
                setPinnedPresetIds((prev) => {
                    const next = Array.from(new Set([savedPreset.id, ...prev]));
                    try {
                        localStorage.setItem("modular_studio_pinned_presets", JSON.stringify(next));
                    } catch {}
                    return next;
                });
            }

            setShowSaveFullSetModal(false);
            setModalPresetName("");
            showToast(`Full-Set Preset "${title}" berhasil disimpan!`);
        } catch (err: any) {
            console.error("Gagal simpan preset:", err);
            showToast(`Gagal menyimpan: ${err?.message || "Error"}`);
        } finally {
            setIsSavingPreset(false);
        }
    };

    // Open Edit Modal for a saved preset
    const handleOpenEditPreset = (preset: PromptPreset) => {
        setEditingPreset(preset);
        setEditPresetTitle(preset.title);
        setEditPresetCategory(preset.subcategory || "Anime Style");
        setEditPendingInputs(null);
        setEditPendingLora(null);
    };

    // Replace preset's 10 layers with currently active Modular Studio layers
    const handleUpdateWithCurrentLayers = () => {
        setEditPendingInputs({ ...inputs });
        setEditPendingLora({ name: loraName, weight: loraWeight, enabled: loraEnabled });
        showToast("✨ Racikan 10 layer aktif siap diperbarui ke preset ini!");
    };

    // Save edited preset back to DB and LocalStorage
    const handleConfirmEditPreset = async () => {
        if (!editingPreset) return;
        const title = editPresetTitle.trim();
        if (!title) {
            showToast("Nama preset tidak boleh kosong!");
            return;
        }

        try {
            setIsUpdatingPreset(true);
            let nextPositivePrompt = editingPreset.positive_prompt;
            let nextLayerData = editingPreset.layer_data;

            if (editPendingInputs) {
                nextPositivePrompt = compileCategoriesPrompt(
                    editPendingInputs,
                    editPendingLora?.enabled && editPendingLora?.name
                        ? { enabled: true, name: editPendingLora.name, weight: editPendingLora.weight }
                        : undefined,
                    "single"
                );
                nextLayerData = JSON.stringify({
                    ...editPendingInputs,
                    lora: editPendingLora || { name: "", weight: 0.85, enabled: false },
                });
            }

            const updates: Partial<PromptPreset> = {
                title,
                character: title,
                subcategory: editPresetCategory,
                positive_prompt: nextPositivePrompt,
                layer_data: nextLayerData,
            };

            if (editingPreset.id > 0) {
                try {
                    await updatePromptPresetApi(editingPreset.id, updates);
                } catch (apiErr) {
                    console.warn("Gagal update preset ke DB via API, fallback ke penyimpanan lokal:", apiErr);
                }
            }

            const updatedItem: PromptPreset = {
                ...editingPreset,
                ...updates,
                updated_at: new Date().toISOString(),
            };

            // Update in-memory DB presets
            setDbPresets((prev) => prev.map((p) => (p.id === editingPreset.id ? updatedItem : p)));

            // Update LocalStorage cache
            try {
                const raw = localStorage.getItem(LOCAL_STORAGE_SAVED_PRESETS_KEY);
                if (raw) {
                    const localList: PromptPreset[] = JSON.parse(raw);
                    const updatedLocal = localList.map((p) => (p.id === editingPreset.id ? updatedItem : p));
                    localStorage.setItem(LOCAL_STORAGE_SAVED_PRESETS_KEY, JSON.stringify(updatedLocal));
                }
            } catch (e) {
                console.error("Gagal update preset di localStorage:", e);
            }

            setEditingPreset(null);
            showToast(`Preset "${title}" berhasil diperbarui!`);
        } catch (err: any) {
            console.error("Gagal update preset:", err);
            showToast(`Gagal update: ${err?.message || "Error"}`);
        } finally {
            setIsUpdatingPreset(false);
        }
    };

    // Delete preset from Database & LocalStorage
    const handleDeleteDbPreset = async (id: number, title: string) => {
        if (!window.confirm(`Hapus preset "${title}"?`)) return;
        try {
            if (id > 0) {
                try {
                    await deletePromptPresetApi(id);
                } catch (e) {
                    console.warn("Gagal hapus preset dari DB API:", e);
                }
            }
            setDbPresets((prev) => prev.filter((p) => p.id !== id));
            setPinnedPresetIds((prev) => {
                const next = prev.filter((pid) => pid !== id);
                try {
                    localStorage.setItem("modular_studio_pinned_presets", JSON.stringify(next));
                } catch {}
                return next;
            });

            // Remove from LocalStorage cache
            try {
                const raw = localStorage.getItem(LOCAL_STORAGE_SAVED_PRESETS_KEY);
                if (raw) {
                    const localList: PromptPreset[] = JSON.parse(raw);
                    const updatedLocal = localList.filter((p) => p.id !== id);
                    localStorage.setItem(LOCAL_STORAGE_SAVED_PRESETS_KEY, JSON.stringify(updatedLocal));
                }
            } catch (e) {
                console.error("Gagal hapus preset dari localStorage:", e);
            }

            showToast(`Preset "${title}" berhasil dihapus.`);
        } catch (err: any) {
            console.error("Gagal menghapus preset:", err);
            showToast(`Gagal menghapus: ${err?.message || "Error"}`);
        }
    };

    // Toggle Pin preset to Quick Bar
    const handleTogglePinPreset = (id: number) => {
        setPinnedPresetIds((prev) => {
            const isPinned = prev.includes(id);
            const next = isPinned ? prev.filter((pid) => pid !== id) : [...prev, id];
            try {
                localStorage.setItem("modular_studio_pinned_presets", JSON.stringify(next));
            } catch (e) {
                console.error("Gagal toggle pin:", e);
            }
            showToast(!isPinned ? "Preset di-pin ke Preset Cepat 📌" : "Preset di-unpin dari bar.");
            return next;
        });
    };

    // Quick Preset lookups (dynamic from database with fallback)
    const parkPreset = useMemo(
        () => allPresets.find((p) => p.slug === "2d-anime-park-fullset" || p.title.toLowerCase().includes("2d anime park")),
        [allPresets]
    );
    const rinPreset = useMemo(
        () => allPresets.find((p) => p.slug === "rin-tohsaka-fullset" || p.title.toLowerCase().includes("rin tohsaka")),
        [allPresets]
    );
    const rioPreset = useMemo(
        () => allPresets.find((p) => p.slug === "rio-tsukatsuki-fullset" || p.title.toLowerCase().includes("rio tsukatsuki")),
        [allPresets]
    );
    const elfPreset = useMemo(
        () => allPresets.find((p) => p.slug === "fantasy-elf-ranger-fullset" || p.title.toLowerCase().includes("fantasy elf")),
        [allPresets]
    );

    const pinnedPresets = useMemo(
        () => allPresets.filter((p) => pinnedPresetIds.includes(p.id)),
        [allPresets, pinnedPresetIds]
    );

    // Filtered presets based on search query and category pill inside drawer
    const filteredPresets = useMemo(() => {
        return fullSetPresetsList.filter((p) => {
            if (activeDrawerCategory === "Sistem" && !p.is_system) return false;
            if (activeDrawerCategory === "Kustom Saya" && p.is_system) return false;
            if (
                activeDrawerCategory !== "Semua" &&
                activeDrawerCategory !== "Sistem" &&
                activeDrawerCategory !== "Kustom Saya"
            ) {
                if (p.subcategory?.toLowerCase() !== activeDrawerCategory.toLowerCase()) return false;
            }

            if (!presetSearchQuery.trim()) return true;
            const q = presetSearchQuery.toLowerCase();
            return (
                p.title.toLowerCase().includes(q) ||
                (p.subcategory && p.subcategory.toLowerCase().includes(q)) ||
                (p.positive_prompt && p.positive_prompt.toLowerCase().includes(q))
            );
        });
    }, [fullSetPresetsList, activeDrawerCategory, presetSearchQuery]);

    // Deconstructor Action 1: Replace non-locked layers
    const handleDeconstructReplace = () => {
        if (!rawPromptInput.trim()) {
            showToast("Tempelkan prompt mentah terlebih dahulu!");
            return;
        }
        const { buckets, lora, totalTags } = deconstructPromptTo10Layers(rawPromptInput);
        applyInputsWithLocks(buckets, lora ? { ...lora, enabled: true } : { name: "", weight: 0.85, enabled: false });
        showToast(`⚡ ${totalTags} tag berhasil dipecah & dimasukkan ke 10 layer!`);
    };

    // Deconstructor Action 2: Merge into current layers
    const handleDeconstructMerge = () => {
        if (!rawPromptInput.trim()) {
            showToast("Tempelkan prompt mentah terlebih dahulu!");
            return;
        }
        const { buckets, lora, totalTags } = deconstructPromptTo10Layers(rawPromptInput);
        const mergedInputs: Record<string, string> = {};

        CATEGORIES.forEach((cat) => {
            if (lockedLayers[cat.id]) {
                mergedInputs[cat.id] = inputs[cat.id] || "";
            } else {
                const existing = parseTagList(inputs[cat.id] || "");
                const incoming = parseTagList(buckets[cat.id] || "");
                const combined = Array.from(new Set([...existing, ...incoming]));
                mergedInputs[cat.id] = combined.join(", ");
            }
        });

        let loraToPass: { name: string; weight: number } | undefined;
        if (!lockedLayers["identity"] && lora) {
            setLoraName(lora.name);
            setLoraWeight(lora.weight);
            setLoraEnabled(true);
            loraToPass = { name: lora.name, weight: lora.weight };
        } else if (loraEnabled && loraName) {
            loraToPass = { name: loraName, weight: loraWeight };
        }

        onLoadPresetData(mergedInputs, loraToPass);
        showToast(`+ ${totalTags} tag berhasil digabungkan ke 10 layer!`);
    };

    // Deconstructor Action 3: Deconstruct and directly open modal to save as full-set preset
    const handleDeconstructAndOpenSave = () => {
        if (!rawPromptInput.trim()) {
            showToast("Tempelkan prompt mentah terlebih dahulu!");
            return;
        }
        const { buckets, lora } = deconstructPromptTo10Layers(rawPromptInput);
        setPendingSaveInputs(buckets);
        setPendingSaveLora(lora ? { ...lora, enabled: true } : { name: "", weight: 0.85, enabled: false });
        setModalPresetName("");
        setShowSaveFullSetModal(true);
    };

    const handleClearAllWithLocks = () => {
        const hasLocks = Object.values(lockedLayers).some(Boolean);
        if (!hasLocks) {
            onClearAll();
            return;
        }
        const nextInputs: Record<string, string> = {};
        CATEGORIES.forEach((cat) => {
            if (lockedLayers[cat.id]) {
                nextInputs[cat.id] = inputs[cat.id] || "";
            } else {
                nextInputs[cat.id] = "";
            }
        });
        const loraToPass = lockedLayers["identity"] && loraEnabled && loraName ? { name: loraName, weight: loraWeight } : undefined;
        if (!lockedLayers["identity"]) {
            setLoraEnabled(false);
            setLoraName("");
        }
        onLoadPresetData(nextInputs, loraToPass);
        showToast("Layer yang tidak terkunci telah dibersihkan.");
    };

    const handleRandomize = () => {
        const randomFrom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
        applyInputsWithLocks({
            quality: "(anime_coloring:1.15), masterpiece, best quality, illustration",
            identity: `${randomFrom(["1girl, solo, red eyes, black hair, bangs", "1girl, solo, emerald eyes, silver hair, elf ears", "1girl, solo, tohsaka rin, twin braids"])}`,
            proportions: `${randomFrom(["tall female, slender waist, long legs", "petite, slender, delicate hands, thigh gap"])}`,
            details: `${randomFrom(["sweat, glistening skin, slight blush", "pale skin, sweatdrops on neck and collarbone"])}`,
            expression: `${randomFrom(["melancholic intense expression", "focused fierce expression", "intense gaze, slightly parted lips", "cheerful expression, open mouth smile, looking at viewer"])}`,
            outfit: `${randomFrom(["ornate Victorian gothic black dress, sheer lace sleeves, corset bodice", "white fantasy ranger tunic, leather corset, detached sleeves", "red turtleneck sweater, black pleated skirt", "casual outfit, pink oversized hoodie, white sneakers"])}`,
            pose: `${randomFrom(["theatrical standing pose, holding a glowing crimson violin", "dynamic combat stance, drawing a glowing magic bow", "relaxed sitting pose, sitting on wooden park bench"])}`,
            camera: `${randomFrom(["environmental portrait, full body, dramatic dutch angle", "wide shot, low angle view, cinematic composition", "full body, eye level, three-quarter view"])}`,
            background: `${randomFrom(["indoor, abandoned gothic cathedral, giant shattered stained-glass window behind her", "ancient mystical forest, giant bioluminescent trees, waterfall", "peaceful park, lush green forest, sunlit pathway"])}`,
            effects: `${randomFrom(["volumetric moonlight beams, floating dust motes, dramatic chiaroscuro lighting", "shafts of sunlight breaking through canopy, floating glowing spores, cinematic lighting", "dappled sunlight, soft sunlight filtering through trees"])}`,
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
                    {parkPreset && (
                        <button
                            type="button"
                            className="aps-preset-pill-btn full-set"
                            onClick={() => handleApplyDbPreset(parkPreset)}
                            title="Muat preset 2D Anime Park (10 Layer Lengkap)"
                        >
                            <LucideIcons.Sparkles />
                            <span>2D Anime Park</span>
                        </button>
                    )}
                    {rinPreset && (
                        <button
                            type="button"
                            className="aps-preset-pill-btn"
                            onClick={() => handleApplyDbPreset(rinPreset)}
                            title="Muat preset Rin Tohsaka (Fate)"
                        >
                            <span>Rin Tohsaka</span>
                        </button>
                    )}
                    {rioPreset && (
                        <button
                            type="button"
                            className="aps-preset-pill-btn"
                            onClick={() => handleApplyDbPreset(rioPreset)}
                            title="Muat preset Rio Tsukatsuki (Seminar Office)"
                        >
                            <span>Rio Tsukatsuki</span>
                        </button>
                    )}
                    {elfPreset && (
                        <button
                            type="button"
                            className="aps-preset-pill-btn"
                            onClick={() => handleApplyDbPreset(elfPreset)}
                            title="Muat preset Fantasy Elf Ranger"
                        >
                            <span>Fantasy Elf</span>
                        </button>
                    )}
                    {/* User Pinned Database Full-Set Presets */}
                    {pinnedPresets.map((pinned) => (
                        <button
                            key={`pinned-${pinned.id}`}
                            type="button"
                            className="aps-preset-pill-btn pinned"
                            onClick={() => handleApplyDbPreset(pinned)}
                            title={`Muat Preset Pinned: ${pinned.title}`}
                        >
                            <LucideIcons.Pin />
                            <span>{pinned.title}</span>
                        </button>
                    ))}
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

                    {/* Preset Tersimpan di Database PostgreSQL & LocalStorage */}
                    <button
                        type="button"
                        className={`aps-action-btn-sm ${showFullSetDrawer ? "active" : ""}`}
                        onClick={() => setShowFullSetDrawer(!showFullSetDrawer)}
                        title="Buka Preset Koleksi 10-Layer (Database PostgreSQL & Cache Lokal)"
                    >
                        <LucideIcons.Bookmark />
                        <span>Preset Koleksi ({fullSetPresetsList.length})</span>
                    </button>

                    {/* Bersihkan Semua */}
                    <button
                        type="button"
                        className="aps-action-btn-sm reset"
                        onClick={handleClearAllWithLocks}
                        title="Kosongkan seluruh kategori layer (layer terkunci akan tetap aman)"
                    >
                        <LucideIcons.Trash />
                        <span>Bersihkan Semua</span>
                    </button>
                </div>
            </div>

            {/* Collapsible Smart Raw Prompt Intake & Auto-Split 10 Layer */}
            <div className="aps-deconstructor-collapsible-bar">
                <div
                    className="aps-deconstructor-header"
                    onClick={() => setIsDeconstructorOpen(!isDeconstructorOpen)}
                >
                    <div className="aps-deconstructor-header-title">
                        <span className="zap-icon"><LucideIcons.Zap /></span>
                        <span>⚡ Smart Raw Prompt Intake &amp; Auto-Split 10 Layer</span>
                    </div>
                    <button
                        type="button"
                        className="aps-deconstructor-toggle-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsDeconstructorOpen(!isDeconstructorOpen);
                        }}
                    >
                        <span>{isDeconstructorOpen ? "Tutup Input Mentah" : "Buka Input Mentah"}</span>
                        {isDeconstructorOpen ? <LucideIcons.ChevronUp /> : <LucideIcons.ChevronDown />}
                    </button>
                </div>

                {isDeconstructorOpen && (
                    <div className="aps-deconstructor-body">
                        <textarea
                            className="aps-deconstructor-textarea"
                            placeholder="Tempel (paste) prompt mentah panjang di sini (Danbooru tags atau kalimat deskriptif)... Sistem akan otomatis mendistribusikan setiap tag ke 10 layer yang tepat."
                            value={rawPromptInput}
                            onChange={(e) => setRawPromptInput(e.target.value)}
                        />
                        <div className="aps-deconstructor-actions">
                            <button
                                type="button"
                                className="aps-deconstruct-btn-replace"
                                onClick={handleDeconstructReplace}
                                title="Kosongkan layer yang tidak di-lock dan distribusikan hasil pecahannya ke 10 layer"
                            >
                                <LucideIcons.Zap />
                                <span>⚡ Pecah &amp; Isi ke 10 Layer (Replace)</span>
                            </button>
                            <button
                                type="button"
                                className="aps-deconstruct-btn-secondary"
                                onClick={handleDeconstructMerge}
                                title="Tambahkan tag hasil pecahan tanpa menghapus tag yang sudah ada di masing-masing layer"
                            >
                                <LucideIcons.Plus />
                                <span>+ Gabungkan ke Layer Saat Ini (Merge)</span>
                            </button>
                            <button
                                type="button"
                                className="aps-deconstruct-btn-secondary"
                                onClick={handleDeconstructAndOpenSave}
                                title="Pecah prompt mentah dan langsung simpan seluruh 10 layer sebagai Full-Set Preset"
                            >
                                <LucideIcons.Bookmark />
                                <span>💾 Pecah &amp; Langsung Simpan Sebagai Full-Set Preset</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Full-Set Presets Drawer (Database PostgreSQL + LocalStorage Cache) */}
            {showFullSetDrawer && (
                <div className="aps-fullset-drawer">
                    <div className="aps-fullset-drawer-header">
                        <div className="aps-fullset-drawer-title">
                            <LucideIcons.Bookmark />
                            <span>Koleksi Full-Set Preset (10 Layer Utuh · Database &amp; Cache)</span>
                            <span className="aps-fullset-drawer-count">
                                {fullSetPresetsList.length} Preset
                            </span>
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button
                                type="button"
                                className="aps-fullset-btn-apply"
                                onClick={() => {
                                    setPendingSaveInputs({ ...inputs });
                                    setPendingSaveLora({ name: loraName, weight: loraWeight, enabled: loraEnabled });
                                    setModalPresetName("");
                                    setShowSaveFullSetModal(true);
                                }}
                                title="Simpan konfigurasi 10 layer saat ini sebagai Preset Baru"
                            >
                                + Simpan Racikan ke Preset
                            </button>
                            <button
                                type="button"
                                className="aps-save-btn cancel"
                                onClick={() => setShowFullSetDrawer(false)}
                            >
                                Tutup
                            </button>
                        </div>
                    </div>

                    {/* Search & Category Filter Inside Drawer */}
                    <div className="aps-fullset-search-bar">
                        <input
                            type="text"
                            className="aps-fullset-search-input"
                            placeholder="Cari preset modular... (misal: anime style, park, screencap, cyberpunk)"
                            value={presetSearchQuery}
                            onChange={(e) => setPresetSearchQuery(e.target.value)}
                        />
                        {presetSearchQuery && (
                            <button
                                type="button"
                                className="aps-fullset-search-clear"
                                onClick={() => setPresetSearchQuery("")}
                            >
                                Bersihkan
                            </button>
                        )}
                    </div>

                    <div className="aps-fullset-filter-tabs">
                        {["Semua", "Sistem", "Kustom Saya", "Anime Style", "2D Screencap", "Blue Archive", "Fate", "Fantasy", "Landscape", "Cyberpunk", "Casual"].map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                className={`aps-fullset-filter-pill ${activeDrawerCategory === tab ? "active" : ""}`}
                                onClick={() => setActiveDrawerCategory(tab)}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {filteredPresets.length > 0 ? (
                        <div className="aps-fullset-grid">
                            {filteredPresets.map((preset) => {
                                const unpacked = unpackPresetToLayers(preset);
                                const activeLayersCount = Object.keys(unpacked.inputs || {}).filter(
                                    (k) => unpacked.inputs[k] && unpacked.inputs[k].trim()
                                ).length;
                                const isPinned = pinnedPresetIds.includes(preset.id);
                                const dateFormatted = preset.created_at
                                    ? new Date(preset.created_at).toLocaleDateString("id-ID", {
                                          month: "short",
                                          day: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                      })
                                    : preset.is_system
                                    ? "Bawaan Sistem"
                                    : "Preset Tersimpan";

                                return (
                                    <div key={preset.id} className={`aps-fullset-card ${isPinned ? "is-pinned" : ""}`}>
                                        <div className="aps-fullset-card-header">
                                            <span className="aps-fullset-card-title">{preset.title}</span>
                                            <div className="aps-fullset-card-badges">
                                                {isPinned && (
                                                    <span className="aps-fullset-badge pinned">Pinned</span>
                                                )}
                                                <span className={`aps-fullset-badge ${preset.is_system ? "" : "custom"}`}>
                                                    {preset.is_system ? "Sistem" : "Kustom"}
                                                </span>
                                                {preset.subcategory && (
                                                    <span className="aps-fullset-badge">{preset.subcategory}</span>
                                                )}
                                                {preset.base_model_target && (
                                                    <span className="aps-fullset-badge model">{preset.base_model_target}</span>
                                                )}
                                                <span className="aps-fullset-badge">{activeLayersCount}/10 Layer</span>
                                            </div>
                                        </div>
                                        <span style={{ fontSize: "10.5px", color: "#64748b" }}>{dateFormatted}</span>

                                        {/* Prompt Preview Snippet */}
                                        {preset.positive_prompt && (
                                            <div className="aps-fullset-prompt-preview" title={preset.positive_prompt}>
                                                <code>{preset.positive_prompt}</code>
                                            </div>
                                        )}

                                        <div className="aps-fullset-card-actions">
                                            <button
                                                type="button"
                                                className="aps-fullset-btn-apply"
                                                onClick={() => handleApplyDbPreset(preset)}
                                                title="Terapkan seluruh 10 layer preset ini sekaligus ke Modular Studio"
                                            >
                                                ⚡ Terapkan ke 10 Layer
                                            </button>
                                            <button
                                                type="button"
                                                className="aps-fullset-btn-styleonly"
                                                onClick={() => handleApplyStyleAndLightingOnly(preset)}
                                                title="Ganti style anime, kamera, background, dan lighting tanpa mengubah karakter/outfit aktif"
                                            >
                                                🎨 Style &amp; Lighting Saja (1, 8, 9, 10)
                                            </button>
                                            <button
                                                type="button"
                                                className="aps-fullset-btn-canvas"
                                                onClick={() => {
                                                    if (onSwitchToCanvas) {
                                                        onSwitchToCanvas(preset.positive_prompt);
                                                        showToast(`Preset "${preset.title}" dikirim ke Prompt Lab Canvas! 🚀`);
                                                    }
                                                }}
                                                title="Kirim output prompt dari preset ini langsung ke Prompt Lab Canvas"
                                            >
                                                <LucideIcons.ArrowRight />
                                                <span>🚀 Masukkan ke Lab Canvas</span>
                                            </button>
                                            <button
                                                type="button"
                                                className={`aps-fullset-btn-pin ${isPinned ? "pinned" : ""}`}
                                                onClick={() => handleTogglePinPreset(preset.id)}
                                                title={isPinned ? "Unpin dari Preset Cepat" : "Pin ke Preset Cepat di bar atas"}
                                            >
                                                <LucideIcons.Pin />
                                                <span>{isPinned ? "Unpin" : "Pin"}</span>
                                            </button>
                                            {!preset.is_system && (
                                                <button
                                                    type="button"
                                                    className="aps-fullset-btn-edit"
                                                    onClick={() => handleOpenEditPreset(preset)}
                                                    title="Edit nama, style badge, atau perbarui dengan racikan layer aktif"
                                                >
                                                    <LucideIcons.Edit />
                                                    <span>Edit</span>
                                                </button>
                                            )}
                                            {!preset.is_system && (
                                                <button
                                                    type="button"
                                                    className="aps-fullset-btn-del"
                                                    onClick={() => handleDeleteDbPreset(preset.id, preset.title)}
                                                    title="Hapus preset ini dari Database &amp; penyimpanan lokal"
                                                >
                                                    <LucideIcons.Trash />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ padding: "20px", color: "#64748b", fontSize: "12px", textAlign: "center" }}>
                            {isLoadingPresets
                                ? "Memuat preset dari Database..."
                                : presetSearchQuery || activeDrawerCategory !== "Semua"
                                ? "Tidak ada preset yang cocok dengan filter pencarian."
                                : "Belum ada Full-Set Preset. Simpan racikan 10 layer Anda sekarang dengan menekan '+ Simpan Racikan ke Preset'!"}
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
                                        {lockedLayers[cat.id] && !isExpanded && (
                                            <span className="aps-layer-catalog-badge" style={{ color: "#60a5fa", borderColor: "#2563eb", background: "#0f172a" }}>
                                                🔒 Terkunci
                                            </span>
                                        )}
                                        {isExpanded && (
                                            <button
                                                type="button"
                                                className={`aps-cat-lock-btn ${lockedLayers[cat.id] ? "locked" : ""}`}
                                                onClick={() => toggleLayerLock(cat.id)}
                                                title={
                                                    lockedLayers[cat.id]
                                                        ? "Layer Terkunci: Preset baru / Deconstruct TIDAK AKAN menimpa layer ini"
                                                        : "Kunci layer ini agar tidak tertimpa saat memuat preset / deconstruct"
                                                }
                                            >
                                                {lockedLayers[cat.id] ? <LucideIcons.Lock /> : <LucideIcons.Unlock />}
                                                <span>{lockedLayers[cat.id] ? "Terkunci" : "Lock"}</span>
                                            </button>
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

                                    {/* Inline Actions (Katalog Drawer Trigger & Simpan ke DB) */}
                                    <div className="aps-token-box-actions">
                                        {onAddModularTag && (
                                            <button
                                                type="button"
                                                className="aps-token-save-db-btn"
                                                onClick={() => {
                                                    const draft = (layerInputDrafts[cat.id] || "").trim();
                                                    if (!draft) {
                                                        showToast("Ketik tag di kolom input terlebih dahulu untuk disimpan ke Database!");
                                                        return;
                                                    }
                                                    onAddModularTag(cat.id, draft);
                                                    setLayerInputDrafts((prev) => ({ ...prev, [cat.id]: "" }));
                                                }}
                                                title={`Simpan tag "${layerInputDrafts[cat.id] || ""}" secara permanen ke Database`}
                                            >
                                                <LucideIcons.Plus />
                                                <span>Simpan ke DB</span>
                                            </button>
                                        )}
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
                                                        {chipItem.isCustom && chipItem.id && onDeleteModularTag && (
                                                            <button
                                                                type="button"
                                                                className="aps-chip-del-db-btn"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onDeleteModularTag(chipItem.id!, chipItem.text);
                                                                }}
                                                                title="Hapus tag ini secara permanen dari Database"
                                                            >
                                                                ×
                                                            </button>
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
                                    onClick={() => {
                                        setPendingSaveInputs({ ...inputs });
                                        setPendingSaveLora({ name: loraName, weight: loraWeight, enabled: loraEnabled });
                                        setModalPresetName("");
                                        setShowSaveFullSetModal(true);
                                    }}
                                    title="Simpan konfigurasi 10 layer saat ini sebagai Full-Set Preset"
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
            {/* Modal Simpan Full-Set Preset (1 Set Utuh 10 Layer) */}
            {showSaveFullSetModal && (
                <div className="aps-modal-backdrop" onClick={() => setShowSaveFullSetModal(false)}>
                    <div className="aps-save-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="aps-save-modal-header">
                            <div className="aps-save-modal-title">
                                <LucideIcons.Bookmark />
                                <span>Simpan Full-Set Preset (1 Set Utuh 10 Layer)</span>
                            </div>
                            <button
                                type="button"
                                className="aps-cat-clear-btn"
                                onClick={() => setShowSaveFullSetModal(false)}
                            >
                                <LucideIcons.X />
                            </button>
                        </div>

                        <div className="aps-save-modal-body">
                            <div className="aps-save-field-group">
                                <label className="aps-save-field-label">Nama Preset Set</label>
                                <input
                                    type="text"
                                    className="aps-save-field-input"
                                    placeholder="Contoh: Casual Park Bench 2D, Rio Office Suit..."
                                    value={modalPresetName}
                                    onChange={(e) => setModalPresetName(e.target.value)}
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleConfirmSavePreset();
                                    }}
                                />
                            </div>

                            <div className="aps-save-field-group">
                                <label className="aps-save-field-label">Kategori Tag (Opsional)</label>
                                <div className="aps-save-badges-wrap">
                                    {["SFW", "2D Screencap", "Character", "Landscape", "Dark Fantasy", "Cyberpunk", "Casual"].map((badge) => (
                                        <button
                                            key={badge}
                                            type="button"
                                            className={`aps-save-badge-chip ${modalPresetCategory === badge ? "active" : ""}`}
                                            onClick={() => setModalPresetCategory(badge)}
                                        >
                                            {badge}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="aps-save-field-group">
                                <label className="aps-save-field-label">Status Layer &amp; Arsitektur Model</label>
                                <div className="aps-save-preview-box">
                                    <span className="aps-save-preview-stats">
                                        {Object.keys(pendingSaveInputs).filter((k) => pendingSaveInputs[k]?.trim()).length}/10 Layer Terisi ·{" "}
                                        {Object.values(pendingSaveInputs).reduce((acc, str) => acc + parseTagList(str || "").length, 0)} Tag Total
                                    </span>
                                    <span>Target Arsitektur AI: <strong style={{ color: "#e2e8f0" }}>{String(selectedTargetModel).toUpperCase()}</strong></span>
                                    {pendingSaveLora.enabled && pendingSaveLora.name && (
                                        <span>Injeksi LoRA: <strong style={{ color: "#38bdf8" }}>{pendingSaveLora.name} ({pendingSaveLora.weight})</strong></span>
                                    )}
                                </div>
                            </div>

                            <label className="aps-save-checkbox-label">
                                <input
                                    type="checkbox"
                                    className="aps-save-checkbox"
                                    checked={modalPinToQuick}
                                    onChange={(e) => setModalPinToQuick(e.target.checked)}
                                />
                                <span>Pin langsung preset ini ke bar <strong>PRESET CEPAT</strong> di atas</span>
                            </label>
                        </div>

                        <div className="aps-save-modal-footer">
                            <button
                                type="button"
                                className="aps-save-btn cancel"
                                onClick={() => setShowSaveFullSetModal(false)}
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                className="aps-save-btn"
                                onClick={handleConfirmSavePreset}
                                disabled={!modalPresetName.trim() || isSavingPreset}
                            >
                                {isSavingPreset ? "Menyimpan ke DB..." : "Simpan Preset ke Database"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Edit Full-Set Preset */}
            {editingPreset && (
                <div className="aps-modal-backdrop" onClick={() => setEditingPreset(null)}>
                    <div className="aps-save-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="aps-save-modal-header">
                            <div className="aps-save-modal-title">
                                <LucideIcons.Edit />
                                <span>Edit Preset: {editingPreset.title}</span>
                            </div>
                            <button
                                type="button"
                                className="aps-cat-clear-btn"
                                onClick={() => setEditingPreset(null)}
                            >
                                <LucideIcons.X />
                            </button>
                        </div>

                        <div className="aps-save-modal-body">
                            <div className="aps-save-field-group">
                                <label className="aps-save-field-label">Nama Preset Set</label>
                                <input
                                    type="text"
                                    className="aps-save-field-input"
                                    value={editPresetTitle}
                                    onChange={(e) => setEditPresetTitle(e.target.value)}
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleConfirmEditPreset();
                                    }}
                                />
                            </div>

                            <div className="aps-save-field-group">
                                <label className="aps-save-field-label">Kategori / Style Badge</label>
                                <div className="aps-save-badges-wrap">
                                    {["Anime Style", "2D Screencap", "SFW", "Dark Fantasy", "Landscape", "Cyberpunk", "Casual", "Character"].map((badge) => (
                                        <button
                                            key={badge}
                                            type="button"
                                            className={`aps-save-badge-chip ${editPresetCategory === badge ? "active" : ""}`}
                                            onClick={() => setEditPresetCategory(badge)}
                                        >
                                            {badge}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="aps-save-field-group">
                                <label className="aps-save-field-label">Perbarui Data 10 Layer</label>
                                <div className="aps-save-preview-box">
                                    <span style={{ color: editPendingInputs ? "#38bdf8" : "#94a3b8" }}>
                                        {editPendingInputs
                                            ? `✨ Disiapkan untuk diperbarui dengan 10 layer saat ini (${Object.keys(editPendingInputs).filter((k) => editPendingInputs[k]?.trim()).length}/10 Layer Terisi)`
                                            : "Preset saat ini menggunakan racikan layer lama."}
                                    </span>
                                    <button
                                        type="button"
                                        className="aps-fullset-btn-styleonly"
                                        style={{ marginTop: "6px", alignSelf: "flex-start" }}
                                        onClick={handleUpdateWithCurrentLayers}
                                    >
                                        🔄 Ganti dengan Racikan 10 Layer Saat Ini
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="aps-save-modal-footer">
                            <button
                                type="button"
                                className="aps-save-btn cancel"
                                onClick={() => setEditingPreset(null)}
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                className="aps-save-btn"
                                onClick={handleConfirmEditPreset}
                                disabled={!editPresetTitle.trim() || isUpdatingPreset}
                            >
                                {isUpdatingPreset ? "Menyimpan Perubahan..." : "Simpan Perubahan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
