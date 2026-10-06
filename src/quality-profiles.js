export const QUALITY_PROFILES = Object.freeze({
    high: Object.freeze({label:'PC High',textureSize:512,near:22,middle:52,cull:110,detail:85,clutter:55,draw:450,shadows:true,effects:18}),
    low: Object.freeze({label:'PC Low',textureSize:256,near:15,middle:35,cull:85,detail:55,clutter:35,draw:320,shadows:false,effects:8}),
    quest: Object.freeze({label:'Quest / Mobile',textureSize:256,near:12,middle:28,cull:70,detail:42,clutter:25,draw:260,shadows:false,effects:4})
});
export function resolveQuality(selected,xr=false,mobile=false){return QUALITY_PROFILES[xr?'quest':selected==='auto'?(mobile?'quest':'high'):selected]||QUALITY_PROFILES.low;}
// Rendering never removes an actor or changes simulation state.
export function characterLOD(distance,profile){return distance<profile.near?0:distance<profile.middle?1:distance<profile.cull?2:3;}
export function seededRandom(seed=94187){return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);}
