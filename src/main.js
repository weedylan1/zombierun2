import * as pc from 'playcanvas';
import { applySurface, scaledSurface } from './procedural-surfaces.js';
import {createCharacterVisuals} from './character-visuals.js';
import {resolveQuality,seededRandom} from './quality-profiles.js';
import {arrangeStreetBenchmark} from './street-benchmark.js';
import { createEnergy } from './energy.js';
import { createVRControls } from './vr-controls.js';
import { createTouchControls,isMobileTouchDevice } from './touch-controls.js';
import { createZombieAudio } from './zombie-audio.js';
import { createAmbience } from './ambience.js';
import { createVRHud } from './vr-hud.js';
import { createCityDetails } from './city-details.js';
import { traceBolt } from './crossbow.js';
import { walkwayHeight,walkStepBlocked } from './walkways.js';
import { createWeaponAudio } from './weapon-audio.js';
const zombieAudio=createZombieAudio();
const ambience=createAmbience();
const weaponAudio=createWeaponAudio();

const canvas = document.getElementById('app');
const app = new pc.Application(canvas, {
    mouse: new pc.Mouse(canvas),
    keyboard: new pc.Keyboard(window),
    touch: new pc.TouchDevice(canvas)
});
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.scene.ambientLight = new pc.Color(0.28, 0.32, 0.38);
app.scene.exposure = .95;
app.scene.fog.type=pc.FOG_LINEAR;
app.scene.fog.color=new pc.Color(.48,.54,.57);
app.scene.fog.start=65;app.scene.fog.end=260;
app.start();

const COLORS = {
    sky: new pc.Color(0.48, 0.54, 0.57),
    road: new pc.Color(0.12, 0.13, 0.13),
    pavement: new pc.Color(0.38, 0.39, 0.37),
    grass: new pc.Color(0.18, 0.28, 0.16),
    zombie: new pc.Color(0.26, 0.72, 0.24),
    police: new pc.Color(0.08, 0.13, 0.28),
    fire: new pc.Color(0.56, 0.08, 0.05),
    mall: new pc.Color(0.54, 0.45, 0.26)
};
app.scene.skyboxMip = 0;
app.scene.layers.getLayerByName('World').clearColor = COLORS.sky;

function material(color, emissive = null) {
    const m = new pc.StandardMaterial();
    m.diffuse = color.clone();
    if (emissive) {
        m.emissive = emissive.clone();
        m.emissiveIntensity = 0.6;
    }
    m.metalness = 0;
    m.gloss = 0.25;
    m.update();
    return m;
}

const mats = {
    road: material(COLORS.road), pavement: material(COLORS.pavement), grass: material(COLORS.grass),
    zombie: material(COLORS.zombie), police: material(COLORS.police), fire: material(COLORS.fire),
    mall: material(COLORS.mall), black: material(new pc.Color(0.03,0.03,0.03)),
    white: material(new pc.Color(0.82,0.82,0.77)), yellow: material(new pc.Color(0.82,0.68,0.1)),
    glass: material(new pc.Color(0.22,0.31,0.34)), red: material(new pc.Color(0.7,0.05,0.04)),
    gun: material(new pc.Color(0.06,0.06,0.065)), axe: material(new pc.Color(0.42,0.29,0.15))
};

let currentQuality=resolveQuality('auto',false,isMobileTouchDevice(window.navigator));
app.townProfile=currentQuality;
for(const kind of ['road','pavement','grass'])applySurface(pc,app,mats[kind],kind);
const surfaceCache=new Map();
const surfaceMaterials=new Set([mats.road,mats.pavement,mats.grass]);

const skinMaterials = [
    material(new pc.Color(0.94, 0.73, 0.57)),
    material(new pc.Color(0.72, 0.48, 0.33)),
    material(new pc.Color(0.46, 0.28, 0.19)),
    material(new pc.Color(0.26, 0.15, 0.10)),
    material(new pc.Color(0.86, 0.61, 0.43))
];
const clothesMaterials = [
    material(new pc.Color(0.18,0.26,0.34)), material(new pc.Color(0.34,0.19,0.15)),
    material(new pc.Color(0.20,0.30,0.22)), material(new pc.Color(0.36,0.32,0.23)),
    material(new pc.Color(0.25,0.21,0.28)), material(new pc.Color(0.18,0.18,0.2))
];
const buildingMaterials = [
    material(new pc.Color(0.45,0.40,0.36)), material(new pc.Color(0.55,0.52,0.47)),
    material(new pc.Color(0.36,0.40,0.44)), material(new pc.Color(0.48,0.34,0.29)),
    material(new pc.Color(0.33,0.37,0.31))
];

const characterVisuals=createCharacterVisuals(pc,app,mats,clothesMaterials,choose);
const worldRandom=seededRandom(53197);
const staticCityEntities=[];
let collectingStaticCity=true;
function box(name, pos, scale, mat, parent = app.root) {
    const e = new pc.Entity(name);
    e.addComponent('render', { type: 'box' });
    e.setPosition(pos.x, pos.y, pos.z);
    e.setLocalScale(scale.x, scale.y, scale.z);
    e.render.material = surfaceMaterials.has(mat)?scaledSurface(pc,mat,scale,surfaceCache):mat;
    parent.addChild(e);
    if(collectingStaticCity&&parent===app.root)staticCityEntities.push(e);
    return e;
}
function sphere(name, pos, scale, mat, parent = app.root) {
    const e = new pc.Entity(name);
    e.addComponent('render', { type: 'sphere' });
    e.setPosition(pos.x, pos.y, pos.z);
    e.setLocalScale(scale.x, scale.y, scale.z);
    e.render.material = mat;
    parent.addChild(e);
    return e;
}
function v3(x=0,y=0,z=0){ return new pc.Vec3(x,y,z); }
function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }
function rand(a,b){ return a + (collectingStaticCity?worldRandom():Math.random())*(b-a); }
function choose(a){ return a[((collectingStaticCity?worldRandom():Math.random())*a.length)|0]; }
function dist2(a,b){ const dx=a.x-b.x,dz=a.z-b.z; return dx*dx+dz*dz; }

// Lighting
const sun = new pc.Entity('Sun');
sun.addComponent('light', { type: 'directional', color: new pc.Color(1,0.95,0.85), intensity: 1.55, castShadows: false });
sun.setEulerAngles(50,-35,0);
app.root.addChild(sun);

// City -----------------------------------------------------------------------
// 25% more playable ground area, keeping the city square.
const WORLD_SCALE=Math.sqrt(1.25);
const CITY_HALF = 119*WORLD_SCALE-7;
const ROAD_STEP = 34*WORLD_SCALE;
const ROAD_POSITIONS=[-3,-2,-1,0,1,2,3].map(n=>n*ROAD_STEP);
const ROAD_WIDTH = 9;
const BLOCK = ROAD_STEP - ROAD_WIDTH;
const buildingBoxes = [];
const roadObstacleBoxes=[];
const crossings=[];
let archeryPickupPosition=null;
let sportingPickupPosition=null;
let alleyAmmoPosition=null;
function addRoadObstacle(x,z,width,depth,occludes=true,maxy=2){
    roadObstacleBoxes.push({minx:x-width/2,maxx:x+width/2,minz:z-depth/2,maxz:z+depth/2,occludes,maxy});
    obstacleCandidates.index=null;
}
const roadLines = [];
const cityDetails=createCityDetails(pc,app,box,v3,addRoadObstacle);

box('Ground', v3(0,-0.12,0), v3(CITY_HALF*2+30,0.2,CITY_HALF*2+30), mats.grass);

for (const x of ROAD_POSITIONS) {
    box('RoadX', v3(x,0,0), v3(ROAD_WIDTH,0.05,CITY_HALF*2+20), mats.road);
    roadLines.push({axis:'z', value:x});

}
for (const z of ROAD_POSITIONS) {
    box('RoadZ', v3(0,0,z), v3(CITY_HALF*2+20,0.05,ROAD_WIDTH), mats.road);
    roadLines.push({axis:'x', value:z});

}

function addBuilding(cx, cz, w, d, h, mat) {
    const e=box('Building',v3(cx,(h+4)/2,cz),v3(w,h-4,d),cityDetails.facade(mat,h));
    cityDetails.decorate(cx,cz,w,d,h,mats.pavement);
    buildingBoxes.push({minx:cx-w/2-0.5,maxx:cx+w/2+0.5,minz:cz-d/2-0.5,maxz:cz+d/2+0.5,maxy:h});
    return e;
}

