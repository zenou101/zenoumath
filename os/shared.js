export const prefix = 'zenouos.';
export function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
export function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}
export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
export function icon(name) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const use = document.createElementNS(node.namespaceURI, 'use');
  node.setAttribute('viewBox', '0 0 24 24');
  node.setAttribute('aria-hidden', 'true');
  use.setAttribute('href', '/assets/ui-icons.svg#' + name);
  node.append(use);
  return node;
}
export function button(label, run, className = 'os-button') {
  const node = el('button', className, label);
  node.type = 'button';
  node.addEventListener('click', run);
  return node;
}
export function iconButton(label, name, run) {
  const node = button('', run, 'icon-button');
  node.title = label;
  node.setAttribute('aria-label', label);
  node.append(icon(name));
  return node;
}
export function appIcon(app) {
  const node = el('span', 'app-icon');
  node.dataset.tint = app.tint || 'green';
  node.append(icon(app.icon));
  return node;
}
export function link(label, href, newTab = false) {
  const node = el('a', 'os-button', label);
  node.href = href;
  if (newTab) { node.target = '_blank'; node.rel = 'noopener'; }
  return node;
}
export function artwork(source, className, alt = '') {
  const image = el('img', className);
  image.alt = alt;
  image.loading = 'lazy';
  image.decoding = 'async';
  image.addEventListener('error', () => image.remove(), { once: true });
  if (source) image.src = source;
  else image.hidden = true;
  return image;
}
