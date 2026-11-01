import {createReplaySpeed} from './replay-speed-controls.js';
import {currentUnits,unitNames,flightReading} from './system-units.js';
export function createControls(api){
 const {root,state,flight,planetIds,moons,allIds,nameOf,parentOf,inspectWorld,sync:render,persist,announce,openPanel,closePanel,camera}=api;
 const q=s=>root.querySelector(s),svg=(body,cls='')=>`<svg class="${cls}" viewBox="0 0 28 28" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
 const planetIcon=svg('<circle cx="14" cy="14" r="11" stroke-dasharray="1 4" opacity=".6"/><circle class="size-disc" cx="14" cy="14" r="7" fill="currentColor"/><path class="size-crescent" d="M15 8a6 6 0 0 0 0 12" stroke="#101823" opacity=".5"/>','planet-size-icon');
 const faster=svg('<path d="m5 7 8 7-8 7Zm10 0 8 7-8 7Z" fill="currentColor" stroke="none"/>');
 const cameraIcons={follow:svg('<path d="m14 6 5 15-5-3-5 3Z"/><path d="M4 10V4h6m8 0h6v6M4 18v6h6m8 0h6v-6"/>'),system:svg('<ellipse cx="14" cy="14" rx="11" ry="7" transform="rotate(-30 14 14)"/><circle cx="14" cy="14" r="3" fill="currentColor"/><circle cx="23" cy="9" r="2" fill="currentColor"/>'),free:svg('<path d="M14 3v22M3 14h22M10 7l4-4 4 4M10 21l4 4 4-4M7 10l-4 4 4 4M21 10l4 4-4 4"/>')};
 q('.size-row').innerHTML=`<button class="world-size-toggle size-control" data-action="true-scale" aria-pressed="false">${planetIcon}<span class="scale-mode">Worlds enlarged</span></button>`;
 q('.playback-rate').outerHTML=`<div class="time-warp" role="group" aria-label="Replay speed"><button data-warp="-1" aria-label="Slower replay">${svg('<path d="M8 14h12"/>')}</button><button class="warp-display" aria-label="Reset replay speed to real time"><span class="warp-label"></span><span class="warp-chevrons" aria-hidden="true">${Array.from({length:8},()=>'<i></i>').join('')}</span></button><button data-warp="1" aria-label="Faster replay">${faster}</button></div>`;
 const unitMark=letters=>svg('<text x="13" y="20" text-anchor="middle" fill="currentColor" stroke="none" font-family="monospace" font-size="19" font-style="italic" font-weight="700" letter-spacing="-1.5">'+letters+'</text>');
 const unitIcons={metric:unitMark('km'),imperial:unitMark('mi'),light:svg('<path d="M3 14c4-12 5 12 9 0s5 12 10 0"/>')};
 const unitOrder=['metric','imperial','light'],nextUnits=()=>unitOrder[(unitOrder.indexOf(currentUnits(state))+1)%unitOrder.length];
 const unitSwitch=document.createElement('button');unitSwitch.type='button';unitSwitch.className='units-cycle';unitSwitch.setAttribute('aria-description','Cycles Metric, Imperial and Light-time. Each mode remembers its units.');q('.deck-modes').before(unitSwitch);
 const inspection=q('.inspection-caption');inspection.innerHTML='<div class="inspection-heading"><strong class="inspection-name"></strong><small class="inspection-detail"></small></div>'+`<button data-close-inspection aria-label="Close close-up" title="Close close-up. Return to your previous view" aria-description="Returns to the camera view and zoom you had before inspecting this world. Escape also closes the close-up.">${svg('<path d="m8 8 12 12M20 8 8 20"/>')}</button>`;
 q('.deck-toggle').innerHTML=svg('<path d="m7 10 7 7 7-7"/>')+'<span class="deck-label">Flight deck</span><span class="deck-short" aria-hidden="true">Deck</span>';q('.deck-toggle').setAttribute('aria-label','Flight deck');
 const flightLabels=[['Launch Δv','Delta-v launch cost'],['Speed v∞','Hyperbolic excess speed at departure'],['Energy C3','C3 characteristic energy at departure']];
 root.querySelectorAll('.science-page[data-page="1"] dt').forEach((n,i)=>{n.innerHTML=(n.querySelector('svg,i')?.outerHTML||'')+'<span>'+flightLabels[i][0]+'</span>';n.setAttribute('aria-label',flightLabels[i][1]);n.title=flightLabels[i][1];});
 q('.camera-mobile').outerHTML=`<button class="camera-cycle" aria-label="Change camera">${cameraIcons.follow}<span class="camera-cycle-label"></span></button>`;
 q('.sound-button').remove();
 q('.utility [data-panel=menu]').innerHTML=svg('<path d="M5 7h18M5 14h18M5 21h18"/>')+'<span class="menu-label">Menu</span>';
 q('.utility [data-panel=menu]').setAttribute('aria-label','Menu');
 q('.clear-view').innerHTML=svg('<g class="eye-open"><path d="M3 14q11-15 22 0-11 15-22 0Z"/><circle cx="14" cy="14" r="4"/></g><g class="eye-closed"><path d="M4 11q10 12 20 0M5 14l-2 3m6 0-1 3m6-2v4m5-5 1 3m3-6 2 3"/></g>','eye-icon')+'<span class="sr">Hide UI</span>';
 const speedControls=createReplaySpeed({root,state,clock:api.replayClock,render,persist,announce});
 unitSwitch.addEventListener('click',()=>{const next=nextUnits();state.unitPreferences[state.science?'science':'simple']=next;state.last=0;render();persist();announce(unitNames[next]+' units. '+(next==='light'?(state.science?'Replay controls use light-speed steps.':'Distances use light travel time. Replay controls are unchanged.'):'Replay controls use time steps.'));});
 const targetLayer=document.createElement('div');targetLayer.className='world-targets';q('.world').after(targetLayer);
 const targets=new Map(allIds.map(id=>{const b=document.createElement('button');b.className='world-target';b.dataset.world=id;b.setAttribute('aria-label','Select '+nameOf(id));b.hidden=true;targetLayer.append(b);return [id,b];}));
 const card=document.createElement('section');card.className='world-popover';card.hidden=true;card.setAttribute('aria-label','World actions');root.append(card);
 let geometry=[],labelHits=[],selected=null,anchor=[100,150],returnTo=null;
 function close(focus=false){if(card.hidden)return;card.hidden=true;selected=null;if(focus)(returnTo?.isConnected&&!returnTo.hidden?returnTo:q('.world')).focus();}
 function position(){
  if(card.hidden)return;
  const h=root.clientHeight,w=root.clientWidth,bottom=q('.dock').offsetHeight+24,top=state.mission?78+q('.mission-deck').offsetHeight:72;
  if(h-bottom-top<165&&state.deck){state.deck=false;render();}
  const room=Math.max(145,h-q('.dock').offsetHeight-top-20);card.style.maxHeight=room+'px';
  const x=Math.max(12,Math.min(w-card.offsetWidth-12,anchor[0]+18));
  const y=Math.max(top,Math.min(h-q('.dock').offsetHeight-card.offsetHeight-16,anchor[1]-32));
  card.style.left=x+'px';card.style.top=y+'px';
 }
 function choose(ids,point,source){
  close();if(!ids.length||state.clear||state.opened)return;
  if(state.mission){state.mission=false;render();}
  anchor=point;returnTo=source||document.activeElement;
  if(ids.length===1)show(ids[0]);
  else{selected=null;card.innerHTML=`<header><h3>Choose a world</h3><button data-card-close aria-label="Close world actions">×</button></header><div class="world-candidates">${ids.map(id=>`<button data-pick-world="${id}">${nameOf(id)}<span aria-hidden="true">→</span></button>`).join('')}</div>`;card.hidden=false;position();card.querySelector('[data-pick-world]').focus();announce('Nearby worlds. Choose one.');}
 }
 function show(id,notes=false){
  selected=id;const parent=parentOf(id),children=moons.filter(m=>m.parent===parent),moon=parent!==id,star=id==='sun';
  card.innerHTML=`<header><h3>${nameOf(id)}</h3><button data-card-info aria-label="${notes?'Back to world actions':'World details'}">${notes?'←':'ⓘ'}</button><button data-card-close aria-label="Close world actions">×</button></header>${notes?`<div class="world-card-notes"><p>${star?'Our star, also called Sol.':moon?'Moon of '+nameOf(parent):children.length?children.length+' major moon'+(children.length===1?'':'s')+' in this study.':'No moons.'}</p><p>Positions, spin and the flight share one clock. Realistic size keeps physical proportions.</p>${['hyperion','nereid'].includes(id)?'<p>Spin is not modelled for this moon.</p>':''}${moon&&id!=='moon'?'<p>Untextured reference shape.</p>':''}${star?'<p>Scientific or realistic size shows a white photosphere. Simplified with enlarged worlds uses gold. Sunspots, prominences and flare brightening are enhanced illustrations, not observed activity. Play animates them; Pause freezes them. Reduced motion stops decorative shape changes and flare brightening. Reference rotation still follows the journey. The rotation reference does not model differential rotation.</p>':''}<p>Full source and rendering limits are in Menu → About this study.</p></div>`:`<p class="world-kind">${star?'Star · Sol':moon?'Moon of '+nameOf(parent):'Planet'+(children.length?' · '+children.length+' major moon'+(children.length===1?'':'s'):'')}</p><div class="world-actions"><button class="primary" data-world-view="${id}">View close-up</button>${children.length?`<button data-world-system="${parent}">${moon?nameOf(parent):'Moons'}</button>`:''}</div>`}`;
  card.dataset.notes=String(notes);card.hidden=false;position();card.querySelector(notes?'[data-card-info]':'[data-world-view]').focus();announce(nameOf(id)+' selected.');
 }
 function hit(x,y){
  const direct=geometry.filter(b=>b.selectable&&(Math.hypot(x-b.x,y-b.y)<=Math.max(22,b.r)||labelHits.some(l=>l.id===b.id&&x>=l.x&&x<=l.x+l.w&&y>=l.y&&y<=l.y+l.h)));
  const ids=direct.sort((a,b)=>Math.hypot(x-a.x,y-a.y)-Math.hypot(x-b.x,y-b.y)).map(b=>b.id);
  if(ids.length)choose(ids,[x,y],q('.world'));else close();
 }
 function worldMenu(){return `<p class="muted">Choose a world here, or tap it on the map.</p><div class="menu-list section"><button data-go-world="solar">Solar system<span aria-hidden="true">↗</span></button></div><div class="world-catalogue"><section class="world-family"><button data-go-world="sun"><span class="catalogue-planet catalogue-sun" aria-hidden="true"></span>Sun<span aria-hidden="true">↗</span></button></section>${planetIds.map(id=>{const children=moons.filter(m=>m.parent===id);return `<section class="world-family"><button data-go-world="${id}"><span class="catalogue-planet" aria-hidden="true"></span>${nameOf(id)}<span aria-hidden="true">↗</span></button>${children.length?`<details><summary>${children.length} ${children.length===1?'moon':'moons'}</summary><div class="moon-list">${children.map(m=>`<button data-go-world="${m.id}">${nameOf(m.id)}</button>`).join('')}</div></details>`:''}</section>`;}).join('')}</div>`;}
 const missionButton=q('.mission');delete missionButton.dataset.panel;missionButton.dataset.missionToggle='true';missionButton.setAttribute('aria-controls','mission-deck');
 const mission=document.createElement('section');mission.id='mission-deck';mission.className='mission-deck';mission.setAttribute('aria-label','Mission deck');mission.hidden=true;q('.hud').append(mission);
 mission.innerHTML=`<header><span class="eyebrow">Mission deck</span><button data-mission-close aria-label="Collapse mission deck">⌃</button></header><div class="mission-content"><div><h3>First light</h3><p>Earth <span aria-hidden="true">→</span> Mars</p></div><dl><div><dt>Launch window</dt><dd>2 Nov 2026</dd></div><div><dt>Route</dt><dd>303 days</dd></div><div class="mission-scientific"><dt>Launch cost</dt><dd>3.62 km/s</dd></div></dl><button data-mission-replay>Replay flight <span aria-hidden="true">↗</span></button></div><p class="mission-footnote">Recorded flight · inspect the map while you travel</p>`;
 function toggleMission(force){close();state.mission=force??!state.mission;render();if(state.mission&&root.clientHeight-q('.dock').offsetHeight-mission.offsetHeight<180&&state.deck){state.deck=false;render();}announce(state.mission?'Mission deck open. The map remains interactive.':'Mission deck collapsed.');}
 function update(){
  const units=currentUnits(state);root.dataset.units=units;
  if(unitSwitch.dataset.units!==units){unitSwitch.innerHTML=unitIcons[units]+'<span class="units-label">'+unitNames[units]+'</span>';unitSwitch.dataset.units=units;}
  const unitsLabel='Units: '+unitNames[units]+'. Switch to '+unitNames[nextUnits()];unitSwitch.setAttribute('aria-label',unitsLabel);unitSwitch.title=unitsLabel;unitSwitch.dataset.tooltip=unitsLabel;
  const readings=[flightReading(flight.analysis.cost,units),flightReading(flight.analysis.speed,units),flightReading(flight.analysis.c3,units,true)];
  root.querySelectorAll('.science-page[data-page="1"] dd').forEach((n,i)=>{n.innerHTML=readings[i].value+' <small>'+readings[i].unit+'</small>';});
  q('.mission-scientific dd').textContent=readings[0].value+' '+readings[0].unit;
  const label=state.trueSize?'Realistic size':'Worlds enlarged',action=state.trueSize?'Use enlarged size':'Use realistic size',size=q('.size-control');
  size.setAttribute('aria-label',label+'. '+action);size.title=action+'. Distances stay to scale.';size.querySelector('.size-disc').setAttribute('r',state.trueSize?'3':'7');
  speedControls.update();
  const next={follow:'system',system:'free',free:'follow'}[state.camera];q('.camera-cycle svg').outerHTML=cameraIcons[state.camera];q('.camera-cycle-label').textContent=nameOf(state.camera);q('.camera-cycle').setAttribute('aria-label','Camera: '+nameOf(state.camera)+'. Switch to '+nameOf(next));
  q('.play').setAttribute('aria-label',state.playing?'Pause':'Play');
  const eye=q('.clear-view');eye.setAttribute('aria-label',state.clear?'Show UI':'Hide UI');eye.title=state.clear?'Show UI':'Hide UI';
  for(const sound of root.querySelectorAll('[data-action=sound]')){sound.textContent=state.music||state.effects?'Sound on':'Sound off';sound.setAttribute('aria-pressed',String(state.music||state.effects));}
  size.setAttribute('aria-description',state.sizeLinked?'Linked to Simplified and Scientific. Switching this control makes world sizes independent.':'World sizes are independent. Relink them in Menu.');
  targetLayer.hidden=state.clear;targetLayer.inert=!!state.opened;mission.hidden=!state.mission;
  missionButton.setAttribute('aria-expanded',String(!!state.mission));root.dataset.mission=String(!!state.mission);
  mission.querySelector('.mission-scientific').hidden=!state.science;root.style.setProperty('--mission-height',state.mission?mission.offsetHeight+'px':'0px');
  if(state.clear||state.opened)close();position();
 }
 function draw(bodies,hits){
  geometry=bodies;labelHits=hits;
  const rect=root.getBoundingClientRect(),blocks=[...root.querySelectorAll('.topbar,.dock,.zoom,.map-note,.clear-view,.mission-deck,.inspection-heading,[data-close-inspection]')].filter(n=>n.offsetWidth&&!n.hidden).map(n=>{const r=n.getBoundingClientRect();return{x:r.x-rect.x,y:r.y-rect.y,w:r.width,h:r.height};});
  for(const b of bodies){const target=targets.get(b.id);target.hidden=!b.selectable||b.x<22||b.y<22||b.x>root.clientWidth-22||b.y>root.clientHeight-22||blocks.some(r=>b.x+22>r.x&&b.x-22<r.x+r.w&&b.y+22>r.y&&b.y-22<r.y+r.h);target.style.left=(b.x-22)+'px';target.style.top=(b.y-22)+'px';}
 }
 root.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-close-inspection')){close();api.closeInspection();}
  if(b.classList.contains('camera-cycle'))camera({follow:'system',system:'free',free:'follow'}[state.camera]);
  if(b.dataset.world&&e.detail===0){const g=geometry.find(g=>g.id===b.dataset.world);choose([b.dataset.world],[g.x,g.y],b);}
  if(b.hasAttribute('data-card-close'))close(true);
  if(b.hasAttribute('data-card-info'))show(selected,card.dataset.notes!=='true');
  if(b.dataset.pickWorld)show(b.dataset.pickWorld);
  if(b.dataset.worldView||b.dataset.worldSystem){const id=b.dataset.worldView||b.dataset.worldSystem;close();inspectWorld(id,!!b.dataset.worldSystem);q('.world').focus();}
  if(b.dataset.goWorld){const id=b.dataset.goWorld;closePanel();inspectWorld(id);q('.world').focus();}
  if(b.hasAttribute('data-mission-toggle'))toggleMission();
  if(b.hasAttribute('data-mission-close')){toggleMission(false);missionButton.focus();}
  if(b.hasAttribute('data-mission-replay')){state.progress=0;api.play();announce('Replaying the flight from departure.');}
 });
 root.addEventListener('pointerdown',e=>{if(!card.hidden&&!e.target.closest('.world-popover,.world,.world-target'))close();},true);
 document.addEventListener('keydown',e=>{if(!root.contains(e.target)||state.opened)return;if(e.key==='Escape'&&(!card.hidden||state.mission)){e.preventDefault();e.stopImmediatePropagation();if(!card.hidden)close(true);else{toggleMission(false);missionButton.focus();}}},true);
 return {sync:update,updateSpeed:speedControls.update,draw,hit,close,worldMenu,toggleMission,showWorld:(id,notes=false)=>{const g=geometry.find(g=>g.id===id);choose([id],g?[g.x,g.y]:[root.clientWidth/2,120],document.activeElement);if(notes)show(id,true);}};
}
