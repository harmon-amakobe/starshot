import * as THREE from 'three';

export function makeChargeSleeve() {
  const group = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({ color: '#558797', metalness: .2, roughness: .3,
    emissive: '#7bddf3', emissiveIntensity: .18, transparent: true, opacity: .1, side: THREE.DoubleSide, depthWrite: false });
  const rib = new THREE.MeshStandardMaterial({ color: '#84959c', metalness: .55, roughness: .4 });
  const field = new THREE.LineBasicMaterial({ color: '#c7f6ff', transparent: true, opacity: .55 });
  const coreMaterial = new THREE.MeshStandardMaterial({ color: '#10101c', emissive: '#594276', emissiveIntensity: .65, roughness: .2 });
  group.userData.ownedMaterials = [wall, rib, field, coreMaterial];
  const skin = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 40, 1, true), wall);
  skin.rotation.z = Math.PI / 2; skin.position.x = .5; group.add(skin);
  for (let i = 0; i <= 8; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, i === 8 ? .045 : .018, 8, 40), rib);
    ring.userData.sleeveRib = true;
    ring.rotation.y = Math.PI / 2; ring.position.x = i / 8; group.add(ring);
  }
  for (let strand = 0; strand < 3; strand++) {
    const points = Array.from({ length: 65 }, (_, i) => { const a = i / 64 * Math.PI * 2 + strand * Math.PI * 2 / 3; return new THREE.Vector3(i / 64, Math.cos(a) * .65, Math.sin(a) * .65); });
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), field));
  }
  const core = new THREE.Mesh(new THREE.SphereGeometry(.26, 24, 16), coreMaterial);
  core.position.x = .5; core.userData.sleeveCore = true; group.add(core);
  return group;
}
export function sizeChargeSleeve(group: THREE.Group, length: number, radius: number) {
  group.scale.set(length, radius, radius);
  group.children.forEach(part => {
    if (part.userData.sleeveRib) part.scale.z = radius / Math.max(.001, length);
    if (part.userData.sleeveCore) part.scale.x = radius / Math.max(.001, length);
  });
}

export function drawSleeve(ctx: CanvasRenderingContext2D, start: [number, number], end: [number, number], radius = 14) {
  const dx = end[0] - start[0], dy = end[1] - start[1], length = Math.hypot(dx, dy);
  if (length < 2) return;
  ctx.save(); ctx.translate(...start); ctx.rotate(Math.atan2(dy, dx)); ctx.scale(1, radius / 14);
  ctx.fillStyle = '#80e6ff12'; ctx.fillRect(0, -14, length, 28);
  ctx.strokeStyle = '#b2dbe080'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(length, -14); ctx.moveTo(0, 14); ctx.lineTo(length, 14); ctx.stroke();
  for (let i = 0; i <= 8; i++) {
    ctx.beginPath(); ctx.ellipse(length * i / 8, 0, 3, 14, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.strokeStyle = '#c9f7ff80';
  for (const offset of [-5, 5]) { ctx.beginPath(); ctx.moveTo(0, offset); ctx.bezierCurveTo(length * .3, -offset * 2, length * .7, offset * 2, length, -offset); ctx.stroke(); }
  ctx.fillStyle = '#29213c'; ctx.beginPath(); ctx.arc(length * .5, 0, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
