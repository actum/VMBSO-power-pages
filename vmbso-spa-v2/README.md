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
