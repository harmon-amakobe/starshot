import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { BODIES } from "@starshot/ephemeris";
import { formatDate, formatDays, formatKm, isoDate } from "../format.js";
import type { Level } from "../levels.js";
import type { Score } from "../scoring.js";
import { BULLSEYE_RADII, EPHEMERIS_VALID_UNTIL_ISO, type ShotAnalysis } from "../sim/shot.js";

export interface ResultOverlayProps {
  readonly level: Level;
  readonly score: Score;
  readonly maxStars: number;
  /** Efficiency star up to par x parTolerance. */
  readonly parTolerance: number;
  /** "Training capture zone (3× real)" on the training level. */
  readonly trainingZone?: string | null;
  readonly analysis: ShotAnalysis;
  readonly hintUsed: boolean;
  readonly canNext: boolean;
  readonly onRetry: () => void;
  readonly onNext: () => void;
  readonly onLevels: () => void;
}

function headline(level: Level, a: ShotAnalysis): string {
  const name = BODIES[level.target].name;
  if (a.hit) return a.termination === "impact" ? `Impact on ${name}` : `Captured by ${name}`;
  switch (a.termination) {
    case "sun":
      return "Lost to the Sun";
    case "escape":
      return "Lost to deep space";
    case "impact":
      return `Crashed into ${BODIES[(a.terminatedBy ?? "earth") as keyof typeof BODIES]?.name ?? "a planet"}`;
    default:
      return `Missed ${name}`;
  }
}

