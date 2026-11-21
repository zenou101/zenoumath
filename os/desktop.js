import { appIcon, button, el, icon, iconButton, link, prefix, read, write } from './shared.js';
import { createWindows } from './windows.js';
import { applyAppearance, appearance, setAppearance } from './appearance.js';

const $ = id => document.getElementById(id);
const apps = [
  { id: 'zteam', name: 'Zteam', icon: 'gamepad', tint: 'green', size: [1120, 705], file: './zteam.js', description: 'Game library' },
  { id: 'browser', name: 'ZBrowse', icon: 'globe', tint: 'blue', size: [1000, 650], file: './browser.js', description: 'Web browser' },
  { id: 'paper', name: 'ZenouPaper Engine', short: 'ZenouPaper', icon: 'spark', tint: 'rose', size: [900, 650], file: './paper.js', description: 'Wallpaper gallery' },
  { id: 'settings', name: 'ZSettings', short: 'Settings', icon: 'settings', tint: 'gray', file: './utilities.js', description: 'Personalize your desktop' },
  { id: 'notes', name: 'ZNotes', icon: 'book', tint: 'yellow', file: './utilities.js', description: 'Local notes' },
  { id: 'files', name: 'ZFiles', icon: 'library', tint: 'blue', file: './utilities.js', description: 'Notes and wallpapers' },
  { id: 'calculator', name: 'ZCalculator', short: 'Calculator', icon: 'calculator', tint: 'yellow', size: [400, 490], file: './utilities.js', description: 'Calculate an expression' },
  { id: 'about', name: 'ZAbout', icon: 'info', tint: 'gray', size: [560, 595], file: './utilities.js', description: 'Release notes and feedback' },
];
const pinned = apps.slice(0, 4);
const secondary = apps.slice(4);
let notifications = read(prefix + 'notifications', []);
let timeout;
let lastPopoverTrigger;

function notify(message) {
  const toast = $('osToast');
  toast.textContent = message;
  toast.hidden = false;
  notifications = [{ message, time: Date.now() }, ...notifications].slice(0, 12);
  write(prefix + 'notifications', notifications);
  clearTimeout(timeout);
  timeout = setTimeout(() => { toast.hidden = true; }, 3200);
  if (!$('notificationPanel').hidden) renderNotifications();
}

function renderTasks(items, active) {
  const strip = $('taskApps');
  const previous = document.activeElement?.dataset.app;
  const appsInTaskbar = [...pinned, ...[...items.values()].map(item => item.app).filter(app => !pinned.some(pin => app.id === pin.id))];
  const nodes = appsInTaskbar.map(app => {
    const item = items.get(app.id);
    const node = button('', () => item ? manager.task(app.id) : open(app.id), 'task-app');
    node.dataset.app = app.id;
    node.title = app.name;
    node.setAttribute('aria-label', `${app.name}${item ? (item.minimized ? ', minimized' : ', running') : ''}`);
    node.setAttribute('aria-pressed', String(active === app.id));
    node.classList.toggle('running', Boolean(item));
    node.append(appIcon(app));
    return node;
  });
  strip.replaceChildren(...nodes);
  if (previous) nodes.find(node => node.dataset.app === previous)?.focus({ preventScroll: true });
}

const manager = createWindows($('windowLayer'), renderTasks);
function closePopovers(restore = false) {
  document.querySelectorAll('.popover').forEach(panel => { panel.hidden = true; });
  for (const id of ['launcherButton', 'quickButton', 'notificationButton']) $(id).setAttribute('aria-expanded', 'false');
  if (restore) lastPopoverTrigger?.focus();
  lastPopoverTrigger = null;
}

let audio;
function playSound() {
  try {
    audio ||= new AudioContext();
    audio.resume().catch(() => {});
    const tone = audio.createOscillator();
    const gain = audio.createGain();
    tone.type = 'sine';
    tone.frequency.value = 540;
    gain.gain.setValueAtTime(.04, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .10);
    tone.connect(gain).connect(audio.destination);
    tone.start();
    tone.stop(audio.currentTime + .10);
  } catch { /* A device without sound can still open apps. */ }
}

function open(id, focusOnOpen = true) {
  const app = apps.find(item => item.id === id);
  if (!app) return;
  closePopovers();
  if (appearance().sound && navigator.userActivation?.isActive) playSound();
  const recentKey = prefix + 'recentApps';
  write(recentKey, [id, ...read(recentKey, []).filter(value => value !== id)].slice(0, 5));
  manager.open(app, async (root, signal) => {
    const { mount } = await import(app.file);
    if (!signal.aborted) await mount(root, { open, play, notify, app, signal });
  }, focusOnOpen);
}

function play(game) {
  const route = '/play/?id=' + encodeURIComponent(game.id) + '&desktop=1';
  const app = { id: 'game-' + game.id, name: game.t, icon: 'gamepad', size: [1110, 720], remember: false };
  manager.open(app, root => {
    const frame = el('iframe', 'app-frame');
    frame.title = game.t;
    frame.allow = 'fullscreen; autoplay; gamepad; clipboard-read; clipboard-write';
    frame.src = route;
    const strip = el('div', 'frame-actions');
    strip.append(link('Open in new tab', '/play/?id=' + encodeURIComponent(game.id), true), button('Fullscreen', () => frame.requestFullscreen?.().catch(() => notify('Fullscreen is unavailable.'))));
    root.replaceChildren(strip, frame);
    root.classList.add('frame-app');
  });
}

