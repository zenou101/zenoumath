import { el, icon } from '/os/shared.js';
import { queueIds } from './play-later.js';

const pages = [
  ['Discover', '/', 'discover', 'featured home'],
  ['All games', '/?all=1', 'gamepad', 'catalog browse'],
  ['My library', '/library/', 'library', 'favorites ratings notes'],
  ['Play Later', '/library/#later', 'bookmark', 'saved queue'],
  ['Math Games', '/math-games/', 'calculator', 'calculator practice'],
  ['Books & Manga', '/books/', 'book', 'read'],
  ['Web', '/web/', 'globe', 'browser'],
  ['AI', '/ai/', 'spark', 'slate duckduckgo chat'],
  ['Music', '/music/', 'music', 'listen'],
  ['Social', '/social/', 'social', 'videos'],
  ['Account', '/account/', 'person', 'sign in login register'],
  ['Legal centre', '/legal/', 'info', 'terms privacy contact'],
  ['ZenouOS Beta', '/os/', 'os-desktop', 'desktop apps'],
].map(([label, url, glyph, keywords]) => ({ label, url, glyph, keywords }));

let catalog;
function getGames() {
  catalog ||= fetch('/catalog/games.json?v=polytrack-embed').then(async response => {
    if (!response.ok) throw new Error('The catalog is unavailable.');
    const data = await response.json();
    if (!Array.isArray(data.games)) throw new Error('The catalog is unavailable.');
    return data.games;
  }).catch(error => { catalog = null; throw error; });
  return catalog;
}
function local(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function gameLink(game) {
  return { label: game.t, url: '/play/?id=' + encodeURIComponent(game.id), glyph: 'gamepad', meta: game.cs?.[0] };
}

function install() {
  const rail = document.querySelector('.za-rail > .za-brand-row');
  if (!rail || document.documentElement.hasAttribute('data-zenou-desktop') || document.querySelector('.quick-launch')) return;

  const shortcut = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K';
  const launcher = el('button', 'quick-launch');
  launcher.type = 'button';
  launcher.title = 'Quick search (' + shortcut + ')';
  launcher.setAttribute('aria-label', 'Quick search');
  launcher.setAttribute('aria-haspopup', 'dialog');
  launcher.setAttribute('aria-keyshortcuts', 'Control+K Meta+K');
  launcher.append(icon('search'), el('span', '', 'Quick search'), el('kbd', '', shortcut));
  rail.after(launcher);

  const dialog = el('dialog', 'quick-dialog');
  dialog.setAttribute('aria-label', 'Quick search');
  const header = el('div', 'quick-searchbar');
  const input = el('input');
  input.type = 'search';
  input.maxLength = 100;
  input.autocomplete = 'off';
  input.placeholder = 'Find games or jump to a page';
  input.setAttribute('aria-label', 'Find games or jump to a page');
  const close = el('button', 'later-icon');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close quick search');
  close.append(icon('close'));
  close.onclick = () => dialog.close();
  header.append(icon('search'), input, close);
  const entries = el('div', 'quick-results');
  const status = el('p', 'site-visually-hidden');
  status.setAttribute('role', 'status');
  dialog.append(header, entries, status);
  document.body.append(dialog);

  function group(label, items) {
    if (!items.length) return;
    const section = el('section');
    section.append(el('h2', '', label));
    const list = el('ul');
    for (const item of items) {
      const row = el('li');
      const a = el('a', 'quick-result');
      a.href = item.url;
      a.append(icon(item.glyph), el('span', '', item.label));
      if (item.meta) a.append(el('small', '', item.meta));
      a.addEventListener('click', () => dialog.close());
      row.append(a);
      list.append(row);
    }
    section.append(list);
    entries.append(section);
  }

  let request = 0;
  async function render() {
    const id = ++request;
    const query = input.value.trim().toLowerCase();
    const matches = query ? pages.filter(page => (page.label + ' ' + page.keywords).toLowerCase().includes(query)) : pages;
    entries.replaceChildren();
    group(query ? 'Pages' : 'Quick links', matches);
    const recent = local('zenou_recent');
    const wanted = [...new Set([...queueIds(), ...(Array.isArray(recent) ? recent.map(record => record?.id) : [])])].slice(0, 4);
    status.textContent = '';
    if (!query && !wanted.length) return;

    try {
      const games = await getGames();
      if (id !== request || !dialog.open) return;
      if (!query) {
        const byId = new Map(games.map(game => [game.id, game]));
        group('Saved and recent games', wanted.map(value => byId.get(value)).filter(Boolean).map(gameLink));
        return;
      }
      const words = query.split(/\s+/);
      const similar = games.filter(game => words.every(word => game.t.toLowerCase().includes(word)));
      similar.sort((a, b) => Number(b.t.toLowerCase().startsWith(query)) - Number(a.t.toLowerCase().startsWith(query)));
      if (similar.length) group('Games', similar.slice(0, 7).map(gameLink));
      if (similar.length > 7) group('Full catalog', [{ label: 'See all matching games', url: '/?q=' + encodeURIComponent(query), glyph: 'search' }]);
      if (!matches.length && !similar.length) entries.append(el('p', 'quick-empty', 'No pages or games match that search.'));
      status.textContent = `${matches.length} pages and ${similar.length} games found.`;
    } catch {
      if (id === request && dialog.open) entries.append(el('p', 'quick-empty', 'The game catalog couldn’t load. Edit your search to try again.'));
    }
  }

  function open() {
    if (document.querySelector('#consentGate, dialog[open]')) return;
    input.value = '';
    dialog.showModal();
    entries.scrollTop = 0;
    input.focus();
    render();
  }
  launcher.onclick = open;
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { request++; });
  input.addEventListener('input', render);
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      dialog.close();
      return;
    }
    const options = Array.from(entries.querySelectorAll('a'));
    const current = options.indexOf(document.activeElement);
    if (event.key === 'Enter' && event.target === input && options.length) {
      event.preventDefault();
      options[0].click();
    }
    if (!['ArrowDown', 'ArrowUp'].includes(event.key) || !options.length) return;
    event.preventDefault();
    if (event.key === 'ArrowUp' && current === 0) input.focus();
    else options[event.key === 'ArrowDown' ? (current + 1) % options.length : current < 0 ? options.length - 1 : current - 1].focus();
  });
  document.addEventListener('keydown', event => {
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return;
    if (document.querySelector('#consentGate, dialog[open]:not(.quick-dialog)')) return;
    event.preventDefault();
    if (dialog.open) dialog.close();
    else open();
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
else install();
