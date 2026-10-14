import React, { useState } from "react";
import {
    CATEGORIES,
    deconstructPromptText,
} from "./PromptCategoriesData";

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
    const [rawInput, setRawInput] = useState<string>("");
    const [parsedResult, setParsedResult] = useState<{
        buckets: Record<string, string>;
        lora?: { name: string; weight: number };
        totalTags: number;
        classifiedCount: number;
    } | null>(null);

    const handleParse = () => {
        if (!rawInput.trim()) {
            showToast("Silakan tempelkan teks prompt terlebih dahulu");
            return;
        }

        const result = deconstructPromptText(rawInput);
        setParsedResult(result);
        showToast(`Berhasil membedah ${result.classifiedCount} tag ke dalam 10 kategori!`);
    };

    const handleApplyStudio = () => {
        if (!parsedResult) return;
        onApplyToStudio(parsedResult.buckets, parsedResult.lora);
        showToast("Hasil dekonstruksi diterapkan ke 10-Layer Studio!");
    };

    const handleApplyCanvas = () => {
        if (!rawInput.trim()) return;
        onApplyToCanvas(rawInput.trim());
        showToast("Prompt diterapkan ke Lab Canvas!");
    };

    // Sample Prompts
    const loadSampleRio = () => {
        setRawInput(
            "masterpiece, best quality, very aesthetic, newest, 1girl, solo, red eyes, halo, black hair, intricate braided crown updo, long braided ponytail, loose framing side tendrils, tall female, mature, slender, hourglass figure, slender waist, toned stomach, long legs, sweat, glistening skin, sweatdrops on neck and collarbone, wet skin, shiny skin texture, heavy breathing, melancholic intense expression, focused fierce expression, ornate Victorian gothic black dress, sheer lace sleeves, tight corset bodice, high-slit velvet skirt, sheer black thigh-high stockings, stiletto heels, theatrical standing pose, standing dramatically in front of a massive pipe organ, holding a glowing crimson violin, environmental portrait, full body, low angle view, dynamic dutch angle, abandoned gothic cathedral, giant shattered stained-glass window behind her, floating dust motes, volumetric moonlight beams, volumetric fog, dramatic chiaroscuro lighting, <lora:tsukatsuki_rio_illustrious:0.85>"
        );
    };

    const loadSampleElf = () => {
        setRawInput(
            "masterpiece, best quality, amazing quality, highres, illustration, cel shading, 1girl, solo, emerald eyes, glowing eyes, elf ears, silver hair, elegant hairstyle, loose framing side tendrils, slender, athletic build, toned stomach, wide hips, thick thighs, glistening skin, sweat, pale skin, focused fierce expression, intense gaze, gentle smile, white fantasy ranger tunic, leather corset, detached sleeves, fingerless gloves, thigh-high boots, dynamic combat stance, standing on a giant mossy tree root, drawing a magic bow, wide shot, low angle view, environmental portrait, outdoor, ancient mystical forest, giant bioluminescent trees, waterfall, floating glowing spores, fireflies, shafts of sunlight, volumetric fog, cinematic lighting, <lora:fantasy_elf_ranger_xl:0.80>"
        );
    };

    return (
        <div className="aps-deconstructor-view-wrapper">
            <div className="aps-deconstructor-hero">
                <div className="aps-deconstructor-hero-header">
                    <span className="aps-deconstructor-title">
                        Smart Prompt Deconstructor &amp; Reverse-Engineer
                    </span>
                    <span className="aps-deconstructor-hint">
                        Tempelkan prompt panjang/berantakan dari Civitai, Twitter, atau WebUI. Algoritma akan memecahnya secara cerdas ke dalam 10 lapisan visual.
                    </span>
                </div>

                <div className="aps-deconstructor-sample-strip">
                    <span className="aps-sample-label">Contoh Cepat:</span>
                    <button
                        type="button"
                        className="aps-sample-btn"
                        onClick={loadSampleRio}
                    >
                        Rio Tsukatsuki (Gothic Cathedral)
                    </button>
                    <button
                        type="button"
                        className="aps-sample-btn"
                        onClick={loadSampleElf}
                    >
                        Fantasy Elf Ranger (Mystical Forest)
                    </button>
                </div>

                <div className="aps-deconstructor-input-box">
                    <textarea
                        className="aps-deconstructor-textarea"
                        rows={6}
                        placeholder="Tempelkan paragraf prompt panjang di sini (misal: masterpiece, 1girl, red eyes, gothic dress, cathedral, volumetric moonlight, <lora:rio:0.8>)..."
                        value={rawInput}
                        onChange={(e) => setRawInput(e.target.value)}
                    />

                    <div className="aps-deconstructor-input-actions">
                        <button
                            type="button"
                            className="aps-deconstruct-btn"
                            onClick={handleParse}
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

                        <button
                            type="button"
                            className="aps-clear-btn"
                            onClick={() => {
                                setRawInput("");
                                setParsedResult(null);
                            }}
                        >
                            Reset Input
                        </button>
                    </div>
                </div>
            </div>

            {/* Parsed Categories Breakdown */}
            {parsedResult && (
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
                                onClick={handleApplyStudio}
                            >
                                Terapkan ke 10-Layer Studio →
                            </button>
                            <button
                                type="button"
                                className="aps-apply-btn"
                                onClick={handleApplyCanvas}
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
