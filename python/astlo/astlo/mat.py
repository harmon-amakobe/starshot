##matplotlib and numpy##

import matplotlib
from rich.console import Console

console=Console()

#matplotlib.use('TkAgg')

try:
    matplotlib.use('TkAgg')
    console.print('[bold Cyan]Using TkAgg backend.[/bold Cyan]')
except ImportError:
    # If TkAgg fails, let Matplotlib pick the best available backend automatically
    console.print('[bold red]Warning: Tkinter not found. Falling back to default backend.[/bold red]')
    pass 

#import matplotlib.pyplot as plt

from .astlo import Astro
from .contin import Contin
from .vect import Vectors
from rich.console import Console
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.ticker import StrMethodFormatter
import time
import plotext as pl
import json

##matplotlib uses specific geometric markers not like plotext##


astro = Astro()
contin = Contin()
vectors = Vectors()
#console = Console()


class Mat:
    def __init__(self):
        self.mission = 'to make astrophysiscs and the universe available to anyone with just a phone or a terminal without needing heavy libraries or the internet.'
        self.working = 'uses the TkAgg X-11 friendly backend'

    def matpt(self,name: str=None,baryc=None):
        '''the 3D projections..orbit supported 11 objects plotting. i will update'''

        if name==None:
            console.print('[bold red]NAME CANNOT BE NONE OR EMPTY[/bold red]')
            return ##IDE friendly..
        name = name.upper()

        vallues = {'MERCURY':88,'VENUS':225,'EARTH':365,'MARS':687,'CERES':1681,'JUPITER':4333,'SATURN':10759,'URANUS':30685,'NEPTUNE':60190,'PLUTO':90465,'ERIS':204174}

        if name not in vallues.keys():
            console.print('[bold red]NAME NOT LOCALLY RECOGNIZED FOR VISUALIZATIONS OR WRONG SPELLING\nSUPPORTS PLOTTING 11 OBJECTS AS OF NOW[/bold red]')
            return

        vallues_1 = {'MERCURY':'red','VENUS':'yellow','EARTH':'blue','MARS':'red','CERES':'grey','JUPITER':'grey','SATURN':'grey','URANUS':'cyan','NEPTUNE':'blue','PLUTO':'grey','ERIS':'red','HAUMEA':'grey','MAKEMAKE':'grey','HYGIEA':'grey','VESTA':'grey','PALLAS':'grey'} #mat uses specific geometric markers use the colors in the dictionary

        if baryc:
            pass


        #ret = astro.orbit(0,vallues.get(name,-2),None,'y')
        ret = contin.reel(name) # heliocentric frame
        reti = contin.barycentric(name)
        tro = astro.orbit(0,int(vallues.get(name,'ERROR')),None,'y')


        py_list = []
        for _,idx in enumerate(ret['X_helioAU']):
            g = [idx,ret['Y_helioAU'][_],ret['Z_helioAU'][_]]
            py_list.append(g)

        array_np = np.array(py_list)
        X = array_np[:,0] #all rows first column
        Y = array_np[:,1] #second volumn
        Z = array_np[:,2]

        fig = plt.figure(figsize=(10,10))
        ax = fig.add_subplot(projection='3d') #maybe the 111 was kinda makingit render one small box square quadrant

        ax.plot(tro['x_list_peri'],tro['y_list_peri'],color='cyan',alpha=0.4,linewidth=0.7,label='2D orbit')


        ##plot##
        ax.plot(X,Y,Z,color='magenta',label=name,linewidth=1.2)
        ax.scatter([0],[0],[0],s=300,marker='o',color='yellow',label='sun') #the heliocenter..heliocentric frame plotting
        ax.scatter([reti['X_helio']/contin.AU_m],[reti['Y_helio']/contin.AU_m],[reti['Z_helio']/contin.AU_m],s=100,marker='o',color=vallues_1.get(name,'ERROR'))

        ax.set_facecolor('darkgrey')
        fig.patch.set_facecolor('darkgrey')

        #hide the grey grid lines
        ax.xaxis.pane.fill = False
        ax.yaxis.pane.fill = False
        ax.zaxis.pane.fill = False #obviously if not fals then default is true .?..maybe

        #the numbers to be int,float with how many decimal places.
        au_f = StrMethodFormatter('{x:.2f}AU')
        ax.xaxis.set_major_formatter(au_f)
        ax.yaxis.set_major_formatter(au_f)
        ax.zaxis.set_major_formatter(au_f)


        ##tick labels the numbers formatter##
        ax.tick_params(axis='x',color='white')
        ax.tick_params(axis='y',color='white')
        ax.tick_params(axis='z',color='white')

        ax.set_xlabel('x_AU',color='magenta')
        ax.set_ylabel('y_AU',color='magenta')
        ax.set_zlabel('z_AU',color='magenta')
        ax.set_box_aspect([1,1,1])
        ax.set_title(f'{name}-Unix time: {reti['Unix_time']}//{time.asctime().replace(':','t')} Heliocentric',color='green')

        #save file

        output_save = f'{name}-Unix time: {reti['Unix_time']} or {time.asctime().replace(':','t')} Heliocentric.png'
        plt.savefig(output_save,facecolor=fig.get_facecolor(),dpi=300)

        console.print(f'\n[bold Cyan]3D visualization rendered to {output_save} [/bold Cyan]\n')

        return plt


        #plt.show() # save the image instead of the mainloop to show one state.


    def fulplot(self,jview=None,inview=None):
        '''plots all of the orbits in one instance'''

        vallues = {'MERCURY':88,'VENUS':225,'EARTH':365,'MARS':687,'CERES':1681,'JUPITER':4333,'SATURN':10759,'URANUS':30685,'NEPTUNE':60190,'PLUTO':90465,'ERIS':204174}

        flx_list = []
        fly_list = []
        flz_list = [] #ill only append the live orbital plots and live positions
        psx_list = []
        psy_list = []
        psz_list = []
        fl_listx = []
        fl_listy = []
        fl_listz = []

        fl_ps = []

        #tro = astro.orbit(0,int(vallues.get('ERIS','ERROR')),None,'y')



        for _ in vallues.keys():
            reel = contin.reel(_) #heliocentric
            ps = contin.barycentric(_)
            flx_list.append(reel['X_helioAU'])
            fly_list.append(reel['Y_helioAU'])
            flz_list.append(reel['Z_helioAU'])
            psx_list.append(ps['X_helio'])
            psy_list.append(ps['Y_helio'])
            psz_list.append(ps['Z_helio'])

        


        ##Numpy and matplotlib##

        for _,idx in enumerate(flx_list): #the array has a shape of 11, big number maybe😑..
            array_npfx = np.array(idx)
            array_npfy = np.array(fly_list[_])
            array_npfz = np.array(flz_list[_]) #maybe this part wasnt needed the sho7ld have just turned the raw python list into an array instead of the for iteration

            fl_listx.append(array_npfx)
            fl_listy.append(array_npfy)
            fl_listz.append(array_npfz)

        px = np.array(psx_list)
        py = np.array(psy_list)
        pz = np.array(psz_list)



        fig = plt.figure(figsize=(10,10))
        ax = fig.add_subplot(projection='3d')

            

        #ax.plot(tro['x_list_peri'],tro['y_list_peri'],color='cyan',alpha=0.4,linewidth=0.7,label='2D ORBIT')
        ax.scatter([0],[0],[0],s=400,color='yellow',marker='o',label='sun')

        vallues_1 = {'MERCURY':'magenta','VENUS':'yellow','EARTH':'blue','MARS':'darkred','CERES':'darkgrey','JUPITER':'lightgrey','SATURN':'black','URANUS':'lightblue','NEPTUNE':'darkblue','PLUTO':'red','ERIS':'magenta'}#'HAUMEA':'grey','MAKEMAKE':'grey','HYGIEA':'grey','VESTA':'g
        vallues_C = {'MERCURY':'MERCURY','VENUS':'VENUS','EARTH':'EARTH','MARS':'MARS','CERES':'CERES','JUPITER':'JUPITER','SATURN':'SATURN','URANUS':'URANUS','NEPTUNE':'NEPTUNE','PLUTO':'PLUTO','ERIS':'ERIS'}#'HAUMEA':'grey','MAKEMAKE':'grey','HYGIEA':'grey','VESTA':'grey','PALLAS':'grey'}
        vallues_j = {'MERCURY':'MERCURY','VENUS':'VENUS','EARTH':'EARTH','MARS':'MARS','CERES':'CERES','JUPITER':'JUPITER'}

        if jview:
            tro = astro.orbit(0,int(vallues.get('JUPITER','ERROR')),None,'y')
            ax.plot(tro['x_list_peri'],tro['y_list_peri'],color='cyan',alpha=0.4,linewidth=0.7,label='2D Jupiter ORBIT')

            for _,t in enumerate(vallues_j):
                ax.plot(fl_listx[_],fl_listy[_],fl_listz[_],color=vallues_1.get(t,'ERROR'),linewidth=1.3)#label=vallues_C.get(t,'ERROR'))
                ax.scatter([px[_]/contin.AU_m],[py[_]/contin.AU_m],[pz[_]/contin.AU_m],color=vallues_1.get(t,'ERROR'),marker='o',label=vallues_C.get(t,'ERROR'))


            ax.set_facecolor('darkgrey')
            fig.patch.set_facecolor('darkgrey')


            #hide the grey grid line

            ax.xaxis.pane.fill = False
            ax.yaxis.pane.fill = False
            ax.zaxis.pane.fill = False #obviously if not fals then default is true .?..maybe

            #the numbers to be int,float with how many decimal places.

            au_f = StrMethodFormatter('{x:.2f}AU')
            ax.xaxis.set_major_formatter(au_f)
            ax.yaxis.set_major_formatter(au_f)
            ax.zaxis.set_major_formatter(au_f)

            ##tick labels the numbers formatter##

            ax.tick_params(axis='x',color='white')
            ax.tick_params(axis='y',color='white')
            ax.tick_params(axis='z',color='white')
            ax.set_xlabel('x_AU',color='magenta')
            ax.set_ylabel('y_AU',color='magenta')
            ax.set_zlabel('z_AU',color='magenta')
            ax.set_box_aspect([1,1,1])

            ax.set_title(f'Jupiter and inner planets plot - Unix time: {ps['Unix_time']}//{time.asctime().replace(':','t')} Heliocentric',color='green')

            #save file

            output_save = f'Jupiter and inner planets plot - Unix time: {ps['Unix_time']} or {time.asctime().replace(':','t')} Heliocentric.png'
            plt.savefig(output_save,facecolor=fig.get_facecolor(),dpi=300)
            console.print(f'\n[bold Cyan]3D visualization rendered to {output_save} [/bold Cyan]\n')


            return plt

        if inview:
            tro = astro.orbit(0,int(vallues.get('MARS','ERROR')),None,'y')
            ax.plot(tro['x_list_peri'],tro['y_list_peri'],color='cyan',alpha=0.4,linewidth=0.7,label='2D Mars Orbit')

            for _,t in enumerate(vallues_j):
                if t=='JUPITER':
                    continue
                ax.plot(fl_listx[_],fl_listy[_],fl_listz[_],color=vallues_1.get(t,'ERROR'),linewidth=1.3)
                ax.scatter([px[_]/contin.AU_m],[py[_]/contin.AU_m],[pz[_]/contin.AU_m],color=vallues_1.get(t,'ERROR'),marker='o',label=vallues_C.get(t,'ERROR'))


            ax.set_facecolor('darkgrey')
            fig.patch.set_facecolor('darkgrey')


            #hide the grey grid line

            ax.xaxis.pane.fill = False
            ax.yaxis.pane.fill = False
            ax.zaxis.pane.fill = False #obviously if not fals then default is true .?..maybe                                                                                    
            #the numbers to be int,float with how many decimal places.

            au_f = StrMethodFormatter('{x:.2f}AU')
            ax.xaxis.set_major_formatter(au_f)
            ax.yaxis.set_major_formatter(au_f)
            ax.zaxis.set_major_formatter(au_f)                                          
            ##tick labels the numbers formatter##

            ax.tick_params(axis='x',color='white')
            ax.tick_params(axis='y',color='white')
            ax.tick_params(axis='z',color='white')
            ax.set_xlabel('x_AU',color='magenta')
            ax.set_ylabel('y_AU',color='magenta')
            ax.set_zlabel('z_AU',color='magenta')
            ax.set_box_aspect([1,1,1])

            ax.set_title(f'inner planets plot - Unix time: {ps['Unix_time']}//{time.asctime().replace(':','t')} Heliocentric',color='green')                                         
            #save file

            output_save = f'inner planets plot - Unix time: {ps['Unix_time']} or {time.asctime().replace(':','t')} Heliocentric.png'
            plt.savefig(output_save,facecolor=fig.get_facecolor(),dpi=300)

            console.print(f'\n[bold Cyan]3D visualization rendered to {output_save} [/bold Cyan]\n')

            return plt




        tro = astro.orbit(0,int(vallues.get('ERIS','ERROR')),None,'y')       

        ax.plot(tro['x_list_peri'],tro['y_list_peri'],color='cyan',alpha=0.4,linewidth=0.7,label='2D Eris ORBIT')

        name_l = [g for g in vallues_1.keys()]


        for _,idx in enumerate(fl_listx): #the multiple plots

            name = name_l[_]

            ax.plot(idx,fl_listy[_],fl_listz[_],color=vallues_1.get(name,'ERROR'),linewidth=1.3,label=vallues_C.get(name,'ERROR'))
            ax.scatter([px[_]/contin.AU_m],[py[_]/contin.AU_m],[pz[_]/contin.AU_m],s=120,color=vallues_1.get(name,'ERROR'),marker='o')


        ax.set_facecolor('darkgrey')
        fig.patch.set_facecolor('darkgrey')

        #hide the grey grid linne

        ax.xaxis.pane.fill = False
        ax.yaxis.pane.fill = False
        ax.zaxis.pane.fill = False #obviously if not fals then default is true .?..maybe

        #the numbers to be int,float with how many decimal places.

        au_f = StrMethodFormatter('{x:.2f}AU')
        ax.xaxis.set_major_formatter(au_f)
        ax.yaxis.set_major_formatter(au_f)
        ax.zaxis.set_major_formatter(au_f)
        
        ##tick labels the numbers formatter##

        ax.tick_params(axis='x',color='white')
        ax.tick_params(axis='y',color='white')
        ax.tick_params(axis='z',color='white')

        ax.set_xlabel('x_AU',color='magenta')
        ax.set_ylabel('y_AU',color='magenta')
        ax.set_zlabel('z_AU',color='magenta')
        ax.set_box_aspect([1,1,1])
        ax.set_title(f'Fulplot - Unix time: {ps['Unix_time']}//{time.asctime().replace(':','t')} Heliocentric',color='green')

        #save file

        output_save = f'Fulplot - Unix time: {ps['Unix_time']} or {time.asctime().replace(':','t')} Heliocentric.png'
        plt.savefig(output_save,facecolor=fig.get_facecolor(),dpi=300)

        console.print(f'\n[bold Cyan]3D visualization rendered to {output_save} [/bold Cyan]\n')


        return plt








    def pin(self,name: str=None,view='2D',jupview=None,innerview=None,fullview=None):
        '''Geocentric plots 2D and 3D, full 2D solarsystem view..jupiter inner view..inner planets only view'''

        if name:
            name = name.upper()


        if (jupview and innerview) or (jupview and fullview) or (innerview and fullview) or (jupview and innerview and fullview):
            console.print('[red]choose one between jupiter and inner objects and full view or the innerview only but not both/all at the same time[/red]')
            return

        if name=='EARTH':
            console.print('[red]Name cannot be Earth for this method[/red]')
            return

