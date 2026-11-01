
# Copyright © 2026 Mark Macharia [@iamnothimbutwe Github]
# All rights reserved.

# Unauthorized copying, modification, distribution, or commercial use of this software (or substantial portions of it) is strictly prohibited without express written permission from the author.


import math
import time
from rich.table import Table
from rich.console import Console
#import click
import sys
import plotext as pltxt
from .vect import Vectors

# ---------------------------------------------------------
# Copyright (c) 2026 Mark. All rights reserved.
# Unauthorized copying of this file, via any medium, is 
# strictly prohibited. Written by Mark (iamnothimbutwe) on Github.
# ---------------------------------------------------------

email='astlospacesystems@gmail.com' 

class Astro:
    '''an astrophysics engine'''
    def __init__(self,tble=None):
        self.earth_angular_vel_along_Z = 7.292115e-5 # rad/s Radians are dimensionless ratio quantities, so \text{rad/s} = 1/\text{s} in dimensional analysis). theref9r 1rd/s*1km = 1km/s...point8ng toeards tge north pole
        self.earth_angularvel_vector_along_Z = [0,0,7.29211514670698e-5] #along the Z axis
        self.wgs84 = {'a':6378137.0,'f':0.0033528106647474805,'e_squared':0.00669437999014,'e':0.08181919084261345} #wolrd geodetic system 1984
        self.earth_equator_rel_ecliptic = 23.439291 #degrees
        self.k_1='a planet orbits the sun in an ellipse with the sun at one focus of the ellipse'
        self.k_2='a planet moves faster at perihelion and slowest at aphelion..A line connecting a planet to the sun sweeps out equal areas in equal time intervals'
        self.k_3='the square of the orbital period of a planet is proportional to the cube of its semi major axis (P**2==a**3)'
        self.values_tt = ['MERCURY','VENUS','EARTH','MARS','VESTA','CERES','PALLAS','HYGIEA','JUPITER','SATURN','URANUS','NEPTUNE','PLUTO','HAUMEA','MAKEMAKE','ERIS']
        self.AU_m=1.495978707e11
        self.J2000=946684800  #at midnight
        self.JD2000=self.J2000+43200  #at Noon NASA/JPL USE AT NOON ALMOST ALWAYS.
        self.earthperiod_d=365.25
        self.c_m_s=2.99792458e8
        self.c_km_s=2.99792e5
        self.m='smaller mass'
        self.MoS_kg=1.989e30
        self.MoE_kg=5.97219e24
        self.radiusof_Earth_m=6.371e6
        self.earthperiod_s=3.15569e7
        self.earthorbit_velocity_km_s=29.78
        self.eccentricity='c/a (where c is the distance from the center of the ellipse to its focus). or using the apsides r_a-r_p/r_a+r_p'
        self.moons = {'MERCURY':None,'VENUS':None,'EARTH':{'name':'LUNAR','mean_a':134.96340,'mean_b':13.06499295,'omega_a':318.30868,'omega_b':0.16435729,'Omega_a':125.04456,'Omega_b':0.05299202,'a':384747980,'e':0.0549006,'i':5.145396,'mass':7.3458e22,'sidereal_p_d':27.321661,'sidereal_p_s':2360591.5},'MARS':['PHOBOS','DEIMOS'],'VESTA':None,'CERES':None,'PALLAS':None,'HYGIEA':None,'JUPITER':['GANYMEDE','CALLISTO','IO','EUROPA'],'SATURN':['TITAN','RHEA'],'URANUS':['TITANIA','OBERON','UMBRIEL','MIRANDA','ARIEL'],'NEPTUNE':'TRITON','PLUTO':'CHARON','HAUMEA':None,'MAKEMAKE':None,'ERIS':'DYSNOMIA','value':'degrees° and meters'} #adding the massibe moons. moons like phobos and deimos are very small. hence negligible but i should add them all...mean a and b are the mean anomoaly phase one and two..mean_a+(mean_b*d)..Mean elements at J2000 Noon. the mean anomaly at j2000..the _b rates are degrees per day (Meeus ch.47 mean elements; Omega_b includes general precession so the node stays in the fixed J2000 ecliptic): the node regresses ~19.3 deg/yr and the perigee advances ~40.7 deg/yr so they cannot stay fixed

        #...SOLAR SYSTEM_mass in terms of Earth...

        self.Mercury_mass=0.05528
        self.Venus_mass=0.81500
        self.Earth_mass=1.0000
        self.Mars_mass=0.10745
        self.Vesta_mass=4.338107126531473e-05
        self.Ceres_mass=0.00016
        self.Pallas_mass=3.415832383095648e-05
        self.Hygiea_mass=1.3931237954586172e-06
        self.Jupiter_mass=317.83
        self.Saturn_mass=95.159
        self.Uranus_mass=14.536
        self.Neptune_mass=17.147
        self.Pluto_mass=0.0021
        self.Haumea_mass=0.000670775712092214
        self.Makemake_mass=0.0005190725680194367
        self.Eris_mass=0.002

        #...SOLAR SYSTEM_Equitorial Radius in terms of Earth...

        self.Mercury_R=0.3825
        self.Venus_R=0.9488
        self.Earth_R=1.0000
        self.Mars_R=0.5326
        self.Ceres_R=0.076
        self.Jupiter_R=11.209
        self.Saturn_R=9.4492
        self.Uranus_R=4.0073
        self.Neptune_R=3.8826
        self.Pluto_R=0.178
        self.Eris_R=0.188

        #...SOLAR SYSTEM_AU...

        self.Mercury_AU=0.3871
        self.Venus_AU=0.7233
        self.Earth_AU=1.0000
        self.Mars_AU=1.5236
        self.Vesta_AU=2.36117486  #2.362
        self.Ceres_AU=2.765
        self.Pallas_AU=2.76929312  #2.772
        self.Hygiea_AU=3.15036774  #3.140
        self.Jupiter_AU=5.2034
        self.Saturn_AU=9.5371
        self.Uranus_AU=19.191
        self.Neptune_AU=30.069
        self.Pluto_AU=39.4817
        self.Haumea_AU=43.01
        self.Makemake_AU=45.51
        self.Eris_AU=68

        #...SOLAR SYSTEM_P (year) in terms of Earth...
        #..Mercury-Neptune (P,MO,i,w,omega,e,AU): NASA/JPL "Keplerian elements for approximate positions" Table 1 at J2000, 1800-2050 AD (https://ssd.jpl.nasa.gov/planets/approx_pos.html): MO=L-varpi, w=varpi-node, omega=node, P=360/(L rate) so the mean longitude moves at the JPL rate. EARTH is the Earth-Moon barycentre there.
        #..Pluto(system barycentre),Ceres,Vesta,Pallas,Hygiea,Haumea,Makemake,Eris: JPL Horizons heliocentric ecliptic-J2000 osculating elements at 2026-11-01 00:00 TDB, P from a, MO carried back to J2000 with this P so M is exact on 2026-11-01. old values kept as comments.

        self.Mercury_P=0.24085204  #0.2408
        self.Venus_P=0.615210912  #0.6152
        self.Earth_P=1.000039615  #1.0000
        self.Mars_P=1.88088972  #1.8808
        self.Vesta_P=3.628357412  #3.63
        self.Ceres_P=4.600978891  #4.603
        self.Pallas_P=4.608623462  #4.62
        self.Hygiea_P=5.591904067  #5.56
        self.Jupiter_P=11.862869921  #11.8618
        self.Saturn_P=29.448659616  #29.4567
        self.Uranus_P=84.019389887  #84.021
        self.Neptune_P=164.793960719  #164.79
        self.Pluto_P=246.804642364  #247.92
        self.Haumea_P=282.909137467  #282
        self.Makemake_P=307.979800634  #307
        self.Eris_P=559.486722913  #561
        
        
        #...SOLAR SYSTEM_rP (perihelion) in terms of  earths AU..
        
        self.Mercury_rP=0.307
        self.Venus_rP=0.718
        self.Earth_rP=0.983
        self.Mars_rP=1.382
        self.Ceres_rP=2.558
        self.Jupiter_rP=4.950
        self.Saturn_rP=9.048
        self.Uranus_rP=18.286
        self.Neptune_rP=29.810
        self.Pluto_rP=29.660
        self.Haumea_rP=35.150
        self.Makemake_rP=38.520
        self.Eris_rP=37.800

        #...SOLAR SYSTEM_rA (aphelion) AU...

        self.Mercury_rA=0.467
        self.Venus_rA=0.728
        self.Earth_rA=1.017
        self.Mars_rA=1.666
        self.Ceres_rA=2.984
        self.Jupiter_rA=5.458
        self.Saturn_rA=10.057
        self.Uranus_rA=20.110
        self.Neptune_rA=30.330
        self.Pluto_rA=49.300
        self.Haumea_rA=51.540
        self.Makemake_rA=53.050
        self.Eris_rA=97.650

        #...SOLAR SYSTEM_AU...

        self.Mercury_AU=0.38709927  #0.387
        self.Venus_AU=0.72333566  #0.723
        self.Earth_AU=1.00000261  #1.000
        self.Mars_AU=1.52371034  #1.524
        self.Ceres_AU=2.76622989  #2.765
        self.Jupiter_AU=5.202887  #5.204
        self.Saturn_AU=9.53667594  #9.555
        self.Uranus_AU=19.18916464  #19.198
        self.Neptune_AU=30.06992276  #30.070
        self.Pluto_AU=39.34507041  #39.480
        self.Haumea_AU=43.09425984  #43.01
        self.Makemake_AU=45.60399946  #45.51
        self.Eris_AU=67.89659047  #67.730

        #...SOLAR SYSTEM_MO degrees at NOON...

        self.Mercury_MO=174.79252722  #174.794242
        self.Venus_MO=50.37663232  #50.416750
        self.Earth_MO=357.52688973  #357.517380
        self.Mars_MO=19.39019754  #19.390430
        self.Vesta_MO=338.30929  #292.980000
        self.Ceres_MO=6.125359  #80.393460
        self.Pallas_MO=349.196004  #31.500000
        self.Hygiea_MO=349.874637  #2.800000
        self.Jupiter_MO=19.66796068  #20.020060
        self.Saturn_MO=317.35536592  #317.020680
        self.Uranus_MO=142.28382821  #142.590260
        self.Neptune_MO=259.91520804  #259.915840
        self.Pluto_MO=15.353751  #14.862300
        self.Haumea_MO=189.718279  #189.330000
        self.Makemake_MO=139.06958  #138.970000
        self.Eris_MO=194.71816  #194.830000

        #..SOLAR SYSTEM inclination degrees updated..

        self.Mercury_i=7.00497902  #6.97226  #7.00487
        self.Venus_i=3.39467605  #3.39111  #3.39471
        self.Earth_i=-0.00001531  #0.00005  #0.67148  #0.00005
        self.Mars_i=1.84969142  #1.84049  #1.85061
        self.Vesta_i=7.143882  #7.14471  #7.134
        self.Ceres_i=10.586988  #10.59534  #10.593
        self.Pallas_i=34.934275  #34.91695  #34.841
        self.Hygiea_i=3.824927  #3.836  #3.831
        self.Jupiter_i=1.30439695  #1.30381  #1.30530
        self.Saturn_i=2.48599187  #2.488  #2.48446
        self.Uranus_i=0.77263783  #0.77102  #0.76986
        self.Neptune_i=1.77004347  #1.770  #1.76917
        self.Pluto_i=17.174686  #17.10261  #17.142
        self.Haumea_i=28.208481  #28.20483  #28.208
        self.Makemake_i=29.024343  #28.98136  #29.032
        self.Eris_i=43.960636  #44.18486  #43.869

        #..SOLAR SYSTEM argument of perihelion degrees updated..

        self.Mercury_w=29.12703035  #33.62989  #29.12478
        self.Venus_w=54.92262463  #21.69870  #54.85229
        self.Earth_w=102.93768193  #354.19059  #114.20783
        self.Mars_w=286.4968315  #288.04621  #286.4623
        self.Vesta_w=151.418698  #152.85332  #149.84
        self.Ceres_w=73.143672  #75.54887  #72.58981
        self.Pallas_w=310.993993  #310.94905  #310.15094
        self.Hygiea_w=312.605312  #314.292  #312.3
        self.Jupiter_w=274.25457074  #273.39099  #274.1977
        self.Saturn_w=338.93645383  #338.890  #338.7169
        self.Uranus_w=96.93735127  #97.16090  #96.73436
        self.Neptune_w=273.18053653  #274.155  #273.24966
        self.Pluto_w=113.046085  #111.60972  #113.76329
        self.Haumea_w=240.540613  #239.94744  #238.78
        self.Makemake_w=297.06245  #295.32924  #297.08
        self.Eris_w=150.8446  #151.65608  #150.98

        #..SOLAR SYSTEM longitude of ascending node degrees updated..

        self.Mercury_omega=48.33076593  #47.94482  #48.33167
        self.Venus_omega=76.67984255  #76.60627  #76.68069
        self.Earth_omega=0.0  #84.52098  #348.73936
        self.Mars_omega=49.55953891  #49.52309  #49.57854
        self.Vesta_omega=103.699515  #103.61757  #103.92
        self.Ceres_omega=80.248693  #80.24006  #80.39320
        self.Pallas_omega=172.887359  #172.79056  #173.12950
        self.Hygiea_omega=283.086688  #283.217  #283.2
        self.Jupiter_omega=100.47390909  #100.49999  #100.55615
        self.Saturn_omega=113.66242448  #113.583  #113.71504
        self.Uranus_omega=74.01692503  #74.02425  #74.22988
        self.Neptune_omega=131.78422574  #131.774  #131.72169
        self.Pluto_omega=110.335225  #110.27011  #110.30347
        self.Haumea_omega=121.785687  #121.94644  #240.20
        self.Makemake_omega=79.314901  #79.63639  #79.27
        self.Eris_omega=35.991215  #35.88649  #35.95

        #...SOLAR SYSTEM_e...

        self.Mercury_e=0.20563593  #0.206
        self.Venus_e=0.00677672  #0.0068
        self.Earth_e=0.01671123  #0.0167
        self.Mars_e=0.0933941  #0.0934
        self.Vesta_e=0.0902378  #0.0902
        self.Ceres_e=0.07980769  #0.0791
        self.Pallas_e=0.23071793  #0.231
        self.Hygiea_e=0.10592216  #0.111
        self.Jupiter_e=0.04838624  #0.0484
        self.Saturn_e=0.05386179  #0.0542
        self.Uranus_e=0.04725744  #0.0472
        self.Neptune_e=0.00859048  #0.0086
        self.Pluto_e=0.24805013  #0.2488
        self.Haumea_e=0.19368483  #0.200
        self.Makemake_e=0.15803161  #0.160
        self.Eris_e=0.43893743  #0.440

        self.G_2=3.3365e-11 # self.G/2
        self.GM_S=1.32712440042e20  ##standard gravitational parameter for the sun  m3.s-2
        self.light_year_m=self.c_m_s*self.earthperiod_s
        self.parsec_m=3.0857e16
        self.parsec_AU=2.0626e5
        self.M='larger Mass'
        self.v='velocity'
        self.newton_3='the magnitude of the force exerted on (M) by (m) must be equal the magnitude of the force exerted on m by M'
        self.orbital_period_2='orbital_period=(2*math.pi*distance)/velocity'
        self.G=6.67430e-11 #m3(kg.s2)
        self.circular='for a CIRCULAR orbit the gravitational force provides the centripetal force'
        self.centripetal_force='centripetal_force=(mass*(velocity**2))/distance'
        self.centripetal_2='G=(self.G*Mass*mass)/(distance**2)'
        self.orbital_velocity_of_planet='orbital_velocity_of_planet=(2*math.pi*distance)/orbital_period'
        self.orbital_velocity='orbital_velocity_of_object=math.sqrt((self.G*mass)/distance)'
        self.orbital_period='orbitalearth_period_2=math.sqrt(4*(math.pow(math.pi,2)*math.pow(self.AU_m,3))/(self.G*self.MoS_kg))'

        self.help='\nlisting of function arguments respectively:\n(harmonic fxn): 1.velocity||2.distance btwn the two objects/masses||3.mass||4.Mass||5. o_p -period in seconds-\n(eccent fxn): 1.r_a -aphelion-||2.r_p -perihelion-||3.tble -triggers a table if not None-\n(energy fxn): 1.k_e -kinetic energy magnitude-||2.p_e -potential energy magnitude-||3.mass -mass of smaller mass-||4.Mass -mass of larger Mass-||5.distance -distance r-\n...use seconds, meters...'                                                                                      

        if tble:
            table=Table(title='...SOLAR SYSTEM...')
            console=Console()                                                  
            table.add_column('Planet/dwarf',style='Cyan')
            table.add_column('(M)ass_kg',style='magenta')
            table.add_column('Equitorial\nRadius\n(R)',style='Cyan')
            table.add_column('Semimajor\nAxis\n(AU)',style='magenta')
            table.add_column('Sidereal\nOrbital\nperiod\n(yr)',style='Cyan')
            table.add_row('Mercury',f'{self.Mercury_mass}',f'{self.Mercury_R}',f'{self.Mercury_AU}',f'{self.Mercury_P}')
            table.add_row('Venus',f'{self.Venus_mass}',f'{self.Venus_R}',f'{self.Venus_AU}',f'{self.Venus_P}')
            table.add_row('Earth',f'{self.Earth_mass}',f'{self.Earth_R}',f'{self.Earth_AU}',f'{self.Earth_P}')
            table.add_row('Mars',f'{self.Mars_mass}',f'{self.Mars_R}',f'{self.Mars_AU}',f'{self.Mars_P}')
            table.add_row('Ceres',f'{self.Ceres_mass}',f'{self.Ceres_R}',f'{self.Ceres_AU}',f'{self.Ceres_P}')
            table.add_row('Jupiter',f'{self.Jupiter_mass}',f'{self.Jupiter_R}',f'{self.Jupiter_AU}',f'{self.Jupiter_P}')
            table.add_row('Saturn',f'{self.Saturn_mass}',f'{self.Saturn_R}',f'{self.Saturn_AU}',f'{self.Saturn_P}')
            table.add_row('Uranus',f'{self.Uranus_mass}',f'{self.Uranus_R}',f'{self.Uranus_AU}',f'{self.Uranus_P}')
            table.add_row('Neptune',f'{self.Neptune_mass}',f'{self.Neptune_R}',f'{self.Neptune_AU}',f'{self.Neptune_P}')
            table.add_row('Pluto',f'{self.Pluto_mass}',f'{self.Pluto_R}',f'{self.Pluto_AU}',f'{self.Pluto_P}')
            table.add_row('Eris',f'{self.Eris_mass}',f'{self.Eris_R}',f'{self.Eris_AU}',f'{self.Eris_P}')
            console.print(table)

            print()
            console.print(f'[bold green]..mass of Earth_kg: {self.MoE_kg}\n..Average distance of Earth from sun: {self.AU_m} (meters)\n..Sidereal period of Earth in seconds: {self.earthperiod_s} (seconds)\n..Equitorial Radius of Earth: {self.radiusof_Earth_m} (meters)[/bold green]')
            sys.exit(0)



    def harmonic(self,velocity: float=1,distance: float=1,mass: float=1,Mass: float=1,o_p: float=1):
        start=time.perf_counter()
        '''the harmonic law and how it translates to the universal gravitation constant (mass=smaller-mass) (Mass=larger-mass)'''
        console=Console()
        harmonic_law='P**2==a**3 (or) P**2==kr**3'
    # where k is a constant of proportionality
        orbitalearth_period=(2*math.pi*self.AU_m)/(self.earthorbit_velocity_km_s*1000)
        orbital_velocity_of_earth=(2*math.pi*self.AU_m)/orbitalearth_period
        orbitalearth_period_2=math.sqrt(4*(math.pow(math.pi,2)*math.pow(self.AU_m,3))/(self.G*self.MoS_kg))
        centripetal_force=(mass*(velocity**2))/distance
        orbital_velocity_of_object=math.sqrt((self.G*Mass)/distance) # can also be used to calculate the orbital velocity of planet with circular orbit.

        escape_velocity=math.sqrt((2*(self.G*Mass))/distance)

    #for other planets..
        orbitalperiod_other=math.sqrt(4*(math.pow(math.pi,2)*math.pow(distance,3))/(self.G*self.MoS_kg))
        orbital_velocityother=(2*math.pi*distance)/o_p
        
        #print(f'(Newton-s third law of motion: {instance.newton_3})\n(Kepler-s third law for planets orbits: {instance.k_3})\n(The harmonic law states that {harmonic_law})\nusing ({instance.orbital_period}) and ({instance.centripetal_force})...now substituteusing the second value for the harmonic_law\n({instance.circular}) therefore ({instance.centripetal_2}) which is the gravitational force=the centripetal_force ({instance.centripetal_force}) after solving the resulting equation and putting it in terms of the constant velocity of ({instance.m}), we get the equation for the orbital velocity of an object in circular orbit about ({instance.m}) like earth and a satellite: ({instance.orbital_velocity})\n')
        
        #console.print(f'[bold green]...Total time taken by the program: {round(time.perf_counter()-start,2)} (seconds)...[/bold green]')
        print(f'\nCentripetal_Force_btwn_two objects={centripetal_force} (N)\norbitalearth_period={orbitalearth_period} (seconds) # Earths orbital period\norbital_velocity_of_earth={orbital_velocity_of_earth} (m/s) or {orbital_velocity_of_earth/1000} (km/s) # Earths orbital velocity\norbital_velocity_of_object={orbital_velocity_of_object} (m/s)\norbitalearth_period_2={orbitalearth_period_2} (seconds) # Earths orbital period_2\nescape_velocity={escape_velocity} (m/s)\norbitalperiod_other={orbitalperiod_other} (seconds) # Orbital period of other mass\norbital_velocityother = {orbital_velocityother} (m/s) or {orbital_velocityother/1000} (km/s) # Orbital velocity of other mass\n')


    def tebl(self):
        table=Table(title='...ENERGY ECCENT...')
        console=Console()

        table.add_column('Orbit',style='Cyan')
        table.add_column('Eccentricity',style='magenta')
        table.add_column('Total-energy- (E)',style='Cyan')
        table.add_column('Example',style='magenta')
        table.add_row('Circular','e=0','E<0-(mostly negative)-','ISS,Satellites')
        table.add_row('Elliptical','0<e<1','E<0','planets,moons')
        table.add_row('Parabolic','e=1','E=0','Escape Trajectory')
        table.add_row('Hyperbolic','e>1','E>0','Interstellar Objects')
        console.print(table)


    def distance(self,parallax: float=1,distance: float=1,light_years: float=1):
        '''using trigonometric parallax because a nearby star exhibits an annual back and forth change in its position against the stationary background *much more distant stars*'''
        distance_p = 1/parallax # distance_d is in parsec parallax-second
        distance_AU = distance_p*self.parsec_AU
        #distance_AU_m = distance_AU*self.AU_m
        distance_m = distance_p*self.parsec_m
        distance_ly = round((distance_m/self.light_year_m),3)

        #if distance!=1: # variable distance_ps, parallax_t, light year will only be created if the statement is True
        distance_ps = distance/self.parsec_m
        distance_AU_2 = distance_ps*self.parsec_AU
        light_year = round((distance/self.light_year_m),3)
        parallax_t = 1/distance_ps
        
        #if light_years!=1: # the following variables will only be created if the statement is True
        distance_m_2 = light_years*self.light_year_m
        distance_ps_2 = distance_m_2/self.parsec_m
        distance_AU_3 = distance_ps_2*self.parsec_AU
        parallax_t_2 = 1/distance_ps_2


        print(f'\ndistance in parsecs: {distance_p if distance_p!=1 else distance_ps if distance_ps!=3.2407557442395566e-17 else distance_ps_2} (parsecs)\ndistance in AU: {distance_AU if distance_AU!=self.parsec_AU else distance_AU_2 if distance_AU_2!=6.68438279806851e-12 else distance_AU_3} (AU)\nNumber of light years: {distance_ly if distance_ly!=3.261 else light_year if light_year!=0 else light_years} (light years)\ndistance in meters: {distance_m if distance_m!=self.parsec_m else distance_m_2 if distance_m_2!=1.0568938650270438e-16 else distance} (m)\nparallax angle value: {parallax_t if parallax_t!=3.0857e+16 else parallax_t_2 if parallax_t_2!=3.2612573993139486 else parallax}')
        

        



    def timee(self,Mass: float=1,distance: float=1,coordinate_time: float=1,proper_time: float=1):
        '''time dilation due to gravitational fields'''

        # Time passes slower in stronger gravitational fields. Time passes slower for an object moving at high speeds relative to an stationary observer.
        console=Console()
        #pr = (2*self.G*Mass/(distance*math.pow(self.c_m_s,2)))
        #print(pr)
        #exit()
        #proper = math.sqrt(1-pr)

        proper = math.sqrt(abs(1-(2*self.G*Mass/(distance*math.pow(self.c_m_s,2)))))*coordinate_time # shows the fraction of coordinate time that passes as proper time. if one second or hour has passed for the distant stationary observer then the result of the equation is the fraction of coordinate time that has passed as proper time near the mass M.
        #coordinate = 1/(math.sqrt(abs(1-(2*self.G*Mass/(distance*math.pow(self.c_m_s,2))))))*proper_time #Time dilation factor. shows how much more coordinate time passes compared to proper time
        coordinate = 1/(math.sqrt(abs(1-(2*self.G*Mass/(distance*math.pow(self.c_m_s,2))))))*proper_time 

        print(f'\nproper_time: {proper}\ncoordinate_time: {coordinate}\nexplanation: {console.print(f"[bold yellow]for every one unit of time that is measured for a distant stationary object only {proper} has passed for the object at or near the Masses surface and for every one unit of time that is measured for an object near the mass only {coordinate} has passed for the distant stationary object[/bold yellow]")}')


    def energy(self,k_e: float=1,p_e: float=1,mass: float=1,Mass: float=1,distance: float=1,tble=None):
        '''calculates the total mechanical energy of an orbiting body'''
        console=Console()
        kinetic_energy = ((self.G*Mass*mass)/(2*distance)) #k=-E, k=-1/2U where U is the potential energy. E=-k
        potential_energy = -((self.G*Mass*mass)/distance)
        total_energy = -((self.G*Mass*mass)/(2*distance)) #E=1/2U where U is the potential energy.
        # kinetic energy is the negative of the total energy
        total_energy_2 = kinetic_energy+potential_energy if kinetic_energy!=self.G_2 and potential_energy!=-self.G else k_e+p_e

        if total_energy==-self.G_2 and total_energy_2<0:
            console.print('\n[bold yellow]bound orbit..ellipse or circle[/bold yellow]\n') #when k_e, p_e are used to calculate the total_energy
        elif total_energy!=-self.G_2 and total_energy<0 and total_energy_2<0: #total_energy!=-self.G and total_energy_2==2:,,when massee and r are used to calculate E
            console.print('\n[bold yellow]bound orbit..ellipse or circle[/bold yellow]\n')
        elif total_energy==0 or total_energy_2==0:
            console.print('\n[bold yellow]Parabolic orbit.[/bold yellow]\n')
        elif total_energy>0 or total_energy_2>0:
            console.print('\n[bold yellow]unbound orbit..hyperbolic orbit[/bold yellow]\n')

        print(f'\nkinetic_energy: {round(kinetic_energy if kinetic_energy!=self.G_2 else k_e,3)} (Joules or kg.m^2.s^-2)\npotential_energy: {round(potential_energy if potential_energy!=-self.G else p_e,3)} (Joules or kg.m^2.s^-2)\ntotal_energy: {round(total_energy if total_energy!=-self.G_2 else total_energy_2,3)} (Joules or kg.m^2.s^-2)\n')

    def u_total(self):
        '''gets the total gravitation paramameter u'''

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
        haumea = self.Haumea_mass*self.MoE_kg
        makemake = self.Makemake_mass*self.MoE_kg
        eris = self.Eris_mass*self.MoE_kg

        total_mass = (self.MoS_kg+(mercury+venus+earth+mars+vesta+hygiea+makemake+haumea+pallas+ceres+jupiter+saturn+uranus+neptune+pluto+eris))
        u_total = self.G*total_mass
        return u_total #m3(kg.s2)

    def spec_uhelio(self,name: str=None):
        '''gets the specific gravitational parameter for heliocentric system for planet X'''
        #name = name.upper()

        if name==None:
            console.print('[bold red]NAME CANNOT BE NONE[/bold red]')
            sys.exit(0)

        name = name.upper()
        values = ['MERCURY','VENUS','EARTH','MARS','VESTA','CERES','PALLAS','HYGIEA','JUPITER','SATURN','URANUS','NEPTUNE','PLUTO','HAUMEA','MAKEMAKE','ERIS']

        if name not in values:
            console.print('[bold red]NAME NOT LOCALLY RECOGNIZED OR WRONG SPELLING[/bold red]')
            sys.exit(0)

        index = 0 if name==values[0] else 1 if name==values[1] else 2 if name==values[2] else 3 if name==values[3] else 4 if name==values[4] else 5 if name==values[5] else 6 if name==values[6] else 7 if name==values[7] else 8 if name==values[8] else 9 if name==values[9] else 10 if name==values[10] else 11 if name==values[11] else 12 if name==values[12] else 13 if name==values[13] else 14 if name==values[14] else 15 if name==values[15] else None

        spec_u = [
                {'name':'MERCURY','u':(self.G*(self.MoS_kg+(self.Mercury_mass*self.MoE_kg)))},
                {'name':'VENUS','u':(self.G*(self.MoS_kg+(self.Venus_mass*self.MoE_kg)))},
                {'name':'EARTH','u':(self.G*(self.MoS_kg+self.MoE_kg+self.moons['EARTH']['mass']))}, #earth moon system 
                {'name':'MARS','u':(self.G*(self.MoS_kg+(self.Mars_mass*self.MoE_kg)))},
                {'name':'VESTA','u':(self.G*(self.MoS_kg+(self.Vesta_mass*self.MoE_kg)))},
                {'name':'CERES','u':(self.G*(self.MoS_kg+(self.Ceres_mass*self.MoE_kg)))},
                {'name':'PALLAS','u':(self.G*(self.MoS_kg+(self.Pallas_mass*self.MoE_kg)))},
                {'name':'HYGIEA','u':(self.G*(self.MoS_kg+(self.Hygiea_mass*self.MoE_kg)))},
                {'name':'JUPITER','u':(self.G*(self.MoS_kg+(self.Jupiter_mass*self.MoE_kg)))},
                {'name':'SATURN','u':(self.G*(self.MoS_kg+(self.Saturn_mass*self.MoE_kg)))},
                {'name':'URANUS','u':(self.G*(self.MoS_kg+(self.Uranus_mass*self.MoE_kg)))},
                {'name':'NEPTUNE','u':(self.G*(self.MoS_kg+(self.Neptune_mass*self.MoE_kg)))},
                {'name':'PLUTO','u':(self.G*(self.MoS_kg+(self.Pluto_mass*self.MoE_kg)))},
                {'name':'HAUMEA','u':(self.G*(self.MoS_kg+(self.Haumea_mass*self.MoE_kg)))},
                {'name':'MAKEMAKE','u':(self.G*(self.MoS_kg+(self.Makemake_mass*self.MoE_kg)))},
                {'name':'ERIS','u':(self.G*(self.MoS_kg+(self.Eris_mass*self.MoE_kg)))}
                ]

        return spec_u[index]['u']

        



    def orbit(self,days_elapsed: int=0,period: int=-1,planet: int=None,eccentric=None,plx=None,animate=None): # default for planet is Earth
        '''using days, it calculates the position of a planet in a perfect circle. just an example. Planet orbits are eccentric'''

        #start = time.perf_counter()  # for debugging purposes

        console=Console()
        mean_motion=None
        mean_anomaly=None
        x_coord=None
        y_coord=None


        if period!=-1 and planet: #if both the period and planet are entered
            console.print('[bold red]EITHER USE PERIOD OR PLANET OPTIONS. BUT NOT BOTH AT THE SAME TIME.CAUTION PERIOD WAS DISCONTINUED..[/bold red]')
            sys.exit(0)

        if planet:
            if 1<=planet<=11:
                print()
            else:
                print('\nonly supports 11 objects in the solar system.check the table printed after running astlo --tble y orbit. use 1--11.\n')
                sys.exit(0)

                # or use .get() to get the values if pkanet==1 ..pmanet==11 and a fallback value = period if period!=-1

        values={'1':88,'2':225,'3':365,'4':687,'5':1681,'6':4333,'7':10759,'8':30685,'9':60190,'10':90465,'11':204174} # the values are the period in days. used 365.25
        vallues={'1':self.Mercury_e,'2':self.Venus_e,'3':self.Earth_e,'4':self.Mars_e,'5':self.Ceres_e,'6':self.Jupiter_e,'7':self.Saturn_e,'8':self.Uranus_e,'9':self.Neptune_e,'10':self.Pluto_e,'11':self.Eris_e}
        valllues={'88':self.Mercury_e,'225':self.Venus_e,'365':self.Earth_e,'687':self.Mars_e,'1681':self.Ceres_e,'4333':self.Jupiter_e,'10759':self.Saturn_e,'30685':self.Uranus_e,'60190':self.Neptune_e,'90465':self.Pluto_e,'204174':self.Eris_e} 

        val={88:'MERCURY ORBIT',225:'VENUS ORBIT',365:'EARTH ORBIT',687:'MARS ORBIT',1681:'CERES ORBIT',4333:'JUPITER ORBIT',10759:'SATURN ORBIT',30685:'URANUS ORBIT',60190:'NEPTUNE ORBIT',90465:'PLUTO ORBIT',204174:'ERIS ORBIT'}

        vul={88:'MERCURY COORDINATES',225:'VENUS COORDINATES',365:'EARTH COORDINATES',687:'MARS COORDINATES',1681:'CERES COORDINATES',4333:'JUPITER COORDINATES',10759:'SATURN COORDINATES',30685:'URANUS COORDINATES',60190:'NEPTUNE COORDINATES',90465:'PLUTO COORDINATES',204174:'ERIS COORDINATES'}

        vaal={88:self.Mercury_AU,225:self.Venus_AU,365:self.Earth_AU,687:self.Mars_AU,1681:self.Ceres_AU,4333:self.Jupiter_AU,10759:self.Saturn_AU,30685:self.Uranus_AU,60190:self.Neptune_AU,90465:self.Pluto_AU,204174:self.Eris_AU}

        ## use self.object instead of the countless dictionaries
        
        #vil={1:self.Mercury_AU,2:self.Venus_AU,3:self.Earth_AU,4:self.Mars_AU,5:self.Ceres_AU,6:self.Jupiter_AU,7:self.Saturn_AU,8:self.Uranus_AU,9:self.Neptune_AU,10:self.Pluto_AU,11:self.Eris_AU}

        vil = [
                {'name':'MERCURY','p':self.Mercury_P*self.earthperiod_s,'MO':self.Mercury_MO,'a':self.Mercury_AU*self.AU_m,'e':self.Mercury_e,'i':math.radians(self.Mercury_i),'w':math.radians(self.Mercury_w),'omega':math.radians(self.Mercury_omega)},
                {'name':'VENUS','p':self.Venus_P*self.earthperiod_s,'MO':self.Venus_MO,'a':self.Venus_AU*self.AU_m,'e':self.Venus_e,'i':math.radians(self.Venus_i),'w':math.radians(self.Venus_w),'omega':math.radians(self.Venus_omega)},
                {'name':'EARTH','p':self.Earth_P*self.earthperiod_s,'MO':self.Earth_MO,'a':self.Earth_AU*self.AU_m,'e':self.Earth_e,'i':math.radians(self.Earth_i),'w':math.radians(self.Earth_w),'omega':math.radians(self.Earth_omega)},
                {'name':'MARS','p':self.Mars_P*self.earthperiod_s,'MO':self.Mars_MO,'a':self.Mars_AU*self.AU_m,'e':self.Mars_e,'i':math.radians(self.Mars_i),'w':math.radians(self.Mars_w),'omega':math.radians(self.Mars_omega)},
                {'name':'CERES','p':self.Ceres_P*self.earthperiod_s,'MO':self.Ceres_MO,'a':self.Ceres_AU*self.AU_m,'e':self.Ceres_e,'i':math.radians(self.Ceres_i),'w':math.radians(self.Ceres_w),'omega':math.radians(self.Ceres_omega)},
                {'name':'JUPITER','p':self.Jupiter_P*self.earthperiod_s,'MO':self.Jupiter_MO,'a':self.Jupiter_AU*self.AU_m,'e':self.Jupiter_e,'i':math.radians(self.Jupiter_i),'w':math.radians(self.Jupiter_w),'omega':math.radians(self.Jupiter_omega)},
                {'name':'SATURN','p':self.Saturn_P*self.earthperiod_s,'MO':self.Saturn_MO,'a':self.Saturn_AU*self.AU_m,'e':self.Saturn_e,'i':math.radians(self.Saturn_i),'w':math.radians(self.Saturn_w),'omega':math.radians(self.Saturn_omega)},
                {'name':'URANUS','p':self.Uranus_P*self.earthperiod_s,'MO':self.Uranus_MO,'a':self.Uranus_AU*self.AU_m,'e':self.Uranus_e,'i':math.radians(self.Uranus_i),'w':math.radians(self.Uranus_w),'omega':math.radians(self.Uranus_omega)},
                {'name':'NEPTUNE','p':self.Neptune_P*self.earthperiod_s,'MO':self.Neptune_MO,'a':self.Neptune_AU*self.AU_m,'e':self.Neptune_e,'i':math.radians(self.Neptune_i),'w':math.radians(self.Neptune_w),'omega':math.radians(self.Neptune_omega)},
                {'name':'PLUTO','p':self.Pluto_P*self.earthperiod_s,'MO':self.Pluto_MO,'a':self.Pluto_AU*self.AU_m,'e':self.Pluto_e,'i':math.radians(self.Pluto_i),'w':math.radians(self.Pluto_w),'omega':math.radians(self.Pluto_omega)},
                {'name':'ERIS','p':self.Eris_P*self.earthperiod_s,'MO':self.Eris_MO,'a':self.Eris_AU*self.AU_m,'e':self.Eris_e,'i':math.radians(self.Eris_i),'w':math.radians(self.Eris_w),'omega':math.radians(self.Eris_omega)}
                ]

        
        index = 0 if period==88 else 1 if period==225 else 2 if period==365 else 3 if period==687 else 4 if period==1681 else 5 if period==4333 else 6 if period==10759 else 7 if period==30685 else 8 if period==60190 else 9 if period==90465 else 10 if period==204174 else None #values.get(str(planet),None) if planet else None  # did not include planet because it is discontinued..using names now..included now..
        

        if days_elapsed!=0 and eccentric==None:
            ##mean_motion=360/(values['1'] if planet==1 else values['2'] if planet==2 else values['3'] if planet==3 else values['4'] if planet==4 else values['5'] if planet==5 else values['6'] if planet==6 else values['7'] if planet==7 else values['8'] if planet==8 else values['9'] if planet==9 else values['10'] if planet==10 else values['11'] if planet==11 else period if period!=-1 else values['3'])

            mean_motion = 360/(values.get(str(planet),period) if planet or period!=-1 else values['3']) #default is Earth.
            

            mean_anomaly=mean_motion*days_elapsed
            x_coord=math.cos(math.radians(mean_anomaly))
            y_coord=math.sin(math.radians(mean_anomaly))
            
            console.print(f'[bold yellow]For day {days_elapsed}: {(x_coord,y_coord)}')

            #del mean_motion
            #del mean_anomaly               
            #del x_coord
            #del y_coord

        if (period!=-1 or planet) and eccentric==None:

            ##mean_motion=360/(period if period!=-1 else values.get(str(planet),values['3']))

            mean_motion = 360/(values.get(str(planet),period))

            x_list = []
            y_list = []

            table=Table(title='...SOLAR SYSTEM FOR CIRCULAR ORBIT...')
            table.add_column('Day',style='Cyan')
            table.add_column('Angle,\n(degrees)\nmean_anomaly',style='magenta')
            table.add_column('Radians',style='Cyan')
            table.add_column('x-Coord',style='magenta')
            table.add_column('y-Coord',style='Cyan') # all of this should be in the if statement..next


        
            for day in range(values.get(str(planet),period)+1):
               # #mean_motion=360/(period if period!=-1 else values.get(str(planet),values['3'])) #period in days...shoild be outside the for loop  
                mean_anomaly=mean_motion*day
                radian=math.radians(mean_anomaly)
                x_coord=math.cos(math.radians(mean_anomaly))
                y_coord=math.sin(math.radians(mean_anomaly))

                #console.print(f'\n[bold yellow]Day {day}: {(x_coord,y_coord)}[/bold yellow]\n')
                x_list.append(x_coord)
                y_list.append(y_coord)

                table.add_row(f'{day}',f'{mean_anomaly}',f'{radian}',f'{x_coord}',f'{y_coord}')
            
            console.print(table)

            ##stop = time.perf_counter() # line not needed
    
            #console.print(f'\n[bold green]time taken by circular logic:[/bold green] [bold yellow]{round(time.perf_counter()-start,3)} (seconds)[/bold yellow]\n')

            #del mean_motion
            #del mean_anomaly
            #del x_coord
            #del y_coord
            

        if eccentric:
            
            if days_elapsed!=0:

                lis_t = [88,225,365,687,1681,4333,10759,30685,60190,90465,204174] #added -1 in this part of the logic onlynfor compatibility

                if period not in lis_t and planet==None: #enforcer
                    console.print('\n[bold magenta] invalid name/period use! use::\nMercury\nVenus\nEarth\nMars\nCeres\nJupiter\nSaturn\nUranus\nNeptune\nPluto\nEris\nTHOSE ARE THE CURRENT AVAILABLE OBJECTS FOR PLOTTING. FXN ANMTE CAN PRINT THEM ALL USE anmte --help for assistance.[/bold magenta]\n')#[bold Cyan]Or use the planet number respectively.[/bold Cyan]\n')
                    sys.exit(0)

                ##mean_motion = days_elapsed/(values['1'] if planet==1 else values['2'] if planet==2 else values['3'] if planet==3 else values['4'] if planet==4 else values['5'] if planet==5 else values['6'] if planet==6 else values['7'] if planet==7 else values['8'] if planet==8 else values['9'] if planet==9 else values['10'] if planet==10 else values['11'] if planet==11 else period if period!=-1 else values['3'])

                mean_motion = days_elapsed/(values.get(str(planet),period) if planet or period!=-1 else values['3']) # default Earth

                mean_anomaly=mean_motion*(2*math.pi) #2*pi=360 degrees. true anomaly==M..converted into radians
                eccentric_anomaly=mean_anomaly #start with a guess eg E=M
                #print('\nmean anomaly for elliptic orbit:',mean_anomaly)
                    # using the Newton raphson method
                for i in range(11): 
                    eccentric_anomaly = eccentric_anomaly-((eccentric_anomaly-(vallues['1'] if planet==1 else vallues['2'] if planet==2 else vallues['3'] if planet==3 else vallues['4'] if planet==4 else vallues['5'] if planet==5 else vallues['6'] if planet==6 else vallues['7'] if planet==7 else vallues['8'] if planet==8 else vallues['9'] if planet==9 else vallues['10'] if planet==10 else vallues['11'] if planet==11 else valllues['88'] if period==88 else valllues['225'] if period==225 else valllues['365'] if period==365 else valllues['687'] if period==687 else valllues['1681'] if period==1681 else valllues['4333'] if period==4333 else valllues['10759'] if period==10759 else valllues['30685'] if period==30685 else valllues['60190'] if period==60190 else valllues['90465'] if period==90465 else valllues['204174'] if period==204174 else self.Earth_e)*math.sin(eccentric_anomaly)-mean_anomaly)/(1-((vallues['1'] if planet==1 else vallues['2'] if planet==2 else vallues['3'] if planet==3 else vallues['4'] if planet==4 else vallues['5'] if planet==5 else vallues['6'] if planet==6 else vallues['7'] if planet==7 else vallues['8'] if planet==8 else vallues['9'] if planet==9 else vallues['10'] if planet==10 else vallues['11'] if planet==11 else valllues['88'] if period==88 else valllues['225'] if period==225 else valllues['365'] if period==365 else valllues['687'] if period==687 else valllues['1681'] if period==1681 else valllues['4333'] if period==4333 else valllues['10759'] if period==10759 else valllues['30685'] if period==30685 else valllues['60190'] if period==60190 else valllues['90465'] if period==90465 else valllues['204174'] if period==204174 else self.Earth_e)*math.cos(eccentric_anomaly))))

                    ##eccentric_anomaly = eccentric_anomaly-((eccentric_anomaly-(vallues.get(str(planet),valllues[str(period)]) if period!=-1 or planet else self.Earth_e)*math.sin(eccentric_anomaly)-mean_anomaly)/(1-(vallues.get(str(planet),valllues[str(period)]) if period!=-1 or planet else self.Earth_e)*math.cos(eccentric_anomaly)))
                    
                #print('eccentric anomaly after the newton raphson loop:',eccentric_anomaly)
                


                #position/r = ((val['1'] if planet==1 else val['2'] if planet==2 else val['3'] if planet==3 else val['4'] if planet==4 else val['5'] if planet==5 else val['6'] if planet==6 else val['7'] if planet==7 else val['8'] if planet==8 else val['9'] if planet==9 else val['10'] if planet==10 else val['11'] if planet==11 else val['1'] if period==88 else val['2'] if period==225 else val['3'] if period==365 else val['4'] if period==687 else val['5'] if period==1681 else val['6'] if period==4333 else val['7'] if period==10759 else val['8'] if period==30685 else val['9'] if period==60190 else val['10'] if period==90465 else val['11'] if period==204174 else self.Earth_AU)*(1-(self.Mercury_e if planet==1 else self.Venus_e if planet==2 else self.Earth_e if planet==3 else self.Mars_e if planet==4 else self.Ceres_e if planet==5 else self.Jupiter_e if planet==6 else self.Saturn_e if planet==7 else self.Uranus_e if planet==8 else self.Neptune_e if planet==9 else self.Pluto_e if planet==10 else self.Eris_e if planet==11 else self.Mercury_e if period==88 else self.Venus_e if period==225 else self.Earth_e if planet==365 else self.Mars_e if period==687 else self.Ceres_e if period==1681 else self.Jupiter_e if period==4333 else self.Saturn_e if period==10759 else self.Uranus_e if period==30685 else self.Neptune_e if period==60190 else self.Pluto_e if period==90465 else self.Eris_e if period==204174)*math.cos(eccentric_anomaly))  not included in this logic

                b = (self.Mercury_AU if planet==1 else self.Venus_AU if planet==2 else self.Earth_AU if planet==3 else self.Mars_AU if planet==4 else self.Ceres_AU if planet==5 else self.Jupiter_AU if planet==6 else self.Saturn_AU if planet==7 else self.Uranus_AU if planet==8 else self.Neptune_AU if planet==9 else self.Pluto_AU if planet==10 else self.Eris_AU if planet==11 else self.Mercury_AU if period==88 else self.Venus_AU if period==225 else self.Earth_AU if period==365 else self.Mars_AU if period==687 else self.Ceres_AU if period==1681 else self.Jupiter_AU if period==4333 else self.Saturn_AU if period==10759 else self.Uranus_AU if period==30685 else self.Neptune_AU if period==60190 else self.Pluto_AU if period==90465 else self.Eris_AU if period==204174 else self.Earth_AU)*math.sqrt(1-math.pow(vallues['1'] if planet==1 else vallues['2'] if planet==2 else vallues['3'] if planet==3 else vallues['4'] if planet==4 else vallues['5'] if planet==5 else vallues['6'] if planet==6 else vallues['7'] if planet==7 else vallues['8'] if planet==8 else vallues['9'] if planet==9 else vallues['10'] if planet==10 else vallues['11'] if planet==11 else valllues['88'] if period==88 else valllues['225'] if period==225 else valllues['365'] if period==365 else valllues['687'] if period==687 else valllues['1681'] if period==1681 else valllues['4333'] if period==4333 else valllues['10759'] if period==10759 else valllues['30685'] if period==30685 else valllues['60190'] if period==60190 else valllues['90465'] if period==90465 else valllues['204174'] if period==204174 else self.Earth_e,2))

                ##b = (vaal.get(period,vil[planet]) if period!=-1 or planet else self.Earth_AU)*math.sqrt(1-math.pow((valllues.get(str(period),vallues[str(planet)]) if planet or period!=-1 else self.Earth_e),2))
                

                x_coord=(self.Mercury_AU if planet==1 else self.Venus_AU if planet==2 else self.Earth_AU if planet==3 else self.Mars_AU if planet==4 else self.Ceres_AU if planet==5 else self.Jupiter_AU if planet==6 else self.Saturn_AU if planet==7 else self.Uranus_AU if planet==8 else self.Neptune_AU if planet==9 else self.Pluto_AU if planet==10 else self.Eris_AU if planet==11 else self.Mercury_AU if period==88 else self.Venus_AU if period==225 else self.Earth_AU if period==365 else self.Mars_AU if period==687 else self.Ceres_AU if period==1681 else self.Jupiter_AU if period==4333 else self.Saturn_AU if period==10759 else self.Uranus_AU if period==30685 else self.Neptune_AU if period==60190 else self.Pluto_AU if period==90465 else self.Eris_AU if period==204174 else self.Earth_AU)*(math.cos(eccentric_anomaly)-(vallues['1'] if planet==1 else vallues['2'] if planet==2 else vallues['3'] if planet==3 else vallues['4'] if planet==4 else vallues['5'] if planet==5 else vallues['6'] if planet==6 else vallues['7'] if planet==7 else vallues['8'] if planet==8 else vallues['9'] if planet==9 else vallues['10'] if planet==10 else vallues['11'] if planet==11 else valllues['88'] if period==88 else valllues['225'] if period==225 else valllues['365'] if period==365 else valllues['687'] if period==687 else valllues['1681'] if period==1681 else valllues['4333'] if period==4333 else valllues['10759'] if period==10759 else valllues['30685'] if period==30685 else valllues['60190'] if period==60190 else valllues['90465'] if period==90465 else valllues['204174'] if period==204174 else self.Earth_e))

                ##x_coord = ((vaal.get(period,vil[planet]) if planet or period!=-1 else self.Earth_AU)*math.cos(eccentric_anomaly))-(valllues.get(str(period),vallues[str(planet)]) if planet or period!=-1 else self.Earth_e)
                    
                y_coord=(b*math.sin(eccentric_anomaly))
                #console.print(f'[bold yellow]Day {days_elapsed}: ({x_coord},{y_coord})[/bold yellow]')
                
                #console.print('[bold green]time taken by eccentric logic for single coordinates:[/bold green] [bold yellow]{round(time.perf_counter()-start,3)} (seconds)[/bold yellow]'

                X_helio = (x_coord * ((math.cos(vil[index]['omega'])*math.cos(vil[index]['w'])) - (math.sin(vil[index]['omega'])*math.sin(vil[index]['w'])*math.cos(vil[index]['i'])))) - (y_coord * ((math.cos(vil[index]['omega'])*math.sin(vil[index]['w'])) + (math.sin(vil[index]['omega'])*math.cos(vil[index]['w'])*math.cos(vil[index]['i']))))

                Y_helio = (x_coord * (math.sin(vil[index]['omega'])*math.cos(vil[index]['w']) + (math.cos(vil[index]['omega'])*math.sin(vil[index]['w'])*math.cos(vil[index]['i'])))) + (y_coord * ((math.cos(vil[index]['omega'])*math.cos(vil[index]['w'])*math.cos(vil[index]['i'])) - (math.sin(vil[index]['omega'])*math.sin(vil[index]['w']))))

                Z_helio = (x_coord * (math.sin(vil[index]['w'])*math.sin(vil[index]['i']))) + (y_coord * (math.cos(vil[index]['w'])*math.sin(vil[index]['i'])))


                return {'X_helio':X_helio,'Y_helio':Y_helio,'Z_helio':Z_helio,'x_peri':x_coord,'y_peri':y_coord,'b':b,'M':mean_anomaly,'E':eccentric_anomaly,'name':vil[index]['name'],'days_elapsed':days_elapsed}


            
            if (period!=-1 or planet) and days_elapsed==0: #gets thenfull coordinates for the full period.

                

                lis_t = [88,225,365,687,1681,4333,10759,30685,60190,90465,204174]

                if period not in lis_t and planet==None: #enforcer
                    #console.print('\n[bold magenta] invalid period! use::\nMercury: 88\nVenus: 225\nEarth: 365\nMars: 687\nCeres: 1681\nJupiter: 4333\nSaturn: 10759\nUranus: 30685\nNeptune: 60190\nPluto: 90465\nEris: 204174[/bold magenta]\n[bold green]Or use the planet number respectively.[/bold green]\n')
                    console.print('\n[bold magenta] invalid name/period use! use::\nMercury\nVenus\nEarth\nMars\nCeres\nJupiter\nSaturn\nUranus\nNeptune\nPluto\nEris\nTHOSE ARE THE CURRENT AVAILABLE OBJECTS FOR PLOTTING. FXN ANMTE CAN PRINT THEM ALL USE anmte --help for assistance.[/bold magenta]\n')#[bold Cyan]Or use the planet number respectively.[/bold Cyan]\n')

                    sys.exit(0)


                #index = 0 if period==88 else 1 if period==225 else 2 if period==365 else 3 if period==687 else 4 if period==1681 else 5 if period==4333 else 6 if period==10759 else 7 if period==30685 else 8 if period==60190 else 9 if period==90465 else 10 if period==204174 else None # did not include planet because it is discontinued..using names now.

                Title=vul.get(period if period!=-1 else lis_t[0] if planet==1 else lis_t[1] if planet==2 else lis_t[2] if planet==3 else lis_t[3] if planet==4 else lis_t[4] if planet==5 else lis_t[5] if planet==6 else lis_t[6] if planet==7 else lis_t[7] if planet==8 else lis_t[8] if planet==9 else lis_t[9] if planet==10 else lis_t[10],'NULL COORDINATES')


                
                x_list = []
                y_list = []
                M_list = []
                E_list = []

                #table=Table(title=Title)
                #table.add_column('Day',style='Cyan')
                #table.add_column('Radian,\nmean_anomaly',style='magenta')
                #table.add_column('eccentric anomaly',style='Cyan')
                #table.add_column('x_coord',style='magenta')
                #table.add_column('y_coord',style='Cyan')



                for day in range(period+1 if period!=-1 else (values.get(str(planet),values['3'])+1)):
                    
                    # planet and period is already set..the if else statements....day/period if period!=-1 else planet if planetelse values['3']


                    mean_motion = day/(values['1'] if planet==1 else values['2'] if planet==2 else values['3'] if planet==3 else values['4'] if planet==4 else values['5'] if planet==5 else values['6'] if planet==6 else values['7'] if planet==7 else values['8'] if planet==8 else values['9'] if planet==9 else values['10'] if planet==10 else values['11'] if planet==11 else period if period!=-1 else values['3'])

                    mean_anomaly=mean_motion*(2*math.pi)
                    eccentric_anomaly=mean_anomaly



                    for i in range(11):
                        eccentric_anomaly = eccentric_anomaly-((eccentric_anomaly-(vallues['1'] if planet==1 else vallues['2'] if planet==2 else vallues['3'] if planet==3 else vallues['4'] if planet==4 else vallues['5'] if planet==5 else vallues['6'] if planet==6 else vallues['7'] if planet==7 else vallues['8'] if planet==8 else vallues['9'] if planet==9 else vallues['10'] if planet==10 else vallues['11'] if planet==11 else valllues['88'] if period==88 else valllues['225'] if period==225 else valllues['365'] if period==365 else valllues['687'] if period==687 else valllues['1681'] if period==1681 else valllues['4333'] if period==4333 else valllues['10759'] if period==10759 else valllues['30685'] if period==30685 else valllues['60190'] if period==60190 else valllues['90465'] if period==90465 else valllues['204174'] if period==204174 else self.Earth_e)*math.sin(eccentric_anomaly)-mean_anomaly)/(1-((vallues['1'] if planet==1 else vallues['2'] if planet==2 else vallues['3'] if planet==3 else vallues['4'] if planet==4 else vallues['5'] if planet==5 else vallues['6'] if planet==6 else vallues['7'] if planet==7 else vallues['8'] if planet==8 else vallues['9'] if planet==9 else vallues['10'] if planet==10 else vallues['11'] if planet==11 else valllues['88'] if period==88 else valllues['225'] if period==225 else valllues['365'] if period==365 else valllues['687'] if period==687 else valllues['1681'] if period==1681 else valllues['4333'] if period==4333 else valllues['10759'] if period==10759 else valllues['30685'] if period==30685 else valllues['60190'] if period==60190 else valllues['90465'] if period==90465 else valllues['204174'] if period==204174 else self.Earth_e)*math.cos(eccentric_anomaly))))


                    b = (self.Mercury_AU if planet==1 else self.Venus_AU if planet==2 else self.Earth_AU if planet==3 else self.Mars_AU if planet==4 else self.Ceres_AU if planet==5 else self.Jupiter_AU if planet==6 else self.Saturn_AU if planet==7 else self.Uranus_AU if planet==8 else self.Neptune_AU if planet==9 else self.Pluto_AU if planet==10 else self.Eris_AU if planet==11 else self.Mercury_AU if period==88 else self.Venus_AU if period==225 else self.Earth_AU if period==365 else self.Mars_AU if period==687 else self.Ceres_AU if period==1681 else self.Jupiter_AU if period==4333 else self.Saturn_AU if period==10759 else self.Uranus_AU if period==30685 else self.Neptune_AU if period==60190 else self.Pluto_AU if period==90465 else self.Eris_AU if period==204174 else self.Earth_AU)*math.sqrt(1-math.pow(vallues['1'] if planet==1 else vallues['2'] if planet==2 else vallues['3'] if planet==3 else vallues['4'] if planet==4 else vallues['5'] if planet==5 else vallues['6'] if planet==6 else vallues['7'] if planet==7 else vallues['8'] if planet==8 else vallues['9'] if planet==9 else vallues['10'] if planet==10 else vallues['11'] if planet==11 else valllues['88'] if period==88 else valllues['225'] if period==225 else valllues['365'] if period==365 else valllues['687'] if period==687 else valllues['1681'] if period==1681 else valllues['4333'] if period==4333 else valllues['10759'] if period==10759 else valllues['30685'] if period==30685 else valllues['60190'] if period==60190 else valllues['90465'] if period==90465 else valllues['204174'] if period==204174 else self.Earth_e,2))
                    
                    x_coord=(self.Mercury_AU if planet==1 else self.Venus_AU if planet==2 else self.Earth_AU if planet==3 else self.Mars_AU if planet==4 else self.Ceres_AU if planet==5 else self.Jupiter_AU if planet==6 else self.Saturn_AU if planet==7 else self.Uranus_AU if planet==8 else self.Neptune_AU if planet==9 else self.Pluto_AU if planet==10 else self.Eris_AU if planet==11 else self.Mercury_AU if period==88 else self.Venus_AU if period==225 else self.Earth_AU if period==365 else self.Mars_AU if period==687 else self.Ceres_AU if period==1681 else self.Jupiter_AU if period==4333 else self.Saturn_AU if period==10759 else self.Uranus_AU if period==30685 else self.Neptune_AU if period==60190 else self.Pluto_AU if period==90465 else self.Eris_AU if period==204174 else self.Earth_AU)*(math.cos(eccentric_anomaly)-(vallues['1'] if planet==1 else vallues['2'] if planet==2 else vallues['3'] if planet==3 else vallues['4'] if planet==4 else vallues['5'] if planet==5 else vallues['6'] if planet==6 else vallues['7'] if planet==7 else vallues['8'] if planet==8 else vallues['9'] if planet==9 else vallues['10'] if planet==10 else vallues['11'] if planet==11 else valllues['88'] if period==88 else valllues['225'] if period==225 else valllues['365'] if period==365 else valllues['687'] if period==687 else valllues['1681'] if period==1681 else valllues['4333'] if period==4333 else valllues['10759'] if period==10759 else valllues['30685'] if period==30685 else valllues['60190'] if period==60190 else valllues['90465'] if period==90465 else valllues['204174'] if period==204174 else self.Earth_e))

                    y_coord=(b*math.sin(eccentric_anomaly))

                    x_list.append(x_coord)
                    y_list.append(y_coord)
                    M_list.append(mean_anomaly)
                    E_list.append(eccentric_anomaly)

                    #table.add_row(f'{day}',f'{mean_anomaly}',f'{eccentric_anomaly}',f'{x_coord}',f'{y_coord}')

