export const planetIds=['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'];
export const moonRadii={moon:1737.4,phobos:11.08,deimos:6.2,io:1821.49,europa:1560.8,ganymede:2631.2,callisto:2410.3,mimas:198.2,enceladus:252.1,tethys:531.1,dione:561.4,rhea:763.5,titan:2574.76,hyperion:135,iapetus:734.3,phoebe:106.5,ariel:578.9,umbriel:584.7,titania:788.9,oberon:761.4,miranda:235.8,triton:1352.6,nereid:170,proteus:208};
export const lunarMassFraction=4902.8001184575496/(398600.43550702266+4902.8001184575496);
const rad=Math.PI/180,epsilon=84381.448/3600*rad;
const polynomial=(a,x)=>(a||[]).reduceRight((v,n)=>v*x+n,0);
const ecliptic=([x,y,z])=>[x,Math.cos(epsilon)*y+Math.sin(epsilon)*z,-Math.sin(epsilon)*y+Math.cos(epsilon)*z];
// Text PCK uses centuries for pole angles and periodic phases, days for W.
export function orientation(body,et){
  if(!body.PM)return null;
  const T=et/(86400*36525),d=et/86400,degree=(body.MAX_PHASE_DEGREE?.[0]??1)+1;
  const phases=[];
  for(let i=0;i<(body.NUT_PREC_ANGLES?.length||0);i+=degree)phases.push(polynomial(body.NUT_PREC_ANGLES.slice(i,i+degree),T)*rad);
  const periodic=(key,fn)=>(body[key]||[]).reduce((v,a,i)=>v+a*fn(phases[i]),0);
  const ra=(polynomial(body.POLE_RA,T)+periodic('NUT_PREC_RA',Math.sin))*rad;
  const dec=(polynomial(body.POLE_DEC,T)+periodic('NUT_PREC_DEC',Math.cos))*rad;
  const w=(polynomial(body.PM,d)+periodic('NUT_PREC_PM',Math.sin))*rad;
  const z=[Math.cos(dec)*Math.cos(ra),Math.cos(dec)*Math.sin(ra),Math.sin(dec)];
  const x0=[-Math.sin(ra),Math.cos(ra),0],y0=[-Math.sin(dec)*Math.cos(ra),-Math.sin(dec)*Math.sin(ra),Math.cos(dec)];
  return [x0.map((n,i)=>Math.cos(w)*n+Math.sin(w)*y0[i]),x0.map((n,i)=>-Math.sin(w)*n+Math.cos(w)*y0[i]),z].map(ecliptic);
}
export function satelliteState(meta,data,t){
  let lo=0,hi=meta.count-1;
  const at=i=>meta.offset+i*7;
  if(t<data[at(lo)]-.0001||t>data[at(hi)]+.0001)throw Error('Outside satellite data coverage');
  while(hi-lo>1){const m=(lo+hi)>>1;if(data[at(m)]<=t)lo=m;else hi=m;}
  const a=at(lo),b=at(hi),h=data[b]-data[a],u=Math.max(0,Math.min(1,(t-data[a])/h)),u2=u*u,u3=u2*u;
  return [0,1,2].map(i=>(2*u3-3*u2+1)*data[a+i+1]+(u3-2*u2+u)*h*data[a+i+4]+(-2*u3+3*u2)*data[b+i+1]+(u3-u2)*h*data[b+i+4]);
}
export function occludes(point,centre,axes,basis){
  const delta=point.map((n,i)=>n-centre[i]);
  const q=basis.map(b=>b[0]*delta[0]+b[1]*delta[1]),inv=axes.map(a=>1/(a*a));
  const a=basis.reduce((s,b,i)=>s+b[2]*b[2]*inv[i],0),b=2*q.reduce((s,v,i)=>s+v*basis[i][2]*inv[i],0),c=q.reduce((s,v,i)=>s+v*v*inv[i],0)-1;
  const disc=b*b-4*a*c;
  return disc>=0&&delta[2]<(-b+Math.sqrt(disc))/(2*a);
}
export async function loadSystem(){
  const [physical,rails,buffer]=await Promise.all([fetch('system-orientation.json').then(r=>r.json()),fetch('satellite-data.json').then(r=>r.json()),fetch('satellite-states.bin').then(r=>r.arrayBuffer())]);
  const data=new Float64Array(buffer);
  return {physical,rails,data,relative:(id,t)=>satelliteState(rails.moons.find(m=>m.id===id),data,t),basis:(id,t)=>orientation(physical.bodies[id],t)};
}
