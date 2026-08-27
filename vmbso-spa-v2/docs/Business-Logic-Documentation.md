# VMBSO Customer Portal v2 — Business Logic Documentation

**Version:** 1.0
**Last updated:** 2026-08-27

## Overview

The VMBSO Customer Portal is a Power Pages "code site" (a React/TypeScript Single Page Application hosted on Microsoft Power Pages, backed by Dataverse) built for VMBSO's brand partners — **installers**, **distributors**, and **architects** who work with VMBSO's construction-materials brands (VMZINC, Resitrix, Mastersystems, and others). Once a partner company is registered and approved, its contacts can log in to:

- read company-specific news and browse/download product documentation,
- upload purchase invoices to earn loyalty points,
- redeem those points for rewards, which generate vouchers,
- (for distributor contacts) redeem vouchers presented by installers.

Everything a user sees is scoped to **their own Contact record** and to the **Account (company)** that Contact belongs to — most content is additionally filtered by the company's language, country, role, and brand affiliations.

## Architecture & Tech Stack (brief)

- **Frontend**: React 18 + TypeScript, Material UI (MUI) components, `react-router-dom` for routing, `react-i18next` for localization, `react-ga4` for Google Analytics, `react-dropzone` for file uploads, `react-toastify` for notifications (`src/App.tsx` 1-158).
- **Hosting**: Microsoft Power Pages "code site" — the compiled SPA is served by the Power Pages runtime, which also provides authentication, the Dataverse Web API proxy (`/_api/...`), and CSRF token issuance.
- **Backend/data**: Microsoft Dataverse tables (all prefixed `actum_...` for custom entities, plus standard `contact`/`account`). Data is read either directly via the Dataverse **Web API** (OData, `/_api/...`) or indirectly via registered **Power Automate cloud flows** (`/_api/cloudflow/v1.0/trigger/<guid>`) for operations too complex or sensitive for direct table permissions (e.g. cross-account joins, VAT lookups, reward claiming, voucher redemption) (`src/config/powerPages.config.ts` 90-107).
- **Identity provider**: Microsoft Entra External ID (Azure AD B2C successor), wired through Power Pages' OpenID Connect provider configuration (`Authentication-OpenIdConnect-EntraExternalID_3-*` site settings).

## Authentication & Authorization

### Identity provider and login flow

- The site uses **Entra External ID** as an OpenID Connect provider registered in Power Pages (`Authentication-OpenIdConnect-EntraExternalID_3-*.sitesetting.yml`). Local username/password login is disabled (`Authentication-Registration-LocalLoginEnabled` = `false`), and external login is enabled (`Authentication-Registration-ExternalLoginEnabled` = `true`).
- Login is initiated client-side by building a hidden HTML `<form>` that POSTs to Power Pages' `/Account/Login/ExternalLogin` endpoint together with a CSRF token (`__RequestVerificationToken`) and a `provider` value equal to the Entra authority URL (`src/pages/Login.tsx` 53-94). Power Pages then 302-redirects to Entra External ID.
- The Entra "provider" identifier and the Google Analytics measurement ID are **not** baked into the build — they are fetched at runtime from a dedicated `actum_publicconfig` Dataverse table so they can differ per environment (dev/test/prod) without a rebuild (`src/services/publicConfigService.ts` 1-28, `src/config/powerPages.config.ts` 42-49). This table is loaded anonymously before login (table permission scope = Global, both Anonymous and Authenticated web roles) (`.powerpages-site/table-permissions/Public-Config.tablepermission.yml`).
- "Create account" uses the same ExternalLogin POST but adds `prompt=create` so Entra shows its sign-up flow instead of sign-in (`src/pages/Login.tsx` 182-191). There is a separate `src/pages/Register.tsx` local-registration form, but it is **not wired into any route** in `App.tsx` and appears to be legacy/unused UI (it submits by simply redirecting to `/register`, doing no real API call) (`src/pages/Register.tsx` 84-90).
- **Logout** is a federated logout: `/Account/Login/LogOff?federated=true`, which clears both the Power Pages session and the Entra External ID session (single sign-out). It also must be a **form POST** with the CSRF token — a plain link/GET is silently ignored by Power Pages (`src/services/authService.ts` 60-100, `src/config/powerPages.config.ts` 8-13).

### Session / current-user resolution

