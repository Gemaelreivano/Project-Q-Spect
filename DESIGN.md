# UI/UX SPECIFICATION & VISUAL DNA — PROJECT Q-SPECT

**Target Environment:** Antigravity IDE + Google Stitch MCP + Tailwind CSS  
**Application Concept:** Cyber-Defense Financial Scanner (High-Trust, Zero-Latency, Mobile-First Single Page Application)  
**Container Blueprint:** Centered Crystal Glass Viewport (`max-w-[440px]`, 100dvh Locked, Anti-Scroll)

---

## 1. Design System & Design Tokens

### 1.1 Color Palette
| Token Name | Hex Code | Utility / Tailwind Class | Peran / Konteks Penggunaan |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `#050B1A` | `bg-cyberDeep` / `bg-slate-950` | Latar kanvas utama aplikasi dan kanvas partikel sirkuit. |
| **Card Glass Surface** | `rgba(20, 42, 84, 0.38)` | Linear Gradient ke `#0A1834` | Kartu kontainer transparan (*Crystal Glass Card*). |
| **Border Primary** | `rgba(56, 189, 248, 0.35)`| `border-sky-400/35` | Garis tepi default kartu dan elemen input scanner. |
| **Accent Cyan** | `#06B6D4` / `#22D3EE` | `text-cyan-400`, `border-cyan-400` | Aksen siber, pemindai laser, dan tautan navigasi. |
| **Status Safe (Green)** | `#10B981` | `text-emerald-400`, `bg-emerald-500` | Kondisi QRIS terverifikasi aman, indikator online, skor 0–30. |
| **Status Warning (Amber)**| `#F59E0B` | `text-amber-400`, `bg-amber-500` | Anomali MCC vs Nama Toko, merchant tidak lazim, skor 31–70. |
| **Status Danger (Rose)** | `#F43F5E` / `#EF4444` | `text-rose-400`, `bg-rose-500` | Indikasi judol, manipulasi stiker fisik, quishing, skor 71–100. |
| **Text Primary** | `#F8FAFC` | `text-slate-50` / `text-white` | Judul, label penting, dan angka hasil inspeksi. |
| **Text Secondary** | `rgba(224, 242, 254, 0.7)` | `text-sky-200/70` | Subtitle, metadata sekunder, dan deskripsi bantuan. |

### 1.2 Typography & Iconography
* **Body Font:** `'Plus Jakarta Sans', sans-serif` (Hierarki: 400 Regular, 500 Medium, 600 Semi-Bold, 700 Bold).
* **Technical Font:** `'JetBrains Mono', monospace` (Digunakan khusus untuk: NMID, Hash SHA-256, Tag EMVCo, Risk Score, dan Badge Status).
* **Icon Library:** Inline SVG berbasis Heroicons (Stroke: `1.8px` s/d `2.2px`, rounded line caps).

### 1.3 Glassmorphism & Atmospheric Glow Formulas
1. **Natural Ambient Blur Wrapper (`.sensor-ambient-wrapper`):**
   * Pseudo-element `::before`: `inset: -38px; border-radius: 54px; backdrop-filter: blur(1cm); -webkit-backdrop-filter: blur(1cm);`
   * *Idle/Default:* `radial-gradient(circle at center, rgba(14, 165, 233, 0.16) 0%, rgba(37, 99, 235, 0.08) 50%, transparent 75%)`
   * *Safe Glow:* `radial-gradient(circle at center, rgba(16, 185, 129, 0.18) 0%, rgba(5, 150, 105, 0.08) 50%, transparent 75%)`
   * *Danger Glow:* `radial-gradient(circle at center, rgba(244, 63, 94, 0.18) 0%, rgba(225, 29, 72, 0.08) 50%, transparent 75%)`
2. **Crystal Glass Card (`.crystal-glass-card`):**
   * Background: `linear-gradient(145deg, rgba(20, 42, 84, 0.38) 0%, rgba(10, 24, 52, 0.3) 100%)`
   * Blur: `backdrop-filter: blur(12px) saturate(130%)`
   * Inner & Outer Shadows:
     ```css
     box-shadow: 0 25px 50px -15px rgba(3, 12, 32, 0.6),
                 0 0 70px 10px rgba(14, 165, 233, 0.18),
                 inset 0 1px 1px rgba(255, 255, 255, 0.25);
     ```

