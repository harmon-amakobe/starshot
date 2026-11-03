import { Hangar } from './Hangar';
import type { SceneFrame } from './scene-types';
import type { CampaignController } from './use-campaign';
import type { useHangar } from './use-hangar';
export function HangarView({
  c,
  frame,
  hangar,
  sound,
}: {
  c: CampaignController;
  frame: SceneFrame;
  hangar: ReturnType<typeof useHangar>;
  sound: (kind: 'pull', value?: number) => void;
}) {
  const {
    inspection,
    setInspection,
    demoCharge,
    setDemoCharge,
    demoDrag,
    backFromHangar,
    releaseDemo,
  } = hangar;
  if (!inspection) return null;
  return (
    <>
      <Hangar
        part={inspection}
        select={setInspection}
        back={backFromHangar}
        flat={frame.renderer === 'Canvas 2D'}
        charge={demoCharge}
        setCharge={(value) => {
          setDemoCharge(value);
          sound('pull', value);
        }}
        release={releaseDemo}
        rotate={(direction) =>
          c.playback.preferences({
            orbit: [
              c.store.session.preferences.orbit[0],
              Math.max(-1.2, Math.min(1.2, c.store.session.preferences.orbit[1] + direction * 0.2)),
            ],
          })
        }
      />
      {inspection === 'engine' && (
        <button
          className="c-ring-handle c-demo-ring"
          style={{ left: frame.demoGrip[0], top: frame.demoGrip[1] }}
          aria-label="Pull engine demonstration ring"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            demoDrag.current = { x: e.clientX, charge: demoCharge };
          }}
          onPointerMove={(e) => {
            const d = demoDrag.current;
            if (d)
              setDemoCharge(
                Math.max(
                  0,
                  Math.min(1, d.charge + (d.x - e.clientX) / Math.max(70, innerHeight * 0.25)),
                ),
              );
          }}
          onPointerUp={() => {
            if (demoDrag.current) {
              demoDrag.current = null;
              releaseDemo();
            }
          }}
          onPointerCancel={() => {
            demoDrag.current = null;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') releaseDemo();
          }}
        />
      )}
    </>
  );
}
