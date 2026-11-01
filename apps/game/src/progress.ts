/**
 * Best result per level, kept in localStorage under "starshot.progress.v1".
 * Storage can be missing or throw (private browsing, quota): every access is
 * guarded and the game simply forgets progress in that case.
 */
export const PROGRESS_KEY = "starshot.progress.v1";

export interface LevelProgress {
  readonly stars: number;
  /** Lowest delta-v [km/s] among hits. */
  readonly bestDeltaVKmS?: number;
}

export interface Progress {
  readonly version: 1;
  readonly levels: Readonly<Record<string, LevelProgress>>;
}

export const EMPTY_PROGRESS: Progress = { version: 1, levels: {} };

interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStore(): KeyValueStore | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export function loadProgress(store: KeyValueStore | undefined = defaultStore()): Progress {
  try {
    const raw = store?.getItem(PROGRESS_KEY);
    if (!raw) return EMPTY_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<Progress>;
    if (parsed.version !== 1 || typeof parsed.levels !== "object" || parsed.levels === null) return EMPTY_PROGRESS;
    const levels: Record<string, LevelProgress> = {};
    for (const [id, p] of Object.entries(parsed.levels)) {
      const stars = Number((p as LevelProgress | undefined)?.stars);
      if (!Number.isFinite(stars)) continue;
      const dv = Number((p as LevelProgress).bestDeltaVKmS);
      levels[id] = {
        stars: Math.max(0, Math.min(3, Math.round(stars))),
        ...(Number.isFinite(dv) ? { bestDeltaVKmS: dv } : {}),
      };
    }
    return { version: 1, levels };
  } catch {
    return EMPTY_PROGRESS;
  }
}

export function saveProgress(progress: Progress, store: KeyValueStore | undefined = defaultStore()): void {
  try {
    store?.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Storage full or blocked: progress is best-effort.
  }
}

/** Progress after one finished shot: keeps the best stars and the lowest delta-v among hits. */
export function withResult(progress: Progress, levelId: string, stars: number, hit: boolean, deltaVKmS: number): Progress {
  const prev = progress.levels[levelId];
  const bestStars = Math.max(prev?.stars ?? 0, stars);
  const prevDv = prev?.bestDeltaVKmS;
  const bestDv = hit ? Math.min(prevDv ?? Infinity, deltaVKmS) : prevDv;
  const next: LevelProgress = { stars: bestStars, ...(bestDv !== undefined && Number.isFinite(bestDv) ? { bestDeltaVKmS: bestDv } : {}) };
  return { version: 1, levels: { ...progress.levels, [levelId]: next } };
}

/** Campaign level n (0-based) is open once level n-1 has at least one star. */
export function isUnlocked(campaignIds: readonly string[], index: number, progress: Progress): boolean {
  if (index <= 0) return true;
  const prevId = campaignIds[index - 1];
  return prevId !== undefined && (progress.levels[prevId]?.stars ?? 0) > 0;
}

export function totalStars(progress: Progress): number {
  return Object.values(progress.levels).reduce((sum, p) => sum + p.stars, 0);
}
