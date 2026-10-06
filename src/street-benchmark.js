export function arrangeStreetBenchmark(agents,roadZ,blocked){
    const chosen=[...agents.filter(a=>a.type==='civilian').slice(0,75),...agents.filter(a=>a.type==='police').slice(0,3),...agents.filter(a=>a.type==='firefighter').slice(0,2),...agents.filter(a=>a.type==='zombie').slice(0,20)];
    const selected=new Set(chosen),reserved=agents.filter(a=>!selected.has(a)).map(a=>a.entity.getPosition().clone());let placed=0;
    for(const a of chosen){
        const zombie=a.type==='zombie',points=[];
        for(let x=zombie?15:-35;x<(zombie?44:15);x+=1.6)for(let offset=-2.7;offset<3;offset+=1.5)points.push({x,y:0,z:roadZ+offset});
        const point=points.find(p=>!blocked(p.x,p.z,.55)&&reserved.every(q=>Math.hypot(p.x-q.x,p.z-q.z)>=1.4));
        if(!point)continue;a.entity.setPosition(point.x,0,point.z);a.wanderTarget=a.entity.getPosition().clone();a.wanderTarget.x+=zombie?-5:8;reserved.push(point);placed++;
    }
    return placed;
}
