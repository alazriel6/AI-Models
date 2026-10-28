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

// Deterministic Tag Classifier into the 10 Visual Layers
export function classifyTagTo10Layers(tag: string): string {
    const raw = tag.trim();
    // Normalize: strip outer brackets, weight indicators like (:1.2), Danbooru underscores
    const norm = raw
        .toLowerCase()
        .replace(/^[\(\[\{]+/, "")
        .replace(/[\)\]\}]+$/, "")
        .replace(/:[0-9.]+\s*$/, "")
        .replace(/_/g, " ")
        .trim();

    // 1. Pose & Body Action (Layer 7)
    // Priority: Action verbs like "sitting on bench" take priority over object "bench" or "park"
    if (
        norm.includes("sitting") ||
        norm.includes("standing") ||
        norm.includes("resting on") ||
        norm.includes("crossed legs") ||
        norm.includes("waving") ||
        norm.includes("raised hand") ||
        norm.includes("hands on hips") ||
        norm.includes("arm raised") ||
        norm.includes("arms crossed") ||
        norm.includes("leaning") ||
        norm.includes("on bed") ||
        norm.includes("on bench") ||
        norm.includes("arm support") ||
        norm.includes("pose") ||
        norm.includes("stance") ||
        norm.includes("lying") ||
        norm.includes("kneeling") ||
        norm.includes("crouching") ||
        norm.includes("jumping") ||
        norm.includes("walking") ||
        norm.includes("running") ||
        norm.includes("holding") ||
        norm.includes("drawing bow") ||
        norm.includes("aiming") ||
        norm.includes("conducting") ||
        norm.includes("hand on cheek") ||
        norm.includes("sex") ||
        norm.includes("cowgirl") ||
        norm.includes("missionary") ||
        norm.includes("doggystyle") ||
        norm.includes("straddling") ||
        norm.includes("riding") ||
        norm.includes("groping") ||
        norm.includes("paizuri") ||
        norm.includes("fellatio") ||
        norm.includes("handjob")
    ) {
        return "pose";
    }

    // 2. Lighting & Atmosphere / Effects (Layer 10)
    // Priority: "soft sunlight filtering through trees" takes priority over "trees"
    if (
        norm.includes("sunlight") ||
        norm.includes("dappled") ||
        norm.includes("atmospheric perspective") ||
        norm.includes("natural shadows") ||
        norm.includes("shadows") ||
        norm.includes("warm daylight") ||
        norm.includes("daylight") ||
        norm.includes("tranquil atmosphere") ||
        norm.includes("atmosphere") ||
        norm.includes("lighting") ||
        norm.includes("rim lighting") ||
        norm.includes("backlighting") ||
        norm.includes("backlight") ||
        norm.includes("neon lights") ||
        norm.includes("neon light") ||
        norm.includes("light rays") ||
        norm.includes("rays") ||
        norm.includes("shade") ||
        norm.includes("moonlight") ||
        norm.includes("volumetric") ||
        norm.includes("fog") ||
        norm.includes("tyndall") ||
        norm.includes("chiaroscuro") ||
        norm.includes("dust motes") ||
        norm.includes("motes") ||
        norm.includes("spores") ||
        norm.includes("fireflies") ||
        norm.includes("particles") ||
        norm.includes("lens flare") ||
        norm.includes("bokeh") ||
        norm.includes("sparkles") ||
        norm.includes("ambient light") ||
        norm.includes("god rays")
    ) {
        return "effects";
    }

    // 3. Expression & Gaze (Layer 5)
    // Priority: "looking at viewer" takes priority over camera
    if (
        norm.includes("expression") ||
        norm.includes("smile") ||
        norm.includes("grin") ||
        norm.includes("smirk") ||
        norm.includes("cheerful") ||
        norm.includes("happy") ||
        norm.includes("serious") ||
        norm.includes("parted lips") ||
        norm.includes("lips") ||
        norm.includes("open mouth") ||
        norm.includes("looking at viewer") ||
        norm.includes("looking back") ||
        norm.includes("looking away") ||
        norm.includes("looking to the side") ||
        norm.includes("looking") ||
        norm.includes("eye contact") ||
        norm.includes("closed eyes") ||
        norm.includes("wink") ||
        norm.includes("blinking") ||
        norm.includes("gaze") ||
        norm.includes("ahegao") ||
        norm.includes("heart eyes") ||
        norm.includes("crying") ||
        norm.includes("frown") ||
        norm.includes("pout") ||
        norm.includes("pleasure face") ||
        norm.includes("orgasmic") ||
        norm.includes("calm expression") ||
        norm.includes("head tilt") ||
        norm.includes("embarrassed") ||
        norm.includes("shy expression") ||
        norm.includes("tsundere")
    ) {
        return "expression";
    }

    // 4. Camera & Framing (Layer 8)
    if (
        norm === "full body" ||
        norm.includes("body shot") ||
        norm.includes("upper body") ||
        norm.includes("cowboy shot") ||
        norm.includes("portrait") ||
        norm.includes("close-up") ||
        norm.includes("close up") ||
        norm.includes("wide shot") ||
        norm.includes("distant shot") ||
        norm.includes("environmental portrait") ||
        norm.includes("eye level") ||
        norm.includes("three-quarter view") ||
        norm.includes("three quarter view") ||
        norm.includes("from side") ||
        norm.includes("from behind") ||
        norm.includes("front view") ||
        norm.includes("from above") ||
        norm.includes("from below") ||
        norm.includes("dutch angle") ||
        norm.includes("cinematic composition") ||
        norm.includes("composition") ||
        norm.includes("depth of field") ||
        norm.includes("camera") ||
        norm.includes("angle") ||
        norm.includes("pov") ||
        norm.includes("full length view") ||
        norm.includes("leading lines") ||
        norm.includes("tilted")
    ) {
        return "camera";
    }

    // 5. Quality & Art Style (Layer 1)
    if (
        norm.includes("masterpiece") ||
        norm.includes("best quality") ||
        norm.includes("amazing quality") ||
        norm.includes("very aesthetic") ||
        norm.includes("aesthetic") ||
        norm.includes("newest") ||
        norm.includes("absurdres") ||
        norm.includes("highres") ||
        norm.includes("ultra-detailed") ||
        norm.includes("screencap") ||
        norm.includes("anime screencap") ||
        norm.includes("illustration") ||
        norm.includes("japanese anime style") ||
        norm.includes("anime style") ||
        norm.includes("lineart") ||
        norm.includes("cel shading") ||
        norm.includes("vibrant natural colors") ||
        norm.includes("vibrant") ||
        norm.includes("colors") ||
        norm.includes("hand-drawn") ||
        norm.includes("character details") ||
        norm.includes("details") ||
        norm.includes("flat color") ||
        norm.includes("anime coloring") ||
        norm.includes("anime_coloring") ||
        norm.includes("score_") ||
        norm.includes("rating:") ||
        norm.includes("nsfw") ||
        norm.includes("explicit") ||
        norm.includes("uncensored") ||
        norm.includes("censorship") ||
        norm.includes("suggestive") ||
        norm.includes("erotic") ||
        norm.includes("8k") ||
        norm.includes("4k") ||
        norm.includes("resolution")
    ) {
        return "quality";
    }

    // 6. Background & Environment (Layer 9)
    if (
        norm.includes("background") ||
        norm.includes("scenery") ||
        norm.includes("landscape") ||
        norm.includes("office") ||
        norm.includes("seminar office") ||
        norm.includes("classroom") ||
        norm.includes("washitsu") ||
        norm.includes("tatami") ||
        norm.includes("forest") ||
        norm.includes("jungle") ||
        norm.includes("park") ||
        norm.includes("pathway") ||
        norm.includes("foliage") ||
        norm.includes("leaves") ||
        norm.includes("trees") ||
        norm.includes("tree") ||
        norm.includes("outdoors") ||
        norm.includes("outdoor") ||
        norm.includes("indoors") ||
        norm.includes("indoor") ||
        norm.includes("cathedral") ||
        norm.includes("ruins") ||
        norm.includes("rooftop") ||
        norm.includes("cityscape") ||
        norm.includes("city lights") ||
        norm.includes("sky") ||
        norm.includes("clouds") ||
        norm.includes("waterfall") ||
        norm.includes("beach") ||
        norm.includes("ocean") ||
        norm.includes("street") ||
        norm.includes("hallway") ||
        norm.includes("corridor") ||
        norm.includes("garden") ||
        norm.includes("building") ||
        norm.includes("window") ||
        norm.includes("sliding door") ||
        norm.includes("desks") ||
        norm.includes("desk") ||
        norm.includes("benches") ||
        norm.includes("bench") ||
        norm.includes("bed")
    ) {
        return "background";
    }

    // 7. Clothing, Outfit & Accessories (Layer 6) - explicitly includes blazer, necktie, hoodie, etc.
    if (
        norm.includes("hoodie") ||
        norm.includes("shirt") ||
        norm.includes("blazer") ||
        norm.includes("jacket") ||
        norm.includes("necktie") ||
        norm.includes("tie") ||
        norm.includes("leggings") ||
        norm.includes("sneakers") ||
        norm.includes("shoes") ||
        norm.includes("boots") ||
        norm.includes("heels") ||
        norm.includes("loafers") ||
        norm.includes("casual outfit") ||
        norm.includes("outfit") ||
        norm.includes("dogi") ||
        norm.includes("belt") ||
        norm.includes("pants") ||
        norm.includes("shorts") ||
        norm.includes("jeans") ||
        norm.includes("dress") ||
        norm.includes("skirt") ||
        norm.includes("thighhighs") ||
        norm.includes("thigh-highs") ||
        norm.includes("stockings") ||
        norm.includes("socks") ||
        norm.includes("garter") ||
        norm.includes("sleeves") ||
        norm.includes("gloves") ||
        norm.includes("choker") ||
        norm.includes("necklace") ||
        norm.includes("corset") ||
        norm.includes("tunic") ||
        norm.includes("capelet") ||
        norm.includes("cape") ||
        norm.includes("swimsuit") ||
        norm.includes("bikini") ||
        norm.includes("lingerie") ||
        norm.includes("bra") ||
        norm.includes("panties") ||
        norm.includes("underwear") ||
        norm.includes("uniform") ||
        norm.includes("suit") ||
        norm.includes("apron") ||
        norm.includes("leotard") ||
        norm.includes("bodysuit") ||
        norm.includes("cutout") ||
        norm.includes("pelvic curtain") ||
        norm.includes("see-through") ||
        norm.includes("clothes") ||
        norm.includes("clothing") ||
        norm.includes("robe") ||
        norm.includes("cloak") ||
        norm.includes("scarf")
    ) {
        return "outfit";
    }

    // 8. Character & Head Identity (Layer 2) - strictly head, face features, character identity
    if (
        norm === "1girl" ||
        norm === "solo" ||
        norm === "1boy" ||
        norm === "2girls" ||
        norm === "2boys" ||
        norm.includes("girls") ||
        norm.includes("boys") ||
        norm.includes("young adult woman") ||
        norm.includes("beautiful anime girl") ||
        norm.includes("woman") ||
        norm.includes("girl") ||
        norm.includes("female") ||
        norm.includes("male") ||
        norm.includes("rio tsukatsuki") ||
        norm.includes("tsukatsuki rio") ||
        norm.includes("rin tohsaka") ||
        norm.includes("tohsaka rin") ||
        norm.includes("hair") ||
        norm.includes("ponytail") ||
        norm.includes("twintails") ||
        norm.includes("braid") ||
        norm.includes("bangs") ||
        norm.includes("ahoge") ||
        norm.includes("updo") ||
        norm.includes("tendrils") ||
        norm.includes("hairclip") ||
        norm.includes("hair ribbon") ||
        norm.includes("hair ornament") ||
        norm.includes("hair flower") ||
        norm.includes("hairband") ||
        norm.includes("headband") ||
        norm.includes("eyes") ||
        norm.includes("halo") ||
        norm.includes("ears") ||
        norm.includes("horns")
    ) {
        return "identity";
    }

    // 9. Character Details & Physical Effects (Layer 4)
    if (
        norm.includes("sweat") ||
        norm.includes("sweatdrops") ||
        norm.includes("blush") ||
        norm.includes("shiny skin") ||
        norm.includes("pale skin") ||
        norm.includes("skin") ||
        norm.includes("tan") ||
        norm.includes("wet") ||
        norm.includes("freckles") ||
        norm.includes("glowing eyes") ||
        norm.includes("floating hair") ||
        norm.includes("wind") ||
        norm.includes("breathing") ||
        norm.includes("battle damage") ||
        norm.includes("saliva") ||
        norm.includes("drool") ||
        norm.includes("cum") ||
        norm.includes("precum")
    ) {
        return "details";
    }

    // 10. Body Proportions & Anatomy (Layer 3)
    if (
        norm === "slender" ||
        norm.includes("slender") ||
        norm === "tall" ||
        norm.includes("tall female") ||
        norm.includes("petite") ||
        norm.includes("breasts") ||
        norm.includes("breast") ||
        norm.includes("cleavage") ||
        norm.includes("hips") ||
        norm.includes("thighs") ||
        norm.includes("legs") ||
        norm.includes("fingers") ||
        norm.includes("five fingers") ||
        norm.includes("5 fingers") ||
        norm.includes("slender waist") ||
        norm.includes("waist") ||
        norm.includes("navel") ||
        norm.includes("bare shoulders") ||
        norm.includes("bare legs") ||
        norm.includes("bare arms") ||
        norm.includes("hourglass figure") ||
        norm.includes("figure") ||
        norm.includes("athletic build") ||
        norm.includes("toned stomach") ||
        norm.includes("stomach") ||
        norm.includes("hands") ||
        norm.includes("nails") ||
        norm.includes("thigh gap") ||
        norm.includes("underboob") ||
        norm.includes("sideboob") ||
        norm.includes("nipple") ||
        norm.includes("areola") ||
        norm.includes("pussy") ||
        norm.includes("ass") ||
        norm.includes("buttocks") ||
        norm.includes("spread legs") ||
        norm.includes("cameltoe") ||
        norm.includes("penis")
    ) {
        return "proportions";
    }

    // Fallback: Check environment tokens first, then default to outfit (Layer 6)
    if (
        norm.includes("wall") ||
        norm.includes("floor") ||
        norm.includes("ground") ||
        norm.includes("table") ||
        norm.includes("chair") ||
        norm.includes("nature") ||
        norm.includes("water") ||
        norm.includes("tree") ||
        norm.includes("plant") ||
        norm.includes("flower")
    ) {
        return "background";
    }

    // Default safe fallback: Layer 6 (Outfit/Accessory) so NO tag is lost and Layer 2 is NEVER polluted
    return "outfit";
}

