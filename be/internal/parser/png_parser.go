package parser

import (
	"bytes"
	"compress/zlib"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"regexp"
	"strconv"
	"strings"
)

var pngSignature = []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}

// ParsePNGMetadata reads a PNG stream, extracts tEXt/iTXt/zTXt chunks, and parses ComfyUI / A1111 metadata.
func ParsePNGMetadata(r io.Reader) (*ParsedMetadata, error) {
	sig := make([]byte, 8)
	if _, err := io.ReadFull(r, sig); err != nil {
		return nil, fmt.Errorf("failed to read PNG signature: %w", err)
	}
	if !bytes.Equal(sig, pngSignature) {
		return nil, errors.New("file is not a valid PNG image (invalid signature)")
	}

	chunks := make(map[string]string)
	var ihdrWidth, ihdrHeight int

	for {
		var length uint32
		if err := binary.Read(r, binary.BigEndian, &length); err != nil {
			if errors.Is(err, io.EOF) || errors.Is(err, io.ErrUnexpectedEOF) {
				break
			}
			return nil, fmt.Errorf("error reading chunk length: %w", err)
		}

		typeBytes := make([]byte, 4)
		if _, err := io.ReadFull(r, typeBytes); err != nil {
			break
		}
		chunkType := string(typeBytes)

		// Guard against absurdly huge chunk length
		if length > 50*1024*1024 {
			break
		}

		data := make([]byte, length)
		if _, err := io.ReadFull(r, data); err != nil {
			break
		}

		// Read and discard 4-byte CRC
		var crc uint32
		_ = binary.Read(r, binary.BigEndian, &crc)

		if chunkType == "IHDR" && length >= 8 {
			ihdrWidth = int(binary.BigEndian.Uint32(data[0:4]))
			ihdrHeight = int(binary.BigEndian.Uint32(data[4:8]))
		} else if chunkType == "tEXt" {
			k, v := parseTEXtChunk(data)
			if k != "" {
				chunks[k] = v
			}
		} else if chunkType == "zTXt" {
			k, v := parseZTXtChunk(data)
			if k != "" {
				chunks[k] = v
			}
		} else if chunkType == "iTXt" {
			k, v := parseITXtChunk(data)
			if k != "" {
				chunks[k] = v
			}
		} else if chunkType == "IEND" {
			break
		}
	}

	meta := &ParsedMetadata{
		Format:      "png",
		Width:       ihdrWidth,
		Height:      ihdrHeight,
		Source:      "unknown",
		RawChunks:   chunks,
		ExtraParams: make(map[string]string),
	}

	if wf, ok := chunks["workflow"]; ok && strings.TrimSpace(wf) != "" {
		meta.WorkflowJSON = wf
	}
	if pr, ok := chunks["prompt"]; ok && strings.TrimSpace(pr) != "" {
		meta.PromptJSON = pr
	}

	// 1. Check for ComfyUI "prompt" JSON
	if promptJSON, ok := chunks["prompt"]; ok && strings.TrimSpace(promptJSON) != "" {
		if err := parseComfyUIPrompt(promptJSON, meta); err == nil {
			meta.Source = "comfyui"
			meta.RawPrompt = promptJSON
			return meta, nil
		}
	}

	// 2. Check for Automatic1111 / Forge / WebUI "parameters" text
	if paramsText, ok := chunks["parameters"]; ok && strings.TrimSpace(paramsText) != "" {
		parseA1111Parameters(paramsText, meta)
		meta.Source = "a1111"
		meta.RawPrompt = paramsText
		return meta, nil
	}

	// 3. Check for NovelAI / other tools in "Comment"
	if comment, ok := chunks["Comment"]; ok && strings.TrimSpace(comment) != "" {
		if err := parseNovelAIComment(comment, meta); err == nil {
			meta.Source = "novelai"
			meta.RawPrompt = comment
			return meta, nil
		}
	}

	// If no metadata chunks were found, but we have dimensions from IHDR
	if meta.Width > 0 && meta.Height > 0 {
		return meta, nil
	}

	return nil, errors.New("no generation metadata found in PNG chunks")
}

