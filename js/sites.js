/* ZenouMath website directory.
 *
 * catalog/sites.json is the only list. The page can search it, save entries,
 * remember recents and open a site in the viewer or a normal tab. Framing is a
 * decision made by the other server, so a blocked host is reported honestly
 * and never routed around.
 */
'use strict';

const $ = id => document.getElementById(id);
const FAV_KEY = 'zenou_directory_favourites';
const RECENT_KEY = 'zenou_sites_recent';
const MAX_RECENT = 8;
const PROXY_BASE = 'https://uv.kodev-v2.my.id/?q=';

function proxiedUrl(url) {
  try {
    const bytes = new TextEncoder().encode(url);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return PROXY_BASE + btoa(binary);
  } catch { return 'https://uv.kodev-v2.my.id/'; }
}

/* Open a blank tab first, then send it to the destination. If the browser
 * blocks the tab, use the unblock proxy in this tab (the user-requested
 * fallback). The proxy is a third-party service, not a ZenouMath feature. */
function openExternal(url, { viaProxy = false } = {}) {
  const target = viaProxy ? proxiedUrl(url) : url;
  const tab = window.open('about:blank', '_blank');
  if (!tab) {
    status('Your browser blocked the new tab. Opening through the third-party unblock proxy here.');
    location.href = proxiedUrl(url);
    return false;
  }
  try { tab.opener = null; } catch { /* ignore */ }
  try { tab.location.replace(target); } catch { try { tab.location.href = target; } catch { /* ignore */ } }
  return true;
}

const state = {
  sites: [],
  filter: '',
  query: '',
  favOnly: false,
  view: 'grid',
  launch: 'viewer',
  current: null,
  timer: 0,
  titleTimer: 0,
};

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}
function prefs() {
  const value = read('zenou_prefs', {});
  return value && typeof value === 'object' ? value : {};
}
function savePref(key, value) {
  const next = { ...prefs(), [key]: value };
  try { localStorage.setItem('zenou_prefs', JSON.stringify(next)); } catch { /* quota */ }
  if (typeof window.ZenouSettings?.setPref === 'function') window.ZenouSettings.setPref(key, value);
}
function favourites() {
  const list = read(FAV_KEY, []);
  return new Set(Array.isArray(list) ? list.filter(value => typeof value === 'string') : []);
}
function saveFavourites(set) {
  write(FAV_KEY, [...set]);
}

/* The old directory stored recent pages as {url,label}. Keep the history that
 * already exists by matching those URLs to the catalogue where possible. */
