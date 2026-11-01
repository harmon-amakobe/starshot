import { useCallback, useMemo, useState } from "react";
import type { PlanetId } from "@starshot/ephemeris";
import { CAMPAIGN, sandboxLevel, type Level, type LevelId } from "./levels.js";
import { loadProgress, saveProgress, totalStars, withCoachSeen, withResult } from "./progress.js";
import type { Score } from "./scoring.js";
import type { ShotAnalysis } from "./sim/shot.js";
import { GameScreen } from "./ui/GameScreen.js";
import { LevelSelect } from "./ui/LevelSelect.js";
import { AboutScreen, HowToScreen, TitleScreen } from "./ui/TitleScreen.js";

type Screen =
  | { readonly name: "title" }
  | { readonly name: "howto" }
  | { readonly name: "about" }
  | { readonly name: "levels" }
  | { readonly name: "game"; readonly levelId: LevelId };

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: "title" });
  const [progress, setProgress] = useState(() => loadProgress());
  const [sandboxTarget, setSandboxTarget] = useState<PlanetId>("mars");
  const sandbox = useMemo(() => sandboxLevel(sandboxTarget), [sandboxTarget]);
  const ids = CAMPAIGN.map((l) => l.id);

  const levelFor = (id: LevelId): Level => (id === "sandbox" ? sandbox : CAMPAIGN.find((l) => l.id === id) ?? CAMPAIGN[0]!);

  const record = useCallback((level: Level, score: Score, analysis: ShotAnalysis) => {
    if (level.sandbox) return;
    setProgress((p) => {
      const next = withResult(p, level.id, score.stars, score.hit, analysis.deltaVKmS);
      saveProgress(next);
      return next;
    });
  }, []);

  const coachSeen = useCallback(() => {
    setProgress((p) => {
      const next = withCoachSeen(p);
      if (next !== p) saveProgress(next);
      return next;
    });
  }, []);

  switch (screen.name) {
    case "title":
      return (
        <TitleScreen
          totalStars={totalStars(progress)}
          onPlay={() => setScreen({ name: "levels" })}
          onHowTo={() => setScreen({ name: "howto" })}
          onAbout={() => setScreen({ name: "about" })}
        />
      );
    case "howto":
      return <HowToScreen onBack={() => setScreen({ name: "title" })} />;
    case "about":
      return <AboutScreen onBack={() => setScreen({ name: "title" })} />;
    case "levels":
      return (
        <LevelSelect
          progress={progress}
          sandbox={sandbox}
          onPick={(levelId) => setScreen({ name: "game", levelId })}
          onBack={() => setScreen({ name: "title" })}
        />
      );
    case "game": {
      const level = levelFor(screen.levelId);
      const index = ids.indexOf(level.id);
      const nextId: LevelId | undefined = level.sandbox ? undefined : index + 1 < ids.length ? ids[index + 1] : "sandbox";
      return (
        <GameScreen
          key={`${level.id}:${level.target}`}
          level={level}
          hasNext={nextId !== undefined}
          onExit={() => setScreen({ name: "levels" })}
          onNext={() => {
            // Offered only after a hit, which is what unlocks the next level.
            if (nextId) setScreen({ name: "game", levelId: nextId });
          }}
          onRecord={record}
          onSandboxTarget={level.sandbox ? setSandboxTarget : undefined}
          showCoach={!progress.coachSeen}
          onCoachSeen={coachSeen}
        />
      );
    }
  }
}
