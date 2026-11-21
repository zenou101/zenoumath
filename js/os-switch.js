import { icon, prefix, read, write } from '/os/shared.js';

const interfaceKey = prefix + 'interface';
const invitationKey = prefix + 'invited';
const topLevel = window.top === window;
function enter() {
  write(interfaceKey, 'os');
  write(invitationKey, true);
  location.assign('/os/');
}
function invite(force = false) {
  if (!topLevel || !window.ZenouConsent?.accepted() || document.querySelector('.os-invite') || (!force && read(invitationKey, false))) return;
  write(invitationKey, true);
  const dialog = document.createElement('dialog');
  dialog.className = 'os-invite';
  dialog.setAttribute('aria-labelledby', 'osInviteTitle');
  dialog.innerHTML = `
    <img src="/assets/zenouos/christmas.webp" alt="" width="480" height="162">
    <div class="os-invite-copy">
      <h2 id="osInviteTitle">Introducing ZenouOS <small>Beta</small></h2>
      <p>Open your game library, browse the web and customize your desktop. You can return to Classic anytime.</p>
      <form method="dialog">
        <button class="btn btn-ghost" autofocus>Maybe later</button>
        <button class="btn btn-solid" type="button" data-enter-os>Try ZenouOS Beta</button>
      </form>
    </div>`;
  dialog.querySelector('[data-enter-os]').onclick = enter;
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  document.body.append(dialog);
  dialog.showModal();
}
function start() {
  const home = location.pathname === '/';
  const url = new URL(location.href);
  if (home && url.searchParams.get('interface') === 'classic') {
    url.searchParams.delete('interface');
    history.replaceState(history.state, '', url);
  } else if (topLevel && home && !url.search && !url.hash && window.ZenouConsent?.accepted() && read(interfaceKey, '') === 'os') {
    location.replace('/os/');
    return;
  }
  const nav = document.querySelector('.za-scroll .za-group nav');
  if (nav && !nav.querySelector('[href="/os/"]')) {
    const link = document.createElement('a');
    link.href = '/os/';
    link.append(icon('os-desktop'), 'ZenouOS Beta');
    nav.append(link);
  }
  if (topLevel) {
    document.addEventListener('zenoumath:consent', () => invite());
    if (window.ZenouConsent?.accepted()) invite();
  }
}
document.addEventListener('click', event => {
  if (!event.target.closest('[data-os-invitation]')) return;
  document.querySelector('.settings-overlay[open]')?.close();
  invite(true);
});
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
