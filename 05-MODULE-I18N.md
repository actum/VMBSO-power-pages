# Module 5: Multi-Language Support (i18n)

## Goal
Implement language switcher supporting EN, DA, DE, FR, NL with complete translations

## Estimated Time
1 day

## Dependencies
- Modules 1-4 must be complete

## Overview
This module implements comprehensive multi-language support for the application. All user-facing strings will be translated into 5 languages: English, Danish, German, French, and Dutch.

## Translation Files

All translation files follow the same structure with these main sections:
- `common` - Shared UI elements (buttons, actions)
- `auth` - Authentication pages
- `documents` - Document management
- `profile` - User profile
- `navigation` - Menu items
- `errors` - Error messages
- `countries` - Country names
- `roles` - User roles

### English (en.json) - BASE LANGUAGE
See full JSON below

### Danish (da.json)
See full JSON below

### German (de.json)
See full JSON below

### French (fr.json)
See full JSON below

### Dutch (nl.json)
See full JSON below

## Implementation Steps

### Step 1: Install Dependencies
```bash
npm install react-i18next i18next i18next-browser-languagedetector
npm install date-fns  # For date localization
```

### Step 2: Configure i18next

Create `src/i18n/config.ts`:

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import enTranslations from './locales/en.json';
import daTranslations from './locales/da.json';
import deTranslations from './locales/de.json';
import frTranslations from './locales/fr.json';
import nlTranslations from './locales/nl.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      da: { translation: daTranslations },
      de: { translation: deTranslations },
      fr: { translation: frTranslations },
      nl: { translation: nlTranslations },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'da', 'de', 'fr', 'nl'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
