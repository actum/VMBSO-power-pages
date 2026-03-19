# Power Pages & Microsoft Platform Integration

This document explains how the React SPA integrates with Microsoft Power Pages, Entra External ID, Dataverse, and Power Automate. Read this if you need to understand the "Microsoft side" of the project.

## What is Power Pages?

Power Pages is Microsoft's low-code portal platform (formerly "Power Apps Portals"). It provides:

- A web hosting environment on `*.powerappsportals.com`
- Built-in authentication (integrates with Entra ID / Azure AD)
- A Web API proxy to Dataverse (`/_api/*` endpoints)
- CSRF protection via anti-forgery tokens
- A CLI tool (`pac pages`) for deploying custom code ("code sites")

Our React SPA is deployed as a **code site** — Power Pages hosts the built JS/CSS/HTML as "web files" and serves them. The SPA then uses Power Pages' built-in APIs for auth and data.

## Authentication Flow

Authentication uses **Microsoft Entra External ID** (formerly Azure AD B2C) via Power Pages' built-in federated auth.

### Login sequence

```
User clicks "Log in"
    │
    ▼
SPA creates hidden <form> and POSTs to /Account/Login/ExternalLogin
    │  Fields: provider (Entra authority URL), returnUrl (/login), __RequestVerificationToken
    │
    ▼
Power Pages 302-redirects to Entra External ID login page
    │
    ▼
User authenticates with Entra
    │
    ▼
Entra redirects back to Power Pages callback
    │
    ▼
Power Pages creates session cookie, redirects to returnUrl (/login)
    │
    ▼
SPA detects session via window.Microsoft.Dynamic365.Portal.User.userName
    │
    ▼
SPA fetches Contact record from /_api/contacts
    │
    ▼
Profile complete? → /documents : /update-profile
```

### Session detection

```typescript
const portalUser = window?.Microsoft?.Dynamic365?.Portal?.User;
const isLoggedIn = !!portalUser?.userName;
```

This global is populated by Power Pages after a successful login callback. It's available immediately, even before the Dataverse Web API is ready.

### Logout

Federated logout clears both the Power Pages session and the Entra session:

```
GET /Account/Login/LogOff?federated=true
```

This navigates the browser away — the page unloads entirely.

## CSRF Tokens

Power Pages requires a `__RequestVerificationToken` for all mutating requests (POST, PATCH, DELETE).

### How to obtain the token

**Strategy A** — `window.shell.getTokenDeferred()` (preferred, available in modern portal setups):

```typescript
const token = await window.shell.getTokenDeferred();
```

**Strategy B** — Fetch and parse `/_layout/tokenhtml` (fallback):

```typescript
const res = await fetch("/_layout/tokenhtml", { credentials: "include" });
const text = await res.text();
const doc = new DOMParser().parseFromString(text, "text/html");
const token = doc.querySelector(
  'input[name="__RequestVerificationToken"]',
)?.value;
```

Both strategies are implemented in `src/services/apiClient.ts` → `getCsrfToken()`.

## Dataverse Web API

Power Pages provides a proxy to the Dataverse (CRM) Web API at `/_api/*`. Key characteristics:

- **Auto-scoped**: `/_api/contacts` only returns the authenticated user's own Contact record
- **OData v4**: Standard OData query syntax (`$select`, `$filter`, `$expand`, `$orderby`, `$top`)
- **Credentials**: Requests must include `credentials: 'include'` for the session cookie
- **CSRF required**: Mutating operations need the `__RequestVerificationToken` header
- **Caching**: Power Pages aggressively caches responses. Records updated server-side (by flows/plugins) may return stale data. The codebase uses cache-busting query filters to work around this.

### OData headers for mutations

```typescript
headers: {
  'Accept': 'application/json',
  'OData-MaxVersion': '4.0',
  'OData-Version': '4.0',
  'Content-Type': 'application/json',
  '__RequestVerificationToken': csrfToken,
  'If-Match': '*',  // Required for PATCH
}
```

### Lookup bind syntax

When setting a lookup field via PATCH/POST, use OData bind syntax:

