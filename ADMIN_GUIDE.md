# Panduan Arsitektur & Roadmap Admin Mode (Models Guide)

Dokumen ini berfungsi sebagai referensi teknis dan panduan pengerjaan bagi pengembang (atau AI assistant di sesi selanjutnya) untuk melanjutkan implementasi Admin Mode dari sisi **Frontend UI**, **Backend Go**, dan **Database**.

---

## 1. Ringkasan & Status Pengerjaan

### Selesai di Tahap Ini (UI First)
- **Admin Access Gate (`AdminGateModal.tsx`)**:
  - Halaman terproteksi dengan PIN/Passcode.
  - Default Passcode: `admin123`.
  - Passcode tersimpan di `localStorage` dan status login di `sessionStorage` (`AdminAuth.tsx`).
  - Fitur ubah passcode langsung dari dashboard.
- **Admin Dashboard (`AdminDashboard.tsx`)**:
  - Ringkasan statistik (Total Models, Checkpoints, LoRA, VAE/Lainnya).
  - Indikator status koneksi API Backend (`http://localhost:8080/api`).
  - Filter pencarian instan (nama, author, slug) dan filter tipe/base model.
  - Tabel data responsif dengan badge warna-warni (Civitai Dark theme).
  - Tombol aksi: View Galeri Publik (👁️), Edit (✏️), Hapus (🗑️).
- **Form CRUD Model (`ModelFormModal.tsx`)**:
  - Dialog modal multi-tab yang rapi:
    1. **Informasi Utama**: Name, Auto Slug generator, Type (`checkpoint`, `lora`, `vae`, `embedding`), Base Model, Creator/Author, Deskripsi.
    2. **Media & Link**: Thumbnail URL dengan live image preview, Source URL, Civitai URL, Hugging Face URL.
    3. **Hardware & Tensor**: Tensor Size (cth: `6.46 GB`), VRAM Min, VRAM Recommended, Conditioner, First Stage Model, Model Tensor.
    4. **Trigger Words & Tags**: Tag chips interaktif (ketik lalu tekan enter), input tag kategori.
    5. **Versi Model & Recommended Generation Settings**:
       - Metadata Versi: Nama versi, nomor versi, format file (`SafeTensor`, `GGUF`, `PickleTensor`), file_name, file_size (bytes), civitai_version_url,         - **⚙️ Recommended Generation Settings**: Sampler (cth: `Euler a`, `DPM++ 2M Karras`), Steps, CFG Scale, Resolution Width, Resolution Height, dan Clip Skip (sesuai spesifikasi tampilan galeri).
- **Backend Go Service & Repository Sync**:
  - `be/internal/repositories/model_repository.go`: `FindAll` telah diupdate untuk Preload `Versions`, `Images`, dan `Reviews` (selain `Tags` dan `TriggerWords`).
  - `be/internal/services/model_service.go`: `Create` dan `Update` sekarang menyimpan dan memperbarui `Versions` (lengkap dengan `RecommendedSettings` JSON), `Tags` (otomatis dibuat jika belum ada), dan `TriggerWords`.
- **Delete Confirmation Modal**:
  - Konfirmasi bahaya untuk mencegah ketidaksengajaan menghapus data model.
- **Client API Layer (`fe/src/api/admin.ts`)**:
  - Fungsi terstandarisasi untuk `createModelApi`, `updateModelApi`, `deleteModelApi`, `getTagsApi`, `createTagApi`, dan `createModelVersionApi`.
  - Fallback state lokal yang mulus jika backend sedang offline/kosong.

---

## 2. Struktur File Frontend yang Terkait

```
fe/src/
├── api/
│   ├── client.ts             # Base API fetcher (http://localhost:8080/api)
│   ├── models.ts             # Interface Model, Version, Tag, Image, Reviews
│   └── admin.ts              # Fungsi CRUD khusus Admin
├── components/
│   ├── admin/
│   │   ├── admin.css         # Styling Civitai Dark untuk panel admin
│   │   ├── AdminAuth.tsx     # Context & Hook autentikasi admin
│   │   ├── AdminGateModal.tsx# Form PIN unlock admin
│   │   ├── AdminDashboard.tsx# Halaman utama admin & tabel CRUD
│   │   └── ModelFormModal.tsx# Form modal input & edit model
│   └── model-list.tsx        # Halaman galeri publik
├── App.tsx                   # Rute /admin & NavLink terdaftar
└── App.css                   # Global styling
```

---

## 3. Detail Schema Data (Model & Versi)

Payload data yang dikirim dari Frontend Form (`fe/src/api/admin.ts`) ke Backend Go:

