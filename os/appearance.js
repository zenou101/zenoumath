import { el, prefix, read, write } from './shared.js';

const key = prefix + 'appearance';
const defaults = { theme: 'christmas', wallpaper: 'theme', accent: '', fit: 'cover', position: 'center', motion: true, snow: false, sound: false };
export const wallpapers = [
  { id: 'christmas', name: 'Christmas Valley', category: 'Nature', url: '/assets/zenouos/christmas.webp' },
  { id: 'original', name: 'Liquid Chrome', category: 'Abstract', url: '/assets/wallpapers/liquid-chrome.png' },
  { id: 'blue-glass', name: 'Blue Glass', category: 'Abstract', url: '/art/zenou-glass.webp' },
  { id: 'purple-eye', name: 'Saskue v2', category: 'Anime', url: '/assets/wallpapers/purple-eye.png' },
  { id: 'red-silhouette', name: 'Red Man', category: 'Dark', url: '/assets/wallpapers/red-silhouette.png' },
  { id: 'light-and-shadow', name: 'Lumina', category: 'Minimal', url: '/assets/wallpapers/light-and-shadow.png' },
  { id: 'hooded-shadow', name: 'Eyes in the Darkness', category: 'Dark', url: '/assets/wallpapers/hooded-shadow.png' },
];
let db;
let generation = 0;
let video;
let objectUrl;
let animatedImage = false;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
export const appearance = () => ({ ...defaults, ...read(key, {}) });

function database() {
  db ||= new Promise((resolve, reject) => {
    const request = indexedDB.open('zenouos-wallpapers', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('uploads', { keyPath: 'id' });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  }).catch(error => { db = null; throw error; });
  return db;
}

async function uploadRequest(mode, request) {
  const store = await database();
  const tx = store.transaction('uploads', mode);
  const result = request(tx.objectStore('uploads'));
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(result.result);
    tx.onabort = () => reject(tx.error);
  });
}
export const uploadedWallpapers = () => uploadRequest('readonly', store => store.getAll());
export function addWallpaper(file) {
  if (!/^image\/(jpeg|png|webp|gif|avif)$|^video\/(mp4|webm)$/.test(file.type) || file.size > 25 * 1024 * 1024) {
    throw new Error('Choose an image or MP4/WebM file up to 25 MB.');
  }
  const id = crypto.randomUUID();
  return uploadRequest('readwrite', store => store.put({ id, name: file.name, category: 'Uploaded', file }));
}
export async function removeWallpaper(id) {
  await uploadRequest('readwrite', store => store.delete(id));
  if (appearance().wallpaper === id) setAppearance({ wallpaper: 'theme' });
}

function updateMotion() {
  const on = appearance().motion && !document.hidden && !reduced.matches;
  document.documentElement.dataset.osMotion = on ? 'on' : 'off';
  if (animatedImage) {
    if (on) document.documentElement.style.setProperty('--wall', `url(${objectUrl})`);
    else document.documentElement.style.removeProperty('--wall');
  }
  if (video) {
    if (on) video.play().catch(() => {});
    else video.pause();
  }
}

export async function applyAppearance() {
  const current = ++generation;
  const prefs = appearance();
  const root = document.documentElement;
  root.dataset.osTheme = prefs.theme;
  root.toggleAttribute('data-os-snow', Boolean(prefs.snow));
  if (/^#[\da-f]{6}$/i.test(prefs.accent)) root.style.setProperty('--accent', `color-mix(in srgb, ${prefs.accent}, white 45%)`);
  else root.style.removeProperty('--accent');
  root.style.setProperty('--wall-fit', prefs.fit === 'contain' ? 'contain' : 'cover');
  root.style.setProperty('--wall-position', ['center', 'top', 'bottom', 'left', 'right'].includes(prefs.position) ? prefs.position : 'center');
  const target = document.getElementById('wallpaper');
  if (video) video.pause();
  target.replaceChildren();
  video = null;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = null;
  animatedImage = false;
  root.style.removeProperty('--wall');
  updateMotion();
  const chosen = wallpapers.find(item => item.id === prefs.wallpaper);
  if (chosen) root.style.setProperty('--wall', `url(${chosen.url})`);
  else if (prefs.wallpaper !== 'theme') {
    const item = await uploadRequest('readonly', store => store.get(prefs.wallpaper)).catch(() => null);
    if (current !== generation || !item?.file) return;
    if (item.file.type.startsWith('video/') && (!prefs.motion || reduced.matches)) return;
    objectUrl = URL.createObjectURL(item.file);
    if (item.file.type.startsWith('video/')) {
      video = el('video');
      video.src = objectUrl;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';
      target.append(video);
    } else if (item.file.type === 'image/gif') {
      animatedImage = true;
    } else {
      root.style.setProperty('--wall', `url(${objectUrl})`);
    }
  }
  updateMotion();
}

export function setAppearance(changes) {
  const saved = write(key, { ...appearance(), ...changes });
  if (saved) {
    applyAppearance();
    window.dispatchEvent(new Event('zenouos:appearance'));
  }
  return saved;
}
export function resetAppearance() { return setAppearance(defaults); }

document.addEventListener('visibilitychange', updateMotion);
reduced.addEventListener('change', applyAppearance);
