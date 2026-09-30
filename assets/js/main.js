/* ===== MAIN: bootstrap, init, loop ===== */
import * as THREE from 'three/webgpu';
import {PL} from './data.js';
import {$,st,SM,cLb,bodies,setLd,fail,showFail,addSlow,slow} from './state.js';
import {setupScene,buildStars,buildSun,buildPlanets,buildEarthMoon,renderer,scene,camera,controls,clock,stars} from './bodies.js';
import {buildBelt,buildCons,applyScale,buildMoonRings,updateMoonRings,step,consOn} from './orbits.js';
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
 buildEarthMoon();buildCons();buildBelt();applyScale(0);buildMoonRings();
 await applyTextures();                       // Bulan & satelit baru ditambahkan di atas
 await setLd("Memuat data planet…");
}

let acc=0,nf=0,curDpr=Math.min(devicePixelRatio,2),hudT=0;
function loop(time){
 clock.update(time);
 const dt=Math.min(clock.getDelta(),.1);
 addSlow(((st.sel?0.35:1)-slow)*Math.min(dt*2,1));
 step(dt);camTick(dt);stars.position.copy(camera.position);controls.update();
 if(st.labels)for(const b of bodies){v3.copy(b.wp).project(camera);const near=b.isMoon?camera.position.distanceTo(b.wp)<18:true;
  const vis=v3.z<1&&near;b.el.style.opacity=vis?1:0;if(vis)b.el.style.transform=`translate(${(v3.x*.5+.5)*innerWidth+8}px,${(-v3.y*.5+.5)*innerHeight-6}px)`}
 if(consOn&&st.labels)for(const c of cLb){v3.copy(c.dir).multiplyScalar(1100).add(camera.position).project(camera);const ok=v3.z<1;c.el.style.opacity=ok?.7:0;if(ok)c.el.style.transform=`translate(${(v3.x*.5+.5)*innerWidth}px,${(-v3.y*.5+.5)*innerHeight}px)`}
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