// Deconstruct and accurately classify raw prompt text into the 10 visual modular layers
export const deconstructPromptTo10Layers = (
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

    let textWithoutLora = rawText.replace(/\r\n/g, "\n");
    let detectedLora: { name: string; weight: number } | undefined;

    // 1. Extract LoRA Pattern: <lora:name:weight>
    const loraRegex = /<lora:([^:>]+)(?::([0-9.]+))?>/gi;
    let match: RegExpExecArray | null;
    while ((match = loraRegex.exec(rawText)) !== null) {
        if (!detectedLora) {
            detectedLora = {
                name: match[1].trim(),
                weight: match[2] ? parseFloat(match[2]) || 0.85 : 0.85,
            };
        }
    }
    // Remove LoRA tokens from remaining prompt text
    textWithoutLora = textWithoutLora.replace(loraRegex, "");

    const rawTokens = textWithoutLora
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

    let classifiedCount = 0;
    if (detectedLora) {
        classifiedCount++;
    }

    rawTokens.forEach((token) => {
        const targetLayer = classifyTagTo10Layers(token);
        if (bucketArrays[targetLayer]) {
            bucketArrays[targetLayer].push(token);
            classifiedCount++;
        } else {
            bucketArrays.outfit.push(token);
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
        totalTags: rawTokens.length + (detectedLora ? 1 : 0),
        classifiedCount,
    };
};

// Backward-compatible alias for existing callers
export const deconstructPromptText = deconstructPromptTo10Layers;
