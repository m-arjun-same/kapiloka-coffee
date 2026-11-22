/* Kapiloka — own-code 3D GLASS tea tumbler & glass saucer scene (three.js).
   Clear glass (transparent physical material, high env reflection, thin rim),
   amber tea visible inside, logo etched dark on the glass.
   State driven externally (GSAP scrub): rotation, tint, logo swap, orbit. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const TINT_START = new THREE.Color('#ffffff');
const TINT_END = new THREE.Color('#d9c8f2');
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
    color: 0xffffff, metalness: 0, roughness: 0.03,
    transparent: true, opacity: 0.16, envMapIntensity: 3.0,
    clearcoat: 1, clearcoatRoughness: 0.03, ior: 1.5,
    specularIntensity: 1.2,
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
  const proc = new THREE.Group();
  spin.add(proc);

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

  /* real tea — vertical gradient like a real poured chai: deep reddish-brown
     at the base, amber through the body, golden where light hits the top */
  function teaTexture() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 256, 0, 0);
    gr.addColorStop(0, '#8a4d20'); gr.addColorStop(0.45, '#b57a3e');
    gr.addColorStop(0.8, '#d29c5c'); gr.addColorStop(1, '#e6ba82');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    for (let f = 0; f < 12; f++) {
      const x0 = (f / 12) * 256;
      const fg = g.createLinearGradient(x0, 0, x0 + 256 / 12, 0);
      fg.addColorStop(0, 'rgba(70,35,8,0.20)'); fg.addColorStop(0.5, 'rgba(255,235,200,0.13)'); fg.addColorStop(1, 'rgba(70,35,8,0.20)');
      g.fillStyle = fg; g.fillRect(x0, 30, 256 / 12, 226);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const tea = new THREE.Mesh(flute(lathe([
    [0.0, 0.16], [0.225, 0.16], [0.25, 0.2], [0.272, 0.42], [0.295, 0.62], [0.322, 0.74], [0.0, 0.74]
   ]), 0.045), new THREE.MeshPhysicalMaterial({
    map: teaTexture(), roughness: 0.34, metalness: 0,
    clearcoat: 0.35, clearcoatRoughness: 0.25, envMapIntensity: 0.7
  }));
  tea.renderOrder = 1;
  proc.add(tea);
  /* tea top surface — lighter, glossy, with a soft froth patch */
  function teaTopTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(108, 108, 10, 128, 128, 128);
    gr.addColorStop(0, '#eec894'); gr.addColorStop(0.7, '#dfae72'); gr.addColorStop(1, '#cf9455');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(250,240,218,1)'; g.lineWidth = 26;
    g.beginPath(); g.arc(128, 128, 111, 0, 6.283); g.stroke();
    for (let i = 0; i < 110; i++) { const a = Math.random() * 6.283, r = 100 + Math.random() * 24;
      const x = 128 + Math.cos(a) * r, y = 128 + Math.sin(a) * r, rad = 1.8 + Math.random() * 3.6;
      g.fillStyle = 'rgba(176,120,58,0.35)'; g.beginPath(); g.arc(x, y + 1, rad, 0, 6.283); g.fill();
      g.fillStyle = 'rgba(255,252,244,0.98)'; g.beginPath(); g.arc(x, y, rad, 0, 6.283); g.fill(); }
    for (let i = 0; i < 22; i++) { g.beginPath(); g.arc(40 + Math.random() * 176, 40 + Math.random() * 176, 1 + Math.random() * 1.8, 0, 6.283); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const teaTop = new THREE.Mesh(
    new THREE.CircleGeometry(0.322, 64),
    new THREE.MeshPhysicalMaterial({ map: teaTopTexture(), roughness: 0.32, clearcoat: 0.4, envMapIntensity: 0.8 })
  );
  /* golden meniscus ring where tea meets glass */
  const meniscus = new THREE.Mesh(new THREE.TorusGeometry(0.318, 0.007, 10, 96),
    new THREE.MeshPhysicalMaterial({ color: 0xe0aa64, roughness: 0.3, clearcoat: 1 }));
  meniscus.rotation.x = Math.PI / 2; meniscus.position.y = 0.74; meniscus.renderOrder = 2;
  proc.add(meniscus);
  /* tiny bubbles rising in the tea */
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(0.008, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xf7e3c0, transparent: true, opacity: 0.32 }), 36);
  { const d = new THREE.Object3D();
    for (let i = 0; i < 36; i++) { const a = Math.random() * 6.283, r = Math.random() * 0.24;
      d.position.set(Math.cos(a) * r, 0.22 + Math.random() * 0.46, Math.sin(a) * r);
      const sc = 0.5 + Math.random(); d.scale.set(sc, sc, sc); d.updateMatrix(); bubbles.setMatrixAt(i, d.matrix); }
    bubbles.renderOrder = 2; }
  proc.add(bubbles);
  teaTop.rotation.x = -Math.PI / 2; teaTop.position.y = 0.741; teaTop.renderOrder = 2;
  proc.add(teaTop);
  const froth = new THREE.Mesh(
    new THREE.CircleGeometry(0.17, 48),
    new THREE.MeshStandardMaterial({ color: 0xf6e3bb, roughness: 0.6, transparent: true, opacity: 0.55 })
  );
  froth.rotation.x = -Math.PI / 2; froth.position.set(0.05, 0.743, 0.03); froth.renderOrder = 2;
  proc.add(froth);


  /* vertical flutes — displace lathe radii with a 12-lobed wave, fading out
     under the smooth rim band, exactly like a real cutting-chai glass */
  function flute(geo, amp) {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const r = Math.hypot(x, z); if (r < 0.01) continue;
      const t = Math.min(1, Math.max(0, (y - 0.12) / 0.5));
      const w = Math.sin(Math.min(1, t) * Math.PI * 0.5) * (y > 0.62 ? Math.max(0, 1 - (y - 0.62) / 0.12) : 1);
      const s = 1 + amp * Math.cos(Math.atan2(z, x) * 12) * w;
      p.setX(i, x * s); p.setZ(i, z * s);
    }
    geo.computeVertexNormals(); return geo;
  }
  /* glass tumbler over the tea — flared cutting-chai glass shape */
  const tumbler = new THREE.Mesh(flute(lathe([
    [0.0, 0.1], [0.252, 0.1], [0.278, 0.128], [0.296, 0.34], [0.318, 0.58],
    [0.352, 0.78], [0.362, 0.812], [0.35, 0.822], [0.33, 0.792],
    [0.3, 0.56], [0.272, 0.3], [0.238, 0.158], [0.0, 0.148]
   ]), 0.05), glass);
  tumbler.renderOrder = 4;
  proc.add(tumbler);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.356, 0.011, 12, 128), glassEdge);
  lip.rotation.x = Math.PI / 2; lip.position.y = 0.815; lip.renderOrder = 5;
  proc.add(lip);
  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.262, 0.01, 12, 96), glassEdge);
  baseRing.rotation.x = Math.PI / 2; baseRing.position.y = 0.115; baseRing.renderOrder = 5;
  proc.add(baseRing);

  /* softbox shine streaks — the bright vertical reflections real glass shows */
  function streakTexture() {
    const c = document.createElement('canvas'); c.width = 128; c.height = 256;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 128, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 256);
    const t = new THREE.CanvasTexture(c); return t;
  }
  const streakTex = streakTexture();
  function streak(theta, w, op) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.345, 0.318, 0.58, 16, 1, true, theta, w),
      new THREE.MeshBasicMaterial({ map: streakTex, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    m.position.y = 0.47; m.renderOrder = 5; return m;
  }
  proc.add(streak(-0.9, 0.5, 0.55), streak(2.2, 0.32, 0.3));

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
  proc.add(frontLogo, backLogo);

  /* real Indian chai glass model (Sketchfab, CC-BY bhagathgoud) — same
     GLB-in-Three.js method as the Cafe Breizh croissant */
  new GLTFLoader().load('assets/models/chai-glass.glb', (gltf) => {
    const model = gltf.scene;
  const drop = [];
    model.traverse((o) => { if (/plane/i.test(o.name) || o.name === 'Cylinder002_9') drop.push(o); });
    drop.forEach((o) => o.removeFromParent());
    const fakeGlass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.13, envMapIntensity: 2.6, clearcoat: 1, clearcoatRoughness: 0.05, ior: 1.5, specularIntensity: 1.2, side: THREE.DoubleSide, depthWrite: false });
    const fakeCond = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.15, transparent: true, opacity: 0.32, envMapIntensity: 2.0, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
    model.traverse((o) => { if (o.isMesh) { const mn = (o.material && o.material.name) || ''; if (mn.indexOf('Glass') === 0) { o.material = fakeGlass; o.renderOrder = 4; } else if (mn === 'Condensation') { o.material = fakeCond; o.renderOrder = 5; } else if (mn === 'Liquid') { o.scale.y = 1.3; o.position.y += 0.02; o.renderOrder = 1; } } });
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const sc = 0.8 / size.y;
    model.scale.setScalar(sc);
    const c = box.getCenter(new THREE.Vector3());
    model.position.set(-c.x * sc, -box.min.y * sc + 0.02, -c.z * sc);
    spin.add(model);
    proc.visible = false;
  });

  const state = {
    rotation: 0, colorMix: 0, frontOpacity: 1, backOpacity: 0,
    orbitYaw: -20, orbitPitch: 75
  };
  const tint = new THREE.Color();

  function applyState() {
    spin.rotation.y = THREE.MathUtils.degToRad(state.rotation);
    tint.copy(TINT_START).lerp(TINT_END, state.colorMix);
    glass.color.copy(tint);
    tea.material.color.setScalar(1 - state.colorMix * 0.12);
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