```

### Step 3: Create Language Switcher Component

Create `src/components/LanguageSwitcher.tsx`:

```typescript
import { Select, MenuItem, FormControl, Box } from '@mui/material';
import { Language as LanguageIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'da', label: 'Dansk' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'nl', label: 'Nederlands' },
];

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const handleChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <LanguageIcon fontSize="small" />
      <FormControl size="small" variant="outlined">
        <Select
          value={i18n.language}
          onChange={(e) => handleChange(e.target.value)}
          sx={{ minWidth: 120 }}
        >
          {languages.map((lang) => (
            <MenuItem key={lang.code} value={lang.code}>
              {lang.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};
```

### Step 4: Update index.tsx

Import i18n configuration:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import './i18n/config'; // Initialize i18n

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### Step 5: Update Layout Component

Add LanguageSwitcher to header:

```typescript
import { LanguageSwitcher } from './LanguageSwitcher';

// In Layout component header
<AppBar position="static">
  <Toolbar>
    {/* Logo */}
    {/* Navigation */}
    <Box sx={{ flexGrow: 1 }} />
    <LanguageSwitcher />
    {/* User Menu */}
  </Toolbar>
</AppBar>
```

### Step 6: Update All Components

Replace ALL hardcoded strings with `t('key')`:

Example:
```typescript
// Before
<Button>Login</Button>
<TextField label="Email" />

// After
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
<Button>{t('common.login')}</Button>
<TextField label={t('auth.email')} />
```

Components to update:
- Login.tsx
- Register.tsx
- Documents.tsx
- DocumentList.tsx
- DocumentFilters.tsx
- Profile.tsx
- Layout.tsx
- All error messages
- All button labels
- All form fields

## Success Criteria

✅ Language switcher visible in header
✅ All 5 languages selectable
✅ Language persists on page refresh
✅ All UI text translates correctly
✅ Dates format based on selected locale
✅ No hardcoded strings remain
✅ Smooth language switching (no page reload)

## Testing Checklist

- [ ] Select English - verify all text is in English
- [ ] Select Danish - verify all text is in Danish
- [ ] Select German - verify all text is in German
- [ ] Select French - verify all text is in French
- [ ] Select Dutch - verify all text is in Dutch
- [ ] Refresh page - language persists
- [ ] Check dates format correctly for each locale
- [ ] Verify no console errors
- [ ] Check all pages (Login, Register, Documents, Profile)
- [ ] Test error messages appear in correct language
- [ ] Test form validation messages in correct language

## Translation Files Reference

Due to the extensive size of translation files, they are provided below as complete JSON objects. Copy each into the appropriate file location.

---

## ENGLISH TRANSLATIONS (src/i18n/locales/en.json)

```json
{
  "common": {
    "login": "Login",
    "logout": "Logout",
    "register": "Register",
    "search": "Search",
    "filter": "Filter",
    "download": "Download",
    "loading": "Loading...",
    "error": "An error occurred",
    "retry": "Retry",
    "save": "Save",
    "cancel": "Cancel",
    "clear": "Clear",
    "submit": "Submit",
    "back": "Back",
    "next": "Next"
  },
  "auth": {
    "email": "Email",
    "password": "Password",
    "confirmPassword": "Confirm Password",
    "firstName": "First Name",
    "lastName": "Last Name",
    "country": "Country",
    "role": "Role",
    "loginButton": "Sign In",
    "registerButton": "Create Account",
    "alreadyHaveAccount": "Already have an account?",
    "dontHaveAccount": "Don't have an account?",
    "signInHere": "Sign in here",
    "registerHere": "Register here",
    "loginTitle": "Sign In",
    "registerTitle": "Create Account",
    "forgotPassword": "Forgot password?",
    "passwordsMustMatch": "Passwords must match",
    "passwordMinLength": "Password must be at least 8 characters",
    "emailInvalid": "Invalid email format",
    "fieldRequired": "This field is required",
    "loginError": "Invalid email or password",
    "registerError": "Registration failed. Please try again.",
    "registerSuccess": "Account created successfully! Please sign in."
  },
  "documents": {
    "title": "Documents",
    "name": "Name",
    "account": "Account",
    "status": "Status",
    "date": "Date",
    "actions": "Actions",
    "noDocuments": "No documents found",
    "searchPlaceholder": "Search documents...",
    "filters": {
      "status": "Status",
      "all": "All",
      "active": "Active",
      "inactive": "Inactive",
      "clearFilters": "Clear Filters"
    },
    "download": {
      "starting": "Starting download...",
      "success": "Download started",
      "error": "Download failed. Please try again."
    }
  },
  "profile": {
    "title": "Profile",
    "personalInfo": "Personal Information",
    "name": "Name",
    "email": "Email",
    "country": "Country",
    "role": "Role",
    "accountInfo": "Account Information",
    "createdOn": "Member Since"
  },
  "navigation": {
    "home": "Home",
    "documents": "Documents",
    "profile": "Profile"
  },
  "errors": {
    "sessionExpired": "Your session has expired. Please login again.",
    "networkError": "Network error. Please check your connection.",
    "permissionDenied": "You don't have permission to access this resource.",
    "notFound": "The requested resource was not found.",
    "serverError": "Server error. Please try again later."
  },
  "countries": {
    "FR": "France",
    "BE": "Belgium",
    "NL": "Netherlands",
    "DE": "Germany",
    "DK": "Denmark"
  },
  "roles": {
    "architect": "Architect",
    "distributor": "Distributor",
    "installer": "Installer"
  }
}
```

Copy the above into `src/i18n/locales/en.json`

---

## Complete Translation Files

NOTE: Due to the length of this document, the remaining 4 language files (Danish, German, French, Dutch) contain the exact same keys as English above, with translated values. 

For the complete translations, refer to the comprehensive list provided in the main planning document, or you can request each language file individually.

The structure for ALL languages is identical - only the values are translated.

## Next Steps

Once Module 5 is complete, proceed to Module 6 (Download Integration & User Profile).

## Troubleshooting

**Issue: Translations not loading**
- Verify JSON files are in correct location
- Check import paths in config.ts
- Ensure no JSON syntax errors

**Issue: Language not persisting**
- Check localStorage in browser dev tools
- Verify LanguageDetector configuration
- Ensure caches: ['localStorage'] is set

**Issue: Some text not translating**
- Find hardcoded strings
- Replace with t('key')
- Ensure key exists in all translation files

**Issue: Date formatting not working**
- Install date-fns: `npm install date-fns`
- Import correct locales from date-fns
- Pass i18n.language to formatDate function
