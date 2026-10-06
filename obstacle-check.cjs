const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('src/main.js','utf8');
function v3(x=0,y=0,z=0){return {x,y,z,set(x,y,z){Object.assign(this,{x,y,z});},clone(){return v3(this.x,this.y,this.z);}};}
const bounds=[];
const context={Math,performance,CITY_HALF:112,buildingBoxes:[],roadObstacleBoxes:bounds,v3,MIN_AGENT_SPACING:1.4,updateCrowdCell:()=>{},dist2:(a,b)=>(a.x-b.x)**2+(a.z-b.z)**2,nearby:()=>[],rand:(a,b)=>a+Math.random()*(b-a),choose:a=>a[Math.floor(Math.random()*a.length)]};
vm.createContext(context);
context.ROAD_POSITIONS=[-102,-68,-34,0,34,68,102];
vm.runInContext(source.slice(source.indexOf('function addRoadObstacle('),source.indexOf('const roadLines')),context);
vm.runInContext(source.slice(source.indexOf('function blocked('),source.indexOf('// Player')),context);
context.addRoadObstacle(0,0,0.7,0.7);
assert(context.blocked(0,0,0.35));
assert(context.segmentHitsBuilding(v3(-3,0,0),v3(3,0,0)));
assert(!context.segmentHitsBuilding(v3(-3,0,2),v3(3,0,2)));
assert(context.segmentHitsBuilding(v3(-0.8,0,0),v3(0.8,0,0),0.5,false));
context.player={getPosition:()=>v3(100,0,100)};context.gameOver=false;context.won=false;
const human={type:'civilian',dead:false,entity:{getPosition:()=>v3(3,0,0)}};
const zombie={entity:{getPosition:()=>v3(-3,0,0)},facing:v3(1,0,0)};
context.nearby=()=>[human];
vm.runInContext(source.slice(source.indexOf('function canSee('),source.indexOf('function setZombie(')),context);
assert.equal(context.closestHumanForZombie(zombie),null,'Close detection must not bypass a bin');
bounds.length=0;assert.equal(context.closestHumanForZombie(zombie),human,'Visible human should be detected');
context.addRoadObstacle(0,0,3.8,1.8);context.nearby=()=>[];
for(let i=0;i<1000;i++){const p=context.randomStreetPoint();assert(!context.blocked(p.x,p.z,0.55),'Spawn or roaming point inside obstacle');}
vm.runInContext(source.slice(source.indexOf('function steerMove('),source.indexOf('function animatePerson(')),context);
for(const type of ['civilian','zombie']){
 const p=v3(-5,0,0),actor={id:1,type,speed:2,facing:v3(1,0,0),entity:{getPosition:()=>p,setPosition(x,y,z){p.set(x,y,z);},lookAt(){}}};
 let passed=false;
 for(let frame=0;frame<600;frame++){context.steerMove(actor,v3(5,0,0),1/60);assert(!context.blocked(p.x,p.z,0.35),type+' crossed through car');if(p.x>2.3)passed=true;}
 assert(passed,type+' did not navigate past the car');
 console.log(type+' navigated around car; final position '+JSON.stringify(p));
}
bounds.length=0;context.addRoadObstacle(0,0,0.12,0.12,false);
assert(!context.segmentHitsBuilding(v3(-1,0,0),v3(1,0,0)),'Thin lamp should not provide hiding cover');
assert(context.segmentHitsBuilding(v3(-1,0,0),v3(1,0,0),0.35,false),'Movement must not tunnel through lamp');
console.log('PASS: obstacle collision, cover, close detection, clear spawn points, and navigation');
bounds.length=0;context.agents=[];context.playerSpawn=v3(-102,0,90);context.MIN_ZOMBIE_SPAWN_DISTANCE=35;
vm.runInContext(source.slice(source.indexOf('function spacedSpawnPosition('),source.indexOf('function makePersonMesh(')),context);
for(let i=0;i<500;i++){
 const p=context.spacedSpawnPosition(context.playerSpawn,'zombie');
 assert(context.dist2(p,context.playerSpawn)>=35**2,'Zombie spawned in player safety radius');
 assert(!context.blocked(p.x,p.z,0.35));
}
context.randomStreetPoint=()=>context.playerSpawn.clone();
const fallback=context.spacedSpawnPosition(context.playerSpawn,'zombie');
assert(context.dist2(fallback,context.playerSpawn)>=35**2,'Fallback bypassed safe spawn distance');
console.log('PASS: 500 zombie spawn checks and forced fallback keep at least 35 metres from player');

// A tight group approaches the same car corner; every actor must get through.
bounds.length=0;context.addRoadObstacle(0,0,3.8,1.8);
const crowd=Array.from({length:8},(_,i)=>{
 const p=v3(-5-Math.floor(i/2)*1.5,0,(i%2?1:-1)*0.75);
 return {id:i+1,type:'zombie',speed:2,facing:v3(1,0,0),entity:{getPosition:()=>p,setPosition(x,y,z){p.set(x,y,z);},lookAt(){}}};
});
context.nearby=(p,r,filter)=>crowd.filter(a=>filter(a)&&context.dist2(p,a.entity.getPosition())<=r*r);
let reversals=0;const passed=new Set();
for(let frame=0;frame<1200;frame++)for(const actor of crowd){
 const before={...actor.entity.getPosition()},heading=actor.moveHeading;
 context.steerMove(actor,v3(15,0,0),1/60);
 const after=actor.entity.getPosition();
 assert(!context.blocked(after.x,after.z,0.35),'Crowd crossed through car');
 const dx=after.x-before.x,dz=after.z-before.z;
 if(heading&&dx*heading.x+dz*heading.z < -0.01)reversals++;
 if(after.x>3)passed.add(actor.id);
}
assert.equal(passed.size,crowd.length,'Some crowded NPCs never passed the car');
assert(reversals<60,'Crowd repeatedly reversed direction: '+reversals);
console.log('PASS: eight crowded zombies pass car without rapid reversals ('+reversals+')');
