# VMBSO Customer Portal — Agent Context

## Project Summary

A React SPA client portal for **VMBSO/VMZINC distributors**. Runs inside **Microsoft Power Pages** (a low-code portal platform). Distributors log in via Microsoft Entra External ID, complete their company profile, and then browse/download product documentation. The data backend is Microsoft Dataverse (OData Web API) and Power Automate cloud flows. Phase 2 will extend the portal with invoices and additional document types.

## Tech Stack

- **Build**: Vite 7 (`vite 7.3.1`, `@vitejs/plugin-react 5.1.4`). Migrated from CRA. Entry point: `src/main.tsx`. Output: `./dist/`.
- **Framework**: React 18 + TypeScript 5.8
- **Routing**: react-router-dom 6.30 (`BrowserRouter`). 4 routes. Future flag `v7_startTransition` enabled.
- **UI library**: MUI v7 (`@mui/material 7.3.9`, `@mui/icons-material 7.3.9`). Requires `react-is` override for React 18 compatibility.
- **State**: Zustand 5 (`useCookiesStore`). Client-only state: cookie consent preferences, dialog visibility.
- **Data fetching**: TanStack Query 5 + custom `apiClient`. Auth session, documents, profile lookups, mutations. `apiClient` handles HTTP, CSRF, retries, OData.
- **i18n**: i18next 25 + react-i18next 16 + browser language detector. 3 locales: `en-GB`, `fr-FR`, `be-NL`. Dynamic translations from Dataverse `actum_translation` table.
- **Notifications**: react-toastify 11
- **Dates**: date-fns 4 (in deps, minimally used)
- **Styling**: MUI `sx` prop + minimal global CSS. No CSS modules, no styled-components.
- **Fonts**: Ulm Grotesk (headings), Rubik (body), Inter (fallback). Custom font files in `src/fonts/`.
- **Analytics**: react-ga 3 (Google Analytics). Uses GA4 Measurement ID but `react-ga` is the UA library. Should be replaced with `react-ga4` — see Known Issues.
- **Tests**: None

## Project Structure

```
project-root/
├── AGENTS.md                          ← This file
├── docs/
│   ├── DATAVERSE-SCHEMA.md            ← Dataverse entity/field reference
│   ├── POWER-PAGES.md                 ← Power Pages, auth, flows, deployment
│   ├── IMPROVEMENTS.md               ← Planned improvements & migration notes
│   └── MIGRATION-LOG.md              ← Decisions, bugs found, fixes applied during migrations
├── .powerpages-site/                  ← Power Pages site definition (managed by pac CLI, don't edit manually)
├── .env.production                    ← Prod env vars (portal URL, Entra provider, GA ID)
├── .env.development.local             ← Dev env vars (VITE_DEV_MODE=true). Gitignored.
├── package.json
├── vite.config.ts                     ← Vite config with dev proxy for /_api and /_services
├── tsconfig.json                      ← References tsconfig.app.json + tsconfig.node.json
├── index.html                         ← Vite HTML entry point
└── src/
    ├── main.tsx                       ← Vite entry point (i18n init, React root render)
    ├── App.tsx                        ← Root: QueryClientProvider, ThemeProvider, Router, Routes
    ├── index.css                      ← Global reset + font imports (sets html font-size: 10px)
    │
    ├── config/
    │   └── powerPages.config.ts       ← Centralised config: all URLs, API endpoints, flow IDs
    │
    ├── queries/
    │   └── queryKeys.ts               ← TanStack Query key constants
    │
    ├── stores/
    │   └── cookiesStore.ts            ← Zustand store: cookie consent preferences + dialog visibility
    │
    ├── services/
    │   ├── apiClient.ts               ← HTTP client: fetch wrapper, CSRF tokens, retries, OData, flows
    │   ├── authService.ts             ← Session check, logout, dev mode mock user
    │   └── dataverseService.ts        ← Dataverse CRUD: contacts, accounts, brands, countries, languages, roles, downloadLogs
    │
    ├── hooks/
    │   ├── useAuth.ts                 ← Auth hook (TanStack Query): session, isAuthenticated, isProfileComplete, logout, refreshUser
    │   ├── useDocuments.ts            ← Documents via Power Automate flow (TanStack Query)
    │   ├── useProfileData.ts          ← Lookup hooks: useBrands, useCountries, useRoles, useLanguagesByCountry (TanStack Query)
    │   ├── useVatSearch.ts            ← VAT search mutation (TanStack Query)
    │   └── useUpdateProfile.ts        ← Profile update mutation (TanStack Query, invalidates session on success)
    │
    ├── pages/
    │   ├── Login.tsx                   ← Entra redirect login page
    │   ├── Home.tsx                   ← Homepage: greeting + hero section + banner section (mock data)
    │   ├── Documents.tsx              ← Document list + search + download (SAS token polling)
    │   ├── UpdateProfile.tsx          ← Profile completion form (personal + company via VAT search)
    │   ├── NotFound.tsx               ← 404 page
    │   └── Register.tsx               ← Dead code — not routed, hardcoded French, mock data
    │
    ├── components/
    │   ├── Layout.tsx                 ← App shell: header, nav, user menu, footer
    │   ├── ProtectedRoute.tsx         ← Auth guard: redirects to /login or /update-profile
    │   ├── LangHandler.tsx            ← Syncs URL ?lang= param with i18n + fetches Dataverse translations
    │   ├── CookieConsentDialog.tsx    ← Cookie consent dialog (reads from Zustand store)
    │   ├── AnalyticsTracker.tsx       ← GA pageview tracking on route change
    │   └── common/
    │       ├── LanguagePicker.tsx      ← i18n language switcher in header
    │       └── ui/
    │           └── InputLabelField.tsx ← Reusable form field (label + TextField + validation)
    │
    ├── types/                         ← TypeScript interfaces for Dataverse entities
    ├── theme/                         ← MUI theme (palette, typography, component overrides) + brand colors
    ├── i18n/                          ← i18next init + locale JSON files (en-GB, fr-FR, be-NL)
    └── fonts/                         ← Ulm Grotesk font files (.woff2) + @font-face declarations
```

