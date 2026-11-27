import { icon } from './ui-kit.js';

const key = 'zenou_play_later';
const eventName = 'zenou:play-later';

export function queueIds() {
  try {
    const list = JSON.parse(localStorage.getItem(key));
    return Array.isArray(list) ? list.filter(id => typeof id === 'string') : [];
  } catch { return []; }
}

export function watchQueue(refresh, options) {
  window.addEventListener(eventName, refresh, options);
  window.addEventListener('storage', event => {
    if (event.key === key || event.key == null) refresh();
  }, options);
}

function reflect(button, saved) {
  const on = saved.has(button.dataset.later);
  button.setAttribute('aria-pressed', String(on));
  button.title = on ? 'Remove from Play Later' : 'Save to Play Later';
}

export function paintQueue(root = document) {
  const saved = new Set(queueIds());
  root.querySelectorAll('button[data-later]').forEach(button => reflect(button, saved));
}

export function queueButton(game, { className, text = '', notify } = {}) {
  const node = document.createElement('button');
  node.type = 'button';
  node.className = className || 'later-icon';
  node.dataset.later = game.id;
  node.setAttribute('aria-label', 'Play Later · ' + game.t);
  node.append(icon('bookmark'));
  if (text) {
    const label = document.createElement('span');
    label.textContent = text;
    node.append(label);
  }
  reflect(node, new Set(queueIds()));
  node.addEventListener('click', () => {
    const previous = queueIds();
    const exists = previous.includes(game.id);
    if (!exists && previous.length >= 200) {
      notify?.('Remove a game from Play Later to make room.');
      return;
    }
    const list = exists ? previous.filter(id => id !== game.id) : [game.id, ...previous];
    try { localStorage.setItem(key, JSON.stringify(list)); }
    catch { notify?.('Play Later could not be saved in this browser.'); return; }
    reflect(node, new Set(list));
    window.dispatchEvent(new Event(eventName));
  });
  return node;
}