function addAlley(cx,cz,w,d,h,mat,fenced,crossable){
    const gap=3.8,piece=(w-gap)/2;
    addBuilding(cx-(piece+gap)/2,cz,piece,d,h,mat);
    addBuilding(cx+(piece+gap)/2,cz,piece,d,h+3,mat);
    box('Narrow alley paving',v3(cx,.02,cz),v3(gap,.04,d+8),mats.pavement);
    if(!fenced)return;
    const fenceZ=cz-d/2+1.5;
    box('Alley fence',v3(cx,1.05,fenceZ),v3(gap,2.1,.16),mats.axe);
    for(const side of [-1,1])box('Alley fence post',v3(cx+side*(gap/2-.1),1.1,fenceZ),v3(.18,2.2,.22),mats.black);
    addRoadObstacle(cx,fenceZ,gap,.22,true,2.2);
    if(!crossable){
        if(!alleyAmmoPosition){
            alleyAmmoPosition=v3(cx,0,fenceZ+3);
            box('Alley supply sign',v3(cx,2.5,fenceZ+.2),v3(2.8,.6,.1),cityDetails.sign('AMMO CACHE'));
        }
        return;
    }
    box('Alley dumpster',v3(cx,.65,fenceZ+2.55),v3(1.9,1.3,1.8),mats.grass);
    box('Dumpster lid',v3(cx,1.3,fenceZ+2.55),v3(2,.08,1.9),mats.black);
    addRoadObstacle(cx,fenceZ+2.55,1.9,1.8,true,1.34);
    const profile=[[6,0],[4.1,1.4],[1.6,1.4],[.8,2.4],[-.8,2.4],[-4,0]];
    crossings.push({x:cx,z:fenceZ,width:1.5,profile});
    for(let i=1;i<profile.length;i++){
        const a=profile[i-1],b=profile[i],length=Math.hypot(a[0]-b[0],a[1]-b[1]);
        const plank=box('Fence crossing planks',v3(cx,(a[1]+b[1])/2+.035,fenceZ+(a[0]+b[0])/2),v3(1.5,.07,length),mats.axe);
        plank.setEulerAngles(Math.atan2(b[1]-a[1],a[0]-b[0])*180/Math.PI,0,0);
    }
}
for (let ix=0;ix<6;ix++) {
    const xi=(ix-2.5)*ROAD_STEP;
    for (let iz=0;iz<6;iz++) {
        const zi=(iz-2.5)*ROAD_STEP;
        // leave north-east corner as mall approach / car park
        if (xi > 50 && zi < -50) continue;
        const h = rand(9,15);
        const w = BLOCK-rand(3,6), d = BLOCK-rand(3,6);
        const alley=[['1,1',true,true],['2,4',true,false],['4,3',true,true],['3,1',true,false],['4,4',true,true],['1,3',false,false]].find(a=>a[0]===ix+','+iz);
        if(ix===3&&iz===3){
            addBuilding(xi,zi,w,d,8,buildingMaterials[3]);
            box('Archery store sign',v3(xi,3.8,zi+d/2+.2),v3(5.4,.55,.18),cityDetails.sign('ARCHERY & CROSSBOWS'));
            archeryPickupPosition=v3(xi,.55,zi+d/2+1.8);
            box('Crossbow display stand',v3(xi,.2,zi+d/2+1.8),v3(1.4,.4,.8),mats.axe);
            addRoadObstacle(xi,zi+d/2+1.8,1.4,.8,true,.4);
        }else if(ix===0&&iz===5){
            addBuilding(xi,zi,w,d,9,buildingMaterials[1]);
            const front=xi-w/2;
            box('Sporting goods store sign',v3(front-.2,3.8,zi),v3(.18,.55,5.4),cityDetails.sign('SPORTING GOODS'));
            sportingPickupPosition=v3(front-1.8,.55,zi);
            box('Shotgun display stand',v3(front-1.8,.2,zi),v3(.8,.4,1.4),mats.axe);
            addRoadObstacle(front-1.8,zi,.8,1.4,true,.4);
        }else if(alley)addAlley(xi,zi,w,d,h,choose(buildingMaterials),alley[1],alley[2]);
        else addBuilding(xi+rand(-1.2,1.2),zi+rand(-1.2,1.2),w,d,h,choose(buildingMaterials));
        // bins / street props at corners
        if (worldRandom()<0.8){
            const bx=xi-BLOCK/2-2,bz=zi-BLOCK/2-2;
            box('Bin',v3(bx,0.55,bz),v3(0.7,1.1,0.7),mats.black);
            addRoadObstacle(bx,bz,0.7,0.7,true,1.1);
        }
        if (worldRandom()<0.7) {
            const p = v3(xi+BLOCK/2+2,1.7,zi-BLOCK/2-2);
            box('LampPost',p,v3(0.12,3.4,0.12),mats.black);
            addRoadObstacle(p.x,p.z,0.12,0.12,false,3.4);
            box('LampHead',v3(p.x,3.35,p.z),v3(0.6,0.15,0.25),mats.white);
        }
    }
}

// Parked / abandoned cars
cityDetails.backdrop(buildingMaterials[2],mats.pavement,mats.road,WORLD_SCALE);
// Mark the actual movement limit with a continuous physical city cordon.
const perimeterEdge=CITY_HALF+7;
for(let side=0;side<4;side++){
    const horizontal=side===0||side===2;
    const edge=(side<2?-1:1)*(perimeterEdge+0.3);
    const position=(along,y)=>horizontal?v3(along,y,edge):v3(edge,y,along);
    const size=(length,height,depth)=>horizontal?v3(length,height,depth):v3(depth,height,length);
    box('City boundary concrete base',position(0,0.35),size(perimeterEdge*2,0.7,0.6),mats.pavement);
    box('City boundary upper rail',position(0,2.25),size(perimeterEdge*2,0.12,0.12),mats.yellow);
    box('City boundary middle rail',position(0,1.35),size(perimeterEdge*2,0.09,0.09),mats.black);
    for(let along=-perimeterEdge;along<=perimeterEdge;along+=3){
        box('City boundary fence post',position(along,1.45),size(0.12,2.9,0.12),mats.black);
    }
    if(horizontal)addRoadObstacle(0,edge,perimeterEdge*2,0.6,false,2.9);
    else addRoadObstacle(edge,0,0.6,perimeterEdge*2,false,2.9);
    for(const along of ROAD_POSITIONS){
        box('Street end barricade',position(along,0.95),size(9,1.2,0.7),mats.yellow);
        for(let stripe=-4;stripe<=4;stripe+=1){
            const marker=box('Barricade black hazard stripe',position(along+stripe,0.95),size(0.38,1.2,0.73),mats.black);
            marker.setEulerAngles(horizontal?0:18,0,horizontal?18:0);
        }
        const inward=edge-Math.sign(edge)*0.42;
        box('Street closed sign',horizontal?v3(along,2.5,inward):v3(inward,2.5,along),size(6,0.9,0.12),cityDetails.sign('ROAD CLOSED'));
    }
}
for (let i=0;i<38;i++) {
    const horizontal = worldRandom()<0.5;
    const line = choose(ROAD_POSITIONS);
    const along = rand(-100*WORLD_SCALE,100*WORLD_SCALE);
    const x = horizontal ? along : line + choose([-3.0,3.0]);
    const z = horizontal ? line + choose([-3.0,3.0]) : along;
    if(dist2(v3(x,0,z),archeryPickupPosition)<36)continue;
    if(dist2(v3(x,0,z),sportingPickupPosition)<36)continue;
    if(crossings.some(c=>Math.abs(x-c.x)<4&&Math.abs(z-c.z)<8))continue;
    const paint=choose(clothesMaterials);
    const kind=i%9===0?'van':i%11===0?'police':'car';
    const footprint=cityDetails.vehicle?.(x,z,horizontal,cityDetails.carPaint(paint),kind,i%7===0)||{width:horizontal?3.9:1.75,depth:horizontal?1.75:3.9,height:1.5};
    addRoadObstacle(x,z,footprint.width,footprint.depth,true,footprint.height);

}

// Mall destination at the north-east edge
const MALL_POS = v3(86*WORLD_SCALE,0,-91*WORLD_SCALE);
box('Mall',v3(MALL_POS.x,7,MALL_POS.z),v3(40,14,28),cityDetails.facade(mats.mall,14,'stone'));
box('MallDoors',v3(MALL_POS.x,2.2,MALL_POS.z+14.05),v3(7,4.4,0.2),mats.glass);
box('MallSign',v3(MALL_POS.x,9.5,MALL_POS.z+14.15),v3(15,2.5,0.25),cityDetails.sign('SAFE HAVEN MALL'));
// Exterior escape stairs: the raised landing is the survival destination.
buildingBoxes.push({minx:MALL_POS.x-20,maxx:MALL_POS.x+20,minz:MALL_POS.z-14,maxz:MALL_POS.z+14,maxy:14});
const escapeX=MALL_POS.x+12,escapeZ=MALL_POS.z+18;
const FIRE_ESCAPE={x:escapeX,y:6,z:escapeZ};
const escapePath={x:escapeX,z:escapeZ,width:3,profile:[[16,0],[2,6],[-1,6]],fireEscape:true};
crossings.push(escapePath);
for(let i=0;i<28;i++){
    const offset=16-(i+.5)*.5,height=(i+1)*6/28;
    box('Fire escape steel tread',v3(escapeX,height-.1,escapeZ+offset),v3(3,.2,.5),mats.gun);
    for(const side of [-1,1]){
        box('Fire escape railing post',v3(escapeX+side*1.4,height+.5,escapeZ+offset),v3(.06,1.1,.06),mats.white);
    }
}
box('Fire escape landing',v3(escapeX,5.9,escapeZ+.5),v3(3,.2,3),mats.gun);
for(const side of [-1,1]){
    const rail=box('Fire escape handrail',v3(escapeX+side*1.4,4.05,escapeZ+9),v3(.08,.08,Math.hypot(14,6)),mats.white);
    rail.setEulerAngles(Math.atan2(6,14)*180/Math.PI,0,0);
    box('Fire escape landing rail',v3(escapeX+side*1.4,6.6,escapeZ+.5),v3(.08,1.2,3),mats.white);
    box('Fire escape support',v3(escapeX+side*1.2,3,escapeZ),v3(.15,6,.15),mats.gun);
}
box('Fire escape exit marker',v3(escapeX,7.4,escapeZ-1),v3(3,.8,.1),cityDetails.sign('SAFE EXIT'));
box('Fire escape directions',v3(escapeX,1.8,escapeZ+16.6),v3(3,.7,.12),cityDetails.sign('CLIMB TO SAFETY'));
box('Mall glass frontage',v3(MALL_POS.x,4,MALL_POS.z+14.12),v3(38,6,.12),cityDetails.facade(mats.glass,6,'glass'));
box('Mall entrance canopy',v3(MALL_POS.x,5,MALL_POS.z+15),v3(12,.25,2),mats.white);
box('Mall roof trim',v3(MALL_POS.x,14,MALL_POS.z),v3(40.5,.4,28.5),mats.white);
// Only the player can use this route; NPC swept collision treats it as solid.
addRoadObstacle(escapeX,escapeZ+7.5,3,17,true,7);
roadObstacleBoxes[roadObstacleBoxes.length-1].npcOnly=true;
// Simple car park
box('MallCarPark',v3(75*WORLD_SCALE,0.01,-60*WORLD_SCALE),v3(60*WORLD_SCALE,0.03,35*WORLD_SCALE),mats.road);

cityDetails.streetKit?.(roadLines,ROAD_STEP,CITY_HALF+7);

