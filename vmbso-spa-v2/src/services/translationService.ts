/**
 * Translation service for loading translations from Dataverse
 */

import { apiClient } from './apiClient';
import { config } from '../config/powerPages.config';

interface TranslationRecord {
  actum_translationid: string;
  actum_translationname: string;
  actum_content: string;
  _actum_languageid_value?: string;
  statecode: number;
}

interface TranslationResources {
  [languageCode: string]: any;
}

/**
 * Map Dataverse language names to i18next language codes.
 * Used to identify which frontend locale each translation belongs to.
 */
const LANGUAGE_NAME_MAP: Record<string, string> = {
  'English': 'en-GB',
  'French': 'fr-FR',
  'Dutch': 'be-NL',
};

/**
 * Lazy loaders for local fallback translations, keyed by frontend language code.
 * Dynamic imports keep these JSON payloads out of the main bundle — they are only
 * fetched (as a separate chunk) when Dataverse is unavailable or in dev mode.
 */
const LOCAL_TRANSLATION_LOADERS: Record<string, () => Promise<any>> = {
  'en-GB': () => import('../i18n/engb.json').then((m) => m.default),
  'fr-FR': () => import('../i18n/frfr.json').then((m) => m.default),
  'be-NL': () => import('../i18n/benl.json').then((m) => m.default),
};

let localTranslationsCache: TranslationResources | null = null;

/**
 * Load a single local fallback translation by frontend language code.
 */
async function loadLocalTranslation(languageCode: string): Promise<any | undefined> {
  const loader = LOCAL_TRANSLATION_LOADERS[languageCode];
  return loader ? loader() : undefined;
}

/**
 * Load all local fallback translations (used for dev mode / total Dataverse failure).
 */
async function loadLocalTranslations(): Promise<TranslationResources> {
  if (localTranslationsCache) {
    return localTranslationsCache;
  }

  const entries = await Promise.all(
    Object.entries(LOCAL_TRANSLATION_LOADERS).map(
      async ([code, loader]) => [code, await loader()] as const
    )
  );

  localTranslationsCache = Object.fromEntries(entries);
  return localTranslationsCache;
}

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
      '/actum_translations?$select=actum_translationid,actum_translationname,actum_content,_actum_languageid_value,statecode&$filter=statecode eq 0',
      {
        timeout: 10000, // 10 second timeout for translations
      }
    );

    const resources: TranslationResources = {};
    let successCount = 0;

    for (const record of response.value || []) {
      // Map translation name to frontend language code
      const frontendLanguageCode = LANGUAGE_NAME_MAP[record.actum_translationname];
      
      if (!frontendLanguageCode) {
        console.warn(`[Translation] Unknown language: ${record.actum_translationname}`);
        continue;
      }
      
      console.log(`[Translation] Mapping ${record.actum_translationname} → ${frontendLanguageCode}`);

      try {
        // Parse the escaped JSON content
        const translationData = JSON.parse(record.actum_content);
        resources[frontendLanguageCode] = translationData;
        successCount++;
        console.log(`[Translation] ✓ Loaded ${frontendLanguageCode} (${record.actum_translationname})`);
      } catch (error) {
        console.error(`[Translation] ✗ Failed to parse ${record.actum_translationname}:`, error);
        // Use local fallback for this language
        const fallback = await loadLocalTranslation(frontendLanguageCode);
        if (fallback) {
          resources[frontendLanguageCode] = fallback;
          console.log(`[Translation] → Using local fallback for ${frontendLanguageCode}`);
        }
      }
    }

    // Ensure we have at least the fallback language
    if (!resources['en-GB']) {
      console.warn('[Translation] Missing English translations, using local fallback');
      resources['en-GB'] = await loadLocalTranslation('en-GB');
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
    return loadLocalTranslations();
  }

  console.log('[Translation] 🌐 PRODUCTION MODE: Loading from Dataverse');
  try {
    return await loadTranslationsFromDataverse();
  } catch (error) {
    console.error('[Translation] ⚠️  Dataverse load failed, falling back to local files');
    // Fallback to local files if Dataverse fails
    return loadLocalTranslations();
  }
}

/**
 * Clear translation cache (useful for refreshing translations)
 */
export function clearTranslationCache(): void {
  translationCache = null;
  console.log('[Translation] Cache cleared');
}
