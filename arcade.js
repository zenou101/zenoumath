/* ZenouMath games catalogue.
 *
 * One catalogue (catalog/games.json), one website directory
 * (catalog/sites.json), one grid. Search, filters, sort and layout all update
 * in place: no reload, no second copy of the data, no per-page game lists.
 */
import { paintQueue, queueButton, watchQueue } from '/js/play-later.js';

const $ = id => document.getElementById(id);
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
const PAGE_SIZE = 48;
const GENRES = ['Action', 'Racing', 'Puzzle', 'Sports', 'Adventure', 'Arcade', 'GN-Math', 'Bro Games'];
const LAYOUTS = [
  ['compact', 'Compact grid', '<rect x="3" y="3" width="5" height="5" rx="1"/><rect x="10" y="3" width="5" height="5" rx="1"/><rect x="17" y="3" width="4" height="5" rx="1"/><rect x="3" y="10" width="5" height="5" rx="1"/><rect x="10" y="10" width="5" height="5" rx="1"/><rect x="17" y="10" width="4" height="5" rx="1"/><rect x="3" y="17" width="5" height="4" rx="1"/><rect x="10" y="17" width="5" height="4" rx="1"/><rect x="17" y="17" width="4" height="4" rx="1"/>'],
  ['standard', 'Standard grid', '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'],
  ['large', 'Large grid', '<rect x="3" y="3" width="18" height="7" rx="1"/><rect x="3" y="14" width="8" height="7" rx="1"/><rect x="13" y="14" width="8" height="7" rx="1"/>'],
  ['list', 'List', '<rect x="3" y="4" width="4" height="4" rx="1"/><rect x="10" y="5" width="11" height="2" rx="1"/><rect x="3" y="10" width="4" height="4" rx="1"/><rect x="10" y="11" width="11" height="2" rx="1"/><rect x="3" y="16" width="4" height="4" rx="1"/><rect x="10" y="17" width="11" height="2" rx="1"/>'],
];

