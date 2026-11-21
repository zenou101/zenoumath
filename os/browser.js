import { button, el, iconButton, link, prefix, read, write } from './shared.js';

export function mount(root, { notify }) {
  const toolbar = el('div', 'browser-tools');
  const strip = el('div', 'browser-tabs');
  strip.setAttribute('role', 'group');
  strip.setAttribute('aria-label', 'Browser tabs');
  const saved = el('details', 'browser-saved');
  const summary = el('summary', '', 'Bookmarks & history');
  const savedList = el('div');
  saved.append(summary, savedList);
  const frames = el('div', 'browser-frames');
  const tabs = [];
  let active;
  const bookmarksKey = prefix + 'bookmarks';

  function address(frame) {
    try {
      const viewer = frame.contentDocument.querySelector('#webFrame:not([hidden])');
      const url = new URL(viewer.src);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  }

  function refreshSaved() {
    const items = read(bookmarksKey, []);
    const history = read('zenou_web_recent', []);
    savedList.replaceChildren();
    for (const [name, list] of [['Bookmarks', items], ['History', history]]) {
      savedList.append(el('h3', '', name));
      if (!list.length) savedList.append(el('p', '', `No ${name.toLowerCase()} yet.`));
      for (const entry of list.slice(0, 12)) {
        let url;
        try { url = new URL(entry.url, location.origin); } catch { continue; }
        if (!['http:', 'https:'].includes(url.protocol)) continue;
        const row = el('div', 'button-row');
        const label = (entry.label || url.hostname) + (url.pathname === '/' ? '' : url.pathname);
        const item = button(label, () => { addTab(url.href); saved.open = false; });
        item.title = url.href;
        row.append(item);
        if (name === 'Bookmarks') row.append(iconButton('Remove bookmark', 'close', () => {
          write(bookmarksKey, items.filter(item => item.url !== url.href));
          refreshSaved();
        }));
        savedList.append(row);
      }
    }
  }

  function select(tab) {
    active = tab;
    for (const item of tabs) {
      item.frame.hidden = item !== tab;
      item.pick.setAttribute('aria-pressed', String(item === tab));
    }
  }

  function addTab(url) {
    if (tabs.length >= 12) { notify('Close a tab before opening another.'); return; }
    const frame = el('iframe', 'app-frame');
    frame.title = 'ZBrowse web viewer';
    frame.allow = 'fullscreen; clipboard-read; clipboard-write; autoplay; gamepad';
    const name = url ? new URL(url).hostname : 'New tab';
    frame.src = '/web/?desktop=1' + (url ? '#' + encodeURIComponent(url) : '');
    const tab = { frame, wrap: el('div', 'browser-tab') };
    tab.pick = button(name, () => select(tab));
    const close = iconButton('Close ' + name, 'close', () => {
      const index = tabs.indexOf(tab);
      tabs.splice(index, 1);
      frame.remove(); tab.wrap.remove();
      if (!tabs.length) addTab();
      else if (active === tab) select(tabs[Math.min(index, tabs.length - 1)]);
    });
    tab.wrap.append(tab.pick, close);
    strip.append(tab.wrap);
    frames.append(frame);
    tabs.push(tab);
    select(tab);
    frame.addEventListener('load', () => {
      try {
        const viewer = frame.contentDocument;
        if (!viewer?.querySelector('#webUrl')) return;
        const updateLabel = () => {
          const url = address(frame);
          tab.pick.textContent = url ? new URL(url).hostname : 'New tab';
          close.setAttribute('aria-label', `Close ${tab.pick.textContent}`);
          close.title = `Close ${tab.pick.textContent}`;
        };
        updateLabel();
        viewer.addEventListener('zenou:web-navigate', updateLabel);
      } catch { /* An external destination may take over the viewer document. */ }
    });
  }

  const newTab = button('+ New tab', () => addTab());
  const bookmark = button('Bookmark page', () => {
    const url = address(active.frame);
    if (!url) { notify('Open a web address before bookmarking.'); return; }
    const list = read(bookmarksKey, []).filter(item => item.url !== url);
    write(bookmarksKey, [{ url, label: new URL(url).hostname }, ...list].slice(0, 30));
    if (saved.open) refreshSaved();
    notify('Bookmark saved.');
  });
  saved.addEventListener('toggle', () => { if (saved.open) refreshSaved(); });
  toolbar.append(newTab, bookmark, saved, link('Open Classic viewer', '/web/', true));
  root.classList.add('browser-app');
  root.replaceChildren(toolbar, strip, frames);
  addTab();
}
