/**
 * Build the legal centre.
 *
 * The shell (header, nav, footer, cross-links, version stamp) is written once
 * here; the documents themselves live in scripts/legal-docs.mjs. Run from the
 * repo root:
 *
 *   node scripts/build-legal.mjs
 *
 * Output: legal/index.html and legal/<slug>/index.html for each document.
 *
 * Editorial rules baked into the copy:
 *   · nothing untrue is asserted — no claimed accreditation, no claimed
 *     licence, no claimed safe-harbour protection;
 *   · every fact only the operator can supply is a [BRACKETED PLACEHOLDER];
 *   · rights that cannot lawfully be excluded (Australian Consumer Law) are
 *     never excluded.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DOCS } from './legal-docs.mjs';

const ROOT = process.cwd();
const DOMAIN = 'https://stop-smoking-campaign.pages.dev';
const UPDATED = '7 November 2026';
const VERSION = '2026-11-07';

const homePage = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const sidebar = homePage.match(/<aside class="za-rail"[\s\S]*?<\/aside>/)?.[0]
  .replace(' aria-current="page"', '');
if (!sidebar) throw new Error('The homepage sidebar is missing.');

function shell(doc) {
  const crossNav = DOCS.map(d => `<a href="/legal/${d.slug}">${d.label}</a>`).join('\n      ');
  const canonical = doc.slug ? `${DOMAIN}/legal/${doc.slug}` : `${DOMAIN}/legal`;

  const toc = doc.toc
    ? `  <nav class="legal-toc" aria-label="On this page">
    <h2>On this page</h2>
    <ol>
${doc.toc.map(([id, label]) => `      <li><a href="#${id}">${label}</a></li>`).join('\n')}
    </ol>
  </nav>`
    : '';

  const status = doc.status === false
    ? ''
    : `  <div class="legal-status">
    <strong>Working draft, not legal advice.</strong> This document describes what the site actually does rather than copying a template. Items in <code>[SQUARE BRACKETS]</code> are facts only the operator can supply and must be completed before this page is relied on. <a href="/legal/contact#review">What needs review</a>.
  </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>try{if(!localStorage.getItem('zenoumath.consent'))document.documentElement.classList.add('consent-pending')}catch(e){document.documentElement.classList.add('consent-pending')}setTimeout(function(){document.documentElement.classList.remove('consent-pending')},3000)</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<script>try{var r=document.documentElement,p=JSON.parse(localStorage.getItem('zenou_prefs')||'{}');var t=p.theme;if(t)r.dataset.theme=t;['glow','radius','density','bg','motion'].forEach(function(k){if(p[k])r.dataset[k]=p[k]})}catch(e){}</script>
<title>${doc.title}</title>
<meta name="description" content="${doc.desc}">
<meta name="theme-color" content="#07080e">
<link rel="canonical" href="${canonical}">
<meta property="og:site_name" content="ZenouMath">
<meta property="og:type" content="article">
<meta property="og:title" content="${doc.title}">
<meta property="og:description" content="${doc.desc}">
<meta property="og:url" content="${canonical}">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/assets/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="/assets/logo-192.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75..125,400..900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/style.css">
<link rel="stylesheet" href="/css/plus.css">
<link rel="stylesheet" href="/css/legal.css">
<link rel="stylesheet" href="/css/consent.css">
<link rel="stylesheet" href="/css/arcade-shell.css">
<link rel="stylesheet" href="/css/accent.css">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6508074092345504" crossorigin="anonymous"></script>
<link rel="stylesheet" href="/css/interface.css">
</head>
<body data-arcade-page="legal">
${sidebar}

<header class="topbar">
  <div class="za-crumb"><a href="/">Arcade</a><i aria-hidden="true">/</i><a href="/legal">Legal</a></div>
  <div class="bar-tools">
    <form class="searchbox" role="search" action="/search" method="get">
      <svg class="icon ui-icon" viewBox="0 0 24 24" aria-hidden="true"><use href="/assets/ui-icons.svg#search"/></svg>
      <input name="q" type="search" placeholder="Search everything…" aria-label="Search everything">
    </form>
  </div>
</header>

<main class="legal-main">
  <header class="legal-head">
    <p class="legal-kicker">${doc.kicker || 'Legal'}</p>
    <h1>${doc.h1}</h1>
    <p>${doc.intro}</p>
  </header>
${status}
${toc}
  <div class="legal-body">
${doc.body}
  </div>

  <p class="legal-foot">Version ${VERSION}. Last updated ${UPDATED}. ZenouMath is an independent study site: not a school, not accredited, and not affiliated with any school, university or education authority.</p>

  <nav class="legal-nav" aria-label="Legal documents">
      ${crossNav}
  </nav>
</main>

<footer class="za-footer"><a href="/">Zenou Arcade</a><nav aria-label="Site information"><a href="/doorway/">Doorways</a><a href="/sources/">Movie sources</a><a href="/legal/">Legal centre</a><a href="/legal/privacy/">Privacy</a><a href="/legal/contact/">Contact</a><a href="/legal/" data-consent-review>Use agreement</a><a href="https://github.com/zenou101">GitHub</a></nav></footer>

<script src="/js/atmosphere.js" defer></script>
<script src="/js/settings.js" defer></script>
<script src="/js/zenou-plus.js" defer></script>
<script src="/js/consent.js" defer></script>
</body>
</html>
`;
}

/* Clean out any flat file that would shadow a directory index, so re-running
   this script can never reintroduce the redirect loop. */
if (fs.existsSync(path.join(ROOT, 'legal'))) {
  for (const entry of fs.readdirSync(path.join(ROOT, 'legal'))) {
    if (entry.endsWith('.html')) {
      fs.rmSync(path.join(ROOT, 'legal', entry), { force: true });
      console.log(`  removed shadow ${entry}`);
    }
  }
}

for (const doc of DOCS) {
  const dir = doc.slug ? path.join(ROOT, 'legal', doc.slug) : path.join(ROOT, 'legal');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), shell(doc));
  console.log(`  ${doc.slug ? '/legal/' + doc.slug : '/legal'}`);
}

/* No flat .html shadows are written here.

   GitHub Pages resolves an extensionless URL by trying `NAME`, then
   `NAME.html`, then `NAME/index.html` — the flat file wins over the directory
   index. A `legal/terms.html` stub therefore hijacks `/legal/terms`, and when
   that stub redirects back to `/legal/terms` the result is a redirect loop in
   the address bar. The same trap applies to every page on this site, so the
   rule is absolute: one address, one file, and it is always
   `<slug>/index.html`. Old flat addresses 404 into the site's own page. */
console.log(`built ${DOCS.length} legal pages (version ${VERSION})`);
