/* ===== ORBIT, SKALA, SABUK ASTEROID, SABUK KUIPER, RASI BINTANG, SIMULASI ===== */
import * as THREE from 'three/webgpu';
import {CON} from './data.js';
import {st,UNITS,J2000,$,bodies,cLb,D2R,radOf,orbOf,NR,SM,slow,simDays,addSimDays,setSM} from './state.js';
import {rnd,lcg} from './core.js';
import {scene,sun,sunLight,stars,controls,camera} from './bodies.js';

/* ===== Keplerian ellipse (a: NASA sheet; e,i,Ω,ϖ: JPL). Jarak dikompresi per mode skala ===== */
export function ellipse(d,E,out){const a=orbOf(d.dist),e=d.ecc,xv=a*(Math.cos(E)-e),yv=a*Math.sqrt(1-e*e)*Math.sin(E),w=(d.peri-d.node)*D2R,O=d.node*D2R,i=d.inc*D2R,
 x1=xv*Math.cos(w)-yv*Math.sin(w),y1=xv*Math.sin(w)+yv*Math.cos(w);
 return out.set(x1*Math.cos(O)-y1*Math.cos(i)*Math.sin(O),y1*Math.sin(i),-(x1*Math.sin(O)+y1*Math.cos(i)*Math.cos(O)))} // ecliptic Z -> three.js up
export function orbitPos(d,t,out){const e=d.ecc,M=(d.L0-d.peri+360*t/d.year)*D2R;let E=M+e*Math.sin(M);for(let k=0;k<6;k++)E-=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));return ellipse(d,E,out)}

/* ===== ASTEROID BELT: satu InstancedMesh, 2,1–3,3 SA (aproksimasi, bukan gravitasi) =====
   Status lintasan: partikel ditempatkan pada LINGKARAN acak (tanpa e & inklinasi sendiri)
   dan seluruh sabuk berputar sebagai CAKRAM KAKI dengan satu periode 4,40 tahun — disetel
   untuk 2,7 SA (Kepler 4,44 th), padahal Kepler di tepi = 3,04 th (2,1 SA) dan 5,99 th
   (3,3 SA), jadi laju tepi meleset −32%…+36%. Beda nyaris tak terlihat pada kecepatan
   simulasi, sehingga sengaja dibiarkan; lihat README "Data & atribusi". */
let belt,beltData,beltD=0;const _m=new THREE.Matrix4(),_q=new THREE.Quaternion(),_p=new THREE.Vector3(),_bs=new THREE.Vector3();
export function buildBelt(){const N=1800;belt=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:0x8a8178,roughness:1,flatShading:true}),N);
 beltData=Array.from({length:N},()=>({au:2.1+rnd()*1.2,a:rnd()*6.283,y:(rnd()-.5)*.14,s:.03+rnd()*rnd()*.12}));scene.add(belt)}

/* Jarak kamera ke titik terdekat pada pita cincin datar rIn..rOut (bidang XZ). */
function gapOf(rIn,rOut){const lz=Math.hypot(camera.position.x,camera.position.z),
 rC=Math.min(Math.max(lz,rIn),rOut);return Math.max(Math.hypot(lz-rC,camera.position.y),1e-6)}
function beltGap(){return gapOf(orbOf(2.1*149.6),orbOf(3.3*149.6))}
/* Ukuran partikel pada jarak kamera `gap`: [lantai 1,5 px, batas atas 3% tebal pita].
   Aturan yang sama dipakai sabuk Kuiper; lihat catatan B35/B35b di bawah. */
function ringSpan(gap,rIn,rOut){const K=1.5*Math.tan(camera.fov*Math.PI*0.5/180)/Math.max(innerHeight*.5,1),
 floor=gap*K;return [floor,Math.max((rOut-rIn)*.03,floor)]}
/* BUG B35: tanpa lantai ukuran ini, di mode Saintifik/Relatif asteroid jatuh di bawah
   ambang rasterisasi (~0,1 px) sehingga sabuk tidak tampak sama sekali. Lantai = ukuran
   yang menghasilkan ~1,5 px pada jarak sabuk terdekat.
   BUG B35b: batas atas (3% tebal sabuk, agar dari jauh tetap menjadi pita bertitik dan
   bukan cincin pekat) ternyata LEBIH KECIL daripada lantai pada mode Relatif/Saintifik —
   sehingga lantai tidak pernah berlaku dan sabuk tetap samar (±0,6 px). Kini batas atas
   tidak boleh memotong lantai: ukuran berada di rentang [1,5 px, maks(3% tebal, 1,5 px)]. */
