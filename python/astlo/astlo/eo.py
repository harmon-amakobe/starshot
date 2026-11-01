#Copyright © 2026 Mark Macharia[@iamnothimbutwe Github]
# All rights reserved.

# Unauthorized copying, modification, distribution, or commercial use of this software (or substantial portions of it) is strictly prohibited without express written permission from the author.

from .vect import Vectors
from .contin import Contin
import os
import sys
import requests
from rich.console import Console
from sgp4.api import Satrec
from sgp4.api import jday
from datetime import datetime, timezone
import numpy as np
import time
#from .eo_satellites.sentland import Sentland

vectors = Vectors()
contin = Contin()

#now = datetime.now(timezone.utc) #this should be called outside this module 

class Eo(Contin):
    '''module dedicated to upstream and downstream sides for Earth Observation satellites. it can track any satellite not only Eo ones. The Norad Number is required though'''

    def __init__(self):
        '''the following dict values and variables contain the NORAD catalogue numbers for EO satellites landsat and sentinel'''
        super().__init__()

        self.landsat = {1:6126,2:7615,3:10702,4:13367,5:14780,7:25682,8:39084,9:49260} #landsat 1 - 9 except 6...only 8 and 9 are working..
        self.sentinel_A = {1:39634,2:40697,3:41335,6:46984} #sentinel 1A - 3A
        self.sentinel_B = {1:41456,2:42063,3:43437,6:66514}
        self.sentinel_5P = 42969
        self.sentinel_C = {1:62261,2:60989}
        self.sentinel_1D = 66315
        self.formatt_m = ['json','tle']
     #   self.Taifa_1 = 56208 Not operational
        self.iss_zarya = 25544
