package parser

import (
	"bytes"
	"encoding/binary"
	"strings"
	"testing"
)

// Helper to create synthetic WebP with EXIF chunk
func createSyntheticWebP(exifPayload []byte, width, height int) []byte {
	var buf bytes.Buffer
	buf.WriteString("RIFF")
	// Placeholder for total size
	_ = binary.Write(&buf, binary.LittleEndian, uint32(0))
	buf.WriteString("WEBP")

	// VP8X chunk (10 bytes)
	buf.WriteString("VP8X")
	_ = binary.Write(&buf, binary.LittleEndian, uint32(10))
	vp8xData := make([]byte, 10)
	vp8xData[0] = 0x08 // Exif flag
	wVal := width - 1
	hVal := height - 1
	vp8xData[4] = byte(wVal & 0xFF)
	vp8xData[5] = byte((wVal >> 8) & 0xFF)
	vp8xData[6] = byte((wVal >> 16) & 0xFF)
	vp8xData[7] = byte(hVal & 0xFF)
	vp8xData[8] = byte((hVal >> 8) & 0xFF)
	vp8xData[9] = byte((hVal >> 16) & 0xFF)
	buf.Write(vp8xData)

	// EXIF chunk
	if len(exifPayload) > 0 {
		buf.WriteString("EXIF")
		_ = binary.Write(&buf, binary.LittleEndian, uint32(len(exifPayload)))
		buf.Write(exifPayload)
		if len(exifPayload)%2 != 0 {
			buf.WriteByte(0)
		}
	}

	data := buf.Bytes()
	binary.LittleEndian.PutUint32(data[4:8], uint32(len(data)-8))
	return data
}

// Helper to create synthetic JPEG with COM or APP1 marker
func createSyntheticJPEG(comment string, app1Payload []byte, width, height int) []byte {
	var buf bytes.Buffer
	// SOI
	buf.Write([]byte{0xFF, 0xD8})

	// APP1 (Exif) if present
	if len(app1Payload) > 0 {
		buf.Write([]byte{0xFF, 0xE1})
		_ = binary.Write(&buf, binary.BigEndian, uint16(len(app1Payload)+2))
		buf.Write(app1Payload)
	}

	// COM (Comment) if present
	if comment != "" {
		buf.Write([]byte{0xFF, 0xFE})
		_ = binary.Write(&buf, binary.BigEndian, uint16(len(comment)+2))
		buf.WriteString(comment)
	}

	// SOF0 (Frame dimensions)
	buf.Write([]byte{0xFF, 0xC0})
	_ = binary.Write(&buf, binary.BigEndian, uint16(17)) // length
	sofPayload := make([]byte, 15)
	sofPayload[0] = 8 // precision
	binary.BigEndian.PutUint16(sofPayload[1:3], uint16(height))
	binary.BigEndian.PutUint16(sofPayload[3:5], uint16(width))
	buf.Write(sofPayload)

	// EOI
	buf.Write([]byte{0xFF, 0xD9})

	return buf.Bytes()
}

func TestParseWebPMetadata(t *testing.T) {
	promptText := "cyberpunk city, neon rain\nSteps: 25, Sampler: DPM++ 2M Karras, CFG scale: 6.0, Seed: 998877, Size: 512x768, Model: cyber_realistic"
	exifPayload := append([]byte("Exif\x00\x00parameters: "), []byte(promptText)...)

	webpBytes := createSyntheticWebP(exifPayload, 512, 768)

	meta, err := ParseImageMetadata(bytes.NewReader(webpBytes), "sample.webp")
	if err != nil {
		t.Fatalf("unexpected error parsing WebP: %v", err)
	}

	if meta.Format != "webp" {
		t.Errorf("expected format 'webp', got '%s'", meta.Format)
	}
	if meta.Steps != 25 {
		t.Errorf("expected steps 25, got %d", meta.Steps)
	}
	if meta.Sampler != "DPM++ 2M Karras" {
		t.Errorf("expected sampler 'DPM++ 2M Karras', got '%s'", meta.Sampler)
	}
	if meta.CFGScale != 6.0 {
		t.Errorf("expected CFG 6.0, got %f", meta.CFGScale)
	}
	if meta.Seed != 998877 {
		t.Errorf("expected seed 998877, got %d", meta.Seed)
	}
	if meta.Width != 512 || meta.Height != 768 {
		t.Errorf("expected resolution 512x768, got %dx%d", meta.Width, meta.Height)
	}
}

func TestParseJPEGMetadata(t *testing.T) {
	comment := "beautiful landscape, mountains, sunset\nNegative prompt: clouds, dark\nSteps: 20, Sampler: Euler, CFG scale: 7, Seed: 123456, Size: 1024x768, Model: flux_dev"
	jpegBytes := createSyntheticJPEG(comment, nil, 1024, 768)

	meta, err := ParseImageMetadata(bytes.NewReader(jpegBytes), "photo.jpg")
	if err != nil {
		t.Fatalf("unexpected error parsing JPEG: %v", err)
	}

	if meta.Format != "jpeg" {
		t.Errorf("expected format 'jpeg', got '%s'", meta.Format)
	}
	if meta.Steps != 20 {
		t.Errorf("expected steps 20, got %d", meta.Steps)
	}
	if meta.PositivePrompt != "beautiful landscape, mountains, sunset" {
		t.Errorf("expected positive prompt, got '%s'", meta.PositivePrompt)
	}
	if meta.NegativePrompt != "clouds, dark" {
		t.Errorf("expected negative prompt, got '%s'", meta.NegativePrompt)
	}
	if meta.Width != 1024 || meta.Height != 768 {
		t.Errorf("expected resolution 1024x768, got %dx%d", meta.Width, meta.Height)
	}
}

func TestParseJSONComfyUIWorkflow(t *testing.T) {
	jsonWorkflow := `{
		"1": {
			"class_type": "KSampler",
			"inputs": {
				"seed": 88291,
				"steps": 24,
				"cfg": 5.0,
				"sampler_name": "euler",
				"scheduler": "normal",
				"positive": ["2", 0],
				"negative": ["3", 0]
			}
		},
		"2": {
			"class_type": "CLIPTextEncode",
			"inputs": { "text": "masterpiece, solo, fantasy sorceress" }
		},
		"3": {
			"class_type": "CLIPTextEncode",
			"inputs": { "text": "low quality, blurry, watermark" }
		}
	}`

	meta, err := ParseImageMetadata(strings.NewReader(jsonWorkflow), "workflow.json")
	if err != nil {
		t.Fatalf("unexpected error parsing JSON workflow: %v", err)
	}

	if meta.Format != "json" {
		t.Errorf("expected format 'json', got '%s'", meta.Format)
	}
	if meta.Source != "comfyui" {
		t.Errorf("expected source 'comfyui', got '%s'", meta.Source)
	}
	if meta.Steps != 24 {
		t.Errorf("expected steps 24, got %d", meta.Steps)
	}
	if meta.PositivePrompt != "masterpiece, solo, fantasy sorceress" {
		t.Errorf("expected positive prompt, got '%s'", meta.PositivePrompt)
	}
}
