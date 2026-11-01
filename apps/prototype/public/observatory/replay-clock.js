import {LIGHT_KM_S,currentUnits} from './system-units.js';
const nodes=[0,-.5384693101056831,.5384693101056831,-.906179845938664,.906179845938664];
const weights=[.5688888888888889,.4786286704993665,.4786286704993665,.2369268850561891,.2369268850561891];
export function createReplayClock(flight){
 const segments=[];let totalKm=0;
 const duration=flight.endEt-flight.startEt;
 const norm=(s,u)=>Math.hypot(...s.b.map((b,k)=>b+2*s.c[k]*u+3*s.d[k]*u*u));
 function integral(s,lo,hi){const half=(hi-lo)/2,mid=(lo+hi)/2;return half*nodes.reduce((sum,x,i)=>sum+weights[i]*norm(s,mid+half*x),0);}
 for(let i=1;i<flight.samples.length;i++){
  const a=flight.samples[i-1],b=flight.samples[i],dt=b.t-a.t;
  // A velocity kick has two knots at one ET, with no intervening path length.
  if(dt<=0)continue;
  const s={start:a.t,end:b.t,dt,offset:totalKm,b:a.v.map(v=>v*dt),c:a.r.map((r,k)=>3*(b.r[k]-r)-(2*a.v[k]+b.v[k])*dt),d:a.r.map((r,k)=>2*(r-b.r[k])+(a.v[k]+b.v[k])*dt)};
  s.length=integral(s,0,1);totalKm+=s.length;segments.push(s);
 }
 function segmentAt(value,key){let lo=0,hi=segments.length-1;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(segments[mid][key]<=value)lo=mid;else hi=mid-1;}return segments[lo];}
 function distanceAt(et){if(et<=flight.startEt)return 0;if(et>=flight.endEt)return totalKm;const s=segmentAt(et,'start');return s.offset+integral(s,0,(et-s.start)/s.dt);}
 function speedAt(et){const s=segmentAt(Math.min(flight.endEt,Math.max(flight.startEt,et)),'start');return norm(s,(et-s.start)/s.dt)/s.dt;}
 function etAtDistance(km){
  if(km<=0)return flight.startEt;if(km>=totalKm)return flight.endEt;
  const s=segmentAt(km,'offset'),target=km-s.offset;let lo=0,hi=1,u=target/s.length;
  for(let i=0;i<12;i++){
   const error=integral(s,0,u)-target;if(Math.abs(error)<.000001)break;
   if(error>0)hi=u;else lo=u;
   const next=u-error/norm(s,u);u=Number.isFinite(next)&&next>lo&&next<hi?next:(lo+hi)/2;
  }
  return s.start+u*s.dt;
 }
 const normalRate=duration/24;
 const isLightContext=state=>state.science&&currentUnits(state)==='light';
 const usingC=state=>isLightContext(state)&&state.lightRate>0;
 function rate(state){return isLightContext(state)?(state.lightRate?state.lightRate*LIGHT_KM_S/speedAt(flight.startEt+state.progress*duration):1):(state.rate||normalRate);}
 function apparentC(state){return usingC(state)?state.lightRate:rate(state)*speedAt(flight.startEt+state.progress*duration)/LIGHT_KM_S;}
 function advance(state,seconds){
  if(!usingC(state))return Math.min(1,state.progress+seconds*rate(state)/duration);
  const et=flight.startEt+state.progress*duration,target=distanceAt(et)+seconds*state.lightRate*LIGHT_KM_S;
  return Math.min(1,Math.max(0,(etAtDistance(target)-flight.startEt)/duration));
 }
 return {distanceAt,etAtDistance,speedAt,rate,apparentC,advance,totalKm,duration,normalRate,isLightContext,usingC};
}
