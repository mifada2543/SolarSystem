# Cache Cloudflare untuk Solar System Explorer

Panduan singkat untuk pemilik situs **solarsystem.web.id**: kenapa cache di edge
Cloudflare penting untuk proyek ini, dan cara mengaturnya.

Domain `solarsystem.web.id` **sudah berada di belakang Cloudflare** (zona sudah
ditambahkan dan DNS-nya di-proxy). Yang belum tentu ada adalah *cache rule* untuk
aset berat — itulah yang panduan ini siapkan.

---

## Kenapa cache di edge penting di sini

- **Origin-nya GitHub Pages.** Repository statis ini dilayani dari
  `mifada2543.github.io/SolarSystem/`; Cloudflare hanya acting sebagai proxy di
  depannya.
- **GitHub Pages hanya mengirim `cache-control: max-age=14400` (4 jam)** untuk
  aset statis. Artinya setiap pengunjung baru mengunduh ulang seluruh aset dari
  origin — tidak ada yang dilayani dari cache edge.
- **Asetnya berat.** 19 citra planet 2K (±11,5 MB) plus three.js lokal
  (±2 MB), jadi kunjungan pertama menarik **±13,3 MB** yang semuanya menyentuh
  origin. Di jaringan seluler itu lambat, dan kuota repo GitHub Pages ikut
  terkuras.
- **Aset statis tidak pernah berubah** di antara dua rilis. Ini persis jenis
  berkas yang paling layak di-cache bertahun-tahun.

Dua lapis perbaikan sudah dipakai di proyek:

1. **WebP** sebagai format utama — folder `assets/textures/` turun dari ±11,5 MB
   menjadi ±3,7 MB (total aset situs ±13,3 MB → ±5,6 MB). Sudah dilakukan, tidak
   perlu tindakan di Cloudflare.
2. **Cache di edge** — aset dilayani dari POP terdekat, bukan dari origin.
   Inilah langkah yang dijelaskan di bawah.

> Cache **hanya** untuk aset statis (`/assets/textures/*` dan `/assets/lib/*`).
> Jangan pernah memberi TTL satu tahun pada `index.html` — berkas itu berubah
> setiap rilis, dan pengunjung harus melihat versi terbaru.

---

## 1. Pastikan DNS sudah di-proxy

1. Masuk ke dashboard Cloudflare → pilih zona **solarsystem.web.id**.
2. Buka **DNS → Records**.
3. Pastikan ada record `CNAME` untuk `@` (atau `www`) yang menunjuk ke
   `mifada2543.github.io`, dan kolom **Proxy status** = **Proxied** (awan
   oranye).
4. Kalau masih “DNS only”, ubah ke **Proxied**. Tanpa proxy, cache rule di
   bawah tidak berlaku.

## 2. Buat Cache Rule untuk `/assets/textures/*` dan `/assets/lib/*`

1. Dashboard → **Rules → Cache Rules → Create rule**.
2. **Rule name**: `Aset statis — tekstur & pustaka`.
3. **Expression** (mode *Edit expression*):

   ```
   (http.request.uri.path wildcard r"/assets/textures/*") or (http.request.uri.path wildcard r"/assets/lib/*")
   ```

4. **Cache eligibility**: **Eligible for cache**.
5. **Edge TTL**: pilih **Ignore cache-control header and use this TTL**, lalu
   isi **1 year** (31536000 detik). Ini menimpa `max-age=14400` milik origin.
6. **Cache key**: biarkan bawaan (mengikuti URL lengkap). Jangan pakai
   “Cache by device” — file di sini sama untuk semua perangkat.
7. Klik **Save** / **Deploy**.

Aturan ini gratis dan tersedia di semua paket Cloudflare, termasuk Free.

## 3. Kirim `Cache-Control` yang benar ke peramban

Supaya peramban juga menyimpan salinan selama setahun (dan tidak mengulang
unduhan saat pindah halaman), header yang dikirim ke peramban harus:

```
Cache-Control: public, max-age=31536000, immutable
```

Cara paling presisi — **Rules → Transform Rules → Modify Response Header →
Create rule**:

1. **Rule name**: `Cache-Control aset statis`.
2. **Expression**:

   ```
   (http.request.uri.path wildcard r"/assets/textures/*") or (http.request.uri.path wildcard r"/assets/lib/*")
   ```

