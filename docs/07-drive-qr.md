# 07 — Upload Drive & QR Hasil

`POST /api/session/render` → `createPhotoCollage` (sharp, PNG) → simpan
`storage/rendered/photobooth_<ts>_<layout>.png` → `uploadToGoogleDrive`
(`services/driveUploader.js`). Prioritas jalur:

1. **Apps Script WebApp** (`GOOGLE_DRIVE_WEBAPP_URL`): POST base64 → respons
   `url | fileUrl`. Bebas kuota Service Account. Respons non-JSON (halaman
   login Google), error, atau tanpa tautan file dianggap **gagal** — bukan
   sukses palsu.
2. **Service Account Drive API v3** (key file / env): upload ke `folderId`.
3. **Fallback lokal** (`uploaded: false`): QR menunjuk URL file kiosk.

## Target URL di QR fallback

Fallback TIDAK lagi memakai `localhost` (QR dipindai dari HP pengunjung;
`localhost` di HP = bukan kiosk). Urutannya:

1. `PB_PUBLIC_URL` di `.env` bila diisi (mis. `http://192.168.0.105:3000`).
2. IP LAN pertama kiosk (deteksi otomatis via `os.networkInterfaces`).
3. `localhost` hanya sebagai jaminan terakhir.

## Diagnosa cepat

`GET /api/drive/test` menjalankan upload uji 1×1 px + melaporkan kondisi
`GOOGLE_DRIVE_WEBAPP_URL`, `GOOGLE_DRIVE_FOLDER_ID`, dan keberadaan file kunci
Service Account. Pakai ini untuk memeriksa laptop/clone baru tanpa sesi foto.

## Isi QR (diprioritaskan berurutan)

`resData.url || resData.fileUrl` (WebApp) → `webViewLink` (SA) → URL folder →
URL lokal `http://<host>/storage/rendered/<file>`. QR selalu menunjuk **file
foto**, bukan folder, selama upload berhasil. Ukuran QR 260px, margin 1.

## Syarat hari-H

Folder Drive dibagi sebagai **"Siapa pun dengan link — viewer"**, kalau tidak
HP pengunjung gagal membuka hasil. `drive.uploaded` juga menjadi penanda
konsumsi token (04) — upload gagal = token tidak hangus (sesi bisa diulang).
