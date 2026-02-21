import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';

export function createSceneSystem(container) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x08111f, 0.015);

  const camera = new THREE.PerspectiveCamera(
    65,
    window.innerWidth / window.innerHeight,
    0.1,
    1200,
  );

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  // Procedural sky dome
  const skyGeo = new THREE.SphereGeometry(800, 24, 24);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(0x2b5076) },
      horizonColor: { value: new THREE.Color(0x7e9ec5) },
      bottomColor: { value: new THREE.Color(0x04070f) },
    },
    vertexShader: `varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + vec3(0.0, 120.0, 0.0)).y;
        vec3 color = mix(bottomColor, horizonColor, smoothstep(-0.25, 0.08, h));
        color = mix(color, topColor, smoothstep(0.05, 0.9, h));
        gl_FragColor = vec4(color, 1.0);
      }`,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  const ambient = new THREE.AmbientLight(0x90a7c2, 0.4);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff4d1, 1.2);
  sun.position.set(40, 80, -45);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -120;
  sun.shadow.camera.right = 120;
  sun.shadow.camera.top = 120;
  sun.shadow.camera.bottom = -120;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 260;
  scene.add(sun);

  const hemi = new THREE.HemisphereLight(0x95b8ff, 0x101216, 0.35);
  scene.add(hemi);

  return {
    THREE,
    scene,
    camera,
    renderer,
  };
}

export function resizeRenderer(camera, renderer) {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