# add one or many kenya satellite.


    def tle(self,catnr: int=None,formatt: str=None):
        '''returns a json or a tle file describing one satellite's orbit 'shape' at one moment. Think of it as the satellite's ID card. for this method, remember the catalogue numbers. default format for the return file is json.'''

        if catnr==None:
            return f'NORAD catalogue number is needed.'
        if formatt and formatt not in self.formatt_m:
            return f'format type not supported: {formatt}'

        if formatt==None:
            formatt = 'json' #default json

        url = 'https://celestrak.org/NORAD/elements/gp.php'
        parameters = {'CATNR':catnr,'FORMAT':f'{formatt}'} #formatt will always have a value ..if none =='json' else if formatt = 'tle'
        file_response = requests.get(url, params=parameters)
        
        lines = file_response.text.strip().split('\r\n')
        name = lines[0]        # 'SENTINEL-2A'
        line1 = lines[1]       # '1 40697U 15028A   ...'
        line2 = lines[2]       # '2 40697  98.5660 296.2775 ...'
        
        return file_response.json() if formatt=='json' else file_response.text,line1,line2,name




    def satrecsate(self,line_one=None,line_two=None):
        '''returns a Satrec object..It reads those fixed-width columns from the tle data file internally — inclination, eccentricity, mean motion, BSTAR, epoch, all of it and unpacks them into the Satrec object's internal fields'''
        return Satrec.twoline2rv(line_one, line_two)


    def propagate(self,satellite=None,target_datetime=None):
        '''argument target_datetime requires the UTC time. satellite argument expects an SGP4 object from the satrecsate method'''

      #  if target_datetime:
       #     if 'UTC' not in target_datetime:
        #        return f'UTC specific time is needed. {target_datetime}'

        jd, fr = jday(target_datetime.year, target_datetime.month, target_datetime.day,target_datetime.hour, target_datetime.minute, target_datetime.second) #This converts your target datetime into two numbers: jd (Julian Date — a whole-number-ish day count since a fixed reference epoch) and fr (fractional part of the day)
        error_code, position, velocity = satellite.sgp4(jd, fr)
        if error_code != 0:
            raise RuntimeError(f"SGP4 propagation error, code {error_code}")


        return position, velocity, jd, fr #km, km/s — TEME frame - inertial state vectors in space



    def gmst_from_jd(self,jd_full=None):
        '''converts the JD Julian Date to Greenwich Mean Sidereal Timeand returns that GMST as an angle in radians'''
        T = (jd_full - 2451545.0) / 36525.0  #I already have jd and fr from our jday() call — combine them (jd_full = jd + fr) and feed that in.
        #24515...is the julian date of january 1st 1200 Noon Terrestial time..subtracting it from the jd_full 'right now' gives how much time has passed since January 1st....tgere are 365.25 days in a year therefore in a century there will be 36525 days...dividing the time passed since JD2000 with the days in a julian century converts it all into Julian centuries T.
        gmst_sec = (67310.54841 
                    + (876600*3600 + 8640184.812866) * T 
                    + 0.093104 * T**2 
                    - 6.2e-6 * T**3)
        gmst_deg = (gmst_sec / 240.0) % 360.0
        return np.radians(gmst_deg)



    def teme_to_ecef_pos(self,r_teme=None, jd_full=None):
        '''converts the Satrec object - state vectors from TEME frame to ECEF frame using the return value from method gmst_from_jd as the rotation angle. argument start_teme requires the state vector either position or velocity in the TEME frame'''
        if list(r_teme)==None or jd_full==None:
            return 'the positional vector in the teme frame and the Julian full date are required.'

        if not isinstance(r_teme,np.ndarray):
            return f'argument r_teme expected a numpy array object. pos_vector_teme_frame: {r_teme}'

        theta = self.gmst_from_jd(jd_full)
        cos_t, sin_t = np.cos(theta), np.sin(theta)
        R = np.array([
            [ cos_t, sin_t, 0],
            [-sin_t, cos_t, 0],
            [   0,      0,  1]
            ]) #Once you have GMST as an angle θ, the rotation from TEME → ECEF is a standard "rotate around Z-axis" matrix:
        r_ecef_array = R @ r_teme
        r_ecef_lst = []
        for i in r_ecef_array:
            r_ecef_lst.append(i)

        units = 'km'

        return r_ecef_array, r_ecef_lst, units




    def teme_to_ecef_vel(self,v_teme=None, jd_full=None,r_ecef=None):
        '''while rotating the velocity vector through the gmst angle, a correctiin to remove Earth roational velocity is required. the transport velocity or cariolis transport term. Because the rotation matrix R changes continuously over time due to Earth spinning at a specif8c rate..angular velocity for earth..Subtracting this from rotated TEME velocity cancels out Earth's 465 m/s equatorial surface spin (and proportional spin at satellite altitude). r_teme argument expects the pos vector in the ecef frame for the transport velocity correction to work'''
        if list(v_teme)==None or jd_full==None or list(r_ecef)==None:
            return 'the vectors for vel in teme frame, the julian full date and the vector for pos in ecef frame are required'
