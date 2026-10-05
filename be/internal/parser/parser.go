package parser

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"strings"
)

// ParseImageMetadata reads any supported image or workflow file (PNG, WebP, JPEG, JSON, TXT)
// and extracts full generation parameters, prompt graphs, and raw chunks.
func ParseImageMetadata(r io.Reader, filename string) (*ParsedMetadata, error) {
	// Read up to 50MB into memory to inspect headers and chunks
	data, err := io.ReadAll(io.LimitReader(r, 50*1024*1024))
	if err != nil {
		return nil, fmt.Errorf("failed to read image file: %w", err)
	}

	if len(data) < 8 {
		return nil, errors.New("file is too small to contain image or metadata")
	}

	// 1. Detect PNG
	if bytes.Equal(data[:8], pngSignature) {
		return ParsePNGMetadata(bytes.NewReader(data))
	}

	// 2. Detect WebP (RIFF....WEBP)
	if len(data) >= 12 && string(data[:4]) == "RIFF" && string(data[8:12]) == "WEBP" {
		return parseWebPMetadata(data)
	}

	// 3. Detect JPEG (0xFF, 0xD8)
	if data[0] == 0xFF && data[1] == 0xD8 {
		return parseJPEGMetadata(data)
	}

	// 4. Detect JSON (ComfyUI workflow file or exported prompt)
	trimmed := strings.TrimSpace(string(data))
	if strings.HasPrefix(trimmed, "{") || strings.HasPrefix(trimmed, "[") {
		meta := &ParsedMetadata{
			Format:      "json",
			Source:      "comfyui",
			RawChunks:   map[string]string{"workflow_json": trimmed},
			ExtraParams: make(map[string]string),
		}
		if err := parseComfyUIPrompt(trimmed, meta); err == nil {
			meta.RawPrompt = trimmed
			meta.PromptJSON = trimmed
			return meta, nil
		}
		// Direct workflow JSON format
		meta.WorkflowJSON = trimmed
		meta.RawPrompt = trimmed
		return meta, nil
	}

	// 5. Detect plain text parameters file
	if strings.Contains(trimmed, "Steps:") || strings.Contains(trimmed, "Negative prompt:") {
		meta := &ParsedMetadata{
			Format:      "text",
			Source:      "a1111",
			RawChunks:   map[string]string{"text_parameters": trimmed},
			ExtraParams: make(map[string]string),
			RawPrompt:   trimmed,
		}
		parseA1111Parameters(trimmed, meta)
		return meta, nil
	}

	lowerExt := strings.ToLower(filename)
	if strings.HasSuffix(lowerExt, ".png") {
		return nil, errors.New("invalid PNG signature or corrupted PNG file")
	}
	if strings.HasSuffix(lowerExt, ".webp") {
		return nil, errors.New("invalid WebP signature or corrupted WebP file")
	}
	if strings.HasSuffix(lowerExt, ".jpg") || strings.HasSuffix(lowerExt, ".jpeg") {
		return nil, errors.New("invalid JPEG signature or corrupted JPEG file")
	}

	return nil, fmt.Errorf("unsupported file format. Supported formats: PNG, WebP, JPEG, JSON (ComfyUI workflow), TXT")
}
