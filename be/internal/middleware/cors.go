package middleware

import (
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func CORS(allowedOrigins string) gin.HandlerFunc {
	var origins []string
	if allowedOrigins == "" || allowedOrigins == "*" {
		origins = []string{"*"}
	} else {
		for _, o := range strings.Split(allowedOrigins, ",") {
			trimmed := strings.TrimSpace(o)
			if trimmed != "" {
				origins = append(origins, trimmed)
			}
		}
	}

	config := cors.Config{
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}

	if len(origins) == 1 && origins[0] == "*" {
		config.AllowAllOrigins = true
		config.AllowCredentials = false // cannot use AllowCredentials with AllowAllOrigins in standard CORS
	} else {
		config.AllowOrigins = origins
	}

	return cors.New(config)
}
