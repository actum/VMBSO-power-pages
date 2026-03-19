# Dataverse Schema Documentation

This document describes the data structure used in the VMBSO Customer Portal, clarifying which fields belong to which tables and how they relate.

## Table Relationships

```
Contact (Portal User)
    └─→ _parentcustomerid_value (lookup)
         └─→ Account (Company)
              └─→ _actum_primarycountryid_value (lookup)
                   └─→ Country
                        └─→ Languages (M2M relationship)

Contact
    └─→ _actum_languageid_value (lookup)
         └─→ Language
```

---

## Contact Table

The **Contact** table stores individual portal users. Each contact is linked to an Account (company) via `_parentcustomerid_value`.

### Standard Fields (OOB)
```typescript
contactid: string                              // Primary key
firstname: string
lastname: string
emailaddress1: string
fullname: string                               // Calculated: firstname + lastname
telephone1: string                             // Personal phone
mobilephone: string
jobtitle: string
createdon: string                              // ISO date
modifiedon: string                             // ISO date
```

### Address Fields (OOB)
```typescript
address1_line1: string
address1_city: string
address1_postalcode: string
address1_stateorprovince: string
address1_country: string
```

### Custom Fields
```typescript
actum_approvalstatus: number                   // Choice: Pending/Approved/Rejected
_actum_languageid_value: string                // Lookup to Language table (GUID)
_parentcustomerid_value: string                // Lookup to Account table (GUID)
mspp_userpreferredlcid: number                 // Portal preferred language (LCID)
```

### Portal Identity Fields (Power Pages)
```typescript
adx_identity_username: string
adx_identity_emailaddress1confirmed: boolean
adx_identity_lockoutenabled: boolean
adx_identity_twofactorenabled: boolean
```

### Fields Fetched via Web API
Only these Contact fields are fetched via `/_api/contacts`:
- `contactid`, `firstname`, `lastname`, `emailaddress1`, `fullname`
- `telephone1`, `mobilephone`, `jobtitle`, `createdon`, `modifiedon`
- `actum_approvalstatus`, `_actum_languageid_value`, `_parentcustomerid_value`
- `mspp_userpreferredlcid`
- `address1_line1`, `address1_city`, `address1_postalcode`
- `adx_identity_username`, `adx_identity_emailaddress1confirmed`

---

## Account Table

The **Account** table stores company/organization information. Contacts are linked to Accounts.

### Standard Fields (OOB)
```typescript
accountid: string                              // Primary key
name: string                                   // Company name
telephone1: string                             // Company phone
emailaddress1: string                          // Company email
createdon: string                              // ISO date
modifiedon: string                             // ISO date
```

### Address Fields (OOB)
```typescript
address1_line1: string
address1_city: string
address1_postalcode: string
address1_stateorprovince: string
address1_country: string
address1_composite: string                     // Full formatted address
```

### Custom Fields
```typescript
actum_vatregistrationnumber: string            // VAT/Tax ID
_actum_primarycountryid_value: string          // Lookup to Country table (GUID)
_actum_roleid_value: string                    // Lookup to Role table (GUID)
```

### ⚠️ Common Field Name Confusions

These field names are **NOT** used in the Account table. Use the correct names instead:

| ❌ Wrong Name | ✅ Correct Account Field |
|--------------|-------------------------|
| `actum_companyname` | `name` |
| `actum_vat` | `actum_vatregistrationnumber` |
| `actum_primarycountry` | `_actum_primarycountryid_value` |
| `actum_companyphone` | `telephone1` |
| `actum_companyemail` | `emailaddress1` |
| `actum_role` | `_actum_roleid_value` |

> **Note**: The wrong names (`actum_companyname`, etc.) are used in the **UpdateProfile form's local state** for convenience, but they are **NOT** Dataverse column names. They get mapped to the correct Account fields by the Power Automate flow.

---

## Language Table

The **Language** (actum_language) table stores available languages.

### Fields
```typescript
actum_languageid: string                       // Primary key (GUID)
actum_name: string                             // Display name (e.g., "Dutch", "French")
actum_code: string                             // Language code (e.g., "nl-NL", "fr-FR")
actum_iso6391: string                          // ISO 639-1 code (e.g., "nl", "fr")
actum_lcid: number                             // Windows LCID (e.g., 1043 for Dutch)
actum_isdefault: boolean                       // Is default language
statecode: number                              // 0 = Active, 1 = Inactive
```