- After redirect back from Entra, the app checks `window.Microsoft.Dynamic365.Portal.User.userName` (a global Power Pages sets once a session cookie exists) before trying the Web API, because that variable is populated before the Web API is ready (`src/services/authService.ts` 125-144).
- If a session is present, the app fetches the current user's own `Contact` record. Power Pages automatically scopes `/_api/contacts` to the authenticated user's own record — no explicit filter is needed (`src/services/dataverseService.ts` 131-232, comment at `src/services/authService.ts` 104-106).
- Because Power Pages does not allow expanding `parentcustomerid` (the company/Account lookup) directly on Contact, the app performs three sequential calls: Contact → Account (by `_parentcustomerid_value`) → Role (`actum_role`) → Country (`actum_country`) (`src/services/dataverseService.ts` 187-220).
- A **dev mode** (`import.meta.env.DEV`, i.e. local `vite dev`) completely bypasses real authentication with a hardcoded mock Contact/Account/Role/Country stored in `localStorage`, so profile edits round-trip locally without Dataverse (`src/services/authService.ts` 10-57, 108-168).

### Profile completeness gate

- A profile is considered "complete" only when: `telephone1` (personal phone) is filled **and** the Contact is linked to an Account (`_parentcustomerid_value` is set) (`src/contexts/AuthContext.tsx` 19-50).
- `ProtectedRoute` is the single point that enforces the redirect chain for every route except `/login`:
  1. Not authenticated (or rejected) → `/login` (`src/components/ProtectedRoute.tsx` 54-57)
  2. Authenticated but profile incomplete (and the route requires completeness) → `/update-profile` (`src/components/ProtectedRoute.tsx` 59-62)
  3. `/invoices` and `/vouchers` have extra per-route permission checks (below) that redirect to `/documents` if not satisfied (`src/components/ProtectedRoute.tsx` 64-81).
- `/update-profile` is the one protected route that explicitly sets `requireCompleteProfile={false}`, so users with an incomplete profile can still reach it (`src/App.tsx` 121-128).

### Approval status

- Contacts carry an `actum_approvalstatus` choice field with (at least) these known values: `182980000` = Pending, `182980001` = Approved, `182980002` = Rejected (`src/contexts/AuthContext.tsx` 5, 34; `src/components/Layout.tsx` 39-41; `src/utils/accessControl.ts` 5).
- **Rejected** users (`actum_approvalstatus = 182980002`) are treated as not-authenticated for routing purposes — `ProtectedRoute` sends them to `/login`, where a rejection message is shown instead of auto-redirecting away (`src/components/ProtectedRoute.tsx` 55-57, `src/pages/Login.tsx` 31-46, 148-153).
- **Pending** users (`182980000`) can use the portal but see a persistent warning banner under the header ("Pending Approval Ribbon") (`src/components/Layout.tsx` 39-41, 257-272).

### Registration / company linking flow (Update Profile)

`src/pages/UpdateProfile.tsx` handles two distinct needs in one form:

1. **Personal details** — phone number, validated as E.164 (`isValidE164`, `src/utils/phoneUtils.ts` 22-28) and auto-formatted as the user types.
2. **Company linking** — the user enters a VAT number; the app calls a Power Automate flow to search for a matching `Account` by VAT (`dataverseService.accounts.searchByVAT`, `src/services/dataverseService.ts` 284-312, flow id `b71ed49e-...`):
   - If found (`vatSearchState = "found"`), the company name is auto-filled and locked; only personal phone still needs completing.
   - If not found (`vatSearchState = "notFound"`), a full "create new company" section appears requiring: country, company phone, address, city, postal code, company email, brand(s) (multi-select), and role — all required before submit (`src/pages/UpdateProfile.tsx` 219-330, 472-630).
3. On submit, everything is sent as a single payload to the `updateProfile` Power Automate flow (`config.flows.updateProfile`, `src/config/powerPages.config.ts` 91-92), which is responsible for creating/linking the Account server-side and updating the Contact (`src/pages/UpdateProfile.tsx` 240-292). The payload includes `accountId` (when a matching company was found via VAT search) but no longer includes `contactId` — this is the one flow trigger that still sends `accountId`.
4. Once the profile is already complete, the form switches to a locked, read-only mode for the already-set fields — an info alert explains this (`src/pages/UpdateProfile.tsx` 354-358, "profileLockedInfo").
5. The language dropdown is filtered to only the languages belonging to the selected country (`dataverseService.languages.getByCountry`, M2M relationship `actum_country_actum_language_actum_language`), and resets if the previously selected language no longer belongs to a newly chosen country (`src/pages/UpdateProfile.tsx` 140-151; `src/services/dataverseService.ts` 413-429).

### Roles and permission helpers

The Dataverse `actum_role` table defines partner roles (seen in code/UI: **Installer**, **Distributor**, **Architect** — `src/pages/Register.tsx` 27-31, `src/pages/UpdateProfile.tsx` 58-65). Role and permission logic lives in `src/utils/accessControl.ts`, always evaluated against the current user's linked **Account**'s Role and Country (not the Contact directly):

