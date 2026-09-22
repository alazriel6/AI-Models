# Models Guide — Backend API

Backend REST API for **Models Guide**, an application for cataloging AI image-generation models (checkpoints, LoRAs, VAEs, embeddings) inspired by Civitai.

## Tech Stack
- **Language**: Go 1.26+
- **HTTP Framework**: Gin
- **ORM**: GORM
- **Database**: PostgreSQL (with JSONB support)
- **Migrations**: golang-migrate
- **Storage**: Local filesystem (`storage/images/`)

---

## Directory Structure

```
be/
├── cmd/
│   └── server/
│       └── main.go          # Application entrypoint & dependency injection
├── internal/
│   ├── config/              # Environment config loader
│   ├── database/            # Database connection & seed script
│   ├── handlers/            # HTTP handlers
│   ├── middleware/          # CORS & custom middlewares
│   ├── models/              # GORM database models
│   ├── repositories/        # Database access layer
│   ├── routes/              # Route registration & static file serving
│   └── services/            # Business logic layer
├── migrations/              # SQL migration files (.up.sql / .down.sql)
├── storage/
│   └── images/              # Uploaded model showcase images
├── .env.example
├── go.mod
└── go.sum
```

---

## Getting Started

### 1. Prerequisites
- Go 1.22+ installed
- PostgreSQL 14+ installed and running
- `golang-migrate` CLI installed (optional, or run migrations directly via psql)

### 2. Configure Environment
Copy `.env.example` to `.env` and fill in your PostgreSQL credentials:

```bash
cp .env.example .env
```

### 3. Run Database Migrations

Using `golang-migrate`:
```bash
migrate -path migrations -database "postgres://postgres:postgres@localhost:5432/models_guide?sslmode=disable" up
```

Or using `psql`:
```bash
psql -U postgres -d models_guide -f migrations/000001_create_models.up.sql
psql -U postgres -d models_guide -f migrations/000002_create_model_versions.up.sql
psql -U postgres -d models_guide -f migrations/000003_create_tags.up.sql
psql -U postgres -d models_guide -f migrations/000004_create_model_tags.up.sql
psql -U postgres -d models_guide -f migrations/000005_create_model_images.up.sql
psql -U postgres -d models_guide -f migrations/000006_create_resources.up.sql
psql -U postgres -d models_guide -f migrations/000007_create_image_resources.up.sql
```

### 4. Run the Server

```bash
# Normal start
go run ./cmd/server

# Start with initial seed data
go run ./cmd/server --seed
```

The server runs by default on `http://localhost:8080`.

---

## API Reference

### Health Check
- `GET /health` — Check server status

### Models
- `GET /api/models` — List models (Query params: `page`, `limit`, `search`, `type`, `base_model`)
- `POST /api/models` — Create a new model
- `GET /api/models/:id` — Get model by ID (includes versions, tags, and images)
- `PUT /api/models/:id` — Update model details
- `DELETE /api/models/:id` — Delete model and cascade related records

### Model Versions
- `GET /api/models/:id/versions` — List versions for a model
- `POST /api/models/:id/versions` — Create a new version for a model
- `GET /api/versions/:id` — Get version by ID
- `PUT /api/versions/:id` — Update version
- `DELETE /api/versions/:id` — Delete version

### Tags
- `GET /api/tags` — List all tags
- `POST /api/tags` — Create a new tag
- `POST /api/models/:id/tags/:tagID` — Attach tag to a model
- `DELETE /api/models/:id/tags/:tagID` — Detach tag from a model

### Images & Metadata
- `GET /api/models/:id/images` — List images for a model
- `POST /api/models/:id/images` — Upload image (`multipart/form-data`) with generation metadata
- `GET /api/images/:id` — Get image details and linked resources
- `PUT /api/images/:id` — Update image metadata
- `DELETE /api/images/:id` — Delete image record and disk file
- `POST /api/images/:id/resources/:resourceID` — Link resource to image (e.g., LoRA with weight)
- `DELETE /api/images/:id/resources/:resourceID` — Unlink resource from image

### Resources
- `GET /api/resources` — List resources (Query params: `type`)
- `POST /api/resources` — Create resource
- `GET /api/resources/:id` — Get resource by ID
- `PUT /api/resources/:id` — Update resource
- `DELETE /api/resources/:id` — Delete resource

---

## Static Assets
Uploaded images are accessible at:
```
http://localhost:8080/storage/images/<filename>
```
