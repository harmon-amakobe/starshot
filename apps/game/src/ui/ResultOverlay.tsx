import { useEffect, useRef, useState } from "react";
import { BODIES } from "@starshot/ephemeris";
import { formatDate, formatDays, formatKm, isoDate } from "../format.js";
import type { Level } from "../levels.js";
import { PAR_TOLERANCE, type Score } from "../scoring.js";
import { BULLSEYE_RADII, type ShotAnalysis } from "../sim/shot.js";

export interface ResultOverlayProps {
  readonly level: Level;
  readonly score: Score;
  readonly maxStars: number;
  readonly analysis: ShotAnalysis;
  readonly hintUsed: boolean;
  readonly canNext: boolean;
  readonly onRetry: () => void;
  readonly onNext: () => void;
  readonly onLevels: () => void;
}

function headline(level: Level, a: ShotAnalysis): string {
  const name = BODIES[level.target].name;
  if (a.hit) return a.termination === "impact" ? `Impact on ${name}!` : `Captured by ${name}!`;
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

export function ResultOverlay(p: ResultOverlayProps) {
  const { level, score, analysis: a } = p;
  const first = useRef<HTMLButtonElement>(null);
  const [shared, setShared] = useState<string | null>(null);
  const { onRetry } = p;
  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onRetry();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onRetry]);

  const share = async () => {
    const text = shareText(level, score, p.maxStars, a);
    const url = typeof location !== "undefined" ? location.href.split("#")[0] : "";
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title: "Starshot", text, url });
        setShared("Shared!");
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
  const checks: Array<[boolean, string]> = [[score.hit, `Reach ${name}'s capture zone`]];
  if (level.par) checks.push([score.efficient, `Δv within ${Math.round((PAR_TOLERANCE - 1) * 100)}% of par (${(level.par.deltaVKmS * PAR_TOLERANCE).toFixed(2)} km/s)`]);
  checks.push([
    score.skill,
    level.requiredFlyby
      ? `Fly through ${BODIES[level.requiredFlyby].name}'s sphere of influence on the way (or a bullseye)`
      : `Bullseye: pass within ${BULLSEYE_RADII} ${name} radii (${formatKm(BULLSEYE_RADII * BODIES[level.target].radiusKm)})`,
  ]);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="result-title" aria-describedby="result-summary">
      <div className={`result-card ${a.hit ? "is-hit" : "is-miss"}`}>
        <div className="stars" aria-label={`${score.stars} of ${p.maxStars} stars`} role="img">
          {Array.from({ length: p.maxStars }, (_, i) => (
            <svg key={i} viewBox="0 0 24 24" className={`star${i < score.stars ? " on" : ""}`} style={{ animationDelay: `${150 + i * 180}ms` }} aria-hidden="true">
              <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
            </svg>
          ))}
        </div>
        <h2 id="result-title">{headline(level, a)}</h2>
        <p id="result-summary" className="result-summary">
          {a.hit
            ? `Entered ${name}'s sphere of influence on ${formatDate(a.endEt)} after ${formatDays(a.flightDays)}.`
            : `Closest approach ${formatKm(a.closestKm)} on ${formatDate(a.closestEt)}; ${name}'s capture zone reaches ${formatKm(a.targetSoiKm)} from its centre.`}
          {score.hintCapped ? " Hint used: capped at 2 stars." : ""}
        </p>
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
        <div className="result-actions">
          <button ref={first} type="button" className="ghost-btn" onClick={p.onRetry}>
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