##cannot check name because jupivuew and inner view can run without name
        lst = ['3D','2D']
        vallues = {'MERCURY':88,'VENUS':225,'EARTH':365,'MARS':687,'CERES':1681,'JUPITER':4333,'SATURN':10759,'URANUS':30685,'NEPTUNE':60190,'PLUTO':90465,'ERIS':204174}

        vallues_1 = {'MERCURY':'magenta','VENUS':'yellow','EARTH':'blue','MARS':'darkred','CERES':'darkgrey','JUPITER':'lightgrey','SATURN':'black','URANUS':'lightblue','NEPTUNE':'darkblue','PLUTO':'red','ERIS':'magenta'}
        vallues_j = {'MERCURY':88,'VENUS':225,'EARTH':365,'MARS':687,'CERES':1681,'JUPITER':4333}#'SATURN':10759,'URANUS':30685,'NEPTUNE':60190,'PLUTO':90465,'ERIS':204174}

        vallues_C = {'MERCURY':'MERCURY','VENUS':'VENUS','EARTH':'EARTH','MARS':'MARS','CERES':'CERES','JUPITER':'JUPITER','SATURN':'SATURN','URANUS':'URANUS','NEPTUNE':'NEPTUNE','PLUTO':'PLUTO','ERIS':'ERIS'}

        view = view.upper()



        while view not in lst:
            console.print(f'[white]first argument ¦view¦ only accepts 2D or 3D.[/white]\nit was given: {view}.')
            return

        if view=='3D': #Geocentric view in 3D

            fig = plt.figure(figsize=(10,10))
            ax = fig.add_subplot(projection='3d')

            retu = contin.barycentric('Earth')
            retur = contin.barycentric(name)
            efull = contin.reel('EARTH')
            othfull = contin.reel(name) #heliocentric



            ##the 2D orbit decider based on distance##
            if vallues[name]>vallues['EARTH']:
                tro = astro.orbit(0,int(vallues.get(name,'ERROR')),None,'y')
            else:
                tro = astro.orbit(0,int(vallues.get('EARTH','ERROR')),None,'y')


            np_efull_X = np.array(efull['X_helioAU'])
            np_efull_Y = np.array(efull['Y_helioAU'])
            np_efull_Z = np.array(efull['Z_helioAU'])
            np_othfull_X = np.array(othfull['X_helioAU'])
            np_othfull_Y = np.array(othfull['Y_helioAU'])
            np_othfull_Z = np.array(othfull['Z_helioAU'])



            #e2d = astro.orbit(0,int(vallues.get('EARTH','ERROR')),None,'y')

            #tro = astro.orbit(0,int(vallues.get(name,'ERROR')),None,'y')
            ax.plot(tro['x_list_peri'],tro['y_list_peri'],color='cyan',alpha=0.4,linewidth=0.7,label='2D orbit')
            ax.scatter([0],[0],[0],s=150,color='yellow',marker='o',label='sun')

            ax.plot(np_efull_X,np_efull_Y,np_efull_Z,color=vallues_1.get('EARTH','ERROR'),linewidth=1.3) #Earth plot
            ax.scatter([retu['X_helio']/contin.AU_m],[retu['Y_helio']/contin.AU_m],[retu['Z_helio']/contin.AU_m],color=vallues_1.get('EARTH','ERROR'),s=80,marker='o',label=vallues_C.get(name,'ERROR')) #Earth scatter
            ax.plot(np_othfull_X,np_othfull_Y,np_othfull_Z,color=vallues_1.get(name,'ERROR'),linewidth=1.3)
            ax.scatter([retur['X_helio']/contin.AU_m],[retur['Y_helio']/contin.AU_m],[retur['Z_helio']/contin.AU_m],color=vallues_1.get(name,'ERROR'),s=30,marker='o',label=vallues_C.get(name,'ERROR'))


            ax.set_facecolor('darkgrey')
            fig.patch.set_facecolor('darkgrey')                                         

            #hide the grey grid line
            ax.xaxis.pane.fill = False
            ax.yaxis.pane.fill = False
            ax.zaxis.pane.fill = False #obviously if not fals then default is true .?..maybe
            #the numbers to be int,float with how many decimal places.

            au_f = StrMethodFormatter('{x:.2f}AU')
            ax.xaxis.set_major_formatter(au_f)
            ax.yaxis.set_major_formatter(au_f)
            ax.zaxis.set_major_formatter(au_f)

            ##tick labels the numbers formatter##

            ax.tick_params(axis='x',color='white')
            ax.tick_params(axis='y',color='white')
            ax.tick_params(axis='z',color='white')
            ax.set_xlabel('x_AU',color='magenta')
            ax.set_ylabel('y_AU',color='magenta')
            ax.set_zlabel('z_AU',color='magenta')
            ax.set_box_aspect([1,1,1])

            ax.set_title(f'Geocentric {vallues_C.get(name,'ERROR')} plot - Unix time: {retur['Unix_time']}//{time.asctime().replace(':','t')} Heliocentric',color='green')
            #save file

            output_save = f'Geocentric {vallues_C.get(name,'ERROR')} plot - Unix time: {retur['Unix_time']} or {time.asctime().replace(':','t')} Heliocentric.png'
            plt.savefig(output_save,facecolor=fig.get_facecolor(),dpi=300)

            console.print(f'\n[bold Cyan]3D visualization rendered to {output_save} [/bold Cyan]\n')

            return plt



        vallues_col = {'MERCURY':'darkgrey','VENUS':'yellow','EARTH':'blue','MARS':'darkred','VESTA':'red','CERES':'red','PALLAS':'red','HYGIEA':'red','JUPITER':'green','SATURN':'magenta','URANUS':'lightblue','NEPTUNE':'darkblue','PLUTO':'red','HAUMEA':'red','MAKEMAKE':'red','ERIS':'magenta'}
        vallues_mar = {'MERCURY':'m','VENUS':'V','EARTH':'E','MARS':'M','VESTA':'v','CERES':'c','PALLAS':'p','HYGIEA':'H','JUPITER':'j','SATURN':'s','URANUS':'u','NEPTUNE':'n','PLUTO':'P','HAUMEA':'h','MAKEMAKE':'m','ERIS':'e'}


        if jupview and view=='2D': #degault is 2D...i want the geocentric system in 2D to be the degault for tthis method if the pos arg are None..like if all argyments are None and name is enetered whule view is 2D then default shall be geicentric 2D system
         #   vallues_col = {'MERCURY':'darkgrey','VENUS':'yellow','EARTH':'blue','MARS':'darkred','VESTA':'red','CERES':'red','PALLAS':'red','HYGIEA':'red','JUPITER':'green','SATURN':'magenta','URANUS':'lightblue','NEPTUNE':'darkblue','PLUTO':'red','HAUMEA':'red','MAKEMAKE':'red','ERIS':'magenta'} #if hygiea or otger unsupported entered, nothing will happen
          #  vallues_mar = {'MERCURY':'m','VENUS':'V','EARTH':'E','MARS':'M','VESTA':'v','CERES':'c','PALLAS':'p','HYGIEA':'H','JUPITER':'j','SATURN':'s','URANUS':'u','NEPTUNE':'n','PLUTO':'P','HAUMEA':'h','MAKEMAKE':'m','ERIS':'e'}

            X = []
            Y = []
            #Z = []
            fullX = []
            fullY = []
          #  fullZ = []
            names = []


            for _ in vallues_j:
                retu = contin.barycentric(_)
                retur = contin.reel(_)
                X.append(retu['X_helio']/contin.AU_m)
                Y.append(retu['Y_helio']/contin.AU_m)
               # Z.append(retu['Z_helio']/contin.AU_m)
                fullX.append(retur['X_helioAU'])
                fullY.append(retur['Y_helioAU'])
            #    fullZ.append(retur['Z_helioAU'])
                names.append(retu['name']) #contains respective name.




            pl.clf()
            width,height = pl.terminal_size()
            pl.plotsize(width,height)

            for _,idx in enumerate(fullX): #fullX contains 6 lists

                pl.plot(fullX[_],fullY[_],color='white')#label=vallues_C.get(names[_],'ERROR'))
                pl.scatter([X[_]],[Y[_]],color=vallues_col.get(names[_],'ERROR'),marker=vallues_mar.get(names[_],'ERROR'),label=vallues_C.get(names[_],'ERROR'))


            pl.xlabel('Distance in AU')
            pl.ylabel('Distance in AU')
            pl.title(f'Jupiter and inner objects at Unix time:{retu['Unix_time']}//{time.asctime()}')
            pl.theme('dark')
            
            return pl
        elif jupview and view=='3D':
            print('jupview works only with 2D in this method.')
            return 'jupview works only with 2D in this method.'



        if innerview and view=='2D':

            X = []
            Y = []
         #   Z = []
            fullX = []
            fullY = []
          #  fullZ = []
            names = []

            for _ in vallues_j.keys():
                if _=='JUPITER' or _=='CERES':
                    continue
                retu = contin.barycentric(_)
                retur = contin.reel(_)
                X.append(retu['X_helio']/contin.AU_m)
                Y.append(retu['Y_helio']/contin.AU_m)
                fullX.append(retur['X_helioAU'])
                fullY.append(retur['Y_helioAU'])
                names.append(retu['name'])


            pl.clf()
            width,height = pl.terminal_size()
            pl.plotsize(width,height)
            pl.scatter([0],[0],color='green',marker='S')

            for _,idx in enumerate(fullX):
                pl.plot(idx,fullY[_],color='white')

                pl.scatter([X[_]],[Y[_]],color=vallues_col.get(names[_],'ERROR'),marker=vallues_mar.get(names[_],'ERROR'),label=vallues_C.get(names[_],'ERROR'))
            
            pl.xlabel('Distance in AU')
            pl.ylabel('Distance in AU')
            pl.title(f'inner objects at Unix time: {retu['Unix_time']}//{time.asctime().replace(':','t')} Heliocentric')
            pl.theme('dark')
            
            return pl

        elif innerview and view=='3D':
            print('innerview only works with 2D in this method\n')
            return 'innerview only works with 2D in this method'



                


    def lunatrack(self,dimension: str='2D'):
        '''tracks Solar system objects true path as it orbits the central mass. The moons path as it orbits the Earth-moon-Barycenter.This method only shows the real time positions without showing their orbits. built specifically for Luna'''

     #   if name==None:
      #      return 'name cannot be none'

      #  name = name.upper()
        dy = ['2D','3D']


        if dimension not in dy:
            return 'dimension passed not supported'
        elif dimension!='2D': #the dy check is already implemented above...
            dimension = dimension.upper()



       # if (name=='LUNAR' or name=='LUNA' or name=='MOON') and dimension=='2D': #best plus mercury becauee of their shor periods around their central masses..but focusing on luna..

        with open('import_states.json','r') as f:
            data = json.load(f)

        magn_r = vectors.magn_vect(data['states_list'][0])
        magn_v = vectors.magn_vect(data['states_list'][1])
            
        pl.clf()
        width, height = pl.terminal_size()
        pl.plotsize(width,height)
        pl.scatter([0],[0],marker='EMB') #B is the EMB
        pl.xlabel('X axis Lunar real-time distance from EMB kme4')
        pl.ylabel('Y axis Lunar real-time distance from EMB kme4')
        pl.title(f'Lunar relative EMB UTCtime {data['UTCtime']} = {magn_r/1000} km, {magn_v/1000} km/s')
        pl.theme('dark') #this block lets the plotext object not to update everytime..jsing the same canvas but the plotting updates after every second..i will get back tonthe original logic later.
        #    while True:
         #       try:
                    
       #     pl.plot([data['states_list'][0][0]/1000],[data['states_list'][0][1]/1000],color='white')
        pl.scatter([data['states_list'][0][0]/10000000],[data['states_list'][0][1]/10000000],color='red',marker='L') #converted to m then also rsduced the magnitude by 10000km hence showed kme4

        return pl
        #    pl.show()
                 #   time.sleep(60)
                    
                #except KeyboardInterrupt:
                 #   raise KeyboardInterrupt('KeyboardInterrupt')




