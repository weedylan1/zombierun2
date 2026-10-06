const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('src/main.js','utf8');
let seed=73;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const agents=Array.from({length:450},(_,id)=>{
 const position={x:random()*238-119,z:random()*238-119};
 return {id,type:id%4?'civilian':'zombie',dead:false,position,entity:{getPosition:()=>position}};
});
const context={Math,agents,dist2:(a,b)=>(a.x-b.x)**2+(a.z-b.z)**2};vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('const CELL='),source.indexOf('// Noise')),context);
context.rebuildGrid();
function check(pos,r,filter=null){
 const expected=agents.filter(a=>!a.dead&&(!filter||filter(a))&&context.dist2(pos,a.position)<=r*r).map(a=>a.id).sort((a,b)=>a-b);
 const buffer=[{id:-1}];const found=context.nearby(pos,r,filter,buffer);
 assert.equal(found,buffer,'Query should reuse and clear its output buffer');
 assert.deepEqual(Array.from(found,a=>a.id).sort((a,b)=>a-b),expected,'Crowd query differs from current-position full scan');
}
for(let i=0;i<4000;i++){
 const actor=agents[i%agents.length];
 // Include crossings of positive/negative cells and unusually large frame steps.
 actor.position.x=Math.max(-119,Math.min(119,actor.position.x+random()*12-6));
 actor.position.z=Math.max(-119,Math.min(119,actor.position.z+random()*12-6));
 context.updateCrowdCell(actor);
 check(actor.position,random()*4,i%2?a=>a.type==='zombie':null);
 if(i%10===0)check({x:random()*238-119,z:random()*238-119},1.4);
}
const actor=agents[0];actor.dead=true;context.updateCrowdCell(actor);check(actor.position,4);
actor.dead=false;actor.type='zombie';actor.position.x=-.01;actor.position.z=-3;context.updateCrowdCell(actor);check(actor.position,4,a=>a.type==='zombie');
// Some engines return a fresh position object; refresh it even within one cell.
actor.entity.getPosition=()=>({...actor.position});
actor.position.x=.1;actor.position.z=.1;context.updateCrowdCell(actor);
actor.position.x=.2;actor.position.z=.2;context.updateCrowdCell(actor);
check(actor.position,1.4);
// Simulate a restart teleport and rebuild, followed by repeated rebuilding.
agents.forEach((a,i)=>{a.position.x=i%7*34-102;a.position.z=Math.floor(i/7)*3-95;});
context.rebuildGrid();context.rebuildGrid();
for(const a of agents)check(a.position,1.4);
console.log('PASS: 4,400 moving crowd queries plus reset checks match full scans; cell crossings, deaths, conversions, negative coordinates, and reusable buffers covered');
// Drive actual movement across fine-grid boundaries while actors approach head on.
function v3(x=0,y=0,z=0){return {x,y,z,set(x,y,z){Object.assign(this,{x,y,z});return this;}};}
const pair=[-3,3].map((x,id)=>{
 const p=v3(x,0,0);return {id,type:'civilian',speed:2,facing:v3(id?-1:1,0,0),target:v3(id?-10:10,0,0),entity:{getPosition:()=>p,setPosition(x,y,z){p.set(x,y,z);},lookAt(){}}};
});
const movement={Math,performance,agents:pair,roadObstacleBoxes:[],MIN_AGENT_SPACING:1.4,v3,dist2:context.dist2,blocked:()=>false,segmentHitsBuilding:()=>false,segmentHitsObstacle:()=>false,movementBlocked:()=>false,obstacleAreaClear:()=>false,randomStreetPoint:()=>v3(0,0,10)};
vm.createContext(movement);
vm.runInContext(source.slice(source.indexOf('const CELL='),source.indexOf('// Noise')),movement);
vm.runInContext(source.slice(source.indexOf('function steerMove('),source.indexOf('function animatePerson(')),movement);
movement.rebuildGrid();
for(let frame=0;frame<300;frame++){
 for(const actor of pair)movement.steerMove(actor,actor.target,1/60);
 assert(Math.sqrt(movement.dist2(pair[0].entity.getPosition(),pair[1].entity.getPosition()))>=1.4-1e-6,'Head-on actors lost minimum spacing');
}
console.log('PASS: actual head-on NPC movement retains minimum spacing while crossing fine-grid cells');
pair[0].type='zombie';pair[1].type='zombie';
const anchor=pair[0].entity.getPosition();pair[1].entity.setPosition(anchor.x+2,0,anchor.z);movement.updateCrowdCell(pair[1]);
assert.deepEqual(Array.from(movement.nearby(anchor,3,pair[0].neighbourFilter),a=>a.id),[1],'Reused neighbour filter did not follow conversion');
for(let i=0;i<3000;i++){
 const positions=Array.from({length:i%7},()=>({x:random()*4-2,z:random()*4-2}));
 const x=random()-.5,z=random()-.5,current=random()*.8;
 const expected=positions.reduce((sum,p)=>sum+Math.max(0,1.4-Math.hypot(x-p.x,z-p.z)),0);
 assert(Math.abs(movement.crowdOverlap(positions,x,z)-expected)<1e-12,'Optimised overlap differs');
 assert.equal(movement.crowdMoveBlocked(positions,x,z,current),current>.00001?expected>=current-.000001:expected>.00001);
 assert.equal(movement.crowdMoveBlocked(positions,x,z,0),expected>.00001);
}
console.log('PASS: cached position snapshots, conversion-aware neighbour filters, and 3,000 overlap comparisons retain crowd rules');
