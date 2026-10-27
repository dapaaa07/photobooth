# 09 — Pengujian

Harness hidup di `/tmp/opencode/` (bukan di repo): `mkpreview.sh` menyalin
`public/` + halaman uji ke `pbpreview/` (port 8099), `mktests.sh` membangkitkan
`flowtest.html` (klik simulasi + `?sessionsecs`), `recaptest.html`, `e2e.html`
(stub fetch render, tanpa upload Drive nyata).

## Probe standar (Chrome headless)

- **Flow/timeout**: `flowtest.html?sessionsecs=8` → log `timer=00:00`,
  `notice=block`, slot hitam terkunci.
- **Rekap**: `RECAPLOG` interval ±850 dtk + `COMPLETE` + loop tanpa counter.
- **E2E QR**: `qr=visible`, `reset` turun dari 40.
- **Render**: skrip node (`NODE_PATH=<repo>/node_modules`) memanggil
  `createPhotoCollage` dengan JPEG solid → cek piksel pusat tiap lubang
  (6/6 atau 3/3) + bandingkan thumbnail vs screenshot editor.
- **Token**: `validate` tidak mengonsumsi → `redeem` mengonsumsi →
  `validate` menolak; rantai QR-cetak→`jsQR`→redeem.
- **Panduan crop**: halaman stub dimensi video → geometri kotak aman
  (polaroid 640@280, 2x2 588@306, strip full-bleed pada 1200×800 dari 1920×1080).

## Parameter komisioning (query URL)

`?sessionsecs=N` (timer sesi), `?token=DSN11-XXXXXX` (uji jalur modal).
Keduanya untuk setup/pengujian, bukan alur pengunjung.

## Batasan lab

Headless menahan izin kamera (janji `getUserMedia` menggantung) — jalur scan
live dan video tak terwakili; gunakan kiosk fisik + QR cetak untuk itu.
Jangan picu upload Drive nyata saat uji (stub fetch / WebApp mock lokal).
