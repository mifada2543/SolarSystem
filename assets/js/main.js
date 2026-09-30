/* ===== MAIN: bootstrap, init, loop ===== */
import * as THREE from 'three/webgpu';
import {PL} from './data.js';
import {$,st,SM,cLb,bodies,setLd,fail,showFail,addSlow,slow} from './state.js';
import {setupScene,buildStars,buildSun,buildPlanets,buildEarthMoon,renderer,scene,camera,controls,clock,stars} from './bodies.js';
import {buildBelt,buildKuiper,buildCons,applyScale,buildMoonRings,updateMoonRings,step,consOn,buildBary} from './orbits.js';
import {camTick,v3} from './navigate.js';
import {buildUI,updHud} from './ui.js';
import {initMap,drawMap} from './minimap.js';
import {applyTextures} from './textures.js';

/* URUTAN INI MENENTUKAN TAMPILAN: rnd() berbagi seed antara tekstur planet dan warna
   bintang, sehingga tiap tahap di bawah tidak boleh ditukar urutannya. */
async function init(){
 if(!PL||PL.length<8||PL.slice(0,8).some(p=>!p||!p.id))fail("Data planet tidak dapat dimuat."); // 8 planets + dwarf planets
 await setLd("Menyiapkan renderer…");
 await setupScene();
 await setLd("Menyiapkan hamparan bintang…");
 buildStars();buildSun();
 await setLd("Memuat tekstur…");
 buildPlanets();await applyTextures();        // tekstur CC BY (gagal-aman, lihat js/textures.js)
 await setLd("Membangun sistem orbit…");
 buildEarthMoon();buildCons();buildBelt();buildKuiper();buildBary();applyScale(0);buildMoonRings();
 await applyTextures();                       // Bulan & satelit baru ditambahkan di atas
 await setLd("Memuat data planet…");
}

let acc=0,nf=0,curDpr=Math.min(devicePixelRatio,2),hudT=0;
/* Label rasi: diproyeksikan ke layar tiap frame, lalu disaring agar tidak tumpang tindih —
   label diurutkan menurut magnitudo rasi (makin terang makin dulu dipertahankan); label yang
   kotaknya berhimpitan dengan yang sudah ditempatkan, atau keluar dari layar, disembunyikan.
   Lebar label diukur ulang hanya saat muncul, jendela diubah, atau tiap 1 detik — bukan tiap
   frame — supaya tidak memaksa reflow DOM pada 60 fps. */
let lbOn=false,lbW=0,lbT=0,lbObs=[];
/* Panel kontrol, kartu HUD, peta navigasi, panel info, dan bilah pencarian semuanya
   ber-z-index lebih tinggi daripada .lb sehingga menutupi label bila label jatuh di
   baliknya. Kotaknya diukur bersama ukuran label (maks. 1×/detik, bukan tiap frame)
   lalu dijadikan hambatan pertama — label takkan pernah terpotong panel. */
const LBOB=["#ctl","#hud","#map","#info","#sr"];
function lbMeasure(){
 cLb.forEach(c=>{c.w=c.el.offsetWidth;c.h=c.el.offsetHeight});
 lbObs=[];
 for(const s of LBOB){const e=$(s);if(!e)continue;const r=e.getBoundingClientRect();
  if(r.width<4||r.height<4||r.left>=innerWidth||r.right<=0||r.top>=innerHeight||r.bottom<=0)continue;
  lbObs.push({x:r.left,y:r.top,w:r.width,h:r.height})}
}
function consLabels(){
 if(!consOn||!st.labels){lbOn=false;return}
 const now=performance.now();
 if(!lbOn||innerWidth!==lbW||now-lbT>1e3){lbOn=true;lbW=innerWidth;lbT=now;lbMeasure()}
 const vis=[];
 for(const c of cLb){v3.copy(c.dir).multiplyScalar(1100).add(camera.position).project(camera);
  if(v3.z>=1){c.el.style.opacity=0;continue}
  const w=c.w||90,h=c.h||16;
  let x=(v3.x*.5+.5)*innerWidth,y=(-v3.y*.5+.5)*innerHeight;
  if(x>innerWidth||y>innerHeight||x+w<0||y+h<0){c.el.style.opacity=0;continue} // di luar layar
  x=Math.min(Math.max(x,4),Math.max(4,innerWidth-w-4));y=Math.min(Math.max(y,4),Math.max(4,innerHeight-h-4));
  vis.push({c,x,y,w,h})}
 vis.sort((a,b)=>a.c.pri-b.c.pri); // magnitudo terendah = prioritas tertinggi
 const box=lbObs.slice();           // mulai dari hambatan panel/HUD/peta
 for(const o of vis){let ok=true;
  for(const p of box)if(o.x<p.x+p.w+12&&o.x+o.w+12>p.x&&o.y<p.y+p.h+6&&o.y+o.h+6>p.y){ok=false;break}
  if(ok){box.push(o);o.c.el.style.opacity=.7;o.c.el.style.transform=`translate(${o.x}px,${o.y}px)`}
  else o.c.el.style.opacity=0}
}
function loop(time){
 clock.update(time);
 const dt=Math.min(clock.getDelta(),.1);
 addSlow(((st.sel?0.35:1)-slow)*Math.min(dt*2,1));
 step(dt);camTick(dt);stars.position.copy(camera.position);controls.update();
 if(st.labels)for(const b of bodies){v3.copy(b.wp).project(camera);const near=b.isMoon?camera.position.distanceTo(b.wp)<18:true;
  const vis=v3.z<1&&near;b.el.style.opacity=vis?1:0;if(vis)b.el.style.transform=`translate(${(v3.x*.5+.5)*innerWidth+8}px,${(-v3.y*.5+.5)*innerHeight-6}px)`}
 consLabels();
 updateMoonRings();
 // near/far dinamis: near proporsional jarak fokus (mencegah pemotongan saat mendekati planet kecil),
 // far dijaga cukup besar agar bintang & orbit jauh tetap terlihat.
 const dist=camera.position.distanceTo(controls.target);
 const near=Math.max(dist*.03,1e-4),far=Math.min(Math.max(4000,dist*150),60000);
 if(near!==camera.near||far!==camera.far){camera.near=near;camera.far=far;camera.updateProjectionMatrix()}
 // autoClear dimatikan di initMap() agar render peta (scissor) tidak menghapus tampilan
 // utama — maka pembersihan kanvas dilakukan manual di sini.
 renderer.clear();renderer.render(scene,camera);
 acc+=dt;nf++;if(nf===90){if(acc/nf>.026&&curDpr>1){curDpr=1;renderer.setPixelRatio(1)}acc=0;nf=0}
 const now=performance.now();if(now-hudT>120){hudT=now;updHud()}
 drawMap(now);
}

try{
 await init();buildUI();initMap();renderer.setAnimationLoop(loop);
 $("#ls").textContent="SISTEM TATA SURYA SIAP";setTimeout(()=>$("#ld").classList.add("done"),700);
}catch(e){console.error(e);if($("#err").style.display!=="flex")showFail(e.message||String(e))}
