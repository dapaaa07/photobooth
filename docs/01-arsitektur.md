# 01 — Arsitektur

## Stack

- Backend: Node.js + Express 5 (`server.js`), render gambar `sharp`, QR `qrcode`,
  Drive `googleapis`, email `nodemailer` (nonaktif), kamera DSLR via CLI `gphoto2`.
- Frontend: HTML/CSS/JS tanpa framework (`public/`): `app.js` orkestrasi,
  `camera.js` jepret + panduan crop, `editor.js` pratinjau kanvas,
  `recap.js` slideshow, `jsqr` (vendored di `public/js/vendor/`) untuk pindai token.
- Data: SQLite via `node:sqlite` (`storage/tokens.sqlite`) untuk token.
  Tidak ada database lain; hasil render berupa file PNG.

## Struktur folder

```
server.js                  Express app + endpoint API
services/
  imageProcessor.js        Render kolase resolusi tinggi (sharp)
  driveUploader.js         Upload Drive (WebApp → Service Account → lokal)
  tokens.js                Token sesi (SQLite)
  mailer.js                NONAKTIF (jalur email mati)
  dslrCamera.js            DSLR via gphoto2 (opsional, fallback webcam)
public/
  index.html               5 layar kiosk
  css/style.css            Tema "Ruang Cetak Studio"
  js/{app,camera,editor,recap,virtualKeyboard}.js
  js/vendor/jsqr.js        Decoder QR (offline)
  assets/frames/           PNG frame final (diesnat-*)
scripts/
  make-tokens.js           Generate token + QR cetak
  createDesignerTemplates.js / exportCanvasFrames.js  Utilitas dev
storage/                   (git-ignore) rendered/, uploads/, tokens.sqlite, token-qr/
docs/                      Dokumentasi ini
```

## Daur hidup satu sesi

```
Welcome (pindai token) → validasi → modal → Mulai Foto
  → Layout → Kamera (timer sesi) → Editor (timer 90 dtk)
  → POST /api/session/render → kolase + upload Drive
  → Success (rekap loop + QR file-link, 40 dtk) → Welcome
```

Token dikonsumsi tepat saat `drive.uploaded === true` (`consumeSessionToken`
di `app.js`). Batal di modal tidak menghanguskan apa pun.
