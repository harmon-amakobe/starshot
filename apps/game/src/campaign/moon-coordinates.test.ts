import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { norm, sub } from '@starshot/ephemeris';
import { DAY, LAUNCH_ET } from '@starshot/physics/lunar';
import { MOONSHOT } from '../missions';
import { lunarModel } from '../sim/lunar-model';
import { freshSession } from './session';
import { makeFrame } from './frame';
import { ThreeScene } from './three-scene';
import type { SceneState } from './scene-types';
import type { SceneData } from './scene-data';

// Keep all transforms and meshes real; only the GPU and texture transport are absent.
vi.mock('three', async importOriginal => {
  const actual = await importOriginal<typeof THREE>();
  return {
    ...actual,
    WebGLRenderer: class {
      setPixelRatio() {}
      getPixelRatio() { return 1; }
      setSize() {}
      render() {}
      clearDepth() {}
      dispose() {}
    },
    TextureLoader: class { load() { return new actual.Texture(); } },
  };
});

const assets = new URL('../../../prototype/public/observatory/', import.meta.url);
const json = (name: string) => JSON.parse(readFileSync(new URL(name, assets), 'utf8'));
const bytes = readFileSync(new URL('satellite-states.bin', assets));
const satellites = new Float64Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 8);
const astronomy = await import(new URL('system-astronomy.js', assets).href);
const data: SceneData = {
  physical: json('system-orientation.json'), rails: json('satellite-data.json'),
  astronomy, rings: {},
};
afterEach(() => vi.unstubAllGlobals());

describe('Moon coordinates through production frames and meshes', () => {
  it.each([
    ['system', false], ['system', true], ['free', false], ['free', true],
  ] as const)('stays within 1 km hourly in %s view with trueSize=%s', (camera, trueSize) => {
    vi.stubGlobal('devicePixelRatio', 1);
    const scene = new ThreeScene({ width: 390, height: 844 } as HTMLCanvasElement);
    scene.setData(data);
    const internals = scene as unknown as {
      satellites: Float64Array | null; satelliteRequested: boolean;
      bodies: Map<string, THREE.Mesh>; moons: Map<string, THREE.Mesh>;
      camera: THREE.OrthographicCamera;
    };
    internals.satellites = satellites;
    internals.satelliteRequested = true;
    const save = freshSession();
    const state: SceneState = {
      level: MOONSHOT, parking: save.parking, launchEt: save.et, et: save.et,
      response: null, aim: save.aim, aiming: true, charge: 0, firing: false,
      snap: 0, home: 0, map: false, focus: null, inspection: null, demoCharge: 0,
      showMoons: false, reduced: true, visualTime: 0, deckHeight: 220, lock: null,
      preferences: { ...save.preferences, camera, trueSize, orbit: [.7, -.8], heightKm: 900000 },
    };
    let primaryKm = 0, focusedKm = 0, projectionKm = 0, parentZ = 0;
    try {
      for (let hour = 0; hour <= 648; hour++) {
        state.et = LAUNCH_ET + hour * DAY / 24;
        const reference = lunarModel.bodies(state.et);
        parentZ = Math.max(parentZ, Math.abs(reference.earth.r[2]));
        state.focus = null;
        state.showMoons = false;
        const primary = makeFrame(state, 390, 844, data, 1, 'test', lunarModel);
        scene.update(state, primary);
        primaryKm = Math.max(primaryKm, norm(sub(primary.g.body('moon').r, reference.moon.r)));
        const primaryMesh = internals.bodies.get('moon')!;
        expect(primaryMesh.visible).toBe(true);
        const checkProjection = (frame: typeof primary, mesh: THREE.Mesh) => {
          const expected = new THREE.Vector3(...frame.local(reference.moon.r));
          focusedKm = Math.max(focusedKm, mesh.position.clone().multiplyScalar(frame.unit).distanceTo(expected));
          internals.camera.updateMatrixWorld(true);
          const ndc = mesh.position.clone().project(internals.camera);
          const pixels = [(ndc.x + 1) * 195, (1 - ndc.y) * 422];
          const point = frame.project(reference.moon.r);
          projectionKm = Math.max(projectionKm, Math.hypot(pixels[0]! - point[0], pixels[1]! - point[1]) * frame.g.heightKm / 844);
          expect(frame.frame.bodies.find(body => body.id === 'moon')!.point).toEqual(point);
        };
        checkProjection(primary, primaryMesh);
        state.focus = 'earth';
        state.showMoons = true;
        const focused = makeFrame(state, 390, 844, data, 1, 'test', lunarModel);
        scene.update(state, focused);
        const moon = internals.moons.get('moon')!;
        expect(moon.visible).toBe(true);
        expect([primaryMesh, moon].filter(mesh => mesh.visible)).toHaveLength(1);
        checkProjection(focused, moon);
        if (hour === 0) {
          internals.satellites = null;
          scene.update(state, focused);
          expect(primaryMesh.visible).toBe(true);
          expect(moon.visible).toBe(false);
          internals.satellites = satellites;
        }
        state.showMoons = false;
        scene.update(state, focused);
        expect(primaryMesh.visible).toBe(true);
        expect(moon.visible).toBe(false);
        if (hour === 599) expect(Math.abs(reference.earth.r[2])).toBeGreaterThan(8000);
      }
      expect(parentZ).toBeGreaterThan(8000);
      expect(primaryKm).toBeLessThanOrEqual(1);
      expect(focusedKm).toBeLessThanOrEqual(1);
      expect(projectionKm).toBeLessThanOrEqual(1);
    } finally {
      scene.dispose();
    }
  });
});
