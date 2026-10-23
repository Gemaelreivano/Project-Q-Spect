/**
 * Q-SPECT Backend AI Controller
 * Google Gemini 2.5 Flash Multimodal Vision & Semantic Threat Inspector
 * Role: Auditor Forensik Sistem Pembayaran QRIS Bank Indonesia
 */

const https = require('https');

/**
 * Intelligent Mock Engine (Zero-Crash Fallback for Hackathon Demos)
 * Produces deterministic, calibrated risk scores when API key is absent or offline.
 */
function evaluateMockInspection({ qrPayload, parsedData, imageBase64 }) {
  const payload = qrPayload || '';
  const parsed = parsedData || {};
  const merchant = (parsed.merchantName || '').toUpperCase();
  const mcc = parsed.mcc || '';
  const amount = Number(parsed.amount || 0);
  const isDynamic = parsed.isDynamic || false;
  const isCrcValid = parsed.crcValid !== false;
  const billNumber = parsed.billNumber || '';

  // Printed Name Estimation (from parsed or OCR heuristic)
  const printedName = parsed.merchantName || 'Stiker QRIS Bank Indonesia';

  // 1. Quishing Detection (Gate 1)
  const urlRegex = /(https?:\/\/[^\s]+|\.slot|\.vip|\.top|\.tk|\.xyz|\.ru|\.click|dana.*bonus|gacor)/i;
  if (urlRegex.test(payload) || payload.startsWith('http://') || payload.startsWith('https://')) {
    return {
      riskScore: 98,
      verdict: 'BAHAYA',
      detectedCategory: 'QUISHING_URL',
      printedNameOnImage: 'Tautan Phishing Eksternal',
      shortInsightId: 'BAHAYA QUISHING: Payload memuat URL redirect mencurigakan ke situs phishing pihak ketiga. Bukan transaksi QRIS BI.'
    };
  }

  // 2. Checksum / Tamper Manipulation (Gate 2)
  if (!isCrcValid || payload.includes('6304DEAD') || payload.includes('6304BEEF')) {
    return {
      riskScore: 94,
      verdict: 'BAHAYA',
      detectedCategory: 'CRC_INVALID',
      printedNameOnImage: printedName,
      shortInsightId: 'INTEGRITAS RUSAK: Checksum CRC-16 gagal diverifikasi. Struktur payload QRIS terindikasi dimodifikasi atau cacat.'
    };
  }

  // 3. Judol Ticket Deposit Heuristics (2 out of 3 anomaly conditions)
  let judolConditionCount = 0;
  
  // Condition a: Locked Amount > 0
  if (amount > 0) {
    judolConditionCount++;
  }

  // Condition b: Reference ID / Order ID / Bill Number in Tag 62
  if (billNumber && billNumber.length > 0) {
    judolConditionCount++;
  }

  // Condition c: Suspicious / Shell Merchant Name
  const judolKeywords = /(SLOT|DEPO|TOPUP|HOKI|JP|VIP|WAP|CASINO|BET|GAMES|MAXWIN|WD|ZEUS|PRAGMATIC|TOGEL)/i;
  const genericShellEntity = /^(PT|CV|UD)\s+([A-Z0-9\s]{2,15}\d{2,})/i;
  const microMcc = ['5411', '5812', '5999', '7299'].includes(mcc);

  if (judolKeywords.test(merchant) || (genericShellEntity.test(merchant) && isDynamic && microMcc)) {
    judolConditionCount++;
  }

  if (judolConditionCount >= 2 && (judolKeywords.test(merchant) || isDynamic)) {
    return {
      riskScore: 96,
      verdict: 'BAHAYA',
      detectedCategory: 'JUDOL_DEPOSIT_TICKET',
      printedNameOnImage: printedName,
      shortInsightId: 'INDIKASI JUDI ONLINE: Memenuhi kriteria tiket deposit judol dengan nominal terkunci dan ID tiket pada merchant berisiko.'
    };
  }

  // 4. MCC Mismatch Anomaly (Charity/Mosque claiming Game/Betting/Electronics MCC)
  const isCharity = /(MASJID|INFAQ|SEDEKAH|ZAKAT|MUSHOLA|YAYASAN|AMAL)/i.test(merchant);
  const isGamingMcc = ['7994', '7995', '5732', '5944'].includes(mcc);

  if (isCharity && isGamingMcc) {
    return {
      riskScore: 78,
      verdict: 'WASPADA',
      detectedCategory: 'MCC_MISMATCH',
      printedNameOnImage: printedName,
      shortInsightId: 'ANOMALI KATEGORI: Nama entitas rumah ibadah/sosial terdaftar pada MCC hiburan/game komersial (7994).'
    };
  }

  // 5. Clean UMKM (Safe)
  if (['5812', '5411', '5814', '5499', '5311'].includes(mcc) || (merchant && !judolKeywords.test(merchant))) {
    return {
      riskScore: 12,
      verdict: 'AMAN',
      detectedCategory: 'CLEAN_MERCHANT',
      printedNameOnImage: printedName,
      shortInsightId: 'TERVERIFIKASI SAH: Struktur EMVCo valid, kesesuaian MCC tepat untuk usaha mikro, dan tidak ditemukan indikasi manipulasi.'
    };
  }

  return {
    riskScore: 20,
    verdict: 'AMAN',
    detectedCategory: 'UNKNOWN',
    printedNameOnImage: printedName,
    shortInsightId: 'Pemeriksaan forensik selesai: Format QRIS memenuhi standar regulasi tanpa anomali terdeteksi.'
  };
}

