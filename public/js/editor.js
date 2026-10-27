/**
 * Interactive Photo Editor Canvas Engine
 */
class PhotoboothEditor {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.photos = [];
    this.layout = '3x2-grid';
    this.frameColor = '#ffffff';
    this.frameTheme = 'diesnat-3x2_1';
    this.filter = 'normal';
    this.brandingText = 'DIESNATALIS HIMATIKOM 2026';
    this.loadedFrameImage = null;
  }

  expandPhotos(photos) {
    if (!photos || photos.length === 0) return [];
    const A = photos[0];
    const B = photos[1] || photos[0];
    const C = photos[2] || photos[1] || photos[0];

    if (this.layout === '3x2-grid') {
      return [
        A, B,
        B, C,
        C, A
      ];
    } else if (this.layout === '2x2-grid') {
      return [A, B, B, A];
    } else if (this.layout === '3-strip') {
      return [A, B, C];
    } else {
      return [A];
    }
  }

  // Layout-compatible theme: mismatched combos fall back to the layout
  // default; 2x2-grid & polaroid have no frame (null = photos only)
  resolveThemeForLayout() {
    if (this.layout === '3x2-grid') {
      if (this.frameTheme !== 'diesnat-3x2_1' && this.frameTheme !== 'diesnat-3x2_2') {
        this.frameTheme = 'diesnat-3x2_1';
      }
    } else if (this.layout === '3-strip') {
      this.frameTheme = 'diesnat-3x1_1';
    } else {
      this.frameTheme = null;
    }
  }

  loadSession(photos, layout) {
    this.photos = photos;
    this.layout = layout || '3x2-grid';
    this.resolveThemeForLayout();
    if (!this.frameTheme) {
      // Frameless layout: drop any previously loaded frame image
      this.loadedFrameImage = null;
      this._loadedTheme = null;
      this.render();
    } else if (!this.loadedFrameImage || this._loadedTheme !== this.frameTheme) {
      this.setFrameTheme(this.frameTheme);
    } else {
      this.render();
    }
  }

  setFrameTheme(themeName) {
    this.frameTheme = themeName;
    // Token guard: the newest request wins; stale image loads are ignored
    const token = (this._themeToken = (this._themeToken || 0) + 1);
    if (themeName && themeName !== 'default') {
      const img = new Image();
      img.onload = () => {
        if (token !== this._themeToken) return;
        this.loadedFrameImage = img;
        this._loadedTheme = themeName;
        this.render();
      };
      img.onerror = () => {
        if (token !== this._themeToken) return;
        // Fallback: try loading as PNG if SVG does not exist
        const imgPng = new Image();
        imgPng.onload = () => {
          if (token !== this._themeToken) return;
          this.loadedFrameImage = imgPng;
          this._loadedTheme = themeName;
          this.render();
        };
        imgPng.onerror = () => {
          if (token !== this._themeToken) return;
          this.loadedFrameImage = null;
          this._loadedTheme = null;
          this.render();
        };
        imgPng.src = `/assets/frames/${themeName}.png?v=${Date.now()}`;
      };
      img.src = `/assets/frames/${themeName}.svg?v=${Date.now()}`;
    } else {
      this.loadedFrameImage = null;
      this._loadedTheme = null;
      this.render();
    }
  }

  setFilter(filterName) {
    this.filter = filterName;
    this.render();
  }

  setBrandingText(text) {
    this.brandingText = text || 'DIESNATALIS HIMATIKOM 2026';
    this.render();
  }

  async render() {
    if (!this.photos || this.photos.length === 0) return;

    // Expand raw camera shots into full layout pattern
    const fullPhotoSrcs = this.expandPhotos(this.photos);

    // Load photo images into HTML Image elements
    const loadedImages = await Promise.all(
      fullPhotoSrcs.map(src => new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = src;
      }))
    );

    // Set canvas dimensions based on layout (ALL PORTRAIT CANVAS)
    if (this.layout === '3x2-grid') {
      this.canvas.width = 600;
      this.canvas.height = 925;
    } else if (this.layout === '3-strip') {
      this.canvas.width = 600;
      this.canvas.height = 1350;
    } else if (this.layout === '2x2-grid') {
      this.canvas.width = 600;
      this.canvas.height = 925;
    } else if (this.layout === 'polaroid') {
      this.canvas.width = 600;
      this.canvas.height = 850;
    } else {
      this.canvas.width = 600;
      this.canvas.height = 1550;
    }

    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. Draw frame background color
    this.ctx.fillStyle = this.frameColor;
    this.ctx.fillRect(0, 0, w, h);

    const isDarkFrame = this.frameColor === '#18181b' || this.frameColor === '#000000';
    const textColor = isDarkFrame ? '#ffffff' : '#18181b';
    const subTextColor = isDarkFrame ? '#a1a1aa' : '#71717a';

    // Helper: Draw single photo slot with filter
    const drawSlot = (img, x, y, slotW, slotH) => {
      this.ctx.save();
      
      // Apply CSS-like canvas filters
      if (this.filter === 'bw') {
        this.ctx.filter = 'grayscale(100%)';
      } else if (this.filter === 'vintage') {
        this.ctx.filter = 'sepia(40%) contrast(110%) brightness(105%)';
      } else if (this.filter === 'vivid') {
        this.ctx.filter = 'saturate(160%) brightness(105%)';
      } else if (this.filter === 'cyber') {
        this.ctx.filter = 'hue-rotate(180deg) saturate(140%)';
      } else if (this.filter === 'sepia') {
        this.ctx.filter = 'sepia(90%)';
      } else {
        this.ctx.filter = 'none';
      }

      // Cover-crop math
      const imgRatio = img.width / img.height;
      const slotRatio = slotW / slotH;
      let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;

      if (imgRatio > slotRatio) {
        sWidth = img.height * slotRatio;
        sx = (img.width - sWidth) / 2;
      } else {
        sHeight = img.width / slotRatio;
        sy = (img.height - sHeight) / 2;
      }

      this.ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, slotW, slotH);
      this.ctx.restore();
    };

    // 2. Render photo placements (ALL PORTRAIT SLOTS)
    if (this.layout === '3x2-grid') {
      if (this.frameTheme === 'diesnat-3x2_1' || this.frameTheme === 'diesnat-3x2_2') {
        // Rects lifted from each frame's transparent holes (pct + 0.6% pad),
        // scanned from the diesnat PNG files
        const rects = this.frameTheme === 'diesnat-3x2_1' ? [
          [0.1109, 0.1465, 0.2584, 0.1577],
          [0.6164, 0.1465, 0.2584, 0.1577],
          [0.1109, 0.3836, 0.2584, 0.1662],
          [0.6164, 0.3836, 0.2584, 0.1662],
          [0.1109, 0.6242, 0.2584, 0.1695],
          [0.6164, 0.6242, 0.2584, 0.1695]
        ] : [
          [0.1464, 0.0685, 0.3117, 0.2102],
          [0.6468, 0.0685, 0.3092, 0.2102],
          [0.1515, 0.3006, 0.3092, 0.2102],
          [0.6418, 0.3006, 0.3092, 0.2102],
          [0.1464, 0.5395, 0.3117, 0.2119],
          [0.6418, 0.5411, 0.3092, 0.2102]
        ];
        for (let i = 0; i < Math.min(6, loadedImages.length); i++) {
          const [rx, ry, rw, rh] = rects[i];
          drawSlot(loadedImages[i], rx * w, ry * h, rw * w, rh * h);
        }
      } else {
        // 2 Columns x 3 Rows (6 Portrait Slots)
        const slotW = 250;
        const slotH = 265; // Portrait slot
        const marginX = 33;
        const marginY = 30;
        const gap = 34;

        for (let i = 0; i < Math.min(6, loadedImages.length); i++) {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const x = marginX + col * (slotW + gap);
          const y = marginY + row * (slotH + gap);
          drawSlot(loadedImages[i], x, y, slotW, slotH);
        }
      }

    } else if (this.layout === '3-strip') {
      if (this.frameTheme === 'diesnat-3x1_1') {
        // Rects lifted from the frame's transparent holes (pct + 0.6% pad),
        // scanned from public/assets/frames/diesnat-3x1_1.png
        const rects = [
          [0.1361, 0.1108, 0.7125, 0.1796],
          [0.1514, 0.3766, 0.7074, 0.1796],
          [0.1514, 0.6424, 0.7125, 0.1779]
        ];
        for (let i = 0; i < Math.min(3, loadedImages.length); i++) {
          const [rx, ry, rw, rh] = rects[i];
          drawSlot(loadedImages[i], rx * w, ry * h, rw * w, rh * h);
        }
      } else {
        // 3 Portrait photos stacked vertically (frameless fallback)
        const slotW = 340;
        const slotH = 380; // Portrait slot
        const marginX = 130;
        const marginY = 40;
        const gap = 25;

        for (let i = 0; i < Math.min(3, loadedImages.length); i++) {
          drawSlot(loadedImages[i], marginX, marginY + i * (slotH + gap), slotW, slotH);
        }
      }

    } else if (this.layout === '2x2-grid') {
      const slotW = 250;
      const slotH = 340; // Portrait slot
      const marginX = 33;
      const marginY = 35;
      const gap = 34;

      const coords = [
        { x: marginX, y: marginY },
        { x: marginX + slotW + gap, y: marginY },
        { x: marginX, y: marginY + slotH + gap },
        { x: marginX + slotW + gap, y: marginY + slotH + gap }
      ];

      for (let i = 0; i < Math.min(4, loadedImages.length); i++) {
        drawSlot(loadedImages[i], coords[i].x, coords[i].y, slotW, slotH);
      }

    } else if (this.layout === 'polaroid') {
      const slotW = 520;
      const slotH = 650; // Portrait slot
      drawSlot(loadedImages[0] || loadedImages[loadedImages.length - 1], 40, 40, slotW, slotH);

    } else {
      // 4-Photo Strip (4 Portrait Slots)
      const slotW = 320;
      const slotH = 340; // Portrait slot
      const marginX = 140;
      const marginY = 35;
      const gap = 20;

      for (let i = 0; i < Math.min(4, loadedImages.length); i++) {
        drawSlot(loadedImages[i], marginX, marginY + i * (slotH + gap), slotW, slotH);
      }
    }

    // 3. Overlay SVG Frame theme ON TOP OF PHOTOS
    if (this.loadedFrameImage) {
      this.ctx.drawImage(this.loadedFrameImage, 0, 0, w, h);
    }
  }
}

window.PhotoboothEditor = PhotoboothEditor;
