import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from 'i18next-browser-languagedetector';
import enTranslations from "./locales/en";
import frTranslations from "./locales/fr";
import benlTranslations from "./locales/be-NL";

i18n
.use(initReactI18next)
.use(LanguageDetector)
.init({
  resources: {
    "en-US": enTranslations,
    "fr-FR": frTranslations,
    "be-NL": benlTranslations,
  },
  fallbackLng: "en-US",
});

export default i18n;
