// Body-fixed textures and ellipsoid intersections stay off the interaction thread.
import {renderSolarSurface} from './solar-renderer.js';
const maps=new Map();
self.onmessage=({data:m})=>{
  if(m.type==='map'){maps.set(m.id,m);return;}
  if(m.id==='sun'){const bitmap=renderSolarSurface(m);self.postMessage({id:m.id,key:m.key,solarWhite:m.solarWhite,bitmap},[bitmap]);return;}
  const source=maps.get(m.id),n=m.size,canvas=new OffscreenCanvas(n,n),ctx=canvas.getContext('2d');
  const out=ctx.createImageData(n,n),pixels=out.data,B=m.basis,axes=m.axes;
  const inv=axes.map(a=>1/(a*a)),A=B.reduce((s,b,i)=>s+b[2]*b[2]*inv[i],0);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const nx=(x+.5)/n*2-1,ny=1-(y+.5)/n*2;
    const q=B.map(b=>b[0]*nx+b[1]*ny),b=2*q.reduce((s,v,i)=>s+v*B[i][2]*inv[i],0),c=q.reduce((s,v,i)=>s+v*v*inv[i],0)-1,disc=b*b-4*A*c;
    if(disc<0)continue;
    const z=(-b+Math.sqrt(disc))/(2*A),body=q.map((v,i)=>v+B[i][2]*z);
    const normal=[0,1,2].map(j=>body.reduce((s,v,i)=>s+v*inv[i]*B[i][j],0)),length=Math.hypot(...normal);
    const illumination=Math.max(0,normal.reduce((s,v,i)=>s+v*m.light[i]/length,0));
    let shade=.055+.945*Math.pow(illumination,.65);const di=(y*n+x)*4;
    let colour=m.colour;
    if(source){
      const u=((Math.atan2(body[1],body[0])/(2*Math.PI)+.5)%1+1)%1;
      const v=.5-Math.asin(body[2]/Math.hypot(...body))/Math.PI;
      const si=(Math.min(source.h-1,Math.floor(v*source.h))*source.w+Math.min(source.w-1,Math.floor(u*source.w)))*4;
      colour=source.pixels.subarray(si,si+3);
    }
    const rim=m.id==='earth'?Math.pow(1-Math.max(0,normal[2]/length),4)*illumination*.5:0;
    pixels[di]=Math.min(255,colour[0]*shade+rim*50);pixels[di+1]=Math.min(255,colour[1]*shade+rim*130);pixels[di+2]=Math.min(255,colour[2]*shade+rim*220);pixels[di+3]=255;
  }
  ctx.putImageData(out,0,0);const bitmap=canvas.transferToImageBitmap();
  self.postMessage({id:m.id,key:m.key,bitmap},[bitmap]);
};
