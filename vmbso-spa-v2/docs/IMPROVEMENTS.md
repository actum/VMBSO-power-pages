# Planned Improvements

This document tracks planned improvements and migrations for the VMBSO Customer Portal.

## Completed

### CRA → Vite Migration

Migrated from Create React App to Vite 7. Upgraded MUI v5 → v7, TypeScript 4.9 → 5.8, and all dependencies to latest compatible versions. See `docs/MIGRATION-LOG.md` for details.

### Zustand (State Management)

Zustand store for cookie consent preferences (`useCookiesStore`). Auth state is managed by TanStack Query since it's server state. See `docs/MIGRATION-LOG.md`.

### TanStack Query (Data Fetching)

All manual `useState`/`useEffect` data fetching replaced with TanStack Query hooks. See `docs/MIGRATION-LOG.md`.

### LangHandler Fix

Rewrote `LangHandler.tsx` to fix infinite render loop and Dataverse translation query bug. See `docs/MIGRATION-LOG.md`.

## Priority 1: Mock Data Setup

**Status**: Completed (basic)

Dev mode (`VITE_DEV_MODE=true` in `.env.development.local`) now mocks all API calls inline in the service layer. Auth, Dataverse lookups, Power Automate flows, CSRF tokens, and download logs all return realistic mock data so the full UI is usable locally.

### Future improvement: MSW (Mock Service Worker)

The current approach adds `if (config.devMode)` checks at the top of each service function. This works but mixes mock logic with production code. A future improvement would be to migrate to MSW, which intercepts fetch calls at the network level. Benefits:

- Services stay completely clean (no dev mode checks)
- Mocks live in a separate `src/mocks/` folder
- Can simulate errors, delays, and edge cases
- Same mocks work for future tests

## Priority 2: Cleanup & Dead Code

**Status**: Not started

- Remove `Register.tsx` — not routed, hardcoded French text, mock data
- Remove debug `console.log` statements throughout the codebase
- Remove `src/types/auth.ts` — unused `ContactLanguage` type
- Clean up `Contact` type — fields marked as TODO should be resolved

## Priority 3: Google Analytics Fix

**Status**: Not started

The project uses `react-ga` (Universal Analytics library) but the Measurement ID in `.env.production` is a GA4 ID (`G-T2PJKHCEPX`). Replace `react-ga` with `react-ga4` package.

## Future Considerations

- **Form library** (React Hook Form or similar) for `UpdateProfile.tsx`
- **Test setup** — no tests currently exist
- **Error boundaries** — no React error boundaries
- **Loading skeletons** instead of bare `CircularProgress`
- **Download UX** — migrate polling logic to TanStack Query with `refetchInterval`
