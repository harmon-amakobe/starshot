export const assetBase = new URL(
  `${import.meta.env.BASE_URL}observatory/`,
  typeof document === 'undefined' ? 'http://localhost/' : document.baseURI,
).href;
export interface MoonMeta {
  id: string;
  parent: string;
  offset: number;
  count: number;
}
export interface SceneData {
  physical: { bodies: Record<string, { RADII: number[]; [key: string]: unknown }> };
  rails: { startEt: number; endEt: number; moons: MoonMeta[] };
  astronomy: {
    orientation: (body: unknown, et: number) => number[][] | null;
    satelliteState: (meta: MoonMeta, data: Float64Array, et: number) => number[];
    moonRadii: Record<string, number>;
  };
  rings: Record<string, Array<[string, number, number, number, string?]>>;
}
let promise: Promise<SceneData> | null = null,
  satellitePromise: Promise<Float64Array> | null = null;
export function loadSceneData() {
  return (promise ??= Promise.all([
    fetch(`${assetBase}system-orientation.json`).then((r) => {
      if (!r.ok) throw Error('Body data unavailable');
      return r.json();
    }),
    fetch(`${assetBase}satellite-data.json`).then((r) => r.json()),
    import(/* @vite-ignore */ `${assetBase}system-astronomy.js`),
    import(/* @vite-ignore */ `${assetBase}system-rings.js`),
  ]).then(([physical, rails, astronomy, ring]) => ({
    physical,
    rails,
    astronomy,
    rings: ring.rings,
  })));
}
export function loadSatellites() {
  return (satellitePromise ??= fetch(`${assetBase}satellite-states.bin`)
    .then((r) => {
      if (!r.ok) throw Error('Moon positions unavailable');
      return r.arrayBuffer();
    })
    .then((buffer) => new Float64Array(buffer)));
}
