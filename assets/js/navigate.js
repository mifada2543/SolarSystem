/* ===== KAMERA & INTERAKSI ===== */
import * as THREE from 'three/webgpu';
import {st,$,bodies,expl,sig,setCam,SM,orbOf} from './state.js';
import {renderer,scene,camera,controls} from './bodies.js';
import {MN} from './orbits.js';

const tmp=new THREE.Vector3();
export const v3=new THREE.Vector3();
let hov=null,down=null;

export function flyTo(target,off,b,label){anim={t:0,dur:st.reduced?.01:1.5,fT:controls.target.clone(),fO:camera.position.clone().sub(controls.target),tO:off,b,tgt:target,label};setCam("Transisi")}
let anim=null;
export function offFor(b){const dir=b.wp.clone().setY(0);if(dir.lengthSq()<1e-4)dir.set(1,0,0);dir.normalize().multiplyScalar(-1).applyAxisAngle(new THREE.Vector3(0,1,0),.7);return dir.multiplyScalar(b.r*4.2).add(new THREE.Vector3(0,b.r*1.4,0))}
export function camTick(dt){
 if(anim){anim.t+=dt;const e=easeFn(Math.min(anim.t/anim.dur,1)),to=anim.b?anim.b.wp:anim.tgt;
  const t=anim.fT.clone().lerp(to,e),o=anim.fO.clone().lerp(anim.tO,e);controls.target.copy(t);camera.position.copy(t).add(o);
  if(anim.t>=anim.dur){setCam(anim.b?(expl?"Penjelajahan: ":"Fokus: ")+anim.b.d.alias:(anim.label||"Tampilan Umum"));anim=null}}
 else if(st.sel){const t=st.sel.wp;tmp.copy(t).sub(controls.target);controls.target.add(tmp);camera.position.add(tmp)}
 navTick()}
const easeFn=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;

export function dimOrbits(){scene.children.forEach(o=>{if(o.userData.orbit)o.material.opacity=st.sel?.2:.45})}

export function pick(e){let best=null,bd=1e9;const H=innerHeight/2/Math.tan(camera.fov*Math.PI/360);
 for(const b of bodies){v3.copy(b.wp).project(camera);if(v3.z>1)continue;const dist=camera.position.distanceTo(b.wp);if(b.isMoon&&dist>(SM===2?5:18))continue;
  const rp=b.r/dist*H*1.25,dd=Math.hypot((v3.x*.5+.5)*innerWidth-e.clientX,(-v3.y*.5+.5)*innerHeight-e.clientY);if(dd<Math.max(16,rp)&&dd-rp<bd){bd=dd-rp;best=b}}return best}

/* ===== B37b: zoom menuju planet di bawah kursor, dan D5: hasilnya langsung "terfokuskan" =====
   Sebelumnya, saat mode Saintifik tanpa objek terpilih, scroll selalu mendekati pusat
   (Matahari) dan berhenti di minDistance lama — pengguna melaporkan "mentok ke Matahari".
   Kini saat zoom MASUK, target secara bertahap dialihkan ke planet yang ada di bawah
   kursor, minDistance mengikuti ukuran planet itu, dan st.sel langsung terisi sehingga
   kartu HUD menampilkan "DIFOKUSKAN KE …" + JARAK (dulu objeknya tidak dianggap terpilih).
   Panel info sengaja TIDAK dibuka — scroll tidak boleh menutupi layar; panel dibuka lewat
   klik planet atau tombol "Fokus". Scroll KELUAR hanya melepas fokus otomatis (autoFocus),
   bukan pilihan yang diklik sendiri. */
function wheelZoom(e){
 if(anim)return;
 if(e.deltaY>0){
  if(st.autoFocus){st.autoFocus=false;st.sel=null;dimOrbits();controls.minDistance=MN}
  return;
 }
 if(st.sel)return;                       // sudah terfokuskan (klik maupun scroll) → jangan pindah
 const b=pick(e);if(!b)return;
 st.autoFocus=true;st.sel=b;dimOrbits(); // langsung menjadi "terfokuskan"
 controls.minDistance=b.r*1.6;controls.target.lerp(b.wp,.35);
}

