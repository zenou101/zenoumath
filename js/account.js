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
  document.getElementById('accountIdentity').textContent = data.session?.user.email || '';
}
async function authenticate(create) {
  if (!client || !form.reportValidity()) return;
  form.querySelectorAll('button').forEach(button => { button.disabled = true; });
  message.textContent = create ? 'Creating your account…' : 'Signing in…';
  try {
    const credentials = { email: document.getElementById('accountEmail').value.trim(), password: document.getElementById('accountPassword').value };
    const result = create
      ? await client.auth.signUp({ ...credentials, options: { emailRedirectTo: location.origin + '/account/' } })
      : await client.auth.signInWithPassword(credentials);
    if (result.error) throw result.error;
    document.getElementById('accountPassword').value = '';
    if (result.data.session) location.reload();
    else message.textContent = 'Check your email to confirm your account, then sign in here.';
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
