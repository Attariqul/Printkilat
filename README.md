**LAPORAN PROYEK REKAYASA PERANGKAT LUNAK RANCANG BANGUN SISTEM ANTREAN CETAK DAN PENGIRIMAN FILE FOTOKOPI BERBASIS WEB (STUDI KASUS: BERKAH FOTOCOPY)** 

_Disusun berdasarkan implementasi sistem_ **_PrintKilat_** _dan data studi lapangan pada usaha_ **_Berkah Fotocopy_** _(Desa Reuleut Timu, Kecamatan Muara Batu — Narasumber: Pak Jefri, 19 November 2026)._ 

**Versi Cetak A4 / PDF (Lengkap dengan Diagram Terpasang):** Buka /laporan/Laporan_Skripsi_PrintKilat.html pada aplikasi yang sedang berjalan lalu klik **Cetak / Simpan PDF (A4)** . 

# **ABSTRAK** 

Pelayanan jasa fotokopi dan percetakan dokumen di lingkungan sekitar kampus maupun masyarakat masih banyak dikelola secara konvensional. Berdasarkan hasil wawancara lapangan dengan pemilik usaha **Berkah Fotocopy** (Pak Jefri) di Desa Reuleut Timu, Kecamatan Muara Batu pada tanggal 19 November 2026, operasional harian pukul 07.00–17.00 WIB ditangani oleh satu orang operator. Pelanggan umumnya mengirim dokumen melalui WhatsApp atau media penyimpanan fisik, sementara pencatatan daftar tarif resmi belum terdokumentasi secara terstruktur, urutan antrean masih dikelola secara manual/fleksibel, dan berkas pelanggan menumpuk di komputer kasir hingga komputer melambat baru dihapus. Kondisi tersebut menimbulkan risiko kesalahan spesifikasi cetak saat jam ramai (Senin–Kamis), ketidakpastian estimasi biaya bagi pelanggan, serta kekhawatiran terhadap privasi dan kerahasiaan dokumen pelanggan. 

Proyek Rekayasa Perangkat Lunak ini merancang serta mengimplementasikan aplikasi web **PrintKilat** menggunakan metode pengembangan perangkat lunak terstruktur ( _Waterfall_ ) dan pemodelan _Unified Modeling Language_ (UML). Sistem dibangun menggunakan React 19, TypeScript, Vite 8, Tailwind CSS v4, dan Express pada lapisan antarmuka serta layanan server, sedangkan persistensi data dan autentikasi petugas diintegrasikan dengan Cloud Firestore dan Firebase Authentication. Fitur utama PrintKilat mencakup akses tamu ( _guest-first_ ) tanpa registrasi akun, unggah dokumen PDF/DOC/DOCX hingga 20 MB dengan deteksi halaman otomatis pada browser, kalkulator estimasi biaya transparan, pembayaran tunai maupun non-tunai (QR/QRIS dan transfer bank dengan unggah bukti bayar), pelacakan status berbasis kode rahasia (PK-TRKXXXXXXXX) dan QR Code, serta dashboard operator dengan kontrol transisi status berurutan, manajemen tarif, dan retensi kedaluwarsa berkas 7 hari. 

**Kata Kunci:** _PrintKilat, Antrean Cetak, Fotokopi Berbasis Web, UML, Berkah Fotocopy, Cloud Firestore, Rekayasa Perangkat Lunak._ 

# **DAFTAR ISI** 

- ABSTRAK 

- DAFTAR ISI 

- DAFTAR GAMBAR 

- DAFTAR TABEL 

- **BAB I PENDAHULUAN** 

   - 1.1 Latar Belakang 

   - 1.2 Rumusan Masalah 

   - 1.3 Tujuan dan Manfaat (1.3.1 Tujuan; 1.3.2 Manfaat) 

   - 1.4 Lokasi dan Waktu Pelaksanaan Proyek (1.4.1 Lokasi Proyek; 1.4.2 Waktu Pelaksanaan; 1.4.3 Pelaksanaan Proyek) 

- **BAB II LANDASAN TEORI** 

   - 2.1 Rekayasa Perangkat Lunak 

   - 2.2 Teori yang Berkaitan dengan Permasalahan 

   - 2.3 Konsep Sistem yang Dikembangkan 

   - 2.4 Metode Pengembangan Perangkat Lunak 

   - 2.5 Pemodelan Sistem (UML/DFD) 

   - 2.6 Tools dan Teknologi yang Digunakan 

   - 2.7 Penelitian Terdahulu 

   - 2.8 Hubungan Penelitian Terdahulu dengan Pengembangan PrintKilat 

- **BAB III METODE PENYELESAIAN PROYEK** 

   - 3.1 Identifikasi Permasalahan 

   - 3.2 Analisis Kebutuhan Sistem (3.2.1 Kebutuhan Fungsional; 3.2.2 Kebutuhan Nonfungsional) 

   - 3.3 Metode Pengembangan Sistem 

   - 3.4 Perancangan Sistem 

   - 3.5 Perancangan Alur Proses (Flowchart) 

   - 3.6 Perancangan UML/DFD 

   - 3.7 Perancangan Antarmuka (UI) 

- **BAB IV IMPLEMENTASI PROYEK DAN UJI COBA** 

   - 4.1 Implementasi Sistem 

   - 4.2 Implementasi Antarmuka 

   - 4.3 Implementasi Fitur 

   - 4.4 Dokumentasi Proses Pengerjaan 

   - 4.5 Pengujian Sistem 

   - 4.6 Hasil Pengujian 

- **BAB V PENUTUP** 

   - 5.1 Kesimpulan 

   - 5.2 Saran 

