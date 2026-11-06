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
| `actum_termstext` | One row per **language** of a version | name, `actum_termsversionid` (parent, cascade delete), `actum_languageid` (lookup language), `actum_body` (rich text), `actum_versionispublished` (calculated Yes/No from the parent version's status; used only by form rules). **Alternate key** `actum_VersionLanguageKey` (version, language): one text per language per version |
| `actum_termsacceptance` | Audit log, one row per user × version | name, `actum_contactid` (lookup contact), `actum_termsversionid` (Restrict delete), `actum_languageid` (language of the text actually read, Restrict delete; the text = the `actum_termstext` with this version + language), `actum_texthash` (SHA-256 of the body the user read, computed in the browser), system `createdon` = accepted on |

Choices (value range `182980000+`, like `actum_approvalstatus`):
- `actum_scope`: General `182980000`, InvoiceUpload `182980001`, Distributor `182980002`
- `actum_status`: Draft `182980000`, Published `182980001`, Retired `182980002`

Deliberately **not** included (can be added later without breaking): effective date, default-language/default-text column, full text snapshot in acceptance (the hash is enough).

### Protecting published terms (decided 2026-11-06: keep it simple)
Goal: safe enough, not enterprise/litigation grade. Admins who deliberately work around the guidance (Web API, imports) own that decision.
- **Make it obvious, don't enforce:** form business rules lock the published wording and show a "create a new version instead" message. No server-side blocking (no plug-ins, real-time workflows or field security).
- **Record what was accepted:** `actum_texthash` = SHA-256 of the exact body shown to the user. It's computed in the browser (`crypto.subtle`) because there's no low-code way to hash on the server: cloud-flow expressions and Power Fx have no hash function, and Server Logic only runs on portal calls, not on back-office edits. A user could fake their own hash; that's acceptable at this level.
- **Keep the previous wording:** Dataverse auditing on, for version and text.
- **Process rule:** a wording change always means a new version. Never edit a published one.
- **Deferred (additional step, not in this story):** an email alert when a published text's body is edited (see "Later" at the end).

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
- Never `pac pages upload` to TEST; deploy = `npm run deploy` to DEV (uploads + runs `sync-solution.ps1`), then pipeline. New **tables** go in the **backoffice solution `CustomerPortalCORE`** (deployed before the portal solution); site settings and table permissions go in `CustomerPortalPowerPages`.
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

- [x] **Step 1:** Create `actum_termsversion`, `actum_termstext`, `actum_termsacceptance` with the columns, choices and values from Design → Data model, inside the backoffice solution **`CustomerPortalCORE`** (decided 2026-11-05; tables are not part of `CustomerPortalPowerPages`).
- [x] **Step 2:** Relationship behaviours: text→version **Cascade** delete; acceptance→version **Restrict**; acceptance→language **Restrict**; acceptance→contact **Cascade** (decided 2026-11-05: acceptances are worthless without the contact; any post-erasure retention/anonymisation is VMPP-394's call).
- [x] **Step 3:** Record the generated names this plan depends on in this file under "Generated names" below: entity set names, lookup navigation property names (for `@odata.bind` and `$expand`), and the contact↔acceptance relationship name (for the Contact-scope permission).
- [x] **Step 4: Verify** — `GET {org}/api/data/v9.2/EntityDefinitions(LogicalName='actum_termsacceptance')?$expand=ManyToOneRelationships($select=SchemaName,ReferencingAttribute)` lists the three lookups.

Generated names (verified in DEV 2026-11-05, solution `CustomerPortalCORE`, all tables Organization-owned):
- Entity sets: `actum_termsversions` / `actum_termstexts` / `actum_termsacceptances`
- Nav props (many→one, use in `@odata.bind` / `$expand`): acceptance→contact `actum_ContactId`, acceptance→version `actum_TermsVersionId`, acceptance→language `actum_LanguageId`, text→version `actum_TermsVersionId`, text→language `actum_LanguageId`, version→country `actum_CountryId`
- Relationships: `contact_actum_termsacceptance` (Cascade; use for the Contact-scope permission), `actum_termsversion_actum_termsacceptance` (Restrict), `actum_language_actum_termsacceptance` (Restrict), `actum_termsversion_actum_termstext` (Cascade), `actum_language_actum_termstext` (Restrict), `actum_country_actum_termsversion` (Restrict)
- Schema fix 2026-11-05: acceptance originally also had a text lookup (`actum_termstextid`), which could disagree with its version lookup. It was replaced by a language lookup, and alternate key `actum_VersionLanguageKey` (version + language) was added on `actum_termstext`. Each fact is now stored once. Trade-off: acceptances no longer block deleting a single text. That is acceptable because versions are retired, not deleted, and deleting an accepted version is still blocked.
- `actum_body` is Memo, RichText format, max 1,048,576; `actum_version` min 1; `actum_status` form default Draft.

### Task 2: Protect published terms (simple) + model-driven app

See Design → "Protecting published terms". Business rules can't read the parent table, hence the calculated column. Everything here is a form-level aid only: Web API and import edits are not blocked, by decision.

- [x] **Step 1a (Claude, done 2026-11-06):** `actum_termsacceptance.actum_texthash`: single line of text, max 64 (hex SHA-256), optional, in `CustomerPortalCORE`.
- [x] **Step 1b (done 2026-11-06, classic calculated, verified):** `actum_termstext.actum_versionispublished`: a **classic Calculated** Yes/No column (not a Power Fx *formula* column). Condition: `Terms Version (actum_termsversionid) → Status` equals `Published` → Yes, else No. Tried via API on 2026-11-06: formula columns can read the parent version, but return the column *name* (`"actum_status"`) for a related choice, so the flag was always No. The broken column was deleted; the classic calculated column's XAML can't reasonably be written by hand.
- [x] **Step 2 (Claude, done 2026-11-06):** Switch on auditing for `actum_termsversion` and `actum_termstext` (`IsAuditEnabled`). Environment auditing is already on; DEV retention is 30 days, and PROD retention is for the client to decide.
- [x] **Step 3 (Daniel, done 2026-11-06; rule "Lock published terms text", scope Entity, active; tested via the Web API: the calculated flag is No/Yes/No for Draft/Published/Retired, and the API edit of a published text still succeeds, so the error message acts only on the form, as decided):** Business rule on `actum_termstext` (scope: all forms): if `actum_versionispublished` = Yes, lock `actum_body`, `actum_languageid` and `actum_termsversionid`, and show the message *"This version is published and users have accepted it. Don't edit it; create a new version instead."*
- [x] **Step 4 (Daniel, done 2026-11-06; rule "Lock published terms version", active):** Business rule on `actum_termsversion`: if `actum_status` = Published, lock `actum_scope`, `actum_countryid` and `actum_version`; else unlock them. Status stays editable so the version can be retired. No message: an error would block saving the switch to Published, and a recommendation must carry an action. The Version form header note carries the message instead (Step 5).
- [x] **Step 5 (Claude via Web API, done 2026-11-06; backup of the previous forms, views and navigation in the session scratchpad):** Forms/views in the back-office model-driven app (version form with a texts subgrid), in `CustomerPortalCORE` alongside the tables. Add a one-line form description or header note stating the process rule.
- [x] **Step 6: Verify (Daniel, 2026-11-06: locked Body + message confirmed):** in the model-driven app, open a Published version's text: fields are locked and the message shows. A Draft version's text stays editable. Auditing shows the change history on a test edit made through the Web API (expected to succeed, by design).

### Task 3: Web API site settings + table permissions

**Files (in `.powerpages-site/`):**
- Create: `site-settings/Webapi-actum_termsversion-enabled.sitesetting.yml`, `…-fields.sitesetting.yml`
- Create: `site-settings/Webapi-actum_termstext-enabled.sitesetting.yml`, `…-fields.sitesetting.yml`
- Create: `site-settings/Webapi-actum_termsacceptance-enabled.sitesetting.yml`, `…-fields.sitesetting.yml`
- Create: `table-permissions/Terms-Version.tablepermission.yml`, `Terms-Text.tablepermission.yml`, `Terms-Acceptance.tablepermission.yml`

- [x] **Step 1 (done 2026-11-06, YAML written by hand following the repo pattern; version also exposes `statecode`, acceptance also exposes the nav props `actum_ContactId,actum_TermsVersionId,actum_LanguageId` for `@odata.bind`):** Fields:
  - version: `actum_termsversionid,actum_name,actum_scope,_actum_countryid_value,actum_version,actum_status,createdon`
  - text: `actum_termstextid,actum_name,_actum_termsversionid_value,_actum_languageid_value,actum_body,createdon`
  - acceptance: `actum_termsacceptanceid,actum_name,_actum_contactid_value,_actum_termsversionid_value,_actum_languageid_value,actum_texthash,createdon` + the nav props from Task 1 needed for `@odata.bind` / `$expand`
- [x] **Step 2 (done 2026-11-06; version also has AppendTo so acceptances can link to it; language and contact already had AppendTo):** Use `power-pages:table-permissions-architect`, web role = Authenticated Users (same as `Contact.tablepermission.yml`):
  - version, text: Read, Global scope
  - acceptance: **Create + Read**, Contact scope (relationship from Task 1), no Write/Delete, Append + AppendTo as required for the lookups
- [x] **Step 3: Verify (done 2026-11-06 from the browser console: reads 200, create 204, read-back returns own row only. Lesson: Power Pages needed Append AND AppendTo on BOTH sides of every lookup set on create, despite the error text naming only AppendTo, so acceptance and version now have both flags (Write stays off). Also, `sync-solution.ps1` doesn't add table permissions, so the three were added to `CustomerPortalPowerPages` by hand.)** — upload to DEV, then in the browser console while logged in: `GET /_api/actum_termsversions?$select=actum_name` returns 200; `GET /_api/actum_termsacceptances` returns only own rows.

### Task 4: Seed placeholder content (DEV)

- [x] **Step 1 (done 2026-11-06; names: "BE General", "Upload invoices" (BE), "BE Distributor", "Terms for the first version" (FR General, FR + EN texts, made by Daniel), "Default General"):** Create in DEV: BE-General v1 (EN/FR/NL texts), BE-InvoiceUpload v1 (EN/FR/NL), BE-Distributor v1 (EN/FR/NL), FR-General v1 (FR), Default-General v1 (EN), all Published. Placeholder bodies until Phase 0 content arrives.
- [x] **Step 2: Verify** (5 Published rows confirmed via the Dataverse API; the portal check is the Task 3 console test) — `GET /_api/actum_termsversions?$filter=actum_status eq 182980001` returns 5 rows.

## Phase 2 — SPA logic

### Task 5: Add Vitest

**Files:** Modify `package.json`; Create `vitest.config.ts` (or `test` block in `vite.config.ts`).

- [x] **Step 1 (done 2026-11-06; vitest@^3, because Vitest 2 targets Vite 5 and this project is on Vite 6; config in `vitest.config.ts`):** `npm i -D vitest` ; add script `"test": "vitest run"`.
- [x] **Step 2: Verify** — `npm test` runs and reports "No test files found" (exit 0 with `passWithNoTests: true`).
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
  export interface TermsAcceptance { actum_termsacceptanceid: string; _actum_termsversionid_value: string; _actum_languageid_value: string; actum_texthash?: string; createdon: string; version?: Pick<TermsVersion, 'actum_scope' | '_actum_countryid_value'>; }
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

- [x] **Step 1: Write failing tests** (`termsResolver.test.ts`), fixtures `BE='be'`, `FR='fr'`:
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
- [x] **Step 2:** `npm test` → FAIL (modules not found).
- [x] **Step 3:** Implement per the Interfaces and Design → Resolution rules. `resolveRequiredVersions` assumes candidates already filtered to Published + (user country | null); it groups by scope, applies country preference, then sorts `actum_version desc, createdon desc`. Log `console.warn` when a qualified scope has no candidate (Review Focus #2).
- [x] **Step 4 (27 tests pass; eslint clean on the new files; `tsc` reports only errors that already existed in other files):** `npm test` → PASS; `npm run lint` clean.
- [ ] **Step 5: Commit** `feat(terms): resolver and feature helpers`

### Task 7: Terms data service

**Files:** Modify `src/services/dataverseService.ts` (new `terms` section), `src/config/powerPages.config.ts` (`api.termsAcceptances`); Modify `roles.getAll` / `countries.getAll` selects to include `actum_uploadinvoicesallowed`.

**Interfaces:**
- Consumes: types from Task 6, nav prop names from Task 1.
- Produces:
  - `dataverseService.terms.getPublishedCandidates(countryId?: string): Promise<TermsVersion[]>` — `$filter=actum_status eq 182980001 and (_actum_countryid_value eq {countryId} or _actum_countryid_value eq null)` (only the `null` branch when no countryId).
  - `dataverseService.terms.getTexts(versionIds: string[]): Promise<TermsText[]>` — `$filter=Microsoft.Dynamics.CRM.In(PropertyName='actum_termsversionid',PropertyValues=[...])` or `or`-chained eq.
  - `dataverseService.terms.getMyAcceptances(): Promise<TermsAcceptance[]>` — expands version scope + country into `version`.
  - `dataverseService.terms.createAcceptance(args: { contactId: string; versionId: string; languageId: string; textHash: string; name: string }): Promise<void>` — POST with `@odata.bind` for the three lookups plus `actum_texthash`, following the `uploadInvoice` pattern.
  - Every method returns `[]` on 401/403/404 like `roles.getAll`.

- [x] **Step 1 (done 2026-11-06; versions also filtered on `statecode eq 0`; `getTexts` uses or-chained eq; `getMyAcceptances` uses a changing `createdon lt <future>` filter to bypass the Web API cache):** Implement the four methods.
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

- [x] **Step 1 (done 2026-11-06; logic in `src/services/termsStatus.ts` + tests; `termsLoading` stays true until terms belong to the current contact, so the gate never sees a stale "nothing missing"; a load error fails OPEN (no gate) so an API problem cannot lock everyone out):** After `checkSession` sets a user **with complete profile**, build `FeatureContext` from `currentUser.parentcustomerid.actum_Role` / `actum_Country` and `actum_Country.actum_countryid`, call `getPublishedCandidates` + `getMyAcceptances`, then `resolveRequiredVersions` → `computeRequiredTerms`. Incomplete profile → `requiredTerms = []`, `termsLoading = false`.
- [x] **Step 2 (done; acceptance of the mock is remembered in sessionStorage):** Dev mode (`config.devMode`): return mock required terms (one General `new`) so pages render locally, like `DEV_MOCK_DOCUMENTS`.
- [ ] **Step 3: Verify** — DEV: user with no acceptances logs in → `missingTerms.length` = number of applicable docs (React DevTools / temporary log).
- [ ] **Step 4: Commit** `feat(terms): terms status in auth context`

## Phase 3 — UI

### Task 9: Terms cards + read dialog

**Files:** Create `src/components/terms/TermsDialog.tsx`, `src/components/terms/TermsAcceptanceList.tsx`, `src/components/terms/acceptTerms.ts`, `src/utils/textHash.ts` (+ tests).

**Interfaces:**
- `TermsDialog({ open, onClose, version: TermsVersion }: …)` — loads texts via `useTermsTexts([version.id])`, picks with `pickText(texts, uiLanguageId, englishId)`, renders `DOMPurify.sanitize(text.actum_body)` in a scrollable MUI `Dialog`; shows `t('terms:onlyAvailableIn', { language })` when `!isUiLanguage`.
- `TermsAcceptanceList({ terms: RequiredTerm[]; checked: Record<string, boolean>; onToggle(versionId): void; showKindBadge?: boolean; error?: boolean })` — one card per term: badge NEW/UPDATED (10px, only when `showKindBadge`), title `actum_name`, explanation line per kind, "Read terms" button, checkbox "I have read and accept these terms". `error` highlights unchecked boxes.
- Produces helper `acceptTerms(terms: RequiredTerm[], contactId: string, shownTextByVersion: Record<string, TermsText>, alreadyAccepted: Set<string>): Promise<void>` in `src/components/terms/acceptTerms.ts`. It creates acceptances **only for versions not in `alreadyAccepted`** (Review Focus #4), one at a time, and throws on the first failure. "Shown text" = the text displayed in the dialog, or the `pickText` result if the dialog was never opened. Record `actum_languageid` = that text's language and `actum_texthash` = `await sha256Hex(text.actum_body)`.
- Produces `sha256Hex(body: string): Promise<string>` in `src/utils/textHash.ts`: `crypto.subtle.digest('SHA-256', new TextEncoder().encode(body))` → lowercase hex. It hashes the **raw** `actum_body` as returned by the Web API, not the DOMPurify output, so admins can reproduce it from the stored record.

- [ ] **Step 1:** Write `acceptTerms.test.ts`: with `alreadyAccepted` containing v1, calling with [v1, v2] calls `createAcceptance` once (for v2), with v2's shown language and `textHash` = SHA-256 of its body (mock `dataverseService`). Also write `textHash.test.ts`: `sha256Hex('abc')` = `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`.
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
- [ ] `npm run deploy` to DEV (includes `sync-solution`); confirm the new tables are in the backoffice solution and the 6 site settings + 3 table permissions are in `CustomerPortalPowerPages`; deploy the backoffice solution to TEST before the portal pipeline (`sync-solution.ps1 -DryRun`).
- [ ] Run manual tests T1–T13 in DEV.
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
| T12 | Edit published text | Open a text of a Published version in the back-office app | Body/language locked, "create a new version" message shown (form-level only; Web API edits are allowed by design and show up in the audit history) |
| T13 | Hash recorded | Accept terms (T1), then compare `actum_texthash` with SHA-256 of that text's `actum_body` | Equal |

---

## Later (additional steps, not in this story)

- **Alert on edits to published texts** (deferred 2026-11-06): a cloud flow in `CustomerPortalCORE` that triggers when `actum_termstext.actum_body` is modified. If the parent version is Published, it emails the admins (recipients to be decided): *"Text X (version Y, language Z) was edited after N users accepted it. Publish a new version so they re-accept."* N = acceptances with that version + language created before the edit. Admins can use `actum_texthash` to see which users accepted wording that differs from the current text.
