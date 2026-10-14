package services

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

type LoraSuggestion struct {
	Name   string  `json:"name"`
	Weight float64 `json:"weight"`
}

type InterrogateResult struct {
	Character          string           `json:"character,omitempty"`
	DanbooruPrompt     string           `json:"danbooru_prompt"`
	NegativePrompt     string           `json:"negative_prompt"`
	NaturalPrompt      string           `json:"natural_prompt"`
	StyleTags          []string         `json:"style_tags"`
	RecommendedModel   string           `json:"recommended_model"`
	RecommendedSampler string           `json:"recommended_sampler"`
	RecommendedSteps   int              `json:"recommended_steps"`
	RecommendedCFG     float64          `json:"recommended_cfg"`
	SuggestedLoras     []LoraSuggestion `json:"suggested_loras"`
	UsedModel          string           `json:"used_model,omitempty"`
}

type InterrogateService struct {
	httpClient *http.Client
}

func NewInterrogateService() *InterrogateService {
	return &InterrogateService{
		httpClient: &http.Client{
			Timeout: 45 * time.Second,
		},
	}
}

// InterrogateImage analyzes an image using Gemini Vision API and extracts Danbooru tags, prompts, and model recommendations.
func (s *InterrogateService) InterrogateImage(imageBytes []byte, mimeType string, clientApiKey string, selectedModel string) (*InterrogateResult, error) {
	apiKey := strings.TrimSpace(clientApiKey)
	if apiKey == "" {
		apiKey = strings.TrimSpace(os.Getenv("GEMINI_API_KEY"))
	}
	if apiKey == "" {
		return nil, errors.New("Gemini API key is required. Please set GEMINI_API_KEY in backend .env or provide it in the inspector settings")
	}

	if mimeType == "" {
		mimeType = "image/png"
	}

	b64Data := base64.StdEncoding.EncodeToString(imageBytes)

	systemInstruction := `You are an elite AI Art & Anime Prompt Reverse-Engineer, specialized in Danbooru tags, Pixiv anime aesthetic, Stable Diffusion (Pony, Illustrious, Animagine, SDXL, NAI, Flux), and LoRA detection.
Analyze the provided image thoroughly and reconstruct the generation prompt in precise detail.

Return a STRICT JSON object with these EXACT keys:
{
  "character": "Name of the anime/game character if identifiable, or 'original'",
  "danbooru_prompt": "masterpiece, best quality, ultra-detailed, [character tags], [hair/eye features], [clothing tags], [pose/expression], [background/setting], [lighting/atmosphere aesthetic tags]",
  "negative_prompt": "worst quality, low quality, normal quality, blurry, deformed limbs, bad anatomy, bad hands, missing fingers, extra fingers, watermark, signature",
  "natural_prompt": "A vivid 2-3 sentence descriptive natural language prompt describing the scene, subject, pose, mood, and art style",
  "style_tags": ["list of 3 to 6 distinct art style tags e.g. cel shading, vibrant colors, makoto shinkai aesthetic"],
  "recommended_model": "Pony Diffusion V6 XL / Illustrious-XL / Animagine XL 3.1 / SDXL 1.0",
  "recommended_sampler": "Euler a",
  "recommended_steps": 28,
  "recommended_cfg": 7.0,
  "suggested_loras": [
    {"name": "suggested_lora_concept", "weight": 0.8}
  ]
}

Danbooru tags MUST use underscores (e.g. 'long_hair', 'sailor_dress', 'cherry_blossoms', 'looking_at_viewer').
Do NOT include markdown formatting or backticks, return pure JSON.`

	payload := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]interface{}{
					{
						"text": systemInstruction,
					},
					{
						"inline_data": map[string]string{
							"mime_type": mimeType,
							"data":      b64Data,
						},
					},
				},
			},
		},
		"generationConfig": map[string]interface{}{
			"response_mime_type": "application/json",
			"temperature":        0.2,
		},
		"safetySettings": []map[string]interface{}{
			{"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
			{"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
			{"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
			{"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
			{"category": "HARM_CATEGORY_CIVIC_INTEGRITY", "threshold": "BLOCK_NONE"},
		},
	}

	jsonBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to encode request: %w", err)
	}

	var endpoints []string
	cleanModel := strings.TrimSpace(selectedModel)
	if cleanModel != "" && cleanModel != "auto" {
		cleanModel = strings.TrimPrefix(cleanModel, "models/")
		endpoints = append(endpoints, fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", cleanModel, apiKey))
		endpoints = append(endpoints, fmt.Sprintf("https://generativelanguage.googleapis.com/v1/models/%s:generateContent?key=%s", cleanModel, apiKey))
	}

	defaultEndpoints := []string{
		fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=%s", apiKey),
		fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=%s", apiKey),
		fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=%s", apiKey),
		fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-002:generateContent?key=%s", apiKey),
		fmt.Sprintf("https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=%s", apiKey),
		fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=%s", apiKey),
		fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent?key=%s", apiKey),
		fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=%s", apiKey),
		fmt.Sprintf("https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=%s", apiKey),
		fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=%s", apiKey),
	}
	endpoints = append(endpoints, defaultEndpoints...)
	var lastErr error

	for _, url := range endpoints {
		req, err := http.NewRequest("POST", url, bytes.NewReader(jsonBytes))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Content-Type", "application/json")

		resp, err := s.httpClient.Do(req)
		if err != nil {
			lastErr = fmt.Errorf("network request failed for %s: %w", url, err)
			continue
		}

		respBody, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			lastErr = fmt.Errorf("failed to read response body: %w", err)
			continue
		}

		if resp.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("Gemini API error (%s): %s", resp.Status, string(respBody))
			// If 404 (not found), 400 (modality not supported), 503 (high demand / unavailable), 429 (rate limit / quota), or 5xx server error:
			// Continue to try the next fallback model!
			if resp.StatusCode == http.StatusNotFound ||
				(resp.StatusCode == http.StatusBadRequest && strings.Contains(string(respBody), "modality")) ||
				resp.StatusCode == http.StatusServiceUnavailable ||
				resp.StatusCode == http.StatusTooManyRequests ||
				resp.StatusCode >= 500 {
				continue
			}
			return nil, lastErr
		}

		var geminiResp struct {
			Candidates []struct {
				Content struct {
					Parts []struct {
						Text string `json:"text"`
					} `json:"parts"`
				} `json:"content"`
			} `json:"candidates"`
		}

		if err := json.Unmarshal(respBody, &geminiResp); err != nil {
			lastErr = fmt.Errorf("failed to parse Gemini response envelope: %w", err)
			continue
		}

		if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
			lastErr = errors.New("Gemini returned empty response parts")
			continue
		}

		rawText := geminiResp.Candidates[0].Content.Parts[0].Text
		// Strip any markdown code fences if present
		rawText = strings.TrimPrefix(rawText, "```json")
		rawText = strings.TrimPrefix(rawText, "```")
		rawText = strings.TrimSuffix(rawText, "```")
		rawText = strings.TrimSpace(rawText)

		var result InterrogateResult
		if err := json.Unmarshal([]byte(rawText), &result); err != nil {
			return nil, fmt.Errorf("failed to unmarshal JSON from Gemini: %w (raw: %s)", err, rawText)
		}

		// Defaults if missing
		if result.RecommendedSampler == "" {
			result.RecommendedSampler = "Euler a"
		}
		if result.RecommendedSteps == 0 {
			result.RecommendedSteps = 28
		}
		if result.RecommendedCFG == 0 {
			result.RecommendedCFG = 7.0
		}
		if result.RecommendedModel == "" {
			result.RecommendedModel = "Illustrious-XL / Pony V6"
		}
		if result.NegativePrompt == "" {
			result.NegativePrompt = "worst quality, low quality, normal quality, blurry, deformed limbs, bad anatomy, bad hands, missing fingers, extra fingers, watermark, signature"
		}
		// Extract model name from URL
		usedModel := "gemini"
		if idx := strings.Index(url, "/models/"); idx != -1 {
			sub := url[idx+len("/models/"):]
			if colonIdx := strings.Index(sub, ":"); colonIdx != -1 {
				usedModel = sub[:colonIdx]
			}
		}
		result.UsedModel = usedModel

		return &result, nil
	}

	return nil, lastErr
}

