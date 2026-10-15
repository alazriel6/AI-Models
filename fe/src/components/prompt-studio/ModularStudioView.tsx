import React, { useState, useEffect } from "react";
import {
    CATEGORIES,
    parseTagList,
} from "./PromptCategoriesData";
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
    onCopyOutput: () => void;
    copied: boolean;
    formatMode: "single" | "multiline";
    setFormatMode: (mode: "single" | "multiline") => void;
    onSwitchToCanvas: () => void;
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
    const [expandedLayers, setExpandedLayers] = useState<Record<string, boolean>>({});
    const [modalLayerDetail, setModalLayerDetail] = useState<{ id: string; title: string; chips: any[] } | null>(null);
    const [layerModalSearch, setLayerModalSearch] = useState<string>("");
    const [isNsfwEnabled, setIsNsfwEnabled] = useState<boolean>(
        () => localStorage.getItem("modular_studio_nsfw_enabled") === "true"
    );
    const [booruStats, setBooruStats] = useState<BooruTagStats | null>(null);

    useEffect(() => {
        getBooruTagStatsApi()
            .then((data) => setBooruStats(data))
            .catch((err) => console.error("Gagal memuat stats katalog Danbooru:", err));
    }, []);

    const handleInsertTagFromCatalog = (tag: string, targetLayer?: string) => {
        const layerId = targetLayer && targetLayer !== "all" ? targetLayer : (catalogTargetLayer !== "all" ? catalogTargetLayer : "identity");
        const currentVal = inputs[layerId] || "";
        const cleanTag = tag.trim();
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

    // Calculate approximate tokens
    const textWithoutHeaders = compiledOutput.replace(/###.*:/g, "");
    const wordCount = textWithoutHeaders.split(/\s+/).filter(Boolean).length;
    const tagCount = textWithoutHeaders.split(",").filter((s) => s.trim().length > 0).length;
    const approxTokens = Math.round(wordCount * 1.35);

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

                                <BooruAutocompleteInput
                                    as="input"
                                    className="aps-cat-input"
                                    placeholder={cat.placeholder}
                                    value={currentVal}
                                    onChange={(val) => onInputChange(cat.id, val)}
                                    customDbTags={categoryCustomDbTags}
                                    layer={cat.id}
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

                                {/* Quick-Tag Chips Section */}
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
                            </div>
                        );
                    })}
                </div>

                {/* Right / Sticky Live Output Bar */}
                <div className="aps-output-col">
                    <div className="aps-output-card">
                        <div className="aps-output-header">
                            <div className="aps-output-title-group">
                                <h3 className="aps-output-title">Live Compiled Output</h3>
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

                        <textarea
                            className="aps-output-textarea"
                            rows={11}
                            value={compiledOutput}
                            readOnly
                            placeholder="Prompt yang Anda rancang dari 10 kategori akan tampil di sini secara real-time..."
                        />

                        <div className="aps-output-actions">
                            <button
                                type="button"
                                className="aps-copy-btn"
                                onClick={onCopyOutput}
                            >
                                <span>{copied ? "Berhasil Disalin!" : "Salin Prompt"}</span>
                            </button>

                            <button
                                type="button"
                                className="aps-canvas-switch-btn"
                                onClick={onSwitchToCanvas}
                                title="Buka prompt ini di Lab Canvas untuk tes token, bobot kurung, dan matrix"
                            >
                                <span>Uji di Lab Canvas →</span>
                            </button>

                            <button
                                type="button"
                                className="aps-action-btn-sm"
                                onClick={onSaveToPresetLibrary}
                                title="Simpan sebagai Preset ke Database"
                            >
                                <span>Save Preset</span>
                            </button>
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
        </div>
    );
};
