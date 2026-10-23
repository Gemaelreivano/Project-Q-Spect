/**
 * js/threat-analyzer.js
 * Cognitive Threat Analyzer & Gemini 2.5 Flash Bridge
 * Verifikasi Pengujian (tests/test-cases.md & tests/run-tests.py):
 * - TC-02: Deteksi MCC Mismatch (Nama amal vs MCC 7994 gaming)
 * - TC-03: Deteksi Judol 3-digit odd amount & dynamic payment gateway
 * - TC-04: Quishing URL Phishing detection
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ThreatAnalyzer = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  async function analyze(parsedData, rawPayload, apiKey) {
    if (typeof window !== 'undefined' && window.QrisParser) {
      const local = window.QrisParser.analyzeHeuristics(parsedData);
      try {
        const resp = await fetch('/api/ai/inspect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qrPayload: rawPayload, parsedData, apiKey })
        });
        if (resp.ok) {
          const resJson = await resp.json();
          return resJson.data;
        }
      } catch (e) {
        // Fallback to local heuristics
      }
      return local;
    }

    const core = require('../src/core/qrisParser');
    return core.analyzeHeuristics(parsedData);
  }

  return {
    analyze
  };
});
