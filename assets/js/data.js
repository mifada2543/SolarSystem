/* ===== DATA (NASA Planetary Fact Sheet — nssdc.gsfc.nasa.gov/planetary/factsheet) =====
   Modul ini (bersama state.js) tidak mengimpor modul lokal apa pun — dasar pencegahan circular import. */
export const SRC="https://nssdc.gsfc.nasa.gov/planetary/factsheet/";

// [id,name,alias,symbol,type,distMkm,diaKm,[mantissa,exp10 kg],g m/s²,density kg/m³,rotationHours,yearDays,tilt°,orbSpeed km/s,ecc,meanTemp°C,moons,atmosphere,ringInfo,description,L0(mean longitude J2000°),texture]
// Mean longitude at J2000 from an epoch mean anomaly M, longitude of perihelion ϖ=Ω+ω, epoch JD and period (d)
const LM=(M,w,jd,P)=>M+w-360*(jd-2451545)/P;
const RAW=[
["mercury","Mercury","Merkurius","☿","Planet terestrial",57.9,4879,[3.30,23],3.7,5429,1407.6,88.0,0.034,47.4,0.205,167,0,["Eksosfer sangat tipis (O₂, Na, H₂, He)"],"Tidak","Planet terkecil dan terdekat dari Matahari. Permukaannya penuh kawah dan suhunya berubah drastis antara siang dan malam.",252.25,["r","#8a8580","#5c5852"]],
["venus","Venus","Venus","♀","Planet terestrial",108.2,12104,[4.87,24],8.9,5243,5832.5,224.7,177.4,35.0,0.007,464,0,["Karbon dioksida (~96,5%)","Nitrogen (~3,5%)"],"Tidak","Planet dengan atmosfer sangat tebal yang menahan panas, sehingga permukaannya lebih panas daripada Merkurius. Berotasi retrograde dengan sangat lambat.",181.98,["g",["#d9b77a","#c99a5b","#e8cf9c"]]],
["earth","Earth","Bumi","🌍","Planet terestrial",149.6,12756,[5.97,24],9.8,5514,23.9,365.2,23.4,29.8,0.017,15,1,["Nitrogen (~78%)","Oksigen (~21%)","Argon (~0,9%)"],"Tidak","Satu-satunya tempat yang diketahui memiliki kehidupan. Sekitar 71% permukaannya tertutup air cair.",100.46,["e"]],
["mars","Mars","Mars","♂","Planet terestrial",228.0,6792,[6.42,23],3.7,3934,24.6,687.0,25.2,24.1,0.094,-65,2,["Karbon dioksida (~95%)","Nitrogen (~2,8%)","Argon (~2%)"],"Tidak","Planet berdebu dan dingin dengan atmosfer tipis. Memiliki gunung berapi terbesar di Tata Surya, Olympus Mons.",355.45,["r","#b5583a","#7d3b26","caps"]],
["jupiter","Jupiter","Jupiter","♃","Raksasa gas",778.5,142984,[1.898,27],23.1,1326,9.9,4331,3.1,13.1,0.049,-110,95,["Hidrogen (~90%)","Helium (~10%)"],"Ya (tipis)","Planet terbesar di Tata Surya dan merupakan raksasa gas yang didominasi hidrogen dan helium. Bintik Merah Besar adalah badai raksasa yang telah diamati selama berabad-abad.",34.40,["g",["#c9a887","#a5765a","#e3d3bd","#8c6a4f"],"grs"]],
["saturn","Saturn","Saturnus","♄","Raksasa gas",1432.0,120536,[5.68,26],9.0,687,10.7,10747,26.7,9.7,0.052,-140,274,["Hidrogen (~96%)","Helium (~3%)"],"Ya (sistem cincin utama, sebagian besar es air)","Raksasa gas dengan sistem cincin paling menonjol. Kepadatan rata-ratanya lebih rendah daripada air.",49.94,["g",["#dcc38c","#c4a56c","#ead9a8"]]],
["uranus","Uranus","Uranus","⛢","Raksasa es",2867.0,51118,[8.68,25],8.7,1271,17.2,30589,97.8,6.8,0.047,-195,29,["Hidrogen (~83%)","Helium (~15%)","Metana (~2,3%)"],"Ya (13 cincin redup)","Berotasi hampir menyamping (kemiringan ~98°). Warna biru-hijaunya berasal dari metana di atmosfer atas.",313.23,["g",["#9fd8dc","#8ccdd3","#b0e3e6"]]],
["neptune","Neptune","Neptunus","♆","Raksasa es",4515.0,49528,[1.02,26],11.0,1638,16.1,59800,28.3,5.4,0.010,-200,16,["Hidrogen (~80%)","Helium (~19%)","Metana (~1,5%)"],"Ya (5 cincin utama, redup)","Planet terjauh dari Matahari, dengan angin supersonik tercepat yang tercatat di Tata Surya.",304.88,["g",["#3f63c9","#3352a8","#5479d8"]]],
["pluto","Pluto","Pluto","♇","Planet kerdil (dwarf planet)",5906.4,2376,[1.303,22],0.62,1854,153.3,90560,122.5,4.7,0.249,-229,5,["Nitrogen (dominan)","Metana","Karbon monoksida (sangat tipis)"],"Tidak","Planet kerdil di Sabuk Kuiper yang diklasifikasikan ulang oleh IAU pada 2006. Memiliki atmosfer tipis dan sistem satelit bersama Charon.",238.93,["r","#a08c7a","#6b5a4c"]],
["ceres","Ceres","Ceres","⚳","Planet kerdil (dwarf planet)",413.7,939,[9.38,20],0.28,2162,9.07,1679.91,4,17.9,0.0796,-105,0,["Eksosfer uap air sangat tipis"],"Tidak","Satu-satunya planet kerdil di sabuk asteroid utama (Mars–Jupiter). Permukaannya penuh kawah dengan endapan garam terang, misalnya di Kawah Occator.",LM(231.54,153.55,2461000.5,1679.91),["r","#7b7670","#4d4944"]],
["eris","Eris","Eris","○","Planet kerdil (dwarf planet)",10180.2,2326,[1.638,22],0.82,2430,25.9,205043.68,null,3.4,0.4357,-231,1,["Belum ada atmosfer yang terkonfirmasi"],"Tidak","Planet kerdil paling masif yang diketahui, berada di piringan tersebar (scattered disc). Penemuannya pada 2005 turut mendorong redefinisi 'planet' oleh IAU. Memiliki satu satelit, Dysnomia. Periode rotasi belum pasti.",LM(211.03,186.76,2460800.5,205043.68),["r","#c9c4bd","#9a958e"]],
["haumea","Haumea","Haumea","○","Planet kerdil (dwarf planet)",6450.1,1544,[4.0,21],null,2050,3.915,103410,null,4.5,0.1964,-241,2,["Belum ada atmosfer yang terkonfirmasi"],"Ya (cincin tipis, ditemukan 2017)","Berbentuk elipsoid memanjang akibat rotasi sangat cepat (~3,9 jam); dimensi ≈2.122×1.688×1.036 km, diameter rata-rata ≈1.544 km. Memiliki dua satelit, Hiʻiaka dan Namaka. Gravitasi permukaan bervariasi (0,24–0,93 m/s²).",LM(218.205,1.208,2459200.5,103410),["r","#cfd3d6","#a9aeb2"]],
["makemake","Makemake","Makemake","○","Planet kerdil (dwarf planet)",6806.6,1430,[2.69,21],0.35,1760,22.83,112022,null,4.4,0.1604,-238,1,["Belum ada atmosfer yang terkonfirmasi"],"Tidak","Salah satu objek terbesar di sabuk Kuiper klasik; permukaannya diduga kaya es metana. Memiliki satu satelit kecil (S/2015 (136472) 1). Suhu permukaan sekitar 30–40 K.",LM(170.497,15.506,2461000.5,112022),["r","#b7846a","#8a5a44"]]];
const KEYS=["id","name","alias","sym","type","dist","dia","mass","g","dens","rot","year","tilt","spd","ecc","temp","moons","atm","ring","desc","L0","tex"];
export const PL=RAW.map(a=>Object.fromEntries(KEYS.map((k,i)=>[k,a[i]])));

