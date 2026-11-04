/**
 * React hook around the physics worker.
 *
 * Previews are "latest request wins": at most one preview is in flight; newer
 * requests replace the queued one, and posts are throttled. So the finished
 * preview can be for an older aim than the one on screen: the game launches
 * only when it matches (see preview.ts), and then launches that preview's own
 * request, which the deterministic worker simulates bit for bit the same.
 * Launches and hints are awaited individually.
 *
 * Requesting a preview sets no React state; only the worker's answer does. The
 * request is made from an effect after every aim change, so a state update
 * there would add a second, nested render to every key press.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { FlightHintQuery as HintQuery, FlightRequest } from './flight-request';
import { shotKey } from "./preview.js";
import type { HintResponse, ShotResponse, SimRequest, SimResponse } from "./protocol.js";
import type { ShotRequest } from "./shot.js";

/** Minimum gap between preview posts while dragging [ms]. */
export const PREVIEW_THROTTLE_MS = 30;

type Pending = { resolve: (r: SimResponse) => void; reject: (e: Error) => void };

/**
 * The hook's preview bookkeeping without React or a worker, so tests drive the same code.
 * It queues a copy of each shot, so the key it answers is the key of the request it posted,
 * whatever the caller later does to its own object.
 */
export class PreviewQueue<S extends FlightRequest> {
  /** Id of the preview in flight, if any; only its answer belongs to this queue. */
  inFlight: number | null = null;
  private inFlightKey = "";
  private queued: { readonly shot: S; readonly key: string } | null = null;
  private lastKey = "";
  /** Queues the shot unless it repeats the last request; true when there is something to post. */
  request(shot: S): boolean {
    const key = shotKey(shot);
    if (key === this.lastKey) return false;
    this.lastKey = key;
    this.queued = { shot: structuredClone(shot), key };
    return true;
  }
  get ready(): boolean {
    return this.inFlight === null && this.queued !== null;
  }
  /** Takes the queued shot as the preview request with this id, now in flight. */
  post(id: number): Extract<SimRequest, { kind: "shot" }> {
    const { shot, key } = this.queued!;
    this.queued = null;
    this.inFlight = id;
    this.inFlightKey = key;
    return { kind: "shot", id, purpose: "preview", shot };
  }
  /**
   * The in-flight preview answered, with a path or an error: returns its key. A failed shot
   * that is still the last one asked may be asked again; a newer one stays queued.
   */
  answer(res: SimResponse): string {
    this.inFlight = null;
    if (res.kind === "error" && this.lastKey === this.inFlightKey) this.lastKey = "";
    return this.inFlightKey;
  }
  /** The worker failed: nothing asked so far will be answered, so any shot may be asked again. */
  fail(): string {
    this.inFlight = null;
    const key = this.lastKey;
    this.lastKey = "";
    return key;
  }
  stop() {
    this.inFlight = null;
    this.lastKey = "";
  }
}

export interface SimulationApi<S extends FlightRequest = ShotRequest> {
  /** Latest finished preview (may lag the aim by one request while dragging; check its shot). */
  readonly preview: ShotResponse<S> | null;
  /**
   * shotKey of the last preview request the worker answered, with a path or an
   * error. When it names a shot that `preview` does not, that shot failed.
   */
  readonly answeredKey: string;
  requestPreview(shot: S): void;
  launch(shot: S): Promise<ShotResponse<S>>;
  hint(query: HintQuery): Promise<HintResponse>;
}

export function useSimulation<S extends FlightRequest = ShotRequest>(): SimulationApi<S> {
  const workerRef = useRef<Worker | null>(null);
  const nextId = useRef(1);
  const [previews] = useState(() => new PreviewQueue<S>());
  const lastPost = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef(new Map<number, Pending>());
  // One state for both, so an answer re-renders once.
  const [answered, setAnswered] = useState<{ readonly preview: ShotResponse<S> | null; readonly key: string }>({
    preview: null,
    key: "",
  });

  const pump = useCallback(() => {
    const worker = workerRef.current;
    if (!worker || !previews.ready) return;
    const wait = PREVIEW_THROTTLE_MS - (performance.now() - lastPost.current);
    if (wait > 0) {
      if (!timer.current) {
        timer.current = setTimeout(() => {
          timer.current = null;
          pump();
        }, wait);
      }
      return;
    }
    const req = previews.post(nextId.current++);
    lastPost.current = performance.now();
    worker.postMessage(req);
  }, []);

  useEffect(() => {
    const worker = new Worker(new URL("./sim.worker.ts", import.meta.url), { type: "module", name: "starshot-physics" });
    workerRef.current = worker;
    const waiting = pending.current;
    worker.onmessage = (event: MessageEvent<SimResponse>) => {
      const res = event.data;
      if (res.id === previews.inFlight) {
        const key = previews.answer(res);
        setAnswered((prev) => ({ preview: res.kind === "shot" ? res as ShotResponse<S> : prev.preview, key }));
        pump();
        return;
      }
      const p = waiting.get(res.id);
      if (!p) return;
      waiting.delete(res.id);
      if (res.kind === "error") p.reject(new Error(res.message));
      else p.resolve(res);
    };
    worker.onerror = (event) => {
      for (const p of waiting.values()) p.reject(new Error(event.message || "physics worker failed"));
      waiting.clear();
      // Nothing requested so far will be answered: a launch waiting on it must give up.
      const key = previews.fail();
      setAnswered((prev) => ({ preview: prev.preview, key }));
    };
    // A request made before the worker existed (first render) is sent now.
    pump();
    return () => {
      worker.terminate();
      workerRef.current = null;
      previews.stop();
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      for (const p of waiting.values()) p.reject(new Error("physics worker stopped"));
      waiting.clear();
    };
  }, [pump]);

  const requestPreview = useCallback(
    (shot: S) => {
      if (previews.request(shot)) pump();
    },
    [pump],
  );

  const call = useCallback(<T extends SimResponse>(build: (id: number) => SimRequest): Promise<T> => {
    const worker = workerRef.current;
    if (!worker) return Promise.reject(new Error("physics worker not ready"));
    const id = nextId.current++;
    return new Promise<T>((resolve, reject) => {
      pending.current.set(id, { resolve: resolve as (r: SimResponse) => void, reject });
      worker.postMessage(build(id));
    });
  }, []);

  const launch = useCallback(
    (shot: S) => call<ShotResponse<S>>((id) => ({ kind: "shot", id, purpose: "launch", shot })),
    [call],
  );
  const hint = useCallback((query: HintQuery) => call<HintResponse>((id) => ({ kind: "hint", id, query })), [call]);

  return { preview: answered.preview, answeredKey: answered.key, requestPreview, launch, hint };
}
