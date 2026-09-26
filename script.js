/* ===================================================================
   Liam Ramsden — portfolio behaviour
   Sections: theme toggle, WebGL backdrop, cursor, scroll progress,
   title block, dot nav, reveals, skill meters, contact copy.
=================================================================== */

document.getElementById('year').textContent = new Date().getFullYear();

/* ---------------------------------------------------------------
   Theme (light/dark) — persisted per viewer, defaults to system
   preference. Dispatches 'themechange' so the WebGL scenes below
   can re-colour live without a reload.
--------------------------------------------------------------- */
const THEME_PALETTES = {
  dark:  { line: 0x2C4C72, blue: 0x7DC1F2, accent: 0xFF6A55, good: 0x7ED9A6 },
  light: { line: 0x9FBBD1, blue: 0x1D6FA5, accent: 0xD8442B, good: 0x1F9D6C }
};

function currentThemePalette(){
  const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  return THEME_PALETTES[theme];
}

(function initTheme(){
  let stored = null;
  try { stored = localStorage.getItem('theme'); } catch (err) { /* ignore */ }
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const initial = stored || (prefersLight ? 'light' : 'dark');
  document.documentElement.dataset.theme = initial;

  const toggle = document.getElementById('themeToggle');
  const label = document.getElementById('themeToggleLabel');
  function updateLabel(theme){
    if (label) label.textContent = theme === 'light' ? 'Light' : 'Dark';
  }
  updateLabel(initial);

  if (toggle){
    toggle.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (err) { /* ignore */ }
      updateLabel(next);
      window.dispatchEvent(new CustomEvent('themechange'));
    });
  }
})();

/* ---------------------------------------------------------------
   WebGL backdrop — a drafting-grid corridor the camera flies
   through as the page scrolls. Floor/ceiling grids sit well above
   and below the text column so linework never crosses reading
   content; a few floating wireframe nodes carry the depth cue.
--------------------------------------------------------------- */
(function initScene(){
  const canvas = document.getElementById('webgl-bg');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!window.THREE || !canvas) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (err) {
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 800);
  camera.position.set(0, 2, 30);

  const CORRIDOR_DEPTH = 360;
  let palette = currentThemePalette();

  // manually-built grids (rather than GridHelper) so their line colour
  // can be updated live on theme change without rebuilding geometry
  function makeGrid(size, divisions, color, opacity){
    const half = size / 2;
    const step = size / divisions;
    const verts = [];
    for (let i = 0; i <= divisions; i++){
      const k = -half + i * step;
      verts.push(-half, 0, k,  half, 0, k);
      verts.push(k, 0, -half,  k, 0, half);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    return new THREE.LineSegments(geo, mat);
  }

  // floor + ceiling grids, kept well clear of the text column vertically
  const floor = makeGrid(180, 24, palette.line, 0.5);
  floor.position.set(0, -16, -CORRIDOR_DEPTH / 2);
  scene.add(floor);

  const ceiling = makeGrid(180, 24, palette.line, 0.5);
  ceiling.position.set(0, 16, -CORRIDOR_DEPTH / 2);
  scene.add(ceiling);

  // floating wireframe nodes drifting along the corridor
  const nodeGeo = new THREE.IcosahedronGeometry(1.3, 0);
  const nodes = [];
  const NODE_COUNT = 18;
  for (let i = 0; i < NODE_COUNT; i++){
    const isAccent = i % 2 === 0;
    const mat = new THREE.MeshBasicMaterial({ color: isAccent ? palette.accent : palette.blue, wireframe: true, transparent: true, opacity: 0.6 });
    const mesh = new THREE.Mesh(nodeGeo, mat);
    mesh.position.set(
      (Math.random() - 0.5) * 34,
      (Math.random() < 0.5 ? -1 : 1) * (7 + Math.random() * 8),
      -Math.random() * CORRIDOR_DEPTH
    );
    mesh.scale.setScalar(0.6 + Math.random() * 1.1);
    mesh.userData.spin = (Math.random() - 0.5) * 0.01;
    mesh.userData.isAccent = isAccent;
    scene.add(mesh);
    nodes.push(mesh);
  }

  window.addEventListener('themechange', () => {
    palette = currentThemePalette();
    floor.material.color.setHex(palette.line);
    ceiling.material.color.setHex(palette.line);
    nodes.forEach((n) => n.material.color.setHex(n.userData.isAccent ? palette.accent : palette.blue));
  });

  let mouseX = 0, mouseY = 0;
  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) - 0.5;
    mouseY = (e.clientY / window.innerHeight) - 0.5;
  });

  function scrollProgress(){
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? window.scrollY / max : 0;
  }

  let targetZ = camera.position.z;
  function onScroll(){
    const p = scrollProgress();
    targetZ = 30 - p * (CORRIDOR_DEPTH - 30);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  let camZ = camera.position.z;
  let camRotX = 0, camRotY = 0;

  function animate(){
    requestAnimationFrame(animate);

    camZ += (targetZ - camZ) * 0.06;
    camera.position.z = camZ;

    if (!reduceMotion){
      camRotX += ((mouseY * -0.1) - camRotX) * 0.04;
      camRotY += ((mouseX * 0.14) - camRotY) * 0.04;
    }
    camera.rotation.x = camRotX;
    camera.rotation.y = camRotY;

    nodes.forEach((n) => {
      n.rotation.x += n.userData.spin;
      n.rotation.y += n.userData.spin * 1.3;
    });

    renderer.render(scene, camera);
  }
  animate();
})();