function icon(name, viewBox = '0 0 24 24') {
  return `<svg aria-hidden="true" viewBox="${viewBox}"><use href="/assets/ui-icons.svg#${name}"/></svg>`;
}
function svgPaths(paths) {
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">${paths}</svg>`;
}
function store(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function prefs() {
  const saved = store('zenou_prefs', {});
  return saved && typeof saved === 'object' ? saved : {};
}
function savePref(key, value) {
  const next = { ...prefs(), [key]: value };
  try { localStorage.setItem('zenou_prefs', JSON.stringify(next)); } catch { /* quota */ }
  if (typeof window.ZenouSettings?.setPref === 'function') window.ZenouSettings.setPref(key, value);
}
function favourites() {
  const list = store('zenou_fav', []);
  return new Set(Array.isArray(list) ? list : []);
}
function recentIds() {
  const list = store('zenou_recent', []);
  if (!Array.isArray(list)) return [];
  return [...new Set(list.filter(Boolean).map(row => row.id).filter(Boolean))];
}

const state = {
  games: [],
  sites: [],
  matched: [],
  shown: 0,
  load: 'loading',
  query: '',
  genre: '',
  sort: '',
  favOnly: false,
  layout: prefs().gameLayout || 'standard',
};

function titleCase(value) {
  if (!value) return '';
  if (value.toLowerCase() === 'gn-math') return 'GN-Math';
  if (value.toLowerCase() === 'brogames') return 'Bro Games';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function chipGenre(label) {
  return label === 'Bro Games' ? 'brogames' : label.toLowerCase();
}

function gameUrl(game) {
  return game.direct || '/play/?id=' + encodeURIComponent(game.id);
}

function esc(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function coverFor(game) {
  if (!game.img) return '';
  const value = String(game.img);
  if (value.startsWith('/')) return value;
  if (/^https:\/\//i.test(value)) return value;
  return '/art/' + value + '.jpg';
}

function showStatus(message) {
  const node = $('catalogStatus');
  if (!node) return;
  node.textContent = message || '';
  node.hidden = !message;
}

/* ------------------------------------------------------------- navigation */

function readUrl() {
  const params = new URLSearchParams(location.search);
  state.query = (params.get('q') || '').trim();
  state.genre = (params.get('c') || '').trim().toLowerCase();
  state.favOnly = params.get('fav') === '1';
  state.sort = params.get('sort') || prefs().gameSort || '';
  if (params.has('all') && !state.genre && !state.query) state.genre = '';
}

function writeUrl(changes, { replace = false } = {}) {
  const params = new URLSearchParams(location.search);
  for (const [key, value] of Object.entries(changes)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const target = '/' + (params.toString() ? '?' + params.toString() : '');
  if (target !== location.pathname + location.search) {
    if (replace) history.replaceState(history.state, '', target);
    else history.pushState(null, '', target);
  }
}

/* ------------------------------------------------------------- site cards */

const PROXY_BASE = 'https://uv.kodev-v2.my.id/?q=';
function proxiedUrl(url) {
  try {
    const bytes = new TextEncoder().encode(url);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return PROXY_BASE + btoa(binary);
  } catch { return 'https://uv.kodev-v2.my.id/'; }
}
function openProxyTab(url) {
  const target = proxiedUrl(url);
  const tab = window.open('about:blank', '_blank');
  if (!tab) { location.href = target; return; }
  try { tab.opener = null; } catch { /* ignore */ }
  try { tab.location.replace(target); } catch { try { tab.location.href = target; } catch { /* ignore */ } }
}

function siteCard(site) {
  const link = document.createElement('a');
  link.className = 'zn-site';
  if (site.frame !== 'internal') {
    link.href = proxiedUrl(site.url);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      openProxyTab(site.url);
    });
  } else {
    link.href = '/web/?site=' + encodeURIComponent(site.id) + '&launch=1';
  }
  link.title = site.note || site.name;
  const art = document.createElement('span');
  art.className = 'zn-site-art';
  if (site.icon) {
    const img = document.createElement('img');
    img.src = site.icon;
    img.alt = '';
    img.width = 96;
    img.height = 96;
    img.loading = 'lazy';
    img.addEventListener('error', () => {
      img.remove();
      const glyph = document.createElement('span');
      glyph.className = 'zn-glyph';
      glyph.textContent = site.glyph || site.name.slice(0, 1);
      art.append(glyph);
    }, { once: true });
    art.append(img);
  } else {
    const glyph = document.createElement('span');
    glyph.className = 'zn-glyph';
    glyph.textContent = site.glyph || site.name.slice(0, 1);
    art.append(glyph);
  }
  const dot = document.createElement('span');
  dot.className = 'zn-site-dot';
  dot.dataset.frame = site.frame || 'unknown';
  dot.title = site.frame === 'internal' ? 'A ZenouMath page' : 'Opens in a new tab through the unblock proxy';
  art.append(dot);
  link.append(art);
  const name = document.createElement('span');
  name.className = 'zn-site-name';
  name.textContent = site.name;
  link.append(name);
  return link;
}

function renderSites() {
  const row = $('siteRow');
  if (!row) return;
  const featured = state.sites.filter(site => site.featured).slice(0, 4);
  row.replaceChildren(...featured.map(siteCard));
}

async function loadSites() {
  try {
    const response = await fetch('/catalog/sites.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('sites');
    const data = await response.json();
    state.sites = Array.isArray(data.sites) ? data.sites : [];
    renderSites();
    const landingSites = $('landingSites');
    if (landingSites) landingSites.textContent = state.sites.length.toLocaleString();
  } catch { /* The games catalogue still works without the website row. */ }
}

/* ------------------------------------------------------------- game cards */

function makeCard(game) {
  const wrap = document.createElement('div');
  wrap.className = 'zn-game-wrap';

  const link = document.createElement('a');
  link.className = 'zn-game';
  link.href = gameUrl(game);
  link.dataset.id = game.id;

  const art = document.createElement('span');
  art.className = 'zn-game-art';
  const source = coverFor(game);
  if (source) {
    const img = document.createElement('img');
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = source;
    img.addEventListener('error', () => {
      img.remove();
      const glyph = document.createElement('span');
      glyph.className = 'zn-glyph-art';
      glyph.textContent = game.t.slice(0, 2).toUpperCase();
      art.prepend(glyph);
    }, { once: true });
    art.append(img);
  } else {
    const glyph = document.createElement('span');
    glyph.className = 'zn-glyph-art';
    glyph.textContent = game.t.slice(0, 2).toUpperCase();
    art.append(glyph);
  }

  if (game.label) {
    const label = document.createElement('span');
    label.className = 'zn-game-badge';
    label.dataset.kind = 'label';
    label.textContent = game.label;
    art.append(label);
  } else if (game.availability === 'external') {
    const badge = document.createElement('span');
    badge.className = 'zn-game-badge';
    badge.dataset.kind = 'external';
    badge.textContent = 'External';
    art.append(badge);
  } else if (game.availability === 'unavailable') {
    const badge = document.createElement('span');
    badge.className = 'zn-game-badge';
    badge.dataset.kind = 'unavailable';
    badge.textContent = 'Source only';
    art.append(badge);
  }

  const overlay = document.createElement('span');
  overlay.className = 'zn-game-overlay';
  const play = document.createElement('span');
  play.className = 'zn-play';
  play.innerHTML = svgPaths('<path d="M8 5.5v13l11-6.5z"/>');
  play.append(document.createTextNode(game.availability === 'unavailable' ? 'Details' : 'Play'));
  overlay.append(play);
  art.append(overlay);

  const name = document.createElement('span');
  name.className = 'zn-game-name';
  name.textContent = game.t;
  link.append(art, name);

  const tools = document.createElement('div');
  tools.className = 'zn-card-tools';

  const fav = document.createElement('button');
  fav.type = 'button';
  fav.dataset.fav = game.id;
  fav.setAttribute('aria-label', 'Favourite ' + game.t);
  fav.innerHTML = svgPaths('<path d="M12 20.4 4.6 13a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9A4.6 4.6 0 1 1 19.4 13z"/>');
  const saved = favourites();
  fav.setAttribute('aria-pressed', String(saved.has(game.id)));
  fav.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    const list = favourites();
    const on = !list.has(game.id);
    if (on) list.add(game.id); else list.delete(game.id);
    try { localStorage.setItem('zenou_fav', JSON.stringify([...list])); } catch { /* quota */ }
    fav.setAttribute('aria-pressed', String(on));
    window.dispatchEvent(new CustomEvent('zenou:fav', { detail: game.id }));
  });

  const info = document.createElement('button');
  info.type = 'button';
  info.setAttribute('aria-label', 'About ' + game.t);
  info.innerHTML = svgPaths('<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4.2a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6zM10.8 10h2.4v7h-2.4z"/>');
  info.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    openDetails(game);
  });

  tools.append(fav, info);
  wrap.append(link, tools, queueButton(game, { className: 'zn-queue', notify: message => showStatus(message) }));
  return wrap;
}

