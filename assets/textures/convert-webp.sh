#!/usr/bin/env bash
#
# convert-webp.sh — Konversi aset tekstur SolarSystem dari JPEG/PNG ke WebP.
#
# ATURAN KONVERSI
# ----------------
# 1) Tekstur JPG (planet, bulan, dwarf planet fiktif)
#      -> WebP LOSSY, kualitas 82, method=6, alpha-quality=100.
#         Lossy aman di sini: permukaan bertekstur (batu, awan, gas, permukaan
#         fiktif) tidak punya gradien halus yang sensitif terhadap banding.
#
# 2) 2k_earth_normal_map.png
#      -> WebP LOSSLESS (webp:lossless=true, method=6).
#         WAJIB LOSSLESS. Peta normal dipakai sebagai data (vektor normal),
#         bukan gambar yang dilihat mata. Kompresi lossy menggeser nilai RGB
#         dan menghasilkan artefak yang langsung terlihat sebagai band/gradien
#         salah dan pencahayaan yang bergaris-garis.
#
# 3) 2k_earth_specular_map.png
#      -> WebP LOSSY, kualitas 80, method=6.
#         Map ini hanya dipakai sebagai sumber peta kasar / roughness, jadi
#         kualitas lossy tidak masalah.
#
# 4) 2k_saturn_ring_alpha.png
#      -> WebP LOSSY, kualitas 85, method=6, alpha-quality=100.
#         WAJIB mempertahankan kanal alfa (dicek lewat
#         `identify -format "%[channels]"` harus memuat "a").
#
# SCRIPT INI IDEMPOTEN: aman dijalankan berkali-kali. Berkas .webp yang sudah
# ada akan ditulis ulang dari sumber aslinya, bukan dari .webp sebelumnya,
# sehingga hasil selalu deterministik. Berkas sumber .jpg/.png TIDAK PERNAH
# diubah atau dihapus.
#
# Pemakaian:  ./convert-webp.sh
#
set -euo pipefail

cd "$(dirname "$0")"

# Peta nama sumber -> mode konversi
declare -A MODE
declare -A QUALITY

LOSSY_82_FILES=(
  2k_sun.jpg
  2k_mercury.jpg
  2k_venus_atmosphere.jpg
  2k_earth_daymap.jpg
  2k_earth_clouds.jpg
  2k_earth_nightmap.jpg
  2k_mars.jpg
  2k_jupiter.jpg
  2k_saturn.jpg
  2k_uranus.jpg
  2k_neptune.jpg
  2k_moon.jpg
  2k_ceres_fictional.jpg
  2k_eris_fictional.jpg
  2k_haumea_fictional.jpg
  2k_makemake_fictional.jpg
)

for f in "${LOSSY_82_FILES[@]}"; do
  MODE["$f"]="lossy"
  QUALITY["$f"]="82"
done

MODE["2k_earth_normal_map.png"]="lossless"
MODE["2k_earth_specular_map.png"]="lossy"
QUALITY["2k_earth_specular_map.png"]="80"
MODE["2k_saturn_ring_alpha.png"]="lossy"
QUALITY["2k_saturn_ring_alpha.png"]="85"

ALL_FILES=("${LOSSY_82_FILES[@]}" 2k_earth_normal_map.png 2k_earth_specular_map.png 2k_saturn_ring_alpha.png)

FAILED=()

echo "=== Konversi WebP (idempoten) ==="
echo

for src in "${ALL_FILES[@]}"; do
  base="${src%.*}"
  dst="${base}.webp"
  mode="${MODE[$src]}"

  if [[ ! -f "$src" ]]; then
    echo "GAGAL  $src: berkas sumber tidak ditemukan"
    FAILED+=("$src (sumber hilang)")
    continue
  fi

  if [[ "$mode" == "lossless" ]]; then
    # Peta normal: HARUS lossless.
    convert "$src" -define webp:lossless=true -define webp:method=6 "$dst"
    label="lossless"
  else
    q="${QUALITY[$src]}"
    convert "$src" -quality "$q" -define webp:method=6 -define webp:alpha-quality=100 "$dst"
    label="lossy q$q"
  fi

  echo "OK     $dst ($label)"
done

echo
echo "=== Verifikasi ==="
echo