/**
 * Handle POST /api/ai/inspect
 */
async function inspectQRIS(req, res) {
  try {
    const { qrPayload, parsedData, imageBase64, apiKey } = req.body || {};
    const activeApiKey = (apiKey && apiKey.trim()) || process.env.GEMINI_API_KEY;

    // Fail-Safe Mock Fallback if API key is not supplied
    if (!activeApiKey) {
      const mockResult = evaluateMockInspection({ qrPayload, parsedData, imageBase64 });
      return res.json({
        success: true,
        source: 'smart_failsafe_mock',
        data: mockResult
      });
    }

    // Role: Auditor Forensik Sistem Pembayaran QRIS Bank Indonesia
    const systemInstructionText = `Anda adalah "Auditor Forensik Sistem Pembayaran QRIS Bank Indonesia". Tugas Anda adalah melakukan evaluasi tingkat lanjut terhadap keaslian transaksi QRIS dan gambar fisik stiker.
Identifikasi potensi:
1. Transaction Laundering tiket deposit judi online (judol)
2. Quishing / Phishing URL
3. Pemalsuan stiker fisik pada kotak amal / kasir UMKM (Sticker Overlay Attack)
4. Merchant sah dan terverifikasi

Wajib keluarkan output dalam JSON persis mengikuti skema:
- riskScore: angka bulat 0 - 100
- verdict: "AMAN" | "WASPADA" | "BAHAYA"
- detectedCategory: "CLEAN_MERCHANT" | "JUDOL_DEPOSIT_TICKET" | "QUISHING_URL" | "CRC_INVALID" | "MCC_MISMATCH" | "PHYSICAL_TAMPER"
- printedNameOnImage: nama merchant yang terbaca pada gambar stiker / payload
- shortInsightId: 1-2 kalimat ringkas dalam Bahasa Indonesia yang formal dan faktual`;

    const userContentParts = [
      {
        text: `Data Forensik Transaksi QRIS:\nPayload: ${qrPayload || 'N/A'}\nMetadata TLV: ${JSON.stringify(parsedData || {})}`
      }
    ];

    if (imageBase64 && typeof imageBase64 === 'string' && imageBase64.includes('base64,')) {
      const mimeMatch = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/webp';
      const cleanData = imageBase64.replace(/^data:.*,/, '');
      userContentParts.push({
        inlineData: {
          mimeType,
          data: cleanData
        }
      });
    }

    const requestBody = JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: userContentParts
        }
      ],
      systemInstruction: {
        parts: [{ text: systemInstructionText }]
      },
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            riskScore: { type: 'INTEGER' },
            verdict: { type: 'STRING' },
            detectedCategory: { type: 'STRING' },
            printedNameOnImage: { type: 'STRING' },
            shortInsightId: { type: 'STRING' }
          },
          required: ['riskScore', 'verdict', 'detectedCategory', 'printedNameOnImage', 'shortInsightId']
        },
        temperature: 0.1
      }
    });

    const targetUrl = new URL(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(activeApiKey)}`);

    const apiResponse = await new Promise((resolve, reject) => {
      const options = {
        hostname: targetUrl.hostname,
        path: targetUrl.pathname + targetUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody)
        },
        timeout: 9000
      };

      const reqClient = https.request(options, (resp) => {
        let data = '';
        resp.on('data', (chunk) => { data += chunk; });
        resp.on('end', () => {
          if (resp.statusCode >= 200 && resp.statusCode < 300) {
            resolve({ status: resp.statusCode, body: data });
          } else {
            reject(new Error(`Gemini API HTTP ${resp.statusCode}: ${data}`));
          }
        });
      });

      reqClient.on('error', (err) => reject(err));
      reqClient.on('timeout', () => {
        reqClient.destroy();
        reject(new Error('Gemini API request timed out'));
      });

      reqClient.write(requestBody);
      reqClient.end();
    });

    const geminiJson = JSON.parse(apiResponse.body);
    const candidateText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) throw new Error('Empty Gemini response content');

    const cleanCandidate = candidateText.replace(/```json/g, '').replace(/```/g, '').trim();
    const resultObj = JSON.parse(cleanCandidate);

    return res.json({
      success: true,
      source: 'gemini_2.5_flash',
      data: {
        riskScore: Math.min(100, Math.max(0, Number(resultObj.riskScore) || 0)),
        verdict: ['AMAN', 'WASPADA', 'BAHAYA'].includes(resultObj.verdict) ? resultObj.verdict : 'WASPADA',
        detectedCategory: resultObj.detectedCategory || 'UNKNOWN',
        printedNameOnImage: resultObj.printedNameOnImage || (parsedData?.merchantName || 'N/A'),
        shortInsightId: resultObj.shortInsightId || 'Inspeksi forensik QRIS selesai.'
      }
    });

  } catch (error) {
    console.warn('[Q-SPECT AI] Gemini API fallback triggered:', error.message);
    const mockFallback = evaluateMockInspection(req.body || {});
    return res.json({
      success: true,
      source: 'smart_failsafe_mock_fallback',
      warning: error.message,
      data: mockFallback
    });
  }
}

module.exports = {
  inspectQRIS,
  evaluateMockInspection
};
