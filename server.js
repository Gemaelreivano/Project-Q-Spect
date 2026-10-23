/* ============================================================
   Q-SPECT  —  Backend Server (Node.js / Express)
   Zero-Knowledge Privacy Architecture
   ============================================================ */
const path    = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const cors    = require('cors');
const { checkBlacklist, reportHash, inspectWithAI } = require('./server/aiController');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(__dirname));

// ── REST API Routes ──────────────────────────────────────────

// 1. POST /api/blacklist/check  — O(1) SHA-256 hash lookup
app.post('/api/blacklist/check', checkBlacklist);

// 2. POST /api/blacklist/report — anonymous community hash report
app.post('/api/blacklist/report', reportHash);

// 3. POST /api/ai/inspect       — Gemini 2.5 Flash proxy with fallback
app.post('/api/ai/inspect', inspectWithAI);

// ── SPA Fallback ─────────────────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  const isConfigured = process.env.GEMINI_API_KEY && 
    !process.env.GEMINI_API_KEY.includes('masukan API') && 
    !process.env.GEMINI_API_KEY.includes('YOUR_GEMINI_API_KEY');
  const keyInfo = isConfigured
    ? `Configured (${process.env.GEMINI_API_KEY.substring(0, 6)}...)`
    : 'NOT SET (Fallback Active)';
  const modelInfo = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  console.log(`\n  ╔══════════════════════════════════════════╗`);
  console.log(`  ║  Q-SPECT Server Active                   ║`);
  console.log(`  ║  http://localhost:${PORT}                    ║`);
  console.log(`  ║  Gemini Key   : ${keyInfo.padEnd(25)}║`);
  console.log(`  ║  Gemini Model : ${modelInfo.padEnd(25)}║`);
  console.log(`  ╚══════════════════════════════════════════╝\n`);
});