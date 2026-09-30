/* ===== DATA (NASA Planetary Fact Sheet — nssdc.gsfc.nasa.gov/planetary/factsheet) =====
   Catatan sumber (diperiksa ulang 30 Sep 2026):
   - Fisik 8 planet + Bulan + Matahari: NASA Planetary Fact Sheet.
   - Jumlah satelit: JPL SSD "Planetary Satellite Discovery Circumstances"
     (ssd.jpl.nasa.gov/sats/discovery.html) — 115 Jupiter, 293 Saturnus, 29 Uranus,
     16 Neptunus, 5 Pluto. Angka NASA Fact Sheet (Mar 2025) sudah tertinggal.
   - Elemen orbit J2000 (e, i, Ω, ϖ) + L0: JPL "Approximate Positions of the Planets"
     (Standish). Eksentrisitas 8 planet disamakan ke presisi JPL (bukan pembulatan
     NASA Fact Sheet) supaya seluruh rantai elemen satu sumber — selisih terbesar
     sebelumnya Neptunus 16,4% dan Saturnus 3,5%.
   - Planet kerdil: JPL SBDB (Ceres, Quaoar, Orcus, Salacia, Ixion) / Wikipedia
     (Eris, Haumea, Makemake). 4 KBO baru memakai epoch SBDB 2461200.5.
   Modul ini (bersama state.js) tidak mengimpor modul lokal apa pun — dasar pencegahan circular import. */
export const SRC="https://nssdc.gsfc.nasa.gov/planetary/factsheet/";

