import type { NavigateFunction } from "react-router-dom";

export interface LoraBridgeItem {
  name: string;
  weight: number;
}

export interface WorkflowBridgeData {
  source: "gallery" | "inspector" | "prompt-lab" | "calculator" | "lora-stack" | "negative-vault" | "sampler-guide" | "controlnet";
  timestamp: number;
  imageId?: number;
  imageUrl?: string;
  title?: string;
  positivePrompt?: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  baseModel?: string; // SDXL, Pony, Illustrious, SD 1.5, Flux
  modelName?: string;
  sampler?: string;
  scheduler?: string;
  steps?: number;
  cfgScale?: number;
  seed?: number;
  loras?: LoraBridgeItem[];
}

const STORAGE_KEY = "mg_active_workflow_bridge";

/**
 * Extract <lora:filename:weight> tags from a prompt string
 */
export function extractLorasFromPrompt(prompt?: string): LoraBridgeItem[] {
  if (!prompt) return [];
  const regex = /<lora:([^:>]+)(?::([0-9.]+))?(?::[0-9.]+)?(?:>|:)/gi;
  const results: LoraBridgeItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(prompt)) !== null) {
    const name = match[1].trim();
    const weight = match[2] ? parseFloat(match[2]) : 1.0;
    if (name && !results.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
      results.push({
        name,
        weight: isNaN(weight) ? 1.0 : weight,
      });
    }
  }

  return results;
}

/**
 * Clean lora tags from prompt text for clean editor injection
 */
export function stripLoraTags(prompt?: string): string {
  if (!prompt) return "";
  return prompt
    .replace(/<lora:[^>]+>/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/,\s*,/g, ",")
    .trim();
}

/**
 * Save active bridge data to sessionStorage
 */
export function setWorkflowBridge(data: WorkflowBridgeData): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("Failed to set workflow bridge:", err);
  }
}

/**
 * Retrieve active bridge data from sessionStorage
 */
export function getWorkflowBridge(): WorkflowBridgeData | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Clear active bridge data
 */
export function clearWorkflowBridge(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Standardize baseModel to calculator/promptlab formats
 */
export function normalizeBaseModel(arch?: string): "sdxl" | "flux" | "sd15" {
  if (!arch) return "sdxl";
  const lower = arch.toLowerCase();
  if (lower.includes("flux")) return "flux";
  if (lower.includes("1.5") || lower.includes("sd1") || lower.includes("sd 1")) return "sd15";
  return "sdxl";
}

// ----------------------------------------------------------------------------
// Action Bridge Navigators
// ----------------------------------------------------------------------------

export function bridgeToPromptLab(navigate: NavigateFunction, data: WorkflowBridgeData): void {
  setWorkflowBridge(data);
  navigate("/prompt-lab?bridge=1");
}

export function bridgeToCalculator(navigate: NavigateFunction, data: WorkflowBridgeData): void {
  setWorkflowBridge(data);
  const w = data.width || 1024;
  const h = data.height || 1024;
  const arch = normalizeBaseModel(data.baseModel);
  navigate(`/calculator?width=${w}&height=${h}&arch=${arch}&bridge=1`);
}

export function bridgeToLoraStack(navigate: NavigateFunction, data: WorkflowBridgeData): void {
  setWorkflowBridge(data);
  navigate("/lora-stack?bridge=1");
}

export function bridgeToNegativeVault(navigate: NavigateFunction, data: WorkflowBridgeData): void {
  setWorkflowBridge(data);
  navigate("/negative-vault?bridge=1");
}

export function bridgeToSamplerGuide(navigate: NavigateFunction, data: WorkflowBridgeData): void {
  setWorkflowBridge(data);
  navigate("/sampler-guide?bridge=1");
}

export function bridgeToVramProfiler(navigate: NavigateFunction, data: WorkflowBridgeData): void {
  setWorkflowBridge(data);
  const model = (data.baseModel || "sdxl").toLowerCase().includes("1.5")
    ? "sd15"
    : (data.baseModel || "").toLowerCase().includes("flux")
    ? "flux"
    : "sdxl";
  navigate(`/vram?model=${model}&bridge=1`);
}
