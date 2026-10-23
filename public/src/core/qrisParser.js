/**
 * Q-SPECT CORE ENGINE: EMVCo TLV Parser, CRC16 Validator & Anti-Fraud Heuristics
 * 3-Gate Forensic Pipeline (Quishing -> CRC16 -> Transaction Laundering Judol Heuristics)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.QrisParser = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  /**
   * GATE 2: CRC-16/CCITT-FALSE Calculator
   * Polynomial: 0x1021 | Initial: 0xFFFF | XorOut: 0x0000
   * Standard EMVCo: Calculated from index 0 up to '6304'
   */
  function calculateCRC16(data) {
    let crc = 0xFFFF;
    for (let i = 0; i < data.length; i++) {
      const byte = data.charCodeAt(i) & 0xFF;
      crc ^= (byte << 8);
      for (let bit = 0; bit < 8; bit++) {
        if ((crc & 0x8000) !== 0) {
          crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
        } else {
          crc = (crc << 1) & 0xFFFF;
        }
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  function validateCRC(payload) {
    if (!payload || typeof payload !== 'string') return false;
    const crcTagIndex = payload.lastIndexOf('6304');
    if (crcTagIndex === -1 || payload.length < crcTagIndex + 8) {
      return false;
    }
    const dataToVerify = payload.substring(0, crcTagIndex + 4);
    const expectedCRC = payload.substring(crcTagIndex + 4, crcTagIndex + 8).toUpperCase();
    return calculateCRC16(dataToVerify) === expectedCRC;
  }

  /**
   * GATE 3: Recursive TLV and Sub-TLV Extraction
   */
  function parseTLV(raw) {
    const tags = {};
    let cursor = 0;

    while (cursor + 4 <= raw.length) {
      const tag = raw.substring(cursor, cursor + 2);
      const lenStr = raw.substring(cursor + 2, cursor + 4);
      const length = parseInt(lenStr, 10);

      if (isNaN(length) || cursor + 4 + length > raw.length) {
        break;
      }

      const value = raw.substring(cursor + 4, cursor + 4 + length);
      tags[tag] = value;
      cursor += 4 + length;
    }

    return tags;
  }

  function parseSubTLV(raw) {
    if (!raw) return {};
    return parseTLV(raw);
  }

  const MCC_MAP = {
    '5812': { label: 'Restoran / Rumah Makan', category: 'Food & Beverage', isMicro: true },
    '5814': { label: 'Kedai Cepat Saji / Warung Makan', category: 'Food & Beverage', isMicro: true },
    '5411': { label: 'Toko Kelontong / Swalayan', category: 'Grocery & Retail', isMicro: true },
    '5499': { label: 'Toko Makanan Khusus / Warung Mikro', category: 'Retail', isMicro: true },
    '5999': { label: 'Toko Aneka Barang Khusus', category: 'Retail', isMicro: true },
    '7299': { label: 'Jasa Perorangan Serba Aneka', category: 'Services', isMicro: true },
    '5311': { label: 'Toserba / Department Store', category: 'Retail', isMicro: false },
    '7994': { label: 'Video Game Arcades / Hiburan', category: 'Gaming & Amusement', isMicro: false },
    '7995': { label: 'Taruhan / Perjudian / Kasino', category: 'Gambling & Lottery', isMicro: false },
    '5732': { label: 'Toko Elektronik Komersial', category: 'Electronics', isMicro: false },
    '8661': { label: 'Organisasi Keagamaan / Rumah Ibadah', category: 'Charity & Religious', isMicro: true }
  };

  /**
   * Full EMVCo QRIS Parser (Gate 1 -> Gate 2 -> Gate 3)
   */
  function parseQRIS(payload) {
    if (!payload || typeof payload !== 'string') {
      return { isValid: false, error: 'Payload kosong' };
    }

    const cleanPayload = payload.trim();

    // GATE 1: Dual-Vector Quishing Check
    const urlPattern = /(https?:\/\/[^\s]+|\.slot|\.vip|\.top|\.tk|\.xyz|\.click|dana.*bonus|gacor)/i;
    const isUrl = urlPattern.test(cleanPayload) || cleanPayload.startsWith('http://') || cleanPayload.startsWith('https://');
    const hasValidPrefix = cleanPayload.startsWith('000201');

    if (!hasValidPrefix && isUrl) {
      return {
        isValid: true,
        isQuishing: true,
        gateFailed: 'GATE_1_QUISHING',
        merchantName: 'EXTERNAL_URL_REDIRECT',
        mcc: 'N/A',
        mccLabel: 'Tautan Phishing / Quishing',
        mccCategory: 'Quishing Threat',
        amount: null,
        isDynamic: true,
        city: 'INTERNET',
        nmid: 'N/A',
        billNumber: null,
        crcValid: false,
        rawPayload: cleanPayload,
        tags: {}
      };
    }

    // Parse TLV Tags
    const tags = parseTLV(cleanPayload);
    const hasBaseTags = tags['00'] && (tags['59'] || tags['51'] || tags['26']);

    if (!hasBaseTags) {
      return {
        isValid: false,
        gateFailed: 'GATE_1_FORMAT_INVALID',
        error: 'Awalan bukan format EMVCo standar (000201).'
      };
    }

    // GATE 2: CRC-16 Checksum
    const crcValid = validateCRC(cleanPayload);

    // GATE 3: Tag Deconstruction
    const isDynamic = tags['01'] === '12';

    // Merchant Account Info (Tag 26 - 51)
    let nmid = 'N/A';
    let acquirerDomain = 'N/A';
    for (let t = 26; t <= 51; t++) {
      const tagKey = t.toString().padStart(2, '0');
      if (tags[tagKey]) {
        const sub = parseSubTLV(tags[tagKey]);
        if (sub['02']) nmid = sub['02'];
        if (sub['00']) acquirerDomain = sub['00'];
        break;
      }
    }

    // Additional Data Field (Tag 62)
    const tag62 = tags['62'] ? parseSubTLV(tags['62']) : {};
    const billNumber = tag62['01'] || tag62['05'] || tag62['08'] || null;
    const terminalId = tag62['07'] || null;

    const mcc = tags['52'] || 'N/A';
    const mccInfo = MCC_MAP[mcc] || { label: `Kode Industri ${mcc}`, category: 'Lainnya', isMicro: false };

    const merchantName = (tags['59'] || 'MERCHANT TIDAK DIKETAHUI').trim();
    const city = (tags['60'] || 'INDONESIA').trim();
    const amount = tags['54'] ? parseFloat(tags['54']) : null;

    return {
      isValid: true,
      isQuishing: false,
      crcValid,
      isDynamic,
      merchantName,
      mcc,
      mccLabel: mccInfo.label,
      mccCategory: mccInfo.category,
      isMicroMcc: mccInfo.isMicro,
      city,
      amount,
      nmid,
      acquirerDomain,
      billNumber,
      terminalId,
      tags,
      rawPayload: cleanPayload
    };
  }

  /**
   * Evaluasi Forensik Judol & Laundering
   */
  function analyzeHeuristics(parsedData) {
    if (!parsedData || !parsedData.isValid) {
      return {
        riskScore: 95,
        verdict: 'BAHAYA',
        category: 'INVALID_PAYLOAD',
        insight: 'Format QRIS tidak memenuhi standar baku EMVCo perbankan.',
        flags: ['CORRUPTED_TLV_STRUCTURE']
      };
    }

    // Gate 1 Fail: Quishing
    if (parsedData.isQuishing) {
      return {
        riskScore: 98,
        verdict: 'BAHAYA',
        category: 'QUISHING_URL',
        insight: 'BAHAYA QUISHING: Payload QR memuat tautan URL berbahaya dan bukan kode pembayaran QRIS.',
        flags: ['RAW_URL_QUISHING_ATTACK', 'NON_EMVCO_PAYLOAD']
      };
    }

    // Gate 2 Fail: CRC16 Manipulation
    if (!parsedData.crcValid) {
      return {
        riskScore: 94,
        verdict: 'BAHAYA',
        category: 'CRC_INVALID',
        insight: 'INTEGRITAS GAGAL: Checksum CRC-16 tidak cocok. Kode QR terindikasi telah dimanipulasi atau terpotong.',
        flags: ['CRC16_CCITT_MISMATCH']
      };
    }

    const flags = [];
    const nameUpper = (parsedData.merchantName || '').toUpperCase();
    const amount = parsedData.amount;
    const billNumber = parsedData.billNumber;
    const isDynamic = parsedData.isDynamic;
    const mcc = parsedData.mcc;

    // HEURISTIK TIKET DEPOSIT JUDOL (2 DARI 3 KONDISI)
    let judolScoreCount = 0;

    // Kondisi a: Nominal Terkunci (Tag 54) > 0
    const hasLockedAmount = amount !== null && amount !== undefined && Number(amount) > 0;
    if (hasLockedAmount) {
      judolScoreCount++;
      flags.push('LOCKED_AMOUNT_PRESENT');
    }

    // Kondisi b: Reference ID Payment Gateway (Tag 62)
    const hasReferenceId = billNumber && billNumber.trim().length > 0;
    if (hasReferenceId) {
      judolScoreCount++;
      flags.push('GATEWAY_REFERENCE_ID_PRESENT');
    }

    // Kondisi c: Nama Merchant Mencurigakan / Cangkang (Tag 59)
    const judolKeywords = /(SLOT|DEPO|TOPUP|HOKI|JP|VIP|WAP|CASINO|BET|GAMES|MAXWIN|WD|ZEUS|PRAGMATIC|TOGEL)/;
    const genericShellEntity = /^(PT|CV|UD)\s+([A-Z0-9\s]{2,15}\d{2,})/;
    const microMccList = ['5411', '5812', '5999', '7299'];
    const isMicroMcc = microMccList.includes(mcc);

    const hasSuspiciousName = judolKeywords.test(nameUpper) || (genericShellEntity.test(nameUpper) && isDynamic && isMicroMcc);
    if (hasSuspiciousName) {
      judolScoreCount++;
      flags.push('SUSPICIOUS_MERCHANT_NAME_OR_SHELL');
    }

    // Vonis JUDOL_DEPOSIT_TICKET jika minimal 2 dari 3 kondisi terpenuhi
    if (judolScoreCount >= 2 && (judolKeywords.test(nameUpper) || isDynamic)) {
      return {
        riskScore: 96,
        verdict: 'BAHAYA',
        category: 'JUDOL_DEPOSIT_TICKET',
        insight: 'BAHAYA JUDOL: Terdeteksi kuat pola tiket deposit judi online dengan kombinasi nominal terkunci, reference ID payment gateway, atau nama cangkang.',
        flags: [...flags, 'TRANSACTION_LAUNDERING_SUSPECT']
      };
    }

    // Check MCC Mismatch Anomaly (e.g. Mosque / Charity claiming Game/Betting/Electronics MCC)
    const isCharityEntity = /(MASJID|INFAQ|SEDEKAH|ZAKAT|MUSHOLA|YAYASAN|AMAL|YATIM)/i.test(nameUpper);
    if (isCharityEntity && ['7994', '7995', '5732'].includes(mcc)) {
      return {
        riskScore: 78,
        verdict: 'WASPADA',
        category: 'MCC_MISMATCH',
        insight: 'ANOMALI KATEGORI USAHA: Nama tertera adalah entitas sosial/ibadah, namun kode MCC terdaftar pada kategori hiburan/game komersial.',
        flags: ['CHARITY_MCC_SEMANTIC_MISMATCH']
      };
    }

    // Anti False-Positive for clean UMKM
    if (['5812', '5814', '5411', '5499'].includes(mcc) || (parsedData.merchantName && !hasSuspiciousName)) {
      return {
        riskScore: 12,
        verdict: 'AMAN',
        category: 'CLEAN_MERCHANT',
        insight: 'TERVERIFIKASI SAH: Struktur EMVCo valid, kesesuaian MCC tepat untuk usaha mikro, dan tidak ditemukan indikasi manipulasi.',
        flags: ['CLEAN_EMVCO_SPECTRUM']
      };
    }

    return {
      riskScore: 20,
      verdict: 'AMAN',
      category: 'CLEAN_MERCHANT',
      insight: 'Pemeriksaan standar selesai: Format QRIS memenuhi standar regulasi tanpa anomali terdeteksi.',
      flags: []
    };
  }

  /**
   * Helper: Build Valid Payload with Calculated CRC
   */
  function buildValidQris({ tag01, nmid, mcc, amt, merchant, city, postal, tag62, corruptCrc }) {
    let res = '000201';
    res += `0102${tag01 || '11'}`;
    const pNmid = nmid || 'ID1020304050607';
    const sub = `0014ID.LINKAJA.WWW011893600911002112345602${pNmid.length.toString().padStart(2, '0')}${pNmid}`;
    res += `51${sub.length.toString().padStart(2, '0')}${sub}`;
    res += `5204${mcc || '5411'}`;
    res += '5303360';
    if (amt) {
      const amtStr = String(amt);
      res += `54${amtStr.length.toString().padStart(2, '0')}${amtStr}`;
    }
    res += '5802ID';
    const pMerchant = merchant || 'Toko Demo';
    res += `59${pMerchant.length.toString().padStart(2, '0')}${pMerchant}`;
    const pCity = city || 'Jakarta';
    res += `60${pCity.length.toString().padStart(2, '0')}${pCity}`;
    if (postal) {
      res += `61${postal.length.toString().padStart(2, '0')}${postal}`;
    }
    if (tag62) {
      res += `62${tag62.length.toString().padStart(2, '0')}${tag62}`;
    }
    res += '6304';
    const realCrc = calculateCRC16(res);
    return res + (corruptCrc ? 'DEAD' : realCrc);
  }

  /**
   * 5 Real Verified EMVCo Demo Presets
   */
  const DEMO_PRESETS = [
    {
      id: 'clean-umkm',
      name: '1. Warung Kopi Bersih (UMKM Sah)',
      tagline: 'Tag 5812 F&B, Nominal Rp 25.000 Bulat, Valid CRC-16',
      color: 'emerald',
      payload: buildValidQris({
        tag01: '11',
        mcc: '5812',
        amt: '25000',
        merchant: 'Warung Kopi Kenangan',
        city: 'Jakarta',
        postal: '12340',
        tag62: '0710POS-KASIR1'
      })
    },
    {
      id: 'mcc-mismatch',
      name: '2. Kotak Amal Mismatch MCC (Anomali)',
      tagline: 'Nama Masjid tapi Tag 52 terdaftar 7994 (Game/Arcade)',
      color: 'amber',
      payload: buildValidQris({
        tag01: '11',
        mcc: '7994',
        amt: '10000',
        merchant: 'Kotak Amal Masjid Raya',
        city: 'Jakarta',
        postal: '12340',
        tag62: '0709AMAL-BOX1'
      })
    },
    {
      id: 'judol-ticket',
      name: '3. Tiket Depo Judol Dinamis (Bahaya Kritis)',
      tagline: 'Dynamic Tag 01=12, Nominal Rp 50.387, Ref ID DEP9921, Keyword GACOR',
      color: 'rose',
      payload: buildValidQris({
        tag01: '12',
        mcc: '5411',
        amt: '50387',
        merchant: 'VIP-DEPO-GACOR88',
        city: 'Jakarta',
        postal: '12340',
        tag62: '0117DEP9921-TICKET88'
      })
    },
    {
      id: 'quishing-url',
      name: '4. Quishing URL Phishing (Bahaya Phishing)',
      tagline: 'Bukan QRIS Perbankan, melainkan Link Redirect Phishing .vip',
      color: 'rose',
      payload: 'https://dana.id-bonus-claim.vip/login?auth=qris'
    },
    {
      id: 'checksum-tamper',
      name: '5. Manipulasi Checksum CRC (Integritas Cacat)',
      tagline: 'Warung Berkah dengan CRC-16 dimutasi paksa ke DEAD',
      color: 'rose',
      payload: buildValidQris({
        tag01: '11',
        mcc: '5411',
        amt: '15000',
        merchant: 'Warung Berkah Barokah',
        city: 'Jakarta',
        postal: '12340',
        corruptCrc: true
      })
    }
  ];

  return {
    calculateCRC16,
    validateCRC,
    parseTLV,
    parseSubTLV,
    parseQRIS,
    analyzeHeuristics,
    buildValidQris,
    DEMO_PRESETS,
    MCC_MAP
  };
});
