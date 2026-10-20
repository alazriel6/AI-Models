import { useState, useMemo, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../style/NegativeVault.css";
import {
  getNegativePresetsApi,
  createNegativePresetApi,
  deleteNegativePresetApi,
  getEmbeddingsApi,
  createEmbeddingApi,
  deleteEmbeddingApi,
} from "../../api/negativeVault";

// ============================================================================
// Types & Interfaces
// ============================================================================

export type BaseArchitecture = "SDXL" | "Pony" | "Illustrious" | "SD 1.5" | "Flux";
export type SyntaxFormat = "standard" | "a1111" | "comfyui" | "novelai";

interface TagModule {
  id: string;
  name: string;
  description: string;
  defaultWeight: number;
  weight: number;
  enabled: boolean;
  tags: { text: string; enabled: boolean }[];
}

interface PresetBundle {
  id: string;
  title: string;
  architecture: BaseArchitecture;
  category: "General" | "Anatomy" | "Photorealism" | "Anime" | "Minimal";
  description: string;
  prompt: string;
  recommendedCFG: string;
  tags: string[];
  isSystem?: boolean;
}

interface EmbeddingItem {
  id: string;
  name: string;
  filename: string;
  architecture: "SD 1.5" | "SDXL" | "Pony";
  filesize: string;
  description: string;
  a1111Trigger: string;
  comfyTrigger: string;
  downloadUrl: string;
  suppressedTags: string[];
  isSystem?: boolean;
}

interface CustomPreset {
  id: string;
  title: string;
  architecture: BaseArchitecture;
  prompt: string;
  createdAt: number;
}

// ============================================================================
// Default Datasets
// ============================================================================

const DEFAULT_MODULES: TagModule[] = [
  {
    id: "quality",
    name: "Kualitas & Artefak Buruk",
    description: "Mencegah kompresi JPEG, gambar pecah, blur, dan degradasi visual",
    defaultWeight: 1.2,
    weight: 1.2,
    enabled: true,
    tags: [
      { text: "worst quality", enabled: true },
      { text: "low quality", enabled: true },
      { text: "normal quality", enabled: true },
      { text: "lowres", enabled: true },
      { text: "jpeg artifacts", enabled: true },
      { text: "blurry", enabled: true },
      { text: "grainy", enabled: true },
      { text: "bad quality", enabled: false },
    ],
  },
  {
    id: "anatomy",
    name: "Anatomi, Tangan & Wajah",
    description: "Mencegah jari lebur, tangan mutasi, anggota tubuh berlebih, dan wajah miring",
    defaultWeight: 1.3,
    weight: 1.3,
    enabled: true,
    tags: [
      { text: "bad anatomy", enabled: true },
      { text: "bad hands", enabled: true },
      { text: "missing fingers", enabled: true },
      { text: "extra digits", enabled: true },
      { text: "fewer digits", enabled: true },
      { text: "mutated hands", enabled: true },
      { text: "poorly drawn hands", enabled: true },
      { text: "poorly drawn face", enabled: true },
      { text: "fused fingers", enabled: true },
      { text: "extra limbs", enabled: true },
      { text: "missing limbs", enabled: false },
      { text: "malformed limbs", enabled: false },
    ],
  },
  {
    id: "style_cleaner",
    name: "Pembersih Gaya (Anti-3D / Anime Murni)",
    description: "Mencegah efek CGI 3D plastik bocor ke ilustrasi 2D anime",
    defaultWeight: 1.1,
    weight: 1.1,
    enabled: false,
    tags: [
      { text: "3d", enabled: true },
      { text: "3d render", enabled: true },
      { text: "cgi", enabled: true },
      { text: "sketch", enabled: true },
      { text: "traditional media", enabled: false },
      { text: "monochrome", enabled: false },
      { text: "greyscale", enabled: false },
      { text: "realistic", enabled: true },
      { text: "photorealistic", enabled: true },
      { text: "octane render", enabled: false },
    ],
  },
  {
    id: "photorealism_cleaner",
    name: "Tekstur Realistis (Anti-Kartun & Anti-Plastik)",
    description: "Khusus fotografi & realism: mencegah kulit plastik, airbrushed, dan wajah boneka",
    defaultWeight: 1.2,
    weight: 1.2,
    enabled: false,
    tags: [
      { text: "cartoon", enabled: true },
      { text: "anime", enabled: true },
      { text: "drawing", enabled: true },
      { text: "painting", enabled: true },
      { text: "plastic skin", enabled: true },
      { text: "doll", enabled: true },
      { text: "airbrushed", enabled: true },
      { text: "oversaturated", enabled: true },
      { text: "smooth skin", enabled: false },
      { text: "fake skin", enabled: false },
    ],
  },
  {
    id: "watermarks",
    name: "Watermark, Teks & Tanda Tangan",
    description: "Menghilangkan teks otomatis, logo platform, watermark website, dan tanda tangan artis",
    defaultWeight: 1.0,
    weight: 1.0,
    enabled: true,
    tags: [
      { text: "watermark", enabled: true },
      { text: "text", enabled: true },
      { text: "signature", enabled: true },
      { text: "username", enabled: true },
      { text: "logo", enabled: true },
      { text: "artist name", enabled: true },
      { text: "copyright notice", enabled: false },
      { text: "banner", enabled: false },
    ],
  },
  {
    id: "composition",
    name: "Komposisi & Duplikasi",
    description: "Mencegah karakter terpotong tidak wajar, duplikasi klon, dan perspektif rusak",
    defaultWeight: 1.0,
    weight: 1.0,
    enabled: false,
    tags: [
      { text: "bad perspective", enabled: true },
      { text: "cropped", enabled: true },
      { text: "out of frame", enabled: true },
      { text: "cut off", enabled: true },
      { text: "duplicate", enabled: true },
      { text: "multiple views", enabled: false },
      { text: "cluttered background", enabled: false },
    ],
  },
  {
    id: "nsfw_blocker",
    name: "Blokir Konten Dewasa (SFW Enforcer)",
    description: "Memaksa model agar tidak menghasilkan pose vulgar atau ketelanjangan tidak sengaja",
    defaultWeight: 1.4,
    weight: 1.4,
    enabled: false,
    tags: [
      { text: "nsfw", enabled: true },
      { text: "nude", enabled: true },
      { text: "cleavage", enabled: true },
      { text: "suggestive", enabled: true },
      { text: "explicit", enabled: true },
      { text: "gore", enabled: true },
    ],
  },
];

const PRESET_BUNDLES: PresetBundle[] = [
  {
    id: "sdxl-clean-anime",
    title: "SDXL Anime Crisp Quality",
    architecture: "SDXL",
    category: "Anime",
    description: "Paket standar optimal untuk model SDXL anime seperti Animagine XL, CounterfeitXL, dan BluePencil. Menjaga kontras tajam tanpa membuat gambar pucat.",
    prompt: "worst quality, low quality, normal quality, lowres, bad anatomy, bad hands, missing fingers, extra digits, fewer digits, mutated hands, 3d, realistic, photorealistic, watermark, text, signature, blurry",
    recommendedCFG: "5.0 - 7.0",
    tags: ["SDXL", "Anime", "2D Clean", "Anatomy"],
  },
  {
    id: "pony-score-standard",
    title: "Pony Diffusion Score Optimizer",
    architecture: "Pony",
    category: "General",
    description: "Format negative khusus Pony v6. Memanfaatkan token skor rendah untuk membuang artefak tanpa merusak saturasi warna dan dynamic range.",
    prompt: "score_4, score_5, score_6, source_furry, ugly, bad anatomy, bad hands, missing fingers, extra digit, fewer digits, mutated hands, 3d render, watermark, text, signature",
    recommendedCFG: "5.5 - 6.5",
    tags: ["Pony", "Score System", "Anime", "Zero Furry"],
  },
  {
    id: "pony-heavy-cleanup",
    title: "Pony Extreme 2D Purifier",
    architecture: "Pony",
    category: "Anime",
    description: "Mencegah rendering 3D, CGI lebur, dan artefak 3D style-bleed yang sering muncul pada checkpoint turunan Pony.",
    prompt: "score_4, score_5, score_6, source_furry, 3d, realistic, photorealistic, bad anatomy, bad hands, mutated hands, missing fingers, extra digits, censored, mosaic censoring, watermark, signature",
    recommendedCFG: "5.0 - 6.0",
    tags: ["Pony", "2D Purifier", "Strict Flat"],
  },
  {
    id: "sdxl-photorealism",
    title: "SDXL Cinematic & Photorealism",
    architecture: "SDXL",
    category: "Photorealism",
    description: "Menghilangkan efek boneka plastik, kulit lilin airbrushed, dan kartun untuk menghasilkan tekstur pori-pori kulit nyata pada Juggernaut XL, RealVisXL, dsb.",
    prompt: "cartoon, anime, 3d render, illustration, drawing, painting, plastic skin, doll, airbrushed, oversaturated, deformed, bad eyes, bad hands, missing fingers, extra digits, watermark, text, signature, lowres, blurry",
    recommendedCFG: "4.5 - 6.0",
    tags: ["SDXL", "Realism", "Photorealistic", "Skin Texture"],
  },
  {
    id: "illustrious-clean",
    title: "Illustrious / NoobAI Anime Clean",
    architecture: "Illustrious",
    category: "Anime",
    description: "Disesuaikan untuk arsitektur Illustrious-XL. Mempertahankan garis lineart tajam dan cel-shading bersih dengan bobot moderat.",
    prompt: "worst quality, low quality, bad anatomy, bad hands, missing fingers, extra digits, fewer digits, mutated hands, poorly drawn face, 3d, photorealistic, watermark, text, signature, cropped, lowres",
    recommendedCFG: "5.0 - 7.0",
    tags: ["Illustrious", "NoobAI", "Anime Clean"],
  },
  {
    id: "sd15-universal-master",
    title: "SD 1.5 Universal Hand & Quality Guard",
    architecture: "SD 1.5",
    category: "Anatomy",
    description: "Negative prompt legendaris dan paling seimbang untuk Stable Diffusion 1.5 klasik. Mengatasi 95% cacat tangan dan artefak blur.",
    prompt: "(worst quality, low quality:1.4), (bad anatomy, bad hands:1.3), (missing fingers, extra digit, fewer digits:1.2), mutated hands, poorly drawn face, blurry, text, watermark, signature, username",
    recommendedCFG: "7.0 - 8.0",
    tags: ["SD 1.5", "Classic", "Universal", "Heavy Hands"],
  },
  {
    id: "flux-minimalist",
    title: "Flux.1 Clean Minimalist",
    architecture: "Flux",
    category: "Minimal",
    description: "Flux dilatih dengan Flow Matching dan bekerja optimal TANPA negative panjang. Gunakan preset ultra-minimalis ini hanya bila diperlukan penekanan khusus.",
    prompt: "blurry, low quality, distorted, deformed, text, watermark",
    recommendedCFG: "3.0 - 3.5 (Guidance)",
    tags: ["Flux", "Flow Matching", "Ultra Minimal"],
  },
];

const EMBEDDING_DIRECTORY: EmbeddingItem[] = [
  {
    id: "easy-negative",
    name: "EasyNegative",
    filename: "EasyNegative.pt",
    architecture: "SD 1.5",
    filesize: "24.5 KB",
    description: "Embedding paling populer sepanjang sejarah SD 1.5. Dibuat oleh Counterfeit team. Membersihkan latar belakang, warna kusam, dan wajah miring secara otomatis.",
    a1111Trigger: "EasyNegative",
    comfyTrigger: "embedding:EasyNegative",
    downloadUrl: "https://huggingface.co/datasets/gsdf/EasyNegative",
    suppressedTags: ["bad quality", "ugly", "blurry", "bad eyes", "dull colors"],
  },
  {
    id: "badhandv4",
    name: "badhandv4",
    filename: "badhandv4.pt",
    architecture: "SD 1.5",
    filesize: "25.0 KB",
    description: "Embedding spesifik anatomi jari dan tangan. Melatih model mengenali jari yang menempel (fused fingers) dan jari keenam untuk langsung dieliminasi.",
    a1111Trigger: "badhandv4",
    comfyTrigger: "embedding:badhandv4",
    downloadUrl: "https://civitai.com/models/25396/badhandv4-anime-screencap-style",
    suppressedTags: ["mutated hands", "fused fingers", "extra digits", "bad thumbs"],
  },
  {
    id: "negative-hand",
    name: "negative_hand Negative Embedding",
    filename: "negative_hand.pt",
    architecture: "SD 1.5",
    filesize: "28.0 KB",
    description: "Embedding perbaikan tangan fotorealistik dan semi-realis. Sangat efektif digunakan pada checkpoint SD 1.5 realism tanpa membuat warna kulit memudar.",
    a1111Trigger: "negative_hand",
    comfyTrigger: "embedding:negative_hand",
    downloadUrl: "https://civitai.com/models/56519/negativehand-negative-embedding",
    suppressedTags: ["missing fingers", "webbed fingers", "broken wrists"],
  },
  {
    id: "bad-artist",
    name: "bad-artist / bad-artist-anime",
    filename: "bad-artist.pt",
    architecture: "SD 1.5",
    filesize: "32.0 KB",
    description: "Menekan gaya amatir, garis goresan pensil kasar yang tidak diinginkan, dan proporsi tubuh yang asimetris.",
    a1111Trigger: "bad-artist",
    comfyTrigger: "embedding:bad-artist",
    downloadUrl: "https://huggingface.co/nick-x-hkr/bad-artist",
    suppressedTags: ["rough sketch", "amateur art", "bad lineart", "uneven face"],
  },
  {
    id: "deep-negative",
    name: "Deep Negative V1.x",
    filename: "ng_deepnegative_v1_75t.pt",
    architecture: "SD 1.5",
    filesize: "28.0 KB",
    description: "Embedding dalam berisi 75 token vektor negatif. Sangat kuat untuk menolak mutasi anatomi ekstrem pada resolusi tinggi.",
    a1111Trigger: "ng_deepnegative_v1_75t",
    comfyTrigger: "embedding:ng_deepnegative_v1_75t",
    downloadUrl: "https://civitai.com/models/4629/deep-negative-v1x",
    suppressedTags: ["severe mutation", "two heads", "disfigured body", "nightmare anatomy"],
  },
  {
    id: "boring-e621",
    name: "boring_e621_v4 (Pony/SDXL)",
    filename: "boring_e621_v4.safetensors",
    architecture: "Pony",
    filesize: "128 KB",
    description: "Embedding terpopuler untuk checkpoint Pony Diffusion. Membantu membersihkan background membosankan, pose statis, dan artefak score rendah.",
    a1111Trigger: "embedding:boring_e621_v4",
    comfyTrigger: "embedding:boring_e621_v4",
    downloadUrl: "https://civitai.com/models/414432",
    suppressedTags: ["flat lighting", "simple background", "stiff pose", "lowres"],
  },
  {
    id: "cyberrealistic-neg",
    name: "CyberRealistic Negative (SDXL / 1.5)",
    filename: "CyberRealistic_Negative-v1.pt",
    architecture: "SDXL",
    filesize: "48 KB",
    description: "Khusus fotografi nyata. Mencegah efek CGI, kulit lilin, dan artefak pencahayaan berlebih pada potret orang.",
    a1111Trigger: "CyberRealistic_Negative-v1",
    comfyTrigger: "embedding:CyberRealistic_Negative-v1",
    downloadUrl: "https://civitai.com/models/15003/cyberrealistic-negative",
    suppressedTags: ["cgi skin", "plastic sheen", "oversmoothed", "fake reflections"],
  },
  {
    id: "fast-negative",
    name: "FastNegativeEmbedding",
    filename: "FastNegativeEmbedding.pt",
    architecture: "SD 1.5",
    filesize: "18.0 KB",
    description: "Embedding serbaguna ringan yang menggabungkan koreksi kualitas dan anatomi dengan dampak minimal pada kecepatan render.",
    a1111Trigger: "FastNegativeEmbedding",
    comfyTrigger: "embedding:FastNegativeEmbedding",
    downloadUrl: "https://civitai.com/models/71961/fastnegativeembedding",
    suppressedTags: ["low quality", "bad fingers", "washed out"],
  },
];

// ============================================================================
// Main Component
// ============================================================================

export default function NegativeVault() {
  const navigate = useNavigate();

  // Active Tab
  const [activeTab, setActiveTab] = useState<"builder" | "presets" | "embeddings" | "guide">("builder");

  // Builder State
  const [targetArch, setTargetArch] = useState<BaseArchitecture>("SDXL");
  const [syntaxFormat, setSyntaxFormat] = useState<SyntaxFormat>("standard");
  const [modules, setModules] = useState<TagModule[]>(DEFAULT_MODULES);
  const [newTagInput, setNewTagInput] = useState<{ [moduleId: string]: string }>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Presets & Filter State
  const [presetList, setPresetList] = useState<PresetBundle[]>(PRESET_BUNDLES);
  const [presetSearch, setPresetSearch] = useState("");
  const [presetArchFilter, setPresetArchFilter] = useState<string>("all");
  const [presetCatFilter, setPresetCatFilter] = useState<string>("all");
  const [isDbSynced, setIsDbSynced] = useState<boolean>(false);

  // Embedding Search State
  const [embeddingList, setEmbeddingList] = useState<EmbeddingItem[]>(EMBEDDING_DIRECTORY);
  const [embSearch, setEmbSearch] = useState("");
  const [embArchFilter, setEmbArchFilter] = useState<string>("all");

  // Modals for Adding Preset & Embedding
  const [showAddPresetModal, setShowAddPresetModal] = useState(false);
  const [showAddEmbModal, setShowAddEmbModal] = useState(false);
  const [presetForm, setPresetForm] = useState({
    title: "",
    architecture: "SDXL" as BaseArchitecture,
    category: "General" as "General" | "Anatomy" | "Photorealism" | "Anime" | "Minimal",
    description: "",
    prompt: "",
    recommendedCFG: "5.0 - 7.0",
    tags: "",
  });
  const [embForm, setEmbForm] = useState({
    name: "",
    filename: "",
    architecture: "SD 1.5" as "SD 1.5" | "SDXL" | "Pony",
    filesize: "",
    description: "",
    a1111Trigger: "",
    comfyTrigger: "",
    downloadUrl: "",
    suppressedTags: "",
  });

  // Custom User Presets
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(() => {
    try {
      const saved = localStorage.getItem("models_guide_negative_presets");
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });
  const [newPresetTitle, setNewPresetTitle] = useState("");

  // Sync data from Go backend on mount
  useEffect(() => {
    let mounted = true;
    Promise.allSettled([getNegativePresetsApi(), getEmbeddingsApi()]).then(([pRes, eRes]) => {
      if (!mounted) return;
      let hasData = false;

      if (pRes.status === "fulfilled" && pRes.value && pRes.value.length > 0) {
        const mapped: PresetBundle[] = pRes.value.map((p) => ({
          id: String(p.id),
          title: p.title,
          architecture: (p.architecture as BaseArchitecture) || "SDXL",
          category: (p.category as any) || "General",
          description: p.description,
          prompt: p.prompt,
          recommendedCFG: p.recommended_cfg || "4.5 - 7.0",
          tags: p.tags ? p.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
          isSystem: p.is_system,
        }));
        setPresetList(mapped);
        hasData = true;
      }

      if (eRes.status === "fulfilled" && eRes.value && eRes.value.length > 0) {
        const mappedEmb: EmbeddingItem[] = eRes.value.map((e) => ({
          id: String(e.id),
          name: e.name,
          filename: e.filename,
          architecture: (e.architecture as any) || "SD 1.5",
          filesize: e.filesize,
          description: e.description,
          a1111Trigger: e.a1111_trigger,
          comfyTrigger: e.comfy_trigger,
          downloadUrl: e.download_url,
          suppressedTags: e.suppressed_tags ? e.suppressed_tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
          isSystem: e.is_system,
        }));
        setEmbeddingList(mappedEmb);
        hasData = true;
      }

      if (hasData) {
        setIsDbSynced(true);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const triggerToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 2200);
  }, []);

  const copyToClipboard = useCallback(
    (text: string, key: string, label: string) => {
      if (!text) return;
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopiedKey(key);
          triggerToast(`Berhasil menyalin ${label}!`);
          setTimeout(() => setCopiedKey(null), 1800);
        })
        .catch(() => {
          triggerToast(`Gagal menyalin ${label}`);
        });
    },
    [triggerToast]
  );

  // Sync Architecture recommendation to modules
  const handleSelectArchitecture = (arch: BaseArchitecture) => {
    setTargetArch(arch);
    setModules((prev) =>
      prev.map((mod) => {
        if (arch === "Pony") {
          if (mod.id === "style_cleaner") return { ...mod, enabled: true, weight: 1.1 };
          if (mod.id === "photorealism_cleaner") return { ...mod, enabled: false };
        } else if (arch === "Flux") {
          if (mod.id === "anatomy" || mod.id === "style_cleaner") return { ...mod, enabled: false };
        }
        return mod;
      })
    );
    triggerToast(`Arsitektur disesuaikan ke ${arch}`);
  };

  // Toggle Module
  const handleToggleModule = (modId: string) => {
    setModules((prev) =>
      prev.map((m) => (m.id === modId ? { ...m, enabled: !m.enabled } : m))
    );
  };

  // Change Module Weight
  const handleWeightChange = (modId: string, delta: number) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.id === modId) {
          const next = Math.max(0.5, Math.min(2.0, parseFloat((m.weight + delta).toFixed(1))));
          return { ...m, weight: next };
        }
        return m;
      })
    );
  };

  // Toggle Tag in Module
  const handleToggleTag = (modId: string, tagText: string) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.id === modId) {
          return {
            ...m,
            tags: m.tags.map((t) =>
              t.text === tagText ? { ...t, enabled: !t.enabled } : t
            ),
          };
        }
        return m;
      })
    );
  };

  // Add custom tag to module
  const handleAddCustomTag = (modId: string) => {
    const input = (newTagInput[modId] || "").trim().replace(/^,+|,+$/g, "");
    if (!input) return;

    setModules((prev) =>
      prev.map((m) => {
        if (m.id === modId) {
          const exists = m.tags.some((t) => t.text.toLowerCase() === input.toLowerCase());
          if (exists) return m;
          return {
            ...m,
            tags: [...m.tags, { text: input, enabled: true }],
          };
        }
        return m;
      })
    );

    setNewTagInput((prev) => ({ ...prev, [modId]: "" }));
    triggerToast(`Tag "#${input}" ditambahkan`);
  };

  // Build the compiled negative prompt string
  const compiledPrompt = useMemo(() => {
    const chunks: string[] = [];

    modules.forEach((mod) => {
      if (!mod.enabled) return;
      const activeTags = mod.tags.filter((t) => t.enabled).map((t) => t.text);
      if (activeTags.length === 0) return;

      const tagList = activeTags.join(", ");

      if (mod.weight === 1.0 || syntaxFormat === "standard") {
        chunks.push(tagList);
      } else if (syntaxFormat === "a1111") {
        chunks.push(`(${tagList}:${mod.weight})`);
      } else if (syntaxFormat === "comfyui") {
        chunks.push(`(${tagList}:${mod.weight})`);
      } else if (syntaxFormat === "novelai") {
        const diff = mod.weight - 1.0;
        if (diff > 0.1) {
          chunks.push(`{${tagList}}`);
        } else if (diff < -0.1) {
          chunks.push(`[${tagList}]`);
        } else {
          chunks.push(tagList);
        }
      }
    });

    return chunks.join(", ");
  }, [modules, syntaxFormat]);

  // Approximate Token Calculation (SD CLIP 75/77 token blocks)
  const tokenMetrics = useMemo(() => {
    if (!compiledPrompt.trim()) return { count: 0, chunk: 1, percent: 0 };
    // Rough estimate: words + punctuation
    const words = compiledPrompt.trim().split(/\s+/).length;
    const punctuation = (compiledPrompt.match(/[,()\[\]{}:]/g) || []).length;
    const estTokens = Math.max(1, Math.round(words * 1.15 + punctuation * 0.4));
    const chunk = Math.ceil(estTokens / 75);
    const percent = Math.min(100, Math.round(((estTokens % 75 || 75) / 75) * 100));

    return { count: estTokens, chunk, percent };
  }, [compiledPrompt]);

  // Save to Custom Presets (attempts Backend API, with local fallback)
  const handleSaveToCustom = async () => {
    if (!compiledPrompt.trim()) {
      triggerToast("Prompt negatif masih kosong");
      return;
    }

    const title = (newPresetTitle.trim() || `Custom Negative (${targetArch})`).slice(0, 40);

    try {
      const res = await createNegativePresetApi({
        title,
        architecture: targetArch,
        category: "General",
        description: `Dibuat dari Modular Mixer (${new Date().toLocaleDateString("id-ID")})`,
        prompt: compiledPrompt,
        recommended_cfg: "5.0 - 7.0",
        tags: targetArch.toLowerCase(),
        is_system: false,
      });

      const newBundle: PresetBundle = {
        id: String(res.id),
        title: res.title,
        architecture: res.architecture as BaseArchitecture,
        category: "General",
        description: res.description,
        prompt: res.prompt,
        recommendedCFG: res.recommended_cfg,
        tags: [targetArch.toLowerCase()],
        isSystem: false,
      };

      setPresetList((prev) => [newBundle, ...prev]);
      setIsDbSynced(true);
      triggerToast(`Disimpan ke Database Backend: "${title}"`);
    } catch {
      // Fallback local
      const newPreset: CustomPreset = {
        id: `custom-${Date.now()}`,
        title,
        architecture: targetArch,
        prompt: compiledPrompt,
        createdAt: Date.now(),
      };
      const next = [newPreset, ...customPresets];
      setCustomPresets(next);
      try {
        localStorage.setItem("models_guide_negative_presets", JSON.stringify(next));
      } catch {
        // ignore
      }
      triggerToast(`Disimpan secara lokal: "${title}"`);
    }
    setNewPresetTitle("");
  };

  // Delete Custom Preset
  const handleDeleteCustom = async (id: string) => {
    const numericId = parseInt(id, 10);
    if (!isNaN(numericId)) {
      try {
        await deleteNegativePresetApi(numericId);
      } catch {
        // ignore
      }
      setPresetList((prev) => prev.filter((p) => p.id !== id));
    }

    const next = customPresets.filter((p) => p.id !== id);
    setCustomPresets(next);
    try {
      localStorage.setItem("models_guide_negative_presets", JSON.stringify(next));
    } catch {
      // ignore
    }
    triggerToast("Preset berhasil dihapus");
  };

  // Handle Create Preset Form Submit
  const handleCreatePresetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!presetForm.title.trim() || !presetForm.prompt.trim()) {
      triggerToast("Judul dan Prompt Negatif wajib diisi");
      return;
    }

    try {
      const created = await createNegativePresetApi({
        title: presetForm.title.trim(),
        architecture: presetForm.architecture,
        category: presetForm.category,
        description: presetForm.description.trim(),
        prompt: presetForm.prompt.trim(),
        recommended_cfg: presetForm.recommendedCFG.trim() || "5.0 - 7.0",
        tags: presetForm.tags.trim(),
        is_system: false,
      });

      const newBundle: PresetBundle = {
        id: String(created.id),
        title: created.title,
        architecture: created.architecture as BaseArchitecture,
        category: created.category as any,
        description: created.description,
        prompt: created.prompt,
        recommendedCFG: created.recommended_cfg,
        tags: created.tags ? created.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        isSystem: false,
      };

      setPresetList((prev) => [newBundle, ...prev]);
      setShowAddPresetModal(false);
      setPresetForm({
        title: "",
        architecture: "SDXL",
        category: "General",
        description: "",
        prompt: "",
        recommendedCFG: "5.0 - 7.0",
        tags: "",
      });
      triggerToast(`Preset "${created.title}" berhasil disimpan ke Database!`);
    } catch (err: any) {
      triggerToast(`Gagal menyimpan ke DB: ${err.message || "Error"}`);
    }
  };

  // Handle Delete Preset from catalog
  const handleDeletePresetFromCatalog = async (id: string, title: string) => {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      setPresetList((prev) => prev.filter((p) => p.id !== id));
      triggerToast(`Preset "${title}" dihapus`);
      return;
    }

    try {
      await deleteNegativePresetApi(numId);
      setPresetList((prev) => prev.filter((p) => p.id !== id));
      triggerToast(`Preset "${title}" dihapus dari Database`);
    } catch (err: any) {
      triggerToast(`Gagal menghapus: ${err.message || "Error"}`);
    }
  };

  // Handle Create Embedding Submit
  const handleCreateEmbeddingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!embForm.name.trim() || !embForm.filename.trim()) {
      triggerToast("Nama dan Filename embedding wajib diisi");
      return;
    }

    try {
      const created = await createEmbeddingApi({
        name: embForm.name.trim(),
        filename: embForm.filename.trim(),
        architecture: embForm.architecture,
        filesize: embForm.filesize.trim() || "15 KB",
        description: embForm.description.trim(),
        a1111_trigger: embForm.a1111Trigger.trim() || embForm.filename.replace(/\.[^/.]+$/, ""),
        comfy_trigger: embForm.comfyTrigger.trim() || `embedding:${embForm.filename.replace(/\.[^/.]+$/, "")}`,
        download_url: embForm.downloadUrl.trim(),
        suppressed_tags: embForm.suppressedTags.trim(),
        is_system: false,
      });

      const newEmb: EmbeddingItem = {
        id: String(created.id),
        name: created.name,
        filename: created.filename,
        architecture: created.architecture as any,
        filesize: created.filesize,
        description: created.description,
        a1111Trigger: created.a1111_trigger,
        comfyTrigger: created.comfy_trigger,
        downloadUrl: created.download_url,
        suppressedTags: created.suppressed_tags ? created.suppressed_tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        isSystem: false,
      };

      setEmbeddingList((prev) => [newEmb, ...prev]);
      setShowAddEmbModal(false);
      setEmbForm({
        name: "",
        filename: "",
        architecture: "SD 1.5",
        filesize: "",
        description: "",
        a1111Trigger: "",
        comfyTrigger: "",
        downloadUrl: "",
        suppressedTags: "",
      });
      triggerToast(`Embedding "${created.name}" berhasil disimpan ke Database!`);
    } catch (err: any) {
      triggerToast(`Gagal menyimpan ke DB: ${err.message || "Error"}`);
    }
  };

  // Handle Delete Embedding
  const handleDeleteEmbedding = async (id: string, name: string) => {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      setEmbeddingList((prev) => prev.filter((e) => e.id !== id));
      triggerToast(`Embedding "${name}" dihapus`);
      return;
    }

    try {
      await deleteEmbeddingApi(numId);
      setEmbeddingList((prev) => prev.filter((e) => e.id !== id));
      triggerToast(`Embedding "${name}" dihapus dari Database`);
    } catch (err: any) {
      triggerToast(`Gagal menghapus: ${err.message || "Error"}`);
    }
  };

  // Load Preset into Mixer
  const handleLoadPresetToMixer = (presetPrompt: string, arch: BaseArchitecture) => {
    setTargetArch(arch);
    // Add as a custom tag to Quality or custom module
    const tags = presetPrompt.split(",").map((s) => s.trim().replace(/^\(|\)$/g, "")).filter(Boolean);

    setModules((prev) =>
      prev.map((m) => {
        if (m.id === "quality") {
          const existingSet = new Set(m.tags.map((t) => t.text.toLowerCase()));
          const newTags = tags
            .filter((t) => !existingSet.has(t.toLowerCase()))
            .map((text) => ({ text, enabled: true }));
          return {
            ...m,
            enabled: true,
            tags: [...m.tags, ...newTags],
          };
        }
        return m;
      })
    );

    setActiveTab("builder");
    triggerToast("Preset dimuat ke dalam Mixer!");
  };

  // Send to Prompt Lab
  const handleSendToPromptLab = () => {
    if (!compiledPrompt.trim()) {
      triggerToast("Prompt negatif masih kosong");
      return;
    }
    // Store in localStorage for PromptLab to pick up or query param
    try {
      localStorage.setItem("models_guide_active_negative", compiledPrompt);
    } catch {
      // ignore
    }
    navigate(`/prompt-lab?negative=${encodeURIComponent(compiledPrompt.slice(0, 500))}`);
  };

  // Filtered Presets
  const filteredPresets = useMemo(() => {
    return presetList.filter((p) => {
      if (presetArchFilter !== "all" && p.architecture !== presetArchFilter) return false;
      if (presetCatFilter !== "all" && p.category !== presetCatFilter) return false;
      if (presetSearch.trim()) {
        const q = presetSearch.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.prompt.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [presetList, presetArchFilter, presetCatFilter, presetSearch]);

  // Filtered Embeddings
  const filteredEmbeddings = useMemo(() => {
    return embeddingList.filter((emb) => {
      if (embArchFilter !== "all" && emb.architecture !== embArchFilter) return false;
      if (embSearch.trim()) {
        const q = embSearch.toLowerCase();
        return (
          emb.name.toLowerCase().includes(q) ||
          emb.filename.toLowerCase().includes(q) ||
          emb.description.toLowerCase().includes(q) ||
          emb.suppressedTags.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [embeddingList, embArchFilter, embSearch]);

  return (
    <div className="nv-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            background: "#18181b",
            border: "1px solid #dc2626",
            color: "#f4f4f5",
            fontSize: "12px",
            fontWeight: 600,
            padding: "10px 16px",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ color: "#ef4444" }}>●</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Section */}
      <section className="nv-header">
        <div className="nv-header-left">
          <div className="nv-title-row">
            <h1 className="nv-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
              Negative Prompt &amp; Embedding Vault
            </h1>
            <span className="nv-badge">Anatomy &amp; Quality Guard</span>
          </div>
          <p className="nv-subtitle">
            Kamus kurasi, modular builder bobot token, dan direktori Textual Inversion untuk Stable Diffusion, SDXL, Pony, dan ComfyUI.
          </p>
        </div>

        <div className="nv-header-stats">
          <span className="nv-stat-item">
            <span style={{ color: isDbSynced ? "#10b981" : "#f59e0b" }}>●</span>
            <span style={{ color: isDbSynced ? "#34d399" : "#fbbf24", fontWeight: 600 }}>
              {isDbSynced ? "PostgreSQL Terhubung" : "Mode Lokal"}
            </span>
          </span>
          <span style={{ color: "#27272a" }}>|</span>
          <span className="nv-stat-item">
            <span className="nv-stat-num">{presetList.length}</span> Presets
          </span>
          <span style={{ color: "#27272a" }}>|</span>
          <span className="nv-stat-item">
            <span className="nv-stat-num">{embeddingList.length}</span> Embeddings
          </span>
        </div>
      </section>

      {/* Tabs Bar */}
      <div className="nv-tabs-bar">
        <div className="nv-tabs-group">
          <button
            type="button"
            className={`nv-tab-btn ${activeTab === "builder" ? "active" : ""}`}
            onClick={() => setActiveTab("builder")}
          >
            <span>Modular Mixer</span>
            <span className="nv-tab-pill">Builder</span>
          </button>

          <button
            type="button"
            className={`nv-tab-btn ${activeTab === "presets" ? "active" : ""}`}
            onClick={() => setActiveTab("presets")}
          >
            <span>Preset Bundles</span>
            <span className="nv-tab-pill">{PRESET_BUNDLES.length}</span>
          </button>

          <button
            type="button"
            className={`nv-tab-btn ${activeTab === "embeddings" ? "active" : ""}`}
            onClick={() => setActiveTab("embeddings")}
          >
            <span>Embedding Directory</span>
            <span className="nv-tab-pill">{EMBEDDING_DIRECTORY.length}</span>
          </button>

          <button
            type="button"
            className={`nv-tab-btn ${activeTab === "guide" ? "active" : ""}`}
            onClick={() => setActiveTab("guide")}
          >
            <span>Panduan &amp; CFG Math</span>
          </button>
        </div>

        <Link to="/prompt-lab" className="nv-btn-secondary" style={{ padding: "6px 12px", fontSize: "11px" }}>
          <span>Buka Prompt Lab →</span>
        </Link>
      </div>

      {/* ===================================================================
          TAB 1: MODULAR BUILDER & MIXER
          =================================================================== */}
      {activeTab === "builder" && (
        <div className="nv-builder-layout">
          {/* Main Column: Modules */}
          <div className="nv-builder-main">
            {/* Architecture Selector */}
            <div className="nv-arch-strip">
              <span className="nv-arch-label">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
                Target Checkpoint:
              </span>
              {(["SDXL", "Pony", "Illustrious", "SD 1.5", "Flux"] as BaseArchitecture[]).map((arch) => (
                <button
                  key={arch}
                  type="button"
                  className={`nv-arch-btn ${targetArch === arch ? "active" : ""}`}
                  onClick={() => handleSelectArchitecture(arch)}
                >
                  {arch}
                </button>
              ))}
            </div>

            {/* Modules List */}
            {modules.map((mod) => (
              <div key={mod.id} className={`nv-module-card ${mod.enabled ? "active" : ""}`}>
                <div className="nv-module-header" onClick={() => handleToggleModule(mod.id)}>
                  <div className="nv-module-title-wrap">
                    <input
                      type="checkbox"
                      className="nv-checkbox"
                      checked={mod.enabled}
                      onChange={() => handleToggleModule(mod.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div>
                      <div className="nv-module-name">{mod.name}</div>
                      <div className="nv-module-desc">{mod.description}</div>
                    </div>
                  </div>

                  <div className="nv-module-weight-control" onClick={(e) => e.stopPropagation()}>
                    <span style={{ fontSize: "11px", color: "#a1a1aa" }}>Bobot:</span>
                    <button
                      type="button"
                      className="nv-syntax-btn"
                      style={{ padding: "2px 6px" }}
                      onClick={() => handleWeightChange(mod.id, -0.1)}
                      title="Kurangi bobot (-0.1)"
                    >
                      -
                    </button>
                    <span className="nv-weight-badge">{mod.weight}×</span>
                    <button
                      type="button"
                      className="nv-syntax-btn"
                      style={{ padding: "2px 6px" }}
                      onClick={() => handleWeightChange(mod.id, 0.1)}
                      title="Tambah bobot (+0.1)"
                    >
                      +
                    </button>
                  </div>
                </div>

                {mod.enabled && (
                  <div className="nv-module-body">
                    <div className="nv-tag-chips-wrap">
                      {mod.tags.map((t) => (
                        <button
                          key={t.text}
                          type="button"
                          className={`nv-tag-chip ${t.enabled ? "selected" : ""}`}
                          onClick={() => handleToggleTag(mod.id, t.text)}
                          title={t.enabled ? "Klik untuk mengecualikan tag ini" : "Klik untuk mengaktifkan tag ini"}
                        >
                          <span>{t.text}</span>
                          <span style={{ color: t.enabled ? "#ffffff" : "#71717a", fontWeight: 700 }}>{t.enabled ? "✓" : "+"}</span>
                        </button>
                      ))}
                    </div>

                    <div className="nv-custom-tag-row">
                      <input
                        type="text"
                        className="nv-input"
                        style={{ flex: 1 }}
                        placeholder="Tambah tag khusus ke modul ini (contoh: deformed iris, extra ears)..."
                        value={newTagInput[mod.id] || ""}
                        onChange={(e) =>
                          setNewTagInput((prev) => ({ ...prev, [mod.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddCustomTag(mod.id);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="nv-btn-secondary"
                        style={{ padding: "4px 10px", fontSize: "11px" }}
                        onClick={() => handleAddCustomTag(mod.id)}
                      >
                        + Tambah
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Sidebar Column: Output & Controls */}
          <div className="nv-builder-sidebar">
            <div className="nv-output-card">
              <div className="nv-output-header">
                <span className="nv-output-title">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  Negative Output
                </span>

                <div className="nv-syntax-group">
                  <button
                    type="button"
                    className={`nv-syntax-btn ${syntaxFormat === "standard" ? "active" : ""}`}
                    onClick={() => setSyntaxFormat("standard")}
                    title="Standar CSV tanpa tanda kurung"
                  >
                    CSV
                  </button>
                  <button
                    type="button"
                    className={`nv-syntax-btn ${syntaxFormat === "a1111" ? "active" : ""}`}
                    onClick={() => setSyntaxFormat("a1111")}
                    title="Format A1111 / WebUI (tag:weight)"
                  >
                    A1111
                  </button>
                  <button
                    type="button"
                    className={`nv-syntax-btn ${syntaxFormat === "comfyui" ? "active" : ""}`}
                    onClick={() => setSyntaxFormat("comfyui")}
                    title="Format ComfyUI Conditioning"
                  >
                    Comfy
                  </button>
                  <button
                    type="button"
                    className={`nv-syntax-btn ${syntaxFormat === "novelai" ? "active" : ""}`}
                    onClick={() => setSyntaxFormat("novelai")}
                    title="Format NovelAI {tag} / [tag]"
                  >
                    NAI
                  </button>
                </div>
              </div>

              <textarea
                className="nv-output-box"
                value={compiledPrompt}
                readOnly
                placeholder="Pilih modul di sebelah kiri untuk menghasilkan prompt negatif..."
              />

              {/* CLIP Token Meter */}
              <div className="nv-meter-row">
                <div className="nv-meter-labels">
                  <span>CLIP Chunk: {tokenMetrics.chunk}</span>
                  <span>
                    ~{tokenMetrics.count} Tokens{" "}
                    {tokenMetrics.count > 75 && (
                      <span style={{ color: "#f59e0b" }}>(Chunking aktif)</span>
                    )}
                  </span>
                </div>
                <div className="nv-meter-bar-bg">
                  <div
                    className={`nv-meter-bar-fill ${
                      tokenMetrics.count > 120
                        ? "danger"
                        : tokenMetrics.count > 70
                        ? "warning"
                        : ""
                    }`}
                    style={{ width: `${tokenMetrics.percent}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="nv-btn-row">
                <button
                  type="button"
                  className="nv-btn-primary"
                  onClick={() => copyToClipboard(compiledPrompt, "mixer-copy", "Prompt Negatif")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span>{copiedKey === "mixer-copy" ? "Tersalin!" : "Salin Prompt Negatif"}</span>
                </button>

                <button
                  type="button"
                  className="nv-btn-secondary"
                  onClick={handleSendToPromptLab}
                  title="Kirim dan buka langsung di Prompt Studio & Lab"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
                    <path d="M8.5 2h7" />
                    <path d="M7 16h10" />
                  </svg>
                  <span>Inject ke Prompt Lab</span>
                </button>
              </div>

              {/* Save Preset to Vault */}
              <div style={{ borderTop: "1px solid #27272a", paddingTop: "12px", display: "flex", gap: "6px" }}>
                <input
                  type="text"
                  className="nv-input"
                  style={{ flex: 1, fontSize: "11px" }}
                  placeholder="Nama preset kustom..."
                  value={newPresetTitle}
                  onChange={(e) => setNewPresetTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveToCustom();
                  }}
                />
                <button
                  type="button"
                  className="nv-btn-secondary"
                  style={{ padding: "4px 8px", fontSize: "11px" }}
                  onClick={handleSaveToCustom}
                >
                  Simpan
                </button>
              </div>
            </div>

            {/* Custom Presets Mini Box */}
            {customPresets.length > 0 && (
              <div className="nv-output-card" style={{ gap: "10px" }}>
                <div className="nv-output-title">
                  <span>Koleksi Kustom Anda ({customPresets.length})</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "200px", overflowY: "auto" }}>
                  {customPresets.map((cp) => (
                    <div
                      key={cp.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 8px",
                        background: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: "4px",
                        fontSize: "11px",
                      }}
                    >
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: "8px" }}>
                        <span style={{ fontWeight: 600, color: "#f4f4f5" }}>{cp.title}</span>
                        <span style={{ marginLeft: "6px", color: "#a1a1aa", fontSize: "10px" }}>({cp.architecture})</span>
                      </div>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button
                          type="button"
                          className="nv-syntax-btn"
                          onClick={() => copyToClipboard(cp.prompt, cp.id, cp.title)}
                          title="Salin prompt"
                        >
                          Salin
                        </button>
                        <button
                          type="button"
                          className="nv-syntax-btn"
                          style={{ color: "#ef4444" }}
                          onClick={() => handleDeleteCustom(cp.id)}
                          title="Hapus preset"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================
          TAB 2: PRESET BUNDLES
          =================================================================== */}
      {activeTab === "presets" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Filters Bar */}
          <div className="nv-header" style={{ padding: "10px 14px" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", flex: 1, alignItems: "center" }}>
              <input
                type="text"
                className="nv-input"
                style={{ minWidth: "220px", flex: 1 }}
                placeholder="Cari preset negatif (misal: Pony, Anime, Realism, Hands)..."
                value={presetSearch}
                onChange={(e) => setPresetSearch(e.target.value)}
              />

              <select
                className="nv-input"
                value={presetArchFilter}
                onChange={(e) => setPresetArchFilter(e.target.value)}
              >
                <option value="all">Semua Arsitektur</option>
                <option value="SDXL">SDXL</option>
                <option value="Pony">Pony Diffusion</option>
                <option value="Illustrious">Illustrious</option>
                <option value="SD 1.5">SD 1.5</option>
                <option value="Flux">Flux</option>
              </select>

              <select
                className="nv-input"
                value={presetCatFilter}
                onChange={(e) => setPresetCatFilter(e.target.value)}
              >
                <option value="all">Semua Kategori</option>
                <option value="General">General</option>
                <option value="Anime">Anime 2D</option>
                <option value="Photorealism">Photorealism</option>
                <option value="Anatomy">Anatomy Fix</option>
                <option value="Minimal">Minimalist</option>
              </select>

              <button
                type="button"
                className="nv-btn-primary"
                style={{ padding: "7px 14px", fontSize: "12px", whiteSpace: "nowrap" }}
                onClick={() => setShowAddPresetModal(true)}
              >
                + Tambah Preset
              </button>
            </div>
          </div>

          {/* Presets Grid */}
          <div className="nv-catalog-grid">
            {filteredPresets.map((bundle) => (
              <div key={bundle.id} className="nv-preset-card">
                <div className="nv-preset-top">
                  <div className="nv-preset-header-row">
                    <h3 className="nv-preset-title">{bundle.title}</h3>
                    <span className="nv-preset-arch-tag">{bundle.architecture}</span>
                  </div>

                  <p className="nv-preset-desc">{bundle.description}</p>

                  <div style={{ fontSize: "11px", color: "#a1a1aa", display: "flex", gap: "6px" }}>
                    <span>Saran CFG:</span>
                    <span style={{ color: "#93c5fd", fontFamily: "ui-monospace, monospace" }}>{bundle.recommendedCFG}</span>
                  </div>

                  <div className="nv-preset-content-preview">{bundle.prompt}</div>
                </div>

                <div className="nv-preset-footer">
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    {bundle.tags.map((t) => (
                      <span key={t} style={{ fontSize: "10px", background: "#18181b", border: "1px solid #27272a", padding: "2px 6px", borderRadius: "3px", color: "#a1a1aa" }}>
                        #{t}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: "6px" }}>
                    {!bundle.isSystem && (
                      <button
                        type="button"
                        className="nv-btn-secondary"
                        style={{ padding: "4px 8px", fontSize: "11px", color: "#f87171" }}
                        onClick={() => handleDeletePresetFromCatalog(bundle.id, bundle.title)}
                        title="Hapus preset dari database"
                      >
                        Hapus
                      </button>
                    )}
                    <button
                      type="button"
                      className="nv-btn-secondary"
                      style={{ padding: "4px 8px", fontSize: "11px" }}
                      onClick={() => handleLoadPresetToMixer(bundle.prompt, bundle.architecture)}
                      title="Muat ke Modular Mixer untuk dikustomisasi"
                    >
                      Buka di Mixer
                    </button>
                    <button
                      type="button"
                      className="nv-btn-primary"
                      style={{ padding: "4px 10px", fontSize: "11px" }}
                      onClick={() => copyToClipboard(bundle.prompt, bundle.id, bundle.title)}
                    >
                      {copiedKey === bundle.id ? "Tersalin!" : "Salin"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================
          TAB 3: EMBEDDING DIRECTORY
          =================================================================== */}
      {activeTab === "embeddings" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="nv-header" style={{ padding: "10px 14px" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", flex: 1, alignItems: "center" }}>
              <input
                type="text"
                className="nv-input"
                style={{ minWidth: "240px", flex: 1 }}
                placeholder="Cari Textual Inversion / Embedding (misal: EasyNegative, badhand, realistic)..."
                value={embSearch}
                onChange={(e) => setEmbSearch(e.target.value)}
              />

              <select
                className="nv-input"
                value={embArchFilter}
                onChange={(e) => setEmbArchFilter(e.target.value)}
              >
                <option value="all">Semua Arsitektur</option>
                <option value="SD 1.5">SD 1.5</option>
                <option value="SDXL">SDXL</option>
                <option value="Pony">Pony</option>
              </select>

              <button
                type="button"
                className="nv-btn-primary"
                style={{ padding: "7px 14px", fontSize: "12px", whiteSpace: "nowrap" }}
                onClick={() => setShowAddEmbModal(true)}
              >
                + Tambah Embedding
              </button>
            </div>
          </div>

          <div className="nv-embedding-grid">
            {filteredEmbeddings.map((emb) => (
              <div key={emb.id} className="nv-embedding-card">
                <div>
                  <div className="nv-emb-header">
                    <div>
                      <div className="nv-emb-name">{emb.name}</div>
                      <div style={{ fontSize: "11px", color: "#a1a1aa" }}>
                        {emb.filename} • {emb.filesize}
                      </div>
                    </div>
                    <span className="nv-preset-arch-tag">{emb.architecture}</span>
                  </div>

                  <p className="nv-preset-desc" style={{ marginTop: "8px", marginBottom: "12px" }}>
                    {emb.description}
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ fontSize: "11px", color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Trigger Syntax:
                    </div>
                    <div className="nv-emb-trigger-box">
                      <span className="nv-emb-trigger-code">{emb.a1111Trigger}</span>
                      <button
                        type="button"
                        className="nv-syntax-btn"
                        onClick={() => copyToClipboard(emb.a1111Trigger, `emb-a1111-${emb.id}`, "Trigger A1111")}
                      >
                        {copiedKey === `emb-a1111-${emb.id}` ? "Tersalin!" : "Salin A1111"}
                      </button>
                    </div>

                    <div className="nv-emb-trigger-box">
                      <span className="nv-emb-trigger-code">{emb.comfyTrigger}</span>
                      <button
                        type="button"
                        className="nv-syntax-btn"
                        onClick={() => copyToClipboard(emb.comfyTrigger, `emb-comfy-${emb.id}`, "Trigger ComfyUI")}
                      >
                        {copiedKey === `emb-comfy-${emb.id}` ? "Tersalin!" : "Salin Comfy"}
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: "12px" }}>
                    <div style={{ fontSize: "11px", color: "#a1a1aa", marginBottom: "4px" }}>
                      Fitur yang ditekan:
                    </div>
                    <div className="nv-emb-suppressed-list">
                      {emb.suppressedTags.map((st) => (
                        <span key={st} className="nv-emb-suppressed-tag">
                          ✕ {st}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="nv-preset-footer" style={{ marginTop: "10px" }}>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <a
                      href={emb.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="nv-btn-secondary"
                      style={{ fontSize: "11px", padding: "4px 10px" }}
                    >
                      <span>Download Model ↗</span>
                    </a>
                    {!emb.isSystem && (
                      <button
                        type="button"
                        className="nv-btn-secondary"
                        style={{ fontSize: "11px", padding: "4px 8px", color: "#f87171" }}
                        onClick={() => handleDeleteEmbedding(emb.id, emb.name)}
                        title="Hapus embedding dari database"
                      >
                        Hapus
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    className="nv-btn-primary"
                    style={{ fontSize: "11px", padding: "4px 12px" }}
                    onClick={() => copyToClipboard(emb.a1111Trigger, emb.id, emb.name)}
                  >
                    {copiedKey === emb.id ? "Tersalin!" : "Salin Trigger"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================
          TAB 4: TECHNICAL GUIDE & CROSS-ATTENTION MATH
          =================================================================== */}
      {activeTab === "guide" && (
        <div className="nv-guide-container">
          <div className="nv-guide-card">
            <h3>
              <span style={{ color: "#ef4444" }}>01.</span> Matematika Di Balik Negative Prompt (Cross-Attention CFG)
            </h3>
            <p>
              Pada model difusi (Stable Diffusion), generator gambar tidak &quot;menghapus&quot; objek, melainkan menggeser vektor laten noise menjauhi representasi teks negatif menggunakan persamaan <strong>Classifier-Free Guidance (CFG)</strong>:
            </p>

            <div className="nv-formula-box">
              Output = E_uncond + CFG × (E_cond - E_uncond)
              <br />
              <span style={{ color: "#a1a1aa", fontSize: "11px" }}>
                Di mana <strong>E_uncond</strong> adalah representasi laten dari <strong>Negative Prompt</strong>.
              </span>
            </div>

            <p>
              Ketika Anda menuliskan <code>bad hands</code> di negative prompt, model menghitung probabilitas munculnya tangan rusak, lalu melipatgandakan vektor inversinya sebesar nilai CFG (misal 7.0×) untuk menjauhkannya dari hasil akhir.
            </p>
          </div>

          <div className="nv-guide-card">
            <h3>
              <span style={{ color: "#f59e0b" }}>02.</span> Jebakan &quot;Washed Out Contrast&quot; di SDXL &amp; Pony
            </h3>
            <p>
              Pada era SD 1.5, menumpuk puluhan kata negatif adalah hal wajar karena dataset SD 1.5 relatif kotor. Namun pada <strong>SDXL</strong>, <strong>Pony Diffusion</strong>, dan <strong>Illustrious</strong>:
            </p>

            <div className="nv-dos-donts-grid">
              <div className="nv-rule-box dont">
                <h4>✕ JANGAN LAKUKAN</h4>
                <ul>
                  <li>Memasukkan ratusan token negatif acak ("quality salad").</li>
                  <li>Menggunakan bobot negatif ekstrem di atas 1.4× (membuat kontras abu-abu pucat / washed out).</li>
                  <li>Memasukkan kata negatif yang bertentangan dengan prompt positif Anda.</li>
                </ul>
              </div>

              <div className="nv-rule-box do">
                <h4>✓ REKOMENDASI TERBAIK</h4>
                <ul>
                  <li>Gunakan 10–20 token terarah yang spesifik pada cacat yang muncul.</li>
                  <li>Pony Diffusion: Gunakan token score khusus (<code>score_4, score_5</code>) dibanding kata sifat umum.</li>
                  <li>Pertahankan total token di bawah 75 token (1 CLIP chunk) agar efektivitas Cross-Attention maksimal.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="nv-guide-card">
            <h3>
              <span style={{ color: "#3b82f6" }}>03.</span> Bagaimana dengan Flux.1 dan Stable Diffusion 3?
            </h3>
            <p>
              Arsitektur <strong>Flux.1</strong> (Black Forest Labs) menggunakan <em>Flow Matching Rectified Transformer</em> yang dilatih dengan sistem <strong>Guidance Scale (biasanya 3.0 – 3.5)</strong> tanpa cross-attention uncond standar.
            </p>
            <p>
              Di ComfyUI atau Forge, generator Flux bekerja jauh lebih natural dan bebas halusinasi <strong>tanpa negative prompt sama sekali</strong>. Menambahkan negative prompt panjang ke Flux justru dapat merusak komposisi atau menghasilkan gambar buram. Gunakan negative prompt pada Flux hanya bila ada teks atau watermark yang membandel.
            </p>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL: TAMBAH PRESET NEGATIF (PostgreSQL Backend)
          =================================================================== */}
      {showAddPresetModal && (
        <div className="nv-modal-overlay" onClick={() => setShowAddPresetModal(false)}>
          <div className="nv-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="nv-modal-header">
              <h3 className="nv-modal-title">Tambah Preset Negatif ke Database</h3>
              <button
                type="button"
                className="nv-syntax-btn"
                onClick={() => setShowAddPresetModal(false)}
                style={{ fontSize: "14px", padding: "2px 8px" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePresetSubmit} className="nv-modal-body">
              <label className="nv-field-label">
                <span>Judul Preset:</span>
                <input
                  type="text"
                  className="nv-input"
                  placeholder="Misal: Cyberpunk Neon Clean, Anime Soft Glow..."
                  required
                  value={presetForm.title}
                  onChange={(e) => setPresetForm({ ...presetForm, title: e.target.value })}
                />
              </label>

              <div className="nv-modal-grid-2">
                <label className="nv-field-label">
                  <span>Target Arsitektur:</span>
                  <select
                    className="nv-input"
                    value={presetForm.architecture}
                    onChange={(e) => setPresetForm({ ...presetForm, architecture: e.target.value as any })}
                  >
                    <option value="SDXL">SDXL</option>
                    <option value="Pony">Pony</option>
                    <option value="Illustrious">Illustrious</option>
                    <option value="SD 1.5">SD 1.5</option>
                    <option value="Flux">Flux</option>
                    <option value="All">Semua (Universal)</option>
                  </select>
                </label>

                <label className="nv-field-label">
                  <span>Kategori:</span>
                  <select
                    className="nv-input"
                    value={presetForm.category}
                    onChange={(e) => setPresetForm({ ...presetForm, category: e.target.value as any })}
                  >
                    <option value="General">General</option>
                    <option value="Anime">Anime 2D</option>
                    <option value="Photorealism">Photorealism</option>
                    <option value="Anatomy">Anatomy Fix</option>
                    <option value="Minimal">Minimalist</option>
                  </select>
                </label>
              </div>

              <div className="nv-modal-grid-2">
                <label className="nv-field-label">
                  <span>Rekomendasi CFG:</span>
                  <input
                    type="text"
                    className="nv-input"
                    placeholder="Misal: 5.0 - 6.5"
                    value={presetForm.recommendedCFG}
                    onChange={(e) => setPresetForm({ ...presetForm, recommendedCFG: e.target.value })}
                  />
                </label>

                <label className="nv-field-label">
                  <span>Tags (koma):</span>
                  <input
                    type="text"
                    className="nv-input"
                    placeholder="Misal: anime, hands, clean"
                    value={presetForm.tags}
                    onChange={(e) => setPresetForm({ ...presetForm, tags: e.target.value })}
                  />
                </label>
              </div>

              <label className="nv-field-label">
                <span>Deskripsi Singkat:</span>
                <input
                  type="text"
                  className="nv-input"
                  placeholder="Keterangan singkat fungsi preset ini..."
                  value={presetForm.description}
                  onChange={(e) => setPresetForm({ ...presetForm, description: e.target.value })}
                />
              </label>

              <label className="nv-field-label">
                <span>Konten Prompt Negatif:</span>
                <textarea
                  className="nv-output-box"
                  rows={4}
                  required
                  placeholder="worst quality, low quality, bad anatomy, deformed hands..."
                  value={presetForm.prompt}
                  onChange={(e) => setPresetForm({ ...presetForm, prompt: e.target.value })}
                />
              </label>

              <div className="nv-modal-footer">
                <button
                  type="button"
                  className="nv-btn-secondary"
                  onClick={() => setShowAddPresetModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="nv-btn-primary">
                  Simpan ke Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL: TAMBAH EMBEDDING BARU (PostgreSQL Backend)
          =================================================================== */}
      {showAddEmbModal && (
        <div className="nv-modal-overlay" onClick={() => setShowAddEmbModal(false)}>
          <div className="nv-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="nv-modal-header">
              <h3 className="nv-modal-title">Tambah Embedding ke Database</h3>
              <button
                type="button"
                className="nv-syntax-btn"
                onClick={() => setShowAddEmbModal(false)}
                style={{ fontSize: "14px", padding: "2px 8px" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEmbeddingSubmit} className="nv-modal-body">
              <div className="nv-modal-grid-2">
                <label className="nv-field-label">
                  <span>Nama Embedding:</span>
                  <input
                    type="text"
                    className="nv-input"
                    placeholder="Misal: BadHandV5, EasyNegative..."
                    required
                    value={embForm.name}
                    onChange={(e) => setEmbForm({ ...embForm, name: e.target.value })}
                  />
                </label>

                <label className="nv-field-label">
                  <span>Filename:</span>
                  <input
                    type="text"
                    className="nv-input"
                    placeholder="Misal: badhandv5.pt / EasyNegative.safetensors"
                    required
                    value={embForm.filename}
                    onChange={(e) => setEmbForm({ ...embForm, filename: e.target.value })}
                  />
                </label>
              </div>

              <div className="nv-modal-grid-2">
                <label className="nv-field-label">
                  <span>Target Arsitektur:</span>
                  <select
                    className="nv-input"
                    value={embForm.architecture}
                    onChange={(e) => setEmbForm({ ...embForm, architecture: e.target.value as any })}
                  >
                    <option value="SD 1.5">SD 1.5</option>
                    <option value="SDXL">SDXL</option>
                    <option value="Pony">Pony</option>
                  </select>
                </label>

                <label className="nv-field-label">
                  <span>Ukuran File:</span>
                  <input
                    type="text"
                    className="nv-input"
                    placeholder="Misal: 24 KB"
                    value={embForm.filesize}
                    onChange={(e) => setEmbForm({ ...embForm, filesize: e.target.value })}
                  />
                </label>
              </div>

              <label className="nv-field-label">
                <span>Deskripsi Singkat:</span>
                <input
                  type="text"
                  className="nv-input"
                  placeholder="Fungsi dan cara kerja embedding..."
                  value={embForm.description}
                  onChange={(e) => setEmbForm({ ...embForm, description: e.target.value })}
                />
              </label>

              <div className="nv-modal-grid-2">
                <label className="nv-field-label">
                  <span>Trigger A1111 (WebUI):</span>
                  <input
                    type="text"
                    className="nv-input"
                    placeholder="Misal: badhandv5"
                    value={embForm.a1111Trigger}
                    onChange={(e) => setEmbForm({ ...embForm, a1111Trigger: e.target.value })}
                  />
                </label>

                <label className="nv-field-label">
                  <span>Trigger ComfyUI:</span>
                  <input
                    type="text"
                    className="nv-input"
                    placeholder="Misal: embedding:badhandv5"
                    value={embForm.comfyTrigger}
                    onChange={(e) => setEmbForm({ ...embForm, comfyTrigger: e.target.value })}
                  />
                </label>
              </div>

              <label className="nv-field-label">
                <span>URL Download (CivitAI / HuggingFace):</span>
                <input
                  type="url"
                  className="nv-input"
                  placeholder="https://civitai.com/models/..."
                  value={embForm.downloadUrl}
                  onChange={(e) => setEmbForm({ ...embForm, downloadUrl: e.target.value })}
                />
              </label>

              <label className="nv-field-label">
                <span>Fitur yang Ditekan (koma):</span>
                <input
                  type="text"
                  className="nv-input"
                  placeholder="bad anatomy, extra fingers, lowres"
                  value={embForm.suppressedTags}
                  onChange={(e) => setEmbForm({ ...embForm, suppressedTags: e.target.value })}
                />
              </label>

              <div className="nv-modal-footer">
                <button
                  type="button"
                  className="nv-btn-secondary"
                  onClick={() => setShowAddEmbModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="nv-btn-primary">
                  Simpan Embedding ke Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