###PRINT BARYCWNTRIC OR HELIOCENTRIC OR ALL INCLUDING THE PERIFOCAL COORDINATES###
                    
                
                
                #vil = [
                 #       {'name':'MERCURY','p':self.Mercury_P*self.earthperiod_s,'MO':self.Mercury_MO,'a':self.Mercury_AU*self.AU_m,'e':self.Mercury_e,'i':math.radians(self.Mercury_i),'w':math.radians(self.Mercury_w),'omega':math.radians(self.Mercury_omega)},
                  #      {'name':'VENUS','p':self.Venus_P*self.earthperiod_s,'MO':self.Venus_MO,'a':self.Venus_AU*self.AU_m,'e':self.Venus_e,'i':math.radians(self.Venus_i),'w':math.radians(self.Venus_w),'omega':math.radians(self.Venus_omega)},
                   #     {'name':'EARTH','p':self.Earth_P*self.earthperiod_s,'MO':self.Earth_MO,'a':self.Earth_AU*self.AU_m,'e':self.Earth_e,'i':math.radians(self.Earth_i),'w':math.radians(self.Earth_w),'omega':math.radians(self.Earth_omega)},
                    #    {'name':'MARS','p':self.Mars_P*self.earthperiod_s,'MO':self.Mars_MO,'a':self.Mars_AU*self.AU_m,'e':self.Mars_e,'i':math.radians(self.Mars_i),'w':math.radians(self.Mars_w),'omega':math.radians(self.Mars_omega)},
                     #   {'name':'CERES','p':self.Ceres_P*self.earthperiod_s,'MO':self.Ceres_MO,'a':self.Ceres_AU*self.AU_m,'e':self.Ceres_e,'i':math.radians(self.Ceres_i),'w':math.radians(self.Ceres_w),'omega':math.radians(self.Ceres_omega)},
                      #  {'name':'JUPITER','p':self.Jupiter_P*self.earthperiod_s,'MO':self.Jupiter_MO,'a':self.Jupiter_AU*self.AU_m,'e':self.Jupiter_e,'i':math.radians(self.Jupiter_i),'w':math.radians(self.Jupiter_w),'omega':math.radians(self.Jupiter_omega)},
                       # {'name':'SATURN','p':self.Saturn_P*self.earthperiod_s,'MO':self.Saturn_MO,'a':self.Saturn_AU*self.AU_m,'e':self.Saturn_e,'i':math.radians(self.Saturn_i),'w':math.radians(self.Saturn_w),'omega':math.radians(self.Saturn_omega)},
                        #{'name':'URANUS','p':self.Uranus_P*self.earthperiod_s,'MO':self.Uranus_MO,'a':self.Uranus_AU*self.AU_m,'e':self.Uranus_e,'i':math.radians(self.Uranus_i),'w':math.radians(self.Uranus_w),'omega':math.radians(self.Uranus_omega)},
                       # {'name':'NEPTUNE','p':self.Neptune_P*self.earthperiod_s,'MO':self.Neptune_MO,'a':self.Neptune_AU*self.AU_m,'e':self.Neptune_e,'i':math.radians(self.Neptune_i),'w':math.radians(self.Neptune_w),'omega':math.radians(self.Neptune_omega)},
                        #{'name':'PLUTO','p':self.Pluto_P*self.earthperiod_s,'MO':self.Pluto_MO,'a':self.Pluto_AU*self.AU_m,'e':self.Pluto_e,'i':math.radians(self.Pluto_i),'w':math.radians(self.Pluto_w),'omega':math.radians(self.Pluto_omega)},
                        #{'name':'ERIS','p':self.Eris_P*self.earthperiod_s,'MO':self.Eris_MO,'a':self.Eris_AU*self.AU_m,'e':self.Eris_e,'i':math.radians(self.Eris_i),'w':math.radians(self.Eris_w),'omega':math.radians(self.Eris_omega)}
                    #]


                X_heliolist = []
                Y_heliolist = []
                Z_heliolist = []

                for idx,x_coord in enumerate(x_list): # both x_list and y_list have the same magnitude

                    X_helio = (x_coord * ((math.cos(vil[index]['omega'])*math.cos(vil[index]['w'])) - (math.sin(vil[index]['omega'])*math.sin(vil[index]['w'])*math.cos(vil[index]['i'])))) - (y_list[idx] * ((math.cos(vil[index]['omega'])*math.sin(vil[index]['w'])) + (math.sin(vil[index]['omega'])*math.cos(vil[index]['w'])*math.cos(vil[index]['i']))))

                    Y_helio = (x_coord * (math.sin(vil[index]['omega'])*math.cos(vil[index]['w']) + (math.cos(vil[index]['omega'])*math.sin(vil[index]['w'])*math.cos(vil[index]['i'])))) + (y_list[idx] * ((math.cos(vil[index]['omega'])*math.cos(vil[index]['w'])*math.cos(vil[index]['i'])) - (math.sin(vil[index]['omega'])*math.sin(vil[index]['w']))))

                    Z_helio = (x_coord * (math.sin(vil[index]['w'])*math.sin(vil[index]['i']))) + (y_list[idx] * (math.cos(vil[index]['w'])*math.sin(vil[index]['i'])))

                    X_heliolist.append(X_helio)
                    Y_heliolist.append(Y_helio)
                    Z_heliolist.append(Z_helio)

                

                #console.print(table)
                #return {'x_list_peri':x_list,'y_list_peri':y_list,'xy_list_size':len(x_list),'M_list':M_list,'E_list':E_list,'X_heliolist':X_heliolist,'Y_heliolist':Y_heliolist,'Z_heliolist':Z_heliolist,'XYZME_list_size':len(X_heliolist),'name':vil[index]['name'],'desc':'gives the heliocentric coirdinates based on days and AU'}


                
                #console.print(f'\n[bold green]time taken by eccentric logic for full coordinates:[/bold green] [bold yellow]{round(time.perf_counter()-start,3)} (seconds)[/bold yellow]\n')
            
                if plx: #period!=-1: #days_elapsed==0:

                    #start = time.perf_counter()

                    '''test logic for circular/eccentric orbits'''
                    ##the whole x,y calculations should be inside this if statement..for code independence. i dont want to print the table if i want to plot on plotext.
