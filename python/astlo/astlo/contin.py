# Copyright © 2026 Mark Macharia [@iamnothimbutwe Github]
# All rights reserved.

# Unauthorized copying, modification, distribution, or commercial use of this software (or substantial portions of it) is strictly prohibited without express written permission from the author.


from .astlo import Astro
from rich.console import Console
import sys
import math
import time
import plotext as ptxt
import platform
import os
from .vect import Vectors


# ---------------------------------------------------------
# Copyright (c) 2026 Mark. All rights reserved.
# Unauthorized copying of this file, via any medium, is
# strictly prohibited. developed by Mark Macharia [iamnothimbutwe] on Github.
# ---------------------------------------------------------


console = Console()
vectors = Vectors()


class Contin(Astro):

    def __init__(self):
        super().__init__()
        self.mission = 'to make astrophyiscs and orbital mechanics accessible to anykne with a terminal withoit nneeding heavy libraries and the internet..' #it will be big one day thougu😣/heavy library one day


    def day_finder(self,name: str=None):
        name = name.upper()
        return #continue
        



    def baryc_sun(self,days=None):
        '''calculates the barycebtric shift relative to the barycentric center of mass using meters and seconds..if days is passed makes sure the value is in terms of days..'''

        if days:
            try:
                days = float(days)
            except ValueError:
                raise ValueError(f'value passed for days is not supported. value given {days}')

        values = ['MERCURY','VENUS','EARTH','MARS','VESTA','CERES','PALLAS','HYGIEA','JUPITER','SATURN','URANUS','NEPTUNE','PLUTO','HAUMEA','MAKEMAKE','ERIS']
        
        vallues = []

        for i in values:
            if days:
                vallues.append(super().orbits(i,None,days))
            else:
                vallues.append(super().orbits(i)) # orbits returns a dictionary therefore vallues will contain multiple dictionaries containing values of of planeta at specific unux time stamps

        ###barycentric logic..USING ALL PLANETS FOR PRESICION###
        #total_mass = (self.MoS_kg+(self.Jupiter_mass*self.MoE_kg)+(self.Saturn_mass*self.MoE_kg)+(self.Uranus_mass*self.MoE_kg)+(self.Neptune_mass*self.MoE_kg))

        mercury = self.Mercury_mass*self.MoE_kg
        venus = self.Venus_mass*self.MoE_kg
        earth = self.MoE_kg
        mars = self.Mars_mass*self.MoE_kg
        vesta = self.Vesta_mass*self.MoE_kg
        ceres = self.Ceres_mass*self.MoE_kg
        pallas = self.Pallas_mass*self.MoE_kg
        hygiea = self.Hygiea_mass*self.MoE_kg
        jupiter = self.Jupiter_mass*self.MoE_kg
        saturn = self.Saturn_mass*self.MoE_kg
        uranus = self.Uranus_mass*self.MoE_kg
        neptune = self.Neptune_mass*self.MoE_kg
        pluto = self.Pluto_mass*self.MoE_kg
        makemake = self.Makemake_mass*self.MoE_kg
        haumea = self.Haumea_mass*self.MoE_kg
        eris = self.Eris_mass*self.MoE_kg

        total_mass = (self.MoS_kg+(mercury+venus+earth+mars+ceres+jupiter+saturn+uranus+neptune+pluto+eris+haumea+makemake+vesta+pallas+hygiea))

        summation_tranSun_vector_X = -(((mercury*vallues[0]['X_helio'])+(venus*vallues[1]['X_helio'])+(earth*vallues[2]['X_helio'])+(mars*vallues[3]['X_helio'])+(ceres*vallues[5]['X_helio'])+(jupiter*vallues[8]['X_helio'])+(saturn*vallues[9]['X_helio'])+(uranus*vallues[10]['X_helio'])+(neptune*vallues[11]['X_helio'])+(pluto*vallues[12]['X_helio'])+(eris*vallues[15]['X_helio'])+(vesta*vallues[4]['X_helio'])+(pallas*vallues[6]['X_helio'])+(hygiea*vallues[7]['X_helio'])+(haumea*vallues[13]['X_helio'])+(makemake*vallues[14]['X_helio']))/total_mass)

        summation_tranSun_vector_Y = -(((mercury*vallues[0]['Y_helio'])+(venus*vallues[1]['Y_helio'])+(earth*vallues[2]['Y_helio'])+(mars*vallues[3]['Y_helio'])+(ceres*vallues[5]['Y_helio'])+(jupiter*vallues[8]['Y_helio'])+(saturn*vallues[9]['Y_helio'])+(uranus*vallues[10]['Y_helio'])+(neptune*vallues[11]['Y_helio'])+(pluto*vallues[12]['Y_helio'])+(eris*vallues[15]['Y_helio'])+(vesta*vallues[4]['Y_helio'])+(pallas*vallues[6]['Y_helio'])+(hygiea*vallues[7]['Y_helio'])+(haumea*vallues[13]['Y_helio'])+(makemake*vallues[14]['Y_helio']))/total_mass)

        summation_tranSun_vector_Z = -(((mercury*vallues[0]['Z_helio'])+(venus*vallues[1]['Z_helio'])+(earth*vallues[2]['Z_helio'])+(mars*vallues[3]['Z_helio'])+(ceres*vallues[5]['Z_helio'])+(jupiter*vallues[8]['Z_helio'])+(saturn*vallues[9]['Z_helio'])+(uranus*vallues[10]['Z_helio'])+(neptune*vallues[11]['Z_helio'])+(pluto*vallues[12]['Z_helio'])+(eris*vallues[15]['Z_helio'])+(vesta*vallues[4]['Z_helio'])+(pallas*vallues[6]['Z_helio'])+(hygiea*vallues[7]['Z_helio'])+(haumea*vallues[13]['Z_helio'])+(makemake*vallues[14]['Z_helio']))/total_mass)

        vel_sun_X = -(((mercury*vallues[0]['v_Xhelio'])+(venus*vallues[1]['v_Xhelio'])+(earth*vallues[2]['v_Xhelio'])+(mars*vallues[3]['v_Xhelio'])+(ceres*vallues[5]['v_Xhelio'])+(jupiter*vallues[8]['v_Xhelio'])+(saturn*vallues[9]['v_Xhelio'])+(uranus*vallues[10]['v_Xhelio'])+(neptune*vallues[11]['v_Xhelio'])+(pluto*vallues[12]['v_Xhelio'])+(eris*vallues[15]['v_Xhelio'])+(vesta*vallues[4]['v_Xhelio'])+(pallas*vallues[6]['v_Xhelio'])+(hygiea*vallues[7]['v_Xhelio'])+(haumea*vallues[13]['v_Xhelio'])+(makemake*vallues[14]['v_Xhelio']))/total_mass)
        vel_sun_Y = -(((mercury*vallues[0]['v_Yhelio'])+(venus*vallues[1]['v_Yhelio'])+(earth*vallues[2]['v_Yhelio'])+(mars*vallues[3]['v_Yhelio'])+(ceres*vallues[5]['v_Yhelio'])+(jupiter*vallues[8]['v_Yhelio'])+(saturn*vallues[9]['v_Yhelio'])+(uranus*vallues[10]['v_Yhelio'])+(neptune*vallues[11]['v_Yhelio'])+(pluto*vallues[12]['v_Yhelio'])+(eris*vallues[15]['v_Yhelio'])+(vesta*vallues[4]['v_Yhelio'])+(pallas*vallues[6]['v_Yhelio'])+(hygiea*vallues[7]['v_Yhelio'])+(haumea*vallues[13]['v_Yhelio'])+(makemake*vallues[14]['v_Yhelio']))/total_mass)
        vel_sun_Z = -(((mercury*vallues[0]['v_Zhelio'])+(venus*vallues[1]['v_Zhelio'])+(earth*vallues[2]['v_Zhelio'])+(mars*vallues[3]['v_Zhelio'])+(ceres*vallues[5]['v_Zhelio'])+(jupiter*vallues[8]['v_Zhelio'])+(saturn*vallues[9]['v_Zhelio'])+(uranus*vallues[10]['v_Zhelio'])+(neptune*vallues[11]['v_Zhelio'])+(pluto*vallues[12]['v_Zhelio'])+(eris*vallues[15]['v_Zhelio'])+(vesta*vallues[4]['v_Zhelio'])+(pallas*vallues[6]['v_Zhelio'])+(hygiea*vallues[7]['v_Zhelio'])+(haumea*vallues[13]['v_Zhelio'])+(makemake*vallues[14]['v_Zhelio']))/total_mass)



        return {'X_s':summation_tranSun_vector_X,'Y_s':summation_tranSun_vector_Y,'Z_s':summation_tranSun_vector_Z,'total_mass':total_mass,'Unix_time':vallues[10]['Unix_time'],'N':'Sun','desc':'GETS BARYCENTRIC SHIFT OF THE SUN IN REAL TIME USING s AND m.','mode':f'future¦past with {days} days' if days else None,'v_X':vel_sun_X,'v_Y':vel_sun_Y,'v_Z':vel_sun_Z} #used unix time for eris. because it is the last iteration in the loop ...if mode is None tywn days is none .





    def custacce(self,target: int=None,r=None,mass=None):
        '''the custom N body acceleration method that requires the position vectors of the bodies as a list to continue..it assumes the first vector value is of Sol and follows the internal object respectively for the mass allocation..if mass argument is given a value, it should contain the masses for the pos vectors respectivwly..RESPECTIVELY to avoid errors. The target pos arg should be guven the index of the targte object inside tge pos vector list'''

        if r==None or target==None: #or target==0: ##for now target cannot be Sol
            console.print('[red]The position vectors for the multiple bodies as an iterable is required or the target body index has not been specified[/red]')
            return

       # if target>len(r): #be very careful with this target argument
        #    console.print('[red]The target object index exceeds the poaition vector')

        if not isinstance(r,list): #or not isinstance(mass,list):
            console.print('[red]custacce expected iterables specifically lists[/red]')
            return

        if target>len(r) or len(r)!=17 or target<0 or target>16: #be very careful with this target argument..ill add luna index 18 later.
            console.print('[red]The target object index exceeds the position vector items or the pos vector iterable does not match the internal number of objects. or target was given a negative number. or target was given a value greater than maximum possible indexes created.[/red]')
            return

##for now target cannot be zero 0

        ##the following logic checks if all of the values are
      #  try:
       #     posvect = []
        #    masses = []
         #   complst = []
#
       #     for _,idx in enumerate(r): #do not forget to use the lst in a last method
 #               if len(idx)!=3: #the vector should contain 3 components else zero if one of the components has no value
  #                  console.print('[red]Expected a 3D vector that contains 3 components (X,Y,Z)[/red]')
   #                 return
    #            for i,t in enumerate(idx): # store the pos vectors as [[X,Y,Z],[X1,Y1,Z1]] this iteration will finish and check the indivudual components first
     #               comp = float(t)
      #              complst.append(comp) #this will form the first vector iterable
       #         posvect.append(complst)
        #        
         #       


       # except ValueError:
        #    raise ValueError(f'component type not supported: {t} in {idx} with index {_}')

        posvect = r


        vallues = [
                {'N':'SUN','u_mass':self.GM_S},
                {'N':'MERCURY','u_mass':(self.G*(self.Mercury_mass*self.MoE_kg))},
                {'N':'VENUS','u_mass':(self.G*(self.Venus_mass*self.MoE_kg))},
                {'N':'EARTH','u_mass':(self.G*self.MoE_kg)},
                {'N':'MARS','u_mass':(self.G*(self.Mars_mass*self.MoE_kg))},
                {'N':'VESTA','u_mass':(self.G*(self.Vesta_mass*self.MoE_kg))},
                {'N':'CERES','u_mass':(self.G*(self.Ceres_mass*self.MoE_kg))},
                {'N':'PALLAS','u_mass':(self.G*(self.Pallas_mass*self.MoE_kg))},
                {'N':'HYGIEA','u_mass':(self.G*(self.Hygiea_mass*self.MoE_kg))},
                {'N':'JUPITER','u_mass':(self.G*(self.Jupiter_mass*self.MoE_kg))},
                {'N':'SATURN','u_mass':(self.G*(self.Saturn_mass*self.MoE_kg))},
                {'N':'URANUS','u_mass':(self.G*(self.Uranus_mass*self.MoE_kg))},
                {'N':'NEPTUNE','u_mass':(self.G*(self.Neptune_mass*self.MoE_kg))},
                {'N':'PLUTO','u_mass':(self.G*(self.Pluto_mass*self.MoE_kg))},
                {'N':'HAUMEA','u_mass':(self.G*(self.Haumea_mass*self.MoE_kg))},
                {'N':'MAKEMAKE','u_mass':(self.G*(self.Makemake_mass*self.MoE_kg))},
                {'N':'ERIS','u_mass':(self.G*(self.Eris_mass*self.MoE_kg))}
                ]
          #      {'N':'LUNAR','u_mass':(self.G*(self.moons['EARTH']['mass']))}
                #]

        individual_pulls_X = []
        individual_pulls_Y = []
        individual_pulls_Z = []

        valid_targets = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16] #currently the 17 objects with 0 index as Sol

        if target in valid_targets:
            if target==0: #Sol
                '''the net grav acc for Sol as the target'''
               # if days:
              #      retu = self.baryc_sun(days)   ##doesnt require live states
             #   else:
               #     retu = self.baryc_sun()
                for _,idx in enumerate(posvect):
                    if _==0:
                        continue
       #             if vallues[_]['N']=='LUNAR':
        #                if days:
         #                   y = self.barycentric('earth',days)
          #                  m = self.lunars('earth',days)
           #             else:
            #                y = self.barycentric('earth')
             #               m = self.lunars('earth')
#
 #                       #m = self.lunars('earth')
  #                      r_global_moon_X = y['X_bary'] + abs(m['X'])
   #                     r_global_moon_Y = y['Y_bary'] + abs(m['Y'])
    #                    r_global_moon_Z = y['Z_bary'] + abs(m['Z']) #barycentric for universal..althoughi used barycentric because of the SSB get me?
     #                   r_global_magn = vectors.magn_vect([r_global_moon_X,r_global_moon_Y,r_global_moon_Z])
      #                  r_lunar_3 = math.sqrt(math.pow((r_global_moon_X-retu['X_s']),2) + math.pow((r_global_moon_Y-retu['Y_s']),2) + math.pow((r_global_moon_Z-retu['Z_s']),2)) #lunar
       #                 r_chord_lunar = math.pow(r_lunar_3,3)
        #                relative_r_X_lunar = r_global_moon_X - retu['X_s']
         #               relative_r_Y_lunar = r_global_moon_Y - retu['Y_s']
          #              relative_r_Z_lunar = r_global_moon_Z - retu['Z_s']
           #             u_mass_lunar = vallues[17]['u_mass'] #lunar
            #            pull_X_lunar = ((u_mass_lunar/r_chord_lunar)*relative_r_X_lunar) #force projection
             #           pull_Y_lunar = ((u_mass_lunar/r_chord_lunar)*relative_r_Y_lunar)
              #          pull_Z_lunar = ((u_mass_lunar/r_chord_lunar)*relative_r_Z_lunar)
               #         individual_pulls_X.append(pull_X_lunar)
                #        individual_pulls_Y.append(pull_Y_lunar)
                 #       individual_pulls_Z.append(pull_Z_lunar)
                  #      continue


            #        if days:
             #           retur = self.barycentric(vallues[_]['N'],days)
              #      else:
#                        retur = self.barycentric(vallues[_]['N']) #the puller

                 #   r_chord_3 = math.sqrt(math.pow((retur['X_bary']-retu['X_s']),2) + math.pow((retur['Y_bary']-retu['Y_s']),2) + math.pow((retur['Z_bary']-retu['Z_s']),2))
                    r_chord_3 = vectors.magn_vect(posvect[0],idx)
               #     r_chord_3 = math.sqrt(math.pow((idx[0]-posvect[0][0]),2) + math.pow((idx[1]-posvect[0][1]),2) + math.pow((idx[2]-posvect[0][2]),2))
                    

                    r_chord = math.pow(r_chord_3[8],3)
                    relative_r_X = posvect[_][0] - posvect[0][0]
                    relative_r_Y = posvect[_][1] - posvect[0][1]
                    relative_r_Z = posvect[_][2] - posvect[0][2]
                    u_mass = vallues[_]['u_mass']
                    pull_X = ((u_mass/r_chord)*relative_r_X) #force factorprojected into the X_axis and so on....
                    pull_Y = ((u_mass/r_chord)*relative_r_Y)
                    pull_Z = ((u_mass/r_chord)*relative_r_Z)

                    #individual_pulls_X.append(pull_sun_X)
                    individual_pulls_X.append(pull_X)
                    individual_pulls_Y.append(pull_Y)
                    individual_pulls_Z.append(pull_Z)

                acceleration_a_X = sum(individual_pulls_X)#sum of all individual pulls on planet X
                acceleration_a_Y = sum(individual_pulls_Y)
                acceleration_a_Z = sum(individual_pulls_Z)

                return acceleration_a_X,acceleration_a_Y,acceleration_a_Z ###for Sol the su


            for _,idx in enumerate(posvect):
                if _==target: #the target is not included in the calculation
                    continue

                if _==0: #Sol the sun
                    r_chord_3_first = vectors.magn_vect(posvect[target],idx)
                    r_chord_first = math.pow(r_chord_3_first[8],3)
                    relative_X_0 = posvect[_][0] - posvect[target][0] #assumes index 0 is Sol
                    relative_Y_0 = posvect[_][1] - posvect[target][1]
                    relative_Z_0 = posvect[_][2] - posvect[target][2]
                    u_mass_sun = vallues[0]['u_mass']
                    pull_sun_X = ((u_mass_sun/r_chord_first)*relative_X_0)
                    pull_sun_Y = ((u_mass_sun/r_chord_first)*relative_Y_0)
                    pull_sun_Z = ((u_mass_sun/r_chord_first)*relative_Z_0)
                    individual_pulls_X.append(pull_sun_X)
                    individual_pulls_Y.append(pull_sun_Y)
                    individual_pulls_Z.append(pull_sun_Z)
                    continue

                if _==18: #Lunar Earths mooj is set at index 17
                    continue

                
                r_chord_3 = vectors.magn_vect(posvect[target],idx)
                r_chord = math.pow(r_chord_3[8],3)
                relative_r_X = posvect[_][0] - posvect[target][0]
                relative_r_Y = posvect[_][1] - posvect[target][1]
                relative_r_Z = posvect[_][2] - posvect[target][2]
                u_mass = vallues[_]['u_mass']

                pull_X = ((u_mass/r_chord)*relative_r_X) #force factorprojected into theX_axis and so on....
                pull_Y = ((u_mass/r_chord)*relative_r_Y)
                pull_Z = ((u_mass/r_chord)*relative_r_Z)

                #individual_pulls_X.append(pull_sun_X)
                individual_pulls_X.append(pull_X)
                individual_pulls_Y.append(pull_Y)
                individual_pulls_Z.append(pull_Z)


            acce_X = sum(individual_pulls_X)
            acce_Y = sum(individual_pulls_Y)
            acce_Z = sum(individual_pulls_Z)

            return acce_X,acce_Y,acce_Z

        else:
            console.print('[red]target index not in range of given positional vectors[/red]')
            return




####the universal grav accel requires a very diffrent log8c since the masses of the given body pos vector should also be provided..



    def acce(self,name: str=None,days=None):
        '''gets the real time acceleration vectors for specific planet X or futuee or past grav accelration if time is given..though time is in days convet into days if raw not in days..'''
        if name:
            name = name.upper() #name here is the target
        else:
            console.print('[red]method acce requires the target body name to continue[/red]')
            return

        #if time:
      ##      retu = self.barycentric(name,days) #time actuvated
     #   else:
         #   retu = self.barycentric(name) # thw real time xyz for trget planet l

        values = ['SUN','MERCURY','VENUS','EARTH','MARS','VESTA','CERES','PALLAS','HYGIEA','JUPITER','SATURN','URANUS','NEPTUNE','PLUTO','HAUMEA','MAKEMAKE','ERIS','LUNAR','LUNA'] #the valus it the method supports
        ln = ['LUNA','LUNAR'] #indioendent list for the moons

        if name not in values:
            console.print('[red]name not supoorted for N body accelerations[/red]')
            return

        #index = 0 if name==values[0] else 1 if name==values[1] else 2 if name==values[2] else 3 if name==values[3] else 4 if name==values[4] else 5 if name==values[5] else 6 if name==values[6] else 7 if name==values[7] else 8 if name==values[8] else 9 if name==values[9] else 10 if name==values[10] else 11 if name==values[11] else 12 if name==values[12] else 13 if name==values[13] else 14 if name==values[14] else 15 if name==values[15] else 16 if name==values[16] else None
        try:
            if days:
                days = float(days) #tine is the time step whether backwards or forwards...
        except ValueError:
            raise ValueError(f'the passed value for time is not supported. time given {days}')

      #  if time: luna and the upcoming would hav made it crash with error
       #     retu = self.barycentric(name,days) #time actuvated
       # else:
        #    retu = self.barycentric(name) #thw real time xyz for trget planet l

        vallues = [
                {'N':'SUN','u_mass':self.GM_S},
                {'N':'MERCURY','u_mass':(self.G*(self.Mercury_mass*self.MoE_kg))},
                {'N':'VENUS','u_mass':(self.G*(self.Venus_mass*self.MoE_kg))},
                {'N':'EARTH','u_mass':(self.G*self.MoE_kg)},
                {'N':'MARS','u_mass':(self.G*(self.Mars_mass*self.MoE_kg))},
                {'N':'VESTA','u_mass':(self.G*(self.Vesta_mass*self.MoE_kg))},
                {'N':'CERES','u_mass':(self.G*(self.Ceres_mass*self.MoE_kg))},
                {'N':'PALLAS','u_mass':(self.G*(self.Pallas_mass*self.MoE_kg))},
                {'N':'HYGIEA','u_mass':(self.G*(self.Hygiea_mass*self.MoE_kg))},
                {'N':'JUPITER','u_mass':(self.G*(self.Jupiter_mass*self.MoE_kg))},
                {'N':'SATURN','u_mass':(self.G*(self.Saturn_mass*self.MoE_kg))},
                {'N':'URANUS','u_mass':(self.G*(self.Uranus_mass*self.MoE_kg))},
                {'N':'NEPTUNE','u_mass':(self.G*(self.Neptune_mass*self.MoE_kg))},
                {'N':'PLUTO','u_mass':(self.G*(self.Pluto_mass*self.MoE_kg))},
                {'N':'HAUMEA','u_mass':(self.G*(self.Haumea_mass*self.MoE_kg))},
                {'N':'MAKEMAKE','u_mass':(self.G*(self.Makemake_mass*self.MoE_kg))},
                {'N':'ERIS','u_mass':(self.G*(self.Eris_mass*self.MoE_kg))}
                ]


             #   {'N':'LUNAR','u_mass':(self.G*(self.moons['EARTH']['mass']))}
              #  ]

    #    ln = ['LUNA','LUNAR']

        individual_pulls_X = [] #manually add suns pull to target planet for compatibility with previous code logic..handled it in the for loop
        individual_pulls_Y = []
        individual_pulls_Z = []


        if name: #the target
            #if name in moons:
            if name in ln:
                if days:
                    y = self.barycentric('earth',days)
                    m = self.lunars('earth',days)
                else:
                    y = self.barycentric('earth')
                    m = self.lunars('earth')
                r_global_moon_X = y['X_bary'] + abs(m['X'])
                r_global_moon_Y = y['Y_bary'] + abs(m['Y'])
                r_global_moon_Z = y['Z_bary'] + abs(m['Z'])

                vector_r_global_moon = [r_global_moon_X,r_global_moon_Y,r_global_moon_Z]
                vector_r_sun_bary = [y['sun_baryc_X'],y['sun_baryc_Y'],y['sun_baryc_Z']]


                for _,idx in enumerate(vallues):
                    if vallues[_]['N']=='LUNAR': #cannot have i fluence over itself
                        continue

                    if vallues[_]['N']==values[0]: #Sol
                        r_chord_sun_3 = vectors.magn_vect(vector_r_global_moon,vector_r_sun_bary)#luna is the target here
                        r_chord_sun = math.pow(r_chord_sun_3[8],3)
                        relative_sun_X = y['sun_baryc_X'] - r_global_moon_X
                        relative_sun_Y = y['sun_baryc_Y'] - r_global_moon_Y
                        relative_sun_Z = y['sun_baryc_Z'] - r_global_moon_Z
                        u_mass_sun = vallues[0]['u_mass']
                        pull_sun_X = ((u_mass_sun/r_chord_sun)*relative_sun_X)
                        pull_sun_Y = ((u_mass_sun/r_chord_sun)*relative_sun_Y) #projection into the X,Y,Z axis
                        pull_sun_Z = ((u_mass_sun/r_chord_sun)*relative_sun_Z)
                        individual_pulls_X.append(pull_sun_X)
                        individual_pulls_Y.append(pull_sun_Y)
                        individual_pulls_Z.append(pull_sun_Z)
                        continue

                    ##planets
                    if days:
                        retur = self.barycentric(vallues[_]['N',days])#the puller flr the planets
                    else:
                        retur = self.barycentric(vallues[_]['N'])

                    vector_puller_r = [retur['X_bary'],retur['Y_bary'],retur['Z_bary']] 

                    r_chord_3 = vectors.magn_vect(vector_r_global_moon,vector_puller_r)
                    r_chord = math.pow(r_chord_3[8],3)
                    relative_X = retur['X_bary'] - r_global_moon_X
                    relative_Y = retur['Y_bary'] - r_global_moon_Y
                    relative_Z = retur['Z_bary'] - r_global_moon_Z
                    u_mass = vallues[_]['u_mass']

                    pull_X = ((u_mass/r_chord)*relative_X)
                    pull_Y = ((u_mass/r_chord)*relative_Y)
                    pull_Z = ((u_mass/r_chord)*relative_Z)
                    individual_pulls_X.append(pull_X)
                    individual_pulls_Y.append(pull_Y)
                    individual_pulls_Z.append(pull_Z)

                acceleration_X = sum(individual_pulls_X)
                acceleration_Y = sum(individual_pulls_Y)
                acceleration_Z = sum(individual_pulls_Z)

                return acceleration_X,acceleration_Y,acceleration_Z

            ##SOL##


            if name==vallues[0]['N']: #Sol
                '''the net grav acc for Sol as the target'''
                if days:
                    retu = self.baryc_sun(days)
                else:
                    retu = self.baryc_sun()

                for _,idx in enumerate(vallues):
                    if vallues[_]['N']==vallues[0]['N']:
                        continue

   #                 if vallues[_]['N']=='LUNAR':
    #                    if days:
     #                       y = self.barycentric('earth',days)
      #                      m = self.lunars('earth',days)
       #                 else:
        #                    y = self.barycentric('earth')
         #                   m = self.lunars('earth')
          #              
           #             #m = self.lunars('earth')