function layoutBelt(){const rIn=orbOf(2.1*149.6),rOut=orbOf(3.3*149.6),
 gap=beltGap(),[floor,cap]=ringSpan(gap,rIn,rOut);
 beltData.forEach((o,i)=>{const r=orbOf(o.au*149.6);_p.set(r*Math.cos(o.a),o.y*r,-r*Math.sin(o.a));
  _bs.setScalar(Math.min(Math.max(o.s*(SM===2?.3:SM===1?.6:1),floor),cap));_m.compose(_p,_q,_bs);belt.setMatrixAt(i,_m)});
 belt.instanceMatrix.needsUpdate=true;belt.boundingSphere=null;beltD=gap}
/* Re-layout hanya bila jarak kamera berubah >8% — murah, bukan tiap frame. */
export function syncBelt(){const d=beltGap();if(!beltD||Math.abs(d-beltD)>beltD*.08)layoutBelt()}

/* ===== SABUK KUIPER: 2 populasi (30–50 SA), dua InstancedMesh dalam satu grup.
   PENTING: seluruh keacakan di sini memakai LCG lokal berbenih tetap, BUKAN rnd()
   bersama — sehingga menambah sabuk ini tidak mengubah posisi asteroid, warna bintang,
   maupun tekstur lama satu bit pun. Partikel datar di bidang XZ seperti sabuk asteroid,
   tebal pita dinyatakan sebagai fraksi jari-jari (y × r) supaya ikut terkompresi skala.
   Status lintasan (sama seperti sabuk asteroid): LINGKARAN acak + CAKRAM KAKI 272 tahun
   (Kepler tepat di 42 SA), padahal Kepler di rentang populasi = 164 th (30 SA) … 354 th
   (50 SA) — meleset ±35% di tepi. Aproksimasi sengaja dibiarkan. */
const KPOP=[
 {n:1600,au:[42,47],tilt:.04,s0:.04,col:0x8fa9c8}, // klasik "dingin": pita sempit, miring kecil
 {n:1000,au:[30,50],tilt:.20,s0:.03,col:0xa37f6a}  // populasi "panas": rentang lebar, miring besar
];
let kGrp,kMesh=[],kDat=[],kGap=KPOP.map(()=>0);
export function buildKuiper(){let R=lcg(20250930);kGrp=new THREE.Group();
 kDat=KPOP.map(p=>({au:p.au,d:Array.from({length:p.n},()=>({au:p.au[0]+R()*(p.au[1]-p.au[0]),a:R()*6.283,
  y:(R()-.5)*p.tilt,s:p.s0+R()*R()*.10}))}));
 kMesh=kDat.map((q,i)=>{const m=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),
  new THREE.MeshStandardMaterial({color:KPOP[i].col,roughness:1,flatShading:true}),q.d.length);
  kGrp.add(m);return m});
 kGap=KPOP.map(()=>0);scene.add(kGrp)}
const kGapOf=i=>gapOf(orbOf(kDat[i].au[0]*149.6),orbOf(kDat[i].au[1]*149.6));
function layoutKuiper(){kMesh.forEach((m,i)=>{const q=kDat[i],rIn=orbOf(q.au[0]*149.6),rOut=orbOf(q.au[1]*149.6),
  gap=kGapOf(i),[floor,cap]=ringSpan(gap,rIn,rOut);
  q.d.forEach((o,j)=>{const r=orbOf(o.au*149.6);_p.set(r*Math.cos(o.a),o.y*r,-r*Math.sin(o.a));
   _bs.setScalar(Math.min(Math.max(o.s*(SM===2?.3:SM===1?.6:1),floor),cap));_m.compose(_p,_q,_bs);m.setMatrixAt(j,_m)});
  m.instanceMatrix.needsUpdate=true;m.boundingSphere=null;kGap[i]=gap})}
export function syncKuiper(){if(!kMesh.length)return;let need=false;
 for(let i=0;i<kMesh.length;i++){const g=kGapOf(i);if(!kGap[i]||Math.abs(g-kGap[i])>kGap[i]*.08)need=true}
 if(need)layoutKuiper()}

/* ===== RASI BINTANG =====
   Garis (LineSegments — bukan LineLoop, backend WebGPU) + titik bintang di setiap
   simpulnya, digabung dalam SATU grup sehingga tombol #bc menyalakan keduanya sekaligus.
   Titik bintang memakai InstancedMesh, bukan THREE.Points: backend WebGPU memaksa
   gl_PointSize = 1,0 px sehingga Points selalu satu piksel dan tidak bisa dibedakan
   menurut magnitudo (pola yang sama dipakai sabuk asteroid). */
