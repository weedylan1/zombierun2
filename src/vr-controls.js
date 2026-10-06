export function createVRControls(){
    let previous={};
    return {
        reset(){previous={};},
        read(sources){
            const current={moveX:0,moveY:0,sprint:false,pickup:false,attack:false,restart:false,exit:false};
            for(const source of sources){
                const gp=source.gamepad;if(!gp)continue;
                if(source.handedness==='left'){
                    const stickActive=Math.hypot(gp.axes[2]||0,gp.axes[3]||0)>0.12;
                    current.moveX=stickActive?gp.axes[2]:(gp.axes[0]||0);current.moveY=stickActive?gp.axes[3]:(gp.axes[1]||0);
                    current.sprint=!!gp.buttons[0]?.pressed;
                    current.restart||=!!gp.buttons[5]?.pressed;
                }else if(source.handedness==='right'){
                    current.attack=!!gp.buttons[0]?.pressed;current.pickup=!!gp.buttons[1]?.pressed;
                    current.exit=!!gp.buttons[4]?.pressed;current.restart||=!!gp.buttons[5]?.pressed;
                }
            }
            const result={...current,attackHeld:current.attack};
            for(const action of ['pickup','attack','restart','exit'])result[action]=current[action]&&!previous[action];
            previous=current;return result;
        }
    };
}
