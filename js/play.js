/* ZenouMath, game player page. */
'use strict';

const $ = (sel) => document.querySelector(sel);

const store = {
  get(k, f) { try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
};
const savedFavorites = store.get('zenou_fav', []);
const favs = new Set(Array.isArray(savedFavorites) ? savedFavorites : []);
function touchRecent(id) {
  const savedRecent = store.get('zenou_recent', []);
  const r = Array.isArray(savedRecent) ? savedRecent.filter(x => x && x.id !== id) : [];
  r.unshift({ id, ts: Date.now() });
  store.set('zenou_recent', r.slice(0, 60));
}

const sources = {
  lo: 'Arcade browser launcher',
  pf: 'Publisher',
  pg: 'CrazyGames',
  sc: 'Scratch',
  hm: 'HoodaMath',
  gamedistribution: 'GameDistribution',
};

function safePage(value) {
  if (!value) return null;
  try {
    const url = new URL(value, location.href);
    return url.protocol === 'https:' || url.origin === location.origin ? url : null;
  } catch {
    return null;
  }
}

function showUnavailable(game) {
  const external = game.availability === 'external';
  $('#playerStage').hidden = true;
  $('#errorPanel').hidden = false;
  $('#errorTitle').textContent = external ? 'Play on the source site' : 'Browser build unavailable';
  $('#errorMessage').textContent = game.dep || 'The game URL is missing.';
  const source = external && safePage(game.g);
  if (source) {
    const link = $('#sourceGame');
    link.href = source.href;
    link.textContent = 'Play ' + game.t + ' on ' + source.hostname.replace(/^www\./, '');
    link.hidden = false;
  }
}

function setupFrame(game, url) {
  const frameWrap = $('#frameWrap');
  frameWrap.classList.toggle('frame-tall', game.id === 'lo-2048');
  const loading = $('#loading');
  const status = $('#stageStatus');
  const loadMessage = loading.querySelector('p');
  const full = $('#fsBtn');
  const sound = $('#sndBtn');
  let frame = $('#gameFrame');
  let muted = store.get('zenou_mute', false);
  let audioClass;
  let slowTimer;
  let errorTimer;
  const clearTimers = () => {
    clearTimeout(slowTimer);
    clearTimeout(errorTimer);
  };

  function applyMute() {
    if (url.origin !== location.origin) return;
    try {
      frame.contentDocument?.querySelectorAll('audio,video').forEach(element => { element.muted = muted; });
      const gameWindow = frame.contentWindow;
      if (!gameWindow.AudioContext) return;
      audioClass ||= gameWindow.AudioContext;
      for (const key of Object.getOwnPropertyNames(gameWindow)) {
        let value;
        try { value = gameWindow[key]; } catch { continue; }
        if (value instanceof audioClass) {
          (muted ? value.suspend() : value.resume()).catch(() => {});
        }
      }
      if (!gameWindow.__zenouAudioTrapped) {
        gameWindow.AudioContext = class extends audioClass {
          constructor(...args) {
            super(...args);
            if (muted) this.suspend().catch(() => {});
          }
        };
        gameWindow.__zenouAudioTrapped = true;
      }
    } catch { /* The game may navigate to another origin. */ }
  }

  function fail(message) {
    clearTimers();
    loading.hidden = true;
    frame.hidden = true;
    status.textContent = message;
    frameWrap.classList.add('frame-failed');
    full.disabled = true;
  }

  function load() {
    clearTimers();
    status.textContent = '';
    frameWrap.classList.remove('frame-failed');
    loading.hidden = false;
    full.disabled = false;
    loadMessage.textContent = game.mb > 12 ? `Loading a large game (~${game.mb} MB)…` : 'Opening game…';
    const next = frame.cloneNode(false);
    next.title = game.t;
    next.hidden = false;
    next.addEventListener('load', () => {
      clearTimers();
      loading.hidden = true;
      if (url.origin === location.origin && next.contentDocument?.body?.dataset.gameLoadError) {
        fail('The browser build couldn’t start. Reload or open the source.');
        return;
      }
      status.textContent = 'Trouble playing? Reload the game or open it in a new tab.';
      applyMute();
    });
    next.addEventListener('error', () => fail('Could not open the game. Try reloading.'));
    next.src = url.href;
    frame.replaceWith(next);
    frame = next;
    audioClass = null;
    slowTimer = setTimeout(() => { loadMessage.textContent = 'Still opening the game…'; }, 8000);
    errorTimer = setTimeout(() => fail('The game page took too long to open. Try reloading.'), 45000);
  }

  const open = $('#openGame');
  open.href = safePage(game.g)?.href || url.href;
  open.hidden = false;
  if (url.origin === location.origin) {
    sound.hidden = false;
    sound.setAttribute('aria-pressed', String(muted));
    sound.addEventListener('click', () => {
      muted = !muted;
      store.set('zenou_mute', muted);
      sound.setAttribute('aria-pressed', String(muted));
      applyMute();
    });
  }

  window.addEventListener('message', event => {
    if (event.origin === location.origin && event.source === frame.contentWindow
      && event.data?.type === 'zenou:game-load-error') fail('The browser build couldn’t start. Reload or open the source.');
  });

  full.addEventListener('click', async () => {
    if (!frameWrap.requestFullscreen) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await frameWrap.requestFullscreen();
    } catch {
      status.textContent = 'Fullscreen is unavailable in this browser.';
    }
  });
  $('#retryBtn').addEventListener('click', load);
  load();
}

