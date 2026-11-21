import { getSupabaseClient } from './supabase.js';

const keys = ['zenou_fav', 'zenou_recent', 'zenou_ratings', 'zenou_notes', 'zenou_playtime', 'zenou_hidden', 'zenou_playlists', 'zenou_xp', 'zenou_ach', 'zenou_days'];
const ownerKey = 'zenou_cloud_owner';
let client;
let user;
let sessionId;
let baseline = {};
let busy = false;
let status = 'Connecting…';
const read = key => JSON.parse(localStorage.getItem(key) || 'null');
const snapshot = () => Object.fromEntries(keys.map(key => [key, read(key)]));
const cacheKey = id => 'zenou_cloud_cache_' + id;
function report(message) {
  status = message;
  document.querySelectorAll('[data-cloud-status]').forEach(el => { el.textContent = message; });
}
function apply(data) {
  let changed = false;
  for (const key of keys) {
    const next = data[key] == null ? null : JSON.stringify(data[key]);
    if (localStorage.getItem(key) === next) continue;
    changed = true;
    if (next === null) localStorage.removeItem(key);
    else localStorage.setItem(key, next);
  }
  return changed;
}

export async function saveLibrary() {
  if (!user || busy) return;
  if (localStorage.getItem(ownerKey) !== user.id) { location.reload(); return; }
  busy = true;
  try {
    const current = snapshot();
    const dirty = keys.filter(key => JSON.stringify(current[key]) !== JSON.stringify(baseline[key]));
    localStorage.setItem(cacheKey(user.id), JSON.stringify({ baseline, current }));
    if (!dirty.length) return;
    report('Saving library…');
    const { error } = await client.from('user_library').upsert(dirty.map(key => ({ user_id: user.id, key, value: current[key], updated_at: new Date().toISOString() })), { onConflict: 'user_id,key' });
    if (error) throw error;
    for (const key of dirty) baseline[key] = current[key];
    localStorage.setItem(cacheKey(user.id), JSON.stringify({ baseline, current: snapshot() }));
    report('Library synced');
  } catch {
    report('Cloud save pending. Your changes are saved on this device. Check the connection and database setup.');
  } finally { busy = false; }
}

async function initialize(session) {
  user = null;
  sessionId = session?.user?.id;
  if (!session?.user) {
    if (localStorage.getItem(ownerKey)) {
      const previous = localStorage.getItem(ownerKey);
      const cached = read(cacheKey(previous));
      if (cached) localStorage.setItem(cacheKey(previous), JSON.stringify({ baseline: cached.baseline, current: snapshot() }));
      apply(read('zenou_guest_library') || {});
      localStorage.removeItem(ownerKey);
      location.reload();
      return;
    }
    report('Sign in to sync your library');
    return;
  }
  const id = session.user.id;
  const owner = localStorage.getItem(ownerKey);
  if (!owner) localStorage.setItem('zenou_guest_library', JSON.stringify(snapshot()));
  const cached = read(cacheKey(id));
  const current = owner === id ? snapshot() : cached?.current;
  report('Loading your library…');
  const { data, error } = await client.from('user_library').select('key,value').eq('user_id', id);
  if (error) {
    report('Cloud sync needs the database setup or a working connection. Retry from your account page.');
    return;
  }
  const remote = Object.fromEntries(data.filter(row => keys.includes(row.key)).map(row => [row.key, row.value]));
  baseline = { ...remote };
  let merged = { ...remote };
  if (cached && current) {
    for (const key of keys) {
      if (JSON.stringify(current[key]) !== JSON.stringify(cached.baseline[key])) merged[key] = current[key];
    }
  } else if (!data.length) merged = current || read('zenou_guest_library') || {};
  const changed = apply(merged);
  localStorage.setItem(ownerKey, id);
  localStorage.setItem(cacheKey(id), JSON.stringify({ baseline, current: snapshot() }));
  user = session.user;
  report('Library synced');
  await saveLibrary();
  if (changed) location.reload();
}

export const ready = (async () => {
  try {
    client = await getSupabaseClient();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    await initialize(data.session);
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.id !== sessionId) location.reload();
      if (event === 'SIGNED_OUT') setTimeout(() => initialize(null), 0);
    });
    setInterval(saveLibrary, 2500);
    window.addEventListener('online', saveLibrary);
    document.addEventListener('visibilitychange', () => {
      if (user) localStorage.setItem(cacheKey(user.id), JSON.stringify({ baseline, current: snapshot() }));
      if (document.visibilityState === 'hidden') saveLibrary();
    });
    return client;
  } catch {
    report('Accounts are unavailable. Check your connection and try again.');
    return null;
  }
})();

export function showSyncStatus() { report(status); }
