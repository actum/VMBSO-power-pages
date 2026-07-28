# CRA → Vite Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the currently-active but end-of-life Create React App (`react-scripts 5.0.1`) build toolchain in `vmbso-spa-v2` with the Vite toolchain that already exists half-configured in the repo (`vite.config.ts`, `eslint.config.js`, `tsconfig.app.json`) but was never wired up or installed, without changing any application behavior.

**Architecture:** The repo currently has two parallel, non-communicating scaffolds: a real, running CRA app (`public/index.html` → `src/index.tsx`, built by `react-scripts`) and a dead Vite scaffold (`index.html` → `src/main.tsx`, `vite.config.ts`) whose dependencies were never installed. This plan retires the CRA half entirely: the real application logic moves from `src/index.tsx` into `src/main.tsx`, the real page shell (title, favicon, meta tags, fonts) moves from `public/index.html` into the root `index.html`, the CRA dev proxy (`src/setupProxy.js`) becomes Vite's `server.proxy` config, and all `react-scripts`/CRA-only packages and config are removed in favor of the Vite equivalents.

**Tech Stack:** Vite 6.x, `@vitejs/plugin-react`, TypeScript 5.x, ESLint 9 flat config (`typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`) — all already referenced by the existing `vite.config.ts` / `eslint.config.js` / `tsconfig.app.json`, just not yet installed.

## Global Constraints