#list(v_teme)==None because an error occurs when trying to check the value of a numpy array - ambigous error - therfore i convert to list b4 checking

        if not isinstance(v_teme,np.ndarray) or not isinstance(r_ecef,np.ndarray):
            return f'the vectors passed do not match the expected numpy array object required. velocity_vector_teme_frame: {v_teme} pos_vector_ecef_frame: {r_ecef}'

        r_ecef_lst = []
        for i in r_ecef:
            r_ecef_lst.append(i)


        theta = self.gmst_from_jd(jd_full)
        cos_t, sin_t = np.cos(theta), np.sin(theta)
        R = np.array([[cos_t, sin_t, 0],[-sin_t, cos_t, 0],[0, 0, 1]])
        transport_velocity = vectors.cross_vect(self.earth_angularvel_vector_along_Z,r_ecef_lst) #the custom vectir module uses lists..

        v_ecef_bfo_correction = R @ v_teme #v_teme is a numpy.ndarray object
        v_ecef_bfo_lst = []

        for i in v_ecef_bfo_correction:
            v_ecef_bfo_lst.append(i)

        v_ecef = vectors.sub_vect(v_ecef_bfo_lst,[transport_velocity[0],transport_velocity[1],transport_velocity[2]]) # final vel vector relative ecef frame after correction
        units = 'km/s'

        

        return np.array(v_ecef), v_ecef, units




    def geodetic_to_ecef(self,lat_deg: float=None, lon_deg: float=None, alt_km: float=None,m=None):
        '''converts the location details - lat,long,alt into ecef frame..the latitude and longitude passed should be in degrees'''

        if lat_deg==None or lon_deg==None or alt_km==None:
            return 'the full coordinates, latitude, longitude, and altitude are required'

        if m:
            a = contin.wgs84['a'] #meters
        else:
            a = 6378.137          # WGS84 equatorial radius, km

        e2 = 0.00669437999014 # WGS84 eccentricity squared ..World Geodetic system 1984

        lat = np.radians(lat_deg)
        lon = np.radians(lon_deg)

        #Radius of Curvature in the Prime Vertical (N)
        #for a given geodetic latitude

        N = a / np.sqrt(1 - e2 * np.sin(lat)**2)

        x = (N + alt_km) * np.cos(lat) * np.cos(lon)
        y = (N + alt_km) * np.cos(lat) * np.sin(lon)
        z = (N * (1 - e2) + alt_km) * np.sin(lat)
        #r_relative = r_sat_ecef - r_farm_ecef ..to get thestraight vector from my location to the satellite

        return np.array([x, y, z]), [x,y,z] #array and list




    def ecef_to_enu(self,r_relative=None, lat_deg: float=None, lon_deg: float=None):
        '''This is the actual "which way do I look" step — it converts that relative vector into a frame where you can directly read off elevation and azimuth. the units can be in any SI units.'''

        if list(r_relative)==None or lat_deg==None or lon_deg==None:
            return 'all arguments are required'

        if not isinstance(r_relative,np.ndarray):
            return f'argument r_relative as a numpy array is required: passed type = {type(r_relative)}'


        lat = np.radians(lat_deg)
        lon = np.radians(lon_deg)

        R = np.array([
            [-np.sin(lon), np.cos(lon), 0],
            [-np.sin(lat)*np.cos(lon), -np.sin(lat)*np.sin(lon),  np.cos(lat)],
            [ np.cos(lat)*np.cos(lon),  np.cos(lat)*np.sin(lon),  np.sin(lat)]
            ])

        enu = R @ r_relative  # returns [East, North, Up]
        units = 'km or meters respective the units of the vector passed'

        return np.array(enu), [enu[0],enu[1],enu[2]], units #array and list...this vwctor is regardless of km ornmeters..



    def enu_to_look_angles(self,enu=None):
        '''converts the east,north,up to elevation and azimuth'''

        if list(enu)==None:
            return 'enu vector is needed'

        if not isinstance(enu,np.ndarray):
            return f'a numpy array object was expected. passed type = {type(enu)}'

        e, n, u = enu #a numpy array with 1 vector and 3 components...e,n,u unpavks the components of the array vector.
        range_km_or_m_or_whatever = np.linalg.norm(enu) #it's the distance along the slanted line straight up toward the satellite, as opposed to distance measured along Earth's curved surface. When the satellite is directly overhead (elevation = 90°), slant range roughly equals the satellite's altitude above ground. When the satellite is near the horizon (elevation near 0°), slant range is much longer than the altitude — because you're looking at it edge-on, through a longer diagonal path.
        elevation_deg = np.degrees(np.arcsin(u / range_km_or_m_or_whatever))
        azimuth_deg = (np.degrees(np.arctan2(e, n))) % 360

        return elevation_deg, azimuth_deg, range_km_or_m_or_whatever




#r_sat_ecef == where the sate is - vector relative earth's center
#r_farm_ecef == where the/your location is relative earths center

#r_sat_ecef — "where the satellite is, relative to Earth's center"
#r_farm_ecef — "where your farm is, relative to Earth's center"

