const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export function createVehiclePhysics(config = {}) {
  const state = {
    speed: 0,
    yaw: 0,
    steerAngle: 0,
    lateralVelocity: 0,
    position: { x: 0, z: 0 },
  };

  const settings = {
    maxSpeed: config.maxSpeed ?? 78,
    reverseSpeed: config.reverseSpeed ?? -18,
    acceleration: config.acceleration ?? 42,
    brakePower: config.brakePower ?? 68,
    drag: config.drag ?? 0.98,
    rollingResistance: config.rollingResistance ?? 7,
    steerStrength: config.steerStrength ?? 1.45,
    wheelBase: config.wheelBase ?? 2.75,
    grip: config.grip ?? 8.5,
  };

  function step(input, dt) {
    let throttleForce = 0;
    if (input.accelerate) throttleForce += settings.acceleration;
    if (input.brake) {
      if (state.speed > 0) {
        throttleForce -= settings.brakePower;
      } else {
        throttleForce -= settings.acceleration * 0.5;
      }
    }

    state.speed += throttleForce * dt;

    // Passive losses
    state.speed *= Math.pow(settings.drag, dt * 60);

    if (Math.abs(state.speed) > 0.1) {
      state.speed -= Math.sign(state.speed) * settings.rollingResistance * dt;
    } else {
      state.speed = 0;
    }

    state.speed = clamp(state.speed, settings.reverseSpeed, settings.maxSpeed);

    const speedRatio = Math.abs(state.speed / settings.maxSpeed);
    const dynamicSteerLimit = (0.3 + speedRatio * 0.7) * settings.steerStrength;

    const steerInput = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    const steerSmoothing = 1 - Math.exp(-dt * 14);
    state.steerAngle += (steerInput * dynamicSteerLimit - state.steerAngle) * steerSmoothing;

    // Bicycle model style turning rate.
    const turnRate =
      (state.speed / settings.wheelBase) * Math.tan(state.steerAngle * 0.45);
    state.yaw += turnRate * dt;

    // Lateral stability (simple grip model)
    state.lateralVelocity += turnRate * state.speed * dt;
    state.lateralVelocity *= Math.exp(-settings.grip * dt);

    const cosY = Math.cos(state.yaw);
    const sinY = Math.sin(state.yaw);

    const forwardStep = state.speed * dt;
    const lateralStep = state.lateralVelocity * dt;

    state.position.x += sinY * forwardStep + cosY * lateralStep;
    state.position.z += cosY * forwardStep - sinY * lateralStep;

    return state;
  }

  function reset() {
    state.speed = 0;
    state.yaw = 0;
    state.steerAngle = 0;
    state.lateralVelocity = 0;
    state.position.x = 0;
    state.position.z = 0;
  }

  return {
    state,
    settings,
    step,
    reset,
  };
}
