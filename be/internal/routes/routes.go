package routes

import (
	"net/http"

	"github.com/alazriel6/models-guide/backend/internal/handlers"
	"github.com/alazriel6/models-guide/backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

type RouteHandlers struct {
	ModelHandler    *handlers.ModelHandler
	VersionHandler  *handlers.VersionHandler
	TagHandler      *handlers.TagHandler
	ImageHandler    *handlers.ImageHandler
	ResourceHandler *handlers.ResourceHandler
}

func Setup(router *gin.Engine, h RouteHandlers, storagePath string, adminSecretKey string) {
	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"service": "models-guide-backend",
		})
	})

	// Serve static images from storage directory
	router.Static("/storage/images", storagePath)

	adminAuth := middleware.RequireAdminAuth(adminSecretKey)

	api := router.Group("/api")
	{
		// Models
		models := api.Group("/models")
		{
			models.GET("", h.ModelHandler.GetModels)
			models.POST("", adminAuth, h.ModelHandler.CreateModel)
			models.GET("/:id", h.ModelHandler.GetModel)
			models.PUT("/:id", adminAuth, h.ModelHandler.UpdateModel)
			models.DELETE("/:id", adminAuth, h.ModelHandler.DeleteModel)

			// Model Versions nested endpoints
			models.GET("/:id/versions", h.VersionHandler.GetVersions)
			models.POST("/:id/versions", adminAuth, h.VersionHandler.CreateVersion)

			// Model Tags nested endpoints
			models.POST("/:id/tags/:tagID", adminAuth, h.TagHandler.AttachTag)
			models.DELETE("/:id/tags/:tagID", adminAuth, h.TagHandler.DetachTag)

			// Model Images nested endpoints
			models.GET("/:id/images", h.ImageHandler.GetImages)
			models.POST("/:id/images", adminAuth, h.ImageHandler.UploadImage)
			models.PUT("/:id/thumbnail/:imageId", adminAuth, h.ImageHandler.SetAsThumbnail)
		}

		// Standalone Versions
		versions := api.Group("/versions")
		{
			versions.GET("/:id", h.VersionHandler.GetVersion)
			versions.PUT("/:id", adminAuth, h.VersionHandler.UpdateVersion)
			versions.DELETE("/:id", adminAuth, h.VersionHandler.DeleteVersion)
		}

		// Standalone Tags
		tags := api.Group("/tags")
		{
			tags.GET("", h.TagHandler.GetTags)
			tags.POST("", adminAuth, h.TagHandler.CreateTag)
		}

		// Standalone Images
		images := api.Group("/images")
		{
			images.GET("", h.ImageHandler.GetAllImages)
			images.POST("", adminAuth, h.ImageHandler.UploadGalleryImage)
			images.POST("/parse-metadata", h.ImageHandler.ParseMetadata)
			images.GET("/:id", h.ImageHandler.GetImage)
			images.PUT("/:id", adminAuth, h.ImageHandler.UpdateImage)
			images.DELETE("/:id", adminAuth, h.ImageHandler.DeleteImage)

			// Image-Resource associations
			images.POST("/:id/resources/:resourceID", adminAuth, h.ImageHandler.AttachResource)
			images.DELETE("/:id/resources/:resourceID", adminAuth, h.ImageHandler.DetachResource)
		}

		// Standalone Resources
		resources := api.Group("/resources")
		{
			resources.GET("", h.ResourceHandler.GetResources)
			resources.POST("", adminAuth, h.ResourceHandler.CreateResource)
			resources.GET("/:id", h.ResourceHandler.GetResource)
			resources.PUT("/:id", adminAuth, h.ResourceHandler.UpdateResource)
			resources.DELETE("/:id", adminAuth, h.ResourceHandler.DeleteResource)
		}
	}
}