let consG,consOn=false,pts,ptsP=[],ptsM=[];
const CONS_R=1100; // jari-jari langit buatan (satuan dunia), sejajar hamparan bintang latar
/* Diameter titik: 1,7 px (mag 4,5) … 6,8 px (mag −1,5), dikonversi ke satuan dunia pada
   jarak CONS_R; dihitung ulang bila tinggi jendela berubah agar tetap sama dalam piksel. */
function layoutConsPts(){
 const K=CONS_R*Math.tan(camera.fov*Math.PI*0.5/180)/Math.max(innerHeight*.5,1); // satuan dunia per piksel
 for(let i=0;i<ptsM.length;i++){const px=1.7+(4.5-Math.max(Math.min(ptsM[i],4.5),-1.5))*.85;
  _bs.setScalar(px*.5*K);_p.set(ptsP[i*3],ptsP[i*3+1],ptsP[i*3+2]);_m.compose(_p,_q,_bs);pts.setMatrixAt(i,_m)}
 pts.instanceMatrix.needsUpdate=true;pts.boundingSphere=null}
export function buildCons(){
 consG=new THREE.Group();consG.visible=false;
 const pos=[],e=23.44*Math.PI/180,V=([h,dc])=>{const a=h*15*Math.PI/180,d=dc*Math.PI/180,x=Math.cos(d)*Math.cos(a),y=Math.cos(d)*Math.sin(a),z=Math.sin(d);return new THREE.Vector3(x,-y*Math.sin(e)+z*Math.cos(e),-(y*Math.cos(e)+z*Math.sin(e)))};
 for(const [n,c] of Object.entries(CON)){const P=c.s.map(V);let mag=9;
  c.l.forEach(([i,j])=>pos.push(...P[i].clone().multiplyScalar(CONS_R).toArray(),...P[j].clone().multiplyScalar(CONS_R).toArray()));
  c.s.forEach(([h,dc,m],i)=>{const v=P[i];ptsP.push(v.x*CONS_R,v.y*CONS_R,v.z*CONS_R);ptsM.push(m);if(m<mag)mag=m});
  const el=document.createElement("div");el.className="lb";el.setAttribute("aria-hidden","true");el.textContent=c.n||n;el.style.display="none";document.body.appendChild(el);
  cLb.push({dir:P.reduce((a,v)=>a.add(v),new THREE.Vector3()).normalize(),el,pri:mag})} // pri = magnitudo terendah rasi (makin terang makin prioritas)
 const line=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0x7f9be0,transparent:true,opacity:.45,depthTest:false,depthWrite:false}));
 line.geometry.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));line.frustumCulled=false;line.renderOrder=-1;consG.add(line);
 pts=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshBasicMaterial({color:0xfff3d6,transparent:true,opacity:.9,depthTest:false,depthWrite:false}),ptsM.length);
 pts.frustumCulled=false;pts.renderOrder=-1;consG.add(pts);
 layoutConsPts();addEventListener("resize",layoutConsPts,{passive:true});
 stars.add(consG)}
export const toggleCons=()=>consOn=consG.visible=!consG.visible;
export {consOn};

/* ===== T2: ORBIT BULAN — elips sesuai eksentrisitas (bukan lingkaran satuan lagi).
   Muncul hanya bila orbit menyala DAN kamera cukup dekat.
   BUG B36: aturan lama hanya memakai 25 × jari-jari induk. Pada mode Saintifik jari-jari
   Bumi = 0,0064 unit sehingga ambangnya 0,16 unit, padahal orbit Bulan 0,384 unit dan
   kamera ~1 unit — syaratnya mustahil terpenuhi. Kini ambangnya diambil dari jari-jari
   cincin itu sendiri (12×), sehingga orbit tetap terbaca sampai ~90 px di layar. */
const MOON_RANGE=25,MOON_VIEW=12;
/* Geometri ternormalisasi (a = 1) dengan eksentrisitas terpasang: titik (cos E − e, 0,
   √(1−e²)·sin E) — elips dengan FOKUS di pusat induk. Karena e dibangun ke dalam titik,
   skala seragam ring.scale.set(a,1,a) menghasilkan elips ber-e persis seperti lintasan
   hasil moonStep() di step(): bulan selalu tepat berada di garis cincinnya. */