#
 #                       r_global_moon_X = y['X_bary'] + abs(m['X'])
#
 #                       r_global_moon_Y = y['Y_bary'] + abs(m['Y'])
#
 #                       r_global_moon_Z = y['Z_bary'] + abs(m['Z']) #barycentric for universal..althoughi used barycentric because of the SSB get me?
#
#
 #                       r_global_magn = vectors.magn_vect([r_global_moon_X,r_global_moon_Y,r_global_moon_Z])
#
 #                       r_lunar_3 = math.sqrt(math.pow((r_global_moon_X-retu['X_s']),2) + math.pow((r_global_moon_Y-retu['Y_s']),2) + math.pow((r_global_moon_Z-retu['Z_s']),2)) #lunar
  #                      r_chord_lunar = math.pow(r_lunar_3,3)
   #                     relative_r_X_lunar = r_global_moon_X - retu['X_s']
    #                    relative_r_Y_lunar = r_global_moon_Y - retu['Y_s']
#
 #                       relative_r_Z_lunar = r_global_moon_Z - retu['Z_s']
  #                      u_mass_lunar = vallues[17]['u_mass'] #lunar
   #                     pull_X_lunar = ((u_mass_lunar/r_chord_lunar)*relative_r_X_lunar) #force projection
    #                    pull_Y_lunar = ((u_mass_lunar/r_chord_lunar)*relative_r_Y_lunar)
     #                   pull_Z_lunar = ((u_mass_lunar/r_chord_lunar)*relative_r_Z_lunar)
      #                  individual_pulls_X.append(pull_X_lunar)
       #                 individual_pulls_Y.append(pull_Y_lunar)
        #                individual_pulls_Z.append(pull_Z_lunar)
#
 #                       continue


                    if days:
                        retur = self.barycentric(vallues[_]['N'],days)
                    else:
                        retur = self.barycentric(vallues[_]['N']) #the puller
                    
                    r_chord_3 = math.sqrt(math.pow((retur['X_bary']-retu['X_s']),2) + math.pow((retur['Y_bary']-retu['Y_s']),2) + math.pow((retur['Z_bary']-retu['Z_s']),2))
                    r_chord = math.pow(r_chord_3,3)
                    relative_r_X = retur['X_bary'] - retu['X_s']
                    relative_r_Y = retur['Y_bary'] - retu['Y_s']
                    relative_r_Z = retur['Z_bary'] - retu['Z_s']
                    u_mass = vallues[_]['u_mass']
                    pull_X = ((u_mass/r_chord)*relative_r_X) #force factorprojected into the X_axis and so on....
                    pull_Y = ((u_mass/r_chord)*relative_r_Y)
                    pull_Z = ((u_mass/r_chord)*relative_r_Z)

                    #individual_pulls_X.append(pull_sun_X)
                    individual_pulls_X.append(pull_X)
                    individual_pulls_Y.append(pull_Y)
                    individual_pulls_Z.append(pull_Z)

                acceleration_a_X = sum(individual_pulls_X)#sum of all individual pulls on planet X
                acceleration_a_Y = sum(individual_pulls_Y)
                acceleration_a_Z = sum(individual_pulls_Z)

                return acceleration_a_X,acceleration_a_Y,acceleration_a_Z ###for Sol the sun



####the defailt fallback log8c###

            if days:
                retu = self.barycentric(name,days) #time actuvated
            else:
                retu = self.barycentric(name) #thw real time xyz for trget planet l..which also contains the SSB state values for the sun.
            for _,dictio in enumerate(vallues):
                if vallues[_]['N']==name:
                    continue
                if vallues[_]['N']==values[0]: #sun
                    r_chord_sun_3 = math.sqrt(math.pow((retu['sun_baryc_X']-retu['X_bary']),2) + math.pow((retu['sun_baryc_Y']-retu['Y_bary']),2) + math.pow((retu['sun_baryc_Z']-retu['Z_bary']),2))
                    r_chord_sun = math.pow(r_chord_sun_3,3)
                    relative_sun_X = retu['sun_baryc_X'] - retu['X_bary']
                    relative_sun_Y = retu['sun_baryc_Y'] - retu['Y_bary']
                    relative_sun_Z = retu['sun_baryc_Z'] - retu['Z_bary']
                    u_mass_sun = vallues[0]['u_mass']
                    pull_sun_X = ((u_mass_sun/r_chord_sun)*relative_sun_X)
                    pull_sun_Y = ((u_mass_sun/r_chord_sun)*relative_sun_Y)
                    pull_sun_Z = ((u_mass_sun/r_chord_sun)*relative_sun_Z)
                    individual_pulls_X.append(pull_sun_X)
                    individual_pulls_Y.append(pull_sun_Y)
                    individual_pulls_Z.append(pull_sun_Z)
                    continue

#                if vallues[_]['N']=='LUNAR':
 #                   if days:
  #                      y = self.barycentric('earth',days)
   #                     m = self.lunars('earth',days)
    #                else:
     #                   y = self.barycentric('earth')
      #                  m = self.lunars('earth')
       #            # m = self.lunars('earth')
        #            r_global_moon_X = y['X_bary'] + abs(m['X'])
         #           r_global_moon_Y = y['Y_bary'] + abs(m['Y'])
          #          r_global_moon_Z = y['Z_bary'] + abs(m['Z']) #barycentric for universal..although i used barycentric because of the SSB get me?
           #         r_global_magn = vectors.magn_vect([r_global_moon_X,r_global_moon_Y,r_global_moon_Z])
#
 #                   r_lunar_3 = math.sqrt(math.pow((r_global_moon_X-retu['X_bary']),2) + math.pow((r_global_moon_Y-retu['Y_bary']),2) + math.pow((r_global_moon_Z-retu['Z_bary']),2)) #lunar
  #                  r_chord_lunar = math.pow(r_lunar_3,3)
   #                 relative_r_X_lunar = r_global_moon_X - retu['X_bary']
    #                relative_r_Y_lunar = r_global_moon_Y - retu['Y_bary']
     #               relative_r_Z_lunar = r_global_moon_Z - retu['Z_bary']
      #              u_mass_lunar = vallues[17]['u_mass'] #lunar
#
 #                   pull_X_lunar = ((u_mass_lunar/r_chord_lunar)*relative_r_X_lunar) #force projection
  #                  pull_Y_lunar = ((u_mass_lunar/r_chord_lunar)*relative_r_Y_lunar)
   #                 pull_Z_lunar = ((u_mass_lunar/r_chord_lunar)*relative_r_Z_lunar)
#
 #                   individual_pulls_X.append(pull_X_lunar)
  #                  individual_pulls_Y.append(pull_Y_lunar)
   #                 individual_pulls_Z.append(pull_Z_lunar)
    #                continue



                if days:
                    retur = self.barycentric(vallues[_]['N'],days)
                else:
                    retur = self.barycentric(vallues[_]['N']) #the puller
                r_chord_3 = math.sqrt(math.pow((retur['X_bary']-retu['X_bary']),2) + math.pow((retur['Y_bary']-retu['Y_bary']),2) + math.pow((retur['Z_bary']-retu['Z_bary']),2))
                r_chord = math.pow(r_chord_3,3)
                relative_r_X = retur['X_bary'] - retu['X_bary']
                relative_r_Y = retur['Y_bary'] - retu['Y_bary']
                relative_r_Z = retur['Z_bary'] - retu['Z_bary']
                u_mass = vallues[_]['u_mass']

                pull_X = ((u_mass/r_chord)*relative_r_X) #force factorprojected into the X_axis and so on....
                pull_Y = ((u_mass/r_chord)*relative_r_Y)
                pull_Z = ((u_mass/r_chord)*relative_r_Z)

                #individual_pulls_X.append(pull_sun_X)
                individual_pulls_X.append(pull_X)
                individual_pulls_Y.append(pull_Y)                
                individual_pulls_Z.append(pull_Z)

            acceleration_a_X = sum(individual_pulls_X)#sum of all individual pulls on planet X
            acceleration_a_Y = sum(individual_pulls_Y)
            acceleration_a_Z = sum(individual_pulls_Z)

            return acceleration_a_X,acceleration_a_Y,acceleration_a_Z #  f'future¦past with {days}' if days else None



    def barycentric(self,name: str=None,days=None):
        '''applies the barycentric shift to the heliocentric coordonates X,Y,Z of orbits fxn. it uses meters and seconds the SI units..time is in days and if in seconds please convert first then pass the days value'''

        if name==None:
            console.print('[bold red]NAME CANT BE NONE/EMPTY[/bold red]')
            return

        moons = ['LUNAR']

        name = name.upper()


        #sun_barycentric = baryc_sun()
        try:
            if days:
                days = float(days)
        except ValueError:
            raise ValueError(f'the passed value for time is not suppotted. time given {days}')


        if name in moons:
            states_moons = self.lunars(name)
            return states_moons

        if name not in moons:

            if days:
                sun_barycentric = self.baryc_sun(days)
            else:
                sun_barycentric = self.baryc_sun()

            r_sun_SSB = math.sqrt(math.pow(sun_barycentric['X_s'],2) + math.pow(sun_barycentric['Y_s'],2) + math.pow(sun_barycentric['Z_s'],2))
            u_total = super().u_total() #gravitational parameter--total mass * universal gravitation constant G
            #spec_uhelio = super().spec_uhelio(name)

            if days:
                retu = super().orbits(name,None,days) #thw second argumwnt is fcdts..
            else:
                retu = super().orbits(name)

            v_X_bary = retu['v_Xhelio'] + sun_barycentric['v_X'] #barycentric velocity = heliocentric velocity + the Sun's velocity about the SSB
            v_Y_bary = retu['v_Yhelio'] + sun_barycentric['v_Y'] #(retu['v_X'] is the u_total perifocal velocity, not the SSB one)
            v_Z_bary = retu['v_Zhelio'] + sun_barycentric['v_Z']

            #total_mass_u = (self.G*sun_barycentric['total_mass'])
            spec_uhelio = super().spec_uhelio(name)

            X_bary = retu['X_helio'] + sun_barycentric['X_s']
            Y_bary = retu['Y_helio'] + sun_barycentric['Y_s']
            Z_bary = retu['Z_helio'] + sun_barycentric['Z_s']

            r_bary = math.sqrt(math.pow(X_bary,2)+math.pow(Y_bary,2)+math.pow(Z_bary,2)) # relative to SSB
            r_helio = math.sqrt(math.pow(retu['X_helio'],2)+math.pow(retu['Y_helio'],2)+math.pow(retu['Z_helio'],2)) #relative to heliocentric sun.
            #v_bary = math.sqrt(total_mass_u * ((2/(r_bary))-(1/(retu['a'])))) # the vis-viva equation..cant use the vis vuva to get barycentric velocity..
            v_bary = math.sqrt(math.pow(v_X_bary,2) + math.pow(v_Y_bary,2) + math.pow(v_Z_bary,2)) #the magnitude of the barycentric velocity vectors
            v_helio = math.sqrt(spec_uhelio * ((2/r_helio) - (1/retu['a']))) #heliocentric spee
            osculating_a = math.pow(((2/r_bary) - (math.pow(v_bary,2)/u_total)),-1) #live semi major axis a osculating element a...

            light_delay_sun_bary = r_bary/self.c_m_s
            light_delay_sun_helio = r_helio/self.c_m_s

            ##angular momentum and energy E##
            h_X = (Y_bary*v_Z_bary) - (Z_bary*v_Y_bary) #h SSB
            h_Y = (Z_bary*v_X_bary) - (X_bary*v_Z_bary)
            h_Z = (X_bary*v_Y_bary) - (Y_bary*v_X_bary)

            energy_bary = (math.pow(v_bary,2)/2) - (u_total/r_bary)
            h_bary = math.sqrt(math.pow(h_X,2) + math.pow(h_Y,2) + math.pow(h_Z,2))

            #e_X = 1/u_total*((v_bary**2-(u_total/r_bary))*(X_bary - ((X_bary*retu['v_X'])*retu['v_X'])))    #eccentric vector
            #e_Y = 1/u_total*((v_bary**2-(u_total/r_bary))*(Y_bary - ((Y_bary*retu['v_Y'])*retu['v_Y'])))
            #e_Z = 1/u_total*((v_bary**2-(u_total/r_bary))*(Z_bary - ((Z_bary*retu['v_Z'])*retu['v_Z'])))
            list_r = [X_bary,Y_bary,Z_bary]
            list_v = [v_X_bary,v_Y_bary,v_Z_bary]
            vec = Vectors()
            dot_r_v = vec.dot_vect(list_r,list_v)

            e_X = (1/u_total)*((math.pow(v_bary,2)-(u_total/r_bary))*X_bary - (dot_r_v*v_X_bary))    #eccentric vector
            e_Y = (1/u_total)*((math.pow(v_bary,2)-(u_total/r_bary))*Y_bary - (dot_r_v*v_Y_bary))
            e_Z = (1/u_total)*((math.pow(v_bary,2)-(u_total/r_bary))*Z_bary - (dot_r_v*v_Z_bary))
            mgn_e = math.sqrt(math.pow(e_X,2) + math.pow(e_Y,2) + math.pow(e_Z,2))   #eccentric osculating element                          
            osc_i = math.degrees(math.acos(h_Z/h_bary)) % 360
            epsilon = 1e-8
            degr = '°'
            #vectors = Vectors()
            if mgn_e<epsilon and osc_i<epsilon:  #equitorial circular orbit
                q = 'equitorial circular orbit'
                Omega = 0
                argof_perihelion = 0
                true_longitude = math.degrees(math.atan2(Y_bary,X_bary)) % 360
                true_anomaly = true_longitude
                argof_latitude = 0
                longof_periapsis = 0

            elif osc_i<epsilon and epsilon<mgn_e<1:   #equitorial elliptical orbit

                q = 'equitorial elliptical orbits'
                Omega = 0
                argof_perihelion = 0
                longof_periapsis = math.degrees(math.atan2(e_Y,e_X)) % 360
                #argof_perihelion = longofperiapsis
                true_longitude = math.degrees(math.atan2(Y_bary,X_bary)) % 360 #L
                true_anomaly = true_longitude
                argof_latitude = 0

            elif osc_i>epsilon and mgn_e<epsilon: #tilted criscular orbit
                o = 'inclined circular orbit'
                list_k = [0,0,1]
                list_h = [h_X,h_Y,h_Z]
                #vectors = Vectors(0,0,1,h_X,h_Y,h_Z)
                cross_n_vect = vectors.cross_vect(list_k,list_h)
                list_n_vect = [cross_n_vect[0],cross_n_vect[1],cross_n_vect[2]]
                list_r_vect = [X_bary,Y_bary,Z_bary]
                magn_n_r = vectors.magn_vect(list_n_vect,list_r_vect)
                dot_n_r = vectors.dot_vect(list_n_vect,list_r_vect)
                Omega = math.degrees(math.acos(cross_n_vect[0]/cross_n_vect[3])) % 360                                                      
                if cross_n_vect[1]<0: #node_vector component y less than zero
                    Omega = 360 - Omega

                argof_perihelion = 0
                longof_periapsis = 0
                true_longitude = 0
                argof_latitude = math.degrees(math.acos(dot_n_r/magn_n_r[4])) % 360 #u
                true_anomaly = argof_latitude
                if Z<0: #u is greater than 180 degrees
                    argof_latitude = 360 - argof_latitude
                    true_anomaly = argof_latitude

            elif osc_i>epsilon and epsilon<mgn_e<1: #General inclined elliptical orbit
                x = 'General case. inclined elliptical orbit'         

                ##General case inclined elliptical orbits###

                #degr = '°'
                #node vector,longitude of ascending nide and argument of perihelion
                #list_angularmoment = [h_X,h_Y,h_Z]
                #list_normalized_k = [0,0,1]
                #vectors = Vectors(list_normalized_k,list_angularmoment)
                #cross = vectors.icross_vect()
                #if q:
                 #   print(q)
                  #  node_vectX = 0
                   # node_vectY = 0
                    #node_VectZ = 0

                #vectors = Vectors(0,0,1,h_X,h_Y,h_Z)
                list_k = [0,0,1]
                list_h = [h_X,h_Y,h_Z]
                cross_node_vect = vectors.cross_vect(list_k,list_h)
                argof_latitude = 0
                true_longitude = 0
                longof_periapsis = 0

                ##omega##
                node_vectX = cross_node_vect[0]
                node_vectY = cross_node_vect[1]
                node_vectZ = cross_node_vect[2]
                Omega = math.degrees(math.acos(node_vectX/cross_node_vect[3])) % 360
                if node_vectY<0: #
                    Omega = 360 - Omega

                ##argument kf perihelion###
                list_n = [node_vectX,node_vectY,node_vectZ]
                list_e = [e_X,e_Y,e_Z]

                dot_n_e = vectors.dot_vect(list_n,list_e)
                magn_n_e = vectors.magn_vect(list_n,list_e)

                argof_periapsis = math.degrees(math.acos(dot_n_e/magn_n_e[4])) % 360 #periapsis because barycentric else perihelion
                if e_Z<0: #the perihelion is below 180<perih<360
                    argof_periapsis = 360 - argof_periapsis

                ##true anomaly##
                list_r = [X_bary,Y_bary,Z_bary]
                dot_e_r = vectors.dot_vect(list_e,list_r)
                magn_e_r = vectors.magn_vect(list_e,list_r)
                true_anomaly = math.degrees(math.acos(dot_e_r/magn_e_r[4])) % 360
                list_v = [v_X_bary,v_Y_bary,v_Z_bary]
                dot_r_v = vectors.dot_vect(list_r,list_v)
                if dot_r_v < 0: #object falling to perihelion
                    trv = 'falling to perihelion'
                    true_anomaly = 360 - true_anomaly

                elif dot_r_v >= 0: #object climbing to aphelion
                    trv = 'climbing to aphelion'


            if name!='EARTH':

                if days:
                    sun_barycentric = self.baryc_sun(days)
                else:
                    sun_barycentric = self.baryc_sun()
                
                X_E_bary = retu['X_E_helio'] + sun_barycentric['X_s']
                Y_E_bary = retu['Y_E_helio'] + sun_barycentric['Y_s']
                Z_E_bary = retu['Z_E_helio'] + sun_barycentric['Z_s']

                d_bary = math.sqrt(math.pow((X_bary-X_E_bary),2) + math.pow((Y_bary-Y_E_bary),2) + math.pow((Z_bary-Z_E_bary),2)) # relative to SSB
                d_helio = math.sqrt(math.pow((retu['X_helio']-retu['X_E_helio']),2) + math.pow((retu['Y_helio']-retu['Y_E_helio']),2) + math.pow((retu['Z_helio']-retu['Z_E_helio']),2)) # relative to heliocentric sun
                light_delay_bary = d_bary/self.c_m_s # light delay in seconds
                light_delay_helio = d_helio/self.c_m_s # light delay relative to heliocenter._
                return {'name':retu['N'],'X_helio':retu['X_helio'],'Y_helio':retu['Y_helio'],'Z_helio':retu['Z_helio'],'X_bary':X_bary,'Y_bary':Y_bary,'Z_bary':Z_bary,'X_E_bary':X_E_bary,'Y_E_bary':Y_E_bary,'Z_E_bary':Z_E_bary,'r_bary':r_bary,'v_bary':v_bary,'d_bary':d_bary,'light_delay_bary':light_delay_bary,'r_helio':r_helio,'v_helio':v_helio,'light_delay_helio':light_delay_helio,'light_delay_sun_bary':light_delay_sun_bary,'light_delay_sun_helio':light_delay_sun_helio,'d_helio':d_helio,'a':retu['a'],'b':retu['b'],'M':retu['M'],'E':retu['E'],'sun_baryc_X':sun_barycentric['X_s'],'sun_baryc_Y':sun_barycentric['Y_s'],'sun_baryc_Z':sun_barycentric['Z_s'],'r_sun_SSB':r_sun_SSB,'osc_a':osculating_a,'resp_day':retu['resp_day'],'v_X':v_X_bary,'v_Y':v_Y_bary,'v_Z':v_Z_bary,'v_Xhelio':retu['v_Xhelio'],'v_Yhelio':retu['v_Yhelio'],'v_Zhelio':retu['v_Zhelio'],'h':h_bary,'h_X':h_X,'h_Y':h_Y,'h_Z':h_Z,'energy_bary':energy_bary,'energyhelio':retu['energy_helio'],'osc_i':osc_i,'e_X':e_X,'e_Y':e_Y,'e_Z':e_Z,'mgn_eccentricity':mgn_e,'Omega':Omega,'argof_periapsis':argof_periapsis,'true_anomaly':true_anomaly,'longof_periapsis':longof_periapsis,'argof_latitude':argof_latitude,'true_longitude':true_longitude,'osc_ihelio':retu['osc_i'],'mgn_eccentricityhelio':retu['mgn_eccentricity'],'Omegahelio':retu['Omega'],'osc_ahelio':retu['osc_a'],'argof_perihelion':retu['argumentof_perihelion'],'e_Xhelio':retu['e_X'],'e_Yhelio':retu['e_Y'],'e_Zhelio':retu['e_Z'],'true_anomalyhelio':retu['true_anomaly'],'longof_periapsishelio':retu['longof_periapsis'],'argof_latitudehelio':retu['argof_latitude'],'true_longitudehelio':retu['true_longitude'],'h_helio':retu['h'],'Unix_time':retu['Unix_time'],'mode':f'future¦past used with {days} days' if days else None,'sun_vX':sun_barycentric['v_X'],'sun_vY':sun_barycentric['v_Y'],'sun_vZ':sun_barycentric['v_Z']}

            else: ##if name==earth  

                return {'name':retu['N'],'X_helio':retu['X_helio'],'Y_helio':retu['Y_helio'],'Z_helio':retu['Z_helio'],'X_bary':X_bary,'Y_bary':Y_bary,'Z_bary':Z_bary,'r_bary':r_bary,'v_bary':v_bary,'a':retu['a'],'b':retu['b'],'M':retu['M'],'E':retu['E'],'sun_baryc_X':sun_barycentric['X_s'],'sun_baryc_Y':sun_barycentric['Y_s'],'sun_baryc_Z':sun_barycentric['Z_s'],'r_helio':r_helio,'v_helio':v_helio,'light_delay_sun_bary':light_delay_sun_bary,'light_delay_sun_helio':light_delay_sun_helio,'r_sun_SSB':r_sun_SSB,'resp_day':retu['resp_day'],'osc_a':osculating_a,'v_X':v_X_bary,'v_Y':v_Y_bary,'v_Z':v_Z_bary,'v_Xhelio':retu['v_Xhelio'],'v_Yhelio':retu['v_Yhelio'],'h':h_bary,'h_X':h_X,'h_Y':h_Y,'h_Z':h_Z,'energy_bary':energy_bary,'v_Zhelio':retu['v_Zhelio'],'osc_i':osc_i,'e_X':e_X,'e_Y':e_Y,'e_Z':e_Z,'mgn_eccentricity':mgn_e,'Omega':Omega,'argof_periapsis':argof_periapsis,'true_anomaly':true_anomaly,'longof_periapsis':longof_periapsis,'argof_latitude':argof_latitude,'true_longitude':true_longitude,'osc_ahelio':retu['osc_a'],'osc_ihelio':retu['osc_i'],'mgn_eccentricityhelio':retu['mgn_eccentricity'],'Omegahelio':retu['Omega'],'e_Xhelio':retu['e_X'],'e_Yhelio':retu['e_Y'],'e_Zhelio':retu['e_Z'],'argof_perihelion':retu['argumentof_perihelion'],'true_anomalyhelio':retu['true_anomaly'],'longof_periapsishelio':retu['longof_periapsis'],'argof_latitudehelio':retu['argof_latitude'],'true_longitudehelio':retu['true_longitude'],'energyhelio':retu['energy_helio'],'h_helio':retu['h'],'Unix_time':retu['Unix_time'],'mode':f'future¦past used with {days} days' if days else None,'sun_vX':sun_barycentric['v_X'],'sun_vY':sun_barycentric['v_Y'],'sun_vZ':sun_barycentric['v_Z']} #if mode is none then time was not used



 #   def baryc_sun_daus(self):
  #      '''calculates the barycentric shift of the sun using AU'''
   #     name = name.upper()
