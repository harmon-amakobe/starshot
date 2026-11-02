"""Cache geometric JPL states and verify the interpolation used by the study."""
from pathlib import Path
import concurrent.futures, hashlib, json, math, re, sys, urllib.parse, urllib.request
import numpy as np
TOOLS = Path(__file__).resolve().parent
ROOT = TOOLS.parent / 'public' / 'observatory'
FIXTURES = TOOLS / 'fixtures'
PROVENANCE = FIXTURES / 'provenance'
PROVENANCE.mkdir(parents=True, exist_ok=True)
import spiceypy as spice
CACHE = TOOLS / '.cache'
CACHE.mkdir(exist_ok=True)
API = 'https://ssd.jpl.nasa.gov/api/horizons.api'
PCK = 'https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc'
flight = json.loads((ROOT / 'precise-flight.json').read_text())
start, stop = flight['startEt'], flight['endEt']
# Periods select sampling cadence only. Positions are always queried, never propagated from these.
moons = [
 ('moon',301,'earth',27.322),('phobos',401,'mars',.31891),('deimos',402,'mars',1.26244),
 ('io',501,'jupiter',1.76914),('europa',502,'jupiter',3.55118),('ganymede',503,'jupiter',7.15455),('callisto',504,'jupiter',16.68902),
 ('mimas',601,'saturn',.94242),('enceladus',602,'saturn',1.37022),('tethys',603,'saturn',1.8878),('dione',604,'saturn',2.73692),
 ('rhea',605,'saturn',4.51821),('titan',606,'saturn',15.94542),('hyperion',607,'saturn',21.27661),('iapetus',608,'saturn',79.33018),('phoebe',609,'saturn',550.31),
 ('ariel',701,'uranus',2.52038),('umbriel',702,'uranus',4.14418),('titania',703,'uranus',8.70587),('oberon',704,'uranus',13.46324),('miranda',705,'uranus',1.41348),
 ('triton',801,'neptune',5.87685),('nereid',802,'neptune',360.13),('proteus',808,'neptune',1.12231)]
planets = {'mercury':199,'venus':299,'earth':399,'mars':499,'jupiter':599,'saturn':699,'uranus':799,'neptune':899}

def fetch(url, dest):
 if dest.exists(): return dest.read_bytes()
 request=urllib.request.Request(url,headers={'User-Agent':'StarshotLocalPrototype/1.0 (offline ephemeris validation)'})
 with urllib.request.urlopen(request, timeout=240) as res: data=res.read()
 dest.write_bytes(data)
 return data

def query(params, key):
 params={'format':'json','MAKE_EPHEM':"'YES'",'EPHEM_TYPE':"'VECTORS'",'VEC_TABLE':"'2'",'VEC_CORR':"'NONE'",'OUT_UNITS':"'KM-S'",'REF_PLANE':"'ECLIPTIC'",'REF_SYSTEM':"'ICRF'",'TIME_TYPE':"'TDB'",'CSV_FORMAT':"'YES'",**params}
 # A changed time span must never reuse states from a different Horizons request.
 request_hash=hashlib.sha256(json.dumps(params,sort_keys=True,separators=(',',':')).encode()).hexdigest()[:20]
 raw=fetch(API+'?'+urllib.parse.urlencode(params), CACHE/(key+'-'+request_hash+'.json'))
 result=json.loads(raw)
 text=result.get('result','')
 if '$$SOE' not in text: raise ValueError(str(result)[:1800])
 lines=text.split('$$SOE')[1].split('$$EOE')[0].strip().splitlines()
 rows=[]
 for line in lines:
  cells=line.split(',')
  rows.append([(float(cells[0])-2451545)*86400]+[float(n) for n in cells[2:8]])
 return np.array(rows), {'request':params,'signature':result['signature'],'sha256':hashlib.sha256(raw).hexdigest(),'header':text.split('$$SOE')[0]}

def hermite(a,b,t):
 h=b[:,0]-a[:,0]; u=(t-a[:,0])/h; u2=u*u; u3=u2*u
 return ((2*u3-3*u2+1)[:,None]*a[:,1:4]+((u3-2*u2+u)*h)[:,None]*a[:,4:7]
  +(-2*u3+3*u2)[:,None]*b[:,1:4]+((u3-u2)*h)[:,None]*b[:,4:7])

