package services

import (
	"testing"
)

func TestGenerateSlug(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"rinFlanime", "rinflanime"},
		{"SDXL Lightning v1.0", "sdxl-lightning-v1-0"},
		{"  Hello World!  ", "hello-world"},
		{"Anime---Style---LoRA", "anime-style-lora"},
		{"Checkpoint #1 (Realistic)", "checkpoint-1-realistic"},
		{"", ""},
	}

	for _, tt := range tests {
		result := GenerateSlug(tt.input)
		if result != tt.expected {
			t.Errorf("GenerateSlug(%q) = %q; want %q", tt.input, result, tt.expected)
		}
	}
}
