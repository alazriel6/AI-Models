/**
 * Export and Clipboard Utilities for Generative AI Workflows
 * Supports Automatic1111 / Forge Parameters, ComfyUI Workflow JSON, and WebUI API Payloads
 */

export interface GenerationParamsData {
    positive_prompt?: string;
    negative_prompt?: string;
    steps?: number;
    sampler?: string;
    scheduler?: string;
    cfg_scale?: number;
    seed?: number | string;
    width?: number;
    height?: number;
    model_name?: string;
    model_hash?: string;
    clip_skip?: number;
    denoising_strength?: number;
    hires_upscaler?: string;
    hires_upscale?: number;
    hires_steps?: number;
    workflow_json?: string;
    prompt_json?: string;
}

/**
 * Builds standard Automatic1111 / Forge / WebUI parameters text block.
 * Ready for 1-click paste via the blue arrow button in WebUI.
 */
export function buildA1111ParametersText(data: GenerationParamsData): string {
    const lines: string[] = [];
    lines.push(data.positive_prompt || "");

    if (data.negative_prompt) {
        lines.push(`Negative prompt: ${data.negative_prompt}`);
    }

    const metaParts: string[] = [];
    if (data.steps) metaParts.push(`Steps: ${data.steps}`);
    if (data.sampler) metaParts.push(`Sampler: ${data.sampler}`);
    if (data.scheduler) metaParts.push(`Schedule type: ${data.scheduler}`);
    if (data.cfg_scale) metaParts.push(`CFG scale: ${data.cfg_scale}`);
    if (data.seed !== undefined && data.seed !== null) metaParts.push(`Seed: ${data.seed}`);

    const w = data.width || 832;
    const h = data.height || 1216;
    metaParts.push(`Size: ${w}x${h}`);

    if (data.model_name) metaParts.push(`Model: ${data.model_name}`);
    if (data.model_hash) metaParts.push(`Model hash: ${data.model_hash}`);
    if (data.clip_skip) metaParts.push(`Clip skip: ${data.clip_skip}`);
    if (data.denoising_strength) metaParts.push(`Denoising strength: ${data.denoising_strength}`);
    if (data.hires_upscaler) metaParts.push(`Hires upscaler: ${data.hires_upscaler}`);
    if (data.hires_upscale) metaParts.push(`Hires upscale: ${data.hires_upscale}`);
    if (data.hires_steps) metaParts.push(`Hires steps: ${data.hires_steps}`);

    lines.push(metaParts.join(", "));
    return lines.join("\n");
}

/**
 * Builds or returns a ComfyUI workflow JSON.
 * If image already has embedded workflow_json or prompt_json, returns it.
 * Otherwise, generates a valid minimal runnable ComfyUI node graph.
 */
export function buildComfyUIWorkflowJSON(data: GenerationParamsData): string {
    if (data.workflow_json && data.workflow_json.trim()) {
        try {
            return JSON.stringify(JSON.parse(data.workflow_json), null, 2);
        } catch {
            return data.workflow_json;
        }
    }

    if (data.prompt_json && data.prompt_json.trim()) {
        try {
            return JSON.stringify(JSON.parse(data.prompt_json), null, 2);
        } catch {
            return data.prompt_json;
        }
    }

    // Generate clean synthetic ComfyUI executable graph
    const seedNum = typeof data.seed === "number" ? data.seed : Number(data.seed) || 123456789;
    const synthGraph = {
        "3": {
            "inputs": {
                "seed": seedNum,
                "steps": data.steps || 28,
                "cfg": data.cfg_scale || 7.0,
                "sampler_name": (data.sampler || "euler_a").toLowerCase().replace(/\s+/g, "_"),
                "scheduler": (data.scheduler || "normal").toLowerCase(),
                "denoise": 1.0,
                "model": ["4", 0],
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["5", 0]
            },
            "class_type": "KSampler",
            "_meta": { "title": "KSampler" }
        },
        "4": {
            "inputs": {
                "ckpt_name": data.model_name || "illustrious_v1.0.safetensors"
            },
            "class_type": "CheckpointLoaderSimple",
            "_meta": { "title": "Load Checkpoint" }
        },
        "5": {
            "inputs": {
                "width": data.width || 832,
                "height": data.height || 1216,
                "batch_size": 1
            },
            "class_type": "EmptyLatentImage",
            "_meta": { "title": "Empty Latent Image" }
        },
        "6": {
            "inputs": {
                "text": data.positive_prompt || "",
                "clip": ["4", 1]
            },
            "class_type": "CLIPTextEncode",
            "_meta": { "title": "CLIP Text Encode (Positive)" }
        },
        "7": {
            "inputs": {
                "text": data.negative_prompt || "",
                "clip": ["4", 1]
            },
            "class_type": "CLIPTextEncode",
            "_meta": { "title": "CLIP Text Encode (Negative)" }
        },
        "8": {
            "inputs": {
                "samples": ["3", 0],
                "vae": ["4", 2]
            },
            "class_type": "VAEDecode",
            "_meta": { "title": "VAE Decode" }
        },
        "9": {
            "inputs": {
                "filename_prefix": "ModelsGuide",
                "images": ["8", 0]
            },
            "class_type": "SaveImage",
            "_meta": { "title": "Save Image" }
        }
    };

    return JSON.stringify(synthGraph, null, 2);
}

/**
 * Builds standard WebUI /sdapi/v1/txt2img JSON payload
 */
export function buildWebUIApiPayload(data: GenerationParamsData): string {
    const payload = {
        prompt: data.positive_prompt || "",
        negative_prompt: data.negative_prompt || "",
        steps: data.steps || 28,
        sampler_name: data.sampler || "Euler a",
        cfg_scale: data.cfg_scale || 7.0,
        seed: typeof data.seed === "number" ? data.seed : Number(data.seed) || -1,
        width: data.width || 832,
        height: data.height || 1216,
        restore_faces: false,
        batch_size: 1,
        n_iter: 1
    };
    return JSON.stringify(payload, null, 2);
}

/**
 * 1-Click File Download helper
 */
export function downloadTextAsFile(content: string, filename: string, mimeType = "application/json") {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
