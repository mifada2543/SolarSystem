/* ===== STATE & UTIL DASAR =====
   Modul ini TIDAK mengimpor modul lokal apa pun — sama seperti data.js.
   Keduanya menjadi dasar yang mencegah circular import antar modul. */

/* ===== UTILS ===== */
export const $=s=>document.querySelector(s),ID="id-ID";
export const fmt=(n,d=0)=>n==null?"n/a":n.toLocaleString(ID,{maximumFractionDigits:d});
/* autoFocus: st.sel yang terisi LEWAT SCROLL (zoom ke planet di bawah kursor), bukan lewat
   klik. Bedanya penting: scroll-keluar hanya boleh melepas fokus otomatis ini, sedangkan
   pilihan yang diklik sendiri harus bertahan sampai dibuka panel / tampilan seluruh. */
export const st={paused:false,speed:10,unit:1,imp:false,orbits:true,labels:true,reduced:matchMedia("(prefers-reduced-motion: reduce)").matches,sel:null,autoFocus:false,pauseSel:false,date:new Date(),cmp:null,snd:false,bb:false}; // bb: penanda barycenter
export const UNITS=[["1 menit",1/1440],["1 jam",1/24],["1 hari",1],["1 bulan",30.44],["1 tahun",365.25]];
export const J2000=Date.UTC(2000,0,1,12);
export const LT=[];

/* State runtime berupa `let` — hanya boleh ditulis dari modul ini, karena itu setiap
   perubahan lewat mutator kecil (setSM, setSimDays, …) di bawah. */
export let simDays=(st.date-J2000)/864e5,cam="Tampilan Umum",slow=1,expl=false,SM=0;
export const setSimDays=v=>simDays=v,addSimDays=v=>simDays+=v,
             setCam=v=>cam=v,addSlow=v=>slow+=v,setExpl=v=>expl=v,setSM=v=>SM=v;

/* ===== SCALE MODES =====
   0 Penjelajah (terkompresi), 1 Relatif (jarak linear, ukuran akar), 2 Saintifik (1 satuan = 1e6 km) */
export const radOf=d=>SM===2?d/2e6:SM===1?.4*Math.sqrt(d/12756):Math.pow(d/12756,.42);
export const orbOf=m=>SM===2?m:SM===1?m/149.6*10:14*Math.sqrt(m/149.6);
export const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
export const D2R=Math.PI/180,NR=()=>orbOf(5906.4);

/* Diisi oleh bodies.js / orbits.js (push-only, sehingga boleh berupa const) */
export const bodies=[],cLb=[];
export const ac=new AbortController(),sig={signal:ac.signal};
export const byId=id=>bodies.find(b=>b.d.id===id);
export const planetByKey=n=>byId(PLK[n]);
const PLK=["mercury","venus","earth","mars","jupiter","saturn","uranus","neptune"];

/* yield ke event loop agar tiap tahap loading sempat di-paint (setTimeout lebih andal dari rAF) */
export const tick=()=>new Promise(r=>setTimeout(r,0));
export async function setLd(t){$("#ls").textContent=t;const l=document.createElement("li");l.textContent=t.replace(/…$/,"");$("#lu").appendChild(l);await tick()}
export function showFail(m){$("#err").style.display="flex";$("#em").textContent=m;$("#ld").classList.add("done")}
export function fail(m){showFail(m);throw new Error(m)}
export function setSim(v){if(!isFinite(v))return;simDays=v;st.date=new Date(J2000+v*864e5);$("#cd").value=st.date.toISOString().slice(0,10)}