#
 #       if name==None:
  #          console.print('[bold red]NAME CANNOT BE NONE/EMPTY[/bold red]')
   #         sys.exit(0)

    #    values = ['JUPITER','SATURN','URANUS','NEPTUNE']
#
 #       #vallues = {'MERCURY':88,'VENUS':225,'EARTH':365,'MARS':687,'CERES':1681,'JUPITER':4333,'SATURN':10759,'URANUS':30685,'NEPTUNE':60190,'PLUTO':90465,'ERIS':204174}
  #      vallues = []
#
 #       
#
 #       for _ in values:
  #         vallues.append(super().orbits(_)) # orbits returns the real mean anomaly
#
 #       day_J = (vallues[0]['M']/(2*math.pi))*self.Jupiter_P*self.earthperiod_d
  #      day_S = (vallues[1]['M']/(2*math.pi))*self.Saturn_P*self.earthperiod_d
   #     day_U = (vallues[2]['M']/(2*math.pi))*self.Uranus_P*self.earthperiod_d
    #    day_N = (vallues[3]['M']/(2*math.pi))*self.Neptune_P*self.earthperiod_d
#
 #       retu = self.baryc_sun() # only to get the mass
  #      mass = retu['total_mass'] #jsun
#
#


        #X_sun_bary = (retu['X_s']/self.AU_m)
        #Y_sun_bary = (retu['Y_s']/self.AU_m)
        #Z_sun_bary = (retu['Z_s']/self.AU_m)
#
        
 #       return {'X_saun':X_sun_bary,'Y_saun':Y_sun_bary,'Z_saun':Z_sun_bary,'Unix_time':retu['Unix_time'],'N':'Sun','desc':'GETS THE BARYCENTRIC SHIFT OF THE SUN IN REAL TIME BUT USING AU.'}
#
#

    def full_list_bary(self,name: str=None):
        '''gets full list of the XYZ barycentric coordinates of celestial objecte using seconds'''
        ##full coordinates imolemented in astlo module..just for testing logic##


        #name = name.upper()
        

        values = ['MERCURY','VENUS','EARTH','MARS','VESTA','CERES','PALLAS','HYGIEA','JUPITER','SATURN','URANUS','NEPTUNE','PLUTO','HAUMEA','MAKEMAKE','ERIS']

        if name==None:
            raise ValueError('NAME CANNOT BE NONE/EMPTY') #was console.print + sys.exit(0), which also closed the program that called astlo

        name = name.upper()

        retu = super().orbits(name,1) # fcdts is activated

        return retu ##### continue







    def stumpff(self,z):
        #gets the cosine and sine like energies.##
        #z = max(z,-100.0)   #Never let z go below -100
        fact_2 = math.factorial(2)
        fact_3 = math.factorial(3)
        fact_4 = math.factorial(4)
        fact_5 = math.factorial(5)
        fact_6 = math.factorial(6)
        fact_7 = math.factorial(7)
        fact_8 = math.factorial(8)
        fact_9 = math.factorial(9)
        fact_10 = math.factorial(10)
        fact_11 = math.factorial(11)
        fact_12 = math.factorial(12)
        fact_13 = math.factorial(13)
        fact_14 = math.factorial(14)
        fact_15 = math.factorial(15)
        fact_16 = math.factorial(16)
        fact_17 = math.factorial(17)
        fact_18 = math.factorial(18)
        fact_19 = math.factorial(19)
        fact_20 = math.factorial(20)
        fact_21 = math.factorial(21)

        if z==0:
            C_z = 1/fact_2
            S_z = 1/fact_3


        if abs(z)<=1e-5: #parabolic path ::near zero..
            
            #C_z = (1.0/6.0) - (z/120.0) + (z**2/5040.0) - (z**3/362880.0) + (z**4/39916800)
            #S_z = ((1.0/6.0) - (z/120.0) + (z**2/5040.0) - (z**3/362880.0) + (z**4/39916800))*(1.0/7.0)
        #elif 0<z<1e-5:
         #   C_z = 1/fact_2
          #  S_z = 1/fact_3

        #if z > 0 and z > 1e-5: #elliptical path
            C_z =  ((1/fact_2) - (z/fact_4) + (math.pow(z,2)/fact_6) - (math.pow(z,3)/fact_8) + (math.pow(z,4)/fact_10) - (math.pow(z,5)/fact_12) + (math.pow(z,6)/fact_14) - (math.pow(z,7)/fact_16) + (math.pow(z,8)/fact_18) - (math.pow(z,9)/fact_20))
            S_z = ((1/fact_3) - (z/fact_5) + (math.pow(z,2)/fact_7) - (math.pow(z,3)/fact_9) + (math.pow(z,4)/fact_11) - (math.pow(z,5)/fact_13) + (math.pow(z,6)/fact_15) - (math.pow(z,7)/fact_17) + (math.pow(z,8)/fact_19) - (math.pow(z,9)/fact_21))

        if z > 1e-5: #elliptical

            sz = math.sqrt(z)
            C_z = (1 - math.cos(sz))/z
            S_z = ((sz - math.sin(sz))/(math.pow(sz,3)))

        #if z<-1e-5: #parabolic path ::near zero..
            #C_z = 1/2 1/6?
            #S_z = 1/6
            #C_z = (1.0/6.0) - (z/120.0) + (z**2/5040.0) - (z**3/362880.0) + (z**4/39916800)
            #S_z = ((1.0/6.0) - (z/120.0) + (z**2/5040.0) - (z**3/362880.0) + (z**4/39916800))*(1.0/7.0)

        if z < -1e-5: # hyperbolic path <0
       #     C_z =  ((1/fact_2) + (z/fact_4) + (math.pow(z,2)/fact_6) + (math.pow(z,3)/fact_8) + (math.pow(z,4)/fact_10) + (math.pow(z,5)/fact_12) + (math.pow(z,6)/fact_14) + (math.pow(z,7)/fact_16) + (math.pow(z,8)/fact_18) + (math.pow(z,9)/fact_20))
        #    S_z = ((1/fact_3) + (z/fact_5) + (math.pow(z,2)/fact_7) + (math.pow(z,3)/fact_9) + (math.pow(z,4)/fact_11) + (math.pow(z,5)/fact_13) + (math.pow(z,6)/fact_15) + (math.pow(z,7)/fact_17) + (math.pow(z,8)/fact_19) + (math.pow(z,9)/fact_21))
            sz = math.sqrt(-z)
            C_z = ((math.cosh(sz) - 1.0)/(-z)) #cosh returns the inverse hyperbolic cosine of sz
            S_z = ((math.sinh(sz) - sz)/(math.pow(sz,3)))  #sinh the inverse hyperbolic sine of sz

        
            
        return {'C_z':C_z,'S_z':S_z}




    def deriv_stumpff(self,z):
        '''the derivatives for the stumpff series'''



       # fact_2 = math.factorial(2)
        #fact_3 = math.factorial(3)
      #  fact_4 = math.factorial(4)
    #    fact_5 = math.factorial(5)
     #   fact_6 = math.factorial(6)
        #fact_7 = math.factorial(7)
       # fact_8 = math.factorial(8)
        #fact_9 = math.factorial(9)
      #  fact_10 = math.factorial(10)
        #fact_11 = math.factorial(11)
     #   fact_12 = math.factorial(12)
        #fact_13 = math.factorial(13)
    #    fact_14 = math.factorial(14)
        #fact_15 = math.factorial(15)
       # fact_16 = math.factorial(16)
        #fact_17 = math.factorial(17)
      #  fact_18 = math.factorial(18)
        #fact_19 = math.factorial(19)
        #fact_20 = math.factorial(20)
        #fact_21 = math.factorial(21)

        if 0<=z<1e-5:
            C_z = -(1/24)
            S_z = -(1/120)

        else:
            C = self.stumpff(z)
            S = self.stumpff(z)
            C_z = (1/(2*z))*(S['S_z']-(2*C['C_z']))
            S_z = (1/(2*z))*(C['C_z']-(3*S['S_z']))

        #elif 0<z<1e-5:
         #   C_z = -(1/24)
          #  S_z = -(1/120)




       # if z>0 and z>1e-5:
            #C_z = (-(1/24) + (z/360) - (math.pow(z,2)/13440) + (math.pow(z,3)/907200) - (math.pow(z,4)/95800320) + (math.pow(z,5)/14529715200) - (math.pow(z,6)/2988969984000) + (math.pow(z,7)/800296713216000) - (math.pow(z,8)/270322445352960000) + (math.pow(z,9)/112400072777760768000))
            #S_z = (-(1/120) + (z/2520) - (math.pow(z,2)/120960) + (math.pow(z,3)/9979200) - (math.pow(z,4)/1245404160) + (math.pow(z,5)/217945728000) - (math.pow(z,6)/50812489728000) + (math.pow(z,7)/15205637551104000) - (math.pow(z,8)/5676771352412160000) + (math.pow(z,9)/2585201673888497664000))


     #   if z<0:
      #      C_z = (-(1/24) + (z/360) - (math.pow(z,2)/13440) + (math.pow(z,3)/907200) - (math.pow(z,4)/95800320) + (math.pow(z,5)/14529715200) - (math.pow(z,6)/2988969984000) + (math.pow(z,7)/800296713216000) - (math.pow(z,8)/270322445352960000) + (math.pow(z,9)/112400072777760768000))
       #     S_z = (-(1/120) + (z/2520) - (math.pow(z,2)/120960) + (math.pow(z,3)/9979200) - (math.pow(z,4)/1245404160) + (math.pow(z,5)/217945728000) - (math.pow(z,6)/50812489728000) + (math.pow(z,7)/15205637551104000) - (math.pow(z,8)/5676771352412160000) + (math.pow(z,9)/2585201673888497664000))


        return {'der_C':C_z,'der_S':S_z}






    def future(self,objname: str=None,days: int=None,real=None):
        '''gets the future coordinates for planet X after time t'''

        #seconds = (days*24*60*60)
        #time_now=time.time()
        #delta_t  = time_now + seconds   #the change in days since now the epoch and the last das
        #objname = objname.upper()

        ##LAMBERTS IS HELIOCENTRIC###

        if objname==None and days==None:
            raise ValueError('NAME AND DAYS ADDED/SUBTRACTED CANT BE NONE') #was console.print + sys.exit(0), which also closed the program that called astlo

        objname = objname.upper()

        retu = super().orbits(objname,None,days) # if it can get the positive value, the  it can also get the negative value
        baryc = self.baryc_sun(days) #the sun offset at the same time as the planet
        #total_mass_u = self.G*baryc['total_mass']
        u_total = super().u_total()
        spec_uhelio = super().spec_uhelio(objname)  #use suns paramter

        X_bary = retu['X_helio'] + baryc['X_s']
        Y_bary = retu['Y_helio'] + baryc['Y_s']
        Z_bary = retu['Z_helio'] + baryc['Z_s']


        r_bary = math.sqrt(math.pow(X_bary,2) + math.pow(Y_bary,2) + math.pow(Z_bary,2))
        r_helio = math.sqrt(math.pow(retu['X_helio'],2) + math.pow(retu['Y_helio'],2) + math.pow(retu['Z_helio'],2))

        #v_bary = math.sqrt(total_mass_u * ((2/(r_bary))-(1/(retu['a']))))
        v_bary = math.sqrt(math.pow(retu['v_Xhelio'] + baryc['v_X'],2) + math.pow(retu['v_Yhelio'] + baryc['v_Y'],2) + math.pow(retu['v_Zhelio'] + baryc['v_Z'],2)) #heliocentric velocity + the Sun's velocity about the SSB
        v_helio = math.sqrt(spec_uhelio * ((2/r_helio)-(1/retu['a'])))
        osculating_a = math.pow(((2/r_bary) - (math.pow(v_bary,2)/u_total)),-1)


        light_delay_sun_bary = r_bary/self.c_m_s
        light_delay_sun_helio = r_helio/self.c_m_s

        ##HELIOCENTRIC FOR NOW## the real osc elements



        if real: ##rotating the raw perifocal with real osculating elements
            omecos = math.cos(math.radians(retu['Omega'])) # the longtude of ascending node/Omega
            omesin = math.sin(math.radians(retu['Omega']))
            wsin = math.sin(math.radians(retu['argumentof_perihelion']))
            wcos = math.cos(math.radians(retu['argumentof_perihelion']))
            isin = math.sin(math.radians(retu['osc_i']))
            icos = math.cos(math.radians(retu['osc_i']))

            X_real = (retu['x_pfcal'] * ((omecos*wcos) - (omesin*wsin*icos))) - (retu['y_pfcal'] * ((omecos*wsin) + (omesin*wcos*icos)))
            Y_real = (retu['x_pfcal'] * (omesin*wcos + (omecos*wsin*icos))) + (retu['y_pfcal'] * ((omecos*wcos*icos) - (omesin*wsin)))
            Z_real = (retu['x_pfcal'] * (wsin*isin)) + (retu['y_pfcal'] * (wcos*isin))

            l_t = [X_real,Y_real,Z_real]

            magn_rhel = vectors.magn_vect(l_t)


            return {'X_bary':X_bary,'Y_bary':Y_bary,'Z_bary':Z_bary,'Unix_time':retu['Unix_time'],'X_helio':retu['X_helio'],'Y_helio':retu['Y_helio'],'Z_helio':retu['Z_helio'],'daysaddsub':retu['daysaddsub'],'r_bary':r_bary,'v_bary':v_bary,'v_helio':v_helio,'r_helio':r_helio,'light_delay_sun_bary':light_delay_sun_bary,'light_delay_sun_helio':light_delay_sun_helio,'osc_a':osculating_a,'v_X':retu['v_X'],'v_Y':retu['v_Y'],'v_Z':retu['v_Z'],'v_Xhelio':retu['v_Xhelio'],'v_Yhelio':retu['v_Yhelio'],'v_Zhelio':retu['v_Zhelio'],'X_helioreal':X_real,'Y_helioreal':Y_real,'Z_helioreal':Z_real,'magnhel_rl':magn_rhel,'desc':'gives the coordinates for planet X after time t'}


            

        return {'X_bary':X_bary,'Y_bary':Y_bary,'Z_bary':Z_bary,'Unix_time':retu['Unix_time'],'X_helio':retu['X_helio'],'Y_helio':retu['Y_helio'],'Z_helio':retu['Z_helio'],'daysaddsub':retu['daysaddsub'],'r_bary':r_bary,'v_bary':v_bary,'v_helio':v_helio,'r_helio':r_helio,'light_delay_sun_bary':light_delay_sun_bary,'light_delay_sun_helio':light_delay_sun_helio,'osc_a':osculating_a,'v_X':retu['v_X'],'v_Y':retu['v_Y'],'v_Z':retu['v_Z'],'v_Xhelio':retu['v_Xhelio'],'v_Yhelio':retu['v_Yhelio'],'v_Zhelio':retu['v_Zhelio'],'desc':'gives the coordinates for planet X after time t'} #static osculating elements


    def hohmann(self,name: str=None):
        '''the hohmann way for the transfer orbit'''
        ##For a perfect hohmann transfer, the phase angle upon arrival sho7ld be exactly 180°##
        name = name.upper()
        obj = ['earth','venus']
        retu = []

        for n in obj:
            retu.append(self.barycentric(n))
            pass
        pass












    def ldiscontinued(self,name: str=None,days: int=None,longway=None):
        '''launch simulations. Lamberts problem'''
        ##TRIED IT A COUPE OF TIMES. BOTH BISWCTION AND NEWTON RAPHSON WAY..SOMETHING BREAKS THE LOGIC##
        #TRYING HOFFMAN TRANSFER NEXT##

        #name = name.upper()

        if name==None:
            raise ValueError('NAME CANNOT BE NONE') #was console.print + sys.exit(0), which also closed the program that called astlo


        name = name.upper()

        #start = time.perf_counter()

        retu = self.barycentric('EARTH') # earth XYZ coord now.
        retur = self.future(name,days) #future coordinates for choosen planet
        delta_t = days*24*60*60

        ##scalar constants##
        r_earth = retu['r_helio']
        #r_X = math.sqrt(math.pow(fut_coord['X_bary'],2) + math.pow(fut_coord['Y_helio'],2) + math.pow(fut_coord['Z_bary'],2))
        r_X = retur['r_helio']

        chord = math.sqrt(math.pow((retur['X_helio']-retu['X_helio']),2) + math.pow((retur['Y_helio']-retu['Y_helio']),2) + math.pow((retur['Z_helio']-retu['Z_helio']),2)) #the staright line distance btwn earth and future coord for planet ? eaucladian distance
        s = (r_earth + r_X + chord)/2 #semi perimeter s

        #Transfer angle v#
        #delta_theta_raw = math.acos(((retur['X_helio']*retu['X_helio']) + (retur['Y_helio']*retu['Y_helio']) + (retur['Z_helio']*retu['Z_helio']))/(retu['r_helio']*retur['r_helio']))# not needed
   #     z_comp = ((retu['X_helio']*retur['Y_helio']) - (retu['Y_helio']*retur['X_helio'])) #not need3d

  #      shrtway = 1 if z_comp >= 0 else None#if z comp of cross prod is positive/0 then shortway
 #       lngway = 2 if z_comp < 0 else None# if z comp is n3gative then long way
#
      #  if delta_theta_raw > math.pi:
     #      delta_theta_raw = (math.pi*2) - delta_theta_raw #default is the short way


        #if longway: #only use if required
         #   if delta_theta_raw > math.pi:
          #      delta_theta_raw = delta_theta_raw
           # else:
            #    delta_theta_raw = (math.pi*2) - delta_theta_raw
            

        #signum = 1 if delta_theta_raw < math.pi else -1 if delta_theta_raw > math.pi else print('Error: sin(delta theta raw) is zero.') if math.sin(delta_theta_raw)==0 else None

        #A = signum*math.sin(delta_theta_raw)*(math.sqrt(retu['r_helio']*retur['r_helio'] * (1 + math.cos(delta_theta_raw))))  #geometric anchor A
        A = math.sqrt(s*(s - retu['r_helio'])*(s - retur['r_helio'])*(s - chord))
        z_low = 0.0
        z_high = 20.0 #intial guess for energy z
        check = 5.0
        chck = 0 
        while True:
            ##stumpff fucntion C,S##
            #C_z = ((1/2) - (z/24) + (math.pow(z,2)/720) - (math.pow(z,3)/40320) + (math.pow(z,4)/3628800) - (math.pow(z,5)/479001600) + (math.pow(z,6)/87178291200) - (math.pow(z,7)/20922789888000) + (math.pow(z,8)/6402373705728000) - (math.pow(z,9)/2432902008176640000))  #cosine like function for the first 10 terms
            #S_z = ((1/3) - (z/120) + (math.pow(z,2)/5040) - (math.pow(z,3)/362880) + (math.pow(z,4)/39916800) - (math.pow(z,5)/6227020800) + (math.pow(z,6)/1307674368000) - (math.pow(z,7)/355687428096000) + (math.pow(z,8)/121645100408832000) - (math.pow(z,9)/51090942171709440000))  #sine like function for first 10 terms
            #z = (z_low + z_high)/2
            z = 2.0
            rew = self.stumpff_(z)
            #if rew['C_z'] <= 0:
             #   rew['C_z'] = 1e-8
            y_z = (retu['r_helio'] + retur['r_helio']) + (A*((z*rew['S_z'] - 1)/math.sqrt(rew['C_z']))) #Gemometry bridge
            #print('y_z_new: ',y_z)

            #if y_z < 0:
            if y_z < 0: #if y is negative then unphysical
                #z_low = z # basically increased z to try and make y positive.
                z = 2
                #z += max(0.1, (0.05 * abs(y_z) / 1e11))   #(-y_z)*0.5
                #rew = self.stumpff_(z)
                #y_z = (retu['r_helio'] + retur['r_helio']) + (A*((z*rew['S_z'] - 1)/math.sqrt(rew['C_z'])))
                continue

            X_ = math.sqrt(y_z/rew['C_z']) #universal anomaly chi
            tof = ((math.pow(X_,3)*rew['C_z']) + (A*X_))/math.sqrt(self.GM_S) #should use specuhelio
            error_f = tof - delta_t
            

            #error_f = (math.pow((y_z/rew['C_z']),1.5) * rew['S_z'])+((A*math.sqrt(y_z)) - (math.sqrt(self.GM_S)*delta_t)) #error function equation
            #print('error f: ',error_f)

            #if z==0 or abs(z) < 1e-12: #the floor derivative if z=0 to prevent division by zero error

                #derivative_f = ((math.sqrt(2)/40)*math.pow(y_z,1.5)) + ((A/8)*(math.sqrt(y_z)+(A*(math.sqrt(1/(2*y_z))))))
             #   derivative_f = ((math.pow(X_,2)*rew['C_z']) + A)/math.sqrt(self.GM_S)

                #newton raphson loop#
                #z = z - (error_f/derivative_f) #used a damp of 0.5i
                #print('z_new when z==0 floor deriv: ',z)
                #print('floor deriv: ',derivative_f)
                #continue

            #else:
                #derivative_f = math.pow((y_z/rew['C_z']),1.5) * (((1/(2*z))*(rew['C_z'] - ((3*rew['S_z'])/(2*rew['C_z'])))) + (math.pow((3*rew['S_z']),2)/(4*rew['C_z']))) + ((A/8)*((3*(rew['S_z']/rew['C_z'])*math.sqrt(y_z)) + (A*(math.sqrt(rew['C_z']/y_z)))))
             #   derivative_f = ((math.pow(X_,2)*rew['C_z']) + (X_*(1 - (z*rew['S_z']))) + A)/math.sqrt(self.GM_S)

                #z = z - ((error_f/derivative_f)) #*0.5 to take small steps
                #print('z_new when z!=0: ',z)
                #print('floor deriv: ',derivative_f)
                #continue

            if abs(error_f) < check:
                break

            if error_f > 0: #if tof is > delta_t or if tof == delta_t then = 0 ..tof-delta_t=0..curent z gives too much time
                #z_high = z
                z = 2.0
            if error_f < 0: #current z gives too less time..of course only if the break statement isnt reached.
                #z_low = z
                z = 2.0

           # z = z - (1e-6*(error_f/derivative_f))
            #chck += 1
            print(f'S_z={rew['S_z']} C_z={rew['C_z']} y_z={y_z} z_mid={z} error={error_f} tof={tof}')


        ##delta v ## THE LAGRANGE COEFFICIENTs
        f = (1 - (y_z/retu['r_helio']))
        g = delta_t - ((math.pow(X_,3)*rew['C_z']) + (A*X_))/math.sqrt(self.GM_S)    #A*math.sqrt(y_z/self.GM_S)
        #f_d = (math.sqrt(self.GM_S*y_z)/(retu['r_helio']*retur['r_helio']))*(((math.pow(z,3)*A) - (y_z*math.sqrt(z)))/y_z) ##lagrange derivative coefficients##
        g_d = (1 - (y_z/retur['r_helio'])) ##lagrange deriavtive coeffiec8ents

        ##initial velocity vectors for start of transfer orbit##
        v_transf_X = (retur['X_bary'] - (f*retu['X_bary']))/g
        v_transf_Y = (retur['Y_bary'] - (f*retu['Y_bary']))/g
        v_transf_Z = (retur['Z_bary'] - (f*retu['Z_bary']))/g
        v_transf_Xhelio = (retur['X_helio'] - (f*retu['X_helio']))/g
        v_transf_Yhelio = (retur['Y_helio'] - (f*retu['Y_helio']))/g
        v_transf_Zhelio = (retur['Z_helio'] - (f*retu['Z_helio']))/g

        ##final velocity vectors for arrival/end of transfer orbit##
        v2_transf_Xhelio = ((g_d*retur['X_helio']) - retu['r_helio'])/g
        v2_transf_Yhelio = ((g_d*retur['Y_helio']) - retu['r_helio'])/g
        v2_transf_Zhelio = ((g_d*retur['Z_helio']) - retu['r_helio'])/g
        v2_transf_X = ((g_d*retur['X_bary']) - retu['r_bary'])/g
        v2_transf_Y = ((g_d*retur['Y_bary']) - retu['r_bary'])/g
        v2_transf_Z = ((g_d*retur['Z_bary']) - retu['r_bary'])/g

        delta_v_1 = math.sqrt((math.pow((v_transf_Xhelio - retu['v_Xhelio']),2)) + (math.pow((v_transf_Yhelio - retu['v_Yhelio']),2)) + (math.pow((v_transf_Zhelio - retu['v_Zhelio']),2))) #how much kick to give the rocket as it leaves earths sphere of influence to reach object X

        delta_v_2 = math.sqrt((math.pow((retur['v_Xhelio'] - v2_transf_Xhelio),2)) + (matih.pow((retur['v_Yhelio'] - v2_transf_Yhelio),2)) + (math.pow((retur['v_Zhelio'] - v2_transf_Zhelio),2))) #you have to match venus orbital velocity to stay there with it....continue
        ne

        total_delta_v = delta_v_1 + delta_v_2
        #stop = (time.perf_counter()-start)/60
        

        return  'ERROR..DISCONTINUED'  #total_delta_v,delta_v_2,delta_v_1



    def schwarzschild_radius(self,mass: float=None):
        '''any object with mass m can be compressed into a black hole by compressing it to a certain size using a certain radius = The schwarzschild radius.\nThe escape velocity = sqrt((2*G*M)/r) where G is the universal gravitational constant and M is the mass and r is the radius from of the object from the center of the object. if the velocity required to escape is equal the speed of light, then c = sqrt((2*G*M)/r) = c^2 == (2*G*M)/r === r = (2*G*M)/c^2. r == schwarzschild radius.\nUnits should be in kg and m.\nreturns the schwarzschild radius'''

        if mass==None:
            return 'mass cannot be none'

        sch_r = ((2.0*self.G*mass)/math.pow(self.c_m_s,2))
        units = 'm'

        return {'schwarzschild_radius':sch_r,'units':units}







    def trunc(self,number: float=None,dplac: int=None):
        '''python has no method for truncating float numbers without rounding them off so...even if dplac pos argument is given a negative number, the method takes the absolute value of the passed value'''

        if number==None or dplac==None:
            print('method trunc requires both the number and decimal place pos arguments')
            return

        if dplac==0:
            return number

        

        g = []
        num = str(number)
        for i in num:
            g.append(i)
     #   cp_g = g.reverse() #reverses the list //returns a nonetyoe object??
        final_left = []
        final_right = []

        #for the numbers to leftbof decimal place

        for _,idx in enumerate(g):
         #   final_left.append(idx)

            if idx=='.':
                final_left.append(idx)
                break

            final_left.append(idx)

        #for numbers to r8ght of decimal place
        g.reverse()
      #  rvs_g = []
     #   for u in g:
    #        rvs_g.append(u) #the revesr of g


        for _,idx in enumerate(g):
          #  final_right.append(idx)

            if idx=='.':
                break #did not append . because i already appended above
            final_right.append(idx)

        ###now removing the required decimal place##
        if dplac==1:
            string = '' #empty string for ease of conversion through float()
        #    fn_r_reverse = []
            fn_r = final_right #becozni still need final_right
            fn_r.reverse()

            poped = fn_r.pop(abs(dplac)-1) #because dplace is always > 1 ..if decimal places to be truncated is 1 eg, final_right houses the first decimal place as index 0 hence dplac-1. abs becoasue the user might pass a negative value. or just .pop(0) beacsue this if statemt handles the zeroth index.

            final_left.append(poped)
            for t in final_left:
                string+=t

            return float(string)


        else:
            final = []
            string = ''
            index = dplac - 1.0
            fn_r = final_right
            fn_r.reverse()

            for _,idx in enumerate(fn_r):
                final.append(idx)

                if _==index:
                    break
            
            for i in final:
                final_left.append(i)

            for t in final_left:
                string+=t

            return float(string)



            

        
