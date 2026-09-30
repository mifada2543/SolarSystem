/* ===== T3: PETA NAVIGASI 3D (kanan atas) =====
   Peta dirender lewat scissor viewport pada renderer YANG SAMA (bukan renderer kedua),
   karena objek Three.js tidak dapat dibagikan antar konteks. Karena itu pikselnya menempel
   di kanvas utama: menyembunyikan div tidak cukup — render-nya juga harus dilewati.

   DUA TIPE LAYOUT dapat dibandingkan lewat tombol di pojok bawah peta:
     √ Kompresi — radius ditekan sqrt(r/NR) seperti peta 2D sebelumnya, sehingga
       Merkurius–Mars tetap terbaca terpisah;
     Linier 1:1 — jarak sesungguhnya, planet bagian dalam menumpuk di pusat.

   Kamera peta mengikuti posisi X/Z/Y kamera pengguna, tapi SELALU menatap Matahari,
   dengan sumbu up = −Z sehingga pusat peta tetap Matahari. Sumbu "atas" peta mengikuti ARAH PANDANG kamera
    utama: saat pengguna menyeret kiri/kanan peta ikut berputar (arah yang dilihat selalu
    berada di atas) dan saat menyeret atas/bawah kemiringan peta berubah. */
import * as THREE from 'three/webgpu';
import {st,$,bodies,NR,SM,orbOf} from './state.js';
import {renderer,camera,controls} from './bodies.js';
import {ellipse,MN} from './orbits.js';
import {flyTo,dimOrbits} from './navigate.js';
import {focus,closeInfo} from './ui.js';

let mapScene,mapCam,el,btn,mq,ready=false,lin=false,mapZoom=1,lastKey="",belt=null;
let camDot,camLine;const dots=new Map(),halos=new Map(),labels=[],orbits=[];
const v=new THREE.Vector3(),v2=new THREE.Vector3(),dv=new THREE.Vector3(),mapUp=new THREE.Vector3(0,0,-1);
let half=1;

/* ---- pemetaan radial (dua tipe layout) ---- */
const mapR=r=>{const c=Math.min(r,NR());return lin?c:Math.sqrt(c/NR())*NR()};
const invR=c=>lin?c:c*c/NR();
function mapPos(src,out){const r=Math.hypot(src.x,src.z);
 if(r<1e-9)return out.set(0,src.y,0);const s=mapR(r)/r;return out.set(src.x*s,src.y*s,src.z*s)}
/* ukuran dunia agar objek seluas P piksel pada kamera ortografik peta */
const pxf=P=>P*half/Math.max(el?el.clientHeight:1,1);

/* ---- geometri yang dibangun ulang saat mode skala / tipe layout berubah ---- */
function rebuild(){
 const key=SM+"|"+(lin?1:0)+"|"+Math.round(NR()*1000);
 if(key===lastKey)return;lastKey=key;
 for(const line of orbits){line.geometry.dispose();mapScene.remove(line)}
 orbits.length=0;
 for(const b of bodies){if(b.isMoon||!b.grp.userData.ol)continue;
  const pts=[];for(let i=0;i<=192;i++){ellipse(b.d,i/192*6.2832,v);pts.push(mapPos(v,new THREE.Vector3()))}
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({color:0x6d86cc,transparent:true,opacity:.5,depthWrite:false}));
  line.frustumCulled=false;mapScene.add(line);orbits.push(line)}
 if(belt){belt.geometry.dispose();mapScene.remove(belt)}
 const g=new THREE.RingGeometry(mapR(orbOf(2.1*149.6)),mapR(orbOf(3.3*149.6)),128);
 g.rotateX(-Math.PI/2);
 belt=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0x9a9086,transparent:true,opacity:.2,side:THREE.DoubleSide,depthWrite:false}));
 belt.frustumCulled=false;mapScene.add(belt);
}

