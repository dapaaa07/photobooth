/**
 * Session Recap Slide Engine
 * Plays every capture of one session (used photos and retaken ones) as an
 * automatic slide show on a canvas. With loop enabled the sequence repeats
 * until the kiosk leaves the success screen. The QR block is revealed at the
 * end of the first pass.
 */
class PhotoboothRecap {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement ? canvasElement.getContext('2d') : null;
    this.timer = null;
    this.stopRequested = true;
  }

  loadImage(src) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  drawCover(img) {
    const c = this.canvas;
    const ctx = this.ctx;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, c.width, c.height);

    const imgRatio = img.width / img.height;
    const slotRatio = c.width / c.height;
    let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;

    if (imgRatio > slotRatio) {
      sWidth = img.height * slotRatio;
      sx = (img.width - sWidth) / 2;
    } else {
      sHeight = img.width / slotRatio;
      sy = (img.height - sHeight) / 2;
    }

    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, c.width, c.height);
  }

  drawIdle(label) {
    const c = this.canvas;
    if (!this.ctx) return;
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, c.width, c.height);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '700 ' + Math.round(c.width * 0.07) + 'px "Courier New", Courier, monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(label, c.width / 2, c.height / 2);
  }

  /**
   * @param {Array<string>} srcs  Chronological capture dataURLs of the session
   * @param {Object} opts         { intervalMs, loop, onComplete }
   *                              onComplete fires once, after the first pass.
   */
  async play(srcs, opts = {}) {
    this.stopRequested = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const interval = opts.intervalMs || 600;
    const list = Array.isArray(srcs) ? srcs.filter(Boolean) : [];

    if (!this.canvas || !this.ctx) {
      if (opts.onComplete) opts.onComplete();
      return;
    }

    if (list.length === 0) {
      this.drawIdle('TIDAK ADA FOTO');
      if (opts.onComplete) opts.onComplete();
      return;
    }

    const imgs = (await Promise.all(list.map(src => this.loadImage(src)))).filter(Boolean);

    if (this.stopRequested) {
      return;
    }

    if (imgs.length === 0) {
      this.drawIdle('GAGAL MEMUAT');
      if (opts.onComplete) opts.onComplete();
      return;
    }

    let index = 0;
    let firstPassDone = false;
    const step = () => {
      if (this.stopRequested) return;
      this.drawCover(imgs[index]);
      index++;
      if (index < imgs.length) {
        this.timer = setTimeout(step, interval);
      } else {
        this.timer = setTimeout(() => {
          if (this.stopRequested) return;
          if (!firstPassDone) {
            firstPassDone = true;
            if (opts.onComplete) opts.onComplete();
          }
          if (opts.loop) {
            index = 0;
            this.timer = setTimeout(step, interval);
          } else {
            this.stopRequested = true;
            this.timer = null;
          }
        }, interval);
      }
    };

    // First frame appears after one interval, then each next frame
    this.timer = setTimeout(step, interval);
  }

  stop() {
    this.stopRequested = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

window.PhotoboothRecap = PhotoboothRecap;