- DAFTAR PUSTAKA 

- LAMPIRAN 

   - Lampiran 1. Dokumentasi Kegiatan (Data Lapangan & Kuesioner) 

   - Lampiran 2. Dokumentasi Pengujian 

   - Lampiran 3. Dokumentasi Tambahan 

# **DAFTAR GAMBAR** 

- **Gambar 3.1** Flowchart Alur Proses Sistem PrintKilat (/public/laporan/diagrams/flowchartsistem.svg) 

- **Gambar 3.2** Use Case Diagram Sistem PrintKilat (/public/laporan/diagrams/usecasediagram.svg) 

- **Gambar 3.3** Activity Diagram Alur Pelayanan Pelanggan dan Operator PrintKilat (/public/laporan/diagrams/activity-diagram.svg) 

- **Gambar 3.4** Sequence Diagram Pembuatan Pesanan Pelanggan pada PrintKilat (/public/laporan/diagrams/sequence-pemesanan.svg) 

- **Gambar 3.5** Sequence Diagram Autentikasi dan Pemrosesan Antrean Operator (/public/laporan/diagrams/sequence-operator.svg) 

- **Gambar 3.6** Class Diagram dan Model Data Firestore PrintKilat (/public/laporan/diagrams/class-diagram.svg) 

- **Gambar 3.7** State Machine Diagram Status Pesanan PrintKilat (/public/laporan/diagrams/state-diagram.svg) 

- **Gambar 3.8** Referensi Palet Warna Oranye Energetik Antarmuka PrintKilat (/public/assets/aistudio/WhatsApp_Image_2026-11-19_at_13.01.36_3c3fc9bf.jpeg) 

# **DAFTAR TABEL** 

- **Tabel 2.1** Tools dan Teknologi Pengembangan PrintKilat 

- **Tabel 2.2** Perbandingan Penelitian Terdahulu dengan Sistem PrintKilat 

- **Tabel 3.1** Matriks Masalah Lapangan Berkah Fotocopy dan Solusi PrintKilat 

- **Tabel 3.2** Spesifikasi Kebutuhan Fungsional Sistem PrintKilat 

- **Tabel 3.3** Skenario Use Case Utama Sistem PrintKilat 

- **Tabel 4.1** Daftar Modul Kode Sumber Implementasi PrintKilat 

- **Tabel 4.2** Hasil Pengujian Unit Logika Inti (src/shared/printLogic.test.ts) 

- **Tabel 4.3** Hasil Pengujian Fungsional Black-Box dan Keamanan Sistem 

# **BAB I PENDAHULUAN** 

## **1.1 Latar Belakang** 

Kebutuhan pencetakan dokumen akademik seperti makalah, laporan praktikum, modul kuliah, hingga proposal dan skripsi di kawasan pendidikan merupakan aktivitas rutin yang berlangsung setiap hari. Pada jam-jam sibuk tertentu maupun menjelang tenggat pengumpulan tugas, gerai fotokopi sering mengalami penumpukan antrean fisik pelanggan yang menunggu giliran menyerahkan dokumen kepada petugas. 

Berdasarkan observasi dan wawancara lapangan pada tanggal **19 November 2026** terhadap pemilik usaha **Berkah Fotocopy** , Bapak Jefri, di Desa Reuleut Timu, Kecamatan Muara Batu, proses pelayanan saat ini masih berjalan secara konvensional dengan satu orang operator yang mengelola seluruh operasional mulai pukul **07.00 WIB hingga 17.00 WIB** . Lonjakan pelanggan umumnya terjadi pada hari **Senin hingga Kamis** . Pelanggan datang langsung membawa berkas atau mengirimkannya melalui WhatsApp maupun media penyimpanan fisik, kemudian operator menanyakan spesifikasi cetakan secara lisan sebelum memproses dokumen tersebut. 

Mekanisme konvensional tersebut menimbulkan sejumlah permasalahan operasional yang nyata: 

1. Berkas yang dikirim melalui WhatsApp berisiko tertumpuk, tidak dapat dibuka, atau bermasalah pada format dokumen sehingga operator harus memeriksa ulang. 

2. Ketika kondisi gerai ramai, pernah terjadi kesalahan pesanan terkait ukuran kertas, jumlah rangkap, maupun pilihan warna. 

3. Gerai belum memiliki pendataan daftar harga resmi yang terdokumentasi secara terbuka, melainkan mengikuti ketentuan pemilik dan kesepakatan untuk pesanan jumlah banyak (dengan acuan tarif dasar cetak sekitar **Rp500 per lembar** dan jilid skripsi sekitar **Rp20.000** ). 

4. File pelanggan yang tersimpan di komputer kasir hanya dihapus semua apabila komputer sudah mulai melambat, sehingga menimbulkan risiko terhadap privasi dan kerahasiaan dokumen pelanggan. 

5. Pembayaran non-tunai melalui QRIS masih memerlukan pengecekan bukti transaksi secara manual oleh operator. 

Untuk menjawab permasalahan tersebut sekaligus memenuhi masukan narasumber agar sistem tetap sederhana dan mudah dipahami, dikembangkanlah sistem aplikasi web **PrintKilat** . 

## **1.2 Rumusan Masalah** 

1. Bagaimana merancang sistem antrean cetak dan pengiriman berkas fotokopi berbasis web yang sederhana sehingga dapat menggantikan pencatatan manual dan pengiriman file yang tertumpuk di WhatsApp? 

