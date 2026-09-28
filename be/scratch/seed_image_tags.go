package main

import (
	"fmt"
	"log"

	"github.com/alazriel6/models-guide/backend/internal/config"
	"github.com/alazriel6/models-guide/backend/internal/database"
	"github.com/alazriel6/models-guide/backend/internal/repositories"
)

func main() {
	cfg := config.Load()
	db := database.Connect(cfg)

	tagRepo := repositories.NewTagRepository(db)
	imageRepo := repositories.NewImageRepository(db)

	images, _, err := imageRepo.FindAll(repositories.ImageFilter{Limit: 20})
	if err != nil {
		log.Fatalf("FindAll: %v", err)
	}

	tagMap := map[uint][]string{
		8: {"1girl", "kitsune", "fox-girl", "kimono", "red-eyes", "cherry-blossom"},
		7: {"1girl", "blonde-hair", "purple-eyes", "street-style", "anime"},
	}

	for _, img := range images {
		tagsToSet, exists := tagMap[img.ID]
		if !exists {
			tagsToSet = []string{"anime", "digital-art", "ai-art"}
		}

		tags, err := tagRepo.FindOrCreateByNames(tagsToSet)
		if err != nil {
			log.Printf("FindOrCreateByNames error for img %d: %v", img.ID, err)
			continue
		}

		if err := tagRepo.SetImageTags(img.ID, tags); err != nil {
			log.Printf("SetImageTags error for img %d: %v", img.ID, err)
			continue
		}
		fmt.Printf("Successfully tagged image #%d (%s) with %v\n", img.ID, img.Caption, tagsToSet)
	}

	fmt.Println("Done seeding image tags!")
}
