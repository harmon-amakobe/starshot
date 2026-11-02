import { expect, it } from 'vitest';
import { PullPose, pullInput } from './pull-pose';
import { engineInput, ENGINE_RETRACTED_PX } from '../render/engine-geometry';

it('uses pointer displacement without jumping to an off-centre grip', () => {
  expect(pullInput([140, 90], [140, 90], 100).offset).toEqual([0, 0]);
  const input = pullInput([140, 90], [40, 90], 100);
  expect(input.strength).toBe(1);
  expect(input.angle).toBe(0);
});

it('converts a rotated display pull into the unchanged departure burn angle', () => {
  const heading = Math.PI / 4, distance = 80;
  const aligned = pullInput([100, 100], [100 - Math.cos(heading) * distance, 100 + Math.sin(heading) * distance], 100, heading);
  expect(aligned.angle).toBeCloseTo(0, 10);
  const tilted = heading + 20 * Math.PI / 180;
  expect(pullInput([0, 0], [-Math.cos(tilted) * 80, Math.sin(tilted) * 80], 100, heading).angle).toBeCloseTo(20, 10);
});

it('keeps the ship fixed while pulling the rear ring, including an off-centre grip', () => {
  const angle = Math.PI / 4, craft: [number, number] = [180, 180];
  const grip: [number, number] = [180 - Math.cos(angle) * ENGINE_RETRACTED_PX, 180 + Math.sin(angle) * ENGINE_RETRACTED_PX];
  const finger: [number, number] = [grip[0] + 10, grip[1] - 7];
  expect(engineInput(craft, grip, finger, finger, 80, angle).strength).toBeCloseTo(0, 10);
  const pulled = engineInput(craft, grip, finger, [finger[0] - Math.cos(angle) * 80, finger[1] + Math.sin(angle) * 80], 80, angle);
  expect(pulled.strength).toBeCloseTo(1, 10); expect(pulled.angle).toBeCloseTo(0, 10);
  expect(engineInput(craft, grip, finger, [finger[0] + 100, finger[1] - 100], 80, angle).strength).toBe(0);
  expect(craft).toEqual([180, 180]);
});

it('holds a pending release, then snaps once without losing the camera frame', () => {
  const pose = new PullPose(), lock = { heightKm: 800000, centre: [20, 30] as [number, number] };
  pose.begin(lock); pose.move(-100, 20, .8); pose.hold();
  expect(pose.sample(9000).offset).toEqual([-100, 20]);
  pose.snap(9000, false);
  expect(pose.sample(9090).offset).toEqual([-12.5, 2.5]);
  expect(pose.sample(9180).snapDone).toBe(true);
  expect(pose.flightLock).toEqual(lock);
  expect(pose.sample(9200).snapDone).toBe(false);
});

it('cancel cannot complete a launch and reduced motion settles immediately', () => {
  const pose = new PullPose();
  pose.begin({ heightKm: 800000, centre: [0, 0] }); pose.move(-100, 0, 1); pose.snap(0, false);
  pose.cancel(30, true);
  expect(pose.sample(30)).toMatchObject({ offset: [0, 0], stage: 'rest', snapDone: false });
  expect(pose.flightLock).toBeNull();
  pose.snap(40, true);
  expect(pose.sample(40).snapDone).toBe(true);
});
