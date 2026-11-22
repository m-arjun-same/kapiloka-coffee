/* Kapiloka — own-code 3D GLASS tea tumbler & glass saucer scene (three.js).
   Clear glass (transparent physical material, high env reflection, thin rim),
   amber tea visible inside, logo etched dark on the glass.
   State driven externally (GSAP scrub): rotation, tint, logo swap, orbit. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const TINT_START = new THREE.Color('#ffffff');
const TINT_END = new THREE.Color('#d9e8cf');
const TEA_BASE = new THREE.Color('#b85c0d');

function lathe(points, segments = 128) {
  const pts = points.map(p => new THREE.Vector2(p[0], p[1]));
  return new THREE.LatheGeometry(pts, segments);
}

function logoTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 512, 256);
  g.fillStyle = '#2a1408';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '800 64px "Unbounded", "Arial Black", sans-serif';
  g.fillText('KAPILOKA', 256, 104);
  g.font = '700 30px "Courier Prime", monospace';
  g.fillText('· K A A P I ·', 256, 168);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createCupScene(canvas, opts = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: true,
    preserveDrawingBuffer: !!opts.preserve
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.sortObjects = true;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);

  const key = new THREE.DirectionalLight(0xfff1da, 2.6);
  key.position.set(2.5, 4.5, 2.5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffe9c4, 1.6);
  rim.position.set(-3, 2, -2.5);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0xfff6e8, 0.5));

  /* proper glass: clear, see-through, glossy reflections — not metal, not opaque */
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.05,
    transparent: true, opacity: 0.26, envMapIntensity: 2.2,
    clearcoat: 1, clearcoatRoughness: 0.06, ior: 1.5,
    side: THREE.DoubleSide, depthWrite: false
  });
  /* brighter glass edge so the rim and silhouette read as real glass */
  const glassEdge = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.02,
    transparent: true, opacity: 0.65, envMapIntensity: 2.6,
    clearcoat: 1, side: THREE.DoubleSide, depthWrite: false
  });

  const spin = new THREE.Group();
  scene.add(spin);

  /* glass saucer (davara shape, in glass) */
  const saucer = new THREE.Mesh(lathe([
    [0.0, 0.0], [0.28, 0.0], [0.32, 0.016], [0.48, 0.05], [0.66, 0.112],
    [0.76, 0.2], [0.775, 0.226], [0.75, 0.232], [0.675, 0.18],
    [0.48, 0.106], [0.28, 0.082], [0.0, 0.078]
  ]), glass);
  saucer.renderOrder = 3;
  spin.add(saucer);
  const saucerRim = new THREE.Mesh(new THREE.TorusGeometry(0.762, 0.012, 12, 128), glassEdge);
  saucerRim.rotation.x = Math.PI / 2; saucerRim.position.y = 0.222; saucerRim.renderOrder = 4;
  spin.add(saucerRim);

  /* tea inside — amber liquid, slightly smaller than the glass, filled to near top */
  const tea = new THREE.Mesh(lathe([
    [0.0, 0.16], [0.225, 0.16], [0.25, 0.2], [0.272, 0.42], [0.295, 0.62], [0.322, 0.74], [0.0, 0.74]
  ]), new THREE.MeshPhysicalMaterial({
    color: TEA_BASE.clone(), roughness: 0.15, metalness: 0,
    transparent: true, opacity: 0.94, clearcoat: 0.6, envMapIntensity: 0.7
  }));
  tea.renderOrder = 1;
  spin.add(tea);
  /* tea top surface — lighter, glossy, with a soft froth patch */
  const teaTop = new THREE.Mesh(
    new THREE.CircleGeometry(0.322, 64),
    new THREE.MeshPhysicalMaterial({ color: 0xd9821e, roughness: 0.12, clearcoat: 1, envMapIntensity: 1.2 })
  );
  teaTop.rotation.x = -Math.PI / 2; teaTop.position.y = 0.741; teaTop.renderOrder = 2;
  spin.add(teaTop);
  const froth = new THREE.Mesh(
    new THREE.CircleGeometry(0.17, 48),
    new THREE.MeshStandardMaterial({ color: 0xf3c98a, roughness: 0.55, transparent: true, opacity: 0.5 })
  );
  froth.rotation.x = -Math.PI / 2; froth.position.set(0.05, 0.743, 0.03); froth.renderOrder = 2;
  spin.add(froth);

  /* glass tumbler over the tea — flared cutting-chai glass shape */
  const tumbler = new THREE.Mesh(lathe([
    [0.0, 0.1], [0.252, 0.1], [0.278, 0.128], [0.296, 0.34], [0.318, 0.58],
    [0.352, 0.78], [0.362, 0.812], [0.35, 0.822], [0.33, 0.792],
    [0.3, 0.56], [0.272, 0.3], [0.238, 0.158], [0.0, 0.148]
  ]), glass);
  tumbler.renderOrder = 4;
  spin.add(tumbler);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.356, 0.011, 12, 128), glassEdge);
  lip.rotation.x = Math.PI / 2; lip.position.y = 0.815; lip.renderOrder = 5;
  spin.add(lip);
  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.262, 0.01, 12, 96), glassEdge);
  baseRing.rotation.x = Math.PI / 2; baseRing.position.y = 0.115; baseRing.renderOrder = 5;
  spin.add(baseRing);

  /* front / back etched logos (opacity swapped by scroll) */
  const logoTex = logoTexture();
  function decal(thetaStart) {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.315, 0.3, 32, 1, true, thetaStart, 1.5),
      new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, opacity: 0, depthWrite: false })
    );
    m.position.y = 0.47; m.renderOrder = 6;
    return m;
  }
  const frontLogo = decal(-0.75);
  const backLogo = decal(Math.PI - 0.75);
  spin.add(frontLogo, backLogo);

  const state = {
    rotation: 0, colorMix: 0, frontOpacity: 1, backOpacity: 0,
    orbitYaw: -20, orbitPitch: 75
  };
  const tint = new THREE.Color();

  function applyState() {
    spin.rotation.y = THREE.MathUtils.degToRad(state.rotation);
    tint.copy(TINT_START).lerp(TINT_END, state.colorMix);
    glass.color.copy(tint);
    tea.material.color.copy(TEA_BASE).lerp(new THREE.Color('#8f430a'), state.colorMix * 0.5);
    frontLogo.material.opacity = state.frontOpacity;
    backLogo.material.opacity = state.backOpacity;
    const phi = THREE.MathUtils.degToRad(state.orbitPitch);
    const theta = THREE.MathUtils.degToRad(state.orbitYaw);
    const R = 3.35;
    camera.position.set(
      R * Math.sin(phi) * Math.sin(theta),
      R * Math.cos(phi) + 0.42,
      R * Math.sin(phi) * Math.cos(theta)
    );
    camera.lookAt(0, 0.42, 0);
  }

  function resize(w, h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function render() { applyState(); renderer.render(scene, camera); }

  applyState();
  return { state, render, resize, renderer, scene, camera };
}