---

## 2. Global Layout & Motion Architecture

### 2.1 Viewport Constraints
* Seluruh aplikasi terkunci pada tinggi layar tepat `100vh` / `100dvh` dengan `overflow: hidden` dan `user-select: none`.
* Latar belakang dinamis digambar oleh elemen canvas `#circuitCanvas` dengan animasi partikel data dan jalur sirkuit PCB neon (*Cyber Blue Matrix*).

### 2.2 Scan Laser Engine
* Garis laser animasi `.scanner-laser` bergerak vertikal di dalam area pemindai:
  * Keyframe: `top: 6%` menuju `top: 92%` (Durasi: `2.4s`, `ease-in-out`, `infinite alternate`).
  * Gradient: `linear-gradient(90deg, transparent, #22D3EE, #10B981, #22D3EE, transparent)`.
  * Glow: `box-shadow: 0 0 16px #06B6D4, 0 0 32px #10B981`.

---

## 3. Komponen Antarmuka (3-Layer State Machine)

```
[Header Nav (Logo + Breadcrumb + Status Online)]
                    │
                    ▼
┌──────────────────────────────────────────────────────────┐
│                   MAIN VIEWPORT (440px)                  │
│                                                          │
│  [LAYER 1: Welcome]  ──>  [LAYER 2: Scanner & Presets]  │
│                                    │                     │
│                                    ▼                     │
│                        [LAYER 3: Security Verdict]       │
└──────────────────────────────────────────────────────────┘
                    │
                    ▼
[Footer (Zero-Knowledge Verified & Hak Cipta 2026)]
```

### 3.1 Global Header & Navigation
* **Brand Ident:** Logo vektor Q-Spect dengan perisai mikro dan lingkar konsentris.
* **Nav Breadcrumb:** Indikator dinamis font mono (`Layer 1 / Welcome`, `Layer 2 / QRIS Scanner`, `Layer 3 / Security Analysis`).
* **System Status:** Badge `ONLINE` dengan titik pulsa hijau beranimasi `animate-ping`.

---

### 3.2 LAYER 1: Welcoming & Entry Card (`#layerWelcome`)
* **Tujuan:** Edukasi pra-inspeksi dan membangun kepercayaan pengguna (*Zero-Trust Orientation*).
* **Komponen:**
  1. Ikon tameng siber bersinar dengan latar gradien cyan-emerald.
  2. Headline: *"Q-SPECT QRIS Intelligence"*.
  3. Deskripsi proteksi transaksi dari merchant palsu, pemalsuan NMID, dan situs quishing.
  4. Tombol Utama (CTA): *"Mulai Scan QRIS Sekarang"* dengan gradien penuh `from-cyan-400 to-emerald-400` dan teks kontras tinggi `#050B1A`.

---

### 3.3 LAYER 2: Scanner, Upload & Demo Bar (`#layerScanner`)
* **Tujuan:** Penangkapan visual kode QR dan penyediaan sampel simulasi cepat untuk demo juri.
* **Komponen:**
  1. **Gemini API Configuration Pill:** Input kunci API AI Studio tersimpan di sisi klien (`localStorage`) dengan kolom sandi dan tombol simpan.
  2. **Tab Controller:** Tombol toggle transisi halus antara tab **Kamera Sensor** dan **Upload File**.
  3. **Viewport Pemindai:** 
     * Aspek rasio 1:1 (*Aspect Square*), sudut bingkai fokus neon (*corner brackets*), dan garis laser animasi.
  4. **Dropzone File:** Bingkai putus-putus (`border-dashed border-sky-400/35`) dengan ikon berkas dan teks panduan format (PNG, JPG, WEBP).
  5. **Built-in Demo Simulation Grid (5 Skenario Uji Hackathon):**
     * `Btn 1 (Hijau)`: Sample UMKM Bersih (*Warung Kopi Kenangan*).
     * `Btn 2 (Kuning)`: Kotak Amal Mismatch MCC (*Masjid tapi MCC Game*).
     * `Btn 3 (Merah)`: Tiket Depo Judol Dinamis (*Slot Gacor JP*).
     * `Btn 4 (Merah)`: Quishing URL (*Redirect Domain Phishing .vip*).
     * `Btn 5 (Merah)`: Manipulasi Checksum (*CRC-16 Rusak / Meleset*).

