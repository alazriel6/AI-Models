package parser

import (
	"bytes"
	"encoding/binary"
	"hash/crc32"
	"testing"
)

// Helper to write a PNG chunk
func writeChunk(buf *bytes.Buffer, chunkType string, data []byte) {
	_ = binary.Write(buf, binary.BigEndian, uint32(len(data)))
	buf.WriteString(chunkType)
	buf.Write(data)

	// Calculate CRC (chunk type + data)
	h := crc32.NewIEEE()
	h.Write([]byte(chunkType))
	h.Write(data)
	_ = binary.Write(buf, binary.BigEndian, h.Sum32())
}

// Create a minimal synthetic PNG in memory
func createSyntheticPNG(chunks map[string][]byte, width, height uint32) []byte {
	var buf bytes.Buffer
	buf.Write(pngSignature)

	// IHDR chunk: 13 bytes (width 4, height 4, bit depth 1, color type 1, comp 1, filter 1, interlace 1)
	ihdrData := make([]byte, 13)
	binary.BigEndian.PutUint32(ihdrData[0:4], width)
	binary.BigEndian.PutUint32(ihdrData[4:8], height)
	ihdrData[8] = 8 // bit depth
	ihdrData[9] = 2 // color type: truecolor
	writeChunk(&buf, "IHDR", ihdrData)

	// tEXt chunks
	for k, v := range chunks {
		var chunkData []byte
		chunkData = append(chunkData, []byte(k)...)
		chunkData = append(chunkData, 0x00) // null separator
		chunkData = append(chunkData, v...)
		writeChunk(&buf, "tEXt", chunkData)
	}

	// IEND chunk
	writeChunk(&buf, "IEND", []byte{})

	return buf.Bytes()
}

func TestParseA1111Metadata(t *testing.T) {
	a1111Text := "masterpiece, 1girl, solo, anime, in rainy city, neon <lora:detail_booster:0.75>\n" +
		"Negative prompt: bad anatomy, worst quality, low quality, blurry\n" +
		"Steps: 28, Sampler: Euler a, Schedule type: Automatic, CFG scale: 7, Seed: 384912048, Size: 832x1216, Model: illustriousXL_v01, Model hash: d74d816a13"

	pngBytes := createSyntheticPNG(map[string][]byte{
		"parameters": []byte(a1111Text),
	}, 832, 1216)

	meta, err := ParsePNGMetadata(bytes.NewReader(pngBytes))
	if err != nil {
		t.Fatalf("unexpected error parsing A1111 PNG: %v", err)
	}

	if meta.Source != "a1111" {
		t.Errorf("expected source 'a1111', got '%s'", meta.Source)
	}
	if meta.Steps != 28 {
		t.Errorf("expected steps 28, got %d", meta.Steps)
	}
	if meta.Sampler != "Euler a" {
		t.Errorf("expected sampler 'Euler a', got '%s'", meta.Sampler)
	}
	if meta.CFGScale != 7.0 {
		t.Errorf("expected CFG 7.0, got %f", meta.CFGScale)
	}
	if meta.Seed != 384912048 {
		t.Errorf("expected seed 384912048, got %d", meta.Seed)
	}
	if meta.Width != 832 || meta.Height != 1216 {
		t.Errorf("expected resolution 832x1216, got %dx%d", meta.Width, meta.Height)
	}
	if meta.ModelName != "illustriousXL_v01" {
		t.Errorf("expected model 'illustriousXL_v01', got '%s'", meta.ModelName)
	}
	if len(meta.Loras) != 1 || meta.Loras[0].Name != "detail_booster" || meta.Loras[0].Weight != 0.75 {
		t.Errorf("expected 1 lora 'detail_booster' with weight 0.75, got %+v", meta.Loras)
	}
}

func TestParseComfyUIMetadata(t *testing.T) {
	comfyPromptJSON := `{
		"3": {
			"class_type": "KSampler",
			"inputs": {
				"seed": 1566802087,
				"steps": 30,
				"cfg": 6.5,
				"sampler_name": "euler_ancestral",
				"scheduler": "karras",
				"positive": ["6", 0],
				"negative": ["7", 0]
			}
		},
		"4": {
			"class_type": "CheckpointLoaderSimple",
			"inputs": {
				"ckpt_name": "sdxl_base_1.0.safetensors"
			}
		},
		"5": {
			"class_type": "EmptyLatentImage",
			"inputs": {
				"width": 1024,
				"height": 1024
			}
		},
		"6": {
			"class_type": "CLIPTextEncode",
			"inputs": {
				"text": "1boy, warrior, dark armor, cinematic lighting"
			}
		},
		"7": {
			"class_type": "CLIPTextEncode",
			"inputs": {
				"text": "ugly, bad anatomy, deformed, watermark"
			}
		},
		"8": {
			"class_type": "LoraLoader",
			"inputs": {
				"lora_name": "cinematic_armor_v2.safetensors",
				"strength_model": 0.9
			}
		}
	}`

	pngBytes := createSyntheticPNG(map[string][]byte{
		"prompt": []byte(comfyPromptJSON),
	}, 1024, 1024)

	meta, err := ParsePNGMetadata(bytes.NewReader(pngBytes))
	if err != nil {
		t.Fatalf("unexpected error parsing ComfyUI PNG: %v", err)
	}

	if meta.Source != "comfyui" {
		t.Errorf("expected source 'comfyui', got '%s'", meta.Source)
	}
	if meta.Steps != 30 {
		t.Errorf("expected steps 30, got %d", meta.Steps)
	}
	if meta.CFGScale != 6.5 {
		t.Errorf("expected CFG 6.5, got %f", meta.CFGScale)
	}
	if meta.Sampler != "euler_ancestral" {
		t.Errorf("expected sampler 'euler_ancestral', got '%s'", meta.Sampler)
	}
	if meta.Scheduler != "karras" {
		t.Errorf("expected scheduler 'karras', got '%s'", meta.Scheduler)
	}
	if meta.PositivePrompt != "1boy, warrior, dark armor, cinematic lighting" {
		t.Errorf("expected positive prompt, got '%s'", meta.PositivePrompt)
	}
	if meta.NegativePrompt != "ugly, bad anatomy, deformed, watermark" {
		t.Errorf("expected negative prompt, got '%s'", meta.NegativePrompt)
	}
	if meta.ModelName != "sdxl_base_1.0.safetensors" {
		t.Errorf("expected checkpoint, got '%s'", meta.ModelName)
	}
	if len(meta.Loras) != 1 || meta.Loras[0].Name != "cinematic_armor_v2.safetensors" || meta.Loras[0].Weight != 0.9 {
		t.Errorf("expected 1 lora, got %+v", meta.Loras)
	}
}
