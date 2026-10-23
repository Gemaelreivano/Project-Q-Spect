/**
 * js/security.js
 * Zero-Trust DOMPurify / Sanitizer and Blind Hashing Module
 * Verifikasi Pengujian (tests/test-cases.md & tests/run-tests.py):
 * - TC-01 & TC-03: Zero-Knowledge Blind Hash (SHA-256) untuk NMID
 * - UU PDP No. 27/2022 Privacy Compliance: SHA256(UPPERCASE(TRIM(NMID)))
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SecurityModule = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  function sanitizeText(input) {
    if (typeof input !== 'string') return '';
    return input.replace(/[&<>"']/g, function (m) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[m];
    });
  }

  async function hashNMID(nmid) {
    if (typeof window !== 'undefined' && window.ZKSecurity) {
      return window.ZKSecurity.computeSHA256(nmid);
    }
    const sec = require('../src/security/zkHash');
    return sec.computeSHA256(nmid);
  }

  return {
    sanitizeText,
    hashNMID
  };
});
