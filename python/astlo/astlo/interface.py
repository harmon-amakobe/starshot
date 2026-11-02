# the command line interface for the engine

# Copyright © 2026 Mark Macharia[@iamnothimbutwe Github]
# All rights reserved.

# Unauthorized copying, modification, distribution, or commercial use of this software (or substantial portions of it) is strictly prohibited without express written permission from the author.

import click
from .astlo import Astro
from .contin import Contin
from .solexp import Solexp
from .vect import Vectors
from .mat import Mat
from .eo import Eo, sate_posvel
from rich.console import Console
from .topocentric import Topocentric
import os
import sys
import time
import matplotlib.pyplot as plt
import matplotlib.image as mpimg
from importlib import resources

console=Console()
mat = Mat()
vectors = Vectors()
#human = Humanread()

# ---------------------------------------------------------
# Copyright (c) 2026 Mark. All rights reserved.
# Unauthorized copying of this file, via any medium, is
# strictly prohibited. Written by Mark (iamnothimbutwe) on Github.
# ---------------------------------------------------------


email='markmacgh@gmail.com/hecateare@gmail.com'


@click.group()
#@click.option(help='in some calculations, only one mass is required.you can use either of the --mass/--Mass options.In other calculations both the masses are required therefore use the two options --mass/--Mass respectively')
@click.option('--tble',default=None,help='if not None, a table containing values of the solar system will be printed to the console')
@click.version_option(version=f'v12.5.5130_core\nA developing Astrophysics/Astronomy/celestial mechanics engine\ndeveloper: @iamnothimbutwe on Github and Gitlab.\nA property of Astlo Space systems ¦astlospacesystems@gmail.com¦ and KenyaSpaceNerds [reddit community]. All rights reserved.')
@click.pass_context
def term(ctx,tble):
    if ctx.obj==None:
        ctx.obj = {'astro':Astro(tble),'contin':Contin(),'solexp':Solexp(),'topocentric':Topocentric()}
  #  ctx.obj=Astro(tble)
#    ctx.obj=Contin()
 #  # ctx.obj=Humanread()
  #  ctx.obj=Solexp()
 #   ctx.obj=Humanread()



@term.command()
@click.option('--velocity',default=1,help='the velocity of the object in space. Use the SI unit m/s',type=float)
@click.option('--distance',default=1,help='the distance between the two objects in space. Use the SI unit m',type=float)
@click.option('--mass',default=1,help='the Mass of the smaller mass. Use the SI unit kg',type=float)
@click.option('--ass',default=1,help='the Mass of the larger mass. Use the SI unit kg',type=float)
@click.option('--o_p',default=1,help='the orbital period of the planet if known.',type=float)
@click.pass_context
def harmonic(ctx,velocity,distance,mass,ass,o_p):
    ctx.obj['astro'].harmonic(velocity,distance,mass,ass,o_p)


@term.command()
@click.option('--r_a',default=1,help='apside value (aphelion) which is the maximum distance from the sun',type=float)
@click.option('--r_p',default=1,help='apside value (perihelion) which is the minimum distance from the sun',type=float)
@click.option('--tble',default=None,help='if not None, a table containing values of the solar system will be printed to the console')
@click.pass_context
def eccent(ctx,r_a,r_p,tble):
    ctx.obj['astro'].eccent(r_a,r_p,tble)
    if tble:
        ctx.obj['astro'].tebl()
        return


@term.command()
@click.option('--k_e',default=1,help='kinetic energy value',type=float)
@click.option('--p_e',default=1,help='potential energy value',type=float)
@click.option('--distance',default=1,help='distance between the two object or masses. Mostly the sun and the orbiting object a in AU',type=float)
@click.option('--mass',default=1,help='the mass of the smaller mass',type=float)
@click.option('--ass',default=1,help='the mass of the larger Mass',type=float)
@click.option('--tble',default=None,help='if not None, a table containing values will be printed to the console')
@click.pass_context
def energy(ctx,k_e,p_e,mass,ass,distance,tble):
    ctx.obj['astro'].energy(k_e,p_e,mass,ass,distance,tble)
    if tble:
        ctx.obj['astro'].tebl()
        return


@term.command()
@click.option('--proper_time',default=1,help='for the stationary object at or near the surface of the mass',type=float)
@click.option('--coordinate_time',default=1,help='for the distant stationary object where space time is flat',type=float)
@click.option('--mass',default=1,help='the mass of the Mass',type=float)
@click.option('--distance',default=1,help='the distance from the center of the Mass to the stationary object at or near the surface of the mass',type=float)
@click.pass_context
def timee(ctx,mass,distance,coordinate_time,proper_time):
    ctx.obj['astro'].timee(mass,distance,coordinate_time,proper_time)


@term.command()
@click.option('--parallax',default=1,help='the value of the parallax angle',type=float)
@click.option('--distance',default=1,help='the distance in meters if it is the only value available',type=float)
@click.option('--light_years',default=1,help='the value of light years if it is the only value available',type=float)
@click.pass_context
def distance(ctx,parallax,distance,light_years):
    ctx.obj['astro'].distance(parallax,distance,light_years)



