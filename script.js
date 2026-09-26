/* ===================================================================
   Liam Ramsden — portfolio behaviour
   Sections: WebGL backdrop, cursor, scroll progress, title block,
   dot nav, reveals, skill meters, contact copy.
=================================================================== */

document.getElementById('year').textContent = new Date().getFullYear();

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

  const LINE_COLOR = 0x2C4C72;
  const AMBER = 0xFFB454;
  const BLUE = 0x7DC1F2;
  const CORRIDOR_DEPTH = 360;

  // floor + ceiling grids, kept well clear of the text column vertically
  const floor = new THREE.GridHelper(180, 24, LINE_COLOR, LINE_COLOR);
  floor.position.y = -16;
  floor.position.z = -CORRIDOR_DEPTH / 2;
  floor.material.transparent = true;
  floor.material.opacity = 0.5;
  scene.add(floor);

  const ceiling = floor.clone();
  ceiling.position.y = 16;
  scene.add(ceiling);

  // floating wireframe nodes drifting along the corridor
  const nodeGeo = new THREE.IcosahedronGeometry(1.3, 0);
  const nodes = [];
  const NODE_COUNT = 18;
  for (let i = 0; i < NODE_COUNT; i++){
    const color = i % 2 === 0 ? AMBER : BLUE;
    const mat = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.6 });
    const mesh = new THREE.Mesh(nodeGeo, mat);
    mesh.position.set(
      (Math.random() - 0.5) * 34,
      (Math.random() < 0.5 ? -1 : 1) * (7 + Math.random() * 8),
      -Math.random() * CORRIDOR_DEPTH
    );
    mesh.scale.setScalar(0.6 + Math.random() * 1.1);
    mesh.userData.spin = (Math.random() - 0.5) * 0.01;
    scene.add(mesh);
    nodes.push(mesh);
  }

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

  const AMBER = 0xFFB454, BLUE = 0x7DC1F2, GOOD = 0x7ED9A6, LINE = 0x2C4C72;
  const START_X = -4.2, GATE_X = 0.6, END_X = 4.6;

  [0.9, -0.9].forEach((y) => {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(START_X, y, 0),
      new THREE.Vector3(END_X, y, 0)
    ]);
    const mat = new THREE.LineBasicMaterial({ color: LINE, transparent: true, opacity: 0.6 });
    scene.add(new THREE.Line(geo, mat));
  });

  const gateGeo = new THREE.PlaneGeometry(0.06, 2.4);
  const gateMat = new THREE.MeshBasicMaterial({ color: GOOD, transparent: true, opacity: 0.18, side: THREE.DoubleSide });
  const gatePlane = new THREE.Mesh(gateGeo, gateMat);
  gatePlane.position.set(GATE_X, 0, 0);
  scene.add(gatePlane);
  const gateEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(gateGeo),
    new THREE.LineBasicMaterial({ color: GOOD })
  );
  gateEdges.position.copy(gatePlane.position);
  scene.add(gateEdges);

  const store = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.9, 0.9),
    new THREE.MeshBasicMaterial({ color: LINE, wireframe: true })
  );
  store.position.set(END_X + 0.4, 0, 0);
  scene.add(store);

  function makeToken(color){
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.32, 0),
      new THREE.MeshBasicMaterial({ color, wireframe: true })
    );
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 12, 12),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.15 })
    );
    mesh.add(glow);
    return mesh;
  }

  const tokenFg = makeToken(AMBER);
  tokenFg.position.set(START_X, 0.9, 0);
  scene.add(tokenFg);

  const tokenBg = makeToken(BLUE);
  tokenBg.position.set(START_X, -0.9, 0);
  scene.add(tokenBg);

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
    gateMat.color.set(bgWaiting ? AMBER : GOOD);
    gateEdges.material.color.set(bgWaiting ? AMBER : GOOD);

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