/* ---- penanda arah kamera pengguna ---- */
function updateCamMarker(){
 mapPos(camera.position,camDot.position);
 mapPos(controls.target,v);
 dv.copy(v).sub(camDot.position);
 const L=dv.length(),max=pxf(15);
 if(L>1e-9&&L>max)dv.multiplyScalar(max/L);
 const p=camLine.geometry.attributes.position;
 p.setXYZ(0,camDot.position.x,camDot.position.y,camDot.position.z);
 p.setXYZ(1,camDot.position.x+dv.x,camDot.position.y+dv.y,camDot.position.z+dv.z);
 p.needsUpdate=true;camLine.geometry.computeBoundingSphere();
}

function updateCamera(){
 const w=Math.max(el.clientWidth,1),h=Math.max(el.clientHeight,1);
 half=NR()*1.05/mapZoom;
 const a=w/h;
 mapCam.left=-half*a;mapCam.right=half*a;mapCam.top=half;mapCam.bottom=-half;
 mapCam.near=.1;mapCam.far=NR()*14+Math.abs(camera.position.y)*4+NR();
 // posisi kamera peta mengikuti kamera pengguna; elevasi dijaga agar peta tetap terbaca
 const hh=Math.hypot(camera.position.x,camera.position.z);
 mapCam.position.set(camera.position.x,
   Math.max(NR()*3+camera.position.y,NR()*1.2,hh*.85),camera.position.z);
 // "atas" peta = arah pandang kamera utama, sehingga peta ikut berputar saat diseret
 const fx=controls.target.x-camera.position.x,fz=controls.target.z-camera.position.z;
 if(fx*fx+fz*fz>1e-8)mapUp.set(fx,0,fz).normalize();
 mapCam.up.copy(mapUp);mapCam.lookAt(0,0,0);mapCam.updateProjectionMatrix();
}

function updateObjects(){
 for(const [b,m] of dots){mapPos(b.wp,m.position);const h=halos.get(b);
  h.position.copy(m.position);
  const on=st.sel===b;h.visible=on;if(on)h.scale.setScalar(pxf(13));
  m.scale.setScalar(pxf(b.d.star?9:on?9:6))}
 updateCamMarker();
}

const LBH=11,LBW=54; /* tinggi/lebar perkiraan label, dipakai deteksi tumpang tindih */
function placeLabels(r){
 // koordinat LOKAL terhadap #map: label kini anak #map sehingga ikut terpotong overflow
 const W=r.width,H=r.height,cx=W/2,cy=H/2,list=[];
 // di kolom kiri bawah ada tombol #mapt (±73 px, tinggi 23 px) — label tidak boleh menimpanya
 const botFor=ox=>ox<81?H-LBH-31:H-LBH-2;
 for(const L of labels){const b=L.b;
  mapPos(b.wp,v);v2.copy(v).project(mapCam);
  const sx=(v2.x*.5+.5)*W,sy=(-v2.y*.5+.5)*H;
  if(!(v2.z<1&&sx>=0&&sx<=W&&sy>=0&&sy<=H)){L.el.style.opacity=0;continue}
  // label dijorongkan menjauhi pusat peta supaya planet yang berdekatan tidak bertumpuk
  let dx=sx-cx,dy=sy-cy;const q=Math.hypot(dx,dy)||1;dx/=q;dy/=q;
  const ox=Math.min(Math.max(sx+dx*13,2),Math.max(W-LBW-2,2));
  const oy=Math.min(Math.max(sy+dy*13-LBH/2,2),Math.max(botFor(ox),2));
  L.el.style.opacity=1;list.push({el:L.el,ox,oy});
 }
 // cegah tumpang tindih: relaksasi berulang — dorong ke bawah, bila mentok dorong ke atas
 for(let it=0;it<24;it++){
  list.sort((a,b)=>a.oy-b.oy||a.ox-b.ox);
  let moved=false;
  for(let i=1;i<list.length;i++)for(let j=0;j<i;j++){
   const A=list[i],B=list[j];
   if(Math.abs(A.ox-B.ox)>=LBW||Math.abs(A.oy-B.oy)>=LBH)continue;
   const lim=botFor(A.ox),down=B.oy+LBH,up=B.oy-LBH;
   if(down<=lim&&down>A.oy){A.oy=down;moved=true}
   else if(up>=2&&up<A.oy){A.oy=up;moved=true}
   else if(down<=lim){A.oy=down;moved=true}
   else if(up>=2){A.oy=up;moved=true}
   else if(A.oy!==lim&&A.oy<=lim){A.oy=lim;moved=true}
  }
  if(!moved)break;
 }
 // sisa yang benar-benar tak muat disembunyikan (hanya terjadi pada peta sangat kecil)
 const ok=[];
 for(const o of list){
  const bad=o.ox<2-1e-6||o.oy<2-1e-6||o.oy>botFor(o.ox)+1e-6
    ||ok.some(p=>Math.abs(p.ox-o.ox)<LBW&&Math.abs(p.oy-o.oy)<LBH);
  if(bad)o.el.style.opacity=0;else{ok.push(o);o.el.style.opacity=1}
  o.el.style.transform=`translate(${o.ox}px,${o.oy}px)`;
 }
}
const hideLabels=()=>{for(const L of labels)L.el.style.opacity=0};

