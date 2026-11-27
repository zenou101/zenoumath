/** Small dependency-free helpers shared by navigation and saved-game UI. */

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
