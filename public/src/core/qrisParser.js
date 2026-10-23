/**
 * ============================================================
 * Q-SPECT - public/src/core/qrisParser.js
 * Domain: Production EMVCo TLV & Sub-TLV Parser, CRC-16 Engine,
 * Anti-False-Positive Heuristics, Transaction Laundering &
 * Shell Company Masking Detector
 * ============================================================
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.QRISParser = factory();
    // Kompatibilitas alias dengan modul root decoder
    root.QRISDecoder = root.QRISParser;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ── 1. CRC-16 / CCITT-FALSE Checksum Engine ───────────────────
  // Polinomial: 0x1021, Initial: 0xFFFF, XorOut: 0x0000
  function calculateCRC16CCITT(str) {
    let crc = 0xFFFF;
    for (let c = 0; c < str.length; c++) {
      crc ^= (str.charCodeAt(c) << 8);
      for (let i = 0; i < 8; i++) {
        if ((crc & 0x8000) !== 0) {
          crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
        } else {
          crc = (crc << 1) & 0xFFFF;
        }
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  function validateQRISChecksum(payload) {
    if (!payload || typeof payload !== 'string' || payload.length < 8) {
      return { isValid: false, expected: '', actual: '', error: 'Payload terlalu pendek' };
    }
    const crcTagIndex = payload.lastIndexOf('6304');
    if (crcTagIndex === -1) {
      return { isValid: false, expected: '', actual: '', error: 'Tag CRC 6304 tidak ditemukan' };
    }
    const dataToHash = payload.substring(0, crcTagIndex + 4);
    const actualCRC = payload.substring(crcTagIndex + 4, crcTagIndex + 8).toUpperCase();
    const expectedCRC = calculateCRC16CCITT(dataToHash);
    return {
      isValid: actualCRC === expectedCRC,
      expected: expectedCRC,
      actual: actualCRC,
      dataLength: dataToHash.length
    };
  }

  // ── 2. MCC Dictionary & Warung Mikro Definitions ──────────────
  const MCC_MAP = {
    '4812': 'Peralatan Telekomunikasi & Konter Pulsa/HP',
    '4814': 'Layanan Telekomunikasi & Voucher Digital',
    '5411': 'Toko Kelontong & Minimarket (Warung Mikro)',
    '5732': 'Toko Elektronik & Gadget (Digital Equipment)',
    '5812': 'Rumah Makan & Restoran (UMKM Kuliner)',
    '5814': 'Restoran Cepat Saji / Warung Minuman',
    '5816': 'Barang Digital, Voucher & Game Online (High Risk)',
    '5999': 'Toko Retail Aneka Barang (Ritel Mikro)',
    '7299': 'Jasa Perorangan / Usaha Mikro Lainnya',
    '7994': 'Video Game / Arkade / Hiburan (Anomali Kotak Amal)',
    '7995': 'Taruhan, Lotere & Kasino (High Risk Judol)',
    '8398': 'Organisasi Amal & Donasi Sosial (Amal Sah)',
    '8661': 'Organisasi Keagamaan / Rumah Ibadah (Masjid Sah)',
    '4121': 'Taksi & Transportasi Umum',
    '7230': 'Pangkas Rambut & Salon'
  };

  // MCC yang sering disalahgunakan untuk rekening penampungan deposit judol
  const LAUNDERING_SUSPECT_MCCS = ['4812', '4814', '5732', '5816', '5411', '5812', '5814', '5999', '7299', '7994', '7995'];
  const MICRO_MERCHANT_MCCS = ['5411', '5812', '5814', '5999', '7299'];

  function getMCCDescription(mccCode) {
    return MCC_MAP[mccCode] || `Kategori Khusus (${mccCode || 'Umum'})`;
  }

  // ── 3. Sub-TLV Parser (Tag 26-51 dan Tag 62) ──────────────────
  function parseSubTLV(str) {
    const subTags = {};
    if (!str || typeof str !== 'string') return subTags;
    let cursor = 0;
    while (cursor < str.length - 3) {
      const tag = str.substring(cursor, cursor + 2);
      const len = parseInt(str.substring(cursor + 2, cursor + 4), 10);
      if (isNaN(len) || cursor + 4 + len > str.length) break;
      const val = str.substring(cursor + 4, cursor + 4 + len);
      subTags[tag] = val;
      cursor += 4 + len;
    }
    return subTags;
  }

  // ── 4. Daftar Kata Kunci Ancaman Judol & Amal ──────────────────
  const JUDOL_KEYWORDS = [
    'SLOT', 'DEPO', 'TOPUP', 'HOKI', 'JP', 'VIP', 'WAP',
    'CASINO', 'BET', 'GAMES', 'MAXWIN', 'ZEUS', 'GACOR',
    'PRAGMATIC', 'OLYMPUS', 'SCATTER', 'TOGEL', 'POKER',
    'TUKUL777', '777', '888', '999', 'SLOT777', 'GACOR777'
  ];

  // Regex kamuflase merchant cangkang (Phone/Pulsa, Toko Online generic, APL12, dsb)
  const SHELL_MERCHANT_REGEX = /(DIGICELL|CELL|PULSA|PHONE|RELOAD|VOUCHER|TOKO\s+ONLINE|STORE\s+ONLINE|ONLINE\s+SHOP|APL\d+|BOT\d*|TRX\d*|\.{2,}|_{2,}|-{2,}|\bCV\b|\bPT\b|\bUD\b|\d{3,})/i;

  const CHARITY_KEYWORDS = [
    'MASJID', 'MUSHOLLA', 'INFAQ', 'SEDEKAH', 'YAYASAN',
    'DONASI', 'ZAKAT', 'PESANTREN', 'BAITUL MAL', 'PANTI ASUHAN'
  ];

  // ── 5. EMVCo TLV Full Parser dengan .trim() Protektif ─────────
  function parseEMVCo(payload) {
    const rawString = typeof payload === 'string' ? payload.trim() : '';

    if (!rawString) {
      return { success: false, error: 'Payload QRIS kosong' };
    }

    // A. Deteksi Tautan Luar (Quishing URL Guard)
    if (rawString.startsWith('http://') || rawString.startsWith('https://') || rawString.startsWith('www.')) {
      const quishingResult = {
        success: true,
        isQuishingUrl: true,
        quishingUrl: rawString,
        merchantName: 'URL REDIRECT (BUKAN QRIS RESMI)',
        city: 'Domain Luar / Phishing',
        amount: null,
        mcc: '0000',
        mccDesc: 'Situs Eksternal / Tautan Quishing',
        rawNMID: '',
        crcValid: false,
        rawPayload: rawString,
        tags: {},
        heuristics: {
          riskScore: 98,
          verdict: 'BAHAYA',
          detectedCategory: 'QUISHING_URL',
          flags: ['QUISHING_URL_DETECTED'],
          technicalReason: 'Peringatan Keamanan Kritis: QR memuat tautan web eksternal (Quishing), bukan format EMVCo perbankan resmi.'
        }
      };
      console.log("RAW QRIS STRING:", rawString);
      console.log("Parsed TLV Result:", quishingResult);
      console.log("Detected Risk Score:", quishingResult.heuristics.riskScore, quishingResult.heuristics.verdict);
      return quishingResult;
    }

    // B. Parser Tag-Length-Value
    const tags = {};
    let cursor = 0;

    try {
      while (cursor < rawString.length - 3) {
        const tag = rawString.substring(cursor, cursor + 2);
        const len = parseInt(rawString.substring(cursor + 2, cursor + 4), 10);
        if (isNaN(len) || cursor + 4 + len > rawString.length) {
          break;
        }
        const val = rawString.substring(cursor + 4, cursor + 4 + len);
        tags[tag] = val;
        cursor += 4 + len;
      }
    } catch (e) {
      return { success: false, error: 'Format EMVCo korup: ' + e.message };
    }

    // Ekstraksi Tag Kunci
    const formatIndicator = tags['00'] || '';
    const initiationMethod = tags['01'] || ''; // 11 = Statis, 12 = Dinamis
    const isDynamic = initiationMethod === '12';
    const mcc = tags['52'] || '';
    const currency = tags['53'] || '360';
    const amount = tags['54'] ? parseFloat(tags['54']) : null;
    const country = tags['58'] || 'ID';
    const merchantName = (tags['59'] || 'UNKNOWN MERCHANT').trim();
    const city = tags['60'] || 'INDONESIA';
    const postalCode = tags['61'] || '';

    // Ekstraksi Tag 26 s/d 51 (NMID & Acquirer)
    let rawNMID = '';
    let acquirer = '';
    let merchantCriteria = '';
    let subAccountTags = {};
    for (let t = 26; t <= 51; t++) {
      const tagKey = t.toString().padStart(2, '0');
      if (tags[tagKey]) {
        const sub = parseSubTLV(tags[tagKey]);
        if (sub['02']) rawNMID = sub['02'];
        if (sub['00']) acquirer = sub['00'];
        if (sub['03']) merchantCriteria = sub['03'];
        subAccountTags[tagKey] = sub;
      }
    }

    // Ekstraksi Tag 62 (Additional Data / Reference ID / Terminal ID)
    let billNumber = '';
    let referenceId = '';
    let terminalId = '';
    let storeLabel = '';
    let sub62 = {};
    if (tags['62']) {
      sub62 = parseSubTLV(tags['62']);
      if (sub62['01']) billNumber = sub62['01'];
      if (sub62['05']) referenceId = sub62['05'];
      if (sub62['07']) terminalId = sub62['07'];
      if (sub62['03']) storeLabel = sub62['03'];
    }

    // C. Validasi Checksum CRC-16
    const checksumResult = validateQRISChecksum(rawString);

    // D. Saringan Heuristik Lapis 2: Judol, Transaction Laundering, & Shell Company Masking
    const heuristics = evaluateQRISHeuristics({
      rawString,
      isDynamic,
      amount,
      mcc,
      merchantName,
      crcValid: checksumResult.isValid,
      actualCRC: checksumResult.actual,
      expectedCRC: checksumResult.expected,
      rawNMID,
      tag62Present: Boolean(tags['62']),
      billNumber,
      referenceId,
      terminalId
    });

    const parsedResult = {
      success: true,
      isQuishingUrl: false,
      rawPayload: rawString,
      formatIndicator,
      isDynamic,
      initiationMethod,
      mcc,
      mccDesc: getMCCDescription(mcc),
      currency,
      amount,
      country,
      merchantName,
      city,
      postalCode,
      rawNMID,
      acquirer,
      merchantCriteria,
      billNumber,
      referenceId,
      terminalId,
      storeLabel,
      crcValid: checksumResult.isValid,
      expectedCRC: checksumResult.expected,
      actualCRC: checksumResult.actual,
      tags,
      subAccountTags,
      sub62,
      heuristics
    };

    console.log("RAW QRIS STRING:", rawString);
    console.log("Parsed TLV Result:", parsedResult);
    console.log("Detected Risk Score:", heuristics.riskScore, heuristics.verdict);

    return parsedResult;
  }

  // ── 6. Engine Heuristik Spesifik: Transaction Laundering & Shell Company
  function evaluateQRISHeuristics(ctx) {
    const flags = [];
    let riskScore = 12; // Baseline aman
    let verdict = 'AMAN';
    let detectedCategory = 'VALID_MERCHANT';
    let technicalReason = 'Struktur EMVCo QRIS sesuai standar, checksum valid, dan merchant terverifikasi wajar.';

    // 1. Checksum Check
    if (!ctx.crcValid) {
      flags.push('CRC16_CHECKSUM_INVALID');
      return {
        riskScore: 92,
        verdict: 'BAHAYA',
        detectedCategory: 'CRC_INVALID',
        flags,
        technicalReason: `Manipulasi Checksum Terdeteksi! CRC tertera (${ctx.actualCRC || 'KOSONG'}) berbeda dari kalkulasi standar (${ctx.expectedCRC}). Payload QRIS kemungkinan telah disunting secara ilegal.`
      };
    }

    const upperName = (ctx.merchantName || '').toUpperCase();
    const isLaunderingMCC = LAUNDERING_SUSPECT_MCCS.includes(ctx.mcc);
    const isMicroMCC = MICRO_MERCHANT_MCCS.includes(ctx.mcc);

    // 2. Anomali Nama: Deteksi Kata Kunci Eksplisit Judol
    const matchedJudolKeywords = JUDOL_KEYWORDS.filter(kw => {
      const regex = new RegExp(`(^|\\b|\\s|_|-)${kw}(\\b|\\s|_|-|\\d|$)`, 'i');
      return regex.test(upperName);
    });

    // 3. Anomali Nama: Pola Perusahaan Cangkang / Shell Company Masking
    const hasEntityPrefix = /^(CV|PT|UD)[\s._-]/i.test((ctx.merchantName || '').trim());
    const hasNumberSequence = /\d{3,}/.test(ctx.merchantName || '');
    const hasShellPattern = SHELL_MERCHANT_REGEX.test(ctx.merchantName || '');
    const isSuspiciousEntityName = hasEntityPrefix || hasNumberSequence || hasShellPattern;

    // 4. Deteksi Nominal 3 Digit Unik Acak
    const hasUnique3DigitCents = ctx.amount !== null &&
                                ctx.amount > 0 &&
                                (ctx.amount % 1000 !== 0) &&
                                (ctx.amount % 500 !== 0);

    // 5. Deteksi Kode Tiket Otomatis Tag 62 (Automated Payment Gateway Order / Bill Number)
    const ticketId = (ctx.referenceId || ctx.billNumber || ctx.storeLabel || '').trim();
    const hasHighEntropyTicket = ticketId.length >= 10;

    // 6. Kombinasi Heuristik Tiket Deposit Judol (Transaction Laundering)
    const isDynamicLocked = ctx.isDynamic && ctx.amount !== null && ctx.amount > 0;
    const isLaunderingSuspect = isDynamicLocked && (isLaunderingMCC || hasHighEntropyTicket);

    // EVALUASI PRIORITAS ANCAMAN TIKET JUDOL
    // Aturan 1: Kata Kunci Judol Eksplisit
    if (matchedJudolKeywords.length > 0) {
      flags.push('JUDOL_KEYWORD_DETECTED');
      if (isLaunderingSuspect) flags.push('TRANSACTION_LAUNDERING_CONFIRMED');

      riskScore = 98;
      verdict = 'BAHAYA';
      detectedCategory = 'JUDOL_DEPOSIT_TICKET';
      technicalReason = `Tiket Deposit Judol Terdeteksi! Nama merchant memuat indikator terselubung (${matchedJudolKeywords.join(', ')}) dengan struktur transaksi terkunci untuk deposit judi online.`;
      return { riskScore, verdict, detectedCategory, flags, technicalReason };
    }

    // Aturan 2: Pencucian Transaksi Real-World (Mendeteksi Real Judol NeoCommerce/Inacash/Sampoerna)
    // QRIS Dinamis + Nominal Terkunci + Kode Tiket Gateway Tag 62 + (Nama Cangkang ATAU MCC High-Risk Pulsa/Game/Elektronik ATAU Nominal Unik)
    if (isDynamicLocked && hasHighEntropyTicket && (isSuspiciousEntityName || ['5816', '4812', '4814', '5732'].includes(ctx.mcc) || hasUnique3DigitCents)) {
      flags.push('TRANSACTION_LAUNDERING_CONFIRMED');
      flags.push('AUTOMATED_PG_TICKET');
      if (isSuspiciousEntityName) flags.push('SHELL_COMPANY_MASKING');
      if (hasUnique3DigitCents) flags.push('UNIQUE_3DIGIT_AMOUNT');

      riskScore = 97;
      verdict = 'BAHAYA';
      detectedCategory = 'JUDOL_DEPOSIT_TICKET';
      technicalReason = `Pencucian Transaksi Deposit Judi Online Terdeteksi! QRIS dinamis terkunci Rp ${ctx.amount.toLocaleString('id-ID')} dengan tiket gateway otomatis ("${ticketId.substring(0, 16)}...") pada merchant cangkang "${ctx.merchantName}" (${getMCCDescription(ctx.mcc)}). Pola transaksi ini identik dengan rekening penampungan deposit judol bot.`;
      return { riskScore, verdict, detectedCategory, flags, technicalReason };
    }

    // Aturan 3: Nominal Cents Unik Acak pada MCC Penampungan
    if (isLaunderingSuspect && hasUnique3DigitCents) {
      flags.push('TRANSACTION_LAUNDERING_SUSPECT');
      flags.push('UNIQUE_3DIGIT_AMOUNT');

      riskScore = 95;
      verdict = 'BAHAYA';
      detectedCategory = 'JUDOL_DEPOSIT_TICKET';
      technicalReason = `Anomali Tiket Deposit: QRIS dinamis terkunci Rp ${ctx.amount.toLocaleString('id-ID')} dengan Reference ID Payment Gateway pada MCC toko mikro (${ctx.mcc}). Mengindikasikan deposit bot otomatis.`;
      return { riskScore, verdict, detectedCategory, flags, technicalReason };
    }

    // 7. Heuristik Kotak Amal Mismatch MCC (Sticker Tampering / Penipuan Donasi)
    const isCharityName = CHARITY_KEYWORDS.some(kw => upperName.includes(kw));
    const isValidCharityMCC = ['8398', '8661'].includes(ctx.mcc);

    if (isCharityName && !isValidCharityMCC) {
      flags.push('CHARITY_MCC_MISMATCH');
      riskScore = 78;
      verdict = 'DICURIGAI';
      detectedCategory = 'STICKER_TAMPERING';
      technicalReason = `Anomali Kotak Amal: Nama merchant berlabel tempat ibadah/amal ("${ctx.merchantName}"), namun terdaftar di bawah MCC ${ctx.mcc} (${getMCCDescription(ctx.mcc)}). Waspada stiker QRIS tempelan palsu!`;
      return { riskScore, verdict, detectedCategory, flags, technicalReason };
    }

    // 8. False-Positive Protection for Legitimate UMKM:
    // Jika warung mikro dengan nominal bulat dan bukan merchant cangkang/tiket bot -> AMAN
    if (ctx.isDynamic && ctx.amount && (ctx.amount % 1000 === 0 || ctx.amount % 500 === 0) && isMicroMCC && !hasHighEntropyTicket && !isSuspiciousEntityName) {
      flags.push('LEGITIMATE_DYNAMIC_POS');
      riskScore = 15;
      verdict = 'AMAN';
      detectedCategory = 'VALID_MERCHANT';
      technicalReason = `Transaksi kasir dinamis normal pada ${getMCCDescription(ctx.mcc)}. Nominal wajar Rp ${ctx.amount.toLocaleString('id-ID')}.`;
      return { riskScore, verdict, detectedCategory, flags, technicalReason };
    }

    return { riskScore, verdict, detectedCategory, flags, technicalReason };
  }

  // ── 7. Generator 5 Preset Demo Dinamis (Pitching-Ready) ───────
  function getDemoPresets() {
    return {
      // 1. UMKM Bersih
      cleanUMKM: buildValidQRISPayload({
        '00': '01',
        '01': '11', // Statis
        '26': '0016ID.CO.QRIS.WWW01189360099900010029110214ID10200000029110303UMI',
        '51': '0014ID.LINKAJA.WWW0215ID1020000002911',
        '52': '5812', // Restoran / Warung Kopi
        '53': '360',
        '58': 'ID',
        '59': 'WARUNG KOPI KENANGAN',
        '60': 'JAKARTA SELATAN',
        '61': '12190'
      }),

      // 2. Kotak Amal Mismatch MCC (Infaq tapi MCC Game 7994)
      charityMismatch: buildValidQRISPayload({
        '00': '01',
        '01': '11',
        '26': '0016ID.CO.QRIS.WWW01189360099900010088220214ID10200000088220303UMI',
        '52': '7994', // Mismatch! Video Game bukannya 8398 / 8661
        '53': '360',
        '58': 'ID',
        '59': 'INFAQ MASJID AL-IKHLAS',
        '60': 'BANDUNG',
        '61': '40115'
      }),

      // 3. Tiket Depo Judol Dinamis (Slot Gacor + Nominal Unik + Tag 62 Ref ID)
      judolTicket: buildValidQRISPayload({
        '00': '01',
        '01': '12', // Dinamis
        '26': '0016ID.CO.QRIS.WWW01189360099900010077330214ID10200000077330303UMI',
        '52': '5411', // Toko Kelontong Mikro
        '53': '360',
        '54': '50137', // 3 digit unik acak (tiket deposit)
        '58': 'ID',
        '59': 'SLOT GACOR JP MAXWIN',
        '60': 'MEDAN',
        '61': '20111',
        '62': '0109DEP-992140510PG-SLOT-01'
      }),

      // 4. Quishing URL Phishing
      quishingUrl: 'https://qris-bca-verifikasi-dana.vip/login?auth=99281',

      // 5. Checksum Manipulasi (CRC16 Rusak / DEAD)
      checksumTampered: (() => {
        const valid = buildValidQRISPayload({
          '00': '01',
          '01': '11',
          '26': '0016ID.CO.QRIS.WWW01189360099900010011440214ID10200000011440303UMI',
          '52': '5812',
          '53': '360',
          '58': 'ID',
          '59': 'TOKO ELEKTRONIK JAYA',
          '60': 'SURABAYA',
          '61': '60111'
        });
        return valid.substring(0, valid.length - 4) + 'DEAD';
      })(),

      // 6. Real Judol Sample 1 (Tukul777 - Neo Commerce - Ku Toko Online Rp 50.000)
      realSampleTukul777: '00020101021226740025ID.CO.BANKNEOCOMMERCE.WWW011893600490800004640302120005501499550303UBE51550025ID.CO.BANKNEOCOMMERCE.WWW0215ID20266193875100303UBE5204581653033605405500005802ID5914Ku Toko Online6004GOWA6105902446233012230021133017917771816970703A016304C382',

      // 7. Real Judol Sample 2 (Inacash - Novaryn Digicell Apl12 Rp 50.000)
      realSampleDigicell: '00020101021226670015COM.INACASH.WWW01189360083137404093090215INAAB54173742770303UKE51440014ID.CO.QRIS.WWW0215ID10265499206050303UKE5204573253033605405500005802ID5922NOVARYN DIGICELL APL126013JAKARTA PUSAT610510730622105171792684176GP3JONS63048DF2',

      // 8. Real Judol Sample 3 (Bank Sampoerna - Irvan Phone.. Rp 20.000)
      realSampleSampoerna: '00020101021226750023ID.CO.BANKSAMPOERNA.WWW01189360052300000370100215ID10260003785870303UKE51450015ID.OR.GPNQR.WWW0215ID10265795548780303UKE5204481253033605405200005802ID5913IRVAN PHONE..6013JAKARTA TIMUR61051391062310120315630580434910986240703A016304DB34'
    };
  }

  function buildValidQRISPayload(tagDict) {
    let payload = '';
    const sortedKeys = Object.keys(tagDict).sort();
    for (const key of sortedKeys) {
      if (key === '63') continue;
      const val = tagDict[key];
      const lenStr = val.length.toString().padStart(2, '0');
      payload += `${key}${lenStr}${val}`;
    }
    payload += '6304';
    const crc = calculateCRC16CCITT(payload);
    return payload + crc;
  }

  // ── Public API Export ─────────────────────────────────────────
  return {
    calculateCRC16CCITT,
    validateQRISChecksum,
    parseSubTLV,
    parseEMVCo,
    evaluateQRISHeuristics,
    buildValidQRISPayload,
    getDemoPresets,
    getMCCDescription,
    MICRO_MERCHANT_MCCS,
    JUDOL_KEYWORDS,
    CHARITY_KEYWORDS
  };
});