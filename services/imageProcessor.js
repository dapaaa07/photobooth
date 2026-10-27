const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Ensures required storage directories exist
 */
const UPLOADS_DIR = path.join(__dirname, '../storage/uploads');
const RENDERED_DIR = path.join(__dirname, '../storage/rendered');
const FRAMES_DIR = path.join(__dirname, '../public/assets/frames');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(RENDERED_DIR)) fs.mkdirSync(RENDERED_DIR, { recursive: true });
if (!fs.existsSync(FRAMES_DIR)) fs.mkdirSync(FRAMES_DIR, { recursive: true });

/**
 * Interleaved photo expansion for layouts (ALL PORTRAIT SLOTS)
 * Takes 1, 2, or 3 camera photos and expands to fill layout slots with spaced patterns
 */
function expandPhotos(photos, layout) {
  if (!photos || photos.length === 0) return [];

  const A = photos[0];
  const B = photos[1] || photos[0];
  const C = photos[2] || photos[1] || photos[0];

  if (layout === '3x2-grid') {
    // 3 photos -> 6 slots (2 columns x 3 rows spaced pattern!)
    return [
      A, B,
      B, C,
      C, A
    ];
  } else if (layout === '2x2-grid') {
    // 2 photos -> 4 slots
    return [A, B, B, A];
  } else if (layout === '4-strip') {
    // 2 photos -> 4 slots
    return [A, B, A, B];
  } else if (layout === '3-strip') {
    // 3 photos -> 3 slots
    return [A, B, C];
  } else {
    // Polaroid -> 1 slot
    return [A];
  }
}

/**
 * Apply color filter to image buffer
 */
async function applyFilter(imageBuffer, filterName) {
  let pipeline = sharp(imageBuffer);

  switch (filterName) {
    case 'bw':
      pipeline = pipeline.grayscale();
      break;
    case 'vintage':
      pipeline = pipeline
        .modulate({ brightness: 1.05, saturation: 0.75 })
        .tint({ r: 240, g: 215, b: 180 });
      break;
    case 'vivid':
      pipeline = pipeline.modulate({ brightness: 1.05, saturation: 1.35 });
      break;
    case 'cyber':
      pipeline = pipeline
        .modulate({ brightness: 1.1, saturation: 1.2 })
        .tint({ r: 180, g: 220, b: 255 });
      break;
    case 'sepia':
      pipeline = pipeline
        .grayscale()
        .tint({ r: 112, g: 66, b: 20 });
      break;
    case 'normal':
    default:
      break;
  }

  return await pipeline.toBuffer();
}

/**
 * Creates high resolution photo collage based on layout type (100% PORTRAIT SHEET & SLOTS)
 * @param {Array<string>} rawPhotoBase64Array Array of base64 image strings from camera
 * @param {Object} options Layout, frameColor, frameTheme, filter, brandingText
 */
//Diesnat frame variants: photo rects lifted from each frame's transparent
// holes (pct of canvas + 0.6% pad), scanned from the PNG files
const DIESNAT_SLOT_RECTS = {
  'diesnat-3x2_1': [
    [0.1109, 0.1465, 0.2584, 0.1577],
    [0.6164, 0.1465, 0.2584, 0.1577],
    [0.1109, 0.3836, 0.2584, 0.1662],
    [0.6164, 0.3836, 0.2584, 0.1662],
    [0.1109, 0.6242, 0.2584, 0.1695],
    [0.6164, 0.6242, 0.2584, 0.1695]
  ],
  'diesnat-3x2_2': [
    [0.1464, 0.0685, 0.3117, 0.2102],
    [0.6468, 0.0685, 0.3092, 0.2102],
    [0.1515, 0.3006, 0.3092, 0.2102],
    [0.6418, 0.3006, 0.3092, 0.2102],
    [0.1464, 0.5395, 0.3117, 0.2119],
    [0.6418, 0.5411, 0.3092, 0.2102]
  ]
};

