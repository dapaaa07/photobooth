# Photobooth Kiosk — Diesnatalis HIMATIKOM 2026

Kiosk photobooth acara mandiri: pengunjung pindai **QR token** → foto →
edit → hasil render resolusi tinggi otomatis ter-upload ke **Google Drive**
dan tampil sebagai **QR di layar** untuk dipindai pulang.

## Fitur

- Gerbang token QR (SQLite, sekali pakai) — kamera welcome selalu aktif memindai.
- 4 layout (3×2 grid, classic 3-strip, 2×2 grid, polaroid) + 3 frame Diesnat
  milik sendiri (Denim, Lace, Strip).
- Panduan crop live di layar kamera mengikuti aspek slot tiap layout.
- Timer sesi per jumlah foto (90/135/180 dtk), timer editor 90 dtk
  (otomatis lanjut), QR hasil 40 dtk, rekap slideshow 0,85 dtk/foto.
- Upload Drive 3 jalur (Apps Script WebApp → Service Account → lokal);
  QR menunjuk file foto langsung.

## Mulai cepat

```bash
npm install
node scripts/make-tokens.js 5 diesnat-11   # 5 token + QR cetak di storage/token-qr/
node server.js                              # kiosk: http://<ip-lan>:3000
```

Isi `.env` dari `.env.example` (kunci Drive, port). Detail tiap kunci:
`docs/02-instalasi-konfigurasi.md`.

## Dokumentasi (`docs/`)

| Dokumen | Isi |
|---|---|
| `01-arsitektur.md` | Stack, struktur folder, daur hidup sesi |
| `02-instalasi-konfigurasi.md` | Install, `.env`, SSL, file sensitif |
| `03-alur-layar.md` | Alur 5 layar dari sudut pengunjung |
| `04-token.md` | Generate, validasi, redeem, siklus token |
| `05-timer.md` | Semua durasi + hook uji |
| `06-frame-layout.md` | Layout, koordinat slot, cara tambah frame |
| `07-drive-qr.md` | Jalur upload + syarat sharing folder |
| `08-api.md` | Referensi endpoint |
| `09-pengujian.md` | Harness uji + batasan lab |
| `10-operasional.md` | Checklist hari-H |
| `11-troubleshooting.md` | Masalah umum + jalur mati |

Arah visual: `DESIGN.md` ("Ruang Cetak Studio").

## Catatan

- Jalur email (`mailer.js`, `POST /api/session/submit`) nonaktif.
- Uji komisioning: `/?sessionsecs=N`, `/?token=DSN11-XXXXXX`.
- Jangan commit `.env`, `storage/`, `ssl/`, kredensial (sudah di `.gitignore`).
