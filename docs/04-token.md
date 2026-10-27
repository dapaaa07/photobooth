# 04 — Sistem Token QR

Satu token = satu sesi foto, sekali pakai, tersimpan di SQLite
(`storage/tokens.sqlite`, git-ignore). Tanpa server auth — keamanan mengandalkan
jaringan lokal kiosk.

## Format

`DSN11-XXXXXX` — 6 karakter dari alfabet 32 simbol tanpa huruf ambigu
(tanpa `0/O`, `1/I/L`). QR mengenkode string token mentah.

## Generate

```bash
node scripts/make-tokens.js JUMLAH [label]   # default: 5 diesnat-11
```

Mengisi tabel `tokens(token, label, created_at, used_at)` + menulis QR PNG
512px ke `storage/token-qr/<TOKEN>.png` untuk dicetak dan dibagikan.

Daftar status operator: `GET /api/admin/tokens`.

## Siklus hidup (kode di `services/tokens.js`, `server.js`, `app.js`)

1. **Scan** (welcome, tiap 600 dtk) → `POST /api/tokens/validate` — cek
   tanpa tulis DB. ‌Tak dikenal → 404, sudah dipakai → 410.
2. **Modal** → `state.sessionToken` diingat. **Batal** mengosongkannya;
   nol biaya, token tetap utuh.
3. **Konsumsi** → `consumeSessionToken` setelah render sukses **dan**
   `drive.uploaded === true` → `POST /api/tokens/redeem` (UPDATE atomik
   `WHERE used_at IS NULL`; balapan selesai siapa cepat).
4. Upload gagal / sesi ditinggal / reset → token tidak hangus.

## Hook komisioning

`/?token=DSN11-XXXXXX` redeem-untuk-uji jalur modal tanpa menempel QR fisik.