@term.command()
@click.pass_context
def info(ctx):
    print()
    console.print('[bold white]Astlo. Astlo Space systems. r/kenyaspacenerds.\nA property of Astlo space systems and KenyaSpaceNerds.\ncopyright.\nAstlo = Astrophysics/Astronomy/Celestial mechanics engine.\nAstlo is and was enterily built on linux from a mobile phone. The core engine is only <80KB.\nimage and video Data is credited to Astlo Space systems/NASA/ESA/NASA-JPL/KenyaSpaceNerds-KSN.\nr/kenyaspacenerds is a STEM related subreddit that promotes and educates topics related to STEM and Astronomy ¦Science,Technology,Engineering,Mathematics¦ in Kenya¦East Africa¦ and certainly the whole World.[/bold white]')
    print()
    return


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
    #astro.orbits(name,lp,fcdts,plx)

@term.command
@click.option('--name','-n',default=None,help='the name of the object. currently supports 16 objects in the solar system.',type=str)
@click.option('--lp','-lp',default=None,help='if you want to get the state vectors and other values in real time')
@click.option('--rk4','-rk4',default=None,help='the 4th order accuracy. Rungekutta¦for astlo. use this together with name of object for 4th order accuracy with a delta t of one hour.')
@click.option('--days','-d',default=None,help='if you want to time-step to a certain number of days. value should be strictly in days. only works together with name and rk4.')
@click.pass_context
def rtime(ctx,name,lp,rk4,days):

    if name==None:
        console.print('[red]name cannot be None[/red]')
        return



    if (name and lp and rk4 and days):
        console.print('[red]only use the name of the object together with lp or with rk4 + days but not all at the same time [/red]')
        return

    if (lp and rk4) or (lp and rk4 and days) or (rk4 and days and name==None and lp==None) or (lp and days and rk4==None and name==None) or (lp and days) or (rk4 and name==None and lp==None and days==None) or (days and rk4==None and name==None and lp==None) or (days and name and rk4==None):
        console.print('[red]option rk4 only works together with the name of the object or plus days if wanted. rk4 + name + days or rk4 + name only..[/red]')
        return
    if (rk4 and name==None):
        console.print('[red]option rk4 requires the name of the object to continue[/red]')
        return

    if name and rk4 and lp==None:
        ##rk4 logic##
        valu = {'SUN':0,'MERCURY':1,'VENUS':2,'EARTH':3,'MARS':4,'VESTA':5,'CERES':6,'PALLAS':7,'HYGIEA':8,'JUPITER':9,'SATURN':10,'URANUS':11,'NEPTUNE':12,'PLUTO':13,'HAUMEA':14,'MAKEMAKE':15,'ERIS':16}
        if os.name=='nt':
            os.system('cls')
        else:
            os.system('clear')

        name = name.upper()

        
        console.print('[bold white]The Rungekutta for astlo. Through this, you can get the real full states of object X refined using rk4 -Rungekutta- with a delta t of one hour.\n\nTo time step to a certain day Y, please use the days option.\nThe passed value for option -days- or hours or seconds or years should be strictly in terms of days.\n\nIf days is not given a value, the default time step will be of rk4 which is -Real time + one hour-.\n\nIf days, the time step will be of -Real time +days + onehour for rk4-[/bold white]\n\n')
            
        time.sleep(1)
        console.print('Continuing.../')

        if days:
            rk = ctx.obj['contin'].rungekutta(None,None,None,days)
        else:
            rk = ctx.obj['contin'].rungekutta() #one hour default time step

      #  console.print('Continuing.../')

       # for _,idx in enumerate():..
        osc_elems = ctx.obj['contin'].oscelem(rk['new_pos_vectors'][valu.get(name,'error')],rk['new_vel_vectors'][valu.get(name,'error')],valu.get(name,'error'),'b') #the oscelem in contin method was updated..
        pos_magn = vectors.magn_vect(rk['new_pos_vectors'][valu.get(name,'error')])
        pos_magn_AU = pos_magn/ctx.obj['contin'].AU_m




        console.print(f'''\n\n\n[cyan]Name: [/cyan][bold white]{name}[/bold white]\n[cyan]Unix time: [/cyan][bold white]{time.time()}//{time.asctime()} ¦ '+'{days,'days & one-hour' if days else 'Real-time + one-hour default'}[/bold white]\n[cyan]Time-mode: [/cyan][bold white]'Time-stepped +'{days,'days & one-hour' if days else 'Real-time + one-hour default'}[/bold white]\n[cyan]Epoch and reference frame: [/cyan][yellow]J2000 January 1st 2000¦¦-SSB- respectively[/yellow]\n\n[yellow]Refined states relative SSB using rk4 fourth order accuracy[/yellow]\n\n[cyan]position vector relative SSB: [/cyan][bold white]({rk['new_pos_vectors'][valu.get(name,'error')]}) -m meters- [/bold white][yellow]magnitude = [/yellow][bold white]{pos_magn} -m meters- ¦ {pos_magn_AU} -AU Astronomical units-.[/bold white]\n[cyan]Velocity vector relative SSB: [/cyan][bold white]({rk['new_vel_vectors'][valu.get(name,'error')]}) -m/s meters per second- [/bold white][yellow]magnitude = [/yellow][bold white]{vectors.magn_vect(rk['new_vel_vectors'][valu.get(name,'error')])} -m/s meters per second-[/bold white]\n[cyan]acceleration vector relative SSB: [/cyan][bold white]({rk['new_acc_vectors'][valu.get(name,'error')]}) -m/s^² meters per second squared- [/bold white][yellow]magnitude = [/yellow][bold white]{vectors.magn_vect(rk['new_acc_vectors'][valu.get(name,'error')])} -m/s^² meters per second squared-[/bold white]\n[cyan]specific mechanical energy: [/cyan][bold white]{osc_elems['energy']} -m^²/s^²-[/bold white]\n[cyan]Angular momentum h: [/cyan][bold white]{osc_elems['angular momentum_h']} -m^²/s-[/bold white]\n\n[yellow]Osculating elememts a,e,i,Omega,omega,Nu relative SSB ¦Solar System Barycenter ¦ Eclitpic[/yellow]\n[cyan]semi-major axis a: [/cyan][bold white]{(osc_elems['osc_a']/ctx.obj['contin'].AU_m)} AU -Astronomical unit-[/bold white]\n[cyan]eccentricity vector: [/cyan][bold white]({osc_elems['e_X']},{osc_elems['e_Y']},{osc_elems['e_Z']}) [/bold white][yellow]magnitude = [/yellow][bold white]{osc_elems['osc_e']}[/bold white]\n[cyan]inclination: [/cyan][bold white]{osc_elems['osc_i']}° -degrees- relative the ecliptic[/bold white]\n[cyan]longitude of ascending node: [/cyan][bold white]{osc_elems['Omega']}° -degrees-[/bold white]\n[cyan]argument of periapsis: [/cyan][bold white]{osc_elems['argof_perihelion']}° -degrees-[/bold white]\n[cyan]true-anomaly N ¦ Nu ¦ v: [/cyan][bold white]{osc_elems['true_anomaly']}° -degrees relative SSB-[/bold white]''') #use bold white for better bolder white...
        
       # console.print('\n\n\n[bold white]One 1 Astronomical is the average distance to thebSun Sol from Earth Gaia.\nTherefore if an object is 40 AU from the heliocebter or berycenter, this means that object is 40 times the average distance from Earth to the Sun = 1AU- ')

        return

