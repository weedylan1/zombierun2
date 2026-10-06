export function createCityDetails(pc,app,box,v3){
    const facades=new Map(),signs=new Map(),carPaints=new Map();
    function carPaint(base){
        if(carPaints.has(base.id))return carPaints.get(base.id);
        const c=canvas(256,128),g=c.getContext('2d'),color=base.diffuse;
        g.fillStyle=`rgb(${color.r*255},${color.g*255},${color.b*255})`;g.fillRect(0,0,256,128);
        g.strokeStyle='#1119';g.lineWidth=2;g.strokeRect(8,8,240,112);g.strokeRect(45,22,75,85);g.strokeRect(122,22,75,85);
        g.fillStyle='#bbb';g.fillRect(102,35,13,4);g.fillRect(178,35,13,4);
        for(let i=0;i<36;i++){g.strokeStyle=i%3?'#cec7ab66':'#6b402b';g.beginPath();const x=Math.random()*256,y=Math.random()*128;g.moveTo(x,y);g.lineTo(x+4+Math.random()*14,y+2);g.stroke();}
        g.fillStyle='#24272888';for(let i=0;i<20;i++)g.fillRect(Math.random()*256,108+Math.random()*20,12,3);
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
        const floors=Math.max(2,Math.round(h/3)),key=base.id+'-'+floors+'-'+style;if(facades.has(key))return facades.get(key);
        const c=canvas(256,512),g=c.getContext('2d'),color=base.diffuse;
        g.fillStyle=`rgb(${Math.round(color.r*420)},${Math.round(color.g*420)},${Math.round(color.b*420)})`;g.fillRect(0,0,256,512);
        g.strokeStyle='#0002';g.lineWidth=1;
        if(style==='brick')for(let y=0;y<512;y+=8){g.beginPath();g.moveTo(0,y);g.lineTo(256,y);g.stroke();for(let x=(y%16?8:0);x<256;x+=24)g.strokeRect(x,y,24,8);}
        if(style==='stone')for(let y=0;y<512;y+=22){g.strokeRect(0,y,256,22);for(let x=(y%44?32:0);x<256;x+=64)g.strokeRect(x,y,64,22);}
        const fh=512/floors;
        for(let f=0;f<floors;f++){
            g.fillStyle='#d7d1c0';g.fillRect(0,f*fh,256,3);
            const columns=style==='glass'?8:style==='industrial'?3:style==='stone'?4:5,step=256/columns,ww=step*(style==='glass'?0.88:0.6);
            for(let col=0;col<columns;col++){
                const x=col*step+(step-ww)/2,y=f*fh+fh*0.18,wh=Math.max(16,fh*(style==='industrial'?0.32:style==='glass'?0.78:0.55));
                g.fillStyle=style==='glass'?'#3a5360':'#ddd6c6';g.fillRect(x-3,y-3,ww+6,wh+6);g.fillStyle=(f+col)%7===0?'#d3bb72':style==='glass'?'#416b80':'#233744';g.fillRect(x,y,ww,wh);
                g.fillStyle='#92a6ab';g.fillRect(x+3,y+3,ww*0.25,wh*0.65);g.fillStyle='#b3a997';g.fillRect(x+ww/2,y,2,wh);
                if(style!=='glass'){g.fillRect(x,y+wh/2,ww,2);g.fillStyle='#56514a';g.fillRect(x-5,y+wh+4,ww+10,4);}
            }
        }
        // Soot at floor joints and a shadowed ground-floor plinth add depth.
        const weather=g.createLinearGradient(0,0,0,512);weather.addColorStop(0,'#18202a18');weather.addColorStop(.75,'#18202a00');weather.addColorStop(1,'#161a2466');g.fillStyle=weather;g.fillRect(0,0,256,512);
        const m=textured(c);m.gloss=style==='glass'?.55:.12;m.update();facades.set(key,m);return m;
    }
    function sign(text){
        if(signs.has(text))return signs.get(text);
        const c=canvas(512,96),g=c.getContext('2d');g.fillStyle='#253731';g.fillRect(0,0,512,96);g.strokeStyle='#d1b97c';g.lineWidth=5;g.strokeRect(4,4,504,88);
        g.fillStyle='#fff0c7';g.font='bold 38px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText(text,256,49);
        const m=textured(c,true);signs.set(text,m);return m;
    }
    function decorate(cx,cz,w,d,h,trim){
        box('Roof cornice',v3(cx,h,cz),v3(w+0.3,0.45,d+0.3),trim);
        box('Ground floor plinth',v3(cx,.24,cz),v3(w+.12,.48,d+.12),trim);
        box('Entrance canopy',v3(cx,2.75,cz+d/2+.5),v3(3.2,.16,1.25),trim);
        box('Roof equipment',v3(cx+w*0.22,h+0.55,cz-d*0.15),v3(2.8,1.1,2),trim);
        box('Entrance door',v3(cx,1.2,cz+d/2+0.07),v3(1.8,2.4,0.14),sign('OPEN'));
        const names=['MARKET','PHARMACY','CAFE','BOOKSHOP','BAKERY','HARDWARE'];
        box('Shop name',v3(cx,3.8,cz+d/2+0.08),v3(w*0.72,1,0.16),sign(names[Math.floor(Math.random()*names.length)]));
    }
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
                const w=(side===3?90:35)+Math.random()*85,h=(side===1?100:30)+Math.random()*(side===3?65:side===1?210:130),bottom=460+layer*18;
                g.fillStyle=theme.sky[layer];g.fillRect(x,bottom-h,w,h);
                const windowGap=side===1?10:side===3?22:18;
                for(let wx=x+8;wx<x+w-5;wx+=windowGap)for(let wy=bottom-h+10;wy<bottom-8;wy+=side===3?28:20){g.fillStyle=Math.random()<0.12?'#d4bc79':'#90a4aa';g.fillRect(wx,wy,side===3?12:5,8);}
                g.fillStyle=theme.sky[layer];
                if(side===0||side===2){g.beginPath();g.moveTo(x-2,bottom-h);g.lineTo(x+w/2,bottom-h-20);g.lineTo(x+w+2,bottom-h);g.fill();}
                else g.fillRect(x+w*0.25,bottom-h-7,w*0.4,7);
                x+=w+8+Math.random()*22;
            }
            g.fillStyle='#374643';g.fillRect(0,496,2048,16);
            const panel=new pc.Entity('Distant city skyline');panel.addComponent('render',{type:'plane'});panel.render.material=textured(c,true);app.root.addChild(panel);
            const p=[[0,-178,0],[178,0,-90],[0,178,180],[-178,0,90]][side];panel.setPosition(p[0]*scale,30,p[1]*scale);panel.setEulerAngles(90,p[2],0);panel.setLocalScale(356*scale,1,70);
            for(let n=0;n<8;n++){
                const along=-119+n*34,depth=133+Math.random()*3,h=theme.heights[0]+Math.random()*(theme.heights[1]-theme.heights[0]);
                const x=side===0||side===2?along:(side===1?depth:-depth),z=side===1||side===3?along:(side===0?-depth:depth);
                const choice=n%2,color=theme.colors[choice],style=theme.styles[choice],width=18+Math.random()*6,thickness=12+Math.random()*8;
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
    return {facade,decorate,backdrop,sign,carPaint};
}