# i cam know  the characteristics through the period,planet entered or the x y sizes
                    #x_size = len(x_list)
                    #y_size = len(y_list)
                    #print(x_size,y_size)
            
                    lis_t = [88,225,365,687,1681,4333,10759,30685,60190,90465,204174]
                    #if period not in lis_t and planet==None:
                        #console.print('\n[bold magenta] invalid period! use::\nMercury: 88\nVenus: 225\nEarth: 365\nMars: 687\nCeres: 1681\nJupiter: 4333\nSaturn: 10759\nUranus: 30685\nNeptune: 60190\nPluto: 90465\nEris: 204174[/bold magenta]\n[bold green]Or use the planet number respectively.[/bold green]\n')
                        #sys.exit(0)
            
            
                    #limit_a = ((vaal.get(values[str(planet)] if planet else period))*(1+valllues.get(str(values[str(planet)]) if planet else str(period))))  # a*(1+e) or  .get(....,period)/ .get(....,str(period)) instead of the else.


                    Title=val.get(period if period!=-1 else lis_t[0] if planet==1 else lis_t[1] if planet==2 else lis_t[2] if planet==3 else lis_t[3] if planet==4 else lis_t[4] if planet==5 else lis_t[5] if planet==6 else lis_t[6] if planet==7 else lis_t[7] if planet==8 else lis_t[8] if planet==9 else lis_t[9] if planet==10 else lis_t[10],'NULL ORBIT')

                    pltxt.clf()
                    #pltxt.clear_terminal()
                    width,height=pltxt.terminal_size()
                    pltxt.plotsize(width,height) 
            
            

                    pltxt.scatter([0],[0],marker='🌞') #label='Sun')

                    pltxt.scatter(x_list,y_list,color='white') #marker='*')
                    #pltxt.xlim(-limit_a,limit_a) # the limit for the x axis
                    #pltxt.ylim(-limit_a,limit_a)
                    pltxt.xlabel('..x_axis AU (a)..') # should multiply the x and y values by the corresponding AU of the object.
                    pltxt.ylabel('..y_axis AU (b)..')
                    ##for accurate plotting prevents the circle oebits from looking squashed and an eccentric orbit from looking like a circle
                    pltxt.title(f'{Title} FOR 2D PERIFOCAL COORDINATES')
                    pltxt.theme('dark') 
                    #pltxt.box() # removes the border around the plot
                    #pltxt.show()
 
                    #console.print(f'[bold green]time taken to plot:[/bold green] [bold yellow]{round(time.perf_counter()-start,3)} (seconds)[/bold yellow]\n')

                    return {'x_list_peri':x_list,'y_list_peri':y_list,'xy_list_size':len(x_list),'M_list':M_list,'E_list':E_list,'X_heliolist':X_heliolist,'Y_heliolist':Y_heliolist,'Z_heliolist':Z_heliolist,'XYZME_list_size':len(X_heliolist),'name':vil[index]['name'],'plotxt':pltxt,'desc':'gives the heliocentric coirdinates based on days and AU'}
                else:
                    return {'x_list_peri':x_list,'y_list_peri':y_list,'xy_list_size':len(x_list),'M_list':M_list,'E_list':E_list,'X_heliolist':X_heliolist,'Y_heliolist':Y_heliolist,'Z_heliolist':Z_heliolist,'XYZME_list_size':len(X_heliolist),'name':vil[index]['name'],'desc':'gives the heliocentric coordinates based on days and AU'}





        if animate: # here is where i need to set the x and y limits using the formulae limit = (a*(1+e))*0.5/1.1 for plotting also the plotext.plotsize(width,height) should be here
            pass


    
    def orbits(self,name: str=None,fcdts=None,days: int=None):
        '''calculates the x and y perifocal and X,Y,Z and some osculating elelmts ..there is a separate method for the osculating elelemtnst in the contin child class.... coordinates using seconds'''


        name=name.upper() #even if the user enters mixed caps and lowercase letter, thia handles it.
        console=Console()
        #start = time.perf_counter()

        values = ['MERCURY','VENUS','EARTH','MARS','VESTA','CERES','PALLAS','HYGIEA','JUPITER','SATURN','URANUS','NEPTUNE','PLUTO','HAUMEA','MAKEMAKE','ERIS'] 


        if name not in values:
            console.print('[bold red]NAME NOT LOCALLY RECOGNIZED OR WRONG SPELLING[/bold red]')
            sys.exit(0)

        
        index = 0 if name==values[0] else 1 if name==values[1] else 2 if name==values[2] else 3 if name==values[3] else 4 if name==values[4] else 5 if name==values[5] else 6 if name==values[6] else 7 if name==values[7] else 8 if name==values[8] else 9 if name==values[9] else 10 if name==values[10] else 11 if name==values[11] else 12 if name==values[12] else 13 if name==values[13] else 14 if name==values[14] else 15 if name==values[15] else None         #handled the if else abit
 
        mean_motion=None
        mean_anomaly=None
        eccentric_anomaly=None
        x_coord=None
        y_coord=None
        tim_e=None
        delta_t=None

        u_total = self.u_total()

        #tim_e = time.time()
        #delta_t = tim_e-self.J2000

        if days:
            try:
                days = float(days) #overwrite the existing days...
            except ValueError:
                raise ValueError(f'value passed for days is not supported. days given {days}')

        vallues = [
                {'name':'MERCURY','p':self.Mercury_P*self.earthperiod_s,'MO':self.Mercury_MO,'a':self.Mercury_AU*self.AU_m,'e':self.Mercury_e,'i':math.radians(self.Mercury_i),'w':math.radians(self.Mercury_w),'omega':math.radians(self.Mercury_omega)},
                {'name':'VENUS','p':self.Venus_P*self.earthperiod_s,'MO':self.Venus_MO,'a':self.Venus_AU*self.AU_m,'e':self.Venus_e,'i':math.radians(self.Venus_i),'w':math.radians(self.Venus_w),'omega':math.radians(self.Venus_omega)},
                {'name':'EARTH','p':self.Earth_P*self.earthperiod_s,'MO':self.Earth_MO,'a':self.Earth_AU*self.AU_m,'e':self.Earth_e,'i':math.radians(self.Earth_i),'w':math.radians(self.Earth_w),'omega':math.radians(self.Earth_omega)},
                {'name':'MARS','p':self.Mars_P*self.earthperiod_s,'MO':self.Mars_MO,'a':self.Mars_AU*self.AU_m,'e':self.Mars_e,'i':math.radians(self.Mars_i),'w':math.radians(self.Mars_w),'omega':math.radians(self.Mars_omega)},
                {'name':'VESTA','p':self.Vesta_P*self.earthperiod_s,'MO':self.Vesta_MO,'a':self.Vesta_AU*self.AU_m,'e':self.Vesta_e,'i':math.radians(self.Vesta_i),'w':math.radians(self.Vesta_w),'omega':math.radians(self.Vesta_omega)},
                {'name':'CERES','p':self.Ceres_P*self.earthperiod_s,'MO':self.Ceres_MO,'a':self.Ceres_AU*self.AU_m,'e':self.Ceres_e,'i':math.radians(self.Ceres_i),'w':math.radians(self.Ceres_w),'omega':math.radians(self.Ceres_omega)},
                {'name':'PALLAS','p':self.Pallas_P*self.earthperiod_s,'MO':self.Pallas_MO,'a':self.Pallas_AU*self.AU_m,'e':self.Pallas_e,'i':math.radians(self.Pallas_i),'w':math.radians(self.Pallas_w),'omega':math.radians(self.Pallas_omega)},
                {'name':'HYGIEA','p':self.Hygiea_P*self.earthperiod_s,'MO':self.Hygiea_MO,'a':self.Hygiea_AU*self.AU_m,'e':self.Hygiea_e,'i':math.radians(self.Hygiea_i),'w':math.radians(self.Hygiea_w),'omega':math.radians(self.Hygiea_omega)},
                {'name':'JUPITER','p':self.Jupiter_P*self.earthperiod_s,'MO':self.Jupiter_MO,'a':self.Jupiter_AU*self.AU_m,'e':self.Jupiter_e,'i':math.radians(self.Jupiter_i),'w':math.radians(self.Jupiter_w),'omega':math.radians(self.Jupiter_omega)},
                {'name':'SATURN','p':self.Saturn_P*self.earthperiod_s,'MO':self.Saturn_MO,'a':self.Saturn_AU*self.AU_m,'e':self.Saturn_e,'i':math.radians(self.Saturn_i),'w':math.radians(self.Saturn_w),'omega':math.radians(self.Saturn_omega)},
                {'name':'URANUS','p':self.Uranus_P*self.earthperiod_s,'MO':self.Uranus_MO,'a':self.Uranus_AU*self.AU_m,'e':self.Uranus_e,'i':math.radians(self.Uranus_i),'w':math.radians(self.Uranus_w),'omega':math.radians(self.Uranus_omega)},
                {'name':'NEPTUNE','p':self.Neptune_P*self.earthperiod_s,'MO':self.Neptune_MO,'a':self.Neptune_AU*self.AU_m,'e':self.Neptune_e,'i':math.radians(self.Neptune_i),'w':math.radians(self.Neptune_w),'omega':math.radians(self.Neptune_omega)},
                {'name':'PLUTO','p':self.Pluto_P*self.earthperiod_s,'MO':self.Pluto_MO,'a':self.Pluto_AU*self.AU_m,'e':self.Pluto_e,'i':math.radians(self.Pluto_i),'w':math.radians(self.Pluto_w),'omega':math.radians(self.Pluto_omega)},
                {'name':'HAUMEA','p':self.Haumea_P*self.earthperiod_s,'MO':self.Haumea_MO,'a':self.Haumea_AU*self.AU_m,'e':self.Haumea_e,'i':math.radians(self.Haumea_i),'w':math.radians(self.Haumea_w),'omega':math.radians(self.Haumea_omega)},
                {'name':'MAKEMAKE','p':self.Makemake_P*self.earthperiod_s,'a':self.Makemake_AU*self.AU_m,'MO':self.Makemake_MO,'e':self.Makemake_e,'i':math.radians(self.Makemake_i),'w':math.radians(self.Makemake_w),'omega':math.radians(self.Makemake_omega)},
                {'name':'ERIS','p':self.Eris_P*self.earthperiod_s,'MO':self.Eris_MO,'a':self.Eris_AU*self.AU_m,'e':self.Eris_e,'i':math.radians(self.Eris_i),'w':math.radians(self.Eris_w),'omega':math.radians(self.Eris_omega)}]

        spec_uhelio = [
                {'name':'MERCURY','u':(self.G*(self.MoS_kg+(self.Mercury_mass*self.MoE_kg)))},
                {'name':'VENUS','u':(self.G*(self.MoS_kg+(self.Venus_mass*self.MoE_kg)))},
                {'name':'EARTH','u':(self.G*(self.MoS_kg+self.MoE_kg))},
                {'name':'MARS','u':(self.G*(self.MoS_kg+(self.Mars_mass*self.MoE_kg)))},
                {'name':'VESTA','u':(self.G*(self.MoS_kg+(self.Vesta_mass*self.MoE_kg)))},
                {'name':'CERES','u':(self.G*(self.MoS_kg+(self.Ceres_mass*self.MoE_kg)))},
                {'name':'PALLAS','u':(self.G*(self.MoS_kg+(self.Pallas_mass*self.MoE_kg)))},
                {'name':'HYGIEA','u':(self.G*(self.MoS_kg+(self.Hygiea_mass*self.MoE_kg)))},
                {'name':'JUPITER','u':(self.G*(self.MoS_kg+(self.Jupiter_mass*self.MoE_kg)))},
                {'name':'SATURN','u':(self.G*(self.MoS_kg+(self.Saturn_mass*self.MoE_kg)))},
                {'name':'URANUS','u':(self.G*(self.MoS_kg+(self.Uranus_mass*self.MoE_kg)))},
                {'name':'NEPTUNE','u':(self.G*(self.MoS_kg+(self.Neptune_mass*self.MoE_kg)))},
                {'name':'PLUTO','u':(self.G*(self.MoS_kg+(self.Pluto_mass*self.MoE_kg)))},
                {'name':'HAUMEA','u':(self.G*(self.MoS_kg+(self.Haumea_mass*self.MoE_kg)))},
                {'name':'MAKEMAKE','u':(self.G*(self.MoS_kg+(self.Makemake_mass*self.MoE_kg)))},
                {'name':'ERIS','u':(self.G*(self.MoS_kg+(self.Eris_mass*self.MoE_kg)))},
                ]

        if name and fcdts==None:

            if days:
                seconds = (days*24*60*60)
                tim_ef  = time.time()
                delta_t = (tim_ef + seconds) - self.JD2000
            else:
                tim_e = time.time()
                delta_t = tim_e - self.JD2000
        
            mean_motion = ((2*math.pi)/(vallues[index]['p'])) ##if name==values[0] else vallues[1]['p'] if name==values[1] else vallues[2]['p'] if name==values[2] else vallues[3]['p'] if name==values[3] else vallues[4]['p'] if name==values[4] else vallues[5]['p'] if name==values[5] else valluee[6]['p'] if name==values[6] else vallues[7]['p'] if name==values[7] else vallues[8]['p'] if name==values[8] else vallues[9]['p'] if name==values[9] else vallues[10]['p'] if name==values[10] else vallues[11]['p'] if name==values[11] else vallues[12]['p'] if name==values[12] else vallues[13]['p'] if name==values[13] else vallues[14]['p'] if name==values[14] else vallues[15]['p'] if name==values[15] else vallues[2]['p']))  # mean motion == n rads/sec

            mean_anomaly = ((math.radians(vallues[index]['MO']) + (mean_motion*delta_t))%(2*math.pi))

            #print('mean anomaly M:',mean_anomaly)

            eccentric_anomaly=mean_anomaly

            for _ in range(11):
                '''newton raphson loop'''

                eccentric_anomaly = eccentric_anomaly - ((eccentric_anomaly - (vallues[index]['e']*math.sin(eccentric_anomaly)) - mean_anomaly)/(1 - (vallues[index]['e']*math.cos(eccentric_anomaly))))
       
            #print('eccentric anomaly:',eccentric_anomaly)

            b = vallues[index]['a']*math.sqrt(1 - math.pow(vallues[index]['e'],2))

            x_coord = vallues[index]['a']*(math.cos(eccentric_anomaly) - vallues[index]['e'])
            y_coord = b*math.sin(eccentric_anomaly)
            r_peri = vallues[index]['a']*(1 - (vallues[index]['e']*math.cos(eccentric_anomaly)))

            v_x = (-(math.sqrt((u_total*vallues[index]['a']))/r_peri))*math.sin(eccentric_anomaly)   #the velocity vector vx perifocal coordinate...barycentric
            v_y = ((math.sqrt(((u_total*vallues[index]['a'])*(1 - math.pow(vallues[index]['e'],2))))/r_peri)*math.cos(eccentric_anomaly)) #vy perifocal
            v_xhelio = (-(math.sqrt((spec_uhelio[index]['u']*vallues[index]['a']))/r_peri))*math.sin(eccentric_anomaly)
            v_yhelio = ((math.sqrt(((spec_uhelio[index]['u']*vallues[index]['a'])*(1 - math.pow(vallues[index]['e'],2))))/r_peri)*math.cos(eccentric_anomaly))


            #r_2D = math.sqrt(math.pow(x_coord,2)+math.pow(y_coord,2)) # distance from the sun..current radius in m

            #v_2D = math.sqrt(self.GM_S*((2/r)-(1/(vallues[index]['a']))))#instantenous velocity in m/s

            ####3D COORDINATES LOGIC###


            X = (x_coord * ((math.cos(vallues[index]['omega'])*math.cos(vallues[index]['w'])) - (math.sin(vallues[index]['omega'])*math.sin(vallues[index]['w'])*math.cos(vallues[index]['i'])))) - (y_coord * ((math.cos(vallues[index]['omega'])*math.sin(vallues[index]['w'])) + (math.sin(vallues[index]['omega'])*math.cos(vallues[index]['w'])*math.cos(vallues[index]['i'])))) # applied a rotation matrix using the three angles of rotation

            Y = (x_coord * (math.sin(vallues[index]['omega'])*math.cos(vallues[index]['w']) + (math.cos(vallues[index]['omega'])*math.sin(vallues[index]['w'])*math.cos(vallues[index]['i'])))) + (y_coord * ((math.cos(vallues[index]['omega'])*math.cos(vallues[index]['w'])*math.cos(vallues[index]['i'])) - (math.sin(vallues[index]['omega'])*math.sin(vallues[index]['w']))))  # applied a rotation matrix using the three rotation angles


            Z = (x_coord * (math.sin(vallues[index]['w'])*math.sin(vallues[index]['i']))) + (y_coord * (math.cos(vallues[index]['w'])*math.sin(vallues[index]['i'])))

            v_X = (v_x * ((math.cos(vallues[index]['omega'])*math.cos(vallues[index]['w'])) - (math.sin(vallues[index]['omega'])*math.sin(vallues[index]['w'])*math.cos(vallues[index]['i'])))) - (v_y * ((math.cos(vallues[index]['omega'])*math.sin(vallues[index]['w'])) + (math.sin(vallues[index]['omega'])*math.cos(vallues[index]['w'])*math.cos(vallues[index]['i']))))
            v_Y = (v_x * (math.sin(vallues[index]['omega'])*math.cos(vallues[index]['w']) + (math.cos(vallues[index]['omega'])*math.sin(vallues[index]['w'])*math.cos(vallues[index]['i'])))) + (v_y * ((math.cos(vallues[index]['omega'])*math.cos(vallues[index]['w'])*math.cos(vallues[index]['i'])) - (math.sin(vallues[index]['omega'])*math.sin(vallues[index]['w'])))) #relative to barycenter because u_total
            v_Z = (v_x * (math.sin(vallues[index]['w'])*math.sin(vallues[index]['i']))) + (v_y * (math.cos(vallues[index]['w'])*math.sin(vallues[index]['i'])))

            v_Xhelio =  (v_xhelio * ((math.cos(vallues[index]['omega'])*math.cos(vallues[index]['w'])) - (math.sin(vallues[index]['omega'])*math.sin(vallues[index]['w'])*math.cos(vallues[index]['i'])))) - (v_yhelio * ((math.cos(vallues[index]['omega'])*math.sin(vallues[index]['w'])) + (math.sin(vallues[index]['omega'])*math.cos(vallues[index]['w'])*math.cos(vallues[index]['i']))))
            v_Yhelio = (v_xhelio * (math.sin(vallues[index]['omega'])*math.cos(vallues[index]['w']) + (math.cos(vallues[index]['omega'])*math.sin(vallues[index]['w'])*math.cos(vallues[index]['i'])))) + (v_yhelio * ((math.cos(vallues[index]['omega'])*math.cos(vallues[index]['w'])*math.cos(vallues[index]['i'])) - (math.sin(vallues[index]['omega'])*math.sin(vallues[index]['w']))))
            v_Zhelio = (v_xhelio * (math.sin(vallues[index]['w'])*math.sin(vallues[index]['i']))) + (v_yhelio * (math.cos(vallues[index]['w'])*math.sin(vallues[index]['i'])))

            r = math.sqrt(math.pow(X,2)+math.pow(Y,2)+math.pow(Z,2))  # the current radius from the heliocentric point in meters
            v = math.sqrt(spec_uhelio[index]['u'] * ((2/r)-(1/(vallues[index]['a']))))  # the instantenous velocity in m/s

            v_heliomagn = math.sqrt(math.pow(v_Xhelio,2) + math.pow(v_Yhelio,2) + math.pow(v_Zhelio,2))

            ###BARYCENTRIC SHIFT###

            #X_bary = X_helio + sun_barycentric['X_s'] # barycentric shift included
            #Y_bary = Y_helio + sun_barycentric['Y_s']
            #Z_bary = Z_helio + sun_barycentric['Z_s']

            #r_bary = math.sqrt(math.pow(X,2)+math.pow(Y,2)+math.pow(Z,2))
            #v_bary = math.sqrt(self.GM_S * ((2/r)-(1/(vallues[index]['a']))))
            day_conv = (vallues[index]['p']/self.earthperiod_s)*self.earthperiod_d  # converts tge seconds into days
            day_resp = (mean_anomaly/(math.pi*2))*day_conv  #gets the current day for the celestial object

            ###angular momentum and energy E : cross product of state vectors### and Osculating elemnts
            h_Xhelio = (Y*v_Zhelio) - (Z*v_Yhelio) #heliocentric
            h_Yhelio = (Z*v_Xhelio) - (X*v_Zhelio)
            h_Zhelio = (X*v_Yhelio) - (Y*v_Xhelio)

            #h_X = (Y*v_Z) - (Z*v_Y) 
            #h_Y = (Z*v_X) -(X*v_Z)
            #h_Z = (X*v_Y) - (Y*v_X)

            energy_helio = (math.pow(math.sqrt(math.pow(v_Xhelio,2) + math.pow(v_Yhelio,2) + math.pow(v_Zhelio,2)),2)/2) - (spec_uhelio[index]['u']/r) # energy E heliocentric
            magn_h = math.sqrt(math.pow(h_Xhelio,2) + math.pow(h_Yhelio,2) + math.pow(h_Zhelio,2)) #angular momwntum magnitude

            ### osculating elements###
            osc_a = math.pow(((2/r) - (math.pow(v_heliomagn,2)/self.spec_uhelio(vallues[index]['name']))),-1)
            spec_uhelio = self.spec_uhelio(vallues[index]['name'])
            list_r = [X,Y,Z]
            list_vhelio = [v_Xhelio,v_Yhelio,v_Zhelio]
            vec = Vectors()
            dot_r_v = vec.dot_vect(list_r,list_vhelio)

            e_X = (1/spec_uhelio)*((math.pow(v_heliomagn,2)-(spec_uhelio/r))*X - (dot_r_v*v_Xhelio))    #eccentric vecto
            e_Y = (1/spec_uhelio)*((math.pow(v_heliomagn,2)-(spec_uhelio/r))*Y - (dot_r_v*v_Yhelio))
            e_Z = (1/spec_uhelio)*((math.pow(v_heliomagn,2)-(spec_uhelio/r))*Z - (dot_r_v*v_Zhelio))
            mgn_e = math.sqrt(math.pow(e_X,2) + math.pow(e_Y,2) + math.pow(e_Z,2))   #eccentric osculating element

            osc_i = math.degrees(math.acos(h_Zhelio/magn_h)) % 360
            epsilon = 1e-8
            degr = '°'
            #print(osc_i,mgn_e)
            vectors = Vectors()

            if mgn_e<epsilon and osc_i<epsilon:  #equitorial circular orbit
                q = 'equitorial circular orbit'
                Omega = 0
                argof_perihelion = 0
                true_longitude = math.degrees(math.atan2(Y,X)) % 360
                true_anomaly = true_longitude
                argof_latitude = 0
                longof_periapsis = 0


            elif osc_i<epsilon and epsilon<mgn_e<1:   #equitorial elliptical orbit

                q = 'equitorial elliptical orbit'
                Omega = 0
                argof_perihelion = 0
                longof_periapsis = math.degrees(math.atan2(e_Y,e_X)) % 360
                #argof_perihelion = longofperiapsis
                true_longitude = math.degrees(math.atan2(Y,X)) % 360 #L
                true_anomaly = true_longitude
                argof_latitude = 0


            elif osc_i>epsilon and mgn_e<epsilon: #tilted criscular orbit
                o = 'inclined circular orbit'
                
                list_k = [0,0,1]
                list_h = [h_X,h_Y,h_Z]
                #vectors = Vectors(0,0,1,h_Xhelio,h_Yhelio,h_Zhelio)
                cross_n_vect = vectors.cross_vect(list_k,list_h)
                list_n_vect = [cross_n_vect[0],cross_n_vect[1],cross_n_vect[2]]
                list_r_vect = [X,Y,Z]
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


                ##omega##
                #node_vectX = cross_node_vect[0]
                #node_vectY = cross_node_vect[1]
                #node_vectZ = cross_node_vect[2]

                list_k = [0,0,1]
                list_h = [h_Xhelio,h_Yhelio,h_Zhelio]
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
                list_r = [X,Y,Z]
                dot_e_r = vectors.dot_vect(list_e,list_r)
                magn_e_r = vectors.magn_vect(list_e,list_r)
                true_anomaly = math.degrees(math.acos(dot_e_r/magn_e_r[4])) % 360
                list_v = [v_Xhelio,v_Yhelio,v_Zhelio]
                dot_r_v = vectors.dot_vect(list_r,list_v)
                if dot_r_v < 0: #object falling to perihelion
                    trv = 'climbing to aphelion'
                    true_anomaly = 360 - true_anomaly
                elif dot_r_v >= 0: #object climbing to aphelion
                    trv = 'falling to perihelion'

            #omega = omega



            if name!=values[2]: #to get the x and y coord for earth for d equation to work
                #tim_E = time.time()
                #delta_T = tim_E - self.JD2000  should use the unix_time stamp defined above for accuracy... 

                meanmotion_E = ((2*math.pi)/(vallues[2]['p'])) # for earth
                meananomaly_E = ((math.radians(vallues[2]['MO']) + (meanmotion_E*delta_t))%(2*math.pi))
                eccentanom_E = meananomaly_E

                for _ in range(11):

                    eccentanom_E = eccentanom_E - ((eccentanom_E - (vallues[2]['e']*math.sin(eccentanom_E)) - meananomaly_E)/(1 - (vallues[2]['e']*math.cos(eccentanom_E))))

                b_E = vallues[2]['a']*math.sqrt(1 - math.pow(vallues[2]['e'],2))
                x_coord_E = vallues[2]['a']*(math.cos(eccentanom_E) - vallues[2]['e'])
                y_coord_E = b_E*math.sin(eccentanom_E)


                #d_2D = math.sqrt(math.pow((x_coord-x_coord_E),2) + math.pow((y_coord-y_coord_E),2)) #distance between the 2 bodies in m
                #light_delay_2D = d/self.c_m_s #light delay in second

                ####POLAR COORDINATES LOGIC###

                X_E = (x_coord_E * ((math.cos(vallues[2]['omega'])*math.cos(vallues[2]['w'])) - (math.sin(vallues[2]['omega'])*math.sin(vallues[2]['w'])*math.cos(vallues[2]['i'])))) - (y_coord_E * ((math.cos(vallues[2]['omega'])*math.sin(vallues[2]['w'])) + (math.sin(vallues[2]['omega'])*math.cos(vallues[2]['w'])*math.cos(vallues[2]['i']))))

                Y_E = (x_coord_E * (math.sin(vallues[2]['omega'])*math.cos(vallues[2]['w']) + (math.cos(vallues[2]['omega'])*math.sin(vallues[2]['w'])*math.cos(vallues[2]['i'])))) + (y_coord_E * ((math.cos(vallues[2]['omega'])*math.cos(vallues[2]['w'])*math.cos(vallues[2]['i'])) - (math.sin(vallues[2]['omega'])*math.sin(vallues[2]['w']))))

                Z_E = (x_coord_E * (math.sin(vallues[2]['w'])*math.sin(vallues[2]['i']))) + (y_coord_E * (math.cos(vallues[2]['w'])*math.sin(vallues[2]['i'])))

                d = math.sqrt(math.pow((X-X_E),2) + math.pow((Y-Y_E),2) + math.pow((Z-Z_E),2)) # distance between object 1 and Earth us..
                light_delay = d/self.c_m_s  # light delay in seconds


                #prin_t = f'\n[bold yellow]{vallues[index]['name']}[/bold yellow] [bold green]for Unix time[/bold green] [bold yellow]{tim_e}[/bold yellow] [bold green]its X,Y,Z Coordinates were[/bold green] [bold yellow]({X} , {Y} , {Z})[/bold yellow] [bold green]at a distance of[/bold green] [bold yellow]{d}--(m)-- or {d/1000}--(km)--[/bold yellow] [bold green]from Earth.\nLight delay[/bold green] [bold yellow]{light_delay}--(seconds)-- or {light_delay/60}--(minutes)--[/bold yellow]. [bold green]This means you will see it from earth as it was {light_delay}--(seconds)-- or {light_delay/60}--(minutes)-- ago because it takes light {light_delay}--(seconds)-- or {light_delay/60}--(minutes)-- to reach Earth from {vallues[index]['name']}.\n{vallues[index]['name']} is currently[/bold green] [bold yellow]{r}--(meters)-- or {r/1000}--(km)-- or {r/self.AU_m}--(Astronomical Units AU)--[/bold yellow] [bold green]from the sun.\nIt is currently orbiting the sun with a velocity of[/bold green] [bold yellow]{v}--(m/s)-- or {v/1000}--(km/s)--[/bold yellow].'
                #console.print(prin_t)

                if days:
                    return {'N':vallues[index]['name'],'x_pfcal':x_coord,'y_pfcal':y_coord,'x_E_pfcal':x_coord_E,'y_E_pfcal':y_coord_E,'X_helio':X,'Y_helio':Y,'Z_helio':Z,'M':mean_anomaly,'E':eccentric_anomaly,'b':b,'a':vallues[index]['a'],'currentradius_fromhelio_sun':r,'instantenous_v_helio':v,'X_E_helio':X_E,'Y_E_helio':Y_E,'Z_E_helio':Z_E,'Unix_time':tim_ef,'resp_day':day_resp,'daysaddsub':days,'v_x':v_x,'v_y':v_y,'v_X':v_X,'v_Y':v_Y,'v_Z':v_Z,'v_Xhelio':v_Xhelio,'v_Yhelio':v_Yhelio,'v_Zhelio':v_Zhelio,'v_xhelio':v_xhelio,'v_yhelio':v_yhelio,'r_peri':r_peri,'h':magn_h,'h_Xhelio':h_Xhelio,'h_Yhelio':h_Yhelio,'h_Zhelio':h_Zhelio,'energy_helio':energy_helio,'osc_a':osc_a,'osc_i':osc_i,'e_X':e_X,'e_Y':e_Y,'e_Z':e_Z,'mgn_eccentricity':mgn_e,'Omega':Omega,'argumentof_perihelion':argof_perihelion,'true_anomaly':true_anomaly,'longof_periapsis':longof_periapsis,'argof_latitude':argof_latitude,'true_longitude':true_longitude,'desc':'gives the heliocentric coordinates for future seconds'}
                    

                return {'N':vallues[index]['name'],'x_pfcal':x_coord,'y_pfcal':y_coord,'x_E_pfcal':x_coord_E,'y_E_pfcal':y_coord_E,'X_helio':X,'Y_helio':Y,'Z_helio':Z,'M':mean_anomaly,'E':eccentric_anomaly,'b':b,'a':vallues[index]['a'],'currentradius_fromhelio_sun':r,'instantenous_v_helio':v,'X_E_helio':X_E,'Y_E_helio':Y_E,'Z_E_helio':Z_E,'Unix_time':tim_e,'resp_day':day_resp,'v_x':v_x,'v_y':v_y,'v_X':v_X,'v_Y':v_Y,'v_Z':v_Z,'v_Xhelio':v_Xhelio,'v_Yhelio':v_Yhelio,'v_Zhelio':v_Zhelio,'v_xhelio':v_xhelio,'v_yhelio':v_yhelio,'r_peri':r_peri,'h':magn_h,'h_Xhelio':h_Xhelio,'h_Yhelio':h_Yhelio,'h_Zhelio':h_Zhelio,'energy_helio':energy_helio,'osc_a':osc_a,'osc_i':osc_i,'e_X':e_X,'e_Y':e_Y,'e_Z':e_Z,'mgn_eccentricity':mgn_e,'Omega':Omega,'argumentof_perihelion':argof_perihelion,'true_anomaly':true_anomaly,'longof_periapsis':longof_periapsis,'argof_latitude':argof_latitude,'true_longitude':true_longitude,'desc':'gives the heliocentric coordinates for every second'}


            else:
                #prin_t = f'\n[bold yellow]{vallues[index]['name']}[/bold yellow] [bold green]for Unix time[/bold green] [bold yellow]{tim_e}[/bold yellow] [bold green]its X,Y,Z Coordinates were[/bold green] [bold yellow]({X} , {Y} , {Z})[/bold yellow].\n[bold green]It is currently[/bold green] [bold yellow]{r}--(meters)-- or {r/1000}--(km)-- or {r/self.AU_m}--(Astronomical Units AU)--[/bold yellow] [bold green]from the sun.\nLight delay: {r/self.c_m_s}--(seconds)-- *//* {(r/self.c_m_s)/60}--(minutes)-- from the sun.\nIt is currently orbiting the sun with a velocity of[/bold green] [bold yellow]{v}--(m/s)-- or {v/1000}--(km/s)--[/bold yellow].'
                #console.print(prin_t)
                if days:
                    return {'N':vallues[index]['name'],'x_pfcal':x_coord,'y_pfcal':y_coord,'X_helio':X,'Y_helio':Y,'Z_helio':Z,'M':mean_anomaly,'E':eccentric_anomaly,'b':b,'a':vallues[index]['a'],'currentradius_fromhelio_sun':r,'instantenous_v_helio':v,'Unix_time':tim_ef,'resp_day':day_resp,'daysaddsub':days,'v_x':v_x,'v_y':v_y,'v_X':v_X,'v_Y':v_Y,'v_Z':v_Z,'v_Xhelio':v_Xhelio,'v_Yhelio':v_Yhelio,'v_Zhelio':v_Zhelio,'v_xhelio':v_xhelio,'v_yhelio':v_yhelio,'r_peri':r_peri,'h':magn_h,'h_Xhelio':h_Xhelio,'h_Yhelio':h_Yhelio,'h_Zhelio':h_Zhelio,'energy_helio':energy_helio,'osc_a':osc_a,'osc_i':osc_i,'e_X':e_X,'e_Y':e_Y,'e_Z':e_Z,'mgn_eccentricity':mgn_e,'Omega':Omega,'argumentof_perihelion':argof_perihelion,'true_anomaly':true_anomaly,'longof_periapsis':longof_periapsis,'argof_latitude':argof_latitude,'true_longitude':true_longitude,'desc':'gives the heliocentric coordinates for future seconds'}


                return {'N':vallues[index]['name'],'x_pfcal':x_coord,'y_pfcal':y_coord,'b':b,'M':mean_anomaly,'E':eccentric_anomaly,'X_helio':X,'Y_helio':Y,'Z_helio':Z,'instantenous_v_helio':v,'currentradius_fromhelio_sun':r,'a':vallues[index]['a'],'Unix_time':tim_e,'resp_day':day_resp,'v_x':v_x,'v_y':v_y,'v_X':v_X,'v_Y':v_Y,'v_Z':v_Z,'v_Xhelio':v_Xhelio,'v_Yhelio':v_Yhelio,'v_Zhelio':v_Zhelio,'v_xhelio':v_xhelio,'v_yhelio':v_yhelio,'r_peri':r_peri,'h':magn_h,'h_Xhelio':h_Xhelio,'h_Yhelio':h_Yhelio,'h_Zhelio':h_Zhelio,'energy_helio':energy_helio,'osc_a':osc_a,'osc_i':osc_i,'e_X':e_X,'e_Y':e_Y,'e_Z':e_Z,'mgn_eccentricity':mgn_e,'Omega':Omega,'argumentof_perihelion':argof_perihelion,'true_anomaly':true_anomaly,'longof_periapsis':longof_periapsis,'argof_latitude':argof_latitude,'true_longitude':true_longitude,'desc':'gives the heliocentric coordinates for every second'}

            