#        time.sleep(1)
 #       rtm_lst = ['YES','NO']
  #      try:
   #         rtim = console.input(f'\n\n    [white]Want real-time ¦now¦ states for {name} ?[/white]: ')
    #    except KeyboardInterrupt:
     #       console.print('[red]keyboard interrupt[/red]')
      #      return
#
 #       rtim.upper() #makes it easier to proof check..
     #   if name=='SUN' or name=='SOL':
  #          return
#
 #       print('\n\n\n\n')
  #      if rtim in rtm_lst:
   #         contin.rtime(name,lp)
    #    else:
     #       console.print('[red].../[/red]')
      #      return






    ln = ['luna','lunar'] ##ill add tge moons to be supported later
    if name not in ln:
        ctx.obj['contin'].rtime(name,lp)
    elif name in ln and lp==None:
        retu = ctx.obj['contin'].lunars('earth') #when the moon lists start to get moore, ill have to adapt..
        acc_X,acc_Y,acc_Z = ctx.obj['contin'].acce(name)
        acc_magn = vectors.magn_vect([acc_X,acc_Y,acc_Z])
        
        console.print(f'\n[bold cyan]System Name: [/bold cyan][bold white]{retu['name']} - {retu['actname']}[/bold white]\n[cyan]Current Unix time: [/cyan][white]{retu['tim_e']} or {time.asctime()}[/white]\n[bold cyan]Reference frame: [/bold cyan][yellow]January Julian J2000[/yellow]\n[cyan]Mean anomaly and eccentric anomaly: [/cyan][white]{retu['mean_anomaly']} , {retu['eccentric_anomaly']}[/white] [magenta](respectively)[/magenta]\n[cyan]Current orbital day: [/cyan][white]{None}[/white]\n[cyan]Geocentric position vector: [/cyan][white]({retu['X']},{retu['Y']},{retu['Z']})[/white] [magenta](m meters)[/magenta]\n\n[cyan]Geocentric velocity vector: [/cyan][white]({retu['v_X']},{retu['v_Y']},{retu['v_Z']})[/white] [magenta](m/s)[/magenta]\n\n[cyan]illumination element k and illumination percentage P Heliocentric: [/cyan][white]{retu['k']} ¦ {round((retu['k']*100),2)}[/white] [magenta](%)[/magenta]\n[cyan]illumination element k and illumination percentage P Barycentric: [/cyan][white]{retu['k_bary']} ¦ {round((retu['k_bary']*100),2)}[/white] [magenta](%)[/magenta]\n[cyan]Current distance of Luna from Earth: [/cyan][white]{retu['r_magnitude']}[/white] [magenta](m meters)[/magenta] [white]{retu['r_magnitude']/1000}[/white] [magenta](km)[/magenta]\n[cyan]Current Geocentric orbital velocity: [/cyan][white]{retu['v_magnitude']}[/white] [magenta](m/s)[/magenta] [white]{retu['v_magnitude']/1000}[/white] [magenta](km/s)[/magenta]\n[cyan]Luna light delay to Earth: [/cyan][white]{retu['light_delay']}[/white] [magenta](s seconds)[/magenta] or [white]{retu['light_delay']/60}[/white] [magenta](minutes)[magenta]\n[cyan]Luna Solar light delay Heliocentric and Barycentric: [/cyan][white]{retu['light_delay_sun']}[/white] [magenta](s seconds)[/magenta] or [white]{retu['light_delay_sun']/60}[/white] [magenta](minutes)[/magenta] ¦¦ [yellow]Barycentric[/yellow] [white]{retu['light_delay_sun_bary']}[/white] [magenta](seconds)[/magenta] or [white]{retu['light_delay_sun_bary']/60}[/white] [magenta](minutes)[/magenta]\n\n[cyan]{retu['actname']} N_body gravitational acceleration: [/cyan][white]{acc_magn}[/white] [magenta](m/s^2)[/magenta]\n[cyan]{retu['actname']} N-body gravitational acceleration vector: [/cyan][white]({acc_X},{acc_Y},{acc_Z})[/white] [magenta](m/s^2)[/magenta]\n[cyan]Angular momentum vector: [/cyan][white]({retu['h_X']},{retu['h_Y']},{retu['h_Z']})[/white] [magenta](m^2/s)[/magenta]\n[cyan]Total Angular momentum: [/cyan][white]{retu['angular momentum_h']}[/white] [magenta](m^2/s)[/magenta]\n[cyan]Specific Energy E: [/cyan][white]{retu['energy']}[/white] [magenta](m^2/s^2)[/magenta]\n\n[yellow]osculating elements i, v(Nu).[/yellow]\n[cyan]Lunar orbital inclination: [/cyan][white]{retu['osc_i']}°[/white] [magenta](degrees)[/magenta]\n[cyan]Lunar current True anomaly Nu: [/cyan][white]{retu['true_anomaly']}°[/white] [magenta](degrees)[/magenta]\n\n[yellow]Luna current face and phase due to illumination from Sol.[/yellow]\n[cyan]Current Luna phase and face: [/cyan][white]{None}[/white]')

       # sys.exit(0)
        return

    elif name in ln and lp:
        console.print('[red]currently Luna does not support lp[/red]')
        return


