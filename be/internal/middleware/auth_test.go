package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRequireAdminAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name          string
		secret        string
		authHeader    string
		customHeader  string
		expectedCode  int
	}{
		{
			name:         "Valid Bearer token",
			secret:       "secret123",
			authHeader:   "Bearer secret123",
			expectedCode: http.StatusOK,
		},
		{
			name:         "Valid custom X-Admin-Key",
			secret:       "secret123",
			customHeader: "secret123",
			expectedCode: http.StatusOK,
		},
		{
			name:         "Missing token",
			secret:       "secret123",
			expectedCode: http.StatusUnauthorized,
		},
		{
			name:         "Invalid Bearer token",
			secret:       "secret123",
			authHeader:   "Bearer wrongkey",
			expectedCode: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := gin.New()
			router.Use(RequireAdminAuth(tt.secret))
			router.POST("/protected", func(c *gin.Context) {
				c.String(http.StatusOK, "success")
			})

			w := httptest.NewRecorder()
			req, _ := http.NewRequest(http.MethodPost, "/protected", nil)
			if tt.authHeader != "" {
				req.Header.Set("Authorization", tt.authHeader)
			}
			if tt.customHeader != "" {
				req.Header.Set("X-Admin-Key", tt.customHeader)
			}

			router.ServeHTTP(w, req)
			if w.Code != tt.expectedCode {
				t.Fatalf("expected code %d, got %d", tt.expectedCode, w.Code)
			}
		})
	}
}
