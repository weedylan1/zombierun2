export function createWeaponAudio(Context=globalThis.AudioContext||globalThis.webkitAudioContext){
    let context=null;
    return {
        enable(){if(!Context)return;context??=new Context();if(context.state==='suspended')context.resume().catch(()=>{});},
        shoot(type,volume=1){
            if(!context||context.state!=='running'||volume<=0)return;
            const now=context.currentTime,crossbow=type==='crossbow',duration=type==='machinegun'?.09:crossbow?.18:type==='shotgun'?.55:.28;
            const gain=context.createGain(),filter=context.createBiquadFilter(),source=context.createBufferSource();
            const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate),data=buffer.getChannelData(0);
            for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/data.length*(crossbow?10:7));
            source.buffer=buffer;filter.type=crossbow?'highpass':'lowpass';filter.frequency.value=crossbow?1800:type==='shotgun'?2800:4200;
            gain.gain.setValueAtTime(volume*(crossbow?.25:type==='shotgun'?.85:.55),now);gain.gain.linearRampToValueAtTime(0,now+duration);
            source.connect(filter);filter.connect(gain);gain.connect(context.destination);
            const tone=context.createOscillator();tone.type=crossbow?'triangle':'sine';tone.frequency.setValueAtTime(crossbow?850:type==='shotgun'?100:160,now);tone.frequency.linearRampToValueAtTime(crossbow?180:35,now+duration);tone.connect(gain);
            source.onended=()=>{source.disconnect();filter.disconnect();tone.disconnect();gain.disconnect();};source.start(now);source.stop(now+duration);tone.start(now);tone.stop(now+duration);
        }
    };
}
