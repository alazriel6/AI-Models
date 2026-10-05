package parser

import (
	"encoding/binary"
	"errors"
	"fmt"
	"strings"
)

// parseWebPMetadata parses a WebP RIFF file and extracts EXIF, XMP, and canvas dimensions.
func parseWebPMetadata(data []byte) (*ParsedMetadata, error) {
	if len(data) < 12 {
		return nil, errors.New("file is too short to be a valid WebP image")
	}

	if string(data[:4]) != "RIFF" || string(data[8:12]) != "WEBP" {
		return nil, errors.New("invalid WebP signature")
	}

	meta := &ParsedMetadata{
		Format:      "webp",
		Source:      "unknown",
		RawChunks:   make(map[string]string),
		ExtraParams: make(map[string]string),
	}

	offset := 12
	fileLen := len(data)

	var exifData []byte
	var xmpData []byte

	for offset+8 <= fileLen {
		fourCC := string(data[offset : offset+4])
		chunkLen := int(binary.LittleEndian.Uint32(data[offset+4 : offset+8]))
		offset += 8

		if chunkLen < 0 || offset+chunkLen > fileLen {
			break
		}

		chunkBytes := data[offset : offset+chunkLen]

		switch fourCC {
		case "VP8X":
			if chunkLen >= 10 {
				// Canvas width (24-bit integer at bytes 4..7 + 1)
				w := int(chunkBytes[4]) | int(chunkBytes[5])<<8 | int(chunkBytes[6])<<16
				meta.Width = w + 1
				// Canvas height (24-bit integer at bytes 7..10 + 1)
				h := int(chunkBytes[7]) | int(chunkBytes[8])<<8 | int(chunkBytes[9])<<16
				meta.Height = h + 1
			}
		case "VP8 ":
			if chunkLen >= 10 && meta.Width == 0 {
				// Key frame 0x9d012a
				if chunkBytes[3] == 0x9d && chunkBytes[4] == 0x01 && chunkBytes[5] == 0x2a {
					w := int(binary.LittleEndian.Uint16(chunkBytes[6:8])) & 0x3fff
					h := int(binary.LittleEndian.Uint16(chunkBytes[8:10])) & 0x3fff
					meta.Width = w
					meta.Height = h
				}
			}
		case "VP8L":
			if chunkLen >= 5 && meta.Width == 0 && chunkBytes[0] == 0x2f {
				b1 := uint32(chunkBytes[1])
				b2 := uint32(chunkBytes[2])
				b3 := uint32(chunkBytes[3])
				b4 := uint32(chunkBytes[4])
				w := 1 + int(b1|(b2&0x3f)<<8)
				h := 1 + int((b2>>6)|(b3<<2)|(b4&0xf)<<10)
				meta.Width = w
				meta.Height = h
			}
		case "EXIF":
			exifData = chunkBytes
		case "XMP ":
			xmpData = chunkBytes
		}

		// Chunks are padded to even number of bytes
		offset += chunkLen
		if chunkLen%2 != 0 {
			offset++
		}
	}

	// 1. Process EXIF if found
	if len(exifData) > 0 {
		exifMap := extractExifMetadata(exifData)
		for k, v := range exifMap {
			meta.RawChunks["EXIF_"+k] = v
		}

		if comment, ok := exifMap["UserComment"]; ok && strings.TrimSpace(comment) != "" {
			if strings.HasPrefix(strings.TrimSpace(comment), "{") {
				if err := parseComfyUIPrompt(comment, meta); err == nil {
					meta.Source = "comfyui"
					meta.RawPrompt = comment
					return meta, nil
				}
			}
			parseA1111Parameters(comment, meta)
			meta.Source = "a1111"
			meta.RawPrompt = comment
			return meta, nil
		}

		if params, ok := exifMap["parameters"]; ok && strings.TrimSpace(params) != "" {
			parseA1111Parameters(params, meta)
			meta.Source = "a1111"
			meta.RawPrompt = params
			return meta, nil
		}

		if prompt, ok := exifMap["prompt"]; ok && strings.TrimSpace(prompt) != "" {
			if err := parseComfyUIPrompt(prompt, meta); err == nil {
				meta.Source = "comfyui"
				meta.RawPrompt = prompt
				return meta, nil
			}
		}

		if desc, ok := exifMap["ImageDescription"]; ok && strings.TrimSpace(desc) != "" {
			parseA1111Parameters(desc, meta)
			meta.Source = "a1111"
			meta.RawPrompt = desc
			return meta, nil
		}
	}

	// 2. Process XMP if found
	if len(xmpData) > 0 {
		xmpMap := extractXMPMetadata(xmpData)
		for k, v := range xmpMap {
			meta.RawChunks["XMP_"+k] = v
		}

		if desc, ok := xmpMap["description"]; ok && strings.TrimSpace(desc) != "" {
			parseA1111Parameters(desc, meta)
			meta.Source = "a1111"
			meta.RawPrompt = desc
			return meta, nil
		}

		if prompt, ok := xmpMap["prompt"]; ok && strings.TrimSpace(prompt) != "" {
			if err := parseComfyUIPrompt(prompt, meta); err == nil {
				meta.Source = "comfyui"
				meta.RawPrompt = prompt
				return meta, nil
			}
		}
	}

	if meta.Width > 0 && meta.Height > 0 {
		return meta, nil
	}

	return nil, fmt.Errorf("no generation metadata found in WebP image")
}
