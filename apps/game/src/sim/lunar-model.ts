import rail from '@starshot/ephemeris/moon-rail.json';
import { LunarModel } from '@starshot/physics/lunar';

// The only module that imports the Moon rail. Consumers import it here directly, never
// through a re-export, so code that only builds a request never pulls the rail in.
export const lunarModel = new LunarModel(rail);
