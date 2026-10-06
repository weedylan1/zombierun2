export function zombieGroanLevel(distance){
    return Number.isFinite(distance)&&distance<24?.9*(1-Math.max(0,distance)/24)**1.5:0;
}
function setVector(node,prefix,point,time){
    for(const axis of ['x','y','z'])node[prefix+axis.toUpperCase()]?.setTargetAtTime(point[axis],time,.025);
}
export function createZombieAudio(AudioContextType=globalThis.AudioContext||globalThis.webkitAudioContext){
    let context=null,nextGroan=0;
    const voices=new Set();
    function stop(){
        for(const voice of voices){
            voice.gain.gain.cancelScheduledValues(context.currentTime);
            voice.gain.gain.setTargetAtTime(0,context.currentTime,.015);
            for(const source of voice.sources){try{source.stop(context.currentTime+.05);}catch{}}
        }
        voices.clear();nextGroan=0;
    }
    return {
        enable(){
            if(!AudioContextType)return;
            context??=new AudioContextType();
            if(context.state==='suspended')context.resume().catch(()=>{});
        },
        stop,
        update(distance,emitter=null,listener=null){
            if(!context||context.state!=='running')return;
            const now=context.currentTime;
            if(listener){
                setVector(context.listener,'position',listener.position,now);
                setVector(context.listener,'forward',listener.forward,now);
                setVector(context.listener,'up',listener.up,now);
                if(!context.listener.positionX)context.listener.setPosition(listener.position.x,listener.position.y,listener.position.z);
                if(!context.listener.forwardX)context.listener.setOrientation(listener.forward.x,listener.forward.y,listener.forward.z,listener.up.x,listener.up.y,listener.up.z);
            }
            for(const voice of voices){
                // Follow the original groaning zombie, rather than jumping to another NPC.
                const p=voice.emitter?.entity.getPosition();
                if(p&&listener){
                    const d=Math.hypot(p.x-listener.position.x,p.y+1.5-listener.position.y,p.z-listener.position.z);
                    voice.level.gain.setTargetAtTime(voice.emitter.dead?0:zombieGroanLevel(d),now,.04);
                    const point={x:p.x,y:p.y+1.5,z:p.z};
                    setVector(voice.panner,'position',point,now);
                    if(!voice.panner.positionX)voice.panner.setPosition(point.x,point.y,point.z);
                }
            }
            const volume=zombieGroanLevel(distance);
            if(!volume){if(voices.size)stop();return;}
            if(now<nextGroan||voices.size>=2)return;
            const duration=1.5+Math.random()*.5;
            nextGroan=now+duration+.35+Math.random()*.5;
            const gain=context.createGain(),level=context.createGain(),panner=context.createPanner();
            panner.panningModel='HRTF';panner.distanceModel='linear';panner.refDistance=1;panner.maxDistance=24;panner.rolloffFactor=0;
            // Proximity gain is controlled above, avoiding double distance attenuation.
            gain.connect(level);level.connect(panner);panner.connect(context.destination);level.gain.value=volume;
            const p=emitter?.entity.getPosition();
            if(p){const point={x:p.x,y:p.y+1.5,z:p.z};setVector(panner,'position',point,now);if(!panner.positionX)panner.setPosition(point.x,point.y,point.z);}
            gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(1,now+.12);
            gain.gain.setValueAtTime(.65,now+duration*.65);gain.gain.linearRampToValueAtTime(0,now+duration);
            const voice={gain,level,panner,emitter,sources:[],nodes:[gain,level,panner]};voices.add(voice);
            const base=65+Math.random()*20;
            for(const [frequency,weight] of [[230,.55],[580,.25],[1000,.12]]){
                const oscillator=context.createOscillator(),filter=context.createBiquadFilter(),mix=context.createGain();
                oscillator.type='sawtooth';oscillator.frequency.setValueAtTime(base,now);oscillator.frequency.linearRampToValueAtTime(base*.7,now+duration);
                filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=3;
                mix.gain.value=weight;oscillator.connect(filter);filter.connect(mix);mix.connect(gain);
                voice.sources.push(oscillator);voice.nodes.push(oscillator,filter,mix);
            }
            const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate),samples=buffer.getChannelData(0);
            for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*.15;
            const breath=context.createBufferSource(),lowpass=context.createBiquadFilter();
            breath.buffer=buffer;lowpass.type='lowpass';lowpass.frequency.value=550;
            breath.connect(lowpass);lowpass.connect(gain);voice.sources.push(breath);voice.nodes.push(breath,lowpass);
            breath.onended=()=>{voices.delete(voice);for(const node of voice.nodes)node.disconnect();};
            for(const source of voice.sources){source.start(now);source.stop(now+duration);}
        }
    };
}
