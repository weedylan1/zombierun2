import assert from 'node:assert/strict';
import * as engine from 'playcanvas';
import {surfaceData,createPBRLibrary} from './src/procedural-surfaces.js';
import {QUALITY_PROFILES,resolveQuality,characterLOD,stableCharacterLOD,seededRandom} from './src/quality-profiles.js';
import {createCharacterVisuals,locomotionPose} from './src/character-visuals.js';
import {createTownArt} from './src/town-art.js';
import {arrangeStreetBenchmark} from './src/street-benchmark.js';

for(const kind of ['road','wet','pavement','brick','stone','metal','wood']){
    const maps=surfaceData(kind,128);assert.deepEqual(maps,surfaceData(kind,128));
    for(const p of Object.values(maps)){assert.equal(p.length,128*128*4);for(let i=3;i<p.length;i+=4)assert.equal(p[i],255);}
    for(let i=0;i<maps.normal.length;i+=4){const l=Math.hypot(...[0,1,2].map(c=>maps.normal[i+c]/255*2-1));assert(Math.abs(l-1)<.02);}
    assert(new Set(maps.albedo).size>20);assert(maps.orm[1]>0);
}
assert.equal(resolveQuality('high',true).label,'Quest / Mobile');assert.equal(resolveQuality('auto',false,true),QUALITY_PROFILES.quest);
for(const p of Object.values(QUALITY_PROFILES)){assert.equal(characterLOD(0,p),0);assert.equal(characterLOD(p.near+1,p),1);assert.equal(characterLOD(p.middle+1,p),2);assert.equal(characterLOD(p.cull+1,p),3);}
for(const p of Object.values(QUALITY_PROFILES))for(const [i,boundary] of [p.near,p.middle,p.cull].entries()){
    for(let frame=0;frame<100;frame++){
        assert.equal(stableCharacterLOD(boundary+(frame%2?.2:-.2),p,i),i);
        assert.equal(stableCharacterLOD(boundary+(frame%2?.2:-.2),p,i+1),i+1);
    }
    assert.equal(stableCharacterLOD(boundary+2.1,p,i),i+1);assert.equal(stableCharacterLOD(boundary-2.1,p,i+1),i);
}
assert.equal(resolveQuality('high').shadows,true);assert.equal(resolveQuality('quest').shadows,false);
const r=seededRandom(21),r2=seededRandom(21);for(let i=0;i<100;i++)assert.equal(r(),r2());

