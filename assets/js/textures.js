/* ===== TEKSTUR NYATA (progressive, gagal-aman) =====
   Seluruh berkas di folder assets/textures/ diunduh dari
   https://www.solarsystemscope.com/textures/ — lisensi Creative Commons
   Attribution 4.0 (CC BY 4.0), sebagian besar berbasis citra NASA.

   Lima hal yang sengaja dijaga:
   1. GAGAL-AMAN — bila berkas tidak ada atau gagal dimuat (mis. dibuka lewat
      file://), tekstur prosedural dari core.js tetap dipakai; start-up tidak
      pernah menunggu selamanya.
   2. URUTAN rnd() TIDAK BERUBAH — texFor() tetap dipanggil lebih dulu seperti
      semula (di bodies.js), lalu hasilnya ditukar. Sehingga keacakan hamparan
      bintang, titik kota, dan sabuk asteroid tetap identik dengan versi lama.
   3. TIDAK ADA TENGGAT YANG MEMBUANG BERKAS — versi lama memakai batas 12
      detik per berkas pada 19 permintaan sekaligus. Di jaringan lambat
      (mis. GitHub Pages) hampir semua berkas melewati batas itu lalu DIBUANG,
      sehingga tampilan tertahan di tekstur prosedural 512x256 yang jauh lebih
      rendah mutunya. Sekarang berkas yang telat tetap dipasang saat tiba.
   4. PEMUATAN PROGRESIF — antrean berprioritas, maksimal 4 permintaan
      bersamaan. Adegan langsung tampil dengan tekstur prosedural, lalu
      meningkat sendiri ke citra 2K begitu berkasnya tiba.
   5. BERKAS PENDUKUNG DIJADWALKAN BERSAMAAN DENGAN CITRA INDUKNYA — awan
      Bumi, peta malam, peta normal, peta spekulasi, dan cincin Saturnus TIDAK
      boleh menunggu citra induknya selesai. Kalau dirantai, awan Bumi baru
      turun ~46 detik setelah peta daytime (terukur: hari ini di domain live,
      peta daytime selesai di detik ke-14, awan baru selesai di detik ke-60),
      dan selama itu penampilannya gumpalan bulat prosedural — terlihat rusak. */
import * as THREE from 'three/webgpu';
import {bodies,TEXPROG} from './state.js';
import {renderer} from './bodies.js';

export const TEXDIR=new URL('../textures/',import.meta.url).href;

/* id pada data.js -> [WebP, cadangan asli].
   WebP = format utama (volume ~71% lebih kecil daripada JPEG/PNG); berkas asli
   .jpg/.png tetap ada di repo dan dipakai otomatis bila WebP tidak didukung
   atau gagal dimuat. Pluto sengaja tidak ada di daftar: Solar System Scope
   tidak menyediakan tekstur Pluto, jadi Pluto tetap memakai prosedural. */
const FILE={
  sun:['2k_sun.webp','2k_sun.jpg'],mercury:['2k_mercury.webp','2k_mercury.jpg'],
  venus:['2k_venus_atmosphere.webp','2k_venus_atmosphere.jpg'],
  earth:['2k_earth_daymap.webp','2k_earth_daymap.jpg'],mars:['2k_mars.webp','2k_mars.jpg'],
  jupiter:['2k_jupiter.webp','2k_jupiter.jpg'],saturn:['2k_saturn.webp','2k_saturn.jpg'],
  uranus:['2k_uranus.webp','2k_uranus.jpg'],neptune:['2k_neptune.webp','2k_neptune.jpg'],
  moon:['2k_moon.webp','2k_moon.jpg'],ceres:['2k_ceres_fictional.webp','2k_ceres_fictional.jpg'],
  eris:['2k_eris_fictional.webp','2k_eris_fictional.jpg'],
  haumea:['2k_haumea_fictional.webp','2k_haumea_fictional.jpg'],
  makemake:['2k_makemake_fictional.webp','2k_makemake_fictional.jpg']
};
/* pendukung Bumi + cincin Saturnus */
const NIGHT=['2k_earth_nightmap.webp','2k_earth_nightmap.jpg'],
      CLOUD=['2k_earth_clouds.webp','2k_earth_clouds.jpg'],
      NORMAL=['2k_earth_normal_map.webp','2k_earth_normal_map.png'],
      SPEC=['2k_earth_specular_map.webp','2k_earth_specular_map.png'],
      RING=['2k_saturn_ring_alpha.webp','2k_saturn_ring_alpha.png'];

