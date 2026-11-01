import { useId, useState } from "react";
import { BODIES, type PlanetId } from "@starshot/ephemeris";
import type { Level } from "../levels.js";
import { SANDBOX_TARGETS } from "../levels.js";

export const HONESTY_NOTE =
  "2D mode: orbits flattened onto the ecliptic. Planet positions: NASA/JPL approximate elements (1800-2050). Inspired by astlo by Mark Macharia.";

export interface HudProps {
  readonly level: Level;
  readonly dateLabel: string;
  readonly dateCaption: string;
  readonly onExit: () => void;
  readonly onSandboxTarget?: (target: PlanetId) => void;
  readonly targetLocked: boolean;
}

export function Hud({ level, dateLabel, dateCaption, onExit, onSandboxTarget, targetLocked }: HudProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const noteId = useId();
  const selectId = useId();
  const color = BODIES[level.target].color;
  return (
    <header className="hud">
      <div className="hud-row">
        <button type="button" className="icon-btn" aria-label="Back to level select" onClick={onExit}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="hud-title">
          <span className="hud-kicker">{level.sandbox ? "Free play" : `Level ${level.number}`}</span>
          <h1 className="hud-name" tabIndex={-1} id="game-title">
            {level.title}
          </h1>
        </div>
        <span className="chip mode-chip" title={HONESTY_NOTE}>
          2D
        </span>
        <button
          type="button"
          className={`icon-btn info-btn${infoOpen ? " is-on" : ""}`}
          aria-label="About this simulation"
          aria-expanded={infoOpen}
          aria-controls={noteId}
          onClick={() => setInfoOpen((v) => !v)}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M12 11v6M12 7.5v.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="hud-row hud-meta">
        <div className="chip target-chip" style={{ ["--planet" as string]: color }}>
          <span className="dot" aria-hidden="true" />
          {level.sandbox && onSandboxTarget ? (
            <>
              <label htmlFor={selectId} className="wide-only">
                Target
              </label>
              <select
                id={selectId}
                value={level.target}
                disabled={targetLocked}
                onChange={(e) => onSandboxTarget(e.target.value as PlanetId)}
              >
                {SANDBOX_TARGETS.map((p) => (
                  <option key={p} value={p}>
                    {BODIES[p].name}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <span>
              <span className="wide-only">Target </span>
              <strong>{BODIES[level.target].name}</strong>
              {level.requiredFlyby ? <> via {BODIES[level.requiredFlyby].name}</> : null}
            </span>
          )}
        </div>
        <div className="chip date-chip">
          <span className="date-caption">{dateCaption}</span>
          <time>{dateLabel}</time>
        </div>
      </div>
      {infoOpen ? (
        <p className="info-note" id={noteId}>
          {HONESTY_NOTE} {level.blurb}
        </p>
      ) : (
        <span id={noteId} hidden />
      )}
    </header>
  );
}
