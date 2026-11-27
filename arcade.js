import { gamePortals } from '/catalog/portals.js';
import { paintQueue, queueButton, watchQueue } from '/js/play-later.js';

const $ = id => document.getElementById(id);



function icon(name) {
  const symbol = name === 'upRight' ? 'external' : name;
  return '<svg aria-hidden="true" viewBox="0 0 24 24"><use href="/assets/ui-icons.svg#' + symbol + '"/></svg>';
}

document.querySelectorAll('[data-icon]').forEach(element => {
  element.innerHTML = icon(element.dataset.icon);
});

const genres = ['Action', 'Racing', 'Sports', 'Puzzle', 'Adventure', 'Arcade', 'GN-Math'];
const covers = {
  'lo-among-us': 'among',
  'lo-geometry-dash': 'geometry',
  'lo-terraria': 'terraria',
  'lo-clustertruck': 'cluster',
  'lo-granny': 'granny',
  'lo-hollow-knight-silksong': 'silksong',
};
const slides = [
  {
    id: 'lo-hollow-knight-silksong',
    title: 'Hollow Knight: Silksong',
    subtitle: 'Metroidvania',
    lines: ['Hollow Knight:', 'Silksong'],
    description: 'Explore a haunted kingdom of silk and song.',
    image: 'silksong-library_hero',
    cover: 'silksong-header',
  },
  {
    id: 'lo-terraria',
    title: 'Terraria',
    subtitle: 'Sandbox',
    description: 'Dig, fight and build your way through a pixel world.',
    image: 'terraria-library_hero',
    cover: 'terraria-header',
  },
  {
    id: 'lo-2048',
    title: '2048',
    subtitle: 'Puzzle',
    description: 'Slide matching tiles together and build your way to 2048.',
    image: '/assets/thumbs/2048.svg',
    cover: '/assets/thumbs/2048.svg',
  },
];
const picks = ['polytrack', 'lo-geometry-dash', 'lo-terraria', 'lo-crossy-road'];
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
const pageSize = 32;
let activeSlide = 0;
let games = [];
let matched = [];
let shown = 0;
let loadState = 'loading';

function gameUrl(game) {
  return game.direct || '/play/?id=' + encodeURIComponent(game.id);
}