@term.command
@click.option('--name','-n',default=None,help='the name of the celestial object. currently, animating supports 11 objects',type=str)
@click.option('--rt','-rt',default=None,help='giving a value to this will print a one time true real time plot to the terminal. supports all 16 objects. but ill need to intergrate numpy for this option. it is slow and heavy/intensive for the outerplanets...')
#@click.option('--ret','-re',default=None,help='giving a value to this will return a plotext object')
@click.option('--real','-r',default=None,help='giving a value to this will use the real time osculating elements to plot or return the plotext object')
@click.option('--baryc','-bc',default=None,help='give a value to this to get the barycentric logic/return plotext object')
@click.option('--jupview','-jv',default=None,help='give a value to this to get the real time position of jupiter and the inner solar system. use it solely')
@click.pass_context
def anmte(ctx,name,rt,real,baryc,jupview=None): #jupview for the jupiter view from mat

    if (name and jupview) or (rt and jupview) or (real and jupview) or (baryc and jupview) or (name and rt and real and baryc and jupview):
        console.print('[red]jupview works solely.[/red]')
        return


    if jupview:
        ret = mat.pin(None,'2d','y') #jupiter view
        ret.show()
        return


    ctx.obj['contin'].anmte(name,rt,real,baryc) #itret not added for compatibilyity its onlynfor returning






@term.command
@click.pass_context
def energy_visual(ctx):


            #console.print('[bold cyan]The energy visual shows a visualization of how the specific Mechenical Energy changes with an increase in the Distance from the Heliocenter.[/bold cyan]')
    #except KeyboardInterrupt:


    if os.name=='nt':
        os.system('cls')
    else:
        os.system('clear')


    console.print('[yellow]The energy visual shows a visualization of how the specific Mechenical Energy changes with an increase in the Distance from the Heliocenter.[/yellow]')
    print()

    ctx.obj['solexp'].energy_visual()






@term.command
@click.pass_context
def velocity_visual(ctx):


        #console.print('[green]The velocity visual shows a visualization of how the heliocentric orbital velocity changes with an increase in the Distance from the Heliocenter.[/green]')


    if os.name=='nt':
        os.system('cls')
    else:
        os.system('clear')



    console.print('[yellow]The velocity visual shows a visualization of how the heliocentric orbital velocity changes with an increase in the Distance from the Heliocenter.[/yellow]')
    print()


    ctx.obj['solexp'].velocity_visual()




@term.command
@click.pass_context
def inclination_visual(ctx):


    if os.name=='nt':
        os.system('cls')
    else:
        os.system('clear')

        
    console.print('[yellow]The inclination visual shows a visualization of how the osculating element i ¦inclination¦ changes as the Distance from the Heliocenter increases.[/yellow]')

    print()

    ctx.obj['solexp'].inclination_visual()




@term.command
@click.pass_context
def angular_momentum_visual(ctx):

    if os.name=='nt':
        os.system('cls')
    else:
        os.system('clear')

    console.print('[yellow]The angular momentum visual shows a visualization of how the specific Heliocentric angular momentum in km^2/s changes as the Distance from the Heliocenter increases.[/yellow]')
    print()

    ctx.obj['solexp'].angular_momentum_visual()