// Real PlayCanvas meshes, transforms, materials and mesh-instance lifetimes.
// The null device validates CPU geometry; it does not claim to test a GPU.
const device=new engine.NullGraphicsDevice();device._isBrowserInterface=()=>true;device._isHTMLElementInterface=()=>false;
globalThis.document={createElement(){return {width:128,height:128,getContext(){return {fillRect(){},createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},putImageData(){}};}};}};
class Entity extends engine.GraphNode {
    addComponent(type,data){if(type!=='render')return;this.render={...data,castShadows:false};let material=null;
        // Custom RenderComponent.material does not bind MeshInstance materials.
        Object.defineProperty(this.render,'material',{get:()=>material,set:v=>{material=v;}});
    }
    destroy(){for(const c of [...this.children])c.destroy();this.remove();for(const mi of this.render?.meshInstances||[])mi.destroy();}
}
const pc={...engine,Entity},app={graphicsDevice:device,root:new Entity('Scene')};
app.root._enabledInHierarchy=true;
const mat=(r=.3,g=.3,b=.3)=>{const m=new engine.StandardMaterial();m.diffuse=new engine.Color(r,g,b);m.update();return m;};
const mats=Object.fromEntries(['black','axe','gun','zombie','police','fire','yellow'].map(k=>[k,mat()])),skin=mat(.8,.6,.4),clothes=[mat(.2,.3,.4)],visuals=createCharacterVisuals(pc,app,mats,clothes,a=>a[0]);
for(const age of ['adult','child'])for(const type of ['civilian','zombie','police','firefighter']){
    const root=visuals.create(type,age,'f',skin);app.root.addChild(root);root.setPosition(2,0,3);const position=root.getPosition().clone(),identity=root.appearance;
    const actor={id:42,entity:root,type,walkDistance:.1,state:'wander',lastScream:-99,weapon:type==='police'?'gun':type==='firefighter'?'axe':null};
    visuals.update(actor,.1,10,{x:2,z:3},QUALITY_PROFILES.high);assert(root.detail);assert.equal(root.visualLOD,0);assert.equal(Object.keys(root.limbs).length,4);assert.equal(actor.walkDistance,0);
    let triangles=0;root.detail.forEach(e=>{for(const mi of e.render?.meshInstances||[])triangles+=mi.mesh.primitive[0].count/3;});assert(triangles<5000);
    actor.type='zombie';actor.walkDistance=.1;visuals.update(actor,.1,11,{x:2,z:3},QUALITY_PROFILES.high);assert.equal(root.appearance,identity);assert.equal(root.proxyHead.render.material,root.joints.head.render.material);assert.equal(root.getPosition().equals(position),true);
    assert.equal(root.joints.neck.render.material,mats.zombie);assert.equal(root.joints.armL.end.render.material,mats.zombie);
    assert.equal(root.joints.head.render.meshInstances[0].material,root.joints.head.render.material);
    assert.equal(root.joints.neck.render.meshInstances[0].material,mats.zombie);assert.equal(root.proxyHead.render.meshInstances[0].material,root.joints.head.render.meshInstances[0].material);
    assert.equal(root.joints.torso.render.meshInstances[0].material,root.joints.torso.render.material);
    assert.notEqual(root.joints.torso.render.material,identity.body);assert(root.joints.torso.render.material.diffuse.equals(identity.body.diffuse));
    assert(root.joints.armL.end.getPosition().z<root.joints.armL.joint.getPosition().z,'Zombie hands must reach forward');
    const zombieMesh=root.proxyBody.render.meshInstances[0].mesh;
    const face=root.joints.head.render.meshInstances[0].material,damaged=root.joints.torso.render.meshInstances[0].material,uvs=[];zombieMesh.getUvs(0,uvs);assert.equal(uvs.length,zombieMesh.vertexBuffer.numVertices*2);assert(new Set(uvs).size>1);
    for(const distance of [21.9,22.1,21.8,22.2,25,22.1,21.9,19,60,51.9,52.1,49,115,108,112,105,0]){
        visuals.update(actor,.1,11,{x:2+distance,z:3},QUALITY_PROFILES.high);
        assert.equal(root.proxyHead.render.meshInstances[0].material,face);assert.equal(root.proxyBody.render.meshInstances[0].material,damaged);
        assert.equal(root.proxyBody.render.meshInstances[0].mesh,zombieMesh);
        if(root.detail&&root.visualLOD===0){assert.equal(root.joints.head.render.meshInstances[0].material,face);assert.equal(root.joints.torso.render.meshInstances[0].material,damaged);}
        assert.equal(root.proxyBody.enabled,root.visualLOD===1||root.visualLOD===2);if(root.detail)assert.equal(root.detail.enabled,root.visualLOD===0);
    }
    visuals.update(actor,.1,11,{x:32,z:3},QUALITY_PROFILES.high);assert.equal(root.visualLOD,1);assert(root.proxyHead.getLocalPosition().z<0);assert.equal(root.proxyBody.render.meshInstances[0].mesh,zombieMesh);
    actor.type='civilian';visuals.update(actor,.1,11,{x:2,z:3},QUALITY_PROFILES.high);
    assert.equal(root.joints.torso.render.material,identity.body);assert.equal(root.joints.neck.render.material,skin);assert.equal(root.joints.armL.end.render.material,skin);
    assert.equal(root.proxyHead.getLocalPosition().z,0);assert.notEqual(root.proxyBody.render.meshInstances[0].mesh,zombieMesh);
    actor.type='zombie';
    actor.walkDistance=.1;visuals.update(actor,.1,12,{x:1000,z:1000},QUALITY_PROFILES.quest);assert.equal(root.detail,null);assert.equal(root.proxyBody.enabled,false);assert.equal(actor.walkDistance,0);
    actor.walkDistance=.1;visuals.update(actor,.1,13,{x:2,z:3},QUALITY_PROFILES.quest);assert(root.detail);root.detail.forEach(e=>{for(const mi of e.render?.meshInstances||[])assert(mi.mesh.vertexBuffer,'Shared mesh freed during LOD destruction');});
    assert.equal(root.appearance,identity);assert.equal(root.getPosition().equals(position),true);root.destroy();
}
const idle=locomotionPose({id:1,type:'civilian',walkDistance:0,lastScream:-99},.1,10),flee=locomotionPose({id:1,type:'civilian',state:'flee',walkDistance:.5,lastScream:-99},.1,10),zombie=locomotionPose({id:1,type:'zombie',walkDistance:.2,lastScream:-99,lastVisualAttack:10},.1,10);
assert(Math.abs(flee.legL)>Math.abs(idle.legL));assert.equal(flee.lean,9);assert(zombie.armL>50);assert.equal(zombie.lean,-24);assert(zombie.legL!==-zombie.legR);assert.equal(zombie.attack,1);

