# AI Models Guide & Generative Diffusion Workstation

A comprehensive parameter workstation, model catalog, and generative engineering suite designed for Stable Diffusion, Illustrious XL, NoobAI, Pony Diffusion, SDXL, and Flux.1 ecosystems.

The project combines an editorial model catalog with client-side utility tools for prompt architecture, LoRA weight aggregation, interactive OpenPose skeleton rigging, ComfyUI workflow management, and hardware VRAM profiling.

---

## Architecture Overview

The system is built as a modular full-stack application supporting two execution environments:

1. **Full-Stack Mode**: Go REST API powered by Gin, GORM, and PostgreSQL, providing persistent storage for model checkpoints, LoRA weights, showcase galleries, user poses, and custom prompt presets.
2. **Hybrid Standalone Mode (Frontend-Only)**: The Vite/React application contains self-healing fallback datasets. When deployed without a backend instance (e.g., on Vercel, Netlify, or GitHub Pages), all tools, catalog exploration, parameter comparison, and canvas engines remain fully functional offline.

```
                          +-------------------------------------------------+
                          |               Client Browser (SPA)              |
                          |      React 19 + TypeScript + Vite + Canvas      |
                          +------------------------+------------------------+
                                                   |
                        +--------------------------+--------------------------+
                        |                                                     |
             [Backend Available]                                     [Backend Offline / Demo]
                        |                                                     |
                        v                                                     v
          +---------------------------+                         +---------------------------+
          |      Go Gin REST API      |                         | Built-in Fallback Dataset |
          |   (Controllers, Services) |                         | (12 Models, 24 Images,    |
          +-------------+-------------+                         | 120+ OpenPose Skeletons)  |
                        |                                       +---------------------------+
                        v
          +---------------------------+
          |    PostgreSQL Database    |
          |  (Models, Poses, Presets) |
          +---------------------------+
```

---

## Core Capabilities & Workstation Modules

### 1. Model Catalog & Comparison Matrix
- **Registered Model Registry**: Detailed parameter guidelines for checkpoint architectures (Illustrious XL, NoobAI EPS/V-pred, SDXL 1.0, Pony Diffusion V6, SD 1.5, and Flux.1).
- **Multi-Slot Comparison Matrix**: Side-by-side inspection of up to 3 models simultaneously, analyzing native resolutions, recommended samplers, CFG ranges, CLIP skip levels, and trigger words.
- **Virtualized Catalog View**: Smooth rendering across high-volume card sets using `@tanstack/react-virtual`.

### 2. OpenPose & ControlNet Rig Studio
- **Interactive Skeleton Rigging**: 18-joint COCO-compliant human armature editor rendered on HTML5 Canvas with real-time limb rotation, joint translation, and multi-pose duo support.
- **Canvas Rendering & Export**: Real-time rendering with limb color coding, dark/colored canvas preview, and 1-click PNG export ready for direct injection into WebUI, Forge, or ComfyUI ControlNet nodes.
- **Preprocessor Reference Guide**: Technical cheat-sheets with extraction threshold recommendations for Canny edge, DepthAnything V2, Normalbae, and LineArt.
- **ControlNet Model Matrix**: Architecture compatibility matrix with verified Hugging Face download repositories and recommended attention weights.

### 3. LoRA Stack Builder & Burnout Guard
- **Weight Aggregator**: Combine multiple LoRA weights in a single stack with dynamic cumulative weight calculations.
- **Over-Baking / Burnout Guard**: Real-time warning indicators when combined tensor weights exceed safe thresholds (preventing artifact burn and contrast saturation).
- **Multi-Syntax Exporter**: Instant export to Automatic1111 / Forge `<lora:filename:weight>` syntax, ComfyUI `CR LoRA Stack` format, and raw JSON configurations.

### 4. Lossless Metadata Inspector
- **Image Header Chunk Parser**: Extracts generation metadata (`tEXt` / `iTXt` PNG chunks) directly in the browser without uploading raw files to external servers.
- **Format Normalizer**: Automatically decodes and parses generation parameters from Automatic1111, SD-Forge, NovelAI, and ComfyUI workflow execution graphs.
- **Workflow Bridge**: 1-click transfer of parsed parameters into the Prompt Lab, LoRA Stack, or Resolution Calculator.

### 5. Prompt Matrix & Danbooru Tag Studio
- **Structured Semantic Composition**: Organized input modules for subject, medium, lighting, camera angle, and style modifiers.
- **Taxonomy Tag Explorer**: Curated Danbooru character, costume, and aesthetic tags with auto-formatting and weight scaling `(tag:1.2)`.
- **Negative Vault**: Architecture-specific negative prompt formulas (e.g., score suppression tokens for Pony/NoobAI) and negative embedding syntax.