####MAYBE YOU WANT THE COORDINATES IN REAL TIME####
   #     if name and lp and fcdts==None:
  #          while True:
 #               try:
#
  #                  tim_e = time.time()
 #                   delta_t = tim_e - self.JD2000
#
   #                 mean_motion = ((2*math.pi)/(vallues[index]['p']))
  #                  mean_anomaly = ((math.radians(vallues[index]['MO']) + (mean_motion*delta_t))%(2*math.pi))
 #                   print('mean anomaly M:',mean_anomaly)
#
    #                eccentric_anomaly = mean_anomaly
   #                 
  #                  for _ in range(11):
 #                       eccentric_anomaly = eccentric_anomaly - ((eccentric_anomaly - (vallues[index]['e']*math.sin(eccentric_anomaly)) - mean_anomaly)/(1 - (vallues[index]['e']*math.cos(eccentric_anomaly))))
#
 #                   print('eccentric anomaly:',eccentric_anomaly)
#
 #                   b = vallues[index]['a']*math.sqrt(1 - math.pow(vallues[index]['e'],2))
  #                  x_coord = vallues[index]['a']*(math.cos(eccentric_anomaly) - vallues[index]['e'])
   #                 y_coord = b*math.sin(eccentric_anomaly)
#
 #                   #r_2D = math.sqrt(math.pow(x_coord,2)+math.pow(y_coord,2)) #distance from the sun in m
  #                  #v_2D = math.sqrt(self.GM_S*((2/r)-(1/(vallues[index]['a'])))) # instantenous velocity
