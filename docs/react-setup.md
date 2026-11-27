# React component layer

This repository is primarily a dependency-free static site. The liquid sculpture hero is a React component, so it lives in an isolated Vite layer and builds to `/hero/` without changing the existing pages or `server/index.mjs`.

## What is installed

- React 19 and React DOM
- TypeScript with strict checking
- Vite with `@vitejs/plugin-react`
- Tailwind CSS v4 through `@tailwindcss/vite`
- shadcn-compatible `components.json`, `lib/utils.ts`, and CSS tokens

## Default paths

The shadcn defaults are used exactly:

| Purpose | Alias | Path |
| --- | --- | --- |
| Components | `@/components` | `components/` |
| UI components | `@/components/ui` | `components/ui/` |
| Utilities | `@/lib/utils` | `lib/utils.ts` |
| Global styles | — | `src/index.css` |

The `ui` alias must point to `components/ui` because shadcn's CLI writes new primitives there and generated imports expect `@/components/ui/*`. Keeping the default folder means `npx shadcn@latest add ...` can add components without rewriting imports. This project already has that folder.

## Run the homepage

```bash
npm install
npm run hero:dev
```

The React homepage is served at `http://localhost:5173/hero/`. It is composed in `hero-app/Home.tsx`; `main.tsx` only mounts it. There is no separate demo wrapper.

To type-check and build the static route:

```bash
npm run typecheck
npm run hero:build
```

The build writes `hero/index.html` and hashed assets. The existing Node server then serves the page at `/hero/`.

## Starting a new shadcn project

If this were an empty project, the equivalent setup would be:

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
npm install tailwindcss @tailwindcss/vite
npx shadcn@latest init
npx shadcn@latest add button
```

For a Next.js project, use `npx create-next-app@latest` instead, then run `npx shadcn@latest init`. The component includes `"use client"` because it uses browser APIs, WebGL2, refs and effects.

## Assets and fonts

The component imports its four flat-background sculpture images from `components/ui/assets/`, so `<SculptureHero />` renders the intended sculpture with default props. Vite fingerprints the images into `hero/assets/` at build time. The component falls back to the static image when WebGL2 is unavailable. Both image and font URLs can still be overridden with props.

When changing the default image, use a flat-background image (or a transparent PNG/WebP) with CORS enabled. A full scene photo renders as a rectangle and defeats the image-particle cross-fade.

## Icons

Sun, moon and arrow icons come from `lucide-react`. The component's own navigation, cursor hint and credit remain part of the source design.
