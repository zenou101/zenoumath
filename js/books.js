'use strict';

(() => {
  const $ = (id) => document.getElementById(id);
  const grid = $('bookGrid');
  const search = $('bookSearch');
  const filters = $('bookFilters');
  const count = $('bookCount');
  const empty = $('bookEmpty');
  const params = new URLSearchParams(location.search);
  const state = { books: [], query: params.get('q') || '', category: params.get('c') || 'All' };
  const baseTitle = 'Books & Manga · ZenouMath';

  const normal = (value) => String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const titleFor = () => {
    if (state.query) return 'Search: ' + state.query + ' · ZenouMath';
    if (state.category !== 'All') return state.category + ' books · ZenouMath';
    return baseTitle;
  };
  const syncTitle = () => { document.title = titleFor(); };
  const syncUrl = () => {
    const next = new URL(location.href);
    if (state.query) next.searchParams.set('q', state.query); else next.searchParams.delete('q');
    if (state.category !== 'All') next.searchParams.set('c', state.category); else next.searchParams.delete('c');
    history.replaceState(null, '', next);
  };

  function matches(book) {
    if (state.category !== 'All' && book.category !== state.category) return false;
    if (!state.query) return true;
    const haystack = normal([book.title, book.author, book.category, book.format, book.note, book.year].join(' '));
    return normal(state.query).split(/\s+/).every((word) => haystack.includes(word));
  }

  function coverFor(book) {
    const link = document.createElement('a');
    link.className = 'book-cover';
    link.href = book.url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.dataset.category = book.category;
    link.setAttribute('aria-label', 'Open ' + book.title + ' by ' + book.author + ' at its source');

    const top = document.createElement('span');
    top.className = 'book-cover-top';
    top.textContent = book.category;

    const title = document.createElement('strong');
    title.className = 'book-cover-title';
    title.textContent = book.title;

    const author = document.createElement('span');
    author.className = 'book-cover-author';
    author.textContent = book.author;

    const mark = document.createElement('span');
    mark.className = 'book-cover-mark';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = 'Z';

    link.append(top, title, author, mark);
    return link;
  }

  function cardFor(book) {
    const card = document.createElement('article');
    card.className = 'book-card';
    const cover = coverFor(book);

    const body = document.createElement('div');
    body.className = 'book-card-body';
    const meta = document.createElement('p');
    meta.className = 'book-card-meta';
    meta.textContent = book.format + ' · ' + book.year;
    const title = document.createElement('h2');
    title.className = 'book-card-title';
    const titleLink = document.createElement('a');
    titleLink.href = book.url;
    titleLink.target = '_blank';
    titleLink.rel = 'noopener';
    titleLink.textContent = book.title;
    title.append(titleLink);
    const author = document.createElement('p');
    author.className = 'book-card-author';
    author.textContent = book.author;
    const note = document.createElement('p');
    note.className = 'book-card-note';
    note.textContent = book.note;
    const open = document.createElement('a');
    open.className = 'book-card-open';
    open.href = book.url;
    open.target = '_blank';
    open.rel = 'noopener';
    open.textContent = 'Open source';
    const arrow = document.createElement('span');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '↗';
    open.append(arrow);

    body.append(meta, title, author, note, open);
    card.append(cover, body);
    return card;
  }

  function renderFilters() {
    const categories = ['All', ...new Set(state.books.map((book) => book.category))];
    if (!categories.includes(state.category)) state.category = 'All';
    filters.replaceChildren(...categories.map((category) => {
      const total = category === 'All' ? state.books.length : state.books.filter((book) => book.category === category).length;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'zn-chip';
      button.dataset.category = category;
      button.setAttribute('aria-pressed', String(state.category === category));
      button.textContent = category;
      const badge = document.createElement('span');
      badge.textContent = total;
      button.append(badge);
      button.addEventListener('click', () => {
        state.category = category;
        renderFilters();
        render();
      });
      return button;
    }));
  }

  function render() {
    const matchesList = state.books.filter(matches);
    grid.replaceChildren(...matchesList.map(cardFor));
    empty.hidden = matchesList.length > 0;
    count.textContent = state.books.length
      ? matchesList.length.toLocaleString() + ' of ' + state.books.length + ' titles'
      : 'Shelf unavailable';
    syncTitle();
    syncUrl();
  }

  function setupReader() {
    const dialog = $('readerDialog');
    const frame = $('booksFrame');
    const status = $('readerStatus');
    let loaded = false;
    const open = () => {
      if (!loaded) {
        frame.src = 'https://gn-math.dev/#books';
        loaded = true;
      }
      if (!dialog.open) dialog.showModal();
      document.title = 'GN-Math reader · ZenouMath';
      status.textContent = 'Loading GN-Math…';
    };
    $('openReader').addEventListener('click', open);
    $('readerClose').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
      syncTitle();
      $('openReader').focus();
    });
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
    frame.addEventListener('load', () => {
      $('readerLoading').hidden = true;
      status.textContent = 'Reader loaded. Some books may open in a new tab.';
    });
    $('readerReload').addEventListener('click', () => {
      $('readerLoading').hidden = false;
      status.textContent = 'Reloading GN-Math…';
      frame.src = 'https://gn-math.dev/#books';
    });
    $('readerFull').addEventListener('click', async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await dialog.requestFullscreen();
      } catch { status.textContent = 'Fullscreen is unavailable in this browser.'; }
    });
  }

  function setQuery(value) {
    state.query = value.trim();
    search.value = state.query;
    render();
  }

  search.addEventListener('input', () => setQuery(search.value));
  $('bookClear').addEventListener('click', () => { setQuery(''); search.focus(); });
  document.addEventListener('keydown', (event) => {
    if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
    event.preventDefault();
    search.focus();
  });
  window.addEventListener('popstate', () => {
    const next = new URLSearchParams(location.search);
    state.query = next.get('q') || '';
    state.category = next.get('c') || 'All';
    search.value = state.query;
    renderFilters();
    render();
  });

  async function boot() {
    try {
      const response = await fetch('/catalog/books.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error('Shelf unavailable');
      const data = await response.json();
      state.books = Array.isArray(data.books) ? data.books : [];
    } catch {
      count.textContent = 'Shelf unavailable';
      empty.hidden = false;
      empty.querySelector('p').textContent = 'The shelf could not be loaded. Refresh in a moment.';
      $('bookClear').hidden = true;
      return;
    }
    search.value = state.query;
    renderFilters();
    render();
    setupReader();
  }

  boot();
})();
