import type { Level } from "../levels.js";
import type { Aim } from "../sim/shot.js";

export type Tone = "idle" | "hit" | "miss" | "busy";

export interface Readouts {
  readonly vInfKmS: number;
  readonly deltaVKmS: number;
  readonly c3: number;
  /** Flight time of the previewed path [days], when known. */
  readonly flightDays: number | null;
}

export type HintState = "idle" | "busy" | "shown" | "failed";

export interface AimControlsProps {
  readonly level: Level;
  readonly aim: Aim;
  readonly fine: boolean;
  readonly day: number;
  readonly launchDateLabel: string;
  readonly readouts: Readouts;
  readonly status: string;
  readonly statusTone: Tone;
  readonly hintState: HintState;
  readonly hintLabel: string | null;
  readonly launching: boolean;
  readonly onAngle: (deltaDeg: number) => void;
  readonly onSpeed: (deltaKmS: number) => void;
  readonly onFine: () => void;
  readonly onDay: (day: number) => void;
  readonly onHint: () => void;
  readonly onApplyHint: () => void;
  readonly onLaunch: () => void;
}

/** Digits needed to show a value exactly on a 10^-base grid, up to one more for fine steps. */
const digitsFor = (x: number, base: number, fine: boolean) =>
  fine || Math.abs(x * 10 ** base - Math.round(x * 10 ** base)) > 1e-6 ? base + 1 : base;

const fmtStep = (x: number) => (x >= 1 ? x.toFixed(0) : x >= 0.1 ? x.toFixed(1) : x >= 0.01 ? x.toFixed(2) : x.toFixed(3));

