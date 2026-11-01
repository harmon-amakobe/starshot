import * as THREE from 'three';
import { norm, sub, type Vec3 } from '@starshot/ephemeris';
import physical from '../../public/observatory/system-orientation.json';
import { orientation } from '../../public/observatory/system-astronomy.js';
import { LunarModel, EARTH_RADIUS, MOON_RADIUS } from '../lunar/model';
import { sampleFlight, type Flight } from '../lunar/flight';
import { makeVehicle, type Inspection } from './vehicle';
import { frameGeometry, local } from './coordinates';
import type { SceneView, ViewState } from './view-types';

export class ThreeView implements SceneView {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .01, 10000);
  private earth: THREE.Mesh;
  private moon: THREE.Mesh;
  private atmosphere: THREE.Mesh;
  private craft = makeVehicle();
  private inspect = makeVehicle();
  private inspection: Inspection | null = null;
  private light = new THREE.DirectionalLight('#fff8ec', 3.2);
  private targetRing: THREE.LineLoop;
  private dots: THREE.Points;
  private flight: Flight | null = null;
  private points: Vec3[] = [];
  private textures: THREE.Texture[] = [];
  constructor(private canvas: HTMLCanvasElement, private model: LunarModel) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    const texture = (name: string) => {
      const map = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}observatory/${name}-1k.jpg`);
      map.colorSpace = THREE.SRGBColorSpace; this.textures.push(map); return map;
    };
    const sphere = new THREE.SphereGeometry(1, 96, 64);
    this.earth = new THREE.Mesh(sphere, new THREE.MeshStandardMaterial({ map: texture('earth'), roughness: .85 }));
    this.moon = new THREE.Mesh(sphere, new THREE.MeshStandardMaterial({ map: texture('moon'), roughness: 1 }));
    this.earth.scale.setScalar(EARTH_RADIUS / 1000); this.moon.scale.setScalar(MOON_RADIUS / 1000);
    this.atmosphere = new THREE.Mesh(sphere, new THREE.MeshBasicMaterial({ color: '#5cb7ed', transparent: true, opacity: .09, side: THREE.BackSide, depthWrite: false }));
    this.atmosphere.scale.setScalar((EARTH_RADIUS + 65) / 1000);
    this.scene.add(this.earth, this.moon, this.atmosphere, this.craft, this.inspect, this.light);
    this.scene.add(new THREE.HemisphereLight('#a7d5e4', '#142536', 1.25));
    const circle = Array.from({ length: 128 }, (_, i) => new THREE.Vector3(Math.cos(i * Math.PI / 64), Math.sin(i * Math.PI / 64), 0));
    this.targetRing = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circle), new THREE.LineDashedMaterial({ color: '#9cd6cc', dashSize: 2, gapSize: 2, transparent: true, opacity: .6 }));
    this.targetRing.computeLineDistances(); this.scene.add(this.targetRing);
    this.dots = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: '#ffe1a0', size: 3, sizeAttenuation: false, transparent: true, opacity: .8, depthTest: false }));
    this.dots.frustumCulled = false; this.scene.add(this.dots);
  }
  update(state: ViewState) {
    const width = this.canvas.clientWidth, heightPx = this.canvas.clientHeight, aspect = width / heightPx;
    if (this.canvas.width !== Math.round(width * this.renderer.getPixelRatio()) || this.canvas.height !== Math.round(heightPx * this.renderer.getPixelRatio())) this.renderer.setSize(width, heightPx, false);
    const frame = frameGeometry(this.model, state, aspect);
    const position = (p: Vec3) => new THREE.Vector3((p[0] - frame.centre[0]) / 1000, (p[1] - frame.centre[1]) / 1000, p[2] / 1000);
    const project = (p: Vec3): [number, number] => [(p[0] - frame.centre[0]) / (frame.height * aspect) * width + width / 2, heightPx / 2 - (p[1] - frame.centre[1]) / frame.height * heightPx];
    if (state.inspection) {
      if (state.inspection !== this.inspection) {
        this.scene.remove(this.inspect); this.disposeObject(this.inspect);
        this.inspect = makeVehicle(state.inspection); this.scene.add(this.inspect); this.inspection = state.inspection;
      }
      const extent = width < 600 ? 3.6 : 3;
      this.camera.left = -extent * aspect; this.camera.right = extent * aspect;
      this.camera.top = extent; this.camera.bottom = -extent;
      this.camera.position.set(0, 0, 30); this.camera.up.set(0, 1, 0); this.camera.lookAt(0, 0, 0);
      const pixelsPerUnit = heightPx / (2 * extent);
      const topSafe = heightPx < 700 ? 180 : width < 900 ? 260 : 205;
      const bottomSafe = heightPx < 700 ? 200 : 240;
      const centreY = (topSafe + heightPx - bottomSafe) / 2;
      this.inspect.position.set(0, (heightPx / 2 - centreY) / pixelsPerUnit, 0);
      this.inspect.rotation.set(state.orbit[1], state.orbit[0], -.08);
      this.inspect.scale.setScalar(Math.min(1.65, width * .78 / (3 * pixelsPerUnit), Math.max(90, heightPx - topSafe - bottomSafe) / (2.5 * pixelsPerUnit)));
      this.light.position.set(3, 5, 6);
    } else {
      const h = frame.height / 1000;
      this.camera.left = -h * aspect / 2; this.camera.right = h * aspect / 2;
      this.camera.top = h / 2; this.camera.bottom = -h / 2;
      this.camera.position.set(0, 0, 2500); this.camera.up.set(0, 1, 0); this.camera.lookAt(0, 0, 0);
      this.earth.position.copy(position([0, 0, 0])); this.atmosphere.position.copy(this.earth.position);
      this.moon.position.copy(position(frame.moon));
      const rotateBody = (mesh: THREE.Mesh, body: typeof physical.bodies.earth) => {
        const axes = orientation(body, state.et)!;
        // SphereGeometry's pole is +Y; its longitude zero is +X and east runs toward -Z.
        const axis = (i: number): Vec3 => [axes[i]![0], axes[i]![1], axes[i]![2]];
        const x = local(axis(0), frame.basis), y = local(axis(2), frame.basis), z = local(axis(1).map(v => -v) as unknown as Vec3, frame.basis);
        mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...x), new THREE.Vector3(...y), new THREE.Vector3(...z)));
      };
      rotateBody(this.earth, physical.bodies.earth); rotateBody(this.moon, physical.bodies.moon);
      this.craft.position.copy(position(frame.craft));
      this.craft.scale.setScalar(frame.height / heightPx * 62 / 2800);
      this.craft.rotation.set(.18, -.18, state.angle * Math.PI / 180);
      this.targetRing.position.copy(position(frame.moon)); this.targetRing.scale.setScalar(65);
      const sunlight = local(sub([0, 0, 0], frame.earth.r), frame.basis);
      this.light.position.set(...sunlight).normalize().multiplyScalar(1000);
      if (this.flight !== state.flight) {
        this.flight = state.flight; this.points = [];
        if (state.flight) {
          const start = state.flight.request.launchEt, end = state.flight.endEt;
          // Earth-centred plotting removes Earth's solar travel from each sample at its own ET.
          for (let i = 0; i <= 700; i++) {
            const u = i / 700, et = start + (end - start) * u * u;
            this.points.push(local(sub(sampleFlight(state.flight.samples, et).r, this.model.bodies(et).earth.r), frame.basis));
          }
        }
        this.dots.geometry.dispose(); this.dots.geometry = new THREE.BufferGeometry();
        this.dots.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.points.length * 3), 3));
      }
      const buffer = this.dots.geometry.getAttribute('position');
      if (buffer) {
        let count = 0, previous: Vec3 | null = null;
        for (const point of this.points) {
          if (previous && Math.hypot(point[0] - previous[0], point[1] - previous[1]) * heightPx / frame.height < 9) continue;
          const p = position(point); buffer.setXYZ(count++, p.x, p.y, p.z); previous = point;
        }
        buffer.needsUpdate = true; this.dots.geometry.setDrawRange(0, count);
      }
    }
    this.earth.visible = this.moon.visible = this.atmosphere.visible = this.craft.visible = this.dots.visible = !state.inspection;
    this.targetRing.visible = !state.inspection && frame.height > 40000;
    this.inspect.visible = !!state.inspection;
    this.camera.updateProjectionMatrix(); this.renderer.render(this.scene, this.camera);
    return { craft: project(frame.craft), moon: project(frame.moon), moonDistance: norm(sub(frame.moon, frame.craft)), scaleKm: frame.height * 80 / heightPx, heightKm: frame.height, centre: [frame.centre[0], frame.centre[1]] as [number, number], renderer: 'WebGL 2' };
  }
  private disposeObject(object: THREE.Object3D) { object.traverse(child => { if (child instanceof THREE.Mesh) child.geometry.dispose(); }); }
  dispose() {
    this.disposeObject(this.scene); this.textures.forEach(texture => texture.dispose());
    // Vehicle materials are shared across inspected variants; these belong to this view.
    for (const mesh of [this.earth, this.moon, this.atmosphere]) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach(material => material.dispose());
    }
    (this.dots.material as THREE.Material).dispose(); (this.targetRing.material as THREE.Material).dispose();
    this.dots.geometry.dispose(); this.targetRing.geometry.dispose(); this.renderer.dispose();
  }
}