/* ---------------------------------------------------------------
   Sync-gate demo — a small standalone scene showing the foreground
   and background sync coordinators queuing at a shared gate before
   reaching the data store (see the Fieldwork case study).
--------------------------------------------------------------- */
(function initGateWidget(){
  const canvas = document.getElementById('gateCanvas');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!canvas || !window.THREE) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (err) {
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 1.6, 9);
  camera.lookAt(0, 0, 0);

  let palette = currentThemePalette();
  const START_X = -4.2, GATE_X = 0.6, END_X = 4.6;

  const trackMats = [0.9, -0.9].map((y) => {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(START_X, y, 0),
      new THREE.Vector3(END_X, y, 0)
    ]);
    const mat = new THREE.LineBasicMaterial({ color: palette.line, transparent: true, opacity: 0.6 });
    scene.add(new THREE.Line(geo, mat));
    return mat;
  });

  const gateGeo = new THREE.PlaneGeometry(0.06, 2.4);
  const gateMat = new THREE.MeshBasicMaterial({ color: palette.good, transparent: true, opacity: 0.18, side: THREE.DoubleSide });
  const gatePlane = new THREE.Mesh(gateGeo, gateMat);
  gatePlane.position.set(GATE_X, 0, 0);
  scene.add(gatePlane);
  const gateEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(gateGeo),
    new THREE.LineBasicMaterial({ color: palette.good })
  );
  gateEdges.position.copy(gatePlane.position);
  scene.add(gateEdges);

  const storeMat = new THREE.MeshBasicMaterial({ color: palette.line, wireframe: true });
  const store = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), storeMat);
  store.position.set(END_X + 0.4, 0, 0);
  scene.add(store);

  function makeToken(color){
    const mat = new THREE.MeshBasicMaterial({ color, wireframe: true });
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 0), mat);
    const glowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.15 });
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 12), glowMat);
    mesh.add(glow);
    return { mesh, mat, glowMat };
  }

  const fgToken = makeToken(palette.accent);
  const tokenFg = fgToken.mesh;
  tokenFg.position.set(START_X, 0.9, 0);
  scene.add(tokenFg);

  const bgToken = makeToken(palette.blue);
  const tokenBg = bgToken.mesh;
  tokenBg.position.set(START_X, -0.9, 0);
  scene.add(tokenBg);

  window.addEventListener('themechange', () => {
    palette = currentThemePalette();
    trackMats.forEach((m) => m.color.setHex(palette.line));
    storeMat.color.setHex(palette.line);
    fgToken.mat.color.setHex(palette.accent);
    fgToken.glowMat.color.setHex(palette.accent);
    bgToken.mat.color.setHex(palette.blue);
    bgToken.glowMat.color.setHex(palette.blue);
  });

  function resize(){
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  window.addEventListener('resize', resize);
  resize();

  let visible = true;
  if ('IntersectionObserver' in window){
    const io = new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; }, { threshold: 0.05 });
    io.observe(canvas);
  }

  let fgX = START_X, bgX = START_X, bgWaiting = false, t0 = null;

  if (reduceMotion){
    tokenFg.position.x = 2;
    tokenBg.position.x = GATE_X;
    renderer.render(scene, camera);
    return;
  }

  function frame(ts){
    requestAnimationFrame(frame);
    if (!visible){ t0 = ts; return; }
    if (t0 === null) t0 = ts;
    const dt = Math.min(32, ts - t0);
    t0 = ts;
    const span = END_X - START_X;
    const speed = span / 2600;

    fgX += dt * speed;
    if (fgX > END_X) fgX = START_X;

    const fgNearGate = Math.abs(fgX - GATE_X) < 0.9;
    const gateHold = GATE_X - 0.15;

    if (bgX < gateHold){
      bgX += dt * speed * 0.8;
      if (bgX >= gateHold){ bgX = gateHold; bgWaiting = true; }
    } else if (bgWaiting){
      if (!fgNearGate) bgWaiting = false;
    } else {
      bgX += dt * speed * 0.8;
      if (bgX > END_X) bgX = START_X;
    }

    tokenFg.position.x = fgX;
    tokenFg.rotation.y += 0.02;
    tokenFg.rotation.x += 0.015;

    tokenBg.position.x = bgX;
    tokenBg.rotation.y += 0.02;
    tokenBg.rotation.x += 0.015;

    const pulse = bgWaiting ? 0.35 + Math.sin(ts * 0.006) * 0.12 : 0.18;
    gateMat.opacity = pulse;
    gateMat.color.setHex(bgWaiting ? palette.accent : palette.good);
    gateEdges.material.color.setHex(bgWaiting ? palette.accent : palette.good);

    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
})();

