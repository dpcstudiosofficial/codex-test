import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';
import { createSceneSystem, resizeRenderer } from './src/sceneSetup.js';
import { createCarMesh, createPlayerController } from './src/playerController.js';
import { createVehiclePhysics } from './src/vehiclePhysics.js';
import { createRoadSystem } from './src/roadGenerator.js';
import { createHUD } from './src/uiHud.js';

const app = document.getElementById('app');
const { scene, camera, renderer } = createSceneSystem(app);
const road = createRoadSystem(scene);
const playerInput = createPlayerController(window);
const physics = createVehiclePhysics();
const hud = createHUD();

const clock = new THREE.Clock();

const world = {
  crashed: false,
  score: 0,
  distance: 0,
  nearMisses: 0,
  difficulty: 1,
};

const playerCar = createCarMesh(0x2d95ff);
playerCar.position.set(0, 0, 0);
scene.add(playerCar);

const trafficRoot = new THREE.Group();
scene.add(trafficRoot);

const trafficCars = [];
const playerBox = new THREE.Box3();
const trafficBox = new THREE.Box3();

const laneIndices = Array.from({ length: road.laneCount }, (_, i) => i);

function createTrafficCar() {
  const palette = [0xff675f, 0x60e392, 0xffcb5a, 0xce8dff, 0xffffff, 0x62d5ff];
  const mesh = createCarMesh(palette[(Math.random() * palette.length) | 0]);
  mesh.position.y = 0;
  trafficRoot.add(mesh);

  return {
    mesh,
    lane: 0,
    speed: 20,
    nearMissAwarded: false,
  };
}

function spawnTraffic(count = 14) {
  for (let i = 0; i < count; i += 1) {
    const t = createTrafficCar();
    resetTrafficCar(t, i * 35 + 50 + Math.random() * 30);
    trafficCars.push(t);
  }
}

function resetTrafficCar(car, extraForward = 120) {
  car.lane = laneIndices[(Math.random() * laneIndices.length) | 0];
  car.mesh.position.x = road.getLaneX(car.lane);
  car.mesh.position.z = world.distance + extraForward + Math.random() * 140;
  car.speed = 12 + Math.random() * (18 + world.difficulty * 5);
  car.mesh.rotation.y = 0;
  car.nearMissAwarded = false;
}

spawnTraffic();

const cameraState = {
  desiredPos: new THREE.Vector3(),
  lookTarget: new THREE.Vector3(),
};

function restartGame() {
  world.crashed = false;
  world.score = 0;
  world.distance = 0;
  world.nearMisses = 0;
  world.difficulty = 1;
  physics.reset();
  playerCar.position.set(0, 0, 0);
  playerCar.rotation.set(0, 0, 0);

  trafficCars.forEach((car, i) => resetTrafficCar(car, i * 32 + 60));
}

function updateTraffic(dt) {
  const playerSpeed = physics.state.speed;

  trafficCars.forEach((car) => {
    // Base AI: keep lane, adapt speed with difficulty and relative player speed.
    const targetSpeed = car.speed + world.difficulty * 3;
    car.mesh.position.z -= (targetSpeed - playerSpeed * 0.14) * dt;

    if (car.mesh.position.z < playerCar.position.z - 40) {
      resetTrafficCar(car, 210 + Math.random() * 90);
    }

    // Occasional lane changes to create pressure.
    if (Math.random() < 0.25 * dt * world.difficulty) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      car.lane = THREE.MathUtils.clamp(car.lane + dir, 0, road.laneCount - 1);
    }

    const laneX = road.getLaneX(car.lane);
    car.mesh.position.x = THREE.MathUtils.damp(car.mesh.position.x, laneX, 7, dt);

    // Near miss scoring.
    const dz = Math.abs(car.mesh.position.z - playerCar.position.z);
    const dx = Math.abs(car.mesh.position.x - playerCar.position.x);
    if (!car.nearMissAwarded && dz < 3.4 && dx < road.laneWidth * 0.62 && dx > 1.4) {
      car.nearMissAwarded = true;
      world.nearMisses += 1;
      world.score += 120 * world.difficulty;
    }

    if (dz > 9) car.nearMissAwarded = false;
  });
}

function collisionCheck() {
  playerBox.setFromObject(playerCar).expandByScalar(-0.12);

  for (const car of trafficCars) {
    trafficBox.setFromObject(car.mesh).expandByScalar(-0.12);
    if (playerBox.intersectsBox(trafficBox)) {
      world.crashed = true;
      physics.state.speed *= 0.1;
      return;
    }
  }
}

function updatePlayer(dt) {
  if (world.crashed) {
    physics.step({ accelerate: false, brake: true, left: false, right: false }, dt);
    if (playerInput.input.restart) restartGame();
    return;
  }

  physics.step(playerInput.input, dt);

  const half = road.roadWidth * 0.5 - 1;
  physics.state.position.x = THREE.MathUtils.clamp(physics.state.position.x, -half, half);

  playerCar.position.set(physics.state.position.x, 0, physics.state.position.z);

  // Steering sensitivity + roll visual.
  const targetRoll = -physics.state.steerAngle * 0.25 * (Math.abs(physics.state.speed) / physics.settings.maxSpeed);
  playerCar.rotation.z = THREE.MathUtils.damp(playerCar.rotation.z, targetRoll, 8, dt);
  playerCar.rotation.y = THREE.MathUtils.damp(playerCar.rotation.y, physics.state.steerAngle * 0.12, 10, dt);

  world.distance = Math.max(0, physics.state.position.z);
  world.score += Math.max(0, physics.state.speed) * dt * (1 + world.difficulty * 0.15);
  world.difficulty = 1 + world.distance / 900;

  collisionCheck();
}

function updateCamera(dt) {
  const speed01 = Math.max(0, physics.state.speed / physics.settings.maxSpeed);

  cameraState.desiredPos.set(
    playerCar.position.x,
    2.8 + speed01 * 0.9,
    playerCar.position.z - (7.4 + speed01 * 2.8),
  );

  // subtle high speed shake
  const shake = speed01 > 0.65 ? (speed01 - 0.65) * 0.08 : 0;
  const t = performance.now() * 0.01;
  cameraState.desiredPos.x += Math.sin(t * 1.4) * shake;
  cameraState.desiredPos.y += Math.cos(t * 1.8) * shake;

  camera.position.lerp(cameraState.desiredPos, 1 - Math.exp(-dt * 7));

  cameraState.lookTarget.copy(playerCar.position);
  cameraState.lookTarget.y += 1.0;
  cameraState.lookTarget.z += 10;
  camera.lookAt(cameraState.lookTarget);
}

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.05);

  updatePlayer(dt);
  updateTraffic(dt);
  road.update(playerCar.position.z);
  updateCamera(dt);

  hud.update({
    score: world.score,
    distance: world.distance,
    nearMisses: world.nearMisses,
    speedKmh: Math.max(0, physics.state.speed * 3.6),
    maxKmh: physics.settings.maxSpeed * 3.6,
    crashed: world.crashed,
  });

  // keep environment roughly centered to avoid floating-point drift.
  if (playerCar.position.z > 5000) {
    const shift = playerCar.position.z - 100;
    physics.state.position.z -= shift;
    playerCar.position.z -= shift;
    trafficCars.forEach((car) => {
      car.mesh.position.z -= shift;
    });
  }

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => resizeRenderer(camera, renderer));

camera.position.set(0, 2.6, -8);
camera.lookAt(0, 1, 8);

animate();