@term.command
@click.pass_context
def true_anomaly_visual(ctx):

    if os.name=='nt':
        os.system('cls')
    else:
        os.system('clear')

    console.print('[yellow]The true anomaly visual visualizes the real-time true anomaly states with an increase from the heliocenter. It is just for visualizing the current degree object X at Distance X is. Ease of use [one can easily tell which object is near perihelion/aphelion or it is at degree X with perihelion as 0.0°/360.0°].\nThis visual will update itself overtime since no object remains at rest in space.[/yellow]')
    print()

    ctx.obj['solexp'].true_anomaly_visual()




#@term.command
#@click.option('--name','-n',default=None,help='the name of the object. Supported objects:\nSol, Mercury, Venus, Earth, Luna, Cruithne, Mars, Phobos, Deimos,',type=str) ##upfate this thing
#@click.option('--moons','-mns',default=None,help='give this a value if moon X details are needed. use this together with name. eg: -n Earth -mns y')
#@click.option('--comets','-cmts',default=None,help='give a value to this if comet data is needed')
#@click.pass_context
#def details(ctx,name,moons,comets):
 #   if os.name=='nt':
  #      os.system('cls')
   # else:
   #     os.system('clear')
#
 #   if name:
 #       name=name.upper()
#
 #   data = ctx.obj['human'].objcts(name,moons,comets) #if it retyrns after hitting a wall in objcts method, the program will not stop..becyase this is another file and i am storing the return value.get it??
  #  if data==None or isinstance(data,str): #if no koons in object called then it will return an error string
       # print(f'error 0: {data}')
        #return f'error 0: {data}'

   # if name=='EARTH' and moons:

#        console.print(f'\n[yellow]{data['name']}[/yellow]\n\n[cyan]Overview: [/cyan][bold white]{data['desc']}[/bold white]\n\n[cyan]History: [/cyan][bold white]{data['history']}[/bold white]\n\n[cyan]Scientific Milestones: [/cyan][bold white]{data['scientific_milestones']}[/bold white]\n\n[cyan]Missions: [/cyan][bold white]{data['missions']}[/bold white]\n\n[cyan]Video link and source: [/cyan][bold white]{data['videos']}[/bold white]\n[cyan]image link and source: [/cyan][bold white]{data['images']}[/bold white]\n\n[cyan]Physical properties: [/cyan][bold white]{data['physical_properties']}[/bold white]\n\n[cyan]Orbital mechanics: [/cyan][bold white]{data['astrodynamics']}[/bold white]\n\n[cyan]Surface features: [/cyan][bold white]{data['surface']}[/bold white]\n\n[cyan]Atmosphere composition and type: [/cyan][bold white]{data['atmosphere']}[/bold white]\n\n[cyan]States: [/cyan][bold white]{data['states']}')

 #       console.print(f'\n\n\n\n[magenta]Earth has a captured Asteroid[/magenta]\n\n\n[yellow]{data['cru']['name']}[/yellow]\n\n[cyan]Overview: [/cyan][bold white]{data['cru']['desc']}[/bold white]\n\n[cyan]History: [/cyan][bold white]{data['cru']['history']}[/bold white]\n\n[cyan]Scientific Milestones: [/cyan][bold white]{data['cru']['scientific_milestones']}[/bold white]\n\n[cyan]Missions: [/cyan][bold white]{data['cru']['missions']}[/bold white]\n\n[cyan]Video link and source: [/cyan][bold white]{data['cru']['videos']}[/bold white]\n[cyan]image link and source: [/cyan][bold white]{data['cru']['images']}[/bold white]\n\n[cyan]Physical properties: [/cyan][bold white]{data['cru']['physical_properties']}[/bold white]\n\n[cyan]Orbital mechanics: [/cyan][bold white]{data['cru']['astrodynamics']}[/bold white]\n\n[cyan]Surface features: [/cyan][bold white]{data['cru']['surface']}[/bold white]\n\n[cyan]Atmosphere composition and type: [/cyan][bold white]{data['cru']['atmosphere']}[/bold white]\n\n[cyan]States: [/cyan][bold white]{data['cru']['states']}') #image render to show at the bottom then return

      #  package_root = resources.files('astlo.assets')
#
 #       img = mpimg.imread(package_root/'lunaearth.jpg')
  #      plt.imshow(img)
   #     plt.title('Luna and Earth taken by...')
    #    plt.figtext(0.5,0.01,'credit: ',ha='center',fontsize=8)
     #   plt.axis('off')
      #  plt.show()
   #     img = ctx.obj['human'].jpg(name)
    #    if img==None or isinstance(img,str): #the return statemnt if reached in jpg, it will return yes but a none tyoe obiect..therefore override if noe:return in this interface module..
          #  return img
  #      img['object'].show() #retain that random generation

    #    return #the cli should not return nothing.


    ## if not moons but the main object## the final print stmnt..

    #if name!='EARTH' and moons:
