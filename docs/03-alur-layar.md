# 03 — Alur Layar (sudut pengunjung)

## 1. Welcome — pindai token

Kamera selalu aktif + pratinjau live dengan bingkai sudut. Loop pindai tiap
600 dtk memakai frame video yang diperkecil (≤480px). Token valid →
modal **"Token Diterima"** → tombol **Mulai Foto** ke layar layout.
Tombol mulai lama disembunyikan (tetap ada di DOM untuk operator/pengujian).

## 2. Layout — 4 kartu

`3x2 Grid Portrait` (3 foto → 6 slot), `Classic 3-Strip` (3 foto),
`2x2 Grid Portrait` (2 foto → 4 slot), `Polaroid Portrait` (1 foto).
Frame mengikuti layout otomatis (lihat `06-frame-layout.md`).

## 3. Kamera — jepret bertahap + timer sesi

Hitung mundur 3-2-1 (bunyi beep) per foto, flash tiap jepretan, strip thumbnail
dengan tombol **Ulang** per slot (terkunci untuk slot hitam pasca-timeout).
Overlay **panduan crop**: kotak putus-putus = area aman sesuai aspek slot
layout; area gelap = perkiraan terpotong. Dihitung dari dimensi video aktual
(mengkompensasi `object-fit: cover`), refresh saat ganti layout/tema,
masuk kamera, metadata tiba, dan resize.

Sumber jepretan: DSLR (`gphoto2`, jika terdeteksi) else webcam penuh
(`videoWidth × videoHeight`, **tidak di-mirror** — preview dan hasil foto sama).

## 4. Editor — pratinjau + timer 90 dtk

Canvas 600px menampilkan komposisi persis server (foto → overlay frame).
Chip tema difilter per layout; 2x2/polaroid frameless (grup tema disembunyikan).
Filter warna: Normal, B&W, Vintage, Vivid, Cyber, Sepia.
Timer habis → otomatis **Lanjut** (render + upload).

Timeout sesi (slot hitam): slot yang tak sempat difoto diisi hitam, tombol
ulangnya dikunci, notice tampil, tetap bisa lanjut render.

## 5. Success — rekap + QR Drive

Rekap memutar seluruh riwayat jepretan (termasuk yang diulang) 0,85 dtk/foto,
loop tanpa counter. Setelah putaran pertama, QR file Drive muncul + hitung
mundur 40 dtk kembali ke welcome.