2. Bagaimana menyediakan mekanisme estimasi biaya otomatis, manajemen tarif resmi, dan verifikasi pembayaran (tunai, QR/QRIS, dan transfer bank) yang transparan bagi pelanggan maupun operator tunggal di gerai? 

3. Bagaimana menjamin keamanan serta privasi berkas dokumen dan kontak pelanggan agar tidak dapat diakses oleh pihak yang tidak berkepentingan serta memiliki batas waktu retensi penyimpanan? 

## **1.3 Tujuan dan Manfaat** 

### **_1.3.1 Tujuan_** 

1. Membangun aplikasi web **PrintKilat** yang memfasilitasi pemesanan cetak dokumen (PDF, DOC, DOCX) oleh pelanggan tanpa login ( _guest-first_ ) dan pengelolaan antrean terpusat oleh operator fotokopi. 

2. Menyediakan fitur deteksi halaman PDF otomatis, kalkulasi estimasi biaya secara langsung sebelum pesanan dikirim, nomor antrean harian terurut (PK-YYYYMMDD-NNN), serta pelacakan status berbasis kode rahasia dan QR Code. 

3. Mengimplementasikan kontrol akses berbasis peran ( _Role-Based Access Control_ ) dan pemisahan koleksi sensitif pada Cloud Firestore sehingga berkas dokumen, bukti pembayaran, dan nomor WhatsApp pelanggan hanya dapat diakses oleh operator terautentikasi. 

### **_1.3.2 Manfaat_** 

- **Bagi Pelanggan (Mahasiswa & Masyarakat):** Mengurangi waktu tunggu fisik di gerai, memberikan kepastian estimasi harga sebelum dokumen dicetak, dan memantau progres secara mandiri. 

- **Bagi Pemilik Usaha / Operator Fotokopi:** Mengurangi kesalahan spesifikasi cetak pada hari sibuk (Senin–Kamis), menstandarkan daftar tarif resmi, serta mempermudah verifikasi pembayaran non-tunai. 

- **Bagi Akademisi / Pengembang RPL:** Menjadi rujukan arsitektur web modern React + TypeScript + Cloud Firestore dengan pemodelan UML berbasis studi kasus nyata. 

## **1.4 Lokasi dan Waktu Pelaksanaan Proyek** 

### **_1.4.1 Lokasi Proyek_** 

Pengumpulan data kebutuhan lapangan dilaksanakan pada usaha jasa fotokopi **Berkah Fotocopy** yang beralamat di **Desa Reuleut Timu, Kecamatan Muara Batu** . 

### **_1.4.2 Waktu Pelaksanaan_** 

Wawancara lapangan bersama pemilik usaha dilaksanakan pada **19 November 2026** , sedangkan tahapan analisis, pemodelan UML, implementasi sistem, integrasi Firestore, dan pengujian dilakukan pada **November 2026** . 

### **_1.4.3 Pelaksanaan Proyek_** 

Pelaksanaan mencakup lima tahap: penyusunan pedoman wawancara & kuesioner, wawancara pemilik Berkah Fotocopy, analisis kebutuhan & perancangan UML, implementasi antarmuka React + aturan keamanan Firestore, serta pengujian unit dan _black-box_ . 

# **BAB II LANDASAN TEORI** 

## **2.1 Rekayasa Perangkat Lunak** 

Rekayasa Perangkat Lunak ( _Software Engineering_ ) adalah pendekatan sistematis dan terukur dalam merancang, membangun, menguji, serta memelihara perangkat lunak agar memenuhi kebutuhan fungsional, keandalan, keamanan, dan kemudahan pemeliharaan (Sommerville, 2016; Pressman & Maxim, 2020). 

## **2.2 Teori yang Berkaitan dengan Permasalahan** 

Layanan gerai fotokopi dengan satu operator merupakan sistem antrean pelayan tunggal ( _singleserver queue_ ). Penerimaan berkas lintas media (tatap muka, WhatsApp, flashdisk) tanpa antrean terstruktur menimbulkan risiko kesalahan spesifikasi, antrean tidak teratur, serta lemahnya prinsip privasi ( _least privilege_ ) ketika berkas menumpuk di komputer kasir. 

## **2.3 Konsep Sistem yang Dikembangkan** 

PrintKilat menerapkan arsitektur **Guest-First Web Print Queue** dengan pemisahan dua portal: 

- **Portal Pelanggan (Tamu):** Mengakses daftar tarif, mengunggah dokumen cetak, melihat kalkulasi biaya, dan melacak progres melalui kode rahasia PK-TRK-XXXXXXXX atau QR Code tanpa membuat akun. 

- **Portal Operator Gerai:** Terproteksi Google Auth (Firebase Authentication) untuk memproses antrean, mengunduh berkas, memverifikasi pembayaran, serta mengelola tarif dan rekening/QRIS gerai. 

## **2.4 Metode Pengembangan Perangkat Lunak** 

Sistem dikembangkan dengan model **Waterfall** termodifikasi melalui tahapan berurutan: analisis kebutuhan lapangan, perancangan arsitektur & UML, implementasi modul terpisah ( _pure domain logic_ + UI + rules), verifikasi unit & _black-box_ , serta kesiapan operasional. 

## **2.5 Pemodelan Sistem (UML/DFD)** 

Pemodelan sistem menggunakan lima diagram **UML** ( _Use Case Diagram_ , _Activity Diagram_ , _Sequence Diagram_ , _Class Diagram_ , dan _State Machine Diagram_ ) bersama _Flowchart_ proses bisnis (Booch, Rumbaugh, & Jacobson, 2005). 

## **2.6 Tools dan Teknologi yang Digunakan** 

