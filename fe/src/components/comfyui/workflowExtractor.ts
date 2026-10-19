// Helper to cleanly extract human-readable generation parameters from any ComfyUI JSON

export interface ExtractedWorkflowSummary {
  checkpointName?: string;
  loras: Array<{ name: string; strength?: number }>;
  clipSkip?: number;
  positivePrompt?: string;
  negativePrompt?: string;
  latentSize?: { width: number; height: number };
  sampler?: {
    samplerName?: string;
    scheduler?: string;
    steps?: number;
    cfg?: number;
    denoise?: number;
    seed?: number | string;
  };
  tools: string[];
  notes: string[];
  totalNodes: number;
}

export function extractWorkflowData(workflowJson: string): ExtractedWorkflowSummary {
  const result: ExtractedWorkflowSummary = {
    loras: [],
    tools: [],
    notes: [],
    totalNodes: 0
  };

  if (!workflowJson) return result;

  try {
    const data = typeof workflowJson === "string" ? JSON.parse(workflowJson) : workflowJson;

    // Format 1: Standard ComfyUI Web Format { nodes: [...], links: [...] }
    if (data && Array.isArray(data.nodes)) {
      result.totalNodes = data.nodes.length;

      data.nodes.forEach((node: Record<string, unknown>) => {
        const type = String(node.type || "");
        const title = String(node.title || "");
        const widgets = Array.isArray(node.widgets_values) ? node.widgets_values : [];

        // Checkpoint Loader
        if (type.includes("CheckpointLoader") && widgets.length > 0) {
          result.checkpointName = String(widgets[0]);
        }

        // LoRA Loader
        if (type.includes("LoraLoader") && widgets.length > 0) {
          const loraName = String(widgets[0]);
          const strength = typeof widgets[1] === "number" ? widgets[1] : 1.0;
          result.loras.push({ name: loraName, strength });
        }

        // CLIP Skip
        if (type.includes("CLIPSetLastLayer") && widgets.length > 0) {
          result.clipSkip = Number(widgets[0]);
        }

        // CLIP Text Encode Prompts
        if (type === "CLIPTextEncode" && widgets.length > 0) {
          const promptText = String(widgets[0]);
          const lowerTitle = title.toLowerCase();
          if (lowerTitle.includes("neg") || lowerTitle.includes("negative")) {
            result.negativePrompt = promptText;
          } else if (!result.positivePrompt) {
            result.positivePrompt = promptText;
          } else {
            // Secondary positive or negative
            if (!result.negativePrompt && (promptText.includes("worst quality") || promptText.includes("bad quality") || promptText.includes("lowres"))) {
              result.negativePrompt = promptText;
            } else {
              result.positivePrompt += "\n\n" + promptText;
            }
          }
        }

        // Latent Resolution
        if (type === "EmptyLatentImage" && widgets.length >= 2) {
          result.latentSize = {
            width: Number(widgets[0]) || 512,
            height: Number(widgets[1]) || 512
          };
        }

        // KSampler
        if ((type === "KSampler" || type === "KSamplerAdvanced") && widgets.length >= 7) {
          result.sampler = {
            seed: String(widgets[0]),
            steps: Number(widgets[2]),
            cfg: Number(widgets[3]),
            samplerName: String(widgets[4]),
            scheduler: String(widgets[5]),
            denoise: Number(widgets[6])
          };
        }

        // Special Tools / Custom Nodes
        if (type.includes("FaceDetailer")) {
          result.tools.push("Impact Pack FaceDetailer (Pendeteksi Wajah Otomatis)");
        }
        if (type.includes("ImageScale") || type.includes("Upscale")) {
          result.tools.push("Hi-Res Upscaler / Image Rescale");
        }
        if (type.includes("UltralyticsDetector")) {
          result.tools.push("Ultralytics YOLO BBox Detector");
        }
        if (type.includes("ControlNet")) {
          result.tools.push("ControlNet Apply");
        }
        if (type.includes("AnimateDiff")) {
          result.tools.push("AnimateDiff Video Generator");
        }

        // Markdown Notes
        if ((type === "MarkdownNote" || type === "Note") && widgets.length > 0) {
          const noteText = String(widgets[0]).trim();
          if (noteText && !result.notes.includes(noteText)) {
            result.notes.push(noteText);
          }
        }
      });

      return result;
    }

    // Format 2: ComfyUI API Prompt format { "1": { class_type, inputs } }
    if (data && typeof data === "object") {
      const keys = Object.keys(data);
      result.totalNodes = keys.length;

      keys.forEach((k) => {
        const item = data[k];
        if (!item || typeof item !== "object") return;
        const cType = String(item.class_type || "");
        const inputs = item.inputs || {};

        if (cType.includes("CheckpointLoader") && inputs.ckpt_name) {
          result.checkpointName = String(inputs.ckpt_name);
        }
        if (cType.includes("LoraLoader") && inputs.lora_name) {
          result.loras.push({
            name: String(inputs.lora_name),
            strength: Number(inputs.strength_model) || 1.0
          });
        }
        if (cType === "CLIPTextEncode" && inputs.text) {
          const p = String(inputs.text);
          if (p.includes("worst quality") || p.includes("low quality")) {
            result.negativePrompt = p;
          } else if (!result.positivePrompt) {
            result.positivePrompt = p;
          }
        }
        if (cType === "EmptyLatentImage" && inputs.width && inputs.height) {
          result.latentSize = { width: Number(inputs.width), height: Number(inputs.height) };
        }
        if (cType.includes("KSampler") && inputs.steps) {
          result.sampler = {
            seed: String(inputs.seed || ""),
            steps: Number(inputs.steps),
            cfg: Number(inputs.cfg),
            samplerName: String(inputs.sampler_name || ""),
            scheduler: String(inputs.scheduler || ""),
            denoise: Number(inputs.denoise ?? 1.0)
          };
        }
      });
    }

    return result;
  } catch {
    return result;
  }
}
