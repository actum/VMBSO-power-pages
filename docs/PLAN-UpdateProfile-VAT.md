# Update Profile — VAT Account Lookup & Link

## Overview

Rework the Update Profile page so users first identify their company via VAT number before completing their profile. Depending on whether an Account already exists in Dataverse for that VAT, the flow either links the user to it or guides them through creating it.

---

## User Flow

### 1. Initial state
- Contact Details section is always visible: language, email (disabled), phone.
- Company section shows only two fields initially:
  - **VAT** — text input + "Search" button.
  - **Company Name** — always visible, disabled until the search result is known.

### 2. VAT found
- Company Name field is **populated with the found account name** and **disabled** (read-only).
- A confirmation message is shown inline: _"Company found: {{name}}"_.
- All other company fields (country, phone, address, brand, role) are revealed.
- On Save: contact record is linked to the found Account via `parentcustomerid_account@odata.bind`.

### 3. VAT not found
- A message is shown inline: _"No company found — please complete the company details."_
- Company Name field becomes **editable**.
- All other company fields are revealed: country, companyPhone, address, companyEmail (optional), brand, role.
- On Save:
  1. Create a new Account with the provided fields.
  2. Set the current contact as `primarycontactid` on the new Account.
  3. Link the contact to the new Account via `parentcustomerid_account@odata.bind`.

---

## Implementation Steps

### 1. New types
Create the following type files:

**`src/types/account.ts`**
```ts
export interface Account {
  accountid: string;
  name: string;
  actum_vatregistrationnumber?: string;
  telephone1?: string;
  actum_address?: string;
  _actum_primarycountry_value?: string;
  primarycontactid?: string;
}
```

**`src/types/brand.ts`**
```ts
export interface Brand {
  actum_brandId: string;
  actum_name: string;
}
```

**`src/types/country.ts`**
```ts
export interface Country {
  actum_countryId: string;
  actum_name: string;
}
```

---

### 2. Config endpoints
Add to `src/config/powerPages.config.ts`:
```ts
api: {
  ...existing,
  accounts: '/_api/accounts',
  accountById: (id: string) => `/_api/accounts(${id})`,
  brands: '/_api/actum_brands',
  countries: '/_api/actum_countries',
}
```

---

### 3. dataverseService — new namespaces

**`accounts.searchByVAT(vat)`**
```
GET /_api/accounts?$filter=actum_vatregistrationnumber eq '{vat}'&$select=accountid,name&$top=1
→ Account | null
```

**`accounts.create(fields)`**
```
POST /_api/accounts
Headers: Prefer: return=representation
Body: { name, actum_vatregistrationnumber, telephone1, actum_address, ... }
→ Account
```

**`accounts.setPrimaryContact(accountId, contactId)`**
```
PATCH /_api/accounts({accountId})
Body: { "primarycontactid@odata.bind": "/contacts({contactId})" }
```

**`brands.getAll()`**
```
GET /_api/actum_brands?$select=actum_brandId,actum_name&$orderby=actum_name asc
→ Brand[]
```

**`countries.getAll()`**
```
GET /_api/actum_countries?$select=actum_countryId,actum_name&$orderby=actum_name asc
→ Country[]
```

---

### 4. contacts.update — OData bind fix
When the update payload includes `_parentcustomerid_value`, convert it to the correct OData bind syntax before sending the PATCH:
```ts
"parentcustomerid_account@odata.bind": `/accounts(${id})`
```
Strip the raw `_parentcustomerid_value` key from the body.

---

### 5. UpdateProfile page — state additions
```ts
const [vatInput, setVatInput] = useState('');
const [vatSearchState, setVatSearchState] = useState<'idle' | 'searching' | 'found' | 'notFound'>('idle');
const [foundAccount, setFoundAccount] = useState<Account | null>(null);
const [brands, setBrands] = useState<Brand[]>([]);
const [countries, setCountries] = useState<Country[]>([]);
const [brandsLoading, setBrandsLoading] = useState(true);
const [countriesLoading, setCountriesLoading] = useState(true);
```
Brands and Countries are fetched on mount.

---

### 6. UpdateProfile page — form layout

