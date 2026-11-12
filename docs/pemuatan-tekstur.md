# Pemuatan Tekstur

Dokumen teknis tentang mekanisme pemuatan citra planet di **Solar System
Explorer** — antrean prioritas, batas permintaan bersamaan, failover format, dan
alasan berkas pendukung (awan Bumi, peta malam/normal/spekulasi, cincin Saturnus)
harus dijadwalkan **bersamaan** dengan citra induknya.

Implementasinya ada di `assets/js/textures.js` (antrean & unduhan),
`assets/js/state.js` (`TEXPROG`, pencatat progres), dan `assets/js/ui.js`
(penampil `TEKSTUR n/19` di kartu HUD).

---

## Ringkasan

| Hal | Nilai |
|---|---|
| Total berkas citra nyata | **19** (14 citra tubuh + 5 citra pendukung) |
| Indikator HUD | `TEKSTUR n/19` |
| Permintaan bersamaan | maksimum **4** |
| Prioritas | berdasarkan **dampak visual**, bukan urutan daftar |
| Kegagalan | gagal-aman → tekstur prosedural, tanpa pesan galat |
| Format | WebP (utama) → JPG/PNG (cadangan) → prosedural (darurat) |

Rincian jumlah berkasnya:

- **14 citra tubuh** — Matahari, 8 planet, Bulan, 4 planet kerdil
  (Ceres, Eris, Haumea, Makemake).
- **5 citra pendukung** — awan Bumi, peta malam Bumi, peta normal Bumi, peta
  spekulasi Bumi, cincin Saturnus.

---

## Daftar prioritas unduhan

Angka terkecil = paling dulu. Urutan ini berlaku persis di `textures.js` (peta
`PRIO`).

| # | Berkas | Untuk | Alasan prioritas |
|---|---|---|---|
| 1 | `2k_sun` | Matahari | selalu di layar, sumber utama pencahayaan |
| 2 | `2k_earth_daymap` | Bumi (siang) | siluet planet yang paling sering dilihat |
| 3 | `2k_earth_clouds` | Awan Bumi | sangat terlihat, dan placeholder proseduralnya paling merusak |
| 4 | `2k_jupiter` | Jupiter | raksasa gas paling mudah dikenali |
| 5 | `2k_saturn` | Saturnus | ciri khas cincin yang melekat |
| 6 | `2k_mars` | Mars | |
| 7 | `2k_venus_atmosphere` | Venus (awan) | |
| 8 | `2k_mercury` | Merkurius | |
| 9 | `2k_uranus` | Uranus | |
| 10 | `2k_neptune` | Neptunus | |
| 11 | `2k_moon` | Bulan | |
| 12 | `2k_earth_nightmap` | Bumi (malam / lampu kota) | terlihat hanya pada sisi malam |
| 13 | `2k_earth_normal_map` | Bumi (relief / tonjolan) | |
| 14 | `2k_ceres_fictional` | Ceres | |
| 15 | `2k_eris_fictional` | Eris | |
| 16 | `2k_haumea_fictional` | Haumea | |
| 17 | `2k_makemake_fictional` | Makemake | |
| 18 | `2k_earth_specular_map` | Bumi (peta kasar) | pengaruhnya paling halus |
| 19 | `2k_saturn_ring_alpha` | Cincin Saturnus | baru berarti setelah Saturnus terpasang |

---

## Batas 4 permintaan bersamaan

Antrean (`Q`) menjaga **maksimal 4 permintaan aktif** pada satu waktu
(`MAXC = 4` di `textures.js`). Alasannya:

- Batas koneksi per origin di peramban umumnya **6**; dengan 4 slot, proyek ini
  menyisakan ruang untuk permintaan lain (three.js, `index.html`, aset repo).
- Jaringan lambat tidak menumpuk permintaan: berkas yang belum sempat masuk
  slot hanya menunggu di antrean, tidak ikut memborbors bandwidth.

Ketika satu permintaan selesai, `pump()` mengurutkan antrean berdasarkan
`rank` dan mengisi slot berikutnya.

Ada satu penyesuaian halus: bila satu permintaan sudah berjalan lebih dari
**45 detik** (`SLOT = 45000`), slot antreannya **dilepas** agar berkas lain bisa
masuk. **Permintaan itu sendiri tidak dibatalkan** dan hasilnya tetap dipakai
begitu tiba — jadi pelepasan slot tidak berarti berkas diabaikan.

---

## Aturan "tidak ada tenggat yang membuang berkas"