func parseTEXtChunk(data []byte) (string, string) {
	nullIdx := bytes.IndexByte(data, 0)
	if nullIdx < 1 {
		return "", ""
	}
	keyword := string(data[:nullIdx])
	text := string(data[nullIdx+1:])
	return keyword, text
}

func parseZTXtChunk(data []byte) (string, string) {
	nullIdx := bytes.IndexByte(data, 0)
	if nullIdx < 1 || nullIdx+2 >= len(data) {
		return "", ""
	}
	keyword := string(data[:nullIdx])
	// data[nullIdx+1] is compression method (0 = deflate/zlib)
	compressedData := data[nullIdx+2:]

	zr, err := zlib.NewReader(bytes.NewReader(compressedData))
	if err != nil {
		return keyword, ""
	}
	defer zr.Close()

	var buf bytes.Buffer
	_, _ = io.Copy(&buf, zr)
	return keyword, buf.String()
}

func parseITXtChunk(data []byte) (string, string) {
	nullIdx := bytes.IndexByte(data, 0)
	if nullIdx < 1 || nullIdx+3 >= len(data) {
		return "", ""
	}
	keyword := string(data[:nullIdx])
	pos := nullIdx + 1

	compressionFlag := data[pos]
	pos += 2 // compressionFlag + compressionMethod

	// Find language tag null terminator
	langIdx := bytes.IndexByte(data[pos:], 0)
	if langIdx < 0 {
		return keyword, ""
	}
	pos += langIdx + 1

	// Find translated keyword null terminator
	transIdx := bytes.IndexByte(data[pos:], 0)
	if transIdx < 0 {
		return keyword, ""
	}
	pos += transIdx + 1

	rawText := data[pos:]
	if compressionFlag == 1 {
		zr, err := zlib.NewReader(bytes.NewReader(rawText))
		if err != nil {
			return keyword, ""
		}
		defer zr.Close()
		var buf bytes.Buffer
		_, _ = io.Copy(&buf, zr)
		return keyword, buf.String()
	}

	return keyword, string(rawText)
}

// ComfyUI node representation
type comfyNode struct {
	ClassType string                 `json:"class_type"`
	Inputs    map[string]interface{} `json:"inputs"`
}

