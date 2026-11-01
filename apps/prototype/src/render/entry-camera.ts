import * as THREE from 'three';
import type { Vec3 } from '@starshot/ephemeris';
export class EntryCamera {
  readonly camera = new THREE.PerspectiveCamera(40, 1, .001, 1e8);
  update(amount: number, width: number, height: number, gameHeight: number, craft: THREE.Vector3, earth: THREE.Vector3, moon: THREE.Vector3) {
    const nearest = craft.distanceTo(earth) < craft.distanceTo(moon) ? earth : moon;
    const nearEarth = craft.distanceTo(earth) < 20;
    const heroPosition = nearEarth ? earth.clone().add(new THREE.Vector3(-35, 10, 8))
      : craft.clone().add(craft.clone().sub(nearest).normalize().add(new THREE.Vector3(0, 0, .65)).normalize().multiplyScalar(34.64));
    const direction = heroPosition.clone().sub(craft).normalize();
    const heroRotation = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(direction, new THREE.Vector3(), new THREE.Vector3(0, 1, 0)));
    const heroHeight = 2 * heroPosition.distanceTo(craft) * Math.tan(THREE.MathUtils.degToRad(80) / 2);
    const fieldHeight = Math.exp(Math.log(gameHeight) * (1 - amount) + Math.log(heroHeight) * amount);
    // A shrinking perspective angle converges on the map's orthographic projection without a camera swap flash.
    const fov = .002 + 80 * amount * amount, distance = fieldHeight / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2));
    const focus = craft.clone().multiplyScalar(amount);
    this.camera.quaternion.identity().slerp(heroRotation, amount);
    this.camera.position.copy(new THREE.Vector3(0, 0, distance).applyQuaternion(this.camera.quaternion).add(focus));
    this.camera.updateMatrixWorld(true);
    const depths = [craft, earth, moon].map(point => -point.clone().applyMatrix4(this.camera.matrixWorldInverse).z), margin = Math.max(20, fieldHeight * 3);
    this.camera.near = Math.max(.001, Math.min(...depths) - margin); this.camera.far = Math.max(this.camera.near + 10, Math.max(...depths) + margin);
    this.camera.aspect = width / height; this.camera.fov = fov; this.camera.updateProjectionMatrix();
    const x = width < 600 ? .58 : .73, y = height < 500 ? .58 : width < 600 ? height < 700 ? .38 : .4 : .5;
    this.camera.projectionMatrix.elements[8] = (1 - 2 * x) * amount;
    this.camera.projectionMatrix.elements[9] = (2 * y - 1) * amount;
    this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert(); this.camera.updateMatrixWorld(true);
    return fieldHeight;
  }
  project(point: THREE.Vector3, width: number, height: number): [number, number] {
    const p = point.clone().project(this.camera); return [(p.x + 1) * width / 2, (1 - p.y) * height / 2];
  }
}