async function boot() {
  const p = new URLSearchParams(location.search);
  const id = p.get('id') || '';
  let GAMES;
  try {
    const res = await fetch('/catalog/games.json?v=2026-11-20');
    if (!res.ok) throw new Error(res.status);
    GAMES = (await res.json()).games;
  } catch {
    $('#main').innerHTML = '<p class="empty">The catalog failed to load, refresh in a moment.</p>';
    return;
  }
  const g = GAMES.find(x => x.id === id);
  if (!g) {
    $('#missingView').hidden = false;
    return;
  }

  document.title = window.zenouMaskedTitle
    ? window.zenouMaskedTitle(`${g.t} · Zenou Arcade`)
    : `${g.t} · Zenou Arcade`;
  if (!g.availability) touchRecent(g.id);
  if (g.wrap || g.direct) {
    const target = safePage(g.wrap ? g.u : g.direct);
    if (target) { location.replace(target.href); return; }
  }
  $('#playerView').hidden = false;

  $('#gTitle').textContent = g.t;
  const source = g.availability === 'external' ? safePage(g.g)?.hostname.replace(/^www\./, '')
    : g.s === 'scratch' && g.a ? `Scratch · @${g.a}` : sources[g.p] || 'Publisher';
  $('#gMeta').textContent = g.p === 'pf' && g.a ? g.a : source;
  $('#gDesc').textContent = g.note || 'Controls depend on the game. Use fullscreen for more room.';
  if (g.dep && !g.availability) {
    $('#embedNote').hidden = false;
    $('#embedNote').textContent = g.dep;
  }
  for (const category of (g.cs || []).slice(0, 6)) {
    const link = document.createElement('a');
    link.href = '/?c=' + encodeURIComponent(category);
    link.textContent = category.replace(/-/g, ' ');
    $('#gCats').append(link);
  }
  $('#gSource').textContent = 'Game rights remain with its creators.';

  // copy a shareable link
  const shareBtn = $('#shareBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const label = shareBtn.querySelector('span');
      try {
        await navigator.clipboard.writeText(location.href);
        label.textContent = 'Link copied';
      } catch {
        label.textContent = 'Copy failed';
      }
      setTimeout(() => { label.textContent = 'Copy link'; }, 1600);
    });
  }

  // favorite toggle
  const favBtn = $('#favBtn');
  const setFav = (on) => {
    favBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    favBtn.querySelector('span').textContent = on ? 'Favorited' : 'Favorite';
  };
  setFav(favs.has(g.id));
  favBtn.addEventListener('click', () => {
    const on = !favs.has(g.id);
    if (on) favs.add(g.id); else favs.delete(g.id);
    store.set('zenou_fav', [...favs]);
    setFav(on);
  });

  const url = safePage(g.u);
  if (g.availability || !url) showUnavailable(g);
  else setupFrame(g, url);

  // related games (same primary category)
  const pool = GAMES.filter(x =>
    x.id !== g.id && !x.availability
    && (!g.cs || x.cs?.some(c => g.cs.includes(c)))
  ).slice(0, 12);
  const rg = $('#relatedGrid');
  pool.forEach(x => rg.append(relatedCard(x)));

  setupTools(g);
}

