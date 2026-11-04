# Terms & Conditions (VMPP-323) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portal users accept the Terms & Conditions that apply to their country and enabled features, are blocked until they accept every new version, and can re-read what they accepted at any time.

**Architecture:** T&C content lives in Dataverse as immutable versions (`actum_termsversion`) with one translated text per language (`actum_termstext`). Acceptances are written by the SPA to `actum_termsacceptance` (Contact-scope Create+Read). A pure resolver in the SPA computes the *required* versions for a user (country + feature scope, newest version wins), compares them with the user's acceptances, and `ProtectedRoute` gates the app until nothing is missing.

**Tech Stack:** React 18 + Vite + MUI 5 + react-i18next, Power Pages Web API (`/_api/...`), Dataverse, DOMPurify, Vitest (added in Task 5).

**Spec:** this document, section "Design" (agreed in planning chat, 2026-11-02 → 2026-11-04). Ticket: https://actumdigital.atlassian.net/browse/VMPP-323

---

## Design

### Business rules (from Cedric, VMPP-323 comments)
- **Country decides legal content.** Belgium: general T&C in EN/FR/NL. France: general T&C in FR only. Any other country: the *default set* (versions with an empty country).
- **Feature decides extra documents** (not the role directly):
  - *Invoice upload / rewards programme* T&C → users whose **role AND country** both have `actum_uploadinvoicesallowed = true` (same rule as the Invoices page).
  - *Distributor* T&C → users whose role is Distributor (same rule as `isDistributor`).
  - Architects / users without such features → general only.
- Accept once per **version**, regardless of language.
- On any new version, or a feature becoming available, the user is **blocked** until accepting.
- Accepted terms are readable afterwards (footer link + profile page).
- Out of scope: right to be forgotten (VMPP-394).

### Data model (Dataverse, publisher prefix `actum_`)
| Table | Purpose | Key columns |
|---|---|---|
| `actum_termsversion` | One row per document **version** | name, `actum_scope` (choice), `actum_countryid` (lookup country, empty = default set), `actum_version` (whole number), `actum_status` (choice) |
| `actum_termstext` | One row per **language** of a version | name, `actum_termsversionid` (parent, cascade delete), `actum_languageid` (lookup language), `actum_body` (rich text) |
| `actum_termsacceptance` | Audit log, one row per user × version | name, `actum_contactid` (lookup contact), `actum_termsversionid` (Restrict delete), `actum_termstextid` (text actually read, Restrict delete), system `createdon` = accepted on |

Choices (value range `182980000+`, like `actum_approvalstatus`):
- `actum_scope`: General `182980000`, InvoiceUpload `182980001`, Distributor `182980002`
- `actum_status`: Draft `182980000`, Published `182980001`, Retired `182980002`

Deliberately **not** included (can be added later without breaking): effective date, default-language/default-text column, text snapshot in acceptance.

### Resolution rules (pure logic)
1. Candidates = versions with status Published and country = user's country OR empty.
2. Keep only scopes the user qualifies for (General always; InvoiceUpload / Distributor per the feature rules).
3. Per scope: prefer rows with the user's country; if none, use rows with empty country.
4. Within that set: highest `actum_version`; tie → newest `createdon`.
5. Missing = required version IDs not present in the user's acceptances. Language is irrelevant here.
6. Label per missing item: **UPDATED** if the user accepted any version with the same scope + country before, else **NEW**.

Text to display for a version: UI language → only text (if exactly one) → English (`en-GB`) → oldest `createdon`. When the shown text is not in the UI language, show the "only available in …" note.

### UX
- **Update Profile (first time):** once country + role are resolved (form selection or VAT-found account), a T&C section appears above Submit: one card per required document with "Read terms" (dialog, sanitized HTML) and an "I have read and accept" checkbox. Submit is blocked until all are checked. On submit: create missing acceptances first, then call the Profile Update flow (unchanged).
- **Gate (`/accept-terms`):** after login, if anything is missing → full page, header with language picker + logout, nav hidden, cards labelled NEW/UPDATED, "Accept and continue" enabled when all checked, then redirect to the originally requested page. No skip.
- **`/terms`:** lists the user's currently applicable versions with accepted date, read in any language. Linked from footer and Update Profile page.
- Gate check runs once per session load (login/reload); cached in `AuthContext`; refreshed after accepting.

