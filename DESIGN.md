# DESIGN.md - Photobooth Kiosk Diesnatalis HIMATIKOM 2026

Arah desain ini disusun dari arahan pemilik (ganti desain lama, tanpa gradasi
khas AI, tanpa ungu, tanpa emoji, jaga breathing room) dan boleh diganti
pemilik kapan saja. Set keputusan wajib punya alasan satu baris (R-31).

## Mood
"Ruang cetak studio foto". Kios ini seperti meja lab cetak: kertas hangat,
tinta pekat, bingkai foto rapi, dan foto adalah bintangnya. Terasa hangat,
teratah, dan cocok untuk acara perayaan, bukan terasa seperti aplikasi tech
atau halaman landing AI.

## Palette (R-29)
- Core 1: kertas hangat `#F6F2EA` (background) - permukaan lembut untuk kiosk
  di ruang acara terang; gelap ditolak karena kios dipandang dari jarak dekat
  di siang/hall terang.
- Core 2: tinta `#221D15` (teks & komponen terpilih) - kontras 13:1 di kertas.
- Netralan: `#6E675C` (teks sekunder, AA di kertas), garis rambut `#E5DED0`.
- Accent: vermillion `#BC3F1E` - dipakai di momen "mulai"/lanjut (tombol CTA),
  indikator waktu menipis, dan ceklis sukses. Merah studio, bukan ungu/biru AI.
- Tidak ada gradasi, tidak ada glow, tidak ada ungu.

## Typography (R-06)
- Display: Georgia (serif sistem). Alasan: kios offline (tanpa webfont) dan
  serif memberi rasa "cetakan studio", bukan terminal - meniadakan citarasa
  monospace dari desain lama.- UI: stack humanist sistem (Segoe UI/Roboto/Helvetica). Alasan: keterbacaan
  untuk pengunjung segala umur di layar sentuh.
- Label meta: sang sidebar (screen bar, label kecil) uppercase kecil dengan
  tracking moderat 0.06-0.08em untuk penanda langkah, bukan dekorasi.

## Bentuk & Jarak
- Radius: 6px kontrol kecil, 10px tombol/kartu, 16px panel. Tidak ada pill
  untuk semua elemen (R-11); satu-satunya lingkaran adalah wadah ikon sukses.
- Garis rambut 1px + kartu datar sebagai identitas "cetakan"; bayangan lembut
  hanya pada 2 permukaan "karya": frame preview editor dan kartu QR (alasan:
  mereka adalah deliverable yang harus mengambang di atas meja).
- Spacing skala `--u` 8px: gap 12-36px, padding layar 24-48px. Breathing room
  adalah struktur, bukan sisa ruang.

## Dials
ENERGY 2 / RHYTHM 2 / MOTION 2.
- MOTION 2: transisi 160ms pada hover/tekan, animasi fungsional saja (flash
  jepretan, pop hitungan). Tidak ada loop tanpa pamrih (R-19).
- Focal per layar: welcome=CTA, layout=kartu terpilih, kamera=feed video,
  editor=canvas preview, sukses=canvas rekap lalu QR.
- Motif identitas: screen bar bernomor + numeral serif + bingkai garis
  rambut, berulang di semua layar.
