/**
 * Camera Handler & Audio Countdown Engine with DSLR Hardware Support & Auto Webcam Fallback
 *
 * Orientation policy: nothing is mirrored by default (raw sensor frame =
 * preview = photo). Some external cameras (phone-as-webcam apps) deliver a
 * pre-mirrored or rotated stream; those get a per-device correction set
 * from the camera screen, persisted in localStorage as
 * `pb-cam-fix-<deviceId>`: mirror | rotate180 | flipv | none.
 */
class PhotoboothCamera {
  constructor() {
    this.videoElement = document.getElementById('video-feed');
    this.flashElement = document.getElementById('flash-overlay');
    this.countdownElement = document.getElementById('countdown-num');
    this.sourceBadgeElement = document.getElementById('camera-source-badge');
    this.stream = null;
    this.audioCtx = null;
    this.isDslrConnected = false;
    this.dslrModel = null;
    this.deviceId = null;
    this.fix = 'none';
  }

  // --- Per-device orientation fix -------------------------------------------

  loadFixForDevice() {
    const id = this.deviceId || 'default';
    let stored = 'none';
    try {
      stored = localStorage.getItem('pb-cam-fix-' + id) || 'none';
    } catch (err) { /* storage blocked */ }
    this.fix = ['mirror', 'rotate180', 'flipv'].includes(stored) ? stored : 'none';
    this.applyFixToPreview();
    return this.fix;
  }

  /** CSS transform for the live previews (capture uses canvas math). */
  fixCssTransform() {
    if (this.fix === 'mirror') return 'scaleX(-1)';
    if (this.fix === 'rotate180') return 'rotate(180deg)';
    if (this.fix === 'flipv') return 'scaleY(-1)';
    return '';
  }

  applyFixToPreview() {
    [this.videoElement, document.getElementById('welcome-video')].forEach(v => {
      if (v) v.style.transform = this.fixCssTransform();
    });
  }

  /** Called by the setup buttons; persists per device and re-applies live. */
  setFix(mode) {
    this.fix = ['mirror', 'rotate180', 'flipv', 'none'].includes(mode) ? mode : 'none';
    try {
      const key = 'pb-cam-fix-' + (this.deviceId || 'default');
      if (this.fix === 'none') localStorage.removeItem(key);
      else localStorage.setItem(key, this.fix);
    } catch (err) { /* storage blocked */ }
    this.applyFixToPreview();
    return this.fix;
  }

