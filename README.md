# Surabraja — Dashboard Kegiatan Harian

Paket untuk GitHub dan Netlify. Master PIC berasal dari Excel terbaru yang diberikan: 35 akun aktif, terdiri dari 1 Manager, 2 ASM, 6 SPV, dan 26 Sales. Checklist menggunakan 14 kegiatan Sales, 13 kegiatan SPV, dan 13 kegiatan ASM dari Kamus_Kegiatan. Tidak ada data laporan lama pada lampiran, sehingga dashboard dimulai tanpa laporan.

## Pasang melalui GitHub dan Netlify

1. Ekstrak `Surabraja_Dashboard_GitHub_Netlify.zip` di komputer.
2. Buat repository GitHub **Private**, misalnya `surabraja-report-harian`.
3. Pilih **Add file → Upload files**. Upload seluruh isi folder hasil ekstrak. Pastikan `package.json`, `package-lock.json`, `netlify.toml`, dan `README.md` berada di halaman utama repository, bukan di dalam satu folder tambahan. Folder `server`, `src`, `public`, `netlify`, `scripts`, dan `tests` juga harus terunggah lengkap. Simpan perubahan.
4. Di Netlify, tambahkan project dengan pilihan impor repository GitHub yang baru dibuat. Jika diminta konfigurasi, gunakan pengaturan berikut:

   | Pengaturan | Isi |
   | --- | --- |
   | Branch | `main` atau branch utama repository Anda |
   | Base directory | kosong |
   | Build command | `npm run build` |
   | Publish directory | `dist` |
   | Functions directory | `netlify/functions` |
   | Node.js | `22` |

5. Jalankan deploy. Netlify membaca konfigurasi dari `netlify.toml`. Tidak perlu membuat database Supabase/Firebase atau memasukkan API key ke halaman web.
6. Setelah build sukses, buka alamat `https://nama-project.netlify.app`. Masuk dengan akun Manager di file **Akun_Login_Surabraja_PRIBADI.txt**, lalu ganti password awal.
7. Berikan alamat dashboard dan username/password masing-masing hanya kepada PIC yang bersangkutan. Setiap PIC wajib mengganti password awal saat masuk pertama kali.

**Gunakan impor GitHub yang menjalankan build.** Mengunggah file HTML saja atau menyeret folder `dist` ke layanan deploy statis tidak memasang fungsi server dan penyimpanan bersama. File password pribadi tidak dimasukkan ke ZIP dan tidak perlu diunggah ke GitHub.

## Alur harian

- Sales, SPV, dan ASM membuka **Laporan saya** lalu memilih tanggal.
- Pilih status kegiatan. Perubahan disimpan otomatis sebagai draft setelah sekitar 1,2 detik ketika nilai kolom selesai diubah. Tombol **Simpan draft** tersedia untuk memastikan penyimpanan. Tunggu tulisan **Tersimpan** sebelum menutup halaman. Jika jaringan gagal, aplikasi menampilkan kegagalan, bukan tanda tersimpan.
- `Selesai`: kegiatan selesai. `Proses`: sudah dimulai. `Belum`: belum dilakukan. `Tidak Berlaku`: hanya tersedia untuk kegiatan bersyarat dan wajib disertai alasan.
- Jika ada `Proses` atau `Belum`, isi kendala, tindak lanjut, ID PIC penanggung jawab, dan tenggat. Gunakan ID PIC terdaftar, termasuk ID sendiri bila dikerjakan sendiri.
- Isi satu tautan bukti kegiatan atau folder yang dapat dibuka atasan. Berkas bukti ditempatkan pada tautan tersebut; dashboard menyimpan tautannya.
- Pilih **Kirim ke atasan**. Laporan yang dikirim dikunci. Mengubah checklist tidak dapat membatalkan persetujuan secara diam-diam.
- Atasan membuka **Persetujuan**, membaca checklist dan bukti, kemudian memilih **Setujui laporan** atau **Minta perbaikan**. Catatan wajib diisi jika meminta perbaikan.
- Laporan yang dikembalikan dapat diperbaiki dan dikirim ulang. Riwayat simpan, kirim, dan review tetap tercatat.