##what if the number is 78962.7272626 or 0.93838383....Solved i just neded to step away from the termibal abit ;-).







    def oscelem(self,r=None,v=None,indo: int=None,frame: str=None): #r amd v are the position and velocity vectors..if satellite none then the grav param will be for the planet satellite discontinued.s..indo is the index  of object x...universal loguc laterm..frame for feferance frame...
        '''derives the osculating elements from the state vectors for a 2 body system. the a and e for a 2+ body system is diffrent. E also needs change if the system is not a 2 body system. thebpassed value for r and v should match exaclty the index indo given to avoid errors'''

        if r==None and v==None:
            console.print('[red]oscelem requires both of the state vectors to continue[/red]')
            return

        if (r and v==None) or (v and r==None):
            console.print('[red]oscelem requires both of the state vectors.[/red]')
            return

     #   if indo==None and frame==None or indo and frame==None or frame and indo==None: #r and v check was handled uptheree
      #      console.print('[red]the index of the internally recognized object is needed[/red]')
       #     return

        if r and v:
            if not isinstance(r,list) or not isinstance(v,list):
                console.print(f'[red]oscelem expected iterables but was given: {r} {v}')
                return

            try:
                state_r = []
                state_v = []
                for _,idx in enumerate(r):
                    state_r.append(float(idx)) #position vector
                    state_v.append(float(v[_])) # velocity vector
            except ValueError:
                return f'component type not supported: {idx} {v[_]}'

            ##derivation of the osculating elelmnts##

            if indo and frame:
                indo_lst = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16] #17 objects as of now with index 0 as Sol
                if indo not in indo_lst:
                    console.print('[red]index value our of range. 17 objects supported[/red]')
                    return
                frame = frame.upper()
                frm = ['B','H'] #b for SSB and h for heliocentric frame

                if frame not in frm:
                    console.print('[red]only two frames of reference are supported. barycentric frame as b and heliocentric frame as h')
                    return

                if frame=='H': #it automatically knows the grav param auto through the index

                
                    grav = [{'N':'SUN','u_mass':self.GM_S},{'N':'MERCURY','u_mass':(self.G*(self.Mercury_mass*self.MoE_kg))},{'N':'VENUS','u_mass':(self.G*(self.Venus_mass*self.MoE_kg))},{'N':'EARTH','u_mass':(self.G*self.MoE_kg)},{'N':'MARS','u_mass':(self.G*(self.Mars_mass*self.MoE_kg))},{'N':'VESTA','u_mass':(self.G*(self.Vesta_mass*self.MoE_kg))},{'N':'CERES','u_mass':(self.G*(self.Ceres_mass*self.MoE_kg))},{'N':'PALLAS','u_mass':(self.G*(self.Pallas_mass*self.MoE_kg))},{'N':'HYGIEA','u_mass':(self.G*(self.Hygiea_mass*self.MoE_kg))},{'N':'JUPITER','u_mass':(self.G*(self.Jupiter_mass*self.MoE_kg))},{'N':'SATURN','u_mass':(self.G*(self.Saturn_mass*self.MoE_kg))},{'N':'URANUS','u_mass':(self.G*(self.Uranus_mass*self.MoE_kg))},{'N':'NEPTUNE','u_mass':(self.G*(self.Neptune_mass*self.MoE_kg))},{'N':'PLUTO','u_mass':(self.G*(self.Pluto_mass*self.MoE_kg))},{'N':'HAUMEA','u_mass':(self.G*(self.Haumea_mass*self.MoE_kg))},{'N':'MAKEMAKE','u_mass':(self.G*(self.Makemake_mass*self.MoE_kg))},{'N':'ERIS','u_mass':(self.G*(self.Eris_mass*self.MoE_kg))}] #spec u helio
                    if indo==0: #Sol does not handle the sun specuhelio the supe me5hod
                        grav_param = grav[0]['N'] #the sun
                    else:
                        grav_param = super().spec_uhelio(grav[indo-1]['N']) #-1 bcoz the super method only has 16 objects with mercury as index 
                        
                    
                elif frame=='B':
                    grav_param = super().u_total()
            
            else: #lunar moons fallback default
                grav_param = (self.G*(self.moons['EARTH']['mass']+self.MoE_kg)) #add solar system baryencter way..like moon relatuve SSB

                                

                        
            dot_r_v = vectors.dot_vect(state_r,state_v)
            r_magn = vectors.magn_vect(state_r)
            v_magn = vectors.magn_vect(state_v)
            energy = (math.pow(v_magn,2)/2) - (grav_param/r_magn)

            osc_a = math.pow(((2/r_magn) - (math.pow(v_magn,2)/grav_param)),-1)#semi major axis

            h = vectors.cross_vect(state_r,state_v) #angular momentum..the vectors classgets the magnitude of the cross product too..
            h_magn = h[3]
            h_X = h[0]
            h_Y = h[1]
            h_Z = h[2]

            e_X = (1/grav_param)*((math.pow(v_magn,2)-(grav_param/r_magn))*state_r[0] - (dot_r_v*state_v[0]))
            e_Y = (1/grav_param)*((math.pow(v_magn,2)-(grav_param/r_magn))*state_r[1] - (dot_r_v*state_v[1]))
            e_Z = (1/grav_param)*((math.pow(v_magn,2)-(grav_param/r_magn))*state_r[2] - (dot_r_v*state_v[2]))
            #magn_e = vectors.magn_vect([e_X,e_Y,e_Z])#osc e
            magn_e = math.sqrt(math.pow(e_X,2) + math.pow(e_Y,2) + math.pow(e_Z,2))
            osc_i = math.degrees(math.acos(h_Z/h_magn)) % 360 
            epsilon = 1e-8
            degr = '°'

            if magn_e<epsilon and osc_i<epsilon:  #equitorial circular orbit
                q = 'equitorial circular orbit'
                Omega = 0
                argof_perihelion = 0
                true_longitude = math.degrees(math.atan2(state_r[1],state_r[0])) % 360
                true_anomaly = true_longitude
                argof_latitude = 0
                longof_periapsis = 0
                                                                                        
            elif osc_i<epsilon and epsilon<magn_e<1:   #equitorial elliptical orbit      
                q = 'equitorial elliptical orbit'
                Omega = 0
                argof_perihelion = 0
                longof_periapsis = math.degrees(math.atan2(e_Y,e_X)) % 360
                #argof_perihelion = longofperiapsis
                true_longitude = math.degrees(math.atan2(state_r[1],state_r[0])) % 360 #L
                true_anomaly = true_longitude
                argof_latitude = 0


            elif osc_i>epsilon and magn_e<epsilon: #tilted criscular orbit
                o = 'inclined circular orbit'

                list_k = [0,0,1]
                list_h = [h_X,h_Y,h_Z]
                #vectors = Vectors(0,0,1,h_Xhelio,h_Yhelio,h_Zhelio)
                cross_n_vect = vectors.cross_vect(list_k,list_h)
                list_n_vect = [cross_n_vect[0],cross_n_vect[1],cross_n_vect[2]]
                list_r_vect = [state_r[0],state_r[1],state_r[2]]
                magn_n_r = vectors.magn_vect(list_n_vect,list_r_vect)
                dot_n_r = vectors.dot_vect(list_n_vect,list_r_vect)
                Omega = math.degrees(math.acos(cross_n_vect[0]/cross_n_vect[3])) % 360

                if cross_n_vect[1]<0: #node_vector component y less than zero
                    Omega = 360 - Omega

                argof_perihelion = 0
                longof_periapsis = 0
                true_longitude = 0
                argof_latitude = math.degrees(math.acos(dot_n_r/magn_n_r[4])) % 360 #u
                true_anomaly = argof_latitude
                if Z<0: #u is greater than 180 degrees
                    argof_latitude = 360 - argof_latitude
                    true_anomaly = argof_latitude

            elif osc_i>epsilon and epsilon<magn_e<1: #General inclined elliptical orbit
                

                x = 'General case. inclined elliptical orbit'
                #print(x)
                ##General case inclined elliptical orbits###

                #degr = '°'
                #node vector,longitude of ascending nide and argument of perihelion
                #list_angularmoment = [h_X,h_Y,h_Z]
                #list_normalized_k = [0,0,1]
                #vectors = Vectors(list_normalized_k,list_angularmoment)
                #cross = vectors.icross_vect()
                #if q:
                    #print(q)
                    #node_vectX = 0
                    #node_vectY = 0
                    #node_VectZ = 0

                 ### please optimize later

                #vectors = Vectors(0,0,1,h_Xhelio,h_Yhelio,h_Zhelio)
                #cross_node_vect = vectors.cross_vect(list_,list)
                argof_latitude = 0
                true_longitude = 0
                longof_periapsis = 0

                ##Omega##
                #node_vectX = cross_node_vect[0]
                #node_vectY = cross_node_vect[1]
                #node_vectZ = cross_node_vect[2]

                list_k = [0,0,1]
                list_h = [h_X,h_Y,h_Z]
                cross_node_vect = vectors.cross_vect(list_k,list_h)

                node_vectX = cross_node_vect[0]
                node_vectY = cross_node_vect[1]
                node_vectZ = cross_node_vect[2]
                Omega = math.degrees(math.acos(node_vectX/cross_node_vect[3])) % 360
                #Omega = math.degrees(math.atan2(node_vectY,node_vectX)) % 360

                #omega = omega
                if node_vectY<0: #
                    Omega = 360 - Omega

                ##argument 0f perihelion###
                list_n = [node_vectX,node_vectY,node_vectZ]
                list_e = [e_X,e_Y,e_Z]                                                  
                dot_n_e = vectors.dot_vect(list_n,list_e)
                magn_n_e = vectors.magn_vect(list_n,list_e)                             
                argof_perihelion = math.degrees(math.acos(dot_n_e/magn_n_e[4])) % 360

                if e_Z<0: #the perihelion is below 180<perih<360
                    argof_perihelion = 360 - argof_perihelion

                ##true anomaly##
                list_r = [state_r[0],state_r[1],state_r[2]]
                dot_e_r = vectors.dot_vect(list_e,list_r)
                magn_e_r = vectors.magn_vect(list_e,list_r)
                true_anomaly = math.degrees(math.acos(dot_e_r/magn_e_r[4])) % 360
                list_v = [state_v[0],state_v[1],state_v[2]]
                dot_r_v = vectors.dot_vect(list_r,list_v)
                ##added## 
            #    cross_e_r = vectors.cross_vect(list_e,list_r)
             #   list_cross_e_r = [cross_e_r[0],cross_e_r[1],cross_e_r[2]]
              #  dot_C_h = vectors.dot_vect(list_cross_e_r,list_h)
#
 #               if dot_C_h < 0:
  #                  trv = 'falling to perihelion or perigee'
   #                 true_anomaly = 360 - true_anomaly
    #            else:
     #               trv = 'climbing to aphelion or apogee'

                if dot_r_v < 0: #object falling to perihelion
                    trv = 'falling to perihelion'
                    true_anomaly = 360 - true_anomaly
                elif dot_r_v >= 0: #object climbing to aphelion
                    trv = 'climbing to aphelion'

## C == dot product of vector [cross_e_r] and h the angular momenum..
##the true anomaly check for previous was stabke because the ellipses for the olanegs are wide and stable...for the moon, the sun, and earth all pull the moon enormously..

##remember the angular momentum vector direction is the absolute 'north pole' for orbititng object X

            return {'energy':energy,'osc_a':osc_a,'osc_i':osc_i,'osc_e':magn_e,'angular momentum_h':h_magn,'h_X':h_X,'h_Y':h_Y,'h_Z':h_Z,'e_X':e_X,'e_Y':e_Y,'e_Z':e_Z,'r_magn':r_magn,'v_magn':v_magn,'Omega':Omega,'argof_perihelion':argof_perihelion,'longof_periapsis':longof_periapsis,'true_longitude':true_longitude,'argof_latitude':argof_latitude,'true_anomaly':true_anomaly,'explanation':trv}











    def lunars(self,sysname: str=None,days: int=None): #the day pos arg to be updated
        '''the respective moons for object X'''
        if sysname:
            sysname = sysname.upper()

        if sysname!='EARTH':
            return 'currently tracks the Earth moon system. the gravitational parameter was thus set to the earth moon system..'

        try:
            if days:
                days = float(days)#override the variable
        except ValueError:
            raise ValueError(f'value passed to days is not supported. value given {days}')



      #  moons = {'MERCURY':None,'VENUS':None,'EARTH':'LUNA','MARS':['PHOBOS','DEIMOS'],'VESTA':None,'CERES':None,'PALLAS':None,'HYGIEA':None,'JUPITER':['GANYMEDE','CALLISTO','IO','EUROPA'],'SATURN':'TITAN','URANUS':['TITANIA','OBERON'],'NEPTUNE':'TRITON','PLUTO':'CHARON','HAUMEA','MAKEMAKE','ERIS':'DYSNOMIA'} #adding the massibe moons. moons like phobos and deimos are very small. hence negligible but i should add them all

        if sysname not in self.moons.keys():
            console.print('[red]WRONG SPELLING OF SYSTEM NAME OR NOT LOCALLY RECOGNIZED[/red]')
            return

        ##usimg seconds##
        if days:
            seconds = (days*24*60*60)
            tm = time.time()
            delta_t = (tm + seconds) - self.JD2000
        else:
            tm = time.time()
            delta_t = tm - self.JD2000 #dt since j2000 at noon ...tryimg days..

        d = delta_t/86400

        ##solvimg the mean elelemnts##
        #mean_a = math.radians(self.moons[sysname]['mean_a'])
       # mean_b = math.radians(self.moons[sysname]['mean_b'])
       # mean_anomaly = (mean_a + (mean_b*d)) % (2*math.pi)
        mean_anom = self.moons[sysname]['mean_a']
        #Omega_a = math.radians(self.moons[sysname]['Omega_a'])
        #Omega_b = math.radians(self.moons[sysname]['Omega_b'])
      #  Omega = (Omega_a - (Omega_b*d))%(2*math.pi)
        Omega = math.radians((self.moons[sysname]['Omega_a'] - (self.moons[sysname]['Omega_b']*d)) % 360) #the table is in degrees but cos/sin need radians..the node regresses
       # omega_a = math.radians(self.moons[sysname]['omega_a'])
       # omega_b = math.radians(self.moons[sysname]['omega_b'])
      #  omega = (omega_a + (omega_b*d)) % (2*math.pi)
        omega = math.radians((self.moons[sysname]['omega_a'] + (self.moons[sysname]['omega_b']*d)) % 360) #the perigee advances
        inclination = math.radians(self.moons[sysname]['i'])

        mean_motion = (2*math.pi)/(self.moons[sysname]['sidereal_p_s'])
        mean_anomaly =  ((math.radians(mean_anom) + (math.radians(self.moons[sysname]['mean_b'])*d))%(2*math.pi)) #anomalistic rate (mean_b) because the perigee moves now. the sidereal mean_motion above would double count it
        eccentric_anomaly = mean_anomaly



        #solving the non linear kepler transcedental equation for E##
        for _ in range(11):
            
            eccentric_anomaly = eccentric_anomaly - ((eccentric_anomaly - (self.moons[sysname]['e']*math.sin(eccentric_anomaly)) - mean_anomaly)/(1 - (self.moons[sysname]['e']*math.cos(eccentric_anomaly))))
        ##the 2D position vector..ahere Z==0 at 2D r_PQW
        
        r_P = (self.moons[sysname]['a']*(math.cos(eccentric_anomaly) - self.moons[sysname]['e']))  #basically x...a(cosE - e) not a*cos(E - e)
        b = (self.moons[sysname]['a']*(math.sqrt(1 - math.pow(self.moons[sysname]['e'],2)))) #basically the semiminor axis
        r_Q = b*math.sin(eccentric_anomaly)#basically y
        r_W = 0.0

        r_raw = self.moons[sysname]['a']*(1 - (self.moons[sysname]['e']*math.cos(eccentric_anomaly)))

        ##perifocal velocity vector PQ
        grav_param = self.G*(self.MoE_kg+self.moons[sysname]['mass']) #sho7ld update for it to know which sgstem body

        v_P = -(math.sqrt(grav_param*self.moons[sysname]['a'])/r_raw)*math.sin(eccentric_anomaly)

        v_Q = (math.sqrt(grav_param*self.moons[sysname]['a']*(1 - math.pow(self.moons[sysname]['e'],2)))/r_raw)*math.cos(eccentric_anomaly) #sqrt(u*a*(1-e^2)) as in orbits()
        v_W = 0.0

        #return {'r_P_bas_x':r_P,'r_Q_bas_y':r_Q,'r_W_bas_z':r_W,'v_P_bas_vx':v_P,'v_Q_bas_vy':v_Q,'v_W_bas_vz':v_W,'b_moon':b,'name':f'{sysname} system'}

        #rotation#
        X = (r_P * ((math.cos(Omega)*math.cos(omega)) - (math.sin(Omega)*math.sin(omega)*math.cos(inclination)))) - (r_Q * ((math.cos(Omega)*math.sin(omega))+ (math.sin(Omega)*math.cos(omega)*math.cos(inclination))))
        Y = (r_P * (math.sin(Omega)*math.cos(omega) + (math.cos(Omega)*math.sin(omega)*math.cos(inclination)))) + (r_Q * ((math.cos(Omega)*math.cos(omega)*math.cos(inclination)) - (math.sin(Omega)*math.sin(omega))))
        Z = (r_P * (math.sin(omega)*math.sin(inclination))) + (r_Q * (math.cos(omega)*math.sin(inclination)))
        r_magn = vectors.magn_vect([X,Y,Z])

        v_X = (v_P * ((math.cos(Omega)*math.cos(omega)) - (math.sin(Omega)*math.sin(omega)*math.cos(inclination)))) - (v_Q * ((math.cos(Omega)*math.sin(omega))+ (math.sin(Omega)*math.cos(omega)*math.cos(inclination))))
        v_Y = (v_P * (math.sin(Omega)*math.cos(omega) + (math.cos(Omega)*math.sin(omega)*math.cos(inclination)))) + (v_Q * ((math.cos(Omega)*math.cos(omega)*math.cos(inclination)) - (math.sin(Omega)*math.sin(omega))))
        v_Z = (v_P * (math.sin(omega)*math.sin(inclination))) + (v_Q * (math.cos(omega)*math.sin(inclination)))

        v_magn = vectors.magn_vect([v_X,v_Y,v_Z])
        perifocal_rmagn = vectors.magn_vect([r_P,r_Q,r_W])
        perifocal_vmagn = vectors.magn_vect([v_P,v_Q,v_W])       


        osc_elements = self.oscelem([X,Y,Z],[v_X,v_Y,v_Z]) #a amd e from this is wrong because of the 3 body system fkr earth moon system...also the energy e..for a 3 body system changes..

        ##E a and e for this 3 body system..# heliocentric
        Earth_helio = self.barycentric('earth',days) #same instant as the moon
        global_moon_X = Earth_helio['X_helio'] + X
        global_moon_Y = Earth_helio['Y_helio'] + Y#heliocentric
        global_moon_Z = Earth_helio['Z_helio'] + Z

        global_moon_X_bary = Earth_helio['X_bary'] + X
        global_moon_Y_bary = Earth_helio['Y_bary'] + Y#heliocentric
        global_moon_Z_bary = Earth_helio['Z_bary'] + Z

        #r_moon_sun_heliomagn = vectors.magn_vect([-global_moon_X,-global_moon_Y,-global_moon_Z]) # a vector pointing from the moon to the sun
        list_r_sun = [-Earth_helio['X_helio'],-Earth_helio['Y_helio'],-Earth_helio['Z_helio']]#geocentric remmber
        #r_earth_sun_heliomagn = vectors.magn_vect(list_r_sun)
       # dot_es_r = vectors.dot_vect(list_r_sun,[X,Y,Z]) #es is vector po8ntingfrom the earth to the sun and r is the moon vector

        #energy_helio = (math.pow(v_magn,2)/2) - (grav_param/r_magn) - (self.GM_S/r_moon_sun_heliomagn) + ((self.GM_S/math.pow(r_earth_sun_heliomagn,3))*dot_es_r)

      #  osc_a = -(grav_param/(2.0*osc_elements['energy']))
       # print(osc_a,energy_helio)
     #   osc_e = math.sqrt(1.0 - (math.pow(osc_elements['angular momentum_h'],2)/(grav_param*osc_a)))




        ##faces of the moon## Geocentric frame relatuve the Earth...used heliocentric now barycentric too
        list_r_moon = [X,Y,Z] #geocentric
        #Earth_helio = self.barycentric('earth')
     #   list_r_sun = [-Earth_helio['X_helio'],-Earth_helio['Y_helio'],-Earth_helio['Z_helio']]#geocentric remmber
        dot_moon_sun_r = vectors.dot_vect(list_r_moon,list_r_sun)
        magnmult = vectors.magn_vect(list_r_moon,list_r_sun)

        phase_angle_cosine = (dot_moon_sun_r/magnmult[4]) #phi cosine phi ...not done the arccos here
        ##Moon's disk that is lit up from Earth's perspective is given by this clean linear relation
        face_k = ((1 + phase_angle_cosine)/2)

        if face_k==1.0:
            face = 'full moon. fully illuminated'
        elif face_k==0.5:
            face = 'half moon. half illuminated'
        elif face_k==0:
            face = 'new moon. not illuminated'


        light_delay = r_magn/self.c_m_s
        light_delay_sun = vectors.magn_vect([global_moon_X,global_moon_Y,global_moon_Z])/self.c_m_s
        light_delay_sun_bary = vectors.magn_vect([global_moon_X_bary,global_moon_Y_bary,global_moon_Z_bary])/self.c_m_s

        list_r_sun_bary = [-Earth_helio['X_bary'],-Earth_helio['Y_bary'],-Earth_helio['Z_bary']]
        dot_moon_sun_r_bary = vectors.dot_vect(list_r_moon,list_r_sun_bary)
        magnmult_2 = vectors.magn_vect(list_r_moon,list_r_sun_bary)

        phase_angle_cosine_bary = (dot_moon_sun_r_bary/magnmult[4])

        face_k_bary = ((1 + phase_angle_cosine_bary)/2)



       # acc_X,acc_Y,acc_Z = self.acce('luna' if sysname=='EARTH' else 'error in lunar method.\nsystem name not supported') #recursion depth error ..learn from this..
       # if acc_X and acc_Y and acc_Z:
        #    acc_magn = vectors.magn_vect([acc_X,acc_Y,acc_Z])
        #else:
         #   return 'error at acc_X,acc_Y,acc_Z. system name not supported ?'


     #   list_h = [osc_elements['h_X'],osc_elements['h_Y'],osc_elements['h_Z']]