#
 #                   X = (x_coord * ((math.cos(vallues[index]['omega'])*math.cos(vallues[index]['w'])) - (math.sin(vallues[index]['omega'])*math.sin(vallues[index]['w'])*math.cos(vallues[index]['i'])))) - (y_coord * ((math.cos(vallues[index]['omega'])*math.sin(vallues[index]['w'])) + (math.sin(vallues[index]['omega'])*math.cos(vallues[index]['w'])*math.cos(vallues[index]['i'])))) # applied a rotation matrix using the three angles of rotation
#
 #                   Y = (x_coord * (math.sin(vallues[index]['omega'])*math.cos(vallues[index]['w']) + (math.cos(vallues[index]['omega'])*math.sin(vallues[index]['w'])*math.cos(vallues[index]['i'])))) + (y_coord * ((math.cos(vallues[index]['omega'])*math.cos(vallues[index]['w'])*math.cos(vallues[index]['i'])) - (math.sin(vallues[index]['omega'])*math.sin(vallues[index]['w']))))  # applied a rotation matrix using the three rotation angles
#
 #                   Z = (x_coord * (math.sin(vallues[index]['w'])*math.sin(vallues[index]['i']))) + (y_coord * (math.cos(vallues[index]['w'])*math.sin(vallues[index]['i'])))
