import { button, el, iconButton, appIcon, read, write, prefix } from './shared.js';

export function createWindows(layer, onChange) {
  const windows = new Map();
  const geometryKey = prefix + 'windows';
  let active = null;
  let z = 0;
  const mobile = matchMedia('(max-width: 700px)');

  function update() {
    layer.dataset.open = String([...windows.values()].some(item => !item.minimized));
    onChange(windows, active);
  }

  function focus(id, keyboard = false) {
    const item = windows.get(id);
    if (!item) return;
    item.minimized = false;
    item.node.hidden = false;
    for (const other of windows.values()) other.node.classList.toggle('active', other === item);
    item.node.style.zIndex = String(++z);
    active = id;
    if (keyboard) item.node.focus({ preventScroll: true });
    update();
  }

  function focusNext(restoreKeyboard = false, fallback) {
    const sorted = [...windows.entries()].sort(([, a], [, b]) => Number(b.node.style.zIndex) - Number(a.node.style.zIndex));
    const next = sorted.find(([, item]) => !item.minimized);
    if (next) focus(next[0], restoreKeyboard);
    else {
      active = null;
      update();
      if (restoreKeyboard) {
        const task = document.querySelector(`.task-app[data-app="${CSS.escape(fallback)}"]`);
        (task || document.getElementById('launcherButton'))?.focus();
      }
    }
  }

  function minimize(id) {
    const item = windows.get(id);
    if (!item) return;
    const restore = item.node.contains(document.activeElement);
    item.minimized = true;
    item.node.hidden = true;
    item.node.classList.remove('active');
    if (active === id) focusNext(restore, id);
    else update();
  }

  function close(id) {
    const item = windows.get(id);
    if (!item) return;
    const restore = item.node.contains(document.activeElement);
    item.controller.abort();
    item.node.remove();
    windows.delete(id);
    if (active === id) focusNext(restore, id);
    else update();
  }

  function place(item) {
    const { width, height } = layer.getBoundingClientRect();
    const bounds = item.bounds;
    bounds.w = Math.min(width, Math.max(Math.min(360, width), bounds.w));
    bounds.h = Math.min(height, Math.max(Math.min(280, height), bounds.h));
    bounds.x = Math.min(Math.max(0, bounds.x), width - bounds.w);
    bounds.y = Math.min(Math.max(0, bounds.y), height - bounds.h);
    Object.assign(item.node.style, { left: bounds.x + 'px', top: bounds.y + 'px', width: bounds.w + 'px', height: bounds.h + 'px' });
  }

  function toggleMaximize(item) {
    item.maximized = !item.maximized;
    item.node.classList.toggle('maximized', item.maximized);
    item.max.title = item.maximized ? 'Restore window' : 'Maximize window';
    item.max.setAttribute('aria-label', item.max.title);
    item.max.setAttribute('aria-pressed', String(item.maximized));
  }

  function pointer(target, item, resize) {
    target.addEventListener('pointerdown', event => {
      if (event.button !== 0 || item.maximized || mobile.matches || event.target.closest('button')) return;
      event.preventDefault();
      target.setPointerCapture(event.pointerId);
      item.node.classList.add('moving');
      const start = { ...item.bounds };
      const move = e => {
        const dx = e.clientX - event.clientX;
        const dy = e.clientY - event.clientY;
        item.bounds = resize ? { ...start, w: start.w + dx, h: start.h + dy } : { ...start, x: start.x + dx, y: start.y + dy };
        place(item);
      };
      const finish = () => {
        item.node.classList.remove('moving');
        target.removeEventListener('pointermove', move);
        if (item.app.remember !== false) write(geometryKey, { ...read(geometryKey, {}), [item.app.id]: item.bounds });
      };
      target.addEventListener('pointermove', move);
      target.addEventListener('lostpointercapture', finish, { once: true });
    });
  }

  function open(app, mount, focusOnOpen = true) {
    if (windows.has(app.id)) { focus(app.id, true); return; }
    const node = el('section', 'os-window');
    node.tabIndex = -1;
    node.setAttribute('role', 'region');
    node.setAttribute('aria-label', app.name);
    const header = el('header', 'window-bar');
    const label = el('div', 'window-label');
    label.append(appIcon(app), el('strong', '', app.name));
    const controls = el('div', 'window-controls');
    const content = el('div', 'window-content');
    const grip = el('span', 'resize-grip');
    grip.setAttribute('aria-hidden', 'true');
    const { width, height } = layer.getBoundingClientRect();
    const size = app.size || [760, 590];
    const w = Math.min(size[0], width - 10);
    const h = Math.min(size[1], height - 10);
    const shift = windows.size % 6 * 14;
    const initial = { x: (width - w) / 2 + shift, y: (height - h) / 2 + shift, w, h };
    const saved = app.remember === false ? null : read(geometryKey, {})[app.id];
    const item = { app, node, minimized: false, maximized: false, controller: new AbortController(), bounds: { ...initial, ...saved } };
    const min = button('−', () => minimize(app.id), 'icon-button');
    min.title = 'Minimize window';
    min.setAttribute('aria-label', min.title);
    item.max = iconButton('Maximize window', 'fullscreen', () => toggleMaximize(item));
    controls.append(min, item.max, iconButton('Close window', 'close', () => close(app.id)));
    header.append(label, controls);
    node.append(header, content, grip);
    layer.append(node);
    windows.set(app.id, item);
    place(item);
    pointer(header, item, false);
    pointer(grip, item, true);
    header.addEventListener('dblclick', event => { if (!event.target.closest('button')) toggleMaximize(item); });
    node.addEventListener('pointerdown', () => { if (active !== app.id) focus(app.id); });
    node.addEventListener('focusin', () => { if (active !== app.id) focus(app.id); });
    focus(app.id, focusOnOpen);
    async function load() {
      content.replaceChildren(el('p', 'app-message', `Opening ${app.name}…`));
      try { await mount(content, item.controller.signal); }
      catch (error) {
        if (item.controller.signal.aborted) return;
        content.replaceChildren(el('p', 'app-message', error.message || 'This app could not open.'), button('Retry', load));
      }
    }
    load();
  }

  new ResizeObserver(() => { for (const item of windows.values()) place(item); }).observe(layer);
  return {
    open, focus, close,
    task(id) { if (active === id) minimize(id); else focus(id, true); },
    showDesktop() { for (const id of windows.keys()) minimize(id); },
  };
}
