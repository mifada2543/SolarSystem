/* ===== TEKSTUR NYATA (opsional & gagal-aman) =====
   Seluruh berkas di folder assets/textures/ diunduh dari
   https://www.solarsystemscope.com/textures/ — lisensi Creative Commons
   Attribution 4.0 (CC BY 4.0), sebagian besar berbasis citra NASA.

   Tiga hal yang sengaja dijaga:
   1. GAGAL-AMAN — bila berkas tidak ada atau gagal dimuat (mis. dibuka lewat
      file://), tekstur prosedural dari core.js tetap dipakai; start-up tidak
      pernah menunggu selamanya (ada batas waktu 12 detik per berkas).
   2. URUTAN rnd() TIDAK BERUBAH — texFor() tetap dipanggil lebih dulu seperti
      semula, lalu hasilnya ditukar. Sehingga keacakan hamparan bintang, titik
      kota, dan sabuk asteroid tetap identik dengan versi prosedural.
   3. PENUKARAN TERJADI DI BALIK LAYAR MUAT — init() menunggu applyTextures()
      sebelum loop render pertama, jadi pengguna tidak melihat pergantian. */
import * as THREE from 'three/webgpu';
import {bodies} from './state.js';

export const TEXDIR=new URL('../textures/',import.meta.url).href;

/* id pada data.js -> berkas. Pluto sengaja tidak ada di daftar: Solar System
   Scope tidak menyediakan tekstur Pluto, jadi Pluto tetap memakai prosedural. */
const FILE={
 sun:'2k_sun.jpg',mercury:'2k_mercury.jpg',venus:'2k_venus_atmosphere.jpg',
 earth:'2k_earth_daymap.jpg',mars:'2k_mars.jpg',jupiter:'2k_jupiter.jpg',
 saturn:'2k_saturn.jpg',uranus:'2k_uranus.jpg',neptune:'2k_neptune.jpg',
 moon:'2k_moon.jpg',ceres:'2k_ceres_fictional.jpg',eris:'2k_eris_fictional.jpg',
 haumea:'2k_haumea_fictional.jpg',makemake:'2k_makemake_fictional.jpg'
};
/* pendukung Bumi + cincin Saturnus */
const NIGHT='2k_earth_nightmap.jpg',CLOUD='2k_earth_clouds.jpg',
      NORMAL='2k_earth_normal_map.png',SPEC='2k_earth_specular_map.png',
      RING='2k_saturn_ring_alpha.png';

/* Planet padat: peta warna dipakai lagi sebagai peta tonjolan (relief halus).
   Raksasa gas & Venus (peta awan) harus tanpa tonjolan — permukaannya bukan batuan. */
const ROCK=['mercury','mars','moon','ceres','eris','haumea','makemake'];

const LIMIT=12000,done=new Set(),cache=new Map();
const loader=new THREE.TextureLoader();

function get(file,srgb){
 if(srgb===undefined)srgb=true;
 const key=file+'|'+(srgb?1:0);
 if(cache.has(key))return cache.get(key);
 const p=new Promise(res=>{
  let ended=false;const fin=v=>{if(!ended){ended=true;res(v)}};
  const timer=setTimeout(()=>fin(null),LIMIT);
  loader.load(TEXDIR+file,t=>{
    clearTimeout(timer);
    t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;
    t.anisotropy=4;fin(t);
  },undefined,()=>{clearTimeout(timer);fin(null)});
 });
 cache.set(key,p);return p;
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
  const o=new THREE.CanvasTexture(c);o.colorSpace=THREE.NoColorSpace;o.anisotropy=4;return o;
 }catch(e){return null} // canvas bisa terkunci bila gambar lintas-asal
}

async function earthExtras(m,b){
 const r=await Promise.all([get(NORMAL,false),get(NIGHT),get(CLOUD),get(SPEC,false)]);
 const nm=r[0],nt=r[1],cl=r[2],rm=fromSpecular(r[3]);
 if(nm){m.bumpMap=null;m.normalMap=nm;m.normalScale=new THREE.Vector2(.75,.75)}
 if(nt)m.emissiveMap=nt;                       // lampu kota sisi malam (kini citra nyata)
 if(rm){m.roughness=1;m.roughnessMap=rm}
 m.needsUpdate=true;
 if(cl&&b.clouds){b.clouds.material.map=cl;b.clouds.material.needsUpdate=true}
}

/* Cincin Saturnus: tekstur adalah penampang radial cincin A–F (1,11–2,27 R),
   sedangkan geometri hanya 1,35–2,4 R. UV ditulis ulang mengikuti jari-jari
   fisik, bukan lewat matriks tekstur, agar tekstur prosedural cadangan tetap
   memakai UV aslinya. */
async function saturnRing(b){
 const t=await get(RING),ring=b.grp.userData.ring;
 if(!t||!ring)return;
 const uv=ring.geometry.attributes.uv,pos=ring.geometry.attributes.position,R=b.r;
 for(let k=0;k<pos.count;k++){
  const len=Math.hypot(pos.getX(k),pos.getY(k));
  uv.setXY(k,Math.min(Math.max((len/R-1.11)/1.16,0),1),1);
 }
 uv.needsUpdate=true;
 ring.material.map=t;ring.material.needsUpdate=true;
}

/* Panggil setelah tahap pembangunan body. Idempoten: body yang sudah diproses
   dilewati, berkas sudah ada di cache. */
export async function applyTextures(){
 const jobs=[];
 for(const b of bodies){
  if(done.has(b))continue;
  const file=FILE[b.d.id];
  if(!file)continue;
  done.add(b);
  jobs.push(get(file).then(async t=>{
   if(!t)return; // gagal -> biarkan prosedural
   const m=b.mesh.material,id=b.d.id;
   m.map=t;
   if(id==='sun')m.emissiveMap=t;               // Matahari: peta warna juga jadi peta pancar
   if(id==='earth')m.bumpMap=null;
   else if(ROCK.includes(id)){m.bumpMap=t;m.bumpScale=.3}
   else m.bumpMap=null;
   m.needsUpdate=true;
   if(id==='earth')await earthExtras(m,b);
   if(id==='saturn')await saturnRing(b);
  }));
 }
 await Promise.allSettled(jobs);
}
