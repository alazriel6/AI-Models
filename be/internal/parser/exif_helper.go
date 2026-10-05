package parser

import (
	"bytes"
	"encoding/binary"
	"regexp"
	"strings"
	"unicode/utf16"
)

// extractExifMetadata parses TIFF/EXIF binary payload and extracts text fields.
func extractExifMetadata(data []byte) map[string]string {
	results := make(map[string]string)
	if len(data) < 8 {
		return results
	}

	// Strip "Exif\x00\x00" header if present
	if len(data) > 6 && string(data[:4]) == "Exif" && data[4] == 0x00 && data[5] == 0x00 {
		data = data[6:]
	}

	if len(data) < 8 {
		return results
	}

	var order binary.ByteOrder
	if data[0] == 'I' && data[1] == 'I' && data[2] == 0x2A && data[3] == 0x00 {
		order = binary.LittleEndian
	} else if data[0] == 'M' && data[1] == 'M' && data[2] == 0x00 && data[3] == 0x2A {
		order = binary.BigEndian
	} else {
		// Not a standard TIFF header; fall back to binary search for embedded text
		scanExifForEmbeddedText(data, results)
		return results
	}

	firstIFDOffset := order.Uint32(data[4:8])
	parseIFD(data, firstIFDOffset, order, results, 0)

	// In case structured TIFF parsing missed anything, also scan for raw parameter text
	scanExifForEmbeddedText(data, results)

	return results
}

func parseIFD(data []byte, offset uint32, order binary.ByteOrder, results map[string]string, depth int) {
	if depth > 4 || int(offset)+2 > len(data) {
		return
	}

	numEntries := order.Uint16(data[offset : offset+2])
	curr := offset + 2

	var exifSubIFDOffset uint32

	for i := 0; i < int(numEntries); i++ {
		if int(curr)+12 > len(data) {
			break
		}

		tag := order.Uint16(data[curr : curr+2])
		tagType := order.Uint16(data[curr+2 : curr+4])
		count := order.Uint32(data[curr+4 : curr+8])
		valBytes := data[curr+8 : curr+12]

		var valData []byte
		var byteLen uint32

		switch tagType {
		case 1, 2, 7: // BYTE, ASCII, UNDEFINED
			byteLen = count
		case 3: // SHORT
			byteLen = count * 2
		case 4: // LONG
			byteLen = count * 4
		default:
			byteLen = count
		}

		if byteLen <= 4 {
			valData = valBytes[:byteLen]
		} else {
			offsetVal := order.Uint32(valBytes)
			if int(offsetVal+byteLen) <= len(data) {
				valData = data[offsetVal : offsetVal+byteLen]
			}
		}

		switch tag {
		case 0x010E: // ImageDescription
			text := cleanExifString(valData)
			if text != "" {
				results["ImageDescription"] = text
			}
		case 0x0131: // Software
			text := cleanExifString(valData)
			if text != "" {
				results["Software"] = text
			}
		case 0x8769: // Exif SubIFD Pointer
			if len(valData) >= 4 {
				exifSubIFDOffset = order.Uint32(valData[:4])
			} else {
				exifSubIFDOffset = order.Uint32(valBytes)
			}
		case 0x9286: // UserComment
			text := parseUserComment(valData)
			if text != "" {
				results["UserComment"] = text
			}
		}

		curr += 12
	}

	if exifSubIFDOffset > 0 && int(exifSubIFDOffset) < len(data) {
		parseIFD(data, exifSubIFDOffset, order, results, depth+1)
	}
}

func parseUserComment(data []byte) string {
	if len(data) == 0 {
		return ""
	}

	// EXIF standard: first 8 bytes specify charset
	if len(data) >= 8 {
		charset := string(data[:8])
		payload := data[8:]

		if strings.HasPrefix(charset, "UNICODE") {
			// Check if UTF-16 Little Endian
			if decoded := decodeUTF16(payload); decoded != "" {
				return strings.TrimSpace(decoded)
			}
		}
		if strings.HasPrefix(charset, "ASCII") {
			return strings.TrimSpace(cleanExifString(payload))
		}
	}

	// Try direct UTF-16
	if decoded := decodeUTF16(data); decoded != "" && (strings.Contains(decoded, "Steps:") || strings.Contains(decoded, "prompt")) {
		return strings.TrimSpace(decoded)
	}

	// Fallback to raw string
	return strings.TrimSpace(cleanExifString(data))
}

func decodeUTF16(b []byte) string {
	if len(b)%2 != 0 {
		b = b[:len(b)-1]
	}
	u16 := make([]uint16, len(b)/2)
	for i := 0; i < len(u16); i++ {
		u16[i] = binary.LittleEndian.Uint16(b[i*2 : i*2+2])
	}
	runes := utf16.Decode(u16)
	str := string(runes)
	str = strings.ReplaceAll(str, "\x00", "")
	return strings.TrimSpace(str)
}

