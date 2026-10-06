const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('src/main.js','utf8');
let seed=2048;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const buildingBoxes=[],roadObstacleBoxes=[];
for(let i=0;i<240;i++){
 const x=random()*240-120,z=random()*240-120,w=random()*20+.1,d=random()*20+.1;
 (i%2?buildingBoxes:roadObstacleBoxes).push({minx:x-w/2,maxx:x+w/2,minz:z-d/2,maxz:z+d/2,occludes:i%7!==0});
}
roadObstacleBoxes.push({minx:-119,maxx:119,minz:119,maxz:119.6,occludes:false});
const context={Math,CITY_HALF:112,buildingBoxes,roadObstacleBoxes};vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('function blocked('),source.indexOf('function randomStreetPoint(')),context);
const all=[...buildingBoxes,...roadObstacleBoxes];
function bruteRay(a,b,r,sight){
 for(const bounds of all){
  if(sight&&bounds.occludes===false)continue;
  let enter=0,exit=1;
  for(const axis of ['x','z']){
   const delta=b[axis]-a[axis],min=bounds['min'+axis]-r,max=bounds['max'+axis]+r;
   if(Math.abs(delta)<.000001){if(a[axis]<min||a[axis]>max){enter=2;break;}}
   else{const t1=(min-a[axis])/delta,t2=(max-a[axis])/delta;enter=Math.max(enter,Math.min(t1,t2));exit=Math.min(exit,Math.max(t1,t2));}
  }
  if(enter<=exit&&exit>0&&enter<1)return true;
 }
 return false;
}
let candidateCount=0;
for(let i=0;i<5000;i++){
 const x=random()*260-130,z=random()*260-130,r=random();
 const expected=Math.abs(x)>119||Math.abs(z)>119||all.some(b=>x+r>b.minx&&x-r<b.maxx&&z+r>b.minz&&z-r<b.maxz);
 assert.equal(context.blocked(x,z,r),expected,'Point collision differs from full obstacle scan');
 const a={x,z},b={x:random()*260-130,z:random()*260-130};
 assert.equal(context.segmentHitsBuilding(a,b,r,true),bruteRay(a,b,r,true),'Cover ray differs');
 assert.equal(context.segmentHitsBuilding(a,b,r,false),bruteRay(a,b,r,false),'Swept movement differs');
 const endBlocked=Math.abs(b.x)>119||Math.abs(b.z)>119||all.some(bounds=>b.x+r>bounds.minx&&b.x-r<bounds.maxx&&b.z+r>bounds.minz&&b.z-r<bounds.maxz);
 assert.equal(context.movementBlocked(a.x,a.z,b.x,b.z,r),endBlocked||bruteRay(a,b,r,false),'Combined movement collision differs from destination plus swept checks');
 candidateCount+=context.obstacleCandidates(x-r,z-r,x+r,z+r).length;
}
console.log(`PASS: 5,000 point checks and 10,000 rays match full scans; local queries average ${(candidateCount/5000).toFixed(1)} of ${all.length} obstacles`);
let clearHits=0;
for(let path=0;path<150;path++){
 const actor={},p={x:random()*220-110,z:random()*220-110};
 for(let step=0;step<30;step++){
  const next={x:p.x+random()*2-1,z:p.z+random()*2-1},r=.35;
  if(context.obstacleAreaClear(actor,p.x,p.z,next.x,next.z,r)){clearHits++;assert(!bruteRay(p,next,r,false),'Cached area incorrectly marked an obstacle crossing clear');}
  const endBlocked=Math.abs(next.x)>119||Math.abs(next.z)>119||all.some(b=>next.x+r>b.minx&&next.x-r<b.maxx&&next.z+r>b.minz&&next.z-r<b.maxz);
  assert.equal(context.movementBlocked(p.x,p.z,next.x,next.z,r,actor.clearArea),endBlocked||bruteRay(p,next,r,false),'Cached movement differs from full collision scan');
  p.x=next.x;p.z=next.z;
 }
}
assert(clearHits>100,'Paths did not sufficiently exercise clear-area caching');
const changed={Math,CITY_HALF:112,buildingBoxes:[],roadObstacleBoxes:[]};vm.createContext(changed);
vm.runInContext(source.slice(source.indexOf('function addRoadObstacle('),source.indexOf('const roadLines')),changed);
vm.runInContext(source.slice(source.indexOf('function blocked('),source.indexOf('function randomStreetPoint(')),changed);
const walker={};assert(changed.obstacleAreaClear(walker,0,0,4,0,.35));
assert(!changed.movementBlocked(0,0,4,0,.35,walker.clearArea));
changed.addRoadObstacle(2,0,1,1);
assert(changed.movementBlocked(0,0,4,0,.35,walker.clearArea),'New obstacle did not invalidate clear-area cache');
assert(!changed.obstacleAreaClear(walker,0,0,4,0,.35));
console.log(`PASS: 4,500 cached movement checks match full scans; ${clearHits} clear results, direction changes, area exits, and obstacle invalidation covered`);
// Loud events must still affect exactly the living zombies inside the radius.
const agents=Array.from({length:80},(_,i)=>({type:i%3?'zombie':'civilian',dead:i%11===0,state:i%13===0?'feed':'wander',entity:{getPosition:()=>({x:i*10-400,z:0})}}));
const noises=[{pos:{x:0,z:0,clone(){return {x:0,z:0};}},radius:150,type:'scream',until:10}];
let nearbyCalls=0;
Object.assign(context,{agents,noises,dist2:(a,b)=>(a.x-b.x)**2+(a.z-b.z)**2,nearby:()=>{nearbyCalls++;return [];}});
vm.runInContext(source.slice(source.indexOf('function updateNoises('),source.indexOf('function canSee(')),context);
context.updateNoises(1);
assert.equal(nearbyCalls,0,'Loud sound should not scan empty grid cells');
for(const a of agents){const p=a.entity.getPosition();assert.equal(a.heard!==undefined,!a.dead&&a.type==='zombie'&&a.state!=='feed'&&p.x*p.x<=150*150);}
console.log('PASS: loud sounds preserve hearing radius, dead/type filtering, and feeding exclusions');
