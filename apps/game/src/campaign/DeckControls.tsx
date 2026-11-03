import { Icon } from '@starshot/presentation/icons';
import { stepRate } from './playback';
import { unitOf } from './session';
import type { CampaignController } from './use-campaign';
export function UnitButton({ c }: { c: CampaignController }) {
  const p = c.store.session.preferences,
    unit = unitOf(p),
    names = { light: 'Light-time', metric: 'Metric', imperial: 'Imperial' };
  return (
    <button
      className="pill c-units"
      aria-label={`Units: ${names[unit]}. Change units`}
      onClick={() => {
        const order = ['light', 'metric', 'imperial'] as const;
        c.playback.preferences({
          units: {
            ...p.units,
            [p.scientific ? 'science' : 'simple']: order[(order.indexOf(unit) + 1) % 3]!,
          },
        });
      }}
    >
      {unit === 'light' ? (
        <Icon name="wave" />
      ) : (
        <b className="unit-symbol">{unit === 'metric' ? 'km' : 'mi'}</b>
      )}
      <span>{names[unit]}</span>
    </button>
  );
}
export function ModeButtons({ c }: { c: CampaignController }) {
  const p = c.store.session.preferences;
  return (
    <div className="c-modes" role="group" aria-label="Instrument detail">
      {[false, true].map((scientific) => (
        <button
          key={String(scientific)}
          className={`${p.scientific === scientific ? 'selected' : ''} ${p.expanded && p.scientific === scientific ? 'pill' : 'icon-only'}`}
          aria-label={scientific ? 'Scientific' : 'Simplified'}
          aria-pressed={p.scientific === scientific}
          title={scientific ? 'Scientific' : 'Simplified'}
          onClick={() =>
            c.playback.preferences({
              scientific,
              ...(p.sizeLinked ? { trueSize: scientific } : {}),
            })
          }
        >
          <Icon name={scientific ? 'orbit' : 'face'} />
          {p.expanded && p.scientific === scientific && (
            <span>{scientific ? 'Scientific' : 'Simplified'}</span>
          )}
        </button>
      ))}
    </div>
  );
}
export function SpeedPill({ c }: { c: CampaignController }) {
  const p = c.store.session.preferences,
    f = c.view.active,
    base =
      c.store.session.parking && c.store.session.phase === 'aim'
        ? 120
        : f
          ? (f.analysis.endEt - f.shot.launchEt) /
            Math.max(4, Math.min(9, 2.5 + f.analysis.flightDays / 200))
          : 86400;
  const parking = !!c.store.session.parking && c.store.session.phase === 'aim';
  const light = !parking && p.scientific && unitOf(p) === 'light';
  const steps = parking
    ? [1, 10, 30, 60, 120, 300, 600]
    : light
      ? [0, 0.25, 0.5, 0.75, 1, 2, 5, 10, 25, 100, 300]
      : p.scientific
        ? [1, 60, 3600, 86400, 864000, 8640000, 86400000, 1e9]
        : [1, base, base * 2, base * 3, base * 5, base * 10];
  const value = light ? p.lightRate : p.rate,
    effective = light ? value : value || base,
    multiple = effective / base;
  const label = parking
    ? `${p.rate || 120} s/s`
    : light
      ? value === 0
        ? 'Real time'
        : `${value}c`
      : value === 1
        ? 'Real time'
        : p.scientific
          ? `${(effective / 86400).toPrecision(3)} day/s`
          : `${multiple < 0.01 ? multiple.toPrecision(2) : Number(multiple.toFixed(2))}x`;
  const step = (direction: number) => {
    const next = stepRate(effective, steps, direction);
    c.playback.preferences(light ? { lightRate: next } : { rate: next === base ? 0 : next });
  };
  return (
    <div
      className="pill c-speed"
      aria-label="Trip speed"
      title="Double-click for real time"
      onDoubleClick={() => c.playback.preferences({ rate: 1, lightRate: 0 })}
    >
      <button aria-label="Decrease trip speed" onClick={() => step(-1)}>
        <span aria-hidden="true">◂</span>
      </button>
      <output>{label}</output>
      <button aria-label="Increase trip speed" onClick={() => step(1)}>
        <span aria-hidden="true">▸▸</span>
      </button>
    </div>
  );
}
