

# ---------------------------------------------------------
# Copyright (c) 2026 Mark. All rights reserved.
# Unauthorized copying of this file, via any medium, is
# strictly prohibited. developed by Mark Macharia [iamnothimbutwe] on Github.
# ---------------------------------------------------------

import plotext as plt
from .contin import Contin
from .astlo import Astro
from rich.console import Console
import time
import math

console=Console()
contin=Contin()




class Solexp(Contin):
    '''random experiments conserning the solar system'''

    def __init__(self):
        super().__init__()
        #console.print('[bold cyan]The Solar system experiments[/bold cyan]')
        #time.sleep(1)

    def energy_visual(self):
        '''the energy experiment. checks if energy is affected by gravitational field strength'''

        values = ['MERCURY','VENUS','EARTH','MARS','VESTA','CERES','PALLAS','HYGIEA','JUPITER','SATURN','URANUS','NEPTUNE','PLUTO','HAUMEA','MAKEMAKE','ERIS']

        energy_lst = [] #energy is in negatuve trying abs
        r_helio = []
        
        for _ in values:
            retu = contin.barycentric(_)
            energy_lst.append(retu['energyhelio'])
            r_helio.append(retu['r_helio']/contin.AU_m)

        plt.clf()
        width,height = plt.terminal_size()
        plt.plotsize(width,height)
        plt.plot(r_helio,energy_lst,color='white')
        plt.scatter(r_helio,energy_lst,color='yellow',marker='x')
        plt.xlabel('distance AU')
        plt.ylabel('specific Energy in m^2/s^2.')
        plt.title('Energy m^2/s^2 against Distance in AU from the heliocenter')
        plt.theme('dark')
        plt.show()


    def velocity_visual(self):
        '''plots the velocity against distance in AU from. the sun Heliocenter.'''

        values = ['MERCURY','VENUS','EARTH','MARS','VESTA','CERES','PALLAS','HYGIEA','JUPITER','SATURN','URANUS','NEPTUNE','PLUTO','HAUMEA','MAKEMAKE','ERIS']

        velohelio = []
        r_helio = []



        for _ in values:

            retu = contin.barycentric(_)
            velohelio.append(retu['v_helio']/1000)
            r_helio.append(retu['r_helio']/contin.AU_m)

        plt.clf()
        width,height = plt.terminal_size()
        plt.plotsize(width,height)
        plt.plot(r_helio,velohelio,color='white')
        plt.scatter(r_helio,velohelio,color='red',marker='x')
        plt.xlabel('Distance in AU from the sun/Heliocentric')
        plt.ylabel('orbital heliocentric velocity in km/s')
        plt.title('real time velocity km/s against Distance in AU from the Heliocenter [sun]')
        plt.theme('dark')
        plt.show()


    def inclination_visual(self):
        '''plots real time osculating element i against Distance from the Heliocenter'''

        values = ['MERCURY','VENUS','EARTH','MARS','VESTA','CERES','PALLAS','HYGIEA','JUPITER','SATURN','URANUS','NEPTUNE','PLUTO','HAUMEA','MAKEMAKE','ERIS']

        inclinhelio = []
        r_helio = []


        for _ in values:

            retu = contin.barycentric(_)
            inclinhelio.append(retu['osc_ihelio']) #is in degrees
            r_helio.append(retu['r_helio']/contin.AU_m)


        plt.clf()
        width,height = plt.terminal_size()
        plt.plotsize(width,height)
        plt.plot(r_helio,inclinhelio,color='white')
        plt.scatter(r_helio,inclinhelio,color='cyan',marker='x') #uses the final unix time in the values list...🫥...label how??
        plt.xlabel('Heliocentric Distance in AU')
        plt.ylabel('real time heliocentric inclination')
        plt.title('osculating element i [inclination in degrees] against Distance from the Heliocenter')
        plt.theme('dark')
        plt.show()




    def angular_momentum_visual(self):
        '''visualizes how angular momentum vhanges with an increase jn the distance from the heliocenter'''

        values = ['MERCURY','VENUS','EARTH','MARS','VESTA','CERES','PALLAS','HYGIEA','JUPITER','SATURN','URANUS','NEPTUNE','PLUTO','HAUMEA','MAKEMAKE','ERIS']

        angular_momentum = []
        r_helio = []
        km_squared = math.pow(1000,2)

        for _ in values:

            retu = contin.barycentric(_)
            angular_momentum.append(retu['h_helio']/km_squared) #use km^2/s
            r_helio.append(retu['r_helio']/contin.AU_m)


        plt.clf()
        width,height = plt.terminal_size()
        plt.plotsize(width,height)
        plt.plot(r_helio,angular_momentum,color='white')
        plt.scatter(r_helio,angular_momentum,color='cyan',marker='x')

        plt.xlabel('Heliocentric Distance in AU')
        plt.ylabel('specific Heliocentric Angular momentum')
        plt.title('specific Angular momentum [km^2/s] against Distance in AU from the Heliocenter')
        plt.theme('dark')
        plt.show()


    def true_anomaly_visual(self):
        '''visualizes the current true anomaly in degrees states of the solar system bodies. from this method you can easily know which planet is approaching periehlion and which one aphelion. some will update fast and some will seem to never update'''

        values = ['MERCURY','VENUS','EARTH','MARS','VESTA','CERES','PALLAS','HYGIEA','JUPITER','SATURN','URANUS','NEPTUNE','PLUTO','HAUMEA','MAKEMAKE','ERIS']
        vallues = {'MERCURY':'m','VENUS':'V','EARTH':'E','MARS':'M','VESTA':'v','CERES':'c','PALLAS':'p','HYGIEA':'H','JUPITER':'j','SATURN':'s','URANUS':'u','NEPTUNE':'n','PLUTO':'P','HAUMEA':'h','MAKEMAKE':'m','ERIS':'e'} #the marker dictionary

        vallues_c = {'MERCURY':'darkgrey','VENUS':'yellow','EARTH':'blue','MARS':'darkred','VESTA':'red','CERES':'red','PALLAS':'red','HYGIEA':'red','JUPITER':'green','SATURN':'magenta','URANUS':'lightblue','NEPTUNE':'darkblue','PLUTO':'red','HAUMEA':'red','MAKEMAKE':'red','ERIS':'magenta'} #color dictionary
    


        true_anomaly = []
        r_helio = []

        for _ in values:

            retu = contin.barycentric(_)
            true_anomaly.append(retu['true_anomalyhelio']) #is in degrees
            r_helio.append(retu['r_helio']/contin.AU_m)

        plt.clf()
        width,height = plt.terminal_size()
        plt.plotsize(width,height)
        plt.plot(r_helio,true_anomaly,color='white')
        
        for _ in values:
            retur = contin.barycentric(_)
            plt.scatter([retur['r_helio']/contin.AU_m],[retur['true_anomalyhelio']],color=vallues_c.get(_,'ERROR'),marker=vallues.get(_,'ERROR'),label=retur['name']) ##add labels for visibility

        plt.xlabel('Heliocentric Distance in AU')
        plt.ylabel('real time Heliocentric true anomaly in degrees')
        plt.title(f'real-time Heliocentric true anomaly states against Distance from the Heliocenter Unix time: {retur['Unix_time']}//{time.asctime()}') #used retur becuse its the later
        plt.theme('dark')
        plt.show()
            


###add labels to the other methods..








            


