import { artwork, button, el, icon, iconButton, read, write } from './shared.js';

const featured = ['lo-hollow-knight-silksong', 'lo-terraria', 'lo-2048', 'polytrack'];
const views = [ ['home', 'Home', 'discover'], ['library', 'Library', 'library'], ['discover', 'Discover', 'spark'], ['favorites', 'Favorites', 'heart'], ['recent', 'Recently played', 'reload'], ['added', 'Recently added', 'star'] ];
const PAGE = 28;
let pending;
function loadCatalog() {
  pending ||= fetch('/catalog/games.json').then(response => {
    if (!response.ok) throw new Error('Zteam couldn’t reach the game catalog.');
    return response.json();
  }).then(data => {
    if (!Array.isArray(data.games)) throw new Error('The game catalog is unavailable.');
    return data.games;
  }).catch(error => { pending = null; throw error; });
  return pending;
}

export async function mount(root, { play, notify, signal }) {
  const [games, manifest] = await Promise.all([
    loadCatalog(),
    fetch('/catalog/manifest.json').then(response => response.ok ? response.json() : {}).catch(() => ({})),
  ]);
  const imported = manifest.gnMath?.imported ? games.filter(game => game.p === 'gn-math') : [];
  if (signal.aborted) return;
  const byId = new Map(games.map(game => [game.id, game]));
  const known = featured.map(id => byId.get(id)).filter(Boolean);
  const categories = [...new Set(games.flatMap(game => game.cs || []))].sort();
  const sidebar = el('nav', 'zteam-side');
  sidebar.setAttribute('aria-label', 'Zteam sections');
  const body = el('div', 'zteam-body');
  const header = el('div', 'zteam-head');
  const title = el('h2');
  const search = el('input');
  search.type = 'search';
  search.placeholder = 'Search games…';
  search.setAttribute('aria-label', 'Search games');
  header.append(title, search);
  const filters = el('div', 'zteam-filters');
  const category = el('select');
  category.setAttribute('aria-label', 'Game category');
  category.append(new Option('All categories', ''), ...categories.map(name => new Option(name, name)));
  const sort = el('select');
  sort.setAttribute('aria-label', 'Sort games');
  sort.append(new Option('Catalog order', ''), new Option('A to Z', 'asc'), new Option('Z to A', 'desc'));
  const count = el('span', 'result-count');
  count.setAttribute('role', 'status');
  filters.append(category, sort, count);
  const content = el('div', 'zteam-scroll');
  body.append(header, filters, content);
  const layout = el('div', 'zteam-view');
  layout.append(sidebar, body);
  const detail = el('dialog', 'os-dialog game-detail');
  root.replaceChildren(layout, detail);
  root.classList.add('zteam-app');
  let view = 'home';
  let limit = PAGE;
  let selected = null;
  let queryTimer;
  let resultKey = '';
  let currentList = [];
  const buttons = new Map();
  for (const [id, label, symbol] of views) {
    if (id === 'added' && !imported.length) continue;
    const item = button('', () => { view = id; selected = null; search.value = ''; category.value = ''; sort.value = ''; limit = PAGE; render(); }, 'zteam-tab');
    item.append(icon(symbol), el('span', '', label));
    buttons.set(id, item);
    sidebar.append(item);
  }

  const favorites = () => new Set(read('zenou_fav', []));
  const recent = () => read('zenou_recent', []).map(record => byId.get(record.id)).filter(Boolean);
  function toggleFavorite(game) {
    const ids = favorites();
    if (ids.has(game.id)) ids.delete(game.id); else ids.add(game.id);
    if (!write('zenou_fav', [...ids])) { notify('Could not save this favorite.'); return; }
    notify(ids.has(game.id) ? `${game.t} added to favorites.` : `${game.t} removed from favorites.`);
    repaintFavorites(ids);
    if (view === 'favorites') render();
  }
  function repaintFavorites(ids = favorites()) {
    for (const node of root.querySelectorAll('[data-favorite]')) {
      const on = ids.has(node.dataset.favorite);
      node.setAttribute('aria-pressed', String(on));
      const game = byId.get(node.dataset.favorite);
      node.setAttribute('aria-label', `${on ? 'Remove' : 'Add'} ${game.t} ${on ? 'from' : 'to'} favorites`);
      node.title = node.getAttribute('aria-label');
    }
  }
  function cover(game, name = 'game-art') {
    const host = el('div', name);
    const initials = el('span', '', game.t.slice(0, 2).toUpperCase());
    initials.setAttribute('aria-hidden', 'true');
    host.append(initials);
    host.append(artwork(game.img));
    return host;
  }
  function card(game) {
    const node = el('article', 'game-card');
    const pick = button('', () => openDetail(game), 'game-pick');
    pick.append(cover(game), el('strong', '', game.t), el('small', '', game.cs?.[0] || 'Game'));
    const save = iconButton('Add to favorites', 'heart', () => toggleFavorite(game));
    save.dataset.favorite = game.id;
    node.append(pick, save);
    return node;
  }
  function grid(list) {
    const row = el('div', 'game-grid');
    row.append(...list.map(card));
    return row;
  }
  function openDetail(game) {
    const head = el('header');
    head.append(el('h2', '', game.t), iconButton('Close game details', 'close', () => detail.close()));
    const info = el('div', 'detail-body');
    info.append(cover(game), el('p', '', (game.cs || []).join(' · ')));
    if (game.note) info.append(el('p', '', game.note));
    if (game.availability && game.dep) info.append(el('p', '', game.dep));
    const actions = el('div', 'button-row');
    const playLabel = game.availability === 'unavailable' ? 'Open game details' : game.availability === 'external' ? 'Open player options' : 'Play game';
    const launch = button(playLabel, () => { detail.close(); play(game); }, 'os-button primary');
    const save = iconButton('Add to favorites', 'heart', () => toggleFavorite(game));
    save.dataset.favorite = game.id;
    actions.append(launch, save);
    info.append(actions);
    detail.replaceChildren(head, info);
    repaintFavorites();
    detail.showModal();
  }
  function section(label, list) {
    const node = el('section', 'game-shelf');
    node.append(el('h3', '', label), grid(list));
    return node;
  }

  function home() {
    const game = selected || known[0] || games[0];
    if (!game) return;
    const hero = el('section', 'zteam-hero');
    const backdrop = game.id === 'lo-hollow-knight-silksong' ? '/art/silksong-library_hero.jpg' : game.id === 'lo-terraria' ? '/art/terraria-library_hero.jpg' : game.img;
    hero.append(artwork(backdrop, 'zteam-hero-art'));
    const info = el('div', 'zteam-hero-info');
    info.append(el('span', 'featured-label', 'Featured game'), el('h3', '', game.t));
    if (game.note) info.append(el('p', '', game.note));
    const actions = el('div', 'button-row');
    const launch = button('Play game', () => play(game), 'os-button primary');
    launch.prepend(icon('play'));
    actions.append(launch, button('Details', () => openDetail(game)));
    info.append(actions);
    hero.append(info);
    const picks = el('div', 'zteam-picks');
    for (const item of known) {
      const pick = button(item.t, () => { selected = item; render(); }, 'feature-pick');
      pick.setAttribute('aria-pressed', String(item === game));
      picks.append(pick);
    }
    content.append(hero, picks);
    const played = recent();
    content.append(section(played.length ? 'Continue playing' : 'Explore the library', played.length ? played.slice(0, 8) : known));
  }

  function render() {
    const phrase = search.value.trim().toLowerCase();
    const target = phrase ? 'search' : view;
    for (const [id, node] of buttons) node.setAttribute('aria-current', id === target ? 'page' : 'false');
    title.textContent = target === 'home' ? 'Game library' : target === 'search' ? 'Search results' : views.find(([id]) => id === target)[1];
    filters.hidden = target === 'home';
    content.replaceChildren();
    if (target === 'home') { home(); repaintFavorites(); return; }
    const key = [target, phrase, category.value, sort.value, [...favorites()].join(','), recent().map(game => game.id).join(',')].join('|');
    if (key !== resultKey) {
      const categoryValue = category.value;
      const pool = target === 'favorites' ? [...favorites()].map(id => byId.get(id)).filter(Boolean)
        : target === 'recent' ? recent() : target === 'added' ? imported : target === 'discover' ? games.filter(game => !game.availability) : games;
      currentList = pool.filter(game => (!categoryValue || game.cs?.includes(categoryValue)) && (!phrase || game.t.toLowerCase().includes(phrase)));
      if (sort.value) currentList.sort((a, b) => a.t.localeCompare(b.t) * (sort.value === 'desc' ? -1 : 1));
      resultKey = key;
    }
    count.textContent = target === 'added' ? `${currentList.length.toLocaleString()} games · ${manifest.gnMath.imported}` : `${currentList.length.toLocaleString()} games`;
    if (!currentList.length) content.append(el('p', 'app-message', target === 'favorites' ? 'Add a favorite from any game card.' : target === 'recent' ? 'Games you play will appear here.' : 'No games match these filters.'));
    else content.append(grid(currentList.slice(0, limit)));
    if (currentList.length > limit) content.append(button('Load more games', () => { limit += PAGE; render(); }, 'os-button load-more'));
    repaintFavorites();
  }
  search.addEventListener('input', () => { clearTimeout(queryTimer); queryTimer = setTimeout(() => { limit = PAGE; render(); }, 120); });
  for (const select of [category, sort]) select.addEventListener('change', () => { limit = PAGE; render(); });
  window.addEventListener('storage', event => {
    if (event.key === 'zenou_fav' || event.key === 'zenou_recent') render();
  }, { signal });
  window.addEventListener('focus', () => { if (view === 'recent' || view === 'home') render(); else repaintFavorites(); }, { signal });
  signal.addEventListener('abort', () => clearTimeout(queryTimer), { once: true });
  render();
}
