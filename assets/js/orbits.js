/* ===== ORBIT, SKALA, SABUK ASTEROID, RASI BINTANG, SIMULASI ===== */
import * as THREE from 'three/webgpu';
import {CON} from './data.js';
import {st,UNITS,J2000,$,bodies,cLb,D2R,radOf,orbOf,NR,SM,slow,simDays,addSimDays,setSM} from './state.js';
import {rnd} from './core.js';
import {scene,sun,stars,controls,camera} from './bodies.js';

/* ===== Keplerian ellipse (a: NASA sheet; e,i,Ω,ϖ: JPL). Jarak dikompresi per mode skala ===== */
export function ellipse(d,E,out){const a=orbOf(d.dist),e=d.ecc,xv=a*(Math.cos(E)-e),yv=a*Math.sqrt(1-e*e)*Math.sin(E),w=(d.peri-d.node)*D2R,O=d.node*D2R,i=d.inc*D2R,
 x1=xv*Math.cos(w)-yv*Math.sin(w),y1=xv*Math.sin(w)+yv*Math.cos(w);
 return out.set(x1*Math.cos(O)-y1*Math.cos(i)*Math.sin(O),y1*Math.sin(i),-(x1*Math.sin(O)+y1*Math.cos(i)*Math.cos(O)))} // ecliptic Z -> three.js up
export function orbitPos(d,t,out){const e=d.ecc,M=(d.L0-d.peri+360*t/d.year)*D2R;let E=M+e*Math.sin(M);for(let k=0;k<6;k++)E-=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));return ellipse(d,E,out)}

/* ===== ASTEROID BELT: satu InstancedMesh, 2,1–3,3 SA (aproksimasi, bukan gravitasi) ===== */
let belt,beltData,beltD=0;const _m=new THREE.Matrix4(),_q=new THREE.Quaternion(),_p=new THREE.Vector3(),_bs=new THREE.Vector3();
export function buildBelt(){const N=1800;belt=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:0x8a8178,roughness:1,flatShading:true}),N);
 beltData=Array.from({length:N},()=>({au:2.1+rnd()*1.2,a:rnd()*6.283,y:(rnd()-.5)*.14,s:.03+rnd()*rnd()*.12}));scene.add(belt)}

/* Jarak kamera ke titik terdekat pada sabuk (sabuk datar di bidang XZ). */
function beltGap(){const rIn=orbOf(2.1*149.6),rOut=orbOf(3.3*149.6),lz=Math.hypot(camera.position.x,camera.position.z),
 rC=Math.min(Math.max(lz,rIn),rOut);return Math.max(Math.hypot(lz-rC,camera.position.y),1e-6)}
/* BUG B35: tanpa lantai ukuran ini, di mode Saintifik/Relatif asteroid jatuh di bawah
   ambang rasterisasi (~0,1 px) sehingga sabuk tidak tampak sama sekali. Lantai = ukuran
   yang menghasilkan ~1,5 px pada jarak sabuk terdekat.
   BUG B35b: batas atas (3% tebal sabuk, agar dari jauh tetap menjadi pita bertitik dan
   bukan cincin pekat) ternyata LEBIH KECIL daripada lantai pada mode Relatif/Saintifik —
   sehingga lantai tidak pernah berlaku dan sabuk tetap samar (±0,6 px). Kini batas atas
   tidak boleh memotong lantai: ukuran berada di rentang [1,5 px, maks(3% tebal, 1,5 px)]. */
function layoutBelt(){const rIn=orbOf(2.1*149.6),rOut=orbOf(3.3*149.6),
 gap=beltGap(),K=1.5*Math.tan(camera.fov*Math.PI*0.5/180)/Math.max(innerHeight*.5,1),
 floor=gap*K,cap=Math.max((rOut-rIn)*.03,floor);
 beltData.forEach((o,i)=>{const r=orbOf(o.au*149.6);_p.set(r*Math.cos(o.a),o.y*r,-r*Math.sin(o.a));
  _bs.setScalar(Math.min(Math.max(o.s*(SM===2?.3:SM===1?.6:1),floor),cap));_m.compose(_p,_q,_bs);belt.setMatrixAt(i,_m)});
 belt.instanceMatrix.needsUpdate=true;belt.boundingSphere=null;beltD=gap}
/* Re-layout hanya bila jarak kamera berubah >8% — murah, bukan tiap frame. */
export function syncBelt(){const d=beltGap();if(!beltD||Math.abs(d-beltD)>beltD*.08)layoutBelt()}

/* ===== RASI BINTANG ===== */
let cons,consOn=false;
export function buildCons(){cons=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0x7f9be0,transparent:true,opacity:.45,depthTest:false,depthWrite:false}));cons.visible=false;cons.frustumCulled=false;cons.renderOrder=-1;
 const pos=[],e=23.44*Math.PI/180,V=([h,dc])=>{const a=h*15*Math.PI/180,d=dc*Math.PI/180,x=Math.cos(d)*Math.cos(a),y=Math.cos(d)*Math.sin(a),z=Math.sin(d);return new THREE.Vector3(x,-y*Math.sin(e)+z*Math.cos(e),-(y*Math.cos(e)+z*Math.sin(e)))};
 for(const [n,c] of Object.entries(CON)){const P=c.s.map(V);c.l.forEach(([i,j])=>pos.push(...P[i].clone().multiplyScalar(1100).toArray(),...P[j].clone().multiplyScalar(1100).toArray()));
  const el=document.createElement("div");el.className="lb";el.setAttribute("aria-hidden","true");el.textContent=n;el.style.display="none";document.body.appendChild(el);cLb.push({dir:P.reduce((a,v)=>a.add(v),new THREE.Vector3()).normalize(),el})}
 cons.geometry.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));stars.add(cons)}