function readRecent() {
  const saved = read(RECENT_KEY, null);
  if (Array.isArray(saved)) return saved.filter(value => typeof value === 'string').slice(0, MAX_RECENT);
  const legacy = read('zenou_web_recent', []);
  if (!Array.isArray(legacy)) return [];
  const byUrl = new Map(state.sites.map(site => [site.url.replace(/\/$/, ''), site.id]));
  const ids = [];
  for (const row of legacy) {
    if (!row || typeof row.url !== 'string') continue;
    const id = byUrl.get(row.url.replace(/\/$/, ''));
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids.slice(0, MAX_RECENT);
}
function pushRecent(id) {
  const list = readRecent().filter(value => value !== id);
  list.unshift(id);
  write(RECENT_KEY, list.slice(0, MAX_RECENT));
  paintRecent();
}

function esc(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function status(text) {
  $('siteStatus').textContent = text || '';
  $('siteStatus').hidden = !text;
}

/* ---------------------------------------------------------------- the cards */

function iconNode(site) {
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
  dot.title = site.frame === 'denied' ? 'Framing blocked; opens in a new tab'
    : site.frame === 'internal' ? 'A ZenouMath page'
      : site.frame === 'allowed' ? 'Allowed in the viewer'
        : 'Viewer availability not confirmed';
  art.append(dot);
  return art;
}

function siteCard(site) {
  const wrap = document.createElement('div');
  wrap.className = 'zn-dir-card';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'zn-site';
  button.dataset.site = site.id;
  button.title = site.note || site.name;
  button.append(iconNode(site));

  const name = document.createElement('span');
  name.className = 'zn-site-name';
  name.textContent = site.name;
  button.append(name);

  const note = document.createElement('span');
  note.className = 'zn-site-note';
  note.textContent = site.note || '';
  button.append(note);

  button.addEventListener('click', () => launch(site));

  const fav = document.createElement('button');
  fav.type = 'button';
  fav.className = 'zn-dir-fav';
  fav.dataset.fav = site.id;
  fav.setAttribute('aria-label', 'Favourite ' + site.name);
  fav.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 20.4 4.6 13a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9A4.6 4.6 0 1 1 19.4 13z"/></svg>';
  const saved = favourites();
  fav.setAttribute('aria-pressed', String(saved.has(site.id)));
  fav.title = saved.has(site.id) ? 'Remove from favourites' : 'Save to favourites';
  fav.addEventListener('click', () => {
    const list = favourites();
    const on = !list.has(site.id);
    if (on) list.add(site.id); else list.delete(site.id);
    saveFavourites(list);
    fav.setAttribute('aria-pressed', String(on));
    fav.title = on ? 'Remove from favourites' : 'Save to favourites';
    if (state.favOnly) paint();
  });

  wrap.append(button, fav);
  return wrap;
}

/* -------------------------------------------------------------- the filters */

const FILTERS = [
  ['', 'All'],
  ['portal', 'Game portals'],
  ['study', 'Study'],
  ['media', 'Media'],
  ['app', 'Apps'],
  ['tool', 'Tools'],
];

function paintFilters() {
  const host = $('siteFilters');
  const signature = FILTERS.map(row => row[0]).join('|') + '|fav';
  if (host.dataset.signature !== signature) {
    host.dataset.signature = signature;
    host.replaceChildren(...FILTERS.map(([value, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'zn-chip';
      button.textContent = label;
      button.dataset.filter = value;
      button.addEventListener('click', () => {
        state.filter = value;
        state.favOnly = false;
        paint();
      });
      return button;
    }));
    const fav = document.createElement('button');
    fav.type = 'button';
    fav.className = 'zn-chip';
    fav.textContent = 'Favourites';
    fav.dataset.filter = 'saved';
    fav.addEventListener('click', () => {
      state.favOnly = true;
      state.filter = '';
      paint();
    });
    host.append(fav);
  }
  for (const button of host.children) {
    const active = button.dataset.filter === 'saved' ? state.favOnly : !state.favOnly && button.dataset.filter === state.filter;
    button.setAttribute('aria-pressed', String(active));
  }
}

function matches(site) {
  if (state.favOnly && !favourites().has(site.id)) return false;
  if (state.filter && site.kind !== state.filter) return false;
  if (state.query) {
    const text = (site.name + ' ' + (site.note || '') + ' ' + site.kind).toLowerCase();
    if (!state.query.toLowerCase().split(/\s+/).every(word => text.includes(word))) return false;
  }
  return true;
}

function paint() {
  const list = state.sites.filter(matches);
  const grid = $('siteGrid');
  grid.dataset.view = state.view;
  grid.replaceChildren(...list.map(siteCard));
  $('siteEmpty').hidden = list.length > 0 || state.sites.length === 0;
  $('siteEmpty').querySelector('p').textContent = state.favOnly
    ? 'No website favourites yet. The heart on each card saves one.'
    : 'No websites match that search.';
  $('siteCount').textContent = state.sites.length ? `${list.length.toLocaleString()} of ${state.sites.length.toLocaleString()} websites` : 'Loading…';
  $('viewerTitle').setAttribute('aria-label', 'Website viewer');
  paintFilters();
  for (const button of $('viewSwitch').children) {
    button.setAttribute('aria-pressed', String(button.dataset.view === state.view));
  }
  status(list.length ? '' : '');
}

function paintRecent() {
  const host = $('recentWrap');
  const ids = readRecent();
  const byId = new Map(state.sites.map(site => [site.id, site]));
  const items = ids.map(id => byId.get(id)).filter(Boolean);
  host.hidden = items.length === 0;
  host.replaceChildren(...items.map(site => {
    const button = document.createElement('button');
    button.type = 'button';
    button.title = 'Open ' + site.name;
    if (site.icon) {
      const img = document.createElement('img');
      img.src = site.icon;
      img.alt = '';
      img.loading = 'lazy';
      img.addEventListener('error', () => img.remove(), { once: true });
      button.append(img);
    }
    button.append(document.createTextNode(site.name));
    button.addEventListener('click', () => launch(site));
    return button;
  }));
}

/* ---------------------------------------------------------------- launching */

function record(site) {
  pushRecent(site.id);
  try {
    const list = read('zenou_recent_sites_meta', {});
    list[site.id] = Date.now();
    write('zenou_recent_sites_meta', list);
  } catch { /* not important */ }
}

function launch(site, { tab = false } = {}) {
  if (!site) return;
  record(site);
  if (site.frame === 'internal') { location.href = site.url; return; }
  if (tab || state.launch === 'tab') {
    const viaProxy = site.frame === 'denied';
    openExternal(site.url, { viaProxy });
    status(viaProxy
      ? 'Opened ' + site.name + ' through the unblock proxy in a new tab'
      : 'Opened ' + site.name + ' in a new tab');
    return;
  }
  openViewer(site);
}

/* ------------------------------------------------------------------ viewer */

function clearTimer() {
  clearTimeout(state.timer);
  state.timer = 0;
}

function clearTitleTimer() {
  clearInterval(state.titleTimer);
  state.titleTimer = 0;
}

function directoryTitle() {
  return state.filter === 'app' ? 'Apps · ZenouMath' : 'Websites · ZenouMath';
}

function syncDirectoryTitle() {
  if (!state.current) document.title = directoryTitle();
}

/* Only same-origin frames expose their document title. Cross-origin hosts keep
 * the catalogue title, which is the honest fallback rather than a guess. */
function syncFrameTitle() {
  const site = state.current;
  const frame = $('siteFrame');
  if (!site || !frame || !frame.getAttribute('src') || frame.hidden) return;
  try {
    const title = frame.contentDocument?.title?.trim();
    if (title) document.title = title + ' · ZenouMath';
  } catch { /* cross-origin: keep the site title */ }
}

function viewerMeta(site) {
  $('viewerName').textContent = site.name;
  const icon = $('viewerIcon');
  if (site.icon) {
    icon.src = site.icon;
    icon.hidden = false;
  } else {
    icon.removeAttribute('src');
    icon.hidden = true;
  }
  $('viewerOpen').href = site.frame === 'denied' ? proxiedUrl(site.url) : site.url;
  $('viewerDirect').href = site.frame === 'denied' ? proxiedUrl(site.url) : site.url;
  $('viewerProxy').href = proxiedUrl(site.url);
  document.title = site.name + ' · ZenouMath';
  clearTitleTimer();
  state.titleTimer = setInterval(syncFrameTitle, 1200);
}

function showBlocked(title, text, { tryAgain = true } = {}) {
  clearTimer();
  $('siteFrame').hidden = true;
  $('viewerLoading').hidden = true;
  $('viewerBlocked').hidden = false;
  $('viewerBlockedTitle').textContent = title;
  $('viewerBlockedText').textContent = text;
  $('viewerTry').hidden = !tryAgain;
  const site = state.current;
  if (site) {
    $('viewerBlockedOpen').href = site.url;
    $('viewerProxy').href = proxiedUrl(site.url);
    $('viewerStatus').textContent = title;
  }
}

function loadFrame() {
  const site = state.current;
  if (!site) return;
  clearTimer();
  const frame = $('siteFrame');
  $('viewerBlocked').hidden = true;
  $('viewerLoading').hidden = false;
  $('viewerLoadingTitle').textContent = 'Opening ' + site.name + '…';
  $('viewerStatus').textContent = 'Loading ' + site.name + '…';
  frame.hidden = false;
  frame.src = site.url;

  state.timer = setTimeout(() => {
    if (!state.current) return;
    showBlocked(
      'The site did not finish loading',
      site.name + ' did not answer in time. It may refuse framing, be unavailable, or be blocked by this network. Open it in a normal tab to check.',
    );
  }, 9000);
}

function openViewer(site) {
  const dialog = $('siteViewer');
  state.current = site;
  viewerMeta(site);
  $('viewerTry').hidden = false;
  $('viewerReload').disabled = false;
  if (!dialog.open) dialog.showModal();
  const frame = $('siteFrame');
  frame.removeAttribute('src');
  frame.hidden = true;

  if (site.frame === 'denied') {
    $('viewerLoading').hidden = true;
    $('siteFrame').hidden = true;
    $('viewerReload').disabled = true;
    showBlocked(
      site.name + ' does not allow framing',
      'Its server sends an X-Frame-Options or frame-ancestors policy, so this page cannot appear inside ZenouMath. That is the site owner’s decision. Open it directly in a normal tab, or try the third-party unblock proxy below — the proxy is not operated by ZenouMath and its availability is outside our control.',
      { tryAgain: false },
    );
    return;
  }

  if (site.frame === 'internal') {
    $('viewerLoading').hidden = true;
    showBlocked(site.name + ' is a ZenouMath page', 'This entry opens as a normal ZenouMath page.', { tryAgain: false });
    return;
  }

  loadFrame();
}

function closeViewer() {
  clearTimer();
  const dialog = $('siteViewer');
  const frame = $('siteFrame');
  frame.removeAttribute('src');
  frame.hidden = true;
  if (dialog.open) dialog.close();
  state.current = null;
  $('viewerLoading').hidden = false;
  $('viewerBlocked').hidden = true;
  clearTitleTimer();
  syncDirectoryTitle();
}

function setupViewer() {
  const dialog = $('siteViewer');
  const frame = $('siteFrame');
  const openLink = (id, forceProxy = false, autoProxy = true) => {
    const link = $(id);
    if (!link) return;
    link.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (!state.current) return;
      openExternal(state.current.url, {
        viaProxy: forceProxy || (autoProxy && state.current.frame === 'denied'),
      });
    });
  };
  openLink('viewerOpen');
  openLink('viewerBlockedOpen', false, false);
  openLink('viewerDirect');
  openLink('viewerProxy', true, false);
  $('viewerClose').addEventListener('click', closeViewer);
  $('viewerBack').addEventListener('click', () => {
    closeViewer();
    $('siteSearch').focus();
  });
  $('viewerReload').addEventListener('click', () => {
    if (!state.current || state.current.frame === 'denied') return;
    loadFrame();
  });
  $('viewerTry').addEventListener('click', () => {
    if (state.current) loadFrame();
  });
  $('viewerFull').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (dialog.requestFullscreen) await dialog.requestFullscreen();
      else status('Fullscreen is not available in this browser.');
    } catch {
      status('The browser refused the fullscreen request.');
    }
  });
  document.addEventListener('fullscreenchange', () => {
    const on = !!document.fullscreenElement;
    $('viewerFull').setAttribute('aria-pressed', String(on));
    $('viewerFull').setAttribute('aria-label', on ? 'Exit fullscreen' : 'Fullscreen');
  });

  frame.addEventListener('load', () => {
    if (!state.current || state.current.frame === 'denied') return;
    if (!frame.getAttribute('src')) return;
    clearTimer();
    $('viewerLoading').hidden = true;
    $('viewerBlocked').hidden = true;
    frame.hidden = false;
    $('viewerStatus').textContent = state.current.name + ' · loaded in the viewer';
    syncFrameTitle();
  });
  frame.addEventListener('error', () => {
    if (!state.current) return;
    showBlocked('This site could not be loaded', 'The address did not respond. Open it in a normal tab to check whether the host is available.');
  });
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    closeViewer();
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog) closeViewer();
  });
  window.addEventListener('pagehide', () => {
    if (state.current) {
      clearTimer();
      clearTitleTimer();
      frame.removeAttribute('src');
    }
  });
}

