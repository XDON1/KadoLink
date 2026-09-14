<div align="center">

# KadoLink

<p>
  <img src="https://img.shields.io/badge/Status-v1.0%20(Stable)-brightgreen?style=for-the-badge" alt="Status" />
  <a href="https://github.com/XDON1/KadoLink/stargazers">
    <img src="https://img.shields.io/github/stars/XDON1/KadoLink?style=for-the-badge&color=8A2BE2" alt="Stars" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License" />
  </a>
</p>

<p>
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" alt="JavaScript" />
</p>

<p>
  <a href="https://kado-link.vercel.app">kado-link.vercel.app</a>
</p>

</div>

---

Website statis untuk membuat tautan ucapan digital yang personal. 
tulis pesan, pilih tema, bagikan tautannya. 
Tanpa backend, tanpa akun, tanpa database.

---

## ✨ Fitur

### Editor
- **Live preview** — teks yang kamu ketik langsung muncul di pratinjau.
- **8 tema** — Romantic, Birthday, Cute, Sunset, Ocean, Forest, Elegant, Midnight.
- **Foto** — tempel URL foto (dari galeri HP via [PhotoToURL](https://phototourl.com/id)).
- **Musik** — dukung **MP3 langsung** (via [MP3ToURL](https://www.mp3tourl.com/)) **atau YouTube** (paste link YouTube/Shorts/Music).
- **Tautan portable** — data di-encode ke URL hash (base64url), jadi tautan bisa dibuka di perangkat mana pun tanpa server.

### Halaman hasil
- **Kartu ucapan** dengan animasi masuk halus + confetti sesuai tema.
- **Pemutar musik**:
  - MP3 → tombol play/pause dengan equalizer animasi.
  - YouTube → pill now-playing dengan judul lagu auto-fetch dari YouTube + marquee kalau judul kepanjangan.
- **Share menu** — native share sheet di mobile, panel 6 opsi di desktop
  (WhatsApp, Telegram, X, Facebook, Email, Salin tautan).
- **Copy link 3-tier fallback** — Clipboard API → `execCommand` → modal manual.
- **Footer** dengan brand, GitHub, dan copyright.

### Kualitas
- **Responsif** — mobile-first, nyaman di HP & desktop.
- **Aksesibel** — `aria-*` lengkap, fokus terlihat, dukungan `prefers-reduced-motion`.
- **WCAG AA** — semua 8 tema lulus kontras minimal AA (judul AAA).
- **Nol dependensi** — murni HTML + CSS + JS. Tidak ada build step, tidak ada npm.

---

## 🚀 Cara pakai

1. Buka `index.html` → klik **Buat KadoLink**.
2. Isi:
   - **Untuk siapa** (nama penerima)
   - **Dari siapa** (namamu)
   - **Tulis ucapan** (pesan)
   - **URL foto** (opsional)
   - **Musik** (opsional — MP3 atau YouTube)
3. Pilih salah satu dari **8 tema**.
4. Klik **Buat KadoLink** → diarahkan ke halaman hasil.
5. Klik **Bagikan** → pilih WhatsApp / Telegram / X / FB / Email, atau **Salin tautan**.

Penerima cukup membuka tautan di browser — tidak perlu install apa pun.

---

## 🧠 Cara kerja

```
index.html
   ↓ klik "Buat KadoLink"
create.html
   ↓ isi form + live preview + pilih tema + musik
   ↓ submit
js/create.js
   ↓ encode data → base64url → taruh di URL hash
ucapan.html#d=eyJ2IjoxLCJyIjoiR0FET1QiLC...
   ↓
js/ucapan.js
   ↓ baca hash → decode → render kartu + foto + musik + confetti
🎁 Kartu jadi
```

### Format data (v1)

Data di-encode sebagai JSON ringkas untuk menghemat panjang URL:

```json
{
  "v": 1,
  "r": "nama penerima",
  "s": "nama pengirim",
  "m": "pesan",
  "t": "romantic | birthday | cute | sunset | ocean | forest | elegant | midnight",
  "p": "https://... (foto, opsional)",
  "a": "https://... (MP3 atau YouTube, opsional)",
  "g": []
}
```

| Field | Isi | Catatan |
|-------|-----|---------|
| `v`   | Versi skema | Untuk evolusi format |
| `r`   | Recipient | Nama penerima |
| `s`   | Sender | Nama pengirim |
| `m`   | Message | Isi ucapan |
| `t`   | Theme | Salah satu dari 8 tema |
| `p`   | Photo URL | Opsional (Fase 4) |
| `a`   | Audio URL | MP3 **atau** YouTube (Fase 4c) |
| `g`   | Gallery URLs | Disiapkan untuk fitur galeri (belum aktif) |

### Sumber data di `ucapan.html`

`js/ucapan.js` membaca data dengan urutan prioritas:

1. **URL hash** (`#d=...`) — sumber utama, portable lintas perangkat.
2. **`localStorage`** (key `kadoLinkData`) — fallback untuk reload di perangkat yang sama.

Kalau data dari `localStorage`, URL otomatis dilengkapi hash via
`history.replaceState()` — supaya tombol **Bagikan** selalu menghasilkan
tautan yang portable.

Kalau keduanya kosong atau rusak → redirect ke `create.html`.

### Deteksi musik

`js/create.js` dan `js/ucapan.js` mendeteksi tipe URL audio otomatis:

- Regex YouTube → **YouTube pill**
- Ekstensi audio (`.mp3`, `.m4a`, dll) → **MP3 player**
- YouTube didukung via **IFrame API** + judul via **oEmbed API** (gratis, tanpa key)

---

## 📁 Struktur proyek

```
KadoLink/
├── index.html               # Landing page
├── create.html              # Editor (form + 8 tema + live preview)
├── ucapan.html              # Halaman hasil
│
├── css/
│   ├── global.css           # Token, reset, aura background
│   ├── index.css            # Landing page
│   ├── create.css           # Editor (form + 8 tema + preview)
│   └── ucapan.css           # Halaman hasil (kartu + animasi + confetti + share)
│
├── js/
│   ├── create.js            # Live preview, encode, submit
│   └── ucapan.js            # Decode, render, musik, share, confetti
│
├── themes/                  # Kosong — untuk tema lanjutan (Fase 6+)
├── assets/
│   ├── images/              # Kosong — untuk foto default, ikon, OG image
│   └── music/               # Kosong — untuk musik lokal (opsional)
│
├── LICENSE
└── README.md
```

---

## 💻 Menjalankan secara lokal

Project ini murni statis. Buka `index.html` di browser **bisa langsung jalan**.

**Tapi disarankan pakai local server**, karena:

- `navigator.clipboard` butuh secure context (`https://` atau `localhost`)
- `navigator.share` (native share sheet) butuh HTTPS/localhost
- YouTube IFrame API kadang rewel di `file://`
- Beberapa browser membatasi `localStorage` di `file://`

### Opsi 1 — VSCode Live Server (paling gampang)

1. Buka VSCode → Extensions (`Ctrl+Shift+X`)
2. Cari **"Live Server"** (Ritwick Dey) → Install
3. Klik kanan `index.html` → **"Open with Live Server"**
4. Browser otomatis buka `http://127.0.0.1:5500/index.html`

### Opsi 2 — Python

```bash
cd KadoLink
python -m http.server 8000
```

Buka `http://localhost:8000`.

### Opsi 3 — Node.js

```bash
cd KadoLink
npx serve
```

Buka URL yang muncul (biasanya `http://localhost:3000`).

---

## 🔒 Privasi & batasan

- **Data terlihat di URL.** Siapa pun yang punya tautan bisa membaca isi ucapan
  (base64url mudah di-decode). Cocok untuk ucapan personal biasa, **bukan**
  untuk informasi sensitif seperti password atau data pribadi.
- **Batas panjang URL** sekitar 2000 karakter (standar browser). Cukup untuk
  teks + 1 foto + 1 link musik. Kalau nanti ditambah galeri banyak foto,
  harus migrasi ke backend.
- **Tidak ada backend.** Tidak ada analytics, tracking, cookie, atau akun.
- **Foto & musik dari URL eksternal.** KadoLink tidak menyimpan file apa pun.
  Kalau host foto/musik tutup, konten akan hilang.
- **YouTube embed** bisa gagal untuk video yang dibatasi (privat, embed
  disabled, region-locked). Itu batasan YouTube, bukan bug KadoLink.

---

## 🗺️ Roadmap

- [x] **Fase 1** — Fondasi (struktur, editor, live preview)
- [x] **Fase 2** — Alur utama (index → create → ucapan)
- [x] **Fase 3** — Polish (animasi, confetti, microinteraction)
- [x] **Fase 3.5** — Tautan portable (URL hash base64url)
- [x] **Fase 4** — Foto + musik (MP3 & YouTube)
- [x] **Fase 5** — Share menu (native + custom panel)
- [ ] **Fase 6** — Production prep (favicon, OG meta, PWA manifest)
- [ ] **Fase 7** — Galeri foto (multiple foto)
- [ ] **Fase 8** — Backend opsional (short link, akun, analytics)

---

## 🤝 Kontribusi

Project ini personal, tapi issue & PR tetap welcome.

1. Fork repo
2. Buat branch baru (`git checkout -b fitur-baru`)
3. Commit perubahan (`git commit -m 'Tambah fitur X'`)
4. Push (`git push origin fitur-baru`)
5. Buka Pull Request

---

## 📜 Lisensi

Lihat file [LICENSE](LICENSE).

---

## 🙏 Kredit

- Font: [DM Sans](https://fonts.google.com/specimen/DM+Sans) & [Playfair Display](https://fonts.google.com/specimen/Playfair+Display)
- Upload gambar: [PhotoToURL](https://phototourl.com/id)
- Upload audio: [MP3ToURL](https://www.mp3tourl.com/)

---

**Dibuat dengan ❤ oleh [XDON1](https://github.com/XDON1)**