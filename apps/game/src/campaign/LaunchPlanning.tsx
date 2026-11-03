import { dateFromEt } from '@starshot/ephemeris';
import { parkingPhase } from '@starshot/physics/lunar';
import { Icon } from '@starshot/presentation/icons';
import { addDaysIso, daysBetweenIso } from '../sim/shot';
import type { CampaignController } from './use-campaign';
export function LaunchPlanning({ c }: { c: CampaignController }) {
  return (
    <div className="c-planning" aria-label="Launch planning">
      <label>
        <span>
          Launch date (UTC)
          {c.store.session.parking && (
            <output className="c-parking-time">
              {dateFromEt(c.view.clock).toISOString().slice(11, 19)}
            </output>
          )}
        </span>
        <input
          aria-label="Launch date (UTC)"
          type="date"
          min={c.store.level.window.startIso}
          max={addDaysIso(c.store.level.window.startIso, c.store.level.window.days)}
          value={dateFromEt(c.view.clock).toISOString().slice(0, 10)}
          disabled={c.release.pending}
          onFocus={c.release.actions.freezeParking}
          onChange={(e) => {
            if (e.target.value)
              c.release.actions.day(daysBetweenIso(c.store.level.window.startIso, e.target.value));
          }}
        />
      </label>
      {c.store.session.parking && (
        <>
          <label>
            Orbit position
            <input
              aria-label="Orbit position (degrees)"
              type="number"
              min="0"
              max="360"
              step="1"
              value={Number(parkingPhase(c.store.session.parking, c.view.clock).toFixed(1))}
              disabled={c.release.pending}
              onFocus={c.release.actions.freezeParking}
              onChange={(e) => {
                if (e.target.value !== '' && Number.isFinite(e.target.valueAsNumber))
                  c.release.actions.orbitPhase(e.target.valueAsNumber);
              }}
            />
          </label>
          <button
            className="pill"
            aria-label={c.store.session.paused ? 'Play orbit' : 'Pause orbit'}
            onClick={c.playback.pause}
            disabled={c.release.pending}
          >
            <Icon name={c.store.session.paused ? 'play' : 'pause'} />
          </button>
          <label className="c-phase-range">
            <span className="sr-only">Move around orbit</span>
            <input
              aria-label="Move around orbit"
              type="range"
              min="0"
              max="360"
              step="0.1"
              value={parkingPhase(c.store.session.parking, c.view.clock)}
              disabled={c.release.pending}
              onPointerDown={c.release.actions.freezeParking}
              onFocus={c.release.actions.freezeParking}
              onChange={(e) => c.release.actions.orbitPhase(e.target.valueAsNumber)}
            />
          </label>
        </>
      )}
    </div>
  );
}