export function buildMoonRings(){
 for(const b of bodies){if(!b.isMoon)continue;
  const e=+b.d.ecc||0,pts=[];
  for(let i=0;i<=96;i++){const E=i/96*6.28318530718;pts.push(new THREE.Vector3(Math.cos(E)-e,0,Math.sqrt(1-e*e)*Math.sin(E)))}
  const ring=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x8fb4ff,transparent:true,opacity:.65,depthWrite:false}));
  ring.frustumCulled=false;ring.visible=false;b.pivot.add(ring);b.ring=ring;
  ring.scale.set(b.satA||1,1,b.satA||1)}
}
export function updateMoonRings(){
 for(const b of bodies){if(!b.ring)continue;
  const p=b.parent;if(!p)continue;
  const loc=b.satA||1; // semi-mayor satuan lokal induk — JANGAN position.x (kini tiap frame)
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
 if(baryDot&&sb){const s=Math.max(sb.r*.12,1e-5);baryDot.scale.setScalar(s);baryCross.scale.setScalar(s)} // ukuran penanda barycenter proporsional radius Matahari
 const mb=bodies.find(b=>b.isMoon),ms=SM===2?.273/.32:1;mb.satA=SM===2?60.3:SM===1?12:2.6;mb.mesh.scale.setScalar(ms);mb.r=.32*ms*E.k;if(mb.ring)mb.ring.scale.set(mb.satA,1,mb.satA); // Bulan: ≈60,3 jari-jari Bumi pada mode Saintifik; posisi dihitung moonStep()
 for(const b of bodies){if(!b.sat)continue;const k=b.sat.k,sz=SM===2?b.d.dia/2e6/k:Math.max(.16,.16*Math.sqrt(b.d.dia/3475));b.satA=SM===2?b.d.dist/k:b.sat.r0*(2+.55*b.idx);b.mesh.scale.setScalar(sz);b.r=sz*k;if(b.ring)b.ring.scale.set(b.satA,1,b.satA)}
 layoutBelt();layoutKuiper();controls.maxDistance=NR()*3; // camera.near/far kini disesuaikan tiap frame di loop()
 const sB=bodies.find(b=>b.d.star),
       minP=Math.min(...bodies.filter(b=>!b.isMoon&&!b.d.star).map(b=>b.r));
 MN=Math.max(minP*1.6,(sB?sB.r:0)*1.15,1e-5);
 controls.minDistance=MN;
 $("#sc").textContent=SM===2?"SKALA SAINTIFIK · ukuran & jarak ≈ nyata (planet tampak kecil)":"SKALA VISUALISASI · "+["Penjelajah","Relatif"][SM]+" · simulasi kira-kira";
}

/* ===== SIMULASI ===== */

/* ===== BARYCENTER (SSB) =====
   Matahari tidak diam di titik dunia: ia bergerak mengelulingi pusat massa sistem.
   Arah & besar dihitung dari posisi FISIK tiap planet (kebalikan kompresi orbOf:
   r_fisik = r_scene × dist/orbOf(dist)) dengan bobot massa terhadap Matahari:
      R = Σ (mᵢ/M☉)·rᵢ / (1 + Σ mᵢ/M☉)   →   Matahari berada di −R
   Hasil R dinyatakan dalam satuan radius Matahari FISIK (0,696 juta km), lalu dikalikan
   radius Matahari yang digambar × faktor mode FBB: Saintifik = fisik penuh (±0,5–1,5 R☉,
   dominan Jupiter 11,86 th + Saturnus 29,5 th — fase-nya nyata karena pakai posisi
   heliosentrik hari itu), mode visual diperbesar karena kompresi jarak membuat amplitudo
   fisik murni sub-piksel (0,03–0,1 unit).
   Planet & garis orbit TETAP heliosentrik — pusatnya memang barycenter; yang bergeser
   hanyalah Matahari (dan sunLight). Dua shader yang berasumsi Matahari di origin
   (cityLights, patchShadow) dibiarkan: galat arah O(R/d) < 0,5% karena jarak planet
   jauh melebihi amplitudo wobble. */
const MSUN=1.989e30,RSUN=.696,FBB=[.4,.5,1]; // massa Matahari (kg), radius Matahari (juta km), faktor per mode [Penjelajah,Relatif,Saintifik]
let baryG,baryL,baryDot,baryCross;
/* Penanda di origin (titik + silang) plus garis tipis ke Matahari; dihidupkan oleh
   tombol #bb ("Barycenter"). Geometri dibangun sekali, visibilitas diatur per frame. */
export function buildBary(){
 baryG=new THREE.Group();baryG.visible=false;baryG.frustumCulled=false;
 const col=0xffd98a,mat=()=>new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.95,depthWrite:false});
 baryDot=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),mat());
 const q=3.4,pts=[new THREE.Vector3(q,0,0),new THREE.Vector3(-q,0,0),new THREE.Vector3(0,q,0),new THREE.Vector3(0,-q,0),new THREE.Vector3(0,0,q),new THREE.Vector3(0,0,-q)];
 baryCross=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:col,transparent:true,opacity:.8,depthWrite:false}));baryCross.frustumCulled=false;
 baryL=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:0x8fb4ff,transparent:true,opacity:.6,depthWrite:false}));baryL.frustumCulled=false;
 baryG.add(baryDot,baryCross,baryL);scene.add(baryG)}
