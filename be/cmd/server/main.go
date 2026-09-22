package main

import (
	"flag"
	"log"

	"github.com/alazriel6/models-guide/backend/internal/config"
	"github.com/alazriel6/models-guide/backend/internal/database"
	"github.com/alazriel6/models-guide/backend/internal/handlers"
	"github.com/alazriel6/models-guide/backend/internal/middleware"
	"github.com/alazriel6/models-guide/backend/internal/repositories"
	"github.com/alazriel6/models-guide/backend/internal/routes"
	"github.com/alazriel6/models-guide/backend/internal/services"
	"github.com/gin-gonic/gin"
)

func main() {
	seedFlag := flag.Bool("seed", false, "Seed database with initial sample data")
	flag.Parse()

	cfg := config.Load()

	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	db := database.Connect(cfg)

	if *seedFlag {
		if err := database.Seed(db); err != nil {
			log.Printf("Warning: failed to seed database: %v\n", err)
		}
	}

	// Repositories
	modelRepo := repositories.NewModelRepository(db)
	versionRepo := repositories.NewVersionRepository(db)
	tagRepo := repositories.NewTagRepository(db)
	imageRepo := repositories.NewImageRepository(db)
	resourceRepo := repositories.NewResourceRepository(db)

	// Services
	modelService := services.NewModelService(modelRepo)
	versionService := services.NewVersionService(versionRepo, modelRepo)
	tagService := services.NewTagService(tagRepo, modelRepo)
	resourceService := services.NewResourceService(resourceRepo)
	imageService := services.NewImageService(imageRepo, modelRepo, resourceRepo, cfg.StoragePath)

	// Handlers
	h := routes.RouteHandlers{
		ModelHandler:    handlers.NewModelHandler(modelService),
		VersionHandler:  handlers.NewVersionHandler(versionService),
		TagHandler:      handlers.NewTagHandler(tagService),
		ImageHandler:    handlers.NewImageHandler(imageService),
		ResourceHandler: handlers.NewResourceHandler(resourceService),
	}

	router := gin.Default()
	router.Use(middleware.CORS(cfg.CORSOrigin))

	routes.Setup(router, h, cfg.StoragePath)

	log.Println("Server running on http://localhost:" + cfg.AppPort)
	if err := router.Run(":" + cfg.AppPort); err != nil {
		log.Fatal(err)
	}
}
