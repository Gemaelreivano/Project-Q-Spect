# Team Contributions & Role Distribution — Project Q-Spect

Dokumen ini memetakan pembagian tugas, cabang pengembangan (*Git branches*), dan tanggung jawab teknis dari 5 anggota tim pengembang **Q-Spect (Zero-Trust QRIS Inspector & OSINT Analyzer)** dalam kompetisi **Mini Hackathon Vibe Coding**.

---

## Daftar Kontributor Utama

| No | Nama Lengkap | Peran Utama (Role) | Branch Kerja | Fokus Modul & File Utama |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **Gemael Reivano** | **Repo Master & Context Engineer** | `main` / `feature/context-setup` | `AGENTS.md`, `README.md`, `.gitignore`, Manajemen GitHub & Deployment |
| **2** | **Fahri Ramadhan** | **Design.md & UI/UX MCP Specialist** | `feature/ui-stitch` | `DESIGN.md`, Otomatisasi Google Stitch via MCP, `index.html`, `css/style.css` |
| **3** | **M. Fharel E.** | **Backend, Core Logic & Security** | `feature/qris-logic` | `js/qris-decoder.js`, `js/security.js` (SHA-256 Blind Hashing & Anti-XSS) |
| **4** | **Annisa Rahma Salsabila** | **AI Integrator & System Synchronization** | `feature/google-ai` | `SKILLS.md`, `js/threat-analyzer.js` (Gemini 2.5 Flash API), `js/app.js` |
| **5** | **Wisnu Fadly** | **QA Tester & Pitch Deck Master** | `docs/pitch-testing` | `tests/test-cases.md`, `docs/architecture.md`, Pengujian End-to-End & Materi Pitch Deck 6 Menit |

---

## Rincian Tanggung Jawab per Anggota

### 1. Gemael Reivano — Repo Master & Context Engineer
- Menginisialisasi dan mengelola arsitektur repositori GitHub (`Project-Q-Spect`) serta mengatur proteksi kredensial melalui `.gitignore`.
- Merancang konstitusi agen di `AGENTS.md` dengan protokol *Strict Anti-Slop* dan batasan keamanan *Zero-Trust*.
- Mengelola proses *code review*, penggabungan cabang (*branch merging*), serta publikasi halaman live *GitHub Pages*.

### 2. Fahri Ramadhan — Design.md & UI/UX MCP Specialist
- Menyusun spesifikasi visual *Cyber-Defense Financial Scanner* di dalam `DESIGN.md` (skema warna *Deep Space Navy* `#0B132B` dan *Cyber Teal* `#00F5D4`).
- Mengeksekusi generasi antarmuka *Zero-Touch* melalui **Model Context Protocol (MCP)** yang terhubung langsung ke **Google Stitch**.
- Mengintegrasikan komponen hasil desain Stitch (Risk Meter Lampu Lalu Lintas, Area Pemindai, dan Kupon Audit Digital) ke `index.html` serta `css/style.css`.

### 3. M. Fharel E. — Backend, Core Logic & Security
- Mengembangkan mesin pembedah payload standar **EMVCo QRIS (TLV Parser)** di `js/qris-decoder.js` untuk mengekstrak Nama Merchant (Tag 59), Kota (Tag 60), Kode MCC (Tag 52), dan NMID/PJP (Tag 26/51).
- Menerapkan sistem privasi **Zero-Knowledge / SHA-256 Blind Hashing** menggunakan Web Crypto API di `js/security.js` agar sesuai dengan kepatuhan UU PDP.
- Menegakkan sanitasi input/output berbasis `DOMPurify` untuk mencegah serangan *Cross-Site Scripting (XSS)*.

### 4. Annisa Rahma Salsabila — AI Integrator & System Synchronization
- Merumuskan *whitelist* kapabilitas sistem di dalam `SKILLS.md`.
- Mengintegrasikan **Google Gemini API (`gemini-2.5-flash`)** dengan skema *Strict Structured Output* (`application/json`) di `js/threat-analyzer.js` untuk mendeteksi anomali kode MCC terhadap nama merchant terindikasi judi daring (judol)/penipuan.
- Menyinkronkan alur kerja antarmuka dengan modul logika di dalam orkestrator utama `js/app.js`.

### 5. Wisnu Fadly — QA Tester & Pitch Deck Master
- Menyusun skenario pengujian komprehensif di `tests/test-cases.md` (pengujian QRIS UMKM bersih, anomali mismatch MCC, QRIS deposit ilegal, dan uji ketahanan XSS).
- Melakukan *bug fixing* dan memvalidasi kelancaran fitur pada mode simulasi maupun pemindaian gambar nyata.
- Menyusun materi presentasi **Pitch Deck (6 Menit)** untuk sesi *Star Day-3* beserta kelengkapan dokumen pengumpulan akhir.
