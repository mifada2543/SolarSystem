/* ===== PROCEDURAL TEXTURES (tanpa aset eksternal => tanpa risiko gagal muat) =====
   PENTING: rnd() memakai seed yang dibagikan dengan hamparan bintang. Urutan pemanggilan
   dari init() tidak boleh diubah, karena warna & tekstur ditentukan oleh urutan tersebut. */
import * as THREE from 'three/webgpu';
import {LT} from './state.js';

let _s=7;
export const rnd=()=>(_s=_s*16807%2147483647)/2147483647;

export function mk(w,h,f){const c=document.createElement("canvas");c.width=w;c.height=h;f(c.getContext("2d"),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t}
export const blob=(x,w,h,col,n,rmin,rmax,a0,a1)=>{for(let i=0;i<n;i++){x.globalAlpha=a0+rnd()*(a1-a0);x.fillStyle=col;x.beginPath();x.ellipse(rnd()*w,rnd()*h,rmin+rnd()*rmax,(rmin+rnd()*rmax)*.6,rnd()*3,0,7);x.fill()}x.globalAlpha=1};

export function texFor(t){
 if(t[0]==="r")return mk(512,256,(x,w,h)=>{x.fillStyle=t[1];x.fillRect(0,0,w,h);blob(x,w,h,t[2],260,2,16,.1,.35);blob(x,w,h,"#fff",90,1,6,.04,.12);if(t[3]==="caps"){x.fillStyle="#f2f2f2";x.globalAlpha=.9;x.fillRect(0,0,w,9);x.fillRect(0,h-11,w,11);x.globalAlpha=1}});
 if(t[0]==="g")return mk(512,256,(x,w,h)=>{for(let y=0;y<h;y+=2){x.fillStyle=t[1][(rnd()*t[1].length)|0];x.globalAlpha=.6;x.fillRect(0,y,w,2+rnd()*7)}x.globalAlpha=1;blob(x,w,h,"#fff",30,4,14,.04,.1);if(t[2]==="grs"){x.fillStyle="#b4553a";x.globalAlpha=.9;x.beginPath();x.ellipse(360,h*.62,24,13,0,0,7);x.fill();x.globalAlpha=1}});
 return mk(512,256,(x,w,h)=>{x.fillStyle="#1b4d8f";x.fillRect(0,0,w,h);[[110,90],[160,160],[300,80],[350,150],[430,60],[400,200]].forEach(c=>{for(let i=0;i<40;i++){x.fillStyle=rnd()<.25?"#a89a6a":"#3f7a3c";x.globalAlpha=.9;const ex=c[0]+(rnd()-.5)*90,ey=c[1]+(rnd()-.5)*50;x.beginPath();x.ellipse(ex,ey,6+rnd()*18,4+rnd()*11,rnd()*3,0,7);x.fill();if(rnd()<.7)LT.push([ex+(rnd()-.5)*22,ey+(rnd()-.5)*12])}});x.globalAlpha=1;x.fillStyle="#eef4fa";x.fillRect(0,0,w,14);x.fillRect(0,h-16,w,16)});
}
export const glowTex=(c)=>mk(128,128,(x)=>{const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,c+"1)");g.addColorStop(.25,c+".45)");g.addColorStop(1,c+"0)");x.fillStyle=g;x.fillRect(0,0,128,128)});
