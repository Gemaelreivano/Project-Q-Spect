/**
 * js/qris-decoder.js
 * EMVCo TLV Extraction & Checksum Validator
 * Verifikasi Pengujian (tests/test-cases.md & tests/run-tests.py):
 * - TC-01: Clean UMKM EMVCo parsing & valid CRC-16 (D504)
 * - TC-02: Kotak Amal MCC Mismatch detection
 * - TC-03: Dynamic Judol Deposit ticket detection
 * - TC-05: Checksum tamper defense (CRC mismatch)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.QRISDecoder = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  function decode(rawPayload) {
    if (typeof window !== 'undefined' && window.QrisParser) {
      return window.QrisParser.parseQRIS(rawPayload);
    }
    const core = require('../src/core/qrisParser');
    return core.parseQRIS(rawPayload);
  }

  function validateChecksum(payload) {
    if (typeof window !== 'undefined' && window.QrisParser) {
      return window.QrisParser.validateCRC(payload);
    }
    const core = require('../src/core/qrisParser');
    return core.validateCRC(payload);
  }

  return {
    decode,
    validateChecksum
  };
});
