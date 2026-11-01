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
import type { HintQuery } from "./hint.js";
import { shotKey } from "./preview.js";
import type { HintResponse, ShotResponse, SimRequest, SimResponse } from "./protocol.js";
import type { ShotRequest } from "./shot.js";

/** Minimum gap between preview posts while dragging [ms]. */
export const PREVIEW_THROTTLE_MS = 30;

type Pending = { resolve: (r: SimResponse) => void; reject: (e: Error) => void };

export interface SimulationApi {
  /** Latest finished preview (may lag the aim by one request while dragging; check its shot). */
  readonly preview: ShotResponse | null;
  /**
   * shotKey of the last preview request the worker answered, with a path or an
   * error. When it names a shot that `preview` does not, that shot failed.
   */
  readonly answeredKey: string;
  requestPreview(shot: ShotRequest): void;
  launch(shot: ShotRequest): Promise<ShotResponse>;
  hint(query: HintQuery): Promise<HintResponse>;
}

export function useSimulation(): SimulationApi {
  const workerRef = useRef<Worker | null>(null);
  const nextId = useRef(1);
  const inFlight = useRef<number | null>(null);
  const inFlightKey = useRef("");
  const queued = useRef<{ readonly shot: ShotRequest; readonly key: string } | null>(null);
  const lastKey = useRef<string>("");
  const lastPost = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef(new Map<number, Pending>());
  // One state for both, so an answer re-renders once.
  const [answered, setAnswered] = useState<{ readonly preview: ShotResponse | null; readonly key: string }>({
    preview: null,
    key: "",
  });

  const pump = useCallback(() => {
    const worker = workerRef.current;
    if (!worker || inFlight.current !== null || !queued.current) return;
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
    const { shot, key } = queued.current;
    queued.current = null;
    const id = nextId.current++;
    inFlight.current = id;
    inFlightKey.current = key;
    lastPost.current = performance.now();
    const req: SimRequest = { kind: "shot", id, purpose: "preview", shot };
    worker.postMessage(req);
  }, []);

  useEffect(() => {
    const worker = new Worker(new URL("./sim.worker.ts", import.meta.url), { type: "module", name: "starshot-physics" });
    workerRef.current = worker;
    const waiting = pending.current;
    worker.onmessage = (event: MessageEvent<SimResponse>) => {
      const res = event.data;
      if (res.id === inFlight.current) {
        inFlight.current = null;
        const key = inFlightKey.current;
        setAnswered((prev) => ({ preview: res.kind === "shot" ? res : prev.preview, key }));
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
      inFlight.current = null;
      // Nothing requested so far will be answered: a launch waiting on it must give up.
      const key = lastKey.current;
      setAnswered((prev) => ({ preview: prev.preview, key }));
    };
    // A request made before the worker existed (first render) is sent now.
    pump();
    return () => {
      worker.terminate();
      workerRef.current = null;
      inFlight.current = null;
      lastKey.current = "";
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      for (const p of waiting.values()) p.reject(new Error("physics worker stopped"));
      waiting.clear();
    };
  }, [pump]);

  const requestPreview = useCallback(
    (shot: ShotRequest) => {
      const key = shotKey(shot);
      if (key === lastKey.current) return;
      lastKey.current = key;
      queued.current = { shot, key };
      pump();
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
    (shot: ShotRequest) => call<ShotResponse>((id) => ({ kind: "shot", id, purpose: "launch", shot })),
    [call],
  );
  const hint = useCallback((query: HintQuery) => call<HintResponse>((id) => ({ kind: "hint", id, query })), [call]);

  return { preview: answered.preview, answeredKey: answered.key, requestPreview, launch, hint };
}