func cleanExifString(data []byte) string {
	return strings.TrimRight(string(data), "\x00")
}

// scanExifForEmbeddedText performs binary scanning for common AI prompt markers
func scanExifForEmbeddedText(data []byte, results map[string]string) {
	if _, ok := results["parameters"]; !ok {
		// Look for "parameters\x00" or "parameters:"
		paramIdx := bytes.Index(data, []byte("parameters"))
		if paramIdx >= 0 {
			raw := extractPrintableSlice(data[paramIdx:])
			if raw != "" {
				// Strip leading "parameters:" or "parameters\x00"
				cleaned := strings.TrimPrefix(raw, "parameters:")
				cleaned = strings.TrimPrefix(cleaned, "parameters")
				cleaned = strings.TrimSpace(cleaned)
				if cleaned != "" {
					results["parameters"] = cleaned
				}
			}
		}
	}

	if _, ok := results["prompt"]; !ok {
		promptIdx := bytes.Index(data, []byte(`"prompt":`))
		if promptIdx >= 0 {
			// Search backwards for opening brace '{'
			start := bytes.LastIndexByte(data[:promptIdx], '{')
			if start >= 0 {
				candidate := extractJSONBlock(data[start:])
				if candidate != "" {
					results["prompt"] = candidate
				}
			}
		}
	}

	// Check for raw "Steps: "
	if _, ok := results["parameters"]; !ok {
		stepsIdx := bytes.Index(data, []byte("Steps: "))
		if stepsIdx >= 0 {
			start := 0
			if stepsIdx > 2000 {
				start = stepsIdx - 2000
			}
			raw := extractPrintableSlice(data[start : stepsIdx+500])
			if strings.Contains(raw, "Steps: ") {
				results["parameters"] = strings.TrimSpace(raw)
			}
		}
	}
}

func extractPrintableSlice(data []byte) string {
	var sb strings.Builder
	for _, b := range data {
		if b == 0 {
			if sb.Len() > 50 {
				break
			}
			sb.Reset()
			continue
		}
		if (b >= 32 && b <= 126) || b == '\n' || b == '\r' || b == '\t' {
			sb.WriteByte(b)
		} else if b >= 128 { // UTF-8 continuation
			sb.WriteByte(b)
		}
	}
	return sb.String()
}

func extractJSONBlock(data []byte) string {
	depth := 0
	inString := false
	escaped := false
	end := -1

	for i, b := range data {
		if escaped {
			escaped = false
			continue
		}
		if b == '\\' && inString {
			escaped = true
			continue
		}
		if b == '"' {
			inString = !inString
			continue
		}
		if inString {
			continue
		}

		if b == '{' {
			depth++
		} else if b == '}' {
			depth--
			if depth == 0 {
				end = i + 1
				break
			}
		}
	}

	if end > 0 && end <= len(data) {
		return string(data[:end])
	}
	return ""
}

// extractXMPMetadata extracts description and generation tags from XML payload
func extractXMPMetadata(xmpBytes []byte) map[string]string {
	results := make(map[string]string)
	text := string(xmpBytes)
	results["XMP_RAW"] = text

	// Extract <dc:description> or <exif:UserComment>
	reDesc := regexp.MustCompile(`(?s)<dc:description[^>]*>(.*?)</dc:description>`)
	if match := reDesc.FindStringSubmatch(text); len(match) > 1 {
		cleaned := stripXMLTags(match[1])
		if cleaned != "" {
			results["description"] = cleaned
		}
	}

	reComment := regexp.MustCompile(`(?s)<exif:UserComment[^>]*>(.*?)</exif:UserComment>`)
	if match := reComment.FindStringSubmatch(text); len(match) > 1 {
		cleaned := stripXMLTags(match[1])
		if cleaned != "" {
			results["UserComment"] = cleaned
		}
	}

	rePrompt := regexp.MustCompile(`(?s)<prompt[^>]*>(.*?)</prompt>`)
	if match := rePrompt.FindStringSubmatch(text); len(match) > 1 {
		cleaned := stripXMLTags(match[1])
		if cleaned != "" {
			results["prompt"] = cleaned
		}
	}

	return results
}

func stripXMLTags(s string) string {
	re := regexp.MustCompile(`<[^>]+>`)
	cleaned := re.ReplaceAllString(s, "")
	cleaned = strings.ReplaceAll(cleaned, "&quot;", "\"")
	cleaned = strings.ReplaceAll(cleaned, "&apos;", "'")
	cleaned = strings.ReplaceAll(cleaned, "&lt;", "<")
	cleaned = strings.ReplaceAll(cleaned, "&gt;", ">")
	cleaned = strings.ReplaceAll(cleaned, "&amp;", "&")
	return strings.TrimSpace(cleaned)
}