## Global Constraints
- Never `pac pages upload` to TEST; deploy = `npm run deploy` to DEV (uploads + runs `sync-solution.ps1`), then pipeline. New tables, site settings and table permissions must be in solution `CustomerPortalPowerPages`.
- Web API `fields` settings list explicit columns, never `*`.
- Render T&C HTML only through `DOMPurify.sanitize(...)`.
- Small text uses absolute `px` (theme sets `html { font-size: 62.5% }`); e.g. badges `fontSize: '10px'`.
- Frontend language codes: `en-GB`, `fr-FR`, `be-NL`; map to Dataverse codes with `mapFrontendToDataverse` / `mapDataverseToFrontend` in `src/utils/languageMapper.ts`.
- Approval status codes: Pending `182980000`, Approved `182980001`, Rejected `182980002`. The T&C invoice rule must NOT require approval (users accept before approval).
- Power Pages create: no `Prefer: return=representation`; lookups via `@odata.bind`; CSRF via `getCsrfToken()` (pattern: `src/services/dataverseService.ts:664-690`).
- i18n keys added to `src/i18n/engb.json`, `frfr.json`, `benl.json` **and** the matching Dataverse `actum_translation` records.

## Review Focus
1. **VAT-found account** — the user never picks role/country; required terms must be computed from the account's role + country flags, not the empty dropdowns. (Test in Task 6 + manual test T3.)
2. **Country with no own T&C and no default set** — resolver returns nothing for that scope; no crash, no gate, console warning. (Task 6 test `returns empty when no candidates`.)
3. **Two Published rows with the same version number** — deterministic pick by newest `createdon`. (Task 6 test.)
4. **Profile flow fails after acceptances were created** — retry must not create duplicate acceptances. (Task 10 step + manual test T5.)
5. **UI language has no text** (French user browsing in NL/EN) — falls back to FR and shows the note. (Task 6 `pickText` tests + manual test T6.)

---

## Phase 0 — Prerequisites / open points

- [ ] Confirm with client (reply drafted in chat): (a) feature enabled for a country without its T&C → block or allow (default in this plan: **allow + console warning**); (b) feature T&C accepted at profile/login (this plan) vs first feature use.
- [ ] Get final French general text (VMPP-323 attachment "VM Building Solutions FR.docx", 2026-06-11) and the 9 Belgian docs (EN/FR/NL × General / Rewards / Distributor). Strip Word annotations.
- [ ] Decide which document is the **default set** (proposal: Belgian General, EN).

## Phase 1 — Dataverse & portal configuration

### Task 1: Create the three tables (DEV)

**Owner:** Claude via `power-pages:setup-datamodel` (az token, as `sync-solution.ps1`).

- [ ] **Step 1:** Create `actum_termsversion`, `actum_termstext`, `actum_termsacceptance` with the columns, choices and values from Design → Data model, inside solution `CustomerPortalPowerPages`.
- [ ] **Step 2:** Relationship behaviours: text→version **Cascade** delete; acceptance→version **Restrict**; acceptance→text **Restrict**; acceptance→contact Remove link.
- [ ] **Step 3:** Record the generated names this plan depends on in this file under "Generated names" below: entity set names, lookup navigation property names (for `@odata.bind` and `$expand`), and the contact↔acceptance relationship name (for the Contact-scope permission).
- [ ] **Step 4: Verify** — `GET {org}/api/data/v9.2/EntityDefinitions(LogicalName='actum_termsacceptance')?$expand=ManyToOneRelationships($select=SchemaName,ReferencingAttribute)` lists the three lookups.

Generated names (fill in Step 3):
- Entity sets: `actum_termsversions` / `actum_termstexts` / `actum_termsacceptances` (confirm)
- Nav props: acceptance→contact `____`, acceptance→version `____`, acceptance→text `____`, text→version `____`
- Contact relationship: `____`

