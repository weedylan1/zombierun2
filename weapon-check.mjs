import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {traceBolt} from './src/crossbow.js';import {createWeaponAudio} from './src/weapon-audio.js';
const source=fs.readFileSync('src/main.js','utf8');
function v3(x=0,y=0,z=0){return {x,y,z,clone(){return v3(this.x,this.y,this.z);},cross(a,b){this.x=a.y*b.z-a.z*b.y;this.y=a.z*b.x-a.x*b.z;this.z=a.x*b.y-a.y*b.x;return this;},normalize(){const l=Math.hypot(this.x,this.y,this.z)||1;this.x/=l;this.y/=l;this.z/=l;return this;}};}
let now=0;const drops=[],sounds=[];
const target={type:'zombie',dead:false,age:'adult',entity:{getPosition:()=>v3(0,0,-10)}};
const context={Math,performance:{now:()=>now*1000},gameOver:false,won:false,playerWeapon:'shotgun',playerAmmo:5,lastPlayerShot:-99,agents:[target],traceBolt,v3,player:{getPosition:()=>v3()},crossbowAim:()=>({origin:v3(0,1,0),direction:v3(0,0,-1)}),obstacleCandidates:()=>[],dropWeapon(type,pos,ammo){assert.equal(ammo,0);drops.push(type);},heldShotgun:{enabled:true},heldCrossbow:null,updateWeaponHud(){},emitNoise(){},weaponAudio:{shoot:type=>sounds.push(type)},killZombie(a){a.dead=true;},bolts:[],mats:{},box:()=>({lookAt(){}}),showMessage(){}};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('function dropEmptyWeapon('),source.indexOf('function crossbowMesh(')),context);
vm.runInContext(source.slice(source.indexOf('function playerAttack('),source.indexOf('// XR')),context);
context.playerAttack();assert(target.dead);assert.equal(context.playerAmmo,4);context.playerAttack();assert.equal(context.playerAmmo,4);
for(let i=1;i<5;i++){now=i;context.playerAttack();if(i<4)assert.equal(context.playerWeapon,'shotgun');}assert.equal(context.playerWeapon,null);assert.equal(context.heldShotgun.enabled,false);assert.deepEqual(drops,['shotgun']);assert.equal(sounds.length,5);
context.playerWeapon='crossbow';context.playerAmmo=6;context.lastPlayerShot=-99;
for(let i=0;i<6;i++){now=i+2;context.playerAttack();}
assert.equal(context.playerWeapon,null);assert.equal(context.playerAmmo,0);assert.equal(context.bolts.length,6);assert.deepEqual(drops,['shotgun','crossbow']);assert.equal(sounds.filter(t=>t==='crossbow').length,6);
const entity={setPosition(){},setEulerAngles(){}};
const dropContext={Math,app:{root:{addChild(){}}},crossbowMesh:()=>entity,shotgunMesh:()=>entity,discardedWeapons:[],pickups:[],rand:()=>0};vm.createContext(dropContext);
vm.runInContext(source.slice(source.indexOf('function dropWeapon('),source.indexOf('function pickupWeapon(')),dropContext);
dropContext.dropWeapon('shotgun',v3(),0);assert.equal(dropContext.pickups.length,0);assert.equal(dropContext.discardedWeapons.length,1);
let starts=0;const durations=[],frequencies=[];const parameter=()=>({value:0,setValueAtTime(v){frequencies.push(v);},linearRampToValueAtTime(){}});
const node=()=>({gain:parameter(),frequency:parameter(),connect(){},disconnect(){},start(){starts++;},stop(t){durations.push(t);}});
class Audio{constructor(){this.state='running';this.currentTime=0;this.sampleRate=100;this.destination={};}createGain(){return node();}createBiquadFilter(){return node();}createOscillator(){return node();}createBufferSource(){return node();}createBuffer(c,n){return {getChannelData:()=>new Float32Array(n)};}}
const audio=createWeaponAudio(Audio);audio.shoot('shotgun');assert.equal(starts,0);audio.enable();for(const type of ['shotgun','gun','crossbow'])audio.shoot(type);assert.equal(starts,6);assert.equal(new Set(durations).size,3);audio.shoot('gun',0);assert.equal(starts,6);createWeaponAudio(null).enable();
console.log('PASS: five-shot shotgun, six-bolt crossbow, cooldowns, direct shotgun hits, automatic drops, non-pickable empty weapons, and distinct gesture-enabled firing sounds');

const swapDrops=[];
const crossbowPickup={type:'crossbow',ammo:6,entity:{getPosition:()=>v3(1,0,0),destroy(){this.destroyed=true;}}};
const swapContext={spareAmmo:{shotgun:0,crossbow:0},player:{getPosition:()=>v3()},playerWeapon:'shotgun',playerAmmo:4,pickups:[crossbowPickup],heldShotgun:{enabled:true},heldCrossbow:null,dist2:(a,b)=>(a.x-b.x)**2+(a.z-b.z)**2,dropWeapon(type,pos,ammo){swapDrops.push({type,ammo});},updateWeaponHud(){},showMessage(){}};
vm.createContext(swapContext);
vm.runInContext(source.slice(source.indexOf('function pickupWeapon('),source.indexOf('function shotgunMesh(')),swapContext);
swapContext.pickupWeapon();
assert.equal(swapContext.playerWeapon,'crossbow');assert.equal(swapContext.playerAmmo,6);
assert.deepEqual(swapDrops,[{type:'shotgun',ammo:4}]);assert.equal(swapContext.heldShotgun.enabled,false);
assert(crossbowPickup.entity.destroyed);assert.equal(swapContext.pickups.length,0);
console.log('PASS: picking up crossbow immediately swaps loaded shotgun and preserves four shells');

for(const [type,count] of [['shotgun',5],['crossbow',6]]){
 const ammo={type:'ammo',ammoFor:type,ammo:count,entity:{getPosition:()=>v3(1,0,0),destroy(){}}};
 swapContext.playerWeapon=null;swapContext.playerAmmo=0;swapContext.pickups.push(ammo);
 swapContext.pickupWeapon();assert.equal(swapContext.spareAmmo[type],count);
 const weapon={type,ammo:count,entity:{getPosition:()=>v3(1,0,0),destroy(){}}};
 swapContext.pickups.push(weapon);swapContext.pickupWeapon();
 assert.equal(swapContext.playerAmmo,count*2);assert.equal(swapContext.spareAmmo[type],0);
 swapContext.pickups.push({...ammo});swapContext.pickupWeapon();assert.equal(swapContext.playerAmmo,count*3);
}
console.log('PASS: five shells and six arrows can be collected before or after their weapons');
