/**
 * ============================================================
 * Q-SPECT - js/qris-decoder.js
 * Domain: EMVCo QRIS TLV Decoder, Exact CRC-16 Checksum Engine,
 * Quishing URL Detector, and 5 Dynamic Pitch Demo Presets
 * ============================================================
 */

(function (window) {
  'use strict';

  // 1. Exact CRC-16/CCITT-FALSE Checksum Engine
  // Polynomial: 0x1021, Initial Value: 0xFFFF, XorOut: 0x0000
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

  // 2. MCC (Merchant Category Code) Dictionary
  const MCC_MAP = {
    '4812': 'Peralatan Telekomunikasi & Konter Pulsa/HP',
    '4814': 'Layanan Telekomunikasi & Voucher Digital',
    '5411': 'Toko Kelontong & Minimarket',
    '5499': 'Toko Makanan & Minuman Khusus',
    '5732': 'Toko Elektronik & Gadget (Digital Equipment)',
    '5812': 'Rumah Makan & Restoran (UMKM Makanan)',
    '5814': 'Restoran Cepat Saji / Warung Minum',
    '5816': 'Barang Digital, Voucher & Game Online (High Risk)',
    '5999': 'Toko Retail Aneka Barang',
    '7299': 'Jasa Perorangan / Usaha Mikro Lainnya',
    '7994': 'Video Game / Arkade / Hiburan (Anomali Kotak Amal)',
    '7995': 'Taruhan, Lotere & Kasino (High Risk Judol)',
    '8398': 'Organisasi Amal & Donasi Sosial (Valid Amal)',
    '8661': 'Organisasi Keagamaan / Rumah Ibadah (Valid Masjid)',
    '4121': 'Taksi & Transportasi Umum',
    '7230': 'Pangkas Rambut & Salon'
  };

  function getMCCDescription(mccCode) {
    return MCC_MAP[mccCode] || `Kategori Khusus (${mccCode || 'Umum'})`;
  }

  // 3. Sub-TLV Parser (misal Tag 26-51 dan Tag 62)
  function parseSubTLV(str) {
    const subTags = {};
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

  // 4. EMVCo TLV Full Parser
  function parseEMVCo(payload) {
    if (!payload || typeof payload !== 'string') {
      return { success: false, error: 'Payload kosong' };
    }

    const trimmed = payload.trim();

    // Check if raw string is URL Quishing instead of QRIS EMVCo
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('www.')) {
      return {
        success: true,
        isQuishingUrl: true,
        quishingUrl: trimmed,
        merchantName: 'URL REDIRECT (BUKAN QRIS RESMI)',
        city: 'Domain Luar / Phishing',
        amount: null,
        mcc: '0000',
        mccDesc: 'Situs Eksternal / Quishing Link',
        rawNMID: '',
        crcValid: false,
        rawPayload: trimmed,
        tags: {}
      };
    }

    const tags = {};
    let cursor = 0;

    try {
      while (cursor < trimmed.length - 3) {
        const tag = trimmed.substring(cursor, cursor + 2);
        const len = parseInt(trimmed.substring(cursor + 2, cursor + 4), 10);
        if (isNaN(len) || cursor + 4 + len > trimmed.length) {
          break;
        }
        const val = trimmed.substring(cursor + 4, cursor + 4 + len);
        tags[tag] = val;
        cursor += 4 + len;
      }
    } catch (e) {
      return { success: false, error: 'Format EMVCo korup: ' + e.message };
    }

    // Ekstraksi Tag Kunci QRIS Nasional Indonesia
    const formatIndicator = tags['00'] || '';
    const initiationMethod = tags['01'] || ''; // 11 = Statis, 12 = Dinamis
    const mcc = tags['52'] || '';
    const currency = tags['53'] || '360';
    const amount = tags['54'] ? parseFloat(tags['54']) : null;
    const country = tags['58'] || 'ID';
    const merchantName = tags['59'] || 'UNKNOWN MERCHANT';
    const city = tags['60'] || 'INDONESIA';
    const postalCode = tags['61'] || '';

    // Ekstraksi NMID & Akun Merchant dari Tag 26 s/d 51
    let rawNMID = '';
    let acquirer = '';
    let merchantCriteria = '';
    for (let t = 26; t <= 51; t++) {
      const tagKey = t.toString().padStart(2, '0');
      if (tags[tagKey]) {
        const sub = parseSubTLV(tags[tagKey]);
        if (sub['02']) rawNMID = sub['02'];
        if (sub['00']) acquirer = sub['00'];
        if (sub['03']) merchantCriteria = sub['03'];
      }
    }

    // Ekstraksi Tag 62 (Additional Data / Bill Number / Reference ID / Terminal ID)
    let billNumber = '';
    let referenceId = '';
    let terminalId = '';
    if (tags['62']) {
      const sub62 = parseSubTLV(tags['62']);
      if (sub62['01']) billNumber = sub62['01'];
      if (sub62['05']) referenceId = sub62['05'];
      if (sub62['07']) terminalId = sub62['07'];
    }

    // Validasi CRC16
    const checksumResult = validateQRISChecksum(trimmed);

    const parsedResult = {
      success: true,
      isQuishingUrl: false,
      rawPayload: trimmed,
      formatIndicator,
      isDynamic: initiationMethod === '12',
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
      crcValid: checksumResult.isValid,
      expectedCRC: checksumResult.expected,
      actualCRC: checksumResult.actual,
      tags
    };

    console.log("RAW QRIS STRING:", payload);
    console.log("Parsed TLV Result:", parsedResult);

    return parsedResult;
  }

  // 5. Generator Payload QRIS Baku dengan Kalkulasi CRC-16 Dinamis
  function buildValidQRISPayload(tagDict) {
    let payload = '';
    const sortedKeys = Object.keys(tagDict).sort();
    for (const key of sortedKeys) {
      if (key === '63') continue; // CRC dihitung terakhir
      const val = tagDict[key];
      const lenStr = val.length.toString().padStart(2, '0');
      payload += `${key}${lenStr}${val}`;
    }
    payload += '6304';
    const crc = calculateCRC16CCITT(payload);
    return payload + crc;
  }

  // 6. 5 Built-in Pitch Demo Scenarios
  function getDemoPresets() {
    // Preset 1: UMKM Bersih (Warung Kopi Kenangan)
    const p1Tags = {
      '00': '01',
      '01': '11', // Statis
      '26': '0016ID.CO.QRIS.WWW01189360091800000000000215ID10200384729110303UMI',
      '52': '5812', // Rumah Makan
      '53': '360',
      '58': 'ID',
      '59': 'WARUNG KOPI KENANGAN',
      '60': 'JAKARTA SELATAN',
      '61': '12190'
    };
    const preset1 = buildValidQRISPayload(p1Tags);

    // Preset 2: Kotak Amal Mismatch MCC (Masjid tapi MCC Video Game 7994)
    const p2Tags = {
      '00': '01',
      '01': '11',
      '26': '0016ID.CO.QRIS.WWW01189360091800000000000215ID20240991823410303UMI',
      '52': '7994', // Mismatch! Video game arcade bukannya 8398 Amal
      '53': '360',
      '58': 'ID',
      '59': 'INFAQ MASJID AL-IKHLAS',
      '60': 'BEKASI',
      '61': '17144'
    };
    const preset2 = buildValidQRISPayload(p2Tags);

    // Preset 3: Tiket Depo Judol Dinamis (Nominal Unik 3 Digit Acak: Rp 50.137)
    const p3Tags = {
      '00': '01',
      '01': '12', // Dinamis
      '26': '0016ID.CO.QRIS.WWW01189360091800000000000215ID99812739019230303UMI',
      '52': '5499',
      '53': '360',
      '54': '50137', // 3 Digit Unik untuk Verifikasi Bot Otomatis
      '58': 'ID',
      '59': 'SLOT GACOR JP MAXWIN',
      '60': 'JAKARTA PUSAT',
      '61': '10110',
      '62': '0109DEP-99214'
    };
    const preset3 = buildValidQRISPayload(p3Tags);

    // Preset 4: Quishing URL (Phishing link berkedok QRIS)
    const preset4 = 'https://qris-bca-verifikasi-dana.vip/login?auth=99281&ref=judol303';

    // Preset 5: Manipulasi Checksum (CRC-16 Rusak / Disunting Manual)
    const p5Valid = buildValidQRISPayload({
      '00': '01',
      '01': '11',
      '26': '0016ID.CO.QRIS.WWW01189360091800000000000215ID10200891234560303UMI',
      '52': '5999',
      '53': '360',
      '58': 'ID',
      '59': 'TOKO ELEKTRONIK JAYA',
      '60': 'SURABAYA',
      '61': '60111'
    });
    // Ganti 4 karakter terakhir dengan CRC palsu "DEAD"
    const preset5 = p5Valid.substring(0, p5Valid.length - 4) + 'DEAD';

    return {
      cleanUMKM: preset1,
      charityMismatch: preset2,
      judolTicket: preset3,
      quishingUrl: preset4,
      checksumTampered: preset5,
      realSampleTukul777: '00020101021226740025ID.CO.BANKNEOCOMMERCE.WWW011893600490800004640302120005501499550303UBE51550025ID.CO.BANKNEOCOMMERCE.WWW0215ID20266193875100303UBE5204581653033605405500005802ID5914Ku Toko Online6004GOWA6105902446233012230021133017917771816970703A016304C382',
      realSampleDigicell: '00020101021226670015COM.INACASH.WWW01189360083137404093090215INAAB54173742770303UKE51440014ID.CO.QRIS.WWW0215ID10265499206050303UKE5204573253033605405500005802ID5922NOVARYN DIGICELL APL126013JAKARTA PUSAT610510730622105171792684176GP3JONS63048DF2',
      realSampleSampoerna: '00020101021226750023ID.CO.BANKSAMPOERNA.WWW01189360052300000370100215ID10260003785870303UKE51450015ID.OR.GPNQR.WWW0215ID10265795548780303UKE5204481253033605405200005802ID5913IRVAN PHONE..6013JAKARTA TIMUR61051391062310120315630580434910986240703A016304DB34'
    };
  }

  // 7. QR Decoder dari Gambar via BarcodeDetector / jsQR
  async function decodeQRFromImage(imageSource) {
    // Coba native BarcodeDetector browser dahulu
    if ('BarcodeDetector' in window) {
      try {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        const barcodes = await detector.detect(imageSource);
        if (barcodes && barcodes.length > 0) {
          return barcodes[0].rawValue;
        }
      } catch (err) {
        console.warn('BarcodeDetector gagal, fallback ke jsQR:', err);
      }
    }

    // Fallback: Gunakan jsQR jika tersedia di halaman
    if (typeof jsQR !== 'undefined') {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const width = imageSource.naturalWidth || imageSource.videoWidth || imageSource.width;
      const height = imageSource.naturalHeight || imageSource.videoHeight || imageSource.height;
      if (!width || !height) return null;

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(imageSource, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      });
      if (code && code.data) {
        return code.data;
      }
    }

    return null;
  }

  // Export to window.QRISDecoder
  window.QRISDecoder = {
    calculateCRC16CCITT,
    validateQRISChecksum,
    parseEMVCo,
    buildValidQRISPayload,
    getDemoPresets,
    decodeQRFromImage,
    MCC_MAP
  };

})(window);