- **No behavior change.** This is an infrastructure swap. The rendered app, routes, translations, auth flow, and API calls must work identically before and after.
- **Keep the `REACT_APP_` env var prefix.** Do not rename `.env.*` keys or any variable referenced outside this repo (deployment secrets/pipeline variables you can't see from here). Vite is configured with `envPrefix: 'REACT_APP_'` so `.env.development` / `.env.production` / `.env.local` need zero changes.
- **Keep the production build output directory as `build/`** (not Vite's default `dist/`) — `npm run deploy` calls `pac pages upload-code-site --compiledPath ./build`, and must keep working unmodified.
- **Keep output filenames matching `main\.[hash]\.(js|css)`** — `cleanup-old-builds.ps1` parses exactly that pattern out of `asset-manifest.json`-adjacent build output to decide what to delete. Getting this wrong makes the cleanup script silently stop deleting anything (harmless but defeats its purpose) — verify the regex still matches in Task 5.
- **No test suite exists today** (`react-scripts test` was never actually used — zero `*.test.*`/`*.spec.*` files in `src/`). Task verification below is "run the command and inspect real output," not TDD; do not invent a test suite as part of this migration.
- **One package manager only.** The repo currently carries both `package-lock.json` and `yarn.lock`. This plan standardizes on **npm** (matches the `npm run deploy` script already in `package.json`) and deletes `yarn.lock`.
- **Commit only migration-related files per task.** The working tree has unrelated modified `.powerpages-site/*` deployment artifacts already staged from other work (per `git status`) — never `git add -A`; stage exact paths listed in each task.

---

### Task 1: New branch, and delete the dead Vite scaffold nothing yet depends on

There is no reason to build on top of half-finished scaffold files without first confirming exactly what's dead. This task creates a clean branch and produces a one-file inventory used by every later task.

**Files:**
- Create: `docs/superpowers/plans/2026-07-22-cra-vite-migration-notes.md` (scratch inventory, deleted in Task 8)

- [ ] **Step 1: Create a dedicated branch**

```bash
git checkout -b chore/VMPP-vite-migration
```

Expected: `Switched to a new branch 'chore/VMPP-vite-migration'`

- [ ] **Step 2: Confirm the Vite scaffold's dependencies are genuinely not installed (baseline check)**

```bash
cd vmbso-spa-v2
for p in vite @vitejs/plugin-react typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh; do
  [ -d "node_modules/$p" ] && echo "$p: PRESENT (unexpected)" || echo "$p: missing (expected)"
done
```

Expected: all five print `missing (expected)`. If any print `PRESENT`, stop and re-check `package.json` — the assumption this plan is built on (nothing was installed) is wrong and the later `npm install` step needs adjusting.

- [ ] **Step 3: Write the inventory file**

```markdown
# CRA→Vite migration notes (scratch — delete after Task 8)

Dead files (Vite scaffold, never wired up):
- vmbso-spa-v2/src/main.tsx      (stub, superseded by Task 2)
- vmbso-spa-v2/README.md         (unmodified `npm create vite` default README)

Files this migration rewrites in place (not deleted):
- vmbso-spa-v2/index.html        (Vite scaffold shell -> gets real CRA head content, Task 4)
- vmbso-spa-v2/vite.config.ts    (gets proxy + build output config, Task 3)
- vmbso-spa-v2/package.json      (deps + scripts, Tasks 2 and 6)

Files this migration deletes once their content has moved elsewhere:
- vmbso-spa-v2/public/index.html   -> content moves into index.html (Task 4)
- vmbso-spa-v2/src/index.tsx       -> content moves into src/main.tsx (Task 2)
- vmbso-spa-v2/src/react-app-env.d.ts -> superseded by src/vite-env.d.ts (Task 2)
- vmbso-spa-v2/src/setupProxy.js   -> superseded by vite.config.ts server.proxy (Task 3)
- vmbso-spa-v2/yarn.lock           -> standardizing on npm (Task 6)

Known pre-existing gap, NOT fixed by this migration (out of scope, carried over as-is):
- public/index.html references %PUBLIC_URL%/logo192.png, which does not exist in
  public/images/ and never has (confirmed absent from build/ output too). This 404s
  silently today and will keep doing so after migration. Separate ticket if it matters.
```

Write this to `docs/superpowers/plans/2026-07-22-cra-vite-migration-notes.md`.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-07-22-cra-vite-migration-notes.md
git commit -m "chore: start CRA to Vite migration, add scratch inventory"
```

---

### Task 2: Move the real entry logic into `main.tsx`, retire `index.tsx`

**Files:**
- Modify: `vmbso-spa-v2/src/main.tsx`
- Delete: `vmbso-spa-v2/src/index.tsx`
- Delete: `vmbso-spa-v2/src/react-app-env.d.ts`
- Create: `vmbso-spa-v2/src/vite-env.d.ts`

**Interfaces:**
- Consumes: `initializeTranslations` from `./i18n` (existing, unchanged), `TranslationLoader` from `./components/TranslationLoader` (existing, unchanged), `App` default export from `./App` (existing, unchanged), `react-ga`'s `ReactGA.initialize(measurementId: string)` (existing, unchanged — swapping to `react-ga4` is tracked separately, not part of this migration).
- Produces: `src/main.tsx` is now the sole app entry point referenced by `index.html`'s `<script type="module" src="/src/main.tsx">`.

- [ ] **Step 1: Replace `src/main.tsx` with the real entry logic, translated to Vite's env API**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n';
import { initializeTranslations } from './i18n';
import App from './App';
import { TranslationLoader } from './components/TranslationLoader';
import * as ReactGA from 'react-ga';

const MEASUREMENT_ID = import.meta.env.REACT_APP_GOOGLE_ANALYTICS_ID;

if (MEASUREMENT_ID) {
  ReactGA.initialize(MEASUREMENT_ID);
} else {
  console.warn('Google Analytics ID is not set.');
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// Show loading screen while translations are being fetched
root.render(
  <React.StrictMode>
    <TranslationLoader />
  </React.StrictMode>
);

// Initialize translations before rendering the main app
initializeTranslations().then(() => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}).catch((error) => {
  console.error('[App] Failed to initialize translations:', error);
  // Render app anyway with fallback translations
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
```

This is `src/index.tsx`'s body verbatim, with one change: `process.env.REACT_APP_GOOGLE_ANALYTICS_ID` → `import.meta.env.REACT_APP_GOOGLE_ANALYTICS_ID` (Vite exposes env vars on `import.meta.env`, not `process.env`; `envPrefix: 'REACT_APP_'` in Task 3 is what makes this specific key available there).

- [ ] **Step 2: Delete the now-superseded files**

```bash
cd vmbso-spa-v2
rm src/index.tsx
rm src/react-app-env.d.ts
```

- [ ] **Step 3: Add the Vite type-reference file that replaces `react-app-env.d.ts`**

```typescript
/// <reference types="vite/client" />
```

Write this to `src/vite-env.d.ts`. (`tsconfig.app.json` already lists `"types": ["vite/client"]` — this triplet-slash file is what makes `import.meta.env.REACT_APP_*` type-check instead of erroring as "Property does not exist on type ImportMeta".)

- [ ] **Step 4: Verify no other file still imports the deleted `index.tsx`**

```bash
grep -rn "from '\./index'\|from \"\./index\"" src
```

Expected: no output (nothing imports `index.tsx` directly — it was only ever loaded by `public/index.html`'s implicit CRA convention).

- [ ] **Step 5: Commit**

```bash
git add src/main.tsx src/vite-env.d.ts
git rm src/index.tsx src/react-app-env.d.ts
git commit -m "chore: move CRA entry logic into Vite's main.tsx"
```

---

### Task 3: Rewrite the remaining `process.env.REACT_APP_*` / `process.env.NODE_ENV` call sites

**Files:**
- Modify: `vmbso-spa-v2/src/config/powerPages.config.ts`
- Modify: `vmbso-spa-v2/src/contexts/AuthContext.tsx`
- Modify: `vmbso-spa-v2/src/contexts/CookiesContext.tsx`
- Modify: `vmbso-spa-v2/src/utils/accessControl.ts`

**Interfaces:**
- Consumes: Vite's `import.meta.env` (typed via `vite-env.d.ts` from Task 2), populated at build/dev time from `.env.*` files with `envPrefix: 'REACT_APP_'` (configured in Task 4).
- Produces: no more `process.env` references anywhere under `src/` (Vite does not polyfill `process.env` by default; leaving any of these in place would make that specific line silently `undefined` at runtime instead of erroring, which is worse than a build failure).

- [ ] **Step 1: `src/config/powerPages.config.ts`** — replace the four `process.env` reads

```typescript
const PORTAL_URL = import.meta.env.REACT_APP_PORTAL_URL ?? '';

console.log('[CONFIG DEBUG] PORTAL_URL:', PORTAL_URL);
console.log('[CONFIG DEBUG] NODE_ENV:', import.meta.env.MODE);
console.log('[CONFIG DEBUG] devMode will be:', import.meta.env.DEV);
console.log('[CONFIG DEBUG] REACT_APP_ENTRA_PROVIDER:', import.meta.env.REACT_APP_ENTRA_PROVIDER);

export const config = {
  /**
   * Whether the app is running in local development mode.
   * Vite sets import.meta.env.DEV to true for `vite dev` / `npm run dev`,
   * and false for `vite build` / `npm run build`. Cannot be overridden from
   * .env files by design, so this can never accidentally be true in a production build.
   */
  devMode: import.meta.env.DEV,
```

Leave every other line in the file (the `auth`, `api`, `flows`, `assets` blocks) unchanged — only the four `process.env.*` reads and the `devMode` line change. Update the line `providerScheme: process.env.REACT_APP_ENTRA_PROVIDER ?? '',` to `providerScheme: import.meta.env.REACT_APP_ENTRA_PROVIDER ?? '',`.

- [ ] **Step 2: `src/contexts/AuthContext.tsx`** — replace all 5 occurrences

```bash
grep -n "process.env.NODE_ENV" src/contexts/AuthContext.tsx
```

For each matched line, replace `process.env.NODE_ENV !== 'production'` with `import.meta.env.DEV`.

- [ ] **Step 3: `src/contexts/CookiesContext.tsx`** — replace both occurrences

Replace:
```typescript
    if (process.env.REACT_APP_GOOGLE_ANALYTICS_ID) {
      ReactGA.initialize(process.env.REACT_APP_GOOGLE_ANALYTICS_ID);
```
with:
```typescript
    if (import.meta.env.REACT_APP_GOOGLE_ANALYTICS_ID) {
      ReactGA.initialize(import.meta.env.REACT_APP_GOOGLE_ANALYTICS_ID);
```

- [ ] **Step 4: `src/utils/accessControl.ts`** — replace the one occurrence

Replace:
```typescript
    const devRole = process.env.REACT_APP_DEV_ROLE ?? 'distributor';
```
with:
```typescript
    const devRole = import.meta.env.REACT_APP_DEV_ROLE ?? 'distributor';
```

- [ ] **Step 5: Verify no `process.env` references remain in application source**

```bash
grep -rn "process\.env" src
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/config/powerPages.config.ts src/contexts/AuthContext.tsx src/contexts/CookiesContext.tsx src/utils/accessControl.ts
git commit -m "chore: migrate process.env reads to import.meta.env for Vite"
```

---

### Task 4: `vite.config.ts` — dev proxy, build output naming, env prefix

**Files:**
- Modify: `vmbso-spa-v2/vite.config.ts`
- Delete: `vmbso-spa-v2/src/setupProxy.js`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `vite dev` proxies `/_api` and `/_services` to the Dataverse-backed dev host (replacing `setupProxy.js`); `vite build` writes to `build/` with filenames matching `main.[hash].js` / `main.[hash].css` so `cleanup-old-builds.ps1` (Task 8) keeps working unmodified; `import.meta.env.REACT_APP_*` (used throughout Tasks 2–3) is populated from `.env.*` files without renaming any of them.

- [ ] **Step 1: Replace `vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  envPrefix: 'REACT_APP_',
  server: {
    proxy: {
      '/_api': {
        target: 'https://site-alfw4.powerappsportals.com',
        changeOrigin: true,
        secure: false,
      },
      '/_services': {
        target: 'https://site-alfw4.powerappsportals.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'build',
    rollupOptions: {
      output: {
        entryFileNames: 'static/js/main.[hash].js',
        chunkFileNames: 'static/js/[name].[hash].chunk.js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.names?.some((n) => n.endsWith('.css'))) {
            return 'static/css/main.[hash][extname]'
          }
          return 'static/media/[name].[hash][extname]'
        },
      },
    },
  },
})
```

The proxy target `https://site-alfw4.powerappsportals.com` is copied verbatim from the current (active) `src/setupProxy.js` — note this is **not** the same host as the unused `"proxy"` field in `package.json` (`https://vmbso-spa.powerappsportals.com/`), which CRA was silently ignoring the whole time because `setupProxy.js` takes precedence over the `proxy` field whenever both exist. Task 6 removes that dead field from `package.json` so there's only one proxy config again.

- [ ] **Step 2: Delete the superseded CRA dev-proxy file**

```bash
rm src/setupProxy.js
```

- [ ] **Step 3: Commit**

```bash
git add vite.config.ts
git rm src/setupProxy.js
git commit -m "chore: configure Vite dev proxy and build output naming"
```

---

### Task 5: `index.html` — merge the real page shell in, delete the CRA one

**Files:**
- Modify: `vmbso-spa-v2/index.html`
- Delete: `vmbso-spa-v2/public/index.html`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: the single HTML shell Vite serves for both dev and build, carrying the real title/favicon/meta/fonts that were previously in `public/index.html` (CRA's template, now unused).

- [ ] **Step 1: Replace `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#1a3a52" />
    <meta name="description" content="VMBSO Customer Document Portal" />
    <link rel="apple-touch-icon" href="/logo192.png" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
    <title>VMBSO Customer Portal</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Every `%PUBLIC_URL%/x` token from the old `public/index.html` becomes plain `/x` — Vite serves the contents of `public/` at the site root by default, so no template substitution is needed (this is the direct equivalent of what CRA's `%PUBLIC_URL%` was doing). The `<link rel="apple-touch-icon" href="/logo192.png">` line is carried over even though that file doesn't exist (see Task 1's inventory note) — that's a pre-existing, out-of-scope 404, not something this migration introduces.

- [ ] **Step 2: Delete the now-redundant CRA template**

```bash
rm public/index.html
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git rm public/index.html
git commit -m "chore: merge CRA page shell into Vite's index.html"
```

---

### Task 6: `package.json` — swap dependencies and scripts, drop the dead `proxy` field, standardize on npm

**Files:**
- Modify: `vmbso-spa-v2/package.json`
- Delete: `vmbso-spa-v2/yarn.lock`

**Interfaces:**
- Consumes: nothing code-level — this task is purely manifest/tooling.
- Produces: `npm run dev` / `npm run build` / `npm run preview` backed by Vite; `npm run lint` backed by the already-present `eslint.config.js`; a single `package-lock.json` as the source of truth.

- [ ] **Step 1: Edit `package.json`** to the following shape (values not shown are unchanged — dependencies not mentioned here like `@mui/*`, `date-fns`, `dompurify`, `i18next`, `js-cookie`, `react`, `react-dom`, `react-router-dom`, `react-toastify`, `react-dropzone`, `react-country-flag`, `react-ga`, `js-cookie` etc. all stay exactly as they are; this migration doesn't touch runtime dependency versions):

```json
{
  "name": "vmbso-portal",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "dependencies": {
    "@emotion/react": "^11.11.3",
    "@emotion/styled": "^11.11.0",
    "@mui/icons-material": "^5.15.10",
    "@mui/material": "^5.15.10",
    "@mui/x-data-grid": "^6.19.4",
    "@types/dompurify": "^3.0.5",
    "date-fns": "^3.3.1",
    "dompurify": "^3.3.3",
    "i18next": "^23.8.2",
    "i18next-browser-languagedetector": "^7.2.0",
    "js-cookie": "^3.0.5",
    "react": "^18.2.0",
    "react-country-flag": "^3.1.0",
    "react-dom": "^18.2.0",
    "react-dropzone": "^15.0.0",
    "react-ga": "^3.3.1",
    "react-i18next": "^14.0.5",
    "react-router-dom": "^6.22.0",
    "react-toastify": "^10.0.4"
  },
  "devDependencies": {
    "@eslint/js": "^9.19.0",
    "@types/js-cookie": "^3.0.6",
    "@types/node": "^20.11.16",
    "@types/react": "^18.2.55",
    "@types/react-dom": "^18.2.19",
    "@types/react-router-dom": "^5.3.3",
    "@vitejs/plugin-react": "^4.3.4",
    "eslint": "^9.19.0",
    "eslint-plugin-react-hooks": "^5.1.0",
    "eslint-plugin-react-refresh": "^0.4.18",
    "globals": "^15.14.0",
    "http-proxy-middleware": "^3.0.5",
    "typescript": "^5.7.3",
    "typescript-eslint": "^8.22.0",
    "vite": "^6.1.0"
  },
  "scripts": {
    "dev": "vite",
    "start": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "cleanup": "pwsh -ExecutionPolicy Bypass -File ./cleanup-old-builds.ps1 || powershell -ExecutionPolicy Bypass -File ./cleanup-old-builds.ps1",
    "deploy": "npm run build && npm run cleanup && pac pages upload-code-site --rootPath ./ --compiledPath ./build --siteName \"VMBSO Customer Portal v2\"",
    "download": "pwsh -ExecutionPolicy Bypass -File ./download.ps1 || powershell -ExecutionPolicy Bypass -File ./download.ps1"
  }
}
```

Removed from the original: `react-scripts` dependency, `typescript` moved to devDependencies at v5 (was a runtime dependency at v4.9.5 under CRA's convention — Vite treats it purely as a dev/build tool), `@types/node` moved to devDependencies (only needed for tooling/config typing, never shipped to the browser), the CRA-only `"eslintConfig"` block, the `"browserslist"` block (nothing in the Vite build reads it — esbuild's default target already covers evergreen browsers, which is what the existing browserslist entries meant to express), and the unused `"proxy"` field (dead since `setupProxy.js` was overriding it — see Task 4).

- [ ] **Step 2: Remove the yarn lockfile, reinstall clean with npm**

```bash
rm yarn.lock
rm -rf node_modules
npm install
```

Expected: install completes with 0 errors. A fresh `npm audit` at the end of this step should show a dramatically smaller vulnerability count than the 53 found before migration (react-scripts' frozen `webpack-dev-server`/`ws`/`websocket-driver`/`yaml`/`underscore` chain is gone) — run it and note the new number, but don't block this task on driving it to zero; that's a separate follow-up if anything remains.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git rm yarn.lock
git commit -m "chore: swap react-scripts for Vite in package.json, standardize on npm"
```

---

### Task 7: Verify dev server, build output, and lint all work end to end

This is the task that proves Tasks 2–6 actually fit together — nothing here is new code, it's the manual smoke-test pass a migration like this lives or dies on.

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server**

```bash
cd vmbso-spa-v2
npm run dev
```

Expected: Vite prints a local URL (e.g. `http://localhost:5173/`) with no errors. Open it in a browser.

- [ ] **Step 2: Manually smoke-test the app in dev mode**

Check, in the browser:
- The login page renders with the hero image and VMBSO branding (proves `index.html` head + fonts + CSS wired correctly).
- Switching language (FR/EN/NL) updates visible text (proves `i18n` + `TranslationLoader` still initialize correctly from `main.tsx`).
- Open browser devtools Network tab, confirm requests to `/_api/...` are being proxied (not hitting `localhost:5173/_api` directly with a 404) — proves Task 4's `server.proxy` replaced `setupProxy.js` correctly.
- No `process.env is not defined` or `import.meta.env.REACT_APP_* is undefined` warnings in the console.

- [ ] **Step 3: Stop the dev server, run the production build**

```bash
npm run build
```

Expected: completes with no errors, prints a summary of emitted files under `build/`.

- [ ] **Step 4: Confirm build output matches the naming Task 4 was built for**

```bash
find build/static/js -name "main.*.js"
find build/static/css -name "main.*.css"
cat build/index.html
```

Expected: exactly one `main.<hash>.js` and one `main.<hash>.css` file exist, and `build/index.html` references both via absolute `/static/...` paths (matching what the previous CRA build produced, and what `cleanup-old-builds.ps1`'s regex `main\.([a-f0-9]+)\.(js|css)` expects).

- [ ] **Step 5: Dry-run the cleanup script against the new build output**

```bash
pwsh -ExecutionPolicy Bypass -File ./cleanup-old-builds.ps1
```

Expected: runs without the `WARNING: asset-manifest.json not found` message for `.powerpages-site\web-files` (that path only exists after a real `pac pages` deploy, so seeing that specific warning here is fine) — the important thing is no PowerShell errors, since this proves the regex still parses the new filenames if this path did exist.

- [ ] **Step 6: Preview the production build**

```bash
npm run preview
```

Open the printed URL and re-run the same checks as Step 2 against the built (not dev-server) bundle.

- [ ] **Step 7: Run lint**

```bash
npm run lint
```

Expected: runs to completion (may report pre-existing lint findings unrelated to this migration — those are not this plan's concern — but must not fail with a "cannot find module" / config-loading error, which is what would happen today before Task 6 installed the flat-config's dependencies).

- [ ] **Step 8: Nothing to commit** — this task is verification-only. If any step fails, fix the root cause in the relevant earlier task (don't patch around it here) and re-run this task from Step 1.

---

### Task 8: Clean up scratch files, update the README

**Files:**
- Delete: `vmbso-spa-v2/README.md` content replaced (was the unmodified `npm create vite` default)
- Delete: `docs/superpowers/plans/2026-07-22-cra-vite-migration-notes.md`

- [ ] **Step 1: Replace `vmbso-spa-v2/README.md`**

```markdown
# VMBSO Customer Portal (vmbso-spa-v2)

Power Pages Code Site (SPA) for the VMBSO customer portal — React + TypeScript, built with Vite.

## Development

```bash
npm install
npm run dev
```

Requires `.env.local` for local Dataverse/PAC auth configuration — see `.env.local` in this
directory for the available flags.

## Build & deploy

```bash
npm run build     # outputs to ./build
npm run deploy     # build, prune old web-files, then pac pages upload-code-site
```

## Linting

```bash
npm run lint
```
```

- [ ] **Step 2: Remove the scratch inventory file from Task 1**

```bash
rm docs/superpowers/plans/2026-07-22-cra-vite-migration-notes.md
```

- [ ] **Step 3: Final full-repo diff review**

```bash
git status
git diff --stat main
```

Confirm the only files touched are the ones this plan named — no accidental changes to `.powerpages-site/*` deployment artifacts that were already dirty before this migration started.

- [ ] **Step 4: Commit**

```bash
git add vmbso-spa-v2/README.md
git rm docs/superpowers/plans/2026-07-22-cra-vite-migration-notes.md
git commit -m "docs: update README for Vite, remove migration scratch notes"
```

---

## After this plan

Not in scope here, but worth doing as immediate follow-ups once this merges (from the earlier readiness audit):
- Swap `react-ga` → `react-ga4` (unmaintained package, low-effort replace).
- Bump `react-router-dom` (v6→v7 has breaking data-router API changes — plan separately).
- Re-run `npm audit` and confirm the vulnerability count actually dropped as expected once dependencies are on Vite.
