import {characterLOD} from './quality-profiles.js';

export function locomotionPose(a,dt,now){
    const distance=a.walkDistance||0,speed=distance/Math.max(.001,dt),moving=speed>.03,zombie=a.type==='zombie',panic=a.state==='flee';
    a.walkCycle=(a.walkCycle||0)+dt*(moving?(zombie?6.5:panic?11:7):1.4);
    const phase=a.walkCycle+(a.id||0)*.73,s=Math.sin(phase),c=Math.cos(phase),stride=moving?(zombie?19:panic?40:25):1;
    const action=Math.max(0,1-(now-(a.lastVisualAttack??-99))/.55);
    return {phase,speed,legL:s*stride,legR:-s*stride*(zombie?.55:1),kneeL:Math.max(0,-s)*stride*1.1,kneeR:Math.max(0,s)*stride,
        armL:zombie?-45+c*12:-s*stride*.65-(panic?18:0),armR:zombie?-38+s*15:s*stride*.65-(panic?18:0),
        lean:zombie?13:panic?9:0,bob:moving?Math.abs(c)*(zombie?.025:.035):Math.sin(now*1.7+(a.id||0))*.006,
        headYaw:a.state==='investigate'?Math.sin(now*2)*22:Math.sin(phase*.25)*6,
        scream:!zombie&&now-a.lastScream<.8,attack:action,combat:a.state==='combat',axe:a.type==='firefighter'&&action>0};
}