function openDetails(game) {
  const dialog = $('gameDetails');
  if (!dialog) return;
  $('detailsTitle').textContent = game.t;
  $('detailsMeta').textContent = (game.cs || []).slice(0, 3).map(titleCase).join(' · ') || 'Game';
  $('detailsBody').textContent = game.note || game.dep || 'See the game page for launch options.';
  const play = $('detailsPlay');
  play.href = gameUrl(game);
  play.textContent = game.availability === 'unavailable' ? 'Open source page' : 'Play now';
  dialog.showModal();
}

/* --------------------------------------------------------------- filtering */

function reloadFavourites() {
  const saved = favourites();
  for (const button of document.querySelectorAll('[data-fav]')) {
    button.setAttribute('aria-pressed', String(saved.has(button.dataset.fav)));
  }
  if (state.favOnly) render();
}

function matches(game) {
  if (state.favOnly && !favourites().has(game.id)) return false;
  if (state.genre && !(game.cs || []).some(category => category.toLowerCase() === state.genre)) return false;
  if (state.query) {
    const words = state.query.toLowerCase().split(/\s+/).filter(Boolean);
    const haystack = (game.t + ' ' + (game.cs || []).join(' ')).toLowerCase();
    if (!words.every(word => haystack.includes(word))) return false;
  }
  return true;
}

function sortGames(list) {
  if (state.sort === 'new') list.sort((a, b) => String(b.added || '').localeCompare(String(a.added || '')));
  else if (state.sort === 'az') list.sort((a, b) => collator.compare(a.t, b.t));
  else if (state.sort === 'za') list.sort((a, b) => collator.compare(b.t, a.t));
  else if (state.sort === 'recent') {
    const order = new Map(recentIds().map((id, index) => [id, index]));
    list.sort((a, b) => (order.has(a.id) ? order.get(a.id) : 9999) - (order.has(b.id) ? order.get(b.id) : 9999));
  }
  return list;
}

