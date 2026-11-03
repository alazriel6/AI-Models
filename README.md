<div align="center">

<p>
  <strong>English</strong> · <a href="#">简体中文</a> · <a href="#">日本語</a> · <a href="#">Bahasa Indonesia</a>
</p>

# AI Models: Generative Diffusion Workstation

<p>
  <strong>A unified parameter workstation, model catalog, and generative engineering suite for modern diffusion models.</strong>
</p>

<p>
  Inspect model architectures, compare inference parameters, rig OpenPose skeletons, stack LoRA weights with burnout protection, and inspect image generation metadata.
</p>

<p>
  <img src="https://img.shields.io/badge/React-19-61dafb?style=flat&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-8.x-646cff?style=flat&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Go-1.26-00add8?style=flat&logo=go&logoColor=white" alt="Go" />
  <img src="https://img.shields.io/badge/PostgreSQL-14+-4169e1?style=flat&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/license-MIT-22c55e?style=flat" alt="License" />
</p>

<p>
  <a href="#overview">Overview</a> •
  <a href="#key-features">Key Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#license">License</a>
</p>

<p align="center">
  <img width="2541" height="1264" alt="Image" src="https://github.com/user-attachments/assets/23131749-c103-4c0c-b566-95efa1bb98e1" />
</p>

</div>

---

## Overview

**AI Models** is an all-in-one workstation and technical catalog designed for creators and engineers working with generative diffusion models (Illustrious XL, NoobAI V-pred, SDXL 1.0, Pony Diffusion V6, SD 1.5, and Flux.1). 

Instead of guessing sampling steps, CFG scales, CLIP skip layers, or tensor weights, this platform centralizes verified parameters, multi-model side-by-side matrices, interactive canvas tools, and metadata extraction into a single, cohesive developer workspace.

---

## Key Features

### 1. Model Catalog & Comparison Matrix
![Model Catalog & Registry](https://github.com/user-attachments/assets/25a6f121-549d-4e89-8e5f-401e33e01858)
- **Architecture Guidelines**: Complete specifications for anime and photorealistic checkpoints, including recommended native resolutions, optimal samplers, and trigger words.
- **Side-by-Side Matrix**: Compare up to 3 models simultaneously across base architecture, VRAM demands, CLIP skip, scheduler pairing, and hires fix presets.
- **High-Performance Virtualization**: Virtualized grid and list views powered by TanStack Virtual for instant scrolling across large registries.

### 2. OpenPose & ControlNet Rig Studio
![OpenPose & ControlNet Rig Studio](https://github.com/user-attachments/assets/1837a485-e6e7-4019-bbe8-f70dd4ec1bcd)
- **Interactive Skeleton Rigging**: 18-joint COCO-compliant pose editor on HTML5 Canvas with real-time joint manipulation, limb rotation, and multi-character duo support.
- **Instant Export**: Export clean OpenPose images (black background with colored bones) ready for Automatic1111, Forge, or ComfyUI ControlNet nodes.
- **Preprocessor Reference Guide**: Technical cheat-sheets with optimal threshold recommendations for Canny, DepthAnything V2, Normalbae, and LineArt.

### 3. LoRA Stack Builder & Burnout Guard
- **Multi-Layer Weight Aggregation**: Combine multiple LoRA layers with individual strength sliders and automatic trigger word extraction.
- **Over-Baking / Burnout Guard**: Built-in tensor saturation detection that alerts you before combined weights cause pixel burning or contrast degradation.
- **Syntax Export**: One-click export to Automatic1111 `<lora:name:weight>` format, ComfyUI node graphs, and raw JSON.

### 4. Lossless Metadata Inspector
![Lossless Metadata Inspector](https://github.com/user-attachments/assets/1f17585c-3956-4708-974e-87406b43dad5)
- **Client-Side Chunk Parsing**: Read `tEXt` and `iTXt` PNG chunks directly in the browser without uploading raw files to external servers.
- **Format Normalizer**: Automatically parses parameters from Automatic1111, SD-Forge, NovelAI, and ComfyUI workflow execution graphs.
- **Workflow Bridge**: Send extracted prompts and seeds directly to the Prompt Lab, LoRA Stack, or Resolution Calculator with one click.

### 5. Modular Prompt Matrix & Negative Vault
![Prompt Matrix & Studio Lab](https://github.com/user-attachments/assets/8a372928-8d78-44fb-8c17-2f401beab46a)
- **Structured Token Composer**: Organize prompts by subject, style, lighting, camera angle, and artist modifiers.
- **Danbooru Taxonomy Explorer**: Filter and append curated character, costume, and aesthetic tags with automatic syntax formatting.
- **Negative Vault**: Curated negative formulas and embedding triggers tailored specifically to suppress score-based degradation in Pony and NoobAI models.

### 6. Hardware VRAM & Resolution Profiler
- **Memory Allocation Predictor**: Estimate dedicated GPU memory requirements across model parameters, batch sizes, context lengths, and VAE tiling.
- **Latent Grid Snapping**: Dimension calculator with automatic 64/8-pixel latent grid rounding to avoid generation artifacts.

### 7. ComfyUI Workflow Catalog
- **Curated Node Presets**: Ready-to-import ComfyUI node graphs for standard text-to-image, FaceDetailer pipelines, and upscaling workflows.
- **Node Graph Inspector**: Visual inspection of required custom nodes and node dependencies.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 19, TypeScript, Vite 8 |
| **State & Navigation** | React Router v7, TanStack Virtual |
| **Canvas & Graphic Engines** | HTML5 Canvas API (2D Rigging Engine) |
| **UI Design System** | Custom Dark Cyberpunk / Editorial CSS3 with glassmorphism |
| **Backend Framework** | Go 1.26+, Gin Web Framework |
| **Database & ORM** | PostgreSQL 14+, GORM, golang-migrate |

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
- *(Optional for Backend)*: [Go](https://go.dev/) (v1.22+) and [PostgreSQL](https://www.postgresql.org/) (v14+)

---

### Installation & Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/alazriel6/AI-Models.git
cd AI-Models
```

#### 2. Run the Frontend
The frontend includes built-in verified datasets and runs out of the box with all tools active:

```bash
cd fe
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

To compile for production:
```bash
npm run build
```

---

#### 3. (Optional) Run the Backend & Database
If you wish to run the local Go API server with PostgreSQL persistence:

```bash
cd be

# Copy environment template
cp .env.example .env

# Download Go modules
go mod download

# Start the Go server
go run cmd/server/main.go
```
The backend API server will listen on `http://localhost:8080`.

---

## License

This project is licensed under the [MIT License](LICENSE).
