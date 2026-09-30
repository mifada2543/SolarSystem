# Solar System Explorer

Visualisasi 3D tata surya interaktif yang berjalan sepenuhnya di peramban — tanpa build step,
tanpa backend, dan **100% offline**: three.js, tekstur, CSS, semuanya dilayani dari folder
proyek sehingga tidak ada satu pun permintaan ke luar. Dibangun dengan **three.js 0.186.1**
dan `WebGPURenderer` (otomatis mundur ke WebGL2 bila WebGPU tidak tersedia), seluruh
antarmuka berbahasa Indonesia.

![Tampilan desktop](docs/tampilan-desktop.png)

## Fitur

- **100% offline** — three.js 0.186.1 ikut disertakan di `assets/lib/` (tanpa CDN),
  bersama tekstur, data, CSS, dan seluruh modul. Tidak ada satu pun permintaan ke luar,
  jadi aplikasi tetap jalan tanpa koneksi internet.
- **Simulasi orbital Kepler** — posisi planet dihitung dari elemen orbit JPL (epoch J2000),
  bukan lingkaran hiasan. Kecepatan simulasianya dapat diatur dari `0,1×` sampai `100×`,
  dengan satuan waktu per detik (menit → tahun) dan pemilih tanggal simulasi.
- **Tiga skala visualisasi** — `Penjelajah` (ukuran & jarak sama-sama dikompres),
  `Relatif`, dan `Saintifik (≈1:1)` di mana 1 satuan dunia = 10⁶ km.
- **Peta navigasi 3D** di pojok kanan atas — scena terpisah yang dijepit ke *scissor viewport*
  pada renderer yang sama. Pusat peta tetap Matahari, sedangkan arah hadapnya mengikuti
  kamera utama. Dua tipe layout dapat dibandingkan lewat tombol `Kompresi` ↔ `Linier 1:1`,
  dan peta **membesar sendiri** saat disorot (172 → 236 px; 148 → 200 px di layar sempit).
  Klik planet untuk terbang, klik area kosong untuk menjelajah — arah pandang tetap dipertahankan.

  ![Peta membesar saat disorot](docs/peta-hover.png)
- **Kartu HUD** di pojok kanan bawah: status simulasi, tanggal, `DIFOKUSKAN KE`, `JARAK`
  (kamera → objek terfokus), `KECEPATAN` (selalu tampil, termasuk `0 km/s`), kamera, skala, renderer.
- **Panel informasi** per objek berisi data fisik, orbit, atmosfer, dan deskripsi ringkas,
  plus tombol `Jelajahi {nama}` untuk mengorbit dari dekat dan `Tutup` untuk kembali
  ke kamera sebelumnya.
- **Pencarian** dua bahasa — `earth` menemukan `Bumi`, `sun` menemukan `Matahari`.
- **Rasi bintang**, sabuk asteroid dengan ukuran titik berbasis piksel, orbit 7 bulan
  (Bulan, Io, Europa, Ganymede, Callisto, Titan, Triton) yang muncul otomatis saat induknya
  cukup dekat, lampu kota malam Bumi, atmosfer, dan bayangan cincin Saturnus.
- **Tekstur planet 2K** tersimpan lokal di `assets/textures/` dengan **cadangan prosedural otomatis** —
  bila berkas gagal dimuat, tampilan tetap utuh tanpa pesan galat.
- **Responsif** dari layar lebar sampai ponsel 400 px, serta dukungan *prefers-reduced-motion*.
- **Tanpa emoji** — seluruh antarmuka memakai kata dan simbol tipografi biasa.

![Tampilan ponsel](docs/tampilan-ponsel.png)

## Menjalankan

Modul ES tidak bisa dimuat lewat `file://` (diblokir kebijakan CORS), jadi halaman harus
dilayani lewat HTTP. Buka `index.html` — halaman itu sendiri yang akan menjelaskan bila
dibuka langsung dari berkas.

Dengan **XAMPP** (struktur asli proyek ini):

```bash
# taruh folder proyek di htdocs, lalu buka:  http://localhost/solar-system/
```

Dengan server statis apa pun:

```bash
python3 -m http.server 8000
# → http://localhost:8000/
```

Prasyarat: peramban modern yang mendukung ES modules — Chrome / Edge / Firefox / Safari
terbaru. Semua berkas dilayani dari lokal: three.js di `assets/lib/`, tekstur di
`assets/textures/`, modul di `assets/js/` — nol permintaan ke luar, sehingga aplikasi
**100% offline** selama folder ini tersedia. (Tautan kredit di panel hanya terbuka bila
diklik.)

## Kontrol

| Aksi | Cara |
|---|---|
| Mengorbit kamera | seret dengan kursor |
| Zoom | gulir roda — sambil **otomatis memfokuskan** planet di bawah kursor |
| Fokus ke objek + panel info | klik planet / Bulan, atau pilih dari hasil pencarian |
| Jelajahi dari dekat | di panel info, klik `Jelajahi {nama}` |
| Bingkai ulang objek terpilih | tombol `Fokus ke Objek` |
| Terbang lewat peta | klik planet di peta, atau klik area kosong |
| Cari objek | `/` atau kotak pencarian di atas |

