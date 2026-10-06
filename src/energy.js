export function createEnergy(){
    const state={value:100,exhausted:false,recoveryDelay:0};
    return {
        state,
        reset(){state.value=100;state.exhausted=false;state.recoveryDelay=0;},
        update(dt,sprintRequested,moving){
            if(state.exhausted&&state.value>=25)state.exhausted=false;
            const sprinting=Boolean(moving&&sprintRequested&&!state.exhausted&&state.value>0);
            if(sprinting){
                state.value=Math.max(0,state.value-20*dt);state.recoveryDelay=1.5;
                if(state.value===0)state.exhausted=true;
            }else{
                const recoveryTime=Math.max(0,dt-state.recoveryDelay);
                state.recoveryDelay=Math.max(0,state.recoveryDelay-dt);
                state.value=Math.min(100,state.value+12.5*recoveryTime);
            }
            return sprinting;
        }
    };
}
