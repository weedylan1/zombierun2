export function segmentBoxFraction(a,b,bounds){
    let enter=0,exit=1;
    for(const axis of ['x','y','z']){
        const delta=b[axis]-a[axis],min=bounds['min'+axis],max=bounds['max'+axis];
        if(Math.abs(delta)<1e-9){if(a[axis]<min||a[axis]>max)return null;}
        else{const t1=(min-a[axis])/delta,t2=(max-a[axis])/delta;enter=Math.max(enter,Math.min(t1,t2));exit=Math.min(exit,Math.max(t1,t2));if(enter>exit)return null;}
    }
    return enter>=0&&enter<=1?enter:null;
}
export function traceBolt(from,to,targets,obstacles){
    let fraction=Infinity,target=null,hit=false;
    for(const b of obstacles){
        const t=segmentBoxFraction(from,to,{...b,miny:0,maxy:b.maxy??2});
        if(t!==null&&t<fraction){fraction=t;hit=true;target=null;}
    }
    for(const actor of targets){
        if(actor.dead||actor.type!=='zombie')continue;
        const p=actor.entity.getPosition(),radius=actor.age==='child'?.27:.32,height=actor.age==='child'?1.12:1.68;
        const t=segmentBoxFraction(from,to,{minx:p.x-radius,maxx:p.x+radius,miny:p.y+.05,maxy:p.y+height,minz:p.z-radius,maxz:p.z+radius});
        if(t!==null&&t<fraction){fraction=t;hit=true;target=actor;}
    }
    return hit?{fraction,target}:null;
}
