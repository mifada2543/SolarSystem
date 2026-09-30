/* ===== TSL / MATERI KUSTOM =====
   WebGPURenderer tidak mendaftarkan ShaderMaterial ke StandardNodeLibrary, sehingga semua
   shader kustom HARUS berupa TSL (colorNode / opacityNode / emissiveNode), bukan GLSL. */
import * as THREE from 'three/webgpu';
import { materialColor, materialEmissive, normalWorld, positionView, positionWorld,
         modelViewMatrix, modelWorldMatrix, vec3, vec4, pow, max, smoothstep,
         select, and, greaterThan, lessThan, abs, sqrt } from 'three/tsl';

/* Atmosfer: shell BackSide additive, digantikan secara analitik di TSL.
   Normal dibangun dari posisi fragment terhadap pusat objek di ruang lalu, karena
   normalView tidak otomatis di-balik untuk material BackSide. */
export const atmoGeo=(r,k)=>new THREE.SphereGeometry(r*k,32,24);
export function atmoMat(col){
 const m=new THREE.MeshBasicMaterial({side:THREE.BackSide,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false});
 const cV=modelViewMatrix.mul(vec4(0,0,0,1)).xyz;
 const nFlip=positionView.sub(cV).normalize().negate();      // BackSide -> normal dibalik
 const rim=pow(max(nFlip.z.negate().add(0.72),0),3);          // pow(max(.72 - n.z, 0), 3)
 m.colorNode=vec3(col[0],col[1],col[2]).mul(rim).mul(1.05);
 m.opacityNode=rim;
 return m;
}

/* Lampu kota Bumi hanya di sisi yang menghadap jauh dari Matahari (menggantikan onBeforeCompile) */
export function cityLights(m){
 const dirSun=positionWorld.negate().normalize();
 m.emissiveNode=materialEmissive.mul(smoothstep(-0.05,0.2,normalWorld.dot(dirSun).negate()));
}

/* Bayangan timbal balik Saturnus (analitik, TSL):
   - cincin dilempari bayangan planet (uji ray-sphere, sh=0.12)
   - planet dilempari bayangan cincin (ray memotong bidang cincin 1,35–2,4 R, sh=0.45)
   Semua dihitung dari matrix objek sehingga tidak perlu uniform yang diperbarui tiap frame. */
export function patchShadow(m,planet,R0){
 const cW=modelWorldMatrix.mul(vec4(0,0,0,1)).xyz;                                   // pusat Saturnus (dunia)
 const Rw=modelWorldMatrix.mul(vec4(R0,0,0,1)).xyz.sub(cW).length();                  // jari-jari Saturnus (dunia)
 const D=positionWorld.negate().normalize();                                          // arah fragmen -> Matahari (origin dunia)
 let sh;
 if(planet){
  const nW=modelWorldMatrix.mul(vec4(0,1,0,0)).xyz.normalize();                       // normal bidang cincin (dunia)
  const dn=D.dot(nW),dnOk=greaterThan(abs(dn),1e-4);
  const t=cW.sub(positionWorld).dot(nW).div(select(dnOk,dn,1e-4));
  const rr=positionWorld.add(D.mul(t)).sub(cW).length().div(Rw);
  sh=select(and(dnOk,and(greaterThan(t,0),and(greaterThan(rr,1.35),lessThan(rr,2.4)))),0.45,1);
 }else{
  const oc=positionWorld.sub(cW),b=oc.dot(D);
  const dsc=b.mul(b).sub(oc.dot(oc)).add(Rw.mul(Rw));
  sh=select(and(greaterThan(dsc,0),greaterThan(b.negate().sub(sqrt(max(dsc,0))),0)),0.12,1);
 }
 m.colorNode=materialColor.mul(sh);
}