## Routing

- `/login` → `Login` (public) — Entra External ID redirect. Auto-redirects if already authenticated.
- `/` → `Home` (protected) — Homepage with greeting, hero section, and promotional banner. Mock data from `Home.tsx`; will come from Dataverse later.
- `/documents` → `Documents` (protected) — Document list with text search and download.
- `/update-profile` → `UpdateProfile` (protected) — Profile completion form (phone, language, company via VAT search).
- `*` → `NotFound` (public) — 404 page.

`ProtectedRoute` checks:

1. **Is the user authenticated?** If not → redirect to `/login`
2. **Is the profile complete?** (phone + language + linked account) If not → redirect to `/update-profile`

## Architecture

### Data layer

```
Pages/Components
    │
    ▼
TanStack Query hooks (useAuth, useDocuments, useProfileData, mutations)
    │
    ▼
Services (authService, dataverseService)
    │
    ▼
apiClient.ts ← HTTP primitives: fetch, CSRF, retries, OData headers
    ├── .odata()      ← For Dataverse /_api/* calls
    ├── .flow()       ← For Power Automate /_api/cloudflow/* calls
    └── .request()    ← Generic fetch wrapper
```

### Authentication

Auth uses TanStack Query (`useAuth` hook). On mount, `useQuery` calls `authService.checkSession()`:

- **Production**: Checks `window.Microsoft.Dynamic365.Portal.User.userName` → if present, fetches Contact from `/_api/contacts`
- **Dev mode** (`VITE_DEV_MODE=true`): Returns a mock Contact from localStorage

`logout()` clears the TQ cache and redirects. `refreshUser()` invalidates the session query.

Full auth details: see `docs/POWER-PAGES.md`.

### i18n / LangHandler

`LangHandler` component (renders `null`, mounted in `App.tsx` inside Router) does two things:

1. **Syncs URL `?lang=` param with i18n language** — if `?lang=fr-FR` is in URL, calls `i18n.changeLanguage("fr-FR")`. If no param, writes current language to URL.
2. **Fetches dynamic translations from Dataverse** — queries `actum_translation` table by English display name ("English", "French", "Dutch"). Merges results via `addResourceBundle`. Falls back silently to bundled JSON translations on failure.

Supported languages: `en-GB`, `fr-FR`, `be-NL`.

### Data flow for documents

1. `useDocuments` hook calls `apiClient.flow()` with the fetch-documents flow ID
2. Flow returns `{ status: "200", data: ProductDocument[] }` (data may be JSON string)
3. Client-side text filtering via `useMemo`
4. Download: create `DownloadLog` → poll `actum_sastoken` every 3s (60s timeout) → trigger browser download