/* ----------------------------------------------------------------
   Everything local: ratings, notes, playtime, playlists, reports.
   Uses the shared store from js/zenou-plus.js when it is available.
   ---------------------------------------------------------------- */
function setupTools(g) {
  const Z = window.Zenou;
  const host = $('#zenouTools');
  if (!host) return;
  host.hidden = false;

  if (!g.availability) {
    /* local playtime, flushed on hide/unload so a quick tab close still counts */
    const playtime = Z ? Z.store.playtime : store.get('zenou_playtime', {});
    const started = Date.now();
    let banked = 0;
    const flush = () => {
      const now = Date.now();
      const add = now - started - banked;
      if (add < 1000) return;
      banked += add;
      playtime[g.id] = (playtime[g.id] || 0) + add;
      if (Z) { Z.store.playtime = playtime; Z.store.savePlaytime(); }
      else store.set('zenou_playtime', playtime);
    };
    document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
    window.addEventListener('pagehide', flush);

    const timer = $('#sessionTimer');
    let tick = 0;
    const paintTimer = () => {
      const secs = Math.floor((Date.now() - started) / 1000);
      timer.textContent = `Session ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    };
    paintTimer();
    tick = setInterval(paintTimer, 1000);
    window.addEventListener('pagehide', () => clearInterval(tick));

    /* award xp + streak once per visit */
    if (Z) {
      Z.markDay();
      Z.addXp(5);
      setTimeout(() => Z.checkAchievements(), 1200);
    }

  } else {
    $('#sessionTimer').hidden = true;
  }

  /* rating */
  const ratingHost = $('#ratingHost');
  if (ratingHost && Z) {
    const label = document.createElement('div');
    label.className = 'filter-row';
    const cap = document.createElement('span');
    cap.textContent = 'Your rating';
    label.append(cap, Z.ratingRow(g.id, (v) => {
      if (v) Z.toast(`Rated ${v}/5`, g.t);
    }));
    ratingHost.append(label);
  }

  /* notes */
  const note = $('#noteBox');
  if (note && Z) {
    note.value = Z.store.notes[g.id] || '';
    let t = 0;
    note.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const v = note.value.trim();
        if (v) Z.store.notes[g.id] = v.slice(0, 600);
        else delete Z.store.notes[g.id];
        Z.store.saveNotes();
        Z.addXp(1);
      }, 500);
    });
  }

  /* playlist + restart + report */
  $('#playlistBtn')?.addEventListener('click', () => { if (Z) Z.playlistPicker(g.id, g.t); });

  $('#reportBtn')?.addEventListener('click', () => {
    if (!Z) return;
    Z.store.reported = Z.store.reported.filter(r => r.id !== g.id);
    Z.store.reported.unshift({ id: g.id, t: g.t, ts: Date.now() });
    Z.LS.set('zenou_reported', Z.store.reported.slice(0, 100));
    Z.toast('Issue saved in this browser', 'Find it in My Library → Data.');
  });
}

function relatedCard(g) {
  const a = document.createElement('a');
  a.className = 'card';
  a.href = `/play?id=${encodeURIComponent(g.id)}`;
  if (g.img) {
    const img = document.createElement('img');
    img.className = 'card-thumb';
    img.loading = 'lazy'; img.decoding = 'async'; img.alt = '';
    img.src = g.img;
    img.onerror = () => { const pl = document.createElement('span'); pl.className = 'card-plaque'; pl.textContent = '▶'; img.replaceWith(pl); };
    a.append(img);
  } else {
    const pl = document.createElement('span');
    pl.className = 'card-plaque';
    pl.textContent = '▶';
    a.append(pl);
  }
  const play = document.createElement('span');
  play.className = 'card-play-badge';
  play.innerHTML = '<i><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg></i>';
  const nm = document.createElement('span');
  nm.className = 'card-name';
  nm.textContent = g.t;
  a.append(play, nm);
  return a;
}

if (window.ZenouConsent?.accepted()) boot();
else document.addEventListener('zenoumath:consent', boot, { once: true });
