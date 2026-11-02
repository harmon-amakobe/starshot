import type { Level } from '../levels';

/** The mission title over the scene, with the one-line instruction for a first pull. */
export function IntroCaption({ level, faded }: { level: Level; faded: boolean }) {
  return (
    <div className={`c-caption ${faded ? 'faded' : ''}`}>
      <span className="eyebrow">
        {level.sandbox ? 'Open Solar System' : `Chapter one · Mission ${level.number}`}
      </span>
      <h1>{level.title}</h1>
      <p>Pull the engine ring. Watch the dots. Release.</p>
    </div>
  );
}
