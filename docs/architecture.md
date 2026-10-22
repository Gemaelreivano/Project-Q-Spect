# System Architecture & Security Design — Q-Spect

Dokumen ini menjelaskan arsitektur teknis, alur pemrosesan data, serta desain keamanan *Zero-Knowledge* pada **Q-Spect (QRIS Inspector & OSINT Analyzer)**.

---

## 1. High-Level Architecture Overview

**Q-Spect** dirancang menggunakan arsitektur **100% Client-Side Execution** dengan pendekatan **Privacy-by-Design (Kepatuhan UU PDP)**. Seluruh proses pembacaan citra QRIS, pembedahan struktur TLV EMVCo, hingga pengaburan identitas kriptografi (*SHA-256 Blind Hashing*) dilakukan sepenuhnya di dalam peramban (*browser*) pengguna tanpa menyimpan data mentah transaksi di server.

```text
[Input Pengguna: Upload Gambar QRIS / String EMVCo / Simulasi]
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ 1. CLIENT-SIDE INGESTION & TLV DECODER (qris-decoder.js) │
│    - Dekode piksel QR via jsQR (100% di memori lokal)    │
│    - Ekstraksi Tag 59 (Nama), Tag 52 (MCC), Tag 60 (Kota)│
│    - Ekstraksi Sub-TLV Tag 26/51 (Domain PJP & NMID)     │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│ 2. ZERO-KNOWLEDGE CRYPTO LAYER (security.js)             │
│    - Web Crypto API (SHA-256 Blind Hashing pada NMID)    │
│    - Sanitasi Anti-XSS ketat via DOMPurify               │
│    - Generator Kupon Audit Digital Anonim                │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│ 3. HYBRID THREAT INTELLIGENCE (threat-analyzer.js)       │
│    - Cross-check konsistensi MCC vs Leksikal Nama        │
│    - Pencocokan SHA-256 Hash terhadap indikator Blacklist│
│    - Google Gemini 2.5 Flash API (Structured JSON Output)│
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼
[Output UI: Risk Meter Lampu Lalu Lintas + AI Insight + Bukti Cek Anonim]