export function createCharacterVisuals(pc,app,mats,clothesMaterials,choose){
    const capsule=pc.createCapsule(app.graphicsDevice,{radius:.5,height:2,sides:8}),headMesh=pc.createSphere(app.graphicsDevice,{radius:.5,latitudeBands:8,longitudeBands:12}),cube=pc.createBox(app.graphicsDevice);
    // The library owns these meshes even when every near visual is released.
    // MeshInstance destruction otherwise frees a zero-reference shared mesh.
    for(const mesh of [capsule,headMesh,cube])mesh.incRefCount();
    const hair=[mats.black,mats.axe,mats.gun],faces=new Map();
    const trousers=[[.12,.14,.17],[.20,.24,.28],[.24,.21,.18],[.16,.21,.17]].map(c=>{const m=new pc.StandardMaterial();m.diffuse=new pc.Color(...c);m.gloss=.06;m.update();return m;});
    for(const m of clothesMaterials){m.gloss=.06;m.update();}
    const flashMaterial=new pc.StandardMaterial();flashMaterial.diffuse=new pc.Color(1,.75,.2);flashMaterial.emissive=new pc.Color(1,.5,.05);flashMaterial.emissiveIntensity=2;flashMaterial.update();
    function render(parent,name,mesh,material,x,y,z,sx,sy,sz){
        const e=new pc.Entity(name);parent.addChild(e);e.addComponent('render',{meshInstances:[new pc.MeshInstance(mesh,material,e)]});e.render.castShadows=false;e.setLocalPosition(x,y,z);e.setLocalScale(sx,sy,sz);return e;
    }
    function faceMaterial(base){
        if(faces.has(base.id))return faces.get(base.id);const m=base.clone(),canvas=document.createElement('canvas');canvas.width=canvas.height=128;const g=canvas.getContext('2d');
        g.fillStyle='#ffffff';g.fillRect(0,0,128,128);g.fillStyle='#3b3028';
        // Sphere UV repeats the face at the front seam; features remain restrained.
        for(const x of [4,60,68,124])g.fillRect(x,48,4,3);g.fillStyle='#895b52';for(const x of [0,64,128])g.fillRect(x-5,72,10,3);
        const t=new pc.Texture(app.graphicsDevice,{width:128,height:128,mipmaps:true});t.setSource(canvas);m.diffuseMap=t;m.update();faces.set(base.id,m);return m;
    }
    function proxyMesh(){
        const positions=[],indices=[];
        const cubePoints=[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,.5,-.5],[-.5,.5,-.5],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]];
        const triangles=[0,2,1,0,3,2,4,5,6,4,6,7,0,4,7,0,7,3,1,2,6,1,6,5,3,7,6,3,6,2,0,1,5,0,5,4];
        for(const [x,y,z,w,h,d] of [[0,.95,0,.43,.65,.26],[-.13,.34,0,.13,.65,.16],[.13,.34,0,.13,.65,.16],[-.29,.90,0,.11,.60,.12],[.29,.90,0,.11,.60,.12]]){
            const offset=positions.length/3;for(const p of cubePoints)positions.push(x+p[0]*w,y+p[1]*h,z+p[2]*d);indices.push(...triangles.map(i=>i+offset));
        }
        const m=new pc.Mesh(app.graphicsDevice);m.setPositions(positions);m.setNormals(pc.calculateNormals(positions,indices));m.setIndices(indices);m.update();return m;
    }
    const proxy=proxyMesh();
    proxy.incRefCount();
    function create(type,age='adult',gender='m',skin){
        const root=new pc.Entity(type+' actor'),body=type==='police'?mats.police:type==='firefighter'?mats.fire:choose(clothesMaterials);
        root.appearance={body,skin,hair:choose(hair),trousers:choose(trousers),gender,age,role:type,height:age==='child'?1.12:1.72};
        const scale=root.appearance.height/1.72;
        root.proxyBody=render(root,'Body',proxy,body,0,0,0,scale,scale,scale);
        root.proxyHead=render(root,'Head',headMesh,type==='zombie'?mats.zombie:skin,0,1.53*scale,0,.23*scale,.30*scale,.24*scale);
        root.visualLOD=2;return root;
    }
    function detailed(root){
        const look=root.appearance,h=look.height,scale=h/1.72,body=look.body,skin=look.skin;
        const model=new pc.Entity('Detailed humanoid');root.addChild(model);model.setLocalScale(scale,scale,scale);root.detail=model;
        const torso=render(model,'Tailored torso',capsule,body,0,1.0,0,look.gender==='f'?.43:.48,.38,.29);
        render(model,'Hips',capsule,look.trousers,0,.67,0,.34,.17,.27);
        render(model,'Neck',capsule,skin,0,1.36,0,.13,.09,.13);
        const head=render(model,'Detailed head',headMesh,faceMaterial(skin),0,1.54,0,.23,.30,.24);
        const hairCap=render(model,'Hair silhouette',headMesh,look.hair,0,1.66,.018,.25,.13,.25);
        if(look.gender==='f')render(model,'Longer hair silhouette',capsule,look.hair,0,1.52,.11,.22,.14,.095);
        const joints={torso,head,hairCap};
        function limb(name,x,y,upperLen,lowerLen,width,mat,hand){
            const joint=new pc.Entity(name+' joint');model.addChild(joint);joint.setLocalPosition(x,y,0);
            render(joint,name,capsule,mat,0,-upperLen/2,0,width,upperLen/2,width);
            const lower=new pc.Entity(name+' lower joint');joint.addChild(lower);lower.setLocalPosition(0,-upperLen,0);
            render(lower,name+' lower',capsule,mat,0,-lowerLen/2,0,width*.84,lowerLen/2,width*.84);
            const end=render(lower,name+' '+(hand?'hand':'shoe'),hand?capsule:cube,hand?skin:mats.black,0,-lowerLen,hand?0:-.045,hand?.095:.13,hand?.07:.10,hand?.095:.24);
            const socket=new pc.Entity(name+' attachment socket');lower.addChild(socket);socket.setLocalPosition(0,-lowerLen,0);
            return {joint,lower,end,socket};
        }
        joints.legL=limb('LegL',-.125,.68,.32,.28,.135,look.trousers,false);joints.legR=limb('LegR',.125,.68,.32,.28,.135,look.trousers,false);
        joints.armL=limb('ArmL',-.265,1.27,.28,.26,.11,body,true);joints.armR=limb('ArmR',.265,1.27,.28,.26,.11,body,true);
        if(look.role==='police'){
            render(model,'Police cap',cube,mats.police,0,1.72,-.02,.34,.08,.32);render(model,'Police hi-vis vest',cube,mats.yellow,0,1.05,-.15,.34,.35,.035);
            render(model,'Police duty belt',cube,mats.gun,0,.73,0,.41,.065,.29);
            joints.tool=render(joints.armR.socket,'Police pistol',cube,mats.gun,0,0,-.17,.07,.08,.3);
            joints.flash=render(joints.armR.socket,'Police muzzle flash',headMesh,flashMaterial,0,0,-.40,.10,.10,.20);joints.flash.enabled=false;
        }else if(look.role==='firefighter'){
            render(model,'Firefighter helmet',headMesh,mats.yellow,0,1.72,0,.37,.20,.37);
            for(const y of [.89,1.18])render(model,'Reflective jacket tape',cube,mats.yellow,0,y,-.15,.38,.055,.045);
            joints.tool=render(joints.armR.socket,'Firefighter axe haft',cube,mats.axe,0,.08,-.08,.045,.62,.045);render(joints.tool,'Steel axe blade',cube,mats.gun,0,.45,0,2.8,.22,1.8);
        }
        root.joints=joints;root.limbs={legL:joints.legL.joint,legR:joints.legR.joint,armL:joints.armL.joint,armR:joints.armR.joint};
    }
    function update(a,dt,now,position,profile){
        const root=a.entity;if(!root.appearance){a.walkDistance=0;return;}
        const p=root.getPosition(),d=Math.hypot(p.x-position.x,p.z-position.z),lod=characterLOD(d,profile);
        const zombie=a.type==='zombie',skin=zombie?mats.zombie:root.appearance.skin;
        root.proxyHead.render.material=skin;root.proxyBody.render.material=root.appearance.body;
        root.proxyBody.enabled=root.proxyHead.enabled=lod===1||lod===2;
        if(lod===0&&!root.detail)detailed(root);
        if(root.detail)root.detail.enabled=lod===0;
        if(lod===3&&root.detail){root.detail.destroy();root.detail=null;root.joints=null;root.limbs=null;}
        root.visualLOD=lod;const pose=locomotionPose(a,dt,now);a.walkDistance=0;
        if(lod!==0||!root.joints)return;
        const j=root.joints;j.head.render.material=faceMaterial(skin);
        if(a.dead){root.detail.setLocalEulerAngles(0,0,0);return;}
        if(a.fallen){a.fallAngle=Math.min(84,(a.fallAngle||0)+dt*300);const yaw=root.getEulerAngles().y;root.setLocalEulerAngles(0,yaw,a.fallAngle*a.fallDirection);return;}
        root.detail.setLocalPosition(0,pose.bob,0);root.detail.setLocalEulerAngles(pose.lean,0,0);
        j.legL.joint.setLocalEulerAngles(pose.legL,0,0);j.legR.joint.setLocalEulerAngles(pose.legR,0,0);j.legL.lower.setLocalEulerAngles(-pose.kneeL,0,0);j.legR.lower.setLocalEulerAngles(-pose.kneeR,0,0);
        j.armL.joint.setLocalEulerAngles(pose.scream?-110:pose.armL,0,zombie?-9:0);j.armR.joint.setLocalEulerAngles(pose.scream?-105:pose.armR,0,zombie?12:0);
        j.armL.lower.setLocalEulerAngles(-25,0,0);j.armR.lower.setLocalEulerAngles(-25,0,0);
        j.head.setLocalEulerAngles(zombie?Math.sin(pose.phase*1.7)*5:0,pose.headYaw,0);j.hairCap.setLocalEulerAngles(0,pose.headYaw,0);
        if(pose.combat){j.armR.joint.setLocalEulerAngles(-80-pose.attack*10,0,0);j.armR.lower.setLocalEulerAngles(-12,0,0);j.armL.joint.setLocalEulerAngles(-60,0,-20);}
        if(pose.axe)j.armR.joint.setLocalEulerAngles(-145+pose.attack*170,0,0);
        if(zombie&&pose.attack){j.armL.joint.setLocalEulerAngles(-90,0,-10);j.armR.joint.setLocalEulerAngles(-100,0,15);j.head.setLocalEulerAngles(-15,0,0);}
        if(j.tool)j.tool.enabled=Boolean(a.weapon);
        if(j.flash)j.flash.enabled=Boolean(a.weapon)&&now-(a.lastVisualAttack??-99)<.06;
    }
    return {create,update};
}
