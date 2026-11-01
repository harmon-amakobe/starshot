import { useEffect, useRef } from "react";
import { CAMPAIGN, DEFAULT_PAR_TOLERANCE } from "../levels.js";
import { renderStarfield } from "../render/starfield.js";
import { HONESTY_NOTE } from "./Hud.js";

const pct = (tolerance: number) => `${Math.round(tolerance * 100)}%`;
/** "110% of the level's par delta-v (105% on the Grand Tour)", from the level table. */
const PAR_RULE = (() => {
  const tighter = CAMPAIGN.filter((l) => l.parTolerance !== undefined && l.parTolerance !== DEFAULT_PAR_TOLERANCE);
  const extra = tighter.map((l) => `${pct(l.parTolerance!)} on ${l.title}`).join(", ");
  return `${pct(DEFAULT_PAR_TOLERANCE)} of the level's par delta-v${extra ? ` (${extra})` : ""}`;
})();
/** "Reach the target's capture zone (on First Light, a training zone 3× the real size)." */
const ZONE_RULE = (() => {
  const training = CAMPAIGN.filter((l) => (l.captureZoneScale ?? 1) !== 1);
  const extra = training.map((l) => `on ${l.title}, a training zone ${l.captureZoneScale}\u00D7 the real size`).join("; ");
  return `Reach the target's capture zone${extra ? ` (${extra})` : ""}.`;
})();

/** Full-screen deterministic starfield behind the menus. */
export function Backdrop() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const paint = () => {
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#0b1020";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(renderStarfield(w, h, dpr, 0x51a2), 0, 0, canvas.width, canvas.height);
    };
    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);
  return <canvas ref={ref} className="backdrop" aria-hidden="true" />;
}

function useFocusHeading(id: string) {
  useEffect(() => {
    document.getElementById(id)?.focus({ preventScroll: true });
  }, [id]);
}

export interface TitleScreenProps {
  readonly totalStars: number;
  readonly onPlay: () => void;
  readonly onHowTo: () => void;
  readonly onAbout: () => void;
}

export function TitleScreen({ totalStars, onPlay, onHowTo, onAbout }: TitleScreenProps) {
  useFocusHeading("title-heading");
  return (
    <main className="menu title-screen">
      <Backdrop />
      <div className="title-art" aria-hidden="true">
        <div className="orbit o1">
          <span className="planet p1" />
        </div>
        <div className="orbit o2">
          <span className="planet p2" />
        </div>
        <div className="orbit o3">
          <span className="planet p3" />
        </div>
        <span className="sun" />
      </div>
      <div className="menu-panel">
        <h1 id="title-heading" className="logo" tabIndex={-1}>
          STARSHOT
        </h1>
        <p className="tagline">Slingshot across the real Solar System</p>
        <div className="menu-buttons">
          <button type="button" className="launch-btn big" onClick={onPlay}>
            Play
          </button>
          <button type="button" className="ghost-btn" onClick={onHowTo}>
            How to play
          </button>
          <button type="button" className="ghost-btn" onClick={onAbout}>
            About &amp; credits
          </button>
        </div>
        {totalStars > 0 ? <p className="menu-foot">{totalStars} stars earned</p> : null}
      </div>
    </main>
  );
}

export function HowToScreen({ onBack }: { readonly onBack: () => void }) {
  useFocusHeading("howto-heading");
  return (
    <main className="menu text-screen">
      <Backdrop />
      <article className="menu-panel prose">
        <h1 id="howto-heading" tabIndex={-1}>
          How to play
        </h1>
        <ol>
          <li>
            <strong>Pull back to aim.</strong> Drag anywhere on the map: the band stretches from Earth and the probe flies the
            opposite way. A longer pull is a faster launch. The arrow is your speed relative to Earth; Earth&apos;s own
            30 km/s around the Sun carries the probe too, so the path bends away from the arrow.
          </li>
          <li>
            <strong>Read the dotted path.</strong> It is the real predicted flight under the Sun and the planets. The game
            shows where the target will be at your closest approach and how far you miss its capture zone (its sphere of
            influence).
          </li>
          <li>
            <strong>Pick a launch date.</strong> Planets move as you scrub the date slider. Real launch windows are short: the
            right date matters as much as the aim.
          </li>
          <li>
            <strong>Fine-tune, then launch.</strong> Nudge the angle and speed with the buttons; turn on <em>Fine</em> for steps
            ten times smaller. Press Launch and watch the flight; it slows down near planets.
          </li>
        </ol>
        <h2>Stars</h2>
        <ul>
          <li>{ZONE_RULE}</li>
          <li>Use no more than {PAR_RULE} (from a 200 km parking orbit).</li>
          <li>Bullseye: pass within 10 planet radii, or, on the Grand Tour, swing by Jupiter on the way.</li>
          <li>Using the hint caps a level at two stars.</li>
        </ul>
        <h2>Keys and gestures</h2>
        <ul>
          <li>
            Left / Right: rotate the aim by 0.1&#xB0;; Up / Down: speed by 0.01 km/s. Shift: 10x steps; Alt or F (Fine): 0.1x
            steps.
          </li>
          <li>[ and ]: launch day earlier or later. Space or Enter: launch. H: hint. R: recenter. + and -: zoom.</li>
          <li>Touch: pinch to zoom, drag with two fingers to pan. Mouse: wheel to zoom, Shift-drag or right-drag to pan.</li>
        </ul>
        <button type="button" className="launch-btn" onClick={onBack}>
          Back
        </button>
      </article>
    </main>
  );
}

export function AboutScreen({ onBack }: { readonly onBack: () => void }) {
  useFocusHeading("about-heading");
  return (
    <main className="menu text-screen">
      <Backdrop />
      <article className="menu-panel prose">
        <h1 id="about-heading" tabIndex={-1}>
          About Starshot
        </h1>
        <p className="note">{HONESTY_NOTE}</p>
        <h2>The physics</h2>
        <p>
          Planet positions come from NASA/JPL&apos;s &quot;Keplerian Elements for Approximate Positions of the Major
          Planets&quot; (Table 1, valid 1800-2050), checked against JPL Horizons. The probe is integrated with an adaptive
          Dormand-Prince method under the Sun and the planets that matter for each level. It leaves Earth on a patched-conic
          departure: the speed you choose is the excess speed after escaping Earth (v&#x221E;), and the delta-v shown is the
          burn needed from a 200 km parking orbit.
        </p>
        <p>
          A hit means entering the target&apos;s sphere of influence, where its gravity dominates the Sun&apos;s. The aiming
          preview and the launch run the identical simulation, so what you see is what you get. Hints come from a Lambert
          solver for the cheapest direct transfer in the launch window.
        </p>
        <h2>Simplifications</h2>
        <p>
          This is a game, not mission design: the map is flat (real orbits are tilted by up to 7&#xB0;), the launch is a
          single instant burn, and there are no mid-course corrections. The levels use real launch windows; the dates of
          the Voyager 2 flybys are historical, the rest of each level is ours.
        </p>
        <h2>Credits</h2>
        <p>
          Inspired by astlo by Mark Macharia. Starshot&apos;s code is MIT licensed; astlo&apos;s own files are not part of
          the game and keep their original licence.
        </p>
        <button type="button" className="launch-btn" onClick={onBack}>
          Back
        </button>
      </article>
    </main>
  );
}