def satellite(item):
 name,code,parent,period=item
 # Additional ceiling resolves the rapidly changing periapses of the irregular moons.
 step=min(period*86400/128, 6*3600)
 count=math.ceil((stop-start)/step/2)*2
 chunks=math.ceil(count/50000); parts=[]; provenance=[]
 for k in range(chunks):
  lo=(count*k//chunks)//2*2; hi=count if k==chunks-1 else (count*(k+1)//chunks)//2*2
  a=start+(stop-start)*lo/count; b=start+(stop-start)*hi/count
  rows,meta=query({'COMMAND':f"'{code}'",'CENTER':f"'500@{planets[parent]}'",'START_TIME':f"'JD{2451545+a/86400:.12f}'",'STOP_TIME':f"'JD{2451545+b/86400:.12f}'",'STEP_SIZE':f"'{hi-lo}'"},f'{code}-{count}-{k}')
  parts.append(rows if k==0 else rows[1:]);provenance.append(meta)
 data=np.concatenate(parts);knots=data[::2];holdout=data[1::2]
 if len(knots)!=len(holdout)+1: raise ValueError(f'{name} truncated response {len(data)} expected {count+1}')
 errors=np.linalg.norm(hermite(knots[:-1],knots[1:],holdout[:,0])-holdout[:,1:4],axis=1)
 maximum=float(max(errors));budget=.1 if code in [401,402] else 1.
 if maximum>budget: raise ValueError(f'{name}: {maximum} km exceeds {budget}')
 # Irregular non-midpoint probes independently exercise browser interpolation too.
 probes=start+(stop-start)*np.array([.01379,.417321,.893117])
 ref,refmeta=query({'COMMAND':f"'{code}'",'CENTER':f"'500@{planets[parent]}'",'TLIST':"'"+' '.join(f'{2451545+t/86400:.12f}' for t in probes)+"'"},f'{code}-probes')
 idx=np.clip(np.searchsorted(knots[:,0],ref[:,0])-1,0,len(knots)-2)
 probe_error=float(max(np.linalg.norm(hermite(knots[idx],knots[idx+1],ref[:,0])-ref[:,1:4],axis=1)))
 if probe_error>budget: raise ValueError(f'{name}: probe error {probe_error}')
 # Uniform Horizons output can end milliseconds early after interval rounding.
 # Actual geometric padding states bracket the entire replay; never extrapolate.
 endpoints,endmeta=query({'COMMAND':f"'{code}'",'CENTER':f"'500@{planets[parent]}'",'TLIST':"'"+' '.join(f'{2451545+t/86400:.12f}' for t in [start-1,start,stop,stop+1])+"'"},f'{code}-endpoints')
 knots=np.concatenate([endpoints[:1],knots,endpoints[-1:]])
 ref=np.concatenate([ref,endpoints[1:3]])
 idx=np.clip(np.searchsorted(knots[:,0],ref[:,0])-1,0,len(knots)-2)
 probe_error=float(max(np.linalg.norm(hermite(knots[idx],knots[idx+1],ref[:,0])-ref[:,1:4],axis=1)))
 if probe_error>budget: raise ValueError(f'{name}: endpoint error {probe_error}')
 (PROVENANCE/(name+'-provenance.json')).write_text(json.dumps({'queries':provenance,'probeQuery':refmeta,'endpointQuery':endmeta},indent=2))
 print(f'{name}: {len(knots)} knots, {len(errors)} holdouts, max {maximum:.6f} km, probes {probe_error:.6f} km',flush=True)
 return {'id':name,'code':code,'parent':parent,'periodDays':period,'count':len(knots),'holdoutCount':len(errors),'maxErrorKm':maximum,'probeErrorKm':probe_error,'budgetKm':budget,'probes':ref.tolist()},knots

def physical():
 raw=fetch(PCK,CACHE/'pck00011.tpc');spice.furnsh(str(CACHE/'pck00011.tpc'))
 bodies={};fixtures=[]
 for name,code in [('sun',10)]+list(planets.items())+[(m[0],m[1]) for m in moons]:
  body={'code':code}
  for key in ['RADII','POLE_RA','POLE_DEC','PM','NUT_PREC_RA','NUT_PREC_DEC','NUT_PREC_PM']:
   try: body[key]=spice.gdpool(f'BODY{code}_{key}',0,1000).tolist()
   except spice.utils.exceptions.SpiceyError: pass
  parent=code//100
  for key in ['NUT_PREC_ANGLES','MAX_PHASE_DEGREE']:
   try: body[key]=spice.gdpool(f'BODY{parent}_{key}',0,1000).tolist()
   except spice.utils.exceptions.SpiceyError: pass
  bodies[name]=body
  if 'PM' in body:
   for t in [start,start+(stop-start)*.271828,stop]:
    fixtures.append({'id':name,'et':t,'basis':spice.pxform('IAU_'+name.upper(),'ECLIPJ2000',t).T.tolist()})
 (ROOT/'system-orientation.json').write_text(json.dumps({'source':PCK,'sha256':hashlib.sha256(raw).hexdigest(),'toolkit':spice.tkvrsn('TOOLKIT'),'bodies':bodies},separators=(',',':')))
 (FIXTURES/'orientation-reference.json').write_text(json.dumps(fixtures,separators=(',',':')))

physical()
if '--physical-only' in sys.argv: sys.exit(0)
binary=[]; metadata=[]; offset=0
# Keep JPL requests sequential; cache every response so interrupted runs resume.
for item in moons:
 meta,knots=satellite(item);meta['offset']=offset;offset+=knots.size
 metadata.append(meta);binary.append(knots.reshape(-1))
(ROOT/'satellite-states.bin').write_bytes(np.concatenate(binary).astype('<f8').tobytes())
(ROOT/'satellite-data.json').write_text(json.dumps({'source':API,'frame':'ECLIPJ2000','correction':'NONE','units':'km, km/s, seconds TDB past J2000','startEt':start,'endEt':stop,'moons':metadata},separators=(',',':')))
print('Wrote',offset*8,'bytes for',len(metadata),'moons',flush=True)
