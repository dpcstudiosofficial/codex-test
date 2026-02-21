import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';

export function createCarMesh(color = 0x3ea0ff) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color, metalness: 0.15, roughness: 0.35 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x11161f, metalness: 0.3, roughness: 0.4 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.45, 3.6), bodyMat);
  base.position.y = 0.46;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.48, 1.55), bodyMat);
  cabin.position.set(0, 0.9, -0.15);
  cabin.castShadow = true;
  group.add(cabin);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.24, 0.7), darkMat);
  windshield.position.set(0, 0.96, 0.45);
  group.add(windshield);

  const wheelGeom = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 14);
  wheelGeom.rotateZ(Math.PI / 2);

  const wheelPositions = [
    [-0.88, 0.35, 1.15],
    [0.88, 0.35, 1.15],
    [-0.88, 0.35, -1.15],
    [0.88, 0.35, -1.15],
  ];

  wheelPositions.forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeom, darkMat);
    wheel.position.set(x, y, z);
    wheel.castShadow = true;
    wheel.receiveShadow = true;
    group.add(wheel);
  });

  group.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return group;
}

export function createPlayerController(targetElement = window) {
  const input = {
    accelerate: false,
    brake: false,
    left: false,
    right: false,
    restart: false,
  };

  const keyMap = {
    ArrowUp: 'accelerate',
    KeyW: 'accelerate',
    ArrowDown: 'brake',
    KeyS: 'brake',
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
  };

  const onKey = (pressed) => (ev) => {
    if (ev.code === 'KeyR') {
      input.restart = pressed;
      return;
    }
    const action = keyMap[ev.code];
    if (action) {
      input[action] = pressed;
      ev.preventDefault();
    }
  };

  const onBlur = () => {
    Object.keys(input).forEach((k) => {
      input[k] = false;
    });
  };

  const onKeyDown = onKey(true);
  const onKeyUp = onKey(false);

  targetElement.addEventListener('keydown', onKeyDown);
  targetElement.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  return {
    input,
    dispose() {
      targetElement.removeEventListener('keydown', onKeyDown);
      targetElement.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    },
  };
}
