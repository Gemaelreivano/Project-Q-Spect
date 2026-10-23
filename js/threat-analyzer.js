/**
 * ============================================================
 * Q-SPECT - js/threat-analyzer.js
 * Domain: 3-Layer Funnel Heuristics (Quishing, Judol, Charity Mismatch)
 * & Google Gemini 2.5 Flash Multimodal Threat Intelligence
 * ============================================================
 */

(function (window) {
  'use strict';

  // 1. Kamus Kata Kunci Ancaman Judol & Indikator Rekening Penampungan
  const JUDOL_KEYWORDS = [
    'slot', 'gacor', 'depo', 'maxwin', 'zeus', 'jp', 'bet', 'poker',
    'casino', 'togel', 'pragmatic', 'olympus', 'hoki', 'cuan', 'jackpot',
    'member', 'kakek', 'sensasional', 'scatter', 'topup game', 'tukul777',
    '777', '888', '999', 'slot777', 'gacor777'
  ];

  // MCC yang sering disalahgunakan untuk rekening penampungan deposit judol
  const LAUNDERING_SUSPECT_MCCS = ['4812', '4814', '5732', '5816', '5411', '5812', '5814', '5999', '7299', '7994', '7995'];
  const MICRO_MERCHANT_MCCS = ['5411', '5812', '5814', '5999', '7299'];

  // Regex kamuflase merchant cangkang (Phone/Pulsa, Toko Online generic, APL12, dsb)
  const SHELL_MERCHANT_REGEX = /(DIGICELL|CELL|PULSA|PHONE|RELOAD|VOUCHER|TOKO\s+ONLINE|STORE\s+ONLINE|ONLINE\s+SHOP|APL\d+|BOT\d*|TRX\d*|\.{2,}|_{2,}|-{2,}|\bCV\b|\bPT\b|\bUD\b|\d{3,})/i;

  const CHARITY_KEYWORDS = [
    'masjid', 'musholla', 'infaq', 'sedekah', 'yayasan', 'donasi',
    'zakat', 'pesantren', 'baitul mal', 'panti asuhan'
  ];

  // 2. Evaluator Heuristik Lapis 1 & 2 (100% Client-Side)
  async function evaluateHeuristics(parsedQR) {
    const flags = [];
    let riskScore = 12; // Skor awal baseline (aman)
    let verdict = 'APPROVE / AMAN';
    let technicalReason = 'Struktur EMVCo QRIS sesuai standar, checksum valid, dan tidak terindikasi anomali.';
    let detectedCategory = 'VALID_MERCHANT';

    // LAPIS 1: Quishing URL & Checksum Integrity
    if (parsedQR.isQuishingUrl) {
      flags.push('QUISHING_URL_DETECTED');
      riskScore = 98;
      verdict = 'BAHAYA / PHISHING';
      detectedCategory = 'QUISHING_URL';
      technicalReason = 'Peringatan Keamanan Kritis: QR memuat tautan web eksternal (Quishing), bukan kode QRIS transaksi resmi perbankan.';
      return { riskScore, verdict, detectedCategory, technicalReason, flags };
    }

    if (!parsedQR.crcValid) {
      flags.push('CRC16_CHECKSUM_INVALID');
      riskScore = 92;
      verdict = 'BAHAYA / INVALID CHECKSUM';
      detectedCategory = 'CRC_INVALID';
      technicalReason = `Manipulasi Checksum Terdeteksi! CRC-16 tertera (${parsedQR.actualCRC || 'KOSONG'}) berbeda dari kalkulasi standar (${parsedQR.expectedCRC}). Payload mungkin telah disunting secara ilegal.`;
      return { riskScore, verdict, detectedCategory, technicalReason, flags };
    }

    // LAPIS 2A: Cek Blacklist SHA-256 NMID
    let hashedNMID = '';
    if (parsedQR.rawNMID && window.QSecurity) {
      hashedNMID = await window.QSecurity.hashNMID(parsedQR.rawNMID);
      const blCheck = await window.QSecurity.checkBlacklist(hashedNMID, parsedQR.rawPayload);
      if (blCheck.isBlacklisted) {
        flags.push('BLACKLIST_HASH_MATCH');
        riskScore = Math.max(riskScore, blCheck.detail.risk || 90);
        verdict = 'BAHAYA / BLOCKED';
        detectedCategory = 'JUDOL_DEPOSIT_TICKET';
        technicalReason = `NMID Masuk Daftar Hitam: ${blCheck.detail.reason}`;
      }
    }

    // LAPIS 2B: Heuristik Judol, Transaction Laundering, & Shell Company Masking
    const upperName = (parsedQR.merchantName || '').toUpperCase();
    const isLaunderingMCC = LAUNDERING_SUSPECT_MCCS.includes(parsedQR.mcc);
    const isMicroMCC = MICRO_MERCHANT_MCCS.includes(parsedQR.mcc);

    // 1. Deteksi Kata Kunci Terselubung
    const matchedJudolKeywords = JUDOL_KEYWORDS.filter(kw => {
      const regex = new RegExp(`(^|\\b|\\s|_|-)${kw.toUpperCase()}(\\b|\\s|_|-|\\d|$)`, 'i');
      return regex.test(upperName);
    });

    // 2. Deteksi Perusahaan Cangkang / Shell Company Masking
    const hasEntityPrefix = /^(CV|PT|UD)[\s._-]/i.test((parsedQR.merchantName || '').trim());
    const hasNumberSequence = /\d{3,}/.test(parsedQR.merchantName || '');
    const hasShellPattern = SHELL_MERCHANT_REGEX.test(parsedQR.merchantName || '');
    const isSuspiciousEntity = hasEntityPrefix || hasNumberSequence || hasShellPattern;

    // 3. Deteksi Nominal 3 Digit Unik Acak
    let hasUniqueNominal = false;
    if (parsedQR.isDynamic && parsedQR.amount) {
      const amt = Math.round(parsedQR.amount);
      if (amt % 1000 !== 0 && amt % 500 !== 0) {
        hasUniqueNominal = true;
      }
    }

    // 4. Deteksi Kode Tiket Otomatis Tag 62 (Automated PG Ticket)
    const ticketId = (parsedQR.referenceId || parsedQR.billNumber || parsedQR.terminalId || '').trim();
    const hasHighEntropyTicket = ticketId.length >= 10;
    const isDynamicLocked = parsedQR.isDynamic && parsedQR.amount !== null && parsedQR.amount > 0;
    const isLaunderingSuspect = isDynamicLocked && (isLaunderingMCC || hasHighEntropyTicket);

    // Prioritas 1: Kata Kunci Judol Eksplisit
    if (matchedJudolKeywords.length > 0) {
      flags.push('JUDOL_KEYWORD_DETECTED');
      if (isLaunderingSuspect) flags.push('TRANSACTION_LAUNDERING_CONFIRMED');
      riskScore = 98;
      verdict = 'BAHAYA';
      detectedCategory = 'JUDOL_DEPOSIT_TICKET';
      technicalReason = `Tiket Deposit Judol Terdeteksi! Nama merchant memuat indikator terselubung (${matchedJudolKeywords.join(', ')}) dengan struktur transaksi terkunci untuk deposit judi daring.`;
    }
    // Prioritas 2: Real-World Transaction Laundering (Contoh: NeoCommerce Ku Toko Online, Inacash Digicell, Bank Sampoerna Irvan Phone)
    else if (isDynamicLocked && hasHighEntropyTicket && (isSuspiciousEntity || ['5816', '4812', '4814', '5732'].includes(parsedQR.mcc) || hasUniqueNominal)) {
      flags.push('TRANSACTION_LAUNDERING_CONFIRMED');
      flags.push('AUTOMATED_PG_TICKET');
      if (isSuspiciousEntity) flags.push('SHELL_COMPANY_MASKING');
      if (hasUniqueNominal) flags.push('UNIQUE_3DIGIT_AMOUNT');
      riskScore = 97;
      verdict = 'BAHAYA';
      detectedCategory = 'JUDOL_DEPOSIT_TICKET';
      technicalReason = `Pencucian Transaksi Deposit Judi Online Terdeteksi! QRIS dinamis terkunci Rp ${parsedQR.amount.toLocaleString('id-ID')} dengan tiket gateway otomatis ("${ticketId.substring(0, 16)}...") pada merchant cangkang "${parsedQR.merchantName}" (${parsedQR.mccDesc || parsedQR.mcc}). Pola transaksi ini identik dengan rekening penampungan deposit judol bot.`;
    }
    // Prioritas 3: Nominal Cents Unik Acak
    else if (isLaunderingSuspect && hasUniqueNominal) {
      flags.push('TRANSACTION_LAUNDERING_SUSPECT');
      flags.push('UNIQUE_3DIGIT_AMOUNT');
      riskScore = 95;
      verdict = 'BAHAYA';
      detectedCategory = 'JUDOL_DEPOSIT_TICKET';
      technicalReason = `Anomali Tiket Deposit: QRIS dinamis terkunci Rp ${parsedQR.amount.toLocaleString('id-ID')} dengan Reference ID Payment Gateway pada MCC toko mikro (${parsedQR.mcc}). Mengindikasikan deposit bot otomatis.`;
    }

    // LAPIS 2C: Charity Fraud & Mismatch MCC (Kotak Amal Palsu)
    const hasCharityKeyword = CHARITY_KEYWORDS.some(kw => upperName.includes(kw.toUpperCase()));
    const validCharityMCC = ['8398', '8661']; // 8398 = Organisasi Amal, 8661 = Keagamaan
    if (hasCharityKeyword && parsedQR.mcc && !validCharityMCC.includes(parsedQR.mcc) && detectedCategory === 'VALID_MERCHANT') {
      flags.push('CHARITY_MCC_MISMATCH');
      riskScore = 78;
      verdict = 'DICURIGAI';
      detectedCategory = 'STICKER_TAMPERING';
      technicalReason = `Anomali Kategori Usaha: Nama merchant mengatasnamakan Rumah Ibadah / Amal ("${parsedQR.merchantName}"), namun terdaftar di kategori MCC "${parsedQR.mccDesc}". Waspada penempelan stiker palsu di kotak infaq.`;
    }

    // Anti-False-Positive UMKM Guard (Warung Kopi, Resto wajar)
    if (flags.length === 0 || (isDynamicLocked && (parsedQR.amount % 1000 === 0 || parsedQR.amount % 500 === 0) && isMicroMCC && !hasHighEntropyTicket && !isSuspiciousEntity)) {
      riskScore = 12;
      verdict = 'APPROVE / AMAN';
      detectedCategory = 'VALID_MERCHANT';
      technicalReason = 'Struktur EMVCo QRIS sesuai standar, checksum valid, dan merchant terverifikasi wajar.';
    }

    return {
      riskScore,
      verdict,
      detectedCategory,
      technicalReason,
      flags,
      hashedNMID
    };
  }

  // 3. Google Gemini 2.5 Flash Cognitive Analyzer (Client / Backend Integration)
  async function queryGeminiThreatAnalysis(apiKey, parsedQR, heuristicResult, imageBase64 = null) {
    // Gunakan modul GeminiInspector jika tersedia
    if (window.GeminiInspector && window.GeminiInspector.inspectStickerWithAI) {
      try {
        const metadata = {
          merchantName: parsedQR.merchantName,
          mcc: parsedQR.mcc,
          mccDesc: parsedQR.mccDesc,
          rawNMID: parsedQR.rawNMID,
          amount: parsedQR.amount,
          isDynamic: parsedQR.isDynamic,
          referenceId: parsedQR.referenceId,
          billNumber: parsedQR.billNumber,
          terminalId: parsedQR.terminalId,
          crcValid: parsedQR.crcValid,
          riskScore: heuristicResult.riskScore,
          detectedCategory: heuristicResult.detectedCategory,
          isQuishingUrl: parsedQR.isQuishingUrl
        };
        const inspectRes = await window.GeminiInspector.inspectStickerWithAI({ imageBase64, metadata, apiKey });
        if (inspectRes && inspectRes.shortInsightId) {
          return {
            text: inspectRes.shortInsightId,
            riskScore: inspectRes.riskScore,
            verdict: inspectRes.verdict,
            detectedCategory: inspectRes.detectedCategory,
            printedNameOnImage: inspectRes.printedNameOnImage,
            source: inspectRes.source || 'gemini'
          };
        }
      } catch (err) {
        console.warn('[ThreatAnalyzer] GeminiInspector call fallback:', err);
      }
    }

    // Fallback Cognitive Synthesizer
    const fallbackText = generateMockCognitiveInsight(parsedQR, heuristicResult);
    return {
      text: fallbackText,
      riskScore: heuristicResult.riskScore,
      verdict: heuristicResult.verdict,
      detectedCategory: heuristicResult.detectedCategory,
      source: 'fallback'
    };
  }

  // 4. Fallback Smart Cognitive Synthesizer (Sesuai SKILLS.md Protocol 3.2)
  function generateMockCognitiveInsight(parsedQR, heuristicResult) {
    if (parsedQR.isQuishingUrl) {
      return '⚠️ PERINGATAN KRITIS: QR ini bukan kode QRIS perbankan, melainkan tautan situs eksternal mencurigakan. Jangan lanjutkan tautan ini karena berisiko tinggi mencuri kredensial perbankan Anda.';
    }

    if (!parsedQR.crcValid) {
      return '🛡️ VALIDASI GAGAL: Kode QR ini mengalami kerusakan integritas data atau telah dimodifikasi secara ilegal. Batalkan transaksi demi keamanan saldo Anda.';
    }

    if (heuristicResult.flags.includes('JUDOL_DEPOSIT_TICKET') || heuristicResult.flags.includes('SUSPICIOUS_MERCHANT_NAME')) {
      return '🚨 DETEKSI REKENING ILEGAL: Merchant ini menunjukkan karakteristik kuat penampungan deposit judi online dengan pengenal tiket otomatis. Transaksi ini berpotensi melanggar hukum dan dana Anda dapat dibekukan.';
    }

    if (heuristicResult.flags.includes('CHARITY_MCC_MISMATCH')) {
      return '⚠️ WASPADA KOTAK AMAL: Nama tertera menunjukkan donasi keagamaan, namun terdaftar di bank sebagai kategori usaha komersial/hiburan. Periksa kembali nama rekening di aplikasi bank sebelum mentransfer.';
    }

    if (heuristicResult.flags.includes('BLACKLIST_HASH_MATCH')) {
      return '⛔ MERCHANT DALAM DAFTAR HITAM: Rekening merchant ini memiliki catatan laporan penipuan pada basis data keamanan. Jangan lanjutkan pembayaran.';
    }

    // Default AMAN (UMKM Terverifikasi)
    return `✅ TRANSAKSI AMAN: Identitas merchant "${parsedQR.merchantName || 'UMKM'}" konsisten dengan kategori usaha ${parsedQR.mccDesc} di ${parsedQR.city || 'Indonesia'}. Pembayaran aman untuk dilanjutkan melalui dompet digital pilihan Anda.`;
  }

  // Export to window.ThreatAnalyzer
  window.ThreatAnalyzer = {
    evaluateHeuristics,
    queryGeminiThreatAnalysis,
    generateMockCognitiveInsight,
    JUDOL_KEYWORDS,
    CHARITY_KEYWORDS
  };

})(window);