#
 #                   r = math.sqrt(math.pow(X,2)+math.pow(Y,2)+math.pow(Z,2))  # the current radius from the heliocentric point in meters
  #                  v = math.sqrt(self.GM_S * ((2/r)-(1/(vallues[index]['a']))))  # the instantenous velocity in m/s
#
#
#
 #                   if name!=values[2]: #to get the x and y coord for earth for d equation to work
  #                      #tim_E = time.time()
   #                     #delta_T = tim_E - self.JD2000 # should use the unix time stamp defined above for accuracy
#
 #                       meanmotion_E = ((2*math.pi)/(vallues[2]['p'])) # for earth
  #                      meananomaly_E = ((math.radians(vallues[2]['MO']) + (meanmotion_E*delta_t))%(2*math.pi))
   #                     eccentanom_E = meananomaly_E
#
 #                       for _ in range(11):
               #              '''newton raphson iteration''' 
  #                          eccentanom_E = eccentanom_E - ((eccentanom_E - (vallues[2]['e']*math.sin(eccentanom_E)) - meananomaly_E)/(1 - (vallues[2]['e']*math.cos(eccentanom_E))))
#
 #                       b_E = vallues[2]['a']*math.sqrt(1 - math.pow(vallues[2]['e'],2))
  #                      x_coord_E = vallues[2]['a']*(math.cos(eccentanom_E) - vallues[2]['e'])
   #                     y_coord_E = b_E*math.sin(eccentanom_E)
