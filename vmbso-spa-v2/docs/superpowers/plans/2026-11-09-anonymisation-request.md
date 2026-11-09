# Anonymisation Request (VMPP-395) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A signed-in portal user can request anonymisation of their personal data from the profile page. After they confirm, the SPA creates one `actum_anonymisationrequest` record in Dataverse, shows a success message and signs them out.

**Architecture:** A pure builder makes the request body: a name without personal data, `actum_requeststatus` Submitted, `actum_requestedon`, and the `actum_contact` bind. A `dataverseService` method POSTs it to the Power Pages Web API. The portal role has Contact-scope Create and Append on the table, and no Read. A dialog on `/update-profile` takes the user through confirm → submitting → success (then sign-out) or error. Nothing else happens in the frontend: a Dataverse-triggered flow (VMPP-394) does the rest.

**Tech Stack:** React 18 + Vite + MUI 5 + react-i18next, Power Pages Web API (`/_api/...`), Dataverse, Vitest (node environment, `src/**/*.test.ts` only, no component tests).

**Spec:** the ticket https://actumdigital.atlassian.net/browse/VMPP-395 (version of 2026-11-04) plus the decisions below. Parent story: VMPP-394.

## Decisions (planning chat 2026-11-09)

- **Placement:** a text **link** on `/update-profile`, on the same row as the Submit button and aligned left. The Submit button stays on the right. It is deliberately not in the user menu, because this is a rare and unwanted action.
- **Popup:** shows the confirmation text with **No** / **Yes**. Success and error are shown inside the same dialog.
- *Builder's call:* the link shows only when `isProfileComplete`. A user still completing their profile has no company yet, and the flow fills the Account. Revisit if VMBSO wants it earlier.
- *Builder's call:* after success the dialog shows the success text and one **Sign out** button. Closing the dialog also signs out. While the request is submitting, the dialog cannot be closed.
- *Builder's call:* the record name is `Anonymisation request - YYYY-MM-DD HH:mm` in **UTC**, so it does not depend on the browser timezone.
- *Builder's call:* the table permission gets **Append + AppendTo** (and Create), not just Append. The T&C work proved that Power Pages needs both on both sides of a lookup (403 `EntityPermissionAppendToIsMissingDuringAssociationChange`). The Contact permission already has both.

## Global Constraints

- The frontend must **not** call Power Automate, read existing requests, set an Account lookup, or touch the Contact or Entra account.
- The record name must never contain a first name, last name, email or phone number.
- The Contact bind is always the signed-in user's `currentUser.contactid` (from `useAuth()`) and never comes from user input.
- No `Prefer: return=representation` on the POST: the role has no Read.
- English texts (verbatim from the ticket):
  - Confirm: "This action is irreversible. Your personal data will be anonymised, your portal account will be deactivated and your sign-in account will be deleted. Shared business records such as invoices and vouchers may remain stored for legal, accounting and operational purposes, but they will no longer be attributed to you personally. Loyalty points and vouchers you have not used stay with your company and can only be used by another portal user of your company. Do you want to continue?"
  - Success: "Your anonymisation request has been submitted. You will now be signed out. Once the request is processed, you will no longer be able to sign in."
  - Error: "Your anonymisation request could not be submitted. Please try again or contact support."
- The French (`frfr.json`) and Dutch (`benl.json`, Belgian Dutch, formal "u") texts were translated in planning (2026-11-09) and are listed in Task 3. They reuse the site's existing words ("bons d'achat", "points de fidélité", "Déconnexion"; "vouchers", "loyaliteitspunten", "Uitloggen"). VMBSO should still check the legal wording.
- Table permissions are **not** added to `CustomerPortalPowerPages` by `sync-solution.ps1`. Add them by hand (component type 10407, `DoNotIncludeSubcomponents: false`).

## Review Focus

1. **The link sits inside the profile `<form>`.** Clicking it must open the dialog, not submit the profile. It needs `type="button"` (checked by hand in Task 4).
2. **Double-click or a repeated Enter on Yes** must create exactly one record. Use a ref guard as well as `disabled`. Checked by hand in Task 5 by watching the network tab.
3. **Escape or a backdrop click while submitting** must not close the dialog. Otherwise the user could miss the success message and stay signed in without knowing (Task 4).
4. **The create must work without Read.** No `Prefer` header and no `$select` on the POST. A unit test checks the headers (Task 2).
5. **A request for another Contact** must be rejected by Power Pages: POST from the console with a different `contactid` and expect 403 (Task 5).

---

### Task 1: Dataverse names and Power Pages configuration

**Files:**
- Modify: this plan, section "Generated names" below
- Create: `.powerpages-site/site-settings/Webapi-actum_anonymisationrequest-enabled.sitesetting.yml`
- Create: `.powerpages-site/site-settings/Webapi-actum_anonymisationrequest-fields.sitesetting.yml`
- Create: `.powerpages-site/table-permissions/Anonymisation-Request.tablepermission.yml`

