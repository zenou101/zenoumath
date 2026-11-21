// Browser configuration. Supabase publishable keys are intended for public clients.
export const supabaseUrl = 'https://vwtrfagrwpgzlwoghoaa.supabase.co';
export const publishableKey = 'sb_publishable_U_XclcLxh4ppJ5hgd3ByQA_YN8uCf1s';
const sdkUrl = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.2/+esm';

let clientPromise;

export function getSupabaseClient() {
  if (!clientPromise) {
    clientPromise = import(sdkUrl)
      .then(({ createClient }) => {
        const client = createClient(supabaseUrl, publishableKey);
        window.zenouSupabase = client;
        return client;
      })
      .catch(error => {
        clientPromise = null;
        throw error;
      });
  }
  return clientPromise;
}

export async function checkSupabaseConnection() {
  await getSupabaseClient();
  const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
    headers: { apikey: publishableKey },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw new Error(`Supabase returned HTTP ${response.status}.`);
  }
  const settings = await response.json();
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    throw new Error('Supabase returned an unexpected response.');
  }
  return true;
}