### Profile update flow

1. VAT search: `useVatSearch` mutation → `dataverseService.accounts.searchByVAT(vat)`
2. If found: link contact to existing account. If not: user fills company details.
3. Submit via `useUpdateProfile` mutation → `apiClient.flow()` to update-profile flow
4. On success: auto-invalidates session query → `refreshUser()` → redirect to `/documents`

## Key Patterns & Gotchas

### CSRF tokens are required for all mutations

Every POST/PATCH/DELETE to `/_api/*` or cloud flows needs a `__RequestVerificationToken` header. The `apiClient` handles this automatically via `getCsrfToken()`.

### OData bind syntax for lookups

When setting a lookup field, use `@odata.bind` syntax, not the raw GUID:

```typescript
// Correct
{ "parentcustomerid_account@odata.bind": "/accounts(GUID)" }

// Wrong
{ "_parentcustomerid_value": "GUID" }
```

### 10px rem base

`index.css` sets `html { font-size: 10px !important }`. All `rem` values use this base — `1.6rem` = 16px. MUI spacing unit overridden to `4` (4px).

### Power Pages caching

Dataverse responses are aggressively cached by Power Pages. The `downloadLogs.getById()` method uses a cache-busting OData filter.

### Dev mode mock

When `VITE_DEV_MODE=true` (set in `.env.development.local`), the entire app is usable locally without a Power Pages connection. All API calls return mock data:

- **Auth**: Mock Contact from localStorage (seeded in `authService.ts`)
- **Dataverse lookups**: Brands, countries, roles, languages return inline mock arrays (in `dataverseService.ts`)
- **Power Automate flows**: Documents flow returns 3 sample docs, profile update flow returns success (in `apiClient.flow()`)
- **Downloads**: Mock download log + SAS token (in `dataverseService.downloadLogs`)
- **CSRF**: Returns a dummy token (in `getCsrfToken()`)

Future improvement: migrate mocks to MSW (Mock Service Worker) — see `docs/IMPROVEMENTS.md`.

### Flow response format

Cloud flows return `{ status: "200", ... }` or `{ status: "500", ... }` — note that `status` is a **string**, not a number.

### Contact type convenience fields

The `Contact` interface includes fields like `actum_companyname`, `actum_vat`, `actum_brand`. These are **NOT Dataverse columns** — they're local form state in `UpdateProfile.tsx`. The Power Automate flow maps them to actual Account/Contact fields. See `docs/DATAVERSE-SCHEMA.md`.

### Dataverse Translation table

The `actum_translation` table stores dynamic translations. The primary Name column (`actum_translationname`) contains English display names: "English", "French", "Dutch". The `actum_content` column contains a JSON object with translation key-value pairs. `LangHandler` queries this table and merges results into the i18next resource bundles.

## Known Issues

- **`react-ga` vs GA4**: The project uses `react-ga` (Universal Analytics library) but the Measurement ID in `.env.production` is a GA4 ID (`G-...`). Should replace with `react-ga4`.
- **Debug logging**: `console.log('[DEBUG]...')` statements throughout auth, config, flow, and download code.
- **Dead code**: `Register.tsx` (not routed), `src/types/auth.ts` (unused type).

## Build & Run

```bash
npm run dev            # Vite dev server (port 5173)
npm run build          # Production build → ./dist/
npm run preview        # Preview production build locally
npm run deploy         # Build + upload to Power Pages via pac CLI
npm run download       # Download Power Pages site definition
```

## Environment Variables

- `VITE_DEV_MODE` — `true` enables mock auth + mock API data for local development
- `VITE_PORTAL_URL` — Power Pages portal base URL
- `VITE_ENTRA_PROVIDER` — Entra authority URL for login form POST
- `VITE_GOOGLE_ANALYTICS_ID` — GA4 Measurement ID

## Further Reading

- **Dataverse schema** (entities, fields, relationships): [`docs/DATAVERSE-SCHEMA.md`](docs/DATAVERSE-SCHEMA.md)
- **Power Pages integration** (auth flow, CSRF, flows, deployment, dev mode): [`docs/POWER-PAGES.md`](docs/POWER-PAGES.md)
- **Planned improvements** (cleanup, future features): [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md)
- **Migration log** (decisions, bugs found, fixes): [`docs/MIGRATION-LOG.md`](docs/MIGRATION-LOG.md)