function titleCase(value) {
  if (value === 'gn-math') return 'GN-Math';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function artwork(path) {
  return path.startsWith('/') ? path : '/art/' + path + '.jpg';
}

function showSlide(index) {
  activeSlide = (index + slides.length) % slides.length;
  const slide = slides[activeSlide];
  $('heroTitle').replaceChildren(...(slide.lines
    ? [slide.lines[0], document.createElement('br'), slide.lines[1]]
    : [slide.title]));
  $('heroText').textContent = slide.description;
  $('heroPlay').href = gameUrl(slide);
  $('hero-image').src = artwork(slide.image);
  $('hero').classList.toggle('hero-tile', slide.id === 'lo-2048');
  $('slide-count').textContent = [activeSlide + 1, slides.length]
    .map(value => String(value).padStart(2, '0')).join(' / ');
  Array.from($('spotlight-menu').children).forEach((button, position) => {
    button.setAttribute('aria-pressed', String(position === activeSlide));
  });
}

slides.forEach((slide, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'spotlight-option';
  button.innerHTML = '<img alt="" width="144" height="96"><span><strong></strong><small></small></span>' + icon('right');
  button.querySelector('img').src = artwork(slide.cover);
  button.querySelector('strong').textContent = slide.title;
  button.querySelector('small').textContent = slide.subtitle;
  button.addEventListener('click', () => showSlide(index));
  $('spotlight-menu').append(button);
});
$('next').addEventListener('click', () => showSlide(activeSlide + 1));
$('prev').addEventListener('click', () => showSlide(activeSlide - 1));
showSlide(0);

function card(game) {
  const link = document.createElement('a');
  link.href = gameUrl(game);
  link.className = 'card';
  link.innerHTML = '<div class="art"><span class="fallback" aria-hidden="true" hidden></span><img alt="" loading="lazy"></div>'
    + '<div class="card-copy"><div><h3></h3><small></small></div><span class="card-arrow">' + icon('upRight') + '</span></div>';

  const image = link.querySelector('img');
  const fallback = link.querySelector('.fallback');
  fallback.textContent = game.t.slice(0, 2).toUpperCase();
  if (game.id === 'polytrack') {
    link.classList.add('polytrack-card');
    fallback.textContent = 'POLYTRACK';
  }
  const showFallback = () => {
    image.hidden = true;
    fallback.hidden = false;
  };
  const cover = covers[game.id];
  const source = cover ? '/art/' + cover + '-header.jpg' : game.img;
  if (source) {
    image.addEventListener('error', showFallback, { once: true });
    image.src = source;
  } else {
    showFallback();
  }
  const action = document.createElement('span');
  action.className = 'tile-launch';
  action.textContent = game.availability ? 'View details' : 'Play';
  link.querySelector('.art').append(action);
  link.querySelector('h3').textContent = game.t;
  link.querySelector('small').textContent = game.availability === 'unavailable' ? 'Build unavailable'
    : game.availability === 'external' ? 'External link' : (game.cs || []).slice(0, 2).map(titleCase).join(' · ');
  const tile = document.createElement('div');
  tile.className = 'play-later-card';
  tile.append(link, queueButton(game, { notify: message => { $('discover-notice').textContent = message; } }));
  const info = document.createElement('button');
  info.type = 'button';
  info.className = 'card-info';
  info.setAttribute('aria-label', 'About ' + game.t);
  info.innerHTML = icon('info');
  info.onclick = () => {
    $('detailsTitle').textContent = game.t;
    $('detailsCategory').textContent = (game.cs || []).map(titleCase).join(' · ');
    $('detailsBody').textContent = game.note || game.dep || 'See the game page for launch options.';
    $('detailsPlay').href = gameUrl(game);
    $('gameDetails').showModal();
  };
  tile.append(info);
  return tile;
}

function showMore() {
  const batch = matched.slice(shown, shown + pageSize);
  const cards = batch.map(card);
  $('grid').append(...cards);
  shown += cards.length;
  $('more').hidden = shown >= matched.length;
  return cards[0]?.querySelector('a');
}

function updateUrl(changes, { replace = false, scroll = false } = {}) {
  const params = new URLSearchParams(location.search);
  for (const [key, value] of Object.entries(changes)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const query = params.toString();
  const target = '/' + (query ? '?' + query : '');
  if (target !== location.pathname + location.search + location.hash) {
    if (replace) history.replaceState(history.state, '', target);
    else history.pushState(null, '', target);
  }
  renderCatalog();
  if (scroll) window.scrollTo(0, 0);
}

function renderCatalog() {
  const params = new URLSearchParams(location.search);
  const input = params.get('q') || '';
  const query = input.trim().toLowerCase();
  const words = query ? query.split(/\s+/) : [];
  const genre = params.get('c') || '';
  const sort = params.get('sort') ?? document.documentElement.dataset.gameSort ?? '';
  const browsing = !!(query || genre || params.has('all'));
  const pageTitle = query ? 'Search results' : genre ? titleCase(genre) : browsing ? 'All games' : 'Discover';

  if ($('query').value !== input) $('query').value = input;
  $('sort').value = ['az', 'za', 'new', 'recent'].includes(sort) ? sort : '';
  $('spot').hidden = browsing;
  $('discover-actions').hidden = browsing;
  $('discover-intro').classList.toggle('discover-home', !browsing);
  $('place').textContent = pageTitle;
  $('page-title').textContent = pageTitle;
  $('page-deck').textContent = query ? 'Matching games for “' + input.trim() + '”.'
    : genre ? 'Explore ' + genre + ' games.'
      : browsing ? 'Explore the full browser game catalog.' : 'Find your next favorite browser game.';
  $('sectionName').textContent = browsing ? 'Game catalog' : 'Browse games';

  const sites = genre ? [] : gamePortals.filter(site => site.label.toLowerCase().includes(query));
  $('gameSites').hidden = !sites.length;
  $('portalLinks').replaceChildren(...sites.map(site => {
    const link = document.createElement('a');
    link.href = site.url;
    link.rel = 'noopener noreferrer';
    link.target = '_blank';
    link.textContent = site.label;
    return link;
  }));
  const labels = ['All', ...genres];
  if (genre && !labels.some(label => label.toLowerCase() === genre)) labels.push(titleCase(genre));
  const filters = $('filters');
  const rebuildFilters = labels.join('|') !== filters.dataset.labels;
  if (rebuildFilters) {
    filters.dataset.labels = labels.join('|');
    filters.replaceChildren(...labels.map((label, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.dataset.genre = index ? label.toLowerCase() : '';
      button.addEventListener('click', () => {
        updateUrl({ all: '1', c: button.dataset.genre });
        $('catalog').scrollIntoView({ block: 'nearest' });
      });
      return button;
    }));
  }
  Array.from(filters.children).forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.genre === genre));
  });
  document.querySelectorAll('.za-group a').forEach(link => {
    if (link.pathname !== '/') return;
    const route = new URLSearchParams(link.search);
    const current = !query && (route.has('c') ? route.get('c') === genre
      : route.has('all') ? browsing && !genre : !browsing);
    if (current) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  matched = games.filter(game => {
    const categories = game.cs || [];
    return (!genre || categories.includes(genre))
      && words.every(word => game.searchText.includes(word));
  });
  if (sort === 'new') matched.sort((a, b) => (b.added || '').localeCompare(a.added || ''));
  if (sort === 'az') matched.sort((a, b) => collator.compare(a.t, b.t));
  if (sort === 'za') matched.sort((a, b) => collator.compare(b.t, a.t));

  if (sort === 'recent') {
    let history = [];
    try { history = JSON.parse(localStorage.getItem('zenou_recent')) || []; } catch {}
    const times = new Map(Array.isArray(history) ? history.filter(Boolean).map(row => [row.id, row.ts]) : []);
    matched.sort((a, b) => (times.get(b.id) || 0) - (times.get(a.id) || 0));
  }
  $('count').textContent = loadState === 'loading' ? 'Loading games…'
    : loadState === 'error' ? '' : matched.length.toLocaleString() + (matched.length === 1 ? ' game' : ' games');
  $('grid').replaceChildren();
  shown = 0;
  showMore();
  $('empty').hidden = loadState === 'loading' || matched.length > 0;
  $('empty-message').textContent = loadState === 'error'
    ? 'The catalog could not load. Refresh the page to try again.'
    : 'No games match your filters.';
  $('clear').hidden = loadState === 'error';
}

$('query').addEventListener('input', event => {
  const replace = !!history.state?.typing;
  updateUrl({ q: event.target.value }, { replace });
  history.replaceState({ typing: true }, '');
});
$('query').addEventListener('blur', () => {
  if (history.state?.typing) history.replaceState(null, '');
});
new MutationObserver(renderCatalog).observe(document.documentElement, {
  attributes: true, attributeFilter: ['data-game-sort'],
});
$('sort').addEventListener('change', event => updateUrl({ sort: event.target.value || 'featured' }));
$('clear').addEventListener('click', () => {
  updateUrl({ q: '', c: '', sort: '', all: '1' }, { scroll: true });
  $('query').focus();
});
$('more').addEventListener('click', () => showMore()?.focus());
$('shuffle').addEventListener('click', () => {
  const pool = (matched.length ? matched : games).filter(game => !game.availability);
  if (pool.length) location.assign(gameUrl(pool[Math.floor(Math.random() * pool.length)]));
});
watchQueue(() => paintQueue());
window.addEventListener('popstate', renderCatalog);
document.addEventListener('keydown', event => {
  if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey
    || event.target.closest('input, textarea, select, [contenteditable]')
    || document.querySelector('#consentGate, dialog[open]')) return;
  event.preventDefault();
  $('query').focus();
});