Satu ID PIC hanya memiliki satu laporan per tanggal. Jam kirim dan jam persetujuan berasal dari server. Tanggal dan tampilan waktu menggunakan WIB. Pengisian tanggal mendatang ditolak.

## Hak akses dan jalur persetujuan

| Peran | Yang dapat dipantau | Laporan yang dapat disetujui |
| --- | --- | --- |
| Manager | Seluruh Sales, SPV, dan ASM | PIC dengan `id_atasan=MGR01` |
| ASM | Laporan sendiri dan seluruh tim di bawahnya | PIC dengan ID atasannya sama dengan ID ASM tersebut |
| SPV | Laporan sendiri dan Sales di bawahnya | PIC dengan ID atasannya sama dengan ID SPV tersebut |
| Sales | Laporan sendiri | Tidak ada |

Jalur persetujuan selalu mengikuti `id_atasan`, bukan hanya jabatan:

- `Sch01` (Benny Medianto Wibowo) melapor langsung ke `MGR01`.
- `Sales24` dan `Sales25` di Tangerang melapor langsung ke `ASM02`.
- Atasan di level lebih tinggi dapat membaca laporan tim, tetapi persetujuan hanya oleh atasan langsung. Tidak ada persetujuan atas laporan sendiri.
- Manager menjadi pemantau dan pemeriksa, sehingga tidak termasuk 34 PIC wajib melapor.

## Belum melapor per tanggal

Pilih tanggal pada **Monitoring harian**. Nama PIC tanpa laporan ditampilkan sebagai `Belum Lapor`. PIC yang baru menyimpan draft ditampilkan sebagai `Draft` dan tetap masuk angka **Belum mengirim**. Laporan terkirim ditampilkan sebagai **Menunggu review**, **Disetujui**, atau **Perlu Perbaikan**.

Daftar memakai PIC berstatus `Aktif` pada Master PIC. Master tidak memuat tanggal mulai bekerja, jadwal libur, izin, atau cuti. Karena itu setiap tanggal yang dipilih diperiksa terhadap seluruh PIC aktif; pilih tanggal kerja yang memang diwajibkan melapor. Jangan menyimpulkan pelanggaran absensi hanya dari daftar ini.

Data monitoring dan persetujuan diperbarui setiap 60 detik saat halaman aktif. Tombol **Muat ulang** mengambil data terbaru langsung. Form yang sedang diedit tidak ditimpa pembaruan otomatis.

## Unduhan Excel

Buka **Unduh Excel**, pilih rentang 1–31 hari, kemudian unduh. File mempertahankan susunan dan kolom template asli:

- `Sales_Harian`, `SPV_Harian`, dan `ASM_Harian`: checklist, kendala, bukti, pengiriman, hasil review, serta perhitungan jumlah kegiatan.
- `Rekap_Manager`: rekap pada tanggal terakhir dari periode yang dipilih.
- `Master_PIC`: identitas PIC sesuai hak akses akun pengunduh.
- `Kamus_Kegiatan` dan `Panduan`: panduan dari template sumber.
- `Status_Report`: setiap PIC per tanggal, termasuk tanpa laporan dan draft. Tanggal, jam kirim, dan jam review disimpan sebagai nilai tanggal Excel dengan waktu WIB.

File ekspor merupakan salinan hasil pada saat unduh, termasuk hitungan checklist. Mengedit file unduhan tidak mengubah data online. Perubahan dan persetujuan dilakukan di dashboard, lalu unduh kembali. Ekspor Sales hanya berisi PIC tersebut, ekspor SPV/ASM hanya timnya, dan Manager seluruh tim.

## Penyimpanan dan akun