**Tabel 2.1 Tools dan Teknologi Pengembangan PrintKilat** 

|**Komponen**|**Teknologi / Versi**|**Peran dalam Sistem**<br>**PrintKilat**|
|---|---|---|
|Antarmuka Web|React 19 + TypeScript|Komponen UI reaktif dengan<br>pengecekan tipe statis.|
|Build & Styling|Vite 8 + Tailwind CSS v4|Bundling cepat & desain<br>responsif bertema Oranye<br>Energetik.|
|Pemrosesan Dokumen|pdf-lib + qrcode|Deteksi jumlah halaman PDF<br>otomatis di browser & QR<br>Code struk/gerai.|
|Basis Data & Auth|Cloud Firestore + Firebase<br>Auth|Penyimpanan pesanan, tarif,<br>pengaturan bayar, chunk<br>berkas, dan login Google<br>operator.|
|Server Runtime|Node.js 22 + Express|Penyajian aplikasi pada port<br>3000 dan utilitas /api/health.|
|Pengujian & Keamanan|node:test + ESLint Security<br>Rules|Verifikasi 11 unit test logika<br>inti dan audit firestore.rules.|



## **2.7 Penelitian Terdahulu** 

**Tabel 2.2 Perbandingan Penelitian Terdahulu dengan Sistem PrintKilat** 

