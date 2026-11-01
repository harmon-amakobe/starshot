import { useEffect, useReducer, useRef, useState } from 'react';
import { LunarModel, type RailData } from './lunar/model';
import { requestFor, type Flight } from './lunar/flight';
import { shotReducer } from './lunar/shot-state';
export function useFlight() {
  const [state, dispatch] = useReducer(shotReducer, { id: 1, request: requestFor(0, 0), preview: null,
    launch: null, phase: 'aim', pendingRelease: false, error: null });
  const [model, setModel] = useState<LunarModel | null>(null);
  const worker = useRef<Worker | null>(null), busy = useRef(false), latest = useRef(state), sent = useRef(0);
  latest.current = state;
  const send = useRef<() => void>(() => {});
  useEffect(() => {
    let alive = true;
    const engine = new Worker(new URL('./lunar/worker.ts', import.meta.url), { type: 'module' });
    worker.current = engine;
    send.current = () => {
      const current = latest.current;
      if (busy.current || current.phase !== 'aim' || sent.current === current.id) return;
      busy.current = true; sent.current = current.id;
      engine.postMessage({ id: current.id, request: current.request });
    };
    engine.onmessage = (event: MessageEvent<{ id: number; flight?: Flight; error?: string }>) => {
      if (!alive) return;
      busy.current = false;
      if (event.data.flight) dispatch({ type: 'ready', id: event.data.id, flight: event.data.flight });
      else dispatch({ type: 'error', id: event.data.id, error: event.data.error ?? 'The preview could not be computed' });
      // Only the most recent aim is sent next, so rapid drags cannot queue old shots.
      send.current();
    };
    engine.onerror = () => { busy.current = false; dispatch({ type: 'error', id: latest.current.id, error: 'The flight worker could not start. Reload to retry.' }); };
    fetch(`${import.meta.env.BASE_URL}lunar/moon-rail.json`).then(response => {
      if (!response.ok) throw new Error('Moon data could not load');
      return response.json() as Promise<RailData>;
    }).then(rail => {
      if (!alive) return;
      setModel(new LunarModel(rail)); busy.current = true; sent.current = latest.current.id;
      engine.postMessage({ id: latest.current.id, request: latest.current.request, rail });
    }).catch(error => { if (alive) dispatch({ type: 'error', id: latest.current.id, error: String(error) }); });
    return () => { alive = false; engine.terminate(); worker.current = null; busy.current = false; sent.current = 0; };
  }, []);
  useEffect(() => { if (model) send.current(); }, [state.id, model]);
  return { state, dispatch, model };
}
