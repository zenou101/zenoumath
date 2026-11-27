# ZenouMath catalogue upgrade

## Catalogue reconciliation

The starting commit was 81b1958 on main. The existing catalogue contained 6,565 records. Bro Blogs' home.html loaded games.json with two categories. Its displayed count of 293 included four portal links and 289 game listings. The [row-by-row comparison](reference-reconciliation.csv) accounts for all 289 listings, including unresolved editions.

| Disposition | Count | Verification |
| --- | ---: | --- |
| Existing ZenouMath title or edition-name candidate | 147 | Matching IDs are recorded. 41 listings have multiple possible IDs. A matching title alone cannot establish the same executable or licence. |
| Added direct destination | 90 | 80 Poki game pages and 10 portal, creator or storefront pages. Checked title and destination. |
| Awaiting a confirmed source or edition | 52 | Each outstanding title appears in the CSV. No game binary or artwork was copied. |
| Website tiles | 4 | Poki, CrazyGames, Coolmath Games and Classic Games open their destination in a new tab. Three returned HTTP 200. CrazyGames returned 503 during the network check. |

The updated catalogue has 6,655 distinct IDs and 6,552 case-insensitive title strings. Across the original records, 103 titles appear twice. Saved-game and library references use the record ID. These IDs are preserved pending individual edition checks. An exact count of distinct underlying games remains undetermined.

The catalogue labels 13 records self-hosted. Fourteen records have a local launch path, including one publisher launcher. A local launcher can require external assets. The other 6,641 records have remote paths. Launch metadata designates 6,562 entries for a player, 91 for an external link, and two as unavailable. The full starting inventory, including provenance, categories and launch URLs, is available in [the base revision](https://github.com/zenou101/zenoumath/blob/81b19584d9ddc5ced2f9154e14d021e3b44e5270/catalog/games.json).

## Integration comparison

| Feature | Bro Blogs observation | ZenouMath implementation |
| --- | --- | --- |
| Game discovery | Category arrays hold the title, image, description and launch destination. Search filters the categories in memory. | The existing central game catalogue supplies search, categories and the player. A shared directory supplies the same four portal tiles to Games and Apps. |
| Cards | A tile's image and title link to its launch page. Play appears on hover. The separate Info button opens game details. | Game cards have a native link, a launch label, an accessible details dialog, and the existing Play Later control. Keyboard focus exposes the actions. |
| Game dispatch | 144 listings point at iframe.html, 117 at game.html, 22 at flashgame.html, one at self-hosted.html and five use other paths. | Existing local and external player integrations keep their routes and IDs. New listings open verified source pages. |
| Website launch | All four portal tiles send their target through an external proxy service. The public site exposes the outgoing links. The service's backend implementation is unknown. | Direct portal links with new-tab behaviour. ZenouMath's existing Web and quick-switch preferences remain available. |
| Status | The reference renders working, broken and unknown labels. These labels mix its own data and a status component. | Game details use ZenouMath's recorded availability. The reference's votes do not establish current playability. |

## Interface changes

- Four persistent game layouts, two additional sort options, and settings for the preferred launch mode. Recently added uses recorded dates. Undated legacy entries retain their original order.
- Neutral Classic surfaces, compact top navigation and optional expanded navigation. The mobile navigation stays at the top.
- Searchable Apps and websites directory with categories, favourites and grid/list views. Directory preferences participate in library backup.
- Game details, keyboard-accessible controls, confirmed settings reset and a dedicated history clear action. The Web shortcut listener ignores typing, composition and repeated key events.
- Production-domain configuration and existing hosting files were preserved. No game binaries or hosting services were added.

## QA

Desktop and mobile Chromium checks exercised game search, layout changes and persistence, game details, modal settings, the configured Web shortcut during typing and navigation, directory search and favourite persistence, and the local 2048 player with favourites and fullscreen. Catalogue width checks passed at 390×844, 768×1024, 1366×768, 1440×900, 1920×1080 and 2560×1440. The repository API suite passed 64 tests. Local launch paths resolved on disk. External gameplay, every legacy game's licence and gameplay, and Cloudflare's production build require independent confirmation.

[Desktop screenshot](screenshots/catalogue-1440.jpg) · [Mobile screenshot](screenshots/catalogue-390.jpg)
