// PDS mean radial dimensions, km. Alpha is an artistic exposure, not optical depth.
// Unknown-width enhancements are guide lines only; no invented solid geometry.
export const rings={
 jupiter:[['Halo',100000,122400,.018,'volume'],['Main',122400,129100,.12],['Amalthea gossamer',122400,181350,.018,'volume'],['Thebe gossamer',122400,221900,.012,'volume'],['Thebe extension',221900,270000,.006,'volume']],
 saturn:[['D',66900,74491,.08],['C',74491,91975,.25],['B',91975,117570,.85],['Cassini division',117570,122050,.05],['A',122050,133423,.62],['A',133745,136487,.62],['A',136522,136770,.62],['Roche division',136770,139380,.025],['F',139826,140612,.35],['Janus/Epimetheus',149000,154000,.012],['G',166000,173200,.02],['E',180000,480000,.008,'volume']],
 uranus:[['Zeta',39600,3500,.06],['6',41838,1.53,.45],['5',42234,2.28,.45],['4',42571,2.33,.45],['Alpha',44718,8.46,.5],['Beta',45661,9.49,.5],['Eta',47176,1.6,.4],['Gamma',47627,2.15,.4],['Delta',48300,4.6,.5],['Lambda',50024,2.3,.18],['Epsilon',51149,58.1,.65],['Nu',67300,3800,.015],['Mu',97700,17000,.012]].map(([n,c,w,a])=>[n,c-w/2,c+w/2,a]),
 neptune:[['Galle',41000,43000,.025],['Le Verrier',53200,53200,.25,'guide'],['Lassell',53200,57200,.025],['Arago',57200,57200,.15,'guide'],['Galatea dust',61953,61953,.1,'guide'],['Adams',62925.5,62940.5,.3]]
};
export function drawRings(ctx,id,position,scale,basis,front,guides,light){
 const bands=rings[id];if(!bands||!basis)return;
 const [x,y]=position,px=scale/149597870.7;
 const point=(r,a)=>{const c=Math.cos(a),s=Math.sin(a);return [x+r*px*(c*basis[0][0]+s*basis[1][0]),y-r*px*(c*basis[0][1]+s*basis[1][1]),c*basis[0][2]+s*basis[1][2]];};
 // Project the true equatorial plane, split at its sky-plane crossings for body occlusion.
 const steps=240;
 const localLight=basis.map(b=>b.reduce((s,n,i)=>s+n*light[i],0));
 const sunlight=Math.max(.2,Math.abs(localLight[2]));
 const planetRadius={jupiter:71492,saturn:60268,uranus:25559,neptune:24764}[id];
 for(const [name,inner,outer,alpha,kind] of bands){
  if(outer*px<2)continue;
  const paint=(start,end,shadow)=>{
   if(kind==='guide'||end<=start)return;
   const glow=shadow?.12:1;ctx.fillStyle=`rgba(${Math.round(220*glow)},${Math.round(206*glow)},${Math.round(176*glow)},${alpha*(.45+.55*sunlight)})`;
   ctx.beginPath();for(let k=start;k<=end;k++){const p=point(outer,k/steps*Math.PI*2);if(k===start)ctx.moveTo(p[0],p[1]);else ctx.lineTo(p[0],p[1]);}
   for(let k=end;k>=start;k--){const p=point(inner,k/steps*Math.PI*2);ctx.lineTo(p[0],p[1]);}ctx.closePath();ctx.fill();
  };
  // Contiguous sectors avoid false radial spokes from antialiased triangle seams.
  let start=0,previous=null;
  for(let k=0;k<=steps;k++){
   const mid=(k+.5)/steps*Math.PI*2,radius=(inner+outer)/2;
   const along=radius*(Math.cos(mid)*localLight[0]+Math.sin(mid)*localLight[1]);
   const shadow=along<0&&radius*radius-along*along<planetRadius*planetRadius;
   const current=k===steps||(point(1,mid)[2]>=0)!==front?null:shadow;
   if(current!==previous){if(previous!==null)paint(start,k,previous);start=k;previous=current;}
  }
  if(guides&&(id!=='saturn'||['F','G','E'].includes(name))){
   ctx.strokeStyle='#D2C6B86B';ctx.lineWidth=.8;ctx.setLineDash(kind==='volume'?[1,5]:[3,5]);ctx.beginPath();let active=false;
   for(let k=0;k<=steps;k++){const p=point((inner+outer)/2,k/steps*Math.PI*2);if((p[2]>=0)!==front){active=false;continue;}if(active)ctx.lineTo(p[0],p[1]);else ctx.moveTo(p[0],p[1]);active=true;}ctx.stroke();ctx.setLineDash([]);
  }
 }
}
