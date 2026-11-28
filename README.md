<div align="center">

<img src="assets/favicon.svg" width="84" height="84" alt="ZenouMath icon">

# ZenouMath

**A browser arcade for games, films and books.**

Browse 6,843 games by genre, shuffle the catalogue when you can't pick, or save a title for later. The same page also hosts the film and TV catalogue, books and web tools.

[![Website](https://img.shields.io/badge/site-stop--smoking--campaign.pages.dev-365781)](https://stop-smoking-campaign.pages.dev/)
[![Local server](https://img.shields.io/badge/local%20server-Node.js%2020%2B-39724a)](package.json)
[![Licence](https://img.shields.io/badge/licence-all%20rights%20reserved-545968)](LICENSE)

[**Open the arcade**](https://stop-smoking-campaign.pages.dev/) · [Explore](#explore) · [Run locally](#run-locally)

</div>

[![Arcade Discover with the game spotlight, featured games and genre navigation](docs/screenshots/arcade.webp)](docs/screenshots/arcade.webp)

## Explore

| Where to go | What you can do |
| --- | --- |
| [**All games**](https://stop-smoking-campaign.pages.dev/?all=1) | Search for a title, browse a genre or use **Shuffle** to pick your next game. |
| [**Play Later and favourites**](https://stop-smoking-campaign.pages.dev/) | Keep a **Play Later** queue, reopen recently played games, and organise favourites, playlists, ratings and notes. An optional username account syncs them across browsers. |
| **Media** | Browse [books and manga](https://stop-smoking-campaign.pages.dev/books/) or look up [films and TV shows](https://stop-smoking-campaign.pages.dev/movies/). Playback depends on the external provider. |
| **Tools** | Open the [web tools](https://stop-smoking-campaign.pages.dev/web/), run a [site search](https://stop-smoking-campaign.pages.dev/search/) or check where content comes from on the [sources page](https://stop-smoking-campaign.pages.dev/sources/). |

## Run locally

The arcade is built with HTML, CSS and JavaScript. The included Node.js server serves the site and its media API. Use **Node.js 20 or newer**.

```bash
git clone https://github.com/zenou101/zenoumath.git
cd zenoumath
npm start
```

Open **http://127.0.0.1:8123**. You can browse the arcade without an API key. For live TMDB movie and TV metadata, copy [.env.example](.env.example) to `.env`, set `TMDB_READ_TOKEN` or `TMDB_API_KEY`, and restart the server.

### Development

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local server and restart it when server code changes. |
| `npm test` | Exercise the media API against local test data. |
| `node scripts/audit.mjs` | Check internal links and sitemap routes while the local server is running. |

### Project layout

| Path | Contents |
| --- | --- |
| [`arcade.js`](arcade.js) and [`catalog/`](catalog/) | Discover page behaviour and the catalogues used across the site |
| [`js/`](js/) and [`css/`](css/) | Shared browser features, account sync and styles |
| [`server/`](server/) and [`scripts/`](scripts/) | Local HTTP server, media API and project checks |

## Copyright and usage

**© 2026 ZenouMath / zenou101. All rights reserved.** The original code and assets are published for viewing and reference. Reuse, modification and redistribution require prior written permission, subject to applicable law and GitHub's Terms of Service. Third-party games, embeds, logos and trademarks retain their respective owners' rights. See the [licence](LICENSE).

ZenouMath is independent of schools and education authorities. [Site terms and privacy](https://stop-smoking-campaign.pages.dev/legal/) · [Report an issue](https://github.com/zenou101/zenoumath/issues).
