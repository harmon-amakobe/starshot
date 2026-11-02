export function createReplaySpeed({root,state,clock,render,persist,announce}){
 const q=s=>root.querySelector(s),normal=clock.normalRate;
 const timeSteps=[{rate:1,name:'Real time'},{rate:60,name:'Drift'},{rate:3600,name:'Slow'},{rate:86400,name:'Cruise'},{rate:0,name:'1×'},{rate:normal*2,name:'2×'},{rate:normal*3,name:'3×'},{rate:normal*4,name:'4×'}];
 const lightSteps=[{rate:1,name:'Real time'},...[.25,.5,.75,1,2,5,10,30,100,300].map(lightRate=>({lightRate,name:lightRate+'c'}))];
 const real=()=>clock.isLightContext(state)?!state.lightRate:state.rate===1;
 const scientific=v=>v>=86400?(v/86400).toLocaleString('en',{maximumSignificantDigits:3})+' d/s':v>=3600?(v/3600).toLocaleString('en',{maximumSignificantDigits:3})+' h/s':v>=60?(v/60).toLocaleString('en',{maximumSignificantDigits:3})+' min/s':v.toLocaleString('en',{maximumSignificantDigits:3})+' s/s';
 const concise=v=>v<.01?v.toExponential(1):v.toLocaleString('en',{maximumSignificantDigits:3});
 function context(){const light=clock.isLightContext(state);return{light,steps:light?lightSteps:timeSteps,current:light?(real()?0:clock.apparentC(state)):clock.rate(state)};}
 function value(s,light){return light?(s.lightRate||0):(s.rate||normal);}
 function select(step){if(clock.isLightContext(state))state.lightRate=step.lightRate||0;else state.rate=step.rate??0;state.last=0;render();persist();announce(step.lightRate?step.name+' replay. Distance along the recorded route per real second.':'Replay speed '+step.name+'. '+scientific(clock.rate(state))+'.');}
 function speed(delta){const {light,steps,current}=context();const choices=steps.filter(s=>delta>0?value(s,light)>current*(1+1e-10):value(s,light)<current*(1-1e-10));if(choices.length)select(delta>0?choices[0]:choices.at(-1));}
 function realTime(){select(timeSteps[0]);announce('Real time. One simulated second per second.');}
 for(const button of root.querySelectorAll('[data-warp]'))button.addEventListener('click',()=>{if(button.getAttribute('aria-disabled')!=='true')speed(Number(button.dataset.warp));});
 q('.time-warp').addEventListener('dblclick',e=>{e.preventDefault();realTime();});
 q('.warp-display').addEventListener('click',e=>{if(e.detail===0)realTime();});
 let lastTouch=null;
 q('.time-warp').addEventListener('pointerup',e=>{if(e.pointerType!=='touch')return;const time=performance.now();if(lastTouch&&time-lastTouch.time<350&&Math.hypot(e.clientX-lastTouch.x,e.clientY-lastTouch.y)<24){lastTouch=null;requestAnimationFrame(realTime);}else lastTouch={time,x:e.clientX,y:e.clientY};});
 function update(){
  const {light,steps,current}=context(),rate=clock.rate(state),exact=timeSteps.find(s=>Math.abs(value(s,false)-rate)<1e-8);
  const display=light?(real()?'Real time':concise(clock.apparentC(state))+'c'):state.science?scientific(rate):(exact?.name||'≈'+concise(rate/normal)+'×');
  q('.warp-label').textContent=display;
  const readout=q('.warp-display');readout.setAttribute('aria-label','Replay speed '+display+'. Reset to real time');readout.dataset.rate=String(rate);readout.dataset.pacing=clock.usingC(state)?'light':'time';readout.dataset.lightRate=clock.usingC(state)?String(state.lightRate):'';
  q('.time-warp').title=display+' replay · '+scientific(rate)+'. '+(light?'1c covers one light-second of the recorded route per real second. This changes replay pacing, not the physical flight. ':'1× plays this trip in '+Math.round(clock.duration/normal)+' seconds. ')+'Double-click for real time; keyboard: focus the readout and press Enter.';
  q('[data-warp="-1"]').setAttribute('aria-disabled',String(!steps.some(s=>value(s,light)<current*(1-1e-10))));q('[data-warp="1"]').setAttribute('aria-disabled',String(!steps.some(s=>value(s,light)>current*(1+1e-10))));
  const chevrons=q('.warp-chevrons');if(chevrons.children.length!==steps.length)chevrons.innerHTML=steps.map(()=>'<i></i>').join('');
  [...chevrons.children].forEach((n,i)=>n.classList.toggle('lit',value(steps[i],light)<=current*(1+1e-10)));
 }
 return {update};
}
