/**
 * Language Code Mapper
 * 
 * Maps between Dataverse language codes and frontend i18n codes.
 * This provides flexibility to handle different backend configurations.
 * 
 * Current Dataverse setup:
 * - Dutch: nl-NL (Netherlands Dutch) 
 * - French: fr-FR
 * - English: en-GB
 * 
 * Frontend uses:
 * - Dutch: be-NL (Belgium Dutch - more appropriate for the market)
 * - French: fr-FR
 * - English: en-GB
 * 
 * Note: If backend changes to use be-NL, just update the mapping below.
 */

/**
 * Maps Dataverse language codes to frontend i18n language codes
 */
const DATAVERSE_TO_FRONTEND_MAP: Record<string, string> = {
  // Dutch - map Netherlands code to Belgium code (our market)
  'nl-NL': 'be-NL',
  // Also handle if backend adopts be-NL in the future
  'be-NL': 'be-NL',
  
  // French - direct mapping
  'fr-FR': 'fr-FR',
  
  // English - direct mapping  
  'en-GB': 'en-GB',
};

/**
 * Maps frontend i18n language codes back to Dataverse codes
 * Used when saving user preferences
 */
const FRONTEND_TO_DATAVERSE_MAP: Record<string, string> = {
  'be-NL': 'nl-NL',  // Save as nl-NL in Dataverse (current backend setup)
  'fr-FR': 'fr-FR',
  'en-GB': 'en-GB',
};

/**
 * Convert a Dataverse language code to frontend i18n code
 * @param dataverseCode - Language code from Dataverse (e.g., "nl-NL", "fr-FR")
 * @returns Frontend i18n code (e.g., "be-NL", "fr-FR") or original if no mapping
 */
export function mapDataverseToFrontend(dataverseCode: string): string {
  return DATAVERSE_TO_FRONTEND_MAP[dataverseCode] || dataverseCode;
}

/**
 * Convert a frontend i18n code to Dataverse language code
 * @param frontendCode - Frontend i18n code (e.g., "be-NL", "fr-FR")
 * @returns Dataverse language code (e.g., "nl-NL", "fr-FR") or original if no mapping
 */
export function mapFrontendToDataverse(frontendCode: string): string {
  return FRONTEND_TO_DATAVERSE_MAP[frontendCode] || frontendCode;
}

/**
 * Get all supported frontend language codes
 */
export function getSupportedLanguages(): string[] {
  return ['be-NL', 'fr-FR', 'en-GB'];
}

/**
 * Get default language code
 */
export function getDefaultLanguage(): string {
  return 'en-GB';
}

/**
 * Check if a language code is supported
 */
export function isSupportedLanguage(code: string): boolean {
  return getSupportedLanguages().includes(code);
}