function blocked(x,z,r=0.55){
    if (Math.abs(x)>CITY_HALF+7 || Math.abs(z)>CITY_HALF+7) return true;
    const candidates=blocked.candidates||(blocked.candidates=[]);
    for (const b of obstacleCandidates(x-r,z-r,x+r,z+r,candidates)) if (x+r>b.minx && x-r<b.maxx && z+r>b.minz && z-r<b.maxz) return true;
    return false;
}
function obstacleCandidates(minx,minz,maxx,maxz,result=[]){
    // Static obstacles occupy all intersecting 12-metre cells, including long fences.
    let index=obstacleCandidates.index;
    if(!index||index.buildings!==buildingBoxes.length||index.props!==roadObstacleBoxes.length){
        index={buildings:buildingBoxes.length,props:roadObstacleBoxes.length,cells:new Map(),all:[...buildingBoxes,...roadObstacleBoxes],empty:[],stamp:0};
        for(const b of index.all){b.queryStamp=0;for(let x=Math.floor(b.minx/12);x<=Math.floor(b.maxx/12);x++)for(let z=Math.floor(b.minz/12);z<=Math.floor(b.maxz/12);z++){
            const key=x*65536+z;let cell=index.cells.get(key);if(!cell){cell=[];index.cells.set(key,cell);}cell.push(b);
        }}
        obstacleCandidates.index=index;
    }
    const x0=Math.floor(minx/12),x1=Math.floor(maxx/12),z0=Math.floor(minz/12),z1=Math.floor(maxz/12);
    // Most walking steps occupy one cell: use its immutable list directly.
    if(x0===x1&&z0===z1)return index.cells.get(x0*65536+z0)||index.empty;
    if((x1-x0+1)*(z1-z0+1)>index.cells.size)return index.all;
    result.length=0;const stamp=++index.stamp;
    for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){
        const cell=index.cells.get(x*65536+z);if(!cell)continue;
        for(const b of cell)if(b.queryStamp!==stamp){
            b.queryStamp=stamp;
            if(b.maxx>=minx&&b.minx<=maxx&&b.maxz>=minz&&b.minz<=maxz)result.push(b);
        }
    }
    return result;
}
function segmentHitsBuilding(a,b,radius=0,sightOnly=true){
    return segmentHitsObstacle(a.x,a.z,b.x,b.z,radius,sightOnly);
}
function segmentHitsObstacle(ax,az,bx,bz,radius=0,sightOnly=true){
    // Exact segment bounds avoid skipping small bins and thin obstacles.
    const minx=Math.min(ax,bx)-radius,minz=Math.min(az,bz)-radius,maxx=Math.max(ax,bx)+radius,maxz=Math.max(az,bz)+radius;
    const candidates=segmentHitsObstacle.candidates||(segmentHitsObstacle.candidates=[]);
    for(const bounds of obstacleCandidates(minx,minz,maxx,maxz,candidates)){
        if(sightOnly&&bounds.occludes===false)continue;
        if(bounds.maxx<minx||bounds.minx>maxx||bounds.maxz<minz||bounds.minz>maxz)continue;
        let enter=0,exit=1;
        for(let axis=0;axis<2;axis++){
            const origin=axis===0?ax:az,delta=axis===0?bx-ax:bz-az,min=(axis===0?bounds.minx:bounds.minz)-radius,max=(axis===0?bounds.maxx:bounds.maxz)+radius;
            if(Math.abs(delta)<0.000001){if(origin<min||origin>max){enter=2;break;}}
            else{
                const t1=(min-origin)/delta,t2=(max-origin)/delta;
                enter=Math.max(enter,Math.min(t1,t2));exit=Math.min(exit,Math.max(t1,t2));
            }
        }
        if(enter<=exit&&exit>0&&enter<1)return true;
    }
    return false;
}
function clearAreaContains(area,ax,az,bx,bz,radius){
    return area&&area.index===obstacleCandidates.index&&area.index.buildings===buildingBoxes.length&&area.index.props===roadObstacleBoxes.length
        &&ax-radius>=area.minx&&ax+radius<=area.maxx&&az-radius>=area.minz&&az+radius<=area.maxz
        &&bx-radius>=area.minx&&bx+radius<=area.maxx&&bz-radius>=area.minz&&bz+radius<=area.maxz;
}
function obstacleAreaClear(a,ax,az,bx,bz,radius=0.35){
    if(clearAreaContains(a.clearArea,ax,az,bx,bz,radius))return true;
    // Cache only a rectangle containing no static obstacle at all. A changed
    // direction is safe while both endpoints remain inside the verified area.
    const minx=Math.min(ax,bx)-radius-1,minz=Math.min(az,bz)-radius-1,maxx=Math.max(ax,bx)+radius+1,maxz=Math.max(az,bz)+radius+1;
    const scratch=obstacleAreaClear.candidates||(obstacleAreaClear.candidates=[]);
    for(const b of obstacleCandidates(minx,minz,maxx,maxz,scratch))if(b.maxx>=minx&&b.minx<=maxx&&b.maxz>=minz&&b.minz<=maxz)return false;
    a.clearArea={minx,minz,maxx,maxz,index:obstacleCandidates.index};return true;
}
function movementBlocked(ax,az,bx,bz,radius=0.35,clearArea=null){
    // Swept collision also covers the destination; query the obstacles once.
    if(Math.abs(bx)>CITY_HALF+7||Math.abs(bz)>CITY_HALF+7)return true;
    if(clearAreaContains(clearArea,ax,az,bx,bz,radius))return false;
    return segmentHitsObstacle(ax,az,bx,bz,radius,false);
}
function randomStreetPoint(){
    const limit=CITY_HALF-7;
    for(let attempt=0;attempt<200;attempt++){
        const p=Math.random()<0.5
            ?v3(choose(ROAD_POSITIONS)+rand(-3.2,3.2),0,rand(-limit,limit))
            :v3(rand(-limit,limit),0,choose(ROAD_POSITIONS)+rand(-3.2,3.2));
        if(!blocked(p.x,p.z,0.55))return p;
    }
    for(let z=-limit;z<=limit;z++)if(!blocked(0,z,0.55))return v3(0,0,z);
    throw new Error('No clear street position available');
}

// Player ---------------------------------------------------------------------
collectingStaticCity=false;
const staticCityBatch=app.batcher.addGroup('Static city',false,48);
for(const entity of staticCityEntities)if(!entity.artDetail&&!entity.artDynamic)entity.render.batchGroupId=staticCityBatch.id;
app.batcher.generate([staticCityBatch.id]);
cityDetails.prepare?.(staticCityEntities);
const player = new pc.Entity('PlayerRoot');
// Spawn on the nearby north-south road; the previous point was inside a
// randomly sized building collision box, which could block forward movement.
let playerSpawn=v3(ROAD_POSITIONS[0],0,90*WORLD_SCALE);
for(let offset=0;blocked(playerSpawn.x,playerSpawn.z,0.55)&&offset<200;offset++)playerSpawn=v3(ROAD_POSITIONS[0],0,90*WORLD_SCALE-offset);
player.setPosition(playerSpawn);
app.root.addChild(player);
const camera = new pc.Entity('Camera');
camera.addComponent('camera', { clearColor: COLORS.sky, nearClip:0.05, farClip:700, fov:70 });
camera.setLocalPosition(0,1.65,0);
player.addChild(camera);

let yaw = 0, pitch = 0, started = false, gameOver = false, won = false;
let playerWeapon = null, playerAmmo = 0, lastPlayerShot = -99;
const keys = new Set();
const energy=createEnergy();
window.addEventListener('keydown',e=>{if(e.code==='Escape'||e.code==='KeyQ'){if(app.xr.active)app.xr.end();else if(started)leaveGame();return;}keys.add(e.code); if(e.key==='Shift'||e.shiftKey) keys.add('Shift'); if(e.code==='KeyE') pickupWeapon(); if(e.code==='KeyV') toggleVR();});
window.addEventListener('keyup',e=>{keys.delete(e.code); if(e.key==='Shift') keys.delete('Shift');});
window.addEventListener('blur',()=>{keys.clear();rightMouseSprint=false;leftMouseFire=false;});
canvas.addEventListener('click',e=>{ if(e.pointerType==='mouse'&&started && !document.pointerLockElement && !app.xr.active) canvas.requestPointerLock?.(); });
document.addEventListener('mousemove',e=>{
    if(document.pointerLockElement===canvas && !app.xr.active){
        yaw -= e.movementX*0.12; pitch = clamp(pitch-e.movementY*0.10,-75,75);
        player.setEulerAngles(0,yaw,0); camera.setLocalEulerAngles(pitch,0,0);
    }
});
let rightMouseSprint=false,leftMouseFire=false;
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{
    if(e.pointerType!=='mouse')return;
    if(e.button===2&&started&&!gameOver&&!won&&!app.xr.active){rightMouseSprint=true;e.preventDefault();}
    if(e.button===0&&started){leftMouseFire=true;playerAttack();}
});
window.addEventListener('mouseup',e=>{if(e.button===2)rightMouseSprint=false;if(e.button===0)leftMouseFire=false;});
document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==canvas){rightMouseSprint=false;leftMouseFire=false;}});

const touchControls=createTouchControls({document,window,canvas,
    onLook(dx,dy){yaw-=dx*.18;pitch=clamp(pitch-dy*.18,-75,75);player.setEulerAngles(0,yaw,0);camera.setLocalEulerAngles(pitch,0,0);},
    onAttack:playerAttack,onPickup:pickupWeapon,onLeave:leaveGame
});
if(touchControls.supported)document.getElementById('startButton').textContent='PLAY';
function tryMovePlayer(dx,dz){
    const p=player.getPosition();
    let nx=p.x+dx,nz=p.z+dz;
    if(!walkStepBlocked(p,{x:nx,z:p.z},crossings,obstacleCandidates,CITY_HALF+7))p.x=nx;
    if(!walkStepBlocked(p,{x:p.x,z:nz},crossings,obstacleCandidates,CITY_HALF+7))p.z=nz;
    player.setPosition(p.x,walkwayHeight(p.x,p.z,crossings),p.z);
}

// Characters -----------------------------------------------------------------
const agents=[];
const pickups=[];
const bolts=[];
let heldCrossbow=null;
let heldShotgun=null;
const discardedWeapons=[];
const spareAmmo={shotgun:0,crossbow:0,machinegun:0};
let gameMode='standard';
let agentId=1;
const MIN_AGENT_SPACING=1.4;
const MIN_ZOMBIE_SPAWN_DISTANCE=35;
const ENABLE_EATING=false;
function randomAgentSpeed(type,age){
    if(type==='zombie')return rand(1.05,1.35)*0.8;
    if(type==='civilian'&&age==='child')return rand(2.4,3.1);
    return rand(1.7,3.0);
}

function spacedSpawnPosition(position,type){
    let candidate=position.clone();
    const clear=p=>!blocked(p.x,p.z,0.35)
        &&(type!=='zombie'||dist2(p,playerSpawn)>=MIN_ZOMBIE_SPAWN_DISTANCE**2)
        &&!agents.some(other=>!other.dead&&dist2(p,other.entity.getPosition())<MIN_AGENT_SPACING**2);
    for(let attempt=0;attempt<256;attempt++){
        if(clear(candidate))return candidate;
        candidate=randomStreetPoint();
    }
    for(const x of ROAD_POSITIONS)for(let z=-(CITY_HALF-7);z<=CITY_HALF-7;z+=2){
        candidate=v3(x,0,z);if(clear(candidate))return candidate;
    }
    throw new Error('No safe character spawn available');
}

function makePersonMesh(type,age='adult',gender='m',skinMat=choose(skinMaterials)){
    return characterVisuals.create(type,age,gender,skinMat);
}

