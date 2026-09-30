/* ===== SCENE & BODY =====
   Modul ini memiliki semua single Three.js bersama (renderer, scene, camera, controls, …)
   dan menjadi satu-satunya tempat yang menulisnya — sehingga tidak perlu mutator. */
import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {PL,MOON,SUN,SATROWS} from './data.js';
import {bodies,ac,radOf,orbOf,LT,D2R} from './state.js';
import {rnd,lcg,mk,blob,texFor,glowTex} from './core.js';
import {atmoGeo,atmoMat,patchShadow,cityLights} from './shaders.js';

export let renderer,scene,camera,controls,clock,sun,sunLight,stars,BK="—";
const _cnt={};

export async function setupScene(){
 // WebGPURenderer memakai backend WebGPU bila tersedia, dan otomatis jatuh ke WebGL2 bila tidak.
 renderer=new THREE.WebGPURenderer({antialias:true,powerPreference:"high-performance"});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);document.body.prepend(renderer.domElement);
 await renderer.init();
 BK=renderer.backend&&renderer.backend.isWebGPUBackend?"WebGPU":"WebGL2";
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,.1,30000);camera.position.set(0,70,120);
 controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.06;controls.maxDistance=400;controls.minDistance=2;
 clock=new THREE.Timer();clock.connect(document);clock.reset(); // THREE.Clock sudah deprecated di r186
 // distance=0 (tanpa pemotong radius) & decay=0 (tanpa peredupan jarak) supaya semua planet tetap terlihat
 // pada ketiga mode skala — ini memperbaiki bug Eris yang gelap total di mode Relatif/Saintifik.
 scene.add(new THREE.AmbientLight(0x2a3350,.06));sunLight=new THREE.PointLight(0xfff0dd,2.4,0,0);scene.add(sunLight);
}

/* satu draw call Points, kecerahan/tint per bintang lewat vertex colors */
export function buildStars(){
 const N=4500,p=new Float32Array(N*3),cl=new Float32Array(N*3);for(let i=0;i<N;i++){const u=rnd()*2-1,a=rnd()*6.283,r=Math.sqrt(1-u*u),R=1200+rnd()*300;p.set([R*r*Math.cos(a),R*u,R*r*Math.sin(a)],i*3);const c=.3+rnd()*rnd()*.7;cl.set([c,c*.95,c*(.85+.3*rnd())],i*3)}
 const sg=new THREE.BufferGeometry();sg.setAttribute("position",new THREE.BufferAttribute(p,3));sg.setAttribute("color",new THREE.BufferAttribute(cl,3));
 stars=new THREE.Points(sg,new THREE.PointsMaterial({size:1.6,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:.9,depthTest:false,depthWrite:false}));
 stars.renderOrder=-1;stars.frustumCulled=false;scene.add(stars); // follows camera (see loop)
}

export function buildSun(){
 const sunT=mk(512,256,(x,w,h)=>{x.fillStyle="#f29a2e";x.fillRect(0,0,w,h);blob(x,w,h,"#ffd36b",300,3,14,.15,.5);blob(x,w,h,"#c9601a",200,2,10,.1,.35)});
 // Struktur sama seperti planet (grup > tilt > mesh): `sun` (grup) memegang scale & posisi
 // barycenter, grup `tilt` menerapkan kemiringan sumbu SUN.tilt (7,25°) yang dulu tidak
 // pernah dipakai, dan `mesh` sendirilah yang menerima spin berbasis data SUN.rot (607,1 jam).
 const mesh=new THREE.Mesh(new THREE.SphereGeometry(5,48,32),new THREE.MeshBasicMaterial({map:sunT}));
 const tilt=new THREE.Group();tilt.rotation.z=SUN.tilt*D2R;tilt.add(mesh);
 sun=new THREE.Group();sun.add(tilt);scene.add(sun);
 [[28,"rgba(255,190,90,",.9],[60,"rgba(255,150,60,",.35]].forEach(g=>{const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex(g[1]),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:g[2]}));s.scale.set(g[0],g[0],1);sun.add(s)}); // glow simetris radial -> di grup luar
 addBody(SUN,sun,mesh,5,0,null); // grp=sun (applyScale & barycenter), mesh=mesh (rotasi sumbu)
}

