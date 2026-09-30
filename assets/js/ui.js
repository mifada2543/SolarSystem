/* ===== UI: panel info, kontrol, pencarian, HUD, audio ===== */
import * as THREE from 'three/webgpu';
import {PL,SRC} from './data.js';
import {st,UNITS,J2000,$,ID,fmt,bodies,cLb,sig,NR,SM,cam,simDays,setSim,setExpl,planetByKey} from './state.js';
import {scene,camera,controls,renderer,BK,dispose} from './bodies.js';
import {applyScale,toggleCons,consOn,MN} from './orbits.js';
import {flyTo,offFor,dimOrbits,bindCanvas,navInfo} from './navigate.js';

/* ===== AUDIO (opt-in, disintegrasikan dengan WebAudio; tidak pernah autoplay) ===== */
let AC,amb;
function sfx(f,d=.15,v=.05){if(!AC||!st.snd)return;const o=AC.createOscillator(),g=AC.createGain();o.frequency.value=f;g.gain.setValueAtTime(v,AC.currentTime);g.gain.exponentialRampToValueAtTime(1e-4,AC.currentTime+d);o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+d)}
function toggleSound(){try{st.snd=!st.snd;if(st.snd&&!AC){AC=new(window.AudioContext||window.webkitAudioContext)();amb=AC.createGain();amb.connect(AC.destination);[55,82.5,110.3].forEach(f=>{const o=AC.createOscillator();o.frequency.value=f;o.connect(amb);o.start()})}
 if(AC){AC.resume();amb.gain.value=st.snd?.03:0}}catch(e){st.snd=false}$("#bs").textContent="Suara: "+(st.snd?"NYALA":"MATI")}

/* ===== PANEL INFO ===== */
const BAR=(v,k)=>v==null?"":`<div class="bar" style="width:${Math.min(100,Math.max(2,v/Math.max(...PL.map(p=>p[k]))*100))}%"></div>`;
const R=(k,v)=>`<div class="r"><span>${k}</span><b>${v}</b></div>`;
const km=v=>st.imp?fmt(v*.621371)+" mi":fmt(v)+" km",tc=t=>t==null?"n/a":st.imp?fmt(t*9/5+32)+" °F":fmt(t)+" °C";
const gv=g=>g==null?"n/a":st.imp?fmt(g*3.28084,1)+" ft/s²":fmt(g,1)+" m/s²",ms=m=>`${fmt(m[0],3)} × 10<sup>${m[1]}</sup> kg`;
const dur=h=>h==null?"n/a":h<72?`${fmt(h,1)} jam`:`${fmt(h/24,1)} hari`,yr=d=>d==null?"n/a":d>=730?`${fmt(d/365.25,2)} tahun Bumi`:`${fmt(d,1)} hari`;

