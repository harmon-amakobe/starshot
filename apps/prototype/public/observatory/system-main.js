import {createReplayClock} from './replay-clock.js';
import {currentUnits,distanceReading,rulerReading} from './system-units.js';
import {createControls} from './system-controls.js';
import {loadSystem,planetIds,moonRadii,lunarMassFraction,occludes} from './system-astronomy.js';
import {rings,drawRings} from './system-rings.js';
import {drawSolarAtmosphere,drawSolarBrightening} from './solar-renderer.js';
const [system,flight,assets]=await Promise.all([loadSystem(),fetch('precise-flight.json').then(r=>r.json()),fetch('planet-assets.json').then(r=>r.json())]);
flight.ids=planetIds;
const replayClock=createReplayClock(flight);
const moons=system.rails.moons,allIds=['sun',...planetIds,...moons.map(m=>m.id)],nameOf=id=>id[0].toUpperCase()+id.slice(1);
const parentOf=id=>moons.find(m=>m.id===id)?.parent||id;
const radiusOf=id=>ReplayModel.BODIES[id]?.radiusKm||moonRadii[id];
const axesOf=id=>system.physical.bodies[id].RADII||Array(3).fill(radiusOf(id));
const neutralBasis=[[1,0,0],[0,1,0],[0,0,1]];
  const root=document.getElementById('starshot-shell'), q=s=>root.querySelector(s), qa=s=>[...root.querySelectorAll(s)];
  const canvas=q('.world'), ctx=canvas.getContext('2d');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const saved=window.openai?.widgetState?.privateContent;
  const state={progress:.18,camera:'system',zooms:{system:1,follow:1.8,free:1},pan:[0,0],science:false,trueSize:false,sizeLinked:true,unitPreferences:{simple:'light',science:'metric'},focusBody:null,focusSystem:false,solar:false,rate:0,lightRate:1,guides:false,clear:false,deck:true,inspect:false,page:0,playing:false,opened:null,wasPlaying:false,last:0,raf:0,music:false,effects:false,volume:.45};
  let controls;
  let inspectionReturn=null,inspectionId=null;
  let solarMotion=0;
  let opener=null,drag=null,bg=null,bgKey='',sound=null,soundBus=null,musicTimer=null,notes=[],lastCue=0;
  const eph=ReplayModel.createEphemeris({flatten:true}),orbitLines=planetIds.map(id=>ReplayModel.orbitPath(id,flight.startEt,512,{flatten:true}).map(r=>r.slice(0,2).map(n=>n/ReplayModel.AU_KM)));
  const AU=ReplayModel.AU_KM,radii=planetIds.map(id=>ReplayModel.BODIES[id].radiusKm),colors=['#A8AECA','#EAD59A','#53C8F0','#F17C68'];
  function restore(n){if(!n)return;state.progress=Math.max(0,Math.min(1,Number(n.progress)||0));state.camera=['follow','system','free'].includes(n.camera)?n.camera:'system';state.science=!!n.science;if(Number.isFinite(n.rate)&&n.rate>=0)state.rate=n.rate;if(n.lightRate===null)state.lightRate=0;else if(Number.isFinite(n.lightRate)&&n.lightRate>=0&&n.lightRate<=300)state.lightRate=n.lightRate;for(const mode of ['simple','science'])if(['metric','imperial','light'].includes(n.unitPreferences?.[mode]))state.unitPreferences[mode]=n.unitPreferences[mode];state.trueSize=!!n.trueSize;state.sizeLinked=n.sizeLinked!==false;if(state.sizeLinked)state.trueSize=state.science;state.focusBody=allIds.includes(n.focusBody)?n.focusBody:null;for(const k of ['follow','system','free'])state.zooms[k]=Math.max(.03,Math.min(500000000,Number(n.zooms?.[k])||1));if(Array.isArray(n.pan)&&n.pan.length===2&&n.pan.every(Number.isFinite))state.pan=n.pan.slice();}
  restore(saved);
  function persist(){window.openai?.setWidgetState?.({modelContent:{direction:'Pocket observatory playfulness with Deep field rounded forms',layout:'Single-screen game shell'},privateContent:{progress:state.progress,camera:state.camera,zooms:state.zooms,pan:state.pan,science:state.science,trueSize:state.trueSize,sizeLinked:state.sizeLinked,unitPreferences:state.unitPreferences,rate:state.rate,lightRate:state.lightRate,focusBody:state.focusBody}})?.catch(()=>{});}
  function announce(text){q('.announcer').textContent=text;}
  function sample(){
    const et=flight.startEt+(flight.endEt-flight.startEt)*state.progress,c=ReplayModel.sampleAt(flight,et);
    const bodyKm=planetIds.map(id=>eph.state(id,et).r),km=Object.fromEntries(planetIds.map((id,i)=>[id,bodyKm[i].slice()]));
    km.sun=[0,0,0];
    const lunar=system.relative('moon',et);km.earth=km.earth.map((n,i)=>n-lunar[i]*lunarMassFraction);
    for(const m of moons){const local=system.relative(m.id,et);km[m.id]=local.map((n,i)=>n+km[m.parent][i]);}
    const positions=Object.fromEntries(Object.entries(km).map(([id,r])=>[id,r.slice(0,2).map(n=>n/AU)]));
    return {et,day:(et-flight.startEt)/86400,craft:c.r.slice(0,2).map(n=>n/AU),craftKm:c.r,velocity:c.v,bodies:planetIds.map(id=>positions[id]),bodyKm,km,positions};
  }
  function view(){const w=canvas.clientWidth,h=canvas.clientHeight,top=h<460?60:90,bottom=state.clear?70:q('.dock').offsetHeight+30;const available=Math.max(80,h-top-bottom);const scale=Math.min((w-70)/3.65,available/3.45)*state.zooms[state.camera];const f=sample();const centre=state.camera==='follow'?f.craft:state.camera==='free'?(state.focusBody?f.positions[state.focusBody]:state.pan):[0,0];return {w,h,bottom,scale,ox:w/2,oy:top+available/2,centre,f};}
  function starfield(w,h,dpr){const key=[w,h,dpr].join();if(bgKey===key)return;bgKey=key;bg=document.createElement('canvas');bg.width=Math.round(w*dpr);bg.height=Math.round(h*dpr);const b=bg.getContext('2d');b.scale(dpr,dpr);b.fillStyle='#080B13';b.fillRect(0,0,w,h);const haze=b.createRadialGradient(w*.48,h*.5,0,w*.5,h*.5,w*.75);haze.addColorStop(0,'#101C32');haze.addColorStop(.6,'#0B1020');haze.addColorStop(1,'#080B13');b.fillStyle=haze;b.fillRect(0,0,w,h);let seed=93;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};for(let i=0;i<Math.min(1100,w*h/700);i++){const x=rand()*w,y=rand()*h,r=rand(),bright=i%31===0;b.globalAlpha=bright?.82:.13+r*.42;b.fillStyle=i%7===0?'#A7C8FF':i%11===0?'#E8CFB8':'#DDE6F6';b.beginPath();b.arc(x,y,bright?1.15:.3+r*.55,0,Math.PI*2);b.fill();if(bright){b.globalAlpha=.08;b.beginPath();b.arc(x,y,3.5,0,Math.PI*2);b.fill();}}b.globalAlpha=1;}
  const textureConfig=Object.fromEntries(assets.map(a=>[a.id,a.displayFile]));
  const sphereCache=new Map(),sphereReady=new Set(),sphereRequests=new Map();
  let sphereWorker=null,sphereBusy=false;
  try {
    sphereWorker=new Worker('system-worker.js',{type:'module'});
    sphereWorker.onmessage=({data})=>{sphereCache.get(data.id)?.bitmap.close();sphereCache.set(data.id,data);sphereBusy=false;draw();};
    sphereWorker.onerror=()=>{sphereWorker?.terminate();sphereWorker=null;sphereBusy=false;};
    for(const [id,src] of Object.entries(textureConfig)){
      const image=new Image();image.onload=()=>{
        const c=document.createElement('canvas');c.width=image.width;c.height=image.height;
        const c2=c.getContext('2d');c2.drawImage(image,0,0);
        const pixels=c2.getImageData(0,0,c.width,c.height).data;
        sphereWorker?.postMessage({type:'map',id,w:c.width,h:c.height,pixels},[pixels.buffer]);sphereReady.add(id);draw();
      };image.src=src;
    }
  } catch {sphereWorker=null;}
  function sphere(id,x,y,r,light,et){
    const basis=system.basis(id,et)||neutralBasis,actualAxes=axesOf(id),max=Math.max(...actualAxes),axes=actualAxes.map(n=>n/max);
    const size=r>100?(state.playing?256:r>220?768:512):r>40?256:128;
    const solarWhite=state.science||state.trueSize;
    const key=[size,sphereReady.has(id),id==='sun'?solarWhite:'',...basis.flat().map(n=>Math.round(n*2000)),...light.map(n=>Math.round(n*1000))].join(':');
    const stored=sphereCache.get(id),colour=id==='io'?[224,197,130]:id==='titan'?[205,165,98]:[179,181,185];
    if(sphereWorker&&stored?.key!==key)sphereRequests.set(id,{type:'render',id,size,key,light,basis,axes,colour,solarWhite});
    if(id===state.focusBody)canvas.dataset.focusTexture=stored?.key===key?id:'';
    if(stored&&(id!=='sun'||stored.solarWhite===solarWhite)){ctx.drawImage(stored.bitmap,x-r,y-r,2*r,2*r);return;}
    ctx.fillStyle=id==='sun'?(solarWhite?'#FFF':'#FFD57C'):ReplayModel.BODIES[id]?.color||'#AAAAB0';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  }
  function sizeControls(){
    root.dataset.size=state.trueSize?'realistic':'enlarged';
    q('.scale-mode').textContent=state.trueSize?'Realistic size':'Worlds enlarged';
    const b=q('.world-size-toggle'),label=state.trueSize?'Use enlarged size':'Use realistic size';b.hidden=!!state.focusBody;
    b.setAttribute('aria-pressed',String(state.trueSize));b.setAttribute('aria-label',label);b.dataset.tooltip=label;
    q('[data-action=local-system]').hidden=!state.focusBody||!moons.some(m=>m.parent===state.focusBody);q('[data-action=local-system]').setAttribute('aria-pressed',String(state.focusSystem));
    q('[data-action=ring-guides]').hidden=!rings[parentOf(state.focusBody||'')];q('[data-action=ring-guides]').setAttribute('aria-pressed',String(state.guides));
    q('[data-action=body-info]').hidden=!state.focusBody;
    controls?.sync();const inspecting=inspectionId||state.focusBody;q('.inspection-caption').hidden=!inspecting;root.dataset.inspection=inspecting||'';
    if(inspecting){const id=inspecting,parent=parentOf(id),count=moons.filter(m=>m.parent===parent).length;
      q('.inspection-name').textContent=nameOf(id)+(state.focusSystem?' system':!state.focusBody?' · free view':'');
      q('.inspection-detail').textContent=!state.focusBody?'Drag to explore. Close to return.':id==='sun'?'Our star · Sol':state.focusSystem?count+' moons · distances to scale':(system.physical.bodies[id].PM?'Rotation follows journey time':'Spin not modelled')+(moons.some(m=>m.id===id)&&id!=='moon'?' · untextured shape':'');
    }
  }
  function inspectWorld(id,local=false){
    if(id==='solar'){inspectionReturn=null;inspectionId=null;state.focusBody=null;state.focusSystem=false;state.solar=true;state.camera='system';state.zooms.system=.052;sync();persist();announce('All eight planets. Positions and distances use the same scale.');return;}
    if(!allIds.includes(id))return;
    if(local)id=parentOf(id);
    // A chain of planet and moon visits shares one exit back to the original view.
    if(!inspectionReturn&&!state.focusBody)inspectionReturn={camera:state.camera,zooms:{...state.zooms},pan:state.pan.slice(),solar:state.solar,compact:root.clientHeight<560,deck:state.deck,mission:state.mission};
    inspectionId=id;
    if(root.clientHeight<560){state.deck=false;state.mission=false;}
    state.camera='free';state.focusBody=id;state.focusSystem=local;state.solar=false;
    sync();
    const v=view(),base=v.scale/state.zooms.free,room=Math.min(v.w*.29,(v.h-v.bottom-(v.h<460?60:90))*.35),f=sample();
    let extent=Math.max(...axesOf(id));
    if(!local&&rings[id])extent=Math.max(extent,(id==='saturn'?142000:id==='uranus'?55000:id==='neptune'?65000:135000));
    if(local)for(const m of moons.filter(m=>m.parent===id))extent=Math.max(extent,Math.hypot(...system.relative(m.id,f.et))*1.15);
    state.zooms.free=Math.max(.03,Math.min(500000000,room*AU/(extent*base)));state.pan=f.positions[id].slice();sync();persist();
    announce(nameOf(id)+(local?' and its moons.':' close-up.')+' Playback speed is unchanged.');
  }
  function closeInspection(){
    const hadPrevious=!!inspectionReturn;
    if(!inspectionReturn){fit();}else{const previous=inspectionReturn;inspectionReturn=null;inspectionId=null;state.focusBody=null;state.focusSystem=false;state.camera=previous.camera;state.zooms={...previous.zooms};state.pan=previous.pan.slice();state.solar=previous.solar;if(previous.compact){state.deck=previous.deck;state.mission=previous.mission;}sync();persist();}
    canvas.focus();announce(hadPrevious?'Close-up closed. Returned to your previous view.':'Close-up closed. Full flight route fitted.');
  }
  function releaseWorld(){if(state.focusBody){state.pan=sample().positions[state.focusBody].slice();state.focusBody=null;state.focusSystem=false;sizeControls();q('.pan').hidden=state.camera!=='free';}}
  function panWorld(direction){
    releaseWorld();const v=view();state.camera='free';
    state.pan[direction==='left'||direction==='right'?0:1]+=(direction==='left'||direction==='down'?-1:1)*55/v.scale;
    draw();persist();
  }
  function scaleReadout(scale){
    const kmPerPx=AU/scale,reading=rulerReading(kmPerPx,currentUnits(state));
    q('.scale-line').style.width=reading.pixels+'px';q('.scale-text').textContent=reading.text;
    q('.scale-text').setAttribute('aria-label',reading.spoken);q('.scale-text').dataset.km=String(reading.km);q('.scale-text').dataset.kmPerPx=String(kmPerPx);
  }
  function draw(){
    sphereRequests.clear();
    const v=view(),{w,h,bottom,scale,ox,oy,centre,f}=v;if(!w||!h)return;
    const dpr=Math.min(devicePixelRatio||1,2);
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
    ctx.setTransform(dpr,0,0,dpr,0,0);starfield(w,h,dpr);ctx.drawImage(bg,0,0,w,h);
    const screen=p=>[ox+(p[0]-centre[0])*scale,oy-(p[1]-centre[1])*scale];
    // Every body, ruler and route uses this same uniform projection. Only enlarged discs differ.
    function line(points,color,width,dash=[]){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.beginPath();points.forEach((p,i)=>{const[x,y]=screen(p);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.stroke();ctx.setLineDash([]);}
    if(scale<5000)for(const points of orbitLines)line(points,'#354258',.7);
    const projectKm=r=>screen([r[0]/AU,r[1]/AU]);
    function trajectory(start,end,color,dash){
      ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.setLineDash(dash);
      for(let i=0;i<flight.samples.length-1;i++){
        const a=flight.samples[i],b=flight.samples[i+1],lo=Math.max(start,a.t),hi=Math.min(end,b.t);if(hi<=lo)continue;
        const p=ReplayModel.sampleAt(flight,lo),q2=ReplayModel.sampleAt(flight,hi),dt=hi-lo;
        const c=[projectKm(p.r),projectKm(p.r.map((n,k)=>n+p.v[k]*dt/3)),projectKm(q2.r.map((n,k)=>n-q2.v[k]*dt/3)),projectKm(q2.r)];
        // A cubic remains inside its control hull, so offscreen arcs can be rejected safely.
        if(Math.max(...c.map(p=>p[0]))< -20||Math.min(...c.map(p=>p[0]))>w+20||Math.max(...c.map(p=>p[1]))< -20||Math.min(...c.map(p=>p[1]))>h+20)continue;
        ctx.moveTo(...c[0]);ctx.bezierCurveTo(...c[1],...c[2],...c[3]);
      }ctx.stroke();ctx.setLineDash([]);
    }
    trajectory(f.et,flight.endEt,'#B0BBCB',[1.8,6]);trajectory(flight.startEt,f.et,'#FFB000',[]);
    if(state.inspect)line([f.craft,f.bodies[3]],'#A7D5F1',1,[8,4,1,4]);
    const labels=[],geometry=[];
    const focusedParent=parentOf(state.focusBody||'');
    if(state.focusSystem){
      for(const m of moons.filter(m=>m.parent===focusedParent)){
        const duration=Math.min(m.periodDays*86400,flight.endEt-flight.startEt),start=Math.min(f.et,flight.endEt-duration),parent=f.km[m.parent];
        const path=Array.from({length:129},(_,i)=>system.relative(m.id,start+duration*i/128).map((n,k)=>(n+parent[k])/AU));
        line(path,'#879AB53D',.8,[2,5]);
      }
    }
    const ordered=[...allIds].sort((a,b)=>f.km[a][2]-f.km[b][2]);
    for(const id of ordered){
      const i=planetIds.indexOf(id),isStar=id==='sun',isMoon=i<0&&!isStar,p=f.positions[id],[x,y]=screen(p),physical=radiusOf(id)/AU*scale;
      const bound=Math.max(...axesOf(id))/AU*scale,r=state.trueSize?bound:Math.max(bound,(isStar?11:isMoon?3:[6,12,21,17,26,23,18,18][i])*Math.pow(Math.min(5,state.zooms[state.camera]),.24));
      const basis=system.basis(id,f.et),length=Math.hypot(...f.km[id]),light=isStar?[0,0,1]:f.km[id].map(n=>-n/length);
      const body={id,x,y,r,physical,axesKm:axesOf(id),basis,km:f.km[id],selectable:false};geometry.push(body);
      const ringExtent=(rings[id]?.at(-1)?.[2]||0)/AU*scale,extent=Math.max(r,ringExtent);
      if(x+extent< -20||x-extent>w+20||y+extent< -20||y-extent>h+20)continue;
      if(isMoon&&state.focusBody!==id&&focusedParent!==parentOf(id)&&scale<3000)continue;
      body.selectable=true;
      const solarWhite=state.science||state.trueSize,solarPhase=reduced.matches?0:solarMotion;
      if(isStar){drawSolarAtmosphere(ctx,x,y,r,basis,solarWhite,solarPhase);canvas.dataset.solarAppearance=solarWhite?'white':'gold';canvas.dataset.solarMotion=String(solarPhase);}
      drawRings(ctx,id,[x,y],scale,basis,false,state.guides,light);
      if(r>.1){if(isStar&&r<30){ctx.fillStyle=solarWhite?'#FFF':'#FFD57C';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}else sphere(id,x,y,r,light,f.et);}
      if(isStar)drawSolarBrightening(ctx,x,y,r,basis,solarWhite,solarPhase,reduced.matches);
      drawRings(ctx,id,[x,y],scale,basis,true,state.guides,light);
      if((id==='earth'||id==='mars')&&r<80){ctx.strokeStyle=id==='mars'?'#D6D9E3':'#7F9BBB';ctx.lineWidth=1;ctx.setLineDash(id==='mars'?[3,5]:[]);ctx.beginPath();ctx.arc(x,y,Math.max(5,r+5),0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
      if(r<2){ctx.strokeStyle=isMoon?'#CDD4DF':'#E8E6E1';ctx.beginPath();ctx.arc(x,y,isMoon?2.2:3,0,Math.PI*2);ctx.stroke();}
      if(r<80&&(id!==state.focusBody||state.focusSystem))labels.push({id,text:nameOf(id),x:x+Math.max(r,5)+10,y:y+4,bodyX:x,bodyY:y,r});
    }
    const [cx,cy]=screen(f.craft),inside=state.trueSize&&allIds.some(id=>occludes(f.craftKm,f.km[id],axesOf(id),system.basis(id,f.et)||neutralBasis));
    if(!inside&&cx> -30&&cx<w+30&&cy> -30&&cy<h+30){
      ctx.save();ctx.translate(cx,cy);ctx.rotate(Math.atan2(-f.velocity[1],f.velocity[0])+Math.PI/2);
      ctx.shadowColor='#FFB000';ctx.shadowBlur=8;ctx.fillStyle='#FFB000';ctx.beginPath();ctx.moveTo(-3,5);ctx.lineTo(0,state.playing?16:11);ctx.lineTo(3,5);ctx.fill();ctx.shadowBlur=0;
      ctx.fillStyle='#E8E6E1';ctx.beginPath();ctx.moveTo(0,-9);ctx.quadraticCurveTo(6,-3,5,5);ctx.lineTo(-5,5);ctx.quadraticCurveTo(-6,-3,0,-9);ctx.fill();ctx.fillStyle='#FFB000';ctx.fillRect(-2,-3,4,5);ctx.restore();
    }
    ctx.font='12px "IBM Plex Mono",monospace';const occupied=[],canvasRect=canvas.getBoundingClientRect();
    const blocked=qa('.map-note,.zoom,.pan,.inspection-heading,[data-close-inspection],.clear-view,.mission-deck,.world-popover').filter(n=>!state.clear&&n.offsetWidth&&!n.hidden).map(n=>{const r=n.getBoundingClientRect();return {x:r.x-canvasRect.x-5,y:r.y-canvasRect.y-5,w:r.width+10,h:r.height+10};});
    const intersects=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
    labels.forEach(l=>{
      const width=ctx.measureText(l.text).width,gap=Math.max(l.r,4)+8;
      const candidates=[[l.bodyX+gap,l.bodyY+4],[l.bodyX-width/2,l.bodyY+gap+13],[l.bodyX-width/2,l.bodyY-gap-5],[l.bodyX-gap-width,l.bodyY+4]];
      for(const [x,y] of candidates){const box={id:l.id,x:x-3,y:y-13,w:width+6,h:17};if(x<12||x+width>w-12||y<88||y>h-bottom-6||[...blocked,...occupied].some(b=>intersects(box,b)))continue;
        occupied.push(box);ctx.fillStyle='#E8E6E1';ctx.shadowColor='#080B13';ctx.shadowBlur=5;ctx.fillText(l.text,x,y);ctx.shadowBlur=0;break;
      }
    });
    if(!inside&&cx>20&&cx<w-70&&cy>95&&cy<h-bottom){ctx.fillStyle='#FFC24D';ctx.font='11px "IBM Plex Mono",monospace';ctx.fillText('you',cx+13,cy-15);}
    if(state.camera==='follow'){
      const t=screen(f.bodies[3]);if(t[0]<30||t[0]>w-70||t[1]<95||t[1]>h-bottom){const tx=Math.max(28,Math.min(w-90,t[0])),ty=Math.max(105,Math.min(h-bottom-10,t[1]));const arrow=['→','↘','↓','↙','←','↖','↑','↗'][(Math.round(Math.atan2(t[1]-oy,t[0]-ox)/(Math.PI/4))+8)%8];ctx.fillStyle='#E8E6E1';ctx.font='11px "IBM Plex Mono",monospace';ctx.fillText('Mars '+arrow,tx,ty);}
    }
    const distance=Math.hypot(f.craftKm[0]-f.bodyKm[3][0],f.craftKm[1]-f.bodyKm[3][1]);
    const reading=distanceReading(distance,currentUnits(state));q('.distance-value').textContent=reading.value;q('.distance-unit').textContent=reading.short;
    q('#distance-description').textContent=reading.spoken+' to the centre of Mars';q('.distance-value').dataset.km=String(distance);
    q('.trip-day').textContent=String(Math.round(f.day));q('.deck-time').textContent=Math.round(f.day)+' / 303 d';q('.gauge-fill').style.strokeDashoffset=String(100.531*(1-state.progress));
    q('.trip-gauge').setAttribute('aria-label',Math.round(state.progress*100)+' percent of journey time elapsed');q('.time-label').textContent='Day '+Math.round(f.day)+' / 303';
    q('.timeline input').value=String(Math.round(state.progress*1000));q('.timeline input').setAttribute('aria-valuetext','Day '+Math.round(f.day)+' of 303');scaleReadout(scale);
    controls?.draw(geometry,occupied);controls?.updateSpeed();
    canvas.dataset.geometry=JSON.stringify({et:f.et,pathKm:replayClock.distanceAt(f.et),scale,centre,craft:[cx,cy],bodies:geometry});
    if(sphereWorker&&!sphereBusy&&sphereRequests.size){sphereBusy=true;sphereWorker.postMessage(sphereRequests.get(state.focusBody)||sphereRequests.values().next().value);}
  }

  const pageNames=['Journey','Launch','Flight'];
  function syncPages(){qa('.science-page').forEach(p=>p.hidden=!state.science);q('.deck-pagination').hidden=!state.science;if(!state.science)state.page=0;qa('.instrument-page').forEach(p=>{const inactive=Number(p.dataset.page)!==state.page;p.inert=inactive;p.setAttribute('aria-hidden',String(inactive));});q('[data-action=deck-prev]').setAttribute('aria-disabled',String(state.page===0));q('[data-action=deck-next]').setAttribute('aria-disabled',String(state.page===2));q('.deck-page-name').innerHTML=pageNames[state.page]+' <span class="muted">'+(state.page+1)+' / 3</span>';}
  function goPage(index){state.page=Math.max(0,Math.min(state.science?2:0,index));syncPages();q('.cockpit-pages').scrollTo({left:q('.cockpit-pages').clientWidth*state.page,behavior:reduced.matches?'instant':'smooth'});announce(pageNames[state.page]+' instruments. Page '+(state.page+1)+' of 3.');}
  function sync(){root.dataset.deck=String(state.deck);q('.cockpit-body').hidden=!state.deck;q('[data-action=deck]').setAttribute('aria-expanded',String(state.deck));syncPages();qa('.deck-modes [data-detail]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.detail==='science')===state.science)));sizeControls();q('[data-action=ruler]').setAttribute('aria-pressed',String(state.inspect));q('.route-phase').textContent=state.progress===1?'Complete':state.playing?'In flight':'Paused';root.dataset.playing=String(state.playing);root.dataset.clear=String(state.clear);qa('[data-camera]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.camera===state.camera)));q('.pan').hidden=state.camera!=='free'||!!state.focusBody;q('.play-label').textContent=state.playing?'Pause':'Play';q('.quiet-play').textContent=state.playing?'Pause':'Play';q('.state-label').textContent=state.playing?'On our way.':state.progress===1?'Hello, Mars.':'Paused. Space can wait.';q('.hud').hidden=state.clear;q('.quiet-play').hidden=!state.clear;q('.clear-view span').textContent=state.clear?'Show UI':'Hide UI';q('.clear-view').setAttribute('aria-pressed',String(state.clear));draw();}
  function tick(now){if(!state.playing)return;const dt=state.last?Math.min(.08,(now-state.last)/1000):0;state.last=now;if(!reduced.matches)solarMotion+=dt;state.progress=replayClock.advance(state,dt);draw();if(state.progress<1)state.raf=requestAnimationFrame(tick);else{pause();openPanel('result');cue(72);announce('Mars reached. The replay is complete.');persist();}}
  function pause(){state.playing=false;state.last=0;cancelAnimationFrame(state.raf);stopMusic();sync();}
  function play(){if(state.progress>=1)state.progress=0;state.playing=true;state.last=0;cancelAnimationFrame(state.raf);state.raf=requestAnimationFrame(tick);if(state.music)startMusic();sync();}
  function togglePlay(){if(state.opened)return;if(state.playing)pause();else play();cue(state.playing?60:55);announce(state.playing?'Journey playing.':'Journey paused. Camera controls remain available.');persist();}
  function camera(mode){releaseWorld();if(mode!=='free'){if(inspectionReturn)state.zooms.free=inspectionReturn.zooms.free;inspectionReturn=null;inspectionId=null;}state.zooms[state.camera]=Math.max(.03,Math.min(500000000,state.zooms[state.camera]));if(mode==='free'&&state.camera!=='free'){state.pan=state.camera==='follow'?sample().craft.slice():[0,0];state.zooms.free=state.zooms[state.camera];}state.camera=mode;sync();announce(mode==='follow'?'Following your craft.':mode==='system'?'System view. Earth and Mars are highlighted.':'Free camera. Drag or use the pan buttons.');persist();}
  function fit(){if(inspectionReturn)state.zooms.free=inspectionReturn.zooms.free;inspectionReturn=null;inspectionId=null;state.focusBody=null;state.focusSystem=false;state.solar=false;state.camera='system';state.zooms.system=1;state.pan=[0,0];sync();persist();}
  const panels={
    worlds:{title:'Worlds',body:()=>controls.worldMenu()},
    body:{title:'World notes',body:()=>{const id=state.focusBody,parent=parentOf(id),p=system.physical.bodies[id],children=moons.filter(m=>m.parent===parent);return '<h3>'+nameOf(id)+'</h3><p class="muted">'+(p.PM?'Rotation and pole: NASA / IAU reference model. One clock drives the surface and the orbit.':'No reliable spin model is included for this body. Its shape is not animated.')+'</p><p class="section">'+(children.length?nameOf(parent)+' has '+children.length+' major moons in this study.':'No moons orbit this planet.')+'</p><p class="muted">'+children.map(m=>nameOf(m.id)).join(' · ')+'</p>'+(rings[parent]?'<h3 class="section">Rings</h3><p class="muted">'+[...new Set(rings[parent].map(r=>r[0]))].join(' · ')+'</p><p class="muted section">Ring guides are dashed location aids. Real ring widths and distances do not grow when guides are enabled.</p>':'<p class="muted section">No ring system.</p>')+(parent==='saturn'?'<p class="muted section">Phoebe ring: an enormous tilted dust cloud. Catalogue only for now; its inclined volume is not drawn. Minor moon-associated arcs are not resolved.</p>':'')+(parent==='neptune'?'<p class="muted section">Adams arcs have no dated longitude model here. Arago, Galatea dust and Le Verrier are guide locations where widths are unknown or upper limits.</p>':'')+'<p class="muted section">Top-down view of the ecliptic. Small circles are markers. Untextured moons show reference shapes, not invented surface maps.</p>'; }},
    menu:{title:'Flight menu',body:()=>`<div class="menu-list"><button data-panel="launch">Mission deck <span>→</span></button><button data-panel="worlds">Worlds <span>→</span></button><button data-panel="details">Flight deck <span>${state.science?'Scientific':'Simplified'} →</span></button><div class="menu-sound-row"><button class="sound-button" data-action="sound" aria-pressed="${state.music||state.effects}">${state.music||state.effects?'Sound on':'Sound off'}</button><button data-panel="sound">Audio settings <span>→</span></button></div><button data-panel="help">Controls <span>→</span></button><button data-panel="credits">About this study <span>→</span></button></div><label class="option link-size-option"><span>Link world sizes<br><span class="muted small">Simplified enlarges worlds.<br>Scientific uses realistic sizes.</span></span><input type="checkbox" data-setting="sizeLinked" ${state.sizeLinked?'checked':''}></label>`},
    launch:{title:'First light',body:()=>`<div class="launch-art" aria-hidden="true"><span class="orb"></span><span class="orb mars"></span></div><h3>Earth → Mars</h3><p class="muted section">A small departure.<br>A very different neighbourhood.</p><dl class="readings"><div><dt>Launch window</dt><dd>2 Nov 2026</dd></div><div><dt>Destination</dt><dd>Mars</dd></div></dl><div class="choice" role="group" aria-label="Detail level"><button data-detail="simple" aria-pressed="${!state.science}" aria-label="Simplified" data-tooltip="Simplified"><span class="mode-icon" aria-hidden="true"><i data-lucide="smile"></i></span><span class="mode-label">Simplified</span></button><button data-detail="science" aria-pressed="${state.science}" aria-label="Scientific" data-tooltip="Scientific"><span class="mode-icon" aria-hidden="true"><i data-lucide="orbit"></i></span><span class="mode-label">Scientific</span></button></div>${state.science?`<dl class="readings"><div><dt>Launch cost Δv</dt><dd>3.62 km/s</dd></div><div><dt>Flight plane</dt><dd>2D</dd></div></dl>`:''}<p class="small muted section">Recorded flight for this interface study.</p>`},
    sound:{title:'A little atmosphere',body:()=>`<p class="muted">Warm plucks. Soft glass. A little lift when you leave.</p><label class="option"><span>Music<br><span class="muted small">Quiet layers during travel.</span></span><input type="checkbox" data-setting="music" ${state.music?'checked':''}></label><label class="option"><span>Effects<br><span class="muted small">Small replies to your actions.</span></span><input type="checkbox" data-setting="effects" ${state.effects?'checked':''}></label><div class="section"><label for="shell-volume">Volume</label><input id="shell-volume" class="volume" type="range" min="0" max="100" value="${Math.round(state.volume*100)}" aria-label="Sound volume"></div><button class="section" data-action="audition">Hear the sound sketch</button><p class="small muted section">Sound is optional. Every cue also appears on screen.</p>`},
    help:{title:'Make yourself at home',body:()=>`<div class="help-row"><strong>Play / Pause</strong><p class="muted">Stop anywhere. The camera still works.</p></div><div class="help-row"><strong>Replay speed</strong><p class="muted">Use the minus and fast-forward buttons. 1× plays the recorded trip in 24 seconds; 2×, 3× and 4× multiply that pace. The slower steps are Real time, Drift (1 min/s), Slow (1 hour/s) and Cruise (1 day/s). Scientific shows actual time per second in Metric and Imperial. Scientific with Light-time offers Real time, 0.25c, 0.5c, 0.75c, 1c, 2c, 5c, 10c, 30c, 100c and 300c. At 1c the replay covers one light-second along the recorded route per real second. The recorded physical flight is unchanged. This c pace is remembered separately; Simplified restores your temporal replay pace. Double-click or double-tap anywhere on the speed pill for real time. With a keyboard, focus the central speed readout and press Enter or Space.</p></div><div class="help-row"><strong>Mission deck</strong><p class="muted">Tap Earth → Mars to expand the top deck. It never pauses the flight. Escape or the same button closes it. Menus pause the replay.</p></div><div class="help-row"><strong>Follow</strong><p class="muted">Stay with your craft. Zoom in for a closer look.</p></div><div class="help-row"><strong>System</strong><p class="muted">See your route, Earth and Mars together.</p></div><div class="help-row"><strong>Free</strong><p class="muted">Drag the sky or use the four pan buttons. Focus the map and use arrow keys to pan. Scroll or pinch to zoom. In very small windows, collapse the deck to reveal pan buttons.</p></div><div class="help-row"><strong>World sizes</strong><p class="muted">The button beside the scale bar switches between enlarged and realistic planets. Distances stay to scale. Tap a planet, moon or the Sun to open its actions, then choose View close-up. Moons appears only for worlds with major moons. The size switch is hidden while a world is focused. Menu → Worlds offers the same destinations by keyboard. The world name appears at the top left. The X at the top right restores your previous camera and zoom. Escape does the same. Use the camera controls below to change view, or Fit full route to frame the system. You can keep playing while inspecting a planet.</p></div><div class="help-row"><strong>Hide UI</strong><p class="muted">Hide the HUD. Show UI and Play / Pause stay within reach.</p></div><div class="help-row"><strong>Units</strong><p class="muted">Tap the unit icon in the centre of the deck to cycle Metric, Imperial and Light-time. It shows km, mi or a plain light wave beside the name of your current units. The tooltip names the next choice. Enter or Space also cycles units, including with the deck collapsed. Each mode remembers your choice. Simplified starts with Light-time; Scientific starts with Metric. Light-time expresses distance as light travel time, not time aboard your craft. Flight-dynamics readouts stay metric in Light-time. Imperial converts speeds and C3 too.</p></div><div class="help-row"><strong>Instrument pages</strong><p class="muted">Scientific mode adds Launch and Flight pages. Swipe sideways, use the arrows, or focus the instruments and press Left / Right. The map stays active.</p></div><div class="help-row"><strong>Keyboard</strong><p class="muted">Tab moves through controls. Space plays or pauses when a form field is not focused. Escape closes a panel.</p></div><p class="small muted section">Reduced motion removes panel animation and automatic camera motion. Follow remains an explicit choice.</p>`},
    credits:{title:'About this study',body:()=>`<p>Pocket observatory's playfulness, with Deep field's rounded forms and open sky.</p><div class="help-row"><strong>Flight</strong><p class="muted">Recorded from the game's unchanged First Light solution. The original simulation samples and planet calculations drive this view. Distances are linear in the game’s 2D plane. Realistic size uses published body shapes and radii; craft and tiny-world symbols are markers. The departure approximation starts at the Earth-Moon barycentre and capture ends outside Mars. Low-orbit flight is not modelled here.</p></div><div class="help-row"><strong>Worlds and stars</strong><p class="muted">Maps by <a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noopener">Solar System Scope / INOVE</a>, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>. Resized to 1k, projected onto spheres and lit here. Axes and rotation follow NASA NAIF pck00011. Cloud maps are static illustrations, not current weather. Background stars remain decorative. The Sun uses the NAIF radius and reference rotation. Scientific or realistic size shows a white photosphere; Simplified with enlarged worlds uses gold. Granulation, sunspots, prominences and localized flare brightening are procedural illustrations. Their contrast is enhanced so they can be seen together. Activity animates at a gentle visual pace while playing, not at measured solar timescales. Pause freezes activity. Reduced motion stops decorative shape changes and brightening; reference rotation still follows the journey. See <a href="https://science.nasa.gov/reference/the-heliopedia/" target="_blank" rel="noopener">NASA on the photosphere</a> and <a href="https://www.nasa.gov/image-article/what-solar-prominence/" target="_blank" rel="noopener">solar prominences</a>.</p></div><div class="help-row"><strong>Moons, axes and rings</strong><p class="muted">24 major moons use cached geometric <a href="https://ssd.jpl.nasa.gov/horizons/" target="_blank" rel="noopener">JPL Horizons</a> states. Local interpolation is checked below 1 km, below 0.1 km for Phobos and Deimos. Planets retain the game's approximate Kepler model. Earth is offset from the Earth-Moon barycentre using DE440 masses. This is a top-down ecliptic projection, not a navigational ephemeris.</p><p class="muted">Axes and spin use <a href="https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc" target="_blank" rel="noopener">NASA NAIF / IAU</a>. Hyperion and Nereid have no spin model here. Moon imagery: NASA's Scientific Visualization Studio / LRO / LROC. Other moons use untextured reference shapes.</p><p class="muted">Ring dimensions: <a href="https://pds-rings.seti.org/" target="_blank" rel="noopener">NASA PDS Ring-Moon Systems Node</a>. Mean circular bands and dust envelopes simplify eccentric structure. Ring brightness is illustrative. Neptune arcs and Saturn's inclined Phoebe dust ring are catalogued, not drawn with invented geometry.</p></div><div class="help-row"><strong>Type</strong><p class="muted">IBM Plex Mono. Copyright 2017 IBM Corp. OFL-1.1.</p></div><div class="help-row"><strong>Sound</strong><p class="muted">Original procedural sketch. No soundtrack samples.</p></div>`},
    result:{title:'Hello, Mars.',body:()=>`<div class="orb result-orb" aria-hidden="true"></div><p>303 days. One small craft.<br>Route complete.</p><div class="menu-list section"><button data-action="replay">Replay journey <span>↗</span></button><button data-panel="details">Flight deck <span>→</span></button></div>`}
  };
  function renderPanel(){const p=panels[state.opened];if(!p)return;q('#shell-panel-title').textContent=p.title;q('.panel-body').innerHTML=p.body();q('.panel-body').scrollTop=0;q('[data-action=return]').textContent=state.opened==='launch'?'Replay this flight':state.opened==='result'?'Look around':state.wasPlaying?'Resume journey':'Back to flight';q('#shell-panel-state').textContent=state.opened==='result'?'Route complete':'Journey paused';controls?.sync();globalThis.lucide?.createIcons();}
  function openPanel(name,source){if(!state.opened){state.wasPlaying=state.playing;opener=source||document.activeElement;drag=null;pointers.clear();pause();canvas.inert=true;q('.hud').inert=true;q('.clear-view').inert=true;q('.quiet-play').inert=true;}state.opened=name;q('.overlay').hidden=false;renderPanel();q('.close-panel').focus();}
  function closePanel(resume=state.wasPlaying){state.opened=null;q('.overlay').hidden=true;canvas.inert=false;q('.hud').inert=false;q('.clear-view').inert=false;q('.quiet-play').inert=false;state.wasPlaying=false;stopMusic();if(opener?.isConnected&&!opener.closest('[hidden]'))opener.focus();else q('.clear-view').focus();if(resume)play();else sync();persist();}
  async function audioReady(){if(!sound){const C=window.AudioContext||window.webkitAudioContext;sound=new C();soundBus=sound.createGain();soundBus.gain.value=state.volume;soundBus.connect(sound.destination);}if(sound.state!=='running')await sound.resume();return sound;}
  function tone(m,start,len,gain,type='sine'){if(!sound||sound.state!=='running')return;notes=notes.filter(n=>n.end>sound.currentTime);if(notes.length>=8)return;const osc=sound.createOscillator(),env=sound.createGain();osc.type=type;osc.frequency.value=440*2**((m-69)/12);env.gain.setValueAtTime(.0001,start);env.gain.exponentialRampToValueAtTime(Math.max(.0001,gain),start+.025);env.gain.exponentialRampToValueAtTime(.0001,start+len);osc.connect(env);env.connect(soundBus);osc.start(start);osc.stop(start+len+.03);notes.push({osc,env,end:start+len+.03});osc.onended=()=>{osc.disconnect();env.disconnect();};}
  function stopMusic(){clearTimeout(musicTimer);musicTimer=null;if(sound){for(const n of notes){try{n.env.gain.cancelScheduledValues(sound.currentTime);n.env.gain.setTargetAtTime(.0001,sound.currentTime,.025);n.osc.stop(sound.currentTime+.12);}catch{}}}notes=[];}
  async function startMusic(audition=false){if(!state.music&&!audition)return;try{await audioReady();stopMusic();let step=0;const melody=[48,55,60,62,55,64,60,57];const beat=()=>{if(!sound||(!state.playing&&!audition))return;const t=sound.currentTime+.02;tone(melody[step%8],t,.7,.055,'triangle');if(step%4===0){tone(36,t,2.6,.025);tone(55,t+.08,2.4,.012);}step++;if(audition&&step===8)return;musicTimer=setTimeout(beat,60000/76);};beat();}catch{state.music=false;const toggle=q('[data-setting=music]');if(toggle)toggle.checked=false;sync();announce('Sound is unavailable. All controls still work.');}}
  function cue(m=60){if(!state.effects||!sound||performance.now()-lastCue<80)return;lastCue=performance.now();tone(m,sound.currentTime+.005,.14,.035);}
  root.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b||b.disabled||b.getAttribute('aria-disabled')==='true')return;if(b.dataset.panel){if(b.dataset.panel==='launch'){if(state.opened)closePanel();controls.toggleMission(true);q('.mission').focus();}else if(b.dataset.panel==='details'){if(state.opened)closePanel();state.deck=true;sync();q('[data-action=deck]').focus();announce('Flight deck open. The map remains interactive.');}else openPanel(b.dataset.panel,b);return;}if(b.classList.contains('close-panel')){closePanel();return;}if(b.dataset.camera){camera(b.dataset.camera);cue();return;}if(b.dataset.zoom){state.zooms[state.camera]=Math.max(.03,Math.min(500000000,state.zooms[state.camera]*(b.dataset.zoom==='in'?1.25:.8)));draw();persist();return;}if(b.dataset.pan){panWorld(b.dataset.pan);return;}if(b.dataset.detail){state.science=b.dataset.detail==='science';state.last=0;if(state.sizeLinked)state.trueSize=state.science;if(state.opened){renderPanel();q(`.panel [data-detail=${b.dataset.detail}]`).focus();}else{sync();}persist();return;}switch(b.dataset.action){case'local-system':inspectWorld(state.focusBody,!state.focusSystem);break;case'ring-guides':state.guides=!state.guides;sync();announce(state.guides?'Dashed ring guides shown. Guide width is symbolic.':'Ring guides hidden.');break;case'body-info':controls.showWorld(state.focusBody,true);break;case'deck-prev':goPage(state.page-1);break;case'deck-next':goPage(state.page+1);break;case'deck':state.deck=!state.deck;sync();if(state.deck&&state.mission&&root.clientHeight-q('.dock').offsetHeight-q('.mission-deck').offsetHeight<180)controls.toggleMission(false);announce(state.deck?'Flight deck open. The map remains interactive.':'Flight deck collapsed.');break;case'ruler':state.inspect=!state.inspect;sync();announce(state.inspect?'Distance ruler shown between your craft and Mars.':'Distance ruler hidden.');break;case'true-scale':state.trueSize=!state.trueSize;state.sizeLinked=false;sync();announce(state.trueSize?'Realistic planet sizes. Distances are unchanged. Craft and small-world markers remain visible.':'Worlds enlarged. Distances are unchanged.');persist();break;case'play':togglePlay();break;case'clear':state.clear=!state.clear;sync();announce(state.clear?'Controls hidden. Show UI and playback remain available.':'Controls shown.');break;case'return':if(state.opened==='launch'){state.progress=0;closePanel(true);}else closePanel();break;case'fit':fit();announce('Full route fitted.');break;case'replay':state.progress=0;closePanel(true);break;case'sound':{const enable=!(state.music||state.effects);state.music=state.effects=enable;if(enable){try{await audioReady();startMusic(!state.playing);announce('Sound on.');}catch{state.music=state.effects=false;announce('Sound is unavailable. All controls still work.');}}else{stopMusic();announce('Sound off.');}sync();break;}case'audition':startMusic(true);announce('Playing the combined sound sketch.');break;}});
  root.addEventListener('change',async e=>{const key=e.target.dataset.setting;if(key){state[key]=e.target.checked;if(key==='sizeLinked'&&state.sizeLinked)state.trueSize=state.science;if(key==='music'){if(state.music)startMusic(true);else stopMusic();}if(key==='effects'&&state.effects){try{await audioReady();cue(67);}catch{state.effects=false;e.target.checked=false;announce('Sound is unavailable.');}}sync();persist();}});
  q('.timeline input').addEventListener('input',e=>{const progress=Number(e.target.value)/1000;pause();state.progress=progress;draw();persist();});
  root.addEventListener('input',e=>{if(e.target.id==='shell-volume'){state.volume=Number(e.target.value)/100;if(soundBus)soundBus.gain.setTargetAtTime(state.volume,sound.currentTime,.02);}if(e.target.id==='panel-journey'){state.progress=Number(e.target.value)/1000;q('.panel-day').textContent='Day '+Math.round(sample().day);q('.elapsed-time').textContent=Math.round(sample().day)+' days';e.target.setAttribute('aria-valuetext','Day '+Math.round(sample().day)+' of 303');draw();persist();}});
  q('.overlay').addEventListener('click',e=>{if(e.target===q('.overlay'))closePanel();});
  document.addEventListener('keydown',e=>{if(!root.contains(e.target)&&e.target!==document.body)return;if(state.opened){if(e.key==='Escape'){e.preventDefault();closePanel();}if(e.key==='Tab'){const items=[...q('.panel').querySelectorAll('button,input,select,summary,a[href],[tabindex="0"]')].filter(n=>!n.disabled&&!n.hidden),first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}return;}if(e.key==='Escape'){e.preventDefault();if(state.clear){state.clear=false;sync();}else if(inspectionId||state.focusBody)closeInspection();else openPanel('menu',document.activeElement);}if(e.code==='Space'&&!e.target.closest('button,input,select,textarea')){e.preventDefault();togglePlay();}});
  let pageSettled;
  q('.cockpit-pages').addEventListener('scroll',()=>{clearTimeout(pageSettled);pageSettled=setTimeout(()=>{const index=Math.round(q('.cockpit-pages').scrollLeft/Math.max(1,q('.cockpit-pages').clientWidth));if(index!==state.page){state.page=Math.max(0,Math.min(state.science?2:0,index));syncPages();announce(pageNames[state.page]+' instruments. Page '+(state.page+1)+' of 3.');}},140);});
  q('.cockpit-body').addEventListener('keydown',e=>{if(state.science&&['ArrowLeft','ArrowRight'].includes(e.key)&&!e.target.closest('button,input,select')){e.preventDefault();goPage(state.page+(e.key==='ArrowRight'?1:-1));}});
  new ResizeObserver(()=>{const el=q('.cockpit-pages');if(el.clientWidth)el.scrollTo({left:el.clientWidth*state.page,behavior:'instant'});}).observe(q('.cockpit-pages'));
  canvas.tabIndex=0;canvas.setAttribute('aria-description','Arrow keys pan in Free view. Plus and minus zoom. Planet sizes can be changed beside the scale bar.');
  canvas.addEventListener('keydown',e=>{const directions={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};if(directions[e.key]){e.preventDefault();if(state.camera!=='free')camera('free');panWorld(directions[e.key]);}else if(e.key==='+'||e.key==='='||e.key==='-'){e.preventDefault();state.zooms[state.camera]=Math.max(.03,Math.min(500000000,state.zooms[state.camera]*(e.key==='-'?.8:1.25)));draw();persist();}});
  const pointers=new Map();let pinch=null,tapSuppressed=false;
  function pointerDown(e){if(state.opened)return;if(!pointers.size)tapSuppressed=false;pointers.set(e.pointerId,[e.clientX,e.clientY]);canvas.setPointerCapture(e.pointerId);if(pointers.size===2){tapSuppressed=true;const[a,b]=[...pointers.values()];pinch={distance:Math.hypot(a[0]-b[0],a[1]-b[1]),zoom:state.zooms[state.camera]};drag=null;}else{const v=view();drag={x:e.clientX,y:e.clientY,centre:v.centre.slice(),scale:v.scale,moved:false};}}
  canvas.addEventListener('pointerdown',pointerDown);
  canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===2&&pinch){const[a,b]=[...pointers.values()];state.zooms[state.camera]=Math.max(.03,Math.min(500000000,pinch.zoom*Math.hypot(a[0]-b[0],a[1]-b[1])/Math.max(1,pinch.distance)));draw();return;}if(!drag)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<4&&!drag.moved)return;if(!drag.moved){tapSuppressed=true;controls?.close();releaseWorld();state.zooms.free=state.zooms[state.camera];state.camera='free';drag.moved=true;sync();}state.pan=[drag.centre[0]-(e.clientX-drag.x)/drag.scale,drag.centre[1]+(e.clientY-drag.y)/drag.scale];draw();});
  function endPointer(e){const tap=e.type==='pointerup'&&!tapSuppressed&&drag&&!drag.moved&&pointers.size===1;pointers.delete(e.pointerId);drag=null;pinch=null;if(tap){const r=canvas.getBoundingClientRect();controls.hit(e.clientX-r.x,e.clientY-r.y);}persist();}canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',endPointer);
  canvas.addEventListener('wheel',e=>{if(state.opened)return;e.preventDefault();state.zooms[state.camera]=Math.max(.03,Math.min(500000000,state.zooms[state.camera]*Math.exp(-e.deltaY*.001)));draw();persist();},{passive:false});
  const resizing=new ResizeObserver(()=>{root.style.setProperty('--deck-bottom',((state.clear?40:q('.dock').offsetHeight)+30)+'px');root.style.setProperty('--mission-height',(state.mission?q('.mission-deck').offsetHeight:0)+'px');draw();});resizing.observe(canvas);resizing.observe(q('.dock'));document.fonts?.ready.then(draw);document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();stopMusic();}});window.addEventListener('openai:set_globals',e=>{restore(e.detail?.globals?.widgetState?.privateContent);sync();});
  controls=createControls({root,state,flight,planetIds,moons,allIds,nameOf,parentOf,inspectWorld,closeInspection,sync,persist,announce,openPanel,closePanel,camera,play,replayClock});
  resizing.observe(q('.mission-deck'));
  reduced.addEventListener('change',()=>draw());
  q('.world-targets').addEventListener('pointerdown',pointerDown);
  q('.loading-system')?.remove();sync();globalThis.lucide?.createIcons();
