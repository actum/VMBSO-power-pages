/**
 * Translation service for loading translations from Dataverse
 */

import { apiClient } from './apiClient';
import { config } from '../config/powerPages.config';
import { mapDataverseToFrontend } from '../utils/languageMapper';

// Import local translations for dev mode and fallback
import engbTranslations from '../i18n/engb.json';
import frfrTranslations from '../i18n/frfr.json';
import benlTranslations from '../i18n/benl.json';

interface TranslationRecord {
  actum_translationid: string;
  actum_translationname: string;
  actum_content: string;
  _actum_languageid_value?: string;
  statecode: number;
  // Expanded language entity
  actum_languageid?: {
    actum_code: string;
    actum_name: string;
  };
}

interface TranslationResources {
  [languageCode: string]: any;
}

/**
 * Legacy fallback: Map Dataverse language names to i18next language codes
 * This is only used if actum_code is not available from the expanded entity
 */
const LANGUAGE_NAME_MAP: Record<string, string> = {
  'English': 'en-GB',
  'French': 'fr-FR',
  'Dutch': 'be-NL',
};

/**
 * Local fallback translations
 */
const LOCAL_TRANSLATIONS: TranslationResources = {
  'en-GB': engbTranslations,
  'fr-FR': frfrTranslations,
  'be-NL': benlTranslations,
};

/**
 * Cache for translations to avoid repeated fetches
 */
let translationCache: TranslationResources | null = null;

/**
 * Load translations from Dataverse
 */
async function loadTranslationsFromDataverse(): Promise<TranslationResources> {
  // Return cached translations if available
  if (translationCache) {
    console.log('[Translation] Using cached translations');
    return translationCache;
  }

  try {
    console.log('[Translation] Fetching from Dataverse...');
    const response = await apiClient.odata<{ value: TranslationRecord[] }>(
      '/actum_translations?$select=actum_translationid,actum_translationname,actum_content,_actum_languageid_value,statecode&$expand=actum_languageid($select=actum_code,actum_name)&$filter=statecode eq 0',
      {
        timeout: 10000, // 10 second timeout for translations
      }
    );

    const resources: TranslationResources = {};
    let successCount = 0;

    for (const record of response.value || []) {
      // Try to get language code from expanded entity first (preferred)
      let frontendLanguageCode: string | undefined;
      
      if (record.actum_languageid?.actum_code) {
        // Map Dataverse code (e.g., nl-NL) to frontend code (e.g., be-NL)
        const dataverseCode = record.actum_languageid.actum_code;
        frontendLanguageCode = mapDataverseToFrontend(dataverseCode);
        console.log(`[Translation] Mapping ${dataverseCode} → ${frontendLanguageCode}`);
      } else {
        // Fallback to name-based mapping for backwards compatibility
        frontendLanguageCode = LANGUAGE_NAME_MAP[record.actum_translationname];
        if (frontendLanguageCode) {
          console.warn(`[Translation] Using legacy name mapping for ${record.actum_translationname}`);
        }
      }
      
      if (!frontendLanguageCode) {
        console.warn(`[Translation] Unknown language: ${record.actum_translationname} (code: ${record.actum_languageid?.actum_code || 'N/A'})`);
        continue;
      }

      try {
        // Parse the escaped JSON content
        const translationData = JSON.parse(record.actum_content);
        resources[frontendLanguageCode] = translationData;
        successCount++;
        console.log(`[Translation] ✓ Loaded ${frontendLanguageCode} (${record.actum_translationname})`);
      } catch (error) {
        console.error(`[Translation] ✗ Failed to parse ${record.actum_translationname}:`, error);
        // Use local fallback for this language
        if (LOCAL_TRANSLATIONS[frontendLanguageCode]) {
          resources[frontendLanguageCode] = LOCAL_TRANSLATIONS[frontendLanguageCode];
          console.log(`[Translation] → Using local fallback for ${frontendLanguageCode}`);
        }
      }
    }

    // Ensure we have at least the fallback language
    if (!resources['en-GB']) {
      console.warn('[Translation] Missing English translations, using local fallback');
      resources['en-GB'] = LOCAL_TRANSLATIONS['en-GB'];
    }

    console.log(`[Translation] Successfully loaded ${successCount}/${response.value?.length || 0} translations from Dataverse`);
    
    // Cache the results
    translationCache = resources;
    return resources;
  } catch (error) {
    console.error('[Translation] Failed to load from Dataverse:', error);
    throw error;
  }
}

/**
 * Load translations based on environment
 */
export async function loadTranslations(): Promise<TranslationResources> {
  if (config.devMode) {
    console.log('[Translation] 🔧 DEV MODE: Using local JSON files');
    return LOCAL_TRANSLATIONS;
  }

  console.log('[Translation] 🌐 PRODUCTION MODE: Loading from Dataverse');
  try {
    return await loadTranslationsFromDataverse();
  } catch (error) {
    console.error('[Translation] ⚠️  Dataverse load failed, falling back to local files');
    // Fallback to local files if Dataverse fails
    return LOCAL_TRANSLATIONS;
  }
}

/**
 * Clear translation cache (useful for refreshing translations)
 */
export function clearTranslationCache(): void {
  translationCache = null;
  console.log('[Translation] Cache cleared');
}
