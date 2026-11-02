export function createHostedMission(init,system,ReplayModel){
 const AU=ReplayModel.AU_KM,basis=[init.basis.right,init.basis.up,init.basis.normal],eph=ReplayModel.createEphemeris({flatten:false});
 const moon=system.rails.moons.find(m=>m.id==='moon'),data=system.data,fraction=4902.8001184575496/(398600.43550702266+4902.8001184575496);
 const project=v=>basis.map(axis=>axis.reduce((sum,n,i)=>sum+n*v[i],0));
 const localActive=state=>!state.solar&&!state.focusBody&&!state.hostInspection;
 function earthState(et){
  const emb=eph.state('earth',et),r=system.relative('moon',et);
  let lo=0,hi=moon.count-1;const at=i=>moon.offset+i*7;
  while(hi-lo>1){const m=(lo+hi)>>1;if(data[at(m)]<=et)lo=m;else hi=m;}
  const a=at(lo),b=at(hi),h=data[b]-data[a],u=(et-data[a])/h;
  const v=[0,1,2].map(i=>(6*u*u-6*u)*data[a+i+1]/h+(3*u*u-4*u+1)*data[a+i+4]+(-6*u*u+6*u)*data[b+i+1]/h+(3*u*u-2*u)*data[b+i+4]);
  return {r:emb.r.map((n,i)=>n-r[i]*fraction),v:emb.v.map((n,i)=>n-v[i]*fraction)};
 }
 function localState(knot,et){const earth=earthState(et);return {r:project(knot.r.map((n,i)=>n-earth.r[i])),v:project(knot.v.map((n,i)=>n-earth.v[i]))};}
 function sampleFrame(frame,state){
  if(!localActive(state))return frame;
  const earth=frame.km.earth,transform=r=>project(r.map((n,i)=>n-earth[i])).slice(0,2).map(n=>n/AU);
  const positions=Object.fromEntries(Object.entries(frame.km).map(([id,r])=>[id,transform(r)]));
  return {...frame,positions,bodies:init.flight.ids.map(id=>positions[id]),craft:transform(frame.craftKm),velocity:localState({r:frame.craftKm,v:frame.velocity},frame.et).v};
 }
 const path=init.clockFlight.samples.map(k=>project(k.r).slice(0,2).map(n=>n/AU));
 function view(w,h,top,bottom,state,frame){
  if(!localActive(state))return null;
  const points=[[0,0],frame.positions.moon,...path],xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const low=[Math.min(...xs),Math.min(...ys)],high=[Math.max(...xs),Math.max(...ys)];
  const scale=Math.min((w-100)/Math.max(.0002,high[0]-low[0]),Math.max(80,h-top-bottom-40)/Math.max(.0002,high[1]-low[1]))*.82*state.zooms[state.camera];
  const fitted=[(low[0]+high[0])/2,(low[1]+high[1])/2],centre=state.camera==='follow'?frame.craft:state.camera==='free'?state.pan:fitted;
  return {w,h,bottom,scale,ox:w/2,oy:top+Math.max(80,h-top-bottom)/2,centre,f:frame};
 }
 function decorate(root,panels){
  const q=s=>root.querySelector(s),days=(init.flight.endEt-init.flight.startEt)/86400;
  q('.brand small').textContent=init.phase==='aim'?'First leap · preview':'First leap · flight';
  q('.mission').innerHTML='<span class="destination" aria-hidden="true"></span><span><span class="origin">Earth → </span>Moon</span><span aria-hidden="true">⌄</span>';
  for(const dot of root.querySelectorAll('.mission .destination,.route-diagram .mars-dot')){dot.style.background='#c4ccce';dot.style.boxShadow='inset -3px -2px 3px #555e6b';}
  const timeline=q('.timeline');Object.assign(timeline.style,{display:'flex',position:'static',width:'100%',minHeight:'44px',gap:'10px'});
  Object.assign(timeline.querySelector('input').style,{display:'block',minWidth:'44px',height:'44px'});
  q('.distance-instrument').setAttribute('aria-label','Show distance to Moon on the map');
  q('.distance-instrument .instrument-label').lastChild.textContent='To Moon';
  q('.route-diagram').lastElementChild.textContent='Moon';q('.trip-instrument .reading-unit').textContent=' / '+days.toFixed(2)+' d';
  q('.world').setAttribute('aria-label','First leap: current Earth to Moon '+(init.phase==='aim'?'preview':'flight')+'. The dotted path is the exact computed route.');
  const values=q('.science-page[data-page="2"]').querySelectorAll('dd');values[0].textContent=init.mission.burnAngleDeg.toFixed(1)+'°';values[1].textContent='Aim plane locked';
  const originalMenu=panels.menu.body,originalHelp=panels.help.body,originalCredits=panels.credits.body;
  panels.credits.body=()=>originalCredits().replace(/(<strong>Flight<\/strong><p class="muted">)[\s\S]*?(<\/p>)/,'$1Your current computed lunar path. The collector starts 200 km above Earth in a prograde lunar-plane parking orbit. The objective is the 65,000 km Moon approach zone. Full 3D heliocentric integration drives the flight; the mission view subtracts Earth at each sample time and looks from the north side of the lunar plane. Distances remain linear. Realistic worlds use physical radii; craft and enlarged-world symbols remain display aids.$2').replace('This is a top-down ecliptic projection, not a navigational ephemeris.','The mission view uses the lunar departure plane. Solar-system inspection uses the ecliptic view. This prototype is not a navigational ephemeris.');
  panels.menu.body=()=>originalMenu().replace('Play lunar level','Return to '+(init.phase==='aim'?'aim':'flight'));
  panels.help.body=()=>originalHelp().replaceAll('Mars','Moon').replace('24 seconds','7 seconds');
  panels.launch={title:'First leap',body:()=>'<h3>Earth → Moon</h3><p class="muted section">Reach the 65,000 km lunar approach zone.</p><p class="section">This is your current computed '+(init.phase==='aim'?'preview. Returning does not launch it.':'flight. Return to the same journey at any time.')+'</p>'};
  panels.result={title:init.mission.outcome==='approach'?'Moon approach reached':init.mission.outcome==='impact'?'Flight ended at impact':'Preview complete',body:()=>'<p>'+days.toFixed(2)+' days. '+(init.mission.outcome==='approach'?'Approach zone reached.':'This path did not reach the approach zone.')+'</p><div class="menu-list section"><button data-action="replay">Replay journey</button><button data-action="lunar-level">Return to '+(init.phase==='aim'?'aim':'flight')+'</button></div>'};
 }
 return {mission:init.mission,phase:init.phase,localActive,project,earthState,localState,sampleFrame,view,decorate,
  orbit:init.lunarOrbit.map(p=>p.slice(0,2).map(n=>n/AU))};
}
