# own-repos-curator-data

This is a static site for visualizing `repos.json`. For local development, it uses `Vite` to quickly preview updates to `repos.json` and `src/**/*.ts` on the development server.

## Prerequisites

- Node.js 20 or later + npm
- Or Bun

Note:
The development server uses `Vite`, and CI builds use `npm run build`. Bun can be used as an alternative runtime and package manager for local development.

## Getting Started with npm

Install dependencies:

```powershell
npm ci
```

Development server with hot reload:

```powershell
npm run dev
```

By default, Vite runs at `http://localhost:5173`. Even if Codex CLI updates `src/main.ts` or `src/render.ts`, the changes will be reflected on this server.

Production build:

```powershell
npm run build
```

Preview built artifacts locally:

```powershell
npm run preview
```

Type checking:

```powershell
npm run typecheck
```

Output:

- `dist/`

## Getting Started with Bun

Install dependencies:

```powershell
bun install
```

Development server with hot reload:

```powershell
bun run dev
```

Production build:

```powershell
bun run build
```

Preview built artifacts locally:

```powershell
bun run preview
```

Type checking:

```powershell
bun run typecheck
```

## Building with the CI Workflow

If you want to try the same workflow locally as GitHub Actions, you can also build with the following:

```powershell
python scripts/build.py
```

This script internally executes the following:

```powershell
npm ci
npm run build
```

## Hot Reload Targets

- `src/main.ts`
- `src/render.ts`
- `src/styles.css`
- `index.html`
- `repos.json`

Note:
`repos.json` is directly imported from `src/main.ts`. If Codex CLI updates TypeScript or CSS while `npm run dev` / `bun run dev` is running, changes will be reflected via Vite's HMR or automatic reload.

## Compatibility with Local and GitHub Pages

- For local development: `npm run dev` / `bun run dev`
- To preview built artifacts locally: `npm run preview` / `bun run preview`
- Production deliverables: `dist/`
- `npm run build` uses `vite build --base ./`, which makes asset paths in `dist/index.html` relative, allowing it to work directly on GitHub Pages.

## How to Check

- During development: In a browser, `http://localhost:5173`
- After build: `dist/index.html`