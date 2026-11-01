/**
 * React hook around the physics worker.
 *
 * Previews are "latest request wins": at most one preview is in flight; newer
 * requests replace the queued one, and posts are throttled. Launches and hints
 * are awaited individually. Launches re-run the exact same simulateShot as the
 * preview (the worker is deterministic), so the flight matches the preview.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { HintQuery } from "./hint.js";
import type { HintResponse, ShotResponse, SimRequest, SimResponse } from "./protocol.js";
import type { ShotRequest } from "./shot.js";

/** Minimum gap between preview posts while dragging [ms]. */
export const PREVIEW_THROTTLE_MS = 30;

type Pending = { resolve: (r: SimResponse) => void; reject: (e: Error) => void };

export interface SimulationApi {
  /** Latest finished preview (may lag the aim by one request while dragging). */
  readonly preview: ShotResponse | null;
  readonly previewBusy: boolean;
  requestPreview(shot: ShotRequest): void;
  clearPreview(): void;
  launch(shot: ShotRequest): Promise<ShotResponse>;
  hint(query: HintQuery): Promise<HintResponse>;
}

const shotKey = (s: ShotRequest): string => JSON.stringify(s);

export function useSimulation(): SimulationApi {
  const workerRef = useRef<Worker | null>(null);
  const nextId = useRef(1);
  const inFlight = useRef<number | null>(null);
  const queued = useRef<ShotRequest | null>(null);
  const lastKey = useRef<string>("");
  const lastPost = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef(new Map<number, Pending>());
  const [preview, setPreview] = useState<ShotResponse | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);

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
    const shot = queued.current;
    queued.current = null;
    const id = nextId.current++;
    inFlight.current = id;
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
        if (res.kind === "shot") setPreview(res);
        if (!queued.current) setPreviewBusy(false);
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
      setPreviewBusy(false);
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
      queued.current = shot;
      setPreviewBusy(true);
      pump();
    },
    [pump],
  );

  const clearPreview = useCallback(() => {
    queued.current = null;
    lastKey.current = "";
    setPreview(null);
  }, []);

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

  return { preview, previewBusy, requestPreview, clearPreview, launch, hint };
}
