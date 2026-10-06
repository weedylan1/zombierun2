import {spawnSync} from 'node:child_process';
const checks=['movement-check.cjs','obstacle-check.cjs','obstacle-index-check.cjs','crowd-index-check.cjs','world-check.mjs','crossbow-check.mjs','weapon-check.mjs','energy-check.mjs','audio-check.mjs','bite-height-check.mjs','vr-check.mjs','touch-check.mjs','carnage-check.mjs','visual-check.mjs'];
for(const check of checks){const r=spawnSync(process.execPath,[check],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
console.log('PASS: all 14 checks');