#
 #       O = vectors.cross_vect(list_r_sun,[X,Y,Z])
  #      o = vectors.dot_vect([O[0],O[1],O[2]],list_h)
        
        #the time derivative for k to know how it changes..used in another method so that i xan access the pos vectors...Done in the interface module
     #   time.sleep(1.5)
#
 #       if o<0: #negative
  #          phase = 'waning. k is shrinking'
   #     elif o>0:
    #        phase = 'waxing. k is increasing'
     #   else:
      #      phase = 'error'


        

        return {'mean_anomaly':mean_anomaly,'eccentric_anomaly':eccentric_anomaly,'r_P_bas_x':r_P,'r_Q_bas_y':r_Q,'r_W_bas_z':r_W,'v_P_bas_vx':v_P,'v_Q_bas_vy':v_Q,'v_W_bas_vz':v_W,'b_moon':b,'name':f'{sysname}-moon system','X':X,'Y':Y,'Z':Z,'v_X':v_X,'v_Y':v_Y,'v_Z':v_Z,'peri_r_magn':perifocal_rmagn,'peri_v_magn':perifocal_vmagn,'r_magnitude':r_magn,'v_magnitude':v_magn,'energy':osc_elements['energy'],'osc_a':osc_elements['osc_a'],'osc_i':osc_elements['osc_i'],'osc_e':osc_elements['osc_e'],'angular momentum_h':osc_elements['angular momentum_h'],'h_X':osc_elements['h_X'],'h_Y':osc_elements['h_Y'],'h_Z':osc_elements['h_Z'],'r_magn_oscmethd':osc_elements['r_magn'],'v_magn_oscmethd':osc_elements['v_magn'],'Omega':osc_elements['Omega'],'argof_perihelion':osc_elements['argof_perihelion'],'longof_periapsis':osc_elements['longof_periapsis'],'true_longitude':osc_elements['true_longitude'],'argof_latitude':osc_elements['argof_latitude'],'true_anomaly':osc_elements['true_anomaly'],'units':'meters and unix time since J2000 Noon','Unix_time':tm,'light_delay':light_delay,'light_delay_sun':light_delay_sun,'k':face_k,'Unix_time_delta':delta_t,'modee':f'future¦past with {days} days' if days else None,'caution':'the moons a and e are heavily pertubed by the sun. i have not found a clean way to get the clean a and e yet.','tim_e':tm,'actname':f'{'Luna' if sysname=='EARTH' else None}','k_bary':face_k_bary,'light_delay_sun_bary':light_delay_sun_bary,'description':'accurate but not accurate enough'}



        
    def lunful(self,sysname: str=None):
        '''gets the full pointa for the orbit. ill derive later and use the mean elements'''
        pass







        

    def chord(self,name: str=None,maximum=None):
        '''gets the nearset planet to X or the farthest planet to X.default is minimum'''

        values = ['MERCURY','VENUS','EARTH','MARS','VESTA','CERES','PALLAS','HYGIEA','JUPITER','SATURN','URANUS','NEPTUNE','PLUTO','HAUMEA','MAKEMAKE','ERIS']

        if name==None: #name is the target body
            console.print('[red]Name cannot be none[/red]')
            return

        name=name.upper()

        list_nearfar = {} ##it is a dictionary
    #    list_name = []
#
        if maximum:
           # retur = self.barycentric(_)
            target = self.barycentric(name)
            list_target = [target['X_helio'],target['Y_helio'],target['Z_helio']]

            for _ in values:
                retur = self.barycentric(_)
                if _==name:

                    #list_target = [target['X_helio'],target['Y_helio'],target['Z_helio']]
                    list_nearfar[0] = name #for macimum the least value...-1 or evem zero 0
                    continue
                list_oth = [retur['X_helio'],retur['Y_helio'],retur['Z_helio']]
                chord = vectors.magn_vect(list_target,list_oth)
                list_nearfar[chord[8]] = _  #the chord value in meters as tge key for the dictionary


            ###maximum###
            max_chord = max(list_nearfar) #list_nearfar will only check the keys for themacimum key
            result_max = list_nearfar[max_chord] #the name of the maximum value
            max_chord_AU = (max_chord/self.AU_m)
            #prine = f'Distance between {name} and {result_max} right now is {max_chord_AU} AU or {max_chord} m or {max_chord/1000} km'#the print string

            ###secimd farthest#

            list_nearfar.pop(max_chord)

            max_chord_two = max(list_nearfar) #the new dictionary already popped
            result_max_two = list_nearfar[max_chord_two]
            max_chord_twoAU = (max_chord_two/self.AU_m)


            prine = f'farthest object from {name} = {result_max} at {max_chord_AU} AU or {max_chord} m. Second farthest object is {result_max_two} at {max_chord_twoAU} AU or {max_chord_two} m from {name}'




            return {'target_name':name,'farthest':result_max,'second_farthest':result_max_two,'max_list':list_nearfar,'mode':'farthest and second farthes8t','explanation':prine}



        target = self.barycentric(name)
        list_target = [target['X_helio'],target['Y_helio'],target['Z_helio']]

        for _ in values:
            retur = self.barycentric(_)
            if _==name:

                #list_target = [target['X_helio'],target['Y_helio'],target['Z_helio']]
                list_nearfar[1e50] = name
                continue

            list_oth = [retur['X_helio'],retur['Y_helio'],retur['Z_helio']]
            chord = vectors.magn_vect(list_target,list_oth)
            list_nearfar[chord[8]] = _ #the chord value as the key

        ##minimum##

        min_chord = min(list_nearfar)
        result_min = list_nearfar[min_chord]
        min_chord_AU = (min_chord/self.AU_m)

        ##second minimum##

        list_nearfar.pop(min_chord)

        min_chord_two = min(list_nearfar)
        result_min_two = list_nearfar[min_chord_two]
        min_chord_twoAU = (min_chord_two/self.AU_m)

        prine = f'Nearest object to {name} = {result_min} at {min_chord_AU} AU or {min_chord} m. Second nearest object is {result_min_two} at {min_chord_twoAU} AU or {min_chord_two} m from {name}'





        return {'target':name,'nearest':result_min,'second_nearest':result_min_two,'min_list':list_nearfar,'mode':'nearest and second nearest','explanation':prine} ##lost_nearfar is a dixtionary not a list.....







                














    def reel(self,name: str=None,bary=None,single_vector=None): #default is heliocentric..ret for returning if needed..bjt this method is onyl for returning sonwhemyou wake up.....
        '''gets the real rotated valies using the real time osculating elements. both heliocentric frame and barycentric.'''
        if name==None:
            console.print('[bold red]NAME CANNOT BE NONE/EMPTY[/bold red]')
            return # instead of sys.exit(0) which might cause frustrations to the user in the python IDE.

        name = name.upper()


        vallues = {'MERCURY':88,'VENUS':225,'EARTH':365,'MARS':687,'CERES':1681,'JUPITER':4333,'SATURN':10759,'URANUS':30685,'NEPTUNE':60190,'PLUTO':90465,'ERIS':204174}


        rl = super().orbit(0,int(vallues.get(name,-2)),None,'y')
        osc_elem = self.barycentric(name)

        if bary: #barycentric osculating elements
            #X_l = [] # orbit returns AU
            #Y_l = []
            #Z_l = []
            X_AUl = []
            Y_AUl = []
            Z_AUl = []

            omecos = math.cos(math.radians(osc_elem['Omega'])) # the longtude of ascending node/Omega
            omesin = math.sin(math.radians(osc_elem['Omega']))
            wsin = math.sin(math.radians(osc_elem['argof_periapsis']))
            wcos = math.cos(math.radians(osc_elem['argof_periapsis']))
            isin = math.sin(math.radians(osc_elem['osc_i']))
            icos = math.cos(math.radians(osc_elem['osc_i']))

            #if single_vector:
             #   perirot = super().orbits(name) #now sinhle vector math availabpe gor heliocentric and berycentrc🦋



            for _,idx in enumerate(rl['x_list_peri']):
                X = (idx * ((omecos*wcos) - (omesin*wsin*icos))) - (rl['y_list_peri'][_] * ((omecos*wsin) + (omesin*wcos*icos)))
                Y = (idx * (omesin*wcos + (omecos*wsin*icos))) + (rl['y_list_peri'][_] * ((omecos*wcos*icos) - (omesin*wsin)))
                Z = (idx * (wsin*isin)) + (rl['y_list_peri'][_] * (wcos*isin))
                X_AUl.append(X)
                Y_AUl.append(Y)
                Z_AUl.append(Z)



            if single_vector:
                perirot = super().orbits(name)


                X_s = (perirot['x_pfcal'] * ((omecos*wcos) - (omesin*wsin*icos))) - (perirot['y_pfcal'] * ((omecos*wsin) + (omesin*wcos*icos)))
                Y_s = (perirot['x_pfcal'] * (omesin*wcos + (omecos*wsin*icos))) + (perirot['y_pfcal'] * ((omecos*wcos*icos) - (omesin*wsin)))
                Z_s = (perirot['x_pfcal'] * (wsin*isin)) + (perirot['y_pfcal'] * (wcos*isin))  #the rotated elements are realtive the barycenter..
                l_t = [X_s,Y_s,Z_s]
                magn_rbary = vectors.magn_vect(l_t)


                return {'X_AUl':X_AUl,'Y_AUl':Y_AUl,'Z_AUl':Z_AUl,'X_baryreal':X_s,'Y_baryreal':Y_s,'Z_baryreal':Z_s,'magnbary_rl':magn_rbary}




            return {'X_AUl':X_AUl,'Y_AUl':Y_AUl,'Z_AUl':Z_AUl} #barycentric rotated valeus



        #X_heliom = []
        #Y_heliom = []
        #Z_heliom = []
        X_helioAU = []
        Y_helioAU = []
        Z_helioAU = []

        omecos = math.cos(math.radians(osc_elem['Omegahelio'])) # the longtude of ascending node/Omega
        omesin = math.sin(math.radians(osc_elem['Omegahelio']))
        wsin = math.sin(math.radians(osc_elem['argof_perihelion']))
        wcos = math.cos(math.radians(osc_elem['argof_perihelion']))
        isin = math.sin(math.radians(osc_elem['osc_ihelio']))
        icos = math.cos(math.radians(osc_elem['osc_ihelio']))

       # if single_vec:
        #    perirot = super().orbits(name)


        for _,idx in enumerate(rl['x_list_peri']):
            X = (idx * ((omecos*wcos) - (omesin*wsin*icos))) - (rl['y_list_peri'][_] * ((omecos*wsin) + (omesin*wcos*icos)))
            Y = (idx * (omesin*wcos + (omecos*wsin*icos))) + (rl['y_list_peri'][_] * ((omecos*wcos*icos) - (omesin*wsin)))
            Z = (idx * (wsin*isin)) + (rl['y_list_peri'][_] * (wcos*isin))
            X_helioAU.append(X)
            Y_helioAU.append(Y)
            Z_helioAU.append(Z)

        #for _,idx in enumerate(X_heliom):

         #   X_AU = idx/self.AU_m
          #  Y_AU = Y_heliom[_]/self.AU_m
           # Z_AU = Z_heliom[_]/self.AU_m

            #X_helioAU.append(X_AU)
           # Y_helioAU.append(Y_AU)
           # Z_helioAU.append(Z_AU)

        if single_vector:
            perirot = super().orbits(name)

            X_s = (perirot['x_pfcal'] * ((omecos*wcos) - (omesin*wsin*icos))) - (perirot['y_pfcal'] * ((omecos*wsin) + (omesin*wcos*icos)))
            Y_s = (perirot['x_pfcal'] * (omesin*wcos + (omecos*wsin*icos))) + (perirot['y_pfcal'] * ((omecos*wcos*icos) - (omesin*wsin)))
            Z_s = (perirot['x_pfcal'] * (wsin*isin)) + (perirot['y_pfcal'] * (wcos*isin)) #osc elemts relative heliocenter

            l_t = [X_s,Y_s,Z_s]
            magn_rhelio = vectors.magn_vect(l_t)

            return {'X_helioAU':X_helioAU,'Y_helioAU':Y_helioAU,'Z_helioAU':Z_helioAU,'X_helioreal':X_s,'Y_helioreal':Y_s,'Z_helioreal':Z_s,'magnhel_rl':magn_rhelio}



        return {'X_helioAU':X_helioAU,'Y_helioAU':Y_helioAU,'Z_helioAU':Z_helioAU}






    def lamberts(self,name: str=None,days: int=None):
        '''Lamberts problem. assumes Heliocentric frame.'''

        if name==None: #name is the target or destination
            console.print('[bold red]NAME CANNOT BE NONE. TARGET/DESTINATION[/bold red]')
            return

        name = name.upper()

        values = ['MERCURY','VENUS','EARTH','MARS','VESTA','CERES','PALLAS','HYGIEA','JUPITER','SATURN','URANUS','NEPTUNE','PLUTO','HAUMEA','MAKEMAKE','ERIS']

        if name not in values:
            console.print('[bold red]NAME NOT LOCALLY RECOGNIZED OR WRONG SPELLING[/bold red]')
            return

        ##position vectora using thebreal osc elelmts##

        retu = self.reel('EARTH',None,'y') ## last parameter is the rotated using osc elem for earth
        retur = self.future(name,days,'y') #target planet and delta t and real param for future coord
        delta_t = days*24*60*60

        mgn_mult = vectors.magn_vect([retu['X_helioreal'],retu['Y_helioreal'],retu['Z_helioreal']], [retur['X_helioreal'],retur['Y_helioreal'],retur['Z_helioreal']])


        delta_theta = math.acos((vectors.dot_vect([retu['X_helioreal'],retu['Y_helioreal'],retu['Z_helioreal']], [retur['X_helioreal'],retur['Y_helioreal'],retur['Z_helioreal']]))/mgn_mult[4]) #arccos always returns btwn 0 and pi 
        delta_theta_raw = math.degrees(delta_theta)

        ##cross product to check if Z comp is positive
        cross_Z = vectors.cross_vect([retu['X_helioreal'],retu['Y_helioreal'],retu['Z_helioreal']], [retur['X_helioreal'],retur['Y_helioreal'],retur['Z_helioreal']])

        if cross_Z[2]>=0: #short way
            delta_theta_raw_ = delta_theta_raw

        elif cross_Z[2]<0: #long way
            delta_theta_raw_ = 360 - delta_theta_raw
            console.print('[bold magenta]Craft going long way[/bold magenta]')

        delta_th = math.radians(delta_theta_raw_)


        A = math.sin(delta_th)*math.sqrt(mgn_mult[4]/(1 - math.cos(delta_th))) #The Geometric if delta theta is less pi then A will be positive because of the sin fxn and negative if delta theta if >pi
        print('A Geometric: ',A)
        z = 0 #first guess


        while 0<=z<1e-5:
            #l = (math.sqrt(2)/40)*math.pow(y,1.5)

            y = mgn_mult[2] - (A*math.sqrt(2))
            slope_y = (math.sqrt(2)/2)*((mgn_mult[2]/5) + (A/2))
            chi = math.sqrt((2*y)) #X rep the change in generalized eccentric anomaly
            change_chi_to_z = (1/(2*chi))*((2*y) + (y/6)) #not needed here
            t_calc = (1/math.sqrt(self.GM_S))*(((1/6)*math.pow(chi,3))+(A*math.sqrt(y)))
            error_f = t_calc - delta_t
            l = (math.sqrt(2)/40)*math.pow(y,1.5)
            w = A*(math.sqrt(1/(2*y)))
            slope_f = (1/math.sqrt(self.GM_S))*(l + ((A/8)*(math.sqrt(y)+w)))
            z = z - (error_f/slope_f)

        console.print('[bold magenta]Exited z=0 and continuing..[/bold magenta]')
        print('z after first 0 guess: ',z)
        print('error fuxn derivative: ',slope_f)
        print('error_f: ',error_f)





        while True:
            stumpf = self.stumpff(z)
            deriv_stumpf = self.deriv_stumpff(z)
            y_z = mgn_mult[2] + (A*((z*stumpf['S_z']-1)/math.sqrt(stumpf['C_z'])))

           # k = (deriv_stumpf['der_C']*((z*stumpf['S_z'])-1))/(2*stumpf['C_z'])

            #slope_y_z = (A/math.sqrt(stumpf['C_z']))*((stumpf['S_z']+(z*deriv_stumpf['der_S'])) - k)

            if y_z<0:
                console.print('[bold red]y is negative[/bold red]')
                return

            chi_z = math.sqrt((y_z/stumpf['C_z']))
           # dx_part_eq = (((slope_y_z*stumpf['C_z'])-(y_z*deriv_stumpf['der_C']))/math.pow(stumpf['C_z'],2)) #part of the dx/dz equation
            #change_chi_rel_z = (1/(2*chi_z))*(dx_part_eq) #diffrent error function derivative equation uses this.
            t_calc_z = (1/math.sqrt(self.GM_S))*((math.pow(chi_z,3)*stumpf['S_z']) + (A*math.sqrt(y_z)))
            error_f_z = t_calc_z - delta_t

            if abs(error_f_z)<3.0:
                console.print('\n[bold magenta]Found it[/bold magenta]')
                return [z,error_f_z]
                #break

            a_e = ((deriv_stumpf['der_S']-(3*stumpf['S_z']*deriv_stumpf['der_C']))/(2*math.sqrt(stumpf['C_z']))) #part of equation
            a_k = (((3*stumpf['S_z']*math.sqrt(y_z))/stumpf['C_z']) + (A*(math.sqrt(stumpf['C_z'])/y_z)))

            slope_f_z = (1/math.sqrt(self.GM_S))*((chi_z*(a_e)) + ((A/8)*a_k))
           # a_e = (1/(2*z))*(stumpf['C_z']-((3*stumpf['S_z'])/2))
            #a_k = (3*math.pow(stumpf['S_z'],2)/(4*stumpf['C_z']))
            #slope_f_z = (1/math.sqrt(self.GM_S))*((math.pow(chi_z,3)*(a_e - a_k)) + ((A/8)*((3*stumpf['S_z']*chi_z)+(A/math.sqrt(y_z)))))
            check = error_f_z/slope_f_z

            if check > 20:
                check = 20
            elif check < -20:
                check = -20

            z = z - (check)
            print('z: ',z)
            print('error f',error_f_z)
            print('error f deriv: ',slope_f_z)

        #return [z,error_f_z]








            
    def rungekutta(self,r=None,v=None,tt=None,days=None): # the net acceleration formulae uses barycentric frames....
        '''the universal runge kutta with positional argument tt strictly in (days). returns lists containing new_position vectors, new_velocity vectors, new_acceleration vectors for all internal objects including the sun.'''

      #  if v==None: # runge kutta requires the position derivative (velocity) to continue...r can be None for now
       #     console.print('[red]rungekutta requires the position derivative of time to continue[/red]')
        #    return

    ####please use this method for timestwpping..i think in the other methods i have not checked the type of days value if passed..this method chwcks and passes the correct value

        if r and v:

            if not isinstance(r,list) or not isinstance(v,list):
                console.print('[red]rungekutta requires the position vector and the position derivative of time to be[/red][white]iterables[/white]')
                return

        ##implwment barycentric later


            try:
                g = [] #the position vector
                k = [] #the velocitu vector
                if tt:
                    ttm = float(tt)

                for _,itm in enumerate(v):
                    k.append(float(itm))
                    g.append(float(r[_]))

            except ValueError:
                raise ValueError(f'component type not supported {itm if ttm==None else ttm} ¦ {r[_] if ttm==None else None}')

        try:
            if tt:
                ttm = float(tt)
        except ValueError:
            raise ValueError(f'passed value type for tt is not supported: {tt} ¦ {type(tt)}.\n Required value type is integer in terms of days strictly')
        

        delta_t = (0.041666666666666664 if tt==None else ttm)*86400 #one hour expressed in days..then in seconds because the velocities are m/s and the accelerations m/s^2
        if days:
            try:
                days = float(days) #override
            except ValueError:
                raise ValueError(f'passed value type for days is not supported {days}')

 ##should use if r==None and v==None...continue ...i am yet to implement the universal rungekutta


        k1fullposvect = []
        k1fullvelvect = [] #k1 velocity vector position derivative for time
        k1fullaccvect = [] #k1 acce vector velocity derivative for time

        if days:
            suun = self.baryc_sun(days)
            suunaccX,suunaccY,suunaccZ = self.acce('sun',days)

        else:
            suun = self.baryc_sun()
            suunaccX,suunaccY,suunaccZ = self.acce('sun')


        k1sunvelvect = [suun['v_X'],suun['v_Y'],suun['v_Z']] #this is the pos derivative gorntime
        k1sunposvect = [suun['X_s'],suun['Y_s'],suun['Z_s']] #positioj derivat8ve for time
        k1fullposvect.append(k1sunposvect) #sol sun as index 0
        k1fullvelvect.append(k1sunvelvect)
        k1fullaccvect.append([suunaccX,suunaccY,suunaccZ])
        for _ in self.values_tt:
            if days:
                obj = self.barycentric(_,days)
                accobj0,accobj1,accobj2 = self.acce(_,days)
            else:
                obj = self.barycentric(_)
                accobj0,accobj1,accobj2 = self.acce(_)


            k1fullposvect.append([obj['X_bary'],obj['Y_bary'],obj['Z_bary']])
            k1fullvelvect.append([obj['v_X'],obj['v_Y'],obj['v_Z']]) #K1r,i ..pos slope for k1
        #    k1sunposvect = [obj['sun_baryc_X'],obj['sun_baryc_Y'],obj['sun_baryc_Z']]
         #   k2sunvelvect = [obj['sun_baryc_']]
            k1fullaccvect.append([accobj0,accobj1,accobj2]) #velocity slope for k1

        ##k2###
        midpos = [] #17 items 
        midvel = [] #K2 pos slope 17 items
        midacc = [] #K2 vel slope 17 items

        if days:
            k2sunposvel = self.baryc_sun(days)
        else:
            k2sunposvel = self.baryc_sun()


        possunk2X = k2sunposvel['X_s'] + (k1fullvelvect[0][0] * (delta_t/2))
        possunk2Y = k2sunposvel['Y_s'] + (k1fullvelvect[0][1] * (delta_t/2))
        possunk2Z = k2sunposvel['Z_s'] + (k1fullvelvect[0][2] * (delta_t/2)) #midpoint sun k2 pos
        ###I THINK i will only need the midpoint position vectors for the sun so that i can be able to use the custacce method.
        velsunk2X = k2sunposvel['v_X'] + (k1fullaccvect[0][0] * (delta_t/2))
        velsunk2Y = k2sunposvel['v_Y'] + (k1fullaccvect[0][1] * (delta_t/2))
        velsunk2Z = k2sunposvel['v_Z'] + (k1fullaccvect[0][2] * (delta_t/2))
        midpos.append([possunk2X,possunk2Y,possunk2Z]) #midpoint pos vector for Sol at index 0
        midvel.append([velsunk2X,velsunk2Y,velsunk2Z])
        for _,idx in enumerate(self.values_tt):
            if days:
                k2posvel = self.barycentric(idx,days)
            else:
                k2posvel = self.barycentric(idx) #returns both velocity and pos vectors

            posk2X = k2posvel['X_bary'] + (k1fullvelvect[_+1][0] * (delta_t/2)) #the midpoint..pos
            posk2Y = k2posvel['Y_bary'] + (k1fullvelvect[_+1][1] * (delta_t/2)) #plus one +1 because Sol is at index 0 and values_tt has the orbiting bodies only with mwrcury at index 0 hence +1
            posk2Z = k2posvel['Z_bary'] + (k1fullvelvect[_+1][2] * (delta_t/2))
            velk2X = k2posvel['v_X'] + (k1fullaccvect[_+1][0] * (delta_t/2)) #mid poijt velocity
            velk2Y = k2posvel['v_Y'] + (k1fullaccvect[_+1][1] * (delta_t/2))
            velk2Z = k2posvel['v_Z'] + (k1fullaccvect[_+1][2] * (delta_t/2))
