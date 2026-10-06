import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createVRControls} from './src/vr-controls.js';
import {createEnergy} from './src/energy.js';
import {createVRHud} from './src/vr-hud.js';
function controller(hand){return {handedness:hand,gamepad:{axes:[0,0,0,0],buttons:Array.from({length:6},()=>({pressed:false}))}};}
const left=controller('left'),right=controller('right'),controls=createVRControls();
left.gamepad.axes[3]=-1;left.gamepad.buttons[0].pressed=true;
right.gamepad.buttons[1].pressed=true;
let input=controls.read([left,right]);assert(input.sprint&&input.pickup);assert.equal(input.moveY,-1);
assert.equal(controls.read([left,right]).pickup,false);
controls.reset();assert.equal(controls.read([left,right]).pickup,true);
right.gamepad.buttons[1].pressed=false;controls.reset();
let moved=0,pickups=0,attacks=0,restarts=0,exits=0;
const vector=(x,z)=>({x,y:0,z,clone(){return vector(this.x,this.z);},normalize(){return this;}});
const context={Math,playerWeapon:null,app:{xr:{active:true,session:{inputSources:[left,right]},end(){exits++;}}},vrControls:controls,energy:createEnergy(),started:true,gameOver:false,won:false,camera:{forward:vector(0,-1),right:vector(1,0)},player:{getPosition:()=>vector(0,0)},runStateEl:{textContent:''},runNoiseTimer:0,emitNoise(){},showMessage(){},tryMovePlayer(x,z){moved=Math.hypot(x,z);},pickupWeapon(){pickups++;},playerAttack(){attacks++;},resetGame(){restarts++;context.gameOver=false;context.energy.reset();}};
const source=fs.readFileSync('src/main.js','utf8');vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('function updateXR('),source.indexOf('// HUD / game')),context);
context.updateXR(1);assert.equal(context.energy.state.value,80);assert.equal(moved,8.4);
context.updateXR(4);assert.equal(context.energy.state.value,0);
context.updateXR(1);assert.equal(moved,2.8);assert.equal(context.runStateEl.textContent,'RECOVERING');
right.gamepad.buttons[1].pressed=true;right.gamepad.buttons[0].pressed=true;
context.updateXR(0.1);context.updateXR(0.1);assert.equal(pickups,1);assert.equal(attacks,1);
context.gameOver=true;right.gamepad.buttons[5].pressed=true;
context.updateXR(0.1);assert.equal(restarts,1);assert.equal(context.gameOver,false);
context.gameOver=true;right.gamepad.buttons[4].pressed=true;
context.updateXR(0.1);assert.equal(exits,1,'Exit VR must work after game over');
assert(source.indexOf('updateXR(dt);',source.indexOf("app.on('update'"))<source.indexOf('if(!started||gameOver||won)',source.indexOf("app.on('update'")));
console.log('PASS: VR stick movement, sprint energy, exhaustion, pickup, weapon use, restart, exit, held-button edges, and game-over input polling');
const fallback=createVRControls(),leftGrip=controller('left');leftGrip.gamepad.axes[1]=-1;leftGrip.gamepad.buttons[0].pressed=true;
assert(fallback.read([leftGrip]).sprint);assert.equal(fallback.read([leftGrip]).moveY,-1);
leftGrip.gamepad.buttons[0].pressed=false;assert.equal(fallback.read([leftGrip]).sprint,false);
leftGrip.gamepad.buttons[1].pressed=true;leftGrip.gamepad.buttons[3].pressed=true;
assert.equal(fallback.read([leftGrip]).sprint,false,'Grip and stick click must not sprint');
const handlers={},lifecycle={enteringVR:false,started:true,gameOver:true,won:false,app:{xr:{on(name,fn){handlers[name]=fn;}}},vrControls:createVRControls(),document:{exitPointerLock(){}},refreshVRButton(){},resetGame(){this.started=true;this.gameOver=false;},leaveGame(){this.started=false;this.gameOver=false;}};
// Bind callbacks to update the same simulated session state as the real handlers.
lifecycle.resetGame=()=>{lifecycle.started=true;lifecycle.gameOver=false;};lifecycle.leaveGame=()=>{lifecycle.started=false;lifecycle.gameOver=false;};
vm.createContext(lifecycle);vm.runInContext(source.slice(source.indexOf("app.xr.on('start'"),source.indexOf('function toggleVR(')),lifecycle);
handlers.start();assert.equal(lifecycle.gameOver,false);handlers.end();assert.equal(lifecycle.started,false);handlers.start();assert.equal(lifecycle.started,true);
console.log('PASS: hold left trigger sprint, release to walk, grip/stick do not sprint, alternative stick axes, exit-to-menu, and VR re-entry');
const rendered=[];
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(text){rendered.push(text);}})})};
class TestEntity{addComponent(){this.render={};}setLocalPosition(){}setLocalEulerAngles(){}setLocalScale(){}}
class TestMaterial{update(){}}
class TestTexture{setSource(){}upload(){}}
const testPc={Entity:TestEntity,StandardMaterial:TestMaterial,Texture:TestTexture,Color:class{},CULLFACE_NONE:0};
createVRHud(testPc,{graphicsDevice:{}},{addChild(){}}).update(true,100,'',true,true);
assert(rendered.some(text=>text.includes('SAFE! YOU REACHED THE FIRE ESCAPE')));
assert(rendered.some(text=>text.includes('B: play again')));
assert(!rendered.some(text=>text.includes('GAME OVER')));
delete globalThis.document;
console.log('PASS: fire escape victory renders survival and replay/exit instructions inside VR');

context.gameOver=false;context.playerWeapon='machinegun';right.gamepad.buttons[0].pressed=true;right.gamepad.buttons[4].pressed=false;right.gamepad.buttons[5].pressed=false;controls.reset();const beforeAutomatic=attacks;context.updateXR(.1);context.updateXR(.1);assert.equal(attacks-beforeAutomatic,2);console.log('PASS: machine gun fires while VR trigger held; standard weapons retain press-only firing');