Tidak ada batas waktu yang membuat pemuat membuang berkas. **Berkas yang telat
tetap dipasang** ketika tiba, berapa pun telatnya.

- Versi lama memakai batas keras **12 detik per berkas** pada 19 permintaan
  sekaligus. Di hosting lambat hampir semua berkas melewati batas itu lalu
  **dibuang**, sehingga tampilan tertahan di tekstur prosedural 512×256 yang
  jauh lebih rendah mutunya (tampilan LOW-QUALITY).
- Sekarang `Promise` hanya di-*resolve* saat berkas benar-benar tiba. Tidak
  ada `reject` karena telat; yang di-*reject* hanyalah kegagalan unduhan
  sungguhan (berkas 404 / koneksi putus).

Konsekuensinya: kualitas tampilan membaik **bertahap** seiring waktu, tidak
pernah mundur.

---

## Pemuatan progresif

1. Adegan **tampil seketika** dengan tekstur prosedural (placeholder 512×256
   yang digambar di `core.js` / `bodies.js`). Tidak ada layar tunggu.
2. Berkas diunduh di latar belakang dan **dipasang sendiri** pada tempatnya
   begitu tiba: `material.map` diganti, penanda `needsUpdate` disetel, dan
   placeholder lama di-`dispose()`.
3. Penampil HUD menunjukkan progres: `TEKSTUR n/19` (n naik dari 0 ke 19).

Berkas yang gagal diunduh **tidak merusak apa pun**: material tetap memakai
placeholder prosedural, dan penghitung progres tetap naik (dengan keterangan
`· N gagal`) supaya indikator HUD tidak menggantung selamanya.

> Catatan: urutan pemanggilan `rnd()` di `init()` **tidak boleh diubah**.
> `texFor()` tetap dipanggil lebih dulu seperti semula, dan gambarnya ditukar
> secara asinkron setelahnya. Karena itu hamparan bintang, titik lampu kota,
> dan sabuk asteroid tetap identik piksel demi piksel.

---

## Failover WebP → JPG/PNG

Setiap citra punya dua bentuk di repo:

| Bentuk | Contoh | Ukuran | Peran |
|---|---|---|---|
| `.webp` | `2k_earth_clouds.webp` | ±376 KB | format utama, diunduh pertama |
| `.jpg` / `.png` | `2k_earth_clouds.jpg` | ±943 KB | cadangan, selalu ada di repo |

Aturan failover-nya:

1. **Peramban mendukung WebP** → coba `.webp`; bila gagal (404, koneksi putus,
   berkas rusak) → coba kandidat berikutnya, yaitu berkas asli `.jpg`/`.png`.
2. **Peramban tidak mendukung WebP** → deteksi dilakukan sekali di awal dengan
   `canvas.toDataURL('image/webp')` (pada peramban tanpa dukungan, hasilnya
   adalah data-URL PNG). Dalam hal ini berkas asli `.jpg`/`.png` langsung
   diminta, tanpa percobaan WebP sama sekali.
3. **Semua kandidat gagal** → tekstur prosedural yang dipakai (gagal-aman,
   tanpa pesan galat).

Folder `assets/textures/` dengan konversi ini turun dari ±11,5 MB menjadi
±3,7 MB; total unduhan aset situs turun dari ±13,3 MB menjadi ±5,6 MB.

---

## Kenapa berkas pendukung harus dijadwalkan bersamaan dengan citra induknya

Ini akar masalah **awan Bumi selalu tampil sebagai gumpalan bulat prosedural**
di hosting.

### Gejala yang terukur