async function createPhotoCollage(rawPhotoBase64Array, options = {}) {
  const {
    layout = '3x2-grid',
    frameColor = '#ffffff',
    frameTheme = 'genesis-editorial',
    filter = 'normal',
    brandingText = 'DIESNATALIS HIMATIKOM 2026',
    subText = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
  } = options;

  // Interleave raw camera photos into layout slot array
  const fullPhotos = expandPhotos(rawPhotoBase64Array, layout);

  // Convert base64 data to buffers & apply chosen filter
  const photoBuffers = await Promise.all(
    fullPhotos.map(async (b64) => {
      const base64Data = b64.replace(/^data:image\/\w+;base64,/, '');
      const rawBuf = Buffer.from(base64Data, 'base64');
      return await applyFilter(rawBuf, filter);
    })
  );

  const timestamp = Date.now();
  const outputFileName = `photobooth_${timestamp}_${layout}.png`;
  const outputPath = path.join(RENDERED_DIR, outputFileName);

  let canvasWidth = 1200;
  let canvasHeight = 1850;
  let compositeInputs = [];

  // Determine background color / fill
  const isDarkFrame = frameColor === '#18181b' || frameColor === '#000000';
  const textColor = isDarkFrame ? '#ffffff' : '#18181b';
  const subTextColor = isDarkFrame ? '#a1a1aa' : '#71717a';

  if (layout === '3x2-grid') {
    // REKOMENDASI: 2 Columns x 3 Rows (6 Portrait Slots, 2400 x 3700 ULTRA HD)
    canvasWidth = 2400;
    canvasHeight = 3700;
    const itemWidth = 1000;
    const itemHeight = 1060; // Portrait slot
    const leftMargin = 132;
    const topMargin = 120;
    const gap = 136;

    for (let i = 0; i < Math.min(6, photoBuffers.length); i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);

      // Diesnat variants: photos sit exactly under the transparent cutouts
      let leftPx, topPx, itemWidthPx, itemHeightPx;
      const diesnatRects = DIESNAT_SLOT_RECTS[frameTheme];
      if (diesnatRects) {
        const [rx, ry, rw, rh] = diesnatRects[i];
        itemWidthPx = Math.round(rw * canvasWidth);
        itemHeightPx = Math.round(rh * canvasHeight);
        leftPx = Math.round(rx * canvasWidth);
        topPx = Math.round(ry * canvasHeight);
      } else {
        itemWidthPx = itemWidth;
        itemHeightPx = itemHeight;
        leftPx = leftMargin + col * (itemWidth + gap);
        topPx = topMargin + row * (itemHeight + gap);
      }

      const resized = await sharp(photoBuffers[i])
        .resize(itemWidthPx, itemHeightPx, { fit: 'cover', kernel: sharp.kernel.lanczos3 })
        .toBuffer();

      compositeInputs.push({
        input: resized,
        left: leftPx,
        top: topPx
      });
    }

  } else if (layout === '3-strip') {
    // 3 Portrait photos stacked vertically (2400 x 5400 ULTRA HD)
    canvasWidth = 2400;
    canvasHeight = 5400;
    const itemWidth = 1360;
    const itemHeight = 1520; // Portrait photo slot
    const leftMargin = 520;
    const topMargin = 160;
    const gap = 100;

    for (let i = 0; i < Math.min(3, photoBuffers.length); i++) {
      const resized = await sharp(photoBuffers[i])
        .resize(itemWidth, itemHeight, { fit: 'cover', kernel: sharp.kernel.lanczos3 })
        .toBuffer();

      compositeInputs.push({
        input: resized,
        left: leftMargin,
        top: topMargin + i * (itemHeight + gap)
      });
    }

  } else if (layout === '2x2-grid') {
    // 2x2 Grid (2400 x 3700 ULTRA HD)
    canvasWidth = 2400;
    canvasHeight = 3700;
    const itemWidth = 1000;
    const itemHeight = 1360; // Portrait photo slot
    const leftMargin = 132;
    const topMargin = 140;
    const gap = 136;

    const coords = [
      { left: leftMargin, top: topMargin },
      { left: leftMargin + itemWidth + gap, top: topMargin },
      { left: leftMargin, top: topMargin + itemHeight + gap },
      { left: leftMargin + itemWidth + gap, top: topMargin + itemHeight + gap }
    ];

    for (let i = 0; i < Math.min(4, photoBuffers.length); i++) {
      const resized = await sharp(photoBuffers[i])
        .resize(itemWidth, itemHeight, { fit: 'cover', kernel: sharp.kernel.lanczos3 })
        .toBuffer();

      compositeInputs.push({
        input: resized,
        left: coords[i].left,
        top: coords[i].top
      });
    }

  } else if (layout === 'polaroid') {
    // Polaroid (2400 x 3400 ULTRA HD)
    canvasWidth = 2400;
    canvasHeight = 3400;
    const itemWidth = 2080;
    const itemHeight = 2600; // Portrait photo slot

    const resized = await sharp(photoBuffers[0] || photoBuffers[photoBuffers.length - 1])
      .resize(itemWidth, itemHeight, { fit: 'cover', kernel: sharp.kernel.lanczos3 })
      .toBuffer();

    compositeInputs.push({
      input: resized,
      left: 160,
      top: 160
    });

  } else {
    // 4-Photo Strip (2400 x 6200 ULTRA HD)
    canvasWidth = 2400;
    canvasHeight = 6200;
    const itemWidth = 1280;
    const itemHeight = 1360; // Portrait photo slot
    const leftMargin = 560;
    const topMargin = 140;
    const gap = 80;

    for (let i = 0; i < Math.min(4, photoBuffers.length); i++) {
      const resized = await sharp(photoBuffers[i])
        .resize(itemWidth, itemHeight, { fit: 'cover', kernel: sharp.kernel.lanczos3 })
        .toBuffer();

      compositeInputs.push({
        input: resized,
        left: leftMargin,
        top: topMargin + i * (itemHeight + gap)
      });
    }
  }

  // Overlay Frame theme (supports both PNG transparent overlay and SVG vector)
  if (frameTheme && frameTheme !== 'default') {
    const framePngPath = path.join(FRAMES_DIR, `${frameTheme}.png`);
    const frameSvgPath = path.join(FRAMES_DIR, `${frameTheme}.svg`);
    const frameFilePath = fs.existsSync(framePngPath) ? framePngPath : (fs.existsSync(frameSvgPath) ? frameSvgPath : null);

    if (frameFilePath) {
      const frameBuffer = await sharp(frameFilePath)
        .resize(canvasWidth, canvasHeight, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
        .toBuffer();

      compositeInputs.push({
        input: frameBuffer,
        left: 0,
        top: 0
      });
    }
  }

  // Generate base canvas filled with selected frameColor
  const baseCanvas = await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: frameColor
    }
  }).png().toBuffer();

  // Composite all elements together (Base -> Photos -> SVG Overlay)
  await sharp(baseCanvas)
    .composite(compositeInputs)
    .png({ quality: 100, compressionLevel: 2 })
    .toFile(outputPath);

  return {
    filePath: outputPath,
    fileName: outputFileName,
    relativeUrl: `/storage/rendered/${outputFileName}`
  };
}

module.exports = {
  createPhotoCollage,
  expandPhotos,
  applyFilter
};