function barycenter(star){if(!star)return;
 let sx=0,sy=0,sz=0,wr=0;
 for(const b of bodies){const d=b.d;
  if(d.star||d.moon||!d.mass||!d.dist||d.dist<=0)continue;
  const m=d.mass[0]*Math.pow(10,d.mass[1])/MSUN;if(!isFinite(m)||m<=0)continue; // Ixion: massa null -> dilewati
  const q=m*d.dist/orbOf(d.dist); // balik kompresi jarak -> posisi fisik (juta km)
  sx+=b.grp.position.x*q;sy+=b.grp.position.y*q;sz+=b.grp.position.z*q;wr+=m}
 const L=Math.hypot(sx,sy,sz),amp=L>1e-12?(L/(1+wr)/RSUN)*star.r*FBB[SM]:0;
 if(amp>0){const k=amp/L;sun.position.set(-sx*k,-sy*k,-sz*k)}else sun.position.set(0,0,0);
 sunLight.position.copy(sun.position); // cahaya harus datang dari pusat Matahari
 if(baryG){baryG.visible=st.bb;
  if(st.bb){const p=baryL.geometry.attributes.position;p.setXYZ(1,sun.position.x,sun.position.y,sun.position.z);p.needsUpdate=true}}
}

/* Lintasan bulan: elips Kepler di bidang pivot dengan induk di FOKUS, memakai e yang sama
   dengan yang ditampilkan panel info (Bulan 0,055 → apogee/perigee 1,116×; sebelumnya
   lingkaran tetap). Fase disederhanakan: M₀ = 0 saat J2000 (tidak ada L0 untuk bulan).
   Triton (retrograde): laju M negatif -> elips sama, arah berlawanan. */
function moonStep(b){const d=b.d,e=+d.ecc||0,a=b.satA||1,
 M=2*Math.PI*simDays/d.year*(d.retro?-1:1);
 let E=M+e*Math.sin(M);for(let k=0;k<6;k++)E-=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
 b.mesh.position.set(a*(Math.cos(E)-e),0,a*Math.sqrt(1-e*e)*Math.sin(E))}

export function step(dt){
 const days=st.paused?0:dt*UNITS[st.unit][1]*st.speed*slow;
 addSimDays(days);st.date=new Date(J2000+simDays*864e5);
 let star=null;
 for(const b of bodies){const d=b.d;
  if(d.star){star=b;continue} // Matahari: posisi (barycenter) & spin dihitung SETELAH loop
  if(!d.moon)orbitPos(d,simDays,b.grp.position)
  else moonStep(b);
  const spin=Math.max(-.2,Math.min(.2,(d.rotDir||1)*2*Math.PI*days/(Math.abs(d.rot)/24)));
  b.mesh.rotation.y+=st.reduced&&!d.moon?spin*.3:spin;if(b.clouds)b.clouds.rotation.y+=spin*.15;
  b.mesh.getWorldPosition(b.wp)}
 barycenter(star); // tulis sun.position + sunLight SEBELUM wp Matahari diambil
 if(star){const d=star.d,spin=Math.max(-.2,Math.min(.2,(d.rotDir||1)*2*Math.PI*days/(Math.abs(d.rot)/24)));
  star.mesh.rotation.y+=st.reduced?spin*.3:spin; // rotasi dari data SUN.rot = 607,1 jam (25,3 hari)
  star.mesh.getWorldPosition(star.wp)}
 belt.rotation.y+=2*Math.PI*days/(4.4*365.25);
 if(kGrp)kGrp.rotation.y+=2*Math.PI*days/(272*365.25); // periode Kepler pada 42 SA
 syncBelt(); // sesuaikan ukuran asteroid terhadap jarak kamera (B35) bila bergeser >8%
 syncKuiper();
}