/* ===== D1: jarak & kecepatan kamera untuk kartu HUD (pojok kanan bawah) =====
   Dulu dua angka ini mengisi lencana kecil yang mengikuti kursor (#nav); lencana dihapus
   dan isinya digabungkan ke #hud. Perhitungannya tetap di sini karena camTick() sudah
   dipanggil tiap frame dan menjaga perataan; updHud() membacanya lewat navInfo().
   JARAK     = kamera → objek yang DIFOKUSKAN (belum ada → "—" di HUD)
   KECEPATAN = laju kamera, selalu ditampilkan termasuk saat 0 km/s */
let navD=0,navFirst=true,navSpd=0,navT=0;
const navPrev=new THREE.Vector3(),navRel=new THREE.Vector3();
const KM=()=>149.6e6/orbOf(149.6);
function navTick(){
 const k=KM();
 navD=st.sel?camera.position.distanceTo(st.sel.wp)*k:0;
 /* KECEPATAN = perubahan jarak/arah kamera terhadap TARGETNYA, bukan kecepatan mutlak.
    Saat ada yang difokuskan kamera ikut mengorbit planet; memakai kecepatan mutlak akan
    menampilkan jutaan km/s walaupun pengguna tidak menyentuh apa pun. Dengan ukuran
    relatif ini angkanya 0 saat diam/mengikuti, dan hanya bangun saat menyeret, men-scroll,
    atau sedang terbang. */
 navRel.copy(camera.position).sub(controls.target);
 /* Dihitung dengan WAKTU NYATA, bukan dt dari clock.getDelta() yang di-clamp ke 0,1 s:
    di bawah 10 fps dt akan terpotong sehingga kecepatan terlalu besar, dan peluruhan
    berbasis frame menjadi sangat lambat — angka raksasa bisa bertahan berdetik-detik.
    Laju 26/s setara lerp 0,35 per frame pada 60 fps (perilakunya sama di laju normal). */
 const now=performance.now(),dt=(now-navT)/1000;navT=now;
 if(navFirst){navPrev.copy(navRel);navFirst=false;navSpd=0;return}
 if(dt<=1e-4)return;
 navSpd+=((navRel.distanceTo(navPrev)/dt*k)-navSpd)*(1-Math.exp(-dt*26));
 navPrev.copy(navRel);
}
export const navInfo=()=>({d:navD,s:navSpd});

/* MeshBasicMaterial (Matahari) tidak punya properti emissive — diperiksa dulu. */
const em=(b,h)=>{const m=b.mesh.material;if(m&&m.emissive)m.emissive.setHex(h)};
export function setHover(b,e){if(hov&&hov!==b)em(hov,hov.d.id==="earth"?0xffffff:0);hov=b;const tip=$("#tip");
 if(b){em(b,b.d.id==="earth"?0xffffff:0x1a2a4a);renderer.domElement.style.cursor="pointer";tip.style.display="block";tip.textContent=b.d.alias;tip.style.left=e.clientX+14+"px";tip.style.top=e.clientY+10+"px"}
 else{renderer.domElement.style.cursor="";tip.style.display="none"}}

/* Arahkan kanvas (onPick dipasok ui.js agar circular import terhindar) */
export function bindCanvas(onPick){
  const c=renderer.domElement;
  c.addEventListener("pointermove",e=>{if(e.pointerType==="mouse")setHover(pick(e),e)},sig);
  c.addEventListener("pointerdown",e=>{down={x:e.clientX,y:e.clientY,t:performance.now()}},sig);
  c.addEventListener("wheel",e=>{wheelZoom(e)},{...sig,passive:true});
  c.addEventListener("pointerup",e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<6&&performance.now()-down.t<500){const b=pick(e);if(b)onPick(b)}down=null},sig);
}
