import {seededRandom} from './quality-profiles.js';

export const SHOP_THEMES=[
    {name:'OAK & ASH',sub:'PUBLIC HOUSE · EST. 1894',color:[.16,.24,.19],kind:'pub'},
    {name:'HIGH STREET PHARMACY',sub:'PRESCRIPTIONS · HEALTH & BEAUTY',color:[.16,.35,.31],kind:'pharmacy'},
    {name:'THE CORNER BAKERY',sub:'FRESH BREAD · COFFEE · CAKES',color:[.34,.18,.14],kind:'cafe'},
    {name:'NORTHGATE BOOKS',sub:'INDEPENDENT BOOKSELLERS',color:[.17,.23,.33],kind:'books'},
    {name:'LOCAL EXPRESS',sub:'GROCERIES · OPEN 7 DAYS',color:[.35,.18,.18],kind:'market'},
    {name:'CITY HARDWARE',sub:'TOOLS · HOME · GARDEN',color:[.25,.28,.30],kind:'hardware'}
];

// Construct modular street assets directly in PlayCanvas. Every blocking prop
// registers its footprint independently of its distance-based presentation.
export function createTownArt(pc,app,worldBox,v3,pbr,sign,collision=()=>{}){
    const random=seededRandom(4317),details=[],effects=[],materialCache=new Map(),surfaceVariants=new Map();let anchor=null,band=null;
    const flat=(name,c,emissive=false)=>{if(materialCache.has(name))return materialCache.get(name);const m=new pc.StandardMaterial();m.name=name;m.diffuse=new pc.Color(...c);m.gloss=.35;if(emissive){m.emissive=m.diffuse.clone();m.emissiveIntensity=1.3;}m.update();materialCache.set(name,m);return m;};
    const cream=flat('Painted cream trim',[.74,.72,.65]),dark=flat('Dark frames',[.075,.085,.085]),glass=flat('Opaque blue-grey glazing',[.12,.20,.25]),warm=flat('Warm interior glow',[.55,.38,.16],true),white=flat('Worn road white',[.75,.75,.68]),yellow=flat('UK yellow marking',[.75,.60,.19]),red=flat('Post box red',[.48,.055,.035]),blue=flat('Emergency blue',[.05,.25,1],true),orange=flat('Traffic cone orange',[.8,.24,.025]);
    glass.metalness=.45;glass.useMetalness=true;glass.gloss=.83;glass.update();
    const brick=pbr.material('brick'),stone=pbr.material('stone'),metal=pbr.material('metal'),wood=pbr.material('wood'),paving=pbr.material('pavement'),road=pbr.material('wet');
    function mark(e){if(anchor&&band){e.artDetail={anchor:{...anchor},band};details.push(e);}return e;}
    function box(name,x,y,z,w,h,d,m){
        if(m.name?.startsWith('PBR ')){
            const horizontal=h<Math.min(w,d)*.25,side=w<Math.min(h,d)*.25;
            const tx=Math.max(.25,Math.round((side?d:w)/2.4*4)/4),ty=Math.max(.25,Math.round((horizontal?d:h)/2.4*4)/4),key=m.id+':'+tx+':'+ty;
            if(!surfaceVariants.has(key)){const tiled=m.clone();for(const k of ['diffuseMapTiling','normalMapTiling','glossMapTiling','aoMapTiling','metalnessMapTiling'])tiled[k]=new pc.Vec2(tx,ty);pbr.track(tiled,m.name.slice(4));surfaceVariants.set(key,tiled);}m=surfaceVariants.get(key);
        }
        return mark(worldBox(name,v3(x,y,z),v3(w,h,d),m));
    }
    function primitive(name,type,x,y,z,w,h,d,m,rotation=[0,0,0]){
        const e=new pc.Entity(name);e.addComponent('render',{type});e.render.material=m;app.root.addChild(e);e.setPosition(x,y,z);e.setLocalScale(w,h,d);e.setEulerAngles(...rotation);mark(e);return e;
    }
    function groups(x,z,type,fn){const prevA=anchor,prevB=band;anchor={x,z};band=type;fn();anchor=prevA;band=prevB;}
    function panel(name,x,y,z,w,h,text,theme=null){return box(name,x,y,z,w,h,.055,sign(text,theme));}
    function face(cx,cz,span,depth,h,side,index){
        // Local +z is the street-facing direction; transforms keep repeating bays aligned.
        const angle=side*Math.PI/2,s=Math.sin(angle),c=Math.cos(angle),front=depth/2+.055;
        const put=(name,x,y,z,w,hh,d,m)=>{
            const e=box(name,cx+x*c+z*s,y,cz-x*s+z*c,w,hh,d,m);e.setEulerAngles(0,side*90,0);return e;
        };
        const bays=Math.max(2,Math.round(span/6.5)),step=span/bays;
        for(let n=0;n<bays;n++){
            const theme=SHOP_THEMES[(index+n+side*2)%SHOP_THEMES.length],tint=flat('Shop paint '+theme.kind,theme.color),x=-span/2+(n+.5)*step;
            groups(cx,cz,'shop',()=>{
                put('Recessed shop back wall',x,1.8,front-1.35,step-.12,3.6,.15,stone);
                put('Shop floor threshold',x,.12,front-.6,step-.12,.14,1.5,paving);
                put('Shop fascia',x,3.35,front+.12,step-.06,.92,.25,tint);
                put('Shop fascia lettering',x,3.40,front+.265,step-.30,.72,.035,sign(theme.name,theme));
                const doorX=x+step*.30,winX=x-step*.15,windowW=step*.58;
                put('Shop window lower panel',winX,.44,front,windowW,.65,.20,tint);
                // Opaque shelf scenes sit deeper than the frame, with actual recess/parallax.
                put('Shop interior recess',winX,1.80,front-.72,windowW,2.15,.10,dark);
                put('Interior warm ceiling',winX,2.72,front-.7,windowW,.07,.65,warm);
                for(let shelf=0;shelf<2;shelf++){
                    put('Shop shelf',winX,1.10+shelf*.7,front-.48,windowW-.1,.08,.45,wood);
                    for(let item=0;item<4;item++)put('Shelf goods',winX-windowW*.37+item*windowW*.24,1.3+shelf*.7,front-.43,.25,.30+(item%2)*.14,.16,item%2?cream:tint);
                }
                for(const dx of [-windowW/2,0,windowW/2])put('Window mullion',winX+dx,1.8,front+.06,.075,2.14,.13,cream);
                for(const yy of [.78,2.87])put('Window frame',winX,yy,front+.06,windowW+.12,.09,.15,cream);
                put('Recessed shop door',doorX,1.39,front-.24,step*.24,2.65,.10,tint);
                put('Door glass',doorX,1.66,front-.17,step*.18,1.83,.06,glass);
                put('Door handle',doorX+.32,1.14,front-.09,.025,.23,.055,metal);
                put('Door lintel',doorX,2.86,front+.03,step*.27,.12,.24,cream);
                put('Door kick plate',doorX,.34,front-.15,step*.20,.25,.03,metal);
                for(const px of [x-step/2+.06,x+step/2-.06])put('Shop pilaster',px,1.62,front,.16,3.25,.28,stone);
                if((n+index+side)%4===0){
                    put('Shutter surround',winX,1.80,front+.12,windowW,2.05,.10,metal);
                    for(let yy=.9;yy<2.8;yy+=.15)put('Shutter louvre',winX,yy,front+.19,windowW,.045,.045,dark);
                    put('Quarantine poster',winX,1.83,front+.23,.64,.87,.035,sign('KEEP OUT'));
                }else if(theme.kind==='pub'||theme.kind==='cafe'){
                    const a=put('Canvas shop awning',x,3.02,front+.54,step-.28,.10,1.10,tint);a.setEulerAngles(9,side*90,0);
                    put('Awning valance',x,2.86,front+1.05,step-.28,.23,.045,cream);
                }
                if(theme.kind==='pharmacy')put('Pharmacy cross',x-step*.32,3.42,front+.31,.48,.48,.035,sign('✚'));
            });
            groups(cx,cz,'upper',()=>{
                const floors=Math.min(4,Math.floor((h-4)/2.7));
                for(let f=0;f<floors;f++)for(const dx of [-step*.23,step*.23]){
                    const yy=5.25+f*2.7;put('Upper window recess',x+dx,yy,front,1.05,1.62,.13,dark);
                    put('Upper window glass',x+dx,yy,front+.078,.92,1.48,.035,glass);
                    for(const edge of [-.52,.52])put('Window jamb',x+dx+edge,yy,front+.10,.085,1.70,.12,cream);
                    put('Window sill',x+dx,yy-.85,front+.15,1.23,.10,.30,stone);
                    put('Sash cross rail',x+dx,yy+.1,front+.105,.95,.045,.055,cream);
                }
                put('Stone string course',x,4.08,front,step,.20,.22,stone);
                if(n===0)put('Rainwater downpipe',x-step*.43,h*.5,front+.10,.07,h,.08,metal);
            });
        }
    }
    function building(cx,cz,w,d,h,trim){
        const index=Math.abs(Math.round(cx*11+cz*7));
        box('Ground floor masonry core',cx,1.9,cz,w-3,3.8,d-3,brick);
        // Finish the two representative streets first, as the brief requests.
        // Distant blocks use the same materials with cheaper ground-floor bays.
        const hero=(cx<-75&&cz>40)||(Math.abs(cx)<45&&Math.abs(cz-38)<24);
        for(let side=0;side<4;side++){
            if(hero&&(side===0||side===3))face(cx,cz,side%2?d:w,side%2?w:d,h,side,index);
            else {
                const horizontal=side===0||side===2,front=(horizontal?d:w)/2+.02,sgn=side<2?1:-1;
                box('Simple ground floor masonry',cx+(horizontal?0:sgn*front),1.9,cz+(horizontal?sgn*front:0),horizontal?w:.16,3.8,horizontal?.16:d,brick);
                groups(cx,cz,'shop',()=>{
                    const theme=SHOP_THEMES[(index+side)%SHOP_THEMES.length],e=box('Distant shop fascia',cx+(horizontal?0:sgn*(front+.10)),3.2,cz+(horizontal?sgn*(front+.1):0),horizontal?w*.8:.10,.65,horizontal?.10:d*.8,sign(theme.name,theme));
                });
            }
        }
        box('Masonry roof coping',cx,h+.12,cz,w+.28,.25,d+.28,stone);
        if(h<16){
            for(const side of [-1,1]){
                const r=box('Pitched slate roof',cx,h+.9,cz+side*d*.25,w+.35,.12,Math.hypot(d/2,1.8),dark);r.setEulerAngles(side*Math.atan2(1.8,d/2)*180/Math.PI,0,0);
            }
            box('Brick chimney',cx-w*.25,h+1.9,cz,.9,2.0,.75,brick);
            for(const dx of [-.23,.23])primitive('Chimney pot','cylinder',cx-w*.25+dx,h+3,cz,.22,.42,.22,wood);
        }else box('Flat roof plant room',cx+w*.2,h+.7,cz,2.3,1.4,2.1,metal);
    }
    function roads(lines,step,limit){
        for(const line of lines){
            const horizontal=line.axis==='x',position=(a,o,y=.047)=>horizontal?[a,y,line.value+o]:[line.value+o,y,a],size=(a,o)=>horizontal?[a,.012,o]:[o,.012,a];
            const part=(name,a,o,l,w,mat)=>{const p=position(a,o),s=size(l,w);box(name,...p,...s,mat);};
            for(let along=-limit;along<limit;along+=3){
                if(lines.some(other=>other.axis!==line.axis&&Math.abs(along-other.value)<6))continue;
                part('UK broken white centre line',along,0,1.55,.10,white);
            }
            for(let block=-3;block<3;block++)for(const side of [-1,1]){
                const a=(block+.5)*step;
                part('Paved footway',a,side*5.7,step-9,2.45,paving);
                const pp=position(a,side*4.52,.075);box('Raised kerb stone',...pp,...(horizontal?[step-9,.14,.20]:[.20,.14,step-9]),stone);
                for(const offset of [4.07,4.30])part('Double yellow no-parking line',a,side*offset,step-10,.065,yellow);
                part('Gutter drainage strip',a,side*4.41,step-10,.055,dark);
            }
        }
        for(const x of [-step,0,step])for(const z of [-step,0,step]){
            groups(x,z,'clutter',()=>{
                for(const side of [-1,1]){
                    box('Give way line',x,0.052,z+side*5.1,4,.018,.14,white);
                    for(let n=0;n<5;n++)box('Zebra crossing stripe',x+side*8.3,.058,z-1.8+n*.9,2.5,.02,.40,white);
                    box('Drain grille',x+side*4.27,.06,z+5.8,.30,.03,.75,metal);
                }
            });
        }
    }
    // A shaped body mesh replaces the old stacked rectangles. This mesh is
    // shared by each vehicle type; details are an independently culled band.
    const hulls=new Map();
    function hull(kind){
        if(hulls.has(kind))return hulls.get(kind);
        const van=kind==='van'||kind==='ambulance',bus=kind==='bus',fire=kind==='fire';
        const L=bus?7.8:fire?6.0:van?4.55:3.9,W=bus?2.1:fire?2.05:van?1.85:1.75;
        const rings=[[-L/2,.38,W*.40],[-L/2+.25,.64,W*.5],[-L*.28,.78,W*.5],[-L*.16,van||bus||fire?2.15:1.40,W*.44],[L*.26,van||bus||fire?2.15:1.40,W*.44],[L/2-.15,.70,W*.48],[L/2,.45,W*.42]];
        const positions=[],uvs=[],indices=[];
        for(const [z,y,w] of rings)for(const [xx,yy] of [[-w,.30],[-w,y],[w,y],[w,.30]]){positions.push(xx,yy,z);uvs.push((xx/W)+.5,(z/L)+.5);}
        for(let r=0;r<rings.length-1;r++)for(let j=0;j<4;j++){const a=r*4+j,b=r*4+(j+1)%4,c=b+4,d=a+4;indices.push(a,b,c,a,c,d);}
        indices.push(0,2,1,0,3,2);const e=(rings.length-1)*4;indices.push(e,e+1,e+2,e,e+2,e+3);
        // Rings run clockwise in XY. Reverse winding so the hull faces and
        // lighting normals point outward rather than disappearing with culling.
        for(let i=0;i<indices.length;i+=3){const tmp=indices[i+1];indices[i+1]=indices[i+2];indices[i+2]=tmp;}
        const mesh=new pc.Mesh(app.graphicsDevice);mesh.setPositions(positions);mesh.setNormals(pc.calculateNormals(positions,indices));mesh.setUvs(0,uvs);mesh.setIndices(indices);mesh.update();const result={mesh,L,W,height:van||bus||fire?2.4:1.48};hulls.set(kind,result);return result;
    }
    function vehicle(x,z,horizontal,paint,kind='car',damaged=false){
        const spec=hull(kind),yaw=horizontal?90:0,angle=yaw*Math.PI/180;
        const bodyMat=kind==='police'?cream:kind==='ambulance'?yellow:kind==='fire'?red:paint;
        const e=new pc.Entity('Vehicle shaped '+kind);e.addComponent('render',{meshInstances:[new pc.MeshInstance(spec.mesh,bodyMat,e)]});app.root.addChild(e);e.setPosition(x,0,z);e.setEulerAngles(0,yaw,damaged?3:0);
        const place=(name,xx,y,zz,w,h,d,m)=>{const b=box(name,x+xx*Math.cos(angle)+zz*Math.sin(angle),y,z-xx*Math.sin(angle)+zz*Math.cos(angle),w,h,d,m);b.setEulerAngles(0,yaw,0);return b;};
        groups(x,z,'vehicle',()=>{
            const tall=spec.height>2;
            place('Vehicle windscreen',0,tall?1.63:1.12,-spec.L*.24,spec.W*.78,tall?.7:.45,.065,damaged?dark:glass);
            place('Vehicle rear glass',0,tall?1.63:1.12,spec.L*.27,spec.W*.78,tall?.7:.45,.06,glass);
            for(const side of [-1,1]){
                for(const offset of [-.03,.20])place('Side window',side*spec.W*.446,tall?1.65:1.12,spec.L*offset,.06,tall?.62:.40,spec.L*.20,glass);
                for(const wheel of [-1,1]){
                    const zz=wheel*spec.L*.31,xx=side*spec.W*.49,p=[x+xx*Math.cos(angle)+zz*Math.sin(angle),.32,z-xx*Math.sin(angle)+zz*Math.cos(angle)];
                    primitive('Round vehicle tyre','cylinder',...p,.61,.18,.61,dark,[0,yaw,90]);
                    place('Wheel alloy hub',side*(spec.W*.49+.10),.32,zz,.03,.31,.31,metal);
                }
                place('Wing mirror',side*(spec.W/2+.09),1.08,-spec.L*.14,.17,.12,.20,dark);
                place('Door handles',side*spec.W*.50,.83,spec.L*.12,.025,.04,.16,metal);
                for(const end of [-1,1])place(end===-1?'Headlamp':'Tail lamp',side*spec.W*.33,.61,end*spec.L*.501,.30,.16,.055,end===-1?cream:red);
                place('Bumper',0,.37,side*spec.L*.501,spec.W*.92,.13,.085,dark);
            }
            place('UK front number plate',0,.50,-spec.L*.51,.47,.11,.035,sign('ZR26 UK'));
            place('UK rear yellow plate',0,.50,spec.L*.51,.47,.11,.035,yellow);
            if(kind==='police'||kind==='ambulance'||kind==='fire'){
                place('Emergency lightbar base',0,spec.height+.02,-.25,1.12,.09,.22,dark);
                for(const side of [-1,1]){const b=place('Blue emergency beacon',side*.39,spec.height+.14,-.25,.26,.16,.22,blue);b.artDynamic=true;b.render.castShadows=false;effects.push({entity:b,kind:'beacon',phase:side===1?0:Math.PI});}
                for(const side of [-1,1])for(let n=0;n<6;n++)place('Emergency Battenburg panel',side*spec.W*.503,.72,-spec.L*.25+n*.35,.025,.21,.33,n%2?yellow:kind==='police'?flat('Police blue',[.05,.15,.35]):flat('Ambulance green',[.1,.35,.17]));
            }
            if(damaged){place('Cracked windscreen diagonal',0,1.10,-spec.L*.26,.04,.55,.07,cream);place('Raised damaged bonnet',0,.9,-spec.L*.36,spec.W*.7,.05,.70,bodyMat).setEulerAngles(-20,yaw,0);}
        });
        return {width:horizontal?spec.L:spec.W,depth:horizontal?spec.W:spec.L,height:spec.height};
    }
    function furniture(x,z,type){
        groups(x,z,'clutter',()=>{
            if(type==='bench'){
                for(let n=0;n<4;n++)box('Bench timber seat',x,.52,z-.25+n*.16,1.8,.09,.13,wood);
                for(let n=0;n<3;n++)box('Bench back slat',x,.84+n*.14,z+.30,1.8,.1,.075,wood);
                for(const side of [-1,1]){box('Bench legs',x+side*.65,.28,z,.09,.52,.54,metal);box('Bench back support',x+side*.65,.85,z+.3,.07,.85,.07,metal);}collision(x,z,1.8,.7,true,1.2);
            }else if(type==='postbox'){
                primitive('Royal Mail pillar box','cylinder',x,.70,z,.56,1.40,.56,red);primitive('Postbox black foot','cylinder',x,.10,z,.64,.20,.64,dark);primitive('Postbox cap','sphere',x,1.40,z,.64,.18,.64,red);
                box('Letter slot',x,1.11,z+.285,.34,.07,.03,dark);panel('Post box collection times',x,.80,z+.29,.21,.31,'POST');collision(x,z,.65,.65,true,1.5);
            }else if(type==='shelter'){
                for(const side of [-1,1])box('Bus shelter pillar',x+side*1.45,1.25,z,.07,2.5,.07,metal);
                box('Bus shelter roof',x,2.55,z,3.15,.12,1.35,dark);box('Shelter rear glazing',x,1.45,z-.57,3.0,1.75,.055,glass);
                box('Bus shelter seat',x,.56,z-.31,2.6,.11,.36,metal);panel('Bus stop timetable',x-1.12,1.45,z-.50,.38,.75,'BUS\nSTOP');collision(x,z-.45,3,.3,false,2.6);
            }else if(type==='phone'){
                for(const side of [-1,1])box('Red phone kiosk frame',x+side*.40,1.03,z,.07,2.05,.78,red);
                box('Kiosk roof',x,2.13,z,.94,.17,.94,red);box('Kiosk back',x,1.0,z-.4,.84,2,.08,dark);box('Kiosk glass',x,1.15,z+.4,.70,1.50,.06,glass);
                for(let n=0;n<5;n++)box('Telephone window rail',x,.46+n*.34,z+.44,.77,.025,.035,red);panel('Telephone sign',x,1.98,z+.43,.70,.20,'TELEPHONE');collision(x,z,.95,.95,true,2.3);
            }else if(type==='trolley'){
                box('Shopping trolley base',x,.25,z,.53,.055,.75,metal);for(const side of [-1,1]){
                    box('Trolley side rail',x+side*.27,.64,z,.028,.40,.76,metal);for(let n=0;n<5;n++)box('Trolley basket wire',x+side*.27,.58,z-.3+n*.15,.025,.35,.025,metal);
                    primitive('Trolley wheel','sphere',x+side*.22,.10,z+.25,.11,.11,.11,dark);
                }box('Trolley handle',x,.94,z+.45,.55,.045,.045,red);collision(x,z,.58,.85,false,1);
            }else if(type==='bin'){
                box('Wheelie bin body',x,.47,z,.58,.85,.63,flat('Bin green',[.13,.22,.18]));box('Hinged bin lid',x,.93,z,.64,.08,.70,dark);
                for(const side of [-1,1])primitive('Bin wheels','sphere',x+side*.27,.13,z-.23,.14,.14,.14,dark);collision(x,z,.7,.75,true,1);
            }else if(type==='barrier'){
                for(const side of [-1,1]){box('Barrier post',x+side*1.15,.55,z,.10,1.1,.1,metal);box('Barrier foot',x+side*1.15,.08,z,.35,.1,.55,dark);}
                box('Red roadwork barrier',x,.78,z,2.4,.32,.08,red);for(let n=0;n<5;n++)box('Barrier white reflector',x-.96+n*.48,.79,z+.05,.25,.19,.02,white);collision(x,z,2.4,.18,false,1.2);
            }
        });
    }
    function streetKit(lines,step,limit){
        roads(lines,step,limit);
        // Visible from the original start as well as the representative central street.
        for(const [x,z] of [[-3*step,90],[0,step]]){
            const side=x<0?1:-1;
            furniture(x+side*5.8,z+4,'bench');furniture(x+side*5.9,z-5,'postbox');furniture(x+side*5.9,z-12,'phone');
            furniture(x-side*5.8,z+13,'bin');furniture(x-side*5.8,z+21,'shelter');furniture(x+side*5.8,z+24,'trolley');
            groups(x,z,'clutter',()=>{
                for(let n=0;n<9;n++){const px=x+side*(4.9+random()),pz=z-18+random()*37;
                    const e=box('Discarded newspaper',px,.13,pz,.23+random()*.2,.008,.3,cream);e.setEulerAngles(0,random()*360,0);
                    if(n%3===0)box('Abandoned cardboard parcel',px,.24,pz+.5,.34,.36,.30,wood);
                }
                box('High street fingerpost',x+side*5.8,1.45,z+31,.08,2.9,.08,dark);panel('High street direction sign',x+side*5.8,2.58,z+31,.95,.26,'MALL →');
            });
        }
        vehicle(-3*step+2.8,74,false,cream,'police');collision(-3*step+2.8,74,1.75,3.9,true,1.5);
        vehicle(-2.8,step-15,false,cream,'ambulance');collision(-2.8,step-15,1.85,4.55,true,2.4);
        vehicle(22,step+2.6,true,red,'fire');collision(22,step+2.6,6,2.05,true,2.4);
        vehicle(-3*step-2.8,120,false,cream,'van',true);collision(-3*step-2.8,120,1.85,4.55,true,2.4);
        smoke(-3*step-2.8,120,1.8);smoke(22,step+2.6,2.5);
    }
    const smokeMat=flat('Smoke',[.20,.22,.23]),smokeCanvas=document.createElement('canvas');smokeCanvas.width=smokeCanvas.height=128;
    const sg=smokeCanvas.getContext('2d'),sd=sg.createImageData(128,128);
    for(let y=0;y<128;y++)for(let x=0;x<128;x++){const p=(y*128+x)*4,r=Math.hypot((x-64)/64,(y-64)/64);sd.data[p]=sd.data[p+1]=sd.data[p+2]=255;sd.data[p+3]=Math.max(0,Math.min(255,(1-r)**2*(.75+random()*.25)*255));if(r>1)sd.data[p+3]=0;}
    sg.putImageData(sd,0,0);const st=new pc.Texture(app.graphicsDevice,{width:128,height:128,mipmaps:true});st.setSource(smokeCanvas);
    smokeMat.opacityMap=st;smokeMat.opacityMapChannel='a';smokeMat.blendType=pc.BLEND_NORMAL;smokeMat.opacity=.38;smokeMat.depthWrite=false;smokeMat.cull=pc.CULLFACE_NONE;smokeMat.update();
    function smoke(x,z,y){
        for(let n=0;n<4;n++){const e=primitive('Rising vehicle smoke','plane',x,y+n*.6,z,1.2,1,1.2,smokeMat,[90,0,0]);e.render.castShadows=false;effects.push({entity:e,kind:'smoke',x,z,y,phase:n/4});}
    }
    function prepareBatches(staticEntities){
        // Group details separately; hiding an already batched source entity alone
        // would not hide its merged draw. Public batch mesh visibility is used.
        const groups=new Map(),ids=[];
        for(const e of details){if(!e.artDetail||e.artDynamic)continue;const {anchor:a,band:b}=e.artDetail,key=b+':'+Math.round(a.x/12)+':'+Math.round(a.z/12);
            let group=groups.get(key);if(!group){const g=app.batcher.addGroup('Town '+key,false,45);group={id:g.id,x:a.x,z:a.z,band:b};groups.set(key,group);ids.push(g.id);}e.render.batchGroupId=group.id;
        }
        // Cylinder props are not produced by the original box collector.
        for(const e of details)if(!staticEntities.includes(e))staticEntities.push(e);
        app.batcher.generate(ids);
        for(const g of groups.values())g.batches=app.batcher.getBatches(g.id);
        return [...groups.values()];
    }
    let detailGroups=[];
    return {building,vehicle,streetKit,brick,stone,metal,wood,prepare(staticEntities){detailGroups=prepareBatches(staticEntities);},update(position,now,profile){
        for(const g of detailGroups){const range=g.band==='clutter'?profile.clutter:g.band==='vehicle'?profile.detail*.65:profile.detail;const visible=Math.hypot(position.x-g.x,position.z-g.z)<range+18;for(const b of g.batches)b.meshInstance.visible=visible;}
        let count=0;for(const f of effects){const p=f.entity.getPosition(),near=Math.hypot(position.x-p.x,position.z-p.z)<profile.clutter;f.entity.enabled=near&&(f.kind==='beacon'||count++<profile.effects);
            if(!f.entity.enabled)continue;if(f.kind==='beacon')f.entity.enabled=Math.sin(now*9+f.phase)>-.3;
            else {const t=(now*.22+f.phase)%1;f.entity.setPosition(f.x+Math.sin(now+f.phase)*.35,f.y+t*5,f.z+t*.9);f.entity.setLocalScale(1+t*2,1,1+t*2);f.entity.lookAt(position.x,position.y??1.65,position.z);f.entity.rotateLocal(90,0,0);}
        }
    }};
}
