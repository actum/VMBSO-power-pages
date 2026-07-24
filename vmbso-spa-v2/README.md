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

## Known issues

- `index.html` references `/logo192.png` for the apple-touch-icon, but that file doesn't exist
  anywhere in the repo. This is a pre-existing gap carried over as-is from the old CRA template,
  not introduced by the Vite migration.
- `cleanup-old-builds.ps1` determines "current" build hashes from the local `build/` folder
  produced by the immediately-preceding `npm run build` step, so `npm run cleanup` should always
  be run right after a fresh build — which is exactly what `npm run deploy` already does.