  // Web Audio Synth for Beep & Shutter Sounds
  initAudio() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playBeep(freq = 880, duration = 0.15) {
    try {
      this.initAudio();
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  playShutterSound() {
    try {
      this.initAudio();
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {
      console.warn('Shutter sound error:', e);
    }
  }

  /**
   * Check Server API for connected DSLR hardware
   */
  async checkDslrStatus() {
    try {
      const res = await fetch('/api/camera/status');
      const data = await res.json();
      if (data && data.connected) {
        this.isDslrConnected = true;
        this.dslrModel = data.model || 'Canon DSLR';
        if (this.sourceBadgeElement) {
          this.sourceBadgeElement.innerHTML = `<span></span><strong>${this.dslrModel}</strong> (DSLR Active)`;
          this.sourceBadgeElement.style.borderColor = 'rgba(16, 185, 129, 0.5)';
          this.sourceBadgeElement.style.color = '#6ee7b7';
        }
      } else {
        this.isDslrConnected = false;
        this.dslrModel = null;
        if (this.sourceBadgeElement) {
          this.sourceBadgeElement.innerHTML = `<span></span><strong>Webcam Tablet</strong> (Auto Fallback)`;
          this.sourceBadgeElement.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          this.sourceBadgeElement.style.color = '#cbd5e1';
        }
      }
    } catch (err) {
      console.warn('Failed to fetch camera status, using webcam fallback:', err);
      this.isDslrConnected = false;
      if (this.sourceBadgeElement) {
        this.sourceBadgeElement.innerHTML = `<span></span><strong>Webcam Tablet</strong> (Auto Fallback)`;
      }
    }
  }

  async startCamera() {
    await this.checkDslrStatus();

    try {
      if (!this.stream) {
        const constraints = {
          video: {
            width: { ideal: 3840, min: 1920 },
            height: { ideal: 2160, min: 1080 },
            facingMode: 'user'
          },
          audio: false
        };
        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      }
      await this.attachPreview();
    } catch (err) {
      console.error('Camera Access Error:', err);
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        await this.attachPreview();
      } catch (e) {
        console.warn('Browser webcam unavailable:', e);
      }
    }
  }

  // Shared stream: welcome scan preview and main video feed use one stream
  attachPreview() {
    if (this.stream && !this.videoElement.srcObject) {
      this.videoElement.srcObject = this.stream;
    }
    if (this.stream && !this.deviceId) {
      const track = this.stream.getVideoTracks()[0];
      if (track && track.getSettings) {
        this.deviceId = track.getSettings().deviceId || null;
      }
      this.loadFixForDevice();
    }
    if (this.videoElement.srcObject) {
      return this.videoElement.play().catch(() => {});
    }
    return Promise.resolve();
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    // Detach so the next startCamera attaches the fresh stream; a stale
    // srcObject would keep attachPreview from wiring the new stream (blank)
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  /**
   * Target photo aspect (w/h) per layout+theme, derived from the server
   * slot rects: 3x2 Denim slot1 620x583, Lace slot1 748x778,
   * 3-strip slot1 1710x970, 2x2 1000x1360, polaroid 2080x2600
   */
  static cropAspectFor(layout, frameTheme) {
    if (layout === '3x2-grid') {
      return frameTheme === 'diesnat-3x2_2' ? 0.9619 : 1.0628;
    }
    if (layout === '3-strip') return 1.7632;
    if (layout === '2x2-grid') return 1000 / 1360;
    if (layout === 'polaroid') return 2080 / 2600;
    return null;
  }

  /**
   * Crop guide overlay: the captured photo is the FULL video frame, while
   * the preview shows it with object-fit:cover. The safe rect is the
   * center crop of the capture at the slot aspect, mapped through the
   * cover transform onto the container; bands outside it will be cut.
   */
  updateCropGuideFor(layout, frameTheme) {
    const guide = document.getElementById('crop-guide');
    if (!guide) return;
    const targetAspect = PhotoboothCamera.cropAspectFor(layout, frameTheme);
    const video = this.videoElement;
    const container = video ? video.parentElement : null;
    const vw = video ? video.videoWidth : 0;
    const vh = video ? video.videoHeight : 0;
    if (!targetAspect || !container || !vw || !vh) {
      guide.style.display = 'none';
      return;
    }
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (!cw || !ch) {
      guide.style.display = 'none';
      return;
    }
    guide.style.display = 'block';

    const captureAspect = vw / vh;
    const boxAspect = cw / ch;

    // Visible capture region under object-fit:cover (centered, in capture px)
    let visW, visH;
    if (boxAspect > captureAspect) {
      visW = vw;
      visH = vw / boxAspect;
    } else {
      visH = vh;
      visW = vh * boxAspect;
    }

    // Safe rect: center crop of the FULL capture at target aspect
    let safeW, safeH;
    if (captureAspect > targetAspect) {
      safeH = vh;
      safeW = vh * targetAspect;
    } else {
      safeW = vw;
      safeH = vw / targetAspect;
    }

    // Intersect with the visible region (both centered on capture center)
    const showW = Math.min(safeW, visW);
    const showH = Math.min(safeH, visH);

    // Map capture px -> container px
    const scale = cw / visW;
    const dw = Math.round(showW * scale);
    const dh = Math.round(showH * scale);
    const dx = Math.round((cw - dw) / 2);
    const dy = Math.round((ch - dh) / 2);

    const q = (sel) => guide.querySelector(sel);
    const safe = q('.crop-safe');
    safe.style.left = dx + 'px';
    safe.style.top = dy + 'px';
    safe.style.width = dw + 'px';
    safe.style.height = dh + 'px';

    const top = q('.crop-shade-top');
    const bottom = q('.crop-shade-bottom');
    const left = q('.crop-shade-left');
    const right = q('.crop-shade-right');
    top.style.height = dy + 'px';
    bottom.style.height = (ch - dy - dh) + 'px';
    left.style.width = dx + 'px';
    left.style.top = dy + 'px';
    left.style.height = dh + 'px';
    right.style.width = (cw - dx - dw) + 'px';
    right.style.top = dy + 'px';
    right.style.height = dh + 'px';
  }

  triggerFlash() {
    this.playShutterSound();
    this.flashElement.classList.remove('flash');
    void this.flashElement.offsetWidth;
    this.flashElement.classList.add('flash');
  }

  captureFrameWebcam() {
    const canvas = document.createElement('canvas');
    canvas.width = this.videoElement.videoWidth || 1920;
    canvas.height = this.videoElement.videoHeight || 1080;
    const ctx = canvas.getContext('2d');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Foto = orientasi yang sama dengan preview (frame mentah + koreksi
    // per perangkat bila ada), jadi hasil cetak selalu seperti yang dilihat.
    ctx.save();
    if (this.fix === 'mirror') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    } else if (this.fix === 'rotate180') {
      ctx.translate(canvas.width, canvas.height);
      ctx.rotate(Math.PI);
    } else if (this.fix === 'flipv') {
      ctx.translate(0, canvas.height);
      ctx.scale(1, -1);
    }
    ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    
    return canvas.toDataURL('image/jpeg', 1.0);
  }

  /**
   * Miniature of the final print for a layout, drawn from the real frame
   * PNG's transparent holes (alpha scan) so proportions match the result.
   * Layouts without a frame design get null -> caller keeps the generic grid.
   */
  static buildLayoutMini(layout) {
    const theme = PhotoboothCamera.LAYOUT_MINI_THEMES[layout];
    if (!theme) return Promise.resolve(null);
    return PhotoboothCamera.scanHolesFromFrame(theme).then(holes => {
      if (!holes || !holes.rects.length) return null;
      const W = 96;
      const H = Math.round(W * holes.h / holes.w);
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#EAE3D4';
      for (const r of holes.rects) {
        ctx.fillRect(r.x * W, r.y * H, r.w * W, r.h * H);
      }
      return new Promise(res => {
        const img = new Image();
        img.onload = () => { ctx.drawImage(img, 0, 0, W, H); res(canvas.toDataURL('image/png')); };
        img.onerror = () => res(canvas.toDataURL('image/png'));
        img.src = holes.url;
      });
    });
  }

  static async scanHolesFromFrame(theme) {
    const url = '/assets/frames/' + theme + '.png';
    const img = new Image();
    const ok = await new Promise(res => { img.onload = () => res(true); img.onerror = () => res(false); img.src = url; });
    if (!ok || !img.naturalWidth) return null;
    // Downscale to <=160px wide so the alpha scan stays cheap
    const w = 160;
    const h = Math.max(1, Math.round(w * img.naturalHeight / img.naturalWidth));
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    const alphaAt = (x, y) => data[(y * w + x) * 4 + 3];
    const seen = new Uint8Array(w * h);
    const rects = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (seen[i] || alphaAt(x, y) > 12) continue;
        // flood-fill this transparent region (4-connected)
        let minX = x, maxX = x, minY = y, maxY = y, n = 0;
        const stack = [[x, y]];
        seen[i] = 1;
        while (stack.length) {
          const [cx, cy] = stack.pop();
          n++;
          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;
          const near = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
          for (const [nx, ny] of near) {
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const j = ny * w + nx;
            if (!seen[j] && alphaAt(nx, ny) <= 12) { seen[j] = 1; stack.push([nx, ny]); }
          }
        }
        const rwPx = maxX - minX + 1, rhPx = maxY - minY + 1;
        // keep photo-sized windows only (ignore logo cut-outs etc.)
        if (n < w * h * 0.005) continue;
        if (rwPx < w * 0.08 || rhPx < h * 0.05) continue;
        rects.push({
          x: minX / w, y: minY / h,
          w: rwPx / w, h: rhPx / h
        });
      }
    }
    if (!rects.length) return null;
    // reading order: rows by top edge, then left-to-right
    rects.sort((a, b) => (Math.abs(a.y - b.y) > 0.04 ? a.y - b.y : a.x - b.x));
    return { rects, url, w, h };
  }

  /**
   * Universal Photo Capture (Tries DSLR hardware first, falls back to Webcam)
   */
  async capturePhoto() {
    this.triggerFlash();

    if (this.isDslrConnected) {
      try {
        console.log('📷 Triggering Canon DSLR Hardware Shutter...');
        const response = await fetch('/api/camera/capture-dslr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();

        if (data.success && data.dataUrl) {
          return data.dataUrl;
        } else {
          console.warn('DSLR capture failed, falling back to webcam frame:', data.error);
        }
      } catch (err) {
        console.error('DSLR API network error, falling back to webcam:', err);
      }
    }

    // Default or Fallback to Tablet Webcam
    return this.captureFrameWebcam();
  }

  // Retake a single specific shot (e.g. shot index 0, 1, or 2)
  async retakeSingleShot(shotIndex, onProgress) {
    onProgress({ status: 'counting', shotIndex });

    for (let count = 3; count >= 1; count--) {
      this.countdownElement.textContent = count;
      this.countdownElement.classList.remove('pop');
      void this.countdownElement.offsetWidth;
      this.countdownElement.classList.add('pop');
      this.playBeep(count === 1 ? 1200 : 800, 0.15);
      await new Promise(res => setTimeout(res, 1000));
    }

    const photoDataUrl = await this.capturePhoto();

    onProgress({ status: 'snapped', shotIndex, photoDataUrl });
    return photoDataUrl;
  }
}

window.PhotoboothCamera = PhotoboothCamera;

/**
 * Layout -> frame used for the miniature preview on the layout screen.
 * Only layouts with a real frame design are listed; anything absent keeps
 * the generic grid markup (design belum dibuat).
 */
PhotoboothCamera.LAYOUT_MINI_THEMES = {
  '3x2-grid': 'diesnat-3x2_1',   // Diesnat Denim (frame default layout ini)
  '3-strip': 'diesnat-3x1_1'     // Diesnat Strip
};