---

### 3.4 LAYER 3: Security Verdict & Audit Receipt (`#layerResult`)
* **Tujuan:** Menyajikan audit forensik lengkap dalam format yang terstruktur dan memicu tindakan langsung.
* **Komponen:**
  1. **Header Verdict Badge:** Badge status tegas (`APPROVE / AMAN`, `WASPADA / ANOMALI`, atau `BAHAYA / PHISHING`).
  2. **Traffic-Light Risk Meter (0–100%):**
     * Bar progres horizontal dengan animasi transisi lebar 500ms.
     * Teks persentase risiko (misal: `12 / 100 - Risiko Rendah` atau `95 / 100 - Ancaman Kritis`).
  3. **Merchant Identity Card:**
     * Blok kontras gelap berisi ekstraksi EMVCo TLV:
       * **Nama Merchant:** Tag 59 (dibersihkan via DOMPurify).
       * **NMID:** Tag 51 Sub-tag 02 (disertai indikasi hash SHA-256).
       * **Kategori (MCC):** Tag 52 terpetakan ke label industri manusiawi.
       * **Kota / Domisili:** Tag 60.
  4. **Cognitive Insight Box (Google Gemini AI):**
     * Panel ringkasan bahasa alami 1–2 kalimat yang menjelaskan korelasi semantik antara nama usaha dengan risiko penipuan.
  5. **Privacy-Safe Digital Audit Receipt:**
     * Tombol *"Salin Kupon Audit Digital"* yang menghasilkan teks ringkas berisi timestamp, hash SHA-256 NMID, dan status inspeksi untuk bukti pengguna.
  6. **Action Controller (Dua Tombol Aksi):**
     * Tombol Sekunder: *"Scan QR Lain"* (Kembali ke Layer 2).
     * Tombol Primer Reaktif:
       * Jika Aman: *"Lanjut Transaksi"* (`bg-emerald-500`).
       * Jika Bahaya: *"Batalkan & Laporkan"* (`bg-rose-500`).

---

## 4. State Transitions & Reactive Styling

| Status Keamanan | Kelas Wrapper Ambient | Kelas Kartu Hasil | Warna Risk Meter | Label Badge |
| :--- | :--- | :--- | :--- | :--- |
| **Aman (0–30)** | `.sensor-ambient-wrapper.safe` | `.crystal-glass-card.safe-border` | `bg-emerald-400` | `APPROVE / AMAN` |
| **Waspada (31–70)** | `.sensor-ambient-wrapper` (Gold) | `.crystal-glass-card` (Amber) | `bg-amber-400` | `WASPADA / ANOMALI` |
| **Bahaya (71–100)**| `.sensor-ambient-wrapper.danger` | `.crystal-glass-card.danger-border`| `bg-rose-500` | `BAHAYA / BLOCKED` |

---

## 5. Aturan Keamanan Render UI (Zero-Trust Anti-XSS)

1. **Larangan InnerHTML Mentah:** Seluruh teks yang berasal dari QRIS (Tag 59, Tag 60, NMID, URL) dilarang dimasukkan langsung menggunakan `.innerHTML`.
2. **Sanitasi Wajib:** Jika elemen memerlukan markup terformat, wajib dilewatkan ke pembersih:
   ```javascript
   element.innerHTML = DOMPurify.sanitize(trustedHtmlString);
   ```
3. **Pengutamaan TextContent:** Untuk label nama merchant dan data teks statis, gunakan properti aman:
   ```javascript
   document.getElementById('resMerchant').textContent = decodedMerchantName;
   ```
   (masukan ini semua di bagian file css)
