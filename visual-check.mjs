import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';
import {surfacePixels} from './src/procedural-surfaces.js';
for(const kind of ['road','pavement','grass']){const p=surfacePixels(kind);assert.equal(p.length,128*128*4);assert.deepEqual(p,surfacePixels(kind));assert(new Set(p).size>20);for(let i=3;i<p.length;i+=4)assert.equal(p[i],255);}
const source=fs.readFileSync('src/main.js','utf8');
class Entity {constructor(name){this.name=name;this.children=[];}addChild(child){this.children.push(child);}setLocalPosition(x,y,z){this.position={x,y,z};}setLocalEulerAngles(x,y,z){this.rotation={x,y,z};}}
const context={pc:{Entity},choose:a=>a[0],skinMaterials:[{}],clothesMaterials:[{}],mats:{},v3:(x,y,z)=>({x,y,z}),box:(name,pos,size,mat,parent)=>{const e={name,pos,size};parent.addChild(e);return e;},sphere:(name,pos,size,mat,parent)=>parent.addChild({name,pos,size})};
vm.createContext(context);vm.runInContext(source.slice(source.indexOf('function makePersonMesh('),source.indexOf('function spawnAgent(')),context);vm.runInContext(source.slice(source.indexOf('function animatePerson('),source.indexOf('function updateZombie(')),context);
for(const age of ['adult','child'])for(const type of ['civilian','zombie','police','firefighter']){
 const root=context.makePersonMesh(type,age),a={entity:root,type,walkDistance:1};assert.equal(root.children.filter(e=>e.name.endsWith('joint')).length,4);
 for(const joint of Object.values(root.limbs)){assert(joint.position.y>0);assert(joint.children[0].pos.y<0);assert(joint.children[0].size.y>0);}
 context.animatePerson(a,.1);assert(Math.abs(root.limbs.legL.rotation.x)>10);assert(root.limbs.armL.rotation.x<=(type==='zombie'?-30:30));assert.equal(a.walkDistance,0);
 a.walkDistance=0;context.animatePerson(a,.1);assert(Math.abs(root.limbs.legL.rotation.x)<=1.5);
}
console.log('PASS: deterministic opaque surface textures, adult/child hip/shoulder joints, visible walking, idle and zombie reach');