|**Aspek Pembanding**|**Sistem Konvensional /**<br>**Referensi Umum**|**Sistem PrintKilat**<br>**(Dikembangkan)**|
|---|---|---|
|Akses Pelanggan|Wajib registrasi akun atau kirim<br>via WhatsApp.|_Guest-first_tanpa login, cukup<br>kode lacak unik atau scan QR.|
|Perhitungan Harga|Dihitung manual setelah selesai<br>cetak.|Deteksi halaman PDF otomatis<br>+ kalkulasi estimasi real-time.|
|Privasi Dokumen|Menumpuk di PC kasir hingga<br>lambat baru dihapus.|Subkoleksi Firestore khusus<br>operator + kedaluwarsa retensi|



|**Aspek Pembanding**|**Sistem Konvensional /**|**Sistem PrintKilat**|
|---|---|---|
||**Referensi Umum**|**(Dikembangkan)**<br>7 hari.|
|Pembayaran Non-Tunai|Pengecekan manual layar HP di<br>kasir.|QRIS statis/rekening gerai +<br>unggah bukti bayar wajib untuk<br>non-tunai.|



## **2.8 Hubungan Penelitian Terdahulu dengan Pengembangan PrintKilat** 

PrintKilat menjembatani kesenjangan antara sistem pemesanan cetak daring yang kompleks dan kondisi riil UMKM fotokopi seperti Berkah Fotocopy dengan menghilangkan hambatan login pelanggan, memisahkan PII ke private/contact, serta menyediakan panel tarif dan QRIS dinamis bagi operator tunggal. 

# **BAB III METODE PENYELESAIAN PROYEK** 

## **3.1 Identifikasi Permasalahan** 

**Tabel 3.1 Matriks Masalah Lapangan Berkah Fotocopy dan Solusi PrintKilat** 

|**Temuan Lapangan**|**Dampak Operasional Saat Ini **|**Solusi pada Sistem PrintKilat**|
|---|---|---|
|**(Wawancara Pak Jefri, 19**<br>**Nov 2026)**|||
|1 operator melayani pukul|Operator kewalahan mencatat|Formulir mandiri pelanggan +|
|07.00–17.00 WIB; ramai Senin<br>–Kamis.|spesifikasi lisan dan mengatur<br>antrean.|ringkasan status antrean real-<br>time.|
|File dikirim via|Pesan tertumpuk dan operator|Validasi ekstensi|
|WhatsApp/media penyimpanan;<br>kendala file tidak bisa<br>dibuka/format.|<br>harus memeriksa ulang berkas.|(PDF/DOC/DOCX) dan ukuran<br>maks. 20 MB sebelum kirim.|
|Kesalahan ukuran kertas,<br>rangkap, atau warna saat ramai.|Cetak ulang dan waktu tunggu<br>bertambah.|Pilihan terstruktur (jenis cetak,<br>A4/F4, warna, halaman,<br>rangkap, jilid, catatan).|
|Belum ada daftar harga tertulis<br>resmi (acuan ±Rp500/lbr, jilid<br>±Rp20.000).|Pelanggan tidak tahu biaya<br>awal sebelum memesan.|Halaman Daftar Harga + kelola<br>tarif operator + kalkulasi total<br>otomatis.|
|File dihapus semua hanya saat<br>komputer melambat.|Risiko privasi dokumen<br>pelanggan dan komputer penuh.|Subkoleksi fileChunks khusus<br>operator dengan retensi 7 hari.|
|Pembayaran tunai & QRIS<br>dicek manual.|Rawan terlewat saat jam ramai.|Pengaturan QRIS statis & bank<br>+ unggah bukti bayar + tombol<br>_Tandai Lunas_.|



## **3.2 Analisis Kebutuhan Sistem** 

### **_3.2.1 Kebutuhan Fungsional_** 

**Tabel 3.2 Spesifikasi Kebutuhan Fungsional Sistem PrintKilat** 

|**Kode**|**Aktor**|**Deskripsi Kebutuhan**<br>**Fungsional**|
|---|---|---|
|KF-01|Pelanggan|Masuk ke portal pelanggan<br>tanpa daftar akun (_guest-first_)<br>atau scan QR gerai.|
|KF-02|Pelanggan|Melihat daftar tarif cetak dan<br>jilid resmi berstatus aktif.|
|KF-03|Pelanggan|Mengunggah<br>dokumen<br>PDF/DOC/DOCX (maks. 20<br>MB) dengan deteksi halaman<br>PDF otomatis.|
|KF-04|Pelanggan|Melihat estimasi biaya otomatis<br>sesuai tarif cetak dan jilid yang<br>dipilih.|
|KF-05|Pelanggan|Memilih metode bayar Tunai,<br>QR/QRIS, atau Transfer Bank<br>dan melampirkan bukti bayar<br>untuk non-tunai.|
|KF-06|Pelanggan|Menerima nomor antrean harian<br>(PK-YYYYMMDD-NNN),<br>kode<br>rahasia<br>(PK-TRK-<br>XXXXXXXX), dan QR Code<br>pelacakan.|
|KF-07|Operator|Login aman menggunakan akun<br>Google yang terdaftar sebagai<br>admin/operator.|
|KF-08|Operator|Memfilter dan mencari antrean,<br>membaca kontak privat, serta<br>mengunduh dokumen asli.|



|**Kode**|**Aktor**|**Deskripsi Kebutuhan**<br>**Fungsional**|
|---|---|---|
|KF-09|Operator|Meninjau bukti bayar non-tunai<br>dan menandai pembayaran lunas<br>(paid).|
|KF-10|Operator|Memajukan status pesanan<br>secara berurutan atau menolak<br>pesanan dengan alasan wajib (≥<br>3 karakter).|
|KF-11|Operator|Mengelola daftar tarif layanan<br>dan mengatur QRIS statis serta<br>rekening bank gerai.|



### **_3.2.2 Kebutuhan Nonfungsional_** 

- **Keamanan & Privasi:** Proteksi firestore.rules memblokir list seluruh pesanan oleh publik, mengisolasi kontak pelanggan di private/contact, dan membatasi pengunduhan berkas hanya untuk operator terverifikasi. 

- **Kinerja & Kapasitas:** Berkas hingga 20 MB dipecah deterministik ke dalam maksimal 60 chunk (450 KB raw/chunk). 

- **Kegunaan (** **_Usability_ ):** Antarmuka responsif mobile dan desktop dengan navigasi sederhana. 

## **3.3 Metode Pengembangan Sistem** 

Pengembangan mencakup fase _Requirement Discovery_ , _System & Security Modeling_ , _Incremental Implementation_ , _Automated & Manual Verification_ , dan _Deployment Readiness_ . 

## **3.4 Perancangan Sistem** 

PrintKilat berjalan sebagai _Single Page Application_ (SPA) React + TypeScript yang dilayani Express/Vite pada port 3000 dengan integrasi langsung ke Cloud Firestore (PrintKilat-74f383d3d6d2-43ac-89d9-556ca64ef087) dan Firebase Authentication. 

## **3.5 Perancangan Alur Proses (Flowchart)** 

#### **FLOWCHART ALUR PROSES SISTEM PRINTKILAT** 



<!-- Start of picture text -->
Alur Pemesanan Pelanggan, Verifikasi Pembayaran, dan Pemrosesan Antrean Operator<br>Mulai<br>Akses Portal Masuk<br>(QR Gerai / URL PrintKilat)<br>Pelanggan (Tamu) Pilih Peran Operator Gerai<br>Pengguna?<br>Unggah Dokumen & Spesifikasi Login Google Auth (Operator)<br>PDF/DOC/DOCX (maks. 20 MB), Kertas, Jilid Validasi email admin / koleksi operators<br>Deteksi Halaman & Estimasi Biaya Lihat Dashboard Antrean & Detail<br>(Tarif Cetak x Hlm x Rangkap) + Jilid Unduh file cetak & cek bukti bayar<br>Ya Metode Bayar Tidak (Tunai) Ya Berkas & Order Tidak<br>QR / Transfer? Dapat Diproses?<br>Unggah Bukti Bayar<br>Tolak Pesanan (Rejected)<br>Status: pending_verification Catat alasan penolakan<br>Proses Cetak & Verifikasi Bayar<br>Simpan Order & Chunk File ke Firestore Confirmed -> Printing -> Ready + Lunas<br>Terbit PK-YYYYMMDD-NNN & PK-TRK-...<br>Tampilkan Struk QR & Lacak Status Serahkan Hasil & Tandai Selesai<br>Pelanggan memantau progres via kode unik Status: Completed (Masuk Riwayat)<br>Selesai<br><!-- End of picture text -->

_Gambar 3.1 Flowchart Alur Proses Sistem PrintKilat_ 

## **3.6 Perancangan UML/DFD** 

### **_A. Use Case Diagram_** 



<!-- Start of picture text -->
USE CASE DIAGRAM SISTEM PRINTKILAT<br>Pemodelan Interaksi Aktor Pelanggan (Tamu) dan Operator Fotokopi Berbasis Web<br>Sistem Web PrintKilat (Gerai Fotokopi)<br>Lihat Daftar Tarif Layanan<br>(Cetak A4/F4 & Opsi Jilid)<br>Hitung Estimasi Biaya<br>& Deteksi Halaman PDF<br>Buat Pesanan Cetak<br>(Unggah File & Pilih Spesifikasi)<br>Unggah Bukti Bayar<br>(Saat Pilih QR / Transfer)<br>Lacak Status Pesanan<br>(Kode PK-TRK-... / Scan QR)<br>Pelanggan<br>(Akses Tamu / Tanpa Login) Login Akun Google Operator<br>Akses QR Gerai PrintKilat (Autentikasi Firebase Auth)<br>(Unduh / Scan Pintasan)<br>Kelola Antrean & Detail Order<br>Unduh Dokumen Cetak (Filter Status, Cari, Riwayat)<br>(Rekonstruksi Chunk Firestore)<br>Ubah Status & Tolak Order<br>(State Machine + Alasan Tolak)<br>Kelola Tarif Layanan Operator Gerai<br>(Tambah / Ubah / Nonaktif)<br>(Google Auth Terverifikasi)<br>Verifikasi Pembayaran<br>(Tinjau Bukti & Tandai Lunas)<br>Atur Pembayaran Gerai<br>(QRIS Statis & Rekening Bank)<br><!-- End of picture text -->

_Gambar 3.2 Use Case Diagram Sistem PrintKilat_ 

### **_B. Activity Diagram_** 

#### **ACTIVITY DIAGRAM PROSES LAYANAN CETAK PRINTKILAT** 



<!-- Start of picture text -->
Swimlane Pelanggan, Sistem PrintKilat (Client + Firestore), dan Operator Fotokopi<br><!-- End of picture text -->



<!-- Start of picture text -->
Pelanggan (Tamu) Sistem PrintKilat (Firestore) Operator Fotokopi<br>Pilih "Lanjut sebagai Tamu"<br>Buka form Buat Pesanan<br>Unggah Berkas & Isi Spesifikasi Deteksi Halaman & Hitung Biaya<br>PDF/DOC/DOCX, tarif cetak, jilid, rangkap pdf-lib + calculateOrderTotal()<br>Pilih Metode Pembayaran<br>Tunai di tempat / Bayar QR / Transfer<br>[Ya] [Tunai]<br>Non-Tunai?<br>Unggah Bukti Pembayaran Generate Antrean & Kode Lacak<br>Kompresi & validasi gambar PK-YYYYMMDD-NNN + PK-TRK-...<br>Simpan Order + File Chunks ke Firestore<br>Terima Struk & QR Pelacakan Tampilkan di Antrean Operator Login Google & Buka Antrean<br>Pantau progres lewat PK-TRK-... Status awal: Menunggu Konfirmasi Cek spesifikasi, unduh file & bukti bayar<br>Verifikasi Bayar & Proses Cetak<br>Tandai Lunas -> Dikonfirmasi -> Dicetak<br>Datang & Ambil Hasil Cetak Perbarui Status Pelacakan Ubah Status ke "Siap Diambil"<br>Sebutkan nomor antrean di gerai Tampil "Siap Diambil" di laman Lacak Simpan log perubahan ke Firestore<br>Tandai Pesanan "Selesai"<br>Arsipkan ke Riwayat & retensi 7 hari<br><!-- End of picture text -->

_Gambar 3.3 Activity Diagram Alur Pelayanan Pelanggan dan Operator PrintKilat_ 

### **_C. Sequence Diagram_** 



<!-- Start of picture text -->
SEQUENCE DIAGRAM PEMBUATAN PESANAN PELANGGAN<br>Proses Validasi Berkas, Kalkulasi Tarif, Transaksi Antrean, dan Chunking Firestore<br>:CreateOrderView :api.ts / printLogic :Cloud Firestore<br>(React UI + pdf-lib) (Validasi & Chunker) (counters, orders, chunks)<br>Pelanggan<br>1: Pilih berkas (PDF/DOC/DOCX)<br>2: detectPdfPagesInBrowser()<br>3: Isi spesifikasi, metode bayar & kirim<br>4: createOrder(input)<br>5: validateUploadMeta & calculateOrderTotal<br>6: runTransaction(counters/{dateKey})<br>7: queueNumber (PK-YYYYMMDD-NNN)<br>opt [metode == 'qr' || 'transfer']<br>8: writeBatch: orders/{code}/proof/main<br>9: writeBatch: orders/{code} & private/contact<br>loop [batch per 4 chunk (450 KB/chunk)]<br>10: writeBatch: fileChunks/chunk_00i<br>11: ACK commit chunk<br>12: OrderDetail (trackingCode + queueNumber)<br>13: Tampilkan struk, kode rahasia & QR Code<br><!-- End of picture text -->

_Gambar 3.4 Sequence Diagram Pembuatan Pesanan Pelanggan pada PrintKilat_ 

#### **SEQUENCE DIAGRAM AUTENTIKASI & PROSES ANTREAN OPERATOR** 



<!-- Start of picture text -->
Verifikasi Akun Google Operator, Pengunduhan Berkas, Konfirmasi Lunas, dan Transisi Status<br><!-- End of picture text -->



<!-- Start of picture text -->
:OperatorPortal :Firebase Auth :Cloud Firestore<br>(Entry & OrderDetail UI) (Google OAuth + Rules) (orders, proof, fileChunks)<br>Operator Gerai<br>1: Klik "Masuk dengan Google"<br>2: signInWithPopup(googleAuthProvider)<br>3: UserCredential (emailVerified, uid)<br>4: resolveOperatorFromFirebaseUser()<br>5: fetchOperatorOrders() [orderBy createdAt desc]<br>6: Daftar pesanan + kontak privat<br>7: Pilih pesanan & klik "Unduh file"<br>8: getDocs(fileChunks orderBy chunkIndex asc)<br>9: Rakit Blob & unduh dokumen asli<br>opt [pembayaran belum lunas]<br>10: Klik "Tandai lunas"<br>11: updateDoc(payment.status = 'paid', verifiedAt)<br>12: Ubah status (mis. Dikonfirmasi -> Dicetak -> Siap Diambil)<br>13: Validasi canTransitionStatus() & updateDoc(status, statusLogs)<br>14: OrderDetail terbaru<br>15: Tampilkan badge status & ringkasan antrean terbaru<br><!-- End of picture text -->

_Gambar 3.5 Sequence Diagram Autentikasi dan Pemrosesan Antrean Operator_ 

### **_D. Class Diagram & State Machine Diagram_** 

**CLASS DIAGRAM & MODEL DATA FIRESTORE PRINTKILAT** 



<!-- Start of picture text -->
Struktur Entitas Bisnis, Relasi Subkoleksi Firestore, dan Komposisi Objek Pesanan<br>ServiceTariff Order (orders/{trackingCode}) DailyCounter<br>+ id: string + trackingCode: string (PK) 0..* 1 + dateKey: string (YYYYMMDD)<br>+ name: string + queueNumber: string + lastSeq: number<br>+ category: 'cetak' | 'jilid' 1..2 0..* + customerName: string + updatedAt: Timestamp<br>+ paperSize: 'A4' | 'F4' | null + status: OrderStatus<br>+ colorMode: 'BW' | 'Color' | null + rejectionReason: string | null + formatQueueNumber(): string<br>+ price: number + notes: string | null<br>+ isActive: boolean + totalAmount: number<br>+ item: OrderItem<br>+ slugifyTariffId(name): string + file: OrderFileMeta OperatorAccount<br>+ payment: OrderPayment<br>+ statusLogs: OrderStatusLog[] 0..* 1 + uid: string<br>+ createdAt / fileExpiresAt: Date + email: string<br>+ name: string<br>OrderPrivateContact 1 + calculateOrderTotal(): Pricing+ canTransitionStatus(): boolean + role: 'operator' | 'owner'+ createdAt: Timestamp<br>+ docId: 'contact'<br>1<br>+ customerPhone: string | null<br>+ createdAt: Timestamp 1<br>PaymentSettings<br>+ qrEnabled: boolean<br>1..60 + qrLabel: string<br>+ qrImageBase64: string | null<br>OrderFileChunk + bankEnabled: boolean<br>OrderPaymentProof<br>+ bankName: string<br>+ proofId: 'main'+ originalName: string+ mimeType: string+ dataBase64: string 0..1 + chunkId: string (chunk_00i)+ chunkIndex: number (0..59)+ dataBase64: string (<=750KB)+ createdAt: Timestamp + bankAccountNumber: string+ bankAccountHolder: string+ paymentNote: string | null+ updatedAt: Timestamp<br>+ updatedAt: Timestamp + calculateChunkCount(): int<br><!-- End of picture text -->

_Gambar 3.6 Class Diagram dan Model Data Firestore PrintKilat_ 



<!-- Start of picture text -->
STATE MACHINE DIAGRAM STATUS PESANAN PRINTKILAT<br>Validasi Transisi Status oleh canTransitionStatus() dan Firestore Rules<br>pending konfirmasi confirmed cetak printing selesai cetak ready ambil completed<br>Menunggu Konfirmasi Dikonfirmasi Sedang Dicetak Siap Diambil Selesai<br>tolak [alasan]<br>tolak [alasan] rejected tolak [alasan]<br>Ditolak (wajib alasan >= 3 kar.)<br><!-- End of picture text -->

_Gambar 3.7 State Machine Diagram Status Pesanan PrintKilat_ 

## **3.7 Perancangan Antarmuka (UI)** 

Antarmuka mengadopsi palet warna **Oranye Energetik** (#F97316, #FB923C, #FBBF24, #FDE68A, #FEFBE8, dan #111827) dengan tipografi _Plus Jakarta Sans_ serta _JetBrains Mono_ untuk nominal harga, kode antrean, dan kode pelacakan. 



<!-- Start of picture text -->
ST<br>05 J@ Sejak Kode<br>nerge I F97316 FB923C FBBF24 FDE68A FEFBES 111827<br>Membangun kesan Cocok untuk:<br>semangat, hangat, Edukasi UMKM Food Komunitas<br>dan mudah diingat.<br>Ly<br>f<br><!-- End of picture text -->

# **BAB IV IMPLEMENTASI PROYEK DAN UJI COBA** 

## **4.1 Implementasi Sistem** 

**Tabel 4.1 Daftar Modul Kode Sumber Implementasi PrintKilat** 

|**Lokasi Berkas**|**Tanggung Jawab Fungsional**|
|---|---|
|src/shared/printLogic.ts|Logika perhitungan biaya, generator PK-TRK-...,<br>penomoran antrean, validasi upload, chunking,<br>dan mesin status.|
|src/lib/firebase.ts|Inisialisasi<br>Firebase<br>App,<br>Firestore,<br>GoogleAuthProvider, dan konfigurasi koneksi<br>database.|
|src/utils/api.ts|Operasi CRUD Firestore, transaksi counter<br>harian, unggah chunk berkas, kompresi bukti<br>bayar, dan autentikasi operator.|
|src/components/*.tsx|Seluruh<br>komponen<br>UI<br>Pelanggan<br>(EntryPortalView,<br>CustomerHomeView,<br>CreateOrderView,<br>CustomerTrackView,<br>CustomerPriceAndHistoryView) dan Operator<br>(OperatorPortal,<br>OperatorOrderDetailView,<br>OperatorTariffManagerView,<br>OperatorPaymentSettingsView).|
|firestore.rules & firebase-blueprint.json|Aturan keamanan Firestore dan spesifikasi skema<br>koleksi.|
|server.ts & vite.config.ts|Server Express port 3000 dengan middleware<br>Vite dan penyajian laporan statis /laporan.|



## **4.2 Implementasi Antarmuka** 

Pelanggan mengakses rute /, /tamu, /tamu/pesan, /tamu/lacak, dan /tamu/tarif tanpa login, sedangkan operator diarahkan ke /operator/antrean setelah login Google berhasil. 

## **4.3 Implementasi Fitur** 

Meliputi deteksi halaman PDF otomatis via pdf-lib, chunking berkas 450 KB/chunk melalui transaksi dan batch write Firestore, unggah bukti bayar terkompresi untuk QR/Transfer, serta transisi status 

berurutan dengan validasi alasan penolakan. 

## **4.4 Dokumentasi Proses Pengerjaan** 

Pengerjaan mencakup studi lapangan (19 November 2026), pembangunan logika domain beserta unit test, penyusunan skema & rules Firestore, implementasi antarmuka React, serta konfigurasi domain otorisasi Firebase Auth dan proxy Vite. 

## **4.5 Pengujian Sistem** 

Pengujian dilakukan dengan unit test (npm test), kompilasi produksi (vite build), pengecekan tipe TypeScript (tsc --noEmit), audit aturan keamanan (npx eslint firestore.rules), dan verifikasi server. 

## **4.6 Hasil Pengujian** 

- **Pengujian Unit (src/shared/printLogic.test.ts): 11/11 skenario LULUS** (perhitungan biaya, validasi input, format Rupiah, nomor antrean, generator PK-TRK-..., state machine status, pemetaan stepper, validasi tipe & ukuran upload 20 MB, batas 60 chunk, slugify ID tarif, dan validasi bukti pembayaran QR/Transfer). 

- **Build, Tipe Statis, & Keamanan:** tsc --noEmit (0 galat), vite build (berhasil), npx eslint firestore.rules (0 galat). 

# **BAB V PENUTUP** 

## **5.1 Kesimpulan** 

1. Aplikasi web **PrintKilat** berhasil dibangun sesuai kebutuhan lapangan **Berkah Fotocopy** dengan konsep _guest-first_ untuk pelanggan dan dashboard terproteksi Google Auth untuk operator tunggal. 

2. Permasalahan antrean, penumpukan berkas di WhatsApp, kesalahan spesifikasi cetak, ketiadaan daftar tarif resmi, verifikasi bukti QRIS manual, dan retensi file di komputer kasir telah terjawab oleh fitur sistem. 

3. Pengujian unit (11/11 lulus), pemeriksaan tipe statis, audit aturan keamanan Firestore, dan pengujian antarmuka membuktikan sistem siap dioperasikan. 

## **5.2 Saran** 

1. Menyebarkan instrumen kuesioner mahasiswa (Bagian II dokumen lapangan) kepada pelanggan setelah uji coba langsung di Berkah Fotocopy untuk evaluasi UAT/SUS kuantitatif. 

2. Menambahkan notifikasi WhatsApp otomatis saat status menjadi _Siap Diambil_ serta diskon/tarif grosir untuk pemesanan jumlah banyak. 

3. Menambahkan _Cloud Scheduler / Cloud Functions_ untuk pembersihan otomatis subkoleksi fileChunks yang telah melewati batas retensi 7 hari. 

# **DAFTAR PUSTAKA** 

1. Booch, G., Rumbaugh, J., & Jacobson, I. (2005). _The Unified Modeling Language User Guide_ (2nd ed.). Boston: Addison-Wesley Professional. 

2. Firebase Documentation. (2026). _Cloud Firestore Security Rules & Firebase Authentication_ . Diakses dari https://firebase.google.com/docs 

3. Pressman, R. S., & Maxim, B. R. (2020). _Software Engineering: A Practitioner's Approach_ (9th ed.). New York: McGraw-Hill Education. 

4. React Team. (2026). _React Documentation — Describing the UI & Managing State_ . Diakses dari https://react.dev 

5. Sommerville, I. (2016). _Software Engineering_ (10th ed.). Harlow: Pearson Education. 

6. Wawancara Lapangan. (2026). _Pedoman Wawancara dan Kuesioner Proyek PrintKilat: Narasumber Pak Jefri (Pemilik Usaha Berkah Fotocopy)_ . Desa Reuleut Timu, Kecamatan Muara Batu, 19 November 2026. 

# **LAMPIRAN** 

## **Lampiran 1. Dokumentasi Kegiatan (Data Lapangan & Kuesioner)** 

- **Usaha / Narasumber:** Berkah Fotocopy — Pak Jefri (Pemilik / Operator Utama), 19 November 2026, Desa Reuleut Timu, Kec. Muara Batu. 

- **Operasional:** 07.00–17.00 WIB, 1 operator, ramai Senin–Kamis, menerima PDF via WhatsApp/media penyimpanan, acuan tarif Rp500/lembar & jilid skripsi ±Rp20.000, bayar tunai/QRIS, retensi file lama dihapus saat komputer melambat. 

- **Kuesioner Mahasiswa:** 11 butir pertanyaan siap edar (Identitas Prodi/Semester, Kebiasaan cetak, Kendala & lama antre, Kebutuhan & penilaian fitur PrintKilat). 

## **Lampiran 2. Dokumentasi Pengujian** 

- Eksekusi npm test menghasilkan tests 11 | pass 11 | fail 0. 

## **Lampiran 3. Dokumentasi Tambahan** 

- Ringkasan koleksi Cloud Firestore: /tariffs/{tariffId}, /settings/payment, 

   - /counters/{dateKey}, /orders/{trackingCode} beserta subkoleksi terisolasi private/contact, fileChunks/{chunkId}, dan proof/main. 