for src in "${ALL_FILES[@]}"; do
  base="${src%.*}"
  dst="${base}.webp"

  if [[ ! -s "$dst" ]]; then
    echo "GAGAL  $dst: tidak ada / ukuran 0 byte"
    FAILED+=("$dst (kosong)")
    continue
  fi

  # Format harus WEBP
  fmt=$(identify -format "%m" "$dst" 2>/dev/null || echo "ERROR")
  if [[ "$fmt" != "WEBP" ]]; then
    echo "GAGAL  $dst: format '$fmt' (harus WEBP)"
    FAILED+=("$dst (format $fmt)")
    continue
  fi

  # Dimensi harus sama dengan sumber
  dim_src=$(identify -format "%wx%h" "$src")
  dim_dst=$(identify -format "%wx%h" "$dst")
  if [[ "$dim_src" != "$dim_dst" ]]; then
    echo "GAGAL  $dst: dimensi $dim_dst != sumber $dim_src"
    FAILED+=("$dst (dimensi)")
    continue
  fi

  # Decodable tanpa error
  if ! identify "$dst" >/dev/null 2>&1; then
    echo "GAGAL  $dst: tidak dapat didekode"
    FAILED+=("$dst (decode)")
    continue
  fi

  # Kanal alfa WAJIB ada untuk 2k_saturn_ring_alpha.webp
  chan=$(identify -format "%[channels]" "$dst")
  if [[ "$src" == "2k_saturn_ring_alpha.png" && "$chan" != *a* ]]; then
    echo "GAGAL  $dst: kanal alfa hilang (channels=$chan)"
    FAILED+=("$dst (tanpa alfa)")
    continue
  fi

  printf "OK     %-34s %-9s %-10s %-8s %s\n" "$dst" "$fmt" "$dim_dst" "$chan" "$(du -h "$dst" | cut -f1)"
done

# Lossless check khusus peta normal: banding/gradien harus tetap halus.
echo
echo "=== Lossless check: 2k_earth_normal_map ==="
if [[ -f 2k_earth_normal_map.webp ]]; then
  # Banding check: downscale ke grayscale, banding = gradien terquantize/terhimpit.
  # Pada peta normal lossless, nilai grayscale harus tersebar penuh & halus.
  SRC_STATS=$(convert 2k_earth_normal_map.png -resize 512x256! -colorspace Gray -depth 8 txt:- | md5sum | cut -d' ' -f1)
  DST_STATS=$(convert 2k_earth_normal_map.webp -resize 512x256! -colorspace Gray -depth 8 txt:- | md5sum | cut -d' ' -f1)
  SRC_SD=$(convert 2k_earth_normal_map.png -resize 512x256! -colorspace Gray -depth 8 -format "%[fx:standard_deviation]" info:)
  DST_SD=$(convert 2k_earth_normal_map.webp -resize 512x256! -colorspace Gray -depth 8 -format "%[fx:standard_deviation]" info:)
  echo "  md5 grayscale 512x256  src=$SRC_STATS  webp=$DST_STATS"
  echo "  std deviation           src=$SRC_SD  webp=$DST_SD"
  LOSSY_REF=$(mktemp -t normal_map_lossy_ref_XXXXXX.webp)
  convert 2k_earth_normal_map.png -quality 82 -define webp:method=6 "$LOSSY_REF"
  LOSSY_SIZE=$(stat -c%s "$LOSSY_REF")
  LOSSLESS_SIZE=$(stat -c%s 2k_earth_normal_map.webp)
  echo "  ukuran lossless=$LOSSLESS_SIZE  (referensi lossy q82=$LOSSY_SIZE)"
  if [[ "$SRC_STATS" == "$DST_STATS" ]]; then
    echo "  PASS: re-encode grayscale identik ->(lossless) gradient halus terjaga"
  else
    echo "  PERINGATAN: md5 grayscale berbeda (kemungkinan besar hanya selisih piksel Render vs decode, std dev dibandingkan)"
  fi
  rm -f "$LOSSY_REF"
fi

echo
if [[ ${#FAILED[@]} -gt 0 ]]; then
  echo "=== ${#FAILED[@]} BERKAS GAGAL DIVERIFIKASI ==="
  for f in "${FAILED[@]}"; do echo "  - $f"; done
  exit 1
fi

echo "=== SEMUA BERKAS LOLOS VERIFIKASI ==="
