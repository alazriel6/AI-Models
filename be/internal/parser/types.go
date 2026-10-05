package parser

// ParsedLoraResource represents a detected LoRA and its weight.
type ParsedLoraResource struct {
	Name   string  `json:"name"`
	Weight float64 `json:"weight"`
}

// ParsedMetadata represents the extracted generation parameters.
type ParsedMetadata struct {
	Source         string               `json:"source"` // "comfyui", "a1111", "novelai", "fooocus", "unknown"
	Format         string               `json:"format"` // "png", "webp", "jpeg", "json", "text"
	PositivePrompt string               `json:"positive_prompt"`
	NegativePrompt string               `json:"negative_prompt"`
	Steps          int                  `json:"steps"`
	Sampler        string               `json:"sampler"`
	Scheduler      string               `json:"scheduler"`
	CFGScale       float64              `json:"cfg_scale"`
	Seed           int64                `json:"seed"`
	Width          int                  `json:"width"`
	Height         int                  `json:"height"`
	ModelName      string               `json:"model_name"`
	ModelHash      string               `json:"model_hash,omitempty"`
	ClipSkip       int                  `json:"clip_skip,omitempty"`
	DenoisingStr   float64              `json:"denoising_strength,omitempty"`
	HiresUpscale   float64              `json:"hires_upscale,omitempty"`
	HiresSteps     int                  `json:"hires_steps,omitempty"`
	HiresUpscaler  string               `json:"hires_upscaler,omitempty"`
	VAE            string               `json:"vae,omitempty"`
	Loras          []ParsedLoraResource `json:"loras"`
	WorkflowJSON   string               `json:"workflow_json,omitempty"`
	PromptJSON     string               `json:"prompt_json,omitempty"`
	RawPrompt      string               `json:"raw_prompt,omitempty"`
	RawChunks      map[string]string    `json:"raw_chunks,omitempty"`
	ExtraParams    map[string]string    `json:"extra_params,omitempty"`
}