#
 #       console.print(f'\n[yellow]{data['name']}[/yellow]\n\n[cyan]Overview: [/cyan][bold white]{data['desc']}[/bold white]\n\n[cyan]History: [/cyan][bold white]{data['history']}[/bold white]\n\n[cyan]Scientific Milestones: [/cyan][bold white]{data['scientific_milestones']}[/bold white]\n\n[cyan]Missions: [/cyan][bold white]{data['missions']}[/bold white]\n\n[cyan]Video link and source: [/cyan][bold white]{data['videos']}[/bold white]\n[cyan]image link and source: [/cyan][bold white]{data['images']}[/bold white]\n\n[cyan]Physical properties: [/cyan][bold white]{data['physical_properties']}[/bold white]\n\n[cyan]Orbital mechanics: [/cyan][bold white]{data['astrodynamics']}[/bold white]\n\n[cyan]Surface features: [/cyan][bold white]{data['surface']}[/bold white]\n\n[cyan]Atmosphere composition and type: [/cyan][bold white]{data['atmosphere']}[/bold white]\n\n[cyan]States: [/cyan][bold white]{data['states']}')

  #      img = ctx.obj['human'].jpg(name)
   #     if img==None or isinstance(img,str):
    #        return
     #   img['object'].show()
      #  return

  #  if comets and name==None and moons==None:
   #     print('it is getting worked on..')
    #    return 'it is getting worked on..'
#


  ##the main objects

 #   console.print(f'\n[yellow]{data['name']}[/yellow]\n\n[cyan]Overview: [/cyan][bold white]{data['desc']}[/bold white]\n\n[cyan]History: [/cyan][bold white]{data['history']}[/bold white]\n\n[cyan]Scientific Milestones: [/cyan][bold white]{data['scientific_milestones']}[/bold white]\n\n[cyan]Missions: [/cyan][bold white]{data['missions']}[/bold white]\n\n[cyan]Video link and source: [/cyan][bold white]{data['videos']}[/bold white]\n[cyan]image link and source: [/cyan][bold white]{data['images']}[/bold white]\n\n[cyan]Physical properties: [/cyan][bold white]{data['physical_properties']}[/bold white]\n\n[cyan]Orbital mechanics: [/cyan][bold white]{data['astrodynamics']}[/bold white]\n\n[cyan]Surface features: [/cyan][bold white]{data['surface']}[/bold white]\n\n[cyan]Atmosphere composition and type: [/cyan][bold white]{data['atmosphere']}[/bold white]\n\n[cyan]States: [/cyan][bold white]{data['states']}')
  #  img = ctx.obj['human'].jpg(name)
   # if img==None or isinstance(img,str):
    #    return
 #   img['object'].show()
  #  return


#each interface method should house the entire SDK class and its attributes ......


