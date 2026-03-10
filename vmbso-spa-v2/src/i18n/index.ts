import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from 'i18next-browser-languagedetector';
import engbTranslations from "./locales/en-GB";
import frfrTranslations from "./locales/fr-FR";
import benlTranslations from "./locales/be-NL";

i18n
.use(initReactI18next)
.use(LanguageDetector)
.init({
  resources: {
    "en-GB": engbTranslations,
    "fr-FR": frfrTranslations,
    "be-NL": benlTranslations,
  },
  fallbackLng: "en-GB",
});

export default i18n;
