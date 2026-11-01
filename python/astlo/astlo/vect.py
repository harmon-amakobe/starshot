
import math
from rich.console import Console
from rich.table import Table
from collections.abc import Iterable
#from .astlo import Astro

console=Console()


class Vectors():
    '''the full vectors class'''
    def __init__(self,comp_1=None,comp_2=None,comp_3=None,comp_4=None,comp_5=None,comp_6=None):
        #super().__init__()

        if comp_1==None or comp_2==None or comp_3==None or comp_4==None or comp_5==None or comp_6==None:
            #return 'all 3 components -total 6- of both vectors expected'
            return None

    #def vect_1(self,comp_1=None,comp_2=None,comp_3=None):
        if comp_1 and comp_2 and comp_3:
            new = [comp_1,comp_2,comp_3]
        else:
            return 'missing vector component'

        try:
            g = []
            for _ in new:
                g.append(float(_)) #float handles both int and float
        except ValueError:
            return f'component type not supported: {_}' #only if alpha

        self.v_1 = g

    #def vect_2(self,comp_1=None,comp_2=None,comp_3=None):
        if comp_4 and comp_5 and comp_6:
            new = [comp_4,comp_5,comp_6]
        else:
            return 'missing vector component'

        try:
            k = []
            for _ in new:
                k.append(float(_))
        except ValueError:
            return f'component type not supported: {_}'

        self.v_2 = k

    def add_vect(self,vect=None,veect=None):
        '''add two vectors. only accepts iterables'''
        if vect and veect:
            if not isinstance(vect,(list)) or not isinstance(veect,(list)):
                return f'add_vect accepts only iterables: {vect} {veect}'
            try:
                g = []
                k = []
                for _,i in enumerate(vect):
                    g.append(float(i))
                    k.append(float(veect[_]))
            except ValueError:
                return f'component type not supported: {i} {veect[_]}'

            X = (g[0])+(k[0])
            Y = (g[1])+(k[1])
            Z = (g[2])+(k[2])
            return [X,Y,Z]

        else:
            return 'add_vect expected two vectors'

    def sub_vect(self,vect=None,veect=None): 
        '''subtract two vectors. only iterables'''
        if vect and veect:
            if not isinstance(vect,(list)) or not isinstance(veect,(list)):
                return f'sub_vect accepts only iterables: {vect} {veect}'
            try:
                g = []
                k = []
                for _,i in enumerate(vect):
                    g.append(float(i))
                    k.append(float(veect[_]))
            except ValueError:
                return f'component type not supported: {i} {veect[_]}'

            X = (g[0])-(k[0])
            Y = (g[1])-(k[1])
            Z = (g[2])-(k[2])
            return [X,Y,Z]

        else:
            console.print('[bold red]sub_vect expected two vectors[/bold red]')
            return 'sub_vect expected two vectors'

    def iadd_vect(self):
        '''adds the initialized vectors'''
        if not isinstance(self.v_1,(list)) or not isinstance(self.v_2,(list)):
            return f'iadd_vect accepts only iterables: {self.v_1} {self.v_2}'
        X = (self.v_1[0]+self.v_2[0])
        Y = (self.v_1[1]+self.v_2[1])
        Z = (self.v_1[2]+self.v_2[2])
        return [X,Y,Z]

    def isub_vect(self):
        '''subs the initialized vectors'''
        if not isinstance(self.v_1,(list)) or not isinstance(self.v_2,(list)):
            return f'isub_vect accepts only iterable: {self.v_1} {self.v_2}'
        X = (self.v_1[0]-self.v_2[0])
        Y = (self.v_1[1]-self.v_2[1])
        Z = (self.v_1[2]-self.v_2[2])
        return [X,Y,Z]

    ##could have used all of the logic within one single add/sub method

    def magn_vect(self,new=None,new_1=None): ##give both arg values to get magn'add, magn'sub for both vectors
        '''gets the magnitude for initialized or new vector. the first argument as the target'''
        if new==None and new_1==None:
            console.print('[bold red]two vectors expected by magn_vect[/bold red]')
            return 'two vectors expected by magn_vect'

        if new and new_1==None: ##if one magn needed
            if not isinstance(new,(list)):
                return f'magn_vect accepts Iterable only: {new}'
            try:
                g=[]
                for _ in new:
                    g.append(float(_))
            except ValueError:
                return f'component type not supported: {_}'

            mgn = math.sqrt(math.pow(g[0],2) + math.pow(g[1],2) + math.pow(g[2],2))
            return mgn

        if new and new_1:
            if not isinstance(new,(list)) or not isinstance(new_1,(list)):
                return f'magn_vect only accepts Iterable: {new} {new_1}'
            try:
                g = []
                k = []
                for _,i in enumerate(new):
                    g.append(float(i))
                    k.append(float(new_1[_]))
            except ValueError:
                return f'component type not supported: {i} {new_1[_]}'

            mgn_new = math.sqrt(math.pow(g[0],2) + math.pow(g[1],2) + math.pow(g[2],2))
            mgn_new_1 = math.sqrt(math.pow(k[0],2) + math.pow(k[1],2) + math.pow(k[2],2))
            mgnof_add = math.sqrt(math.pow((g[0] + k[0]),2) + math.pow((g[1] + k[1]),2) + math.pow((g[2] + k[2]),2))
            mgnof_sub = math.sqrt(math.pow((k[0] - g[0]),2) + math.pow((k[1] - g[1]),2) + math.pow((k[2] - g[2]),2))

            mgn_mult = mgn_new*mgn_new_1
            if mgn_new_1==0:
                return 'magnitude 2 is zero. Prevents zerodivision error'
            mgn_div = mgn_new/mgn_new_1 #ratio
            mgn_add = mgn_new+mgn_new_1
            mgn_sub = mgn_new-mgn_new_1
            chord = math.sqrt(math.pow((k[0] - g[0]),2) + math.pow((k[1] - g[1]),2) + math.pow((k[2] - g[2]),2))#assumes body vector X and Y dhare a common Center of mass...and vector X/g is the default target body.


            #mgn_add = mgn_new + mgn_new_1
            #mgn_sub = mgn_new - mgn_new_1

            return [mgn_new,mgn_new_1,mgn_add,mgn_sub,mgn_mult,mgn_div,mgnof_add,mgnof_sub,chord] # vector1 + vectro2, vector1 - vector2
        

    def imagn_vect(self):
        '''gets thw magnitude values for initialized vectors'''
        ##initialized vectors part##
        mgn_v_1 = math.sqrt(math.pow(self.v_1[0],2) + math.pow(self.v_1[1],2) + math.pow(self.v_1[2],2))
        magn_v_2 = math.sqrt(math.pow(self.v_2[0],2) + math.pow(self.v_2[1],2) + math.pow(self.v_2[2],2))


        #mgn_add = mgn_v_1 + mgn_v_2 only if they are poitning in the same direction.
        mgnof_add = math.sqrt(math.pow((self.v_1[0]+self.v_2[0]),2) + math.pow((self.v_1[1]+self.v_2[1]),2) + math.pow((self.v_1[2]+self.v_2[2]),2))
        mgnof_sub = math.sqrt(math.pow((self.v_1[0]-self.v_2[0]),2) + math.pow((self.v_1[1]-self.v_2[1]),2) + math.pow((self.v_1[2]-self.v_2[2]),2))
        mgn_mult = mgn_v_1*mgn_v_2
        if mgn_v_2==0:
            return 'magnitude 2 is zero. Prevents zerodivision error'

        mgn_div = mgn_v_1/mgn_v_2 #ratio
        mgn_add = mgn_v_1 + mgn_v_2
        mgn_sub = mgn_v_1 - mgn_v_2
        #mgn_sub = mgn_v_1 - mgn_v_2 only..

        return [mgn_v_1,mgn_v_2,mgn_add,mgn_sub,mgn_mult,mgn_div,mgnof_add,mgnof_sub] # initialized components/vectors mgn,mgn_add and magn_sub

    def dot_vect(self,new=None,new_1=None):
        '''gets the dot product of two new vectors or the initialized component vectors'''
        if (new and new_1==None) or (new==None and new_1) or (new==None and new_1==None):
            console.print('[bold red]the dot product requires two vectors[/bold red]')
            return
        if not isinstance(new,(list)) or not isinstance(new_1,(list)):
            return 'dot_vect expected Iterables: {new} {new_1}'

        try:
            g = []
            k = []
            for _,i in enumerate(new):
                g.append(float(i))
                k.append(float(new_1[_]))
            dot = (g[0]*k[0]) + (g[1]*k[1]) + (g[2]*k[2])
            return dot
        except ValueError:
            console.print('[bold red]component type not supported[/bold red]')
            return 'component type not supported'

        #dot = (g[0]*k[0]) + (g[1]*k[1]) + (g[2]*k[2])


    def idot_vect(self):
        '''dot product of the initialized vectors'''
        ##initialized components##
        dot = (self.v_1[0]*self.v_2[0]) + (self.v_1[1]*self.v_2[1]) + (self.v_1[2]*self.v_2[2])
        return dot


    def cross_vect(self,new=None,new_1=None):
        '''gets the cross product of the new vectors or the initialized vectors'''
        if new==None or new_1==None:
            console.print('[bold red]cross vectros expected two vectors[/bold red]')
            return 'cross vectors expected two vectors'

        if not isinstance(new,(list)) or not isinstance(new_1,(list)):
            console.print(f'[bold red]cross_vect expected iterables[bold red]')
            return f'cross_vect expected iterables: {new} {new_1}'

        try:
            g = [] #g is the first vectro like getting thw angular momentum, r is the first vector
            k = []
            for _,i in enumerate(new):
                g.append(float(i))
                k.append(float(new_1[_]))

            cross_X = (g[1]*k[2]) - (g[2]*k[1])
            cross_Y = (g[2]*k[0]) - (g[0]*k[2])    
            cross_Z = (g[0]*k[1]) - (g[1]*k[0])

            mgn_cross = math.sqrt(math.pow(cross_X,2) + math.pow(cross_Y,2) + math.pow(cross_Z,2))

            
            return [cross_X,cross_Y,cross_Z,mgn_cross]

        except ValueError:
            raise ValueError(f'component type not supported: {i} {new[_]}')

    def icross_vect(self):
        '''gets the cross product of the initialized vectors'''

        ###initialized vectors##

        cross_X = (self.v_1[1]*self.v_2[2]) - (self.v_1[2]*self.v_2[1])
        cross_Y = (self.v_1[2]*self.v_2[0]) - (self.v_1[0]*self.v_2[2])
        cross_Z = (self.v_1[0]*self.v_2[1]) - (self.v_1[1]*self.v_2[0])
        mgn_cross = math.sqrt(math.pow(cross_X,2) + math.pow(cross_Y,2) + math.pow(cross_Z,2))
        return [cross_X,cross_Y,cross_Z,mgn_cross]

    def signum(self,number=None):
        '''tells if a number is a negative or positive'''
        if number==None or number==0:
            raise ValueError('signum requires one value or 0 was given as the value')

        try:
            f=float(number)
            if (f+f)==(f*2):
                u = f+f
                if '-' in str(u):
                    return 'negative'
                else:
                    return 'positive'
            else:
                return 'False'

            
        except ValueError:
            raise ValueError(f'value type is not supported: {number}')
