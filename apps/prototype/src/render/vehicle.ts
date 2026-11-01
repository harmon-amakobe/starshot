import * as THREE from 'three';
export type Inspection = 'craft' | 'engine' | 'crew' | 'drone';
const cream = new THREE.MeshStandardMaterial({ color: '#eee8d7', roughness: .38, metalness: .28 });
const dark = new THREE.MeshStandardMaterial({ color: '#111f2b', roughness: .23, metalness: .6 });
const metal = new THREE.MeshStandardMaterial({ color: '#89989b', roughness: .3, metalness: .8 });
const amber = new THREE.MeshStandardMaterial({ color: '#ffb000', emissive: '#ff9700', emissiveIntensity: 1.1, roughness: .3 });
const glass = new THREE.MeshStandardMaterial({ color: '#17384a', roughness: .1, metalness: .75 });
const blue = new THREE.MeshStandardMaterial({ color: '#b6f3fa', emissive: '#5db2c8', emissiveIntensity: .35 });
function sphere(parent: THREE.Group, x: number, y: number, z: number, sx: number, sy: number, sz: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), material);
  mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); parent.add(mesh); return mesh;
}
function bar(parent: THREE.Group, a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 12), material);
  mesh.position.copy(a).add(b).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); parent.add(mesh);
}
export function makeEngine() {
  const group = new THREE.Group();
  for (const [x, r, tube, material] of [[-.24, .81, .12, cream], [0, .7, .055, amber], [.24, .81, .12, dark]] as const) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 12, 72), material);
    ring.rotation.y = Math.PI / 2; ring.position.x = x; group.add(ring);
  }
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4, y = Math.cos(angle) * .81, z = Math.sin(angle) * .81;
    bar(group, new THREE.Vector3(-.32, y, z), new THREE.Vector3(.32, y, z), .045, metal);
  }
  sphere(group, 0, 0, 0, .24, .3, .3, dark);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    bar(group, new THREE.Vector3(0, Math.cos(a) * .2, Math.sin(a) * .2), new THREE.Vector3(0, Math.cos(a) * .68, Math.sin(a) * .68), .035, amber);
  }
  return group;
}
export function makeDrone() {
  const group = new THREE.Group();
  sphere(group, 0, 0, 0, .67, .61, .59, cream);
  sphere(group, 0, .04, .47, .48, .32, .23, dark);
  for (const x of [-.16, .16]) sphere(group, x, .08, .69, .065, .105, .035, blue);
  bar(group, new THREE.Vector3(0, .49, 0), new THREE.Vector3(-.1, .85, 0), .025, metal);
  sphere(group, -.1, .85, 0, .065, .065, .065, amber);
  for (const side of [-1, 1]) {
    sphere(group, -.12, -.05, side * .64, .2, .16, .2, dark);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.15, .035, 8, 24), amber);
    ring.position.set(-.12, -.05, side * .78); group.add(ring);
  }
  return group;
}
export function makeVehicle(kind: Inspection = 'craft') {
  if (kind === 'engine') return makeEngine();
  if (kind === 'drone') return makeDrone();
  const group = new THREE.Group();
  sphere(group, .2, 0, 0, 1.05, .59, .59, cream);
  sphere(group, .83, .1, 0, .5, .41, .49, glass);
  sphere(group, 1.13, -.13, .33, .09, .055, .055, amber);
  const engine = makeEngine(); engine.position.x = -.88; group.add(engine);
  for (const side of [-1, 1]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(.75, .06, .4), cream);
    fin.position.set(-.25, -.16, side * .72); fin.rotation.x = side * -.2; group.add(fin);
    bar(group, new THREE.Vector3(.4, -.3, side * .35), new THREE.Vector3(-.6, -.55, side * .52), .05, metal);
    sphere(group, -.65, -.55, side * .52, .14, .08, .11, dark);
  }
  if (kind === 'crew') {
    sphere(group, .1, .4, 0, .85, .58, .56, cream);
    for (const side of [-1, 1]) sphere(group, .27, .58, side * .45, .4, .25, .14, glass);
  } else {
    const antenna = new THREE.Mesh(new THREE.TorusGeometry(.17, .025, 8, 24), metal);
    antenna.position.set(-.12, .68, 0); antenna.rotation.x = .4; group.add(antenna);
  }
  return group;
}
