

from .contin import Contin
from rich.console import Console
import numpy as np
from .vect import Vectors##
#from asho import Asho # requires astlohorizons to be instlled but it should not be a requirement......ill just call the class in that module so that astlo remains seriously a requirement..
from datetime import datetime, timezone
from sgp4.api import jday
from .eo import Eo, sate_posvel
import time
import json

console = Console()


class Topocentric:
    '''converts planet/asteroid state vectors relative SSB or heliocenter and converts them to topocentric elevation,azimuth angles. For Eo satellites, or general satellites, use the eo module class Eo'''

   
    def __init__(self):
        self.contin = Contin()
        self.vectors = Vectors()
        self.eo = Eo()
        self.states = 'import_states.json' #environmwnt requirement for astlo...
     #   self.Asho = Asho()


    def topo(self,name: str=None, lat: float=None, long: float=None, alt: float=None,days: float=None,tt: float=None,ephem=None):
        '''returns azimuth and elevation angles in degrees and the range_eye_magnitude from the passed lat,long,alt and position state vector. assumes the passed position vector is relative SSB or heliocenter. note that earth pos vector cannot be passed. The days argument the second last argument should be passed a value if one wants to time step to a certain day and get the elevation azumuth and range objects. love you mark. tt argument should be passed a value if one doenst want the default timestep of one hour that the rungekutta for astlo uses. both  argumwnts days and tt should be striclty in terms of days. altitude passed should be in meters.\nif ephem is given a value, mercury, sun, venus and moon can be used together with de440.\nHowever remeber best practice for the json file that allows talking with astlo.'''

        if name==None:
            console.print('[red]name cannot be none[/red]')
            return 'name cannot be none'

        

        valu = {'SUN':0,'MERCURY':1,'VENUS':2,'EARTH':3,'MARS':4,'VESTA':5,'CERES':6,'PALLAS':7,'HYGIEA':8,'JUPITER':9,'SATURN':10,'URANUS':11,'NEPTUNE':12,'PLUTO':13,'HAUMEA':14,'MAKEMAKE':15,'ERIS':16,'MOON':'moon','LUNA':'luna','LUNAR':'lunar','SOL':'sol'} #use json file to pass the vectors if json...or a .txt file

        name = name.upper()
        ephee = ['SUN','SOL','MERCURY','VENUS','LUNA','LUNAR','MOON'] #luna doenst need to be in this check becuase it is not a must for it to be passed together with ephem option..becuase of the which method..luna was the aim ...
        if name not in ephee and ephem:
            return 'use ephem positional argument if de440 check is required. the name should be [sun,venus,sol,mercury,luna,moon,lunar] either of the values in the list.'


        names_moon = ['MOON','LUNA','LUNAR'] #for checking if rungekutta was used or not..howver ill need to update once the de440 for other objects other than the moon is used..
        if name not in valu.keys():
            console.print('[red]Name not recognized internally[/red]')
            return 'name not recognized internally'

     #   name = name.upper()

        if name=='EARTH':
            console.print('[red]you cannot observe Earth from Earth[/red]')
            return 'you cannot observe Earth from Earth'

        if lat==None or long==None or alt==None:
            return 'positional arguments: r, latitude, longitude, altitude are required.'



        
        if days and tt: #if both
            runge_kutta = self.contin.rungekutta(None,None,tt,days)  #universal approach not yet implwmentee so no vectors forbearth are being passed.
            dayss = days
        elif days==None and tt==None: #if none of them
            runge_kutta = self.contin.rungekutta() #with a default timestep of one hour.
            dayss = None
        elif days and tt==None: #if days only
            runge_kutta = self.contin.rungekutta(None,None,None,days)
            dayss = days
        elif days==None and tt: #if tt only
            runge_kutta = self.contin.rungekutta(None,None,tt,None)
            dayss = days

     #   valu = {'SUN':0,'MERCURY':1,'VENUS':2,'EARTH':3,'MARS':4,'VESTA':5,'CERES':6,'PALLAS':7,'HYGIEA':8,'JUPITER':9,'SATURN':10,'URANUS':11,'NEPTUNE':12,'PLUTO':13,'HAUMEA':14,'MAKEMAKE':15,'ERIS':16}

        earth = runge_kutta['new_pos_vectors'][valu.get('EARTH','error')]


        if name=='LUNA' or name=='MOON' or name=='LUNAR': #lunar does not need ephem because that module was specifically for luna...even if ephem is given a value, luna will still read the json file borake i remember to initialize them for luna..
            
            with open(self.states,'r') as file:
                data = json.load(file)

            if data['name'] not in names_moon:
                return f'json file object name does not match passed name: json file contains: {data['name']} while {name} was passed.'

            r_geocentric = data['states_list'][2] #geocentric states - # states_list contains 2 state vectors pos,vel in two frames EMB and geocentric..4 vectors..

            unix_t = data['time_unix']
            unix_simple = data['time_simple']