export const toggleCons=()=>consOn=cons.visible=!cons.visible;
export {consOn};

/* ===== T2: ORBIT BULAN — cincin lingkaran satuan yang mengikuti setiap bulan.
   Muncul hanya bila orbit menyala DAN kamera cukup dekat.
   BUG B36: aturan lama hanya memakai 25 × jari-jari induk. Pada mode Saintifik jari-jari
   Bumi = 0,0064 unit sehingga ambangnya 0,16 unit, padahal orbit Bulan 0,384 unit dan
   kamera ~1 unit — syaratnya mustahil terpenuhi. Kini ambangnya diambil dari jari-jari
   cincin itu sendiri (12×), sehingga orbit tetap terbaca sampai ~90 px di layar. */
const MOON_RANGE=25,MOON_VIEW=12;
export function buildMoonRings(){
 const pts=[];for(let i=0;i<=96;i++){const a=i/96*6.28318530718;pts.push(new THREE.Vector3(Math.cos(a),0,Math.sin(a)))}
 for(const b of bodies){if(!b.isMoon)continue;
  const ring=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x8fb4ff,transparent:true,opacity:.65,depthWrite:false}));
  ring.frustumCulled=false;ring.visible=false;b.pivot.add(ring);b.ring=ring}
}
export function updateMoonRings(){
 for(const b of bodies){if(!b.ring)continue;
  const p=b.parent;if(!p)continue;
  const loc=Math.abs(b.mesh.position.x)||1;
  b.ring.scale.setScalar(loc);
  // jari-jari cincin dalam satuan dunia (cincin mewarisi skala grp induk)
  const wr=loc*(p.grp?p.grp.scale.x:1),range=Math.max(MOON_RANGE*p.r,MOON_VIEW*wr);
  b.ring.visible=!!(st.orbits&&camera.position.distanceToSquared(p.wp)<range*range)}
}

/* ===== MODE SKALA ===== */
/* BUG B37: minDistance bawaan sebelumnya literal 2 satuan dunia. Pada mode Saintifik
   2 unit = 2 juta km, jadi zoom selalu mentok jauh di luar planet (pengguna: "mentok ke
   Matahari"). Kini diturunkan dari data: cukup kecil untuk mendekati planet terkecil,
   tapi tetap lebih besar dari radius Matahari agar kamera tak masuk ke dalamnya. */
export let MN=2;
export function applyScale(m){setSM(m);const E=bodies.find(b=>b.d.id==="earth");
 for(const b of bodies){if(b.isMoon||b.d.star)continue;const k=radOf(b.d.dia)/b.r0;b.grp.scale.setScalar(k);b.r=b.r0*k;b.k=k;const o=b.grp.userData.ol,pts=[];
  for(let i=0;i<=256;i++)pts.push(ellipse(b.d,i/256*6.2832,new THREE.Vector3()));o.geometry.dispose();o.geometry=new THREE.BufferGeometry().setFromPoints(pts)}
 sun.scale.setScalar((SM===2?.696:SM===1?1.6:5)/5); // Matahari: radius fisik 0,696 juta km pada mode Saintifik
 const sb=bodies.find(b=>b.d.star);if(sb)sb.r=sb.r0*sun.scale.x;
 const mb=bodies.find(b=>b.isMoon),ms=SM===2?.273/.32:1;mb.mesh.position.x=SM===2?60.3:SM===1?12:2.6;mb.mesh.scale.setScalar(ms);mb.r=.32*ms*E.k; // Bulan: ≈60,3 jari-jari Bumi pada mode Saintifik
 for(const b of bodies){if(!b.sat)continue;const k=b.sat.k,sz=SM===2?b.d.dia/2e6/k:Math.max(.16,.16*Math.sqrt(b.d.dia/3475));b.mesh.position.x=SM===2?b.d.dist/k:b.sat.r0*(2+.55*b.idx);b.mesh.scale.setScalar(sz);b.r=sz*k}
 layoutBelt();controls.maxDistance=NR()*3; // camera.near/far kini disesuaikan tiap frame di loop()
 const sB=bodies.find(b=>b.d.star),
       minP=Math.min(...bodies.filter(b=>!b.isMoon&&!b.d.star).map(b=>b.r));
 MN=Math.max(minP*1.6,(sB?sB.r:0)*1.15,1e-5);
 controls.minDistance=MN;
 $("#sc").textContent=SM===2?"SKALA SAINTIFIK · ukuran & jarak ≈ nyata (planet tampak kecil)":"SKALA VISUALISASI · "+["Penjelajah","Relatif"][SM]+" · simulasi kira-kira";
}

/* ===== SIMULASI ===== */
export function step(dt){
 const days=st.paused?0:dt*UNITS[st.unit][1]*st.speed*slow;
 addSimDays(days);st.date=new Date(J2000+simDays*864e5);
 for(const b of bodies){const d=b.d;
  if(d.star){b.mesh.getWorldPosition(b.wp);continue} // Matahari tidak mengorbit
  if(!d.moon)orbitPos(d,simDays,b.grp.position)
  else b.pivot.rotation.y=2*Math.PI*simDays/d.year*(d.retro?-1:1);
  const spin=Math.max(-.2,Math.min(.2,(d.rotDir||1)*2*Math.PI*days/(Math.abs(d.rot)/24)));
  b.mesh.rotation.y+=st.reduced&&!d.moon?spin*.3:spin;if(b.clouds)b.clouds.rotation.y+=spin*.15;
  b.mesh.getWorldPosition(b.wp)}
 sun.rotation.y+=days*.004;belt.rotation.y+=2*Math.PI*days/(4.4*365.25);
 syncBelt(); // sesuaikan ukuran asteroid terhadap jarak kamera (B35) bila bergeser >8%
}
