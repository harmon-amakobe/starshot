import * as THREE from 'three';
import { makeChargeSleeve, sizeChargeSleeve } from './charge-sleeve';
export type Inspection = 'craft' | 'engine' | 'crew' | 'drone';
const cream = new THREE.MeshStandardMaterial({
  color: '#eee8d7',
  roughness: 0.38,
  metalness: 0.28,
});
const dark = new THREE.MeshStandardMaterial({ color: '#111f2b', roughness: 0.23, metalness: 0.6 });
const metal = new THREE.MeshStandardMaterial({ color: '#89989b', roughness: 0.3, metalness: 0.8 });
const amber = new THREE.MeshStandardMaterial({
  color: '#ffb000',
  emissive: '#ff9700',
  emissiveIntensity: 1.1,
  roughness: 0.3,
});
const glass = new THREE.MeshStandardMaterial({ color: '#17384a', roughness: 0.1, metalness: 0.75 });
const blue = new THREE.MeshStandardMaterial({
  color: '#b6f3fa',
  emissive: '#5db2c8',
  emissiveIntensity: 0.35,
});
function sphere(
  parent: THREE.Group,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  material: THREE.Material,
) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  parent.add(mesh);
  return mesh;
}
function bar(
  parent: THREE.Group,
  a: THREE.Vector3,
  b: THREE.Vector3,
  radius: number,
  material: THREE.Material,
) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 12),
    material,
  );
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  parent.add(mesh);
  return mesh;
}
export function makeEngine() {
  const group = new THREE.Group();
  const chargeMaterial = new THREE.MeshStandardMaterial({
    color: '#dcf7ff',
    emissive: '#7ed5ec',
    emissiveIntensity: 0.15,
    roughness: 0.25,
    metalness: 0.35,
  });
  group.userData.chargeMaterial = chargeMaterial;
  group.userData.ownedMaterials = [chargeMaterial];
  group.userData.engine = true;
  const chamber = makeChargeSleeve();
  chamber.position.x = 0.24;
  chamber.rotation.z = Math.PI;
  group.add(chamber);
  group.userData.chamber = chamber;
  sizeChargeSleeve(chamber, 0.48, 0.7);
  for (const [x, r, tube, material] of [
    [-0.24, 0.81, 0.12, cream],
    [0, 0.7, 0.075, chargeMaterial],
    [0.24, 0.81, 0.12, dark],
  ] as const) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 12, 72), material);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = x;
    group.add(ring);
    if (x === -0.24) group.userData.aftRing = ring;
    if (x === 0) group.userData.chargeRing = ring;
  }
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4,
      y = Math.cos(angle) * 0.81,
      z = Math.sin(angle) * 0.81;
    const strut = bar(
      group,
      new THREE.Vector3(-0.32, y, z),
      new THREE.Vector3(0.32, y, z),
      0.045,
      metal,
    );
    strut.userData.engineStrut = true;
  }
  sphere(group, 0, 0, 0, 0.24, 0.3, 0.3, dark);
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    bar(
      group,
      new THREE.Vector3(0, Math.cos(a) * 0.2, Math.sin(a) * 0.2),
      new THREE.Vector3(0, Math.cos(a) * 0.68, Math.sin(a) * 0.68),
      0.035,
      chargeMaterial,
    );
  }
  return group;
}
export function setVehicleCharge(vehicle: THREE.Group, value: number, firing = 0, extension = 0) {
  const charge = Math.max(0, Math.min(1, value));
  vehicle.traverse((part) => {
    if (!part.userData.engine) return;
    (part.userData.aftRing as THREE.Object3D).position.x = -0.24 - extension;
    (part.userData.chargeRing as THREE.Object3D).position.x = -0.12 - extension;
    sizeChargeSleeve(part.userData.chamber as THREE.Group, 0.48 + extension, 0.7);
    part.children.forEach((child) => {
      if (child.userData.engineStrut) child.visible = extension < 0.1;
    });
    (part.userData.chargeMaterial as THREE.MeshStandardMaterial).emissiveIntensity =
      0.15 + charge * 2.4 + firing * 1.1;
  });
  const plume = vehicle.getObjectByName('engine-plume');
  if (plume) {
    plume.visible = firing > 0;
    plume.scale.x = 0.8 + firing * 0.5;
    plume.position.x = -1.25 - extension;
  }
}
function makePlume() {
  const group = new THREE.Group();
  group.name = 'engine-plume';
  group.visible = false;
  const materials: THREE.Material[] = [];
  for (const [radius, length, color, opacity] of [
    [0.26, 2.7, '#7183cf', 0.08],
    [0.18, 1.7, '#7ddff7', 0.25],
    [0.1, 0.8, '#e9fcff', 0.8],
  ] as const) {
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
    });
    materials.push(material);
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(radius, length, 32), material);
    mesh.rotation.z = Math.PI / 2;
    mesh.position.x = -length / 2;
    group.add(mesh);
  }
  group.userData.ownedMaterials = materials;
  return group;
}
export function makeDrone() {
  const group = new THREE.Group();
  sphere(group, 0, 0, 0, 0.67, 0.61, 0.59, cream);
  sphere(group, 0, 0.04, 0.47, 0.48, 0.32, 0.23, dark);
  for (const x of [-0.16, 0.16]) sphere(group, x, 0.08, 0.69, 0.065, 0.105, 0.035, blue);
  bar(group, new THREE.Vector3(0, 0.49, 0), new THREE.Vector3(-0.1, 0.85, 0), 0.025, metal);
  sphere(group, -0.1, 0.85, 0, 0.065, 0.065, 0.065, amber);
  for (const side of [-1, 1]) {
    sphere(group, -0.12, -0.05, side * 0.64, 0.2, 0.16, 0.2, dark);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.035, 8, 24), amber);
    ring.position.set(-0.12, -0.05, side * 0.78);
    group.add(ring);
  }
  return group;
}
export function makeVehicle(kind: Inspection = 'craft') {
  if (kind === 'engine') return makeEngine();
  if (kind === 'drone') return makeDrone();
  const group = new THREE.Group();
  sphere(group, 0.2, 0, 0, 1.05, 0.59, 0.59, cream);
  sphere(group, 0.83, 0.1, 0, 0.5, 0.41, 0.49, glass);
  sphere(group, 1.13, -0.13, 0.33, 0.09, 0.055, 0.055, amber);
  const engine = makeEngine();
  engine.position.x = -0.88;
  group.add(engine);
  group.add(makePlume());
  for (const side of [-1, 1]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.06, 0.4), cream);
    fin.position.set(-0.25, -0.16, side * 0.72);
    fin.rotation.x = side * -0.2;
    group.add(fin);
    bar(
      group,
      new THREE.Vector3(0.4, -0.3, side * 0.35),
      new THREE.Vector3(-0.6, -0.55, side * 0.52),
      0.05,
      metal,
    );
    sphere(group, -0.65, -0.55, side * 0.52, 0.14, 0.08, 0.11, dark);
  }
  if (kind === 'crew') {
    sphere(group, 0.1, 0.4, 0, 0.85, 0.58, 0.56, cream);
    for (const side of [-1, 1]) sphere(group, 0.27, 0.58, side * 0.45, 0.4, 0.25, 0.14, glass);
  } else {
    const antenna = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 8, 24), metal);
    antenna.position.set(-0.12, 0.68, 0);
    antenna.rotation.x = 0.4;
    group.add(antenna);
  }
  return group;
}
