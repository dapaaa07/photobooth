const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const PUBLIC_OUT_DIR = path.join(__dirname, '../public/assets/canvas_frames_png');
const ARTIFACT_OUT_DIR = '/home/dapa/.gemini/antigravity/brain/e1dcbd41-d85e-4d23-ae99-f74cdc1dcc26/canvas_frames';
const FRAMES_DIR = path.join(__dirname, '../public/assets/frames');

[PUBLIC_OUT_DIR, ARTIFACT_OUT_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Layout definitions matching imageProcessor.js
const LAYOUT_CONFIGS = {
  '3x2-grid': {
    name: '3x2 Grid Portrait (6 Slots)',
    canvasWidth: 2400,
    canvasHeight: 3700,
    slots: [
      { left: 132, top: 120, width: 1000, height: 1060, label: 'Slot 1' },
      { left: 1268, top: 120, width: 1000, height: 1060, label: 'Slot 2' },
      { left: 132, top: 1316, width: 1000, height: 1060, label: 'Slot 3' },
      { left: 1268, top: 1316, width: 1000, height: 1060, label: 'Slot 4' },
      { left: 132, top: 2512, width: 1000, height: 1060, label: 'Slot 5' },
      { left: 1268, top: 2512, width: 1000, height: 1060, label: 'Slot 6' }
    ]
  },
  '3-strip': {
    name: 'Classic 3-Strip Vertical (3 Slots)',
    canvasWidth: 2400,
    canvasHeight: 5400,
    slots: [
      { left: 520, top: 160, width: 1360, height: 1520, label: 'Slot 1' },
      { left: 520, top: 1780, width: 1360, height: 1520, label: 'Slot 2' },
      { left: 520, top: 3400, width: 1360, height: 1520, label: 'Slot 3' }
    ]
  },
  '2x2-grid': {
    name: '2x2 Grid Portrait (4 Slots)',
    canvasWidth: 2400,
    canvasHeight: 3700,
    slots: [
      { left: 132, top: 140, width: 1000, height: 1360, label: 'Slot 1' },
      { left: 1268, top: 140, width: 1000, height: 1360, label: 'Slot 2' },
      { left: 132, top: 1636, width: 1000, height: 1360, label: 'Slot 3' },
      { left: 1268, top: 1636, width: 1000, height: 1360, label: 'Slot 4' }
    ]
  },
  'polaroid': {
    name: 'Polaroid Classic Portrait (1 Slot)',
    canvasWidth: 2400,
    canvasHeight: 3400,
    slots: [
      { left: 160, top: 160, width: 2080, height: 2600, label: 'Polaroid Photo Slot' }
    ]
  },
  '4-strip': {
    name: '4-Photo Strip Vertical (4 Slots)',
    canvasWidth: 2400,
    canvasHeight: 6200,
    slots: [
      { left: 560, top: 140, width: 1280, height: 1360, label: 'Slot 1' },
      { left: 560, top: 1580, width: 1280, height: 1360, label: 'Slot 2' },
      { left: 560, top: 3020, width: 1280, height: 1360, label: 'Slot 3' },
      { left: 560, top: 4460, width: 1280, height: 1360, label: 'Slot 4' }
    ]
  }
};

const THEMES = [
  'vintage-film',
  'y2k-cyber',
  'pastel-cute',
  'party-birthday',
  'korean-wave',
  'retro-comic',
  'love-couple',
  'postage-stamp',
  'dark-synth',
  'monochrome-journal'
];

async function saveBoth(sharpInstance, fileName) {
  const buf = await sharpInstance.png({ quality: 100, compressionLevel: 4 }).toBuffer();
  fs.writeFileSync(path.join(PUBLIC_OUT_DIR, fileName), buf);
  fs.writeFileSync(path.join(ARTIFACT_OUT_DIR, fileName), buf);
  console.log(`✅ Saved: ${fileName} (${(buf.length / 1024).toFixed(1)} KB)`);
}

/**
 * 1. Export Transparent PNG Overlays of all 10 Decorative Themes
 */
async function exportThemes() {
  console.log('\n--- Exporting 10 SVG Frame Themes to Transparent PNG ---');
  for (const theme of THEMES) {
    const svgPath = path.join(FRAMES_DIR, `${theme}.svg`);
    if (fs.existsSync(svgPath)) {
      const img = sharp(svgPath).resize(2400, 3400, { fit: 'fill', kernel: sharp.kernel.lanczos3 });
      await saveBoth(img, `theme_${theme}_overlay.png`);
    }
  }
}

/**
 * 2. Export Layout Cutout Templates (PNG with Transparent Photo Windows)
 */
async function exportCutoutTemplates() {
  console.log('\n--- Exporting Layout Cutout Templates (White & Dark Frames) ---');

  for (const [layoutKey, cfg] of Object.entries(LAYOUT_CONFIGS)) {
    // Generate even-odd SVG mask where outer canvas is solid and inner slots are holes
    const pathOuter = `M0,0 H${cfg.canvasWidth} V${cfg.canvasHeight} H0 Z`;
    const pathHoles = cfg.slots.map(s => {
      // Rounded rectangles or clean cutouts
      const r = 24; // corner radius for aesthetic rounded slots
      return `M${s.left + r},${s.top} ` +
        `h${s.width - 2 * r} a${r},${r} 0 0 1 ${r},${r} ` +
        `v${s.height - 2 * r} a${r},${r} 0 0 1 -${r},${r} ` +
        `h-${s.width - 2 * r} a${r},${r} 0 0 1 -${r},-${r} ` +
        `v-${s.height - 2 * r} a${r},${r} 0 0 1 ${r},-${r} Z`;
    }).join(' ');

    // White Frame Cutout
    const whiteSvg = `
      <svg width="${cfg.canvasWidth}" height="${cfg.canvasHeight}" viewBox="0 0 ${cfg.canvasWidth} ${cfg.canvasHeight}" xmlns="http://www.w3.org/2000/svg">
        <path d="${pathOuter} ${pathHoles}" fill-rule="evenodd" fill="#ffffff" />
      </svg>
    `;
    await saveBoth(sharp(Buffer.from(whiteSvg)), `template_${layoutKey}_white_cutout.png`);

    // Dark Frame Cutout
    const darkSvg = `
      <svg width="${cfg.canvasWidth}" height="${cfg.canvasHeight}" viewBox="0 0 ${cfg.canvasWidth} ${cfg.canvasHeight}" xmlns="http://www.w3.org/2000/svg">
        <path d="${pathOuter} ${pathHoles}" fill-rule="evenodd" fill="#18181b" />
      </svg>
    `;
    await saveBoth(sharp(Buffer.from(darkSvg)), `template_${layoutKey}_dark_cutout.png`);
  }
}

/**
 * 3. Export Visual Blueprints / Mockup Guides (with dimensions, labels, and borders)
 */
async function exportVisualGuides() {
  console.log('\n--- Exporting Layout Visual Guides ---');

  for (const [layoutKey, cfg] of Object.entries(LAYOUT_CONFIGS)) {
    const slotSvgs = cfg.slots.map((s, idx) => `
      <rect x="${s.left}" y="${s.top}" width="${s.width}" height="${s.height}" rx="24" fill="#1e293b" stroke="#6366f1" stroke-width="8" stroke-dasharray="24 16"/>
      <circle cx="${s.left + s.width / 2}" cy="${s.top + s.height / 2 - 40}" r="70" fill="#312e81" stroke="#818cf8" stroke-width="4"/>
      <text x="${s.left + s.width / 2}" y="${s.top + s.height / 2 - 24}" font-family="sans-serif" font-size="52" font-weight="900" fill="#ffffff" text-anchor="middle">#${idx + 1}</text>
      <text x="${s.left + s.width / 2}" y="${s.top + s.height / 2 + 70}" font-family="sans-serif" font-size="44" font-weight="bold" fill="#f8fafc" text-anchor="middle">${s.label}</text>
      <text x="${s.left + s.width / 2}" y="${s.top + s.height / 2 + 130}" font-family="monospace" font-size="34" font-weight="600" fill="#94a3b8" text-anchor="middle">${s.width} × ${s.height} px (Portrait)</text>
    `).join('');

    const guideSvg = `
      <svg width="${cfg.canvasWidth}" height="${cfg.canvasHeight}" viewBox="0 0 ${cfg.canvasWidth} ${cfg.canvasHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#090d16"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
        </defs>
        <rect width="${cfg.canvasWidth}" height="${cfg.canvasHeight}" fill="url(#bgGrad)"/>
        
        <!-- Header Info -->
        <rect x="100" y="30" width="${cfg.canvasWidth - 200}" height="70" rx="16" fill="#1e1b4b" stroke="#4f46e5" stroke-width="3"/>
        <text x="${cfg.canvasWidth / 2}" y="76" font-family="sans-serif" font-size="38" font-weight="900" fill="#a5b4fc" text-anchor="middle" letter-spacing="3">
          LAYOUT: ${cfg.name.toUpperCase()} • KANVAS: ${cfg.canvasWidth} × ${cfg.canvasHeight} PX
        </text>

        <!-- Slots -->
        ${slotSvgs}

        <!-- Footer Branding -->
        <text x="${cfg.canvasWidth / 2}" y="${cfg.canvasHeight - 40}" font-family="sans-serif" font-size="32" font-weight="bold" fill="#64748b" text-anchor="middle" letter-spacing="6">
          FREMIO PHOTOBOOTH CANVAS FRAME SPECIFICATION
        </text>
      </svg>
    `;

    await saveBoth(sharp(Buffer.from(guideSvg)), `guide_${layoutKey}_blueprint.png`);
  }
}

/**
 * 4. Export Combined Mockup Frames (Layout + Themes)
 */
async function exportMockupCombinations() {
  console.log('\n--- Exporting Combined Layout + Theme Frame Previews ---');

  const combinations = [
    { layout: '3x2-grid', theme: 'vintage-film', color: '#18181b', name: 'preview_3x2-grid_vintage-film.png' },
    { layout: '3x2-grid', theme: 'pastel-cute', color: '#ffffff', name: 'preview_3x2-grid_pastel-cute.png' },
    { layout: '3x2-grid', theme: 'y2k-cyber', color: '#090d16', name: 'preview_3x2-grid_y2k-cyber.png' },
    { layout: '3-strip', theme: 'korean-wave', color: '#ffffff', name: 'preview_3-strip_korean-wave.png' },
    { layout: '3-strip', theme: 'retro-comic', color: '#ffffff', name: 'preview_3-strip_retro-comic.png' },
    { layout: '2x2-grid', theme: 'love-couple', color: '#ffffff', name: 'preview_2x2-grid_love-couple.png' },
    { layout: '2x2-grid', theme: 'party-birthday', color: '#18181b', name: 'preview_2x2-grid_party-birthday.png' },
    { layout: 'polaroid', theme: 'postage-stamp', color: '#ffffff', name: 'preview_polaroid_postage-stamp.png' },
    { layout: 'polaroid', theme: 'monochrome-journal', color: '#ffffff', name: 'preview_polaroid_monochrome-journal.png' },
    { layout: '4-strip', theme: 'dark-synth', color: '#18181b', name: 'preview_4-strip_dark-synth.png' }
  ];

  for (const combo of combinations) {
    const cfg = LAYOUT_CONFIGS[combo.layout];
    const themeSvgPath = path.join(FRAMES_DIR, `${combo.theme}.svg`);

    // Create colored placeholder photos for mockup
    const compositeList = [];

    // Base background
    const baseCanvas = await sharp({
      create: {
        width: cfg.canvasWidth,
        height: cfg.canvasHeight,
        channels: 4,
        background: combo.color
      }
    }).png().toBuffer();

    // Fill each slot with aesthetic gradient placeholder
    for (let i = 0; i < cfg.slots.length; i++) {
      const s = cfg.slots[i];
      const hue = (i * 55 + 200) % 360;
      const placeholderSvg = `
        <svg width="${s.width}" height="${s.height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="pGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="hsl(${hue}, 70%, 45%)"/>
              <stop offset="100%" stop-color="hsl(${(hue + 40) % 360}, 80%, 30%)"/>
            </linearGradient>
          </defs>
          <rect width="${s.width}" height="${s.height}" rx="12" fill="url(#pGrad)"/>
          <text x="${s.width / 2}" y="${s.height / 2 - 20}" font-family="sans-serif" font-size="64" font-weight="900" fill="#ffffff" text-anchor="middle" opacity="0.9">FOTO #${i + 1}</text>
          <text x="${s.width / 2}" y="${s.height / 2 + 40}" font-family="sans-serif" font-size="36" font-weight="600" fill="#ffffff" text-anchor="middle" opacity="0.75">Portrait Frame Sample</text>
        </svg>
      `;
      const slotBuf = await sharp(Buffer.from(placeholderSvg)).png().toBuffer();
      compositeList.push({
        input: slotBuf,
        left: s.left,
        top: s.top
      });
    }

    // Add Theme SVG overlay
    if (fs.existsSync(themeSvgPath)) {
      const themeBuf = await sharp(themeSvgPath)
        .resize(cfg.canvasWidth, cfg.canvasHeight, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
        .toBuffer();
      compositeList.push({
        input: themeBuf,
        left: 0,
        top: 0
      });
    }

    const finalImage = sharp(baseCanvas).composite(compositeList);
    await saveBoth(finalImage, combo.name);
  }
}

async function run() {
  console.log('🚀 Starting Canvas Frame PNG Exporter...');
  await exportThemes();
  await exportCutoutTemplates();
  await exportVisualGuides();
  await exportMockupCombinations();
  console.log('\n✨ All Canvas Frames exported successfully to PNG!\n');
}

run().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});
