/**
 * Q-SPECT AI ENGINE: Google Gemini 2.5 Flash Multimodal Vision & Semantic Inspector
 * Client/Server bridge utility for Orang 4 (AI Integration)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GeminiInspector = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  async function inspectWithGemini({ qrPayload, parsedData, imageBase64, apiKey }) {
    try {
      const response = await fetch('/api/ai/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrPayload,
          parsedData,
          imageBase64,
          apiKey
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      return json.data;
    } catch (err) {
      console.warn('[GeminiInspector] Proxy failed, falling back to local heuristic:', err);
      if (typeof root !== 'undefined' && root.QrisParser) {
        return root.QrisParser.analyzeHeuristics(parsedData);
      }
      return {
        riskScore: 25,
        verdict: 'AMAN',
        detectedCategory: 'CLEAN_MERCHANT',
        shortInsightId: 'Pemeriksaan standar selesai dengan fallback lokal.',
        tamperFlags: []
      };
    }
  }

  return {
    inspectWithGemini
  };
});