- `canAccessInvoices(user)` — true only if: user approved (`actum_approvalstatus === 182980001`) AND has a linked Account AND that Account's Role has `actum_uploadinvoicesallowed === true` AND the Account's Country also has `actum_uploadinvoicesallowed === true` (`src/utils/accessControl.ts` 21-55).
- `canAccessRewards(user)` — identical rule, reuses `canAccessInvoices` (`src/utils/accessControl.ts` 71-74).
- `canAccessVouchers(user)` — approved + linked Account, AND (Role name === "Distributor", case-insensitive) OR (same Role+Country invoice-upload permission as above) (`src/utils/accessControl.ts` 95-136).
- `isDistributor(user)` — true if Account's Role name equals "Distributor" (case-insensitive); in dev mode toggled via `REACT_APP_DEV_ROLE` env var, defaulting to `'distributor'` (`src/utils/accessControl.ts` 148-170).

These functions drive both navigation-menu visibility (`src/components/Layout.tsx` 83-96) and route-level redirects (`src/components/ProtectedRoute.tsx` 64-81) and voucher-page behavior (`src/hooks/useVouchers.ts` 30-31).

## Web Roles & Permissions

Three Power Pages web roles exist (`.powerpages-site/web-roles/*.webrole.yml`):

| Web role | Flag | Purpose |
|---|---|---|
| Anonymous Users | `anonymoususersrole: true` | Unauthenticated visitors (e.g. the public-config lookup before login) |
| Authenticated Users | `authenticatedusersrole: true` | All logged-in portal contacts — this is the role virtually every table permission below is granted to |
| Administrators | plain custom role, no special flags | Present but not referenced by any table permission seen in this review |

