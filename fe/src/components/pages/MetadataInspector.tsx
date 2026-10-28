import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { parseImageMetadataApi, type ParsedImageMetadata } from "../../api/admin";
import { getImage, type ModelImage } from "../../api/models";
import { resolveImageUrl } from "../../api/client";
import { WorkflowBridgeMenu } from "../common/WorkflowBridgeMenu";
import { extractLorasFromPrompt, type WorkflowBridgeData } from "../../utils/workflowBridge";
import {
    buildA1111ParametersText,
    buildWebUIApiPayload,
    buildComfyUIWorkflowJSON,
    downloadTextAsFile,
} from "../../utils/exportFormats";
import {
    interrogateImage,
    getStoredGeminiApiKey,
    setStoredGeminiApiKey,
    getStoredGeminiModel,
    setStoredGeminiModel,
    getStoredAIProvider,
    setStoredAIProvider,
    getStoredLocalEndpoint,
    setStoredLocalEndpoint,
    getStoredLocalModel,
    setStoredLocalModel,
    fetchLocalOllamaModels,
    fetchLocalOpenAIModels,
    POPULAR_LOCAL_VISION_MODELS,
    PRESET_GEMINI_MODELS,
    fetchLiveAccountModels,
    type InterrogateResult,
    type AIProviderType,
} from "../../services/interrogationService";
import "../../style/MetadataInspector.css";

// Clean technical SVG icons
const Icons = {
    Inspector: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
    ),
    UploadCloud: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 16 12 12 8 16" />
            <line x1="12" y1="12" x2="12" y2="21" />
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
            <polyline points="16 16 12 12 8 16" />
        </svg>
    ),
    Copy: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
    ),
    Check: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
    Download: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
    ),
    Trash: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
    ),
    Layers: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
        </svg>
    ),
    Code: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
        </svg>
    ),
    Info: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    ),
    ArrowLeft: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
    ),
    Folder: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
    ),
    Sparkles: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
        </svg>
    ),
    Search: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
    ),
    ExternalLink: () => (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
    ),
    Settings: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
    ),
    Cpu: () => (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <rect x="9" y="9" width="6" height="6" />
            <line x1="9" y1="1" x2="9" y2="4" />
            <line x1="15" y1="1" x2="15" y2="4" />
            <line x1="9" y1="20" x2="9" y2="23" />
            <line x1="15" y1="20" x2="15" y2="23" />
            <line x1="20" y1="9" x2="23" y2="9" />
            <line x1="20" y1="14" x2="23" y2="14" />
            <line x1="1" y1="9" x2="4" y2="9" />
            <line x1="1" y1="14" x2="4" y2="14" />
        </svg>
    ),
    Cloud: () => (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
        </svg>
    ),
    AlertTriangle: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    ),
    Refresh: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 21h5v-5" />
        </svg>
    ),
};

export interface BatchInspectorItem {
    id: string;
    file: File;
    name: string;
    size: number;
    previewUrl: string;
    status: "pending" | "scanning" | "done";
    hasMetadata: boolean;
    source?: string;
    metadata?: ParsedImageMetadata;
}

// Recursively read all files from dropped directory entries
async function readAllEntries(entries: any[], fileList: File[]) {
    for (const entry of entries) {
        if (!entry) continue;
        if (entry.isFile) {
            await new Promise<void>((resolve) => {
                entry.file(
                    (file: File) => {
                        fileList.push(file);
                        resolve();
                    },
                    () => resolve()
                );
            });
        } else if (entry.isDirectory) {
            const reader = entry.createReader();
            const childEntries: any[] = await new Promise((resolve) => {
                reader.readEntries(
                    (results: any[]) => resolve(results),
                    () => resolve([])
                );
            });
            await readAllEntries(childEntries, fileList);
        }
    }
}