function visibleGames() {
  return sortGames(state.games.filter(matches));
}

function updateHeading() {
  const browsing = !!(state.query || state.genre || state.favOnly || new URLSearchParams(location.search).has('all'));
  const title = state.query ? 'Search results'
    : state.favOnly ? 'Favourites'
      : state.genre ? titleCase(state.genre)
        : browsing ? 'All games' : 'Games';
  $('page-title').textContent = title;
  $('sectionName').textContent = state.query ? 'Results' : state.favOnly ? 'Favourites' : state.genre ? titleCase(state.genre) : 'Games';
  const count = state.load === 'ready' ? state.matched.length : null;
  $('count').textContent = state.load === 'loading' ? 'Loading games…'
    : state.load === 'error' ? 'Catalogue unavailable'
      : count.toLocaleString() + (count === 1 ? ' game' : ' games');
  $('pageInfo').textContent = count == null ? '' : count.toLocaleString() + (count === 1 ? ' game' : ' games');
  const landing = $('landing');
  if (landing) landing.hidden = browsing;
  const landingGames = $('landingGames');
  if (landingGames) landingGames.textContent = state.load === 'ready' ? state.games.length.toLocaleString() : '—';
  document.title = title === 'Games' ? 'Games · ZenouMath' : title + ' · ZenouMath';
}

function renderControls() {
  const chips = [{ label: 'All', genre: '', fav: false }, ...GENRES.map(label => ({ label, genre: chipGenre(label), fav: false })), { label: 'Favourites', genre: '', fav: true }];
  const host = $('filters');
  const signature = chips.map(c => c.label).join('|');
  if (host.dataset.signature !== signature) {
    host.dataset.signature = signature;
    host.replaceChildren(...chips.map(chip => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'zn-chip';
      button.textContent = chip.label;
      button.dataset.genre = chip.genre;
      button.dataset.fav = chip.fav ? '1' : '';
      button.addEventListener('click', () => {
        state.genre = chip.genre;
        state.favOnly = chip.fav;
        writeUrl({ all: '1', c: chip.genre, fav: chip.fav ? '1' : '', q: state.query });
        render();
      });
      return button;
    }));
  }
  for (const button of host.children) {
    const active = button.dataset.fav === '1' ? state.favOnly : !state.favOnly && button.dataset.genre === state.genre;
    button.setAttribute('aria-pressed', String(active));
  }

  const sort = $('sort');
  const value = ['new', 'recent', 'az', 'za'].includes(state.sort) ? state.sort : '';
  if (sort.value !== value) sort.value = value;

  for (const button of $('layoutSwitch').querySelectorAll('[data-layout]')) {
    button.setAttribute('aria-pressed', String(button.dataset.layout === state.layout));
  }
}

function paint(reset = true) {
  state.matched = visibleGames();
  if (reset) {
    state.shown = 0;
    $('grid').replaceChildren();
  }
  const grid = $('grid');
  const batch = state.matched.slice(state.shown, state.shown + PAGE_SIZE);
  const fragment = document.createDocumentFragment();
  batch.forEach(game => fragment.append(makeCard(game)));
  grid.append(fragment);
  state.shown += batch.length;
  $('more').hidden = state.shown >= state.matched.length;
  $('more').textContent = state.shown < state.matched.length
    ? `Show more (${(state.matched.length - state.shown).toLocaleString()} left)`
    : 'Show more';
  $('empty').hidden = state.load !== 'ready' || state.matched.length > 0;
  $('emptyMessage').textContent = state.load === 'error'
    ? 'The game catalogue could not load. Refresh the page to try again.'
    : state.favOnly ? 'No favourites yet. Tap the heart on a game to save it here.'
      : 'No games match that search.';
  $('emptyClear').hidden = state.load === 'error';
  updateHeading();
  renderControls();
  if (state.load === 'error') showStatus('The game catalogue could not load.');
}

