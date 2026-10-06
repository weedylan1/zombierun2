import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {walkwayHeight,walkStepBlocked} from './src/walkways.js';
const source=fs.readFileSync('src/main.js','utf8'),created=[];
let seed=Number(process.argv[2]||151);const math=Object.create(Math);math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const v3=(x=0,y=0,z=0)=>({x,y,z});
const context={Math:math,worldRandom:math.random,v3,rand:(a,b)=>a+math.random()*(b-a),choose:a=>a[Math.floor(math.random()*a.length)],dist2:(a,b)=>(a.x-b.x)**2+(a.z-b.z)**2,buildingMaterials:[{},{},{},{},{}],mats:{},box(name,pos,size){created.push({name,pos,size});return {setEulerAngles(){}};},createCityDetails:()=>({facade:m=>m,carPaint:m=>m,decorate(){},backdrop(){},sign:t=>t})};
vm.createContext(context);
context.pc={Entity:class {constructor(name){this.name=name;}addComponent(){this.render={};}setPosition(){}setLocalScale(){}setEulerAngles(){}}};context.app={root:{addChild(){}}};context.staticCityEntities=[];context.clothesMaterials=[{}];
vm.runInContext(source.slice(source.indexOf('const WORLD_SCALE='),source.indexOf('function randomStreetPoint(')),context);
vm.runInContext('this.world={limit:CITY_HALF+7,buildings:buildingBoxes,obstacles:roadObstacleBoxes,crossings,shop:archeryPickupPosition,sporting:sportingPickupPosition,ammo:alleyAmmoPosition,escape:FIRE_ESCAPE,roads:ROAD_POSITIONS};',context);
const {world}=context;
assert(Math.abs((world.limit/119)**2-1.25)<1e-12,'Playable area did not increase by exactly 25%');
assert.equal(world.crossings.length,4);
assert.equal(created.filter(e=>e.name==='Alley fence').length,5);
assert.equal(created.filter(e=>e.name==='Narrow alley paving').length,6);
assert.equal(created.filter(e=>e.name==='Archery store sign').length,1);
assert(Math.hypot(world.shop.x,world.shop.z)<45,'Archery shop is not central');
for(const crossing of world.crossings.filter(c=>!c.fireEscape)){
 const from={x:crossing.x,z:crossing.z+6.2},to={x:crossing.x,z:crossing.z-4.2};
 assert(!walkStepBlocked(from,to,world.crossings,context.obstacleCandidates,world.limit),'Dumpster/plank crossing blocked');
 assert(!walkStepBlocked(to,from,world.crossings,context.obstacleCandidates,world.limit),'Crossing does not work in reverse');
 assert(walkStepBlocked(from,to,[],context.obstacleCandidates,world.limit),'Ground movement bypassed the fence');
 assert(walkwayHeight(crossing.x,crossing.z,world.crossings)>2.2,'Planks do not clear fence height');
}
for(const fence of created.filter(e=>e.name==='Alley fence')){
 if(world.crossings.some(c=>Math.abs(c.x-fence.pos.x)<.01&&Math.abs(c.z-fence.pos.z)<.01))continue;
 assert(walkStepBlocked({x:fence.pos.x,z:fence.pos.z+4},{x:fence.pos.x,z:fence.pos.z-4},world.crossings,context.obstacleCandidates,world.limit),'Unbridged alley fence should remain blocked');
}
assert(!context.blocked(world.shop.x,world.shop.z+1.25,.5),'Crossbow pickup cannot be approached');
assert(Math.hypot(world.sporting.x-world.roads[0],world.sporting.z-90*Math.sqrt(1.25))<15,'Shotgun store too far from spawn');
assert(!context.blocked(world.sporting.x-1.25,world.sporting.z,.5),'Shotgun cannot be approached');
console.log('PASS: 25% larger playable area, central archery shop, six alleys, five fences, three bidirectional plank crossings, two blocked exits, and accessible crossbow stand');

const escape=world.crossings.find(c=>c.fireEscape);
assert(escape);
assert(!walkStepBlocked({x:escape.x,z:escape.z+16.1},{x:escape.x,z:escape.z},world.crossings,context.obstacleCandidates,world.limit),'Player cannot climb fire escape');
assert(walkStepBlocked({x:escape.x-3,z:escape.z},{x:escape.x,z:escape.z},world.crossings,context.obstacleCandidates,world.limit),'Player entered landing sideways from ground');
assert(context.movementBlocked(escape.x,escape.z+17,escape.x,escape.z+15,.35),'Zombie can enter stairs');
assert.equal(walkwayHeight(escape.x,escape.z,world.crossings),6);
assert(!context.blocked(world.ammo.x,world.ammo.z,.5),'Alley ammunition unreachable');
assert.equal(created.filter(e=>e.name==='Fire escape steel tread').length,28);
console.log('PASS: accessible ammo cache, player stair ascent, raised landing, side-entry guard, and zombie exclusion');