```
[ Contact Details ]
  - Language (select)
  - Email (disabled)
  - Phone

[ Company ]
  - VAT input  [ Search button ]
  - Company Name (always visible; disabled + prefilled if VAT found, editable if not found)

  -- visible only after search --
  - Confirmation / not-found message (inline text)
  - Country (dynamic select from Dataverse)
  - Company Phone
  - Address
  - Company Email (optional)
  - Brand (dynamic multi-select from Dataverse)
  - Role (select)
```

---

### 7. VAT search handler
```ts
const handleVatSearch = async () => {
  setVatSearchState('searching');
  const account = await dataverseService.accounts.searchByVAT(vatInput);
  if (account) {
    setFoundAccount(account);
    setValues(v => ({ ...v, actum_companyname: account.name }));
    setVatSearchState('found');
  } else {
    setFoundAccount(null);
    setVatSearchState('notFound');
  }
};
```

---

### 8. Submit handler
```ts
const handleSubmit = async () => {
  if (vatSearchState === 'found') {
    // Link contact to existing account
    await authService.updateProfile({
      contactid: currentUser.contactid,
      ...personalFields,
      _parentcustomerid_value: foundAccount!.accountid,
    });

  } else if (vatSearchState === 'notFound') {
    // 1. Create new Account
    const newAccount = await dataverseService.accounts.create({
      name: values.actum_companyname,
      actum_vatregistrationnumber: vatInput,
      telephone1: values.actum_companyphone,
      actum_address: values.actum_address,
      // country, ...
    });
    // 2. Set contact as primary contact on Account
    await dataverseService.accounts.setPrimaryContact(
      newAccount.accountid,
      currentUser!.contactid
    );
    // 3. Link contact to new Account
    await authService.updateProfile({
      contactid: currentUser!.contactid,
      ...personalFields,
      _parentcustomerid_value: newAccount.accountid,
    });
  }

  await refreshUser();
  navigate('/documents');
};
```

---

### 9. Submit guard (disabled check)
The Save button is disabled unless:
- `vatSearchState` is `found` or `notFound` (user must have searched).
- All personal fields are filled: language, phone, role, brand.
- If `notFound`: company name, country, companyPhone, address must also be filled.

Also update `AuthContext` `isProfileComplete` to check `_parentcustomerid_value` (the account link) as the company completion indicator.

---

### 10. i18n additions
Add to all three locale `updateProfile.json` files (`en-GB`, `fr-FR`, `be-NL`):

```json
"fields": {
  "vat": {
    "searchButton": "Search",
    "found": "Company found: {{name}}",
    "notFound": "No company found — please complete the company details."
  }
},
"action": {
  "searching": "Searching..."
},
"section": {
  "companyCreate": "Company Details (new)"
}
```

Also fix the existing **be-NL bug**: `companyPhone.options` accidentally contains role options instead of phone options, and `companyRole.options` is missing.

---

### 11. Dev mode — keep it simple
**No complex dev mode mocks** for the new account/brand/country services.

The dev mode bypass in `authService.checkSession()` and `authService.updateProfile()` hits `localStorage` only. The new Dataverse calls (`searchByVAT`, `brands.getAll`, `countries.getAll`, `accounts.create`, `accounts.setPrimaryContact`) will simply hit `/_api/...` as normal — in dev mode these will return 401/404 gracefully.

This avoids the previous issue where dev mode logic could not be cleanly disabled when deploying to production. The only dev mode code that remains is in `authService`, clearly isolated. All other services are always real.

> **Note**: To test the full account flow locally, use a browser profile logged into the Power Pages portal directly.

---

## Dataverse Schema Reference

| Entity | Field | Description |
|--------|-------|-------------|
| `account` | `accountid` | Primary key |
| `account` | `name` | Company name |
| `account` | `actum_vatregistrationnumber` | VAT number (custom) |
| `account` | `telephone1` | Company phone |
| `account` | `actum_address` | Address (custom) |
| `account` | `primarycontactid` | Primary contact lookup |
| `contact` | `contactid` | Primary key |
| `contact` | `parentcustomerid` | Parent account lookup |
| `actum_brand` | `actum_brandId` | Brand primary key |
| `actum_brand` | `actum_name` | Brand name |
| `actum_country` | `actum_countryId` | Country primary key |
| `actum_country` | `actum_name` | Country name |

OData bind syntax for relationships on PATCH/POST:
```
"parentcustomerid_account@odata.bind": "/accounts({id})"
"primarycontactid@odata.bind": "/contacts({id})"
```
