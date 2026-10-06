const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('src/main.js','utf8');
const steering=source.slice(source.indexOf('function steerMove('),source.indexOf('function animatePerson('));
function v3(x=0,y=0,z=0){return {x,y,z,set(x,y,z){Object.assign(this,{x,y,z});}};}
const agents=[];
for(const [x,z] of [[0,0],[0.8,0],[-0.8,0],[0,0.8],[0,-0.8]]){
 const position=v3(x,0,z);
 agents.push({id:agents.length+1,type:'zombie',speed:1.2,state:'wander',facing:v3(),entity:{getPosition:()=>position,setPosition(x,y,z){position.set(x,y,z);},lookAt(){}}});
}
const context={performance,Math,roadObstacleBoxes:[],MIN_AGENT_SPACING:1.4,v3,dist2:(a,b)=>(a.x-b.x)**2+(a.z-b.z)**2,blocked:()=>false,segmentHitsBuilding:()=>false,randomStreetPoint:()=>v3(20,0,20),nearby:(p,r,filter)=>agents.filter(a=>filter(a)&&(p.x-a.entity.getPosition().x)**2+(p.z-a.entity.getPosition().z)**2<=r*r)};
context.agents=agents;
context.segmentHitsObstacle=()=>false;context.movementBlocked=()=>false;
context.obstacleAreaClear=()=>false;
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('const CELL='),source.indexOf('// Noise')),context);
context.rebuildGrid();
vm.runInContext(steering,context);
const initial=agents.map(a=>({...a.entity.getPosition()}));
for(let frame=0;frame<600;frame++)for(const a of agents)context.steerMove(a,v3(20,0,20),1/60);
console.log(JSON.stringify(agents.map((a,i)=>({id:a.id,travel:Math.hypot(a.entity.getPosition().x-initial[i].x,a.entity.getPosition().z-initial[i].z)}))));
if(agents.some((a,i)=>Math.hypot(a.entity.getPosition().x-initial[i].x,a.entity.getPosition().z-initial[i].z)<1))process.exitCode=1;

let now=0;
Object.assign(context,{agents,ENABLE_EATING:false,performance:{now:()=>now*1000},rand:(a,b)=>(a+b)/2,randomAgentSpeed:()=>1.2,showMessage(){},emitNoise(){},mats:{zombie:{}},closestHumanForZombie:()=>null});
for(const a of agents){
 a.entity.findByName=()=>null;a.entity.setLocalEulerAngles=()=>{};a.entity.getEulerAngles=()=>({y:0});
 a.attackers=new Set();a.nextThink=0;a.nextAttack=0;a.lastScream=-99;a.lastActivityAt=0;
}
vm.runInContext(source.slice(source.indexOf('function setZombie('),source.indexOf('function dropWeapon(')),context);
vm.runInContext(source.slice(source.indexOf('function updateZombie('),source.indexOf('function dangerTargetForHuman(')),context);
vm.runInContext(source.slice(source.indexOf('function updateHuman('),source.indexOf('function updatePolice(')),context);
agents.forEach((a,i)=>a.entity.setPosition(initial[i].x,0,initial[i].z));
context.rebuildGrid();
const victim=agents[0];victim.type='civilian';victim.biteCount=0;victim.infectionAt=0;
context.biteHuman(victim,agents[1],0);context.startEating(victim,agents.slice(1),0);
if(victim.eaten||agents.some(a=>a.state==='feed'))throw Error('Disabled eating rule still activated');
now=29.9;context.updateHuman(victim,1/60,now);
if(victim.type!=='civilian'||!victim.fallen||victim.dead)throw Error('Bitten victim did not remain fallen until infection deadline');
now=30;context.updateHuman(victim,1/60,now);
if(victim.type!=='zombie'||victim.fallen)throw Error('Victim failed to convert and stand');
if(victim.hp!==2)throw Error('Converted zombie did not receive zombie health');
for(let frame=0;frame<600;frame++){now=30+frame/60;for(const a of agents)context.updateZombie(a,1/60,now);}
const after=agents.map((a,i)=>({id:a.id,state:a.state,travel:Math.sqrt(context.dist2(a.entity.getPosition(),initial[i]))}));
console.log('After bite conversion with eating disabled:',JSON.stringify(after));
if(after.some(a=>a.state==='feed'||a.travel<1))throw Error('Converted zombie or feeder remained stuck');
console.log('PASS: eating disabled, 30-second bite conversion, and movement of every individual');
agents.slice(1).forEach(a=>a.dead=true);
victim.entity.setPosition(0,0,0);victim.routeTarget=null;victim.facing.set(0,0,-1);
context.rebuildGrid();
for(let frame=0;frame<600;frame++){now=40+frame/60;context.steerMove(victim,v3(0,0,0),1/60);}
const loneTravel=Math.hypot(victim.entity.getPosition().x,victim.entity.getPosition().z);
console.log('Isolated zombie starting exactly at target, metres:',loneTravel);
if(loneTravel<1)throw Error('Isolated zombie stayed at its target');
vm.runInContext(source.slice(source.indexOf('function killZombie('),source.indexOf('function playerAttack(')),context);
context.setTimeout=()=>{throw Error('Zombie death scheduled disappearance');};
victim.entity.enabled=true;context.killZombie(victim);
if(!victim.dead||victim.state!=='dead'||!victim.entity.enabled)throw Error('Killed zombie did not remain visible');
console.log('PASS: converted zombie health and visible corpse without automatic removal');
const policeContext={Math,dist2:context.dist2,nearby:()=>[enemy],segmentHitsBuilding:()=>false,emitNoise(){shots++;},updateHuman(){retreats++;},killZombie(){throw Error('High-health test target unexpectedly killed');}};
const enemy={type:'zombie',hp:100,entity:{getPosition:()=>v3(10,0,0)}};
const officer={ammo:6,nextShot:0,facing:{set(){return this;},normalize(){return this;}},entity:{getPosition:()=>v3(0,0,0),lookAt(){}}};
let shots=0,retreats=0;
vm.createContext(policeContext);vm.runInContext(source.slice(source.indexOf('function updatePolice('),source.indexOf('function updateFirefighter(')),policeContext);
policeContext.weaponAudio={shoot(){}};policeContext.player={getPosition:()=>v3(0,0,0)};
for(let second=0;second<12;second++)policeContext.updatePolice(officer,1/60,second);
if(shots!==6||officer.ammo!==0||retreats!==6)throw Error('Police ammunition limit or fallback failed');
console.log('PASS: exactly six shots, zero ammo remaining, and flee fallback after exhaustion');
