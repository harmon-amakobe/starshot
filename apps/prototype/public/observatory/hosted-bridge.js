const channel='starshot-lunar-observatory-v1';
const query=new URLSearchParams(location.search);
export async function waitForHostedMission(){
 if(query.get('host')!=='lunar')return null;
 const sessionId=query.get('session'),requestId=Number(query.get('request'));
 const validVector=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite);
 const validSamples=(samples,start,end)=>Array.isArray(samples)&&samples.length>=2&&samples.length<=20001
  &&samples[0].t===start&&samples.at(-1).t===end&&samples.every((k,i)=>Number.isFinite(k.t)&&validVector(k.r)&&validVector(k.v)&&(!i||k.t>samples[i-1].t));
 const validPreferences=p=>p&&typeof p.science==='boolean'&&typeof p.trueSize==='boolean'&&typeof p.sizeLinked==='boolean'
  &&['follow','system','free'].includes(p.camera)&&['simple','science'].every(k=>['light','metric','imperial'].includes(p.unitPreferences?.[k]))
  &&Number.isFinite(p.rate)&&p.rate>=0&&p.rate<=1e9&&Number.isFinite(p.lightRate)&&p.lightRate>=0&&p.lightRate<=300;
 return new Promise(resolve=>{
  const receive=event=>{
   const d=event.data,p=d?.payload;
   if(event.origin!==location.origin||event.source!==parent||d?.channel!==channel||d.type!=='init'||d.sessionId!==sessionId||d.requestId!==requestId||!p)return;
   const f=p.flight;
   if(p.requestId!==requestId||p.mission?.target!=='moon'||p.mission?.origin!=='earth'||!['aim','flight','result'].includes(p.phase)
    ||!Number.isFinite(f?.startEt)||!Number.isFinite(f?.endEt)||f.endEt<=f.startEt||!Number.isFinite(p.et)||p.et<f.startEt||p.et>f.endEt
    ||!validSamples(f.samples,f.startEt,f.endEt)||!validSamples(p.clockFlight?.samples,f.startEt,f.endEt)
    ||!validPreferences(p.preferences)||typeof p.playing!=='boolean'||!Array.isArray(p.lunarOrbit)||!p.lunarOrbit.every(validVector)
    ||![p.basis?.right,p.basis?.up,p.basis?.normal].every(validVector))return;
   removeEventListener('message',receive);resolve({...p,sessionId});
  };
  addEventListener('message',receive);
  parent.postMessage({channel,type:'hello',sessionId,requestId},location.origin);
 });
}
export function attachHostedBridge(init,{state,root,pause}){
 let seq=0,cameraChanged=false,chosenCamera=init.preferences.camera,returned=false;
 const snapshot=()=>({seq:++seq,et:init.flight.startEt+(init.flight.endEt-init.flight.startEt)*state.progress,
  playing:state.opened?state.wasPlaying:state.playing, cameraChanged, preferences:{science:state.science,trueSize:state.trueSize,sizeLinked:state.sizeLinked,
   camera:chosenCamera,unitPreferences:{...state.unitPreferences},rate:state.rate,lightRate:state.lightRate}});
 function send(type){const value=snapshot();parent.postMessage({channel,type,sessionId:init.sessionId,requestId:init.requestId,snapshot:value},location.origin);return value;}
 function finish(){if(returned)return;const playing=state.playing;pause();state.playing=playing;send('return');state.playing=false;returned=true;clearInterval(timer);}
 const receive=event=>{const d=event.data;if(event.origin===location.origin&&event.source===parent&&d?.channel===channel&&d.sessionId===init.sessionId&&d.requestId===init.requestId&&d.type==='return-request')finish();};
 addEventListener('message',receive);
 const key=event=>{if(event.key==='Escape'){
  const layer=state.clear||state.opened||state.mission||state.focusBody||state.hostInspection||[...root.querySelectorAll('.world-popover')].some(node=>!node.hidden);
  if(layer)return;
  event.preventDefault();event.stopImmediatePropagation();finish();
 }};
 document.addEventListener('keydown',key,true);
 const timer=setInterval(()=>{if(!returned)send('checkpoint');},100);
 parent.postMessage({channel,type:'ready',sessionId:init.sessionId,requestId:init.requestId},location.origin);
 Object.defineProperty(window,'__starshotHosted',{configurable:true,get:()=>({sessionId:init.sessionId,requestId:init.requestId,mission:init.mission,
  phase:init.phase,et:init.flight.startEt+(init.flight.endEt-init.flight.startEt)*state.progress,playing:state.playing,rate:state.rate,lightRate:state.lightRate,
  camera:state.camera,cameraChanged,chosenCamera,sequence:seq,local:!state.solar&&!state.focusBody&&!state.hostInspection,geometry:JSON.parse(root.querySelector('.world').dataset.geometry||'null')})});
 return {finish,chooseCamera(mode){cameraChanged=true;chosenCamera=mode;}};
}