/* Planet padat: peta warna dipakai lagi sebagai peta tonjolan (relief halus).
   Raksasa gas & Venus (peta awan) harus tanpa tonjolan — permukaannya bukan batuan. */
const ROCK=['mercury','mars','moon','ceres','eris','haumea','makemake'];

/* Prioritas unduhan berdasarkan DAMPAK VISUAL, bukan urutan daftar: angka kecil
   lebih dulu. Awan Bumi ada di urutan ketiga karena sangat terlihat dan karena
   saat masih berupa placeholder prosedural ia paling jelasrusak. Peta spekulasi
   (dasar peta kasar) paling akhir karena pengaruhnya subtil. */
const PRIO={
  sun:0, earth:1, 'earth.clouds':2, jupiter:3, saturn:4, mars:5, venus:6, mercury:7,
  uranus:8, neptune:9, moon:10, 'earth.night':11, 'earth.normal':12,
  ceres:13, eris:14, haumea:15, makemake:16, 'earth.spec':17, 'saturn.ring':18
};
const rankOf=id=>PRIO[id]===undefined?90:PRIO[id];

/* Deteksi dukungan WebP: canvas.toDataURL('image/webp') mengembalikan PNG
   data-URL pada peramban yang tidak mendukung WebP. */
const WEBP=(()=>{try{const c=document.createElement("canvas");c.width=c.height=1;
  return c.toDataURL("image/webp").indexOf("data:image/webp")===0}catch(e){return false}})();

const MAXC=4;      /* permintaan bersamaan — di bawah batas 6 koneksi/origin browser */
const SLOT=45000;  /* hanya melepas slot antrean; permintaan TETAP berjalan dan hasilnya dipakai */
const cache=new Map(),done=new Set(),extrasDone=new Set();
const loader=new THREE.TextureLoader();
const Q=[];let active=0;

/* Anisotropi dibatasi kemampuan GPU — nilai di atas batas maksimum dapat
   membuat sampler tidak valid pada sebagian driver. */
function aniso(){
  try{const c=renderer&&renderer.capabilities;
    if(c&&c.getMaxAnisotropy)return Math.min(8,c.getMaxAnisotropy())}catch(e){}
  return 4;
}

function pump(){
  if(active>=MAXC||!Q.length)return;
  Q.sort((a,b)=>a.rank-b.rank);
  const j=Q.shift();active++;j.run();
}

/* Muat satu berkas. Kalau gagal, otomatis mencoba kandidat berikutnya
   (mis. WebP -> JPEG). Promise resolve HANYA saat berkas benar-benar tiba —
   tidak pernah di-buang tenggat, sehingga berkas yang telat tetap terpasang. */
function fetchTex(files,srgb,rank){
  const key=files.join('|')+'|'+(srgb?1:0);
  if(cache.has(key))return cache.get(key);
  const p=new Promise((resolve,reject)=>{
    const list=WEBP?files:[files[files.length-1]];   /* tanpa WebP: langsung ke berkas asli */
    let i=0;
    Q.push({
      rank,
      run(){
        let released=false;
        const release=()=>{if(released)return;released=true;active--;pump()};
        const timer=setTimeout(release,SLOT);   /* slot dilepas; permintaan tetap hidup */
        const attempt=()=>{
          if(i>=list.length){clearTimeout(timer);release();reject(new Error("Gagal memuat "+list[0]));return}
          const file=list[i++];
          loader.load(TEXDIR+file,t=>{
            clearTimeout(timer);
            t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;
            t.anisotropy=aniso();
            release();resolve(t);
          },undefined,()=>{attempt()});       /* kandidat berikutnya */
        };
        attempt();
      }
    });
    pump();
  });
  cache.set(key,p);return p;
}

/* Muat + catat progres. Berhasil maupun gagal tetap dihitung "selesai" supaya
   indikator HUD tidak menggantung selamanya. */
function load1(files,srgb,rank){
  TEXPROG.total++;
  return fetchTex(files,srgb,rank)
    .then(t=>{TEXPROG.done++;return t})
    .catch(e=>{TEXPROG.failed++;TEXPROG.done++;throw e});
}

/* Peta kasar (roughness) dibalik dari peta spekulasi Bumi: laut = spekulasi tinggi
   -> kasar rendah -> memantul; daratan = spekulasi nol -> kasar penuh. */