// [id,name,alias,symbol,type,distMkm,diaKm,[mantissa,exp10 kg],g m/s²,density kg/m³,rotationHours,yearDays,tilt°,orbSpeed km/s,ecc,meanTemp°C,moons,atmosphere,ringInfo,description,L0(mean longitude J2000°),texture]
// Mean longitude at J2000 from an epoch mean anomaly M, longitude of perihelion ϖ=Ω+ω, epoch JD and period (d)
const LM=(M,w,jd,P)=>M+w-360*(jd-2451545)/P;
const RAW=[
["mercury","Mercury","Merkurius","☿","Planet terestrial",57.9,4879,[3.30,23],3.7,5429,1407.6,88.0,0.034,47.4,0.2056,167,0,["Eksosfer sangat tipis (O₂, Na, H₂, He)"],"Tidak","Planet terkecil dan terdekat dari Matahari. Permukaannya penuh kawah dan suhunya berubah drastis antara siang dan malam.",252.25,["r","#8a8580","#5c5852"]],
["venus","Venus","Venus","♀","Planet terestrial",108.2,12104,[4.87,24],8.9,5243,5832.5,224.7,177.4,35.0,0.00678,464,0,["Karbon dioksida (~96,5%)","Nitrogen (~3,5%)"],"Tidak","Planet dengan atmosfer sangat tebal yang menahan panas, sehingga permukaannya lebih panas daripada Merkurius. Berotasi retrograde dengan sangat lambat.",181.98,["g",["#d9b77a","#c99a5b","#e8cf9c"]]],
["earth","Earth","Bumi","🌍","Planet terestrial",149.6,12756,[5.97,24],9.8,5514,23.9,365.2,23.4,29.8,0.01671,15,1,["Nitrogen (~78%)","Oksigen (~21%)","Argon (~0,9%)"],"Tidak","Satu-satunya tempat yang diketahui memiliki kehidupan. Sekitar 71% permukaannya tertutup air cair.",100.46,["e"]],
["mars","Mars","Mars","♂","Planet terestrial",228.0,6792,[6.42,23],3.7,3934,24.6,687.0,25.2,24.1,0.09339,-65,2,["Karbon dioksida (~95%)","Nitrogen (~2,8%)","Argon (~2%)"],"Tidak","Planet berdebu dan dingin dengan atmosfer tipis. Memiliki gunung berapi terbesar di Tata Surya, Olympus Mons.",355.45,["r","#b5583a","#7d3b26","caps"]],
["jupiter","Jupiter","Jupiter","♃","Raksasa gas",778.5,142984,[1.898,27],23.1,1326,9.9,4331,3.1,13.1,0.04839,-110,115,["Hidrogen (~90%)","Helium (~10%)"],"Ya (tipis)","Planet terbesar di Tata Surya dan merupakan raksasa gas yang didominasi hidrogen dan helium. Bintik Merah Besar adalah badai raksasa yang telah diamati selama berabad-abad.",34.40,["g",["#c9a887","#a5765a","#e3d3bd","#8c6a4f"],"grs"]],
["saturn","Saturn","Saturnus","♄","Raksasa gas",1432.0,120536,[5.68,26],9.0,687,10.7,10747,26.7,9.7,0.05386,-140,293,["Hidrogen (~96%)","Helium (~3%)"],"Ya (sistem cincin utama, sebagian besar es air)","Raksasa gas dengan sistem cincin paling menonjol. Kepadatan rata-ratanya lebih rendah daripada air.",49.95,["g",["#dcc38c","#c4a56c","#ead9a8"]]],
["uranus","Uranus","Uranus","⛢","Raksasa es",2867.0,51118,[8.68,25],8.7,1270,17.2,30589,97.8,6.8,0.04726,-195,29,["Hidrogen (~83%)","Helium (~15%)","Metana (~2,3%)"],"Ya (13 cincin redup)","Berotasi hampir menyamping (kemiringan ~98°). Warna biru-hijaunya berasal dari metana di atmosfer atas.",313.23,["g",["#9fd8dc","#8ccdd3","#b0e3e6"]]],
["neptune","Neptune","Neptunus","♆","Raksasa es",4515.0,49528,[1.02,26],11.0,1638,16.1,59800,28.3,5.4,0.00859,-200,16,["Hidrogen (~80%)","Helium (~19%)","Metana (~1,5%)"],"Ya (5 cincin utama, redup)","Planet terjauh dari Matahari, dengan angin supersonik tercepat yang tercatat di Tata Surya.",304.88,["g",["#3f63c9","#3352a8","#5479d8"]]],
["pluto","Pluto","Pluto","♇","Planet kerdil (dwarf planet)",5906.4,2376,[1.303,22],0.62,1854,153.3,90560,119.5,4.7,0.249,-229,5,["Nitrogen (dominan)","Metana","Karbon monoksida (sangat tipis)"],"Tidak","Planet kerdil di Sabuk Kuiper yang diklasifikasikan ulang oleh IAU pada 2006. Memiliki atmosfer tipis dan sistem satelit bersama Charon.",238.93,["r","#a08c7a","#6b5a4c"]],
["ceres","Ceres","Ceres","⚳","Planet kerdil (dwarf planet)",413.7,939,[9.38,20],0.28,2162,9.07,1679.91,4,17.9,0.0796,-105,0,["Eksosfer uap air sangat tipis"],"Tidak","Satu-satunya planet kerdil di sabuk asteroid utama (Mars–Jupiter). Permukaannya penuh kawah dengan endapan garam terang, misalnya di Kawah Occator.",LM(231.54,153.55,2461000.5,1679.91),["r","#7b7670","#4d4944"]],
["eris","Eris","Eris","○","Planet kerdil (dwarf planet)",10180.2,2326,[1.638,22],0.82,2430,25.9,205043.68,null,3.4,0.4357,-231,1,["Belum ada atmosfer yang terkonfirmasi"],"Tidak","Planet kerdil paling masif yang diketahui, berada di piringan tersebar (scattered disc). Penemuannya pada 2005 turut mendorong redefinisi 'planet' oleh IAU. Memiliki satu satelit, Dysnomia. Periode rotasi belum pasti.",LM(211.03,186.76,2460800.5,205043.68),["r","#c9c4bd","#9a958e"]],
["haumea","Haumea","Haumea","○","Planet kerdil (dwarf planet)",6450.1,1544,[4.0,21],null,2050,3.915,103410,null,4.5,0.1964,-241,2,["Belum ada atmosfer yang terkonfirmasi"],"Ya (cincin tipis, ditemukan 2017)","Berbentuk elipsoid memanjang akibat rotasi sangat cepat (~3,9 jam); dimensi ≈2.122 × 1.688 × 1.036 km (panjang × lebar × tinggi), diameter rata-rata ≈1.544 km. Memiliki dua satelit, Hiʻiaka dan Namaka. Gravitasi permukaan bervariasi (0,24–0,93 m/s²).",LM(218.205,1.208,2459200.5,103410),["r","#cfd3d6","#a9aeb2"]],
["makemake","Makemake","Makemake","○","Planet kerdil (dwarf planet)",6806.6,1430,[2.69,21],0.35,1760,22.83,112022,null,4.4,0.1604,-238,1,["Belum ada atmosfer yang terkonfirmasi"],"Tidak","Salah satu objek terbesar di sabuk Kuiper klasik; permukaannya diduga kaya es metana. Memiliki satu satelit kecil (S/2015 (136472) 1). Suhu permukaan sekitar 30–40 K.",LM(170.497,15.506,2461000.5,112022),["r","#b7846a","#8a5a44"]],
/* ===== 4 KBO tambahan (sabuk Kuiper). Sumber: JPL SBDB (elemen orbital & periode,
   epoch 2461200.5) + Wikipedia (fisik). Dist = jarak rata-rata (Mkm) = a(AU)×149,597,870,700.
   Massa/gravitasi/kepadatan yang belum diketahui dibiarkan null (tampil "n/a"). */
["quaoar","Quaoar","Quaoar","○","Planet kerdil (dwarf planet)",6462.6,1110,[1.2,21],0.26,1700,8.84,104000,null,4.53,0.0352,-229,1,[],"Ya (dua cincin sempit)","Planet kerdil terbesar kedua di sabuk Kuiper setelah Pluto (diameter ≈1.110 km). Mengorbit Matahari sekali tiap ±285 tahun dan didampingi bulan kecil Weywot. Pada 2023 dua cincin sempit ditemukan mengelilinginya, dengan radius jauh melebihi batas Roche-nya.",LM(293,352,2461200.5,104000),["r","#a8917c","#6e5a4b"]],
["orcus","Orcus","Orcus","○","Planet kerdil (dwarf planet)",5894.2,910,[6.4,20],0.20,1600,13.188,90300,null,4.74,0.2210,-231,1,[],"Tidak","Objek trans-Neptunian besar yang berbagi resonansi orbit 2:3 dengan Neptunus bersama Pluto, sehingga disebut plutino. Sama seperti Pluto, ia didampingi bulan besar bernama Vanth yang seukuran setengahnya.",LM(189,341.6,2461200.5,90300),["r","#9b958a","#615c53"]],
["salacia","Salacia","Salacia","○","Planet kerdil (dwarf planet)",6298.1,838,[4.7,20],0.18,1500,131.9,99600,null,4.59,0.1050,-230,1,[],"Tidak","Objek trans-Neptunian klasik (klassik 'hot') dengan albedo sangat rendah, ±0,041 — salah satu permukaan tergelap yang diketahui di Tata Surya. Bersama bulan Actaea ia membentuk sistem terkunci pasang surut ganda seperti Pluto–Charon.",LM(135,229,2461200.5,99600),["r","#7f7a74","#4e4a45"]],
["ixion","Ixion","Ixion","○","Planet kerdil (dwarf planet)",5879.2,697,null,null,null,12.4,90100,null,4.75,0.2440,-229,0,[],"Tidak","Plutino dengan permukaan sangat gelap dan kemerahan akibat tholin hasil radiasi kosmik jangka panjang. Massa, gravitasi, dan kepadatannya belum diketahui karena hingga kini tidak ditemukan bulan baginya.",LM(295,12.1,2461200.5,90100),["r","#a57f6b","#6a5144"]]];
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
const ORB={mercury:[7.00,48.33,77.46],venus:[3.39,76.68,131.60],earth:[0,0,102.94],mars:[1.85,49.56,336.06],jupiter:[1.30,100.47,14.73],saturn:[2.49,113.66,92.60],uranus:[0.77,74.02,170.95],neptune:[1.77,131.78,44.96],pluto:[17.14,110.30,224.07],ceres:[10.588,80.250,153.549],eris:[43.822,36.046,186.760],haumea:[28.214,122.167,1.208],makemake:[29.002,79.441,15.506],
 // Kuiper belt objects — JPL SBDB (epoch 2461200.5): [i°, Ω°, ϖ°]
 quaoar:[7.99,189.00,352.00],orcus:[20.60,268.00,341.60],salacia:[23.90,280.00,229.00],ixion:[19.70,71.10,12.10]};