##the table that compares astlo internal ephem data with that of astlohorizons nasajpl..

        elif name=='VENUS' and ephem: #for venus, mwrcury, sun, de440.bsp file...

            
            with open(self.states,'r') as file: #the json file should be updated using the talk method in aatlotalk external module..name alertness so as not to get wrong states
                data = json.load(file)

            if data['name']!=name:
                return f'json file object name does not match passed name: json file contains: {data['name']} while {name} was passed'

            r_obj_to_m = []
            earth_to_m = [] #from km

            for _,idx in enumerate(data['states_list'][0]):
                r_obj_to_m.append(idx*1000)
                earth_to_m.append(data['earth_states'][_]*1000)

            

            r_geocentric = self.vectors.sub_vect(r_obj_to_m,earth_to_m) #the json file contains the states relative SSB...i mean the format of the saved object is very diffrent to the one like luna..
            unix_t = data['time_unix']
            unix_simple = data['time_simple']



        elif (name=='SUN' or name=='SOL') and ephem:

            with open(self.states,'r') as file:
                data = json.load(file)

            if data['name']!=name:
                return f'json file object name does not match passed name: json file contains: {data['name']} while {name} was passed'

            r_obj_to_m = []
            earth_to_m = [] #from k

            for _,idx in enumerate(data['states_list'][0]):
                r_obj_to_m.append(idx*1000)
                earth_to_m.append(data['earth_states'][_]*1000)


            r_geocentric = self.vectors.sub_vect(r_obj_to_m,earth_to_m)
            unix_t = data['time_unix']
            unix_simple = data['time_simple']


        elif name=='MERCURY' and ephem:
            
            with open(self.states,'r') as file:
                data = json.load(file)

            if data['name']!=name:
                return f'json file object name does not match passed name: json file contains: {data['name']} while {name} was passed'

            r_obj_to_m = []
            earth_to_m = [] #from k

            for _,idx in enumerate(data['states_list'][0]):
                r_obj_to_m.append(idx*1000)
                earth_to_m.append(data['earth_states'][_]*1000)

            r_geocentric = self.vectors.sub_vect(r_obj_to_m,earth_to_m)
            unix_t = data['time_unix']
            unix_simple = data['time_simple']

            #de440.bsp only works for mercury,sun,venus,earth and the moon



        else: #ephem pos argument == None..if the supported de440 objects arent needed with the de440 help check. 

            data = None

            r_geocentric = self.vectors.sub_vect(runge_kutta['new_pos_vectors'][valu.get(name,'error')],earth)
            unix_t = f'real-time + {runge_kutta['time_step']}'
            unix_simple = f'real-time = {time.asctime()} ¦ {time.time()}'
        #######r_geocentric = rr_geocentric[8]

        #julian date comversion##

        target_datetime = datetime.now(timezone.utc)
        jd, fr = jday(target_datetime.year, target_datetime.month, target_datetime.day,target_datetime.hour, target_datetime.minute, target_datetime.second)

        jd_full = jd + fr
        gmst_theta_radians = self.eo.gmst_from_jd(jd_full)

        cos_t, sin_t = np.cos(gmst_theta_radians), np.sin(gmst_theta_radians)
        R_GMST = np.array([[cos_t, sin_t, 0],[-sin_t, cos_t, 0],[0, 0, 1]])

        #geocentric distance rotated to ECEF frame
        r_geocentric_array = np.array(r_geocentric)
        r_ecef_geo = R_GMST @ r_geocentric_array
        r_ecef_geo_list = []

        for i in r_ecef_geo:
            r_ecef_geo_list.append(i)

        #location om suurface rotated to ecef - G3odetic (lat,long,alt) to ecef xyz

        geodetic_to_ecef_array, geodetic_to_ecef_list = self.eo.geodetic_to_ecef(lat,long,alt,'y') #your oocation on earths surface in ecef frame..geodetic is lat,long,alt
        r_relative_m = self.vectors.sub_vect(r_ecef_geo_list,geodetic_to_ecef_list) #the relative displacement vector

        enu_array, enu_list, units = self.eo.ecef_to_enu(np.array(r_relative_m),lat,long)
       # elevation_deg, azimuth_deg, range_eye_m = self.eo.enu_to_look_angles(enu_array) ...not  for planets.
        e,n,u = enu_array

        slant_range = self.vectors.magn_vect(enu_list)

        horizontal_slant_range = np.sqrt(e**2+n**2)

        elevation_deg = np.degrees(np.arcsin(u/slant_range)) #has another equation np.degrees(np.atan2(u,horizontal_slant_range))
        azimuth_deg = np.degrees(np.arctan2(e,n)) % 360 #measured clockwise from North (0^\circ North, 90^\circ East)..degrees

      #  names_moon = ['MOON','LUNA','LUNAR']
        light_delay_slant = slant_range/self.contin.c_m_s


        return {'name':name,'elevation_deg':elevation_deg, 'azimuth_deg':azimuth_deg, 'slant_range':slant_range,'horizontal_slant_range':horizontal_slant_range, 'earth_pos_vector_rel_SSB':earth, f'{name}_pos_vector_rel_SSB':runge_kutta['new_pos_vectors'][valu.get(name,'error')] if name not in names_moon else f'use astlo or astlohorizons to get the states for {name} relative SSB', 'r_geocentric_meters':r_geocentric,'r_geocentric_magn':self.vectors.magn_vect(r_geocentric),'enu_vector_meters':enu_array,'time': f'{unix_t}  ¦¦  {unix_simple}','Julian_Date_full':jd_full,'UTC_time':target_datetime if data==None else data['UTCtime'],'units':'m and seconds.','light_delay':light_delay_slant,'dayss':dayss} #utc_time + tt for rungekutta






    def rise_set(self,name: str=None,ctlog_number: int=None,lat: float=None,long: float=None,alt: float=None, days: float=None,tt: float=None,ephem=None):
        '''determines if object is rising or setting. which quadrant of the 2D circle in you local sky or horizon. use meters and degrees. The catlogue number pos argumwnt ahould be passed the NORAD number of a target satellite'''
        
        if name and ctlog_number:
            return 'only use name if a celestail object is the target and ctlog_number solely if an Earth satellite except the moon-luna is required.'

        if (name and (lat==None or long==None or alt==None)) or (ctlog_number and (lat==None or long==None or alt==None)):
            return 'all positional arguments: (name or ctlog_number), latitude, longitude, altitude in meters and the angles in degrees.'

        if lat==None or long==None or alt==None: #this another cbeck when the user doesnt pass the ctlogn or the name and the geodetic values.
            return 'all the geodetic values: lat, long, alt are needed.'


        if name and ctlog_number==None:
            name = name.upper()
            topocentric_initial = self.topo(name,lat,long,alt,days,tt,ephem)
        elif ctlog_number and name==None:
            topocentric_initial = sate_posvel(ctlog_number,'tle',lat,long,alt) #uses eo internal module to get thw satellite states via the NORAD number.


        time.sleep(60) #five minutes = 1.25 degrees. the earth eill have moved 1.25 degrees into/towards East

        if name and ctlog_number==None:
            name = name.upper()
            topocentric_final = self.topo(name,lat,long,alt,days,tt,ephem)
        elif ctlog_number and name==None:
            topocentric_final = sate_posvel(ctlog_number,'tle',lat,long,alt)


        delta_topocentric = topocentric_final['elevation_deg'] - topocentric_initial['elevation_deg']


        if lat>0:
            lat_exp = f'{lat} = degrees North of Equator'
        elif lat<0:
            lat_exp = f'{lat} = degrees south of equator'
        else:
            lat_exp = f'{lat} = 0 degrees along the Equator'


        if long>0:
            long_exp = f'{long} = degrees East'
        elif long<0:
            long_exp = f'{long} = degrees West'
        else:
            long_exp = f'{long} = 0 degrees along the Equator'



        alt_exp = f'{alt} = meters above sea level' if alt>0 else f'{alt} = meters below sea level'

        if delta_topocentric>0 and topocentric_final['elevation_deg']>0: #first quadrant from east towards up. yes 'up 90°' not north. from  your location..if elevation is negative, it cannot be seen.
            setting = 'visible and RISING TO MAX ELEVATION'
       #     lat_exp = f'{lat} = degrees North of Equator' if lat>0 elif lat<0 f'{lat} = degrees south of equator' else f'{lat} =0 degrees along the Equator'
      #      long_exp = f'{long} = degrees East' if long>0 elif long<0 f'{long} = degrees West' else f'{long} = 0 degrees along the Equator'

            exp = f'from your location {lat_exp}, {long_exp}, {alt_exp}, {name if name!=None else topocentric_final['satellite_name']} is rising.\nfirst quadrant of your local sky ¦hemisphere¦ rising from east towards up 90°.\nAt elevation_degrees = {topocentric_final['elevation_deg']} at {topocentric_final['UTC_time']}\n1st quadrant ascending to maximum elevation zenith angle\nNote that all of these are relative your location'


        elif delta_topocentric<0 and topocentric_final['elevation_deg']>0: #second quadrant from up towards west. from your location hemisphere
            setting = 'visible and SETTING TO LEAST ELEVATION'
            exp = f'from your loaction {lat_exp}, {long_exp}, {alt_exp}, {name if name!=None else topocentric_final['satellite_name']} is setting.\nsecond quadrant of your local sky ¦hemisphere¦ setting from Up 90° towards West. \nAt elevation degrees = {topocentric_final['elevation_deg']} at {topocentric_final['UTC_time']}\n2nd quadrant descending to minimum elevation nadir angle\nNote that all of these are relative your location'


        elif delta_topocentric<0 and topocentric_final['elevation_deg']<0:
            setting = 'not visible: ALREADY SET AND BELOW THE HORIZON'
            exp = f'from your location {lat_exp}, {long_exp}, {alt_exp}, {name if name!=None else topocentric_final['satellite_name']} has already SET below the horizon and is not visible in your location.\nAt elevation degrees = {topocentric_final['elevation_deg']} below the horizon at {topocentric_final['UTC_time']}\n3rd qudrant descending to minimum elevation nadir angle.\nNote that all of these are relative your location'

        elif delta_topocentric>0 and topocentric_final['elevation_deg']<0:
            setting = 'not visible: RISING BUT STILL BELOW THE HORIZON'
            exp = f'from your location {lat_exp}, {long_exp}, {alt_exp}, {name if name!=None else topocentric_final['satellite_name']} is Rising but still below the horizon.\nAt elevation degrees = {topocentric_final['elevation_deg']} below the horizon at {topocentric_final['UTC_time']}.\n4th quadrant ascending to maximum elevation zenith angle.\nNote that all of these are relative your location.'

        else:
            setting = 'devhelp'



        return {'name':name,'setting':setting,'explanation':exp,'delay':'60 seconds'}



    def topo_combined(self,name: str=None,lat: float=None,long: float=None,alt: float=None,days: float=None,tt: float=None,ephem=None):
        '''method that combines the above pipeline all-together for simplicity'''

        if name==None or lat==None or long==None or alt==None:
            return 'all positional arguments: name, latitude, longitude, altitude in meters and the angles in degrees.'

     #   print('''there will be a 1 minute delay. This allows earth's rotation to move 0.25° eastwards.''')
        name = name.upper()

        topocentric = self.topo(name,lat,long,alt,days,tt,ephem)
        riseset = self.rise_set(name,None,lat,long,alt,days,tt,ephem) #bug fixed after 30 min of thinking.. :


        return topocentric, riseset

   


   # def topoother(self,r: float=None,lat: float=None,long: float=None,alt: float=None,alt: float=None):
    #    pass

    def which(self,lat: float=None,long: float=None,alt: float=None,days: float=None,tt: float=None):
        '''returns which objects of all the available ones are visisble in your local sky. altitude in meters.'''

        if lat==None or long==None or alt==None:
            return 'all the positional arguments: name, alet, long, alt are all needed.'
        
        data_dict = ['SUN','MERCURY','VENUS','LUNA','MARS','VESTA','CERES','PALLAS','HYGIEA','JUPITER','SATURN','URANUS','NEPTUNE','PLUTO','HAUMEA','MAKEMAKE','ERIS']

        topo_lst = []
        exp_lst = []

        for idx,itm in enumerate(data_dict):
            topo, exp = self.topo_combined(itm,lat,long,alt,days,tt)
            topo_lst.append(topo)
            exp_lst.append(exp) #depending on the time set in talk module and also the topo_combined method delta_t..astlo will wait for ''time set'' for it to continue. the time allows eaeth rotation +1° or so...

        visibility = []
        timee = []
        utctime = []
       # visible_but_risset = []
      #  not_visible = []
        
        for idx,itm in enumerate(topo_lst): #onpy for your local hemisphere = positive awheter rusing or setting.
            if itm['elevation_deg']>8: #8 degrees..
                visibility.append(exp_lst[idx]['setting'])
            elif 0<itm['elevation_deg']<8:
                visibility.append(f'Has rised but may be not visible yet due to trees or buildings or other tall landscape features. {itm['name']} at {itm['UTC_time']} with an elevation of {itm['elevation_deg']}')
            else:
                visibility.append(exp_lst[idx]['setting'])
            timee.append(f'{topo['time']}')
            utctime.append(f'{topo['UTC_time']}')

            
        
        return visibility, days if days else None, timee, utctime #floowos data_dict indexes ...

# the which method can onlynuse read luna states externally and the other internally..this is becayse the json file used is one  for ease of use.

# luna foes not need the ephem option in order to wrk...      


    def ttime(self,name: str=None,lat: float=None,long: float=None,alt: float=None):
        '''returns the utc time that object x rises or sets in your local sky'''
        pass