app.townProfile=QUALITY_PROFILES.high;const pbr=createPBRLibrary(pc,app),brick=pbr.material('brick'),normal=brick.normalMap;
assert.equal(brick.glossMapChannel,'g');assert.equal(brick.glossInvert,true);assert.equal(brick.aoMapChannel,'r');assert.equal(brick.metalnessMapChannel,'b');assert.equal(brick.diffuseMap.width,512);
pbr.setQuality(QUALITY_PROFILES.quest);assert.equal(brick.diffuseMap.width,256);assert.notEqual(brick.normalMap,normal);pbr.setQuality(QUALITY_PROFILES.high);assert.equal(brick.normalMap,normal);

const parts=[],footprints=[],batches=new Map();app.batcher={addGroup(name){const group={id:batches.size,name};batches.set(group.id,[{meshInstance:{visible:true}}]);return group;},generate(){},getBatches:id=>batches.get(id)};
const box=(name,p,size,m)=>{const e=new Entity(name);app.root.addChild(e);e.setPosition(p);e.setLocalScale(size);e.addComponent('render',{});e.render.material=m;parts.push(e);return e;};
const town=createTownArt(pc,app,box,(x,y,z)=>new engine.Vec3(x,y,z),pbr,()=>mat(),(...args)=>footprints.push(args));
town.building(19,19,24,25,12,brick);town.building(19,57,24,25,12,brick);
town.streetKit([{axis:'x',value:38},{axis:'z',value:0}],38,130);const vehicle=town.vehicle(60,38,true,brick,'van',true);
assert.equal(vehicle.width,4.55);assert(vehicle.height>2);assert(parts.some(e=>e.name==='Recessed shop back wall'));assert(parts.some(e=>e.name==='Interior warm ceiling'));assert(parts.some(e=>e.name==='Shutter louvre'));assert(parts.some(e=>e.name==='Upper window recess'));assert(parts.some(e=>e.name==='Double yellow no-parking line'));assert(parts.some(e=>e.name==='Door handle'));assert(parts.length<5000);
const hullNormals=[];app.root.findByName('Vehicle shaped van').render.meshInstances[0].mesh.getNormals(hullNormals);assert(hullNormals[0]<0,'Left vehicle corner must have outward normal');
for(const e of parts){for(const n of [...e.getPosition().toArray(),...e.getLocalScale().toArray()])assert(Number.isFinite(n));}
assert(footprints.length>=10);const saved=JSON.stringify(footprints);town.prepare(parts);town.update({x:0,z:38},1,QUALITY_PROFILES.high);assert([...batches.values()].flat().some(b=>b.meshInstance.visible));town.update({x:1000,z:1000},2,QUALITY_PROFILES.quest);assert([...batches.values()].flat().every(b=>!b.meshInstance.visible));assert.equal(JSON.stringify(footprints),saved);
const agents=Array.from({length:505},(_,id)=>{const e=new Entity('actor');e.setPosition(500+id*2,0,500);return {id,type:id<400?'civilian':id<403?'police':id<405?'firefighter':'zombie',entity:e,initialPosition:e.getPosition().clone()};});
const initial=agents.map(a=>a.initialPosition.clone());assert.equal(arrangeStreetBenchmark(agents,38,()=>false),100);assert.equal(agents.length,505);assert.equal(agents.filter(a=>a.type==='zombie').length,100);for(let i=0;i<agents.length;i++)assert(initial[i].equals(agents[i].initialPosition));
console.log(`PASS: PBR normal/ORM maps; PC/Quest profiles; real-engine near meshes (<5k triangles), LOD release/recreation and retained identity; ${parts.length} street components with stable collision; 100 local actors with full 505-actor simulation`);
