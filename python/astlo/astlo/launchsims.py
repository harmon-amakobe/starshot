# ---------------------------------------------------------
# Copyright (c) 2026 Mark. All rights reserved.
# Unauthorized copying of this file, via any medium, is
# strictly prohibited. developed by Mark Macharia [iamnothimbutwe] on Github.
# ---------------------------------------------------------


#import time
from rich.console import Console
#from rich.table import Table
from .vect import Vectors


vect = Vectors()
console=Console()

class Lsim:
    '''THE LAUNCH SIMS CORE ENGINE'''

    def __init__(self): #name of reocket 👀
        #self.rocketname = rocketname
        self.Merlin_space_X_engine = {'thrust_sea_level':845000,'si_thrust':'N','SI_thrust':'N Newtons','spec_impulse_slevel':282,'si_spimp':'s','SI_spimp':'s seconds','spec_impulse_vcm':311,'dry_mass':470,'si_drymass':'kg','name':'Merlin SpaceX Engine 1D'} #the ones to follow should use the same format
        self.sup = {'m_sx':self.Merlin_space_X_engine} #the supoorted engine
        self.g_zero = 9.80665 # m/s2
        self.TWR_standard = 1.3





    def wetmass(self,supported: str=None,thrust_slevel=None,twr=1.3,isp_slevel=None): #supported for suppted engines, twr thrust to weight ratio at 1.3 industry standard, supported if not None is the code word for the supted Engine...assumes values 
        '''gets the wet mass and the mass flow ratio of the rocket at launch using the standard 1.3 thrust to weight ratio. Assumes values enetered are at sea level. the mass flow rate assumes full throttle'''

        if supported==None and thrust_slevel==None and isp_slevel==None:
            console.print('[bold red]choose one between a supported engine and one of your own')
            return


        if supported==None and thrust_slevel and isp_slevel:
            pass

        if supported==None and thrust_slevel and isp_slevel==None:
            console.print('[bold red]engine thrust at sea level not given[/bold red]')
            return
        if supported==None and thrust_slevel==None and isp_slevel:
            console.print('[bold red]engjne specific impulse at sea level not given[/bold red]')
            return

        if (supported and thrust_slevel) or (supported and isp_slevel) or (supported and thrust_slevel and isp_slevel):
            console.print('[bold red]choose one between a supported engine and one of your own[/bold red]')
            return




        #try:

         #   thrust_slevel = float(thrust_slevel) #if error arises due to none number then automatically will handle it
        #    isp_slevel = float(isp_slevel)
       #     twr = float(twr)
       # except ValueError:
      #      raise ValueError()





        if supported and thrust_slevel==None and isp_slevel==None:
            while supported in self.sup:
                engine = self.sup.get(supported,'ERROR') #returns the corrssponding engine


                wet_mass = (engine['thrust_sea_level']/(twr*self.g_zero)) #kg
                mass_flow_rate = (engine['thrust_sea_level']/(engine['spec_impulse_slevel']*self.g_zero)) #kg/s...if runs at full throttle, this is the mass flow rate per second

                break

            else:
                console.print('[bold red]Wrong spelling or engine not supported[/bold red]')
                return


            return {'rocket_wet_mass':wet_mass,'mass_flow_rate':mass_flow_rate,'si':'kg and kg/s','TWR_used':twr,'engine_thrust_slevel_N':engine['thrust_sea_level'],'engine_isp_slevel_s':engine['spec_impulse_slevel'],'engine_name':engine['name']}


        
        try:

            thrust_slevel = float(thrust_slevel) #if error arises due to none number then automatically will handle it
            isp_slevel = float(isp_slevel)
            twr = float(twr)
        except ValueError:
                raise ValueError()


        ##if non supported wngine##
        wet_mass = (thrust_slevel/(twr*self.g_zero)) #kg
        mass_flow_rate = (thrust_slevel/(isp_slevel*self.g_zero))

        return {'engine_name':'Aslo','rocket_wet_mass':wet_mass,'mass_flow_rate':mass_flow_rate,'engine_thrust_slevel_N':thrust_slevel,'TWR_used':twr,'engine_isp_slevel_s':isp_slevel,'si':'kg and kg/s'}



        