function spawnAgent(type='civilian', pos=randomStreetPoint(), opts={}){
    const age=opts.age||((type==='civilian'&&Math.random()<0.12)?'child':'adult');
    const gender=opts.gender||(Math.random()<0.5?'f':'m');
    const skin=choose(skinMaterials);
    const spawnPosition=spacedSpawnPosition(pos,type);
    const e=makePersonMesh(type,age,gender,skin);
    e.setPosition(spawnPosition.x,0,spawnPosition.z); app.root.addChild(e);
    const a={
        id:agentId++, type, initialType:type, initialPosition:e.getPosition().clone(),
        baseBodyMaterial:e.findByName('Body')?.render?.material,
        baseHeadMaterial:e.findByName('Head')?.render?.material,
        entity:e, age, gender, skin,
        state:type==='zombie'?'wander':'wander', target:null, wanderTarget:randomStreetPoint(),
        speed:randomAgentSpeed(type,age),
        hp:type==='zombie'?2:1, biteCount:0, infectionAt:0, infected:false,
        eaten:false, feedingUntil:0, dead:false, nextThink:0, nextAttack:0, nextShot:0,
        lastScream:-99, heard:null, heardUntil:0, attackers:new Set(), weapon:type==='police'?'gun':type==='firefighter'?'axe':null,
        ammo:type==='police'?6:0,
        facing:v3(0,0,-1), ageScale:age==='child'?0.85:1,
        lastActivityAt:type==='zombie'?performance.now()/1000:0
    };
    agents.push(a); return a;
}

for(let i=0;i<400;i++) spawnAgent('civilian');
for(let i=0;i<20;i++) spawnAgent('zombie');
for(let i=0;i<3;i++) spawnAgent('police');
for(let i=0;i<2;i++) spawnAgent('firefighter');

// Spatial hash for crowd lookup
const CELL=12;
let grid=new Map();
const CROWD_CELL=3;
let crowdGrid=new Map();
function updateCrowdCell(a){
    if(a.dead){
        const key=a.crowdCellX*65536+a.crowdCellZ,cell=crowdGrid.get(key);
        if(cell){cell.delete(a);if(cell.size===0)crowdGrid.delete(key);}
        a.crowdCellX=undefined;a.crowdCellZ=undefined;return;
    }
    const p=a.entity.getPosition(),x=Math.floor(p.x/CROWD_CELL),z=Math.floor(p.z/CROWD_CELL);
    a.crowdPosition=p;
    if(a.crowdCellX===x&&a.crowdCellZ===z)return;
    // NPC cells are bounded by the city; integer keys avoid per-query strings.
    const oldKey=a.crowdCellX*65536+a.crowdCellZ,previous=crowdGrid.get(oldKey);
    if(previous){previous.delete(a);if(previous.size===0)crowdGrid.delete(oldKey);}
    const key=x*65536+z;let cell=crowdGrid.get(key);
    if(!cell){cell=new Set();crowdGrid.set(key,cell);}cell.add(a);
    a.crowdCellX=x;a.crowdCellZ=z;
}
function rebuildGrid(){
    grid=new Map();
    for(const a of agents){
        updateCrowdCell(a);
        if(a.dead)continue;
        const p=a.entity.getPosition(),k=`${Math.floor(p.x/CELL)},${Math.floor(p.z/CELL)}`;
        if(!grid.has(k))grid.set(k,[]);grid.get(k).push(a);
    }
}
function nearby(pos,r,filter=null,out=[]){
    out.length=0;
    // Personal-space and melee queries need small, current cells, not a 36m square.
    if(r<=4){
        const r2=r*r,x0=Math.floor((pos.x-r)/CROWD_CELL),x1=Math.floor((pos.x+r)/CROWD_CELL),z0=Math.floor((pos.z-r)/CROWD_CELL),z1=Math.floor((pos.z+r)/CROWD_CELL);
        for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){
            const list=crowdGrid.get(x*65536+z);if(!list)continue;
            for(const a of list){
                if(a.dead||filter&&!filter(a))continue;
                const p=a.crowdPosition,dx=pos.x-p.x,dz=pos.z-p.z;
                if(dx*dx+dz*dz<=r2)out.push(a);
            }
        }
        return out;
    }
    const cr=Math.ceil(r/CELL), cx=Math.floor(pos.x/CELL),cz=Math.floor(pos.z/CELL),r2=r*r;
    for(let x=cx-cr;x<=cx+cr;x++) for(let z=cz-cr;z<=cz+cr;z++){
        const list=grid.get(`${x},${z}`); if(!list)continue;
        for(const a of list) if(!a.dead && (!filter||filter(a)) && dist2(pos,a.entity.getPosition())<=r2) out.push(a);
    }
    return out;
}

// Noise ----------------------------------------------------------------------
const noises=[];
function emitNoise(pos,radius,type){ noises.push({pos:pos.clone(),radius,type,until:performance.now()/1000+2.3}); }
function updateNoises(now){
    while(noises.length && noises[0].until<now) noises.shift();
    for(const n of noises){
        // A gunshot can span the entire city; avoid searching thousands of empty cells.
        const listeners=n.radius>60?agents:nearby(n.pos,n.radius,a=>a.type==='zombie');
        for(const z of listeners){
            if(z.dead||z.type!=='zombie'||dist2(n.pos,z.entity.getPosition())>n.radius*n.radius)continue;
            if(z.state==='feed') continue;
            z.heard=n.pos.clone(); z.heardUntil=now+4.5;
            z.lastActivityAt=now;
            if(z.state!=='chase') z.state='investigate';
        }
    }
}

function canSee(z, targetPos, maxDist=30){
    const zp=z.entity.getPosition(), d2=dist2(zp,targetPos); if(d2>maxDist*maxDist) return false;
    const dx=targetPos.x-zp.x,dz=targetPos.z-zp.z, len=Math.hypot(dx,dz)||1;
    const dot=(z.facing.x*dx+z.facing.z*dz)/len;
    if(dot<0.48) return false; // ~120 degree total cone
    return !segmentHitsBuilding(zp,targetPos);
}

function closestHumanForZombie(z){
    const p=z.entity.getPosition(); let best=null,bestD=Infinity;
    const candidates=nearby(p,32,a=>a.type!=='zombie' && !a.dead && !a.eaten);
    for(const h of candidates){
        const hp=h.entity.getPosition(),d=dist2(p,hp);
        const smelled=d<=36&&!segmentHitsBuilding(p,hp); // cover blocks close detection too
        if((smelled||canSee(z,hp,30))&&d<bestD){best=h;bestD=d;}
    }
    const pp=player.getPosition(),pd=dist2(p,pp);
    if(!gameOver&&!won&&((pd<=36&&!segmentHitsBuilding(p,pp))||canSee(z,pp,30))&&pd<bestD) return {player:true,entity:player};
    return best;
}

function setZombie(a){
    if(a.dead) return;
    if(a.weapon) dropWeapon(a.weapon,a.entity.getPosition(),a.ammo);
    const now=performance.now()/1000;
    a.weapon=null;a.ammo=0; a.type='zombie'; a.state='wander'; a.target=null; a.infected=false; a.biteCount=0; a.eaten=false;
    a.speed=randomAgentSpeed('zombie',a.age);a.hp=2;a.wanderTarget=randomStreetPoint();a.routeTarget=null;a.routeUntil=0;
    a.stuckFor=0;a.nextThink=now;a.nextAttack=0;a.lastActivityAt=now;a.heard=null;a.heardUntil=0;a.feedingUntil=0;
    a.fallen=false; a.fallAngle=0; a.entity.setLocalEulerAngles(8,a.entity.getEulerAngles().y,0);
    // swap visible materials on head and body posture
    const head=a.entity.findByName('Head'); if(head?.render) head.render.material=mats.zombie;
    a.entity.setLocalEulerAngles(8,a.entity.getEulerAngles().y,0);
}

function biteHuman(victim,zombie,now){
    if(victim.dead||victim.type==='zombie'||victim.eaten)return;
    victim.biteCount=Math.min(3,victim.biteCount+1);
    victim.infected=true;
    makePersonFall(victim);
    const delay=victim.biteCount===1?30:victim.biteCount===2?20:10;
    const proposedInfectionAt=now+delay;
    victim.infectionAt=victim.infectionAt?Math.min(victim.infectionAt,proposedInfectionAt):proposedInfectionAt;
    victim.state='flee';
    if(now-victim.lastScream>4){ victim.lastScream=now; emitNoise(victim.entity.getPosition(),160,'scream'); }
}

function startEating(victim,attackers,now){
    if(!ENABLE_EATING||victim.eaten||victim.dead)return;
    victim.eaten=true; victim.state='eaten'; victim.feedingUntil=now+30;
    makePersonFall(victim);
    emitNoise(victim.entity.getPosition(),120,'scream');
    for(const z of attackers){ z.state='feed'; z.target=victim; z.feedingUntil=now+30; z.lastActivityAt=now; }
}

function makePersonFall(a){
    if(a.fallen)return;
    a.fallen=true;a.fallAngle=0;a.fallDirection=Math.random()<0.5?-1:1;
    a.walkDistance=0;
}

