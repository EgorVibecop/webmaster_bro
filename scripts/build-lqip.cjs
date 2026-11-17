const sharp=require('sharp');
(async()=>{for(const n of ['day','night'])for(const v of ['d','m']){
 const src=`public/hero/${n}-${v}-v3.webp`;
 const w=v==='d'?48:28;
 await sharp(src).resize(w).blur(1.2).webp({quality:45}).toFile(`public/hero/${n}-${v}-lqip-v1.webp`);
}})();