```typescript
// Setting parentcustomerid on a Contact to link it to an Account
{ "parentcustomerid_account@odata.bind": "/accounts(GUID-HERE)" }

// Setting a contact as primary contact on an Account
{ "primarycontactid@odata.bind": "/contacts(GUID-HERE)" }
```

See `docs/DATAVERSE-SCHEMA.md` for complete entity/field reference.

## Power Automate Cloud Flows

Some operations use Power Automate cloud flows instead of direct Dataverse API calls. These handle complex business logic that runs server-side.

### How flows are called

Flows are invoked via POST to `/_api/cloudflow/v1.0/trigger/{flowId}`:

```typescript
const response = await fetch(flowUrl, {
  method: "POST",
  credentials: "include",
  headers: {
    __RequestVerificationToken: csrfToken,
    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
    "x-requested-with": "XMLHttpRequest",
  },
  body: new URLSearchParams({ eventData: JSON.stringify(payload) }),
});
```

This is implemented in `src/services/apiClient.ts` → `apiClient.flow()`.

### Current flows

| Flow                | ID                                     | Purpose                                          |
| ------------------- | -------------------------------------- | ------------------------------------------------ |
| **Update Profile**  | `0bc41f4c-841c-f111-8341-000d3a66f792` | Creates/links Account, updates Contact fields    |
| **Fetch Documents** | `a276b369-b11e-f111-8341-000d3a66f974` | Returns product documentation list for a contact |

Flow IDs are configured in `src/config/powerPages.config.ts` → `config.flows`.

### Flow response format

Flows return JSON with a status/message pattern:

```json
{ "status": "200", "data": [...], "message": "Success" }
{ "status": "500", "message": "Error description" }
```

Note: `status` is a **string**, not a number.

## Deployment

### Build and deploy

```bash
npm run build          # Vite build → ./dist/
npm run deploy         # Build + upload to Power Pages
```

The deploy script runs:

```bash
npm run build && pac pages upload-code-site --rootPath ./ --compiledPath ./dist --siteName "VMBSO Customer Portal v2"
```

The `pac pages upload-code-site` CLI reads `--compiledPath` at deploy time — the `dist` folder is gitignored and does not need to be committed.

### Download site definition

```bash
npm run download       # Downloads Power Pages site config to .powerpages-site/
```

### The `.powerpages-site/` folder

This folder contains the Power Pages site definition (downloaded via `pac pages download-code-site`). It includes:

- `content-snippets/` — Header, footer, search UI text
- `page-templates/` — Page template definitions
- `publishing-states/` — Draft/Published states
- `site-languages/` — Language configuration (English)
- `site-settings/` — Auth settings, feature flags, search config
- `sitemarkers/` — Named page references (Home, Profile, Search, etc.)
- `web-files/` — Static assets deployed to the portal (JS bundles, CSS, fonts, images)

> **Important**: The `web-files/` folder contains build artifacts from previous deployments. These are managed by the `pac pages` CLI — do not manually edit them.

## Dev Mode

When `VITE_DEV_MODE=true` (set in `.env.development.local`):

- Authentication is bypassed — a mock Contact is used from localStorage
- The mock user has all required fields populated, so the app lands on `/documents`
- Profile updates write to localStorage instead of Dataverse
- Logout clears localStorage and redirects to `/login`

The Vite dev proxy in `vite.config.ts` forwards `/_api` and `/_services` requests to the real Power Pages portal for testing API calls during development.

## Environment Variables

| Variable                     | Purpose                                    | Example                                    |
| ---------------------------- | ------------------------------------------ | ------------------------------------------ |
| `VITE_DEV_MODE`              | Enable mock auth & localStorage user       | `true` / `false`                           |
| `VITE_PORTAL_URL`            | Power Pages portal base URL                | `https://site-spa.powerappsportals.com`    |
| `VITE_ENTRA_PROVIDER`        | Entra authority URL for ExternalLogin form | `https://vmbsodev.ciamlogin.com/{tenant}/` |
| `VITE_GOOGLE_ANALYTICS_ID`   | GA4 Measurement ID                         | `G-T2PJKHCEPX`                             |

Env vars use `VITE_*` prefix and are accessed via `import.meta.env.VITE_*` in code.
