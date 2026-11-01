export const CRAFT_PIXELS_PER_UNIT = 62 / 2.8;
export const ENGINE_PIXELS_PER_UNIT = CRAFT_PIXELS_PER_UNIT * Math.cos(0.18);
export const ENGINE_FRONT_PX = 0.64 * ENGINE_PIXELS_PER_UNIT;
export const ENGINE_RETRACTED_PX = 1.12 * ENGINE_PIXELS_PER_UNIT;

export function engineInput(
  craft: [number, number],
  grip: [number, number],
  start: [number, number],
  pointer: [number, number],
  travel: number,
  prograde: number,
  sign = 1,
) {
  const target: [number, number] = [
    grip[0] + pointer[0] - start[0],
    grip[1] + pointer[1] - start[1],
  ];
  const dx = craft[0] - target[0],
    dy = target[1] - craft[1],
    heading = Math.atan2(dy, dx) - prograde;
  const angle = Math.max(
    -35,
    Math.min(35, (sign * Math.atan2(Math.sin(heading), Math.cos(heading)) * 180) / Math.PI),
  );
  const limitedHeading = prograde + (sign * angle * Math.PI) / 180;
  const extension =
    dx * Math.cos(limitedHeading) + dy * Math.sin(limitedHeading) - ENGINE_RETRACTED_PX;
  return { strength: Math.max(0, Math.min(1, extension / travel)), angle, target };
}
