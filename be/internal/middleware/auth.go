package middleware

import (
	"crypto/subtle"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// RequireAdminAuth checks for Authorization: Bearer <ADMIN_SECRET_KEY> or X-Admin-Key header.
func RequireAdminAuth(adminSecretKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		expectedKey := strings.TrimSpace(adminSecretKey)
		if expectedKey == "" {
			expectedKey = "admin123"
		}

		authHeader := c.GetHeader("Authorization")
		token := ""
		if strings.HasPrefix(authHeader, "Bearer ") {
			token = strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
		} else if customKey := c.GetHeader("X-Admin-Key"); customKey != "" {
			token = strings.TrimSpace(customKey)
		}

		if token == "" || subtle.ConstantTimeCompare([]byte(token), []byte(expectedKey)) != 1 {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Unauthorized: Invalid or missing admin credentials",
			})
			return
		}

		c.Next()
	}
}
