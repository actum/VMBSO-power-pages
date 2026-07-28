# VMBSO Customer Portal (vmbso-spa-v2)

Power Pages Code Site (SPA) for the VMBSO customer portal — React + TypeScript, built with Vite.

## Development

```bash
npm install
npm run dev
```

Requires `.env.local` for local Dataverse/PAC auth configuration — see `.env.local` in this
directory for the available flags.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` / `npm run start` | Runs the Vite dev server with hot reload. Both point at the same `vite` command. |
| `npm run build` | Production build via `vite build`, output to `./build`. Bakes in whatever `.env.production` contains at build time (see [Deploying](#deploying-dev--test--prod) below). |
| `npm run preview` | Serves the `./build` output locally, for a final sanity check of the production bundle before deploying. |
| `npm run lint` | Runs ESLint over the project. |
| `npm run cleanup` | Runs `cleanup-old-builds.ps1`, which deletes stale hashed assets under `.powerpages-site/web-files` that don't match the hashes of the `./build` folder produced by the *immediately preceding* `npm run build`. Must be run right after a fresh build — `npm run deploy` already does this in the right order. |
| `npm run deploy` | `npm run build` → `npm run cleanup` → `pac pages upload-code-site` against whichever environment the active `pac` auth profile points at. See below for promoting the same build across environments. |
| `npm run download` | Runs `download.ps1`: `pac pages download-code-site` for the site's webSiteId, then merges the refreshed `.powerpages-site` metadata back into this folder. Use this to pull down site-setting/permission changes made in the Power Pages admin UI so they aren't lost on the next deploy. |

## Deploying: dev → test → prod

The site is promoted as **one build artifact**, not rebuilt per environment:

1. `npm run build` — produces `./build` once, using `.env.production`.
2. `npm run cleanup` — prunes stale hashed assets so only this build's files remain staged.
3. `pac auth select <dev-profile>` (or `pac auth create` if you don't have one yet) to point the PAC CLI at the dev Dataverse environment, then `pac pages upload-code-site --rootPath ./ --compiledPath ./build --siteName "VMBSO Customer Portal v2"` (this is what `npm run deploy` runs). Verify in dev.
4. `pac auth select <test-profile>` to switch the active environment to test, then re-run the **same** `pac pages upload-code-site` command — **without rebuilding**. This uploads the exact bits verified in dev.
5. Repeat with `pac auth select <prod-profile>` for production once test is signed off.

`pac auth list` shows the available profiles and which one is currently selected; `pac auth select` switches between them without touching the code. Because steps 3–5 all reuse the same `./build` folder, dev/test/prod are guaranteed to be running identical code — the only thing that changes between runs is which Dataverse environment the CLI is authenticated against.

**Caveat:** `import.meta.env.REACT_APP_*` values (Entra provider URL, Google Analytics ID, etc. — see `src/config/powerPages.config.ts`) are baked into the bundle at build time from `.env.production`, not read per environment at runtime. If dev/test/prod ever need different values for these, a single build can't serve all three and this promotion flow would need per-environment env files instead.

## Linting

```bash
npm run lint
```

## Known issues

- `index.html` references `/logo192.png` for the apple-touch-icon, but that file doesn't exist
  anywhere in the repo. This is a pre-existing gap carried over as-is from the old CRA template,
  not introduced by the Vite migration.
- `cleanup-old-builds.ps1` determines "current" build hashes from the local `build/` folder
  produced by the immediately-preceding `npm run build` step, so `npm run cleanup` should always
  be run right after a fresh build — which is exactly what `npm run deploy` already does.