func parseComfyUIPrompt(jsonStr string, meta *ParsedMetadata) error {
	var nodes map[string]comfyNode
	if err := json.Unmarshal([]byte(jsonStr), &nodes); err != nil {
		return err
	}

	var positiveNodeID string
	var negativeNodeID string

	// Find KSampler node first
	for _, node := range nodes {
		if strings.Contains(strings.ToLower(node.ClassType), "ksampler") {
			if steps, ok := node.Inputs["steps"].(float64); ok && meta.Steps == 0 {
				meta.Steps = int(steps)
			}
			if cfg, ok := node.Inputs["cfg"].(float64); ok && meta.CFGScale == 0 {
				meta.CFGScale = cfg
			}
			if sampler, ok := node.Inputs["sampler_name"].(string); ok && meta.Sampler == "" {
				meta.Sampler = sampler
			}
			if scheduler, ok := node.Inputs["scheduler"].(string); ok && meta.Scheduler == "" {
				meta.Scheduler = scheduler
			}
			if seed, ok := node.Inputs["seed"].(float64); ok && meta.Seed == 0 {
				meta.Seed = int64(seed)
			} else if noiseSeed, ok := node.Inputs["noise_seed"].(float64); ok && meta.Seed == 0 {
				meta.Seed = int64(noiseSeed)
			}
			if denoise, ok := node.Inputs["denoise"].(float64); ok {
				meta.DenoisingStr = denoise
			}

			// Trace positive & negative conditioning
			if posArr, ok := node.Inputs["positive"].([]interface{}); ok && len(posArr) > 0 {
				if id, ok := posArr[0].(string); ok {
					positiveNodeID = id
				}
			}
			if negArr, ok := node.Inputs["negative"].([]interface{}); ok && len(negArr) > 0 {
				if id, ok := negArr[0].(string); ok {
					negativeNodeID = id
				}
			}
		}

		// Find checkpoint loader
		if strings.Contains(strings.ToLower(node.ClassType), "checkpointloader") {
			if ckpt, ok := node.Inputs["ckpt_name"].(string); ok && meta.ModelName == "" {
				meta.ModelName = ckpt
			}
		}

		// Find LoRA loader
		if strings.Contains(strings.ToLower(node.ClassType), "loraloader") {
			loraName, _ := node.Inputs["lora_name"].(string)
			if loraName != "" {
				weight := 1.0
				if w, ok := node.Inputs["strength_model"].(float64); ok {
					weight = w
				} else if w, ok := node.Inputs["strength"].(float64); ok {
					weight = w
				}
				meta.Loras = append(meta.Loras, ParsedLoraResource{
					Name:   loraName,
					Weight: weight,
				})
			}
		}

		// Find Empty Latent Image (Resolution)
		if strings.Contains(strings.ToLower(node.ClassType), "emptylatent") {
			if w, ok := node.Inputs["width"].(float64); ok && int(w) > 0 {
				meta.Width = int(w)
			}
			if h, ok := node.Inputs["height"].(float64); ok && int(h) > 0 {
				meta.Height = int(h)
			}
		}
	}

	// Resolve prompts using traced node IDs
	if positiveNodeID != "" {
		if node, ok := nodes[positiveNodeID]; ok {
			meta.PositivePrompt = extractComfyPromptText(node, nodes)
		}
	}
	if negativeNodeID != "" {
		if node, ok := nodes[negativeNodeID]; ok {
			meta.NegativePrompt = extractComfyPromptText(node, nodes)
		}
	}

	// Fallback if not linked directly
	if meta.PositivePrompt == "" || meta.NegativePrompt == "" {
		var textEncoders []string
		for id, node := range nodes {
			if strings.Contains(strings.ToLower(node.ClassType), "cliptextencode") {
				textEncoders = append(textEncoders, id)
			}
		}
		if len(textEncoders) >= 2 {
			p1 := extractComfyPromptText(nodes[textEncoders[0]], nodes)
			p2 := extractComfyPromptText(nodes[textEncoders[1]], nodes)
			if isLikelyNegative(p1) && !isLikelyNegative(p2) {
				meta.NegativePrompt = p1
				meta.PositivePrompt = p2
			} else if isLikelyNegative(p2) && !isLikelyNegative(p1) {
				meta.PositivePrompt = p1
				meta.NegativePrompt = p2
			} else {
				if meta.PositivePrompt == "" {
					meta.PositivePrompt = p1
				}
				if meta.NegativePrompt == "" {
					meta.NegativePrompt = p2
				}
			}
		} else if len(textEncoders) == 1 && meta.PositivePrompt == "" {
			meta.PositivePrompt = extractComfyPromptText(nodes[textEncoders[0]], nodes)
		}
	}

	return nil
}

func extractComfyPromptText(node comfyNode, nodes map[string]comfyNode) string {
	if text, ok := node.Inputs["text"].(string); ok {
		return strings.TrimSpace(text)
	}
	// SDXL split text_g / text_l
	if textG, ok := node.Inputs["text_g"].(string); ok {
		textL, _ := node.Inputs["text_l"].(string)
		if textL != "" && textL != textG {
			return strings.TrimSpace(textG + ", " + textL)
		}
		return strings.TrimSpace(textG)
	}
	return ""
}

func isLikelyNegative(text string) bool {
	lower := strings.ToLower(text)
	negativeKeywords := []string{"worst quality", "low quality", "bad anatomy", "blurry", "watermark", "ugly", "deformed"}
	for _, kw := range negativeKeywords {
		if strings.Contains(lower, kw) {
			return true
		}
	}
	return false
}

