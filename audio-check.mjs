import assert from 'node:assert/strict';
import {createZombieAudio,zombieGroanLevel} from './src/zombie-audio.js';
assert.equal(zombieGroanLevel(24),0);assert.equal(zombieGroanLevel(Infinity),0);
assert(zombieGroanLevel(2)>zombieGroanLevel(12));
let activeContext,starts=0,stops=0;
const parameter=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(value){this.value=value;}});
function node(){return {connect(){},disconnect(){},gain:parameter(),pan:parameter(),frequency:parameter(),Q:parameter(),start(){starts++;},stop(){stops++;}};}
const panners=[];
function spatialNode(){const p=node();for(const prefix of ['position','forward','up'])for(const axis of ['X','Y','Z'])p[prefix+axis]=parameter();return p;}
class FakeContext{
 constructor(){activeContext=this;this.currentTime=0;this.state='running';this.sampleRate=100;this.destination={};this.listener=spatialNode();}
 createGain(){return node();}createPanner(){const p=spatialNode();panners.push(p);return p;}createOscillator(){return node();}createBiquadFilter(){return node();}createBufferSource(){return node();}
 createBuffer(channels,length){return {getChannelData:()=>new Float32Array(length)};}
}
const audio=createZombieAudio(FakeContext);
audio.update(2);assert.equal(starts,0,'No audio before user starts game');
audio.enable();audio.update(30);assert.equal(starts,0,'Distant zombies must remain silent');
audio.update(2);assert.equal(starts,4,'Near zombie should produce one layered groan');
audio.update(2);assert.equal(starts,4,'Repeated frames must not stack groans');
activeContext.currentTime=5;audio.update(2);assert.equal(starts,8);
const before=stops;audio.update(Infinity);assert(stops>before,'Groans must stop when no live zombie remains nearby');
audio.stop();
createZombieAudio(null).enable();
console.log('PASS: proximity volume, gesture activation, quiet at distance, groan cooldown, stopping and unsupported audio fallback');

assert(zombieGroanLevel(1)>.8,'Close groans should be louder');
audio.stop();activeContext.currentTime=10;
const position={x:2,y:0,z:-3},emitter={entity:{getPosition:()=>position}};
const listener={position:{x:0,y:1.6,z:0},forward:{x:0,y:0,z:-1},up:{x:0,y:1,z:0}};
audio.update(4,emitter,listener);
const panner=panners.at(-1);assert.equal(panner.panningModel,'HRTF');assert.equal(panner.positionX.value,2);assert.equal(panner.positionZ.value,-3);
listener.forward={x:1,y:0,z:0};position.x=-2;audio.update(4,emitter,listener);
assert.equal(activeContext.listener.forwardX.value,1);assert.equal(activeContext.listener.forwardZ.value,0);assert.equal(panner.positionX.value,-2);
assert.equal(panner.positionY.value,1.5);assert.equal(activeContext.listener.positionY.value,1.6);
audio.stop();console.log('PASS: HRTF spatialization, live zombie position, listener head turns and ear height');