export function buildPlanets(){
 PL.forEach(d=>{
  const r=radOf(d.dia),oR=orbOf(d.dist),grp=new THREE.Group(),tilt=new THREE.Group();tilt.rotation.z=d.tilt*Math.PI/180;
  // texSeed>0 hanya untuk 4 KBO baru: memakai lcg() lokal sehingga pemanggilan rnd()
  // bersama tetap persis seperti sebelum KBO ditambahkan (lihat core.js).
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,48,32),new THREE.MeshStandardMaterial({map:texFor(d.tex,d.texSeed?lcg(d.texSeed):0),roughness:.9,metalness:0,emissive:0x000000}));
  tilt.add(mesh);grp.add(tilt);grp.userData.tilt=tilt;
  if(d.tex[0]!=="g"){mesh.material.bumpMap=mesh.material.map;mesh.material.bumpScale=d.tex[0]==="e"?.3:1.2}
  if(d.id==="earth"){const m=mesh.material;m.emissive.setHex(0xffffff);m.emissiveMap=mk(512,256,(x,w,h)=>{x.fillStyle="#000";x.fillRect(0,0,w,h);x.fillStyle="rgba(255,190,110,.9)";LT.forEach(q=>x.fillRect(q[0],q[1],1.6,1.6))});cityLights(m)}
  if(d.id!=="mercury"){const col=d.id==="venus"?[.9,.75,.4]:d.id==="mars"?[.8,.45,.3]:d.id==="earth"?[.3,.55,1]:d.id==="neptune"?[.3,.45,1]:[.6,.8,.9];
   grp.add(new THREE.Mesh(atmoGeo(r,d.id==="mars"?1.05:1.1),atmoMat(col)))} // atmosfer/limb glow
  let clouds;
  if(d.id==="earth"){clouds=new THREE.Mesh(new THREE.SphereGeometry(r*1.015,32,24),new THREE.MeshStandardMaterial({map:mk(512,256,(x,w,h)=>{blob(x,w,h,"#fff",160,4,26,.3,.8)}),transparent:true,depthWrite:false,opacity:.75}));tilt.add(clouds)}
  if(d.id==="saturn"){
   const g=new THREE.RingGeometry(r*1.35,r*2.4,128),pos=g.attributes.position,uv=g.attributes.uv,v=new THREE.Vector3();
   for(let k=0;k<pos.count;k++){v.fromBufferAttribute(pos,k);uv.setXY(k,(v.length()-r*1.35)/(r*1.05),1)}
   const rt=mk(256,4,(x,w)=>{for(let k=0;k<w;k++){const f=k/w,gap=(f>.62&&f<.67)?.08:1;x.fillStyle=`rgba(${205+rnd()*30|0},${180+rnd()*30|0},${140+rnd()*20|0},${(f<.08?.25:(.35+.3*Math.abs(Math.sin(f*40))+rnd()*.25)*(f>.9?.5:1))*gap})`;x.fillRect(k,0,1,4)}});
   const rm=new THREE.MeshStandardMaterial({map:rt,side:THREE.DoubleSide,transparent:true,depthWrite:false,roughness:1});patchShadow(rm,false,r);patchShadow(mesh.material,true,r);const ring=new THREE.Mesh(g,rm);ring.rotation.x=-Math.PI/2;grp.userData.ring=ring;tilt.add(ring)}
  // LineLoop tidak didukung WebGPURenderer -> pakai Line (titik awal & akhir sama sehingga tertutup)
 // depthWrite:false — pada mode Saintifik rasio near/far bisa ~10^7, garis orbit berkedip
 // menembus planet kalau ikut menulis depth buffer.
  const ol=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0x4a6099,transparent:true,opacity:.45,depthWrite:false}));ol.userData.orbit=1;ol.frustumCulled=false;grp.userData.ol=ol;scene.add(ol); // geometry filled by applyScale()
  addBody(d,grp,mesh,r,oR,clouds);scene.add(grp);
 });
}

export function buildEarthMoon(){
 const E=byEarth(),mr=.32,pivot=new THREE.Group(),mm=new THREE.Mesh(new THREE.SphereGeometry(mr,32,24),new THREE.MeshStandardMaterial({map:texFor(["r","#9a9a9a","#5f5f5f"]),roughness:1,emissive:0x000000}));
 mm.position.x=E.r*2.6;pivot.add(mm);E.grp.add(pivot);
 mm.add(new THREE.Group());
 const mb=addBody(MOON,mm,mm,mr,0,null);mb.pivot=pivot;mb.isMoon=true;mb.local=true;mb.parent=E;
 SATROWS.forEach(makeSat);
}
const byEarth=()=>bodies.find(b=>b.d.id==="earth");

export function makeSat(r){const [pid,id,name,dia,mass,g,dens,per,spd,ecc,temp,aKm,atm,desc,c,c2,retro]=r,P=bodies.find(b=>b.d.id===pid);
 const d={id,name,alias:name,sym:"☾",type:"Satelit alami "+PL.find(p=>p.id===pid).alias,dist:aKm/1e6,dia,mass,g,dens,rot:per*24,year:per,tilt:0,spd,ecc,temp,moons:0,atm,ring:"Tidak",desc,moon:true,retro};
 const piv=new THREE.Group(),m=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),new THREE.MeshStandardMaterial({map:texFor(["r",c,c2]),roughness:1,emissive:0}));piv.add(m);P.grp.add(piv);
 const b=addBody(d,m,m,1,0,null);b.pivot=piv;b.isMoon=true;b.sat=P;b.parent=P;b.idx=_cnt[pid]=(_cnt[pid]??-1)+1}

/* T4: label memakai nama Indonesia saja, tanpa simbol/emoji */
export function addBody(d,grp,mesh,r,oR,clouds){
 const el=document.createElement("div");el.className="lb";el.setAttribute("aria-hidden","true");el.textContent=d.alias;document.body.appendChild(el);
 const b={d,grp,mesh,r,r0:r,oR,clouds,el,wp:new THREE.Vector3()};bodies.push(b);return b}

export function dispose(){renderer.setAnimationLoop(null);ac.abort();controls.dispose();scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){[].concat(o.material).forEach(m=>{m.map&&m.map.dispose();m.dispose()})}});renderer.dispose()}
