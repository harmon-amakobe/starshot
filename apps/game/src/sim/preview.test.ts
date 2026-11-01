import { describe, expect, it } from "vitest";
import type { SimulationResult } from "@starshot/physics";
import { launchGate, previewForShot, shotKey } from "./preview.js";
import type { ShotResponse } from "./protocol.js";
import { SIM_SETTINGS, type ShotAnalysis, type ShotRequest, type SimSettings } from "./shot.js";

const shot: ShotRequest = {
  target: "mars",
  attractors: ["earth", "mars", "jupiter"],
  launchEt: 836_179_269.18,
  vInf: [-1.731115, 2.595697, 0],
  maxFlightDays: 400,
  sim: SIM_SETTINGS,
  captureZoneScale: 3,
};

const responseFor = (s: ShotRequest): ShotResponse => ({
  kind: "shot",
  id: 1,
  purpose: "preview",
  shot: s,
  result: {} as SimulationResult,
  analysis: {} as ShotAnalysis,
  ms: 1,
});

describe("launch gate: only the preview of the shot on screen can be launched", () => {
  it("keys ignore object key order but not any value", () => {
    const reordered: ShotRequest = {
      captureZoneScale: 3,
      sim: { maxSteps: 20000, maxStep: SIM_SETTINGS.maxStep, atolKm: 1, rtol: 1e-10 },
      vInf: [-1.731115, 2.595697, 0],
      maxFlightDays: 400,
      launchEt: 836_179_269.18,
      attractors: ["earth", "mars", "jupiter"],
      target: "mars",
    };
    expect(shotKey(reordered)).toBe(shotKey(shot));
    expect(shotKey({ ...shot, vInf: [-1.731115, 2.595698, 0] })).not.toBe(shotKey(shot));
    expect(shotKey({ ...shot, launchEt: shot.launchEt + 86400 })).not.toBe(shotKey(shot));
    expect(shotKey({ ...shot, captureZoneScale: 1 })).not.toBe(shotKey(shot));
    expect(shotKey({ ...shot, sim: { ...SIM_SETTINGS, maxStep: 1 } })).not.toBe(shotKey(shot));
    expect(shotKey({ ...shot, requiredFlyby: "jupiter" })).not.toBe(shotKey(shot));
    expect(shotKey({ ...shot, attractors: ["mars", "earth", "jupiter"] })).not.toBe(shotKey(shot));
    expect(shotKey({ ...shot, requiredFlyby: undefined })).toBe(shotKey(shot));
  });

  it("covers every field, including ones added to the request or its settings later", () => {
    const extended = { ...shot, midCourseBurn: [0.1, 0, 0] } as ShotRequest;
    expect(shotKey(extended)).not.toBe(shotKey(shot));
    const settings = { ...SIM_SETTINGS, minStep: 1 } as SimSettings;
    expect(shotKey({ ...shot, sim: settings })).not.toBe(shotKey(shot));
    expect(previewForShot(responseFor(shot), extended)).toBeNull();
  });

  it("is closed and busy until the matching preview arrives", () => {
    expect(launchGate(true, null, shot)).toEqual({ ready: false, stale: true, shot: null });
    const older = responseFor({ ...shot, vInf: [-1.7, 2.6, 0] });
    expect(previewForShot(older, shot)).toBeNull();
    expect(launchGate(true, older, shot)).toEqual({ ready: false, stale: true, shot: null });
  });

  it("opens on the matching preview and launches that preview's own request", () => {
    const current = responseFor({ ...shot, vInf: [...shot.vInf] });
    const gate = launchGate(true, current, shot);
    expect(gate.ready).toBe(true);
    expect(gate.stale).toBe(false);
    expect(gate.shot).toBe(current.shot);
  });

  it("stays closed outside the aiming phase", () => {
    expect(launchGate(false, responseFor(shot), shot).ready).toBe(false);
  });
});
