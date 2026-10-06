import {seededRandom} from './quality-profiles.js';
const PALETTES={road:[53,57,60],wet:[43,48,51],pavement:[150,146,132],brick:[123,64,43],stone:[167,160,142],metal:[80,90,93],wood:[100,77,49],grass:[65,81,49]};
// Relief, colour and material properties describe the same physical surface.
export function surfaceData(kind,size=256){
    const random=seededRandom(7139),albedo=new Uint8ClampedArray(size*size*4),orm=new Uint8ClampedArray(albedo.length),height=new Float32Array(size*size);
    const base=PALETTES[kind]||PALETTES.stone;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
        const u=x/size,v=y/size,i=y*size+x,p=i*4,n=random();let relief=.5,shade=(n-.5)*22,ao=1,rough=.88,metal=0;
        if(kind==='brick'){
            const row=Math.floor(v*16),fx=(u*8+(row%2)*.5)%1,fy=(v*16)%1,mortar=fx<.045||fy<.09;
            relief=mortar?.22:.72+(n-.5)*.10;shade+=mortar?40:Math.sin(Math.floor(u*8+(row%2)*.5)*19+row*43)*15;ao=mortar?.65:1;
        }else if(kind==='pavement'||kind==='stone'){
            const row=Math.floor(v*4),fx=(u*4+(row%2)*.5)%1,fy=(v*4)%1,seam=fx<.025||fy<.025;
            relief=seam?.15:.65+(n-.5)*.04;shade+=seam?-55:Math.sin(row*32+Math.floor(u*4)*71)*7;ao=seam?.55:1;
        }else if(kind==='road'||kind==='wet'){
            relief=.48+(n-.5)*.15;const patch=Math.sin(u*21+Math.sin(v*13)*2)*Math.cos(v*17);
            shade+=patch*7;rough=kind==='wet'?.25+.32*(patch*.5+.5):.94;
        }else if(kind==='wood'){const grain=Math.sin(u*200+Math.sin(v*8)*4);relief=.5+grain*.06;shade+=grain*17;
        }else if(kind==='metal'){relief=.5+(n-.5)*.015;rough=.42;metal=.8;shade+=Math.sin(v*120)*4;}
        height[i]=relief;for(let c=0;c<3;c++)albedo[p+c]=base[c]+shade;albedo[p+3]=255;
        orm[p]=ao*255;orm[p+1]=rough*255;orm[p+2]=metal*255;orm[p+3]=255;
    }
    const normal=new Uint8ClampedArray(albedo.length);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
        const p=(y*size+x)*4,dx=(height[y*size+(x+1)%size]-height[y*size+(x+size-1)%size])*2.5;
        const dy=(height[((y+1)%size)*size+x]-height[((y+size-1)%size)*size+x])*2.5,l=Math.hypot(dx,dy,1);
        normal[p]=(-dx/l*.5+.5)*255;normal[p+1]=(-dy/l*.5+.5)*255;normal[p+2]=(1/l*.5+.5)*255;normal[p+3]=255;
    }
    return {albedo,normal,orm};
}
export function surfacePixels(kind,size=128){return surfaceData(kind,size).albedo;}
export function createPBRLibrary(pc,app){
    const maps=new Map(),bindings=[];let size=app.townProfile?.textureSize||512;
    function texture(pixels,n,srgb){
        const c=document.createElement('canvas');c.width=c.height=n;const g=c.getContext('2d'),data=g.createImageData(n,n);data.data.set(pixels);g.putImageData(data,0,0);
        const t=new pc.Texture(app.graphicsDevice,{width:n,height:n,mipmaps:true,format:srgb?pc.PIXELFORMAT_SRGBA8:pc.PIXELFORMAT_RGBA8});t.setSource(c);t.addressU=t.addressV=pc.ADDRESS_REPEAT;t.anisotropy=4;return t;
    }
    function getMaps(kind){const key=kind+size;if(!maps.has(key)){const d=surfaceData(kind,size);maps.set(key,{albedo:texture(d.albedo,size,true),normal:texture(d.normal,size,false),orm:texture(d.orm,size,false)});}return maps.get(key);}
    function bind(m,kind){const b=getMaps(kind);m.diffuseMap=b.albedo;m.normalMap=b.normal;m.bumpiness=kind==='brick'?.5:kind==='road'||kind==='wet'||kind==='grass'?.15:.32;m.glossMap=b.orm;m.glossMapChannel='g';m.glossInvert=true;m.gloss=1;m.aoMap=b.orm;m.aoMapChannel='r';m.useMetalness=true;m.metalnessMap=b.orm;m.metalnessMapChannel='b';m.metalness=1;m.update();}
    function track(m,kind){bindings.push({m,kind});bind(m,kind);return m;}
    function material(kind,tint=null,tileX=1,tileY=1){const m=new pc.StandardMaterial();m.name='PBR '+kind;m.diffuse=tint?tint.clone():new pc.Color(1,1,1);for(const key of ['diffuseMapTiling','normalMapTiling','glossMapTiling','aoMapTiling','metalnessMapTiling'])m[key]=new pc.Vec2(tileX,tileY);return track(m,kind);}
    return {material,track,setQuality(profile){size=profile.textureSize;for(const {m,kind} of bindings)bind(m,kind);},get residentTextureSets(){return maps.size;}};
}
export function applySurface(pc,app,material,kind){const lib=app._townPBR??=createPBRLibrary(pc,app);material.diffuse=new pc.Color(1,1,1);lib.track(material,kind);}
export function scaledSurface(pc,base,scale,cache){
    const x=Math.max(1,Math.round(scale.x/3)),y=Math.max(1,Math.round(Math.max(scale.z,scale.y)/3)),key=base.id+':'+x+':'+y;
    if(cache.has(key))return cache.get(key);const m=base.clone();for(const k of ['diffuseMapTiling','normalMapTiling','glossMapTiling','aoMapTiling','metalnessMapTiling'])m[k]=new pc.Vec2(x,y);m.update();cache.set(key,m);return m;
}