function showInfo(b){const d=b.d,i=PL.indexOf(d)+1,el=$("#info");
 el.innerHTML=`<button id="cl" style="float:right" aria-label="Tutup panel">Tutup</button><h2>${d.alias}</h2><div class="ty">${d.alias} · ${d.type}${d.moon||d.dwarf||d.star?"":" · Planet ke-"+i+" dari Matahari"}</div>
 <h3>Karakteristik fisik</h3>${R("Diameter",km(d.dia))}${BAR(d.dia,"dia")}${R("Massa",ms(d.mass))}${R("Gravitasi",gv(d.g))}${BAR(d.g,"g")}${R("Kepadatan",fmt(d.dens)+" kg/m³")}${BAR(d.dens,"dens")}${R("Suhu rata-rata",tc(d.temp))}${R("Durasi hari (rotasi)",dur(d.rot))}${R("Durasi tahun",yr(d.year))}${R("Kemiringan sumbu",d.tilt==null?"n/a":fmt(d.tilt,1)+"°")}
 <h3>Orbit</h3>${d.star?R("Posisi","Pusat Tata Surya"):R(d.moon?"Jarak dari planet induk":"Jarak rata-rata dari Matahari",km(Math.round(d.dist*1e6)))+R("Periode orbital",yr(d.year))+R("Kecepatan orbital",st.imp?fmt(d.spd*.621371,1)+" mi/s":fmt(d.spd,1)+" km/s")+R("Eksentrisitas",fmt(d.ecc,3))}
 <h3>Lingkungan</h3>${R(d.star?"Lapisan luar":"Atmosfer",d.star?"Fotosfer, kromosfer, dan korona":d.moon?"Eksosfer":d.atm.length?"Ya":"Tidak")}<div class="nt" style="margin:2px 0">${d.atm.join(" · ")}</div>${R(d.star?"Planet":"Satelit alami",d.moons)}${R("Cincin",d.ring)}
 <h3>Deskripsi</h3><p>${d.desc}</p>
 ${d.moon?"":`<h3>Bandingkan</h3><select id="cs" aria-label="Bandingkan dengan"><option value="">— pilih planet —</option>${PL.filter(p=>p!==d).map(p=>`<option value="${p.id}">${d.alias} vs ${p.alias}</option>`).join("")}</select><div id="ct"></div>`}
 <p class="nt">Elemen orbit (inklinasi, node, perihelion): JPL Approximate Positions of the Planets (ssd.jpl.nasa.gov/planets/approx_pos.html). Data fisik: NASA Planetary Fact Sheet (<a href="${SRC}" target="_blank" rel="noopener">sumber</a>). ${d.dwarf&&d.id!=="pluto"?"Planet kerdil: elemen orbit dari JPL Small-Body Database (epoch berbeda tiap objek); data fisik dari Wikipedia/NASA, beberapa nilai (rotasi, kemiringan) belum pasti. ":""}Jumlah satelit berubah seiring penemuan baru (NASA/IAU). Ukuran & jarak pada tampilan 3D adalah <b>apresiasi visualisasi</b>.</p>
 <button id="ex">Jelajahi ${d.alias}</button> <button id="ov">Seluruh Tata Surya</button>`;
 el.classList.add("open");
 document.body.classList.add("info-open"); // D2: kartu #hud bergeser menjauhi panel info
 $("#cl").onclick=backCam;               // B38: "Tutup" kembali ke posisi kamera sebelumnya
 $("#ov").onclick=()=>overview();        // "Seluruh Tata Surya" tetap mereset kamera
 $("#ex").onclick=()=>explore(b);
 const cs=$("#cs");if(cs)cs.onchange=()=>{const o=PL.find(p=>p.id===cs.value);if(!o){$("#ct").innerHTML="";return}
  const rows=[["Diameter",p=>km(p.dia)+BAR(p.dia,"dia")],["Massa",p=>ms(p.mass)],["Gravitasi",p=>gv(p.g)+BAR(p.g,"g")],["Durasi hari",p=>dur(p.rot)],["Durasi tahun",p=>yr(p.year)],["Suhu rata-rata",p=>tc(p.temp)],["Bulan",p=>p.star?"—":p.moons]];
  $("#ct").innerHTML=`<table><tr><th></th><th>${d.alias}</th><th>${o.alias}</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1](d)}</td><td>${r[1](o)}</td></tr>`).join("")}</table>`}}
function closeInfo(){$("#info").classList.remove("open");document.body.classList.remove("info-open")}

/* ===== NAVIGASI =====
   B38: cuplikan kamera diambil SEBELUM flyTo, sehingga tombol "Tutup" pada panel info
   bisa membawa kembali ke posisi semula, bukan ke tampilan umum (atur ulang kamera). */
let camBack=null;
function saveCam(){camBack={p:camera.position.clone(),t:controls.target.clone(),m:controls.minDistance,label:cam}}
function backCam(){const c=camBack;camBack=null;closeInfo();
 if(!c){overview();return}
 st.sel=null;st.autoFocus=false;setExpl(false);dimOrbits();controls.minDistance=c.m;
 flyTo(c.t,c.p.clone().sub(c.t),null,c.label||"Tampilan Umum")}
function focus(b){sfx(660,.3);if(st.sel!==b)saveCam();st.autoFocus=false;setExpl(false);st.sel=b;controls.minDistance=b.r*1.6;flyTo(null,offFor(b),b);showInfo(b);dimOrbits();if(st.pauseSel){st.paused=true;syncBtns()}}
function explore(b){if(st.sel!==b)saveCam();st.autoFocus=false;setExpl(true);st.sel=b;controls.minDistance=b.r*1.12;flyTo(null,offFor(b).setLength(b.r*2.4),b);dimOrbits()}
function overview(top){sfx(440,.3);camBack=null;st.autoFocus=false;setExpl(false);st.sel=null;controls.minDistance=MN;closeInfo();dimOrbits();flyTo(new THREE.Vector3(),top?new THREE.Vector3(0,2.5*NR(),.8*NR()):new THREE.Vector3(0,.9*NR(),1.55*NR()),null)}
export {focus,explore,overview,showInfo,closeInfo,backCam};

/* ===== HUD ===== */
let hudT=0,hudS="";
export function updHud(){
 // Tanggal ditampilkan dalam UTC agar konsisten dengan tanggal simulasinya sendiri (bukan zona lokal).
 // D1/D2: "TERPILIH" menjadi "DIFOKUSKAN KE", dan JARAK + KECEPATAN dari lencana #nav lama
 // kini menetap di baris berikutnya. JARAK baru ada setelah ada yang difokuskan; KECEPATAN
 // selalu ditampilkan (0 km/s saat diam). updHud dipanggil tiap 120 ms dari loop() dan
 // hanya menulis DOM bila stringnya berubah, jadi angka hidup ini tidak membebani DOM.
 const n=navInfo(),imp=st.imp;
 const jarak=st.sel?(imp?fmt(n.d*.621371)+" mi":fmt(n.d)+" km"):"—";
 const kec=imp?fmt(n.s*.621371,1)+" mi/s":fmt(n.s,1)+" km/s";
 const t=`SIMULASI<br><b>${st.paused?"Jeda":"Berjalan"}</b> · Kecepatan: <b>${st.speed}x</b> · ${UNITS[st.unit][0]} per detik<br>TANGGAL <b>${st.date.toLocaleDateString(ID,{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"})}</b><br>DIFOKUSKAN KE <b>${st.sel?st.sel.d.alias:"—"}</b><br>JARAK <b>${jarak}</b><br>KECEPATAN <b>${kec}</b><br>KAMERA <b>${cam}</b><br>SKALA <b>${["Penjelajah","Relatif","Saintifik"][SM]}</b><br>RENDERER <b>${BK}</b>`;
 if(t!==hudS){hudS=t;$("#hudl").innerHTML=t} // di-throttle: tidak lagi menulis DOM tiap frame + tanpa aria-live
}

export function syncBtns(){$("#bp").textContent=st.paused?"Lanjut":"Jeda";$("#bo").classList.toggle("on",st.orbits);$("#bl").classList.toggle("on",st.labels);$("#bm").classList.toggle("on",st.reduced);$("#bh").classList.toggle("on",st.pauseSel);
 $("#spd").querySelectorAll("button").forEach(b=>b.classList.toggle("on",+b.dataset.s===st.speed));
 scene&&scene.children.forEach(o=>{if(o.userData.orbit)o.visible=st.orbits});bodies.forEach(b=>b.el.style.display=st.labels?"":"none");
 cLb.forEach(l=>l.el.style.display=(consOn&&st.labels)?"":"none");dimOrbits()}

export function buildUI(){
 [.1,.5,1,5,10,50,100].forEach(s=>{const b=document.createElement("button");b.textContent=s+"x";b.dataset.s=s;b.onclick=()=>{st.speed=s;syncBtns()};$("#spd").appendChild(b)});
 $("#un").innerHTML=UNITS.map((u,i)=>`<option value="${i}"${i===st.unit?" selected":""}>${u[0]}</option>`).join("");$("#un").onchange=e=>st.unit=+e.target.value;
 $("#bp").onclick=()=>{st.paused=!st.paused;syncBtns()};$("#br").onclick=()=>overview();$("#be").onclick=()=>overview(true);
 $("#bf").onclick=()=>st.sel&&focus(st.sel);$("#bo").onclick=()=>{st.orbits=!st.orbits;syncBtns()};$("#bl").onclick=()=>{st.labels=!st.labels;syncBtns()};
 $("#bu").onclick=()=>{st.imp=!st.imp;$("#bu").textContent=st.imp?"mi · °F":"km · °C";st.sel&&showInfo(st.sel)};
 $("#bm").onclick=()=>{st.reduced=!st.reduced;syncBtns()};$("#bh").onclick=()=>{st.pauseSel=!st.pauseSel;syncBtns()};
 // panel-open dipakai CSS (≤860px) untuk menyembunyikan peta selama panel diperluas
 const setPanel=()=>document.body.classList.toggle("panel-open",!$("#body").classList.contains("hide"));
 $("#tg").onclick=()=>{const h=$("#body").classList.toggle("hide");$("#tg").textContent=h?"+":"–";$("#tg").setAttribute("aria-expanded",!h);setPanel()};
 if(innerWidth<=860){$("#body").classList.add("hide");$("#tg").textContent="+";$("#tg").setAttribute("aria-expanded","false")}
 setPanel();
 const q=$("#q"),res=$("#res"),all=()=>[...bodies].map(b=>b);
 const find=v=>{v=v.trim().toLowerCase();return v?all().filter(b=>(b.d.name+" "+b.d.alias).toLowerCase().includes(v)):[]};
 q.oninput=()=>{res.innerHTML="";find(q.value).forEach(b=>{const li=document.createElement("li"),bt=document.createElement("button");bt.textContent=b.d.alias;bt.onclick=()=>{focus(b);q.value="";res.innerHTML=""};li.appendChild(bt);res.appendChild(li)})};
 q.onkeydown=e=>{if(e.key==="Enter"){const f=find(q.value)[0];if(f){focus(f);q.value="";res.innerHTML=""}}e.stopPropagation()};
 addEventListener("keydown",e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
  if(e.key===" "&&e.target.tagName!=="BUTTON"){e.preventDefault();st.paused=!st.paused;syncBtns()}
  else if(e.key==="Escape"){$("#info").classList.contains("open")?backCam():overview()}
  else if(e.key==="/"){e.preventDefault();q.focus()}
  else if(/^[1-8]$/.test(e.key))focus(planetByKey(+e.key-1));
  else if(e.key==="9")focus(bodies.find(b=>b.isMoon&&!b.sat));
  else if(e.key==="0")focus(bodies.find(b=>b.d.star))},sig);
 bindCanvas(focus);
 addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)},{...sig,passive:true});
 addEventListener("pagehide",dispose,sig);
 $("#sm").onchange=e=>{applyScale(+e.target.value);st.sel?focus(st.sel):overview()};
 [["−1 hari",-1],["+1 hari",1],["−1 bln",-30.44],["+1 bln",30.44],["−1 thn",-365.25],["+1 thn",365.25]].forEach(([t,v])=>{const b=document.createElement("button");b.textContent=t;b.onclick=()=>setSim(simDays+v);$("#dt").appendChild(b)});
 [["J2000",()=>0],["Hari ini",()=>(Date.now()-J2000)/864e5]].forEach(([t,f])=>{const b=document.createElement("button");b.textContent=t;b.onclick=()=>setSim(f());$("#dt").appendChild(b)});
 $("#cd").onchange=e=>setSim((Date.parse(e.target.value+"T12:00:00Z")-J2000)/864e5);setSim(simDays);
 $("#bc").onclick=()=>{const on=toggleCons();$("#bc").classList.toggle("on",on);cLb.forEach(l=>l.el.style.display=(on&&st.labels)?"":"none")};
 $("#bs").onclick=toggleSound;document.addEventListener("click",e=>{if(e.target.closest&&e.target.closest("button"))sfx(880,.05,.03)},sig);
 syncBtns();
}