// Matahari — BUKAN bagian PL supaya pintasan "1–8" tetap menunjuk ke 8 planet pertama.
export const SUN={id:"sun",name:"Sun",alias:"Matahari",sym:"☉",star:true,type:"Bintang deret utama (G2V)",
 dist:null,dia:1392700,mass:[1.989,30],g:274,dens:1408,rot:607.1,year:null,tilt:7.25,spd:null,ecc:null,
 temp:5505,moons:8,atm:["Hidrogen (~73%)","Helium (~25%)","Oksigen, besi, silikon (bekas)"],
 ring:"Tidak",
 desc:"Matahari adalah bintang di pusat Tata Surya dan menyimpan sekitar 99,86% massa seluruh sistem. Ia berupa bola plasma yang dipanaskan oleh fusi inti hidrogen menjadi helium, dan cahayanya butuh sekitar 8 menit 20 detik untuk mencapai Bumi.",
 L0:0,tex:null};

// Orbital elements [inclination°, ascending node Ω°, longitude of perihelion ϖ°] — JPL "Approximate Positions of the Planets" (Standish), J2000 ecliptic.
const ORB={mercury:[7.00,48.33,77.46],venus:[3.39,76.68,131.60],earth:[0,0,102.94],mars:[1.85,49.56,336.06],jupiter:[1.30,100.47,14.73],saturn:[2.49,113.66,92.60],uranus:[0.77,74.02,170.95],neptune:[1.77,131.78,44.96],pluto:[17.14,110.30,224.07],ceres:[10.588,80.250,153.549],eris:[43.822,36.046,186.760],haumea:[28.214,122.167,1.208],makemake:[29.002,79.441,15.506]};
// rotDir: spin sign about the *tilted* axis. Retrograde spin (Venus 177.4°, Uranus 97.8°) is encoded by obliquity >90° (IAU/NASA convention), so +1 is correct for all.
PL.forEach(p=>{[p.inc,p.node,p.peri]=ORB[p.id];p.rotDir=1;p.dwarf=["pluto","ceres","eris","haumea","makemake"].includes(p.id)});
SUN.rotDir=1;

