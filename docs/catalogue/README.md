# Catalogue comparison

The production homepage leads with an agreement dialog. The repository already provides a featured carousel, incremental card rendering, genre and text search, a personal library, a shared settings dialog, configurable navigation keys, an optional OS interface and a player with restart, fullscreen and direct-source actions. The classic interface combines a top masthead with a sidebar. Static files use root-relative paths on a custom domain. The checkout has no GitHub Actions workflows.

The reference homepage redirects to an outer page containing The Bro Blogs. Its navigation includes Games, In Progress, Chat and a disclaimer. Its games route displays a search field, section headings, link cards with availability labels and per-game information. Its public games.json lists 289 game rows and four portals, despite the interface describing all 293 as games. Labels such as WORKING describe the reference operator’s assessment. Its mirror and proxy URLs do not establish publisher permission.

The original ZenouMath catalogue contains 6,565 records. Record IDs, provider fields, launch destinations and declared availability are preserved. Identical names alone cannot establish that two editions or Scratch remixes are the same game. The reference audit records title matches and outstanding source reviews individually.

## Results

| Inventory | Records |
| --- | ---: |
| Original ZenouMath records, preserved field for field | 6,565 |
| Reference game rows | 289 |
| Existing matches by title | 134 |
| Existing matches by edition or alternate name | 14 |
| Alternate host for an existing game | 1 |
| Added direct links to creators, distributors and storefronts | 121 |
| Pending identification, permission or destination verification | 19 |
| Final catalogue IDs | 6,686 |
| New self-hosted game builds | 0 |
| Reference directory destinations linked directly | 4 |

[Reference reconciliation](reference.csv) identifies each row, matching IDs and the reason for each outstanding entry. [ZenouMath catalogue](../../catalog/games.json) contains every original and new game record. The original catalogue designates 13 records as self-hosted, including local launchers which fetch additional content remotely. It has 6,562 records without an availability exception, one external-only entry and two unavailable builds. The updated catalogue has 122 direct-source records. A unique ID identifies a listing. Counting distinct underlying games across Scratch remixes, alternate builds and identically named entries requires additional edition evidence.

The reference request-status table distinguishes failed requests from catalogue entries. Examples include Fallout 2, FC 26 and Shell Shockers. These requests are outside its 289 game rows. The table identifies the Hello Neighbor build as Alpha 4, and the new listing points to that specific release. Direct links open the source site and may lead to a desktop or mobile release. The new listings do not copy game binaries from the reference. The legacy catalogue's licence assertions and embedded sources have not all been independently reverified.

## Changes

- The classic interface opens with a compact top navigation bar and neutral surfaces. Saved theme, density, wallpaper and sidebar choices still apply. The existing services menu provides access to the other sections.
- The main arcade catalogue has compact, standard, large and list layouts. Layout changes update CSS in place and retain search, filters, loaded cards and scroll position. Added records carry an import date for the recently-added sort.
- Settings includes default game layout, sort and launch mode, with access to backups, favourites and recent-history controls. Reset and history clearing require confirmation.
- The frame player starts on Play, records the visit on launch, supports fullscreen and direct-tab preferences, and releases frame resources on navigation. Keyboard actions apply to focused player controls. Local and external launchers keep their existing stable routes.
- The website directory includes four direct portal links, instant search, filtering, saved entries and two layouts. Portal links use normal browser tabs. Existing directory integrations keep their previous behaviour.
- The catalogue changes use the existing vanilla JavaScript, CSS and local storage. No new runtime dependency or hosting workflow was introduced.

## Verification

The existing API suite passed all 64 tests. A local Chromium browser exercised all four catalogue layouts at 390 × 844, 768 × 1024, 1366 × 768, 1440 × 900, 1920 × 1080 and 2560 × 1440. It checked horizontal overflow, persisted layout and search state, Settings focus restoration, the configured quick shortcut inside and outside an input, directory search and saved entries, and a 2048 launch, reload, fullscreen, favourites and recent history. The browser test used a fresh local profile with third-party requests disabled. It does not verify third-party gameplay or authenticated sync.

[Desktop screenshot](catalogue-1440.webp) · [Mobile screenshot](catalogue-390.webp)

Production deployment depends on the outstanding game-launch and source checks. A zero-error local test cannot establish the status of every remote game or a production deployment.