### 6. Hardware VRAM & Resolution Profiler
- **Memory Allocation Estimator**: Estimates dedicated GPU memory consumption across base model parameters, context lengths, batch sizes, and VAE tiling.
- **Latent Dimension Calculator**: Calculates optimal aspect ratios with automatic 64/8-pixel latent grid snapping to prevent dimensional padding errors.

---

## Technology Stack

### Frontend
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 8
- **Routing**: React Router v7 (SPA with client-side history API)
- **Virtualization**: `@tanstack/react-virtual`
- **Styling**: Vanilla CSS3 (Custom Dark Cyberpunk / Editorial design system, hardware-accelerated transforms)

### Backend
- **Language**: Go 1.26+
- **HTTP Engine**: Gin Web Framework
- **ORM**: GORM (Object Relational Mapping)
- **Database**: PostgreSQL 14+ (with JSONB support)
- **Database Migrations**: `golang-migrate`

---

## Project Structure

```
.
├── be/                         # Go Gin REST API
│   ├── cmd/
│   │   └── server/             # Application entrypoint & dependency wiring
│   ├── internal/
│   │   ├── config/             # Environment configuration parser
│   │   ├── database/           # Connection pooling, migrations & seed scripts
│   │   ├── handlers/           # HTTP controllers
│   │   ├── middleware/         # CORS, rate limiting & auth validation
│   │   ├── models/             # GORM entity definitions
│   │   ├── repositories/       # Database query abstraction
│   │   ├── routes/             # Route group definitions
│   │   └── services/           # Business domain logic
│   ├── migrations/             # Versioned SQL migrations (.up.sql / .down.sql)
│   ├── storage/                # Local filesystem asset storage
│   ├── go.mod
│   └── go.sum
│
├── fe/                         # React TypeScript Frontend
│   ├── public/                 # Static assets & icons
│   ├── src/
│   │   ├── api/                # API client adapters with offline fallback logic
│   │   ├── components/         # Reusable UI components & workstation pages
│   │   │   ├── common/         # Modals, status banners, virtualized cards
│   │   │   ├── controlnet/     # OpenPose canvas & preprocessor labs
│   │   │   ├── landing/        # Interactive showcase & feature storytelling
│   │   │   └── pages/          # Catalog, Gallery, PromptLab, LoRAStack, etc.
│   │   ├── data/               # Curated fallback models, gallery, and pose datasets
│   │   ├── style/              # Modular component stylesheets
│   │   ├── utils/              # Metadata extraction, math calculation & export tools
│   │   ├── App.tsx             # Route definitions & global layout
│   │   └── main.tsx            # Application bootstrapping
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── vercel.json                 # Vercel deployment rewrites & cache rules
└── README.md
```

---

## Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **pnpm**
- *(Optional for Backend)*: **Go** v1.22+ and **PostgreSQL** v14+

---

### Frontend Setup (Standalone Mode)

To run the frontend workstation locally with the built-in verified dataset:

```bash
# 1. Navigate to the frontend directory
cd fe

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

To generate a production bundle:
```bash
npm run build
```

---

### Backend Setup (Full-Stack Mode)

If you wish to run the Go API and connect a local PostgreSQL database:

```bash
# 1. Navigate to the backend directory
cd be

# 2. Copy the sample environment file
cp .env.example .env

# 3. Configure your database credentials in .env
# DB_HOST=localhost
# DB_PORT=5432
# DB_USER=postgres
# DB_PASSWORD=your_password
# DB_NAME=models_guide

# 4. Download Go dependencies
go mod download

# 5. Run database migrations & start the server
go run cmd/server/main.go
```

The REST API will listen on `http://localhost:8080/api`.

---

## Configuration Reference

### Frontend Environment Variables (`fe/.env`)

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `http://localhost:8080/api` | Base URL for the Go REST API. When unreachable, the app automatically switches to Standalone FE mode. |
| `VITE_BACKEND_URL` | `http://localhost:8080` | Base URL for backend uploaded media storage. |

### Backend Environment Variables (`be/.env`)

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `8080` | Port for the HTTP API server. |
| `DB_HOST` | `localhost` | PostgreSQL host address. |
| `DB_PORT` | `5432` | PostgreSQL port. |
| `DB_USER` | `postgres` | Database username. |
| `DB_PASSWORD` | `postgres` | Database password. |
| `DB_NAME` | `models_guide` | Database name. |
| `ADMIN_KEY` | `admin123` | Secret authentication key for administrative actions. |

---

## Deployment

### Vercel Deployment (Frontend / Live Demo)
This repository includes pre-configured routing rules in `vercel.json` for client-side Single Page Application (SPA) routing:

1. Import the repository into your Vercel Dashboard.
2. Set **Root Directory** to `fe`.
3. Set **Framework Preset** to `Vite`.
4. Click **Deploy**.

The frontend will run out of the box in **Standalone Mode** using its verified local datasets. If you later deploy the Go backend, simply set the `VITE_API_URL` environment variable in your Vercel project settings to enable live database persistence.

---

## License

This project is open-source software provided under the [MIT License](LICENSE).

