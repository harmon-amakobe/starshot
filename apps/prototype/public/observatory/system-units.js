// Exact definitions: BIPM metre and NIST international mile, not US survey mile.
export const LIGHT_KM_S=299792.458;
export const MILE_KM=1.609344;
export const unitNames={metric:'Metric',imperial:'Imperial',light:'Light-time'};
export const currentUnits=state=>state.unitPreferences[state.science?'science':'simple'];
const number=n=>n.toLocaleString('en',{maximumSignificantDigits:3});
const unit=(kmPerUnit,short,long)=>({kmPerUnit,short,long});
export function distanceUnit(km,mode){
 if(mode==='light'){
  const seconds=km/LIGHT_KM_S;
  if(seconds>=86400)return unit(LIGHT_KM_S*86400,'light-d','light-days');
  if(seconds>=3600)return unit(LIGHT_KM_S*3600,'light-h','light-hours');
  if(seconds>=60)return unit(LIGHT_KM_S*60,'light-min','light-minutes');
  if(seconds>=1)return unit(LIGHT_KM_S,'light-s','light-seconds');
  if(seconds>=.001)return unit(LIGHT_KM_S/1000,'light-ms','light-milliseconds');
  return unit(LIGHT_KM_S/1e6,'light-µs','light-microseconds');
 }
 const imperial=mode==='imperial',base=imperial?MILE_KM:1,label=imperial?'mi':'km',long=imperial?'miles':'kilometres';
 if(km>=base*1e9)return unit(base*1e9,'B '+label,'billion '+long);
 if(km>=base*1e6)return unit(base*1e6,'M '+label,'million '+long);
 if(km>=base)return unit(base,label,long);
 return imperial?unit(.0003048,'ft','feet'):unit(.001,'m','metres');
}
export function distanceReading(km,mode){
 const u=distanceUnit(km,mode),value=number(km/u.kmPerUnit);
 return {...u,value,text:value+' '+u.short,spoken:value+' '+u.long};
}
export function rulerReading(kmPerPixel,mode){
 const raw=68*kmPerPixel,u=distanceUnit(raw,mode),value=raw/u.kmPerUnit,power=10**Math.floor(Math.log10(value));
 const tick=[1,2,5,10].reduce((a,b)=>Math.abs(Math.log(a*power/value))<Math.abs(Math.log(b*power/value))?a:b)*power;
 const km=tick*u.kmPerUnit;
 return {km,pixels:km/kmPerPixel,text:number(tick)+' '+u.short,spoken:number(tick)+' '+u.long};
}
// Light-time is a distance presentation. Flight dynamics retain metric units there.
export function flightReading(value,mode,squared=false){
 const divisor=mode==='imperial'?MILE_KM:1;
 return {value:number(value/divisor**(squared?2:1)),unit:(mode==='imperial'?'mi':'km')+(squared?'²/s²':'/s')};
}