### Task 2: Business rule + model-driven app (Daniel, maker portal)

- [ ] **Step 1:** Entity-scope business rule on `actum_termstext`: lock `actum_body` and `actum_languageid` when the parent version is Published. If cross-table conditions are not possible in a business rule, put a rollup/flag on text or use a rule on `actum_termsversion` locking status back-transition + a short flow that rejects edits; record the chosen approach here.
- [ ] **Step 2:** Rule on `actum_termsversion`: lock `actum_scope`, `actum_countryid`, `actum_version` when status = Published.
- [ ] **Step 3:** Add forms/views to the back-office model-driven app (version form with texts subgrid). Add to `CustomerPortalPowerPages`.
- [ ] **Step 4: Verify** — try editing the body of a Published text via the Web API → rejected.

### Task 3: Web API site settings + table permissions

**Files (in `.powerpages-site/`):**
- Create: `site-settings/Webapi-actum_termsversion-enabled.sitesetting.yml`, `…-fields.sitesetting.yml`
- Create: `site-settings/Webapi-actum_termstext-enabled.sitesetting.yml`, `…-fields.sitesetting.yml`
- Create: `site-settings/Webapi-actum_termsacceptance-enabled.sitesetting.yml`, `…-fields.sitesetting.yml`
- Create: `table-permissions/Terms-Version.tablepermission.yml`, `Terms-Text.tablepermission.yml`, `Terms-Acceptance.tablepermission.yml`

- [ ] **Step 1:** Use `power-pages:webapi-settings-architect`. Fields:
  - version: `actum_termsversionid,actum_name,actum_scope,_actum_countryid_value,actum_version,actum_status,createdon`
  - text: `actum_termstextid,actum_name,_actum_termsversionid_value,_actum_languageid_value,actum_body,createdon`
  - acceptance: `actum_termsacceptanceid,actum_name,_actum_contactid_value,_actum_termsversionid_value,_actum_termstextid_value,createdon` + the nav props from Task 1 needed for `@odata.bind` / `$expand`
- [ ] **Step 2:** Use `power-pages:table-permissions-architect`, web role = Authenticated Users (same as `Contact.tablepermission.yml`):
  - version, text: Read, Global scope
  - acceptance: **Create + Read**, Contact scope (relationship from Task 1), no Write/Delete, Append + AppendTo as required for the lookups
- [ ] **Step 3: Verify** — upload to DEV, then in the browser console while logged in: `GET /_api/actum_termsversions?$select=actum_name` returns 200; `GET /_api/actum_termsacceptances` returns only own rows.

### Task 4: Seed placeholder content (DEV)

- [ ] **Step 1:** Create in DEV: BE-General v1 (EN/FR/NL texts), BE-InvoiceUpload v1 (EN/FR/NL), BE-Distributor v1 (EN/FR/NL), FR-General v1 (FR), Default-General v1 (EN), all Published. Placeholder bodies until Phase 0 content arrives.
- [ ] **Step 2: Verify** — `GET /_api/actum_termsversions?$filter=actum_status eq 182980001` returns 5 rows.

## Phase 2 — SPA logic

### Task 5: Add Vitest

**Files:** Modify `package.json`; Create `vitest.config.ts` (or `test` block in `vite.config.ts`).

- [ ] **Step 1:** `npm i -D vitest@^2` ; add script `"test": "vitest run"`.
- [ ] **Step 2: Verify** — `npm test` runs and reports "No test files found" (exit 0 with `passWithNoTests: true`).
- [ ] **Step 3: Commit** `chore: add vitest`

### Task 6: Types, feature helpers and terms resolver

