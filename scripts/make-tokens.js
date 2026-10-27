/**
 * Generate photo-session tokens + printable QR PNGs.
 * Usage: node scripts/make-tokens.js [count] [label]
 * Output: storage/token-qr/<TOKEN>.png (QR encodes the raw token)
 */
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const { generateTokens } = require('../services/tokens');

(async () => {
  const count = Math.max(1, parseInt(process.argv[2], 10) || 5);
  const label = process.argv[3] || 'diesnat-11';
  const outDir = path.join(__dirname, '../storage/token-qr');
  fs.mkdirSync(outDir, { recursive: true });

  const rows = generateTokens(count, label);
  for (const row of rows) {
    const file = path.join(outDir, row.token + '.png');
    await QRCode.toFile(file, row.token, { width: 512, margin: 2 });
    console.log(row.token + '  ->  ' + file);
  }
  console.log(`\n${rows.length} token dibuat (1 token = 1 sesi foto). Cetak QR di atas untuk dibagikan ke pengunjung.`);
})().catch((e) => { console.error(e); process.exit(1); });