function fromSpecular(t){
  const im=t&&t.image;
  if(!im||!im.width)return null;
  try{
   const c=document.createElement("canvas");c.width=im.width;c.height=im.height;
   const x=c.getContext("2d");x.drawImage(im,0,0);
   const g=x.getImageData(0,0,c.width,c.height),p=g.data;
   for(let i=0;i<p.length;i+=4){const v=255-p[i+1];p[i]=p[i+1]=p[i+2]=v;p[i+3]=255}
   x.putImageData(g,0,0);
   const o=new THREE.CanvasTexture(c);o.colorSpace=THREE.NoColorSpace;o.anisotropy=aniso();return o;
  }catch(e){return null} // canvas bisa terkunci bila gambar lintas-asal
}

/* Lepas tekstur lama (placeholder prosedural) setelah yang baru terpasang. */
function dropOld(t){if(t)setTimeout(()=>{try{t.dispose()}catch(e){}},0)}

/* Pendukung Bumi: dijadwalkan BERSAMAAN dengan peta daytime, dan tiap berkas
   dipasang sendiri begitu tiba — tidak menunggu berkas lain selesai. */
function earthExtras(b){
  if(extrasDone.has(b))return;extrasDone.add(b);
  // Awan — paling terlihat; tanpa ini Bumi tampil gumpalan bulat prosedural.
  load1(CLOUD,true,PRIO['earth.clouds']).then(t=>{
    if(t&&b.clouds){const old=b.clouds.material.map;
      b.clouds.material.map=t;b.clouds.material.needsUpdate=true;dropOld(old)}
  }).catch(()=>{});
  // Lampu kota sisi malam (kini citra nyata).
  load1(NIGHT,true,PRIO['earth.night']).then(t=>{
    if(t){b.mesh.material.emissiveMap=t;b.mesh.material.needsUpdate=true}
  }).catch(()=>{});
  // Peta normal -> relief permukaan (peta warna tidak dipakai sebagai tonjolan).
  load1(NORMAL,false,PRIO['earth.normal']).then(t=>{
    if(t){const m=b.mesh.material;m.bumpMap=null;m.normalMap=t;
      m.normalScale=new THREE.Vector2(.75,.75);m.needsUpdate=true}
  }).catch(()=>{});
  // Peta kasar, dibalik dari peta spekulasi.
  load1(SPEC,false,PRIO['earth.spec']).then(t=>{
    const rm=fromSpecular(t);
    if(rm){const m=b.mesh.material;m.roughness=1;m.roughnessMap=rm;m.needsUpdate=true}
  }).catch(()=>{});
}

/* Cincin Saturnus: tekstur adalah penampang radial cincin A–F (1,11–2,27 R),
   sedangkan geometri hanya 1,35–2,4 R. UV ditulis ulang mengikuti jari-jari
   fisik, bukan lewat matriks tekstur, agar tekstur prosedural cadangan tetap
   memakai UV aslinya. */
function saturnRing(b){
  if(extrasDone.has(b))return;extrasDone.add(b);
  load1(RING,true,PRIO['saturn.ring']).then(t=>{
    const ring=b.grp.userData.ring;
    if(!t||!ring)return;
    const uv=ring.geometry.attributes.uv,pos=ring.geometry.attributes.position,R=b.r;
    for(let k=0;k<pos.count;k++){
     const len=Math.hypot(pos.getX(k),pos.getY(k));
     uv.setXY(k,Math.min(Math.max((len/R-1.11)/1.16,0),1),1);
    }
    uv.needsUpdate=true;
    ring.material.map=t;ring.material.needsUpdate=true;
  }).catch(()=>{});
}

/* Pasang citra utama pada sebuah body. Dipanggil saat berkasnya tiba. */
function applyBody(b,t){
  const m=b.mesh.material,id=b.d.id,old=m.map;
  m.map=t;
  if(id==='earth')m.bumpMap=null;
  else if(ROCK.includes(id)){m.bumpMap=t;m.bumpScale=.3}
  else m.bumpMap=null;
  m.needsUpdate=true;
  dropOld(old);
}

/* Panggil setelah tahap pembangunan body. Idempoten: body yang sudah diproses
   dilewati, berkas sudah ada di cache. TIDAK di-await — pemuatan berjalan di
   latar belakang dan scenanya langsung tampil dengan tekstur prosedural. */
export function applyTextures(){
  const list=bodies.slice().sort((a,b)=>rankOf(a.d.id)-rankOf(b.d.id));
  for(const b of list){
   const id=b.d.id,files=FILE[id];
   if(files&&!done.has(b)){
    done.add(b);
    load1(files,true,rankOf(id)).then(t=>applyBody(b,t)).catch(()=>{});
   }
   // Pendukung dijadwalkan pada saat yang sama dengan citra induknya.
   if(id==='earth')earthExtras(b);
   if(id==='saturn')saturnRing(b);
  }
}
