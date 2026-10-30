# 08 — Referensi API

Basis: `http(s)://<kiosk>:3000` (HTTPS `:3443`). Body JSON, kecuali WebApp
Drive (`text/plain`).

| Method & path | Body | Sukses → |
|---|---|---|
| `POST /api/tokens/validate` | `{token}` | `200 {success, token}` — tanpa tulis DB |
| `POST /api/tokens/redeem` | `{token}` | `200 {success, token}`; `404` tak dikenal; `410` sudah dipakai |
| `GET /api/admin/tokens` | — | `200 {success, tokens[]}` (jaringan lokal saja) |
| `POST /api/session/render` | `{photos[], layout, frameTheme, filter, brandingText}` (`frameColor` selalu default `#ffffff` — UI pemilih warna dihapus) | `200 {success, imageUrl, fileName, filePath, drive{...}}` |
| `POST /api/session/submit` | `{email, fileName}` | **NONAKTIF** (jalur email mati, lihat 11) |
| `GET /api/camera/status` | — | `{connected, model?, gphoto2Installed?, message?}` |
| `POST /api/camera/capture-dslr` | — | `{success, dataUrl?}` (fallback webcam bila gagal) |
| `GET /api/status` | — | `{status, serverTime, localIPs, httpPort, httpsPort}` |
| `GET /api/drive/test` | — | Upload uji 1×1 px + kondisi kredensial (diagnosa clone laptop baru) |

File statis: `public/` di `/`, `storage/` di `/storage/` (`Cache-Control: no-cache`).
Versi cache-bust: CSS `?v=16`, JS `?v=33`.
