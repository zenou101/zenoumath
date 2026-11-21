// Refresh the GN-Math catalog while preserving existing game IDs and sources.
// node scripts/import-gn-math.mjs [path-to-downloaded-zones.json]
import fs from 'node:fs/promises';

const revisions = {
  assets: '6bacc0f4e61e95e6a4e4309a63b189e179d91e34',
  html: '63c1608976000f23e4466c6d3b58f283149eeff5',
  covers: '67baf382659b6b386371fdb2f5c56bcc9b5174eb',
};
const source = `https://raw.githubusercontent.com/gn-math/assets/${revisions.assets}/zones.json`;
const catalogPath = new URL('../catalog/games.json', import.meta.url);
const manifestPath = new URL('../catalog/manifest.json', import.meta.url);

let zones;
if (process.argv[2]) {
  zones = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
} else {
  const response = await fetch(source, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`GN-Math catalog returned HTTP ${response.status}`);
  zones = await response.json();
}
if (!Array.isArray(zones)) throw new Error('GN-Math catalog must be an array');
const playable = zones.filter(zone => Number.isInteger(zone.id) && zone.id >= 0);
if (!playable.length) throw new Error('GN-Math catalog has no games');
const seen = new Set();
const imported = playable.map(zone => {
  if (seen.has(zone.id)) throw new Error(`Duplicate GN-Math game ${zone.id}`);
  seen.add(zone.id);
  if (!zone.name || !/^\{HTML_URL\}\/[\w.-]+\.html(?:-a)?$/.test(zone.url)
    || !/^\{COVER_URL\}\/[\w.-]+$/.test(zone.cover)) {
    throw new Error(`Invalid GN-Math entry ${zone.id}`);
  }
  return {
    id: `gn-${zone.id}`,
    t: zone.name,
    cs: ['gn-math'],
    s: 'gn-math',
    p: 'gn-math',
    a: zone.author || 'GN-Math',
    // Non-HTML filename extensions use GN-Math's own player route.
    u: zone.url.endsWith('.html')
      ? zone.url.replace('{HTML_URL}', `https://raw.githack.com/gn-math/html/${revisions.html}`)
      : `https://gn-math.dev/#${zone.id}`,
    g: `https://gn-math.dev/#${zone.id}`,
    img: zone.cover.replace('{COVER_URL}', `https://raw.githubusercontent.com/gn-math/covers/${revisions.covers}`),
    note: `Play ${zone.name}, from the GN-Math catalog.`,
    dep: 'GN-Math browser build. Availability depends on its external host.',
  };
});
const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'));
const games = [...catalog.games.filter(game => game.p !== 'gn-math'), ...imported];
if (new Set(games.map(game => game.id)).size !== games.length) throw new Error('Duplicate game IDs');
catalog.v = '2026-11-21';
catalog.games = games;
const count = field => Object.fromEntries([...new Set(games.map(game => game[field]))]
  .map(value => [value, games.filter(game => game[field] === value).length]));
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
manifest.build = new Date().toISOString();
manifest.totals = {
  entries: games.length,
  embeddedEntries: games.filter(game => !game.availability).length,
  ...count('p'),
  ...count('s'),
  externalOnly: games.filter(game => game.availability === 'external').length,
};
manifest.verification.method = 'Catalog entries provide embedded player launch URLs. External hosts control availability. The GN-Math source file audit is recorded separately.';
manifest.gnMath = { source, revisions, entries: imported.length, imported: '2026-11-21',
  verification: 'All imported HTML filenames were matched against the source repository tree. Full gameplay and external embed availability require browser verification.' };
await fs.writeFile(catalogPath, JSON.stringify(catalog) + '\n');
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Imported ${imported.length} GN-Math games. Catalog now contains ${games.length} entries.`);