#
 #                       #d_2D = math.sqrt(math.pow((x_coord-x_coord_E),2) + math.pow((y_coord-y_coord_E),2)) #distance between the 2 bodies in m
  #                      #light_delay_2D = d/self.c_m_s #light delay in seconds
   #                     X_E = (x_coord_E * ((math.cos(vallues[2]['omega'])*math.cos(vallues[2]['w'])) - (math.sin(vallues[2]['omega'])*math.sin(vallues[2]['w'])*math.cos(vallues[2]['i'])))) - (y_coord_E * ((math.cos(vallues[2]['omega'])*math.sin(vallues[2]['w'])) + (math.sin(vallues[2]['omega'])*math.cos(vallues[2]['w'])*math.cos(vallues[2]['i']))))
#
 #                       Y_E = (x_coord_E * (math.sin(vallues[2]['omega'])*math.cos(vallues[2]['w']) + (math.cos(vallues[2]['omega'])*math.sin(vallues[2]['w'])*math.cos(vallues[2]['i'])))) + (y_coord_E * ((math.cos(vallues[2]['omega'])*math.cos(vallues[2]['w'])*math.cos(vallues[2]['i'])) - (math.sin(vallues[2]['omega'])*math.sin(vallues[2]['w']))))
#
 #                       Z_E = (x_coord_E * (math.sin(vallues[2]['w'])*math.sin(vallues[2]['i']))) + (y_coord_E * (math.cos(vallues[2]['w'])*math.sin(vallues[2]['i'])))

  #                      d = math.sqrt(math.pow((X-X_E),2) + math.pow((Y-Y_E),2) + math.pow((Z-Z_E),2)) # distance between object 1 and Earth us..
   #                     light_delay = d/self.c_m_s  # light delay in seconds


    #                    console.print(f'\n[bold yellow]{vallues[index]['name']}[/bold yellow] [bold green]for Unix time[/bold green] [bold yellow]{tim_e}[/bold yellow] [bold green]its X,Y,Z Coordinates:[/bold green] [bold yellow]({X} , {Y} , {Z})[/bold yellow] [bold green]at a current distance of[/bold green] [bold yellow]{d}--(m)-- or {d/1000}--(km)--[/bold yellow] [bold green]from Earth.\nCurrent Light delay:[/bold green] [bold yellow]{light_delay}--(seconds)-- or {light_delay/60}--(minutes)--[/bold yellow]. [bold green]This means you will see it currently from earth as it was {light_delay}--(seconds)-- or {light_delay/60}--(minutes)-- ago because it takes light {light_delay}--(seconds)-- or {light_delay/60}--(minutes)-- to reach Earth from {vallues[index]['name']}.\n{vallues[index]['name']} is currently[/bold green] [bold yellow]{r}--(meters)-- or {r/1000}--(km)-- or {r/self.AU_m}--(Astronomical Units AU)--[/bold yellow] [bold green]from the sun.\nCurrent Orbital velocity:[/bold green] [bold yellow]{v}--(m/s)-- or {v/1000}--(km/s)--[/bold yellow].\n\n')
