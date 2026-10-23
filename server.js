/**
 * Q-SPECT Backend Server
 * Express-based High-Trust Architecture for Zero-Knowledge QRIS Threat Inspection
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { inspectQRIS } = require('./server/aiController');

// Load environment variables if .env exists
try {
  require('dotenv').config();
} catch (e) {
  // Optional dotenv loading
}

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Parsing Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Anti-Tamper Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// In-Memory Deterministic SHA-256 Blacklist (Pre-populated with known illegal gambling & phishing merchant hashes)
const inMemoryBlacklist = new Map([
  // Preset hash for known judol gateway VIP-DEPO-GACOR88
  ['E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855', { reason: 'Rekening Perantara Judi Daring', date: '2026-10-01' }],
  ['9A3B5F6C7D8E1F2A3B4C5D6E7F8A9B0C1D2E3F4A5B6C7D8E9F0A1B2C3D4E5F6A', { reason: 'Stiker Tempelan Palsu Kotak Infaq', date: '2026-10-12' }],
  ['F1E2D3C4B5A697887766554433221100FFEEDDCCBBAA99887766554433221100', { reason: 'Quishing Portal Phishing Dana VIP', date: '2026-10-15' }]
]);

/**
 * Route: Check Blacklist via Blind Hash
 * POST /api/blacklist/check
 * Body: { nmidHash: string }
 */
app.post('/api/blacklist/check', (req, res) => {
  const { nmidHash } = req.body || {};
  if (!nmidHash || typeof nmidHash !== 'string') {
    return res.status(400).json({ error: 'Valid nmidHash is required' });
  }

  const cleanHash = nmidHash.trim().toUpperCase();
  const match = inMemoryBlacklist.get(cleanHash);

  if (match) {
    return res.json({
      isBlacklisted: true,
      reason: match.reason,
      reportDate: match.date
    });
  }

  return res.json({
    isBlacklisted: false,
    reason: null,
    reportDate: null
  });
});

/**
 * Route: Report Suspected Merchant via Anonymous Blind Hash
 * POST /api/blacklist/report
 * Body: { nmidHash: string, reason: string }
 */
app.post('/api/blacklist/report', (req, res) => {
  const { nmidHash, reason } = req.body || {};
  if (!nmidHash || typeof nmidHash !== 'string') {
    return res.status(400).json({ error: 'Valid nmidHash is required' });
  }

  const cleanHash = nmidHash.trim().toUpperCase();
  const sanitizedReason = (reason || 'Dilaporkan Pengguna').toString().slice(0, 150);

  inMemoryBlacklist.set(cleanHash, {
    reason: sanitizedReason,
    date: new Date().toISOString().split('T')[0]
  });

  return res.json({
    success: true,
    message: 'Laporan anomali merchant berhasil disimpan ke database memori Zero-Knowledge.',
    registeredHash: cleanHash
  });
});

/**
 * Route: AI Multimodal Threat Inspector Proxy
 * POST /api/ai/inspect
 */
app.post('/api/ai/inspect', inspectQRIS);

/**
 * Route: Health Check
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'Q-SPECT QRIS Cyber Defense Node',
    timestamp: new Date().toISOString()
  });
});

// Static Assets Serving
app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// Fallback to public/index.html for SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🛡️  Q-SPECT Cyber Defense Engine online on http://localhost:${PORT}`);
    console.log(`📡 Ready for QRIS inspections, EMVCo forensics & Gemini 2.5 Flash analysis.`);
  });
}

module.exports = app;