function dropWeapon(type,pos,ammo=6){
    if(type==='crossbow'||type==='shotgun'||type==='machinegun'){
        const entity=type==='crossbow'?crossbowMesh():type==='machinegun'?machineGunMesh():shotgunMesh();app.root.addChild(entity);entity.setPosition(pos.x,pos.y+.12,pos.z);entity.setEulerAngles(0,rand(0,360),80);
        if(ammo>0)pickups.push({type,entity,ammo});else discardedWeapons.push(entity);
        return;
    }
    const mat=type==='gun'?mats.gun:mats.axe;
    const e=box(type==='gun'?'Dropped Gun':'Dropped Axe',v3(pos.x,0.2,pos.z),type==='gun'?v3(0.16,0.12,0.55):v3(0.15,0.8,0.15),mat);
    if(type==='gun')e.setEulerAngles(0,rand(0,360),70); else e.setEulerAngles(0,rand(0,360),85);
    pickups.push({type,entity:e,ammo:type==='gun'?Math.max(0,ammo):Infinity});
}
function pickupWeapon(){
    const p=player.getPosition(); let best=null,bd=4;
    for(const w of pickups){ const d=dist2(p,w.entity.getPosition()); if(d<bd){bd=d;best=w;} }
    if(!best){showMessage('No weapon nearby',0.6);return;}
    // Swap immediately, keeping the old weapon and its remaining ammunition.
    if(best.ammoFor){
        if(playerWeapon===best.ammoFor)playerAmmo+=best.ammo;
        else spareAmmo[best.ammoFor]+=best.ammo;
        best.entity.destroy();pickups.splice(pickups.indexOf(best),1);updateWeaponHud();
        showMessage(best.ammoFor==='shotgun'?'Collected 5 shotgun shells':'Collected 6 crossbow arrows',1.5);return;
    }
    if(playerWeapon)dropWeapon(playerWeapon,p,playerAmmo);
    if(heldCrossbow)heldCrossbow.enabled=false;
    if(heldShotgun)heldShotgun.enabled=false;
    playerWeapon=best.type; playerAmmo=best.ammo+(spareAmmo[best.type]||0);if(best.type in spareAmmo)spareAmmo[best.type]=0; best.entity.destroy(); pickups.splice(pickups.indexOf(best),1);
    updateWeaponHud(); showMessage(best.type==='machinegun'?`Picked up machine gun — ${playerAmmo} rounds`:best.type==='shotgun'?`Picked up shotgun — ${playerAmmo} shots`:best.type==='crossbow'?`Picked up crossbow — ${playerAmmo} arrows`:best.type==='gun'?'Picked up police pistol':'Picked up firefighter axe',1.2);
}
function restoreAlleyAmmo(){
    for(const [type,count,offset] of [['shotgun',5,-.7],['crossbow',6,.7]]){
        const entity=new pc.Entity(type+' spare ammunition');app.root.addChild(entity);
        entity.setPosition(alleyAmmoPosition.x+offset,.15,alleyAmmoPosition.z);
        box('Supply crate',v3(0,.15,0),v3(.7,.3,1),mats.axe,entity);
        box('Ammo label',v3(0,.32,0),v3(.65,.02,.8),cityDetails.sign(type==='shotgun'?'5 SHELLS':'6 ARROWS'),entity);
        pickups.push({type:'ammo',ammoFor:type,ammo:count,entity});
    }
}
function shotgunMesh(){
    const root=new pc.Entity('Shotgun');
    box('Shotgun wood stock',v3(0,0,.2),v3(.12,.16,.4),mats.axe,root);
    for(const x of [-.045,.045])box('Shotgun barrel',v3(x,.03,-.3),v3(.065,.065,.7),mats.gun,root);
    box('Shotgun foregrip',v3(0,-.03,-.15),v3(.14,.12,.25),mats.axe,root);return root;
}
function machineGunMesh(){
    const root=new pc.Entity('Machine gun');
    box('Machine gun receiver',v3(0,0,0),v3(.16,.18,.45),mats.gun,root);
    box('Machine gun barrel',v3(0,.025,-.42),v3(.065,.065,.45),mats.black,root);
    box('Machine gun stock',v3(0,-.01,.35),v3(.12,.16,.3),mats.gun,root);
    box('Machine gun magazine',v3(0,-.2,.02),v3(.1,.28,.14),mats.black,root);
    box('Machine gun sight',v3(0,.13,-.15),v3(.04,.06,.04),mats.white,root);return root;
}
function restoreShotgun(){
    const carnage=gameMode==='carnage',entity=carnage?machineGunMesh():shotgunMesh();
    app.root.addChild(entity);entity.setPosition(sportingPickupPosition);
    pickups.push({type:carnage?'machinegun':'shotgun',entity,ammo:carnage?100:5});
}
function dropEmptyWeapon(){
    if(playerAmmo>0||!['crossbow','shotgun','machinegun'].includes(playerWeapon))return;
    dropWeapon(playerWeapon,player.getPosition(),0);playerWeapon=null;playerAmmo=0;
    if(heldCrossbow)heldCrossbow.enabled=false;if(heldShotgun)heldShotgun.enabled=false;updateWeaponHud();
}
function crossbowMesh(){
    const root=new pc.Entity('Crossbow');
    box('Crossbow stock',v3(0,0,0),v3(.13,.14,.7),mats.axe,root);
    box('Crossbow limb left',v3(-.3,0,-.23),v3(.58,.07,.09),mats.black,root).setEulerAngles(0,-13,0);
    box('Crossbow limb right',v3(.3,0,-.23),v3(.58,.07,.09),mats.black,root).setEulerAngles(0,13,0);
    box('Crossbow string',v3(0,0,-.1),v3(1.08,.015,.015),mats.white,root);
    box('Crossbow bolt rail',v3(0,.085,-.15),v3(.025,.025,.55),mats.gun,root);
    return root;
}
function restoreCrossbow(){
    const entity=crossbowMesh();app.root.addChild(entity);entity.setPosition(archeryPickupPosition);entity.setEulerAngles(0,0,0);
    pickups.push({type:'crossbow',entity,ammo:6});
}
function crossbowAim(){
    const right=app.xr.active?app.xr.input?.inputSources.find(source=>source.handedness==='right'):null;
    return right?{origin:right.getOrigin(),direction:right.getDirection()}:{origin:camera.getPosition(),direction:camera.forward};
}
function updateCrossbow(dt){
    if(playerWeapon==='crossbow'){
        if(!heldCrossbow){heldCrossbow=crossbowMesh();app.root.addChild(heldCrossbow);heldCrossbow.setLocalScale(.6,.6,.6);}
        heldCrossbow.enabled=true;
        const aim=crossbowAim(),o=aim.origin,d=aim.direction;
        heldCrossbow.setPosition(o.x+d.x*.45+(app.xr.active?0:camera.right.x*.22),o.y+(app.xr.active?-.06:-.25)+d.y*.45,o.z+d.z*.45+(app.xr.active?0:camera.right.z*.22));
        heldCrossbow.lookAt(o.x+d.x*5,o.y+d.y*5,o.z+d.z*5);
    }else if(heldCrossbow)heldCrossbow.enabled=false;
    if(playerWeapon==='shotgun'||playerWeapon==='machinegun'){
        if(heldShotgun&&heldShotgun.weaponType!==playerWeapon){heldShotgun.destroy();heldShotgun=null;}
        if(!heldShotgun){heldShotgun=playerWeapon==='machinegun'?machineGunMesh():shotgunMesh();heldShotgun.weaponType=playerWeapon;app.root.addChild(heldShotgun);heldShotgun.setLocalScale(.65,.65,.65);}
        heldShotgun.enabled=true;const {origin:o,direction:d}=crossbowAim();heldShotgun.setPosition(o.x+d.x*.45,o.y-.2+d.y*.45,o.z+d.z*.45);heldShotgun.lookAt(o.x+d.x*5,o.y+d.y*5,o.z+d.z*5);
    }else if(heldShotgun)heldShotgun.enabled=false;
    for(let i=bolts.length-1;i>=0;i--){
        const bolt=bolts[i],p=bolt.position,d=bolt.direction,next=v3(p.x+d.x*55*dt,p.y+d.y*55*dt,p.z+d.z*55*dt);
        const obstacles=obstacleCandidates(Math.min(p.x,next.x)-.02,Math.min(p.z,next.z)-.02,Math.max(p.x,next.x)+.02,Math.max(p.z,next.z)+.02);
        const hit=traceBolt(p,next,agents,obstacles);
        bolt.life-=dt;
        if(hit||bolt.life<=0){if(hit?.target)killZombie(hit.target,'crossbow');bolt.entity.destroy();bolts.splice(i,1);}
        else{p.copy(next);bolt.entity.setPosition(p);}
    }
}
function clearBolts(){for(const bolt of bolts)bolt.entity.destroy();bolts.length=0;if(heldCrossbow)heldCrossbow.enabled=false;}