function render() {
  const params = new URLSearchParams(location.search);
  state.query = (params.get('q') || '').trim();
  state.genre = (params.get('c') || '').trim().toLowerCase();
  state.favOnly = params.get('fav') === '1';
  if (params.has('sort')) state.sort = params.get('sort') || '';
  const input = $('query');
  if (input.value !== state.query) input.value = state.query;

  // A category may arrive from a game page that is not in the short chip list.
  if (state.genre && !GENRES.some(label => chipGenre(label) === state.genre)) {
    GENRES.push(titleCase(state.genre));
  }
  paint(true);
}

function renderRecent() {
  const section = $('recentSection');
  const grid = $('recentGrid');
  if (!section || !grid) return;
  const byId = new Map(state.games.map(game => [game.id, game]));
  const recent = recentIds().map(id => byId.get(id)).filter(Boolean).slice(0, 6);
  grid.replaceChildren(...recent.map(makeCard));
  section.hidden = recent.length === 0;
}

/* ------------------------------------------------------------------- boot */

function bootLayout() {
  const saved = prefs().gameLayout;
  if (['compact', 'standard', 'large', 'list'].includes(saved)) state.layout = saved;
  document.documentElement.dataset.gameLayout = state.layout;
  const host = $('layoutSwitch');
  host.replaceChildren(...LAYOUTS.map(([id, label, paths]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.layout = id;
    button.title = label;
    button.setAttribute('aria-label', label);
    button.innerHTML = svgPaths(paths);
    button.addEventListener('click', () => {
      state.layout = id;
      document.documentElement.dataset.gameLayout = id;
      savePref('gameLayout', id);
      renderControls();
    });
    return button;
  }));
  renderControls();
}

function bootEvents() {
  $('query').addEventListener('input', event => {
    state.query = event.target.value.trim();
    writeUrl({ q: state.query }, { replace: true });
    paint(true);
  });
  $('query').addEventListener('keydown', event => {
    if (event.key === 'Escape' && event.target.value) {
      event.target.value = '';
      state.query = '';
      writeUrl({ q: '' }, { replace: true });
      paint(true);
    }
  });
  $('sort').addEventListener('change', event => {
    state.sort = event.target.value;
    savePref('gameSort', state.sort || 'featured');
    writeUrl({ sort: state.sort }, { replace: true });
    paint(true);
  });
  $('more').addEventListener('click', () => paint(false));
  $('emptyClear').addEventListener('click', () => {
    state.query = '';
    state.genre = '';
    state.favOnly = false;
    writeUrl({ q: '', c: '', fav: '' });
    $('query').value = '';
    paint(true);
  });
  $('shuffle').addEventListener('click', () => {
    const pool = (state.matched.length ? state.matched : state.games).filter(game => !game.availability);
    if (pool.length) location.assign(gameUrl(pool[Math.floor(Math.random() * pool.length)]));
  });
  $('gameDetails').addEventListener('close', () => {});
  window.addEventListener('popstate', render);
  window.addEventListener('pageshow', event => {
    if (event.persisted && state.load === 'ready') renderRecent();
  });
  window.addEventListener('zenou:fav', reloadFavourites);
  window.addEventListener('zenou:recent-cleared', renderRecent);
  document.addEventListener('keydown', event => {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target.closest('input, textarea, select, [contenteditable]') || document.querySelector('#consentGate, dialog[open]')) return;
    event.preventDefault();
    $('query').focus();
  });
  watchQueue(() => paintQueue());
}

async function boot() {
  bootLayout();
  bootEvents();
  readUrl();
  updateHeading();
  loadSites();
  paintQueue();

  try {
    const response = await fetch('/catalog/games.json?v=2026-11-28', { cache: 'no-cache' });
    if (!response.ok) throw new Error('catalogue');
    const data = await response.json();
    if (!Array.isArray(data.games)) throw new Error('catalogue');
    state.games = data.games.map(game => ({
      ...game,
      searchText: [game.t, ...(game.cs || [])].join(' ').toLowerCase(),
    }));
    state.load = 'ready';
    const stamp = String(data.v || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    $('updated').textContent = 'Last updated ' + (stamp
      ? new Date(+stamp[1], +stamp[2] - 1, +stamp[3]).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'recently');
    renderRecent();
    render();
  } catch {
    state.load = 'error';
    state.games = [];
    render();
  }
}

boot();
