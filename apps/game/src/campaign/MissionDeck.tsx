import { BODIES, dateFromEt } from '@starshot/ephemeris';
import { Icon } from '@starshot/presentation/icons';
import { bodyName, isLunarLevel, missionNumber } from '../missions';
import type { Readiness } from './lunar-readiness';
import type { CampaignController } from './use-campaign';
export function MissionDeck({ c, open, toggle, readiness }: { c: CampaignController; open: boolean; toggle: () => void; readiness: Readiness }) {
  return <section className={`c-mission ${open ? 'open' : ''}`} aria-label="Mission deck"><button className="pill c-mission-toggle" aria-expanded={open} onClick={toggle}><span className="c-earth-dot" /><span className="c-mission-label"><b className="c-mission-short-title">{c.store.level.title}</b><span className="c-mission-route">Earth <span>→</span>{c.store.level.requiredFlyby && <>{BODIES[c.store.level.requiredFlyby].name}<span>→</span></>}{bodyName(c.store.level.target)}</span></span><Icon name="down" /></button>
    {open && <div className="c-mission-body"><div><span className="eyebrow">{c.store.level.sandbox ? 'Open Solar System' : `Mission ${missionNumber(c.store.level.id)}`}</span><b>{c.store.level.title}</b><p>{c.store.level.blurb}</p><p>{c.store.level.captureZoneScale && c.store.level.captureZoneScale > 1 ? 'Training zone: 3× the real sphere of influence. Later missions use the real capture zone.' : c.store.level.requiredFlyby ? `A ${BODIES[c.store.level.requiredFlyby].name} flyby earns the skill star. Aim for the final target.` : 'Reach the target, save fuel and aim for a close approach.'}</p></div>
      {c.hints.hint && <div className="c-guide"><b>{c.hints.hint.hits ? 'Guide ready' : 'Closest guide'}</b><span>{c.hints.hint.aim.angleDeg.toFixed(2)}° · {c.hints.hint.aim.speedKmS.toFixed(3)} km/s</span><button className="primary" disabled={c.store.session.phase !== 'aim' || c.release.pending || !readiness.scene} onClick={c.hints.applyGuide}>Apply guide</button><small>Applying a guide limits this attempt to 2 stars. Retry keeps this limit.</small></div>}
      {isLunarLevel(c.store.level) && <SearchSlot c={c} readiness={readiness} />}
    </div>}
  </section>;
}

/**
 * The bounded Moon route search, in its own slot beside the guide. A finished search changes
 * nothing until the pilot presses Apply searched route; the notices go to the polite status line.
 */
function SearchSlot({ c, readiness }: { c: CampaignController; readiness: Readiness }) {
  const found = c.hints.searched, aiming = c.store.session.phase === 'aim' && !c.release.pending && readiness.scene;
  return <div className="c-guide c-search" role="group" aria-label="Route search">
    <b>{found ? 'Searched route' : 'Route search'}</b>
    <span>{found
      ? `${dateFromEt(found.launchEt).toISOString().slice(0, 10)} · ${found.aim.angleDeg.toFixed(2)}° · ${found.aim.speedKmS.toFixed(3)} km/s · ${found.simulations} flights`
      : 'Flies a fixed grid of launch days, burns and angles for the cheapest hit.'}</span>
    {/* Busy, the button stays focusable for a keyboard pilot; aria-disabled and the handler hold it. */}
    <button className="pill" disabled={!aiming} aria-disabled={c.hints.searchBusy || undefined} onClick={c.hints.searchBusy ? undefined : c.hints.search}>{c.hints.searchBusy ? 'Searching routes…' : 'Search routes'}</button>
    {found && <button className="primary" disabled={!aiming} onClick={c.hints.applySearched}>Apply searched route</button>}
    <small>A search never changes your aim. Applying its route limits this attempt to 2 stars.</small>
  </div>;
}
