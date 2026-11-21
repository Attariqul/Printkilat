# PrintKilat

**Sistem antrean cetak dan pengiriman dokumen berbasis web** untuk layanan fotokopi dan percetakan, dikembangkan sebagai proyek Rekayasa Perangkat Lunak dengan studi kasus Berkah Fotocopy.

PrintKilat memungkinkan pelanggan memesan cetakan tanpa membuat akun, mengunggah dokumen, melihat estimasi biaya, memilih metode pembayaran, dan melacak pesanan. Operator mengelola antrean melalui portal yang terlindungi autentikasi Google.

## Fitur Utama

### Portal pelanggan (guest-first)
- Pemesanan tanpa registrasi akun.
- Unggah file PDF, DOC, dan DOCX (maksimum 20 MB).
- Deteksi jumlah halaman PDF otomatis di browser.
- Pilihan spesifikasi cetak dan kalkulasi estimasi biaya.
- Metode pembayaran tunai, QR/QRIS, atau transfer bank; bukti pembayaran diperlukan untuk pembayaran non-tunai.
- Nomor antrean harian (`PK-YYYYMMDD-NNN`), kode pelacakan rahasia (`PK-TRK-XXXXXXXX`), dan QR Code.
- Pelacakan status pesanan tanpa login.

### Portal operator
- Login menggunakan Google melalui Firebase Authentication.
- Dashboard antrean, pencarian/filter, dan detail pesanan.
- Akses kontak privat, dokumen, dan bukti pembayaran untuk operator terverifikasi.
- Verifikasi pembayaran dan pengelolaan status pesanan.
- Penolakan pesanan dengan alasan.
- Pengelolaan tarif dan pengaturan pembayaran gerai (QRIS/rekening bank).

## Alur Status Pesanan
`pending` → `confirmed` → `printing` → `ready` → `completed`

Pesanan dapat ditolak (`rejected`) dengan alasan penolakan yang wajib dicantumkan.

## Teknologi

| Komponen | Teknologi |
|---|---|
| Frontend | React 19, TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 |
| Server | Node.js 22, Express |
| Database | Cloud Firestore |
| Autentikasi operator | Firebase Authentication (Google) |
| Pemrosesan PDF | pdf-lib |
| QR Code | qrcode |
| Pengujian | node:test |
| Keamanan | Firestore Security Rules, ESLint |

## Arsitektur Ringkas
- Aplikasi Single Page Application (SPA) React + TypeScript.
- Express/Vite menyediakan aplikasi pada port 3000.
- Integrasi Firestore dan Firebase Authentication.
- Berkas pelanggan disimpan dalam chunk terpisah; ukuran chunk nominal 450 KB dan dibatasi hingga 60 chunk.
- Data kontak pelanggan disimpan di area privat, terpisah dari data pesanan yang dapat diakses melalui kode pelacakan.
- Retensi berkas pesanan dirancang selama 7 hari.

## Instalasi dan Menjalankan secara Lokal

> Pastikan Node.js versi yang sesuai (Node.js 22) dan npm telah terpasang.

1. Clone repository:
   ```bash
   git clone https://github.com/Attariqul/Printkilat.git
   cd Printkilat
   ```
2. Instal dependensi:
   ```bash
   npm install
   ```
3. Konfigurasikan Firebase sesuai konfigurasi proyek dan instruksi pada source code. Jangan commit kredensial, private key, atau data pelanggan ke repository.
4. Jalankan aplikasi (gunakan script yang tersedia pada `package.json`):
   ```bash
   npm run dev
   ```

Jika script pengembangan pada repository menggunakan perintah berbeda, ikuti script yang tercantum di `package.json`.

## Pengujian dan Validasi

Perintah yang digunakan dalam verifikasi proyek:

```bash
npm test
npx tsc --noEmit
npm run build
npx eslint firestore.rules
```

Hasil pengujian yang dicatat dalam laporan proyek:
- Unit test logika inti: **11/11 skenario lulus**.
- TypeScript: **0 galat**.
- Build produksi: **berhasil**.
- Audit Firestore Rules dengan ESLint: **0 galat**.

## Keamanan dan Privasi
- Pelanggan tidak perlu login untuk memesan atau melacak pesanan.
- Portal operator memerlukan autentikasi dan otorisasi operator.
- Firestore Rules membatasi akses terhadap pesanan, kontak, bukti pembayaran, dan file.
- Dokumen dan kontak pelanggan merupakan data sensitif: jangan gunakan data nyata dalam demo, issue, atau commit publik.
- Retensi file dirancang 7 hari; pastikan mekanisme penghapusan otomatis benar-benar dikonfigurasi pada deployment.

## Struktur Modul (ringkasan)

| Path | Tanggung jawab |
|---|---|
| `src/shared/printLogic.ts` | Logika tarif, validasi unggahan, kode pelacakan, chunking, dan transisi status |
| `src/lib/firebase.ts` | Inisialisasi Firebase, Firestore, dan autentikasi |
| `src/utils/api.ts` | Operasi Firestore, antrean, unggah chunk, pembayaran, dan autentikasi operator |
| `src/components/` | Antarmuka pelanggan dan operator |
| `firestore.rules` | Aturan keamanan database |
| `server.ts`, `vite.config.ts` | Server Express/Vite dan konfigurasi aplikasi |

## Konteks Proyek

Proyek ini dirancang berdasarkan studi lapangan pada Berkah Fotocopy, Desa Reuleut Timu, Kecamatan Muara Batu, pada November 2026. Sistem ditujukan untuk membantu pengelolaan antrean, mengurangi kesalahan spesifikasi, menyediakan estimasi biaya yang transparan, serta meningkatkan pengelolaan privasi dokumen.

## Status

Proyek akademik Rekayasa Perangkat Lunak — implementasi dan pengujian tercatat dalam laporan proyek.

---

**Catatan:** README ini merupakan ringkasan dokumentasi proyek. Detail implementasi, konfigurasi deployment, dan status fitur aktual merujuk pada source code repository.
