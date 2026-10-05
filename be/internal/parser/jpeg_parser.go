package parser

import (
	"encoding/binary"
	"errors"
	"fmt"
	"strings"
)

// parseJPEGMetadata parses a JPEG image stream and extracts EXIF, XMP, and COM markers.
func parseJPEGMetadata(data []byte) (*ParsedMetadata, error) {
	if len(data) < 4 || data[0] != 0xFF || data[1] != 0xD8 {
		return nil, errors.New("file is not a valid JPEG image (missing SOI marker)")
	}

	meta := &ParsedMetadata{
		Format:      "jpeg",
		Source:      "unknown",
		RawChunks:   make(map[string]string),
		ExtraParams: make(map[string]string),
	}

	offset := 2
	fileLen := len(data)

	var exifData []byte
	var xmpData []byte
	var commentData string

	for offset < fileLen-1 {
		if data[offset] != 0xFF {
			offset++
			continue
		}

		marker := data[offset+1]
		offset += 2

		// Skip fill bytes 0xFF
		for marker == 0xFF && offset < fileLen {
			marker = data[offset]
			offset++
		}

		// Standalone markers without length
		if marker == 0xD8 || marker == 0xD9 || marker == 0x00 || (marker >= 0xD0 && marker <= 0xD7) {
			continue
		}

		// SOS (Start of Scan) marks the beginning of compressed image scan - stop here
		if marker == 0xDA {
			break
		}

		if offset+2 > fileLen {
			break
		}

		segLen := int(binary.BigEndian.Uint16(data[offset : offset+2]))
		if segLen < 2 || offset+segLen > fileLen {
			break
		}

		payload := data[offset+2 : offset+segLen]
		offset += segLen

		// SOF0 (0xC0), SOF2 (0xC2) Baseline & Progressive DCT
		if marker == 0xC0 || marker == 0xC2 {
			if len(payload) >= 5 {
				meta.Height = int(binary.BigEndian.Uint16(payload[1:3]))
				meta.Width = int(binary.BigEndian.Uint16(payload[3:5]))
			}
		} else if marker == 0xFE {
			// COM marker (Comment)
			commentData = string(payload)
			meta.RawChunks["COM"] = commentData
		} else if marker == 0xE1 {
			// APP1 marker (Exif or XMP)
			if len(payload) > 6 && string(payload[:4]) == "Exif" && payload[4] == 0x00 && payload[5] == 0x00 {
				exifData = payload[6:]
			} else if len(payload) > 29 && strings.HasPrefix(string(payload[:28]), "http://ns.adobe.com/xap/1.0/") {
				xmpData = payload[29:]
			} else if len(exifData) == 0 {
				exifData = payload
			}
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

	// 2. Process COM marker
	if commentData != "" {
		trimmed := strings.TrimSpace(commentData)
		if strings.HasPrefix(trimmed, "{") {
			if err := parseComfyUIPrompt(trimmed, meta); err == nil {
				meta.Source = "comfyui"
				meta.RawPrompt = trimmed
				return meta, nil
			}
		}
		parseA1111Parameters(trimmed, meta)
		meta.Source = "a1111"
		meta.RawPrompt = trimmed
		return meta, nil
	}

	// 3. Process XMP if found
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

	return nil, fmt.Errorf("no generation metadata found in JPEG image")
}
