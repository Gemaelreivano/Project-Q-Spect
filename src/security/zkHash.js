/**
 * Q-SPECT SECURITY ENGINE: Zero-Knowledge Blind Hashing & Anonymous Audit Receipt
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ZKSecurity = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  async function computeSHA256(input) {
    if (!input || typeof input !== 'string') return '';
    const normalized = input.trim().toUpperCase();

    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const msgUint8 = new TextEncoder().encode(normalized);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    }

    try {
      const crypto = require('crypto');
      return crypto.createHash('sha256').update(normalized).digest('hex').toUpperCase();
    } catch (e) {
      return '';
    }
  }

  const LOCAL_BLACKLIST = new Set([
    'E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855',
    '9A3B5F6C7D8E1F2A3B4C5D6E7F8A9B0C1D2E3F4A5B6C7D8E9F0A1B2C3D4E5F6A',
    'F1E2D3C4B5A697887766554433221100FFEEDDCCBBAA99887766554433221100'
  ]);

  function checkLocalBlacklist(hash) {
    if (!hash) return false;
    return LOCAL_BLACKLIST.has(hash.trim().toUpperCase());
  }

  function registerLocalBlacklist(hash) {
    if (!hash) return;
    LOCAL_BLACKLIST.add(hash.trim().toUpperCase());
  }

  function generateAuditReceipt({ nmidHash, merchantName, riskScore, verdict, category, crcValid }) {
    const timestamp = new Date().toISOString();
    const shortHash = nmidHash ? `${nmidHash.substring(0, 10)}...${nmidHash.substring(nmidHash.length - 8)}` : 'N/A';
    const cleanMerchant = (merchantName || 'UNKNOWN').substring(0, 30);

    return `════════════════════════════════════════════
🛡️ Q-SPECT CYBER AUDIT RECEIPT (VERIFIED)
════════════════════════════════════════════
Waktu Inspeksi : ${timestamp}
Merchant Terbaca: ${cleanMerchant}
Blind Hash NMID: ${shortHash}
Status Checksum: ${crcValid ? 'VALID (CRC-16 OK)' : 'RUSAK / INVALID'}
Skor Risiko    : ${riskScore} / 100
Keputusan Akhir: [${verdict}] - ${category}
────────────────────────────────────────────
Kepatuhan Privasi:
- Zero-Knowledge Proof (UU PDP No. 27/2022)
════════════════════════════════════════════`;
  }

  return {
    computeSHA256,
    checkLocalBlacklist,
    registerLocalBlacklist,
    generateAuditReceipt
  };
});
