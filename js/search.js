/* ZenouMath, global search across films, games, AI and music. */
'use strict';

(async function () {
  const qIn = $('#globalQ');
  const results = $('#results');
  const echo = $('#qEcho');

  const p = new URLSearchParams(location.search);
  const initial = (p.get('q') || '').trim();
  if (initial) qIn.value = initial;

  async function readJson(url, fallback) {
    try {
      const response = await fetch(url);
      return response.ok ? await response.json() : fallback;
    } catch { return fallback; }
  }

  const catalogs = Promise.all([
    readJson('/catalog/games.json?v=2026-11-28', {}),
    readJson('/catalog/movies.json?v=2026-11-07', {}),
    readJson('/catalog/ai.json?v=2026-11-07', {}),
    readJson('/api/config', {}),
  ]);
  let timer;
  let request;

  qIn.addEventListener('input', () => {
    clearTimeout(timer);
    request?.abort();
    if (qIn.value.trim()) timer = setTimeout(run, 220);
    else run();
  });
  $('#globalForm').addEventListener('submit', event => {
    event.preventDefault();
    clearTimeout(timer);
    run();
  });
  run();

  async function run() {
    request?.abort();
    request = new AbortController();
    const { signal } = request;
    const q = qIn.value.trim();
    const url = new URL(location.href);
    if (q) url.searchParams.set('q', q);
    else url.searchParams.delete('q');
    history.replaceState(history.state, '', url);
    results.replaceChildren();
    results.setAttribute('aria-busy', String(Boolean(q)));
    echo.textContent = q ? 'Searching…' : 'Find games, films, AI tools and music.';
    if (!q) return;

    const [games, films, assistants, config] = await catalogs;
    if (signal.aborted) return;
    const titles = config.configured ? await searchTitles(q, signal) : [];
    if (signal.aborted) return;
    const imageBase = config.images?.base || 'https://image.tmdb.org/t/p/';
    const needle = q.toLowerCase();
    const gameHits = (games.games || []).filter(game => game.t.toLowerCase().includes(needle)).slice(0, 18);
    const filmHits = (films.sources || []).filter(source => source.status !== 'down'
      && `${source.name} ${source.note || ''} ${source.url}`.toLowerCase().includes(needle)).slice(0, 8);
    const aiHits = (assistants.tools || []).filter(tool => `${tool.name} ${tool.vendor || ''} ${tool.blurb || ''} ${(tool.tags || []).join(' ')}`.toLowerCase().includes(needle)).slice(0, 8);

    if (gameHits.length) gamesRow(gameHits);
    if (titles.length) titlesRow(titles, imageBase);
    if (filmHits.length) filmsRow(filmHits);
    if (aiHits.length) aiRow(aiHits);
    const count = gameHits.length + titles.length + filmHits.length + aiHits.length;
    echo.textContent = count ? `${count} ${count === 1 ? 'result' : 'results'} for “${q}”` : `No site results for “${q}”. Try another search or look on a music service below.`;
    musicRow(q);
    results.setAttribute('aria-busy', 'false');
  }

  function rowWrap(title, gridCls) {
    const wrap = document.createElement('section');
    const head = document.createElement('div'); head.className = 'mhead';
    const h = document.createElement('h2'); h.textContent = title;
    head.append(h); wrap.append(head);
    const grid = document.createElement('div'); grid.className = gridCls;
    wrap.append(grid);
    results.append(wrap);
    return grid;
  }

  function gamesRow(list) {
    const grid = rowWrap('Games', 'grid');
    list.forEach(g => {
      const a = document.createElement('a');
      a.className = 'card';
      a.href = `/play?id=${encodeURIComponent(g.id)}`;
      const cover = placeholder(g.t.trim().slice(0, 2).toUpperCase());
      if (g.img) {
        const image = document.createElement('img');
        image.className = 'card-thumb';
        image.loading = 'lazy';
        image.alt = '';
        image.addEventListener('error', () => image.replaceWith(cover), { once: true });
        a.append(image);
        image.src = g.img;
      } else a.append(cover);
      const name = document.createElement('span'); name.className = 'card-name'; name.textContent = g.t;
      a.append(name);
      grid.append(a);
    });
  }

  function filmsRow(list) {
    const grid = rowWrap('Movies & series', 'grid');
    list.forEach(s => {
      const a = document.createElement('a');
      a.className = 'card';
      a.href = `/sources?s=${encodeURIComponent(s.id)}`;
      const mark = placeholder(s.glyph || s.name.slice(0, 2).toUpperCase());
      const name = document.createElement('span');
      name.className = 'card-name';
      name.textContent = s.name;
      a.append(mark, name);
      grid.append(a);
    });
  }



  async function searchTitles(q, signal) {
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=multi&page=1`, { signal });
      if (!r.ok) return [];
      const data = await r.json();
      return (data.results || []).filter(t => t.poster).slice(0, 8);
    } catch { return []; }
  }

  function titlesRow(list, imageBase) {
    const grid = rowWrap('Films & series', 'grid');
    list.forEach(t => {
      const a = document.createElement('a');
      a.className = 'card';
      a.href = `/title?type=${t.type}&id=${t.id}`;
      const thumb = document.createElement('img');
      thumb.className = 'card-thumb';
      thumb.loading = 'lazy';
      thumb.alt = '';
      // Posters are 2:3; the shared .card-thumb frame is 16:10.
      thumb.style.aspectRatio = '2 / 3';
      // A poster that never loads leaves a year block rather than a hole. The
      // handler is attached before src, and the node is in the card first, so a
      // cached failure can still replace it in place.
      thumb.addEventListener('error', () => thumb.replaceWith(placeholder(t.year || '—', true)), { once: true });
      const name = document.createElement('span');
      name.className = 'card-name';
      name.textContent = t.title;
      a.append(thumb, name);
      thumb.src = `${imageBase}w342${t.poster}`;
      grid.append(a);
    });
  }

  function aiRow(list) {
    const grid = rowWrap('AI', 'grid');
    list.forEach(t => {
      const a = document.createElement('a');
      a.className = 'card';
      if (t.frame === 'inline') {
        a.href = `/ai?t=${encodeURIComponent(t.id)}`;
      } else {
        a.href = t.url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.title = 'Opens in its own tab: ' + (t.note || 'blocks framing');
      }
      const mark = placeholder('AI');
      const name = document.createElement('span');
      name.className = 'card-name';
      name.textContent = t.name;
      a.append(mark, name);
      grid.append(a);
    });
  }

  function placeholder(label, portrait = false) {
    const mark = document.createElement('span');
    mark.className = 'card-thumb search-placeholder';
    if (portrait) mark.classList.add('search-placeholder-poster');
    mark.textContent = label;
    mark.setAttribute('aria-hidden', 'true');
    return mark;
  }

  function musicRow(q) {
    const grid = rowWrap('Search music', 'search-services');
    const providers = [
      ['Spotify', 'https://open.spotify.com/search/'],
      ['SoundCloud', 'https://soundcloud.com/search?q='],
    ];
    for (const [name, url] of providers) {
      const link = document.createElement('a');
      link.className = 'btn btn-ghost';
      link.href = url + encodeURIComponent(q);
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = name;
      grid.append(link);
    }
  }
})();
