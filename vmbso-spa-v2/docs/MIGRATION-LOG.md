# Migration Log

Captures decisions, bugs found, and fixes applied during the CRA→Vite, Zustand, and TanStack Query migrations. Read this to understand WHY things are the way they are.

## Migration 1: CRA → Vite (completed)

### What was done

- Removed `react-scripts`, `http-proxy-middleware`, `@mui/x-data-grid`, CRA-specific types
- Removed `src/index.tsx` (CRA entry point), `src/setupProxy.js`, `src/react-app-env.d.ts`, `src/App.css`, `public/index.html`
- Kept `src/main.tsx` as the Vite entry point, `index.html` in project root
- Converted all `process.env.REACT_APP_*` → `import.meta.env.VITE_*`
- Converted `process.env.NODE_ENV` → `import.meta.env.DEV` / `import.meta.env.PROD`
- Updated `vite.config.ts` with dev proxy rules (from `setupProxy.js`)
- Updated `package.json` scripts to use `vite` commands
- Upgraded MUI v5 → v7, which required a `react-is: "18.3.1"` override (MUI v7 internally depends on React 19's `react-is`, but we're on React 18)

### Package version matrix

All packages were pinned to specific compatible versions for React 18 + Vite 7 + MUI 7. Key compatibility constraints:

- Vite 8 uses Rolldown bundler which breaks CJS interop with MUI — stayed on Vite 7
- MUI v7 with React 18 needs `react-is` override
- TypeScript 5.8.3 for `verbatimModuleSyntax` support

### Decision: package manager

Started with npm, switched to pnpm during migration for speed, then switched back to npm due to potential deployment issues with `pac pages` CLI. The override syntax differs: pnpm uses `pnpm.overrides`, npm uses top-level `overrides` in package.json.

## Migration 2: LangHandler.tsx rewrite (completed)

### Bugs found in the original code

1. **Infinite render loop**: `fetchAndAddTranslations` was defined inline (new reference every render) but included in `useEffect` dependency array. Combined with `langParam !== i18n.language` being always true when `langParam` is null, this caused infinite `changeLanguage()` calls.

2. **JSON parse error**: `fetchAndAddTranslations` called `/_api/actum_translations` which doesn't exist locally, returning HTML 404. `JSON.parse()` on HTML = crash. This error was secondary to the infinite loop (triggered repeatedly because of it).

3. **Dataverse query used locale-dependent display names**: The old code used `t("languages:options")` to get language display names for the Dataverse query. But the display names were localized (English→"French", French→"Français"). The Dataverse `actum_translation` table stores fixed English names ("English", "French", "Dutch"). So the query only worked correctly when the UI was in English.

### How it was fixed

The component was rewritten with two separate effects:

1. **Effect 1 (URL↔i18n sync)**: If `?lang=XX` param is valid → sync i18n. If absent → write current lang to URL. Uses `setSearchParams` (React Router v6 idiomatic) instead of `navigate()`.

2. **Effect 2 (Dataverse fetch)**: Uses a fixed `LANG_DISPLAY_NAMES` map (`"en-GB" → "English"`, etc.) to query Dataverse. Wrapped in try/catch so failures fall back silently to bundled JSON translations.

### Dataverse Translation table verified

The `actum_translation` table was verified in Power Apps Maker Portal:

- **Primary column** (`actum_translationname`): stores "English", "French", "Dutch" (fixed English display names)
- **Language column**: lookup field showing same values
- The table has 3 records, one per supported language
- Schema name: `actum_translationName`, logical name: `actum_translationname`

### The `actum_translation` Web API was not configured on the current portal

Querying `/_api/actum_translations` on the current portal returned "Resource not found". The Web API site settings for this table only exist in the old `vmbso-customer-portal-v2/.powerpages-site/` config, not in the current `.powerpages-site/`. The translation fetch will fail silently until the Web API is enabled for this table on the portal.

## Migration 3: Zustand + TanStack Query (completed)

### Architecture decision

**TanStack Query handles server state** — anything fetched from Dataverse/flows (session, documents, brands, countries, roles, languages). The TQ cache IS the store. No Zustand needed for server data.

**Zustand handles client-only state** — cookie preferences and dialog visibility. This was the only context with purely client-side state.

### What was replaced

| Before                                              | After                                                                                        |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `AuthContext` (Context + useState + useEffect)      | `useAuth()` hook with `useQuery` for session                                                 |
| `CookiesContext` (Context + useState + Dialog JSX)  | `useCookiesStore` (Zustand) + `CookieConsentDialog` component + `AnalyticsTracker` component |
| `useDocuments` (useState + useEffect + useCallback) | `useDocuments` with `useQuery`                                                               |
| 6 useState + 3 useEffect in UpdateProfile           | `useBrands()`, `useCountries()`, `useRoles()`, `useLanguagesByCountry()` hooks               |
| Manual VAT search with try/catch                    | `useVatSearch()` mutation                                                                    |
| Manual profile submit with try/catch                | `useUpdateProfile()` mutation                                                                |

### What was NOT migrated (by design)

- **Download polling** in Documents.tsx — complex timeout-based polling with SAS token. Left as-is.
- **Local form useEffect** in UpdateProfile.tsx (clearing language when country changes) — UI logic, not data fetching.
- **Services layer** (`apiClient`, `authService`, `dataverseService`) — untouched. TQ hooks call into them.

### Behavior differences from old code (accepted)

1. **UpdateProfile lookup data**: Old code refetched brands/countries/roles when `currentUser` changed (had `[currentUser]` dependency). New TQ hooks fetch once and cache globally. These are static lookup tables — caching is correct.

2. **GA initialization**: Old `CookiesContext` only initialized GA on first visit (no consent cookie). New `AnalyticsTracker` always initializes. The old behavior was buggy (GA didn't track returning users). Accepted as a bug fix.

3. **`useAuth()` return type is identical**: `{ currentUser, isAuthenticated, isProfileComplete, loading, logout, refreshUser }`. All consumer components only needed import path changes, not code changes.

## React Router future flags

Only `v7_startTransition` is enabled. `v7_relativeSplatPath` was intentionally NOT added — it changes relative path matching for multi-segment splat routes, and while this app doesn't use them, the flag was removed to avoid any uncertainty. The `v7_relativeSplatPath` deprecation warning will appear in the console.

## Pending work

- Replace `react-ga` with `react-ga4` (GA4 Measurement ID with UA library = mismatch)
- Mock data setup for local development (most API calls fail silently in dev)
- Clean up dead code: `Register.tsx`, `src/types/auth.ts`, debug console.logs
- Set up error boundaries
- Consider React Hook Form for `UpdateProfile.tsx`
