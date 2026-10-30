# 11 — Troubleshooting

## Kamera hitam di sesi foto (SUDAH DIPERBAIKI)

Stream mati tertinggal di `srcObject` sehingga stream baru tak terpasang.
Perbaikan: `stopCamera` melepas `srcObject` (`camera.js`). Bila terulang:
restart `node server.js` NGGAK cukup — ini sisi browser; refresh halaman kiosk.

## Kamera external tampil mirror/terbalik

Bawaannya tidak ada mirror; kalau stream kamera external (HP-as-webcam) sudah
datang dalam keadaan ter-mirror atau terputar, buka `/?setup=1`, masuk ke layar
kamera, pilih tombol **Orientasi** yang membuat gambar tampak benar — tersimpan
per perangkat dan ikut dipakai saat foto & scan QR.

## Clone di laptop lain: upload gagal & QR menunjuk localhost

Bersifat normal: `dapa-drive.json` dan `.env` tidak ikut repo (git-ignore,
kredensial). Susunannya manual — tapi yang membuat QR "localhost" biasanya
rantai ini:

1. `.env` dulu dimuat dari current working directory; `node server.js` yang
   dijalankan di luar folder proyek mengabaikannya. Sudah diperbaiki (path
   eksplisit `__dirname/.env`), tapi tetap disarankan jalan dari folder
   proyek.
2. WebApp menolak respons non-JSON/error ("Akses ditolak: DriveApp",
   halaman login) — cek deployment Apps Script: *Execute as: Me* +
   *Who has access: Anyone*, dan akun deploy aktif.
3. Tanpa folder URL, fallback QR dulu hardcode `localhost:3000` — sudah
   diganti IP LAN / `PB_PUBLIC_URL` (lihat 07).

Cara memverifikasi setiap clone: buka `http://<host>:3000/api/drive/test`
(lihat hasilnya) atau `GET /api/admin/tokens` untuk memastikan server hidup.

## Server lama vs kode baru

Rute API dimuat saat proses start. Setelah edit `services/` atau `server.js`,
**wajib restart** `node server.js`; file statis `public/` langsung live.
Gejala khas: render tak cocok dengan editor padahal kode benar.

## Port bentrok

`EADDRINUSE :3000/:3443` = instance lama masih hidup.
`fuser -k 3000/tcp 3443/tcp` lalu start ulang.

## Token terpakai padahal pengunjung menekan Batal (SUDAH DIPERBAIKI)

Kode lama mengonsumsi saat scan. Sekarang: validasi saat scan, konsumsi
hanya saat `drive.uploaded === true`. Token yang terlanjur hangus di masa
pengujian tidak bisa dihidupkan — generate ulang.

## "Foto tidak pas di bingkai"

Hampir selalu cover-crop (lihat 06), bukan koordinat: wajah di tepi foto +
jendela hampir persegi = yang tampil dinding. Arahkan pengunjung memakai
panduan crop di layar kamera.

## QR HP tidak terbuka

Folder Drive belum link-sharing, atau sesi memakai fallback lokal
(`uploaded: false`, butuh satu LAN dengan kiosk).

## Jalur mati yang diketahui (jangan dijadikan andalan)

- Email: `services/mailer.js`, `virtualKeyboard.js`, `POST /api/session/submit`
  tidak terhubung ke alur aktif.
- `scripts/createDesignerTemplates.js` dan `exportCanvasFrames.js` menulis ke
  path artefak eksternal, bukan bagian runtime.
- Frame non-Diesnat di `public/assets/frames/` (genesis, himatikom-2026, dll.)
  tidak dirujuk UI mana pun sejak kurasi.
