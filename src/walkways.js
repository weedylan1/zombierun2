export function walkwayHeight(x,z,crossings){
    for(const crossing of crossings){
        if(Math.abs(x-crossing.x)>crossing.width/2-.25)continue;
        const offset=z-crossing.z,points=crossing.profile;
        for(let i=1;i<points.length;i++){
            const a=points[i-1],b=points[i];
            if(offset<=a[0]&&offset>=b[0])return a[1]+(b[1]-a[1])*(offset-a[0])/(b[0]-a[0]);
        }
    }
    return 0;
}
export function walkStepBlocked(from,to,crossings,getObstacles,limit,radius=.5){
    const steps=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/.1));
    let previousHeight=walkwayHeight(from.x,from.z,crossings);
    for(let i=1;i<=steps;i++){
        const t=i/steps,x=from.x+(to.x-from.x)*t,z=from.z+(to.z-from.z)*t;
        if(Math.abs(x)>limit||Math.abs(z)>limit)return true;
        const height=walkwayHeight(x,z,crossings);
        // Reject entering elevated stairs from the side or dropping off the landing.
        if(Math.abs(height-previousHeight)>.25)return true;
        previousHeight=height;
        for(const b of getObstacles(x-radius,z-radius,x+radius,z+radius)){
            if(b.npcOnly)continue;
            if(x+radius>b.minx&&x-radius<b.maxx&&z+radius>b.minz&&z-radius<b.maxz&&height<(b.maxy??2)+.05)return true;
        }
    }
    return false;
}
