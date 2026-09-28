package config

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv  string
	AppPort string

	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string

	StoragePath string
	CORSOrigin  string
}

func Load() Config {
	_ = godotenv.Load()

	storagePath := getEnv("STORAGE_PATH", "./storage/images")
	if !filepath.IsAbs(storagePath) {
		// If running from root directory, check be/storage/images
		if _, err := os.Stat(storagePath); os.IsNotExist(err) {
			if _, err2 := os.Stat(filepath.Join("be", storagePath)); err2 == nil {
				storagePath = filepath.Join("be", storagePath)
			}
		}
		if abs, err := filepath.Abs(storagePath); err == nil {
			storagePath = abs
		}
	}
	_ = os.MkdirAll(storagePath, 0755)

	return Config{
		AppEnv:  getEnv("APP_ENV", "development"),
		AppPort: getEnv("APP_PORT", "8080"),

		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", ""),
		DBName:     getEnv("DB_NAME", "models_guide"),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),

		StoragePath: storagePath,
		CORSOrigin:  getEnv("CORS_ORIGIN", "http://localhost:5173"),
	}
}

// DatabaseURL returns the DSN string for golang-migrate.
func (c Config) DatabaseURL() string {
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=%s",
		c.DBUser,
		c.DBPassword,
		c.DBHost,
		c.DBPort,
		c.DBName,
		c.DBSSLMode,
	)
}

// DSN returns the GORM-compatible DSN string.
func (c Config) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.DBHost,
		c.DBPort,
		c.DBUser,
		c.DBPassword,
		c.DBName,
		c.DBSSLMode,
	)
}

func getEnv(key string, fallback string) string {
	value := os.Getenv(key)

	if value == "" {
		return fallback
	}

	return value
}
