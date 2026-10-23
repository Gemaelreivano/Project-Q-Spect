/**
 * Q-SPECT UI Orchestration Controller
 * Location: /public/src/components/uiController.js
 * Compliant with DESIGN.md (Auralis 3-Layer Funnel, 3-Node Pipeline, GPU acceleration)
 * Zero-Trust Safe textContent Binding
 */

(function () {
  'use strict';

  // Global State
  const state = {
    currentLayer: 1, // 1: Welcome, 2: Scanner/Presets, 3: Verdict
    activeScanMode: 'camera', // 'camera' | 'file'
    cameraStream: null,
    scanInterval: null,
    isScanningActive: false,
    lastInspectedPayload: null,
    lastInspectionResult: null,
    geminiApiKey: localStorage.getItem('qspect_gemini_key') || ''
  };

  const els = {};

  document.addEventListener('DOMContentLoaded', () => {
    initDOMElements();
    initCircuitBackground();
    initEventListeners();
    initPresetButtons();
    loadStoredApiKey();
    setLayer(1);
  });

  function initDOMElements() {
    els.layerWelcome = document.getElementById('layerWelcome');
    els.layerScanner = document.getElementById('layerScanner');
    els.layerResult = document.getElementById('layerResult');
    els.navBreadcrumb = document.getElementById('navBreadcrumb');
    els.ambientWrapper = document.getElementById('ambientWrapper');
    els.cardContainer = document.getElementById('cardContainer');

    // Navigation buttons
    els.btnStartWelcome = document.getElementById('btnStartWelcome');
    els.btnBackToWelcome = document.getElementById('btnBackToWelcome');
    els.btnBackToScanner = document.getElementById('btnBackToScanner');
    els.btnScanAnother = document.getElementById('btnScanAnother');

    // API Key inputs
    els.inputApiKey = document.getElementById('inputApiKey');
    els.btnSaveApiKey = document.getElementById('btnSaveApiKey');
    els.apiKeyStatus = document.getElementById('apiKeyStatus');

    // Scanner tabs & media
    els.tabCamera = document.getElementById('tabCamera');
    els.tabFile = document.getElementById('tabFile');
    els.viewCamera = document.getElementById('viewCamera');
    els.viewFile = document.getElementById('viewFile');
    els.videoStream = document.getElementById('videoStream');
    els.fileInput = document.getElementById('fileInput');
    els.dropzone = document.getElementById('dropzone');
    els.scanStatusText = document.getElementById('scanStatusText');

    // Manual Input / Custom Payload
    els.btnToggleManual = document.getElementById('btnToggleManual');
    els.manualInputContainer = document.getElementById('manualInputContainer');
    els.manualPayloadInput = document.getElementById('manualPayloadInput');
    els.btnAnalyzeManual = document.getElementById('btnAnalyzeManual');

    // Layer 3 Result elements
    els.resVerdictBadge = document.getElementById('resVerdictBadge');
    els.resRiskScoreNumber = document.getElementById('resRiskScoreNumber');
    els.resRiskMeterFill = document.getElementById('resRiskMeterFill');
    els.resRiskLabel = document.getElementById('resRiskLabel');
    els.resMerchant = document.getElementById('resMerchant');
    els.resNmid = document.getElementById('resNmid');
    els.resNmidHash = document.getElementById('resNmidHash');
    els.resMcc = document.getElementById('resMcc');
    els.resCity = document.getElementById('resCity');
    els.resAmount = document.getElementById('resAmount');
    els.resPrintedName = document.getElementById('resPrintedName');
    els.resInsightText = document.getElementById('resInsightText');
    els.resTamperFlags = document.getElementById('resTamperFlags');
    els.btnCopyReceipt = document.getElementById('btnCopyReceipt');
    els.btnPrimaryAction = document.getElementById('btnPrimaryAction');
    els.btnReportAnomaly = document.getElementById('btnReportAnomaly');

    // Auralis 3-Node Pipeline elements
    els.nodeGate1 = document.getElementById('nodeGate1');
    els.nodeGate2 = document.getElementById('nodeGate2');
    els.nodeGate3 = document.getElementById('nodeGate3');

    // Bento Telemetry (Right Column for Desktop 880px)
    els.telemetryCrcStatus = document.getElementById('telemetryCrcStatus');
    els.telemetryInitiationType = document.getElementById('telemetryInitiationType');
    els.telemetryRawTlvBox = document.getElementById('telemetryRawTlvBox');
    els.telemetryZkProofBadge = document.getElementById('telemetryZkProofBadge');
  }

  function initEventListeners() {
    // Layer 1 -> Layer 2
    if (els.btnStartWelcome) {
      els.btnStartWelcome.addEventListener('click', () => setLayer(2));
    }

    // Layer 2 -> Layer 1 (Back Button)
    if (els.btnBackToWelcome) {
      els.btnBackToWelcome.addEventListener('click', () => {
        stopCamera();
        setLayer(1);
      });
    }

    // Layer 3 -> Layer 2 (Back Buttons)
    if (els.btnBackToScanner) {
      els.btnBackToScanner.addEventListener('click', () => setLayer(2));
    }
    if (els.btnScanAnother) {
      els.btnScanAnother.addEventListener('click', () => setLayer(2));
    }

    // Scanner Tabs
    if (els.tabCamera) {
      els.tabCamera.addEventListener('click', () => switchScanTab('camera'));
    }
    if (els.tabFile) {
      els.tabFile.addEventListener('click', () => switchScanTab('file'));
    }

    // API Key Save
    if (els.btnSaveApiKey) {
      els.btnSaveApiKey.addEventListener('click', saveApiKey);
    }

    // File Drag & Drop
    if (els.dropzone && els.fileInput) {
      els.dropzone.addEventListener('click', () => els.fileInput.click());
      els.fileInput.addEventListener('change', handleFileSelect);

      ['dragenter', 'dragover'].forEach(eventName => {
        els.dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          els.dropzone.classList.add('border-cyan-400');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        els.dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          els.dropzone.classList.remove('border-cyan-400');
        });
      });

      els.dropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files.length > 0) {
          processSelectedFile(e.dataTransfer.files[0]);
        }
      });
    }

    // Manual Input Toggle & Analyze
    if (els.btnToggleManual && els.manualInputContainer) {
      els.btnToggleManual.addEventListener('click', () => {
        els.manualInputContainer.classList.toggle('hidden');
      });
    }
    if (els.btnAnalyzeManual && els.manualPayloadInput) {
      els.btnAnalyzeManual.addEventListener('click', () => {
        const val = els.manualPayloadInput.value.trim();
        if (val) executeInspection(val, null);
      });
    }

    // Copy Audit Receipt
    if (els.btnCopyReceipt) {
      els.btnCopyReceipt.addEventListener('click', async () => {
        if (!state.lastInspectionResult) return;
        const receipt = window.ZKSecurity.generateAuditReceipt(state.lastInspectionResult);
        await window.ZKSecurity.copyReceiptToClipboard(receipt, els.btnCopyReceipt);
      });
    }

    // Report Anomaly Action
    if (els.btnReportAnomaly) {
      els.btnReportAnomaly.addEventListener('click', handleReportMerchant);
    }
  }

  /**
   * Layer State Switcher with GPU Acceleration
   */
  function setLayer(layerNumber) {
    state.currentLayer = layerNumber;

    if (els.layerWelcome) els.layerWelcome.classList.add('hidden');
    if (els.layerScanner) els.layerScanner.classList.add('hidden');
    if (els.layerResult) els.layerResult.classList.add('hidden');

    if (els.ambientWrapper) els.ambientWrapper.className = 'sensor-ambient-wrapper';
    if (els.cardContainer) els.cardContainer.className = 'crystal-glass-card p-5 sm:p-6';

    if (layerNumber === 1) {
      if (els.layerWelcome) els.layerWelcome.classList.remove('hidden');
      if (els.navBreadcrumb) els.navBreadcrumb.textContent = 'Layer 1 / Welcome';
    } else if (layerNumber === 2) {
      if (els.layerScanner) els.layerScanner.classList.remove('hidden');
      if (els.navBreadcrumb) els.navBreadcrumb.textContent = 'Layer 2 / QRIS Scanner';
      if (state.activeScanMode === 'camera') startCamera();
    } else if (layerNumber === 3) {
      if (els.layerResult) els.layerResult.classList.remove('hidden');
      if (els.navBreadcrumb) els.navBreadcrumb.textContent = 'Layer 3 / Security Analysis';
      stopCamera();
    }
  }

  function switchScanTab(mode) {
    state.activeScanMode = mode;
    if (mode === 'camera') {
      if (els.tabCamera) els.tabCamera.className = 'flex-1 py-1.5 text-xs font-semibold rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/30';
      if (els.tabFile) els.tabFile.className = 'flex-1 py-1.5 text-xs font-semibold rounded-lg text-slate-400 hover:text-slate-200';
      if (els.viewCamera) els.viewCamera.classList.remove('hidden');
      if (els.viewFile) els.viewFile.classList.add('hidden');
      startCamera();
    } else {
      if (els.tabFile) els.tabFile.className = 'flex-1 py-1.5 text-xs font-semibold rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/30';
      if (els.tabCamera) els.tabCamera.className = 'flex-1 py-1.5 text-xs font-semibold rounded-lg text-slate-400 hover:text-slate-200';
      if (els.viewCamera) els.viewCamera.classList.add('hidden');
      if (els.viewFile) els.viewFile.classList.remove('hidden');
      stopCamera();
    }
  }

  async function startCamera() {
    if (state.cameraStream) return;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (els.scanStatusText) els.scanStatusText.textContent = 'Kamera tidak didukung browser. Pilih salah satu tombol preset di bawah:';
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 720 }, height: { ideal: 720 } }
      });
      state.cameraStream = stream;
      if (els.videoStream) {
        els.videoStream.srcObject = stream;
        els.videoStream.play();
      }
      state.isScanningActive = true;
      startBarcodeDetection();
      if (els.scanStatusText) els.scanStatusText.textContent = 'Posisikan kode QRIS di dalam bingkai laser...';
    } catch (err) {
      if (els.scanStatusText) {
        els.scanStatusText.textContent = 'Sensor kamera offline. Pilih sampel simulasi cepat di bawah atau upload file:';
      }
    }
  }

  function stopCamera() {
    state.isScanningActive = false;
    if (state.scanInterval) {
      clearInterval(state.scanInterval);
      state.scanInterval = null;
    }
    if (state.cameraStream) {
      state.cameraStream.getTracks().forEach(track => track.stop());
      state.cameraStream = null;
    }
  }

  function startBarcodeDetection() {
    if (!('BarcodeDetector' in window)) return;
    try {
      const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
      state.scanInterval = setInterval(async () => {
        if (!state.isScanningActive || !els.videoStream || els.videoStream.readyState < 2) return;
        try {
          const codes = await barcodeDetector.detect(els.videoStream);
          if (codes.length > 0 && codes[0].rawValue) {
            stopCamera();
            executeInspection(codes[0].rawValue, null);
          }
        } catch (e) {
          // Frame read skip
        }
      }, 350);
    } catch (e) {}
  }

  function handleFileSelect(event) {
    const file = event.target.files && event.target.files[0];
    if (file) processSelectedFile(file);
  }

  function processSelectedFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Format berkas harus berupa gambar (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Client-side Image Compression (max 768px, webp 0.75) per AGENTS.md
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 768;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/webp', 0.75);

        if ('BarcodeDetector' in window) {
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          detector.detect(img).then(codes => {
            if (codes.length > 0 && codes[0].rawValue) {
              executeInspection(codes[0].rawValue, compressedBase64);
            } else {
              executeInspection('UNPARSED_VISUAL_STICKER', compressedBase64);
            }
          }).catch(() => {
            executeInspection('UNPARSED_VISUAL_STICKER', compressedBase64);
          });
        } else {
          executeInspection('UNPARSED_VISUAL_STICKER', compressedBase64);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function initPresetButtons() {
    const container = document.getElementById('demoPresetsContainer');
    if (!container || !window.QrisParser) return;

    container.innerHTML = '';
    const presets = window.QrisParser.DEMO_PRESETS;

    presets.forEach(p => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'preset-card w-full p-2.5 text-left flex flex-col gap-1';
      
      const dotColorClass = p.color === 'emerald' ? 'bg-emerald-400' : (p.color === 'amber' ? 'bg-amber-400' : 'bg-rose-500');

      btn.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full ${dotColorClass}"></span>
            ${escapeHTML(p.name)}
          </span>
          <span class="text-[10px] font-mono text-cyan-400 border border-cyan-400/25 px-1.5 py-0.5 rounded">Uji Cepat</span>
        </div>
        <p class="text-[11px] text-sky-200/60 leading-tight">${escapeHTML(p.tagline)}</p>
      `;

      btn.addEventListener('click', () => {
        executeInspection(p.payload, null);
      });

      container.appendChild(btn);
    });
  }

  /**
   * Main Forensic Inspection Pipeline
   */
  async function executeInspection(rawPayload, imageBase64) {
    state.lastInspectedPayload = rawPayload;
    setLayer(3);

    // Initial Loading State
    if (els.resVerdictBadge) {
      els.resVerdictBadge.textContent = 'MENGANALISIS...';
      els.resVerdictBadge.className = 'font-mono text-xs px-3 py-1 rounded-full border border-sky-400/40 bg-sky-500/10 text-sky-300 animate-pulse';
    }
    if (els.resInsightText) {
      els.resInsightText.textContent = 'Membedah TLV EMVCo, validasi CRC-16, dan mengevaluasi heuristik transaksi...';
    }

    // Step 1: Client-Side EMVCo TLV Parsing & 3 Gates
    const parsed = window.QrisParser.parseQRIS(rawPayload);
    const localAnalysis = window.QrisParser.analyzeHeuristics(parsed);

    // Step 2: Zero-Knowledge Client-Side Deterministic Blind Hashing
    const nmid = parsed.nmid !== 'N/A' ? parsed.nmid : (parsed.merchantName || 'UNKNOWN');
    const nmidHash = await window.ZKSecurity.computeSHA256(nmid);

    // Step 3: Check Local Blacklist
    let isBlacklisted = window.ZKSecurity.checkLocalBlacklist(nmidHash);

    // Step 4: Backend AI Inspection Proxy (Gemini 2.5 Flash + Mock Fallback)
    let aiVerdict = {
      riskScore: localAnalysis.riskScore,
      verdict: localAnalysis.verdict,
      detectedCategory: localAnalysis.category,
      printedNameOnImage: parsed.merchantName || 'Stiker QRIS Fisik',
      shortInsightId: localAnalysis.insight,
      tamperFlags: localAnalysis.flags || []
    };

    try {
      const response = await fetch('/api/ai/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrPayload: rawPayload,
          parsedData: parsed,
          imageBase64: imageBase64,
          apiKey: state.geminiApiKey
        })
      });

      if (response.ok) {
        const json = await response.json();
        if (json.data) {
          aiVerdict = {
            riskScore: json.data.riskScore,
            verdict: json.data.verdict,
            detectedCategory: json.data.detectedCategory,
            printedNameOnImage: json.data.printedNameOnImage || parsed.merchantName,
            shortInsightId: json.data.shortInsightId || localAnalysis.insight,
            tamperFlags: localAnalysis.flags || []
          };
        }
      }
    } catch (e) {
      console.warn('[Q-SPECT] Backend AI offline, continuing with local heuristics:', e);
    }

    if (isBlacklisted) {
      aiVerdict.riskScore = Math.max(aiVerdict.riskScore, 98);
      aiVerdict.verdict = 'BAHAYA';
      aiVerdict.detectedCategory = 'BLACKLISTED_MERCHANT';
      aiVerdict.shortInsightId = 'TERDETEKSI BLACKLIST: Identitas tersamar (SHA-256) merchant ini telah diblokir.';
    }

    state.lastInspectionResult = {
      nmidHash,
      merchantName: parsed.merchantName,
      riskScore: aiVerdict.riskScore,
      verdict: aiVerdict.verdict,
      category: aiVerdict.detectedCategory,
      crcValid: parsed.crcValid
    };

    renderVerdictUI(parsed, aiVerdict, nmidHash);
    renderDesktopTelemetry(parsed, aiVerdict, nmidHash);
    renderAuralisPipeline(parsed, aiVerdict);
  }

  /**
   * Render Layer 3 Output Analysis
   */
  function renderVerdictUI(parsed, analysis, nmidHash) {
    const score = analysis.riskScore;
    const verdict = analysis.verdict;

    if (score <= 30) {
      els.ambientWrapper.className = 'sensor-ambient-wrapper safe';
      els.cardContainer.className = 'crystal-glass-card safe-border p-5 sm:p-6';
      els.resVerdictBadge.className = 'font-mono text-xs px-3 py-1 rounded-full border border-emerald-400 bg-emerald-500/20 text-emerald-400 font-bold';
      els.resVerdictBadge.textContent = 'APPROVE / AMAN';
      els.resRiskMeterFill.className = 'risk-meter-fill h-full bg-emerald-400 rounded-full';
      els.resRiskLabel.textContent = `${score} / 100 — Transaksi Terverifikasi Sah`;
      els.btnPrimaryAction.className = 'flex-1 py-2.5 px-4 rounded-xl font-bold text-sm bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/25';
      els.btnPrimaryAction.textContent = 'Lanjut Transaksi';
      els.btnReportAnomaly.classList.add('hidden');
    } else if (score <= 70) {
      els.ambientWrapper.className = 'sensor-ambient-wrapper warning';
      els.cardContainer.className = 'crystal-glass-card warning-border p-5 sm:p-6';
      els.resVerdictBadge.className = 'font-mono text-xs px-3 py-1 rounded-full border border-amber-400 bg-amber-500/20 text-amber-400 font-bold';
      els.resVerdictBadge.textContent = 'WASPADA / ANOMALI';
      els.resRiskMeterFill.className = 'risk-meter-fill h-full bg-amber-400 rounded-full';
      els.resRiskLabel.textContent = `${score} / 100 — Perlu Konfirmasi Kasir';
      els.btnPrimaryAction.className = 'flex-1 py-2.5 px-4 rounded-xl font-bold text-sm bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/25';
      els.btnPrimaryAction.textContent = 'Cek Ulang Kasir';
      els.btnReportAnomaly.classList.remove('hidden');
    } else {
      els.ambientWrapper.className = 'sensor-ambient-wrapper danger';
      els.cardContainer.className = 'crystal-glass-card danger-border p-5 sm:p-6';
      els.resVerdictBadge.className = 'font-mono text-xs px-3 py-1 rounded-full border border-rose-500 bg-rose-500/25 text-rose-400 font-bold';
      els.resVerdictBadge.textContent = 'BAHAYA / BLOCKED';
      els.resRiskMeterFill.className = 'risk-meter-fill h-full bg-rose-500 rounded-full';
      els.resRiskLabel.textContent = `${score} / 100 — Ancaman Finansial Kritis`;
      els.btnPrimaryAction.className = 'flex-1 py-2.5 px-4 rounded-xl font-bold text-sm bg-rose-600 text-white hover:bg-rose-500 transition-all shadow-lg shadow-rose-600/30';
      els.btnPrimaryAction.textContent = 'Batalkan Transaksi';
      els.btnReportAnomaly.classList.remove('hidden');
    }

    els.resRiskMeterFill.style.width = `${score}%`;
    els.resRiskScoreNumber.textContent = `${score}%`;

    // Safe textContent injection to eliminate XSS
    window.ZKSecurity.safeSetText('resMerchant', parsed.merchantName || 'N/A');
    window.ZKSecurity.safeSetText('resNmid', parsed.nmid || 'N/A');
    window.ZKSecurity.safeSetText('resNmidHash', nmidHash ? `${nmidHash.substring(0, 16)}...` : 'N/A');
    window.ZKSecurity.safeSetText('resMcc', `${parsed.mcc} (${parsed.mccLabel})`);
    window.ZKSecurity.safeSetText('resCity', parsed.city || 'INDONESIA');
    window.ZKSecurity.safeSetText('resPrintedName', analysis.printedNameOnImage || (parsed.merchantName || 'N/A'));

    const formattedAmount = parsed.amount 
      ? `Rp ${parsed.amount.toLocaleString('id-ID')}` 
      : 'Bebas (Input Manual Pengguna)';
    window.ZKSecurity.safeSetText('resAmount', formattedAmount);
    window.ZKSecurity.safeSetText('resInsightText', analysis.shortInsightId);

    // Render Tamper Flags
    if (els.resTamperFlags) {
      els.resTamperFlags.innerHTML = '';
      const flags = analysis.tamperFlags || [];
      if (flags.length === 0) {
        const span = document.createElement('span');
        span.className = 'text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded';
        span.textContent = 'Clean EMVCo Spectrum';
        els.resTamperFlags.appendChild(span);
      } else {
        flags.forEach(f => {
          const span = document.createElement('span');
          span.className = 'text-[11px] font-mono text-rose-300 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded';
          span.textContent = f;
          els.resTamperFlags.appendChild(span);
        });
      }
    }
  }

  /**
   * Auralis 3-Node Pipeline Visualization
   */
  function renderAuralisPipeline(parsed, analysis) {
    // Node 1: Quishing & Format Check
    if (els.nodeGate1) {
      if (parsed.isQuishing || !parsed.isValid) {
        els.nodeGate1.className = 'flex-1 p-2 rounded-lg bg-rose-500/15 border border-rose-500/40 text-center text-[10px] font-mono text-rose-300';
        els.nodeGate1.textContent = 'Node 1: Phishing URL';
      } else {
        els.nodeGate1.className = 'flex-1 p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-center text-[10px] font-mono text-emerald-300';
        els.nodeGate1.textContent = 'Node 1: Prefix OK';
      }
    }

    // Node 2: CRC-16 Checksum
    if (els.nodeGate2) {
      if (parsed.crcValid) {
        els.nodeGate2.className = 'flex-1 p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-center text-[10px] font-mono text-emerald-300';
        els.nodeGate2.textContent = 'Node 2: CRC16 Valid';
      } else {
        els.nodeGate2.className = 'flex-1 p-2 rounded-lg bg-rose-500/15 border border-rose-500/40 text-center text-[10px] font-mono text-rose-300';
        els.nodeGate2.textContent = 'Node 2: CRC Rusak';
      }
    }

    // Node 3: Judol / Transaction Laundering
    if (els.nodeGate3) {
      if (analysis.detectedCategory === 'JUDOL_DEPOSIT_TICKET') {
        els.nodeGate3.className = 'flex-1 p-2 rounded-lg bg-rose-500/15 border border-rose-500/40 text-center text-[10px] font-mono text-rose-300';
        els.nodeGate3.textContent = 'Node 3: Judol Ticket';
      } else if (analysis.detectedCategory === 'MCC_MISMATCH') {
        els.nodeGate3.className = 'flex-1 p-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-center text-[10px] font-mono text-amber-300';
        els.nodeGate3.textContent = 'Node 3: MCC Anomali';
      } else {
        els.nodeGate3.className = 'flex-1 p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-center text-[10px] font-mono text-emerald-300';
        els.nodeGate3.textContent = 'Node 3: Heuristik Sah';
      }
    }
  }

  function renderDesktopTelemetry(parsed, analysis, nmidHash) {
    if (els.telemetryCrcStatus) {
      els.telemetryCrcStatus.textContent = parsed.crcValid ? 'PASS (CRC-16 CCITT 0x1021 Valid)' : 'FAIL (CRC Mismatch)';
      els.telemetryCrcStatus.className = parsed.crcValid ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold';
    }

    if (els.telemetryInitiationType) {
      els.telemetryInitiationType.textContent = parsed.isDynamic ? 'Dinamis (Tag 01 = 12)' : 'Statis (Tag 01 = 11)';
    }

    if (els.telemetryZkProofBadge) {
      els.telemetryZkProofBadge.textContent = `SHA-256: ${nmidHash ? nmidHash.substring(0, 24) : 'N/A'}...`;
    }

    if (els.telemetryRawTlvBox) {
      const tagEntries = Object.entries(parsed.tags || {})
        .map(([tag, val]) => `[Tag ${tag}]: "${val}"`)
        .join('\n');
      els.telemetryRawTlvBox.textContent = tagEntries || (parsed.rawPayload ? `[RAW]: ${parsed.rawPayload}` : 'No TLV Data');
    }
  }

  async function handleReportMerchant() {
    if (!state.lastInspectionResult || !state.lastInspectionResult.nmidHash) return;
    const hash = state.lastInspectionResult.nmidHash;
    const reason = prompt('Masukkan alasan pelaporan merchant ini:', 'Terindikasi Rekening Tiket Judol');
    if (!reason) return;

    window.ZKSecurity.registerLocalBlacklist(hash);
    try {
      await fetch('/api/blacklist/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nmidHash: hash, reason: reason })
      });
      alert('Laporan berhasil didaftarkan secara Zero-Knowledge.');
    } catch (e) {
      alert('Laporan tersimpan di memori lokal peramban.');
    }
  }

  function loadStoredApiKey() {
    if (state.geminiApiKey && els.inputApiKey) {
      els.inputApiKey.value = state.geminiApiKey;
      if (els.apiKeyStatus) {
        els.apiKeyStatus.textContent = 'API Key Klien Aktif';
        els.apiKeyStatus.className = 'text-[10px] font-mono text-emerald-400';
      }
    }
  }

  function saveApiKey() {
    if (!els.inputApiKey) return;
    const val = els.inputApiKey.value.trim();
    state.geminiApiKey = val;
    localStorage.setItem('qspect_gemini_key', val);
    if (els.apiKeyStatus) {
      els.apiKeyStatus.textContent = val ? 'Tersimpan di Sisi Klien' : 'Mock Default Aktif';
      els.apiKeyStatus.className = 'text-[10px] font-mono text-cyan-300';
    }
  }

  function initCircuitBackground() {
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
    const particleCount = Math.min(35, Math.floor(width / 35));

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 1
      });
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(6, 182, 212, 0.08)';
      ctx.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      ctx.fillStyle = 'rgba(34, 211, 238, 0.4)';
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      requestAnimationFrame(animate);
    }

    animate();
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

})();