/* Benih PRNG lokal untuk tekstur 4 KBO. Sengaja berbeda-beda supaya tekstur mereka
   tidak seragam, tapi TIDAK memakai rnd() bersama — lihat catatan di core.js. */
const KSEED={quaoar:20250930,orcus:20250947,salacia:20250964,ixion:20250981};
// rotDir: spin sign about the *tilted* axis. Retrograde spin (Venus 177.4°, Uranus 97.8°) is encoded by obliquity >90° (IAU/NASA convention), so +1 is correct for all.
PL.forEach(p=>{[p.inc,p.node,p.peri]=ORB[p.id];p.rotDir=1;p.dwarf=["pluto","ceres","eris","haumea","makemake","quaoar","orcus","salacia","ixion"].includes(p.id);p.texSeed=KSEED[p.id]||0});
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

/* ===== RASI BINTANG (22 rasi): n = nama tampilan (Indonesia), s = [RA (jam), Dec (°), mag]
   J2000 dari HYG Database (https://github.com/astronexus/HYG-Database), l = pasangan indeks garis
   dari figuran resmi Sky & Telescope 2014 (bobot 1–2; dipakai Stellarium). Koordinat diputar
   ekuatorial → ekliptika oleh buildCons(). ===== */
export const CON={
"Orion":{n:"Orion",s:[[5.919,7.41,0.45],[5.419,6.35,1.64],[5.533,-0.3,2.25],[5.603,-1.2,1.69],[5.679,-1.94,1.74],[5.242,-8.2,0.18],[5.796,-9.67,2.07]],l:[[0,4],[1,2],[2,3],[3,4],[4,6],[2,5],[0,1]]},
  Cassiopeia:{n:"Kasiopea",s:[[0.153,59.15,2.28],[0.675,56.54,2.24],[0.945,60.72,2.15],[1.43,60.24,2.66],[1.907,63.67,3.35]],l:[[0,1],[1,2],[2,3],[3,4]]},
  "Ursa Major":{n:"Beruang Besar",s:[[11.062,61.75,1.81],[11.031,56.38,2.34],[11.897,53.69,2.41],[12.257,57.03,3.32],[12.9,55.96,1.76],[13.399,54.93,2.23],[13.792,49.31,1.85]],l:[[0,1],[1,2],[2,3],[3,0],[3,4],[4,5],[5,6]]},
  "Ursa Minor":{n:"Beruang Kecil",s:[[2.53,89.264,1.97],[17.537,86.586,4.35],[16.766,82.037,4.21],[15.734,77.794,4.29],[16.292,75.755,4.95],[15.345,71.834,3.00],[14.845,74.156,2.07]],l:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,3]]},
  Cygnus:{n:"Salib Utara",s:[[20.691,45.28,1.25],[20.37,40.257,2.23],[20.77,33.97,2.48],[19.512,27.96,3.05],[19.75,45.131,2.86]],l:[[0,1],[1,2],[1,3],[1,4]]},
  Lyra:{n:"Lira",s:[[18.616,38.784,0.03],[18.74,39.613,4.59],[18.746,37.605,4.34],[18.908,36.899,4.22],[18.982,32.69,3.25],[18.835,33.363,3.52]],l:[[0,1],[1,2],[2,0],[2,3],[3,4],[4,5],[5,2]]},
  Aquila:{n:"Elang",s:[[19.922,6.407,3.71],[19.846,8.868,0.76],[19.771,10.613,2.72],[19.425,3.115,3.36],[19.104,-4.883,3.43],[19.09,13.863,2.99],[19.875,1.006,3.87],[20.188,-0.821,3.24]],l:[[0,1],[1,2],[2,3],[3,4],[3,5],[3,6],[6,7]]},
  Scorpius:{n:"Kalajengking",s:[[16.091,-19.805,2.56],[16.006,-22.622,2.29],[15.981,-26.114,2.89],[16.353,-25.593,2.90],[16.49,-26.432,1.06],[16.598,-28.216,2.82],[16.836,-34.293,2.29],[16.865,-38.047,3.00],[16.91,-42.361,3.62],[17.203,-43.239,3.32],[17.622,-42.998,1.86],[17.793,-40.127,2.99],[17.708,-39.03,2.39],[17.513,-37.296,2.70],[17.56,-37.104,1.62],[17.831,-37.043,3.19]],l:[[0,1],[1,2],[1,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,12],[12,13],[13,14],[14,15]]},
  Sagittarius:{n:"Pemanah",s:[[18.403,-34.385,1.79],[18.097,-30.424,2.98],[18.35,-29.828,2.72],[18.466,-25.422,2.82],[18.761,-26.991,3.17],[18.921,-26.297,2.05],[19.116,-27.67,3.32],[19.044,-29.88,2.60]],l:[[0,1],[1,2],[2,0],[2,3],[3,4],[4,2],[4,5],[5,6],[6,7],[7,4],[7,0]]},
  Leo:{n:"Singa",s:[[10.14,11.967,1.36],[10.122,16.763,3.48],[10.333,19.841,2.01],[10.278,23.417,3.43],[9.879,26.007,3.88],[9.764,23.774,2.97],[11.235,20.524,2.56],[11.818,14.572,2.14],[11.237,15.43,3.33]],l:[[0,1],[1,2],[2,3],[3,4],[4,5],[2,6],[6,7],[7,8],[8,6],[8,1]]},
  Taurus:{n:"Banteng",s:[[5.627,21.143,2.97],[4.599,16.509,0.87],[4.478,15.871,3.40],[4.33,15.628,3.65],[4.382,17.543,3.77],[4.477,19.18,3.53],[5.438,28.607,1.65],[4.011,12.49,3.41],[3.453,9.733,3.73]],l:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[3,7],[7,8]]},
  "Canis Major":{n:"Anjing Besar",s:[[6.378,-17.956,1.98],[6.752,-16.716,-1.44],[7.14,-26.393,1.83],[6.977,-28.972,1.50],[7.402,-29.303,2.45],[6.611,-19.256,3.95],[6.902,-24.184,3.89]],l:[[0,1],[1,2],[2,3],[2,4],[0,5],[5,6],[6,3]]},
  "Canis Minor":{n:"Anjing Kecil",s:[[7.655,5.225,0.40],[7.453,8.289,2.89]],l:[[0,1]]},
  Bootes:{n:"Penggembala",s:[[14.261,19.182,-0.05],[14.75,27.074,2.35],[15.258,33.315,3.46],[15.032,40.391,3.49],[14.535,38.308,3.04],[14.53,30.371,3.57]],l:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]]},
  Pegasus:{n:"Kuda Terbang",s:[[22.166,33.178,4.28],[22.717,30.221,2.93],[23.063,28.083,2.44],[22.833,24.602,3.51],[22.776,23.566,3.97],[22.117,25.345,3.77],[21.744,25.645,4.14],[0.14,29.09,2.07],[23.079,15.205,2.49],[0.221,15.184,2.83],[21.736,9.875,2.38],[22.17,6.198,3.52],[22.691,10.831,3.41]],l:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[7,2],[2,8],[8,9],[9,7],[10,11],[11,12],[12,8]]},
  Auriga:{n:"Kusir",s:[[5.438,28.607,1.65],[4.95,33.166,2.69],[5.109,41.234,3.18],[5.278,45.998,0.08],[5.992,44.947,1.90],[5.995,37.213,2.65],[5.041,41.076,3.69],[5.033,43.823,3.03],[5.992,54.285,3.72]],l:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[2,6],[6,7],[7,3],[3,8],[8,4]]},
  Virgo:{n:"Perawan",s:[[12.332,-0.667,3.89],[12.087,8.733,4.12],[11.764,6.529,4.04],[11.845,1.765,3.59],[12.694,-1.449,2.74],[12.927,3.397,3.39],[13.036,10.959,2.85],[13.166,-5.539,4.38],[13.42,-11.161,0.98],[13.578,-0.596,3.38],[14.027,1.545,4.23],[14.771,1.893,3.73],[14.267,-6.001,4.07],[14.718,-5.658,3.87]],l:[[0,1],[1,2],[2,3],[3,0],[0,4],[4,5],[5,6],[4,7],[7,8],[4,9],[9,10],[10,11],[9,12],[12,13]]},
  Perseus:{n:"Perseus",s:[[3.739,32.288,3.84],[3.902,31.884,2.84],[3.983,35.791,3.98],[3.964,40.01,2.90],[3.715,47.788,3.01],[3.405,49.861,1.79],[3.08,53.506,2.91],[2.845,55.895,3.77],[2.904,52.762,3.93],[3.151,49.613,4.05],[3.158,44.858,3.79],[3.136,40.956,2.09],[3.086,38.84,3.32]],l:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,6],[8,9],[9,5],[9,10],[10,11],[11,3],[11,12]]},
  Andromeda:{n:"Andromeda",s:[[0.14,29.09,2.07],[0.655,30.861,3.27],[1.162,35.621,2.07],[2.065,42.33,2.10]],l:[[0,1],[1,2],[2,3]]},
  Crux:{n:"Salib Selatan",s:[[12.443,-63.099,0.77],[12.519,-57.113,1.59],[12.795,-59.689,1.25],[12.252,-58.749,2.79]],l:[[0,1],[2,3]]},
  Centaurus:{n:"Centaurus",s:[[12.692,-48.96,2.20],[13.665,-53.466,2.29],[14.064,-60.373,0.61],[14.661,-60.834,-0.01],[13.926,-47.288,2.55],[13.978,-44.804,3.87],[13.971,-42.101,3.83],[14.592,-42.158,2.33],[14.101,-41.18,4.36],[14.343,-37.885,4.05],[14.111,-36.37,2.06],[13.825,-41.688,3.41]],l:[[0,1],[1,2],[2,3],[1,4],[4,0],[4,5],[5,6],[6,7],[6,8],[8,9],[9,10],[10,11],[11,4]]},
  Carina:{n:"Lambung Kapal",s:[[6.399,-52.696,-0.62],[9.22,-69.717,1.67],[10.229,-70.038,3.29],[10.716,-64.394,2.74],[10.534,-61.685,3.30],[10.285,-61.332,3.39],[9.285,-59.275,2.21],[8.745,-54.709,1.93]],l:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7]]}};
