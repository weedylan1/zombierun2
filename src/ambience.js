import ambienceUrl from './assets/after-the-sirens-blend.mp3?url';
export function createAmbience(){
    const track=new Audio(ambienceUrl);track.loop=true;track.volume=.32;track.preload='none';
    let enabled=false;
    const play=()=>{if(enabled&&!document.hidden)track.play().catch(()=>{});};
    document.addEventListener('visibilitychange',()=>{if(document.hidden)track.pause();else play();});
    return {start(){enabled=true;track.currentTime=0;play();},stop(){enabled=false;track.pause();}};
}
