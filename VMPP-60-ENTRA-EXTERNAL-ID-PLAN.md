# VMPP-60: Entra External ID Integration Plan

**Branch:** `feature/VMPP-60_Entra_External_ID`  
**Date:** February 25, 2026

---

## Context

Migrate authentication from mock/local auth to Microsoft Entra External ID via Power Pages redirect-based OAuth. Power Pages handles OAuth server-side (Client Secret never exposed to browser). React SPA only handles session cookies and redirects.

**Key Rules:**
- ❌ No custom login forms — Entra External ID handles login/register UI
- ❌ No MSAL.js or token handling in React
- ❌ No manual Contact record creation — Power Pages does this automatically
- ✅ Redirect to `/signin` and `/register` (Power Pages endpoints)
- ✅ Session managed via HTTP-only cookie (`credentials: 'include'`)
- ✅ Post-login: land on `/`, React routing handles profile check

---

## Infrastructure / Power Pages Configuration

### Azure App Registration (Entra External ID)
- [ ] **Redirect URI** (already set): `https://site-spa.powerappsportals.com/signin-oidc`
- [ ] **Logout URL** (add this): `https://site-spa.powerappsportals.com/`

### Power Pages Site Settings
- [ ] Entra External ID configured as **default** identity provider ✅ (confirmed)
- [ ] Post-login redirect target: `/` (React routing takes over from there)

---

## Auth Flow

```
User visits app (unauthenticated)
    ↓
React ProtectedRoute → Navigate to /login
    ↓
Login page → window.location.href = '/signin'
    ↓
Power Pages → auto-redirects to Entra External ID (default provider)
    ↓
User authenticates (login or first-time registration)
    ↓
Entra → Power Pages /signin-oidc (exchange code for tokens, server-side)
    ↓
Power Pages → creates Contact + ExternalIdentity in Dataverse (automatic)
    ↓
Power Pages → sets HTTP-only session cookie → redirects to /
    ↓
React App loads at /
    ↓
AuthContext.checkSession() → GET /_api/contacts (cookie sent automatically)
    ↓
IF profile fields missing → Navigate to /update-profile
ELSE                       → Navigate to /documents
```

---

## Implementation Steps

### Step 1 — Fix `checkSession` Web API call
**File:** `src/services/authService.ts`  
**Status:** ✅ DONE

Current OData filter `$filter=contactid eq @current_user` is invalid. Power Pages returns the authenticated user's own Contact automatically.

- Changed endpoint to: `/_api/contacts?$select=contactid,firstname,...all profile fields`
- Included **all profile fields** in `$select` (required for `isProfileComplete` check)
- 401/403 → returns `null` (not authenticated), does not throw
- Unexpected errors → returns `null` + logs to console (no unhandled rejections)

---

### Step 2 — Fix `updateProfile` Dataverse endpoint
**File:** `src/services/authService.ts`  
**Status:** ✅ DONE

- Changed from fake `/_api/update-contact` to `PATCH /_api/contacts(${contactid})`
- Destructures `contactid` out of the body (must not be in PATCH payload)
- Added `'If-Match': '*'` header (required by Dataverse to prevent accidental create)
- Added `credentials: 'include'` (session cookie)
- 204 No Content → re-fetches session to return updated Contact
- Includes error text from response body in thrown error for easier debugging

---

### Step 3 — Simplify `AuthContext` for redirect-based auth
**File:** `src/contexts/AuthContext.tsx`  
**Status:** 🔲 TODO

`login()` and `register()` currently run code after `window.location.href = ...` which never executes (page navigates away).

- Remove `login()` and `register()` methods from context and `AuthContextType` interface
- Keep: `checkSession()`, `logout()`, `refreshUser()`
- Keep: `currentUser`, `isAuthenticated`, `isProfileComplete`, `loading`
- `logout()`: redirect to `/Account/Login/LogOff?federated=true` (clears Entra session too)

---

### Step 4 — Simplify Login page to redirect button
**File:** `src/pages/Login.tsx`  
**Status:** 🔲 TODO

Remove email/password form. Replace with redirect button.

- Remove form fields and submit handler
- Primary button: **"Sign In"** → `window.location.href = '/signin'`
- Secondary link: "First visit?" → `window.location.href = '/register'`
- Keep VMBSO branding and two-column layout

---

### Step 5 — Simplify Register page to redirect button
**File:** `src/pages/Register.tsx`  
**Status:** 🔲 TODO

Remove registration form. Replace with redirect button.

- Remove all form fields and submit handler
- Primary button: **"Create Account"** → `window.location.href = '/register'`
- Secondary link: "Already have an account?" → `window.location.href = '/signin'`
- Add note: "You'll be redirected to create your account securely"

---

### Step 6 — Update user avatar / menu in Layout
**File:** `src/components/Layout.tsx`  
**Status:** 🔲 TODO

Show logged-in user details in header.

- Display user's full name next to avatar icon (hidden on mobile)
- Dropdown menu header: show name + email
- Keep: **Profile** and **Logout** menu items

---

### Step 7 — Build, deploy and test
**Status:** 🔲 TODO

```bash
npm run build
pac pages upload-code-site --rootPath . --compiledPath ./build --siteName "VMBSO Customer Portal"
```

**Test checklist:**
- [ ] Unauthenticated visit → redirected through Entra → back to app authenticated
- [ ] Session check returns Contact with all profile fields
- [ ] Incomplete profile → lands on `/update-profile`
- [ ] Submit profile form → PATCH succeeds → redirected to `/documents`
- [ ] Refresh page → session persists, stays on `/documents`
- [ ] Logout → session cleared → redirected to `/login`

---

### Step 8 — Add Logout URL to App Registration
**Status:** 🔲 TODO (Azure Portal action)

- Azure Portal → Entra External ID → App Registrations → `vmbso-customer-portal`
- Authentication → **Front-channel logout URL**: `https://site-spa.powerappsportals.com/`

---

## Notes

- `/_api/contacts` endpoint requires **Web API** enabled in Power Pages for the `contacts` table
- Power Pages Site Settings to verify: `Webapi/contact/enabled = true`
- Profile completion check is driven by `requiredFields` array in `AuthContext.tsx` — easy to add/remove fields
- Local dev still uses `REACT_APP_DEV_MODE=true` with mock user (set in `.env.local`)