### Relationship with Country
Languages are linked to Countries via M2M relationship:
- **Relationship name**: `actum_country_actum_language_actum_language`
- **Web API endpoint**: `/_api/actum_countries({countryId})/actum_country_actum_language_actum_language`

---

## Country Table

The **Country** (actum_country) table stores countries.

### Fields
```typescript
actum_countryid: string                        // Primary key (GUID)
actum_name: string                             // Country name (e.g., "Belgium", "France")
actum_code: string                             // Country code (e.g., "BE", "FR")
statecode: number                              // 0 = Active, 1 = Inactive
```

---

## Role Table

The **Role** (actum_role) table stores user/company roles.

### Fields
```typescript
actum_roleid: string                           // Primary key (GUID)
actum_name: string                             // Role name (e.g., "Distributor", "Contractor")
statecode: number                              // 0 = Active, 1 = Inactive
```

---

## Brand Table

The **Brand** (actum_brand) table stores product brands.

### Fields
```typescript
actum_brandid: string                          // Primary key (GUID)
actum_name: string                             // Brand name (e.g., "VMZINC")
statecode: number                              // 0 = Active, 1 = Inactive
```

---

## Profile Completion Logic

A Contact profile is considered **complete** when all of the following are true:

1. **Personal fields** (on Contact):
   - `_actum_languageid_value` is set (language selected)
   - `telephone1` is set (phone number filled)

2. **Company link** (on Contact):
   - `_parentcustomerid_value` is set (linked to an Account)

