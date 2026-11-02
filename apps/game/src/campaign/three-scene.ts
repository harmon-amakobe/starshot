import * as THREE from 'three';
import { BODIES, type BodyId, type Vec3 } from '@starshot/ephemeris';
import { makeVehicle, setVehicleCharge, type Inspection } from '@starshot/presentation/vehicle';
import { assetBase, loadSatellites, type SceneData } from './scene-data';
import { ephemeris } from './scene-geometry';
import { colours, type FrameGeometry } from './frame';
import type { SceneState } from './scene-types';
import { depthRange } from './contracts';
import { bodyRadius, type MissionBody } from '../missions';

export class ThreeScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 20000);
  private sphere = new THREE.SphereGeometry(1, 64, 40);
  private bodies = new Map<string, THREE.Mesh>();
  private rings = new Map<string, THREE.Group>();
  private moons = new Map<string, THREE.Mesh>();
  private textures: THREE.Texture[] = [];
  private craft = makeVehicle();
  private inspect = makeVehicle();
  private inspection: Inspection | null = null;
  private light = new THREE.PointLight('#fff6e9', 2.6, 0, 0);
  private data: SceneData | null = null;
  private satellites: Float64Array | null = null;
  private satelliteRequested = false;
  private disposed = false;
  private flares = new THREE.Group();
  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.15;
    this.scene.add(new THREE.HemisphereLight('#b6dce8', '#162234', 1.5), this.light, this.craft, this.inspect, this.flares);
    this.light.position.set(-600, 700, 1500);
    for (const id of Object.keys(colours)) {
      const material = id === 'sun' ? new THREE.MeshBasicMaterial({ color: '#fff8ee' }) : new THREE.MeshStandardMaterial({ roughness: .85, color: '#ffffff' });
      if (id !== 'sun') {
        const map = new THREE.TextureLoader().load(`${assetBase}${id}-1k.jpg`); map.colorSpace = THREE.SRGBColorSpace; this.textures.push(map); (material as THREE.MeshStandardMaterial).map = map;
      }
      const mesh = new THREE.Mesh(this.sphere, material); this.bodies.set(id, mesh); this.scene.add(mesh);
    }
    for (let i = 0; i < 8; i++) {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(1, .035 + i * .003, 8, 48, Math.PI * 1.5), new THREE.MeshBasicMaterial({ color: '#ffc77d', transparent: true, opacity: .3, depthWrite: false }));
      arc.rotation.set(i * .7, i * .43, i); this.flares.add(arc);
    }
    this.craft.traverse(p => p.layers.set(1)); this.inspect.traverse(p => p.layers.set(1));
    this.scene.children.filter(p => p instanceof THREE.Light).forEach(p => p.layers.enable(1));
  }
  setData(data: SceneData) {
    if (this.data) return; this.data = data;
    for (const [id, entries] of Object.entries(data.rings)) {
      const group = new THREE.Group();
      for (const [, inside, outside, opacity, kind] of entries) {
        if (kind === 'guide' || outside <= inside) continue;
        const mesh = new THREE.Mesh(new THREE.RingGeometry(inside, outside, 128), new THREE.MeshStandardMaterial({ color: '#d0bea0', transparent: true, opacity: Math.max(.02, opacity), side: THREE.DoubleSide, depthWrite: false }));
        group.add(mesh);
      }
      this.rings.set(id, group); this.scene.add(group);
    }
  }
  update(state: SceneState, f: FrameGeometry) {
    const { frame, unit } = f, { width, height } = frame, aspect = width / height;
    if (this.canvas.width !== Math.round(width * this.renderer.getPixelRatio()) || this.canvas.height !== Math.round(height * this.renderer.getPixelRatio())) this.renderer.setSize(width, height, false);
    this.camera.left = -500 * aspect; this.camera.right = 500 * aspect; this.camera.top = 500; this.camera.bottom = -500;
    this.camera.position.set(0, 0, 8000); this.camera.lookAt(0, 0, 0); this.camera.updateProjectionMatrix();
    const position = (p: Vec3) => new THREE.Vector3(...f.local(p)).divideScalar(unit);
    this.bodies.forEach(mesh => { mesh.visible = false; });
    this.rings.forEach(ring => { ring.visible = false; });
    for (const marker of frame.bodies) {
      const mesh = this.bodies.get(marker.id)!;
      mesh.visible = !state.inspection;
      mesh.position.copy(position(f.g.body(marker.id as MissionBody).r)); mesh.scale.setScalar(marker.radius * 1000 / height);
      const axes = this.data?.astronomy.orientation(this.data.physical.bodies[marker.id], state.et);
      if (axes) {
        const a = (i: number) => new THREE.Vector3(...f.direction(axes[i] as unknown as Vec3));
        mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(a(0), a(2), a(1).negate()));
        const ring = this.rings.get(marker.id);
        if (ring) { ring.visible = mesh.visible; ring.position.copy(mesh.position); ring.scale.setScalar(mesh.scale.x / bodyRadius(marker.id as MissionBody)); ring.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(a(0), a(1), a(2))); }
      }
    }
    const sun = this.bodies.get('sun')!;
    this.light.position.copy(sun.position);
    if (state.inspection) this.light.position.set(-600, 700, 2500);
    (sun.material as THREE.MeshBasicMaterial).color.set(state.preferences.scientific || state.preferences.trueSize ? '#ffffff' : '#ffc445');
    this.flares.visible = !state.inspection; this.flares.position.copy(sun.position); this.flares.scale.copy(sun.scale).multiplyScalar(1.1);
    this.flares.children.forEach((arc, i) => { arc.rotation.z = i + state.visualTime * (state.reduced ? 0 : .06 + i * .006); arc.scale.setScalar(1 + .08 * Math.sin(i + (state.reduced ? 0 : state.visualTime * .4))); });
    this.updateMoons(state, f, position);
    this.craft.visible = !state.inspection;
    this.craft.position.set((frame.craft[0] - width / 2) * 1000 / height, (height / 2 - frame.craft[1]) * 1000 / height, 1000);
    this.craft.scale.setScalar((f.pixels + state.home * 50) * 1000 / height);
    this.craft.rotation.set(.18 + state.home * .12, -.18, frame.heading, 'ZYX');
    setVehicleCharge(this.craft, state.charge, state.firing ? .65 + (state.reduced ? 0 : .2 * Math.sin(state.visualTime * 24)) : 0, frame.travel * state.charge / f.pixels);
    this.inspect.visible = !!state.inspection;
    if (state.inspection) {
      if (this.inspection !== state.inspection) { this.scene.remove(this.inspect); this.disposeObject(this.inspect); this.inspect = makeVehicle(state.inspection); this.inspect.traverse(p => p.layers.set(1)); this.scene.add(this.inspect); this.inspection = state.inspection; }
      const size = Math.min(width * .16, height * .12) * 1000 / height;
      this.inspect.position.set(state.inspection === 'engine' ? size * .65 : 0, 30, 1000); this.inspect.scale.setScalar(size);
      this.inspect.rotation.set(state.preferences.orbit[0] || .25, state.preferences.orbit[1] || -.25, 0);
      setVehicleCharge(this.inspect, state.demoCharge, state.demoCharge === 0 ? .12 : 0, state.demoCharge * 2.5);
      this.inspect.updateMatrixWorld(true); this.camera.updateMatrixWorld(true);
      const grip = (this.inspect.userData.aftRing as THREE.Object3D | undefined)?.getWorldPosition(new THREE.Vector3());
      if (grip) { grip.project(this.camera); frame.demoGrip = [(grip.x + 1) * width / 2, (1 - grip.y) * height / 2]; }
    }
    // A close-up can be much larger than the viewport in world units. Keep its front surface in front of the camera too.
    const extents: Array<{ centre: number; radius: number }> = [];
    for (const marker of frame.bodies) {
      if (marker.point[0] + marker.radius * 4 < 0 || marker.point[0] - marker.radius * 4 > width || marker.point[1] + marker.radius * 4 < 0 || marker.point[1] - marker.radius * 4 > height) continue;
      const mesh = this.bodies.get(marker.id)!, extent = mesh.scale.x * (this.rings.has(marker.id) ? 4 : 1.5);
      extents.push({ centre: mesh.position.z, radius: extent });
    }
    const depth = depthRange(extents); this.camera.position.z = depth.distance; this.camera.near = depth.near; this.camera.far = depth.far; this.camera.updateProjectionMatrix();
    this.camera.layers.set(0); this.renderer.render(this.scene, this.camera);
    this.renderer.autoClear = false; this.renderer.clearDepth(); this.camera.layers.set(1); this.renderer.render(this.scene, this.camera); this.renderer.autoClear = true;
  }
  private updateMoons(state: SceneState, f: FrameGeometry, position: (p: Vec3) => THREE.Vector3) {
    this.moons.forEach(m => { m.visible = false; });
    if (!state.focus || !state.showMoons || !f.frame.moonsAvailable || !this.data || state.inspection) return;
    if (!this.satelliteRequested) { this.satelliteRequested = true; loadSatellites().then(d => { if (!this.disposed) this.satellites = d; }).catch(() => {}); }
    if (!this.satellites) return;
    const parent = f.g.body(state.focus).r;
    for (const meta of this.data.rails.moons.filter(m => m.parent === state.focus)) {
      const raw = this.data.astronomy.satelliteState(meta, this.satellites, state.et);
      if (!raw) continue;
      const relative = raw.slice(0, 3) as unknown as Vec3, world: Vec3 = [parent[0] + relative[0], parent[1] + relative[1], relative[2]];
      let mesh = this.moons.get(meta.id);
      if (!mesh) { mesh = new THREE.Mesh(this.sphere, new THREE.MeshStandardMaterial({ color: '#bdb9ae', roughness: .95 })); this.moons.set(meta.id, mesh); this.scene.add(mesh); }
      mesh.visible = true; mesh.position.copy(position(world)); mesh.scale.setScalar((this.data.astronomy.moonRadii[meta.id] || 1) / f.unit);
    }
  }
  private disposeObject(object: THREE.Object3D) { object.traverse(p => { if (p instanceof THREE.Mesh || p instanceof THREE.Line) p.geometry.dispose(); (p.userData.ownedMaterials as THREE.Material[] | undefined)?.forEach(m => m.dispose()); }); }
  dispose() { this.disposed = true; this.disposeObject(this.craft); this.disposeObject(this.inspect); this.sphere.dispose(); this.textures.forEach(t => t.dispose()); this.renderer.dispose(); }
}
