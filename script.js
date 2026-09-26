/* ===================================================================
   Liam Ramsden — portfolio behaviour
   Sections: WebGL backdrop, cursor, scroll progress, title block,
   dot nav, reveals, skill meters, contact copy.
=================================================================== */

document.getElementById('year').textContent = new Date().getFullYear();

/* ---------------------------------------------------------------
   WebGL backdrop — wireframe tunnel the camera flies through,
   position driven by scroll progress.
--------------------------------------------------------------- */
(function initScene(){
  const canvas = document.getElementById('webgl-bg');
  if (!window.THREE || !canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 400);
  camera.position.z = 10;

  const blue = new THREE.Color(0x7DC1F2);
  const amber = new THREE.Color(0xFFB454);

  // ring tunnel
  const RING_COUNT = 40;
  const RING_SPACING = 12;
  const rings = [];
  const ringGeo = new THREE.TorusGeometry(6, 0.015, 8, 40);

  for (let i = 0; i < RING_COUNT; i++){
    const isCheckpoint = i % 6 === 0;
    const mat = new THREE.MeshBasicMaterial({
      color: isCheckpoint ? amber : blue,
      transparent: true,
      opacity: isCheckpoint ? 0.55 : 0.22,
      wireframe: true
    });
    const ring = new THREE.Mesh(ringGeo, mat);
    ring.position.z = -i * RING_SPACING;
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);
    rings.push(ring);
  }

  // particle field for depth
  const PARTICLE_COUNT = 700;
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++){
    positions[i * 3] = (Math.random() - 0.5) * 40;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
    positions[i * 3 + 2] = -Math.random() * RING_COUNT * RING_SPACING;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({ color: 0x7DC1F2, size: 0.05, transparent: true, opacity: 0.5 });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // central spine geometry — an icosahedron drifting near the camera path
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.6, 0),
    new THREE.MeshBasicMaterial({ color: 0xFFB454, wireframe: true, transparent: true, opacity: 0.35 })
  );
  core.position.z = -RING_SPACING * 3;
  scene.add(core);

  let targetZ = camera.position.z;
  let currentZ = camera.position.z;
  let mouseX = 0, mouseY = 0;

  function scrollProgress(){
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? window.scrollY / max : 0;
  }

  function onScroll(){
    const p = scrollProgress();
    targetZ = 10 - p * (RING_COUNT * RING_SPACING - 20);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) - 0.5;
    mouseY = (e.clientY / window.innerHeight) - 0.5;
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();

  function animate(){
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    currentZ += (targetZ - camera.position.z) * 0.06;
    camera.position.z += (targetZ - camera.position.z) * 0.06;
    camera.position.x += (mouseX * 1.2 - camera.position.x) * 0.04;
    camera.position.y += (-mouseY * 1.2 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, camera.position.z - 10);

    rings.forEach((ring, i) => {
      ring.rotation.z += 0.0015 * (i % 3 === 0 ? 1 : -1);
    });
    core.rotation.x += dt * 0.15;
    core.rotation.y += dt * 0.2;
    particles.rotation.y += dt * 0.01;

    renderer.render(scene, camera);
  }
  animate();
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

  document.querySelectorAll('a, button, .meter, .case').forEach(el => {
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
   Skill meters — fill width on scroll into view
--------------------------------------------------------------- */
(function initMeters(){
  const meters = document.querySelectorAll('.meter');
  if (!meters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        const fill = entry.target.querySelector('.meter__fill');
        const value = entry.target.dataset.value;
        if (fill) fill.style.width = value + '%';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  meters.forEach(m => observer.observe(m));
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
