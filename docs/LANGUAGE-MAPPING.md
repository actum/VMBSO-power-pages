# Language Code Mapping Implementation

## Overview

This document explains the flexible language code mapping system that handles the discrepancy between:
- **Dataverse language codes**: `nl-NL`, `fr-FR`, `en-GB`
- **Frontend language codes**: `be-NL`, `fr-FR`, `en-GB`

The system is designed to easily adapt if the backend team changes their language codes (e.g., from `nl-NL` to `be-NL`).

---

## Current Situation

### Dataverse Setup
In the `actum_languages` table:
- **Dutch**: `actum_code = "nl-NL"` (Netherlands Dutch)
- **French**: `actum_code = "fr-FR"`
- **English**: `actum_code = "en-GB"`

### Frontend Preference  
We use Belgium market codes:
- **Dutch**: `be-NL` (Belgium Dutch - more appropriate for the target market)
- **French**: `fr-FR`
- **English**: `en-GB`

### Translation Files
Located in `src/i18n/`:
- `benl.json` → used for `be-NL`
- `frfr.json` → used for `fr-FR`
- `engb.json` → used for `en-GB`

---

## Implementation

### 1. Language Mapper (`src/utils/languageMapper.ts`)

This is the **single source of truth** for all language code mappings.

**Key Functions:**
```typescript
mapDataverseToFrontend("nl-NL") → "be-NL"
mapFrontendToDataverse("be-NL") → "nl-NL"
```

**Current Configuration:**
```typescript
const DATAVERSE_TO_FRONTEND_MAP: Record<string, string> = {
  'nl-NL': 'be-NL',  // Map Netherlands to Belgium
  'be-NL': 'be-NL',   // Also handle if backend adopts be-NL
  'fr-FR': 'fr-FR',
  'en-GB': 'en-GB',
};
```

### 2. Translation Service (`src/services/translationService.ts`)

**Updated to:**
- Use `$expand` to fetch the `actum_code` from the linked language entity
- Use `mapDataverseToFrontend()` to convert codes
- Maintain backwards compatibility with name-based mapping as fallback

**OData Query:**
```
/actum_translations?
  $select=...&
  $expand=actum_languageid($select=actum_code,actum_name)&
  $filter=statecode eq 0
```

### 3. User Language Service (`src/utils/userLanguageService.ts`)

**Purpose:** Convert user's language preference (stored as `actum_languageid`) to frontend language code.

**Flow:**
1. User has `_actum_languageid_value` = "guid-123" in their contact record
2. Fetch the language record from `actum_languages` table
3. Get `actum_code` (e.g., "nl-NL")
4. Map to frontend code using `mapDataverseToFrontend()` → "be-NL"

### 4. Language Handler (`src/components/LangHandler.tsx`)

**Refactored to:**
- Load user's language preference using `getUserLanguageCode()`
- Properly map between Dataverse and frontend codes
- Respect URL parameters for manual override
- Remove redundant dynamic translation fetching

**Priority:**
1. URL param (`?lang=be-NL`)
2. User's saved preference
3. Browser language detection
4. Default (`en-GB`)

---

## How to Adjust if Backend Changes

### Scenario: Backend team changes to `be-NL`

If the backend team updates their language codes from `nl-NL` to `be-NL`, you only need to update **ONE file**:

**File:** `src/utils/languageMapper.ts`

**Change:**
```typescript
const DATAVERSE_TO_FRONTEND_MAP: Record<string, string> = {
  // OLD: 'nl-NL': 'be-NL',
  'be-NL': 'be-NL',  // Backend now uses be-NL directly
  'fr-FR': 'fr-FR',
  'en-GB': 'en-GB',
};

const FRONTEND_TO_DATAVERSE_MAP: Record<string, string> = {
  // OLD: 'be-NL': 'nl-NL',
  'be-NL': 'be-NL',  // Backend now uses be-NL directly
  'fr-FR': 'fr-FR',
  'en-GB': 'en-GB',
};
```

**That's it!** The mapping is now 1:1 and everything continues to work.

### Scenario: Backend adds a new language

**Example:** Adding German (`de-DE`)

