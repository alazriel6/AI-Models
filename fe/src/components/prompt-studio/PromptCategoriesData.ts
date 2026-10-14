export interface CategoryDefinition {
    id: string;
    num: number;
    title: string;
    placeholder: string;
    subgroups?: { label: string; chips: string[] }[];
    chips?: string[];
}

export const CATEGORIES: CategoryDefinition[] = [
    {
        id: "quality",
        num: 1,
        title: "Quality & Style",
        placeholder: "Kualitas gambar, style anime, cel shading...",
        chips: [
            "(anime_coloring:1.15)",
            "masterpiece",
            "newest",
            "best quality",
            "highres",
            "absurdres",
            "amazing quality",
            "illustration",
            "cel shading",
        ],
    },
    {
        id: "identity",
        num: 2,
        title: "LoRA & Identitas Karakter (Kepala & Rambut)",
        placeholder: "Rambut, warna mata, halo, fitur kepala unik...",
        chips: [
            "1girl",
            "solo",
            "red eyes",
            "emerald eyes",
            "glowing eyes",
            "halo",
            "elf ears",
            "silver hair",
            "black hair",
            "intricate braided crown updo",
            "long braided ponytail",
            "loose framing side tendrils",
            "bangs",
            "elegant hairstyle",
        ],
    },
    {
        id: "proportions",
        num: 3,
        title: "Proporsi Badan (Kepala, Tangan, Kaki, Tubuh)",
        placeholder: "Bentuk badan, postur, proporsi tangan & kaki...",
        subgroups: [
            {
                label: "Tubuh",
                chips: [
                    "tall female",
                    "mature",
                    "petite",
                    "slender",
                    "athletic build",
                    "hourglass figure",
                    "large breasts",
                    "slender waist",
                    "toned stomach",
                    "wide hips",
                ],
            },
            {
                label: "Tangan & Kaki",
                chips: [
                    "thick thighs",
                    "long legs",
                    "thigh gap",
                    "slender fingers",
                    "delicate hands",
                    "manicured nails",
                    "sharp fingernails",
                ],
            },
        ],
    },
    {
        id: "details",
        num: 4,
        title: "Detail Tambahan Karakter (Keringat, Kulit, Efek Fisik)",
        placeholder: "Keringat, tekstur kulit, blush, efek lelah/tempur...",
        chips: [
            "sweat",
            "glistening skin",
            "sweatdrops on neck and collarbone",
            "wet skin",
            "shiny skin texture",
            "pale skin",
            "sun-kissed tan",
            "slight blush",
            "heavy breathing",
            "tears",
            "battle damage",
        ],
    },
    {
        id: "expression",
        num: 5,
        title: "Ekspresi Wajah",
        placeholder: "Mimik muka, pandangan mata, senyuman...",
        chips: [
            "melancholic intense expression",
            "focused fierce expression",
            "slightly parted lips",
            "intense gaze",
            "smirk",
            "gentle smile",
            "crying",
            "emotionless",
        ],
    },
    {
        id: "outfit",
        num: 6,
        title: "Outfit & Aksesoris",
        placeholder: "Gaun, korset, stocking, sarung tangan, sepatu...",
        chips: [
            "ornate Victorian gothic black dress",
            "sheer lace sleeves",
            "tight corset bodice",
            "high-slit velvet skirt showing legs",
            "sheer black thigh-high stockings",
            "stiletto heels",
            "white fantasy ranger tunic",
            "leather corset",
            "detached sleeves",
            "fingerless gloves",
            "thigh-high boots",
            "capelet",
        ],
    },
    {
        id: "pose",
        num: 7,
        title: "Pose & Interaksi Objek",
        placeholder: "Pose berdiri, aksi tempur, memegang senjata/alat musik...",
        chips: [
            "theatrical standing pose",
            "dynamic combat stance",
            "standing dramatically in front of a massive pipe organ",
            "standing on a giant mossy tree root",
            "one arm raised conducting invisible music",
            "holding a glowing crimson violin",
            "drawing a glowing magic bow",
            "holding crystal arrows",
            "sitting on throne",
        ],
    },
    {
        id: "camera",
        num: 8,
        title: "Kamera & View (Sudut Pandang)",
        placeholder: "Sudut bidik, jarak shot, komposisi visual...",
        chips: [
            "full body",
            "wide shot",
            "distant shot",
            "environmental portrait",
            "full length view",
            "low angle view",
            "high angle",
            "dynamic dutch angle",
            "tilted camera frame",
            "leading lines composition",
            "cowboy shot",
            "close-up",
        ],
    },
    {
        id: "background",
        num: 9,
        title: "Background & Objek Lingkungan",
        placeholder: "Latar katedral, reruntuhan, hutan mistis, air terjun...",
        subgroups: [
            {
                label: "Indoor / Gothic",
                chips: [
                    "indoor",
                    "abandoned gothic cathedral",
                    "giant shattered stained-glass window behind her",
                    "overgrown ruins",
                ],
            },
            {
                label: "Outdoor / Hutan",
                chips: [
                    "outdoor",
                    "ancient mystical forest",
                    "dense jungle",
                    "giant bioluminescent trees",
                    "mossy rocks",
                    "glowing mushrooms",
                    "waterfall",
                ],
            },
        ],
    },
    {
        id: "effects",
        num: 10,
        title: "Efek, Partikel & Lighting",
        placeholder: "Partikel debu, berkas cahaya rembulan, fog, chiaroscuro...",
        chips: [
            "floating dust motes",
            "scattered sheet music flying in the air",
            "floating glowing spores",
            "fireflies",
            "volumetric moonlight beams",
            "shafts of sunlight breaking through canopy",
            "volumetric fog",
            "dramatic chiaroscuro lighting",
            "cinematic lighting",
            "tyndall effect",
            "depth of field",
        ],
    },
];

