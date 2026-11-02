import * as THREE from 'three';
import type { Vec3 } from '@starshot/ephemeris';
import type { LunarModel } from '../lunar/model';
import type { ViewState, FrameReadout } from './view-types';
import { parkingOrbit, routePoints } from './orbital-context';
import type { frameGeometry } from './coordinates';
export class RouteView {
  readonly group = new THREE.Group();
  private future: THREE.Points;
  private past: THREE.Line;
  private parking: THREE.Line;
  private node: THREE.Mesh;
  constructor() {
    const bright = new THREE.PointsMaterial({ color: '#ffe1a0', size: 3, sizeAttenuation: false, transparent: true, opacity: .85, depthTest: false });
    const dim = new THREE.LineBasicMaterial({ color: '#8d9eac', transparent: true, opacity: .48, depthTest: false });
    const reference = new THREE.LineBasicMaterial({ color: '#8dbfdf', transparent: true, opacity: .65 });
    const marker = new THREE.MeshBasicMaterial({ color: '#e1f3ff', depthTest: false });
    const buffer = (count: number) => new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    this.future = new THREE.Points(buffer(702), bright); this.past = new THREE.Line(buffer(702), dim);
    this.parking = new THREE.Line(buffer(129), reference); this.node = new THREE.Mesh(new THREE.RingGeometry(.65, 1, 24), marker);
    for (const object of [this.future, this.past, this.parking, this.node]) { object.frustumCulled = false; this.group.add(object); }
    this.group.userData.ownedMaterials = [bright, dim, reference, marker];
  }
  update(model: LunarModel, state: ViewState, frame: ReturnType<typeof frameGeometry>, readout: FrameReadout, position: (p: Vec3) => THREE.Vector3, pixelsPerKm: number) {
    this.group.visible = !state.inspection && !(state.cinematic && state.cinematic > 0);
    const radius = state.flight?.request.parkingRadiusKm ?? 6571, orbit = parkingOrbit(model, radius);
    const fill = (geometry: THREE.BufferGeometry, points: readonly Vec3[]) => {
      const buffer = geometry.getAttribute('position');
      points.forEach((p, i) => { const v = position(p); buffer.setXYZ(i, v.x, v.y, v.z); });
      buffer.needsUpdate = true; geometry.setDrawRange(0, points.length);
    };
    fill(this.parking.geometry, orbit); this.node.position.copy(position(orbit[0]!)); this.node.scale.setScalar(4 / pixelsPerKm / 1000);
    readout.parkingRadiusPx = radius * pixelsPerKm;
    readout.burnNode = [readout.earth[0] + orbit[0]![0] * pixelsPerKm, readout.earth[1] - orbit[0]![1] * pixelsPerKm];
    const points = state.flight ? routePoints(model, state.flight) : [];
    const travelled = state.aiming ? [] : points.filter(point => point.t < state.et).map(point => point.p);
    if (travelled.length) travelled.push(frame.craft);
    fill(this.past.geometry, travelled);
    const future: Vec3[] = state.flight ? [frame.craft] : [];
    for (const point of points) {
      if (point.t < state.et) continue;
      const last = future.at(-1);
      if (!last || Math.hypot(point.p[0] - last[0], point.p[1] - last[1]) * pixelsPerKm >= 9) future.push(point.p);
    }
    fill(this.future.geometry, future);
    (this.future.material as THREE.PointsMaterial).opacity = state.previewUpdating ? .27 : .85;
    readout.travelledPoints = travelled.length; readout.futurePoints = future.length;
  }
}
