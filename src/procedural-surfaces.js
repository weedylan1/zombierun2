// Shared, deterministic surfaces generated locally; no downloaded art.
export function surfacePixels(kind,size=128){
 const pixels=new Uint8ClampedArray(size*size*4);let seed=81231;
 const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4,n=(noise()-.5)*24;
  let c=kind==='road'?[48,52,54]:kind==='pavement'?[137,134,123]:kind==='grass'?[60,78,48]:[93,85,71];
  const seam=kind==='pavement'&&(y%32<2||(x+(Math.floor(y/32)%2)*32)%64<2);
  const crack=kind==='road'&&Math.abs(x-((y*0.37+Math.sin(y*.13)*9)%size))<.65;
  const shade=seam?-34:crack?-22:n;
  for(let k=0;k<3;k++)pixels[i+k]=Math.max(0,Math.min(255,c[k]+shade));pixels[i+3]=255;
 }return pixels;
}
export function applySurface(pc,app,material,kind){
 const size=128,c=document.createElement('canvas');c.width=c.height=size;
 const g=c.getContext('2d'),data=g.createImageData(size,size);data.data.set(surfacePixels(kind,size));g.putImageData(data,0,0);
 const tex=new pc.Texture(app.graphicsDevice,{width:size,height:size,mipmaps:true});tex.setSource(c);
 material.diffuse=new pc.Color(1,1,1);material.diffuseMap=tex;material.gloss=.08;material.update();
}
export function scaledSurface(pc,base,scale,cache){
 const x=Math.max(1,Math.round(scale.x/3)),y=Math.max(1,Math.round(Math.max(scale.z,scale.y)/3));
 const key=base.id+':'+x+':'+y;if(cache.has(key))return cache.get(key);
 const m=base.clone();m.diffuseMapTiling=new pc.Vec2(x,y);m.update();cache.set(key,m);return m;
}
