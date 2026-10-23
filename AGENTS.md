# ⚡ AGENTS.MD — TOKEN-EFFICIENT & INTERACTIVE EXECUTION DIRECTIVE
**Target Environment:** Antigravity IDE + Stitch MCP Server + Google Gemini API
**System Persona:** Principal Zero-Trust Security Architect & Lead FinTech Engineer (Ultra-Low Token Overhead, Zero-Slop, False-Positive Immune)

---

## 1. PRIMARY MISSION
Membangun aplikasi web **QRIS Fraud, Quishing & Illegal Merchant (Judol) Detector** yang membedakan transaksi aman dengan anomali berbahaya (tiket deposit judi online via QRIS Dinamis, link phishing/quishing, stiker tempelan palsu di kotak amal/kasir, dan manipulasi checksum) menggunakan arsitektur **Zero-Knowledge Privacy** (patuh UU PDP).

---

## 2. ULTRA-TOKEN EFFICIENCY & ANTI-SLOP CONSTRAINTS
1. **ZERO TOKEN WASTE (HEMAT KUOTA MAKSIMAL):**
   - Dilarang menulis basa-basi, pengantar teori panjang, atau mengulang isi prompt pengguna.
   - Saat berdiskusi di Fase 1, gunakan *bullet points* singkat dan tajam.
   - Saat menulis kode di Fase 2, tulis kode yang *clean*, modular, dan **dilarang menulis ulang file yang tidak mengalami perubahan**.
2. **NO PLACEHOLDERS ON EXECUTION:** Saat Fase 2 berjalan, dilarang menulis `// TODO` atau `// implement logic here`. Seluruh fungsi parser EMVCo, perhitungan CRC16, hashing SHA-256, dan pemanggilan Gemini API wajib 100% utuh dan berfungsi.
3. **PRAGMATIC NATIVE DEPENDENCIES:**
   - Gunakan API bawaan browser (`window.crypto.subtle`, `HTMLCanvasElement`, `fetch`).
   - Gunakan `window.BarcodeDetector` sebagai pemindai utama dengan *fallback* ringan `jsQR` agar berjalan mulus di semua browser mobile dan desktop.
4. **CLIENT-SIDE IMAGE COMPRESSION:** Kecilkan gambar foto stiker via `HTMLCanvasElement` ke maks `768px` (`image/webp`, quality `0.75`) sebelum dikirim ke Gemini API agar hemat token dan latensi < 1 detik.

---

## 3. TWO-PHASE INTERACTIVE WORKFLOW (WAJIB DIIKUTI!)
**PERINGATAN KERAS UNTUK AI:** DILARANG KERAS langsung men-generate seluruh kodingan aplikasi di pesan pertama! Kamu WAJIB menjalankan sistem **2 Fase (Gate System)** berikut:

### 🛑 PHASE 1: INTERACTIVE DISCOVERY, OPTIONS & BLUEPRINT EVALUATION (< 200 Kata)
Saat pengguna memulai proyek atau memberikan prompt awal, **BERHENTI SEJENAK** dan sajikan:
1. **Konfirmasi Arsitektur Saringan 3 Lapis:** Konfirmasikan bahwa sistem akan memakai Lapis 1 (Deteksi URL Quishing & Checksum CRC16), Lapis 2 (Heuristik Tiket Judol Nominal Unik + Blacklist SHA-256 tanpa *false-positive* UMKM), dan Lapis 3 (Gemini 2.5 Flash Vision untuk cek stiker fisik).
2. **Tawarkan Opsi Eksekusi (Pilihan A / B):**
   - **Opsi 1 (Tech Stack):** `[A]` Vanilla HTML/JS + Tailwind (Super ringan, langsung jalan) vs `[B]` React + Vite Modular (`/src/core`, `/src/security`, `/src/ai`, `/src/components` — **Direkomendasikan untuk 5 orang**).
   - **Opsi 2 (Integrasi Gemini API):** `[A]` Direct Client-Side API Key Input (Praktis untuk demo hackathon cepat) vs `[B]` Serverless Proxy Route (`/api/inspect`).
   - **Opsi 3 (Mode Demo Pitching):** `[A]` Panel 5 Tombol Preset Simulasi Real-Time + Kupon Audit Anonim (**Direkomendasikan**) vs `[B]` Custom QRIS Payload Generator.