# for compatibility i added the sun b4 the for loop
            


            midpos.append([posk2X,posk2Y,posk2Z])
            midvel.append([velk2X,velk2Y,velk2Z]) #K2 pos slope

        ##just a note the rate of change in terms of time of the position vector is the velocity vector...
        #the k2 position derivative is just midvel
        ##K2 net acceleration using r2##

        k2accsunX,k2accsunY,k2accsunZ = self.custacce(0,midpos) #custacce has no days arg bcause it already uses the fst forwaded midpos..if day..get it??
        midacc.append([k2accsunX,k2accsunY,k2accsunZ])
        for _,idx in enumerate(self.values_tt): #k2 vel derivat8ve for time
            k2acc0,k2acc1,k2acc2 = self.custacce(_+1,midpos) #the k2 midpoint velocity slope = acceleration...me5hod cust acce requires that the passed pos and velocity vectors sho8ld be correclty indexed so that the masses work correctly...+1 because Sol is index 0
            midacc.append([k2acc0,k2acc1,k2acc2]) #k2 vel slope



        ##K3##
        midposk3 = []
        midvelk3 = []
        midacck3 = []

        if days:
            k3sunposvel = self.baryc_sun(days)
        else:
            k3sunposvel = self.baryc_sun()

        possunk3X = k3sunposvel['X_s'] + (midvel[0][0] * (delta_t/2))
        possunk3Y = k3sunposvel['Y_s'] + (midvel[0][1] * (delta_t/2))
        possunk3Z = k3sunposvel['Z_s'] + (midvel[0][2] * (delta_t/2))

        velsunk3X = k3sunposvel['v_X'] + (midacc[0][0] * (delta_t/2))
        velsunk3Y = k3sunposvel['v_Y'] + (midacc[0][1] * (delta_t/2))
        velsunk3Z = k3sunposvel['v_Z'] + (midacc[0][2] * (delta_t/2))

        midposk3.append([possunk3X,possunk3Y,possunk3Z])
        midvelk3.append([velsunk3X,velsunk3Y,velsunk3Z])

        for _,idx in enumerate(self.values_tt):
            if days:
                k3posvel = self.barycentric(idx,days)
            else:
                k3posvel = self.barycentric(idx)

            posk3X = k3posvel['X_bary'] + (midvel[_+1][0] * (delta_t/2))
            posk3Y = k3posvel['Y_bary'] + (midvel[_+1][1] * (delta_t/2))
            posk3Z = k3posvel['Z_bary'] + (midvel[_+1][2] * (delta_t/2))
            
            velk3X = k3posvel['v_X'] + (midacc[_+1][0] * (delta_t/2))
            velk3Y = k3posvel['v_Y'] + (midacc[_+1][1] * (delta_t/2))
            velk3Z = k3posvel['v_Z'] + (midacc[_+1][2] * (delta_t/2))

            midposk3.append([posk3X,posk3Y,posk3Z])
            midvelk3.append([velk3X,velk3Y,velk3Z])


        k3accsunX,k3accsunY,k3accsunZ = self.custacce(0,midposk3)
        midacck3.append([k3accsunX,k3accsunY,k3accsunZ])

        for _,idx in enumerate(self.values_tt):
            k3accX,k3accY,k3accZ = self.custacce(_+1,midposk3)
            midacck3.append([k3accX,k3accY,k3accZ])




        ##k4###
        midposk4 = []
        midvelk4 = []
        midacck4 = []

        if days:
            k4sun = self.baryc_sun(days)
        else:
            k4sun = self.baryc_sun()

        possunk4X = k4sun['X_s'] + (midvelk3[0][0] * delta_t)
        possunk4Y = k4sun['Y_s'] + (midvelk3[0][1] * delta_t)
        possunk4Z = k4sun['Z_s'] + (midvelk3[0][2] * delta_t)
        velsunk4X = k4sun['v_X'] + (midacck3[0][0] * delta_t)
        velsunk4Y = k4sun['v_Y'] + (midacck3[0][1] * delta_t)
        velsunk4Z = k4sun['v_Z'] + (midacck3[0][2] * delta_t)

        midposk4.append([possunk4X,possunk4Y,possunk4Z])
        midvelk4.append([velsunk4X,velsunk4Y,velsunk4Z])

        for _,idx in enumerate(self.values_tt):
            if days:
                k4posvel = self.barycentric(idx,days)
            else:
                k4posvel = self.barycentric(idx)

            posk4X = k4posvel['X_bary'] + (midvelk3[_+1][0] * delta_t)
            posk4Y = k4posvel['Y_bary'] + (midvelk3[_+1][1] * delta_t)
            posk4Z = k4posvel['Z_bary'] + (midvelk3[_+1][2] * delta_t)

            velk4X = k4posvel['v_X'] + (midacck3[_+1][0] * delta_t)
            velk4Y = k4posvel['v_Y'] + (midacck3[_+1][1] * delta_t)
            velk4Z = k4posvel['v_Z'] + (midacck3[_+1][2] * delta_t)

            midposk4.append([posk4X,posk4Y,posk4Z])
            midvelk4.append([velk4X,velk4Y,velk4Z])


        k4sunaccX,k4sunaccY,k4sunaccZ = self.custacce(0,midposk4)
        midacck4.append([k4sunaccX,k4sunaccY,k4sunaccZ])

        for _,idx in enumerate(self.values_tt):
            k4accX,k4accY,k4accZ = self.custacce(_+1,midposk4)
            midacck4.append([k4accX,k4accY,k4accZ])




        ###final weighted average##
        final_r = []
        final_v = []
        final_acc = [] #doesnt need days bcoz it takes thebpos vectors that already have a days if days..

        if days:
            fn_sun = self.baryc_sun(days)
        else:
            fn_sun = self.baryc_sun()

        sun_X = fn_sun['X_s'] + ((delta_t/6)*(k1fullvelvect[0][0] + (2*midvel[0][0]) + (2*midvelk3[0][0]) + midvelk4[0][0]))
        sun_Y = fn_sun['Y_s'] + ((delta_t/6)*(k1fullvelvect[0][1] + (2*midvel[0][1]) + (2*midvelk3[0][1]) + midvelk4[0][1]))
        sun_Z = fn_sun['Z_s'] + ((delta_t/6)*(k1fullvelvect[0][2] + (2*midvel[0][2]) + (2*midvelk3[0][2]) + midvelk4[0][2]))

        sun_v_X = fn_sun['v_X'] + ((delta_t/6)*(k1fullaccvect[0][0] + (2*midacc[0][0]) + (2*midacck3[0][0]) + midacck4[0][0]))
        sun_v_Y = fn_sun['v_Y'] + ((delta_t/6)*(k1fullaccvect[0][1] + (2*midacc[0][1]) + (2*midacck3[0][1]) + midacck4[0][1]))
        sun_v_Z = fn_sun['v_Z'] + ((delta_t/6)*(k1fullaccvect[0][2] + (2*midacc[0][2]) + (2*midacck3[0][2]) + midacck4[0][2]))

        final_r.append([sun_X,sun_Y,sun_Z])
        final_v.append([sun_v_X,sun_v_Y,sun_v_Z])

        for _,idx in enumerate(self.values_tt):
            if days:
                fn_oth = self.barycentric(idx,days)
            else:
                fn_oth = self.barycentric(idx)


            oth_X = fn_oth['X_bary'] + ((delta_t/6) * (k1fullvelvect[_+1][0] + (2*midvel[_+1][0]) + (2*midvelk3[_+1][0]) + midvelk4[_+1][0]))
            oth_Y = fn_oth['Y_bary'] + ((delta_t/6) * (k1fullvelvect[_+1][1] + (2*midvel[_+1][1]) + (2*midvelk3[_+1][1]) + midvelk4[_+1][1]))
            oth_Z = fn_oth['Z_bary'] + ((delta_t/6) * (k1fullvelvect[_+1][2] + (2*midvel[_+1][2]) + (2*midvelk3[_+1][2]) + midvelk4[_+1][2]))

            oth_v_X = fn_oth['v_X'] + ((delta_t/6) * (k1fullaccvect[_+1][0] + (2*midacc[_+1][0]) + (2*midacck3[_+1][0]) + midacck4[_+1][0]))
            oth_v_Y = fn_oth['v_Y'] + ((delta_t/6) * (k1fullaccvect[_+1][1] + (2*midacc[_+1][1]) + (2*midacck3[_+1][1]) + midacck4[_+1][1]))
            oth_v_Z = fn_oth['v_Z'] + ((delta_t/6) * (k1fullaccvect[_+1][2] + (2*midacc[_+1][2]) + (2*midacck3[_+1][2]) + midacck4[_+1][2]))

            final_r.append([oth_X,oth_Y,oth_Z])
            final_v.append([oth_v_X,oth_v_Y,oth_v_Z])

        ##final acc net##0 as Sol still
        fn_sunaccX,fn_sunaccY,fn_sunaccZ = self.custacce(0,final_r)
        final_acc.append([fn_sunaccX,fn_sunaccY,fn_sunaccZ])

        for _,idx in enumerate(self.values_tt):
            fn_accX,fn_accY,fn_accZ = self.custacce(_+1,final_r)
            final_acc.append([fn_accX,fn_accY,fn_accZ])


        return {'desc':'the zeroth 0th index is Sol ¿Sun¿','delta_t':delta_t,'time_step':f'{ttm if tt else 'default is one hour. Should use days positional argument if you want to really time step into the future. Strictly in terms of days also'}','days':f'{days if days else None}','explanation':'if days is given, astlo will time step literally according to the number of days given. The tt pos argument should just stay as one hour. use days if you really want to time step. astlo¦rk4 will handle the rest','new_pos_vectors':final_r,'new_vel_vectors':final_v,'new_acc_vectors':final_acc}


            








    def anmte(self,name: str=None,rt=None,real=None,baryc=None,itret=None): #itret can be used universally inside this method to tell/decide if to return or to print, baryc to activate barycentric logic..default is heliocentric.
        '''animates the orbits and current position of celestial object using seconds and AU'''

        #if os.name=='nt':
         #   os.system('cls')
        #else:
         #   os.system('clear')


        if name==None:
            raise ValueError('NAME CANNOT BE NONE/EMPTY') #was console.print + sys.exit(0), which also closed the program that called astlo

        name = name.upper()

        values = ['MERCURY','VENUS','EARTH','MARS','VESTA','CERES','PALLAS','HYGIEA','JUPITER','SATURN','URANUS','NEPTUNE','PLUTO','HAUMEA','MAKEMAKE','ERIS']

        if name not in values:
            raise ValueError(f'NAME NOT LOCALLY RECOGNIZED OR WRONG SPELLING: {name}') #was console.print + sys.exit(0), which also closed the program that called astlo

        #name = name.upper()

        #rui = self.barycentric(name)


        #values = ['MERCURY','VENUS','EARTH','MARS','VESTA','CERES','PALLAS','HYGIEA','JUPITER','SATURN','URANUS','NEPTUNE','PLUTO','HAUMEA','MAKEMAKE','ERIS']


        index = 0 if name==values[0] else 1 if name==values[1] else 2 if name==values[2] else 3 if name==values[3] else 4 if name==values[4] else 5 if name==values[5] else 6 if name==values[6] else 7 if name==values[7] else 8 if name==values[8] else 9 if name==values[9] else 10 if name==values[10] else 11 if name==values[11] else 12 if name==values[12] else 13 if name==values[13] else 14 if name==values[14] else 15 if name==values[15] else None


        values_1 = [
                {'name':'MERCURY','p':self.Mercury_P*self.earthperiod_d,'MO':self.Mercury_MO,'ps':self.Mercury_P*self.earthperiod_s,'a':self.Mercury_AU*self.AU_m,'e':self.Mercury_e,'i':math.radians(self.Mercury_i),'w':math.radians(self.Mercury_w),'omega':math.radians(self.Mercury_omega)},
                {'name':'VENUS','p':self.Venus_P*self.earthperiod_d,'MO':self.Venus_MO,'ps':self.Venus_P*self.earthperiod_s,'a':self.Venus_AU*self.AU_m,'e':self.Venus_e,'i':math.radians(self.Venus_i),'w':math.radians(self.Venus_w),'omega':math.radians(self.Venus_omega)},
                {'name':'EARTH','p':self.earthperiod_d,'MO':self.Earth_MO,'ps':self.earthperiod_s,'a':self.Earth_AU*self.AU_m,'e':self.Earth_e,'i':math.radians(self.Earth_i),'w':math.radians(self.Earth_w),'omega':math.radians(self.Earth_omega)},
                {'name':'MARS','p':self.Mars_P*self.earthperiod_d,'MO':self.Mars_MO,'ps':self.Mars_P*self.earthperiod_s,'a':self.Mars_AU*self.AU_m,'e':self.Mars_e,'i':math.radians(self.Mars_i),'w':math.radians(self.Mars_w),'omega':math.radians(self.Mars_omega)},
                {'name':'VESTA','p':self.Vesta_P*self.earthperiod_d,'MO':self.Vesta_MO,'ps':self.Vesta_P*self.earthperiod_s,'a':self.Vesta_AU*self.AU_m,'e':self.Vesta_e,'i':math.radians(self.Vesta_i),'w':math.radians(self.Vesta_w),'omega':math.radians(self.Vesta_omega)},
                {'name':'CERES','p':self.Ceres_P*self.earthperiod_d,'MO':self.Ceres_MO,'ps':self.Ceres_P*self.earthperiod_s,'a':self.Ceres_AU*self.AU_m,'e':self.Ceres_e,'i':math.radians(self.Ceres_i),'w':math.radians(self.Ceres_w),'omega':math.radians(self.Ceres_omega)},
                {'name':'PALLAS','p':self.Pallas_P*self.earthperiod_d,'MO':self.Pallas_MO,'ps':self.Pallas_P*self.earthperiod_s,'a':self.Pallas_AU*self.AU_m,'e':self.Pallas_e,'i':math.radians(self.Pallas_i),'w':math.radians(self.Pallas_w),'omega':math.radians(self.Pallas_omega)},
                {'name':'HYGIEA','p':self.Hygiea_P*self.earthperiod_d,'MO':self.Hygiea_MO,'ps':self.Hygiea_P*self.earthperiod_s,'a':self.Hygiea_AU*self.AU_m,'e':self.Hygiea_e,'i':math.radians(self.Hygiea_i),'w':math.radians(self.Hygiea_w),'omega':math.radians(self.Hygiea_omega)},
                {'name':'JUPITER','p':self.Jupiter_P*self.earthperiod_d,'MO':self.Jupiter_MO,'ps':self.Jupiter_P*self.earthperiod_s,'a':self.Jupiter_AU*self.AU_m,'e':self.Jupiter_e,'i':math.radians(self.Jupiter_i),'w':math.radians(self.Jupiter_w),'omega':math.radians(self.Jupiter_omega)},
                {'name':'SATURN','p':self.Saturn_P*self.earthperiod_d,'MO':self.Saturn_MO,'ps':self.Saturn_P*self.earthperiod_s,'a':self.Saturn_AU*self.AU_m,'e':self.Saturn_e,'i':math.radians(self.Saturn_i),'w':math.radians(self.Saturn_w),'omega':math.radians(self.Saturn_omega)},
                {'name':'URANUS','p':self.Uranus_P*self.earthperiod_d,'MO':self.Uranus_MO,'ps':self.Uranus_P*self.earthperiod_s,'a':self.Uranus_AU*self.AU_m,'e':self.Uranus_e,'i':math.radians(self.Uranus_i),'w':math.radians(self.Uranus_w),'omega':math.radians(self.Uranus_omega)},
                {'name':'NEPTUNE','p':self.Neptune_P*self.earthperiod_d,'MO':self.Neptune_MO,'ps':self.Neptune_P*self.earthperiod_s,'a':self.Neptune_AU*self.AU_m,'e':self.Neptune_e,'i':math.radians(self.Neptune_i),'w':math.radians(self.Neptune_w),'omega':math.radians(self.Neptune_omega)},
                {'name':'PLUTO','p':self.Pluto_P*self.earthperiod_d,'MO':self.Pluto_MO,'ps':self.Pluto_P*self.earthperiod_s,'a':self.Pluto_AU*self.AU_m,'e':self.Pluto_e,'i':math.radians(self.Pluto_i),'w':math.radians(self.Pluto_w),'omega':math.radians(self.Pluto_omega)},
                {'name':'HAUMEA','p':self.Haumea_P*self.earthperiod_d,'MO':self.Haumea_MO,'ps':self.Haumea_P*self.earthperiod_s,'a':self.Haumea_AU*self.AU_m,'e':self.Haumea_e,'i':math.radians(self.Haumea_i),'w':math.radians(self.Haumea_w),'omega':math.radians(self.Haumea_omega)},
                {'name':'MAKEMAKE','p':self.Makemake_P*self.earthperiod_d,'ps':self.Makemake_P*self.earthperiod_s,'a':self.Makemake_AU*self.AU_m,'MO':self.Makemake_MO,'e':self.Makemake_e,'i':math.radians(self.Makemake_i),'w':math.radians(self.Makemake_w),'omega':math.radians(self.Makemake_omega)},
                {'name':'ERIS','p':self.Eris_P*self.earthperiod_d,'MO':self.Eris_MO,'ps':self.Eris_P*self.earthperiod_s,'a':self.Eris_AU*self.AU_m,'e':self.Eris_e,'i':math.radians(self.Eris_i),'w':math.radians(self.Eris_w),'omega':math.radians(self.Eris_omega)}]

        #return retu ...from previous full list function


        

        #values = ['MERCURY','VENUS','EARTH','MARS','CERES','JUPITER','SATURN','URANUS','NEPTUNE','PLUTO','ERIS'] # should update to the current 16 objects
        Title=values_1[index].get('name','NULL ORBIT')

        #vallues = {'MERCURY':88,'VENUS':225,'EARTH':365,'MARS':687,'CERES':1681,'JUPITER':4333,'SATURN':10759,'URANUS':30685,'NEPTUNE':60190,'PLUTO':90465,'ERIS':204174} #helped in getting the period

        valluesr_1 = {'MERCURY':'M','VENUS':'V','EARTH':'E','MARS':'M','CERES':'C','JUPITER':'J','SATURN':'S','URANUS':'U','NEPTUNE':'N','PLUTO':'P','ERIS':'E','HAUMEA':'H','MAKEMAKE':'M','HYGIEA':'H','VESTA':'V','PALLAS':'P'}

        #if name==None:
         #   console.print('[bold red]NAME CANNOT BE NONE/EMPTY[/bold red]')
          #  sys.exit(0)


        #retur = super().orbit(0,int(vallues.get(name,'-2')),None,'y')#using days and AU
        #retur = super().orbits(name,'y',None) #using seconds and converted to AU
        if rt:
            '''uses the accurate real time logic for a one time plot print'''
            if os.name=='nt':
                os.system('cls')
            else:
                os.system('clear')

            retu = super().orbits(name,'y',None)
            rew = self.barycentric(name)

            ptxt.clf()
            width,height = ptxt.terminal_size()
            ptxt.plotsize(width,height)
            ptxt.plot(retu['X_AUheliolist'],retu['Y_AUheliolist'],color='white')
            ptxt.scatter([rew['sun_baryc_X']/self.AU_m],[rew['sun_baryc_Y']/self.AU_m],marker='🌞') #current sun offset from barycenter
            ptxt.scatter([0],[0],marker='B') #barycenter
            ptxt.scatter([rew['X_helio']/self.AU_m],[rew['Y_helio']/self.AU_m],color='red',marker=valluesr_1.get(name,'error'))
            ptxt.xlabel('x axis AU')
            ptxt.ylabel('y axis AU')
            ptxt.title(f'{Title} at Unix time: {rew['Unix_time']}//{time.asctime()}')
            ptxt.theme('dark')
            ptxt.show()


            #return {'pltxt':ptxt,'desc':'one time real time plot print using seconds and AU'}
            sys.exit(0) #for the cli



        vallues = {'MERCURY':88,'VENUS':225,'EARTH':365,'MARS':687,'CERES':1681,'JUPITER':4333,'SATURN':10759,'URANUS':30685,'NEPTUNE':60190,'PLUTO':90465,'ERIS':204174} #helped in getting the period

        retur = super().orbit(0,int(vallues.get(name,'-2')),None,'y')#using days and AU


        wrong = ['VESTA','HYGIEA','PALLAS','HAUMEA','MAKEMAKE'] #FOR NOW
        vallues_1 = {'MERCURY':'M','VENUS':'V','EARTH':'E','MARS':'M','CERES':'C','JUPITER':'J','SATURN':'S','URANUS':'U','NEPTUNE':'N','PLUTO':'P','ERIS':'E'}



        if real: ##uses the real time osculating elements to rotate and plot.
            if baryc:
                '''barycentric logic using the real time osculating elements'''
                real_osc_plot = self.reel(name,'y') #they are live osculating elements so they change iver time..but calling thw function for every iteration is too much..the returned object will always be live❤️
                #reti = self.barycentric(name)

                while name not in wrong:

                    try:
                        if os.name=='nt':
                            os.system('cls')
                        else:
                            os.system('clear')

                        reti = self.barycentric(name)

                        ##animating##
                        ptxt.clf()
                        width,height = ptxt.terminal_size()
                        ptxt.plotsize(width,height)
                        ptxt.plot(real_osc_plot['X_AUl'],real_osc_plot['Y_AUl'],color='white')
                        ptxt.scatter([reti['sun_baryc_X']/self.AU_m],[reti['sun_baryc_Y']/self.AU_m],marker='🌞') #suns barycentric offset
                        ptxt.scatter([0],[0],marker='B') #the Barycenter
                        ptxt.scatter([reti['X_bary']/self.AU_m],[reti['Y_bary']/self.AU_m],color='red',marker=vallues_1.get(name,'ERROR'))
                        ptxt.xlabel('..X_AU_axis..')
                        ptxt.ylabel('..Y_AU_axis..')
                        ptxt.title(f'{Title}-Unix time: {reti['Unix_time']}//{time.asctime()} Barycentric')
                        ptxt.theme('dark')
                        
                        if itret: #the universal return parameter
                            return ptxt

                        ptxt.show()
                        time.sleep(1)

                    except KeyboardInterrupt:
                        console.print('[bold red]KEYBOARD INTERRUPT[/bold red]')
                        sys.exit(0) #for cli use sys exit for IDE use return

            
            real_osc_plot = self.reel(name) #heliocentrci frame
            #reti = self.barycentric(name)

            while name not in wrong:
                try:
                    if os.name=='nt':
                        os.system('cls')
                    else:
                        os.system('clear')

                    reti = self.barycentric(name)

                    ##animating##
                    ptxt.clf()
                    width,height = ptxt.terminal_size()
                    ptxt.plotsize(width,height)
                    ptxt.plot(real_osc_plot['X_helioAU'],real_osc_plot['Y_helioAU'],color='white')
                    ptxt.scatter([0],[0],marker='🌞') #the sun heliocentric
                    ptxt.scatter([reti['X_helio']/self.AU_m],[reti['Y_helio']/self.AU_m],color='red',marker=vallues_1.get(name,'ERROR'))
                    ptxt.xlabel('..X_AU_axis..')
                    ptxt.ylabel('..Y_AU_axis..')
                    ptxt.title(f'{Title}-Unix time: {reti['Unix_time']}//{time.asctime()} Heliocentric')
                    ptxt.theme('dark')

                    if itret:
                        return ptxt

                    ptxt.show()
                    time.sleep(1)

                except KeyboardInterrupt:
                    console.print('[bold red]KEYBOARD INTERRUPT[/bold red]')
                    sys.exit(0)

                   

            
            
        
        while name not in wrong:

            try:
                '''the barycentric() feeds the loop with real time values.'''

                if os.name=='nt':
                    os.system('cls')
                else:
                    os.system('clear')


                ret = self.barycentric(name) # another enforcer inside barycentric.orbits()

                #vallues = {'MERCURY':88,'VENUS':225,'EARTH':365,'MARS':687,'CERES':1681,'JUPITER':4333,'SATURN':10759,'URANUS':30685,'NEPTUNE':60190,'PLUTO':90465,'ERIS':204174}

                #retur = super().orbit(0,int(vallues.get(name,'-2')),None,'y') # days_elapsed set to its default value == 0..second function argument in the orbit function is the period and the 3rd argument = planet default value and the 4th argument is the activation of the eccentric logic in orbit

                day = (ret['M']/(2*math.pi))*values_1[index]['p'] #gives the day from the real mean anomaly in self.barycentric()

                #i = (ret['M']/(2*math.pi))*retur['XYZME_list_size'] # the index ...CAN USE EITHER DAY IR i...

                X_day = retur['X_heliolist'][math.trunc(day)] # using truncate because if day==87.57 then that day is not over yet and therefore not valid hence 87....###updated from days to secodns
                Y_day = retur['Y_heliolist'][math.trunc(day)] #..matches the real Mean anomaly to the corresponding XY heliocentric Coord. 
                Z_day = retur['Z_heliolist'][math.trunc(day)] # the list index starts from 0th -1 for compatibility
                


                ###animating###
                ptxt.clf()
                width,height = ptxt.terminal_size()
                ptxt.plotsize(width,height)
                #Title=values_1[index].get('name','NULL ORBIT')

                ptxt.plot(retur['X_heliolist'],retur['Y_heliolist'],color='white')
                ptxt.scatter([ret['sun_baryc_X']/self.AU_m],[ret['sun_baryc_Y']/self.AU_m],marker='🌞') #,label='Sun'
                ptxt.scatter([0],[0],marker='B') # SSB
                ptxt.scatter([X_day],[Y_day],color='red',marker=vallues_1.get(name,'Error')) #,label=..) # current position

                ptxt.xlabel('..X_axis AU..')
                ptxt.ylabel('..Y_axis AU..')
                ptxt.title(f'{Title} at Unix time: {ret['Unix_time']}//{time.asctime()}')
                ptxt.theme('dark')
                #ptxt.grid(True)
                
                if itret:
                    return ptxt # the plotext object...

                ptxt.show()

                time.sleep(1)

            except KeyboardInterrupt:
                console.print('[bold red]KEYBOARD INTERRUPT[/bold red]')
                sys.exit(0)

        console.print(f'[bold red]{[N for N in wrong]}NOT COMPATIBLE AS OF NOW[/bold red]')





    def rtime(self,name=None,lp=None,tble=None,luna=None):
        '''the printer to the terminal/command line/console'''

        #console = Console()

     #   if (lp and name==None) or (lp==None and name==None):
      #      console.print('[bold red]NAME CANNOT BE NONE/EMPTY[/bold red]')
       #     return
        
        if (name and luna) or (lp and luna) or (name and lp and luna) or (name and lp and tble and luna):
            return 'luna argument works soleley here'


        #console = Console()
      #  name = name.upper()

        if name==None and lp==None and tble==None and luna:
            retu = self.lunars('earth')

            acc_X,acc_Y,acc_Z = self.acce('luna')
            acc_magn = vectors.magn_vect([acc_X,acc_Y,acc_Z])

            return f'\n[bold cyan]System Name: [/bold cyan][bold white]{retu['name']} - {retu['actname']}[/bold white]\n[cyan]Current Unix time: [/cyan][white]{retu['tim_e']} or {time.asctime()}[/white]\n[bold cyan]Reference frame: [/bold cyan][yellow]January Julian J2000[/yellow]\n[cyan]Mean anomaly and eccentric anomaly: [/cyan][white]{retu['mean_anomaly']} , {retu['eccentric_anomaly']}[/white] [magenta](respectively)[/magenta]\n[cyan]Current orbital day: [/cyan][white]{None}[/white]\n[cyan]Geocentric position vector: [/cyan][white]({retu['X']},{retu['Y']},{retu['Z']})[/white] [magenta](m meters)[/magenta]\n\n[cyan]Geocentric velocity vector: [/cyan][white]({retu['v_X']},{retu['v_Y']},{retu['v_Z']})[/white] [magenta](m/s)[/magenta]\n\n[cyan]illumination element k and illumination percentage P Heliocentric: [/cyan][white]{retu['k']} ¦ {round((retu['k']*100),2)}[/white] [magenta](%)[/magenta]\n[cyan]illumination element k and illumination percentage P Barycentric: [/cyan][white]{retu['k_bary']} ¦ {round((retu['k_bary']*100),2)}[/white] [magenta](%)[/magenta]\n[cyan]Current distance of Luna from Earth: [/cyan][white]{retu['r_magnitude']}[/white] [magenta](m meters)[/magenta] [white]{retu['r_magnitude']/1000}[/white] [magenta](km)[/magenta]\n[cyan]Current Geocentric orbital velocity: [/cyan][white]{retu['v_magnitude']}[/white] [magenta](m/s)[/magenta] [white]{retu['v_magnitude']/1000}[/white] [magenta](km/s)[/magenta]\n[cyan]Luna light delay to Earth: [/cyan][white]{retu['light_delay']}[/white] [magenta](s seconds)[/magenta] or [white]{retu['light_delay']/60}[/white] [magenta](minutes)[magenta]\n[cyan]Luna Solar light delay Heliocentric and Barycentric: [/cyan][white]{retu['light_delay_sun']}[/white] [magenta](s seconds)[/magenta] or [white]{retu['light_delay_sun']/60}[/white] [magenta](minutes)[/magenta] ¦¦ [yellow]Barycentric[/yellow] [white]{retu['light_delay_sun_bary']}[/white] [magenta](seconds)[/magenta] or [white]{retu['light_delay_sun_bary']/60}[/white] [magenta](minutes)[/magenta]\n\n[cyan]{retu['actname']} N_body gravitational acceleration: [/cyan][white]{acc_magn}[/white] [magenta](m/s^2)[/magenta]\n[cyan]{retu['actname']} N-body gravitational acceleration vector: [/cyan][white]({acc_X},{acc_Y},{acc_Z})[/white] [magenta](m/s^2)[/magenta]\n[cyan]Angular momentum vector: [/cyan][white]({retu['h_X']},{retu['h_Y']},{retu['h_Z']})[/white] [magenta](m^2/s)[/magenta]\n[cyan]Total Angular momentum: [/cyan][white]{retu['angular momentum_h']}[/white] [magenta](m^2/s)[/magenta]\n[cyan]Specific Energy E: [/cyan][white]{retu['energy']}[/white] [magenta](m^2/s^2)[/magenta]\n\n[yellow]osculating elements i, v(Nu).[/yellow]\n[cyan]Lunar orbital inclination: [/cyan][white]{retu['osc_i']}°[/white] [magenta](degrees)[/magenta]\n[cyan]Lunar current True anomaly Nu: [/cyan][white]{retu['true_anomaly']}°[/white] [magenta](degrees)[/magenta]\n\n[yellow]Luna current face and phase due to illumination from Sol.[/yellow]\n[cyan]Current Luna phase and face: [/cyan][white]{None}[/white]\n'
          #  return...returned the strin that can be console printed.



        if (lp and name==None) or (lp==None and name==None):
            console.print('[bold red]NAME CANNOT BE NONE/EMPTY[/bold red]')
            return

        if name:
            name = name.upper()


        if name and lp==None:

            retu = self.barycentric(name)
            ax,ay,az = self.acce(name)
            accel_a = math.sqrt(math.pow(ax,2) + math.pow(ay,2) + math.pow(az,2)) #m/s2
          #  key = 'bold Cyan'
           # keyclose = '/bold Cyan'
            #vam = 'bold white'
         #   vamclose = '/bold white'
          #  si = 'bold magenta'
           # siclose  = '/bold magenta'

           


            if name!='EARTH':

                #prin_t = f'\n[bold yellow]{retu['name']}[/bold yellow] [bold green]for Unix time[/bold green] [bold yellow]{retu['Unix_time']}[/bold yellow] [bold green]its X,Y,Z Coordinates were[/bold green] [bold yellow]({retu['X_bary']} , {retu['Y_bary']} , {retu['Z_bary']})[/bold yellow] [bold green]at a distance of[/bold green] [bold yellow]{retu['d_bary']}--(m)-- or {retu['d_bary']/1000}--(km)--[/bold yellow] [bold green]from Earth.\nLight delay[/bold green] [bold yellow]{retu['light_delay_bary']}--(seconds)-- or {retu['light_delay_bary']/60}--(minutes)--[/bold yellow].[bold green]This means you will see it from earth as it was {retu['light_delay_bary']}--(seconds)-- or {retu['light_delay_bary']/60}--(minutes)-- ago because it takes light {retu['light_delay_bary']}--(seconds)-- or {retu['light_delay_bary']/60}--(minutes)-- to reach Earth from {retu['name']}.\n{retu['name']} is currently[/bold green] [bold yellow]{retu['r_bary']}--(meters)-- or {retu['r_bary']/1000}--(km)-- or {retu['r_bary']/self.AU_m}--(Astronomical Units AU)--[/bold yellow] [bold green]from the sun.\nIt is currently orbiting the sun with a velocity of[/bold green] [bold yellow]{retu['v_bary']}--(m/s)-- or {retu['v_bary']/1000}--(km/s)--[/bold yellow].'

                prin_t = f'''\n[bold Cyan]Name: [/bold Cyan][bold white]{retu['name']}[/bold white]\n[bold Cyan]Current Unix Time: [/bold Cyan][bold white]{retu['Unix_time']}[/bold white] [bold magenta](s)[/bold magenta] or [bold white]{time.asctime()}[/bold white]\n[bold cyan]Reference frame: [/bold cyan][yellow]January Julian J2000[/yellow]\n[bold Cyan]Mean anomaly: [/bold Cyan][bold white]{retu['M']}[/bold white]\n[bold Cyan]Eccentric anomaly: [/bold Cyan][bold white]{retu['E']}[/bold white]\n[bold Cyan]Current orbital day on {retu['name']} (Orbital day): [/bold Cyan][bold white]{retu['resp_day']}[/bold white] [bold magenta](Sol)[/bold magenta]\n[bold Cyan]Velocity vector relative SSB: [/bold Cyan][bold white]({retu['v_X']}, {retu['v_Y']}, {retu['v_Z']}) [/bold white][bold magenta](m/s)[/bold magenta]\n[bold Cyan]Position vector relative SSB: [/bold Cyan][bold white]({retu['X_bary']}, {retu['Y_bary']}, {retu['Z_bary']})[/bold white] [bold magenta](m meters)[/bold magenta]\n\n[bold Cyan]Position vector relative Heliocenter: [/bold Cyan][bold white]({retu['X_helio']}, {retu['Y_helio']}, {retu['Z_helio']})[/bold white] [bold magenta](m meters)[/bold magenta]\n\n[bold Cyan]Gravitational acceleration vector due to other bodies: [/bold Cyan][bold white]({ax}, {ay}, {az})[/bold white] [bold magenta](m/s^2)[/bold magenta]\n[bold Cyan]Geocentric Distance using barycentric SSB frame: [/bold Cyan][bold white]{retu['d_bary']/1000}[/bold white] [bold magenta](km)[/bold magenta] [bold white]{retu['d_bary']/self.AU_m}[/bold white] [bold magenta](AU)[/bold magenta]\n[bold Cyan]Geocentric Distance using heliocentric ¿sun¿ frame: [/bold Cyan][bold white]{retu['d_helio']/1000}[/bold white] [bold magenta](km)[/bold magenta] [bold white]{retu['d_helio']/self.AU_m}[/bold white] [bold magenta](AU)[/bold magenta]\n[bold Cyan]Geocentric Light delay using barycentric SSB frame: [/bold Cyan][bold white]{retu['light_delay_bary']}[/bold white] [bold magenta](s)[/bold magenta] [bold white]{retu['light_delay_bary']/60}[/bold white] [bold magenta](minutes)[/bold magenta]\n[bold Cyan]Geocentric light delay using heliocentric ¿sun¿ frame: [/bold Cyan][bold white]{retu['light_delay_helio']}[/bold white] [bold magenta](s)[/bold magenta] [bold white]{retu['light_delay_helio']/60} [bold magenta](minutes)[/bold magenta]\n[bold Cyan]Light delay from heliocenter to {retu['name']}: [/bold Cyan][bold white]{retu['light_delay_sun_helio']}[/bold white] [bold magenta](s)[/bold magenta] [bold white]{retu['light_delay_sun_helio']/60}[/bold white] [bold magenta](minutes)[/bold magenta]\n[bold Cyan]Light delay from barycenter to {retu['name']}: [/bold Cyan][bold white]{retu['light_delay_sun_bary']}[/bold white] [bold magenta](s)[/bold magenta] [bold white]{retu['light_delay_sun_bary']/60}[/bold white] [bold magenta](minutes)[/bold magenta]\n[bold Cyan]Current distance of {retu['name']} from barycenter: [/bold Cyan][bold white]{retu['r_bary']}[/bold white] [bold magenta](m)[/bold magenta] [bold white]{retu['r_bary']/1000}[/bold white] [bold magenta](km)[/bold magenta] [bold white]{retu['r_bary']/self.AU_m}[/bold white] [bold magenta](AU)[/bold magenta]\n[bold Cyan]Current distance of {retu['name']} from heliocenter: [/bold Cyan][bold white]{retu['r_helio']}[/bold white] [bold magenta](m)[/bold magenta] [bold white]{retu['r_helio']/1000}[/bold white] [bold magenta](km)[/bold magenta] [bold white]{retu['r_helio']/self.AU_m}[/bold white] [bold magenta](AU)[/bold magenta]\n[bold Cyan]Orbital velocity relative SSB: [/bold Cyan][bold white]{retu['v_bary']}[/bold white] [bold magenta](m/s)[/bold magenta] [bold white]{retu['v_bary']/1000}[/bold white] [bold magenta](km/s)[/bold magenta]\n[bold Cyan]Orbital velocity relative heliocenter: [/bold Cyan][bold white]{retu['v_helio']}[/bold white] [bold magenta](m/s)[/bold magenta] [bold white]{retu['v_helio']/1000}[/bold white] [bold magenta](km/s)[/bold magenta]\n[bold Cyan]Position vector of Sun relative Solar System barycenter SSB: [/bold Cyan][bold white]({retu['sun_baryc_X']}, {retu['sun_baryc_Y']}, {retu['sun_baryc_Z']})[/bold white] [bold magenta](m)[/bold magenta]\n\n[bold Cyan]Current distance of sun relative/from SSB: [/bold Cyan][bold white]{retu['r_sun_SSB']}[/bold white] [bold magenta](m)[/bold magenta] [bold white]{retu['r_sun_SSB']/1000}[/bold white] [bold magenta](km)[/bold magenta]\n[bold Cyan]{retu['name']} Gravitational acceleration due to other bodies: [/bold Cyan][bold white]{accel_a}[/bold white] [bold magenta](m/s^2)[/bold magenta]\n[bold Cyan]Angular momentum: [/bold Cyan][bold white]{retu['h']}[/bold white] [bold magenta](m^2/s)[/bold magenta]\n[bold Cyan]orbital Energy E: [/bold Cyan][bold white]{retu['energy_bary']}[/bold white] [bold magenta](m^2/s^2)[/bold magenta]\n\n[bold yellow]##osculating elements a, e, i, Omega, omega, true anomaly (v).\nEpoch: Real-time {time.time()} or {time.asctime()}\nReference frame: J2000 | Julian January 1st 2000##[/bold yellow]\n[bold Cyan]{retu['name']} Osculating/real time element a (semi-major-axis): [/bold Cyan][bold white]{retu['osc_a']/self.AU_m}[/bold white] [bold magenta](AU)[/bold magenta]\n[bold Cyan]eccentric vector: [bold Cyan][bold white ]({retu['e_X']},{retu['e_Y']},{retu['e_Z']})[/bold white]\n[bold Cyan]magnitude of eccentricity: [/bold Cyan][bold white] {retu['mgn_eccentricity']}\n[bold Cyan]Inclination: [/bold Cyan][bold white]{retu['osc_i']}[bold white][bold magenta]°[/bold magenta]\n[bold Cyan]Ω Omega: [/bold Cyan][bold white]{retu['Omega']}[/bold white][bold magenta]°[/bold magenta]\n[bold Cyan]ω omega: [/bold Cyan][bold white]{retu['argof_periapsis']}[/bold white][bold magenta]°[/bold magenta]\n[bold Cyan]True anomaly v: [bold Cyan][bold white]{retu['true_anomaly']}\n\n[bold Yellow]Heliocentric Frame##[/bold yellow]\n[bold Cyan]eccentric vector: [bold Cyan][bold white ]({retu['e_Xhelio']},{retu['e_Yhelio']},{retu['e_Zhelio']})[/bold white]\n[bold Cyan]magnitude of eccentricity: [/bold Cyan][bold white] {retu['mgn_eccentricityhelio']}\n[bold Cyan]semi-major axis a: [/bold Cyan][bold white]{retu['osc_ahelio']/self.AU_m}[/bold white] [bold magenta](AU)[/bold magenta]\n[bold Cyan]Inclination: [/bold Cyan][bold white]{retu['osc_ihelio']}[bold white][bold magenta]°[/bold magenta]\n[bold Cyan]Ω Omega: [/bold Cyan][bold white]{retu['Omegahelio']}[/bold white][bold magenta]°[/bold magenta]\n[bold Cyan]ω omega: [/bold Cyan][bold white]{retu['argof_perihelion']}[/bold white][bold magenta]°[/bold magenta]\n[bold Cyan]True anomaly v: [bold Cyan][bold white]{retu['true_anomalyhelio']}\n[bold Cyan]Energy E: [bold Cyan][bold white]{retu['energyhelio']}[/bold white] [bold magenta](m^2/s^2)[/bold magenta]\n[bold Cyan]Angular momentum h: [bold Cyan][bold white]{retu['h_helio']}[/bold white] [bold magenta](m^2/s)[/bold magenta]\n[bold yellow]##/()\\##[/bold yellow]\n'''

                console.print(prin_t)

            else: # if name==earth

                ##prin_t = f'\n[bold yellow]{retu['name']}[/bold yellow] [bold green]for Unix time[/bold green] [bold yellow]{retu['Unix_time']}[/bold yellow] [bold green]its X,Y,Z Coordinates were[/bold green] [bold yellow]({retu['X_bary']} , {retu['Y_bary']} , {retu['Z_bary']})[/bold yellow].\n[bold green]{retu['name']} is currently[/bold green] [bold yellow]{retu['r_bary']}--(meters)-- or {retu['r_bary']/1000}--(km)-- or {retu['r_bary']/self.AU_m}--(Astronomical Units AU)--[/bold yellow] [bold green]from the sun.\nLight delay: {retu['r_bary']/self.c_m_s}--(seconds)-- *//* {(retu['r_bary']/self.c_m_s)/60}--(minutes)-- from the sun.\nIt is currently orbiting the sun with a velocity of[/bold green] [bold yellow]{retu['v_bary']}--(m/s)-- or {retu['v_bary']/1000}--(km/s)--[/bold yellow].'
                #prin_t = f'\n[bold Cyan]Name: [/bold Cyan][bold white]{retu['name']}[/bold white]\n[bold Cyan]Unix Time: [/bold Cyan][bold white]{retu['Unix_time']}[/bold white] [bold magenta](s)[/bold magenta] or [vam]{time.asctime()}[vamclose]\n[bold Cyan]Mean anomaly :[/bold Cyan][bold white]{retu['M']}[/bold white]\n[bold Cyan]Eccentric anomaly: [/bold Cyan][bold white]{retu['E']}[/bold white]\n[bold Cyan]X_Y_Z RELATIVE TO SSB l: [/bold Cyan][bold white]({retu['X_bary']},{retu['Y_bary']},{retu['Z_bary']})[/bold white] [bold magenta](m meters)[/bold magenta]\n[bold Cyan]X_Y_Z HELIOCENTRIC: [/bold Cyan][bold white]({retu['X_helio']},{retu['Y_helio']},{retu['Z_helio']})[/bold white] [bold magenta](m meters)[/bold magenta]\n\n[bold Cyan]Light delay from Sun to {retu['name']} heliocentric XYZ: [/bold Cyan][bold white]{retu['light_delay_sun_helio']}[/bold white] [bold magenta](s)[/bold magenta] [bold white]{retu['light_delay_sun_helio']/60}[/bold white] [bold magenta](minutes)[/bold magenta]\n[bold Cyan]Light delay from sun to {retu['name']} SSB XYZ: [/bold Cyan][bold white]{retu['light_delay_sun_bary']}[/bold white] [bold magenta](s)[/bold magenta] [bold white]{retu['light_delay_sun_bary']}[/bold white] [bold magenta]

                prin_t = f'''\n[bold Cyan]Name: [/bold Cyan][bold white]{retu['name']}[/bold white]\n[bold Cyan]Current Unix Time: [/bold Cyan][bold white]{retu['Unix_time']}[/bold white] [bold magenta](s)[/bold magenta] or [bold white]{time.asctime()}[/bold white]\n[bold cyan]Reference frame: [/bold cyan][yellow]January Julian J2000[/yellow]\n[bold Cyan]Mean anomaly :[/bold Cyan][bold white]{retu['M']}[/bold white]\n[bold Cyan]Eccentric anomaly: [/bold Cyan][bold white]{retu['E']}[/bold white]\n[bold Cyan]Current orbital day on {retu['name']} (Orbital day): [/bold Cyan][bold white]{retu['resp_day']}[/bold white] [bold magenta](Sol)[/bold magenta]\n[bold Cyan]Velocity vector relative SSB: [/bold Cyan][bold white]({retu['v_X']}, {retu['v_Y']}, {retu['v_Z']}) [/bold white][bold magenta](m/s)[/bold magenta]\n[bold Cyan]Position vector relative SSB: [/bold Cyan][bold white]({retu['X_bary']}, {retu['Y_bary']}, {retu['Z_bary']})[/bold white] [bold magenta](m meters)[/bold magenta]\n\n[bold Cyan]Position vector relative Heliocenter: [/bold Cyan][bold white]({retu['X_helio']}, {retu['Y_helio']}, {retu['Z_helio']})[/bold white] [bold magenta](m meters)[/bold magenta]\n\n[bold Cyan]Gravitational acceleration vector due to other bodies: [/bold Cyan][bold white]({ax}, {ay}, {az})[/bold white] [bold magenta](m/s^2)[/bold magenta]\n[bold Cyan]Light delay from heliocenter to {retu['name']}: [/bold Cyan][bold white]{retu['light_delay_sun_helio']}[/bold white] [bold magenta](s)[/bold magenta] [bold white]{retu['light_delay_sun_helio']/60}[/bold white] [bold magenta](minutes)[/bold magenta]\n[bold Cyan]Light delay from barycenter to {retu['name']}: [/bold Cyan][bold white]{retu['light_delay_sun_bary']}[/bold white] [bold magenta](s)[/bold magenta] [bold white]{retu['light_delay_sun_bary']/60}[/bold white] [bold magenta](minutes)[/bold magenta]\n[bold Cyan]Current distance of {retu['name']} from barycenter: [/bold Cyan][bold white]{retu['r_bary']}[/bold white] [bold magenta](m)[/bold magenta] [bold white]{retu['r_bary']/1000}[/bold white] [bold magenta](km)[/bold magenta] [bold white]{retu['r_bary']/self.AU_m}[/bold white] [bold magenta](AU)[/bold magenta]\n[bold Cyan]Current distance of {retu['name']} from heliocenter: [/bold Cyan][bold white]{retu['r_helio']}[/bold white] [bold magenta](m)[/bold magenta] [bold white]{retu['r_helio']/1000}[/bold white] [bold magenta](km)[/bold magenta] [bold white]{retu['r_helio']/self.AU_m}[/bold white] [bold magenta](AU)[/bold magenta]\n[bold Cyan]Position vector of Sun relative Solar System barycenter SSB: [/bold Cyan][bold white]({retu['sun_baryc_X']}, {retu['sun_baryc_Y']}, {retu['sun_baryc_Z']})[/bold white] [bold magenta](m)[/bold magenta]\n\n[bold Cyan]Current distance of sun relative/from SSB: [/bold Cyan][bold white]{retu['r_sun_SSB']}[/bold white] [bold magenta](m)[/bold magenta] [bold white]{retu['r_sun_SSB']/1000}[/bold white] [bold magenta](km)[/bold magenta]\n[bold Cyan]Orbital velocity relative SSB: [/bold Cyan][bold white]{retu['v_bary']}[/bold white] [bold magenta](m/s)[/bold magenta] [bold white]{retu['v_bary']/1000}[/bold white] [bold magenta](km/s)[/bold magenta]\n[bold Cyan]Orbital velocity relative heliocenter: [/bold Cyan][bold white]{retu['v_helio']}[/bold white] [bold magenta](m/s)[/bold magenta] [bold white]{retu['v_helio']/1000}[/bold white] [bold magenta](km/s)[/bold magenta]\n[bold Cyan]{retu['name']} Gravitational acceleration due to other bodies: [/bold Cyan][bold white]{accel_a}[/bold white] [bold magenta](m/s^2)[/bold magenta]\n[bold Cyan]Angular momentum: [/bold Cyan][bold white]{retu['h']}[/bold white] [bold magenta](m^2/s)[/bold magenta]\n[bold Cyan]orbital Energy E: [/bold Cyan][bold white]{retu['energy_bary']}[/bold white] [bold magenta](m^2/s^2)[/bold magenta]\n\n[bold yellow]##Osculating elements a, e, i, Omega, omega, true anomaly (v).\nEpoch: Real-time {time.time()} or {time.asctime()}\nReference frame: J2000 | Julian January 1st 2000##[/bold yellow]\n[bold Cyan]eccentric vector: [bold Cyan][bold white ]({retu['e_X']},{retu['e_Y']},{retu['e_Z']})[/bold white]\n[bold Cyan]{retu['name']} Osculating/real time element a (semi-major-axis): [/bold Cyan][bold white]{retu['osc_a']/self.AU_m}[/bold white] [bold magenta](AU)[/bold magenta]\n[bold Cyan]magnitude of eccentricity: [/bold Cyan][bold white] {retu['mgn_eccentricity']}\n[bold Cyan]Inclination: [/bold Cyan][bold white]{retu['osc_i']}[bold white][bold magenta]°[/bold magenta]\n[bold Cyan]Ω Omega: [/bold Cyan][bold white]{retu['Omega']}[/bold white][bold magenta]°[/bold magenta]\n[bold Cyan]ω omega: [/bold Cyan][bold white]{retu['argof_periapsis']}[/bold white][bold magenta]°[/bold magenta]\n[bold Cyan]True anomaly v: [bold Cyan][bold white]{retu['true_anomaly']}\n\n[bold Yellow]Heliocentric Frame##[/bold yellow]\n[bold Cyan]eccentric vector: [bold Cyan][bold white ]({retu['e_Xhelio']},{retu['e_Yhelio']},{retu['e_Zhelio']})[/bold white]\n[bold Cyan]magnitude of eccentricity: [/bold Cyan][bold white] {retu['mgn_eccentricityhelio']}\n[bold Cyan]semi-major axis a: [/bold Cyan][bold white]{retu['osc_ahelio']/self.AU_m}[/bold white] [bold magenta](AU)[/bold magenta]\n[bold Cyan]Inclination: [/bold Cyan][bold white]{retu['osc_ihelio']}[bold white][bold magenta]°[/bold magenta]\n[bold Cyan]Ω Omega: [/bold Cyan][bold white]{retu['Omegahelio']}[/bold white][bold magenta]°[/bold magenta]\n[bold Cyan]ω omega: [/bold Cyan][bold white]{retu['argof_perihelion']}[/bold white][bold magenta]°[/bold magenta]\n[bold Cyan]True anomaly v: [bold Cyan][bold white]{retu['true_anomalyhelio']}\n[bold Cyan]Energy E: [bold Cyan][bold white]{retu['energyhelio']}[/bold white] [bold magenta](m^2/s^2)[/bold magenta]\n[bold Cyan]Angular momentum h: [bold Cyan][bold white]{retu['h_helio']}[/bold white] [bold magenta](m^2/s)[/bold magenta]\n[bold yellow]##/()\\##[/bold yellow]\n'''


                console.print(prin_t)




        if name and lp:
            while True:
                try:

                    if os.name=='nt':
                        os.system('cls')
                    else:
                        os.system('clear')

                    sun_barycentric = self.baryc_sun()
                    r_sun_SSB = math.sqrt(math.pow(sun_barycentric['X_s'],2) + math.pow(sun_barycentric['Y_s'],2) + math.pow(sun_barycentric['Z_s'],2))
                    ax,ay,az = self.acce(name)
                    accel_a = math.sqrt(math.pow(ax,2) + math.pow(ay,2) + math.pow(az,2))
                    #total_mass_u = self.G*sun_barycentric['total_mass']
                    spec_uhelio = super().spec_uhelio(name)

                    retu = super().orbits(name) # ,lp)
                    ruii = self.barycentric(name) #this function can handle everything here i repeated myself
                    u_total = super().u_total()

                    X_bary = retu['X_helio'] + sun_barycentric['X_s']
                    Y_bary = retu['Y_helio'] + sun_barycentric['Y_s']
                    Z_bary = retu['Z_helio'] + sun_barycentric['Z_s']

                    r_bary = math.sqrt(math.pow(X_bary,2)+math.pow(Y_bary,2)+math.pow(Z_bary,2))

                    r_helio = math.sqrt(math.pow(retu['X_helio'],2)+math.pow(retu['Y_helio'],2)+math.pow(retu['Z_helio'],2)) #relative to heliocentric sun.
                    #v_bary = math.sqrt(total_mass_u * ((2/(r_bary))-(1/(retu['a'])))) # the vis-viva equation
                    v_bary = math.sqrt(math.pow(retu['v_X'],2) + math.pow(retu['v_Y'],2) + math.pow(retu['v_Z'],2))

                    v_helio = math.sqrt(spec_uhelio * ((2/r_helio) - (1/retu['a']))) #heliocentric speed
                    osculating_a = math.pow(((2/r_bary) - (math.pow(v_bary,2)/u_total)),-1)

                    light_delay_sun_bary = r_bary/self.c_m_s
                    light_delay_sun_helio = r_helio/self.c_m_s


                    if name!='EARTH':

                        sun_barycentric = self.baryc_sun()
                        X_E_bary = retu['X_E_helio'] + sun_barycentric['X_s']
                        Y_E_bary = retu['Y_E_helio'] + sun_barycentric['Y_s']
                        Z_E_bary = retu['Z_E_helio'] + sun_barycentric['Z_s']
                        d_bary = math.sqrt(math.pow((X_bary-X_E_bary),2) + math.pow((Y_bary-Y_E_bary),2) + math.pow((Z_bary-Z_E_bary),2))

                        d_helio = math.sqrt(math.pow((retu['X_helio']-retu['X_E_helio']),2) + math.pow((retu['Y_helio']-retu['Y_E_helio']),2) + math.pow((retu['Z_helio']-retu['Z_E_helio']),2)) # relative to heliocentric sun

                        light_delay_bary = d_bary/self.c_m_s # light delay in seconds
                        light_delay_helio = d_helio/self.c_m_s # light delay relative to heliocenter.

                        #prin_t = f'\n[bold yellow]{retu['N']}[/bold yellow] [bold green]for Unix time[/bold green] [bold yellow]{retu['Unix_time']}[/bold yellow] [bold green]its X,Y,Z Coordinates were[/bold green] [bold yellow]({X_bary} , {Y_bary} , {Z_bary})[/bold yellow] [bold green]at a distance of[/bold green] [bold yellow]{d_bary}--(m)-- or {d_bary/1000}--(km)--[/bold yellow] [bold green]from Earth.\nLight delay[/bold green] [bold yellow]{light_delay_bary}--(seconds)-- or {light_delay_bary/60}--(minutes)--[/bold yellow].[bold green]This means you will see it from earth as it was {light_delay_bary}--(seconds)-- or {light_delay_bary/60}--(minutes)-- ago because it takes light {light_delay_bary}--(seconds)-- or {light_delay_bary/60}--(minutes)-- to reach Earth from {retu['N']}.\n{retu['N']} is currently[/bold green] [bold yellow]{r_bary}--(meters)-- or {r_bary/1000}--(km)-- or {r_bary/self.AU_m}--(Astronomical Units AU)--[/bold yellow] [bold green]from the sun.\nIt is currently orbiting the sun with a velocity of[/bold green] [bold yellow]{v_bary}--(m/s)-- or {v_bary/1000}--(km/s)--[/bold yellow].'

                        prin_t = f'''\n[bold Cyan]Name: [/bold Cyan][bold white]{retu['N']}[/bold white]\n[bold Cyan]Current Unix Time: [/bold Cyan][bold white]{retu['Unix_time']}[/bold white] [bold magenta](s)[/bold magenta] or [bold white]{time.asctime()}[/bold white]\n[bold cyan]Reference frame: [/bold cyan][yellow]January Julian J2000[/yellow]\n[bold Cyan]Mean anomaly :[/bold Cyan][bold white]{retu['M']}[/bold white]\n[bold Cyan]Eccentric anomaly: [/bold Cyan][bold white]{retu['E']}[/bold white]\n[bold Cyan]Current orbital day on {retu['N']} (Orbital day): [/bold Cyan][bold white]{retu['resp_day']}[/bold white] [bold magenta](Sol)[/bold magenta]\n[bold Cyan]Velocity vector relative SSB: [/bold Cyan][bold white]({retu['v_X']}, {retu['v_Y']}, {retu['v_Z']}) [/bold white][bold magenta](m/s)[/bold magenta]\n[bold Cyan]Position vector relative SSB: [/bold Cyan][bold white]({X_bary}, {Y_bary}, {Z_bary})[/bold white] [bold magenta](m meters)[/bold magenta]\n\n[bold Cyan]Position vector relative Heliocenter: [/bold Cyan][bold white]({retu['X_helio']}, {retu['Y_helio']}, {retu['Z_helio']})[/bold white] [bold magenta](m meters)[/bold magenta]\n\n[bold Cyan]Gravitational acceleration vector due to other bodies: [/bold Cyan][bold white]({ax}, {ay}, {az})[/bold white] [bold magenta](m/s^2)[/bold magenta]\n[bold Cyan]Geocentric Distance using barycentric SSB frame: [/bold Cyan][bold white]{d_bary/1000}[/bold white] [bold magenta](km)[/bold magenta] [bold white]{d_bary/self.AU_m}[/bold white] [bold magenta](AU)[/bold magenta]\n[bold Cyan]Geocentric Distance using heliocentric ¿sun¿ frame: [/bold Cyan][bold white]{d_helio/1000}[/bold white] [bold magenta](km)[/bold magenta] [bold white]{d_helio/self.AU_m}[/bold white] [bold magenta](AU)[/bold magenta]\n[bold Cyan]Geocentric Light delay using barycentric SSB frame: [/bold Cyan][bold white]{light_delay_bary}[/bold white] [bold magenta](s)[/bold magenta] [bold white]{light_delay_bary/60}[/bold white] [bold magenta](minutes)[/bold magenta]\n[bold Cyan]Geocentric light delay using heliocentric ¿sun¿ frame: [/bold Cyan][bold white]{light_delay_helio}[/bold white] [bold magenta](s)[/bold magenta] [bold white]{light_delay_helio/60} [bold magenta](minutes)[/bold magenta]\n[bold Cyan]Light delay from heliocenter to {retu['N']}: [/bold Cyan][bold white]{light_delay_sun_helio}[/bold white] [bold magenta](s)[/bold magenta] [bold white]{light_delay_sun_helio/60}[/bold white] [bold magenta](minutes)[/bold magenta]\n[bold Cyan]Light delay from barycenter to {retu['N']}: [/bold Cyan][bold white]{light_delay_sun_bary}[/bold white] [bold magenta](s)[/bold magenta] [bold white]{light_delay_sun_bary/60}[/bold white] [bold magenta](minutes)[/bold magenta]\n[bold Cyan]Current distance of {retu['N']} from barycenter: [/bold Cyan][bold white]{r_bary}[/bold white] [bold magenta](m)[/bold magenta] [bold white]{r_bary/1000}[/bold white] [bold magenta](km)[/bold magenta] [bold white]{r_bary/self.AU_m}[/bold white] [bold magenta](AU)[/bold magenta]\n[bold Cyan]Current distance of {retu['N']} from heliocenter: [/bold Cyan][bold white]{r_helio}[/bold white] [bold magenta](m)[/bold magenta] [bold white]{r_helio/1000}[/bold white] [bold magenta](km)[/bold magenta] [bold white]{r_helio/self.AU_m}[/bold white] [bold magenta](AU)[/bold magenta]\n[bold Cyan]Orbital velocity relative SSB: [/bold Cyan][bold white]{v_bary}[/bold white] [bold magenta](m/s)[/bold magenta] [bold white]{v_bary/1000}[/bold white] [bold magenta](km/s)[/bold magenta]\n[bold Cyan]Orbital velocity relative heliocenter: [/bold Cyan][bold white]{v_helio}[/bold white] [bold magenta](m/s)[/bold magenta] [bold white]{v_helio/1000}[/bold white] [bold magenta](km/s)[/bold magenta]\n[bold Cyan]Position vector of Sun relative Solar System barycenter SSB: [/bold Cyan][bold white]({sun_barycentric['X_s']}, {sun_barycentric['Y_s']}, {sun_barycentric['Z_s']})[/bold white] [bold magenta](m)[/bold magenta]\n\n[bold Cyan]Current distance of sun relative/from SSB: [/bold Cyan][bold white]{r_sun_SSB}[/bold white] [bold magenta](m)[/bold magenta] [bold white]{r_sun_SSB/1000}[/bold white] [bold magenta](km)[/bold magenta]\n[bold Cyan]{retu['N']} Gravitational acceleration due to other bodies: [/bold Cyan][bold white]{accel_a}[/bold white] [bold magenta](m/s^2)[/bold magenta]\n[bold Cyan]Angular momentum: [/bold Cyan][bold white]{ruii['h']}[/bold white] [bold magenta](m^2/s)[/bold magenta]\n[bold Cyan]orbital Energy E: [/bold Cyan][bold white]{ruii['energy_bary']}[/bold white] [bold magenta](m^2/s^2)[/bold magenta]\n\n\n[bold yellow]##osculating elements a, e, i, Omega, omega, true anomaly (v).\nEpoch: Real-time {time.time()} or {time.asctime()}\nReference frame: J2000 | Julian January 1st 2000##[/bold yellow]\n[bold Cyan]eccentric vector: [bold Cyan][bold white ]({ruii['e_X']},{ruii['e_Y']},{ruii['e_Z']})[/bold white]\n[bold Cyan]{ruii['name']} Osculating/real time element a (semi-major-axis): [/bold Cyan][bold white]{ruii['osc_a']/self.AU_m}[/bold white] [bold magenta](AU)[/bold magenta]\n[bold Cyan]magnitude of eccentricity: [/bold Cyan][bold white] {ruii['mgn_eccentricity']}\n[bold Cyan]Inclination: [/bold Cyan][bold white]{ruii['osc_i']}[bold white][bold magenta]°[/bold magenta]\n[bold Cyan]Ω Omega: [/bold Cyan][bold white]{ruii['Omega']}[/bold white][bold magenta]°[/bold magenta]\n[bold Cyan]ω omega: [/bold Cyan][bold white]{ruii['argof_periapsis']}[/bold white][bold magenta]°[/bold magenta]\n[bold Cyan]True anomaly v: [bold Cyan][bold white]{ruii['true_anomaly']}\n\n[bold Yellow]Heliocentric Frame##[/bold yellow]\n[bold Cyan]eccentric vector: [bold Cyan][bold white ]({retu['e_X']},{retu['e_Y']},{retu['e_Z']})[/bold white]\n[bold Cyan]semi-major axis a: [/bold Cyan][bold white]{retu['osc_a']/self.AU_m}[/bold white] [bold magenta](AU)[/bold magenta]\n[bold Cyan]magnitude of eccentricity: [/bold Cyan][bold white] {retu['mgn_eccentricity']}\n[bold Cyan]Inclination: [/bold Cyan][bold white]{retu['osc_i']}[bold white][bold magenta]°[/bold magenta]\n[bold Cyan]Ω Omega: [/bold Cyan][bold white]{retu['Omega']}[/bold white][bold magenta]°[/bold magenta]\n[bold Cyan]ω omega: [/bold Cyan][bold white]{retu['argumentof_perihelion']}[/bold white][bold magenta]°[/bold magenta]\n[bold Cyan]True anomaly v: [bold Cyan][bold white]{retu['true_anomaly']}\n[bold Cyan]Energy E: [bold Cyan][bold white]{retu['energy_helio']}[/bold white] [bold magenta](m^2/s^2)[/bold magenta]\n[bold Cyan]Angular momentum h: [bold Cyan][bold white]{retu['h']}[/bold white] [bold magenta](m^2/s)[/bold magenta]\n[bold yellow]##/()\\##[/bold yellow]\n'''


                        console.print(prin_t)


                    else: # if name==earth

                        #prin_t = f'\n[bold yellow]{retu['N']}[/bold yellow] [bold green]for Unix time[/bold green] [bold yellow]{retu['Unix_time']}[/bold yellow] [bold green]its X,Y,Z Coordinates were[/bold green] [bold yellow]({X_bary} , {Y_bary} , {Z_bary})[/bold yellow].\n[bold green]{retu['N']} is currently[/bold green] [bold yellow]{r_bary}--(meters)-- or {r_bary/1000}--(km)-- or {r_bary/self.AU_m}--(Astronomical Units AU)--[/bold yellow] [bold green]from the sun.\nLight delay: {r_bary/self.c_m_s}--(seconds)-- *//* {(r_bary/self.c_m_s)/60}--(minutes)-- from the sun.\nIt is currently orbiting the sun with a velocity of[/bold green] [bold yellow]{v_bary}--(m/s)-- or {v_bary/1000}--(km/s)--[/bold yellow].'

                        prin_t = f'''\n[bold Cyan]Name: [/bold Cyan][bold white]{retu['N']}[/bold white]\n[bold Cyan]Current Unix Time: [/bold Cyan][bold white]{retu['Unix_time']}[/bold white] [bold magenta](s)[/bold magenta] or [bold white]{time.asctime()}[/bold white]\n[bold cyan]Reference frame: [/bold cyan][yellow]January Julian J2000[/yellow]\n[bold Cyan]Mean anomaly :[/bold Cyan][bold white]{retu['M']}[/bold white]\n[bold Cyan]Eccentric anomaly: [/bold Cyan][bold white]{retu['E']}[/bold white]\n[bold Cyan]Current orbital day on {retu['N']} (Orbital day): [/bold Cyan][bold white]{retu['resp_day']}[/bold white] [bold magenta](Sol)[/bold magenta]\n[bold Cyan]Velocity vectors relative SSB: [/bold Cyan][bold white]({retu['v_X']}, {retu['v_Y']}, {retu['v_Z']}) [/bold white][bold magenta](m/s)[/bold magenta]\n[bold Cyan]Position vector relative SSB: [/bold Cyan][bold white]({X_bary}, {Y_bary}, {Z_bary})[/bold white] [bold magenta](m meters)[/bold magenta]\n\n[bold Cyan]Position vector relative Heliocenter: [/bold Cyan][bold white]({retu['X_helio']}, {retu['Y_helio']}, {retu['Z_helio']})[/bold white] [bold magenta](m meters)[/bold magenta]\n\n[bold Cyan]Gravitational acceleration vector due to other bodies: [/bold Cyan][bold white]({ax}, {ay}, {az})[/bold white] [bold magenta](m/s^2)[/bold magenta]\n[bold Cyan]Light delay from heliocenter to {retu['N']}: [/bold Cyan][bold white]{light_delay_sun_helio}[/bold white] [bold magenta](s)[/bold magenta] [bold white]{light_delay_sun_helio/60}[/bold white] [bold magenta](minutes)[/bold magenta]\n[bold Cyan]Light delay from barycenter to {retu['N']}: [/bold Cyan][bold white]{light_delay_sun_bary}[/bold white] [bold magenta](s)[/bold magenta] [bold white]{light_delay_sun_bary/60}[/bold white] [bold magenta](minutes)[/bold magenta]\n[bold Cyan]Current distance of {retu['N']} from barycenter: [/bold Cyan][bold white]{r_bary}[/bold white] [bold magenta](m)[/bold magenta] [bold white]{r_bary/1000}[/bold white] [bold magenta](km)[/bold magenta] [bold white]{r_bary/self.AU_m}[/bold white] [bold magenta](AU)[/bold magenta]\n[bold Cyan]Current distance of {retu['N']} from heliocenter: [/bold Cyan][bold white]{r_helio}[/bold white] [bold magenta](m)[/bold magenta] [bold white]{r_helio/1000}[/bold white] [bold magenta](km)[/bold magenta] [bold white]{r_helio/self.AU_m}[/bold white] [bold magenta](AU)[/bold magenta]\n[bold Cyan]Position vector of Sun relative Solar System barycenter SSB: [/bold Cyan][bold white]({sun_barycentric['X_s']}, {sun_barycentric['Y_s']}, {sun_barycentric['Z_s']})[/bold white] [bold magenta](m)[/bold magenta]\n\n[bold Cyan]Current distance of sun relative/from SSB: [/bold Cyan][bold white]{r_sun_SSB}[/bold white] [bold magenta](m)[/bold magenta] [bold white]{r_sun_SSB/1000}[/bold white] [bold magenta](km)[/bold magenta]\n[bold Cyan]Orbital velocity relative SSB: [/bold Cyan][bold white]{v_bary}[/bold white] [bold magenta](m/s)[/bold magenta] [bold white]{v_bary/1000}[/bold white] [bold magenta](km/s)[/bold magenta]\n[bold Cyan]Orbital velocity relative heliocenter: [/bold Cyan][bold white]{v_helio}[/bold white] [bold magenta](m/s)[/bold magenta] [bold white]{v_helio/1000}[/bold white] [bold magenta](km/s)[/bold magenta]\n[bold Cyan]{retu['N']} Gravitational acceleration due to other bodies: [/bold Cyan][bold white]{accel_a}[/bold white] [bold magenta](m/s^2)[/bold magenta]\n[bold Cyan]Angular momentum: [/bold Cyan][bold white]{ruii['h']}[/bold white] [bold magenta](m^2/s)[/bold magenta]\n[bold Cyan]orbital Energy E: [/bold Cyan][bold white]{ruii['energy_bary']}[/bold white] [bold magenta](m^2/s^2)[/bold magenta]\n\n[bold yellow]##osculating elements a, e, i, Omega, omega, true anomaly (v).\nEpoch: Real-time {time.time()} or {time.asctime()}\nReference frame: J2000 | Julian January 1st 2000##[/bold yellow]\n[bold Cyan]{ruii['name']} Osculating/real time element a (semi-major-axis): [/bold Cyan][bold white]{retu['osc_a']/self.AU_m}[/bold white] [bold magenta](AU)[/bold magenta]\n[bold Cyan]eccentric vector: [bold Cyan][bold white ]({ruii['e_X']},{ruii['e_Y']},{ruii['e_Z']})[/bold white]\n[bold Cyan]magnitude of eccentricity: [/bold Cyan][bold white] {ruii['mgn_eccentricity']}\n[bold Cyan]Inclination: [/bold Cyan][bold white]{ruii['osc_i']}[bold white][bold magenta]°[/bold magenta]\n[bold Cyan]Ω Omega: [/bold Cyan][bold white]{ruii['Omega']}[/bold white][bold magenta]°[/bold magenta]\n[bold Cyan]ω omega: [/bold Cyan][bold white]{ruii['argof_periapsis']}[/bold white][bold magenta]°[/bold magenta]\n[bold Cyan]True anomaly v: [bold Cyan][bold white]{ruii['true_anomaly']}\n\n[bold Yellow]Heliocentric Frame##[/bold yellow]\n[bold Cyan]eccentric vector: [bold Cyan][bold white ]({retu['e_X']},{retu['e_Y']},{retu['e_Z']})[/bold white]\n[bold Cyan]semi-major axis a: [/bold Cyan][bold white]{retu['osc_a']/self.AU_m}[/bold white] [bold magenta](AU)[/bold magenta]\n[bold Cyan]magnitude of eccentricity: [/bold Cyan][bold white] {retu['mgn_eccentricity']}\n[bold Cyan]Inclination: [/bold Cyan][bold white]{retu['osc_i']}[bold white][bold magenta]°[/bold magenta]\n[bold Cyan]Ω Omega: [/bold Cyan][bold white]{retu['Omega']}[/bold white][bold magenta]°[/bold magenta]\n[bold Cyan]ω omega: [/bold Cyan][bold white]{retu['argumentof_perihelion']}[/bold white][bold magenta]°[/bold magenta]\n[bold Cyan]True anomaly v: [bold Cyan][bold white]{retu['true_anomaly']}\n[bold Cyan]Energy E: [bold Cyan][bold white]{retu['energy_helio']}[/bold white] [bold magenta](m^2/s^2)[/bold magenta]\n[bold Cyan]Angular momentum h: [bold Cyan][bold white]{retu['h']}[/bold white] [bold magenta](m^2/s)[/bold magenta]\n[bold yellow]##/()\\##[/bold yellow]\n'''

                        console.print(prin_t)

                    time.sleep(1)



                except KeyboardInterrupt:
                    console.print('[bold red]KEYBOARD INTERRUPT[/bold red]')
                    sys.exit(0)

        if name and tble and lp==None:
            '''prints table to terminal'''

            vallues = {'MERCURY':88,'VENUS':225,'EARTH':365,'MARS':687,'CERES':1681,'JUPITER':4333,'SATURN':10759,'URANUS':30685,'NEPTUNE':60190,'PLUTO':90465,'ERIS':204174}

            X = None







        




