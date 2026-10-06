import {seededRandom} from './quality-profiles.js';
import {createTownArt} from './town-art.js';
export function createCityDetails(pc,app,box,v3,collision){
    const sceneRandom=seededRandom(84391);
    const facades=new Map(),signs=new Map(),carPaints=new Map();
    const pbr=app._townPBR;
    const town=createTownArt(pc,app,box,v3,pbr,sign,collision);
    function carPaint(base){
        if(carPaints.has(base.id))return carPaints.get(base.id);
        const c=canvas(256,128),g=c.getContext('2d'),color=base.diffuse;
        g.fillStyle=`rgb(${color.r*255},${color.g*255},${color.b*255})`;g.fillRect(0,0,256,128);
        g.strokeStyle='#1119';g.lineWidth=2;g.strokeRect(8,8,240,112);g.strokeRect(45,22,75,85);g.strokeRect(122,22,75,85);
        g.fillStyle='#bbb';g.fillRect(102,35,13,4);g.fillRect(178,35,13,4);
        for(let i=0;i<36;i++){g.strokeStyle=i%3?'#cec7ab66':'#6b402b';g.beginPath();const x=sceneRandom()*256,y=sceneRandom()*128;g.moveTo(x,y);g.lineTo(x+4+sceneRandom()*14,y+2);g.stroke();}
        g.fillStyle='#24272888';for(let i=0;i<20;i++)g.fillRect(sceneRandom()*256,108+sceneRandom()*20,12,3);
        const m=textured(c);carPaints.set(base.id,m);return m;
    }
    function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
    function textured(c,unlit=false){
        if(!unlit){
            const g=c.getContext('2d');let seed=1729;
            for(let n=0;n<1900;n++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed%c.width;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const y=seed%c.height;
                g.fillStyle=n%2?'#f3e6c708':'#141d2412';g.fillRect(x,y,1+n%3,1);}
        }
        const texture=new pc.Texture(app.graphicsDevice,{width:c.width,height:c.height,mipmaps:true});texture.setSource(c);
        const m=new pc.StandardMaterial();m.cull=pc.CULLFACE_NONE;
        if(unlit){m.diffuse=new pc.Color(0,0,0);m.emissive=new pc.Color(1,1,1);m.emissiveMap=texture;m.useLighting=false;}
        else{m.diffuse=new pc.Color(0.92,0.92,0.92);m.diffuseMap=texture;}
        m.update();return m;
    }
    function facade(base,h,style='brick'){
        const key=base.id+'-'+Math.round(h)+'-'+style;if(facades.has(key))return facades.get(key);
        const m=pbr.material(style==='glass'?'metal':style==='brick'?'brick':'stone',null,6,Math.max(1,h/2));
        if(style==='glass'){m.diffuse=new pc.Color(.30,.45,.52);m.glossInvert=false;m.gloss=.8;m.update();}
        facades.set(key,m);return m;
    }
    function sign(text,theme=null){
        if(signs.has(text))return signs.get(text);
        const c=canvas(512,96),g=c.getContext('2d');g.fillStyle=theme?'rgb('+theme.color.map(v=>Math.round(v*255)).join(',')+')':'#253731';g.fillRect(0,0,512,96);g.strokeStyle='#d1b97c';g.lineWidth=5;g.strokeRect(4,4,504,88);
        g.fillStyle='#fff0c7';g.font='bold '+(text.length>20?24:text.length>14?30:38)+'px Georgia';g.textAlign='center';g.textBaseline='middle';g.fillText(text,256,49);
        const m=textured(c,true);signs.set(text,m);return m;
    }
    function decorate(cx,cz,w,d,h,trim){town.building(cx,cz,w,d,h,trim);}
    function backdrop(base,ground,road,scale=1){
        const sceneryBox=(name,pos,size,mat)=>box(name,v3(pos.x*scale,pos.y,pos.z*scale),v3(size.x*scale,size.y,size.z*scale),mat);
        sceneryBox('Outer city ground',v3(0,-0.22,0),v3(356,0.1,356),ground);
        for(const line of [-102,-68,-34,0,34,68,102]){
            sceneryBox('Continuing city street',v3(line,-0.035,0),v3(9,0.05,356),road);
            sceneryBox('Continuing city street',v3(0,-0.035,line),v3(356,0.05,9),road);
        }
        const themes=[
            {styles:['brick','stone'],colors:[[0.52,0.27,0.19],[0.65,0.48,0.31]],heights:[7,17],sky:['#938e83','#716557','#554c42']},
            {styles:['glass','stone'],colors:[[0.31,0.43,0.5],[0.62,0.62,0.56]],heights:[18,38],sky:['#8098a3','#58778b','#3c596d']},
            {styles:['stone','brick'],colors:[[0.69,0.62,0.49],[0.46,0.36,0.28]],heights:[10,23],sky:['#a19b87','#81765f','#665d4d']},
            {styles:['industrial','brick'],colors:[[0.4,0.43,0.39],[0.53,0.32,0.24]],heights:[5,12],sky:['#89938c','#66746b','#485951']}
        ];
        for(let side=0;side<4;side++){
            const theme=themes[side];
            const c=canvas(2048,512),g=c.getContext('2d');g.fillStyle='#8fa3ad';g.fillRect(0,0,2048,512);
            for(let layer=0;layer<3;layer++)for(let x=-20;x<2048;){
                const w=(side===3?90:35)+sceneRandom()*85,h=(side===1?100:30)+sceneRandom()*(side===3?65:side===1?210:130),bottom=460+layer*18;
                g.fillStyle=theme.sky[layer];g.fillRect(x,bottom-h,w,h);
                const windowGap=side===1?10:side===3?22:18;
                for(let wx=x+8;wx<x+w-5;wx+=windowGap)for(let wy=bottom-h+10;wy<bottom-8;wy+=side===3?28:20){g.fillStyle=sceneRandom()<0.12?'#d4bc79':'#90a4aa';g.fillRect(wx,wy,side===3?12:5,8);}
                g.fillStyle=theme.sky[layer];
                if(side===0||side===2){g.beginPath();g.moveTo(x-2,bottom-h);g.lineTo(x+w/2,bottom-h-20);g.lineTo(x+w+2,bottom-h);g.fill();}
                else g.fillRect(x+w*0.25,bottom-h-7,w*0.4,7);
                x+=w+8+sceneRandom()*22;
            }
            g.fillStyle='#374643';g.fillRect(0,496,2048,16);
            const panel=new pc.Entity('Distant city skyline');panel.addComponent('render',{type:'plane'});panel.render.material=textured(c,true);app.root.addChild(panel);
            const p=[[0,-178,0],[178,0,-90],[0,178,180],[-178,0,90]][side];panel.setPosition(p[0]*scale,30,p[1]*scale);panel.setEulerAngles(90,p[2],0);panel.setLocalScale(356*scale,1,70);
            for(let n=0;n<8;n++){
                const along=-119+n*34,depth=133+sceneRandom()*3,h=theme.heights[0]+sceneRandom()*(theme.heights[1]-theme.heights[0]);
                const x=side===0||side===2?along:(side===1?depth:-depth),z=side===1||side===3?along:(side===0?-depth:depth);
                const choice=n%2,color=theme.colors[choice],style=theme.styles[choice],width=18+sceneRandom()*6,thickness=12+sceneRandom()*8;
                const palette={id:'outer-'+side+'-'+choice,diffuse:new pc.Color(...color)};
                const sx=side===0||side===2?width:thickness,sz=side===0||side===2?thickness:width;
                sceneryBox('Outer '+style+' city building',v3(x,h/2,z),v3(sx,h,sz),facade(palette,h,style));
                sceneryBox('Outer roof trim',v3(x,h,z),v3(sx+0.2,0.4,sz+0.2),ground);
                if(style==='industrial')sceneryBox('Factory chimney',v3(x+sx*0.3,h+3,z),v3(1.1,6,1.1),ground);
                if(style==='brick'){
                    const roof=sceneryBox('Pitched city roof',v3(x,h+0.7,z),v3(sx,1.2,sz),ground);roof.setEulerAngles(0,0,4);
                }
                if(n%3===0){
                    const names=['CLINIC','CITY LIBRARY','WORKSHOP','COFFEE'],front=side===0?z+sz/2:side===2?z-sz/2:z;
                    sceneryBox('Neighbourhood sign',v3(side===1?x-sx/2:side===3?x+sx/2:x,3,front),v3(side===1||side===3?0.15:sx*0.7,0.9,side===1||side===3?sz*0.7:0.15),sign(names[(side+n)%4]));
                }
            }
        }
    }
    return {facade,decorate,backdrop,sign,carPaint,vehicle:town.vehicle,streetKit:town.streetKit,prepare:town.prepare,update:town.update};
}
