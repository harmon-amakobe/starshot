# astlo
This Readme follows a First In Last Out format. Therefore the newest update is at the top of the file.


The released version v12.5.5111 is just but the core engine. The full features requires the full engine that is greater than 100MB which github cannot allow.
The dist folder contains a v12_core = the core engine < 100KB

The Core engine remains less than 100KB


# General-previous builds and features.
- focusing on launchsims module and upgrading core to supoort objects outside the Solar system = Stars.
- added objects = (APOPHIS,HALLEY,BENNU,EROS) and a dedicated method that focuses on visualizing Near Earth Objects like Apophis or Bennu in their true orbits.
- v12.10.5111 = added comet support. the engine can also track the comets.
countdown to next 1P/Halley perihelion approach. ill be 53 years old then 🍀. maybe i wont even make it to my 50's.
- plus v12.10.5111 has a way for timestepping to day/second/hour/year X then visualizing the result vectors in either 2D or 3D using integraters like rk4 4rth order integration. Examole = visualizing the upcomimg 2029 Apophis and Earth close approach 2D/3D single (apophis and Earth orbits visuals). or visualizing the state of jupiter and inner solar system after time X. or the whole solar system.
- Did you know that 1P/Halley comet has a final perihelion distance of 0.6AU. This comet gets closer to the sun more than Earth does at 0.98AU
- Dwarf planet Eris is waaay farther out than 1P/Halley.

comets supported.
1P/Halley.
Apophis = track and visualize the upcoming April 13 Apophis and Earth close approach 
and more to be added...

v12.10.5111 = NORAD numbers are nowadays issued as 6 digit numbera. updated Eo module to track 6 digit catalogue numbers. therefore it supoorts both json and tle two line elemwnt file formats 


v12.5 in the dist folder cannot track the 6 digit NORAD numbers.


I have an idea for Astlo. The long term aim of this feature is to allow later generations to access data of past generations. Imagine knowing how a town, an ancestor, a plant or memories from a random person looked like while also knowing the true states of Earth or the Sun or Pluto right now or millions and billions of years into the future or past.

- Anyone shares pictures of Planet Earth because Anything/Everything on Planet Earth is a Feature of Planet Earth.
- Memories, Plants, People, Life, history, anything about Earth.



v12_full is larger than 100MB only becuase of the multimedia part (the part with the pictures and videos). Therefore i cannot upload it to github. Pypi account under creation



v12.0.0_full features..

The following are just the top/front-end features of version v12.0.0 - public..
For the full explanation of what and how Astlo works, The documentation is under creation.