export default function MetadataInspector() {
    const [searchParams] = useSearchParams();
    const imageIdParam = searchParams.get("image_id") || searchParams.get("image");
    const urlParam = searchParams.get("url");

    const [mode, setMode] = useState<"upload" | "batch" | "paste">("upload");
    const [pastedText, setPastedText] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [inspectedGalleryItem, setInspectedGalleryItem] = useState<ModelImage | null>(null);

    // Batch Inspector state
    const [batchItems, setBatchItems] = useState<BatchInspectorItem[]>([]);
    const [isBatchScanning, setIsBatchScanning] = useState<boolean>(false);
    const [batchFilter, setBatchFilter] = useState<"all" | "has_meta" | "no_meta">("all");
    const [batchSearch, setBatchSearch] = useState<string>("");
    const [selectedBatchIdx, setSelectedBatchIdx] = useState<number | null>(null);
    const [folderName, setFolderName] = useState<string>("");

    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);
    const multiFileInputRef = useRef<HTMLInputElement>(null);

    // Selected file & preview
    const [currentFile, setCurrentFile] = useState<{
        name: string;
        size: number;
        url?: string;
        format?: string;
    } | null>(null);
    const [rawFile, setRawFile] = useState<File | null>(null);
    const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number } | null>(null);

    // AI Vision Interrogator State
    const [isInterrogating, setIsInterrogating] = useState<boolean>(false);
    const [interrogateResult, setInterrogateResult] = useState<InterrogateResult | null>(null);
    const [interrogateError, setInterrogateError] = useState<string | null>(null);
    const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
    const [aiProvider, setAiProvider] = useState<AIProviderType>(() => getStoredAIProvider());
    const [geminiApiKeyInput, setGeminiApiKeyInput] = useState<string>(() => getStoredGeminiApiKey());
    const [selectedGeminiModel, setSelectedGeminiModel] = useState<string>(() => getStoredGeminiModel());
    const [customModelInput, setCustomModelInput] = useState<string>("");
    const [liveAccountModels, setLiveAccountModels] = useState<Array<{ id: string; name: string }>>([]);
    const [isFetchingModels, setIsFetchingModels] = useState<boolean>(false);

    // Local AI States (Ollama, LM Studio, etc.)
    const [localEndpointInput, setLocalEndpointInput] = useState<string>(() => getStoredLocalEndpoint());
    const [localModelInput, setLocalModelInput] = useState<string>(() => getStoredLocalModel());
    const [localDetectedModels, setLocalDetectedModels] = useState<Array<{ id: string; name: string }>>([]);
    const [isFetchingLocalModels, setIsFetchingLocalModels] = useState<boolean>(false);
    const [localConnectionStatus, setLocalConnectionStatus] = useState<string | null>(null);
    const [danbooruViewMode, setDanbooruViewMode] = useState<"chips" | "raw">("chips");
    const [isAuditOpen, setIsAuditOpen] = useState<boolean>(false);

    // Helpers for Pro Developer UI/UX
    const getModelProfileBadge = (modelName: string): { label: string; color: string } => {
        const m = (modelName || "").toLowerCase();
        if (m.includes("2b") || m.includes("3b") || m.includes("4b")) {
            return { label: "≤4B Fast", color: "#10b981" };
        }
        if (m.includes("11b") || m.includes("12b") || m.includes("14b") || m.includes("pixtral")) {
            return { label: "11B–12B Deep", color: "#38bdf8" };
        }
        return { label: "7B–8B Balanced", color: "#2563eb" };
    };

    const getTagCategoryClass = (tag: string): string => {
        const t = tag.toLowerCase().trim();
        if (
            t.startsWith("masterpiece") ||
            t.startsWith("best quality") ||
            t.startsWith("score_") ||
            t.startsWith("very aesthetic") ||
            t.startsWith("absurdres") ||
            t.startsWith("ultra-detailed")
        ) {
            return "tag-cat-quality";
        }
        if (
            t.includes("1girl") ||
            t.includes("1boy") ||
            t.includes("solo") ||
            t.includes("heterosexual") ||
            t.includes("female") ||
            t.includes("male") ||
            t.includes("character")
        ) {
            return "tag-cat-subject";
        }
        if (
            t.includes("room") ||
            t.includes("washitsu") ||
            t.includes("indoor") ||
            t.includes("outdoor") ||
            t.includes("lighting") ||
            t.includes("tatami") ||
            t.includes("background") ||
            t.includes("depth of field")
        ) {
            return "tag-cat-environment";
        }
        return "tag-cat-appearance";
    };

    const getObservedFactVal = (facts: any, key: string): string => {
        if (!facts) return "";
        if (typeof facts === "object") {
            const raw = facts[key] ?? (
                key === "exposure_and_rating_audit" ? facts["nsfw_and_anatomy_audit"] :
                key === "nsfw_and_anatomy_audit" ? facts["exposure_and_rating_audit"] : undefined
            );
            if (raw !== undefined && raw !== null) {
                if (typeof raw === "string") return raw;
                if (Array.isArray(raw)) return raw.filter(Boolean).map(String).join(", ");
                if (typeof raw === "object") {
                    return Object.entries(raw)
                        .filter(([_, v]) => v !== undefined && v !== null && String(v).trim() !== "")
                        .map(([k, v]) => `${k}: ${v}`)
                        .join("; ");
                }
                return String(raw);
            }
        }
        if (typeof facts === "string") {
            return facts;
        }
        return "";
    };

    const getRatingBadgeInfo = (result: InterrogateResult | null) => {
        if (!result) return null;
        const auditVal = (
            getObservedFactVal(result.observed_facts, "exposure_and_rating_audit") ||
            getObservedFactVal(result.observed_facts, "nsfw_and_anatomy_audit") ||
            ""
        ).toLowerCase();

        // 1. Explicit check
        const hasExplicitTier = auditVal.includes("tier: explicit") || auditVal.includes("[tier: explicit]");
        const isExplicitKeyword =
            auditVal.includes("explicit") ||
            auditVal.includes("r-18") ||
            (auditVal.includes("nsfw") && !auditVal.includes("not nsfw") && !auditVal.includes("no nsfw"));
        const hasCoveredIndicator =
            auditVal.includes("100% covered") || auditVal.includes("covered by fabric") || auditVal.includes("no nipples");

        if (hasExplicitTier || (isExplicitKeyword && !hasCoveredIndicator && !auditVal.includes("sensitive") && !auditVal.includes("general"))) {
            return {
                tier: "explicit" as const,
                label: "Rating: Explicit (NSFW)",
            };
        }

        // 2. Sensitive check
        const hasSensitiveTier = auditVal.includes("tier: sensitive") || auditVal.includes("[tier: sensitive]");
        const isSensitiveKeyword =
            auditVal.includes("sensitive") ||
            auditVal.includes("ecchi") ||
            auditVal.includes("suggestive") ||
            auditVal.includes("cleavage") ||
            auditVal.includes("cutout");

        if (hasSensitiveTier || isSensitiveKeyword || hasCoveredIndicator) {
            return {
                tier: "sensitive" as const,
                label: "Rating: Sensitive (Ecchi/SFW)",
            };
        }

        // 3. General (Default SFW)
        return {
            tier: "general" as const,
            label: "Rating: General (SFW)",
        };
    };

    const handleDeleteTag = (indexToDelete: number) => {
        if (!interrogateResult) return;
        const currentTags = (interrogateResult.danbooru_prompt || "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
        const updated = currentTags.filter((_, idx) => idx !== indexToDelete).join(", ");
        setInterrogateResult({
            ...interrogateResult,
            danbooru_prompt: updated,
        });
    };

    // Parsed results
    const [metaResult, setMetaResult] = useState<ParsedImageMetadata | null>(null);
    const [activeTab, setActiveTab] = useState<"params" | "workflow" | "raw" | "chunks" | "reverse">("params");
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const handleCopy = (text: string, key: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    // Workflow Bridge Data
    const bridgeData: WorkflowBridgeData = useMemo(() => {
        const rawPos = metaResult?.positive_prompt || interrogateResult?.danbooru_prompt || interrogateResult?.natural_prompt || "";
        const rawNeg = metaResult?.negative_prompt || interrogateResult?.negative_prompt || "";
        const extracted = extractLorasFromPrompt(rawPos);
        return {
            source: "inspector",
            timestamp: Date.now(),
            positivePrompt: rawPos,
            negativePrompt: rawNeg,
            width: metaResult?.width || naturalDimensions?.width,
            height: metaResult?.height || naturalDimensions?.height,
            baseModel: metaResult?.model_name || interrogateResult?.recommended_model,
            modelName: metaResult?.model_name || interrogateResult?.recommended_model,
            seed: metaResult?.seed,
            steps: metaResult?.steps || interrogateResult?.recommended_steps,
            cfgScale: metaResult?.cfg_scale || interrogateResult?.recommended_cfg,
            sampler: metaResult?.sampler || interrogateResult?.recommended_sampler,
            scheduler: metaResult?.scheduler,
            loras: extracted.length > 0 ? extracted : (interrogateResult?.suggested_loras || []),
        };
    }, [metaResult, naturalDimensions, interrogateResult]);

    const handleProcessFile = useCallback(async (file: File, galleryItemFallback?: ModelImage | null) => {
        setIsLoading(true);
        setErrorMsg(null);
        setRawFile(file);
        setInterrogateResult(null);
        setInterrogateError(null);
        setNaturalDimensions(null);
        // CRITICAL: Immediately wipe previous file's metadata to prevent state leak
        setMetaResult(null);

        // Create local object URL for preview if image
        let previewUrl: string | undefined = undefined;
        if (file.type.startsWith("image/")) {
            previewUrl = URL.createObjectURL(file);
        }

        const fileExt = file.name.split(".").pop()?.toUpperCase() || "IMAGE";

        setCurrentFile({
            name: file.name,
            size: file.size,
            url: previewUrl,
            format: fileExt,
        });

        try {
            const res = await parseImageMetadataApi(file);
            let m = res.metadata;

            // If parsed metadata has empty prompts but database has records, merge them
            if (galleryItemFallback && (!m?.positive_prompt || m?.source === "unknown")) {
                m = {
                    ...m,
                    source: m?.source && m.source !== "unknown" ? m.source : "gallery_db",
                    positive_prompt: galleryItemFallback.positive_prompt || m?.positive_prompt || "",
                    negative_prompt: galleryItemFallback.negative_prompt || m?.negative_prompt || "",
                    steps: galleryItemFallback.steps || m?.steps,
                    sampler: galleryItemFallback.sampler || m?.sampler,
                    cfg_scale: galleryItemFallback.cfg_scale || m?.cfg_scale,
                    seed: galleryItemFallback.seed !== undefined ? galleryItemFallback.seed : m?.seed,
                    width: galleryItemFallback.width || m?.width,
                    height: galleryItemFallback.height || m?.height,
                    model_name: galleryItemFallback.model?.name || galleryItemFallback.model_name || m?.model_name,
                    loras: galleryItemFallback.resources?.map((r) => ({ name: r.name, weight: r.weight || 0.8 })) || m?.loras,
                };
            }

            setMetaResult(m);
            setActiveTab("params");
        } catch (err: any) {
            console.error("Metadata parsing failed:", err);
            if (galleryItemFallback) {
                // Use database fallback!
                setMetaResult({
                    source: "gallery_db",
                    format: fileExt.toLowerCase(),
                    positive_prompt: galleryItemFallback.positive_prompt || "",
                    negative_prompt: galleryItemFallback.negative_prompt || "",
                    steps: galleryItemFallback.steps,
                    sampler: galleryItemFallback.sampler,
                    cfg_scale: galleryItemFallback.cfg_scale,
                    seed: galleryItemFallback.seed,
                    width: galleryItemFallback.width,
                    height: galleryItemFallback.height,
                    model_name: galleryItemFallback.model?.name || galleryItemFallback.model_name,
                    loras: galleryItemFallback.resources?.map((r) => ({ name: r.name, weight: r.weight || 0.8 })),
                    raw_chunks: {},
                    extra_params: {},
                });
                setActiveTab("params");
            } else {
                setMetaResult({
                    source: "unknown",
                    format: fileExt.toLowerCase(),
                    positive_prompt: "",
                    negative_prompt: "",
                    raw_chunks: {},
                    extra_params: {},
                });
                // Stripped image: no error alert banner, Kasus B will show Callout Card
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Automatic loading when deep-linked with URL parameters (image_id or url)
    useEffect(() => {
        if (!imageIdParam && !urlParam) return;

        let isMounted = true;

        const loadTargetImage = async () => {
            setIsLoading(true);
            setErrorMsg(null);
            try {
                let fileToProcess: File | null = null;
                let galleryItem: ModelImage | null = null;

                if (imageIdParam) {
                    const item = await getImage(imageIdParam);
                    if (!isMounted) return;
                    galleryItem = item;
                    setInspectedGalleryItem(item);

                    const resolved = resolveImageUrl(item.image_url);
                    const resp = await fetch(resolved);
                    const blob = await resp.blob();
                    const filename = item.image_url?.split("/").pop() || `artwork_${item.id}.png`;
                    fileToProcess = new File([blob], filename, { type: blob.type || "image/png" });
                } else if (urlParam) {
                    const resolved = resolveImageUrl(urlParam);
                    const resp = await fetch(resolved);
                    const blob = await resp.blob();
                    const filename = urlParam.split("/").pop() || "image.png";
                    fileToProcess = new File([blob], filename, { type: blob.type || "image/png" });
                }

                if (fileToProcess && isMounted) {
                    await handleProcessFile(fileToProcess, galleryItem);
                }
            } catch (err: any) {
                if (isMounted) {
                    console.error("Failed to load image from URL param:", err);
                    setErrorMsg(`Gagal memuat gambar galeri: ${err?.message || "Kesalahan jaringan"}`);
                    setIsLoading(false);
                }
            }
        };

        loadTargetImage();

        return () => {
            isMounted = false;
        };
    }, [imageIdParam, urlParam, handleProcessFile]);


    // Global Paste Listener (Ctrl+V)
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
                const file = e.clipboardData.files[0];
                handleProcessFile(file);
            }
        };

        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, [handleProcessFile]);

    // Start Batch Scanning Worker Pool
    const startBatchScanning = useCallback(async (items: BatchInspectorItem[]) => {
        setIsBatchScanning(true);
        let queueIdx = 0;

        const worker = async () => {
            while (queueIdx < items.length) {
                const cur = queueIdx++;
                const item = items[cur];

                setBatchItems((prev) =>
                    prev.map((it, idx) => (idx === cur ? { ...it, status: "scanning" } : it))
                );

                try {
                    const res = await parseImageMetadataApi(item.file);
                    const meta = res?.metadata;
                    const hasMeta = !!(
                        meta &&
                        (meta.positive_prompt ||
                            meta.model_name ||
                            meta.workflow_json ||
                            (meta.source && meta.source !== "unknown"))
                    );

                    setBatchItems((prev) =>
                        prev.map((it, idx) =>
                            idx === cur
                                ? {
                                      ...it,
                                      status: "done",
                                      hasMetadata: hasMeta,
                                      source: res.source || meta?.source || "comfyui",
                                      metadata: meta,
                                  }
                                : it
                        )
                    );
                } catch {
                    setBatchItems((prev) =>
                        prev.map((it, idx) =>
                            idx === cur
                                ? {
                                      ...it,
                                      status: "done",
                                      hasMetadata: false,
                                      source: "none",
                                  }
                                : it
                        )
                    );
                }
            }
        };

        const concurrency = Math.min(4, items.length);
        const workers = Array.from({ length: concurrency }, () => worker());
        await Promise.all(workers);
        setIsBatchScanning(false);
    }, []);

    // Initialize Batch scanning from file list
    const handleStartBatchFiles = useCallback(
        (files: File[], detectedFolderName?: string) => {
            const imageFiles = files.filter((f) => {
                const lower = f.name.toLowerCase();
                return (
                    lower.endsWith(".png") ||
                    lower.endsWith(".webp") ||
                    lower.endsWith(".jpg") ||
                    lower.endsWith(".jpeg")
                );
            });

            if (imageFiles.length === 0) {
                setErrorMsg(
                    "Tidak ada file gambar (.png, .webp, .jpg, .jpeg) yang ditemukan di folder / pilihan file ini."
                );
                return;
            }

            let title = detectedFolderName || "";
            if (!title) {
                const rel = (imageFiles[0] as any).webkitRelativePath;
                if (rel) {
                    const parts = rel.split("/");
                    if (parts.length > 1) {
                        title = parts[0];
                    }
                }
            }
            if (!title) {
                title = `Batch (${imageFiles.length} Gambar)`;
            }

            setFolderName(title);
            setErrorMsg(null);

            const newItems: BatchInspectorItem[] = imageFiles.map((f, i) => ({
                id: `batch-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
                file: f,
                name: f.name,
                size: f.size,
                previewUrl: URL.createObjectURL(f),
                status: "pending",
                hasMetadata: false,
            }));

            setBatchItems(newItems);
            setSelectedBatchIdx(null);
            setMode("batch");
            startBatchScanning(newItems);
        },
        [startBatchScanning]
    );

    // Handle Drop (Supports single file, multiple files, and recursive folder drop)
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            const collectedFiles: File[] = [];
            const entries: any[] = [];
            let droppedFolder = "";

            for (let i = 0; i < e.dataTransfer.items.length; i++) {
                const item = e.dataTransfer.items[i];
                if ((item as any).webkitGetAsEntry) {
                    const entry = (item as any).webkitGetAsEntry();
                    if (entry) {
                        entries.push(entry);
                        if (entry.isDirectory && !droppedFolder) {
                            droppedFolder = entry.name;
                        }
                    }
                }
            }

            if (entries.length > 0) {
                await readAllEntries(entries, collectedFiles);
            } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                collectedFiles.push(...Array.from(e.dataTransfer.files));
            }

            if (mode === "batch" || collectedFiles.length > 1 || droppedFolder) {
                handleStartBatchFiles(collectedFiles, droppedFolder);
            } else if (collectedFiles.length === 1) {
                handleProcessFile(collectedFiles[0]);
            }
        } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            if (mode === "batch" || files.length > 1) {
                handleStartBatchFiles(files);
            } else {
                handleProcessFile(files[0]);
            }
        }
    };

    // Inspect individual item from batch in deep detail
    const handleInspectBatchItem = (index: number) => {
        if (index < 0 || index >= batchItems.length) return;
        setSelectedBatchIdx(index);
        const item = batchItems[index];
        setRawFile(item.file);
        setInterrogateResult(null);
        setInterrogateError(null);
        setCurrentFile({
            name: item.name,
            size: item.size,
            url: item.previewUrl,
            format: item.name.split(".").pop()?.toUpperCase() || "PNG",
        });
        if (item.metadata) {
            setMetaResult(item.metadata);
            setErrorMsg(null);
        } else {
            handleProcessFile(item.file);
        }
        setActiveTab("params");
    };

    // Run AI Reverse-Prompt Interrogation
    const handleRunInterrogate = async (targetFile?: File) => {
        const fileToUse = targetFile || rawFile;
        if (!fileToUse) {
            setErrorMsg("Tidak ada file gambar yang dipilih untuk di-interrogate.");
            return;
        }

        const key = geminiApiKeyInput || getStoredGeminiApiKey();
        const model = selectedGeminiModel || getStoredGeminiModel();
        setIsInterrogating(true);
        setInterrogateError(null);

        try {
            const result = await interrogateImage(fileToUse, {
                provider: aiProvider,
                apiKey: key,
                model,
                localEndpoint: localEndpointInput || getStoredLocalEndpoint(aiProvider),
                localModel: localModelInput || getStoredLocalModel(),
            });
            setInterrogateResult(result);
        } catch (err: any) {
            const msg = err?.message || "Gagal melakukan AI interrogation";
            setInterrogateError(msg);
            if (
                msg.includes("Gemini API Key belum disetel") ||
                msg.includes("API key is required") ||
                msg.includes("403") ||
                msg.includes("API_KEY_INVALID")
            ) {
                setShowApiKeyModal(true);
            }
        } finally {
            setIsInterrogating(false);
        }
    };

    // Fetch live local models from Ollama or LM Studio
    const handleFetchLocalModels = async () => {
        setIsFetchingLocalModels(true);
        setLocalConnectionStatus(null);
        try {
            let models: Array<{ id: string; name: string }> = [];
            if (aiProvider === "lmstudio") {
                models = await fetchLocalOpenAIModels(localEndpointInput);
            } else {
                models = await fetchLocalOllamaModels(localEndpointInput);
            }
            setLocalDetectedModels(models);
            if (models.length > 0) {
                setLocalConnectionStatus(`Terhubung! Terdeteksi ${models.length} model aktif.`);
                // Prioritize vision-capable models (e.g. qwen2-vl, llava, minicpm, vision)
                const visionModel = models.find((m) => {
                    const low = m.id.toLowerCase();
                    return low.includes("vision") || low.includes("-vl") || low.includes("llava") || low.includes("minicpm") || low.includes("moondream");
                });
                if (visionModel) {
                    setLocalModelInput(visionModel.id);
                } else if (!localModelInput || localModelInput === "llama3.2-vision" || localModelInput === "local-model") {
                    setLocalModelInput(models[0].id);
                }
            } else {
                setLocalConnectionStatus("Gagal terhubung ke " + (localEndpointInput || "http://127.0.0.1:1234") + ". Pastikan Start Server aktif.");
            }
        } catch {
            setLocalConnectionStatus("Gagal terhubung. Pastikan LM Studio / Ollama sudah berjalan di port ini.");
        } finally {
            setIsFetchingLocalModels(false);
        }
    };

    // Fetch live account models for selection
    const handleFetchLiveModels = async () => {
        const key = geminiApiKeyInput || getStoredGeminiApiKey();
        if (!key) {
            setInterrogateError("Masukkan API Key terlebih dahulu untuk melihat model aktif akun Anda.");
            return;
        }
        setIsFetchingModels(true);
        try {
            const models = await fetchLiveAccountModels(key);
            setLiveAccountModels(models);
        } catch {
            // ignore
        } finally {
            setIsFetchingModels(false);
        }
    };

    // Apply AI-generated results to current metadata view
    const handleApplyInterrogateToMetadata = () => {
        if (!interrogateResult) return;
        setMetaResult({
            source: "ai_interrogated",
            format: currentFile?.format?.toLowerCase() || "png",
            positive_prompt: interrogateResult.danbooru_prompt,
            negative_prompt: interrogateResult.negative_prompt,
            model_name: interrogateResult.recommended_model,
            sampler: interrogateResult.recommended_sampler,
            steps: interrogateResult.recommended_steps,
            cfg_scale: interrogateResult.recommended_cfg,
            loras: interrogateResult.suggested_loras,
            raw_prompt: `${interrogateResult.danbooru_prompt}\nNegative prompt: ${interrogateResult.negative_prompt}\nSteps: ${interrogateResult.recommended_steps}, Sampler: ${interrogateResult.recommended_sampler}, CFG scale: ${interrogateResult.recommended_cfg}, Model: ${interrogateResult.recommended_model}`,
            raw_chunks: {
                AI_Natural_Prompt: interrogateResult.natural_prompt,
                AI_Style_Tags: interrogateResult.style_tags.join(", "),
                AI_Interrogator: "Google Gemini Vision AI",
            },
            extra_params: {
                character: interrogateResult.character || "original",
                natural_prompt: interrogateResult.natural_prompt,
            },
        });
        setActiveTab("params");
    };

    // Bulk actions
    const handleCopyAllPrompts = () => {
        const prompts = batchItems
            .filter((it) => it.hasMetadata && it.metadata?.positive_prompt)
            .map(
                (it) =>
                    `### File: ${it.name} [Model: ${it.metadata?.model_name || "Unknown"}]\n${it.metadata!.positive_prompt}`
            )
            .join("\n\n");
        if (!prompts) return;
        handleCopy(prompts, "batch-all-prompts");
    };

    const handleExportBatchJSON = () => {
        const report = {
            folder_name: folderName || "local_batch",
            scanned_at: new Date().toISOString(),
            total_images: batchItems.length,
            with_ai_metadata: batchItems.filter((it) => it.hasMetadata).length,
            without_ai_metadata: batchItems.filter((it) => it.status === "done" && !it.hasMetadata).length,
            items: batchItems.map((it) => ({
                filename: it.name,
                file_size_bytes: it.size,
                has_metadata: it.hasMetadata,
                source: it.source || (it.hasMetadata ? "ai_generated" : "none"),
                checkpoint_model: it.metadata?.model_name || null,
                loras: it.metadata?.loras || [],
                positive_prompt: it.metadata?.positive_prompt || null,
                negative_prompt: it.metadata?.negative_prompt || null,
                sampler: it.metadata?.sampler || null,
                steps: it.metadata?.steps || null,
                cfg_scale: it.metadata?.cfg_scale || null,
                seed: it.metadata?.seed !== undefined ? it.metadata.seed : null,
                dimensions:
                    it.metadata?.width && it.metadata?.height
                        ? `${it.metadata.width}x${it.metadata.height}`
                        : null,
            })),
        };
        downloadTextAsFile(
            JSON.stringify(report, null, 2),
            `${folderName ? folderName.replace(/[\s/\\:]+/g, "_") : "batch"}_metadata_report.json`,
            "application/json"
        );
    };

    const handleClearBatch = () => {
        batchItems.forEach((it) => {
            if (it.previewUrl && it.previewUrl.startsWith("blob:")) {
                URL.revokeObjectURL(it.previewUrl);
            }
        });
        setBatchItems([]);
        setSelectedBatchIdx(null);
        setFolderName("");
        setBatchSearch("");
        setBatchFilter("all");
        setRawFile(null);
        setInterrogateResult(null);
        setInterrogateError(null);
    };

    // Filtered items and statistics
    const filteredBatchItems = batchItems.filter((it) => {
        if (batchFilter === "has_meta" && !it.hasMetadata) return false;
        if (batchFilter === "no_meta" && it.hasMetadata) return false;
        if (batchSearch.trim()) {
            const q = batchSearch.toLowerCase();
            const matchName = it.name.toLowerCase().includes(q);
            const matchPrompt = it.metadata?.positive_prompt?.toLowerCase().includes(q);
            const matchModel = it.metadata?.model_name?.toLowerCase().includes(q);
            const matchLora = it.metadata?.loras?.some((l) => l.name.toLowerCase().includes(q));
            return matchName || matchPrompt || matchModel || matchLora;
        }
        return true;
    });

    const withMetaCount = batchItems.filter((it) => it.hasMetadata).length;
    const noMetaCount = batchItems.filter((it) => it.status === "done" && !it.hasMetadata).length;
    const scanningCount = batchItems.filter((it) => it.status === "scanning").length;
    const completedCount = batchItems.filter((it) => it.status === "done").length;
    const progressPercent = batchItems.length > 0 ? Math.round((completedCount / batchItems.length) * 100) : 0;

    // Handle Text Paste Parsing
    const handleParseText = async () => {
        if (!pastedText.trim()) return;
        const blob = new Blob([pastedText], { type: "text/plain" });
        const textFile = new File([blob], "pasted_generation_parameters.txt", { type: "text/plain" });
        await handleProcessFile(textFile);
    };

    // Load Demo Generation Sample
    const handleLoadDemo = () => {
        const demoMeta: ParsedImageMetadata = {
            source: "comfyui",
            format: "png",
            positive_prompt:
                "masterpiece, best quality, 1girl, solo, anime aesthetic, luminous eyes, dynamic wind, fluttering ribbon, cherry blossoms, neon bokeh background, cinematic soft lighting <lora:illustrious_v2_booster:0.85>",
            negative_prompt:
                "worst quality, low quality, normal quality, blurry, deformed limbs, extra fingers, watermark, signature, username",
            steps: 28,
            sampler: "Euler a",
            scheduler: "Normal",
            cfg_scale: 7.0,
            seed: 38491204812,
            width: 832,
            height: 1216,
            model_name: "Illustrious-XL-v1.0.safetensors",
            model_hash: "d74d816a13",
            clip_skip: 2,
            denoising_strength: 0.7,
            hires_upscale: 1.5,
            hires_steps: 15,
            hires_upscaler: "4x-AnimeSharp",
            vae: "sdxl_vae.safetensors",
            loras: [{ name: "illustrious_v2_booster", weight: 0.85 }],
            workflow_json: JSON.stringify(
                {
                    nodes: [
                        { id: 3, type: "KSampler", title: "KSampler (Main Generation)" },
                        { id: 4, type: "CheckpointLoaderSimple", title: "Load Illustrious Checkpoint" },
                        { id: 5, type: "EmptyLatentImage", title: "Latent 832x1216" },
                        { id: 6, type: "CLIPTextEncode", title: "Positive Conditioning" },
                        { id: 7, type: "CLIPTextEncode", title: "Negative Conditioning" },
                        { id: 8, type: "LoraLoader", title: "Apply LoRA" },
                    ],
                },
                null,
                2
            ),
            raw_prompt:
                "masterpiece, best quality, 1girl, solo, anime aesthetic, luminous eyes...\nNegative prompt: worst quality, low quality...\nSteps: 28, Sampler: Euler a, Schedule type: Normal, CFG scale: 7, Seed: 38491204812, Size: 832x1216, Model: Illustrious-XL-v1.0, Model hash: d74d816a13",
            raw_chunks: {
                prompt: '{"3": {"class_type": "KSampler", "inputs": {"seed": 38491204812, "steps": 28, "cfg": 7.0}}}',
                parameters: "Steps: 28, Sampler: Euler a, CFG scale: 7, Seed: 38491204812",
                Software: "ComfyUI v0.2.4",
            },
            extra_params: {
                "Schedule type": "Normal",
                "Model hash": "d74d816a13",
                "Clip skip": "2",
                "Hires upscaler": "4x-AnimeSharp",
                VAE: "sdxl_vae.safetensors",
            },
        };

        setCurrentFile({
            name: "demo_illustrious_generation.png",
            size: 3412500,
            url: undefined,
            format: "PNG",
        });
        setMetaResult(demoMeta);
        setActiveTab("params");
        setErrorMsg(null);
    };

    const handleDownloadWorkflow = () => {
        if (!metaResult?.workflow_json && !metaResult?.prompt_json) return;
        const content = metaResult.workflow_json || metaResult.prompt_json || "{}";
        const blob = new Blob([content], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${currentFile?.name.replace(/\.[^/.]+$/, "") || "comfyui"}_workflow.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const formatBytes = (bytes: number) => {
        if (!bytes || bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const handleResetAll = () => {
        setCurrentFile(null);
        setRawFile(null);
        setMetaResult(null);
        setInterrogateResult(null);
        setInterrogateError(null);
        setErrorMsg(null);
        setPastedText("");
        setNaturalDimensions(null);
        handleClearBatch();
    };

    const hasAiMetadata = Boolean(
        metaResult &&
        (
            Boolean(metaResult.positive_prompt && metaResult.positive_prompt.trim()) ||
            Boolean(metaResult.workflow_json && metaResult.workflow_json.trim()) ||
            Boolean(metaResult.prompt_json && metaResult.prompt_json.trim()) ||
            Boolean(metaResult.raw_prompt && metaResult.raw_prompt.trim()) ||
            (metaResult.steps !== undefined && metaResult.steps > 0) ||
            Boolean(metaResult.sampler && metaResult.sampler.trim()) ||
            Boolean(metaResult.model_name && metaResult.model_name.trim()) ||
            (metaResult.loras && metaResult.loras.length > 0) ||
            (metaResult.source && !["unknown", "none"].includes(metaResult.source))
        )
    );

    const isInspecting = Boolean(currentFile || (mode === "batch" && selectedBatchIdx !== null));

    return (
        <div
            className="inspector-container"
            onDragOver={(e) => {
                e.preventDefault();
                if (!isDragging) setIsDragging(true);
            }}
            onDragLeave={(e) => {
                if (e.currentTarget === e.target) {
                    setIsDragging(false);
                }
            }}
            onDrop={handleDrop}
        >
            {/* Global Drag Overlay when in Inspecting State */}
            {isDragging && isInspecting && (
                <div className="inspector-drag-overlay">
                    <div className="inspector-drag-box">
                        <Icons.UploadCloud />
                        <span>Lepaskan gambar di sini untuk menganalisis</span>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="inspector-header">
                <div className="inspector-title-row">
                    <h1 className="inspector-title">
                        <span className="inspector-title-icon">
                            <Icons.Inspector />
                        </span>
                        Metadata Inspector & Prompt Reader
                    </h1>

                    {!isInspecting && (
                        <button
                            type="button"
                            className="demo-sample-btn"
                            onClick={handleLoadDemo}
                            title="Muat contoh parameter generasi interaktif"
                        >
                            <Icons.Sparkles />
                            <span>Muat Contoh (Demo)</span>
                        </button>
                    )}
                </div>
                <p className="inspector-subtitle">
                    Inspeksi dan ekstrak seluruh metadata hasil generasi AI secara instan. Mendukung format gambar PNG, WebP, JPEG, dan workflow JSON.
                </p>
            </div>

            {/* Gallery Source Banner when loaded via URL param */}
            {inspectedGalleryItem && (
                <div className="inspector-gallery-source-banner">
                    <div className="inspector-gallery-source-info">
                        <span className="inspector-gallery-badge">Artwork #{inspectedGalleryItem.id}</span>
                        <span className="inspector-gallery-title">{inspectedGalleryItem.caption || "Untitled Artwork"}</span>
                        <span className="inspector-gallery-meta">
                            Model: {inspectedGalleryItem.model?.name || inspectedGalleryItem.model_name || "Standalone Checkpoint"}
                        </span>
                    </div>
                    <Link to={`/gallery?image=${inspectedGalleryItem.id}`} className="inspector-gallery-back-link">
                        <Icons.ArrowLeft />
                        <span>Lihat di Galeri</span>
                    </Link>
                </div>
            )}

            {/* Hidden File / Folder Inputs */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/webp,image/jpeg,image/jpg,application/json,text/plain"
                style={{ display: "none" }}
                onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                        handleProcessFile(e.target.files[0]);
                        e.target.value = "";
                    }
                }}
            />

            <input
                ref={folderInputRef}
                type="file"
                {...({ webkitdirectory: "", directory: "" } as any)}
                multiple
                style={{ display: "none" }}
                onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                        handleStartBatchFiles(Array.from(e.target.files));
                        e.target.value = "";
                    }
                }}
            />

            <input
                ref={multiFileInputRef}
                type="file"
                multiple
                accept="image/png,image/webp,image/jpeg,image/jpg"
                style={{ display: "none" }}
                onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                        handleStartBatchFiles(Array.from(e.target.files));
                        e.target.value = "";
                    }
                }}
            />

            {/* STATE 2: Compact Top Action Bar (Saat Gambar Sudah Dimuat) */}
            {isInspecting ? (
                <div className="inspector-compact-bar">
                    <div className="inspector-tabs-toggle">
                        <button
                            type="button"
                            className={`mode-tab-btn ${mode === "upload" ? "active" : ""}`}
                            onClick={() => {
                                setMode("upload");
                                setSelectedBatchIdx(null);
                            }}
                        >
                            <span>Satu File</span>
                        </button>
                        <button
                            type="button"
                            className={`mode-tab-btn ${mode === "batch" ? "active" : ""}`}
                            onClick={() => setMode("batch")}
                        >
                            <Icons.Folder />
                            <span>
                                Batch / Multi-File {batchItems.length > 0 ? `(${batchItems.length})` : ""}
                            </span>
                        </button>
                        <button
                            type="button"
                            className={`mode-tab-btn ${mode === "paste" ? "active" : ""}`}
                            onClick={() => {
                                setMode("paste");
                                setSelectedBatchIdx(null);
                            }}
                        >
                            <span>Tempel JSON / Teks Mentah</span>
                        </button>
                    </div>

                    <div className="compact-bar-hint">
                        <Icons.UploadCloud />
                        <span>Tarik file baru ke mana saja atau tekan <kbd>Ctrl+V</kbd> untuk mengganti</span>
                    </div>

                    <div className="compact-bar-actions">
                        <button
                            type="button"
                            className="demo-sample-btn"
                            onClick={handleLoadDemo}
                            title="Muat contoh parameter generasi interaktif"
                        >
                            <Icons.Sparkles />
                            <span>Muat Contoh (Demo)</span>
                        </button>
                        <button
                            type="button"
                            className="reset-clean-btn"
                            onClick={handleResetAll}
                            title="Reset dan bersihkan data inspeksi"
                        >
                            <Icons.Trash />
                            <span>Reset / Bersihkan</span>
                        </button>
                    </div>
                </div>
            ) : (
                /* STATE 1: Standard Mode Bar (Saat Belum Ada Gambar) */
                <div className="inspector-mode-bar">
                    <div className="inspector-tabs-toggle">
                        <button
                            type="button"
                            className={`mode-tab-btn ${mode === "upload" ? "active" : ""}`}
                            onClick={() => {
                                setMode("upload");
                                setSelectedBatchIdx(null);
                            }}
                        >
                            <span>Satu File</span>
                        </button>
                        <button
                            type="button"
                            className={`mode-tab-btn ${mode === "batch" ? "active" : ""}`}
                            onClick={() => setMode("batch")}
                        >
                            <Icons.Folder />
                            <span>
                                Batch / Multi-File {batchItems.length > 0 ? `(${batchItems.length})` : ""}
                            </span>
                        </button>
                        <button
                            type="button"
                            className={`mode-tab-btn ${mode === "paste" ? "active" : ""}`}
                            onClick={() => {
                                setMode("paste");
                                setSelectedBatchIdx(null);
                            }}
                        >
                            <span>Tempel JSON / Teks Mentah</span>
                        </button>
                    </div>

                    <button
                        type="button"
                        className="demo-sample-btn"
                        onClick={handleLoadDemo}
                        title="Muat contoh parameter generasi interaktif"
                    >
                        <Icons.Sparkles />
                        <span>Muat Contoh (Demo)</span>
                    </button>
                </div>
            )}

            {/* Error Message for fatal errors */}
            {errorMsg && (
                <div
                    style={{
                        marginBottom: "18px",
                        padding: "12px 16px",
                        background: "rgba(239, 68, 68, 0.08)",
                        border: "1px solid rgba(239, 68, 68, 0.25)",
                        borderRadius: "8px",
                        color: "#f87171",
                        fontSize: "13px",
                    }}
                >
                    {errorMsg}
                </div>
            )}

            {/* STATE 1 - Mode 1: Single File Dropzone (Hanya Tampil Saat Belum Ada Gambar) */}
            {!isInspecting && mode === "upload" && (
                <div
                    className={`inspector-dropzone ${isDragging ? "dragging" : ""}`}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="dropzone-icon-box">
                        <Icons.UploadCloud />
                    </div>

                    <div className="dropzone-main-text">
                        {isLoading ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                                <span className="inspector-spinner"></span>
                                Membaca dan menganalisis metadata...
                            </span>
                        ) : (
                            "Tarik & Lepas gambar di sini, atau klik untuk memilih file"
                        )}
                    </div>
                    <div className="dropzone-sub-text">
                        Mendukung format PNG, WebP, JPEG, serta file ComfyUI Workflow JSON. Tarik 1 folder ke sini untuk otomatis beralih ke Mode Batch.
                    </div>

                    <div className="dropzone-paste-hint">
                        <span>Tip: Tekan <strong>Ctrl + V</strong> untuk langsung mem-paste gambar dari clipboard</span>
                    </div>
                </div>
            )}

            {/* STATE 1 - Mode 2: Batch Folder / Multi-File Mode (Hanya jika belum memilih foto spesifik) */}
            {mode === "batch" && selectedBatchIdx === null && (
                <>
                    {batchItems.length === 0 ? (
                        <div
                            className={`inspector-dropzone ${isDragging ? "dragging" : ""}`}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setIsDragging(true);
                            }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                        >
                            <div className="dropzone-icon-box">
                                <Icons.Folder />
                            </div>

                            <div className="dropzone-main-text">
                                {isBatchScanning ? (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                                        <span className="inspector-spinner"></span>
                                        Memindai folder gambar...
                                    </span>
                                ) : (
                                    "Tarik & Lepas 1 Folder Lokal atau Puluhan File Gambar di sini"
                                )}
                            </div>
                            <div className="dropzone-sub-text">
                                Sistem akan otomatis memindai seluruh file dan mendeteksi metadata AI (ComfyUI, WebUI, NovelAI) beserta parameter dan prompt-nya.
                            </div>

                            <div className="batch-dropzone-actions" onClick={(e) => e.stopPropagation()}>
                                <button
                                    type="button"
                                    className="batch-action-trigger-btn"
                                    onClick={() => folderInputRef.current?.click()}
                                >
                                    <Icons.Folder />
                                    <span>Pilih Folder Lokal (Batch Scan)</span>
                                </button>
                                <button
                                    type="button"
                                    className="batch-action-trigger-btn secondary"
                                    onClick={() => multiFileInputRef.current?.click()}
                                >
                                    <Icons.UploadCloud />
                                    <span>Pilih Banyak File Gambar</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="batch-container-view">
                            {/* Batch Summary & Progress Header */}
                            <div className="batch-summary-panel">
                                <div className="batch-summary-header">
                                    <div className="batch-folder-info">
                                        <span className="batch-folder-icon">
                                            <Icons.Folder />
                                        </span>
                                        <div>
                                            <h3 className="batch-folder-title">{folderName || "Folder Lokal"}</h3>
                                            <p className="batch-folder-subtitle">
                                                {batchItems.length} file gambar terdeteksi • {completedCount} selesai dianalisis
                                            </p>
                                        </div>
                                    </div>

                                    <div className="batch-metrics-row">
                                        <div className="batch-metric-pill">
                                            <span>Total: <strong>{batchItems.length}</strong></span>
                                        </div>
                                        <div className="batch-metric-pill success">
                                            <Icons.Sparkles />
                                            <span>Metadata AI: <strong>{withMetaCount}</strong></span>
                                        </div>
                                        <div className="batch-metric-pill muted">
                                            <span>Tanpa Metadata: <strong>{noMetaCount}</strong></span>
                                        </div>
                                        {isBatchScanning && (
                                            <div className="batch-metric-pill scanning">
                                                <span className="inspector-spinner" style={{ width: 12, height: 12 }} />
                                                <span>Memindai ({scanningCount} aktif)...</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="batch-progress-box">
                                    <div className="batch-progress-label-row">
                                        <span>Status Pemindaian: {isBatchScanning ? "Sedang Menganalisis Gambar..." : "Selesai"}</span>
                                        <span>{completedCount} / {batchItems.length} ({progressPercent}%)</span>
                                    </div>
                                    <div className="batch-progress-track">
                                        <div className="batch-progress-bar" style={{ width: `${progressPercent}%` }} />
                                    </div>
                                </div>

                                {/* Filter and Action Controls */}
                                <div className="batch-controls-row">
                                    <div className="batch-filter-tabs">
                                        <button
                                            type="button"
                                            className={`batch-filter-btn ${batchFilter === "all" ? "active" : ""}`}
                                            onClick={() => setBatchFilter("all")}
                                        >
                                            Semua ({batchItems.length})
                                        </button>
                                        <button
                                            type="button"
                                            className={`batch-filter-btn ${batchFilter === "has_meta" ? "active" : ""}`}
                                            onClick={() => setBatchFilter("has_meta")}
                                        >
                                            Berisi Metadata AI ({withMetaCount})
                                        </button>
                                        <button
                                            type="button"
                                            className={`batch-filter-btn ${batchFilter === "no_meta" ? "active" : ""}`}
                                            onClick={() => setBatchFilter("no_meta")}
                                        >
                                            Tanpa Metadata ({noMetaCount})
                                        </button>
                                    </div>

                                    <input
                                        type="text"
                                        className="batch-search-input"
                                        placeholder="Cari nama file, prompt, checkpoint, LoRA..."
                                        value={batchSearch}
                                        onChange={(e) => setBatchSearch(e.target.value)}
                                    />

                                    <div className="batch-actions-group">
                                        {withMetaCount > 0 && (
                                            <>
                                                <button
                                                    type="button"
                                                    className="batch-bulk-btn primary"
                                                    onClick={handleCopyAllPrompts}
                                                    title="Salin seluruh prompt dari foto-foto yang memiliki metadata"
                                                >
                                                    {copiedKey === "batch-all-prompts" ? <Icons.Check /> : <Icons.Copy />}
                                                    <span>{copiedKey === "batch-all-prompts" ? "Semua Disalin!" : `Salin Semua Prompt (${withMetaCount})`}</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    className="batch-bulk-btn"
                                                    onClick={handleExportBatchJSON}
                                                    title="Unduh laporan ringkasan JSON seluruh file dan metadata"
                                                >
                                                    <Icons.Download />
                                                    <span>Ekspor JSON</span>
                                                </button>
                                            </>
                                        )}

                                        <button
                                            type="button"
                                            className="batch-bulk-btn"
                                            onClick={() => folderInputRef.current?.click()}
                                            title="Buka folder lokal lain"
                                        >
                                            <Icons.Folder />
                                            <span>Ganti Folder</span>
                                        </button>

                                        <button
                                            type="button"
                                            className="batch-bulk-btn"
                                            onClick={handleClearBatch}
                                            title="Kosongkan batch"
                                        >
                                            <Icons.Trash />
                                            <span>Reset</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Visual Cards Grid */}
                            {filteredBatchItems.length === 0 ? (
                                <div
                                    style={{
                                        textAlign: "center",
                                        padding: "60px 20px",
                                        color: "#64748b",
                                        background: "#111419",
                                        borderRadius: 10,
                                        border: "1px dashed #232934",
                                    }}
                                >
                                    <Icons.Search />
                                    <p style={{ marginTop: 8, fontSize: 14 }}>
                                        Tidak ada file yang cocok dengan filter atau kata kunci "{batchSearch}".
                                    </p>
                                </div>
                            ) : (
                                <div className="batch-grid">
                                    {filteredBatchItems.map((item) => {
                                        const actualIdx = batchItems.findIndex((b) => b.id === item.id);
                                        const isScanning = item.status === "scanning";
                                        const isPending = item.status === "pending";

                                        return (
                                            <div
                                                key={item.id}
                                                className={`batch-card ${item.hasMetadata ? "has-meta" : "no-meta"}`}
                                                onClick={() => handleInspectBatchItem(actualIdx)}
                                            >
                                                <div className="batch-card-img-wrap">
                                                    <img
                                                        src={item.previewUrl}
                                                        alt={item.name}
                                                        className="batch-card-img"
                                                        loading="lazy"
                                                    />
                                                    <span
                                                        className={`batch-card-status-badge ${
                                                            isScanning || isPending
                                                                ? "badge-scanning"
                                                                : item.hasMetadata
                                                                ? item.source === "comfyui"
                                                                    ? "badge-comfyui"
                                                                    : item.source === "a1111"
                                                                    ? "badge-a1111"
                                                                    : item.source === "novelai"
                                                                    ? "badge-novelai"
                                                                    : "badge-fooocus"
                                                                : "badge-none"
                                                        }`}
                                                    >
                                                        {isScanning
                                                            ? "Memindai..."
                                                            : isPending
                                                            ? "Antrean"
                                                            : item.hasMetadata
                                                            ? item.source === "comfyui"
                                                                ? "ComfyUI"
                                                                : item.source === "a1111"
                                                                ? "Auto1111"
                                                                : item.source === "novelai"
                                                                ? "NovelAI"
                                                                : "AI Gen"
                                                            : "Tanpa Metadata"}
                                                    </span>
                                                </div>

                                                <div className="batch-card-body">
                                                    <div className="batch-card-title-row">
                                                        <h4 className="batch-card-filename" title={item.name}>
                                                            {item.name}
                                                        </h4>
                                                        <span className="batch-card-filesize">{formatBytes(item.size)}</span>
                                                    </div>

                                                    {item.hasMetadata && item.metadata ? (
                                                        <>
                                                            <div className="batch-card-tags-row">
                                                                {item.metadata.model_name && (
                                                                    <span
                                                                        className="batch-model-pill"
                                                                        title={`Checkpoint Model: ${item.metadata.model_name}`}
                                                                    >
                                                                        {item.metadata.model_name}
                                                                    </span>
                                                                )}

                                                                {item.metadata.loras &&
                                                                    item.metadata.loras.map((lora, lIdx) => (
                                                                        <span
                                                                            key={lIdx}
                                                                            className="batch-lora-pill"
                                                                            title={`LoRA: <lora:${lora.name}:${lora.weight}>`}
                                                                        >
                                                                            {lora.name} ({lora.weight})
                                                                        </span>
                                                                    ))}

                                                                {item.metadata.sampler && (
                                                                    <span
                                                                        style={{
                                                                            fontSize: "10px",
                                                                            fontFamily: "monospace",
                                                                            color: "#94a3b8",
                                                                            background: "#0d0f13",
                                                                            padding: "2px 5px",
                                                                            borderRadius: "4px",
                                                                        }}
                                                                    >
                                                                        {item.metadata.sampler} • {item.metadata.steps || 20}st
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {item.metadata.positive_prompt ? (
                                                                <p className="batch-card-prompt" title={item.metadata.positive_prompt}>
                                                                    {item.metadata.positive_prompt}
                                                                </p>
                                                            ) : (
                                                                <span className="batch-card-no-meta-msg">
                                                                    Workflow terdeteksi tanpa positive prompt eksplisit.
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <p className="batch-card-no-meta-msg">
                                                            {isScanning
                                                                ? "Sedang membaca chunk metadata gambar..."
                                                                : "Tidak ditemukan metadata generasi AI tertanam."}
                                                        </p>
                                                    )}

                                                    <div className="batch-card-actions">
                                                        <button
                                                            type="button"
                                                            className="batch-card-btn-inspect"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleInspectBatchItem(actualIdx);
                                                            }}
                                                        >
                                                            <Icons.Search />
                                                            <span>Inspeksi Lengkap</span>
                                                        </button>

                                                        {!item.hasMetadata && item.status === "done" && (
                                                            <button
                                                                type="button"
                                                                className="batch-card-btn-copy"
                                                                style={{ borderColor: "rgba(59, 130, 246, 0.4)", color: "#60a5fa", background: "rgba(37, 99, 235, 0.1)" }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleInspectBatchItem(actualIdx);
                                                                    handleRunInterrogate(item.file);
                                                                }}
                                                                title="Bedah prompt gambar ini menggunakan AI Vision"
                                                            >
                                                                <Icons.Sparkles />
                                                                <span>AI Reverse Prompt</span>
                                                            </button>
                                                        )}

                                                        {item.hasMetadata && item.metadata?.positive_prompt && (
                                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                                <button
                                                                    type="button"
                                                                    className="batch-card-btn-copy"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleCopy(item.metadata!.positive_prompt || "", `copy-batch-${item.id}`);
                                                                    }}
                                                                    title="Salin Positive Prompt"
                                                                >
                                                                    {copiedKey === `copy-batch-${item.id}` ? "Tersalin!" : "Salin"}
                                                                </button>

                                                                <Link
                                                                    to={`/prompt-lab?positive=${encodeURIComponent(item.metadata.positive_prompt || "")}&negative=${encodeURIComponent(item.metadata.negative_prompt || "")}`}
                                                                    className="batch-card-btn-copy"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    title="Buka prompt ini di Prompt Lab Canvas"
                                                                    style={{ textDecoration: "none", color: "#60a5fa" }}
                                                                >
                                                                    Uji di Lab →
                                                                </Link>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* STATE 1 - Mode 3: Text Paste Mode (Hanya jika belum ada file aktif) */}
            {!isInspecting && mode === "paste" && (
                <div className="inspector-paste-box">
                    <textarea
                        className="paste-textarea"
                        placeholder="Tempel parameter teks Automatic1111 / WebUI atau ComfyUI Prompt JSON di sini..."
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                    />
                    <div className="paste-actions-row">
                        <button
                            type="button"
                            className="mode-tab-btn active"
                            onClick={handleParseText}
                            disabled={!pastedText.trim() || isLoading}
                            style={{ padding: "8px 18px", fontSize: 13 }}
                        >
                            {isLoading ? "Menganalisis..." : "Analisis Teks Metadata"}
                        </button>
                    </div>
                </div>
            )}

            {/* Batch Item Deep Inspection Navigation Banner */}
            {mode === "batch" && selectedBatchIdx !== null && (
                <div className="batch-detail-banner">
                    <div className="batch-detail-banner-left">
                        <button
                            type="button"
                            className="batch-back-btn"
                            onClick={() => setSelectedBatchIdx(null)}
                        >
                            <Icons.ArrowLeft />
                            <span>Kembali ke Daftar Batch ({batchItems.length} Foto)</span>
                        </button>
                        <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                            Foto {selectedBatchIdx + 1} dari {batchItems.length}:{" "}
                            <strong style={{ color: "#fff" }}>{batchItems[selectedBatchIdx]?.name}</strong>
                        </span>
                    </div>
                    <div className="batch-nav-arrows">
                        <button
                            type="button"
                            className="batch-nav-btn"
                            onClick={() => handleInspectBatchItem(selectedBatchIdx - 1)}
                            disabled={selectedBatchIdx === 0}
                        >
                            ‹ Sebelumnya
                        </button>
                        <button
                            type="button"
                            className="batch-nav-btn"
                            onClick={() => handleInspectBatchItem(selectedBatchIdx + 1)}
                            disabled={selectedBatchIdx === batchItems.length - 1}
                        >
                            Selanjutnya ›
                        </button>
                    </div>
                </div>
            )}

            {/* STATE 2: Active Inspection Workspace (2-Kolom Grid) */}
            {isInspecting && currentFile && (
                <div className="inspector-results-grid">
                    {/* Kolom Kiri: Image Preview & File Card (~340px) */}
                    <div className="inspector-left-panel">
                        <div className="preview-card">
                            <div className="preview-image-wrap">
                                {currentFile.url ? (
                                    <img
                                        src={currentFile.url}
                                        alt={currentFile.name}
                                        className="preview-img"
                                        onLoad={(e) => {
                                            setNaturalDimensions({
                                                width: e.currentTarget.naturalWidth,
                                                height: e.currentTarget.naturalHeight,
                                            });
                                        }}
                                    />
                                ) : (
                                    <div className="preview-placeholder">
                                        <Icons.Layers />
                                        <span>Sumber Workflow / Teks Mentah</span>
                                    </div>
                                )}
                            </div>

                            <div className="preview-meta-body">
                                <h3 className="preview-file-name" title={currentFile.name}>
                                    {currentFile.name}
                                </h3>

                                {/* Micro Properties Grid */}
                                <div className="preview-micro-grid">
                                    <div className="micro-prop-cell">
                                        <span className="micro-prop-label">Ukuran</span>
                                        <span className="micro-prop-val">{formatBytes(currentFile.size)}</span>
                                    </div>
                                    <div className="micro-prop-cell">
                                        <span className="micro-prop-label">Dimensi</span>
                                        <span className="micro-prop-val">
                                            {metaResult?.width && metaResult?.height
                                                ? `${metaResult.width} × ${metaResult.height} px`
                                                : naturalDimensions
                                                ? `${naturalDimensions.width} × ${naturalDimensions.height} px`
                                                : "-"}
                                        </span>
                                    </div>
                                    <div className="micro-prop-cell">
                                        <span className="micro-prop-label">Format</span>
                                        <span className="micro-prop-val">{metaResult?.format?.toUpperCase() || currentFile.format || "PNG"}</span>
                                    </div>
                                    <div className="micro-prop-cell">
                                        <span className="micro-prop-label">Status</span>
                                        <span className={`micro-prop-val ${hasAiMetadata ? "highlight" : "muted"}`}>
                                            {hasAiMetadata
                                                ? (metaResult?.source === "comfyui"
                                                    ? "ComfyUI"
                                                    : metaResult?.source === "a1111"
                                                    ? "WebUI"
                                                    : metaResult?.source === "novelai"
                                                    ? "NovelAI"
                                                    : metaResult?.source === "gallery_db"
                                                    ? "Galeri"
                                                    : metaResult?.source === "ai_interrogated"
                                                    ? "AI Vision"
                                                    : "AI Metadata")
                                                : "Polos (Stripped)"}
                                        </span>
                                    </div>
                                </div>

                                <div className="preview-actions-column">
                                    <button
                                        type="button"
                                        className="preview-btn preview-btn-primary"
                                        onClick={() => fileInputRef.current?.click()}
                                        title="Pilih file gambar baru untuk diperiksa"
                                    >
                                        <Icons.Refresh />
                                        <span>Ganti Gambar / Unggah Baru</span>
                                    </button>

                                    {hasAiMetadata && metaResult?.positive_prompt && (
                                        <>
                                            <button
                                                type="button"
                                                className="preview-btn preview-btn-secondary"
                                                onClick={() => handleCopy(metaResult.positive_prompt || "", "left-pos")}
                                            >
                                                {copiedKey === "left-pos" ? <Icons.Check /> : <Icons.Copy />}
                                                <span>Salin Positive Prompt</span>
                                            </button>

                                            <button
                                                type="button"
                                                className="preview-btn preview-btn-secondary"
                                                onClick={() => {
                                                    const fullText = buildA1111ParametersText({
                                                        positive_prompt: metaResult.positive_prompt,
                                                        negative_prompt: metaResult.negative_prompt,
                                                        steps: metaResult.steps,
                                                        sampler: metaResult.sampler,
                                                        scheduler: metaResult.scheduler,
                                                        cfg_scale: metaResult.cfg_scale,
                                                        seed: metaResult.seed,
                                                        width: metaResult.width || naturalDimensions?.width,
                                                        height: metaResult.height || naturalDimensions?.height,
                                                        model_name: metaResult.model_name,
                                                        model_hash: metaResult.model_hash,
                                                    });
                                                    handleCopy(fullText, "left-webui");
                                                }}
                                            >
                                                {copiedKey === "left-webui" ? <Icons.Check /> : <Icons.Copy />}
                                                <span>Salin Parameter WebUI</span>
                                            </button>
                                            <button
                                                type="button"
                                                className="preview-btn preview-btn-secondary"
                                                onClick={() => {
                                                    const payload = buildWebUIApiPayload({
                                                        positive_prompt: metaResult.positive_prompt,
                                                        negative_prompt: metaResult.negative_prompt,
                                                        steps: metaResult.steps,
                                                        sampler: metaResult.sampler,
                                                        cfg_scale: metaResult.cfg_scale,
                                                        seed: metaResult.seed,
                                                        width: metaResult.width || naturalDimensions?.width,
                                                        height: metaResult.height || naturalDimensions?.height,
                                                    });
                                                    handleCopy(payload, "left-api");
                                                }}
                                            >
                                                {copiedKey === "left-api" ? <Icons.Check /> : <Icons.Code />}
                                                <span>Salin Payload API</span>
                                            </button>
                                        </>
                                    )}

                                    {hasAiMetadata && ((metaResult?.workflow_json || metaResult?.prompt_json) ? (
                                        <button
                                            type="button"
                                            className="preview-btn preview-btn-secondary"
                                            onClick={handleDownloadWorkflow}
                                        >
                                            <Icons.Download />
                                            <span>Unduh Workflow (.json)</span>
                                        </button>
                                    ) : metaResult?.positive_prompt ? (
                                        <button
                                            type="button"
                                            className="preview-btn preview-btn-secondary"
                                            onClick={() => {
                                                const workflowJson = buildComfyUIWorkflowJSON({
                                                    positive_prompt: metaResult.positive_prompt,
                                                    negative_prompt: metaResult.negative_prompt,
                                                    steps: metaResult.steps,
                                                    sampler: metaResult.sampler,
                                                    scheduler: metaResult.scheduler,
                                                    cfg_scale: metaResult.cfg_scale,
                                                    seed: metaResult.seed,
                                                    width: metaResult.width || naturalDimensions?.width,
                                                    height: metaResult.height || naturalDimensions?.height,
                                                    model_name: metaResult.model_name,
                                                });
                                                downloadTextAsFile(
                                                    workflowJson,
                                                    `${currentFile?.name.replace(/\.[^/.]+$/, "") || "exported"}_workflow.json`
                                                );
                                            }}
                                        >
                                            <Icons.Download />
                                            <span>Ekspor Workflow (.json)</span>
                                        </button>
                                    ) : null)}

                                    {/* Workflow Bridge Integration */}
                                    {(hasAiMetadata || (interrogateResult && (interrogateResult.danbooru_prompt || interrogateResult.natural_prompt))) && (
                                        <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #27272a" }}>
                                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                                                Workflow Bridge
                                            </div>
                                            <WorkflowBridgeMenu
                                                data={bridgeData}
                                                variant="solid-dark"
                                                buttonLabel="Kirim ke Alat ▾"
                                                align="left"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Kolom Kanan: Panel Hasil Inspeksi & Reverse Prompt */}
                    <div className="inspector-right-panel">
                        {/* KASUS B — Jika Metadata TIDAK Ditemukan (File Polos / Stripped) */}
                        {!hasAiMetadata ? (
                            <div className="pro-inspector-card">
                                {/* Compact Top Control Bar */}
                                {(() => {
                                    const activeModelName = aiProvider === "gemini"
                                        ? (PRESET_GEMINI_MODELS.find((m) => m.id === selectedGeminiModel)?.badge || selectedGeminiModel)
                                        : (localModelInput || "Default Model");
                                    const modelProfile = getModelProfileBadge(activeModelName);

                                    return (
                                        <div className="pro-top-control-bar">
                                            <div className="pro-control-left">
                                                <span className="pro-status-badge stripped">
                                                    <span className="pro-dot" /> Stripped (No EXIF)
                                                </span>
                                                <span className="pro-engine-badge">
                                                    <span className="pro-dot active" />
                                                    {aiProvider === "gemini" ? "Google Gemini" : aiProvider === "ollama" ? "Ollama" : "LM Studio"}
                                                    {" · "}
                                                    <span className="pro-model-name">{activeModelName}</span>
                                                </span>
                                                <span
                                                    className="pro-profile-badge"
                                                    style={{
                                                        borderColor: modelProfile.color,
                                                        color: modelProfile.color,
                                                    }}
                                                >
                                                    {modelProfile.label}
                                                </span>
                                            </div>

                                            <div className="pro-control-right">
                                                <button
                                                    type="button"
                                                    className="pro-btn-secondary"
                                                    onClick={() => setShowApiKeyModal(true)}
                                                    title="Pengaturan Provider & Model AI"
                                                >
                                                    <Icons.Settings />
                                                    <span>⚙ Provider & Model</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="pro-btn-primary"
                                                    onClick={() => handleRunInterrogate()}
                                                    disabled={isInterrogating || !rawFile}
                                                >
                                                    {isInterrogating ? (
                                                        <>
                                                            <span className="inspector-spinner" style={{ width: 13, height: 13 }} />
                                                            <span>Mengekstrak Prompt...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Icons.Sparkles />
                                                            <span>Ekstrak Prompt</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Error Alert if Interrogation Failed */}
                                {interrogateError && (
                                    <div className="pro-error-banner">
                                        <span className="pro-error-text">{interrogateError}</span>
                                        <button
                                            type="button"
                                            className="pro-btn-secondary mini"
                                            onClick={() => setShowApiKeyModal(true)}
                                        >
                                            <Icons.Settings />
                                            <span>Buka Pengaturan</span>
                                        </button>
                                    </div>
                                )}

                                {/* Interrogation Result */}
                                {interrogateResult && (
                                    <div className="pro-interrogate-content">
                                        {/* Status Meta Row */}
                                        <div className="pro-result-meta-row">
                                            <span className="pro-rec-badge">Hasil Ekstraksi VLM</span>
                                            {interrogateResult.character && (
                                                <span className="pro-char-badge">
                                                    Karakter: <strong>{interrogateResult.character}</strong>
                                                </span>
                                            )}
                                            <span className="pro-rec-badge">
                                                Rekomendasi: <strong>{interrogateResult.recommended_model}</strong>
                                            </span>
                                            {(() => {
                                                const ratingInfo = getRatingBadgeInfo(interrogateResult);
                                                if (!ratingInfo) return null;
                                                return (
                                                    <span className={`pro-rating-badge rating-${ratingInfo.tier}`}>
                                                        {ratingInfo.label}
                                                    </span>
                                                );
                                            })()}
                                            {interrogateResult.recommended_sampler && (
                                                <span className="pro-params-badge">
                                                    {interrogateResult.recommended_sampler} · {interrogateResult.recommended_steps} steps · CFG {interrogateResult.recommended_cfg}
                                                </span>
                                            )}
                                        </div>

                                        {/* Collapsible Accordion: Audit Fakta Visual (Observed Facts) */}
                                        {interrogateResult.observed_facts && (
                                            <div className="pro-audit-accordion">
                                                <button
                                                    type="button"
                                                    className="pro-audit-toggle-btn"
                                                    onClick={() => setIsAuditOpen(!isAuditOpen)}
                                                >
                                                    <div className="pro-audit-toggle-left">
                                                        <span className="pro-audit-icon">{isAuditOpen ? "▾" : "▸"}</span>
                                                        <span className="pro-audit-title">Audit Visual Fakta (6 Parameter Verifikasi)</span>
                                                    </div>
                                                    <span className="pro-audit-state-pill">{isAuditOpen ? "Sembunyikan" : "Tampilkan Rincian"}</span>
                                                </button>
                                                {isAuditOpen && (
                                                    <div className="pro-audit-grid">
                                                        <div className="pro-audit-card">
                                                            <span className="pro-audit-card-label">Camera & Pose</span>
                                                            <p className="pro-audit-card-val">{getObservedFactVal(interrogateResult.observed_facts, "camera_and_pose") || "—"}</p>
                                                        </div>
                                                        <div className="pro-audit-card">
                                                            <span className="pro-audit-card-label">Hair & Face</span>
                                                            <p className="pro-audit-card-val">{getObservedFactVal(interrogateResult.observed_facts, "hair_and_face") || "—"}</p>
                                                        </div>
                                                        <div className="pro-audit-card">
                                                            <span className="pro-audit-card-label">Upper & Lower Clothing</span>
                                                            <p className="pro-audit-card-val">{getObservedFactVal(interrogateResult.observed_facts, "upper_and_lower_clothing") || "—"}</p>
                                                        </div>
                                                        <div className="pro-audit-card">
                                                            <span className="pro-audit-card-label">Hands & Limbs Visibility</span>
                                                            <p className="pro-audit-card-val">{getObservedFactVal(interrogateResult.observed_facts, "hands_and_limbs_visibility") || "—"}</p>
                                                        </div>
                                                        <div className="pro-audit-card">
                                                            <span className="pro-audit-card-label">Exposure & Rating Audit</span>
                                                            <p className="pro-audit-card-val">{getObservedFactVal(interrogateResult.observed_facts, "exposure_and_rating_audit") || "—"}</p>
                                                        </div>
                                                        <div className="pro-audit-card">
                                                            <span className="pro-audit-card-label">Environment</span>
                                                            <p className="pro-audit-card-val">{getObservedFactVal(interrogateResult.observed_facts, "environment") || "—"}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Danbooru Tag Prompt */}
                                        {(() => {
                                            const danbooruTags = (interrogateResult.danbooru_prompt || "")
                                                .split(",")
                                                .map((t) => t.trim())
                                                .filter(Boolean);

                                            return (
                                                <div className="pro-output-box">
                                                    <div className="pro-output-header">
                                                        <div className="pro-output-title-group">
                                                            <span className="pro-output-label">POSITIVE PROMPT — BOORU TAGS</span>
                                                            <span className="pro-output-count">({danbooruTags.length})</span>
                                                        </div>
                                                        <div className="pro-output-actions">
                                                            <div className="pro-view-toggle">
                                                                <button
                                                                    type="button"
                                                                    className={`pro-toggle-btn ${danbooruViewMode === "chips" ? "active" : ""}`}
                                                                    onClick={() => setDanbooruViewMode("chips")}
                                                                >
                                                                    Chips
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className={`pro-toggle-btn ${danbooruViewMode === "raw" ? "active" : ""}`}
                                                                    onClick={() => setDanbooruViewMode("raw")}
                                                                >
                                                                    Raw Text
                                                                </button>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="pro-copy-btn"
                                                                onClick={() => handleCopy(interrogateResult.danbooru_prompt, "copy-ai-danbooru")}
                                                            >
                                                                {copiedKey === "copy-ai-danbooru" ? <Icons.Check /> : <Icons.Copy />}
                                                                <span>{copiedKey === "copy-ai-danbooru" ? "Tersalin!" : "Salin Positive Prompt"}</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="pro-output-body">
                                                        {danbooruViewMode === "chips" ? (
                                                            <div className="pro-chips-grid">
                                                                {danbooruTags.map((tag, idx) => (
                                                                    <span key={idx} className={`pro-danbooru-chip ${getTagCategoryClass(tag)}`}>
                                                                        <span className="chip-text">{tag}</span>
                                                                        <button
                                                                            type="button"
                                                                            className="chip-delete-btn"
                                                                            onClick={() => handleDeleteTag(idx)}
                                                                            title="Hapus tag ini"
                                                                        >
                                                                            ×
                                                                        </button>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="pro-raw-text-box danbooru">
                                                                {interrogateResult.danbooru_prompt}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Negative Prompt */}
                                        {interrogateResult.negative_prompt && (
                                            <div className="pro-output-box">
                                                <div className="pro-output-header">
                                                    <span className="pro-output-label">NEGATIVE PROMPT</span>
                                                    <button
                                                        type="button"
                                                        className="pro-copy-btn"
                                                        onClick={() => handleCopy(interrogateResult.negative_prompt, "copy-ai-neg")}
                                                    >
                                                        {copiedKey === "copy-ai-neg" ? <Icons.Check /> : <Icons.Copy />}
                                                        <span>{copiedKey === "copy-ai-neg" ? "Tersalin!" : "Salin"}</span>
                                                    </button>
                                                </div>
                                                <div className="pro-output-body">
                                                    <div className="pro-raw-text-box">
                                                        {interrogateResult.negative_prompt}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Natural Language Prompt */}
                                        {interrogateResult.natural_prompt && (
                                            <div className="pro-output-box">
                                                <div className="pro-output-header">
                                                    <span className="pro-output-label">POSITIVE PROMPT — NATURAL / CAPTION</span>
                                                    <button
                                                        type="button"
                                                        className="pro-copy-btn"
                                                        onClick={() => handleCopy(interrogateResult.natural_prompt, "copy-ai-natural")}
                                                    >
                                                        {copiedKey === "copy-ai-natural" ? <Icons.Check /> : <Icons.Copy />}
                                                        <span>{copiedKey === "copy-ai-natural" ? "Tersalin!" : "Salin"}</span>
                                                    </button>
                                                </div>
                                                <div className="pro-output-body">
                                                    <div className="pro-raw-text-box">
                                                        {interrogateResult.natural_prompt}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Footer Style & LoRA Grid */}
                                        <div className="pro-footer-meta-grid">
                                            <div>
                                                <span className="pro-meta-label">Art Style Tags</span>
                                                <div className="pro-style-chips-row">
                                                    {interrogateResult.style_tags?.length > 0 ? (
                                                        interrogateResult.style_tags.map((st, i) => (
                                                            <span key={i} className="pro-style-chip">#{st}</span>
                                                        ))
                                                    ) : (
                                                        <span className="pro-empty-note">Default Anime / Digital</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <span className="pro-meta-label">Rekomendasi LoRA Terverifikasi</span>
                                                <div className="pro-lora-chips-row">
                                                    {interrogateResult.suggested_loras && interrogateResult.suggested_loras.length > 0 ? (
                                                        interrogateResult.suggested_loras.map((lora, i) => (
                                                            <div key={i} className="pro-lora-item">
                                                                <span className="pro-lora-name">{lora.name}</span>
                                                                <span className="pro-lora-badge">{lora.weight}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <span className="pro-empty-note">Tanpa rekomendasi LoRA spesifik</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bottom Action Buttons */}
                                        <div className="pro-interrogate-bottom-actions">
                                            <button
                                                type="button"
                                                className="pro-apply-meta-btn"
                                                onClick={handleApplyInterrogateToMetadata}
                                            >
                                                <Icons.Copy />
                                                <span>Terapkan ke Parameter & Quick Copy</span>
                                            </button>
                                            <Link
                                                to={`/prompt-lab?positive=${encodeURIComponent(interrogateResult.danbooru_prompt)}&negative=${encodeURIComponent(interrogateResult.negative_prompt)}`}
                                                className="pro-lab-transfer-btn"
                                            >
                                                <span>Buka di Prompt Lab Canvas →</span>
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* KASUS A — Jika Metadata Ditemukan (Valid AI Image) */
                            <>
                                {/* Workflow Bridge Strip */}
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "8px 14px",
                                    marginBottom: "12px",
                                    background: "#121215",
                                    border: "1px solid #27272a",
                                    borderRadius: "8px",
                                    gap: "12px",
                                    flexWrap: "wrap",
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2563eb", display: "inline-block" }} />
                                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#f4f4f5" }}>Workflow Bridge:</span>
                                        <span style={{ fontSize: "11px", color: "#a1a1aa" }}>Kirim metadata ini langsung ke tool lain:</span>
                                    </div>
                                    <WorkflowBridgeMenu
                                        data={bridgeData}
                                        variant="solid-blue"
                                        buttonLabel="Kirim ke Alat ▾"
                                        align="right"
                                    />
                                </div>

                                <div className="inspector-tabs-header">
                                    <button
                                        type="button"
                                        className={`inspector-tab-item ${activeTab === "params" ? "active" : ""}`}
                                        onClick={() => setActiveTab("params")}
                                    >
                                        <Icons.Inspector />
                                        <span>Prompt & Parameter</span>
                                    </button>

                                    {(metaResult?.workflow_json || metaResult?.prompt_json) && (
                                        <button
                                            type="button"
                                            className={`inspector-tab-item ${activeTab === "workflow" ? "active" : ""}`}
                                            onClick={() => setActiveTab("workflow")}
                                        >
                                            <Icons.Layers />
                                            <span>Workflow / Node Graph</span>
                                        </button>
                                    )}

                                    {metaResult?.raw_prompt && (
                                        <button
                                            type="button"
                                            className={`inspector-tab-item ${activeTab === "raw" ? "active" : ""}`}
                                            onClick={() => setActiveTab("raw")}
                                        >
                                            <Icons.Code />
                                            <span>Blok Parameter Mentah</span>
                                        </button>
                                    )}

                                    {metaResult?.raw_chunks && Object.keys(metaResult.raw_chunks).length > 0 && (
                                        <button
                                            type="button"
                                            className={`inspector-tab-item ${activeTab === "chunks" ? "active" : ""}`}
                                            onClick={() => setActiveTab("chunks")}
                                        >
                                            <span>Raw EXIF / JSON</span>
                                            <span className="inspector-tab-count">
                                                {Object.keys(metaResult.raw_chunks).length}
                                            </span>
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        className={`inspector-tab-item ${activeTab === "reverse" ? "active" : ""}`}
                                        onClick={() => setActiveTab("reverse")}
                                    >
                                        <Icons.Sparkles />
                                        <span>Reverse Prompt (AI Vision)</span>
                                    </button>
                                </div>

                                <div className="inspector-tab-body">
                                    {/* Tab 1: Prompt & Parameter */}
                                    {activeTab === "params" && (
                                        <>
                                            {/* Positive Prompt */}
                                            {metaResult?.positive_prompt && (
                                                <div className="inspector-section">
                                                    <div className="inspector-section-title">
                                                        <span>Positive Prompt</span>
                                                        <button
                                                            type="button"
                                                            className={`copy-mini-btn ${copiedKey === "tab-pos" ? "copied" : ""}`}
                                                            onClick={() => handleCopy(metaResult.positive_prompt || "", "tab-pos")}
                                                        >
                                                            {copiedKey === "tab-pos" ? <Icons.Check /> : <Icons.Copy />}
                                                            <span>{copiedKey === "tab-pos" ? "Tersalin!" : "Salin"}</span>
                                                        </button>
                                                    </div>
                                                    <div className="inspector-prompt-block">
                                                        {metaResult.positive_prompt}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Negative Prompt */}
                                            {metaResult?.negative_prompt && (
                                                <div className="inspector-section">
                                                    <div className="inspector-section-title">
                                                        <span>Negative Prompt</span>
                                                        <button
                                                            type="button"
                                                            className={`copy-mini-btn ${copiedKey === "tab-neg" ? "copied" : ""}`}
                                                            onClick={() => handleCopy(metaResult.negative_prompt || "", "tab-neg")}
                                                        >
                                                            {copiedKey === "tab-neg" ? <Icons.Check /> : <Icons.Copy />}
                                                            <span>{copiedKey === "tab-neg" ? "Tersalin!" : "Salin"}</span>
                                                        </button>
                                                    </div>
                                                    <div className="inspector-prompt-block negative">
                                                        {metaResult.negative_prompt}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Parameter Generasi Grid */}
                                            <div className="inspector-section">
                                                <div className="inspector-section-title">
                                                    <span>Parameter Generasi</span>
                                                </div>
                                                <div className="params-meta-grid">
                                                    {metaResult?.model_name && (
                                                        <div className="param-meta-cell full-span">
                                                            <span className="param-cell-label">Checkpoint / Model</span>
                                                            <span className="param-cell-value" title={metaResult.model_name}>
                                                                {metaResult.model_name}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {metaResult?.sampler && (
                                                        <div className="param-meta-cell">
                                                            <span className="param-cell-label">Sampler</span>
                                                            <span className="param-cell-value">
                                                                {metaResult.sampler}
                                                                {metaResult.scheduler ? ` (${metaResult.scheduler})` : ""}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {metaResult?.steps !== undefined && metaResult.steps > 0 && (
                                                        <div className="param-meta-cell">
                                                            <span className="param-cell-label">Steps</span>
                                                            <span className="param-cell-value">{metaResult.steps}</span>
                                                        </div>
                                                    )}
                                                    {metaResult?.cfg_scale !== undefined && metaResult.cfg_scale > 0 && (
                                                        <div className="param-meta-cell">
                                                            <span className="param-cell-label">CFG Scale</span>
                                                            <span className="param-cell-value">{metaResult.cfg_scale}</span>
                                                        </div>
                                                    )}
                                                    {metaResult?.seed !== undefined && metaResult.seed !== 0 && (
                                                        <div className="param-meta-cell">
                                                            <span className="param-cell-label">Seed</span>
                                                            <span className="param-cell-value seed-cell">
                                                                <span>{metaResult.seed}</span>
                                                                <button
                                                                    type="button"
                                                                    className="copy-mini-btn"
                                                                    style={{ padding: "1px 5px", fontSize: 10 }}
                                                                    onClick={() => handleCopy(String(metaResult.seed), "seed-copy")}
                                                                    title="Salin Seed"
                                                                >
                                                                    {copiedKey === "seed-copy" ? <Icons.Check /> : <Icons.Copy />}
                                                                </button>
                                                            </span>
                                                        </div>
                                                    )}
                                                    {(metaResult?.width && metaResult?.height) || naturalDimensions ? (
                                                        <div className="param-meta-cell">
                                                            <span className="param-cell-label">Resolusi</span>
                                                            <span className="param-cell-value">
                                                                {metaResult?.width && metaResult?.height
                                                                    ? `${metaResult.width} × ${metaResult.height}`
                                                                    : `${naturalDimensions?.width} × ${naturalDimensions?.height}`}
                                                            </span>
                                                        </div>
                                                    ) : null}
                                                    {metaResult?.clip_skip !== undefined && metaResult.clip_skip > 0 && (
                                                        <div className="param-meta-cell">
                                                            <span className="param-cell-label">Clip Skip</span>
                                                            <span className="param-cell-value">{metaResult.clip_skip}</span>
                                                        </div>
                                                    )}
                                                    {metaResult?.denoising_strength !== undefined && metaResult.denoising_strength > 0 && (
                                                        <div className="param-meta-cell">
                                                            <span className="param-cell-label">Denoise Strength</span>
                                                            <span className="param-cell-value">{metaResult.denoising_strength}</span>
                                                        </div>
                                                    )}
                                                    {metaResult?.vae && (
                                                        <div className="param-meta-cell">
                                                            <span className="param-cell-label">VAE</span>
                                                            <span className="param-cell-value">{metaResult.vae}</span>
                                                        </div>
                                                    )}
                                                    {metaResult?.hires_upscaler && (
                                                        <div className="param-meta-cell">
                                                            <span className="param-cell-label">Hires Upscaler</span>
                                                            <span className="param-cell-value">
                                                                {metaResult.hires_upscaler}
                                                                {metaResult.hires_upscale ? ` (${metaResult.hires_upscale}x)` : ""}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* LoRA Terdeteksi */}
                                            {metaResult?.loras && metaResult.loras.length > 0 && (
                                                <div className="inspector-section">
                                                    <div className="inspector-section-title">
                                                        <span>LoRA Terdeteksi ({metaResult.loras.length})</span>
                                                    </div>
                                                    <div className="lora-chips-row">
                                                        {metaResult.loras.map((lora, idx) => (
                                                            <div key={idx} className="lora-chip-item">
                                                                <span>{lora.name}</span>
                                                                <span className="lora-weight-badge">{lora.weight.toFixed(2)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Parameter Tambahan */}
                                            {metaResult?.extra_params && Object.keys(metaResult.extra_params).length > 0 && (
                                                <div className="inspector-section">
                                                    <div className="inspector-section-title">
                                                        <span>Parameter Tambahan</span>
                                                    </div>
                                                    <div className="params-meta-grid">
                                                        {Object.entries(metaResult.extra_params).map(([k, v]) => (
                                                            <div key={k} className="param-meta-cell">
                                                                <span className="param-cell-label">{k}</span>
                                                                <span className="param-cell-value" title={v}>{v}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Tab 2: Workflow / Node Graph */}
                                    {activeTab === "workflow" && (
                                        <div className="inspector-section">
                                            <div className="inspector-section-title">
                                                <span>ComfyUI Node Graph / Workflow</span>
                                                <div style={{ display: "flex", gap: 8 }}>
                                                    <button
                                                        type="button"
                                                        className="copy-mini-btn"
                                                        onClick={handleDownloadWorkflow}
                                                    >
                                                        <Icons.Download />
                                                        <span>Simpan JSON</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="copy-mini-btn"
                                                        onClick={() =>
                                                            handleCopy(
                                                                metaResult?.workflow_json || metaResult?.prompt_json || "",
                                                                "workflow-copy"
                                                            )
                                                        }
                                                    >
                                                        {copiedKey === "workflow-copy" ? <Icons.Check /> : <Icons.Copy />}
                                                        <span>{copiedKey === "workflow-copy" ? "Tersalin!" : "Salin JSON"}</span>
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="inspector-prompt-block" style={{ maxHeight: "500px" }}>
                                                {(() => {
                                                    try {
                                                        const raw = metaResult?.workflow_json || metaResult?.prompt_json || "{}";
                                                        return JSON.stringify(JSON.parse(raw), null, 2);
                                                    } catch {
                                                        return metaResult?.workflow_json || metaResult?.prompt_json || "{}";
                                                    }
                                                })()}
                                            </div>
                                        </div>
                                    )}

                                    {/* Tab 3: Blok Parameter Mentah */}
                                    {activeTab === "raw" && (
                                        <div className="inspector-section">
                                            <div className="inspector-section-title">
                                                <span>Blok Parameter Mentah (Unparsed)</span>
                                                <button
                                                    type="button"
                                                    className={`copy-mini-btn ${copiedKey === "raw-copy" ? "copied" : ""}`}
                                                    onClick={() => handleCopy(metaResult?.raw_prompt || "", "raw-copy")}
                                                >
                                                    {copiedKey === "raw-copy" ? <Icons.Check /> : <Icons.Copy />}
                                                    <span>{copiedKey === "raw-copy" ? "Tersalin!" : "Salin Blok Parameter"}</span>
                                                </button>
                                            </div>
                                            <div className="inspector-prompt-block" style={{ maxHeight: "450px" }}>
                                                {metaResult?.raw_prompt}
                                            </div>
                                        </div>
                                    )}

                                    {/* Tab 4: Raw EXIF / JSON */}
                                    {activeTab === "chunks" && metaResult?.raw_chunks && (
                                        <div className="raw-chunks-container">
                                            <div className="inspector-section-title">
                                                <span>Semua Chunk & Tag EXIF Tertanam</span>
                                            </div>
                                            {Object.entries(metaResult.raw_chunks).map(([key, val]) => (
                                                <div key={key} className="raw-chunk-card">
                                                    <div className="raw-chunk-header">
                                                        <span className="raw-chunk-title">
                                                            <code>{key}</code>
                                                            <span className="raw-chunk-size">({val.length} karakter)</span>
                                                        </span>
                                                        <button
                                                            type="button"
                                                            className="copy-mini-btn"
                                                            onClick={() => handleCopy(val, `chunk-${key}`)}
                                                        >
                                                            {copiedKey === `chunk-${key}` ? <Icons.Check /> : <Icons.Copy />}
                                                            <span>{copiedKey === `chunk-${key}` ? "Tersalin!" : "Salin"}</span>
                                                        </button>
                                                    </div>
                                                    <div className="raw-chunk-content">{val}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Tab 5: Reverse Prompt (AI Vision) */}
                                    {activeTab === "reverse" && (
                                        <div className="inspector-section">
                                            <div className="ai-interrogator-hero" style={{ margin: 0 }}>
                                                <div className="ai-interrogator-hero-left">
                                                    <div className="ai-interrogator-icon-box">
                                                        <Icons.Sparkles />
                                                    </div>
                                                    <div className="ai-interrogator-content">
                                                        <div className="ai-interrogator-title-row">
                                                            <h4 className="ai-interrogator-title">Reverse Prompt (AI Vision)</h4>
                                                            <span
                                                                className="ai-model-active-pill"
                                                                title={`Engine aktif: ${aiProvider === "gemini" ? selectedGeminiModel : (localModelInput || "Default Model")}`}
                                                            >
                                                                <span className="ai-pill-dot" />
                                                                <span className="ai-pill-provider">
                                                                    {aiProvider === "gemini" ? "Gemini" : aiProvider === "ollama" ? "Ollama" : "LM Studio"}
                                                                </span>
                                                                <span className="ai-pill-divider">:</span>
                                                                <span className="ai-pill-model">
                                                                    {aiProvider === "gemini"
                                                                        ? (PRESET_GEMINI_MODELS.find((m) => m.id === selectedGeminiModel)?.badge || selectedGeminiModel)
                                                                        : (localModelInput || "local-model")}
                                                                </span>
                                                            </span>
                                                        </div>
                                                        <p className="ai-interrogator-desc">
                                                            Ekstrak gaya visual, tag Danbooru tambahan, dan prompt deskriptif langsung menggunakan AI Vision.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="ai-interrogator-hero-right">
                                                    <button
                                                        type="button"
                                                        className="ai-settings-btn"
                                                        onClick={() => setShowApiKeyModal(true)}
                                                        title="Pengaturan Provider & Model AI"
                                                    >
                                                        <Icons.Settings />
                                                        <span>Provider & Model</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="ai-interrogate-trigger-btn"
                                                        onClick={() => handleRunInterrogate()}
                                                        disabled={isInterrogating || !rawFile}
                                                    >
                                                        {isInterrogating ? (
                                                            <>
                                                                <span className="inspector-spinner" style={{ width: 14, height: 14 }}></span>
                                                                <span>Menganalisis...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Icons.Sparkles />
                                                                <span>Ekstrak Prompt dengan AI</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            {interrogateError && (
                                                <div className="ai-interrogate-inline-error" style={{ marginTop: 12 }}>
                                                    <span>{interrogateError}</span>
                                                    <button
                                                        type="button"
                                                        className="ai-settings-btn mini"
                                                        onClick={() => setShowApiKeyModal(true)}
                                                    >
                                                        <Icons.Settings />
                                                        <span>Buka Pengaturan</span>
                                                    </button>
                                                </div>
                                            )}

                                            {interrogateResult && (
                                                <div className="ai-interrogate-result-panel" style={{ marginTop: 16 }}>
                                                    <div className="ai-result-header">
                                                        <div className="ai-result-badge-group">
                                                            <span className="ai-model-rec-badge">Hasil Reverse Prompt</span>
                                                            {interrogateResult.character && (
                                                                <span className="ai-character-badge">
                                                                    Karakter: <strong>{interrogateResult.character}</strong>
                                                                </span>
                                                            )}
                                                            <span className="ai-model-rec-badge">
                                                                Rekomendasi: <strong>{interrogateResult.recommended_model}</strong>
                                                            </span>
                                                            {(() => {
                                                                const ratingInfo = getRatingBadgeInfo(interrogateResult);
                                                                if (!ratingInfo) return null;
                                                                return (
                                                                    <span className={`pro-rating-badge rating-${ratingInfo.tier}`}>
                                                                        {ratingInfo.label}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="batch-bulk-btn"
                                                            onClick={() => setInterrogateResult(null)}
                                                            style={{ fontSize: 11 }}
                                                        >
                                                            ✕ Tutup Hasil
                                                        </button>
                                                    </div>

                                                    <div className="ai-result-box">
                                                        <div className="ai-result-label-row">
                                                            <span className="ai-result-label">Positive Prompt (Booru Tags):</span>
                                                            <button
                                                                type="button"
                                                                className="copy-chip-btn"
                                                                onClick={() => handleCopy(interrogateResult.danbooru_prompt, "copy-ai-danbooru")}
                                                            >
                                                                {copiedKey === "copy-ai-danbooru" ? <Icons.Check /> : <Icons.Copy />}
                                                                <span>{copiedKey === "copy-ai-danbooru" ? "Tersalin!" : "Salin Positive Prompt"}</span>
                                                            </button>
                                                        </div>
                                                        <div className="ai-result-prompt-box danbooru">
                                                            {interrogateResult.danbooru_prompt}
                                                        </div>
                                                    </div>

                                                    {interrogateResult.negative_prompt && (
                                                        <div className="ai-result-box">
                                                            <div className="ai-result-label-row">
                                                                <span className="ai-result-label">Negative Prompt:</span>
                                                                <button
                                                                    type="button"
                                                                    className="copy-chip-btn"
                                                                    onClick={() => handleCopy(interrogateResult.negative_prompt, "copy-ai-neg")}
                                                                >
                                                                    {copiedKey === "copy-ai-neg" ? <Icons.Check /> : <Icons.Copy />}
                                                                    <span>{copiedKey === "copy-ai-neg" ? "Tersalin!" : "Salin Negative"}</span>
                                                                </button>
                                                            </div>
                                                            <div className="ai-result-prompt-box">
                                                                {interrogateResult.negative_prompt}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {interrogateResult.natural_prompt && (
                                                        <div className="ai-result-box">
                                                            <div className="ai-result-label-row">
                                                                <span className="ai-result-label">Positive Prompt (Natural / Caption):</span>
                                                                <button
                                                                    type="button"
                                                                    className="copy-chip-btn"
                                                                    onClick={() => handleCopy(interrogateResult.natural_prompt, "copy-ai-natural")}
                                                                >
                                                                    {copiedKey === "copy-ai-natural" ? <Icons.Check /> : <Icons.Copy />}
                                                                    <span>{copiedKey === "copy-ai-natural" ? "Tersalin!" : "Salin Positive Prompt"}</span>
                                                                </button>
                                                            </div>
                                                            <div className="ai-result-prompt-box">
                                                                {interrogateResult.natural_prompt}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 10 }}>
                                                        {interrogateResult.style_tags?.length > 0 && (
                                                            <div>
                                                                <span className="ai-result-label">Art Style Tags:</span>
                                                                <div className="ai-style-chips-row">
                                                                    {interrogateResult.style_tags.map((st, i) => (
                                                                        <span key={i} className="ai-style-chip">#{st}</span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {interrogateResult.suggested_loras?.length > 0 && (
                                                            <div>
                                                                <span className="ai-result-label">Saran LoRA:</span>
                                                                <div className="lora-chips-row" style={{ marginTop: 6 }}>
                                                                    {interrogateResult.suggested_loras.map((lora, i) => (
                                                                        <div key={i} className="lora-chip-item">
                                                                            <span>{lora.name}</span>
                                                                            <span className="lora-weight-badge">{lora.weight}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="ai-interrogate-bottom-actions" style={{ marginTop: 16 }}>
                                                        <button
                                                            type="button"
                                                            className="ai-apply-meta-btn"
                                                            onClick={handleApplyInterrogateToMetadata}
                                                        >
                                                            <Icons.Copy />
                                                            <span>Terapkan ke Tab Parameter & Quick Copy</span>
                                                        </button>
                                                        <Link
                                                            to={`/prompt-lab?positive=${encodeURIComponent(interrogateResult.danbooru_prompt)}&negative=${encodeURIComponent(interrogateResult.negative_prompt)}`}
                                                            className="ai-lab-transfer-btn"
                                                        >
                                                            <span>Buka di Prompt Lab Canvas →</span>
                                                        </Link>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* AI Vision & Reverse-Prompt Settings Modal */}
            {showApiKeyModal && (
                <div className="ai-modal-backdrop" onClick={() => setShowApiKeyModal(false)}>
                    <div className="ai-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="ai-modal-header">
                            <h3 className="ai-modal-title">
                                <Icons.Settings />
                                <span>Pengaturan Vision Model</span>
                            </h3>
                            <button
                                type="button"
                                className="ai-modal-close-btn"
                                onClick={() => setShowApiKeyModal(false)}
                                title="Tutup"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="ai-modal-body">
                            {/* Provider Toggle Tabs */}
                            <div className="ai-provider-toggle-group">
                                <button
                                    type="button"
                                    className={`ai-provider-toggle-btn ${aiProvider === "gemini" ? "active" : ""}`}
                                    onClick={() => setAiProvider("gemini")}
                                >
                                    <Icons.Cloud />
                                    <span>Google Gemini</span>
                                </button>
                                <button
                                    type="button"
                                    className={`ai-provider-toggle-btn ${aiProvider === "ollama" ? "active" : ""}`}
                                    onClick={() => {
                                        setAiProvider("ollama");
                                        if (!localEndpointInput) setLocalEndpointInput("http://localhost:11434");
                                        if (!localModelInput) setLocalModelInput("llama3.2-vision");
                                    }}
                                >
                                    <Icons.Cpu />
                                    <span>Ollama (Lokal)</span>
                                </button>
                                <button
                                    type="button"
                                    className={`ai-provider-toggle-btn ${aiProvider === "lmstudio" ? "active" : ""}`}
                                    onClick={() => {
                                        setAiProvider("lmstudio");
                                        if (!localEndpointInput || localEndpointInput === "http://localhost:11434") {
                                            setLocalEndpointInput("http://localhost:1234/v1");
                                        }
                                    }}
                                >
                                    <Icons.Cpu />
                                    <span>LM Studio (Lokal)</span>
                                </button>
                            </div>

                            {aiProvider === "gemini" ? (
                                <>
                                    <p className="ai-modal-desc">
                                        Gunakan <strong>Google Gemini Vision API</strong> untuk ekstraksi prompt, style, dan tag Danbooru dengan latensi rendah.
                                    </p>

                                    {/* API Key Input */}
                                    <div className="ai-modal-input-group">
                                        <label className="ai-modal-label">Google Gemini API Key:</label>
                                        <input
                                            type="password"
                                            className="ai-modal-input"
                                            placeholder="AIzaSy..."
                                            value={geminiApiKeyInput}
                                            onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                                        />
                                        <div className="ai-modal-help-text">
                                            Dapatkan API Key di{" "}
                                            <a
                                                href="https://aistudio.google.com/app/apikey"
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Google AI Studio (aistudio.google.com) ↗
                                            </a>
                                            .
                                        </div>
                                    </div>

                                    {/* Model Selector */}
                                    <div className="ai-modal-input-group">
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <label className="ai-modal-label">Versi Model Gemini:</label>
                                            <button
                                                type="button"
                                                className="ai-fetch-models-btn"
                                                onClick={handleFetchLiveModels}
                                                disabled={isFetchingModels || (!geminiApiKeyInput && !getStoredGeminiApiKey())}
                                                title="Ambil daftar model aktif langsung dari akun Google AI Studio Anda"
                                            >
                                                {isFetchingModels ? "Memeriksa Akun..." : "Cek Model Akun Saya"}
                                            </button>
                                        </div>

                                        <select
                                            className="ai-modal-select"
                                            value={selectedGeminiModel}
                                            onChange={(e) => setSelectedGeminiModel(e.target.value)}
                                        >
                                            <optgroup label="Rekomendasi">
                                                <option value="auto">Otomatis (Failover Cerdas)</option>
                                                <option value="gemini-1.5-flash-latest">Gemini 1.5 Flash (Stabil)</option>
                                            </optgroup>

                                            <optgroup label="Gemini 2.0 (Terbaru)">
                                                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                                                <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash-Lite</option>
                                                <option value="gemini-2.0-pro-exp-02-05">Gemini 2.0 Pro Experimental</option>
                                            </optgroup>

                                            <optgroup label="Gemini 1.5 (Stabil)">
                                                <option value="gemini-1.5-flash-002">Gemini 1.5 Flash 002</option>
                                                <option value="gemini-1.5-flash-8b">Gemini 1.5 Flash 8B</option>
                                                <option value="gemini-1.5-pro-latest">Gemini 1.5 Pro</option>
                                                <option value="gemini-1.5-flash">Gemini 1.5 Flash (GA)</option>
                                            </optgroup>

                                            <optgroup label="Preview & Reasoning">
                                                <option value="gemini-2.0-flash-thinking-exp">Gemini 2.0 Flash Thinking Exp</option>
                                                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Preview)</option>
                                                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Preview)</option>
                                            </optgroup>

                                            {liveAccountModels.length > 0 && (
                                                <optgroup label="Model Terdeteksi dari Akun">
                                                    {liveAccountModels.map((m) => (
                                                        <option key={m.id} value={m.id}>
                                                            {m.name}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            )}

                                            <optgroup label="Model Kustom">
                                                <option value="custom">Masukkan Model ID Kustom Manual...</option>
                                            </optgroup>
                                        </select>

                                        {selectedGeminiModel === "custom" && (
                                            <div style={{ marginTop: 8 }}>
                                                <label className="ai-modal-label" style={{ marginBottom: 4, display: "block" }}>
                                                    Ketik Model ID Kustom:
                                                </label>
                                                <input
                                                    type="text"
                                                    className="ai-modal-input"
                                                    placeholder="Contoh: gemini-2.5-flash, gemini-3.0-flash..."
                                                    value={customModelInput}
                                                    onChange={(e) => setCustomModelInput(e.target.value)}
                                                />
                                                <div className="ai-modal-help-text" style={{ marginTop: 4 }}>
                                                    Ketik model ID sesuai yang dirilis di Google AI Studio.
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Model Description Card */}
                                    <div className="ai-modal-model-desc-card">
                                        <strong>
                                            {PRESET_GEMINI_MODELS.find((m) => m.id === selectedGeminiModel)?.label ||
                                                (selectedGeminiModel === "custom"
                                                    ? `Model Kustom: ${customModelInput || "(Belum diisi)"}`
                                                    : selectedGeminiModel)}
                                            {" • "}
                                            {PRESET_GEMINI_MODELS.find((m) => m.id === selectedGeminiModel)?.badge || "Custom"}
                                        </strong>
                                        <p style={{ margin: "4px 0 0 0" }}>
                                            {PRESET_GEMINI_MODELS.find((m) => m.id === selectedGeminiModel)?.description ||
                                                "Model kustom yang dikonfigurasi melalui endpoint Google AI Studio."}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="ai-modal-desc">
                                        Jalankan model vision secara lokal menggunakan endpoint{" "}
                                        <strong>{aiProvider === "ollama" ? "Ollama" : "LM Studio (OpenAI-compatible)"}</strong>.
                                    </p>

                                    {/* Local Endpoint Input */}
                                    <div className="ai-modal-input-group">
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <label className="ai-modal-label">Endpoint URL Lokal:</label>
                                            <button
                                                type="button"
                                                className="ai-fetch-models-btn"
                                                onClick={handleFetchLocalModels}
                                                disabled={isFetchingLocalModels}
                                                title="Tes koneksi dan periksa model yang sedang aktif di PC"
                                            >
                                                {isFetchingLocalModels ? "Memeriksa..." : "Cek Model Lokal"}
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            className="ai-modal-input"
                                            placeholder={aiProvider === "ollama" ? "http://localhost:11434" : "http://localhost:1234/v1"}
                                            value={localEndpointInput}
                                            onChange={(e) => setLocalEndpointInput(e.target.value)}
                                        />
                                        <div className="ai-modal-help-text">
                                            {aiProvider === "ollama"
                                                ? "Default Ollama: http://localhost:11434. Pastikan daemon Ollama aktif."
                                                : "Default LM Studio: http://localhost:1234/v1. Pastikan Local Server berstatus Start Server."}
                                        </div>
                                    </div>

                                    {/* Local Model Name */}
                                    <div className="ai-modal-input-group">
                                        <label className="ai-modal-label">Nama / Tag Model Vision:</label>
                                        <input
                                            type="text"
                                            className="ai-modal-input"
                                            placeholder={aiProvider === "ollama" ? "llama3.2-vision" : "local-model"}
                                            value={localModelInput}
                                            onChange={(e) => setLocalModelInput(e.target.value)}
                                        />

                                        {/* Quick Pick Chips */}
                                        <div style={{ marginTop: 4 }}>
                                            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                                                Pilihan Cepat Model Vision:
                                            </div>
                                            <div className="ai-local-quick-chips">
                                                {POPULAR_LOCAL_VISION_MODELS.map((item) => (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        className={`ai-local-chip-btn ${localModelInput === item.id ? "active" : ""}`}
                                                        onClick={() => setLocalModelInput(item.id)}
                                                        title={item.description}
                                                    >
                                                        {item.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Detected Models dropdown if available */}
                                        {localDetectedModels.length > 0 && (
                                            <div style={{ marginTop: 8 }}>
                                                <label className="ai-modal-label" style={{ marginBottom: 4, display: "block" }}>
                                                    Atau Pilih dari Model yang Terdeteksi di PC:
                                                </label>
                                                <select
                                                    className="ai-modal-select"
                                                    value={localModelInput}
                                                    onChange={(e) => setLocalModelInput(e.target.value)}
                                                >
                                                    {localDetectedModels.map((m) => (
                                                        <option key={m.id} value={m.id}>
                                                            {m.name || m.id}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    {/* Connection Status Card */}
                                    {localConnectionStatus && (
                                        <div className="ai-modal-model-desc-card">
                                            <div className="ai-connection-indicator">
                                                <span
                                                    className={`ai-connection-dot ${localConnectionStatus.includes("Terhubung") ? "online" : "offline"}`}
                                                />
                                                <span>{localConnectionStatus}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Helpful Guide Card */}
                                    <div className="ai-modal-info-box">
                                        <div className="ai-modal-info-title">Panduan Model Vision:</div>
                                        <div className="ai-modal-info-desc">
                                            {aiProvider === "ollama" ? (
                                                <>
                                                    Unduh model multimodal di Ollama dengan perintah: <code className="ai-code-inline">ollama run llama3.2-vision</code> atau <code className="ai-code-inline">ollama run llava</code>.
                                                </>
                                            ) : (
                                                <>
                                                    Muat model vision (seperti <em>Qwen3-VL</em> atau <em>Qwen2.5-VL</em>) di LM Studio, lalu aktifkan <strong>Start Server</strong> pada tab Local Server.
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="ai-modal-footer">
                            {aiProvider === "gemini" && getStoredGeminiApiKey() && (
                                <button
                                    type="button"
                                    className="ai-modal-danger-btn"
                                    onClick={() => {
                                        setStoredGeminiApiKey("");
                                        setGeminiApiKeyInput("");
                                    }}
                                >
                                    Hapus Key
                                </button>
                            )}
                            <button
                                type="button"
                                className="ai-modal-cancel-btn"
                                onClick={() => setShowApiKeyModal(false)}
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                className="ai-modal-save-btn"
                                onClick={() => {
                                    setStoredAIProvider(aiProvider);
                                    if (aiProvider === "gemini") {
                                        const modelToSave =
                                            selectedGeminiModel === "custom"
                                                ? customModelInput.trim() || "gemini-2.0-flash"
                                                : selectedGeminiModel;
                                        setStoredGeminiApiKey(geminiApiKeyInput);
                                        setStoredGeminiModel(modelToSave);
                                        setSelectedGeminiModel(modelToSave);
                                    } else {
                                        setStoredLocalEndpoint(
                                            localEndpointInput || (aiProvider === "ollama" ? "http://localhost:11434" : "http://localhost:1234/v1")
                                        );
                                        setStoredLocalModel(
                                            localModelInput || (aiProvider === "ollama" ? "llama3.2-vision" : "local-model")
                                        );
                                    }
                                    setShowApiKeyModal(false);
                                    if (rawFile && !interrogateResult) {
                                        handleRunInterrogate();
                                    }
                                }}
                            >
                                Simpan & Gunakan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