Data produksi disimpan di Netlify Blobs milik project yang sama. Input tidak bergantung pada penyimpanan browser PIC. Update aplikasi pada project Netlify yang sama menggunakan data yang sama; membuat project lain berarti penyimpanan baru. Jangan menghapus project lama untuk melakukan update.

Password di repository disimpan sebagai hash `scrypt`, bukan password yang dapat dibaca. Halaman publik hanya berisi UI. Login memakai cookie `HttpOnly`, `Secure`, dan `SameSite=Strict`; sesi berakhir setelah 12 jam dan otomatis tidak berlaku setelah password diganti/reset. Akses dan review diperiksa pada server. Penulisan menggunakan versi laporan dan conditional write agar dua sesi tidak saling menimpa tanpa pemberitahuan.

Jika PIC lupa password, Manager membuka **Akun saya → Reset password PIC**. Password sementara ditampilkan satu kali dan wajib diganti saat login berikutnya. Simpan password Manager setelah diubah. Pemulihan password Manager yang terlupa memerlukan administrator project Netlify; aplikasi tidak menyediakan reset tanpa autentikasi.

Penyimpanan dan fungsi server mengikuti layanan, batas penggunaan, serta penagihan akun Netlify Anda. Informasi resmi: [Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/) dan [Netlify Functions](https://docs.netlify.com/build/functions/overview/).

## Update Master PIC

Data awal tersimpan di `server/master.json`. Jangan mengubah ID yang sudah digunakan. Nama, jabatan, cabang, area, atasan, dan status dapat diperbarui di file ini lalu deploy ulang pada project yang sama. Untuk menambah PIC, buat entri baru dengan ID unik dan atasan yang terdaftar, deploy, kemudian Manager memakai **Reset password PIC** untuk membuat password awal akun baru. Jangan menulis password biasa dalam repository. Perubahan identitas/atasan berlaku untuk akses dan persetujuan setelah deploy, sedangkan laporan yang sudah disimpan mempertahankan identitas saat pelaporan. Saat ini aplikasi tidak menyediakan editor Master PIC atau impor ulang Excel dari halaman web.

Master tidak memiliki masa aktif historis, sehingga daftar belum melapor pada tanggal lama menggunakan daftar PIC aktif yang berlaku saat aplikasi dijalankan.

## Pengembangan lokal

```bash
npm ci
npm run dev
```

Buka `http://localhost:3000`. Data lokal disimpan dalam `.local-data` dan tidak bercampur dengan Netlify. Preview deploy dan branch deploy juga memakai penyimpanan uji terpisah dari produksi.

```bash
npm test
npm run build
```

Tes mencakup hierarki, pembatasan akses, perubahan/reset password, draft, pengiriman, persetujuan langsung, perbaikan, konflik penulisan, validasi, pembatasan login, dan ekspor Excel. Tes lokal tidak menghubungi penyimpanan produksi Netlify.

## Jika pemasangan belum berjalan

- Build gagal: periksa semua folder, `package-lock.json`, dan Node 22; pastikan base directory kosong.
- Login menampilkan layanan penyimpanan belum tersedia: pastikan deploy dari GitHub dengan fungsi `api` aktif, bukan hanya upload folder statis.
- URL `/api/me` menampilkan JSON `Silakan login.` saat belum masuk: fungsi server sudah menjawab.
- Data tidak muncul di browser lain: pastikan URL project sama, akun sesuai, tanggal sama, dan tekan **Muat ulang**. Hak akses berbeda memang membatasi PIC yang terlihat.
- Input belum masuk daftar terkirim: draft harus dikirim melalui **Kirim ke atasan**.
- Akun lama tidak menerima password awal: password sudah diubah. Minta Manager melakukan reset.

Setelah deploy pertama, uji satu Sales menyimpan draft dan mengirim laporan, satu SPV melakukan review, lalu Manager memuat ulang dari browser lain dan mengunduh Excel. Paket ini telah diuji lokal; koneksi penyimpanan produksi perlu diverifikasi pada project Netlify Anda.
