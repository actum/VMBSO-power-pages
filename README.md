# VMBSO Customer Portal

A React SPA client portal for VMBSO/VMZINC distributors, hosted on Microsoft Power Pages. Distributors log in via Microsoft Entra External ID, complete their company profile, and browse/download product documentation.

## Tech Stack

React 18, TypeScript, Vite 7, MUI v7, TanStack Query 5, Zustand 5, i18next, react-router-dom 6, react-toastify, react-ga4.

Backend: Microsoft Dataverse (OData Web API) + Power Automate cloud flows.

## Getting Started

```bash
npm install
npm run dev
```

Create a `.env.development.local` file with `VITE_DEV_MODE=true` to run locally with mock data (no Power Pages connection needed).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server (port 5173) |
| `npm run build` | Production build to `./dist/` |
| `npm run preview` | Preview production build locally |
| `npm run cleanup` | Remove old build artifacts from `.powerpages-site/web-files/` |
| `npm run deploy` | Build + cleanup + upload to Power Pages via `pac` CLI |
| `npm run download` | Download Power Pages site definition |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_DEV_MODE` | `true` enables mock auth + mock API data for local dev |
| `VITE_PORTAL_URL` | (dev only) Portal base URL for dev proxy & hero image |
| `VITE_ENTRA_PROVIDER` | Entra authority URL for login |
| `VITE_GOOGLE_ANALYTICS_ID` | GA4 Measurement ID |

## Documentation

- [`AGENTS.md`](AGENTS.md) — Full project context (architecture, patterns, gotchas)
- [`docs/DATAVERSE-SCHEMA.md`](docs/DATAVERSE-SCHEMA.md) — Dataverse entity/field reference
- [`docs/POWER-PAGES.md`](docs/POWER-PAGES.md) — Power Pages integration, auth, flows, deployment
- [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md) — Planned improvements
- [`docs/MIGRATION-LOG.md`](docs/MIGRATION-LOG.md) — Migration decisions and fixes