**Interfaces:**
- Produces: the verified logical names, nav property, status option value and contact relationship name in "Generated names". Tasks 2 and 5 use them.

- [ ] **Step 1: Confirm the three remaining names in DEV.** Run `GET https://vmbso-customerportal-dev.crm4.dynamics.com/api/data/v9.2/EntityDefinitions(LogicalName='actum_anonymisationrequest')?$select=EntitySetName&$expand=ManyToOneRelationships($select=SchemaName,ReferencingAttribute,ReferencingEntityNavigationPropertyName)` and `.../Attributes(LogicalName='actum_requeststatus')/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$expand=OptionSet`. Replace the three *to confirm* values below, and update the test literal in Task 2 Step 1.

Generated names. The columns marked *known* are taken from two DEV records (2026-11-09):
- Columns (*known*):
  - name `actum_name`
  - requested on `actum_requestedon` (date-time)
  - status `actum_requeststatus` (choice; `182980003` is the value the flow sets on failure)
  - contact lookup `actum_contact` (`_actum_contact_value`)
  - account lookup `actum_account`: **never sent by the SPA**
  - Columns the SPA never writes: `actum_failurereason`, `actum_completedon`, `actum_originalemailtemporary`.
- Confirmed by the user 2026-11-09 from the table designer:
  - `actum_requeststatus` (schema `actum_RequestStatus`): Submitted `182980000`, Processing `182980001`, Completed `182980002`, Failed `182980003`
  - contact nav prop `actum_Contact`
  - contact relationship `actum_contact_anonymisationrequest`
- *To confirm on deploy (Task 5):* entity set `actum_anonymisationrequests` (the default plural)

- [ ] **Step 2: Create the site settings.** Copy the format of `Webapi-actum_termsacceptance-*.sitesetting.yml` with new GUIDs. Set `Webapi/actum_anonymisationrequest/enabled` = `true`. Set `Webapi/actum_anonymisationrequest/fields` = the name, status, requested-on and contact columns plus the contact nav prop (`actum_name,actum_requeststatus,actum_requestedon,actum_contact,actum_Contact`, using the nav prop from Step 1).

- [ ] **Step 3: Create the table permission.** Copy the format of `Terms-Acceptance.tablepermission.yml`: web role `7cd9bdff-1527-405b-bb88-611db94d307c` (Authenticated Users), `entitylogicalname: actum_anonymisationrequest`, `entityname: Anonymisation Request`, `scope: 756150001` (Contact), `contactrelationship: <from Step 1>`, `create: true`, `append: true`, `appendto: true`, `read: false`, `write: false`, `delete: false`, new GUID. Leave `Contact.tablepermission.yml` as it is (it already has append and appendto).

- [ ] **Step 4: Commit**

```bash
git add .powerpages-site/site-settings/Webapi-actum_anonymisationrequest-*.sitesetting.yml .powerpages-site/table-permissions/Anonymisation-Request.tablepermission.yml docs/superpowers/plans/2026-11-09-anonymisation-request.md
git commit -m "feat(anonymisation): web api settings and table permission"
```

### Task 2: Request builder and Web API service

**Files:**
- Create: `src/services/anonymisationRequest.ts`
- Create: `src/services/anonymisationRequest.test.ts`
- Modify: `src/config/powerPages.config.ts` (next to `termsAcceptances`, line ~88)
- Modify: `src/services/dataverseService.ts` (new `anonymisation` group next to `terms`)

**Interfaces:**
- Consumes: the names from Task 1.
- Produces:
  - `ANONYMISATION_STATUS_SUBMITTED: number` (the Submitted option value from Task 1)
  - `buildAnonymisationRequestBody(contactId: string, now: Date): Record<string, unknown>`
  - `submitAnonymisationRequest(contactId: string): Promise<void>`. It throws on a non-2xx response. In `config.devMode` it resolves after about 800 ms without a fetch.
  - `config.api.anonymisationRequests = '/_api/actum_anonymisationrequests'`

- [ ] **Step 1: Write the failing tests** in `anonymisationRequest.test.ts`. Mock `../config/powerPages.config` (`devMode: false`, `api.anonymisationRequests`) and `./apiClient` (`getCsrfToken` resolves `'tok'`), and stub the global `fetch`:

