import * as THREE from 'three';
import { norm, sub, type Vec3 } from '@starshot/ephemeris';
import physical from '../../public/observatory/system-orientation.json';
import { orientation } from '../../public/observatory/system-astronomy.js';
import { LunarModel, EARTH_RADIUS, MOON_RADIUS } from '../lunar/model';
import { sampleFlight, type Flight } from '../lunar/flight';
import { makeVehicle, setVehicleCharge, type Inspection } from './vehicle';
import { frameGeometry, frameReadout, local } from './coordinates';
import type { SceneView, ViewState } from './view-types';
import { ENGINE_PIXELS_PER_UNIT } from './engine-geometry';
import { EntryCamera } from './entry-camera';
import { RouteView } from './route-view';

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
  private route = new RouteView();
  private entryCamera = new EntryCamera();
  private loadedTextures = 0;
  private craftFill = new THREE.DirectionalLight('#d9efff', 2);
  private lunarOrbit = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#729395', transparent: true, opacity: .3, depthTest: false }));
  private textures: THREE.Texture[] = [];
  constructor(private canvas: HTMLCanvasElement, private model: LunarModel) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    const texture = (name: string) => {
      const map = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}observatory/${name}-1k.jpg`, () => { this.loadedTextures++; }, undefined, () => { this.loadedTextures++; });
      map.colorSpace = THREE.SRGBColorSpace; this.textures.push(map); return map;
    };
    const sphere = new THREE.SphereGeometry(1, 96, 64);
    this.earth = new THREE.Mesh(sphere, new THREE.MeshStandardMaterial({ map: texture('earth'), roughness: .85 }));
    this.moon = new THREE.Mesh(sphere, new THREE.MeshStandardMaterial({ map: texture('moon'), roughness: 1 }));
    this.earth.scale.setScalar(EARTH_RADIUS / 1000); this.moon.scale.setScalar(MOON_RADIUS / 1000);
    this.atmosphere = new THREE.Mesh(sphere, new THREE.MeshBasicMaterial({ color: '#5cb7ed', transparent: true, opacity: .09, side: THREE.BackSide, depthWrite: false }));
    this.atmosphere.scale.setScalar((EARTH_RADIUS + 65) / 1000);
    this.scene.add(this.earth, this.moon, this.atmosphere, this.craft, this.inspect, this.light);
    const ambient = new THREE.HemisphereLight('#a7d5e4', '#142536', 1.25);
    ambient.layers.enable(1); this.light.layers.enable(1); this.craftFill.layers.set(1);
    this.scene.add(ambient, this.craftFill); this.craft.traverse(part => part.layers.set(1)); this.camera.layers.enable(1);
    const circle = Array.from({ length: 128 }, (_, i) => new THREE.Vector3(Math.cos(i * Math.PI / 64), Math.sin(i * Math.PI / 64), 0));
    this.targetRing = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circle), new THREE.LineDashedMaterial({ color: '#9cd6cc', dashSize: 2, gapSize: 2, transparent: true, opacity: .6 }));
    this.targetRing.computeLineDistances(); this.scene.add(this.targetRing);
    this.scene.add(this.route.group);
    this.lunarOrbit.frustumCulled = false; this.scene.add(this.lunarOrbit);
  }
  update(state: ViewState) {
    const width = this.canvas.clientWidth, heightPx = this.canvas.clientHeight, aspect = width / heightPx;
    if (this.canvas.width !== Math.round(width * this.renderer.getPixelRatio()) || this.canvas.height !== Math.round(heightPx * this.renderer.getPixelRatio())) this.renderer.setSize(width, heightPx, false);
    const frame = frameGeometry(this.model, state, aspect, { width, height: heightPx });
    const readout = frameReadout(frame, state, width, heightPx, 'WebGL 2');
    const cinematic = state.cinematic ?? 0;
    readout.ready = this.loadedTextures === 2; readout.cinematic = cinematic;
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
      const bottomSafe = state.inspection === 'engine' ? heightPx < 500 ? 185 : 285 : heightPx < 700 ? 200 : 240;
      const centreY = (topSafe + heightPx - bottomSafe) / 2;
      this.inspect.position.set(0, (heightPx / 2 - centreY) / pixelsPerUnit, 0);
      this.inspect.rotation.set(state.orbit[1], state.orbit[0], -.08);
      this.inspect.scale.setScalar(Math.min(1.65, width * .76 / ((state.inspection === 'engine' ? 4.1 : 3) * pixelsPerUnit), Math.max(90, heightPx - topSafe - bottomSafe) / (2.5 * pixelsPerUnit)));
      if (state.inspection === 'engine') {
        setVehicleCharge(this.inspect, state.demoCharge ?? 0, 0, (state.demoCharge ?? 0) * 2.5);
        const offset = new THREE.Vector3(1.25, 0, 0).applyEuler(this.inspect.rotation).multiplyScalar(this.inspect.scale.x);
        this.inspect.position.add(offset);
      }
      this.light.position.set(3, 5, 6);
    } else {
      const h = frame.height / 1000;
      this.lunarOrbit.geometry.setFromPoints(frame.orbit.map(point => position(point)));
      this.camera.left = -h * aspect / 2; this.camera.right = h * aspect / 2;
      this.camera.top = h / 2; this.camera.bottom = -h / 2;
      this.camera.position.set(0, 0, 2500); this.camera.up.set(0, 1, 0); this.camera.lookAt(0, 0, 0);
      this.earth.position.copy(position([0, 0, 0])); this.atmosphere.position.copy(this.earth.position);
      this.moon.position.copy(position(frame.moon));
      this.earth.scale.setScalar(THREE.MathUtils.lerp(readout.earthRadiusPx * frame.height / heightPx / 1000, EARTH_RADIUS / 1000, cinematic));
      this.moon.scale.setScalar(THREE.MathUtils.lerp(readout.moonRadiusPx * frame.height / heightPx / 1000, MOON_RADIUS / 1000, cinematic));
      this.atmosphere.scale.copy(this.earth.scale).multiplyScalar(1.01);
      const rotateBody = (mesh: THREE.Mesh, body: typeof physical.bodies.earth) => {
        const axes = orientation(body, state.et)!;
        // SphereGeometry's pole is +Y; its longitude zero is +X and east runs toward -Z.
        const axis = (i: number): Vec3 => [axes[i]![0], axes[i]![1], axes[i]![2]];
        const x = local(axis(0), frame.basis), y = local(axis(2), frame.basis), z = local(axis(1).map(v => -v) as unknown as Vec3, frame.basis);
        mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...x), new THREE.Vector3(...y), new THREE.Vector3(...z)));
      };
      rotateBody(this.earth, physical.bodies.earth); rotateBody(this.moon, physical.bodies.moon);
      this.craft.position.copy(position(frame.craft));
      this.craft.position.x += (readout.craft[0] - readout.physicalCraft[0]) * frame.height / heightPx / 1000 * (1 - cinematic);
      this.craft.position.y -= (readout.craft[1] - readout.physicalCraft[1]) * frame.height / heightPx / 1000 * (1 - cinematic);
      this.craft.position.z = cinematic > 0 ? frame.craft[2] / 1000 : 1000;
      this.craft.scale.setScalar(frame.height / heightPx * 62 / 2800);
      this.craft.rotation.set(.18, -.18, readout.headingRad, 'ZYX');
      const nose = new THREE.Vector3(1, 0, 0).applyQuaternion(this.craft.quaternion), projected = Math.hypot(nose.x, nose.y);
      readout.renderedForward = [nose.x / projected, nose.y / projected];
      setVehicleCharge(this.craft, state.charge ?? 0, readout.enginePulse, readout.engineExtensionPx / ENGINE_PIXELS_PER_UNIT);
      this.targetRing.position.copy(position(frame.moon)); this.targetRing.scale.setScalar(65);
      const sunlight = local(sub([0, 0, 0], frame.earth.r), frame.basis);
      this.light.position.set(...sunlight).normalize().multiplyScalar(1000);
      this.route.update(this.model, state, frame, readout, position, heightPx / frame.height);
      if (cinematic > 0) {
        const fieldHeight = this.entryCamera.update(cinematic, width, heightPx, frame.height / 1000, position(frame.craft), this.earth.position, this.moon.position);
        const heroPixels = width < 600 && heightPx < 700 ? 140 : 180;
        this.craft.scale.setScalar(fieldHeight / heightPx * (62 + (heroPixels - 62) * cinematic) / 2.8);
        this.craftFill.position.copy(this.entryCamera.camera.position);
        readout.craft = this.entryCamera.project(this.craft.position, width, heightPx);
        readout.earth = this.entryCamera.project(this.earth.position, width, heightPx);
        readout.moon = this.entryCamera.project(this.moon.position, width, heightPx);
      }
    }
    this.earth.visible = this.moon.visible = this.atmosphere.visible = this.craft.visible = !state.inspection;
    this.route.group.visible = !state.inspection && cinematic === 0;
    this.targetRing.visible = !state.inspection && cinematic === 0 && frame.height > 40000;
    this.inspect.visible = !!state.inspection;
    this.lunarOrbit.visible = !state.inspection && cinematic === 0;
    this.camera.updateProjectionMatrix();
    if (state.inspection === 'engine') {
      this.inspect.updateMatrixWorld(true); this.camera.updateMatrixWorld(true);
      const screen = (point: THREE.Vector3): [number, number] => { const p = point.project(this.camera); return [(p.x + 1) * width / 2, (1 - p.y) * heightPx / 2]; };
      readout.demoFront = screen(this.inspect.localToWorld(new THREE.Vector3(.24, 0, 0)));
      readout.demoGrip = screen((this.inspect.userData.aftRing as THREE.Object3D).getWorldPosition(new THREE.Vector3()));
      const end = screen(this.inspect.localToWorld(new THREE.Vector3(-2.74, 0, 0))), start = screen(this.inspect.localToWorld(new THREE.Vector3(-.24, 0, 0)));
      readout.demoTravelPx = Math.hypot(end[0] - start[0], end[1] - start[1]);
    }
    this.craftFill.visible = cinematic > 0 && !state.inspection;
    if (cinematic > 0 && !state.inspection) {
      const camera = this.entryCamera.camera;
      camera.layers.set(0); this.renderer.render(this.scene, camera);
      // The declared enlarged vessel is a foreground symbol at its true anchor, with its own depth for self-occlusion.
      this.renderer.autoClear = false; this.renderer.clearDepth(); camera.layers.set(1); this.renderer.render(this.scene, camera); this.renderer.autoClear = true;
    } else this.renderer.render(this.scene, this.camera);
    return readout;
  }
  private disposeObject(object: THREE.Object3D) { object.traverse(child => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.Points) child.geometry.dispose();
    (child.userData.ownedMaterials as THREE.Material[] | undefined)?.forEach(material => material.dispose());
  }); }
  dispose() {
    this.disposeObject(this.scene); this.textures.forEach(texture => texture.dispose());
    // Vehicle materials are shared across inspected variants; these belong to this view.
    for (const mesh of [this.earth, this.moon, this.atmosphere]) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach(material => material.dispose());
    }
    (this.targetRing.material as THREE.Material).dispose();
    this.lunarOrbit.geometry.dispose(); (this.lunarOrbit.material as THREE.Material).dispose();
    this.targetRing.geometry.dispose(); this.renderer.dispose();
  }
}