@term.command
@click.option('--name','-n',default=None,help='the name of the Solar system object.',type=str) #maybe it is not a must i use -- or - whule defining an option initializer..
@click.option('--latitude','-lat',default=None,help='''Your location's latitude in degrees North or South of Equator.''',type=float)
@click.option('--longitude','-long',default=None,help='''Your location's longitude in degrees East or West of Equator.''',type=float)
@click.option('--altitude','-alt',default=None,help='''Your location's altitude above sea level in meters m.''',type=float)
@click.option('--days','-dy',default=None,help='if you want to time step to a certain second, minute, hour, day, year, millions and billions of years forwad or backwards, give this option an interger value in terms of days. IN TERMS OF DAYS.')
@click.option('--rktt','-tt',default=None,help='default is one hour for the internal rungekutta 4th order accuracy. How long do you want the runge kutta logic to time-step.? If unrequired, do not touch this option.',type=float)
@click.option('--visible_or_not','-visnot',default=None,help='if you want to know which solar system object is visible or not relative your location on Earths surface, give this option any value.')
@click.option('--explain','-expl',default=None,help='if you want astlo to explain to you in raw-text whatever is happening in your local sky. Solar System Object.')
@click.option('--ephem','-eph',default=None,help='if you want to use de440.bsp from NASA JPL to track the object. This file only supportes Sun, Venus, Mercury and moon-luna. astlo has an internal ephemeris powered by its internal rungekutta for all the objects. The external file is only for precision.\n If visnot option is given a value, astlo will only read Luna topocentric states externally and the other objects topocentric states will be internal. ephem option is best used with a single object /Sun,Venus,Mercury.')
@click.pass_context
def topocentric(ctx,name,latitude,longitude,altitude,days,rktt,visible_or_not,explain,ephem):

    if name and visible_or_not and explain==None:
        console.print('[red]if visible_or_not option is given a value, do not use it together with the name option[/red]')
        return


    if latitude==None or longitude==None or altitude==None:
        console.print('[red]The solar system object name and your latitude, longitude, altitude are all reauired to continue')
        return
    
    if name:
        name = name.upper()

    ephe_supp = ['SUN','SOL','VENUS','MERCURY'] #for luna, the core engine automatugally reads from the external json file...however remember to initialize the states from de440 if needed.
    if ephem and name not in ephe_supp:
        console.print(f'[red]Target object {name} cannot be read from the external file. Use astlo-topocentric standalone without the ephem option. de440 only supportes Sun, Venus, Mercury and Luna. If name passed was luna, do not activate ephem since astlo automatically reads luna states externally.[/red]')
        return

    if visible_or_not and explain:
        console.print('[red]either use visnot solely or explain solely but not both at the same time.')


    data_dict = ['SUN','MERCURY','VENUS','LUNA','MARS','VESTA','CERES','PALLAS','HYGIEA','JUPITER','SATURN','URANUS','NEPTUNE','PLUTO','HAUMEA','MAKEMAKE','ERIS']


    if visible_or_not==None and explain==None:
        if name==None:
            console.print('[red]The name of the object is required[/red]')
            return

        if name=='EARTH':
            console.print('[red]you cannot observe Earth from Earth[/red]')
            return


        data = ctx.obj['topocentric'].topo(name,latitude,longitude,altitude,days,rktt,ephem)
        
    #    if name=='EARTH':
     #       return

        console.print(f'[cyan]name: [/cyan][bold white]{data['name']}[/bold white]\n\n[yellow]The following are the topocentric states for {data['name']} relative location //{latitude}, {longitude}, {altitude}] [/yellow//\n\n[cyan]UTC time: [/cyan][bold white]{data['UTC_time']} + {data['dayss']} days[/bold white]\n[cyan]Time: [/cyan][bold white]{data['time']} + {data['dayss']} days[/bold white]\n[cyan]elevation angle in degrees: [/cyan][bold white]{data['elevation_deg']}°[/bold white]\n[cyan]azimuth angle in degrees: [/cyan][bold white]{data['azimuth_deg']}°[/bold white]\n[cyan]slant range-The distance from your eyes to {data['name']}: [/cyan][bold white]{data['slant_range']} meters ¦ {data['slant_range']/ctx.obj['contin'].AU_m} AU[/bold white]\n[cyan]Horizontal slant_range: [/cyan][bold white]{data['horizontal_slant_range']} meters ¦ {data['horizontal_slant_range']/ctx.obj['contin'].AU_m} AU[/bold white]\n[yellow]Earth position vector relative SSB: [/yellow][bold white]{data['earth_pos_vector_rel_SSB']} meters[/bold white]\n[yellow]{data['name']} position vector relative SSB: [/yellow][bold white]{data[f'{data['name']}_pos_vector_rel_SSB']} meters[/bold white]\n[cyan]{data['name']} Geocentric distance: [/cyan][bold white]{data['r_geocentric_magn']} meters ¦ {data['r_geocentric_magn']/ctx.obj['contin'].AU_m} AU[/bold white]\n[yellow]Light takes {data['light_delay']} seconds, {data['light_delay']/60} minutes to reach your eyes from {data['name']}[/yellow]')
        return

    if visible_or_not==None and explain:
        if name==None:
            console.print('[red]The name of the object is required[/red]')
            return

        console.print(f'\n[yellow]The explain option requires a time delay of 1 minute for each object to allow your location on Earth to rotate 0.25° east.\ndelay.../\n\n\n')

        if name=='EARTH':
            console.print('[red]you cannot observe Earth from Earth[/red]')
            return

        data,exp = ctx.obj['topocentric'].topo_combined(name,latitude,longitude,altitude,days,rktt,ephem)

      #  if name=='EARTH':
       #     return

        console.print(f'[cyan]name: [/cyan][bold white]{data['name']}[/bold white]\n\n[yellow]The following are the topocentric states for {data['name']} relative location //{latitude}, {longitude}, {altitude}// [/yellow]\n\n[cyan]UTC time: [/cyan][bold white]{data['UTC_time']} + {data['dayss']} days[/bold white]\n[cyan]Time: [/cyan][bold white]{data['time']} + {data['dayss']} days[/bold white]\n[cyan]elevation angle in degrees: [/cyan][bold white]{data['elevation_deg']}°[/bold white]\n[cyan]azimuth angle in degrees: [/cyan][bold white]{data['azimuth_deg']}°[/bold white]\n[cyan]slant range-The distance from your eyes to {data['name']}: [/cyan][bold white]{data['slant_range']} meters ¦ {data['slant_range']/ctx.obj['contin'].AU_m} AU[/bold white]\n[cyan]Horizontal slant_range: [/cyan][bold white]{data['horizontal_slant_range']} meters ¦ {data['horizontal_slant_range']/ctx.obj['contin'].AU_m} AU[/bold white]\n[yellow]Earth position vector relative SSB: [/yellow][bold white]{data['earth_pos_vector_rel_SSB']} meters[/bold white]\n[yellow]{data['name']} position vector relative SSB: [/yellow][bold white]{data[f'{data['name']}_pos_vector_rel_SSB']} meters[/bold white]\n[cyan]{data['name']} Geocentric distance: [/cyan][bold white]{data['r_geocentric_magn']} meters ¦ {data['r_geocentric_magn']/ctx.obj['contin'].AU_m} AU[/bold white]\n[yellow]Light takes {data['light_delay']} seconds, {data['light_delay']/60} minutes to reach your eyes from {data['name']}[/yellow]\n\n[yellow]Explanation 1: [/yellow][bold white]{exp['setting']}[/bold white]\n[yellow]Explanation 2: [/yellow][bold white]{exp['explanation']}[/bold white]\n')
        return

    if visible_or_not and explain==None:
        console.print(f'\n[yellow]The explain option requires a time delay of 1 minute for each object to allow your location on Earth to rotate 0.25° east.\ndelay.../\n\n\n     [yellow]Solar system objects relative location //{latitude}, {longitude}, {altitude}//\n')
        if name=='EARTH':
            console.print('[red]you cannot observe Earth from Earth[/red]')
            return

        vis,dayz,timee,utctime = ctx.obj['topocentric'].which(latitude,longitude,altitude,days,rktt)

     #   if name=='EARTH':
      #      return

        
        for idx,itm in enumerate(vis):
            console.print(f'[yellow]{data_dict[idx]}: [/yellow][bold white]{itm}[/bold white] ((at {timee[idx]} UTCtime = {utctime[idx]})) + {dayz} days.')

        return

    #elif name and visible_or_not and explain==None:
     #   console.print('[red]if visible_or_not option is given a value, do not use it together with the name option[/red]')
    #    return


