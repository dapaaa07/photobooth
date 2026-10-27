# 05 — Timer

Semua di `public/js/app.js` (badge memakai komponen `.session-timer-badge`;
memerah + class `.low` saat ≤30 dtk).

| Timer | Durasi | Mulai / berhenti | Habis → |
|---|---|---|---|
| Sesi kamera | 1 foto: 90 dtk · 2 foto: 135 dtk · 3 foto: 180 dtk (`SESSION_SECONDS`) | Mulai masuk kamera; berhenti saat foto lengkap / timeout / pindah layar | Slot kosong diisi hitam + dikunci, lompat ke editor + notice |
| Editor | 90 dtk (`EDITOR_SECONDS`), badge `01:30` | Mulai masuk editor | Otomatis klik **Lanjut** (render + upload) |
| QR sukses | 40 dtk (`reset-counter`) | QR muncul setelah putaran rekap pertama | Kembali ke welcome |
| Rekap | 0,85 dtk/foto, loop (`RECAP_INTERVAL_MS`) | Layar sukses | Putaran 1 → tampilkan QR; loop terus |
| Countdown jepret | 3-2-1 × 1 dtk + bunyi | Tiap foto | Jepret + flash |
| Peringatan | bunyi tiap detik di ≤10 dtk sesi/editor | — | — |

Hook uji: `/?sessionsecs=N` menimpa durasi sesi kamera (khusus komisioning).
Riwayat jepretan untuk rekap dibatasi 15 terakhir (`MAX_CAPTURES`).