function shortcut(app) {
  const tile = button('', () => open(app.id), 'app-shortcut');
  tile.append(appIcon(app), el('span', '', app.short || app.name));
  return tile;
}
$('shortcuts').append(...pinned.map(shortcut));

function renderLauncher() {
  const query = $('appSearch').value.trim().toLowerCase();
  const host = $('launcherApps');
  host.replaceChildren();
  const groups = query ? [['', apps.filter(app => `${app.name} ${app.description}`.toLowerCase().includes(query))]] : [['Pinned', pinned], ['All apps', secondary]];
  for (const [name, entries] of groups) {
    if (name) host.append(el('h3', '', name));
    const grid = el('div', 'app-tiles');
    grid.append(...entries.map(shortcut));
    host.append(grid);
  }
  if (!host.querySelector('button')) host.append(el('p', '', 'No apps match your search.'));
  const recent = read(prefix + 'recentApps', []).map(id => apps.find(app => app.id === id)).filter(Boolean).slice(0, 3);
  $('recentApps').hidden = Boolean(query) || recent.length === 0;
  $('recentApps').querySelector('div').replaceChildren(...recent.map(app => button(app.short || app.name, () => open(app.id))));
}

function updateClock() {
  const now = new Date();
  const label = `${now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  for (const clock of document.querySelectorAll('.desktop-clock')) {
    clock.dateTime = now.toISOString();
    clock.textContent = label;
  }
}
function renderNotifications() {
  const pane = $('notificationPanel');
  pane.replaceChildren(el('h2', '', 'Notifications'));
  if (!notifications.length) pane.append(el('p', '', 'You’re all caught up.'));
  for (const item of notifications) {
    const line = el('div', 'notification');
    line.append(el('span', '', item.message), el('small', '', new Date(item.time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })));
    pane.append(line);
  }
  if (notifications.length) pane.append(button('Clear notifications', () => { notifications = []; write(prefix + 'notifications', []); renderNotifications(); }));
}
function renderQuick() {
  const pane = $('quickPanel');
  pane.replaceChildren(el('h2', '', 'Quick settings'), el('time', 'desktop-clock quick-clock'));
  updateClock();
  const theme = appearance().theme;
  pane.append(button(theme === 'christmas' ? 'Switch to Original theme' : 'Switch to Christmas theme', () => { setAppearance({ theme: theme === 'christmas' ? 'original' : 'christmas', wallpaper: 'theme' }); renderQuick(); }),
    button(document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen desktop', async () => {
      try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); renderQuick(); }
      catch { notify('Fullscreen is unavailable.'); }
    }), button('Open Settings', () => open('settings')), link('Return to Classic', '/?interface=classic'));
}

for (const [trigger, panel, render] of [['launcherButton', 'launcher', renderLauncher], ['quickButton', 'quickPanel', renderQuick], ['notificationButton', 'notificationPanel', renderNotifications]]) {
  const toggle = $(trigger);
  const popup = $(panel);
  toggle.addEventListener('click', () => {
    const reopen = popup.hidden;
    closePopovers();
    if (!reopen) return;
    render();
    popup.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    lastPopoverTrigger = toggle;
    popup.querySelector('input, button, a')?.focus();
  });
}
$('quickButton').append(icon('settings'));
$('notificationButton').append(icon('os-bell'));
$('showDesktop').append(icon('os-desktop'));
$('showDesktop').addEventListener('click', () => { closePopovers(); manager.showDesktop(); });
$('appSearch').addEventListener('input', renderLauncher);
$('appSearch').addEventListener('keydown', event => { if (event.key === 'Enter') $('launcherApps').querySelector('button')?.click(); });
$('launcher').querySelector('[data-dismiss]').addEventListener('click', () => closePopovers(true));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && document.querySelector('.popover:not([hidden])')) closePopovers(true);
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && window.ZenouConsent?.accepted()) {
    event.preventDefault();
    if ($('launcher').hidden) $('launcherButton').click();
    $('appSearch').focus();
  }
  if (event.shiftKey && event.key === 'F10' && event.target.closest('#workspace') && !event.target.closest('.os-window')) {
    event.preventDefault();
    showDesktopMenu(20, 66);
  }
});
document.addEventListener('pointerdown', event => {
  if (!event.target.closest('.popover, #launcherButton, #quickButton, #notificationButton')) closePopovers();
});
function showDesktopMenu(x, y) {
  closePopovers();
  const menu = $('desktopMenu');
  menu.replaceChildren(button('Change wallpaper', () => open('paper')), button('Desktop settings', () => open('settings')), link('Return to Classic', '/?interface=classic'));
  menu.hidden = false;
  menu.style.left = `${Math.min(x, innerWidth - menu.offsetWidth - 8)}px`;
  menu.style.top = `${Math.min(y, innerHeight - menu.offsetHeight - 8)}px`;
  menu.querySelector('button').focus();
}
$('workspace').tabIndex = 0;
$('workspace').addEventListener('contextmenu', event => {
  if (event.target.closest('.os-window, button')) return;
  event.preventDefault();
  showDesktopMenu(event.clientX, event.clientY);
});

applyAppearance();
updateClock();
setInterval(updateClock, 15000);
renderTasks(new Map());
let started = false;
function start() {
  if (started || !window.ZenouConsent?.accepted()) return;
  started = true;
  write(prefix + 'interface', 'os');
  write(prefix + 'invited', true);
  import('/js/account-sync.js').catch(() => {});
  open('zteam', false);
}
document.addEventListener('zenoumath:consent', start);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
