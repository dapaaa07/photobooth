# 06 — Layout & Frame

## Layout aktif

| Layout | Foto → slot | Kanvas render | Frame |
|---|---|---|---|
| `3x2-grid` | 3 → 6, pola `[A,B,B,C,C,A]` | 2400×3700 | Denim / Lace (pilih) |
| `3-strip` | 3 → 3 `[A,B,C]` | 2400×5400 | Strip (otomatis) |
| `2x2-grid` | 2 → 4 `[A,B,B,A]` | 2400×3700, slot 1000×1360 | Tanpa frame |
| `polaroid` | 1 → 1 | 2400×3400, slot 2080×2600 di (160,160) | Tanpa frame |

`4-strip` dihapus dari UI, server, dan editor. Foto selalu di-`cover`-crop
ke slot (kelebihan dibuang simetris tengah) — lihat catatan crop di bawah.

## Frame Diesnat (`public/assets/frames/`)

| File | Nama chip | Layout | Lubang (persen kanvas, hasil pindai) |
|---|---|---|---|
| `diesnat-3x2_1.png` | Diesnat Denim (default) | 3x2-grid | 6 jendela, kolom x 11,69/62,24%, baris y 15,25/38,96/63,02% |
| `diesnat-3x2_2.png` | Diesnat Lace | 3x2-grid | 6 jendela ±30×20%, kolom x 15,25/64,78%, baris y 7,45/30,66/54,6% |
| `diesnat-3x1_1.png` | Diesnat Strip | 3-strip | 3 jendela landscape ±70×17%, baris y 11,68/38,26/64,84% |

PNG adalah overlay: lubang **transparan** (foto di bawah), ornamen di atas foto.
Koordinat kode = hasil pindai + padding 0,6% tiap sisi, disimpan di
`DIESNAT_SLOT_RECTS` (`services/imageProcessor.js`) dan diduplikasi di
`editor.js` (keduanya wajib diubah bersamaan).

## Aturan kompatibilitas (perbaikan bug frame bocor)

Tema di-resolve per layout di **tiga lapis**: `resolveThemeForLayout`
(editor), `syncThemeChips` + auto-assign saat ganti layout (app), dan
`resolveFrameTheme` (server mengoreksi kiriman basi, bukan error).
Chip tema difilter per layout via atribut `data-layouts`; grup tema
disembunyikan untuk layout frameless.

## Cara tambah frame baru

1. Simpan PNG RGBA (lubang transparan) ke `public/assets/frames/`.
2. Pindai lubang: `node /tmp/opencode/detect2.js <file>` (atau ulang logika
   flood-fill transparansinya) → tambah 0,6% pad tiap sisi.
3. Tambah entri di `DIESNAT_SLOT_RECTS` server + rect editor + chip
   `data-layouts` di `index.html` (+ aspek di `cropAspectFor`, `camera.js`).
4. Verifikasi: render uji 6/6 (atau 3/3) piksel + bandingkan screenshot editor
   vs server (lihat `09-pengujian.md`).

## Catatan cover-crop

Jendela frame hampir persegi/landscape sementara foto webcam potrait/landscape
lebar — crop membuang ±25% konten. Wajah di tepi foto tampak "tidak pas"
padahal geometri tepat; solusinya panduan crop kamera (03), bukan geser rect.