###😅 just use if < 0 then negatuve and positive else


    def angle(self,new=None,new_1=None):
        '''gets the angle btwn two vectors and initialized'''
        if new==None or new_1==None:
            console.print('[bold red]angle expected two vectors[/bold red]')
            return 'angle expected two vectors'           

        if not isinstance(new,(list)) or not isinstance(new_1,(list)):
            raise TypeError('angle expected two iterables[list]')

        
        dot_prod = self.dot_vect(new,new_1)
        magn = self.magn_vect(new,new_1)
        if magn[4]==0:
            return 'magnitude is zero. Prevents zerodivision error'
        ang = math.degrees(math.acos(dot_prod/magn[4])) % 360
        if ang:
            val = f'angle between vectors: {ang}'
            return f'{val}°'
        elif dot_prod==0:
            val = f'vectors are perpendicular 90°: {dot_prod}'
            return val
        elif self.signum(dot_prod)=='negative':
            return f'vectors are opposite: {dot_prod}'
        elif self.signum(dot_prod)=='positive':
            return f'vectors are aligned. same direction: {dot_prod}'

    def iangle(self):
        '''initialized vectors determinant'''

        ##initialized vectros##
        dot_prod = self.idot_vect()
        magn = self.imagn_vect()
        if magn[4]==0:
            return 'magnitude is zero. Prevents zerodivision error'

        ang = math.degrees(math.acos(dot_prod/magn[4])) % 360
        if ang:
            val = f'angle between vectors: {ang}'
            return f'{val}°'
        elif dot_prod==0:
            val = f'vectors are perpendicular 90°: {dot_prod}'
            return val
        elif self.signum(dot_prod)=='negative':
            return f'vectors are opposite: {dot_prod}'
        elif self.signum(dot_prod)=='positive':
            return f'vectors are aligned. same direction: {dot_prod}' 



    def normalize(self):
        pass