// A1111 / WebUI / Forge text parser
func parseA1111Parameters(text string, meta *ParsedMetadata) {
	lines := strings.Split(text, "\n")
	var promptLines []string
	var negativeLines []string
	var paramsLine string

	mode := "positive"

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "Negative prompt:") {
			mode = "negative"
			negText := strings.TrimPrefix(trimmed, "Negative prompt:")
			if negText != "" {
				negativeLines = append(negativeLines, strings.TrimSpace(negText))
			}
			continue
		}
		if strings.HasPrefix(trimmed, "Steps:") {
			paramsLine = trimmed
			mode = "params"
			continue
		}

		if mode == "positive" {
			promptLines = append(promptLines, line)
		} else if mode == "negative" {
			negativeLines = append(negativeLines, line)
		}
	}

	meta.PositivePrompt = strings.TrimSpace(strings.Join(promptLines, "\n"))
	meta.NegativePrompt = strings.TrimSpace(strings.Join(negativeLines, "\n"))

	// Extract inline LoRA tags like <lora:name:0.8> from positive prompt
	loraRegex := regexp.MustCompile(`<lora:([^:>]+):?([0-9.]*)>`)
	matches := loraRegex.FindAllStringSubmatch(meta.PositivePrompt, -1)
	for _, match := range matches {
		name := match[1]
		weight := 1.0
		if len(match) > 2 && match[2] != "" {
			if w, err := strconv.ParseFloat(match[2], 64); err == nil {
				weight = w
			}
		}
		meta.Loras = append(meta.Loras, ParsedLoraResource{
			Name:   name,
			Weight: weight,
		})
	}

	// Parse parameters line: "Steps: 28, Sampler: Euler a, Schedule type: Automatic, CFG scale: 7, Seed: 12345, Size: 832x1216..."
	if paramsLine != "" {
		parts := strings.Split(paramsLine, ", ")
		for _, part := range parts {
			kv := strings.SplitN(part, ": ", 2)
			if len(kv) != 2 {
				continue
			}
			key := strings.TrimSpace(kv[0])
			val := strings.TrimSpace(kv[1])

			if meta.ExtraParams == nil {
				meta.ExtraParams = make(map[string]string)
			}
			meta.ExtraParams[key] = val

			switch strings.ToLower(key) {
			case "steps":
				if s, err := strconv.Atoi(val); err == nil {
					meta.Steps = s
				}
			case "sampler":
				meta.Sampler = val
			case "schedule type":
				meta.Scheduler = val
			case "cfg scale":
				if c, err := strconv.ParseFloat(val, 64); err == nil {
					meta.CFGScale = c
				}
			case "seed":
				if s, err := strconv.ParseInt(val, 10, 64); err == nil {
					meta.Seed = s
				}
			case "size":
				dims := strings.Split(val, "x")
				if len(dims) == 2 {
					if w, err := strconv.Atoi(dims[0]); err == nil {
						meta.Width = w
					}
					if h, err := strconv.Atoi(dims[1]); err == nil {
						meta.Height = h
					}
				}
			case "model":
				meta.ModelName = val
			case "model hash":
				meta.ModelHash = val
				if meta.ModelName == "" {
					meta.ModelName = val
				}
			case "vae":
				meta.VAE = val
			case "vae hash":
				if meta.VAE == "" {
					meta.VAE = val
				}
			case "clip skip":
				if cs, err := strconv.Atoi(val); err == nil {
					meta.ClipSkip = cs
				}
			case "denoising strength":
				if ds, err := strconv.ParseFloat(val, 64); err == nil {
					meta.DenoisingStr = ds
				}
			case "hires upscale":
				if hu, err := strconv.ParseFloat(val, 64); err == nil {
					meta.HiresUpscale = hu
				}
			case "hires steps":
				if hs, err := strconv.Atoi(val); err == nil {
					meta.HiresSteps = hs
				}
			case "hires upscaler":
				meta.HiresUpscaler = val
			}
		}
	}
}

func parseNovelAIComment(comment string, meta *ParsedMetadata) error {
	var naiData map[string]interface{}
	if err := json.Unmarshal([]byte(comment), &naiData); err != nil {
		return err
	}
	if prompt, ok := naiData["prompt"].(string); ok {
		meta.PositivePrompt = prompt
	}
	if uc, ok := naiData["uc"].(string); ok {
		meta.NegativePrompt = uc
	}
	if steps, ok := naiData["steps"].(float64); ok {
		meta.Steps = int(steps)
	}
	if scale, ok := naiData["scale"].(float64); ok {
		meta.CFGScale = scale
	}
	if seed, ok := naiData["seed"].(float64); ok {
		meta.Seed = int64(seed)
	}
	if sampler, ok := naiData["sampler"].(string); ok {
		meta.Sampler = sampler
	}
	return nil
}
