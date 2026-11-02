/**
 * Deterministic starfield: the same seed and size always give the same sky,
 * so screenshots and replays are stable. Rendered once per resize to an
 * offscreen canvas and blitted behind the map.
 */

/** Mulberry32: tiny, fast, seeded PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TINTS = ["255,255,255", "202,220,255", "255,236,210", "214,255,246"];

export function renderStarfield(widthCss: number, heightCss: number, dpr: number, seed = 0x5ea5): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(widthCss * dpr));
  canvas.height = Math.max(1, Math.round(heightCss * dpr));
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.scale(dpr, dpr);
  const rand = mulberry32(seed);

  // Two faint nebula washes for depth.
  const washes: Array<[number, number, number, string]> = [
    [0.18, 0.22, 0.65, "94,234,212"],
    [0.82, 0.78, 0.7, "123,97,255"],
  ];
  for (const [fx, fy, fr, rgb] of washes) {
    const r = Math.max(widthCss, heightCss) * fr;
    const g = ctx.createRadialGradient(fx * widthCss, fy * heightCss, 0, fx * widthCss, fy * heightCss, r);
    g.addColorStop(0, `rgba(${rgb},0.06)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, widthCss, heightCss);
  }

  const count = Math.round((widthCss * heightCss) / 1500);
  for (let i = 0; i < count; i++) {
    const x = rand() * widthCss;
    const y = rand() * heightCss;
    const m = rand();
    const size = m > 0.985 ? 1.5 : m > 0.9 ? 1.05 : 0.65;
    const alpha = 0.25 + rand() * (m > 0.9 ? 0.7 : 0.45);
    const tint = TINTS[Math.floor(rand() * TINTS.length)] ?? TINTS[0];
    ctx.fillStyle = `rgba(${tint},${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    if (size > 1.4) {
      ctx.fillStyle = `rgba(${tint},0.08)`;
      ctx.beginPath();
      ctx.arc(x, y, size * 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return canvas;
}
