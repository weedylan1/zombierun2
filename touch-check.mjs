import assert from 'node:assert/strict';
import {createTouchControls,isMobileTouchDevice} from './src/touch-controls.js';
const elements=new Map();function element(){return {style:{},events:{},addEventListener(type,fn){this.events[type]=fn;},setPointerCapture(){},getBoundingClientRect(){return {left:0,top:0,width:100,height:100};}};}
let activeClass=false;const document={hidden:false,body:{classList:{toggle(name,value){activeClass=value;}}},events:{},addEventListener(type,fn){this.events[type]=fn;},getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);}};
const window={navigator:{maxTouchPoints:5,userAgent:'Mozilla/5.0 (Linux; Android 14) Mobile'},matchMedia:()=>({matches:true}),addEventListener(type,fn){this[type]=fn;}};
const canvas=element();let shots=0,pickups=0,leaves=0,look=[];
const touch=createTouchControls({document,window,canvas,onLook:(x,y)=>look.push([x,y]),onAttack:()=>shots++,onPickup:()=>pickups++,onLeave:()=>leaves++});
const event=(id,x=50,y=50)=>({pointerType:'touch',pointerId:id,clientX:x,clientY:y,preventDefault(){}});
touch.setActive(true);assert(activeClass);
elements.get('touchMove').events.pointerdown(event(1,50,0));assert.equal(touch.state.z,-1);
canvas.events.pointerdown(event(2));canvas.events.pointermove(event(2,70,60));assert.deepEqual(look,[[20,10]]);assert.equal(touch.state.z,-1);
elements.get('touchRun').events.pointerdown(event(3));assert(touch.state.sprint);
elements.get('touchFire').events.pointerdown(event(4));assert(touch.state.fire);assert.equal(shots,1);
elements.get('touchFire').events.pointercancel(event(4));assert(!touch.state.fire);
elements.get('touchPickup').events.pointerdown(event(5));assert.equal(pickups,1);
elements.get('touchLeave').events.pointerdown(event(6));assert.equal(leaves,1);
touch.setActive(false);assert.equal(touch.state.z,0);assert(!touch.state.sprint);assert(elements.get('touchControls').hidden);assert(!activeClass);
touch.setActive(true);elements.get('touchRun').events.pointerdown(event(7));window.blur();assert(!touch.state.sprint);
console.log('PASS: simultaneous touch movement/look/run/fire, pickup/menu, cancellation, blur and menu reset');

for(const device of [
 {userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',maxTouchPoints:10},
 {userAgent:'Mozilla/5.0 (X11; Linux x86_64)',maxTouchPoints:0},
 {userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X)',platform:'MacIntel',maxTouchPoints:0}
])assert.equal(isMobileTouchDevice(device),false);
assert(isMobileTouchDevice({userAgent:'Mozilla/5.0 (iPhone)',maxTouchPoints:5}));
assert(isMobileTouchDevice({userAgent:'Mozilla/5.0 (Linux; Android 14)',maxTouchPoints:5}));
assert(isMobileTouchDevice({userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X)',platform:'MacIntel',maxTouchPoints:5}));
window.navigator={userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',maxTouchPoints:10};
const pc=createTouchControls({document,window,canvas,onLook(){},onAttack(){},onPickup(){},onLeave(){}});
pc.setActive(true);assert(!pc.supported);assert(elements.get('touchControls').hidden);assert(!activeClass);
console.log('PASS: PC touchscreens hide mobile controls; Android, iPhone and iPad retain them');
