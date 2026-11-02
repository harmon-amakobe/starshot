
# Copyright © 2026 Mark Macharia [@iamnothimbutwe Github]
# All rights reserved.                                                
# Unauthorized copying, modification, distribution, or commercial use of this software (or substantial portions of it) is strictly prohibited without express written permission from the author.


"""
astlo
=====

A developing Astronomy/Astrophysics/Astrodynamics/celestial orbital mechanics engine.

Features:
- Barycentric & Heliocentric & Topocentric coordinates (17+ bodies)
- Real-time states.
- Full orbital propagation.
- 
- Terminal plotting with plotext
- 3D and 2D visuals.
- Does not pull data externally except from a de440 file
- Rungekutta 4rth order accuracy
- Topocentric satellite tracking for local sky/horizon
- Topocentric planet/moon/asteroid/dwarf planet/star/Earth satellite Tracking for local sky/horizon
- custom Vectors class
- manipulation of Eo satellite data through google earthengine-api
- inbuilt Multimedia for explanation and space science
"""

__version__ = 'v12.5.5130000' #000=='core'
__author__ = "@iamnothimbutwe Github and Gitlab"
__email__ = "astlospacesystems@gmail.com"

# Exposing the main classes so users can do clean imports
#from .astlo import Astro
from .contin import Contin
from .vect import Vectors
from .mat import Mat #the 3D visualizer
from .launchsims import Lsim
from .solexp import Solexp
from .eo import Eo, sate_posvel
from .topocentric import Topocentric
# Make theese classes available when someone does "from astlo import *"
__all__ = ['Eo','Lsim','Solexp',"Contin",'Mat','Vectors',"__version__",'Topocentric','sate_posvel','__email__']
