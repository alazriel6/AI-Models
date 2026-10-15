import {
    type PromptFormatId,
    convertPromptOffline,
    normalizeTagForModel,
} from "../../services/promptTransformerService";

export interface CategoryDefinition {
    id: string;
    num: number;
    title: string;
    placeholder: string;
    subgroups?: { label: string; chips: string[] }[];
    chips?: string[];
    nsfwChips?: string[];
    nsfwSubgroups?: { label: string; chips: string[] }[];
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
        nsfwChips: [
            "nsfw",
            "explicit",
            "uncensored",
            "mosaic censorship",
            "bar censorship",
            "censor light",
            "suggestive",
            "erotic",
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
        placeholder: "Bentuk badan, postur, proporsi tangan & kaki, anatomi...",
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
        nsfwSubgroups: [
            {
                label: "🔞 Payudara & Dada",
                chips: [
                    "nude",
                    "completely nude",
                    "topless",
                    "bottomless",
                    "bare breasts",
                    "large breasts",
                    "huge breasts",
                    "gigantic breasts",
                    "nipples",
                    "prominent nipples",
                    "erect nipples",
                    "pink nipples",
                    "areola",
                    "large areola",
                    "cleavage",
                    "underboob",
                    "sideboob",
                    "perky breasts",
                ],
            },
            {
                label: "🔞 Area Bawah & Kelamin",
                chips: [
                    "pussy",
                    "vaginal",
                    "clitoris",
                    "labia",
                    "cameltoe",
                    "pubic hair",
                    "shaved pussy",
                    "ass",
                    "buttocks",
                    "spread legs",
                    "spread pussy",
                    "thick thighs",
                    "navel",
                    "penis",
                    "erect penis",
                    "erection",
                    "large penis",
                    "testicles",
                    "glans",
                ],
            },
        ],
    },
    {
        id: "details",
        num: 4,
        title: "Detail Tambahan Karakter (Keringat, Kulit, Efek Fisik)",
        placeholder: "Keringat, tekstur kulit, blush, efek lelah/tempur, cairan...",
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
        nsfwChips: [
            "sweat",
            "heavy sweat",
            "sweat drops",
            "saliva",
            "drool",
            "saliva trail",
            "cum",
            "cum inside",
            "cum in pussy",
            "cum on breasts",
            "cum on body",
            "cum drip",
            "precum",
            "pussy juice",
        ],
    },
    {
        id: "expression",
        num: 5,
        title: "Ekspresi Wajah",
        placeholder: "Mimik muka, pandangan mata, senyuman, gairah...",
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
        nsfwChips: [
            "blush",
            "deep blush",
            "flushed face",
            "open mouth",
            "heavy breathing",
            "panting",
            "ahegao",
            "heart eyes",
            "pleasure face",
            "orgasmic expression",
            "eyes half closed",
            "tearing up",
        ],
    },
    {
        id: "outfit",
        num: 6,
        title: "Outfit & Aksesoris",
        placeholder: "Gaun, korset, stocking, sarung tangan, lingerie...",
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
        nsfwChips: [
            "torn clothes",
            "clothes lift",
            "shirt lift",
            "skirt lift",
            "lingerie",
            "garter straps",
            "bondage",
            "blindfold",
            "collar",
        ],
    },
    {
        id: "pose",
        num: 7,
        title: "Pose & Interaksi Objek",
        placeholder: "Pose berdiri, aksi tempur, memegang senjata, bercinta...",
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
        nsfwSubgroups: [
            {
                label: "🔞 Hubungan Badan & Penetrasi",
                chips: [
                    "sex",
                    "heterosexual",
                    "vaginal penetration",
                    "cowgirl position",
                    "straddling",
                    "riding",
                    "on top",
                    "reverse cowgirl",
                    "missionary",
                    "doggystyle",
                    "mating press",
                    "from behind",
                    "spooning",
                    "standing sex",
                    "suspended congress",
                ],
            },
            {
                label: "🔞 Sentuhan, Remasan & Oral",
                chips: [
                    "breast rest",
                    "breast grab",
                    "grabbing breasts",
                    "grabbing own breasts",
                    "groping",
                    "breast squeeze",
                    "hands on breasts",
                    "cupping breasts",
                    "paizuri",
                    "titfuck",
                    "fellatio",
                    "oral",
                    "deepthroat",
                    "handjob",
                    "fingering",
                    "cunnilingus",
                ],
            },
        ],
    },
    {
        id: "camera",
        num: 8,
        title: "Kamera & View (Sudut Pandang)",
        placeholder: "Sudut bidik, jarak shot, komposisi visual, POV...",
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
        nsfwChips: [
            "pov",
            "pov hands",
            "pov crotch",
            "partner lying down",
            "female on top",
            "male on female",
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

// Compile categories to single string prompt or model-specific format
export const compileCategoriesPrompt = (
    inputs: Record<string, string>,
    lora?: { enabled: boolean; name: string; weight: number },
    formatMode: "single" | "multiline" = "single",
    targetModel: PromptFormatId | "raw" = "raw",
    options?: { isNsfw?: boolean }
): string => {
    const loraTag = lora?.enabled && lora.name.trim() ? `<lora:${lora.name.trim()}:${lora.weight.toFixed(2)}>` : "";
    const orderedBlocks: { id: string; title: string; content: string }[] = [];

    CATEGORIES.forEach((cat) => {
        let content = (inputs[cat.id] || "").trim();
        if (cat.id === "identity" && loraTag) {
            content = content ? `${loraTag}, ${content}` : loraTag;
        }
        if (content) {
            orderedBlocks.push({ id: cat.id, title: cat.title, content });
        }
    });

    const rawJoined = orderedBlocks
        .map((b) => b.content)
        .filter(Boolean)
        .join(", ");

    if (targetModel === "raw") {
        if (formatMode === "multiline") {
            return orderedBlocks.map((b) => `### ${b.title}:\n${b.content}`).join("\n\n");
        }
        return rawJoined;
    }

    // Model-Specific Formatting
    if (formatMode === "single") {
        return convertPromptOffline(rawJoined, targetModel, options);
    }

    // Multiline mode for specific model:
    // Format each category block's tags according to the model's syntax conventions
    const modelBlocks = orderedBlocks.map((b) => {
        let blockContent = b.content;
        // Don't format raw LoRA tag
        const loraTokens: string[] = [];
        const noLora = blockContent.replace(/<lora:[^>]+>/gi, (m) => {
            loraTokens.push(m);
            return "";
        });

        const formattedTags = noLora
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
            .map((t) => normalizeTagForModel(t, targetModel))
            .filter(Boolean);

        const joinedBlock = [...formattedTags, ...loraTokens].join(", ");
        return `### ${b.title}:\n${joinedBlock}`;
    });

    // For models with special quality prefix, prepend a header block if quality wasn't manually set
    let prefixHeader = "";
    const isNsfw = options?.isNsfw ?? /nsfw|explicit|sex|penetration|nude/i.test(rawJoined);
    if (targetModel === "pony") {
        prefixHeader = `### 🌟 Model Quality Prefix (Pony V6 Score):\n${
            isNsfw
                ? "score_9, score_8_up, score_7_up, score_6_up, score_5_up, score_4_up, rating:explicit, masterpiece, best quality, ultra-detailed"
                : "score_9, score_8_up, score_7_up, score_6_up, score_5_up, score_4_up, rating:safe, masterpiece, best quality, ultra-detailed"
        }\n\n`;
    } else if (targetModel === "illustrious") {
        prefixHeader = `### 🌟 Model Quality Prefix (Illustrious-XL):\n${
            isNsfw
                ? "masterpiece, best quality, very aesthetic, ultra-detailed, nsfw, explicit"
                : "masterpiece, best quality, very aesthetic, ultra-detailed"
        }\n\n`;
    } else if (targetModel === "animagine") {
        prefixHeader = `### 🌟 Model Quality Prefix (Animagine XL 3.1):\n${
            isNsfw
                ? "masterpiece, best quality, very aesthetic, newest, ultra-detailed, nsfw, explicit"
                : "masterpiece, best quality, very aesthetic, newest, ultra-detailed"
        }\n\n`;
    } else if (targetModel === "novelai") {
        prefixHeader = `### 🌟 Model Quality Prefix (NovelAI V3):\n${
            isNsfw ? "{masterpiece}, {best quality}, nsfw, explicit" : "{masterpiece}, {best quality}"
        }\n\n`;
    } else if (targetModel === "flux" || targetModel === "midjourney") {
        const fullProse = convertPromptOffline(rawJoined, targetModel, options);
        return `### 🌟 Full Descriptive Narrative (${targetModel === "flux" ? "Flux.1 Prose" : "Midjourney V6.1"}):\n${fullProse}\n\n` + modelBlocks.join("\n\n");
    }

    return prefixHeader + modelBlocks.join("\n\n");
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

        // 2. Keyword Classification into 10 Modular Buckets
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
            lower.includes("resolution") ||
            lower.includes("score_") ||
            lower.includes("nsfw") ||
            lower.includes("explicit") ||
            lower.includes("uncensored") ||
            lower.includes("censorship") ||
            lower.includes("suggestive") ||
            lower.includes("erotic")
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
            lower.includes("frame") ||
            lower.includes("pov") ||
            lower.includes("female on top") ||
            lower.includes("male on female") ||
            lower.includes("partner lying down")
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
            lower.includes("frown") ||
            lower.includes("ahegao") ||
            lower.includes("pleasure") ||
            lower.includes("orgasmic") ||
            lower.includes("heart eyes") ||
            lower.includes("panting")
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
            lower.includes("collarbone") ||
            lower.includes("cum") ||
            lower.includes("precum") ||
            lower.includes("saliva") ||
            lower.includes("drool") ||
            lower.includes("juice")
        ) {
            bucketArrays.details.push(token);
            classifiedCount++;
        } else if (
            lower.includes("sex") ||
            lower.includes("cowgirl") ||
            lower.includes("straddling") ||
            lower.includes("riding") ||
            lower.includes("missionary") ||
            lower.includes("doggystyle") ||
            lower.includes("mating press") ||
            lower.includes("penetration") ||
            lower.includes("breast grab") ||
            lower.includes("grabbing breast") ||
            lower.includes("breast squeeze") ||
            lower.includes("hands on breast") ||
            lower.includes("cupping breast") ||
            lower.includes("groping") ||
            lower.includes("paizuri") ||
            lower.includes("titfuck") ||
            lower.includes("fellatio") ||
            lower.includes("deepthroat") ||
            lower.includes("handjob") ||
            lower.includes("fingering") ||
            lower.includes("cunnilingus") ||
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
            lower.includes("jacket") ||
            lower.includes("lingerie") ||
            lower.includes("torn clothes") ||
            lower.includes("clothes lift") ||
            lower.includes("shirt lift") ||
            lower.includes("skirt lift") ||
            lower.includes("garter") ||
            lower.includes("bondage") ||
            lower.includes("collar")
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
            lower.includes("1boy") ||
            lower.includes("2girls") ||
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
            lower.includes("nails") ||
            lower.includes("nude") ||
            lower.includes("topless") ||
            lower.includes("bottomless") ||
            lower.includes("nipple") ||
            lower.includes("areola") ||
            lower.includes("pussy") ||
            lower.includes("vaginal") ||
            lower.includes("clitoris") ||
            lower.includes("labia") ||
            lower.includes("cameltoe") ||
            lower.includes("penis") ||
            lower.includes("erect") ||
            lower.includes("testicle") ||
            lower.includes("spread legs") ||
            lower.includes("underboob") ||
            lower.includes("sideboob") ||
            lower.includes("ass") ||
            lower.includes("buttock") ||
            lower.includes("navel")
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