const visible=()=>!!el&&!document.getElementById("info").classList.contains("open")
  &&!(mq.matches&&document.body.classList.contains("panel-open"));

/* ---- inisialisasi ---- */
export function initMap(){
 el=$("#map");btn=$("#mapt");if(!el)return;
 mq=matchMedia("(max-width:860px)");
 mapScene=new THREE.Scene();
 mapScene.add(new THREE.AmbientLight(0x2a3350,.06));
 mapScene.add(new THREE.PointLight(0xfff0dd,2.4,0,0));
 mapCam=new THREE.OrthographicCamera(-1,1,1,-1,.1,1e5);
 const sg=new THREE.SphereGeometry(1,20,14);
 for(const b of bodies){if(b.isMoon)continue;
  const m=new THREE.Mesh(sg,b.mesh.material);m.frustumCulled=false;mapScene.add(m);dots.set(b,m);
  const h=new THREE.Mesh(sg,new THREE.MeshBasicMaterial({color:0x7fb0ff,side:THREE.BackSide,depthTest:false,transparent:true}));
  h.renderOrder=99;h.visible=false;h.frustumCulled=false;mapScene.add(h);halos.set(b,h);
  if(b.d.star||!b.d.dwarf){const L=document.createElement("div");
   L.className="lbm";L.setAttribute("aria-hidden","true");L.textContent=b.d.alias;
   el.appendChild(L);labels.push({b,el:L})}}
 camDot=new THREE.Mesh(sg,new THREE.MeshBasicMaterial({color:0xe6ecff,depthTest:false}));
 camDot.renderOrder=100;camDot.frustumCulled=false;mapScene.add(camDot);
 camLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),
  new THREE.LineBasicMaterial({color:0xe6ecff,transparent:true,opacity:.8,depthTest:false}));
 camLine.renderOrder=100;camLine.frustumCulled=false;mapScene.add(camLine);
 // renderer tidak boleh membersihkan seluruh kanvas tiap render — peta dirender setelah
 // tampilan utama ke dalam sudut scissor.
 renderer.autoClear=false;
 if(btn)btn.onclick=e=>{e.stopPropagation();lin=!lin;lastKey="";btn.textContent=lin?"Linier 1:1":"√ Kompresi"};
 el.addEventListener("wheel",e=>{e.preventDefault();
  mapZoom=Math.min(8,Math.max(.25,mapZoom*(e.deltaY>0?1/1.3:1.3)))},{passive:false});
 el.addEventListener("click",onMapClick);
 addEventListener("resize",()=>{lastKey=""},{passive:true});
 rebuild();ready=true;
}

