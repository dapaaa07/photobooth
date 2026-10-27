# 10 — Checklist Operasional Hari-H

## Sehari sebelum

- [ ] `npm install`, `node server.js` jalan; buka dari HP via `http://<ip-lan>:3000`.
- [ ] `.env` Drive terisi; folder sharing **link-viewer**; uji 1 sesi penuh
  sampai QR HP terbuka (lihat 07).
- [ ] Generate + cetak QR token secukupnya (`node scripts/make-tokens.js N label`;
  PNG di `storage/token-qr/`). Satu token = satu sesi; siapkan cadangan.
- [ ] Cek `GET /api/admin/tokens` — semua `used_at` kosong.
- [ ] Kamera: izin browser dikabulkan permanen; bila DSLR, `gphoto2 --auto-detect`
  mendeteksi; kalau tidak, webcam fallback otomatis.
- [ ] Layar sentuh responsif di semua layar (tidak ada input teks di alur aktif).

## Saat acara

- [ ] Kiosk di `http://localhost:3000/` (atau tablet ke IP LAN), mode kiosk/fullscreen.
- [ ] Pengunjung pindai QR cetak di welcome → modal → Mulai Foto.
- [ ] Pantau `storage/rendered/` bertambah + log `✅ Foto berhasil diupload`.
- [ ] Token habis di tengah acara: generate batch baru dari terminal, cetak,
  bagikan — tanpa restart server.

## Setelah acara

- [ ] Arsipkan `storage/rendered/` + `storage/tokens.sqlite`.
- [ ] `git add -A` (pastikan `git status` bersih dari `.env`/`storage/`) → commit → push.
