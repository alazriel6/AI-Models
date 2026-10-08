package services

import (
	"fmt"
	"image"
	"image/jpeg"
	_ "image/png"
	"os"
	"path/filepath"
	"strings"

	"golang.org/x/image/draw"
	_ "golang.org/x/image/webp"
)

type ThumbnailService struct {
	storagePath string
	thumbsDir   string
}

func NewThumbnailService(storagePath string) *ThumbnailService {
	thumbsDir := filepath.Join(storagePath, "thumbs")
	_ = os.MkdirAll(thumbsDir, 0755)
	return &ThumbnailService{
		storagePath: storagePath,
		thumbsDir:   thumbsDir,
	}
}

// GetOrCreateThumbnail retrieves or generates a compressed thumbnail for a given filename.
// Default max dimension is 480px width/height.
func (s *ThumbnailService) GetOrCreateThumbnail(filename string, maxDim int) (string, error) {
	if maxDim <= 0 {
		maxDim = 480
	}

	cleanName := filepath.Base(filename)
	ext := filepath.Ext(cleanName)
	base := strings.TrimSuffix(cleanName, ext)
	thumbFileName := fmt.Sprintf("%s_%d.jpg", base, maxDim)
	thumbPath := filepath.Join(s.thumbsDir, thumbFileName)

	// If already cached, return immediately
	if fi, err := os.Stat(thumbPath); err == nil && fi.Size() > 0 {
		return thumbPath, nil
	}

	// Original image path
	origPath := filepath.Join(s.storagePath, cleanName)
	if _, err := os.Stat(origPath); os.IsNotExist(err) {
		return "", fmt.Errorf("original image not found: %s", cleanName)
	}

	// Open original image
	file, err := os.Open(origPath)
	if err != nil {
		return "", fmt.Errorf("failed to open source image: %w", err)
	}
	defer file.Close()

	src, _, err := image.Decode(file)
	if err != nil {
		return "", fmt.Errorf("failed to decode source image: %w", err)
	}

	bounds := src.Bounds()
	srcW := bounds.Dx()
	srcH := bounds.Dy()

	if srcW <= 0 || srcH <= 0 {
		return "", fmt.Errorf("invalid image dimensions")
	}

	// Calculate aspect ratio preserving target dimensions
	var targetW, targetH int
	if srcW > srcH {
		targetW = maxDim
		targetH = int(float64(srcH) * float64(maxDim) / float64(srcW))
	} else {
		targetH = maxDim
		targetW = int(float64(srcW) * float64(maxDim) / float64(srcH))
	}

	if targetW < 1 {
		targetW = 1
	}
	if targetH < 1 {
		targetH = 1
	}

	// High quality Bilinear downscaling
	dst := image.NewRGBA(image.Rect(0, 0, targetW, targetH))
	draw.BiLinear.Scale(dst, dst.Bounds(), src, bounds, draw.Over, nil)

	// Save compressed JPEG thumbnail (80% quality, compact ~30-50KB)
	tmpThumb := thumbPath + ".tmp"
	out, err := os.Create(tmpThumb)
	if err != nil {
		return "", fmt.Errorf("failed to create thumbnail file: %w", err)
	}

	if err := jpeg.Encode(out, dst, &jpeg.Options{Quality: 80}); err != nil {
		out.Close()
		_ = os.Remove(tmpThumb)
		return "", fmt.Errorf("failed to encode thumbnail: %w", err)
	}
	out.Close()

	if err := os.Rename(tmpThumb, thumbPath); err != nil {
		return "", fmt.Errorf("failed to finalize thumbnail file: %w", err)
	}

	return thumbPath, nil
}