- Tracking of any Earth satellite X relative any position in the world provided you know the NORAD number of the satellite, Your Geodetic coordinates namely: latitude=(North or South) longitude=(East or West) altitude=(if meters or kilometers, Astlo will be guide the user. This means it can tell you where satellite X is in your local sky and horizon in real-time. Of clurse this feature requires an internet connection for the NORAD number lookup
    
- a beta internal module still on experimentation using google earthengine-api to access and analyze Earth observation satellite data. 

- Topocentric coordinates of any solar system object including the moon provided you know your latitude, longitude and altitude Geodetic coordinate of your target location. This means it can twll you where the sun or Venus or the moon or any solar system object is in your local sky and horizon through elevation and azimuth angles. in real-time. Offline

- it tells the current moon face and phase and the illumination percentage and element.

- a dedicated module that tells the history and characteristics of any solar system object while also showing available images randomly. For Earth, random images of life, plants, houses and people activities may be shown randomly. This is because Everything on Earth is a feature of Earth. This feature makes Astlo to grow in size very much. The core engine remains <100KB

- rungekutta 4rth order intergration for precision and timestepping billions of years into the future and also the past. A sort of states time machine?







v7.112.173 features...
- Separate module mat. Handles all the 3D rendering and some 2D stuff and returns all the objects.
- module solexp handles the visuizations Eg the Specific mechanical energy against Distance from the Hiocenter, The real-time true anomaly visual for visualizing the current state of the system in one view. However, astlo handles both barycentric and Heliocentric frames
- module vect for ¦vectors¦ that handles vectors and other numeric arithmetics. It can be used seperatly in other imports. astlo ¦ CLI-SDK
- a growing module launchsims for experimenting with diffrent types of engines and mission planning.
- the command line interface command anmte now can show the real time 2D states of jupiter and the inner planets in one view.




======HANDLES 3D AND 2D REAL-TIME POSITIONS VISUALIZATIONS OF THE FULL SOLAR SYSTEM ¦11 OBJECTS, 3D JUPITER AND THE INNER PLANETS, INNER PLANETS ONLY ..ALL OPTIONAL..¦ |¦¦| 16 OBJECTS WITH FULL STATES AND VALUES AND OSCULATING ELELMENTS REAL-TIME.J2000 . WITH ZERO PREMADE HEAVY SPACE LIBRARIES. || A LIGHT WEIGHT ¦< 60KB¦ CLI + SDK . BUILT ON MOBILE FOR NAVIGATING THE SOLAR SYSTEM ON THE GO WITHOUT INTERNET OR LIMITED TECH POWER======

**A real-time and still developing Astronomy/Astrophysics/celestial orbital mechanics engine**
An extensible curently focused on orbital mechanics library for tracking the debris.
CLI + SDK.
Written in pure Python with plotext and optional matplotlib and numpy support


Copyright Maxharia [@iamnothimbutwe both on github and gitlab]

All rights reserved.

Unauthorized copying, modification, distribution, or commercial use of this software (or substantial portions of it) is strictly prohibited without express written permission from the author.



![Python](https://img.shields.io/badge/Python-3.8%2B-blue)


### Features

*This are past features but they are still included in the full bundle.

- Real-time **barycentric** (SSB) and **heliocentric** position, velocity and gravitational acceleration vectors for **16 bodies**:
  - Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto
  - Ceres, Vesta, Pallas, Hygiea, Haumea, Makemake, Eris
  - real-time position vectors of the Sun relative to the SSB barycenter due to all major planets. Although every Solar system object accounts for the SSB.
- **Perifocal (xy)**, **Heliocentric state vectors and state vectors relative SSB.
- Distances in **meters, kilometers, AU**
- **Light delay** (seconds + minutes) from Earth,SSB and Heliocenter
- Orbital velocity using real time velocity vectors relative SSB (m/s and km/s)
- **Mean anomaly** and **Eccentric anomaly**
- Full orbital period animation using **days + AU and seconds + AU**
- **Parallax angle**, distance in **parsecs**, **light years**
- **Specific orbital energy (E)** → automatically classifies orbit type:
  - Circle / Ellipse / Parabola / Hyperbola
- Terminal **orbit plotting** (eccentric orbits) using plotext 2D
- Optional 3D Real-time position Renders using matplotlib for the full 11 solar system objects, a 3D view of jupiter and the inner planets, a 3D view of the inner planets.
- Clean, colored terminal output with tables.




### Contacts
- astlospacesystems@gmail.com
- Github and Gitlab both @iamnothimbutwe
- reddit r/kenyaspacenerds

>...**astlo was and is being developed on Linux from a mobile phone**..join us at r/kenyaspacenerds.


- Terminal plotting with plotext: in some orbits like Eris, Because Eris has a massive orbital inclination i approx 44°, it is "diving" deep below the ecliptic plane. the program only plots X and Y, you will be looking at the shadow of the orbit, not the actual 3D length. some of the distance is shifted to the Z axis.


### Installation

```
use pip install 'whl' to install the whl once downloaded.
```

a better Dictionary is under creation. A dictionary that explains what astlo does and how to make it do it.

### QUICK Start: SDK & Methods
! [[python IDE](assets/hello.jpg)](assets/hello.jpg)

! [[python IDE](assets/hello2.jpg)](assets/hello2.jpg)

! [[phthon IDE](assets/hello3.jpg)](assests/hello3.jpg)

! [[python IDE](assets/hello4.jpg)](assets/hello4.jpg)
 
! [[python IDE](assets/hello5.jpg)](assets/hello5.jpg)
 
! [[python IDE](assets/hello6.jpg)](assets/hello6.jpg)
 
! [[python IDE](assets/hello7.jpg)](assets/hello7.jpg)
 
! [[python IDE](assets/hello8.jpg)](assets/hello8.jpg)
 
! [[python IDE](assets/hello9.jpg)](assets/hello9.jpg)
 
! [[python IDE](assets/hello10.jpg)](assets/hello10.jpg)
 
! [[python IDE](assets/hello11.jpg)](assets/hello11.jpg)
 
! [[python IDE](assets/hello12.jpg)](assets/hello12.jpg)

! [[python IDE](assets/hello13.jpg)](assets/hello13.jpg)

! [[python IDE](assets/hello14.jpg)](assets/hello14.jpg)

! [[python IDE](assets/hello15.jpg)](assets/hello15.jpg)

! [[python IDE](assets/hello16.jpg)](assets/hello16.jpg)

! [[python IDE](assets/hello17.jpg)](assets/hello17.jpg)

! [[python IDE](assets/hello18.jpg)](assets/hello18.jpg)

! [[python IDE](assets/hello19.jpg)](assets/hello19.jpg)

! [[python IDE](assets/hello20.jpg)](assets/hello20.jpg)

! [[python IDE](assets/hello21.jpg)](assets/hello21.jpg) 

! [[python IDE](assets/hello22.jpg)](assets/hello22.jpg)

! [[python IDE](assets/hello23.jpg)](assets/hello23.jpg)

! [[python IDE](assets/hello24.jpg)](assets/hello24.jpg)

! [[python IDE](assets/hello40.jpg)](assets/hello40.jpg)

! [[python IDE](assets/hello41.jpg)](assets/hello41.jpg)


### CLI: Command Line Interface
! [[terminal](assets/hello25.jpg)](assets/hello25.jpg)

! [[terminal](assets/hello26.jpg)](assets/hello26.jpg)

! [[terminal](assets/hello27.jpg)](assets/hello27.jpg)

! [[terminal](assets/hello28.jpg)](assets/hello28.jpg)

! [[terminal](assets/hello29.jpg)](assets/hello29.jpg)

! [[terminal](assets/hello30.jpg)](assets/hello30.jpg)

! [[terminal](assets/hello31.jpg)](assets/hello31.jpg)

! [[terminal](assets/hello32.jpg)](assets/hello32.jpg)

! [[terminal](assets/hello33.jpg)](assets/hello33.jpg)

! [[terminal](assets/hello34.jpg)](assets/hello34.jpg)

! [[terminal](assets/hello35.jpg)](assets/hello35.jpg)

! [[terminal](assets/hello36.jpg)](assets/hello36.jpg)

! [[terminal](assets/hello37.jpg)](assets/hello37.jpg)

! [[terminal](assets/hello38.jpg)](assets/hello38.jpg)

! [[terminal](assets/hello39.jpg)](assets/hello39.jpg)




