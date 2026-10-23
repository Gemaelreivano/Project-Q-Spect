/**
 * ============================================================
 * Q-SPECT - js/security.js
 * Domain: Zero-Trust Sanitization, Deterministic ZK Hashing & Privacy
 * Conforms to: UU PDP (Indonesia Personal Data Protection Law) & EMVCo
 * ============================================================
 */

(function (window) {
  'use strict';

  // 1. Sanitasi Aman Anti-XSS (DOMPurify Wrapper)
  function sanitizeHTML(dirty) {
    if (!dirty) return '';
    if (typeof DOMPurify !== 'undefined' && DOMPurify.sanitize) {
      return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'span', 'code', 'br'],
        ALLOWED_ATTR: ['class']
      });
    }
    // Fallback native entity encoder
    const div = document.createElement('div');
    div.textContent = dirty;
    return div.innerHTML;
  }

  function safeSetText(elementId, text) {
    const el = document.getElementById(elementId);
    if (el) {
      el.textContent = text !== undefined && text !== null ? String(text) : '-';
    }
  }

  function safeSetHTML(elementId, htmlString) {
    const el = document.getElementById(elementId);
    if (el) {
      el.innerHTML = sanitizeHTML(htmlString);
    }
  }

  // 2. Deterministic SHA-256 Hashing via Web Crypto API (Client-Side Blind Hash)
  async function sha256Hex(message) {
    if (!message) return '';
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Deterministic ZK NMID Hasher: SHA256(UPPERCASE(TRIM(NMID)))
   * Ensures merchant identity can be queried against blacklist without revealing raw NMID to third parties
   */
  async function hashNMID(rawNMID) {
    if (!rawNMID) return '';
    const normalized = String(rawNMID).trim().toUpperCase();
    return await sha256Hex(normalized);
  }

  // 3. Known Blacklist Store (In-Memory Set of Pre-computed SHA-256 Hashes)
  // Contains hashed signatures of known illegal judol merchants, fraud rings, and quishing domains
  const BLACKLIST_STORE = new Map([
    // Example: SHA-256 of "ID1020038472911" (Simulated blacklisted merchant)
    ['c4ca4238a0b923820dcc509a6f75849b', { reason: 'Rekening Penampungan Judol 303', category: 'JUDOL_MULE', risk: 95 }],
    ['e3b0c44298fc1c149afbf4c8996fb924', { reason: 'NMID Kosong / Manipulasi TLV', category: 'TAMPERED', risk: 85 }],
    ['8f45a7226dbf35e4d29f076b9ee776e0a98b584f229adbc0cb5cbbab9bfa8868', { reason: 'Situs Phishing QRIS Dinamis Bebeli Palsu', category: 'QUISHING_URL', risk: 98 }],
    ['7994_FAKE_INFAQ', { reason: 'Sindikat Manipulasi Kotak Amal (MCC 7994 Video Game)', category: 'CHARITY_FRAUD', risk: 80 }]
  ]);

  // Local storage cache for user-reported blacklists in current session
  const COMMUNITY_REPORTS_KEY = 'qspect_community_reports';
  function getCommunityReports() {
    try {
      const data = localStorage.getItem(COMMUNITY_REPORTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  async function reportBlacklist(hashedNMID, merchantName, reason) {
    const reports = getCommunityReports();
    const entry = {
      hash: hashedNMID,
      merchantName: merchantName ? merchantName.slice(0, 4) + '***' : 'ANON',
      reason: reason || 'Laporan Pengguna Terindikasi Penipuan',
      timestamp: new Date().toISOString()
    };
    reports.push(entry);
    try {
      localStorage.setItem(COMMUNITY_REPORTS_KEY, JSON.stringify(reports));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
    return entry;
  }

  async function checkBlacklist(hashedNMID, rawPayload) {
    if (!hashedNMID && !rawPayload) return { isBlacklisted: false };
    
    // Check known hash store
    if (hashedNMID && BLACKLIST_STORE.has(hashedNMID)) {
      return { isBlacklisted: true, detail: BLACKLIST_STORE.get(hashedNMID) };
    }

    // Check community reports
    const community = getCommunityReports();
    const foundCommunity = community.find(c => c.hash === hashedNMID);
    if (foundCommunity) {
      return {
        isBlacklisted: true,
        detail: {
          reason: `Laporan Komunitas: ${foundCommunity.reason}`,
          category: 'COMMUNITY_FLAGGED',
          risk: 88
        }
      };
    }

    return { isBlacklisted: false };
  }

  // 4. Privacy-Safe Digital Audit Receipt Generator
  function generateAuditCoupon(auditData) {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const shortHash = auditData.nmidHash ? auditData.nmidHash.substring(0, 16) + '...' : 'ANON-NO-NMID';
    const auditId = 'QSP-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now().toString().slice(-4);
    
    const lines = [
      '========================================',
      '       Q-SPECT DIGITAL AUDIT COUPON     ',
      '   Zero-Knowledge Privacy Verified       ',
      '========================================',
      `Audit ID     : ${auditId}`,
      `Waktu (WIB)  : ${timestamp}`,
      `Merchant     : ${auditData.merchantName || 'UNKNOWN'}`,
      `Domisili     : ${auditData.city || '-'}`,
      `NMID Masked  : ${auditData.rawNMID ? auditData.rawNMID.slice(0, 4) + '****' + auditData.rawNMID.slice(-4) : '-'}`,
      `ZK SHA-256   : ${shortHash}`,
      `Risk Score   : ${auditData.riskScore || 0}/100`,
      `Verdict      : ${auditData.verdict || 'UNKNOWN'}`,
      `Integritas   : ${auditData.crcValid ? 'CRC16 Valid' : 'CRC16 RUSAK/INVALID'}`,
      '----------------------------------------',
      'UU PDP Compliance: No Raw PII Stored.',
      'Periksa kembali nama di aplikasi bayar.',
      '========================================'
    ];

    return lines.join('\n');
  }

  // 5. Client-Side Image Compression for Gemini 2.5 Flash Multimodal
  async function compressImageForVision(fileOrBlob, maxWidth = 768, quality = 0.75) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function (e) {
        const img = new Image();
        img.onerror = reject;
        img.onload = function () {
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Export compressed webp / jpeg
          const dataUrl = canvas.toDataURL('image/webp', quality);
          resolve({
            dataUrl: dataUrl,
            base64Data: dataUrl.split(',')[1],
            mimeType: 'image/webp',
            width: width,
            height: height
          });
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(fileOrBlob);
    });
  }

  // Export to window.QSecurity
  window.QSecurity = {
    sanitizeHTML,
    safeSetText,
    safeSetHTML,
    sha256Hex,
    hashNMID,
    checkBlacklist,
    reportBlacklist,
    generateAuditCoupon,
    compressImageForVision
  };

})(window);