Table permissions (all granted to the "Authenticated Users" web role unless noted) define what each Dataverse table allows through the Web API, using Power Pages **scope** codes (Global / Contact / Account / Parent, etc. — exact numeric-to-name mapping wasn't found in the repo, so scope numbers are quoted verbatim below):

| Table | Read | Write | Create | Delete | Scope / relationship | Source |
|---|---|---|---|---|---|---|
| Contact | ✅ | ✅ | ❌ | ❌ | scope `756150004` | `Contact.tablepermission.yml` |
| Account | ✅ | ❌ (write:false) | ❌ | ❌ | scope `756150001`, relationship `contact_customer_accounts` | `Account-Read-Update.tablepermission.yml` |
| Invoices (`actum_invoice`) | ✅ | ✅ | ✅ | ❌ | scope `756150002`, relationship `actum_invoice_Account` | `Invoices.tablepermission.yml` |
| Invoice-Item | — | — | — | — | (not read in detail; items are fetched via a flow, not direct Web API) | `Invoice-Item.tablepermission.yml` |
| Rewards (`actum_reward`) | ✅ | ❌ | ❌ | ❌ | scope `756150000` (Global — catalog is shared) | `Rewards.tablepermission.yml` |
| Vouchers (`actum_voucher`) | ✅ | ❌ | ❌ | ❌ | scope `756150002`, relationship `actum_voucher_Account` | `Vouchers.tablepermission.yml` |
| Documents (`actum_productdocumentation`) | ❌ (`read: false`) | ❌ | ❌ | ❌ | scope `756150000` | `Documents.tablepermission.yml` — **read is explicitly false**, implying the Documents list is intentionally not readable via direct Web API and must go through the `fetchDocuments` flow instead |
| Public Config (`actum_publicconfig`) | ✅ | ❌ | ❌ | ❌ | scope `756150000`, granted to **both** Anonymous and Authenticated roles | `Public-Config.tablepermission.yml` |
| Brand, Country, Role, Languages, Landing-Page-Content, News-Page-Content(+intersects), Call-to-action, Download-Log, Loyalty-Transaction, Translation | (present, not individually inspected beyond confirming they exist) | | | | | `.powerpages-site/table-permissions/*` |

Web API column exposure (`Webapi/<table>/fields` site settings) for the core tables inspected (`contact`, `account`, `actum_invoice`, `actum_voucher`, `actum_reward`) is set to **`value: '*'`** — i.e. all columns on those tables are exposed to the client through the Web API once the row-level table permission above allows access (`Webapi-contact-fields.sitesetting.yml`, `Webapi-account-fields.sitesetting.yml`, `Webapi-actum_invoice-fields.sitesetting.yml`, `Webapi-actum_voucher-fields.sitesetting.yml`, `Webapi-actum_reward-fields.sitesetting.yml`). `actum_publicconfig` is the one table with an explicit narrow allow-list: only `actum_publicconfigid,actum_name,actum_value` (`Webapi-actum_publicconfig-fields.sitesetting.yml`).

**Ambiguity note:** the exact meaning of each numeric `scope` value (e.g. whether `756150004` on Contact literally means "self record only") is Power Pages platform metadata not present in this repository as human-readable text; it is reported here verbatim rather than guessed.

## Home Page

- Displayed at `/` (protected route, requires complete profile) (`src/App.tsx` 139-147).
- Content comes from the `actum_landingpagecontent` Dataverse table, one row per (language × country × role × brand) combination, with `null` on any of those lookup fields meaning "applies to everyone" for that dimension (`src/types/homePage.ts` 46-61; `src/services/dataverseService.ts` 930-1009).
- The matching row is selected via a Web API OData filter that combines: `statecode eq 1` and `statuscode eq 182980001` (a specific "published" status) AND null-or-match conditions on language, country, role, and (multi-value) brand (`src/services/dataverseService.ts` 962-990). **Note:** `statecode eq 1` is unusual since `1` normally denotes "Inactive" in Dataverse — this is exactly what the code filters on, so it is called out here as worth double-checking with the data owner rather than assumed to be a typo.
- The user's language, country, role and brand list are derived from the current Contact's `_actum_languageid_value` and the linked Account's country/role/brand M2M relationship (`src/hooks/useHomePage.ts` 80-104).
- The page renders: a personalized greeting (`{{name}}`/`{name}` placeholder interpolation against first/full name, falling back to "there", `src/hooks/useHomePage.ts` 12-16, 33), a hero title/intro (rich HTML, rendered via `dangerouslySetInnerHTML` — **not sanitized with DOMPurify** unlike News/Documents, `src/pages/Home.tsx` 62-74), hero image, one or more CTA buttons (each opens `_self` or `_blank` depending on a `target` choice value `182980001` = new tab, `src/types/homePage.ts` 14-15), and a full-width banner section with its own image/title/text.
- CTAs are fetched separately per landing-page row via an M2M expand (`actum_CallToActionButton_actum_LandingPageContent_actum_LandingPageContent`) (`src/services/dataverseService.ts` 1011-1046).

## News

- Route `/news`, protected (`src/App.tsx` 130-137).
- Source table: `actum_newspagecontents`. Brand association is a many-to-many intersect (`actum_newspagecontent_actum_brand_actum_brand`); role targeting is a separate M2M (`actum_newspagecontent_actum_role_actum_role`); CTAs are a third M2M (`actum_calltoactionbutton_actum_newspage`) (`src/hooks/useNews.ts` 1-7, 119-121).
- Filtering, applied via OData `$filter` plus client-side post-filtering:
  - Only `statecode eq 0` (active) articles.
  - Only articles whose `actum_publishdate` is null or in the past (`src/hooks/useNews.ts` 166-171) — i.e. **future-dated articles are hidden**, a scheduled-publish mechanism.
  - Language and country: null-or-match against the Contact's language and the Account's country (`src/hooks/useNews.ts` 172-177).
  - Role: post-fetch client-side filter — an article with no roles attached is shown to everyone; otherwise the viewer's Account role must be in the article's role list (`src/hooks/useNews.ts` 279-285).
  - Brand: post-fetch client-side filter — an article with no brands attached is shown to everyone; otherwise at least one article brand must be among the Account's linked brands (`src/hooks/useNews.ts` 287-292).
- UI supports filtering the visible list by brand via chips, and shows articles in a modal with rich-text body (sanitized with `DOMPurify.sanitize`, `src/pages/News.tsx` 289-308) — unlike the Home page's hero/intro text, News content **is** sanitized before rendering.
- A 401/403 from the news query is treated as "no visible articles" rather than a hard error (graceful degrade) (`src/hooks/useNews.ts` 311-314).

## Documents

- Route `/documents`, protected; this is effectively the default landing point once the profile is complete for the download-oriented workflow.
- Because the `Documents` table permission explicitly disallows direct read (`read: false`), documents are fetched exclusively through a Power Automate flow (`config.flows.fetchDocuments`, `src/hooks/useDocuments.ts` 106-112); the request payload is empty — `contactId` was removed as unused.
- The flow returns **one row per document-brand pair** (and further duplicated per document-type pair) — a document linked to 2 brands and 2 document types would come back as 4 rows. The frontend deduplicates these into one card per document with aggregated `brands[]` and `documentTypes[]` arrays (`src/hooks/useDocuments.ts` 48-82).
- Users can: search (name/filename/description), filter by brand and by document type (checkboxes, "select none = show all" semantics), and download a file (`src/pages/Documents.tsx` 149-259).
- **Download flow** is asynchronous: clicking Download (1) creates an `actum_downloadlog` record linking the Contact and the Document, then (2) polls that record every 3 seconds (up to a 60-second timeout) until an `actum_sastoken` (a SharePoint/Azure Blob SAS URL) appears, at which point the browser triggers the actual file download via a synthetic `<a download>` click (`src/pages/Documents.tsx` 174-259). This implies a backend process (flow/plugin) asynchronously generates a short-lived signed URL after the log record is created.
- Cache-busting is applied on the polling GET (`modifiedon` compared against a synthetic future timestamp) since Power Pages' Web API can cache reads that don't naturally change (`src/services/dataverseService.ts` 1117-1136).
- Documents also have an `actum_unapprovedaccess` flag and `actum_visible` flag in the raw data model (`src/types/document.ts` 13-14), though the frontend does not appear to filter on them directly — that filtering is presumably done server-side inside the `fetchDocuments` flow (not visible in this repo).

## Invoices

- Route `/invoices`, gated by `canAccessInvoices` (Approved + Account's Role AND Country both allow invoice uploads) — otherwise redirected to `/documents` (`src/components/ProtectedRoute.tsx` 64-71; `src/utils/accessControl.ts` 21-55).
- Two tabs: **My Invoices** (list) and **Upload New** (`src/pages/Invoices.tsx` 161-166).
- **List** is fetched via a Power Automate flow (`config.flows.fetchInvoices`); the request payload no longer includes `contactId` or `accountId` (removed as unused by the flow) — the flow is responsible for deriving the caller's Account and returning already-enriched rows (uploader name/email, account name) (`src/hooks/useInvoices.ts` 12-37; `src/services/dataverseService.ts` 528-684).
- **Status model** (`actum_invoice.statuscode`) — `Draft(1)`, `Canceled(2)`, `Submitted(182980001)`, `Extracted(182980002)`, `Review(182980003)`, `Rejected(182980004)`, `Credited(182980005)` (`src/types/invoice.ts` 61-69). Users can search by invoice number/uploader and filter by any of these statuses (`src/pages/Invoices.tsx` 93-120).
- **Credited invoices** show the loyalty points granted directly on the card, and can be expanded to reveal the individual invoice line items that earned points — fetched on-demand via another flow (`config.flows.getInvoiceItems`, request payload is just `invoiceId` — `contactId` was removed as unused) and cached client-side once loaded, filtered to only lines where `actum_loaltypointsgranted > 0` (`src/pages/Invoices.tsx` 56-90, `src/services/dataverseService.ts` 866-903).
- **Rejected invoices** show a rejection reason (`actum_rejectionreason`) instead of point lines (`src/pages/Invoices.tsx` 283-321).
- **Upload flow** (`src/components/Invoices/UploadNewInvoice.tsx`, `src/services/dataverseService.ts` 727-864):
  1. File must be PDF, XML, or JPEG, single file, **max 10 MB** (`MAX_FILE_SIZE_MB = 10`, `src/components/Invoices/UploadNewInvoice.tsx` 23-24, 89-96).
  2. Step 1: create a bare `actum_invoice` record bound to the current Contact and Account.
  3. Step 2: PATCH the raw file bytes onto the invoice's `actum_invoicedocument` file column, with the filename sanitized to ASCII/Latin-1 for the HTTP header (non-Latin-1 characters like smart quotes, CJK, emoji would otherwise throw synchronously when set as a header value) (`src/services/dataverseService.ts` 73-99).
  4. **If the file attach step fails** after the record was already created, the invoice is not deleted (the portal contact only has create/write, not delete, on Invoices) — instead it's PATCHed to `statuscode = Canceled(2)` so it doesn't linger as a broken "draft" (`src/services/dataverseService.ts` 837-859).
  5. On success, the UI switches back to the "My Invoices" tab and shows a "processing" info banner (`src/pages/Invoices.tsx` 122-131).

## Rewards & Loyalty

- Route `/rewards`, gated by `canAccessRewards` (same rule as Invoices — Approved + Role/Country invoice-upload permission) (`src/utils/accessControl.ts` 71-74).
- **Points balance** is **Account-scoped, not Contact-scoped** — multiple contacts at the same company share one pool (`src/types/loyaltyTransaction.ts` 5-6, `src/hooks/useRewards.ts` 27-35). Balance is computed client-side as `SUM(credits where actum_transactiontype=1) − SUM(debits where actum_transactiontype=2)` over **active** (`statecode eq 0`) transactions for that Account (`src/services/dataverseService.ts` 1249-1296).
- **Reward catalog** (`actum_reward` table) is global (not filtered by brand/country/role in the code reviewed), active rewards only (`statecode eq 0`), ordered by lowest point cost first (`src/services/dataverseService.ts` 1225-1243).
- A reward card is only claimable if `balance >= reward.actum_pointamount`; unaffordable rewards are visually dimmed/disabled ("Insufficient points" chip) (`src/pages/Rewards.tsx` 242-244, 359-375, 413-424).
- **Claim flow**: confirmation modal shows current balance, cost, and computed new balance; on confirm, calls the `claimRewards` Power Automate flow with `accountId`, `contactId`, `pointAmount`, and the reward list; the flow validates balance server-side, creates the debit transaction(s), and generates voucher code(s) which are returned and shown to the user, also (per the success message) emailed to the contact (`src/pages/Rewards.tsx` 159-240, 514-596; `src/services/dataverseService.ts` 1298-1352).
- **Transaction history** modal lists all active loyalty transactions for the Account with description, date, type (credit "Addition"/debit "Deletion", green/red trend icon), status, and signed point amount (`src/pages/Rewards.tsx` 605-688; `src/services/dataverseService.ts` 1358-1449).
- Google Analytics events are fired for: catalog view, opening the claim modal, claim success/failure/error (`src/pages/Rewards.tsx` 122-145, 204-236).

## Vouchers

- Route `/vouchers`, gated by `canAccessVouchers`: Distributors always qualify; Installers/others qualify only under the same Role+Country invoice-upload rule as Invoices/Rewards (`src/utils/accessControl.ts` 76-136).
- Vouchers (`actum_voucher` table) are generated as a side effect of a reward claim (`_actum_rewardclaimlineid_value`, `_actum_loyaltytransaction_value` lookups link a voucher back to its originating claim/transaction) (`src/types/voucher.ts` 6-37).
- **Status model**: `Canceled(2)`, `Issued(182980001)`, `Redeemed(182980002)`, `Expired(182980003)` (`src/types/voucher.ts` 51-56).
- **View is role-dependent**, fetched via one shared flow (`getVouchers`) whose request payload is now empty (`accountId` and `role` were both removed as unused — the flow determines the caller and the installer/distributor branching itself), which runs a different FetchXML server-side per role so each viewer only receives the personal contact data they're entitled to see (`src/hooks/useVouchers.ts` 1-72; `src/services/dataverseService.ts` 1463-1649):
  - **Installers** see vouchers where `actum_account = <their account>` — i.e. vouchers their own company earned. Available status filters: issued, redeemed, canceled, expired.
  - **Distributors** see vouchers where `actum_distributorid = <their account>` — i.e. vouchers they have redeemed on behalf of installers. Available status filters: redeemed, canceled, expired (no "issued" — a distributor never sees an unredeemed voucher until it's presented to them).
- **Redemption (distributors only)**: a dedicated panel lets a distributor type/paste a voucher code (auto-uppercased) and:
  1. **Validate** — calls `validateVoucher` flow with the code + the distributor's own account/contact IDs; the flow rejects codes that don't exist, are already redeemed, or are expired (`src/services/dataverseService.ts` 1750-1824; `src/pages/Vouchers.tsx` 191-248).
  2. **Confirm & Redeem** — on confirmation, calls `redeemVoucher` flow with the validated voucher ID + distributor identity, which marks the voucher redeemed server-side (`src/services/dataverseService.ts` 1833-1877; `src/pages/Vouchers.tsx` 250-314).
- Voucher detail modal lets any user copy the code to clipboard and shows claimed-by/redeemed-by/reward/dates, with expired vouchers shown in red for the expiry date (`src/pages/Vouchers.tsx` 550-729).
- Google Analytics events fire for list view, detail open, copy, filter change, and every redemption validate/confirm outcome (`src/pages/Vouchers.tsx` 80-90, 131-137, 149-158, 179-188, 220-247, 286-311).

## Public Configuration & Multi-tenancy (brand/country)

- **Brand** (`actum_brand`) and **Country** (`actum_country`) are simple lookup tables, each with a Web API `enabled`/`fields` site setting, and each Account is linked to exactly one primary Country (`_actum_primarycountryid_value`) and one primary Role (`_actum_roleid_value`), plus a **many-to-many** set of Brands (`actum_account_actum_brand_actum_brand`) (`src/types/account.ts`, `src/services/dataverseService.ts` 337-353).
- Both `Country` and `Role` carry an `actum_uploadinvoicesallowed` boolean, which is the mechanism used to turn Invoices/Rewards/Vouchers access on or off **per market and per partner tier** without code changes — e.g. a country not yet onboarded to the loyalty program, or a role (like Architect) that isn't eligible, can be switched off centrally in Dataverse (`src/types/role.ts`, `src/types/country.ts`, `src/utils/accessControl.ts` 47-54).
- **`actum_publicconfig`** is a small, anonymously-readable key/value table used purely to carry non-secret, per-environment runtime settings: the Entra External ID provider identifier (`EntraProviderIdentifier`) and the Google Analytics measurement ID (`GoogleAnalyticsId`) — read once at app bootstrap before anything else renders (`src/services/publicConfigService.ts` 14-28, `src/main.tsx` 26-60).
- No further "multi-tenancy" isolation (e.g. separate sites per country/brand) was found — all brands/countries share the same single portal instance and are differentiated only by data filtering.

## Localization

- Supported locales: `en-GB` (fallback/default), `fr-FR`, `be-NL` (Belgian Dutch) (`src/i18n/index.ts` 12-13; `src/utils/languageMapper.ts` 67-76).
- Translation strings are normally loaded from a Dataverse `actum_translations` table (one record per language, `actum_content` holding a JSON blob keyed by i18next namespace), fetched once and cached; if Dataverse fails or returns malformed JSON for a language, the app falls back to bundled local JSON files (`src/i18n/engb.json`, `frfr.json`, `benl.json`) per-language (`src/services/translationService.ts` 24-158). In dev mode, only the local JSON files are used.
- Dataverse's own language codes (`nl-NL` for Dutch) are remapped to the frontend's Belgian-market code (`be-NL`) via an explicit lookup table, decoupling the Dataverse configuration from the frontend's locale naming (`src/utils/languageMapper.ts` 23-44).
- **Language resolution priority** on every page load (`src/components/LangHandler.tsx` 24-84):
  1. `?lang=xx-XX` URL query param (manual override, also persisted back into the URL).
  2. The signed-in user's saved language preference (`Contact._actum_languageid_value`, resolved to a frontend code via `getUserLanguageCode`).
  3. Browser-detected language (via `i18next-browser-languagedetector`).
  4. Hardcoded default `en-GB`.
- Changing language via the `LanguagePicker` component writes back through `getLanguageIdFromCode` so the selection can be persisted against the Contact's `actum_languageid` lookup (`src/utils/userLanguageService.ts` 74-98).
- Content filtering by language (News, Home landing content) treats a `null` language on the content record as "visible to all languages" (`src/services/dataverseService.ts` 965-970; `src/hooks/useNews.ts` 172-177).

## Data Access Layer (Web API / Dataverse patterns)

`src/services/apiClient.ts` and `src/services/dataverseService.ts` implement two parallel data-access strategies:

1. **Direct OData Web API** (`apiClient.odata`) — used for straightforward CRUD/reads where Power Pages table permissions are sufficient on their own (Contact, Account, Brand, Country, Role, Language, Reward catalog, Loyalty Transactions balance calc, Landing Page Content, News, Public Config, Download Logs, Invoice creation/upload). Every mutating call (`POST`/`PATCH`/`PUT`/`DELETE`) automatically attaches a CSRF token header (`__RequestVerificationToken`) fetched via `getCsrfToken()` (`src/services/apiClient.ts` 139-157, 203-223).
2. **Power Automate cloud flows** (`apiClient.flow`) — used whenever the operation needs cross-table joins the portal's own table permissions don't allow, server-side business validation, or write access the portal contact shouldn't have directly (fetching Documents, fetching Invoices with joined uploader/account names, fetching Invoice Items, claiming Rewards, fetching/validating/redeeming Vouchers, VAT lookup, and the whole Update-Profile Account-linking process) (`src/config/powerPages.config.ts` 90-107). Flow calls are POSTed as `application/x-www-form-urlencoded` with a single `eventData` JSON-encoded field, and responses generally follow a `{ status: "200"|"500"|"Success", data, message }` envelope which the frontend parses, sometimes double-JSON-encoded (`src/services/dataverseService.ts` 47-71, 660-684).
3. Generic HTTP concerns — timeout (30s default), one retry with exponential backoff, and status-code-to-friendly-message mapping (401→session expired, 403→no permission, 404→not found, 429→too many requests, 5xx→server error) — are centralized in `apiClient.request`/`requestWithResponse` (`src/services/apiClient.ts` 31-126).
4. Several read paths deliberately add a **cache-busting** filter clause (a `filter` condition that's always true but changes every request, e.g. comparing against a synthetic future timestamp) to defeat Power Pages/Dataverse response caching for data that must be fresh immediately after a write (download-log polling, loyalty balance) (`src/services/dataverseService.ts` 164-176, 1117-1126, 1259-1268).
5. Several M2M (many-to-many) Dataverse relationships are read via OData `$expand` on the intersect navigation property rather than a separate join table query (News↔Brand, News↔Role, News/LandingPage↔CTA, Account↔Brand, Country↔Language) — the exact navigation-property names are hardcoded as constants in each hook/service (`src/hooks/useNews.ts` 119-121; `src/services/dataverseService.ts` 337-345, 413-420, 1016).

## Known Business Rules Summary

- A user is authenticated exclusively through Entra External ID; local username/password login is disabled for this site.
- Logging out must be a CSRF-protected form POST to the federated logout URL, or the session cookie is not actually cleared.
- A profile is "complete" only when the personal phone number is filled and the Contact is linked to a company (Account).
- Incomplete profiles are redirected to `/update-profile`; rejected accounts are redirected to `/login` and shown a rejection message.
- Pending-approval users can use the portal but see a persistent warning banner.
- `/invoices` and `/rewards` require: user approved AND their Account's Role AND their Account's Country both have `actum_uploadinvoicesallowed = true`.
- `/vouchers` is available to any Distributor-role Account automatically, or to other roles under the same approved + Role/Country rule as Invoices.
- Loyalty points balance is scoped to the Account (company), not the individual Contact — shared across all contacts at that company.
- Balance is computed as the sum of active "Addition" transactions minus the sum of active "Deletion" transactions.
- A reward can only be claimed if the current balance is at least the reward's point cost.
- Claiming a reward creates a debit transaction and generates one or more voucher codes, delivered on-screen and via email.
- Vouchers are Account-scoped: installers see vouchers issued to their company; distributors see vouchers they have personally redeemed.
- Only Distributor-role users can validate and redeem voucher codes; a voucher can only be redeemed once, and expired/already-redeemed codes fail validation.
- Invoice uploads accept only PDF, XML, or JPEG files up to 10 MB, one file at a time.
- If an invoice's file attachment upload fails after the invoice record was created, the invoice is marked Canceled rather than left as an incomplete draft (the portal has no delete permission on invoices).
- Invoice line items (point-earning detail) are only fetched/shown for invoices that are not Rejected, and only lines with a positive granted-points value are shown.
- Documents cannot be read directly via the Web API (table permission read is disabled) — they are only retrievable through a dedicated Power Automate flow.
- Document downloads are asynchronous: a download-log record is created, then polled every 3 seconds (up to 60 seconds) until a signed download URL becomes available.
- News articles with a future `actum_publishdate` are hidden until that date passes.
- News/Home content that has no brand, role, language, or country restriction set is treated as visible to everyone along that dimension; a restriction narrows visibility to the matching value(s).
- Country and Role records each carry their own independent `actum_uploadinvoicesallowed` flag, so Invoices/Rewards/Vouchers access can be toggled per market or per partner tier without code changes.
- Language preference resolution order is: URL `?lang=` param, then the user's saved profile language, then browser-detected language, then a hardcoded English default.
- The Entra identity-provider identifier and the Google Analytics measurement ID are loaded at runtime from a public config table rather than baked into the build, so they can vary per environment.
- Non-Latin-1 characters (smart quotes, CJK, emoji, etc.) in an uploaded invoice's filename are stripped/replaced before the name is used in an HTTP header, since the browser would otherwise throw synchronously.

---

**Notable ambiguities / things worth confirming with the team before publishing to stakeholders:**
- The Home page's landing-content filter checks `statecode eq 1`, which is unusual since `1` typically means "Inactive" in Dataverse; this is what the code does today, not necessarily what was intended (`src/services/dataverseService.ts` 963).
- Numeric Power Pages "scope" values on table permissions (e.g. `756150001`, `756150002`, `756150004`) are platform-internal codes; this document reports them as-is rather than asserting an English name for each, since no readable mapping exists in the repository.
- `src/pages/Register.tsx` exists in the codebase but is not routed anywhere in `App.tsx` and does not call any real API — it appears to be an inactive/legacy screen rather than part of the live registration flow (which is actually the Entra "create account" button on `/login` plus the in-portal `/update-profile` company-linking step).
- The `actum_productdocumentation` fields `actum_visible` and `actum_unapprovedaccess` exist in the data model but are not visibly filtered on in the frontend code reviewed — that logic likely lives inside the `fetchDocuments` Power Automate flow, which was not available to inspect.
