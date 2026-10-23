# 🧪 DAFTAR SKENARIO PENGUJIAN OTOMATIS & VERIFIKASI FORENSIK Q-SPECT

Dokumen ini mendokumentasikan skenario pengujian untuk memverifikasi akurasi deterministik dari EMVCo TLV Parser, CRC-16/CCITT-FALSE, Heuristik Tiket Judol, Quishing URL, dan Zero-Knowledge Blind Hash.

---

## 📋 Tabel Skenario Pengujian (Hackathon Benchmark)

| No | Nama Skenario | Karakteristik Payload | Ekspektasi Checksum | Ekspektasi Skor Risiko | Keputusan Akhir | Kategori |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: |
| **TC-01** | **Clean UMKM (Warung Kopi Kenangan)** | Tag 52: 5812 (Restoran), Tag 54: Rp 25.000 (Bulat), Terminal ID kasir | `VALID` | `10 - 20` | `APPROVE / AMAN` | `CLEAN_MERCHANT` |
| **TC-02** | **Kotak Amal Mismatch MCC** | Tag 59: "Kotak Amal Masjid Raya", Tag 52: 7994 (Game/Arcade) | `VALID` | `60 - 80` | `WASPADA / ANOMALI` | `MCC_MISMATCH` |
| **TC-03** | **Tiket Depo Judol Dinamis** | Tag 01: 12 (Dinamis), Tag 54: Rp 50.387 (3 digit unik), Tag 62: Bill DEP9921 | `VALID` | `85 - 100` | `BAHAYA / BLOCKED` | `JUDOL_TICKET` |
| **TC-04** | **Quishing Link Phishing** | URL mentah `https://dana.id-bonus-claim.vip/login?auth=qris` | `FAIL (Non-EMVCo)` | `95 - 100` | `BAHAYA / BLOCKED` | `QUISHING_URL` |
| **TC-05** | **Manipulasi Checksum CRC** | Warung Berkah dengan nilai CRC16 diubah ke `DEAD` | `FAIL (CRC Mismatch)` | `90 - 100` | `BAHAYA / BLOCKED` | `CHECKSUM_TAMPER` |

---

## 🔬 Verifikasi Matematika Checksum CRC-16/CCITT-FALSE
* **Polinomial:** `0x1021` (`x^16 + x^12 + x^5 + 1`)
* **Initial Value:** `0xFFFF`
* **XorOut:** `0x0000`
* **Cakupan Byte:** Dari indeks karakter ke-0 hingga karakter `'4'` pada penanda tag `'6304'`.
* **Output Format:** 4 Digit Hexadesimal Huruf Kapital (contoh: `582E`, `F1DC`, `1E8D`).

---

## 🛡️ Verifikasi Zero-Knowledge Hashing (UU PDP No. 27/2022)
* **Algoritma:** `SHA-256`
* **Normalisasi Input:** `SHA256(UPPERCASE(TRIM(NMID)))`
* **Tujuan:** Memastikan nomor rekening dan identitas merchant dapat dicocokkan ke daftar hitam (blacklist) tanpa pernah membuka atau membocorkan data finansial mentah pengguna.