export function shareText(level: Level, score: Score, maxStars: number, a: ShotAnalysis): string {
  const stars = "★".repeat(score.stars) + "☆".repeat(Math.max(0, maxStars - score.stars));
  const name = BODIES[level.target].name;
  const what = a.hit
    ? `reached ${name} in ${Math.round(a.flightDays)} days`
    : `missed ${name} by ${formatKm(a.closestKm)}`;
  return `STARSHOT ${level.title} ${stars}: ${what} with ${a.deltaVKmS.toFixed(2)} km/s of delta-v (launch ${isoDate(a.launchEt)}).`;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ResultOverlay(p: ResultOverlayProps) {
  const { level, score, analysis: a } = p;
  const cardRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [shared, setShared] = useState<string | null>(null);
  const { onRetry } = p;
  useEffect(() => {
    // Start at the top of the card: focus the heading (not a button further down).
    cardRef.current?.scrollTo?.({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onRetry();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onRetry]);

  // Keep Tab inside the dialog (the game behind it is also inert while it is open).
  const trapTab = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !cardRef.current) return;
    const items = [...cardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const firstItem = items[0];
    const lastItem = items[items.length - 1];
    if (!firstItem || !lastItem) return;
    const active = document.activeElement;
    const outside = !cardRef.current.contains(active);
    if (e.shiftKey && (active === firstItem || active === headingRef.current || outside)) {
      e.preventDefault();
      lastItem.focus();
    } else if (!e.shiftKey && (active === lastItem || outside)) {
      e.preventDefault();
      firstItem.focus();
    }
  };

  const share = async () => {
    const text = shareText(level, score, p.maxStars, a);
    const url = typeof location !== "undefined" ? location.href.split("#")[0] : "";
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title: "Starshot", text, url });
        setShared("Shared");
        return;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`.trim());
      setShared("Copied to clipboard");
    } catch {
      setShared("Sharing is not available here");
    }
  };

  const rows: Array<[string, string]> = [
    ["Launch", formatDate(a.launchEt)],
    [a.hit ? "Arrival" : "Flight ended", formatDate(a.endEt)],
    ["Flight time", formatDays(a.flightDays)],
    ["v∞ / C3", `${a.vInfKmS.toFixed(2)} km/s / ${a.c3.toFixed(1)} km²/s²`],
    ["Δv from LEO", `${a.deltaVKmS.toFixed(2)} km/s${level.par ? ` (par ${level.par.deltaVKmS.toFixed(2)})` : ""}`],
    [a.hit ? "Periapsis" : "Closest approach", a.hit && a.termination === "impact" ? "surface" : formatKm(a.closestKm)],
  ];
  if (a.flybys.length) {
    rows.push(["Flybys", a.flybys.map((f) => `${BODIES[f.body].name} ${formatKm(f.distanceKm)}`).join(", ")]);
  }

  const name = BODIES[level.target].name;
  const zone = p.trainingZone ? `${name}'s ${p.trainingZone.charAt(0).toLowerCase()}${p.trainingZone.slice(1)}` : `${name}'s capture zone`;
  const checks: Array<[boolean, string]> = [[score.hit, `Reach ${zone}`]];
  if (level.par) {
    const pct = Math.round((p.parTolerance - 1) * 100);
    checks.push([score.efficient, `Δv within ${pct}% of par (${(level.par.deltaVKmS * p.parTolerance).toFixed(2)} km/s)`]);
  }
  checks.push([
    score.skill,
    level.requiredFlyby
      ? `Fly through ${BODIES[level.requiredFlyby].name}'s sphere of influence on the way (or a bullseye)`
      : `Bullseye: pass within ${BULLSEYE_RADII} ${name} radii (${formatKm(BULLSEYE_RADII * BODIES[level.target].radiusKm)})`,
  ]);

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-title"
      aria-describedby={p.hintUsed ? "result-summary result-hint" : "result-summary"}
      onKeyDown={trapTab}
    >
      <div ref={cardRef} className={`result-card ${a.hit ? "is-hit" : "is-miss"}`}>
        <div className="stars" aria-label={`${score.stars} of ${p.maxStars} stars`} role="img">
          {Array.from({ length: p.maxStars }, (_, i) => (
            <svg key={i} viewBox="0 0 24 24" className={`star${i < score.stars ? " on" : ""}`} style={{ animationDelay: `${150 + i * 180}ms` }} aria-hidden="true">
              <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
            </svg>
          ))}
        </div>
        <h2 id="result-title" ref={headingRef} tabIndex={-1}>
          {headline(level, a)}
        </h2>
        <p id="result-summary" className="result-summary">
          {a.hit
            ? p.trainingZone
              ? `Entered ${zone} on ${formatDate(a.endEt)} after ${formatDays(a.flightDays)}.`
              : `Entered ${name}'s sphere of influence on ${formatDate(a.endEt)} after ${formatDays(a.flightDays)}.`
            : `Closest approach ${formatKm(a.closestKm)} on ${formatDate(a.closestEt)}; ${zone} reaches ${formatKm(a.captureZoneKm)} from its centre.`}
          {score.hintCapped ? " The hint capped this shot at 2 stars." : ""}
          {a.beyondEphemerisRange
            ? ` The flight runs past ${EPHEMERIS_VALID_UNTIL_ISO.slice(0, 4)}, the end of the JPL table: planet positions there are extrapolated.`
            : ""}
        </p>
        {/* Said whenever the hint was applied, even when it cost no star (a miss, or two stars anyway). */}
        {p.hintUsed ? (
          <p id="result-hint" className="hint-used">
            Hint used
          </p>
        ) : null}
        <ul className="checks">
          {checks.map(([ok, text]) => (
            <li key={text} className={ok ? "ok" : "no"}>
              <span aria-hidden="true">{ok ? "✓" : "✕"}</span> <span className="sr-only">{ok ? "Earned:" : "Not earned:"}</span> {text}
            </li>
          ))}
        </ul>
        <dl className="stats">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <div className={`result-actions${p.canNext ? " has-next" : ""}`}>
          <button type="button" className="ghost-btn" onClick={p.onRetry}>
            Retry
          </button>
          {p.canNext ? (
            <button type="button" className="launch-btn" onClick={p.onNext}>
              Next level
            </button>
          ) : null}
          <button type="button" className="ghost-btn" onClick={share}>
            Share
          </button>
          <button type="button" className="ghost-btn" onClick={p.onLevels}>
            Levels
          </button>
        </div>
        <p className="share-note" aria-live="polite">
          {shared ?? ""}
        </p>
      </div>
    </div>
  );
}