export interface CustomPreset {
    id: string;
    title: string;
    timestamp: string;
    inputs: Record<string, string>;
    loraName?: string;
    loraWeight?: number;
}

export const INITIAL_CATEGORY_INPUTS: Record<string, string> = {
    quality: "",
    identity: "",
    proportions: "",
    details: "",
    expression: "",
    outfit: "",
    pose: "",
    camera: "",
    background: "",
    effects: "",
};

// Helper: Parse comma separated tags in text
export const parseTagList = (text: string): string[] => {
    return (text || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
};

// Compile categories to single string prompt
export const compileCategoriesPrompt = (
    inputs: Record<string, string>,
    lora?: { enabled: boolean; name: string; weight: number },
    formatMode: "single" | "multiline" = "single"
): string => {
    const loraTag = lora?.enabled && lora.name.trim() ? `<lora:${lora.name.trim()}:${lora.weight.toFixed(2)}>` : "";
    const orderedBlocks: { title: string; content: string }[] = [];

    CATEGORIES.forEach((cat) => {
        let content = (inputs[cat.id] || "").trim();
        if (cat.id === "identity" && loraTag) {
            content = content ? `${loraTag}, ${content}` : loraTag;
        }
        if (content) {
            orderedBlocks.push({ title: cat.title, content });
        }
    });

    if (formatMode === "multiline") {
        return orderedBlocks.map((b) => `### ${b.title}:\n${b.content}`).join("\n\n");
    }

    return orderedBlocks
        .map((b) => b.content)
        .filter(Boolean)
        .join(", ");
};

// Deconstruct and classify raw prompt text into the 10 visual buckets
export const deconstructPromptText = (
    rawText: string,
    existingInputs?: Record<string, string>
): {
    buckets: Record<string, string>;
    lora?: { name: string; weight: number };
    totalTags: number;
    classifiedCount: number;
} => {
    if (!rawText.trim()) {
        return {
            buckets: existingInputs || { ...INITIAL_CATEGORY_INPUTS },
            totalTags: 0,
            classifiedCount: 0,
        };
    }

    const rawTokens = rawText
        .replace(/\r\n/g, "\n")
        .split(/,|\n/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

    const bucketArrays: Record<string, string[]> = {
        quality: [],
        identity: [],
        proportions: [],
        details: [],
        expression: [],
        outfit: [],
        pose: [],
        camera: [],
        background: [],
        effects: [],
    };

    let detectedLora: { name: string; weight: number } | undefined;
    let classifiedCount = 0;

    rawTokens.forEach((token) => {
        const lower = token.toLowerCase();

        // 1. LoRA Pattern Detection
        const loraMatch = token.match(/<lora:([^:>]+):?([0-9.]*)>/i);
        if (loraMatch) {
            detectedLora = {
                name: loraMatch[1],
                weight: loraMatch[2] ? parseFloat(loraMatch[2]) || 0.8 : 0.8,
            };
            classifiedCount++;
            return;
        }

        // 2. Keyword Classification
        if (
            lower.includes("quality") ||
            lower.includes("masterpiece") ||
            lower.includes("highres") ||
            lower.includes("absurdres") ||
            lower.includes("illustration") ||
            lower.includes("cel shading") ||
            lower.includes("anime_coloring") ||
            lower.includes("newest") ||
            lower.includes("aesthetic") ||
            lower.includes("resolution")
        ) {
            bucketArrays.quality.push(token);
            classifiedCount++;
        } else if (
            lower.includes("camera") ||
            lower.includes("shot") ||
            lower.includes("view") ||
            lower.includes("angle") ||
            lower.includes("portrait") ||
            lower.includes("full body") ||
            lower.includes("cowboy shot") ||
            lower.includes("close-up") ||
            lower.includes("composition") ||
            lower.includes("frame")
        ) {
            bucketArrays.camera.push(token);
            classifiedCount++;
        } else if (
            lower.includes("expression") ||
            lower.includes("gaze") ||
            lower.includes("smirk") ||
            lower.includes("smile") ||
            lower.includes("crying") ||
            lower.includes("emotionless") ||
            lower.includes("lips") ||
            lower.includes("mouth") ||
            lower.includes("frown")
        ) {
            bucketArrays.expression.push(token);
            classifiedCount++;
        } else if (
            lower.includes("sweat") ||
            lower.includes("skin") ||
            lower.includes("blush") ||
            lower.includes("breathing") ||
            lower.includes("tears") ||
            lower.includes("battle damage") ||
            lower.includes("wet") ||
            lower.includes("tan") ||
            lower.includes("collarbone")
        ) {
            bucketArrays.details.push(token);
            classifiedCount++;
        } else if (
            lower.includes("pose") ||
            lower.includes("standing") ||
            lower.includes("stance") ||
            lower.includes("sitting") ||
            lower.includes("holding") ||
            lower.includes("drawing") ||
            lower.includes("conducting") ||
            lower.includes("aiming") ||
            lower.includes("kneeling") ||
            lower.includes("organ") ||
            lower.includes("violin") ||
            lower.includes("bow")
        ) {
            bucketArrays.pose.push(token);
            classifiedCount++;
        } else if (
            lower.includes("dress") ||
            lower.includes("corset") ||
            lower.includes("sleeves") ||
            lower.includes("skirt") ||
            lower.includes("stockings") ||
            lower.includes("heels") ||
            lower.includes("tunic") ||
            lower.includes("gloves") ||
            lower.includes("boots") ||
            lower.includes("capelet") ||
            lower.includes("outfit") ||
            lower.includes("costume") ||
            lower.includes("uniform") ||
            lower.includes("jacket")
        ) {
            bucketArrays.outfit.push(token);
            classifiedCount++;
        } else if (
            lower.includes("cathedral") ||
            lower.includes("forest") ||
            lower.includes("indoor") ||
            lower.includes("outdoor") ||
            lower.includes("window") ||
            lower.includes("ruins") ||
            lower.includes("jungle") ||
            lower.includes("trees") ||
            lower.includes("rocks") ||
            lower.includes("mushrooms") ||
            lower.includes("waterfall") ||
            lower.includes("background") ||
            lower.includes("room")
        ) {
            bucketArrays.background.push(token);
            classifiedCount++;
        } else if (
            lower.includes("dust") ||
            lower.includes("motes") ||
            lower.includes("sheet music") ||
            lower.includes("spores") ||
            lower.includes("fireflies") ||
            lower.includes("moonlight") ||
            lower.includes("sunlight") ||
            lower.includes("fog") ||
            lower.includes("lighting") ||
            lower.includes("chiaroscuro") ||
            lower.includes("tyndall") ||
            lower.includes("particles") ||
            lower.includes("rays") ||
            lower.includes("depth of field")
        ) {
            bucketArrays.effects.push(token);
            classifiedCount++;
        } else if (
            lower.includes("hair") ||
            lower.includes("eyes") ||
            lower.includes("halo") ||
            lower.includes("ears") ||
            lower.includes("1girl") ||
            lower.includes("solo") ||
            lower.includes("ponytail") ||
            lower.includes("bangs") ||
            lower.includes("tendrils") ||
            lower.includes("updo") ||
            lower.includes("hairstyle")
        ) {
            bucketArrays.identity.push(token);
            classifiedCount++;
        } else if (
            lower.includes("tall") ||
            lower.includes("petite") ||
            lower.includes("slender") ||
            lower.includes("athletic") ||
            lower.includes("figure") ||
            lower.includes("breasts") ||
            lower.includes("waist") ||
            lower.includes("stomach") ||
            lower.includes("hips") ||
            lower.includes("thighs") ||
            lower.includes("legs") ||
            lower.includes("fingers") ||
            lower.includes("hands") ||
            lower.includes("nails")
        ) {
            bucketArrays.proportions.push(token);
            classifiedCount++;
        } else {
            bucketArrays.identity.push(token);
            classifiedCount++;
        }
    });

    const result: Record<string, string> = {};
    Object.keys(bucketArrays).forEach((key) => {
        const unique = Array.from(new Set(bucketArrays[key]));
        result[key] = unique.join(", ");
    });

    return {
        buckets: result,
        lora: detectedLora,
        totalTags: rawTokens.length,
        classifiedCount,
    };
};