// AI -------------------------------------------------------------------------
function steerMove(a,target,dt,speedMul=1){
    const p=a.entity.getPosition(),now=performance.now()/1000;
    if(a.routeTarget&&now<a.routeUntil&&dist2(p,a.routeTarget)>0.16)target=a.routeTarget;
    else if(a.routeTarget){a.routeTarget=null;a.routeUntil=0;}
    const targetDistance=Math.sqrt(dist2(p,target)),lookAhead=Math.min(1,5/(targetDistance||1));
    const aheadX=p.x+(target.x-p.x)*lookAhead,aheadZ=p.z+(target.z-p.z)*lookAhead;
    if(!a.routeTarget&&!obstacleAreaClear(a,p.x,p.z,aheadX,aheadZ,0.35)&&segmentHitsObstacle(p.x,p.z,aheadX,aheadZ,0.35,false)){
        let waypoint=null,best=Infinity;
        for(const bounds of obstacleCandidates(p.x-10,p.z-10,p.x+10,p.z+10)){
            if(p.x<bounds.minx-10||p.x>bounds.maxx+10||p.z<bounds.minz-10||p.z>bounds.maxz+10)continue;
            for(const x of [bounds.minx-0.8,bounds.maxx+0.8])for(const z of [bounds.minz-0.8,bounds.maxz+0.8]){
                const corner=v3(x,0,z);
                if(dist2(p,corner)<0.16||blocked(x,z,0.35)||segmentHitsBuilding(p,corner,0.35,false))continue;
                const score=Math.sqrt(dist2(p,corner))+Math.sqrt(dist2(corner,target))+(segmentHitsBuilding(corner,target,0.35,false)?100:0);
                if(score<best){best=score;waypoint=corner;}
            }
        }
        if(waypoint){a.routeTarget=waypoint;a.routeUntil=now+12;target=waypoint;}
    }
    let dx=target.x-p.x,dz=target.z-p.z, len=Math.hypot(dx,dz);
    if(len<0.05){
        if(a.type==='zombie'){
            a.routeTarget=randomStreetPoint();a.routeUntil=now+3.5;
            dx=a.routeTarget.x-p.x;dz=a.routeTarget.z-p.z;len=Math.hypot(dx,dz);
        }else{dx=a.facing.x;dz=a.facing.z;len=Math.hypot(dx,dz);}
        if(len<0.05){dx=Math.cos(a.id*2.399);dz=Math.sin(a.id*2.399);len=1;}
    }
    dx/=len; dz/=len;
    const sp=a.speed*speedMul*dt;
    const filter=a.neighbourFilter||(a.neighbourFilter=b=>b!==a&&!b.dead&&((b.type==='zombie')===(a.type==='zombie')));
    const neighbours=nearby(p,MIN_AGENT_SPACING+sp,filter,a.neighbours||(a.neighbours=[]));
    const positions=a.neighbourPositions||(a.neighbourPositions=[]);positions.length=0;
    let separateX=0,separateZ=0;
    for(const other of neighbours){
        const op=other.entity.getPosition();positions.push(op);
        const awayX=p.x-op.x,awayZ=p.z-op.z,distanceSquared=awayX*awayX+awayZ*awayZ;
        if(distanceSquared<MIN_AGENT_SPACING*MIN_AGENT_SPACING){
            const distance=Math.sqrt(distanceSquared);
            const strength=(MIN_AGENT_SPACING-distance)/MIN_AGENT_SPACING;
            const angle=distance>0.001?0:((a.id*2.399)% (Math.PI*2));
            separateX+=(distance>0.001?awayX/distance:Math.cos(angle))*strength;
            separateZ+=(distance>0.001?awayZ/distance:Math.sin(angle))*strength;
        }
    }
    dx+=separateX*2.2; dz+=separateZ*2.2;
    len=Math.hypot(dx,dz)||1; dx/=len; dz/=len; a.facing.set(dx,0,dz);
    let nx=p.x+dx*sp,nz=p.z+dz*sp;
    // A converted victim can already be inside the feeders' spacing radius.
    // Let overlapping actors separate gradually instead of rejecting every step.
    const currentOverlap=crowdOverlap(positions,p.x,p.z);
    const steering=steerMove.directions||(steerMove.directions=[0,Math.PI/6,-Math.PI/6,Math.PI/3,-Math.PI/3,Math.PI/2,-Math.PI/2,Math.PI*2/3,-Math.PI*2/3,Math.PI].map(angle=>[Math.cos(angle),Math.sin(angle)]));
    let open=false,bestMove=-Infinity;
    // Keep a consistent bypass heading instead of alternating left/right gaps.
    const previous=a.moveHeading;
    for(const [cos,sin] of steering){
        const moveX=dx*cos-dz*sin,moveZ=dx*sin+dz*cos;
        const candidateX=p.x+moveX*sp,candidateZ=p.z+moveZ*sp;
        if(!movementBlocked(p.x,p.z,candidateX,candidateZ,0.35,a.clearArea)&&!crowdMoveBlocked(positions,candidateX,candidateZ,currentOverlap)){
            const continuity=previous?moveX*previous.x+moveZ*previous.z:0;
            const goalDistance=Math.sqrt(dist2(p,target))||1;
            const goalDot=(moveX*(target.x-p.x)+moveZ*(target.z-p.z))/goalDistance;
            const score=goalDot+continuity*1.25+(currentOverlap-crowdOverlap(positions,candidateX,candidateZ))*4;
            if(score>bestMove){bestMove=score;nx=candidateX;nz=candidateZ;open=true;}
        }
    }
    // Small shuffling steps must not reset deadlock recovery.
    const progress=a.moveProgress;
    if(!progress||dist2(progress.target,target)>0.25){
        a.moveProgress={target:{x:target.x,z:target.z},distance:Math.sqrt(dist2(p,target)),elapsed:0};
        a.stuckFor=0;
    }else{
        progress.elapsed+=dt;
        if(progress.elapsed>=1.2){
            const gained=progress.distance-Math.sqrt(dist2(p,target));
            a.stuckFor=gained<Math.min(0.15,a.speed*speedMul*progress.elapsed*0.1)?(a.stuckFor||0)+progress.elapsed:0;
            progress.distance=Math.sqrt(dist2(p,target));progress.elapsed=0;
        }
    }
    if(!open||a.stuckFor>0.9){
        if(!open)a.stuckFor=(a.stuckFor||0)+dt;
        if(a.stuckFor>0.9){
            const threat=a.state==='flee'&&a.target?.entity?a.target.entity.getPosition():null;
            let recovery=null,bestScore=-Infinity;
            for(let attempt=0;attempt<36;attempt++){
                const candidate=randomStreetPoint();
                if(blocked(candidate.x,candidate.z,0.35)||dist2(candidate,p)<25)continue;
                const nearbyPeople=nearby(candidate,MIN_AGENT_SPACING,other=>other!==a&&!other.dead&&((other.type==='zombie')===(a.type==='zombie'))).length;
                const distanceFromThreat=threat?dist2(candidate,threat):0;
                const score=(threat?distanceFromThreat:0)-dist2(candidate,p)*0.08-nearbyPeople*500;
                if(score>bestScore){bestScore=score;recovery=candidate;}
            }
            if(recovery){a.routeTarget=recovery;a.routeUntil=now+3.5;}
            else if(a.type==='zombie'&&a.state==='chase'){a.target=null;a.state='wander';a.wanderTarget=randomStreetPoint();}
            a.stuckFor=0;a.moveHeading=null;a.moveProgress=null;
        }
        if(!open)return;
    }
    dx=(nx-p.x)/(sp||1);dz=(nz-p.z)/(sp||1);
    a.moveHeading={x:dx,z:dz};a.facing.set(dx,0,dz);
    a.walkDistance=(a.walkDistance||0)+sp;
    a.entity.setPosition(nx,0,nz);
    updateCrowdCell(a);
    a.entity.lookAt(nx+dx,0,nz+dz);
}
function crowdOverlap(positions,x,z,stopAt=Infinity){
    let sum=0;const spacingSquared=MIN_AGENT_SPACING*MIN_AGENT_SPACING;
    for(const p of positions){
        const dx=x-p.x,dz=z-p.z,distanceSquared=dx*dx+dz*dz;
        if(distanceSquared<spacingSquared){sum+=MIN_AGENT_SPACING-Math.sqrt(distanceSquared);if(sum>stopAt)return sum;}
    }
    return sum;
}
function crowdMoveBlocked(positions,x,z,currentOverlap){
    if(currentOverlap>0.00001)return crowdOverlap(positions,x,z)>=currentOverlap-0.000001;
    return crowdOverlap(positions,x,z,0.00001)>0.00001;
}

function animatePerson(a,dt,now){
    characterVisuals.update(a,dt,now,camera.getPosition(),currentQuality);
}

function updateZombie(z,dt,now){
    if(z.state==='feed'){
        if(Number.isFinite(z.feedingUntil)&&now<z.feedingUntil)return;
        z.state='wander';z.target=null;z.feedingUntil=0;z.wanderTarget=randomStreetPoint();
        z.routeTarget=null;z.routeUntil=0;z.stuckFor=0;z.lastActivityAt=now;z.nextThink=now+0.25;
    }
    if(now>=z.nextThink){
        z.nextThink=now+rand(0.18,0.35);
        const t=closestHumanForZombie(z);
        if(t){z.target=t;z.state='chase';z.lastActivityAt=now;}
        else if(z.heard&&now<z.heardUntil){z.state='investigate';z.lastActivityAt=now;}
        else if(z.state==='chase'||z.state==='investigate'){z.state='wander';z.target=null;}
    }
    if(now-(z.lastActivityAt||0)>=300){z.state='idle';z.target=null;return;}
    if(z.state==='idle')z.state='wander';
    let targetPos=null;
    if(z.state==='chase'&&z.target){
        targetPos=z.target.player?player.getPosition():z.target.entity.getPosition();
        const d=Math.sqrt(dist2(z.entity.getPosition(),targetPos));
        const withinBiteHeight=!z.target.player||targetPos.y<=z.entity.getPosition().y+0.05;
        if(d<1.15 && withinBiteHeight && now>=z.nextAttack&&!segmentHitsBuilding(z.entity.getPosition(),targetPos)){
            z.nextAttack=now+1.25;z.lastVisualAttack=now;
            if(z.target.player){
                emitNoise(player.getPosition(),80,'player-scream');
                endGame(false,'A zombie got you');
            } else {
                const v=z.target; v.attackers.add(z.id); biteHuman(v,z,now);
                if(ENABLE_EATING){
                    const attackers=nearby(v.entity.getPosition(),1.5,a=>a.type==='zombie'&&a.state==='chase');
                    if(attackers.length>3) startEating(v,attackers,now);
                }
            }
        }
    } else if(z.state==='investigate'&&z.heard){
        targetPos=z.heard; if(dist2(z.entity.getPosition(),targetPos)<4){z.state='wander';z.heard=null;}
    } else {
        if(!z.wanderTarget||dist2(z.entity.getPosition(),z.wanderTarget)<5)z.wanderTarget=randomStreetPoint();
        targetPos=z.wanderTarget;
    }
    if(targetPos) steerMove(z,targetPos,dt,z.state==='chase'||z.state==='investigate'?2.6:1.0);
}

function dangerTargetForHuman(h){
    const p=h.entity.getPosition(); let nearest=null,bd=30*30;
    for(const z of nearby(p,30,a=>a.type==='zombie')){ const d=dist2(p,z.entity.getPosition()); if(d<bd){bd=d;nearest=z;} }
    return nearest;
}
function updateHuman(h,dt,now){
    if(h.infected&&now>=h.infectionAt){setZombie(h);return;}
    if(h.eaten){
        if(now>=h.feedingUntil){
            if(Math.random()<0.5){h.entity.setLocalScale(1,1,1);setZombie(h);} else {h.dead=true;h.entity.enabled=false;}
        }
        return;
    }
    if(h.fallen)return;
    if(now>=h.nextThink){
        h.nextThink=now+rand(0.25,0.55);
        const danger=dangerTargetForHuman(h);
        if(danger){h.state='flee';h.target=danger;if(now-h.lastScream>8&&Math.random()<0.22){h.lastScream=now;emitNoise(h.entity.getPosition(),150,'scream');}}
        else if(h.state==='flee'){h.state='wander';h.target=null;h.wanderTarget=randomStreetPoint();}
    }
    if(h.state==='flee'&&h.target){
        const p=h.entity.getPosition(),zp=h.target.entity.getPosition();
        const flee=h.fleeTarget||(h.fleeTarget=v3());flee.set(p.x+(p.x-zp.x)*2.5,0,p.z+(p.z-zp.z)*2.5);
        steerMove(h,flee,dt,1.25);
    } else {
        if(!h.wanderTarget||dist2(h.entity.getPosition(),h.wanderTarget)<6)h.wanderTarget=randomStreetPoint();
        steerMove(h,h.wanderTarget,dt,0.55);
    }
}
function updatePolice(p,dt,now){
    if(p.eaten||p.infected||p.ammo<=0){updateHuman(p,dt,now);return;}
    const pos=p.entity.getPosition(); let z=null,bd=38*38;
    for(const c of nearby(pos,38,a=>a.type==='zombie')){const d=dist2(pos,c.entity.getPosition());if(d<bd&&!segmentHitsBuilding(pos,c.entity.getPosition())){bd=d;z=c;}}
    if(z){
        p.target=z;p.state='combat';
        const zp=z.entity.getPosition(),d=Math.sqrt(bd); p.entity.lookAt(zp); p.facing.set(zp.x-pos.x,0,zp.z-pos.z).normalize();
        if(d<8){const retreat=v3(pos.x-(zp.x-pos.x),0,pos.z-(zp.z-pos.z));steerMove(p,retreat,dt,1.0);}
        if(d<34&&now>=p.nextShot){
            p.nextShot=now+0.75;p.lastVisualAttack=now;p.ammo--; emitNoise(pos,500,'gunshot');
            weaponAudio.shoot('gun',Math.max(0,1-Math.sqrt(dist2(pos,player.getPosition()))/100));
            if(Math.random()<0.72){z.hp--; if(z.hp<=0)killZombie(z,'police');}
        }
    } else updateHuman(p,dt,now);
}
function updateFirefighter(f,dt,now){
    if(f.eaten||f.infected){updateHuman(f,dt,now);return;}
    const pos=f.entity.getPosition(); let z=null,bd=15*15;
    for(const c of nearby(pos,15,a=>a.type==='zombie')){const d=dist2(pos,c.entity.getPosition());if(d<bd){bd=d;z=c;}}
    if(z){
        f.target=z; const zp=z.entity.getPosition(),d=Math.sqrt(bd);
        if(d>1.7) steerMove(f,zp,dt,1.0);
        else if(now>=f.nextAttack&&!segmentHitsBuilding(pos,zp)){ f.nextAttack=now+1.1;f.lastVisualAttack=now; emitNoise(pos,35,'axe'); killZombie(z,'firefighter'); }
    } else updateHuman(f,dt,now);
}
function killZombie(z,cause='player'){
    if(z.dead)return;
    z.dead=true;z.target=null;z.state='dead';z.deathCause=cause;
    const p=z.entity.getPosition(),yaw=z.entity.getEulerAngles().y;
    z.entity.setPosition(p.x,0.3,p.z);
    z.entity.setLocalEulerAngles(0,yaw,84);
}

