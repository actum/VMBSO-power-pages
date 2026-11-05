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
| `npm run cleanup` | Runs `cleanup-old-builds.ps1`, which deletes stale `main.*` bundles under `.powerpages-site/web-files` that don't match the hashes of the `./build` folder produced by the *immediately preceding* `npm run build`. Only `main.*` files are pruned; other old hashed files can still pile up there. `npm run deploy` already runs this in the right order. |
| `npm run deploy` | `npm run build` → `npm run cleanup` → `pac pages upload-code-site` against whichever environment the active `pac` auth profile points at (must be **DEV**) → `npm run sync-solution`. |
| `npm run sync-solution` | Runs `sync-solution.ps1`: adds the current build's web files and the shared site settings (`HTTP/*`, `Webapi/*` and the environment-variable-backed ones) to the `CustomerPortalPowerPages` solution in DEV, so the pipeline ships them. Only adds components; stale bundles still in the solution are just reported. Requires `az login`. |
| `npm run check-environments` | Dry run of `cleanup-environments.ps1`: reports leftovers in DEV and TEST that break pipeline deployments (unmanaged layers in TEST, site components missing from the solution, orphan records). Changes nothing; 0 steps means clean. See [Environment cleanup](#environment-cleanup). Requires `az login`. |
| `npm run download` | Runs `download.ps1`: `pac pages download-code-site` from DEV into a temporary folder, copies its `.powerpages-site` metadata over this folder, then deletes the temporary folder. Use this to pull down site-setting/permission changes made in the Power Pages admin UI so they aren't lost on the next deploy. |

The scripts call `pwsh` (PowerShell 7) and fall back to Windows PowerShell. If PowerShell 7 isn't
installed you'll see `'pwsh' is not recognized ...` before the script runs; that message is harmless.

## Prerequisites

- **PAC CLI** with an auth profile for the **DEV** environment (`pac auth list` / `pac auth select`).
- **Azure CLI** signed in to the tenant (`az login`); `sync-solution.ps1` uses it for its Dataverse token.
- Access to the Power Platform pipeline that promotes `CustomerPortalPowerPages` from DEV to TEST/PROD.

## Deploying: dev → test → prod

Code is uploaded **only to DEV**. TEST and PROD are updated **only through the Power Platform
pipeline**. Never run `pac pages upload-code-site` or `npm run download` against TEST/PROD.

1. **Start clean.** Commit or stash local changes (`git status`).
2. **Pull DEV changes first.** `npm run download`, then `git diff` to see what was changed in DEV
   (site settings, table permissions, web roles, ...). Keep or revert the changes and commit. See
   [Download caveats](#download-caveats).
3. **Deploy to DEV.** Make sure `pac auth` points at DEV, then `npm run deploy`. Check the end of the
   output: the sync step should list the new `main.*` bundle as `added:` (or count it as already in
   the solution) and end with `Done.` without errors. Verify the site in DEV.
4. **Promote with the pipeline.** Run the Power Platform pipeline for `CustomerPortalPowerPages` to
   TEST, and to PROD once TEST is signed off.

What the sync step does **not** add to the solution: site settings outside `HTTP/*`, `Webapi/*` and
the environment-variable-backed ones, table permissions, web roles, and page/content changes. If you
changed any of those, add them to the solution in DEV yourself before running the pipeline
(`cleanup-environments.ps1 -IncludePermissionsAndFlows` adds new table permissions, flow
registrations and auth settings for you).

### Environment cleanup

`cleanup-environments.ps1` fixes leftovers that make the pipeline silently not update TEST:

- **TEST:** unmanaged layers on top of managed components (created by any direct upload to TEST) and
  unmanaged components that don't exist in DEV (old bundles, orphan `index.html` copies).
- **DEV:** site components missing from `CustomerPortalPowerPages`, unused auth providers, bot
  consumers and orphan records, plus their local `.powerpages-site` YAML so a deploy doesn't recreate them.

It is a dry run unless you pass `-Apply`, and writes the plan to `%TEMP%\cleanup-environments-plan.csv`.
Review the plan before applying, and fix DEV before TEST:

```powershell
powershell -ExecutionPolicy Bypass -File ./cleanup-environments.ps1 -IncludePermissionsAndFlows -Scope DEV,REPO -Apply
# commit the deleted YAML, run the pipeline, then:
powershell -ExecutionPolicy Bypass -File ./cleanup-environments.ps1 -Scope TEST -Apply
```

### Sync options

Run the script directly when you need its switches. Passing them through `npm run sync-solution --`
only reaches the Windows PowerShell fallback, not `pwsh`.

```powershell
powershell -ExecutionPolicy Bypass -File ./sync-solution.ps1 -DryRun      # report only, change nothing
powershell -ExecutionPolicy Bypass -File ./sync-solution.ps1 -PruneStale  # also remove old bundles from the solution (records are not deleted)
```

### Download caveats

- `download.ps1` only adds and overwrites files. Something deleted in DEV stays in your local copy,
  so `git diff` won't show it and the next deploy would put it back.
- `.powerpages-site/web-files/` is gitignored, so the download brings old hashed bundles back there
  without any diff. `npm run cleanup` only prunes `main.*`; check that folder for other old files
  before deploying.

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
- Past direct uploads to TEST left unmanaged layers that masked pipeline changes. They were cleaned
  up on 2026-11-04; run `npm run check-environments` if TEST doesn't pick up a pipeline change.
