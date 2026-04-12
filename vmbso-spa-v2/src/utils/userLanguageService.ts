/**
 * User Language Service
 * 
 * Handles mapping user's Dataverse language selection to frontend i18n language codes
 */

import { dataverseService } from '../services/dataverseService';
import { mapDataverseToFrontend, getDefaultLanguage } from './languageMapper';

/**
 * Cache for language ID to code mapping
 */
const languageIdToCodeCache: Map<string, string> = new Map();

/**
 * Get frontend language code from user's language lookup ID
 * @param languageId - The actum_languageid value from user's record
 * @returns Frontend language code (e.g., "be-NL", "fr-FR") or default if not found
 */
export async function getUserLanguageCode(languageId: string | null | undefined): Promise<string> {
  if (!languageId) {
    console.warn('[UserLanguage] No language ID provided, using default');
    return getDefaultLanguage();
  }

  // Check cache first
  if (languageIdToCodeCache.has(languageId)) {
    const cached = languageIdToCodeCache.get(languageId)!;
    console.log(`[UserLanguage] Using cached mapping: ${languageId} → ${cached}`);
    return cached;
  }

  try {
    // Fetch all languages (they're usually cached at the dataverse service level)
    const languages = await dataverseService.languages.getAll();
    
    // Build cache for all languages
    languages.forEach(lang => {
      const frontendCode = mapDataverseToFrontend(lang.actum_code);
      languageIdToCodeCache.set(lang.actum_languageid, frontendCode);
    });

    // Look up the specific language
    const language = languages.find(lang => lang.actum_languageid === languageId);
    
    if (language) {
      const frontendCode = mapDataverseToFrontend(language.actum_code);
      console.log(`[UserLanguage] Mapped ${languageId} (${language.actum_name}, ${language.actum_code}) → ${frontendCode}`);
      return frontendCode;
    } else {
      console.warn(`[UserLanguage] Language ID ${languageId} not found, using default`);
      return getDefaultLanguage();
    }
  } catch (error) {
    console.error('[UserLanguage] Failed to fetch language:', error);
    return getDefaultLanguage();
  }
}

/**
 * Clear the language cache (useful for testing or cache invalidation)
 */
export function clearLanguageCache(): void {
  languageIdToCodeCache.clear();
  console.log('[UserLanguage] Cache cleared');
}