# the which method in topocentric can onlynread the luna states since the json file is one. and luna was the aim for the build.




@term.command
@click.option('--ctlog_number','-ctn',default=None,help='the catalogue number of the target satellite. the name will be shown in the final display\nThe ISS is also a satellite',type=int)
@click.option('--latitude','-lat',default=None,help='the latitude of the target location',type=float)
@click.option('--longitude','-long',default=None,help='the longitude of the target location',type=float)
@click.option('--altitude','-alt',default=None,help='the altitude of the target location',type=float)
@click.option('--explain','-expl',default=None,help='give this option a value if you want an explanation of whats happening.')
@click.pass_context
def Satellite(ctx,ctlog_number,latitude,longitude,altitude,explain):
    
    if latitude==None or longitude==None or altitude==None:
        console.print('[red]The geodetic values: latitude, longitude, altiitude are all needed to continue..[/red]')
        return


    sate = sate_posvel(ctlog_number,'tle',latitude,longitude,altitude)
   # exp = ctx.obj['topocentric'].rise_set()
    
    if explain==None:
        console.print(f'\n[cyan]Satellite Name: [/cyan][bold white]{sate['satellite_name']}[/bold white][yellow] Catalogue number: [/yellow][white]{sate['catnr']}[/white]\n\n[yellow]UTC time: [/yellow][bold white]{sate['UTC_time']}[/bold white]\n[yellow]Local time: [/yellow][bold white]{sate['time_simple']}[/bold white]\n[yellow]Julian Date: [/yellow][bold white]{sate['julian_date']}\n\n[cyan]Elevation angle above local horizon: [/cyan][bold white]{sate['elevation_deg']}°[/bold white]\n[cyan]Azimuth angle measured clockwise from North: [/cyan][bold white]{sate['azimuth_deg']}°[/bold white]\n[cyan]ECEF Earth-centered-Earth-Fixed position vector :Relative Earths center: [/cyan][bold white]{sate['lists'][0]} -km- [/bold white][yellow]magnitude: [/yellow][bold white]{vectors.magn_vect(sate['lists'][0])} -km-[/bold white]\n[cyan]ECEF velocity vector: [/cyan][bold white]{sate['lists'][1]} -km/s-[/bold white][yellow]magnitude: [/yellow][bold white]{vectors.magn_vect(sate['lists'][1])}\n[cyan]The Range from your eyes to {sate['satellite_name']}: [/cyan][bold white]{sate['range_km']} -km-[/bold white]\n[yellow]Light takes {sate['light_delay']} seconds, {sate['light_delay']/60} minutes to reach your eyes from {sate['satellite_name']}[/yellow]')

    else:
        exp = ctx.obj['topocentric'].rise_set(None,ctlog_number,latitude,longitude,altitude)
        console.print(f'[cyan]Satellite name: [/cyan][bold white]{sate['satellite_name']}[/bold white][yellow] Catalogue number: [/yellow][white]{sate['catnr']}[/white]\n\n[yellow]The following are the topocentric states for {sate['satellite_name']} relative location //{latitude}, {longitude}, {altitude}// [/yellow]\n\n[cyan]UTC time: [/cyan][bold white]{sate['UTC_time']} + 0 days[/bold white]\n[cyan]Local Time: [/cyan][bold white]{sate['time_simple']} + 0 days[/bold white]\n[cyan]elevation angle in degrees: [/cyan][bold white]{sate['elevation_deg']}°[/bold white]\n[cyan]azimuth angle in degrees: [/cyan][bold white]{sate['azimuth_deg']}°[/bold white]\n[cyan]slant range-The distance from your eyes to {sate['satellite_name']}: [/cyan][bold white]{sate['range_km']} -km- ¦ {((sate['range_km']*1000)/ctx.obj['contin'].AU_m)} AU[/bold white]\n[cyan]Horizontal slant_range: [/cyan][bold white]{sate['horizontal_slant_range']} -km- ¦ {((sate['horizontal_slant_range']*1000)/ctx.obj['contin'].AU_m)} AU[/bold white]\n[yellow]Light takes {sate['light_delay']} seconds, {sate['light_delay']/60} minutes to reach your eyes from {sate['satellite_name']}[/yellow]\n\n[yellow]Explanation 1: [/yellow][bold white]{exp['setting']}[/bold white]\n[yellow]Explanation 2: [/yellow][bold white]{exp['explanation']}[/bold white]\n')


