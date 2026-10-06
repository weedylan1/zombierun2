export function isMobileTouchDevice(navigator){
    const ua=navigator.userAgent||'';
    // Touchscreen Windows PCs and laptops retain desktop input and layout.
    if(/Windows|CrOS|X11/.test(ua))return false;
    const ipadDesktop=(navigator.platform==='MacIntel'||/Macintosh/.test(ua))&&navigator.maxTouchPoints>1;
    return Boolean(navigator.userAgentData?.mobile||/Android|iPhone|iPad|iPod/.test(ua)||ipadDesktop);
}
export function createTouchControls({document,window,canvas,onLook,onAttack,onPickup,onLeave}){
    const root=document.getElementById('touchControls'),stick=document.getElementById('touchMove'),knob=document.getElementById('touchKnob');
    const state={x:0,z:0,sprint:false,fire:false};
    const supported=isMobileTouchDevice(window.navigator);
    let active=false,moveId=null,lookId=null,lookX=0,lookY=0;
    const holds=new Map();
    function reset(){state.x=state.z=0;state.sprint=state.fire=false;moveId=lookId=null;holds.clear();knob.style.transform='translate(-50%,-50%)';}
    function move(e){
        const rect=stick.getBoundingClientRect(),radius=rect.width*.32;
        let x=(e.clientX-rect.left-rect.width/2)/radius,z=(e.clientY-rect.top-rect.height/2)/radius;
        const length=Math.hypot(x,z);if(length>1){x/=length;z/=length;}
        state.x=Math.abs(x)<.12?0:x;state.z=Math.abs(z)<.12?0:z;
        knob.style.transform=`translate(calc(-50% + ${x*radius}px),calc(-50% + ${z*radius}px))`;
    }
    stick.addEventListener('pointerdown',e=>{if(!active||e.pointerType==='mouse'||moveId!==null)return;e.preventDefault();moveId=e.pointerId;stick.setPointerCapture(e.pointerId);move(e);});
    stick.addEventListener('pointermove',e=>{if(e.pointerId===moveId){e.preventDefault();move(e);}});
    const releaseMove=e=>{if(e.pointerId===moveId){moveId=null;state.x=state.z=0;knob.style.transform='translate(-50%,-50%)';}};
    for(const event of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(event,releaseMove);
    canvas.addEventListener('pointerdown',e=>{if(!active||e.pointerType==='mouse'||lookId!==null)return;e.preventDefault();lookId=e.pointerId;lookX=e.clientX;lookY=e.clientY;canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{if(e.pointerId!==lookId)return;e.preventDefault();onLook(e.clientX-lookX,e.clientY-lookY);lookX=e.clientX;lookY=e.clientY;});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(e.pointerId===lookId)lookId=null;});
    function button(id,held,action){
        const element=document.getElementById(id);
        element.addEventListener('pointerdown',e=>{if(!active)return;e.preventDefault();element.setPointerCapture(e.pointerId);if(held){holds.set(e.pointerId,held);state[held]=true;}action?.();});
        const release=e=>{const key=holds.get(e.pointerId);if(key){holds.delete(e.pointerId);state[key]=[...holds.values()].includes(key);}};
        for(const event of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(event,release);
    }
    button('touchRun','sprint');button('touchFire','fire',onAttack);button('touchPickup',null,onPickup);button('touchLeave',null,onLeave);
    window.addEventListener('blur',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
    return {state,supported,reset,setActive(value){const next=supported&&value;if(next!==active){active=next;reset();}root.hidden=!active;document.body.classList.toggle('touch-playing',active);}};
}
