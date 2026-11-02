import { useEffect, useMemo, useRef, useState } from 'react';
import type { Flight } from '../lunar/flight';
import type { LunarModel } from '../lunar/model';
import { BRIDGE_CHANNEL, makeMapPayload, validCheckpoint, type MapCheckpoint, type MapPreferences } from './observatory-session';
import { Icon } from '../icons';
interface Props {
  flight: Flight | null; model: LunarModel | null; requestId: number; phase: string; et: number; playing: boolean;
  preferences: MapPreferences; finish: (checkpoint: MapCheckpoint) => void;
  checkpoint: (value: unknown) => void;
}
export function LaunchWindow(props: Props) {
  const iframe = useRef<HTMLIFrameElement>(null), latest = useRef(props); latest.current = props;
  const [session, setSession] = useState(() => crypto.randomUUID()), [ready, setReady] = useState(false), [failed, setFailed] = useState(false);
  const last = useRef<MapCheckpoint | null>(null), sequence = useRef(-1), finished = useRef(false), returnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const payload = useMemo(() => props.flight && props.model ? makeMapPayload(props.model, props.flight, props.requestId, props.phase, props.et, props.playing, props.preferences) : null,
    [props.flight, props.model, props.requestId, props.phase, props.et, props.playing, props.preferences]);
  const data = useRef(payload); data.current = payload;
  const send = (type: string, extra = {}) => iframe.current?.contentWindow?.postMessage({ channel: BRIDGE_CHANNEL, type, sessionId: session, requestId: latest.current.requestId, ...extra }, location.origin);
  const initialize = () => { if (data.current) send('init', { payload: data.current }); };
  function finish(value?: MapCheckpoint) {
    if (finished.current) return;
    finished.current = true; if (returnTimer.current) clearTimeout(returnTimer.current);
    const current = latest.current;
    current.finish(value ?? last.current ?? { et: current.et, playing: current.playing, preferences: current.preferences, cameraChanged: false, seq: 0 });
  }
  function close() {
    if (!ready) { finish(); return; }
    send('return-request'); returnTimer.current = setTimeout(() => finish(), 350);
  }
  useEffect(() => { initialize(); }, [payload, session]);
  useEffect(() => {
    const message = (event: MessageEvent) => {
      const value = event.data;
      if (event.origin !== location.origin || event.source !== iframe.current?.contentWindow || value?.channel !== BRIDGE_CHANNEL || value.sessionId !== session || value.requestId !== latest.current.requestId || finished.current) return;
      if (value.type === 'hello') { initialize(); return; }
      if (value.type === 'ready') { setReady(true); setFailed(false); }
      if (['checkpoint', 'return'].includes(value.type) && data.current && validCheckpoint(value.snapshot, data.current.flight.startEt, data.current.flight.endEt) && value.snapshot.seq > sequence.current) {
        sequence.current = value.snapshot.seq; last.current = value.snapshot;
        latest.current.checkpoint({ sessionId: session, requestId: latest.current.requestId, ...value.snapshot });
        if (value.type === 'return') finish(value.snapshot);
      }
    };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); close(); } };
    window.addEventListener('message', message); window.addEventListener('keydown', key);
    const timeout = setTimeout(() => setFailed(true), 15000);
    return () => { window.removeEventListener('message', message); window.removeEventListener('keydown', key); clearTimeout(timeout); if (returnTimer.current) clearTimeout(returnTimer.current); };
  }, [session, ready]);
  return <section className="launch-window" role="dialog" aria-modal="true" aria-label="Launch window">
    <header><strong>Launch window <small>{props.phase === 'aim' ? 'Preview' : 'First leap'}</small></strong><button autoFocus className="pill" onClick={close}><Icon name="close" />Return to {props.phase === 'aim' ? 'aim' : 'flight'}</button></header>
    <iframe key={session} ref={iframe} src={`${import.meta.env.BASE_URL}observatory/system-app.html?host=lunar&session=${session}&request=${props.requestId}`} title="Lunar launch window" onLoad={initialize} onError={() => setFailed(true)} />
    {!ready && <div className="map-loading" role="status"><p>{failed ? 'The map has not connected yet.' : props.flight ? 'Opening your lunar mission…' : 'Computing the current path…'}</p>{failed && <button className="pill" onClick={() => { sequence.current = -1; setFailed(false); setSession(crypto.randomUUID()); }}>Retry map</button>}<button className="pill" onClick={() => finish()}>Return to {props.phase === 'aim' ? 'aim' : 'flight'}</button></div>}
  </section>;
}
