# KadoLink

KadoLink adalah aplikasi web statis untuk membuat tautan ucapan digital yang personal. Tulis pesan, tambahkan cerita, foto, atau musik, lalu bagikan satu tautan kepada penerima. Aplikasi ini tidak membutuhkan backend, database, atau proses build.

## Demo

[Buka KadoLink](https://kadolink.vercel.app)

## Fitur

- Formulir pembuat ucapan dengan batas karakter agar pesan tetap ringkas
- Pesan utama, hingga tiga bagian cerita, quote, dan ucapan penutup
- Hingga tiga URL foto dan satu URL musik latar
- Password opsional sebelum penerima membuka ucapan
- Tampilan responsif dengan animasi dekoratif
- Tombol untuk menyalin tautan dan membuka layanan shortlink atau QR code
- Seluruh data disimpan di parameter URL, tanpa penyimpanan server

## Cara Menggunakan

1. Buka [KadoLink](https://kadolink.vercel.app), atau jalankan `index.html` secara lokal.
2. Isi nama penerima dan pesan utama. Kolom lainnya bersifat opsional.
3. Masukkan URL langsung untuk foto dan musik jika ingin menambahkan media.
4. Klik **Buat Link Ucapan**, lalu salin tautan yang dihasilkan.
5. Bagikan tautan tersebut kepada penerima.

Untuk membuat tautan lebih pendek atau kode QR, gunakan tombol bantuan yang tersedia setelah tautan dibuat.

> **Catatan privasi:** password hanya diperiksa oleh JavaScript di browser penerima. Password bukan enkripsi dan tidak cocok untuk melindungi informasi rahasia.

## Menjalankan Secara Lokal

Tidak ada instalasi dependensi yang diperlukan. Buka `index.html` langsung di browser, atau gunakan ekstensi [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) di VS Code.

Jika memakai Live Server:

1. Buka folder proyek di VS Code.
2. Klik kanan `index.html`.
3. Pilih **Open with Live Server**.

## Parameter URL

Halaman `ucapan.html` membaca data berikut dari query string:

| Parameter | Keterangan | Wajib |
| --- | --- | --- |
| `nama` | Nama penerima | Ya |
| `pesan` | Pesan utama | Ya |
| `password` | Password pembuka | Tidak |
| `cerita1`, `cerita2`, `cerita3` | Bagian cerita | Tidak |
| `quote` | Quote singkat | Tidak |
| `finalWish` | Ucapan penutup | Tidak |
| `foto1`, `foto2`, `foto3` | URL foto | Tidak |
| `musik` | URL file audio `.mp3` atau `.wav` | Tidak |

Contoh URL:

```text
ucapan.html?nama=Miyako&pesan=Selamat%20ulang%20tahun%21&quote=You%27re%20special
```

## Struktur Proyek

```text
.
├── index.html       # Formulir pembuat tautan
├── form.css         # Gaya halaman formulir
├── ucapan.html      # Halaman tampilan ucapan
├── ucapan.css       # Gaya halaman ucapan
├── LICENSE          # Lisensi MIT
└── README.md        # Dokumentasi proyek
```

## Teknologi

- HTML5
- CSS3
- JavaScript vanilla
- Google Fonts (Poppins)

## Deployment

Karena KadoLink adalah situs statis, proyek dapat di-deploy ke Vercel, GitHub Pages, Netlify, atau layanan hosting statis lainnya. Tidak diperlukan konfigurasi server khusus.

## Lisensi

Proyek ini menggunakan [lisensi MIT](LICENSE).

## Pembuat

Dibuat oleh [@XDON1](https://github.com/XDON1).
