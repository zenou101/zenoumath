import { supabaseUrl, publishableKey } from './supabase.js';
const sessionKey = 'zenou_username_session';
export async function rpc(name, args) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST', headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(args), signal: AbortSignal.timeout(20000), cache: 'no-store',
  });
  const result = await response.json();
  if (!response.ok || result?.error) throw new Error(result?.error || (response.status === 404 ? 'Account setup is pending. Please try again later.' : 'Could not complete the request. Please try again.'));
  return result;
}
const token = () => localStorage.getItem(sessionKey) || '';
const client = {
  auth: {
    async getSession() {
      if (!token()) return { data: { session: null } };
      const result = await rpc('zenou_auth', { action: 'session', token: token() });
      if (!result.user) { localStorage.removeItem(sessionKey); return { data: { session: null } }; }
      return { data: { session: { user: result.user } } };
    },
    async authenticate(action, username, password) {
      const result = await rpc('zenou_auth', { action, username, password });
      if (action === 'register') {
        // Existing Supabase JWTs prove ownership of a previous cloud library.
        let previous;
        try { previous = JSON.parse(localStorage.getItem('sb-vwtrfagrwpgzlwoghoaa-auth-token') || 'null'); } catch { /* Ignore an unreadable legacy session. */ }
        if (previous?.access_token) {
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/zenou_migrate_library`, {
            method: 'POST', headers: { apikey: publishableKey, Authorization: `Bearer ${previous.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: result.token }), signal: AbortSignal.timeout(20000),
          });
          if (!response.ok) {
            localStorage.setItem(sessionKey, result.token);
            throw new Error('Account created. Your previous library could not transfer. Sign in with your new username and import your library backup.');
          }
          localStorage.removeItem('sb-vwtrfagrwpgzlwoghoaa-auth-token');
        }
      }
      localStorage.setItem(sessionKey, result.token);
      return result;
    },
    async signOut() {
      await rpc('zenou_auth', { action: 'logout', token: token() });
      localStorage.removeItem(sessionKey);
      return {};
    },
  },
  async readLibrary() { return rpc('zenou_library', { token: token() }); },
  async writeLibrary(changes) { return rpc('zenou_library', { token: token(), changes }); },
};
export async function getUsernameClient() { return client; }

window.addEventListener('storage', event => {
  if (event.key === sessionKey) location.reload();
});
