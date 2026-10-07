package handlers

import (
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/alazriel6/models-guide/backend/internal/services"
	"github.com/gin-gonic/gin"
)

type BackupHandler struct {
	service *services.BackupService
}

func NewBackupHandler(service *services.BackupService) *BackupHandler {
	return &BackupHandler{service: service}
}

// ExportBackup generates a full database backup JSON dump
func (h *BackupHandler) ExportBackup(c *gin.Context) {
	backup, err := h.service.Export()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	filename := fmt.Sprintf("models_guide_backup_%s.json", time.Now().Format("2006-01-02_150405"))
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	c.Header("Content-Type", "application/json; charset=utf-8")

	c.JSON(http.StatusOK, backup)
}

// ImportBackup parses and restores database from backup JSON file or body
func (h *BackupHandler) ImportBackup(c *gin.Context) {
	mode := c.DefaultPostForm("mode", "merge")
	if m := c.Query("mode"); m != "" {
		mode = m
	}

	var backupData *services.DatabaseBackupData
	var err error

	// Check if JSON body
	if strings.Contains(c.ContentType(), "application/json") {
		var req services.DatabaseBackupData
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid backup JSON: " + err.Error()})
			return
		}
		backupData = &req
	} else {
		// Multipart Form Upload
		file, fileErr := c.FormFile("file")
		if fileErr != nil {
			file, fileErr = c.FormFile("backup")
		}
		if fileErr != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Backup file ('file' or 'backup') or JSON body is required"})
			return
		}

		f, err := file.Open()
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to open uploaded backup file: " + err.Error()})
			return
		}
		defer f.Close()

		content, err := io.ReadAll(f)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read uploaded backup file: " + err.Error()})
			return
		}

		backupData, err = services.ParseBackupJSON(content)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	result, err := h.service.Import(backupData, mode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Restore successful! Imported %d models, %d images, %d tags.", result.ModelsImported, result.ImagesImported, result.TagsImported),
		"result":  result,
	})
}