```ts
test('body has exactly name, status, requested-on and contact bind', () => {
  const body = buildAnonymisationRequestBody('c-1', new Date('2026-11-04T14:35:09Z'));
  expect(body).toEqual({
    actum_name: 'Anonymisation request - 2026-11-04 14:35',
    actum_requeststatus: 182980000, // to confirm in Task 1: literal Submitted value (not the exported constant)
    actum_requestedon: '2026-11-04T14:35:09.000Z',
    'actum_Contact@odata.bind': '/contacts(c-1)', // nav prop to confirm in Task 1
  });
});

test('name has no personal data and no account is set', () => {
  const body = buildAnonymisationRequestBody('c-1', new Date());
  expect(body.actum_name).toMatch(/^Anonymisation request - \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  expect(Object.keys(body).some((k) => /account/i.test(k))).toBe(false);
});

test('POSTs once with CSRF and no Prefer header', async () => {
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  await submitAnonymisationRequest('c-1');
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('/_api/actum_anonymisationrequests');
  expect(init.method).toBe('POST');
  expect(init.headers.__RequestVerificationToken).toBe('tok');
  expect(init.headers).not.toHaveProperty('Prefer');
});

test('throws on 403', async () => {
  fetchMock.mockResolvedValue(new Response('denied', { status: 403 }));
  await expect(submitAnonymisationRequest('c-1')).rejects.toThrow(/403/);
});
```

- [ ] **Step 2: Run** `npm test -- anonymisationRequest`. Expected: FAIL (module not found).

- [ ] **Step 3: Implement** both functions in `src/services/anonymisationRequest.ts`. Use the fetch shape of `createAcceptance` in `dataverseService.ts` (`credentials: 'include'`, `Content-Type`, `__RequestVerificationToken`, `x-requested-with`). Format the name from `now.toISOString()` (`slice(0,10)` + `' '` + `slice(11,16)`). Add `config.api.anonymisationRequests`. Expose the function as `dataverseService.anonymisation.createRequest = submitAnonymisationRequest`, so the dialog uses the same service entry as the other features.

- [ ] **Step 4: Run** `npm test`. Expected: all tests PASS, including the existing terms tests.

- [ ] **Step 5: Commit**

```bash
git add src/services/anonymisationRequest.ts src/services/anonymisationRequest.test.ts src/services/dataverseService.ts src/config/powerPages.config.ts
git commit -m "feat(anonymisation): request builder and web api service"
```

### Task 3: Translations

**Files:**
- Modify: `src/i18n/engb.json`, `src/i18n/frfr.json`, `src/i18n/benl.json` (under `updateProfilePage`)
- Create: `src/i18n/anonymisationKeys.test.ts`

**Interfaces:**
- Produces the keys `updateProfilePage:anonymisation.{link, title, confirm, no, yes, submitting, success, signOut, error}`.

- [ ] **Step 1: Write the failing test.** It checks that each of the three JSON files has `updateProfilePage.anonymisation` with exactly the nine keys above, all non-empty strings, and that `engb.confirm` contains `"Loyalty points and vouchers you have not used stay with your company"`.

- [ ] **Step 2: Run** `npm test -- anonymisationKeys`. Expected: FAIL.

- [ ] **Step 3: Add the keys** with these values. Take `confirm`, `success` and `error` in English verbatim from Global Constraints.

| key | en-GB | fr-FR | be-NL |
|---|---|---|---|
| link | Request anonymisation of my data | Demander l'anonymisation de mes données | Anonimisering van mijn gegevens aanvragen |
| title | Request anonymisation | Demande d'anonymisation | Anonimisering aanvragen |
| no | No | Non | Nee |
| yes | Yes | Oui | Ja |
| submitting | Submitting… | Envoi en cours… | Bezig met verzenden… |
| signOut | Sign out | Se déconnecter | Uitloggen |

`confirm`
- fr: "Cette action est irréversible. Vos données personnelles seront anonymisées, votre compte du portail sera désactivé et votre compte de connexion sera supprimé. Les documents commerciaux partagés, tels que les factures et les bons d'achat, peuvent rester conservés à des fins légales, comptables et opérationnelles, mais ils ne vous seront plus attribués personnellement. Les points de fidélité et les bons d'achat que vous n'avez pas utilisés restent acquis à votre entreprise et ne peuvent être utilisés que par un autre utilisateur du portail de votre entreprise. Voulez-vous continuer ?"
- nl: "Deze actie is onomkeerbaar. Uw persoonsgegevens worden geanonimiseerd, uw portaalaccount wordt gedeactiveerd en uw aanmeldaccount wordt verwijderd. Gedeelde zakelijke documenten zoals facturen en vouchers kunnen bewaard blijven voor wettelijke, boekhoudkundige en operationele doeleinden, maar worden niet langer aan u persoonlijk toegeschreven. Loyaliteitspunten en vouchers die u niet hebt gebruikt, blijven bij uw bedrijf en kunnen alleen worden gebruikt door een andere portaalgebruiker van uw bedrijf. Wilt u doorgaan?"

