const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const PUBLIC_DIR = path.join(__dirname, '../public/assets/templates_for_designers');
const ARTIFACT_DIR = '/home/dapa/.gemini/antigravity/brain/e1dcbd41-d85e-4d23-ae99-f74cdc1dcc26/designer_templates';

[PUBLIC_DIR, ARTIFACT_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const LAYOUTS = {
  '3x2-grid': {
    name: '3x2 Grid Portrait (6 Foto)',
    canvasWidth: 2400,
    canvasHeight: 3700,
    aspect: '24:37 (Vertikal Kiosk)',
    targetShots: 3,
    slots: [
      { id: 1, left: 132, top: 120, width: 1000, height: 1060 },
      { id: 2, left: 1268, top: 120, width: 1000, height: 1060 },
      { id: 3, left: 132, top: 1316, width: 1000, height: 1060 },
      { id: 4, left: 1268, top: 1316, width: 1000, height: 1060 },
      { id: 5, left: 132, top: 2512, width: 1000, height: 1060 },
      { id: 6, left: 1268, top: 2512, width: 1000, height: 1060 }
    ]
  },
  '3-strip': {
    name: 'Classic 3-Strip Vertical (3 Foto)',
    canvasWidth: 2400,
    canvasHeight: 5400,
    aspect: '4:9 (Strip Vertikal Panjang)',
    targetShots: 3,
    slots: [
      { id: 1, left: 520, top: 160, width: 1360, height: 1520 },
      { id: 2, left: 520, top: 1780, width: 1360, height: 1520 },
      { id: 3, left: 520, top: 3400, width: 1360, height: 1520 }
    ]
  },
  '2x2-grid': {
    name: '2x2 Grid Portrait (4 Foto)',
    canvasWidth: 2400,
    canvasHeight: 3700,
    aspect: '24:37 (Vertikal Kiosk)',
    targetShots: 2,
    slots: [
      { id: 1, left: 132, top: 140, width: 1000, height: 1360 },
      { id: 2, left: 1268, top: 140, width: 1000, height: 1360 },
      { id: 3, left: 132, top: 1636, width: 1000, height: 1360 },
      { id: 4, left: 1268, top: 1636, width: 1000, height: 1360 }
    ]
  },
  'polaroid': {
    name: 'Polaroid Classic Portrait (1 Foto)',
    canvasWidth: 2400,
    canvasHeight: 3400,
    aspect: '12:17 (Vintage Polaroid)',
    targetShots: 1,
    slots: [
      { id: 1, left: 160, top: 160, width: 2080, height: 2600 }
    ]
  },
  '4-strip': {
    name: '4-Photo Strip Vertical (4 Foto)',
    canvasWidth: 2400,
    canvasHeight: 6200,
    aspect: '12:31 (Strip Tinggi)',
    targetShots: 2,
    slots: [
      { id: 1, left: 560, top: 140, width: 1280, height: 1360 },
      { id: 2, left: 560, top: 1580, width: 1280, height: 1360 },
      { id: 3, left: 560, top: 3020, width: 1280, height: 1360 },
      { id: 4, left: 560, top: 4460, width: 1280, height: 1360 }
    ]
  }
};

async function generateTemplates() {
  console.log('🎨 Generating Designer Templates (SVG & PNG)...');

  for (const [key, layout] of Object.entries(LAYOUTS)) {
    const W = layout.canvasWidth;
    const H = layout.canvasHeight;

    // 1. Build Master SVG for Designers (Illustrator, Canva, Figma compatible)
    const slotElements = layout.slots.map(s => `
      <!-- SLOT #${s.id} -->
      <g id="slot-${s.id}">
        <!-- Transparent cutout area indicator -->
        <rect x="${s.left}" y="${s.top}" width="${s.width}" height="${s.height}" rx="20" fill="#38bdf8" fill-opacity="0.12" stroke="#0284c7" stroke-width="6" stroke-dasharray="20 12"/>
        
        <!-- Slot Center Label -->
        <circle cx="${s.left + s.width / 2}" cy="${s.top + s.height / 2 - 40}" r="50" fill="#0284c7" />
        <text x="${s.left + s.width / 2}" y="${s.top + s.height / 2 - 24}" font-family="Arial, sans-serif" font-size="44" font-weight="bold" fill="#ffffff" text-anchor="middle">${s.id}</text>
        <text x="${s.left + s.width / 2}" y="${s.top + s.height / 2 + 50}" font-family="Arial, sans-serif" font-size="38" font-weight="bold" fill="#0369a1" text-anchor="middle">LUBANG FOTO #${s.id} (TRANSPARAN)</text>
        <text x="${s.left + s.width / 2}" y="${s.top + s.height / 2 + 105}" font-family="monospace" font-size="32" font-weight="600" fill="#64748b" text-anchor="middle">${s.width} × ${s.height} px</text>
      </g>
    `).join('\n');

    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <style>
      .guide-text { font-family: 'Helvetica Neue', Arial, sans-serif; }
    </style>
  </defs>

  <!-- LAYER 1: CANVAS BOUNDARY -->
  <rect id="canvas-boundary" width="${W}" height="${H}" fill="#f8fafc" stroke="#cbd5e1" stroke-width="4"/>

  <!-- LAYER 2: HEADER BANNER (PANDUAN UKURAN) -->
  <rect x="80" y="24" width="${W - 160}" height="76" rx="16" fill="#0f172a" />
  <text x="${W / 2}" y="72" class="guide-text" font-size="36" font-weight="bold" fill="#38bdf8" text-anchor="middle" letter-spacing="2">
    TEMPLATE DESAIN FREMIO: ${layout.name.toUpperCase()} • UKURAN KANVAS: ${W} × ${H} PX
  </text>

  <!-- LAYER 3: PHOTO SLOTS (AREA FOTO YANG JANGAN DITUTUP GAMBAR SOLID) -->
  ${slotElements}

  <!-- LAYER 4: SAFE DESIGN AREA HINT -->
  <rect x="60" y="${H - 80}" width="${W - 120}" height="60" rx="12" fill="#e2e8f0"/>
  <text x="${W / 2}" y="${H - 40}" class="guide-text" font-size="28" font-weight="600" fill="#475569" text-anchor="middle">
    💡 TIPS: Letakkan ornamen frame, stiker, teks branding, &amp; hiasan di luar atau di sekeliling kotak lubang foto.
  </text>
</svg>`;

    // Save SVG Template
    const svgFileName = `template_designer_${key}.svg`;
    fs.writeFileSync(path.join(PUBLIC_DIR, svgFileName), svgContent);
    fs.writeFileSync(path.join(ARTIFACT_DIR, svgFileName), svgContent);
    console.log(`✅ Saved SVG: ${svgFileName}`);

    // 2. Render High-Res PNG Guideline Template (Can be imported into Canva/Photoshop as Background Layer)
    const pngGuidelineName = `template_designer_${key}_guide.png`;
    const guideBuf = await sharp(Buffer.from(svgContent))
      .png({ quality: 100, compressionLevel: 4 })
      .toBuffer();
    fs.writeFileSync(path.join(PUBLIC_DIR, pngGuidelineName), guideBuf);
    fs.writeFileSync(path.join(ARTIFACT_DIR, pngGuidelineName), guideBuf);
    console.log(`✅ Saved PNG Guide: ${pngGuidelineName}`);

    // 3. Render 100% Transparent Cutout Frame (Only Slots Cut Out, Perfect Alpha Mask)
    const pathOuter = `M0,0 H${W} V${H} H0 Z`;
    const pathHoles = layout.slots.map(s => {
      const r = 20;
      return `M${s.left + r},${s.top} ` +
        `h${s.width - 2 * r} a${r},${r} 0 0 1 ${r},${r} ` +
        `v${s.height - 2 * r} a${r},${r} 0 0 1 -${r},${r} ` +
        `h-${s.width - 2 * r} a${r},${r} 0 0 1 -${r},-${r} ` +
        `v-${s.height - 2 * r} a${r},${r} 0 0 1 ${r},-${r} Z`;
    }).join(' ');

    const transparentCutoutSvg = `
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
        <path d="${pathOuter} ${pathHoles}" fill-rule="evenodd" fill="#ffffff" />
      </svg>
    `;
    const cutoutBuf = await sharp(Buffer.from(transparentCutoutSvg))
      .png({ quality: 100, compressionLevel: 4 })
      .toBuffer();

    const cutoutPngName = `template_cutout_${key}_transparent.png`;
    fs.writeFileSync(path.join(PUBLIC_DIR, cutoutPngName), cutoutBuf);
    fs.writeFileSync(path.join(ARTIFACT_DIR, cutoutPngName), cutoutBuf);
    console.log(`✅ Saved Cutout PNG: ${cutoutPngName}`);
  }

  console.log('\n✨ All designer templates ready!\n');
}

generateTemplates().catch(err => {
  console.error('Failed to generate designer templates:', err);
  process.exit(1);
});
