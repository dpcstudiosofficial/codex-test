import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';

export function createRoadSystem(scene, { laneCount = 3, laneWidth = 3.5, segmentLength = 40 } = {}) {
  const shoulderWidth = 7;
  const roadWidth = laneCount * laneWidth;
  const fullWidth = roadWidth + shoulderWidth * 2;

  const segmentCount = 26;
  const segments = [];
  const group = new THREE.Group();

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x1f1f23, roughness: 0.9, metalness: 0.04 });
  const shoulderMat = new THREE.MeshStandardMaterial({ color: 0x2f343f, roughness: 0.95, metalness: 0.01 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x111111 });

  const roadGeo = new THREE.BoxGeometry(roadWidth, 0.2, segmentLength);
  const shoulderGeo = new THREE.BoxGeometry(fullWidth, 0.1, segmentLength);
  const laneStripeGeo = new THREE.BoxGeometry(0.14, 0.03, 4.2);
  const sideStripeGeo = new THREE.BoxGeometry(0.18, 0.03, segmentLength * 0.92);

  function buildSegment(i) {
    const seg = new THREE.Group();

    const shoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
    shoulder.position.y = -0.12;
    shoulder.receiveShadow = true;
    seg.add(shoulder);

    const road = new THREE.Mesh(roadGeo, roadMat);
    road.receiveShadow = true;
    seg.add(road);

    const leftSide = new THREE.Mesh(sideStripeGeo, stripeMat);
    leftSide.position.set(-roadWidth * 0.5 + 0.35, 0.12, 0);
    seg.add(leftSide);

    const rightSide = new THREE.Mesh(sideStripeGeo, stripeMat);
    rightSide.position.set(roadWidth * 0.5 - 0.35, 0.12, 0);
    seg.add(rightSide);

    for (let lane = 1; lane < laneCount; lane += 1) {
      const x = -roadWidth * 0.5 + lane * laneWidth;
      const repeat = Math.floor(segmentLength / 8);
      for (let m = 0; m < repeat; m += 1) {
        const stripe = new THREE.Mesh(laneStripeGeo, stripeMat);
        stripe.position.set(x, 0.115, -segmentLength / 2 + m * 8 + 2);
        seg.add(stripe);
      }
    }

    seg.position.z = i * segmentLength;
    group.add(seg);
    segments.push(seg);
  }

  for (let i = -3; i < segmentCount - 3; i += 1) buildSegment(i);

  // Ambient props for speed sensation.
  const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 3.4, 8);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x8892a5, metalness: 0.25, roughness: 0.6 });
  const lampGeo = new THREE.SphereGeometry(0.17, 10, 10);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x24324f, emissiveIntensity: 1.2 });

  for (let i = -4; i < segmentCount * 1.2; i += 1) {
    [-1, 1].forEach((side) => {
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(side * (fullWidth / 2 + 1.8), 1.6, i * 20);
      pole.castShadow = true;
      pole.receiveShadow = true;
      group.add(pole);

      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(pole.position.x, 3.4, pole.position.z);
      group.add(lamp);
    });
  }

  scene.add(group);

  function update(playerZ) {
    const maxBehind = playerZ - segmentLength * 4;
    let furthest = -Infinity;

    segments.forEach((seg) => {
      if (seg.position.z > furthest) furthest = seg.position.z;
    });

    segments.forEach((seg) => {
      if (seg.position.z + segmentLength * 0.5 < maxBehind) {
        furthest += segmentLength;
        seg.position.z = furthest;
      }
    });

    // Loop props by moving whole group chunk-wise to avoid precision drift.
    const chunk = segmentLength * 8;
    if (playerZ - group.position.z > chunk) {
      group.position.z += chunk;
    }
  }

  function getLaneX(laneIndex) {
    return -roadWidth / 2 + laneWidth * 0.5 + laneIndex * laneWidth;
  }

  return {
    laneCount,
    laneWidth,
    roadWidth,
    fullWidth,
    group,
    update,
    getLaneX,
  };
}
