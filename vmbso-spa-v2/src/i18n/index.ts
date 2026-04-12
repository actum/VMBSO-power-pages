import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from 'i18next-browser-languagedetector';
import { loadTranslations } from '../services/translationService';

// Initialize i18n with empty resources - will be loaded dynamically
i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    resources: {}, // Start with empty resources
    fallbackLng: "en-GB",
    supportedLngs: ["en-GB", "fr-FR", "be-NL"],
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

// Load translations asynchronously
export const initializeTranslations = async () => {
  try {
    const translations = await loadTranslations();
    
    // Add translations to i18n
    Object.entries(translations).forEach(([languageCode, translation]) => {
      i18n.addResourceBundle(languageCode, 'translation', translation, true, true);
    });

    console.log('[i18n] Translations loaded successfully');
  } catch (error) {
    console.error('[i18n] Failed to load translations:', error);
  }
};

export default i18n;
