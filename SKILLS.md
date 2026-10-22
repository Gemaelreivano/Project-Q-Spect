# SKILLS.md — Procedural Execution Recipes & Technical Playbook

Kumpulan prosedur teknis standar yang wajib diikuti oleh AI Agent saat membangun dan memodifikasi fitur di dalam repositori **Q-Spect**.

---

## Skill 1: Zero-Touch UI Generation via Google Stitch MCP
**Kondisi Pemicu**: Saat agen diminta membuat atau memperbarui desain antarmuka pengguna di Google Stitch.

### Prosedur Eksekusi:
1. Pastikan koneksi server MCP Stitch aktif melalui `.agents/mcp_config.json`.
2. Baca parameter warna dan hierarki komponen dari `DESIGN.md`.
3. Panggil tool `generate_screen_from_text` pada server MCP Stitch dengan payload prompt terstruktur berikut:
   > "Create a dark-mode cybersecurity web application interface named 'Q-Spect (QRIS Inspector & OSINT Analyzer)'. Use primary background #0B0F19 and card surface #111827. Include: (1) Header with shield icon and 'Client-Side Verified' badge, (2) Quick Demo Simulation bar with 3 preset buttons (Safe Emerald #10B981, Judol Danger Crimson #EF4444, Suspicious Amber #F59E0B), (3) Dashed drag-and-drop QRIS image scanner zone and raw EMVCo string input, (4) Two-column EMVCo decoded data display for Tag 59 Merchant Name and Tag 60 City, and (5) AI Threat Assessment result card showing Risk Score 0-100, status pill, OSINT findings list, and action recommendation."
4. Ekstrak hasil tata letak ke dalam komponen HTML5 dan CSS di `index.html` serta `css/style.css`.

---

## Skill 2: Client-Side EMVCo QRIS TLV Parsing
**Kondisi Pemicu**: Saat memproses string hasil pembacaan QR Code (`jsQR`) atau input string manual.

### Aturan Algoritma:
Standar QRIS (EMVCo) menggunakan struktur **TLV (Tag-Length-Value)**:
- **Tag**: 2 karakter angka (contoh: `"59"` untuk Nama Merchant, `"60"` untuk Kota).
- **Length**: 2 karakter angka yang menunjukkan panjang nilai (contoh: `"15"` berarti 15 karakter berikutnya adalah isi datanya).
- **Value**: Substring sepanjang `Length`.

```javascript
function parseEMVCo(rawString) {
  let index = 0;
  const result = {
    merchantName: "TIDAK TERDETEKSI",
    merchantCity: "TIDAK TERDETEKSI",
    raw: rawString
  };

  while (index < rawString.length) {
    const tag = rawString.substring(index, index + 2);
    const length = parseInt(rawString.substring(index + 2, index + 4), 10);
    if (isNaN(length) || length <= 0) break;

    const value = rawString.substring(index + 4, index + 4 + length);
    if (tag === "59") result.merchantName = value;
    if (tag === "60") result.merchantCity = value;

    index += 4 + length;
  }
  return result;
}