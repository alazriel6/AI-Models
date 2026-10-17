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
    onAddModularTag,
    onDeleteModularTag,
}) => {
    // Database Saved Studio Presets (Strictly in PostgreSQL DB, NO localStorage)
    const [savedStudioPresets, setSavedStudioPresets] = useState<PromptPreset[]>([]);
    const [savedPresetsLoading, setSavedPresetsLoading] = useState<boolean>(false);
    const [newPresetName, setNewPresetName] = useState<string>("");
    const [showSaveDrawer, setShowSaveDrawer] = useState<boolean>(false);
    const [isSavingPreset, setIsSavingPreset] = useState<boolean>(false);

    // Inline Add Tag State per Category Card
    const [addingTagCatId, setAddingTagCatId] = useState<string | null>(null);
    const [newTagInput, setNewTagInput] = useState<string>("");
    const [newTagSubgroup, setNewTagSubgroup] = useState<string>("");
    const [isSavingTag, setIsSavingTag] = useState<boolean>(false);

    // Danbooru Catalog Drawer & Layer Tag Modal States
    const [showDanbooruCatalog, setShowDanbooruCatalog] = useState<boolean>(false);
    const [catalogTargetLayer, setCatalogTargetLayer] = useState<string>("all");
    const [catalogTargetCategory, setCatalogTargetCategory] = useState<string>("all");
    const [identityMode, setIdentityMode] = useState<"general" | "character">("general");
    const [expandedLayers, setExpandedLayers] = useState<Record<string, boolean>>({});
    const [modalLayerDetail, setModalLayerDetail] = useState<{ id: string; title: string; chips: any[] } | null>(null);
    const [layerModalSearch, setLayerModalSearch] = useState<string>("");
    const [isNsfwEnabled, setIsNsfwEnabled] = useState<boolean>(
        () => localStorage.getItem("modular_studio_nsfw_enabled") === "true"
    );
    const [booruStats, setBooruStats] = useState<BooruTagStats | null>(null);

    // Target Model Parser State (persisted to localStorage)
    const [selectedTargetModel, setSelectedTargetModel] = useState<PromptFormatId | "raw">(() => {
        const saved = localStorage.getItem("modular_studio_target_model");
        if (saved) return saved as any;
        return "pony";
    });
    const [showMultiModelModal, setShowMultiModelModal] = useState<boolean>(false);
    const [copiedModelId, setCopiedModelId] = useState<string | null>(null);
    const [showNormalizeMenu, setShowNormalizeMenu] = useState<boolean>(false);

    useEffect(() => {
        getBooruTagStatsApi()
            .then((data) => setBooruStats(data))
            .catch((err) => console.error("Gagal memuat stats katalog Danbooru:", err));
    }, []);

    const handleInsertTagFromCatalog = (tag: string, targetLayer?: string) => {
        const layerId = targetLayer && targetLayer !== "all" ? targetLayer : (catalogTargetLayer !== "all" ? catalogTargetLayer : "identity");
        const currentVal = inputs[layerId] || "";
        const cleanTag = normalizeTagForModel(tag.trim(), selectedTargetModel);
        if (!cleanTag) return;

        if (!currentVal.trim()) {
            onInputChange(layerId, cleanTag);
        } else {
            const parts = currentVal.split(",").map((p) => p.trim()).filter(Boolean);
            if (!parts.includes(cleanTag)) {
                onInputChange(layerId, `${currentVal.trim()}, ${cleanTag}`);
            }
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
            console.error("Failed to load saved studio presets from DB:", err);
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
            console.error("Failed to save preset to DB:", err);
            showToast("Gagal menyimpan preset ke database");
        } finally {
            setIsSavingPreset(false);
        }
    };

    // Delete custom preset from PostgreSQL DB
    const handleDeleteCustomFromDb = async (id: number, title: string) => {
        try {
            await deletePromptPresetApi(id);
            setSavedStudioPresets((prev) => prev.filter((p) => p.id !== id));
            showToast(`Preset "${title}" dihapus dari database`);
        } catch (err) {
            console.error("Failed to delete preset from DB:", err);
            showToast("Gagal menghapus preset dari database");
        }
    };

    // Load preset data into inputs
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

    // Pre-made quick templates (one-click inspiration)
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
        showToast("Preset Rio Tsukatsuki - Gothic Cathedral dimuat!");
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
        showToast("Preset Fantasy Elf - Mystical Forest dimuat!");
    };

    const handleRandomize = () => {
        const randomFrom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
        onLoadPresetData({
            quality: "(anime_coloring:1.15), masterpiece, best quality, illustration",
            identity: `${randomFrom(["1girl, solo, red eyes, black hair, bangs", "1girl, solo, emerald eyes, silver hair, elf ears"])}`,
            proportions: `${randomFrom(["tall female, slender waist, long legs", "petite, slender, delicate hands, thigh gap"])}`,
            details: `${randomFrom(["sweat, glistening skin, slight blush", "pale skin, sweatdrops on neck and collarbone"])}`,
            expression: `${randomFrom(["melancholic intense expression", "focused fierce expression", "intense gaze, slightly parted lips"])}`,
            outfit: `${randomFrom(["ornate Victorian gothic black dress, sheer lace sleeves, corset bodice", "white fantasy ranger tunic, leather corset, detached sleeves"])}`,
            pose: `${randomFrom(["theatrical standing pose, holding a glowing crimson violin", "dynamic combat stance, drawing a glowing magic bow"])}`,
            camera: `${randomFrom(["environmental portrait, full body, dramatic dutch angle", "wide shot, low angle view, cinematic composition"])}`,
            background: `${randomFrom(["abandoned gothic cathedral, giant shattered stained-glass window behind her", "ancient mystical forest, giant bioluminescent trees, waterfall"])}`,
            effects: `${randomFrom(["volumetric moonlight beams, floating dust motes, dramatic chiaroscuro lighting", "shafts of sunlight breaking through canopy, floating glowing spores, cinematic lighting"])}`,
        });
        showToast("Inspirasi karakter & scene diacak!");
    };

    // Handle adding a new tag directly to the database for a specific category
    const handleConfirmAddTag = async (categoryId: string) => {
        const text = newTagInput.trim();
        if (!text) return;

        try {
            setIsSavingTag(true);
            if (onAddModularTag) {
                await onAddModularTag(categoryId, text, newTagSubgroup || undefined);
            }
            setNewTagInput("");
            setAddingTagCatId(null);
        } catch {
            // error toasted by caller
        } finally {
            setIsSavingTag(false);
        }
    };

    // Realtime Model Parsed Output for the 10 Modular Layers
    const activeParsedOutput = useMemo(() => {
        return compileCategoriesPrompt(
            inputs,
            loraEnabled ? { enabled: true, name: loraName, weight: loraWeight } : undefined,
            formatMode,
            selectedTargetModel,
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
        const modelLabel = selectedTargetModel === "raw" ? "Raw Booru" : (PROMPT_FORMATS.find((f) => f.id === selectedTargetModel)?.name || selectedTargetModel);
        showToast(`Prompt (${modelLabel}) berhasil disalin!`);
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

    return (
        <div className="aps-modular-view-wrapper">
            {/* Top Toolbar: Quick Presets & Database Drawer */}
            <div className="aps-templates-strip">
                <div className="aps-templates-left">
                    <span className="aps-templates-label">Quick Presets:</span>
                    <button
                        type="button"
                        className="aps-preset-pill-btn"
                        onClick={loadPresetRio}
                        title="Muat preset Rio Tsukatsuki (Gothic Cathedral)"
                    >
                        <span>Rio Tsukatsuki (Gothic)</span>
                    </button>
                    <button
                        type="button"
                        className="aps-preset-pill-btn"
                        onClick={loadPresetElf}
                        title="Muat preset Fantasy Elf Ranger"
                    >
                        <span>Fantasy Elf (Forest)</span>
                    </button>
                    <button
                        type="button"
                        className="aps-preset-pill-btn random"
                        onClick={handleRandomize}
                        title="Acak inspirasi karakter & latar"
                    >
                        <span>Randomize Roll</span>
                    </button>
                </div>

                <div className="aps-templates-right">
                    <label
                        className={`aps-nsfw-toggle-pill ${isNsfwEnabled ? "active" : ""}`}
                        title="Tampilkan pilihan tag Danbooru NSFW / 18+ pada 10 kategori modular"
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
                                        ? "🔞 Mode NSFW aktif: Tag dewasa Danbooru ditampilkan di 10 modul!"
                                        : "Mode SFW: Tag dewasa disembunyikan."
                                );
                            }}
                            className="aps-nsfw-toggle-checkbox"
                        />
                        <span>🔞 Mode NSFW (18+)</span>
                    </label>

                    {/* Normalize layer inputs dropdown */}
                    <div style={{ position: "relative" }}>
                        <button
                            type="button"
                            className="aps-normalize-tools-btn"
                            onClick={() => setShowNormalizeMenu(!showNormalizeMenu)}
                            title="Normalisasi ejaan seluruh kolom 10 layer (spasi vs underscore)"
                        >
                            <span>🔄 Normalisasi Tag ▾</span>
                        </button>
                        {showNormalizeMenu && (
                            <div
                                style={{
                                    position: "absolute",
                                    top: "100%",
                                    right: 0,
                                    marginTop: "4px",
                                    background: "#111419",
                                    border: "1px solid #283142",
                                    borderRadius: "6px",
                                    padding: "6px",
                                    zIndex: 100,
                                    width: "260px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "4px",
                                    boxShadow: "0 10px 25px rgba(0,0,0,0.6)",
                                }}
                            >
                                <button
                                    type="button"
                                    className="aps-mode-btn"
                                    style={{ textAlign: "left", padding: "6px 8px" }}
                                    onClick={() => handleNormalizeAllLayers("spaces")}
                                    title="Ganti semua tanda _ menjadi spasi (Standar Illustrious-XL & NovelAI)"
                                >
                                    🔤 Ganti _ ke Spasi (Illustrious/NAI)
                                </button>
                                <button
                                    type="button"
                                    className="aps-mode-btn"
                                    style={{ textAlign: "left", padding: "6px 8px" }}
                                    onClick={() => handleNormalizeAllLayers("underscores")}
                                    title="Ganti semua spasi menjadi _ (Standar Pony & Animagine)"
                                >
                                    _ Ganti Spasi ke _ (Pony/Animagine)
                                </button>
                                <button
                                    type="button"
                                    className="aps-mode-btn"
                                    style={{ textAlign: "left", padding: "6px 8px" }}
                                    onClick={() => handleNormalizeAllLayers("strip_weights")}
                                    title="Hapus tanda kurung bobot () atau {} dan jadikan tag bersih"
                                >
                                    🧹 Bersihkan Bobot Kurung () &amp; &#123;&#125;
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        className={`aps-action-btn-sm ${showSaveDrawer ? "active" : ""}`}
                        onClick={() => setShowSaveDrawer(!showSaveDrawer)}
                        title="Buka Preset Tersimpan di Database"
                    >
                        <span>Database Presets ({savedStudioPresets.length})</span>
                    </button>
                    <button
                        type="button"
                        className="aps-action-btn-sm reset"
                        onClick={onClearAll}
                        title="Kosongkan seluruh 10 kategori"
                    >
                        <span>Clear All</span>
                    </button>
                </div>
            </div>

            {/* Custom Presets Drawer (PostgreSQL DB, No LocalStorage) */}
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
                            {isSavingPreset ? "Menyimpan ke DB..." : "Simpan ke Database"}
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
                                                ✕
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

            {/* Main Categories 2-Column / Stack Grid */}
            <div className="aps-layout-grid">
                {/* 10 Modular Categories Column */}
                <div className="aps-categories-col">
                    {CATEGORIES.map((cat) => {
                        const currentVal = inputs[cat.id] || "";
                        const activeCount = parseTagList(currentVal).length;

                        // Retrieve tags from PostgreSQL database for this category
                        const dbItems = modularPresets.filter(
                            (p) => p.subcategory?.toLowerCase() === cat.id.toLowerCase()
                        );
                        const categoryCustomDbTags = dbItems.map((p) => ({
                            name: p.positive_prompt || p.title,
                            category: p.category || "general",
                            layer: cat.id,
                        }));

                        // Extract all known subgroups (both predefined and dynamically created in DB)
                        const predefinedSubgroups = (cat.subgroups || []).map((s) => s.label);
                        const dbSubgroups = Array.from(
                            new Set(dbItems.map((p) => p.trigger_words).filter(Boolean) as string[])
                        );
                        const availableSubgroups = Array.from(
                            new Set([...predefinedSubgroups, ...dbSubgroups])
                        );

                        // Determine flat vs subgrouped items
                        let flatChips: { text: string; isCustom: boolean; id?: number }[] = [];
                        let subgroupChips: {
                            label: string;
                            chips: { text: string; isCustom: boolean; id?: number }[];
                        }[] = [];

                        if (dbItems.length > 0) {
                            flatChips = dbItems
                                .filter((p) => !p.trigger_words)
                                .map((p) => ({
                                    text: p.positive_prompt || p.title,
                                    isCustom: !p.is_system,
                                    id: p.id,
                                }));

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
                            // Fallback to static category definition while initial DB fetch occurs
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

                        return (
                            <div
                                key={cat.id}
                                className={`aps-category-card ${activeCount > 0 ? "has-content" : ""}`}
                            >
                                <div className="aps-cat-header">
                                    <div className="aps-cat-title-group">
                                        <span className="aps-cat-number">{cat.num}</span>
                                        <h3 className="aps-cat-title">{cat.title}</h3>
                                        {isNsfwEnabled && (cat.nsfwChips || cat.nsfwSubgroups) && (
                                            <span className="aps-cat-nsfw-badge" title="Tersedia pilihan tag dewasa NSFW">🔞 18+</span>
                                        )}
                                        {activeCount > 0 && (
                                            <span className="aps-cat-tag-count">{activeCount} tag</span>
                                        )}
                                    </div>
                                    {activeCount > 0 && (
                                        <button
                                            type="button"
                                            className="aps-cat-clear-btn"
                                            onClick={() => onClearCategory(cat.id)}
                                            title="Kosongkan kategori ini"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>

                                {/* Identity Mode Switcher for Modular 2 (Keeps 1 Modular, switches between General & Character-Only) */}
                                {cat.id === "identity" && (
                                    <div className="aps-identity-mode-switcher">
                                        <button
                                            type="button"
                                            className={`aps-id-mode-btn ${identityMode === "general" ? "active" : ""}`}
                                            onClick={() => setIdentityMode("general")}
                                            title="Tampilkan ciri fisik umum (rambut, mata, bentuk wajah)"
                                        >
                                            🌐 Ciri & Rambut (Umum)
                                        </button>
                                        <button
                                            type="button"
                                            className={`aps-id-mode-btn ${identityMode === "character" ? "active" : ""}`}
                                            onClick={() => setIdentityMode("character")}
                                            title="Hanya cari & tampilkan karakter Danbooru"
                                        >
                                            👤 Karakter Danbooru Saja
                                        </button>
                                    </div>
                                )}

                                <BooruAutocompleteInput
                                    as="input"
                                    className="aps-cat-input"
                                    placeholder={
                                        cat.id === "identity" && identityMode === "character"
                                            ? "Ketik nama karakter Danbooru (misal: frieren, raiden_shogun, mika, 2b)..."
                                            : cat.placeholder
                                    }
                                    value={currentVal}
                                    onChange={(val) => onInputChange(cat.id, val)}
                                    customDbTags={categoryCustomDbTags}
                                    layer={cat.id}
                                    category={cat.id === "identity" && identityMode === "character" ? "character" : undefined}
                                    isNsfwEnabled={isNsfwEnabled}
                                />

                                {/* Special LoRA Module for Category 2 (Identity & LoRA) */}
                                {cat.id === "identity" && (
                                    <div className="aps-lora-module">
                                        <div className="aps-lora-module-header">
                                            <span>
                                                LoRA Injector (&lt;lora:nama:{loraWeight.toFixed(2)}&gt;)
                                            </span>
                                            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                                                <input
                                                    type="checkbox"
                                                    checked={loraEnabled}
                                                    onChange={(e) => setLoraEnabled(e.target.checked)}
                                                    style={{ accentColor: "#3b82f6" }}
                                                />
                                                <span>Aktif</span>
                                            </label>
                                        </div>
                                        <div className="aps-lora-controls-row">
                                            <input
                                                type="text"
                                                className="aps-lora-name-input"
                                                placeholder="Nama LoRA (misal: tsukatsuki_rio_illustrious)"
                                                value={loraName}
                                                onChange={(e) => setLoraName(e.target.value)}
                                            />
                                            <div className="aps-lora-slider-box">
                                                <input
                                                    type="range"
                                                    min="0.1"
                                                    max="1.5"
                                                    step="0.05"
                                                    value={loraWeight}
                                                    onChange={(e) => setLoraWeight(parseFloat(e.target.value) || 0.8)}
                                                    className="aps-lora-slider"
                                                />
                                                <span className="aps-lora-val-badge">{loraWeight.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Character Mode Danbooru Panel or Normal Quick-Tag Chips Section */}
                                {cat.id === "identity" && identityMode === "character" ? (
                                    <div className="aps-char-mode-danbooru-panel">
                                        <div className="aps-char-danbooru-info">
                                            <span className="aps-char-danbooru-icon">👤</span>
                                            <div className="aps-char-danbooru-text-col">
                                                <span className="aps-char-danbooru-title">
                                                    Mode Karakter Danbooru Database ({booruStats?.categories?.character ? `${booruStats.categories.character}+ Karakter` : "218+ Karakter"})
                                                </span>
                                                <span className="aps-char-danbooru-desc">
                                                    Semua karakter diambil langsung dari database Danbooru tanpa quick-tags bertumpuk. Ketik nama karakter di kolom input atas untuk autokomplit instan, atau buka katalog untuk menjelajah.
                                                </span>
                                            </div>
                                        </div>
                                        <div className="aps-char-danbooru-actions">
                                            <button
                                                type="button"
                                                className="aps-char-danbooru-btn-primary"
                                                onClick={() => {
                                                    setCatalogTargetLayer("identity");
                                                    setCatalogTargetCategory("character");
                                                    setShowDanbooruCatalog(true);
                                                }}
                                                title="Buka katalog database Danbooru khusus karakter"
                                            >
                                                <span>🔍 Buka Katalog Karakter ({booruStats?.categories?.character ? `${booruStats.categories.character}+ Tag` : "218+ Tag"})</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="aps-chips-section">
                                        <div className="aps-chips-label-row">
                                            <div className="aps-chips-label-left">
                                                <span style={{ color: "#94a3b8" }}>
                                                    Quick-Tag Chips ({totalChipsCount}):
                                                </span>
                                                <button
                                                    type="button"
                                                    className="aps-add-chip-trigger"
                                                    onClick={() => {
                                                        if (addingTagCatId === cat.id) {
                                                            setAddingTagCatId(null);
                                                        } else {
                                                            setAddingTagCatId(cat.id);
                                                            setNewTagInput("");
                                                            setNewTagSubgroup("");
                                                        }
                                                    }}
                                                    title="Tambah quick tag baru ke database pada layer ini"
                                                >
                                                    <span className="aps-add-chip-icon">+</span>
                                                    <span>Tambah Tag</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="aps-add-chip-trigger"
                                                    style={{ borderColor: "#2563eb", color: "#60a5fa" }}
                                                    onClick={() => {
                                                        setCatalogTargetLayer(cat.id);
                                                        setCatalogTargetCategory("all");
                                                        setShowDanbooruCatalog(true);
                                                    }}
                                                    title={`Buka katalog Danbooru khusus untuk ${cat.title}`}
                                                >
                                                    <span>🔍 Katalog Tag{booruStats?.layers?.[cat.id] ? ` (${booruStats.layers[cat.id]})` : ""}</span>
                                                </button>
                                                {totalChipsCount > 20 && (
                                                    <button
                                                        type="button"
                                                        className="aps-add-chip-trigger"
                                                        style={{ borderColor: "#475569", color: "#94a3b8" }}
                                                        onClick={() => {
                                                            const allChips = [...flatChips];
                                                            subgroupChips.forEach((sg) => allChips.push(...sg.chips));
                                                            if (isNsfwEnabled) {
                                                                if (cat.nsfwChips) {
                                                                    allChips.push(...cat.nsfwChips.map((c) => ({ text: c, isCustom: false })));
                                                                }
                                                                if (cat.nsfwSubgroups) {
                                                                    cat.nsfwSubgroups.forEach((sg) =>
                                                                        allChips.push(...sg.chips.map((c) => ({ text: c, isCustom: false })))
                                                                    );
                                                                }
                                                            }
                                                            setModalLayerDetail({ id: cat.id, title: cat.title, chips: allChips });
                                                        }}
                                                        title={`Buka pop-up modal semua ${totalChipsCount} tag untuk layer ${cat.title}`}
                                                    >
                                                        <span>📋 Semua Tag ({totalChipsCount})</span>
                                                    </button>
                                                )}
                                            </div>
                                            <span className="aps-chips-tip">
                                                Klik kanan / (+) untuk bobot
                                            </span>
                                        </div>

                                    {/* Inline Add Tag Form for this Layer */}
                                    {addingTagCatId === cat.id && (
                                        <div className="aps-inline-add-tag-box">
                                            <div className="aps-inline-tag-input-row">
                                                <BooruAutocompleteInput
                                                    as="input"
                                                    className="aps-inline-tag-input"
                                                    placeholder={`Tag baru untuk ${cat.title} (misal: halo, wings)...`}
                                                    value={newTagInput}
                                                    onChange={(val) => setNewTagInput(val)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" && !e.shiftKey) {
                                                            e.preventDefault();
                                                            handleConfirmAddTag(cat.id);
                                                        } else if (e.key === "Escape") {
                                                            setAddingTagCatId(null);
                                                        }
                                                    }}
                                                    autoFocus
                                                    disabled={isSavingTag}
                                                    customDbTags={categoryCustomDbTags}
                                                    layer={cat.id}
                                                    isNsfwEnabled={isNsfwEnabled}
                                                />
                                                {availableSubgroups.length > 0 && (
                                                    <select
                                                        className="aps-inline-subgroup-select"
                                                        value={newTagSubgroup}
                                                        onChange={(e) => setNewTagSubgroup(e.target.value)}
                                                        disabled={isSavingTag}
                                                    >
                                                        <option value="">Umum (Tanpa Subgrup)</option>
                                                        {availableSubgroups.map((sg) => (
                                                            <option key={sg} value={sg}>
                                                                Subgrup: {sg}
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                                <button
                                                    type="button"
                                                    className="aps-inline-tag-btn-save"
                                                    onClick={() => handleConfirmAddTag(cat.id)}
                                                    disabled={isSavingTag || !newTagInput.trim()}
                                                >
                                                    {isSavingTag ? "Menyimpan..." : "Simpan ke DB"}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="aps-inline-tag-btn-cancel"
                                                    onClick={() => {
                                                        setAddingTagCatId(null);
                                                        setNewTagInput("");
                                                    }}
                                                    disabled={isSavingTag}
                                                >
                                                    Batal
                                                </button>
                                            </div>
                                            <span className="aps-inline-tag-hint">
                                                Tag otomatis tersimpan di PostgreSQL database.
                                            </span>
                                        </div>
                                    )}
                                    {/* Flat list of chips (Max 20 visible by default, expandable or modal popup) */}
                                    {flatChips.length > 0 && (() => {
                                        const isExpanded = !!expandedLayers[cat.id];
                                        const visibleFlatChips = isExpanded ? flatChips : flatChips.slice(0, 20);
                                        const hasMore = flatChips.length > 20;

                                        return (
                                            <div className="aps-chips-wrap">
                                                {visibleFlatChips.map((chipItem) => {
                                                    const active = isChipActive(cat.id, chipItem.text);
                                                    const weightLabel = getChipWeightLabel(cat.id, chipItem.text);

                                                    return (
                                                        <div
                                                            key={chipItem.id ? `db-${chipItem.id}` : `c-${chipItem.text}`}
                                                            className={`aps-chip-item ${active ? "active" : ""} ${
                                                                chipItem.isCustom ? "is-custom" : ""
                                                            }`}
                                                            onClick={() => onToggleChip(cat.id, chipItem.text)}
                                                            onContextMenu={(e) => {
                                                                e.preventDefault();
                                                                onCycleChipWeight(e, cat.id, chipItem.text);
                                                            }}
                                                            title={
                                                                chipItem.isCustom
                                                                    ? "Tag kustom tersimpan di DB - Klik kanan untuk bobot"
                                                                    : "Klik kanan / (+) untuk bobot (1.15 / 1.25)"
                                                            }
                                                        >
                                                            <span className="aps-chip-text">{chipItem.text}</span>
                                                            {weightLabel && (
                                                                <span className="aps-chip-weight-pill">
                                                                    :{weightLabel}
                                                                </span>
                                                            )}
                                                            <button
                                                                type="button"
                                                                className="aps-chip-weight-cycler"
                                                                title="Tingkatkan bobot tag"
                                                                onClick={(e) => onCycleChipWeight(e, cat.id, chipItem.text)}
                                                            >
                                                                +
                                                            </button>
                                                            {chipItem.isCustom && chipItem.id && onDeleteModularTag && (
                                                                <button
                                                                    type="button"
                                                                    className="aps-chip-del-btn"
                                                                    title="Hapus tag kustom ini dari database"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onDeleteModularTag(chipItem.id!, chipItem.text);
                                                                    }}
                                                                >
                                                                    ✕
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}

                                                {hasMore && !isExpanded && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="aps-chip-more-btn"
                                                            onClick={() => setExpandedLayers((prev) => ({ ...prev, [cat.id]: true }))}
                                                            title="Tampilkan semua tag di layer ini"
                                                        >
                                                            +{flatChips.length - 20} tag lainnya ▾
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="aps-chip-more-btn"
                                                            style={{ borderColor: "#64748b", color: "#94a3b8" }}
                                                            onClick={() => setModalLayerDetail({ id: cat.id, title: cat.title, chips: flatChips })}
                                                            title="Buka pop-up modal lengkap untuk melihat & mencari tag layer ini"
                                                        >
                                                            🔍 Pop-up Lengkap
                                                        </button>
                                                    </>
                                                )}

                                                {hasMore && isExpanded && (
                                                    <button
                                                        type="button"
                                                        className="aps-chip-more-btn"
                                                        onClick={() => setExpandedLayers((prev) => ({ ...prev, [cat.id]: false }))}
                                                    >
                                                        ▴ Sembunyikan (Ringkas 20)
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* Subgroup chips */}
                                    {subgroupChips.length > 0 && (
                                        <div className="aps-subgroups-wrap">
                                            {subgroupChips.map((group) => {
                                                const groupKey = `${cat.id}-${group.label}`;
                                                const isGrpExpanded = !!expandedLayers[groupKey];
                                                const visibleGroupChips = isGrpExpanded ? group.chips : group.chips.slice(0, 20);
                                                const hasMoreGrp = group.chips.length > 20;

                                                return (
                                                    <div key={group.label} className="aps-subgroup-row">
                                                        <span className="aps-subgroup-label">{group.label}:</span>
                                                        <div className="aps-chips-wrap">
                                                            {visibleGroupChips.map((chipItem) => {
                                                                const active = isChipActive(cat.id, chipItem.text);
                                                                const weightLabel = getChipWeightLabel(cat.id, chipItem.text);

                                                                return (
                                                                    <div
                                                                        key={
                                                                            chipItem.id
                                                                                ? `db-${chipItem.id}`
                                                                                : `g-${group.label}-${chipItem.text}`
                                                                        }
                                                                        className={`aps-chip-item ${active ? "active" : ""} ${
                                                                            chipItem.isCustom ? "is-custom" : ""
                                                                        }`}
                                                                        onClick={() => onToggleChip(cat.id, chipItem.text)}
                                                                        onContextMenu={(e) => {
                                                                            e.preventDefault();
                                                                            onCycleChipWeight(e, cat.id, chipItem.text);
                                                                        }}
                                                                        title={
                                                                            chipItem.isCustom
                                                                                ? "Tag kustom tersimpan di DB - Klik kanan untuk bobot"
                                                                                : "Klik kanan / (+) untuk bobot (1.15 / 1.25)"
                                                                        }
                                                                    >
                                                                        <span className="aps-chip-text">{chipItem.text}</span>
                                                                        {weightLabel && (
                                                                            <span className="aps-chip-weight-pill">
                                                                                :{weightLabel}
                                                                            </span>
                                                                        )}
                                                                        <button
                                                                            type="button"
                                                                            className="aps-chip-weight-cycler"
                                                                            title="Tingkatkan bobot tag"
                                                                            onClick={(e) =>
                                                                                onCycleChipWeight(e, cat.id, chipItem.text)
                                                                            }
                                                                        >
                                                                            +
                                                                        </button>
                                                                        {chipItem.isCustom && chipItem.id && onDeleteModularTag && (
                                                                            <button
                                                                                type="button"
                                                                                className="aps-chip-del-btn"
                                                                                title="Hapus tag kustom ini dari database"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    onDeleteModularTag(chipItem.id!, chipItem.text);
                                                                                }}
                                                                            >
                                                                                ✕
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}

                                                            {hasMoreGrp && !isGrpExpanded && (
                                                                <button
                                                                    type="button"
                                                                    className="aps-chip-more-btn"
                                                                    onClick={() => setExpandedLayers((prev) => ({ ...prev, [groupKey]: true }))}
                                                                >
                                                                    +{group.chips.length - 20} tag ▾
                                                                </button>
                                                            )}
                                                            {hasMoreGrp && isGrpExpanded && (
                                                                <button
                                                                    type="button"
                                                                    className="aps-chip-more-btn"
                                                                    onClick={() => setExpandedLayers((prev) => ({ ...prev, [groupKey]: false }))}
                                                                >
                                                                    ▴ Ringkas
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Conditional NSFW Quick-Tag Chips when Mode NSFW is enabled */}
                                    {isNsfwEnabled && (
                                        <>
                                            {cat.nsfwChips && cat.nsfwChips.length > 0 && (
                                                <div className="aps-subgroup-row aps-nsfw-subgroup-row">
                                                    <span className="aps-subgroup-label aps-nsfw-label">
                                                        🔞 Tag Dewasa / NSFW:
                                                    </span>
                                                    <div className="aps-chips-wrap">
                                                        {cat.nsfwChips.map((chipText) => {
                                                            const active = isChipActive(cat.id, chipText);
                                                            const weightLabel = getChipWeightLabel(cat.id, chipText);
                                                            return (
                                                                <div
                                                                    key={`nsfw-flat-${chipText}`}
                                                                    className={`aps-chip-item aps-chip-nsfw ${active ? "active" : ""}`}
                                                                    onClick={() => onToggleChip(cat.id, chipText)}
                                                                    onContextMenu={(e) => {
                                                                        e.preventDefault();
                                                                        onCycleChipWeight(e, cat.id, chipText);
                                                                    }}
                                                                    title="Tag Danbooru Dewasa (18+) - Klik untuk pasang, klik kanan untuk bobot"
                                                                >
                                                                    <span className="aps-chip-text">{chipText}</span>
                                                                    {weightLabel && (
                                                                        <span className="aps-chip-weight-pill">
                                                                            :{weightLabel}
                                                                        </span>
                                                                    )}
                                                                    <button
                                                                        type="button"
                                                                        className="aps-chip-weight-cycler"
                                                                        title="Tingkatkan bobot tag"
                                                                        onClick={(e) =>
                                                                            onCycleChipWeight(e, cat.id, chipText)
                                                                        }
                                                                    >
                                                                        +
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {cat.nsfwSubgroups && cat.nsfwSubgroups.length > 0 && (
                                                <div className="aps-subgroups-wrap aps-nsfw-subgroups-container">
                                                    {cat.nsfwSubgroups.map((group) => (
                                                        <div key={group.label} className="aps-subgroup-row aps-nsfw-subgroup-row">
                                                            <span className="aps-subgroup-label aps-nsfw-label">
                                                                {group.label}:
                                                            </span>
                                                            <div className="aps-chips-wrap">
                                                                {group.chips.map((chipText) => {
                                                                    const active = isChipActive(cat.id, chipText);
                                                                    const weightLabel = getChipWeightLabel(cat.id, chipText);
                                                                    return (
                                                                        <div
                                                                            key={`nsfw-grp-${group.label}-${chipText}`}
                                                                            className={`aps-chip-item aps-chip-nsfw ${active ? "active" : ""}`}
                                                                            onClick={() => onToggleChip(cat.id, chipText)}
                                                                            onContextMenu={(e) => {
                                                                                e.preventDefault();
                                                                                onCycleChipWeight(e, cat.id, chipText);
                                                                            }}
                                                                            title="Tag Danbooru Dewasa (18+) - Klik untuk pasang, klik kanan untuk bobot"
                                                                        >
                                                                            <span className="aps-chip-text">{chipText}</span>
                                                                            {weightLabel && (
                                                                                <span className="aps-chip-weight-pill">
                                                                                    :{weightLabel}
                                                                                </span>
                                                                            )}
                                                                            <button
                                                                                type="button"
                                                                                className="aps-chip-weight-cycler"
                                                                                title="Tingkatkan bobot tag"
                                                                                onClick={(e) =>
                                                                                    onCycleChipWeight(e, cat.id, chipText)
                                                                                }
                                                                            >
                                                                                +
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                        );
                    })}
                </div>

                {/* Right / Sticky Live Output Bar */}
                <div className="aps-output-col">
                    <div className="aps-output-card">
                        <div className="aps-output-header">
                            <div className="aps-output-title-group">
                                <h3 className="aps-output-title">Live Model Output</h3>
                                <div className="aps-output-metrics">
                                    <span className="aps-metric-pill">~{approxTokens} tok</span>
                                    <span className="aps-metric-pill">{tagCount} tags</span>
                                </div>
                            </div>

                            <div className="aps-output-mode-switch">
                                <button
                                    type="button"
                                    className={`aps-mode-btn ${formatMode === "single" ? "active" : ""}`}
                                    onClick={() => setFormatMode("single")}
                                >
                                    Single-Line
                                </button>
                                <button
                                    type="button"
                                    className={`aps-mode-btn ${formatMode === "multiline" ? "active" : ""}`}
                                    onClick={() => setFormatMode("multiline")}
                                >
                                    Per-Kategori
                                </button>
                            </div>
                        </div>

                        {/* Model Parser Selector Bar */}
                        <div className="aps-model-parser-bar">
                            <div className="aps-model-parser-label-row">
                                <span className="aps-model-parser-label">
                                    🎯 Target AI Model:
                                </span>
                                <button
                                    type="button"
                                    className="aps-compare-all-btn"
                                    onClick={() => setShowMultiModelModal(true)}
                                    title="Buka panel perbandingan 8 model sekaligus"
                                >
                                    ⚡ Bandingkan 8 Model
                                </button>
                            </div>

                            <div className="aps-model-chips-scroll">
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
                                    title="Illustrious-XL / NoobAI - Danbooru berspasi & masterpiece"
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
                                    className={`aps-model-btn ${selectedTargetModel === "midjourney" ? "active midjourney" : ""}`}
                                    onClick={() => { setSelectedTargetModel("midjourney"); localStorage.setItem("modular_studio_target_model", "midjourney"); }}
                                    title="Midjourney V6.1 - Prosa sinematik & parameter render"
                                >
                                    Midjourney
                                </button>
                                <button
                                    type="button"
                                    className={`aps-model-btn ${selectedTargetModel === "novelai" ? "active novelai" : ""}`}
                                    onClick={() => { setSelectedTargetModel("novelai"); localStorage.setItem("modular_studio_target_model", "novelai"); }}
                                    title="NovelAI V3 - Kurung kurawal {tag} & spasi"
                                >
                                    NovelAI
                                </button>
                                <button
                                    type="button"
                                    className={`aps-model-btn ${selectedTargetModel === "sdxl_realistic" ? "active sdxl" : ""}`}
                                    onClick={() => { setSelectedTargetModel("sdxl_realistic"); localStorage.setItem("modular_studio_target_model", "sdxl_realistic"); }}
                                    title="SDXL Photorealistic - Token DSLR & fotografi tajam"
                                >
                                    SDXL Real
                                </button>
                                <button
                                    type="button"
                                    className={`aps-model-btn ${selectedTargetModel === "sd15" ? "active sd15" : ""}`}
                                    onClick={() => { setSelectedTargetModel("sd15"); localStorage.setItem("modular_studio_target_model", "sd15"); }}
                                    title="Classic SD 1.5 - Koma standar & bobot WebUI"
                                >
                                    SD 1.5
                                </button>
                                <button
                                    type="button"
                                    className={`aps-model-btn ${selectedTargetModel === "raw" ? "active raw" : ""}`}
                                    onClick={() => { setSelectedTargetModel("raw"); localStorage.setItem("modular_studio_target_model", "raw"); }}
                                    title="Raw 10-Layer - Format asli tanpa transformasi"
                                >
                                    Raw Booru
                                </button>
                            </div>

                            <div className="aps-model-rule-hint">
                                {selectedTargetModel === "pony" && "Auto-Inject: score_9, score_8_up... + tag Danbooru (_) + bobot (tag:1.1)"}
                                {selectedTargetModel === "illustrious" && "Auto-Inject: masterpiece, very aesthetic + Danbooru spasi (tanpa score_9)"}
                                {selectedTargetModel === "animagine" && "Auto-Inject: masterpiece, newest, aesthetic + Danbooru (_) + rating:general"}
                                {selectedTargetModel === "flux" && "Auto-Transform: Kalimat naratif deskriptif bahasa Inggris kontinu untuk Flux.1"}
                                {selectedTargetModel === "midjourney" && "Auto-Transform: Prosa sinematik + parameter --ar 16:9 --v 6.1 --stylize 250"}
                                {selectedTargetModel === "novelai" && "Auto-Convert: Syntax kurung kurawal {tag} (1.05x), spasi kata tanpa _"}
                                {selectedTargetModel === "sdxl_realistic" && "Auto-Inject: Token fotografi tajam DSLR, 8k uhd, soft rim lighting"}
                                {selectedTargetModel === "sd15" && "Format Klasik WebUI: Koma standar dengan pembobotan (keyword:1.2)"}
                                {selectedTargetModel === "raw" && "Format Asli 10-Layer: Tag murni apa adanya sesuai yang dipilih"}
                            </div>
                        </div>

                        <textarea
                            className="aps-output-textarea"
                            rows={11}
                            value={displayOutput}
                            readOnly
                            placeholder="Prompt yang Anda rancang dari 10 kategori akan otomatis diparse ke model yang dipilih secara real-time..."
                        />

                        <div className="aps-output-actions">
                            <button
                                type="button"
                                className="aps-copy-btn"
                                onClick={handleCopyActive}
                            >
                                <span>{copied ? "Berhasil Disalin!" : `Salin Prompt (${selectedTargetModel === "raw" ? "Raw" : selectedTargetModel})`}</span>
                            </button>

                            <button
                                type="button"
                                className="aps-canvas-switch-btn"
                                onClick={handleSwitchCanvasActive}
                                title="Buka prompt terformat ini di Lab Canvas untuk tes token, bobot kurung, dan matrix"
                            >
                                <span>Uji di Lab Canvas ({selectedTargetModel === "raw" ? "Raw" : selectedTargetModel}) →</span>
                            </button>

                            <div style={{ display: "flex", gap: "8px" }}>
                                <button
                                    type="button"
                                    className="aps-action-btn-sm"
                                    style={{ flex: 1 }}
                                    onClick={onSaveToPresetLibrary}
                                    title="Simpan sebagai Preset ke Database"
                                >
                                    <span>Save Preset</span>
                                </button>
                                <button
                                    type="button"
                                    className="aps-action-btn-sm"
                                    style={{ flex: 1, color: "#60a5fa", borderColor: "#2563eb" }}
                                    onClick={() => setShowMultiModelModal(true)}
                                    title="Buka perbandingan 8 model sekaligus"
                                >
                                    <span>8 Model Grid</span>
                                </button>
                            </div>
                        </div>

                        {/* Bottom Right Floating / Catalog Banner */}
                        <div className="aps-output-catalog-banner">
                            <button
                                type="button"
                                className="aps-open-catalog-btn"
                                onMouseEnter={() => {
                                    getBooruTagStatsApi().then((d) => setBooruStats(d)).catch(() => {});
                                }}
                                onClick={() => {
                                    setCatalogTargetLayer("all");
                                    setCatalogTargetCategory("all");
                                    setShowDanbooruCatalog(true);
                                }}
                                title={`Buka kamus & katalog Danbooru database lengkap dengan tab 10 layer dan pencarian (${booruStats ? booruStats.total_tags.toLocaleString("id-ID") : "1.353+"} tag PostgreSQL)`}
                            >
                                <span>📖 Buka Katalog Danbooru ({booruStats ? `${booruStats.total_tags.toLocaleString("id-ID")}+ Tag` : "1.353+ Tag"})</span>
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
                            <div>
                                <h4 className="aps-layer-modal-title">
                                    Daftar Lengkap Quick-Tag: {modalLayerDetail.title}
                                </h4>
                                <span style={{ fontSize: "11px", color: "#64748b" }}>
                                    Total {modalLayerDetail.chips.length} tag tersedia di layer ini
                                </span>
                            </div>
                            <button
                                type="button"
                                className="booru-catalog-close-btn"
                                onClick={() => {
                                    setModalLayerDetail(null);
                                    setLayerModalSearch("");
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ padding: "10px 18px", borderBottom: "1px solid #232934", background: "#0d0f13" }}>
                            <input
                                type="text"
                                className="booru-catalog-search-input"
                                placeholder="Filter tag pada layer ini..."
                                value={layerModalSearch}
                                onChange={(e) => setLayerModalSearch(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="aps-layer-modal-body">
                            <div className="aps-chips-wrap">
                                {modalLayerDetail.chips
                                    .filter((c) =>
                                        !layerModalSearch ||
                                        c.text.toLowerCase().includes(layerModalSearch.toLowerCase())
                                    )
                                    .map((chipItem) => {
                                        const active = isChipActive(modalLayerDetail.id, chipItem.text);
                                        const weightLabel = getChipWeightLabel(modalLayerDetail.id, chipItem.text);
                                        return (
                                            <div
                                                key={chipItem.id ? `modal-${chipItem.id}` : `modal-${chipItem.text}`}
                                                className={`aps-chip-item ${active ? "active" : ""} ${
                                                    chipItem.isCustom ? "is-custom" : ""
                                                }`}
                                                onClick={() => onToggleChip(modalLayerDetail.id, chipItem.text)}
                                                onContextMenu={(e) => {
                                                    e.preventDefault();
                                                    onCycleChipWeight(e, modalLayerDetail.id, chipItem.text);
                                                }}
                                                title="Klik untuk toggle ke prompt layer ini"
                                            >
                                                <span className="aps-chip-text">{chipItem.text}</span>
                                                {weightLabel && (
                                                    <span className="aps-chip-weight-pill">
                                                        :{weightLabel}
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    className="aps-chip-weight-cycler"
                                                    title="Tingkatkan bobot tag"
                                                    onClick={(e) =>
                                                        onCycleChipWeight(e, modalLayerDetail.id, chipItem.text)
                                                    }
                                                >
                                                    +
                                                </button>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Multi-Model Comparison Modal */}
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
                            <div>
                                <h3 className="aps-multi-model-title">
                                    Real-time Multi-Model Comparison (8 Target Engine)
                                </h3>
                                <div className="aps-multi-model-sub">
                                    Prompt dari 10 modular layer langsung diparse sesuai sintaks database Danbooru ke masing-masing model.
                                </div>
                            </div>
                            <button
                                type="button"
                                className="booru-catalog-close-btn"
                                onClick={() => setShowMultiModelModal(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="aps-multi-model-body">
                            {PROMPT_FORMATS.map((fmt) => {
                                const promptText = allModelOutputs[fmt.id] || "";
                                const isCopied = copiedModelId === fmt.id;
                                const isCurrent = selectedTargetModel === fmt.id;
                                return (
                                    <div
                                        key={fmt.id}
                                        className="aps-multi-model-card"
                                        style={{
                                            borderColor: isCurrent ? fmt.color : "#282c34",
                                        }}
                                    >
                                        <div className="aps-multi-model-card-top">
                                            <span className="aps-multi-model-card-name">{fmt.name}</span>
                                            <span
                                                className="aps-multi-model-card-badge"
                                                style={{
                                                    background: isCurrent ? "#172554" : "#181d26",
                                                    color: isCurrent ? "#93c5fd" : "#94a3b8",
                                                    border: `1px solid ${isCurrent ? "#2563eb" : "#282c34"}`,
                                                }}
                                            >
                                                {isCurrent ? "✓ Model Aktif" : fmt.id}
                                            </span>
                                        </div>

                                        <textarea
                                            className="aps-multi-model-textarea"
                                            value={promptText}
                                            readOnly
                                            rows={5}
                                        />

                                        <div className="aps-multi-model-card-actions">
                                            <button
                                                type="button"
                                                className="aps-multi-model-btn-sm"
                                                onClick={() => {
                                                    setSelectedTargetModel(fmt.id);
                                                    localStorage.setItem("modular_studio_target_model", fmt.id);
                                                    showToast(`Target model aktif diubah ke ${fmt.name}`);
                                                }}
                                                style={isCurrent ? { background: "#2563eb", color: "#fff" } : undefined}
                                            >
                                                {isCurrent ? "✓ Aktif" : "Pilih Model"}
                                            </button>
                                            <button
                                                type="button"
                                                className="aps-multi-model-btn-sm"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(promptText);
                                                    setCopiedModelId(fmt.id);
                                                    showToast(`Prompt untuk ${fmt.name} berhasil disalin!`);
                                                    setTimeout(() => setCopiedModelId(null), 2000);
                                                }}
                                            >
                                                {isCopied ? "✓ Disalin!" : "📋 Salin"}
                                            </button>
                                            {onSwitchToCanvas && (
                                                <button
                                                    type="button"
                                                    className="aps-multi-model-btn-sm"
                                                    style={{ background: "#2563eb", color: "#fff", borderColor: "#3b82f6" }}
                                                    onClick={() => {
                                                        setShowMultiModelModal(false);
                                                        onSwitchToCanvas(promptText);
                                                    }}
                                                >
                                                    Ke Canvas →
                                                </button>
                                            )}
                                        </div>
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