3. **Modify**: **Set static header** → nama header `Cache-Control`, nilai
   `public, max-age=31536000, immutable`.
4. **Deploy**.

> Cara lebih sederhana: pada Cache Rule langkah 2, set **Browser TTL** ke
> *Ignore cache-control header and use this TTL* (1 year). Hasilnya praktis sama
> (`max-age=31536000`), hanya tanpa kata `public` dan `immutable`. Kalau memakai
> cara ini, lewati langkah 3.

## 4. Opsi tambahan (opsional, butuh paket Pro/Business)

Semua ini opsional — proyek sudah memakai WebP sendiri, jadi trio di bawah
cuma lapisan pengaman:

- **Polish** (`Cache → Polish`): aktifkan **WebP** dan **Lossless**. Cloudflare
  otomatis mengubah JPEG/PNG yang diminta menjadi WebP di edge. Berguna untuk
  aset gambar lain, atau bila ada peramban lawas yang mengambil `.jpg`.
  Berkas yang sudah `.webp` tidak dirusak oleh Polish.
- **Image Resizing** (`Rules → Transform Rules → Image Resizing`): atur
  **format = webp**, **quality = 82**, dan **fit = scale-down**. Cocok kalau
  nanti ada gambar besar (mis. screenshot di `docs/`) yang turunannya bisa lebih
  kecil. Untuk tekstur 2K planet, resize tidak perlu — ukurannya memang sudah
  pas.
- **Mirage** (`Cache → Mirage`): optimasi pemuatan HTML, HTTP/2 push, dan Split
  Cache. Berguna untuk halaman `index.html`, **bukan** untuk
  `/assets/textures/*` (yang sudah berupa berkas statis murni).

## 5. Verifikasi

```bash
curl -I https://solarsystem.web.id/assets/textures/2k_sun.webp
curl -I https://solarsystem.web.id/assets/lib/three.webgpu.min.js
```

Yang diharapkan:

- `cf-cache-status: MISS` pada permintaan pertama, lalu **`HIT`** pada
  permintaan berikutnya (berarti aset sudah tersimpan di edge).
- `cache-control: public, max-age=31536000, immutable` pada respons ke
  peramban.
- `cf-cache-status: DYNAMIC` atau `BYPASS` untuk `index.html` — halaman itu
  memang tidak boleh di-cache lama.

Periksa juga dari browser: DevTools → tab **Network** → muat ulang dengan
`Ctrl+Shift+R`, lalu lihat kolom *Size* dan header `cf-cache-status` pada
permintaan tekstur.

## 6. Saat aset diganti — jangan lupa purge

Karena header memakai `immutable` dan TTL satu tahun, berkas yang **diganti
isi** (bukan namanya) akan tetap dilayani dari cache sampai di-purge:

1. Dashboard → **Caching → Configuration → Purge Cache**.
2. Pilih **Custom Purge** lalu isi URL persis, atau pakai **Purge by prefix**
   dengan prefiks `assets/textures/` untuk membersihkan semua tekstur sekaligus.
3. Minta pengunjung melakukan hard reload (`Ctrl+Shift+R`) sekali, karena
   salinan di cache peramban juga masih tertahan.

Alternatif yang lebih bersih: **ubah nama berkasnya** (mis. `2k_sun.v2.webp`)
lalu perbarui pemuat di `assets/js/textures.js`. URL baru otomatis menjadi
cache miss, jadi tidak perlu purge sama sekali.

---

## Ringkasan

| Yang | Nilai |
|---|---|
| Origin | GitHub Pages (`mifada2543.github.io`) |
| Header origin | `cache-control: max-age=14400` (4 jam) |
| Path yang di-cache | `/assets/textures/*`, `/assets/lib/*` |
| Edge TTL | 1 tahun (31536000 detik) |
| Header ke peramban | `Cache-Control: public, max-age=31536000, immutable` |
| Cache eligibility | Eligible for cache |
| Yang tidak boleh di-cache lama | `/index.html`, `/README*.md`, halaman lain |
| Saat aset berubah | Purge by prefix `assets/textures/`, atau ubah nama berkas |