`success`
- fr: "Votre demande d'anonymisation a été envoyée. Nous allons maintenant vous déconnecter. Une fois la demande traitée, vous ne pourrez plus vous connecter."
- nl: "Uw aanvraag tot anonimisering is verzonden. U wordt nu uitgelogd. Zodra de aanvraag is verwerkt, kunt u niet meer inloggen."

`error`
- fr: "Votre demande d'anonymisation n'a pas pu être envoyée. Veuillez réessayer ou contacter le support."
- nl: "Uw aanvraag tot anonimisering kon niet worden verzonden. Probeer het opnieuw of neem contact op met de klantenservice."

- [ ] **Step 4: Run** `npm test`, expect PASS, then commit with `git commit -m "feat(anonymisation): translations"`.

### Task 4: Dialog and profile-page link

**Files:**
- Create: `src/components/profile/AnonymisationRequestDialog.tsx`
- Modify: `src/pages/UpdateProfile.tsx:738-748` (the Submit row)

**Interfaces:**
- Consumes: `dataverseService.anonymisation.createRequest(contactId)` (Task 2), the Task 3 keys, and `useAuth()` → `{ currentUser, logout }`.
- Produces: `AnonymisationRequestDialog: React.FC<{ open: boolean; onClose: () => void }>`.

- [ ] **Step 1: Build the dialog** with MUI `Dialog`, styled like `TermsDialog` (24px bold title, close icon). It has four states: `'confirm' | 'submitting' | 'success' | 'error'`.
  - **confirm:** shows `confirm` text, with **No** (`onClose`, nothing created) and **Yes** (contained, `color="error"`).
  - **Yes:** a `useRef` guard returns early if a submit is already in flight. Otherwise it sets `submitting` and calls `createRequest(currentUser.contactid)`. The result is `success` or `error`.
  - **submitting:** both buttons are disabled with a spinner. `onClose` ignores backdrop and Escape, and the close icon is hidden.
  - **success:** shows `success` text and one **Sign out** button → `logout()`. `onClose` also calls `logout()`.
  - **error:** shows an `error` Alert above the confirm text. **Yes** stays available to retry and **No** closes.
  - Reset to `confirm` each time `open` goes from false to true.

- [ ] **Step 2: Place the link.** In the Submit row, change the `Box` to `justifyContent="space-between"` and `alignItems="center"`. When `isProfileComplete`, render the MUI `Link component="button" type="button"` (`color="text.secondary"`, underline, 14px) on the left. Keep the Submit button on the right. On `xs` use `flexDirection="column-reverse"`, so the full-width Submit stays first and the link sits centred below it. When the profile is incomplete, keep the current right-aligned layout (add an empty spacer or keep `flex-end`).

- [ ] **Step 3: Check it by hand** with `npm run dev` (dev mode mocks the request and logout):
  - Clicking the link opens the dialog and does **not** submit the profile.
  - **No** closes the dialog.
  - **Yes** shows the spinner, then the success text, then **Sign out**, which goes to the login page.
  - During submitting, Escape and backdrop clicks do nothing.
  - The layout looks right at 375px and at desktop width.
  - The link is absent while the profile is incomplete.

- [ ] **Step 4: Run** `npm run lint` and `npm test`. Expected: no new lint errors, all tests PASS.

- [ ] **Step 5: Commit** with `git commit -m "feat(anonymisation): request dialog on the profile page"`.

### Task 5: Deploy to DEV and verify against the ticket

**Files:**
- Modify: this plan (tick the steps, note the results)

- [ ] **Step 1: Deploy** with `npm run deploy` (it uploads to DEV and runs `sync-solution`). Clear the portal cache (`/_services/about` → Clear cache) so the new permission takes effect.

- [ ] **Step 2: Add the new table permission to the solution** `CustomerPortalPowerPages` (AddSolutionComponent, type 10407, `DoNotIncludeSubcomponents: false`). `sync-solution` does not add table permissions. Check that the two new site settings were added by the sync.

- [ ] **Step 3: Happy path in DEV** with a test user:
  - Run **Yes** while watching the network tab: exactly one POST, 204.
  - In Dataverse, the record has the user's Contact, no Account, status Submitted, requested-on set, and a name matching the pattern.
  - The user is then signed out.

- [ ] **Step 4: Negative checks.**
  - **No** creates no record.
  - A double-click on **Yes** gives one POST.
  - From the browser console, a POST with another contact's id in the contact `@odata.bind` returns 403 (VMPP-394 Scenario 7).
  - `GET /_api/actum_anonymisationrequests` returns 403 (no Read).
  - With the permission temporarily switched off, the error message shows and Yes can be retried.

- [ ] **Step 5: Check FR and NL.** Switch the language: the link, the popup, success and error appear in French and Dutch.

- [ ] **Step 6: Commit the plan updates** with `git commit -m "docs(anonymisation): DEV verification"`.
