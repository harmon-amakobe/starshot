import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const tools=path.dirname(fileURLToPath(import.meta.url)),dir=path.resolve(tools,'../public/observatory');
const sandbox={};vm.runInNewContext(await fs.readFile(path.join(dir,'replay-model.js'),'utf8'),sandbox);
const model=sandbox.ReplayModel,eph=model.createEphemeris({flatten:true});
const flight=JSON.parse(await fs.readFile(path.join(dir,'precise-flight.json'),'utf8'));
const reference=JSON.parse(await fs.readFile(path.join(tools,'fixtures/precise-flight-reference.json'),'utf8'));
let maxPositionErrorKm=0,maxVelocityErrorKmS=0;
for(const probe of reference){
  const actual=[model.sampleAt(flight,probe.et),...flight.ids.map(id=>eph.state(id,probe.et))];
  const expected=[probe.craft,...probe.bodies];
  for(let i=0;i<actual.length;i++)for(let k=0;k<3;k++){
    maxPositionErrorKm=Math.max(maxPositionErrorKm,Math.abs(actual[i].r[k]-expected[i].r[k]));
    maxVelocityErrorKmS=Math.max(maxVelocityErrorKmS,Math.abs(actual[i].v[k]-expected[i].v[k]));
  }
}
assert.equal(maxPositionErrorKm,0);assert.equal(maxVelocityErrorKmS,0);
assert.equal(flight.samples.length,215);
console.log(JSON.stringify({probes:reference.length,knots:flight.samples.length,maxPositionErrorKm,maxVelocityErrorKmS,comparison:'Unchanged source model evaluated through Vite SSR'},null,2));
