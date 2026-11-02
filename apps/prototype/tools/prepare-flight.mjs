import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer, build } from "vite";

const tools = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(tools, "../../..").replaceAll("\\", "/");
const out = path.resolve(tools, "../public/observatory");
const server = await createServer({ root: path.join(repo, "apps/game"), server: { middlewareMode: true, hmr: false }, appType: "custom" });
try {
  const levels = await server.ssrLoadModule("/src/levels.ts");
  const shot = await server.ssrLoadModule("/src/sim/shot.ts");
  const ep = await server.ssrLoadModule("/@fs/" + repo + "/packages/ephemeris/src/index.ts");
  const ph = await server.ssrLoadModule("/@fs/" + repo + "/packages/physics/src/index.ts");
  const startEt = ep.etFromIso("2026-11-02"), eph = ep.createEphemeris({ flatten: true });
  const request = levels.shotRequestFor(levels.CAMPAIGN.find(l => l.id === "first-light"), startEt, [-1.815327, 2.36578, 0]);
  const result = shot.simulateShot(eph, request), a = shot.analyzeShot(eph, request, result);
  const ids = ["mercury", "venus", "earth", "mars", "jupiter"];
  const data = { source: "Unchanged baseline known solution, first-light, a329252", ids, startEt, endEt: a.endEt, samples: result.samples, analysis: { hit: a.hit, days: a.flightDays, cost: a.deltaVKmS, speed: a.vInfKmS, c3: a.c3 }, angle: 127.5 };
  await fs.writeFile(path.join(out, "precise-flight.json"), JSON.stringify(data));
  const probes = Array.from({ length: 1001 }, (_, i) => {
    const et = startEt + (a.endEt - startEt) * i / 1000;
    return { et, craft: ph.sampleAt(result, et), bodies: ids.map(id => eph.state(id, et)) };
  });
  await fs.writeFile(path.join(tools, "fixtures/precise-flight-reference.json"), JSON.stringify(probes));
  console.log("Recorded unchanged First light:", result.samples.length, "knots; hit:", a.hit);
} finally { await server.close(); }

const runtime = await build({ configFile: false, root: repo, resolve: { alias: { "@starshot/ephemeris": path.join(repo, "packages/ephemeris/src/index.ts") } }, build: { lib: { entry: path.join(tools, "replay-model-entry.ts"), name: "ReplayModel", formats: ["iife"] }, minify: true, write: false } });
const code = (Array.isArray(runtime) ? runtime[0] : runtime).output.find(o => o.type === "chunk").code;
await fs.writeFile(path.join(out, "replay-model.js"), code);