#
                    #else:
 #                       console.print(f'\n[bold yellow]{vallues[index]['name']}[/bold yellow] [bold green]for Unix time[/bold green] [bold yellow]{tim_e}[/bold yellow] [bold green]its X,Y,Z Coordinates[/bold green] [bold yellow]({X} , {Y} , {Z})[/bold yellow].\n[bold green]It is currently[/bold green] [bold yellow]{r}--(meters)-- or {r/1000}--(km)-- or {r/self.AU_m}--(Astronomical Units AU)--[/bold yellow] [bold green]from the sun.\nLight delay: {r/self.c_m_s}--(seconds)-- *//* {(r/self.c_m_s)/60}--(minutes)-- from the sun.\nCurrent Orbital velocity:[/bold green] [bold yellow]{v}--(m/s)-- or {v/1000}--(km/s)--[/bold yellow].\n')

                    #console.print(f'\n[bold yellow]{vallues[index]['name']} For Unix time {tim_e} x_y coord:\n({x_coord} , {y_coord})[/bold yellow]\n')
                    #time.sleep(1)

                #except KeyboardInterrupt:
                 #   console.print('[bold red]KEYBOARD INTERRUPT[/bold red]')
                  #  sys.exit(0)



###MAYBE YOU WANT THE FULL TABLE OF COORDINATES###
        if name and fcdts: #will take very long periods to finish
            #Numpy haaaa..
            '''prints the full coordinates to the terminal'''

            Title = vallues[index]['name']
            

            mean_motion = (2*math.pi)/(vallues[index]['p'])
            table = Table(title=f'{vallues[index]['name']} COORDINATES..SECONDS..')

            table.add_column('seconds',style='Cyan')
            table.add_column('M\nmean anomaly',style='magenta')
            table.add_column('E\neccentric anomaly',style='Cyan')
            table.add_column('x\ncoordinates',style='magenta')
            table.add_column('y\ncoordinates',style='Cyan')

            x_list = []
            y_list = []
            z_list = []
            M_list = []
            E_list = []
            x_AUlist = []
            y_AUlist = []


            for second in range(int(vallues[index]['p'])):
            
                mean_anomaly = ((vallues[index]['MO'] + (mean_motion*second))%(2*math.pi))

                eccentric_anomaly = mean_anomaly
                for _ in range(11):
                    eccentric_anomaly = eccentric_anomaly - ((eccentric_anomaly - (vallues[index]['e']*math.sin(eccentric_anomaly)) - mean_anomaly)/(1 - (vallues[index]['e']*math.cos(eccentric_anomaly))))
            
                b = vallues[index]['a']*math.sqrt(1 - math.pow(vallues[index]['e'],2))
                x_coord = vallues[index]['a']*(math.cos(eccentric_anomaly) - vallues[index]['e'])
                y_coord = b*math.sin(eccentric_anomaly)
                x_list.append(x_coord)
                y_list.append(y_coord)
                M_list.append(mean_anomaly)
                E_list.append(eccentric_anomaly)

            #converts m to Au
            for idx,x_coord in enumerate(x_list):
                x_AUlist.append(x_coord/self.AU_m)
                y_AUlist.append(y_list[idx]/self.AU_m)


            ##anmting##using 2D perifocal values
            pltxt.clf()
            width,height = pltxt.terminal_size()
            pltxt.plotsize(width,height)

            pltxt.scatter([0],[0],marker='🌞')
            pltxt.scatter(x_AUlist,y_AUlist,color='white') ##in meters
            pltxt.xlabel('x axis AU')
            pltxt.ylabel('y axis AU')
            pltxt.title(f'{Title} FOR 2D PERIFOCAL SECONDS.')
            pltxt.theme('dark')


                #table.add_row(f'{second}',f'{mean_anomaly}',f'{eccentric_anomaly}',f'{x_coord}',f'{y_coord}')
                #console.print(table)

            X_heliolist = []
            Y_heliolist = []
            Z_heliolist = []
            X_AUheliolist = []
            Y_AUheliolist = []
            Z_AUheliolist = []

            for idx,x_coord in enumerate(x_list):
                X_helio_ = (x_coord * ((math.cos(vallues[index]['omega'])*math.cos(vallues[index]['w'])) - (math.sin(vallues[index]['omega'])*math.sin(vallues[index]['w'])*math.cos(vallues[index]['i'])))) - (y_list[idx] * ((math.cos(vallues[index]['omega'])*math.sin(vallues[index]['w'])) + (math.sin(vallues[index]['omega'])*math.cos(vallues[index]['w'])*math.cos(vallues[index]['i']))))

                Y_helio_ = (x_coord * (math.sin(vallues[index]['omega'])*math.cos(vallues[index]['w']) + (math.cos(vallues[index]['omega'])*math.sin(vallues[index]['w'])*math.cos(vallues[index]['i'])))) + (y_list[idx] * ((math.cos(vallues[index]['omega'])*math.cos(vallues[index]['w'])*math.cos(vallues[index]['i'])) - (math.sin(vallues[index]['omega'])*math.sin(vallues[index]['w']))))

                Z_helio_ = (x_coord * (math.sin(vallues[index]['w'])*math.sin(vallues[index]['i']))) + (y_list[idx] * (math.cos(vallues[index]['w'])*math.sin(vallues[index]['i'])))
                X_heliolist.append(X_helio_)
                Y_heliolist.append(Y_helio_)
                Z_heliolist.append(Z_helio_) #rotate with the live osc elements

            for idx,x_coord in enumerate(X_heliolist):
                X_AUheliolist.append(x_coord/self.AU_m)
                Y_AUheliolist.append(Y_heliolist[idx]/self.AU_m)
                Z_AUheliolist.append(Z_heliolist[idx]/self.AU_m)


            return {'N':vallues[index]['name'],'x_list_peri':x_list,'y_list_peri':y_list,'X_helio_list':X_heliolist,'Y_helio_list':Y_heliolist,'Z_helio_list':Z_heliolist,'X_AUheliolist':X_AUheliolist,'Y_AUheliolist':Y_AUheliolist,'Z_AUheliolist':Z_AUheliolist,'pltxt':pltxt,'desc':'gives the heliocentric coordinates for the full period as lists in seconds'}



            #console.print(f'\n[bold green]time taken by seconds¦eccentric logic for full coordinates:[/bold green] [bold yellow]{round(time.perf_counter()-start,3)} (seconds)[/bold yellow]\n')




#######  WHAT IF YOU REMOVED THE PERIOD AND PLANET ENFORCERS #######


    def eccent(self,r_a: float=1,r_p: float=1,tble=None):
        ''' eccentricity is a measure of how much an orbit deviates from being a perfect circle'''
        console=Console()
        
        ecc = ((r_a-r_p)/(r_a+r_p)) #calculating the eccentricity using the apsides...

        if ecc==0:
            console.print('\n[bold yellow]Perfect circle[/bold yellow]\n')
        elif 0<ecc<1:
            console.print('\n[bold yellow]Ellipse (bound orbit)[/bold yellow]\n')
        elif ecc==1:
            console.print('\n[bold yellow]Parabola (escape orbit)[/bold yellow]\n')
        elif ecc>1:
            console.print('\n[bold yellow]Hyperbola (unbound orbit)[/bold yellow]\n')

        major_axis = (r_a+r_p)
        semi_major_axis = (major_axis/2) if major_axis else ((r_a+r_p)/2)



        if tble:
            table=Table(title='...SOLAR SYSTEM...')

            table.add_column('Object',style='Cyan')
            table.add_column('Perihelion\n*rp**AU*',style='magenta')
            table.add_column('Aphelion\n*ra**AU*',style='Cyan')
            table.add_column('Semi-major axis\n*AU*',style='magenta')
            table.add_column('Orbital\neccentricity',style='Cyan')
            table.add_column('M at\nJ2000',style='magenta') #mean anomaly MO at J2000

# use f strings becaues the add_row method only wants strings.

            table.add_row('Mercury',f'{self.Mercury_rP}',f'{self.Mercury_rA}',f'{self.Mercury_AU}',f'{self.Mercury_e}',f'{self.Mercury_MO}')
            table.add_row('Venus',f'{self.Venus_rP}',f'{self.Venus_rA}',f'{self.Venus_AU}',f'{self.Venus_e}',f'{self.Venus_MO}')
            table.add_row('Earth',f'{self.Earth_rP}',f'{self.Earth_rA}',f'{self.Earth_AU}',f'{self.Earth_e}',f'{self.Earth_MO}')
            table.add_row('Mars',f'{self.Mars_rP}',f'{self.Mars_rA}',f'{self.Mars_AU}',f'{self.Mars_e}',f'{self.Mars_MO}')
            table.add_row('Vesta',None,None,f'{self.Vesta_AU}',f'{self.Vesta_e}',f'{self.Vesta_MO}')
            table.add_row('Ceres',f'{self.Ceres_rP}',f'{self.Ceres_rA}',f'{self.Ceres_AU}',f'{self.Ceres_e}',f'{self.Ceres_MO}')
            table.add_row('Pallas',None,None,f'{self.Pallas_AU}',f'{self.Pallas_e}',f'{self.Pallas_MO}')
            table.add_row('Hygiea',None,None,f'{self.Hygiea_AU}',f'{self.Hygiea_e}',f'{self.Hygiea_MO}')
            table.add_row('Jupiter',f'{self.Jupiter_rP}',f'{self.Jupiter_rA}',f'{self.Jupiter_AU}',f'{self.Jupiter_e}',f'{self.Jupiter_MO}')
            table.add_row('Saturn',f'{self.Saturn_rP}',f'{self.Saturn_rA}',f'{self.Saturn_AU}',f'{self.Saturn_e}',f'{self.Saturn_MO}')
            table.add_row('Uranus',f'{self.Uranus_rP}',f'{self.Uranus_rA}',f'{self.Uranus_AU}',f'{self.Uranus_e}',f'{self.Uranus_MO}')
            table.add_row('Neptune',f'{self.Neptune_rP}',f'{self.Neptune_rA}',f'{self.Neptune_AU}',f'{self.Neptune_e}',f'{self.Neptune_MO}')
            table.add_row('Pluto',f'{self.Pluto_rP}',f'{self.Pluto_rA}',f'{self.Pluto_AU}',f'{self.Pluto_e}',f'{self.Pluto_MO}')
            table.add_row('Haumea',f'{self.Haumea_rP}',f'{self.Haumea_rA}',f'{self.Haumea_AU}',f'{self.Haumea_e}',f'{self.Haumea_MO}')
            table.add_row('Makemake',f'{self.Makemake_rP}',f'{self.Makemake_rA}',f'{self.Makemake_AU}',f'{self.Makemake_e}',f'{self.Makemake_MO}')
            table.add_row('Eris',f'{self.Eris_rP}',f'{self.Eris_rA}',f'{self.Eris_AU}',f'{self.Eris_e}',f'{self.Eris_MO}')
            console.print(table)
            print()
            console.print(f'[bold green]\n..Average distance of Earth from sun: {self.AU_m} (m)[/bold green]')
            



        print(f'\neccentricity: {round(ecc,3)}\nMajor axis: {round(major_axis,3)}\nSemi major axis: {round(semi_major_axis,3)}\n')


        #print('listing of function arguments respectively:\n(harmonic fxn): 1.velocity 2.distance btwn the two objects/masses 3.mass 4.Mass')


    



#@click.group()
##@click.option(help='in some calculations, only one mass is required.you can use either of the --mass/--Mass options.In other calculations both the masses are required therefore use the two options --mass/--Mass respectively')
#@click.option('--tble',default=None,help='if not None, a table containing values of the solar system will be printed to the console')
#@click.version_option(version=f'2.9.2 ..astlo Astrophysics Engine/calculator..\ndeveloper: @iamnothimbutwe/me on github. 2026\nemail = {email}')
#@click.pass_context
#def term(ctx,tble):
 #   ctx.obj=Astro(tble)

#@term.command()
#@click.option('--velocity',default=1,help='the velocity of the object in space. Use the SI unit m/s',type=float)
#@click.option('--distance',default=1,help='the distance between the two objects in space. Use the SI unit m',type=float)
#@click.option('--mass',default=1,help='the Mass of the smaller mass. Use the SI unit kg',type=float)
#@click.option('--ass',default=1,help='the Mass of the larger mass. Use the SI unit kg',type=float)
#@click.option('--o_p',default=1,help='the orbital period of the planet if known.',type=float)
#@click.pass_obj
#def harmonic(astro,velocity,distance,mass,ass,o_p):
#    astro.harmonic(velocity,distance,mass,ass,o_p)


#@term.command()
#@click.option('--r_a',default=1,help='apside value (aphelion) which is the maximum distance from the sun',type=float)
#@click.option('--r_p',default=1,help='apside value (perihelion) which is the minimum distance from the sun',type=float)
#@click.option('--tble',default=None,help='if not None, a table containing values of the solar system will be printed to the console')
#@click.pass_obj
#def eccent(astro,r_a,r_p,tble):
 #   astro.eccent(r_a,r_p,tble)
  #  if tble:
   #     astro.tebl()


#@term.command()
#@click.option('--k_e',default=1,help='kinetic energy value',type=float)
#@click.option('--p_e',default=1,help='potential energy value',type=float)
#@click.option('--distance',default=1,help='distance between the two object or masses. Mostly the sun and the orbiting object a in AU',type=float)
#@click.option('--mass',default=1,help='the mass of the smaller mass',type=float)
#@click.option('--ass',default=1,help='the mass of the larger Mass',type=float)
#@click.option('--tble',default=None,help='if not None, a table containing values will be printed to the console')
#@click.pass_obj
#def energy(astro,k_e,p_e,mass,ass,distance,tble):
 #   astro.energy(k_e,p_e,mass,ass,distance,tble)
  #  if tble:
   #     astro.tebl()


#@term.command()
#@click.option('--proper_time',default=1,help='for the stationary object at or near the surface of the mass',type=float)
#@click.option('--coordinate_time',default=1,help='for the distant stationary object where space time is flat',type=float)
#@click.option('--mass',default=1,help='the mass of the Mass',type=float)
#@click.option('--distance',default=1,help='the distance from the center of the Mass to the stationary object at or near the surface of the mass',type=float)
#@click.pass_obj
#def timee(astro,mass,distance,coordinate_time,proper_time):
 #   astro.timee(mass,distance,coordinate_time,proper_time)


#@term.command()
#@click.option('--parallax',default=1,help='the value of the parallax angle',type=float)
#@click.option('--distance',default=1,help='the distance in meters if it is the only value available',type=float)
#@click.option('--light_years',default=1,help='the value of light years if it is the only value available',type=float)
#@click.pass_obj
#def distance(astro,parallax,distance,light_years):
 #   astro.distance(parallax,distance,light_years)


#@term.command()
#@click.option('--days_elapsed',default=0,help='the number of days elapsed since the epoch',type=int)
#@click.option('--period',default=-1,help='the period in days for the planet. Use int as the number type',type=int)
#@click.option('--planet',default=None,help='the object value 1 for Mercury\n2 for Venus\n3 for Earth\n4 for Mars\n5 for Ceres \n6 for Jupiter\n7 for Saturn\n8 for Uranus\n9 for Neptune\n10 for Pluto\n11 for Eris.',type=int)
#@click.option('--eccentric',default=None,help='giving a value to this will activate eccentric orbits')
#@click.option('--plx',default=None,help='giving a value to this will activate plotting directly on the terminal')
#@click.pass_obj
#def orbit(astro,days_elapsed,period,planet,eccentric,plx):
 #   astro.orbit(days_elapsed,period,planet,eccentric,plx)

#@term.command()
#@click.option('--plx',default=None,help='giving a value to this will activate plotting directly on the terminal')
#@click.option('--fcdts',default=None,help='giving a value to this will print a table on the terminal')
#@click.option('--name','-n',default=None,help='the name of the object. currently supports 16 objects in the solar sytem.',type=str)
#@click.option('--lp','-lp',default=None,help='if you want to get the coordinates in real time')
#@click.pass_obj
#def orbits(astro,plx,fcdts,name,lp):
 #   astro.orbits(name,plx,fcdts,lp)


#def main():
    #term()

#if __name__ == '__main__':
 #   main()
    
