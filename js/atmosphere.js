/* ZenouMath, atmosphere layer.
 * Builds one fixed stack behind the page (nebula, custom image, dim, grid)
 * and draws a canvas starfield / snowfall for the particle modes.
 * Reads the saved background, wallpaper effects, and motion preferences. Pauses in background tabs, honours
 * prefers-reduced-motion, and never blocks scrolling or clicks.
 */
'use strict';

(function () {
  if (window.ZenouAtmo) return;

  const wallpaperPresets = [
    { id: 'blue-glass', name: 'Blue Glass', src: '/art/zenou-glass.webp' },
    { id: 'purple-eye', name: 'saskue v2', src: '/assets/wallpapers/purple-eye.png' },
    { id: 'red-silhouette', name: 'red man', src: '/assets/wallpapers/red-silhouette.png' },
    { id: 'liquid-chrome', name: 'Liquid Chrome', src: '/assets/wallpapers/liquid-chrome.png' },
    { id: 'light-and-shadow', name: 'lumina', src: '/assets/wallpapers/light-and-shadow.png' },
    { id: 'hooded-shadow', name: 'eyes in the darkness', src: '/assets/wallpapers/hooded-shadow.png' },
  ];
  const root = document.documentElement;
  const calmQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const wrap = document.createElement('div');
  wrap.className = 'atmo';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML =
    '<div class="atmo-nebula"></div>' +
    '<div class="atmo-image"></div>' +
    '<div class="atmo-dim"></div>' +
    '<div class="atmo-grid"></div>' +
    '<canvas class="atmo-stars"></canvas>';

  const mount = () => {
    if (!document.querySelector('.atmo')) document.body.prepend(wrap);
  };
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount, { once: true });

  const canvas = wrap.querySelector('canvas');
  const ctx = canvas.getContext('2d', { alpha: true });

  let stars = [];
  let flakes = [];
  let w = 0;
  let h = 0;
  let raf = 0;
  let last = 0;
  let running = false;
  let accent = '255 255 255';

  const rnd = (a, b) => a + Math.random() * (b - a);

  function readAccent() {
    const v = getComputedStyle(root).getPropertyValue('--accent-rgb').trim();
    if (v) accent = v;
  }

  function mode() {
    const bg = root.dataset.bg;
    const particles = bg === 'custom' && root.classList.contains('has-custom')
      ? root.dataset.bgEffects : bg;
    const calm = root.dataset.motion === 'calm' || calmQuery.matches;
    return {
      stars: particles === 'stars' || particles === 'night',
      snow: particles === 'snow' || particles === 'night',
      calm,
    };
  }

  function build() {
    w = window.innerWidth;
    h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const { calm } = mode();
    const scale = calm ? 0.55 : 1;

    const starCount = Math.round(Math.min(260, Math.max(60, (w * h) / 13500)) * scale);
    stars = Array.from({ length: starCount }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: rnd(0.45, 1.55),
      base: rnd(0.35, 0.95),
      phase: rnd(0, Math.PI * 2),
      speed: rnd(0.35, 1.25),
      tint: Math.random() < 0.2,
      drift: rnd(0.0006, 0.0022),
    }));

    const flakeCount = Math.round(Math.min(150, Math.max(30, (w * h) / 15000)) * scale);
    flakes = Array.from({ length: flakeCount }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: rnd(0.8, 2.6),
      vy: rnd(13, 36),
      amp: rnd(6, 22),
      phase: rnd(0, Math.PI * 2),
      speed: rnd(0.5, 1.3),
      alpha: rnd(0.35, 0.9),
    }));
  }

  function ensure() {
    if (!w || !h) build();
  }

  function paint(dt) {
    const { stars: wantStars, snow: wantSnow, calm } = mode();
    ensure();
    ctx.clearRect(0, 0, w, h);
    if (!wantStars && !wantSnow) return;

    const speed = calm ? 0.45 : 1;
    const t = performance.now() / 1000;

    if (wantStars) {
      for (const s of stars) {
        s.y += s.drift * speed * dt * 60;
        if (s.y > 1.02) { s.y = -0.02; s.x = Math.random(); }
        const tw = 0.45 + 0.55 * Math.sin(t * s.speed + s.phase);
        ctx.globalAlpha = s.base * (0.35 + 0.65 * tw) * (calm ? 0.8 : 1);
        ctx.fillStyle = s.tint ? 'rgb(' + accent + ')' : '#fff';
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.r > 1.15) {
          ctx.globalAlpha *= 0.18;
          ctx.beginPath();
          ctx.arc(s.x * w, s.y * h, s.r * 3.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    if (wantSnow) {
      for (const f of flakes) {
        f.y += f.vy * speed * dt;
        if (f.y > h + 6) { f.y = -6; f.x = Math.random() * w; }
        const x = f.x + Math.sin(t * f.speed + f.phase) * f.amp;
        ctx.globalAlpha = f.alpha;
        ctx.fillStyle = '#eef4ff';
        ctx.beginPath();
        ctx.arc(x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000 || 0, 0.05);
    last = now;
    paint(dt);
    raf = requestAnimationFrame(frame);
  }

  function start() {
    const { stars: s, snow: n } = mode();
    if (!ctx || document.hidden || (!s && !n)) return;
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    raf = 0;
    if (ctx) ctx.clearRect(0, 0, w, h);
  }

  function refreshParticles() {
    const { stars, snow } = mode();
    root.toggleAttribute('data-bg-particles', stars || snow);
    stop();
    if (ctx && (stars || snow)) {
      build();
      start();
    }
  }

  function readPreferences() {
    try {
      return JSON.parse(localStorage.getItem('zenou_prefs')) || {};
    } catch {
      return {};
    }
  }

  function applyPreferences(prefs = readPreferences()) {
    const preset = wallpaperPresets.find(wallpaper => wallpaper.id === prefs.bg);
    let image = preset?.src || '';
    if (prefs.bg === 'custom') {
      try { image = localStorage.getItem('zenou_bgimg') || ''; } catch { /* Storage is optional. */ }
    }
    root.classList.toggle('has-custom', !!image);
    if (image) root.style.setProperty('--custom-bg', `url("${image}")`);
    else root.style.removeProperty('--custom-bg');

    root.dataset.bg = preset ? 'custom' : prefs.bg || 'aurora';
    root.dataset.bgEffects = prefs.bgEffects || 'none';
    root.dataset.motion = prefs.motion || 'full';
    const dim = Number(prefs.bgDim ?? 45);
    root.style.setProperty('--bg-dim', Number.isFinite(dim) ? String(Math.min(85, Math.max(0, dim)) / 100) : '.45');

    readAccent();
    refreshParticles();
  }

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(refreshParticles, 160);
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  window.addEventListener('storage', event => {
    if (event.key === 'zenou_prefs' || event.key === 'zenou_bgimg' || event.key === null) applyPreferences();
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) applyPreferences();
  });

  new MutationObserver(readAccent).observe(root, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  calmQuery.addEventListener('change', refreshParticles);

  window.ZenouAtmo = { applyPreferences, wallpaperPresets };
  applyPreferences();
})();
