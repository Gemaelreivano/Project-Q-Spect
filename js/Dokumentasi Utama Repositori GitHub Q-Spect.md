<div align="center">

# 🛡️ Q-Spect
### **QRIS Inspector & OSINT Threat Analyzer**
*Membongkar "Kotak Hitam" Visual QRIS Sebelum Anda Menekan Tombol Transfer.*

[![Status Proyek](https://img.shields.io/badge/Status-Prototype_Ready-10B981?style=for-the-badge&logo=checkmarx&logoColor=white)](#)
[![Arsitektur](https://img.shields.io/badge/Architecture-100%25_Client--Side-3B82F6?style=for-the-badge&logo=javascript&logoColor=white)](#)
[![AI Engine](https://img.shields.io/badge/AI_Engine-Gemini_2.5_Flash-8B5CF6?style=for-the-badge&logo=google-gemini&logoColor=white)](#)
[![Keamanan](https://img.shields.io/badge/Security-Zero--Trust_%26_DOMPurify-EF4444?style=for-the-badge&logo=shield&logoColor=white)](#)
[![Metodologi](https://img.shields.io/badge/Methodology-Context_Engineering_%26_MCP-F59E0B?style=for-the-badge)](#)

---

**Proyek Pengajuan untuk Mini Hackathon Vibe Coding 2026**  
**Kategori:** Finansial & Ekonomi Mikro / Keamanan Layanan Publik  

[🚀 **Coba Live Demo**](#-cara-menjalankan-proyek) • [📖 **Latar Belakang**](#-mengapa-q-spect-diciptakan-latar-belakang--tujuan) • [✨ **Fitur Utama**](#-fitur-unggulan) • [📂 **Struktur Proyek**](#-struktur-repositori)

</div>

---

## 🎯 Mengapa Q-Spect Diciptakan? (Latar Belakang & Tujuan)

Standar pembayaran **QRIS (Quick Response Code Indonesian Standard)** telah merevolusi kemudahan transaksi digital di Indonesia. Namun, di balik kemudahannya, kode QR bersifat sebagai **"Kotak Hitam" (*Visual Blackbox*)** bagi mata manusia. Pengguna awam tidak pernah tahu data apa yang tersembunyi di balik titik-titik piksel tersebut sampai mereka memindainya langsung di dalam aplikasi perbankan/dompet digital.

Celah psikologis dan teknis ini dieksploitasi secara masif oleh sindikat kejahatan siber untuk:
1. **Menyamarkan Rekening Deposit Judi Daring (Judol):** Menggunakan nama merchant kamuflase (seperti *"DEPO88"*, *"TOKO GACOR JP"*, atau akun *bot gateway*).
2. **Quishing (QR Phishing) & Manipulasi Stiker QRIS:** Menempelkan stiker QRIS palsu di atas QRIS milik UMKM, kotak amal tempat ibadah, atau katalog transaksi elektronik publik.
3. **Injeksi Payload Berbahaya:** Menyisipkan karakter skrip berbahaya di dalam string QR untuk menyerang sistem pembaca yang tidak menerapkan sanitasi input.

> **Tujuan Utama Q-Spect:**  
> Menjadi **perisai inspeksi lapis pertama (*Pre-Transaction Inspector*)** yang independen, transparan, dan menjaga privasi pengguna. Q-Spect membedah isi perut kode QRIS secara lokal dan mengerahkan kecerdasan buatan (**Google Gemini 2.5 Flash**) untuk menilai tingkat bahaya merchant sebelum satu rupiah pun berpindah tangan.

---

## 🛑 Apa Saja yang Dapat Dicegah Jika Q-Spect Diterapkan?

Jika sistem **Q-Spect** diadopsi secara luas oleh masyarakat maupun diintegrasikan ke dalam ekosistem pembayaran layanan publik (seperti e-commerce daerah **Bebeli / Super App Bebunge** maupun dompet digital nasional), proyek ini akan secara langsung mencegah:

| Ancaman yang Dicegah | Cara Q-Spect Menghentikannya | Dampak Nyata bagi Masyarakat |
| :--- | :--- | :--- |
| 🎰 **Transaksi Deposit Judi Online (Judol)** | Menganalisis anomali leksikal dan pola penamaan *payment gateway* ilegal pada **Tag 59 (Merchant Name)** menggunakan heuristik OSINT & NLP Gemini (`js/threat-analyzer.js`). | Memutus aliran dana ke sindikat judi daring sejak dari layar pengguna akhir (*end-user*). |
| 🎭 **Penipuan Kamuflase Merchant (Fake UMKM/Amal)** | Membandingkan kesesuaian antara **Tag 59 (Nama Merchant)** dan **Tag 60 (Kota/Lokasi)** melalui dekoder EMVCo (`js/qris-decoder.js`) agar pengguna sadar jika QRIS warung lokal mengarah ke akun bot di luar kota. | Melindungi konsumen dan pelaku UMKM asli dari pembajakan transaksi via stiker QRIS palsu. |
| 🔓 **Kebocoran Privasi saat Pengecekan QR** | Mengekstrak matriks gambar QRIS **100% di peramban lokal (*Client-Side*)** menggunakan HTML5 Canvas & `jsQR` tanpa mengunggah foto ke server mana pun. | Pengguna dapat memeriksa bukti transfer atau QRIS sensitif dengan jaminan privasi penuh. |
| 💉 **Serangan Injeksi Skrip (DOM-Based XSS)** | Menerapkan arsitektur *Secure-by-Design* (`js/security.js`) dengan memblokir penggunaan `innerHTML` mentah dan menyaring setiap byte output memakai **DOMPurify**. | Sistem inspeksi kebal terhadap upaya peretasan balik melalui manipulasi teks payload QR. |

---

## ✨ Fitur Unggulan

- 🔍 **100% Client-Side EMVCo TLV Decoder (`js/qris-decoder.js`)**  
  Membedah struktur string standar perbankan EMVCo (*Tag-Length-Value*) secara instan di memori peramban untuk mengisolasi identitas asli penerima dana (**Tag 59**) dan domisili terdaftar (**Tag 60**).
- 🧠 **Gemini 2.5 Flash Cognitive Threat Analyzer (`js/threat-analyzer.js`)**  
  Menggunakan *Strict Structured Outputs* (`responseSchema` JSON) dari Google Gemini API (+10 Bonus Feature) untuk mendeteksi pola bahasa manipulatif, singkatan terselubung judi daring, atau indikasi rekening penampungan (*mule account*).
- 🛡️ **Zero-Trust Security Layer (`js/security.js`)**  
  Modul khusus sanitasi yang menyaring seluruh input pengguna dan respons AI menggunakan `DOMPurify` sebelum dirender ke DOM oleh `js/app.js`.
- ⚡ **Mode Simulasi Cepat & Skenario Uji (`tests/test-cases.md`)**  
  Dilengkapi skenario uji terstruktur (*Warung Normal/Aman*, *Indikasi Judol/Bahaya Tinggi*, dan *Injeksi Payload XSS*) untuk pengujian fungsionalitas secara instan.

---

## 🔄 Alur Kerja Sistem (Modular System Workflow)

```text
[Gambar QRIS / String EMVCo]
         │
         ▼
┌────────────────────────────────────────────────────────┐
│ 1. CLIENT-SIDE EXTRACTION (js/qris-decoder.js)         │
│    • Dekode matriks piksel QR via HTML5 Canvas & jsQR  │
│    • Membedah struktur TLV -> Ekstraksi Tag 59 & 60    │
└────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────┐
│ 2. COGNITIVE OSINT ANALYSIS (js/threat-analyzer.js)    │
│    • Hanya teks Tag 59 & 60 yang dikirim ke Gemini API │
│    • Kontrak output JSON ketat via responseSchema      │
└────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────┐
│ 3. ZERO-TRUST SANITIZATION (js/security.js)            │
│    • Sanitasi seluruh teks output dengan DOMPurify     │
│    • Pencegahan mutlak terhadap DOM-based XSS          │
└────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────┐
│ 4. UI ORCHESTRATION (js/app.js & index.html)           │
│    • Render Skor Risiko (0-100) & Status Ancaman       │
│    • Tampilkan Rekomendasi Tindakan bagi Pengguna      │
└────────────────────────────────────────────────────────┘
```

---

## 📂 Struktur Repositori

Susunan arsitektur modular **Q-Spect** dirancang mengikuti prinsip pemisahan tanggung jawab (*Separation of Concerns*) dan panduan *Context Engineering*:

```text
Q-Spect/
├── .agents/
│   └── mcp_config.json        # Konfigurasi koneksi server MCP Google Stitch
├── css/
│   └── style.css              # Styling Dark Cybersecurity (Sesuai DESIGN.md)
├── docs/
│   ├── architecture.md        # Dokumentasi detail arsitektur sistem & alur data
│   └── contributions.md       # Pembagian tugas & panduan kontribusi tim
├── js/
│   ├── app.js                 # Pengendali utama UI (Event listeners & alur aplikasi)
│   ├── qris-decoder.js        # Logika ekstraksi gambar QR & parser TLV EMVCo (Tag 59/60)
│   ├── security.js            # Modul keamanan Zero-Trust & sanitasi DOMPurify (Anti-XSS)
│   └── threat-analyzer.js     # Integrasi Google Gemini API & heuristik OSINT
├── tests/
│   └── test-cases.md          # Kumpulan skenario pengujian (Normal, Judol, & XSS Test)
├── .gitignore                 # Daftar pengecualian file Git
├── AGENTS.md                  # Konstitusi peran & batasan keamanan AI Agent
├── DESIGN.md                  # Spesifikasi desain visual & token warna untuk Stitch MCP
├── index.html                 # Antarmuka utama aplikasi Q-Spect
├── README.md                  # Dokumentasi utama proyek
└── SKILLS.md                  # Resep prosedural teknis untuk AI Agent
```

---

## 🤖 Implementasi Vibe Coding & Context Engineering

Proyek ini dibangun sepenuhnya mengikuti disiplin **Context Engineering** dan **Harness Engineering** modern untuk mencegah *AI-Slop* serta menjaga efisiensi anggaran token:

1. 📜 **[`AGENTS.md`](./AGENTS.md) (System Constitution)**  
   Mengatur pembagian peran agen (*Security Architect*, *UI Stitch Orchestrator*, *Cognitive Engineer*) dan menegakkan batasan keras (*Zero-Trust DOM*, larangan `innerHTML`, serta privasi *client-side*).
2. 🎨 **[`DESIGN.md`](./DESIGN.md) (Visual DNA Specification)**  
   Mendokumentasikan token warna heksadesimal bertema *Dark Cybersecurity*, tipografi, dan hierarki komponen yang menjadi acuan bagi **Google Stitch MCP** untuk men-generate antarmuka secara otomatis (*Zero-Touch UI Generation*).
3. 🛠️ **[`SKILLS.md`](./SKILLS.md) (Procedural Playbook)**  
   Berisi resep algoritmik deterministik untuk pemanggilan MCP Stitch, rumus pemotongan string TLV EMVCo (`qris-decoder.js`), skema JSON `responseSchema` Gemini API (`threat-analyzer.js`), dan prosedur sanitasi `DOMPurify` (`security.js`).
4. 📑 **[`docs/architecture.md`](./docs/architecture.md) & [`tests/test-cases.md`](./tests/test-cases.md)**  
   Dokumentasi pendukung yang memetakan desain teknis serta daftar skenario pengujian kualitas (*Quality Assurance*).

---

## 🚀 Cara Menjalankan Proyek

Karena **Q-Spect** dirancang dengan arsitektur *100% Client-Side*, Anda tidak memerlukan instalasi database atau server backend yang rumit:

1. **Clone Repositori Ini:**
   ```bash
   git clone https://github.com/username-anda/q-spect.git
   cd q-spect
   ```
2. **Jalankan Menggunakan Server Lokal:**
   - **VS Code:** Klik kanan pada `index.html` lalu pilih **"Open with Live Server"**.
   - **Terminal (Node.js / Python):**
     ```bash
     npx serve
     # atau
     python -m http.server 8000
     ```
3. **Masukkan Gemini API Key & Uji Coba:**
   - Tempelkan **Google Gemini API Key** Anda pada kolom konfigurasi di bagian atas aplikasi, lalu klik **Simpan Key**.
   - Gunakan tombol **Simulasi Cepat** atau masukkan sampel payload dari [`tests/test-cases.md`](./tests/test-cases.md) untuk menguji deteksi ancaman secara *real-time*!

---

## 🧪 Sinkronisasi Hasil Uji & Matriks Pengujian (tests/test-cases.md)

| No | Skenario Uji | Karakteristik Payload | Expected Verdict | Score | Status |
|:---:|:---|:---|:---|:---:|:---:|
| 1 | **UMKM Bersih** | Warung Kopi Kenangan (MCC 5812, Statis 11) | `APPROVE / AMAN` | 12/100 | ✅ PASS |
| 2 | **Kotak Amal Mismatch** | Infaq Masjid Al-Ikhlas (MCC 7994 Game Mismatch) | `WASPADA / ANOMALI` | 78/100 | ✅ PASS |
| 3 | **Tiket Depo Judol** | Slot Gacor JP (Tag 01:12, Rp 50.137, Tag 62 Ref) | `BAHAYA / BLOCKED` | 98/100 | ✅ PASS |
| 4 | **Quishing URL Phishing** | Link phishing domain tiruan non-EMVCo | `BAHAYA / PHISHING` | 98/100 | ✅ PASS |
| 5 | **Manipulasi Checksum** | CRC-16 diubah ke kode palsu | `BAHAYA / INVALID CRC` | 92/100 | ✅ PASS |
| 6 | **Real Judol Sample 1** | Ku Toko Online (MCC 5816, 22-digit PG Order ID) | `BAHAYA / JUDOL DEPOSIT` | 97/100 | ✅ PASS |
| 7 | **Real Judol Sample 2** | Novaryn Digicell Apl12 (MCC 5732, 17-char Ticket) | `BAHAYA / JUDOL DEPOSIT` | 97/100 | ✅ PASS |
| 8 | **Real Judol Sample 3** | Irvan Phone.. (MCC 4812, 20-digit PG Order ID) | `BAHAYA / JUDOL DEPOSIT` | 97/100 | ✅ PASS |

---

## 📝 Catatan Perubahan & Sinkronisasi Modul (Changelog dari tests/)

- **`public/src/core/qrisParser.js`**:
  - Dibuat sebagai modul inti parser EMVCo UMD/Isomorfik lengkap dengan kalkulator `CRC-16/CCITT-FALSE` dan sanitasi `.trim()`.
  - Mengimplementasikan deteksi transaksi laundering 4-faktor: QRIS dinamis (`Tag 01=12`), nominal terkunci (`Tag 54>0`), Tag 62 Ref/Bill ID, dan MCC warung mikro (`5411`, `5812`, `5999`, `7299`).
  - Menambahkan pendeteksi Shell Company Masking pada Tag 59 (kata kunci "SLOT", "DEPO", "HOKI", "JP", "MAXWIN", dll. serta awalan fiktif CV/PT/UD dengan digit acak).
  - Dilengkapi proteksi *False-Positive Immunity* untuk UMKM kasir dinamis normal.
- **`public/src/ai/geminiInspector.js`**:
  - Modul kompresi citra kamera sisi klien berbasis `HTMLCanvasElement` (maksimal 768px, `image/webp`, quality 0.75).
  - Integrasi inspeksi multimodal Gemini 2.5 Flash melalui rute proxy `/api/ai/inspect` atau direct API call dengan fallback Smart Mock deterministik.
- **`server.js` & `server/aiController.js`**:
  - Dual Authentication System: header `'x-goog-api-key'` + URL parameter `?key=`.
  - Model Fallback Cascade: `gemini-flash-latest` ke `gemini-2.5-flash` dengan safety timeout 8 detik.
- **`index.html` & `css/style.css`**:
  - Tombol interaktif `#btnHeaderBack` pada header navigasi.
  - Floating dock `#scrollDock` dengan scroll halus ke atas dan ke bawah.
- **`js/app.js`**:
  - Integrasi layer navigation, sinkronisasi verdict Lapis 3 Multimodal AI, dan diagnostik runtime console log.

---

## 👥 Tim Pengembang

Detail kontribusi lengkap dapat dilihat pada berkas [`docs/contributions.md`](./docs/contributions.md).

| No. | Nama Lengkap | Peran & Kontribusi Utama |
| :-: | :--- | :--- |
| 1 | **Fharel Eldifary** | **Lead Architect** — Perancangan *Context Engineering* (`AGENTS.md`, `SKILLS.md`), Manajemen Git, & Logika Keamanan OSINT (`qris-decoder.js`, `security.js`). |
| 2 | **[Nama Anggota 2]** | **Frontend / UI Developer** — Orkestrasi desain antarmuka via *Google Stitch MCP* (`DESIGN.md`) & Implementasi UI/UX (`index.html`, `style.css`). |
| 3 | **[Nama Anggota 3]** | **Integration & QA Tester** — Integrasi *Google Gemini API* (`threat-analyzer.js`), Penyusunan Skenario Uji (`test-cases.md`), & Audit Anti-XSS. |

---

<div align="center">
  <sub>Dibangun dengan metode <b>Vibe Coding & Context Engineering</b> untuk <b>Mini Hackathon Vibe Coding 2026</b>.</sub>
</div>