**Pintasan papan ketik**

| Tombol | Fungsi |
|---|---|
| `Spasi` | jeda / lanjut |
| `1`–`8` | 8 planet |
| `9` | Bulan |
| `0` | Matahari |
| `Esc` | tutup panel info, bila tertutup kembali ke tampilan seluruh |
| `/` | fokus ke pencarian |

## Struktur proyek

```
README.md              halaman ini
index.html             markup + importmap + pemeriksaan protokol (file:// → penjelasan)
assets/css/style.css   seluruh CSS, termasuk peta & media query ≤860px
assets/js/state.js     state + util dasar         ─┐ dua modul tanpa impor lokal —
assets/js/data.js      data planet (murni)        ─┘ dasar pencegahan circular import
assets/js/core.js      tekstur prosedural
assets/js/shaders.js   TSL: atmosfer, lampu kota, bayangan cincin
assets/js/textures.js  pemuat tekstur 2K (gagal-aman → prosedural)
assets/js/bodies.js    renderer, scene, kamera, pembuatan objek
assets/js/orbits.js    Kepler, mode skala, sabuk, rasi, simulasi
assets/js/navigate.js  kamera, pick, hover, scroll-zoom, kartu HUD
assets/js/ui.js        panel info, kontrol, pencarian, HUD, audio
assets/js/minimap.js   peta navigasi 3D (scissor viewport)
assets/js/main.js      init() + loop()
assets/lib/            three.js 0.186.1 lokal — core, webgpu, tsl, OrbitControls (tanpa CDN)
assets/textures/       19 berkas 2K (jpg/png) + ATTRIBUTION.txt (CC BY 4.0)
docs/                  tangkapan layar untuk README
Todo.md                catatan pengembangan: pekerjaan selesai, terbuka, constraint
```

Arah impor selalu ke bawah menuju `state.js` / `data.js`; keduanya tidak mengimpor modul
lokal apa pun sehingga siklus impor tidak mungkin terjadi.

## Skala visualisasi

Ukuran planet dan jarak orbit **tidak** digambar sesuai kenyataan — kalau iya, Bumi akan
setitik dan Neptunus tak akan pernah terlihat. Tiga mode tersedia:

| Mode | Ukuran planet | Jarak orbit |
|---|---|---|
| 0 · Penjelajah | `(d/12756)^0,42` | `14·√(d/149,6)` |
| 1 · Relatif | `0,4·√(d/12756)` | `d/149,6·10` |
| 2 · Saintifik (≈1:1) | `d/2·10⁶` (1 satuan = 10⁶ km) | `d` (linear) |

Catatan serupa tampil di kartu HUD: *SKALA VISUALISASI · … · simulasi kira-kira*.

## Data & atribusi

- **Fisik planet** — [NASA Planetary Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/)
- **Elemen orbit** — JPL *Approximate Positions of the Planets* (Standish), epoch J2000
- **Planet kerdil** (Ceres, Eris, Haumea, Makemake) — JPL Small-Body Database
- **Tekstur planet** — [Solar System Scope — Textures](https://www.solarsystemscope.com/textures/),
  **CC BY 4.0** (sebagian besar berbasis citra NASA). Daftar berkas, termasuk konversi
  `.tif` → `.png`, tercatat di [`assets/textures/ATTRIBUTION.txt`](assets/textures/ATTRIBUTION.txt);
  kredit juga tampil di dalam aplikasi (`#ctl`). **Jangan hapus berkas ini** —
  atribusi adalah syarat lisensinya.

## Catatan pengembangan

- **Jangan ubah urutan pemanggilan `rnd()`** di `init()`. Seed-nya dibagikan antara tekstur
  planet, sabuk asteroid, dan warna bintang, sehingga mengubah urutan akan mengubah seluruh
  tampilan. `assets/js/textures.js` mematuhi aturan ini: `texFor()` tetap dipanggil lebih dulu seperti
  semula, gambarnya baru ditukar asinkron.
- Semua garis wajib `THREE.Line` — `WebGPURenderer` tidak mendukung `LineLoop`.
- Shader kustom wajib TSL (`colorNode` / `opacityNode` / `emissiveNode`); `ShaderMaterial`
  tidak terdaftar di `StandardNodeLibrary`.
- `canvas{inset:0}` berlaku untuk semua canvas termasuk `#map`, jadi `left`/`bottom` wajib
  di-reset.
- three.js dipinjam lokal di `assets/lib/`, bukan lewat CDN. Untuk memperbarui: unduh
  `build/three.core.js`, `build/three.webgpu.min.js`, `build/three.tsl.min.js`, dan
  `examples/jsm/controls/OrbitControls.js` dari `https://cdn.jsdelivr.net/npm/three@<versi>/`,
  timpa ke `assets/lib/`, lalu sesuaikan importmap di `index.html` (daftar berkasnya juga
  tertulis sebagai komentar di sana).

## Lisensi

Tekstur planet berlisensi **CC BY 4.0** (lihat [assets/textures/ATTRIBUTION.txt](assets/textures/ATTRIBUTION.txt)).
Data bersumber dari NASA/JPL (domain publik).