/* ------------------------------------------------------------------- boot */

async function boot() {
  state.view = prefs().siteView === 'list' ? 'list' : 'grid';
  state.launch = prefs().webLaunch === 'tab' ? 'tab' : 'viewer';
  $('launchPref').value = state.launch;
  $('siteGrid').dataset.view = state.view;

  $('siteSearch').addEventListener('input', event => {
    state.query = event.target.value.trim();
    paint();
  });
  $('siteSearch').addEventListener('keydown', event => {
    if (event.key === 'Escape' && event.target.value) {
      event.target.value = '';
      state.query = '';
      paint();
    }
  });
  $('launchPref').addEventListener('change', event => {
    state.launch = event.target.value;
    savePref('webLaunch', state.launch);
    status(state.launch === 'tab' ? 'Websites will open in a new tab' : 'Websites will open in the viewer where permitted');
  });
  $('viewSwitch').addEventListener('click', event => {
    const button = event.target.closest('[data-view]');
    if (!button) return;
    state.view = button.dataset.view;
    savePref('siteView', state.view);
    paint();
  });
  $('siteClear').addEventListener('click', () => {
    state.query = '';
    state.filter = '';
    state.favOnly = false;
    $('siteSearch').value = '';
    paint();
  });
  document.querySelector('[data-open-shortcuts]').addEventListener('click', () => {
    window.ZenouSettings?.open?.();
  });
  document.addEventListener('keydown', event => {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target.closest('input, textarea, select, [contenteditable]') || document.querySelector('#consentGate, dialog[open]')) return;
    event.preventDefault();
    $('siteSearch').focus();
  });
  window.addEventListener('zenou:prefs', event => {
    if (!event.detail) return;
    if (event.detail.webLaunch) {
      state.launch = event.detail.webLaunch === 'tab' ? 'tab' : 'viewer';
      $('launchPref').value = state.launch;
    }
    if (event.detail.siteView) {
      state.view = event.detail.siteView === 'list' ? 'list' : 'grid';
      paint();
    }
  });

  setupViewer();

  const params = new URLSearchParams(location.search);
  if (params.get('kind') === 'app') state.filter = 'app';
  if (params.get('fav') === '1') state.favOnly = true;
  syncDirectoryTitle();

  try {
    const response = await fetch('/catalog/sites.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('sites');
    const data = await response.json();
    state.sites = Array.isArray(data.sites) ? data.sites : [];
    $('framingNote').textContent = `${state.sites.filter(site => site.frame === 'denied').length} open in a normal tab`;
    paint();
    paintRecent();

    const requested = params.get('site');
    if (requested) {
      const site = state.sites.find(item => item.id === requested);
      if (site) {
        if (params.get('launch') === '1') launch(site);
        else { state.query = site.name; $('siteSearch').value = site.name; paint(); }
      }
    }
  } catch {
    $('siteCount').textContent = 'Directory unavailable';
    $('siteEmpty').hidden = false;
    $('siteEmpty').querySelector('p').textContent = 'The website directory could not load. Refresh to try again.';
    status('The website directory could not load.');
  }
}

boot();
