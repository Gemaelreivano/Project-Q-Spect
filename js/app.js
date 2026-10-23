/**
 * ============================================================
 * Q-SPECT - js/app.js
 * Domain: Main Application Controller & UI Orchestration
 * Implements: 3-Layer State Machine, Circuit Canvas Animation,
 * Camera Video Stream, Dropzone, 5 Preset Demos, Verdict Renderer,
 * Header Back Navigation, History Popstate, & Quick Scroll Dock (Atas/Bawah)
 * 
 * [Changelog Ref: tests/test-cases.md - Bagian 4 UI Navigation & Scroll]
 * ============================================================
 */

(function () {
  'use strict';

  // State Machine Layers
  const LAYER_WELCOME = 'layerWelcome';
  const LAYER_SCANNER = 'layerScanner';
  const LAYER_RESULT = 'layerResult';

  let currentLayer = LAYER_WELCOME;
  let videoStream = null;
  let scanAnimationId = null;
  let isScanningActive = false;
  let lastAuditData = null;

  // DOM Elements
  const el = {
    // Layers
    layerWelcome: document.getElementById('layerWelcome'),
    layerScanner: document.getElementById('layerScanner'),
    layerResult: document.getElementById('layerResult'),
    breadcrumbText: document.getElementById('breadcrumbText'),
    ambientWrapper: document.getElementById('ambientWrapper'),
    appMain: document.querySelector('.app-main'),

    // Nav / Header & Back Button
    btnHeaderBack: document.getElementById('btnHeaderBack'),
    btnStartScan: document.getElementById('btnStartScan'),
    btnNavScanner: document.getElementById('btnNavScanner'),

    // Quick Scroll Dock
    scrollDock: document.getElementById('scrollDock'),
    btnScrollTop: document.getElementById('btnScrollTop'),
    btnScrollBottom: document.getElementById('btnScrollBottom'),

    // Scanner Controls
    tabCamera: document.getElementById('tabCamera'),
    tabUpload: document.getElementById('tabUpload'),
    viewCamera: document.getElementById('viewCamera'),
    viewUpload: document.getElementById('viewUpload'),
    video: document.getElementById('cameraVideo'),
    fileInput: document.getElementById('fileInput'),
    dropzone: document.getElementById('dropzone'),
    scannerLaser: document.getElementById('scannerLaser'),

    // Gemini Config
    inputApiKey: document.getElementById('inputApiKey'),
    btnSaveApiKey: document.getElementById('btnSaveApiKey'),
    apiKeyStatus: document.getElementById('apiKeyStatus'),

    // Demo Scenario Buttons
    btnDemoClean: document.getElementById('btnDemoClean'),
    btnDemoCharity: document.getElementById('btnDemoCharity'),
    btnDemoJudol: document.getElementById('btnDemoJudol'),
    btnDemoQuishing: document.getElementById('btnDemoQuishing'),
    btnDemoChecksum: document.getElementById('btnDemoChecksum'),

    // Result Elements
    verdictBadge: document.getElementById('verdictBadge'),
    riskMeterBar: document.getElementById('riskMeterBar'),
    riskScoreText: document.getElementById('riskScoreText'),
    resMerchantName: document.getElementById('resMerchantName'),
    resNMID: document.getElementById('resNMID'),
    resNMIDHash: document.getElementById('resNMIDHash'),
    resMCC: document.getElementById('resMCC'),
    resCity: document.getElementById('resCity'),
    resAmount: document.getElementById('resAmount'),
    resCRC: document.getElementById('resCRC'),
    resAiInsight: document.getElementById('resAiInsight'),
    resTechnicalReason: document.getElementById('resTechnicalReason'),

    // Action Buttons
    btnCopyAuditCoupon: document.getElementById('btnCopyAuditCoupon'),
    btnRescan: document.getElementById('btnRescan'),
    btnActionPrimary: document.getElementById('btnActionPrimary'),

    // Toast
    toast: document.getElementById('appToast')
  };

  // 1. Toast Notification Helper
  function showToast(message, duration = 3000) {
    if (!el.toast) return;
    el.toast.textContent = message;
    el.toast.classList.add('show');
    setTimeout(() => {
      el.toast.classList.remove('show');
    }, duration);
  }

  // 2. State Machine Transitions & Navigation
  function switchLayer(targetLayer, pushHistory = true) {
    currentLayer = targetLayer;

    // Reset visibility
    if (el.layerWelcome) el.layerWelcome.classList.add('hidden');
    if (el.layerScanner) el.layerScanner.classList.add('hidden');
    if (el.layerResult) el.layerResult.classList.add('hidden');

    // Reset scroll viewport ke paling atas setiap ganti layer
    if (el.appMain) {
      el.appMain.scrollTop = 0;
    }

    if (targetLayer === LAYER_WELCOME) {
      if (el.layerWelcome) el.layerWelcome.classList.remove('hidden');
      if (el.breadcrumbText) el.breadcrumbText.textContent = 'Layer 1 / Welcome';
      if (el.btnHeaderBack) el.btnHeaderBack.classList.add('hidden');
      stopCamera();
      setAmbientMood('default');
    } else if (targetLayer === LAYER_SCANNER) {
      if (el.layerScanner) el.layerScanner.classList.remove('hidden');
      if (el.breadcrumbText) el.breadcrumbText.textContent = 'Layer 2 / QRIS Scanner';
      if (el.btnHeaderBack) el.btnHeaderBack.classList.remove('hidden');
      startCamera();
      setAmbientMood('default');
    } else if (targetLayer === LAYER_RESULT) {
      if (el.layerResult) el.layerResult.classList.remove('hidden');
      if (el.breadcrumbText) el.breadcrumbText.textContent = 'Layer 3 / Security Verdict';
      if (el.btnHeaderBack) el.btnHeaderBack.classList.remove('hidden');
      stopCamera();
    }

    // Sinkronisasi history browser (dukungan tombol back hardware/peramban)
    if (pushHistory && window.history && window.history.pushState) {
      window.history.pushState({ layer: targetLayer }, '', '#' + targetLayer);
    }

    // Perbarui status tombol scroll atas & bawah
    setTimeout(updateScrollButtons, 50);
  }

  // Handler Tombol Kembali (Back Navigation)
  function handleBackNavigation() {
    if (currentLayer === LAYER_RESULT) {
      // Dari Lapis 3 (Hasil Verdict) kembali ke Lapis 2 (Scanner)
      switchLayer(LAYER_SCANNER);
      showToast('Kembali ke Layar Scanner QRIS');
    } else if (currentLayer === LAYER_SCANNER) {
      // Dari Lapis 2 (Scanner) kembali ke Lapis 1 (Welcome)
      switchLayer(LAYER_WELCOME);
      showToast('Kembali ke Beranda Q-SPECT');
    }
  }

  // Helper Scroll Cepat: Ke Atas
  function scrollToTop() {
    if (el.appMain) {
      el.appMain.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Helper Scroll Cepat: Ke Bawah
  function scrollToBottom() {
    if (el.appMain) {
      el.appMain.scrollTo({ top: el.appMain.scrollHeight, behavior: 'smooth' });
    }
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  // Evaluator Status Tombol Scroll Atas / Bawah
  function updateScrollButtons() {
    if (!el.appMain) return;
    const scrollTop = el.appMain.scrollTop;
    const scrollHeight = el.appMain.scrollHeight;
    const clientHeight = el.appMain.clientHeight;
    const isScrollable = scrollHeight > clientHeight + 15;

    // Tombol Ke Atas: disabled jika sudah di puncak
    if (el.btnScrollTop) {
      if (scrollTop <= 15) {
        el.btnScrollTop.classList.add('scroll-btn--disabled');
      } else {
        el.btnScrollTop.classList.remove('scroll-btn--disabled');
      }
    }

    // Tombol Ke Bawah: disabled jika sudah di dasar atau konten muat 1 layar
    if (el.btnScrollBottom) {
      if (scrollTop + clientHeight >= scrollHeight - 15 || !isScrollable) {
        el.btnScrollBottom.classList.add('scroll-btn--disabled');
      } else {
        el.btnScrollBottom.classList.remove('scroll-btn--disabled');
      }
    }
  }

  function setAmbientMood(mood) {
    if (!el.ambientWrapper) return;
    el.ambientWrapper.classList.remove('safe', 'warn', 'danger');
    if (mood === 'safe') el.ambientWrapper.classList.add('safe');
    else if (mood === 'warn') el.ambientWrapper.classList.add('warn');
    else if (mood === 'danger') el.ambientWrapper.classList.add('danger');
  }

  // 3. Camera Engine (WebRTC Stream + Real-Time Scanning)
  async function startCamera() {
    if (el.tabCamera && !el.tabCamera.classList.contains('active')) return;
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        videoStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (el.video) {
          el.video.srcObject = videoStream;
          await el.video.play();
          isScanningActive = true;
          scanVideoFrame();
        }
      }
    } catch (err) {
      console.warn('Kamera tidak dapat diakses (mungkin tidak ada izin atau hardware):', err);
      // Biarkan dropzone & demo tetap 100% fungsional
    }
  }

  function stopCamera() {
    isScanningActive = false;
    if (scanAnimationId) {
      cancelAnimationFrame(scanAnimationId);
      scanAnimationId = null;
    }
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      videoStream = null;
    }
    if (el.video) {
      el.video.srcObject = null;
    }
  }

  async function scanVideoFrame() {
    if (!isScanningActive || !el.video || el.video.readyState !== el.video.HAVE_ENOUGH_DATA) {
      if (isScanningActive) {
        scanAnimationId = requestAnimationFrame(scanVideoFrame);
      }
      return;
    }

    try {
      if (window.QRISDecoder) {
        const qrString = await window.QRISDecoder.decodeQRFromImage(el.video);
        if (qrString) {
          isScanningActive = false;
          showToast('Kode QR Terdeteksi! Menganalisis...');
          await processQRISPayload(qrString);
          return;
        }
      }
    } catch (e) {
      console.error('Frame scan error:', e);
    }

    if (isScanningActive) {
      scanAnimationId = requestAnimationFrame(scanVideoFrame);
    }
  }

  // 4. Pipeline Utama Analisis QRIS (Parse -> Hash -> Heuristics -> AI -> Render)
  async function processQRISPayload(rawPayload, imageBase64 = null) {
    if (!window.QRISDecoder || !window.ThreatAnalyzer) {
      alert('Modul analisa belum siap.');
      return;
    }

    const rawString = rawPayload;
    console.log("RAW QRIS STRING:", rawString);

    // A. Parse EMVCo / Check Quishing
    const parsedResult = window.QRISDecoder.parseEMVCo(rawString);
    console.log("Parsed TLV Result:", parsedResult);

    if (!parsedResult.success) {
      alert('QRIS tidak dapat dibaca: ' + parsedResult.error);
      return;
    }

    // B. Jalankan Saringan Lapis 1 & 2
    const heuristics = await window.ThreatAnalyzer.evaluateHeuristics(parsedResult);
    let riskScore = heuristics.riskScore;
    let verdict = heuristics.verdict;
    let detectedCategory = heuristics.detectedCategory;
    console.log("Detected Heuristic Risk:", riskScore, verdict);

    // C. Jalankan Lapis 3 (Gemini 2.5 Flash Multimodal / Smart Fallback)
    const apiKey = localStorage.getItem('qspect_gemini_key') || '';
    const aiResult = await window.ThreatAnalyzer.queryGeminiThreatAnalysis(apiKey, parsedResult, heuristics, imageBase64);

    let aiInsightText = '';
    if (aiResult) {
      if (typeof aiResult === 'string') {
        aiInsightText = aiResult;
      } else {
        aiInsightText = aiResult.text || aiResult.shortInsightId || '';
        // Naikkan tingkat ancaman jika Lapis 3 (Gemini Vision) menemukan indikasi bahaya
        if (typeof aiResult.riskScore === 'number' && aiResult.riskScore > riskScore) {
          riskScore = aiResult.riskScore;
          verdict = aiResult.verdict || verdict;
          detectedCategory = aiResult.detectedCategory || detectedCategory;
        }
      }
    }

    console.log("Final Evaluated Verdict:", riskScore, verdict, detectedCategory);

    // D. Siapkan Data Audit Terverifikasi
    lastAuditData = {
      rawPayload: parsedResult.rawPayload,
      merchantName: parsedResult.merchantName,
      city: parsedResult.city,
      rawNMID: parsedResult.rawNMID,
      nmidHash: heuristics.hashedNMID,
      mcc: parsedResult.mcc,
      mccDesc: parsedResult.mccDesc,
      amount: parsedResult.amount,
      crcValid: parsedResult.crcValid,
      riskScore: riskScore,
      verdict: verdict,
      detectedCategory: detectedCategory,
      flags: heuristics.flags,
      technicalReason: heuristics.technicalReason,
      aiInsight: aiInsightText
    };

    // E. Render ke Layer 3
    renderVerdict(lastAuditData);
    switchLayer(LAYER_RESULT);
  }

  // 5. Render Verdict & Reactive Styling
  function renderVerdict(data) {
    const isSafe = data.riskScore <= 30;
    const isWarn = data.riskScore > 30 && data.riskScore <= 70;
    const isDanger = data.riskScore > 70;

    // Ambient Mood & Result Card Glow
    if (isSafe) {
      setAmbientMood('safe');
    } else if (isWarn) {
      setAmbientMood('warn');
    } else {
      setAmbientMood('danger');
    }

    // Badge Status
    if (el.verdictBadge) {
      el.verdictBadge.className = 'verdict-badge';
      if (isSafe) {
        el.verdictBadge.classList.add('badge-safe');
        el.verdictBadge.textContent = 'APPROVE / AMAN';
      } else if (isWarn) {
        el.verdictBadge.classList.add('badge-warn');
        el.verdictBadge.textContent = 'WASPADA / ANOMALI';
      } else {
        el.verdictBadge.classList.add('badge-danger');
        el.verdictBadge.textContent = data.verdict || 'BAHAYA / BLOCKED';
      }
    }

    // Risk Meter Bar & Text
    if (el.riskMeterBar) {
      el.riskMeterBar.style.width = '0%';
      el.riskMeterBar.className = 'risk-meter-fill';
      if (isSafe) el.riskMeterBar.classList.add('fill-safe');
      else if (isWarn) el.riskMeterBar.classList.add('fill-warn');
      else el.riskMeterBar.classList.add('fill-danger');

      // Animasi transisi 500ms
      setTimeout(() => {
        el.riskMeterBar.style.width = Math.min(Math.max(data.riskScore, 5), 100) + '%';
      }, 50);
    }

    if (el.riskScoreText) {
      el.riskScoreText.textContent = `${data.riskScore} / 100 - ${isSafe ? 'Risiko Rendah' : isWarn ? 'Perlu Verifikasi' : 'Ancaman Terdeteksi'}`;
    }

    // Merchant Identity Card (Sanitized)
    if (window.QSecurity) {
      window.QSecurity.safeSetText('resMerchantName', data.merchantName);
      window.QSecurity.safeSetText('resCity', data.city);
      window.QSecurity.safeSetText('resMCC', `${data.mcc} - ${data.mccDesc}`);

      // NMID Masking & Hash
      const maskedNMID = data.rawNMID ? (data.rawNMID.length > 8 ? data.rawNMID.slice(0, 4) + '****' + data.rawNMID.slice(-4) : data.rawNMID) : '-';
      window.QSecurity.safeSetText('resNMID', maskedNMID);
      window.QSecurity.safeSetText('resNMIDHash', data.nmidHash ? data.nmidHash.substring(0, 16) + '...' : '-');

      // Amount
      const amtStr = data.amount !== null && data.amount !== undefined ? `Rp ${Number(data.amount).toLocaleString('id-ID')} (Dinamis Terkunci)` : 'Bebas Input / Statis';
      window.QSecurity.safeSetText('resAmount', amtStr);

      // CRC Checksum Status
      const crcStatusStr = data.crcValid ? 'VALID (CRC-16 Sesuai)' : 'RUSAK / TIDAK VALID';
      window.QSecurity.safeSetText('resCRC', crcStatusStr);

      // AI Cognitive Insight
      window.QSecurity.safeSetText('resAiInsight', data.aiInsight);
      window.QSecurity.safeSetText('resTechnicalReason', data.technicalReason);
    }

    // Reaktif Tombol Primer
    if (el.btnActionPrimary) {
      el.btnActionPrimary.className = 'btn-action-primary';
      if (isSafe) {
        el.btnActionPrimary.classList.add('btn-safe');
        el.btnActionPrimary.textContent = 'Lanjut Transaksi di E-Wallet';
        el.btnActionPrimary.onclick = () => {
          showToast('Mengalihkan ke aplikasi pembayaran e-wallet...');
        };
      } else {
        el.btnActionPrimary.classList.add('btn-danger');
        el.btnActionPrimary.textContent = 'Batalkan & Laporkan Hash';
        el.btnActionPrimary.onclick = async () => {
          if (window.QSecurity && data.nmidHash) {
            await window.QSecurity.reportBlacklist(data.nmidHash, data.merchantName, data.verdict);
            showToast('Laporan berhasil dicatat dalam Zero-Knowledge Blacklist.');
          } else {
            showToast('Transaksi dibatalkan demi keamanan.');
          }
        };
      }
    }
  }

  // 6. Event Listeners Setup
  function initEventListeners() {
    // Tombol Back Header
    if (el.btnHeaderBack) {
      el.btnHeaderBack.addEventListener('click', handleBackNavigation);
    }

    // Tombol Scroll Atas & Bawah
    if (el.btnScrollTop) {
      el.btnScrollTop.addEventListener('click', scrollToTop);
    }
    if (el.btnScrollBottom) {
      el.btnScrollBottom.addEventListener('click', scrollToBottom);
    }

    // Pantau Scroll pada Viewport Main & Window
    if (el.appMain) {
      el.appMain.addEventListener('scroll', updateScrollButtons, { passive: true });
    }
    window.addEventListener('scroll', updateScrollButtons, { passive: true });

    // Dukungan Browser History / Tombol Back Peramban
    window.addEventListener('popstate', (e) => {
      const target = (e.state && e.state.layer) ? e.state.layer : LAYER_WELCOME;
      switchLayer(target, false);
    });

    // Navigasi Mulai
    if (el.btnStartScan) {
      el.btnStartScan.addEventListener('click', () => switchLayer(LAYER_SCANNER));
    }
    if (el.btnNavScanner) {
      el.btnNavScanner.addEventListener('click', () => switchLayer(LAYER_SCANNER));
    }

    // Tab Switcher (Kamera vs Upload)
    if (el.tabCamera && el.tabUpload) {
      el.tabCamera.addEventListener('click', () => {
        el.tabCamera.classList.add('active');
        el.tabUpload.classList.remove('active');
        if (el.viewCamera) el.viewCamera.classList.remove('hidden');
        if (el.viewUpload) el.viewUpload.classList.add('hidden');
        startCamera();
      });
      el.tabUpload.addEventListener('click', () => {
        el.tabUpload.classList.add('active');
        el.tabCamera.classList.remove('active');
        if (el.viewUpload) el.viewUpload.classList.remove('hidden');
        if (el.viewCamera) el.viewCamera.classList.add('hidden');
        stopCamera();
      });
    }

    // File Upload Handler (Dropzone & Input)
    if (el.fileInput) {
      el.fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) handleImageFile(file);
      });
    }

    if (el.dropzone) {
      el.dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        el.dropzone.classList.add('drag-over');
      });
      el.dropzone.addEventListener('dragleave', () => {
        el.dropzone.classList.remove('drag-over');
      });
      el.dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        el.dropzone.classList.remove('drag-over');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleImageFile(e.dataTransfer.files[0]);
        }
      });
      el.dropzone.addEventListener('click', () => {
        if (el.fileInput) el.fileInput.click();
      });
    }

    // 5 Built-in Demo Preset Handlers
    if (window.QRISDecoder) {
      const presets = window.QRISDecoder.getDemoPresets();

      if (el.btnDemoClean) {
        el.btnDemoClean.addEventListener('click', () => {
          showToast('Menjalankan Demo 1: UMKM Bersih (Warung Kopi)');
          processQRISPayload(presets.cleanUMKM);
        });
      }

      if (el.btnDemoCharity) {
        el.btnDemoCharity.addEventListener('click', () => {
          showToast('Menjalankan Demo 2: Kotak Amal Mismatch MCC');
          processQRISPayload(presets.charityMismatch);
        });
      }

      if (el.btnDemoJudol) {
        el.btnDemoJudol.addEventListener('click', () => {
          showToast('Menjalankan Demo 3: Tiket Depo Judol Nominal Unik');
          processQRISPayload(presets.judolTicket);
        });
      }

      if (el.btnDemoQuishing) {
        el.btnDemoQuishing.addEventListener('click', () => {
          showToast('Menjalankan Demo 4: Quishing Phishing URL');
          processQRISPayload(presets.quishingUrl);
        });
      }

      if (el.btnDemoChecksum) {
        el.btnDemoChecksum.addEventListener('click', () => {
          showToast('Menjalankan Demo 5: Checksum CRC-16 Rusak');
          processQRISPayload(presets.checksumTampered);
        });
      }
    }

    // Gemini API Key Config
    const savedKey = localStorage.getItem('qspect_gemini_key') || '';
    if (el.inputApiKey) el.inputApiKey.value = savedKey;
    updateKeyStatusPill(savedKey);

    if (el.btnSaveApiKey) {
      el.btnSaveApiKey.addEventListener('click', () => {
        const key = el.inputApiKey ? el.inputApiKey.value.trim() : '';
        if (key) {
          localStorage.setItem('qspect_gemini_key', key);
          showToast('Gemini API Key tersimpan di browser Anda.');
        } else {
          localStorage.removeItem('qspect_gemini_key');
          showToast('Gemini API Key dihapus (Mode Smart Mock aktif).');
        }
        updateKeyStatusPill(key);
      });
    }

    // Action Controller
    if (el.btnRescan) {
      el.btnRescan.addEventListener('click', () => switchLayer(LAYER_SCANNER));
    }

    if (el.btnCopyAuditCoupon) {
      el.btnCopyAuditCoupon.addEventListener('click', () => {
        if (!lastAuditData || !window.QSecurity) {
          showToast('Belum ada data audit untuk disalin.');
          return;
        }
        const couponText = window.QSecurity.generateAuditCoupon(lastAuditData);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(couponText).then(() => {
            showToast('Kupon Audit Digital disalin ke clipboard!');
          }).catch(() => {
            fallbackCopyText(couponText);
          });
        } else {
          fallbackCopyText(couponText);
        }
      });
    }
  }

  function fallbackCopyText(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showToast('Kupon Audit disalin!');
    } catch (e) {
      alert(text);
    }
    document.body.removeChild(textarea);
  }

  function updateKeyStatusPill(key) {
    if (!el.apiKeyStatus) return;
    if (key && key.length > 5) {
      el.apiKeyStatus.textContent = 'API Ready';
      el.apiKeyStatus.className = 'status-pill pill-active';
    } else {
      el.apiKeyStatus.textContent = 'Smart Mock Active';
      el.apiKeyStatus.className = 'status-pill pill-mock';
    }
  }

  // 7. Handle Image File (dengan kompresi kanvas sebelum AI)
  async function handleImageFile(file) {
    showToast('Membaca berkas gambar...');
    try {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = async (e) => {
        img.onload = async () => {
          let qrCode = null;
          if (window.QRISDecoder) {
            qrCode = await window.QRISDecoder.decodeQRFromImage(img);
          }
          if (qrCode) {
            showToast('QRIS berhasil diekstraksi dari gambar.');
            // Kompres gambar untuk inspeksi stiker multimodal bila perlu
            let compressed = null;
            if (window.QSecurity) {
              try {
                compressed = await window.QSecurity.compressImageForVision(file, 768, 0.75);
              } catch (err) {
                console.warn('Gagal mengompres gambar:', err);
              }
            }
            await processQRISPayload(qrCode, compressed ? (compressed.dataUrl || compressed.base64Data) : null);
          } else {
            alert('Tidak dapat mendeteksi kode QR pada gambar. Pastikan gambar jelas dan tidak terlalu buram.');
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert('Gagal memproses file: ' + err.message);
    }
  }

  // 8. Background Circuit Canvas Matrix Animation (Cyber Blue Matrix)
  function initCircuitCanvas() {
    const canvas = document.getElementById('circuitCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const count = 35;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.2
      });
    }

    function renderCanvas() {
      ctx.clearRect(0, 0, width, height);

      // Draw faint connections
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(14, 165, 233, ${0.15 * (1 - dist / 130)})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (let i = 0; i < count; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.fillStyle = `rgba(34, 211, 238, ${p.alpha})`;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(renderCanvas);
    }

    renderCanvas();
  }

  // Initialize Application on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    initCircuitCanvas();
    initEventListeners();
    switchLayer(LAYER_WELCOME);
  });

})();
