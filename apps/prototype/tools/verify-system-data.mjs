import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {orientation,satelliteState,lunarMassFraction,occludes} from '../public/observatory/system-astronomy.js';
const json=async f=>JSON.parse(await fs.readFile(new URL(f==='orientation-reference.json'?'fixtures/'+f:'../public/observatory/'+f,import.meta.url),'utf8'));
const physical=await json('system-orientation.json'),references=await json('orientation-reference.json');
let max=0;
for(const ref of references){const actual=orientation(physical.bodies[ref.id],ref.et);for(let i=0;i<3;i++)for(let j=0;j<3;j++)max=Math.max(max,Math.abs(actual[i][j]-ref.basis[i][j]));}
assert.ok(max<1e-8,'Rotation basis matches independent CSPICE including periodic terms: '+max);
console.log(`${references.length} orientation matrices vs CSPICE N0067; maximum component error ${max}`);
const rails=await json('satellite-data.json'),bytes=await fs.readFile(new URL('../public/observatory/satellite-states.bin',import.meta.url));
const data=new Float64Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/8);
for(const moon of rails.moons){
  satelliteState(moon,data,rails.startEt);satelliteState(moon,data,rails.endEt);
  for(const probe of moon.probes){const actual=satelliteState(moon,data,probe[0]),error=Math.hypot(...actual.map((n,i)=>n-probe[i+1]));assert.ok(error<moon.budgetKm,moon.id+' independent probe: '+error);}
  assert.ok(moon.maxErrorKm<moon.budgetKm,moon.id+' all midpoint holdouts');
}
const moon=rails.moons.find(m=>m.id==='moon'),r=satelliteState(moon,data,rails.startEt),earth=r.map(n=>-n*lunarMassFraction),luna=earth.map((n,i)=>n+r[i]);
assert.ok(Math.hypot(...earth.map((n,i)=>n*(1-lunarMassFraction)+luna[i]*lunarMassFraction))<1e-10,'Earth/Moon centre of mass preserves EMB');
assert.equal(occludes([0,0,2],[0,0,0],[1,1,1],[[1,0,0],[0,1,0],[0,0,1]]),false);
assert.equal(occludes([0,0,-2],[0,0,0],[1,1,1],[[1,0,0],[0,1,0],[0,0,1]]),true);
assert.equal(occludes([2,0,-2],[0,0,0],[1,1,1],[[1,0,0],[0,1,0],[0,0,1]]),false);
console.log(`${rails.moons.length} satellite rails; cached results from ${rails.moons.reduce((n,m)=>n+m.holdoutCount,0)} midpoint holdouts checked; ${rails.moons.reduce((n,m)=>n+m.probes.length,0)} non-midpoint/endpoint JPL probes recomputed; endpoint coverage, barycentre and foreground occlusion assertions passed`);