**Files:**
- Create: `src/types/terms.ts`
- Modify: `src/utils/accessControl.ts` (extract helpers, keep existing exports' behaviour)
- Create: `src/utils/termsResolver.ts`
- Test: `src/utils/termsResolver.test.ts`, `src/utils/accessControl.test.ts`

**Interfaces:**
- Produces (`src/types/terms.ts`):
  ```ts
  export const TermsScope = { General: 182980000, InvoiceUpload: 182980001, Distributor: 182980002 } as const;
  export type TermsScopeValue = typeof TermsScope[keyof typeof TermsScope];
  export const TermsStatus = { Draft: 182980000, Published: 182980001, Retired: 182980002 } as const;
  export interface TermsVersion { actum_termsversionid: string; actum_name: string; actum_scope: TermsScopeValue; _actum_countryid_value?: string | null; actum_version: number; createdon: string; }
  export interface TermsText { actum_termstextid: string; _actum_termsversionid_value: string; _actum_languageid_value: string; actum_body: string; createdon: string; }
  export interface TermsAcceptance { actum_termsacceptanceid: string; _actum_termsversionid_value: string; _actum_termstextid_value?: string; createdon: string; version?: Pick<TermsVersion, 'actum_scope' | '_actum_countryid_value'>; }
  export interface FeatureContext { countryId?: string; role?: { actum_name: string; actum_uploadinvoicesallowed?: boolean }; country?: { actum_uploadinvoicesallowed?: boolean }; }
  export type MissingKind = 'new' | 'updated';
  export interface RequiredTerm { version: TermsVersion; accepted: boolean; acceptedOn?: string; kind?: MissingKind; }
  ```
- Produces (`accessControl.ts`): `hasInvoiceUploadFeature(role?, country?): boolean`, `isDistributorRole(role?): boolean`. `canAccessInvoices`, `canAccessVouchers`, `isDistributor` call these internally (approval + account checks stay where they are).
- Produces (`termsResolver.ts`):
  - `qualifiesForScope(scope: TermsScopeValue, ctx: FeatureContext): boolean`
  - `resolveRequiredVersions(candidates: TermsVersion[], ctx: FeatureContext): TermsVersion[]`
  - `computeRequiredTerms(required: TermsVersion[], acceptances: TermsAcceptance[]): RequiredTerm[]`
  - `pickText(texts: TermsText[], uiLanguageId: string | undefined, englishLanguageId: string | undefined): { text: TermsText; isUiLanguage: boolean } | undefined`

- [ ] **Step 1: Write failing tests** (`termsResolver.test.ts`), fixtures `BE='be'`, `FR='fr'`:
  ```ts
  // qualifiesForScope
  expect(qualifiesForScope(TermsScope.General, {})).toBe(true);
  expect(qualifiesForScope(TermsScope.InvoiceUpload, { role:{actum_name:'Installer',actum_uploadinvoicesallowed:true}, country:{actum_uploadinvoicesallowed:true} })).toBe(true);
  expect(qualifiesForScope(TermsScope.InvoiceUpload, { role:{actum_name:'Installer',actum_uploadinvoicesallowed:true}, country:{actum_uploadinvoicesallowed:false} })).toBe(false);
  expect(qualifiesForScope(TermsScope.Distributor, { role:{actum_name:'Distributor'} })).toBe(true);
  expect(qualifiesForScope(TermsScope.Distributor, { role:{actum_name:'Architect'} })).toBe(false);

  // resolveRequiredVersions
  test('BE installer gets BE General + BE InvoiceUpload, highest version');      // v1+v2 General → v2 only
  test('prefers country rows over default rows for the same scope');           // BE General v1 + default General v5 → BE v1
  test('falls back to default rows when country has none');                     // country 'nl' → default General
  test('returns empty when no candidates');                                     // [] → []
  test('same version number → newest createdon wins');
  test('architect in BE gets General only');

  // computeRequiredTerms
  test('accepted version → accepted:true with acceptedOn = acceptance.createdon');
  test('older version of same scope+country accepted → kind "updated"');
  test('scope never accepted → kind "new"');
  test('acceptance in another language still counts');  // acceptance references version id only

  // pickText
  test('returns UI language text when present, isUiLanguage true');
  test('single text → that text, isUiLanguage false');
  test('no UI match, several texts → English');
  test('no UI match, no English → oldest createdon');
  test('no texts → undefined');
  ```
  Plus `accessControl.test.ts`: existing `canAccessInvoices` / `isDistributor` results unchanged for approved installer, pending installer, distributor (mock `config.devMode = false` via `vi.mock('../config/powerPages.config')`).
- [ ] **Step 2:** `npm test` → FAIL (modules not found).
- [ ] **Step 3:** Implement per the Interfaces and Design → Resolution rules. `resolveRequiredVersions` assumes candidates already filtered to Published + (user country | null); it groups by scope, applies country preference, then sorts `actum_version desc, createdon desc`. Log `console.warn` when a qualified scope has no candidate (Review Focus #2).
- [ ] **Step 4:** `npm test` → PASS; `npm run lint` clean.
- [ ] **Step 5: Commit** `feat(terms): resolver and feature helpers`

### Task 7: Terms data service

**Files:** Modify `src/services/dataverseService.ts` (new `terms` section), `src/config/powerPages.config.ts` (`api.termsAcceptances`); Modify `roles.getAll` / `countries.getAll` selects to include `actum_uploadinvoicesallowed`.

**Interfaces:**
- Consumes: types from Task 6, nav prop names from Task 1.
- Produces:
  - `dataverseService.terms.getPublishedCandidates(countryId?: string): Promise<TermsVersion[]>` — `$filter=actum_status eq 182980001 and (_actum_countryid_value eq {countryId} or _actum_countryid_value eq null)` (only the `null` branch when no countryId).
  - `dataverseService.terms.getTexts(versionIds: string[]): Promise<TermsText[]>` — `$filter=Microsoft.Dynamics.CRM.In(PropertyName='actum_termsversionid',PropertyValues=[...])` or `or`-chained eq.
  - `dataverseService.terms.getMyAcceptances(): Promise<TermsAcceptance[]>` — expands version scope + country into `version`.
  - `dataverseService.terms.createAcceptance(args: { contactId: string; versionId: string; textId: string; name: string }): Promise<void>` — POST with `@odata.bind` for the three lookups, pattern of `uploadInvoice`.
  - Every method returns `[]` on 401/403/404 like `roles.getAll`.

- [ ] **Step 1:** Implement the four methods.
- [ ] **Step 2: Verify** — in DEV browser console (after deploy) each returns the seeded data; `createAcceptance` creates one row visible in `getMyAcceptances()`.
- [ ] **Step 3: Commit** `feat(terms): dataverse service`

### Task 8: Terms state in AuthContext

**Files:** Modify `src/contexts/AuthContext.tsx`; Create `src/hooks/useTermsTexts.ts`.

**Interfaces:**
- Produces on `AuthContextType`:
  ```ts
  termsLoading: boolean;
  requiredTerms: RequiredTerm[];          // all applicable, accepted or not
  missingTerms: RequiredTerm[];           // accepted === false
  refreshTerms: () => Promise<void>;
  ```
- Produces `useTermsTexts(versionIds: string[]): { texts: TermsText[]; languages: Language[]; loading: boolean }` (fetches texts + `languages.getAll()` once; used by dialog to `pickText`).

- [ ] **Step 1:** After `checkSession` sets a user **with complete profile**, build `FeatureContext` from `currentUser.parentcustomerid.actum_Role` / `actum_Country` and `actum_Country.actum_countryid`, call `getPublishedCandidates` + `getMyAcceptances`, then `resolveRequiredVersions` → `computeRequiredTerms`. Incomplete profile → `requiredTerms = []`, `termsLoading = false`.
- [ ] **Step 2:** Dev mode (`config.devMode`): return mock required terms (one General `new`) so pages render locally, like `DEV_MOCK_DOCUMENTS`.
- [ ] **Step 3: Verify** — DEV: user with no acceptances logs in → `missingTerms.length` = number of applicable docs (React DevTools / temporary log).
- [ ] **Step 4: Commit** `feat(terms): terms status in auth context`

## Phase 3 — UI

### Task 9: Terms cards + read dialog

**Files:** Create `src/components/terms/TermsDialog.tsx`, `src/components/terms/TermsAcceptanceList.tsx`.

**Interfaces:**
- `TermsDialog({ open, onClose, version: TermsVersion }: …)` — loads texts via `useTermsTexts([version.id])`, picks with `pickText(texts, uiLanguageId, englishId)`, renders `DOMPurify.sanitize(text.actum_body)` in a scrollable MUI `Dialog`; shows `t('terms:onlyAvailableIn', { language })` when `!isUiLanguage`.
- `TermsAcceptanceList({ terms: RequiredTerm[]; checked: Record<string, boolean>; onToggle(versionId): void; showKindBadge?: boolean; error?: boolean })` — one card per term: badge NEW/UPDATED (10px, only when `showKindBadge`), title `actum_name`, explanation line per kind, "Read terms" button, checkbox "I have read and accept these terms". `error` highlights unchecked boxes.
- Produces helper `acceptTerms(terms: RequiredTerm[], contactId: string, textIdsByVersion: Record<string,string>, alreadyAccepted: Set<string>): Promise<void>` in `src/components/terms/acceptTerms.ts` — creates acceptances **only for versions not in `alreadyAccepted`** (Review Focus #4), sequentially, throws on first failure. Record `actum_termstextid` = text shown in the dialog, or `pickText` result if the dialog was never opened.

- [ ] **Step 1:** Write `acceptTerms.test.ts`: with `alreadyAccepted` containing v1, calling with [v1, v2] calls `createAcceptance` once (v2) — mock `dataverseService`.
- [ ] **Step 2:** `npm test` → FAIL; implement; → PASS.
- [ ] **Step 3:** Build the two components. Mobile: full-width cards, 16px gutter.
- [ ] **Step 4: Commit** `feat(terms): acceptance list and dialog`

### Task 10: Update Profile integration

**Files:** Modify `src/pages/UpdateProfile.tsx`.

- [ ] **Step 1:** When `!isProfileComplete` and country + role are known, compute `FeatureContext`:
  - VAT `found`: role/country from `foundAccount._actum_roleid_value` / `_actum_primarycountryid_value`, flags looked up in the `roles` / `countries` arrays (now loaded with `actum_uploadinvoicesallowed`).
  - VAT `notFound`: from `values.actum_role` / `values.actum_primarycountry`.
  Fetch candidates for that country → `resolveRequiredVersions` → render `TermsAcceptanceList` (no badges) above the Submit button. Recompute when role/country change and reset checkboxes.
- [ ] **Step 2:** In `handleSubmit`, after existing validation: if any required term unchecked → `setError(t('terms:mustAccept'))` and stop. Else `await acceptTerms(...)` (with `alreadyAccepted` from `getMyAcceptances()`), **then** call the existing flow. After success: `refreshUser()` then `refreshTerms()` before navigating.
- [ ] **Step 3: Verify** — manual tests T1–T5 below.
- [ ] **Step 4: Commit** `feat(terms): accept terms on profile completion`

### Task 11: Gate + `/accept-terms` page

**Files:** Modify `src/components/ProtectedRoute.tsx`, `src/App.tsx`; Create `src/pages/AcceptTerms.tsx`; Modify `src/components/Layout.tsx` (prop `hideNavigation?: boolean`).

- [ ] **Step 1:** `ProtectedRoute` gains `requireAcceptedTerms?: boolean` (default `true`). After the profile rule: `termsLoading` → spinner; `requireAcceptedTerms && missingTerms.length > 0` → `<Navigate to="/accept-terms" replace state={{ from: location.pathname }} />`.
- [ ] **Step 2:** Routes: `/accept-terms` → `<ProtectedRoute requireAcceptedTerms={false}><AcceptTerms/></ProtectedRoute>`; `/update-profile` also `requireAcceptedTerms={false}`.
- [ ] **Step 3:** `AcceptTerms` page: `Layout hideNavigation`, title + intro, `TermsAcceptanceList` with `showKindBadge`, "Accept and continue" disabled until all checked → `acceptTerms` → `refreshTerms()` → `navigate(state.from ?? '/')`. If `missingTerms` is empty on mount → redirect to `/`.
- [ ] **Step 4: Verify** — manual tests T7–T10.
- [ ] **Step 5: Commit** `feat(terms): gate and accept-terms page`

### Task 12: `/terms` page, footer and profile links

**Files:** Create `src/pages/Terms.tsx`; Modify `src/App.tsx`, `src/components/Layout.tsx` (footer link), `src/pages/UpdateProfile.tsx` (link when `isProfileComplete`).

- [ ] **Step 1:** `/terms` (protected): list `requiredTerms` with name, version, "Accepted on {date}" (`dateUtils` formatting), "Read terms" → `TermsDialog`.
- [ ] **Step 2:** Footer: link "Terms & Conditions" → `/terms`, shown only when authenticated with complete profile.
- [ ] **Step 3: Verify** — manual test T11.
- [ ] **Step 4: Commit** `feat(terms): terms overview page and links`

### Task 13: Translations

**Files:** Modify `src/i18n/engb.json`, `frfr.json`, `benl.json`; Dataverse `actum_translation` records.

- [ ] **Step 1:** Add namespace `terms` with keys: `pageTitle`, `gateTitle`, `gateIntro`, `badgeNew`, `badgeUpdated`, `explainNew`, `explainUpdated`, `read`, `acceptCheckbox`, `acceptAndContinue`, `mustAccept`, `onlyAvailableIn`, `acceptedOn`, `footerLink`, `sectionTitle`, `close`, `loadError`. Gate copy (EN): title "Please review our terms", intro "To continue using the portal, please accept the following terms.", explainUpdated "We've updated these terms since you last accepted them.", explainNew "These terms apply to a feature now available to you."
- [ ] **Step 2:** Create/update the Dataverse translation records for the 3 languages (same keys).
- [ ] **Step 3: Verify** — switch language picker on `/accept-terms` → all strings translated.
- [ ] **Step 4: Commit** `feat(terms): translations`

## Phase 4 — Deploy & content

- [ ] `npm run build` clean; `npm test` green; `npm run lint` clean.
- [ ] `npm run deploy` to DEV (includes `sync-solution`); confirm new tables, the 6 site settings and 3 table permissions are in `CustomerPortalPowerPages` (`sync-solution.ps1 -DryRun`).
- [ ] Run manual tests T1–T12 in DEV.
- [ ] Load final content (Phase 0) in DEV; plan content move to TEST/PROD (data, not solution): versions first, then texts (Configuration Migration tool or manual).
- [ ] Pipeline to TEST; rerun T1, T3, T7, T8.

---

## Manual test cases (DEV)

| # | Scenario | Steps | Expected |
|---|---|---|---|
| T1 | New BE installer, new company | Register → profile → VAT not found → country BE, role Installer | General + Invoice upload cards; Submit blocked until both checked; 2 acceptance rows created; lands on Documents |
| T2 | New BE architect | As T1 with role Architect | General only |
| T3 | New user, VAT found (BE distributor account) | Enter VAT of existing distributor account | General + Distributor cards, derived from account |
| T4 | New FR installer (FR upload disabled) | Country FR, role Installer | FR General only; text in French |
| T5 | Flow fails after acceptance | Force flow error (e.g. disable flow in DEV), submit, re-enable, submit again | No duplicate acceptance rows |
| T6 | FR user with UI in Dutch | Open "Read terms" with UI = NL | French text + "only available in French" note |
| T7 | Existing user, no acceptances | Log in with a pre-existing complete profile | Redirected to `/accept-terms`, all cards NEW |
| T8 | New version | Publish BE-General v2; log in as T1 user | Gate with one UPDATED card; after accepting → original page |
| T9 | Feature switched on | Set FR country `uploadinvoicesallowed = true` + add FR-InvoiceUpload v1; log in FR installer | Gate with NEW Invoice upload card |
| T10 | Accept in one language, return in another | Accept in FR, switch UI to EN, reload | No gate |
| T11 | Reading later | Footer → Terms & Conditions | Lists applicable versions with accepted dates; dialog opens in UI language |
| T12 | Edit published text | Try editing body of a Published text in back office | Blocked |