function renderShelves() {
  const byId = new Map(games.map(game => [game.id, game]));
  $('pickGrid').replaceChildren(...picks.map(id => byId.get(id)).filter(Boolean).map(card));
  let recentIds = [];
  try {
    const records = JSON.parse(localStorage.getItem('zenou_recent'));
    if (Array.isArray(records)) recentIds = [...new Set(records.map(record => record?.id))];
  } catch { /* Storage can be unavailable. */ }
  const recent = recentIds.map(id => byId.get(id)).filter(Boolean).slice(0, 4);
  $('recent-grid').replaceChildren(...recent.map(card));
  $('recent').hidden = recent.length === 0;
}

window.addEventListener('pageshow', event => {
  if (event.persisted && loadState === 'ready') renderShelves();
});

renderCatalog();
fetch('/catalog/games.json?v=polytrack-embed')
  .then(response => {
    if (!response.ok) throw new Error('Catalog request failed');
    return response.json();
  })
  .then(data => {
    games = data.games.map(game => ({
      ...game,
      searchText: [game.t, ...(game.cs || [])].join(' ').toLowerCase(),
    }));
    loadState = 'ready';
    $('shuffle').disabled = !games.length;
    renderShelves();
    renderCatalog();
  })
  .catch(() => {
    games = [];
    loadState = 'error';
    $('shuffle').disabled = true;
    renderCatalog();
  });