function playerAttack(){
    if(gameOver||won)return;
    const now=performance.now()/1000;
    if(playerWeapon==='crossbow'){
        if(playerAmmo<=0){showMessage('No bolts remaining',.8);return;}
        if(now-lastPlayerShot<.7)return;
        lastPlayerShot=now;playerAmmo--;
        const aim=crossbowAim(),d=aim.direction.clone(),o=aim.origin;
        const position=v3(o.x+d.x*.45,o.y+d.y*.45,o.z+d.z*.45);
        const entity=box('Flying crossbow bolt',position,v3(.025,.025,.5),mats.axe);entity.lookAt(position.x+d.x,position.y+d.y,position.z+d.z);
        bolts.push({position,direction:d,entity,life:3});emitNoise(player.getPosition(),12,'crossbow');weaponAudio.shoot('crossbow');updateWeaponHud();dropEmptyWeapon();
    }else if(playerWeapon==='shotgun'){
        if(playerAmmo<=0){dropEmptyWeapon();return;}if(now-lastPlayerShot<.8)return;
        lastPlayerShot=now;playerAmmo--;const {origin:o,direction:d}=crossbowAim();
        const right=v3().cross(d,v3(0,1,0)).normalize(),up=v3().cross(right,d).normalize(),victims=new Set();
        for(const [x,y] of [[0,0],[-.035,0],[.035,0],[0,-.035],[0,.035],[-.025,-.025],[.025,.025]]){
            const end=v3(o.x+(d.x+right.x*x+up.x*y)*28,o.y+(d.y+right.y*x+up.y*y)*28,o.z+(d.z+right.z*x+up.z*y)*28);
            const hit=traceBolt(o,end,agents,obstacleCandidates(Math.min(o.x,end.x),Math.min(o.z,end.z),Math.max(o.x,end.x),Math.max(o.z,end.z)));
            if(hit?.target)victims.add(hit.target);
        }
        for(const victim of victims)killZombie(victim,'shotgun');emitNoise(player.getPosition(),500,'shotgun');weaponAudio.shoot('shotgun');updateWeaponHud();dropEmptyWeapon();
    }else if(playerWeapon==='machinegun'){
        if(playerAmmo<=0){dropEmptyWeapon();return;}if(now-lastPlayerShot<.1)return;
        lastPlayerShot=now;playerAmmo--;
        const {origin:o,direction:d}=crossbowAim(),end=v3(o.x+d.x*60,o.y+d.y*60,o.z+d.z*60);
        const hit=traceBolt(o,end,agents,obstacleCandidates(Math.min(o.x,end.x),Math.min(o.z,end.z),Math.max(o.x,end.x),Math.max(o.z,end.z)));
        if(hit?.target){hit.target.hp--;if(hit.target.hp<=0)killZombie(hit.target,'machinegun');}
        emitNoise(player.getPosition(),500,'gunshot');weaponAudio.shoot('machinegun');updateWeaponHud();dropEmptyWeapon();
    }else if(playerWeapon==='gun'){
        if(playerAmmo<=0){showMessage('Out of ammunition',0.7);return;}
        if(now-lastPlayerShot<0.25)return;
        lastPlayerShot=now; playerAmmo--; emitNoise(player.getPosition(),500,'gunshot');
        weaponAudio.shoot('gun');
        const cp=camera.getPosition(),f=camera.forward; let best=null,bd=45;
        for(const z of agents){if(z.dead||z.type!=='zombie')continue; const zp=z.entity.getPosition(); const dx=zp.x-cp.x,dy=0.8-cp.y,dz=zp.z-cp.z; const d=Math.hypot(dx,dy,dz); if(d>45)continue; const dot=(f.x*dx+f.y*dy+f.z*dz)/d; if(dot>0.985&&d<bd&&!segmentHitsBuilding(cp,zp)){best=z;bd=d;}}
        if(best){best.hp-=2;if(best.hp<=0)killZombie(best);}
        updateWeaponHud();
    } else if(playerWeapon==='axe'){
        if(now-lastPlayerShot<0.6)return; lastPlayerShot=now; emitNoise(player.getPosition(),35,'axe');
        const pp=player.getPosition(),f=camera.forward; let best=null,bd=2.2*2.2;
        for(const z of nearby(pp,2.2,a=>a.type==='zombie')){const zp=z.entity.getPosition(),dx=zp.x-pp.x,dz=zp.z-pp.z,d=Math.sqrt(dx*dx+dz*dz);const dot=(f.x*dx+f.z*dz)/(d||1);if(dot>0.25&&d*d<bd){best=z;bd=d*d;}}
        if(best)killZombie(best);
    } else showMessage('Unarmed — avoid the zombies',0.7);
}

// XR -------------------------------------------------------------------------
const vrButton=document.getElementById('vrButton');
const exitVRButton=document.getElementById('exitVRButton');
const vrControls=createVRControls();
const vrHud=createVRHud(pc,app,camera);
let enteringVR=false;
function refreshVRButton(){
    const available=app.xr.supported&&app.xr.isAvailable(pc.XRTYPE_VR);
    vrButton.disabled=!available||app.xr.active||enteringVR;
    vrButton.title=available?'Enter immersive VR':'VR requires a compatible headset and HTTPS or localhost';
    exitVRButton.disabled=!app.xr.active;
    document.getElementById('vrHelp').hidden=!app.xr.active;
}
app.xr.on('available:'+pc.XRTYPE_VR,refreshVRButton);
app.xr.on('start',()=>{applyQuality();enteringVR=false;vrControls.reset();document.exitPointerLock?.();refreshVRButton();if(!started||gameOver||won)resetGame();});
app.xr.on('end',()=>{applyQuality();enteringVR=false;vrControls.reset();leaveGame();refreshVRButton();});
function toggleVR(){
    if(!app.xr.supported||app.xr.active||enteringVR||!app.xr.isAvailable(pc.XRTYPE_VR))return;
    zombieAudio.enable();enteringVR=true;refreshVRButton();
    app.xr.start(camera.camera,pc.XRTYPE_VR,pc.XRSPACE_LOCALFLOOR,{callback:(err)=>{
        enteringVR=false;refreshVRButton();if(err)showMessage('VR start failed: '+err.message,2);
    }});
}
vrButton.addEventListener('click',toggleVR);
exitVRButton.addEventListener('click',()=>{if(app.xr.active)app.xr.end();});
setTimeout(refreshVRButton,500);
function updateXR(dt){
    if(!app.xr.active||!app.xr.session)return;
    const controls=vrControls.read(app.xr.session.inputSources);
    if(controls.exit){app.xr.end();return;}
    if(controls.restart){resetGame();showMessage('Game restarted',1.5);}
    if(!started||gameOver||won)return;
    if(controls.pickup)pickupWeapon();
    if(controls.attack||(playerWeapon==='machinegun'&&controls.attackHeld))playerAttack();
    const moveX=Math.abs(controls.moveX)>0.12?controls.moveX:0,moveY=Math.abs(controls.moveY)>0.12?controls.moveY:0;
    const moving=Boolean(moveX||moveY),running=energy.update(dt,controls.sprint,moving);
    runStateEl.textContent=running?'SPRINTING':energy.state.exhausted?'RECOVERING':'';
    if(moving){
        const f=camera.forward.clone();f.y=0;f.normalize();const r=camera.right.clone();r.y=0;r.normalize();
        const magnitude=Math.max(1,Math.hypot(moveX,moveY));
        const speed=(running?8.4:2.8)*dt/magnitude;tryMovePlayer((r.x*moveX-f.x*moveY)*speed,(r.z*moveX-f.z*moveY)*speed);
        runNoiseTimer-=dt;if(runNoiseTimer<=0){emitNoise(player.getPosition(),running?25:8,running?'running':'walking');runNoiseTimer=running?0.32:0.65;}
    }
}

// HUD / game -----------------------------------------------------------------
const statsEl=document.getElementById('stats'),arrowEl=document.getElementById('arrow'),distEl=document.getElementById('mallDistance'),weaponEl=document.getElementById('weapon'),messageEl=document.getElementById('message'),runStateEl=document.getElementById('runState');
let messageUntil=0;
let benchmarkLocalCount=0,benchmarkFrameMs=0;
function showMessage(text,seconds=1){messageEl.textContent=text;messageUntil=performance.now()/1000+seconds;}
function updateWeaponHud(){weaponEl.textContent=playerWeapon==='machinegun'?`MACHINE GUN · ${playerAmmo} rounds`:playerWeapon==='shotgun'?`SHOTGUN · ${playerAmmo} shots`:playerWeapon==='crossbow'?`CROSSBOW · ${playerAmmo} bolts`:playerWeapon==='gun'?`PISTOL · ${playerAmmo} rounds`:playerWeapon==='axe'?'FIREFIGHTER AXE':'UNARMED';}
function endGame(success,text){
    if(gameOver||won)return;
    zombieAudio.stop();ambience.stop();
    if(success)won=true; else gameOver=true;
    showMessage(text,999);
    document.getElementById('endTitle').textContent=success?'You reached the fire escape':'You were bitten';
    document.getElementById('endMessage').textContent=text;
    document.getElementById('endCard').style.display='block';
    document.exitPointerLock?.();
}

