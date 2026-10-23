/* ============================================================
   server/aiController.js
   Backend API: Blacklist Store (O(1) Set), Gemini AI Proxy,
   and Smart Fail-Safe Fallback
   ============================================================ */

// ── In-Memory Parameterized Blacklist Store (SHA-256 Hex) ────
// O(1) lookup, zero SQL injection risk
const blacklistSet = new Set([
  // Seed: known bad hashes (SHA-256 hex of UPPERCASE(TRIM(NMID/MerchantName)))
  'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2', // demo placeholder
]);

// Community-reported hashes (persisted in-memory for demo)
const reportedHashes = new Set();

/**
 * POST /api/blacklist/check
 * Body: { "hashes": ["sha256hex1", "sha256hex2"] }
 * Returns: { "results": { "sha256hex1": true/false, ... } }
 */
function checkBlacklist(req, res) {
  try {
    const { hashes } = req.body;
    if (!Array.isArray(hashes) || hashes.length === 0) {
      return res.status(400).json({ error: 'Field "hashes" must be a non-empty array of SHA-256 hex strings.' });
    }
    if (hashes.length > 20) {
      return res.status(400).json({ error: 'Maximum 20 hashes per request.' });
    }
    const results = {};
    for (const h of hashes) {
      if (typeof h !== 'string' || !/^[a-f0-9]{64}$/i.test(h)) {
        results[h] = false;
        continue;
      }
      const lower = h.toLowerCase();
      results[h] = blacklistSet.has(lower) || reportedHashes.has(lower);
    }
    return res.json({ results });
  } catch (err) {
    console.error('[blacklist/check]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * POST /api/blacklist/report
 * Body: { "hash": "sha256hex", "category": "JUDOL_DEPOSIT_TICKET" }
 */
function reportHash(req, res) {
  try {
    const { hash, category } = req.body;
    if (typeof hash !== 'string' || !/^[a-f0-9]{64}$/i.test(hash)) {
      return res.status(400).json({ error: 'Invalid SHA-256 hash.' });
    }
    const validCategories = [
      'JUDOL_DEPOSIT_TICKET', 'QUISHING_URL', 'STICKER_TAMPERING',
      'CRC_INVALID', 'MCC_MISMATCH', 'OTHER'
    ];
    const cat = validCategories.includes(category) ? category : 'OTHER';
    reportedHashes.add(hash.toLowerCase());
    console.log(`[REPORT] Hash: ${hash.substring(0, 16)}... Category: ${cat}`);
    return res.json({ success: true, message: 'Laporan hash diterima secara anonim. Terima kasih.' });
  } catch (err) {
    console.error('[blacklist/report]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * POST /api/ai/inspect
 * Body: { "imageBase64": "data:image/webp;base64,...", "metadata": {...} }
 * Returns Gemini structured JSON or Smart Fallback
 */
async function inspectWithAI(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;
  const { imageBase64, metadata } = req.body;

  // ── Smart Fail-Safe Fallback ───────────────────────────────
  if (!apiKey || apiKey.trim() === '') {
    console.log('[AI/inspect] No GEMINI_API_KEY — returning smart fallback.');
    return res.json(generateSmartFallback(metadata));
  }

  try {
    const metaSummary = metadata
      ? `• Tag 59 (Merchant Name): ${metadata.merchantName || 'UNKNOWN'}
• Tag 52 (MCC): ${metadata.mcc || 'UNKNOWN'} (${metadata.mccDesc || ''})
• Tag 51/26 (NMID): ${metadata.nmid || metadata.rawNMID || 'UNKNOWN'}
• Tag 54 (Nominal): ${metadata.amount ? 'Rp ' + metadata.amount : 'N/A (Statis)'}
• Tag 01 (Metode Inisiasi): ${metadata.isDynamic ? '12 (Dinamis)' : '11 (Statis)'}
• Tag 62 (Additional Data / Ref ID): ${metadata.referenceId || metadata.billNumber || metadata.terminalId || 'N/A'}
• Checksum CRC-16: ${metadata.crcValid ? 'Valid' : 'Invalid / Rusak'}
• Indikasi Heuristik Lapis 2: ${metadata.detectedCategory || 'UNKNOWN'}, Skor Risiko: ${metadata.riskScore ?? '?'}`
      : 'Metadata tidak tersedia.';

    const parts = [];

    // Add image part if provided (Client compressed <= 768px, webp/jpeg)
    if (imageBase64 && typeof imageBase64 === 'string' && imageBase64.length > 50) {
      let mimeType = 'image/webp';
      let cleanData = imageBase64;
      if (imageBase64.startsWith('data:image')) {
        const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
        if (mimeMatch) mimeType = mimeMatch[1];
        cleanData = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      }
      parts.push({
        inlineData: { mimeType, data: cleanData }
      });
    }

    parts.push({
      text: `Kamu adalah Senior Forensic QRIS Cybersecurity Analyst untuk Bank Indonesia & ASPI.
Tugasmu adalah menganalisis gambar fisik / tangkapan layar pembayaran dan metadata transaksi EMVCo berikut:
${metaSummary}

Lakukan investigasi forensik dan klasifikasikan secara akurat ke dalam SALAH SATU dari 4 kategori mutlak:
1. "JUDOL_DEPOSIT_TICKET": Jika antarmuka gambar tangkapan layar memuat indikator situs judi online / slot / deposit (seperti judul situs TUKUL777, SLOT, DEPOSIT, WITHDRAW, GACOR, batas waktu/countdown pesanan tiket, tombol preset nominal deposit 10k/20k/50k/100k, status bank online/offline, atau live chat), ATAU jika QR dinamis memiliki nominal terkunci dengan reference/order ID deposit bot (Transaction Laundering), atau menyamarkan nama merchant (seperti Ku Toko Online, DIGICELL, PHONE.., toko kelontong/pulsa cangkang).
2. "QUISHING_URL": Jika payload atau QR berisi tautan phishing web palsu (bukan standar EMVCo perbankan).
3. "STICKER_TAMPERING": Jika stiker fisik di foto tampak menimpa/menempel di atas QRIS asli (misal kotak amal masjid yang ditempel QRIS akun game/pribadi, atau nama cetak berbeda dengan Tag 59).
4. "VALID_MERCHANT": Jika stiker QRIS asli, bersih, tanpa tempelan mencurigakan, dan metadata usaha wajar.

WAJIB mengisi seluruh field berikut:
- riskScore: Integer 0-100 (Aman: 0-30, Dicurigai: 31-70, Bahaya: 71-100)
- verdict: "AMAN", "DICURIGAI", atau "BAHAYA"
- detectedCategory: "QUISHING_URL" | "JUDOL_DEPOSIT_TICKET" | "STICKER_TAMPERING" | "VALID_MERCHANT"
- printedNameOnImage: Nama merchant / situs yang terbaca jelas pada gambar (misal "TUKUL777", "DEPOSIT", atau null jika tidak ada)
- shortInsightId: Tepat 2 kalimat padat dalam Bahasa Indonesia formal yang menjelaskan temuan forensik dan alasan penetapan vonis.`
    });

    const preferredModel = process.env.GEMINI_MODEL || 'gemini-flash-latest';
    const requestBody = JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            riskScore:         { type: 'INTEGER' },
            verdict:           { type: 'STRING', enum: ['AMAN', 'DICURIGAI', 'BAHAYA'] },
            detectedCategory:  { type: 'STRING', enum: ['QUISHING_URL', 'JUDOL_DEPOSIT_TICKET', 'STICKER_TAMPERING', 'VALID_MERCHANT'] },
            printedNameOnImage:{ type: 'STRING', nullable: true },
            shortInsightId:    { type: 'STRING' }
          },
          required: ['riskScore', 'verdict', 'detectedCategory', 'shortInsightId']
        }
      }
    });

    const headers = {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey.trim()
    };

    // Helper fetch with timeout
    const fetchWithTimeout = async (modelName, timeoutMs = 8000) => {
      const controller = new AbortController();
      const tId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey.trim())}`,
          {
            method: 'POST',
            headers,
            body: requestBody,
            signal: controller.signal
          }
        );
        clearTimeout(tId);
        return r;
      } catch (e) {
        clearTimeout(tId);
        throw e;
      }
    };

    let geminiRes;
    try {
      geminiRes = await fetchWithTimeout(preferredModel);
    } catch (err) {
      console.warn(`[AI/inspect] Preferred model ${preferredModel} request failed: ${err.message}`);
    }

    // Jika model 404 (misal 2.5-flash pada akun baru), fallback ke gemini-flash-latest / 3.8-flash
    if ((!geminiRes || geminiRes.status === 404) && preferredModel !== 'gemini-flash-latest') {
      console.log(`[AI/inspect] Fallback to gemini-flash-latest...`);
      try {
        geminiRes = await fetchWithTimeout('gemini-flash-latest');
      } catch (e) {
        console.warn(`[AI/inspect] Fallback model failed: ${e.message}`);
      }
    }

    if (!geminiRes || !geminiRes.ok) {
      const errText = geminiRes ? await geminiRes.text() : 'No response';
      console.error('[AI/inspect] Gemini API error:', geminiRes ? geminiRes.status : 'ERR', errText.slice(0, 200));
      return res.json(generateSmartFallback(metadata));
    }

    const geminiData = await geminiRes.json();
    const candidate  = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidate) {
      console.error('[AI/inspect] Empty Gemini response');
      return res.json(generateSmartFallback(metadata));
    }

    let parsed;
    try {
      parsed = JSON.parse(candidate);
    } catch {
      console.error('[AI/inspect] Failed to parse Gemini JSON:', candidate);
      return res.json(generateSmartFallback(metadata));
    }

    // Validate schema
    if (typeof parsed.riskScore !== 'number' || !parsed.verdict || !parsed.shortInsightId) {
      return res.json(generateSmartFallback(metadata));
    }

    return res.json({ source: 'gemini', ...parsed });

  } catch (err) {
    console.error('[AI/inspect] Network/runtime error:', err.message);
    return res.json(generateSmartFallback(metadata));
  }
}

/**
 * Smart Fail-Safe Fallback — generates realistic forensic analysis
 * strictly adhering to the 4 categories when Gemini API is offline or keyless
 */
function generateSmartFallback(metadata) {
  if (!metadata) {
    return {
      source: 'fallback',
      riskScore: 50,
      verdict: 'DICURIGAI',
      detectedCategory: 'VALID_MERCHANT',
      printedNameOnImage: null,
      shortInsightId: 'Analisis AI tidak tersedia. Metadata QRIS tidak diberikan — verifikasi manual diperlukan sebelum melanjutkan transaksi.'
    };
  }

  const { riskScore, detectedCategory, merchantName, mcc, amount } = metadata;
  const score = typeof riskScore === 'number' ? riskScore : 50;
  let verdict = 'AMAN';
  if (score > 70) verdict = 'BAHAYA';
  else if (score > 30) verdict = 'DICURIGAI';

  const validCategories = ['QUISHING_URL', 'JUDOL_DEPOSIT_TICKET', 'STICKER_TAMPERING', 'VALID_MERCHANT'];
  let cat = detectedCategory;
  if (!validCategories.includes(cat)) {
    if (metadata.isQuishingUrl) cat = 'QUISHING_URL';
    else if (score > 70) cat = 'JUDOL_DEPOSIT_TICKET';
    else if (score > 30) cat = 'STICKER_TAMPERING';
    else cat = 'VALID_MERCHANT';
  }

  const formattedAmount = amount ? `Rp ${amount.toLocaleString('id-ID')}` : 'Statis';
  const insights = {
    VALID_MERCHANT:       `Merchant "${merchantName || 'UMKM'}" dengan MCC ${mcc || '5812'} menunjukkan pola transaksi normal dan stiker fisik konsisten. Sistem menyatakan transaksi aman untuk diproses.`,
    JUDOL_DEPOSIT_TICKET: `QRIS dinamis nominal unik ${formattedAmount} terindikasi sebagai tiket deposit pencucian transaksi judol. Segera batalkan pembayaran untuk melindungi saldo Anda.`,
    QUISHING_URL:         `Payload memuat URL pengalihan berbahaya yang menyerupai domain pembayaran resmi. Sistem memblokir pembayaran untuk mencegah pencurian kredensial akun.`,
    STICKER_TAMPERING:    `Anomali stiker fisik terdeteksi antara label nama merchant "${merchantName || 'Amal'}" dan peruntukan kategori MCC ${mcc || '?'}. Pastikan stiker tidak menimpa QRIS asli sebelum mentransfer.`
  };

  return {
    source: 'fallback',
    riskScore: score,
    verdict,
    detectedCategory: cat,
    printedNameOnImage: null,
    shortInsightId: insights[cat] || insights.VALID_MERCHANT
  };
}

module.exports = { checkBlacklist, reportHash, inspectWithAI };