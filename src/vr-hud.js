export function createVRHud(pc,app,camera){
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=192;
    const draw=canvas.getContext('2d');
    const texture=new pc.Texture(app.graphicsDevice,{width:768,height:192,mipmaps:false});texture.setSource(canvas);
    const material=new pc.StandardMaterial();material.diffuse=new pc.Color(0,0,0);material.emissive=new pc.Color(1,1,1);material.emissiveMap=texture;material.useLighting=false;material.cull=pc.CULLFACE_NONE;material.update();
    const panel=new pc.Entity('VR Status');panel.addComponent('render',{type:'plane'});panel.render.material=material;
    camera.addChild(panel);panel.setLocalPosition(0,-0.45,-1.5);panel.setLocalEulerAngles(90,0,0);panel.setLocalScale(1.1,1,0.275);panel.enabled=false;
    let lastUpdate=-Infinity;
    return {update(active,energy,status,finished,won=false,weapon=''){
        panel.enabled=active;if(!active)return;
        const now=performance.now();if(now-lastUpdate<100)return;lastUpdate=now;
        draw.fillStyle='#111a17';draw.fillRect(0,0,768,192);
        draw.fillStyle=won?'#b9ff63':'#fff';draw.font='bold 30px Arial';draw.fillText(won?'SAFE! YOU REACHED THE FIRE ESCAPE':finished?'GAME OVER — B TO RESTART':status||'WALKING',20,38);
        if(won){draw.fillStyle='#fff';draw.font='28px Arial';draw.fillText('You survived the outbreak!',20,86);draw.font='24px Arial';draw.fillText('B: play again     A: exit VR',20,145);texture.upload();return;}
        if(weapon&&!finished){draw.fillStyle='#fff';draw.font='21px Arial';draw.textAlign='right';draw.fillText(weapon,740,36);draw.textAlign='left';}
        draw.font='24px Arial';draw.fillText(`ENERGY ${Math.ceil(energy)}%`,20,76);
        draw.fillStyle='#3d4940';draw.fillRect(220,55,520,24);draw.fillStyle='#b9ff63';draw.fillRect(220,55,520*energy/100,24);
        draw.fillStyle='#fff';draw.font='21px Arial';draw.fillText('Left stick: move • Hold left trigger: sprint',20,118);
        draw.fillText('Right grip: pickup • Trigger: use • B: restart • A: exit',20,162);
        texture.upload();
    }};
}