**Implementation**: See [AuthContext.tsx](src/contexts/AuthContext.tsx#L18-L44)

### Redirect Logic After Login

```typescript
if (isProfileComplete) {
  navigate('/documents');        // User can access documents
} else {
  navigate('/update-profile');   // User must complete profile
}
```

---

## Update Profile Flow

The UpdateProfile page uses a **Power Automate flow** to save data, not direct Web API updates.

### Flow Input Parameters

The form submits these parameters to the Power Automate flow:

```typescript
{
  hasAccount: "YES" | "NO",                    // Was Account found via VAT search?
  contactId: string,                           // Current user's contactid
  phone: string,                               // → Contact.telephone1
  languageId: string,                          // → Contact._actum_languageid_value
  
  // If hasAccount = "YES" (existing Account found via VAT search)
  accountId: string,                           // Existing Account GUID to link to
  
  // If hasAccount = "NO" (create new Account)
  vatNumber: string,                           // → Account.actum_vatregistrationnumber
  companyName: string,                         // → Account.name
  countryId: string,                           // → Account._actum_primarycountryid_value
  companyPhone: string,                        // → Account.telephone1
  address: string,                             // → Account.address1_line1
  city: string,                                // → Account.address1_city
  zipCode: string,                             // → Account.address1_postalcode
  companyEmail: string,                        // → Account.emailaddress1
  brandIds: string,                            // Comma-separated Brand GUIDs (for M2M linking)
  roleId: string,                              // → Account._actum_roleid_value
}
```

### Flow Responsibilities

The Power Automate flow handles:
1. **Creating new Account records** (if `hasAccount = "NO"`)
2. **Linking Contact to Account** (sets `_parentcustomerid_value`)
3. **Updating Contact fields** (`telephone1`, `_actum_languageid_value`)
4. **Complex validation** and business logic
5. **M2M relationship management** (linking Brands to Account)

**Implementation**: See [UpdateProfile.tsx](src/pages/UpdateProfile.tsx#L199-L219)

---

## Common Mistakes

### ❌ Mistake 1: Using form state field names as Dataverse column names

**Wrong:**
```typescript
// These are form-local field names, NOT Dataverse columns!
const contact = {
  actum_language: "some-guid",        // ❌ Not a Contact field
  actum_companyname: "ACME Inc",      // ❌ Not even on Contact table
  actum_vat: "BE123456",              // ❌ Not even on Contact table
};
```

**Correct:**
```typescript
// Contact table actual fields
const contact = {
  _actum_languageid_value: "some-guid",   // ✅ Language lookup on Contact
  _parentcustomerid_value: "account-guid", // ✅ Account lookup on Contact
  telephone1: "+32 123456789",             // ✅ Contact field
};

// Account table actual fields (fetched separately)
const account = {
  name: "ACME Inc",                           // ✅ Account.name
  actum_vatregistrationnumber: "BE123456",    // ✅ Account field
  _actum_primarycountryid_value: "country-id", // ✅ Country lookup on Account
};
```

### ❌ Mistake 2: Fetching Account fields from Contact endpoint

**Wrong:**
```typescript
// Trying to fetch Account fields from /_api/contacts
const fields = [
  'contactid',
  'actum_companyname',  // ❌ Doesn't exist on Contact
  'actum_vat',          // ❌ Doesn't exist on Contact
];
// Result: 400 Bad Request
```

**Correct:**
```typescript
// Only fetch Contact fields
const fields = [
  'contactid',
  '_parentcustomerid_value',  // ✅ Account lookup ID is on Contact
];
// Then fetch Account separately if needed via /_api/accounts({accountId})
```

### ❌ Mistake 3: Confusing `actum_language` (table) with language field name

**Wrong:**
```typescript
// actum_language is a TABLE name, not a field name!
const requiredFields = ["actum_language"];
// This will always be undefined
```

**Correct:**
```typescript
// The field on Contact is _actum_languageid_value
const requiredFields = ["_actum_languageid_value"];
```

---

## Reference Example Records

### Sample Contact Record
```json
{
  "@odata.etag": "W/\"3727590\"",
  "contactid": "3449c762-dc09-f111-8406-000d3a68813d",
  "firstname": "Tomáš",
  "lastname": "Horváth",
  "emailaddress1": "tomas.horvath@company.com",
  "fullname": "Tomáš Horváth",
  "telephone1": "+421 123 456 789",
  "mobilephone": null,
  "jobtitle": "Branch Manager",
  "createdon": "2026-02-14T19:36:05Z",
  "modifiedon": "2026-02-14T23:30:16Z",
  "_actum_languageid_value": "99be905e-f709-f111-8407-000d3a688605",
  "_parentcustomerid_value": "65d3d35e-dc09-f111-8406-000d3a66f974",
  "actum_approvalstatus": 182980000,
  "mspp_userpreferredlcid": null,
  "address1_line1": null,
  "address1_city": null,
  "address1_postalcode": null,
  "adx_identity_username": null,
  "adx_identity_emailaddress1confirmed": false,
  "statecode": 0,
  "statuscode": 1
}
```

### Sample Account Record
```json
{
  "@odata.etag": "W/\"3734548\"",
  "accountid": "fa71345e-dc09-f111-8406-000d3a66f792",
  "name": "Fedrus International S.A.",
  "telephone1": "+32 15 550400",
  "emailaddress1": "contact@fedrus.be",
  "address1_line1": "Antwerpsesteenweg 45",
  "address1_city": "Mechelen",
  "address1_postalcode": "2800",
  "address1_country": "Belgium",
  "address1_composite": "Antwerpsesteenweg 45\r\n2800 Mechelen\r\nBelgium",
  "actum_vatregistrationnumber": "BE0123456789",
  "_actum_primarycountryid_value": "93acad58-dc09-f111-8406-000d3a66f974",
  "_actum_roleid_value": "9b264fc7-4700-f111-8407-000d3a66f792",
  "createdon": "2026-02-14T19:35:56Z",
  "modifiedon": "2026-02-15T00:47:24Z",
  "statecode": 0,
  "statuscode": 1
}
```

### Sample Language Record
```json
{
  "@odata.etag": "W/\"3714371\"",
  "actum_languageid": "0e2cd85f-f709-f111-8406-000d3a68813d",
  "actum_name": "Dutch",
  "actum_code": "nl-NL",
  "actum_iso6391": "nl",
  "actum_lcid": 1043,
  "actum_isdefault": false,
  "createdon": "2026-02-14T22:49:10Z",
  "modifiedon": "2026-02-14T22:49:10Z",
  "statecode": 0,
  "statuscode": 1
}
```

---

## Quick Reference

### Contact → Account Relationship
```typescript
// Get Account ID from Contact
const accountId = contact._parentcustomerid_value;

// Fetch full Account record
const account = await dataverseService.accounts.getById(accountId);
```

### Contact → Language Relationship
```typescript
// Get Language ID from Contact
const languageId = contact._actum_languageid_value;

// Fetch full Language record (if needed)
const language = await dataverseService.languages.getAll()
  .then(languages => languages.find(l => l.actum_languageid === languageId));
```

### Country → Languages Relationship (M2M)
```typescript
// Get all languages available for a country
const languages = await dataverseService.languages.getByCountry(countryId);
```

---

## Last Updated
2026-03-12