1. **Update `languageMapper.ts`:**
```typescript
const DATAVERSE_TO_FRONTEND_MAP: Record<string, string> = {
  'nl-NL': 'be-NL',
  'fr-FR': 'fr-FR',
  'en-GB': 'en-GB',
  'de-DE': 'de-DE',  // Add new language
};

// Update supported languages
export function getSupportedLanguages(): string[] {
  return ['be-NL', 'fr-FR', 'en-GB', 'de-DE'];
}
```

2. **Create translation file:** `src/i18n/dede.json`

3. **Update translation imports in `translationService.ts`:**
```typescript
import dedeTranslations from '../i18n/dede.json';

const LOCAL_TRANSLATIONS: TranslationResources = {
  'en-GB': engbTranslations,
  'fr-FR': frfrTranslations,
  'be-NL': benlTranslations,
  'de-DE': dedeTranslations,  // Add new import
};
```

4. **Update i18n config:** `src/i18n/index.ts`
```typescript
supportedLngs: ["en-GB", "fr-FR", "be-NL", "de-DE"],
```

---

## Testing

### Manual Testing Checklist

1. **User Language Preference**
   - [ ] Login as user with Dutch preference → should display in Dutch (be-NL)
   - [ ] Login as user with French preference → should display in French
   - [ ] Login as user with English preference → should display in English

2. **URL Override**
   - [ ] Navigate to `/?lang=fr-FR` → should display in French regardless of user preference
   - [ ] Navigate to `/?lang=be-NL` → should display in Dutch

3. **Dataverse Integration** (Production mode)
   - [ ] Verify translations load from `actum_translations` table
   - [ ] Check browser console for mapping logs: `Mapping nl-NL → be-NL`

4. **Fallbacks**
   - [ ] If Dataverse fetch fails → should fallback to local JSON files
   - [ ] If language not found → should fallback to English (en-GB)

### Console Logs to Monitor

Look for these logs in browser console:

```
[Translation] Mapping nl-NL → be-NL
[UserLanguage] Mapped {guid} (Dutch, nl-NL) → be-NL
[LangHandler] Setting user's preferred language: be-NL
```

---

## Files Modified

| File | Purpose |
|------|---------|
| `src/utils/languageMapper.ts` | **NEW** - Central mapping configuration |
| `src/utils/userLanguageService.ts` | **NEW** - User language lookup & mapping |
| `src/services/translationService.ts` | Updated to use actum_code mapping |
| `src/components/LangHandler.tsx` | Refactored to use user language service |

---

## Benefits of This Approach

✅ **Centralized Configuration** - All mapping logic in one place (`languageMapper.ts`)  
✅ **Easy to Adjust** - Single file update if backend changes  
✅ **Backwards Compatible** - Falls back to name-based mapping if needed  
✅ **Flexible** - Handles both current (nl-NL) and future (be-NL) scenarios  
✅ **Production Ready** - Works in both dev (local JSON) and prod (Dataverse) modes  
✅ **Type Safe** - Full TypeScript support  
✅ **Debuggable** - Comprehensive console logging

---

## Discussion Points for Backend Team

When raising this with the business analyst/backend team, consider these points:

1. **Semantic Correctness:**
   - `nl-NL` = Netherlands Dutch
   - `be-NL` = Belgium Dutch (Flemish)
   - For a Belgium-focused market, `be-NL` may be more semantically correct

2. **Standards:**
   - Both are valid ISO 639-1 (language) + ISO 3166-1 (region) codes
   - Examples: `en-US` vs `en-GB`, `fr-FR` vs `fr-CA`

3. **Impact:**
   - With current implementation, changing is trivial (one file update)
   - No database migration needed - just update `actum_code` values

4. **Recommendation:**
   - If serving Belgium market primarily: use `be-NL`
   - If serving broader Benelux/Dutch-speaking regions: `nl-NL` is fine
   - Current frontend handles both scenarios seamlessly

---

## Support

For questions or issues with the language mapping system, check:
1. Browser console logs (search for `[Translation]`, `[UserLanguage]`, `[LangHandler]`)
2. Verify mapping configuration in `languageMapper.ts`
3. Ensure language records in Dataverse have correct `actum_code` values