export const MOON={id:"moon",name:"Moon",alias:"Bulan",sym:"☾",type:"Satelit alami Bumi",dist:0.3844,dia:3475,mass:[7.35,22],g:1.62,dens:3344,rot:655.7,year:27.3,tilt:6.7,spd:1.02,ecc:0.055,temp:-20,moons:0,atm:["Eksosfer sangat tipis (He, Ne, H₂, Ar)"],ring:"Tidak",desc:"Satu-satunya satelit alami Bumi. Sebagai referensi, satu orbit mengelilingi Bumi memakan waktu ~27,3 hari.",moon:true};

/* ===== REPRESENTATIVE MOONS (subset). [parent,id,name,diaKm,[m,e]kg,g,dens,periodD,km/s,ecc,meanT°C,semiMajorKm,atm,desc,col,col2,retro] ===== */
export const SATROWS=[
["jupiter","io","Io",3643,[8.93,22],1.80,3528,1.769,17.3,.004,-163,421800,["Sangat tipis (SO₂)"],"Benda paling aktif secara vulkanik di Tata Surya.","#d8c060","#a0782a"],
["jupiter","europa","Europa",3122,[4.80,22],1.31,3013,3.551,13.7,.009,-171,671100,["Eksosfer O₂ sangat tipis"],"Berkerak es dengan samudra air cair di bawahnya.","#cfc8b8","#9a6a4a"],
["jupiter","ganymede","Ganymede",5268,[1.48,23],1.43,1936,7.155,10.9,.001,-163,1070400,["Eksosfer O₂ sangat tipis"],"Bulan terbesar di Tata Surya, lebih besar dari Merkurius.","#8b8378","#5a5248"],
["jupiter","callisto","Callisto",4821,[1.08,23],1.24,1834,16.689,8.2,.007,-139,1882700,["Sangat tipis (CO₂)"],"Permukaannya sangat tua dan penuh kawah.","#5f574e","#3a352f"],
["saturn","titan","Titan",5150,[1.35,23],1.35,1881,15.945,5.6,.029,-179,1221870,["Nitrogen (~95%)","Metana (~5%)"],"Satu-satunya bulan dengan atmosfer tebal; memiliki danau metana cair.","#c8963c","#8a5f22"],
["neptune","triton","Triton",2707,[2.14,22],.78,2061,5.877,4.4,0,-235,354760,["Nitrogen sangat tipis"],"Mengorbit retrograde; diduga objek Sabuk Kuiper yang tertangkap.","#c9c0b8","#9aa0a8",true]];

/* ===== CONSTELLATIONS: brightest-star RA (h) / Dec (°), J2000; rotated equatorial->ecliptic ===== */
export const CON={Orion:{s:[[5.919,7.41],[5.419,6.35],[5.533,-.30],[5.603,-1.20],[5.679,-1.94],[5.242,-8.20],[5.796,-9.67]],l:[[0,4],[1,2],[2,3],[3,4],[4,6],[2,5],[0,1]]},
 Cassiopeia:{s:[[.153,59.15],[.675,56.54],[.945,60.72],[1.430,60.24],[1.907,63.67]],l:[[0,1],[1,2],[2,3],[3,4]]},
 "Ursa Major":{s:[[11.062,61.75],[11.031,56.38],[11.897,53.69],[12.257,57.03],[12.900,55.96],[13.399,54.93],[13.792,49.31]],l:[[0,1],[1,2],[2,3],[3,0],[3,4],[4,5],[5,6]]}};
