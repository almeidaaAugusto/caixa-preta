import * as THREE from 'three';
import { RoundedBoxGeometry } from '../assets/vendor/three/RoundedBoxGeometry.js';

const REFERENCE = new URL('../assets/perfil-referencia.jpeg', import.meta.url).href;
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const smooth = value => value * value * (3 - 2 * value);

// The geometry is authored here. Only the Three.js library and its MIT helper are vendored.
export function createBoxScene({ canvas, logo = '', name = 'Caixa Preta', paused = false, onError = () => {} }) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
  const cameraHome = new THREE.Vector3(3.8, 2.65, 6.7);
  camera.position.copy(cameraHome);
  camera.lookAt(0, 0, 0);
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const pendingImages = new Set();
  let disposed = false;
  let contextLost = false;
  let frame = 0;
  let lastFrame = 0;
  let idleTime = 0;
  let rotation = -0.12;
  let tilt = 0;
  let opening = null;
  let opened = false;
  let openingProgress = 0;
  let baseFov = 36;
  let environmentTarget;
  let settleReady;
  const ready = new Promise(resolve => { settleReady = resolve; });

  const geometry = value => (geometries.add(value), value);
  const material = value => (materials.add(value), value);
  const texture = value => (textures.add(value), value);
  const mesh = (shape, surface, parent = scene) => {
    const object = new THREE.Mesh(shape, surface);
    parent.add(object);
    return object;
  };
  const rounded = (width, height, depth, radius = 0.035) => geometry(new RoundedBoxGeometry(width, height, depth, 3, radius));
  const canvasTexture = drawing => {
    const bitmap = document.createElement('canvas');
    bitmap.width = bitmap.height = 512;
    drawing(bitmap.getContext('2d'), bitmap);
    const result = texture(new THREE.CanvasTexture(bitmap));
    result.colorSpace = THREE.SRGBColorSpace;
    return result;
  };

  // A small local studio environment produces soft, readable bevel reflections.
  const environment = canvasTexture((context, bitmap) => {
    const gradient = context.createLinearGradient(0, 0, 0, bitmap.height);
    gradient.addColorStop(0, '#404957');
    gradient.addColorStop(0.5, '#101216');
    gradient.addColorStop(1, '#060708');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 512);
    context.filter = 'blur(12px)';
    context.fillStyle = '#d5dfeb';
    context.fillRect(55, 70, 105, 225);
    context.fillStyle = '#687583';
    context.fillRect(320, 60, 70, 310);
    context.fillStyle = '#d9d0ad';
    context.fillRect(430, 185, 50, 100);
  });
  environment.mapping = THREE.EquirectangularReflectionMapping;
  const environmentGenerator = new THREE.PMREMGenerator(renderer);
  try {
    environmentTarget = environmentGenerator.fromEquirectangular(environment);
    scene.environment = environmentTarget.texture;
  } finally {
    environmentGenerator.dispose();
    environment.dispose();
    textures.delete(environment);
  }

  scene.add(new THREE.HemisphereLight(0xd8e2f3, 0x242118, 2.2));
  const key = new THREE.DirectionalLight(0xe8edf5, 5.8);
  key.position.set(-3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9aadc4, 4);
  rim.position.set(4, 2, -4);
  scene.add(rim);
  const insideLight = new THREE.PointLight(0xffd827, 0.3, 12, 2);
  insideLight.position.set(0, -0.2, 0);
  scene.add(insideLight);

  const box = new THREE.Group();
  scene.add(box);
  box.rotation.y = rotation;
  const half = 1.24;
  const size = half * 2;
  const shell = material(new THREE.MeshPhysicalMaterial({ color: 0x14161a, metalness: 0.58, roughness: 0.32, clearcoat: 0.28, clearcoatRoughness: 0.35 }));
  const lidSurface = material(new THREE.MeshPhysicalMaterial({ color: 0x111317, metalness: 0.48, roughness: 0.38, clearcoat: 0.25 }));
  const inner = material(new THREE.MeshStandardMaterial({ color: 0x29271c, roughness: 0.55, metalness: 0.25 }));
  const brass = material(new THREE.MeshStandardMaterial({ color: 0x686247, roughness: 0.34, metalness: 0.8 }));

  const bottom = mesh(rounded(size, 0.12, size), shell, box);
  bottom.position.y = -half;
  const floor = mesh(rounded(size - 0.16, 0.025, size - 0.16, 0.01), inner, box);
  floor.position.y = -half + 0.08;
  const panels = {};
  for (const [side, x, z, width, depth] of [
    ['front', 0, half, size, 0.11],
    ['back', 0, -half, size, 0.11],
    ['left', -half, 0, 0.11, size - 0.11],
    ['right', half, 0, 0.11, size - 0.11],
  ]) {
    const hinge = new THREE.Group();
    hinge.position.set(x, -half, z);
    box.add(hinge);
    const wall = mesh(rounded(width, size - 0.1, depth), shell, hinge);
    wall.position.y = half;
    panels[side] = hinge;
  }

  const lid = new THREE.Group();
  lid.position.set(0, half + 0.005, -half);
  box.add(lid);
  const top = mesh(rounded(size + 0.07, 0.16, size + 0.07, 0.045), lidSurface, lid);
  top.position.z = half;
  const lidInset = mesh(rounded(size - 0.12, 0.025, size - 0.12, 0.01), inner, lid);
  lidInset.position.set(0, -0.095, half);
  for (const x of [-0.77, 0.77]) {
    const hinge = mesh(geometry(new THREE.CylinderGeometry(0.045, 0.045, 0.24, 12)), brass, lid);
    hinge.rotation.z = Math.PI / 2;
    hinge.position.set(x, -0.05, -0.04);
  }

  const plaque = mesh(rounded(1.82, 1.82, 0.035, 0.06), material(new THREE.MeshStandardMaterial({ color: 0x090a0b, roughness: 0.54, metalness: 0.25 })), panels.front);
  plaque.position.set(0, half + 0.04, 0.074);
  let labelTexture;
  let labelImage = null;
  let labelReference = false;
  let labelRevision = 0;
  const labelMaterial = material(new THREE.MeshBasicMaterial({ toneMapped: false }));
  const label = mesh(geometry(new THREE.PlaneGeometry(1.72, 1.72)), labelMaterial, panels.front);
  label.position.set(0, half + 0.04, 0.095);

  function paintLabel(image, reference = false) {
    if (disposed) return;
    const next = canvasTexture(context => {
      context.fillStyle = '#090a0b';
      context.fillRect(0, 0, 512, 512);
      if (image) {
        if (reference) {
          context.save();
          context.beginPath();
          context.arc(256, 200, 154, 0, Math.PI * 2);
          context.clip();
          context.drawImage(image, 430, 48, 150, 150, 102, 46, 308, 308);
          context.restore();
        }
        else {
          const ratio = Math.min(326 / image.naturalWidth, 300 / image.naturalHeight);
          const width = image.naturalWidth * ratio;
          const height = image.naturalHeight * ratio;
          context.drawImage(image, (512 - width) / 2, 195 - height / 2, width, height);
        }
        // An opaque custom response without CORS must fall back before WebGL uploads it.
        context.getImageData(0, 0, 1, 1);
      }
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = '#e9e8e1';
      const title = String(name || 'Caixa Preta').trim().toLocaleUpperCase('pt-BR').slice(0, 80);
      let fontSize = 44;
      context.font = `900 ${fontSize}px Arial, sans-serif`;
      while (context.measureText(title).width > 444 && fontSize > 16) {
        context.font = `900 ${--fontSize}px Arial, sans-serif`;
      }
      context.fillText(title, 256, 409, 444);
      context.fillStyle = '#f2e600';
      context.fillRect(228, 463, 56, 3);
    });
    if (labelTexture) { labelTexture.dispose(); textures.delete(labelTexture); }
    labelImage = image;
    labelReference = reference;
    labelTexture = next;
    labelMaterial.map = next;
    labelMaterial.needsUpdate = true;
    render();
    if (image) settleReady(true);
  }

  function loadLabel(source, reference = false, revision = labelRevision) {
    if (disposed) return;
    const image = new Image();
    pendingImages.add(image);
    image.crossOrigin = 'anonymous';
    const finish = () => { pendingImages.delete(image); image.onload = image.onerror = null; };
    image.onload = () => {
      finish();
      if (disposed || revision !== labelRevision) return;
      try { paintLabel(image, reference); }
      catch { if (!reference) loadLabel(REFERENCE, true, revision); else failLabel(); }
    };
    image.onerror = () => {
      finish();
      if (disposed || revision !== labelRevision) return;
      if (!reference) loadLabel(REFERENCE, true, revision);
      else failLabel();
    };
    image.src = source;
  }

  function failLabel() {
    settleReady(false);
    onError(new Error('Não foi possível preparar a marca da caixa.'));
  }

  const shadowTexture = canvasTexture(context => {
    const gradient = context.createRadialGradient(256, 256, 20, 256, 256, 248);
    gradient.addColorStop(0, 'rgba(0,0,0,.7)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 512);
  });
  const shadow = mesh(geometry(new THREE.PlaneGeometry(6, 6)), material(new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false })));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.64;

  const glowTexture = canvasTexture(context => {
    const gradient = context.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, 'rgba(255,239,151,1)');
    gradient.addColorStop(0.12, 'rgba(255,220,60,.9)');
    gradient.addColorStop(0.36, 'rgba(244,180,12,.28)');
    gradient.addColorStop(1, 'rgba(244,180,12,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 512);
  });
  const glowMaterial = material(new THREE.MeshBasicMaterial({ map: glowTexture, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  const glow = mesh(geometry(new THREE.PlaneGeometry(7.5, 7.5)), glowMaterial, box);
  glow.position.y = -0.18;
  glow.quaternion.copy(camera.quaternion);

  function render() {
    if (!disposed && !contextLost && !document.hidden) renderer.render(scene, camera);
  }

  const fitTarget = new THREE.Vector3();
  const fitRight = new THREE.Vector3();
  const fitUp = new THREE.Vector3();
  const fitBack = new THREE.Vector3();
  const fitCorner = new THREE.Vector3();

  function frameOpenBox(progress) {
    const eased = smooth(progress);
    fitTarget.set(0, eased * 0.18, 0);
    camera.fov = baseFov + eased * 8;
    camera.position.copy(cameraHome);
    camera.lookAt(fitTarget);
    camera.updateMatrixWorld(true);
    fitRight.setFromMatrixColumn(camera.matrixWorld, 0);
    fitUp.setFromMatrixColumn(camera.matrixWorld, 1);
    fitBack.setFromMatrixColumn(camera.matrixWorld, 2);
    const tangentY = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 0.86;
    const tangentX = tangentY * camera.aspect;
    let distance = camera.position.distanceTo(fitTarget) * (1 + eased * 0.1);
    box.updateMatrixWorld(true);
    // Fit the physical faces, including a dragged orientation, without counting the soft glow.
    box.traverse(object => {
      if (!object.isMesh || object === glow) return;
      if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
      const bounds = object.geometry.boundingBox;
      for (let corner = 0; corner < 8; corner++) {
        fitCorner.set(corner & 1 ? bounds.max.x : bounds.min.x, corner & 2 ? bounds.max.y : bounds.min.y, corner & 4 ? bounds.max.z : bounds.min.z);
        fitCorner.applyMatrix4(object.matrixWorld).sub(fitTarget);
        const depth = fitCorner.dot(fitBack);
        distance = Math.max(distance, depth + Math.abs(fitCorner.dot(fitRight)) / tangentX, depth + Math.abs(fitCorner.dot(fitUp)) / tangentY);
      }
    });
    camera.position.copy(fitTarget).addScaledVector(fitBack, distance);
    camera.lookAt(fitTarget);
    camera.updateProjectionMatrix();
  }

  function openingPose(progress) {
    openingProgress = progress;
    const lidProgress = smooth(clamp(progress / 0.68));
    const wallProgress = smooth(clamp((progress - 0.17) / 0.78));
    lid.rotation.x = -lidProgress * Math.PI * 0.79;
    panels.front.rotation.x = wallProgress * 1.48;
    panels.back.rotation.x = -wallProgress * 1.38;
    panels.left.rotation.z = wallProgress * 1.46;
    panels.right.rotation.z = -wallProgress * 1.46;
    const light = smooth(clamp((progress - 0.12) / 0.76));
    insideLight.intensity = 0.3 + light * 4;
    glowMaterial.opacity = light * 0.64;
    key.intensity = 5.8 * (1 - light * 0.6);
    rim.intensity = 4 * (1 - light * 0.5);
    shell.envMapIntensity = 1 - light * 0.6;
    shell.roughness = 0.32 + light * 0.32;
    shell.metalness = 0.58 - light * 0.2;
    shell.clearcoat = 0.28 * (1 - light * 0.7);
    lidSurface.envMapIntensity = 1 - light * 0.4;
    renderer.toneMappingExposure = 1.15 - light * 0.22;
    box.rotation.y = rotation + smooth(progress) * 0.12;
    frameOpenBox(progress);
    glow.quaternion.copy(box.quaternion).invert().multiply(camera.quaternion);
  }

  function schedule() {
    if (!frame && !disposed && !contextLost && !document.hidden && ((!paused && !opened) || opening)) frame = requestAnimationFrame(tick);
  }

  function tick(timestamp) {
    frame = 0;
    if (disposed || contextLost || document.hidden) return;
    const delta = lastFrame ? Math.min((timestamp - lastFrame) / 1000, 0.05) : 0;
    lastFrame = timestamp;
    if (opening) {
      opening.elapsed += delta * 1000;
      const progress = clamp(opening.elapsed / opening.duration);
      openingPose(progress);
      if (progress === 1) {
        const completed = opening;
        opening = null;
        opened = true;
        completed.resolve();
      }
    } else if (!paused && !opened) {
      idleTime += delta;
      rotation += delta * 0.16;
      box.rotation.set(tilt, rotation, 0);
      box.position.y = Math.sin(idleTime * 1.4) * 0.065;
      shadow.material.opacity = 0.86 - Math.sin(idleTime * 1.4) * 0.06;
    }
    render();
    schedule();
  }

  function resize() {
    if (disposed || contextLost) return;
    const bounds = (canvas.parentElement || canvas).getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    baseFov = width / height < 0.9 ? 43 : 36;
    camera.fov = baseFov;
    camera.updateProjectionMatrix();
    if (opening || opened) openingPose(openingProgress);
    render();
  }

  function visibilityChanged() {
    lastFrame = 0;
    if (document.hidden && frame) { cancelAnimationFrame(frame); frame = 0; }
    else { render(); schedule(); }
  }

  function lostContext(event) {
    event.preventDefault();
    if (disposed || contextLost) return;
    contextLost = true;
    settleReady(false);
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (opening) { opening.resolve(); opening = null; }
    onError(new Error('O contexto WebGL foi interrompido.'));
  }

  const observer = new ResizeObserver(resize);
  observer.observe(canvas.parentElement || canvas);
  document.addEventListener('visibilitychange', visibilityChanged);
  canvas.addEventListener('webglcontextlost', lostContext);
  resize();
  paintLabel(null);
  loadLabel(logo || REFERENCE, !logo);
  schedule();

  return {
    ready,
    setBrand({ name: nextName = name, logo: nextLogo = logo } = {}) {
      if (disposed || (nextName === name && nextLogo === logo)) return;
      const sameLogo = nextLogo === logo;
      name = nextName;
      logo = nextLogo;
      labelRevision++;
      for (const image of pendingImages) image.onload = image.onerror = null;
      pendingImages.clear();
      const currentImage = sameLogo ? labelImage : null;
      paintLabel(currentImage, sameLogo && labelReference);
      if (!currentImage) loadLabel(logo || REFERENCE, !logo, labelRevision);
    },
    setPaused(value) {
      if (disposed) return;
      paused = Boolean(value);
      lastFrame = 0;
      if (paused && !opening && frame) { cancelAnimationFrame(frame); frame = 0; }
      render();
      schedule();
    },
    drag(dx, dy) {
      if (disposed || opening || opened) return;
      rotation += (Number(dx) || 0) * 0.008;
      tilt = clamp(tilt + (Number(dy) || 0) * 0.005, -0.48, 0.48);
      box.rotation.set(tilt, rotation, 0);
      render();
    },
    open({ duration = 1600 } = {}) {
      if (disposed || contextLost || opened) return Promise.resolve();
      if (opening) return opening.promise;
      const milliseconds = Number.isFinite(duration) ? Math.max(0, duration) : 1600;
      if (milliseconds === 0) { openingPose(1); opened = true; render(); return Promise.resolve(); }
      let resolve;
      const promise = new Promise(done => { resolve = done; });
      opening = { duration: milliseconds, elapsed: 0, promise, resolve };
      lastFrame = 0;
      schedule();
      return promise;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      settleReady(false);
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      if (opening) { opening.resolve(); opening = null; }
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibilityChanged);
      canvas.removeEventListener('webglcontextlost', lostContext);
      for (const image of pendingImages) image.onload = image.onerror = null;
      pendingImages.clear();
      scene.environment = null;
      environmentTarget?.dispose();
      for (const resource of [...geometries, ...materials, ...textures]) resource.dispose();
      scene.clear();
      renderer.renderLists.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