function onMapClick(e){
 if(btn&&(e.target===btn||btn.contains(e.target)))return;
 const r=el.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;
 /* Radius tangkap mengikuti JARI-JARI DOT yang sebenarnya (lihat updateObjects(): 6 px,
    9 px untuk Matahari/terpilih) + toleransi 2 px. Dulu tetap 15 px pada peta 172 px,
    sehingga klik yang "nyaris meleset" justru tertarik ke planet tetangga. */
 let best=null,bd=1e9;
 for(const [b,m] of dots){v.copy(m.position).project(mapCam);if(v.z>1)continue;
  const d=Math.hypot((v.x*.5+.5)*r.width-mx,(v.y*.5+.5)*r.height-my),
        rr=(b.d.star||st.sel===b?9:6)+2;
  if(d<rr&&d<bd){bd=d;best=b}}
 if(best){focus(best);return}
 // sinar peta ke bidang y=0, lalu PEMBALIKAN pemetaan radial agar didapat koordinat dunia
 v.set(mx/r.width*2-1,-(my/r.height*2-1),.5).unproject(mapCam);
 dv.copy(v).sub(mapCam.position);
 if(Math.abs(dv.y)<1e-9)return;
 const t=-mapCam.position.y/dv.y;if(t<0)return;
 v.copy(mapCam.position).addScaledVector(dv,t);
 const c=Math.min(Math.hypot(v.x,v.z),half),s=c>1e-9?1/c:0,dist=invR(c);
 const ux=c>1e-9?v.x*s:0,uz=c>1e-9?v.z*s:1;
 /* D3 — arah pandang DIPERTAHANKAN. Offset kamera dihitung dari arah kamera SAAT INI
    terhadap targetnya; hanya JARAKNYA yang disetel proporsional radius titik yang diklik
    (0,6 × radius, dengan lantai MN×3 agar tidak masuk sampai ke Matahari).
    Sebelumnya offset bersifat absolut (0,8·d ; 0,5·d ; d) sehingga azimuth selalu 38,7°
    dan elevasi 21,3° — titik tujuannya benar, tapi sudut kamera melompat.
    Vektor BARU (bukan dv): flyTo menyimpan referensi off, sedangkan dv dipakai ulang oleh
    updateCamMarker() tiap frame — memakai dv berarti offset terbang langsung tercemar. */
 const off=new THREE.Vector3().copy(camera.position).sub(controls.target);
 if(off.lengthSq()<1e-8)off.set(.5,.35,1);
 off.normalize().multiplyScalar(Math.max(dist*.6,MN*3));
 st.sel=null;st.autoFocus=false;controls.minDistance=MN;closeInfo();dimOrbits();
 flyTo(new THREE.Vector3(ux*dist,0,uz*dist),off,null,"Navigasi Peta");
}

/* ---- render: dipanggil dari loop() SETELAH render tampilan utama ---- */
export function drawMap(now){
 if(!ready)return;
 if(!visible()){hideLabels();return}
 const r=el.getBoundingClientRect();
 if(r.width<4||r.height<4){hideLabels();return}
 rebuild();updateCamera();updateObjects();placeLabels(r);
 // WebGPURenderer memakai konvensi WebGPU: asal viewport/scissor di KIRI-ATAS.
 const x=Math.round(r.left),w=Math.round(r.width),
       y=Math.round(r.top),h=Math.round(r.height);
 renderer.setScissorTest(true);
 renderer.setViewport(x,y,w,h);
 renderer.setScissor(x,y,w,h);
 renderer.clear(true,true,false);
 renderer.render(mapScene,mapCam);
 renderer.setScissorTest(false);
 renderer.setViewport(0,0,innerWidth,innerHeight);
 renderer.setScissor(0,0,innerWidth,innerHeight);
}
