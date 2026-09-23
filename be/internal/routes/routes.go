package routes

import (
	"net/http"

	"github.com/alazriel6/models-guide/backend/internal/handlers"
	"github.com/gin-gonic/gin"
)

type RouteHandlers struct {
	ModelHandler    *handlers.ModelHandler
	VersionHandler  *handlers.VersionHandler
	TagHandler      *handlers.TagHandler
	ImageHandler    *handlers.ImageHandler
	ResourceHandler *handlers.ResourceHandler
}

func Setup(router *gin.Engine, h RouteHandlers, storagePath string) {
	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"service": "models-guide-backend",
		})
	})

	// Serve static images
	router.Static("/storage/images", storagePath)

	api := router.Group("/api")
	{
		// Models
		models := api.Group("/models")
		{
			models.GET("", h.ModelHandler.GetModels)
			models.POST("", h.ModelHandler.CreateModel)
			models.GET("/:id", h.ModelHandler.GetModel)
			models.PUT("/:id", h.ModelHandler.UpdateModel)
			models.DELETE("/:id", h.ModelHandler.DeleteModel)

			// Model Versions nested endpoints
			models.GET("/:id/versions", h.VersionHandler.GetVersions)
			models.POST("/:id/versions", h.VersionHandler.CreateVersion)

			// Model Tags nested endpoints
			models.POST("/:id/tags/:tagID", h.TagHandler.AttachTag)
			models.DELETE("/:id/tags/:tagID", h.TagHandler.DetachTag)

			// Model Images nested endpoints
			models.GET("/:id/images", h.ImageHandler.GetImages)
			models.POST("/:id/images", h.ImageHandler.UploadImage)
			models.PUT("/:id/thumbnail/:imageId", h.ImageHandler.SetAsThumbnail)
		}

		// Standalone Versions
		versions := api.Group("/versions")
		{
			versions.GET("/:id", h.VersionHandler.GetVersion)
			versions.PUT("/:id", h.VersionHandler.UpdateVersion)
			versions.DELETE("/:id", h.VersionHandler.DeleteVersion)
		}

		// Standalone Tags
		tags := api.Group("/tags")
		{
			tags.GET("", h.TagHandler.GetTags)
			tags.POST("", h.TagHandler.CreateTag)
		}

		// Standalone Images
		images := api.Group("/images")
		{
			images.GET("/:id", h.ImageHandler.GetImage)
			images.PUT("/:id", h.ImageHandler.UpdateImage)
			images.DELETE("/:id", h.ImageHandler.DeleteImage)

			// Image-Resource associations
			images.POST("/:id/resources/:resourceID", h.ImageHandler.AttachResource)
			images.DELETE("/:id/resources/:resourceID", h.ImageHandler.DetachResource)
		}

		// Standalone Resources
		resources := api.Group("/resources")
		{
			resources.GET("", h.ResourceHandler.GetResources)
			resources.POST("", h.ResourceHandler.CreateResource)
			resources.GET("/:id", h.ResourceHandler.GetResource)
			resources.PUT("/:id", h.ResourceHandler.UpdateResource)
			resources.DELETE("/:id", h.ResourceHandler.DeleteResource)
		}
	}
}
