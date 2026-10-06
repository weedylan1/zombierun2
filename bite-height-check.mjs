import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('src/main.js','utf8');
let bites=0,moves=0,height=0;
const context={player:{getPosition:()=>({x:.5,y:height,z:0})},dist2:(a,b)=>(a.x-b.x)**2+(a.z-b.z)**2,segmentHitsBuilding:()=>false,emitNoise(){},endGame(){bites++;},steerMove(){moves++;},rand:()=>.25,closestHumanForZombie:()=>null};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('function updateZombie('),source.indexOf('function dangerTargetForHuman(')),context);
function attack(y){height=y;const zombie={entity:{getPosition:()=>({x:0,y:0,z:0})},state:'chase',target:{player:true},nextThink:100,nextAttack:0,lastActivityAt:1};context.updateZombie(zombie,1/60,2);return zombie;}
for(const y of [.1,.5,1.4,2.4]){const z=attack(y);assert.equal(bites,0,'Ground zombie bit elevated player');assert.equal(z.nextAttack,0);}
attack(0);assert.equal(bites,1,'Ground player no longer vulnerable');assert.equal(moves,5,'Protected player stopped zombie movement');
console.log('PASS: elevated players protected from bites, ground players vulnerable, zombies keep moving');