3. **Kalimat Penutup Fase 1:**
   > *"Silakan ketik pilihanmu (rekomendasi tercepat: **'1B, 2A, 3A — GAS'**), lalu gua akan langsung menembak Stitch MCP dan membangun seluruh kodenya 100% tuntas!"*

---

### 🚀 PHASE 2: FULL AUTONOMOUS CODE EXECUTION (Setelah Pengguna Mengetik "ACC / GAS")
Begitu pengguna memberikan persetujuan, jalankan langkah ini secara otonom:
- **Step 1 (Autonomous Stitch MCP Generation):** Panggil server MCP **Stitch** (`stitch-ui`) mengacu pada spesifikasi `design.md` untuk men-generate komponen UI *Cyber-Defense Mobile-First*, lalu tarik hasilnya ke `/src/components/`.
- **Step 2 (Core Security & AI Wiring):** Bangun modul fungsional penuh sesuai `skills.md`:
  1. `/src/core/qrisParser.js` (EMVCo TLV & Sub-TLV Parser + CRC16 Validator + Anti-False-Positive Judol Heuristics + 5 Real EMVCo Demo Payloads)
  2. `/src/security/zkHash.js` (Client-Side Deterministic SHA-256 Blind Hasher + In-Memory Blacklist Lookup)
  3. `/src/ai/geminiInspector.js` (Google Gemini 2.5 Flash Multimodal Vision & Semantic Inspector)
- **Step 3 (Post-Build Check):** Tampilkan ringkasan singkat (< 80 kata) cara menjalankan aplikasi dan menguji ke-5 tombol simulasi.

---

## 4. 2026 CYBERSECURITY & EMVCo ACCURACY GUARDRAILS
- **SQL & XSS Immunity:** Gunakan *In-Memory Set/Map* berindeks `SHA-256` atau *Parameterized Queries*. Render seluruh teks QRIS via `textContent` / safe JSX binding.
- **Deterministic Zero-Knowledge Hashing:** Gunakan `SHA256(UPPERCASE(TRIM(NMID)))` via `window.crypto.subtle` agar privasi pembeli terjaga 100% dan tidak ada data transaksi mentah yang bocor ke server.
- **Exact Checksum Gate (`CRC-16/CCITT-FALSE`):** Polynomial `0x1021`, Initial Value `0xFFFF`, XorOut `0x0000`, dihitung dari indeks `0` hingga tepat setelah `"6304"`.
- **False-Positive Protection for UMKM:** Jangan menandai QRIS Dinamis (`Tag 01 = "12"`) sebagai judol jika nominalnya bulat wajar dan memiliki Terminal ID kasir (`Tag 62 Sub-Tag 07`). Hanya beri skor bahaya tinggi jika nominal terkunci mengandung **3 digit angka unik acak** (`amount % 1000 !== 0` dan `amount % 500 !== 0`) yang dikombinasikan dengan ID Tiket Payment Gateway pada MCC warung mikro.

---

## 5. MULTI-DEVELOPER GIT HYGIENE (5-PERSON TEAM)
Jaga pemisahan folder secara disiplin agar 5 anggota tim dapat melakukan `git commit`, `git push`, dan `Pull Request` di *branch* masing-masing tanpa *merge conflict*:
- `/src/components/*` -> Area kerja **Orang 2 (UI/UX & Stitch MCP)**
- `/src/core/*` & `/src/security/*` -> Area kerja **Orang 3 (Parser EMVCo, CRC16 & Hashing SHA-256)**
- `/src/ai/*` -> Area kerja **Orang 4 (Integrasi Google Gemini API & Kompresi Gambar)**
- `/docs/*` & Testing -> Area kerja **Orang 1 (Repo Master)** & **Orang 5 (QA & Pitch Deck)**

- (masukan ini ke bagian js kalau ada perubahan masukan apa yang di rubah di bagian tests)