```typescript
export interface CreateModelPayload {
    name: string;              // required (e.g. "Animagine XL 3.1")
    slug?: string;             // required/auto-generated (e.g. "animagine-xl-3-1")
    type: string;              // required: "checkpoint" | "lora" | "vae" | "embedding"
    base_model: string;        // required: "Illustrious" | "NoobAI" | "SDXL" | "Pony" | "SD 1.5" | "Flux.1"
    author?: string;           // string
    description?: string;      // text
    thumbnail_url?: string;    // image URL preview
    source_url?: string;       // download / civitai / hf mirror
    civitai_url?: string;
    huggingface_url?: string;
    tensor_size?: string;      // e.g. "6.46 GB"
    vram_min?: string;         // e.g. "8 GB"
    vram_recommended?: string; // e.g. "12 GB"
    conditioner?: number;
    first_stage_model?: number;
    model_tensor?: number;
    trigger_words?: string[];  // e.g. ["masterpiece", "anime style"]
    tags?: string[];           // e.g. ["anime", "character"]
    versions?: Array<{
        version_name: string;
        version_number?: string;
        file_name?: string;
        file_size?: number;
        format?: string;       // "SafeTensor", "GGUF", etc.
        download_url?: string;
        civitai_version_url?: string;
        recommended_settings?: {
            sampler?: string;
            steps?: number;
            cfg_scale?: number;
            width?: number;
            height?: number;
            clip_skip?: number;
        };
    }>;
}
```

---

## 4. Status Backend Go (`be/`)

Endpoint REST API pada Go Gin (`be/internal/routes/routes.go`) yang sudah siap menerima request:

| Method | Endpoint | Keterangan |
|---|---|---|
| `GET` | `/api/models` | Mengambil daftar model (mendukung query `page`, `limit`, `type`, `base_model`, `search`) |
| `GET` | `/api/models/:id` | Mengambil detail 1 model berdasarkan ID atau Slug |
| `POST` | `/api/models` | Membuat entri model baru |
| `PUT` | `/api/models/:id` | Mengedit/update data model |
| `DELETE` | `/api/models/:id` | Menghapus data model beserta relasinya (cascade) |
| `POST` | `/api/models/:id/versions` | Menambahkan rilis versi ke model tertentu |
| `PUT` | `/api/versions/:id` | Mengedit versi model |
| `DELETE` | `/api/versions/:id` | Menghapus versi model |
| `GET` | `/api/tags` | Mengambil daftar tags |
| `POST` | `/api/tags` | Membuat tag baru |
| `POST` | `/api/models/:id/images` | Upload metadata gambar model |

---

## 5. Rencana Tahap Berikutnya (Untuk Sesi Lanjutan)

Ketika Anda siap melanjutkan ke integrasi backend dan database penuh, berikut adalah panduan langkah demi langkah yang harus dilakukan:

### A. Autentikasi Backend Admin (Keamanan Tingkat Server)
1. **Buat Admin Middleware**:
   - Buat file `be/internal/middleware/auth.go`.
   - Periksa header `Authorization: Bearer <ADMIN_SECRET_KEY>` atau JWT token pada rute `POST`, `PUT`, dan `DELETE`.
   - Daftarkan `ADMIN_SECRET_KEY` pada file `be/.env`.
2. **Kirim Header pada Frontend**:
   - Di `fe/src/api/client.ts`, lampirkan token admin yang tersimpan di `sessionStorage` jika tersedia:
     ```typescript
     headers: {
       "Authorization": `Bearer ${adminToken}`,
       ...
     }
     ```

### B. Database Setup & Seeding
1. **Konfigurasi Database (`be/.env`)**:
   - Pastikan database terhubung (PostgreSQL / SQLite).
   - Jalankan automigrate di `be/internal/database/database.go` agar tabel `models`, `model_versions`, `tags`, `model_trigger_words`, dan `model_images` terbuat secara otomatis.
2. **Seed Sample Data**:
   - Buat script seeder (cth: `be/cmd/seed/main.go`) untuk memasukkan beberapa model populer (Illustrious-XL, NoobAI-XL, Animagine XL, LoRA Detailers) agar database terisi saat pertama kali dijalankan.

### C. File Upload Fisik (Lokal Storage Gambar)
1. **Endpoint Upload Multipart**:
   - Manfaatkan static handler `router.Static("/storage/images", storagePath)` yang sudah ada di `routes.go`.
   - Tambahkan endpoint `POST /api/upload` untuk menerima file gambar PNG/JPEG/WEBP dari form admin dan menyimpannya ke folder `be/storage/images`.

---

## 6. Cara Menguji Aplikasi Saat Ini

1. **Akses Frontend**:
   - Buka browser ke `http://localhost:5173/` (atau klik link **🛡️ Admin** di pojok kanan navigation bar).
   - Rute langsung: `http://localhost:5173/admin`.
2. **Login Admin Gate**:
   - Masukkan PIN default: `admin123`.
3. **Uji CRUD**:
   - Tambah model baru melalui tombol **+ Tambah Model Baru**.
   - Edit model yang sudah ada dengan mengklik ikon pensil (✏️).
   - Hapus model dengan ikon tempat sampah (🗑️).
   - Ubah PIN via tombol **🔑 Ganti PIN**.
