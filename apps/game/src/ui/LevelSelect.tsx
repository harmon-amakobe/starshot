import { useEffect } from "react";
import { BODIES } from "@starshot/ephemeris";
import { CAMPAIGN, type Level, type LevelId } from "../levels.js";
import { isUnlocked, type Progress } from "../progress.js";
import { Backdrop } from "./TitleScreen.js";

export interface LevelSelectProps {
  readonly progress: Progress;
  readonly sandbox: Level;
  readonly onPick: (id: LevelId) => void;
  readonly onBack: () => void;
}

function Stars({ earned, max }: { readonly earned: number; readonly max: number }) {
  return (
    <span className="card-stars" aria-label={`${earned} of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" className={`star small${i < earned ? " on" : ""}`} aria-hidden="true">
          <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
        </svg>
      ))}
    </span>
  );
}

export function LevelSelect({ progress, sandbox, onPick, onBack }: LevelSelectProps) {
  useEffect(() => {
    document.getElementById("levels-heading")?.focus({ preventScroll: true });
  }, []);
  const ids = CAMPAIGN.map((l) => l.id);
  const cards = [...CAMPAIGN, sandbox];
  return (
    <main className="menu levels-screen">
      <Backdrop />
      <div className="levels-wrap">
        <div className="levels-head">
          <button type="button" className="icon-btn" aria-label="Back to title" onClick={onBack}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 id="levels-heading" tabIndex={-1}>
            Choose a launch
          </h1>
        </div>
        <ul className="level-grid">
          {cards.map((level, index) => {
            const isSandbox = Boolean(level.sandbox);
            const open = isSandbox || isUnlocked(ids, index, progress);
            const earned = progress.levels[level.id]?.stars ?? 0;
            const color = BODIES[level.target].color;
            return (
              <li key={level.id}>
                <button
                  type="button"
                  className={`level-card${open ? "" : " locked"}`}
                  style={{ ["--planet" as string]: color }}
                  disabled={!open}
                  onClick={() => onPick(level.id)}
                  aria-label={`${isSandbox ? "Sandbox" : `Level ${level.number}`}: ${level.title}. ${
                    open ? (isSandbox ? "Free play." : `${earned} of 3 stars.`) : "Locked: earn a star on the previous level."
                  }`}
                >
                  <span className="card-planet" aria-hidden="true" />
                  <span className="card-body">
                    <span className="card-kicker">
                      {isSandbox ? "Free play" : `Level ${level.number}`} &#xB7; {BODIES[level.target].name}
                      {level.requiredFlyby ? ` via ${BODIES[level.requiredFlyby].name}` : ""}
                    </span>
                    <span className="card-title">{level.title}</span>
                    <span className="card-blurb">{open ? level.blurb : "Earn a star on the previous level to unlock."}</span>
                  </span>
                  <span className="card-side" aria-hidden="true">
                    {isSandbox ? <span className="card-tag">Any planet</span> : open ? <Stars earned={earned} max={3} /> : <span className="lock">Locked</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
