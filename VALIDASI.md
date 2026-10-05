# Validasi paket

Diperiksa pada 5 Oktober 2026 dengan Master PIC terbaru.

- 35 akun aktif dan 40 definisi kegiatan cocok dengan workbook sumber.
- Enam kelompok tes aplikasi lulus: hierarki dan ruang akses, autentikasi/password, alur laporan dan persetujuan, validasi input, ekspor Excel, dan pembatasan percobaan login.
- Pengujian dua penulisan bersamaan menghasilkan satu simpan berhasil dan satu respons konflik, tanpa menimpa laporan secara diam-diam.
- Pengujian Chromium lulus tanpa kesalahan JavaScript: password pertama, hak akses Manager/Sales, draft otomatis yang bertahan setelah reload, penguncian setelah dikirim, persetujuan SPV, pembaruan pada sesi Manager terpisah, dan unduhan Excel.
- Tampilan desktop dan ponsel 390 piksel diperiksa. Halaman tidak melebar melewati viewport ponsel; tabel dapat digeser pada bagian tabel.
- File Excel dapat dibuka kembali dengan parser XLSX. Header checklist cocok dengan template, sheet Status_Report memuat PIC tanpa laporan, tanggal tersimpan sebagai tanggal Excel, serta status Disetujui, ID pemeriksa, waktu WIB, dan catatan review sesuai pengujian browser.
- Folder publik hanya berisi HTML, CSS, dan JavaScript UI; tidak berisi hash password, data Master PIC, maupun template server.
- Build halaman dan bundel fungsi Netlify berhasil; audit dependensi tidak menemukan kerentanan pada pemeriksaan ini.

Pengujian memakai penyimpanan lokal dan data uji terpisah. Penyimpanan produksi Netlify belum digunakan atau diterapkan dari sesi ini. Verifikasi terakhir dilakukan pada URL project Anda setelah deploy melalui GitHub.