function resetGame(){
    gameMode=document.getElementById('gameMode').value;
    for(let i=agents.length-1;i>=0;i--)if(agents[i].carnageExtra){agents[i].entity.destroy();agents.splice(i,1);}

    weaponAudio.enable();
    zombieAudio.enable();zombieAudio.stop();
    ambience.start();
    energy.reset();rightMouseSprint=false;leftMouseFire=false;touchControls.reset();keys.clear();
    for(const a of agents){
        a.type=a.initialType; a.state='wander'; a.target=null; a.wanderTarget=randomStreetPoint();
        a.speed=randomAgentSpeed(a.initialType,a.age);
        a.hp=a.initialType==='zombie'?2:1; a.biteCount=0; a.infectionAt=0; a.infected=false;
        a.eaten=false; a.fallen=false; a.fallAngle=0; a.feedingUntil=0; a.dead=false; a.nextThink=rand(0,0.5); a.nextAttack=0; a.nextShot=0;
        a.lastVisualAttack=-99;a.walkCycle=0;a.walkDistance=0;
        a.lastScream=-99; a.heard=null; a.heardUntil=0; a.attackers.clear();a.lastActivityAt=a.type==='zombie'?performance.now()/1000:0;
        a.weapon=a.initialType==='police'?'gun':a.initialType==='firefighter'?'axe':null;
        a.ammo=a.initialType==='police'?6:0;a.deathCause=null;
        a.entity.enabled=true; a.entity.setLocalScale(1,1,1);
        a.entity.setPosition(a.initialPosition);
        a.entity.setEulerAngles(0,rand(0,360),0);
        const body=a.entity.findByName('Body'); if(body?.render&&a.baseBodyMaterial)body.render.material=a.baseBodyMaterial;
        const head=a.entity.findByName('Head'); if(head?.render&&a.baseHeadMaterial)head.render.material=a.baseHeadMaterial;
    }
    if(gameMode==='carnage')for(let i=0;i<80;i++)spawnAgent('zombie').carnageExtra=true;
    for(const pickup of pickups) pickup.entity.destroy();
    pickups.length=0;for(const entity of discardedWeapons)entity.destroy();discardedWeapons.length=0;
    clearBolts();if(heldShotgun)heldShotgun.enabled=false;restoreCrossbow();restoreShotgun();restoreAlleyAmmo();spareAmmo.shotgun=0;spareAmmo.crossbow=0; noises.length=0; rebuildGrid();
    player.setPosition(playerSpawn); yaw=0; pitch=0;
    benchmarkLocalCount=0;
    if(document.getElementById('startArea')?.value==='street'){benchmarkLocalCount=arrangeStreetBenchmark(agents,ROAD_STEP,blocked);const viewX=[-42,-44,-46,-48,-30].find(x=>!blocked(x,ROAD_STEP-.6,.55))??-30;player.setPosition(viewX,0,ROAD_STEP-.6);yaw=-90;rebuildGrid();}
    player.setEulerAngles(0,yaw,0); camera.setLocalEulerAngles(0,0,0);
    playerWeapon=null; playerAmmo=0;lastPlayerShot=-99; updateWeaponHud();
    gameOver=false; won=false; started=true; messageUntil=0;
    messageEl.textContent=''; runStateEl.textContent=''; runNoiseTimer=0;
    document.getElementById('endCard').style.display='none';
    document.getElementById('startCard').style.display='none';
    if(!app.xr.active&&!touchControls.supported)canvas.requestPointerLock?.();
    emitNoise(v3(-35,0,28),150,'opening-scream'); showMessage((gameMode==='carnage'?'CARNAGE — 100 zombies. ':'')+'Reach the mall and climb the fire escape',3);
}

function leaveGame(){
    zombieAudio.stop();ambience.stop();
    started=false; gameOver=false; won=false; messageUntil=0;rightMouseSprint=false;leftMouseFire=false;keys.clear();touchControls.setActive(false);
    messageEl.textContent=''; runStateEl.textContent='';
    document.getElementById('endCard').style.display='none';
    document.getElementById('startCard').style.display='block';
    document.exitPointerLock?.();
}

function updateHUD(now){
    touchControls.setActive(started&&!gameOver&&!won&&!app.xr.active);
    vrHud.update(app.xr.active,energy.state.value,runStateEl.textContent,gameOver||won,won,weaponEl.textContent);
    document.getElementById('energyMeter').value=energy.state.value;
    document.getElementById('energyValue').textContent=`${Math.ceil(energy.state.value)}%`;
    if(now>messageUntil&&!gameOver&&!won)messageEl.textContent='';
    let humans=0,zombies=0,police=0,fire=0;
    for(const a of agents){if(a.dead)continue;if(a.type==='zombie')zombies++;else {humans++;if(a.type==='police')police++;if(a.type==='firefighter')fire++;}}
    statsEl.textContent=`Humans ${humans} · Zombies ${zombies} · Police ${police} · Firefighters ${fire}`;
    const benchmark=document.getElementById('benchmarkPanel');benchmark.hidden=!benchmarkLocalCount||!started||app.xr.active;
    if(!benchmark.hidden){const visible=agents.filter(a=>a.entity.visualLOD<3).length;benchmark.textContent=`HIGH STREET BENCHMARK\n${benchmarkLocalCount} actors placed · ${agents.length} simulated\n${currentQuality.label} · ${visible} within render range\nAverage frame: ${benchmarkFrameMs.toFixed(1)} ms`;}
    const pp=player.getPosition(),dx=FIRE_ESCAPE.x-pp.x,dz=FIRE_ESCAPE.z-pp.z,d=Math.hypot(dx,dz);
    distEl.textContent=`FIRE ESCAPE ${Math.round(d)} m`;
    const worldAngle=Math.atan2(dx,-dz)*180/Math.PI; const heading=app.xr.active?Math.atan2(camera.forward.x,-camera.forward.z)*180/Math.PI:yaw;
    arrowEl.style.transform=`rotate(${worldAngle-heading}deg)`;
    if(d<1.5&&pp.y>=FIRE_ESCAPE.y-.15&&!won)endGame(true,'YOU REACHED THE FIRE ESCAPE — SURVIVED');
}

document.getElementById('startButton').addEventListener('click',resetGame);
document.getElementById('restartButton').addEventListener('click',resetGame);
document.getElementById('leaveButton').addEventListener('click',leaveGame);

function applyQuality(){
    currentQuality=resolveQuality(document.getElementById('quality').value,app.xr.active,touchControls.supported);
    app._townPBR.setQuality(currentQuality);
    for(const base of [mats.road,mats.pavement,mats.grass])for(const [key,m] of surfaceCache)if(key.startsWith(base.id+':')){m.diffuseMap=base.diffuseMap;m.normalMap=base.normalMap;m.glossMap=base.glossMap;m.aoMap=base.aoMap;m.metalnessMap=base.metalnessMap;m.update();}
    camera.camera.farClip=currentQuality.draw;app.scene.fog.start=currentQuality.draw*.25;app.scene.fog.end=currentQuality.draw*.75;
    sun.light.castShadows=currentQuality.shadows;sun.light.shadowResolution=1024;sun.light.shadowDistance=45;sun.light.shadowType=pc.SHADOW_PCF3;
}
document.getElementById('quality').addEventListener('change',applyQuality);
applyQuality();

// Main loop -------------------------------------------------------------------
let accumulator=0, runNoiseTimer=0;
app.on('update',dt=>{
    updateXR(dt);
    benchmarkFrameMs=benchmarkFrameMs?benchmarkFrameMs*.95+dt*1000*.05:dt*1000;
    const frameNow=performance.now()/1000;cityDetails.update(camera.getPosition(),frameNow,currentQuality);
    if(!started||gameOver||won){for(const a of agents)animatePerson(a,dt,frameNow);updateHUD(frameNow);return;}
    const now=performance.now()/1000;
    if(!app.xr.active&&(leftMouseFire||touchControls.state.fire)&&playerWeapon==='machinegun')playerAttack();
    updateCrossbow(dt);
    if(!app.xr.active){
        let x=touchControls.state.x,z=touchControls.state.z;if(keys.has('KeyW'))z-=1;if(keys.has('KeyS'))z+=1;if(keys.has('KeyA'))x-=1;if(keys.has('KeyD'))x+=1;
        const sprintRequested=touchControls.state.sprint||rightMouseSprint||keys.has('Shift')||keys.has('ShiftLeft')||keys.has('ShiftRight')||app.keyboard.isPressed(pc.KEY_SHIFT);
        const running=energy.update(dt,sprintRequested,Boolean(x||z));
        if(x||z){
            const l=Math.max(1,Math.hypot(x,z));x/=l;z/=l;
            const forward=camera.forward.clone();forward.y=0;forward.normalize();
            const right=camera.right.clone();right.y=0;right.normalize();
            const wx=right.x*x-forward.x*z,wz=right.z*x-forward.z*z;
            const speed=running?8.4:2.8;runStateEl.textContent=running?'SPRINTING':energy.state.exhausted?'RECOVERING':'';tryMovePlayer(wx*speed*dt,wz*speed*dt);
            runNoiseTimer-=dt;if(runNoiseTimer<=0){emitNoise(player.getPosition(),running?25:8,running?'running':'walking');runNoiseTimer=running?0.32:0.65;}
        } else runStateEl.textContent=energy.state.exhausted?'RECOVERING':'';
    }

    accumulator+=dt;
    if(accumulator>=0.1){ // 10Hz spatial rebuild / hearing pass
        rebuildGrid(); updateNoises(now); accumulator=0;
    }
    // AI is deliberately staggered internally via nextThink timers.
    for(const a of agents){
        if(a.dead){animatePerson(a,dt,now);continue;}
        if(a.type==='zombie')updateZombie(a,dt,now);
        else if(a.type==='police')updatePolice(a,dt,now);
        else if(a.type==='firefighter')updateFirefighter(a,dt,now);
        else updateHuman(a,dt,now);
        animatePerson(a,dt,now);
    }
    if(document.hidden||gameOver||won)zombieAudio.stop();
    else{
        const position=camera.getPosition();let nearest=null,distance=24;
        for(const z of nearby(position,24,a=>a.type==='zombie')){
            const d=Math.sqrt(dist2(position,z.entity.getPosition()));if(d<distance){nearest=z;distance=d;}
        }
        zombieAudio.update(nearest?distance:Infinity,nearest,{position,forward:camera.forward,up:camera.up});
    }
    updateHUD(now);
});

window.addEventListener('resize',()=>app.resizeCanvas());
restoreCrossbow();restoreShotgun();updateWeaponHud(); rebuildGrid(); updateHUD(performance.now()/1000);