export function AimControls(p: AimControlsProps) {
  const a = p.fine ? [0.1, 0.01] : [1, 0.1];
  const s = p.fine ? [0.01, 0.001] : [0.1, 0.01];
  const r = p.readouts;
  return (
    <section className="controls" aria-label="Aim and launch">
      <p className={`status tone-${p.statusTone}`} id="shot-status">
        {p.status}
      </p>
      <dl className="readouts">
        <div>
          <dt>v&#x221E;</dt>
          <dd>
            {r.vInfKmS.toFixed(2)}
            <small> km/s</small>
          </dd>
        </div>
        <div>
          <dt>
            <abbr title="Delta-v from a 200 km low Earth orbit">&#x394;v LEO</abbr>
          </dt>
          <dd>
            {r.deltaVKmS.toFixed(2)}
            <small> km/s</small>
          </dd>
        </div>
        <div>
          <dt>C3</dt>
          <dd>
            {r.c3.toFixed(1)}
            <small> km&#xB2;/s&#xB2;</small>
          </dd>
        </div>
        <div>
          <dt>Flight</dt>
          <dd>
            {r.flightDays === null ? "-" : Math.round(r.flightDays)}
            <small> d</small>
          </dd>
        </div>
      </dl>

      <div className="date-row">
        <button type="button" className="step-btn" aria-label="Launch one day earlier" disabled={p.day <= 0} onClick={() => p.onDay(p.day - 1)}>
          &#x2039;
        </button>
        <label className="date-slider">
          <span className="sr-only">Launch date</span>
          <input
            type="range"
            min={0}
            max={p.level.window.days}
            step={1}
            value={p.day}
            aria-valuetext={p.launchDateLabel}
            onChange={(e) => p.onDay(Number(e.target.value))}
          />
        </label>
        <button
          type="button"
          className="step-btn"
          aria-label="Launch one day later"
          disabled={p.day >= p.level.window.days}
          onClick={() => p.onDay(p.day + 1)}
        >
          &#x203A;
        </button>
        <output className="date-out">{p.launchDateLabel}</output>
      </div>

      <div className="tune-grid">
        <div className="tune-row" role="group" aria-label="Fine-tune launch angle">
          <span className="tune-label">
            Angle <strong>{p.aim.angleDeg.toFixed(digitsFor(p.aim.angleDeg, 1, p.fine))}&#xB0;</strong>
          </span>
          <button type="button" className="step-btn" aria-label={`Rotate aim ${fmtStep(a[0]!)} degrees clockwise`} onClick={() => p.onAngle(-a[0]!)}>
            &#x2212;{fmtStep(a[0]!)}&#xB0;
          </button>
          <button type="button" className="step-btn" aria-label={`Rotate aim ${fmtStep(a[1]!)} degrees clockwise`} onClick={() => p.onAngle(-a[1]!)}>
            &#x2212;{fmtStep(a[1]!)}&#xB0;
          </button>
          <button type="button" className="step-btn" aria-label={`Rotate aim ${fmtStep(a[1]!)} degrees counter-clockwise`} onClick={() => p.onAngle(a[1]!)}>
            +{fmtStep(a[1]!)}&#xB0;
          </button>
          <button type="button" className="step-btn" aria-label={`Rotate aim ${fmtStep(a[0]!)} degrees counter-clockwise`} onClick={() => p.onAngle(a[0]!)}>
            +{fmtStep(a[0]!)}&#xB0;
          </button>
        </div>
        <div className="tune-row" role="group" aria-label="Fine-tune launch speed">
          <span className="tune-label">
            Speed <strong>{p.aim.speedKmS.toFixed(digitsFor(p.aim.speedKmS, 2, p.fine))}</strong>
          </span>
          <button type="button" className="step-btn" aria-label={`Slower by ${fmtStep(s[0]!)} km/s`} onClick={() => p.onSpeed(-s[0]!)}>
            &#x2212;{fmtStep(s[0]!)}
          </button>
          <button type="button" className="step-btn" aria-label={`Slower by ${fmtStep(s[1]!)} km/s`} onClick={() => p.onSpeed(-s[1]!)}>
            &#x2212;{fmtStep(s[1]!)}
          </button>
          <button type="button" className="step-btn" aria-label={`Faster by ${fmtStep(s[1]!)} km/s`} onClick={() => p.onSpeed(s[1]!)}>
            +{fmtStep(s[1]!)}
          </button>
          <button type="button" className="step-btn" aria-label={`Faster by ${fmtStep(s[0]!)} km/s`} onClick={() => p.onSpeed(s[0]!)}>
            +{fmtStep(s[0]!)}
          </button>
        </div>
      </div>

      <div className="action-row">
        <button
          type="button"
          className={`toggle-btn${p.fine ? " is-on" : ""}`}
          aria-pressed={p.fine}
          aria-label="Fine steps: divide angle and speed steps by ten"
          onClick={p.onFine}
        >
          Fine
        </button>
        {p.hintState === "shown" && p.hintLabel ? (
          <button type="button" className="ghost-btn hint-btn" onClick={p.onApplyHint} aria-label={`Use the hint: ${p.hintLabel}`}>
            Use hint
          </button>
        ) : (
          <button
            type="button"
            className="ghost-btn hint-btn"
            onClick={p.onHint}
            disabled={p.hintState === "busy"}
            aria-label="Show a hint (caps this level at two stars)"
          >
            {p.hintState === "busy" ? "Finding…" : "Hint"}
          </button>
        )}
        <button type="button" className="launch-btn" onClick={p.onLaunch} disabled={p.launching} aria-describedby="shot-status">
          {p.launching ? "Launching…" : "Launch"}
        </button>
      </div>
    </section>
  );
}

export interface FlightControlsProps {
  readonly dayCount: number;
  readonly dateLabel: string;
  readonly fast: boolean;
  /** Name of the planet the time-warp is slowing down for. */
  readonly slowedBy: string | null;
  readonly onFast: () => void;
  readonly onSkip: () => void;
}

export function FlightControls(p: FlightControlsProps) {
  return (
    <section className="controls flight" aria-label="Flight">
      <p className="status tone-busy">
        Day {Math.max(0, Math.round(p.dayCount))} &#xB7; {p.dateLabel}
        {p.slowedBy ? ` · slowing near ${p.slowedBy}` : ""}
      </p>
      <div className="action-row">
        <button type="button" className={`toggle-btn wide${p.fast ? " is-on" : ""}`} aria-pressed={p.fast} onClick={p.onFast}>
          Fast-forward
        </button>
        <button type="button" className="ghost-btn wide" onClick={p.onSkip}>
          Skip to end
        </button>
      </div>
    </section>
  );
}
