import type { MouseEvent } from "react";
import { formatAimAngle, formatAimSpeed } from "../format.js";
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
  /** The status can run to two lines (training level): reserve the room so the panel does not jump. */
  readonly statusTwoLines?: boolean;
  readonly hintState: HintState;
  readonly hintLabel: string | null;
  readonly launching: boolean;
  /** The finished preview is for exactly this aim, so Launch would fly what is on screen. */
  readonly launchReady: boolean;
  readonly onAngle: (deltaDeg: number) => void;
  readonly onSpeed: (deltaKmS: number) => void;
  readonly onFine: () => void;
  readonly onDay: (day: number) => void;
  readonly onHint: () => void;
  readonly onApplyHint: () => void;
  readonly onLaunch: () => void;
}

const fmtStep = (x: number) => (x >= 1 ? x.toFixed(0) : x >= 0.1 ? x.toFixed(1) : x >= 0.01 ? x.toFixed(2) : x.toFixed(3));
const degrees = (x: number) => `${fmtStep(x)} ${x === 1 ? "degree" : "degrees"}`;

/**
 * After a mouse or touch click, give focus back to the page so Space and Enter
 * launch again (a focused button would take them). Keyboard activation
 * (detail 0) keeps focus where the player put it.
 */
const releaseFocusAfterPointer = (e: MouseEvent<HTMLElement>) => {
  if (e.detail > 0) e.currentTarget.blur();
};

interface StepProps {
  readonly text: string;
  readonly action: string;
  readonly onStep: () => void;
  readonly disabled?: boolean;
}

/** A step button whose accessible name starts with its visible text (WCAG 2.5.3), then says what it does. */
function Step({ text, action, onStep, disabled }: StepProps) {
  return (
    <button
      type="button"
      className="step-btn"
      aria-label={`${text}: ${action}`}
      disabled={disabled}
      onClick={(e) => {
        onStep();
        releaseFocusAfterPointer(e);
      }}
    >
      {text}
    </button>
  );
}

export function AimControls(p: AimControlsProps) {
  const a = p.fine ? [0.1, 0.01] : [1, 0.1];
  const s = p.fine ? [0.01, 0.001] : [0.1, 0.01];
  const r = p.readouts;
  return (
    <section className="controls" aria-label="Aim and launch">
      <p className={`status tone-${p.statusTone}${p.statusTwoLines ? " two-lines" : ""}`} id="shot-status">
        {p.status}
      </p>
      <dl className="readouts">
        <div className="ro-vinf">
          <dt>v&#x221E;</dt>
          <dd>
            {r.vInfKmS.toFixed(2)}
            <small> km/s</small>
          </dd>
        </div>
        <div className="ro-dv">
          <dt>
            <abbr title="Delta-v from a 200 km low Earth orbit">&#x394;v LEO</abbr>
          </dt>
          <dd>
            {r.deltaVKmS.toFixed(2)}
            <small> km/s</small>
          </dd>
        </div>
        <div className="ro-c3">
          <dt>C3</dt>
          <dd>
            {r.c3.toFixed(1)}
            <small> km&#xB2;/s&#xB2;</small>
          </dd>
        </div>
        <div className="ro-flight">
          <dt>Flight</dt>
          <dd>
            {r.flightDays === null ? "-" : Math.round(r.flightDays)}
            <small> d</small>
          </dd>
        </div>
      </dl>

      <div className="date-row">
        <button
          type="button"
          className="step-btn"
          aria-label="Launch one day earlier"
          disabled={p.day <= 0}
          onClick={(e) => {
            p.onDay(p.day - 1);
            releaseFocusAfterPointer(e);
          }}
        >
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
            onPointerUp={(e) => e.currentTarget.blur()}
          />
        </label>
        <button
          type="button"
          className="step-btn"
          aria-label="Launch one day later"
          disabled={p.day >= p.level.window.days}
          onClick={(e) => {
            p.onDay(p.day + 1);
            releaseFocusAfterPointer(e);
          }}
        >
          &#x203A;
        </button>
        <output className="date-out">{p.launchDateLabel}</output>
      </div>

      <div className="tune-grid">
        <div className="tune-row" role="group" aria-label="Fine-tune launch angle">
          <span className="tune-label">
            Angle <strong>{formatAimAngle(p.aim.angleDeg, p.fine)}&#xB0;</strong>
          </span>
          <Step text={`\u2212${fmtStep(a[0]!)}\u00B0`} action={`rotate aim ${degrees(a[0]!)} clockwise`} onStep={() => p.onAngle(-a[0]!)} />
          <Step text={`\u2212${fmtStep(a[1]!)}\u00B0`} action={`rotate aim ${degrees(a[1]!)} clockwise`} onStep={() => p.onAngle(-a[1]!)} />
          <Step text={`+${fmtStep(a[1]!)}\u00B0`} action={`rotate aim ${degrees(a[1]!)} counter-clockwise`} onStep={() => p.onAngle(a[1]!)} />
          <Step text={`+${fmtStep(a[0]!)}\u00B0`} action={`rotate aim ${degrees(a[0]!)} counter-clockwise`} onStep={() => p.onAngle(a[0]!)} />
        </div>
        <div className="tune-row" role="group" aria-label="Fine-tune launch speed">
          <span className="tune-label">
            Speed <strong>{formatAimSpeed(p.aim.speedKmS, p.fine)}</strong>
          </span>
          <Step text={`\u2212${fmtStep(s[0]!)}`} action={`${fmtStep(s[0]!)} km/s slower`} onStep={() => p.onSpeed(-s[0]!)} />
          <Step text={`\u2212${fmtStep(s[1]!)}`} action={`${fmtStep(s[1]!)} km/s slower`} onStep={() => p.onSpeed(-s[1]!)} />
          <Step text={`+${fmtStep(s[1]!)}`} action={`${fmtStep(s[1]!)} km/s faster`} onStep={() => p.onSpeed(s[1]!)} />
          <Step text={`+${fmtStep(s[0]!)}`} action={`${fmtStep(s[0]!)} km/s faster`} onStep={() => p.onSpeed(s[0]!)} />
        </div>
      </div>

      <div className="action-row">
        <button
          type="button"
          className={`toggle-btn${p.fine ? " is-on" : ""}`}
          aria-pressed={p.fine}
          aria-label="Fine steps: divide angle and speed steps by ten"
          onClick={(e) => {
            p.onFine();
            releaseFocusAfterPointer(e);
          }}
        >
          Fine
        </button>
        {p.hintState === "shown" && p.hintLabel ? (
          <button type="button" className="ghost-btn hint-btn" onClick={p.onApplyHint} aria-label={`Use hint: ${p.hintLabel} (caps this level at two stars)`}>
            Use hint
          </button>
        ) : (
          <button
            type="button"
            className="ghost-btn hint-btn"
            onClick={p.onHint}
            disabled={p.hintState === "busy"}
            aria-label={p.hintState === "busy" ? "Finding a hint" : "Hint: show a suggested launch (using it caps this level at two stars)"}
          >
            {p.hintState === "busy" ? "Finding…" : "Hint"}
          </button>
        )}
        <button
          type="button"
          className="launch-btn"
          onClick={p.onLaunch}
          disabled={p.launching || !p.launchReady}
          aria-describedby="shot-status"
        >
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
