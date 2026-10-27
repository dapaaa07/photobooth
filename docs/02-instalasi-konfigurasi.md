# 02 — Instalasi & Konfigurasi

## Prasyarat

- Node.js 22+ (produksi berjalan di Node 24; `node:sqlite` masih eksperimental
  tapi berfungsi tanpa flag tambahan).
- Linux untuk fitur DSLR (`gphoto2` + Canon via USB; opsional — tanpa itu
  otomatis fallback webcam).
- Koneksi internet hanya dibutuhkan untuk upload Drive. UI, pindai token,
  dan render berjalan offline penuh.

## Install

```bash
cd /opt/lampp/htdocs/photobooth
npm install
node scripts/make-tokens.js 5 diesnat-11   # token awal + QR cetak
node server.js
```

Kiosk: `http://<ip-lan>:3000` (HTTP, `PORT`), HTTPS `https://<ip-lan>:3443`
(`HTTPS_PORT`, butuh `ssl/server.crt` + `ssl/server.key`).

## `.env` (lihat `.env.example`; file asli git-ignore)

| Kunci | Wajib | Keterangan |
|---|---|---|
| `PORT` / `HTTPS_PORT` | tidak | Default `3000` / `3443` |
| `GOOGLE_DRIVE_WEBAPP_URL` | disarankan | Upload via Apps Script WebApp (prioritas 1, bebas kuota SA) |
| `GOOGLE_DRIVE_FOLDER_ID` / `_FOLDER_URL` | ya utk Drive | Folder tujuan. Set folder **"Siapa pun dengan link — viewer"** agar HP pengunjung bisa unduh |
| `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` | jika tanpa WebApp | Path JSON kredensial SA (atau `GOOGLE_CLIENT_EMAIL` + `GOOGLE_PRIVATE_KEY`) |
| `SMTP_*`, `EMAIL_FROM` | tidak | Jalur email nonaktif; abaikan |

Tanpa kredensial Drive: foto tetap tersimpan di `storage/rendered/` dan QR
menunjuk URL lokal (mode fallback, `uploaded: false`).

## File sensitif (jangan commit)

`.env`, `dapa-drive.json`, `google-credentials.json`, `*.pem`, `ssl/`,
`storage/`, `node_modules/` — sudah tercakup `.gitignore`.
