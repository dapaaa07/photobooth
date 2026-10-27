# Dokumentasi Photobooth Kiosk — Diesnatalis HIMATIKOM 2026

Kiosk photobooth acara: pengunjung pindai QR token → foto → edit → render resolusi
tinggi → hasil otomatis ter-upload ke Google Drive dan tampil sebagai QR di layar.

## Peta dokumen

| Berkas | Isi |
|---|---|
| `01-arsitektur.md` | Stack, struktur folder, daur hidup request |
| `02-instalasi-konfigurasi.md` | Prasyarat, install, `.env`, SSL, cara jalan |
| `03-alur-layar.md` | Alur 5 layar dari sudut pengunjung |
| `04-token.md` | Sistem token QR (SQLite, generate, redeem, validasi) |
| `05-timer.md` | Semua timer: sesi, editor, QR, rekap, countdown |
| `06-frame-layout.md` | Layout, frame Diesnat, koordinat slot, cara tambah frame |
| `07-drive-qr.md` | Jalur upload Drive + isi QR hasil |
| `08-api.md` | Referensi endpoint HTTP |
| `09-pengujian.md` | Harness uji + parameter komisioning |
| `10-operasional.md` | Checklist hari-H |
| `11-troubleshooting.md` | Masalah umum + jalur mati yang diketahui |

Arah visual dan keputusan desain ada di `../DESIGN.md` ("Ruang Cetak Studio").

## Status singkat (per commit `013f28d`)

- 4 layout aktif: `3x2-grid`, `3-strip`, `2x2-grid`, `polaroid` (4-photo strip dihapus).
- 3 frame milik sendiri: Diesnat Denim, Diesnat Lace, Diesnat Strip. Kustomisasi
  warna background dan 12 tema lama dihapus dari UI.
- Gerbang token QR (SQLite), panduan crop di kamera, timer sesi per jumlah foto,
  timer editor 90 dtk, QR hasil 40 dtk.
- Jalur email (`mailer.js`, `virtualKeyboard.js`, `POST /api/session/submit`)
  **nonaktif** — terdokumentasi di `11-troubleshooting.md`.