Di domain live (<https://solarsystem.web.id/>):

| Kejadian | Detik |
|---|---|
| Peta daytime Bumi selesai diunduh | **14** |
| Berkas awan baru **diunduh** (permintaan baru dimulai) | **46** |
| Berkas awan **selesai** | **60** |

Artinya: setelah peta daytime selesai di detik ke-14, Bumi **tidak punya awan
nyata selama 46 detik** — masih tampak sebagai gumpalan bulat putih prosedural
sampai detik ke-60.

### Tiga penyebab yang bertumpuk

1. **Berkas pendukung dirantai di belakang citra induknya.** Peta malam, peta
   normal, peta spekulasi, dan awan Bumi baru dimasukkan ke antrean setelah
   peta daytime Bumi tiba. Jadi awan secara struktur *tidak mungkin* mulai
   diunduh sebelum detik ke-14 — dan antrean yang sama masih sibuk dengan
   berkas lain.
2. **Semua berkas pendukung diberi prioritas TERAKHIR.** Semuanya diberi nilai
   `rank` paling rendah, sehingga antrean selalu menunda berkas pendukung
   sampai seluruh planet selesai.
3. **Keempat berkas pendukung digabung dengan `Promise.all`.** Satu
   `Promise.all` untuk normal + malam + awan + spekulasi berarti awan baru
   dipasang setelah berkas pendukung **yang paling lambat** selesai — bukan
   setelah awan sendiri tiba. Satu berkas lambat menahan tiga berkas lain.

### Perbaikannya

- **Berkas pendukung dijadwalkan BERSAMAAN dengan citra induknya** — begitu
  jadwal untuk Bumi dibuat, awan/malam/normal/spekulasi langsung masuk antrean,
  bukan dirantai setelah citra induk tiba.
- **Prioritas dihitung berdasarkan dampak visual** — Matahari, lalu peta
  daytime Bumi, lalu **awan Bumi**, baru planet-planet lain. Awan naik ke
  urutan ke-3 justru karena sangat terlihat, dan karena selama masih berupa
  placeholder prosedural ia paling jelas merusak tampilan.
- **Tiap berkas dipasang sendiri secara independen** begitu tiba — tidak ada
  lagi `Promise.all` yang menggabungkan berkas pendukung, sehingga awan
  langsung tampil begitu berkas awan tiba, tanpa menunggu peta spekulasi.

---

## Cara memaksa berkas asli `.jpg` / `.png`

Kalau ingin memeriksa jalur cadangan, ada tiga cara.

### 1. Pakai peramban lama (tanpa mengubah kode)

Peramban yang tidak mendukung WebP akan otomatis meminta berkas asli, misalnya:

- Firefox ESR versi lama (sebelum Firefox 65).
- Safari sebelum 14 (WebP baru masuk Safari 14).
- Chrome/Edge sebelum 32.

Cara memastikan: buka DevTools → tab **Network**, muat ulang dengan
`Ctrl+Shift+R`, dan lihat nama berkas yang diminta — akan terlihat
`2k_*.jpg` / `2k_*.png`, bukan `2k_*.webp`.

### 2. Ubah sebaris kode

Di `assets/js/textures.js`, deteksi WebP ada di awal modul:

```js
const WEBP=(()=>{try{const c=document.createElement("canvas");c.width=c.height=1;
  return c.toDataURL("image/webp").indexOf("data:image/webp")===0}catch(e){return false}})();
```

Ubah menjadi:

```js
const WEBP=false;   /* paksa berkas asli .jpg/.png (untuk menguji jalur cadangan) */
```

Dengan begitu semua permintaan langsung menunjuk ke berkas asli. Cara yang lebih
halus: tukar urutan pasangan berkas pada peta `FILE`/`NIGHT`/`CLOUD`/… sehingga
`.jpg` dicoba lebih dulu dan `.webp` menjadi kandidat kedua.

### 3. Blokir `.webp` di DevTools

- Tab **Network** → klik kanan → **Block request URL** → pola `*.webp`.
- Atau pindahkan berkasnya: `mkdir -p /tmp/webp-bkp && mv
  assets/textures/*.webp /tmp/webp-bkp/` (folder `assets/textures/` memang
  memuat 19 versi `.webp`).

Lalu muat ulang dengan `Ctrl+Shift+R`; permintaan WebP akan gagal dan pemuat
otomatis turun ke berkas asli.

---

## Cara memverifikasi

- **Kartu HUD** (pojok kanan bawah): `TEKSTUR n/19` selama pemuatan. Saat
  selesai, angka mencapai 19 (atau `· N gagal` bila ada berkas yang gagal).
- **Konsol peramban**: `window.__texProg` berisi `{total, done, failed}` —
  hook diagnostik yang sengaja dibiarkan terbuka di `state.js`.
- **DevTools → Network**: urutannya mengikuti tabel prioritas di atas; cari
  `2k_earth_clouds.webp` untuk memastikan berkasnya diminta pada kelompok
  unduhan awal, bukan di akhir.

---

## Ringkasan aturan

1. Adegan tampil dulu, tekstur naik sendiri — tidak ada yang ditunggu.
2. Maksimal 4 permintaan bersamaan.
3. Tidak ada tenggat yang membuang berkas; berkas telat tetap dipasang.
4. Format utama WebP, cadangan JPG/PNG, terakhir prosedural.
5. Prioritas berdasarkan dampak visual: Matahari → peta daytime Bumi → awan
   Bumi → planet lain.
6. Berkas pendukung dijadwalkan bersama citra induknya dan dipasang
   independen — tidak dirantai dan tidak digabung `Promise.all`.
