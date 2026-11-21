import { rpc } from './username-auth.js';
import { ready, saveLibrary, showSyncStatus } from './account-sync.js';

const form = document.getElementById('accountForm');
const message = document.getElementById('accountMessage');
const signedIn = document.getElementById('accountSignedIn');
const client = await ready;
showSyncStatus();
if (!client) {
  form.querySelectorAll('button').forEach(button => { button.disabled = true; });
} else {
  form.querySelectorAll('button').forEach(button => { button.disabled = false; });
  const { data } = await client.auth.getSession();
  form.hidden = !!data.session;
  signedIn.hidden = !data.session;
  document.getElementById('accountIdentity').textContent = data.session?.user.username || '';
}
async function authenticate(create) {
  if (!client || !form.reportValidity()) return;
  if (new TextEncoder().encode(document.getElementById('accountPassword').value).length > 72) { message.textContent = 'Password must be at most 72 bytes.'; return; }
  form.querySelectorAll('button').forEach(button => { button.disabled = true; });
  message.textContent = create ? 'Creating your account…' : 'Signing in…';
  try {
    const username = document.getElementById('accountUsername').value.trim().toLowerCase();
    const password = document.getElementById('accountPassword').value;
    await client.auth.authenticate(create ? 'register' : 'login', username, password);
    document.getElementById('accountPassword').value = '';
    location.reload();
  } catch (error) { message.textContent = error.message || 'Could not sign in. Try again.'; }
  finally { form.querySelectorAll('button').forEach(button => { button.disabled = false; }); }
}
form.addEventListener('submit', event => { event.preventDefault(); authenticate(false); });
document.getElementById('accountCreate').addEventListener('click', () => authenticate(true));
document.getElementById('accountSync').addEventListener('click', async event => {
  event.target.disabled = true;
  await saveLibrary();
  location.reload();
});
document.getElementById('accountSignOut').addEventListener('click', async event => {
  event.target.disabled = true;
  try {
    await saveLibrary();
    const { error } = await client.auth.signOut();
    if (error) throw error;
    location.reload();
  } catch (error) {
    message.textContent = error.message || 'Could not sign out. Try again.';
    event.target.disabled = false;
  }
});

let availabilityRequest = 0;
document.getElementById('accountUsername').addEventListener('blur', async event => {
  const field = event.target;
  if (!field.checkValidity()) return;
  const request = ++availabilityRequest;
  const name = field.value.trim().toLowerCase();
  try {
    const result = await rpc('zenou_auth', { action: 'available', username: name });
    if (request !== availabilityRequest || field.value.trim().toLowerCase() !== name) return;
    document.getElementById('usernameHint').textContent = result.available ? 'Available for a new account.' : 'Username registered. Sign in or choose another to create an account.';
  } catch { document.getElementById('usernameHint').textContent = 'Availability will be checked when you create your account.'; }
});
