import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {traceBolt} from './src/crossbow.js';
const source=fs.readFileSync('src/main.js','utf8');
const v3=(x=0,y=0,z=0)=>({x,y,z});
let now=0;const drops=[],sounds=[];
const target={type:'zombie',hp:2,entity:{getPosition:()=>v3(0,0,-10)}};
const c={Math,performance:{now:()=>now*1000},gameOver:false,won:false,playerWeapon:'machinegun',playerAmmo:100,lastPlayerShot:-99,agents:[target],traceBolt,v3,player:{getPosition:()=>v3()},crossbowAim:()=>({origin:v3(0,1,0),direction:v3(0,0,-1)}),obstacleCandidates:()=>[],dropWeapon(type,pos,ammo){drops.push({type,ammo});},heldShotgun:{enabled:true},heldCrossbow:null,updateWeaponHud(){},emitNoise(){},weaponAudio:{shoot:type=>sounds.push(type)},killZombie(a){a.dead=true;},showMessage(){}};
vm.createContext(c);
vm.runInContext(source.slice(source.indexOf('function dropEmptyWeapon('),source.indexOf('function crossbowMesh(')),c);
vm.runInContext(source.slice(source.indexOf('function playerAttack('),source.indexOf('// XR')),c);
c.playerAttack();assert.equal(c.playerAmmo,99);assert.equal(target.hp,1);c.playerAttack();assert.equal(c.playerAmmo,99);
for(let i=1;i<100;i++){now=i*.11;c.playerAttack();}
assert(target.dead);assert.equal(c.playerAmmo,0);assert.equal(c.playerWeapon,null);assert.equal(sounds.length,100);assert.deepEqual(drops,[{type:'machinegun',ammo:0}]);
console.log('PASS: machine gun hit damage, fire cooldown, 100 rounds, empty drop');
let selected='standard';const elements=new Map();
const entity=()=>({setPosition(){},setEulerAngles(){},setLocalScale(){},findByName(){},destroy(){this.destroyed=true;}});
const actor=type=>({type,initialType:type,entity:entity(),attackers:new Set()});
const agents=Array.from({length:20},()=>actor('zombie')).concat(Array.from({length:400},()=>actor('civilian')),Array.from({length:3},()=>actor('police')),Array.from({length:2},()=>actor('firefighter')));
const population={touchControls:{supported:false,reset(){}},keys:new Set(),Math,performance,agents,document:{getElementById(id){if(id==='gameMode')return {value:selected};if(!elements.has(id))elements.set(id,{style:{}});return elements.get(id);}},weaponAudio:{enable(){}},zombieAudio:{enable(){},stop(){}},ambience:{start(){}},energy:{reset(){}},randomStreetPoint:()=>v3(),randomAgentSpeed:()=>1,rand:()=>0,pickups:[],discardedWeapons:[],clearBolts(){},heldShotgun:null,restoreCrossbow(){},restoreAlleyAmmo(){},spareAmmo:{shotgun:0,crossbow:0},noises:[],rebuildGrid(){},player:entity(),playerSpawn:v3(),camera:{setLocalEulerAngles(){}},updateWeaponHud(){},messageEl:{},runStateEl:{},canvas:{requestPointerLock(){}},app:{xr:{active:false},root:{addChild(){}}},emitNoise(){},showMessage(){},v3,shotgunMesh:entity,machineGunMesh:entity,sportingPickupPosition:v3(),spawnAgent(type){const a=actor(type);agents.push(a);return a;}};
vm.createContext(population);
vm.runInContext(source.slice(source.indexOf('function restoreShotgun('),source.indexOf('function dropEmptyWeapon(')),population);
vm.runInContext(source.slice(source.indexOf('function resetGame('),source.indexOf('function leaveGame(')),population);
for(const mode of ['standard','carnage','carnage','standard']){
 selected=mode;population.resetGame();
 assert.equal(agents.filter(a=>a.type==='zombie').length,mode==='carnage'?100:20);
 assert.equal(agents.filter(a=>a.type==='civilian').length,400);
 const pickup=population.pickups.at(-1);assert.equal(pickup.type,mode==='carnage'?'machinegun':'shotgun');assert.equal(pickup.ammo,mode==='carnage'?100:5);
 population.pickups.length=0;
}
console.log('PASS: Standard 20/shotgun, Carnage 100/machine gun, repeated restarts and return to Standard');
