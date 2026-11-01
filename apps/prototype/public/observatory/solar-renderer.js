// Enhanced solar imagery, not observed activity or a radiometric exposure model.
const TAU=Math.PI*2;
const spots=[[.36,.38,.033],[.41,.4,.015],[1.8,-.18,.016],[3.6,.28,.026],[3.65,.3,.012],[5.2,-.12,.018]].map(([lon,lat,r])=>({p:[Math.cos(lon)*Math.cos(lat),Math.sin(lon)*Math.cos(lat),Math.sin(lat)],r}));
const hash=(x,y,z)=>{let n=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
const smooth=t=>t*t*(3-2*t),mix=(a,b,t)=>a+(b-a)*t;
function noise(x,y,z){
 const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=smooth(x-ix),fy=smooth(y-iy),fz=smooth(z-iz);
 return mix(mix(mix(hash(ix,iy,iz),hash(ix+1,iy,iz),fx),mix(hash(ix,iy+1,iz),hash(ix+1,iy+1,iz),fx),fy),mix(mix(hash(ix,iy,iz+1),hash(ix+1,iy,iz+1),fx),mix(hash(ix,iy+1,iz+1),hash(ix+1,iy+1,iz+1),fx),fy),fz);
}
export function renderSolarSurface(m){
 const n=m.size,canvas=new OffscreenCanvas(n,n),ctx=canvas.getContext('2d'),out=ctx.createImageData(n,n),pixels=out.data,B=m.basis;
 const colour=m.solarWhite?[255,255,255]:[255,213,124];
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const nx=(x+.5)/n*2-1,ny=1-(y+.5)/n*2,d=nx*nx+ny*ny;if(d>1)continue;
  const nz=Math.sqrt(1-d),bx=B[0][0]*nx+B[0][1]*ny+B[0][2]*nz,by=B[1][0]*nx+B[1][1]*ny+B[1][2]*nz,bz=B[2][0]*nx+B[2][1]*ny+B[2][2]*nz;
  const fine=noise(bx*135,by*135,bz*135),broad=noise(bx*24,by*24,bz*24);
  let shade=(.7+.3*Math.sqrt(nz))*(.885+.105*fine+.035*broad);
  for(const spot of spots){
   const dot=bx*spot.p[0]+by*spot.p[1]+bz*spot.p[2],dist=2*(1-dot)/(spot.r*spot.r);
   if(dist<14)shade*=1-.43*Math.exp(-dist*.32)-.37*Math.exp(-dist*2.2);
  }
  const i=(y*n+x)*4;
  pixels[i]=colour[0]*shade;pixels[i+1]=colour[1]*shade;pixels[i+2]=colour[2]*shade;
  pixels[i+3]=Math.min(255,(1-Math.sqrt(d))*n*128);
 }
 ctx.putImageData(out,0,0);return canvas.transferToImageBitmap();
}
function projected(B,lon,lat,radius){
 const a=Math.cos(lon)*Math.cos(lat)*radius,b=Math.sin(lon)*Math.cos(lat)*radius,c=Math.sin(lat)*radius;
 return [a*B[0][0]+b*B[1][0]+c*B[2][0],a*B[0][1]+b*B[1][1]+c*B[2][1],a*B[0][2]+b*B[1][2]+c*B[2][2]];
}
export function drawSolarAtmosphere(ctx,x,y,r,B,white,time){
 const outer=Math.max(r*1.65,30),glow=ctx.createRadialGradient(x,y,r*.95,x,y,outer);
 glow.addColorStop(0,white?'#F6F5FF42':'#FFD57950');glow.addColorStop(.3,white?'#E3E9FF13':'#FFBB501D');glow.addColorStop(1,white?'#E3E9FF00':'#FFB84D00');
 ctx.save();ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x,y,outer,0,TAU);ctx.fill();
 if(r<30){ctx.restore();return;}
 // A thin chromosphere and brightened limb loops keep the white disk readable.
 ctx.strokeStyle=white?'#FF929C35':'#FFAD5050';ctx.lineWidth=Math.max(.6,r*.003);ctx.beginPath();ctx.arc(x,y,r*1.003,0,TAU);ctx.stroke();
 ctx.lineCap='round';
 const regions=[[.34,.11,.16,.12],[2.12,-.04,.065,.07],[4.75,.18,.12,.16]];
 for(let j=0;j<regions.length;j++){
  const [lon,lat,reach,spread]=regions[j],phase=time*.16+j*1.7;
  const height=reach*(.8+.2*Math.sin(phase));
  for(let strand=0;strand<8;strand++){
   const fraction=strand/7;
   ctx.beginPath();
   for(let k=0;k<=32;k++){
    const t=k/32,envelope=Math.sin(Math.PI*t),angle=lon+(t-.5)*spread*2;
    const bend=.012*Math.sin(phase+t*5+strand*.7)*envelope;
    const p=projected(B,angle+bend,lat+(fraction-.5)*.025*envelope,1+height*(.65+fraction*.6)*Math.pow(envelope,.8)+.006*Math.sin(t*TAU*2+phase+fraction)*envelope);
    const px=x+p[0]*r,py=y-p[1]*r;
    if(k===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
   }
   ctx.strokeStyle=white?'#FF657A0B':'#FF8E3512';ctx.lineWidth=Math.max(2,r*.025);ctx.stroke();
   ctx.strokeStyle=white?'#FFB1BE65':'#FFD5A080';ctx.lineWidth=Math.max(.4,r*.0017);ctx.stroke();
  }
 }
 for(let j=0;j<90;j++){
  const angle=j*TAU/90+.014*Math.sin(j*13),height=.002+.014*hash(j,7,2);
  ctx.strokeStyle=white?'#FF9CAA22':'#FFBA6140';ctx.lineWidth=Math.max(.4,r*.001);
  ctx.beginPath();ctx.moveTo(x+Math.cos(angle)*r,y+Math.sin(angle)*r);
  ctx.lineTo(x+Math.cos(angle+.002)*r*(1+height),y+Math.sin(angle+.002)*r*(1+height));ctx.stroke();
 }
 ctx.restore();
}
export function drawSolarBrightening(ctx,x,y,r,B,white,time,reduced){
 if(r<45||reduced)return;
 for(let j=0;j<spots.length;j++){
  const p=spots[j].p,q=[0,1,2].map(k=>p[0]*B[0][k]+p[1]*B[1][k]+p[2]*B[2][k]);
  if(q[2]<.12)continue;
  const pulse=Math.pow(.5+.5*Math.sin(time*.22+j*2.1),6)*.2;
  const px=x+q[0]*r,py=y-q[1]*r,extent=r*.055,g=ctx.createRadialGradient(px,py,0,px,py,extent);
  g.addColorStop(0,white?'rgba(255,255,255,'+pulse+')':'rgba(255,249,205,'+pulse+')');g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,py,extent,0,TAU);ctx.fill();
 }
}