// InterrogateLocal analyzes an image using a local LLM/Vision model (Ollama or LM Studio/OpenAI-compatible)
func (s *InterrogateService) InterrogateLocal(imageBytes []byte, mimeType string, provider string, endpoint string, model string) (*InterrogateResult, error) {
	if mimeType == "" {
		mimeType = "image/png"
	}

	b64Data := base64.StdEncoding.EncodeToString(imageBytes)

	systemInstruction := `You are an expert anime & digital art prompt reverse-engineering AI, specialized in Pixiv, Danbooru, Gelbooru, and Stable Diffusion prompting (Pony Diffusion, Illustrious-XL, Animagine XL, SDXL, Flux).
Inspect this image with extreme thoroughness and deconstruct it into exhaustive, accurate Danbooru tags and a rich artistic prompt.

STRICT INSTRUCTIONS FOR DANBOORU TAGS ('danbooru_prompt'):
- You MUST generate at least 30 to 50 highly specific, granular Danbooru tags separated by commas.
- Tags MUST use underscores instead of spaces (e.g., blue_eyes, sailor_collar, pleated_skirt, thighhighs).
- Tag categories you MUST include:
  1. Quality: masterpiece, best quality, ultra-detailed
  2. Character: character count (e.g. 1girl, solo), character name if known (or original)
  3. Hair & Face: exact hair color, hair length, specific hairstyle (e.g. twintails, side_ponytail, bangs, blunt_bangs), eye color, facial expression (e.g. blush, open_mouth, smile, gentle_eyes)
  4. Body & Anatomy: body features, skin tone, chest size (e.g. medium_breasts, large_breasts) if applicable
  5. Detailed Clothing: breakdown of every single piece of attire (e.g. white_shirt, black_vest, necktie, pleated_skirt, frilled_skirt, black_thighhighs, leather_boots, fingerless_gloves, ribbon, hair_ornament)
  6. Pose & View: shot type (e.g. full_body, cowboy_shot, upper_body), pose (e.g. sitting, standing, leaning_forward), arm/hand position, viewing angle (e.g. looking_at_viewer, from_side, dynamic_angle)
  7. Background & Setting: indoor/outdoor, room elements, natural elements (e.g. cherry_blossoms, floating_petals, clouds, starry_sky, neon_lights, bedroom, sunset)
  8. Lighting & Aesthetic: lighting style (e.g. cinematic_lighting, volumetric_lighting, soft_lighting, rim_light, depth_of_field, bloom, glowing)

STRICT INSTRUCTIONS FOR NATURAL PROMPT ('natural_prompt'):
- Write a vivid, descriptive 3-4 sentence paragraph capturing the character, atmosphere, lighting, and artistic style.

Return ONLY a pure JSON object matching this schema (no markdown, no backticks):
{
  "character": "Name of the character or 'original'",
  "danbooru_prompt": "masterpiece, best quality, ultra-detailed, 1girl, solo, ... (exhaustive list of 30-50+ Danbooru tags)",
  "negative_prompt": "worst quality, low quality, normal quality, blurry, deformed limbs, bad anatomy, bad hands, missing fingers, extra fingers, watermark, signature",
  "natural_prompt": "Rich 3-4 sentence descriptive prompt...",
  "style_tags": ["style1", "style2", "style3", "style4", "style5"],
  "recommended_model": "Illustrious-XL / Pony Diffusion V6 XL",
  "recommended_sampler": "Euler a",
  "recommended_steps": 28,
  "recommended_cfg": 7.0,
  "suggested_loras": [
    {"name": "suggested_lora_concept", "weight": 0.8}
  ]
}`

	cleanProvider := strings.ToLower(strings.TrimSpace(provider))
	cleanEndpoint := strings.TrimRight(strings.TrimSpace(endpoint), "/")
	cleanModel := strings.TrimSpace(model)

	var reqUrl string
	var payloadBytes []byte
	var isOllama bool

	if cleanProvider == "lmstudio" || cleanProvider == "openai_compatible" || cleanProvider == "openai" {
		if cleanEndpoint == "" {
			cleanEndpoint = "http://localhost:1234/v1"
		}
		if !strings.HasSuffix(cleanEndpoint, "/v1") && !strings.Contains(cleanEndpoint, "/chat/completions") {
			cleanEndpoint = cleanEndpoint + "/v1"
		}
		reqUrl = cleanEndpoint + "/chat/completions"
		if cleanModel == "" {
			cleanModel = "local-model"
		}

		payload := map[string]interface{}{
			"model": cleanModel,
			"messages": []map[string]interface{}{
				{
					"role": "user",
					"content": []map[string]interface{}{
						{
							"type": "text",
							"text": systemInstruction,
						},
						{
							"type": "image_url",
							"image_url": map[string]string{
								"url": fmt.Sprintf("data:%s;base64,%s", mimeType, b64Data),
							},
						},
					},
				},
			},
			"temperature": 0.45,
			"max_tokens":  2048,
			"top_p":       0.9,
		}
		var err error
		payloadBytes, err = json.Marshal(payload)
		if err != nil {
			return nil, err
		}
	} else {
		// Default to Ollama
		isOllama = true
		if cleanEndpoint == "" {
			cleanEndpoint = "http://localhost:11434"
		}
		reqUrl = cleanEndpoint + "/api/generate"
		if cleanModel == "" {
			cleanModel = "llama3.2-vision"
		}

		payload := map[string]interface{}{
			"model":  cleanModel,
			"prompt": systemInstruction,
			"images": []string{b64Data},
			"stream": false,
			"format": "json",
			"options": map[string]interface{}{
				"temperature": 0.45,
				"num_predict": 2048,
				"top_p":       0.9,
			},
		}
		var err error
		payloadBytes, err = json.Marshal(payload)
		if err != nil {
			return nil, err
		}
	}

	req, err := http.NewRequest("POST", reqUrl, bytes.NewReader(payloadBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create request to local AI: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	// Local vision models can take time to process, allow 3 minute timeout
	localClient := &http.Client{Timeout: 3 * time.Minute}
	resp, err := localClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("gagal terhubung ke Local AI (%s): pastikan server (%s) sudah aktif. Error: %w", cleanProvider, reqUrl, err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response from local AI: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		var errObj struct {
			Error interface{} `json:"error"`
		}
		if err := json.Unmarshal(respBody, &errObj); err == nil && errObj.Error != nil {
			if errMap, ok := errObj.Error.(map[string]interface{}); ok {
				if msg, exists := errMap["message"]; exists && msg != nil {
					return nil, fmt.Errorf("Local AI (%s) Error: %v", cleanProvider, msg)
				}
			}
			if errStr, ok := errObj.Error.(string); ok && errStr != "" {
				return nil, fmt.Errorf("Local AI (%s) Error: %s", cleanProvider, errStr)
			}
		}
		return nil, fmt.Errorf("Local AI (%s) HTTP %d: %s", cleanProvider, resp.StatusCode, string(respBody))
	}

	var rawOutput string
	if isOllama {
		var ollamaResp struct {
			Response string `json:"response"`
		}
		if err := json.Unmarshal(respBody, &ollamaResp); err != nil {
			return nil, fmt.Errorf("failed to parse Ollama response: %w", err)
		}
		rawOutput = ollamaResp.Response
	} else {
		var openAiResp struct {
			Choices []struct {
				Message struct {
					Content string `json:"content"`
				} `json:"message"`
			} `json:"choices"`
		}
		if err := json.Unmarshal(respBody, &openAiResp); err != nil {
			return nil, fmt.Errorf("failed to parse OpenAI-compatible response: %w", err)
		}
		if len(openAiResp.Choices) == 0 {
			return nil, errors.New("Local AI returned empty choices")
		}
		rawOutput = openAiResp.Choices[0].Message.Content
	}

	// Clean JSON markdown fences
	cleanText := strings.TrimSpace(rawOutput)
	cleanText = strings.TrimPrefix(cleanText, "```json")
	cleanText = strings.TrimPrefix(cleanText, "```")
	cleanText = strings.TrimSuffix(cleanText, "```")
	cleanText = strings.TrimSpace(cleanText)

	// If there is text before the first '{', find the first '{' and last '}'
	if startIdx := strings.Index(cleanText, "{"); startIdx != -1 {
		if endIdx := strings.LastIndex(cleanText, "}"); endIdx != -1 && endIdx > startIdx {
			cleanText = cleanText[startIdx : endIdx+1]
		}
	}

	var result InterrogateResult
	if err := json.Unmarshal([]byte(cleanText), &result); err != nil {
		return nil, fmt.Errorf("failed to parse JSON from Local AI: %w (raw output: %s)", err, rawOutput)
	}

	// Defaults if missing
	if result.RecommendedSampler == "" {
		result.RecommendedSampler = "Euler a"
	}
	if result.RecommendedSteps == 0 {
		result.RecommendedSteps = 28
	}
	if result.RecommendedCFG == 0 {
		result.RecommendedCFG = 7.0
	}
	if result.RecommendedModel == "" {
		result.RecommendedModel = "Illustrious-XL / Pony V6"
	}
	if result.NegativePrompt == "" {
		result.NegativePrompt = "worst quality, low quality, normal quality, blurry, deformed limbs, bad anatomy, bad hands, missing fingers, extra fingers, watermark, signature"
	}
	result.UsedModel = fmt.Sprintf("Local (%s: %s)", strings.ToUpper(cleanProvider), cleanModel)

	return &result, nil
}

// FetchLocalModels queries an Ollama or LM Studio/OpenAI local endpoint for available models
func (s *InterrogateService) FetchLocalModels(provider, endpoint string) ([]map[string]string, error) {
	cleanProvider := strings.ToLower(strings.TrimSpace(provider))
	isOllama := cleanProvider == "ollama"

	cleanEndpoint := strings.TrimRight(strings.TrimSpace(endpoint), "/")
	if cleanEndpoint == "" {
		if isOllama {
			cleanEndpoint = "http://localhost:11434"
		} else {
			cleanEndpoint = "http://127.0.0.1:1234/v1"
		}
	}

	var reqUrl string
	if isOllama {
		reqUrl = cleanEndpoint + "/api/tags"
	} else {
		if !strings.HasSuffix(cleanEndpoint, "/v1") {
			cleanEndpoint += "/v1"
		}
		reqUrl = cleanEndpoint + "/models"
	}

	req, err := http.NewRequest("GET", reqUrl, nil)
	if err != nil {
		return nil, err
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("gagal terhubung ke %s: %w", reqUrl, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("endpoint HTTP %d: %s", resp.StatusCode, string(body))
	}

	var models []map[string]string
	if isOllama {
		var data struct {
			Models []struct {
				Name string `json:"name"`
			} `json:"models"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
			return nil, err
		}
		for _, m := range data.Models {
			models = append(models, map[string]string{
				"id":   m.Name,
				"name": m.Name,
			})
		}
	} else {
		var data struct {
			Data []struct {
				ID string `json:"id"`
			} `json:"data"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
			return nil, err
		}
		for _, m := range data.Data {
			models = append(models, map[string]string{
				"id":   m.ID,
				"name": m.ID,
			})
		}
	}

	return models, nil
}
