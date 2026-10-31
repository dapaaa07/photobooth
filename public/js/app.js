/**
 * Main Application Controller & Kiosk Router with Step-by-Step Retake
 */
document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    selectedLayout: '3x2-grid',
    targetShots: 3,   // Default 3 camera photos for 3x2 grid
    currentShotIndex: 0,
    photos: [],       // Holds raw camera photos [A, B, C]
    frameTheme: 'diesnat-3x2_1',
    filter: 'normal',
    brandingText: 'DIESNATALIS HIMATIKOM 2026',
    renderedFileName: null,
    userEmail: '',
    sessionToken: null, // validated at scan, consumed only on Drive upload
    // Session timer & recap state
    timerSecondsLeft: 0,
    sessionExpired: false,
    pendingCapture: false,
    finalized: false,
    captures: [],          // Chronological capture history for the recap
    placeholderSlots: new Set()
  };

  // UI Screens & Controls
  const screens = {
    welcome: document.getElementById('screen-welcome'),
    layout: document.getElementById('screen-layout'),
    camera: document.getElementById('screen-camera'),
    editor: document.getElementById('screen-editor'),
    success: document.getElementById('screen-success')
  };

  const btnSnapStart = document.getElementById('btn-snap-start');
  const snapBtnText = document.getElementById('snap-btn-text');
  const btnSnapRetakeCurrent = document.getElementById('btn-snap-retake-current');
  const btnCameraNext = document.getElementById('btn-camera-next');
  const cameraStatusText = document.getElementById('camera-status-text');
  const thumbnailsStrip = document.getElementById('camera-thumbnails-strip');

  // Initialize Modules
  const camera = new PhotoboothCamera();
  const editorCanvas = document.getElementById('preview-canvas');
  const editor = new PhotoboothEditor(editorCanvas);
  
  let resetTimer = null;

  // --- Session timer & recap player ---
  // Camera session budget by shot count: 1 foto = 90 dtk, 2 foto = 135 dtk, 3 foto = 180 dtk
  const SESSION_SECONDS = { 1: 90, 2: 135, 3: 180 };
  const EDITOR_SECONDS = 90;
  const RECAP_INTERVAL_MS = 850;
  const MAX_CAPTURES = 15;
  // Commissioning helper: /?sessionsecs=8 shortens the deadline for setup tests
  const SESSION_SECONDS_OVERRIDE = (() => {
    const v = parseInt(new URLSearchParams(location.search).get('sessionsecs'), 10);
    return typeof v === 'number' && v > 0 ? v : null;
  })();

  // Camera orientation controls (Mirror / Mirrorless / Balik 180°).
  // Choice persists per device in localStorage and applies to preview + capture alike.
  const orientRow = document.getElementById('cam-orient-row');
  const btnWelcomeFlip = document.getElementById('btn-welcome-flip');
  const btnCameraMirrorToggle = document.getElementById('btn-camera-mirror-toggle');

  function showCameraNotice(msg) {
    let notice = document.getElementById('camera-mode-toast');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'camera-mode-toast';
      notice.className = 'camera-mode-toast';
      const container = document.querySelector('.camera-container');
      if (container) container.appendChild(notice);
    }
    notice.textContent = msg;
    notice.classList.remove('show');
    void notice.offsetWidth;
    notice.classList.add('show');
    clearTimeout(notice._timer);
    notice._timer = setTimeout(() => notice.classList.remove('show'), 1600);
  }

  function updateOrientationUI() {
    const isMirror = camera.fix === 'mirror';

    if (btnCameraMirrorToggle) {
      btnCameraMirrorToggle.classList.toggle('is-mirror', isMirror);
      btnCameraMirrorToggle.classList.toggle('is-mirrorless', !isMirror);
      const label = btnCameraMirrorToggle.querySelector('.mirror-label');
      const tag = btnCameraMirrorToggle.querySelector('.mirror-tag');
      if (label) {
        label.textContent = isMirror ? 'Mirror' : 'Mirrorless';
      }
      if (tag) {
        tag.textContent = isMirror ? 'Cermin' : 'Normal';
      }
      btnCameraMirrorToggle.setAttribute('aria-pressed', isMirror ? 'true' : 'false');
      btnCameraMirrorToggle.setAttribute(
        'title',
        isMirror ? 'Mode Cermin Aktif. Klik untuk ganti ke Mirrorless (Normal).' : 'Mode Mirrorless (Normal). Klik untuk ganti ke Mirror (Cermin).'
      );
    }

    if (orientRow) {
      orientRow.querySelectorAll('[data-cam-fix]').forEach(b =>
        b.classList.toggle('selected', b.getAttribute('data-cam-fix') === camera.fix));
    }
    if (btnWelcomeFlip) {
      btnWelcomeFlip.classList.toggle('selected', isMirror);
    }
  }

  if (btnCameraMirrorToggle) {
    btnCameraMirrorToggle.addEventListener('click', () => {
      const nextMode = camera.fix === 'mirror' ? 'none' : 'mirror';
      camera.setFix(nextMode);
      updateOrientationUI();
      showCameraNotice(nextMode === 'mirror' ? 'Mode Kamera: Mirror (Cermin)' : 'Mode Kamera: Mirrorless (Normal)');
    });
  }

  if (orientRow) {
    orientRow.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-cam-fix]');
      if (!btn) return;
      const fix = btn.getAttribute('data-cam-fix');
      camera.setFix(fix);
      updateOrientationUI();
      if (fix === 'mirror') showCameraNotice('Mode Kamera: Mirror (Cermin)');
      else if (fix === 'none') showCameraNotice('Mode Kamera: Mirrorless (Normal)');
      else if (fix === 'rotate180') showCameraNotice('Mode Kamera: Balik 180°');
    });
  }

  if (btnWelcomeFlip) {
    btnWelcomeFlip.addEventListener('click', () => {
      camera.setFix(camera.fix === 'mirror' ? 'none' : 'mirror');
      updateOrientationUI();
    });
  }

  window.onPhotoboothCameraFixChanged = updateOrientationUI;
  setInterval(updateOrientationUI, 1500);
  updateOrientationUI();

  // Layout cards: ensure each preview box has its frame miniature.
  document.querySelectorAll('.layout-card').forEach(card => {
    const box = card.querySelector('.layout-preview-box');
    if (!box) return;
    box.removeAttribute('style');
    if (!box.querySelector('img')) {
      PhotoboothCamera.buildLayoutMini(card.dataset.layout).then(url => {
        if (!url) return;
        box.innerHTML = '<img src="' + url + '" alt="Pratinjau ' + card.dataset.layout + '">';
      }).catch(() => { /* keep generic grid */ });
    }
  });

  const sessionTimerBadge = document.getElementById('session-timer-badge');
  const sessionTimerText = document.getElementById('session-timer-text');
  const editorTimeoutNotice = document.getElementById('editor-timeout-notice');
  const recap = new PhotoboothRecap(document.getElementById('rekap-canvas'));

  let sessionTimer = null;

  function getSessionDurationSeconds() {
    if (SESSION_SECONDS_OVERRIDE) return SESSION_SECONDS_OVERRIDE;
    return SESSION_SECONDS[state.targetShots] || 180;
  }

  function startSessionTimer() {
    stopSessionTimer();
    state.timerSecondsLeft = getSessionDurationSeconds();
    sessionTimer = setInterval(() => {
      state.timerSecondsLeft--;
      updateTimerBadge();

      if (state.timerSecondsLeft > 0 && state.timerSecondsLeft <= 10) {
        camera.playBeep(1000, 0.1);
      }
      if (state.timerSecondsLeft <= 0) {
        handleSessionTimeout();
      }
    }, 1000);
  }

  function stopSessionTimer() {
    if (sessionTimer) {
      clearInterval(sessionTimer);
      sessionTimer = null;
    }
  }

  // --- Editor countdown (90 dtk): auto-lanjut ke render saat habis ---
  const editorTimerBadge = document.getElementById('editor-timer-badge');
  const editorTimerText = document.getElementById('editor-timer-text');
  let editorTimer = null;
  let editorSecondsLeft = 0;

  function updateEditorBadge() {
    if (!editorTimerText) return;
    const secs = Math.max(0, editorSecondsLeft);
    const mm = String(Math.floor(secs / 60)).padStart(2, '0');
    const ss = String(secs % 60).padStart(2, '0');
    editorTimerText.textContent = mm + ':' + ss;
    if (editorTimerBadge) {
      editorTimerBadge.classList.toggle('low', secs <= 30);
    }
  }

  function startEditorTimer() {
    stopEditorTimer();
    editorSecondsLeft = EDITOR_SECONDS;
    updateEditorBadge();
    editorTimer = setInterval(() => {
      editorSecondsLeft--;
      updateEditorBadge();

      if (editorSecondsLeft > 0 && editorSecondsLeft <= 10) {
        camera.playBeep(1000, 0.1);
      }
      if (editorSecondsLeft <= 0) {
        stopEditorTimer();
        // Waktu editor habis: lanjut otomatis seperti menekan Lanjut
        const btnSave = document.getElementById('btn-save-editor');
        if (btnSave && !btnSave.disabled) btnSave.click();
      }
    }, 1000);
  }

  function stopEditorTimer() {
    if (editorTimer) {
      clearInterval(editorTimer);
      editorTimer = null;
    }
  }

  function updateTimerBadge() {
    if (!sessionTimerText) return;
    const secs = Math.max(0, state.timerSecondsLeft);
    const mm = String(Math.floor(secs / 60)).padStart(2, '0');
    const ss = String(secs % 60).padStart(2, '0');
    sessionTimerText.textContent = mm + ':' + ss;
    if (sessionTimerBadge) {
      sessionTimerBadge.classList.toggle('low', secs <= 30);
    }
  }

  // Capture history for the recap slide show (oldest entries dropped when full)
  function pushCapture(dataUrl) {
    if (!dataUrl) return;
    state.captures.push(dataUrl);
    if (state.captures.length > MAX_CAPTURES) {
      state.captures.shift();
    }
  }

  // Solid black stand-in for shot slots that never got captured in time
  function makeBlackPhoto() {
    const c = document.createElement('canvas');
    c.width = 1200;
    c.height = 1600;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.9);
  }

  function handleSessionTimeout() {
    if (state.sessionExpired) return;
    state.sessionExpired = true;
    stopSessionTimer();
    state.timerSecondsLeft = 0;
    updateTimerBadge();
    camera.playBeep(320, 0.5);

    cameraStatusText.textContent = 'Waktu Habis';
    btnSnapStart.disabled = true;
    btnSnapRetakeCurrent.disabled = true;
    btnCameraNext.disabled = true;

    // Let an in-flight capture land first; it counts as captured in time
    if (state.pendingCapture) return;
    finalizeTimedOutSession();
  }

  function finalizeTimedOutSession() {
    if (state.finalized) return;
    state.finalized = true;
    stopSessionTimer();

    const blackPhoto = makeBlackPhoto();
    while (state.photos.length < state.targetShots) {
      state.placeholderSlots.add(state.photos.length);
      state.photos.push(blackPhoto);
    }

    editor.loadSession(state.photos, state.selectedLayout);
    if (editorTimeoutNotice) editorTimeoutNotice.style.display = 'block';
    showScreen('editor');
  }

  /**
   * Screen Navigation Helper
   */
  function showScreen(screenId) {
    Object.keys(screens).forEach(key => {
      if (screens[key]) {
        screens[key].classList.remove('active');
      }
    });

    if (screens[screenId]) {
      screens[screenId].classList.add('active');
    }

    if (screenId !== 'success') {
      recap.stop();
    }

    // Lifecycle actions per screen
    if (screenId === 'welcome') {
      startWelcomeScan();
    } else if (screenId === 'camera') {
      stopWelcomeScan();
      stopEditorTimer();
      camera.startCamera();
      resetCameraSessionUI();
      // Crop guide depends on layout+theme and on live video dims; refresh
      // now and again once metadata arrives
      camera.updateCropGuideFor(state.selectedLayout, state.frameTheme);
      const feed = document.getElementById('video-feed');
      if (feed && !feed.dataset.guideHooked) {
        feed.dataset.guideHooked = '1';
        feed.addEventListener('loadedmetadata', () => {
          camera.updateCropGuideFor(state.selectedLayout, state.frameTheme);
        });
      }
    } else if (screenId === 'editor') {
      stopWelcomeScan();
      startEditorTimer();
    } else {
      stopWelcomeScan();
      camera.stopCamera();
      stopEditorTimer();
    }
  }

  // Keep the crop guide aligned when the kiosk viewport changes
  window.addEventListener('resize', () => {
    if (screens.camera && screens.camera.classList.contains('active')) {
      camera.updateCropGuideFor(state.selectedLayout, state.frameTheme);
    }
  });

  /**
   * Reset Camera Session UI state
   */
  function resetCameraSessionUI() {
    state.currentShotIndex = 0;
    state.photos = [];
    state.captures = [];
    state.placeholderSlots = new Set();
    state.sessionExpired = false;
    state.pendingCapture = false;
    state.finalized = false;
    cameraStatusText.textContent = `Siap Mengambil Foto 1 dari ${state.targetShots}`;
    snapBtnText.textContent = `AMBIL FOTO 1`;
    btnSnapStart.style.display = 'inline-flex';
    btnSnapStart.disabled = false;
    btnSnapRetakeCurrent.style.display = 'none';
    btnCameraNext.style.display = 'none';
    renderThumbnails();
    startSessionTimer();
  }

  /**
   * Render camera thumbnails strip with per-photo retake buttons
   */
  function renderThumbnails() {
    thumbnailsStrip.innerHTML = '';

    if (!state.photos || state.photos.length === 0) {
      thumbnailsStrip.style.display = 'none';
      return;
    }

    thumbnailsStrip.style.display = 'flex';

    state.photos.forEach((photoDataUrl, index) => {
      const thumbBox = document.createElement('div');
      thumbBox.className = 'thumb-box';

      const img = document.createElement('img');
      img.src = photoDataUrl;
      img.alt = `Foto ${index + 1}`;

      const label = document.createElement('span');
      label.className = 'thumb-label';
      label.textContent = `Foto ${index + 1}`;

      const retakeBtn = document.createElement('button');
      retakeBtn.className = 'btn-thumb-retake';
      const locked = state.sessionExpired && state.placeholderSlots.has(index);
      retakeBtn.innerHTML = locked ? 'Kosong' : 'Ulang';
      retakeBtn.disabled = locked;
      retakeBtn.onclick = () => handleRetakeShot(index);

      thumbBox.appendChild(img);
      thumbBox.appendChild(label);
      thumbBox.appendChild(retakeBtn);

      thumbnailsStrip.appendChild(thumbBox);
    });

    // If all required shots are captured
    if (state.photos.length >= state.targetShots) {
      btnCameraNext.style.display = 'inline-flex';
    }
  }

  /**
   * Retake a specific shot index
   */
  async function handleRetakeShot(shotIndex) {
    if (state.sessionExpired && state.placeholderSlots.has(shotIndex)) return;
    btnSnapStart.disabled = true;
    btnSnapRetakeCurrent.disabled = true;
    btnCameraNext.disabled = true;

    cameraStatusText.textContent = `Mengulang Foto ke-${shotIndex + 1}...`;

    state.pendingCapture = true;
    let newPhoto = null;
    try {
      newPhoto = await camera.retakeSingleShot(shotIndex, (progress) => {
        if (progress.status === 'counting') {
          cameraStatusText.textContent = `Mengulang Foto ${shotIndex + 1}...`;
        }
      });
    } finally {
      state.pendingCapture = false;
    }

    state.photos[shotIndex] = newPhoto;
    pushCapture(newPhoto);

    if (state.sessionExpired) {
      finalizeTimedOutSession();
      return;
    }

    cameraStatusText.textContent = `Foto ${shotIndex + 1} Berhasil Diperbarui!`;

    btnSnapStart.disabled = false;
    btnSnapRetakeCurrent.disabled = false;
    btnCameraNext.disabled = false;
    renderThumbnails();
  }

  // --- SCREEN 1: WELCOME ---
  document.getElementById('btn-start').addEventListener('click', () => {
    camera.initAudio();
    showScreen('layout');
  });

  // --- TOKEN SCAN (camera always on at welcome, 1 token = 1 session) ---
  const welcomeVideo = document.getElementById('welcome-video');
  const scanStatus = document.getElementById('scan-status');
  const scanStatusText = document.getElementById('scan-status-text');
  const tokenModal = document.getElementById('token-modal');
  const tokenModalText = document.getElementById('token-modal-text');
  const scanCanvas = document.createElement('canvas');
  let scanTimer = null;
  let scanBusy = false;
  let tokenAccepted = false;
  let lastRejectedToken = null;
  let lastRejectedAt = 0;

  function setScanStatus(msg, isError) {
    if (scanStatusText) scanStatusText.textContent = msg;
    if (scanStatus) scanStatus.classList.toggle('error', !!isError);
  }

  async function startWelcomeScan() {
    tokenAccepted = false;
    scanBusy = false;
    if (tokenModal) tokenModal.style.display = 'none';
    setScanStatus('Menyiapkan kamera...');
    try {
      await camera.startCamera();
      if (camera.stream && welcomeVideo && welcomeVideo.srcObject !== camera.stream) {
        welcomeVideo.srcObject = camera.stream;
        await welcomeVideo.play().catch(() => {});
      }
      // Re-apply the per-device orientation fix now that both previews
      // (welcome + camera) are attached to this stream.
      camera.applyFixToPreview();
      if (!camera.stream) {
        setScanStatus('Kamera tidak tersedia.', true);
        return;
      }
      setScanStatus('Arahkan QR token ke kamera...');
      stopWelcomeScanLoop();
      scanTimer = setInterval(scanFrameForToken, 600);
    } catch (err) {
      console.warn('Welcome camera unavailable:', err);
      setScanStatus('Kamera tidak tersedia.', true);
    }
  }

  function stopWelcomeScanLoop() {
    if (scanTimer) {
      clearInterval(scanTimer);
      scanTimer = null;
    }
  }

  function stopWelcomeScan() {
    stopWelcomeScanLoop();
    if (welcomeVideo) welcomeVideo.srcObject = null;
  }

  function scanFrameForToken() {
    if (scanBusy || tokenAccepted || document.hidden) return;
    if (!welcomeVideo || !welcomeVideo.videoWidth) return;
    if (typeof window.jsQR !== 'function') return;
    const scale = Math.min(1, 480 / welcomeVideo.videoWidth);
    scanCanvas.width = Math.round(welcomeVideo.videoWidth * scale);
    scanCanvas.height = Math.round(welcomeVideo.videoHeight * scale);
    const ctx = scanCanvas.getContext('2d', { willReadFrequently: true });
    let code = null;
    try {
      // 1. Scan raw camera frame (standard orientation for physical QR cards facing camera)
      ctx.drawImage(welcomeVideo, 0, 0, scanCanvas.width, scanCanvas.height);
      let img = ctx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
      code = window.jsQR(img.data, scanCanvas.width, scanCanvas.height);

      // 2. Fallback: try flipped frame if raw scan did not detect QR
      if (!code) {
        ctx.save();
        ctx.translate(scanCanvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(welcomeVideo, 0, 0, scanCanvas.width, scanCanvas.height);
        ctx.restore();
        img = ctx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
        code = window.jsQR(img.data, scanCanvas.width, scanCanvas.height);
      }
    } catch (err) {
      return;
    }
    if (code && code.data) validateToken(code.data.trim());
  }

  async function validateToken(token) {
    if (!token || scanBusy || tokenAccepted) return;
    const now = Date.now();
    // Same rejected QR stays in view: don't hammer the server
    if (token === lastRejectedToken && now - lastRejectedAt < 5000) return;
    scanBusy = true;
    setScanStatus('Memeriksa token...');
    try {
      const res = await fetch('/api/tokens/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (data.success) {
        tokenAccepted = true;
        state.sessionToken = data.token;
        stopWelcomeScanLoop();
        if (tokenModalText) tokenModalText.textContent = 'Token ' + data.token + ' diterima. Satu sesi foto siap dimulai.';
        if (tokenModal) tokenModal.style.display = 'flex';
        setScanStatus('Token diterima.');
      } else {
        lastRejectedToken = token;
        lastRejectedAt = now;
        setScanStatus(data.error || 'Token tidak valid.', true);
        setTimeout(() => {
          if (!tokenAccepted) setScanStatus('Arahkan QR token ke kamera...');
        }, 2500);
      }
    } catch (err) {
      setScanStatus('Gangguan jaringan, coba lagi.', true);
    } finally {
      scanBusy = false;
    }
  }

  document.getElementById('btn-token-start').addEventListener('click', () => {
    if (tokenModal) tokenModal.style.display = 'none';
    camera.initAudio();
    showScreen('layout');
  });

  document.getElementById('btn-token-cancel').addEventListener('click', () => {
    if (tokenModal) tokenModal.style.display = 'none';
    tokenAccepted = false;
    // Cancel costs nothing: the token stays unused until a Drive upload
    state.sessionToken = null;
    setScanStatus('Arahkan QR token ke kamera...');
    stopWelcomeScanLoop();
    scanTimer = setInterval(scanFrameForToken, 600);
  });

  // Clickable div controls carry no keyboard behavior by default; expose
  // them so every picker is usable without a mouse (C-4)
  function enableKeyboardClick(el) {
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        el.click();
      }
    });
  }
  document.querySelectorAll('.layout-card, .theme-chip, .filter-chip')
    .forEach(enableKeyboardClick);

  // --- SCREEN 2: LAYOUT SELECTION ---
  // Frame follows layout: 3x2-grid -> Denim/Lace, 3-strip -> Strip, 2x2-grid -> Pride, polaroid -> News
  function syncThemeChips() {
    const chips = document.querySelectorAll('.theme-chip');
    const group = chips.length ? chips[0].closest('.control-group') : null;
    let visible = 0;
    chips.forEach(chip => {
      const layouts = (chip.dataset.layouts || '').split(' ');
      const show = layouts.includes(state.selectedLayout);
      chip.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    if (group) group.style.display = visible ? '' : 'none';
    const current = [...chips].find(c => c.dataset.theme === state.frameTheme && c.style.display !== 'none');
    chips.forEach(c => c.classList.remove('selected'));
    if (current) current.classList.add('selected');
  }

  const layoutCards = document.querySelectorAll('.layout-card');
  layoutCards.forEach(card => {
    card.addEventListener('click', () => {
      layoutCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.selectedLayout = card.dataset.layout;
      state.targetShots = parseInt(card.dataset.shots, 10) || 3;
      state.photos = [];
      if (state.selectedLayout === '3x2-grid') {
        if (state.frameTheme !== 'diesnat-3x2_1' && state.frameTheme !== 'diesnat-3x2_2') {
          state.frameTheme = 'diesnat-3x2_1';
        }
      } else if (state.selectedLayout === '3-strip') {
        state.frameTheme = 'diesnat-3x1_1';
      } else if (state.selectedLayout === '2x2-grid') {
        state.frameTheme = 'diesnat-2x2_1';
      } else if (state.selectedLayout === 'polaroid') {
        state.frameTheme = 'diesnat-polaroid_1';
      } else {
        state.frameTheme = null;
      }
      syncThemeChips();
      camera.updateCropGuideFor(state.selectedLayout, state.frameTheme);
    });
  });

  document.getElementById('btn-back-layout').addEventListener('click', () => {
    showScreen('welcome');
  });

  document.getElementById('btn-next-layout').addEventListener('click', () => {
    showScreen('camera');
  });

  // --- SCREEN 3: CAMERA CAPTURE (STEP-BY-STEP SHOT TRIGGER) ---
  btnSnapStart.addEventListener('click', async () => {
    btnSnapStart.disabled = true;
    btnSnapRetakeCurrent.disabled = true;

    const nextShotIndex = state.photos.length;

    cameraStatusText.textContent = `Mengambil Foto ${nextShotIndex + 1} dari ${state.targetShots}...`;

    state.pendingCapture = true;
    const capturedPhoto = await camera.retakeSingleShot(nextShotIndex, (progress) => {
      if (progress.status === 'counting') {
        cameraStatusText.textContent = `Foto ${nextShotIndex + 1}...`;
      }
    });
    state.pendingCapture = false;

    state.photos.push(capturedPhoto);
    pushCapture(capturedPhoto);

    if (state.sessionExpired) {
      finalizeTimedOutSession();
      return;
    }

    renderThumbnails();

    btnSnapStart.disabled = false;
    btnSnapRetakeCurrent.disabled = false;

    // Check if more shots are required
    if (state.photos.length < state.targetShots) {
      const remainingIndex = state.photos.length + 1;
      snapBtnText.textContent = `AMBIL FOTO ${remainingIndex}`;
      btnSnapRetakeCurrent.style.display = 'inline-flex';
      btnSnapRetakeCurrent.querySelector('span').textContent = `Ulang Foto ${state.photos.length}`;
      cameraStatusText.textContent = `Foto ${state.photos.length} Berhasil! Klik Ulang atau Ambil Foto ${remainingIndex}.`;
    } else {
      // All shots completed!
      stopSessionTimer();
      btnSnapStart.style.display = 'none';
      btnSnapRetakeCurrent.style.display = 'inline-flex';
      btnSnapRetakeCurrent.querySelector('span').textContent = `Ulang Foto Terakhir`;
      btnCameraNext.style.display = 'inline-flex';
      cameraStatusText.textContent = 'Semua foto selesai! Klik Ulang pada foto jika perlu, atau Lanjut ke Editor.';
    }
  });

  // Immediate retake current active shot button
  btnSnapRetakeCurrent.addEventListener('click', () => {
    if (state.photos.length > 0) {
      const lastIndex = state.photos.length - 1;
      handleRetakeShot(lastIndex);
    }
  });

  btnCameraNext.addEventListener('click', () => {
    stopSessionTimer();
    if (editorTimeoutNotice) editorTimeoutNotice.style.display = 'none';
    editor.loadSession(state.photos, state.selectedLayout);
    // Editor resolves the layout-compatible theme (fix for stale frames
    // leaking into other layouts); keep state in sync for the render POST
    state.frameTheme = editor.frameTheme;
    syncThemeChips();
    showScreen('editor');
  });

  // --- SCREEN 4: EDITOR ---

  // Frame Theme Selection Chips; only layout-compatible chips are visible
  // (syncThemeChips filters by layout), so clicks apply directly
  const themeChips = document.querySelectorAll('.theme-chip');
  themeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      themeChips.forEach(t => t.classList.remove('selected'));
      chip.classList.add('selected');
      state.frameTheme = chip.dataset.theme;
      editor.setFrameTheme(state.frameTheme);
      camera.updateCropGuideFor(state.selectedLayout, state.frameTheme);
    });
  });
  syncThemeChips();

  // Filter Chips
  const filterChips = document.querySelectorAll('.filter-chip');
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(f => f.classList.remove('selected'));
      chip.classList.add('selected');
      state.filter = chip.dataset.filter;
      editor.setFilter(state.filter);
    });
  });

  // Welcome is the initial screen: boot the always-on token scan camera
  showScreen('welcome');

  // Commissioning helper: /?token=DSN11-XXXXXX redeems immediately, so the
  // modal path can be tested without holding a printed QR to the camera
  const presetToken = new URLSearchParams(location.search).get('token');
  if (presetToken) {
    setTimeout(() => validateToken(presetToken.trim()), 800);
  }

  // Save Editor & Request High-Res Backend Render & Auto Google Drive Upload
  document.getElementById('btn-save-editor').addEventListener('click', async () => {
    const btnSave = document.getElementById('btn-save-editor');
    btnSave.disabled = true;
    btnSave.textContent = 'Memproses & Upload ke Drive...';

    try {
      const response = await fetch('/api/session/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: state.photos,
          layout: state.selectedLayout,
          frameTheme: state.frameTheme,
          filter: state.filter,
          brandingText: state.brandingText
        })
      });

      const data = await response.json();
      if (data.success) {
        state.renderedFileName = data.fileName;
        showSuccessScreen(data.drive);
        consumeSessionToken(data.drive);
      } else {
        alert('Gagal memproses foto: ' + (data.error || 'Terjadi kesalahan'));
      }
    } catch (err) {
      console.error('Render request error:', err);
      alert('Terjadi kesalahan jaringan saat memproses foto.');
    } finally {
      btnSave.disabled = false;
      btnSave.textContent = 'Lanjut →';
    }
  });

  // Finish Now Button
  const btnFinishNow = document.getElementById('btn-finish-now');
  if (btnFinishNow) {
    btnFinishNow.addEventListener('click', () => {
      resetToWelcomeScreen();
    });
  }

  // --- SUCCESS SCREEN & AUTO RESET WITH DRIVE QR CODE ---
  // Token accounting: a token counts as used only when the session photo
  // has uploaded to Drive successfully. Cancel/abandon costs nothing.
  async function consumeSessionToken(driveData) {
    if (!state.sessionToken) return;
    if (!driveData || driveData.uploaded !== true) return;
    const token = state.sessionToken;
    try {
      const res = await fetch('/api/tokens/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (data.success) state.sessionToken = null;
    } catch (err) {
      console.warn('Token consume request failed (token stays valid):', err);
    }
  }
  function showSuccessScreen(driveData) {
    const qrImgEl = document.getElementById('drive-qr-img');
    const driveStatusMsg = document.getElementById('drive-status-msg');
    const qrContainer = document.getElementById('qr-container');

    if (driveData && driveData.qrCodeDataUrl) {
      qrImgEl.src = driveData.qrCodeDataUrl;
    } else {
      qrImgEl.src = '';
    }

    if (state.sessionExpired && driveStatusMsg) {
      driveStatusMsg.textContent = 'Waktu habis. Slot yang tidak sempat difoto digambar hitam. Foto tetap tersimpan di Google Drive.';
    } else if (driveData && driveData.message) {
      driveStatusMsg.textContent = driveData.message;
    }

    if (qrContainer) qrContainer.classList.add('qr-hidden');

    showScreen('success');

    // Recap plays before the QR code is revealed; reset countdown starts after
    recap.play(state.captures, {
      intervalMs: RECAP_INTERVAL_MS,
      loop: true,
      onComplete: revealQrAndStartReset
    });
  }

  function revealQrAndStartReset() {
    const qrContainer = document.getElementById('qr-container');
    if (qrContainer) qrContainer.classList.remove('qr-hidden');

    let secondsLeft = 40;
    const counterEl = document.getElementById('reset-counter');
    counterEl.textContent = secondsLeft;

    if (resetTimer) clearInterval(resetTimer);

    resetTimer = setInterval(() => {
      secondsLeft--;
      counterEl.textContent = secondsLeft;

      if (secondsLeft <= 0) {
        resetToWelcomeScreen();
      }
    }, 1000);
  }

  function resetToWelcomeScreen() {
    if (resetTimer) clearInterval(resetTimer);
    stopSessionTimer();
    stopEditorTimer();
    state.sessionToken = null;
    recap.stop();
    state.photos = [];
    state.captures = [];
    state.sessionExpired = false;
    state.renderedFileName = null;
    if (editorTimeoutNotice) editorTimeoutNotice.style.display = 'none';
    showScreen('welcome');
  }
});