#r_relative = r_sat_ecef - r_farm_ecef — "the arrow pointing from your farm to the satellite," but described using ECEF's axes, which don't mean anything intuitive to a person standing on the ground

#enu = ecef_to_enu(r_relative, ...) — the same arrow, redescribed using axes a human actually understands: East, North, Up

#range_km = norm(enu) (or equivalently norm(r_relative) — same value) — just "how long is that arrow," stripped of direction, giving you the distance alone

#So: two vectors (r_sat_ecef, r_relative) that describe positions/directions, and one final scalar (range_km) that's just a plain distance number pulled out of that arrow's length







###add a time stepping featyre  for satellites....



def sate_posvel(catnr: int=None, formatt: str=None, lat_deg: float=None, long_deg: float=None, alt: float=None):
    '''the method that bundles astlo.eo.Eo math pipeline to return the rotated pos, vel, satellite_name, topocentric <elevation,azimuth> ---'''

    if lat_deg==None or long_deg==None or alt==None:
        raise ValueError('The latitude, longitude and altitude are required')

    eo = Eo() # is ho7ld not add a ch3ck for the initialized catnr's because there will always be satellites ..more will be added..so just know the catnr NORAD b4 using this module


    file,l1,l2,name = eo.tle(catnr,formatt)

    satrecobj = eo.satrecsate(l1,l2)

    now = datetime.now(timezone.utc)
    time_simple = time.asctime()
    pos_teme,vel_teme,jd,fr = eo.propagate(satrecobj,now)
    jd_full = jd+fr
    pos_teme_list = []
    vel_teme_list = []

    for _,idx in enumerate(pos_teme): #converts the tuple to a list
        pos_teme_list.append(idx)
        vel_teme_list.append(vel_teme[_])

 #   if test: #tests tghe logic using a specific location lat,long,alt
  #      lat_test = -1.286389   # degrees (negative = South)
   #     lon_test = 36.817223   # degrees (positive = East)
    #    alt_test = 1.795        # km above sea level (~1,795 m — Nairobi's average elevation)
     #   loc_name = 'Nairobi'




    gmst_theta_radian = eo.gmst_from_jd(jd_full)
    pos_ecef_array,pos_ecef_list,units = eo.teme_to_ecef_pos(np.array(pos_teme_list),jd_full)
    vel_ecef_array,vel_ecef_list,units = eo.teme_to_ecef_vel(np.array(vel_teme_list),jd_full,pos_ecef_array)
    location_vector_ecef_array,location_vector_ecef_list = eo.geodetic_to_ecef(lat_deg,long_deg,alt) #if test!=None else eo.geodetic_to_ecef(lat_deg,long_deg,alt)


    r_relative = vectors.sub_vect(pos_ecef_list,location_vector_ecef_list) #r_sat_ecef - r_farm_ecef

    enu_vector_array,enu_vector_list,units = eo.ecef_to_enu(np.array(r_relative),lat_deg,long_deg) # if test!=None else eo.ecef_to_enu(r_relative,lat_deg,long_deg)

    elevation,azimuth,range_km = eo.enu_to_look_angles(enu_vector_array)
    light_delay = range_km/eo.c_km_s
    horizontal_slant_range = np.sqrt(enu_vector_list[0]**2+enu_vector_list[1]**2)

    return {'catnr':catnr,'satellite_name':name,'elevation_deg':elevation,'azimuth_deg':azimuth,'range_km':range_km,'ENU_vector':enu_vector_array,'sate_pos_rel_earthcenter':pos_ecef_array,'sate_vel_rel_earthcenter':vel_ecef_array,'lists':[pos_ecef_list,vel_ecef_list],'location_vector_rel_earthcenter':location_vector_ecef_array,'units':'km, km/s, degrees','UTC_time':now,'julian_date':jd_full,'time_simple':time_simple,'light_delay':light_delay,'horizontal_slant_range':horizontal_slant_range}