/* ---------------------------------------------------------------
   Custom cursor
--------------------------------------------------------------- */
(function initCursor(){
  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  if (!dot || !ring || window.matchMedia('(hover: none)').matches) return;

  let dx = 0, dy = 0, rx = 0, ry = 0;
  window.addEventListener('mousemove', (e) => {
    dx = e.clientX; dy = e.clientY;
    dot.style.left = dx + 'px';
    dot.style.top = dy + 'px';
  });

  function loop(){
    rx += (dx - rx) * 0.18;
    ry += (dy - ry) * 0.18;
    ring.style.left = rx + 'px';
    ring.style.top = ry + 'px';
    requestAnimationFrame(loop);
  }
  loop();

  document.querySelectorAll('a, button, .skill-tags li, .case').forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('is-hover'));
    el.addEventListener('mouseleave', () => ring.classList.remove('is-hover'));
  });
})();

/* ---------------------------------------------------------------
   Scroll progress rail
--------------------------------------------------------------- */
(function initProgress(){
  const fill = document.getElementById('progressFill');
  if (!fill) return;
  function update(){
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? (window.scrollY / max) * 100 : 0;
    fill.style.width = p + '%';
  }
  window.addEventListener('scroll', update, { passive: true });
  update();
})();

/* ---------------------------------------------------------------
   Fixed title block + dot nav — driven by IntersectionObserver
--------------------------------------------------------------- */
(function initSheetTracking(){
  const sheets = document.querySelectorAll('.sheet');
  const num = document.getElementById('sheetNum');
  const name = document.getElementById('sheetName');
  const dots = document.querySelectorAll('.dot-nav__dot');

  if (!sheets.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio > 0.5){
        const id = entry.target.id;
        const sheetNum = entry.target.dataset.sheet;
        const sheetTitle = entry.target.dataset.title;

        if (num) num.textContent = sheetNum;
        if (name) name.textContent = sheetTitle;

        dots.forEach(d => d.classList.toggle('is-active', d.dataset.target === id));
      }
    });
  }, { threshold: [0.5] });

  sheets.forEach(s => observer.observe(s));
})();

/* ---------------------------------------------------------------
   Reveal on scroll
--------------------------------------------------------------- */
(function initReveals(){
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting){
        setTimeout(() => entry.target.classList.add('is-visible'), i * 40);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  items.forEach(el => observer.observe(el));
})();

/* ---------------------------------------------------------------
   Contact — click to copy email
--------------------------------------------------------------- */
(function initCopyEmail(){
  const btn = document.getElementById('copyEmail');
  const hint = document.getElementById('emailHint');
  const emailText = document.getElementById('emailText');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const email = emailText.textContent.trim();
    try {
      await navigator.clipboard.writeText(email);
      hint.textContent = 'copied!';
    } catch (err) {
      hint.textContent = 'copy failed — select manually';
    }
    setTimeout(() => { hint.textContent = 'click to copy'; }, 1800);
  });
})();

/* ---------------------------------------------------------------
   Smooth-scroll for in-page links
--------------------------------------------------------------- */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const id = link.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (target){
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});
